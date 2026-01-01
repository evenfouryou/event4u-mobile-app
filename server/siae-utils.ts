/**
 * SIAE Utilities - Funzioni condivise per la generazione di report SIAE
 * Conforme a Allegato B e C - Provvedimento Agenzia delle Entrate 04/03/2008
 */

// ==================== XML Character Escaping ====================

/**
 * Escape caratteri speciali XML per conformità UTF-8
 * Gestisce anche caratteri accentati italiani (à, è, é, ì, ò, ù)
 */
export function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// ==================== Date/Time Formatting ====================

/**
 * Formatta data in formato SIAE compatto AAAAMMGG
 * Conforme a Allegato B - Provvedimento 04/03/2008
 * Es: 20241228 per 28 dicembre 2024
 */
export function formatSiaeDateCompact(date: Date | string | null): string {
  if (!date) return '00000000';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '00000000';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Formatta ora in formato SIAE compatto HHMMSS
 * Conforme a Allegato B - OraGenerazioneRiepilogo
 * Es: 143015 per 14:30:15
 */
export function formatSiaeTimeCompact(date: Date | string | null): string {
  if (!date) return '000000';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '000000';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

/**
 * Formatta ora in formato SIAE HHMM (per OraEvento)
 * Conforme a Allegato B - OraEvento
 * Es: 1430 per 14:30
 */
export function formatSiaeTimeHHMM(date: Date | string | null): string {
  if (!date) return '0000';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '0000';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}${minutes}`;
}

/**
 * Formatta data in formato SIAE YYYY-MM-DD (legacy)
 */
export function formatSiaeDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Formatta datetime in formato SIAE YYYY-MM-DDTHH:MM:SS (legacy)
 */
export function formatSiaeDateTime(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().replace('.000Z', '');
}

// ==================== Amount Conversion ====================

/**
 * Converte importo da euro a centesimi (intero)
 * SIAE richiede importi in centesimi senza decimali
 */
export function toCentesimi(euroAmount: number | string): number {
  const euro = typeof euroAmount === 'string' ? parseFloat(euroAmount) : euroAmount;
  return Math.round((euro || 0) * 100);
}

// ==================== Code Normalization ====================

/**
 * Normalizza TipoTitolo per conformità SIAE
 * Valori validi: R1 (intero), R2 (ridotto), O1 (omaggio), ABB (abbonamento)
 */
export function normalizeSiaeTipoTitolo(rawCode: string | null | undefined, isComplimentary?: boolean): string {
  if (isComplimentary) return 'O1';
  if (!rawCode) return 'R1';
  
  const code = rawCode.toUpperCase().trim();
  
  switch (code) {
    case 'R1':
    case 'INTERO':
    case 'FULL':
    case 'STANDARD':
    case 'NORMAL':
      return 'R1';
    
    case 'R2':
    case 'RIDOTTO':
    case 'REDUCED':
    case 'DISCOUNT':
      return 'R2';
    
    case 'O1':
    case 'OMAGGIO':
    case 'FREE':
    case 'COMPLIMENTARY':
    case 'GRATIS':
      return 'O1';
    
    case 'ABB':
    case 'ABBONAMENTO':
    case 'SUBSCRIPTION':
      return 'ABB';
    
    default:
      return 'R1';
  }
}

/**
 * Normalizza CodiceOrdine (settore) per conformità SIAE
 * Valori validi: A0, A1, B1, ecc. (formato lettera + numero)
 */
export function normalizeSiaeCodiceOrdine(rawCode: string | null | undefined): string {
  if (!rawCode) return 'A0';
  
  const code = rawCode.toUpperCase().trim();
  
  if (/^[A-Z][0-9]$/.test(code)) {
    return code;
  }
  
  if (/^[A-Z]+$/.test(code)) {
    return code.charAt(0) + '0';
  }
  
  if (/^[0-9]+$/.test(code)) {
    return 'A' + code.charAt(0);
  }
  
  return 'A0';
}

// ==================== File Naming ====================

/**
 * Genera nome file conforme Allegato C SIAE
 * - RMG_AAAA_MM_GG_###.xsi per RiepilogoGiornaliero
 * - RPM_AAAA_MM_###.xsi per RiepilogoMensile
 * - RCA_AAAA_MM_GG_###.xsi per RiepilogoControlloAccessi
 */
export function generateSiaeFileName(
  reportType: 'giornaliero' | 'mensile' | 'rca',
  date: Date,
  progressivo: number,
  isSigned: boolean = false
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prog = String(progressivo).padStart(3, '0');
  const extension = isSigned ? '.xsi.p7m' : '.xsi';
  
  switch (reportType) {
    case 'mensile':
      return `RPM_${year}_${month}_${prog}${extension}`;
    case 'rca':
      return `RCA_${year}_${month}_${day}_${prog}${extension}`;
    case 'giornaliero':
    default:
      return `RMG_${year}_${month}_${day}_${prog}${extension}`;
  }
}

// ==================== SIAE Configuration ====================

export const SIAE_SYSTEM_CODE_DEFAULT = 'EVENT4U1';

// ==================== EFFF Smart Card Data Structure ====================
// Conforme a Descrizione_contenuto_SmartCardTestxBA-V102.pdf

/**
 * Struttura dati file EFFF della Smart Card SIAE
 * Contiene 15 campi in record variabili (PKCS#11 DF 11 11)
 */
export interface SiaeCardEfffData {
  /** 1. Codice univoco del Sistema (8 char) - Pxxxxxxx per test, xxxxxxxx per produzione */
  systemId: string;
  /** 2. Nome del firmatario/richiedente (40 char) */
  contactName: string;
  /** 3. Cognome del firmatario/richiedente (40 char) */
  contactLastName: string;
  /** 4. Codice Fiscale del firmatario (18 char) */
  contactCodFis: string;
  /** 5. Ubicazione del sistema (100 char) */
  systemLocation: string;
  /** 6. Email associata al certificato digitale (50 char) */
  contactEmail: string;
  /** 7. Email server SIAE per invio report (40 char) - servertest2@batest.siae.it per test */
  siaeEmail: string;
  /** 8. Ragione sociale o Nome/Cognome titolare (60 char) */
  partnerName: string;
  /** 9. Codice Fiscale o P.IVA del titolare (18 char) */
  partnerCodFis: string;
  /** 10. Numero iscrizione REA (ex CCIAA) (18 char) */
  partnerRegistroImprese: string;
  /** 11. Nazione titolare ISO 3166 (2 char) - es: IT */
  partnerNation: string;
  /** 12. Num. protocollo delibera approvazione (20 char) */
  systemApprCode: string;
  /** 13. Data delibera approvazione (20 char) - formato libero */
  systemApprDate: string;
  /** 14. Tipo rappresentanza legale (1 char) - I/T/L/N/P */
  contactRepresentationType: 'I' | 'T' | 'L' | 'N' | 'P' | string;
  /** 15. Versione file dati utente (5 char) */
  userDataFileVersion: string;
}

/**
 * Verifica se il systemId indica una Smart Card di TEST
 * Le carte di test hanno systemId con pattern Pxxxxxxx (es: P0001234)
 * Le carte di produzione hanno pattern xxxxxxxx (es: 00001234)
 */
export function isTestSmartCard(systemId: string | null | undefined): boolean {
  if (!systemId) return true; // Default a test se non disponibile
  return systemId.toUpperCase().startsWith('P');
}

/**
 * Determina l'ambiente SIAE dalla Smart Card
 */
export function getSiaeEnvironment(systemId: string | null | undefined): 'test' | 'production' {
  return isTestSmartCard(systemId) ? 'test' : 'production';
}

/**
 * Restituisce l'email SIAE corretta in base all'ambiente
 */
export function getSiaeEmailForEnvironment(systemId: string | null | undefined): string {
  return isTestSmartCard(systemId) 
    ? 'servertest2@batest.siae.it' 
    : 'server@ba.siae.it'; // Email produzione (da verificare con SIAE)
}

// ==================== DTD Validation ====================

/**
 * Risultato validazione DTD
 */
export interface DtdValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifica che l'XML contenga gli elementi obbligatori per il tipo di report
 * Validazione sintattica semplificata (non usa parser DTD completo)
 */
export function validateSiaeXml(xml: string, reportType: 'giornaliero' | 'mensile' | 'rca'): DtdValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verifica dichiarazione XML
  if (!xml.startsWith('<?xml')) {
    errors.push('Dichiarazione XML mancante: <?xml version="1.0" encoding="UTF-8"?>');
  }
  
  // Verifica encoding UTF-8
  if (!xml.includes('encoding="UTF-8"') && !xml.includes("encoding='UTF-8'")) {
    warnings.push('Encoding UTF-8 non specificato esplicitamente');
  }
  
  // Verifica elemento radice corretto
  const rootElements: Record<string, string> = {
    'giornaliero': 'RiepilogoGiornaliero',
    'mensile': 'RiepilogoMensile',
    'rca': 'RiepilogoControlloAccessi'
  };
  
  const expectedRoot = rootElements[reportType];
  if (!xml.includes(`<${expectedRoot}`)) {
    errors.push(`Elemento radice mancante: <${expectedRoot}>`);
  }
  
  // Verifica attributi obbligatori per tipo report
  if (reportType === 'giornaliero') {
    if (!xml.includes('Data="')) {
      errors.push('Attributo Data mancante in RiepilogoGiornaliero');
    }
    // Verifica che NON contenga elementi solo mensili
    if (xml.includes('<ImponibileIntrattenimenti>')) {
      errors.push('ImponibileIntrattenimenti non ammesso in RiepilogoGiornaliero (solo mensile)');
    }
    if (xml.includes('<IVAEccedenteOmaggi>')) {
      errors.push('IVAEccedenteOmaggi non ammesso in RiepilogoGiornaliero (solo mensile)');
    }
  } else if (reportType === 'mensile') {
    if (!xml.includes('Mese="')) {
      errors.push('Attributo Mese mancante in RiepilogoMensile');
    }
  }
  
  // Verifica elementi obbligatori comuni
  const requiredElements = ['Titolare', 'Denominazione', 'CodiceFiscale'];
  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem}>`)) {
      errors.push(`Elemento obbligatorio mancante: <${elem}>`);
    }
  }
  
  // Verifica attributi generazione
  if (!xml.includes('DataGenerazione="')) {
    errors.push('Attributo DataGenerazione mancante');
  }
  if (!xml.includes('OraGenerazione="')) {
    errors.push('Attributo OraGenerazione mancante');
  }
  if (!xml.includes('ProgressivoGenerazione="')) {
    errors.push('Attributo ProgressivoGenerazione mancante');
  }
  
  // Verifica caratteri non ammessi
  if (xml.includes('&') && !xml.includes('&amp;') && !xml.includes('&lt;') && !xml.includes('&gt;') && !xml.includes('&apos;') && !xml.includes('&quot;')) {
    warnings.push('Possibile carattere & non escaped correttamente');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ==================== Log.xsi Response Parser ====================
// Conforme a Log_v0040_20190627.dtd

/**
 * Singola transazione dal Log SIAE
 */
export interface SiaeLogTransaction {
  cfOrganizzatore: string;
  cfTitolare: string;
  ivaPreassolta: 'N' | 'B' | 'F';
  tipoTassazione: 'S' | 'I';
  valuta: 'E' | 'L';
  sistemaEmissione: string;
  cartaAttivazione: string;
  sigilloFiscale: string;
  dataEmissione: string;
  oraEmissione: string;
  numeroProgressivo: string;
  tipoTitolo: string;
  codiceOrdine: string;
  causale?: string;
  posto?: string;
  codiceRichiedenteEmissioneSigillo: string;
  prestampa?: string;
  imponibileIntrattenimenti?: string;
  originaleAnnullato?: string;
  cartaOriginaleAnnullato?: string;
  causaleAnnullamento?: string;
  // Dati TitoloAccesso
  titoloAccesso?: {
    annullamento: boolean;
    corrispettivoLordo?: number;
    prevendita?: number;
    ivaCorrispettivo?: number;
    ivaPrevendita?: number;
    importoFigurativo?: number;
    ivaFigurativa?: number;
    codiceLocale: string;
    dataEvento: string;
    oraEvento: string;
    tipoGenere: string;
    titolo: string;
  };
  // Dati Abbonamento
  abbonamento?: {
    annullamento: boolean;
    codiceAbbonamento: string;
    progressivoAbbonamento: string;
    turno: 'F' | 'L';
    quantitaEventiAbilitati: number;
    validita: string;
    rateo: number;
    rateoIntrattenimenti: number;
    rateoIva: number;
  };
}

/**
 * Risultato parsing Log SIAE
 */
export interface SiaeLogParseResult {
  success: boolean;
  transactions: SiaeLogTransaction[];
  totalTransactions: number;
  errors: string[];
}

/**
 * Parser semplificato per Log.xsi SIAE
 * Estrae le transazioni dal LogTransazione XML
 */
export function parseSiaeLogXml(xml: string): SiaeLogParseResult {
  const errors: string[] = [];
  const transactions: SiaeLogTransaction[] = [];
  
  try {
    // Verifica elemento radice
    if (!xml.includes('<LogTransazione')) {
      return {
        success: false,
        transactions: [],
        totalTransactions: 0,
        errors: ['Elemento LogTransazione non trovato - non è un Log SIAE valido']
      };
    }
    
    // Estrai tutte le transazioni con regex (parser semplificato)
    const transactionRegex = /<Transazione([^>]*)>([\s\S]*?)<\/Transazione>/g;
    let match;
    
    while ((match = transactionRegex.exec(xml)) !== null) {
      const attrs = match[1];
      const content = match[2];
      
      // Estrai attributi obbligatori
      const extractAttr = (name: string): string => {
        const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`));
        return attrMatch ? attrMatch[1] : '';
      };
      
      // Estrai elementi figli
      const extractElement = (name: string): string | undefined => {
        const elemMatch = content.match(new RegExp(`<${name}>([^<]*)<\/${name}>`));
        return elemMatch ? elemMatch[1] : undefined;
      };
      
      const transaction: SiaeLogTransaction = {
        cfOrganizzatore: extractAttr('CFOrganizzatore'),
        cfTitolare: extractAttr('CFTitolare'),
        ivaPreassolta: extractAttr('IVAPreassolta') as 'N' | 'B' | 'F',
        tipoTassazione: extractAttr('TipoTassazione') as 'S' | 'I',
        valuta: (extractAttr('Valuta') || 'E') as 'E' | 'L',
        sistemaEmissione: extractAttr('SistemaEmissione'),
        cartaAttivazione: extractAttr('CartaAttivazione'),
        sigilloFiscale: extractAttr('SigilloFiscale'),
        dataEmissione: extractAttr('DataEmissione'),
        oraEmissione: extractAttr('OraEmissione'),
        numeroProgressivo: extractAttr('NumeroProgressivo'),
        tipoTitolo: extractAttr('TipoTitolo'),
        codiceOrdine: extractAttr('CodiceOrdine'),
        causale: extractAttr('Causale') || undefined,
        posto: extractAttr('Posto') || undefined,
        codiceRichiedenteEmissioneSigillo: extractAttr('CodiceRichiedenteEmissioneSigillo'),
        prestampa: extractAttr('Prestampa') || undefined,
        imponibileIntrattenimenti: extractAttr('ImponibileIntrattenimenti') || undefined,
        originaleAnnullato: extractAttr('OriginaleAnnullato') || undefined,
        cartaOriginaleAnnullato: extractAttr('CartaOriginaleAnnullato') || undefined,
        causaleAnnullamento: extractAttr('CausaleAnnullamento') || undefined,
      };
      
      // Estrai TitoloAccesso se presente
      if (content.includes('<TitoloAccesso')) {
        const taMatch = content.match(/<TitoloAccesso([^>]*)>([\s\S]*?)<\/TitoloAccesso>/);
        if (taMatch) {
          const taAttrs = taMatch[1];
          const taContent = taMatch[2];
          const annullamento = taAttrs.includes('Annullamento="S"');
          
          transaction.titoloAccesso = {
            annullamento,
            corrispettivoLordo: parseInt(extractElement('CorrispettivoLordo') || '0'),
            prevendita: parseInt(extractElement('Prevendita') || '0'),
            ivaCorrispettivo: parseInt(extractElement('IVACorrispettivo') || '0'),
            ivaPrevendita: parseInt(extractElement('IVAPrevendita') || '0'),
            importoFigurativo: parseInt(extractElement('ImportoFigurativo') || '0'),
            ivaFigurativa: parseInt(extractElement('IVAFigurativa') || '0'),
            codiceLocale: extractElement('CodiceLocale') || '',
            dataEvento: extractElement('DataEvento') || '',
            oraEvento: extractElement('OraEvento') || '',
            tipoGenere: extractElement('TipoGenere') || '',
            titolo: extractElement('Titolo') || '',
          };
        }
      }
      
      transactions.push(transaction);
    }
    
    return {
      success: true,
      transactions,
      totalTransactions: transactions.length,
      errors
    };
    
  } catch (error: any) {
    return {
      success: false,
      transactions: [],
      totalTransactions: 0,
      errors: [`Errore parsing Log XML: ${error.message}`]
    };
  }
}

/**
 * Analizza il Log SIAE per estrarre statistiche
 */
export interface SiaeLogStats {
  totalTransactions: number;
  ticketsEmitted: number;
  ticketsCancelled: number;
  subscriptionsEmitted: number;
  subscriptionsCancelled: number;
  totalGrossAmount: number;
  totalVat: number;
  byTipoTitolo: Record<string, number>;
  byOrganizer: Record<string, number>;
}

export function analyzeSiaeLog(result: SiaeLogParseResult): SiaeLogStats {
  const stats: SiaeLogStats = {
    totalTransactions: result.totalTransactions,
    ticketsEmitted: 0,
    ticketsCancelled: 0,
    subscriptionsEmitted: 0,
    subscriptionsCancelled: 0,
    totalGrossAmount: 0,
    totalVat: 0,
    byTipoTitolo: {},
    byOrganizer: {}
  };
  
  for (const tx of result.transactions) {
    // Conteggio per tipo titolo
    stats.byTipoTitolo[tx.tipoTitolo] = (stats.byTipoTitolo[tx.tipoTitolo] || 0) + 1;
    
    // Conteggio per organizzatore
    stats.byOrganizer[tx.cfOrganizzatore] = (stats.byOrganizer[tx.cfOrganizzatore] || 0) + 1;
    
    if (tx.titoloAccesso) {
      if (tx.titoloAccesso.annullamento) {
        stats.ticketsCancelled++;
      } else {
        stats.ticketsEmitted++;
        stats.totalGrossAmount += tx.titoloAccesso.corrispettivoLordo || 0;
        stats.totalVat += tx.titoloAccesso.ivaCorrispettivo || 0;
      }
    }
    
    if (tx.abbonamento) {
      if (tx.abbonamento.annullamento) {
        stats.subscriptionsCancelled++;
      } else {
        stats.subscriptionsEmitted++;
      }
    }
  }
  
  return stats;
}
