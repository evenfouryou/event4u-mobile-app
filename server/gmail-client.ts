// Gmail Integration for SIAE Transmission Response Reading
// Supports both custom OAuth and Replit's Gmail connector

import { google } from 'googleapis';
import { getSystemGmailClient, isGmailConnected } from './gmail-oauth';
import { parseSiaeResponseFile } from './siae-utils';

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

// Get Gmail client - tries system-wide OAuth first, then falls back to Replit connector
export async function getGmailClient(_companyId?: string) {
  // Try system-wide OAuth first
  try {
    const status = await isGmailConnected();
    if (status.connected) {
      console.log(`[Gmail] Using system-wide OAuth (${status.email})`);
      return await getSystemGmailClient();
    }
  } catch (error: any) {
    console.log(`[Gmail] System-wide OAuth not available: ${error.message}`);
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
  errorCode?: string;
  transmissionId?: string;
  attachments?: SiaeAttachment[];
}

// Interface for SIAE attachment
export interface SiaeAttachment {
  filename: string;
  content: string;
  mimeType: string;
  parsed?: {
    success: boolean;
    type: 'OK' | 'ERRORE' | 'UNKNOWN';
    code: string | null;
    description: string | null;
    protocolNumber: string | null;
  };
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

// Extract attachment from message part recursively
async function extractAttachments(
  gmail: any, 
  messageId: string, 
  parts: any[], 
  attachments: SiaeAttachment[]
): Promise<void> {
  for (const part of parts) {
    // Recurse into nested parts
    if (part.parts) {
      await extractAttachments(gmail, messageId, part.parts, attachments);
    }
    
    // Check for attachment
    const filename = part.filename;
    if (filename && filename.endsWith('.txt') && part.body?.attachmentId) {
      try {
        const attachmentResponse = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId
        });
        
        // Gmail API returns base64url encoded data, need to convert to standard base64
        const base64Data = attachmentResponse.data.data
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        const content = Buffer.from(base64Data, 'base64').toString('utf-8');
        const parsed = parseSiaeResponseFile(content);
        
        attachments.push({
          filename,
          content,
          mimeType: part.mimeType || 'text/plain',
          parsed: {
            success: parsed.success,
            type: parsed.type,
            code: parsed.code,
            description: parsed.description,
            protocolNumber: parsed.protocolNumber
          }
        });
        
        console.log(`[Gmail] Extracted attachment: ${filename}, type: ${parsed.type}, code: ${parsed.code}`);
      } catch (err: any) {
        console.error(`[Gmail] Failed to get attachment ${filename}:`, err.message);
      }
    }
  }
}

// Extract transmission reference from filename
// Supports both formats:
// 1. Our format: RCA_yyyyMMdd_SSSSSSSS_nnn.xsi (e.g., RCA_20260115_P0004010_001.xsi)
// 2. Legacy/SIAE format: RCA_YYYY_MM_DD_nnn (e.g., RCA_2025_12_17_001.xsi)
function extractTransmissionRefFromFilename(filename: string): { reportType: string; reportDate: string; progressivo: string; systemCode?: string } | null {
  // Pattern 1: Our format with contiguous date and system code
  // RCA_yyyyMMdd_SSSSSSSS_nnn or RMG_yyyyMMdd_SSSSSSSS_nnn or RPM_yyyyMM_SSSSSSSS_nnn
  const ourFormatMatch = filename.match(/^(RCA|RMG|RPM)_(\d{4})(\d{2})(\d{2})?_([A-Z0-9]{8})_(\d{3})/);
  if (ourFormatMatch) {
    const [, type, year, month, day, sysCode, prog] = ourFormatMatch;
    return {
      reportType: type.toLowerCase(),
      reportDate: day ? `${year}-${month}-${day}` : `${year}-${month}`,
      progressivo: prog,
      systemCode: sysCode
    };
  }
  
  // Pattern 2: Legacy format with underscore-separated dates (no system code)
  // RCA_YYYY_MM_DD_NNN or RMG_YYYY_MM_DD_NNN or RPM_YYYY_MM_NNN
  const legacyMatch = filename.match(/^(RCA|RMG|RPM)_(\d{4})_(\d{2})_(\d{2})?_?(\d{3})/);
  if (legacyMatch) {
    const [, type, year, month, day, prog] = legacyMatch;
    return {
      reportType: type.toLowerCase(),
      reportDate: day ? `${year}-${month}-${day}` : `${year}-${month}`,
      progressivo: prog
    };
  }
  
  return null;
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
      // Gmail API uses base64url encoding - normalize to standard base64
      const base64Body = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
      body = Buffer.from(base64Body, 'base64').toString('utf-8');
    } else if (payload?.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          const base64Part = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
          body = Buffer.from(base64Part, 'base64').toString('utf-8');
          break;
        }
      }
    }

    // Extract attachments (.txt files with SIAE response)
    const attachments: SiaeAttachment[] = [];
    if (payload?.parts) {
      await extractAttachments(gmail, msg.id, payload.parts, attachments);
    }

    const parsed = parseSiaeResponse(subject, body);
    
    // If we have attachments with parsed data, use that for status/code
    let errorCode: string | undefined;
    let protocolNumber: string | undefined;
    let status = parsed.status;
    let errorMessage = parsed.errorMessage;
    
    for (const att of attachments) {
      if (att.parsed) {
        if (att.parsed.type === 'ERRORE' && att.parsed.code) {
          errorCode = att.parsed.code;
          errorMessage = att.parsed.description || errorMessage;
          status = 'rejected';
        } else if (att.parsed.type === 'OK' && att.parsed.protocolNumber) {
          protocolNumber = att.parsed.protocolNumber;
          status = 'accepted';
        }
        
        // Try to extract transmission reference from attachment filename
        const ref = extractTransmissionRefFromFilename(att.filename);
        if (ref && !parsed.transmissionId) {
          // Store reference info for later matching
          parsed.transmissionId = `${ref.reportType}_${ref.reportDate}_${ref.progressivo}`;
        }
      }
    }

    results.push({
      messageId: msg.id,
      subject,
      from,
      date: new Date(dateStr),
      body,
      ...parsed,
      attachments,
      errorCode,
      protocolNumber: protocolNumber || parsed.protocolNumber,
      status: status || 'unknown',
      errorMessage
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

// Check Gmail connection status (system-wide)
export { isGmailConnected } from './gmail-oauth';
