import { db } from "./db";
import { siaeTicketedEvents, siaeTransmissions, siaeTransmissionSettings, events, companies, siaeEventSectors, siaeTickets, siaeResales, companyFeatures } from "@shared/schema";
import { eq, and, sql, gte, lt, desc, lte, isNull } from "drizzle-orm";
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";
import type { SiaeTransmissionSettings } from "@shared/schema";
import { sendSiaeTransmissionEmail } from "./email-service";
import { isBridgeConnected, requestXmlSignature, getCachedEfffData } from "./bridge-relay";
import { escapeXml, formatSiaeDateCompact, formatSiaeTimeCompact, formatSiaeTimeHHMM, generateSiaeFileName, generateSiaeSubject, mapToSiaeTipoGenere, generateRCAXml, normalizeSiaeTipoTitolo, normalizeSiaeCodiceOrdine, validateSystemCodeConsistency, validatePreTransmission, resolveSystemCode, resolveSystemCodeForSmime, autoCorrectSiaeXml, SIAE_SYSTEM_CODE_DEFAULT, generateC1Xml, validateSiaeSystemCode, validateSiaeFileName, type RCAParams, type C1XmlParams, type C1EventContext, type C1SectorData, type C1TicketData, type C1SubscriptionData } from './siae-utils';
import { calculateTransmissionStats, calculateFileHash } from './siae-routes';
import { createSiaeTransmissionWithXml } from './siae-transmission-service';
import { checkForSiaeResponses } from './gmail-client';

// Configurazione SIAE secondo Allegato B e C - Provvedimento Agenzia delle Entrate 04/03/2008
const SIAE_TEST_MODE = process.env.SIAE_TEST_MODE === 'true';
const SIAE_TEST_EMAIL = process.env.SIAE_TEST_EMAIL || 'servertest2@batest.siae.it';
// FIX 2026-01-15: Rimossa costante SIAE_SYSTEM_CODE locale - usare resolveSystemCode() per coerenza
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

// Funzione generateSiaeFileName e generateSiaeSubject importate da ./siae-utils.ts
// Usata per nomi file e subject email (formato unificato)

/**
 * Genera subject email conforme a SIAE
 * @deprecated Usare generateSiaeSubject da siae-utils.ts direttamente
 * 
 * FIX 2026-01-16: Usa la funzione centralizzata per garantire coerenza
 * tra subject email e nome file allegato (errore SIAE 0603)
 */
export function generateSiaeEmailSubject(date: Date, systemCode: string, sequenceNumber: number): string {
  // Delega alla funzione centralizzata che garantisce coerenza con il nome file
  return generateSiaeSubject('rca', date, sequenceNumber, systemCode);
}

/**
 * Mappa codice genere evento a codice SIAE (2 caratteri numerici)
 * Re-export dalla funzione centralizzata in siae-utils.ts
 * @deprecated Usa mapToSiaeTipoGenere direttamente da siae-utils.ts
 */
export function mapGenreToSiae(genreCode: string | null): string {
  return mapToSiaeTipoGenere(genreCode);
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

// Ottiene le impostazioni trasmissione globali (singleton)
async function getGlobalTransmissionSettings(): Promise<SiaeTransmissionSettings | null> {
  const [settings] = await db.select()
    .from(siaeTransmissionSettings)
    .where(eq(siaeTransmissionSettings.id, 'global'));
  return settings || null;
}

// Verifica se è passato l'intervallo richiesto dall'ultimo invio
function shouldSendBasedOnInterval(lastSentAt: Date | null, intervalDays: number): boolean {
  if (!lastSentAt) return true; // Mai inviato, procedi
  
  const now = new Date();
  const daysSinceLast = Math.floor((now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceLast >= intervalDays;
}

// Verifica se un evento è terminato da N giorni
function eventEndedDaysAgo(eventEndDate: Date, delayDays: number): boolean {
  const now = new Date();
  const endDate = new Date(eventEndDate);
  const daysSinceEnd = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceEnd >= delayDays;
}

// Verifica se oggi è il giorno del mese configurato per invio mensile
function isTodayMonthlyRecurringDay(recurringDay: number): boolean {
  const now = new Date();
  return now.getDate() === recurringDay;
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
 * Genera XML in formato conforme a DTD SIAE
 * FIX 2026-01-16: Supporta tre formati distinti:
 * - 'giornaliero' -> RiepilogoGiornaliero (RMG) con Data="YYYYMMDD"
 * - 'mensile' -> RiepilogoMensile (RPM) con Mese="YYYYMM"  
 * - 'rca' -> RiepilogoControlloAccessi (RCA) - formato legacy per singoli eventi
 * 
 * Allegato B - Provvedimento Agenzia delle Entrate 04/03/2008
 * 
 * @param reportData - Dati del report incluso xmlReportType per selezionare il formato
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
    cachedEfffData = null,
    resolvedSystemCode = null,
    xmlReportType = null,
    nomeFile = null
  } = reportData;
  
  const now = new Date();
  if (!resolvedSystemCode) {
    console.error(`[SIAE-SCHEDULER] CRITICAL: resolvedSystemCode non fornito a generateXMLContent!`);
    console.error(`[SIAE-SCHEDULER] Caller DEVE usare resolveSystemCode() PRIMA di chiamare generateXMLContent`);
    throw new Error(
      'RESOLVED_SYSTEM_CODE_REQUIRED: resolvedSystemCode è obbligatorio. ' +
      'Usare resolveSystemCode(cachedEfff, siaeConfig) prima di chiamare generateXMLContent.'
    );
  }
  const systemCode: string = resolvedSystemCode;
  const taxId = cachedEfffData?.partnerCodFis || company?.taxId || 'XXXXXXXXXXXXXXXX';
  const businessName = cachedEfffData?.partnerName || ticketedEvent.businessName || company?.name || 'N/A';
  
  const dataGenerazione = formatSiaeDateCompact(now);
  const oraGenerazione = formatSiaeTimeCompact(now);
  
  const effectiveReportType: 'giornaliero' | 'mensile' | 'rca' = xmlReportType || reportType || 'rca';
  
  if (effectiveReportType === 'giornaliero' || effectiveReportType === 'mensile') {
    const eventContext: C1EventContext = {
      ticketedEvent: {
        id: ticketedEvent.id,
        companyId: ticketedEvent.companyId,
        eventId: ticketedEvent.eventId,
        siaeLocationCode: ticketedEvent.siaeLocationCode,
        capacity: ticketedEvent.capacity,
        taxType: ticketedEvent.taxType,
        entertainmentIncidence: ticketedEvent.entertainmentIncidence,
        genreCode: ticketedEvent.genreCode,
        genreIncidence: ticketedEvent.genreIncidence,
        author: ticketedEvent.author,
        performer: ticketedEvent.performer,
        organizerType: ticketedEvent.organizerType,
      },
      eventRecord: eventRecord ? {
        id: eventRecord.id,
        name: eventRecord.name,
        startDatetime: eventRecord.startDatetime,
        locationId: eventRecord.locationId,
      } : null,
      location: reportData.location || null,
      sectors: (sectors || []).map((s: any): C1SectorData => ({
        id: s.id,
        sectorCode: s.sectorCode || s.orderCode,
        orderCode: s.orderCode,
        capacity: s.capacity,
      })),
      tickets: (filteredTickets || []).map((t: any): C1TicketData => ({
        id: t.id,
        ticketedEventId: t.ticketedEventId,
        sectorId: t.sectorId,
        status: t.status,
        ticketTypeCode: t.ticketTypeCode,
        isComplimentary: t.isComplimentary,
        grossAmount: t.ticketPrice || t.grossAmount,
        prevendita: t.prevendita,
        vatAmount: t.vatAmount,
        prevenditaVat: t.prevenditaVat,
        serviceAmount: t.serviceAmount,
        cancellationReasonCode: t.cancellationReasonCode,
        cancellationDate: t.cancellationDate,
      })),
    };
    
    const c1Subscriptions: C1SubscriptionData[] = (reportData.subscriptions || []).map((s: any): C1SubscriptionData => ({
      id: s.id,
      subscriptionCode: s.subscriptionCode || 'ABB001',
      ticketedEventId: s.ticketedEventId,
      sectorId: s.sectorId,
      validTo: s.validTo,
      createdAt: s.createdAt,
      taxType: s.taxType,
      turnType: s.turnType,
      ticketTypeCode: s.ticketTypeCode,
      isComplimentary: s.isComplimentary,
      status: s.status,
      totalAmount: s.totalAmount,
      rateoVat: s.rateoVat,
      eventsCount: s.eventsCount,
    }));
    
    const c1Params: C1XmlParams = {
      reportKind: effectiveReportType,
      companyId: company?.id || ticketedEvent.companyId,
      reportDate: reportDate,
      resolvedSystemCode: systemCode,
      progressivo: progressivo,
      taxId: taxId,
      businessName: businessName,
      events: [eventContext],
      subscriptions: c1Subscriptions,
      // FIX 2026-01-19: Passa nomeFile per attributo NomeFile obbligatorio (errore SIAE 0600)
      nomeFile: nomeFile || undefined,
    };
    
    // TODO [CONSOLIDAMENTO XML]: Questa chiamata a generateC1Xml non può usare createSiaeTransmissionWithXml
    // perché generateXMLContent restituisce solo XML, non crea trasmissioni.
    // La creazione effettiva della trasmissione avviene nei caller (sendDailyReports linea ~615,
    // sendMonthlyReports linea ~905) che gestiscono anche:
    // - Auto-correzione XML (autoCorrectSiaeXml)
    // - Validazione DTD pre-trasmissione (validatePreTransmission)
    // - Firma digitale CAdES-BES (requestXmlSignature)
    // Per consolidare occorrerebbe refactoring del flusso scheduler per spostare
    // la generazione XML dentro createSiaeTransmissionWithXml con hook per pre/post processing.
    const result = generateC1Xml(c1Params);
    return result.xml;
  }
  
  const dataRiepilogo = formatSiaeDateCompact(reportDate);
  const eventDateTime = eventRecord?.startDatetime ? new Date(eventRecord.startDatetime) : reportDate;
  const dataEvento = formatSiaeDateCompact(eventDateTime);
  const oraEvento = formatSiaeTimeHHMM(eventDateTime);
  const tipoGenere = mapGenreToSiae(ticketedEvent.genreCode);
  const spettacoloIntrattenimento = getSpettacoloIntrattenimentoCode(ticketedEvent.taxType);
  const incidenzaIntrattenimento = ticketedEvent.entertainmentIncidence || 100;
  const codiceLocale = (ticketedEvent.siaeLocationCode || '').padStart(13, '0').substring(0, 13);
  const totalRevenueInCents = Math.round(totalRevenue * 100);
  const ivaAmount = Math.round(totalRevenueInCents * 0.10);
  
  let capienzaTotale = 0;
  if (sectors && sectors.length > 0) {
    capienzaTotale = sectors.reduce((sum: number, s: any) => sum + (s.capacity || 0), 0);
  } else {
    capienzaTotale = 100;
  }

  // TODO [CONSOLIDAMENTO XML]: Questo codice inline è un fallback legacy per RCA.
  // Attualmente tutti i caller di generateXMLContent passano xmlReportType='giornaliero' o 'mensile',
  // quindi questo codice viene eseguito solo se xmlReportType non è specificato (fallback RCA).
  // La logica RCA centralizzata è in generateRCAXml (siae-utils.ts), usata da sendRCAReports().
  // Valutare se questo fallback può essere rimosso o sostituito con chiamata a generateRCAXml.
  // Al momento lo manteniamo per retrocompatibilità con eventuali caller non aggiornati.
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<RiepilogoControlloAccessi Sostituzione="N">
  <Titolare>
    <DenominazioneTitolareCA>${escapeXml(businessName)}</DenominazioneTitolareCA>
    <CFTitolareCA>${escapeXml(taxId)}</CFTitolareCA>
    <CodiceSistemaCA>${escapeXml(systemCode)}</CodiceSistemaCA>
    <DataRiepilogo>${dataRiepilogo}</DataRiepilogo>
    <DataGenerazioneRiepilogo>${dataGenerazione}</DataGenerazioneRiepilogo>
    <OraGenerazioneRiepilogo>${oraGenerazione}</OraGenerazioneRiepilogo>
    <ProgressivoRiepilogo>${progressivo}</ProgressivoRiepilogo>
  </Titolare>
  <Evento>
    <CFOrganizzatore>${escapeXml(taxId)}</CFOrganizzatore>
    <DenominazioneOrganizzatore>${escapeXml(businessName)}</DenominazioneOrganizzatore>
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
    // Carica settings globali UNA volta per run
    const settings = await getGlobalTransmissionSettings();
    
    // Verifica se invio automatico globale è abilitato
    if (settings && !settings.autoSendEnabled) {
      log('Auto-invio disabilitato globalmente, skip job giornaliero');
      return;
    }
    if (settings && !settings.dailyEnabled) {
      log('Invio giornaliero disabilitato globalmente, skip');
      return;
    }
    
    // Verifica intervallo giorni (default 5 se non impostato)
    const intervalDays = settings?.dailyIntervalDays || 5;
    if (settings?.lastDailySentAt && !shouldSendBasedOnInterval(settings.lastDailySentAt, intervalDays)) {
      log(`Non passati ${intervalDays} giorni dall'ultimo invio giornaliero, skip`);
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const ticketedEventsWithEvents = await db.select({
      ticketedEvent: siaeTicketedEvents,
      event: events,
      companyFeature: companyFeatures,
    })
    .from(siaeTicketedEvents)
    .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .leftJoin(companyFeatures, eq(events.companyId, companyFeatures.companyId))
    .where(and(
      eq(siaeTicketedEvents.autoSendReports, true),
      gte(events.endDatetime, yesterday),
      lt(events.endDatetime, endOfYesterday),
      sql`${events.isInternational} IS NOT TRUE`,
      sql`COALESCE(${companyFeatures.operatingMode}, 'italy_only') != 'international_only'`
    ));

    log(`Trovati ${ticketedEventsWithEvents.length} eventi conclusi ieri con auto-invio abilitato (esclusi eventi internazionali)`);

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
        
        // FIX 2026-01-15: Carica siaeConfig per ottenere il systemCode corretto
        // ticketedEvent NON ha systemCode - è nella tabella siaeSystemConfig
        const siaeConfigDaily = await siaeStorage.getSiaeSystemConfig(ticketedEvent.companyId);
        
        // FIX 2026-01-18: TUTTI i report sono firmati S/MIME, usa resolveSystemCodeForSmime
        // Questo garantisce coerenza tra XML e Smart Card (errori SIAE 0600/0603)
        const siaeConfigForResolve = { systemCode: siaeConfigDaily?.systemCode || undefined };
        const smimeResult = resolveSystemCodeForSmime(cachedEfff, siaeConfigForResolve);
        if (!smimeResult.success || !smimeResult.systemCode) {
          log(`BLOCCO TRASMISSIONE RMG: ${smimeResult.error}`);
          log(`Suggerimento: Collegare la Smart Card tramite Desktop Bridge prima dell'invio`);
          continue; // Salta - Smart Card richiesta per S/MIME
        }
        const systemCode = smimeResult.systemCode;
        if (smimeResult.warning) {
          log(`WARNING RMG: ${smimeResult.warning}`);
        }
        log(`FIX 2026-01-18: Resolved systemCode=${systemCode} from ${smimeResult.source} for daily report`);
        
        // FIX 2026-01-16: Valida codice sistema PRIMA della generazione XML
        // Il codice default EVENT4U1 NON è registrato presso SIAE e causa errore 0600
        const systemCodePreValidation = validateSiaeSystemCode(systemCode);
        if (!systemCodePreValidation.valid) {
          log(`BLOCCO TRASMISSIONE RMG: Codice sistema non valido - ${systemCodePreValidation.error}`);
          log(`Suggerimento: ${systemCodePreValidation.isDefault 
            ? 'Configurare il codice sistema SIAE in Impostazioni > SIAE > Configurazione Sistema' 
            : 'Verificare il formato del codice sistema'}`);
          continue; // Salta questo evento, non inviare con codice non valido
        }
        
        // RMG = Riepilogo Giornaliero: genera nome file PRIMA di generateXMLContent per coerenza
        let fileName = generateSiaeFileName('giornaliero', yesterday, progressivo, null, systemCode);
        
        // FIX 2026-01-19: Validazione formato nome file SIAE prima dell'invio
        const fileNameValidation = validateSiaeFileName(fileName);
        if (!fileNameValidation.valid) {
          log(`ERRORE FORMATO NOME FILE: ${fileNameValidation.errors.join('; ')}`);
          continue; // Skip this event, don't send with invalid filename
        }
        
        // FIX 2026-01-16: Passa xmlReportType='giornaliero' e nomeFile per generare RiepilogoGiornaliero
        // invece di RiepilogoControlloAccessi (previene errori SIAE 0600/0603)
        // NOTA: fileName già contiene l'estensione .xsi, non aggiungere di nuovo!
        let xmlContent = generateXMLContent({ 
          ...reportData, 
          cachedEfffData: cachedEfff, 
          resolvedSystemCode: systemCode,
          xmlReportType: 'giornaliero',
          nomeFile: fileName
        });
        
        // AUTO-CORREZIONE PREVENTIVA: Correggi automaticamente errori comuni prima dell'invio
        const autoCorrectionDaily = autoCorrectSiaeXml(xmlContent);
        if (autoCorrectionDaily.corrections.length > 0) {
          log(`AUTO-CORREZIONE: Applicate ${autoCorrectionDaily.corrections.length} correzioni automatiche per RMG:`);
          for (const corr of autoCorrectionDaily.corrections) {
            log(`  - ${corr.field}: ${corr.reason} (previene errore SIAE ${corr.siaeErrorPrevented})`);
          }
          xmlContent = autoCorrectionDaily.correctedXml;
        }
        if (autoCorrectionDaily.uncorrectableErrors.length > 0) {
          log(`ERRORI NON CORREGGIBILI: ${autoCorrectionDaily.uncorrectableErrors.map(e => e.message).join('; ')}`);
        }
        
        // FIX 2026-01-18: Validazione DTD pre-trasmissione obbligatoria per scheduler
        const dailyDtdValidation = await validatePreTransmission(xmlContent, systemCode, 'giornaliero', yesterday);
        if (!dailyDtdValidation.canTransmit) {
          log(`BLOCCO TRASMISSIONE RMG: Validazione DTD fallita - ${dailyDtdValidation.errors.map(e => `[${e.siaeErrorCode || 'ERR'}] ${e.message}`).join('; ')}`);
          continue; // Salta - XML non valido
        }
        if (dailyDtdValidation.warnings.length > 0) {
          log(`WARNING RMG DTD: ${dailyDtdValidation.warnings.map(w => w.message).join('; ')}`);
        }
        
        let fileExtension = '.xsi'; // Default per non firmato
        let signatureFormat: 'cades' | 'xmldsig' | null = null;

        // Calculate transmission statistics
        // FIX 2026-01-18: Cast per proprietà tipoTassazione non presente nel tipo base
        const dailyStats = await calculateTransmissionStats(
          reportData.filteredTickets || [],
          ticketedEvent.companyId,
          ticketedEvent.id,
          (ticketedEvent as any).tipoTassazione,
          ticketedEvent.entertainmentIncidence
        );
        const dailyFileHash = calculateFileHash(xmlContent);

        // FIX 2026-01-15: Salva systemCode per garantire coerenza nei reinvii (errori SIAE 0600/0603)
        const transmission = await siaeStorage.createSiaeTransmission({
          companyId: ticketedEvent.companyId,
          ticketedEventId: ticketedEvent.id,
          transmissionType: 'daily',
          periodDate: yesterday,
          scheduleType: 'daily',
          fileName: fileName.replace(fileExtension, ''),
          fileExtension,
          fileContent: xmlContent,
          status: 'pending',
          ticketsCount: reportData.activeTicketsCount,
          ticketsCancelled: reportData.cancelledTicketsCount,
          totalAmount: reportData.totalRevenue.toFixed(2),
          systemCode: systemCode, // FIX: Salva codice per reinvii futuri
          fileHash: dailyFileHash,
          totalIva: dailyStats.totalIva.toFixed(2),
          totalEsenti: dailyStats.totalEsenti.toFixed(2),
          totalImpostaIntrattenimento: dailyStats.totalImpostaIntrattenimento.toFixed(2),
          cfOrganizzatore: siaeConfigDaily?.taxId || '',
          ticketsChanged: dailyStats.ticketsChanged,
          ticketsResold: dailyStats.ticketsResold,
        });

        log(`Evento ${ticketedEvent.id} (${event.name}) - Report RMG giornaliero creato: ${fileName}`);

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
              signatureFormat = 'cades';
              signatureInfo = ` (firmato CAdES-BES ${signatureResult.algorithm || 'SHA-256'})`;
              log(`Firma CAdES-BES creata alle ${signatureResult.signedAt}`);
            } else if (signatureResult.signedXml) {
              // Legacy XMLDSig (deprecato) - SIAE NON ACCETTA questo formato!
              signedXmlContent = signatureResult.signedXml;
              signatureFormat = 'xmldsig';
              signatureInfo = ' (firmato XMLDSig - DEPRECATO E RIFIUTATO DA SIAE!)';
              log(`ATTENZIONE: Firma XMLDSig creata alle ${signatureResult.signedAt} - QUESTO FORMATO NON E ACCETTATO DA SIAE! Aggiornare il bridge a v3.14+`);
            }
            
            // Aggiorna nome file: .p7m solo per CAdES-BES, altrimenti .xsi
            fileExtension = signatureFormat === 'cades' ? '.p7m' : '.xsi';
            fileName = generateSiaeFileName('giornaliero', yesterday, progressivo, signatureFormat, systemCode);
            
            // Aggiorna trasmissione con firma e contenuto appropriato
            await siaeStorage.updateSiaeTransmission(transmission.id, {
              fileContent: signedXmlContent || xmlContent, // XML originale o XMLDSig firmato
              fileName: fileName.replace(fileExtension, ''),
              fileExtension,
              p7mContent: p7mBase64 || null, // Salva P7M Base64 per resend offline
              signatureFormat: signatureFormat,
              signedAt: new Date(),
            });
          } else {
            log(`Bridge non connesso, invio XML non firmato`);
          }
        } catch (signError: any) {
          log(`ATTENZIONE: Firma digitale fallita, invio non firmato: ${signError.message}`);
        }

        // ==================== VALIDAZIONE COERENZA CODICE SISTEMA ====================
        // FIX 2026-01-15: Blocca invio se codice sistema XML != codice sistema nome file
        // NOTA: Valida sempre XML originale (stringa), non il payload firmato CAdES (Buffer binario)
        const systemCodeValidation = validateSystemCodeConsistency(xmlContent, systemCode);
        
        if (!systemCodeValidation.valid) {
          log(`ERRORE evento ${ticketedEvent.id}: ${systemCodeValidation.error}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: systemCodeValidation.error || 'Codice sistema non coerente',
          });
          continue; // Skip questo evento, procedi con il prossimo
        }
        log(`Evento ${ticketedEvent.id} - Coerenza codice sistema verificata: XML=${systemCodeValidation.xmlSystemCode}, filename=${systemCodeValidation.filenameSystemCode}`);
        // ============================================================================

        // ==================== VALIDAZIONE PRE-TRASMISSIONE COMPLETA ====================
        // FIX 2026-01-15: Validazione centralizzata pre-trasmissione (async per DTD validator)
        const preValidation = await validatePreTransmission(xmlContent, systemCode, 'giornaliero', yesterday);
        if (!preValidation.canTransmit) {
          log(`ERRORE validazione pre-trasmissione evento ${ticketedEvent.id}: ${preValidation.errors.map(e => e.message).join('; ')}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: preValidation.errors.map(e => `[${e.siaeErrorCode || 'UNKNOWN'}] ${e.message}`).join('; '),
          });
          continue;
        }
        log(`Evento ${ticketedEvent.id} - Validazione pre-trasmissione OK`);
        // ============================================================================

        // Invio automatico email a SIAE con nuovo formato subject
        try {
          // FIX 2026-01-20: Passa explicitFileName per garantire coerenza tra nome file allegato e XML
          // Questo previene errore SIAE 0600 causato da discrepanze nel nome file
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
            signatureFormat: signatureFormat || undefined,
            signWithSmime: true,
            requireSignature: true,
            explicitFileName: fileName, // FIX: Usa lo stesso nome file generato per l'XML
          });

          // Aggiorna status a 'sent'
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'sent',
            sentAt: new Date(),
          });
          
          // Aggiorna lastDailySentAt nelle impostazioni globali
          await db.update(siaeTransmissionSettings)
            .set({ lastDailySentAt: new Date() })
            .where(eq(siaeTransmissionSettings.id, 'global'));
          
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
    // Carica settings globali UNA volta per run
    const settings = await getGlobalTransmissionSettings();
    
    // Verifica se invio automatico globale è abilitato
    if (settings && !settings.autoSendEnabled) {
      log('Auto-invio disabilitato globalmente, skip job mensile');
      return;
    }
    if (settings && !settings.monthlyEnabled) {
      log('Invio mensile disabilitato globalmente, skip');
      return;
    }
    
    // Verifica se è il giorno configurato per l'invio mensile
    const recurringDay = settings?.monthlyRecurringDay || 1;
    if (!isTodayMonthlyRecurringDay(recurringDay)) {
      log(`Oggi non è il giorno ${recurringDay} del mese, skip job mensile`);
      return;
    }
    
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const ticketedEventsWithTickets = await db.select({
      ticketedEvent: siaeTicketedEvents,
      event: events,
      companyFeature: companyFeatures,
    })
    .from(siaeTicketedEvents)
    .innerJoin(siaeTickets, eq(siaeTicketedEvents.id, siaeTickets.ticketedEventId))
    .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .leftJoin(companyFeatures, eq(events.companyId, companyFeatures.companyId))
    .where(and(
      eq(siaeTicketedEvents.autoSendReports, true),
      gte(siaeTickets.createdAt, previousMonth),
      lt(siaeTickets.createdAt, endOfPreviousMonth),
      sql`${events.isInternational} IS NOT TRUE`,
      sql`COALESCE(${companyFeatures.operatingMode}, 'italy_only') != 'international_only'`
    ))
    .groupBy(siaeTicketedEvents.id, events.id, companyFeatures.id);

    log(`Trovati ${ticketedEventsWithTickets.length} eventi con attività nel mese precedente (esclusi eventi internazionali)`);

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
        
        // FIX 2026-01-15: Carica siaeConfig per ottenere il systemCode corretto
        // ticketedEvent NON ha systemCode - è nella tabella siaeSystemConfig
        const siaeConfigMonthly = await siaeStorage.getSiaeSystemConfig(ticketedEvent.companyId);
        
        // FIX 2026-01-18: TUTTI i report sono firmati S/MIME, usa resolveSystemCodeForSmime
        // Questo garantisce coerenza tra XML e Smart Card (errori SIAE 0600/0603)
        const siaeConfigForResolve = { systemCode: siaeConfigMonthly?.systemCode || undefined };
        const smimeResultMonthly = resolveSystemCodeForSmime(cachedEfff, siaeConfigForResolve);
        if (!smimeResultMonthly.success || !smimeResultMonthly.systemCode) {
          log(`BLOCCO TRASMISSIONE RPM: ${smimeResultMonthly.error}`);
          log(`Suggerimento: Collegare la Smart Card tramite Desktop Bridge prima dell'invio`);
          continue; // Salta - Smart Card richiesta per S/MIME
        }
        const systemCode = smimeResultMonthly.systemCode;
        if (smimeResultMonthly.warning) {
          log(`WARNING RPM: ${smimeResultMonthly.warning}`);
        }
        log(`FIX 2026-01-18: Resolved systemCode=${systemCode} from ${smimeResultMonthly.source} for monthly report`);
        
        // FIX 2026-01-16: Valida codice sistema PRIMA della generazione XML
        // Il codice default EVENT4U1 NON è registrato presso SIAE e causa errore 0600
        const systemCodePreValidationMonthly = validateSiaeSystemCode(systemCode);
        if (!systemCodePreValidationMonthly.valid) {
          log(`BLOCCO TRASMISSIONE RPM: Codice sistema non valido - ${systemCodePreValidationMonthly.error}`);
          log(`Suggerimento: ${systemCodePreValidationMonthly.isDefault 
            ? 'Configurare il codice sistema SIAE in Impostazioni > SIAE > Configurazione Sistema' 
            : 'Verificare il formato del codice sistema'}`);
          continue; // Salta questo evento, non inviare con codice non valido
        }
        
        // RPM = Riepilogo Mensile: genera nome file PRIMA di generateXMLContent per coerenza
        let fileName = generateSiaeFileName('mensile', previousMonth, progressivo, null, systemCode);
        
        // FIX 2026-01-19: Validazione formato nome file SIAE prima dell'invio
        const fileNameValidationMonthly = validateSiaeFileName(fileName);
        if (!fileNameValidationMonthly.valid) {
          log(`ERRORE FORMATO NOME FILE RPM: ${fileNameValidationMonthly.errors.join('; ')}`);
          continue; // Skip this event, don't send with invalid filename
        }
        
        // FIX 2026-01-16: Passa xmlReportType='mensile' e nomeFile per generare RiepilogoMensile
        // invece di RiepilogoControlloAccessi (previene errori SIAE 0600/0603)
        // NOTA: fileName già contiene l'estensione .xsi, non aggiungere di nuovo!
        const xmlContent = generateXMLContent({ 
          ...reportData, 
          cachedEfffData: cachedEfff, 
          resolvedSystemCode: systemCode,
          xmlReportType: 'mensile',
          nomeFile: fileName
        });
        
        // FIX 2026-01-18: Validazione DTD pre-trasmissione obbligatoria per scheduler
        const monthlyDtdValidation = await validatePreTransmission(xmlContent, systemCode, 'mensile', previousMonth);
        if (!monthlyDtdValidation.canTransmit) {
          log(`BLOCCO TRASMISSIONE RPM: Validazione DTD fallita - ${monthlyDtdValidation.errors.map(e => `[${e.siaeErrorCode || 'ERR'}] ${e.message}`).join('; ')}`);
          continue; // Salta - XML non valido
        }
        if (monthlyDtdValidation.warnings.length > 0) {
          log(`WARNING RPM DTD: ${monthlyDtdValidation.warnings.map(w => w.message).join('; ')}`);
        }
        
        let fileExtension = '.xsi'; // Default per non firmato
        let signatureFormat: 'cades' | 'xmldsig' | null = null;

        // Calculate transmission statistics
        // FIX 2026-01-18: Cast per proprietà tipoTassazione non presente nel tipo base
        const monthlyStats = await calculateTransmissionStats(
          reportData.filteredTickets || [],
          ticketedEvent.companyId,
          ticketedEvent.id,
          (ticketedEvent as any).tipoTassazione,
          ticketedEvent.entertainmentIncidence
        );
        const monthlyFileHash = calculateFileHash(xmlContent);

        // FIX 2026-01-15: Salva systemCode per garantire coerenza nei reinvii (errori SIAE 0600/0603)
        const transmission = await siaeStorage.createSiaeTransmission({
          companyId: ticketedEvent.companyId,
          ticketedEventId: ticketedEvent.id,
          transmissionType: 'monthly',
          periodDate: previousMonth,
          scheduleType: 'monthly',
          fileName: fileName.replace(fileExtension, ''),
          fileExtension,
          fileContent: xmlContent,
          status: 'pending',
          ticketsCount: reportData.activeTicketsCount,
          ticketsCancelled: reportData.cancelledTicketsCount,
          totalAmount: reportData.totalRevenue.toFixed(2),
          systemCode: systemCode, // FIX: Salva codice per reinvii futuri
          fileHash: monthlyFileHash,
          totalIva: monthlyStats.totalIva.toFixed(2),
          totalEsenti: monthlyStats.totalEsenti.toFixed(2),
          totalImpostaIntrattenimento: monthlyStats.totalImpostaIntrattenimento.toFixed(2),
          cfOrganizzatore: siaeConfigMonthly?.taxId || '',
          ticketsChanged: monthlyStats.ticketsChanged,
          ticketsResold: monthlyStats.ticketsResold,
        });

        log(`Evento ${ticketedEvent.id} - Report RPM mensile creato: ${fileName}`);

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
              signatureFormat = 'cades';
              signatureInfo = ` (firmato CAdES-BES ${signatureResult.algorithm || 'SHA-256'})`;
              log(`Firma mensile CAdES-BES creata alle ${signatureResult.signedAt}`);
            } else if (signatureResult.signedXml) {
              // Legacy XMLDSig (deprecato) - SIAE NON ACCETTA questo formato!
              signedXmlContent = signatureResult.signedXml;
              signatureFormat = 'xmldsig';
              signatureInfo = ' (firmato XMLDSig - DEPRECATO E RIFIUTATO DA SIAE!)';
              log(`ATTENZIONE: Firma mensile XMLDSig creata alle ${signatureResult.signedAt} - QUESTO FORMATO NON E ACCETTATO DA SIAE! Aggiornare il bridge a v3.14+`);
            }
            
            // Aggiorna nome file: .p7m solo per CAdES-BES, altrimenti .xsi
            fileExtension = signatureFormat === 'cades' ? '.p7m' : '.xsi';
            fileName = generateSiaeFileName('mensile', previousMonth, progressivo, signatureFormat, systemCode);
            
            // Aggiorna trasmissione con firma e contenuto appropriato
            await siaeStorage.updateSiaeTransmission(transmission.id, {
              fileContent: signedXmlContent || xmlContent, // XML originale o XMLDSig firmato
              fileName: fileName.replace(fileExtension, ''),
              fileExtension,
              p7mContent: p7mBase64 || null, // Salva P7M Base64 per resend offline
              signatureFormat: signatureFormat,
              signedAt: new Date(),
            });
          } else {
            log(`Bridge non connesso, invio XML mensile non firmato`);
          }
        } catch (signError: any) {
          log(`ATTENZIONE: Firma digitale report mensile fallita, invio non firmato: ${signError.message}`);
        }

        // ==================== VALIDAZIONE COERENZA CODICE SISTEMA ====================
        // FIX 2026-01-15: Blocca invio se codice sistema XML != codice sistema nome file
        // NOTA: Valida sempre XML originale (stringa), non il payload firmato CAdES (Buffer binario)
        const systemCodeValidationMonthly = validateSystemCodeConsistency(xmlContent, systemCode);
        
        if (!systemCodeValidationMonthly.valid) {
          log(`ERRORE evento ${ticketedEvent.id}: ${systemCodeValidationMonthly.error}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: systemCodeValidationMonthly.error || 'Codice sistema non coerente',
          });
          continue; // Skip questo evento, procedi con il prossimo
        }
        log(`Evento ${ticketedEvent.id} - Coerenza codice sistema mensile verificata: XML=${systemCodeValidationMonthly.xmlSystemCode}, filename=${systemCodeValidationMonthly.filenameSystemCode}`);
        // ============================================================================

        // ==================== VALIDAZIONE PRE-TRASMISSIONE COMPLETA ====================
        // FIX 2026-01-15: Validazione centralizzata pre-trasmissione mensile (async per DTD validator)
        const preValidationMonthly = await validatePreTransmission(xmlContent, systemCode, 'mensile', previousMonth);
        if (!preValidationMonthly.canTransmit) {
          log(`ERRORE validazione pre-trasmissione mensile evento ${ticketedEvent.id}: ${preValidationMonthly.errors.map(e => e.message).join('; ')}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: preValidationMonthly.errors.map(e => `[${e.siaeErrorCode || 'UNKNOWN'}] ${e.message}`).join('; '),
          });
          continue;
        }
        log(`Evento ${ticketedEvent.id} - Validazione pre-trasmissione mensile OK`);
        // ============================================================================

        // Invio automatico email a SIAE con nuovo formato subject
        try {
          // FIX 2026-01-20: Passa explicitFileName per garantire coerenza tra nome file allegato e XML
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
            signatureFormat: signatureFormat || undefined,
            signWithSmime: true,
            requireSignature: true,
            explicitFileName: fileName, // FIX: Usa lo stesso nome file generato per l'XML
          });

          // Aggiorna status a 'sent'
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'sent',
            sentAt: new Date(),
          });
          
          // Aggiorna lastMonthlySentAt nelle impostazioni globali
          await db.update(siaeTransmissionSettings)
            .set({ lastMonthlySentAt: new Date() })
            .where(eq(siaeTransmissionSettings.id, 'global'));
          
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

/**
 * Job per invio automatico report RCA (Riepilogo Controllo Accessi) per eventi conclusi.
 * Genera e invia RCA per eventi terminati che hanno autoSendReports abilitato.
 * Viene eseguito 24 ore dopo la chiusura dell'evento.
 */
async function sendRCAReports() {
  try {
    log('Avvio job invio report RCA per eventi conclusi (24h dopo chiusura)...');
    
    const now = new Date();
    // Cerca eventi chiusi da almeno 24 ore (ma non più di 48 ore fa per evitare reprocessing)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    // Trova eventi chiusi da almeno 24 ore con ticketed events che hanno auto-invio
    // Escludi eventi internazionali e aziende in modalità international_only
    const ticketedEventsWithEvents = await db.select({
      ticketedEvent: siaeTicketedEvents,
      event: events,
      companyFeature: companyFeatures,
    })
    .from(siaeTicketedEvents)
    .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .leftJoin(companyFeatures, eq(events.companyId, companyFeatures.companyId))
    .where(and(
      eq(siaeTicketedEvents.autoSendReports, true),
      eq(events.status, 'closed'),
      // Evento terminato tra 48 e 24 ore fa (finestra per invio RCA)
      gte(events.endDatetime, fortyEightHoursAgo),
      lt(events.endDatetime, twentyFourHoursAgo),
      // Skip international events - SIAE non richiede report per eventi internazionali
      sql`${events.isInternational} IS NOT TRUE`,
      // Skip companies in international_only mode
      sql`COALESCE(${companyFeatures.operatingMode}, 'italy_only') != 'international_only'`
    ));
    
    if (ticketedEventsWithEvents.length === 0) {
      log('Nessun evento concluso con auto-invio RCA abilitato');
      return;
    }
    
    log(`Trovati ${ticketedEventsWithEvents.length} eventi conclusi per invio RCA`);
    
    for (const { ticketedEvent, event } of ticketedEventsWithEvents) {
      try {
        // Verifica se esiste già una trasmissione RCA per questo evento
        const existingRCA = await db.select()
          .from(siaeTransmissions)
          .where(and(
            eq(siaeTransmissions.ticketedEventId, ticketedEvent.id),
            eq(siaeTransmissions.transmissionType, 'rca')
          ))
          .limit(1);
        
        if (existingRCA.length > 0) {
          log(`Evento ${ticketedEvent.id} - RCA già inviato, skip`);
          continue;
        }
        
        // Recupera dati necessari per generazione RCA
        const company = await storage.getCompany(ticketedEvent.companyId);
        const sectors = await siaeStorage.getSiaeEventSectors(ticketedEvent.id);
        const allTickets = await siaeStorage.getSiaeTicketsByEvent(ticketedEvent.id);
        const location = event.locationId ? await storage.getLocation(event.locationId) : null;
        const siaeConfig = await siaeStorage.getSiaeSystemConfig(ticketedEvent.companyId);
        
        // Calcola progressivo
        const allTransmissions = await siaeStorage.getSiaeTransmissionsByCompany(ticketedEvent.companyId);
        const rcaTransmissionsForEvent = allTransmissions.filter(t => 
          t.transmissionType === 'rca' && t.ticketedEventId === ticketedEvent.id
        );
        const progressivo = rcaTransmissionsForEvent.length + 1;
        
        // Prepara i ticket nel formato richiesto (SiaeTicketForLog)
        const eventDate = event.endDatetime || new Date();
        const ticketsForLog = allTickets.map((t: any, idx: number) => ({
          id: t.id,
          status: t.status,
          fiscalSealCode: t.fiscalSealCode || null,
          progressiveNumber: t.progressiveNumber || idx + 1,
          cardCode: t.cardCode || null,
          emissionChannelCode: t.emissionChannelCode || 'WEB',
          emissionDate: t.createdAt || new Date(),
          ticketTypeCode: t.ticketTypeCode || 'I1',
          sectorCode: sectors.find((s: any) => s.id === t.sectorId)?.sectorCode || '01',
          grossAmount: Number(t.ticketPrice) || Number(t.grossAmount) || Number(t.priceAtPurchase) || 0,
          netAmount: Number(t.ticketPrice) || Number(t.netAmount) || 0,
          vatAmount: 0,
          prevendita: Number(t.prevendita) || 0,
          isComplimentary: t.isComplimentary || false,
          row: t.row || null,
          seatNumber: t.seatNumber || null,
          participantFirstName: t.participantFirstName || null,
          participantLastName: t.participantLastName || null,
          originalTicketId: t.originalTicketId || null,
          replacedByTicketId: t.replacedByTicketId || null,
          originalProgressiveNumber: t.originalProgressiveNumber || null,
          cancellationReasonCode: t.cancellationReasonCode || null,
          cancellationDate: t.cancellationDate || null,
          accessDateTime: t.scannedAt || null,
          codiceTitolo: normalizeSiaeTipoTitolo(t.ticketTypeCode, t.isComplimentary) || 'I1',
          codiceOrdine: normalizeSiaeCodiceOrdine(t.sectorCode) || 'P1',
        }));
        
        // Prepara evento per RCA
        const eventForLog = {
          id: ticketedEvent.id,
          name: event.name || 'Evento',
          date: eventDate,
          startTime: event.startDatetime ? formatSiaeTimeHHMM(new Date(event.startDatetime)) : '20:00',
          endTime: event.endDatetime ? formatSiaeTimeHHMM(new Date(event.endDatetime)) : '23:59',
          genreCode: ticketedEvent.genreCode || '61',
          taxType: ticketedEvent.taxType || 'I',
          organizerName: company?.name || 'Organizzatore',
          organizerTaxId: company?.fiscalCode || company?.taxId || '',
          venueCode: location?.siaeLocationCode || '001',
          venueName: location?.name || 'Locale',
          eventLocation: location?.name || 'Locale',
        };
        
        // Configurazione sistema
        const companyTaxId = company?.fiscalCode || company?.taxId || siaeConfig?.taxId || '';
        const companyBusinessName = company?.name || siaeConfig?.businessName || 'Azienda';
        
        // FIX 2026-01-17: Per RCA (S/MIME) usare SOLO codice dalla Smart Card!
        // Usando siaeConfig.systemCode con una Smart Card diversa causa errore SIAE 0600
        const cachedEfff = getCachedEfffData();
        const siaeConfigForResolve = { systemCode: siaeConfig?.systemCode || undefined };
        
        // Per RCA, usa resolveSystemCodeForSmime che richiede Smart Card
        const systemCodeResult = resolveSystemCodeForSmime(cachedEfff, siaeConfigForResolve);
        
        if (!systemCodeResult.success || !systemCodeResult.systemCode) {
          log(`BLOCCO TRASMISSIONE RCA: ${systemCodeResult.error}`);
          log(`La Smart Card deve essere connessa e contenere un codice sistema valido.`);
          log(`cachedEfff.systemId=${cachedEfff?.systemId || '(non disponibile)'}, siaeConfig.systemCode=${siaeConfig?.systemCode || '(non configurato)'}`);
          continue; // Salta questo evento - non inviare senza codice dalla Smart Card
        }
        
        const systemCode = systemCodeResult.systemCode;
        if (systemCodeResult.warning) {
          log(`ATTENZIONE RCA: ${systemCodeResult.warning}`);
        }
        log(`FIX 2026-01-17: Resolved systemCode=${systemCode} from ${systemCodeResult.source} for RCA report`);
        
        // FIX 2026-01-16: Valida codice sistema PRIMA della generazione XML
        // Il codice default EVENT4U1 NON è registrato presso SIAE e causa errore 0600
        const systemCodePreValidationRca = validateSiaeSystemCode(systemCode);
        if (!systemCodePreValidationRca.valid) {
          log(`BLOCCO TRASMISSIONE RCA: Codice sistema non valido - ${systemCodePreValidationRca.error}`);
          log(`Suggerimento: ${systemCodePreValidationRca.isDefault 
            ? 'Configurare il codice sistema SIAE in Impostazioni > SIAE > Configurazione Sistema' 
            : 'Verificare il formato del codice sistema'}`);
          continue; // Salta questo evento, non inviare con codice non valido
        }
        
        const rcaParams: RCAParams = {
          companyId: ticketedEvent.companyId,
          eventId: ticketedEvent.id,
          event: eventForLog,
          tickets: ticketsForLog,
          systemConfig: {
            systemCode: systemCode, // FIX: Usa systemCode pre-risolto
            taxId: siaeConfig?.taxId || companyTaxId,
            businessName: siaeConfig?.businessName || companyBusinessName,
          },
          companyName: companyBusinessName,
          taxId: companyTaxId,
          progressivo: progressivo,
          venueName: location?.name || 'Locale',
        };
        
        // TODO [CONSOLIDAMENTO XML]: Valutare uso di createSiaeTransmissionWithXml per unificare
        // la generazione XML e creazione trasmissione. Attualmente non fattibile perché il flusso
        // richiede passaggi intermedi non supportati dalla funzione centralizzata:
        // 1. Auto-correzione XML (autoCorrectSiaeXml) DOPO generazione ma PRIMA della trasmissione
        // 2. Validazione nome file (validateSiaeFileName) con logica di skip evento
        // 3. Firma digitale (requestXmlSignature) con UPDATE della trasmissione già creata
        // 4. Validazione coerenza codice sistema (validateSystemCodeConsistency) post-firma
        // Per consolidare servirebbe refactoring di createSiaeTransmissionWithXml con:
        // - Callback/hook per auto-correzione pre-salvataggio
        // - Gestione firma separata (la firma avviene DOPO salvataggio pending)
        // - Ritorno dell'oggetto transmission per update successivi
        // Genera XML RCA
        const rcaResult = generateRCAXml(rcaParams);
        
        if (!rcaResult.success) {
          log(`ERRORE generazione RCA per evento ${ticketedEvent.id}: ${rcaResult.errors.join('; ')}`);
          continue;
        }
        
        let xmlContent = rcaResult.xml;
        
        // AUTO-CORREZIONE PREVENTIVA: Correggi automaticamente errori comuni prima dell'invio
        const autoCorrectionRca = autoCorrectSiaeXml(xmlContent, eventForLog.genreCode);
        if (autoCorrectionRca.corrections.length > 0) {
          log(`AUTO-CORREZIONE: Applicate ${autoCorrectionRca.corrections.length} correzioni automatiche per RCA:`);
          for (const corr of autoCorrectionRca.corrections) {
            log(`  - ${corr.field}: ${corr.reason} (previene errore SIAE ${corr.siaeErrorPrevented})`);
          }
          xmlContent = autoCorrectionRca.correctedXml;
        }
        if (autoCorrectionRca.uncorrectableErrors.length > 0) {
          log(`ERRORI NON CORREGGIBILI: ${autoCorrectionRca.uncorrectableErrors.map(e => e.message).join('; ')}`);
        }
        
        // Nome file - usa lo stesso systemCode pre-risolto
        let fileName = generateSiaeFileName('rca', eventDate, progressivo, null, systemCode);
        
        // FIX 2026-01-19: Validazione formato nome file SIAE prima dell'invio
        const fileNameValidationRca = validateSiaeFileName(fileName);
        if (!fileNameValidationRca.valid) {
          log(`ERRORE FORMATO NOME FILE RCA: ${fileNameValidationRca.errors.join('; ')}`);
          continue; // Skip this event, don't send with invalid filename
        }
        
        let fileExtension = '.xsi';
        let signatureFormat: 'cades' | 'xmldsig' | null = null;
        
        // Calculate transmission statistics for RCA
        // FIX 2026-01-18: Usa ticketsForLog invece di eventTickets (variabile non definita)
        const rcaStats = await calculateTransmissionStats(
          ticketsForLog,
          ticketedEvent.companyId,
          ticketedEvent.id,
          (ticketedEvent as any).tipoTassazione,
          ticketedEvent.entertainmentIncidence
        );
        const rcaFileHash = calculateFileHash(xmlContent);
        
        // Crea trasmissione
        // FIX 2026-01-15: Salva systemCode per garantire coerenza nei reinvii (errori SIAE 0600/0603)
        const transmission = await siaeStorage.createSiaeTransmission({
          companyId: ticketedEvent.companyId,
          ticketedEventId: ticketedEvent.id,
          transmissionType: 'rca',
          periodDate: eventDate,
          scheduleType: 'auto',
          fileName: fileName.replace(fileExtension, ''),
          fileExtension,
          fileContent: xmlContent,
          status: 'pending',
          ticketsCount: rcaResult.ticketCount,
          ticketsCancelled: 0,
          totalAmount: ticketsForLog.reduce((sum, t) => sum + t.grossAmount, 0).toFixed(2),
          systemCode: systemCode, // FIX: Salva codice per reinvii futuri
          fileHash: rcaFileHash,
          totalIva: rcaStats.totalIva.toFixed(2),
          totalEsenti: rcaStats.totalEsenti.toFixed(2),
          totalImpostaIntrattenimento: rcaStats.totalImpostaIntrattenimento.toFixed(2),
          cfOrganizzatore: siaeConfig?.taxId || '',
          ticketsChanged: rcaStats.ticketsChanged,
          ticketsResold: rcaStats.ticketsResold,
        });
        
        log(`Evento ${ticketedEvent.id} (${event.name}) - Report RCA creato: ${fileName}`);
        
        // Tenta firma digitale
        let signatureInfo = '';
        let p7mBase64: string | undefined;
        let signedXmlContent: string | undefined;
        
        try {
          if (isBridgeConnected()) {
            log(`Bridge connesso, tentativo firma digitale RCA...`);
            const signatureResult = await requestXmlSignature(xmlContent);
            
            if (signatureResult.p7mBase64) {
              p7mBase64 = signatureResult.p7mBase64;
              signatureFormat = 'cades';
              signatureInfo = ` (firmato CAdES-BES ${signatureResult.algorithm || 'SHA-256'})`;
              log(`Firma RCA CAdES-BES creata alle ${signatureResult.signedAt}`);
            } else if (signatureResult.signedXml) {
              signedXmlContent = signatureResult.signedXml;
              signatureFormat = 'xmldsig';
              signatureInfo = ' (firmato XMLDSig - DEPRECATO)';
            }
            
            fileExtension = signatureFormat === 'cades' ? '.p7m' : '.xsi';
            fileName = generateSiaeFileName('rca', eventDate, progressivo, signatureFormat, systemCode);
            
            await siaeStorage.updateSiaeTransmission(transmission.id, {
              fileContent: signedXmlContent || xmlContent,
              fileName: fileName.replace(fileExtension, ''),
              fileExtension,
              p7mContent: p7mBase64 || null,
              signatureFormat: signatureFormat,
              signedAt: new Date(),
            });
          } else {
            log(`Bridge non connesso, invio RCA non firmato`);
          }
        } catch (signError: any) {
          log(`ATTENZIONE: Firma digitale RCA fallita, invio non firmato: ${signError.message}`);
        }
        
        // ==================== VALIDAZIONE COERENZA CODICE SISTEMA ====================
        // FIX 2026-01-15: Blocca invio se codice sistema XML != codice sistema nome file
        // NOTA: Valida sempre XML originale (stringa), non il payload firmato CAdES (Buffer binario)
        const systemCodeValidationRca = validateSystemCodeConsistency(xmlContent, systemCode);
        
        if (!systemCodeValidationRca.valid) {
          log(`ERRORE evento ${ticketedEvent.id}: ${systemCodeValidationRca.error}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: systemCodeValidationRca.error || 'Codice sistema non coerente',
          });
          continue; // Skip questo evento, procedi con il prossimo
        }
        log(`Evento ${ticketedEvent.id} - Coerenza codice sistema RCA verificata: XML=${systemCodeValidationRca.xmlSystemCode}, filename=${systemCodeValidationRca.filenameSystemCode}`);
        // ============================================================================

        // ==================== VALIDAZIONE PRE-TRASMISSIONE COMPLETA ====================
        // FIX 2026-01-15: Validazione centralizzata pre-trasmissione RCA (async per DTD validator)
        const preValidationRca = await validatePreTransmission(xmlContent, systemCode, 'rca', eventDate);
        if (!preValidationRca.canTransmit) {
          log(`ERRORE validazione pre-trasmissione RCA evento ${ticketedEvent.id}: ${preValidationRca.errors.map(e => e.message).join('; ')}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: preValidationRca.errors.map(e => `[${e.siaeErrorCode || 'UNKNOWN'}] ${e.message}`).join('; '),
          });
          continue;
        }
        log(`Evento ${ticketedEvent.id} - Validazione pre-trasmissione RCA OK`);
        // ============================================================================

        // Invio email
        try {
          // FIX 2026-01-20: Passa explicitFileName per garantire coerenza tra nome file allegato e XML
          await sendSiaeTransmissionEmail({
            to: SIAE_TEST_EMAIL,
            companyName: companyBusinessName,
            transmissionType: 'rca',
            periodDate: eventDate,
            ticketsCount: rcaResult.ticketCount,
            totalAmount: ticketsForLog.reduce((sum, t) => sum + t.grossAmount, 0).toFixed(2),
            xmlContent: signedXmlContent || xmlContent,
            transmissionId: transmission.id,
            systemCode: systemCode,
            sequenceNumber: progressivo,
            p7mBase64: p7mBase64,
            signatureFormat: signatureFormat || undefined,
            signWithSmime: true,
            requireSignature: true,
            explicitFileName: fileName, // FIX: Usa lo stesso nome file generato per l'XML
          });
          
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'sent',
            sentAt: new Date(),
          });
          
          log(`Evento ${ticketedEvent.id} - Email RCA inviata a ${SIAE_TEST_EMAIL}${signatureInfo}`);
        } catch (emailError: any) {
          log(`ERRORE invio email RCA per evento ${ticketedEvent.id}: ${emailError.message}`);
          await siaeStorage.updateSiaeTransmission(transmission.id, {
            status: 'error',
            errorMessage: emailError.message,
          });
        }
      } catch (eventError: any) {
        log(`ERRORE RCA per evento ${ticketedEvent.id}: ${eventError.message}`);
      }
    }
    
    log('Job invio report RCA completato');
  } catch (error: any) {
    log(`ERRORE job RCA: ${error.message}`);
  }
}

let dailyIntervalId: NodeJS.Timeout | null = null;
let monthlyIntervalId: NodeJS.Timeout | null = null;
let eventCloseIntervalId: NodeJS.Timeout | null = null;
let resaleExpirationIntervalId: NodeJS.Timeout | null = null;
let rcaIntervalId: NodeJS.Timeout | null = null;

/**
 * Chiude automaticamente gli eventi la cui data/ora di fine è passata.
 * Cambia lo status da "ongoing" a "closed" quando end_datetime < NOW()
 */
async function autoCloseExpiredEvents() {
  try {
    const now = new Date();
    
    // Trova eventi con status 'ongoing' o 'scheduled' che sono già terminati
    const expiredEvents = await db.select()
      .from(events)
      .where(and(
        sql`${events.status} IN ('ongoing', 'scheduled')`,
        lt(events.endDatetime, now)
      ));
    
    if (expiredEvents.length === 0) {
      return; // Nessun evento da chiudere
    }
    
    log(`Trovati ${expiredEvents.length} eventi terminati da chiudere automaticamente`);
    
    for (const event of expiredEvents) {
      try {
        await db.update(events)
          .set({ 
            status: 'closed',
            updatedAt: now
          })
          .where(eq(events.id, event.id));
        
        log(`Evento "${event.name}" (ID: ${event.id}) chiuso automaticamente - fine: ${event.endDatetime}`);
      } catch (updateError: any) {
        log(`ERRORE chiusura evento ${event.id}: ${updateError.message}`);
      }
    }
    
    log(`Chiusura automatica completata: ${expiredEvents.length} eventi aggiornati`);
  } catch (error: any) {
    log(`ERRORE job chiusura eventi: ${error.message}`);
  }
}

/**
 * Rilascia le riservazioni scadute (reservedUntil < now).
 * Rimette il biglietto in vendita se l'utente non ha completato il checkout.
 */
async function releaseExpiredReservations() {
  try {
    const now = new Date();
    
    const result = await db.update(siaeResales)
      .set({
        status: 'listed',
        buyerId: null,
        reservedAt: null,
        reservedUntil: null,
        stripeCheckoutSessionId: null,
        updatedAt: now,
      })
      .where(and(
        eq(siaeResales.status, 'reserved'),
        lt(siaeResales.reservedUntil, now)
      ))
      .returning();
    
    if (result.length > 0) {
      log(`Rilasciate ${result.length} riservazioni scadute - biglietti tornati in vendita`);
    }
  } catch (error: any) {
    log(`ERRORE rilascio riservazioni scadute: ${error.message}`);
  }
}

/**
 * Scade automaticamente i biglietti in rivendita 1 ora prima dell'inizio evento.
 * Cambia lo status da "listed" a "expired" per proteggere venditore e acquirente.
 */
async function autoExpireResales() {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Trova resales con status 'listed' i cui eventi iniziano in meno di 1 ora
    // Join: siaeResales -> siaeTickets -> siaeTicketedEvents -> events
    const expiringResales = await db.select({
      resaleId: siaeResales.id,
      eventName: events.name,
      eventStart: events.startDatetime,
    })
    .from(siaeResales)
    .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
    .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
    .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .where(and(
      eq(siaeResales.status, 'listed'),
      lte(events.startDatetime, oneHourFromNow)
    ));
    
    if (expiringResales.length === 0) {
      return; // Nessun resale da scadere
    }
    
    log(`Trovati ${expiringResales.length} biglietti in rivendita da far scadere (evento inizia in meno di 1 ora)`);
    
    for (const resale of expiringResales) {
      try {
        await db.update(siaeResales)
          .set({ 
            status: 'expired',
            expiresAt: now,
            updatedAt: now
          })
          .where(eq(siaeResales.id, resale.resaleId));
        
        log(`Rivendita ${resale.resaleId} scaduta - evento "${resale.eventName}" inizia alle ${resale.eventStart}`);
      } catch (updateError: any) {
        log(`ERRORE scadenza rivendita ${resale.resaleId}: ${updateError.message}`);
      }
    }
    
    log(`Scadenza automatica rivendite completata: ${expiringResales.length} biglietti rimossi dal marketplace`);
  } catch (error: any) {
    log(`ERRORE job scadenza rivendite: ${error.message}`);
  }
}

// Job per controllare automaticamente le risposte SIAE via email
let responseCheckIntervalId: NodeJS.Timeout | null = null;

async function checkSiaeEmailResponses() {
  try {
    log('Controllo automatico risposte SIAE via email...');
    
    // Trova tutte le company con trasmissioni inviate ma senza risposta
    const pendingTransmissions = await db.select({
      companyId: siaeTransmissions.companyId
    })
    .from(siaeTransmissions)
    .where(and(
      eq(siaeTransmissions.status, 'sent'),
      isNull(siaeTransmissions.receivedAt)
    ))
    .groupBy(siaeTransmissions.companyId);
    
    if (pendingTransmissions.length === 0) {
      log('Nessuna trasmissione in attesa di risposta');
      return;
    }
    
    log(`Trovate trasmissioni pendenti per ${pendingTransmissions.length} aziende`);
    
    for (const { companyId } of pendingTransmissions) {
      if (!companyId) continue;
      
      try {
        const responses = await checkForSiaeResponses(companyId);
        
        for (const response of responses) {
          // Trova la trasmissione corrispondente basandosi sul subject/nome file
          const transmissions = await db.select()
            .from(siaeTransmissions)
            .where(and(
              eq(siaeTransmissions.companyId, companyId),
              eq(siaeTransmissions.status, 'sent'),
              isNull(siaeTransmissions.receivedAt)
            ))
            .orderBy(desc(siaeTransmissions.sentAt))
            .limit(10);
          
          // Match trasmissione con risposta (per subject email o attachment filename)
          for (const transmission of transmissions) {
            if (!transmission.fileName) continue;
            
            // Verifica se il subject della risposta contiene riferimenti alla trasmissione
            const fileBaseName = transmission.fileName.replace(/\.(xml|p7m|xsi)$/i, '');
            
            // Check subject, body, and attachment filenames for match
            let matched = response.subject?.includes(fileBaseName) || 
                response.body?.includes(fileBaseName) ||
                response.body?.includes(transmission.id);
            
            // Also check attachment filenames (format: RPG_2026_01_21_003.xsi_2026_01_22_...)
            if (!matched && response.attachments) {
              for (const att of response.attachments) {
                if (att.filename?.startsWith(fileBaseName)) {
                  matched = true;
                  // Use attachment's parsed data if available
                  if (att.parsed) {
                    response.status = att.parsed.code === '0000' ? 'accepted' : 'rejected';
                    response.errorCode = att.parsed.code || undefined;
                    response.errorMessage = att.parsed.description || response.errorMessage;
                    response.protocolNumber = att.parsed.protocolNumber || response.protocolNumber;
                  }
                  break;
                }
              }
            }
            
            if (matched) {
              const newStatus = response.status === 'accepted' ? 'received' : 'error';
              
              await db.update(siaeTransmissions)
                .set({
                  status: newStatus,
                  receivedAt: new Date(),
                  receiptProtocol: response.protocolNumber || null,
                  receiptContent: response.body?.substring(0, 1000) || null,
                  errorCode: response.errorCode || null,
                  errorMessage: response.errorMessage || null,
                  responseEmailId: response.messageId,
                  updatedAt: new Date()
                })
                .where(eq(siaeTransmissions.id, transmission.id));
              
              log(`Risposta SIAE processata per trasmissione ${transmission.id}: ${newStatus} (code: ${response.errorCode})`);
              break;
            }
          }
        }
      } catch (companyError: any) {
        log(`Errore controllo risposte per company ${companyId}: ${companyError.message}`);
      }
    }
    
    log('Controllo risposte SIAE completato');
  } catch (error: any) {
    log(`ERRORE job controllo risposte SIAE: ${error.message}`);
  }
}

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
  if (eventCloseIntervalId) clearInterval(eventCloseIntervalId);
  if (resaleExpirationIntervalId) clearInterval(resaleExpirationIntervalId);
  if (rcaIntervalId) clearInterval(rcaIntervalId);
  if (responseCheckIntervalId) clearInterval(responseCheckIntervalId);

  dailyIntervalId = setInterval(checkAndRunDailyJob, 60 * 1000);
  monthlyIntervalId = setInterval(checkAndRunMonthlyJob, 60 * 1000);
  
  // Job per chiudere automaticamente gli eventi terminati - ogni 5 minuti
  eventCloseIntervalId = setInterval(autoCloseExpiredEvents, 5 * 60 * 1000);
  
  // Job per scadenza automatica rivendite 1h prima evento - ogni 5 minuti
  resaleExpirationIntervalId = setInterval(autoExpireResales, 5 * 60 * 1000);
  
  // Job per rilascio riservazioni scadute - ogni minuto
  setInterval(releaseExpiredReservations, 60 * 1000);
  
  // Job per invio automatico RCA 24 ore dopo chiusura eventi - ogni ora
  rcaIntervalId = setInterval(sendRCAReports, 60 * 60 * 1000);
  
  // Job per controllo automatico risposte SIAE via email - ogni 15 minuti
  responseCheckIntervalId = setInterval(checkSiaeEmailResponses, 15 * 60 * 1000);
  
  // Esegui subito al primo avvio per chiudere eventi già scaduti e scadere rivendite
  autoCloseExpiredEvents();
  autoExpireResales();
  releaseExpiredReservations();
  
  // Controlla le risposte SIAE all'avvio (dopo 1 minuto per dare tempo al sistema di avviarsi)
  setTimeout(checkSiaeEmailResponses, 60 * 1000);

  log('Scheduler SIAE inizializzato:');
  log('  - Job RMG giornaliero: ogni notte alle 02:00');
  log('  - Job RPM mensile: primo giorno del mese alle 03:00');
  log('  - Job RCA evento: ogni ora (24h dopo chiusura evento)');
  log('  - Job chiusura eventi: ogni 5 minuti');
  log('  - Job scadenza rivendite: ogni 5 minuti (1h prima evento)');
  log('  - Job rilascio riservazioni: ogni minuto');
  log('  - Job controllo risposte SIAE: ogni 15 minuti');
  log(`  - System Code Default: ${SIAE_SYSTEM_CODE_DEFAULT} (usa resolveSystemCode per coerenza)`);
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
  if (eventCloseIntervalId) {
    clearInterval(eventCloseIntervalId);
    eventCloseIntervalId = null;
  }
  if (resaleExpirationIntervalId) {
    clearInterval(resaleExpirationIntervalId);
    resaleExpirationIntervalId = null;
  }
  if (rcaIntervalId) {
    clearInterval(rcaIntervalId);
    rcaIntervalId = null;
  }
  if (responseCheckIntervalId) {
    clearInterval(responseCheckIntervalId);
    responseCheckIntervalId = null;
  }
  log('Scheduler SIAE fermato');
}

export { sendDailyReports, sendMonthlyReports, sendRCAReports };
