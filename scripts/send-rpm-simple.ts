// Script semplificato per inviare report RPM
import { db } from '../server/db';
import { siaeTicketedEvents, siaeTickets, events, companies, siaeTransmissions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { generateSiaeFileName, escapeXml } from '../server/siae-utils';
import { sendSiaeTransmissionEmail } from '../server/email-service';
import { createHash, randomUUID } from 'crypto';

async function sendRpmTest() {
  const eventId = 'b6cfac14-8b2f-47fe-9aee-7a4aef275d4f';
  const companyId = '6946a466-733a-47bd-bbb8-31f4fbe11fc2';
  
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
    <ProgressivoInvio>001</ProgressivoInvio>
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
  const fileName = generateSiaeFileName('mensile', reportDate, 1, systemCode);
  console.log('Filename:', fileName);
  
  // Save transmission
  const transmissionId = randomUUID();
  const fileHash = createHash('sha256').update(xml).digest('hex');
  
  await db.insert(siaeTransmissions).values({
    id: transmissionId,
    companyId,
    ticketedEventId: eventId,
    transmissionType: 'monthly',
    periodDate: reportDate,
    fileName,
    fileExtension: 'xml',
    fileContent: xml,
    fileHash,
    status: 'pending',
    ticketsCount: tickets.length,
    totalAmount: String(totalRevenue),
    versioneTracciato: 'V.01.00',
    systemCode: systemCode,
    progressivoInvio: 1,
    scheduleType: 'manual'
  });
  
  console.log('Transmission saved:', transmissionId);
  
  // Send email
  const testEmail = 'servertest2@batest.siae.it';
  console.log('Sending to:', testEmail);
  
  const emailResult = await sendSiaeTransmissionEmail({
    to: testEmail,
    companyName: company?.name || 'Test Company',
    transmissionType: 'mensile',  // Fixed parameter name
    periodDate: reportDate,       // Fixed parameter name
    ticketsCount: tickets.length,
    totalAmount: String(totalRevenue),
    xmlContent: xml,
    transmissionId: transmissionId,
    systemCode: systemCode,
    sequenceNumber: 1,
    explicitFileName: fileName
  });
  
  if (emailResult.success) {
    await db.update(siaeTransmissions)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(siaeTransmissions.id, transmissionId));
    console.log('✅ Report RPM inviato con successo a', testEmail);
    console.log('ID Trasmissione:', transmissionId);
  } else {
    console.error('❌ Invio fallito:', emailResult.error);
  }
}

sendRpmTest().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
