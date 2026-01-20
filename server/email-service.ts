import nodemailer from 'nodemailer';
import { isBridgeConnected, requestSmimeSignature, getCardSignerEmail } from './bridge-relay';
import { validateFileName as validateSiaeFileNameFormat } from './siae-transmission';

/**
 * Formatta una stringa Base64 in righe da 76 caratteri per MIME (RFC 2045)
 * CRITICO: Senza questa formattazione, righe lunghissime possono essere
 * troncate/corrotte durante la trasmissione email, causando errore SIAE 40605
 */
function formatBase64ForMime(base64: string, lineLength: number = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += lineLength) {
    lines.push(base64.substring(i, i + lineLength));
  }
  return lines.join('\r\n');
}

// Transporter principale per email generiche (info@eventfouryou.com)
export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

emailTransporter.verify((error, success) => {
  if (error) {
    console.error('[EMAIL-SERVICE] SMTP connection failed:', error.message);
  } else {
    console.log('[EMAIL-SERVICE] SMTP server connected successfully');
  }
});

// Transporter separato per email SIAE (tickefouryou@gmail.com - corrisponde al certificato smart card)
// Usato solo per trasmissioni SIAE che richiedono firma S/MIME
const siaeSmtpUser = process.env.SIAE_SMTP_USER || process.env.SMTP_USER;
const siaeSmtpPass = process.env.SIAE_SMTP_PASS || process.env.SMTP_PASS;

export const siaeEmailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: siaeSmtpUser,
    pass: siaeSmtpPass,
  },
});

// Verifica connessione SIAE SMTP solo se configurato diversamente
if (process.env.SIAE_SMTP_USER && process.env.SIAE_SMTP_USER !== process.env.SMTP_USER) {
  siaeEmailTransporter.verify((error, success) => {
    if (error) {
      console.error('[EMAIL-SERVICE] SIAE SMTP connection failed:', error.message);
    } else {
      console.log(`[EMAIL-SERVICE] SIAE SMTP connected (${process.env.SIAE_SMTP_USER})`);
    }
  });
}

interface TicketEmailOptions {
  to: string;
  subject: string;
  eventName: string;
  tickets: Array<{ id: string; html: string }>;
  pdfBuffers: Buffer[];
}

export async function sendTicketEmail(options: TicketEmailOptions): Promise<void> {
  const { to, subject, eventName, tickets, pdfBuffers } = options;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #0a0e17;
      color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #FFD700;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      color: #ffffff;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 16px;
      color: #94A3B8;
    }
    .card {
      background-color: #151922;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
    }
    .event-name {
      font-size: 22px;
      font-weight: bold;
      color: #FFD700;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #1e2533;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #94A3B8;
      font-size: 14px;
    }
    .info-value {
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
    }
    .tickets-section {
      margin-top: 30px;
    }
    .tickets-title {
      font-size: 18px;
      color: #ffffff;
      margin-bottom: 15px;
    }
    .ticket-item {
      background-color: #1e2533;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .ticket-icon {
      width: 40px;
      height: 40px;
      background-color: #00CED1;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0a0e17;
      font-weight: bold;
    }
    .ticket-info {
      flex: 1;
    }
    .ticket-id {
      font-size: 14px;
      color: #ffffff;
    }
    .ticket-status {
      font-size: 12px;
      color: #00CED1;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #1e2533;
    }
    .footer-text {
      color: #94A3B8;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .footer-link {
      color: #FFD700;
      text-decoration: none;
    }
    .cta-button {
      display: inline-block;
      background-color: #FFD700;
      color: #0a0e17;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      font-size: 16px;
      margin-top: 20px;
    }
    .notice {
      background-color: rgba(0, 206, 209, 0.1);
      border: 1px solid #00CED1;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
    }
    .notice-text {
      color: #00CED1;
      font-size: 14px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Event4U</div>
      <div class="title">I tuoi biglietti sono pronti!</div>
      <div class="subtitle">Grazie per il tuo acquisto</div>
    </div>

    <div class="card">
      <div class="event-name">${eventName}</div>
      <div class="info-row">
        <span class="info-label">Numero biglietti</span>
        <span class="info-value">${tickets.length}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data acquisto</span>
        <span class="info-value">${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>

    <div class="tickets-section">
      <div class="tickets-title">I tuoi biglietti</div>
      ${tickets.map((ticket, index) => `
        <div class="ticket-item">
          <div class="ticket-icon">${index + 1}</div>
          <div class="ticket-info">
            <div class="ticket-id">Biglietto #${ticket.id.slice(-8).toUpperCase()}</div>
            <div class="ticket-status">Allegato come PDF</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="notice">
      <p class="notice-text">I biglietti in formato PDF sono allegati a questa email. Stampali o mostrali dal tuo smartphone all'ingresso dell'evento.</p>
    </div>

    <div class="footer">
      <p class="footer-text">Hai domande sul tuo ordine?</p>
      <p class="footer-text">Contattaci a <a href="mailto:support@event4u.it" class="footer-link">support@event4u.it</a></p>
      <p style="color: #94A3B8; font-size: 12px; margin-top: 20px;">&copy; ${new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>
  `;

  const attachments = pdfBuffers.map((buffer, index) => ({
    filename: `biglietto-${tickets[index]?.id?.slice(-8) || index + 1}.pdf`,
    content: buffer,
    contentType: 'application/pdf',
  }));

  const mailOptions = {
    from: `"Event4U" <${process.env.SMTP_USER || 'noreply@event4u.it'}>`,
    to,
    subject,
    html: htmlBody,
    attachments,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`[EMAIL-SERVICE] Ticket email sent successfully to ${to}`);
  } catch (error) {
    console.error('[EMAIL-SERVICE] Failed to send ticket email:', error);
    throw error;
  }
}

interface PasswordResetEmailOptions {
  to: string;
  firstName: string;
  resetLink: string;
}

export async function sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<void> {
  const { to, firstName, resetLink } = options;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0e17; color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 32px; font-weight: bold; color: #FFD700; margin-bottom: 10px;">Event4U</div>
      <div style="font-size: 24px; color: #ffffff;">Reimposta la tua password</div>
    </div>

    <div style="background-color: #151922; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
      <p style="color: #ffffff; margin-top: 0;">Ciao ${firstName},</p>
      <p style="color: #94A3B8;">Hai richiesto di reimpostare la password del tuo account Event4U.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="display: inline-block; background-color: #FFD700; color: #0a0e17; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Reimposta Password
        </a>
      </div>
      
      <p style="color: #94A3B8; font-size: 14px;">Questo link scadrà tra 1 ora.</p>
      <p style="color: #94A3B8; font-size: 14px;">Se non hai richiesto il reset della password, ignora questa email.</p>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1e2533;">
      <p style="color: #94A3B8; font-size: 12px;">&copy; ${new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Event4U" <${process.env.SMTP_USER || 'noreply@event4u.it'}>`,
    to,
    subject: "Reimposta la tua password - Event4U",
    html: htmlBody,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`[EMAIL-SERVICE] Password reset email sent successfully to ${to}`);
  } catch (error) {
    console.error('[EMAIL-SERVICE] Failed to send password reset email:', error);
    throw error;
  }
}

// ==================== SIAE XML Transmission Email ====================
// Conforme a Allegato C - Provvedimento Agenzia delle Entrate 04/03/2008
// Usa funzioni condivise da siae-utils.ts per nomi file corretti

import { 
  generateSiaeAttachmentName, 
  generateSiaeSubject 
} from './siae-utils';

// ==================== File Naming SIAE (Allegato C) ====================
// generateSiaeAttachmentName: per nome file allegato (formato breve)
// generateSiaeSubject: per Subject email (formato completo)
// IMPORTANTE: Sono DUE formati diversi secondo la documentazione SIAE!
// 
// CRITICO: systemCode DEVE essere passato esplicitamente dal caller.
// NON usare fallback silenziosi al DEFAULT_SYSTEM_CODE - questo causa
// inconsistenze tra nome file, subject email e contenuto XML (errori SIAE 0600/0603)

interface SiaeTransmissionEmailOptions {
  to: string;
  companyName: string;
  transmissionType: 'daily' | 'monthly' | 'corrective' | 'rca';
  periodDate: Date;
  ticketsCount: number;
  totalAmount: string;
  xmlContent: string;
  transmissionId: string;
  systemCode: string;
  sequenceNumber?: number;
  signWithSmime?: boolean; // Per Allegato C SIAE - firma S/MIME con carta attivazione
  requireSignature?: boolean; // Se true, blocca invio se firma S/MIME non disponibile (default: true per RCA)
  // CAdES-BES support: se presente, il file è firmato CAdES-BES (SHA-256)
  p7mBase64?: string; // Contenuto P7M in Base64 (binario CAdES-BES)
  signatureFormat?: 'cades' | 'xmldsig'; // Formato firma (default: autodetect)
  // FIX 2026-01-19: Nome file allegato ESPLICITO per garantire coerenza con attributo NomeFile nell'XML
  // Se fornito, sovrascrive il nome generato internamente per evitare errore SIAE 0600
  explicitFileName?: string;
}

// Risultato dell'invio email SIAE con info sulla firma
export interface SiaeEmailResult {
  success: boolean;
  smimeSigned: boolean;
  signerEmail?: string;
  signerName?: string;
  signedAt?: string;
  error?: string;
}

/**
 * Invia email SIAE con opzione di firma S/MIME
 * Per Allegato C SIAE (Provvedimento 04/03/2008), sezione 1.6.1-1.6.2:
 * - L'email deve essere firmata S/MIME v2 con la carta di attivazione
 * - Il mittente deve corrispondere all'email nel certificato della carta
 * - Senza firma S/MIME, SIAE non invia conferma di ricezione
 */
export async function sendSiaeTransmissionEmail(options: SiaeTransmissionEmailOptions): Promise<SiaeEmailResult> {
  const { 
    to, 
    companyName, 
    transmissionType, 
    periodDate, 
    ticketsCount, 
    totalAmount, 
    xmlContent, 
    transmissionId,
    systemCode,
    sequenceNumber = 1,
    signWithSmime = false,
    requireSignature, // undefined = auto (true per RCA, false per altri)
    p7mBase64,
    signatureFormat,
    explicitFileName // FIX 2026-01-19: Nome file allegato esplicito per coerenza con NomeFile nell'XML
  } = options;
  
  // VALIDAZIONE CRITICA: systemCode DEVE essere sempre passato esplicitamente
  // Fallback silenzioso al DEFAULT_SYSTEM_CODE causa errori SIAE 0600/0603
  // (incoerenza tra nome file, subject email e contenuto XML)
  if (!systemCode || systemCode.trim() === '') {
    console.error('[EMAIL-SERVICE] CRITICAL: systemCode non fornito in sendSiaeTransmissionEmail!');
    console.error('[EMAIL-SERVICE] systemCode DEVE essere passato esplicitamente dal caller.');
    console.error('[EMAIL-SERVICE] Fallback silenzioso NON è permesso - causa errori SIAE 0600/0603');
    throw new Error(
      'SYSTEM_CODE_REQUIRED: Il parametro systemCode è obbligatorio e deve essere passato esplicitamente. ' +
      'Non è permesso usare fallback silenziosi al codice default - questo causa incoerenze tra ' +
      'nome file, subject email e contenuto XML, generando errori SIAE 0600/0603.'
    );
  }
  
  console.log(`[EMAIL-SERVICE] [SIAE-VALIDATION] systemCode=${systemCode} (esplicitamente fornito dal caller)`);

  
  // Per RCA (che genera risposta SIAE), la firma è obbligatoria di default
  const mustSign = requireSignature ?? (transmissionType === 'rca');

  // Determina se il file è firmato CAdES-BES (P7M) o XMLDSig legacy
  const isCAdES = !!p7mBase64 || signatureFormat === 'cades';
  const isXmlDsig = !isCAdES && xmlContent.includes('<Signature') && xmlContent.includes('</Signature>');
  const isSigned = isCAdES || isXmlDsig;
  
  // Mappa transmissionType al formato richiesto da generateSiaeFileName (Allegato C SIAE)
  const reportTypeMap: Record<string, 'giornaliero' | 'mensile' | 'rca' | 'log'> = {
    'daily': 'giornaliero',     // RMG - Riepilogo Giornaliero (report C1 giornaliero)
    'monthly': 'mensile',       // RPM - Riepilogo Periodico Mensile
    'rca': 'rca',               // RCA - Riepilogo Controllo Accessi (genera risposta SIAE)
    'corrective': 'giornaliero', // Correttivo usa stesso formato di giornaliero
  };
  const reportType = reportTypeMap[transmissionType] || 'giornaliero';
  
  // ============================================================
  // FIX 2026-01-07: SIAE S/MIME richiede UNA SOLA firma!
  // 
  // Allegato C dice che l'allegato deve essere .xsi.p7m (CAdES)
  // MA questo si riferisce a quando si salva su CD-R (sezione 1.1)
  //
  // Per EMAIL (sezione 1.5.2), il messaggio è S/MIME SignedData.
  // SMIMESignML di libSIAEp7.dll firma l'INTERA email incluso allegato.
  // Se passiamo un P7M già firmato, otteniamo doppia firma:
  // S/MIME(P7M(XML)) = SignedData(SignedData(XML)) = ILLEGGIBILE!
  //
  // SOLUZIONE: Passare XML diretto a SMIMESignML, che crea:
  // S/MIME(email con allegato XML) = firma singola, leggibile
  //
  // Nome file: .xsi (XML) invece di .xsi.p7m (doppia firma)
  // ============================================================
  
  // Per email S/MIME, usiamo SEMPRE allegato XML diretto (non P7M)
  // SMIMESignML crea la firma S/MIME che include l'allegato
  const useRawXmlForSmime = signWithSmime;
  const effectiveSignatureFormat = useRawXmlForSmime ? null : (isCAdES ? 'cades' : (isXmlDsig ? 'xmldsig' : null));
  
  // FIX 2026-01-19: Se explicitFileName è fornito, usalo per garantire coerenza con attributo NomeFile nell'XML
  // Questo evita errore SIAE 0600 causato da discrepanze tra nome allegato e NomeFile nell'XML
  let fileName: string;
  let emailSubject: string;
  
  if (explicitFileName) {
    // Usa il nome file esplicito fornito dal caller (stesso usato per attributo NomeFile nell'XML)
    fileName = explicitFileName;
    // Subject = nome file senza estensione (per errore 0603)
    emailSubject = explicitFileName.replace(/\.xsi(\.p7m)?$/i, '');
    console.log(`[EMAIL-SERVICE] FIX 0600: Usando nome file esplicito dal caller: ${fileName}`);
  } else {
    // Fallback: genera nome file internamente (legacy)
    fileName = generateSiaeAttachmentName(reportType, periodDate, sequenceNumber, effectiveSignatureFormat, systemCode);
    emailSubject = generateSiaeSubject(reportType, periodDate, sequenceNumber, systemCode);
    console.log(`[EMAIL-SERVICE] WARNING: explicitFileName non fornito, generato internamente: ${fileName}`);
  }
  
  // VALIDAZIONE CRITICA: Blocca qualsiasi nome file con timestamp (errore SIAE 0600)
  // FIX 2026-01-20: Validazione centralizzata per prevenire suffissi timestamp
  try {
    validateSiaeFileNameFormat(fileName);
    console.log(`[EMAIL-SERVICE] [SIAE-FILENAME-OK] Nome file validato: ${fileName}`);
  } catch (validationError: any) {
    console.error(`[EMAIL-SERVICE] [SIAE-FILENAME-ERROR] Nome file NON VALIDO: ${fileName}`);
    console.error(`[EMAIL-SERVICE] [SIAE-FILENAME-ERROR] Dettaglio: ${validationError.message}`);
    throw new Error(`SIAE_FILENAME_INVALID: ${validationError.message}`);
  }
  
  // Validazione coerenza subject/filename per prevenire errore SIAE 0603
  const fileNameBase = fileName.replace(/\.xsi(\.p7m)?$/i, '');
  if (emailSubject !== fileNameBase) {
    console.error(`[EMAIL-SERVICE] CRITICAL: Subject/filename mismatch! subject="${emailSubject}" != fileNameBase="${fileNameBase}"`);
    throw new Error(`SIAE 0603: Subject email non corrisponde al nome file. subject="${emailSubject}", filename="${fileName}"`);
  }
  console.log(`[EMAIL-SERVICE] SIAE file naming: attachmentName=${fileName}, subject=${emailSubject} (coerenza verificata)`);
  console.log(`[EMAIL-SERVICE] FIX 2026-01-07: Using raw XML for S/MIME (no double signature)`);
  if (p7mBase64) {
    console.log(`[EMAIL-SERVICE] WARNING: P7M provided but ignored - S/MIME includes XML directly`);
  }

  const typeLabels: Record<string, string> = {
    'daily': 'Giornaliera (C1)',
    'monthly': 'Mensile (C1)',
    'rca': 'RCA Evento (C1)',
    'corrective': 'Correttiva (C1)'
  };
  
  // Nome report per header email - usa i nomi corretti DTD
  const reportNames: Record<string, string> = {
    'daily': 'RiepilogoGiornaliero',
    'monthly': 'RiepilogoMensile',
    'rca': 'RiepilogoControlloAccessi', // DTD: ControlloAccessi_v0001_20080626.dtd
    'corrective': 'RiepilogoGiornaliero'
  };
  const reportName = reportNames[transmissionType] || 'RiepilogoGiornaliero';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Stato S/MIME per l'HTML
  let smimeStatus = 'NON FIRMATA S/MIME';
  let smimeResult: { signed: boolean; signerEmail?: string; signerName?: string; signedAt?: string } = { signed: false };

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; color: #333333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 28px; font-weight: bold; color: #1a237e; margin-bottom: 10px;">Event4U - ${reportName}</div>
      <div style="font-size: 18px; color: #666;">Trasmissione SIAE C1 - Allegato B</div>
    </div>

    <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #1a237e; margin-top: 0; margin-bottom: 20px;">Riepilogo Trasmissione</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Azienda</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${companyName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Tipo Trasmissione</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${typeLabels[transmissionType] || transmissionType}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Data Riferimento</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${formatDate(periodDate)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Numero Biglietti</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${ticketsCount}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Importo Totale</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right; color: #2e7d32;">€${totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Codice Sistema</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${systemCode}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Progressivo</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${String(sequenceNumber).padStart(3, '0')}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Firma Allegato</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${isSigned ? 'FIRMATA (P7M)' : 'NON FIRMATA'}</td>
        </tr>
      </table>
      
      <div style="margin-top: 25px; padding: 15px; background-color: #e8eaf6; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1a237e;">
          <strong>Nota:</strong> Il file ${reportName} è allegato con nome <code>${fileName}</code>.
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
          Formato conforme a Provvedimento Agenzia delle Entrate 04/03/2008 (Allegato B)
        </p>
      </div>
    </div>

    <div style="text-align: center; color: #999; font-size: 12px;">
      <p>&copy; ${new Date().getFullYear()} Event4U - Sistema Gestione Fiscale SIAE</p>
    </div>
  </div>
</body>
</html>
  `;

  // Prepara opzioni email base - usa SIAE SMTP per le trasmissioni (corrisponde al certificato smart card)
  const siaeSmtpUser = process.env.SIAE_SMTP_USER || process.env.SMTP_USER;
  // v3.30 FIX: Senza virgolette come da file test SIAE
  const fromAddress = process.env.SIAE_SMTP_FROM || `Event4U SIAE <${siaeSmtpUser || 'noreply@event4u.it'}>`;
  
  // Se richiesta firma S/MIME e bridge connesso, tenta di firmare l'email
  if (signWithSmime && isBridgeConnected()) {
    try {
      console.log(`[EMAIL-SERVICE] Attempting S/MIME signature for SIAE email to ${to}...`);
      
      // CRITICO: Per Allegato C SIAE 1.6.2.a.3, l'email del mittente DEVE corrispondere
      // esattamente a quella nel certificato pubblico sulla smart card.
      // Se non corrisponde, SIAE NON invia risposta di conferma.
      // L'header "From:" nel messaggio MIME firmato È IMMUTABILE dopo la firma,
      // quindi DEVE essere corretto PRIMA di inviare al bridge per la firma.
      
      // Prova a ottenere l'email dal cache dello status del bridge
      let cardEmail = getCardSignerEmail();
      
      if (cardEmail) {
        console.log(`[EMAIL-SERVICE] Card signer email (from cache): ${cardEmail}`);
      } else {
        // CRITICO: Email non nel cache - BLOCCA L'INVIO
        // Non possiamo procedere senza l'email del certificato perché:
        // 1. L'header "From:" nel messaggio MIME deve corrispondere all'email del certificato
        // 2. Dopo la firma S/MIME, gli header sono immutabili
        // 3. Se l'header "From:" non corrisponde, SIAE non risponde
        console.log(`[EMAIL-SERVICE] CRITICAL: Card email not available in bridge cache`);
        console.log(`[EMAIL-SERVICE] Cannot proceed - From header must match certificate email BEFORE signing`);
        
        // Informa l'utente di riconnettere l'app desktop per aggiornare il cache
        throw new Error(
          'EMAIL_CERTIFICATO_NON_DISPONIBILE: L\'email del certificato smart card non è disponibile. ' +
          'Riconnetti l\'app desktop Event4U (chiudi e riapri) con la smart card inserita, ' +
          'poi attendi qualche secondo e riprova. L\'app deve inviare l\'email del certificato al server.'
        );
      }
      
      // Usa SEMPRE l'email del certificato nell'header From
      // Questo garantisce che il messaggio firmato sia conforme ad Allegato C SIAE 1.6.2.a.3
      // v3.30 FIX: Rimuove virgolette dal display name - file test SIAE usa "Mario Rossi <email>" SENZA virgolette
      const certFromAddress = `Event4U SIAE <${cardEmail}>`;
      
      // ============================================================
      // FIX 2026-01-07: SEMPRE XML diretto per S/MIME!
      // 
      // SMIMESignML firma l'INTERA email (body + allegato) creando S/MIME opaco.
      // Se passiamo P7M già firmato → doppia firma → SIAE errore 40605!
      //
      // L'allegato DEVE essere XML puro (.xsi), NON P7M (.xsi.p7m)
      // SMIMESignML crea: S/MIME(email con XML allegato) = UNA sola firma
      // ============================================================
      // FIX 2026-01-15: Usa 'latin1' invece di 'utf-8' per encoding ISO-8859-1
      // L'XML dichiara encoding="ISO-8859-1" quindi i byte devono corrispondere.
      // Usando utf-8, caratteri accentati diventano multi-byte causando errore SIAE 40605.
      const attachmentBase64Content = Buffer.from(xmlContent, 'latin1').toString('base64');
      console.log(`[EMAIL-SERVICE] FIX 2026-01-15: Using latin1 encoding for ISO-8859-1 XML attachment`);
      
      // INTEGRITY CHECK: Log SHA-256 prima dell'invio per diagnostica trasmissione
      try {
        const crypto = await import('crypto');
        const buffer = Buffer.from(xmlContent, 'latin1');
        const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');
        console.log(`[EMAIL-SERVICE] [INTEGRITY] Attachment pre-send check:`);
        console.log(`[EMAIL-SERVICE] [INTEGRITY]   - Type: XML (raw, for S/MIME signing)`);
        console.log(`[EMAIL-SERVICE] [INTEGRITY]   - Size: ${buffer.length} bytes`);
        console.log(`[EMAIL-SERVICE] [INTEGRITY]   - Base64 length: ${attachmentBase64Content.length} chars`);
        console.log(`[EMAIL-SERVICE] [INTEGRITY]   - SHA-256: ${sha256Hash}`);
      } catch (hashError: any) {
        console.log(`[EMAIL-SERVICE] [INTEGRITY] Failed to compute SHA-256: ${hashError.message}`);
      }
      
      // Corpo email semplice (text/plain per SMIMESignML)
      // SMIMESignML richiede testo ASCII-7bit nel body
      const plainBody = [
        `Trasmissione SIAE RCA - ${reportName}`,
        ``,
        `Data: ${new Date().toLocaleDateString('it-IT')}`,
        `Evento: ${reportName}`,
        `Transmission ID: ${transmissionId}`,
        `System Code: ${systemCode}`,
        `Sequence: ${sequenceNumber}`,
        ``,
        `Il file ${fileName} e' allegato a questa email.`,
        `Formato conforme a Provvedimento Agenzia delle Entrate 04/03/2008 (Allegato B)`,
        ``,
        `Event4U - Sistema Gestione Fiscale SIAE`
      ].join('\r\n');
      
      // Richiedi firma S/MIME al Desktop Bridge con SMIMESignML
      const smimeData = await requestSmimeSignature({
        from: certFromAddress,
        to: to,
        subject: emailSubject,
        body: plainBody,
        attachmentBase64: attachmentBase64Content,
        attachmentName: fileName
      }, to);
      
      // Valida che il bridge abbia restituito un payload S/MIME valido
      if (!smimeData.signedMime || smimeData.signedMime.length < 100) {
        throw new Error('SMIME_INVALID_RESPONSE: Bridge ha restituito un payload S/MIME non valido');
      }
      
      // Log primi 800 caratteri per debug header - importante per diagnosticare problema To/Subject
      console.log(`[EMAIL-SERVICE] S/MIME payload preview (first 800 chars):\n${smimeData.signedMime.substring(0, 800)}`);
      
      // DIAGNOSTICA: Verifica presenza header nel messaggio S/MIME
      // NOTA: NON modifichiamo il messaggio firmato - qualsiasi modifica invalida la firma
      // Se gli header mancano, il problema è nel bridge desktop che deve essere corretto
      const hasToHeader = smimeData.signedMime.toLowerCase().includes('\nto:') || smimeData.signedMime.toLowerCase().startsWith('to:');
      const hasSubjectHeader = smimeData.signedMime.toLowerCase().includes('\nsubject:') || smimeData.signedMime.toLowerCase().startsWith('subject:');
      const hasFromHeader = smimeData.signedMime.toLowerCase().includes('\nfrom:') || smimeData.signedMime.toLowerCase().startsWith('from:');
      
      console.log(`[EMAIL-SERVICE] S/MIME header check: From=${hasFromHeader}, To=${hasToHeader}, Subject=${hasSubjectHeader}`);
      
      if (!hasToHeader || !hasSubjectHeader) {
        console.log(`[EMAIL-SERVICE] WARNING: Bridge S/MIME payload missing headers!`);
        console.log(`[EMAIL-SERVICE] IMPORTANT: Headers cannot be added after signing - fix needed in bridge desktop`);
        console.log(`[EMAIL-SERVICE] Email will be sent but recipient may see "(no subject)" and BCC routing`);
      }
      
      // ============================================================
      // VALIDAZIONE S/MIME (2026-01-06)
      // Ora usiamo SMIMESignML nativo che genera formato S/MIME conforme
      // Accettiamo sia opaque che multipart/signed se generato da libreria SIAE
      // ============================================================
      
      const isOpaque = smimeData.signedMime.includes('Content-Type: application/pkcs7-mime') ||
                       smimeData.signedMime.includes('Content-Type: application/x-pkcs7-mime');
      const isMultipartSigned = smimeData.signedMime.includes('multipart/signed');
      const isSmimeNative = smimeData.generator === 'SMIMESignML-native';
      
      if (!isOpaque && !isMultipartSigned) {
        console.log(`[EMAIL-SERVICE] ❌ ERRORE: Bridge NON sta producendo S/MIME valido!`);
        throw new Error("Bridge non produce S/MIME valido. Aggiornare bridge desktop.");
      }
      
      if (isSmimeNative) {
        console.log(`[EMAIL-SERVICE] ✅ S/MIME generato da SMIMESignML nativo SIAE`);
      } else if (isOpaque) {
        console.log(`[EMAIL-SERVICE] ✅ S/MIME OPAQUE (application/pkcs7-mime)`);
      } else {
        console.log(`[EMAIL-SERVICE] ✅ S/MIME multipart/signed`);
      }
      
      // CHECK B: Verifica separatore header/body (\r\n\r\n)
      if (!smimeData.signedMime.includes('\r\n\r\n')) {
        console.log(`[EMAIL-SERVICE] ❌ ERRORE: RAW senza separatore header/body (\\r\\n\\r\\n)`);
        throw new Error("Messaggio S/MIME senza separatore header/body. Verificare bridge desktop.");
      }
      console.log(`[EMAIL-SERVICE] ✅ Separatore header/body presente`);
      
      // CHECK C: Log prime righe e dimensione per debug
      const rawLines = smimeData.signedMime.split('\r\n');
      const headerEndIndex = rawLines.findIndex(line => line === '');
      const headerLines = rawLines.slice(0, Math.min(headerEndIndex > 0 ? headerEndIndex : 10, 15));
      console.log(`[EMAIL-SERVICE] === S/MIME HEADER (prime ${headerLines.length} righe) ===`);
      headerLines.forEach((line, i) => console.log(`  ${i + 1}: ${line}`));
      console.log(`[EMAIL-SERVICE] === FINE HEADER ===`);
      console.log(`[EMAIL-SERVICE] Dimensione totale RAW: ${smimeData.signedMime.length} bytes`);
      
      smimeResult = {
        signed: true,
        signerEmail: smimeData.signerEmail,
        signerName: smimeData.signerName,
        signedAt: smimeData.signedAt
      };
      smimeStatus = `FIRMATA S/MIME (${smimeData.signerEmail})`;
      
      console.log(`[EMAIL-SERVICE] S/MIME signature obtained from ${smimeData.signerName} <${smimeData.signerEmail}>`);
      
      // ============================================================
      // INVIO RAW SECONDO ISTRUZIONI SIAE
      // ============================================================
      
      // CRITICO: L'envelope.from DEVE corrispondere all'email del certificato (Allegato C 1.6.2.a.3)
      const envelopeFrom = smimeData.signerEmail || cardEmail;
      console.log(`[EMAIL-SERVICE] Envelope from (for SIAE compliance): ${envelopeFrom}`);
      
      // IMPORTANTE: NON normalizzare il messaggio S/MIME dopo la firma!
      // La normalizzazione corrompe il contenuto firmato causando errore SIAE 40605
      // Il bridge deve già inviare il messaggio con CRLF corretti
      const rawMessage = smimeData.signedMime;
      
      // Verifica che il messaggio abbia CRLF corretti (warning only, non modificare)
      const hasMixedLineEndings = rawMessage.includes('\r\n') && rawMessage.includes('\n') && 
                                  !rawMessage.split('\r\n').every(line => !line.includes('\n'));
      if (hasMixedLineEndings) {
        console.log(`[EMAIL-SERVICE] ⚠️ WARNING: Messaggio con line endings misti. Bridge potrebbe aver inviato dati corrotti.`);
      }
      
      // Invia come Buffer binario per evitare qualsiasi trasformazione
      const rawMailOptions = {
        envelope: {
          from: envelopeFrom,
          to: [to]
        },
        raw: Buffer.from(rawMessage, 'binary')
      };
      
      console.log(`[EMAIL-SERVICE] Sending RAW S/MIME (${rawMessage.length} bytes) to ${to}`);
      await siaeEmailTransporter.sendMail(rawMailOptions);
      console.log(`[EMAIL-SERVICE] S/MIME signed email sent successfully to ${to} via SIAE SMTP`);
      
      return {
        success: true,
        smimeSigned: true,
        signerEmail: smimeData.signerEmail,
        signerName: smimeData.signerName,
        signedAt: smimeData.signedAt
      };
      
    } catch (smimeError: any) {
      console.log(`[EMAIL-SERVICE] S/MIME signature failed: ${smimeError.message}`);
      
      // Se la firma è obbligatoria, blocca l'invio
      if (mustSign) {
        console.log(`[EMAIL-SERVICE] BLOCKED: Signature required but failed. Email NOT sent.`);
        return {
          success: false,
          smimeSigned: false,
          error: `FIRMA_OBBLIGATORIA: ${smimeError.message}. Per ricevere risposta da SIAE, collega l'app desktop con Smart Card inserita.`
        };
      }
      
      console.log(`[EMAIL-SERVICE] Proceeding with unsigned email (SIAE may not send confirmation)`);
      smimeStatus = `FIRMA S/MIME FALLITA: ${smimeError.message}`;
    }
  } else if (signWithSmime) {
    // Bridge non connesso
    if (mustSign) {
      console.log(`[EMAIL-SERVICE] BLOCKED: Signature required but bridge not connected. Email NOT sent.`);
      return {
        success: false,
        smimeSigned: false,
        error: `BRIDGE_NON_CONNESSO: App desktop Event4U non connessa. Per ricevere risposta da SIAE, avvia l'app desktop con Smart Card inserita.`
      };
    }
    console.log(`[EMAIL-SERVICE] S/MIME requested but bridge not connected. Sending unsigned.`);
    smimeStatus = 'BRIDGE NON CONNESSO - NON FIRMATA';
  } else if (mustSign) {
    // Firma obbligatoria ma signWithSmime non abilitato
    console.log(`[EMAIL-SERVICE] BLOCKED: Signature required but signWithSmime not enabled.`);
    return {
      success: false,
      smimeSigned: false,
      error: `FIRMA_NON_ABILITATA: Per trasmissioni RCA è richiesta la firma S/MIME. Abilita signWithSmime e collega l'app desktop.`
    };
  }

  // Invia l'email non firmata (fallback quando S/MIME non disponibile o fallito)
  // Nota: Senza firma S/MIME, SIAE potrebbe non inviare conferma di ricezione (Allegato C 1.6.2)
  
  // Prepara l'allegato: P7M binario per CAdES-BES, testo XML per legacy
  let attachmentContent: Buffer | string;
  let attachmentContentType: string;
  
  if (isCAdES && p7mBase64) {
    // CAdES-BES: decodifica Base64 in buffer binario
    attachmentContent = Buffer.from(p7mBase64, 'base64');
    attachmentContentType = 'application/pkcs7-mime';
    console.log(`[EMAIL-SERVICE] Attaching CAdES-BES P7M file: ${fileName} (${attachmentContent.length} bytes)`);
  } else {
    // XMLDSig legacy o XML non firmato
    attachmentContent = xmlContent;
    attachmentContentType = 'application/xml';
  }
  
  const mailOptions = {
    from: fromAddress,
    to,
    subject: emailSubject,
    html: htmlBody,
    attachments: [
      {
        filename: fileName,
        content: attachmentContent,
        contentType: attachmentContentType,
      },
    ],
  };

  try {
    await siaeEmailTransporter.sendMail(mailOptions);
    const smimeNote = smimeResult.signed ? '' : ' (NON firmata S/MIME - SIAE potrebbe non confermare)';
    console.log(`[EMAIL-SERVICE] SIAE RCA email sent to ${to} via SIAE SMTP | Subject: ${emailSubject} | File: ${fileName}${smimeNote}`);
    
    return {
      success: true,
      smimeSigned: smimeResult.signed,
      signerEmail: smimeResult.signerEmail,
      signerName: smimeResult.signerName,
      signedAt: smimeResult.signedAt
    };
  } catch (error: any) {
    console.error('[EMAIL-SERVICE] Failed to send SIAE transmission email:', error);
    return {
      success: false,
      smimeSigned: false,
      error: error.message
    };
  }
}
