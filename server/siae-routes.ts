// SIAE Module API Routes
import { Router, Request, Response, NextFunction } from "express";
import { escapeXml, formatSiaeDateCompact, formatSiaeTimeCompact, formatSiaeTimeHHMM, formatSiaeDate, formatSiaeDateTime, toCentesimi, normalizeSiaeTipoTitolo, normalizeSiaeCodiceOrdine, generateSiaeFileName, generateSiaeAttachmentName, SIAE_SYSTEM_CODE_DEFAULT, SIAE_CANCELLED_STATUSES, isCancelledStatus, validateC1Report, type C1ValidationResult, generateC1LogXml, type C1LogParams, type SiaeEventForLog, type SiaeTicketForLog, generateRCAXml, type RCAParams, type RCAResult, mapToSiaeTipoGenere, parseSiaeResponseFile, type SiaeResponseParseResult, resolveSystemCode, resolveSystemCodeForSmime, validateSiaeReportPrerequisites, validateSystemCodeConsistency, type SiaePrerequisiteData, type SiaePrerequisiteValidation, validatePreTransmission, autoCorrectSiaeXml, generateC1Xml, type C1XmlParams, type C1EventContext, type C1SectorData, type C1TicketData, type C1SubscriptionData, validateSiaeSystemCode, validateSiaeFileName, getDefaultEntertainmentIncidence, getDefaultTaxType } from './siae-utils';
import { createSiaeTransmissionWithXml, type CreateSiaeTransmissionParams } from './siae-transmission-service';
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";
import { db } from "./db";
import { events, siaeCashiers, siaeTickets, siaeTransactions, siaeSubscriptions, siaeCashierAllocations, siaeOtpAttempts, siaeNameChanges, siaeResales, publicCartItems, publicCheckoutSessions, publicCustomerSessions, tableBookings, guestListEntries, siaeTransmissions, companies, siaeEmissionChannels, siaeSystemConfig, userFeatures, siaeTicketedEvents, users, siaeEventSectors, floorPlanSeats, siaeSeats, floorPlanZones, siaeAuditLogs, siaeCustomers, venueFloorPlans, siaeNumberedSeats } from "@shared/schema";
import { eq, and, or, sql, desc, isNull, SQL, gte, lte, count, inArray } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requestFiscalSeal, isCardReadyForSeals, isBridgeConnected, getCachedBridgeStatus, requestXmlSignature, getCachedEfffData } from "./bridge-relay";
import { sendPrintJobToAgent, getConnectedAgents } from "./print-relay";
import { generateTicketHtml } from "./template-routes";
import { sendOTP as sendMSG91OTP, verifyOTP as verifyMSG91OTP, resendOTP as resendMSG91OTP, isMSG91Configured } from "./msg91-service";
import { getUncachableStripeClient } from "./stripeClient";
import { ticketTemplates, ticketTemplateElements } from "@shared/schema";
import {
  insertSiaeEventGenreSchema,
  insertSiaeSectorCodeSchema,
  insertSiaeTicketTypeSchema,
  insertSiaeServiceCodeSchema,
  insertSiaeCancellationReasonSchema,
  insertSiaeActivationCardSchema,
  insertSiaeEmissionChannelSchema,
  insertSiaeSystemConfigSchema,
  insertSiaeCustomerSchema,
  insertSiaeOtpAttemptSchema,
  insertSiaeTicketedEventSchema,
  insertSiaeEventSectorSchema,
  insertSiaeSeatSchema,
  insertSiaeFiscalSealSchema,
  insertSiaeTicketSchema,
  insertSiaeTransactionSchema,
  insertSiaeNameChangeSchema,
  insertSiaeResaleSchema,
  insertSiaeLogSchema,
  insertSiaeTransmissionSchema,
  insertSiaeBoxOfficeSessionSchema,
  insertSiaeSubscriptionSchema,
  insertSiaeSubscriptionTypeSchema,
  siaeSubscriptionTypes,
  insertSiaeAuditLogSchema,
  insertSiaeNumberedSeatSchema,
  insertSiaeSmartCardSessionSchema,
  insertSiaeSmartCardSealLogSchema,
} from "@shared/schema";

// Helper to create validated partial schemas for PATCH operations
// Uses .strict() to reject unknown fields and .refine() to reject empty payloads
function makePatchSchema<T extends z.AnyZodObject>(schema: T) {
  return schema.partial().strict().refine(
    (obj: Record<string, unknown>) => Object.keys(obj).length > 0,
    { message: "Payload vuoto non permesso" }
  );
}

// Create validated partial schemas for PATCH - omitting immutable fields where needed
const patchEventGenreSchema = makePatchSchema(insertSiaeEventGenreSchema.omit({ code: true }));
const patchSectorCodeSchema = makePatchSchema(insertSiaeSectorCodeSchema.omit({ code: true }));
const patchTicketTypeSchema = makePatchSchema(insertSiaeTicketTypeSchema.omit({ code: true }));
const patchServiceCodeSchema = makePatchSchema(insertSiaeServiceCodeSchema.omit({ code: true }));
const patchCancellationReasonSchema = makePatchSchema(insertSiaeCancellationReasonSchema.omit({ code: true }));
const patchActivationCardSchema = makePatchSchema(insertSiaeActivationCardSchema.omit({ cardCode: true }));
const patchEmissionChannelSchema = makePatchSchema(insertSiaeEmissionChannelSchema.omit({ companyId: true }));
const patchSystemConfigSchema = makePatchSchema(insertSiaeSystemConfigSchema.omit({ companyId: true }));
const patchCustomerSchema = makePatchSchema(insertSiaeCustomerSchema.omit({ uniqueCode: true }) as z.AnyZodObject);
const patchTicketedEventSchema = makePatchSchema(insertSiaeTicketedEventSchema.omit({ companyId: true }));
const patchEventSectorSchema = makePatchSchema(insertSiaeEventSectorSchema.omit({ ticketedEventId: true }));
const patchSeatSchema = makePatchSchema(insertSiaeSeatSchema.omit({ sectorId: true }));
const patchFiscalSealSchema = makePatchSchema(insertSiaeFiscalSealSchema.omit({ sealCode: true, cardId: true }));
const patchTicketSchema = makePatchSchema(insertSiaeTicketSchema.omit({ ticketedEventId: true, sectorId: true, fiscalSealId: true }));
const patchTransactionSchema = makePatchSchema(insertSiaeTransactionSchema.omit({ customerId: true, ticketedEventId: true }));
const patchNameChangeSchema = makePatchSchema(insertSiaeNameChangeSchema.omit({ originalTicketId: true, requestedById: true }));
const patchResaleSchema = makePatchSchema(insertSiaeResaleSchema.omit({ originalTicketId: true, sellerId: true }));
const patchTransmissionSchema = makePatchSchema(insertSiaeTransmissionSchema.omit({ companyId: true }));
const patchBoxOfficeSessionSchema = makePatchSchema(insertSiaeBoxOfficeSessionSchema.omit({ emissionChannelId: true, userId: true }));
const patchSubscriptionSchema = makePatchSchema(insertSiaeSubscriptionSchema.omit({ customerId: true }));
const patchSubscriptionTypeSchema = makePatchSchema(insertSiaeSubscriptionTypeSchema.omit({ companyId: true, ticketedEventId: true }) as z.AnyZodObject);
const patchNumberedSeatSchema = makePatchSchema(insertSiaeNumberedSeatSchema.omit({ sectorId: true }));

const router = Router();

// SIAE Test Environment Configuration
const SIAE_TEST_EMAIL = process.env.SIAE_TEST_EMAIL || 'servertest2@batest.siae.it';
const SIAE_TEST_MODE = process.env.SIAE_TEST_MODE === 'true';

// Get SIAE destination email based on mode
function getSiaeDestinationEmail(overrideEmail?: string): string {
  if (overrideEmail) return overrideEmail;
  return SIAE_TEST_MODE ? SIAE_TEST_EMAIL : SIAE_TEST_EMAIL; // In production, this would use the real SIAE email
}

console.log('[SIAE Routes] Router initialized, registering routes...');
console.log(`[SIAE Routes] Test mode: ${SIAE_TEST_MODE}, Test email: ${SIAE_TEST_EMAIL}`);

/**
 * Verifica se un evento o azienda è esente da SIAE per modalità internazionale
 * Controlla isInternational dell'evento e operatingMode dell'azienda
 */
async function checkInternationalExemption(
  eventId: string | null | undefined,
  companyId: string
): Promise<{ exempt: boolean; reason?: string }> {
  if (eventId) {
    const event = await storage.getEvent(eventId);
    if (event?.isInternational) {
      return { exempt: true, reason: "Eventi internazionali sono esenti da report SIAE" };
    }
  }
  
  const features = await storage.getCompanyFeatures(companyId);
  if (features?.operatingMode === 'international_only') {
    return { exempt: true, reason: "Gestore in modalità internazionale - esente da SIAE" };
  }
  
  return { exempt: false };
}

/**
 * Valida e normalizza il Codice Fiscale italiano (16 caratteri)
 * Implementa l'algoritmo di checksum ufficiale dell'Agenzia delle Entrate
 * @returns { valid: boolean, normalized: string, error?: string }
 */
function validateCodiceFiscale(cf: string | null | undefined): { valid: boolean; normalized: string; error?: string } {
  if (!cf || cf.trim() === '') {
    return { valid: false, normalized: '', error: 'Codice Fiscale obbligatorio' };
  }
  
  const normalized = cf.toUpperCase().replace(/\s/g, '');
  
  // Lunghezza: 16 caratteri per persone fisiche, 11 per persone giuridiche (P.IVA format)
  if (normalized.length === 11 && /^\d{11}$/.test(normalized)) {
    // È una Partita IVA, non un CF - valida come P.IVA
    return validatePartitaIva(normalized);
  }
  
  if (normalized.length !== 16) {
    return { valid: false, normalized, error: 'Codice Fiscale deve essere di 16 caratteri' };
  }
  
  // Pattern: 6 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 alfanum + 1 lettera
  const cfPattern = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
  if (!cfPattern.test(normalized)) {
    return { valid: false, normalized, error: 'Formato Codice Fiscale non valido' };
  }
  
  // Tabelle per il calcolo del carattere di controllo
  const oddMap: Record<string, number> = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
  };
  
  const evenMap: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
    'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
  };
  
  const controlChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Calcola checksum
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = normalized[i];
    if (i % 2 === 0) {
      // Posizione dispari (1-based), usa oddMap
      sum += oddMap[char] ?? 0;
    } else {
      // Posizione pari (1-based), usa evenMap
      sum += evenMap[char] ?? 0;
    }
  }
  
  const expectedControl = controlChars[sum % 26];
  const actualControl = normalized[15];
  
  if (expectedControl !== actualControl) {
    return { valid: false, normalized, error: 'Carattere di controllo Codice Fiscale non valido' };
  }
  
  return { valid: true, normalized };
}

/**
 * Valida e normalizza la Partita IVA italiana (11 cifre)
 * Implementa l'algoritmo di checksum Luhn modificato
 * @returns { valid: boolean, normalized: string, error?: string }
 */
function validatePartitaIva(piva: string | null | undefined): { valid: boolean; normalized: string; error?: string } {
  if (!piva || piva.trim() === '') {
    return { valid: false, normalized: '', error: 'Partita IVA obbligatoria' };
  }
  
  const normalized = piva.replace(/\s/g, '').replace(/[^0-9]/g, '');
  
  if (normalized.length !== 11) {
    return { valid: false, normalized, error: 'Partita IVA deve essere di 11 cifre' };
  }
  
  // Tutte le cifre devono essere numeri
  if (!/^\d{11}$/.test(normalized)) {
    return { valid: false, normalized, error: 'Partita IVA deve contenere solo cifre' };
  }
  
  // Algoritmo di controllo Partita IVA italiana
  const digits = normalized.split('').map(d => parseInt(d, 10));
  
  let sumOdd = 0;
  let sumEven = 0;
  
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      // Posizione dispari (1-based)
      sumOdd += digits[i];
    } else {
      // Posizione pari (1-based) - raddoppia e sottrai 9 se > 9
      const doubled = digits[i] * 2;
      sumEven += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  
  const total = sumOdd + sumEven;
  const expectedControl = (10 - (total % 10)) % 10;
  const actualControl = digits[10];
  
  if (expectedControl !== actualControl) {
    return { valid: false, normalized, error: 'Cifra di controllo Partita IVA non valida' };
  }
  
  return { valid: true, normalized };
}

/**
 * Valida Codice Fiscale o Partita IVA (accetta entrambi i formati)
 * Utile per campi che possono contenere l'uno o l'altro
 */
function validateFiscalId(id: string | null | undefined): { valid: boolean; normalized: string; type: 'cf' | 'piva' | null; error?: string } {
  if (!id || id.trim() === '') {
    return { valid: false, normalized: '', type: null, error: 'Codice Fiscale o Partita IVA obbligatorio' };
  }
  
  const cleaned = id.toUpperCase().replace(/\s/g, '');
  
  // Prova prima come Partita IVA (11 cifre)
  if (/^\d{11}$/.test(cleaned)) {
    const pivaResult = validatePartitaIva(cleaned);
    return { ...pivaResult, type: pivaResult.valid ? 'piva' : null };
  }
  
  // Altrimenti prova come Codice Fiscale (16 caratteri)
  const cfResult = validateCodiceFiscale(cleaned);
  return { ...cfResult, type: cfResult.valid ? 'cf' : null };
}

import { createHash } from 'crypto';

interface TransmissionStats {
  totalIva: number;
  totalEsenti: number;
  totalImpostaIntrattenimento: number;
  ticketsChanged: number;
  ticketsResold: number;
  // FIX 2026-01-18: Aggiunti campi autoritativi per resend e validazione
  totalGross: number;        // Totale lordo (solo biglietti NON annullati)
  cancelledCount: number;    // Conteggio biglietti annullati (tutti gli stati SIAE)
  activeTicketCount: number; // Conteggio biglietti attivi (non annullati)
}

export async function calculateTransmissionStats(
  filteredTickets: any[],
  companyId: string,
  eventId?: string,
  tipoTassazione?: string,
  entertainmentIncidence?: number
): Promise<TransmissionStats> {
  let totalIva = 0;
  let totalEsenti = 0;
  let totalImpostaIntrattenimento = 0;
  let ticketsChanged = 0;
  let ticketsResold = 0;
  // FIX 2026-01-18: Campi separati per metriche resend
  let totalGross = 0;        // Totale lordo solo biglietti attivi
  let cancelledCount = 0;    // Biglietti annullati o sostituiti
  let activeTicketCount = 0; // Biglietti attivi
  
  for (const ticket of filteredTickets) {
    const vatAmount = parseFloat(ticket.vatAmount || '0');
    const grossAmount = parseFloat(ticket.grossAmount || '0');
    const ticketStatus = ticket.status || '';
    
    // ORIGINALE: totalIva/totalEsenti/totalImpostaIntrattenimento su TUTTI i biglietti
    // Questo mantiene compatibilità con le trasmissioni iniziali
    totalIva += vatAmount;
    
    if (vatAmount === 0) {
      totalEsenti += grossAmount;
    }
    
    if (tipoTassazione === 'I' && entertainmentIncidence) {
      totalImpostaIntrattenimento += grossAmount * (entertainmentIncidence / 100);
    }
    
    // FIX 2026-01-18: Calcolo metriche separate per resend
    // Un biglietto è "cancellato" se: isCancelledStatus OPPURE ha replacedByTicketId
    const isCancelled = isCancelledStatus(ticketStatus) || !!ticket.replacedByTicketId;
    
    if (isCancelled) {
      cancelledCount++;
    } else {
      // Solo biglietti attivi contribuiscono a totalGross
      totalGross += grossAmount;
      activeTicketCount++;
    }
    
    // Conteggio cambio nominativo (sottocategoria degli annullati)
    if (ticketStatus === 'annullato_cambio_nominativo' || ticket.replacedByTicketId) {
      ticketsChanged++;
    }
  }
  
  if (eventId) {
    try {
      const resales = await siaeStorage.getSiaeResalesByEvent(eventId);
      ticketsResold = resales.length;
    } catch (err) {
      console.warn(`[SIAE] Could not fetch resales for event ${eventId}:`, err);
    }
  }
  
  return {
    totalIva,
    totalEsenti,
    totalImpostaIntrattenimento,
    ticketsChanged,
    ticketsResold,
    totalGross,
    cancelledCount,
    activeTicketCount,
  };
}

export function calculateFileHash(xmlContent: string): string {
  return createHash('sha256').update(xmlContent).digest('hex');
}

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autorizzato" });
  }
  next();
}

// Middleware to check if user is super admin
function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user as any).role !== 'super_admin') {
    return res.status(403).json({ message: "Accesso riservato ai Super Admin" });
  }
  next();
}

// Middleware to check if user is gestore or super admin
function requireGestore(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || (user.role !== 'super_admin' && user.role !== 'gestore')) {
    return res.status(403).json({ message: "Accesso riservato ai Gestori" });
  }
  next();
}

// Middleware to check if user is organizer or higher
function requireOrganizer(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['super_admin', 'gestore', 'organizer'].includes(user.role)) {
    return res.status(403).json({ message: "Accesso riservato agli Organizzatori" });
  }
  next();
}

// Middleware to check if user is organizer OR cashier (for operations like cancel-range)
function requireOrganizerOrCashier(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || !['super_admin', 'gestore', 'organizer', 'cassiere'].includes(user.role)) {
    return res.status(403).json({ message: "Accesso riservato agli Organizzatori o Cassieri" });
  }
  next();
}

// ==================== DEBUG ENDPOINT - Test Email SIAE ====================
// Endpoint pubblico per testare l'invio email SMTP (solo in development)
// NOTA: Usa codice sistema test P0004010 per evitare errori SIAE 0600
router.get("/api/siae/debug/test-smtp", async (req: Request, res: Response) => {
  try {
    const { emailTransporter, sendSiaeTransmissionEmail } = await import('./email-service');
    
    // FIX 2026-01-16: Usa codice sistema test valido invece di EVENT4U1
    // P0004010 è un codice test valido (P + 7 cifre)
    const DEBUG_TEST_SYSTEM_CODE = 'P0004010';
    
    // Test 1: Verifica connessione SMTP
    const smtpStatus = await new Promise<{connected: boolean; error?: string}>((resolve) => {
      emailTransporter.verify((error, success) => {
        if (error) {
          resolve({ connected: false, error: error.message });
        } else {
          resolve({ connected: true });
        }
      });
    });
    
    // Get destination email from query or use default
    const testDestination = (req.query.to as string) || process.env.SIAE_TEST_EMAIL || 'servertest2@batest.siae.it';
    
    // Test 2: Invia email di test
    let emailSent = false;
    let emailError: string | null = null;
    
    try {
      const now = new Date();
      const dataRiepilogo = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
      const oraGenerazione = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
      // NOTA: Nessun DOCTYPE - i Web Service SIAE non risolvono DTD esterni (XXE protection)
      // FIX 2026-01-16: Usa codice sistema test P0004010 invece di EVENT4U1
      const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<RiepilogoControlloAccessi Sostituzione="N">
  <Titolare>
    <DenominazioneTitolareCA>DEBUG TEST COMPANY</DenominazioneTitolareCA>
    <CFTitolareCA>DBGTST00A00A000A</CFTitolareCA>
    <CodiceSistemaCA>${DEBUG_TEST_SYSTEM_CODE}</CodiceSistemaCA>
    <DataRiepilogo>${dataRiepilogo}</DataRiepilogo>
    <DataGenerazioneRiepilogo>${dataRiepilogo}</DataGenerazioneRiepilogo>
    <OraGenerazioneRiepilogo>${oraGenerazione}</OraGenerazioneRiepilogo>
    <ProgressivoRiepilogo>1</ProgressivoRiepilogo>
  </Titolare>
  <Evento>
    <CFOrganizzatore>DBGTST00A00A000A</CFOrganizzatore>
    <DenominazioneOrganizzatore>DEBUG TEST COMPANY</DenominazioneOrganizzatore>
    <TipologiaOrganizzatore>G</TipologiaOrganizzatore>
    <SpettacoloIntrattenimento>N</SpettacoloIntrattenimento>
    <IncidenzaIntrattenimento>100</IncidenzaIntrattenimento>
    <DenominazioneLocale>DEBUG Locale Test</DenominazioneLocale>
    <CodiceLocale>0000000000000</CodiceLocale>
    <DataEvento>${dataRiepilogo}</DataEvento>
    <OraEvento>2000</OraEvento>
    <TipoGenere>DI</TipoGenere>
    <TitoloEvento>Debug Test Event</TitoloEvento>
    <Autore></Autore>
    <Esecutore></Esecutore>
    <NazionalitaFilm></NazionalitaFilm>
    <NumOpereRappresentate>1</NumOpereRappresentate>
    <SistemaEmissione CFTitolare="DBGTST00A00A000A" CodiceSistema="${DEBUG_TEST_SYSTEM_CODE}">
      <Titoli>
        <CodiceOrdinePosto>A0</CodiceOrdinePosto>
        <Capienza>100</Capienza>
        <TotaleTipoTitolo>
          <TipoTitolo>IN</TipoTitolo>
          <TotaleTitoliLTA>0</TotaleTitoliLTA>
          <TotaleTitoliNoAccessoTradiz>0</TotaleTitoliNoAccessoTradiz>
          <TotaleTitoliNoAccessoDigitali>0</TotaleTitoliNoAccessoDigitali>
          <TotaleTitoliLTAAccessoTradiz>0</TotaleTitoliLTAAccessoTradiz>
          <TotaleTitoliLTAAccessoDigitali>0</TotaleTitoliLTAAccessoDigitali>
          <TotaleCorrispettiviLordi>0</TotaleCorrispettiviLordi>
          <TotaleDirittiPrevendita>0</TotaleDirittiPrevendita>
          <TotaleIVACorrispettivi>0</TotaleIVACorrispettivi>
          <TotaleIVADirittiPrevendita>0</TotaleIVADirittiPrevendita>
        </TotaleTipoTitolo>
        <TotaleTitoliAnnullati>
          <TipoTitolo>IN</TipoTitolo>
          <TotaleTitoliAnnull>0</TotaleTitoliAnnull>
          <TotaleCorrispettiviLordiAnnull>0</TotaleCorrispettiviLordiAnnull>
          <TotaleDirittiPrevenditaAnnull>0</TotaleDirittiPrevenditaAnnull>
          <TotaleIVACorrispettiviAnnull>0</TotaleIVACorrispettiviAnnull>
          <TotaleIVADirittiPrevenditaAnnull>0</TotaleIVADirittiPrevenditaAnnull>
        </TotaleTitoliAnnullati>
      </Titoli>
    </SistemaEmissione>
  </Evento>
</RiepilogoControlloAccessi>`;

      const emailResult = await sendSiaeTransmissionEmail({
        to: testDestination,
        companyName: 'DEBUG TEST',
        transmissionType: 'daily',
        periodDate: new Date(),
        ticketsCount: 0,
        totalAmount: '0.00',
        xmlContent: testXml,
        transmissionId: `DEBUG-${Date.now()}`,
        systemCode: DEBUG_TEST_SYSTEM_CODE, // FIX 2026-01-16: Usa codice test valido
        signWithSmime: true,
        requireSignature: true,
      });
      
      if (!emailResult.success) {
        throw new Error(emailResult.error || 'Invio email fallito - Firma S/MIME richiesta');
      }
      
      emailSent = true;
      console.log(`[SIAE-DEBUG] Test email sent successfully to: ${testDestination}`);
    } catch (err: any) {
      emailError = err.message;
      console.error('[SIAE-DEBUG] Email send failed:', err);
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      environment: {
        SIAE_TEST_MODE: process.env.SIAE_TEST_MODE,
        SIAE_TEST_EMAIL: process.env.SIAE_TEST_EMAIL,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER ? '***configured***' : 'NOT SET',
        SMTP_PASS: process.env.SMTP_PASS ? '***configured***' : 'NOT SET',
        SMTP_FROM: process.env.SMTP_FROM,
      },
      smtp: smtpStatus,
      emailTest: {
        destination: testDestination,
        sent: emailSent,
        error: emailError,
      },
      instructions: emailSent 
        ? `Email inviata a ${testDestination}. Controlla la casella email per verificare la ricezione.`
        : `Invio fallito: ${emailError}`,
    });
  } catch (error: any) {
    console.error('[SIAE-DEBUG] Debug endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// ==================== DEBUG ENDPOINT - Validate Fiscal Code / P.IVA ====================
router.get("/api/siae/debug/validate-fiscal", async (req: Request, res: Response) => {
  try {
    const { cf, piva, id } = req.query;
    const results: any = { timestamp: new Date().toISOString() };
    
    if (cf) {
      results.codiceFiscale = {
        input: cf,
        ...validateCodiceFiscale(cf as string)
      };
    }
    
    if (piva) {
      results.partitaIva = {
        input: piva,
        ...validatePartitaIva(piva as string)
      };
    }
    
    if (id) {
      results.fiscalId = {
        input: id,
        ...validateFiscalId(id as string)
      };
    }
    
    if (!cf && !piva && !id) {
      // Test con valori di esempio (codici fiscali reali per test)
      results.examples = {
        codiceFiscaleValido: {
          input: 'RSSMRA80A01H501U',
          ...validateCodiceFiscale('RSSMRA80A01H501U')
        },
        codiceFiscaleNonValido: {
          input: 'RSSMRA80A01H501X',
          ...validateCodiceFiscale('RSSMRA80A01H501X')
        },
        partitaIvaValida: {
          input: '12345678903',
          ...validatePartitaIva('12345678903')
        },
        partitaIvaNonValida: {
          input: '12345678901',
          ...validatePartitaIva('12345678901')
        }
      };
      results.usage = {
        message: "Usa i parametri query per testare i tuoi codici",
        examples: [
          "/api/siae/debug/validate-fiscal?cf=RSSMRA85M01H501U",
          "/api/siae/debug/validate-fiscal?piva=12345678903",
          "/api/siae/debug/validate-fiscal?id=RSSMRA85M01H501U"
        ]
      };
    }
    
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Email Audit Trail Endpoints ====================

router.get("/api/siae/companies/:companyId/email-audit", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const audits = await siaeStorage.getSiaeEmailAuditByCompany(req.params.companyId, limit);
    res.json(audits);
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to get email audit:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/transmissions/:transmissionId/email-audit", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const audits = await siaeStorage.getSiaeEmailAuditByTransmission(req.params.transmissionId);
    res.json(audits);
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to get email audit for transmission:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== DEBUG ENDPOINT - Signature Audit Log ====================
router.get("/api/siae/debug/signature-audit", async (req: Request, res: Response) => {
  try {
    const { getSignatureAuditLog, SignatureErrorCode } = await import('./bridge-relay');
    
    const auditLog = getSignatureAuditLog();
    
    res.json({
      timestamp: new Date().toISOString(),
      totalEntries: auditLog.length,
      entries: auditLog,
      errorCodes: Object.values(SignatureErrorCode),
      description: "Log delle ultime 100 operazioni di firma digitale (XML e S/MIME)"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DEBUG ENDPOINT - DTD Validation ====================
router.post("/api/siae/debug/validate-xml", async (req: Request, res: Response) => {
  try {
    const { xml, reportType } = req.body;
    
    if (!xml) {
      return res.status(400).json({ error: "XML content is required" });
    }
    
    const type = reportType || 'giornaliero';
    if (!['giornaliero', 'mensile', 'rca'].includes(type)) {
      return res.status(400).json({ error: "reportType deve essere 'giornaliero', 'mensile' o 'rca'" });
    }
    
    const { validateSiaeXml } = await import('./siae-utils');
    const result = validateSiaeXml(xml, type as 'giornaliero' | 'mensile' | 'rca');
    
    res.json({
      timestamp: new Date().toISOString(),
      reportType: type,
      xmlLength: xml.length,
      ...result,
      description: "Validazione sintattica XML conforme DTD SIAE"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DEBUG ENDPOINT - Parse Log SIAE ====================
router.post("/api/siae/debug/parse-log", async (req: Request, res: Response) => {
  try {
    const { xml } = req.body;
    
    if (!xml) {
      return res.status(400).json({ error: "XML content is required" });
    }
    
    const { parseSiaeLogXml, analyzeSiaeLog } = await import('./siae-utils');
    const parseResult = parseSiaeLogXml(xml);
    const stats = analyzeSiaeLog(parseResult);
    
    res.json({
      timestamp: new Date().toISOString(),
      parseResult,
      stats,
      description: "Parser Log.xsi SIAE conforme a Log_v0040_20190627.dtd"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Parse SIAE Response File ====================
/**
 * Parsa un file di risposta SIAE (.txt) per estrarre codice errore, descrizione, protocollo
 * Usato per aggiornare automaticamente lo stato delle trasmissioni
 */
router.post("/api/siae/parse-response", requireAuth, async (req: Request, res: Response) => {
  try {
    const { content, transmissionId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Content del file di risposta richiesto" });
    }
    
    const result = parseSiaeResponseFile(content);
    
    // Se fornito un transmissionId, aggiorna la trasmissione con i dati estratti
    if (transmissionId && result.code) {
      try {
        const transmission = await siaeStorage.getSiaeTransmission(transmissionId);
        if (transmission) {
          await siaeStorage.updateSiaeTransmission(transmissionId, {
            status: result.success ? 'confirmed' : 'error',
            errorMessage: result.success ? null : `Errore ${result.code}: ${result.description}`,
            receiptProtocol: result.protocolNumber || null,
            receiptContent: content.substring(0, 2000),
          });
        }
      } catch (updateError: any) {
        console.error('[SIAE-ROUTES] Failed to update transmission:', updateError);
      }
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      parsed: result,
      description: "Parsing file risposta SIAE completato"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SMART CARD EFFF Data Endpoint ====================
router.get("/api/siae/card/efff", requireAuth, async (req: Request, res: Response) => {
  try {
    const { requestCardEfffData, getCachedEfffData, isTestCardFromCache } = await import('./bridge-relay');
    const { isTestSmartCard, getSiaeEnvironment } = await import('./siae-utils');
    
    // Prima prova dalla cache
    const cached = getCachedEfffData();
    const forceRefresh = req.query.refresh === 'true';
    
    if (cached && !forceRefresh) {
      const isTest = isTestSmartCard(cached.systemId);
      const environment = getSiaeEnvironment(cached.systemId);
      
      return res.json({
        source: 'cache',
        data: cached,
        isTestCard: isTest,
        environment,
        siaeEmailTarget: isTest ? 'servertest2@batest.siae.it' : 'server@ba.siae.it'
      });
    }
    
    // Richiedi dalla Smart Card
    const efffData = await requestCardEfffData();
    const isTest = isTestSmartCard(efffData.systemId);
    const environment = getSiaeEnvironment(efffData.systemId);
    
    res.json({
      source: 'smartcard',
      data: efffData,
      isTestCard: isTest,
      environment,
      siaeEmailTarget: efffData.siaeEmail || (isTest ? 'servertest2@batest.siae.it' : 'server@ba.siae.it')
    });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to read EFFF from card:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.message.split(':')[0] || 'EFFF_ERROR'
    });
  }
});

// ==================== SIAE Environment Detection Endpoint ====================
router.get("/api/siae/environment", requireAuth, async (req: Request, res: Response) => {
  try {
    const { getCachedEfffData, isBridgeConnected, isCardReadyForSeals } = await import('./bridge-relay');
    const { isTestSmartCard, getSiaeEnvironment, getSiaeEmailForEnvironment } = await import('./siae-utils');
    
    const bridgeConnected = isBridgeConnected();
    const cardReady = isCardReadyForSeals();
    const cached = getCachedEfffData();
    
    let environment: 'test' | 'production' | 'unknown' = 'unknown';
    let siaeEmail: string | null = null;
    let systemId: string | null = null;
    
    if (cached?.systemId) {
      systemId = cached.systemId;
      environment = getSiaeEnvironment(systemId);
      siaeEmail = cached.siaeEmail || getSiaeEmailForEnvironment(systemId);
    } else if (process.env.SIAE_TEST_MODE === 'true') {
      environment = 'test';
      siaeEmail = 'servertest2@batest.siae.it';
    }
    
    res.json({
      environment,
      isTestMode: environment === 'test',
      bridgeConnected,
      cardReady: cardReady.ready,
      cardError: cardReady.error,
      systemId,
      siaeEmail,
      description: environment === 'test' 
        ? 'Ambiente di TEST - Smart Card con prefisso P nel systemId'
        : environment === 'production'
          ? 'Ambiente di PRODUZIONE - Smart Card ufficiale'
          : 'Ambiente non determinato - inserire Smart Card'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TAB.1-5 Reference Tables (Super Admin) ====================

// Event Genres (TAB.1)
router.get("/api/siae/event-genres", async (req: Request, res: Response) => {
  try {
    const genres = await siaeStorage.getSiaeEventGenres();
    res.json(genres);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/event-genres", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeEventGenreSchema.parse(req.body);
    const genre = await siaeStorage.createSiaeEventGenre(data);
    res.status(201).json(genre);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/event-genres/:code", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = patchEventGenreSchema.parse(req.body);
    const genre = await siaeStorage.updateSiaeEventGenre(req.params.code, data);
    if (!genre) {
      return res.status(404).json({ message: "Genere evento non trovato" });
    }
    res.json(genre);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Imposta IVA standard su tutti i generi (normativa italiana)
router.post("/api/siae/event-genres/set-standard-vat", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    // Aliquote IVA standard secondo normativa italiana:
    // - Spettacolo (S): 10%
    // - Intrattenimento (I): 22%
    const genres = await siaeStorage.getSiaeEventGenres();
    let updated = 0;
    
    for (const genre of genres) {
      const standardVat = genre.taxType === 'S' ? 10 : 22;
      // Aggiorna solo se vatRate è null/undefined o diverso dallo standard
      if (genre.vatRate === null || genre.vatRate === undefined || Number(genre.vatRate) !== standardVat) {
        await siaeStorage.updateSiaeEventGenre(genre.code, { vatRate: String(standardVat) });
        updated++;
      }
    }
    
    res.json({ 
      message: `Aggiornati ${updated} generi con aliquote IVA standard`,
      updated,
      total: genres.length
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Sector Codes (TAB.2)
router.get("/api/siae/sector-codes", async (req: Request, res: Response) => {
  try {
    const sectors = await siaeStorage.getSiaeSectorCodes();
    res.json(sectors);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/sector-codes", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeSectorCodeSchema.parse(req.body);
    const sector = await siaeStorage.createSiaeSectorCode(data);
    res.status(201).json(sector);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/sector-codes/:code", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = patchSectorCodeSchema.parse(req.body);
    const sector = await siaeStorage.updateSiaeSectorCode(req.params.code, data);
    if (!sector) {
      return res.status(404).json({ message: "Codice settore non trovato" });
    }
    res.json(sector);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Ticket Types (TAB.3)
router.get("/api/siae/ticket-types", async (req: Request, res: Response) => {
  try {
    const types = await siaeStorage.getSiaeTicketTypes();
    res.json(types);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/ticket-types", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeTicketTypeSchema.parse(req.body);
    const ticketType = await siaeStorage.createSiaeTicketType(data);
    res.status(201).json(ticketType);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/ticket-types/:code", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = patchTicketTypeSchema.parse(req.body);
    const ticketType = await siaeStorage.updateSiaeTicketType(req.params.code, data);
    if (!ticketType) {
      return res.status(404).json({ message: "Tipo biglietto non trovato" });
    }
    res.json(ticketType);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Service Codes (TAB.4)
router.get("/api/siae/service-codes", async (req: Request, res: Response) => {
  try {
    const services = await siaeStorage.getSiaeServiceCodes();
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/service-codes", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeServiceCodeSchema.parse(req.body);
    const service = await siaeStorage.createSiaeServiceCode(data);
    res.status(201).json(service);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/service-codes/:code", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = patchServiceCodeSchema.parse(req.body);
    const service = await siaeStorage.updateSiaeServiceCode(req.params.code, data);
    if (!service) {
      return res.status(404).json({ message: "Codice servizio non trovato" });
    }
    res.json(service);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Cancellation Reasons (TAB.5)
router.get("/api/siae/cancellation-reasons", async (req: Request, res: Response) => {
  try {
    const reasons = await siaeStorage.getSiaeCancellationReasons();
    res.json(reasons);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/cancellation-reasons", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeCancellationReasonSchema.parse(req.body);
    const reason = await siaeStorage.createSiaeCancellationReason(data);
    res.status(201).json(reason);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/cancellation-reasons/:code", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = patchCancellationReasonSchema.parse(req.body);
    const reason = await siaeStorage.updateSiaeCancellationReason(req.params.code, data);
    if (!reason) {
      return res.status(404).json({ message: "Causale annullamento non trovata" });
    }
    res.json(reason);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== Export CSV Tabelle Codificate SIAE ====================

// Helper function to convert data to CSV format
function toCSV(data: any[], columns: { key: string; header: string }[]): string {
  const headers = columns.map(c => c.header).join(';');
  const rows = data.map(item => 
    columns.map(c => {
      const value = item[c.key];
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      if (strValue.includes(';') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(';')
  );
  return [headers, ...rows].join('\n');
}

// Export Event Genres (TAB.1) as CSV
router.get("/api/siae/event-genres/export/csv", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const genres = await siaeStorage.getSiaeEventGenres();
    const csv = toCSV(genres, [
      { key: 'code', header: 'Codice' },
      { key: 'name', header: 'Nome' },
      { key: 'description', header: 'Descrizione' },
      { key: 'taxType', header: 'Tipo Imposta' },
      { key: 'vatRate', header: 'Aliquota IVA %' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="siae_generi_evento.csv"');
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Export Sector Codes (TAB.2) as CSV
router.get("/api/siae/sector-codes/export/csv", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const sectors = await siaeStorage.getSiaeSectorCodes();
    const csv = toCSV(sectors, [
      { key: 'code', header: 'Codice' },
      { key: 'name', header: 'Nome' },
      { key: 'description', header: 'Descrizione' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="siae_codici_settore.csv"');
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Export Ticket Types (TAB.3) as CSV
router.get("/api/siae/ticket-types/export/csv", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const types = await siaeStorage.getSiaeTicketTypes();
    const csv = toCSV(types, [
      { key: 'code', header: 'Codice' },
      { key: 'name', header: 'Nome' },
      { key: 'category', header: 'Categoria' },
      { key: 'description', header: 'Descrizione' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="siae_tipi_biglietto.csv"');
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Export Service Codes (TAB.4) as CSV
router.get("/api/siae/service-codes/export/csv", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const services = await siaeStorage.getSiaeServiceCodes();
    const csv = toCSV(services, [
      { key: 'code', header: 'Codice' },
      { key: 'name', header: 'Nome' },
      { key: 'description', header: 'Descrizione' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="siae_codici_servizio.csv"');
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Export Cancellation Reasons (TAB.5) as CSV
router.get("/api/siae/cancellation-reasons/export/csv", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const reasons = await siaeStorage.getSiaeCancellationReasons();
    const csv = toCSV(reasons, [
      { key: 'code', header: 'Codice' },
      { key: 'name', header: 'Nome' },
      { key: 'description', header: 'Descrizione' },
      { key: 'refundRequired', header: 'Rimborso Richiesto' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="siae_causali_annullamento.csv"');
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Export all reference tables as a single ZIP (optional future enhancement)
// For now, each table has its own export endpoint

// ==================== Activation Cards (Super Admin) ====================

router.get("/api/siae/activation-cards", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const cards = await siaeStorage.getSiaeActivationCards();
    res.json(cards);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/companies/:companyId/activation-cards", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const cards = await siaeStorage.getSiaeActivationCardsByCompany(req.params.companyId);
    res.json(cards);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/activation-cards/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const card = await siaeStorage.getSiaeActivationCard(req.params.id);
    if (!card) {
      return res.status(404).json({ message: "Carta di attivazione non trovata" });
    }
    res.json(card);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/activation-cards", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeActivationCardSchema.parse(req.body);
    const card = await siaeStorage.createSiaeActivationCard(data);
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: card.companyId || user.companyId,
      userId: user.id,
      action: 'activation_card_created',
      entityType: 'activation_card',
      entityId: card.id,
      description: `Carta di attivazione creata: ${card.cardCode}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(card);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/activation-cards/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = patchActivationCardSchema.parse(req.body);
    const card = await siaeStorage.updateSiaeActivationCard(req.params.id, data);
    if (!card) {
      return res.status(404).json({ message: "Carta di attivazione non trovata" });
    }
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: card.companyId || user.companyId,
      userId: user.id,
      action: 'activation_card_updated',
      entityType: 'activation_card',
      entityId: card.id,
      description: `Carta di attivazione aggiornata: ${card.cardCode}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(card);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Get usage statistics for activation card (which organizers used it)
router.get("/api/siae/activation-cards/:id/usage", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const card = await siaeStorage.getSiaeActivationCard(req.params.id);
    if (!card) {
      return res.status(404).json({ message: "Carta di attivazione non trovata" });
    }
    const stats = await siaeStorage.getActivationCardUsageStats(req.params.id);
    res.json({ card, ...stats });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get activation card by serial (matching physical card) - always returns 200 with structured response
router.get("/api/siae/activation-cards/by-serial/:serial", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    console.log(`[ACTIVATION-CARDS] Looking up card by serial: ${req.params.serial}`);
    const card = await siaeStorage.getActivationCardBySerial(req.params.serial);
    console.log(`[ACTIVATION-CARDS] Card found:`, card ? card.id : 'null');
    if (!card) {
      // Return structured response even when card not found
      return res.json({ 
        card: null, 
        totalSeals: 0, 
        totalTickets: 0, 
        organizers: [],
        notFound: true
      });
    }
    console.log(`[ACTIVATION-CARDS] Getting usage stats for card: ${card.id}`);
    const stats = await siaeStorage.getActivationCardUsageStats(card.id);
    console.log(`[ACTIVATION-CARDS] Stats:`, stats);
    res.json({ card, ...stats, notFound: false });
  } catch (error: any) {
    console.error(`[ACTIVATION-CARDS] Error:`, error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== Emission Channels (Gestore) ====================

router.get("/api/siae/companies/:companyId/emission-channels", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const channels = await siaeStorage.getSiaeEmissionChannelsByCompany(req.params.companyId);
    res.json(channels);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/emission-channels/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const channel = await siaeStorage.getSiaeEmissionChannel(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: "Canale di emissione non trovato" });
    }
    res.json(channel);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/emission-channels", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeEmissionChannelSchema.parse(req.body);
    const channel = await siaeStorage.createSiaeEmissionChannel(data);
    res.status(201).json(channel);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/emission-channels/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const data = patchEmissionChannelSchema.parse(req.body);
    const channel = await siaeStorage.updateSiaeEmissionChannel(req.params.id, data);
    if (!channel) {
      return res.status(404).json({ message: "Canale di emissione non trovato" });
    }
    res.json(channel);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== System Configuration (Globale - Gestore) ====================

// Nuove route globali per configurazione unica
router.get("/api/siae/config", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const config = await siaeStorage.getGlobalSiaeSystemConfig();
    res.json(config || null);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/api/siae/config", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeSystemConfigSchema.parse(req.body);
    const config = await siaeStorage.upsertGlobalSiaeSystemConfig(data);
    res.json(config);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// SIAE Environment Configuration endpoint
router.get("/api/siae/environment", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    res.json({
      testMode: SIAE_TEST_MODE,
      testEmail: SIAE_TEST_EMAIL,
      destinationEmail: getSiaeDestinationEmail(),
      environment: SIAE_TEST_MODE ? 'test' : 'production',
      environmentLabel: SIAE_TEST_MODE ? 'Ambiente di Test SIAE' : 'Ambiente di Produzione SIAE',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Route legacy per compatibilità (reindirizza alla config globale)
router.get("/api/siae/companies/:companyId/config", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const config = await siaeStorage.getGlobalSiaeSystemConfig();
    res.json(config || null);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/api/siae/companies/:companyId/config", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeSystemConfigSchema.parse(req.body);
    const config = await siaeStorage.upsertGlobalSiaeSystemConfig(data);
    res.json(config);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== Customers (Public - for registration) ====================

// Endpoint per ottenere i clienti filtrati per evento e company del gestore
router.get("/api/siae/customers", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.query;
    
    // Super admin può vedere tutti i clienti
    if (user.role === 'super_admin') {
      const customers = await siaeStorage.getSiaeCustomers();
      return res.json(customers);
    }
    
    // Gestore deve avere una companyId
    if (!user.companyId) {
      return res.status(403).json({ message: "Nessuna azienda associata" });
    }
    
    // Se viene fornito un eventId, restituisci solo i clienti che hanno acquistato biglietti per quell'evento
    if (eventId && typeof eventId === 'string') {
      // Verifica che l'evento appartenga alla company del gestore
      const [ticketedEvent] = await db
        .select()
        .from(siaeTicketedEvents)
        .where(and(
          eq(siaeTicketedEvents.id, eventId),
          eq(siaeTicketedEvents.companyId, user.companyId)
        ));
      
      if (!ticketedEvent) {
        return res.status(403).json({ message: "Evento non trovato o non autorizzato" });
      }
      
      // Ottieni i clienti che hanno acquistato biglietti per questo evento
      const customersWithTickets = await db
        .selectDistinct({
          id: siaeCustomers.id,
          uniqueCode: siaeCustomers.uniqueCode,
          firstName: siaeCustomers.firstName,
          lastName: siaeCustomers.lastName,
          email: siaeCustomers.email,
          phone: siaeCustomers.phone,
          phoneVerified: siaeCustomers.phoneVerified,
          emailVerified: siaeCustomers.emailVerified,
          isActive: siaeCustomers.isActive,
          blockedUntil: siaeCustomers.blockedUntil,
          blockReason: siaeCustomers.blockReason,
          birthDate: siaeCustomers.birthDate,
          birthPlace: siaeCustomers.birthPlace,
          registrationCompleted: siaeCustomers.registrationCompleted,
          createdAt: siaeCustomers.createdAt,
          updatedAt: siaeCustomers.updatedAt,
        })
        .from(siaeCustomers)
        .innerJoin(siaeTickets, eq(siaeTickets.customerId, siaeCustomers.id))
        .where(eq(siaeTickets.ticketedEventId, eventId))
        .orderBy(desc(siaeCustomers.createdAt));
      
      return res.json(customersWithTickets);
    }
    
    // Senza eventId, restituisci tutti i clienti che hanno acquistato biglietti per eventi della company
    const customersForCompany = await db
      .selectDistinct({
        id: siaeCustomers.id,
        uniqueCode: siaeCustomers.uniqueCode,
        firstName: siaeCustomers.firstName,
        lastName: siaeCustomers.lastName,
        email: siaeCustomers.email,
        phone: siaeCustomers.phone,
        phoneVerified: siaeCustomers.phoneVerified,
        emailVerified: siaeCustomers.emailVerified,
        isActive: siaeCustomers.isActive,
        blockedUntil: siaeCustomers.blockedUntil,
        blockReason: siaeCustomers.blockReason,
        birthDate: siaeCustomers.birthDate,
        birthPlace: siaeCustomers.birthPlace,
        registrationCompleted: siaeCustomers.registrationCompleted,
        createdAt: siaeCustomers.createdAt,
        updatedAt: siaeCustomers.updatedAt,
      })
      .from(siaeCustomers)
      .innerJoin(siaeTickets, eq(siaeTickets.customerId, siaeCustomers.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(siaeTicketedEvents.companyId, user.companyId))
      .orderBy(desc(siaeCustomers.createdAt));
    
    res.json(customersForCompany);
  } catch (error: any) {
    console.error("[SIAE] Error fetching customers:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/customers/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const customer = await siaeStorage.getSiaeCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/customers", async (req: Request, res: Response) => {
  try {
    // Check if customer registration is enabled (separate from venue registration)
    const customerRegSetting = await storage.getSystemSetting('customer_registration_enabled');
    if (customerRegSetting && customerRegSetting.value === 'false') {
      return res.status(403).json({ message: "Registrazione clienti temporaneamente disabilitata" });
    }
    
    const data = insertSiaeCustomerSchema.parse(req.body);
    const customer = await siaeStorage.createSiaeCustomer(data);
    
    await siaeStorage.createAuditLog({
      companyId: '', // siaeCustomers doesn't have companyId
      userId: undefined,
      action: 'customer_created',
      entityType: 'customer',
      entityId: customer.id,
      description: `Cliente registrato: ${customer.firstName} ${customer.lastName}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/customers/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = patchCustomerSchema.parse(req.body);
    const customer = await siaeStorage.updateSiaeCustomer(req.params.id, data);
    if (!customer) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: user.companyId, // siaeCustomers doesn't have companyId
      userId: user.id,
      action: 'customer_updated',
      entityType: 'customer',
      entityId: customer.id,
      description: `Cliente aggiornato: ${customer.firstName} ${customer.lastName}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Verifica manuale cliente (admin bypass OTP)
router.post("/api/siae/customers/:id/verify-manual", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const customer = await siaeStorage.getSiaeCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    // Aggiorna il cliente come verificato
    const updated = await siaeStorage.updateSiaeCustomer(req.params.id, {
      phoneVerified: true,
      isActive: true,
    });
    
    // Pulisci tutti gli OTP pendenti per questo telefono
    if (customer.phone) {
      await siaeStorage.markSiaeOtpVerifiedByPhone(customer.phone);
    }
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: user.companyId, // siaeCustomers doesn't have companyId
      userId: user.id,
      action: 'customer_verified_manual',
      entityType: 'customer',
      entityId: customer.id,
      description: `Cliente verificato manualmente: ${customer.firstName} ${customer.lastName}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({ 
      message: "Cliente verificato manualmente con successo",
      customer: updated 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Elimina cliente
router.delete("/api/siae/customers/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  console.log("[SIAE] Delete customer request:", req.params.id, "force:", req.query.force);
  try {
    const customer = await siaeStorage.getSiaeCustomer(req.params.id);
    if (!customer) {
      console.log("[SIAE] Customer not found:", req.params.id);
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    const forceDelete = req.query.force === 'true';
    console.log("[SIAE] Force delete:", forceDelete);
    
    // Verifica se ci sono record collegati
    const [hasTickets] = await db.select({ count: sql<number>`count(*)` })
      .from(siaeTickets)
      .where(eq(siaeTickets.customerId, req.params.id));
    
    const [hasTransactions] = await db.select({ count: sql<number>`count(*)` })
      .from(siaeTransactions)
      .where(eq(siaeTransactions.customerId, req.params.id));
    
    const [hasSubscriptions] = await db.select({ count: sql<number>`count(*)` })
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.customerId, req.params.id));
    
    const ticketCount = Number(hasTickets?.count) || 0;
    const transactionCount = Number(hasTransactions?.count) || 0;
    const subscriptionCount = Number(hasSubscriptions?.count) || 0;
    
    if ((ticketCount > 0 || transactionCount > 0 || subscriptionCount > 0) && !forceDelete) {
      return res.status(409).json({ 
        message: `Questo cliente ha ${ticketCount} biglietti, ${transactionCount} transazioni e ${subscriptionCount} abbonamenti. Usa l'opzione "Elimina comunque" per procedere.`,
        canForceDelete: true,
        details: { ticketCount, transactionCount, subscriptionCount }
      });
    }
    
    // Se force delete, prima rimuovi tutti i record associati
    if (forceDelete) {
      console.log("[SIAE] Force delete: cleaning up all associated records");
      
      // Anonimizza i biglietti (non li eliminiamo per integrità fiscale)
      await db.update(siaeTickets)
        .set({ customerId: null })
        .where(eq(siaeTickets.customerId, req.params.id));
      
      // Elimina le transazioni (customerId è notNull)
      await db.delete(siaeTransactions)
        .where(eq(siaeTransactions.customerId, req.params.id));
      
      // Elimina abbonamenti (customerId è notNull)
      await db.delete(siaeSubscriptions)
        .where(eq(siaeSubscriptions.customerId, req.params.id));
      
      // Elimina tentativi OTP
      await db.delete(siaeOtpAttempts)
        .where(eq(siaeOtpAttempts.customerId, req.params.id));
      
      // Elimina resales dove è seller (sellerId è notNull)
      await db.delete(siaeResales)
        .where(eq(siaeResales.sellerId, req.params.id));
      // Anonimizza resales dove è buyer (buyerId è nullable)
      await db.update(siaeResales)
        .set({ buyerId: null })
        .where(eq(siaeResales.buyerId, req.params.id));
      
      // Elimina cart items
      await db.delete(publicCartItems)
        .where(eq(publicCartItems.customerId, req.params.id));
      
      // Elimina checkout sessions
      await db.delete(publicCheckoutSessions)
        .where(eq(publicCheckoutSessions.customerId, req.params.id));
      
      // Elimina customer sessions
      await db.delete(publicCustomerSessions)
        .where(eq(publicCustomerSessions.customerId, req.params.id));
      
      // Anonimizza table bookings
      await db.update(tableBookings)
        .set({ customerId: null })
        .where(eq(tableBookings.customerId, req.params.id));
      
      // Anonimizza guest list entries
      await db.update(guestListEntries)
        .set({ customerId: null })
        .where(eq(guestListEntries.customerId, req.params.id));
      
      console.log("[SIAE] Force delete: all associated records cleaned up");
    }
    
    console.log("[SIAE] Proceeding with delete for customer:", customer.id);
    const deleted = await siaeStorage.deleteSiaeCustomer(req.params.id);
    console.log("[SIAE] Delete result:", deleted);
    if (!deleted) {
      return res.status(500).json({ message: "Errore durante l'eliminazione" });
    }
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: user.companyId, // siaeCustomers doesn't have companyId
      userId: user.id,
      action: 'customer_deleted',
      entityType: 'customer',
      entityId: req.params.id,
      description: `Cliente eliminato: ${customer.firstName} ${customer.lastName}${forceDelete ? ' (forzato)' : ''}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    console.log("[SIAE] Customer deleted successfully:", req.params.id);
    res.json({ message: "Cliente eliminato con successo" });
  } catch (error: any) {
    console.error("[SIAE] Delete customer error:", error);
    // Gestisci errori di vincolo FK
    if (error.code === '23503') { // PostgreSQL foreign key violation
      return res.status(409).json({ 
        message: "Impossibile eliminare il cliente: ha record associati nel sistema.",
        canForceDelete: true
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// ==================== OTP Verification (Public) ====================

// OTP request validation schema
const otpSendSchema = z.object({
  phone: z.string().min(8).max(20).regex(/^\+?[0-9]+$/, "Formato telefono non valido"),
  purpose: z.enum(['registration', 'login', 'verification']).default('registration'),
});

const otpVerifySchema = z.object({
  phone: z.string().min(8).max(20),
  otpCode: z.string().length(6).regex(/^[0-9]+$/, "OTP deve essere 6 cifre"),
});

// Simple in-memory rate limiter for OTP requests
const otpRateLimiter = new Map<string, { count: number; resetAt: number }>();
const OTP_RATE_LIMIT = 3; // max requests per window
const OTP_RATE_WINDOW = 60 * 1000; // 1 minute window

function checkOtpRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = otpRateLimiter.get(phone);
  
  if (!entry || now > entry.resetAt) {
    otpRateLimiter.set(phone, { count: 1, resetAt: now + OTP_RATE_WINDOW });
    return true;
  }
  
  if (entry.count >= OTP_RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Generate cryptographically stronger OTP using crypto
function generateSecureOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

router.post("/api/siae/otp/send", async (req: Request, res: Response) => {
  try {
    const data = otpSendSchema.parse(req.body);
    
    // Check rate limit
    if (!checkOtpRateLimit(data.phone)) {
      return res.status(429).json({ message: "Troppi tentativi. Riprova tra un minuto." });
    }
    
    // Use MSG91 SMS Flow if configured, otherwise fallback to local OTP generation
    if (isMSG91Configured()) {
      console.log(`[SIAE OTP] Using MSG91 SMS Flow for ${data.phone}`);
      const result = await sendMSG91OTP(data.phone, 10); // 10 minutes expiry
      
      if (!result.success) {
        console.error(`[SIAE OTP] MSG91 failed: ${result.message}`);
        return res.status(500).json({ message: result.message });
      }
      
      // Store OTP code in DB (generated locally, sent via MSG91 SMS)
      await siaeStorage.createSiaeOtpAttempt({
        phone: data.phone,
        otpCode: result.otpCode!, // Store the actual OTP code for local verification
        purpose: data.purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      
      res.json({ message: "OTP inviato con successo", expiresIn: 600, provider: "msg91" });
    } else {
      // Fallback: Generate local OTP (for testing/development)
      const otpCode = generateSecureOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      await siaeStorage.createSiaeOtpAttempt({
        phone: data.phone,
        otpCode,
        purpose: data.purpose,
        expiresAt,
      });
      
      console.log(`[SIAE OTP] Local mode - Phone: ${data.phone}, OTP: ${otpCode}`);
      res.json({ message: "OTP inviato con successo", expiresIn: 300, provider: "local" });
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/otp/verify", async (req: Request, res: Response) => {
  try {
    const data = otpVerifySchema.parse(req.body);
    
    // Local OTP verification (code is stored in DB, sent via MSG91 SMS Flow)
    console.log(`[SIAE OTP] Verifying OTP for ${data.phone}`);
    
    // Fallback: Local OTP verification
    const attempt = await siaeStorage.getSiaeOtpAttempt(data.phone, data.otpCode);
    if (!attempt) {
      return res.status(400).json({ message: "OTP non valido" });
    }
    
    // Explicit check: must be in 'pending' status (not already verified or failed)
    if (attempt.status !== 'pending') {
      return res.status(400).json({ 
        message: attempt.status === 'verified' ? "OTP già utilizzato" : "OTP non valido" 
      });
    }
    
    // Explicit check: must not be expired
    if (!attempt.expiresAt || new Date() > attempt.expiresAt) {
      return res.status(400).json({ message: "OTP scaduto. Richiedi un nuovo codice." });
    }
    
    // All checks passed - mark as verified
    await siaeStorage.markSiaeOtpVerified(attempt.id);
    
    // Check if customer exists with this phone
    let customer = await siaeStorage.getSiaeCustomerByPhone(data.phone);
    
    res.json({ 
      verified: true, 
      customerId: customer?.id,
      isNewCustomer: !customer,
      provider: "local"
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
});

// Resend OTP endpoint
router.post("/api/siae/otp/resend", async (req: Request, res: Response) => {
  try {
    const { phone, retryType = 'text' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: "Numero di telefono richiesto" });
    }
    
    // Check rate limit
    if (!checkOtpRateLimit(phone)) {
      return res.status(429).json({ message: "Troppi tentativi. Riprova tra un minuto." });
    }
    
    if (isMSG91Configured()) {
      console.log(`[SIAE OTP] Resending via MSG91 SMS Flow to ${phone}`);
      const result = await resendMSG91OTP(phone, retryType as 'text' | 'voice');
      
      if (!result.success) {
        console.error(`[SIAE OTP] MSG91 resend failed: ${result.message}`);
        return res.status(500).json({ message: result.message });
      }
      
      // Store the new OTP code in DB
      await siaeStorage.createSiaeOtpAttempt({
        phone: phone,
        otpCode: result.otpCode!,
        purpose: "registration",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      
      res.json({ message: "OTP reinviato con successo", provider: "msg91" });
    } else {
      // For local mode, generate a new OTP instead
      return res.status(400).json({ message: "Reinvio disponibile solo con MSG91 configurato" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Ticketed Events (Organizer) ====================

// Admin endpoint: Get all ticketed events across all companies (Super Admin only)
router.get("/api/siae/admin/ticketed-events", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const events = await siaeStorage.getAllSiaeTicketedEventsAdmin();
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin endpoint: Get all transactions across all companies with filters (Super Admin only)
router.get("/api/siae/admin/transactions", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId, eventId, status, paymentMethod, page = '1', limit = '50', dateFrom, dateTo, search } = req.query;
    
    // Build query with filters
    let query = db
      .select({
        transaction: siaeTransactions,
        ticketedEvent: {
          id: siaeTicketedEvents.id,
          eventId: siaeTicketedEvents.eventId,
          companyId: siaeTicketedEvents.companyId,
        },
        event: {
          id: events.id,
          name: events.name,
          startDatetime: events.startDatetime,
        },
        company: {
          id: companies.id,
          name: companies.name,
        },
      })
      .from(siaeTransactions)
      .innerJoin(siaeTicketedEvents, eq(siaeTransactions.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(companies, eq(siaeTicketedEvents.companyId, companies.id));
    
    // Apply filters
    const conditions: any[] = [];
    if (companyId && typeof companyId === 'string') {
      conditions.push(eq(siaeTicketedEvents.companyId, companyId));
    }
    if (eventId && typeof eventId === 'string') {
      conditions.push(eq(siaeTicketedEvents.eventId, eventId));
    }
    if (status && typeof status === 'string') {
      conditions.push(eq(siaeTransactions.status, status));
    }
    if (paymentMethod && typeof paymentMethod === 'string') {
      conditions.push(eq(siaeTransactions.paymentMethod, paymentMethod));
    }
    if (dateFrom && typeof dateFrom === 'string') {
      conditions.push(gte(siaeTransactions.createdAt, new Date(dateFrom)));
    }
    if (dateTo && typeof dateTo === 'string') {
      conditions.push(lte(siaeTransactions.createdAt, new Date(dateTo)));
    }
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      conditions.push(or(
        sql`LOWER(${siaeTransactions.transactionCode}) LIKE ${searchTerm}`,
        sql`LOWER(${siaeTransactions.customerEmail}) LIKE ${searchTerm}`,
        sql`LOWER(${siaeTransactions.customerUniqueCode}) LIKE ${searchTerm}`
      ));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Add ordering and pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = (pageNum - 1) * limitNum;
    
    const results = await query
      .orderBy(desc(siaeTransactions.createdAt))
      .limit(limitNum)
      .offset(offset);
    
    // Get total count for pagination (apply same filters)
    let countQuery = db
      .select({ count: count() })
      .from(siaeTransactions)
      .innerJoin(siaeTicketedEvents, eq(siaeTransactions.ticketedEventId, siaeTicketedEvents.id));
    
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;
    
    // Calculate totals for filtered results
    let totalsQuery = db
      .select({
        totalAmount: sql<string>`COALESCE(SUM(${siaeTransactions.totalAmount}), 0)`,
        ticketsCount: sql<number>`COALESCE(SUM(${siaeTransactions.ticketsCount}), 0)`,
      })
      .from(siaeTransactions)
      .innerJoin(siaeTicketedEvents, eq(siaeTransactions.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(siaeTransactions.status, 'completed'));
    
    if (conditions.length > 0) {
      // Add completed status to existing conditions for totals
      const totalsConditions = [...conditions, eq(siaeTransactions.status, 'completed')];
      totalsQuery = db
        .select({
          totalAmount: sql<string>`COALESCE(SUM(${siaeTransactions.totalAmount}), 0)`,
          ticketsCount: sql<number>`COALESCE(SUM(${siaeTransactions.ticketsCount}), 0)`,
        })
        .from(siaeTransactions)
        .innerJoin(siaeTicketedEvents, eq(siaeTransactions.ticketedEventId, siaeTicketedEvents.id))
        .where(and(...totalsConditions)) as any;
    }
    
    const totalsResult = await totalsQuery;
    
    res.json({
      transactions: results.map(r => ({
        ...r.transaction,
        ticketedEvent: r.ticketedEvent,
        event: r.event,
        company: r.company,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      totals: {
        revenue: totalsResult[0]?.totalAmount || '0',
        tickets: totalsResult[0]?.ticketsCount || 0,
      },
    });
  } catch (error: any) {
    console.error('[ADMIN TRANSACTIONS] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get companies and events for transaction filters
router.get("/api/siae/admin/transactions/filters", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    // Get all companies with transactions
    const companiesWithTransactions = await db
      .selectDistinct({
        id: companies.id,
        name: companies.name,
      })
      .from(siaeTransactions)
      .innerJoin(siaeTicketedEvents, eq(siaeTransactions.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(companies, eq(siaeTicketedEvents.companyId, companies.id))
      .orderBy(companies.name);
    
    // Get all events with transactions
    const eventsWithTransactions = await db
      .selectDistinct({
        id: events.id,
        name: events.name,
        companyId: siaeTicketedEvents.companyId,
      })
      .from(siaeTransactions)
      .innerJoin(siaeTicketedEvents, eq(siaeTransactions.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .orderBy(events.name);
    
    res.json({
      companies: companiesWithTransactions,
      events: eventsWithTransactions,
      statuses: ['completed', 'pending', 'failed', 'refunded'],
      paymentMethods: ['card', 'cash', 'bank_transfer', 'paypal'],
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get ticketing info by event ID (used by event-hub)
router.get("/api/siae/events/:eventId/ticketing", requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketedEvent = await siaeStorage.getSiaeTicketedEventByEventId(req.params.eventId);
    if (!ticketedEvent) {
      return res.json(null); // No ticketing configured for this event
    }
    // Also get sectors for complete ticketing info
    const sectors = await siaeStorage.getSiaeEventSectors(ticketedEvent.id);
    res.json({ ...ticketedEvent, sectors });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/companies/:companyId/ticketed-events", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const events = await siaeStorage.getSiaeTicketedEventsByCompany(req.params.companyId);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get ticketed events for current user (gestore, cassiere, super_admin)
router.get("/api/siae/ticketed-events", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Super admin sees all events
    if (user.role === 'super_admin') {
      const events = await siaeStorage.getAllSiaeTicketedEventsAdmin();
      return res.json(events);
    }
    
    // For gestore, organizer, cassiere - return events for their company
    if (!user.companyId) {
      return res.json([]);
    }
    
    const events = await siaeStorage.getSiaeTicketedEventsByCompany(user.companyId);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/ticketed-events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const event = await siaeStorage.getSiaeTicketedEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== SIAE Event Approval Routes (Super Admin) ====================

// Get all pending approval events (super_admin only)
router.get("/api/siae/admin/pending-approvals", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const pendingEvents = await db
      .select({
        id: siaeTicketedEvents.id,
        eventId: siaeTicketedEvents.eventId,
        companyId: siaeTicketedEvents.companyId,
        genreCode: siaeTicketedEvents.genreCode,
        totalCapacity: siaeTicketedEvents.totalCapacity,
        ticketingStatus: siaeTicketedEvents.ticketingStatus,
        approvalStatus: siaeTicketedEvents.approvalStatus,
        createdAt: siaeTicketedEvents.createdAt,
        eventName: events.name,
        eventDate: events.startDatetime,
        companyName: companies.name,
      })
      .from(siaeTicketedEvents)
      .leftJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .leftJoin(companies, eq(siaeTicketedEvents.companyId, companies.id))
      .where(or(
        eq(siaeTicketedEvents.approvalStatus, 'pending'),
        isNull(siaeTicketedEvents.approvalStatus)
      ))
      .orderBy(desc(siaeTicketedEvents.createdAt));
    
    res.json(pendingEvents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Approve a SIAE event (super_admin only)
router.post("/api/siae/admin/approve/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const eventId = req.params.id;
    
    // Check current event state
    const [existing] = await db
      .select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, eventId));
    
    if (!existing) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    if (existing.approvalStatus === 'approved') {
      return res.status(400).json({ message: "Evento già approvato" });
    }
    
    const [updated] = await db
      .update(siaeTicketedEvents)
      .set({
        approvalStatus: 'approved',
        approvedBy: user.id,
        approvedAt: new Date(),
        rejectedReason: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(siaeTicketedEvents.id, eventId),
        or(
          eq(siaeTicketedEvents.approvalStatus, 'pending'),
          isNull(siaeTicketedEvents.approvalStatus)
        )
      ))
      .returning();
    
    if (!updated) {
      return res.status(400).json({ message: "Impossibile approvare l'evento. Stato non valido." });
    }
    
    res.json({ message: "Evento approvato con successo", event: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Reject a SIAE event (super_admin only)
router.post("/api/siae/admin/reject/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const eventId = req.params.id;
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: "È richiesta una motivazione per il rifiuto" });
    }
    
    // Check current event state
    const [existing] = await db
      .select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, eventId));
    
    if (!existing) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    if (existing.approvalStatus === 'rejected') {
      return res.status(400).json({ message: "Evento già rifiutato" });
    }
    
    if (existing.approvalStatus === 'approved') {
      return res.status(400).json({ message: "Non è possibile rifiutare un evento già approvato" });
    }
    
    const [updated] = await db
      .update(siaeTicketedEvents)
      .set({
        approvalStatus: 'rejected',
        approvedBy: user.id,
        approvedAt: new Date(),
        rejectedReason: reason.trim(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(siaeTicketedEvents.id, eventId),
        or(
          eq(siaeTicketedEvents.approvalStatus, 'pending'),
          isNull(siaeTicketedEvents.approvalStatus)
        )
      ))
      .returning();
    
    if (!updated) {
      return res.status(400).json({ message: "Impossibile rifiutare l'evento. Stato non valido." });
    }
    
    res.json({ message: "Evento rifiutato", event: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's skipSiaeApproval status
router.get("/api/siae/admin/users/:userId/approval-settings", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const [features] = await db
      .select()
      .from(userFeatures)
      .where(eq(userFeatures.userId, req.params.userId));
    
    res.json({ skipSiaeApproval: features?.skipSiaeApproval || false });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update user's skipSiaeApproval status
router.patch("/api/siae/admin/users/:userId/approval-settings", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { skipSiaeApproval } = req.body;
    const userId = req.params.userId;
    
    // Check if user features exist
    const [existing] = await db
      .select()
      .from(userFeatures)
      .where(eq(userFeatures.userId, userId));
    
    if (existing) {
      await db
        .update(userFeatures)
        .set({ skipSiaeApproval: !!skipSiaeApproval, updatedAt: new Date() })
        .where(eq(userFeatures.userId, userId));
    } else {
      await db.insert(userFeatures).values({
        userId,
        skipSiaeApproval: !!skipSiaeApproval,
      });
    }
    
    res.json({ message: "Impostazioni aggiornate", skipSiaeApproval: !!skipSiaeApproval });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/ticketed-events", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeTicketedEventSchema.parse(req.body);
    const user = req.user as any;
    
    // Apply automatic defaults for entertainment incidence and tax type based on genre
    // User can override these values if they want different settings
    // DPR 640/1972: Generi 60-69 (ballo/discoteca) default to 100% entertainment with 'I' tax type
    const entertainmentIncidence = data.entertainmentIncidence ?? getDefaultEntertainmentIncidence(data.genreCode);
    const taxType = data.taxType ?? getDefaultTaxType(data.genreCode);
    
    // Check if user has skipSiaeApproval flag
    let approvalStatus = 'pending';
    let approvedBy = null;
    let approvedAt = null;
    
    // Super admin events are auto-approved
    if (user.role === 'super_admin') {
      approvalStatus = 'approved';
      approvedBy = user.id;
      approvedAt = new Date();
    } else {
      // Check user features for skipSiaeApproval
      const [features] = await db
        .select()
        .from(userFeatures)
        .where(eq(userFeatures.userId, user.id));
      
      if (features?.skipSiaeApproval) {
        approvalStatus = 'approved';
        approvedBy = user.id;
        approvedAt = new Date();
      }
    }
    
    const event = await siaeStorage.createSiaeTicketedEvent({
      ...data,
      entertainmentIncidence,
      taxType,
      approvalStatus,
      approvedBy,
      approvedAt,
    });
    
    await siaeStorage.createAuditLog({
      companyId: event.companyId || user.companyId,
      userId: user.id,
      action: 'ticketed_event_created',
      entityType: 'ticketed_event',
      entityId: event.id,
      description: `Evento biglietteria creato (eventId: ${event.eventId})`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(event);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/ticketed-events/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    // Strip readonly/computed fields that frontend might send but aren't in the schema
    // Also strip approval-related fields - these can only be changed by super_admin via dedicated routes
    const { 
      id: _id, 
      companyId: _companyId, 
      createdAt: _createdAt, 
      updatedAt: _updatedAt, 
      sectors: _sectors, 
      event: _event,
      approvalStatus: _approvalStatus,
      approvedBy: _approvedBy,
      approvedAt: _approvedAt,
      rejectedReason: _rejectedReason,
      ...patchData 
    } = req.body;
    const data = patchTicketedEventSchema.parse(patchData);
    
    // Check if trying to activate an unapproved event
    if (data.ticketingStatus === 'active') {
      const [existingEvent] = await db
        .select()
        .from(siaeTicketedEvents)
        .where(eq(siaeTicketedEvents.id, req.params.id));
      
      if (existingEvent && existingEvent.approvalStatus !== 'approved') {
        return res.status(400).json({ 
          message: "Non è possibile attivare un evento non ancora approvato. L'evento deve essere prima approvato dall'amministratore." 
        });
      }
    }
    
    const event = await siaeStorage.updateSiaeTicketedEvent(req.params.id, data);
    if (!event) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: event.companyId || user.companyId,
      userId: user.id,
      action: 'ticketed_event_updated',
      entityType: 'ticketed_event',
      entityId: event.id,
      description: `Evento biglietteria aggiornato (eventId: ${event.eventId})`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(event);
  } catch (error: any) {
    console.log("[SIAE PATCH] Error:", error.message);
    res.status(400).json({ message: error.message });
  }
});

// Update event public info (image and description)
router.patch("/api/siae/ticketed-events/:id/public-info", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { description, imageUrl } = req.body;
    
    // Get the ticketed event to find the associated event
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(req.params.id);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    
    // Update the base event with description and imageUrl
    const [updated] = await db
      .update(events)
      .set({
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, ticketedEvent.eventId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    res.json({ 
      message: "Informazioni pubbliche aggiornate",
      description: updated.description,
      imageUrl: updated.imageUrl
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Get event public info
router.get("/api/siae/ticketed-events/:id/public-info", requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(req.params.id);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    
    const [event] = await db
      .select({ description: events.description, imageUrl: events.imageUrl })
      .from(events)
      .where(eq(events.id, ticketedEvent.eventId));
    
    res.json(event || { description: null, imageUrl: null });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Event Postponement & Cancellation (SIAE Compliance) ====================

/**
 * Posticipa un evento SIAE
 * Normativa: 
 * - Intrattenimento: biglietti validi se rinvio ≤90gg
 * - Spettacolo: biglietti validi se rinvio ≤12 mesi
 * I biglietti già venduti mantengono il sigillo fiscale originale
 */
router.post("/api/siae/ticketed-events/:id/postpone", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { newEventDate, reason } = req.body;
    const user = req.user as any;
    
    if (!newEventDate) {
      return res.status(400).json({ message: "Nuova data evento obbligatoria" });
    }
    
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(req.params.id);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    
    // Validate event status - cannot postpone cancelled events
    if (ticketedEvent.eventStatus === 'cancelled') {
      return res.status(400).json({ message: "Impossibile posticipare un evento già annullato" });
    }
    
    // Get the base event to check current date
    const [baseEvent] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
    if (!baseEvent) {
      return res.status(404).json({ message: "Evento base non trovato" });
    }
    
    const originalDate = ticketedEvent.originalEventDate || baseEvent.eventDate;
    const newDate = new Date(newEventDate);
    
    // Calculate days difference
    const daysDiff = Math.ceil((newDate.getTime() - new Date(originalDate!).getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine limit based on genre (60-69 = intrattenimento = 90gg, altri = spettacolo = 365gg)
    const genreCode = parseInt(ticketedEvent.genreCode || '0', 10);
    const isEntertainment = genreCode >= 60 && genreCode <= 69;
    const maxDays = isEntertainment ? 90 : 365;
    
    // Enforce limit unless forceOverride is provided
    const { forceOverride } = req.body;
    if (daysDiff > maxDays && !forceOverride) {
      return res.status(400).json({ 
        message: `Il rinvio supera ${maxDays} giorni (${isEntertainment ? 'intrattenimento' : 'spettacolo'}). I biglietti venduti dovranno essere rimborsati o riemessi con nuovo sigillo. Usare forceOverride per procedere comunque.`,
        exceedsLimit: true,
        daysDifference: daysDiff,
        maxAllowedDays: maxDays,
        requiresReissue: true
      });
    }
    
    let warning = null;
    if (daysDiff > maxDays && forceOverride) {
      warning = `Rinvio forzato oltre ${maxDays} giorni. I biglietti venduti dovranno essere rimborsati o riemessi con nuovo sigillo.`;
    }
    
    // Update the base event date
    await db.update(events)
      .set({ 
        eventDate: newDate,
        updatedAt: new Date()
      })
      .where(eq(events.id, ticketedEvent.eventId));
    
    // Update ticketed event with postponement info
    const [updatedEvent] = await db.update(siaeTicketedEvents)
      .set({
        eventStatus: 'postponed',
        originalEventDate: ticketedEvent.originalEventDate || originalDate,
        postponedAt: new Date(),
        postponementReason: reason || null,
        updatedAt: new Date()
      })
      .where(eq(siaeTicketedEvents.id, req.params.id))
      .returning();
    
    // Count tickets affected
    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(siaeTickets)
      .where(and(
        eq(siaeTickets.ticketedEventId, req.params.id),
        sql`${siaeTickets.status} NOT IN ('cancelled', 'refunded')`
      ));
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: ticketedEvent.companyId,
      userId: user.id,
      action: 'event_postponed',
      entityType: 'ticketed_event',
      entityId: req.params.id,
      description: `Evento posticipato da ${originalDate} a ${newDate.toISOString()}. ${ticketCount?.count || 0} biglietti interessati.`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      event: updatedEvent,
      ticketsAffected: ticketCount?.count || 0,
      daysDifference: daysDiff,
      maxAllowedDays: maxDays,
      exceedsLimit: daysDiff > maxDays,
      warning,
      message: warning 
        ? `Evento posticipato. ${warning}` 
        : `Evento posticipato con successo. I ${ticketCount?.count || 0} biglietti venduti restano validi con il sigillo originale.`
    });
  } catch (error: any) {
    console.error('[POSTPONE EVENT] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Annulla un evento SIAE
 * Normativa: tutti i biglietti devono essere rimborsati
 */
router.post("/api/siae/ticketed-events/:id/cancel", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { reason, refundDeadlineDays = 30 } = req.body;
    const user = req.user as any;
    
    if (!reason) {
      return res.status(400).json({ message: "Motivo annullamento obbligatorio" });
    }
    
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(req.params.id);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    
    // Validate event status - cannot cancel already cancelled events
    if (ticketedEvent.eventStatus === 'cancelled') {
      return res.status(400).json({ message: "Evento già annullato" });
    }
    
    // Calculate refund deadline
    const refundDeadline = new Date();
    refundDeadline.setDate(refundDeadline.getDate() + refundDeadlineDays);
    
    // Update ticketed event
    const [updatedEvent] = await db.update(siaeTicketedEvents)
      .set({
        eventStatus: 'cancelled',
        ticketingStatus: 'closed',
        cancelledAt: new Date(),
        cancellationReason: reason,
        refundDeadline,
        updatedAt: new Date()
      })
      .where(eq(siaeTicketedEvents.id, req.params.id))
      .returning();
    
    // Get all tickets that need refund
    const ticketsToRefund = await db
      .select()
      .from(siaeTickets)
      .where(and(
        eq(siaeTickets.ticketedEventId, req.params.id),
        sql`${siaeTickets.status} NOT IN ('cancelled', 'refunded')`
      ));
    
    // Calculate total refund amount
    const totalRefundAmount = ticketsToRefund.reduce((sum, t) => sum + Number(t.grossPrice || 0), 0);
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: ticketedEvent.companyId,
      userId: user.id,
      action: 'event_cancelled',
      entityType: 'ticketed_event',
      entityId: req.params.id,
      description: `Evento annullato. Motivo: ${reason}. ${ticketsToRefund.length} biglietti da rimborsare per €${totalRefundAmount.toFixed(2)}.`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      event: updatedEvent,
      ticketsToRefund: ticketsToRefund.length,
      totalRefundAmount,
      refundDeadline,
      message: `Evento annullato. ${ticketsToRefund.length} biglietti da rimborsare entro il ${refundDeadline.toLocaleDateString('it-IT')}.`
    });
  } catch (error: any) {
    console.error('[CANCEL EVENT] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Ottieni lista biglietti da rimborsare per evento annullato
 */
router.get("/api/siae/ticketed-events/:id/refund-list", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(req.params.id);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    
    if (ticketedEvent.eventStatus !== 'cancelled') {
      return res.status(400).json({ message: "L'evento non è stato annullato" });
    }
    
    // Get all tickets pending refund
    const ticketsToRefund = await db
      .select({
        ticket: siaeTickets,
        customer: siaeCustomers,
        transaction: siaeTransactions
      })
      .from(siaeTickets)
      .leftJoin(siaeCustomers, eq(siaeTickets.customerId, siaeCustomers.id))
      .leftJoin(siaeTransactions, eq(siaeTickets.transactionId, siaeTransactions.id))
      .where(and(
        eq(siaeTickets.ticketedEventId, req.params.id),
        sql`${siaeTickets.status} NOT IN ('cancelled', 'refunded')`
      ));
    
    const refundList = ticketsToRefund.map(row => ({
      ticketId: row.ticket.id,
      ticketCode: row.ticket.ticketCode,
      grossPrice: row.ticket.grossPrice,
      customerName: row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : 'N/A',
      customerEmail: row.customer?.email || null,
      stripePaymentIntentId: row.transaction?.stripePaymentIntentId || null,
      paymentMethod: row.transaction?.paymentMethod || 'unknown',
      emissionDate: row.ticket.emissionDate
    }));
    
    const totalAmount = refundList.reduce((sum, t) => sum + Number(t.grossPrice || 0), 0);
    
    res.json({
      eventId: req.params.id,
      eventStatus: ticketedEvent.eventStatus,
      cancellationReason: ticketedEvent.cancellationReason,
      refundDeadline: ticketedEvent.refundDeadline,
      refundsProcessed: ticketedEvent.refundsProcessed,
      tickets: refundList,
      totalTickets: refundList.length,
      totalAmount
    });
  } catch (error: any) {
    console.error('[REFUND LIST] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Processa rimborso per un singolo biglietto
 */
router.post("/api/siae/tickets/:id/refund", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { refundMethod = 'original' } = req.body; // original, voucher, manual
    const user = req.user as any;
    
    const ticket = await siaeStorage.getSiaeTicket(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    
    if (ticket.status === 'refunded') {
      return res.status(400).json({ message: "Biglietto già rimborsato" });
    }
    
    // Get transaction for Stripe refund
    let stripeRefundResult = null;
    if (refundMethod === 'original' && ticket.transactionId) {
      const transaction = await siaeStorage.getSiaeTransaction(ticket.transactionId);
      if (transaction?.stripePaymentIntentId) {
        try {
          const stripe = getUncachableStripeClient();
          if (stripe) {
            const refund = await stripe.refunds.create({
              payment_intent: transaction.stripePaymentIntentId,
              amount: Math.round(Number(ticket.grossPrice) * 100),
            });
            stripeRefundResult = { id: refund.id, status: refund.status };
          }
        } catch (stripeError: any) {
          console.error('[STRIPE REFUND] Error:', stripeError);
          return res.status(400).json({ 
            message: `Errore rimborso Stripe: ${stripeError.message}. Usa rimborso manuale.` 
          });
        }
      }
    }
    
    // Update ticket status
    const [updatedTicket] = await db.update(siaeTickets)
      .set({
        status: 'refunded',
        cancellationReason: 'event_cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(siaeTickets.id, req.params.id))
      .returning();
    
    // Update event refund counter
    await db.update(siaeTicketedEvents)
      .set({
        refundsProcessed: sql`${siaeTicketedEvents.refundsProcessed} + 1`,
        updatedAt: new Date()
      })
      .where(eq(siaeTicketedEvents.id, ticket.ticketedEventId));
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'ticket_refunded',
      entityType: 'ticket',
      entityId: req.params.id,
      description: `Biglietto ${ticket.ticketCode} rimborsato (€${ticket.grossPrice}). Metodo: ${refundMethod}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      ticket: updatedTicket,
      refundMethod,
      stripeRefund: stripeRefundResult,
      message: `Biglietto rimborsato con successo (€${ticket.grossPrice})`
    });
  } catch (error: any) {
    console.error('[REFUND TICKET] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Processa rimborsi batch per tutti i biglietti di un evento annullato
 */
router.post("/api/siae/ticketed-events/:id/refund-batch", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { refundMethod = 'original' } = req.body;
    const user = req.user as any;
    
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(req.params.id);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    
    if (ticketedEvent.eventStatus !== 'cancelled') {
      return res.status(400).json({ message: "L'evento non è stato annullato" });
    }
    
    // Get all tickets to refund
    const ticketsToRefund = await db
      .select()
      .from(siaeTickets)
      .where(and(
        eq(siaeTickets.ticketedEventId, req.params.id),
        sql`${siaeTickets.status} NOT IN ('cancelled', 'refunded')`
      ));
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    for (const ticket of ticketsToRefund) {
      try {
        // Process Stripe refund if applicable
        if (refundMethod === 'original' && ticket.transactionId) {
          const transaction = await siaeStorage.getSiaeTransaction(ticket.transactionId);
          if (transaction?.stripePaymentIntentId) {
            const stripe = getUncachableStripeClient();
            if (stripe) {
              await stripe.refunds.create({
                payment_intent: transaction.stripePaymentIntentId,
                amount: Math.round(Number(ticket.grossPrice) * 100),
              });
            }
          }
        }
        
        // Update ticket status
        await db.update(siaeTickets)
          .set({
            status: 'refunded',
            cancellationReason: 'event_cancelled',
            cancelledAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(siaeTickets.id, ticket.id));
        
        successCount++;
      } catch (ticketError: any) {
        failCount++;
        const errorMsg = `Biglietto ${ticket.ticketCode}: ${ticketError.message}`;
        errors.push(errorMsg);
        
        // Log individual refund failures for retry tracking
        await siaeStorage.createAuditLog({
          companyId: ticketedEvent.companyId,
          userId: user.id,
          action: 'refund_failed',
          entityType: 'ticket',
          entityId: ticket.id,
          description: `Rimborso fallito: ${errorMsg}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
    }
    
    // Update refunds processed counter
    await db.update(siaeTicketedEvents)
      .set({
        refundsProcessed: sql`${siaeTicketedEvents.refundsProcessed} + ${successCount}`,
        updatedAt: new Date()
      })
      .where(eq(siaeTicketedEvents.id, req.params.id));
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: ticketedEvent.companyId,
      userId: user.id,
      action: 'batch_refund_processed',
      entityType: 'ticketed_event',
      entityId: req.params.id,
      description: `Rimborso batch: ${successCount} successi, ${failCount} errori. Metodo: ${refundMethod}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: failCount === 0,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Elaborati ${successCount} rimborsi${failCount > 0 ? `, ${failCount} errori` : ''}.`
    });
  } catch (error: any) {
    console.error('[BATCH REFUND] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== Event Sectors (Organizer) ====================

router.get("/api/siae/ticketed-events/:eventId/sectors", requireAuth, async (req: Request, res: Response) => {
  try {
    const sectors = await siaeStorage.getSiaeEventSectors(req.params.eventId);
    res.json(sectors);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/event-sectors", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeEventSectorSchema.parse(req.body);
    const sector = await siaeStorage.createSiaeEventSector(data);
    res.status(201).json(sector);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/event-sectors/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = patchEventSectorSchema.parse(req.body);
    
    // SIAE rule: block price changes after tickets have been emitted
    if (data.priceIntero !== undefined || data.priceRidotto !== undefined || data.priceOmaggio !== undefined) {
      const [ticketCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(siaeTickets)
        .where(and(
          eq(siaeTickets.sectorId, req.params.id),
          sql`${siaeTickets.status} != 'cancelled'`
        ));
      
      if (ticketCount && ticketCount.count > 0) {
        return res.status(400).json({ 
          message: "Modifica prezzo non consentita: sono già stati emessi biglietti per questo settore. Crea una nuova tipologia per applicare prezzi diversi.",
          code: "PRICE_LOCKED"
        });
      }
    }
    
    const sector = await siaeStorage.updateSiaeEventSector(req.params.id, data);
    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    res.json(sector);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/api/siae/event-sectors/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    // SIAE Compliance: Check if sector has tickets (cannot delete sectors with issued tickets)
    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(siaeTickets)
      .where(eq(siaeTickets.sectorId, req.params.id));
    
    if (ticketCount && ticketCount.count > 0) {
      return res.status(400).json({ 
        message: "Eliminazione non consentita: sono stati emessi biglietti per questo settore. Per conformità SIAE, i dati dei titoli devono essere conservati.",
        code: "SIAE_RETENTION_REQUIRED"
      });
    }
    
    const deleted = await siaeStorage.deleteSiaeEventSector(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    res.json({ message: "Settore eliminato con successo" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Floor Plan Zone Linking (Organizer) ====================

// Schema for linking a sector to a floor plan zone
const linkSectorZoneSchema = z.object({
  floorPlanZoneId: z.string().nullable().optional(), // null to unlink
});

// PATCH /api/siae/sectors/:id/link-zone - Link sector to floor plan zone
router.patch("/api/siae/sectors/:id/link-zone", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = linkSectorZoneSchema.parse(req.body);
    
    // Update the sector's floorPlanZoneId
    const sector = await siaeStorage.updateSiaeEventSector(req.params.id, {
      floorPlanZoneId: data.floorPlanZoneId === undefined ? null : data.floorPlanZoneId
    });
    
    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    
    res.json(sector);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/siae/events/:eventId/floor-plan-data - Get floor plan with zones, sectors, and seats
router.get("/api/siae/events/:eventId/floor-plan-data", requireAuth, async (req: Request, res: Response) => {
  try {
    // Get the ticketed event
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(req.params.eventId);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    
    // Get the base event to find the location
    const [eventRecord] = await db
      .select({ locationId: events.locationId })
      .from(events)
      .where(eq(events.id, ticketedEvent.eventId));
    
    if (!eventRecord || !eventRecord.locationId) {
      return res.json({ floorPlan: null, zones: [], sectors: [], seats: [] });
    }
    
    // Get the floor plan(s) for this location (prefer default)
    const floorPlans = await db
      .select()
      .from(venueFloorPlans)
      .where(and(
        eq(venueFloorPlans.locationId, eventRecord.locationId),
        eq(venueFloorPlans.isActive, true)
      ))
      .orderBy(venueFloorPlans.isDefault)
      .limit(1);
    
    const floorPlan = floorPlans[0] || null;
    
    // Get zones for this floor plan
    const zones = floorPlan 
      ? await db
          .select()
          .from(floorPlanZones)
          .where(eq(floorPlanZones.floorPlanId, floorPlan.id))
          .orderBy(floorPlanZones.sortOrder)
      : [];
    
    // Get all sectors for this ticketed event with their zone links
    const sectors = await db
      .select()
      .from(siaeEventSectors)
      .where(eq(siaeEventSectors.ticketedEventId, req.params.eventId))
      .orderBy(siaeEventSectors.sortOrder);
    
    // Get all numbered seats for this event
    const seats = await db
      .select()
      .from(siaeNumberedSeats)
      .innerJoin(siaeEventSectors, eq(siaeNumberedSeats.sectorId, siaeEventSectors.id))
      .where(eq(siaeEventSectors.ticketedEventId, req.params.eventId));
    
    // Transform seats to flatten the nested structure and map coordinate field names
    const flattenedSeats = seats.map(row => ({
      id: row.siae_numbered_seats.id,
      sectorId: row.siae_numbered_seats.sectorId,
      rowNumber: row.siae_numbered_seats.rowNumber,
      seatNumber: row.siae_numbered_seats.seatNumber,
      category: row.siae_numbered_seats.category,
      priceMultiplier: row.siae_numbered_seats.priceMultiplier,
      status: row.siae_numbered_seats.status,
      posX: row.siae_numbered_seats.xPosition,
      posY: row.siae_numbered_seats.yPosition,
      notes: row.siae_numbered_seats.notes,
      createdAt: row.siae_numbered_seats.createdAt,
      updatedAt: row.siae_numbered_seats.updatedAt,
    }));
    
    res.json({
      floorPlan,
      zones,
      sectors,
      seats: flattenedSeats
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Seats (Organizer) ====================

router.get("/api/siae/sectors/:sectorId/seats", requireAuth, async (req: Request, res: Response) => {
  try {
    const seats = await siaeStorage.getSiaeSeats(req.params.sectorId);
    res.json(seats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/seats/bulk", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { seats } = req.body;
    if (!Array.isArray(seats)) {
      return res.status(400).json({ message: "Array di posti richiesto" });
    }
    const parsedSeats = seats.map(s => insertSiaeSeatSchema.parse(s));
    const createdSeats = await siaeStorage.createSiaeSeats(parsedSeats);
    res.status(201).json(createdSeats);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Genera posti in griglia automaticamente per un settore
const generateSeatsGridSchema = z.object({
  sectorId: z.string().min(1, "ID settore richiesto"),
  rows: z.number().min(1).max(50), // Max 50 file
  seatsPerRow: z.number().min(1).max(100), // Max 100 posti per fila
  startRow: z.string().default("A"), // Prima fila (A, B, C... o 1, 2, 3...)
  startSeat: z.number().default(1), // Primo numero posto
  // Posizione sulla planimetria (opzionale - coordinate del settore)
  startX: z.number().min(0).max(100).optional(), // X iniziale (percentuale)
  startY: z.number().min(0).max(100).optional(), // Y iniziale (percentuale)
  endX: z.number().min(0).max(100).optional(), // X finale (percentuale)
  endY: z.number().min(0).max(100).optional(), // Y finale (percentuale)
  clearExisting: z.boolean().default(false), // Se true, elimina posti esistenti prima
});

router.post("/api/siae/seats/generate-grid", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = generateSeatsGridSchema.parse(req.body);
    
    // Verifica che il settore esista
    const sector = await siaeStorage.getSiaeEventSector(data.sectorId);
    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    
    // Se richiesto, elimina posti esistenti
    if (data.clearExisting) {
      await siaeStorage.deleteSiaeSeatsBySector(data.sectorId);
    }
    
    // Genera array di posti
    const seats: any[] = [];
    const isNumericRow = /^\d+$/.test(data.startRow);
    let currentRowNum = isNumericRow ? parseInt(data.startRow) : 0;
    let currentRowChar = isNumericRow ? "" : data.startRow;
    
    // Calcola spacing per posizioni sulla planimetria
    const hasPositions = data.startX !== undefined && data.startY !== undefined && 
                         data.endX !== undefined && data.endY !== undefined;
    const xSpacing = hasPositions ? (data.endX! - data.startX!) / Math.max(data.seatsPerRow - 1, 1) : 0;
    const ySpacing = hasPositions ? (data.endY! - data.startY!) / Math.max(data.rows - 1, 1) : 0;
    
    for (let r = 0; r < data.rows; r++) {
      const rowLabel = isNumericRow 
        ? String(currentRowNum + r)
        : String.fromCharCode(currentRowChar.charCodeAt(0) + r);
      
      for (let s = 0; s < data.seatsPerRow; s++) {
        const seatNumber = String(data.startSeat + s);
        const seatLabel = `${rowLabel}${seatNumber}`;
        
        const seat: any = {
          sectorId: data.sectorId,
          row: rowLabel,
          seatNumber: seatNumber,
          seatLabel: seatLabel,
          status: 'available',
        };
        
        // Aggiungi posizioni se disponibili
        if (hasPositions) {
          seat.posX = String(data.startX! + s * xSpacing);
          seat.posY = String(data.startY! + r * ySpacing);
        }
        
        seats.push(seat);
      }
    }
    
    // Crea posti in batch
    const createdSeats = await siaeStorage.createSiaeSeats(seats);
    
    // Aggiorna capacità settore se isNumbered
    if (sector.isNumbered) {
      await siaeStorage.updateSiaeEventSector(data.sectorId, {
        capacity: createdSeats.length + (data.clearExisting ? 0 : (sector.capacity || 0)),
        availableSeats: createdSeats.length + (data.clearExisting ? 0 : (sector.availableSeats || 0)),
      });
    }
    
    res.status(201).json({
      message: `Creati ${createdSeats.length} posti (${data.rows} file x ${data.seatsPerRow} posti)`,
      seats: createdSeats,
      totalSeats: createdSeats.length,
    });
  } catch (error: any) {
    console.error("[SIAE-ROUTES] Error generating seat grid:", error);
    res.status(400).json({ message: error.message });
  }
});

// Elimina tutti i posti di un settore
router.delete("/api/siae/sectors/:sectorId/seats", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { sectorId } = req.params;
    
    // Verifica che il settore esista
    const sector = await siaeStorage.getSiaeEventSector(sectorId);
    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    
    // SIAE Compliance: Check if any tickets exist for this sector (cannot delete seats with ticket history)
    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(siaeTickets)
      .where(eq(siaeTickets.sectorId, sectorId));
    
    if (ticketCount && ticketCount.count > 0) {
      return res.status(400).json({ 
        message: "Eliminazione non consentita: sono stati emessi biglietti per questo settore. Per conformità SIAE, i dati dei posti devono essere conservati per almeno 60 giorni.",
        code: "SIAE_RETENTION_REQUIRED"
      });
    }
    
    // Verifica che non ci siano biglietti venduti per i posti
    const seats = await siaeStorage.getSiaeSeats(sectorId);
    const soldSeats = seats.filter(s => s.status === 'sold');
    if (soldSeats.length > 0) {
      return res.status(400).json({ 
        message: `Impossibile eliminare: ${soldSeats.length} posti già venduti` 
      });
    }
    
    await siaeStorage.deleteSiaeSeatsBySector(sectorId);
    
    res.json({ message: `Eliminati ${seats.length} posti dal settore` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/siae/sectors/:sectorId/sync-seats - Sincronizza posti da floor plan a settore SIAE
router.post("/api/siae/sectors/:sectorId/sync-seats", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { sectorId } = req.params;
    const { zoneId } = req.body;
    
    if (!zoneId) {
      return res.status(400).json({ message: "ID zona floor plan richiesto" });
    }
    
    // 1. Verifica che il settore esista e sia numerato
    const [sector] = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.id, sectorId));
    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    if (!sector.isNumbered) {
      return res.status(400).json({ message: "Il settore non è numerato. Solo i settori numerati possono sincronizzare i posti." });
    }
    
    // 2. Verifica che la zona esista
    const [zone] = await db.select().from(floorPlanZones).where(eq(floorPlanZones.id, zoneId));
    if (!zone) {
      return res.status(404).json({ message: "Zona floor plan non trovata" });
    }
    
    // 3. SIAE Compliance: Check if any tickets exist for this sector
    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(siaeTickets)
      .where(eq(siaeTickets.sectorId, sectorId));
    
    if (ticketCount && ticketCount.count > 0) {
      return res.status(400).json({ 
        message: "Sincronizzazione non consentita: sono stati emessi biglietti per questo settore. Per conformità SIAE, i dati dei posti non possono essere modificati.",
        code: "SIAE_TICKETS_EXIST"
      });
    }
    
    // 4. Carica i posti dalla zona del floor plan
    const floorPlanSeatsData = await db.select().from(floorPlanSeats).where(eq(floorPlanSeats.zoneId, zoneId));
    if (floorPlanSeatsData.length === 0) {
      return res.status(400).json({ message: "Nessun posto trovato nella zona selezionata" });
    }
    
    // 5. Elimina posti esistenti del settore
    await db.delete(siaeSeats).where(eq(siaeSeats.sectorId, sectorId));
    
    // 6. Copia i posti dal floor plan al settore SIAE
    const seatsToInsert = floorPlanSeatsData.map(fpSeat => ({
      sectorId,
      floorPlanSeatId: fpSeat.id,
      row: fpSeat.row,
      seatNumber: fpSeat.seatNumber?.toString() || fpSeat.seatLabel,
      seatLabel: fpSeat.seatLabel,
      posX: fpSeat.posX,
      posY: fpSeat.posY,
      status: fpSeat.isBlocked ? 'blocked' : 'available',
      isAccessible: fpSeat.isAccessible || false,
    }));
    
    const inserted = await db.insert(siaeSeats).values(seatsToInsert).returning();
    
    // 7. Aggiorna capacità e posti disponibili del settore
    const availableCount = inserted.filter(s => s.status === 'available').length;
    await db.update(siaeEventSectors)
      .set({ 
        capacity: inserted.length, 
        availableSeats: availableCount 
      })
      .where(eq(siaeEventSectors.id, sectorId));
    
    res.json({ 
      success: true, 
      count: inserted.length,
      availableSeats: availableCount,
      zoneName: zone.name,
      message: `${inserted.length} posti sincronizzati con successo dalla zona "${zone.name}"`
    });
  } catch (error: any) {
    console.error("[SIAE-ROUTES] Error syncing seats from floor plan:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/siae/sectors/:sectorId/available-zones - Ottieni zone disponibili per sincronizzazione
router.get("/api/siae/sectors/:sectorId/available-zones", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { sectorId } = req.params;
    
    // Ottieni il settore per trovare l'evento
    const [sector] = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.id, sectorId));
    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    
    // Ottieni l'evento ticketed e il suo evento base per trovare la location
    const [ticketedEvent] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, sector.ticketedEventId));
    if (!ticketedEvent) {
      return res.json({ zones: [] });
    }
    
    // Get the base event to find the locationId
    const [baseEvent] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
    if (!baseEvent || !baseEvent.locationId) {
      return res.json({ zones: [] });
    }
    
    // Import venueFloorPlans
    const { venueFloorPlans } = await import("@shared/schema");
    
    // Ottieni i floor plan della location (using event.locationId)
    const floorPlans = await db.select().from(venueFloorPlans).where(eq(venueFloorPlans.locationId, baseEvent.locationId));
    if (floorPlans.length === 0) {
      return res.json({ zones: [] });
    }
    
    // Ottieni tutte le zone con posti dei floor plan
    const zones = await db
      .select({
        id: floorPlanZones.id,
        name: floorPlanZones.name,
        zoneType: floorPlanZones.zoneType,
        floorPlanId: floorPlanZones.floorPlanId,
        capacity: floorPlanZones.capacity,
      })
      .from(floorPlanZones)
      .where(inArray(floorPlanZones.floorPlanId, floorPlans.map(fp => fp.id)));
    
    // Per ogni zona, conta i posti
    const zonesWithSeats = await Promise.all(zones.map(async (zone) => {
      const [seatCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(floorPlanSeats)
        .where(eq(floorPlanSeats.zoneId, zone.id));
      
      return {
        ...zone,
        seatsCount: seatCount?.count || 0,
      };
    }));
    
    // Filtra solo le zone che hanno posti
    const zonesWithSeatsFiltered = zonesWithSeats.filter(z => z.seatsCount > 0);
    
    res.json({ zones: zonesWithSeatsFiltered });
  } catch (error: any) {
    console.error("[SIAE-ROUTES] Error fetching available zones:", error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== Tickets (Organizer / Box Office) ====================

// Schema minimo per emissione manuale - sigillo generato server-side
// .strict() rifiuta qualsiasi campo non definito nello schema (inclusi tentativi di iniezione sigillo)
const manualTicketEmissionSchema = z.object({
  ticketedEventId: z.string().min(1, "ID evento richiesto"),
  sectorId: z.string().min(1, "ID settore richiesto"),
  ticketTypeCode: z.string().min(1, "Tipo biglietto richiesto"),
  sectorCode: z.string().max(2, "Codice settore max 2 caratteri").optional(),
  customerId: z.string().nullable().optional(),
  participantFirstName: z.string().nullable().optional(),
  participantLastName: z.string().nullable().optional(),
  emissionDate: z.string().optional(),
  emissionDateStr: z.string().optional(),
  emissionTimeStr: z.string().optional(),
}).strict();

router.get("/api/siae/ticketed-events/:eventId/tickets", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const tickets = await siaeStorage.getSiaeTicketsByEvent(req.params.eventId);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const ticket = await siaeStorage.getSiaeTicket(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/tickets", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    // Verifica connessione bridge e stato carta SIAE
    if (!isBridgeConnected()) {
      return res.status(503).json({ 
        message: "Lettore SIAE non connesso. Avviare l'app desktop Event Four You.",
        code: "SEAL_BRIDGE_OFFLINE"
      });
    }
    
    const cardStatus = isCardReadyForSeals();
    if (!cardStatus.ready) {
      return res.status(503).json({ 
        message: cardStatus.error || "Carta SIAE non pronta",
        code: "SEAL_CARD_NOT_READY"
      });
    }
    
    // Parse dati richiesta con schema minimo (NO campi sigillo dal client)
    const data = manualTicketEmissionSchema.parse(req.body);
    
    // Ottieni settore per calcolare il prezzo
    const sector = await siaeStorage.getSiaeEventSector(data.sectorId);
    if (!sector) {
      return res.status(400).json({ message: "Settore non trovato" });
    }
    
    // Ottieni evento per il canale di emissione
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(data.ticketedEventId);
    if (!ticketedEvent) {
      return res.status(400).json({ message: "Evento non trovato" });
    }
    
    // CONTROLLO OBBLIGATORIO: Codice Fiscale Emittente configurato
    const systemConfig = await siaeStorage.getSiaeSystemConfig(ticketedEvent.companyId);
    const company = await storage.getCompany(ticketedEvent.companyId);
    const taxId = systemConfig?.taxId || company?.fiscalCode || company?.taxId;
    
    if (!taxId) {
      return res.status(400).json({ 
        message: "Codice Fiscale Emittente non configurato. Vai su Impostazioni SIAE > Dati Aziendali per configurarlo.",
        code: "TAX_ID_REQUIRED"
      });
    }
    
    // Calcola prezzo in centesimi
    const grossAmount = data.ticketTypeCode === "INT" ? sector.priceIntero : 
                       data.ticketTypeCode === "RID" ? (sector.priceRidotto || sector.priceIntero) : "0";
    const priceInCents = Math.round(parseFloat(grossAmount) * 100);
    
    // RICHIESTA SIGILLO FISCALE SERVER-SIDE (OBBLIGATORIO PER SIAE)
    // Questo è il cuore del sistema: senza sigillo, niente biglietto
    let sealData;
    try {
      console.log(`[SIAE-ROUTES] Requesting fiscal seal for manual emission, price: ${priceInCents} cents`);
      sealData = await requestFiscalSeal(priceInCents);
      console.log(`[SIAE-ROUTES] Seal received: ${sealData.sealCode}, counter: ${sealData.counter}`);
    } catch (sealError: any) {
      console.error(`[SIAE-ROUTES] Failed to get fiscal seal:`, sealError.message);
      return res.status(503).json({
        message: `Impossibile generare sigillo fiscale: ${sealError.message.replace(/^[A-Z_]+:\s*/, '')}`,
        code: sealError.message.split(':')[0] || 'SEAL_ERROR'
      });
    }
    
    const now = new Date();
    const emissionDateStr = data.emissionDateStr || now.toISOString().slice(0, 10).replace(/-/g, '');
    const emissionTimeStr = data.emissionTimeStr || now.toTimeString().slice(0, 5).replace(':', '');
    
    // Crea biglietto con sigillo REALE generato server-side
    // I campi sigillo sono SEMPRE generati dal server - mai accettati dal client
    // Calcola progressivo sequenziale dell'evento (non il contatore della carta)
    const eventProgressiveNumber = (ticketedEvent.ticketsSold || 0) + 1;
    
    // Ensure sectorCode is max 2 chars (SIAE TAB.2 requirement)
    const sectorCode = (data.sectorCode || sector.sectorCode || 'XX').slice(0, 2);
    
    const ticketData = {
      ticketedEventId: data.ticketedEventId,
      sectorId: data.sectorId,
      ticketTypeCode: data.ticketTypeCode,
      sectorCode,
      customerId: data.customerId || null,
      participantFirstName: data.participantFirstName || null,
      participantLastName: data.participantLastName || null,
      emissionDate: data.emissionDate ? new Date(data.emissionDate) : now,
      emissionDateStr,
      emissionTimeStr,
      grossAmount: grossAmount,
      // SIGILLO GENERATO SERVER-SIDE - OBBLIGATORIO SIAE
      fiscalSealCode: sealData.sealCode,
      fiscalSealCounter: sealData.counter, // Contatore carta SIAE
      progressiveNumber: eventProgressiveNumber, // Progressivo sequenziale dell'evento
      cardCode: sealData.serialNumber,
      emissionChannelCode: "BOX", // Box Office per emissione manuale
    };
    
    const ticket = await siaeStorage.createSiaeTicket(ticketData as any);
    res.status(201).json(ticket);
  } catch (error: any) {
    console.error(`[SIAE-ROUTES] Ticket creation error:`, error.message);
    res.status(400).json({ message: error.message });
  }
});

router.post("/api/siae/tickets/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const { reasonCode, refund, refundReason } = req.body;
    if (!reasonCode) {
      return res.status(400).json({ message: "Causale annullamento richiesta (codice SIAE obbligatorio)" });
    }
    const user = req.user as any;
    
    // Prima ottieni il biglietto per avere il transactionId
    const existingTicket = await siaeStorage.getSiaeTicket(req.params.id);
    if (!existingTicket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    
    // Controllo permessi: gestori/organizer/super_admin possono cancellare tutti i biglietti della propria azienda
    // Cassieri possono cancellare solo i biglietti emessi dalla propria sessione/cassa
    const isCassiere = user.role === 'cassiere';
    const isGestore = user.role === 'gestore' || user.role === 'organizer' || user.role === 'super_admin' || user.role === 'admin';
    
    // Verifica che il biglietto appartenga alla stessa azienda dell'utente
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(existingTicket.ticketedEventId);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento del biglietto non trovato" });
    }
    
    // Per cassieri: usa getSiaeCashierId per ottenere l'ID corretto dalla sessione
    // e verifica l'azienda tramite allocazione evento
    if (isCassiere) {
      const cashierId = getSiaeCashierId(user);
      if (!cashierId) {
        return res.status(403).json({ message: "Non autorizzato: impossibile identificare il cassiere" });
      }
      
      // Verifica che il cassiere sia allocato a questo evento (questo garantisce anche la stessa azienda)
      const allocation = await siaeStorage.getCashierAllocationByCashierAndEvent(cashierId, existingTicket.ticketedEventId);
      if (!allocation) {
        return res.status(403).json({ message: "Non autorizzato: non sei allocato a questo evento" });
      }
      
      // SICUREZZA: I cassieri possono cancellare SOLO biglietti con issuedByUserId valido
      if (!existingTicket.issuedByUserId) {
        return res.status(403).json({ message: "Non autorizzato: questo biglietto può essere annullato solo da un gestore" });
      }
      
      // Verifica che il biglietto sia stato emesso da questo cassiere
      // Supporta entrambi i formati: user.id (vecchi biglietti) e cashierId (nuovi biglietti)
      const isIssuedByCashier = existingTicket.issuedByUserId === cashierId || 
                                existingTicket.issuedByUserId === user.id;
      if (!isIssuedByCashier) {
        return res.status(403).json({ message: "Non autorizzato: puoi annullare solo i biglietti emessi dalla tua cassa" });
      }
    } else if (isGestore) {
      // Per gestori: verifica companyId obbligatoriamente (tranne super_admin)
      const userCompanyId = user.companyId;
      if (user.role !== 'super_admin') {
        if (!userCompanyId) {
          return res.status(403).json({ message: "Non autorizzato: impossibile verificare l'azienda dell'utente" });
        }
        if (ticketedEvent.companyId !== userCompanyId) {
          return res.status(403).json({ message: "Non autorizzato: biglietto di un'altra azienda" });
        }
      }
    } else {
      return res.status(403).json({ message: "Non autorizzato ad annullare biglietti" });
    }
    
    // Processa rimborso se richiesto
    let stripeRefundId: string | null = null;
    let refundAmount: string | null = null;
    
    if (refund === true && existingTicket.transactionId) {
      try {
        // Trova la transazione per ottenere il payment intent ID
        const transaction = await siaeStorage.getSiaeTransaction(existingTicket.transactionId);
        
        if (transaction && transaction.paymentReference) {
          const stripe = await getUncachableStripeClient();
          
          // Calcola l'importo del rimborso (prezzo biglietto)
          const ticketPrice = Number(existingTicket.ticketPrice || existingTicket.grossAmount) * 100;
          
          // Crea rimborso parziale per questo singolo biglietto
          const stripeRefund = await stripe.refunds.create({
            payment_intent: transaction.paymentReference,
            amount: Math.round(ticketPrice),
            reason: 'requested_by_customer',
            metadata: {
              ticketId: existingTicket.id,
              ticketCode: existingTicket.ticketCode || '',
              cancelledBy: user.id,
              reasonCode: reasonCode,
              refundReason: refundReason || 'Annullamento biglietto'
            }
          });
          
          stripeRefundId = stripeRefund.id;
          refundAmount = (ticketPrice / 100).toFixed(2);
          
          console.log(`[SIAE] Refund processed for ticket ${existingTicket.id}: ${stripeRefundId}, amount: €${refundAmount}`);
        } else {
          console.warn(`[SIAE] Cannot refund ticket ${existingTicket.id}: no payment reference found`);
        }
      } catch (refundError: any) {
        console.error(`[SIAE] Refund failed for ticket ${existingTicket.id}:`, refundError.message);
        return res.status(500).json({ 
          message: `Annullamento fallito: errore nel rimborso Stripe - ${refundError.message}` 
        });
      }
    }
    
    // Annulla il biglietto
    const ticket = await siaeStorage.cancelSiaeTicket(req.params.id, reasonCode, user.id);
    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    
    // Se rimborso avvenuto, aggiorna i campi rimborso
    if (stripeRefundId) {
      await db.update(siaeTickets)
        .set({
          refundedAt: new Date(),
          refundAmount: refundAmount,
          stripeRefundId: stripeRefundId,
          refundInitiatorId: user.id,
          refundReason: refundReason || 'Annullamento con rimborso',
          updatedAt: new Date()
        })
        .where(eq(siaeTickets.id, req.params.id));
      
      // Ricarica il biglietto per restituire i dati aggiornati
      const updatedTicket = await siaeStorage.getSiaeTicket(req.params.id);
      return res.json({ 
        ...updatedTicket, 
        refunded: true, 
        refundId: stripeRefundId,
        refundedAmount: refundAmount
      });
    }
    
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/tickets/:id/validate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { scannerId } = req.body;
    const ticket = await siaeStorage.markSiaeTicketUsed(req.params.id, scannerId || 'manual');
    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Transactions (Public - for purchase) ====================

router.get("/api/siae/ticketed-events/:eventId/transactions", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const transactions = await siaeStorage.getSiaeTransactionsByEvent(req.params.eventId);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET all transactions for a company (for admin/gestore views)
router.get("/api/siae/transactions", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { companyId } = req.query;
    
    // Super admin can see all, gestore sees only their company
    let targetCompanyId: string | undefined;
    if (user.role === 'super_admin') {
      targetCompanyId = companyId as string | undefined;
    } else if (user.companyId) {
      targetCompanyId = user.companyId;
    } else {
      return res.status(403).json({ message: "Accesso non autorizzato" });
    }
    
    // Get all ticketed events for this company
    const ticketedEventIds: string[] = [];
    if (targetCompanyId) {
      const companyEvents = await db
        .select({ id: siaeTicketedEvents.id })
        .from(siaeTicketedEvents)
        .where(eq(siaeTicketedEvents.companyId, targetCompanyId));
      ticketedEventIds.push(...companyEvents.map(e => e.id));
    } else {
      // Super admin without filter - get all
      const allEvents = await db.select({ id: siaeTicketedEvents.id }).from(siaeTicketedEvents);
      ticketedEventIds.push(...allEvents.map(e => e.id));
    }
    
    if (ticketedEventIds.length === 0) {
      return res.json([]);
    }
    
    // Get all transactions for these events with event info
    const transactions = await db
      .select({
        transaction: siaeTransactions,
        eventId: siaeTicketedEvents.eventId,
        eventName: events.name,
      })
      .from(siaeTransactions)
      .innerJoin(siaeTicketedEvents, eq(siaeTransactions.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(inArray(siaeTransactions.ticketedEventId, ticketedEventIds))
      .orderBy(desc(siaeTransactions.createdAt));
    
    // Flatten the response to include event info at the transaction level
    const result = transactions.map(row => ({
      ...row.transaction,
      eventId: row.eventId,
      eventName: row.eventName,
    }));
    
    res.json(result);
  } catch (error: any) {
    console.error('[GET /api/siae/transactions] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/transactions/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const transaction = await siaeStorage.getSiaeTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transazione non trovata" });
    }
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Export transaction XML for SIAE
router.get("/api/siae/transactions/:id/export-xml", requireAuth, async (req: Request, res: Response) => {
  try {
    const transaction = await siaeStorage.getSiaeTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transazione non trovata" });
    }

    // Get tickets for this transaction
    const tickets = await db.select().from(siaeTickets)
      .where(eq(siaeTickets.transactionId, req.params.id));

    // Get event info
    const ticketedEvent = await db.select().from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, transaction.ticketedEventId))
      .then(rows => rows[0]);

    let eventName = "Evento";
    if (ticketedEvent) {
      const event = await db.select().from(events)
        .where(eq(events.id, ticketedEvent.eventId))
        .then(rows => rows[0]);
      if (event) eventName = event.name;
    }

    // Generate XML
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<TransazioneSIAE>
  <Intestazione>
    <CodiceTransazione>${transaction.transactionCode}</CodiceTransazione>
    <DataTransazione>${transaction.createdAt ? new Date(transaction.createdAt).toISOString() : ''}</DataTransazione>
    <StatoTransazione>${transaction.status}</StatoTransazione>
  </Intestazione>
  <Evento>
    <NomeEvento>${eventName}</NomeEvento>
    <CodiceEvento>${transaction.ticketedEventId}</CodiceEvento>
  </Evento>
  <Cliente>
    <CodiceCliente>${transaction.customerUniqueCode || ''}</CodiceCliente>
    <Email>${transaction.customerEmail || ''}</Email>
  </Cliente>
  <DatiPagamento>
    <MetodoPagamento>${transaction.paymentMethod}</MetodoPagamento>
    <ImportoTotale>${transaction.totalAmount}</ImportoTotale>
    <NumeroBiglietti>${transaction.ticketsCount}</NumeroBiglietti>
  </DatiPagamento>
  <Biglietti>
${tickets.map(ticket => `    <Biglietto>
      <CodiceBiglietto>${ticket.ticketCode}</CodiceBiglietto>
      <SigilloFiscale>${ticket.fiscalSealCode || ''}</SigilloFiscale>
      <Prezzo>${ticket.grossAmount || 0}</Prezzo>
      <Stato>${ticket.status}</Stato>
      <Partecipante>${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}</Partecipante>
    </Biglietto>`).join('\n')}
  </Biglietti>
</TransazioneSIAE>`;

    res.json({ xml: xmlContent });
  } catch (error: any) {
    console.error('[GET /api/siae/transactions/:id/export-xml] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/transactions", async (req: Request, res: Response) => {
  try {
    const data = insertSiaeTransactionSchema.parse(req.body);
    const transaction = await siaeStorage.createSiaeTransaction(data);
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/transactions/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = patchTransactionSchema.parse(req.body);
    const transaction = await siaeStorage.updateSiaeTransaction(req.params.id, data);
    if (!transaction) {
      return res.status(404).json({ message: "Transazione non trovata" });
    }
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== Admin Name Changes (Super Admin & Gestore) ====================

router.get("/api/siae/admin/name-changes", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { companyId, eventId, status, page = '1', limit = '50' } = req.query;
    
    // Gestori can only see their company's name changes
    // Super admins can see all or filter by company
    const effectiveCompanyId = user.role === 'super_admin' 
      ? (companyId as string | undefined) 
      : user.companyId;
    
    // Build query with filters
    let query = db
      .select({
        nameChange: siaeNameChanges,
        ticket: {
          id: siaeTickets.id,
          ticketCode: siaeTickets.ticketCode,
          participantFirstName: siaeTickets.participantFirstName,
          participantLastName: siaeTickets.participantLastName,
          ticketedEventId: siaeTickets.ticketedEventId,
          fiscalSealCode: siaeTickets.fiscalSealCode,
        },
        ticketedEvent: {
          id: siaeTicketedEvents.id,
          eventId: siaeTicketedEvents.eventId,
          companyId: siaeTicketedEvents.companyId,
          nameChangeFee: siaeTicketedEvents.nameChangeFee,
        },
        event: {
          id: events.id,
          name: events.name,
          startDatetime: events.startDatetime,
        },
        company: {
          id: companies.id,
          name: companies.name,
        },
      })
      .from(siaeNameChanges)
      .innerJoin(siaeTickets, eq(siaeNameChanges.originalTicketId, siaeTickets.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(companies, eq(siaeTicketedEvents.companyId, companies.id));
    
    // Apply filters
    const conditions: any[] = [];
    // For gestore, always filter by their company; for super_admin, use query param if provided
    if (effectiveCompanyId) {
      conditions.push(eq(siaeTicketedEvents.companyId, effectiveCompanyId));
    }
    if (eventId && typeof eventId === 'string') {
      conditions.push(eq(siaeTicketedEvents.eventId, eventId));
    }
    if (status && typeof status === 'string') {
      conditions.push(eq(siaeNameChanges.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Add ordering and pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = (pageNum - 1) * limitNum;
    
    const results = await query
      .orderBy(desc(siaeNameChanges.createdAt))
      .limit(limitNum)
      .offset(offset);
    
    // Get total count for pagination (apply same filters)
    let countQuery = db
      .select({ count: count() })
      .from(siaeNameChanges)
      .innerJoin(siaeTickets, eq(siaeNameChanges.originalTicketId, siaeTickets.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id));
    
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;
    
    res.json({
      nameChanges: results.map(r => ({
        ...r.nameChange,
        ticket: {
          ...r.ticket,
          fiscalSealCode: r.ticket.fiscalSealCode, // Esplicito per conformità SIAE
        },
        ticketedEvent: r.ticketedEvent,
        event: r.event,
        company: r.company,
        // SIAE Compliance: sigillo fiscale per tracciabilità
        sigilloFiscaleOriginale: r.ticket.fiscalSealCode,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN NAME-CHANGES] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get companies and events for filters
router.get("/api/siae/admin/name-changes/filters", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // For gestore, filter to their company only
    const companyFilter = user.role === 'super_admin' 
      ? undefined 
      : user.companyId;
    
    // Get all companies with name changes (super_admin sees all, gestore sees only theirs)
    let companiesQuery = db
      .selectDistinct({
        id: companies.id,
        name: companies.name,
      })
      .from(siaeNameChanges)
      .innerJoin(siaeTickets, eq(siaeNameChanges.originalTicketId, siaeTickets.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(companies, eq(siaeTicketedEvents.companyId, companies.id));
    
    if (companyFilter) {
      companiesQuery = companiesQuery.where(eq(siaeTicketedEvents.companyId, companyFilter)) as any;
    }
    const companiesWithChanges = await companiesQuery.orderBy(companies.name);
    
    // Get all events with name changes (filtered by company for gestore)
    let eventsQuery = db
      .selectDistinct({
        id: events.id,
        name: events.name,
        companyId: siaeTicketedEvents.companyId,
      })
      .from(siaeNameChanges)
      .innerJoin(siaeTickets, eq(siaeNameChanges.originalTicketId, siaeTickets.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id));
    
    if (companyFilter) {
      eventsQuery = eventsQuery.where(eq(siaeTicketedEvents.companyId, companyFilter)) as any;
    }
    const eventsWithChanges = await eventsQuery.orderBy(events.name);
    
    res.json({
      companies: companiesWithChanges,
      events: eventsWithChanges,
      statuses: ['pending', 'completed', 'rejected'],
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// SIAE Compliance: Biglietti annullati per riemissione non ancora agganciati al nuovo titolo
// Per tracciabilità fiscale - mostra i titoli annullati con causale cambio nominativo in attesa di riemissione
router.get("/api/siae/admin/name-changes/pending-reissue", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { companyId, eventId } = req.query;
    
    // For gestore, always filter by their company
    const effectiveCompanyId = user.role === 'super_admin' 
      ? (companyId as string | undefined) 
      : user.companyId;
    
    // Find tickets cancelled for name change (code 10) that don't have a replacement yet
    // OR name change requests that are pending
    const conditions: SQL[] = [
      and(
        eq(siaeTickets.cancellationReasonCode, '10'), // Cambio nominativo - vecchio titolo
        isNull(siaeTickets.replacedByTicketId) // Non ancora riemesso
      )!
    ];
    
    if (effectiveCompanyId) {
      conditions.push(eq(siaeTicketedEvents.companyId, effectiveCompanyId));
    }
    if (eventId) {
      conditions.push(eq(siaeTicketedEvents.eventId, eventId as string));
    }
    
    // Get cancelled tickets awaiting reissue
    const cancelledAwaitingReissue = await db
      .select({
        ticket: siaeTickets,
        ticketedEvent: siaeTicketedEvents,
        event: events,
        company: companies,
      })
      .from(siaeTickets)
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(companies, eq(siaeTicketedEvents.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(siaeTickets.cancellationDate));
    
    // Get pending name change requests (not yet processed)
    const pendingRequests = await db
      .select({
        nameChange: siaeNameChanges,
        ticket: siaeTickets,
        ticketedEvent: siaeTicketedEvents,
        event: events,
        company: companies,
      })
      .from(siaeNameChanges)
      .innerJoin(siaeTickets, eq(siaeNameChanges.originalTicketId, siaeTickets.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(companies, eq(siaeTicketedEvents.companyId, companies.id))
      .where(eq(siaeNameChanges.status, 'pending'))
      .orderBy(desc(siaeNameChanges.createdAt));
    
    res.json({
      // Biglietti già annullati ma senza nuovo titolo emesso (anomalia fiscale)
      cancelledAwaitingReissue: cancelledAwaitingReissue.map(r => ({
        ...r.ticket,
        ticketedEvent: r.ticketedEvent,
        event: r.event,
        company: r.company,
        sigilloFiscaleOriginale: r.ticket.fiscalSealCode,
      })),
      // Richieste di cambio nominativo in attesa di elaborazione
      pendingRequests: pendingRequests.map(r => ({
        ...r.nameChange,
        ticket: r.ticket,
        ticketedEvent: r.ticketedEvent,
        event: r.event,
        company: r.company,
        sigilloFiscaleOriginale: r.ticket.fiscalSealCode,
      })),
      summary: {
        cancelledAwaitingReissueCount: cancelledAwaitingReissue.length,
        pendingRequestsCount: pendingRequests.length,
        totalPendingReissue: cancelledAwaitingReissue.length + pendingRequests.length,
      }
    });
  } catch (error: any) {
    console.error('[ADMIN PENDING-REISSUE] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Process name change (super_admin or gestore for their company)
router.post("/api/siae/admin/name-changes/:id/process", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { action, rejectionReason } = req.body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: "Azione non valida. Usa 'approve' o 'reject'" });
    }
    
    // Get the name change request with company info
    const [nameChangeWithCompany] = await db
      .select({
        nameChange: siaeNameChanges,
        companyId: siaeTicketedEvents.companyId,
      })
      .from(siaeNameChanges)
      .innerJoin(siaeTickets, eq(siaeNameChanges.originalTicketId, siaeTickets.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(siaeNameChanges.id, id));
    
    if (!nameChangeWithCompany) {
      return res.status(404).json({ message: "Richiesta di cambio nominativo non trovata" });
    }
    
    const nameChange = nameChangeWithCompany.nameChange;
    
    // Gestori can only process name changes for their own company
    if (user.role !== 'super_admin' && nameChangeWithCompany.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato a elaborare questa richiesta" });
    }
    
    if (nameChange.status !== 'pending') {
      return res.status(400).json({ message: "Solo le richieste in attesa possono essere elaborate" });
    }
    
    // Handle rejection
    if (action === 'reject') {
      await db.update(siaeNameChanges)
        .set({
          status: 'rejected',
          processedAt: new Date(),
          notes: rejectionReason || 'Rifiutata dall\'amministratore' // schema uses 'notes' not 'rejectionReason'
        })
        .where(eq(siaeNameChanges.id, id));
      
      return res.json({ success: true, message: "Richiesta rifiutata" });
    }
    
    // Handle approval - check payment if required
    if (nameChange.fee && parseFloat(nameChange.fee) > 0 && nameChange.paymentStatus !== 'paid') {
      return res.status(400).json({ 
        message: "Non è possibile approvare: pagamento commissione non completato",
        code: "PAYMENT_REQUIRED"
      });
    }
    
    // Get original ticket
    const [originalTicket] = await db.select().from(siaeTickets).where(eq(siaeTickets.id, nameChange.originalTicketId));
    if (!originalTicket) {
      return res.status(404).json({ message: "Biglietto originale non trovato" });
    }
    
    // Create new ticket with updated name
    // For SIAE compliance: new ticket gets a new progressivo and new sigillo via smart card
    const now = new Date();
    const newTicketId = crypto.randomUUID();
    const newTicketCode = `NC-${now.getTime().toString(36).toUpperCase()}`;
    
    // Request fiscal seal via bridge (smart card SIAE)
    const priceInCents = Math.round(parseFloat(originalTicket.grossAmount || "0") * 100);
    let sealData;
    try {
      console.log(`[NAME-CHANGE] Requesting fiscal seal for name change, price: ${priceInCents} cents`);
      sealData = await requestFiscalSeal(priceInCents);
      console.log(`[NAME-CHANGE] Seal received: ${sealData.sealCode}, counter: ${sealData.counter}`);
    } catch (sealError: any) {
      console.error(`[NAME-CHANGE] Failed to get fiscal seal:`, sealError.message);
      return res.status(503).json({
        message: `Impossibile generare sigillo fiscale: ${sealError.message.replace(/^[A-Z_]+:\s*/, '')}`,
        code: sealError.message.split(':')[0] || 'SEAL_ERROR'
      });
    }
    
    // Get next progressivo for this event
    const [maxProgressivo] = await db
      .select({ max: sql<number>`COALESCE(MAX(${siaeTickets.progressiveNumber}), 0)` })
      .from(siaeTickets)
      .where(eq(siaeTickets.ticketedEventId, originalTicket.ticketedEventId));
    const nextProgressivo = (maxProgressivo?.max || 0) + 1;
    
    // SIAE Compliant: New ticket must reference original ticket for fiscal traceability
    // Per Allegato B: il nuovo titolo deve contenere riferimento esplicito al sigillo fiscale del titolo annullato
    await db.insert(siaeTickets).values({
      ticketCode: newTicketCode,
      ticketedEventId: originalTicket.ticketedEventId,
      sectorId: originalTicket.sectorId,
      sectorCode: originalTicket.sectorCode,
      ticketTypeCode: originalTicket.ticketTypeCode,
      ticketType: originalTicket.ticketType, // schema uses ticketType not ticketTypeId
      customerId: originalTicket.customerId, // IMPORTANTE: Preserva customerId per rivendita
      participantFirstName: nameChange.newFirstName,
      participantLastName: nameChange.newLastName,
      // Note: participantEmail, participantCodiceFiscale, participantPhone don't exist in schema
      grossAmount: originalTicket.grossAmount, // schema uses grossAmount not price/finalPrice
      netAmount: originalTicket.netAmount,
      vatAmount: originalTicket.vatAmount,
      status: 'valid',
      fiscalSealCode: sealData.sealCode, // schema uses fiscalSealCode not sigilloFiscale
      fiscalSealCounter: sealData.counter, // Counter from SIAE card
      cardCode: sealData.serialNumber, // Card serial number
      progressiveNumber: nextProgressivo, // schema uses progressiveNumber not progressivoSerata
      // Note: entranceType, orderId don't exist in schema
      paymentMethod: originalTicket.paymentMethod,
      // RIFERIMENTO FISCALE AL TITOLO ANNULLATO (Allegato B SIAE)
      originalTicketId: originalTicket.id, // Link al biglietto originale annullato
      emissionDate: now,
      createdAt: now,
      updatedAt: now,
    });
    
    // Annul original ticket with SIAE-compliant causale (TAB.5 code '10' = Cambio nominativo)
    // Per Allegato B: annullamento con causale riemissione + riferimento al nuovo titolo
    await db.update(siaeTickets)
      .set({ 
        status: 'annullato_cambio_nominativo',
        cancellationReasonCode: '10', // TAB.5: "Cambio nominativo - vecchio titolo"
        cancellationDate: now,
        replacedByTicketId: newTicketId, // Link al biglietto sostitutivo (tracciabilità SIAE)
        // Note: annullamentoMotivo doesn't exist in schema - use customText for notes
        customText: `Cambio nominativo - Sigillo originale: ${originalTicket.fiscalSealCode || 'N/A'} - Nuovo: ${sealData.sealCode}`,
        updatedAt: now
      })
      .where(eq(siaeTickets.id, originalTicket.id));
    
    // Update name change request
    await db.update(siaeNameChanges)
      .set({
        status: 'completed',
        newTicketId: newTicketId,
        processedAt: new Date()
      })
      .where(eq(siaeNameChanges.id, id));
    
    res.json({ 
      success: true, 
      message: "Cambio nominativo approvato",
      newTicketId,
      newTicketCode
    });
  } catch (error: any) {
    console.error("[ADMIN-NAME-CHANGE] Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Direct name change by gestore (no customer request)
router.post("/api/siae/tickets/:ticketId/gestore-name-change", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { ticketId } = req.params;
    const { newFirstName, newLastName, newCodiceFiscale, newEmail, causale } = req.body;
    
    // Validate required fields
    if (!newFirstName || !newLastName || !causale) {
      return res.status(400).json({ message: "Nome, cognome e causale sono obbligatori" });
    }
    
    // Get the original ticket with event/company info
    const [ticketWithEvent] = await db
      .select({
        ticket: siaeTickets,
        ticketedEvent: siaeTicketedEvents,
      })
      .from(siaeTickets)
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(siaeTickets.id, ticketId));
    
    if (!ticketWithEvent) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    
    const originalTicket = ticketWithEvent.ticket;
    const ticketedEvent = ticketWithEvent.ticketedEvent;
    
    // Gestori can only process tickets for their own company
    if (user.role !== 'super_admin' && ticketedEvent.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato a modificare questo biglietto" });
    }
    
    // Check ticket status - only valid/sold tickets can be changed
    const validStatuses = ['valid', 'sold', 'emitted', 'active'];
    if (!validStatuses.includes(originalTicket.status)) {
      return res.status(400).json({ message: `Biglietto non modificabile: stato '${originalTicket.status}'` });
    }
    
    // Check if name change is allowed for this event
    if (!ticketedEvent.allowsChangeName) {
      return res.status(400).json({ message: "Cambio nominativo non abilitato per questo evento" });
    }
    
    const now = new Date();
    const newTicketId = crypto.randomUUID();
    const newTicketCode = `NC-${now.getTime().toString(36).toUpperCase()}`;
    
    // Request fiscal seal via bridge (smart card SIAE)
    const priceInCents = Math.round(parseFloat(originalTicket.grossAmount || "0") * 100);
    let sealData;
    try {
      console.log(`[GESTORE-NAME-CHANGE] Requesting fiscal seal, price: ${priceInCents} cents`);
      sealData = await requestFiscalSeal(priceInCents);
      console.log(`[GESTORE-NAME-CHANGE] Seal received: ${sealData.sealCode}, counter: ${sealData.counter}`);
    } catch (sealError: any) {
      console.error(`[GESTORE-NAME-CHANGE] Failed to get fiscal seal:`, sealError.message);
      return res.status(503).json({
        message: `Impossibile generare sigillo fiscale: ${sealError.message.replace(/^[A-Z_]+:\s*/, '')}`,
        code: sealError.message.split(':')[0] || 'SEAL_ERROR'
      });
    }
    
    // Get next progressivo for this event
    const [maxProgressivo] = await db
      .select({ max: sql<number>`COALESCE(MAX(${siaeTickets.progressiveNumber}), 0)` })
      .from(siaeTickets)
      .where(eq(siaeTickets.ticketedEventId, originalTicket.ticketedEventId));
    const nextProgressivo = (maxProgressivo?.max || 0) + 1;
    
    // Create new ticket with updated holder data
    await db.insert(siaeTickets).values({
      ticketCode: newTicketCode,
      ticketedEventId: originalTicket.ticketedEventId,
      sectorId: originalTicket.sectorId,
      sectorCode: originalTicket.sectorCode,
      ticketTypeCode: originalTicket.ticketTypeCode,
      ticketType: originalTicket.ticketType, // schema uses ticketType not ticketTypeId
      customerId: originalTicket.customerId,
      participantFirstName: newFirstName,
      participantLastName: newLastName,
      // Note: participantEmail, participantCodiceFiscale, participantPhone don't exist in schema
      grossAmount: originalTicket.grossAmount, // schema uses grossAmount not price/finalPrice
      netAmount: originalTicket.netAmount,
      vatAmount: originalTicket.vatAmount,
      status: 'valid',
      fiscalSealCode: sealData.sealCode, // schema uses fiscalSealCode not sigilloFiscale
      fiscalSealCounter: sealData.counter,
      cardCode: sealData.serialNumber,
      progressiveNumber: nextProgressivo, // schema uses progressiveNumber not progressivoSerata
      // Note: entranceType, orderId don't exist in schema
      paymentMethod: 'name_change',
      originalTicketId: originalTicket.id,
      emissionDate: now,
      createdAt: now,
      updatedAt: now,
    });
    
    // Annul original ticket with causale from gestore
    await db.update(siaeTickets)
      .set({ 
        status: 'annullato_cambio_nominativo',
        cancellationReasonCode: '10',
        cancellationDate: now,
        replacedByTicketId: newTicketId,
        // Note: annullamentoMotivo doesn't exist in schema - use customText for notes
        customText: `Cambio nominativo gestore: ${causale} - Sigillo originale: ${originalTicket.fiscalSealCode || 'N/A'} - Nuovo: ${sealData.sealCode}`,
        updatedAt: now
      })
      .where(eq(siaeTickets.id, originalTicket.id));
    
    // Create name change record with status 'completed' directly
    const nameChangeId = crypto.randomUUID();
    await db.insert(siaeNameChanges).values({
      id: nameChangeId,
      originalTicketId: originalTicket.id,
      newTicketId: newTicketId,
      newFirstName,
      newLastName,
      newEmail: newEmail || null,
      newFiscalCode: newCodiceFiscale || null,
      requestedById: user.id,
      requestedByType: 'operator',
      status: 'completed',
      processedAt: now,
      processedByUserId: user.id,
      fee: '0',
      paymentStatus: 'paid',
      createdAt: now,
    });
    
    console.log(`[GESTORE-NAME-CHANGE] Success - Original: ${originalTicket.id}, New: ${newTicketId}, Causale: ${causale}`);
    
    res.json({ 
      success: true, 
      message: "Cambio nominativo completato",
      newTicketId,
      newTicketCode,
      nameChangeId
    });
  } catch (error: any) {
    console.error("[GESTORE-NAME-CHANGE] Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== Name Changes (Customer / Organizer) ====================

// Get all name changes (for super_admin/gestore with company selector)
router.get("/api/siae/name-changes/all", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const changes = await siaeStorage.getAllSiaeNameChanges();
    res.json(changes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/companies/:companyId/name-changes", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const changes = await siaeStorage.getSiaeNameChangesByCompany(req.params.companyId);
    res.json(changes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/tickets/:ticketId/name-changes", requireAuth, async (req: Request, res: Response) => {
  try {
    const changes = await siaeStorage.getSiaeNameChanges(req.params.ticketId);
    res.json(changes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/name-changes", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const data = insertSiaeNameChangeSchema.parse(req.body);
    
    // Validate ticket exists and get event info
    const [originalTicket] = await db.select().from(siaeTickets).where(eq(siaeTickets.id, data.originalTicketId));
    if (!originalTicket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    
    const [ticketedEvent] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, originalTicket.ticketedEventId));
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Check if name changes are allowed for this event
    if (!ticketedEvent.allowsChangeName) {
      return res.status(400).json({ 
        message: "Il cambio nominativo non è abilitato per questo evento",
        code: "NAME_CHANGE_NOT_ALLOWED"
      });
    }
    
    // Get event details for datetime
    const [eventDetails] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
    if (!eventDetails) {
      return res.status(404).json({ message: "Dettagli evento non trovati" });
    }
    
    // Check temporal limit - deadline hours before event
    // Use startDatetime for event timing (required field)
    const eventDateSource = eventDetails.startDatetime;
    const deadlineHours = ticketedEvent.nameChangeDeadlineHours || 48;
    
    if (eventDateSource) {
      const eventStartTime = new Date(eventDateSource);
      const deadlineTime = new Date(eventStartTime.getTime() - (deadlineHours * 60 * 60 * 1000));
      const now = new Date();
      
      if (now > deadlineTime) {
        const hoursRemaining = Math.max(0, Math.floor((eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
        return res.status(400).json({ 
          message: `Cambio nominativo non più disponibile. Il termine era ${deadlineHours} ore prima dell'evento (${hoursRemaining} ore rimaste).`,
          code: "NAME_CHANGE_DEADLINE_PASSED",
          deadlineHours,
          hoursRemaining
        });
      }
    } else {
      // No event date available - log warning and allow name change (legacy compatibility)
      console.warn(`[NAME-CHANGE] Event ${ticketedEvent.id} has no startDatetime or date - skipping deadline check`);
    }
    
    // Check max name changes per ticket limit
    const maxChanges = ticketedEvent.maxNameChangesPerTicket || 1;
    const existingChanges = await siaeStorage.getSiaeNameChanges(data.originalTicketId);
    const completedChanges = existingChanges.filter(c => c.status === 'completed').length;
    
    if (completedChanges >= maxChanges) {
      return res.status(400).json({ 
        message: `Limite massimo di cambi nominativo raggiunto (${maxChanges}). Non è possibile richiedere ulteriori modifiche.`,
        code: "MAX_NAME_CHANGES_EXCEEDED",
        maxChanges,
        currentChanges: completedChanges
      });
    }
    
    // Check if ticket status allows name change
    const validStatuses = ['active', 'sold', 'paid', 'emitted', 'valid'];
    if (!validStatuses.includes(originalTicket.status || '')) {
      return res.status(400).json({ 
        message: `Il biglietto non è in stato valido per il cambio nominativo (stato: ${originalTicket.status})`,
        code: "INVALID_TICKET_STATUS"
      });
    }
    
    // Check if there's already a pending name change request
    const pendingChanges = existingChanges.filter(c => c.status === 'pending');
    if (pendingChanges.length > 0) {
      return res.status(400).json({ 
        message: "Esiste già una richiesta di cambio nominativo in attesa per questo biglietto",
        code: "PENDING_REQUEST_EXISTS",
        pendingRequestId: pendingChanges[0].id
      });
    }
    
    // Create the name change request
    const change = await siaeStorage.createSiaeNameChange(data);
    
    // Check if auto-approval is enabled for this event
    if (ticketedEvent.autoApproveNameChanges) {
        // Check if payment is required but not yet paid - skip auto-approval
        const feeAmount = parseFloat(ticketedEvent.nameChangeFee || '0');
        if (feeAmount > 0 && change.paymentStatus !== 'paid') {
          console.log(`[NAME-CHANGE] Auto-approval skipped: payment required (€${feeAmount}) but not yet paid for ${change.id}`);
          // Fall through to return pending status with payment info
        } else {
          // Auto-process the name change
          console.log(`[NAME-CHANGE] Auto-approving name change ${change.id} for event ${ticketedEvent.id}`);
        
        // Check bridge availability
        const bridgeStatus = getCachedBridgeStatus();
        if (bridgeStatus.bridgeConnected && bridgeStatus.cardInserted) {
          try {
            // Request fiscal seal
            const priceInCents = Math.round(Number(originalTicket.grossAmount || originalTicket.ticketPrice || 0) * 100);
            const sealData = await requestFiscalSeal(priceInCents);
            
            // Process the name change
            const result = await db.transaction(async (tx) => {
              // Get next progressive number
              const [{ maxProgress }] = await tx
                .select({ maxProgress: sql<number>`COALESCE(MAX(progressive_number), 0)` })
                .from(siaeTickets)
                .where(eq(siaeTickets.ticketedEventId, originalTicket.ticketedEventId));
              const newProgressiveNumber = (maxProgress || 0) + 1;
              
              // Generate new ticket code
              const newTicketCode = `${ticketedEvent.siaeEventCode || 'TKT'}-NC-${newProgressiveNumber.toString().padStart(6, '0')}`;
              
              // Create new ticket
              const [newTicket] = await tx.insert(siaeTickets)
                .values({
                  ticketedEventId: originalTicket.ticketedEventId,
                  sectorId: originalTicket.sectorId,
                  transactionId: originalTicket.transactionId,
                  customerId: originalTicket.customerId,
                  fiscalSealCode: sealData.sealCode,
                  fiscalSealCounter: sealData.counter,
                  progressiveNumber: newProgressiveNumber,
                  cardCode: sealData.serialNumber,
                  emissionDate: new Date(),
                  emissionDateStr: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                  emissionTimeStr: new Date().toTimeString().slice(0, 5).replace(':', ''),
                  ticketTypeCode: originalTicket.ticketTypeCode,
                  sectorCode: originalTicket.sectorCode,
                  ticketCode: newTicketCode,
                  ticketType: originalTicket.ticketType,
                  ticketPrice: originalTicket.ticketPrice,
                  seatId: originalTicket.seatId,
                  row: originalTicket.row,
                  seatNumber: originalTicket.seatNumber,
                  grossAmount: originalTicket.grossAmount,
                  netAmount: originalTicket.netAmount,
                  vatAmount: originalTicket.vatAmount,
                  prevendita: originalTicket.prevendita,
                  prevenditaVat: originalTicket.prevenditaVat,
                  participantFirstName: data.newFirstName,
                  participantLastName: data.newLastName,
                  issuedByUserId: userId,
                  isComplimentary: originalTicket.isComplimentary,
                  paymentMethod: 'name_change',
                  status: 'sold',
                  originalTicketId: originalTicket.id,
                  qrCode: `SIAE-TKT-NC-${newProgressiveNumber}`
                })
                .returning();
              
              // Update original ticket with replacement reference and SIAE-compliant annulment
              await tx.update(siaeTickets)
                .set({ 
                  replacedByTicketId: newTicket.id,
                  status: 'annullato_cambio_nominativo',
                  cancellationReasonCode: '10', // TAB.5: "Cambio nominativo - vecchio titolo"
                  cancellationDate: new Date(),
                  cancelledByUserId: userId,
                  customText: `Cambio nominativo auto-approvato - Sigillo originale: ${originalTicket.fiscalSealCode || 'N/A'} - Nuovo: ${sealData.sealCode}`
                })
                .where(eq(siaeTickets.id, originalTicket.id));
              
              // Update name change request
              const [updatedChange] = await tx.update(siaeNameChanges)
                .set({
                  newTicketId: newTicket.id,
                  status: 'completed',
                  processedAt: new Date(),
                  processedByUserId: userId,
                  updatedAt: new Date()
                })
                .where(eq(siaeNameChanges.id, change.id))
                .returning();
              
              return { newTicket, updatedChange };
            });
            
            // Send email to new holder (async)
            if (data.newEmail) {
              const [event] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
              const [sector] = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.id, originalTicket.sectorId));
              
              if (event) {
                try {
                  const { sendTicketEmail } = await import('./email-service');
                  const { generateDigitalTicketPdf } = await import('./pdf-service');
                  
                  // Fetch template for the company (if available)
                  const template = await storage.getDefaultDigitalTicketTemplate(ticketedEvent.companyId || undefined);
                  
                  const ticketData = {
                    eventName: event.name,
                    eventDate: event.startDatetime,
                    locationName: event.locationId || 'N/A',
                    sectorName: sector?.name || 'N/A',
                    holderName: `${data.newFirstName} ${data.newLastName}`,
                    price: String(originalTicket.grossAmount || originalTicket.ticketPrice || '0'),
                    ticketCode: result.newTicket.ticketCode || '',
                    qrCode: result.newTicket.qrCode || '',
                    fiscalSealCode: sealData.sealCode
                  };
                  
                  const pdfBuffer = await generateDigitalTicketPdf(ticketData, template);
                  
                  const ticketHtml = `
                    <div style="border:1px solid #ddd; padding:20px; border-radius:8px;">
                      <h2 style="color:#6366f1;">Biglietto - ${event.name}</h2>
                      <p><strong>Intestatario:</strong> ${ticketData.holderName}</p>
                      <p><strong>Settore:</strong> ${ticketData.sectorName}</p>
                      <p><strong>Codice:</strong> ${ticketData.ticketCode}</p>
                      <p><strong>Sigillo SIAE:</strong> ${ticketData.fiscalSealCode}</p>
                    </div>
                  `;
                  
                  await sendTicketEmail({
                    to: data.newEmail,
                    subject: `Cambio Nominativo Completato - ${event.name}`,
                    eventName: event.name,
                    tickets: [{ id: result.newTicket.id, html: ticketHtml }],
                    pdfBuffers: [pdfBuffer]
                  });
                } catch (emailError) {
                  console.error('[NAME-CHANGE] Auto-approval email error:', emailError);
                }
              }
            }
            
            // Create audit log
            await siaeStorage.createAuditLog({
              companyId: ticketedEvent.companyId,
              userId,
              action: 'name_change_auto_approved',
              entityType: 'ticket',
              entityId: result.newTicket.id,
              description: `Auto-approvato: originalTicket=${originalTicket.id}, newTicket=${result.newTicket.id}, seal=${sealData.sealCode}`
            });
            
            return res.status(201).json({
              ...result.updatedChange,
              autoApproved: true,
              newTicket: result.newTicket,
              message: "Cambio nominativo approvato automaticamente"
            });
          } catch (processError: any) {
            console.error('[NAME-CHANGE] Auto-approval failed:', processError);
            // Fall through to return pending status
          }
        } else {
          console.log('[NAME-CHANGE] Auto-approval skipped: bridge not ready');
        }
      }
    }
    
    res.status(201).json(change);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/name-changes/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = patchNameChangeSchema.parse(req.body);
    const change = await siaeStorage.updateSiaeNameChange(req.params.id, data);
    if (!change) {
      return res.status(404).json({ message: "Richiesta cambio nominativo non trovata" });
    }
    res.json(change);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== Process Name Change (Complete Workflow) ====================
router.post("/api/siae/name-changes/:id/process", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { action, rejectionReason } = req.body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: "Azione non valida. Usa 'approve' o 'reject'" });
    }
    
    // 1. Get the name change request
    const [nameChangeRequest] = await db.select().from(siaeNameChanges).where(eq(siaeNameChanges.id, req.params.id));
    if (!nameChangeRequest) {
      return res.status(404).json({ message: "Richiesta cambio nominativo non trovata" });
    }
    
    if (nameChangeRequest.status !== 'pending') {
      return res.status(400).json({ message: "Richiesta già processata" });
    }
    
    // Handle rejection - no payment check needed
    if (action === 'reject') {
      // If fee was paid and rejecting, process refund first
      const shouldRefund = nameChangeRequest.paymentStatus === 'paid' && parseFloat(nameChangeRequest.fee || '0') > 0;
      
      let refundId: string | null = null;
      let refundSuccess = false;
      let refundError: string | null = null;
      
      // Check for missing paymentIntentId when refund is needed
      if (shouldRefund && !nameChangeRequest.paymentIntentId) {
        console.error(`[NAME-CHANGE] Cannot refund - missing paymentIntentId for request ${req.params.id}`);
        return res.status(400).json({
          message: "Impossibile rifiutare: pagamento presente ma ID pagamento mancante. Contatta il supporto per elaborazione manuale.",
          code: "MISSING_PAYMENT_INTENT",
          requiresManualIntervention: true,
        });
      }
      
      // Attempt Stripe refund BEFORE updating DB status
      if (shouldRefund && nameChangeRequest.paymentIntentId) {
        try {
          console.log(`[NAME-CHANGE] Processing refund for payment ${nameChangeRequest.paymentIntentId}`);
          const stripe = await getUncachableStripeClient();
          const refund = await stripe.refunds.create({
            payment_intent: nameChangeRequest.paymentIntentId,
            reason: 'requested_by_customer',
            metadata: {
              type: 'name_change_fee_refund',
              nameChangeId: req.params.id,
              rejectionReason: rejectionReason || 'Rejected by operator',
            },
          });
          refundId = refund.id;
          refundSuccess = true;
          console.log(`[NAME-CHANGE] Refund processed successfully: ${refundId}`);
        } catch (err: any) {
          console.error(`[NAME-CHANGE] Refund failed for ${nameChangeRequest.paymentIntentId}:`, err);
          refundError = err.message;
          // Continue with rejection but note the failure
        }
      }
      
      // Only set 'refunded' if refund actually succeeded, otherwise keep 'paid'
      const finalPaymentStatus = refundSuccess ? 'refunded' : nameChangeRequest.paymentStatus;
      const notes = refundError 
        ? `${rejectionReason || 'Rifiutata'}. ATTENZIONE: Rimborso fallito - elaborazione manuale necessaria. Errore: ${refundError}`
        : (rejectionReason || 'Rifiutata dall\'operatore');
      
      const [updated] = await db.update(siaeNameChanges)
        .set({
          status: 'rejected',
          paymentStatus: finalPaymentStatus,
          refundId: refundId,
          refundedAt: refundSuccess ? new Date() : null,
          notes,
          processedAt: new Date(),
          processedByUserId: userId,
          updatedAt: new Date()
        })
        .where(eq(siaeNameChanges.id, req.params.id))
        .returning();
      
      if (refundError) {
        // Return partial success - rejection worked but refund failed
        return res.status(207).json({ 
          success: false,
          partialSuccess: true,
          rejectionCompleted: true,
          refundCompleted: false,
          nameChange: updated, 
          message: "Richiesta rifiutata. ATTENZIONE: Rimborso non riuscito - elaborazione manuale necessaria.",
          refundInitiated: false,
          refundError,
          requiresManualRefund: true,
        });
      }
      
      return res.json({ 
        success: true, 
        nameChange: updated, 
        message: refundSuccess ? "Richiesta rifiutata e rimborso elaborato." : "Richiesta rifiutata",
        refundInitiated: refundSuccess,
        refundId,
      });
    }
    
    // Check if payment is required and not yet paid (for approval only)
    const feeAmount = parseFloat(nameChangeRequest.fee || '0');
    if (feeAmount > 0 && nameChangeRequest.paymentStatus !== 'paid') {
      return res.status(400).json({ 
        message: `Impossibile approvare: la commissione di €${feeAmount.toFixed(2)} non è stata ancora pagata.`,
        code: "PAYMENT_REQUIRED",
        fee: feeAmount,
        paymentStatus: nameChangeRequest.paymentStatus,
      });
    }
    
    // 2. Get the original ticket with all details
    const [originalTicket] = await db.select().from(siaeTickets).where(eq(siaeTickets.id, nameChangeRequest.originalTicketId));
    if (!originalTicket) {
      return res.status(404).json({ message: "Biglietto originale non trovato" });
    }
    
    // Accept all valid ticket statuses that can be changed
    const validStatuses = ['emitted', 'active', 'valid', 'sold', 'paid'];
    if (!validStatuses.includes(originalTicket.status)) {
      console.log(`[NAME-CHANGE] Ticket status not valid for change: ${originalTicket.status}`);
      return res.status(400).json({ message: `Biglietto non modificabile (stato: ${originalTicket.status})` });
    }
    console.log(`[NAME-CHANGE] Processing name change for ticket ${originalTicket.id}, status: ${originalTicket.status}`);
    
    // 3. Get ticketed event details
    const [ticketedEvent] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, originalTicket.ticketedEventId));
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento ticketed non trovato" });
    }
    
    // 4. Get event details for email
    const [event] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
    
    // 5. Get sector details
    const [sector] = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.id, originalTicket.sectorId));
    
    // 6. Check bridge/smart card availability
    const bridgeStatus = getCachedBridgeStatus();
    if (!bridgeStatus.bridgeConnected || !bridgeStatus.cardInserted) {
      return res.status(503).json({ 
        message: "Lettore smart card SIAE non disponibile. Connetti il bridge desktop e inserisci la carta.",
        code: "BRIDGE_NOT_READY"
      });
    }
    
    // 7. Request fiscal seal for new ticket
    let sealData;
    try {
      const priceInCents = Math.round(Number(originalTicket.grossAmount || originalTicket.ticketPrice || 0) * 100);
      sealData = await requestFiscalSeal(priceInCents);
    } catch (sealError: any) {
      console.error('[NAME-CHANGE] Failed to get fiscal seal:', sealError);
      return res.status(503).json({
        message: "Errore nella richiesta del sigillo fiscale. Riprova.",
        code: "SEAL_REQUEST_FAILED",
        details: sealError.message
      });
    }
    
    // 8. Begin transaction: Cancel old ticket and create new one
    const result = await db.transaction(async (tx) => {
      // 8a. Annul original ticket with SIAE-compliant causale (TAB.5 code '10')
      await tx.update(siaeTickets)
        .set({
          status: 'annullato_cambio_nominativo',
          cancellationReasonCode: '10', // TAB.5: "Cambio nominativo - vecchio titolo"
          cancellationDate: new Date(),
          cancelledByUserId: userId,
          customText: `Cambio nominativo - Sigillo originale: ${originalTicket.fiscalSealCode || 'N/A'} - Nuovo: ${sealData.sealCode}`,
          updatedAt: new Date()
        })
        .where(eq(siaeTickets.id, originalTicket.id));
      
      // 8b. Get next progressive number
      const [{ maxProgress }] = await tx
        .select({ maxProgress: sql<number>`COALESCE(MAX(progressive_number), 0)` })
        .from(siaeTickets)
        .where(eq(siaeTickets.ticketedEventId, originalTicket.ticketedEventId));
      const newProgressiveNumber = (maxProgress || 0) + 1;
      
      // 8c. Generate new ticket code
      const newTicketCode = `${ticketedEvent.siaeEventCode || 'TKT'}-NC-${newProgressiveNumber.toString().padStart(6, '0')}`;
      
      // 8d. Create new ticket with new holder data
      const [newTicket] = await tx.insert(siaeTickets)
        .values({
          ticketedEventId: originalTicket.ticketedEventId,
          sectorId: originalTicket.sectorId,
          transactionId: originalTicket.transactionId,
          customerId: originalTicket.customerId,
          // Fiscal seal data
          fiscalSealCode: sealData.sealCode,
          fiscalSealCounter: sealData.counter,
          progressiveNumber: newProgressiveNumber,
          cardCode: sealData.serialNumber,
          // Dates
          emissionDate: new Date(),
          emissionDateStr: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
          emissionTimeStr: new Date().toTimeString().slice(0, 5).replace(':', ''),
          // Ticket type
          ticketTypeCode: originalTicket.ticketTypeCode,
          sectorCode: originalTicket.sectorCode,
          ticketCode: newTicketCode,
          ticketType: originalTicket.ticketType,
          ticketPrice: originalTicket.ticketPrice,
          // Seat info (if numbered)
          seatId: originalTicket.seatId,
          row: originalTicket.row,
          seatNumber: originalTicket.seatNumber,
          // Prices
          grossAmount: originalTicket.grossAmount,
          netAmount: originalTicket.netAmount,
          vatAmount: originalTicket.vatAmount,
          prevendita: originalTicket.prevendita,
          prevenditaVat: originalTicket.prevenditaVat,
          // NEW HOLDER DATA
          participantFirstName: nameChangeRequest.newFirstName,
          participantLastName: nameChangeRequest.newLastName,
          // Emission info
          issuedByUserId: userId,
          isComplimentary: originalTicket.isComplimentary,
          paymentMethod: 'name_change',
          // Status - use 'sold' for consistency with admin route
          status: 'sold',
          // Reference to original
          originalTicketId: originalTicket.id,
          // QR Code
          qrCode: `SIAE-TKT-NC-${newProgressiveNumber}`
        })
        .returning();
      
      // 8e. Update original ticket with replacement reference
      await tx.update(siaeTickets)
        .set({ replacedByTicketId: newTicket.id })
        .where(eq(siaeTickets.id, originalTicket.id));
      
      // 8f. Update name change request
      const [updatedNameChange] = await tx.update(siaeNameChanges)
        .set({
          newTicketId: newTicket.id,
          status: 'completed',
          processedAt: new Date(),
          processedByUserId: userId,
          updatedAt: new Date()
        })
        .where(eq(siaeNameChanges.id, req.params.id))
        .returning();
      
      return { newTicket, updatedNameChange };
    });
    
    // 9. Send email to new holder (async, don't block response)
    if (nameChangeRequest.newEmail && event) {
      try {
        const { sendTicketEmail } = await import('./email-service');
        const { generateDigitalTicketPdf } = await import('./pdf-service');
        
        // Fetch template for the company (if available)
        const template = await storage.getDefaultDigitalTicketTemplate(ticketedEvent.companyId || undefined);
        
        const ticketData = {
          eventName: event.name,
          eventDate: event.startDatetime,
          locationName: event.locationId || 'N/A',
          sectorName: sector?.name || 'N/A',
          holderName: `${nameChangeRequest.newFirstName} ${nameChangeRequest.newLastName}`,
          price: String(originalTicket.grossAmount || originalTicket.ticketPrice || '0'),
          ticketCode: result.newTicket.ticketCode || '',
          qrCode: result.newTicket.qrCode || `SIAE-TKT-NC-${result.newTicket.id}`,
          fiscalSealCode: sealData.sealCode
        };
        
        const pdfBuffer = await generateDigitalTicketPdf(ticketData, template);
        
        // Simple HTML for email body
        const ticketHtml = `
          <div style="border:1px solid #ddd; padding:20px; border-radius:8px;">
            <h2 style="color:#6366f1;">Biglietto - ${ticketData.eventName}</h2>
            <p><strong>Intestatario:</strong> ${ticketData.holderName}</p>
            <p><strong>Settore:</strong> ${ticketData.sectorName}</p>
            <p><strong>Codice:</strong> ${ticketData.ticketCode}</p>
            <p><strong>Sigillo SIAE:</strong> ${ticketData.fiscalSealCode}</p>
            <p style="color:#666; font-size:12px;">Il biglietto PDF è allegato a questa email.</p>
          </div>
        `;
        
        await sendTicketEmail({
          to: nameChangeRequest.newEmail,
          subject: `Cambio Nominativo Completato - ${event.name}`,
          eventName: event.name,
          tickets: [{ id: result.newTicket.id, html: ticketHtml }],
          pdfBuffers: [pdfBuffer]
        });
        
        console.log(`[NAME-CHANGE] Email sent to new holder: ${nameChangeRequest.newEmail}`);
      } catch (emailError) {
        console.error('[NAME-CHANGE] Failed to send email:', emailError);
        // Don't fail the request, email is not critical
      }
    }
    
    // 10. Create audit log
    await siaeStorage.createAuditLog({
      companyId: ticketedEvent.companyId,
      userId,
      action: 'name_change_completed',
      entityType: 'ticket',
      entityId: result.newTicket.id,
      description: `Completato: ${originalTicket.participantFirstName} ${originalTicket.participantLastName} -> ${nameChangeRequest.newFirstName} ${nameChangeRequest.newLastName}, seal=${sealData.sealCode}`
    });
    
    res.json({
      success: true,
      message: "Cambio nominativo completato con successo",
      nameChange: result.updatedNameChange,
      newTicket: result.newTicket,
      oldTicketId: originalTicket.id
    });
    
  } catch (error: any) {
    console.error('[NAME-CHANGE] Process error:', error);
    res.status(500).json({ message: error.message || "Errore durante il processamento del cambio nominativo" });
  }
});

// ==================== Resales (Customer) ====================

// GET all resales for super_admin (global view with company info)
router.get("/api/siae/resales/all", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'super_admin') {
      return res.status(403).json({ message: "Accesso riservato a super admin" });
    }
    
    // Get all resales with company and event info
    const allResales = await db
      .select({
        resale: siaeResales,
        companyId: siaeTicketedEvents.companyId,
        companyName: companies.name,
        eventName: events.name,
        eventDate: events.startDatetime,
        ticketCode: siaeTickets.ticketCode,
        sectorName: siaeEventSectors.name,
      })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(companies, eq(siaeTicketedEvents.companyId, companies.id))
      .leftJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .orderBy(desc(siaeResales.listedAt));
    
    // Flatten result
    const result = allResales.map(r => ({
      ...r.resale,
      companyId: r.companyId,
      companyName: r.companyName,
      eventName: r.eventName,
      eventDate: r.eventDate,
      ticketCode: r.ticketCode,
      sectorName: r.sectorName,
    }));
    
    res.json(result);
  } catch (error: any) {
    console.error('[SIAE] Get all resales error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/companies/:companyId/resales", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const resales = await siaeStorage.getSiaeResalesByCompany(req.params.companyId);
    res.json(resales);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/resales/available", async (req: Request, res: Response) => {
  try {
    const resales = await siaeStorage.getAvailableSiaeResales();
    res.json(resales);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/ticketed-events/:eventId/resales", async (req: Request, res: Response) => {
  try {
    const resales = await siaeStorage.getSiaeResalesByEvent(req.params.eventId);
    res.json(resales);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/ticketed-events/:eventId/name-changes", async (req: Request, res: Response) => {
  try {
    const changes = await siaeStorage.getSiaeNameChangesByEvent(req.params.eventId);
    res.json(changes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/resales", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeResaleSchema.parse(req.body);
    
    // === VALIDAZIONE ALLEGATO B - NORMATIVA 2025 ===
    // NOTA OPERATIVA: L'acquirente non è noto al momento della messa in vendita.
    // L'identità acquirente viene verificata al momento del completamento (PATCH con status=completed).
    // Questo flusso rispetta l'Allegato B che prevede:
    // - Venditore: identificato alla messa in vendita
    // - Acquirente: identificato al momento dell'acquisto
    
    // 1. Causale rivendita obbligatoria e valida
    const causaliValide = ['IMP', 'VOL', 'ALT'] as const; // IMP=Impossibilità, VOL=Volontaria, ALT=Altro
    if (!data.causaleRivendita || !causaliValide.includes(data.causaleRivendita as any)) {
      return res.status(400).json({ 
        message: "Causale rivendita obbligatoria (IMP=Impossibilità, VOL=Volontaria, ALT=Altro)",
        code: "ALLEGATO_B_CAUSALE_MANCANTE"
      });
    }
    
    // 2. Se causale=ALT, dettaglio obbligatorio
    if (data.causaleRivendita === 'ALT' && !data.causaleDettaglio) {
      return res.status(400).json({ 
        message: "Per causale ALT è obbligatorio specificare il dettaglio",
        code: "ALLEGATO_B_DETTAGLIO_MANCANTE"
      });
    }
    
    // 3. Controllo prezzo massimo (Art. 1 comma 545 L. 232/2016): non può superare prezzo originale
    if (data.newPrice && data.originalPrice) {
      const prezzoOriginale = Number(data.originalPrice);
      const prezzoNuovo = Number(data.newPrice);
      if (prezzoNuovo > prezzoOriginale) {
        return res.status(400).json({ 
          message: `Prezzo rivendita (€${prezzoNuovo.toFixed(2)}) non può superare il prezzo originale (€${prezzoOriginale.toFixed(2)}) - Art. 1 comma 545 L. 232/2016`,
          code: "ALLEGATO_B_PREZZO_MASSIMO_SUPERATO"
        });
      }
    }
    
    // 4. ALLEGATO B: Verifica identità venditore obbligatoria
    // Se identitaVenditoreVerificata è false o assente, blocca (normativa anti-bagarinaggio)
    if (!data.identitaVenditoreVerificata) {
      return res.status(400).json({ 
        message: "Verifica identità venditore obbligatoria per Allegato B. Inserire documento di identità.",
        code: "ALLEGATO_B_IDENTITA_VENDITORE_MANCANTE"
      });
    }
    
    // 5. Documento venditore obbligatorio se identità verificata
    if (!data.venditoreDocumentoTipo || !data.venditoreDocumentoNumero) {
      return res.status(400).json({ 
        message: "Tipo e numero documento venditore obbligatori per Allegato B.",
        code: "ALLEGATO_B_DOCUMENTO_VENDITORE_MANCANTE"
      });
    }
    
    // Imposta flags di controllo
    const dataWithControls = {
      ...data,
      controlloPrezzoMassimoEseguito: true,
      controlloPrezzoMassimoSuperato: false,
      controlloPrezzoMassimoData: new Date(),
      identitaVenditoreVerificataData: new Date(),
    };
    
    const resale = await siaeStorage.createSiaeResale(dataWithControls);
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: resale.companyId || user.companyId,
      userId: user.id,
      action: 'resale_created',
      entityType: 'resale',
      entityId: resale.id,
      description: `Rimessa in vendita creata per biglietto ${resale.originalTicketId}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(resale);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/resales/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = patchResaleSchema.parse(req.body);
    
    // Recupera la resale esistente per validazione
    const existingResale = await siaeStorage.getSiaeResale(req.params.id);
    if (!existingResale) {
      return res.status(404).json({ message: "Rimessa in vendita non trovata" });
    }
    
    // === VALIDAZIONE ALLEGATO B - NORMATIVA 2025 (COMPLETA) ===
    
    // 1. Controllo prezzo massimo se viene aggiornato il prezzo
    if (data.newPrice !== undefined) {
      const prezzoOriginale = Number(existingResale.originalPrice || data.originalPrice || 0);
      const prezzoNuovo = Number(data.newPrice);
      if (prezzoNuovo > prezzoOriginale && prezzoOriginale > 0) {
        return res.status(400).json({ 
          message: `Prezzo rivendita (€${prezzoNuovo.toFixed(2)}) non può superare il prezzo originale (€${prezzoOriginale.toFixed(2)}) - Art. 1 comma 545 L. 232/2016`,
          code: "ALLEGATO_B_PREZZO_MASSIMO_SUPERATO"
        });
      }
    }
    
    // 2. Se causale viene cambiata a ALT, verifica dettaglio
    const causaleFinale = data.causaleRivendita || existingResale.causaleRivendita;
    const dettaglioFinale = data.causaleDettaglio || existingResale.causaleDettaglio;
    if (causaleFinale === 'ALT' && !dettaglioFinale) {
      return res.status(400).json({ 
        message: "Per causale ALT è obbligatorio specificare il dettaglio",
        code: "ALLEGATO_B_DETTAGLIO_MANCANTE"
      });
    }
    
    // 3. Se stato cambia a 'completed' o 'approved', verifica identità acquirente
    if (data.status === 'completed' || data.status === 'approved') {
      const identitaAcquirente = data.identitaAcquirenteVerificata ?? existingResale.identitaAcquirenteVerificata;
      const docTipo = data.acquirenteDocumentoTipo || existingResale.acquirenteDocumentoTipo;
      const docNumero = data.acquirenteDocumentoNumero || existingResale.acquirenteDocumentoNumero;
      
      if (!identitaAcquirente) {
        return res.status(400).json({ 
          message: "Per completare la rivendita è obbligatoria la verifica identità acquirente (Allegato B).",
          code: "ALLEGATO_B_IDENTITA_ACQUIRENTE_MANCANTE"
        });
      }
      
      if (!docTipo || !docNumero) {
        return res.status(400).json({ 
          message: "Tipo e numero documento acquirente obbligatori per completare la rivendita (Allegato B).",
          code: "ALLEGATO_B_DOCUMENTO_ACQUIRENTE_MANCANTE"
        });
      }
    }
    
    // 4. Verifica che identità venditore sia sempre presente (non può essere rimossa)
    const identitaVenditoreFinale = data.identitaVenditoreVerificata ?? existingResale.identitaVenditoreVerificata;
    if (!identitaVenditoreFinale) {
      return res.status(400).json({ 
        message: "La verifica identità venditore è obbligatoria e non può essere rimossa (Allegato B).",
        code: "ALLEGATO_B_IDENTITA_VENDITORE_MANCANTE"
      });
    }
    
    // 5. Impedire la rimozione di dati di verifica già impostati (immutabilità Allegato B)
    if (existingResale.identitaVenditoreVerificata === true && data.identitaVenditoreVerificata === false) {
      return res.status(400).json({ 
        message: "La verifica identità venditore non può essere annullata una volta confermata (Allegato B).",
        code: "ALLEGATO_B_MODIFICA_NON_CONSENTITA"
      });
    }
    if (existingResale.identitaAcquirenteVerificata === true && data.identitaAcquirenteVerificata === false) {
      return res.status(400).json({ 
        message: "La verifica identità acquirente non può essere annullata una volta confermata (Allegato B).",
        code: "ALLEGATO_B_MODIFICA_NON_CONSENTITA"
      });
    }
    
    // 6. Non permettere rimozione documenti venditore già registrati
    if (existingResale.venditoreDocumentoNumero && data.venditoreDocumentoNumero === null) {
      return res.status(400).json({ 
        message: "Il documento venditore non può essere rimosso una volta registrato (Allegato B).",
        code: "ALLEGATO_B_MODIFICA_NON_CONSENTITA"
      });
    }
    
    // 7. Controllo prezzo massimo su ogni modifica prezzo (non solo nuovo)
    const prezzoNuovoFinale = data.newPrice !== undefined ? Number(data.newPrice) : null;
    const prezzoOriginaleFinale = Number(existingResale.originalPrice || 0);
    if (prezzoNuovoFinale !== null && prezzoOriginaleFinale > 0 && prezzoNuovoFinale > prezzoOriginaleFinale) {
      return res.status(400).json({ 
        message: `Prezzo rivendita (€${prezzoNuovoFinale.toFixed(2)}) non può superare il prezzo originale (€${prezzoOriginaleFinale.toFixed(2)}) - Art. 1 comma 545 L. 232/2016`,
        code: "ALLEGATO_B_PREZZO_MASSIMO_SUPERATO"
      });
    }
    
    // Imposta timestamp controlli se identità acquirente verificata ora
    const dataWithTimestamps = { ...data };
    if (data.identitaAcquirenteVerificata && !existingResale.identitaAcquirenteVerificata) {
      (dataWithTimestamps as any).identitaAcquirenteVerificataData = new Date();
    }
    
    const resale = await siaeStorage.updateSiaeResale(req.params.id, dataWithTimestamps);
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: resale?.companyId || user.companyId,
      userId: user.id,
      action: 'resale_updated',
      entityType: 'resale',
      entityId: req.params.id,
      description: `Rimessa in vendita aggiornata${data.status ? ` (status: ${data.status})` : ''}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(resale);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== Logs (Super Admin / Gestore) ====================

router.get("/api/siae/companies/:companyId/logs", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await siaeStorage.getSiaeLogs(req.params.companyId, limit);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Transmissions (Gestore) ====================

router.get("/api/siae/companies/:companyId/transmissions", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const transmissions = await siaeStorage.getSiaeTransmissionsByCompany(req.params.companyId);
    res.json(transmissions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get SIAE ticketed events for RCA report selection
// Returns only approved events (for RCA, only approved events can be transmitted)
router.get("/api/siae/companies/:companyId/ticketed-events", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const ticketedEvents = await siaeStorage.getSiaeTicketedEventsByCompany(companyId);
    
    // The getSiaeTicketedEventsByCompany function already includes eventName, eventDate, ticketingStatus
    // Filter to only show approved events (RCA requires SIAE-approved events)
    // Return 'closed' status if EITHER ticketingStatus OR event.status is closed
    const filteredEvents = ticketedEvents
      .filter(te => te.approvalStatus === 'approved')
      .map(te => {
        // Consider event closed if either ticketingStatus or base event status is closed
        const isClosed = te.ticketingStatus === 'closed' || te.status === 'closed';
        return {
          id: te.id,
          eventId: te.eventId,
          eventName: te.eventName || 'Evento sconosciuto',
          eventDate: te.eventDate || te.createdAt,
          status: isClosed ? 'closed' : te.ticketingStatus, // Show as closed if either is closed
        };
      });
    
    // Sort by event date descending (most recent first)
    filteredEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
    
    res.json(filteredEvents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Transmission Settings API (Global Singleton) ====================

// Get global transmission settings
router.get("/api/siae/transmission-settings", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const settings = await siaeStorage.getOrCreateGlobalSiaeTransmissionSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to get transmission settings:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update global transmission settings
router.put("/api/siae/transmission-settings", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    // Ensure settings exist first
    await siaeStorage.getOrCreateGlobalSiaeTransmissionSettings();
    
    // Update with provided values
    const settings = await siaeStorage.updateGlobalSiaeTransmissionSettings(req.body);
    
    if (!settings) {
      return res.status(404).json({ message: "Impostazioni non trovate" });
    }
    
    res.json(settings);
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to update transmission settings:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get transmissions filtered by organizer and optionally by event
router.get("/api/siae/transmissions-list", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = req.query.companyId as string || user?.companyId;
    const ticketedEventId = req.query.ticketedEventId as string;
    
    if (!companyId) {
      return res.status(400).json({ message: "Company ID richiesto" });
    }
    
    let transmissions;
    if (ticketedEventId) {
      transmissions = await siaeStorage.getSiaeTransmissionsByTicketedEvent(ticketedEventId);
    } else {
      transmissions = await siaeStorage.getSiaeTransmissionsByCompany(companyId);
    }
    
    // Enrich with event info
    const enrichedTransmissions = await Promise.all(transmissions.map(async (t) => {
      let eventName = 'N/D';
      let eventDate = null;
      if (t.ticketedEventId) {
        const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(t.ticketedEventId);
        if (ticketedEvent) {
          const event = await storage.getEvent(ticketedEvent.eventId);
          eventName = event?.name || ticketedEvent.eventTitle || 'Evento sconosciuto';
          eventDate = event?.startDatetime || ticketedEvent.createdAt;
        }
      }
      return {
        ...t,
        eventName,
        eventDate,
      };
    }));
    
    res.json(enrichedTransmissions);
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to get transmissions list:', error);
    res.status(500).json({ message: error.message });
  }
});

// Resend transmission with Sostituzione="S"
router.post("/api/siae/transmissions/:id/resend", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { toEmail } = req.body;
    
    // Get original transmission
    const original = await siaeStorage.getSiaeTransmission(id);
    if (!original) {
      return res.status(404).json({ message: "Trasmissione originale non trovata" });
    }
    
    if (!original.ticketedEventId) {
      return res.status(400).json({ message: "Trasmissione senza evento associato" });
    }
    
    // Count existing transmissions for this event to get next progressivo
    const existingTransmissions = await siaeStorage.getSiaeTransmissionsByTicketedEvent(original.ticketedEventId);
    const sameTypeTransmissions = existingTransmissions.filter(t => 
      t.transmissionType === original.transmissionType
    );
    const nextProgressivo = sameTypeTransmissions.length + 1;
    
    // Get event and company data for XML regeneration
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(original.ticketedEventId);
    if (!ticketedEvent) {
      return res.status(400).json({ message: "Evento SIAE non trovato" });
    }
    
    // Check international exemption
    const intlCheck = await checkInternationalExemption(ticketedEvent.eventId, original.companyId);
    if (intlCheck.exempt) {
      return res.status(400).json({ message: intlCheck.reason, code: 'INTERNATIONAL_EXEMPT' });
    }
    
    const company = await storage.getCompany(original.companyId);
    const baseEvent = await storage.getEvent(ticketedEvent.eventId);
    const allTickets = await siaeStorage.getSiaeTicketsByCompany(original.companyId);
    const eventTickets = allTickets.filter(t => t.ticketedEventId === original.ticketedEventId);
    const systemConfig = await siaeStorage.getSiaeSystemConfig(original.companyId);
    const activationCards = await siaeStorage.getSiaeActivationCardsByCompany(original.companyId);
    const activeCard = activationCards.find(c => c.status === 'active');
    const taxId = systemConfig?.taxId || company?.fiscalCode || company?.taxId || '';
    
    // FIX 2026-01-17: Per reinvio RCA (S/MIME), il codice DEVE provenire dalla Smart Card
    const resendCachedEfff = getCachedEfffData();
    const resendIsRca = original.transmissionType === 'rca';
    let resendResolvedSystemCode: string;
    
    // FIX 2026-01-18: TUTTI i report sono firmati S/MIME, usa resolveSystemCodeForSmime
    const smimeResult = resolveSystemCodeForSmime(resendCachedEfff, systemConfig ? { systemCode: systemConfig.systemCode ?? undefined } : null);
    if (!smimeResult.success || !smimeResult.systemCode) {
      console.error(`[SIAE-ROUTES] Resend BLOCCO ${original.transmissionType}: ${smimeResult.error}`);
      return res.status(400).json({
        message: smimeResult.error || 'Smart Card richiesta per reinvio trasmissioni S/MIME',
        code: 'SMARTCARD_REQUIRED_FOR_SMIME'
      });
    }
    resendResolvedSystemCode = smimeResult.systemCode;
    if (smimeResult.warning) {
      console.warn(`[SIAE-ROUTES] Resend ${original.transmissionType} Warning: ${smimeResult.warning}`);
    }
    console.log(`[SIAE-ROUTES] Resend: ${original.transmissionType} systemCode from ${smimeResult.source}: ${resendResolvedSystemCode}`);
    
    // FIX 2026-01-18: Import correct generators based on transmission type
    const { generateRCAXml, generateC1Xml } = await import('./siae-utils');
    
    // Map transmissionType to filename type and validation type
    const getFilenameType = (tt: string): 'rca' | 'mensile' | 'giornaliero' => {
      if (tt === 'monthly') return 'mensile';
      if (tt === 'daily') return 'giornaliero';
      return 'rca';
    };
    const filenameType = getFilenameType(original.transmissionType);
    
    // Variables for XML result
    let generatedXml: string;
    let resendTicketsCount: number;
    let resendTotalAmount: number;
    let resendCancelledCount: number = 0;
    // FIX 2026-01-19: Nome file allegato email ESPLICITO per coerenza con attributo NomeFile nell'XML (errore 0600)
    let resendEmailFileName: string | undefined;
    
    if (original.transmissionType === 'rca') {
      // RCA: Use generateRCAXml
      const eventForLog = {
        id: ticketedEvent.id,
        name: baseEvent?.name || 'Evento',
        date: baseEvent?.startDatetime || new Date(),
        time: baseEvent?.startDatetime || null,
        venueCode: ticketedEvent.siaeLocationCode || '0000000000001',
        genreCode: ticketedEvent.genreCode || 'S1',
        organizerTaxId: taxId,
        organizerName: company?.name || 'N/D',
        tipoTassazione: (ticketedEvent.taxType as 'S' | 'I') || 'S',
        ivaPreassolta: (ticketedEvent.ivaPreassolta as 'N' | 'B' | 'F') || 'N',
      };
      
      const ticketsForRca = eventTickets.map(ticket => ({
        id: ticket.id,
        fiscalSealCode: ticket.fiscalSealCode || null,
        progressiveNumber: ticket.progressiveNumber || 1,
        cardCode: ticket.cardCode || null,
        emissionChannelCode: ticket.emissionChannelCode || null,
        emissionDate: ticket.emissionDate ? new Date(ticket.emissionDate) : new Date(),
        ticketTypeCode: ticket.ticketTypeCode || 'R1',
        sectorCode: ticket.sectorCode || 'A0',
        grossAmount: ticket.grossAmount || '0',
        netAmount: ticket.netAmount || null,
        vatAmount: ticket.vatAmount || null,
        prevendita: ticket.prevendita || '0',
        prevenditaVat: ticket.prevenditaVat || null,
        status: ticket.status || 'emitted',
        cancellationReasonCode: ticket.cancellationReasonCode || null,
        cancellationDate: ticket.cancellationDate || null,
      }));
      
      // TODO: CONSOLIDATION CANDIDATE - usare createSiaeTransmissionWithXml da ./siae-transmission-service
      // La consolidazione richiede: calcolare stats separatamente, gestire isSubstitution, 
      // e passare additionalTransmissionFields per scheduleType, totalIva, totalEsenti, ecc.
      // Per ora mantenuto generateRCAXml diretto per compatibilità con flusso resend esistente
      const rcaResult = generateRCAXml({
        companyId: original.companyId,
        eventId: ticketedEvent.eventId,
        event: eventForLog,
        tickets: ticketsForRca,
        systemConfig: { systemCode: resendResolvedSystemCode ?? undefined },
        companyName: company?.name || 'N/D',
        taxId,
        progressivo: nextProgressivo,
        forceSubstitution: true
      });
      
      generatedXml = rcaResult.xml;
      resendTicketsCount = rcaResult.ticketCount;
      resendTotalAmount = rcaResult.totalGrossAmount;
      resendCancelledCount = rcaResult.cancelledCount;
      
      // FIX 2026-01-19: Genera nome file RCA per coerenza con attributo NomeFile nell'XML (errore 0600)
      const rcaEventDate = baseEvent?.startDatetime ? new Date(baseEvent.startDatetime) : new Date(original.periodDate);
      resendEmailFileName = generateSiaeFileName(
        'rca',
        rcaEventDate,
        nextProgressivo,
        null,
        resendResolvedSystemCode
      );
    } else {
      // Monthly (RPM) or Daily (RMG): Use generateC1Xml with hydrateC1EventContextFromTickets
      const isMonthly = original.transmissionType === 'monthly';
      const reportDate = new Date(original.periodDate);
      
      const hydratedData = await hydrateC1EventContextFromTickets(
        eventTickets,
        original.companyId,
        reportDate,
        isMonthly
      );
      
      // FIX 2026-01-18: Per report giornaliero (RMG), 0 biglietti è permesso
      // Per report mensile (RPM), rimane un errore bloccante
      if (hydratedData.events.length === 0 && hydratedData.subscriptions.length === 0) {
        if (isMonthly) {
          return res.status(400).json({
            message: 'SIAE_NO_EVENTS: Nessun biglietto o abbonamento trovato per il periodo richiesto.',
            code: 'NO_DATA_FOR_PERIOD'
          });
        }
        console.warn('[SIAE-ROUTES] Report giornaliero (resend) senza eventi/abbonamenti - generazione consentita');
      }
      
      // FIX 2026-01-19: Genera nome file PRIMA della generazione XML per attributo NomeFile obbligatorio
      const resendReportType: 'giornaliero' | 'mensile' = isMonthly ? 'mensile' : 'giornaliero';
      const resendPreGeneratedFileName = generateSiaeFileName(
        resendReportType,
        reportDate,
        nextProgressivo,
        null, // senza firma - il nome .xsi è quello che va nell'attributo NomeFile
        resendResolvedSystemCode
      );
      
      // TODO: CONSOLIDATION CANDIDATE - usare createSiaeTransmissionWithXml da ./siae-transmission-service
      // La consolidazione richiede: gestire isSubstitution, originalTransmissionId,
      // e passare additionalTransmissionFields per scheduleType, totalIva, ecc.
      // Per ora mantenuto generateC1Xml diretto per compatibilità con flusso resend esistente
      const c1Result = generateC1Xml({
        reportKind: resendReportType,
        companyId: original.companyId,
        reportDate,
        resolvedSystemCode: resendResolvedSystemCode,
        progressivo: nextProgressivo,
        taxId,
        businessName: company?.name || 'N/D',
        events: hydratedData.events,
        subscriptions: hydratedData.subscriptions,
        // FIX 2026-01-19: Passa nomeFile per attributo NomeFile obbligatorio (errore SIAE 0600)
        nomeFile: resendPreGeneratedFileName,
        // FIX 2026-01-21: Resend = Sostituzione="S" perché stiamo sostituendo un file precedente
        forceSubstitution: true,
      });
      
      generatedXml = c1Result.xml;
      resendTicketsCount = c1Result.stats.ticketsCount;
      resendTotalAmount = c1Result.stats.totalRevenue;
      resendCancelledCount = 0; // C1 doesn't track cancelled separately in result
      
      // FIX 2026-01-19: Usa lo stesso nome file per email e attributo NomeFile (errore 0600)
      resendEmailFileName = resendPreGeneratedFileName;
    }
    
    // FIX 2026-01-18: Validazione DTD pre-trasmissione obbligatoria per tutti i flussi
    const resendPreValidation = await validatePreTransmission(
      generatedXml,
      resendResolvedSystemCode,
      filenameType,
      new Date(original.periodDate)
    );
    if (!resendPreValidation.canTransmit) {
      console.error(`[SIAE-ROUTES] Resend DTD validation failed: ${resendPreValidation.errors.map(e => `[${e.siaeErrorCode || 'ERR'}] ${e.message}`).join('; ')}`);
      return res.status(400).json({
        success: false,
        error: 'Validazione pre-trasmissione fallita',
        errors: resendPreValidation.errors,
        warnings: resendPreValidation.warnings,
        code: 'DTD_VALIDATION_FAILED'
      });
    }
    if (resendPreValidation.warnings.length > 0) {
      console.warn(`[SIAE-ROUTES] Resend DTD warnings: ${resendPreValidation.warnings.map(w => w.message).join('; ')}`);
    }
    
    // Calculate transmission statistics
    const resendStats = await calculateTransmissionStats(
      eventTickets,
      original.companyId,
      original.ticketedEventId,
      ticketedEvent.tipoTassazione,
      ticketedEvent.entertainmentIncidence
    );
    const resendFileHash = calculateFileHash(generatedXml);
    
    // FIX 2026-01-18: Use correct filename type based on transmissionType
    const resendFileName = generateSiaeAttachmentName(filenameType, new Date(original.periodDate), nextProgressivo, null, resendResolvedSystemCode);
    
    // FIX 2026-01-19: Validate file name format before transmission
    const resendFileNameValidation = validateSiaeFileName(resendFileName);
    if (!resendFileNameValidation.valid) {
      console.error(`[SIAE-ROUTES] ERRORE FORMATO NOME FILE RESEND: ${resendFileNameValidation.errors.join('; ')}`);
      return res.status(400).json({
        success: false,
        error: `Formato nome file non valido: ${resendFileNameValidation.errors.join('; ')}`,
        code: 'FILE_NAME_FORMAT_ERROR',
        fileName: resendFileName,
        errors: resendFileNameValidation.errors
      });
    }
    
    // Create new transmission with substitution flag
    const newTransmission = await siaeStorage.createSiaeTransmission({
      companyId: original.companyId,
      ticketedEventId: original.ticketedEventId,
      transmissionType: original.transmissionType,
      periodDate: original.periodDate,
      scheduleType: 'manual',
      isSubstitution: true,
      originalTransmissionId: original.id,
      progressivoInvio: nextProgressivo,
      fileName: resendFileName.replace(/\.xsi(\.p7m)?$/, ''),
      fileExtension: '.xsi',
      fileContent: generatedXml,
      status: 'pending',
      ticketsCount: resendTicketsCount,
      ticketsCancelled: resendCancelledCount,
      totalAmount: resendTotalAmount.toFixed(2),
      systemCode: resendResolvedSystemCode,
      fileHash: resendFileHash,
      totalIva: resendStats.totalIva.toFixed(2),
      totalEsenti: resendStats.totalEsenti.toFixed(2),
      totalImpostaIntrattenimento: resendStats.totalImpostaIntrattenimento.toFixed(2),
      cfOrganizzatore: systemConfig?.taxId || '',
      ticketsChanged: resendStats.ticketsChanged,
      ticketsResold: resendStats.ticketsResold,
    });
    
    console.log(`[SIAE-ROUTES] Created substitution transmission ${newTransmission.id} (progressivo: ${nextProgressivo}) for original ${id}`);
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: newTransmission.companyId,
      userId: user.id,
      action: 'transmission_resent',
      entityType: 'transmission',
      entityId: newTransmission.id,
      description: `Trasmissione sostitutiva creata (progressivo: ${nextProgressivo}) per originale ${id}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    // If toEmail provided, send immediately
    if (toEmail) {
      const { sendSiaeTransmissionEmail } = await import('./email-service');
      
      // FIX 2026-01-18: Use correct validation type based on transmissionType
      const preValidation = await validatePreTransmission(
        generatedXml,
        resendResolvedSystemCode,
        filenameType, // FIX: Use mapped type (rca/mensile/giornaliero)
        original.periodDate
      );
      
      if (!preValidation.canTransmit) {
        await siaeStorage.updateSiaeTransmission(newTransmission.id, {
          status: 'error',
          errorMessage: preValidation.errors.map(e => `[${e.siaeErrorCode || 'ERR'}] ${e.message}`).join('; '),
        });
        return res.status(400).json({
          success: false,
          error: 'Validazione pre-trasmissione fallita',
          errors: preValidation.errors,
          warnings: preValidation.warnings,
          details: preValidation.details
        });
      }
      
      await sendSiaeTransmissionEmail({
        to: toEmail,
        companyName: company?.name || 'N/A',
        transmissionType: original.transmissionType as "monthly" | "daily" | "rca" | "corrective",
        periodDate: original.periodDate,
        ticketsCount: resendTicketsCount, // FIX 2026-01-18: Use unified variable
        totalAmount: resendTotalAmount.toFixed(2), // FIX 2026-01-18: Use unified variable
        xmlContent: generatedXml, // FIX 2026-01-18: Use unified variable
        transmissionId: newTransmission.id,
        systemCode: resendResolvedSystemCode,
        sequenceNumber: nextProgressivo,
        signWithSmime: true,
        requireSignature: true,
        // FIX 2026-01-19: Nome file allegato ESPLICITO per coerenza con attributo NomeFile nell'XML (errore 0600)
        explicitFileName: resendEmailFileName,
      });
      
      await siaeStorage.updateSiaeTransmission(newTransmission.id, {
        status: 'sent',
        sentAt: new Date(),
        sentToPec: toEmail,
      });
      
      console.log(`[SIAE-ROUTES] Sent substitution transmission to ${toEmail}`);
    }
    
    res.status(201).json({
      message: `Trasmissione sostitutiva creata con progressivo ${nextProgressivo}`,
      transmission: newTransmission,
      sent: !!toEmail,
    });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to resend transmission:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/transmissions", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeTransmissionSchema.parse(req.body);
    
    // FIX 2026-01-17: Validazione coerenza systemCode per prevenire errori SIAE 0600/0603
    // Per RCA, il codice DEVE provenire dalla Smart Card
    if (data.fileContent && typeof data.fileContent === 'string') {
      const systemConfig = await siaeStorage.getSiaeSystemConfig(data.companyId);
      const postCachedEfff = getCachedEfffData();
      const postIsRca = data.transmissionType === 'rca';
      let postResolvedSystemCode: string;
      
      // FIX 2026-01-18: TUTTI i report sono firmati S/MIME, usa resolveSystemCodeForSmime
      const smimeResult = resolveSystemCodeForSmime(postCachedEfff, systemConfig ? { systemCode: systemConfig.systemCode ?? undefined } : null);
      if (!smimeResult.success || !smimeResult.systemCode) {
        console.error(`[SIAE-ROUTES] POST BLOCCO ${data.transmissionType}: ${smimeResult.error}`);
        return res.status(400).json({
          message: smimeResult.error || 'Smart Card richiesta per trasmissioni S/MIME',
          code: 'SMARTCARD_REQUIRED_FOR_SMIME'
        });
      }
      postResolvedSystemCode = smimeResult.systemCode;
      
      const systemCodeValidation = validateSystemCodeConsistency(data.fileContent, postResolvedSystemCode);
      if (!systemCodeValidation.valid) {
        console.error(`[SIAE-ROUTES] POST transmissions: ${systemCodeValidation.error}`);
        return res.status(400).json({
          message: "System code is required for transmission creation",
          error: systemCodeValidation.error,
          xmlSystemCode: systemCodeValidation.xmlSystemCode,
          expectedSystemCode: systemCodeValidation.filenameSystemCode,
          code: "SYSTEM_CODE_MISMATCH"
        });
      }
      console.log(`[SIAE-ROUTES] POST transmissions: SystemCode validated - XML=${systemCodeValidation.xmlSystemCode}, expected=${postResolvedSystemCode}`);
      
      // FIX 2026-01-18: Validazione DTD pre-trasmissione obbligatoria
      const postReportType: 'giornaliero' | 'mensile' | 'rca' = data.transmissionType === 'rca' ? 'rca' : (data.transmissionType === 'monthly' ? 'mensile' : 'giornaliero');
      const postPreValidation = await validatePreTransmission(
        data.fileContent,
        postResolvedSystemCode,
        postReportType,
        data.periodDate ? new Date(data.periodDate) : new Date()
      );
      if (!postPreValidation.canTransmit) {
        console.error(`[SIAE-ROUTES] POST DTD validation failed: ${postPreValidation.errors.map(e => `[${e.siaeErrorCode || 'ERR'}] ${e.message}`).join('; ')}`);
        return res.status(400).json({
          success: false,
          error: 'Validazione pre-trasmissione fallita',
          errors: postPreValidation.errors,
          warnings: postPreValidation.warnings,
          code: 'DTD_VALIDATION_FAILED'
        });
      }
      if (postPreValidation.warnings.length > 0) {
        console.warn(`[SIAE-ROUTES] POST DTD warnings: ${postPreValidation.warnings.map(w => w.message).join('; ')}`);
      }
    }
    
    const transmission = await siaeStorage.createSiaeTransmission(data);
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: transmission.companyId,
      userId: user.id,
      action: 'transmission_created',
      entityType: 'transmission',
      entityId: transmission.id,
      description: `Trasmissione creata: ${transmission.transmissionType || 'RCA'} - ${transmission.fileName || 'N/D'}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(transmission);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/transmissions/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const data = patchTransmissionSchema.parse(req.body);
    const transmission = await siaeStorage.updateSiaeTransmission(req.params.id, data);
    if (!transmission) {
      return res.status(404).json({ message: "Trasmissione non trovata" });
    }
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: transmission.companyId,
      userId: user.id,
      action: 'transmission_updated',
      entityType: 'transmission',
      entityId: transmission.id,
      description: `Trasmissione aggiornata: ${transmission.transmissionType || 'RCA'}${data.status ? ` (status: ${data.status})` : ''}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(transmission);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Send XML transmission via email (with optional digital signature)
router.post("/api/siae/transmissions/:id/send-email", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { toEmail } = req.body;
    
    // Get the transmission
    const transmissions = await siaeStorage.getSiaeTransmissionsByCompany(req.body.companyId || '');
    const transmission = transmissions.find(t => t.id === id);
    
    if (!transmission) {
      return res.status(404).json({ message: "Trasmissione non trovata" });
    }
    
    if (!transmission.fileContent) {
      return res.status(400).json({ message: "Trasmissione senza contenuto XML" });
    }
    
    // Check international exemption - get eventId from ticketedEvent if available
    let sendEmailEventId: string | null = null;
    if (transmission.ticketedEventId) {
      const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(transmission.ticketedEventId);
      sendEmailEventId = ticketedEvent?.eventId || null;
    }
    const intlCheck = await checkInternationalExemption(sendEmailEventId, transmission.companyId);
    if (intlCheck.exempt) {
      return res.status(400).json({ message: intlCheck.reason, code: 'INTERNATIONAL_EXEMPT' });
    }
    
    // Get company name
    const company = await storage.getCompany(transmission.companyId);
    const companyName = company?.name || 'N/A';
    
    // FIX 2026-01-17: Per RCA (S/MIME), il systemCode DEVE provenire dalla Smart Card
    const systemConfig = await siaeStorage.getSiaeSystemConfig(transmission.companyId);
    let resolvedSystemCodeForEmail: string;
    const isRcaTransmission = transmission.transmissionType === 'rca';
    
    if (transmission.systemCode && transmission.systemCode.length === 8) {
      // Usa il systemCode salvato nella trasmissione (preferito per coerenza con XML esistente)
      resolvedSystemCodeForEmail = transmission.systemCode;
      console.log(`[SIAE-ROUTES] SendEmail: Using SAVED systemCode=${resolvedSystemCodeForEmail} from transmission record`);
    } else {
      // FIX 2026-01-18: TUTTI i report sono firmati S/MIME, DEVE usare Smart Card
      const sendEmailCachedEfff = getCachedEfffData();
      const smimeResult = resolveSystemCodeForSmime(sendEmailCachedEfff, systemConfig ? { systemCode: systemConfig.systemCode ?? undefined } : null);
      if (!smimeResult.success || !smimeResult.systemCode) {
        console.error(`[SIAE-ROUTES] SendEmail BLOCCO ${transmission.transmissionType}: ${smimeResult.error}`);
        return res.status(400).json({
          message: smimeResult.error || 'Smart Card richiesta per trasmissioni S/MIME',
          code: 'SMARTCARD_REQUIRED_FOR_SMIME'
        });
      }
      resolvedSystemCodeForEmail = smimeResult.systemCode;
      if (smimeResult.warning) {
        console.warn(`[SIAE-ROUTES] SendEmail ${transmission.transmissionType} Warning: ${smimeResult.warning}`);
      }
      console.log(`[SIAE-ROUTES] SendEmail: ${transmission.transmissionType} systemCode from ${smimeResult.source}: ${resolvedSystemCodeForEmail}`);
    }
    
    // CRITICAL FIX: Rigenera SEMPRE l'XML obbligatoriamente per garantire formato corretto
    // LogTransazione causa errore SIAE 40605 "Il riepilogo risulta illegibile"
    let xmlContent = transmission.fileContent;
    let regeneratedXml = false;
    
    // RIGENERAZIONE OBBLIGATORIA: Se abbiamo eventId, rigenera SEMPRE l'XML
    if (transmission.ticketedEventId) {
      console.log(`[SIAE-ROUTES] RIGENERAZIONE OBBLIGATORIA XML per trasmissione ${id}...`);
      console.log(`[SIAE-ROUTES] Transmission type: ${transmission.transmissionType}, eventId: ${transmission.ticketedEventId}`);
        
        // Rigenerazione XML RCA
        try {
          const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(transmission.ticketedEventId);
          if (!ticketedEvent) {
            return res.status(400).json({ message: "Evento SIAE non trovato per rigenerazione XML" });
          }
          
          const baseEvent = await storage.getEvent(ticketedEvent.eventId);
          const allTickets = await siaeStorage.getSiaeTicketsByCompany(transmission.companyId);
          const eventTickets = allTickets.filter(t => t.ticketedEventId === transmission.ticketedEventId);
          // systemConfig già recuperato sopra
          const activationCards = await siaeStorage.getSiaeActivationCardsByCompany(transmission.companyId);
          const activeCard = activationCards.find(c => c.status === 'active');
          const taxId = systemConfig?.taxId || company?.fiscalCode || company?.taxId || '';
          
          // Prepare SiaeEventForLog with correct interface fields
          const eventForLog: SiaeEventForLog = {
            id: ticketedEvent.id,
            name: baseEvent?.name || 'N/D',
            date: baseEvent?.startDatetime ? new Date(baseEvent.startDatetime) : new Date(),
            time: baseEvent?.startDatetime ? new Date(baseEvent.startDatetime) : null,
            venueCode: ticketedEvent.siaeLocationCode || '0000000000001',
            genreCode: ticketedEvent.genreCode || 'S1',
            organizerTaxId: taxId,
            organizerName: companyName,
            tipoTassazione: (ticketedEvent.taxType as 'S' | 'I') || 'S',
            ivaPreassolta: (ticketedEvent.ivaPreassolta as 'N' | 'B' | 'F') || 'N',
          };
          
          // Convert tickets to SiaeTicketForLog[] with correct interface fields
          const ticketsForLog: SiaeTicketForLog[] = eventTickets.map(t => {
            // Determina lo status corretto: se ha motivo/data annullamento, è annullato
            let effectiveStatus = t.status || 'emitted';
            if (!isCancelledStatus(effectiveStatus) && (t.cancellationReasonCode || t.cancellationDate)) {
              effectiveStatus = 'cancelled';
            }
            
            return {
              id: t.id,
              fiscalSealCode: t.fiscalSealCode || null,
              progressiveNumber: t.progressiveNumber || 1,
              cardCode: t.cardCode || activeCard?.cardCode || null,
              emissionChannelCode: t.emissionChannelCode || null,
              emissionDate: t.emissionDate ? new Date(t.emissionDate) : new Date(),
              ticketTypeCode: t.ticketTypeCode || 'R1',
              sectorCode: t.sectorCode || 'A0',
              grossAmount: t.grossAmount || '0',
              netAmount: t.netAmount || null,
              vatAmount: t.vatAmount || null,
              prevendita: t.prevendita || '0',
              prevenditaVat: t.prevenditaVat || null,
              status: effectiveStatus,
              cancellationReasonCode: t.cancellationReasonCode || null,
              cancellationDate: t.cancellationDate || null,
              isComplimentary: t.isComplimentary || false,
              row: t.row || null,
              seatNumber: t.seatNumber || null,
              participantFirstName: t.participantFirstName || null,
              participantLastName: t.participantLastName || null,
              originalTicketId: t.originalTicketId || null,
              replacedByTicketId: t.replacedByTicketId || null,
              originalProgressiveNumber: t.progressiveNumber || null,
            };
          });
          
          // Calculate progressivo for RCA based on previous transmissions for this event
          // Per errore 40604 "riepilogo già elaborato": 
          // - Sostituzione="S" non basta, SIAE richiede anche ProgressivoRiepilogo incrementato
          const allTransmissions = await siaeStorage.getSiaeTransmissionsByCompany(transmission.companyId);
          const rcaTransmissionsForEvent = allTransmissions.filter(t => 
            t.transmissionType === 'rca' && t.ticketedEventId === transmission.ticketedEventId
          );
          // Per reinvio: incrementa progressivo rispetto alle trasmissioni precedenti
          const rcaProgressivo = rcaTransmissionsForEvent.length + 1;
          console.log(`[SIAE-ROUTES] RCA progressivo per reinvio: ${rcaProgressivo} (trasmissioni precedenti: ${rcaTransmissionsForEvent.length})`);
          
          // Generate RCA XML (RiepilogoControlloAccessi format) con Sostituzione="S"
          // Usa resolvedSystemCodeForEmail già calcolato all'inizio della funzione
          // TODO: NON APPLICABILE per consolidation - questo flusso aggiorna una trasmissione ESISTENTE 
          // (siaeStorage.updateSiaeTransmission) invece di crearne una nuova.
          // La funzione createSiaeTransmissionWithXml crea NUOVE trasmissioni.
          const rcaResult = generateRCAXml({
            companyId: transmission.companyId,
            eventId: ticketedEvent.id,
            event: eventForLog,
            tickets: ticketsForLog,
            systemConfig: {
              systemCode: resolvedSystemCodeForEmail, // FIX: Usa codice risolto per coerenza
              taxId: taxId,
              businessName: systemConfig?.businessName || companyName,
            },
            companyName,
            taxId,
            progressivo: rcaProgressivo, // Progressivo incrementato per reinvio
            forceSubstitution: true, // Reinvio = sempre Sostituzione="S"
          });
          
          xmlContent = rcaResult.xml;
          regeneratedXml = true;
          
          // AUTO-CORREZIONE PREVENTIVA: Correggi automaticamente errori comuni prima dell'invio
          const autoCorrectionEmail = autoCorrectSiaeXml(xmlContent, eventForLog.genreCode);
          if (autoCorrectionEmail.corrections.length > 0) {
            console.log(`[SIAE-ROUTES] AUTO-CORREZIONE: Applicate ${autoCorrectionEmail.corrections.length} correzioni automatiche per RCA email:`);
            for (const corr of autoCorrectionEmail.corrections) {
              console.log(`  - ${corr.field}: ${corr.reason} (previene errore SIAE ${corr.siaeErrorPrevented})`);
            }
            xmlContent = autoCorrectionEmail.correctedXml;
          }
          if (autoCorrectionEmail.uncorrectableErrors.length > 0) {
            console.log(`[SIAE-ROUTES] ERRORI NON CORREGGIBILI: ${autoCorrectionEmail.uncorrectableErrors.map(e => e.message).join('; ')}`);
          }
          
          // Aggiorna il database con l'XML corretto
          await siaeStorage.updateSiaeTransmission(id, {
            fileContent: xmlContent,
            p7mContent: null, // Invalida la vecchia firma
            signedAt: null,
          });
          
        console.log(`[SIAE-ROUTES] RCA XML regenerated successfully with ${rcaResult.ticketCount} tickets`);
        console.log(`[SIAE-ROUTES] Regenerated XML Preview: ${xmlContent.substring(0, 300)}`);
        
      } catch (regenError: any) {
        console.error(`[SIAE-ROUTES] Failed to regenerate RCA XML: ${regenError.message}`);
        return res.status(400).json({ 
          message: `Impossibile rigenerare l'XML RCA: ${regenError.message}. Genera una nuova trasmissione dalla pagina dell'evento.`,
          code: "RCA_REGENERATION_FAILED"
        });
      }
    }
    
    // CRITICAL FIX: Rimuovi DOCTYPE dall'XML se presente
    // I Web Service SIAE non risolvono DTD esterni (XXE protection) - causa errore 40605
    if (xmlContent.includes('<!DOCTYPE')) {
      console.log(`[SIAE-ROUTES] Removing DOCTYPE from XML (WS SIAE non risolve DTD esterni)`);
      xmlContent = xmlContent.replace(/<!DOCTYPE[^>]*>/g, '');
      // Aggiorna il database con l'XML senza DOCTYPE
      await siaeStorage.updateSiaeTransmission(id, {
        fileContent: xmlContent,
        p7mContent: null, // Invalida la vecchia firma
        signedAt: null,
      });
      regeneratedXml = true; // Forza nuova firma
    }
    
    // Try to digitally sign the XML using smart card
    let signatureInfo = '';
    let p7mBase64: string | undefined;
    let signedXmlContent: string | undefined;
    
    try {
      if (isBridgeConnected()) {
        console.log(`[SIAE-ROUTES] Bridge connected, attempting digital signature...`);
        // Usa xmlContent (potrebbe essere rigenerato per RCA)
        const signatureResult = await requestXmlSignature(xmlContent);
        
        // Supporta sia CAdES-BES (nuovo) che XMLDSig (legacy)
        if (signatureResult.p7mBase64) {
          // CAdES-BES: mantieni il P7M Base64 separato
          p7mBase64 = signatureResult.p7mBase64;
          signatureInfo = ` (firmato CAdES-BES ${signatureResult.algorithm || 'SHA-256'})`;
          console.log(`[SIAE-ROUTES] CAdES-BES signature created at ${signatureResult.signedAt}`);
        } else if (signatureResult.signedXml) {
          // Legacy XMLDSig (deprecato)
          signedXmlContent = signatureResult.signedXml;
          signatureInfo = ' (firmato XMLDSig - DEPRECATO)';
          console.log(`[SIAE-ROUTES] XMLDSig signature created at ${signatureResult.signedAt}`);
        }
        
        // Update transmission with signed content
        if (p7mBase64 || signedXmlContent) {
          await siaeStorage.updateSiaeTransmission(id, {
            fileContent: signedXmlContent || xmlContent,
            p7mContent: p7mBase64 || null, // Salva P7M per resend offline
            signatureFormat: p7mBase64 ? 'cades' : 'xmldsig',
            signedAt: new Date(),
          });
        }
      } else {
        console.log(`[SIAE-ROUTES] Bridge not connected, checking for existing signature...`);
        // Se il bridge è offline E l'XML NON è stato rigenerato, prova a usare la firma salvata
        // Se l'XML è stato rigenerato, la vecchia firma non è più valida
        if (!regeneratedXml && transmission.p7mContent) {
          p7mBase64 = transmission.p7mContent;
          signatureInfo = ' (firma CAdES-BES da cache)';
          console.log(`[SIAE-ROUTES] Using cached CAdES-BES signature from database`);
        } else if (!regeneratedXml && transmission.signatureFormat === 'xmldsig') {
          signedXmlContent = xmlContent;
          signatureInfo = ' (firma XMLDSig da cache)';
          console.log(`[SIAE-ROUTES] Using cached XMLDSig signature`);
        } else if (regeneratedXml) {
          console.log(`[SIAE-ROUTES] XML was regenerated, cached signature is invalid - need fresh signature`);
          return res.status(400).json({ 
            message: "L'XML RCA è stato rigenerato con il formato corretto, ma il bridge desktop non è connesso per la nuova firma digitale. Connetti il bridge desktop e riprova.",
            code: "BRIDGE_REQUIRED_FOR_REGENERATED_XML"
          });
        } else {
          console.log(`[SIAE-ROUTES] No cached signature found, sending unsigned XML`);
        }
      }
    } catch (signError: any) {
      console.warn(`[SIAE-ROUTES] Digital signature failed: ${signError.message}`);
      // Fallback a firma salvata se disponibile E l'XML non è stato rigenerato
      if (!regeneratedXml && transmission.p7mContent) {
        p7mBase64 = transmission.p7mContent;
        signatureInfo = ' (firma CAdES-BES da cache dopo errore)';
      }
    }
    
    // Import email service
    const { sendSiaeTransmissionEmail } = await import('./email-service');
    
    // Validazione pre-trasmissione SIAE (async per DTD validator)
    // FIX 2026-01-15: Usa resolvedSystemCodeForEmail (già calcolato all'inizio) invece di transmission.systemCode
    // Questo garantisce coerenza tra XML rigenerato, nome file allegato e subject email
    const transmissionReportType: 'giornaliero' | 'mensile' | 'rca' = 
      transmission.transmissionType === 'monthly' ? 'mensile' : 
      transmission.transmissionType === 'daily' ? 'giornaliero' : 'rca';
    const preValidation = await validatePreTransmission(
      signedXmlContent || xmlContent,
      resolvedSystemCodeForEmail,
      transmissionReportType,
      new Date(transmission.periodDate)
    );
    
    if (!preValidation.canTransmit) {
      await siaeStorage.updateSiaeTransmission(transmission.id, {
        status: 'error',
        errorMessage: preValidation.errors.map(e => `[${e.siaeErrorCode || 'ERR'}] ${e.message}`).join('; '),
      });
      return res.status(400).json({
        success: false,
        error: 'Validazione pre-trasmissione fallita',
        errors: preValidation.errors,
        warnings: preValidation.warnings,
        details: preValidation.details
      });
    }
    
    // Send the email to SIAE test environment
    const destinationEmail = getSiaeDestinationEmail(toEmail);
    
    // FIX 2026-01-19: Genera nome file allegato email conforme Allegato C SIAE
    // L'attributo NomeFile è stato rimosso dall'XML per conformità DTD ufficiale
    // Il nome file corretto viene usato SOLO per l'allegato email
    const progressivoInvio = (transmission as any).progressivoInvio || transmission.sequenceNumber || 1;
    const sendEmailFileName = generateSiaeFileName(
      transmissionReportType,
      new Date(transmission.periodDate),
      progressivoInvio,
      null,
      resolvedSystemCodeForEmail
    );
    console.log(`[SIAE-ROUTES] Nome file allegato email generato: ${sendEmailFileName}`);
    
    const emailResult = await sendSiaeTransmissionEmail({
      to: destinationEmail,
      companyName,
      transmissionType: transmission.transmissionType as 'daily' | 'monthly' | 'corrective',
      periodDate: new Date(transmission.periodDate),
      ticketsCount: transmission.ticketsCount || 0,
      totalAmount: transmission.totalAmount || '0',
      xmlContent: signedXmlContent || xmlContent, // Usa xmlContent (potrebbe essere rigenerato)
      transmissionId: transmission.id,
      systemCode: resolvedSystemCodeForEmail, // FIX 2026-01-15: systemCode obbligatorio per nome file allegato
      p7mBase64: p7mBase64, // CAdES-BES P7M per allegato email
      signatureFormat: p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : undefined),
      signWithSmime: true,
      requireSignature: true,
      // FIX 2026-01-19: Nome file allegato ESPLICITO conforme Allegato C SIAE
      explicitFileName: sendEmailFileName,
    });
    
    if (!emailResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: emailResult.error || 'Invio email fallito - Firma S/MIME richiesta'
      });
    }
    
    console.log(`[SIAE-ROUTES] Transmission sent to: ${destinationEmail}${signatureInfo} (Test mode: ${SIAE_TEST_MODE})`);
    
    // Update transmission status to sent
    await siaeStorage.updateSiaeTransmission(id, {
      status: 'sent',
      sentAt: new Date(),
      sentToPec: destinationEmail,
    });
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: transmission.companyId,
      userId: user.id,
      action: 'transmission_sent',
      entityType: 'transmission',
      entityId: id,
      description: `Trasmissione ${transmission.transmissionType} inviata a ${destinationEmail}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({ success: true, message: `Email inviata con successo${signatureInfo}` });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to send transmission email:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== C1 Transmission Handler (Shared Logic) ====================
// Shared handler for generating and sending C1 transmissions (daily, monthly, or RCA)
// Used by both /send-c1 and legacy /send-daily endpoints
// RCA = RiepilogoControlloAccessi for single event (SIAE responds with Log.xsi)
// RMG = Riepilogo Giornaliero (silent)
// RPM = Riepilogo Mensile (silent)
interface SendC1Params {
  companyId: string;
  date?: string;
  toEmail?: string;
  type?: 'daily' | 'monthly' | 'rca';
  eventId?: string; // Required for RCA type
  signWithSmartCard?: boolean;
  forceSubstitution?: boolean; // Forza Sostituzione="S" per reinvio report già elaborati (errore 40604)
}

async function handleSendC1Transmission(params: SendC1Params): Promise<{
  success: boolean;
  statusCode: number;
  data?: any;
  error?: string;
}> {
  const { companyId, date, toEmail, type = 'daily', eventId, signWithSmartCard = true, forceSubstitution = false } = params;
  const isMonthly = type === 'monthly';
  const isRCA = type === 'rca';
  
  // RCA requires eventId
  if (isRCA && !eventId) {
    return { success: false, statusCode: 400, error: "EventId richiesto per report RCA" };
  }
  
  const reportDate = date ? new Date(date) : new Date();
  reportDate.setHours(0, 0, 0, 0);
  
  // Get activation card for company
  const activationCards = await siaeStorage.getSiaeActivationCardsByCompany(companyId);
  const activeCard = activationCards.find(c => c.status === 'active');
  
  if (!activeCard) {
    return { success: false, statusCode: 400, error: "Nessuna carta di attivazione attiva trovata" };
  }
  
  // Get system config for fiscal code
  const systemConfig = await siaeStorage.getSiaeSystemConfig(companyId);
  const company = await storage.getCompany(companyId);
  const companyName = company?.name || 'N/A';
  
  // CONTROLLO OBBLIGATORIO: Codice Fiscale/P.IVA Emittente
  // Priorità: systemConfig.taxId > company.fiscalCode (16 char) > company.taxId
  const taxId = systemConfig?.taxId || company?.fiscalCode || company?.taxId;
  if (!taxId) {
    return { 
      success: false, 
      statusCode: 400, 
      error: "Codice Fiscale Emittente non configurato. Vai su Impostazioni SIAE > Dati Aziendali per configurarlo prima di generare report.",
      data: { code: "TAX_ID_REQUIRED" }
    };
  }
  
  // Get tickets based on report type
  // RCA: single event by eventId
  // RMG/RPM: date range filtering by EVENT DATE (not emission date)
  const allTickets = await siaeStorage.getSiaeTicketsByCompany(companyId);
  
  // Pre-fetch all ticketed events to get their event dates and IDs
  const ticketedEventsMap = new Map<string, { eventDate: Date; eventId: string }>();
  const uniqueTicketedEventIds = Array.from(new Set(allTickets.map(t => t.ticketedEventId).filter(Boolean)));
  
  for (const ticketedEventId of uniqueTicketedEventIds) {
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(ticketedEventId);
    if (ticketedEvent) {
      const eventDetails = await storage.getEvent(ticketedEvent.eventId);
      if (eventDetails) {
        ticketedEventsMap.set(ticketedEventId, { 
          eventDate: new Date(eventDetails.startDatetime),
          eventId: ticketedEvent.eventId
        });
      }
    }
  }
  
  let filteredTickets: typeof allTickets;
  let rcaEventName = '';
  let rcaEventDate: Date | null = null;
  
  if (isRCA && eventId) {
    // RCA: filter by specific SIAE ticketed event ID
    const rcaTicketedEvent = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!rcaTicketedEvent) {
      return { success: false, statusCode: 400, error: "Evento ticketed non trovato" };
    }
    
    // Security validation: verify event belongs to requesting company
    if (rcaTicketedEvent.companyId !== companyId) {
      return { success: false, statusCode: 403, error: "Accesso non autorizzato: l'evento non appartiene a questa azienda" };
    }
    
    // Status validation: verify event is closed/completed for RCA
    // Allow both 'closed' ticketingStatus OR if the base event status is 'closed'
    const baseEvent = await storage.getEvent(rcaTicketedEvent.eventId);
    const eventIsClosed = rcaTicketedEvent.ticketingStatus === 'closed' || baseEvent?.status === 'closed';
    
    console.log(`[SIAE-ROUTES] RCA validation: ticketingStatus=${rcaTicketedEvent.ticketingStatus}, eventStatus=${baseEvent?.status}, eventIsClosed=${eventIsClosed}`);
    
    if (!eventIsClosed) {
      return { success: false, statusCode: 400, error: "L'evento deve essere chiuso per generare il report RCA. Stato attuale biglietteria: " + rcaTicketedEvent.ticketingStatus + ", stato evento: " + (baseEvent?.status || 'sconosciuto') };
    }
    
    const rcaEventDetails = await storage.getEvent(rcaTicketedEvent.eventId);
    if (rcaEventDetails) {
      rcaEventName = rcaEventDetails.name;
      rcaEventDate = new Date(rcaEventDetails.startDatetime);
    }
    
    // NORMATIVA SIAE: Il report C1 DEVE includere TUTTI i biglietti, inclusi gli annullati
    // I biglietti annullati vengono conteggiati separatamente nella sezione TotaleTitoliAnnullati
    // Provvedimento 04/03/2008 - Allegato B: sezione Annullati obbligatoria
    filteredTickets = allTickets.filter(t => t.ticketedEventId === eventId);
    
    const validTicketsCount = filteredTickets.filter(t => !isCancelledStatus(t.status)).length;
    const cancelledTicketsCount = filteredTickets.filter(t => isCancelledStatus(t.status)).length;
    console.log(`[SIAE-ROUTES] RCA report for event "${rcaEventName}" - ${filteredTickets.length} total tickets (${validTicketsCount} valid, ${cancelledTicketsCount} annullati - INCLUSI per normativa)`);
  } else {
    // RMG/RPM: Calculate date range and filter
    let startDate: Date, endDate: Date;
    if (isMonthly) {
      // For monthly: entire month
      startDate = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
      endDate = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // For daily: single day
      startDate = new Date(reportDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(reportDate);
      endDate.setHours(23, 59, 59, 999);
    }
    
    filteredTickets = allTickets.filter(t => {
      // Use EVENT DATE for filtering (not ticket emission date)
      const eventInfo = ticketedEventsMap.get(t.ticketedEventId);
      if (!eventInfo) return false;
      
      const eventDate = eventInfo.eventDate;
      return eventDate >= startDate && eventDate <= endDate;
    });
  }
  
  const now = new Date();
  const oraGen = now.toTimeString().split(' ')[0].replace(/:/g, '');
  
  // Calculate totals
  const totalAmount = filteredTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0);
  
  // For RCA, use the event date as report date
  const effectiveReportDate = isRCA && rcaEventDate ? rcaEventDate : reportDate;
  
  // Validate eventId for RCA type (required)
  if (isRCA && !eventId) {
    return {
      success: false,
      statusCode: 400,
      error: 'eventId è obbligatorio per trasmissioni RCA',
      data: { code: 'MISSING_EVENT_ID' }
    };
  }
  
  // Generate XML using appropriate function based on type
  let xml: string;
  // FIX 2026-01-14: Calcola il progressivo UNA SOLA VOLTA e riusa per XML e nome file
  let calculatedProgressivo: number;
  // FIX 2026-01-19: Nome file allegato email ESPLICITO per coerenza con attributo NomeFile nell'XML (errore 0600)
  let emailFileName: string | undefined;
  
  // FIX 2026-01-18: Legge ATTIVAMENTE il file EFFF dalla Smart Card
  // Il systemId non viene inviato nello status automatico, serve richiesta esplicita READ_EFFF
  const { getCachedEfffData, requestCardEfffData } = await import('./bridge-relay');
  
  let efffData: { systemId?: string } | null = null;
  
  // Prima prova a leggere EFFF dalla Smart Card (richiesta attiva)
  try {
    console.log(`[SIAE-ROUTES] Requesting EFFF data from Smart Card...`);
    const freshEfffData = await requestCardEfffData();
    if (freshEfffData?.systemId) {
      console.log(`[SIAE-ROUTES] EFFF read successful: systemId=${freshEfffData.systemId}`);
      efffData = freshEfffData;
    } else {
      console.warn(`[SIAE-ROUTES] EFFF read returned but no systemId`);
      efffData = getCachedEfffData(); // Fallback alla cache
    }
  } catch (efffError: any) {
    console.warn(`[SIAE-ROUTES] EFFF read failed: ${efffError.message}`);
    // Fallback alla cache se la lettura attiva fallisce
    efffData = getCachedEfffData();
  }
  
  // FIX 2026-01-18: TUTTI i report (RCA, RMG, RPM) sono firmati S/MIME
  // Quindi il system code DEVE provenire dalla Smart Card per TUTTI i tipi
  // Usare siaeConfig.systemCode con Smart Card diversa causa errore SIAE 0600
  let preResolvedSystemCode: string;
  const smimeResult = resolveSystemCodeForSmime(efffData, systemConfig ? { systemCode: systemConfig.systemCode ?? undefined } : null);
  
  if (!smimeResult.success || !smimeResult.systemCode) {
    console.error(`[SIAE-ROUTES] BLOCCO ${type.toUpperCase()}: ${smimeResult.error}`);
    return {
      success: false,
      statusCode: 400,
      error: smimeResult.error || 'Smart Card richiesta per trasmissioni SIAE',
      data: {
        code: 'SMARTCARD_REQUIRED_FOR_SMIME',
        reportType: type,
        source: smimeResult.source,
        suggestion: 'Collegare la Smart Card SIAE tramite Desktop Bridge prima di inviare report'
      }
    };
  }
  preResolvedSystemCode = smimeResult.systemCode;
  if (smimeResult.warning) {
    console.warn(`[SIAE-ROUTES] ${type.toUpperCase()} Warning: ${smimeResult.warning}`);
  }
  console.log(`[SIAE-ROUTES] FIX 2026-01-18: ${type.toUpperCase()} system code from ${smimeResult.source}: ${preResolvedSystemCode}`)
  
  // FIX 2026-01-16: Valida codice sistema PRIMA della generazione XML
  // Il codice default EVENT4U1 NON è registrato presso SIAE e causa errore 0600
  const systemCodeValidationResult = validateSiaeSystemCode(preResolvedSystemCode);
  if (!systemCodeValidationResult.valid) {
    console.error(`[SIAE-ROUTES] BLOCCO TRASMISSIONE: Codice sistema non valido - ${systemCodeValidationResult.error}`);
    return {
      success: false,
      statusCode: 400,
      error: systemCodeValidationResult.error,
      data: {
        code: 'INVALID_SYSTEM_CODE',
        systemCode: preResolvedSystemCode,
        isDefault: systemCodeValidationResult.isDefault,
        isTestCode: systemCodeValidationResult.isTestCode,
        suggestion: systemCodeValidationResult.isDefault 
          ? 'Configurare il codice sistema SIAE in Impostazioni > SIAE > Configurazione Sistema, oppure collegare una Smart Card di attivazione attiva tramite il Desktop Bridge.'
          : 'Verificare il formato del codice sistema. Codici test: P + 7 cifre (es: P0004010)'
      }
    };
  }
  console.log(`[SIAE-ROUTES] Codice sistema validato: ${preResolvedSystemCode} (test: ${systemCodeValidationResult.isTestCode})`);
  
  if (isRCA && eventId) {
    // RCA: Use RiepilogoControlloAccessi format per DTD ControlloAccessi_v0001_20080626.dtd
    // NOTA: NON usare LogTransazione per RCA - causa errore SIAE 40605
    // Fetch ticketed event and base event for SiaeEventForLog
    const rcaTicketedEvent = await siaeStorage.getSiaeTicketedEvent(eventId);
    const rcaEventDetails = rcaTicketedEvent ? await storage.getEvent(rcaTicketedEvent.eventId) : null;
    
    // Prepare SiaeEventForLog
    const eventForLog: SiaeEventForLog = {
      id: eventId,
      name: rcaEventDetails?.name || 'N/D',
      date: rcaEventDetails?.startDatetime ? new Date(rcaEventDetails.startDatetime) : new Date(),
      time: rcaEventDetails?.startDatetime ? new Date(rcaEventDetails.startDatetime) : null,
      venueCode: rcaTicketedEvent?.siaeLocationCode || '0000000000001',
      genreCode: rcaTicketedEvent?.genreCode || 'S1',
      organizerTaxId: taxId,
      organizerName: companyName,
      tipoTassazione: (rcaTicketedEvent?.taxType as 'S' | 'I') || 'S',
      ivaPreassolta: (rcaTicketedEvent?.ivaPreassolta as 'N' | 'B' | 'F') || 'N',
    };
    
    // Convert filteredTickets to SiaeTicketForLog[]
    // IMPORTANTE: Determinare correttamente lo status per conformità SIAE
    const ticketsForLog: SiaeTicketForLog[] = filteredTickets.map(ticket => {
      // Determina lo status corretto: se ha motivo/data annullamento, è annullato
      let effectiveStatus = ticket.status || 'emitted';
      if (!isCancelledStatus(effectiveStatus) && (ticket.cancellationReasonCode || ticket.cancellationDate)) {
        effectiveStatus = 'cancelled'; // Forza status annullato se ha dati di annullamento
      }
      
      return {
        id: ticket.id,
        fiscalSealCode: ticket.fiscalSealCode || null,
        progressiveNumber: ticket.progressiveNumber || 1,
        cardCode: ticket.cardCode || activeCard?.cardCode || null,
        emissionChannelCode: ticket.emissionChannelCode || null,
        emissionDate: ticket.emissionDate ? new Date(ticket.emissionDate) : new Date(),
        ticketTypeCode: ticket.ticketTypeCode || 'R1',
        sectorCode: ticket.sectorCode || 'A0',
        grossAmount: ticket.grossAmount || '0',
        netAmount: ticket.netAmount || null,
        vatAmount: ticket.vatAmount || null,
        prevendita: ticket.prevendita || '0',
        prevenditaVat: ticket.prevenditaVat || null,
        status: effectiveStatus,
        cancellationReasonCode: ticket.cancellationReasonCode || null,
        cancellationDate: ticket.cancellationDate || null,
        isComplimentary: ticket.isComplimentary || false,
        row: ticket.row || null,
        seatNumber: ticket.seatNumber || null,
        participantFirstName: ticket.participantFirstName || null,
        participantLastName: ticket.participantLastName || null,
        originalTicketId: ticket.originalTicketId || null,
        replacedByTicketId: ticket.replacedByTicketId || null,
        originalProgressiveNumber: ticket.progressiveNumber || null,
      };
    });
    
    // Calculate progressivo for RCA based on previous transmissions for this event
    // Per errore 40604 "riepilogo già elaborato": 
    // - Sostituzione="S" non basta, SIAE richiede anche ProgressivoRiepilogo incrementato
    // FIX: Usa ticketedEventId (campo corretto nello schema) invece di eventId
    const allTransmissions = await siaeStorage.getSiaeTransmissionsByCompany(companyId);
    const rcaTransmissionsForEvent = allTransmissions.filter(t => 
      t.transmissionType === 'rca' && t.ticketedEventId === eventId
    );
    let rcaProgressivo = rcaTransmissionsForEvent.length + 1;
    
    // Se forceSubstitution=true, aggiungi 1 extra per essere sicuri
    // (anche se già incrementato dal conteggio, SIAE potrebbe richiedere progressivo > precedente)
    if (forceSubstitution && rcaProgressivo <= rcaTransmissionsForEvent.length) {
      rcaProgressivo = rcaTransmissionsForEvent.length + 1;
    }
    console.log(`[SIAE-ROUTES] RCA progressivo: ${rcaProgressivo} (trasmissioni precedenti: ${rcaTransmissionsForEvent.length}, forceSubstitution: ${forceSubstitution})`);
    // FIX 2026-01-14: Salva progressivo per riuso nel nome file
    calculatedProgressivo = rcaProgressivo;
    
    // FIX 2026-01-19: Genera nome file RCA per coerenza con attributo NomeFile nell'XML (errore 0600)
    const rcaEventDate = rcaEventDetails?.startDatetime ? new Date(rcaEventDetails.startDatetime) : new Date();
    emailFileName = generateSiaeFileName(
      'rca',
      rcaEventDate,
      rcaProgressivo,
      null, // senza firma - il nome .xsi è quello che va nell'attributo NomeFile
      preResolvedSystemCode
    );
    
    // Generate RCA XML (RiepilogoControlloAccessi format - Allegato B Provvedimento 04/03/2008)
    // NOTA: Usa generateRCAXml invece di generateC1LogXml (deprecato - causa errore SIAE 40605)
    // FIX 2026-01-15: Usa preResolvedSystemCode per coerenza con nome file allegato (errori SIAE 0600/0603)
    // TODO: CONSOLIDATION CANDIDATE - usare createSiaeTransmissionWithXml da ./siae-transmission-service
    // Questa funzione è parte di generateAndSendC1 helper che ritorna XML senza creare trasmissione.
    // La trasmissione viene creata più avanti nel flusso con campi aggiuntivi.
    // Per consolidare: spostare la creazione trasmissione qui e usare il risultato nel resto del flusso.
    const rcaResult = generateRCAXml({
      companyId,
      eventId,
      event: eventForLog,
      tickets: ticketsForLog,
      systemConfig: {
        systemCode: preResolvedSystemCode, // FIX: Usa preResolvedSystemCode invece di systemConfig.systemCode
        taxId: systemConfig?.taxId || taxId,
        businessName: systemConfig?.businessName || companyName,
      },
      companyName,
      taxId,
      progressivo: rcaProgressivo, // Progressivo incrementato per ogni trasmissione
      forceSubstitution, // Forza Sostituzione="S" per reinvio (errore 40604)
    });
    
    if (!rcaResult.success) {
      console.error(`[SIAE-ROUTES] RCA generation failed:`, rcaResult.errors);
      return {
        success: false,
        statusCode: 400,
        error: `Generazione RiepilogoControlloAccessi fallita: ${rcaResult.errors.join('; ')}`,
        data: {
          code: 'RCA_GENERATION_FAILED',
          errors: rcaResult.errors,
          warnings: rcaResult.warnings,
        }
      };
    }
    
    // Log any warnings
    if (rcaResult.warnings.length > 0) {
      console.log(`[SIAE-ROUTES] RCA warnings:`, rcaResult.warnings);
    }
    
    xml = rcaResult.xml;
    
    // AUTO-CORREZIONE PREVENTIVA: Correggi automaticamente errori comuni prima dell'invio
    const autoCorrectionC1 = autoCorrectSiaeXml(xml, eventForLog.genreCode);
    if (autoCorrectionC1.corrections.length > 0) {
      console.log(`[SIAE-ROUTES] AUTO-CORREZIONE: Applicate ${autoCorrectionC1.corrections.length} correzioni automatiche per RCA C1:`);
      for (const corr of autoCorrectionC1.corrections) {
        console.log(`  - ${corr.field}: ${corr.reason} (previene errore SIAE ${corr.siaeErrorPrevented})`);
      }
      xml = autoCorrectionC1.correctedXml;
    }
    if (autoCorrectionC1.uncorrectableErrors.length > 0) {
      console.log(`[SIAE-ROUTES] ERRORI NON CORREGGIBILI: ${autoCorrectionC1.uncorrectableErrors.map(e => e.message).join('; ')}`);
    }
    
    // CRITICAL DIAGNOSTIC: Verify XML format is RiepilogoControlloAccessi (not LogTransazione)
    const xmlRoot = xml.substring(0, 300);
    const isCorrectFormat = xml.includes('<RiepilogoControlloAccessi');
    const hasWrongFormat = xml.includes('<LogTransazione');
    console.log(`[SIAE-ROUTES] RCA XML Format Check: isRiepilogoControlloAccessi=${isCorrectFormat}, hasLogTransazione=${hasWrongFormat}`);
    console.log(`[SIAE-ROUTES] RCA XML Preview: ${xmlRoot}`);
    if (hasWrongFormat) {
      console.error(`[SIAE-ROUTES] CRITICAL ERROR: RCA XML contains LogTransazione instead of RiepilogoControlloAccessi!`);
    }
    console.log(`[SIAE-ROUTES] Generated RiepilogoControlloAccessi for RCA with ${rcaResult.ticketCount} tickets`);
  } else {
    // RMG/RPM: Use existing RiepilogoGiornaliero/RiepilogoMensile format
    // FIX 2026-01-14: Calcola il progressivo PRIMA della generazione XML per coerenza nome file/contenuto
    const transmissionTypeForCalc = isMonthly ? 'monthly' : 'daily';
    const existingTransmissionsForCalc = await siaeStorage.getSiaeTransmissionsByCompany(companyId);
    const sameTypeTransmissionsForCalc = existingTransmissionsForCalc.filter(t => {
      const tDate = new Date(t.periodDate);
      if (isMonthly) {
        // Per mensile, confronta anno e mese
        return t.transmissionType === 'monthly' &&
               tDate.getFullYear() === effectiveReportDate.getFullYear() &&
               tDate.getMonth() === effectiveReportDate.getMonth();
      } else {
        // Per giornaliero, confronta anno, mese e giorno
        return t.transmissionType === 'daily' &&
               tDate.getFullYear() === effectiveReportDate.getFullYear() &&
               tDate.getMonth() === effectiveReportDate.getMonth() &&
               tDate.getDate() === effectiveReportDate.getDate();
      }
    });
    const preCalculatedProgressivo = sameTypeTransmissionsForCalc.length + 1;
    console.log(`[SIAE-ROUTES] Pre-calculated progressivo for ${transmissionTypeForCalc}: ${preCalculatedProgressivo} (existing: ${sameTypeTransmissionsForCalc.length})`);
    // FIX 2026-01-14: Salva progressivo per riuso nel nome file
    calculatedProgressivo = preCalculatedProgressivo;
    
    // FIX 2026-01-14: Genera nome file PRIMA della generazione XML per attributo NomeFile obbligatorio
    // L'attributo NomeFile deve corrispondere esattamente al nome dell'allegato email (errore SIAE 0600)
    // FIX 2026-01-15: Usa preResolvedSystemCode già calcolato all'inizio (non ridefinire!)
    const preReportTypeForFileName: 'giornaliero' | 'mensile' = isMonthly ? 'mensile' : 'giornaliero';
    
    const preGeneratedFileName = generateSiaeFileName(
      preReportTypeForFileName,
      effectiveReportDate,
      preCalculatedProgressivo,
      null, // senza firma - il nome .xsi è quello che va nell'attributo NomeFile
      preResolvedSystemCode
    );
    
    // FIX 2026-01-19: Salva nome file per coerenza con attributo NomeFile nell'XML (errore 0600)
    emailFileName = preGeneratedFileName;
    
    const hydratedData = await hydrateC1EventContextFromTickets(filteredTickets, companyId, effectiveReportDate, isMonthly);
    
    // FIX 2026-01-18: Per report giornaliero (RMG), 0 biglietti è permesso
    // Per report mensile (RPM), rimane un errore bloccante
    if (hydratedData.events.length === 0 && hydratedData.subscriptions.length === 0) {
      if (isMonthly) {
        throw new Error('SIAE_NO_EVENTS: Nessun biglietto o abbonamento trovato per il periodo richiesto. Il report mensile richiede almeno un evento.');
      }
      console.warn('[SIAE-ROUTES] Report giornaliero senza eventi/abbonamenti - generazione consentita');
    }
    
    // TODO: CONSOLIDATION CANDIDATE - usare createSiaeTransmissionWithXml da ./siae-transmission-service
    // Questa funzione è parte di generateAndSendC1 helper che ritorna XML senza creare trasmissione.
    // La trasmissione viene creata più avanti nel flusso con campi aggiuntivi.
    // Per consolidare: spostare la creazione trasmissione qui e usare il risultato nel resto del flusso.
    const c1Params: C1XmlParams = {
      reportKind: isMonthly ? 'mensile' : 'giornaliero',
      companyId,
      reportDate: effectiveReportDate,
      resolvedSystemCode: preResolvedSystemCode,
      progressivo: preCalculatedProgressivo,
      taxId,
      businessName: companyName,
      events: hydratedData.events,
      subscriptions: hydratedData.subscriptions,
      // FIX 2026-01-19: Passa nomeFile per attributo NomeFile obbligatorio (errore SIAE 0600)
      nomeFile: preGeneratedFileName,
      // FIX 2026-01-21: forceSubstitution viene passato dal chiamante per gestire reinvii
      forceSubstitution,
    };
    
    const c1Result = generateC1Xml(c1Params);
    xml = c1Result.xml;
  }
  
  const transmissionType = isRCA ? 'rca' : (isMonthly ? 'monthly' : 'daily');
  const typeLabel = isRCA ? `RCA evento "${rcaEventName}"` : (isMonthly ? 'mensile' : 'giornaliera');
  
  // ==================== XML/TYPE COHERENCE VALIDATION (Fix SIAE Error 0601) ====================
  // Verify that XML content matches the expected report type to prevent "Oggetto del messaggio sbagliato" error
  const hasRCA = xml.includes('<RiepilogoControlloAccessi');
  const hasRMG = xml.includes('<RiepilogoGiornaliero');
  const hasRPM = xml.includes('<RiepilogoMensile');
  
  let xmlTypeError: string | null = null;
  if (isRCA && !hasRCA) {
    xmlTypeError = `ERRORE COERENZA: Richiesto report RCA ma XML contiene formato ${hasRMG ? 'RiepilogoGiornaliero' : hasRPM ? 'RiepilogoMensile' : 'sconosciuto'}. Il nome file sarebbe RCA_* ma il contenuto non corrisponde.`;
  } else if (!isRCA && !isMonthly && !hasRMG) {
    xmlTypeError = `ERRORE COERENZA: Richiesto report giornaliero (RMG) ma XML contiene formato ${hasRCA ? 'RiepilogoControlloAccessi' : hasRPM ? 'RiepilogoMensile' : 'sconosciuto'}. Il nome file sarebbe RMG_* ma il contenuto non corrisponde.`;
  } else if (!isRCA && isMonthly && !hasRPM) {
    xmlTypeError = `ERRORE COERENZA: Richiesto report mensile (RPM) ma XML contiene formato ${hasRCA ? 'RiepilogoControlloAccessi' : hasRMG ? 'RiepilogoGiornaliero' : 'sconosciuto'}. Il nome file sarebbe RPM_* ma il contenuto non corrisponde.`;
  }
  
  if (xmlTypeError) {
    console.error(`[SIAE-ROUTES] ${xmlTypeError}`);
    return {
      success: false,
      statusCode: 400,
      error: xmlTypeError,
      data: {
        code: 'XML_TYPE_MISMATCH',
        expectedType: isRCA ? 'RCA (RiepilogoControlloAccessi)' : (isMonthly ? 'RPM (RiepilogoMensile)' : 'RMG (RiepilogoGiornaliero)'),
        actualContent: hasRCA ? 'RiepilogoControlloAccessi' : hasRMG ? 'RiepilogoGiornaliero' : hasRPM ? 'RiepilogoMensile' : 'unknown',
        suggestion: 'Verificare il tipo di report selezionato. Per eventi singoli usare RCA, per report giornalieri RMG, per mensili RPM.'
      }
    };
  }
  console.log(`[SIAE-ROUTES] Coerenza XML/tipo verificata: ${transmissionType} → ${hasRCA ? 'RCA' : hasRMG ? 'RMG' : 'RPM'}`);
  // ==========================================================================================
  
  // ==================== SYSTEM CODE CONSISTENCY VALIDATION (Fix SIAE Error 0600/0603) ====================
  // FIX 2026-01-15: Usa funzione centralizzata per validazione coerenza codice sistema
  const systemCodeValidation = validateSystemCodeConsistency(xml, preResolvedSystemCode);
  
  if (!systemCodeValidation.valid) {
    console.error(`[SIAE-ROUTES] ${systemCodeValidation.error}`);
    return {
      success: false,
      statusCode: 400,
      error: systemCodeValidation.error || 'Codice sistema non coerente',
      data: {
        code: 'SYSTEM_CODE_MISMATCH',
        xmlSystemCode: systemCodeValidation.xmlSystemCode,
        filenameSystemCode: systemCodeValidation.filenameSystemCode,
        suggestion: 'Il codice sistema deve essere identico nel nome file, nell\'attributo NomeFile XML e negli elementi SistemaEmissione/CodiceSistemaCA.'
      }
    };
  }
  console.log(`[SIAE-ROUTES] Coerenza codice sistema verificata: XML=${systemCodeValidation.xmlSystemCode}, filename=${systemCodeValidation.filenameSystemCode}`);
  // ==========================================================================================
  
  // ==================== AUTOMATIC VALIDATION ====================
  // Validate XML before sending - blocks transmission if errors found
  const validation = validateC1Report(xml);
  console.log(`[SIAE-ROUTES] Validazione automatica C1 ${typeLabel}: ${validation.valid ? 'OK' : 'ERRORI TROVATI'}`);
  
  if (!validation.valid) {
    console.error(`[SIAE-ROUTES] Validazione C1 fallita:`, validation.errors);
    return {
      success: false,
      statusCode: 400,
      error: `Validazione report fallita: ${validation.errors.join('; ')}`,
      data: {
        code: 'VALIDATION_FAILED',
        validation: {
          valid: false,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: validation.summary
        }
      }
    };
  }
  
  // Log warnings but continue
  if (validation.warnings.length > 0) {
    console.log(`[SIAE-ROUTES] Avvisi validazione C1:`, validation.warnings);
  }
  // ===============================================================
  
  // Try to sign the XML with smart card if requested (with retry for unstable connections)
  let signatureInfo = '';
  let p7mBase64: string | undefined;
  let signedXmlContent: string | undefined;
  let signatureData = null;
  
  if (signWithSmartCard) {
    const MAX_SIGNATURE_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    
    for (let attempt = 1; attempt <= MAX_SIGNATURE_RETRIES; attempt++) {
      try {
        const bridgeConnected = isBridgeConnected();
        console.log(`[SIAE-ROUTES] Signature attempt ${attempt}/${MAX_SIGNATURE_RETRIES}: bridgeConnected=${bridgeConnected}`);
        
        if (bridgeConnected) {
          console.log(`[SIAE-ROUTES] Attempting XML signature for C1 ${typeLabel} report...`);
          signatureData = await requestXmlSignature(xml);
          
          // Supporta sia CAdES-BES (nuovo) che XMLDSig (legacy)
          if (signatureData.p7mBase64) {
            // CAdES-BES: mantieni il P7M Base64 separato
            p7mBase64 = signatureData.p7mBase64;
            signatureInfo = ` (firmato CAdES-BES ${signatureData.algorithm || 'SHA-256'})`;
            console.log(`[SIAE-ROUTES] CAdES-BES signature created for C1 ${typeLabel}`);
          } else if (signatureData.signedXml) {
            // Legacy XMLDSig (deprecato)
            signedXmlContent = signatureData.signedXml;
            signatureInfo = ' (firmato XMLDSig - DEPRECATO)';
            console.log(`[SIAE-ROUTES] XMLDSig signature created for C1 ${typeLabel}`);
          }
          break; // Success, exit retry loop
        } else {
          console.log(`[SIAE-ROUTES] Bridge not connected on attempt ${attempt}, waiting ${RETRY_DELAY_MS}ms...`);
          if (attempt < MAX_SIGNATURE_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          } else {
            console.log(`[SIAE-ROUTES] Bridge not connected after ${MAX_SIGNATURE_RETRIES} attempts, sending unsigned XML for C1 ${typeLabel}`);
            signatureInfo = ' (non firmato - bridge non connesso)';
          }
        }
      } catch (signError: any) {
        console.error(`[SIAE-ROUTES] XML signature failed on attempt ${attempt}:`, signError.message);
        if (attempt < MAX_SIGNATURE_RETRIES) {
          console.log(`[SIAE-ROUTES] Retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          signatureInfo = ` (non firmato - ${signError.message})`;
        }
      }
    }
  }
  
  // FIX 2026-01-14: Usa il progressivo già calcolato prima della generazione XML
  // Questo garantisce coerenza tra nome file e contenuto XML (evita errore SIAE 0600)
  const effectiveReportDateForCount = isRCA && rcaEventDate ? rcaEventDate : reportDate;
  const sequenceNumber = calculatedProgressivo;
  console.log(`[SIAE-ROUTES] Using pre-calculated progressivo for filename: ${sequenceNumber}`);
  
  // Generate file name using the correct format (Allegato C SIAE)
  const reportTypeForFileName: 'giornaliero' | 'mensile' | 'rca' | 'log' = 
    isRCA ? 'rca' : (isMonthly ? 'mensile' : 'giornaliero');
  const effectiveSignatureFormat = p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : null);
  // FIX 2026-01-15: Usa lo STESSO codice sistema già calcolato prima della generazione XML!
  // NON ricalcolare - la cache può cambiare tra le due chiamate causando errori SIAE 0600/0603
  // Il codice sistema DEVE essere identico in: NomeFile XML, nome file allegato, SistemaEmissione
  const effectiveSystemCode = preResolvedSystemCode;
  
  const generatedFileName = generateSiaeFileName(
    reportTypeForFileName, 
    effectiveReportDateForCount, 
    sequenceNumber,
    effectiveSignatureFormat,
    effectiveSystemCode
  );
  
  const fileExtension = effectiveSignatureFormat === 'cades' ? '.p7m' : '.xsi';
  
  // ==================== FILE NAME FORMAT VALIDATION (Fix SIAE Error 0600) ====================
  // FIX 2026-01-19: Validazione formato nome file SIAE prima dell'invio
  // Previene errore 0600 "Nome del file contenente il riepilogo sbagliato"
  const fileNameValidation = validateSiaeFileName(generatedFileName);
  if (!fileNameValidation.valid) {
    console.error(`[SIAE-ROUTES] ERRORE FORMATO NOME FILE: ${fileNameValidation.errors.join('; ')}`);
    return {
      success: false,
      statusCode: 400,
      error: `Formato nome file non valido: ${fileNameValidation.errors.join('; ')}`,
      data: {
        code: 'FILE_NAME_FORMAT_ERROR',
        fileName: generatedFileName,
        errors: fileNameValidation.errors,
        warnings: fileNameValidation.warnings,
        suggestion: 'Il nome file SIAE deve seguire il formato Allegato C: RMG_AAAA_MM_GG_NNN.xsi.p7m (giornaliero), RPM_AAAA_MM_NNN.xsi.p7m (mensile), RCA_AAAA_MM_GG_NNN.xsi.p7m (evento)'
      }
    };
  }
  if (fileNameValidation.warnings.length > 0) {
    console.log(`[SIAE-ROUTES] Avvisi formato nome file:`, fileNameValidation.warnings);
  }
  console.log(`[SIAE-ROUTES] Formato nome file validato: ${generatedFileName} (tipo: ${fileNameValidation.parsedData?.reportType})`);
  // ===========================================================================================
  
  // Calculate transmission statistics
  // For RCA, get tipoTassazione and entertainmentIncidence from the ticketed event
  let c1TipoTassazione: string | undefined;
  let c1EntertainmentIncidence: number | undefined;
  if (isRCA && eventId) {
    const c1TicketedEvent = await siaeStorage.getSiaeTicketedEvent(eventId);
    c1TipoTassazione = c1TicketedEvent?.tipoTassazione || undefined;
    c1EntertainmentIncidence = c1TicketedEvent?.entertainmentIncidence || undefined;
  }
  const c1Stats = await calculateTransmissionStats(
    filteredTickets,
    companyId,
    eventId,
    c1TipoTassazione,
    c1EntertainmentIncidence
  );
  const c1FileHash = calculateFileHash(signedXmlContent || xml);
  
  // Create transmission record - salva firma appropriata e nome file conforme
  // FIX: Includere ticketedEventId per tutti i tipi se un evento è selezionato
  // FIX 2026-01-15: Salva systemCode per garantire coerenza nei reinvii (errori SIAE 0600/0603)
  const transmission = await siaeStorage.createSiaeTransmission({
    companyId,
    ticketedEventId: eventId || undefined, // Collegamento evento SIAE (sempre se selezionato)
    transmissionType,
    periodDate: reportDate,
    fileName: generatedFileName.replace(fileExtension, ''), // Nome senza estensione
    fileExtension: fileExtension,
    fileContent: signedXmlContent || xml, // XMLDSig firmato o XML originale
    p7mContent: p7mBase64 || null, // CAdES-BES P7M per resend offline
    signatureFormat: p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : null),
    signedAt: (p7mBase64 || signedXmlContent) ? new Date() : null,
    status: 'pending',
    ticketsCount: filteredTickets.length,
    totalAmount: totalAmount.toString(),
    progressivoInvio: sequenceNumber, // Progressivo invio per periodo fiscale
    systemCode: effectiveSystemCode, // FIX: Salva codice per reinvii futuri
    fileHash: c1FileHash,
    totalIva: c1Stats.totalIva.toFixed(2),
    totalEsenti: c1Stats.totalEsenti.toFixed(2),
    totalImpostaIntrattenimento: c1Stats.totalImpostaIntrattenimento.toFixed(2),
    cfOrganizzatore: systemConfig?.taxId || '',
    ticketsChanged: c1Stats.ticketsChanged,
    ticketsResold: c1Stats.ticketsResold,
  });
  
  // Import and send the email with SIAE-compliant format (Allegato C)
  const { sendSiaeTransmissionEmail } = await import('./email-service');
  
  // Validazione pre-trasmissione SIAE (async per DTD validator)
  const c1ReportType: 'giornaliero' | 'mensile' | 'rca' = isRCA ? 'rca' : (isMonthly ? 'mensile' : 'giornaliero');
  const preValidation = await validatePreTransmission(
    signedXmlContent || xml,
    effectiveSystemCode,
    c1ReportType,
    effectiveReportDateForCount
  );
  
  if (!preValidation.canTransmit) {
    await siaeStorage.updateSiaeTransmission(transmission.id, {
      status: 'error',
      errorMessage: preValidation.errors.map(e => `[${e.siaeErrorCode || 'ERR'}] ${e.message}`).join('; '),
    });
    return {
      success: false,
      statusCode: 400,
      data: {
        error: 'Validazione pre-trasmissione fallita',
        errors: preValidation.errors,
        warnings: preValidation.warnings,
        details: preValidation.details,
        transmissionId: transmission.id,
      }
    };
  }
  
  const destination = getSiaeDestinationEmail(toEmail);
  const emailResult = await sendSiaeTransmissionEmail({
    to: destination,
    companyName,
    transmissionType,
    periodDate: effectiveReportDateForCount,
    ticketsCount: filteredTickets.length,
    totalAmount: totalAmount.toString(),
    xmlContent: signedXmlContent || xml, // XML originale o XMLDSig firmato
    transmissionId: transmission.id,
    systemCode: effectiveSystemCode, // CRITICAL: Must match XML CodiceSistemaCA
    sequenceNumber: sequenceNumber, // Progressivo calcolato dinamicamente
    signWithSmime: true, // Per Allegato C SIAE 1.6.2 - firma S/MIME obbligatoria
    requireSignature: true,
    p7mBase64: p7mBase64, // CAdES-BES P7M per allegato email
    signatureFormat: p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : undefined),
    // FIX 2026-01-19: Nome file allegato ESPLICITO per coerenza con attributo NomeFile nell'XML (errore 0600)
    explicitFileName: emailFileName,
  });
  
  // Controlla se l'invio è fallito (firma S/MIME non disponibile)
  if (!emailResult.success) {
    await siaeStorage.updateSiaeTransmission(transmission.id, {
      status: 'failed',
      errorMessage: emailResult.error || 'Invio email fallito',
    });
    return {
      success: false,
      statusCode: 400,
      data: {
        message: emailResult.error || 'Invio email fallito - Firma S/MIME richiesta',
        transmissionId: transmission.id,
      }
    };
  }
  
  const smimeInfo = emailResult.smimeSigned 
    ? ` (S/MIME: ${emailResult.signerEmail})` 
    : ' (NON firmata S/MIME)';
  console.log(`[SIAE-ROUTES] ${typeLabel.toUpperCase()} C1 transmission sent to: ${destination}${signatureInfo}${smimeInfo} (Test mode: ${SIAE_TEST_MODE})`);
  
  // Create email audit trail for traceability - calcola hash su contenuto appropriato
  const crypto = await import('crypto');
  const attachmentContent = p7mBase64 ? Buffer.from(p7mBase64, 'base64') : Buffer.from(signedXmlContent || xml, 'utf-8');
  const attachmentHash = crypto.createHash('sha256').update(attachmentContent).digest('hex');
  await siaeStorage.createSiaeEmailAudit({
    companyId,
    transmissionId: transmission.id,
    emailType: transmissionType === 'daily' ? 'c1_daily' : 'c1_monthly',
    recipientEmail: destination,
    senderEmail: emailResult.signerEmail || process.env.SIAE_SMTP_USER || undefined,
    subject: `Trasmissione SIAE ${typeLabel.toUpperCase()} - ${companyName}`,
    bodyPreview: `Trasmissione ${typeLabel} per ${companyName} - ${filteredTickets.length} biglietti - ${totalAmount.toString()} EUR`,
    attachmentName: `siae_${transmissionType}_${reportDate.toISOString().split('T')[0]}.xml`,
    attachmentHash,
    smimeSigned: emailResult.smimeSigned || false,
    smimeSignerEmail: emailResult.signerEmail || undefined,
    smimeSignedAt: emailResult.signedAt ? new Date(emailResult.signedAt) : undefined,
    status: 'sent',
    sentAt: new Date(),
  });
  
  // Update transmission status with S/MIME info
  await siaeStorage.updateSiaeTransmission(transmission.id, {
    status: 'sent',
    sentAt: new Date(),
    sentToPec: destination,
    smimeSigned: emailResult.smimeSigned || false,
    smimeSignerEmail: emailResult.signerEmail || null,
    smimeSignerName: emailResult.signerName || null,
    smimeSignedAt: emailResult.signedAt ? new Date(emailResult.signedAt) : null,
  });
  
  return {
    success: true,
    statusCode: 200,
    data: {
      message: `Trasmissione ${typeLabel} generata e inviata con successo${signatureInfo}${emailResult.smimeSigned ? ' (email firmata S/MIME)' : ''}`,
      transmission: {
        id: transmission.id,
        type: transmissionType,
        ticketsCount: filteredTickets.length,
        totalAmount: totalAmount.toString(),
        sentTo: destination,
        signed: signatureData !== null,
        smimeSigned: emailResult.smimeSigned,
        smimeSignerEmail: emailResult.signerEmail,
      },
      validation: {
        valid: true,
        warnings: validation.warnings,
        summary: validation.summary
      }
    }
  };
}

// Generate and send C1 transmission (daily, monthly, or RCA)
// type: 'rca' for single event (SIAE responds), 'daily' for RMG (silent), 'monthly' for RPM (silent)
router.post("/api/siae/companies/:companyId/transmissions/send-c1", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { date, toEmail, type = 'daily', eventId, signWithSmartCard = true, forceSubstitution = false } = req.body;
    
    // Check international exemption
    const intlCheck = await checkInternationalExemption(eventId, companyId);
    if (intlCheck.exempt) {
      return res.status(400).json({ message: intlCheck.reason, code: 'INTERNATIONAL_EXEMPT' });
    }
    
    console.log(`[SIAE-ROUTES] send-c1 request received - type: ${type}, eventId: ${eventId}, companyId: ${companyId}, forceSubstitution: ${forceSubstitution}`);
    
    const result = await handleSendC1Transmission({
      companyId,
      date,
      toEmail,
      type,
      eventId, // Required for RCA type
      signWithSmartCard,
      forceSubstitution, // Forza Sostituzione="S" per reinvio (errore 40604)
    });
    
    if (result.success) {
      const user = req.user as any;
      await siaeStorage.createAuditLog({
        companyId,
        userId: user.id,
        action: 'c1_report_sent',
        entityType: 'transmission',
        entityId: result.data?.transmission?.id || '',
        description: `Trasmissione C1 ${type} inviata (${result.data?.transmission?.ticketsCount || 0} biglietti)`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.json({ success: true, ...result.data });
    } else {
      res.status(result.statusCode).json({ message: result.error, ...result.data });
    }
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to send C1 transmission:', error);
    res.status(500).json({ message: error.message });
  }
});

// Legacy endpoint - uses shared C1 handler with type=daily
// DEPRECATED: Use /api/siae/companies/:companyId/transmissions/send-c1 with type='daily' instead
router.post("/api/siae/companies/:companyId/transmissions/send-daily", requireAuth, requireGestore, async (req: Request, res: Response) => {
  console.log('[SIAE-ROUTES] Legacy send-daily endpoint called - using shared C1 handler with type=daily');
  try {
    const { companyId } = req.params;
    const { date, toEmail, signWithSmartCard = true } = req.body;
    
    // Check international exemption (daily reports are company-wide)
    const intlCheck = await checkInternationalExemption(null, companyId);
    if (intlCheck.exempt) {
      return res.status(400).json({ message: intlCheck.reason, code: 'INTERNATIONAL_EXEMPT' });
    }
    
    const result = await handleSendC1Transmission({
      companyId,
      date,
      toEmail,
      type: 'daily',
      signWithSmartCard,
    });
    
    if (result.success) {
      const user = req.user as any;
      await siaeStorage.createAuditLog({
        companyId,
        userId: user.id,
        action: 'daily_report_sent',
        entityType: 'transmission',
        entityId: result.data?.transmission?.id || '',
        description: `Trasmissione giornaliera inviata (${result.data?.transmission?.ticketsCount || 0} biglietti)`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.json({ success: true, ...result.data });
    } else {
      res.status(result.statusCode).json({ message: result.error, ...result.data });
    }
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to send daily transmission (legacy):', error);
    res.status(500).json({ message: error.message });
  }
});

// Test email endpoint for transmission
// NOTA: Usa codice sistema test P0004010 per evitare errori SIAE 0600
router.post("/api/siae/transmissions/test-email", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { toEmail, companyId } = req.body;
    
    if (!toEmail) {
      return res.status(400).json({ message: "Indirizzo email richiesto" });
    }
    
    // FIX 2026-01-16: Usa codice sistema test valido invece di EVENT4U1
    // P0004010 è un codice test valido (P + 7 cifre)
    const TEST_SYSTEM_CODE = 'P0004010';
    
    // Get company name
    const company = companyId ? await storage.getCompany(companyId) : null;
    const companyName = company?.name || 'Test Company';
    
    // Create test XML in RiepilogoControlloAccessi format (Allegato B - Provvedimento 04/03/2008)
    const now = new Date();
    const dataRiepilogo = formatSiaeDateCompact(now);
    const oraGenerazione = formatSiaeTimeCompact(now);
    const oraEvento = formatSiaeTimeHHMM(now);
    
    // NOTA: Nessun DOCTYPE - i Web Service SIAE non risolvono DTD esterni (XXE protection)
    // FIX 2026-01-16: Usa codice sistema test P0004010 invece di EVENT4U1
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<RiepilogoControlloAccessi Sostituzione="N">
  <Titolare>
    <DenominazioneTitolareCA>${escapeXml(companyName)}</DenominazioneTitolareCA>
    <CFTitolareCA>TSTSAE00A00A000A</CFTitolareCA>
    <CodiceSistemaCA>${TEST_SYSTEM_CODE}</CodiceSistemaCA>
    <DataRiepilogo>${dataRiepilogo}</DataRiepilogo>
    <DataGenerazioneRiepilogo>${dataRiepilogo}</DataGenerazioneRiepilogo>
    <OraGenerazioneRiepilogo>${oraGenerazione}</OraGenerazioneRiepilogo>
    <ProgressivoRiepilogo>1</ProgressivoRiepilogo>
  </Titolare>
  <Evento>
    <CFOrganizzatore>TSTSAE00A00A000A</CFOrganizzatore>
    <DenominazioneOrganizzatore>${escapeXml(companyName)}</DenominazioneOrganizzatore>
    <TipologiaOrganizzatore>G</TipologiaOrganizzatore>
    <SpettacoloIntrattenimento>N</SpettacoloIntrattenimento>
    <IncidenzaIntrattenimento>100</IncidenzaIntrattenimento>
    <DenominazioneLocale>Test Locale</DenominazioneLocale>
    <CodiceLocale>0000000000000</CodiceLocale>
    <DataEvento>${dataRiepilogo}</DataEvento>
    <OraEvento>${oraEvento}</OraEvento>
    <TipoGenere>DI</TipoGenere>
    <TitoloEvento>Test Event</TitoloEvento>
    <Autore></Autore>
    <Esecutore></Esecutore>
    <NazionalitaFilm></NazionalitaFilm>
    <NumOpereRappresentate>1</NumOpereRappresentate>
    <SistemaEmissione CFTitolare="TSTSAE00A00A000A" CodiceSistema="${TEST_SYSTEM_CODE}">
      <Titoli>
        <CodiceOrdinePosto>A0</CodiceOrdinePosto>
        <Capienza>100</Capienza>
        <TotaleTipoTitolo>
          <TipoTitolo>IN</TipoTitolo>
          <TotaleTitoliLTA>1</TotaleTitoliLTA>
          <TotaleTitoliNoAccessoTradiz>0</TotaleTitoliNoAccessoTradiz>
          <TotaleTitoliNoAccessoDigitali>0</TotaleTitoliNoAccessoDigitali>
          <TotaleTitoliLTAAccessoTradiz>1</TotaleTitoliLTAAccessoTradiz>
          <TotaleTitoliLTAAccessoDigitali>0</TotaleTitoliLTAAccessoDigitali>
          <TotaleCorrispettiviLordi>1000</TotaleCorrispettiviLordi>
          <TotaleDirittiPrevendita>0</TotaleDirittiPrevendita>
          <TotaleIVACorrispettivi>100</TotaleIVACorrispettivi>
          <TotaleIVADirittiPrevendita>0</TotaleIVADirittiPrevendita>
        </TotaleTipoTitolo>
        <TotaleTitoliAnnullati>
          <TipoTitolo>IN</TipoTitolo>
          <TotaleTitoliAnnull>0</TotaleTitoliAnnull>
          <TotaleCorrispettiviLordiAnnull>0</TotaleCorrispettiviLordiAnnull>
          <TotaleDirittiPrevenditaAnnull>0</TotaleDirittiPrevenditaAnnull>
          <TotaleIVACorrispettiviAnnull>0</TotaleIVACorrispettiviAnnull>
          <TotaleIVADirittiPrevenditaAnnull>0</TotaleIVADirittiPrevenditaAnnull>
        </TotaleTitoliAnnullati>
      </Titoli>
    </SistemaEmissione>
  </Evento>
</RiepilogoControlloAccessi>`;
    
    // Import and send the test email
    const { sendSiaeTransmissionEmail } = await import('./email-service');
    
    const emailResult = await sendSiaeTransmissionEmail({
      to: toEmail,
      companyName,
      transmissionType: 'daily',
      periodDate: now,
      ticketsCount: 1,
      totalAmount: '10.00',
      xmlContent: testXml,
      transmissionId: 'TEST-' + Date.now(),
      systemCode: TEST_SYSTEM_CODE, // FIX 2026-01-16: Usa codice test valido
      sequenceNumber: 1,
      signWithSmime: true, // Per Allegato C SIAE 1.6.2 - firma S/MIME obbligatoria
      requireSignature: true,
    });
    
    if (!emailResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: emailResult.error || 'Invio email fallito - Firma S/MIME richiesta'
      });
    }
    
    res.json({
      success: true,
      message: `Email di test inviata con successo a ${toEmail}${emailResult.smimeSigned ? ' (S/MIME firmata)' : ' (NON firmata S/MIME - bridge non connesso)'}`,
      smimeSigned: emailResult.smimeSigned,
      smimeSignerEmail: emailResult.signerEmail,
    });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to send test email:', error);
    res.status(500).json({ message: error.message });
  }
});

// Gmail OAuth - Get authorization URL (system-wide, no companyId needed)
router.get("/api/gmail/auth", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { getAuthUrl } = await import('./gmail-oauth');
    const authUrl = getAuthUrl();
    res.json({ authUrl });
  } catch (error: any) {
    console.error('[Gmail OAuth] Error generating auth URL:', error);
    res.status(500).json({ message: error.message });
  }
});

// Gmail OAuth - Callback from Google (system-wide)
router.get("/api/gmail/callback", async (req: Request, res: Response) => {
  try {
    const { code, error: oauthError } = req.query;
    
    if (oauthError) {
      console.error('[Gmail OAuth] OAuth error:', oauthError);
      return res.redirect('/siae/transmissions?gmail_error=access_denied');
    }
    
    if (!code) {
      return res.redirect('/siae/transmissions?gmail_error=missing_params');
    }
    
    const { exchangeCodeForTokens, saveSystemTokens } = await import('./gmail-oauth');
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string);
    
    // Save system-wide tokens
    await saveSystemTokens(tokens);
    
    console.log(`[Gmail OAuth] Successfully connected Gmail system-wide (${tokens.email})`);
    
    res.redirect(`/siae/transmissions?gmail_success=true&gmail_email=${encodeURIComponent(tokens.email || '')}`);
  } catch (error: any) {
    console.error('[Gmail OAuth] Callback error:', error);
    res.redirect('/siae/transmissions?gmail_error=' + encodeURIComponent(error.message));
  }
});

// Gmail OAuth - Get status (system-wide, no companyId needed)
router.get("/api/gmail/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const { isGmailConnected } = await import('./gmail-oauth');
    const status = await isGmailConnected();
    res.json({
      authorized: status.connected,
      connected: status.connected,
      email: status.email,
      expiresAt: status.expiresAt,
    });
  } catch (error: any) {
    console.error('[Gmail OAuth] Error checking status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Gmail OAuth - Disconnect (system-wide)
router.delete("/api/gmail/revoke", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { disconnectGmail } = await import('./gmail-oauth');
    await disconnectGmail();
    res.json({ success: true, message: "Gmail disconnesso" });
  } catch (error: any) {
    console.error('[Gmail OAuth] Error disconnecting:', error);
    res.status(500).json({ message: error.message });
  }
});

// Check for SIAE email responses and update transmission statuses
router.post("/api/siae/transmissions/check-responses", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { checkForSiaeResponses } = await import('./gmail-client');
    const companyId = req.query.companyId as string || (req.user as any)?.companyId;
    
    console.log(`[SIAE-ROUTES] Checking for SIAE email responses (company: ${companyId})...`);
    const responses = await checkForSiaeResponses(companyId);
    
    const updates: Array<{transmissionId: string; status: string; protocolNumber?: string; errorCode?: string}> = [];
    
    // Get all transmissions for matching (filter by status 'sent' in memory)
    const allTransmissions = await siaeStorage.getSiaeTransmissionsByCompany(companyId);
    const pendingTransmissions = allTransmissions.filter(t => t.status === 'sent');
    
    for (const response of responses) {
      // Skip if we don't have useful data
      if (response.status === 'unknown') continue;
      
      // Try to match with existing transmissions using multiple strategies
      let matchedTransmission = null;
      
      // Strategy 1: Direct ID match
      if (response.transmissionId) {
        matchedTransmission = await siaeStorage.getSiaeTransmission(response.transmissionId);
      }
      
      // Strategy 2: Match by subject containing filename
      if (!matchedTransmission && pendingTransmissions.length > 0) {
        for (const t of pendingTransmissions) {
          // Check if subject contains the filename
          if (t.fileName && response.subject.includes(t.fileName.replace('.xsi', ''))) {
            matchedTransmission = t;
            break;
          }
          
          // Check if any attachment filename matches transmission
          if (response.attachments && response.attachments.length > 0) {
            for (const att of response.attachments) {
              // Attachment filenames often contain date patterns like RCA_YYYY_MM_DD
              if (t.fileName && att.filename.includes(t.fileName.replace('.xsi', ''))) {
                matchedTransmission = t;
                break;
              }
            }
          }
        }
      }
      
      // Strategy 3: Match by date if only one transmission exists for that date
      // Only use this fallback if we have some parsed reference (protocol or error code)
      if (!matchedTransmission && pendingTransmissions.length > 0 && (response.protocolNumber || response.errorCode)) {
        const responseDate = response.date.toISOString().split('T')[0];
        const sameDateTransmissions = pendingTransmissions.filter(t => 
          t.sentAt && new Date(t.sentAt).toISOString().split('T')[0] === responseDate
        );
        if (sameDateTransmissions.length === 1) {
          matchedTransmission = sameDateTransmissions[0];
          console.log(`[SIAE-ROUTES] Matched by date fallback: ${matchedTransmission.id}`);
        }
      }
      
      // If we found a matching transmission and it hasn't been updated yet
      if (matchedTransmission && matchedTransmission.status === 'sent' && !matchedTransmission.responseEmailId) {
        // Determine new status
        const newStatus = response.status === 'accepted' ? 'received' : 
                         response.status === 'rejected' ? 'rejected' : 
                         response.status === 'error' ? 'error' : 'sent';
        
        // Build update payload
        const updatePayload: any = {
          status: newStatus,
          receivedAt: response.date,
          receiptProtocol: response.protocolNumber || null,
          receiptContent: response.body.substring(0, 1000),
          errorMessage: response.errorMessage || null,
          responseEmailId: response.messageId, // Track which email was associated
        };
        
        // Add error code if available from attachment parsing
        if (response.errorCode) {
          updatePayload.errorCode = response.errorCode;
        }
        
        await siaeStorage.updateSiaeTransmission(matchedTransmission.id, updatePayload);
        
        updates.push({
          transmissionId: matchedTransmission.id,
          status: newStatus,
          protocolNumber: response.protocolNumber,
          errorCode: response.errorCode,
        });
        
        // Log the update
        const eventDetails = response.status === 'accepted'
          ? `Risposta SIAE positiva - Protocollo: ${response.protocolNumber}`
          : `Risposta SIAE negativa - Errore ${response.errorCode || 'sconosciuto'}: ${response.errorMessage || 'Dettagli non disponibili'}`;
          
        await siaeStorage.createSiaeLog({
          companyId: matchedTransmission.companyId,
          logType: response.status === 'accepted' ? 'transmission_confirmed' : 'transmission_error',
          eventDetails,
          transmissionId: matchedTransmission.id,
          cfOrganizzatore: '',
          cfTitolare: '',
        });
        
        console.log(`[SIAE-ROUTES] Updated transmission ${matchedTransmission.id}: ${newStatus}`);
      }
    }
    
    res.json({
      success: true,
      totalEmails: responses.length,
      updatedTransmissions: updates.length,
      updates,
      responses: responses.map(r => ({
        messageId: r.messageId,
        subject: r.subject,
        from: r.from,
        date: r.date,
        status: r.status,
        protocolNumber: r.protocolNumber,
        errorCode: r.errorCode,
        transmissionId: r.transmissionId,
        attachments: r.attachments?.map(a => ({
          filename: a.filename,
          parsed: a.parsed
        })),
      })),
    });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to check SIAE responses:', error);
    
    // Check for Gmail permission errors
    if (error.message?.includes('Insufficient Permission') || 
        error.message?.includes('GMAIL_PERMISSION_ERROR') ||
        error.code === 403) {
      return res.status(403).json({ 
        message: "Il connettore Gmail non ha i permessi per leggere le email. " +
                 "Per abilitare la verifica automatica delle risposte SIAE, ricollega il connettore Gmail " +
                 "con i permessi di lettura (Strumenti → Connettori → Gmail → Ricollega). " +
                 "In alternativa, puoi confermare manualmente il protocollo cliccando su una trasmissione e inserendo il numero di protocollo ricevuto.",
        code: 'GMAIL_PERMISSION_DENIED',
        canUseManualConfirm: true
      });
    }
    
    if (error.message?.includes('Gmail not connected') || 
        error.message?.includes('GMAIL_NOT_CONNECTED')) {
      return res.status(400).json({ 
        message: "Connettore Gmail non configurato. " +
                 "Per la verifica automatica delle risposte SIAE, configura il connettore Gmail (Strumenti → Connettori → Gmail). " +
                 "In alternativa, puoi confermare manualmente il protocollo cliccando su una trasmissione.",
        code: 'GMAIL_NOT_CONNECTED',
        canUseManualConfirm: true
      });
    }
    
    res.status(500).json({ message: error.message });
  }
});

// Confirm transmission receipt from SIAE
router.post("/api/siae/transmissions/:id/confirm-receipt", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { receiptProtocol, receiptContent, receivedAt } = req.body;
    
    if (!receiptProtocol) {
      return res.status(400).json({ message: "Il protocollo di ricezione è obbligatorio" });
    }
    
    const transmission = await siaeStorage.getSiaeTransmission(id);
    if (!transmission) {
      return res.status(404).json({ message: "Trasmissione non trovata" });
    }
    
    if (transmission.status !== 'sent') {
      return res.status(400).json({ message: "La trasmissione deve essere in stato 'inviato' per confermare la ricezione" });
    }
    
    // Update transmission with receipt info
    const updatedTransmission = await siaeStorage.updateSiaeTransmission(id, {
      status: 'received',
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      receiptProtocol,
      receiptContent: receiptContent || null,
    });
    
    // Log the confirmation
    await siaeStorage.createSiaeLog({
      companyId: transmission.companyId,
      logType: 'transmission_confirmed',
      eventDetails: `Conferma ricezione trasmissione ${id} - Protocollo: ${receiptProtocol}`,
      transmissionId: id,
      cfOrganizzatore: '',
      cfTitolare: '',
    });
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: transmission.companyId,
      userId: user.id,
      action: 'transmission_receipt_confirmed',
      entityType: 'transmission',
      entityId: id,
      description: `Conferma ricezione trasmissione - Protocollo SIAE: ${receiptProtocol}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      message: "Conferma ricezione registrata con successo",
      transmission: updatedTransmission,
    });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to confirm transmission receipt:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== Box Office Sessions ====================

router.get("/api/siae/emission-channels/:channelId/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const sessions = await siaeStorage.getSiaeBoxOfficeSessions(req.params.channelId);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/admin/box-office/sessions", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const sessions = await siaeStorage.getAllSiaeBoxOfficeSessionsAdmin();
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/box-office/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const sessions = await siaeStorage.getAllSiaeBoxOfficeSessions();
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/box-office/active-session", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const session = await siaeStorage.getActiveSiaeBoxOfficeSession(user.id);
    res.json(session || null);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/box-office/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const data = insertSiaeBoxOfficeSessionSchema.parse({ ...req.body, userId: user.id });
    const session = await siaeStorage.createSiaeBoxOfficeSession(data);
    
    // Get companyId from emission channel or ticketed event
    let companyId = user.companyId;
    if (data.emissionChannelId) {
      const channel = await siaeStorage.getSiaeEmissionChannel(data.emissionChannelId);
      if (channel?.companyId) {
        companyId = channel.companyId;
      }
    }
    if (companyId) {
      await siaeStorage.createAuditLog({
        companyId,
        userId: user.id,
        action: 'box_office_session_created',
        entityType: 'box_office_session',
        entityId: session.id,
        description: `Sessione cassa aperta`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }
    
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/api/siae/box-office/sessions/:id/close", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = await siaeStorage.closeSiaeBoxOfficeSession(req.params.id, req.body);
    if (!session) {
      return res.status(404).json({ message: "Sessione non trovata" });
    }
    
    const user = req.user as any;
    
    // Get companyId from emission channel or ticketed event
    let companyId = user.companyId;
    if (session.emissionChannelId) {
      const channel = await siaeStorage.getSiaeEmissionChannel(session.emissionChannelId);
      if (channel?.companyId) {
        companyId = channel.companyId;
      }
    }
    if (companyId) {
      await siaeStorage.createAuditLog({
        companyId,
        userId: user.id,
        action: 'box_office_session_closed',
        entityType: 'box_office_session',
        entityId: session.id,
        description: `Sessione cassa chiusa`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }
    
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Subscriptions ====================

router.get("/api/siae/companies/:companyId/subscriptions", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const subscriptions = await siaeStorage.getSiaeSubscriptionsByCompany(req.params.companyId);
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin endpoint to get all subscriptions with company details
// Supports query filters: companyId, ticketedEventId
router.get("/api/siae/admin/subscriptions", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const isSuperAdmin = user.role === 'super_admin';
    const userCompanyId = user.companyId;
    
    // Query parameter filters
    const filterCompanyId = req.query.companyId as string | undefined;
    const filterTicketedEventId = req.query.ticketedEventId as string | undefined;
    
    // Build where conditions
    const conditions: SQL[] = [];
    
    // Company authorization: non-super_admin can only see their own company
    if (!isSuperAdmin && userCompanyId) {
      conditions.push(eq(siaeSubscriptions.companyId, userCompanyId));
    } else if (filterCompanyId) {
      // Super admin can filter by specific company
      conditions.push(eq(siaeSubscriptions.companyId, filterCompanyId));
    }
    
    // Filter by ticketed event
    if (filterTicketedEventId) {
      conditions.push(eq(siaeSubscriptions.ticketedEventId, filterTicketedEventId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.select({
      id: siaeSubscriptions.id,
      companyId: siaeSubscriptions.companyId,
      customerId: siaeSubscriptions.customerId,
      ticketedEventId: siaeSubscriptions.ticketedEventId,
      subscriptionCode: siaeSubscriptions.subscriptionCode,
      progressiveNumber: siaeSubscriptions.progressiveNumber,
      turnType: siaeSubscriptions.turnType,
      eventsCount: siaeSubscriptions.eventsCount,
      eventsUsed: siaeSubscriptions.eventsUsed,
      validFrom: siaeSubscriptions.validFrom,
      validTo: siaeSubscriptions.validTo,
      totalAmount: siaeSubscriptions.totalAmount,
      rateoPerEvent: siaeSubscriptions.rateoPerEvent,
      holderFirstName: siaeSubscriptions.holderFirstName,
      holderLastName: siaeSubscriptions.holderLastName,
      status: siaeSubscriptions.status,
      cancellationReasonCode: siaeSubscriptions.cancellationReasonCode,
      cancellationDate: siaeSubscriptions.cancellationDate,
      createdAt: siaeSubscriptions.createdAt,
      companyName: companies.name,
      customerFirstName: siaeCustomers.firstName,
      customerLastName: siaeCustomers.lastName,
      eventName: events.name,
    })
    .from(siaeSubscriptions)
    .leftJoin(companies, eq(siaeSubscriptions.companyId, companies.id))
    .leftJoin(siaeCustomers, eq(siaeSubscriptions.customerId, siaeCustomers.id))
    .leftJoin(siaeTicketedEvents, eq(siaeSubscriptions.ticketedEventId, siaeTicketedEvents.id))
    .leftJoin(events, eq(siaeTicketedEvents.eventId, events.id))
    .where(whereClause)
    .orderBy(desc(siaeSubscriptions.createdAt));
    
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/subscriptions", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    let customerId = req.body.customerId;
    
    // Se customerId non è fornito, creare automaticamente un nuovo cliente SIAE
    if (!customerId && req.body.holderFirstName && req.body.holderLastName) {
      const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
      const newCustomer = await siaeStorage.createSiaeCustomer({
        firstName: req.body.holderFirstName,
        lastName: req.body.holderLastName,
        uniqueCode: `CLT${uniqueId}`,
        email: `auto_${uniqueId}@placeholder.local`,
        phone: `+39000${uniqueId.substring(0, 7)}`,
        isActive: true,
      });
      customerId = newCustomer.id;
    }
    
    if (!customerId) {
      return res.status(400).json({ 
        message: "customerId richiesto oppure fornire holderFirstName e holderLastName per creare un nuovo cliente" 
      });
    }
    
    const data = insertSiaeSubscriptionSchema.parse({
      ...req.body,
      customerId,
    });
    const subscription = await siaeStorage.createSiaeSubscription(data);
    
    await siaeStorage.createAuditLog({
      companyId: subscription.companyId || user.companyId,
      userId: user.id,
      action: 'subscription_created',
      entityType: 'subscription',
      entityId: subscription.id,
      description: `Abbonamento creato: ${subscription.subscriptionCode}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(subscription);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/subscriptions/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = patchSubscriptionSchema.parse(req.body);
    const subscription = await siaeStorage.updateSiaeSubscription(req.params.id, data);
    if (!subscription) {
      return res.status(404).json({ message: "Abbonamento non trovato" });
    }
    
    const user = req.user as any;
    await siaeStorage.createAuditLog({
      companyId: subscription.companyId || user.companyId,
      userId: user.id,
      action: 'subscription_updated',
      entityType: 'subscription',
      entityId: subscription.id,
      description: `Abbonamento aggiornato: ${subscription.subscriptionCode}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(subscription);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Valid SIAE cancellation reason codes (TAB.5)
const VALID_CANCELLATION_REASON_CODES = ['001', '002', '003', '004', '005', '006', '007', '009'];
const CANCELLATION_REASON_DESCRIPTIONS: Record<string, string> = {
  '001': 'Errore del cassiere',
  '002': 'Errore del cliente',
  '003': 'Evento annullato',
  '004': 'Reso autorizzato',
  '005': 'Duplicato',
  '006': 'Sostituzione',
  '007': 'Rimborso',
  '009': 'Annullamento fiscale',
};

// Cancel subscription with SIAE compliance
router.post("/api/siae/subscriptions/:id/cancel", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    const { reasonCode } = req.body;
    
    // Validate reasonCode is provided
    if (!reasonCode) {
      return res.status(400).json({ 
        message: "Causale annullamento obbligatoria (reasonCode)",
        validCodes: CANCELLATION_REASON_DESCRIPTIONS
      });
    }
    
    // Validate reasonCode is valid per SIAE TAB.5
    if (!VALID_CANCELLATION_REASON_CODES.includes(reasonCode)) {
      return res.status(400).json({ 
        message: `Causale annullamento non valida: ${reasonCode}`,
        validCodes: CANCELLATION_REASON_DESCRIPTIONS
      });
    }
    
    // Fetch subscription
    const [subscription] = await db.select()
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.id, id));
    
    if (!subscription) {
      return res.status(404).json({ message: "Abbonamento non trovato" });
    }
    
    // Check if already cancelled
    if (subscription.status === 'cancelled') {
      return res.status(400).json({ 
        message: "Abbonamento già annullato",
        cancellationDate: subscription.cancellationDate,
        cancellationReasonCode: subscription.cancellationReasonCode
      });
    }
    
    // Check user authorization (same company or super_admin)
    const isSuperAdmin = user.role === 'super_admin';
    if (!isSuperAdmin && user.companyId !== subscription.companyId) {
      return res.status(403).json({ message: "Non autorizzato ad annullare questo abbonamento" });
    }
    
    const cancellationDate = new Date();
    
    // Update subscription status
    const [updatedSubscription] = await db.update(siaeSubscriptions)
      .set({
        status: 'cancelled',
        cancellationDate,
        cancellationReasonCode: reasonCode,
        cancelledByUserId: user.id,
        updatedAt: new Date(),
      })
      .where(eq(siaeSubscriptions.id, id))
      .returning();
    
    // Create audit log entry
    await siaeStorage.createAuditLog({
      companyId: subscription.companyId,
      userId: user.id,
      action: 'subscription_cancelled',
      entityType: 'subscription',
      entityId: id,
      description: `Abbonamento ${subscription.subscriptionCode} annullato. Causale: ${reasonCode} - ${CANCELLATION_REASON_DESCRIPTIONS[reasonCode]}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      ...updatedSubscription,
      cancellationReasonDescription: CANCELLATION_REASON_DESCRIPTIONS[reasonCode],
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Print subscription to thermal printer
router.post("/api/siae/subscriptions/:id/print", requireAuth, async (req: Request, res: Response) => {
  console.log('[SubscriptionPrint] Endpoint hit! subscriptionId:', req.params.id);
  try {
    const user = req.user as any;
    const { id: subscriptionId } = req.params;
    const { agentId } = req.body;
    
    // Get the subscription
    const [subscription] = await db.select()
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.id, subscriptionId));
    
    if (!subscription) {
      return res.status(404).json({ message: "Abbonamento non trovato" });
    }
    
    // Verify company access
    if (user.role !== 'super_admin' && subscription.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato" });
    }
    
    // Get event details
    const event = subscription.ticketedEventId 
      ? await siaeStorage.getSiaeTicketedEvent(subscription.ticketedEventId)
      : null;
    
    // Get sector
    const sector = subscription.sectorId 
      ? await siaeStorage.getSiaeEventSector(subscription.sectorId)
      : null;
    
    // Get SIAE system config
    const systemConfig = await siaeStorage.getSiaeSystemConfig(subscription.companyId);
    
    // Get connected agents
    const connectedAgents = getConnectedAgents(subscription.companyId);
    
    if (connectedAgents.length === 0) {
      return res.status(503).json({ 
        message: "Nessun agente di stampa connesso. Avviare l'applicazione desktop Event4U.",
        errorCode: "NO_PRINT_AGENT"
      });
    }
    
    // Determine print agent
    let printerAgentId = agentId;
    if (!printerAgentId && connectedAgents.length === 1) {
      printerAgentId = connectedAgents[0].agentId;
    }
    
    if (!printerAgentId) {
      return res.status(400).json({
        message: "Selezionare un agente di stampa",
        errorCode: "AGENT_SELECTION_REQUIRED",
        availableAgents: connectedAgents.map(a => ({
          agentId: a.agentId,
          deviceName: a.deviceName
        }))
      });
    }
    
    // Verify agent is connected
    const selectedAgent = connectedAgents.find(a => a.agentId === printerAgentId);
    if (!selectedAgent) {
      return res.status(400).json({
        message: "Agente di stampa non connesso",
        errorCode: "AGENT_NOT_CONNECTED"
      });
    }
    
    // Prepare subscription data for template replacement
    const holderName = `${subscription.holderFirstName || ''} ${subscription.holderLastName || ''}`.trim();
    const validFromStr = subscription.validFrom ? new Date(subscription.validFrom).toLocaleDateString('it-IT') : '';
    const validToStr = subscription.validTo ? new Date(subscription.validTo).toLocaleDateString('it-IT') : '';
    const totalAmountStr = `€ ${Number(subscription.totalAmount || 0).toFixed(2).replace('.', ',')}`;
    const emissionDateStr = subscription.createdAt ? new Date(subscription.createdAt).toLocaleString('it-IT') : new Date().toLocaleString('it-IT');
    
    // Map subscription data to template field keys
    const subscriptionData: Record<string, string> = {
      subscription_code: subscription.subscriptionCode || '',
      subscriber_name: holderName || 'N/D',
      subscription_type: subscription.subscriptionTypeId || '',
      total_entries: String(subscription.eventsCount || 0),
      used_entries: String(subscription.eventsUsed || 0),
      remaining_entries: String((subscription.eventsCount || 0) - (subscription.eventsUsed || 0)),
      valid_from: validFromStr,
      valid_to: validToStr,
      price: totalAmountStr,
      venue_name: event?.eventName || '',
      custom_text: '',
      // SIAE required fields
      organizer_company: systemConfig?.businessName || '',
      ticketing_manager: systemConfig?.businessName || '',
      emission_datetime: emissionDateStr,
      fiscal_seal: subscription.fiscalSealCode || '',
      fiscal_counter: String(subscription.fiscalSealCounter || ''),
      card_code: subscription.cardCode || '',
      qr_code: subscription.subscriptionCode || '',
    };
    
    // Try to find a subscription template for this company
    let subscriptionHtml: string;
    let paperWidthMm = 80;
    let paperHeightMm = 120;
    let printOrientation = 'portrait';
    
    const [subscriptionTemplate] = await db.select()
      .from(ticketTemplates)
      .where(and(
        eq(ticketTemplates.templateType, 'subscription'),
        eq(ticketTemplates.isActive, true),
        or(
          eq(ticketTemplates.companyId, subscription.companyId),
          isNull(ticketTemplates.companyId)
        )
      ))
      .orderBy(desc(ticketTemplates.createdAt))
      .limit(1);
    
    if (subscriptionTemplate) {
      // Use template to generate HTML
      const templateElements = await db.select()
        .from(ticketTemplateElements)
        .where(eq(ticketTemplateElements.templateId, subscriptionTemplate.id))
        .orderBy(ticketTemplateElements.zIndex);
      
      const parsedElements = templateElements.map(el => ({
        type: el.type,
        x: parseFloat(el.x as any) || 0,
        y: parseFloat(el.y as any) || 0,
        width: parseFloat(el.width as any) || 20,
        height: parseFloat(el.height as any) || 5,
        content: el.fieldKey ? `{{${el.fieldKey}}}` : el.staticValue,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        fontWeight: el.fontWeight,
        fontColor: el.color,
        textAlign: el.textAlign,
        rotation: el.rotation,
      }));
      
      paperWidthMm = subscriptionTemplate.paperWidthMm || 80;
      paperHeightMm = subscriptionTemplate.paperHeightMm || 120;
      printOrientation = (subscriptionTemplate as any).printOrientation || 'auto';
      
      subscriptionHtml = generateTicketHtml(
        {
          paperWidthMm,
          paperHeightMm,
          backgroundImageUrl: subscriptionTemplate.backgroundImageUrl,
          dpi: subscriptionTemplate.dpi || 203,
          printOrientation,
        },
        parsedElements,
        subscriptionData,
        true // skipBackground for thermal printing
      );
      
      console.log('[SubscriptionPrint] Using template:', subscriptionTemplate.name);
    } else {
      // Fallback to hardcoded HTML
      console.log('[SubscriptionPrint] No template found, using fallback HTML');
      subscriptionHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      width: ${paperWidthMm}mm; 
      font-family: Arial, sans-serif; 
      font-size: 10pt;
      padding: 3mm;
    }
    .header { text-align: center; margin-bottom: 4mm; }
    .title { font-size: 14pt; font-weight: bold; margin-bottom: 2mm; }
    .subtitle { font-size: 10pt; color: #666; }
    .divider { border-top: 1px dashed #000; margin: 3mm 0; }
    .row { display: flex; justify-content: space-between; margin: 1.5mm 0; }
    .label { color: #666; font-size: 9pt; }
    .value { font-weight: bold; text-align: right; }
    .holder { font-size: 12pt; font-weight: bold; text-align: center; margin: 3mm 0; }
    .code { font-family: monospace; font-size: 11pt; text-align: center; margin: 3mm 0; letter-spacing: 1px; }
    .fiscal { font-size: 8pt; color: #666; text-align: center; margin-top: 3mm; }
    .qr { text-align: center; margin: 3mm 0; }
    .usage { text-align: center; font-size: 11pt; margin: 2mm 0; }
    .events-box { border: 1px solid #000; padding: 2mm; text-align: center; margin: 2mm 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">ABBONAMENTO</div>
    <div class="subtitle">${event?.eventName || 'Evento'}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="holder">${holderName || 'Intestatario N/D'}</div>
  
  <div class="code">${subscription.subscriptionCode || ''}</div>
  
  <div class="divider"></div>
  
  <div class="row">
    <span class="label">Settore:</span>
    <span class="value">${sector?.name || '-'}</span>
  </div>
  
  <div class="row">
    <span class="label">Turno:</span>
    <span class="value">${subscription.turnType || '-'}</span>
  </div>
  
  <div class="row">
    <span class="label">Valido dal:</span>
    <span class="value">${validFromStr || '-'}</span>
  </div>
  
  <div class="row">
    <span class="label">Valido al:</span>
    <span class="value">${validToStr || '-'}</span>
  </div>
  
  <div class="divider"></div>
  
  <div class="events-box">
    <div class="label">INGRESSI</div>
    <div class="usage">${subscription.eventsUsed || 0} / ${subscription.eventsCount || 0}</div>
  </div>
  
  <div class="row">
    <span class="label">Importo:</span>
    <span class="value">${totalAmountStr}</span>
  </div>
  
  ${subscription.fiscalSealCode ? `
  <div class="row">
    <span class="label">Sigillo:</span>
    <span class="value" style="font-family: monospace;">${subscription.fiscalSealCode}</span>
  </div>
  ` : ''}
  
  <div class="divider"></div>
  
  <div class="fiscal">
    ${systemConfig?.businessName || ''}<br/>
    ${systemConfig?.vatNumber ? `P.IVA ${systemConfig.vatNumber}` : ''}
  </div>
</body>
</html>`;
    }
    
    // Determine effective orientation
    const naturalOrientation = paperWidthMm > paperHeightMm ? 'landscape' : 'portrait';
    const effectiveOrientation = printOrientation === 'auto' ? naturalOrientation : printOrientation;
    
    // Build print payload (use type 'ticket' for agent compatibility)
    const printPayload = {
      id: `subscription-${subscription.id}-${Date.now()}`,
      type: 'ticket',
      paperWidthMm,
      paperHeightMm,
      orientation: effectiveOrientation,
      html: subscriptionHtml,
      ticketId: subscription.id,
    };
    
    // Send to print agent
    const sent = sendPrintJobToAgent(printerAgentId, printPayload);
    
    if (!sent) {
      return res.status(503).json({
        message: "Impossibile inviare comando di stampa all'agente",
        errorCode: "PRINT_SEND_FAILED"
      });
    }
    
    // Update subscription updated timestamp
    await db.update(siaeSubscriptions)
      .set({ 
        updatedAt: new Date()
      })
      .where(eq(siaeSubscriptions.id, subscriptionId));
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: subscription.companyId,
      userId: user.id,
      action: 'subscription_printed',
      entityType: 'subscription',
      entityId: subscriptionId,
      description: `Abbonamento ${subscription.subscriptionCode} stampato`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      subscriptionId,
      subscriptionCode: subscription.subscriptionCode,
      printedAt: new Date(),
      agentId: printerAgentId,
      deviceName: selectedAgent.deviceName
    });
  } catch (error: any) {
    console.error('[SubscriptionPrint] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get subscription usage history
router.get("/api/siae/subscriptions/:id/usage", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Fetch subscription
    const [subscription] = await db.select()
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.id, id));
    
    if (!subscription) {
      return res.status(404).json({ message: "Abbonamento non trovato" });
    }
    
    // Check user authorization (same company or super_admin)
    const isSuperAdmin = user.role === 'super_admin';
    if (!isSuperAdmin && user.companyId !== subscription.companyId) {
      return res.status(403).json({ message: "Non autorizzato a visualizzare questo abbonamento" });
    }
    
    // Get usage from audit logs (validate actions on subscriptions)
    const usageFromAudit = await db.select({
      id: siaeAuditLogs.id,
      action: siaeAuditLogs.action,
      description: siaeAuditLogs.description,
      accessDate: siaeAuditLogs.createdAt,
      ipAddress: siaeAuditLogs.ipAddress,
      userId: siaeAuditLogs.userId,
    })
    .from(siaeAuditLogs)
    .where(and(
      eq(siaeAuditLogs.entityType, 'subscription'),
      eq(siaeAuditLogs.entityId, id),
      eq(siaeAuditLogs.action, 'validate')
    ))
    .orderBy(desc(siaeAuditLogs.createdAt));
    
    // Get event info for the subscription
    let eventInfo = null;
    if (subscription.ticketedEventId) {
      const [ticketedEvent] = await db.select({
        ticketedEventId: siaeTicketedEvents.id,
        eventId: events.id,
        eventName: events.name,
        eventDate: events.startDatetime,
        locationId: events.locationId,
      })
      .from(siaeTicketedEvents)
      .leftJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(eq(siaeTicketedEvents.id, subscription.ticketedEventId));
      
      eventInfo = ticketedEvent;
    }
    
    res.json({
      subscription: {
        id: subscription.id,
        subscriptionCode: subscription.subscriptionCode,
        holderFirstName: subscription.holderFirstName,
        holderLastName: subscription.holderLastName,
        eventsCount: subscription.eventsCount,
        eventsUsed: subscription.eventsUsed,
        eventsRemaining: subscription.eventsCount - subscription.eventsUsed,
        validFrom: subscription.validFrom,
        validTo: subscription.validTo,
        status: subscription.status,
      },
      event: eventInfo,
      usageHistory: usageFromAudit.map(usage => ({
        id: usage.id,
        accessDate: usage.accessDate,
        action: usage.action,
        description: usage.description,
        ipAddress: usage.ipAddress,
        validatedBy: usage.userId,
      })),
      totalAccesses: usageFromAudit.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Subscription Types ====================

router.get("/api/siae/ticketed-events/:eventId/subscription-types", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const subscriptionTypes = await db.select()
      .from(siaeSubscriptionTypes)
      .where(eq(siaeSubscriptionTypes.ticketedEventId, eventId));
    res.json(subscriptionTypes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/ticketed-events/:eventId/subscription-types", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    // Get companyId from the ticketed event (safer than relying on user.companyId which can be null for super_admin)
    const [ticketedEvent] = await db.select({ companyId: siaeTicketedEvents.companyId })
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, eventId));
    
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    const data = insertSiaeSubscriptionTypeSchema.parse({
      ...req.body,
      ticketedEventId: eventId,
      companyId: ticketedEvent.companyId,
    });
    
    const [subscriptionType] = await db.insert(siaeSubscriptionTypes)
      .values(data)
      .returning();
    res.status(201).json(subscriptionType);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/subscription-types/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = patchSubscriptionTypeSchema.parse(req.body);
    const [subscriptionType] = await db.update(siaeSubscriptionTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(siaeSubscriptionTypes.id, req.params.id))
      .returning();
    if (!subscriptionType) {
      return res.status(404).json({ message: "Tipo abbonamento non trovato" });
    }
    res.json(subscriptionType);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/api/siae/subscription-types/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const [deleted] = await db.delete(siaeSubscriptionTypes)
      .where(eq(siaeSubscriptionTypes.id, req.params.id))
      .returning();
    if (!deleted) {
      return res.status(404).json({ message: "Tipo abbonamento non trovato" });
    }
    res.json({ message: "Tipo abbonamento eliminato", id: deleted.id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Event Subscriptions ====================

router.get("/api/siae/ticketed-events/:eventId/subscriptions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const subscriptions = await db.select()
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.ticketedEventId, eventId));
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/ticketed-events/:eventId/subscriptions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;
    
    let customerId = req.body.customerId;
    
    // Se customerId non è fornito, creare automaticamente un nuovo cliente SIAE
    if (!customerId && req.body.holderFirstName && req.body.holderLastName) {
      const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
      const newCustomer = await siaeStorage.createSiaeCustomer({
        firstName: req.body.holderFirstName,
        lastName: req.body.holderLastName,
        uniqueCode: `CLT${uniqueId}`,
        email: `auto_${uniqueId}@placeholder.local`,
        phone: `+39000${uniqueId.substring(0, 7)}`,
        isActive: true,
      });
      customerId = newCustomer.id;
    }
    
    if (!customerId) {
      return res.status(400).json({ 
        message: "customerId richiesto oppure fornire holderFirstName e holderLastName per creare un nuovo cliente" 
      });
    }
    
    const data = insertSiaeSubscriptionSchema.parse({
      ...req.body,
      customerId,
      ticketedEventId: eventId,
      companyId: user.companyId,
    });
    
    const subscription = await siaeStorage.createSiaeSubscription(data);
    res.status(201).json(subscription);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== Audit Logs ====================

router.get("/api/siae/companies/:companyId/audit-logs", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    // Verify company access for non-super-admin users
    if (user.role !== 'super_admin' && user.companyId !== req.params.companyId) {
      return res.status(403).json({ message: "Accesso negato" });
    }
    const logs = await siaeStorage.getSiaeAuditLogsByCompany(req.params.companyId);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/audit-logs/entity/:entityType/:entityId", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const logs = await siaeStorage.getSiaeAuditLogsByEntity(req.params.entityType, req.params.entityId);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/audit-logs", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeAuditLogSchema.parse(req.body);
    const log = await siaeStorage.createSiaeAuditLog(data);
    res.status(201).json(log);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== Numbered Seats ====================

router.get("/api/siae/sectors/:sectorId/numbered-seats", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const seats = await siaeStorage.getSiaeNumberedSeatsBySector(req.params.sectorId);
    res.json(seats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/siae/numbered-seats/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const seat = await siaeStorage.getSiaeNumberedSeat(req.params.id);
    if (!seat) {
      return res.status(404).json({ message: "Posto non trovato" });
    }
    res.json(seat);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/numbered-seats", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeNumberedSeatSchema.parse(req.body);
    const seat = await siaeStorage.createSiaeNumberedSeat(data);
    res.status(201).json(seat);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/numbered-seats/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = patchNumberedSeatSchema.parse(req.body);
    const seat = await siaeStorage.updateSiaeNumberedSeat(req.params.id, data);
    if (!seat) {
      return res.status(404).json({ message: "Posto non trovato" });
    }
    res.json(seat);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/api/siae/numbered-seats/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    // SIAE Compliance: Check if any tickets reference this seat
    const [ticketCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(siaeTickets)
      .where(eq(siaeTickets.seatId, req.params.id));
    
    if (ticketCount && ticketCount.count > 0) {
      return res.status(400).json({ 
        message: "Eliminazione non consentita: questo posto ha biglietti associati. Per conformità SIAE, i dati devono essere conservati per almeno 60 giorni.",
        code: "SIAE_RETENTION_REQUIRED"
      });
    }
    
    const deleted = await siaeStorage.deleteSiaeNumberedSeat(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Posto non trovato" });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Seed Endpoint (Super Admin - one time) ====================

router.post("/api/siae/seed", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    await siaeStorage.seedSiaeTables();
    res.json({ message: "Tabelle SIAE inizializzate con successo" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Public seed endpoint for initial setup
router.post("/api/siae/seed-public", async (req: Request, res: Response) => {
  try {
    await siaeStorage.seedSiaeTables();
    res.json({ message: "Tabelle SIAE inizializzate con successo" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== XML Report Generation (SIAE Transmission) ====================
// Conforme a Allegato B e C - Provvedimento Agenzia delle Entrate 04/03/2008
// NOTA 2026-01-16: generateRcaReportXml rimossa (codice morto). Usa generateRCAXml da siae-utils.ts

// ==================== generateRcaReportXml RIMOSSA ====================
// Questa funzione è stata rimossa perché:
// 1. Era codice morto (mai chiamata)
// 2. Aveva un errore di sintassi XML critico (doppio apice in <RiepilogoControlloAccessi">)
// 3. È sostituita da generateRCAXml in siae-utils.ts
// La funzione generateRCAXml centralizzata è usata da:
// - siae-scheduler.ts (linea 1135)
// - siae-routes.ts (linee 5391, 5883, 9649)

// ==================== C1 Report XML Generation Helper ====================
// Hydrate C1EventContext from filtered tickets (used to prepare data for generateC1Xml)
// Groups tickets by event and fetches all required context data
async function hydrateC1EventContextFromTickets(
  filteredTickets: any[],
  companyId: string,
  reportDate: Date,
  isMonthly: boolean
): Promise<{ events: C1EventContext[], subscriptions: C1SubscriptionData[] }> {
  const ticketsByEvent: Map<string, any[]> = new Map();
  for (const ticket of filteredTickets) {
    const eventId = ticket.ticketedEventId;
    if (!ticketsByEvent.has(eventId)) {
      ticketsByEvent.set(eventId, []);
    }
    ticketsByEvent.get(eventId)!.push(ticket);
  }
  
  const allSubscriptions = await siaeStorage.getSiaeSubscriptionsByCompany(companyId);
  const filteredSubscriptions = allSubscriptions.filter(sub => {
    const emDate = new Date(sub.emissionDate || sub.createdAt!);
    if (isMonthly) {
      return emDate.getFullYear() === reportDate.getFullYear() && 
             emDate.getMonth() === reportDate.getMonth();
    } else {
      return emDate.getFullYear() === reportDate.getFullYear() && 
             emDate.getMonth() === reportDate.getMonth() &&
             emDate.getDate() === reportDate.getDate();
    }
  });
  
  const allEventIds = new Set<string>([...ticketsByEvent.keys()]);
  for (const sub of filteredSubscriptions) {
    if (sub.ticketedEventId) allEventIds.add(sub.ticketedEventId);
  }
  
  const events: C1EventContext[] = [];
  
  for (const ticketedEventId of allEventIds) {
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(ticketedEventId);
    if (!ticketedEvent) continue;
    
    const eventDetails = await storage.getEvent(ticketedEvent.eventId);
    if (!eventDetails) continue;
    
    const location = await storage.getLocation(eventDetails.locationId);
    const allSectors = await siaeStorage.getSiaeEventSectors(ticketedEventId);
    const eventTickets = ticketsByEvent.get(ticketedEventId) || [];
    
    events.push({
      ticketedEvent: {
        id: ticketedEvent.id,
        companyId: ticketedEvent.companyId,
        eventId: ticketedEvent.eventId,
        siaeLocationCode: ticketedEvent.siaeLocationCode,
        capacity: ticketedEvent.capacity,
        taxType: ticketedEvent.taxType,
        entertainmentIncidence: ticketedEvent.entertainmentIncidence,
        genreCode: ticketedEvent.genreCode,
        genreIncidence: ticketedEvent.genreIncidence,
        author: ticketedEvent.author,
        performer: ticketedEvent.performer,
        organizerType: ticketedEvent.organizerType,
      },
      eventRecord: {
        id: eventDetails.id,
        name: eventDetails.name,
        startDatetime: eventDetails.startDatetime,
        locationId: eventDetails.locationId,
      },
      location: location ? {
        name: location.name,
        siaeLocationCode: location.siaeLocationCode,
      } : null,
      sectors: allSectors.map((s: any): C1SectorData => ({
        id: s.id,
        sectorCode: s.sectorCode,
        orderCode: s.sortOrder,
        capacity: s.capacity,
      })),
      tickets: eventTickets.map((t: any): C1TicketData => ({
        id: t.id,
        ticketedEventId: t.ticketedEventId,
        sectorId: t.sectorId,
        status: t.status,
        ticketTypeCode: t.ticketTypeCode,
        isComplimentary: t.isComplimentary,
        grossAmount: t.grossAmount,
        prevendita: t.prevendita,
        vatAmount: t.vatAmount,
        prevenditaVat: t.prevenditaVat,
        serviceAmount: t.serviceAmount,
        cancellationReasonCode: t.cancellationReasonCode,
        cancellationDate: t.cancellationDate,
      })),
    });
  }
  
  const subscriptions: C1SubscriptionData[] = filteredSubscriptions.map((s: any): C1SubscriptionData => ({
    id: s.id,
    subscriptionCode: s.subscriptionCode,
    ticketedEventId: s.ticketedEventId,
    sectorId: s.sectorId,
    validTo: s.validTo,
    createdAt: s.createdAt,
    taxType: s.taxType,
    turnType: s.turnType,
    ticketTypeCode: s.ticketTypeCode,
    isComplimentary: s.isComplimentary,
    status: s.status,
    totalAmount: s.totalAmount,
    rateoVat: s.rateoVat,
    eventsCount: s.eventsCount,
  }));
  
  return { events, subscriptions };
}

// NOTE: generateC1ReportXml has been replaced by the unified generateC1Xml from siae-utils.ts
// Use hydrateC1EventContextFromTickets to prepare data, then call generateC1Xml directly

// Funzioni formatSiaeDateCompact, formatSiaeTimeCompact, formatSiaeTimeHHMM
// importate da ./siae-utils.ts

/**
 * Mappa codice genere evento a codice SIAE (2 caratteri)
 * Secondo Allegato B - TAB.1
 */
function mapGenreToSiaeCode(genreCode: string | null): string {
  const genreMap: Record<string, string> = {
    '60': 'DI', // Discoteca/Disco
    '61': 'DI', // Disco/Club
    '10': 'TE', // Teatro
    '20': 'CI', // Cinema
    '30': 'CO', // Concerto
    '40': 'SP', // Sport
    '50': 'AL', // Altro
  };
  return genreMap[genreCode || '60'] || 'DI';
}

/**
 * Determina tipo SpettacoloIntrattenimento secondo specifiche SIAE
 * S=spettacolo, I=intrattenimento, P=spettacolo digitale, N=intrattenimento digitale
 */
function getSpettacoloIntrattenimentoCode(taxType: string | null, isDigital: boolean = false): string {
  if (taxType === 'S') return isDigital ? 'P' : 'S';
  return isDigital ? 'N' : 'I';
}

// Funzione generateSiaeFileName importata da ./siae-utils.ts

// Map internal ticket status to official SIAE status codes (Allegato A - Agenzia delle Entrate)
// VD = Valido digitale, ZD = Accesso automatizzato digitale, AD = Annullato digitale
// MD = Accesso manuale digitale, DD = Daspato digitale
function mapToSiaeStatus(internalStatus: string | null | undefined): string {
  if (!internalStatus) return 'VD';
  
  const statusLower = internalStatus.toLowerCase();
  switch (statusLower) {
    // Valid/Active states -> VD (Valido digitale)
    case 'active':
    case 'emesso':
    case 'emitted':
    case 'valid':
    case 'pending':
      return 'VD';
    
    // Used/Accessed states -> ZD (Accesso automatizzato digitale)
    case 'used':
    case 'utilizzato':
    case 'accessed':
    case 'checked_in':
    case 'scanned':
      return 'ZD';
    
    // Cancelled states -> AD (Annullato digitale)
    case 'cancelled':
    case 'annullato':
    case 'canceled':
    case 'refunded':
    case 'replaced':
      return 'AD';
    
    // Manual access -> MD (Accesso manuale digitale)
    case 'manual_access':
    case 'manual':
      return 'MD';
    
    // Expired/Blacklisted -> BD (Black list digitale)
    case 'expired':
    case 'blacklisted':
    case 'blocked':
      return 'BD';
    
    default:
      // Default to valid for unknown statuses
      return 'VD';
  }
}

// Generate XML for daily ticket report - uses RiepilogoMensile format (Provvedimento 04/03/2008)
router.get("/api/siae/companies/:companyId/reports/xml/daily", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: "Data obbligatoria (formato: YYYY-MM-DD)" });
    }
    
    const reportDate = new Date(date as string);
    
    // Get system config and company for fiscal code
    const systemConfig = await siaeStorage.getSiaeSystemConfig(companyId);
    const company = await storage.getCompany(companyId);
    
    // CONTROLLO OBBLIGATORIO: Codice Fiscale Emittente
    const taxId = systemConfig?.taxId || company?.fiscalCode || company?.taxId;
    if (!taxId) {
      return res.status(400).json({ 
        message: "Codice Fiscale Emittente non configurato. Vai su Impostazioni SIAE > Dati Aziendali per configurarlo prima di generare report.",
        code: "TAX_ID_REQUIRED"
      });
    }
    
    // Get all tickets for the date range
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get tickets issued on this date
    const allTickets = await siaeStorage.getSiaeTicketsByCompany(companyId);
    const dayTickets = allTickets.filter(t => {
      const ticketDate = new Date(t.emissionDate);
      return ticketDate >= startOfDay && ticketDate <= endOfDay;
    });
    
    // Generate OraGenerazione in HHMMSS format
    const now = new Date();
    const oraGen = String(now.getHours()).padStart(2, '0') + 
                   String(now.getMinutes()).padStart(2, '0') + 
                   String(now.getSeconds()).padStart(2, '0');
    
    // Calculate progressive sequence number for this transmission
    const existingTransmissions = await siaeStorage.getSiaeTransmissionsByCompany(companyId);
    const sameTypeTransmissions = existingTransmissions.filter(t => {
      const tDate = new Date(t.periodDate);
      return t.transmissionType === 'daily' &&
             tDate.getFullYear() === reportDate.getFullYear() &&
             tDate.getMonth() === reportDate.getMonth() &&
             tDate.getDate() === reportDate.getDate();
    });
    const sequenceNumber = sameTypeTransmissions.length + 1;
    
    // FIX 2026-01-14: Genera nome file PRIMA della generazione XML per attributo NomeFile obbligatorio
    // L'attributo NomeFile deve corrispondere esattamente al nome dell'allegato (errore SIAE 0600)
    // FIX 2026-01-18: TUTTI i report sono firmati S/MIME, usa resolveSystemCodeForSmime
    const { getCachedEfffData } = await import('./bridge-relay');
    const dailyEfffData = getCachedEfffData();
    const dailySmimeResult = resolveSystemCodeForSmime(dailyEfffData, systemConfig);
    if (!dailySmimeResult.success || !dailySmimeResult.systemCode) {
      return res.status(400).json({
        message: dailySmimeResult.error || 'Smart Card richiesta per preview report',
        code: 'SMARTCARD_REQUIRED_FOR_SMIME'
      });
    }
    const dailyResolvedSystemCode = dailySmimeResult.systemCode;
    const generatedFileName = generateSiaeFileName('giornaliero', reportDate, sequenceNumber, null, dailyResolvedSystemCode);
    
    // Generate RiepilogoGiornaliero XML using unified generateC1Xml
    const hydratedDailyData = await hydrateC1EventContextFromTickets(dayTickets, companyId, reportDate, false);
    
    // TODO: CONSOLIDATION CANDIDATE - usare createSiaeTransmissionWithXml da ./siae-transmission-service
    // Questa è una buona opportunità di consolidazione. Richiede:
    // 1. Calcolare dailyStats PRIMA della chiamata
    // 2. Usare createSiaeTransmissionWithXml con additionalTransmissionFields per totalIva, ecc.
    // 3. Rimuovere siaeStorage.createSiaeTransmission e usare il risultato della funzione centralizzata
    const dailyC1Params: C1XmlParams = {
      reportKind: 'giornaliero',
      companyId,
      reportDate,
      resolvedSystemCode: dailyResolvedSystemCode,
      progressivo: sequenceNumber,
      taxId,
      businessName: company?.name || 'N/D',
      events: hydratedDailyData.events,
      subscriptions: hydratedDailyData.subscriptions,
      // FIX 2026-01-19: Passa nomeFile per attributo NomeFile obbligatorio (errore SIAE 0600)
      nomeFile: generatedFileName,
    };
    
    const dailyC1Result = generateC1Xml(dailyC1Params);
    const xml = dailyC1Result.xml;
    const fileExtension = '.xsi';
    
    // Calculate transmission statistics for daily report
    const dailyStats = await calculateTransmissionStats(dayTickets, companyId);
    const dailyFileHash = calculateFileHash(xml);
    
    // Create transmission record
    // FIX 2026-01-15: Salva systemCode per garantire coerenza nei reinvii (errori SIAE 0600/0603)
    const transmission = await siaeStorage.createSiaeTransmission({
      companyId,
      transmissionType: 'daily',
      periodDate: reportDate,
      fileName: generatedFileName.replace(fileExtension, ''),
      fileExtension,
      fileContent: xml,
      status: 'pending',
      ticketsCount: dayTickets.length,
      totalAmount: dayTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0).toString(),
      progressivoInvio: sequenceNumber, // Progressivo invio per periodo fiscale
      systemCode: dailyResolvedSystemCode, // FIX: Salva codice per reinvii futuri
      fileHash: dailyFileHash,
      totalIva: dailyStats.totalIva.toFixed(2),
      totalEsenti: dailyStats.totalEsenti.toFixed(2),
      totalImpostaIntrattenimento: dailyStats.totalImpostaIntrattenimento.toFixed(2),
      cfOrganizzatore: systemConfig?.taxId || '',
      ticketsChanged: dailyStats.ticketsChanged,
      ticketsResold: dailyStats.ticketsResold,
    });
    
    // Format date for filename
    const dateStr = reportDate.getFullYear().toString() + 
                    String(reportDate.getMonth() + 1).padStart(2, '0') + 
                    String(reportDate.getDate()).padStart(2, '0');
    
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="SIAE_C1_${dateStr}_${transmission.id}.xml"`);
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Generate XML for event report (all tickets for a specific event)
// NOTE: This is an INTERNAL UTILITY endpoint for viewing/downloading event data.
// Uses custom internal format - NOT for official SIAE transmission.
// For official C1 transmissions, use /api/siae/companies/:companyId/transmissions/send-c1
router.get("/api/siae/ticketed-events/:eventId/reports/xml", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Get ticketed event details
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento con biglietteria non trovato" });
    }
    
    // Get activation card
    const activationCards = await siaeStorage.getSiaeActivationCardsByCompany(ticketedEvent.companyId);
    const activeCard = activationCards.find(c => c.status === 'active');
    
    if (!activeCard) {
      return res.status(400).json({ message: "Nessuna carta di attivazione attiva trovata" });
    }
    
    // Get all sectors for this event
    const sectors = await siaeStorage.getSiaeEventSectors(eventId);
    
    // Get all tickets for all sectors
    const allTickets: any[] = [];
    for (const sector of sectors) {
      const sectorTickets = await siaeStorage.getSiaeTicketsBySector(sector.id);
      allTickets.push(...sectorTickets);
    }
    
    // Get system config and company for fiscal code
    const systemConfig = await siaeStorage.getSiaeSystemConfig(ticketedEvent.companyId);
    const company = await storage.getCompany(ticketedEvent.companyId);
    
    // CONTROLLO OBBLIGATORIO: Codice Fiscale Emittente
    const taxId = systemConfig?.taxId || company?.fiscalCode || company?.taxId;
    if (!taxId) {
      return res.status(400).json({ 
        message: "Codice Fiscale Emittente non configurato. Vai su Impostazioni SIAE > Dati Aziendali per configurarlo prima di generare report.",
        code: "TAX_ID_REQUIRED"
      });
    }
    
    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportEvento xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(taxId)}</CodiceFiscaleEmittente>
    <NumeroCarta>${escapeXml(activeCard.cardCode)}</NumeroCarta>
    <DataOraGenerazione>${formatSiaeDateTime(new Date())}</DataOraGenerazione>
  </Intestazione>
  <DatiEvento>
    <CodiceEvento>${escapeXml(ticketedEvent.siaeEventCode || ticketedEvent.id)}</CodiceEvento>
    <Denominazione>${escapeXml(ticketedEvent.siaeEventCode || '')}</Denominazione>
    <CodiceGenere>${escapeXml(ticketedEvent.genreCode)}</CodiceGenere>
    <DataEvento>${formatSiaeDate(ticketedEvent.saleStartDate)}</DataEvento>
    <OraInizio></OraInizio>
    <Luogo>${escapeXml(ticketedEvent.siaeLocationCode || '')}</Luogo>
    <Indirizzo></Indirizzo>
    <Comune></Comune>
    <Provincia></Provincia>
  </DatiEvento>
  <ElencoSettori>`;
    
    for (const sector of sectors) {
      const sectorTickets = allTickets.filter(t => t.sectorId === sector.id);
      const soldTickets = sectorTickets.filter(t => !isCancelledStatus(t.status));
      
      xml += `
    <Settore>
      <CodiceSettore>${escapeXml(sector.sectorCode)}</CodiceSettore>
      <Denominazione>${escapeXml(sector.name)}</Denominazione>
      <CapienzaTotale>${sector.capacity}</CapienzaTotale>
      <PostiNumerati>${sector.isNumbered ? 'SI' : 'NO'}</PostiNumerati>
      <BigliettiEmessi>${sectorTickets.length}</BigliettiEmessi>
      <BigliettiValidi>${soldTickets.length}</BigliettiValidi>
      <ImportoTotale>${soldTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0).toFixed(2)}</ImportoTotale>
    </Settore>`;
    }
    
    xml += `
  </ElencoSettori>
  <Riepilogo>
    <TotaleBigliettiEmessi>${allTickets.length}</TotaleBigliettiEmessi>
    <TotaleBigliettiValidi>${allTickets.filter(t => !isCancelledStatus(t.status)).length}</TotaleBigliettiValidi>
    <TotaleBigliettiAnnullati>${allTickets.filter(t => isCancelledStatus(t.status)).length}</TotaleBigliettiAnnullati>
    <TotaleIncassoLordo>${allTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0).toFixed(2)}</TotaleIncassoLordo>
    <TotaleDiritti>0.00</TotaleDiritti>
    <TotaleIVA>${allTickets.reduce((sum, t) => sum + parseFloat(t.vatAmount || '0'), 0).toFixed(2)}</TotaleIVA>
  </Riepilogo>
</ReportEvento>`;
    
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="SIAE_Event_${eventId}.xml"`);
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Generate XML for cancellations report
// NOTE: This is an INTERNAL UTILITY endpoint for viewing/downloading cancellation data.
// Uses custom internal format - NOT for official SIAE transmission.
// For official C1 transmissions, use /api/siae/companies/:companyId/transmissions/send-c1
router.get("/api/siae/companies/:companyId/reports/xml/cancellations", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "Date di inizio e fine obbligatorie (formato: YYYY-MM-DD)" });
    }
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);
    endDate.setHours(23, 59, 59, 999);
    
    // Get activation card
    const activationCards = await siaeStorage.getSiaeActivationCardsByCompany(companyId);
    const activeCard = activationCards.find(c => c.status === 'active');
    
    if (!activeCard) {
      return res.status(400).json({ message: "Nessuna carta di attivazione attiva trovata" });
    }
    
    // Get cancelled tickets in date range
    const allTickets = await siaeStorage.getSiaeTicketsByCompany(companyId);
    const cancelledTickets = allTickets.filter(t => {
      if (t.status !== 'cancelled' || !t.cancellationDate) return false;
      const cancelDate = new Date(t.cancellationDate);
      return cancelDate >= startDate && cancelDate <= endDate;
    });
    
    // Get cancellation reasons
    const reasons = await siaeStorage.getSiaeCancellationReasons();
    
    // Get system config and company for fiscal code
    const systemConfig = await siaeStorage.getSiaeSystemConfig(companyId);
    const company = await storage.getCompany(companyId);
    
    // CONTROLLO OBBLIGATORIO: Codice Fiscale Emittente
    const taxId = systemConfig?.taxId || company?.fiscalCode || company?.taxId;
    if (!taxId) {
      return res.status(400).json({ 
        message: "Codice Fiscale Emittente non configurato. Vai su Impostazioni SIAE > Dati Aziendali per configurarlo prima di generare report.",
        code: "TAX_ID_REQUIRED"
      });
    }
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportAnnullamenti xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(taxId)}</CodiceFiscaleEmittente>
    <NumeroCarta>${escapeXml(activeCard.cardCode)}</NumeroCarta>
    <PeriodoDa>${formatSiaeDate(startDate)}</PeriodoDa>
    <PeriodoA>${formatSiaeDate(endDate)}</PeriodoA>
    <DataOraGenerazione>${formatSiaeDateTime(new Date())}</DataOraGenerazione>
  </Intestazione>
  <ElencoAnnullamenti>`;
    
    for (const ticket of cancelledTickets) {
      const reason = reasons.find(r => r.code === ticket.cancellationReasonCode);
      
      xml += `
    <Annullamento>
      <NumeroProgressivo>${ticket.progressiveNumber || 0}</NumeroProgressivo>
      <SigilloFiscale>${escapeXml(ticket.fiscalSealCode)}</SigilloFiscale>
      <DataOraEmissione>${formatSiaeDateTime(ticket.emissionDate)}</DataOraEmissione>
      <DataOraAnnullamento>${formatSiaeDateTime(ticket.cancellationDate)}</DataOraAnnullamento>
      <CodiceCausale>${escapeXml(ticket.cancellationReasonCode || '')}</CodiceCausale>
      <DescrizioneCausale>${escapeXml(reason?.name || '')}</DescrizioneCausale>
      <ImportoRimborsato>${(ticket.refundAmount ? Number(ticket.refundAmount) / 100 : 0).toFixed(2)}</ImportoRimborsato>
    </Annullamento>`;
    }
    
    xml += `
  </ElencoAnnullamenti>
  <Riepilogo>
    <TotaleAnnullamenti>${cancelledTickets.length}</TotaleAnnullamenti>
    <TotaleRimborsi>${cancelledTickets.reduce((sum, t) => sum + (t.refundAmount ? Number(t.refundAmount) / 100 : 0), 0).toFixed(2)}</TotaleRimborsi>
  </Riepilogo>
</ReportAnnullamenti>`;
    
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="SIAE_Cancellations_${dateFrom}_${dateTo}.xml"`);
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== Smart Card Sessions API ====================

// Validation schemas for smart card operations
const smartCardSessionCreateSchema = z.object({
  readerId: z.string().min(1, "readerId è obbligatorio"),
  readerName: z.string().min(1, "readerName è obbligatorio"),
  readerModel: z.string().optional().default('MiniLector EVO V3'),
  readerVendor: z.string().optional().default('Bit4id'),
  cardAtr: z.string().nullable().optional(),
  cardType: z.string().nullable().optional(),
  cardSerialNumber: z.string().nullable().optional(),
  workstationId: z.string().nullable().optional()
});

const smartCardSessionUpdateSchema = z.object({
  cardAtr: z.string().nullable().optional(),
  cardType: z.string().nullable().optional(),
  cardSerialNumber: z.string().nullable().optional(),
  status: z.enum(['connected', 'disconnected', 'error', 'card_removed']).optional(),
  lastError: z.string().nullable().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: "Payload vuoto non permesso" });

const smartCardSealLogSchema = z.object({
  sessionId: z.string().min(1, "sessionId è obbligatorio"),
  fiscalSealId: z.string().nullable().optional(),
  ticketId: z.string().nullable().optional(),
  sealCode: z.string().min(1, "sealCode è obbligatorio"),
  progressiveNumber: z.number().int().min(0).default(0),
  status: z.enum(['success', 'failed', 'cancelled']).default('success'),
  errorMessage: z.string().nullable().optional(),
  durationMs: z.number().int().nullable().optional()
});

// Get current smart card session status
router.get('/smart-card/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Non autorizzato" });
    }
    
    // Get the most recent active session for this user
    const session = await siaeStorage.getActiveSmartCardSession(userId);
    
    if (!session) {
      return res.json({
        connected: false,
        readerDetected: false,
        cardInserted: false,
        readerName: null,
        canEmitTickets: false,
        message: "Nessuna sessione smart card attiva"
      });
    }
    
    // Verify session is still valid and connected
    const isConnected = session.status === 'connected';
    const hasCard = session.cardAtr !== null && session.cardAtr !== '';
    const canEmit = isConnected && hasCard;
    
    res.json({
      connected: isConnected,
      readerDetected: isConnected || session.status === 'card_removed',
      cardInserted: hasCard,
      readerName: session.readerName,
      cardType: session.cardType,
      cardAtr: session.cardAtr,
      ticketsEmitted: session.ticketsEmittedCount,
      sealsUsed: session.sealsUsedCount,
      connectedAt: session.connectedAt,
      lastActivity: session.lastActivityAt,
      canEmitTickets: canEmit,
      sessionId: session.id,
      status: session.status,
      errorCount: session.errorCount,
      lastError: session.lastError
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Register a new smart card session
router.post('/smart-card/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Non autorizzato" });
    }
    
    // Validate request body
    const parseResult = smartCardSessionCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Dati non validi", 
        errors: parseResult.error.errors 
      });
    }
    
    const { readerId, readerName, readerModel, readerVendor, cardAtr, cardType, cardSerialNumber, workstationId } = parseResult.data;
    
    // Close any existing active sessions for this user
    await siaeStorage.closeActiveSmartCardSessions(userId);
    
    // Determine initial status
    const hasCard = cardAtr !== null && cardAtr !== undefined && cardAtr !== '';
    const initialStatus = hasCard ? 'connected' : 'card_removed';
    
    // Create new session
    const session = await siaeStorage.createSmartCardSession({
      readerId,
      readerName,
      readerModel: readerModel || 'MiniLector EVO V3',
      readerVendor: readerVendor || 'Bit4id',
      cardAtr: cardAtr || null,
      cardType: cardType || null,
      cardSerialNumber: cardSerialNumber || null,
      status: initialStatus,
      ticketsEmittedCount: 0,
      sealsUsedCount: 0,
      userId,
      workstationId: workstationId || null,
      ipAddress: (req.ip || '').substring(0, 45), // Normalize IP length
      userAgent: (req.get('user-agent') || '').substring(0, 500), // Limit user agent
      lastActivityAt: new Date(),
      errorCount: 0
    });
    
    // Log audit - reader connection
    await siaeStorage.createAuditLog({
      companyId: (req.user as any)?.companyId || '',
      userId,
      action: 'smart_card_connect',
      entityType: 'smart_card_session',
      entityId: session.id,
      description: `Connesso lettore smart card: ${readerName}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    // Log audit - card insertion if present
    if (hasCard) {
      await siaeStorage.createAuditLog({
        companyId: (req.user as any)?.companyId || '',
        userId,
        action: 'smart_card_inserted',
        entityType: 'smart_card_session',
        entityId: session.id,
        description: `Smart Card inserita: ${cardType || 'Tipo sconosciuto'}`,
        ipAddress: (req.ip || '').substring(0, 45),
        userAgent: (req.get('user-agent') || '').substring(0, 500)
      });
    }
    
    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update smart card session (card inserted/removed)
router.patch('/smart-card/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Non autorizzato" });
    }
    
    // Validate request body
    const parseResult = smartCardSessionUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Dati non validi", 
        errors: parseResult.error.errors 
      });
    }
    
    // Check session ownership
    const existingSession = await siaeStorage.getSmartCardSessionById(id);
    if (!existingSession) {
      return res.status(404).json({ message: "Sessione non trovata" });
    }
    
    if (existingSession.userId !== userId) {
      return res.status(403).json({ message: "Non autorizzato a modificare questa sessione" });
    }
    
    const updateData = parseResult.data;
    const previousCardAtr = existingSession.cardAtr;
    const newCardAtr = updateData.cardAtr;
    
    // Determine status based on card presence
    let newStatus = updateData.status;
    if (!newStatus) {
      if (newCardAtr !== undefined) {
        newStatus = (newCardAtr && newCardAtr !== '') ? 'connected' : 'card_removed';
      }
    }
    
    // Track errors
    let errorCount = existingSession.errorCount || 0;
    if (newStatus === 'error' || updateData.lastError) {
      errorCount++;
    }
    
    const session = await siaeStorage.updateSmartCardSession(id, {
      ...updateData,
      status: newStatus,
      errorCount,
      lastActivityAt: new Date()
    });
    
    // Log card insertion/removal
    const wasCardPresent = previousCardAtr !== null && previousCardAtr !== '';
    const isCardPresent = newCardAtr !== undefined ? (newCardAtr && newCardAtr !== '') : wasCardPresent;
    
    if (!wasCardPresent && isCardPresent) {
      await siaeStorage.createAuditLog({
        companyId: (req.user as any)?.companyId || '',
        userId,
        action: 'smart_card_inserted',
        entityType: 'smart_card_session',
        entityId: id,
        description: `Smart Card inserita: ${updateData.cardType || 'Tipo sconosciuto'}`,
        ipAddress: (req.ip || '').substring(0, 45),
        userAgent: (req.get('user-agent') || '').substring(0, 500)
      });
    } else if (wasCardPresent && !isCardPresent) {
      await siaeStorage.createAuditLog({
        companyId: (req.user as any)?.companyId || '',
        userId,
        action: 'smart_card_removed',
        entityType: 'smart_card_session',
        entityId: id,
        description: 'Smart Card rimossa',
        ipAddress: (req.ip || '').substring(0, 45),
        userAgent: (req.get('user-agent') || '').substring(0, 500)
      });
    }
    
    // Log errors
    if (updateData.lastError) {
      await siaeStorage.createAuditLog({
        companyId: (req.user as any)?.companyId || '',
        userId,
        action: 'smart_card_error',
        entityType: 'smart_card_session',
        entityId: id,
        description: `Errore smart card: ${updateData.lastError}`,
        ipAddress: (req.ip || '').substring(0, 45),
        userAgent: (req.get('user-agent') || '').substring(0, 500)
      });
    }
    
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Close smart card session
router.delete('/smart-card/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Non autorizzato" });
    }
    
    // Check session ownership
    const existingSession = await siaeStorage.getSmartCardSessionById(id);
    if (!existingSession) {
      return res.status(404).json({ message: "Sessione non trovata" });
    }
    
    if (existingSession.userId !== userId) {
      return res.status(403).json({ message: "Non autorizzato a chiudere questa sessione" });
    }
    
    await siaeStorage.closeSmartCardSession(id);
    
    // Log audit
    await siaeStorage.createAuditLog({
      companyId: (req.user as any)?.companyId || '',
      userId,
      action: 'smart_card_disconnect',
      entityType: 'smart_card_session',
      entityId: id,
      description: 'Disconnesso lettore smart card',
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Verify smart card is ready for ticket emission - CRITICAL FOR SIAE COMPLIANCE
router.get('/smart-card/verify-emission', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Non autorizzato" });
    }
    
    const session = await siaeStorage.getActiveSmartCardSession(userId);
    
    if (!session) {
      return res.status(403).json({
        canEmit: false,
        reason: "ERRORE FISCALE: Nessuna sessione smart card attiva. Collegare il lettore MiniLector EVO.",
        code: "NO_SESSION"
      });
    }
    
    if (session.status === 'disconnected') {
      return res.status(403).json({
        canEmit: false,
        reason: "ERRORE FISCALE: Lettore smart card disconnesso. Ricollegare il dispositivo.",
        code: "READER_DISCONNECTED"
      });
    }
    
    if (session.status === 'error') {
      return res.status(403).json({
        canEmit: false,
        reason: `ERRORE FISCALE: Errore lettore smart card. ${session.lastError || 'Verificare la connessione.'}`,
        code: "READER_ERROR"
      });
    }
    
    if (!session.cardAtr || session.cardAtr === '') {
      return res.status(403).json({
        canEmit: false,
        reason: "ERRORE FISCALE: Smart Card SIAE non inserita. Inserire la carta sigilli per emettere biglietti.",
        code: "NO_CARD"
      });
    }
    
    if (session.status !== 'connected') {
      return res.status(403).json({
        canEmit: false,
        reason: "ERRORE FISCALE: Stato lettore non valido. Verificare la connessione.",
        code: "INVALID_STATE"
      });
    }
    
    res.json({
      canEmit: true,
      sessionId: session.id,
      readerName: session.readerName,
      cardType: session.cardType,
      cardAtr: session.cardAtr,
      ticketsEmitted: session.ticketsEmittedCount,
      sealsUsed: session.sealsUsedCount
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== SIAE Reports ====================

// Helper function per costruire i dati del report C1 (Quadri A/B/C)
// Usata sia dall'endpoint GET che dall'endpoint POST per garantire consistenza
interface C1ReportOptions {
  reportType: 'giornaliero' | 'mensile';
  reportDate?: Date; // Data di riferimento (default: oggi)
}

function buildC1ReportData(
  event: any, 
  company: any, 
  siaeConfig: any,
  location: any,
  sectors: any[], 
  allTickets: any[],
  options: C1ReportOptions
) {
  const { reportType, reportDate } = options;
  const isMonthly = reportType === 'mensile';
  const refDate = reportDate || new Date();
  const today = refDate.toISOString().split('T')[0];
  
  // Helper function to get ticket price with fallback - SEMPRE usare il prezzo effettivo del ticket
  const getTicketPrice = (t: any) => Number(t.ticketPrice) || Number(t.grossAmount) || Number(t.priceAtPurchase) || 0;
  
  // Helper function to derive ticketType with fallback from ticketTypeCode
  const getTicketType = (t: any): 'intero' | 'ridotto' | 'omaggio' => {
    if (t.ticketType === 'intero' || t.ticketType === 'ridotto' || t.ticketType === 'omaggio') {
      return t.ticketType;
    }
    if (t.ticketTypeCode === 'INT') return 'intero';
    if (t.ticketTypeCode === 'RID') return 'ridotto';
    if (t.ticketTypeCode === 'OMG' || t.ticketTypeCode === 'OMA') return 'omaggio';
    return 'intero';
  };
  
  // Helper: determina se un biglietto è annullato (status O cancellationReasonCode/cancellationDate)
  const isTicketCancelled = (t: any): boolean => {
    if (isCancelledStatus(t.status)) return true;
    if (t.cancellationReasonCode || t.cancellationDate) return true;
    return false;
  };

  // For daily report: filter tickets by today's emission date
  // For monthly report: filter tickets by month of reportDate
  let tickets = allTickets;
  let cancelledTickets = allTickets.filter(t => isTicketCancelled(t));
  
  if (!isMonthly) {
    // Daily report: only tickets emitted today
    tickets = allTickets.filter(t => {
      if (!t.emissionDate) return false;
      const ticketDate = new Date(t.emissionDate).toISOString().split('T')[0];
      return ticketDate === today;
    });
    // Also filter cancelled tickets for today
    cancelledTickets = allTickets.filter(t => {
      if (!isTicketCancelled(t)) return false;
      if (t.cancellationDate) {
        const cancelDate = new Date(t.cancellationDate).toISOString().split('T')[0];
        return cancelDate === today;
      }
      return false;
    });
  } else {
    // Monthly report: filter tickets by month/year of reportDate
    const refMonth = refDate.getMonth();
    const refYear = refDate.getFullYear();
    tickets = allTickets.filter(t => {
      if (!t.emissionDate) return false;
      const ticketDate = new Date(t.emissionDate);
      return ticketDate.getMonth() === refMonth && ticketDate.getFullYear() === refYear;
    });
    cancelledTickets = allTickets.filter(t => {
      if (!isTicketCancelled(t)) return false;
      if (t.cancellationDate) {
        const cancelDate = new Date(t.cancellationDate);
        return cancelDate.getMonth() === refMonth && cancelDate.getFullYear() === refYear;
      }
      return false;
    });
  }
  
  // Filter only active/emitted tickets for sales calculations
  const activeTickets = tickets.filter(t => !isTicketCancelled(t));

  const salesByDate: Record<string, { 
    date: string; 
    ticketsSold: number; 
    totalAmount: number;
    byTicketType: Record<string, { name: string; quantity: number; amount: number }>;
    bySector: Record<string, { name: string; quantity: number; amount: number }>;
  }> = {};

  // Process ALL tickets (including those without transactions - cashier tickets)
  for (const ticket of activeTickets) {
    const dateStr = ticket.emissionDate 
      ? new Date(ticket.emissionDate).toISOString().split('T')[0] 
      : 'N/D';
    
    if (!salesByDate[dateStr]) {
      salesByDate[dateStr] = {
        date: dateStr,
        ticketsSold: 0,
        totalAmount: 0,
        byTicketType: {},
        bySector: {},
      };
    }
    
    const price = getTicketPrice(ticket);
    salesByDate[dateStr].ticketsSold += 1;
    salesByDate[dateStr].totalAmount += price;

    const ticketType = getTicketType(ticket);
    if (!salesByDate[dateStr].byTicketType[ticketType]) {
      salesByDate[dateStr].byTicketType[ticketType] = { 
        name: ticketType === 'intero' ? 'Intero' : ticketType === 'ridotto' ? 'Ridotto' : 'Omaggio', 
        quantity: 0, 
        amount: 0 
      };
    }
    salesByDate[dateStr].byTicketType[ticketType].quantity += 1;
    salesByDate[dateStr].byTicketType[ticketType].amount += price;

    const sector = sectors.find(s => s.id === ticket.sectorId);
    const sectorName = sector?.name || 'Sconosciuto';
    if (!salesByDate[dateStr].bySector[sectorName]) {
      salesByDate[dateStr].bySector[sectorName] = { name: sectorName, quantity: 0, amount: 0 };
    }
    salesByDate[dateStr].bySector[sectorName].quantity += 1;
    salesByDate[dateStr].bySector[sectorName].amount += price;
  }

  const dailySales = Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculate totals - TUTTI i totali monetari usano i prezzi effettivi dei ticket
  const totalTicketsSold = activeTickets.length;
  const totalRevenue = activeTickets.reduce((sum, t) => sum + getTicketPrice(t), 0);
  
  // Calculate VAT - legge event.vatRate o default 10%
  const vatRate = Number(event.vatRate) || 10;
  const vatAmount = totalRevenue * (vatRate / (100 + vatRate));
  const netRevenue = totalRevenue - vatAmount;

  // Calcola totali per tipologia biglietto
  const ticketsByType = {
    intero: activeTickets.filter(t => getTicketType(t) === 'intero'),
    ridotto: activeTickets.filter(t => getTicketType(t) === 'ridotto'),
    omaggio: activeTickets.filter(t => getTicketType(t) === 'omaggio')
  };

  // Calcola imposta intrattenimenti - legge event.entertainmentTaxRate o default 16.5%
  const isIntrattenimento = event.eventType === 'intrattenimento';
  const impostaIntrattenimentiRate = isIntrattenimento 
    ? (Number(event.entertainmentTaxRate) || 16.5) 
    : 0;
  const impostaIntrattenimenti = isIntrattenimento ? (netRevenue * impostaIntrattenimentiRate / 100) : 0;

  // Capienza totale
  const capienzaTotale = sectors.reduce((sum, s) => sum + (s.capacity || 0), 0);

  // QUADRO A - Dati Identificativi (conforme Allegato 3 G.U. n.188 12/08/2004)
  // Include: Organizzatore, Titolare Sistema Emissione, Dati Locale, Dati Evento
  const quadroA = {
    // === DATI ORGANIZZATORE ===
    // Mappa campi dalla tabella companies: taxId = P.IVA, fiscalCode = C.F.
    denominazioneOrganizzatore: company?.name || 'N/D',
    codiceFiscaleOrganizzatore: company?.fiscalCode || 'N/D',
    partitaIvaOrganizzatore: company?.taxId || 'N/D',
    indirizzoOrganizzatore: company?.address || 'N/D',
    comuneOrganizzatore: company?.city || 'N/D',
    provinciaOrganizzatore: company?.province || 'N/D',
    capOrganizzatore: company?.postalCode || 'N/D',
    
    // === TITOLARE SISTEMA DI EMISSIONE (Allegato 3 - campo obbligatorio) ===
    // Può essere diverso dall'organizzatore (es. società che gestisce biglietteria)
    // Usa dati da siaeSystemConfig se disponibile, altrimenti fallback su company
    titolareSistemaEmissione: siaeConfig?.businessName || company?.name || 'N/D',
    codiceFiscaleTitolareSistema: siaeConfig?.taxId || company?.fiscalCode || 'N/D',
    partitaIvaTitolareSistema: siaeConfig?.vatNumber || company?.taxId || 'N/D',
    indirizzoTitolareSistema: siaeConfig?.businessAddress || company?.address || 'N/D',
    comuneTitolareSistema: siaeConfig?.businessCity || company?.city || 'N/D',
    provinciaTitolareSistema: siaeConfig?.businessProvince || company?.province || 'N/D',
    capTitolareSistema: siaeConfig?.businessPostalCode || company?.postalCode || 'N/D',
    codiceSistemaEmissione: siaeConfig?.systemCode || event.emissionSystemCode || 'N/D',
    
    // === MANCATO FUNZIONAMENTO SISTEMA (Allegato 3 - sezione opzionale) ===
    // Da compilare solo in caso di malfunzionamento del sistema automatizzato
    sistemaFunzionante: true, // default: sistema funziona
    dataInizioMalfunzionamento: null as string | null,
    oraInizioMalfunzionamento: null as string | null,
    dataFineMalfunzionamento: null as string | null,
    oraFineMalfunzionamento: null as string | null,
    
    // === DATI LOCALE/VENUE ===
    // Usa dati da locations table se disponibile, altrimenti fallback su event
    codiceLocale: location?.siaeLocationCode || event.siaeLocationCode || 'N/D',
    denominazioneLocale: location?.name || event.venueName || 'N/D',
    indirizzoLocale: location?.address || event.venueAddress || 'N/D',
    comuneLocale: location?.city || event.venueCity || 'N/D',
    provinciaLocale: location?.province || event.venueProvince || 'N/D', 
    capLocale: location?.postalCode || location?.cap || event.venueCap || 'N/D',
    capienza: capienzaTotale,
    
    // === DATI EVENTO ===
    denominazioneEvento: event.eventName || event.name || 'N/D',
    codiceEvento: event.eventCode || event.code || 'N/D',
    genereEvento: event.genreCode || event.genre || 'N/D',
    dataEvento: event.eventDate,
    oraEvento: event.eventTime || 'N/D',
    oraFineEvento: event.eventEndTime || '06:00', // Ora fine evento (default 06:00 per discoteche)
    tipologiaEvento: event.eventType || 'spettacolo', // spettacolo o intrattenimento
    
    // === PERIODO DI RIFERIMENTO (per riepilogo giornaliero/mensile) ===
    periodoRiferimento: reportType,
    dataRiferimento: today,
  };

  // Progressivo emissione globale per questo report
  let progressivoGlobale = 0;

  // QUADRO B - Dettaglio Titoli di Accesso per Ordine/Settore
  const settori = sectors.map((s, index) => {
    const sectorActiveTickets = activeTickets.filter(t => t.sectorId === s.id);
    const sectorCancelledTickets = cancelledTickets.filter(t => t.sectorId === s.id);
    const sectorIntero = sectorActiveTickets.filter(t => getTicketType(t) === 'intero');
    const sectorRidotto = sectorActiveTickets.filter(t => getTicketType(t) === 'ridotto');
    const sectorOmaggio = sectorActiveTickets.filter(t => getTicketType(t) === 'omaggio');
    
    // Calcola totali usando SEMPRE i prezzi effettivi dei ticket
    const totaleInteri = sectorIntero.reduce((sum, t) => sum + getTicketPrice(t), 0);
    const totaleRidotti = sectorRidotto.reduce((sum, t) => sum + getTicketPrice(t), 0);
    const totaleSettore = sectorActiveTickets.reduce((sum, t) => sum + getTicketPrice(t), 0);
    
    // Calcola prezzoUnitario come media dei prezzi effettivi (non dal settore)
    const prezzoUnitarioInteri = sectorIntero.length > 0 
      ? totaleInteri / sectorIntero.length 
      : 0;
    const prezzoUnitarioRidotti = sectorRidotto.length > 0 
      ? totaleRidotti / sectorRidotto.length 
      : 0;
    
    // Incrementa progressivo per questo settore
    const progressivoSettore = progressivoGlobale + 1;
    progressivoGlobale += sectorActiveTickets.length;
    
    return {
      ordinePosto: index + 1, // 1°, 2°, 3° ordine progressivo
      codiceSettore: s.sectorCode || `SET${index + 1}`,
      denominazione: s.name,
      capienza: s.capacity || 0,
      
      // Dettaglio per tipologia - prezzi effettivi dai ticket
      interi: {
        quantita: sectorIntero.length,
        prezzoUnitario: Math.round(prezzoUnitarioInteri * 100) / 100,
        totale: totaleInteri
      },
      ridotti: {
        quantita: sectorRidotto.length,
        prezzoUnitario: Math.round(prezzoUnitarioRidotti * 100) / 100,
        totale: totaleRidotti
      },
      omaggi: {
        quantita: sectorOmaggio.length,
        prezzoUnitario: 0,
        totale: 0 // Omaggi non generano incasso
      },
      
      // Totali settore - calcolati dai ticket effettivi
      totaleVenduti: sectorActiveTickets.length,
      totaleAnnullati: sectorCancelledTickets.length,
      totaleIncasso: totaleSettore
    };
  });

  // Calcola riepilogo tipologie con prezzi effettivi
  const totaleInteriGlobale = ticketsByType.intero.reduce((s, t) => s + getTicketPrice(t), 0);
  const totaleRidottiGlobale = ticketsByType.ridotto.reduce((s, t) => s + getTicketPrice(t), 0);
  
  // QUADRO B - Struttura conforme Allegato 3 G.U. n.188 12/08/2004
  // Colonne: (1) Ordine del posto, (2) Settore, (3) Capienza, (4) Tipo titolo (TAB.3), 
  // (5) Prezzo unitario, N° titoli emessi, (6) Ricavo lordo, Imposta intratt., 
  // Imponibile IVA, N° titoli annullati, IVA lorda
  
  // Costruisci righe dettagliate per ogni combinazione settore/tipo titolo
  // secondo il formato ufficiale SIAE (ogni riga = 1 tipo titolo per settore)
  const righeDettaglio: Array<{
    ordinePosto: number;
    settore: string;
    capienza: number;
    tipoTitolo: string;           // Codice TAB.3: I1, RX, O1, etc.
    tipoTitoloDescrizione: string; // Descrizione: "Intero", "Ridotto generico", etc.
    prezzoUnitario: number;
    numeroTitoliEmessi: number;
    ricavoLordo: number;
    impostaIntrattenimenti: number;
    imponibileIva: number;
    numeroTitoliAnnullati: number;
    ivaLorda: number;
  }> = [];
  
  // Genera righe per ogni settore e tipo titolo
  let rigaOrdine = 1;
  for (const s of sectors) {
    const sectorActiveTickets = activeTickets.filter(t => t.sectorId === s.id);
    const sectorCancelledTickets = cancelledTickets.filter(t => t.sectorId === s.id);
    
    // Raggruppa ticket per tipo (usando codici TAB.3 ufficiali)
    const tipiTitolo = ['intero', 'ridotto', 'omaggio'] as const;
    const codiciTab3: Record<string, { codice: string; descrizione: string }> = {
      'intero': { codice: 'I1', descrizione: 'Intero' },
      'ridotto': { codice: 'RX', descrizione: 'Ridotto generico' },
      'omaggio': { codice: 'OX', descrizione: 'Omaggio generico' },
    };
    
    for (const tipo of tipiTitolo) {
      const ticketsTipo = sectorActiveTickets.filter(t => getTicketType(t) === tipo);
      const ticketsCancelledTipo = sectorCancelledTickets.filter(t => getTicketType(t) === tipo);
      
      if (ticketsTipo.length > 0 || ticketsCancelledTipo.length > 0) {
        const ricavoLordo = ticketsTipo.reduce((sum, t) => sum + getTicketPrice(t), 0);
        const prezzoUnitario = ticketsTipo.length > 0 
          ? ricavoLordo / ticketsTipo.length 
          : 0;
        
        // Calcola IVA su ricavo lordo
        const ivaLorda = ricavoLordo * (vatRate / (100 + vatRate));
        const imponibileIva = ricavoLordo - ivaLorda;
        
        // Imposta intrattenimenti (solo se evento è intrattenimento)
        const impostaIntratt = isIntrattenimento 
          ? imponibileIva * (impostaIntrattenimentiRate / 100) 
          : 0;
        
        righeDettaglio.push({
          ordinePosto: rigaOrdine,
          settore: s.name,
          capienza: s.capacity || 0,
          tipoTitolo: codiciTab3[tipo].codice,
          tipoTitoloDescrizione: codiciTab3[tipo].descrizione,
          prezzoUnitario: Math.round(prezzoUnitario * 100) / 100,
          numeroTitoliEmessi: ticketsTipo.length,
          ricavoLordo: Math.round(ricavoLordo * 100) / 100,
          impostaIntrattenimenti: Math.round(impostaIntratt * 100) / 100,
          imponibileIva: Math.round(imponibileIva * 100) / 100,
          numeroTitoliAnnullati: ticketsCancelledTipo.length,
          ivaLorda: Math.round(ivaLorda * 100) / 100,
        });
        
        rigaOrdine++;
      }
    }
  }
  
  const quadroB = {
    // Righe dettaglio conformi al modello ufficiale
    righeDettaglio,
    
    // Settori aggregati (legacy - per compatibilità)
    settori,
    
    // Riepilogo per tipologia biglietto (TAB.3 codici)
    riepilogoTipologie: {
      interi: {
        codice: 'I1',
        descrizione: 'Intero',
        quantita: ticketsByType.intero.length,
        prezzoUnitario: ticketsByType.intero.length > 0 
          ? Math.round((totaleInteriGlobale / ticketsByType.intero.length) * 100) / 100 
          : 0,
        totale: Math.round(totaleInteriGlobale * 100) / 100
      },
      ridotti: {
        codice: 'RX',
        descrizione: 'Ridotto generico',
        quantita: ticketsByType.ridotto.length,
        prezzoUnitario: ticketsByType.ridotto.length > 0 
          ? Math.round((totaleRidottiGlobale / ticketsByType.ridotto.length) * 100) / 100 
          : 0,
        totale: Math.round(totaleRidottiGlobale * 100) / 100
      },
      omaggi: {
        codice: 'OX',
        descrizione: 'Omaggio generico',
        quantita: ticketsByType.omaggio.length,
        prezzoUnitario: 0,
        totale: 0
      }
    },
    
    // Progressivo emissione totale per questo report
    progressivoEmissione: progressivoGlobale,
    
    // Totali generali QUADRO B (conformi al modello ufficiale)
    totaleBigliettiEmessi: totalTicketsSold,
    totaleBigliettiVenduti: totalTicketsSold, // alias
    totaleBigliettiAnnullati: cancelledTickets.length,
    totaleRicavoLordo: Math.round(totalRevenue * 100) / 100,
    totaleIncassoLordo: Math.round(totalRevenue * 100) / 100, // alias
    totaleImpostaIntrattenimenti: Math.round(impostaIntrattenimenti * 100) / 100,
    totaleImponibileIva: Math.round(netRevenue * 100) / 100,
    totaleIvaLorda: Math.round(vatAmount * 100) / 100,
  };

  // QUADRO C - Riepilogo Imposte e Contributi
  const quadroC = {
    // Base imponibile
    incassoLordo: totalRevenue,
    
    // IVA
    aliquotaIVA: vatRate,
    baseImponibileIVA: Math.round(netRevenue * 100) / 100,
    importoIVA: Math.round(vatAmount * 100) / 100,
    
    // Imposta Intrattenimenti (solo per attività di intrattenimento)
    isIntrattenimento: isIntrattenimento,
    aliquotaImpostaIntrattenimenti: impostaIntrattenimentiRate,
    baseImponibileIntrattenimenti: isIntrattenimento ? Math.round(netRevenue * 100) / 100 : 0,
    importoImpostaIntrattenimenti: Math.round(impostaIntrattenimenti * 100) / 100,
    
    // Diritto d'autore SIAE (se applicabile)
    dirittoAutore: Number(event.authorRights) || 0,
    
    // Totali
    totaleImposte: Math.round((vatAmount + impostaIntrattenimenti) * 100) / 100,
    incassoNetto: Math.round((netRevenue - impostaIntrattenimenti) * 100) / 100
  };

  return {
    // Tipo report esplicito
    reportType,
    reportDate: today,
    
    quadroA,
    quadroB,
    quadroC,
    dailySales,
    // Dati aggiuntivi per compatibilità
    activeTicketsCount: activeTickets.length,
    cancelledTicketsCount: cancelledTickets.length,
    totalRevenue,
    today
  };
}

// C1 Report - Modello conforme normativa SIAE
// STRUTTURA: QUADRO A (dati identificativi), QUADRO B (dettaglio biglietti), QUADRO C (imposte)
// Query param: type=giornaliero|daily (default) or type=mensile|monthly
router.get('/api/siae/ticketed-events/:id/reports/c1', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reportTypeParam = (req.query.type as string) || 'giornaliero';
    const reportType: 'giornaliero' | 'mensile' = (reportTypeParam === 'mensile' || reportTypeParam === 'monthly') ? 'mensile' : 'giornaliero';
    
    // Accetta parametro date per selezionare data/mese di riferimento
    const dateParam = req.query.date as string;
    const reportDate = dateParam ? new Date(dateParam) : new Date();
    
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    // Ottieni dati company per QUADRO A - Organizzatore
    const company = event.companyId ? await storage.getCompany(event.companyId) : null;
    
    // Ottieni siaeSystemConfig per QUADRO A - Titolare Sistema Emissione
    // Usa getGlobalSiaeSystemConfig() perché la config viene salvata globalmente
    const siaeConfig = await siaeStorage.getGlobalSiaeSystemConfig() || null;
    
    // Ottieni location per QUADRO A - Dati Locale
    // Nota: getSiaeTicketedEvent restituisce eventLocation, non locationId
    const locationId = event.eventLocation || event.locationId;
    const location = locationId ? await storage.getLocation(locationId) : null;
    
    const sectors = await siaeStorage.getSiaeEventSectors(id);
    const allTickets = await siaeStorage.getSiaeTicketsByEvent(id);
    
    // Usa la funzione helper per costruire i dati del report
    const reportData = buildC1ReportData(event, company, siaeConfig, location, sectors, allTickets, { 
      reportType,
      reportDate: reportDate
    });

    // Risposta conforme al modello C1 SIAE - strutturata in Quadri
    res.json({
      // Metadata report
      reportType: reportData.reportType,
      reportName: reportType === 'mensile' ? 'MODELLO C.1 - Riepilogo Mensile Titoli di Accesso' : 'MODELLO C.1 - Registro Giornaliero Titoli di Accesso',
      generatedAt: new Date().toISOString(),

      // QUADRO A - Dati Identificativi (conforme normativa SIAE)
      quadroA: reportData.quadroA,

      // QUADRO B - Dettaglio Titoli di Accesso per Ordine/Settore
      quadroB: {
        ...reportData.quadroB,
        // Alias per backward compatibility
        totaleBigliettiEmessi: reportData.quadroB.totaleBigliettiVenduti,
      },

      // QUADRO C - Riepilogo Imposte e Contributi
      quadroC: reportData.quadroC,

      // Dati legacy per compatibilità
      eventId: id,
      dailySales: reportData.dailySales
    });
  } catch (error: any) {
    console.error('[C1 Report] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// C1 Report - Send to SIAE Transmissions (Struttura Quadri A/B/C conforme normativa SIAE)
// Usa la stessa funzione helper buildC1ReportData per garantire consistenza con l'endpoint GET
// Usa requireOrganizer per permettere a gestore, organizer e super_admin di inviare report
router.post('/api/siae/ticketed-events/:id/reports/c1/send', requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { toEmail, reportType: reqReportType } = req.body;
    const reportType: 'giornaliero' | 'mensile' = (reqReportType === 'mensile' || reqReportType === 'monthly') ? 'mensile' : 'giornaliero';
    const isMonthly = reportType === 'mensile';
    
    // Get event data
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Check international exemption
    const intlCheck = await checkInternationalExemption(event.eventId, event.companyId);
    if (intlCheck.exempt) {
      return res.status(400).json({ message: intlCheck.reason, code: 'INTERNATIONAL_EXEMPT' });
    }

    // Get company data for Quadro A - Organizzatore
    const company = await storage.getCompany(event.companyId);
    
    // Ottieni siaeSystemConfig per QUADRO A - Titolare Sistema Emissione
    // Usa getGlobalSiaeSystemConfig() perché la config viene salvata globalmente
    const siaeConfig = await siaeStorage.getGlobalSiaeSystemConfig() || null;
    
    // Ottieni location per QUADRO A - Dati Locale
    // Nota: getSiaeTicketedEvent restituisce eventLocation, non locationId
    const locationId = event.eventLocation || event.locationId;
    const location = locationId ? await storage.getLocation(locationId) : null;

    // Get tickets and sectors for C1 report data (usa stesse funzioni del GET)
    const allTickets = await siaeStorage.getSiaeTicketsByEvent(id);
    const sectors = await siaeStorage.getSiaeEventSectors(id);
    
    // Usa la funzione helper condivisa per costruire i dati del report
    // Questo garantisce che GET e POST usino gli stessi calcoli
    const reportData = buildC1ReportData(event, company, siaeConfig, location, sectors, allTickets, { 
      reportType,
      reportDate: new Date()
    });

    // ===== USA generateRCAXml - Formato RiepilogoControlloAccessi per RCA =====
    // Genera XML conforme SIAE DTD ControlloAccessi_v0001_20080626.dtd
    // RCA (C1 evento) genera risposta da SIAE
    // NOTA: NON usare generateC1LogXml che genera LogTransazione - causa errore SIAE 40605
    const eventDate = event.eventDate ? new Date(event.eventDate) : new Date();
    
    // Get progressive number for this transmission
    const transmissionCount = await siaeStorage.getSiaeTransmissionCount(event.companyId);
    const progressivoGenerazione = transmissionCount + 1;
    
    // Prepara i biglietti per generateRCAXml (formato SiaeTicketForLog)
    // IMPORTANTE: Determinare correttamente lo status per conformità SIAE
    // Se cancellationReasonCode o cancellationDate sono presenti, il biglietto è annullato
    const ticketsForLog: SiaeTicketForLog[] = allTickets.map(t => {
      // Determina lo status corretto: se ha motivo/data annullamento, è annullato
      let effectiveStatus = t.status || 'emitted';
      if (!isCancelledStatus(effectiveStatus) && (t.cancellationReasonCode || t.cancellationDate)) {
        effectiveStatus = 'cancelled'; // Forza status annullato se ha dati di annullamento
      }
      
      return {
        id: t.id,
        fiscalSealCode: t.fiscalSealCode || null,
        progressiveNumber: t.progressiveNumber || 0,
        cardCode: t.cardCode || null,
        emissionChannelCode: t.emissionChannelCode || null,
        emissionDate: t.emissionDate || new Date(),
        ticketTypeCode: t.ticketTypeCode || 'R1',
        sectorCode: t.sectorCode || 'P0',
        grossAmount: t.grossAmount || '0',
        netAmount: t.netAmount || null,
        vatAmount: t.vatAmount || null,
        prevendita: t.prevendita || null,
        prevenditaVat: t.prevenditaVat || null,
        status: effectiveStatus,
        cancellationReasonCode: t.cancellationReasonCode || null,
        cancellationDate: t.cancellationDate || null,
        isComplimentary: t.isComplimentary || false,
        row: t.row || null,
        seatNumber: t.seatNumber || null,
        participantFirstName: t.participantFirstName || null,
        participantLastName: t.participantLastName || null,
        originalTicketId: t.originalTicketId || null,
        replacedByTicketId: t.replacedByTicketId || null,
        originalProgressiveNumber: t.progressiveNumber || null,
      };
    });
    
    // Prepara evento per generateRCAXml (formato SiaeEventForLog)
    const eventForLog: SiaeEventForLog = {
      id: event.id,
      name: event.eventName || 'Evento',
      date: eventDate,
      time: event.eventTime ? new Date(event.eventTime) : eventDate,
      venueCode: location?.siaeLocationCode || event.siaeVenueCode || '0000000000001',
      genreCode: event.genreCode || '64',
      organizerTaxId: company?.fiscalCode || company?.taxId || siaeConfig?.taxId || '',
      organizerName: company?.name || siaeConfig?.businessName || 'Organizzatore',
      tipoTassazione: (event.taxationType as 'S' | 'I') || 'I',
      ivaPreassolta: (event.ivaPreassolta as 'N' | 'B' | 'F') || 'N',
    };
    
    // Prepara parametri per generateRCAXml - Formato RiepilogoControlloAccessi (Allegato B)
    // NOTA: Usa generateRCAXml invece di generateC1LogXml (deprecato - causa errore SIAE 40605)
    const companyTaxId = company?.fiscalCode || company?.taxId || siaeConfig?.taxId || '';
    const companyBusinessName = company?.name || siaeConfig?.businessName || 'Azienda';
    
    // FIX 2026-01-17: Per RCA (S/MIME), codice sistema DEVE provenire dalla Smart Card
    const rcaEfffData = getCachedEfffData();
    const rcaSmimeResult = resolveSystemCodeForSmime(rcaEfffData, siaeConfig);
    
    if (!rcaSmimeResult.success || !rcaSmimeResult.systemCode) {
      console.error(`[RCA] BLOCCO: ${rcaSmimeResult.error}`);
      return res.status(400).json({
        message: rcaSmimeResult.error || 'Smart Card richiesta per trasmissioni RCA',
        code: 'SMARTCARD_REQUIRED_FOR_RCA',
        source: rcaSmimeResult.source,
      });
    }
    
    const rcaResolvedSystemCode = rcaSmimeResult.systemCode;
    if (rcaSmimeResult.warning) {
      console.warn(`[RCA] Warning: ${rcaSmimeResult.warning}`);
    }
    console.log(`[RCA] System code from ${rcaSmimeResult.source}: ${rcaResolvedSystemCode}`);
    
    const rcaParams: RCAParams = {
      companyId: event.companyId,
      eventId: event.id,
      event: eventForLog,
      tickets: ticketsForLog,
      systemConfig: {
        systemCode: rcaResolvedSystemCode, // FIX: Usa codice risolto per coerenza
        taxId: siaeConfig?.taxId || companyTaxId,
        businessName: siaeConfig?.businessName || companyBusinessName,
      },
      companyName: companyBusinessName,
      taxId: companyTaxId,
      progressivo: progressivoGenerazione,
      venueName: location?.name || event.eventLocation || 'Locale',
    };
    
    // Genera XML RiepilogoControlloAccessi usando generateRCAXml
    // TODO: CONSOLIDATION CANDIDATE - usare createSiaeTransmissionWithXml da ./siae-transmission-service
    // Questa è la route principale per invio RCA evento. Per consolidare:
    // 1. Usare createSiaeTransmissionWithXml con rcaParams convertiti al formato del service
    // 2. Passare additionalTransmissionFields per signature, p7mContent, ecc.
    // 3. Il flusso di firma digitale rende complessa la consolidazione (signedXmlContent, p7mBase64)
    const rcaResult = generateRCAXml(rcaParams);
    
    if (!rcaResult.success) {
      return res.status(400).json({
        message: `Generazione RiepilogoControlloAccessi fallita: ${rcaResult.errors.join('; ')}`,
        errors: rcaResult.errors,
        warnings: rcaResult.warnings
      });
    }
    
    let xmlContent = rcaResult.xml;
    
    // AUTO-CORREZIONE PREVENTIVA: Correggi automaticamente errori comuni prima dell'invio
    const autoCorrectionRcaEvent = autoCorrectSiaeXml(xmlContent, eventForLog.genreCode);
    if (autoCorrectionRcaEvent.corrections.length > 0) {
      console.log(`[SIAE-ROUTES] AUTO-CORREZIONE: Applicate ${autoCorrectionRcaEvent.corrections.length} correzioni automatiche per RCA evento:`);
      for (const corr of autoCorrectionRcaEvent.corrections) {
        console.log(`  - ${corr.field}: ${corr.reason} (previene errore SIAE ${corr.siaeErrorPrevented})`);
      }
      xmlContent = autoCorrectionRcaEvent.correctedXml;
    }
    if (autoCorrectionRcaEvent.uncorrectableErrors.length > 0) {
      console.log(`[SIAE-ROUTES] ERRORI NON CORREGGIBILI: ${autoCorrectionRcaEvent.uncorrectableErrors.map(e => e.message).join('; ')}`);
    }
    
    // Nome file conforme Allegato C SIAE (Provvedimento Agenzia Entrate 04/03/2008):
    // Formato: RCA_AAAA_MM_GG_SSSSSSSS_###_XSI_V.XX.YY.p7m
    // Usa generateSiaeFileName per garantire formato corretto
    // Riusa rcaResolvedSystemCode già calcolato per coerenza con XML (errori SIAE 0600/0603)
    // fileName will be updated to .p7m if signed, otherwise .xsi
    let fileName = generateSiaeFileName('rca', eventDate, progressivoGenerazione, null, rcaResolvedSystemCode);

    // Check if digital signature is requested via smart card
    const { signWithSmartCard } = req.body;
    let signedXmlContent: string | undefined;
    let p7mBase64: string | undefined;
    let signatureData: { signatureValue: string; certificateData: string; signedAt: string } | null = null;
    
    if (signWithSmartCard) {
      console.log('[C1 Send] Digital signature requested via smart card');
      
      try {
        // Check if bridge is connected
        if (!isBridgeConnected()) {
          return res.status(400).json({ 
            message: "App desktop Event4U non connessa. Impossibile firmare il report.",
            code: "BRIDGE_NOT_CONNECTED"
          });
        }
        
        // Check if card is ready
        const cardReady = isCardReadyForSeals();
        if (!cardReady.ready) {
          return res.status(400).json({ 
            message: cardReady.error || "Smart Card SIAE non pronta",
            code: "CARD_NOT_READY"
          });
        }
        
        // Request digital signature from smart card
        const signature = await requestXmlSignature(xmlContent);
        
        // Supporta sia CAdES-BES (nuovo) che XMLDSig (legacy)
        if (signature.p7mBase64) {
          // CAdES-BES: mantieni il P7M Base64 separato per l'allegato email
          p7mBase64 = signature.p7mBase64;
          console.log(`[C1 Send] CAdES-BES signature created at ${signature.signedAt} (${signature.algorithm || 'SHA-256'})`);
        } else if (signature.signedXml) {
          // Legacy XMLDSig (deprecato)
          signedXmlContent = signature.signedXml;
          console.log('[C1 Send] XMLDSig signature created at', signature.signedAt, '(DEPRECATO)');
        }
        
        signatureData = {
          signatureValue: signature.signatureValue || '',
          certificateData: signature.certificateData || '',
          signedAt: signature.signedAt
        };
        // Update filename to .p7m for signed files per Allegato C SIAE
        fileName = generateSiaeFileName('rca', eventDate, progressivoGenerazione, 'cades', rcaResolvedSystemCode);
        
      } catch (signError: any) {
        console.error('[C1 Send] Signature error:', signError.message);
        return res.status(400).json({ 
          message: `Errore firma digitale: ${signError.message}`,
          code: "SIGNATURE_ERROR"
        });
      }
    }

    // Create transmission record - pass periodDate as Date object
    // Include ticketedEventId to link transmission to event
    // IMPORTANTE: Per C1 evento (LogTransazione) usare 'rca' per generare risposta SIAE
    const effectiveSignatureFormat = p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : null);
    const fileExtension = effectiveSignatureFormat === 'cades' ? '.p7m' : '.xsi';
    
    // Calculate transmission statistics for RCA report
    const rcaSendStats = await calculateTransmissionStats(
      reportData.tickets || [],
      event.companyId,
      id,
      event.tipoTassazione,
      event.entertainmentIncidence
    );
    const rcaSendFileHash = calculateFileHash(signedXmlContent || xmlContent);
    
    // FIX 2026-01-15: Salva systemCode per garantire coerenza nei reinvii (errori SIAE 0600/0603)
    const transmission = await siaeStorage.createSiaeTransmission({
      companyId: event.companyId,
      ticketedEventId: id, // Collegamento all'evento SIAE
      transmissionType: 'rca', // RCA = Riepilogo Controllo Accessi (C1 evento, genera risposta SIAE)
      periodDate: eventDate,
      fileName: fileName.replace(fileExtension, ''), // Nome senza estensione
      fileExtension,
      fileContent: signedXmlContent || xmlContent, // XMLDSig firmato o XML originale
      p7mContent: p7mBase64 || null, // CAdES-BES P7M per resend offline
      signatureFormat: effectiveSignatureFormat,
      signedAt: (p7mBase64 || signedXmlContent) ? new Date() : null,
      status: 'pending',
      ticketsCount: reportData.activeTicketsCount,
      ticketsCancelled: reportData.cancelledTicketsCount,
      totalAmount: reportData.totalRevenue.toFixed(2),
      progressivoInvio: progressivoGenerazione, // Progressivo invio per periodo fiscale
      systemCode: rcaResolvedSystemCode, // FIX: Salva codice per reinvii futuri
      fileHash: rcaSendFileHash,
      totalIva: rcaSendStats.totalIva.toFixed(2),
      totalEsenti: rcaSendStats.totalEsenti.toFixed(2),
      totalImpostaIntrattenimento: rcaSendStats.totalImpostaIntrattenimento.toFixed(2),
      cfOrganizzatore: siaeConfig?.taxId || '',
      ticketsChanged: rcaSendStats.ticketsChanged,
      ticketsResold: rcaSendStats.ticketsResold,
    });

    // Optionally send email
    if (toEmail) {
      const { sendSiaeTransmissionEmail } = await import('./email-service');
      
      // FIX 2026-01-15: Usa rcaResolvedSystemCode già calcolato per coerenza (errori SIAE 0600/0603, async per DTD validator)
      const preValidation = await validatePreTransmission(
        signedXmlContent || xmlContent,
        rcaResolvedSystemCode, // FIX: Usa codice risolto, non variabile inesistente
        'rca',
        eventDate
      );
      
      if (!preValidation.canTransmit) {
        await siaeStorage.updateSiaeTransmission(transmission.id, {
          status: 'error',
          errorMessage: preValidation.errors.map(e => `[${e.siaeErrorCode || 'ERR'}] ${e.message}`).join('; '),
        });
        return res.status(400).json({
          success: false,
          error: 'Validazione pre-trasmissione fallita',
          errors: preValidation.errors,
          warnings: preValidation.warnings,
          details: preValidation.details
        });
      }
      
      // FIX 2026-01-19: Genera nome file per email SENZA firma (usa .xsi per S/MIME)
      // Il nome file .xsi deve corrispondere all'attributo NomeFile nell'XML (errore 0600)
      const rcaEmailFileName = generateSiaeFileName('rca', eventDate, progressivoGenerazione, null, rcaResolvedSystemCode);
      
      const emailResult = await sendSiaeTransmissionEmail({
        to: toEmail,
        companyName: company?.name || 'N/A',
        transmissionType: 'rca', // RCA = Riepilogo Controllo Accessi (C1 evento, genera risposta SIAE)
        periodDate: eventDate,
        ticketsCount: reportData.activeTicketsCount,
        totalAmount: reportData.totalRevenue.toFixed(2),
        xmlContent: signedXmlContent || xmlContent, // XML originale o XMLDSig firmato
        transmissionId: transmission.id,
        systemCode: rcaResolvedSystemCode, // FIX: Usa codice risolto per coerenza Allegato C
        signWithSmime: true, // Per Allegato C SIAE 1.6.2 - firma S/MIME obbligatoria
        requireSignature: true,
        p7mBase64: p7mBase64, // CAdES-BES P7M per allegato email
        signatureFormat: p7mBase64 ? 'cades' : (signedXmlContent ? 'xmldsig' : undefined),
        // FIX 2026-01-19: Nome file allegato ESPLICITO per coerenza con attributo NomeFile nell'XML (errore 0600)
        explicitFileName: rcaEmailFileName,
      });

      // Controlla se l'invio è fallito (firma S/MIME non disponibile)
      if (!emailResult.success) {
        await siaeStorage.updateSiaeTransmission(transmission.id, {
          status: 'failed',
          error: emailResult.error || 'Invio email fallito',
        });
        return res.status(400).json({ 
          success: false, 
          message: emailResult.error || 'Invio email fallito - Firma S/MIME richiesta',
          transmissionId: transmission.id,
        });
      }

      await siaeStorage.updateSiaeTransmission(transmission.id, {
        status: 'sent',
        sentAt: new Date(),
        sentToPec: toEmail,
        smimeSigned: emailResult.smimeSigned || false,
        smimeSignerEmail: emailResult.signerEmail || null,
        smimeSignerName: emailResult.signerName || null,
        smimeSignedAt: emailResult.signedAt ? new Date(emailResult.signedAt) : null,
      });
    }

    res.status(201).json({ 
      success: true, 
      transmissionId: transmission.id,
      signed: signWithSmartCard && signatureData ? true : false,
      signedAt: signatureData?.signedAt || null,
      message: signWithSmartCard && signatureData 
        ? "Report C1 firmato digitalmente e salvato con successo"
        : toEmail 
          ? "Report C1 inviato con successo" 
          : "Report C1 salvato come trasmissione"
    });
  } catch (error: any) {
    console.error('[C1 Send] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/siae/ticketed-events/:id/validate-prerequisites - Validazione prerequisiti SIAE per trasmissione
router.get('/api/siae/ticketed-events/:id/validate-prerequisites', requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const user = req.user as any;
    
    // Ottieni evento SIAE
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento SIAE non trovato" });
    }
    
    // Verifica accesso
    if (user.role !== 'super_admin' && ticketedEvent.companyId !== user.companyId) {
      return res.status(403).json({ message: "Accesso non autorizzato" });
    }
    
    // Ottieni dati correlati
    const company = ticketedEvent.companyId ? await storage.getCompany(ticketedEvent.companyId) : null;
    const baseEvent = await storage.getEvent(ticketedEvent.eventId);
    const sectors = await siaeStorage.getSiaeEventSectors(eventId);
    const systemConfig = await siaeStorage.getGlobalSiaeSystemConfig();
    
    // Ottieni dati Smart Card dal bridge (se connesso)
    const bridgeConnected = isBridgeConnected();
    const efffData = getCachedEfffData();
    
    // Costruisci dati per validazione
    const prerequisiteData: SiaePrerequisiteData = {
      company: {
        id: company?.id || '',
        name: company?.name || '',
        taxId: company?.taxId || null,
        fiscalCode: company?.fiscalCode || null,
        regimeFiscale: company?.regimeFiscale || null,
      },
      ticketedEvent: {
        id: ticketedEvent.id,
        siaeLocationCode: ticketedEvent.siaeLocationCode || null,
        genreCode: ticketedEvent.genreCode || '61',
        taxType: ticketedEvent.taxType || 'I',
        entertainmentIncidence: ticketedEvent.entertainmentIncidence ?? null,
        organizerType: ticketedEvent.organizerType || 'G',
        author: ticketedEvent.author || null,
        performer: ticketedEvent.performer || null,
        filmNationality: ticketedEvent.filmNationality || null,
        totalCapacity: ticketedEvent.totalCapacity || 0,
      },
      event: {
        id: baseEvent?.id || '',
        name: baseEvent?.name || ticketedEvent.eventName || '',
        startDatetime: baseEvent?.startDatetime || ticketedEvent.startDate || null,
        endDatetime: baseEvent?.endDatetime || ticketedEvent.endDate || null,
      },
      sectors: sectors.map(s => ({
        id: s.id,
        orderCode: s.sortOrder || null,
        capacity: s.capacity || null,
      })),
      systemConfig: systemConfig ? {
        systemCode: systemConfig.systemCode || null,
      } : null,
      smartCardData: efffData ? {
        systemId: efffData.systemId,
        partnerCodFis: efffData.partnerCodFis,
        partnerName: efffData.partnerName,
      } : null,
      bridgeConnected,
    };
    
    // Esegui validazione
    const validation = validateSiaeReportPrerequisites(prerequisiteData);
    
    res.json(validation);
  } catch (error: any) {
    console.error('[Validate Prerequisites] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/siae/ticketed-events/:id/transmissions - Storico trasmissioni per evento
router.get('/api/siae/ticketed-events/:id/transmissions', requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const user = req.user as any;
    
    // Verifica che l'evento esista e appartenga all'utente
    const event = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Per super_admin mostra tutte le trasmissioni, altrimenti filtra per companyId
    const companyId = user.role === 'super_admin' ? event.companyId : user.companyId;
    
    // Verifica accesso all'evento
    if (user.role !== 'super_admin' && event.companyId !== companyId) {
      return res.status(403).json({ message: "Accesso non autorizzato a questo evento" });
    }
    
    const transmissions = await db.select()
      .from(siaeTransmissions)
      .where(and(
        eq(siaeTransmissions.ticketedEventId, eventId),
        eq(siaeTransmissions.companyId, event.companyId)
      ))
      .orderBy(desc(siaeTransmissions.createdAt));
      
    res.json(transmissions);
  } catch (error: any) {
    console.error('[Transmissions History] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// C2 Report - Riepilogo Abbonamenti (conforme Allegato 4 G.U. n.188 12/08/2004)
router.get('/api/siae/ticketed-events/:id/reports/c2', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    // Ottieni dati company per QUADRO A - Organizzatore
    const company = event.companyId ? await storage.getCompany(event.companyId) : null;
    
    // Ottieni siaeSystemConfig per QUADRO A - Titolare Sistema Emissione
    // Usa getGlobalSiaeSystemConfig() perché la config viene salvata globalmente
    const siaeConfig = await siaeStorage.getGlobalSiaeSystemConfig() || null;
    
    // Ottieni location per QUADRO A - Dati Locale
    // Nota: getSiaeTicketedEvent restituisce eventLocation, non locationId
    const locationId = event.eventLocation || event.locationId;
    const location = locationId ? await storage.getLocation(locationId) : null;
    
    const sectors = await siaeStorage.getSiaeEventSectors(id);
    const transactions = await siaeStorage.getSiaeTransactionsByEvent(id);
    
    // Recupera abbonamenti per questo evento
    const subscriptions = await db.select()
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.ticketedEventId, id));
    
    const completedTransactions = transactions.filter(tx => tx.status === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, tx) => sum + (Number(tx.totalAmount) || 0), 0);
    const ticketsSold = completedTransactions.reduce((sum, tx) => sum + (tx.ticketsCount || 0), 0);

    const vatRate = event.vatRate || 10;
    const vatAmount = totalRevenue * (vatRate / (100 + vatRate));
    const netRevenue = totalRevenue - vatAmount;

    const paymentBreakdown: Record<string, { method: string; count: number; amount: number }> = {};
    for (const tx of completedTransactions) {
      const method = tx.paymentMethod || 'other';
      if (!paymentBreakdown[method]) {
        paymentBreakdown[method] = { method, count: 0, amount: 0 };
      }
      paymentBreakdown[method].count += 1;
      paymentBreakdown[method].amount += Number(tx.totalAmount) || 0;
    }

    const sectorBreakdown = sectors.map(s => {
      const soldCount = s.capacity - s.availableSeats;
      const sectorRevenue = soldCount * (Number(s.priceIntero) || 0);
      const sectorVat = sectorRevenue * (vatRate / (100 + vatRate));
      return {
        id: s.id,
        name: s.name,
        sectorCode: s.sectorCode,
        ticketTypeCode: s.sectorCode,
        capacity: s.capacity,
        ticketsSold: soldCount,
        availableSeats: s.availableSeats,
        priceIntero: Number(s.priceIntero) || 0,
        grossRevenue: sectorRevenue,
        vatAmount: sectorVat,
        netRevenue: sectorRevenue - sectorVat,
      };
    });

    // Calcola totali abbonamenti (includi sia 'active' che 'issued')
    const soldSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'issued');
    const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');
    const subscriptionRevenue = soldSubscriptions.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const cancelledAmount = cancelledSubscriptions.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    // Capienza totale
    const capienzaTotale = sectors.reduce((sum, s) => sum + (s.capacity || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const isIntrattenimento = event.eventType === 'intrattenimento';

    // QUADRO A - Dati Identificativi (conforme Allegato 4 G.U. n.188 12/08/2004)
    const quadroA = {
      // Dati Organizzatore
      denominazioneOrganizzatore: company?.name || 'N/D',
      codiceFiscaleOrganizzatore: company?.fiscalCode || company?.taxId || 'N/D',
      partitaIvaOrganizzatore: company?.taxId || 'N/D',
      indirizzoOrganizzatore: company?.address || 'N/D',
      comuneOrganizzatore: company?.city || 'N/D',
      provinciaOrganizzatore: company?.province || 'N/D',
      capOrganizzatore: company?.postalCode || 'N/D',
      
      // Titolare Sistema di Emissione
      // Usa dati da siaeSystemConfig se disponibile, altrimenti fallback su company
      titolareSistemaEmissione: siaeConfig?.businessName || company?.name || 'N/D',
      codiceFiscaleTitolareSistema: siaeConfig?.taxId || 'N/D',
      partitaIvaTitolareSistema: siaeConfig?.vatNumber || 'N/D',
      indirizzoTitolareSistema: siaeConfig?.businessAddress || 'N/D',
      comuneTitolareSistema: siaeConfig?.businessCity || 'N/D',
      provinciaTitolareSistema: siaeConfig?.businessProvince || 'N/D',
      capTitolareSistema: siaeConfig?.businessPostalCode || 'N/D',
      codiceSistemaEmissione: siaeConfig?.systemCode || event.emissionSystemCode || 'N/D',
      
      // Dati Locale
      // Usa dati da locations table se disponibile, altrimenti fallback su event
      codiceLocale: location?.siaeLocationCode || event.siaeLocationCode || 'N/D',
      denominazioneLocale: location?.name || event.venueName || 'N/D',
      indirizzoLocale: location?.address || event.venueAddress || 'N/D',
      comuneLocale: location?.city || event.venueCity || 'N/D',
      provinciaLocale: 'N/D', // locations table non ha provincia
      capLocale: 'N/D', // locations table non ha CAP
      capienza: capienzaTotale,
      
      // Periodo riferimento
      periodoRiferimento: 'mensile',
      dataRiferimento: today,
    };

    // Raggruppa abbonamenti per tipo per QUADRO B
    const subscriptionsByType = soldSubscriptions.reduce((acc, sub) => {
      const key = `${sub.turnType || 'F'}-${sub.eventsCount || 1}`;
      if (!acc[key]) {
        acc[key] = {
          turnType: sub.turnType || 'F',
          eventsCount: sub.eventsCount || 1,
          count: 0,
          totalAmount: 0,
          cancelled: 0,
        };
      }
      acc[key].count += 1;
      acc[key].totalAmount += Number(sub.totalAmount) || 0;
      return acc;
    }, {} as Record<string, any>);

    // Conta annullamenti per tipo
    cancelledSubscriptions.forEach(sub => {
      const key = `${sub.turnType || 'F'}-${sub.eventsCount || 1}`;
      if (subscriptionsByType[key]) {
        subscriptionsByType[key].cancelled += 1;
      }
    });

    // QUADRO B - Dettaglio Abbonamenti (conforme Allegato 4)
    // Colonne: Tipo titolo (TAB.3), Codice abb., I/S, F/L, Venduti, Importo lordo, Annullati, N° eventi
    const righeDettaglio = Object.values(subscriptionsByType).map((s: any) => ({
      tipoTitolo: 'A1', // Codice TAB.3 per abbonamento
      tipoTitoloDescrizione: 'Abbonamento',
      codiceAbbonamento: `ABB-${s.turnType}${s.eventsCount}`,
      tipoSpettacolo: isIntrattenimento ? 'I' : 'S', // I = Intrattenimento, S = Spettacolo
      turnoAbbonamento: s.turnType, // F = Fisso, L = Libero
      numeroVenduti: s.count,
      importoLordoIncassato: Math.round(s.totalAmount * 100) / 100,
      numeroAnnullati: s.cancelled,
      numeroEventi: s.eventsCount,
    }));

    const quadroB = {
      righeDettaglio,
      totaleAbbonamenti: soldSubscriptions.length,
      totaleAnnullati: cancelledSubscriptions.length,
      totaleImportoLordo: Math.round(subscriptionRevenue * 100) / 100,
    };

    res.json({
      reportType: 'C2',
      reportName: 'MODELLO C.2 - Riepilogo Abbonamenti',
      eventId: id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      eventGenre: event.eventGenre,
      eventLocation: event.eventLocation,
      generatedAt: new Date().toISOString(),
      
      // QUADRO A e B conformi al modello ufficiale
      quadroA,
      quadroB,
      
      summary: {
        totalCapacity: event.totalCapacity || capienzaTotale,
        ticketsSold,
        ticketsCancelled: event.ticketsCancelled || 0,
        occupancyRate: event.totalCapacity ? ((ticketsSold / event.totalCapacity) * 100).toFixed(2) : 0,
        subscriptionsSold: soldSubscriptions.length,
        subscriptionsCancelled: cancelledSubscriptions.length,
        subscriptionRevenue,
        cancelledAmount,
      },
      financials: {
        grossRevenue: totalRevenue,
        vatRate,
        vatAmount,
        netRevenue,
        transactionCount: completedTransactions.length,
      },
      paymentBreakdown: Object.values(paymentBreakdown),
      sectorBreakdown,
      subscriptions: [...soldSubscriptions, ...cancelledSubscriptions].map(s => ({
        id: s.id,
        subscriptionCode: s.subscriptionCode,
        turnType: s.turnType,
        eventsCount: s.eventsCount,
        eventsUsed: s.eventsUsed,
        totalAmount: Number(s.totalAmount) || 0,
        holderName: `${s.holderFirstName} ${s.holderLastName}`,
        status: s.status,
        validFrom: s.validFrom,
        validTo: s.validTo,
      })),
      subscriptionSummary: Object.values(subscriptionsByType).map((s: any) => ({
        ...s,
        tipoTitolo: 'A1',
        tipoSpettacolo: isIntrattenimento ? 'I' : 'S',
      })),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// XML Report - SIAE Transmission Format
router.get('/api/siae/ticketed-events/:id/reports/xml', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    const sectors = await siaeStorage.getSiaeEventSectors(id);
    const tickets = await siaeStorage.getSiaeTicketsByEvent(id);

    const eventDateStr = event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : '';
    const generatedAt = new Date().toISOString();
    
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<SIAETransmission xmlns="http://www.siae.it/biglietteria">
  <Header>
    <VersioneSchema>1.0</VersioneSchema>
    <DataOraCreazione>${generatedAt}</DataOraCreazione>
    <TipoTrasmissione>RENDICONTO</TipoTrasmissione>
  </Header>
  <Evento>
    <CodiceEvento>${event.id}</CodiceEvento>
    <NomeEvento><![CDATA[${event.eventName || ''}]]></NomeEvento>
    <DataEvento>${eventDateStr}</DataEvento>
    <LuogoEvento><![CDATA[${event.eventLocation || ''}]]></LuogoEvento>
    <GenereEvento>${event.eventGenre || ''}</GenereEvento>
    <CapienzaTotale>${event.totalCapacity || 0}</CapienzaTotale>
    <BigliettiVenduti>${event.ticketsSold || 0}</BigliettiVenduti>
    <BigliettiAnnullati>${event.ticketsCancelled || 0}</BigliettiAnnullati>
    <IncassoTotale>${Number(event.totalRevenue || 0).toFixed(2)}</IncassoTotale>
    <AliquotaIVA>${event.vatRate || 10}</AliquotaIVA>
  </Evento>
  <Settori>
${sectors.map(s => `    <Settore>
      <CodiceSettore>${s.sectorCode || ''}</CodiceSettore>
      <NomeSettore><![CDATA[${s.name || ''}]]></NomeSettore>
      <TipoBiglietto>${s.sectorCode || ''}</TipoBiglietto>
      <Capienza>${s.capacity || 0}</Capienza>
      <BigliettiVenduti>${s.capacity - s.availableSeats}</BigliettiVenduti>
      <PostiDisponibili>${s.availableSeats || 0}</PostiDisponibili>
      <Prezzo>${Number(s.priceIntero || 0).toFixed(2)}</Prezzo>
      <Incasso>${((s.capacity - s.availableSeats) * Number(s.priceIntero || 0)).toFixed(2)}</Incasso>
    </Settore>`).join('\n')}
  </Settori>
  <Biglietti>
${tickets.slice(0, 1000).map(t => `    <Biglietto>
      <CodiceBiglietto>${t.ticketCode || ''}</CodiceBiglietto>
      <NumeroProgressivo>${t.progressiveNumber || ''}</NumeroProgressivo>
      <SigilloFiscale>${t.fiscalSealId || ''}</SigilloFiscale>
      <Stato>${t.status || ''}</Stato>
      <Prezzo>${Number(t.ticketPrice || 0).toFixed(2)}</Prezzo>
      <DataEmissione>${t.emissionDate ? new Date(t.emissionDate).toISOString() : ''}</DataEmissione>
    </Biglietto>`).join('\n')}
  </Biglietti>
</SIAETransmission>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="SIAE_${event.eventName?.replace(/[^a-zA-Z0-9]/g, '_')}_${eventDateStr}.xml"`);
    res.send(xmlContent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PDF Report data - Returns data for frontend PDF generation
router.get('/api/siae/ticketed-events/:id/reports/pdf', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    const sectors = await siaeStorage.getSiaeEventSectors(id);
    const transactions = await siaeStorage.getSiaeTransactionsByEvent(id);
    const tickets = await siaeStorage.getSiaeTicketsByEvent(id);

    const completedTransactions = transactions.filter(tx => tx.status === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, tx) => sum + (Number(tx.totalAmount) || 0), 0);

    const salesByDate: Record<string, { 
      date: string; 
      ticketsSold: number; 
      totalAmount: number;
    }> = {};

    for (const tx of completedTransactions) {
      const dateStr = tx.createdAt ? new Date(tx.createdAt).toISOString().split('T')[0] : 'N/D';
      if (!salesByDate[dateStr]) {
        salesByDate[dateStr] = { date: dateStr, ticketsSold: 0, totalAmount: 0 };
      }
      salesByDate[dateStr].ticketsSold += tx.ticketsCount || 0;
      salesByDate[dateStr].totalAmount += Number(tx.totalAmount) || 0;
    }

    res.json({
      reportType: 'PDF',
      reportName: 'Registro SIAE - Stampa',
      eventId: id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      eventLocation: event.eventLocation,
      eventGenre: event.eventGenre,
      generatedAt: new Date().toISOString(),
      summary: {
        totalCapacity: event.totalCapacity || 0,
        ticketsSold: event.ticketsSold || 0,
        ticketsCancelled: event.ticketsCancelled || 0,
        totalRevenue,
        vatRate: event.vatRate || 10,
      },
      dailySales: Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date)),
      sectors: sectors.map(s => ({
        name: s.name,
        sectorCode: s.sectorCode,
        ticketTypeCode: s.sectorCode,
        capacity: s.capacity,
        soldCount: s.capacity - s.availableSeats,
        availableSeats: s.availableSeats,
        price: Number(s.priceIntero) || 0,
        revenue: (s.capacity - s.availableSeats) * (Number(s.priceIntero) || 0),
      })),
      ticketsSample: tickets.slice(0, 50).map(t => ({
        ticketCode: t.ticketCode,
        progressiveNumber: t.progressiveNumber,
        status: t.status,
        price: Number(t.ticketPrice) || 0,
        emissionDate: t.emissionDate,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Log seal generation
router.post('/smart-card/seal-log', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Non autorizzato" });
    }
    
    // Validate request body
    const parseResult = smartCardSealLogSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Dati non validi", 
        errors: parseResult.error.errors 
      });
    }
    
    const { sessionId, fiscalSealId, ticketId, sealCode, progressiveNumber, status, errorMessage, durationMs } = parseResult.data;
    
    // Verify session ownership
    const session = await siaeStorage.getSmartCardSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Sessione non trovata" });
    }
    
    if (session.userId !== userId) {
      return res.status(403).json({ message: "Non autorizzato a registrare log per questa sessione" });
    }
    
    const log = await siaeStorage.createSmartCardSealLog({
      sessionId,
      fiscalSealId: fiscalSealId || null,
      ticketId: ticketId || null,
      sealCode,
      progressiveNumber,
      status,
      errorMessage: errorMessage || null,
      completedAt: new Date(),
      durationMs: durationMs || null
    });
    
    // Update session counters only on success
    if (status === 'success') {
      await siaeStorage.incrementSmartCardSessionCounters(sessionId);
    } else {
      // Update error count on failure
      await siaeStorage.updateSmartCardSession(sessionId, {
        errorCount: (session.errorCount || 0) + 1,
        lastError: errorMessage || 'Errore generazione sigillo',
        lastActivityAt: new Date()
      });
      
      // Log failure
      await siaeStorage.createAuditLog({
        companyId: (req.user as any)?.companyId || '',
        userId,
        action: 'seal_generation_failed',
        entityType: 'smart_card_seal_log',
        entityId: log.id,
        description: `Errore generazione sigillo: ${errorMessage || 'Errore sconosciuto'}`,
        fiscalSealCode: sealCode,
        ipAddress: (req.ip || '').substring(0, 45),
        userAgent: (req.get('user-agent') || '').substring(0, 500)
      });
    }
    
    res.status(201).json(log);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== CLIENT WALLET API ====================

// GET /api/siae/tickets/my - Get current user's purchased SIAE tickets
router.get("/api/siae/tickets/my", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    if (!user.phone && !user.email) {
      return res.json([]);
    }
    
    // Get all tickets for the user via customer association (by phone or email)
    // Import required tables
    const { siaeTickets, siaeCustomers, siaeTicketedEvents, siaeEventSectors } = await import("@shared/schema");
    const { db } = await import("./db");
    const { eq, or, desc, sql } = await import("drizzle-orm");
    
    const tickets = await db.select({
      ticket: siaeTickets,
      event: siaeTicketedEvents,
      sector: siaeEventSectors,
    })
      .from(siaeTickets)
      .innerJoin(siaeCustomers, eq(siaeTickets.customerId, siaeCustomers.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .where(
        user.phone && user.email
          ? sql`(${siaeCustomers.phone} = ${user.phone} OR ${siaeCustomers.email} = ${user.email})`
          : user.phone
            ? eq(siaeCustomers.phone, user.phone)
            : eq(siaeCustomers.email, user.email)
      )
      .orderBy(desc(siaeTicketedEvents.createdAt));
    
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== CASSA BIGLIETTI API ====================

// GET /api/cashiers/events/:eventId/allocation - Get current user's allocation for event
router.get("/api/cashiers/events/:eventId/allocation", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    
    // Usa helper per supportare sia nuove che vecchie sessioni cassiere
    const cashierId = getSiaeCashierId(user);
    if (!cashierId) {
      return res.status(400).json({ message: "ID cassiere non trovato nella sessione" });
    }
    const allocation = await siaeStorage.getCashierAllocationByCashierAndEvent(cashierId, eventId);
    
    if (!allocation) {
      return res.status(404).json({ message: "Nessuna allocazione trovata per questo evento" });
    }
    
    res.json(allocation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/cashiers/events/:eventId/allocations - Get all allocations for event (gestore only)
router.get("/api/cashiers/events/:eventId/allocations", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const allocations = await siaeStorage.getCashierAllocationsByEvent(eventId);
    
    res.json(allocations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cashiers/allocations - Create cashier allocation (gestore only)
router.post("/api/cashiers/allocations", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    // Accetta sia cashierId (nuovo) che userId (legacy) per compatibilità
    const { eventId, cashierId, userId, sectorId, quotaQuantity } = req.body;
    const finalCashierId = cashierId || userId;
    
    if (!eventId || !finalCashierId || quotaQuantity === undefined) {
      return res.status(400).json({ message: "Dati mancanti: eventId, cashierId e quotaQuantity sono richiesti" });
    }
    
    // Check if allocation already exists
    const existing = await siaeStorage.getCashierAllocationByCashierAndEvent(finalCashierId, eventId);
    if (existing) {
      return res.status(409).json({ message: "Esiste già un'allocazione per questo cassiere per l'evento" });
    }
    
    const allocation = await siaeStorage.createCashierAllocation({
      companyId: user.companyId,
      eventId,
      cashierId: finalCashierId,
      sectorId: sectorId || null,
      quotaQuantity: Number(quotaQuantity),
      quotaUsed: 0,
      isActive: true
    });
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'cashier_allocation_created',
      entityType: 'cashier_allocation',
      entityId: allocation.id,
      description: `Creata allocazione per cassiere con quota ${quotaQuantity}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.status(201).json(allocation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/cashiers/allocations/:id - Update cashier allocation (gestore only)
router.patch("/api/cashiers/allocations/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { quotaQuantity, sectorId, isActive } = req.body;
    
    const allocation = await siaeStorage.getCashierAllocation(id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocazione non trovata" });
    }
    
    const updateData: any = {};
    if (quotaQuantity !== undefined) updateData.quotaQuantity = Number(quotaQuantity);
    if (sectorId !== undefined) updateData.sectorId = sectorId;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updated = await siaeStorage.updateCashierAllocation(id, updateData);
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'cashier_allocation_updated',
      entityType: 'cashier_allocation',
      entityId: id,
      description: `Aggiornata allocazione cassiere`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cashiers/events/:eventId/tickets - Emit ticket from cashier
// Uses atomic transaction to prevent race conditions on quota
// REQUIRES: Bridge SIAE connected for fiscal seal generation
// Supports quantity parameter for emitting multiple anonymous tickets at once
router.post("/api/cashiers/events/:eventId/tickets", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    const { sectorId, ticketType, price, participantFirstName, participantLastName, participantPhone, participantEmail, paymentMethod, skipFiscalSeal, quantity = 1, customText } = req.body;
    
    // Validate quantity (max 50 at once for safety)
    const ticketQuantity = Math.min(Math.max(1, parseInt(quantity) || 1), 50);
    
    // Check if bridge is connected (REQUIRED for fiscal seal emission)
    // Super admin can skip fiscal seal for testing purposes
    const canSkipSeal = user.role === 'super_admin' && skipFiscalSeal === true;
    
    // Debug logging
    const bridgeStatus = getCachedBridgeStatus();
    const bridgeConnected = isBridgeConnected();
    console.log(`[CashierTicket] Bridge check: connected=${bridgeConnected}, status=`, JSON.stringify(bridgeStatus));
    
    if (!canSkipSeal) {
      if (!bridgeConnected) {
        console.log(`[CashierTicket] Rejecting: bridge not connected`);
        return res.status(503).json({ 
          message: "Bridge SIAE non connesso. Avviare l'applicazione desktop Event4U per emettere biglietti con sigillo fiscale.",
          errorCode: "BRIDGE_NOT_CONNECTED"
        });
      }
      
      // Check if card is ready for seal emission
      const cardReady = isCardReadyForSeals();
      console.log(`[CashierTicket] Card check: ready=${cardReady.ready}, error=${cardReady.error}`);
      if (!cardReady.ready) {
        return res.status(503).json({ 
          message: cardReady.error || "Smart Card SIAE non pronta. Verificare che la carta sia inserita nel lettore.",
          errorCode: "CARD_NOT_READY"
        });
      }
    }
    
    // Session check removed - all authorized users can emit tickets directly
    // The quota and allocation system already provides sufficient access control
    
    // Usa helper per supportare sia nuove che vecchie sessioni cassiere
    const cashierId = getSiaeCashierId(user);
    const allocation = cashierId ? await siaeStorage.getCashierAllocationByCashierAndEvent(cashierId, eventId) : null;
    if (!allocation) {
      return res.status(403).json({ 
        message: "Non sei autorizzato a emettere biglietti per questo evento",
        errorCode: "NO_ALLOCATION"
      });
    }
    
    // Get sector if specified, otherwise use allocation's sector
    const finalSectorId = sectorId || allocation.sectorId;
    if (!finalSectorId) {
      return res.status(400).json({ message: "Settore non specificato" });
    }
    
    const sector = await siaeStorage.getSiaeEventSector(finalSectorId);
    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    
    // Check sector availability for requested quantity
    if (sector.availableSeats < ticketQuantity) {
      return res.status(400).json({ 
        message: `Posti insufficienti: disponibili ${sector.availableSeats}, richiesti ${ticketQuantity}`,
        errorCode: "NO_SEATS_AVAILABLE"
      });
    }
    
    // Check quota for requested quantity
    const quotaRemaining = allocation.quotaQuantity - allocation.quotaUsed;
    if (quotaRemaining < ticketQuantity) {
      return res.status(400).json({ 
        message: `Quota insufficiente: disponibili ${quotaRemaining}, richiesti ${ticketQuantity}`,
        errorCode: "QUOTA_EXCEEDED"
      });
    }
    
    // Get event
    const event = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Check if event is approved for ticket sales
    if ((event as any).approvalStatus !== 'approved') {
      return res.status(403).json({ 
        message: "Non è possibile emettere biglietti per un evento non ancora approvato",
        errorCode: "EVENT_NOT_APPROVED"
      });
    }
    
    // CONTROLLO OBBLIGATORIO: Codice Fiscale Emittente configurato
    const systemConfig = await siaeStorage.getSiaeSystemConfig(event.companyId);
    const company = await storage.getCompany(event.companyId);
    const emitterTaxId = systemConfig?.taxId || company?.fiscalCode || company?.taxId;
    
    if (!emitterTaxId) {
      return res.status(400).json({ 
        message: "Codice Fiscale Emittente non configurato. Contattare l'amministratore per configurare le Impostazioni SIAE.",
        errorCode: "TAX_ID_REQUIRED"
      });
    }
    
    // Calculate ticket price before requesting seal (use appropriate price based on ticket type)
    let sectorPrice = Number(sector.priceIntero) || 0;
    if (ticketType === 'ridotto' && sector.priceRidotto) {
      sectorPrice = Number(sector.priceRidotto);
    } else if (ticketType === 'omaggio' && sector.priceOmaggio) {
      sectorPrice = Number(sector.priceOmaggio);
    }
    const ticketPrice = price || sectorPrice;
    const priceInCents = Math.round(ticketPrice * 100);
    
    // Get or create customer if participant data provided (only for nominative tickets)
    let customerId: string | null = null;
    if (participantPhone || participantEmail) {
      let customer = participantPhone 
        ? await siaeStorage.getSiaeCustomerByPhone(participantPhone)
        : participantEmail 
          ? await siaeStorage.getSiaeCustomerByEmail(participantEmail)
          : undefined;
      
      if (!customer && (participantFirstName || participantLastName)) {
        // Generate a unique code for the customer
        const uniqueCode = `C${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        customer = await siaeStorage.createSiaeCustomer({
          firstName: participantFirstName || '',
          lastName: participantLastName || '',
          phone: participantPhone || null,
          email: participantEmail || null,
          uniqueCode
        });
      }
      if (customer) {
        customerId = customer.id;
      }
    }
    
    // For multiple tickets, emit them in a loop
    const emittedTickets: any[] = [];
    let currentTicketsSold = event.ticketsSold || 0;
    let currentTotalRevenue = Number(event.totalRevenue) || 0;
    let currentAvailableSeats = sector.availableSeats;
    
    for (let i = 0; i < ticketQuantity; i++) {
      // Request fiscal seal from bridge BEFORE creating ticket (only if not skipped)
      let fiscalSealData: any = null;
      if (!canSkipSeal) {
        try {
          console.log(`[CashierTicket] Requesting fiscal seal ${i + 1}/${ticketQuantity} for €${ticketPrice}...`);
          fiscalSealData = await requestFiscalSeal(priceInCents);
          console.log(`[CashierTicket] Fiscal seal obtained: counter=${fiscalSealData.counter}, sealNumber=${fiscalSealData.sealNumber}`);
        } catch (sealError: any) {
          console.error(`[CashierTicket] Failed to obtain fiscal seal:`, sealError.message);
          
          // If we already emitted some tickets, return partial success
          if (emittedTickets.length > 0) {
            return res.status(207).json({
              message: `Emessi ${emittedTickets.length}/${ticketQuantity} biglietti. Errore sigillo fiscale al biglietto ${i + 1}: ${sealError.message}`,
              emittedCount: emittedTickets.length,
              requestedCount: ticketQuantity,
              tickets: emittedTickets,
              errorCode: "PARTIAL_EMISSION"
            });
          }
          
          // Audit log per tentativo fallito (solo per utenti, non cassieri - hanno tabella separata)
          if (user.role !== 'cassiere') {
            try {
              await siaeStorage.createAuditLog({
                companyId: user.companyId,
                userId: user.id,
                action: 'ticket_emission_failed',
                entityType: 'ticket',
                entityId: eventId,
                description: `Tentativo emissione biglietto fallito - Sigillo fiscale non ottenuto: ${sealError.message}`,
                ipAddress: (req.ip || '').substring(0, 45),
                userAgent: (req.get('user-agent') || '').substring(0, 500)
              });
            } catch (auditError: any) {
              console.warn(`[CashierTicket] Failed to create audit log for failed emission:`, auditError.message);
            }
          }
          
          return res.status(503).json({ 
            message: `Impossibile ottenere sigillo fiscale: ${sealError.message}`,
            errorCode: "SEAL_GENERATION_FAILED"
          });
        }
      }
      
      // Generate unique ticket code for each ticket
      const sealSuffix = fiscalSealData ? `-${fiscalSealData.counter}` : '';
      const ticketCode = `${event.eventCode || 'TK'}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}${sealSuffix}`;
      
      // Map ticketType to SIAE ticketTypeCode
      const finalTicketType = ticketType || 'intero';
      const ticketTypeCodeMap: Record<string, string> = {
        'intero': 'INT',
        'ridotto': 'RID',
        'omaggio': 'OMG',
        'abbonamento': 'ABB'
      };
      const ticketTypeCode = ticketTypeCodeMap[finalTicketType] || 'INT';
      
      const result = await siaeStorage.emitTicketWithAtomicQuota({
        allocationId: allocation.id,
        eventId,
        sectorId: finalSectorId,
        sectorCode: (sector.sectorCode || 'XX').slice(0, 2),
        ticketCode,
        ticketType: finalTicketType,
        ticketTypeCode,
        ticketPrice,
        customerId: ticketQuantity === 1 ? customerId : null, // Only link customer for single ticket
        issuedByUserId: user.id,
        participantFirstName: ticketQuantity === 1 ? (participantFirstName || null) : null,
        participantLastName: ticketQuantity === 1 ? (participantLastName || null) : null,
        isComplimentary: finalTicketType === 'omaggio',
        paymentMethod: paymentMethod || 'cash',
        customText: customText || null,
        currentTicketsSold,
        currentTotalRevenue,
        currentAvailableSeats
      });
      
      if (!result.success) {
        // If we already emitted some tickets, return partial success
        if (emittedTickets.length > 0) {
          return res.status(207).json({
            message: `Emessi ${emittedTickets.length}/${ticketQuantity} biglietti. Quota esaurita.`,
            emittedCount: emittedTickets.length,
            requestedCount: ticketQuantity,
            tickets: emittedTickets,
            errorCode: "PARTIAL_EMISSION"
          });
        }
        return res.status(400).json({ 
          message: result.error || "Quota biglietti esaurita. Contatta il gestore per aumentare la quota.",
          errorCode: "QUOTA_EXCEEDED"
        });
      }
      
      // Update ticket with fiscal seal data if available
      if (fiscalSealData?.sealCode && result.ticket) {
        await siaeStorage.updateSiaeTicket(result.ticket.id, {
          fiscalSealCode: fiscalSealData.sealCode,
          fiscalSealCounter: fiscalSealData.counter,
          cardCode: fiscalSealData.serialNumber,
        });
        // Update result.ticket for response
        result.ticket.fiscalSealCode = fiscalSealData.sealCode;
        (result.ticket as any).fiscalSealCounter = fiscalSealData.counter;
        (result.ticket as any).cardCode = fiscalSealData.serialNumber;
      }
      
      // Update counters for next iteration
      currentTicketsSold++;
      currentTotalRevenue += ticketPrice;
      currentAvailableSeats--;
      
      // Create ticket audit entry (outside transaction, not critical)
      // Skip for cassiere role - their ID is in siaeCashiers table, not users (FK constraint)
      if (user.role !== 'cassiere') {
        await siaeStorage.createTicketAudit({
          companyId: user.companyId,
          ticketId: result.ticket!.id,
          operationType: 'emission',
          performedBy: user.id,
          reason: null,
          metadata: { 
            paymentMethod, 
            ticketType, 
            price: ticketPrice,
            batchIndex: ticketQuantity > 1 ? i + 1 : undefined,
            batchTotal: ticketQuantity > 1 ? ticketQuantity : undefined,
            fiscalSeal: fiscalSealData ? {
              sealNumber: fiscalSealData.sealNumber,
              sealCode: fiscalSealData.sealCode,
              serialNumber: fiscalSealData.serialNumber,
              counter: fiscalSealData.counter,
              mac: fiscalSealData.mac,
              dateTime: fiscalSealData.dateTime
            } : null
          }
        });
      }
      
      // General audit log (skip for cassiere role - they have separate table, not in users FK)
      const sealInfo = fiscalSealData ? ` (Sigillo: ${fiscalSealData.counter})` : '';
      const batchInfo = ticketQuantity > 1 ? ` [${i + 1}/${ticketQuantity}]` : '';
      if (user.role !== 'cassiere') {
        await siaeStorage.createAuditLog({
          companyId: user.companyId,
          userId: user.id,
          action: 'ticket_emitted',
          entityType: 'ticket',
          entityId: result.ticket!.id,
          description: `Emesso biglietto ${ticketCode} - €${ticketPrice}${sealInfo}${batchInfo}`,
          ipAddress: (req.ip || '').substring(0, 45),
          userAgent: (req.get('user-agent') || '').substring(0, 500)
        });
      } else {
        console.log(`[CashierTicket] Skipping audit log for cassiere (separate table): ${ticketCode}${sealInfo}${batchInfo}`);
      }
      
      emittedTickets.push({
        ...result.ticket,
        fiscalSeal: fiscalSealData || null
      });
    }
    
    // Return results - single ticket or array for multiple
    if (ticketQuantity === 1) {
      res.status(201).json(emittedTickets[0]);
    } else {
      res.status(201).json(emittedTickets);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/cashiers/events/:eventId/today-tickets - Get today's tickets for current cashier
router.get("/api/cashiers/events/:eventId/today-tickets", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    
    // Per cassieri SIAE usa cashierId, per altri utenti usa user.id
    const userId = user.role === 'cassiere' ? (getSiaeCashierId(user) || user.id) : user.id;
    console.log(`[TodayTickets] Fetching for userId=${userId}, eventId=${eventId}, role=${user.role}`);
    const tickets = await siaeStorage.getTodayTicketsByUser(userId, eventId);
    console.log(`[TodayTickets] Found ${tickets.length} tickets`);
    
    res.json(tickets);
  } catch (error: any) {
    console.error(`[TodayTickets] Error:`, error);
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/siae/tickets/:id/cancel - Cancel a ticket
// Uses atomic transaction to prevent race conditions on quota restoration
// Registers fiscal cancellation via bridge if available
// Request body: { reasonCode: string (SIAE code 01-12, 99), note?: string }
router.patch("/api/siae/tickets/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { reasonCode, note } = req.body;
    
    // Validate reasonCode (SIAE TAB.5 codes: 01-12, 99)
    if (!reasonCode) {
      return res.status(400).json({ message: "Il codice causale di annullamento è richiesto (reasonCode)" });
    }
    
    // Validate reasonCode format
    const validReasonCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '99'];
    if (!validReasonCodes.includes(reasonCode)) {
      return res.status(400).json({ 
        message: `Codice causale non valido. Valori ammessi: ${validReasonCodes.join(', ')}`,
        errorCode: "INVALID_REASON_CODE"
      });
    }
    
    // Combine reasonCode and note for the cancellation reason text
    const reason = note ? `${reasonCode}: ${note}` : reasonCode;
    
    const ticket = await siaeStorage.getSiaeTicket(id);
    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    
    // Get the ticketed event to retrieve the companyId
    const ticketedEvent = await siaeStorage.getSiaeTicketedEvent(ticket.ticketedEventId);
    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento associato al biglietto non trovato" });
    }
    const eventCompanyId = ticketedEvent.companyId;
    
    // Verify ticket is not already cancelled
    if (ticket.status === 'cancelled') {
      return res.status(400).json({ 
        message: "Il biglietto è già stato annullato",
        errorCode: "ALREADY_CANCELLED"
      });
    }
    
    // Check authorization: cassiere can only cancel own tickets, gestore/admin/super_admin can cancel any
    const isGestoreOrHigher = ['gestore', 'admin', 'super_admin'].includes(user.role);
    // Per cassieri SIAE usa cashierId per il controllo
    const userIdForCheck = user.role === 'cassiere' ? (getSiaeCashierId(user) || user.id) : user.id;
    if (!isGestoreOrHigher && ticket.issuedByUserId !== userIdForCheck) {
      return res.status(403).json({ 
        message: "Non sei autorizzato ad annullare questo biglietto. Solo il cassiere che ha emesso il biglietto può annullarlo.",
        errorCode: "UNAUTHORIZED_CANCELLATION"
      });
    }
    
    // HARD STOP: Bridge SIAE OBBLIGATORIO per annullamento fiscale
    // L'annullamento fiscale è OBBLIGATORIO, non opzionale
    // Super admin può bypassare solo se esplicitamente richiesto
    const canBypassBridge = user.role === 'super_admin' && req.body.skipFiscalCancellation === true;
    
    if (!canBypassBridge) {
      if (!isBridgeConnected()) {
        // Audit log per tentativo di annullamento senza bridge
        try {
          await siaeStorage.createAuditLog({
            companyId: eventCompanyId,
            userId: userIdForCheck,
            action: 'ticket_cancellation_blocked',
            entityType: 'ticket',
            entityId: id,
            description: `Tentativo annullamento biglietto ${ticket.ticketCode} bloccato - Bridge SIAE non connesso`,
            ipAddress: (req.ip || '').substring(0, 45),
            userAgent: (req.get('user-agent') || '').substring(0, 500)
          });
        } catch (auditError: any) {
          console.warn(`[TicketCancel] Failed to create audit log for blocked cancellation:`, auditError.message);
        }
        
        return res.status(503).json({ 
          message: "Bridge SIAE richiesto per annullamento fiscale. Avviare l'applicazione desktop Event4U prima di procedere.",
          errorCode: "BRIDGE_REQUIRED_FOR_CANCELLATION"
        });
      }
      
      const cardReady = isCardReadyForSeals();
      if (!cardReady.ready) {
        return res.status(503).json({ 
          message: cardReady.error || "Smart Card SIAE non pronta. Verificare che la carta sia inserita nel lettore.",
          errorCode: "CARD_NOT_READY_FOR_CANCELLATION"
        });
      }
    }
    
    // Register fiscal cancellation via bridge (OBBLIGATORIO se bridge richiesto)
    let fiscalCancellationRegistered = false;
    let fiscalCancellationData: any = null;
    
    if (!canBypassBridge) {
      try {
        console.log(`[TicketCancel] Registering fiscal cancellation for ticket ${ticket.ticketCode}...`);
        // Request a cancellation seal (price 0 to indicate cancellation)
        fiscalCancellationData = await requestFiscalSeal(0);
        fiscalCancellationRegistered = true;
        console.log(`[TicketCancel] Fiscal cancellation registered: counter=${fiscalCancellationData.counter}`);
      } catch (sealError: any) {
        console.error(`[TicketCancel] Failed to register fiscal cancellation:`, sealError.message);
        
        // Audit log per tentativo fallito
        try {
          await siaeStorage.createAuditLog({
            companyId: eventCompanyId,
            userId: userIdForCheck,
            action: 'ticket_cancellation_failed',
            entityType: 'ticket',
            entityId: id,
            description: `Annullamento biglietto ${ticket.ticketCode} fallito - Errore sigillo fiscale: ${sealError.message}`,
            ipAddress: (req.ip || '').substring(0, 45),
            userAgent: (req.get('user-agent') || '').substring(0, 500)
          });
        } catch (auditError: any) {
          console.warn(`[TicketCancel] Failed to create audit log for failed cancellation:`, auditError.message);
        }
        
        return res.status(503).json({ 
          message: `Impossibile registrare annullamento fiscale: ${sealError.message}`,
          errorCode: "FISCAL_CANCELLATION_FAILED"
        });
      }
    } else {
      console.log(`[TicketCancel] Super admin bypassing fiscal cancellation for ticket ${ticket.ticketCode}`);
    }
    
    // Per cassieri SIAE usa cashierId, per altri utenti usa user.id
    const userIdForCancellation = user.role === 'cassiere' ? (getSiaeCashierId(user) || user.id) : user.id;
    
    // ATOMIC TRANSACTION: Cancel ticket and restore quota
    const result = await siaeStorage.cancelTicketWithAtomicQuotaRestore({
      ticketId: id,
      cancelledByUserId: userIdForCancellation,
      cancellationReason: reason,
      issuedByUserId: ticket.issuedByUserId,
      ticketedEventId: ticket.ticketedEventId,
      sectorId: ticket.sectorId,
      ticketPrice: Number(ticket.ticketPrice || 0)
    });
    
    if (!result.success) {
      return res.status(400).json({ 
        message: result.error || "Errore durante l'annullamento del biglietto",
        errorCode: "CANCELLATION_FAILED"
      });
    }
    
    // Create ticket audit entry (outside transaction, not critical)
    await siaeStorage.createTicketAudit({
      companyId: eventCompanyId,
      ticketId: id,
      operationType: 'cancellation',
      performedBy: userIdForCancellation,
      reason,
      metadata: { 
        originalPrice: ticket.ticketPrice, 
        cancelledBy: user.fullName || user.username || user.claims?.username || 'Utente',
        originalTicketCode: ticket.ticketCode,
        fiscalCancellation: fiscalCancellationData ? {
          registered: true,
          sealNumber: fiscalCancellationData.sealNumber,
          counter: fiscalCancellationData.counter,
          serialNumber: fiscalCancellationData.serialNumber,
          dateTime: fiscalCancellationData.dateTime
        } : { registered: false }
      }
    });
    
    // General audit log
    const fiscalInfo = fiscalCancellationRegistered ? ' (Registrato fiscalmente)' : '';
    await siaeStorage.createAuditLog({
      companyId: eventCompanyId,
      userId: userIdForCancellation,
      action: 'ticket_cancelled',
      entityType: 'ticket',
      entityId: id,
      description: `Annullato biglietto ${ticket.ticketCode} - Motivo: ${reason}${fiscalInfo}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.json({
      ...result.ticket,
      fiscalCancellationRegistered
    });
  } catch (error: any) {
    console.error(`[TicketCancel] Error in cancel endpoint:`, error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/siae/tickets/cancel-range - Bulk cancel tickets by progressive number range
// Request body: { ticketedEventId: string, fromNumber: number, toNumber: number, reasonCode: string, note?: string }
router.post("/api/siae/tickets/cancel-range", requireAuth, requireOrganizerOrCashier, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { ticketedEventId, fromNumber, toNumber, reasonCode, note } = req.body;
    
    // Determine user ID for cancellation (supports both regular users and cashiers)
    const userIdForCancellation = user.role === 'cassiere' 
      ? (user.siaeCashierId || user.id) 
      : user.id;
    
    // Validate required fields
    if (!ticketedEventId) {
      return res.status(400).json({ message: "ticketedEventId è richiesto" });
    }
    if (fromNumber === undefined || toNumber === undefined) {
      return res.status(400).json({ message: "fromNumber e toNumber sono richiesti" });
    }
    if (typeof fromNumber !== 'number' || typeof toNumber !== 'number') {
      return res.status(400).json({ message: "fromNumber e toNumber devono essere numeri" });
    }
    if (fromNumber > toNumber) {
      return res.status(400).json({ message: "fromNumber deve essere minore o uguale a toNumber" });
    }
    if (!reasonCode) {
      return res.status(400).json({ message: "reasonCode è richiesto" });
    }
    
    // Validate reasonCode format
    const validReasonCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '99'];
    if (!validReasonCodes.includes(reasonCode)) {
      return res.status(400).json({ 
        message: `Codice causale non valido. Valori ammessi: ${validReasonCodes.join(', ')}`,
        errorCode: "INVALID_REASON_CODE"
      });
    }
    
    // Verify event exists
    const event = await siaeStorage.getSiaeTicketedEvent(ticketedEventId);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Check company access (super_admin can access all)
    if (user.role !== 'super_admin' && event.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo evento" });
    }
    
    // Get all tickets for the event in the range
    const allTickets = await siaeStorage.getSiaeTicketsByEvent(ticketedEventId);
    const ticketsInRange = allTickets.filter(t => 
      t.progressiveNumber >= fromNumber && 
      t.progressiveNumber <= toNumber &&
      t.status !== 'cancelled'
    );
    
    if (ticketsInRange.length === 0) {
      return res.json({
        cancelledCount: 0,
        errors: [],
        message: "Nessun biglietto valido trovato nell'intervallo specificato"
      });
    }
    
    const cancellationReason = note ? `${reasonCode}: ${note}` : reasonCode;
    const cancelledTickets: string[] = [];
    const errors: { ticketId: string; ticketCode: string; error: string }[] = [];
    
    // Cancel each ticket in the range
    for (const ticket of ticketsInRange) {
      try {
        const result = await siaeStorage.cancelTicketWithAtomicQuotaRestore({
          ticketId: ticket.id,
          cancelledByUserId: userIdForCancellation,
          cancellationReason: cancellationReason,
          issuedByUserId: ticket.issuedByUserId,
          ticketedEventId: ticket.ticketedEventId,
          sectorId: ticket.sectorId,
          ticketPrice: Number(ticket.ticketPrice || 0)
        });
        
        if (result.success) {
          cancelledTickets.push(ticket.id);
        } else {
          errors.push({
            ticketId: ticket.id,
            ticketCode: ticket.ticketCode || '',
            error: result.error || 'Errore sconosciuto'
          });
        }
      } catch (err: any) {
        errors.push({
          ticketId: ticket.id,
          ticketCode: ticket.ticketCode || '',
          error: err.message
        });
      }
    }
    
    // Create audit log for bulk cancellation
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: userIdForCancellation,
      action: 'bulk_tickets_cancelled',
      entityType: 'ticketed_event',
      entityId: ticketedEventId,
      description: `Annullamento massivo biglietti ${fromNumber}-${toNumber}: ${cancelledTickets.length} annullati, ${errors.length} errori`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.json({
      cancelledCount: cancelledTickets.length,
      totalInRange: ticketsInRange.length,
      errors,
      message: errors.length === 0 
        ? `Annullati ${cancelledTickets.length} biglietti con successo`
        : `Annullati ${cancelledTickets.length} biglietti, ${errors.length} errori`
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== MODULO CASSA BIGLIETTI ====================

// Helper per ottenere l'ID del cassiere SIAE (supporta sia nuove che vecchie sessioni)
function getSiaeCashierId(user: any): string | undefined {
  // Nuove sessioni: id = siaeCashiers.id
  // Vecchie sessioni: cashierId = siaeCashiers.id
  return user?.id || user?.cashierId;
}

// Middleware to check if user is a cashier
function requireCashier(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || user.role !== 'cassiere') {
    return res.status(403).json({ message: "Accesso riservato ai Cassieri" });
  }
  next();
}

// ==================== CASHIER MANAGEMENT (Gestore Only) ====================

// GET /api/cashiers - List all cashiers for company
router.get("/api/cashiers", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a nessuna azienda" });
    }
    const cashiers = await db.select().from(siaeCashiers)
      .where(eq(siaeCashiers.companyId, user.companyId));
    
    const cashiersWithoutPassword = cashiers.map(({ passwordHash, ...rest }) => rest);
    res.json(cashiersWithoutPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cashiers - Create cashier with username/password
router.post("/api/cashiers", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a nessuna azienda" });
    }
    
    const { username, password, name, defaultPrinterAgentId } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ message: "Username, password e nome sono obbligatori" });
    }
    
    const existing = await db.select().from(siaeCashiers)
      .where(and(
        eq(siaeCashiers.companyId, user.companyId),
        eq(siaeCashiers.username, username)
      ));
    
    if (existing.length > 0) {
      return res.status(400).json({ message: "Username già in uso" });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Normalize "none" sentinel value to null for printer
    const normalizedPrinterId = defaultPrinterAgentId && defaultPrinterAgentId !== "none" 
      ? defaultPrinterAgentId 
      : null;
    
    const [cashier] = await db.insert(siaeCashiers).values({
      companyId: user.companyId,
      username,
      passwordHash,
      name,
      defaultPrinterAgentId: normalizedPrinterId,
      isActive: true,
    }).returning();
    
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'cashier_created',
      entityType: 'siae_cashier',
      entityId: cashier.id,
      description: `Creato cassiere: ${name} (${username})`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    const { passwordHash: _, ...cashierData } = cashier;
    res.status(201).json(cashierData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/cashiers/:id - Update cashier
router.patch("/api/cashiers/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    
    const [cashier] = await db.select().from(siaeCashiers).where(eq(siaeCashiers.id, id));
    if (!cashier) {
      return res.status(404).json({ message: "Cassiere non trovato" });
    }
    
    if (cashier.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato a modificare questo cassiere" });
    }
    
    const { name, username, defaultPrinterAgentId, isActive, password } = req.body;
    
    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    // Normalize "none" sentinel value to null for printer
    if (defaultPrinterAgentId !== undefined) {
      updateData.defaultPrinterAgentId = defaultPrinterAgentId && defaultPrinterAgentId !== "none" 
        ? defaultPrinterAgentId 
        : null;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    
    const [updated] = await db.update(siaeCashiers)
      .set(updateData)
      .where(eq(siaeCashiers.id, id))
      .returning();
    
    // Use cashier's companyId for audit log (more reliable than user's for super_admin)
    await siaeStorage.createAuditLog({
      companyId: cashier.companyId,
      userId: user.id,
      action: 'cashier_updated',
      entityType: 'siae_cashier',
      entityId: id,
      description: `Modificato cassiere: ${cashier.name}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    if (updated) {
      const { passwordHash: _, ...cashierData } = updated;
      res.json(cashierData);
    } else {
      res.status(500).json({ message: "Errore durante l'aggiornamento" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/cashiers/:id - Deactivate cashier
router.delete("/api/cashiers/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    
    const [cashier] = await db.select().from(siaeCashiers).where(eq(siaeCashiers.id, id));
    if (!cashier) {
      return res.status(404).json({ message: "Cassiere non trovato" });
    }
    
    if (cashier.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato a disattivare questo cassiere" });
    }
    
    await db.update(siaeCashiers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(siaeCashiers.id, id));
    
    // Use cashier's companyId for audit log (more reliable than user's for super_admin)
    await siaeStorage.createAuditLog({
      companyId: cashier.companyId,
      userId: user.id,
      action: 'cashier_deactivated',
      entityType: 'siae_cashier',
      entityId: id,
      description: `Disattivato cassiere: ${cashier.name}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.json({ success: true, message: "Cassiere disattivato" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cashiers/login - Cashier login with username/password
router.post("/api/cashiers/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username e password sono obbligatori" });
    }
    
    // Search for cashier by username only (global search)
    const [cashier] = await db.select().from(siaeCashiers)
      .where(eq(siaeCashiers.username, username));
    
    if (!cashier) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }
    
    if (!cashier.isActive) {
      return res.status(403).json({ message: "Account disattivato" });
    }
    
    const isValidPassword = await bcrypt.compare(password, cashier.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }
    
    // Create session for cashier
    // id = cashier.id per garantire che req.user.id corrisponda a siaeCashiers.id
    (req as any).login({ 
      id: cashier.id,
      claims: { sub: cashier.id, username: cashier.username },
      role: 'cassiere',
      companyId: cashier.companyId,
      cashierId: cashier.id,
      cashierType: 'siae'
    }, (err: any) => {
      if (err) {
        console.error("Cashier session creation error:", err);
        return res.status(500).json({ message: "Login failed" });
      }
      
      const { passwordHash: _, ...cashierData } = cashier;
      res.json({ 
        message: "Login successful",
        cashier: cashierData
      });
    });
  } catch (error: any) {
    console.error("Cashier login error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== EVENT CASHIER ALLOCATIONS (Gestore Only) ====================

// GET /api/events/:eventId/cashier-allocations - List all allocations for event
router.get("/api/events/:eventId/cashier-allocations", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    
    const event = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    if (event.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo evento" });
    }
    
    const allocations = await siaeStorage.getCashierAllocationsByEvent(eventId);
    
    // Enrich with cashier info from siaeCashiers table
    const enrichedAllocations = await Promise.all(allocations.map(async (alloc) => {
      const [cashier] = await db.select().from(siaeCashiers)
        .where(eq(siaeCashiers.id, alloc.cashierId));
      const sector = alloc.sectorId ? await siaeStorage.getSiaeEventSector(alloc.sectorId) : null;
      return {
        ...alloc,
        cashierName: cashier?.name || 'N/A',
        cashierUsername: cashier?.username || 'N/A',
        sectorName: sector?.name || 'Tutti i settori',
        quotaRemaining: alloc.quotaQuantity - alloc.quotaUsed
      };
    }));
    
    res.json(enrichedAllocations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/events/:eventId/cashier-allocations - Assign cashier to event
router.post("/api/events/:eventId/cashier-allocations", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    // Accept both cashierId (new) and userId (legacy) for backwards compatibility
    const cashierId = req.body.cashierId || req.body.userId;
    const { sectorId, quotaQuantity } = req.body;
    
    if (!cashierId || quotaQuantity === undefined) {
      return res.status(400).json({ message: "cashierId e quotaQuantity sono obbligatori" });
    }
    
    const event = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    if (event.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo evento" });
    }
    
    // Check if cashier exists and belongs to company (from siaeCashiers table)
    const [cashier] = await db.select().from(siaeCashiers)
      .where(and(
        eq(siaeCashiers.id, cashierId),
        eq(siaeCashiers.isActive, true)
      ));
    
    if (!cashier) {
      return res.status(400).json({ message: "Cassiere non trovato" });
    }
    
    if (cashier.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Cassiere non appartiene alla tua azienda" });
    }
    
    // Check if allocation already exists
    const existingAllocation = await siaeStorage.getCashierAllocationByCashierAndEvent(cashierId, eventId);
    if (existingAllocation) {
      return res.status(400).json({ message: "Allocazione già esistente per questo cassiere/evento" });
    }
    
    const allocation = await siaeStorage.createCashierAllocation({
      companyId: user.companyId,
      eventId,
      cashierId,
      sectorId: sectorId || null,
      quotaQuantity: parseInt(quotaQuantity),
      quotaUsed: 0,
      isActive: true
    });
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'cashier_allocation_created',
      entityType: 'cashier_allocation',
      entityId: allocation.id,
      description: `Assegnato cassiere ${cashier.name} a evento ${event.eventName} con quota ${quotaQuantity}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.status(201).json(allocation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/cashier-allocations/:id - Update quota
router.patch("/api/cashier-allocations/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { quotaQuantity, isActive } = req.body;
    
    const allocation = await siaeStorage.getCashierAllocation(id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocazione non trovata" });
    }
    
    if (allocation.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato a modificare questa allocazione" });
    }
    
    const updateData: any = {};
    if (quotaQuantity !== undefined) {
      if (parseInt(quotaQuantity) < allocation.quotaUsed) {
        return res.status(400).json({ 
          message: `La quota non può essere inferiore ai biglietti già emessi (${allocation.quotaUsed})` 
        });
      }
      updateData.quotaQuantity = parseInt(quotaQuantity);
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updated = await siaeStorage.updateCashierAllocation(id, updateData);
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'cashier_allocation_updated',
      entityType: 'cashier_allocation',
      entityId: id,
      description: `Modificata allocazione cassiere: quota ${quotaQuantity || 'invariata'}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/cashier-allocations/:id - Remove allocation
router.delete("/api/cashier-allocations/:id", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    
    const allocation = await siaeStorage.getCashierAllocation(id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocazione non trovata" });
    }
    
    if (allocation.companyId !== user.companyId && user.role !== 'super_admin') {
      return res.status(403).json({ message: "Non autorizzato a eliminare questa allocazione" });
    }
    
    if (allocation.quotaUsed > 0) {
      return res.status(400).json({ 
        message: `Impossibile eliminare allocazione con biglietti già emessi (${allocation.quotaUsed}). Disattivarla invece.` 
      });
    }
    
    await siaeStorage.deleteCashierAllocation(id);
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'cashier_allocation_deleted',
      entityType: 'cashier_allocation',
      entityId: id,
      description: `Eliminata allocazione cassiere`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.json({ success: true, message: "Allocazione eliminata" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== CASHIER OPERATIONS (Cassiere Role) ====================

// GET /api/cashier/dashboard - Get cashier dashboard data with real stats
router.get("/api/cashier/dashboard", requireAuth, requireCashier, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    const cashierId = getSiaeCashierId(user);
    if (!cashierId) {
      return res.status(400).json({ message: "ID cassiere non trovato nella sessione" });
    }
    
    // Get all allocations for this cashier
    const allocations = await siaeStorage.getCashierAllocationsByCashier(cashierId);
    
    // Find current/active event (in progress or scheduled for today)
    let currentEvent = null;
    let currentAllocation = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const alloc of allocations) {
      if (!alloc.isActive) continue;
      const event = await siaeStorage.getSiaeTicketedEvent(alloc.eventId);
      if (!event) continue;
      
      const eventDate = event.eventDate ? new Date(event.eventDate) : null;
      if (eventDate) {
        eventDate.setHours(0, 0, 0, 0);
      }
      
      // Check if event is today or ongoing
      if (eventDate && eventDate.getTime() === today.getTime()) {
        currentEvent = event;
        currentAllocation = alloc;
        break;
      }
      if (event.status === 'ongoing' || event.status === 'active') {
        currentEvent = event;
        currentAllocation = alloc;
        break;
      }
    }
    
    // Get today's tickets for all events assigned to this cashier
    let allTodayTickets: any[] = [];
    for (const alloc of allocations) {
      const tickets = await siaeStorage.getTodayTicketsByUser(cashierId, alloc.eventId);
      allTodayTickets = allTodayTickets.concat(tickets);
    }
    
    // Filter only active tickets (not cancelled - includes annullato_rivendita, etc.)
    const activeTickets = allTodayTickets.filter(t => !isCancelledStatus(t.status));
    
    // Calculate stats
    const totalRevenue = activeTickets.reduce((sum, t) => sum + Number(t.ticketPrice || 0), 0);
    const ticketsSold = activeTickets.length;
    const cashTickets = activeTickets.filter(t => t.paymentMethod === 'cash' || t.paymentMethod === 'contanti');
    const cardTickets = activeTickets.filter(t => t.paymentMethod === 'card' || t.paymentMethod === 'carta' || t.paymentMethod === 'pos');
    const cashRevenue = cashTickets.reduce((sum, t) => sum + Number(t.ticketPrice || 0), 0);
    const cardRevenue = cardTickets.reduce((sum, t) => sum + Number(t.ticketPrice || 0), 0);
    
    // Recent transactions (last 10 tickets)
    const sortedTickets = allTodayTickets.sort((a, b) => 
      new Date(b.emissionDate || 0).getTime() - new Date(a.emissionDate || 0).getTime()
    );
    const recentTransactions = sortedTickets.slice(0, 10).map(ticket => ({
      id: ticket.id,
      type: 'ticket' as const,
      title: `${ticket.ticketType === 'omaggio' ? 'Omaggio' : ticket.ticketType === 'ridotto' ? 'Ridotto' : 'Intero'} - ${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim() || `Biglietto ${ticket.ticketCode || ''}`,
      amount: Number(ticket.ticketPrice || 0),
      time: ticket.emissionDate ? new Date(ticket.emissionDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '',
      ticketType: ticket.ticketType,
    }));
    
    res.json({
      stats: {
        totalRevenue,
        ticketsSold,
        transactionsCount: ticketsSold,
        cashRevenue,
        cardRevenue,
      },
      currentEvent: currentEvent ? {
        id: currentEvent.id,
        name: currentEvent.eventName,
        date: currentEvent.eventDate ? new Date(currentEvent.eventDate).toLocaleDateString('it-IT') : '',
        startTime: currentEvent.eventTime || '',
        endTime: '',
        status: currentEvent.status === 'ongoing' ? 'in_progress' : currentEvent.status === 'scheduled' ? 'scheduled' : 'ended',
      } : null,
      recentTransactions,
    });
  } catch (error: any) {
    console.error('[CashierDashboard] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/cashier/my-events - Get events assigned to logged-in cashier
router.get("/api/cashier/my-events", requireAuth, requireCashier, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Usa helper per supportare sia nuove che vecchie sessioni cassiere
    const cashierId = getSiaeCashierId(user);
    if (!cashierId) {
      return res.status(400).json({ message: "ID cassiere non trovato nella sessione" });
    }
    const allocations = await siaeStorage.getCashierAllocationsByCashier(cashierId);
    
    const events = await Promise.all(allocations.map(async (alloc) => {
      const event = await siaeStorage.getSiaeTicketedEvent(alloc.eventId);
      const sector = alloc.sectorId ? await siaeStorage.getSiaeEventSector(alloc.sectorId) : null;
      return {
        allocationId: alloc.id,
        eventId: alloc.eventId,
        eventName: event?.eventName || 'N/A',
        eventDate: event?.eventDate,
        eventTime: event?.eventTime,
        venueName: event?.venueName,
        sectorId: alloc.sectorId,
        sectorName: sector?.name || 'Tutti i settori',
        quotaQuantity: alloc.quotaQuantity,
        quotaUsed: alloc.quotaUsed,
        quotaRemaining: alloc.quotaQuantity - alloc.quotaUsed,
        isActive: alloc.isActive
      };
    }));
    
    // Filter only active allocations with active events
    const activeEvents = events.filter(e => e.isActive && e.eventName !== 'N/A');
    
    res.json(activeEvents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/cashier/events/:eventId/quotas - Get remaining quotas for event
router.get("/api/cashier/events/:eventId/quotas", requireAuth, requireCashier, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    
    // Usa helper per supportare sia nuove che vecchie sessioni cassiere
    const cashierId = getSiaeCashierId(user);
    if (!cashierId) {
      return res.status(400).json({ message: "ID cassiere non trovato nella sessione" });
    }
    const allocation = await siaeStorage.getCashierAllocationByCashierAndEvent(cashierId, eventId);
    if (!allocation) {
      return res.status(404).json({ message: "Non hai allocazione per questo evento" });
    }
    
    const event = await siaeStorage.getSiaeTicketedEvent(eventId);
    const sectors = await siaeStorage.getSiaeEventSectors(eventId);
    const sector = allocation.sectorId ? await siaeStorage.getSiaeEventSector(allocation.sectorId) : null;
    
    // Get today's tickets by this cashier (issuedByUserId = cashier.id for SIAE cashiers)
    const todayTickets = await siaeStorage.getTodayTicketsByUser(cashierId, eventId);
    
    res.json({
      eventId,
      eventName: event?.eventName,
      eventDate: event?.eventDate,
      sectorId: allocation.sectorId,
      sectorName: sector?.name || 'Tutti i settori',
      quotaQuantity: allocation.quotaQuantity,
      quotaUsed: allocation.quotaUsed,
      quotaRemaining: allocation.quotaQuantity - allocation.quotaUsed,
      todayEmissions: todayTickets.length,
      todayRevenue: todayTickets.reduce((sum, t) => sum + Number(t.ticketPrice || 0), 0),
      availableSectors: sectors.map(s => ({
        id: s.id,
        name: s.name,
        availableSeats: s.availableSeats,
        ticketPrice: s.priceIntero
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cashier/events/:eventId/emit-ticket - Emit ticket with fiscal seal
router.post("/api/cashier/events/:eventId/emit-ticket", requireAuth, requireCashier, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    const { sectorId, ticketType, ticketPrice, participantFirstName, participantLastName, paymentMethod, isComplimentary, customText } = req.body;
    
    if (!sectorId || !ticketType || ticketPrice === undefined) {
      return res.status(400).json({ message: "sectorId, ticketType e ticketPrice sono obbligatori" });
    }
    
    // Usa helper per supportare sia nuove che vecchie sessioni cassiere
    const cashierId = getSiaeCashierId(user);
    if (!cashierId) {
      return res.status(400).json({ message: "ID cassiere non trovato nella sessione" });
    }
    const allocation = await siaeStorage.getCashierAllocationByCashierAndEvent(cashierId, eventId);
    if (!allocation) {
      return res.status(403).json({ message: "Non hai allocazione per questo evento" });
    }
    
    if (!allocation.isActive) {
      return res.status(403).json({ message: "La tua allocazione per questo evento è stata disattivata" });
    }
    
    // Check sector restriction
    if (allocation.sectorId && allocation.sectorId !== sectorId) {
      return res.status(403).json({ message: "Non sei autorizzato a emettere biglietti per questo settore" });
    }
    
    // Check quota
    if (allocation.quotaUsed >= allocation.quotaQuantity) {
      return res.status(403).json({ 
        message: "Quota biglietti esaurita",
        errorCode: "QUOTA_EXCEEDED",
        quotaUsed: allocation.quotaUsed,
        quotaQuantity: allocation.quotaQuantity
      });
    }
    
    const event = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    const sector = await siaeStorage.getSiaeEventSector(sectorId);
    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    
    // Check seat availability
    if (sector.availableSeats !== null && sector.availableSeats <= 0) {
      return res.status(400).json({ message: "Nessun posto disponibile in questo settore" });
    }
    
    // Generate ticket code
    const ticketCode = `${event.eventCode || 'TKT'}-${Date.now().toString(36).toUpperCase()}`;
    
    // Try to get fiscal seal from bridge (optional - box office can work offline)
    let fiscalSeal = null;
    let fiscalSealCode = null;
    
    try {
      if (isBridgeConnected() && isCardReadyForSeals().ready) {
        const priceInCents = Math.round(Number(ticketPrice) * 100);
        const sealData = await requestFiscalSeal(priceInCents);
        fiscalSeal = sealData;
        fiscalSealCode = sealData?.sealCode;
      }
    } catch (sealError: any) {
      console.log(`[Cashier] Fiscal seal not available: ${sealError.message}`);
      // Continue without fiscal seal - will be registered later
    }
    
    // Atomic ticket emission with quota management
    const result = await siaeStorage.emitTicketWithAtomicQuota({
      allocationId: allocation.id,
      eventId,
      sectorId,
      sectorCode: (sector.sectorCode || 'XX').slice(0, 2),
      ticketCode,
      ticketType,
      ticketTypeCode: ticketType.substring(0, 2).toUpperCase(),
      ticketPrice: Number(ticketPrice),
      customerId: null,
      issuedByUserId: cashierId,
      participantFirstName: participantFirstName || null,
      participantLastName: participantLastName || null,
      isComplimentary: isComplimentary || false,
      paymentMethod: paymentMethod || 'cash',
      customText: customText || null,
      currentTicketsSold: event.ticketsSold || 0,
      currentTotalRevenue: Number(event.totalRevenue || 0),
      currentAvailableSeats: sector.availableSeats || 0
    });
    
    if (!result.success) {
      return res.status(400).json({ 
        message: result.error || "Errore durante l'emissione del biglietto",
        errorCode: "EMISSION_FAILED"
      });
    }
    
    // Update ticket with fiscal seal data if available
    if (fiscalSeal && result.ticket) {
      await siaeStorage.updateSiaeTicket(result.ticket.id, {
        fiscalSealCode: fiscalSeal.sealCode,
        fiscalSealCounter: fiscalSeal.counter,
        cardCode: fiscalSeal.serialNumber,
      });
    }
    
    // Create ticket audit
    await siaeStorage.createTicketAudit({
      companyId: user.companyId,
      ticketId: result.ticket!.id,
      operationType: 'emission',
      performedBy: cashierId,
      reason: null,
      metadata: {
        ticketCode,
        ticketType,
        ticketPrice,
        sectorName: sector.name,
        eventName: event.eventName,
        fiscalSealCode,
        paymentMethod: paymentMethod || 'cash',
        emittedBy: user.username || user.claims?.username || 'Cassiere'
      }
    });
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: cashierId,
      action: 'ticket_emitted',
      entityType: 'ticket',
      entityId: result.ticket!.id,
      description: `Emesso biglietto ${ticketCode} - ${ticketType} - €${ticketPrice}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    res.status(201).json({
      ...result.ticket,
      fiscalSealCode,
      sectorName: sector.name,
      eventName: event.eventName,
      quotaRemaining: allocation.quotaQuantity - allocation.quotaUsed - 1
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cashier/tickets/:ticketId/annul - Annul ticket (SIAE fiscal annulment)
router.post("/api/cashier/tickets/:ticketId/annul", requireAuth, requireCashier, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { ticketId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: "Motivo annullamento obbligatorio" });
    }
    
    const ticket = await siaeStorage.getSiaeTicket(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    
    if (ticket.status === 'cancelled') {
      return res.status(400).json({ message: "Biglietto già annullato" });
    }
    
    if (ticket.status === 'used') {
      return res.status(400).json({ message: "Impossibile annullare un biglietto già utilizzato" });
    }
    
    // Usa helper per supportare sia nuove che vecchie sessioni cassiere
    const cashierId = getSiaeCashierId(user);
    if (!cashierId) {
      return res.status(400).json({ message: "ID cassiere non trovato nella sessione" });
    }
    const allocation = await siaeStorage.getCashierAllocationByCashierAndEvent(cashierId, ticket.ticketedEventId);
    if (!allocation) {
      return res.status(403).json({ message: "Non hai allocazione per questo evento" });
    }
    
    // Verify ticket was issued by this cashier (for security)
    if (ticket.issuedByUserId !== cashierId) {
      // Allow annulment if cashier has same sector or all-sector allocation
      if (allocation.sectorId && allocation.sectorId !== ticket.sectorId) {
        return res.status(403).json({ message: "Non sei autorizzato ad annullare questo biglietto" });
      }
    }
    
    // Atomic cancellation with quota restore
    const result = await siaeStorage.cancelTicketWithAtomicQuotaRestore({
      ticketId,
      cancelledByUserId: cashierId,
      cancellationReason: reason,
      issuedByUserId: ticket.issuedByUserId,
      ticketedEventId: ticket.ticketedEventId,
      sectorId: ticket.sectorId,
      ticketPrice: Number(ticket.ticketPrice || 0)
    });
    
    if (!result.success) {
      return res.status(400).json({ 
        message: result.error || "Errore durante l'annullamento",
        errorCode: "ANNULMENT_FAILED"
      });
    }
    
    // Create ticket audit
    await siaeStorage.createTicketAudit({
      companyId: user.companyId,
      ticketId,
      operationType: 'cancellation',
      performedBy: cashierId,
      reason,
      metadata: {
        ticketCode: ticket.ticketCode,
        originalPrice: ticket.ticketPrice,
        cancelledBy: user.username || user.claims?.username || 'Cassiere'
      }
    });
    
    // Audit log
    await siaeStorage.createAuditLog({
      companyId: user.companyId,
      userId: cashierId,
      action: 'ticket_annulled_by_cashier',
      entityType: 'ticket',
      entityId: ticketId,
      description: `Annullato biglietto ${ticket.ticketCode} - Motivo: ${reason}`,
      ipAddress: (req.ip || '').substring(0, 45),
      userAgent: (req.get('user-agent') || '').substring(0, 500)
    });
    
    // Get updated quota
    const updatedAllocation = await siaeStorage.getCashierAllocation(allocation.id);
    
    res.json({
      ...result.ticket,
      quotaRemaining: updatedAllocation ? updatedAllocation.quotaQuantity - updatedAllocation.quotaUsed : null
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/cashier/events/:eventId/c1-report - Generate C1 report for cashier session
router.get("/api/cashier/events/:eventId/c1-report", requireAuth, requireCashier, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    
    // Usa helper per supportare sia nuove che vecchie sessioni cassiere
    const cashierId = getSiaeCashierId(user);
    if (!cashierId) {
      return res.status(400).json({ message: "ID cassiere non trovato nella sessione" });
    }
    const allocation = await siaeStorage.getCashierAllocationByCashierAndEvent(cashierId, eventId);
    if (!allocation) {
      return res.status(404).json({ message: "Non hai allocazione per questo evento" });
    }
    
    const event = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Get today's tickets by this cashier for this event
    const todayTickets = await siaeStorage.getTodayTicketsByUser(cashierId, eventId);
    
    // Aggregate by ticket type
    const byType = new Map<string, { count: number; amount: number }>();
    for (const ticket of todayTickets) {
      const type = ticket.ticketType || 'intero';
      const current = byType.get(type) || { count: 0, amount: 0 };
      current.count++;
      current.amount += Number(ticket.ticketPrice || 0);
      byType.set(type, current);
    }
    
    const activeTickets = todayTickets.filter(t => !isCancelledStatus(t.status));
    const cancelledTickets = todayTickets.filter(t => isCancelledStatus(t.status));
    
    const totalRevenue = activeTickets.reduce((sum, t) => sum + Number(t.ticketPrice || 0), 0);
    
    const report = {
      eventId,
      eventName: event.eventName,
      eventDate: event.eventDate,
      cashierName: `${user.firstName} ${user.lastName}`,
      cashierEmail: user.email,
      reportDate: new Date(),
      allocation: {
        quotaQuantity: allocation.quotaQuantity,
        quotaUsed: allocation.quotaUsed,
        quotaRemaining: allocation.quotaQuantity - allocation.quotaUsed
      },
      session: {
        totalEmitted: todayTickets.length,
        activeTickets: activeTickets.length,
        cancelledTickets: cancelledTickets.length,
        totalRevenue,
        byTicketType: Object.fromEntries(byType),
        paymentBreakdown: {
          cash: activeTickets.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + Number(t.ticketPrice || 0), 0),
          card: activeTickets.filter(t => t.paymentMethod === 'card').reduce((sum, t) => sum + Number(t.ticketPrice || 0), 0),
          other: activeTickets.filter(t => !['cash', 'card'].includes(t.paymentMethod || '')).reduce((sum, t) => sum + Number(t.ticketPrice || 0), 0)
        }
      },
      tickets: todayTickets.map(t => ({
        id: t.id,
        ticketCode: t.ticketCode,
        ticketType: t.ticketType,
        ticketPrice: t.ticketPrice,
        status: t.status,
        emissionDate: t.emissionDate,
        fiscalSealCode: t.fiscalSealCode,
        paymentMethod: t.paymentMethod
      }))
    };
    
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/siae/events/:eventId/report-c1 - Generate C1 fiscal report
// Accessible by gestore, organizer, admin, super_admin, and cassiere (only for allocated events)
router.get("/api/siae/events/:eventId/report-c1", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { eventId } = req.params;
    
    const event = await siaeStorage.getSiaeTicketedEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    // Check authorization based on role
    const isGestoreOrHigher = ['gestore', 'organizer', 'admin', 'super_admin'].includes(user.role);
    const isCashier = user.role === 'cassiere';
    
    if (!isGestoreOrHigher && !isCashier) {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo report" });
    }
    
    // For cashiers, verify they are allocated to this event
    if (isCashier) {
      const cashierId = getSiaeCashierId(user);
      if (!cashierId) {
        return res.status(403).json({ message: "Impossibile identificare il cassiere" });
      }
      
      // Check if cashier is allocated to this event
      const allocations = await db.select()
        .from(siaeCashierAllocations)
        .where(and(
          eq(siaeCashierAllocations.eventId, eventId),
          eq(siaeCashierAllocations.cashierId, cashierId),
          eq(siaeCashierAllocations.isActive, true)
        ));
      
      if (allocations.length === 0) {
        return res.status(403).json({ 
          message: "Non sei allocato a questo evento. Puoi accedere solo ai report degli eventi a cui sei stato assegnato.",
          errorCode: "NOT_ALLOCATED_TO_EVENT"
        });
      }
    }
    
    // For gestore/organizer/admin, verify company access (super_admin can access all)
    if (isGestoreOrHigher && user.role !== 'super_admin' && event.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato ad accedere a questo evento" });
    }
    
    // Get all tickets for event
    const tickets = await siaeStorage.getSiaeTicketsByEvent(eventId);
    const sectors = await siaeStorage.getSiaeEventSectors(eventId);
    
    // Aggregate by sector and ticket type
    const sectorStats = new Map<string, {
      sectorName: string;
      sectorCode: string;
      interoCount: number;
      interoAmount: number;
      ridottoCount: number;
      ridottoAmount: number;
      omaggioCount: number;
      cancelledCount: number;
    }>();
    
    for (const sector of sectors) {
      sectorStats.set(sector.id, {
        sectorName: sector.name,
        sectorCode: sector.sectorCode || '',
        interoCount: 0,
        interoAmount: 0,
        ridottoCount: 0,
        ridottoAmount: 0,
        omaggioCount: 0,
        cancelledCount: 0
      });
    }
    
    for (const ticket of tickets) {
      const stats = sectorStats.get(ticket.sectorId);
      if (!stats) continue;
      
      if (ticket.status === 'cancelled') {
        stats.cancelledCount++;
        continue;
      }
      
      const price = Number(ticket.ticketPrice) || Number(ticket.grossAmount) || 0;
      
      // Usa ticketType se disponibile, altrimenti deriva da ticketTypeCode
      let effectiveTicketType = ticket.ticketType;
      if (!effectiveTicketType && ticket.ticketTypeCode) {
        switch (ticket.ticketTypeCode) {
          case 'INT':
            effectiveTicketType = 'intero';
            break;
          case 'RID':
            effectiveTicketType = 'ridotto';
            break;
          case 'OMG':
            effectiveTicketType = 'omaggio';
            break;
          default:
            effectiveTicketType = 'intero'; // Default fallback
        }
      }
      
      switch (effectiveTicketType) {
        case 'intero':
          stats.interoCount++;
          stats.interoAmount += price;
          break;
        case 'ridotto':
          stats.ridottoCount++;
          stats.ridottoAmount += price;
          break;
        case 'omaggio':
          stats.omaggioCount++;
          break;
        default:
          // Fallback: conta come intero se non riconosciuto
          stats.interoCount++;
          stats.interoAmount += price;
      }
    }
    
    const activeTickets = tickets.filter(t => !isCancelledStatus(t.status));
    const totalRevenue = activeTickets.reduce((sum, t) => sum + (Number(t.ticketPrice) || Number(t.grossAmount) || 0), 0);
    const vatRate = event.vatRate || 10;
    const vatAmount = totalRevenue * vatRate / (100 + vatRate);
    const netRevenue = totalRevenue - vatAmount;
    
    const report = {
      eventId: event.id,
      eventName: event.eventName,
      eventCode: event.eventCode,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      venueName: event.venueName,
      venueCapacity: event.venueCapacity,
      generatedAt: new Date(),
      generatedBy: user.fullName || user.username,
      summary: {
        totalTicketsSold: activeTickets.length,
        totalTicketsCancelled: tickets.filter(t => isCancelledStatus(t.status)).length,
        totalRevenue,
        vatRate,
        vatAmount,
        netRevenue
      },
      sectors: Array.from(sectorStats.values()),
      ticketTypes: {
        intero: {
          count: activeTickets.filter(t => {
            const tt = t.ticketType || (t.ticketTypeCode === 'INT' ? 'intero' : (t.ticketTypeCode === 'RID' ? 'ridotto' : (t.ticketTypeCode === 'OMG' ? 'omaggio' : 'intero')));
            return tt === 'intero';
          }).length,
          amount: activeTickets.filter(t => {
            const tt = t.ticketType || (t.ticketTypeCode === 'INT' ? 'intero' : (t.ticketTypeCode === 'RID' ? 'ridotto' : (t.ticketTypeCode === 'OMG' ? 'omaggio' : 'intero')));
            return tt === 'intero';
          }).reduce((s, t) => s + (Number(t.ticketPrice) || Number(t.grossAmount) || 0), 0)
        },
        ridotto: {
          count: activeTickets.filter(t => {
            const tt = t.ticketType || (t.ticketTypeCode === 'INT' ? 'intero' : (t.ticketTypeCode === 'RID' ? 'ridotto' : (t.ticketTypeCode === 'OMG' ? 'omaggio' : 'intero')));
            return tt === 'ridotto';
          }).length,
          amount: activeTickets.filter(t => {
            const tt = t.ticketType || (t.ticketTypeCode === 'INT' ? 'intero' : (t.ticketTypeCode === 'RID' ? 'ridotto' : (t.ticketTypeCode === 'OMG' ? 'omaggio' : 'intero')));
            return tt === 'ridotto';
          }).reduce((s, t) => s + (Number(t.ticketPrice) || Number(t.grossAmount) || 0), 0)
        },
        omaggio: {
          count: activeTickets.filter(t => {
            const tt = t.ticketType || (t.ticketTypeCode === 'INT' ? 'intero' : (t.ticketTypeCode === 'RID' ? 'ridotto' : (t.ticketTypeCode === 'OMG' ? 'omaggio' : 'intero')));
            return tt === 'omaggio';
          }).length,
          amount: 0
        }
      }
    };
    
    res.json(report);
  } catch (error: any) {
    console.error('[ReportC1] Error generating report:', error);
    res.status(500).json({ message: error.message || 'Errore nella generazione del report' });
  }
});

// POST /api/siae/tickets/:id/print - Print a ticket to thermal printer
// Requires: printer agent connected, ticket template configured for event
router.post("/api/siae/tickets/:id/print", requireAuth, async (req: Request, res: Response) => {
  console.log('[TicketPrint] Endpoint hit! ticketId:', req.params.id, 'user:', (req.user as any)?.role);
  try {
    const user = req.user as any;
    const { id: ticketId } = req.params;
    const { agentId, skipBackground = true } = req.body;
    
    console.log('[TicketPrint] Looking up ticket:', ticketId);
    
    // Get the ticket
    const ticket = await siaeStorage.getSiaeTicket(ticketId);
    if (!ticket) {
      console.log('[TicketPrint] Ticket NOT FOUND:', ticketId);
      return res.status(404).json({ message: "Biglietto non trovato" });
    }
    console.log('[TicketPrint] Ticket found, ticketedEventId:', ticket.ticketedEventId);
    
    // SIAE Compliance: Check if ticket has already been printed (no reprints allowed)
    // First, check if non-admin is trying to force reprint - reject immediately with 403
    if (req.body.forceReprint === true && user.role !== 'super_admin') {
      console.log('[TicketPrint] REPRINT OVERRIDE DENIED - user is not super_admin');
      return res.status(403).json({ 
        message: "Solo i Super Admin possono forzare la ristampa.",
        errorCode: "REPRINT_OVERRIDE_DENIED"
      });
    }
    
    // Then check if already printed (unless super_admin with forceReprint)
    const forceReprint = req.body.forceReprint === true && user.role === 'super_admin';
    if ((ticket as any).printedAt && !forceReprint) {
      console.log('[TicketPrint] REPRINT BLOCKED - ticket already printed at:', (ticket as any).printedAt);
      return res.status(409).json({ 
        message: "Biglietto già stampato. La ristampa non è consentita per conformità SIAE.",
        errorCode: "ALREADY_PRINTED",
        printedAt: (ticket as any).printedAt
      });
    }
    
    // Get event details
    const event = await siaeStorage.getSiaeTicketedEvent(ticket.ticketedEventId);
    if (!event) {
      console.log('[TicketPrint] Event NOT FOUND:', ticket.ticketedEventId);
      return res.status(404).json({ message: "Evento non trovato" });
    }
    console.log('[TicketPrint] Event found:', event.eventName);
    
    // Verify company access
    if (user.role !== 'super_admin' && event.companyId !== user.companyId) {
      return res.status(403).json({ message: "Non autorizzato" });
    }
    
    // Get sector
    const sector = ticket.sectorId ? await siaeStorage.getSiaeEventSector(ticket.sectorId) : null;
    
    // Get SIAE system config for ticketing_manager (businessName)
    const systemConfig = await siaeStorage.getSiaeSystemConfig(event.companyId);
    
    // Get list of currently connected agents for this company
    const connectedAgents = getConnectedAgents(event.companyId);
    const connectedAgentIds = new Set(connectedAgents.map(a => a.agentId));
    
    console.log('[TicketPrint] Connected agents:', connectedAgents.map(a => `${a.agentId} (${a.deviceName})`).join(', ') || 'NONE');
    
    // No agents connected at all
    if (connectedAgents.length === 0) {
      return res.status(503).json({ 
        message: "Nessun agente di stampa connesso. Avviare l'applicazione desktop Event4U.",
        errorCode: "NO_PRINT_AGENT"
      });
    }
    
    // Determine print agent ID with smart fallback
    let printerAgentId = agentId;
    let cashierId: string | null = null;
    
    // Get cashier info if applicable
    if (user.role === 'cassiere') {
      cashierId = getSiaeCashierId(user) || null;
    }
    
    // Verify the specified agent is actually connected
    if (printerAgentId && !connectedAgentIds.has(printerAgentId)) {
      console.log(`[TicketPrint] Specified agent ${printerAgentId} is not connected, will try fallback`);
      printerAgentId = null;
    }
    
    // If no valid agent specified, try cashier's default printer (if connected)
    if (!printerAgentId && cashierId) {
      const [cashier] = await db.select().from(siaeCashiers).where(eq(siaeCashiers.id, cashierId));
      if (cashier?.defaultPrinterAgentId && connectedAgentIds.has(cashier.defaultPrinterAgentId)) {
        printerAgentId = cashier.defaultPrinterAgentId;
        console.log(`[TicketPrint] Using cashier's default agent: ${printerAgentId}`);
      } else if (cashier?.defaultPrinterAgentId) {
        console.log(`[TicketPrint] Cashier's default agent ${cashier.defaultPrinterAgentId} is not connected`);
      }
    }
    
    // Smart fallback: if exactly one agent is connected, use it automatically
    if (!printerAgentId) {
      if (connectedAgents.length === 1) {
        printerAgentId = connectedAgents[0].agentId;
        console.log(`[TicketPrint] Only one agent connected, using: ${printerAgentId} (${connectedAgents[0].deviceName})`);
        
        // Auto-update cashier's default for future prints
        if (cashierId) {
          await db.update(siaeCashiers)
            .set({ defaultPrinterAgentId: printerAgentId })
            .where(eq(siaeCashiers.id, cashierId));
          console.log(`[TicketPrint] Auto-updated cashier's default printer to: ${printerAgentId}`);
        }
      } else {
        // Multiple agents connected but none specified - require explicit selection
        console.log(`[TicketPrint] Multiple agents connected but none specified. Agents:`, connectedAgents);
        return res.status(400).json({ 
          message: "Più agenti di stampa connessi. Selezionare un agente nelle impostazioni stampante.",
          errorCode: "MULTIPLE_AGENTS",
          connectedAgents: connectedAgents.map(a => ({ agentId: a.agentId, deviceName: a.deviceName }))
        });
      }
    }
    
    // Get event's ticket template
    const [template] = await db.select().from(ticketTemplates)
      .where(and(
        eq(ticketTemplates.companyId, event.companyId),
        eq(ticketTemplates.isActive, true)
      ))
      .limit(1);
    
    if (!template) {
      console.log('[TicketPrint] Template NOT FOUND for companyId:', event.companyId);
      return res.status(404).json({ 
        message: "Nessun template di stampa configurato per questa azienda",
        errorCode: "NO_TEMPLATE"
      });
    }
    console.log('[TicketPrint] Template found:', template.name);
    
    // Get template elements
    const elements = await db.select().from(ticketTemplateElements)
      .where(eq(ticketTemplateElements.templateId, template.id))
      .orderBy(ticketTemplateElements.zIndex);
    
    // Parse elements for HTML generation
    const parsedElements = elements.map(el => {
      let content = el.staticValue;
      if (el.fieldKey && !el.staticValue) {
        content = `{{${el.fieldKey}}}`;
      } else if (el.fieldKey && el.staticValue) {
        content = el.staticValue;
      }
      
      return {
        type: el.type,
        x: parseFloat(el.x as any),
        y: parseFloat(el.y as any),
        width: parseFloat(el.width as any),
        height: parseFloat(el.height as any),
        content,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        fontWeight: el.fontWeight,
        fontColor: el.color,
        textAlign: el.textAlign,
        rotation: el.rotation,
      };
    });
    
    // Map ticket type to Italian label
    const ticketTypeLabels: Record<string, string> = {
      'intero': 'Intero',
      'ridotto': 'Ridotto',
      'omaggio': 'Omaggio',
    };
    
    // Build ticket data for template
    const ticketData: Record<string, string> = {
      event_name: event.eventName || '',
      event_date: event.eventDate ? new Date(event.eventDate).toLocaleDateString('it-IT') : '',
      event_time: event.eventTime || '',
      venue_name: event.venueName || '',
      price: `€ ${Number(ticket.ticketPrice || 0).toFixed(2).replace('.', ',')}`,
      ticket_number: ticket.ticketCode || '',
      progressive_number: String(ticket.progressiveNumber || ''),
      ticket_type: ticketTypeLabels[ticket.ticketType || ''] || ticket.ticketType || '',
      sector: sector?.name || '',
      row: ticket.row || '',
      seat: ticket.seatNumber || '',
      buyer_name: ticket.participantFirstName && ticket.participantLastName 
        ? `${ticket.participantFirstName} ${ticket.participantLastName}` 
        : '',
      organizer_company: event.organizerName || event.companyName || '',
      ticketing_manager: (() => {
        if (!systemConfig) return event.companyName || '';
        const parts: string[] = [];
        if (systemConfig.businessName) parts.push(systemConfig.businessName);
        if (systemConfig.vatNumber) parts.push(`P.IVA ${systemConfig.vatNumber}`);
        if (systemConfig.businessAddress) {
          let address = systemConfig.businessAddress;
          if (systemConfig.businessPostalCode) address += ` - ${systemConfig.businessPostalCode}`;
          if (systemConfig.businessCity) address += ` ${systemConfig.businessCity}`;
          if (systemConfig.businessProvince) address += ` (${systemConfig.businessProvince})`;
          parts.push(address);
        }
        return parts.length > 0 ? parts.join(' - ') : event.companyName || '';
      })(),
      emission_datetime: ticket.emissionDate ? new Date(ticket.emissionDate).toLocaleString('it-IT') : '',
      fiscal_seal: ticket.fiscalSealCode || '',
      qr_code: `https://manage.eventfouryou.com/verify/${ticket.ticketCode}`,
      custom_text: ticket.customText || '',
    };
    
    // Generate HTML
    const ticketHtml = generateTicketHtml(
      {
        paperWidthMm: template.paperWidthMm,
        paperHeightMm: template.paperHeightMm,
        backgroundImageUrl: template.backgroundImageUrl,
        dpi: template.dpi || 203,
        printOrientation: (template as any).printOrientation || 'auto',
      },
      parsedElements,
      ticketData,
      skipBackground
    );
    
    // Determine orientation
    const naturalOrientation = template.paperWidthMm > template.paperHeightMm ? 'landscape' : 'portrait';
    const effectiveOrientation = (template as any).printOrientation === 'auto' || !(template as any).printOrientation
      ? naturalOrientation
      : (template as any).printOrientation;
    
    // Build print payload
    const printPayload = {
      id: `ticket-${ticketId}-${Date.now()}`,
      type: 'ticket',
      paperWidthMm: template.paperWidthMm,
      paperHeightMm: template.paperHeightMm,
      orientation: effectiveOrientation,
      html: ticketHtml,
      ticketId: ticketId,
    };
    
    // Send to print agent
    const sent = sendPrintJobToAgent(printerAgentId, printPayload);
    
    if (!sent) {
      return res.status(503).json({ 
        message: "Agente di stampa non raggiungibile",
        errorCode: "AGENT_UNREACHABLE"
      });
    }
    
    console.log(`[TicketPrint] Sent ticket ${ticketId} to print agent ${printerAgentId}`);
    
    // SIAE Compliance: Mark ticket as printed to prevent reprints (ISO string for consistency)
    await siaeStorage.updateSiaeTicket(ticketId, { 
      printedAt: new Date().toISOString() 
    } as any);
    console.log(`[TicketPrint] Marked ticket ${ticketId} as printed`);
    
    res.json({ success: true, message: "Stampa inviata", agentId: printerAgentId });
  } catch (error: any) {
    console.error('[TicketPrint] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

console.log('[SIAE Routes] All routes registered including /api/siae/tickets/:id/print');

export default router;
