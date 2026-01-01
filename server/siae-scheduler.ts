import { db } from "./db";
import { siaeTicketedEvents, siaeTransmissions, events, companies, siaeEventSectors, siaeTickets } from "@shared/schema";
import { eq, and, sql, gte, lt, desc } from "drizzle-orm";
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";
import { sendSiaeTransmissionEmail } from "./email-service";
import { isBridgeConnected, requestXmlSignature, getCachedEfffData } from "./bridge-relay";
import { escapeXml, formatSiaeDateCompact, formatSiaeTimeCompact, formatSiaeTimeHHMM, generateSiaeFileName } from './siae-utils';

// Configurazione SIAE secondo Allegato B e C - Provvedimento Agenzia delle Entrate 04/03/2008
const SIAE_TEST_MODE = process.env.SIAE_TEST_MODE === 'true';
const SIAE_TEST_EMAIL = process.env.SIAE_TEST_EMAIL || 'servertest2@batest.siae.it';
const SIAE_SYSTEM_CODE = process.env.SIAE_SYSTEM_CODE || 'EVENT4U1'; // Max 8 caratteri
const SIAE_VERSION = 'V.01.00';

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  console.log(`${formattedTime} [SIAE-Scheduler] ${message}`);
}

// Funzione generateSiaeFileName importata da ./siae-utils.ts
// Usata per nomi file RCA (controllo accessi)

/**
 * Genera subject email conforme a RFC-2822 SIAE
 * Formato: RCA_<AAAA>_<MM>_<GG>_<SSSSSSSS>_<###>_<TTT>_V.<XX>.<YY>
 */
export function generateSiaeEmailSubject(date: Date, systemCode: string, sequenceNumber: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const code = systemCode.padEnd(8, '0').substring(0, 8);
  const seq = String(sequenceNumber).padStart(3, '0');
  return `RCA_${year}_${month}_${day}_${code}_${seq}_XSI_${SIAE_VERSION}`;
}

/**
 * Mappa codice genere evento a codice SIAE (2 caratteri)
 * Secondo Allegato B - TAB.1
 */
export function mapGenreToSiae(genreCode: string | null): string {
  const genreMap: Record<string, string> = {
    '60': 'DI', // Discoteca/Disco
    '61': 'DI', // Disco/Club
    '10': 'TE', // Teatro
    '20': 'CI', // Cinema
    '30': 'CO', // Concerto
    '40': 'SP', // Sport
    '50': 'AL', // Altro
  };
  return genreMap[genreCode || '60'] || 'DI';
}

/**
 * Determina tipo SpettacoloIntrattenimento secondo specifiche SIAE
 * S=spettacolo, I=intrattenimento, P=spettacolo digitale, N=intrattenimento digitale
 */
export function getSpettacoloIntrattenimentoCode(taxType: string | null, isDigital: boolean = false): string {
  if (taxType === 'S') return isDigital ? 'P' : 'S';
  return isDigital ? 'N' : 'I';
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
  // Include both regular cancellations and resale annulments for SIAE compliance
  const cancelledTickets = filteredTickets.filter(t => 
    t.status === 'annullato' || t.status === 'annullato_rivendita'
  );

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
  } catch (e: any) {
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

/**
 * Genera XML in formato RiepilogoControlloAccessi conforme a DTD SIAE
 * Allegato B - Provvedimento Agenzia delle Entrate 04/03/2008
 */
function generateXMLContent(reportData: any): string {
  const { 
    ticketedEvent, 
    company, 
    eventRecord, 
    sectors, 
    reportType, 
    reportDate, 
    activeTicketsCount, 
    cancelledTicketsCount, 
    totalRevenue, 
    filteredTickets, 
    progressivo = 1,
    cachedEfffData = null
  } = reportData;
  
  const now = new Date();
  // Prefer systemId from Smart Card EFFF, fallback to config
  const systemCode = cachedEfffData?.systemId || ticketedEvent.systemCode || SIAE_SYSTEM_CODE;
  // Prefer partnerCodFis from EFFF for tax ID
  const taxId = cachedEfffData?.partnerCodFis || company?.taxId || 'XXXXXXXXXXXXXXXX';
  
  // Date/time in formato SIAE
  const dataRiepilogo = formatSiaeDateCompact(reportDate);
  const dataGenerazione = formatSiaeDateCompact(now);
  const oraGenerazione = formatSiaeTimeCompact(now);
  
  // Data e ora evento
  const eventDateTime = eventRecord?.startDatetime ? new Date(eventRecord.startDatetime) : reportDate;
  const dataEvento = formatSiaeDateCompact(eventDateTime);
  const oraEvento = formatSiaeTimeHHMM(eventDateTime);
  
  // Codice genere SIAE (2 caratteri)
  const tipoGenere = mapGenreToSiae(ticketedEvent.genreCode);
  
  // Tipo spettacolo/intrattenimento
  const spettacoloIntrattenimento = getSpettacoloIntrattenimentoCode(ticketedEvent.taxType);
  
  // Incidenza intrattenimento (percentuale)
  const incidenzaIntrattenimento = ticketedEvent.entertainmentIncidence || 100;
  
  // Codice locale (13 caratteri, padded con zeri)
  const codiceLocale = (ticketedEvent.siaeLocationCode || '').padStart(13, '0').substring(0, 13);
  
  // Converti importo in centesimi (formato SIAE)
  const totalRevenueInCents = Math.round(totalRevenue * 100);
  const ivaAmount = Math.round(totalRevenueInCents * 0.10); // IVA 10% per spettacoli
  const netAmount = totalRevenueInCents - ivaAmount;
  
  // Calcola capienza totale dai settori
  let capienzaTotale = 0;
  if (sectors && sectors.length > 0) {
    capienzaTotale = sectors.reduce((sum: number, s: any) => sum + (s.capacity || 0), 0);
  } else {
    capienzaTotale = 100; // Default
  }

  // Genera XML conforme a RiepilogoControlloAccessi DTD
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE RiepilogoControlloAccessi SYSTEM "RiepilogoControlloAccessi_v0100_20080201.dtd">
<RiepilogoControlloAccessi Sostituzione="N">
  <Titolare>
    <DenominazioneTitolareCA>${escapeXml(company?.name || 'N/A')}</DenominazioneTitolareCA>
    <CFTitolareCA>${escapeXml(taxId)}</CFTitolareCA>
    <CodiceSistemaCA>${escapeXml(systemCode)}</CodiceSistemaCA>
    <DataRiepilogo>${dataRiepilogo}</DataRiepilogo>
    <DataGenerazioneRiepilogo>${dataGenerazione}</DataGenerazioneRiepilogo>
    <OraGenerazioneRiepilogo>${oraGenerazione}</OraGenerazioneRiepilogo>
    <ProgressivoRiepilogo>${progressivo}</ProgressivoRiepilogo>
  </Titolare>
  <Evento>
    <CFOrganizzatore>${escapeXml(taxId)}</CFOrganizzatore>
    <DenominazioneOrganizzatore>${escapeXml(company?.name || 'N/A')}</DenominazioneOrganizzatore>
    <TipologiaOrganizzatore>${ticketedEvent.organizerType || 'G'}</TipologiaOrganizzatore>
    <SpettacoloIntrattenimento>${spettacoloIntrattenimento}</SpettacoloIntrattenimento>
    <IncidenzaIntrattenimento>${incidenzaIntrattenimento}</IncidenzaIntrattenimento>
    <DenominazioneLocale>${escapeXml(ticketedEvent.eventLocation || eventRecord?.locationId || 'Locale')}</DenominazioneLocale>
    <CodiceLocale>${codiceLocale}</CodiceLocale>
    <DataEvento>${dataEvento}</DataEvento>
    <OraEvento>${oraEvento}</OraEvento>
    <TipoGenere>${tipoGenere}</TipoGenere>
    <TitoloEvento>${escapeXml(eventRecord?.name || ticketedEvent.eventTitle || 'Evento')}</TitoloEvento>
    <Autore></Autore>
    <Esecutore></Esecutore>
    <NazionalitaFilm></NazionalitaFilm>
    <NumOpereRappresentate>1</NumOpereRappresentate>
    <SistemaEmissione CFTitolare="${escapeXml(taxId)}" CodiceSistema="${escapeXml(systemCode)}">`;

  // Genera sezioni Titoli per ogni settore
  if (sectors && sectors.length > 0) {
    for (const sector of sectors) {
      const sectorTickets = filteredTickets.filter((t: any) => t.sectorId === sector.id);
      const sectorCancelled = reportData.cancelledTickets?.filter((t: any) => t.sectorId === sector.id)?.length || 0;
      const sectorRevenue = sectorTickets.reduce((sum: number, t: any) => {
        return sum + (Number(t.ticketPrice) || Number(t.grossAmount) || 0);
      }, 0);
      const sectorRevenueInCents = Math.round(sectorRevenue * 100);
      
      xml += `
      <Titoli>
        <CodiceOrdinePosto>${escapeXml(sector.orderCode || 'A0')}</CodiceOrdinePosto>
        <Capienza>${sector.capacity || 0}</Capienza>
        <TotaleTipoTitolo>
          <TipoTitolo>IN</TipoTitolo>
          <TotaleTitoliLTA>${sectorTickets.length}</TotaleTitoliLTA>
          <TotaleTitoliNoAccessoTradiz>0</TotaleTitoliNoAccessoTradiz>
          <TotaleTitoliNoAccessoDigitali>0</TotaleTitoliNoAccessoDigitali>
          <TotaleTitoliLTAAccessoTradiz>${sectorTickets.length}</TotaleTitoliLTAAccessoTradiz>
          <TotaleTitoliLTAAccessoDigitali>0</TotaleTitoliLTAAccessoDigitali>
          <TotaleCorrispettiviLordi>${sectorRevenueInCents}</TotaleCorrispettiviLordi>
          <TotaleDirittiPrevendita>0</TotaleDirittiPrevendita>
          <TotaleIVACorrispettivi>${Math.round(sectorRevenueInCents * 0.10)}</TotaleIVACorrispettivi>
          <TotaleIVADirittiPrevendita>0</TotaleIVADirittiPrevendita>
        </TotaleTipoTitolo>
        <TotaleTitoliAnnullati>
          <TipoTitolo>IN</TipoTitolo>
          <TotaleTitoliAnnull>${sectorCancelled}</TotaleTitoliAnnull>
          <TotaleCorrispettiviLordiAnnull>0</TotaleCorrispettiviLordiAnnull>
          <TotaleDirittiPrevenditaAnnull>0</TotaleDirittiPrevenditaAnnull>
          <TotaleIVACorrispettiviAnnull>0</TotaleIVACorrispettiviAnnull>
          <TotaleIVADirittiPrevenditaAnnull>0</TotaleIVADirittiPrevenditaAnnull>
        </TotaleTitoliAnnullati>
      </Titoli>`;
    }
  } else {
    // Settore default se non ci sono settori definiti
    xml += `
      <Titoli>
        <CodiceOrdinePosto>A0</CodiceOrdinePosto>
        <Capienza>${capienzaTotale}</Capienza>
        <TotaleTipoTitolo>
          <TipoTitolo>IN</TipoTitolo>
          <TotaleTitoliLTA>${activeTicketsCount}</TotaleTitoliLTA>
          <TotaleTitoliNoAccessoTradiz>0</TotaleTitoliNoAccessoTradiz>
          <TotaleTitoliNoAccessoDigitali>0</TotaleTitoliNoAccessoDigitali>
          <TotaleTitoliLTAAccessoTradiz>${activeTicketsCount}</TotaleTitoliLTAAccessoTradiz>
          <TotaleTitoliLTAAccessoDigitali>0</TotaleTitoliLTAAccessoDigitali>
          <TotaleCorrispettiviLordi>${totalRevenueInCents}</TotaleCorrispettiviLordi>
          <TotaleDirittiPrevendita>0</TotaleDirittiPrevendita>
          <TotaleIVACorrispettivi>${ivaAmount}</TotaleIVACorrispettivi>
          <TotaleIVADirittiPrevendita>0</TotaleIVADirittiPrevendita>
        </TotaleTipoTitolo>
        <TotaleTitoliAnnullati>
          <TipoTitolo>IN</TipoTitolo>
          <TotaleTitoliAnnull>${cancelledTicketsCount}</TotaleTitoliAnnull>
          <TotaleCorrispettiviLordiAnnull>0</TotaleCorrispettiviLordiAnnull>
          <TotaleDirittiPrevenditaAnnull>0</TotaleDirittiPrevenditaAnnull>
          <TotaleIVACorrispettiviAnnull>0</TotaleIVACorrispettiviAnnull>
          <TotaleIVADirittiPrevenditaAnnull>0</TotaleIVADirittiPrevenditaAnnull>
        </TotaleTitoliAnnullati>
      </Titoli>`;
  }

  // Genera sezione Abbonamenti se presenti
  const subscriptions = reportData.subscriptions || [];
  if (subscriptions.length > 0) {
    const totalSubRevenue = subscriptions.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0);
    const totalSubRevenueInCents = Math.round(totalSubRevenue * 100);
    const subIvaAmount = Math.round(totalSubRevenueInCents * 0.10);
    
    xml += `
      <Abbonamenti>
        <TotaleAbbonamenti>${subscriptions.length}</TotaleAbbonamenti>
        <TotaleCorrispettiviLordiAbb>${totalSubRevenueInCents}</TotaleCorrispettiviLordiAbb>
        <TotaleIVAAbb>${subIvaAmount}</TotaleIVAAbb>
      </Abbonamenti>`;
  }

  xml += `
    </SistemaEmissione>
  </Evento>
</RiepilogoControlloAccessi>`;
  
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
  log('Avvio job invio report giornalieri RCA (RiepilogoControlloAccessi)...');
  
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
        // Add EFFF data from Smart Card if available
        const cachedEfff = getCachedEfffData();
        reportData.cachedEfffData = cachedEfff;
        const xmlContent = generateXMLContent(reportData);

        // Prefer systemId from Smart Card EFFF for email subject consistency with XML
        const systemCode = cachedEfff?.systemId || ticketedEvent.systemCode || SIAE_SYSTEM_CODE;
        // RCA reports: usa 'rca' come tipo report per nome file RCA_YYYY_MM_DD_###.xsi
        let fileName = generateSiaeFileName('rca', yesterday, progressivo, false);
        let isSigned = false;

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

        log(`Evento ${ticketedEvent.id} (${event.name}) - Report RCA creato: ${fileName}`);

        // Tenta firma digitale se il bridge è connesso
        let signatureInfo = '';
        let p7mBase64: string | undefined;
        let signedXmlContent: string | undefined;
        
        try {
          if (isBridgeConnected()) {
            log(`Bridge connesso, tentativo firma digitale...`);
            const signatureResult = await requestXmlSignature(xmlContent);
            
            // Supporta sia CAdES-BES (nuovo) che XMLDSig (legacy)
            if (signatureResult.p7mBase64) {
              // CAdES-BES: mantieni il P7M Base64 separato
              p7mBase64 = signatureResult.p7mBase64;
              signatureInfo = ` (firmato CAdES-BES ${signatureResult.algorithm || 'SHA-256'})`;
              isSigned = true;
              log(`Firma CAdES-BES creata alle ${signatureResult.signedAt}`);
            } else if (signatureResult.signedXml) {
              // Legacy XMLDSig (deprecato)
              signedXmlContent = signatureResult.signedXml;
              signatureInfo = ' (firmato XMLDSig - DEPRECATO)';
              isSigned = true;
              log(`Firma XMLDSig creata alle ${signatureResult.signedAt}`);
            }
            
            // Aggiorna nome file con estensione .xsi.p7m per file firmati
            fileName = generateSiaeFileName('rca', yesterday, progressivo, true);
            
            // Aggiorna trasmissione con firma e contenuto appropriato
            await siaeStorage.updateSiaeTransmission(transmission.id, {
              fileContent: signedXmlContent || xmlContent, // XML originale o XMLDSig firmato
              fileName: fileName,
              p7mContent: p7mBase64 || null, // Salva P7M Base64 per resend offline
              signatureFormat: p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : null),
              signedAt: new Date(),
            });
          } else {
            log(`Bridge non connesso, invio XML non firmato`);
          }
        } catch (signError: any) {
          log(`ATTENZIONE: Firma digitale fallita, invio non firmato: ${signError.message}`);
        }

        // Invio automatico email a SIAE con nuovo formato subject
        try {
          await sendSiaeTransmissionEmail({
            to: SIAE_TEST_EMAIL,
            companyName: reportData.company?.name || 'N/A',
            transmissionType: 'daily',
            periodDate: yesterday,
            ticketsCount: reportData.activeTicketsCount,
            totalAmount: reportData.totalRevenue.toFixed(2),
            xmlContent: signedXmlContent || xmlContent, // XML originale o XMLDSig firmato
            transmissionId: transmission.id,
            systemCode: systemCode,
            sequenceNumber: progressivo,
            p7mBase64: p7mBase64, // CAdES-BES P7M per allegato email
            signatureFormat: p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : undefined),
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
  log('Avvio job invio report mensili RCA...');
  
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
        // Add EFFF data from Smart Card if available
        const cachedEfff = getCachedEfffData();
        reportData.cachedEfffData = cachedEfff;
        const xmlContent = generateXMLContent(reportData);

        // Prefer systemId from Smart Card EFFF for email subject consistency with XML
        const systemCode = cachedEfff?.systemId || ticketedEvent.systemCode || SIAE_SYSTEM_CODE;
        // RCA reports mensili: usa 'rca' come tipo report per nome file RCA_YYYY_MM_DD_###.xsi
        let fileName = generateSiaeFileName('rca', previousMonth, progressivo, false);
        let isSigned = false;

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

        log(`Evento ${ticketedEvent.id} - Report mensile RCA creato: ${fileName}`);

        // Tenta firma digitale se il bridge è connesso
        let signatureInfo = '';
        let p7mBase64: string | undefined;
        let signedXmlContent: string | undefined;
        
        try {
          if (isBridgeConnected()) {
            log(`Bridge connesso, tentativo firma digitale per report mensile...`);
            const signatureResult = await requestXmlSignature(xmlContent);
            
            // Supporta sia CAdES-BES (nuovo) che XMLDSig (legacy)
            if (signatureResult.p7mBase64) {
              // CAdES-BES: mantieni il P7M Base64 separato
              p7mBase64 = signatureResult.p7mBase64;
              signatureInfo = ` (firmato CAdES-BES ${signatureResult.algorithm || 'SHA-256'})`;
              isSigned = true;
              log(`Firma mensile CAdES-BES creata alle ${signatureResult.signedAt}`);
            } else if (signatureResult.signedXml) {
              // Legacy XMLDSig (deprecato)
              signedXmlContent = signatureResult.signedXml;
              signatureInfo = ' (firmato XMLDSig - DEPRECATO)';
              isSigned = true;
              log(`Firma mensile XMLDSig creata alle ${signatureResult.signedAt}`);
            }
            
            // Aggiorna nome file con estensione .xsi.p7m per file firmati
            fileName = generateSiaeFileName('rca', previousMonth, progressivo, true);
            
            // Aggiorna trasmissione con firma e contenuto appropriato
            await siaeStorage.updateSiaeTransmission(transmission.id, {
              fileContent: signedXmlContent || xmlContent, // XML originale o XMLDSig firmato
              fileName: fileName,
              p7mContent: p7mBase64 || null, // Salva P7M Base64 per resend offline
              signatureFormat: p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : null),
              signedAt: new Date(),
            });
          } else {
            log(`Bridge non connesso, invio XML mensile non firmato`);
          }
        } catch (signError: any) {
          log(`ATTENZIONE: Firma digitale report mensile fallita, invio non firmato: ${signError.message}`);
        }

        // Invio automatico email a SIAE con nuovo formato subject
        try {
          await sendSiaeTransmissionEmail({
            to: SIAE_TEST_EMAIL,
            companyName: reportData.company?.name || 'N/A',
            transmissionType: 'monthly',
            periodDate: previousMonth,
            ticketsCount: reportData.activeTicketsCount,
            totalAmount: reportData.totalRevenue.toFixed(2),
            xmlContent: signedXmlContent || xmlContent, // XML originale o XMLDSig firmato
            transmissionId: transmission.id,
            systemCode: systemCode,
            sequenceNumber: progressivo,
            p7mBase64: p7mBase64, // CAdES-BES P7M per allegato email
            signatureFormat: p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : undefined),
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
  log('Inizializzazione scheduler SIAE (formato RiepilogoControlloAccessi)...');

  if (dailyIntervalId) clearInterval(dailyIntervalId);
  if (monthlyIntervalId) clearInterval(monthlyIntervalId);

  dailyIntervalId = setInterval(checkAndRunDailyJob, 60 * 1000);
  monthlyIntervalId = setInterval(checkAndRunMonthlyJob, 60 * 1000);

  log('Scheduler SIAE inizializzato:');
  log('  - Job giornaliero: ogni notte alle 02:00');
  log('  - Job mensile: primo giorno del mese alle 03:00');
  log(`  - System Code: ${SIAE_SYSTEM_CODE}`);
  log(`  - Test Mode: ${SIAE_TEST_MODE}`);
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
