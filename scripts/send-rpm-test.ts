// Script per inviare report RPM di test
import { db } from '../server/db';
import { siaeTicketedEvents, siaeEventSectors, siaeTickets, events, companies, siaeTransmissions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { generateC1Xml, generateSiaeFileName, resolveSystemCode, type C1XmlParams, type C1EventContext, type C1SectorData, type C1TicketData } from '../server/siae-utils';
import { sendSiaeTransmissionEmail } from '../server/email-service';
import { createHash, randomUUID } from 'crypto';

async function sendRpmTest() {
  const eventId = 'b6cfac14-8b2f-47fe-9aee-7a4aef275d4f';
  const companyId = '6946a466-733a-47bd-bbb8-31f4fbe11fc2';
  
  // Get event data
  const [ticketedEvent] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, eventId));
  const [baseEvent] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  const sectors = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.ticketedEventId, eventId));
  const tickets = await db.select().from(siaeTickets).where(eq(siaeTickets.ticketedEventId, eventId));
  
  console.log('Event:', ticketedEvent.siaeEventCode);
  console.log('Tickets:', tickets.length);
  console.log('Sectors:', sectors.length);
  
  // Build C1 context
  const systemCode = await resolveSystemCode(companyId, true);
  const reportDate = new Date();
  
  const sectorData: C1SectorData[] = sectors.map(s => ({
    code: s.sectorCode || 'XX',
    name: s.name || 'Settore',
    capacity: s.capacity || 100,
    ticketsSold: s.ticketsSold || 0
  }));
  
  const ticketData: C1TicketData[] = tickets.map(t => ({
    id: t.id,
    ticketCode: t.id.slice(0, 8),
    sectorCode: t.sectorCode || 'XX',
    ticketType: 'intero',
    ticketTypeCode: t.ticketTypeCode || 'IN',
    emissionDate: t.emissionDate || new Date(),
    ticketPrice: Number(t.grossAmount) || 15,
    status: t.status || 'active',
    isComplimentary: false,
    participantFirstName: t.participantFirstName || '',
    participantLastName: t.participantLastName || ''
  }));
  
  const eventContext: C1EventContext = {
    siaeEventCode: ticketedEvent.siaeEventCode || 'TEST001',
    siaeLocationCode: ticketedEvent.siaeLocationCode || 'MI001',
    eventName: baseEvent?.name || 'Test Event',
    eventDate: baseEvent?.startDatetime || new Date(),
    startTime: baseEvent?.startDatetime || new Date(),
    endTime: baseEvent?.endDatetime || new Date(),
    genreCode: ticketedEvent.genreCode || '60',
    taxType: (ticketedEvent.taxType as 'I' | 'S') || 'I',
    entertainmentIncidence: Number(ticketedEvent.entertainmentIncidence) || 100,
    venueName: 'NOTTI INDIE',
    venueCity: 'Milano',
    venueProvince: 'MI',
    maxCapacity: ticketedEvent.totalCapacity || 500,
    sectors: sectorData,
    tickets: ticketData,
    subscriptions: [],
    ticketsSold: tickets.length,
    totalRevenue: tickets.reduce((sum, t) => sum + Number(t.grossAmount || 0), 0)
  };
  
  const c1Params: C1XmlParams = {
    systemCode,
    codiceFiscaleEmittente: company?.fiscalCode || company?.taxId || 'TSTCMP00A01H501X',
    reportDate,
    events: [eventContext],
    subscriptions: [],
    reportKind: 'mensile',
    progressivo: 1
  };
  
  console.log('Generating C1 XML...');
  const xmlResult = generateC1Xml(c1Params);
  
  if (!xmlResult.success) {
    console.error('XML generation failed:', xmlResult.errors);
    return;
  }
  
  console.log('XML generated successfully');
  console.log('Stats:', xmlResult.stats);
  
  // Generate filename
  const fileName = generateSiaeFileName('mensile', reportDate, 1, systemCode);
  console.log('Filename:', fileName);
  
  // Save transmission
  const transmissionId = randomUUID();
  const fileHash = createHash('sha256').update(xmlResult.xml).digest('hex');
  
  await db.insert(siaeTransmissions).values({
    id: transmissionId,
    companyId,
    ticketedEventId: eventId,
    transmissionType: 'monthly',
    periodDate: reportDate,
    fileName,
    fileExtension: 'xml',
    fileContent: xmlResult.xml,
    fileHash,
    status: 'pending',
    ticketsCount: tickets.length,
    totalAmount: String(eventContext.totalRevenue),
    versioneTracciato: 'V.01.00',
    codiceIntervento: systemCode,
    progressivoInvio: 1,
    scheduleType: 'manual'
  });
  
  console.log('Transmission saved:', transmissionId);
  
  // Send email
  const testEmail = 'servertest2@batest.siae.it';
  console.log('Sending to:', testEmail);
  
  const emailResult = await sendSiaeTransmissionEmail({
    to: testEmail,
    subject: `RPM_${reportDate.getFullYear()}_${String(reportDate.getMonth() + 1).padStart(2, '0')}_001`,
    xmlContent: xmlResult.xml,
    fileName,
    companyName: company?.name || 'Test Company',
    reportType: 'mensile',
    reportDate
  });
  
  if (emailResult.success) {
    await db.update(siaeTransmissions)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(siaeTransmissions.id, transmissionId));
    console.log('Email sent successfully!');
  } else {
    console.error('Email failed:', emailResult.error);
  }
}

sendRpmTest().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
