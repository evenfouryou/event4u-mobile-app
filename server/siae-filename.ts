/**
 * SIAE File Naming Module - Allegato C Compliant
 * 
 * Questo modulo gestisce TUTTI i nomi file SIAE in modo centralizzato.
 * Segue rigorosamente le specifiche Allegato C SIAE sezione 1.4.1.
 * 
 * FORMATO NOMI FILE (DTD v0039):
 * - RMG (Riepilogo Giornaliero):    RMG_YYYYMMDD_SSSSSSSS_NNN.xsi
 * - RPM (Riepilogo Mensile):        RPM_YYYYMM_SSSSSSSS_NNN.xsi
 * - RCA (Controllo Accessi):        RCA_YYYYMMDD_SSSSSSSS_NNN.xsi
 * 
 * REGOLE CRITICHE:
 * 1. NO timestamp nel nome file
 * 2. Data in formato CONTIGUO (YYYYMMDD o YYYYMM)
 * 3. Codice sistema esattamente 8 caratteri
 * 4. Progressivo sempre 3 cifre con padding zeros
 * 5. Estensione .xsi (mai .xsi.p7m per S/MIME)
 */

export type SiaeReportType = 'giornaliero' | 'mensile' | 'rca';

export interface SiaeFileNameParams {
  reportType: SiaeReportType;
  date: Date;
  progressivo: number;
  systemCode: string;
}

export interface SiaeFileNameResult {
  fileName: string;           // Nome file completo (es: RMG_20260120_P0004010_006.xsi)
  baseName: string;           // Nome senza estensione (es: RMG_20260120_P0004010_006)
  prefix: string;             // Prefisso tipo (RMG, RPM, RCA)
  dateComponent: string;      // Componente data (YYYYMMDD o YYYYMM)
  systemCode: string;         // Codice sistema (8 chars)
  progressivoFormatted: string; // Progressivo formattato (NNN)
}

/**
 * Genera un nome file SIAE conforme Allegato C
 * 
 * @throws Error se i parametri non sono validi
 */
export function generateSiaeFileName(params: SiaeFileNameParams): SiaeFileNameResult {
  const { reportType, date, progressivo, systemCode } = params;
  
  // VALIDAZIONE RIGOROSA
  
  // 1. Codice sistema DEVE essere esattamente 8 caratteri
  if (!systemCode || systemCode.length !== 8) {
    throw new Error(`SIAE_FILENAME_ERROR: Codice sistema deve essere 8 caratteri. Ricevuto: "${systemCode}" (${systemCode?.length || 0} chars)`);
  }
  
  // 2. Codice sistema deve contenere solo caratteri alfanumerici
  if (!/^[A-Za-z0-9]{8}$/.test(systemCode)) {
    throw new Error(`SIAE_FILENAME_ERROR: Codice sistema contiene caratteri non validi: "${systemCode}"`);
  }
  
  // 3. Progressivo deve essere tra 1 e 999
  if (progressivo < 1 || progressivo > 999) {
    throw new Error(`SIAE_FILENAME_ERROR: Progressivo deve essere tra 1 e 999. Ricevuto: ${progressivo}`);
  }
  
  // 4. Data deve essere valida
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`SIAE_FILENAME_ERROR: Data non valida`);
  }
  
  // Estrai componenti data
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prog = String(progressivo).padStart(3, '0');
  
  let prefix: string;
  let dateComponent: string;
  
  switch (reportType) {
    case 'mensile':
      prefix = 'RPM';
      dateComponent = `${year}${month}`;
      break;
    case 'rca':
      prefix = 'RCA';
      dateComponent = `${year}${month}${day}`;
      break;
    case 'giornaliero':
    default:
      prefix = 'RMG';
      dateComponent = `${year}${month}${day}`;
      break;
  }
  
  // Costruisci nome file - FORMATO ESATTO Allegato C
  const baseName = `${prefix}_${dateComponent}_${systemCode}_${prog}`;
  const fileName = `${baseName}.xsi`;
  
  // VALIDAZIONE FINALE - verifica formato
  validateSiaeFileName(fileName);
  
  return {
    fileName,
    baseName,
    prefix,
    dateComponent,
    systemCode,
    progressivoFormatted: prog
  };
}

/**
 * Valida che un nome file sia conforme al formato SIAE
 * 
 * @throws Error se il formato non è valido
 */
export function validateSiaeFileName(fileName: string): void {
  // Rimuovi estensione per validazione
  const nameWithoutExt = fileName.replace(/\.xsi(\.p7m)?$/i, '');
  
  // Pattern validi secondo Allegato C sezione 1.4.1
  const patterns = {
    RMG: /^RMG_(\d{8})_([A-Za-z0-9]{8})_(\d{3})$/,  // RMG_YYYYMMDD_SSSSSSSS_NNN
    RPM: /^RPM_(\d{6})_([A-Za-z0-9]{8})_(\d{3})$/,   // RPM_YYYYMM_SSSSSSSS_NNN
    RCA: /^RCA_(\d{8})_([A-Za-z0-9]{8})_(\d{3})$/    // RCA_YYYYMMDD_SSSSSSSS_NNN
  };
  
  const prefix = nameWithoutExt.substring(0, 3);
  const pattern = patterns[prefix as keyof typeof patterns];
  
  if (!pattern) {
    throw new Error(`SIAE_FILENAME_INVALID: Prefisso non riconosciuto "${prefix}". Deve essere RMG, RPM o RCA.`);
  }
  
  if (!pattern.test(nameWithoutExt)) {
    // Analizza errore specifico
    const parts = nameWithoutExt.split('_');
    
    if (parts.length !== 4) {
      throw new Error(`SIAE_FILENAME_INVALID: Nome file deve avere esattamente 4 parti separate da underscore. Trovate ${parts.length} parti: "${nameWithoutExt}"`);
    }
    
    // Verifica data
    const dateStr = parts[1];
    const expectedDateLen = prefix === 'RPM' ? 6 : 8;
    if (dateStr.length !== expectedDateLen || !/^\d+$/.test(dateStr)) {
      throw new Error(`SIAE_FILENAME_INVALID: Data deve essere ${expectedDateLen} cifre contigue. Trovato: "${dateStr}"`);
    }
    
    // Verifica codice sistema
    const sysCode = parts[2];
    if (sysCode.length !== 8) {
      throw new Error(`SIAE_FILENAME_INVALID: Codice sistema deve essere 8 caratteri. Trovato: "${sysCode}" (${sysCode.length} chars)`);
    }
    
    // Verifica progressivo
    const prog = parts[3];
    if (prog.length !== 3 || !/^\d{3}$/.test(prog)) {
      throw new Error(`SIAE_FILENAME_INVALID: Progressivo deve essere 3 cifre. Trovato: "${prog}"`);
    }
    
    throw new Error(`SIAE_FILENAME_INVALID: Formato nome file non conforme: "${nameWithoutExt}"`);
  }
  
  // Verifica nessun timestamp o suffisso extra
  if (/_\d{10,}/.test(nameWithoutExt)) {
    throw new Error(`SIAE_FILENAME_INVALID: Rilevato timestamp nel nome file! Il nome SIAE non deve contenere timestamp: "${nameWithoutExt}"`);
  }
}

/**
 * Genera il Subject email SIAE (= baseName senza estensione)
 * 
 * Allegato C sezione 1.4.1: Il subject email DEVE essere identico al nome file senza estensione
 */
export function generateSiaeEmailSubject(params: SiaeFileNameParams): string {
  const result = generateSiaeFileName(params);
  return result.baseName;
}

/**
 * Estrae informazioni da un nome file SIAE esistente
 */
export function parseSiaeFileName(fileName: string): SiaeFileNameResult | null {
  const nameWithoutExt = fileName.replace(/\.xsi(\.p7m)?$/i, '');
  const parts = nameWithoutExt.split('_');
  
  if (parts.length !== 4) {
    return null;
  }
  
  const prefix = parts[0];
  const dateComponent = parts[1];
  const systemCode = parts[2];
  const progressivoFormatted = parts[3];
  
  if (!['RMG', 'RPM', 'RCA'].includes(prefix)) {
    return null;
  }
  
  return {
    fileName: `${nameWithoutExt}.xsi`,
    baseName: nameWithoutExt,
    prefix,
    dateComponent,
    systemCode,
    progressivoFormatted
  };
}

/**
 * Log diagnostico per debug naming SIAE
 */
export function logSiaeFileNameDebug(context: string, params: SiaeFileNameParams, result: SiaeFileNameResult): void {
  console.log(`[SIAE-FILENAME] ${context}:`);
  console.log(`[SIAE-FILENAME]   Input: type=${params.reportType}, date=${params.date.toISOString()}, prog=${params.progressivo}, sysCode=${params.systemCode}`);
  console.log(`[SIAE-FILENAME]   Output: fileName="${result.fileName}"`);
  console.log(`[SIAE-FILENAME]   Components: prefix=${result.prefix}, date=${result.dateComponent}, sys=${result.systemCode}, prog=${result.progressivoFormatted}`);
  
  // Verifica che non ci siano timestamp
  if (/_\d{10,}/.test(result.fileName)) {
    console.error(`[SIAE-FILENAME] CRITICAL ERROR: Timestamp detected in filename! This will cause SIAE error 0600!`);
  }
}
