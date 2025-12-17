const MSG91_BASE_URL = "https://control.msg91.com/api/v5";
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

interface MSG91Response {
  type: string;
  message?: string;
  request_id?: string;
}

interface SendOTPResult {
  success: boolean;
  message: string;
  requestId?: string;
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

export async function sendOTP(phone: string, otpExpiry: number = 10): Promise<SendOTPResult> {
  console.log(`[MSG91] sendOTP called with phone: ${phone}`);
  console.log(`[MSG91] AUTHKEY configured: ${!!MSG91_AUTHKEY}, TEMPLATE_ID configured: ${!!MSG91_TEMPLATE_ID}`);
  
  if (!MSG91_AUTHKEY || !MSG91_TEMPLATE_ID) {
    console.error("[MSG91] Missing AUTHKEY or TEMPLATE_ID - AUTHKEY:", !!MSG91_AUTHKEY, "TEMPLATE_ID:", !!MSG91_TEMPLATE_ID);
    return { success: false, message: "Configurazione MSG91 mancante" };
  }

  const formattedPhone = formatPhoneNumber(phone);
  console.log(`[MSG91] Formatted phone: ${formattedPhone}`);
  
  const url = new URL(`${MSG91_BASE_URL}/otp`);
  url.searchParams.append('authkey', MSG91_AUTHKEY);
  url.searchParams.append('template_id', MSG91_TEMPLATE_ID);
  url.searchParams.append('mobile', formattedPhone);
  url.searchParams.append('otp_expiry', String(otpExpiry));
  url.searchParams.append('realTimeResponse', '1');

  console.log(`[MSG91] Sending OTP to ${formattedPhone} with template ${MSG91_TEMPLATE_ID}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: MSG91Response = await response.json();
    console.log(`[MSG91] SendOTP response:`, data);

    if (data.type === 'success') {
      return { 
        success: true, 
        message: "OTP inviato con successo",
        requestId: data.request_id 
      };
    } else {
      return { 
        success: false, 
        message: data.message || "Errore nell'invio OTP" 
      };
    }
  } catch (error: any) {
    console.error("[MSG91] SendOTP error:", error);
    return { success: false, message: "Errore di connessione al servizio SMS" };
  }
}

export async function verifyOTP(phone: string, otp: string): Promise<VerifyOTPResult> {
  if (!MSG91_AUTHKEY) {
    console.error("[MSG91] Missing AUTHKEY");
    return { success: false, message: "Configurazione MSG91 mancante" };
  }

  const formattedPhone = formatPhoneNumber(phone);
  
  const url = new URL(`${MSG91_BASE_URL}/otp/verify`);
  url.searchParams.append('authkey', MSG91_AUTHKEY);
  url.searchParams.append('mobile', formattedPhone);
  url.searchParams.append('otp', otp);

  console.log(`[MSG91] Verifying OTP for ${formattedPhone}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: MSG91Response = await response.json();
    console.log(`[MSG91] VerifyOTP response:`, data);

    if (data.type === 'success') {
      return { 
        success: true, 
        message: "OTP verificato con successo",
        type: data.type
      };
    } else {
      return { 
        success: false, 
        message: data.message || "OTP non valido",
        type: data.type
      };
    }
  } catch (error: any) {
    console.error("[MSG91] VerifyOTP error:", error);
    return { success: false, message: "Errore di connessione al servizio SMS" };
  }
}

export async function resendOTP(phone: string, retryType: 'text' | 'voice' = 'text'): Promise<SendOTPResult> {
  if (!MSG91_AUTHKEY) {
    console.error("[MSG91] Missing AUTHKEY");
    return { success: false, message: "Configurazione MSG91 mancante" };
  }

  const formattedPhone = formatPhoneNumber(phone);
  
  const url = new URL(`${MSG91_BASE_URL}/otp/retry`);
  url.searchParams.append('authkey', MSG91_AUTHKEY);
  url.searchParams.append('mobile', formattedPhone);
  url.searchParams.append('retrytype', retryType);

  console.log(`[MSG91] Resending OTP to ${formattedPhone} via ${retryType}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: MSG91Response = await response.json();
    console.log(`[MSG91] ResendOTP response:`, data);

    if (data.type === 'success') {
      return { 
        success: true, 
        message: "OTP reinviato con successo",
        requestId: data.request_id 
      };
    } else {
      return { 
        success: false, 
        message: data.message || "Errore nel reinvio OTP" 
      };
    }
  } catch (error: any) {
    console.error("[MSG91] ResendOTP error:", error);
    return { success: false, message: "Errore di connessione al servizio SMS" };
  }
}

export function isMSG91Configured(): boolean {
  return !!(MSG91_AUTHKEY && MSG91_TEMPLATE_ID);
}
