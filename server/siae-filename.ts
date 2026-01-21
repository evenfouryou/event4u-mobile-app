/**
 * SIAE File Naming Module - Allegato C Compliant
 * 
 * Questo modulo gestisce TUTTI i nomi file SIAE in modo centralizzato.
 * Segue rigorosamente le specifiche Allegato C SIAE.
 * 
 * FIX 2026-01-20: Formato UFFICIALE secondo documentazione Agenzia Entrate
 * 
 * FORMATO NOME FILE ALLEGATO (sezione 1.4.1):
 *   
 *   Giornaliero: RMG_AAAA_MM_00_###.xsi.p7m (giorno = 00)
 *   Mensile:     RPM_AAAA_MM_###.xsi.p7m (senza giorno)
 *   Evento:      RCA_AAAA_MM_GG_###.xsi.p7m (giorno specifico)
 * 
 * Dove:
 *   RMG = Riepilogo Musica Generale (giornaliero)
 *   RPM = Riepilogo Programmi Musicali (mensile)
 *   RCA = Riepilogo Controllo Accessi (eventi)
 *   LTA = Lista Titoli Accessi (alternativo eventi)
 *   AAAA_MM_GG = data SEPARATA da underscore
 *   ### = progressivo (001-999)
 *   .xsi = estensione XML SIAE
 *   .p7m = firma digitale
 * 
 * Esempi:
 *   RMG_2026_01_00_001.xsi.p7m (giornaliero - giorno = 00)
 *   RPM_2026_01_001.xsi.p7m (mensile - senza giorno)
 *   RCA_2026_01_20_001.xsi.p7m (evento - giorno specifico)
 * 
 * FORMATO SUBJECT EMAIL (sezione 1.5.3):
 *   XXX_AAAA_MM_GG_SSSSSSSS_###_XSI_V.XX.YY
 * Dove:
 *   SSSSSSSS = codice sistema (8 caratteri)
 *   V.XX.YY = versione formato
 * 
 * Esempi:
 *   RMG_2026_01_00_P0004010_001_XSI_V.01.00 (giornaliero - giorno = 00)
 *   RPM_2026_01_P0004010_001_XSI_V.01.00 (mensile - senza giorno)
 *   RCA_2026_01_20_P0004010_001_XSI_V.01.00 (evento - giorno specifico)
 * 
 * REGOLE CRITICHE:
 * 1. NO timestamp nel nome file
 * 2. Data SEPARATA da underscore (AAAA_MM_GG o AAAA_MM per mensili)
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
  fileName: string;           // Nome file completo (es: RMG_2026_01_20_006.xsi.p7m)
  baseName: string;           // Nome senza estensione (es: RMG_2026_01_20_006)
  prefix: string;             // Prefisso tipo (RMG, RPM, RCA)
  dateComponent: string;      // Componente data (AAAA_MM_GG o AAAA_MM per mensili)
  progressivoFormatted: string; // Progressivo formattato (NNN)
  isMonthly: boolean;         // True se report mensile (RPM) - data senza giorno
  fullDateComponent: string;  // Data completa AAAA_MM_GG (anche per mensili, usa 01)
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
  
  // FIX 2026-01-20: Prefisso dipende dal tipo di report (Allegato C)
  // - RMG = Riepilogo Musica Generale (giornaliero)
  // - RPM = Riepilogo Programmi Musicali (mensile)
  // - RCA = Riepilogo Controllo Accessi (eventi)
  let prefix: string;
  let dateComponent: string;
  
  switch (reportType) {
    case 'giornaliero':
      prefix = 'RMG';
      // FIX 2026-01-21: RMG usa giorno "00" (non giorno specifico!)
      // Esempio UFFICIALE SIAE: RMG_2015_09_00_001.xml
      dateComponent = `${year}_${month}_00`;
      break;
    case 'mensile':
      prefix = 'RPM';
      // Report mensile - usa formato AAAA_MM (senza giorno)
      dateComponent = `${year}_${month}`;
      break;
    case 'rca':
    default:
      prefix = 'RCA';
      dateComponent = `${year}_${month}_${day}`;
      break;
  }
  
  // Data completa con giorno (sempre, anche per mensili - usa 01 come giorno)
  const fullDateComponent = `${year}_${month}_${day}`;
  const isMonthly = reportType === 'mensile';
  
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
    progressivoFormatted: prog,
    isMonthly,
    fullDateComponent
  };
}

/**
 * Valida che un nome file sia conforme al formato SIAE Allegato C sezione 1.4.1
 * 
 * FORMATI VALIDI secondo tipo report:
 * - RMG_AAAA_MM_GG_###.xsi.p7m (giornaliero)
 * - RPM_AAAA_MM_###.xsi.p7m (mensile - senza giorno)
 * - RCA_AAAA_MM_GG_###.xsi.p7m (eventi)
 * - LTA_AAAA_MM_GG_###.xsi.p7m (alternativo eventi)
 * 
 * @throws Error se il formato non è valido
 */
export function validateSiaeFileName(fileName: string): void {
  // Rimuovi estensione per validazione
  const nameWithoutExt = fileName.replace(/\.xsi(\.p7m)?$/i, '');
  
  // FIX 2026-01-20: Pattern validi secondo Allegato C sezione 1.4.1
  // Pattern per RMG/RCA/LTA con giorno: XXX_AAAA_MM_GG_###
  // Pattern per RPM senza giorno: RPM_AAAA_MM_###
  const patternWithDay = /^(RMG|RCA|LTA)_(\d{4})_(\d{2})_(\d{2})_(\d{3})$/;
  const patternMonthly = /^(RPM)_(\d{4})_(\d{2})_(\d{3})$/;
  const pattern = patternWithDay.test(nameWithoutExt) ? patternWithDay : patternMonthly;
  
  const match = nameWithoutExt.match(pattern);
  
  if (!match) {
    // Analizza errore specifico
    const parts = nameWithoutExt.split('_');
    const prefix = parts[0];
    
    // Verifica prefisso
    if (!['RCA', 'LTA', 'RMG', 'RPM'].includes(prefix)) {
      throw new Error(`SIAE_FILENAME_INVALID: Prefisso non valido "${prefix}". Deve essere RMG, RPM, RCA o LTA.`);
    }
    
    // Numero parti dipende dal tipo:
    // - RPM (mensile): 4 parti (RPM_AAAA_MM_###)
    // - Altri: 5 parti (XXX_AAAA_MM_GG_###)
    const expectedParts = prefix === 'RPM' ? 4 : 5;
    if (parts.length !== expectedParts) {
      const expectedFormat = prefix === 'RPM' ? 'RPM_AAAA_MM_###' : 'XXX_AAAA_MM_GG_###';
      throw new Error(`SIAE_FILENAME_INVALID: Nome file deve avere ${expectedParts} parti (${expectedFormat}). Trovate ${parts.length} parti: "${nameWithoutExt}"`);
    }
    
    // Verifica anno (4 cifre)
    if (!/^\d{4}$/.test(parts[1])) {
      throw new Error(`SIAE_FILENAME_INVALID: Anno deve essere 4 cifre. Trovato: "${parts[1]}"`);
    }
    
    // Verifica mese (2 cifre)
    if (!/^\d{2}$/.test(parts[2])) {
      throw new Error(`SIAE_FILENAME_INVALID: Mese deve essere 2 cifre. Trovato: "${parts[2]}"`);
    }
    
    if (prefix !== 'RPM') {
      // Verifica giorno (2 cifre) - solo per RMG/RCA/LTA
      if (!/^\d{2}$/.test(parts[3])) {
        throw new Error(`SIAE_FILENAME_INVALID: Giorno deve essere 2 cifre. Trovato: "${parts[3]}"`);
      }
      
      // Verifica progressivo (3 cifre) - posizione 4 per report con giorno
      if (!/^\d{3}$/.test(parts[4])) {
        throw new Error(`SIAE_FILENAME_INVALID: Progressivo deve essere 3 cifre. Trovato: "${parts[4]}"`);
      }
    } else {
      // Verifica progressivo (3 cifre) - posizione 3 per RPM
      if (!/^\d{3}$/.test(parts[3])) {
        throw new Error(`SIAE_FILENAME_INVALID: Progressivo deve essere 3 cifre. Trovato: "${parts[3]}"`);
      }
    }
    
    const formatExample = prefix === 'RPM' ? 'RPM_AAAA_MM_###.xsi.p7m' : 'RMG_AAAA_MM_GG_###.xsi.p7m';
    throw new Error(`SIAE_FILENAME_INVALID: Formato nome file non conforme: "${nameWithoutExt}". Formato corretto: ${formatExample}`);
  }
  
  // Verifica nessun timestamp o suffisso extra
  if (/_\d{10,}/.test(nameWithoutExt)) {
    throw new Error(`SIAE_FILENAME_INVALID: Rilevato timestamp nel nome file! Il nome SIAE non deve contenere timestamp: "${nameWithoutExt}"`);
  }
}

/**
 * Genera il Subject email SIAE conforme Allegato C sezione 1.5.3
 * 
 * FORMATI per tipo report:
 * - RMG_AAAA_MM_GG_SSSSSSSS_###_XSI_V.XX.YY (giornaliero)
 * - RPM_AAAA_MM_SSSSSSSS_###_XSI_V.XX.YY (mensile - SENZA giorno)
 * - RCA_AAAA_MM_GG_SSSSSSSS_###_XSI_V.XX.YY (eventi)
 * 
 * NOTA: Il prefisso del Subject DEVE corrispondere al tipo report (RMG/RPM/RCA)
 * Il Subject include codice sistema (8 caratteri) a differenza del nome file allegato
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
  
  // FIX 2026-01-20: Subject deve usare il prefisso corretto per tipo report
  // e per RPM NON includere il giorno (Allegato C sezione 1.5.3)
  switch (reportType) {
    case 'mensile':
      // RPM: formato SENZA giorno - RPM_AAAA_MM_SSSSSSSS_###_XSI_V.XX.YY
      return `RPM_${year}_${month}_${systemCode}_${prog}_XSI_${formatVersion}`;
    case 'giornaliero':
      // FIX 2026-01-21: RMG usa giorno "00" nel Subject come nel nome file
      // Esempio UFFICIALE SIAE: RMG_2015_09_00_001.xml
      return `RMG_${year}_${month}_00_${systemCode}_${prog}_XSI_${formatVersion}`;
    case 'rca':
    default:
      // RCA: formato CON giorno - RCA_AAAA_MM_GG_SSSSSSSS_###_XSI_V.XX.YY
      return `RCA_${year}_${month}_${day}_${systemCode}_${prog}_XSI_${formatVersion}`;
  }
}

/**
 * Estrae informazioni da un nome file SIAE esistente
 * Supporta tutti i formati Allegato C:
 * - RMG_AAAA_MM_GG_### (giornaliero - 5 parti)
 * - RPM_AAAA_MM_### (mensile - 4 parti, senza giorno)
 * - RCA_AAAA_MM_GG_### (eventi - 5 parti)
 * - LTA_AAAA_MM_GG_### (alternativo eventi - 5 parti)
 */
export function parseSiaeFileName(fileName: string): SiaeFileNameResult | null {
  const nameWithoutExt = fileName.replace(/\.xsi(\.p7m)?$/i, '');
  const parts = nameWithoutExt.split('_');
  
  const prefix = parts[0];
  
  // Verifica prefisso valido
  if (!['RCA', 'LTA', 'RMG', 'RPM'].includes(prefix)) {
    return null;
  }
  
  // RPM ha 4 parti (senza giorno): RPM_AAAA_MM_###
  // Gli altri hanno 5 parti: XXX_AAAA_MM_GG_###
  const isMonthly = prefix === 'RPM';
  const expectedParts = isMonthly ? 4 : 5;
  
  if (parts.length !== expectedParts) {
    return null;
  }
  
  let dateComponent: string;
  let progressivoFormatted: string;
  let fullDateComponent: string;
  
  if (isMonthly) {
    // RPM: parts = [RPM, AAAA, MM, ###]
    dateComponent = `${parts[1]}_${parts[2]}`;
    progressivoFormatted = parts[3];
    fullDateComponent = `${parts[1]}_${parts[2]}_01`; // Usa 01 come giorno default
  } else {
    // RMG/RCA/LTA: parts = [XXX, AAAA, MM, GG, ###]
    dateComponent = `${parts[1]}_${parts[2]}_${parts[3]}`;
    progressivoFormatted = parts[4];
    fullDateComponent = dateComponent;
  }
  
  return {
    fileName: `${nameWithoutExt}.xsi.p7m`,
    baseName: nameWithoutExt,
    prefix,
    dateComponent,
    progressivoFormatted,
    isMonthly,
    fullDateComponent
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
