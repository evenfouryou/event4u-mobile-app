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
 * Genera nome file conforme Allegato C SIAE (Provvedimento Agenzia Entrate 04/03/2008)
 * - RMG_AAAA_MM_GG_###.xsi per Riepilogo Mensile Giornaliero (silenzioso)
 * - RPM_AAAA_MM_###.xsi per Riepilogo Periodico Mensile (silenzioso)
 * - RCA_AAAA_MM_GG_###.xsi per Riepilogo Controllo Accessi (C1 evento, genera risposta SIAE)
 * 
 * Per file firmati CAdES-BES: estensione .xsi.p7m
 * Per file non firmati o XMLDSig legacy: estensione .xsi
 * 
 * NOTA: XMLDSig è deprecato e NON accettato da SIAE dal 2025
 * Solo CAdES-BES con SHA-256 produce file P7M validi
 */
export function generateSiaeFileName(
  reportType: 'giornaliero' | 'mensile' | 'rca' | 'log',
  date: Date,
  progressivo: number,
  signatureFormat?: 'cades' | 'xmldsig' | null
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prog = String(progressivo).padStart(3, '0');
  
  // Solo CAdES-BES produce veri file P7M, XMLDSig rimane .xsi
  const extension = signatureFormat === 'cades' ? '.xsi.p7m' : '.xsi';
  
  if (signatureFormat === 'xmldsig') {
    console.warn('[SIAE-UTILS] ATTENZIONE: XMLDSig e DEPRECATO e rifiutato da SIAE. Aggiornare il bridge desktop a v3.14+ per CAdES-BES con SHA-256.');
  }
  
  switch (reportType) {
    case 'mensile':
      // RPM = Riepilogo Periodico Mensile (silenzioso, nessuna risposta SIAE)
      return `RPM_${year}_${month}_${prog}${extension}`;
    case 'log':
    case 'rca':
      // RCA = Riepilogo Controllo Accessi (C1 evento, genera risposta SIAE Log.xsi)
      // Conforme Allegato C - NON usare LOG_ che non esiste nella normativa
      return `RCA_${year}_${month}_${day}_${prog}${extension}`;
    case 'giornaliero':
    default:
      // RMG = Riepilogo Mensile Giornaliero (silenzioso, nessuna risposta SIAE)
      return `RMG_${year}_${month}_${day}_${prog}${extension}`;
  }
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
  
  // Valori default e configurazione
  // 1. SistemaEmissione: da systemConfig.systemCode o default
  const sistemaEmissione = systemConfig?.systemCode || SIAE_SYSTEM_CODE_DEFAULT;
  
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
    systemConfig?.systemCode || SIAE_SYSTEM_CODE_DEFAULT
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
    
    // RiferimentoAnnullamento: OBBLIGATORIO quando Annullamento="S" (Allegato B art. 5.4)
    if (isCancelled) {
      xmlLines.push(`      <RiferimentoAnnullamento>`);
      // OriginaleRiferimentoAnnullamento: progressivo del biglietto originale
      const originaleRef = ticket.originalProgressiveNumber || ticket.progressiveNumber || ticketIndex;
      xmlLines.push(`        <OriginaleRiferimentoAnnullamento>${String(originaleRef).padStart(10, '0')}</OriginaleRiferimentoAnnullamento>`);
      // CartaRiferimentoAnnullamento: carta usata per emissione originale
      xmlLines.push(`        <CartaRiferimentoAnnullamento>${escapeXml(cartaAttivazioneValue)}</CartaRiferimentoAnnullamento>`);
      // CausaleRiferimentoAnnullamento: motivo annullamento (3 cifre)
      xmlLines.push(`        <CausaleRiferimentoAnnullamento>${causaleAnnullamento}</CausaleRiferimentoAnnullamento>`);
      xmlLines.push(`      </RiferimentoAnnullamento>`);
    }
    
    xmlLines.push(`    </TitoloAccesso>`);
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
  'annullato_rivendita'  // Secondary ticketing marketplace
] as const;

/**
 * Verifica se uno status indica un biglietto annullato
 */
export function isCancelledStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return SIAE_CANCELLED_STATUSES.includes(status.toLowerCase() as any);
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
    const corrMatches = xml.matchAll(/<CorrispettivoLordo>(\d+)<\/CorrispettivoLordo>/g);
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
      const quantitaMatches = xml.matchAll(/<TitoliEmessi>[^]*?<Quantita>(\d+)<\/Quantita>/g);
      for (const match of quantitaMatches) {
        summary.ticketsCount += parseInt(match[1], 10);
      }
      
      // Somma importi da CorrispettivoLordo
      const corrMatches = xml.matchAll(/<CorrispettivoLordo>(\d+)<\/CorrispettivoLordo>/g);
      for (const match of corrMatches) {
        summary.totalAmount += parseInt(match[1], 10);
      }
    } else {
      // SIAE richiede almeno un evento nel report C1 - senza eventi il report è invalido
      errors.push('SIAE_NO_EVENTS: Nessun elemento <Evento> trovato. Il report C1 richiede almeno un evento con biglietti emessi.');
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
