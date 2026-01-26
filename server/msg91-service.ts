const MSG91_FLOW_URL = "https://api.msg91.com/api/v5/flow/";

function getMSG91Authkey(): string | undefined {
  return process.env.MSG91_AUTHKEY;
}

function getMSG91TemplateId(): string | undefined {
  return process.env.MSG91_TEMPLATE_ID;
}

interface MSG91Response {
  type: string;
  message?: string;
  request_id?: string;
}

interface SendOTPResult {
  success: boolean;
  message: string;
  requestId?: string;
  otpCode?: string;
}

interface VerifyOTPResult {
  success: boolean;
  message: string;
  type?: string;
}

function formatPhoneNumber(phone: string): string {
  // Input can be:
  // 1. Full phone with prefix: "+393381234567" or "+39 338 1234567"
  // 2. Just a number without prefix: "3381234567"
  // 3. Old format with country code in number: "393381234567"
  
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 00 (international format)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // MSG91 expects country code without '+' sign (e.g., 393381234567)
  
  // If 12 digits starting with 39, it's already formatted correctly (Italy)
  if (cleaned.startsWith('39') && cleaned.length === 12) {
    console.log(`[MSG91] Phone correctly formatted with IT country code (12 digits): ${cleaned}`);
    return cleaned;
  }
  
  // If 11 digits starting with 1, it's US/Canada format (already correct)
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    console.log(`[MSG91] Phone correctly formatted with US/CA country code (11 digits): ${cleaned}`);
    return cleaned;
  }
  
  // Handle other country codes (UK +44, FR +33, DE +49, etc.)
  // These vary in length, so we accept them if they start with common country codes
  const validCountryCodes = ['44', '33', '49', '34', '41', '43', '32', '31'];
  for (const code of validCountryCodes) {
    if (cleaned.startsWith(code) && cleaned.length >= 10) {
      console.log(`[MSG91] Phone with ${code} country code: ${cleaned}`);
      return cleaned;
    }
  }
  
  // If 10 digits starting with 3 (Italian mobile without country code), add +39
  if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '39' + cleaned;
    console.log(`[MSG91] Added IT country code to 10-digit mobile: ${cleaned}`);
    return cleaned;
  }
  
  // If 10 digits starting with 39, this is ambiguous
  // (could be 39 prefix + 8 digits OR just 10 digit number starting with 39)
  if (cleaned.startsWith('39') && cleaned.length === 10) {
    console.warn(`[MSG91] Ambiguous phone number: ${cleaned}. Could be incomplete Italian number.`);
  }
  
  // For other formats, assume it needs Italian prefix if not already present
  if (!cleaned.startsWith('39') && !validCountryCodes.some(c => cleaned.startsWith(c))) {
    cleaned = '39' + cleaned;
    console.log(`[MSG91] Added default IT prefix: ${cleaned}`);
  }
  
  return cleaned;
}

function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phone: string, otpExpiry: number = 10): Promise<SendOTPResult> {
  const authkey = getMSG91Authkey();
  const templateId = getMSG91TemplateId();
  
  console.log(`[MSG91] sendOTP (Flow API) called with phone: ${phone}`);
  console.log(`[MSG91] AUTHKEY configured: ${!!authkey}, TEMPLATE_ID configured: ${!!templateId}`);
  
  if (!authkey || !templateId) {
    console.error("[MSG91] Missing AUTHKEY or TEMPLATE_ID - AUTHKEY:", !!authkey, "TEMPLATE_ID:", !!templateId);
    return { success: false, message: "Configurazione MSG91 mancante" };
  }

  const formattedPhone = formatPhoneNumber(phone);
  const otpCode = generateOTPCode();
  
  console.log(`[MSG91] Formatted phone: ${formattedPhone}`);
  console.log(`[MSG91] Generated OTP code: ${otpCode}`);

  const payload = {
    flow_id: templateId,
    recipients: [
      {
        mobiles: formattedPhone,
        code: otpCode
      }
    ]
  };

  console.log(`[MSG91] Sending SMS via Flow API to ${formattedPhone} with template ${templateId}`);

  try {
    const response = await fetch(MSG91_FLOW_URL, {
      method: 'POST',
      headers: {
        'authkey': authkey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data: MSG91Response = await response.json();
    console.log(`[MSG91] Flow API response:`, data);

    if (data.type === 'success') {
      return { 
        success: true, 
        message: "OTP inviato con successo",
        requestId: data.message,
        otpCode: otpCode
      };
    } else {
      return { 
        success: false, 
        message: data.message || "Errore nell'invio OTP" 
      };
    }
  } catch (error: any) {
    console.error("[MSG91] Flow API error:", error);
    return { success: false, message: "Errore di connessione al servizio SMS" };
  }
}

export async function verifyOTP(phone: string, otp: string): Promise<VerifyOTPResult> {
  console.log(`[MSG91] Local verification for ${phone} - OTP provided: ${otp}`);
  return { 
    success: true, 
    message: "Verifica locale richiesta",
    type: "local"
  };
}

export async function resendOTP(phone: string, retryType: 'text' | 'voice' = 'text'): Promise<SendOTPResult> {
  console.log(`[MSG91] Resending OTP to ${phone} via Flow API`);
  return sendOTP(phone, 10);
}

export function isMSG91Configured(): boolean {
  const authkey = getMSG91Authkey();
  const templateId = getMSG91TemplateId();
  return !!(authkey && templateId);
}

// ==================== PR Registration SMS ====================
// Template ID: 64c4bc88d6fc05193a102042
// Variables: ##name##, ##password##, ##access##

const PR_REGISTRATION_TEMPLATE_ID = "64c4bc88d6fc05193a102042";

interface SendPrCredentialsResult {
  success: boolean;
  message: string;
  requestId?: string;
}

export async function sendPrCredentialsSMS(
  phone: string,
  name: string,
  password: string,
  accessLink: string
): Promise<SendPrCredentialsResult> {
  const authkey = getMSG91Authkey();
  
  console.log(`[MSG91] ======= PR CREDENTIALS SMS DEBUG =======`);
  console.log(`[MSG91] Input phone: "${phone}" (length: ${phone.length})`);
  console.log(`[MSG91] PR Name: "${name}"`);
  console.log(`[MSG91] Password: "${password}"`);
  console.log(`[MSG91] Access Link: "${accessLink}"`);
  console.log(`[MSG91] AUTHKEY configured: ${!!authkey}`);
  console.log(`[MSG91] Template ID: ${PR_REGISTRATION_TEMPLATE_ID}`);
  
  if (!authkey) {
    console.error("[MSG91] Missing AUTHKEY");
    return { success: false, message: "Configurazione MSG91 mancante" };
  }

  const formattedPhone = formatPhoneNumber(phone);
  console.log(`[MSG91] Formatted phone: "${formattedPhone}" (length: ${formattedPhone.length})`);
  
  const payload = {
    flow_id: PR_REGISTRATION_TEMPLATE_ID,
    recipients: [
      {
        mobiles: formattedPhone,
        name: name,
        password: password,
        access: accessLink
      }
    ]
  };

  console.log(`[MSG91] Full payload:`, JSON.stringify(payload, null, 2));

  try {
    console.log(`[MSG91] Calling Flow API: ${MSG91_FLOW_URL}`);
    
    const response = await fetch(MSG91_FLOW_URL, {
      method: 'POST',
      headers: {
        'authkey': authkey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log(`[MSG91] HTTP Status: ${response.status} ${response.statusText}`);
    
    const rawResponse = await response.text();
    console.log(`[MSG91] Raw response body: ${rawResponse}`);
    
    let data: MSG91Response;
    try {
      data = JSON.parse(rawResponse);
    } catch (e) {
      console.error(`[MSG91] Failed to parse JSON response`);
      return { success: false, message: "Risposta MSG91 non valida" };
    }
    
    console.log(`[MSG91] Parsed response:`, data);
    console.log(`[MSG91] Response type: "${data.type}"`);
    console.log(`[MSG91] ======= END DEBUG =======`);

    if (data.type === 'success') {
      return { 
        success: true, 
        message: "Credenziali inviate via SMS",
        requestId: data.message
      };
    } else {
      console.error(`[MSG91] SMS failed with type: ${data.type}, message: ${data.message}`);
      return { 
        success: false, 
        message: data.message || "Errore nell'invio SMS" 
      };
    }
  } catch (error: any) {
    console.error("[MSG91] PR credentials SMS error:", error);
    console.log(`[MSG91] ======= END DEBUG (ERROR) =======`);
    return { success: false, message: "Errore di connessione al servizio SMS" };
  }
}

export function generatePrPassword(): string {
  // Genera password alfanumerica di 8 caratteri
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ==================== QR Notification SMS ====================

const QR_NOTIFICATION_TEMPLATE_ID = process.env.MSG91_QR_TEMPLATE_ID || process.env.MSG91_TEMPLATE_ID;

interface QrNotificationSmsOptions {
  phone: string;
  firstName: string;
  eventName: string;
  qrCode: string;
  type: 'guest_list' | 'table_booking';
  eventDate?: string;
}

interface QrNotificationResult {
  success: boolean;
  message: string;
  requestId?: string;
}

export async function sendQrNotificationSMS(options: QrNotificationSmsOptions): Promise<QrNotificationResult> {
  const { phone, firstName, eventName, qrCode, type, eventDate } = options;
  const authkey = getMSG91Authkey();
  
  console.log(`[MSG91] ======= QR NOTIFICATION SMS =======`);
  console.log(`[MSG91] Phone: "${phone}"`);
  console.log(`[MSG91] Name: "${firstName}"`);
  console.log(`[MSG91] Event: "${eventName}"`);
  console.log(`[MSG91] QR: "${qrCode}"`);
  console.log(`[MSG91] Type: "${type}"`);
  
  if (!authkey) {
    console.error("[MSG91] Missing AUTHKEY for QR notification");
    return { success: false, message: "Configurazione MSG91 mancante" };
  }

  const formattedPhone = formatPhoneNumber(phone);
  const typeLabel = type === 'guest_list' ? 'Lista' : 'Tavolo';
  
  const payload = {
    flow_id: QR_NOTIFICATION_TEMPLATE_ID,
    recipients: [
      {
        mobiles: formattedPhone,
        name: firstName,
        event: eventName.substring(0, 30),
        qr: qrCode,
        type: typeLabel,
        date: eventDate || ''
      }
    ]
  };

  console.log(`[MSG91] Payload:`, JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(MSG91_FLOW_URL, {
      method: 'POST',
      headers: {
        'authkey': authkey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const rawResponse = await response.text();
    console.log(`[MSG91] Response: ${rawResponse}`);
    
    let data: MSG91Response;
    try {
      data = JSON.parse(rawResponse);
    } catch (e) {
      console.error(`[MSG91] Failed to parse response`);
      return { success: false, message: "Risposta MSG91 non valida" };
    }

    if (data.type === 'success') {
      console.log(`[MSG91] QR SMS sent successfully`);
      return { 
        success: true, 
        message: "QR inviato via SMS",
        requestId: data.message
      };
    } else {
      console.error(`[MSG91] QR SMS failed: ${data.message}`);
      return { 
        success: false, 
        message: data.message || "Errore nell'invio SMS" 
      };
    }
  } catch (error: any) {
    console.error("[MSG91] QR notification SMS error:", error);
    return { success: false, message: "Errore di connessione al servizio SMS" };
  }
}
