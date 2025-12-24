import { db } from "./db";
import { siaeTicketedEvents, siaeTransmissions, events, companies, siaeEventSectors, siaeTickets } from "@shared/schema";
import { eq, and, sql, gte, lt, desc } from "drizzle-orm";
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  console.log(`${formattedTime} [SIAE-Scheduler] ${message}`);
}

async function generateC1ReportData(ticketedEvent: any, reportType: 'giornaliero' | 'mensile', reportDate: Date) {
  const company = await storage.getCompany(ticketedEvent.companyId);
  const sectors = await siaeStorage.getSiaeEventSectors(ticketedEvent.id);
  const allTickets = await siaeStorage.getSiaeTicketsByEvent(ticketedEvent.id);
  const eventRecord = await storage.getEvent(ticketedEvent.eventId);

  const isMonthly = reportType === 'mensile';
  const refDate = reportDate;
  const today = refDate.toISOString().split('T')[0];

  const getTicketPrice = (t: any) => Number(t.ticketPrice) || Number(t.grossAmount) || Number(t.priceAtPurchase) || 0;
  const getTicketType = (t: any): 'intero' | 'ridotto' | 'omaggio' => {
    if (t.ticketType === 'intero' || t.ticketType === 'ridotto' || t.ticketType === 'omaggio') {
      return t.ticketType;
    }
    if (t.ticketTypeCode === 'INT') return 'intero';
    if (t.ticketTypeCode === 'RID') return 'ridotto';
    if (t.ticketTypeCode === 'OMG' || t.ticketTypeCode === 'OMA') return 'omaggio';
    return 'intero';
  };

  let filteredTickets: any[];
  if (isMonthly) {
    const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59);
    filteredTickets = allTickets.filter(t => {
      const ticketDate = new Date(t.createdAt!);
      return ticketDate >= startOfMonth && ticketDate <= endOfMonth;
    });
  } else {
    filteredTickets = allTickets.filter(t => {
      const ticketDate = t.createdAt?.toISOString().split('T')[0];
      return ticketDate === today;
    });
  }

  const activeTickets = filteredTickets.filter(t => t.status === 'emesso' || t.status === 'used');
  const cancelledTickets = filteredTickets.filter(t => t.status === 'annullato');

  const totalRevenue = activeTickets.reduce((sum, t) => sum + getTicketPrice(t), 0);

  return {
    ticketedEvent,
    company,
    eventRecord,
    sectors,
    reportType,
    reportDate,
    activeTicketsCount: activeTickets.length,
    cancelledTicketsCount: cancelledTickets.length,
    totalRevenue,
    filteredTickets: activeTickets,
  };
}

function generateXMLContent(reportData: any): string {
  const { ticketedEvent, company, reportType, reportDate, activeTicketsCount, cancelledTicketsCount, totalRevenue } = reportData;
  const isMonthly = reportType === 'mensile';
  const dateStr = reportDate.toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<SIAEReport xmlns="http://www.siae.it/report/c1">
  <Header>
    <ReportType>${isMonthly ? 'MENSILE' : 'GIORNALIERO'}</ReportType>
    <ReportDate>${dateStr}</ReportDate>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
    <Version>2025.1</Version>
  </Header>
  <Organizer>
    <CompanyName>${company?.name || 'N/A'}</CompanyName>
    <TaxId>${company?.taxId || 'N/A'}</TaxId>
  </Organizer>
  <Event>
    <EventCode>${ticketedEvent.siaeEventCode || 'N/A'}</EventCode>
    <LocationCode>${ticketedEvent.siaeLocationCode || 'N/A'}</LocationCode>
    <GenreCode>${ticketedEvent.genreCode}</GenreCode>
    <TaxType>${ticketedEvent.taxType}</TaxType>
  </Event>
  <Summary>
    <TicketsIssued>${activeTicketsCount}</TicketsIssued>
    <TicketsCancelled>${cancelledTicketsCount}</TicketsCancelled>
    <TotalRevenue>${totalRevenue.toFixed(2)}</TotalRevenue>
  </Summary>
</SIAEReport>`;
  
  return xml;
}

async function checkExistingTransmission(ticketedEventId: string, transmissionType: string, periodDate: Date): Promise<boolean> {
  const dateStr = periodDate.toISOString().split('T')[0];
  const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
  const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

  const existing = await db.select()
    .from(siaeTransmissions)
    .where(and(
      eq(siaeTransmissions.ticketedEventId, ticketedEventId),
      eq(siaeTransmissions.transmissionType, transmissionType),
      gte(siaeTransmissions.periodDate, startOfDay),
      lt(siaeTransmissions.periodDate, endOfDay)
    ))
    .limit(1);

  return existing.length > 0;
}

async function sendDailyReports() {
  log('Avvio job invio report giornalieri C1...');
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const ticketedEventsWithEvents = await db.select({
      ticketedEvent: siaeTicketedEvents,
      event: events,
    })
    .from(siaeTicketedEvents)
    .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .where(and(
      eq(siaeTicketedEvents.autoSendReports, true),
      gte(events.endDatetime, yesterday),
      lt(events.endDatetime, endOfYesterday)
    ));

    log(`Trovati ${ticketedEventsWithEvents.length} eventi conclusi ieri con auto-invio abilitato`);

    for (const { ticketedEvent, event } of ticketedEventsWithEvents) {
      try {
        const alreadySent = await checkExistingTransmission(ticketedEvent.id, 'daily', yesterday);
        if (alreadySent) {
          log(`Evento ${ticketedEvent.id} - Report giornaliero già inviato, skip`);
          continue;
        }

        const reportData = await generateC1ReportData(ticketedEvent, 'giornaliero', yesterday);
        const xmlContent = generateXMLContent(reportData);

        const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
        const fileName = `C1_DAILY_${ticketedEvent.siaeEventCode || ticketedEvent.id}_${dateStr}.xml`;

        await siaeStorage.createSiaeTransmission({
          companyId: ticketedEvent.companyId,
          ticketedEventId: ticketedEvent.id,
          transmissionType: 'daily',
          periodDate: yesterday,
          fileName,
          fileContent: xmlContent,
          status: 'pending',
          ticketsCount: reportData.activeTicketsCount,
          ticketsCancelled: reportData.cancelledTicketsCount,
          totalAmount: reportData.totalRevenue.toFixed(2),
        });

        log(`Evento ${ticketedEvent.id} (${event.name}) - Report giornaliero creato: ${fileName}`);
      } catch (eventError: any) {
        log(`ERRORE per evento ${ticketedEvent.id}: ${eventError.message}`);
      }
    }

    log('Job invio report giornalieri completato');
  } catch (error: any) {
    log(`ERRORE job giornaliero: ${error.message}`);
  }
}

async function sendMonthlyReports() {
  log('Avvio job invio report mensili C1...');
  
  try {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const ticketedEventsWithTickets = await db.select({
      ticketedEvent: siaeTicketedEvents,
    })
    .from(siaeTicketedEvents)
    .innerJoin(siaeTickets, eq(siaeTicketedEvents.id, siaeTickets.ticketedEventId))
    .where(and(
      eq(siaeTicketedEvents.autoSendReports, true),
      gte(siaeTickets.createdAt, previousMonth),
      lt(siaeTickets.createdAt, endOfPreviousMonth)
    ))
    .groupBy(siaeTicketedEvents.id);

    log(`Trovati ${ticketedEventsWithTickets.length} eventi con attività nel mese precedente`);

    for (const { ticketedEvent } of ticketedEventsWithTickets) {
      try {
        const alreadySent = await checkExistingTransmission(ticketedEvent.id, 'monthly', previousMonth);
        if (alreadySent) {
          log(`Evento ${ticketedEvent.id} - Report mensile già inviato, skip`);
          continue;
        }

        const reportData = await generateC1ReportData(ticketedEvent, 'mensile', previousMonth);
        const xmlContent = generateXMLContent(reportData);

        const monthStr = `${previousMonth.getFullYear()}${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
        const fileName = `C1_MONTHLY_${ticketedEvent.siaeEventCode || ticketedEvent.id}_${monthStr}.xml`;

        await siaeStorage.createSiaeTransmission({
          companyId: ticketedEvent.companyId,
          ticketedEventId: ticketedEvent.id,
          transmissionType: 'monthly',
          periodDate: previousMonth,
          fileName,
          fileContent: xmlContent,
          status: 'pending',
          ticketsCount: reportData.activeTicketsCount,
          ticketsCancelled: reportData.cancelledTicketsCount,
          totalAmount: reportData.totalRevenue.toFixed(2),
        });

        log(`Evento ${ticketedEvent.id} - Report mensile creato: ${fileName}`);
      } catch (eventError: any) {
        log(`ERRORE per evento ${ticketedEvent.id}: ${eventError.message}`);
      }
    }

    log('Job invio report mensili completato');
  } catch (error: any) {
    log(`ERRORE job mensile: ${error.message}`);
  }
}

let dailyIntervalId: NodeJS.Timeout | null = null;
let monthlyIntervalId: NodeJS.Timeout | null = null;

function checkAndRunDailyJob() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour === 2 && minute === 0) {
    sendDailyReports();
  }
}

function checkAndRunMonthlyJob() {
  const now = new Date();
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (day === 1 && hour === 3 && minute === 0) {
    sendMonthlyReports();
  }
}

export function initSiaeScheduler() {
  log('Inizializzazione scheduler SIAE...');

  if (dailyIntervalId) clearInterval(dailyIntervalId);
  if (monthlyIntervalId) clearInterval(monthlyIntervalId);

  dailyIntervalId = setInterval(checkAndRunDailyJob, 60 * 1000);
  monthlyIntervalId = setInterval(checkAndRunMonthlyJob, 60 * 1000);

  log('Scheduler SIAE inizializzato:');
  log('  - Job giornaliero: ogni notte alle 02:00');
  log('  - Job mensile: primo giorno del mese alle 03:00');
}

export function stopSiaeScheduler() {
  if (dailyIntervalId) {
    clearInterval(dailyIntervalId);
    dailyIntervalId = null;
  }
  if (monthlyIntervalId) {
    clearInterval(monthlyIntervalId);
    monthlyIntervalId = null;
  }
  log('Scheduler SIAE fermato');
}

export { sendDailyReports, sendMonthlyReports };
