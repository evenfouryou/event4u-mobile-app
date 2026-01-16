import { db } from "./db";
import { siaeTicketedEvents, siaeTransmissions, siaeTransmissionSettings, events, companies, siaeEventSectors, siaeTickets, siaeResales } from "@shared/schema";
import { eq, and, sql, gte, lt, desc, lte } from "drizzle-orm";
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";
import type { SiaeTransmissionSettings } from "@shared/schema";
import { sendSiaeTransmissionEmail } from "./email-service";
import { isBridgeConnected, requestXmlSignature, getCachedEfffData } from "./bridge-relay";
import { escapeXml, formatSiaeDateCompact, formatSiaeTimeCompact, formatSiaeTimeHHMM, generateSiaeFileName, generateSiaeSubject, mapToSiaeTipoGenere, generateRCAXml, normalizeSiaeTipoTitolo, normalizeSiaeCodiceOrdine, validateSystemCodeConsistency, validatePreTransmission, resolveSystemCode, autoCorrectSiaeXml, SIAE_SYSTEM_CODE_DEFAULT, type RCAParams } from './siae-utils';
import { calculateTransmissionStats, calculateFileHash } from './siae-routes';

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
    return generateC1StyleXml(reportData, effectiveReportType, systemCode, taxId, businessName, now, progressivo, nomeFile);
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

/**
 * Genera XML in formato RiepilogoGiornaliero (RMG) o RiepilogoMensile (RPM)
 * Conforme a DTD SIAE Allegato B - Provvedimento 04/03/2008
 * FIX 2026-01-16: Estratto per supportare formati RMG/RPM distinti da RCA
 */
function generateC1StyleXml(
  reportData: any,
  xmlReportType: 'giornaliero' | 'mensile',
  systemCode: string,
  taxId: string,
  businessName: string,
  now: Date,
  progressivo: number,
  nomeFile: string | null
): string {
  const { 
    ticketedEvent, 
    eventRecord, 
    sectors, 
    reportDate, 
    activeTicketsCount,
    cancelledTicketsCount,
    totalRevenue, 
    filteredTickets,
    subscriptions = []
  } = reportData;
  
  const isMonthly = xmlReportType === 'mensile';
  const rootElement = isMonthly ? 'RiepilogoMensile' : 'RiepilogoGiornaliero';
  
  const dataGenerazione = formatSiaeDateCompact(now);
  const oraGenerazione = formatSiaeTimeCompact(now);
  
  let periodAttrName: string;
  let periodAttrValue: string;
  
  if (isMonthly) {
    periodAttrName = 'Mese';
    periodAttrValue = `${reportDate.getFullYear()}${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
  } else {
    periodAttrName = 'Data';
    periodAttrValue = formatSiaeDateCompact(reportDate);
  }
  
  const sostituzione = progressivo > 1 ? 'S' : 'N';
  // FIX 2026-01-16: Rimosso attributo NomeFile - NON è nel DTD ufficiale SIAE v0039
  // Gli attributi validi sono solo: Sostituzione, Data, DataGenerazione, OraGenerazione, ProgressivoGenerazione
  
  const eventDateTime = eventRecord?.startDatetime ? new Date(eventRecord.startDatetime) : reportDate;
  const dataEvento = formatSiaeDateCompact(eventDateTime);
  const oraEvento = formatSiaeTimeHHMM(eventDateTime);
  
  const tipoGenere = mapGenreToSiae(ticketedEvent.genreCode);
  const tipoTassazione = ticketedEvent.taxType || 'S';
  const incidenza = tipoTassazione === 'I' ? (ticketedEvent.entertainmentIncidence ?? 100) : 0;
  const codiceLocale = (ticketedEvent.siaeLocationCode || '').padStart(13, '0').substring(0, 13);
  const venueName = ticketedEvent.eventLocation || eventRecord?.locationId || 'Locale';
  const eventName = eventRecord?.name || ticketedEvent.eventTitle || 'Evento';
  
  let capienzaTotale = 0;
  if (sectors && sectors.length > 0) {
    capienzaTotale = sectors.reduce((sum: number, s: any) => sum + (s.capacity || 0), 0);
  } else {
    capienzaTotale = ticketedEvent.capacity || 100;
  }
  
  let sectorsXml = '';
  
  if (sectors && sectors.length > 0) {
    for (const sector of sectors) {
      const sectorTickets = filteredTickets.filter((t: any) => t.sectorId === sector.id);
      const validTickets = sectorTickets.filter((t: any) => 
        t.status !== 'annullato' && t.status !== 'annullato_rivendita'
      );
      
      if (validTickets.length === 0) continue;
      
      const codiceOrdine = normalizeSiaeCodiceOrdine(sector.sectorCode || sector.orderCode);
      const sectorCapacity = sector.capacity || 100;
      
      const corrispettivoLordo = Math.round(validTickets.reduce((sum: number, t: any) => {
        return sum + (Number(t.ticketPrice) || Number(t.grossAmount) || 0);
      }, 0) * 100);
      const ivaCorrispettivo = Math.round(corrispettivoLordo * 0.10);
      
      const tipoTitolo = normalizeSiaeTipoTitolo(validTickets[0]?.ticketTypeCode, validTickets[0]?.isComplimentary);
      
      const titoliAccessoXml = `
                <TitoliAccesso>
                    <TipoTitolo>${escapeXml(tipoTitolo)}</TipoTitolo>
                    <Quantita>${validTickets.length}</Quantita>
                    <CorrispettivoLordo>${corrispettivoLordo}</CorrispettivoLordo>
                    <Prevendita>0</Prevendita>
                    <IVACorrispettivo>${ivaCorrispettivo}</IVACorrispettivo>
                    <IVAPrevendita>0</IVAPrevendita>
                    <ImportoPrestazione>0</ImportoPrestazione>
                </TitoliAccesso>`;
      
      if (isMonthly) {
        sectorsXml += `
            <OrdineDiPosto>
                <CodiceOrdine>${escapeXml(codiceOrdine)}</CodiceOrdine>
                <Capienza>${sectorCapacity}</Capienza>
                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>${titoliAccessoXml}
            </OrdineDiPosto>`;
      } else {
        sectorsXml += `
            <OrdineDiPosto>
                <CodiceOrdine>${escapeXml(codiceOrdine)}</CodiceOrdine>
                <Capienza>${sectorCapacity}</Capienza>${titoliAccessoXml}
            </OrdineDiPosto>`;
      }
    }
  }
  
  if (sectorsXml === '') {
    const validTickets = filteredTickets.filter((t: any) => 
      t.status !== 'annullato' && t.status !== 'annullato_rivendita'
    );
    const corrispettivoLordo = Math.round(validTickets.reduce((sum: number, t: any) => {
      return sum + (Number(t.ticketPrice) || Number(t.grossAmount) || 0);
    }, 0) * 100);
    const ivaCorrispettivo = Math.round(corrispettivoLordo * 0.10);
    const tipoTitolo = normalizeSiaeTipoTitolo(validTickets[0]?.ticketTypeCode, validTickets[0]?.isComplimentary);
    
    const titoliAccessoXml = validTickets.length > 0 ? `
                <TitoliAccesso>
                    <TipoTitolo>${escapeXml(tipoTitolo)}</TipoTitolo>
                    <Quantita>${validTickets.length}</Quantita>
                    <CorrispettivoLordo>${corrispettivoLordo}</CorrispettivoLordo>
                    <Prevendita>0</Prevendita>
                    <IVACorrispettivo>${ivaCorrispettivo}</IVACorrispettivo>
                    <IVAPrevendita>0</IVAPrevendita>
                    <ImportoPrestazione>0</ImportoPrestazione>
                </TitoliAccesso>` : '';
    
    if (isMonthly) {
      sectorsXml = `
            <OrdineDiPosto>
                <CodiceOrdine>${normalizeSiaeCodiceOrdine(null)}</CodiceOrdine>
                <Capienza>${capienzaTotale}</Capienza>
                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>${titoliAccessoXml}
            </OrdineDiPosto>`;
    } else {
      sectorsXml = `
            <OrdineDiPosto>
                <CodiceOrdine>${normalizeSiaeCodiceOrdine(null)}</CodiceOrdine>
                <Capienza>${capienzaTotale}</Capienza>${titoliAccessoXml}
            </OrdineDiPosto>`;
    }
  }
  
  let intrattenimentoXml: string;
  if (isMonthly) {
    intrattenimentoXml = `
            <Intrattenimento>
                <TipoTassazione valore="${escapeXml(tipoTassazione)}"/>
                <Incidenza>${incidenza}</Incidenza>
                <ImponibileIntrattenimenti>0</ImponibileIntrattenimenti>
            </Intrattenimento>`;
  } else {
    if (tipoTassazione === 'I' && incidenza > 0) {
      intrattenimentoXml = `
            <Intrattenimento>
                <TipoTassazione valore="${escapeXml(tipoTassazione)}"/>
                <Incidenza>${incidenza}</Incidenza>
            </Intrattenimento>`;
    } else {
      intrattenimentoXml = `
            <Intrattenimento>
                <TipoTassazione valore="${escapeXml(tipoTassazione)}"/>
            </Intrattenimento>`;
    }
  }
  
  const eventsXml = `
        <Evento>${intrattenimentoXml}
            <Locale>
                <Denominazione>${escapeXml(venueName)}</Denominazione>
                <CodiceLocale>${escapeXml(codiceLocale)}</CodiceLocale>
            </Locale>
            <DataEvento>${dataEvento}</DataEvento>
            <OraEvento>${oraEvento}</OraEvento>
            <MultiGenere>
                <TipoGenere>${escapeXml(tipoGenere)}</TipoGenere>
                <IncidenzaGenere>0</IncidenzaGenere>
                <TitoliOpere>
                    <Titolo>${escapeXml(eventName)}</Titolo>
                </TitoliOpere>
            </MultiGenere>${sectorsXml}
        </Evento>`;
  
  let abbonamentiXml = '';
  if (subscriptions && subscriptions.length > 0) {
    for (const sub of subscriptions) {
      const subCode = sub.subscriptionCode || 'ABB001';
      const validTo = new Date(sub.validTo || new Date());
      const validitaStr = formatSiaeDateCompact(validTo);
      const subTipoTassazione = sub.taxType || 'S';
      const turno = sub.turnType || 'F';
      const codiceOrdine = normalizeSiaeCodiceOrdine(sub.sectorCode);
      const subTipoTitolo = normalizeSiaeTipoTitolo(sub.ticketTypeCode, sub.isComplimentary);
      const emessiQuantita = sub.status === 'active' ? 1 : 0;
      const emessiCorrispettivo = Math.round((Number(sub.totalAmount) || 0) * 100);
      const emessiIva = Math.round((Number(sub.rateoVat) || 0) * 100);
      const annullatiQuantita = sub.status === 'cancelled' ? 1 : 0;
      
      abbonamentiXml += `
        <Abbonamenti>
            <CodiceAbbonamento>${escapeXml(subCode)}</CodiceAbbonamento>
            <Validita>${validitaStr}</Validita>
            <TipoTassazione valore="${subTipoTassazione}"/>
            <Turno valore="${turno}"/>
            <CodiceOrdine>${codiceOrdine}</CodiceOrdine>
            <TipoTitolo>${subTipoTitolo}</TipoTitolo>
            <QuantitaEventiAbilitati>${sub.eventsCount || 1}</QuantitaEventiAbilitati>
            <AbbonamentiEmessi>
                <Quantita>${emessiQuantita}</Quantita>
                <CorrispettivoLordo>${emessiCorrispettivo}</CorrispettivoLordo>
                <Prevendita>0</Prevendita>
                <IVACorrispettivo>${emessiIva}</IVACorrispettivo>
                <IVAPrevendita>0</IVAPrevendita>
            </AbbonamentiEmessi>
            <AbbonamentiAnnullati>
                <Quantita>${annullatiQuantita}</Quantita>
                <CorrispettivoLordo>0</CorrispettivoLordo>
                <Prevendita>0</Prevendita>
                <IVACorrispettivo>0</IVACorrispettivo>
                <IVAPrevendita>0</IVAPrevendita>
            </AbbonamentiAnnullati>
        </Abbonamenti>`;
    }
  }
  
  const organizerType = 'G';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<${rootElement} Sostituzione="${sostituzione}" ${periodAttrName}="${periodAttrValue}" DataGenerazione="${dataGenerazione}" OraGenerazione="${oraGenerazione}" ProgressivoGenerazione="${progressivo}">
    <Titolare>
        <Denominazione>${escapeXml(businessName)}</Denominazione>
        <CodiceFiscale>${escapeXml(taxId)}</CodiceFiscale>
        <SistemaEmissione>${escapeXml(systemCode)}</SistemaEmissione>
    </Titolare>
    <Organizzatore>
        <Denominazione>${escapeXml(businessName)}</Denominazione>
        <CodiceFiscale>${escapeXml(taxId)}</CodiceFiscale>
        <TipoOrganizzatore valore="${organizerType}"/>${eventsXml}${abbonamentiXml}
    </Organizzatore>
</${rootElement}>`;
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
        
        // FIX 2026-01-15: Carica siaeConfig per ottenere il systemCode corretto
        // ticketedEvent NON ha systemCode - è nella tabella siaeSystemConfig
        const siaeConfigDaily = await siaeStorage.getSiaeSystemConfig(ticketedEvent.companyId);
        
        // FIX 2026-01-15: Risolvi systemCode UNA VOLTA e passa a generateXMLContent
        // Questo garantisce coerenza tra XML e nome file (errori SIAE 0600/0603)
        const siaeConfigForResolve = { systemCode: siaeConfigDaily?.systemCode || undefined };
        const systemCode = resolveSystemCode(cachedEfff, siaeConfigForResolve);
        log(`FIX 2026-01-15: Resolved systemCode=${systemCode} for daily report (cachedEfff.systemId=${cachedEfff?.systemId}, siaeConfig.systemCode=${siaeConfigDaily?.systemCode})`);
        
        // RMG = Riepilogo Giornaliero: genera nome file PRIMA di generateXMLContent per coerenza
        let fileName = generateSiaeFileName('giornaliero', yesterday, progressivo, null, systemCode);
        
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
        let fileExtension = '.xsi'; // Default per non firmato
        let signatureFormat: 'cades' | 'xmldsig' | null = null;

        // Calculate transmission statistics
        const dailyStats = await calculateTransmissionStats(
          reportData.filteredTickets || [],
          ticketedEvent.companyId,
          ticketedEvent.id,
          ticketedEvent.tipoTassazione,
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
        // FIX 2026-01-15: Validazione centralizzata pre-trasmissione
        const preValidation = validatePreTransmission(xmlContent, systemCode, 'giornaliero', yesterday);
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
        
        // FIX 2026-01-15: Carica siaeConfig per ottenere il systemCode corretto
        // ticketedEvent NON ha systemCode - è nella tabella siaeSystemConfig
        const siaeConfigMonthly = await siaeStorage.getSiaeSystemConfig(ticketedEvent.companyId);
        
        // FIX 2026-01-15: Risolvi systemCode UNA VOLTA e passa a generateXMLContent
        // Questo garantisce coerenza tra XML e nome file (errori SIAE 0600/0603)
        const siaeConfigForResolve = { systemCode: siaeConfigMonthly?.systemCode || undefined };
        const systemCode = resolveSystemCode(cachedEfff, siaeConfigForResolve);
        log(`FIX 2026-01-15: Resolved systemCode=${systemCode} for monthly report (cachedEfff.systemId=${cachedEfff?.systemId}, siaeConfig.systemCode=${siaeConfigMonthly?.systemCode})`);
        
        // RPM = Riepilogo Mensile: genera nome file PRIMA di generateXMLContent per coerenza
        let fileName = generateSiaeFileName('mensile', previousMonth, progressivo, null, systemCode);
        
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
        let fileExtension = '.xsi'; // Default per non firmato
        let signatureFormat: 'cades' | 'xmldsig' | null = null;

        // Calculate transmission statistics
        const monthlyStats = await calculateTransmissionStats(
          reportData.filteredTickets || [],
          ticketedEvent.companyId,
          ticketedEvent.id,
          ticketedEvent.tipoTassazione,
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
        // FIX 2026-01-15: Validazione centralizzata pre-trasmissione mensile
        const preValidationMonthly = validatePreTransmission(xmlContent, systemCode, 'mensile', previousMonth);
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
    const ticketedEventsWithEvents = await db.select({
      ticketedEvent: siaeTicketedEvents,
      event: events,
    })
    .from(siaeTicketedEvents)
    .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .where(and(
      eq(siaeTicketedEvents.autoSendReports, true),
      eq(events.status, 'closed'),
      // Evento terminato tra 48 e 24 ore fa (finestra per invio RCA)
      gte(events.endDatetime, fortyEightHoursAgo),
      lt(events.endDatetime, twentyFourHoursAgo)
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
        
        // FIX 2026-01-15: Risolvi systemCode UNA VOLTA per coerenza XML/nome file (errori SIAE 0600/0603)
        const cachedEfff = getCachedEfffData();
        // FIX: Converti null a undefined per compatibilità con resolveSystemCode
        const siaeConfigForResolve = { systemCode: siaeConfig?.systemCode || undefined };
        const systemCode = resolveSystemCode(cachedEfff, siaeConfigForResolve);
        log(`FIX 2026-01-15: Resolved systemCode=${systemCode} for RCA report (cachedEfff.systemId=${cachedEfff?.systemId}, siaeConfig.systemCode=${siaeConfig?.systemCode})`);
        
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
        let fileExtension = '.xsi';
        let signatureFormat: 'cades' | 'xmldsig' | null = null;
        
        // Calculate transmission statistics for RCA
        const rcaStats = await calculateTransmissionStats(
          eventTickets,
          ticketedEvent.companyId,
          ticketedEvent.id,
          ticketedEvent.tipoTassazione,
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
        // FIX 2026-01-15: Validazione centralizzata pre-trasmissione RCA
        const preValidationRca = validatePreTransmission(xmlContent, systemCode, 'rca', eventDate);
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
  
  // Esegui subito al primo avvio per chiudere eventi già scaduti e scadere rivendite
  autoCloseExpiredEvents();
  autoExpireResales();
  releaseExpiredReservations();

  log('Scheduler SIAE inizializzato:');
  log('  - Job RMG giornaliero: ogni notte alle 02:00');
  log('  - Job RPM mensile: primo giorno del mese alle 03:00');
  log('  - Job RCA evento: ogni ora (24h dopo chiusura evento)');
  log('  - Job chiusura eventi: ogni 5 minuti');
  log('  - Job scadenza rivendite: ogni 5 minuti (1h prima evento)');
  log('  - Job rilascio riservazioni: ogni minuto');
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
  log('Scheduler SIAE fermato');
}

export { sendDailyReports, sendMonthlyReports, sendRCAReports };
