/**
 * @deprecated MODULO OBSOLETO - NON USARE!
 * 
 * ============================================================
 * DEPRECATION NOTICE - 2026-01-20
 * ============================================================
 * 
 * Questo modulo contiene funzioni OBSOLETE che NON sono conformi
 * alle specifiche SIAE Allegato C e DTD ufficiali.
 * 
 * USARE INVECE:
 * - server/siae-utils.ts: generateRCAXml(), generateC1Xml(), generateC1LogXml()
 * - server/siae-filename.ts: generateSiaeFileName(), generateSiaeEmailSubject()
 * - server/email-service.ts: sendSiaeTransmissionEmail()
 * 
 * PROBLEMI DI QUESTO MODULO:
 * - generateRMGXml/generateRPMXml usano strutture XML errate
 * - RPM usa "Periodo" invece di "Mese" (errore DTD)
 * - Formato nome file non conforme ad Allegato C sezione 1.4.1
 * - Mancano validazioni codice sistema
 * 
 * Mantenuto solo per compatibilità legacy. Sarà rimosso in futuro.
 * ============================================================
 */

import { isBridgeConnected, requestSmimeSignature, getCardSignerEmail } from './bridge-relay';
import nodemailer from 'nodemailer';

// ============================================================
// TYPES
// ============================================================

export type SiaeReportType = 'giornaliero' | 'mensile' | 'rca';

export interface SiaeTitolare {
  denominazione: string;
  codiceFiscale: string;
  sistemaEmissione: string;  // 8 caratteri esatti
}

export interface SiaeOrganizzatore {
  denominazione: string;
  codiceFiscale: string;
  tipoOrganizzatore: 'G' | 'T';  // G=Gestore, T=Terzo
}

export interface SiaeEvento {
  codice: string;
  data: string;           // YYYYMMDD
  ora: string;            // HHMM
  genere: string;
  denominazione: string;
  localita: string;
  provincia: string;
  luogo: string;
  capienza?: number;
}

// Interfacce per RPM/RPG DTD v0039 compliant
export interface SiaeIntrattenimento {
  tipoTassazione: 'S' | 'I';  // S=Spettacolo, I=Intrattenimento
  incidenza?: number;         // 0-100%
}

export interface SiaeLocale {
  denominazione: string;
  codiceLocale: string;       // 13 cifre
}

export interface SiaeMultiGenere {
  tipoGenere: string;         // Codice genere SIAE
  incidenzaGenere: number;    // 0-100%
  titoliOpere: string[];      // Titoli opere
}

export interface SiaeTitoloAccesso {
  tipoTitolo: string;         // R1, R2, etc.
  quantita: number;
  corrispettivoLordo: number; // In centesimi
  prevendita?: number;
  ivaCorrispettivo: number;
  ivaPrevendita?: number;
  importoPrestazione?: number;
}

export interface SiaeOrdineDiPosto {
  codiceOrdine: string;       // UN, PL, etc.
  capienza: number;
  titoliAccesso?: SiaeTitoloAccesso[];
}

export interface SiaeEventoRPM {
  intrattenimento?: SiaeIntrattenimento;
  locale?: SiaeLocale;
  dataEvento: string;         // YYYYMMDD
  oraEvento: string;          // HHMM
  multiGenere?: SiaeMultiGenere[];
  ordineDiPosto?: SiaeOrdineDiPosto[];
}

export interface SiaeBiglietto {
  tipo: string;
  ordine: string;
  prezzo: number;         // In centesimi
  quantitaEmessi: number;
  quantitaAnnullati: number;
}

export interface SiaeSettore {
  codice: string;
  tipoPosto: string;
  capienza: number;
  biglietti: SiaeBiglietto[];
}

export interface SiaeReportData {
  titolare: SiaeTitolare;
  organizzatore: SiaeOrganizzatore;
  evento?: SiaeEvento | SiaeEventoRPM;  // SiaeEvento per RCA, SiaeEventoRPM per RPM/RPG
  settori?: SiaeSettore[];
  sostituzione: boolean;
  dataReport: Date;
  progressivo: number;
}

export interface SiaeTransmissionParams {
  reportType: SiaeReportType;
  data: SiaeReportData;
  destinatario: string;       // Email SIAE
  testMode?: boolean;
}

export interface SiaeTransmissionResult {
  success: boolean;
  fileName: string;
  subject: string;
  xmlContent: string;
  smimeSigned: boolean;
  error?: string;
  messageId?: string;
}

// ============================================================
// FILENAME GENERATION - Allegato C Section 1.4.1
// ============================================================

/**
 * Genera nome file SIAE conforme Allegato C
 * 
 * FORMATI:
 * - RPG_YYYYMMDD_NNN.xsi (giornaliero) - RPG = RiepilogoGiornaliero
 * - RPM_YYYYMM_NNN.xsi (mensile) - RPM = RiepilogoMensile
 * - RCA_YYYYMMDD_NNN.xsi (evento) - RCA = RiepilogoControlloAccessi
 * 
 * NESSUN TIMESTAMP - MAI!
 */
export function generateFileName(
  reportType: SiaeReportType,
  date: Date,
  systemCode: string,
  progressivo: number
): string {
  // Validazione codice sistema
  if (!systemCode || systemCode.length !== 8) {
    throw new Error(`SIAE_ERROR: Codice sistema deve essere 8 caratteri. Ricevuto: "${systemCode}"`);
  }
  
  if (!/^[A-Za-z0-9]{8}$/.test(systemCode)) {
    throw new Error(`SIAE_ERROR: Codice sistema contiene caratteri non validi: "${systemCode}"`);
  }
  
  // Validazione progressivo
  if (progressivo < 1 || progressivo > 999) {
    throw new Error(`SIAE_ERROR: Progressivo deve essere 1-999. Ricevuto: ${progressivo}`);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prog = String(progressivo).padStart(3, '0');
  
  // FIX 2026-01-20: Formato UFFICIALE SIAE Allegato C sezione 1.4.1
  // FORMATO: XXX_AAAA_MM_GG_NNN.xsi (con underscore separati)
  // IMPORTANTE: Il codice sistema va SOLO nel Subject email, NON nel nome file!
  
  let fileName: string;
  
  switch (reportType) {
    case 'mensile':
      // RPM_AAAA_MM_NNN.xsi (4 parti, senza giorno)
      fileName = `RPM_${year}_${month}_${prog}.xsi`;
      break;
    case 'rca':
      // RCA_AAAA_MM_GG_NNN.xsi (5 parti)
      fileName = `RCA_${year}_${month}_${day}_${prog}.xsi`;
      break;
    case 'giornaliero':
    default:
      // RPG_AAAA_MM_GG_NNN.xsi (5 parti) - RPG = RiepilogoGiornaliero
      fileName = `RPG_${year}_${month}_${day}_${prog}.xsi`;
      break;
  }
  
  console.log(`[SIAE-TX] Generated filename: ${fileName}`);
  return fileName;
}

/**
 * Valida nome file SIAE - Formato UFFICIALE Allegato C sezione 1.4.1
 * 
 * Formati validi:
 * - RMG_AAAA_MM_GG_NNN.xsi (giornaliero - 5 parti)
 * - RPM_AAAA_MM_NNN.xsi (mensile - 4 parti)
 * - RCA_AAAA_MM_GG_NNN.xsi (eventi - 5 parti)
 */
export function validateFileName(fileName: string): void {
  const baseName = fileName.replace(/\.xsi(\.p7m)?$/i, '');
  const parts = baseName.split('_');
  const prefix = parts[0];
  
  // Verifica prefisso
  if (!['RMG', 'RPM', 'RCA'].includes(prefix)) {
    throw new Error(`SIAE_FILENAME_ERROR: Prefisso non valido: ${prefix}`);
  }
  
  // Numero parti dipende dal tipo
  const isMonthly = prefix === 'RPM';
  const expectedParts = isMonthly ? 4 : 5;
  
  if (parts.length !== expectedParts) {
    throw new Error(`SIAE_FILENAME_ERROR: Nome file ${prefix} deve avere ${expectedParts} parti. Trovate: ${parts.length} in "${fileName}"`);
  }
  
  // CRITICO: Verifica assenza timestamp
  if (/_\d{10,}/.test(baseName)) {
    throw new Error(`SIAE_FILENAME_ERROR: Rilevato timestamp nel nome file! "${fileName}"`);
  }
}

/**
 * Genera subject email (= nome file senza estensione)
 */
export function generateSubject(fileName: string): string {
  return fileName.replace(/\.xsi(\.p7m)?$/i, '');
}

// ============================================================
// XML GENERATION - DTD v0039 Compliant
// ============================================================

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

/**
 * @deprecated NON USARE - Usa generateC1Xml da siae-utils.ts
 * Genera XML RiepilogoGiornaliero (RMG)
 * ATTENZIONE: Questa funzione genera XML NON conforme al DTD ufficiale
 */
export function generateRMGXml(data: SiaeReportData): string {
  console.warn('[SIAE-TRANSMISSION] DEPRECATION WARNING: generateRMGXml è obsoleto! Usare generateC1Xml da siae-utils.ts');
  const now = new Date();
  const reportDate = formatDate(data.dataReport);
  const generationDate = formatDate(now);
  const generationTime = formatTime(now);
  const prog = String(data.progressivo).padStart(3, '0');
  const sostituzione = data.sostituzione ? 'S' : 'N';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<RiepilogoGiornaliero Sostituzione="${sostituzione}" Data="${reportDate}" DataGenerazione="${generationDate}" OraGenerazione="${generationTime}" ProgressivoGenerazione="${prog}">\n`;
  
  // Titolare
  xml += `    <Titolare>\n`;
  xml += `        <Denominazione>${escapeXml(data.titolare.denominazione)}</Denominazione>\n`;
  xml += `        <CodiceFiscale>${data.titolare.codiceFiscale}</CodiceFiscale>\n`;
  xml += `        <SistemaEmissione>${data.titolare.sistemaEmissione}</SistemaEmissione>\n`;
  xml += `    </Titolare>\n`;
  
  // Organizzatore
  xml += `    <Organizzatore>\n`;
  xml += `        <Denominazione>${escapeXml(data.organizzatore.denominazione)}</Denominazione>\n`;
  xml += `        <CodiceFiscale>${data.organizzatore.codiceFiscale}</CodiceFiscale>\n`;
  xml += `        <TipoOrganizzatore valore="${data.organizzatore.tipoOrganizzatore}"/>\n`;
  xml += `    </Organizzatore>\n`;
  
  xml += `</RiepilogoGiornaliero>\n`;
  
  return xml;
}

/**
 * Genera XML RiepilogoMensile (RPM) - DTD v0039 Compliant
 * STRUTTURA: RiepilogoMensile > Titolare + Organizzatore* (con Evento* dentro Organizzatore)
 */
export function generateRPMXml(data: SiaeReportData): string {
  const now = new Date();
  const year = data.dataReport.getFullYear();
  const month = String(data.dataReport.getMonth() + 1).padStart(2, '0');
  const reportMonth = `${year}${month}`; // Formato YYYYMM
  const generationDate = formatDate(now);
  const generationTime = formatTime(now);
  const prog = String(data.progressivo).padStart(3, '0');
  const sostituzione = data.sostituzione ? 'S' : 'N';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<RiepilogoMensile Sostituzione="${sostituzione}" Mese="${reportMonth}" DataGenerazione="${generationDate}" OraGenerazione="${generationTime}" ProgressivoGenerazione="${prog}">\n`;
  
  // Titolare
  xml += `    <Titolare>\n`;
  xml += `        <Denominazione>${escapeXml(data.titolare.denominazione)}</Denominazione>\n`;
  xml += `        <CodiceFiscale>${data.titolare.codiceFiscale}</CodiceFiscale>\n`;
  xml += `        <SistemaEmissione>${data.titolare.sistemaEmissione}</SistemaEmissione>\n`;
  xml += `    </Titolare>\n`;
  
  // Organizzatore (con Evento* obbligatorio dentro secondo DTD)
  xml += `    <Organizzatore>\n`;
  xml += `        <Denominazione>${escapeXml(data.organizzatore.denominazione)}</Denominazione>\n`;
  xml += `        <CodiceFiscale>${data.organizzatore.codiceFiscale}</CodiceFiscale>\n`;
  xml += `        <TipoOrganizzatore valore="${data.organizzatore.tipoOrganizzatore}"/>\n`;
  
  // Evento (DTD: Evento* dentro Organizzatore)
  if (data.evento && 'dataEvento' in data.evento) {
    const evt = data.evento as SiaeEventoRPM;
    xml += `        <Evento>\n`;
    
    // Intrattenimento (TipoTassazione, Incidenza?)
    xml += `            <Intrattenimento>\n`;
    xml += `                <TipoTassazione valore="${evt.intrattenimento?.tipoTassazione || 'S'}"/>\n`;
    if (evt.intrattenimento?.incidenza !== undefined) {
      xml += `                <Incidenza>${evt.intrattenimento.incidenza}</Incidenza>\n`;
    }
    xml += `            </Intrattenimento>\n`;
    
    // Locale (Denominazione, CodiceLocale)
    xml += `            <Locale>\n`;
    xml += `                <Denominazione>${escapeXml(evt.locale?.denominazione || 'LOCALE TEST')}</Denominazione>\n`;
    xml += `                <CodiceLocale>${evt.locale?.codiceLocale || '0000000000001'}</CodiceLocale>\n`;
    xml += `            </Locale>\n`;
    
    // DataEvento, OraEvento
    xml += `            <DataEvento>${evt.dataEvento}</DataEvento>\n`;
    xml += `            <OraEvento>${evt.oraEvento}</OraEvento>\n`;
    
    // MultiGenere+ (almeno uno richiesto)
    if (evt.multiGenere && evt.multiGenere.length > 0) {
      for (const mg of evt.multiGenere) {
        xml += `            <MultiGenere>\n`;
        xml += `                <TipoGenere>${mg.tipoGenere}</TipoGenere>\n`;
        xml += `                <IncidenzaGenere>${mg.incidenzaGenere}</IncidenzaGenere>\n`;
        // TitoliOpere+ (almeno uno richiesto)
        if (mg.titoliOpere && mg.titoliOpere.length > 0) {
          for (const titolo of mg.titoliOpere) {
            xml += `                <TitoliOpere>\n`;
            xml += `                    <Titolo>${escapeXml(titolo)}</Titolo>\n`;
            xml += `                </TitoliOpere>\n`;
          }
        }
        xml += `            </MultiGenere>\n`;
      }
    }
    
    // OrdineDiPosto+ (almeno uno richiesto)
    if (evt.ordineDiPosto && evt.ordineDiPosto.length > 0) {
      for (const odp of evt.ordineDiPosto) {
        xml += `            <OrdineDiPosto>\n`;
        xml += `                <CodiceOrdine>${odp.codiceOrdine}</CodiceOrdine>\n`;
        xml += `                <Capienza>${odp.capienza}</Capienza>\n`;
        xml += `                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>\n`;
        
        // TitoliAccesso*
        if (odp.titoliAccesso && odp.titoliAccesso.length > 0) {
          for (const ta of odp.titoliAccesso) {
            xml += `                <TitoliAccesso>\n`;
            xml += `                    <TipoTitolo>${ta.tipoTitolo}</TipoTitolo>\n`;
            xml += `                    <Quantita>${ta.quantita}</Quantita>\n`;
            xml += `                    <CorrispettivoLordo>${ta.corrispettivoLordo}</CorrispettivoLordo>\n`;
            xml += `                    <Prevendita>${ta.prevendita || 0}</Prevendita>\n`;
            xml += `                    <IVACorrispettivo>${ta.ivaCorrispettivo}</IVACorrispettivo>\n`;
            xml += `                    <IVAPrevendita>${ta.ivaPrevendita || 0}</IVAPrevendita>\n`;
            xml += `                    <ImportoPrestazione>${ta.importoPrestazione || 0}</ImportoPrestazione>\n`;
            xml += `                </TitoliAccesso>\n`;
          }
        }
        
        xml += `            </OrdineDiPosto>\n`;
      }
    }
    
    xml += `        </Evento>\n`;
  }
  
  xml += `    </Organizzatore>\n`;
  xml += `</RiepilogoMensile>\n`;
  
  return xml;
}

/**
 * @deprecated NON USARE - Usa generateRCAXml da siae-utils.ts (con parametri diversi)
 * Genera XML RiepilogoControlloAccessi (RCA)
 * ATTENZIONE: Questa funzione genera struttura XML semplificata NON conforme al DTD!
 * Manca la struttura completa: Evento, SistemaEmissione, Titoli, TotaleTipoTitolo
 */
export function generateRCAXml(data: SiaeReportData): string {
  console.warn('[SIAE-TRANSMISSION] DEPRECATION WARNING: generateRCAXml di siae-transmission.ts è obsoleto! Usare generateRCAXml da siae-utils.ts');
  const now = new Date();
  const reportDate = formatDate(data.dataReport);
  const generationDate = formatDate(now);
  const generationTime = formatTime(now);
  const prog = String(data.progressivo).padStart(3, '0');
  const sostituzione = data.sostituzione ? 'S' : 'N';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<RiepilogoControlloAccessi Sostituzione="${sostituzione}" Data="${reportDate}" DataGenerazione="${generationDate}" OraGenerazione="${generationTime}" ProgressivoGenerazione="${prog}">\n`;
  
  // Titolare
  xml += `    <Titolare>\n`;
  xml += `        <Denominazione>${escapeXml(data.titolare.denominazione)}</Denominazione>\n`;
  xml += `        <CodiceFiscale>${data.titolare.codiceFiscale}</CodiceFiscale>\n`;
  xml += `        <CodiceSistemaCA>${data.titolare.sistemaEmissione}</CodiceSistemaCA>\n`;
  xml += `    </Titolare>\n`;
  
  // Organizzatore
  xml += `    <Organizzatore>\n`;
  xml += `        <Denominazione>${escapeXml(data.organizzatore.denominazione)}</Denominazione>\n`;
  xml += `        <CodiceFiscale>${data.organizzatore.codiceFiscale}</CodiceFiscale>\n`;
  xml += `        <TipoOrganizzatore valore="${data.organizzatore.tipoOrganizzatore}"/>\n`;
  xml += `    </Organizzatore>\n`;
  
  // Evento (se presente) - usa SiaeEvento per RCA
  if (data.evento && 'codice' in data.evento) {
    const evt = data.evento as SiaeEvento;
    xml += `    <Evento>\n`;
    xml += `        <CodiceEvento>${escapeXml(evt.codice)}</CodiceEvento>\n`;
    xml += `        <Data>${evt.data}</Data>\n`;
    xml += `        <Ora>${evt.ora}</Ora>\n`;
    xml += `        <Genere>${escapeXml(evt.genere)}</Genere>\n`;
    xml += `        <Denominazione>${escapeXml(evt.denominazione)}</Denominazione>\n`;
    xml += `        <Localita>${escapeXml(evt.localita)}</Localita>\n`;
    xml += `        <Provincia>${evt.provincia}</Provincia>\n`;
    xml += `        <Luogo>${escapeXml(evt.luogo)}</Luogo>\n`;
    if (evt.capienza) {
      xml += `        <Capienza>${evt.capienza}</Capienza>\n`;
    }
    xml += `    </Evento>\n`;
  }
  
  xml += `</RiepilogoControlloAccessi>\n`;
  
  return xml;
}

/**
 * Genera XML in base al tipo di report
 */
export function generateXml(reportType: SiaeReportType, data: SiaeReportData): string {
  switch (reportType) {
    case 'mensile':
      return generateRPMXml(data);
    case 'rca':
      return generateRCAXml(data);
    case 'giornaliero':
    default:
      return generateRMGXml(data);
  }
}

// ============================================================
// EMAIL TRANSMISSION
// ============================================================

const SIAE_SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true
};

/**
 * Invia report SIAE via email con firma S/MIME
 */
export async function transmitReport(params: SiaeTransmissionParams): Promise<SiaeTransmissionResult> {
  const { reportType, data, destinatario } = params;
  
  console.log(`[SIAE-TX] ========================================`);
  console.log(`[SIAE-TX] INIZIO TRASMISSIONE ${reportType.toUpperCase()}`);
  console.log(`[SIAE-TX] Destinatario: ${destinatario}`);
  console.log(`[SIAE-TX] Sistema: ${data.titolare.sistemaEmissione}`);
  console.log(`[SIAE-TX] ========================================`);
  
  try {
    // 1. Genera nome file - SENZA TIMESTAMP
    const fileName = generateFileName(
      reportType,
      data.dataReport,
      data.titolare.sistemaEmissione,
      data.progressivo
    );
    
    // 2. Genera subject (= nome file senza estensione)
    const subject = generateSubject(fileName);
    
    // 3. Genera XML
    const xmlContent = generateXml(reportType, data);
    
    console.log(`[SIAE-TX] File: ${fileName}`);
    console.log(`[SIAE-TX] Subject: ${subject}`);
    console.log(`[SIAE-TX] XML length: ${xmlContent.length} bytes`);
    
    // 4. Verifica bridge connesso
    if (!isBridgeConnected()) {
      return {
        success: false,
        fileName,
        subject,
        xmlContent,
        smimeSigned: false,
        error: 'Desktop Bridge non connesso. Collegare il lettore smart card.'
      };
    }
    
    // 5. Ottieni email del certificato dalla smart card
    const certEmail = await getCardSignerEmail();
    if (!certEmail) {
      return {
        success: false,
        fileName,
        subject,
        xmlContent,
        smimeSigned: false,
        error: 'Impossibile leggere email dal certificato smart card'
      };
    }
    
    // 6. Prepara contenuto email
    const attachmentBase64 = Buffer.from(xmlContent, 'utf-8').toString('base64');
    
    const body = [
      `Trasmissione ${reportType.toUpperCase()} SIAE`,
      ``,
      `Titolare: ${data.titolare.denominazione}`,
      `Codice Fiscale: ${data.titolare.codiceFiscale}`,
      `Sistema: ${data.titolare.sistemaEmissione}`,
      ``,
      `Il file ${fileName} e' allegato a questa email.`,
      ``,
      `Event4U - Sistema Gestione Fiscale SIAE`
    ].join('\r\n');
    
    console.log(`[SIAE-TX] Requesting S/MIME signature...`);
    console.log(`[SIAE-TX] CRITICAL CHECK - fileName to bridge: "${fileName}"`);
    console.log(`[SIAE-TX] CRITICAL CHECK - subject to bridge: "${subject}"`);
    
    // 7. Richiedi firma S/MIME
    const smimeData = await requestSmimeSignature({
      from: certEmail,
      to: destinatario,
      subject: subject,
      body: body,
      attachmentBase64: attachmentBase64,
      attachmentName: fileName  // NOME FILE ESATTO - NESSUN TIMESTAMP
    }, destinatario);
    
    if (!smimeData.signedMime || smimeData.signedMime.length < 100) {
      return {
        success: false,
        fileName,
        subject,
        xmlContent,
        smimeSigned: false,
        error: 'Firma S/MIME non valida'
      };
    }
    
    console.log(`[SIAE-TX] S/MIME signature received: ${smimeData.signedMime.length} bytes`);
    
    // 8. Invia email
    const transporter = nodemailer.createTransport({
      ...SIAE_SMTP_CONFIG,
      auth: {
        user: process.env.SIAE_SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SIAE_SMTP_PASS || process.env.EMAIL_PASS
      }
    });
    
    const info = await transporter.sendMail({
      envelope: {
        from: certEmail,
        to: destinatario
      },
      raw: smimeData.signedMime
    });
    
    console.log(`[SIAE-TX] Email sent successfully: ${info.messageId}`);
    console.log(`[SIAE-TX] ========================================`);
    console.log(`[SIAE-TX] TRASMISSIONE COMPLETATA`);
    console.log(`[SIAE-TX] ========================================`);
    
    return {
      success: true,
      fileName,
      subject,
      xmlContent,
      smimeSigned: true,
      messageId: info.messageId
    };
    
  } catch (error: any) {
    console.error(`[SIAE-TX] ERROR: ${error.message}`);
    return {
      success: false,
      fileName: '',
      subject: '',
      xmlContent: '',
      smimeSigned: false,
      error: error.message
    };
  }
}

// ============================================================
// HELPER EXPORTS
// ============================================================

export { escapeXml, formatDate, formatTime };
