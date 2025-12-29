// Gmail Integration for SIAE Transmission Response Reading
// Supports both custom OAuth and Replit's Gmail connector

import { google } from 'googleapis';
import { getCustomGmailClient, isGmailAuthorized } from './gmail-oauth';

let connectionSettings: any;

async function getReplitAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
async function getReplitGmailClient() {
  const accessToken = await getReplitAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Get Gmail client - tries custom OAuth first, then falls back to Replit connector
export async function getGmailClient(companyId?: string) {
  // Try custom OAuth first if companyId provided
  if (companyId) {
    try {
      const authStatus = await isGmailAuthorized(companyId);
      if (authStatus.authorized) {
        console.log(`[Gmail] Using custom OAuth for company ${companyId} (${authStatus.email})`);
        return await getCustomGmailClient(companyId);
      }
    } catch (error: any) {
      console.log(`[Gmail] Custom OAuth not available: ${error.message}`);
    }
  }
  
  // Fall back to Replit connector
  console.log('[Gmail] Falling back to Replit connector');
  return await getReplitGmailClient();
}

// Interface for SIAE response parsing
export interface SiaeEmailResponse {
  messageId: string;
  subject: string;
  from: string;
  date: Date;
  body: string;
  protocolNumber?: string;
  status: 'accepted' | 'rejected' | 'error' | 'unknown';
  errorMessage?: string;
  transmissionId?: string;
}

// Parse SIAE response from email body
function parseSiaeResponse(subject: string, body: string): Partial<SiaeEmailResponse> {
  const result: Partial<SiaeEmailResponse> = {
    status: 'unknown'
  };

  // Look for protocol number patterns like "Prot. n. 12345" or "Protocollo: 12345"
  const protocolMatch = body.match(/(?:Prot\.?\s*n\.?|Protocollo:?)\s*(\d+)/i);
  if (protocolMatch) {
    result.protocolNumber = protocolMatch[1];
  }

  // Look for transmission ID in subject or body
  const transmissionMatch = body.match(/(?:ID Trasmissione|Rif\.?:?)\s*([A-Za-z0-9-]+)/i) 
    || subject.match(/(?:ID|Rif\.?:?)\s*([A-Za-z0-9-]+)/i);
  if (transmissionMatch) {
    result.transmissionId = transmissionMatch[1];
  }

  // Determine status based on keywords
  const lowerBody = body.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  if (lowerBody.includes('accettato') || lowerBody.includes('ricevuto con successo') || 
      lowerSubject.includes('conferma') || lowerBody.includes('elaborato correttamente')) {
    result.status = 'accepted';
  } else if (lowerBody.includes('rifiutato') || lowerBody.includes('errore') || 
             lowerBody.includes('scartato') || lowerSubject.includes('errore')) {
    result.status = 'rejected';
    // Try to extract error message
    const errorMatch = body.match(/(?:Errore|Motivo|Causa)[:\s]+(.+?)(?:\.|$)/im);
    if (errorMatch) {
      result.errorMessage = errorMatch[1].trim();
    }
  } else if (lowerBody.includes('problema') || lowerBody.includes('fallito')) {
    result.status = 'error';
  }

  return result;
}

// Fetch SIAE response emails from inbox
export async function fetchSiaeResponses(companyId?: string, sinceDate?: Date): Promise<SiaeEmailResponse[]> {
  const gmail = await getGmailClient(companyId);
  
  // Build query for SIAE-related emails
  let query = 'from:siae.it OR from:batest.siae.it';
  if (sinceDate) {
    const dateStr = sinceDate.toISOString().split('T')[0].replace(/-/g, '/');
    query += ` after:${dateStr}`;
  }

  console.log(`[Gmail] Searching for SIAE emails with query: ${query}`);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50
  });

  const messages = response.data.messages || [];
  const results: SiaeEmailResponse[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full'
    });

    const headers = fullMessage.data.payload?.headers || [];
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
    const dateStr = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';

    // Extract body content
    let body = '';
    const payload = fullMessage.data.payload;
    
    if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload?.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }

    const parsed = parseSiaeResponse(subject, body);

    results.push({
      messageId: msg.id,
      subject,
      from,
      date: new Date(dateStr),
      body,
      ...parsed
    } as SiaeEmailResponse);
  }

  console.log(`[Gmail] Found ${results.length} SIAE response emails`);
  return results;
}

// Check for new SIAE responses and return any that match pending transmissions
export async function checkForSiaeResponses(companyId?: string): Promise<SiaeEmailResponse[]> {
  try {
    // Check emails from the last 7 days
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 7);
    
    return await fetchSiaeResponses(companyId, sinceDate);
  } catch (error: any) {
    console.error('[Gmail] Error fetching SIAE responses:', error);
    
    // Handle insufficient permissions error
    if (error.message?.includes('Insufficient Permission') || 
        error.code === 403 || 
        error.errors?.[0]?.reason === 'insufficientPermissions') {
      throw new Error(
        'GMAIL_PERMISSION_ERROR: Permessi Gmail insufficienti per leggere le email. ' +
        'Autorizza Gmail con permessi di lettura dalla pagina Trasmissioni SIAE.'
      );
    }
    
    // Handle not connected/authorized error
    if (error.message?.includes('Gmail not connected') || error.message?.includes('GMAIL_NOT_AUTHORIZED')) {
      throw new Error(
        'GMAIL_NOT_CONNECTED: Gmail non configurato per la lettura email. ' +
        'Autorizza Gmail dalla pagina Trasmissioni SIAE per verificare automaticamente le risposte.'
      );
    }
    
    throw error;
  }
}

// Check Gmail authorization status for a company
export { isGmailAuthorized } from './gmail-oauth';
