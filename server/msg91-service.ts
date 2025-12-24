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
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  if (!cleaned.startsWith('39') && cleaned.length === 10) {
    cleaned = '39' + cleaned;
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
  
  console.log(`[MSG91] sendPrCredentialsSMS called for ${name} to ${phone}`);
  console.log(`[MSG91] AUTHKEY configured: ${!!authkey}`);
  
  if (!authkey) {
    console.error("[MSG91] Missing AUTHKEY");
    return { success: false, message: "Configurazione MSG91 mancante" };
  }

  const formattedPhone = formatPhoneNumber(phone);
  
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

  console.log(`[MSG91] Sending PR credentials SMS to ${formattedPhone}`);

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
    console.log(`[MSG91] PR credentials SMS response:`, data);

    if (data.type === 'success') {
      return { 
        success: true, 
        message: "Credenziali inviate via SMS",
        requestId: data.message
      };
    } else {
      return { 
        success: false, 
        message: data.message || "Errore nell'invio SMS" 
      };
    }
  } catch (error: any) {
    console.error("[MSG91] PR credentials SMS error:", error);
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
