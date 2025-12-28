import { db } from "./db";
import { siaeTicketedEvents, siaeTransmissions, events, companies, siaeEventSectors, siaeTickets } from "@shared/schema";
import { eq, and, sql, gte, lt, desc } from "drizzle-orm";
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";
import { sendSiaeTransmissionEmail } from "./email-service";
import { isBridgeConnected, requestXmlSignature } from "./bridge-relay";

// Configurazione SIAE
const SIAE_TEST_MODE = process.env.SIAE_TEST_MODE === 'true';
const SIAE_TEST_EMAIL = process.env.SIAE_TEST_EMAIL || 'servertest2@batest.siae.it';

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  console.log(`${formattedTime} [SIAE-Scheduler] ${message}`);
}

// Funzione per ottenere il progressivo giornaliero per evitare collisioni
async function getNextProgressivo(ticketedEventId: string, transmissionType: string, periodDate: Date): Promise<number> {
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
    ));

  return existing.length + 1;
}

async function generateC1ReportData(ticketedEvent: any, reportType: 'giornaliero' | 'mensile', reportDate: Date, progressivo: number = 1) {
  const company = await storage.getCompany(ticketedEvent.companyId);
  const sectors = await siaeStorage.getSiaeEventSectors(ticketedEvent.id);
  const allTickets = await siaeStorage.getSiaeTicketsByEvent(ticketedEvent.id);
  const eventRecord = await storage.getEvent(ticketedEvent.eventId);

  const isMonthly = reportType === 'mensile';
  const refDate = reportDate;
  const today = refDate.toISOString().split('T')[0];

  const getTicketPrice = (t: any) => Number(t.ticketPrice) || Number(t.grossAmount) || Number(t.priceAtPurchase) || 0;
  
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

  // Recupera abbonamenti per il periodo
  let subscriptions: any[] = [];
  try {
    const allSubscriptions = await siaeStorage.getSiaeSubscriptionsByCompany(ticketedEvent.companyId);
    if (isMonthly) {
      const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59);
      subscriptions = allSubscriptions.filter(s => {
        const subDate = new Date(s.createdAt!);
        return subDate >= startOfMonth && subDate <= endOfMonth;
      });
    } else {
      subscriptions = allSubscriptions.filter(s => {
        const subDate = s.createdAt?.toISOString().split('T')[0];
        return subDate === today;
      });
    }
  } catch (e) {
    log(`Errore recupero abbonamenti: ${e.message}`);
  }

  const totalTicketRevenue = activeTickets.reduce((sum, t) => sum + getTicketPrice(t), 0);
  const totalSubRevenue = subscriptions.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  return {
    ticketedEvent,
    company,
    eventRecord,
    sectors,
    reportType,
    reportDate,
    progressivo,
    activeTicketsCount: activeTickets.length,
    cancelledTicketsCount: cancelledTickets.length,
    totalRevenue: totalTicketRevenue,
    subscriptions,
    filteredTickets: activeTickets,
  };
}

function generateXMLContent(reportData: any): string {
  const { ticketedEvent, company, eventRecord, sectors, reportType, reportDate, activeTicketsCount, cancelledTicketsCount, totalRevenue, filteredTickets, progressivo = 1 } = reportData;
  const isMonthly = reportType === 'mensile';
  
  const now = new Date();
  const meseAttr = isMonthly 
    ? `${reportDate.getFullYear()}${String(reportDate.getMonth() + 1).padStart(2, '0')}`
    : reportDate.toISOString().split('T')[0].replace(/-/g, '');
  const dataGen = now.toISOString().split('T')[0].replace(/-/g, '');
  const oraGen = now.toTimeString().split(' ')[0].replace(/:/g, '');
  
  // Converti importo in centesimi (formato SIAE)
  const totalRevenueInCents = Math.round(totalRevenue * 100);
  const ivaAmount = Math.round(totalRevenueInCents * 0.10); // IVA 10% per spettacoli
  
  // Data evento
  const eventDate = eventRecord?.startDatetime 
    ? new Date(eventRecord.startDatetime).toISOString().split('T')[0].replace(/-/g, '')
    : reportDate.toISOString().split('T')[0].replace(/-/g, '');
  const eventTime = eventRecord?.startDatetime
    ? new Date(eventRecord.startDatetime).toTimeString().split(' ')[0].replace(/:/g, '').substring(0, 4)
    : '2000';

  // Genera sezioni OrdineDiPosto per i settori
  let ordiniDiPostoXml = '';
  if (sectors && sectors.length > 0) {
    for (const sector of sectors) {
      ordiniDiPostoXml += `
            <OrdineDiPosto>
                <CodiceOrdine>${sector.orderCode || 'A0'}</CodiceOrdine>
                <Capienza>${sector.capacity || 0}</Capienza>
                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>
            </OrdineDiPosto>`;
    }
  } else {
    ordiniDiPostoXml = `
            <OrdineDiPosto>
                <CodiceOrdine>A0</CodiceOrdine>
                <Capienza>100</Capienza>
                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>
            </OrdineDiPosto>`;
  }

  // Genera sezione Abbonamenti se presenti
  let abbonamentiXml = '';
  const subscriptions = reportData.subscriptions || [];
  if (subscriptions.length > 0) {
    const totalSubRevenue = subscriptions.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0);
    const totalSubRevenueInCents = Math.round(totalSubRevenue * 100);
    const subIvaAmount = Math.round(totalSubRevenueInCents * 0.10);
    
    abbonamentiXml = `
        <Abbonamenti>
            <AbbonamentiEmessi>
                <Quantita>${subscriptions.length}</Quantita>
                <CorrispettivoLordo>${totalSubRevenueInCents}</CorrispettivoLordo>
                <IVACorrispettivo>${subIvaAmount}</IVACorrispettivo>
            </AbbonamentiEmessi>
        </Abbonamenti>`;
  }

  const rootElement = isMonthly ? 'RiepilogoMensile' : 'RiepilogoGiornaliero';
  const meseAttrName = isMonthly ? 'Mese' : 'Giorno';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<${rootElement} ${meseAttrName}="${meseAttr}" DataGenerazione="${dataGen}" OraGenerazione="${oraGen}" ProgressivoGenerazione="${progressivo}" Sostituzione="N">
    <Titolare>
        <Denominazione>${company?.name || 'N/A'}</Denominazione>
        <CodiceFiscale>${company?.taxId || 'XXXXXXXXXXXXXXXX'}</CodiceFiscale>
        <SistemaEmissione>${ticketedEvent.systemCode || 'EVENT4U'}</SistemaEmissione>
    </Titolare>
    <Organizzatore>
        <Denominazione>${company?.name || 'N/A'}</Denominazione>
        <CodiceFiscale>${company?.taxId || 'XXXXXXXXXXXXXXXX'}</CodiceFiscale>
        <TipoOrganizzatore valore="${ticketedEvent.organizerType || 'G'}"/>
        <Evento>
            <Intrattenimento>
                <TipoTassazione valore="${ticketedEvent.taxType || 'I'}"/>
                <Incidenza>${ticketedEvent.entertainmentIncidence || 100}</Incidenza>
                <ImponibileIntrattenimenti>0</ImponibileIntrattenimenti>
            </Intrattenimento>
            <Locale>
                <Denominazione>${ticketedEvent.eventLocation || eventRecord?.locationId || 'Locale'}</Denominazione>
                <CodiceLocale>${ticketedEvent.siaeLocationCode || 'XXXXXX'}</CodiceLocale>
            </Locale>
            <DataEvento>${eventDate}</DataEvento>
            <OraEvento>${eventTime}</OraEvento>
            <MultiGenere>
                <TipoGenere>${ticketedEvent.genreCode || '61'}</TipoGenere>
                <IncidenzaGenere>0</IncidenzaGenere>
                <TitoliOpere>
                    <Titolo>${eventRecord?.name || ticketedEvent.eventTitle || 'Evento'}</Titolo>
                </TitoliOpere>
            </MultiGenere>${ordiniDiPostoXml}
        </Evento>
        <TitoliIngresso>
            <TitoliEmessi>
                <Quantita>${activeTicketsCount}</Quantita>
                <CorrispettivoLordo>${totalRevenueInCents}</CorrispettivoLordo>
                <Prevendita>0</Prevendita>
                <IVACorrispettivo>${ivaAmount}</IVACorrispettivo>
                <IVAPrevendita>0</IVAPrevendita>
            </TitoliEmessi>
            <TitoliAnnullati>
                <Quantita>${cancelledTicketsCount}</Quantita>
                <CorrispettivoLordo>0</CorrispettivoLordo>
                <Prevendita>0</Prevendita>
                <IVACorrispettivo>0</IVACorrispettivo>
                <IVAPrevendita>0</IVAPrevendita>
            </TitoliAnnullati>
        </TitoliIngresso>${abbonamentiXml}
    </Organizzatore>
</${rootElement}>`;
  
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

        // Calcola il progressivo per questa trasmissione
        const progressivo = await getNextProgressivo(ticketedEvent.id, 'daily', yesterday);
        const reportData = await generateC1ReportData(ticketedEvent, 'giornaliero', yesterday, progressivo);
        const xmlContent = generateXMLContent(reportData);

        const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
        let fileName = `C1_DAILY_${ticketedEvent.siaeEventCode || ticketedEvent.id}_${dateStr}_P${progressivo}.xml`;

        const transmission = await siaeStorage.createSiaeTransmission({
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

        // Tenta firma digitale se il bridge è connesso
        let xmlToSend = xmlContent;
        let signatureInfo = '';
        let isSigned = false;
        
        try {
          if (isBridgeConnected()) {
            log(`Bridge connesso, tentativo firma digitale...`);
            const signatureResult = await requestXmlSignature(xmlContent);
            xmlToSend = signatureResult.signedXml;
            signatureInfo = ' (firmato digitalmente)';
            isSigned = true;
            log(`XML firmato con successo alle ${signatureResult.signedAt}`);
            
            // Aggiorna nome file con estensione .xml.p7m per file firmati
            fileName = fileName.replace('.xml', '.xml.p7m');
            
            // Aggiorna trasmissione con contenuto firmato e nuovo nome file
            await siaeStorage.updateSiaeTransmission(transmission.id, {
              fileContent: xmlToSend,
              fileName: fileName,
            });
          } else {
            log(`Bridge non connesso, invio XML non firmato`);
          }
        } catch (signError: any) {
          log(`ATTENZIONE: Firma digitale fallita, invio non firmato: ${signError.message}`);
        }

        // Invio automatico email a SIAE
        try {
          await sendSiaeTransmissionEmail({
            to: SIAE_TEST_EMAIL,
            companyName: reportData.company?.name || 'N/A',
            transmissionType: 'daily',
            periodDate: yesterday,
            ticketsCount: reportData.activeTicketsCount,
            totalAmount: reportData.totalRevenue.toFixed(2),
            xmlContent: xmlToSend,
            transmissionId: transmission.id,
          });

          // Aggiorna status a 'sent'
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'sent',
            sentAt: new Date(),
          });
          log(`Evento ${ticketedEvent.id} - Email inviata a ${SIAE_TEST_EMAIL}${signatureInfo}, status aggiornato a 'sent'`);
        } catch (emailError: any) {
          log(`ERRORE invio email per evento ${ticketedEvent.id}: ${emailError.message}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: emailError.message,
          });
        }
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

        // Calcola il progressivo per questa trasmissione mensile
        const progressivo = await getNextProgressivo(ticketedEvent.id, 'monthly', previousMonth);
        const reportData = await generateC1ReportData(ticketedEvent, 'mensile', previousMonth, progressivo);
        const xmlContent = generateXMLContent(reportData);

        const monthStr = `${previousMonth.getFullYear()}${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
        let fileName = `C1_MONTHLY_${ticketedEvent.siaeEventCode || ticketedEvent.id}_${monthStr}_P${progressivo}.xml`;

        const transmission = await siaeStorage.createSiaeTransmission({
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

        // Tenta firma digitale se il bridge è connesso
        let xmlToSend = xmlContent;
        let signatureInfo = '';
        let isSigned = false;
        
        try {
          if (isBridgeConnected()) {
            log(`Bridge connesso, tentativo firma digitale per report mensile...`);
            const signatureResult = await requestXmlSignature(xmlContent);
            xmlToSend = signatureResult.signedXml;
            signatureInfo = ' (firmato digitalmente)';
            isSigned = true;
            log(`XML mensile firmato con successo alle ${signatureResult.signedAt}`);
            
            // Aggiorna nome file con estensione .xml.p7m per file firmati
            fileName = fileName.replace('.xml', '.xml.p7m');
            
            // Aggiorna trasmissione con contenuto firmato e nuovo nome file
            await siaeStorage.updateSiaeTransmission(transmission.id, {
              fileContent: xmlToSend,
              fileName: fileName,
            });
          } else {
            log(`Bridge non connesso, invio XML mensile non firmato`);
          }
        } catch (signError: any) {
          log(`ATTENZIONE: Firma digitale report mensile fallita, invio non firmato: ${signError.message}`);
        }

        // Invio automatico email a SIAE
        try {
          await sendSiaeTransmissionEmail({
            to: SIAE_TEST_EMAIL,
            companyName: reportData.company?.name || 'N/A',
            transmissionType: 'monthly',
            periodDate: previousMonth,
            ticketsCount: reportData.activeTicketsCount,
            totalAmount: reportData.totalRevenue.toFixed(2),
            xmlContent: xmlToSend,
            transmissionId: transmission.id,
          });

          // Aggiorna status a 'sent'
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'sent',
            sentAt: new Date(),
          });
          log(`Evento ${ticketedEvent.id} - Email mensile inviata a ${SIAE_TEST_EMAIL}${signatureInfo}, status aggiornato a 'sent'`);
        } catch (emailError: any) {
          log(`ERRORE invio email mensile per evento ${ticketedEvent.id}: ${emailError.message}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: emailError.message,
          });
        }
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
