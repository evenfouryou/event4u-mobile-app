// Script per inviare report RPM firmato S/MIME
import { db } from '../server/db';
import { siaeTicketedEvents, siaeTickets, events, companies, siaeTransmissions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { generateSiaeFileName, escapeXml } from '../server/siae-utils';
import { sendSiaeTransmissionEmail } from '../server/email-service';
import { requestSmimeSignature, isBridgeConnected, isCardReadyForSeals } from '../server/bridge-relay';
import { createHash, randomUUID } from 'crypto';

async function sendRpmSigned() {
  const eventId = 'b6cfac14-8b2f-47fe-9aee-7a4aef275d4f';
  const companyId = '6946a466-733a-47bd-bbb8-31f4fbe11fc2';
  
  // Check bridge connection
  if (!isBridgeConnected()) {
    console.error('❌ Bridge non connesso! Avvia l\'app desktop e connetti la smart card.');
    process.exit(1);
  }
  
  const cardStatus = isCardReadyForSeals();
  console.log('Card status:', cardStatus);
  
  if (!cardStatus.ready) {
    console.error('❌ Smart card non pronta:', cardStatus.reason);
    process.exit(1);
  }
  
  // Get event data
  const [ticketedEvent] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, eventId));
  const [baseEvent] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  const tickets = await db.select().from(siaeTickets).where(eq(siaeTickets.ticketedEventId, eventId));
  
  console.log('Event:', ticketedEvent.siaeEventCode);
  console.log('Tickets:', tickets.length);
  
  const reportDate = new Date();
  const systemCode = 'EVENT4U1';
  const cfEmittente = company?.fiscalCode || company?.taxId || 'PTRJTH93M11I156B';
  
  // Format dates
  const dateStr = reportDate.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = reportDate.toTimeString().slice(0, 5).replace(':', '');
  const eventDateStr = baseEvent?.startDatetime 
    ? new Date(baseEvent.startDatetime).toISOString().split('T')[0].replace(/-/g, '')
    : dateStr;
  
  // Calculate totals
  const totalRevenue = tickets.reduce((sum, t) => sum + Number(t.grossAmount || 0), 0);
  const totalVat = totalRevenue * 0.22;
  const totalNet = totalRevenue - totalVat;
  
  // Build XML for RPM
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RiepilogoMensile versione="V.01.00">
  <Intestazione>
    <CodiceIntervento>${escapeXml(systemCode)}</CodiceIntervento>
    <CodiceFiscaleEmittente>${escapeXml(cfEmittente)}</CodiceFiscaleEmittente>
    <DataCreazione>${dateStr}</DataCreazione>
    <OraCreazione>${timeStr}</OraCreazione>
    <ProgressivoInvio>002</ProgressivoInvio>
    <TipoTrasmissione>O</TipoTrasmissione>
  </Intestazione>
  <Dati>
    <Periodo>
      <Anno>${reportDate.getFullYear()}</Anno>
      <Mese>${String(reportDate.getMonth() + 1).padStart(2, '0')}</Mese>
    </Periodo>
    <RiepilogoEvento>
      <CodiceEvento>${escapeXml(ticketedEvent.siaeEventCode || 'TEST')}</CodiceEvento>
      <CodiceLocalita>${escapeXml(ticketedEvent.siaeLocationCode || 'MI001')}</CodiceLocalita>
      <DataEvento>${eventDateStr}</DataEvento>
      <TipoGenere>${ticketedEvent.genreCode || '60'}</TipoGenere>
      <SpettacoloIntrattenimento>I</SpettacoloIntrattenimento>
      <IncidenzaIntrattenimento>100</IncidenzaIntrattenimento>
      <BigliettiEmessi>
        <TotaleQuantita>${tickets.length}</TotaleQuantita>
        <TotaleImporto>${totalRevenue.toFixed(2)}</TotaleImporto>
      </BigliettiEmessi>
      <BigliettiAnnullati>
        <TotaleQuantita>0</TotaleQuantita>
        <TotaleImporto>0.00</TotaleImporto>
      </BigliettiAnnullati>
      <RiepilogoImposte>
        <ImponibileIVA>${totalNet.toFixed(2)}</ImponibileIVA>
        <IVA>${totalVat.toFixed(2)}</IVA>
        <ImpostaIntrattenimento>0.00</ImpostaIntrattenimento>
      </RiepilogoImposte>
    </RiepilogoEvento>
  </Dati>
</RiepilogoMensile>`;
  
  console.log('XML generated');
  
  // Generate filename
  const fileName = generateSiaeFileName('mensile', reportDate, 2, systemCode);
  console.log('Filename:', fileName);
  
  // Sign with S/MIME
  console.log('Richiesta firma S/MIME alla smart card...');
  const signatureResult = await requestSmimeSignature(xml);
  
  if (!signatureResult.success || !signatureResult.p7mBase64) {
    console.error('❌ Firma S/MIME fallita:', signatureResult.error);
    process.exit(1);
  }
  
  console.log('✅ Firma S/MIME completata');
  
  // Save transmission
  const transmissionId = randomUUID();
  const fileHash = createHash('sha256').update(xml).digest('hex');
  const signedFileName = fileName.replace('.xsi', '.xsi.p7m');
  
  await db.insert(siaeTransmissions).values({
    id: transmissionId,
    companyId,
    ticketedEventId: eventId,
    transmissionType: 'monthly',
    periodDate: reportDate,
    fileName: signedFileName,
    fileExtension: 'p7m',
    fileContent: xml,
    fileHash,
    status: 'pending',
    ticketsCount: tickets.length,
    totalAmount: String(totalRevenue),
    versioneTracciato: 'V.01.00',
    systemCode: systemCode,
    progressivoInvio: 2,
    scheduleType: 'manual',
    smimeSigned: true,
    p7mContent: signatureResult.p7mBase64,
    signatureFormat: 'cades',
    signedAt: new Date()
  });
  
  console.log('Transmission saved:', transmissionId);
  
  // Send email with signature
  const testEmail = 'servertest2@batest.siae.it';
  console.log('Sending signed report to:', testEmail);
  
  const emailResult = await sendSiaeTransmissionEmail({
    to: testEmail,
    companyName: company?.name || 'Test Company',
    transmissionType: 'mensile',
    periodDate: reportDate,
    ticketsCount: tickets.length,
    totalAmount: String(totalRevenue),
    xmlContent: xml,
    transmissionId: transmissionId,
    systemCode: systemCode,
    sequenceNumber: 2,
    signWithSmime: true,
    p7mBase64: signatureResult.p7mBase64,
    signatureFormat: 'cades',
    explicitFileName: signedFileName
  });
  
  if (emailResult.success) {
    await db.update(siaeTransmissions)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(siaeTransmissions.id, transmissionId));
    console.log('✅ Report RPM FIRMATO inviato con successo a', testEmail);
    console.log('ID Trasmissione:', transmissionId);
  } else {
    console.error('❌ Invio fallito:', emailResult.error);
  }
}

sendRpmSigned().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
