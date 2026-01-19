/**
 * SIAE Utilities - Funzioni condivise per la generazione di report SIAE
 * Conforme a Allegato B e C - Provvedimento Agenzia delle Entrate 04/03/2008
 */

// ==================== System Code Consistency Validation ====================

export interface SystemCodeValidationResult {
  valid: boolean;
  xmlSystemCode: string | null;
  filenameSystemCode: string;
  error?: string;
}

// ==================== SIAE Error Codes Table ====================

/**
 * Tabella completa degli errori SIAE
 * Basata su risposte reali da SIAE e Allegato B/C Provvedimento 04/03/2008
 * 
 * Severità:
 * - success: Operazione completata con successo
 * - warning: Operazione completata con anomalie
 * - error: Operazione fallita (bloccante)
 */
export const SIAE_ERROR_CODES = {
  '0000': { 
    severity: 'success', 
    description: 'Il riepilogo è stato elaborato correttamente' 
  },
  '0100': { 
    severity: 'warning', 
    description: 'Il riepilogo risulta già elaborato' 
  },
  '0600': { 
    severity: 'error', 
    description: 'Nome del file contenente il riepilogo sbagliato', 
    prevention: 'Verificare coerenza codice sistema tra XML e nome file' 
  },
  '0601': { 
    severity: 'error', 
    description: 'Oggetto del messaggio contenente il riepilogo sbagliato', 
    prevention: 'Verificare formato oggetto email' 
  },
  '0603': { 
    severity: 'error', 
    description: 'Le date dell\'oggetto, del nome file, e del contenuto del riepilogo non sono coerenti', 
    prevention: 'Verificare che DataGenerazione, data nel filename e data nell\'oggetto email coincidano' 
  },
  '2101': { 
    severity: 'error', 
    description: 'Tipo evento diverso da quelli previsti nella tabella 1 all.A provv. 23/7/2001', 
    prevention: 'Usare codice genere valido (01-99) dalla tabella SIAE' 
  },
  '2108': { 
    severity: 'error', 
    description: 'Autore non previsto per il Tipo Evento', 
    prevention: 'Rimuovere autore per eventi che non lo richiedono' 
  },
  '2110': { 
    severity: 'error', 
    description: 'Esecutore non indicato per il Tipo Evento', 
    prevention: 'Aggiungere esecutore per eventi che lo richiedono' 
  },
  '2111': { 
    severity: 'error', 
    description: 'Esecutore non previsto per il Tipo Evento', 
    prevention: 'Rimuovere esecutore per eventi che non lo richiedono' 
  },
  '2112': { 
    severity: 'error', 
    description: 'Nazionalità del Film non prevista nella codifica ISO 3166', 
    prevention: 'Usare codice ISO 3166 valido (IT, US, FR, etc.)' 
  },
  '2114': { 
    severity: 'error', 
    description: 'Nazionalità del Film non prevista per il Tipo Evento', 
    prevention: 'Rimuovere nazionalità film per eventi non cinematografici' 
  },
  '2606': { 
    severity: 'warning', 
    description: 'La denominazione del titolare è diversa da quella presente sulla smart-card associata al sistema', 
    prevention: 'Usare denominazione esatta dalla Smart Card' 
  },
  '3111': { 
    severity: 'error', 
    description: 'Il titolare del sistema non è presente nell\'anagrafica SIAE', 
    prevention: 'Verificare CF Titolare registrato presso SIAE' 
  },
  '3203': { 
    severity: 'error', 
    description: 'Codice del locale non presente nell\'anagrafica centralizzata SIAE', 
    prevention: 'Verificare codice locale SIAE (13 cifre)' 
  },
  '3706': { 
    severity: 'error', 
    description: 'Il prefisso o la lunghezza del nome del subject è sbagliato', 
    prevention: 'Verificare formato oggetto email S/MIME' 
  },
  '40601': { 
    severity: 'error', 
    description: 'Il riepilogo risulta illeggibile - formato errato', 
    prevention: 'Verificare struttura XML conforme DTD' 
  },
  '40603': { 
    severity: 'error', 
    description: 'Il riepilogo risulta illeggibile - encoding', 
    prevention: 'Verificare encoding UTF-8' 
  },
  '40604': { 
    severity: 'error', 
    description: 'Il riepilogo risulta illeggibile - firma non valida', 
    prevention: 'Verificare firma CAdES-BES' 
  },
  '40605': { 
    severity: 'error', 
    description: 'Il riepilogo risulta illeggibile, impossibile estrarre le informazioni', 
    prevention: 'Verificare XML, encoding, firma e formato complessivo' 
  },
  '42605': { 
    severity: 'error', 
    description: 'Errore validazione XML avanzata', 
    prevention: 'Verificare elementi obbligatori XML' 
  },
  '9999': { 
    severity: 'error', 
    description: 'Riepilogo Rifiutato: Eventi/Abbonamenti errati', 
    prevention: 'Controllare dettagli errori specifici nel corpo risposta' 
  },
} as const;

/**
 * Valida la coerenza del codice sistema tra XML e nome file.
 * Previene errori SIAE 0600 ("Nome del file contenente il riepilogo sbagliato")
 * e 0603 ("Le date dell'oggetto, del nome file, e del contenuto del riepilogo non sono coerenti").
 * 
 * Verifica tre elementi:
 * 1. Elementi SistemaEmissione/CodiceSistemaCA/CodiceSistemaEmissione
 * 2. Attributo NomeFile (per RMG/RPM)
 * 
 * @param xmlContent - Contenuto XML da validare
 * @param expectedSystemCode - Codice sistema atteso (usato per nome file)
 * @returns Oggetto con risultato validazione
 */
export function validateSystemCodeConsistency(
  xmlContent: string,
  expectedSystemCode: string
): SystemCodeValidationResult {
  let xmlSystemCode: string | null = null;
  
  // Determina tipo report e estrai codice sistema
  const isRCA = xmlContent.includes('<RiepilogoControlloAccessi');
  const isRMG = xmlContent.includes('<RiepilogoGiornaliero');
  const isRPM = xmlContent.includes('<RiepilogoMensile');
  
  if (isRCA) {
    // RCA: Extract CodiceSistemaCA or CodiceSistemaEmissione
    const codiceSistemaCAMatch = xmlContent.match(/<CodiceSistemaCA>([^<]+)<\/CodiceSistemaCA>/);
    const codiceSistemaEmissioneMatch = xmlContent.match(/<CodiceSistemaEmissione>([^<]+)<\/CodiceSistemaEmissione>/);
    xmlSystemCode = codiceSistemaCAMatch?.[1] || codiceSistemaEmissioneMatch?.[1] || null;
  } else if (isRMG || isRPM) {
    // RMG/RPM: Extract SistemaEmissione
    const sistemaEmissioneMatch = xmlContent.match(/<SistemaEmissione>([^<]+)<\/SistemaEmissione>/);
    xmlSystemCode = sistemaEmissioneMatch?.[1] || null;
  }
  
  // Se non troviamo codice sistema nell'XML, è un warning ma non un errore bloccante
  if (!xmlSystemCode) {
    return {
      valid: true,
      xmlSystemCode: null,
      filenameSystemCode: expectedSystemCode,
    };
  }
  
  // Verifica coerenza elemento SistemaEmissione/CodiceSistemaCA
  if (xmlSystemCode !== expectedSystemCode) {
    return {
      valid: false,
      xmlSystemCode,
      filenameSystemCode: expectedSystemCode,
      error: `ERRORE COERENZA CODICE SISTEMA: Il codice sistema nell'XML (${xmlSystemCode}) non corrisponde a quello usato per il nome file (${expectedSystemCode}). Questo causerebbe errore SIAE 0600/0603.`,
    };
  }
  
  // Verifica anche attributo NomeFile (solo per RMG/RPM che lo supportano)
  // FIX 2026-01-19: Formato SIAE Allegato C sezione 1.4.1 con DATA CONTIGUA
  // - RMG: RMG_YYYYMMDD_SSSSSSSS_NNN.xsi (es: RMG_20260118_P0004010_001.xsi) - 4 parti
  // - RPM: RPM_YYYYMM_SSSSSSSS_NNN.xsi (es: RPM_202601_P0004010_001.xsi) - 4 parti
  // - RCA: RCA_YYYYMMDD_SSSSSSSS_NNN.xsi (es: RCA_20260118_P0004010_001.xsi) - 4 parti
  // Il codice sistema è SEMPRE in posizione parts[2] (terzo elemento)
  if (isRMG || isRPM) {
    const nomeFileMatch = xmlContent.match(/NomeFile="([^"]+)"/);
    if (nomeFileMatch) {
      const nomeFileValue = nomeFileMatch[1];
      const parts = nomeFileValue.split('_');
      // FIX 2026-01-19: Formato con data contigua (4 parti totali)
      // RMG: RMG_YYYYMMDD_SSSSSSSS_PPP.xsi (4 parti: tipo, data, codice, prog)
      // RPM: RPM_YYYYMM_SSSSSSSS_PPP.xsi (4 parti: tipo, mese, codice, prog)
      // Il codice sistema è sempre in posizione parts[2]
      let nomeFileSystemCode: string | null = null;
      if ((parts[0] === 'RMG' || parts[0] === 'RPM') && parts.length >= 4) {
        nomeFileSystemCode = parts[2]; // XXX_DATACONTIGUA_SSSSSSSS_PPP
      }
      
      if (nomeFileSystemCode && nomeFileSystemCode !== expectedSystemCode) {
        return {
          valid: false,
          xmlSystemCode: nomeFileSystemCode,
          filenameSystemCode: expectedSystemCode,
          error: `ERRORE COERENZA ATTRIBUTO NOMEFILE: Il codice sistema nell'attributo NomeFile (${nomeFileSystemCode}) non corrisponde a quello atteso (${expectedSystemCode}). Questo causerebbe errore SIAE 0600.`,
        };
      }
    }
  }
  
  return {
    valid: true,
    xmlSystemCode,
    filenameSystemCode: expectedSystemCode,
  };
}

// ==================== SIAE File Name Format Validation ====================

/**
 * Interfaccia per risultato validazione formato nome file SIAE
 */
export interface SiaeFileNameValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsedData?: {
    reportType: 'RMG' | 'RPM' | 'RCA' | null;
    date: string | null;
    systemCode: string | null;
    progressivo: string | null;
    extension: string | null;
  };
}

/**
 * Valida il formato del nome file SIAE secondo Allegato C sezione 1.4.1
 * 
 * FORMATI VALIDI (data CONTIGUA senza underscore):
 * - RMG: RMG_YYYYMMDD_SSSSSSSS_NNN.xsi (es: RMG_20260118_P0004010_001.xsi)
 * - RPM: RPM_YYYYMM_SSSSSSSS_NNN.xsi (es: RPM_202601_P0004010_001.xsi)
 * - RCA: RCA_YYYYMMDD_SSSSSSSS_NNN.xsi (es: RCA_20260118_P0004010_001.xsi)
 * 
 * FORMATI NON VALIDI (data con underscore - causa errore SIAE 0600):
 * - RMG_2026_01_18_P0004010_001.xsi (SBAGLIATO!)
 * - RPM_2026_01_P0004010_001.xsi (SBAGLIATO!)
 * 
 * @param fileName - Nome file da validare (con o senza estensione)
 * @returns Risultato validazione con eventuali errori
 */
export function validateSiaeFileName(fileName: string): SiaeFileNameValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Rimuovi estensione per analisi
  const nameWithoutExt = fileName.replace(/\.(xsi|xsi\.p7m|p7m)$/i, '');
  const extension = fileName.match(/\.(xsi|xsi\.p7m|p7m)$/i)?.[0] || null;
  
  // Split per underscore
  const parts = nameWithoutExt.split('_');
  
  // Verifica numero parti (deve essere esattamente 4 per tutti i tipi)
  if (parts.length !== 4) {
    // Potrebbe essere il vecchio formato sbagliato con underscore nella data
    if (parts.length === 6 && (parts[0] === 'RMG' || parts[0] === 'RCA')) {
      errors.push(
        `FORMATO NOME FILE ERRATO: Rilevato formato con data separata da underscore (${fileName}). ` +
        `Il formato corretto usa data CONTIGUA: ${parts[0]}_${parts[1]}${parts[2]}${parts[3]}_${parts[4]}_${parts[5]}.xsi. ` +
        `Questo errore causa SIAE 0600 "Nome del file contenente il riepilogo sbagliato".`
      );
    } else if (parts.length === 5 && parts[0] === 'RPM') {
      errors.push(
        `FORMATO NOME FILE ERRATO: Rilevato formato con data separata da underscore (${fileName}). ` +
        `Il formato corretto usa data CONTIGUA: ${parts[0]}_${parts[1]}${parts[2]}_${parts[3]}_${parts[4]}.xsi. ` +
        `Questo errore causa SIAE 0600 "Nome del file contenente il riepilogo sbagliato".`
      );
    } else {
      errors.push(
        `FORMATO NOME FILE NON VALIDO: Il nome file deve avere esattamente 4 parti separate da underscore ` +
        `(es: RMG_20260118_P0004010_001.xsi). Trovate ${parts.length} parti in "${fileName}".`
      );
    }
    
    return { valid: false, errors, warnings };
  }
  
  const [prefix, datePart, systemCode, progressivo] = parts;
  
  // Verifica prefisso valido
  if (!['RMG', 'RPM', 'RCA'].includes(prefix)) {
    errors.push(
      `PREFISSO NON VALIDO: Il prefisso "${prefix}" non è riconosciuto. ` +
      `Prefissi validi: RMG (giornaliero), RPM (mensile), RCA (evento).`
    );
  }
  
  // Verifica formato data (deve essere contigua, non con underscore)
  if (prefix === 'RPM') {
    // RPM usa YYYYMM (6 cifre)
    if (!/^\d{6}$/.test(datePart)) {
      errors.push(
        `FORMATO DATA RPM NON VALIDO: La data per RPM deve essere YYYYMM (6 cifre contigue). ` +
        `Trovato: "${datePart}". Esempio corretto: 202601`
      );
    }
  } else {
    // RMG e RCA usano YYYYMMDD (8 cifre)
    if (!/^\d{8}$/.test(datePart)) {
      errors.push(
        `FORMATO DATA ${prefix} NON VALIDO: La data per ${prefix} deve essere YYYYMMDD (8 cifre contigue). ` +
        `Trovato: "${datePart}". Esempio corretto: 20260118`
      );
    }
  }
  
  // Verifica codice sistema (8 caratteri alfanumerici)
  if (!/^[A-Z0-9]{8}$/.test(systemCode)) {
    errors.push(
      `CODICE SISTEMA NON VALIDO: Il codice sistema deve essere di 8 caratteri alfanumerici maiuscoli. ` +
      `Trovato: "${systemCode}". Esempio corretto: P0004010`
    );
  }
  
  // Verifica progressivo (3 cifre)
  if (!/^\d{3}$/.test(progressivo)) {
    errors.push(
      `PROGRESSIVO NON VALIDO: Il progressivo deve essere di 3 cifre. ` +
      `Trovato: "${progressivo}". Esempio corretto: 001`
    );
  }
  
  // Warning se estensione mancante o non standard
  if (!extension) {
    warnings.push('Estensione file mancante. Attesa: .xsi o .xsi.p7m');
  } else if (extension.toLowerCase() !== '.xsi' && extension.toLowerCase() !== '.xsi.p7m') {
    warnings.push(`Estensione non standard: "${extension}". Attesa: .xsi o .xsi.p7m`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsedData: {
      reportType: ['RMG', 'RPM', 'RCA'].includes(prefix) ? prefix as 'RMG' | 'RPM' | 'RCA' : null,
      date: datePart,
      systemCode: systemCode,
      progressivo: progressivo,
      extension: extension,
    }
  };
}

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
 * Valori validi (da tabella 3 LTA - Lista Titoli Accessi):
 * - I1, I2, etc. = Intero (biglietto a prezzo pieno)
 * - R1, R2, etc. = Ridotto (biglietto con sconto)
 * - O1, O2, etc. = Omaggio (biglietto gratuito)
 * - ABB = Abbonamento
 */
export function normalizeSiaeTipoTitolo(rawCode: string | null | undefined, isComplimentary?: boolean): string {
  if (isComplimentary) return 'O1';
  if (!rawCode) return 'I1'; // Default: Intero tipo 1
  
  const code = rawCode.toUpperCase().trim();
  
  // Se già in formato SIAE (lettera + cifra), usa direttamente
  if (/^[IRO][0-9]$/.test(code)) {
    return code;
  }
  
  switch (code) {
    case 'I1':
    case 'I2':
    case 'INTERO':
    case 'FULL':
    case 'STANDARD':
    case 'NORMAL':
      return 'I1';
    
    case 'R1':
    case 'R2':
    case 'RIDOTTO':
    case 'REDUCED':
    case 'DISCOUNT':
      return 'R1';
    
    case 'O1':
    case 'O2':
    case 'OMAGGIO':
    case 'FREE':
    case 'COMPLIMENTARY':
    case 'GRATIS':
      return 'O1';
    
    case 'ABB':
    case 'ABBONAMENTO':
    case 'SUBSCRIPTION':
      return 'I1'; // Abbonamento trattato come Intero per RCA
    
    default:
      return 'I1'; // Default: Intero tipo 1
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

/**
 * Normalizza CodiceRichiedenteEmissioneSigillo per conformità SIAE
 * OBBLIGATORIO: 8 CIFRE nel formato TTCCCCCC (tutto numerico)
 * - TT = tipo richiesta (2 cifre): 01=prima emissione, 02=sostituzione, 03=annullamento, 04=duplicato, 05=emissione sistema
 * - CCCCCC = codice sistema (6 CIFRE numeriche)
 * 
 * Allegato B - Provvedimento Agenzia Entrate 04/03/2008
 * NOTA: SIAE richiede formato STRETTAMENTE NUMERICO (8 cifre), non alfanumerico
 */
export function formatCodiceRichiedente(rawCode: string | null | undefined, systemCode: string): string {
  // Se già nel formato corretto (8 cifre numeriche: 2 tipo + 6 codice)
  if (rawCode && /^[0-9]{8}$/.test(rawCode)) {
    return rawCode;
  }
  
  // Genera codice conforme: tipo "05" (emissione sistema) + 6 cifre
  const tipoRichiesta = '05'; // emissione da sistema automatico
  
  // Estrai solo le cifre dal systemCode, genera hash numerico se necessario
  let cifre = systemCode.replace(/\D/g, ''); // Solo cifre
  
  if (cifre.length >= 6) {
    // Prendi le ultime 6 cifre
    cifre = cifre.substring(cifre.length - 6);
  } else if (cifre.length > 0) {
    // Padda con zeri a sinistra
    cifre = cifre.padStart(6, '0');
  } else {
    // Nessuna cifra nel systemCode: genera hash numerico dal nome
    // Usa semplice hash basato su codici carattere
    let hash = 0;
    for (let i = 0; i < systemCode.length; i++) {
      hash = ((hash << 5) - hash + systemCode.charCodeAt(i)) | 0;
    }
    // Converti in 6 cifre positive
    cifre = String(Math.abs(hash) % 1000000).padStart(6, '0');
  }
  
  return tipoRichiesta + cifre;
}

/**
 * Normalizza CausaleAnnullamento per conformità SIAE
 * OBBLIGATORIO: 3 cifre nel range 001-010
 * 
 * Codici SIAE Allegato B:
 * 001 = Biglietto smarrito
 * 002 = Biglietto difettoso
 * 003 = Evento annullato
 * 004 = Cambio data evento
 * 005 = Richiesta cliente
 * 006 = Errore operatore
 * 007 = Doppia vendita
 * 008 = Overbooking
 * 009 = Annullamento fiscale
 * 010 = Cambio nominativo (Allegato B art. 5.4)
 */
export function normalizeCausaleAnnullamento(rawCode: string | null | undefined): string {
  if (!rawCode) return '005'; // Default: richiesta cliente
  
  const code = rawCode.replace(/\D/g, ''); // Solo cifre
  
  // Se già 3 cifre, verifica range
  if (code.length === 3) {
    const num = parseInt(code, 10);
    if (num >= 1 && num <= 10) {
      return code;
    }
  }
  
  // Se 1-2 cifre, padda a 3
  if (code.length >= 1 && code.length <= 2) {
    const num = parseInt(code, 10);
    if (num >= 1 && num <= 10) {
      return String(num).padStart(3, '0');
    }
  }
  
  // Default fallback
  return '005';
}

// ==================== File Naming ====================

/**
 * Genera NOME FILE ALLEGATO conforme Allegato C SIAE (Sezione 1.4.1)
 * 
 * FORMATO ALLEGATO: XXX_<yyyyMMdd>_<Sistema8cifre>_<nnn>.xsi(.p7m)
 * Esempio: RMG_20260113_P0004010_004.xsi
 * 
 * NOTA: Questo è DIVERSO dal Subject email che ha formato con separatori!
 * 
 * - XXX = Prefisso (RCA, RMG, RPM)
 * - yyyyMMdd = Data contigua (SENZA underscore)
 * - Sistema8cifre = Codice sistema a 8 caratteri (es: P0004010)
 * - nnn = Progressivo (001-999)
 * - .xsi = Estensione XML SIAE
 * - .p7m = aggiunta per file firmati CAdES
 */
export function generateSiaeAttachmentName(
  reportType: 'giornaliero' | 'mensile' | 'rca' | 'log',
  date: Date,
  progressivo: number,
  signatureFormat?: 'cades' | 'xmldsig' | null,
  systemCode?: string
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prog = String(progressivo).padStart(3, '0');
  
  // FIX 2026-01-17: Codice sistema OBBLIGATORIO - non usare default!
  // Il default EVENT4U1 NON è registrato presso SIAE e causa errore 0600
  if (!systemCode || systemCode.length !== 8) {
    console.error(`[SIAE-UTILS] CRITICAL: Codice sistema mancante o invalido in generateSiaeAttachmentName! Valore: "${systemCode || 'undefined'}"`);
    // Se il codice è il default o mancante, BLOCCA con errore esplicito invece di usare placeholder
    if (!systemCode || systemCode === SIAE_SYSTEM_CODE_DEFAULT) {
      throw new Error(`Codice sistema SIAE non configurato. Il codice "${SIAE_SYSTEM_CODE_DEFAULT}" non è registrato presso SIAE e causerebbe errore 0600.`);
    }
  }
  const sysCode = systemCode;
  
  // Estensione: .xsi.p7m per CAdES, .xsi per non firmato
  const extension = signatureFormat === 'cades' ? '.xsi.p7m' : '.xsi';
  
  // FIX 2026-01-19: Formato SIAE Allegato C sezione 1.4.1 usa DATA CONTIGUA (YYYYMMDD)
  // NON usare underscore tra i componenti della data!
  // Formato: XXX_YYYYMMDD_SSSSSSSS_NNN.xsi
  // Esempio corretto: RMG_20260118_P0004010_004.xsi
  // Esempio SBAGLIATO: RMG_2026_01_18_P0004010_004.xsi (causa errore SIAE 0600!)
  
  // NOTA: La data nel nome file DEVE corrispondere al formato della data nel contenuto XML
  // Nell'XML: Data="20260118" (contigua) - il nome file deve usare lo stesso formato
  
  // Formato allegato conforme SIAE Allegato C sezione 1.4.1:
  // - RMG: RMG_YYYYMMDD_SSSSSSSS_NNN.xsi (data contigua)
  // - RPM: RPM_YYYYMM_SSSSSSSS_NNN.xsi (anno-mese contiguo)
  // - RCA: RCA_YYYYMMDD_SSSSSSSS_NNN.xsi (data contigua)
  let result: string;
  switch (reportType) {
    case 'mensile':
      // RPM = Riepilogo Periodico Mensile
      result = `RPM_${year}${month}_${sysCode}_${prog}${extension}`;
      break;
    case 'log':
    case 'rca':
      // RCA = Riepilogo Controllo Accessi
      result = `RCA_${year}${month}${day}_${sysCode}_${prog}${extension}`;
      break;
    case 'giornaliero':
    default:
      // RMG = Riepilogo Giornaliero (report C1 giornaliero)
      result = `RMG_${year}${month}${day}_${sysCode}_${prog}${extension}`;
      break;
  }
  
  // FIX 2026-01-19: Log di debug per tracciare formato nome file
  console.log(`[SIAE-UTILS] generateSiaeAttachmentName: type=${reportType}, date=${date.toISOString()}, year=${year}, month=${month}, day=${day}, result=${result}`);
  
  // Validazione formato: verifica che non ci siano underscore extra nella data
  const parts = result.replace(/\.(xsi|xsi\.p7m|p7m)$/i, '').split('_');
  if (parts.length !== 4) {
    console.error(`[SIAE-UTILS] ERRORE CRITICO: Nome file generato con ${parts.length} parti invece di 4: ${result}`);
    console.error(`[SIAE-UTILS] Questo causerebbe errore SIAE 0600!`);
  }
  
  return result;
}

/**
 * Genera SUBJECT EMAIL conforme Allegato C SIAE
 * 
 * FIX 2026-01-16: Il subject DEVE essere IDENTICO al nome file allegato (senza estensione)
 * per evitare errore SIAE 0603 "Le date dell'oggetto, del nome file, e del contenuto non sono coerenti"
 * 
 * FORMATO SUBJECT = nome file senza estensione:
 * - RMG_YYYYMMDD_SSSSSSSS_NNN (giornaliero)
 * - RPM_YYYYMM_SSSSSSSS_NNN (mensile)
 * - RCA_YYYYMMDD_SSSSSSSS_NNN (evento)
 * 
 * Esempi:
 * - RMG_20260115_P0004010_012
 * - RPM_202601_P0004010_009
 * - RCA_20260115_P0004010_001
 */
export function generateSiaeSubject(
  reportType: 'giornaliero' | 'mensile' | 'rca' | 'log',
  date: Date,
  progressivo: number,
  systemCode?: string
): string {
  // Genera il nome file completo e rimuovi l'estensione
  // Questo garantisce che subject e nome file siano SEMPRE identici
  const fullFileName = generateSiaeAttachmentName(reportType, date, progressivo, null, systemCode);
  // Rimuovi .xsi o .xsi.p7m dall'estensione
  const subject = fullFileName.replace(/\.xsi(\.p7m)?$/, '');
  return subject;
}

/**
 * LEGACY: Mantiene compatibilità con codice esistente
 * Reindirizza a generateSiaeAttachmentName
 * 
 * @deprecated Usa generateSiaeAttachmentName per il nome file allegato
 *             e generateSiaeSubject per il Subject email
 */
export function generateSiaeFileName(
  reportType: 'giornaliero' | 'mensile' | 'rca' | 'log',
  date: Date,
  progressivo: number,
  signatureFormat?: 'cades' | 'xmldsig' | null,
  systemCode?: string
): string {
  return generateSiaeAttachmentName(reportType, date, progressivo, signatureFormat, systemCode);
}

// ==================== C1 Log XML Generation ====================
// Conforme a Log_v0040_20190627.dtd per trasmissione C1 evento a SIAE

/**
 * Struttura biglietto per generazione Log C1
 * Compatibile con siaeTickets schema
 */
export interface SiaeTicketForLog {
  id: string;
  fiscalSealCode: string | null;
  progressiveNumber: number;
  cardCode: string | null;
  emissionChannelCode: string | null;
  emissionDate: Date | string;
  ticketTypeCode: string;
  sectorCode: string;
  grossAmount: string | number;
  netAmount?: string | number | null;
  vatAmount?: string | number | null;
  prevendita?: string | number | null;
  prevenditaVat?: string | number | null;
  entertainmentTaxBase?: string | number | null;
  status: string;
  cancellationReasonCode?: string | null;
  cancellationDate?: Date | string | null;
  isComplimentary?: boolean;
  row?: string | null;
  seatNumber?: string | null;
  participantFirstName?: string | null;
  participantLastName?: string | null;
  originalTicketId?: string | null;
  originalProgressiveNumber?: number | null;
  replacedByTicketId?: string | null;
}

/**
 * Dati evento per generazione Log C1
 */
export interface SiaeEventForLog {
  id: string;
  name: string;
  date: Date | string;
  time?: Date | string | null;
  venueCode: string;
  genreCode: string;
  organizerTaxId: string;
  organizerName?: string;
  tipoTassazione?: 'S' | 'I';
  ivaPreassolta?: 'N' | 'B' | 'F';
}

/**
 * Parametri per generazione Log C1 XML
 */
export interface C1LogParams {
  companyId: string;
  eventId: string;
  event: SiaeEventForLog;
  tickets: SiaeTicketForLog[];
  systemConfig: {
    systemCode?: string;
    taxId?: string;
    businessName?: string;
    codiceRichiedente?: string;
  };
  companyName: string;
  taxId: string;
  cardNumber?: string;
}

/**
 * Risultato generazione Log C1 XML
 */
export interface C1LogResult {
  success: boolean;
  xml: string;
  transactionCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * @deprecated Use generateRCAXml instead. This function generates LogTransazione format
 * which is rejected by SIAE with error 40605 "Il riepilogo risulta illegibile".
 * 
 * Genera XML conforme al DTD Log_v0040_20190627.dtd per trasmissione C1 evento a SIAE
 * 
 * Struttura:
 * - LogTransazione contiene N elementi Transazione (uno per biglietto)
 * - Ogni Transazione ha attributi obbligatori e contiene TitoloAccesso
 * - Importi in CENTESIMI (moltiplicare euro * 100) usando toCentesimi()
 * - Date formato AAAAMMGG, ore formato HHMMSS o HHMM
 * 
 * CORREZIONI DTD-COMPLIANT (Log_v0040_20190627.dtd):
 * - SistemaEmissione: da systemConfig.systemCode o SIAE_SYSTEM_CODE_DEFAULT
 * - CartaAttivazione: da cardNumber o ticket.cardCode (warning se mancante)
 * - NumeroProgressivo: da ticket.progressiveNumber o fallback a indice+1
 * - OraEvento: da event.time (non usare new Date() come fallback)
 * - Tutti gli importi convertiti con toCentesimi()
 * 
 * @param params - Parametri per la generazione del Log C1
 * @returns Oggetto con XML generato, conteggio transazioni e eventuali errori
 */
export function generateC1LogXml(params: C1LogParams): C1LogResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const { event, tickets, systemConfig, companyName, taxId, cardNumber } = params;
  
  // Validazione parametri obbligatori
  if (!event) {
    errors.push('Evento obbligatorio per generazione Log C1');
    return { success: false, xml: '', transactionCount: 0, errors, warnings };
  }
  
  if (!tickets || tickets.length === 0) {
    errors.push('Almeno un biglietto obbligatorio per generazione Log C1');
    return { success: false, xml: '', transactionCount: 0, errors, warnings };
  }
  
  if (!taxId || taxId.length < 11) {
    errors.push('Codice Fiscale Titolare obbligatorio (11-16 caratteri)');
    return { success: false, xml: '', transactionCount: 0, errors, warnings };
  }
  
  // FIX 2026-01-17: Validazione codice sistema PRIMA di generare XML
  // Blocca la generazione se il codice sistema non è valido (previene errore 0600)
  const systemCodeResult = resolveSystemCodeSafe(null, systemConfig);
  if (!systemCodeResult.success || !systemCodeResult.systemCode) {
    errors.push(systemCodeResult.error || 'Codice sistema SIAE non configurato - impossibile generare Log C1');
    return { success: false, xml: '', transactionCount: 0, errors, warnings };
  }
  const sistemaEmissione = systemCodeResult.systemCode;
  
  // CF deve essere uppercase, max 16 caratteri, senza padding con spazi
  const cfTitolare = taxId.toUpperCase().substring(0, 16);
  const cfOrganizzatore = (event.organizerTaxId || taxId).toUpperCase().substring(0, 16);
  const tipoTassazione = event.tipoTassazione || 'S';
  const ivaPreassolta = event.ivaPreassolta || 'N';
  
  // CodiceRichiedenteEmissioneSigillo: OBBLIGATORIO 8 caratteri
  // Formato: TTCCCCCC dove TT = tipo richiesta (2 cifre), CCCCCC = codice sistema (6 cifre)
  // Tipi: 01=prima emissione, 02=sostituzione, 03=annullamento, 04=duplicato, 05=emissione sistema
  const codiceRichiedente = formatCodiceRichiedente(
    systemConfig?.codiceRichiedente,
    sistemaEmissione
  );
  
  // DEBUG: Log per tracciare valori generati
  console.log('[SIAE C1] CodiceRichiedenteEmissioneSigillo:', {
    input: systemConfig?.codiceRichiedente,
    systemCode: systemConfig?.systemCode,
    output: codiceRichiedente,
    isValid8Digits: /^[0-9]{8}$/.test(codiceRichiedente)
  });
  
  // 2. CartaAttivazione: NON usare "00000000"! Usa cardNumber o avvisa
  // Placeholder documentato solo se entrambi mancano
  const globalCartaAttivazione = cardNumber || null;
  if (!globalCartaAttivazione) {
    warnings.push('CartaAttivazione globale mancante - verrà usato il valore del singolo biglietto o placeholder');
  }
  
  // Dati evento
  const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
  const dataEvento = formatSiaeDateCompact(eventDate);
  
  // 5. OraEvento: usare event.time, non new Date() come fallback!
  // Se event.time è presente, usarlo; altrimenti estrarre l'ora da event.date
  let eventTimeValue: Date;
  if (event.time) {
    eventTimeValue = typeof event.time === 'string' ? new Date(event.time) : event.time;
  } else {
    // Usa l'ora dall'eventDate stesso, non un fallback a "ora corrente"
    eventTimeValue = eventDate;
  }
  const oraEvento = formatSiaeTimeHHMM(eventTimeValue);
  
  const codiceLocale = (event.venueCode || '0000000000001').padStart(13, '0');
  const tipoGenere = event.genreCode || 'S1';
  const titolo = escapeXml(event.name || 'Evento');
  
  // Costruzione XML
  let xmlLines: string[] = [];
  
  // Intestazione XML
  xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlLines.push('<!DOCTYPE LogTransazione SYSTEM "Log_v0040_20190627.dtd">');
  xmlLines.push('<LogTransazione>');
  
  // Genera una Transazione per ogni biglietto
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const ticketIndex = i + 1;
    
    // Validazione biglietto - SigilloFiscale è obbligatorio DTD
    const sigilloFiscale = ticket.fiscalSealCode || '';
    if (!sigilloFiscale) {
      warnings.push(`Ticket ${ticketIndex}: SigilloFiscale mancante`);
    }
    
    // 2. CartaAttivazione: priorità cardNumber globale > ticket.cardCode
    const ticketCarta = globalCartaAttivazione || ticket.cardCode;
    if (!ticketCarta) {
      warnings.push(`Ticket ${ticketIndex}: CartaAttivazione mancante (né cardNumber né ticket.cardCode)`);
    }
    // Placeholder documentato SOLO se necessario (mai "00000000" senza motivo)
    const cartaAttivazioneValue = ticketCarta || 'MANCANTE';
    
    // 7. Date formattate correttamente
    const emissionDate = typeof ticket.emissionDate === 'string' 
      ? new Date(ticket.emissionDate) 
      : ticket.emissionDate;
    const dataEmissione = formatSiaeDateCompact(emissionDate);
    // OraEmissione deve essere in formato HHMM (4 cifre), non HHMMSS (6 cifre)
    const oraEmissione = formatSiaeTimeHHMM(emissionDate);
    
    // 4. NumeroProgressivo: usa ticket.progressiveNumber o fallback a indice+1
    const progressivo = ticket.progressiveNumber || ticketIndex;
    const numeroProgressivo = String(progressivo).padStart(10, '0');
    
    // Tipo titolo e codice ordine normalizzati
    const tipoTitolo = normalizeSiaeTipoTitolo(ticket.ticketTypeCode, ticket.isComplimentary);
    const codiceOrdine = normalizeSiaeCodiceOrdine(ticket.sectorCode);
    
    // 3. Importi in centesimi - TUTTI con toCentesimi()
    const grossAmountCents = toCentesimi(ticket.grossAmount);
    const prevenditaCents = toCentesimi(ticket.prevendita || 0);
    const ivaCorrispettivoCents = toCentesimi(ticket.vatAmount || 0);
    const ivaPrevenditaCents = toCentesimi(ticket.prevenditaVat || 0);
    
    // ImponibileIntrattenimenti: calcolato solo per TipoTassazione="I" (Intrattenimento)
    // Per Spettacolo ("S") è sempre 0
    const imponibileIntrattenimenti = tipoTassazione === 'I' 
      ? toCentesimi(ticket.entertainmentTaxBase || ticket.grossAmount || 0)
      : 0;
    
    // Annullamento - considera status, cancellationReasonCode e cancellationDate
    // IMPORTANTE: Se cancellationReasonCode o cancellationDate sono presenti, il biglietto è annullato
    const isCancelled = isCancelledStatus(ticket.status) || !!ticket.cancellationReasonCode || !!ticket.cancellationDate;
    const annullamento = isCancelled ? 'S' : 'N';
    
    // Posto (opzionale)
    const posto = ticket.row && ticket.seatNumber 
      ? `${ticket.row}-${ticket.seatNumber}` 
      : (ticket.seatNumber || '');
    
    // 6. CausaleAnnullamento: normalizzata a 3 cifre (001-010) per conformità SIAE
    const causaleAnnullamento = isCancelled 
      ? normalizeCausaleAnnullamento(ticket.cancellationReasonCode)
      : '';
    
    // Costruzione attributi Transazione (ordine DTD)
    let transactionAttrs = [
      `CFOrganizzatore="${cfOrganizzatore}"`,
      `CFTitolare="${cfTitolare}"`,
      `IVAPreassolta="${ivaPreassolta}"`,
      `TipoTassazione="${tipoTassazione}"`,
      `Valuta="E"`,
      `SistemaEmissione="${escapeXml(sistemaEmissione)}"`,
      `CartaAttivazione="${escapeXml(cartaAttivazioneValue)}"`,
      `SigilloFiscale="${escapeXml(sigilloFiscale)}"`,
      `DataEmissione="${dataEmissione}"`,
      `OraEmissione="${oraEmissione}"`,
      `NumeroProgressivo="${numeroProgressivo}"`,
      `TipoTitolo="${tipoTitolo}"`,
      `CodiceOrdine="${codiceOrdine}"`,
      `CodiceRichiedenteEmissioneSigillo="${escapeXml(codiceRichiedente)}"`,
      `ImponibileIntrattenimenti="${imponibileIntrattenimenti}"`,
    ];
    
    // Attributi opzionali
    if (posto) {
      transactionAttrs.push(`Posto="${escapeXml(posto)}"`);
    }
    
    // 6. CausaleAnnullamento per biglietti annullati (OBBLIGATORIO se annullato)
    if (isCancelled) {
      transactionAttrs.push(`CausaleAnnullamento="${causaleAnnullamento}"`);
    }
    
    if (ticket.originalTicketId) {
      transactionAttrs.push(`OriginaleAnnullato="${escapeXml(ticket.originalTicketId)}"`);
    }
    
    // Apertura Transazione
    xmlLines.push(`  <Transazione ${transactionAttrs.join(' ')}>`);
    
    // TitoloAccesso
    xmlLines.push(`    <TitoloAccesso Annullamento="${annullamento}">`);
    xmlLines.push(`      <CorrispettivoLordo>${grossAmountCents}</CorrispettivoLordo>`);
    xmlLines.push(`      <Prevendita>${prevenditaCents}</Prevendita>`);
    xmlLines.push(`      <IVACorrispettivo>${ivaCorrispettivoCents}</IVACorrispettivo>`);
    xmlLines.push(`      <IVAPrevendita>${ivaPrevenditaCents}</IVAPrevendita>`);
    xmlLines.push(`      <CodiceLocale>${codiceLocale}</CodiceLocale>`);
    xmlLines.push(`      <DataEvento>${dataEvento}</DataEvento>`);
    xmlLines.push(`      <OraEvento>${oraEvento}</OraEvento>`);
    xmlLines.push(`      <TipoGenere>${tipoGenere}</TipoGenere>`);
    xmlLines.push(`      <Titolo>${titolo}</Titolo>`);
    
    // Partecipante (opzionale, se nominativo)
    if (ticket.participantFirstName && ticket.participantLastName) {
      xmlLines.push(`      <Partecipante>`);
      xmlLines.push(`        <Nome>${escapeXml(ticket.participantFirstName)}</Nome>`);
      xmlLines.push(`        <Cognome>${escapeXml(ticket.participantLastName)}</Cognome>`);
      xmlLines.push(`      </Partecipante>`);
    }
    
    // Chiusura TitoloAccesso
    xmlLines.push(`    </TitoloAccesso>`);
    
    // RiferimentoAnnullamento: OBBLIGATORIO quando Annullamento="S" (Allegato B art. 5.4)
    // NOTA DTD: RiferimentoAnnullamento è figlio DIRETTO di Transazione, NON di TitoloAccesso!
    // DTD: <!ELEMENT Transazione (TitoloAccesso?, ..., RiferimentoAnnullamento?)>
    if (isCancelled) {
      xmlLines.push(`    <RiferimentoAnnullamento>`);
      // OriginaleRiferimentoAnnullamento: progressivo del biglietto originale
      const originaleRef = ticket.originalProgressiveNumber || ticket.progressiveNumber || ticketIndex;
      xmlLines.push(`      <OriginaleRiferimentoAnnullamento>${String(originaleRef).padStart(10, '0')}</OriginaleRiferimentoAnnullamento>`);
      // CartaRiferimentoAnnullamento: carta usata per emissione originale
      xmlLines.push(`      <CartaRiferimentoAnnullamento>${escapeXml(cartaAttivazioneValue)}</CartaRiferimentoAnnullamento>`);
      // CausaleRiferimentoAnnullamento: motivo annullamento (3 cifre)
      xmlLines.push(`      <CausaleRiferimentoAnnullamento>${causaleAnnullamento}</CausaleRiferimentoAnnullamento>`);
      xmlLines.push(`    </RiferimentoAnnullamento>`);
    }
    
    xmlLines.push(`  </Transazione>`);
  }
  
  // Chiusura LogTransazione
  xmlLines.push('</LogTransazione>');
  
  const xml = xmlLines.join('\n');
  
  return {
    success: errors.length === 0,
    xml,
    transactionCount: tickets.length,
    errors,
    warnings
  };
}

// ==================== SIAE Configuration ====================

export const SIAE_SYSTEM_CODE_DEFAULT = 'EVENT4U1';

/**
 * Valida il formato del codice sistema SIAE.
 * 
 * Codici validi SIAE:
 * - Test: Iniziano con 'P' seguito da 7 cifre (es: P0004010)
 * - Produzione: 8 caratteri alfanumerici assegnati da SIAE
 * 
 * Il default EVENT4U1 NON è un codice registrato presso SIAE e causerà errore 0600.
 * 
 * @param systemCode - Codice da validare
 * @returns Oggetto con validità e eventuale messaggio di errore
 */
export function validateSiaeSystemCode(systemCode: string): { 
  valid: boolean; 
  isDefault: boolean;
  isTestCode: boolean;
  error?: string;
} {
  if (!systemCode || systemCode.length !== 8) {
    return {
      valid: false,
      isDefault: false,
      isTestCode: false,
      error: `Codice sistema "${systemCode}" non valido: deve essere esattamente 8 caratteri`
    };
  }
  
  const isDefault = systemCode === SIAE_SYSTEM_CODE_DEFAULT;
  const isTestCode = systemCode.toUpperCase().startsWith('P');
  
  // Il codice default EVENT4U1 NON è registrato presso SIAE
  if (isDefault) {
    return {
      valid: false,
      isDefault: true,
      isTestCode: false,
      error: `Codice sistema "${SIAE_SYSTEM_CODE_DEFAULT}" è un placeholder non registrato presso SIAE. Configurare un codice valido in Impostazioni SIAE oppure collegare una Smart Card attiva.`
    };
  }
  
  // Codici test (iniziano con P): verificare formato P + 7 cifre
  if (isTestCode) {
    const testCodePattern = /^P\d{7}$/;
    if (!testCodePattern.test(systemCode.toUpperCase())) {
      return {
        valid: false,
        isDefault: false,
        isTestCode: true,
        error: `Codice sistema test "${systemCode}" non valido: formato atteso P + 7 cifre (es: P0004010)`
      };
    }
  }
  
  return {
    valid: true,
    isDefault: false,
    isTestCode
  };
}

/**
 * Risultato della risoluzione del codice sistema SIAE
 */
export interface ResolveSystemCodeResult {
  success: boolean;
  systemCode: string | null;
  source: 'smartcard' | 'config' | 'none';
  error?: string;
}

/**
 * Risolve il codice sistema SIAE da usare in modo consistente in tutto il sistema.
 * 
 * PRIORITÀ (dalla più affidabile alla meno affidabile):
 * 1. Smart Card EFFF systemId - Codice ufficiale SIAE dalla carta di attivazione
 * 2. systemConfig.systemCode - Configurazione manuale dell'utente
 * 3. BLOCCO - NON ritorna più EVENT4U1 che causa errore 0600!
 * 
 * IMPORTANTE: Questo codice DEVE essere usato in modo consistente per:
 * - Nome file allegato (es: RPM_202601_P0004010_001.xsi)
 * - Attributo NomeFile nell'XML
 * - Elemento SistemaEmissione nell'XML
 * 
 * L'incongruenza tra questi valori causa errori SIAE:
 * - 0600: "Nome del file contenente il riepilogo sbagliato"
 * - 0603: "Le date dell'oggetto, del nome file, e del contenuto del riepilogo non sono coerenti"
 * 
 * FIX 2026-01-17: Non ritorna più il default EVENT4U1 che NON è registrato presso SIAE!
 * Ora ritorna null se nessun codice valido è disponibile, forzando il chiamante a gestire l'errore.
 * 
 * @param cachedEfff - Dati EFFF dalla smart card (opzionale)
 * @param systemConfig - Configurazione SIAE dell'azienda (opzionale)
 * @returns Oggetto con codice sistema o errore
 */
export function resolveSystemCodeSafe(
  cachedEfff?: { systemId?: string } | null,
  systemConfig?: { systemCode?: string } | null
): ResolveSystemCodeResult {
  // Priorità 1: Smart Card EFFF (codice ufficiale SIAE)
  if (cachedEfff?.systemId && cachedEfff.systemId.length === 8) {
    console.log(`[SIAE-UTILS] resolveSystemCodeSafe: using Smart Card EFFF systemId = ${cachedEfff.systemId}`);
    return { success: true, systemCode: cachedEfff.systemId, source: 'smartcard' };
  }
  
  // Priorità 2: Configurazione utente (ma NON se è il default EVENT4U1!)
  if (systemConfig?.systemCode && 
      systemConfig.systemCode.length === 8 && 
      systemConfig.systemCode !== SIAE_SYSTEM_CODE_DEFAULT) {
    console.log(`[SIAE-UTILS] resolveSystemCodeSafe: using systemConfig.systemCode = ${systemConfig.systemCode}`);
    return { success: true, systemCode: systemConfig.systemCode, source: 'config' };
  }
  
  // FIX 2026-01-17: NON ritornare EVENT4U1! Causa errore SIAE 0600!
  console.error(`[SIAE-UTILS] resolveSystemCodeSafe: NESSUN CODICE SISTEMA VALIDO! Configurare in Impostazioni SIAE o collegare Smart Card.`);
  return { 
    success: false, 
    systemCode: null, 
    source: 'none',
    error: `Codice sistema SIAE non configurato. Il codice "${SIAE_SYSTEM_CODE_DEFAULT}" non è registrato presso SIAE e causerebbe errore 0600. Configurare un codice valido in Impostazioni SIAE oppure collegare una Smart Card attiva.`
  };
}

/**
 * LEGACY: Risolve il codice sistema SIAE (mantiene compatibilità con codice esistente)
 * 
 * ATTENZIONE: Questa funzione ritorna ancora EVENT4U1 come fallback per compatibilità.
 * Usare resolveSystemCodeSafe() per nuove implementazioni!
 * 
 * @deprecated Usare resolveSystemCodeSafe() che non ritorna codici invalidi
 */
export function resolveSystemCode(
  cachedEfff?: { systemId?: string } | null,
  systemConfig?: { systemCode?: string } | null
): string {
  // Priorità 1: Smart Card EFFF (codice ufficiale SIAE)
  if (cachedEfff?.systemId && cachedEfff.systemId.length === 8) {
    console.log(`[SIAE-UTILS] resolveSystemCode: using Smart Card EFFF systemId = ${cachedEfff.systemId}`);
    return cachedEfff.systemId;
  }
  
  // Priorità 2: Configurazione utente
  if (systemConfig?.systemCode && systemConfig.systemCode.length === 8) {
    console.log(`[SIAE-UTILS] resolveSystemCode: using systemConfig.systemCode = ${systemConfig.systemCode}`);
    return systemConfig.systemCode;
  }
  
  // Priorità 3: Default (DEPRECATO - causa errore 0600!)
  console.warn(`[SIAE-UTILS] resolveSystemCode: WARNING - using default ${SIAE_SYSTEM_CODE_DEFAULT} which is NOT registered with SIAE!`);
  return SIAE_SYSTEM_CODE_DEFAULT;
}

/**
 * FIX 2026-01-17: Risolve codice sistema per trasmissioni S/MIME (RCA)
 * 
 * Per trasmissioni firmate con S/MIME, SIAE verifica che il codice sistema nell'XML
 * corrisponda a quello registrato sulla Smart Card usata per la firma.
 * 
 * IMPORTANTE: Se la Smart Card ha un systemId, questo DEVE essere usato.
 * Usare un codice diverso (es. siaeConfig.systemCode) causa errore SIAE 0600:
 * "Nome del file contenente il riepilogo sbagliato"
 * 
 * @param cachedEfff - Dati EFFF dalla Smart Card (OBBLIGATORIO per S/MIME)
 * @param systemConfig - Configurazione SIAE dell'azienda (fallback)
 * @returns Oggetto con codice sistema e source, oppure errore
 */
export interface ResolveSystemCodeForSmimeResult {
  success: boolean;
  systemCode: string | null;
  source: 'smartcard' | 'config' | 'none';
  warning?: string;
  error?: string;
}

export function resolveSystemCodeForSmime(
  cachedEfff?: { systemId?: string } | null,
  systemConfig?: { systemCode?: string } | null
): ResolveSystemCodeForSmimeResult {
  // Per S/MIME, la Smart Card è OBBLIGATORIA (ma se non connessa, proviamo fallback a config)
  if (!cachedEfff) {
    console.warn(`[SIAE-UTILS] resolveSystemCodeForSmime: EFFF data non disponibile - Smart Card non connessa o non letta`);
    
    // FIX 2026-01-18: Fallback a systemConfig anche se Smart Card non connessa
    // Questo permette di testare/usare il sistema senza Desktop Bridge attivo
    // MA la firma S/MIME non sarà possibile senza Smart Card!
    if (systemConfig?.systemCode && systemConfig.systemCode.length === 8) {
      const validation = validateSiaeSystemCode(systemConfig.systemCode);
      if (validation.valid) {
        console.warn(`[SIAE-UTILS] resolveSystemCodeForSmime: FALLBACK a siaeConfig.systemCode = ${systemConfig.systemCode} (Smart Card non connessa)`);
        return {
          success: true,
          systemCode: systemConfig.systemCode,
          source: 'config',
          warning: `Smart Card non connessa. Usato codice dalla configurazione (${systemConfig.systemCode}). ` +
                   `Collegare la Smart Card per la firma S/MIME obbligatoria.`
        };
      }
    }
    
    return {
      success: false,
      systemCode: null,
      source: 'none',
      error: 'SMART_CARD_REQUIRED: Per trasmissioni SIAE è necessario connettere una Smart Card tramite Desktop Bridge, ' +
             'oppure configurare il codice sistema in Impostazioni SIAE > Configurazione Sistema.'
    };
  }
  
  // Priorità 1: Smart Card EFFF (UNICO codice valido per S/MIME)
  if (cachedEfff.systemId && cachedEfff.systemId.length === 8) {
    console.log(`[SIAE-UTILS] resolveSystemCodeForSmime: using Smart Card EFFF systemId = ${cachedEfff.systemId}`);
    
    // Verifica coerenza con siaeConfig se configurato
    if (systemConfig?.systemCode && 
        systemConfig.systemCode.length === 8 && 
        systemConfig.systemCode !== cachedEfff.systemId) {
      console.warn(`[SIAE-UTILS] resolveSystemCodeForSmime: ATTENZIONE - siaeConfig.systemCode (${systemConfig.systemCode}) != Smart Card (${cachedEfff.systemId})`);
      console.warn(`[SIAE-UTILS] Per S/MIME verrà usato il codice dalla Smart Card. Aggiornare la configurazione se necessario.`);
      return { 
        success: true, 
        systemCode: cachedEfff.systemId, 
        source: 'smartcard',
        warning: `Configurazione SIAE (${systemConfig.systemCode}) diversa dalla Smart Card (${cachedEfff.systemId}). Usato codice Smart Card per evitare errore SIAE 0600.`
      };
    }
    
    return { success: true, systemCode: cachedEfff.systemId, source: 'smartcard' };
  }
  
  // Smart Card connessa ma senza systemId valido (Desktop Bridge non legge EFFF)
  console.warn(`[SIAE-UTILS] resolveSystemCodeForSmime: Smart Card connessa ma systemId non disponibile da EFFF: "${cachedEfff.systemId || '(vuoto)'}"`);
  
  // FIX 2026-01-18: Fallback a systemConfig SE la Smart Card è connessa
  // Questo permette di funzionare con Desktop Bridge che non leggono EFFF
  // L'utente DEVE assicurarsi che il codice configurato corrisponda alla Smart Card inserita
  if (systemConfig?.systemCode && systemConfig.systemCode.length === 8) {
    const validation = validateSiaeSystemCode(systemConfig.systemCode);
    if (validation.valid) {
      console.warn(`[SIAE-UTILS] resolveSystemCodeForSmime: FALLBACK a siaeConfig.systemCode = ${systemConfig.systemCode}`);
      console.warn(`[SIAE-UTILS] ATTENZIONE: Assicurarsi che questo codice corrisponda alla Smart Card inserita!`);
      return {
        success: true,
        systemCode: systemConfig.systemCode,
        source: 'config',
        warning: `Smart Card connessa ma EFFF non letto. Usato codice dalla configurazione (${systemConfig.systemCode}). ` +
                 `Assicurarsi che corrisponda alla Smart Card inserita per evitare errore SIAE 0600.`
      };
    }
  }
  
  // Nessun fallback disponibile
  return {
    success: false,
    systemCode: null,
    source: 'none',
    error: `SMARTCARD_SYSTEMID_INVALID: La Smart Card non contiene un codice sistema valido (letto: "${cachedEfff.systemId || '(vuoto)'}"). ` +
           `Configurare il codice sistema in Impostazioni SIAE > Configurazione Sistema. ` +
           `Il codice deve corrispondere alla Smart Card inserita.`
  };
}

/**
 * Stati ticket che indicano annullamento/cancellazione per conteggi SIAE
 * Usare questa costante in tutto il sistema per coerenza
 */
export const SIAE_CANCELLED_STATUSES = [
  'cancelled',
  'annullato', 
  'refunded',
  'rimborsato',
  'voided',
  'annullato_rimborso',
  'annullato_rivendita',  // Secondary ticketing marketplace
  'annullato_cambio_nominativo'  // Name change - original ticket
] as const;

/**
 * Verifica se uno status indica un biglietto annullato
 */
export function isCancelledStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return SIAE_CANCELLED_STATUSES.includes(status.toLowerCase() as any);
}

/**
 * Normalizza codice genere SIAE a formato 2 cifre
 * I codici SIAE sono definiti nella tabella siae_event_genres e sono già validi.
 * Questa funzione si limita a normalizzare il formato (padding a 2 cifre).
 * 
 * Codici SIAE secondo Allegato A - Tabella 1 Provvedimento 23/07/2001:
 * - 01-04: Cinema
 * - 05-29: Sport
 * - 30-40: Giochi e scommesse (Intrattenimento)
 * - 41-44: Musei e gallerie
 * - 45-59: Teatro e concerti
 * - 60-69: Ballo e intrattenimento musicale (DISCOTECA = 61)
 * - 70-79: Fiere, mostre, parchi
 * 
 * IMPORTANTE: Per discoteche/club il codice corretto è 61 (Ballo con musica preregistrata)
 */
export function mapToSiaeTipoGenere(genreCode: string | null | undefined): string {
  if (!genreCode) return '61'; // Default: discoteca (ballo con musica preregistrata)
  
  const code = genreCode.trim();
  
  // Se è un codice numerico, normalizza a 2 cifre
  if (/^\d{1,2}$/.test(code)) {
    return code.padStart(2, '0');
  }
  
  // Se è già 2 cifre, ritorna così com'è
  if (/^\d{2}$/.test(code)) {
    return code;
  }
  
  // Per codici non numerici (legacy), usa default discoteca
  console.warn(`[SIAE] TipoGenere '${code}' non numerico, usando 61 (discoteca)`);
  return '61';
}

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
 * Risultato validazione pre-trasmissione centralizzata
 * Unifica tutti i controlli preventivi SIAE
 */
export interface PreTransmissionValidationResult {
  canTransmit: boolean;
  errors: Array<{
    code: string;
    field: string;
    message: string;
    resolution?: string;
    siaeErrorCode?: string;
  }>;
  warnings: Array<{
    code: string;
    field: string;
    message: string;
    suggestion?: string;
    siaeErrorCode?: string;
  }>;
  details: {
    xmlValid: boolean;
    systemCodeConsistent: boolean;
    encodingValid: boolean;
    fieldLengthsValid: boolean;
    datesCoherent: boolean;
  };
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

/**
 * Validazione specifica per RiepilogoControlloAccessi (C1 report)
 * Conforme a RiepilogoControlloAccessi_v0100_20080201.dtd
 */
export interface C1ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    ticketsCount: number;
    totalAmount: number;
    hasEvents: boolean;
    hasTitolare: boolean;
    systemCode: string | null;
    taxId: string | null;
  };
}

export function validateC1Report(xml: string): C1ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const summary = {
    ticketsCount: 0,
    totalAmount: 0,
    hasEvents: false,
    hasTitolare: false,
    systemCode: null as string | null,
    taxId: null as string | null,
  };
  
  // 1. Verifica dichiarazione XML
  if (!xml.startsWith('<?xml')) {
    errors.push('Dichiarazione XML mancante');
  }
  
  // Detect report format: LogTransazione, RiepilogoControlloAccessi, RiepilogoGiornaliero, RiepilogoMensile
  const isLog = xml.includes('<LogTransazione');
  const isRCA = xml.includes('<RiepilogoControlloAccessi');
  const isRG = xml.includes('<RiepilogoGiornaliero');
  const isRM = xml.includes('<RiepilogoMensile');
  
  if (!isLog && !isRCA && !isRG && !isRM) {
    errors.push('Elemento radice mancante (atteso LogTransazione, RiepilogoControlloAccessi, RiepilogoGiornaliero o RiepilogoMensile)');
  }
  
  // Validate based on format
  if (isLog) {
    // ============ LogTransazione format (C1 evento) ============
    // Conforme a Log_v0040_20190627.dtd
    
    if (!xml.includes('<!DOCTYPE LogTransazione')) {
      warnings.push('DOCTYPE LogTransazione mancante');
    }
    
    // Verifica presenza di almeno una Transazione
    const transactionCount = (xml.match(/<Transazione\s/g) || []).length;
    if (transactionCount === 0) {
      errors.push('Nessuna Transazione trovata nel LogTransazione');
    } else {
      summary.ticketsCount = transactionCount;
      summary.hasEvents = true;
    }
    
    // Verifica attributi obbligatori nelle Transazioni
    const requiredAttrs = ['CFOrganizzatore', 'CFTitolare', 'SistemaEmissione', 'CartaAttivazione', 
                          'SigilloFiscale', 'DataEmissione', 'OraEmissione', 'NumeroProgressivo',
                          'TipoTitolo', 'CodiceOrdine', 'CodiceRichiedenteEmissioneSigillo'];
    for (const attr of requiredAttrs) {
      if (!xml.includes(`${attr}="`)) {
        errors.push(`Attributo obbligatorio mancante: ${attr}`);
      }
    }
    
    // Estrai informazioni dal primo CFTitolare trovato
    const cfMatch = xml.match(/CFTitolare="([^"]+)"/);
    if (cfMatch) {
      summary.taxId = cfMatch[1];
      summary.hasTitolare = true;
    }
    
    const sysMatch = xml.match(/SistemaEmissione="([^"]+)"/);
    if (sysMatch) {
      summary.systemCode = sysMatch[1];
    }
    
    // Somma importi CorrispettivoLordo (in centesimi)
    const corrMatches = Array.from(xml.matchAll(/<CorrispettivoLordo>(\d+)<\/CorrispettivoLordo>/g));
    for (const match of corrMatches) {
      summary.totalAmount += parseInt(match[1], 10);
    }
    
    // Verifica elementi TitoloAccesso
    if (!xml.includes('<TitoloAccesso')) {
      errors.push('Nessun elemento TitoloAccesso trovato');
    }
    
    // Verifica chiusura
    if (!xml.includes('</LogTransazione>')) {
      errors.push('Chiusura elemento LogTransazione mancante');
    }
    
  } else if (isRCA) {
    // ============ RiepilogoControlloAccessi format ============
    if (!xml.includes('<!DOCTYPE RiepilogoControlloAccessi')) {
      warnings.push('DOCTYPE RiepilogoControlloAccessi mancante');
    }
    
    // Verifica sezione Titolare (formato RCA)
    if (xml.includes('<Titolare>')) {
      summary.hasTitolare = true;
      
      const cfMatch = xml.match(/<CFTitolareCA>([^<]+)<\/CFTitolareCA>/);
      if (cfMatch) {
        summary.taxId = cfMatch[1];
        if (cfMatch[1].length !== 16 && cfMatch[1].length !== 11) {
          errors.push(`Codice Fiscale non valido (${cfMatch[1].length} caratteri, attesi 16 o 11)`);
        }
      } else {
        errors.push('CFTitolareCA mancante - Codice Fiscale obbligatorio');
      }
      
      const codeMatch = xml.match(/<CodiceSistemaCA>([^<]+)<\/CodiceSistemaCA>/);
      if (codeMatch) {
        summary.systemCode = codeMatch[1];
      } else {
        errors.push('CodiceSistemaCA mancante - Codice Sistema obbligatorio');
      }
      
      if (!xml.includes('<DenominazioneTitolareCA>')) {
        errors.push('DenominazioneTitolareCA mancante');
      }
      if (!xml.includes('<DataRiepilogo>')) {
        errors.push('DataRiepilogo mancante');
      }
      if (!xml.includes('<ProgressivoRiepilogo>')) {
        errors.push('ProgressivoRiepilogo mancante');
      }
    } else {
      errors.push('Sezione Titolare mancante - obbligatoria');
    }
    
    // Verifica evento (formato RCA)
    if (xml.includes('<Evento>')) {
      summary.hasEvents = true;
      const rcaEventRequired = ['CFOrganizzatore', 'DenominazioneOrganizzatore', 'TipologiaOrganizzatore', 
                                'DenominazioneLocale', 'CodiceLocale', 'DataEvento', 'OraEvento', 'TipoGenere'];
      for (const field of rcaEventRequired) {
        if (!xml.includes(`<${field}>`)) {
          errors.push(`Campo evento obbligatorio mancante: ${field}`);
        }
      }
    } else {
      warnings.push('Nessun evento trovato nel report');
    }
    
    if (!xml.includes('</RiepilogoControlloAccessi>')) {
      errors.push('Chiusura elemento RiepilogoControlloAccessi mancante');
    }
    
  } else if (isRG || isRM) {
    // ============ RiepilogoGiornaliero / RiepilogoMensile format ============
    const rootTag = isRG ? 'RiepilogoGiornaliero' : 'RiepilogoMensile';
    
    // Verifica sezione Titolare (formato RG/RM)
    if (xml.includes('<Titolare>')) {
      summary.hasTitolare = true;
      
      // In RG/RM format uses <CodiceFiscale> and <SistemaEmissione>
      const cfMatch = xml.match(/<Titolare>[^]*?<CodiceFiscale>([^<]+)<\/CodiceFiscale>/);
      if (cfMatch) {
        summary.taxId = cfMatch[1];
        if (cfMatch[1].length !== 16 && cfMatch[1].length !== 11) {
          errors.push(`Codice Fiscale non valido (${cfMatch[1].length} caratteri, attesi 16 o 11)`);
        }
      } else {
        errors.push('CodiceFiscale in Titolare mancante');
      }
      
      const codeMatch = xml.match(/<Titolare>[^]*?<SistemaEmissione>([^<]+)<\/SistemaEmissione>/);
      if (codeMatch) {
        summary.systemCode = codeMatch[1];
      } else {
        errors.push('SistemaEmissione in Titolare mancante');
      }
      
      if (!/<Titolare>[^]*?<Denominazione>/.test(xml)) {
        errors.push('Denominazione in Titolare mancante');
      }
    } else {
      errors.push('Sezione Titolare mancante - obbligatoria');
    }
    
    // Verifica Organizzatore
    if (xml.includes('<Organizzatore>')) {
      const orgRequired = ['Denominazione', 'CodiceFiscale', 'TipoOrganizzatore'];
      for (const field of orgRequired) {
        const regex = new RegExp(`<Organizzatore>[^]*?<${field}>`);
        if (!regex.test(xml)) {
          warnings.push(`Campo Organizzatore mancante: ${field}`);
        }
      }
    }
    
    // Verifica evento (formato RG/RM)
    if (xml.includes('<Evento>')) {
      summary.hasEvents = true;
      const rgEventRequired = ['Denominazione', 'CodiceLocale', 'DataEvento', 'OraEvento'];
      for (const field of rgEventRequired) {
        if (!xml.includes(`<${field}>`)) {
          warnings.push(`Campo evento mancante: ${field}`);
        }
      }
      
      // Conta biglietti da Quantita in TitoliEmessi
      const quantitaMatches = Array.from(xml.matchAll(/<TitoliEmessi>[^]*?<Quantita>(\d+)<\/Quantita>/g));
      for (const match of quantitaMatches) {
        summary.ticketsCount += parseInt(match[1], 10);
      }
      
      // Somma importi da CorrispettivoLordo
      const corrMatchesRG = Array.from(xml.matchAll(/<CorrispettivoLordo>(\d+)<\/CorrispettivoLordo>/g));
      for (const match of corrMatchesRG) {
        summary.totalAmount += parseInt(match[1], 10);
      }
    } else {
      // FIX 2026-01-18: Per report giornaliero (RMG), 0 biglietti è permesso (solo warning)
      // Per report mensile (RPM), rimane un errore bloccante
      if (isRG) {
        warnings.push('Nessun evento trovato nel report giornaliero (RMG con 0 biglietti)');
      } else {
        errors.push('SIAE_NO_EVENTS: Nessun elemento <Evento> trovato. Il report C1 mensile richiede almeno un evento con biglietti emessi.');
      }
    }
    
    if (!xml.includes(`</${rootTag}>`)) {
      errors.push(`Chiusura elemento ${rootTag} mancante`);
    }
  }
  
  // Verifica caratteri XML validi (comune)
  const invalidChars = xml.match(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g);
  if (invalidChars && invalidChars.length > 0) {
    errors.push(`Caratteri XML non validi trovati: ${invalidChars.slice(0, 5).join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary
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

// ==================== RiepilogoControlloAccessi XML Generation ====================
// Conforme a RiepilogoControlloAccessi_v0100_20080201.dtd per trasmissione a SIAE
// Allegato B - Provvedimento Agenzia delle Entrate 04/03/2008

/**
 * Parametri per generazione RiepilogoControlloAccessi XML
 */
export interface RCAParams {
  companyId: string;
  eventId: string;
  event: SiaeEventForLog;
  tickets: SiaeTicketForLog[];
  sectors?: { code: string; name: string; capacity: number }[];
  systemConfig: {
    systemCode?: string;
    taxId?: string;
    businessName?: string;
  };
  companyName: string;
  taxId: string;
  progressivo?: number;
  venueName?: string;
  author?: string;
  performer?: string;
  forceSubstitution?: boolean; // Forza Sostituzione="S" per reinvio report già elaborati (errore 40604)
}

/**
 * Risultato generazione RiepilogoControlloAccessi XML
 * FIX 2026-01-18: Aggiunti campi autoritativi per allineamento resend
 */
export interface RCAResult {
  success: boolean;
  xml: string;
  ticketCount: number;           // Totale biglietti processati
  cancelledCount: number;        // Biglietti annullati (isCancelledStatus + replaced)
  totalGrossAmount: number;      // Totale lordo TUTTI i biglietti
  activeGrossAmount: number;     // Totale lordo solo biglietti attivi
  sectorSummaries: RCASectorSummary[];
  errors: string[];
  warnings: string[];
}

/**
 * Riepilogo per settore/tipo titolo
 */
export interface RCASectorSummary {
  ordinePosto: string;
  tipoTitolo: string;
  capienza: number;
  totaleLTA: number;
  noAccessoTradiz: number;
  automatizzatiTradiz: number;
  manualiTradiz: number;
  annullatiTradiz: number;
}

/**
 * Mappa OrdinePosto interno a codice SIAE (2 caratteri)
 * Allegato B - OrdinePosto
 * PL=Platea, GA=Galleria, PA=Palco, AN=Anello, etc.
 */
export function normalizeOrdinePosto(sectorCode: string | null | undefined): string {
  if (!sectorCode) return 'PL';
  
  const code = sectorCode.toUpperCase().trim();
  
  // Se già in formato corretto (2 lettere)
  if (/^[A-Z]{2}$/.test(code)) {
    return code;
  }
  
  // Mappature comuni
  const mappings: Record<string, string> = {
    'PLATEA': 'PL',
    'GALLERIA': 'GA',
    'PALCO': 'PA',
    'LOGGIONE': 'LO',
    'BALCONATA': 'BA',
    'PARTERRE': 'PT',
    'TRIBUNA': 'TR',
    'ANELLO': 'AN',
    'CURVA': 'CU',
    'PRATO': 'PR',
    'VIP': 'VI',
    'A0': 'PL',
    'A1': 'PL',
    'B0': 'GA',
    'B1': 'GA',
    'P0': 'PL',
    'P1': 'PL',
  };
  
  return mappings[code] || 'PL';
}

/**
 * Mappa TipoTitolo interno a codice SIAE per RCA (2 caratteri)
 * Allegato B - TipoTitolo per RiepilogoControlloAccessi
 * 
 * NOTA: I codici SIAE ufficiali sono R1, R2, I1, I2, O1, etc. (da tabella 3 LTA)
 * R1 = Ridotto tipo 1, I1 = Intero tipo 1, O1 = Omaggio tipo 1
 * 
 * Manteniamo i codici originali se già conformi al formato SIAE
 */
export function normalizeRCATipoTitolo(ticketTypeCode: string | null | undefined, isComplimentary?: boolean): string {
  if (isComplimentary) return 'O1'; // Omaggio tipo 1
  if (!ticketTypeCode) return 'I1'; // Intero tipo 1 (default)
  
  const code = ticketTypeCode.toUpperCase().trim();
  
  // Se già in formato SIAE (lettera + cifra), usa direttamente
  if (/^[RIO][0-9]$/.test(code)) {
    return code;
  }
  
  const mappings: Record<string, string> = {
    'R1': 'R1',
    'R2': 'R2',
    'I1': 'I1',
    'I2': 'I2',
    'O1': 'O1',
    'ABB': 'I1', // Abbonamento -> trattato come Intero per RCA
    'INTERO': 'I1',
    'RIDOTTO': 'R1',
    'OMAGGIO': 'O1',
    'ABBONAMENTO': 'I1',
    'FULL': 'I1',
    'STANDARD': 'I1',
    'REDUCED': 'R1',
    'FREE': 'O1',
    'COMPLIMENTARY': 'O1',
    'IN': 'I1',
    'RI': 'R1',
    'OM': 'O1',
    'AB': 'I1',
  };
  
  return mappings[code] || 'I1'; // Default: Intero tipo 1
}

/**
 * Genera XML conforme al DTD ControlloAccessi_v0001_20080626.dtd per trasmissione a SIAE
 * 
 * Struttura ufficiale (conforme al DTD):
 * - RiepilogoControlloAccessi (con attributo Sostituzione="N"|"S")
 *   - Titolare: dati del titolare del sistema (ordine elementi specifico!)
 *   - Evento+: uno o più eventi (non AnagraficaEvento!)
 *     - SistemaEmissione+: sistemi che hanno emesso biglietti
 *       - Titoli*: raggruppati per CodiceOrdinePosto (settore)
 *         - TotaleTipoTitolo+: statistiche per tipo titolo (R1, R2, O1, etc.)
 *       - Abbonamenti*: simile a Titoli, per abbonamenti
 * 
 * IMPORTANTE: Questo formato è richiesto per SIAE (Allegato B Provvedimento 04/03/2008)
 * Il formato LogTransazione genera errore 40605 "Il riepilogo risulta illegibile"
 * 
 * Riferimenti:
 * - DTD: ControlloAccessi_v0001_20080626.dtd
 * - Esempio: RCA_2015_09_22_001.xml
 * 
 * @param params - Parametri per la generazione del RCA
 * @returns Oggetto con XML generato, conteggio biglietti e eventuali errori
 */
export function generateRCAXml(params: RCAParams): RCAResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const { event, tickets, sectors, systemConfig, companyName, taxId, progressivo = 1, venueName, author, performer, forceSubstitution = false } = params;
  
  // Validazione parametri obbligatori
  // FIX 2026-01-18: Early return con tutti i campi dell'interfaccia RCAResult
  // NOTA: Clona gli array errors/warnings per evitare condivisione di stato tra chiamate
  const emptyResult = (): RCAResult => ({
    success: false, xml: '', ticketCount: 0, cancelledCount: 0,
    totalGrossAmount: 0, activeGrossAmount: 0, sectorSummaries: [], 
    errors: [...errors], warnings: [...warnings]
  });
  
  if (!event) {
    errors.push('Evento obbligatorio per generazione RiepilogoControlloAccessi');
    return emptyResult();
  }
  
  if (!taxId || taxId.length < 11) {
    errors.push('Codice Fiscale Titolare obbligatorio (11-16 caratteri)');
    return emptyResult();
  }
  
  // FIX 2026-01-17: Validazione codice sistema PRIMA di generare XML
  // Blocca la generazione se il codice sistema non è valido (previene errore 0600)
  const systemCodeResult = resolveSystemCodeSafe(null, systemConfig);
  if (!systemCodeResult.success || !systemCodeResult.systemCode) {
    errors.push(systemCodeResult.error || 'Codice sistema SIAE non configurato - impossibile generare report');
    return emptyResult();
  }
  const sistemaEmissione = systemCodeResult.systemCode;
  const cfTitolare = taxId.toUpperCase().substring(0, 16);
  const cfOrganizzatore = (event.organizerTaxId || taxId).toUpperCase().substring(0, 16);
  // PRIORITÀ: systemConfig.businessName > companyName (fix warning 2606)
  const denominazioneTitolare = escapeXml((systemConfig?.businessName || companyName || 'N/D').substring(0, 60));
  const denominazioneOrganizzatore = escapeXml((event.organizerName || systemConfig?.businessName || companyName || 'N/D').substring(0, 60));
  
  // Date/time evento (usato anche per DataRiepilogo - DEVE coincidere con nome file!)
  const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
  const dataEvento = formatSiaeDateCompact(eventDate);
  
  // FIX 2026-01-07: DataRiepilogo DEVE essere uguale alla data nel nome file!
  // SIAE Error 40603: "Le date dell'oggetto, del nome file, e del contenuto del riepilogo non sono coerenti"
  // Il nome file usa eventDate (es: RCA_2025_12_17_001.xsi), quindi DataRiepilogo deve essere 20251217
  const now = new Date();
  const dataRiepilogo = formatSiaeDateCompact(eventDate); // USA eventDate, NON now!
  const dataGenerazione = formatSiaeDateCompact(now);
  const oraGenerazione = formatSiaeTimeCompact(now);
  let eventTimeValue: Date;
  if (event.time) {
    eventTimeValue = typeof event.time === 'string' ? new Date(event.time) : event.time;
  } else {
    eventTimeValue = eventDate;
  }
  const oraEvento = formatSiaeTimeHHMM(eventTimeValue);
  
  // Codici evento
  const codiceLocale = (event.venueCode || '0000000000001').padStart(13, '0').substring(0, 13);
  // Usa mappatura centralizzata per TipoGenere SIAE (fix error 2101)
  const tipoGenere = mapToSiaeTipoGenere(event.genreCode);
  const titoloEvento = escapeXml((event.name || 'Evento').substring(0, 100));
  const nomeLocale = escapeXml((venueName || event.name || 'Locale').substring(0, 100));
  
  // Per tipoGenere Intrattenimento, Autore/Esecutore/NazionalitaFilm NON devono essere presenti
  // SIAE Warning 2108/2110/2112/2114: OMETTERE completamente i tag, non usare '-'
  // Codici Intrattenimento: 30-40 (giochi), 60-69 (ballo/discoteca), 70-74 (fiere/mostre), 79 (luna park)
  // Codici Cinema (01-04): richiedono NazionalitaFilm (ISO 3166)
  // Codici Teatro/Concerti (45-59): richiedono Autore ed Esecutore
  const genreNum = parseInt(tipoGenere);
  const isIntrattenimento = (genreNum >= 30 && genreNum <= 40) || 
                            (genreNum >= 60 && genreNum <= 69) || 
                            (genreNum >= 70 && genreNum <= 74) || 
                            genreNum === 79;
  const isCinema = genreNum >= 1 && genreNum <= 4;
  const isTeatroConcerti = genreNum >= 45 && genreNum <= 59;
  
  // Genera valori solo se necessari (verranno inclusi condizionalmente nell'XML)
  const autore = isTeatroConcerti ? escapeXml((author || event.name || 'N/D').substring(0, 100)) : null;
  const esecutore = isTeatroConcerti ? escapeXml((performer || event.organizerName || companyName || 'N/D').substring(0, 100)) : null;
  const nazionalitaFilm = isCinema ? 'IT' : null;
  
  // SpettacoloIntrattenimento: S=spettacolo, I=intrattenimento (default S)
  const spettacoloIntrattenimento = event.tipoTassazione === 'I' ? 'I' : 'S';
  
  // IncidenzaIntrattenimento: percentuale 0-100 (solo per intrattenimento)
  const incidenzaIntrattenimento = spettacoloIntrattenimento === 'I' ? '50' : '0';
  
  // TipologiaOrganizzatore: G=Generico, E=Esercizio, P=Parrocchiale
  const tipologiaOrganizzatore = 'G';
  
  // ==================== Aggregazione biglietti per settore/tipo ====================
  // Struttura: Map<settore, Map<tipoTitolo, contatori>>
  interface TicketCounters {
    totaleLTA: number;
    noAccessoTradiz: number;
    noAccessoDigitali: number;
    automatizzatiTradiz: number;
    automatizzatiDigitali: number;
    manualiTradiz: number;
    manualiDigitali: number;
    annullatiTradiz: number;
    annullatiDigitali: number;
  }
  
  interface SectorData {
    codiceOrdinePosto: string;
    capienza: number;
    tipoTitoli: Map<string, TicketCounters>;
  }
  
  const sectorMap = new Map<string, SectorData>();
  
  // Calcola capienza per settore dai dati sectors
  const sectorCapacity = new Map<string, number>();
  if (sectors && sectors.length > 0) {
    for (const sector of sectors) {
      const code = normalizeCodiceOrdinePosto(sector.code);
      sectorCapacity.set(code, (sectorCapacity.get(code) || 0) + sector.capacity);
    }
  }
  
  // FIX 2026-01-18: Calcola valori autoritativi durante l'iterazione
  // Questi valori verranno usati per i metadati della trasmissione (allineamento resend)
  let totalCancelledCount = 0;
  let totalGrossAmount = 0;
  let activeGrossAmount = 0;
  
  // Aggrega biglietti per settore → tipo titolo
  for (const ticket of tickets) {
    const codiceOrdinePosto = normalizeCodiceOrdinePosto(ticket.sectorCode);
    const tipoTitolo = normalizeSiaeTipoTitolo(ticket.ticketTypeCode, ticket.isComplimentary);
    
    // Calcola valori autoritativi per ogni biglietto
    const grossAmount = parseFloat(String(ticket.grossAmount || '0'));
    totalGrossAmount += grossAmount;
    
    // Crea settore se non esiste
    if (!sectorMap.has(codiceOrdinePosto)) {
      sectorMap.set(codiceOrdinePosto, {
        codiceOrdinePosto,
        capienza: sectorCapacity.get(codiceOrdinePosto) || 1000,
        tipoTitoli: new Map()
      });
    }
    
    const sector = sectorMap.get(codiceOrdinePosto)!;
    
    // Crea tipo titolo se non esiste
    if (!sector.tipoTitoli.has(tipoTitolo)) {
      sector.tipoTitoli.set(tipoTitolo, {
        totaleLTA: 0,
        noAccessoTradiz: 0,
        noAccessoDigitali: 0,
        automatizzatiTradiz: 0,
        automatizzatiDigitali: 0,
        manualiTradiz: 0,
        manualiDigitali: 0,
        annullatiTradiz: 0,
        annullatiDigitali: 0,
      });
    }
    
    const counters = sector.tipoTitoli.get(tipoTitolo)!;
    counters.totaleLTA++;
    
    // Mappa status a contatori (usiamo solo Tradiz - tradizionale)
    const status = (ticket.status || '').toLowerCase();
    
    // FIX 2026-01-18: Traccia annullati con isCancelledStatus + replacedByTicketId
    // Un biglietto è annullato se ha status annullato OPPURE è stato sostituito
    const isCancelled = isCancelledStatus(status) || !!(ticket as any).replacedByTicketId;
    
    if (isCancelled) {
      counters.annullatiTradiz++;
      totalCancelledCount++;
    } else if (status === 'validated' || status === 'used' || status === 'usato' || status === 'checked_in') {
      activeGrossAmount += grossAmount;
      const isManual = (ticket as any).manualCheckin === true;
      if (isManual) {
        counters.manualiTradiz++;
      } else {
        counters.automatizzatiTradiz++;
      }
    } else {
      // Non annullato e non validato = no accesso
      activeGrossAmount += grossAmount;
      counters.noAccessoTradiz++;
    }
  }
  
  // Se non ci sono settori, crea uno di default
  if (sectorMap.size === 0) {
    sectorMap.set('UN', {
      codiceOrdinePosto: 'UN',
      capienza: 1000,
      tipoTitoli: new Map([['R1', {
        totaleLTA: 0,
        noAccessoTradiz: 0,
        noAccessoDigitali: 0,
        automatizzatiTradiz: 0,
        automatizzatiDigitali: 0,
        manualiTradiz: 0,
        manualiDigitali: 0,
        annullatiTradiz: 0,
        annullatiDigitali: 0,
      }]])
    });
    warnings.push('Nessun biglietto trovato, generato riepilogo vuoto');
  }
  
  // Crea sectorSummaries per compatibilità con interfaccia di ritorno
  const sectorSummaries: RCASectorSummary[] = [];
  for (const [, sector] of Array.from(sectorMap)) {
    for (const [tipoTitolo, counters] of Array.from(sector.tipoTitoli)) {
      sectorSummaries.push({
        ordinePosto: sector.codiceOrdinePosto,
        tipoTitolo,
        capienza: sector.capienza,
        totaleLTA: counters.totaleLTA,
        noAccessoTradiz: counters.noAccessoTradiz,
        automatizzatiTradiz: counters.automatizzatiTradiz,
        manualiTradiz: counters.manualiTradiz,
        annullatiTradiz: counters.annullatiTradiz,
      });
    }
  }
  
  // ==================== Generazione XML conforme a DTD ====================
  const xmlLines: string[] = [];
  
  // Intestazione XML con encoding ISO-8859-1 come richiesto da SIAE (Allegato C)
  // IMPORTANTE: SIAE richiede Latin-1, non UTF-8
  xmlLines.push('<?xml version="1.0" encoding="ISO-8859-1"?>');
  
  // DOCTYPE obbligatorio per validazione DTD SIAE
  // Riferimento: ControlloAccessi_v0001_20080626.dtd
  xmlLines.push('<!DOCTYPE RiepilogoControlloAccessi SYSTEM "ControlloAccessi_v0001_20080626.dtd">');
  
  // Root element con attributo Sostituzione OBBLIGATORIO
  // Se forceSubstitution=true, usa "S" per reinviare report già elaborati (errore 40604)
  const sostituzioneValue = forceSubstitution ? 'S' : 'N';
  xmlLines.push(`<RiepilogoControlloAccessi Sostituzione="${sostituzioneValue}">`);
  
  if (forceSubstitution) {
    warnings.push('Sostituzione forzata: il report sostituirà quello precedentemente elaborato');
  }
  
  // ==================== Titolare ====================
  // ORDINE ESATTO da DTD: DenominazioneTitolareCA, CFTitolareCA, CodiceSistemaCA,
  // DataRiepilogo, DataGenerazioneRiepilogo, OraGenerazioneRiepilogo, ProgressivoRiepilogo
  xmlLines.push('    <Titolare>');
  xmlLines.push(`        <DenominazioneTitolareCA>${denominazioneTitolare}</DenominazioneTitolareCA>`);
  xmlLines.push(`        <CFTitolareCA>${cfTitolare}</CFTitolareCA>`);
  xmlLines.push(`        <CodiceSistemaCA>${escapeXml(sistemaEmissione)}</CodiceSistemaCA>`);
  xmlLines.push(`        <DataRiepilogo>${dataRiepilogo}</DataRiepilogo>`);
  xmlLines.push(`        <DataGenerazioneRiepilogo>${dataGenerazione}</DataGenerazioneRiepilogo>`);
  xmlLines.push(`        <OraGenerazioneRiepilogo>${oraGenerazione}</OraGenerazioneRiepilogo>`);
  xmlLines.push(`        <ProgressivoRiepilogo>${progressivo}</ProgressivoRiepilogo>`);
  xmlLines.push('    </Titolare>');
  
  // ==================== Evento ====================
  // ORDINE ESATTO da DTD: CFOrganizzatore, DenominazioneOrganizzatore, TipologiaOrganizzatore,
  // SpettacoloIntrattenimento, IncidenzaIntrattenimento, DenominazioneLocale, CodiceLocale,
  // DataEvento, OraEvento, TipoGenere, TitoloEvento, Autore, Esecutore,
  // NazionalitaFilm, NumOpereRappresentate, SistemaEmissione+
  xmlLines.push('    <Evento>');
  xmlLines.push(`        <CFOrganizzatore>${cfOrganizzatore}</CFOrganizzatore>`);
  xmlLines.push(`        <DenominazioneOrganizzatore>${denominazioneOrganizzatore}</DenominazioneOrganizzatore>`);
  xmlLines.push(`        <TipologiaOrganizzatore>${tipologiaOrganizzatore}</TipologiaOrganizzatore>`);
  xmlLines.push(`        <SpettacoloIntrattenimento>${spettacoloIntrattenimento}</SpettacoloIntrattenimento>`);
  xmlLines.push(`        <IncidenzaIntrattenimento>${incidenzaIntrattenimento}</IncidenzaIntrattenimento>`);
  xmlLines.push(`        <DenominazioneLocale>${nomeLocale}</DenominazioneLocale>`);
  xmlLines.push(`        <CodiceLocale>${codiceLocale}</CodiceLocale>`);
  xmlLines.push(`        <DataEvento>${dataEvento}</DataEvento>`);
  xmlLines.push(`        <OraEvento>${oraEvento}</OraEvento>`);
  xmlLines.push(`        <TipoGenere>${tipoGenere}</TipoGenere>`);
  xmlLines.push(`        <TitoloEvento>${titoloEvento}</TitoloEvento>`);
  // Includi Autore/Esecutore/NazionalitaFilm SOLO per categorie che li richiedono
  // Per Intrattenimento (30-40, 60-69, 70-74, 79): OMETTI completamente
  // Per Teatro/Concerti (45-59): includi Autore e Esecutore
  // Per Cinema (01-04): includi NazionalitaFilm
  if (autore !== null) {
    xmlLines.push(`        <Autore>${autore}</Autore>`);
  }
  if (esecutore !== null) {
    xmlLines.push(`        <Esecutore>${esecutore}</Esecutore>`);
  }
  if (nazionalitaFilm !== null) {
    xmlLines.push(`        <NazionalitaFilm>${nazionalitaFilm}</NazionalitaFilm>`);
  }
  xmlLines.push(`        <NumOpereRappresentate>1</NumOpereRappresentate>`);
  
  // ==================== SistemaEmissione ====================
  // Contiene: CodiceSistemaEmissione, Titoli*, Abbonamenti*
  xmlLines.push('        <SistemaEmissione>');
  xmlLines.push(`            <CodiceSistemaEmissione>${escapeXml(sistemaEmissione)}</CodiceSistemaEmissione>`);
  
  // ==================== Titoli (raggruppati per settore) ====================
  // Ogni settore genera un elemento <Titoli> con N elementi <TotaleTipoTitolo>
  for (const [, sector] of Array.from(sectorMap)) {
    xmlLines.push('            <Titoli>');
    xmlLines.push(`                <CodiceOrdinePosto>${sector.codiceOrdinePosto}</CodiceOrdinePosto>`);
    xmlLines.push(`                <Capienza>${sector.capienza}</Capienza>`);
    
    // TotaleTipoTitolo per ogni tipo in questo settore
    for (const [tipoTitolo, counters] of Array.from(sector.tipoTitoli)) {
      xmlLines.push('                <TotaleTipoTitolo>');
      xmlLines.push(`                    <TipoTitolo>${tipoTitolo}</TipoTitolo>`);
      xmlLines.push(`                    <TotaleTitoliLTA>${counters.totaleLTA}</TotaleTitoliLTA>`);
      xmlLines.push(`                    <TotaleTitoliNoAccessoTradiz>${counters.noAccessoTradiz}</TotaleTitoliNoAccessoTradiz>`);
      xmlLines.push(`                    <TotaleTitoliNoAccessoDigitali>${counters.noAccessoDigitali}</TotaleTitoliNoAccessoDigitali>`);
      xmlLines.push(`                    <TotaleTitoliAutomatizzatiTradiz>${counters.automatizzatiTradiz}</TotaleTitoliAutomatizzatiTradiz>`);
      xmlLines.push(`                    <TotaleTitoliAutomatizzatiDigitali>${counters.automatizzatiDigitali}</TotaleTitoliAutomatizzatiDigitali>`);
      xmlLines.push(`                    <TotaleTitoliManualiTradiz>${counters.manualiTradiz}</TotaleTitoliManualiTradiz>`);
      xmlLines.push(`                    <TotaleTitoliManualiDigitali>${counters.manualiDigitali}</TotaleTitoliManualiDigitali>`);
      xmlLines.push(`                    <TotaleTitoliAnnullatiTradiz>${counters.annullatiTradiz}</TotaleTitoliAnnullatiTradiz>`);
      xmlLines.push(`                    <TotaleTitoliAnnullatiDigitali>${counters.annullatiDigitali}</TotaleTitoliAnnullatiDigitali>`);
      xmlLines.push(`                    <TotaleTitoliDaspatiTradiz>0</TotaleTitoliDaspatiTradiz>`);
      xmlLines.push(`                    <TotaleTitoliDaspatiDigitali>0</TotaleTitoliDaspatiDigitali>`);
      xmlLines.push(`                    <TotaleTitoliRubatiTradiz>0</TotaleTitoliRubatiTradiz>`);
      xmlLines.push(`                    <TotaleTitoliRubatiDigitali>0</TotaleTitoliRubatiDigitali>`);
      xmlLines.push(`                    <TotaleTitoliBLTradiz>0</TotaleTitoliBLTradiz>`);
      xmlLines.push(`                    <TotaleTitoliBLDigitali>0</TotaleTitoliBLDigitali>`);
      xmlLines.push('                </TotaleTipoTitolo>');
    }
    
    xmlLines.push('            </Titoli>');
  }
  
  // Abbonamenti è opzionale (Abbonamenti*) - non lo includiamo se non usiamo abbonamenti
  
  xmlLines.push('        </SistemaEmissione>');
  xmlLines.push('    </Evento>');
  xmlLines.push('</RiepilogoControlloAccessi>');
  
  // IMPORTANTE: Usa CRLF come terminatore di riga (obbligatorio per SIAE)
  // RFC 5751 e Allegato C richiedono CRLF nei messaggi S/MIME
  const xml = xmlLines.join('\r\n');
  
  // FIX 2026-01-18: Ritorna valori autoritativi calcolati durante iterazione
  // Questi sono i valori che devono essere usati per i metadati della trasmissione
  return {
    success: errors.length === 0,
    xml,
    ticketCount: tickets.length,
    cancelledCount: totalCancelledCount,
    totalGrossAmount: totalGrossAmount,
    activeGrossAmount: activeGrossAmount,
    sectorSummaries,
    errors,
    warnings
  };
}

/**
 * Normalizza CodiceOrdinePosto per conformità DTD SIAE
 * Formato: 2 caratteri alfanumerici (es. UN, PL, A1, B2)
 * UN = Unico (posto unico/non numerato)
 */
function normalizeCodiceOrdinePosto(sectorCode: string | null | undefined): string {
  if (!sectorCode) return 'UN';
  
  const code = sectorCode.toUpperCase().trim();
  
  // Se già in formato corretto (2 caratteri alfanumerici)
  if (/^[A-Z0-9]{2}$/.test(code)) {
    return code;
  }
  
  // Mappature comuni
  const mappings: Record<string, string> = {
    'UNICO': 'UN',
    'UNIQUE': 'UN',
    'GENERAL': 'UN',
    'GENERALE': 'UN',
    'PLATEA': 'PL',
    'GALLERIA': 'GA',
    'PALCO': 'PA',
    'LOGGIONE': 'LO',
    'BALCONATA': 'BA',
    'PARTERRE': 'PT',
    'TRIBUNA': 'TR',
    'ANELLO': 'AN',
    'CURVA': 'CU',
    'PRATO': 'PR',
    'VIP': 'VI',
    'A0': 'A1',
    'A': 'A1',
    'B': 'B1',
    'C': 'C1',
    'P0': 'PL',
    'P1': 'P1',
  };
  
  if (mappings[code]) {
    return mappings[code];
  }
  
  // Prendi i primi 2 caratteri se la stringa è più lunga
  if (code.length >= 2) {
    return code.substring(0, 2);
  }
  
  // Padda con '1' se solo 1 carattere
  if (code.length === 1) {
    return code + '1';
  }
  
  return 'UN';
}

// ==================== SIAE Response Parsing ====================

/**
 * Risultato del parsing di una risposta SIAE
 */
export interface SiaeResponseParseResult {
  success: boolean;
  type: 'OK' | 'ERRORE' | 'UNKNOWN';
  code: string | null;
  description: string | null;
  detail: string | null;
  protocolNumber: string | null;
  rawContent: string;
}

/**
 * Parsa il contenuto di un file di risposta SIAE
 * Formato tipico:
 * REPLY:
 * 
 * ERRORE
 * CODICE:      40604
 * DESCRIZIONE: Il riepilogo risulta gia' elaborato
 * DETTAGLIO:   
 * 
 * oppure per successo:
 * REPLY:
 * 
 * OK
 * PROTOCOLLO: 12345678
 */
export function parseSiaeResponseFile(content: string): SiaeResponseParseResult {
  const result: SiaeResponseParseResult = {
    success: false,
    type: 'UNKNOWN',
    code: null,
    description: null,
    detail: null,
    protocolNumber: null,
    rawContent: content,
  };
  
  if (!content || content.trim().length === 0) {
    return result;
  }
  
  const lines = content.split('\n').map(l => l.trim());
  
  // Cerca il tipo di risposta (OK o ERRORE)
  for (const line of lines) {
    if (line === 'OK') {
      result.type = 'OK';
      result.success = true;
      break;
    }
    if (line === 'ERRORE') {
      result.type = 'ERRORE';
      result.success = false;
      break;
    }
  }
  
  // Estrai i campi
  for (const line of lines) {
    // CODICE: estrai il numero (può avere spazi)
    const codiceMatch = line.match(/^CODICE:\s*(\d+)/i);
    if (codiceMatch) {
      result.code = codiceMatch[1];
    }
    
    // DESCRIZIONE: estrai il testo
    const descrizioneMatch = line.match(/^DESCRIZIONE:\s*(.+)/i);
    if (descrizioneMatch) {
      result.description = descrizioneMatch[1].trim();
    }
    
    // DETTAGLIO: estrai il testo (può essere vuoto)
    const dettaglioMatch = line.match(/^DETTAGLIO:\s*(.*)/i);
    if (dettaglioMatch) {
      result.detail = dettaglioMatch[1].trim() || null;
    }
    
    // PROTOCOLLO: per risposte OK
    const protocolloMatch = line.match(/^PROTOCOLLO:\s*(\S+)/i);
    if (protocolloMatch) {
      result.protocolNumber = protocolloMatch[1];
    }
  }
  
  return result;
}

// ==================== VALIDAZIONE PREVENTIVA SIAE ====================

/**
 * Risultato validazione prerequisiti SIAE
 */
export interface SiaePrerequisiteValidation {
  isReady: boolean;
  score: number; // 0-100
  errors: SiaeValidationError[];
  warnings: SiaeValidationWarning[];
  checklist: SiaeChecklistItem[];
}

export interface SiaeValidationError {
  code: string;
  field: string;
  category: 'titolare' | 'evento' | 'genere' | 'settori' | 'biglietti' | 'trasmissione';
  message: string;
  resolution: string;
  siaeErrorCode?: string;
}

export interface SiaeValidationWarning {
  code: string;
  field: string;
  category: 'titolare' | 'evento' | 'genere' | 'settori' | 'biglietti' | 'trasmissione';
  message: string;
  suggestion: string;
}

export interface SiaeChecklistItem {
  category: 'titolare' | 'evento' | 'genere' | 'settori' | 'biglietti' | 'trasmissione';
  field: string;
  label: string;
  status: 'ok' | 'warning' | 'error' | 'missing';
  value?: string | number | null;
  required: boolean;
}

/**
 * Dati necessari per validazione prerequisiti
 */
export interface SiaePrerequisiteData {
  // Titolare (Company)
  company: {
    id: string;
    name: string;
    taxId?: string | null;
    fiscalCode?: string | null;
    regimeFiscale?: string | null;
  };
  // Evento SIAE
  ticketedEvent: {
    id: string;
    siaeLocationCode?: string | null;
    genreCode: string;
    taxType: string;
    entertainmentIncidence?: number | null;
    organizerType?: string | null;
    author?: string | null;
    performer?: string | null;
    filmNationality?: string | null;
    totalCapacity: number;
  };
  // Dati evento base
  event: {
    id: string;
    name: string;
    startDatetime?: Date | string | null;
    endDatetime?: Date | string | null;
  };
  // Settori
  sectors?: Array<{
    id: string;
    orderCode?: string | null;
    capacity?: number | null;
  }>;
  // Configurazione sistema
  systemConfig?: {
    systemCode?: string | null;
  } | null;
  // Smart Card EFFF (opzionale)
  smartCardData?: {
    systemId?: string;
    partnerCodFis?: string;
    partnerName?: string;
  } | null;
  // Stato bridge
  bridgeConnected?: boolean;
}

/**
 * Regole di validazione per tipo genere SIAE
 */
interface GenreValidationRules {
  requiresAuthor: boolean;
  requiresPerformer: boolean;
  requiresFilmNationality: boolean;
  mustBeIntrattenimento: boolean;
  mustBeSpettacolo: boolean;
  defaultVatRate: number;
  description: string;
}

/**
 * Ottiene le regole di validazione per un codice genere
 */
function getGenreValidationRules(genreCode: string): GenreValidationRules {
  const code = parseInt(genreCode, 10);
  
  // Cinema (01-04): richiede NazionalitaFilm
  if (code >= 1 && code <= 4) {
    return {
      requiresAuthor: false,
      requiresPerformer: false,
      requiresFilmNationality: true,
      mustBeIntrattenimento: false,
      mustBeSpettacolo: true,
      defaultVatRate: code === 4 ? 10 : 22,
      description: 'Cinema'
    };
  }
  
  // Sport (05-29): nessun campo aggiuntivo
  if (code >= 5 && code <= 29) {
    return {
      requiresAuthor: false,
      requiresPerformer: false,
      requiresFilmNationality: false,
      mustBeIntrattenimento: false,
      mustBeSpettacolo: true,
      defaultVatRate: 22,
      description: 'Sport'
    };
  }
  
  // Giochi/Casinò (30-40): Intrattenimento obbligatorio
  if (code >= 30 && code <= 40) {
    return {
      requiresAuthor: false,
      requiresPerformer: false,
      requiresFilmNationality: false,
      mustBeIntrattenimento: true,
      mustBeSpettacolo: false,
      defaultVatRate: 22,
      description: 'Giochi/Intrattenimento'
    };
  }
  
  // Musei/Gallerie (41-44)
  if (code >= 41 && code <= 44) {
    return {
      requiresAuthor: false,
      requiresPerformer: false,
      requiresFilmNationality: false,
      mustBeIntrattenimento: false,
      mustBeSpettacolo: true,
      defaultVatRate: 22,
      description: 'Musei/Gallerie'
    };
  }
  
  // Teatro/Concerti (45-59): richiede Autore e Esecutore
  if (code >= 45 && code <= 59) {
    return {
      requiresAuthor: true,
      requiresPerformer: true,
      requiresFilmNationality: false,
      mustBeIntrattenimento: false,
      mustBeSpettacolo: true,
      defaultVatRate: 10,
      description: 'Teatro/Concerti'
    };
  }
  
  // Ballo/Discoteca (60-69): Intrattenimento obbligatorio
  if (code >= 60 && code <= 69) {
    return {
      requiresAuthor: false,
      requiresPerformer: false,
      requiresFilmNationality: false,
      mustBeIntrattenimento: true,
      mustBeSpettacolo: false,
      defaultVatRate: 22,
      description: 'Ballo/Discoteca'
    };
  }
  
  // Fiere/Mostre (70-74): Intrattenimento
  if (code >= 70 && code <= 74) {
    return {
      requiresAuthor: false,
      requiresPerformer: false,
      requiresFilmNationality: false,
      mustBeIntrattenimento: true,
      mustBeSpettacolo: false,
      defaultVatRate: 22,
      description: 'Fiere/Mostre'
    };
  }
  
  // Circo/Spettacoli viaggianti (75-78): Spettacolo
  if (code >= 75 && code <= 78) {
    return {
      requiresAuthor: false,
      requiresPerformer: false,
      requiresFilmNationality: false,
      mustBeIntrattenimento: false,
      mustBeSpettacolo: true,
      defaultVatRate: 10,
      description: 'Circo/Spettacoli viaggianti'
    };
  }
  
  // Luna park/Attrazioni (79-89): Intrattenimento
  if (code >= 79 && code <= 89) {
    return {
      requiresAuthor: false,
      requiresPerformer: false,
      requiresFilmNationality: false,
      mustBeIntrattenimento: true,
      mustBeSpettacolo: false,
      defaultVatRate: 22,
      description: 'Attrazioni/Parchi'
    };
  }
  
  // Altro (90-99): generalmente Spettacolo
  return {
    requiresAuthor: false,
    requiresPerformer: false,
    requiresFilmNationality: false,
    mustBeIntrattenimento: false,
    mustBeSpettacolo: false,
    defaultVatRate: 22,
    description: 'Altro'
  };
}

/**
 * Valida Codice Fiscale italiano (16 caratteri alfanumerici)
 */
function validateCodiceFiscale(cf: string): { valid: boolean; error?: string } {
  if (!cf) return { valid: false, error: 'Codice Fiscale mancante' };
  
  const cleaned = cf.toUpperCase().trim();
  
  // P.IVA: 11 cifre
  if (/^\d{11}$/.test(cleaned)) {
    return { valid: true };
  }
  
  // Codice Fiscale: 16 caratteri alfanumerici
  if (/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cleaned)) {
    return { valid: true };
  }
  
  if (cleaned.length === 16 && /^[A-Z0-9]{16}$/.test(cleaned)) {
    return { valid: true }; // Formato accettabile
  }
  
  return { 
    valid: false, 
    error: `Formato non valido (${cleaned.length} caratteri). Atteso: P.IVA 11 cifre o CF 16 caratteri` 
  };
}

/**
 * Valida Codice Locale SIAE (13 caratteri)
 */
function validateCodiceLocale(code: string | null | undefined): { valid: boolean; error?: string; normalized?: string } {
  if (!code) {
    return { valid: false, error: 'Codice Locale SIAE mancante' };
  }
  
  const cleaned = code.trim();
  
  // Deve essere esattamente 13 caratteri (o meno, verrà padded)
  if (cleaned.length > 13) {
    return { valid: false, error: `Troppo lungo (${cleaned.length} caratteri). Massimo 13` };
  }
  
  // Normalizza a 13 caratteri con zeri a sinistra
  const normalized = cleaned.padStart(13, '0');
  
  // Deve contenere solo cifre
  if (!/^\d{13}$/.test(normalized)) {
    return { valid: false, error: 'Deve contenere solo cifre' };
  }
  
  // Non può essere tutto zeri
  if (normalized === '0000000000000') {
    return { valid: false, error: 'Codice Locale non configurato (tutto zeri)' };
  }
  
  return { valid: true, normalized };
}

/**
 * Valida Codice Sistema SIAE (8 caratteri)
 */
function validateSystemCode(code: string | null | undefined): { valid: boolean; error?: string } {
  if (!code) {
    return { valid: false, error: 'Codice Sistema mancante' };
  }
  
  if (code.length !== 8) {
    return { valid: false, error: `Deve essere esattamente 8 caratteri (attuale: ${code.length})` };
  }
  
  // Pattern valido: Pxxxxxxx (test) o 0xxxxxxx (produzione)
  if (!/^[A-Z0-9]{8}$/i.test(code)) {
    return { valid: false, error: 'Deve contenere solo caratteri alfanumerici' };
  }
  
  return { valid: true };
}

/**
 * VALIDAZIONE PREVENTIVA COMPLETA SIAE
 * 
 * Verifica TUTTI i requisiti PRIMA della generazione XML per prevenire
 * errori di trasmissione. Restituisce lista dettagliata di errori/warning
 * con istruzioni per risolverli.
 */
export function validateSiaeReportPrerequisites(data: SiaePrerequisiteData): SiaePrerequisiteValidation {
  const errors: SiaeValidationError[] = [];
  const warnings: SiaeValidationWarning[] = [];
  const checklist: SiaeChecklistItem[] = [];
  
  // Risolvi codice sistema (priorità: Smart Card > config > default)
  const systemCode = data.smartCardData?.systemId || data.systemConfig?.systemCode || SIAE_SYSTEM_CODE_DEFAULT;
  
  // Risolvi CF Titolare (priorità: Smart Card > company.taxId > company.fiscalCode)
  const cfTitolare = data.smartCardData?.partnerCodFis || data.company.taxId || data.company.fiscalCode || '';
  
  // Risolvi denominazione (priorità: Smart Card > company.name)
  const denominazione = data.smartCardData?.partnerName || data.company.name || '';
  
  // ==================== VALIDAZIONI TITOLARE ====================
  
  // 1. Codice Sistema (8 caratteri) - OBBLIGATORIO
  // Verifica se è stato configurato esplicitamente o si sta usando il default
  const hasConfiguredSystemCode = !!(data.smartCardData?.systemId || data.systemConfig?.systemCode);
  const sysCodeValidation = validateSystemCode(systemCode);
  
  // SystemCode DEVE essere configurato esplicitamente (Smart Card o config)
  // Non è accettabile usare un default per trasmissioni RCA ufficiali
  // - Se non configurato = error bloccante (non può procedere)
  // - Se configurato MA non valido = error bloccante
  // - Se configurato E valido = ok
  let systemCodeStatus: 'ok' | 'warning' | 'error' = 'ok';
  if (!hasConfiguredSystemCode) {
    systemCodeStatus = 'error'; // Mancanza configurazione = bloccante
  } else if (!sysCodeValidation.valid) {
    systemCodeStatus = 'error'; // Valore non valido = bloccante
  }
  
  checklist.push({
    category: 'titolare',
    field: 'systemCode',
    label: 'Codice Sistema SIAE',
    status: systemCodeStatus,
    value: hasConfiguredSystemCode ? systemCode : 'Non configurato',
    required: true
  });
  
  if (!hasConfiguredSystemCode) {
    errors.push({
      code: 'SYSTEM_CODE_NOT_CONFIGURED',
      field: 'systemCode',
      category: 'titolare',
      message: 'Codice Sistema SIAE obbligatorio ma non configurato',
      resolution: 'Connettere Smart Card per leggere il codice automaticamente, oppure configurare manualmente in Impostazioni SIAE (8 caratteri alfanumerici)',
      siaeErrorCode: '0600'
    });
  } else if (!sysCodeValidation.valid) {
    errors.push({
      code: 'SYSTEM_CODE_INVALID',
      field: 'systemCode',
      category: 'titolare',
      message: sysCodeValidation.error || 'Codice Sistema non valido',
      resolution: 'Verificare che il codice sistema sia di 8 caratteri alfanumerici',
      siaeErrorCode: '0600'
    });
  }
  
  // 2. Codice Fiscale Titolare
  const cfValidation = validateCodiceFiscale(cfTitolare);
  checklist.push({
    category: 'titolare',
    field: 'taxId',
    label: 'Codice Fiscale / P.IVA Titolare',
    status: cfValidation.valid ? 'ok' : 'error',
    value: cfTitolare || null,
    required: true
  });
  if (!cfValidation.valid) {
    errors.push({
      code: 'TAX_ID_INVALID',
      field: 'taxId',
      category: 'titolare',
      message: cfValidation.error || 'Codice Fiscale/P.IVA non valido',
      resolution: 'Inserire P.IVA (11 cifre) o Codice Fiscale (16 caratteri) nelle impostazioni azienda',
      siaeErrorCode: '2606'
    });
  }
  
  // 3. Denominazione Titolare
  checklist.push({
    category: 'titolare',
    field: 'businessName',
    label: 'Denominazione Titolare',
    status: denominazione ? 'ok' : 'error',
    value: denominazione || null,
    required: true
  });
  if (!denominazione) {
    errors.push({
      code: 'BUSINESS_NAME_MISSING',
      field: 'businessName',
      category: 'titolare',
      message: 'Denominazione azienda mancante',
      resolution: 'Inserire nome azienda nelle impostazioni',
      siaeErrorCode: '2606'
    });
  }
  
  // 4. Bridge connesso (warning se non connesso)
  checklist.push({
    category: 'trasmissione',
    field: 'bridgeConnected',
    label: 'Smart Card Bridge',
    status: data.bridgeConnected ? 'ok' : 'warning',
    value: data.bridgeConnected ? 'Connesso' : 'Non connesso',
    required: false
  });
  if (!data.bridgeConnected) {
    warnings.push({
      code: 'BRIDGE_NOT_CONNECTED',
      field: 'bridgeConnected',
      category: 'trasmissione',
      message: 'Smart Card Bridge non connesso',
      suggestion: 'Connettere il bridge per firma digitale automatica dei report'
    });
  }
  
  // ==================== VALIDAZIONI EVENTO ====================
  
  // 5. Codice Locale SIAE (13 caratteri)
  const localeValidation = validateCodiceLocale(data.ticketedEvent.siaeLocationCode);
  checklist.push({
    category: 'evento',
    field: 'siaeLocationCode',
    label: 'Codice Locale SIAE',
    status: localeValidation.valid ? 'ok' : 'error',
    value: localeValidation.normalized || data.ticketedEvent.siaeLocationCode || null,
    required: true
  });
  if (!localeValidation.valid) {
    errors.push({
      code: 'LOCATION_CODE_INVALID',
      field: 'siaeLocationCode',
      category: 'evento',
      message: localeValidation.error || 'Codice Locale SIAE non valido',
      resolution: 'Inserire il codice locale SIAE (13 cifre) nella configurazione evento bigliettato',
      siaeErrorCode: '40605'
    });
  }
  
  // 6. Tipo Genere (2 cifre, 01-99)
  const genreCode = data.ticketedEvent.genreCode;
  const genreNum = parseInt(genreCode, 10);
  const genreValid = !isNaN(genreNum) && genreNum >= 1 && genreNum <= 99;
  checklist.push({
    category: 'evento',
    field: 'genreCode',
    label: 'Tipo Genere SIAE (TAB.1)',
    status: genreValid ? 'ok' : 'error',
    value: genreCode,
    required: true
  });
  if (!genreValid) {
    errors.push({
      code: 'GENRE_CODE_INVALID',
      field: 'genreCode',
      category: 'evento',
      message: `Codice genere "${genreCode}" non valido. Deve essere 01-99`,
      resolution: 'Selezionare un genere valido dalla tabella TAB.1 SIAE',
      siaeErrorCode: '2101'
    });
  }
  
  // 7. Data/Ora Evento
  const eventDate = data.event.startDatetime;
  const hasValidDate = eventDate && !isNaN(new Date(eventDate).getTime());
  checklist.push({
    category: 'evento',
    field: 'startDatetime',
    label: 'Data/Ora Evento',
    status: hasValidDate ? 'ok' : 'error',
    value: hasValidDate ? new Date(eventDate).toLocaleString('it-IT') : null,
    required: true
  });
  if (!hasValidDate) {
    errors.push({
      code: 'EVENT_DATE_INVALID',
      field: 'startDatetime',
      category: 'evento',
      message: 'Data/Ora evento mancante o non valida',
      resolution: 'Configurare data e ora di inizio evento',
      siaeErrorCode: '0603'
    });
  }
  
  // 8. Capienza totale
  const capacity = data.ticketedEvent.totalCapacity;
  checklist.push({
    category: 'evento',
    field: 'totalCapacity',
    label: 'Capienza Totale',
    status: capacity > 0 ? 'ok' : 'error',
    value: capacity,
    required: true
  });
  if (capacity <= 0) {
    errors.push({
      code: 'CAPACITY_INVALID',
      field: 'totalCapacity',
      category: 'evento',
      message: 'Capienza totale deve essere maggiore di 0',
      resolution: 'Configurare la capienza totale dell\'evento'
    });
  }
  
  // ==================== VALIDAZIONI PER TIPO GENERE ====================
  
  if (genreValid) {
    const rules = getGenreValidationRules(genreCode);
    
    // Descrizione categoria genere
    checklist.push({
      category: 'genere',
      field: 'genreCategory',
      label: 'Categoria Genere',
      status: 'ok',
      value: rules.description,
      required: false
    });
    
    // Tax Type coerenza
    const taxType = data.ticketedEvent.taxType;
    if (rules.mustBeIntrattenimento && taxType !== 'I') {
      errors.push({
        code: 'TAX_TYPE_MISMATCH',
        field: 'taxType',
        category: 'genere',
        message: `Genere ${genreCode} (${rules.description}) richiede Tax Type = Intrattenimento (I), ma è impostato "${taxType}"`,
        resolution: 'Modificare Tax Type a "I" (Intrattenimento) per questo genere'
      });
      checklist.push({
        category: 'genere',
        field: 'taxType',
        label: 'Tipo Imposta',
        status: 'error',
        value: taxType,
        required: true
      });
    } else if (rules.mustBeSpettacolo && taxType !== 'S') {
      warnings.push({
        code: 'TAX_TYPE_MISMATCH_WARN',
        field: 'taxType',
        category: 'genere',
        message: `Genere ${genreCode} (${rules.description}) tipicamente usa Tax Type = Spettacolo (S)`,
        suggestion: 'Verificare se il Tax Type è corretto per questo evento'
      });
      checklist.push({
        category: 'genere',
        field: 'taxType',
        label: 'Tipo Imposta',
        status: 'warning',
        value: taxType,
        required: true
      });
    } else {
      checklist.push({
        category: 'genere',
        field: 'taxType',
        label: 'Tipo Imposta',
        status: 'ok',
        value: taxType === 'I' ? 'Intrattenimento' : 'Spettacolo',
        required: true
      });
    }
    
    // Incidenza Intrattenimento (obbligatoria se I, deve essere > 0 per generi intrattenimento)
    if (taxType === 'I') {
      const incidence = data.ticketedEvent.entertainmentIncidence;
      // Per generi intrattenimento (30-40, 60-69) l'incidenza deve essere > 0
      const minIncidence = rules.mustBeIntrattenimento ? 1 : 0;
      const incidenceValid = incidence !== null && incidence !== undefined && incidence >= minIncidence && incidence <= 100;
      checklist.push({
        category: 'genere',
        field: 'entertainmentIncidence',
        label: 'Incidenza Intrattenimento',
        status: incidenceValid ? 'ok' : 'error',
        value: incidence !== null && incidence !== undefined ? `${incidence}%` : null,
        required: true
      });
      if (!incidenceValid) {
        errors.push({
          code: 'ENTERTAINMENT_INCIDENCE_MISSING',
          field: 'entertainmentIncidence',
          category: 'genere',
          message: rules.mustBeIntrattenimento 
            ? `Incidenza Intrattenimento obbligatoria (1-100%) per genere ${genreCode} (${rules.description})`
            : 'Incidenza Intrattenimento obbligatoria per Tax Type = I (0-100%)',
          resolution: rules.mustBeIntrattenimento 
            ? 'Impostare percentuale incidenza intrattenimento maggiore di 0 (tipicamente 100% per discoteche/ballo)'
            : 'Impostare percentuale incidenza intrattenimento (0-100%)'
        });
      }
    }
    
    // Autore (obbligatorio per Teatro/Concerti 45-59)
    if (rules.requiresAuthor) {
      const author = data.ticketedEvent.author;
      checklist.push({
        category: 'genere',
        field: 'author',
        label: 'Autore Opera',
        status: author ? 'ok' : 'error',
        value: author || null,
        required: true
      });
      if (!author) {
        errors.push({
          code: 'AUTHOR_REQUIRED',
          field: 'author',
          category: 'genere',
          message: `Autore obbligatorio per genere ${genreCode} (${rules.description})`,
          resolution: 'Inserire il nome dell\'autore dell\'opera nella configurazione evento SIAE'
        });
      }
    }
    
    // Esecutore/Artista (obbligatorio per Teatro/Concerti 45-59)
    if (rules.requiresPerformer) {
      const performer = data.ticketedEvent.performer;
      checklist.push({
        category: 'genere',
        field: 'performer',
        label: 'Esecutore/Artista',
        status: performer ? 'ok' : 'error',
        value: performer || null,
        required: true
      });
      if (!performer) {
        errors.push({
          code: 'PERFORMER_REQUIRED',
          field: 'performer',
          category: 'genere',
          message: `Esecutore/Artista obbligatorio per genere ${genreCode} (${rules.description})`,
          resolution: 'Inserire il nome dell\'artista/interprete nella configurazione evento SIAE'
        });
      }
    }
    
    // NazionalitaFilm (obbligatorio per Cinema 01-04)
    if (rules.requiresFilmNationality) {
      const nationality = data.ticketedEvent.filmNationality;
      const natValid = nationality && /^[A-Z]{2}$/i.test(nationality);
      checklist.push({
        category: 'genere',
        field: 'filmNationality',
        label: 'Nazionalità Film (ISO)',
        status: natValid ? 'ok' : 'error',
        value: nationality || null,
        required: true
      });
      if (!natValid) {
        errors.push({
          code: 'FILM_NATIONALITY_REQUIRED',
          field: 'filmNationality',
          category: 'genere',
          message: `Nazionalità film obbligatoria per genere ${genreCode} (Cinema). Usare codice ISO 2 lettere (IT, US, FR...)`,
          resolution: 'Inserire il codice nazionalità ISO 3166 del film'
        });
      }
    }
  }
  
  // ==================== VALIDAZIONI SETTORI ====================
  
  const sectors = data.sectors || [];
  // RCA richiede almeno un settore per la struttura XML
  const hasSectors = sectors.length > 0;
  checklist.push({
    category: 'settori',
    field: 'sectorsCount',
    label: 'Settori Configurati',
    status: hasSectors ? 'ok' : 'error',
    value: sectors.length,
    required: true
  });
  
  if (!hasSectors) {
    errors.push({
      code: 'NO_SECTORS',
      field: 'sectors',
      category: 'settori',
      message: 'Almeno un settore obbligatorio per trasmissione RCA',
      resolution: 'Configurare almeno un settore con codice ordine (es: UN, PL) e capienza nella sezione Settori evento',
      siaeErrorCode: '40605'
    });
  } else {
    // Verifica ogni settore
    for (const sector of sectors) {
      if (!sector.orderCode || !/^[A-Z0-9]{2}$/i.test(sector.orderCode)) {
        warnings.push({
          code: 'SECTOR_CODE_INVALID',
          field: 'orderCode',
          category: 'settori',
          message: `Settore "${sector.id}" ha codice ordine non valido: "${sector.orderCode}"`,
          suggestion: 'Usare codice 2 caratteri alfanumerici (es: UN, PL, A1)'
        });
      }
      if (!sector.capacity || sector.capacity <= 0) {
        warnings.push({
          code: 'SECTOR_CAPACITY_INVALID',
          field: 'capacity',
          category: 'settori',
          message: `Settore "${sector.orderCode || sector.id}" ha capienza non valida`,
          suggestion: 'Configurare capienza settore > 0'
        });
      }
    }
  }
  
  // ==================== CALCOLO SCORE ====================
  
  // Pesi: errori = -20 punti, warning = -5 punti
  // Base = 100, minimo = 0
  const baseScore = 100;
  const errorPenalty = errors.length * 20;
  const warningPenalty = warnings.length * 5;
  const score = Math.max(0, Math.min(100, baseScore - errorPenalty - warningPenalty));
  
  return {
    isReady: errors.length === 0,
    score,
    errors,
    warnings,
    checklist
  };
}

// ==================== AUTO-CORREZIONE PRE-TRASMISSIONE ====================

/**
 * Risultato dell'auto-correzione XML SIAE
 */
export interface AutoCorrectResult {
  correctedXml: string;
  corrections: Array<{
    field: string;
    original: string;
    corrected: string;
    reason: string;
    siaeErrorPrevented: string;
  }>;
  uncorrectableErrors: Array<{
    field: string;
    message: string;
    siaeErrorCode: string;
  }>;
}

/**
 * Tabella generi SIAE con requisiti Autore/Esecutore/NazionalitàFilm
 * Basata su Tabella 1 Allegato A Provvedimento 23/7/2001
 */
const SIAE_GENRE_REQUIREMENTS: Record<string, { needsAutore: boolean; needsEsecutore: boolean; needsNazionalita: boolean; description: string }> = {
  // Cinema (01-04): richiedono NazionalitàFilm
  '01': { needsAutore: false, needsEsecutore: false, needsNazionalita: true, description: 'Cinema - Film' },
  '02': { needsAutore: false, needsEsecutore: false, needsNazionalita: true, description: 'Cinema - Documentario' },
  '03': { needsAutore: false, needsEsecutore: false, needsNazionalita: true, description: 'Cinema - Corto' },
  '04': { needsAutore: false, needsEsecutore: false, needsNazionalita: true, description: 'Cinema - Altro' },
  // Teatro/Concerti (45-59): richiedono Autore ed Esecutore
  '45': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Teatro - Prosa' },
  '46': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Teatro - Lirica' },
  '47': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Teatro - Balletto' },
  '48': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Teatro - Operetta' },
  '49': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Teatro - Musical' },
  '50': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Concerto - Classica' },
  '51': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Concerto - Pop/Rock' },
  '52': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Concerto - Jazz' },
  '53': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Concerto - Folk' },
  '54': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Concerto - Altro' },
  '55': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Spettacolo comico' },
  '56': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Cabaret' },
  '57': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Varietà' },
  '58': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Circo' },
  '59': { needsAutore: true, needsEsecutore: true, needsNazionalita: false, description: 'Spettacolo viaggiante' },
  // Intrattenimento (30-40, 60-69, 70-79): NON richiedono nulla
  '30': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Giochi - Slot' },
  '31': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Giochi - Carte' },
  '32': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Giochi - Biliardo' },
  '33': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Giochi - Bowling' },
  '34': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Giochi - Flipper' },
  '35': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Giochi - Videogiochi' },
  '36': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Giochi - Altri' },
  '60': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Discoteca' },
  '61': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Sala da ballo' },
  '62': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Piano bar' },
  '63': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Karaoke' },
  '64': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Disco pub' },
  '65': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Night club' },
  '66': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Locale notturno' },
  '67': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Beach club' },
  '68': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Lido' },
  '69': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Altro intrattenimento' },
  '70': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Fiera' },
  '71': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Mostra' },
  '72': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Esposizione' },
  '73': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Sagra' },
  '74': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Festa patronale' },
  '79': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Luna park' },
  // Sport (80-89)
  '80': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Evento sportivo' },
  '81': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Calcio' },
  '82': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Basket' },
  '83': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Tennis' },
  '84': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Pugilato' },
  '85': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Automobilismo' },
  '86': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Motociclismo' },
  '89': { needsAutore: false, needsEsecutore: false, needsNazionalita: false, description: 'Altro sport' },
};

/**
 * Codici ISO 3166-1 alpha-2 validi per NazionalitàFilm
 */
const VALID_ISO_3166_CODES = new Set([
  'IT', 'US', 'GB', 'FR', 'DE', 'ES', 'PT', 'NL', 'BE', 'AT', 'CH', 'PL', 'CZ', 'SK', 'HU',
  'RO', 'BG', 'GR', 'HR', 'SI', 'RS', 'BA', 'ME', 'MK', 'AL', 'XK', 'UA', 'RU', 'BY', 'MD',
  'SE', 'NO', 'DK', 'FI', 'IS', 'IE', 'LU', 'MT', 'CY', 'EE', 'LV', 'LT', 'TR', 'IL', 'EG',
  'MA', 'TN', 'DZ', 'LY', 'ZA', 'NG', 'KE', 'ET', 'GH', 'CI', 'SN', 'CM', 'AO', 'MZ', 'TZ',
  'JP', 'CN', 'KR', 'KP', 'TW', 'HK', 'MO', 'SG', 'MY', 'ID', 'TH', 'VN', 'PH', 'MM', 'KH',
  'IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'AF', 'IR', 'IQ', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM',
  'AU', 'NZ', 'PG', 'FJ', 'WS', 'TO', 'VU', 'NC', 'PF', 'GU', 'AS',
  'CA', 'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'JM', 'HT', 'DO', 'PR', 'TT',
  'BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR'
]);

/**
 * AUTO-CORREZIONE PREVENTIVA XML SIAE
 * 
 * Corregge automaticamente gli errori comuni nell'XML SIAE prima della trasmissione.
 * Questa funzione deve essere chiamata PRIMA di validatePreTransmission().
 * 
 * Correzioni automatiche:
 * - Troncamento denominazione a 60 caratteri (previene warning 2606)
 * - Troncamento performer a 100 caratteri (previene errore 40605)
 * - Rimozione Autore/Esecutore/NazionalitàFilm se non richiesti dal genere (previene 2108/2111/2114)
 * - Aggiunta Autore/Esecutore placeholder se richiesti dal genere (previene 2110)
 * - Normalizzazione codice genere a formato valido (previene 2101)
 * - Padding codice locale a 13 cifre (previene 3203)
 * - Normalizzazione codice fiscale (previene 3111)
 * - Correzione encoding UTF-8 (previene 40603)
 * 
 * @param xml - Contenuto XML originale
 * @param genreCode - Codice genere evento (opzionale, estratto da XML se non fornito)
 * @param defaultAutore - Autore di default da usare se richiesto ma mancante
 * @param defaultEsecutore - Esecutore di default da usare se richiesto ma mancante
 * @returns Risultato con XML corretto e lista correzioni applicate
 */
export function autoCorrectSiaeXml(
  xml: string,
  genreCode?: string,
  defaultAutore?: string,
  defaultEsecutore?: string
): AutoCorrectResult {
  let correctedXml = xml;
  const corrections: AutoCorrectResult['corrections'] = [];
  const uncorrectableErrors: AutoCorrectResult['uncorrectableErrors'] = [];
  
  // ==================== 1. CORREZIONE ENCODING ====================
  // Rimuovi caratteri non-UTF8 e normalizza
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const encoded = encoder.encode(correctedXml);
    const decoded = decoder.decode(encoded);
    if (decoded !== correctedXml) {
      corrections.push({
        field: 'encoding',
        original: 'Caratteri non-UTF8 presenti',
        corrected: 'Caratteri normalizzati UTF-8',
        reason: 'Rimossi caratteri non validi UTF-8',
        siaeErrorPrevented: '40603'
      });
      correctedXml = decoded;
    }
  } catch (e) {
    // Ignora errori encoding
  }
  
  // ==================== 2. CORREZIONE DENOMINAZIONE (max 60 char) ====================
  const denominazioneMatch = correctedXml.match(/<Denominazione>([^<]*)<\/Denominazione>/g);
  if (denominazioneMatch) {
    for (const match of denominazioneMatch) {
      const innerMatch = match.match(/<Denominazione>([^<]*)<\/Denominazione>/);
      if (innerMatch && innerMatch[1].length > 60) {
        const original = innerMatch[1];
        const truncated = original.substring(0, 60);
        correctedXml = correctedXml.replace(match, `<Denominazione>${truncated}</Denominazione>`);
        corrections.push({
          field: 'Denominazione',
          original: `${original.length} caratteri`,
          corrected: `Troncato a 60 caratteri`,
          reason: 'Denominazione max 60 caratteri per specifiche SIAE',
          siaeErrorPrevented: '2606'
        });
      }
    }
  }
  
  // ==================== 3. CORREZIONE AUTORE (max 100 char) ====================
  const autoreMatch = correctedXml.match(/<Autore>([^<]*)<\/Autore>/);
  if (autoreMatch && autoreMatch[1].length > 100) {
    const original = autoreMatch[1];
    const truncated = original.substring(0, 100);
    correctedXml = correctedXml.replace(autoreMatch[0], `<Autore>${truncated}</Autore>`);
    corrections.push({
      field: 'Autore',
      original: `${original.length} caratteri`,
      corrected: `Troncato a 100 caratteri`,
      reason: 'Autore max 100 caratteri per specifiche SIAE',
      siaeErrorPrevented: '40605'
    });
  }
  
  // ==================== 4. CORREZIONE ESECUTORE (max 100 char) ====================
  const esecutoreMatch = correctedXml.match(/<Esecutore>([^<]*)<\/Esecutore>/);
  if (esecutoreMatch && esecutoreMatch[1].length > 100) {
    const original = esecutoreMatch[1];
    const truncated = original.substring(0, 100);
    correctedXml = correctedXml.replace(esecutoreMatch[0], `<Esecutore>${truncated}</Esecutore>`);
    corrections.push({
      field: 'Esecutore',
      original: `${original.length} caratteri`,
      corrected: `Troncato a 100 caratteri`,
      reason: 'Esecutore max 100 caratteri per specifiche SIAE',
      siaeErrorPrevented: '40605'
    });
  }
  
  // ==================== 5. CORREZIONE CODICE GENERE ====================
  // Estrai codice genere dall'XML se non fornito
  let effectiveGenreCode = genreCode;
  if (!effectiveGenreCode) {
    const tipoGenereMatch = correctedXml.match(/<TipoGenere>([^<]*)<\/TipoGenere>/);
    effectiveGenreCode = tipoGenereMatch?.[1] || undefined;
  }
  
  // Valida e correggi formato codice genere
  if (effectiveGenreCode) {
    const genreNum = parseInt(effectiveGenreCode, 10);
    if (isNaN(genreNum) || genreNum < 1 || genreNum > 99) {
      // Codice non valido, usa default '60' (Discoteca)
      const correctedGenre = '60';
      if (correctedXml.includes(`<TipoGenere>${effectiveGenreCode}</TipoGenere>`)) {
        correctedXml = correctedXml.replace(
          `<TipoGenere>${effectiveGenreCode}</TipoGenere>`,
          `<TipoGenere>${correctedGenre}</TipoGenere>`
        );
        corrections.push({
          field: 'TipoGenere',
          original: effectiveGenreCode,
          corrected: correctedGenre,
          reason: 'Codice genere non valido, impostato default Discoteca (60)',
          siaeErrorPrevented: '2101'
        });
      }
      effectiveGenreCode = correctedGenre;
    } else {
      // Normalizza a 2 cifre con padding
      const normalizedGenre = genreNum.toString().padStart(2, '0');
      if (normalizedGenre !== effectiveGenreCode) {
        correctedXml = correctedXml.replace(
          `<TipoGenere>${effectiveGenreCode}</TipoGenere>`,
          `<TipoGenere>${normalizedGenre}</TipoGenere>`
        );
        corrections.push({
          field: 'TipoGenere',
          original: effectiveGenreCode,
          corrected: normalizedGenre,
          reason: 'Normalizzato formato codice genere a 2 cifre',
          siaeErrorPrevented: '2101'
        });
        effectiveGenreCode = normalizedGenre;
      }
    }
  }
  
  // ==================== 6. CORREZIONE AUTORE/ESECUTORE/NAZIONALITÀ IN BASE AL GENERE ====================
  if (effectiveGenreCode) {
    const requirements = SIAE_GENRE_REQUIREMENTS[effectiveGenreCode];
    
    if (requirements) {
      const hasAutore = correctedXml.includes('<Autore>');
      const hasEsecutore = correctedXml.includes('<Esecutore>');
      const hasNazionalita = correctedXml.includes('<NazionalitaFilm>');
      
      // Rimuovi elementi non richiesti
      if (!requirements.needsAutore && hasAutore) {
        correctedXml = correctedXml.replace(/<Autore>[^<]*<\/Autore>\s*/g, '');
        corrections.push({
          field: 'Autore',
          original: 'Presente',
          corrected: 'Rimosso',
          reason: `Autore non previsto per genere ${effectiveGenreCode} (${requirements.description})`,
          siaeErrorPrevented: '2108'
        });
      }
      
      if (!requirements.needsEsecutore && hasEsecutore) {
        correctedXml = correctedXml.replace(/<Esecutore>[^<]*<\/Esecutore>\s*/g, '');
        corrections.push({
          field: 'Esecutore',
          original: 'Presente',
          corrected: 'Rimosso',
          reason: `Esecutore non previsto per genere ${effectiveGenreCode} (${requirements.description})`,
          siaeErrorPrevented: '2111'
        });
      }
      
      if (!requirements.needsNazionalita && hasNazionalita) {
        correctedXml = correctedXml.replace(/<NazionalitaFilm>[^<]*<\/NazionalitaFilm>\s*/g, '');
        corrections.push({
          field: 'NazionalitaFilm',
          original: 'Presente',
          corrected: 'Rimosso',
          reason: `Nazionalità film non prevista per genere ${effectiveGenreCode} (${requirements.description})`,
          siaeErrorPrevented: '2114'
        });
      }
      
      // Aggiungi elementi richiesti se mancanti (solo se abbiamo valori default)
      if (requirements.needsAutore && !hasAutore) {
        const autoreValue = defaultAutore || 'Autore Evento';
        // Inserisci dopo TipoGenere
        if (correctedXml.includes('</TipoGenere>')) {
          correctedXml = correctedXml.replace(
            '</TipoGenere>',
            `</TipoGenere>\n        <Autore>${escapeXml(autoreValue.substring(0, 100))}</Autore>`
          );
          corrections.push({
            field: 'Autore',
            original: 'Mancante',
            corrected: autoreValue.substring(0, 30) + '...',
            reason: `Autore richiesto per genere ${effectiveGenreCode} (${requirements.description})`,
            siaeErrorPrevented: '2110'
          });
        }
      }
      
      if (requirements.needsEsecutore && !hasEsecutore) {
        const esecutoreValue = defaultEsecutore || 'Esecutore Evento';
        // Inserisci dopo Autore o TipoGenere
        if (correctedXml.includes('</Autore>')) {
          correctedXml = correctedXml.replace(
            '</Autore>',
            `</Autore>\n        <Esecutore>${escapeXml(esecutoreValue.substring(0, 100))}</Esecutore>`
          );
        } else if (correctedXml.includes('</TipoGenere>')) {
          correctedXml = correctedXml.replace(
            '</TipoGenere>',
            `</TipoGenere>\n        <Esecutore>${escapeXml(esecutoreValue.substring(0, 100))}</Esecutore>`
          );
        }
        corrections.push({
          field: 'Esecutore',
          original: 'Mancante',
          corrected: esecutoreValue.substring(0, 30) + '...',
          reason: `Esecutore richiesto per genere ${effectiveGenreCode} (${requirements.description})`,
          siaeErrorPrevented: '2110'
        });
      }
      
      if (requirements.needsNazionalita && !hasNazionalita) {
        // Per cinema, aggiungi IT di default
        if (correctedXml.includes('</Esecutore>')) {
          correctedXml = correctedXml.replace(
            '</Esecutore>',
            `</Esecutore>\n        <NazionalitaFilm>IT</NazionalitaFilm>`
          );
        } else if (correctedXml.includes('</TipoGenere>')) {
          correctedXml = correctedXml.replace(
            '</TipoGenere>',
            `</TipoGenere>\n        <NazionalitaFilm>IT</NazionalitaFilm>`
          );
        }
        corrections.push({
          field: 'NazionalitaFilm',
          original: 'Mancante',
          corrected: 'IT',
          reason: `Nazionalità film richiesta per genere ${effectiveGenreCode} (${requirements.description})`,
          siaeErrorPrevented: '2112'
        });
      }
    }
  }
  
  // ==================== 7. CORREZIONE NAZIONALITÀ FILM ISO 3166 ====================
  const nazionalitaMatch = correctedXml.match(/<NazionalitaFilm>([^<]*)<\/NazionalitaFilm>/);
  if (nazionalitaMatch) {
    const nazionalita = nazionalitaMatch[1].toUpperCase().trim();
    if (!VALID_ISO_3166_CODES.has(nazionalita)) {
      // Codice non valido, usa IT di default
      correctedXml = correctedXml.replace(nazionalitaMatch[0], '<NazionalitaFilm>IT</NazionalitaFilm>');
      corrections.push({
        field: 'NazionalitaFilm',
        original: nazionalita,
        corrected: 'IT',
        reason: 'Codice ISO 3166 non valido, impostato Italia (IT)',
        siaeErrorPrevented: '2112'
      });
    } else if (nazionalita !== nazionalitaMatch[1]) {
      // Normalizza a maiuscolo
      correctedXml = correctedXml.replace(nazionalitaMatch[0], `<NazionalitaFilm>${nazionalita}</NazionalitaFilm>`);
      corrections.push({
        field: 'NazionalitaFilm',
        original: nazionalitaMatch[1],
        corrected: nazionalita,
        reason: 'Normalizzato a maiuscolo',
        siaeErrorPrevented: '2112'
      });
    }
  }
  
  // ==================== 8. CORREZIONE CODICE LOCALE (13 cifre) ====================
  const codiceLocaleMatch = correctedXml.match(/<CodiceLocale>([^<]*)<\/CodiceLocale>/);
  if (codiceLocaleMatch) {
    const codice = codiceLocaleMatch[1].replace(/\D/g, ''); // Rimuovi non-cifre
    if (codice.length !== 13) {
      const correctedCodice = codice.padStart(13, '0').substring(0, 13);
      correctedXml = correctedXml.replace(codiceLocaleMatch[0], `<CodiceLocale>${correctedCodice}</CodiceLocale>`);
      corrections.push({
        field: 'CodiceLocale',
        original: codiceLocaleMatch[1],
        corrected: correctedCodice,
        reason: 'Normalizzato a 13 cifre con padding',
        siaeErrorPrevented: '3203'
      });
    }
  }
  
  // ==================== 9. CORREZIONE CODICE FISCALE (11-16 caratteri) ====================
  const cfMatches = correctedXml.match(/<CodiceFiscale>([^<]*)<\/CodiceFiscale>/g);
  if (cfMatches) {
    for (const match of cfMatches) {
      const innerMatch = match.match(/<CodiceFiscale>([^<]*)<\/CodiceFiscale>/);
      if (innerMatch) {
        const cf = innerMatch[1].toUpperCase().replace(/\s/g, '');
        if (cf.length < 11 || cf.length > 16) {
          uncorrectableErrors.push({
            field: 'CodiceFiscale',
            message: `Codice fiscale "${cf}" ha lunghezza non valida (${cf.length} caratteri, richiesti 11-16)`,
            siaeErrorCode: '3111'
          });
        } else if (cf !== innerMatch[1]) {
          // Normalizza (maiuscolo, senza spazi)
          correctedXml = correctedXml.replace(match, `<CodiceFiscale>${cf}</CodiceFiscale>`);
          corrections.push({
            field: 'CodiceFiscale',
            original: innerMatch[1],
            corrected: cf,
            reason: 'Normalizzato a maiuscolo senza spazi',
            siaeErrorPrevented: '3111'
          });
        }
      }
    }
  }
  
  // ==================== 10. RIMOZIONE DOCTYPE (causa errore 40605) ====================
  if (correctedXml.includes('<!DOCTYPE')) {
    correctedXml = correctedXml.replace(/<!DOCTYPE[^>]*>/g, '');
    corrections.push({
      field: 'DOCTYPE',
      original: 'Presente',
      corrected: 'Rimosso',
      reason: 'DOCTYPE non risolto da WS SIAE (XXE protection)',
      siaeErrorPrevented: '40605'
    });
  }
  
  return {
    correctedXml,
    corrections,
    uncorrectableErrors
  };
}

// ==================== PRE-TRANSMISSION VALIDATION ====================

/**
 * VALIDAZIONE CENTRALIZZATA PRE-TRASMISSIONE SIAE
 * 
 * Funzione di validazione unificata che esegue TUTTI i controlli preventivi
 * prima della trasmissione di un report SIAE. Previene gli errori più comuni:
 * - 0600/0603: Incoerenza codice sistema tra XML e nome file
 * - 40603: Encoding UTF-8 non valido
 * - 40601: Formato XML errato
 * - 40605: Impossibile estrarre informazioni (struttura XML)
 * 
 * NOTA: Chiamare autoCorrectSiaeXml() PRIMA di questa funzione per correggere
 * automaticamente gli errori risolvibili.
 * 
 * @param xml - Contenuto XML del report da validare
 * @param systemCode - Codice sistema SIAE (8 caratteri)
 * @param reportType - Tipo di report: 'giornaliero' | 'mensile' | 'rca'
 * @param reportDate - Data del report (per coerenza date)
 * @param denominazione - Denominazione titolare (max 60 char)
 * @param performer - Nome performer/artista (max 100 char)
 * @param transmissionSystemCode - Codice sistema salvato nella trasmissione (se esiste), usato per verificare coerenza
 * @returns Risultato validazione con errori, warning e dettagli
 */
export async function validatePreTransmission(
  xml: string,
  systemCode: string,
  reportType: 'giornaliero' | 'mensile' | 'rca',
  reportDate: Date | string,
  denominazione?: string,
  performer?: string,
  transmissionSystemCode?: string
): Promise<PreTransmissionValidationResult> {
  const errors: PreTransmissionValidationResult['errors'] = [];
  const warnings: PreTransmissionValidationResult['warnings'] = [];
  
  const details = {
    xmlValid: false,
    systemCodeConsistent: false,
    encodingValid: false,
    fieldLengthsValid: false,
    datesCoherent: false
  };
  
  // ==================== 0. VALIDAZIONE CODICE SISTEMA (FIX 2026-01-16) ====================
  // BLOCCO PRIMARIO: Il codice sistema EVENT4U1 NON è registrato presso SIAE e causa errore 0600
  // Questa validazione deve essere eseguita PRIMA di qualsiasi altra operazione
  const systemCodeFormatValidation = validateSiaeSystemCode(systemCode);
  if (!systemCodeFormatValidation.valid) {
    errors.push({
      code: 'INVALID_SYSTEM_CODE',
      field: 'systemCode',
      message: systemCodeFormatValidation.error || 'Codice sistema non valido',
      resolution: systemCodeFormatValidation.isDefault 
        ? 'Configurare il codice sistema SIAE in Impostazioni > SIAE > Configurazione Sistema, oppure collegare una Smart Card attiva tramite Desktop Bridge.'
        : 'Verificare il formato del codice sistema. Codici test: P + 7 cifre (es: P0004010)',
      siaeErrorCode: '0600'
    });
    // Ritorna subito con errore bloccante - non ha senso continuare con codice non valido
    return {
      canTransmit: false,
      errors,
      warnings,
      details
    };
  }
  
  // ==================== 1. VALIDAZIONE ENCODING UTF-8 ====================
  try {
    // Verifica che l'XML sia UTF-8 e non contenga caratteri non-ASCII non escaped
    const encoder = new TextEncoder();
    const encoded = encoder.encode(xml);
    
    // Verifica dichiarazione encoding
    if (!xml.includes('encoding="UTF-8"') && !xml.includes("encoding='UTF-8'")) {
      warnings.push({
        code: 'ENCODING_NOT_DECLARED',
        field: 'encoding',
        message: 'Encoding UTF-8 non dichiarato esplicitamente nell\'XML',
        suggestion: 'Aggiungere encoding="UTF-8" nella dichiarazione XML'
      });
    }
    
    // Verifica che non ci siano caratteri UTF-8 non validi
    const decoder = new TextDecoder('utf-8', { fatal: true });
    try {
      decoder.decode(encoded);
      details.encodingValid = true;
    } catch {
      errors.push({
        code: 'ENCODING_INVALID',
        field: 'encoding',
        message: 'Contenuto XML contiene caratteri non validi UTF-8',
        resolution: 'Verificare che tutti i caratteri speciali siano correttamente escaped',
        siaeErrorCode: '40603'
      });
    }
  } catch (e) {
    errors.push({
      code: 'ENCODING_ERROR',
      field: 'encoding',
      message: 'Errore nella verifica dell\'encoding: ' + (e instanceof Error ? e.message : String(e)),
      siaeErrorCode: '40603'
    });
  }
  
  // ==================== 2. VALIDAZIONE STRUTTURA XML ====================
  const xmlValidation = validateSiaeXml(xml, reportType);
  if (!xmlValidation.valid) {
    // FIX 2026-01-15: Aggiunge SEMPRE un errore bloccante se XML non valido
    // Anche se xmlValidation.errors è vuoto, l'errore deve essere generato
    errors.push({
      code: 'XML_STRUCTURE_INVALID',
      field: 'xml',
      message: xmlValidation.errors.length > 0 
        ? `Struttura XML non valida: ${xmlValidation.errors.join('; ')}`
        : 'Struttura XML non valida: errore di parsing',
      resolution: 'Verificare che l\'XML sia conforme alla DTD SIAE',
      siaeErrorCode: '40601'
    });
    details.xmlValid = false;
  } else {
    details.xmlValid = true;
  }
  
  // Aggiungi warning dalla validazione XML
  for (const warning of xmlValidation.warnings) {
    warnings.push({
      code: 'XML_WARNING',
      field: 'xml',
      message: warning
    });
  }
  
  // ==================== 2b. VALIDAZIONE DTD COMPLETA (FIX 2026-01-16) ====================
  // Chiamata al nuovo validator DTD che controlla:
  // - Ordine attributi secondo DTD v0039
  // - Attributi non validi (es. NomeFile)
  // - Struttura elementi obbligatori
  // - Valori attributi (es. Sostituzione: N|S)
  try {
    const { validateSiaeXML } = await import('./siae-xml-validator');
    const dtdValidation = validateSiaeXML(xml);
    
    // Aggiungi errori DTD
    for (const dtdError of dtdValidation.errors) {
      errors.push({
        code: dtdError.code,
        field: dtdError.element || 'xml',
        message: dtdError.message,
        resolution: dtdError.expected ? `Valore atteso: ${dtdError.expected}` : undefined,
        siaeErrorCode: dtdError.code === 'INVALID_ATTRIBUTE' ? '0600' : 
                       dtdError.code === 'MISSING_ATTRIBUTE' ? '40601' : 
                       dtdError.code === 'INVALID_ATTRIBUTE_VALUE' ? '40605' : undefined
      });
    }
    
    // Aggiungi warning DTD
    for (const dtdWarning of dtdValidation.warnings) {
      warnings.push({
        code: dtdWarning.code,
        field: dtdWarning.element || 'xml',
        message: dtdWarning.message,
        suggestion: dtdWarning.expected ? `Valore consigliato: ${dtdWarning.expected}` : undefined
      });
    }
    
    if (!dtdValidation.valid) {
      details.xmlValid = false;
    }
    
    console.log(`[SIAE-UTILS] DTD validation result: ${dtdValidation.valid ? 'VALID' : 'INVALID'} (type: ${dtdValidation.reportType}, errors: ${dtdValidation.errors.length}, warnings: ${dtdValidation.warnings.length})`);
  } catch (dtdError) {
    console.warn('[SIAE-UTILS] DTD validator import failed, skipping DTD validation:', dtdError);
  }
  
  // ==================== 3. VALIDAZIONE COERENZA CODICE SISTEMA ====================
  const systemCodeValidation = validateSystemCodeConsistency(xml, systemCode);
  if (!systemCodeValidation.valid) {
    details.systemCodeConsistent = false;
    errors.push({
      code: 'SYSTEM_CODE_MISMATCH',
      field: 'systemCode',
      message: systemCodeValidation.error || 'Codice sistema non coerente',
      siaeErrorCode: '0600'
    });
  } else {
    details.systemCodeConsistent = true;
  }
  
  // ==================== 4. VALIDAZIONE LUNGHEZZE CAMPI ====================
  let fieldLengthsValid = true;
  
  // Denominazione: max 60 caratteri
  if (denominazione) {
    if (denominazione.length > 60) {
      fieldLengthsValid = false;
      errors.push({
        code: 'DENOMINAZIONE_TOO_LONG',
        field: 'denominazione',
        message: `Denominazione titolare è troppo lunga: ${denominazione.length} caratteri (max 60)`,
        resolution: 'Ridurre la denominazione a massimo 60 caratteri',
        siaeErrorCode: '2606'
      });
    }
  }
  
  // Performer: max 100 caratteri
  if (performer) {
    if (performer.length > 100) {
      fieldLengthsValid = false;
      errors.push({
        code: 'PERFORMER_TOO_LONG',
        field: 'performer',
        message: `Nome performer è troppo lungo: ${performer.length} caratteri (max 100)`,
        resolution: 'Ridurre il nome performer a massimo 100 caratteri',
        siaeErrorCode: '40605'
      });
    }
  }
  
  // Verifica lunghezze nel contenuto XML
  const denominazioneMatch = xml.match(/<Denominazione>([^<]*)<\/Denominazione>/);
  if (denominazioneMatch && denominazioneMatch[1].length > 60) {
    fieldLengthsValid = false;
    errors.push({
      code: 'XML_DENOMINAZIONE_TOO_LONG',
      field: 'denominazione',
      message: `Denominazione nell'XML è troppo lunga: ${denominazioneMatch[1].length} caratteri (max 60)`,
      resolution: 'Modificare la denominazione nel XML a massimo 60 caratteri',
      siaeErrorCode: '2606'
    });
  }
  
  details.fieldLengthsValid = fieldLengthsValid;
  
  // ==================== 5. VALIDAZIONE COERENZA DATE ====================
  let datesCoherent = true;
  const reportDateObj = typeof reportDate === 'string' ? new Date(reportDate) : reportDate;
  
  // FIX 2026-01-16: DataGenerazione deve essere la data di CREAZIONE del file (oggi),
  // NON la data del periodo del report. Per report di date passate, DataGenerazione è comunque oggi.
  const actualToday = new Date().toISOString().split('T')[0].replace(/-/g, ''); // Data reale odierna YYYYMMDD
  const reportDateStr = reportDateObj.toISOString().split('T')[0].replace(/-/g, ''); // Data periodo report YYYYMMDD
  
  // Tolleranza mezzanotte - accetta anche ieri
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');
  
  // FIX 2026-01-17: RCA usa elementi (non attributi) per le date
  // RCA: <DataGenerazioneRiepilogo>yyyyMMdd</DataGenerazioneRiepilogo>, <DataRiepilogo>yyyyMMdd</DataRiepilogo>
  // RMG/RPM: DataGenerazione="yyyyMMdd" (attributo)
  if (reportType === 'rca') {
    // ==================== VALIDAZIONE DATE RCA (ELEMENTI) ====================
    
    // 1. DataGenerazioneRiepilogo deve essere la data odierna
    const dataGenRiepilogoMatch = xml.match(/<DataGenerazioneRiepilogo>([^<]+)<\/DataGenerazioneRiepilogo>/);
    if (dataGenRiepilogoMatch) {
      const xmlDate = dataGenRiepilogoMatch[1]; // Formato: YYYYMMDD
      
      if (xmlDate !== actualToday && xmlDate !== yesterdayStr) {
        datesCoherent = false;
        errors.push({
          code: 'DATE_MISMATCH',
          field: 'dates',
          message: `DataGenerazioneRiepilogo (${xmlDate}) non corrisponde alla data odierna (${actualToday})`,
          resolution: 'Rigenerare il report per aggiornare DataGenerazioneRiepilogo alla data corrente',
          siaeErrorCode: '0603'
        });
      }
    } else {
      datesCoherent = false;
      errors.push({
        code: 'MISSING_DATA_GENERAZIONE_RIEPILOGO',
        field: 'DataGenerazioneRiepilogo',
        message: 'Elemento DataGenerazioneRiepilogo mancante nell\'XML RCA',
        resolution: 'Verificare che l\'XML RCA contenga <DataGenerazioneRiepilogo>',
        siaeErrorCode: '0603'
      });
    }
    
    // 2. FIX 2026-01-17: DataRiepilogo DEVE corrispondere alla data nel nome file!
    // SIAE Error 0603: "Le date dell'oggetto, del nome file, e del contenuto del riepilogo non sono coerenti"
    // Nome file RCA: RCA_yyyyMMdd_SSSSSSSS_nnn.xsi
    // DataRiepilogo deve essere ESATTAMENTE uguale a yyyyMMdd nel nome file
    const dataRiepilogoMatch = xml.match(/<DataRiepilogo>([^<]+)<\/DataRiepilogo>/);
    if (dataRiepilogoMatch) {
      const xmlDataRiepilogo = dataRiepilogoMatch[1]; // Formato: YYYYMMDD
      
      // DataRiepilogo deve corrispondere a reportDateStr (data dell'evento = data nel nome file)
      if (xmlDataRiepilogo !== reportDateStr) {
        datesCoherent = false;
        errors.push({
          code: 'DATA_RIEPILOGO_MISMATCH',
          field: 'DataRiepilogo',
          message: `DataRiepilogo (${xmlDataRiepilogo}) non corrisponde alla data evento/nome file (${reportDateStr})`,
          resolution: 'La DataRiepilogo nell\'XML deve corrispondere alla data nel nome file RCA',
          siaeErrorCode: '0603'
        });
      }
    } else {
      datesCoherent = false;
      errors.push({
        code: 'MISSING_DATA_RIEPILOGO',
        field: 'DataRiepilogo',
        message: 'Elemento DataRiepilogo mancante nell\'XML RCA',
        resolution: 'Verificare che l\'XML RCA contenga <DataRiepilogo>',
        siaeErrorCode: '0603'
      });
    }
    
  } else {
    // ==================== VALIDAZIONE DATE RMG/RPM (ATTRIBUTI) ====================
    
    // Estrai DataGenerazione dall'XML (attributo)
    const dataGenerazioneMatch = xml.match(/DataGenerazione="([^"]+)"/);
    if (dataGenerazioneMatch) {
      const xmlDate = dataGenerazioneMatch[1]; // Formato: YYYYMMDD
      
      // DataGenerazione deve essere la data odierna (quando è stato generato il file)
      if (xmlDate !== actualToday && xmlDate !== yesterdayStr) {
        datesCoherent = false;
        errors.push({
          code: 'DATE_MISMATCH',
          field: 'dates',
          message: `DataGenerazione (${xmlDate}) non corrisponde alla data odierna (${actualToday})`,
          resolution: 'Rigenerare il report per aggiornare DataGenerazione alla data corrente',
          siaeErrorCode: '0603'
        });
      }
    }
    
    // Verifica Mese attributo (per report mensile)
    // FIX 2026-01-16: L'attributo Mese deve corrispondere al PERIODO del report, non a oggi
    if (reportType === 'mensile') {
      const meseMatch = xml.match(/Mese="([^"]+)"/);
      if (meseMatch) {
        const mese = meseMatch[1]; // Formato: YYYYMM
        const reportMonth = reportDateStr.substring(0, 6); // YYYYMM del periodo richiesto
        if (mese !== reportMonth) {
          datesCoherent = false;
          errors.push({
            code: 'MONTH_MISMATCH',
            field: 'month',
            message: `Attributo Mese (${mese}) non corrisponde al periodo richiesto (${reportMonth})`,
            resolution: 'Verificare che l\'attributo Mese corrisponda al mese del report',
            siaeErrorCode: '0603'
          });
        }
        
        // FIX 2026-01-18: RPM non può essere inviato per un mese non ancora concluso
        // La SIAE richiede che DataGenerazione sia nel mese SUCCESSIVO al periodo di riferimento
        // Es: RPM per gennaio 2026 (Mese="202601") deve avere DataGenerazione >= febbraio 2026
        const meseYear = parseInt(mese.substring(0, 4), 10);
        const meseMonth = parseInt(mese.substring(4, 6), 10);
        const dataGenYear = parseInt(actualToday.substring(0, 4), 10);
        const dataGenMonth = parseInt(actualToday.substring(4, 6), 10);
        
        // Calcola se siamo nel mese successivo o oltre
        const isAfterReportMonth = 
          dataGenYear > meseYear || 
          (dataGenYear === meseYear && dataGenMonth > meseMonth);
        
        if (!isAfterReportMonth) {
          datesCoherent = false;
          errors.push({
            code: 'RPM_MONTH_NOT_CONCLUDED',
            field: 'month',
            message: `Impossibile inviare RPM per ${mese}: il mese non è ancora concluso. DataGenerazione=${actualToday} ma Mese=${mese}`,
            resolution: `Attendere il primo giorno del mese successivo (${meseMonth === 12 ? meseYear + 1 : meseYear}${String((meseMonth % 12) + 1).padStart(2, '0')}) per inviare il riepilogo mensile`,
            siaeErrorCode: '0603'
          });
        }
      }
      
      // FIX 2026-01-18: Verifica che non ci siano eventi futuri nel riepilogo
      // La SIAE non accetta riepiloghi con DataEvento nel futuro
      const dataEventoMatches = Array.from(xml.matchAll(/<DataEvento>(\d{8})<\/DataEvento>/g));
      for (const match of dataEventoMatches) {
        const eventDate = match[1]; // YYYYMMDD
        if (eventDate > actualToday) {
          datesCoherent = false;
          errors.push({
            code: 'FUTURE_EVENT_DATE',
            field: 'DataEvento',
            message: `Il riepilogo contiene un evento con data futura: ${eventDate} (oggi è ${actualToday})`,
            resolution: `Rimuovere gli eventi futuri dal riepilogo o attendere che l'evento si sia svolto`,
            siaeErrorCode: '0603'
          });
        }
      }
      
      // FIX 2026-01-18: Verifica coerenza date interne al riepilogo RPM
      // TUTTE le date nel contenuto XML devono appartenere al mese dichiarato
      // Errore 0603: "Le date dell'oggetto, del nome file, e del contenuto del riepilogo non sono coerenti"
      const meseMatchForContent = xml.match(/Mese="([^"]+)"/);
      if (meseMatchForContent) {
        const reportMese = meseMatchForContent[1]; // YYYYMM
        
        // Validazione <Validita> - date di validità biglietti/abbonamenti
        const validitaMatches = Array.from(xml.matchAll(/<Validita>(\d{8})<\/Validita>/g));
        for (const match of validitaMatches) {
          const validitaDate = match[1]; // YYYYMMDD
          const validitaMese = validitaDate.substring(0, 6); // YYYYMM
          
          // La Validita DEVE appartenere al mese del report
          if (validitaMese !== reportMese) {
            datesCoherent = false;
            errors.push({
              code: 'VALIDITA_DATE_MISMATCH',
              field: 'Validita',
              message: `Data Validita (${validitaDate}) non appartiene al mese del riepilogo (${reportMese})`,
              resolution: `Tutte le date <Validita> devono essere nel mese ${reportMese}. Verificare la logica di generazione abbonamenti.`,
              siaeErrorCode: '0603'
            });
          }
        }
        
        // Validazione <DataInizioValidita> per abbonamenti
        const dataInizioMatches = Array.from(xml.matchAll(/<DataInizioValidita>(\d{8})<\/DataInizioValidita>/g));
        for (const match of dataInizioMatches) {
          const inizioDate = match[1]; // YYYYMMDD
          const inizioMese = inizioDate.substring(0, 6); // YYYYMM
          
          if (inizioMese !== reportMese) {
            datesCoherent = false;
            errors.push({
              code: 'DATA_INIZIO_VALIDITA_MISMATCH',
              field: 'DataInizioValidita',
              message: `Data inizio validità (${inizioDate}) non appartiene al mese del riepilogo (${reportMese})`,
              resolution: `Tutte le date <DataInizioValidita> devono essere nel mese ${reportMese}`,
              siaeErrorCode: '0603'
            });
          }
        }
        
        // Validazione <DataFineValidita> per abbonamenti
        // NOTA: DataFineValidita può essere FUTURA rispetto al mese del report (es. abbonamento annuale)
        // MA se è PASSATA deve comunque appartenere almeno al mese del report o successivo
        const dataFineMatches = Array.from(xml.matchAll(/<DataFineValidita>(\d{8})<\/DataFineValidita>/g));
        for (const match of dataFineMatches) {
          const fineDate = match[1]; // YYYYMMDD
          const fineMese = fineDate.substring(0, 6); // YYYYMM
          
          // DataFineValidita deve essere >= al mese del report (può essere futura)
          if (fineMese < reportMese) {
            datesCoherent = false;
            errors.push({
              code: 'DATA_FINE_VALIDITA_EXPIRED',
              field: 'DataFineValidita',
              message: `Data fine validità (${fineDate}) è precedente al mese del riepilogo (${reportMese})`,
              resolution: `Le date <DataFineValidita> devono essere nel mese ${reportMese} o successivo`,
              siaeErrorCode: '0603'
            });
          }
        }
        
        // Validazione <DataEmissione> per biglietti nel riepilogo
        const dataEmissioneMatches = Array.from(xml.matchAll(/<DataEmissione>(\d{8})<\/DataEmissione>/g));
        for (const match of dataEmissioneMatches) {
          const emissioneDate = match[1]; // YYYYMMDD
          const emissioneMese = emissioneDate.substring(0, 6); // YYYYMM
          
          // DataEmissione deve appartenere al mese del report
          if (emissioneMese !== reportMese) {
            datesCoherent = false;
            errors.push({
              code: 'DATA_EMISSIONE_MISMATCH',
              field: 'DataEmissione',
              message: `Data emissione (${emissioneDate}) non appartiene al mese del riepilogo (${reportMese})`,
              resolution: `Tutte le date <DataEmissione> devono essere nel mese ${reportMese}`,
              siaeErrorCode: '0603'
            });
          }
        }
      }
    }
    
    // Verifica Data attributo (per report giornaliero)
    // FIX 2026-01-16: L'attributo Data deve corrispondere al PERIODO del report, non a oggi
    if (reportType === 'giornaliero') {
      const dataMatch = xml.match(/Data="([^"]+)"/);
      if (dataMatch) {
        const data = dataMatch[1]; // Formato: YYYYMMDD
        if (data !== reportDateStr) {
          datesCoherent = false;
          errors.push({
            code: 'DAY_MISMATCH',
            field: 'day',
            message: `Attributo Data (${data}) non corrisponde al periodo richiesto (${reportDateStr})`,
            resolution: 'Verificare che l\'attributo Data corrisponda alla data del report',
            siaeErrorCode: '0603'
          });
        }
      }
    }
  }
  
  details.datesCoherent = datesCoherent;
  
  // ==================== 6. VALIDAZIONE TRANSMISSION SYSTEM CODE ====================
  // Confronta il systemCode della trasmissione salvata (se disponibile) con quello risolto ora
  // Previene l'invio di trasmissioni con codice sistema incoerente nel database
  if (transmissionSystemCode && transmissionSystemCode !== systemCode) {
    errors.push({
      code: 'TRANSMISSION_SYSTEM_CODE_MISMATCH',
      field: 'systemCode',
      message: `Il codice sistema salvato nella trasmissione (${transmissionSystemCode}) non corrisponde al codice sistema risolto (${systemCode})`,
      resolution: 'Aggiornare il record di trasmissione con il codice sistema corretto prima di reinviare',
      siaeErrorCode: '0600'
    });
  }
  
  // ==================== 7. VALIDAZIONE OBBLIGATORIA ELEMENTI ====================
  // FIX 2026-01-17: RCA usa elementi diversi da RMG/RPM
  if (reportType === 'rca') {
    // RCA usa DenominazioneTitolareCA, CFTitolareCA, CodiceSistemaCA
    const rcaRequiredElements = ['Titolare', 'DenominazioneTitolareCA', 'CFTitolareCA', 'CodiceSistemaCA', 'DataRiepilogo'];
    for (const elem of rcaRequiredElements) {
      if (!xml.includes(`<${elem}>`)) {
        errors.push({
          code: `MISSING_${elem.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
          field: elem,
          message: `Elemento RCA obbligatorio mancante: <${elem}>`,
          siaeErrorCode: '40605'
        });
      }
    }
  } else {
    // RMG/RPM usano Denominazione, CodiceFiscale
    const requiredElements = ['Titolare', 'Denominazione', 'CodiceFiscale'];
    for (const elem of requiredElements) {
      if (!xml.includes(`<${elem}>`)) {
        errors.push({
          code: `MISSING_${elem.toUpperCase()}`,
          field: elem,
          message: `Elemento obbligatorio mancante: <${elem}>`,
          siaeErrorCode: '40605'
        });
      }
    }
  }
  
  // ==================== 8. VALIDAZIONE ATTRIBUTI/ELEMENTI GENERAZIONE ====================
  // FIX 2026-01-17: RCA usa elementi, RMG/RPM usano attributi
  if (reportType === 'rca') {
    // RCA usa elementi per le date di generazione (già validati in sezione 5)
    // Verifica solo ProgressivoRiepilogo
    if (!xml.includes('<ProgressivoRiepilogo>')) {
      errors.push({
        code: 'MISSING_PROGRESSIVO_RIEPILOGO',
        field: 'ProgressivoRiepilogo',
        message: 'Elemento obbligatorio mancante: <ProgressivoRiepilogo>',
        siaeErrorCode: '40605'
      });
    }
    if (!xml.includes('<OraGenerazioneRiepilogo>')) {
      errors.push({
        code: 'MISSING_ORA_GENERAZIONE_RIEPILOGO',
        field: 'OraGenerazioneRiepilogo',
        message: 'Elemento obbligatorio mancante: <OraGenerazioneRiepilogo>',
        siaeErrorCode: '40605'
      });
    }
  } else {
    // RMG/RPM usano attributi per le date di generazione
    const requiredAttributes = ['DataGenerazione', 'OraGenerazione', 'ProgressivoGenerazione'];
    for (const attr of requiredAttributes) {
      if (!xml.includes(`${attr}="`)) {
        errors.push({
          code: `MISSING_ATTR_${attr.toUpperCase()}`,
          field: attr,
          message: `Attributo obbligatorio mancante: ${attr}`,
          siaeErrorCode: '40605'
        });
      }
    }
  }
  
  // ==================== CALCOLO RISULTATO FINALE ====================
  // FIX 2026-01-15: canTransmit è TRUE solo se TUTTI i dettagli sono validi E non ci sono errori
  const allDetailsValid = details.xmlValid && 
                          details.systemCodeConsistent && 
                          details.encodingValid && 
                          details.fieldLengthsValid && 
                          details.datesCoherent;
  const canTransmit = errors.length === 0 && allDetailsValid;
  
  return {
    canTransmit,
    errors,
    warnings,
    details
  };
}

// ==================== C1 XML Generation (Unified) ====================

/**
 * Parameters for unified C1 XML generation
 * Supports both daily (RMG) and monthly (RPM) reports
 */
export interface C1XmlParams {
  reportKind: 'giornaliero' | 'mensile';
  companyId: string;
  reportDate: Date;
  resolvedSystemCode: string;
  progressivo: number;
  taxId: string;
  businessName: string;
  events: C1EventContext[];
  subscriptions?: C1SubscriptionData[];
}

/**
 * Event context with all pre-hydrated data
 */
export interface C1EventContext {
  ticketedEvent: {
    id: string;
    companyId: string;
    eventId: string;
    siaeLocationCode?: string | null;
    capacity?: number | null;
    taxType?: string | null;
    entertainmentIncidence?: number | null;
    genreCode?: string | null;
    genreIncidence?: number | null;
    author?: string | null;
    performer?: string | null;
    organizerType?: string | null;
  };
  eventRecord: {
    id: string;
    name?: string;
    startDatetime?: Date | string;
    locationId?: string;
  } | null;
  location?: {
    name?: string;
    siaeLocationCode?: string | null;
  } | null;
  sectors: C1SectorData[];
  tickets: C1TicketData[];
}

/**
 * Sector data for C1 report
 */
export interface C1SectorData {
  id: string;
  sectorCode?: string | null;
  orderCode?: string | null;
  capacity?: number | null;
}

/**
 * Ticket data for C1 report
 */
export interface C1TicketData {
  id: string;
  ticketedEventId: string;
  sectorId?: string | null;
  status: string;
  ticketTypeCode?: string | null;
  isComplimentary?: boolean;
  grossAmount?: string | number | null;
  prevendita?: string | number | null;
  vatAmount?: string | number | null;
  prevenditaVat?: string | number | null;
  serviceAmount?: string | number | null;
  cancellationReasonCode?: string | null;
  cancellationDate?: Date | null;
}

/**
 * Subscription data for C1 report
 */
export interface C1SubscriptionData {
  id: string;
  subscriptionCode: string;
  ticketedEventId?: string | null;
  sectorId?: string | null;
  validTo?: Date | string;
  createdAt?: Date;
  taxType?: string | null;
  turnType?: string | null;
  ticketTypeCode?: string | null;
  isComplimentary?: boolean;
  status: string;
  totalAmount?: string | number | null;
  rateoVat?: string | number | null;
  eventsCount?: number | null;
}

/**
 * Result from C1 XML generation
 */
export interface C1XmlResult {
  xml: string;
  stats: {
    ticketsCount: number;
    totalRevenue: number;
    eventsCount: number;
    subscriptionsCount: number;
  };
}

/**
 * Generate C1 XML Report (RiepilogoGiornaliero or RiepilogoMensile)
 * Unified function that replaces both generateC1ReportXml (routes) and generateC1StyleXml (scheduler)
 * 
 * Conforme al tracciato SIAE Allegato B - Provvedimento 04/03/2008
 * Importi in centesimi (interi), struttura con Abbonamenti
 * 
 * @param params - All required parameters with pre-hydrated data
 * @returns XML string and statistics
 */
export function generateC1Xml(params: C1XmlParams): C1XmlResult {
  const {
    reportKind,
    companyId,
    reportDate,
    resolvedSystemCode,
    progressivo,
    taxId,
    businessName,
    events,
    subscriptions = []
  } = params;

  const isMonthly = reportKind === 'mensile';
  const now = new Date();
  const dataGenAttr = formatSiaeDateCompact(now);
  const oraGen = formatSiaeTimeCompact(now);

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
  const progressivePadded = String(progressivo).padStart(3, '0');

  // FIX 2026-01-18: Per report giornaliero (RMG), 0 biglietti è permesso
  // Per report mensile (RPM), rimane un errore bloccante
  if (events.length === 0 && subscriptions.length === 0) {
    if (isMonthly) {
      throw new Error('SIAE_NO_EVENTS: Nessun biglietto o abbonamento trovato per il periodo richiesto. Il report C1 mensile richiede almeno un evento con biglietti emessi.');
    }
    // Per giornaliero, genera un report vuoto con warning nel log
    console.warn('[generateC1Xml] Report giornaliero senza eventi/abbonamenti - generazione report vuoto');
  }

  let eventsXml = '';
  const DEFAULT_SECTOR_KEY = '__DEFAULT__';
  let totalTicketsCount = 0;
  let totalRevenue = 0;

  for (const eventContext of events) {
    const { ticketedEvent, eventRecord, location, sectors, tickets } = eventContext;
    if (!eventRecord) continue;

    const venueName = location?.name || 'N/D';
    const rawVenueCode = ticketedEvent.siaeLocationCode || location?.siaeLocationCode || '0000000000001';
    const venueCode = rawVenueCode.replace(/\D/g, '').padStart(13, '0').substring(0, 13);

    const eventDate = new Date(eventRecord.startDatetime || reportDate);
    const eventDateStr = formatSiaeDateCompact(eventDate);
    const eventTimeStr = formatSiaeTimeHHMM(eventDate);

    const ticketsBySector: Map<string, C1TicketData[]> = new Map();
    for (const ticket of tickets) {
      const sectorKey = ticket.sectorId || DEFAULT_SECTOR_KEY;
      if (!ticketsBySector.has(sectorKey)) {
        ticketsBySector.set(sectorKey, []);
      }
      ticketsBySector.get(sectorKey)!.push(ticket);
    }

    let sectorsXml = '';
    for (const [sectorKey, sectorTickets] of Array.from(ticketsBySector.entries())) {
      let codiceOrdine = normalizeSiaeCodiceOrdine(null);
      let capacity = ticketedEvent.capacity || 100;

      if (sectorKey !== DEFAULT_SECTOR_KEY) {
        const sector = sectors.find(s => s.id === sectorKey);
        if (sector) {
          codiceOrdine = normalizeSiaeCodiceOrdine(sector.sectorCode || sector.orderCode);
          capacity = sector.capacity || capacity;
        }
      }

      const ticketsByType: Map<string, C1TicketData[]> = new Map();
      for (const ticket of sectorTickets) {
        const tipoTitolo = normalizeSiaeTipoTitolo(ticket.ticketTypeCode, ticket.isComplimentary);
        if (tipoTitolo === 'ABB') continue;
        if (!ticketsByType.has(tipoTitolo)) {
          ticketsByType.set(tipoTitolo, []);
        }
        ticketsByType.get(tipoTitolo)!.push(ticket);
      }

      let titoliAccessoXml = '';
      let totalOmaggiIva = 0;

      for (const [tipoTitolo, typeTickets] of Array.from(ticketsByType.entries())) {
        const validTickets = typeTickets.filter((t: C1TicketData) =>
          !isCancelledStatus(t.status) && !t.cancellationReasonCode && !t.cancellationDate
        );

        if (validTickets.length === 0) continue;

        const quantita = validTickets.length;
        totalTicketsCount += quantita;

        const corrispettivoLordo = toCentesimi(validTickets.reduce((sum: number, t: C1TicketData) => sum + parseFloat(String(t.grossAmount || '0')), 0));
        const prevendita = toCentesimi(validTickets.reduce((sum: number, t: C1TicketData) => sum + parseFloat(String(t.prevendita || '0')), 0));
        const ivaCorrispettivo = toCentesimi(validTickets.reduce((sum: number, t: C1TicketData) => sum + parseFloat(String(t.vatAmount || '0')), 0));
        const ivaPrevendita = toCentesimi(validTickets.reduce((sum: number, t: C1TicketData) => sum + parseFloat(String(t.prevenditaVat || '0')), 0));
        const importoPrestazione = toCentesimi(validTickets.reduce((sum: number, t: C1TicketData) => sum + parseFloat(String(t.serviceAmount || '0')), 0));

        totalRevenue += corrispettivoLordo;

        if (tipoTitolo === 'O1') {
          totalOmaggiIva += ivaCorrispettivo;
        }

        titoliAccessoXml += `
                <TitoliAccesso>
                    <TipoTitolo>${escapeXml(tipoTitolo)}</TipoTitolo>
                    <Quantita>${quantita}</Quantita>
                    <CorrispettivoLordo>${corrispettivoLordo}</CorrispettivoLordo>
                    <Prevendita>${prevendita}</Prevendita>
                    <IVACorrispettivo>${ivaCorrispettivo}</IVACorrispettivo>
                    <IVAPrevendita>${ivaPrevendita}</IVAPrevendita>
                    <ImportoPrestazione>${importoPrestazione}</ImportoPrestazione>
                </TitoliAccesso>`;
      }

      if (isMonthly) {
        sectorsXml += `
            <OrdineDiPosto>
                <CodiceOrdine>${escapeXml(codiceOrdine)}</CodiceOrdine>
                <Capienza>${capacity}</Capienza>
                <IVAEccedenteOmaggi>${totalOmaggiIva}</IVAEccedenteOmaggi>${titoliAccessoXml}
            </OrdineDiPosto>`;
      } else {
        sectorsXml += `
            <OrdineDiPosto>
                <CodiceOrdine>${escapeXml(codiceOrdine)}</CodiceOrdine>
                <Capienza>${capacity}</Capienza>${titoliAccessoXml}
            </OrdineDiPosto>`;
      }
    }

    if (sectorsXml === '') {
      if (isMonthly) {
        sectorsXml = `
            <OrdineDiPosto>
                <CodiceOrdine>${normalizeSiaeCodiceOrdine(null)}</CodiceOrdine>
                <Capienza>${ticketedEvent.capacity || 100}</Capienza>
                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>
            </OrdineDiPosto>`;
      } else {
        sectorsXml = `
            <OrdineDiPosto>
                <CodiceOrdine>${normalizeSiaeCodiceOrdine(null)}</CodiceOrdine>
                <Capienza>${ticketedEvent.capacity || 100}</Capienza>
            </OrdineDiPosto>`;
      }
    }

    const tipoTassazione = ticketedEvent.taxType || 'S';
    const incidenza = tipoTassazione === 'I' ? (ticketedEvent.entertainmentIncidence ?? 100) : 0;
    const imponibileIntrattenimenti = 0;
    const genreCode = mapToSiaeTipoGenere(ticketedEvent.genreCode);
    const incidenzaGenere = ticketedEvent.genreIncidence ?? 0;
    const eventName = eventRecord.name || 'Evento';

    const genreNum = parseInt(genreCode);
    const requiresPerformer = (genreNum >= 5 && genreNum <= 9) || (genreNum >= 45 && genreNum <= 59);

    let autoreXml = '';
    let esecutoreXml = '';
    if (requiresPerformer) {
      if (ticketedEvent.author) {
        autoreXml = `
                        <Autore>${escapeXml(ticketedEvent.author)}</Autore>`;
      }
      const performer = ticketedEvent.performer || eventName;
      esecutoreXml = `
                        <Esecutore>${escapeXml(performer)}</Esecutore>`;
    }

    let intrattenimentoXml: string;
    if (isMonthly) {
      intrattenimentoXml = `
            <Intrattenimento>
                <TipoTassazione valore="${escapeXml(tipoTassazione)}"/>
                <Incidenza>${incidenza}</Incidenza>
                <ImponibileIntrattenimenti>${imponibileIntrattenimenti}</ImponibileIntrattenimenti>
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

    eventsXml += `
        <Evento>${intrattenimentoXml}
            <Locale>
                <Denominazione>${escapeXml(venueName)}</Denominazione>
                <CodiceLocale>${escapeXml(venueCode)}</CodiceLocale>
            </Locale>
            <DataEvento>${eventDateStr}</DataEvento>
            <OraEvento>${eventTimeStr}</OraEvento>
            <MultiGenere>
                <TipoGenere>${escapeXml(genreCode)}</TipoGenere>
                <IncidenzaGenere>${incidenzaGenere}</IncidenzaGenere>
                <TitoliOpere>
                    <Titolo>${escapeXml(eventName)}</Titolo>${autoreXml}${esecutoreXml}
                </TitoliOpere>
            </MultiGenere>${sectorsXml}
        </Evento>`;
  }

  let abbonamentiXml = '';
  if (subscriptions.length > 0) {
    const subsByCode: Map<string, C1SubscriptionData[]> = new Map();
    for (const sub of subscriptions) {
      const code = sub.subscriptionCode;
      if (!subsByCode.has(code)) {
        subsByCode.set(code, []);
      }
      subsByCode.get(code)!.push(sub);
    }

    for (const [subCode, subs] of Array.from(subsByCode.entries())) {
      const firstSub = subs[0];
      const validTo = new Date(firstSub.validTo || new Date());
      const validitaStr = formatSiaeDateCompact(validTo);

      let codiceOrdine = normalizeSiaeCodiceOrdine(null);
      if (firstSub.sectorId) {
        for (const event of events) {
          const sector = event.sectors.find(s => s.id === firstSub.sectorId);
          if (sector) {
            codiceOrdine = normalizeSiaeCodiceOrdine(sector.sectorCode || sector.orderCode);
            break;
          }
        }
      }

      const tipoTitolo = normalizeSiaeTipoTitolo(firstSub.ticketTypeCode, firstSub.isComplimentary);
      const subTipoTassazione = firstSub.taxType || 'S';
      const turno = firstSub.turnType || 'F';

      const emittedSubs = subs.filter((s: C1SubscriptionData) => s.status === 'active');
      const cancelledSubs = subs.filter((s: C1SubscriptionData) => s.status === 'cancelled');

      const emessiQuantita = emittedSubs.length;
      const emessiCorrispettivo = toCentesimi(emittedSubs.reduce((sum: number, s: C1SubscriptionData) => sum + parseFloat(String(s.totalAmount || '0')), 0));
      const emessiIva = toCentesimi(emittedSubs.reduce((sum: number, s: C1SubscriptionData) => sum + parseFloat(String(s.rateoVat || '0')), 0));

      const annullatiQuantita = cancelledSubs.length;
      const annullatiCorrispettivo = toCentesimi(cancelledSubs.reduce((sum: number, s: C1SubscriptionData) => sum + parseFloat(String(s.totalAmount || '0')), 0));
      const annullatiIva = toCentesimi(cancelledSubs.reduce((sum: number, s: C1SubscriptionData) => sum + parseFloat(String(s.rateoVat || '0')), 0));

      abbonamentiXml += `
        <Abbonamenti>
            <CodiceAbbonamento>${escapeXml(subCode)}</CodiceAbbonamento>
            <Validita>${validitaStr}</Validita>
            <TipoTassazione valore="${subTipoTassazione}"/>
            <Turno valore="${turno}"/>
            <CodiceOrdine>${codiceOrdine}</CodiceOrdine>
            <TipoTitolo>${tipoTitolo}</TipoTitolo>
            <QuantitaEventiAbilitati>${firstSub.eventsCount || 1}</QuantitaEventiAbilitati>
            <AbbonamentiEmessi>
                <Quantita>${emessiQuantita}</Quantita>
                <CorrispettivoLordo>${emessiCorrispettivo}</CorrispettivoLordo>
                <Prevendita>0</Prevendita>
                <IVACorrispettivo>${emessiIva}</IVACorrispettivo>
                <IVAPrevendita>0</IVAPrevendita>
            </AbbonamentiEmessi>
            <AbbonamentiAnnullati>
                <Quantita>${annullatiQuantita}</Quantita>
                <CorrispettivoLordo>${annullatiCorrispettivo}</CorrispettivoLordo>
                <Prevendita>0</Prevendita>
                <IVACorrispettivo>${annullatiIva}</IVACorrispettivo>
                <IVAPrevendita>0</IVAPrevendita>
            </AbbonamentiAnnullati>
        </Abbonamenti>`;
    }
  }

  const titolareName = businessName;
  const organizerName = businessName;
  const organizerTaxId = taxId;
  const organizerType = 'G';
  const rootElement = isMonthly ? 'RiepilogoMensile' : 'RiepilogoGiornaliero';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<${rootElement} Sostituzione="${sostituzione}" ${periodAttrName}="${periodAttrValue}" DataGenerazione="${dataGenAttr}" OraGenerazione="${oraGen}" ProgressivoGenerazione="${progressivePadded}">
    <Titolare>
        <Denominazione>${escapeXml(titolareName)}</Denominazione>
        <CodiceFiscale>${escapeXml(taxId)}</CodiceFiscale>
        <SistemaEmissione>${escapeXml(resolvedSystemCode)}</SistemaEmissione>
    </Titolare>
    <Organizzatore>
        <Denominazione>${escapeXml(organizerName)}</Denominazione>
        <CodiceFiscale>${escapeXml(organizerTaxId)}</CodiceFiscale>
        <TipoOrganizzatore valore="${organizerType}"/>${eventsXml}${abbonamentiXml}
    </Organizzatore>
</${rootElement}>`;

  return {
    xml,
    stats: {
      ticketsCount: totalTicketsCount,
      totalRevenue: totalRevenue / 100,
      eventsCount: events.length,
      subscriptionsCount: subscriptions.length
    }
  };
}
