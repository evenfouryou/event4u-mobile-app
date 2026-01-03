import nodemailer from 'nodemailer';
import { isBridgeConnected, requestSmimeSignature, getCardSignerEmail } from './bridge-relay';

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

import { generateSiaeFileName, SIAE_SYSTEM_CODE_DEFAULT } from './siae-utils';

const SIAE_VERSION = 'V.01.00';
const DEFAULT_SYSTEM_CODE = SIAE_SYSTEM_CODE_DEFAULT;

// generateSiaeFileName importata da siae-utils.ts
// Supporta: 'giornaliero' -> RMG_, 'mensile' -> RPM_, 'rca' -> RCA_

/**
 * Genera subject email conforme a RFC-2822 SIAE
 * Formato dipende dal tipo di report:
 * - C1 giornaliero: RMG_<AAAA>_<MM>_<GG>_<SSSSSSSS>_<###>_<TTT>_V.<XX>.<YY>
 * - C1 mensile: RPM_<AAAA>_<MM>_<SSSSSSSS>_<###>_<TTT>_V.<XX>.<YY>
 * - RCA: RCA_<AAAA>_<MM>_<GG>_<SSSSSSSS>_<###>_<TTT>_V.<XX>.<YY>
 */
function generateSiaeEmailSubject(
  transmissionType: 'daily' | 'monthly' | 'corrective' | 'rca',
  date: Date, 
  systemCode: string, 
  sequenceNumber: number
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const code = systemCode.padEnd(8, '0').substring(0, 8);
  const seq = String(sequenceNumber).padStart(3, '0');
  
  // Determina il prefisso corretto in base al tipo
  let prefix: string;
  let datePart: string;
  
  if (transmissionType === 'monthly') {
    prefix = 'RPM';
    datePart = `${year}_${month}`; // Solo anno e mese per mensile
  } else if (transmissionType === 'rca') {
    prefix = 'RCA';
    datePart = `${year}_${month}_${day}`;
  } else {
    // daily o corrective -> RMG (giornaliero)
    prefix = 'RMG';
    datePart = `${year}_${month}_${day}`;
  }
  
  return `${prefix}_${datePart}_${code}_${seq}_XSI_${SIAE_VERSION}`;
}

interface SiaeTransmissionEmailOptions {
  to: string;
  companyName: string;
  transmissionType: 'daily' | 'monthly' | 'corrective';
  periodDate: Date;
  ticketsCount: number;
  totalAmount: string;
  xmlContent: string;
  transmissionId: string;
  systemCode?: string;
  sequenceNumber?: number;
  signWithSmime?: boolean; // Per Allegato C SIAE - firma S/MIME con carta attivazione
  // CAdES-BES support: se presente, il file è firmato CAdES-BES (SHA-256)
  p7mBase64?: string; // Contenuto P7M in Base64 (binario CAdES-BES)
  signatureFormat?: 'cades' | 'xmldsig'; // Formato firma (default: autodetect)
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
    systemCode = DEFAULT_SYSTEM_CODE,
    sequenceNumber = 1,
    signWithSmime = false,
    p7mBase64,
    signatureFormat
  } = options;

  // Determina se il file è firmato CAdES-BES (P7M) o XMLDSig legacy
  const isCAdES = !!p7mBase64 || signatureFormat === 'cades';
  const isXmlDsig = !isCAdES && xmlContent.includes('<Signature') && xmlContent.includes('</Signature>');
  const isSigned = isCAdES || isXmlDsig;
  
  // Mappa transmissionType al formato richiesto da generateSiaeFileName
  const reportTypeMap: Record<string, 'giornaliero' | 'mensile' | 'rca'> = {
    'daily': 'giornaliero',
    'monthly': 'mensile',
    'rca': 'rca',
    'corrective': 'giornaliero', // Correttivo usa stesso formato di giornaliero
  };
  const reportType = reportTypeMap[transmissionType] || 'giornaliero';
  
  // Nome file conforme a Allegato C SIAE (RMG_ per giornaliero, RPM_ per mensile)
  // .xsi.p7m solo per CAdES-BES, .xsi per XMLDSig legacy o non firmato
  const effectiveSignatureFormat = isCAdES ? 'cades' : (isXmlDsig ? 'xmldsig' : null);
  const fileName = generateSiaeFileName(reportType, periodDate, sequenceNumber, effectiveSignatureFormat);
  
  // Subject conforme a RFC-2822 SIAE con prefisso corretto
  const emailSubject = generateSiaeEmailSubject(transmissionType, periodDate, systemCode, sequenceNumber);

  const typeLabels: Record<string, string> = {
    'daily': 'Giornaliera (C1)',
    'monthly': 'Mensile (C1)',
    'rca': 'RCA Evento (C1)',
    'corrective': 'Correttiva (C1)'
  };
  
  // Nome report per header email
  const reportNames: Record<string, string> = {
    'daily': 'RiepilogoGiornaliero',
    'monthly': 'RiepilogoMensile',
    'rca': 'RiepilogoControlloAccessi',
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
  const fromAddress = process.env.SIAE_SMTP_FROM || `"Event4U SIAE" <${siaeSmtpUser || 'noreply@event4u.it'}>`;
  
  // Se richiesta firma S/MIME e bridge connesso, tenta di firmare l'email
  if (signWithSmime && isBridgeConnected()) {
    try {
      console.log(`[EMAIL-SERVICE] Attempting S/MIME signature for SIAE email to ${to}...`);
      
      // Verifica che l'email del mittente corrisponda al certificato della carta
      const cardEmail = getCardSignerEmail();
      if (cardEmail) {
        console.log(`[EMAIL-SERVICE] Card signer email: ${cardEmail}`);
        // Avviso se l'email configurata non corrisponde al certificato
        const configuredFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
        if (configuredFrom && !configuredFrom.includes(cardEmail)) {
          console.log(`[EMAIL-SERVICE] WARNING: Configured sender (${configuredFrom}) may not match card certificate email (${cardEmail})`);
        }
      }
      
      // Costruisci il messaggio MIME da firmare usando base64 per HTML (supporta UTF-8 completo)
      // Per Allegato C SIAE: CRLF folding e encoding canonico
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const htmlBodyBase64 = Buffer.from(htmlBody, 'utf-8').toString('base64');
      
      // Per CAdES-BES: usa il P7M base64 direttamente, altrimenti codifica XML in base64
      const attachmentBase64 = isCAdES && p7mBase64 ? p7mBase64 : Buffer.from(xmlContent, 'utf-8').toString('base64');
      const attachmentMimeType = isCAdES ? 'application/pkcs7-mime' : 'application/xml';
      
      const mimeContent = [
        `From: ${fromAddress}`,
        `To: ${to}`,
        `Subject: ${emailSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        `X-SIAE-TransmissionId: ${transmissionId}`,
        `X-SIAE-SystemCode: ${systemCode}`,
        `X-SIAE-SequenceNumber: ${sequenceNumber}`,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        htmlBodyBase64,
        ``,
        `--${boundary}`,
        `Content-Type: ${attachmentMimeType}; name="${fileName}"`,
        `Content-Disposition: attachment; filename="${fileName}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        attachmentBase64,
        ``,
        `--${boundary}--`
      ].join('\r\n');
      
      // Richiedi firma S/MIME al Desktop Bridge
      const smimeData = await requestSmimeSignature(mimeContent, to);
      
      // Valida che il bridge abbia restituito un payload S/MIME valido
      if (!smimeData.signedMime || smimeData.signedMime.length < 100) {
        throw new Error('SMIME_INVALID_RESPONSE: Bridge ha restituito un payload S/MIME non valido');
      }
      
      // Verifica struttura multipart/signed (controllo base)
      const hasMultipartSigned = smimeData.signedMime.includes('multipart/signed') || 
                                  smimeData.signedMime.includes('application/pkcs7-mime') ||
                                  smimeData.signedMime.includes('application/x-pkcs7-mime');
      if (!hasMultipartSigned) {
        console.log(`[EMAIL-SERVICE] WARNING: S/MIME payload may not have standard multipart/signed structure`);
      }
      
      smimeResult = {
        signed: true,
        signerEmail: smimeData.signerEmail,
        signerName: smimeData.signerName,
        signedAt: smimeData.signedAt
      };
      smimeStatus = `FIRMATA S/MIME (${smimeData.signerEmail})`;
      
      console.log(`[EMAIL-SERVICE] S/MIME signature obtained from ${smimeData.signerName} <${smimeData.signerEmail}>`);
      
      // Invia il messaggio S/MIME firmato esattamente come restituito dal bridge
      // Per Allegato C SIAE, il messaggio firmato NON deve essere modificato
      const rawMailOptions = {
        envelope: {
          from: smimeData.signerEmail || fromAddress.replace(/^.*<(.*)>.*$/, '$1'),
          to: [to]
        },
        raw: smimeData.signedMime // Invia esattamente il payload firmato dal bridge
      };
      
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
      console.log(`[EMAIL-SERVICE] Proceeding with unsigned email (SIAE may not send confirmation)`);
      smimeStatus = `FIRMA S/MIME FALLITA: ${smimeError.message}`;
    }
  } else if (signWithSmime) {
    console.log(`[EMAIL-SERVICE] S/MIME requested but bridge not connected. Sending unsigned.`);
    smimeStatus = 'BRIDGE NON CONNESSO - NON FIRMATA';
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
