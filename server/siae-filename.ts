/**
 * SIAE File Naming Module - Allegato C Compliant
 * 
 * Questo modulo gestisce TUTTI i nomi file SIAE in modo centralizzato.
 * Segue rigorosamente le specifiche Allegato C SIAE.
 * 
 * FIX 2026-01-20: Formato UFFICIALE secondo documentazione Agenzia Entrate
 * 
 * FORMATO NOME FILE ALLEGATO (sezione 1.4.1):
 *   XXX_AAAA_MM_GG_###.xsi.p7m
 * Dove:
 *   XXX = "RCA" o "LTA" (solo questi prefissi validi per email)
 *   AAAA_MM_GG = data SEPARATA da underscore
 *   ### = progressivo (001-999)
 *   .xsi = estensione XML SIAE
 *   .p7m = firma digitale
 * 
 * Esempio: RCA_2026_01_20_001.xsi.p7m
 * 
 * FORMATO SUBJECT EMAIL (sezione 1.5.3):
 *   RCA_AAAA_MM_GG_SSSSSSSS_###_XSI_V.XX.YY
 * Dove:
 *   SSSSSSSS = codice sistema (8 caratteri)
 *   V.XX.YY = versione formato
 * 
 * Esempio: RCA_2026_01_20_P0004010_001_XSI_V.01.00
 * 
 * REGOLE CRITICHE:
 * 1. NO timestamp nel nome file
 * 2. Data SEPARATA da underscore (AAAA_MM_GG)
 * 3. Il codice sistema NON va nel nome file allegato, solo nel subject
 * 4. Progressivo sempre 3 cifre con padding zeros
 * 5. Estensione .xsi.p7m per file firmati
 */

export type SiaeReportType = 'giornaliero' | 'mensile' | 'rca';

export interface SiaeFileNameParams {
  reportType: SiaeReportType;
  date: Date;
  progressivo: number;
  systemCode?: string; // Opzionale per nome file allegato, richiesto per subject
}

export interface SiaeFileNameResult {
  fileName: string;           // Nome file completo (es: RCA_2026_01_20_006.xsi.p7m)
  baseName: string;           // Nome senza estensione (es: RCA_2026_01_20_006)
  prefix: string;             // Prefisso tipo (RCA)
  dateComponent: string;      // Componente data (AAAA_MM_GG)
  progressivoFormatted: string; // Progressivo formattato (NNN)
}

/**
 * Genera un nome file ALLEGATO SIAE conforme Allegato C sezione 1.4.1
 * 
 * FORMATO: RCA_AAAA_MM_GG_###.xsi.p7m (SENZA codice sistema)
 * 
 * @throws Error se i parametri non sono validi
 */
export function generateSiaeFileName(params: SiaeFileNameParams): SiaeFileNameResult {
  const { reportType, date, progressivo } = params;
  
  // VALIDAZIONE RIGOROSA
  
  // 1. Progressivo deve essere tra 1 e 999
  if (progressivo < 1 || progressivo > 999) {
    throw new Error(`SIAE_FILENAME_ERROR: Progressivo deve essere tra 1 e 999. Ricevuto: ${progressivo}`);
  }
  
  // 2. Data deve essere valida
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`SIAE_FILENAME_ERROR: Data non valida`);
  }
  
  // Estrai componenti data
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prog = String(progressivo).padStart(3, '0');
  
  // FIX 2026-01-20: Tutti i report vanno come RCA per trasmissione email (Allegato C)
  const prefix = 'RCA';
  
  // FIX 2026-01-20: Data SEPARATA da underscore come da Allegato C
  let dateComponent: string;
  switch (reportType) {
    case 'mensile':
      // Report mensile - usa primo giorno del mese
      dateComponent = `${year}_${month}_01`;
      break;
    case 'rca':
    case 'giornaliero':
    default:
      dateComponent = `${year}_${month}_${day}`;
      break;
  }
  
  // Costruisci nome file - FORMATO Allegato C sezione 1.4.1
  // SENZA codice sistema (va solo nel subject)
  const baseName = `${prefix}_${dateComponent}_${prog}`;
  const fileName = `${baseName}.xsi.p7m`;
  
  // VALIDAZIONE FINALE - verifica formato
  validateSiaeFileName(fileName);
  
  return {
    fileName,
    baseName,
    prefix,
    dateComponent,
    progressivoFormatted: prog
  };
}

/**
 * Valida che un nome file sia conforme al formato SIAE Allegato C sezione 1.4.1
 * 
 * FORMATO VALIDO: RCA_AAAA_MM_GG_###.xsi.p7m (o solo LTA)
 * 
 * @throws Error se il formato non è valido
 */
export function validateSiaeFileName(fileName: string): void {
  // Rimuovi estensione per validazione
  const nameWithoutExt = fileName.replace(/\.xsi(\.p7m)?$/i, '');
  
  // FIX 2026-01-20: Pattern validi secondo Allegato C sezione 1.4.1
  // Formato: XXX_AAAA_MM_GG_### (SENZA codice sistema, con underscore nella data)
  // Dove XXX = RCA o LTA
  const pattern = /^(RCA|LTA)_(\d{4})_(\d{2})_(\d{2})_(\d{3})$/;
  
  const match = nameWithoutExt.match(pattern);
  
  if (!match) {
    // Analizza errore specifico
    const parts = nameWithoutExt.split('_');
    const prefix = parts[0];
    
    // Verifica prefisso
    if (!['RCA', 'LTA'].includes(prefix)) {
      throw new Error(`SIAE_FILENAME_INVALID: Prefisso non valido "${prefix}". Deve essere RCA o LTA.`);
    }
    
    // Verifica numero parti (RCA_AAAA_MM_GG_### = 5 parti)
    if (parts.length !== 5) {
      throw new Error(`SIAE_FILENAME_INVALID: Nome file deve avere 5 parti (XXX_AAAA_MM_GG_###). Trovate ${parts.length} parti: "${nameWithoutExt}"`);
    }
    
    // Verifica anno (4 cifre)
    if (!/^\d{4}$/.test(parts[1])) {
      throw new Error(`SIAE_FILENAME_INVALID: Anno deve essere 4 cifre. Trovato: "${parts[1]}"`);
    }
    
    // Verifica mese (2 cifre)
    if (!/^\d{2}$/.test(parts[2])) {
      throw new Error(`SIAE_FILENAME_INVALID: Mese deve essere 2 cifre. Trovato: "${parts[2]}"`);
    }
    
    // Verifica giorno (2 cifre)
    if (!/^\d{2}$/.test(parts[3])) {
      throw new Error(`SIAE_FILENAME_INVALID: Giorno deve essere 2 cifre. Trovato: "${parts[3]}"`);
    }
    
    // Verifica progressivo (3 cifre)
    if (!/^\d{3}$/.test(parts[4])) {
      throw new Error(`SIAE_FILENAME_INVALID: Progressivo deve essere 3 cifre. Trovato: "${parts[4]}"`);
    }
    
    throw new Error(`SIAE_FILENAME_INVALID: Formato nome file non conforme: "${nameWithoutExt}". Formato corretto: RCA_AAAA_MM_GG_###.xsi.p7m`);
  }
  
  // Verifica nessun timestamp o suffisso extra
  if (/_\d{10,}/.test(nameWithoutExt)) {
    throw new Error(`SIAE_FILENAME_INVALID: Rilevato timestamp nel nome file! Il nome SIAE non deve contenere timestamp: "${nameWithoutExt}"`);
  }
}

/**
 * Genera il Subject email SIAE conforme Allegato C sezione 1.5.3
 * 
 * FORMATO: RCA_AAAA_MM_GG_SSSSSSSS_###_XSI_V.XX.YY
 * (DIVERSO dal nome file allegato - include codice sistema e versione)
 */
export function generateSiaeEmailSubject(params: SiaeFileNameParams): string {
  const { reportType, date, progressivo, systemCode } = params;
  
  // Per il subject, il codice sistema è OBBLIGATORIO
  if (!systemCode || systemCode.length !== 8) {
    throw new Error(`SIAE_SUBJECT_ERROR: Codice sistema obbligatorio per Subject email (8 caratteri). Ricevuto: "${systemCode}"`);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prog = String(progressivo).padStart(3, '0');
  const formatVersion = 'V.01.00';
  
  // Formato Subject: RCA_AAAA_MM_GG_SSSSSSSS_###_XSI_V.XX.YY
  let dateComponent: string;
  switch (reportType) {
    case 'mensile':
      dateComponent = `${year}_${month}_01`;
      break;
    case 'rca':
    case 'giornaliero':
    default:
      dateComponent = `${year}_${month}_${day}`;
      break;
  }
  
  return `RCA_${dateComponent}_${systemCode}_${prog}_XSI_${formatVersion}`;
}

/**
 * Estrae informazioni da un nome file SIAE esistente
 * Supporta nuovo formato Allegato C (RCA_AAAA_MM_GG_###)
 */
export function parseSiaeFileName(fileName: string): SiaeFileNameResult | null {
  const nameWithoutExt = fileName.replace(/\.xsi(\.p7m)?$/i, '');
  const parts = nameWithoutExt.split('_');
  
  // Nuovo formato: 5 parti (RCA_AAAA_MM_GG_###)
  if (parts.length !== 5) {
    return null;
  }
  
  const prefix = parts[0];
  const dateComponent = `${parts[1]}_${parts[2]}_${parts[3]}`;
  const progressivoFormatted = parts[4];
  
  if (!['RCA', 'LTA'].includes(prefix)) {
    return null;
  }
  
  return {
    fileName: `${nameWithoutExt}.xsi.p7m`,
    baseName: nameWithoutExt,
    prefix,
    dateComponent,
    progressivoFormatted
  };
}

/**
 * Log diagnostico per debug naming SIAE
 */
export function logSiaeFileNameDebug(context: string, params: SiaeFileNameParams, result: SiaeFileNameResult): void {
  console.log(`[SIAE-FILENAME] ${context}:`);
  console.log(`[SIAE-FILENAME]   Input: type=${params.reportType}, date=${params.date.toISOString()}, prog=${params.progressivo}, sysCode=${params.systemCode || 'N/A'}`);
  console.log(`[SIAE-FILENAME]   Output: fileName="${result.fileName}"`);
  console.log(`[SIAE-FILENAME]   Components: prefix=${result.prefix}, date=${result.dateComponent}, prog=${result.progressivoFormatted}`);
  
  // Verifica che non ci siano timestamp
  if (/_\d{10,}/.test(result.fileName)) {
    console.error(`[SIAE-FILENAME] CRITICAL ERROR: Timestamp detected in filename! This will cause SIAE error 0600!`);
  }
}
