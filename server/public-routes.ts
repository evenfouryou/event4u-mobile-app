// Route pubbliche per il portale acquisto biglietti
// Separate dalle route admin, accessibili senza autenticazione admin
import { Router } from "express";
import { db } from "./db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { 
  requestFiscalSeal, 
  isCardReadyForSeals,
  ensureCardReadyForSeals,
  isBridgeConnected,
  getCachedBridgeStatus,
  getCachedEfffData,
  getBridgeDebugStatus,
  type FiscalSealData 
} from "./bridge-relay";
import { creditLoyaltyPoints } from "./loyalty-routes";
import { convertReferralOnPurchase, getPendingReferralDiscount } from "./referral-routes";
import { CommissionService, WalletService } from "./billing-service";
import {
  siaeTicketedEvents,
  siaeEventSectors,
  siaeSeats,
  siaeCustomers,
  siaeOtpAttempts,
  siaeTickets,
  siaeTransactions,
  siaeFiscalSeals,
  siaeActivationCards,
  siaeEmissionChannels,
  siaeSystemConfig,
  publicCartItems,
  publicCheckoutSessions,
  publicCustomerSessions,
  events,
  locations,
  companies,
  insertPublicCartItemSchema,
  listEntries,
  eventLists,
  tableBookings,
  tableBookingParticipants,
  eventTables,
  venueFloorPlans,
  floorPlanZones,
  eventZoneMappings,
  floorPlanSeats,
  seatHolds,
  eventSeatStatus,
  eventCategories,
  identities,
  users,
  prOtpAttempts,
  siaeNameChanges,
  siaeResales,
  siaeWalletTransactions,
  eventReservationSettings,
  tableTypes,
  tableReservations,
  reservationPayments,
  prProfiles,
  siaeSubscriptionTypes,
  siaeSubscriptions,
  organizerCommissionProfiles,
  siaeEventGenres,
  ticketTemplates,
  ticketTemplateElements,
} from "@shared/schema";
import { eq, and, gt, lt, desc, sql, gte, lte, or, isNull, not } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { generateTicketHtml } from "./template-routes";
import { generateTicketPdf, generateWalletImage, generateDigitalTicketPdf } from "./pdf-service";
import { isCancelledStatus, resolveSystemCodeSafe, SIAE_SYSTEM_CODE_DEFAULT } from "./siae-utils";
import { sendTicketEmail, sendPasswordResetEmail } from "./email-service";
import { sendOTP as sendMSG91OTP, verifyOTP as verifyMSG91OTP, resendOTP as resendMSG91OTP, isMSG91Configured } from "./msg91-service";
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";
import svgCaptcha from "svg-captcha";
import QRCode from "qrcode";
import { findOrCreateIdentity, findCustomerByIdentity } from "./identity-utils";

const router = Router();

// ==================== CAPTCHA STORAGE ====================

// In-memory CAPTCHA storage (token -> { text, expiresAt, validated })
const captchaStore = new Map<string, { text: string; expiresAt: Date; validated?: boolean }>();

// Clean up expired CAPTCHAs every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [token, data] of captchaStore.entries()) {
    if (data.expiresAt < now) {
      captchaStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

// ==================== HELPER FUNCTIONS ====================

// Normalizza numero di telefono in formato E.164 (+39XXXXXXXXXX)
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let normalized = phone.replace(/[^\d+]/g, '');
  if (normalized.startsWith('0039')) normalized = '+39' + normalized.slice(4);
  if (normalized.startsWith('39') && !normalized.startsWith('+')) normalized = '+' + normalized;
  if (!normalized.startsWith('+')) normalized = '+39' + normalized;
  if (normalized.startsWith('+390')) normalized = '+39' + normalized.slice(4);
  return normalized.length >= 10 ? normalized : null;
}

// Genera session ID per carrello (cookie-based)
function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Genera OTP a 6 cifre
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Genera codice univoco cliente
function generateCustomerCode(): string {
  return `CL${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

// Genera codice transazione
function generateTransactionCode(): string {
  return `TRX${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// Middleware per ottenere session ID dal cookie
function getOrCreateSessionId(req: any, res: any): string {
  let sessionId = req.cookies?.cartSession;
  if (!sessionId) {
    sessionId = generateSessionId();
    res.cookie("cartSession", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 ore
      sameSite: "lax",
    });
  }
  return sessionId;
}

// Verifica autenticazione cliente - supporta sia sessione Passport che Bearer token legacy
async function getAuthenticatedCustomer(req: any): Promise<any | null> {
  // Prima prova con la sessione Passport (login unificato)
  if (req.user && req.isAuthenticated && req.isAuthenticated()) {
    // Caso 1: Login diretto come cliente (accountType: 'customer')
    if (req.user.accountType === 'customer' && req.user.customerId) {
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.id, req.user.customerId));
      
      if (customer) {
        return customer;
      }
    }
    
    // Caso 2: Utente admin/gestore loggato - cerca profilo cliente collegato
    if (req.user.claims?.sub) {
      const userId = req.user.claims.sub;
      
      // Cerca il profilo cliente SIAE collegato all'utente
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.userId, userId));
      
      if (customer) {
        return customer;
      }
      
      // Se non esiste un profilo SIAE, restituisci i dati base dell'utente
      // per permettere la creazione on-demand durante il checkout
      return {
        id: null,
        userId: userId,
        email: req.user.claims.email || '',
        firstName: '',
        lastName: '',
        phone: null,
        phoneVerified: false,
        isActive: true,
        _isUserWithoutSiaeProfile: true,
      };
    }
  }
  
  // Fallback: prova con Bearer token (legacy)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.substring(7);
  const [session] = await db
    .select()
    .from(publicCustomerSessions)
    .where(
      and(
        eq(publicCustomerSessions.sessionToken, token),
        gt(publicCustomerSessions.expiresAt, new Date())
      )
    );

  if (!session) return null;

  const [customer] = await db
    .select()
    .from(siaeCustomers)
    .where(eq(siaeCustomers.id, session.customerId));

  return customer;
}

// ==================== DIAGNOSTICA BRIDGE ====================

// Endpoint pubblico per verificare lo stato del bridge smartcard
// Utile per diagnosticare problemi di connessione
router.get("/api/public/bridge-status", async (req, res) => {
  try {
    const bridgeConnected = isBridgeConnected();
    const cardStatus = isCardReadyForSeals();
    const cachedStatus = getCachedBridgeStatus();
    const debugStatus = getBridgeDebugStatus();
    
    console.log(`[PUBLIC] Bridge status check: connected=${bridgeConnected}, cardReady=${cardStatus.ready}`);
    console.log(`[PUBLIC] Debug status:`, JSON.stringify(debugStatus, null, 2));
    
    res.json({
      bridgeConnected,
      cardReady: cardStatus.ready,
      cardError: cardStatus.error,
      cachedStatus: {
        readerConnected: cachedStatus?.readerConnected ?? false,
        cardInserted: cachedStatus?.cardInserted ?? false,
        readerName: cachedStatus?.readerName ?? null,
        cardSerial: cachedStatus?.cardSerial ?? null,
        cardCertificateCN: cachedStatus?.cardCertificateCN ?? null,
        cardBalance: cachedStatus?.cardBalance ?? null,
      },
      debug: debugStatus,
      timestamp: new Date().toISOString(),
      expectedWebSocketPath: "/ws/bridge",
      message: bridgeConnected 
        ? "Bridge connesso correttamente" 
        : "Bridge non connesso. L'app desktop deve connettersi a: wss://[domain]/ws/bridge"
    });
  } catch (error: any) {
    console.error("[PUBLIC] Bridge status error:", error);
    res.status(500).json({ 
      bridgeConnected: false,
      cardReady: false,
      error: error.message 
    });
  }
});

// ==================== TEST SIAE (TEMP) ====================
router.post("/api/public/test-siae-send", async (req, res) => {
  try {
    const { generateC1Xml, generateSiaeFileName } = await import('./siae-utils');
    const { sendSiaeTransmissionEmail } = await import('./email-service');
    const { randomUUID } = await import('crypto');
    const cards = await db.select().from(siaeActivationCards).where(eq(siaeActivationCards.status, 'active')).limit(1);
    if (!cards.length) return res.status(400).json({ error: 'No active card' });
    const card = cards[0];
    const systemCode = card.systemCode || 'P0004010';
    const [company] = await db.select().from(companies).where(eq(companies.id, card.companyId!));
    // FIX 40604: Allow testDate param to use unused dates; default to 18 Jan 2026 (unused)
    const testDateStr = req.body.testDate || '2026-01-18';
    const reportDate = new Date(testDateStr + 'T20:00:00');
    // FIX 40604: Use timestamp-based progressivo to avoid "already processed" error
    const progressivo = req.body.progressivo || Math.floor(Date.now() / 1000) % 1000;
    const reportType = req.body.reportType === 'mensile' ? 'mensile' : 'giornaliero';
    const fileName = generateSiaeFileName(reportType, reportDate, progressivo, null, systemCode);
    console.log(`[TEST] ${reportType.toUpperCase()}: file=${fileName}, systemCode=${systemCode}`);
    
    // Generate test event data for SIAE testing
    // FIX 2026-01-21: grossAmount required for ERROR 2006
    const testEvents = [{
      ticketedEvent: { id: 1, siaeLocationCode: '0000000000001', siaeGenreCode: '61' },
      eventRecord: { id: 1, name: 'Evento Test SIAE', startDatetime: reportDate, endDatetime: reportDate },
      location: { id: 1, name: 'Locale Test', siaeLocationCode: '0000000000001' },
      sectors: [{ id: 'A0', name: 'Platea', capacity: 100 }],
      tickets: [{
        id: 'T001', sectorId: 'A0', price: '10.00', grossAmount: '10.00', taxableAmount: '8.20',
        vatAmount: '1.80', ticketNumber: '00000001', emissionDate: reportDate,
        customerName: 'Test Cliente', customerFiscalCode: 'TSTCLN80A01H501X'
      }]
    }];
    
    // FIX 2026-01-21: Use HURAEX SRL (smart card registered name) instead of Event4U Demo
    const businessName = 'HURAEX SRL';
    // FIX 0604: Allow forceSubstitution param to override with Sostituzione="S"
    const forceSubstitution = req.body.forceSubstitution === true;
    const result = generateC1Xml({
      reportKind: reportType, companyId: card.companyId!, reportDate,
      resolvedSystemCode: systemCode, progressivo, taxId: '02120820432',
      businessName, events: testEvents, subscriptions: [],
      nomeFile: fileName, forceSubstitution
    });
    console.log(`[TEST] XML preview:\n${result.xml.substring(0, 800)}`);
    const transmissionType = reportType === 'mensile' ? 'monthly' : 'daily';
    const emailResult = await sendSiaeTransmissionEmail({
      to: 'servertest2@batest.siae.it', companyName: company?.name || 'Test',
      transmissionType, periodDate: reportDate, ticketsCount: 1, totalAmount: '10.00',
      xmlContent: result.xml, transmissionId: randomUUID(), systemCode, sequenceNumber: progressivo,
      signWithSmime: true, requireSignature: false, explicitFileName: fileName,
    });
    res.json({ success: emailResult.success, fileName, systemCode, smimeSigned: emailResult.smimeSigned, xml: result.xml });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Test SIAE con TUTTI i generi e abbonamenti
router.post("/api/public/test-siae-full", async (req, res) => {
  try {
    const { generateC1Xml, generateSiaeFileName } = await import('./siae-utils');
    const { sendSiaeTransmissionEmail } = await import('./email-service');
    const { randomUUID } = await import('crypto');
    const cards = await db.select().from(siaeActivationCards).where(eq(siaeActivationCards.status, 'active')).limit(1);
    if (!cards.length) return res.status(400).json({ error: 'No active card' });
    const card = cards[0];
    const systemCode = card.systemCode || 'P0004010';
    const [company] = await db.select().from(companies).where(eq(companies.id, card.companyId!));
    
    const testDateStr = req.body.testDate || new Date().toISOString().split('T')[0];
    const reportDate = new Date(testDateStr + 'T20:00:00');
    const progressivo = req.body.progressivo || Math.floor(Date.now() / 1000) % 1000;
    const reportType = req.body.reportType === 'mensile' ? 'mensile' : 'giornaliero';
    const forceSubstitution = req.body.forceSubstitution === true;
    const fileName = generateSiaeFileName(reportType, reportDate, progressivo, null, systemCode);
    
    // GENERI SIAE COMPLETI - UN EVENTO PER OGNI CATEGORIA PRINCIPALE
    // 1-4: Cinema (richiede Autore/Esecutore)
    // 5-14: Spettacoli vari (circo, sport, attrazioni)
    // 45-59: Teatro/Concerti/Musica (richiede Autore/Esecutore)
    // 60-69: Ballo/Discoteca (NON richiede Autore/Esecutore)
    const testEvents = [
      // === CINEMA (1-4) - Richiede Autore/Esecutore ===
      { ticketedEvent: { id: 1, siaeLocationCode: '0000000000001', siaeGenreCode: '1', siaeAuthor: 'Martin Scorsese', siaePerformer: 'Leonardo DiCaprio' },
        eventRecord: { id: 1, name: 'Film Prima Visione', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 1, name: 'Cinema Centrale', siaeLocationCode: '0000000000001' },
        sectors: [{ id: 'S1', name: 'Sala 1', capacity: 200 }],
        tickets: [
          { id: 'T001', sectorId: 'S1', price: '12.00', grossAmount: '12.00', taxableAmount: '9.84', vatAmount: '2.16', ticketNumber: '00000001', emissionDate: reportDate, customerName: 'Mario Rossi', customerFiscalCode: 'RSSMRA80A01H501X', tipoTitolo: 'I1' },
          { id: 'T002', sectorId: 'S1', price: '8.00', grossAmount: '8.00', taxableAmount: '6.56', vatAmount: '1.44', ticketNumber: '00000002', emissionDate: reportDate, customerName: 'Anna Verdi', customerFiscalCode: 'VRDNNA85B02F205Y', tipoTitolo: 'I2' },
        ]
      },
      { ticketedEvent: { id: 2, siaeLocationCode: '0000000000001', siaeGenreCode: '2', siaeAuthor: 'Christopher Nolan', siaePerformer: 'Cast Film' },
        eventRecord: { id: 2, name: 'Film Seconda Visione', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 1, name: 'Cinema Centrale', siaeLocationCode: '0000000000001' },
        sectors: [{ id: 'S2', name: 'Sala 2', capacity: 150 }],
        tickets: [
          { id: 'T003', sectorId: 'S2', price: '7.00', grossAmount: '7.00', taxableAmount: '5.74', vatAmount: '1.26', ticketNumber: '00000003', emissionDate: reportDate, customerName: 'Luigi Bianchi', customerFiscalCode: 'BNCLGU90C03L219Z', tipoTitolo: 'I1' },
        ]
      },
      
      // === SPETTACOLI VARI (5-14) ===
      { ticketedEvent: { id: 3, siaeLocationCode: '0000000000002', siaeGenreCode: '5' },
        eventRecord: { id: 3, name: 'Circo Nazionale', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 2, name: 'Tendone Circo', siaeLocationCode: '0000000000002' },
        sectors: [{ id: 'TR', name: 'Tribuna', capacity: 500 }, { id: 'PL', name: 'Platea', capacity: 200 }],
        tickets: [
          { id: 'T004', sectorId: 'TR', price: '25.00', grossAmount: '25.00', taxableAmount: '20.49', vatAmount: '4.51', ticketNumber: '00000004', emissionDate: reportDate, customerName: 'Paolo Neri', customerFiscalCode: 'NREPLA75D04A944W', tipoTitolo: 'I1' },
          { id: 'T005', sectorId: 'PL', price: '35.00', grossAmount: '35.00', taxableAmount: '28.69', vatAmount: '6.31', ticketNumber: '00000005', emissionDate: reportDate, customerName: 'Giulia Rosa', customerFiscalCode: 'RSOGLU88E05H501A', tipoTitolo: 'I1' },
        ]
      },
      { ticketedEvent: { id: 4, siaeLocationCode: '0000000000003', siaeGenreCode: '8' },
        eventRecord: { id: 4, name: 'Partita Calcio Serie A', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 3, name: 'Stadio Comunale', siaeLocationCode: '0000000000003' },
        sectors: [{ id: 'CU', name: 'Curva', capacity: 5000 }, { id: 'TR', name: 'Tribuna', capacity: 2000 }, { id: 'DH', name: 'Distinti', capacity: 1500 }],
        tickets: [
          { id: 'T006', sectorId: 'CU', price: '15.00', grossAmount: '15.00', taxableAmount: '12.30', vatAmount: '2.70', ticketNumber: '00000006', emissionDate: reportDate, customerName: 'Franco Blu', customerFiscalCode: 'BLUFNC60F06G273B', tipoTitolo: 'I1' },
          { id: 'T007', sectorId: 'TR', price: '45.00', grossAmount: '45.00', taxableAmount: '36.89', vatAmount: '8.11', ticketNumber: '00000007', emissionDate: reportDate, customerName: 'Marco Gialli', customerFiscalCode: 'GLLMRC82G07H501D', tipoTitolo: 'I1' },
          { id: 'T008', sectorId: 'DH', price: '30.00', grossAmount: '30.00', taxableAmount: '24.59', vatAmount: '5.41', ticketNumber: '00000008', emissionDate: reportDate, customerName: 'Sara Viola', customerFiscalCode: 'VLASRA92H08L219E', tipoTitolo: 'I2' },
        ]
      },
      
      // === TEATRO/CONCERTI/MUSICA (45-59) - Richiede Autore/Esecutore ===
      { ticketedEvent: { id: 5, siaeLocationCode: '0000000000004', siaeGenreCode: '45', siaeAuthor: 'William Shakespeare', siaePerformer: 'Compagnia Teatrale Nazionale' },
        eventRecord: { id: 5, name: 'Romeo e Giulietta', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 4, name: 'Teatro Comunale', siaeLocationCode: '0000000000004' },
        sectors: [{ id: 'PL', name: 'Platea', capacity: 300 }, { id: 'GA', name: 'Galleria', capacity: 150 }],
        tickets: [
          { id: 'T009', sectorId: 'PL', price: '40.00', grossAmount: '40.00', taxableAmount: '32.79', vatAmount: '7.21', ticketNumber: '00000009', emissionDate: reportDate, customerName: 'Elena Arancio', customerFiscalCode: 'RNCELN78I09A944F', tipoTitolo: 'I1' },
          { id: 'T010', sectorId: 'GA', price: '25.00', grossAmount: '25.00', taxableAmount: '20.49', vatAmount: '4.51', ticketNumber: '00000010', emissionDate: reportDate, customerName: 'Roberto Verde', customerFiscalCode: 'VRDRRT65L10H501G', tipoTitolo: 'I1' },
        ]
      },
      { ticketedEvent: { id: 6, siaeLocationCode: '0000000000005', siaeGenreCode: '50', siaeAuthor: 'Vasco Rossi', siaePerformer: 'Vasco Rossi' },
        eventRecord: { id: 6, name: 'Concerto Rock', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 5, name: 'Palazzetto Sport', siaeLocationCode: '0000000000005' },
        sectors: [{ id: 'PT', name: 'Parterre', capacity: 3000 }, { id: 'AN', name: 'Anello', capacity: 5000 }],
        tickets: [
          { id: 'T011', sectorId: 'PT', price: '60.00', grossAmount: '60.00', taxableAmount: '49.18', vatAmount: '10.82', ticketNumber: '00000011', emissionDate: reportDate, customerName: 'Chiara Marrone', customerFiscalCode: 'MRRCHR70M11F205H', tipoTitolo: 'I1' },
          { id: 'T012', sectorId: 'AN', price: '45.00', grossAmount: '45.00', taxableAmount: '36.89', vatAmount: '8.11', ticketNumber: '00000012', emissionDate: reportDate, customerName: 'Davide Grigio', customerFiscalCode: 'GRGDVD85N12L219I', tipoTitolo: 'I1' },
          { id: 'T013', sectorId: 'PT', price: '60.00', grossAmount: '60.00', taxableAmount: '49.18', vatAmount: '10.82', ticketNumber: '00000013', emissionDate: reportDate, customerName: 'Silvia Celeste', customerFiscalCode: 'CLSSLV75O13H501J', tipoTitolo: 'I2' },
        ]
      },
      { ticketedEvent: { id: 7, siaeLocationCode: '0000000000006', siaeGenreCode: '55', siaeAuthor: 'Orchestra Sinfonica', siaePerformer: 'Direttore Maestro' },
        eventRecord: { id: 7, name: 'Concerto Classico', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 6, name: 'Auditorium', siaeLocationCode: '0000000000006' },
        sectors: [{ id: 'OR', name: 'Orchestra', capacity: 200 }],
        tickets: [
          { id: 'T014', sectorId: 'OR', price: '50.00', grossAmount: '50.00', taxableAmount: '40.98', vatAmount: '9.02', ticketNumber: '00000014', emissionDate: reportDate, customerName: 'Massimo Turchese', customerFiscalCode: 'TRCMSM68P14A944K', tipoTitolo: 'I1' },
        ]
      },
      
      // === BALLO/DISCOTECA (60-69) - NON richiede Autore/Esecutore ===
      { ticketedEvent: { id: 8, siaeLocationCode: '0000000000007', siaeGenreCode: '61' },
        eventRecord: { id: 8, name: 'Serata Discoteca', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 7, name: 'Club Notturno', siaeLocationCode: '0000000000007' },
        sectors: [{ id: 'GE', name: 'Generale', capacity: 800 }, { id: 'VIP', name: 'VIP Area', capacity: 100 }],
        tickets: [
          { id: 'T015', sectorId: 'GE', price: '20.00', grossAmount: '20.00', taxableAmount: '16.39', vatAmount: '3.61', ticketNumber: '00000015', emissionDate: reportDate, customerName: 'Luca Indaco', customerFiscalCode: 'NDCLCU90Q15F205L', tipoTitolo: 'I1' },
          { id: 'T016', sectorId: 'VIP', price: '50.00', grossAmount: '50.00', taxableAmount: '40.98', vatAmount: '9.02', ticketNumber: '00000016', emissionDate: reportDate, customerName: 'Valentina Cremisi', customerFiscalCode: 'CRMVLN88R16L219M', tipoTitolo: 'I1' },
          { id: 'T017', sectorId: 'GE', price: '15.00', grossAmount: '15.00', taxableAmount: '12.30', vatAmount: '2.70', ticketNumber: '00000017', emissionDate: reportDate, customerName: 'Federica Ocra', customerFiscalCode: 'CRFFDR92S17H501N', tipoTitolo: 'I3' },
        ]
      },
      { ticketedEvent: { id: 9, siaeLocationCode: '0000000000008', siaeGenreCode: '65' },
        eventRecord: { id: 9, name: 'Serata Ballo Liscio', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 8, name: 'Balera Romagna', siaeLocationCode: '0000000000008' },
        sectors: [{ id: 'PS', name: 'Pista', capacity: 400 }],
        tickets: [
          { id: 'T018', sectorId: 'PS', price: '10.00', grossAmount: '10.00', taxableAmount: '8.20', vatAmount: '1.80', ticketNumber: '00000018', emissionDate: reportDate, customerName: 'Giovanni Ambra', customerFiscalCode: 'MBRGVN55T18A944O', tipoTitolo: 'I1' },
          { id: 'T019', sectorId: 'PS', price: '10.00', grossAmount: '10.00', taxableAmount: '8.20', vatAmount: '1.80', ticketNumber: '00000019', emissionDate: reportDate, customerName: 'Maria Corallo', customerFiscalCode: 'CRLMRA60U19F205P', tipoTitolo: 'I1' },
        ]
      },
      { ticketedEvent: { id: 10, siaeLocationCode: '0000000000009', siaeGenreCode: '68' },
        eventRecord: { id: 10, name: 'Festa Latina', startDatetime: reportDate, endDatetime: reportDate },
        location: { id: 9, name: 'Locale Latino', siaeLocationCode: '0000000000009' },
        sectors: [{ id: 'SA', name: 'Sala', capacity: 250 }],
        tickets: [
          { id: 'T020', sectorId: 'SA', price: '18.00', grossAmount: '18.00', taxableAmount: '14.75', vatAmount: '3.25', ticketNumber: '00000020', emissionDate: reportDate, customerName: 'Carmen Smeraldo', customerFiscalCode: 'SMRCMN78V20L219Q', tipoTitolo: 'I1' },
        ]
      },
    ];
    
    // ABBONAMENTI di test - diversi tipi
    const testSubscriptions = [
      { id: 'SUB001', subscriptionNumber: '0000001', customerName: 'Abbonato Annuale Cinema', customerFiscalCode: 'PRMABB70G07H501C',
        price: '120.00', grossAmount: '120.00', taxableAmount: '98.36', vatAmount: '21.64',
        validFrom: reportDate, validTo: new Date(reportDate.getTime() + 365*24*60*60*1000), eventsIncluded: 24, sectorId: 'S1', emissionDate: reportDate },
      { id: 'SUB002', subscriptionNumber: '0000002', customerName: 'Abbonato Stagione Teatro', customerFiscalCode: 'BSEABB75H08L219D',
        price: '200.00', grossAmount: '200.00', taxableAmount: '163.93', vatAmount: '36.07',
        validFrom: reportDate, validTo: new Date(reportDate.getTime() + 180*24*60*60*1000), eventsIncluded: 10, sectorId: 'PL', emissionDate: reportDate },
      { id: 'SUB003', subscriptionNumber: '0000003', customerName: 'Abbonato Stadio', customerFiscalCode: 'STDABB80I09A944E',
        price: '350.00', grossAmount: '350.00', taxableAmount: '286.89', vatAmount: '63.11',
        validFrom: reportDate, validTo: new Date(reportDate.getTime() + 365*24*60*60*1000), eventsIncluded: 19, sectorId: 'TR', emissionDate: reportDate },
      { id: 'SUB004', subscriptionNumber: '0000004', customerName: 'Tessera Discoteca VIP', customerFiscalCode: 'VIPABB85J10F205F',
        price: '500.00', grossAmount: '500.00', taxableAmount: '409.84', vatAmount: '90.16',
        validFrom: reportDate, validTo: new Date(reportDate.getTime() + 365*24*60*60*1000), eventsIncluded: 52, sectorId: 'VIP', emissionDate: reportDate },
    ];
    
    console.log(`[TEST-FULL] Generando ${reportType} con ${testEvents.length} eventi e ${testSubscriptions.length} abbonamenti`);
    
    const result = generateC1Xml({
      reportKind: reportType, companyId: card.companyId!, reportDate,
      resolvedSystemCode: systemCode, progressivo, taxId: '02120820432',
      businessName: 'HURAEX SRL', events: testEvents, subscriptions: testSubscriptions,
      nomeFile: fileName, forceSubstitution
    });
    
    console.log(`[TEST-FULL] XML generato (${result.xml.length} bytes)`);
    
    // Invia solo se richiesto
    if (req.body.send === true) {
      const emailResult = await sendSiaeTransmissionEmail({
        to: 'servertest2@batest.siae.it', companyName: company?.name || 'Test',
        transmissionType: reportType === 'mensile' ? 'monthly' : 'daily',
        periodDate: reportDate, ticketsCount: testEvents.reduce((acc, e) => acc + e.tickets.length, 0),
        totalAmount: testEvents.reduce((acc, e) => acc + e.tickets.reduce((a, t) => a + parseFloat(t.price), 0), 0).toFixed(2),
        xmlContent: result.xml, transmissionId: randomUUID(), systemCode, sequenceNumber: progressivo,
        signWithSmime: true, requireSignature: false, explicitFileName: fileName,
      });
      res.json({ success: emailResult.success, sent: true, fileName, systemCode, smimeSigned: emailResult.smimeSigned, 
        eventsCount: testEvents.length, subscriptionsCount: testSubscriptions.length, xml: result.xml });
    } else {
      // Solo preview XML senza invio
      res.json({ success: true, sent: false, fileName, systemCode, 
        eventsCount: testEvents.length, subscriptionsCount: testSubscriptions.length, xml: result.xml });
    }
  } catch (error: any) { 
    console.error('[TEST-FULL] Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack }); 
  }
});

// Crea eventi REALI nel database per TUTTI i generi SIAE (99 generi, date diverse, con biglietti+abbonamenti)
router.post("/api/public/test-siae-create-events", async (req, res) => {
  try {
    const { randomUUID } = await import('crypto');
    const cards = await db.select().from(siaeActivationCards).where(eq(siaeActivationCards.status, 'active')).limit(1);
    if (!cards.length) return res.status(400).json({ error: 'No active card' });
    const card = cards[0];
    const companyId = card.companyId!;
    
    // Trova o crea una location
    let [location] = await db.select().from(locations).where(eq(locations.companyId, companyId)).limit(1);
    if (!location) {
      [location] = await db.insert(locations).values({
        companyId, name: 'Locale Test SIAE', address: 'Via Test 1', city: 'Roma', province: 'RM', postalCode: '00100', country: 'IT',
        siaeLocationCode: '0000000000001'
      }).returning();
    }
    
    // Recupera TUTTI i generi SIAE dal database
    const allGenres = await db.select().from(siaeEventGenres).orderBy(siaeEventGenres.code);
    if (!allGenres.length) return res.status(400).json({ error: 'No SIAE genres found in database' });
    
    console.log(`[CREATE-EVENTS] Trovati ${allGenres.length} generi SIAE nel database`);
    
    // Data base: ogni evento avrà una data diversa (distribuiti su più giorni)
    // L'utente può specificare la data base, altrimenti usiamo oggi
    const baseDateStr = req.body.testDate || new Date().toISOString().split('T')[0];
    const baseDate = new Date(baseDateStr + 'T20:00:00');
    const timestamp = Date.now();
    
    // Prezzi variabili per genere
    const getPriceForGenre = (code: string): number => {
      const c = parseInt(code);
      if (c <= 4) return 10 + c * 2; // Cinema: 12-18€
      if (c <= 30) return 15 + c; // Sport: 20-45€
      if (c <= 40) return 20 + c; // Giochi: 50-60€
      if (c <= 59) return 25 + c; // Teatro/Concerti: 65-84€
      if (c <= 69) return 15 + c * 0.5; // Ballo: 45-50€
      if (c <= 89) return 20 + c * 0.3; // Parchi/Attrazioni: 44-47€
      return 30 + c * 0.2; // Altri: 48-50€
    };
    
    // Autori/Esecutori per generi che li richiedono
    const getAuthorPerformer = (code: string, name: string) => {
      const c = parseInt(code);
      if (c <= 4) return { author: 'Regista ' + name, performer: 'Cast ' + name };
      if (c >= 45 && c <= 59) return { author: 'Compositore ' + name, performer: 'Artista ' + name };
      if (c >= 60 && c <= 69) return { author: null, performer: null }; // Ballo non richiede
      return { author: null, performer: null };
    };
    
    const createdEvents: any[] = [];
    const createdTickets: any[] = [];
    const createdSubscriptions: any[] = [];
    let ticketCounter = 1;
    let subCounter = 1;
    const vatRate = 22;
    let dayOffset = 0;
    
    for (const genre of allGenres) {
      // Data unica per ogni evento (ogni 3 generi = nuovo giorno)
      const eventDate = new Date(baseDate.getTime() + Math.floor(dayOffset / 3) * 24 * 60 * 60 * 1000);
      const endDate = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);
      const eventDateStr = eventDate.toISOString().split('T')[0];
      dayOffset++;
      
      const price = getPriceForGenre(genre.code);
      const { author, performer } = getAuthorPerformer(genre.code, genre.name);
      
      // 1. Crea evento base
      const eventId = randomUUID();
      await db.insert(events).values({
        id: eventId, companyId, locationId: location.id, 
        name: `${genre.name} - Evento ${genre.code}`,
        startDatetime: eventDate, endDatetime: endDate, status: 'completed', isPublic: false,
      });
      
      // 2. Crea evento ticketed
      // Determina se è genere intrattenimento (60-69)
      const genreNum = parseInt(genre.code);
      const isIntrattenimento = genreNum >= 60 && genreNum <= 69;
      
      // Il codice locale SIAE deve essere esattamente 13 cifre
      const siaeLocationCode = (location.siaeLocationCode || '0000000000001').padStart(13, '0').substring(0, 13);
      
      const [insertedTicketedEvent] = await db.insert(siaeTicketedEvents).values({
        eventId, companyId,
        siaeLocationCode: siaeLocationCode,
        genreCode: genre.code,
        author, performer,
        taxType: isIntrattenimento ? 'I' : 'S',
        entertainmentIncidence: isIntrattenimento ? 100 : null, // 100% per discoteche/ballo
        totalCapacity: 500,
        requiresNominative: true,
        ticketingStatus: 'closed',
        approvalStatus: 'approved',
      }).returning();
      const ticketedEventId = insertedTicketedEvent.id;
      
      // 3. Crea settore
      const [insertedSector] = await db.insert(siaeEventSectors).values({
        ticketedEventId,
        sectorCode: 'A0', name: 'Ingresso Generale',
        capacity: 500, availableSeats: 495,
        priceIntero: price.toFixed(2),
        priceRidotto: (price * 0.7).toFixed(2),
        ivaRate: vatRate.toString(),
      }).returning();
      const sectorId = insertedSector.id;
      
      // 4. Crea 3 BIGLIETTI per evento (intero, ridotto, omaggio)
      const ticketTypes = [
        { code: 'I1', name: 'Intero', priceMult: 1, firstName: 'Mario', lastName: 'Rossi' },
        { code: 'R1', name: 'Ridotto', priceMult: 0.7, firstName: 'Anna', lastName: 'Bianchi' },
        { code: 'O1', name: 'Omaggio', priceMult: 0, firstName: 'Luigi', lastName: 'Verdi' },
      ];
      for (const tt of ticketTypes) {
        const ticketId = randomUUID();
        const ticketPrice = price * tt.priceMult;
        const ticketNet = ticketPrice / (1 + vatRate / 100);
        const ticketVat = ticketPrice - ticketNet;
        
        await db.insert(siaeTickets).values({
          id: ticketId, ticketedEventId, sectorId,
          progressiveNumber: ticketCounter++,
          ticketTypeCode: tt.code,
          sectorCode: 'A0',
          grossAmount: ticketPrice.toFixed(2),
          netAmount: ticketNet.toFixed(2),
          vatAmount: ticketVat.toFixed(2),
          emissionDate: eventDate,
          emissionDateStr: eventDateStr.replace(/-/g, ''),
          emissionTimeStr: '2000',
          participantFirstName: tt.firstName,
          participantLastName: tt.lastName,
          status: 'valid',
        });
        createdTickets.push({ ticketId, genre: genre.code, type: tt.code });
      }
      
      // 5. Crea 2 ABBONAMENTI per evento (annuale e stagionale)
      const subTypes = [
        { name: 'Abbonamento Annuale', events: 24, priceMult: 10, firstName: 'Cliente', lastName: 'Annuale' },
        { name: 'Tessera Stagionale', events: 12, priceMult: 6, firstName: 'Cliente', lastName: 'Stagionale' },
      ];
      for (const st of subTypes) {
        const testPhone = `+39330${genre.code.padStart(3,'0')}${subCounter}`;
        const { identity } = await findOrCreateIdentity({
          phone: testPhone,
          firstName: st.firstName,
          lastName: `${st.lastName} G${genre.code}`,
        });
        
        const existingCustomer = await findCustomerByIdentity(identity.id);
        let customerId: string;
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const [insertedCustomer] = await db.insert(siaeCustomers).values({
            uniqueCode: `CUST-${timestamp}-${genre.code}-${subCounter}`,
            email: `sub${genre.code}${subCounter}@test.it`,
            phone: testPhone,
            firstName: st.firstName,
            lastName: `${st.lastName} G${genre.code}`,
            identityId: identity.id,
          }).returning();
          customerId = insertedCustomer.id;
        }
        
        const subPrice = price * st.priceMult;
        const subNum = String(subCounter).padStart(7, '0');
        await db.insert(siaeSubscriptions).values({
          companyId, customerId, ticketedEventId, sectorId,
          subscriptionCode: `SUB-${timestamp}-${subNum}`,
          progressiveNumber: subCounter++,
          eventsCount: st.events,
          totalAmount: subPrice.toFixed(2),
          validFrom: eventDate,
          validTo: new Date(eventDate.getTime() + 365 * 24 * 60 * 60 * 1000),
          emissionDate: eventDate,
          status: 'active',
          holderFirstName: st.firstName,
          holderLastName: `${st.lastName} G${genre.code}`,
        });
        createdSubscriptions.push({ genre: genre.code, type: st.name });
      }
      
      createdEvents.push({ 
        eventId, ticketedEventId, 
        genre: genre.code, 
        name: genre.name,
        date: eventDateStr,
        tickets: 3,
        subscriptions: 2,
      });
    }
    
    console.log(`[CREATE-EVENTS] Creati ${createdEvents.length} eventi (tutti i generi SIAE), ${createdTickets.length} biglietti, ${createdSubscriptions.length} abbonamenti`);
    
    res.json({
      success: true,
      eventsCreated: createdEvents.length,
      ticketsCreated: createdTickets.length,
      subscriptionsCreated: createdSubscriptions.length,
      genres: allGenres.length,
      events: createdEvents,
      summary: `${createdEvents.length} eventi (1 per genere SIAE), ${createdTickets.length} biglietti (3 per evento), ${createdSubscriptions.length} abbonamenti (2 per evento)`,
    });
  } catch (error: any) {
    console.error('[CREATE-EVENTS] Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// VECCHIO ENDPOINT - Crea eventi solo per generi selezionati
router.post("/api/public/test-siae-create-events-legacy", async (req, res) => {
  try {
    const { randomUUID } = await import('crypto');
    const cards = await db.select().from(siaeActivationCards).where(eq(siaeActivationCards.status, 'active')).limit(1);
    if (!cards.length) return res.status(400).json({ error: 'No active card' });
    const card = cards[0];
    const companyId = card.companyId!;
    
    // Trova o crea una location
    let [location] = await db.select().from(locations).where(eq(locations.companyId, companyId)).limit(1);
    if (!location) {
      [location] = await db.insert(locations).values({
        companyId, name: 'Locale Test SIAE', address: 'Via Test 1', city: 'Roma', province: 'RM', postalCode: '00100', country: 'IT',
        siaeLocationCode: '0000000000001'
      }).returning();
    }
    
    const testDateStr = req.body.testDate || new Date().toISOString().split('T')[0];
    const reportDate = new Date(testDateStr + 'T20:00:00');
    const endDate = new Date(reportDate.getTime() + 4 * 60 * 60 * 1000);
    const timestamp = Date.now();
    
    // Definizione eventi - UN EVENTO PER OGNI GENERE SIAE
    const genreDefinitions = [
      { genre: '1', name: 'Cinema Prima Visione', author: 'Martin Scorsese', performer: 'Leonardo DiCaprio', price: 12.00, taxType: 'S' },
      { genre: '2', name: 'Cinema Seconda Visione', author: 'Christopher Nolan', performer: 'Cast Film', price: 8.00, taxType: 'S' },
      { genre: '3', name: 'Cinema Terza Visione', author: 'Steven Spielberg', performer: 'Attori Vari', price: 5.00, taxType: 'S' },
      { genre: '5', name: 'Circo Nazionale', author: null, performer: null, price: 25.00, taxType: 'S' },
      { genre: '6', name: 'Luna Park Attrazioni', author: null, performer: null, price: 15.00, taxType: 'I' },
      { genre: '8', name: 'Partita Calcio Serie A', author: null, performer: null, price: 35.00, taxType: 'S' },
      { genre: '10', name: 'Tennis ATP Finals', author: null, performer: null, price: 45.00, taxType: 'S' },
      { genre: '45', name: 'Teatro - Romeo e Giulietta', author: 'William Shakespeare', performer: 'Compagnia Nazionale', price: 40.00, taxType: 'S' },
      { genre: '46', name: 'Teatro Dialettale', author: 'Eduardo De Filippo', performer: 'Compagnia Locale', price: 25.00, taxType: 'S' },
      { genre: '50', name: 'Concerto Rock - Vasco Rossi', author: 'Vasco Rossi', performer: 'Vasco Rossi', price: 60.00, taxType: 'S' },
      { genre: '51', name: 'Concerto Pop', author: 'Artista Pop', performer: 'Artista Pop Band', price: 50.00, taxType: 'S' },
      { genre: '55', name: 'Concerto Classico Sinfonica', author: 'Orchestra Sinfonica', performer: 'Direttore Maestro', price: 55.00, taxType: 'S' },
      { genre: '61', name: 'Serata Discoteca', author: null, performer: null, price: 20.00, taxType: 'I' },
      { genre: '62', name: 'Discoteca con Musica dal Vivo', author: null, performer: null, price: 25.00, taxType: 'I' },
      { genre: '65', name: 'Ballo Liscio Romagna', author: null, performer: null, price: 10.00, taxType: 'I' },
      { genre: '68', name: 'Festa Latina Salsa', author: null, performer: null, price: 18.00, taxType: 'I' },
    ];
    
    const createdEvents: any[] = [];
    const createdTickets: any[] = [];
    const createdCancelledTickets: any[] = [];
    const createdSubscriptions: any[] = [];
    const createdCancelledSubscriptions: any[] = [];
    let ticketCounter = 1;
    let subCounter = 1;
    const vatRate = 22;
    
    for (const gd of genreDefinitions) {
      // 1. Crea evento base (MAI INVIATO)
      const eventId = randomUUID();
      await db.insert(events).values({
        id: eventId, companyId, locationId: location.id, name: `${gd.name} - Test SIAE`,
        startDatetime: reportDate, endDatetime: endDate, status: 'completed', isPublic: false,
      });
      
      // 2. Crea evento ticketed (MAI INVIATO - senza transmissionStatus)
      const [insertedTicketedEvent2] = await db.insert(siaeTicketedEvents).values({
        eventId, companyId,
        siaeLocationCode: location.siaeLocationCode || '0000000000001',
        genreCode: gd.genre,
        author: gd.author,
        performer: gd.performer,
        taxType: gd.taxType,
        totalCapacity: 500,
        requiresNominative: true,
        ticketingStatus: 'closed',
        approvalStatus: 'approved',
      }).returning();
      const ticketedEventId = insertedTicketedEvent2.id;
      
      // 3. Crea settore
      const netPrice = gd.price / (1 + vatRate / 100);
      const [insertedSector2] = await db.insert(siaeEventSectors).values({
        ticketedEventId,
        sectorCode: 'A0', name: 'Ingresso Generale',
        capacity: 500, availableSeats: 495,
        priceIntero: gd.price.toFixed(2),
        priceRidotto: (gd.price * 0.7).toFixed(2),
        ivaRate: vatRate.toString(),
      }).returning();
      const sectorId = insertedSector2.id;
      
      // 4. Crea BIGLIETTI VALIDI (2 per evento: intero + ridotto)
      for (let i = 0; i < 2; i++) {
        const ticketId = randomUUID();
        const isRidotto = i === 1;
        const ticketPrice = isRidotto ? gd.price * 0.7 : gd.price;
        const ticketNet = ticketPrice / (1 + vatRate / 100);
        const ticketVat = ticketPrice - ticketNet;
        
        await db.insert(siaeTickets).values({
          id: ticketId, ticketedEventId, sectorId,
          progressiveNumber: ticketCounter++,
          ticketTypeCode: isRidotto ? 'R1' : 'I1',
          sectorCode: 'A0',
          grossAmount: ticketPrice.toFixed(2),
          netAmount: ticketNet.toFixed(2),
          vatAmount: ticketVat.toFixed(2),
          emissionDate: reportDate,
          emissionDateStr: testDateStr.replace(/-/g, ''),
          emissionTimeStr: '2000',
          participantFirstName: isRidotto ? 'Mario' : 'Anna',
          participantLastName: isRidotto ? 'Rossi' : 'Bianchi',
          status: 'valid',
        });
        createdTickets.push({ ticketId, genre: gd.genre, price: ticketPrice, status: 'valid' });
      }
      
      // 5. Crea BIGLIETTO ANNULLATO (1 per evento)
      const cancelledTicketId = randomUUID();
      const cancelledPrice = gd.price;
      const cancelledNet = cancelledPrice / (1 + vatRate / 100);
      const cancelledVat = cancelledPrice - cancelledNet;
      await db.insert(siaeTickets).values({
        id: cancelledTicketId, ticketedEventId, sectorId,
        progressiveNumber: ticketCounter++,
        ticketTypeCode: 'I1',
        sectorCode: 'A0',
        grossAmount: cancelledPrice.toFixed(2),
        netAmount: cancelledNet.toFixed(2),
        vatAmount: cancelledVat.toFixed(2),
        emissionDate: reportDate,
        emissionDateStr: testDateStr.replace(/-/g, ''),
        emissionTimeStr: '2000',
        participantFirstName: 'Paolo',
        participantLastName: 'Annullato',
        status: 'cancelled',
        cancellationReasonCode: '001',
        cancellationDate: reportDate,
      });
      createdCancelledTickets.push({ ticketId: cancelledTicketId, genre: gd.genre, status: 'cancelled' });
      
      // 6. Crea ABBONAMENTO VALIDO per questo evento
      const validSubPhone = `+393300000${gd.genre.padStart(3, '0')}`;
      const { identity: validIdentity } = await findOrCreateIdentity({
        phone: validSubPhone,
        firstName: 'Cliente',
        lastName: `Genere${gd.genre}`,
      });
      
      const existingValidCustomer = await findCustomerByIdentity(validIdentity.id);
      let customerId: string;
      
      if (existingValidCustomer) {
        customerId = existingValidCustomer.id;
      } else {
        const [insertedValidCustomer] = await db.insert(siaeCustomers).values({
          uniqueCode: `TEST-${timestamp}-${gd.genre}-VALID`,
          email: `testsub${gd.genre}valid@test.it`,
          phone: validSubPhone,
          firstName: 'Cliente',
          lastName: `Genere${gd.genre}`,
          identityId: validIdentity.id,
        }).returning();
        customerId = insertedValidCustomer.id;
      }
      
      const subNum = String(subCounter).padStart(7, '0');
      await db.insert(siaeSubscriptions).values({
        companyId, customerId, ticketedEventId, sectorId,
        subscriptionCode: `SUB-${timestamp}-${subNum}`,
        progressiveNumber: subCounter++,
        eventsCount: 10,
        totalAmount: (gd.price * 5).toFixed(2),
        validFrom: reportDate,
        validTo: new Date(reportDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        emissionDate: reportDate,
        status: 'active',
        holderFirstName: 'Cliente',
        holderLastName: `Genere${gd.genre}`,
      });
      createdSubscriptions.push({ genre: gd.genre, status: 'active' });
      
      // 7. Crea ABBONAMENTO ANNULLATO per questo evento
      const cancelledSubPhone = `+393311111${gd.genre.padStart(3, '0')}`;
      const { identity: cancelledIdentity } = await findOrCreateIdentity({
        phone: cancelledSubPhone,
        firstName: 'Annullato',
        lastName: `Genere${gd.genre}`,
      });
      
      const existingCancelledCustomer = await findCustomerByIdentity(cancelledIdentity.id);
      let cancelledCustomerId: string;
      
      if (existingCancelledCustomer) {
        cancelledCustomerId = existingCancelledCustomer.id;
      } else {
        const [insertedCancelledCustomer] = await db.insert(siaeCustomers).values({
          uniqueCode: `TEST-${timestamp}-${gd.genre}-CANCELLED`,
          email: `testsub${gd.genre}cancelled@test.it`,
          phone: cancelledSubPhone,
          firstName: 'Annullato',
          lastName: `Genere${gd.genre}`,
          identityId: cancelledIdentity.id,
        }).returning();
        cancelledCustomerId = insertedCancelledCustomer.id;
      }
      
      const cancelledSubNum = String(subCounter).padStart(7, '0');
      await db.insert(siaeSubscriptions).values({
        companyId, customerId: cancelledCustomerId, ticketedEventId, sectorId,
        subscriptionCode: `SUB-${timestamp}-${cancelledSubNum}`,
        progressiveNumber: subCounter++,
        eventsCount: 10,
        totalAmount: (gd.price * 5).toFixed(2),
        validFrom: reportDate,
        validTo: new Date(reportDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        emissionDate: reportDate,
        status: 'cancelled',
        cancellationReasonCode: '002',
        cancellationDate: reportDate,
        holderFirstName: 'Annullato',
        holderLastName: `Genere${gd.genre}`,
      });
      createdCancelledSubscriptions.push({ genre: gd.genre, status: 'cancelled' });
      
      createdEvents.push({ eventId, ticketedEventId, genre: gd.genre, name: gd.name });
    }
    
    console.log(`[CREATE-EVENTS] Creati ${createdEvents.length} eventi (mai inviati), ${createdTickets.length} biglietti validi, ${createdCancelledTickets.length} biglietti annullati, ${createdSubscriptions.length} abbonamenti validi, ${createdCancelledSubscriptions.length} abbonamenti annullati`);
    
    res.json({
      success: true,
      eventsCreated: createdEvents.length,
      ticketsCreated: createdTickets.length,
      cancelledTicketsCreated: createdCancelledTickets.length,
      subscriptionsCreated: createdSubscriptions.length,
      cancelledSubscriptionsCreated: createdCancelledSubscriptions.length,
      events: createdEvents,
      testDate: testDateStr,
      summary: `${createdEvents.length} eventi (1 per genere), ${createdTickets.length + createdCancelledTickets.length} biglietti (${createdTickets.length} validi + ${createdCancelledTickets.length} annullati), ${createdSubscriptions.length + createdCancelledSubscriptions.length} abbonamenti (${createdSubscriptions.length} validi + ${createdCancelledSubscriptions.length} annullati)`,
    });
  } catch (error: any) {
    console.error('[CREATE-EVENTS] Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Invia UN REPORT PER OGNI EVENTO creato (16 eventi = 16 report separati)
router.post("/api/public/test-siae-send-all-events", async (req, res) => {
  try {
    const { generateC1Xml, generateSiaeFileName } = await import('./siae-utils');
    const { sendSiaeTransmissionEmail } = await import('./email-service');
    const { randomUUID } = await import('crypto');
    
    const cards = await db.select().from(siaeActivationCards).where(eq(siaeActivationCards.status, 'active')).limit(1);
    if (!cards.length) return res.status(400).json({ error: 'No active card' });
    const card = cards[0];
    const companyId = card.companyId!;
    const systemCode = card.systemCode || 'P0004010';
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    
    // Se filterDate è specificato, filtra solo quella data; altrimenti invia TUTTI gli eventi
    const filterDateStr = req.body.testDate;
    const sendAll = req.body.sendAll === true;
    
    // Recupera tutti gli eventi ticketed
    const ticketedEvents = await db.select()
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(eq(siaeTicketedEvents.companyId, companyId));
    
    console.log(`[SEND-ALL] Trovati ${ticketedEvents.length} eventi ticketed totali`);
    
    const results: any[] = [];
    let progressivo = Math.floor(Date.now() / 1000) % 1000;
    
    for (const row of ticketedEvents) {
      const te = row.siae_ticketed_events;
      const ev = row.events;
      const loc = row.locations;
      
      // Filtra per data evento solo se richiesto
      const eventDate = new Date(ev.startDatetime!);
      const eventDateStr = eventDate.toISOString().split('T')[0];
      if (!sendAll && filterDateStr && eventDateStr !== filterDateStr) continue;
      
      // Recupera biglietti per questo evento
      const tickets = await db.select().from(siaeTickets).where(eq(siaeTickets.ticketedEventId, te.id));
      const validTickets = tickets.filter(t => t.status === 'valid');
      const cancelledTickets = tickets.filter(t => t.status === 'cancelled');
      
      // Recupera abbonamenti per questo evento
      const subs = await db.select().from(siaeSubscriptions).where(eq(siaeSubscriptions.ticketedEventId, te.id));
      const validSubs = subs.filter(s => s.status === 'active');
      const cancelledSubs = subs.filter(s => s.status === 'cancelled');
      
      // Recupera settori
      const sectors = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.ticketedEventId, te.id));
      
      // Costruisci struttura evento per XML
      const eventData = {
        ticketedEvent: {
          id: te.id,
          siaeLocationCode: loc.siaeLocationCode || '0000000000001',
          siaeGenreCode: te.genreCode || '61',
          siaeAuthor: te.author,
          siaePerformer: te.performer,
        },
        eventRecord: {
          id: ev.id,
          name: ev.name,
          startDatetime: ev.startDatetime,
          endDatetime: ev.endDatetime,
        },
        location: {
          id: loc.id,
          name: loc.name,
          siaeLocationCode: loc.siaeLocationCode || '0000000000001',
        },
        sectors: sectors.map(s => ({ id: s.id, name: s.name, capacity: s.capacity })),
        tickets: validTickets.map((t, idx) => ({
          id: t.id,
          sectorId: t.sectorId,
          price: t.grossAmount,
          grossAmount: t.grossAmount,
          taxableAmount: t.netAmount,
          vatAmount: t.vatAmount,
          ticketNumber: String(t.progressiveNumber).padStart(8, '0'),
          emissionDate: t.emissionDate,
          customerName: `${t.participantFirstName} ${t.participantLastName}`,
          customerFiscalCode: 'TSTCLN80A01H501X',
          tipoTitolo: t.ticketTypeCode || 'I1',
        })),
        cancelledTickets: cancelledTickets.map(t => ({
          id: t.id,
          sectorId: t.sectorId,
          ticketNumber: String(t.progressiveNumber).padStart(8, '0'),
          grossAmount: t.grossAmount,
          cancellationReasonCode: t.cancellationReasonCode || '001',
          cancellationDate: t.cancellationDate,
        })),
      };
      
      // Abbonamenti per XML
      const subscriptionData = validSubs.map((s, idx) => ({
        id: s.id,
        subscriptionNumber: String(s.progressiveNumber).padStart(7, '0'),
        customerName: `${s.holderFirstName} ${s.holderLastName}`,
        customerFiscalCode: 'ABBCLN80A01H501X',
        price: s.totalAmount,
        grossAmount: s.totalAmount,
        taxableAmount: (parseFloat(s.totalAmount || '0') / 1.22).toFixed(2),
        vatAmount: (parseFloat(s.totalAmount || '0') - parseFloat(s.totalAmount || '0') / 1.22).toFixed(2),
        validFrom: s.validFrom,
        validTo: s.validTo,
        eventsIncluded: s.eventsCount,
        sectorId: s.sectorId,
        emissionDate: s.emissionDate,
      }));
      
      const cancelledSubData = cancelledSubs.map(s => ({
        id: s.id,
        subscriptionNumber: String(s.progressiveNumber).padStart(7, '0'),
        grossAmount: s.totalAmount,
        cancellationReasonCode: s.cancellationReasonCode || '002',
        cancellationDate: s.cancellationDate,
      }));
      
      // Genera nome file unico per questo evento - usa la data dell'evento stesso
      progressivo++;
      const reportDate = eventDate; // Usa la data dell'evento per il nome file
      const fileName = generateSiaeFileName('giornaliero', reportDate, progressivo, null, systemCode);
      
      console.log(`[SEND-ALL] Evento ${ev.name} (genere ${te.genreCode}): ${validTickets.length} biglietti, ${cancelledTickets.length} annullati, ${validSubs.length} abbonamenti, ${cancelledSubs.length} abb. annullati`);
      
      // Genera XML per questo singolo evento
      const result = generateC1Xml({
        reportKind: 'giornaliero',
        companyId,
        reportDate,
        resolvedSystemCode: systemCode,
        progressivo,
        taxId: '02120820432',
        businessName: 'HURAEX SRL',
        events: [eventData],
        subscriptions: subscriptionData,
        cancelledSubscriptions: cancelledSubData,
        nomeFile: fileName,
        forceSubstitution: false,
      });
      
      // Invia email S/MIME
      const emailResult = await sendSiaeTransmissionEmail({
        to: 'servertest2@batest.siae.it',
        companyName: company?.name || 'Test',
        transmissionType: 'daily',
        periodDate: reportDate,
        ticketsCount: validTickets.length,
        totalAmount: validTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0).toFixed(2),
        xmlContent: result.xml,
        transmissionId: randomUUID(),
        systemCode,
        sequenceNumber: progressivo,
        signWithSmime: true,
        requireSignature: false,
        explicitFileName: fileName,
      });
      
      results.push({
        eventName: ev.name,
        genre: te.genreCode,
        fileName,
        tickets: validTickets.length,
        cancelledTickets: cancelledTickets.length,
        subscriptions: validSubs.length,
        cancelledSubscriptions: cancelledSubs.length,
        sent: emailResult.success,
        smimeSigned: emailResult.smimeSigned,
      });
      
      // Pausa breve tra invii per non sovraccaricare
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log(`[SEND-ALL] Completati ${results.length} report`);
    
    res.json({
      success: true,
      reportsSent: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[SEND-ALL] Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== CATEGORIE EVENTI ====================

// Lista categorie eventi attive
router.get("/api/public/event-categories", async (req, res) => {
  try {
    const categories = await db
      .select({
        id: eventCategories.id,
        name: eventCategories.name,
        slug: eventCategories.slug,
        description: eventCategories.description,
        icon: eventCategories.icon,
        color: eventCategories.color,
        displayOrder: eventCategories.displayOrder,
      })
      .from(eventCategories)
      .where(eq(eventCategories.isActive, true))
      .orderBy(eventCategories.displayOrder);

    res.json(categories);
  } catch (error: any) {
    console.error("[PUBLIC] Error fetching event categories:", error);
    res.status(500).json({ message: "Errore nel caricamento categorie" });
  }
});

// ==================== EVENTI PUBBLICI ====================

// Lista eventi disponibili per acquisto
router.get("/api/public/events", async (req, res) => {
  try {
    const { city, dateFrom, dateTo, categoryId, userLat, userLng, limit = 20, offset = 0 } = req.query;
    
    const hasUserLocation = userLat && userLng && 
      !isNaN(parseFloat(userLat as string)) && 
      !isNaN(parseFloat(userLng as string));
    const userLatNum = hasUserLocation ? parseFloat(userLat as string) : null;
    const userLngNum = hasUserLocation ? parseFloat(userLng as string) : null;
    const now = new Date();
    
    // Debug: log all ticketed events with their status
    const allTicketedEvents = await db
      .select({
        id: siaeTicketedEvents.id,
        eventId: siaeTicketedEvents.eventId,
        ticketingStatus: siaeTicketedEvents.ticketingStatus,
        eventName: events.name,
        eventStatus: events.status,
        isPublic: events.isPublic,
        endDatetime: events.endDatetime,
        saleStartDate: siaeTicketedEvents.saleStartDate,
        saleEndDate: siaeTicketedEvents.saleEndDate,
      })
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id));
    
    // Log each event separately for clarity
    console.log("=== PUBLIC EVENTS DEBUG START ===");
    console.log("Server time NOW:", now.toISOString());
    allTicketedEvents.forEach((e, i) => {
      const endDt = e.endDatetime ? new Date(e.endDatetime) : null;
      const isEndFuture = endDt ? endDt > now : false;
      const passesFilter = 
        e.ticketingStatus === 'active' && 
        e.isPublic === true && 
        (e.eventStatus === 'scheduled' || e.eventStatus === 'ongoing') && 
        isEndFuture;
      console.log(`EVENT ${i+1}: ${e.eventName}`);
      console.log(`  ticketingStatus: ${e.ticketingStatus} (needs: active) ${e.ticketingStatus === 'active' ? '✓' : '✗'}`);
      console.log(`  isPublic: ${e.isPublic} (needs: true) ${e.isPublic === true ? '✓' : '✗'}`);
      console.log(`  eventStatus: ${e.eventStatus} (needs: scheduled/ongoing) ${e.eventStatus === 'scheduled' || e.eventStatus === 'ongoing' ? '✓' : '✗'}`);
      console.log(`  endDatetime: ${e.endDatetime} > ${now.toISOString()} = ${isEndFuture} ${isEndFuture ? '✓' : '✗'}`);
      console.log(`  PASSES ALL FILTERS: ${passesFilter ? 'YES' : 'NO'}`);
    });
    console.log("=== PUBLIC EVENTS DEBUG END ===");

    const whereConditions = [
      eq(siaeTicketedEvents.ticketingStatus, "active"),
      eq(events.isPublic, true),
      or(eq(events.status, "scheduled"), eq(events.status, "ongoing")),
      gt(events.endDatetime, now),
      or(isNull(siaeTicketedEvents.saleStartDate), lte(siaeTicketedEvents.saleStartDate, now)),
      or(isNull(siaeTicketedEvents.saleEndDate), gte(siaeTicketedEvents.saleEndDate, now))
    ];

    if (categoryId && typeof categoryId === 'string') {
      whereConditions.push(eq(events.categoryId, categoryId));
    }

    const result = await db
      .select({
        id: siaeTicketedEvents.id,
        eventId: siaeTicketedEvents.eventId,
        siaeEventCode: siaeTicketedEvents.siaeEventCode,
        totalCapacity: siaeTicketedEvents.totalCapacity,
        ticketsSold: siaeTicketedEvents.ticketsSold,
        ticketingStatus: siaeTicketedEvents.ticketingStatus,
        saleStartDate: siaeTicketedEvents.saleStartDate,
        saleEndDate: siaeTicketedEvents.saleEndDate,
        maxTicketsPerUser: siaeTicketedEvents.maxTicketsPerUser,
        requiresNominative: siaeTicketedEvents.requiresNominative,
        eventName: events.name,
        eventImageUrl: events.imageUrl,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        locationId: locations.id,
        locationName: locations.name,
        locationAddress: locations.address,
        locationLatitude: locations.latitude,
        locationLongitude: locations.longitude,
        categoryId: events.categoryId,
        categoryName: eventCategories.name,
        categorySlug: eventCategories.slug,
        categoryIcon: eventCategories.icon,
        categoryColor: eventCategories.color,
      })
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .leftJoin(eventCategories, eq(events.categoryId, eventCategories.id))
      .where(and(...whereConditions))
      .orderBy(events.startDatetime)
      .limit(Number(limit))
      .offset(Number(offset));

    // Aggiungi info disponibilità e calcola distanza
    const eventsWithAvailability = await Promise.all(
      result.map(async (event) => {
        const sectors = await db
          .select({
            id: siaeEventSectors.id,
            name: siaeEventSectors.name,
            capacity: siaeEventSectors.capacity,
            availableSeats: siaeEventSectors.availableSeats,
            priceIntero: siaeEventSectors.priceIntero,
            priceRidotto: siaeEventSectors.priceRidotto,
            isNumbered: siaeEventSectors.isNumbered,
          })
          .from(siaeEventSectors)
          .where(
            and(
              eq(siaeEventSectors.ticketedEventId, event.id),
              eq(siaeEventSectors.active, true)
            )
          );

        const minPrice = sectors.length > 0
          ? Math.min(...sectors.map((s) => Number(s.priceIntero)))
          : 0;
        const totalAvailable = sectors.reduce((sum, s) => sum + (s.availableSeats || 0), 0);

        let distance: number | null = null;
        if (hasUserLocation && event.locationLatitude && event.locationLongitude) {
          const lat = parseFloat(event.locationLatitude);
          const lng = parseFloat(event.locationLongitude);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const toRad = (deg: number) => deg * (Math.PI / 180);
            const cosValue = Math.cos(toRad(userLatNum!)) * Math.cos(toRad(lat)) * 
              Math.cos(toRad(lng) - toRad(userLngNum!)) + 
              Math.sin(toRad(userLatNum!)) * Math.sin(toRad(lat));
            const clampedCosValue = Math.max(-1, Math.min(1, cosValue));
            distance = 6371 * Math.acos(clampedCosValue);
            if (isNaN(distance)) distance = null;
            else distance = Math.round(distance * 100) / 100;
          }
        }

        return {
          ...event,
          minPrice,
          totalAvailable,
          sectorsCount: sectors.length,
          distance,
        };
      })
    );

    if (hasUserLocation) {
      eventsWithAvailability.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    res.json(eventsWithAvailability);
  } catch (error: any) {
    console.error("[PUBLIC] Error fetching events:", error);
    res.status(500).json({ message: "Errore nel caricamento eventi" });
  }
});

// Lista TUTTI gli eventi pubblici programmati (non solo SIAE ticketed)
router.get("/api/public/all-events", async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const now = new Date();

    // SECURITY: Only show events at PUBLIC locations
    const result = await db
      .select({
        id: events.id,
        name: events.name,
        description: events.description,
        imageUrl: events.imageUrl,
        startDatetime: events.startDatetime,
        endDatetime: events.endDatetime,
        status: events.status,
        capacity: events.capacity,
        locationId: locations.id,
        locationName: locations.name,
        locationAddress: locations.address,
        locationCity: locations.city,
        locationImageUrl: locations.heroImageUrl,
      })
      .from(events)
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(
        and(
          or(eq(events.status, "scheduled"), eq(events.status, "ongoing")), // Include both scheduled and ongoing events
          eq(events.isPublic, true), // Only show events marked as public
          gt(events.endDatetime, now) // Event hasn't ended yet
        )
      )
      .orderBy(events.startDatetime)
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(result);
  } catch (error: any) {
    console.error("[PUBLIC] Error fetching all events:", error);
    res.status(500).json({ message: "Errore nel caricamento eventi" });
  }
});

// Lista tutte le location pubbliche
router.get("/api/public/all-locations", async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await db
      .select({
        id: locations.id,
        name: locations.name,
        address: locations.address,
        city: locations.city,
        capacity: locations.capacity,
        description: locations.shortDescription,
        imageUrl: locations.heroImageUrl,
        isPublic: locations.isPublic,
      })
      .from(locations)
      .where(eq(locations.isPublic, true))
      .orderBy(locations.name)
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(result);
  } catch (error: any) {
    console.error("[PUBLIC] Error fetching locations:", error);
    res.status(500).json({ message: "Errore nel caricamento locations" });
  }
});

// Planimetria pubblica di una location
router.get("/api/public/locations/:locationId/floor-plan", async (req, res) => {
  try {
    const { locationId } = req.params;
    const { eventId } = req.query;

    // Trova la planimetria principale della location
    const [floorPlan] = await db
      .select()
      .from(venueFloorPlans)
      .where(
        and(
          eq(venueFloorPlans.locationId, locationId),
          eq(venueFloorPlans.isDefault, true)
        )
      )
      .limit(1);

    if (!floorPlan) {
      return res.status(404).json({ message: "Nessuna planimetria disponibile" });
    }

    // Carica le zone della planimetria
    const zones = await db
      .select()
      .from(floorPlanZones)
      .where(eq(floorPlanZones.floorPlanId, floorPlan.id))
      .orderBy(floorPlanZones.sortOrder);

    // Se è specificato un eventId, carica anche le mappature evento-zona
    let zoneMappings: any[] = [];
    if (eventId) {
      zoneMappings = await db
        .select()
        .from(eventZoneMappings)
        .where(eq(eventZoneMappings.ticketedEventId, eventId as string));
    }

    // Combina zone con mappature evento
    const zonesWithMappings = zones.map(zone => {
      const mapping = zoneMappings.find(m => m.zoneId === zone.id);
      return {
        ...zone,
        eventMapping: mapping || null,
      };
    });

    res.json({
      ...floorPlan,
      zones: zonesWithMappings,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Error fetching floor plan:", error);
    res.status(500).json({ message: "Errore nel caricamento planimetria" });
  }
});

// Dettaglio singolo evento
router.get("/api/public/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Prima cerca per siaeTicketedEvents.id
    let [ticketedEvent] = await db
      .select({
        id: siaeTicketedEvents.id,
        eventId: siaeTicketedEvents.eventId,
        siaeEventCode: siaeTicketedEvents.siaeEventCode,
        totalCapacity: siaeTicketedEvents.totalCapacity,
        ticketsSold: siaeTicketedEvents.ticketsSold,
        ticketingStatus: siaeTicketedEvents.ticketingStatus,
        saleStartDate: siaeTicketedEvents.saleStartDate,
        saleEndDate: siaeTicketedEvents.saleEndDate,
        maxTicketsPerUser: siaeTicketedEvents.maxTicketsPerUser,
        requiresNominative: siaeTicketedEvents.requiresNominative,
        allowsChangeName: siaeTicketedEvents.allowsChangeName,
        genreCode: siaeTicketedEvents.genreCode,
        eventName: events.name,
        eventDescription: events.description,
        eventImageUrl: events.imageUrl,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        eventNotes: events.notes,
        locationId: locations.id,
        locationName: locations.name,
        locationAddress: locations.address,
        locationCapacity: locations.capacity,
      })
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(eq(siaeTicketedEvents.id, id));

    // Se non trovato, cerca per eventId (ID evento base)
    if (!ticketedEvent) {
      [ticketedEvent] = await db
        .select({
          id: siaeTicketedEvents.id,
          eventId: siaeTicketedEvents.eventId,
          siaeEventCode: siaeTicketedEvents.siaeEventCode,
          totalCapacity: siaeTicketedEvents.totalCapacity,
          ticketsSold: siaeTicketedEvents.ticketsSold,
          ticketingStatus: siaeTicketedEvents.ticketingStatus,
          saleStartDate: siaeTicketedEvents.saleStartDate,
          saleEndDate: siaeTicketedEvents.saleEndDate,
          maxTicketsPerUser: siaeTicketedEvents.maxTicketsPerUser,
          requiresNominative: siaeTicketedEvents.requiresNominative,
          allowsChangeName: siaeTicketedEvents.allowsChangeName,
          genreCode: siaeTicketedEvents.genreCode,
          eventName: events.name,
          eventDescription: events.description,
          eventImageUrl: events.imageUrl,
          eventStart: events.startDatetime,
          eventEnd: events.endDatetime,
          eventNotes: events.notes,
          locationId: locations.id,
          locationName: locations.name,
          locationAddress: locations.address,
          locationCapacity: locations.capacity,
        })
        .from(siaeTicketedEvents)
        .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
        .innerJoin(locations, eq(events.locationId, locations.id))
        .where(eq(siaeTicketedEvents.eventId, id));
    }

    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento non trovato o non abilitato alla vendita biglietti" });
    }

    // Carica settori usando l'ID del ticketedEvent (non l'id dal parametro URL)
    const sectors = await db
      .select()
      .from(siaeEventSectors)
      .where(
        and(
          eq(siaeEventSectors.ticketedEventId, ticketedEvent.id),
          eq(siaeEventSectors.active, true)
        )
      )
      .orderBy(siaeEventSectors.sortOrder);

    // Per settori numerati, carica posti disponibili
    const sectorsWithSeats = await Promise.all(
      sectors.map(async (sector) => {
        if (sector.isNumbered) {
          const seats = await db
            .select()
            .from(siaeSeats)
            .where(
              and(
                eq(siaeSeats.sectorId, sector.id),
                eq(siaeSeats.status, "available")
              )
            )
            .orderBy(siaeSeats.row, siaeSeats.seatNumber);

          return { ...sector, availableSeats: seats.length, seats };
        }
        return { ...sector, seats: [] };
      })
    );

    res.json({
      ...ticketedEvent,
      sectors: sectorsWithSeats,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Error fetching event:", error);
    res.status(500).json({ message: "Errore nel caricamento evento" });
  }
});

// Posti di un settore per visualizzazione planimetria (include stato disponibilità)
router.get("/api/public/sectors/:sectorId/seats", async (req, res) => {
  try {
    const { sectorId } = req.params;
    
    // Verifica che il settore esista e sia attivo
    const [sector] = await db
      .select()
      .from(siaeEventSectors)
      .where(eq(siaeEventSectors.id, sectorId));
    
    if (!sector || !sector.active) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    
    // Carica tutti i posti del settore con le loro posizioni e stato
    const seats = await db
      .select({
        id: siaeSeats.id,
        row: siaeSeats.row,
        seatNumber: siaeSeats.seatNumber,
        seatLabel: siaeSeats.seatLabel,
        posX: siaeSeats.posX,
        posY: siaeSeats.posY,
        status: siaeSeats.status,
        isAccessible: siaeSeats.isAccessible,
      })
      .from(siaeSeats)
      .where(eq(siaeSeats.sectorId, sectorId))
      .orderBy(siaeSeats.row, siaeSeats.seatNumber);
    
    // Conta posti per stato
    const summary = {
      total: seats.length,
      available: seats.filter(s => s.status === 'available').length,
      sold: seats.filter(s => s.status === 'sold').length,
      reserved: seats.filter(s => s.status === 'reserved').length,
      blocked: seats.filter(s => s.status === 'blocked').length,
    };
    
    res.json({
      sectorId,
      sectorName: sector.name,
      sectorCode: sector.sectorCode,
      isNumbered: sector.isNumbered,
      seats,
      summary,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Error fetching sector seats:", error);
    res.status(500).json({ message: "Errore nel caricamento posti" });
  }
});

// ==================== AUTENTICAZIONE CLIENTE ====================

// Schema registrazione cliente
const customerRegisterSchema = z.object({
  email: z.string().email("Email non valida"),
  phone: z.string().min(10, "Numero di telefono non valido"),
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  password: z.string().min(8, "Password deve avere almeno 8 caratteri"),
  // Campi opzionali aggiuntivi
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido").optional().or(z.literal('')),
  gender: z.enum(['M', 'F']).optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  province: z.string().max(2).optional(),
  postalCode: z.string().optional(),
  addressLatitude: z.string().optional(),
  addressLongitude: z.string().optional(),
});

// Registrazione cliente
router.post("/api/public/customers/register", async (req, res) => {
  try {
    const data = customerRegisterSchema.parse(req.body);
    
    // Normalizza email e telefono
    const normalizedEmail = data.email.toLowerCase().trim();
    const normalizedPhoneInput = data.phone;
    const phoneNormalized = normalizePhone(normalizedPhoneInput);

    if (!phoneNormalized) {
      return res.status(400).json({ message: "Numero di telefono non valido" });
    }

    // Cerca o crea identity
    // Cerca prima per email, poi per telefono normalizzato
    const existingByEmail = await db
      .select()
      .from(identities)
      .where(eq(identities.email, normalizedEmail))
      .limit(1);

    const existingByPhone = await db
      .select()
      .from(identities)
      .where(eq(identities.phoneNormalized, phoneNormalized))
      .limit(1);

    let identity;
    if (existingByEmail.length > 0) {
      // Usa l'identity esistente trovata per email
      identity = existingByEmail[0];
      
      // Se il nuovo telefono è diverso e già registrato, rifiuta
      if (existingByPhone.length > 0 && existingByPhone[0].id !== identity.id) {
        return res.status(400).json({ message: "Telefono già registrato con un'altra identità" });
      }
      
      // Aggiorna il telefono nell'identity se diverso
      if (identity.phoneNormalized !== phoneNormalized) {
        const [updated] = await db
          .update(identities)
          .set({ phoneNormalized })
          .where(eq(identities.id, identity.id))
          .returning();
        identity = updated;
      }
    } else if (existingByPhone.length > 0) {
      // Usa l'identity esistente trovata per telefono
      identity = existingByPhone[0];
      
      // Aggiorna l'email nell'identity se diverso
      if (identity.email !== normalizedEmail) {
        const [updated] = await db
          .update(identities)
          .set({ email: normalizedEmail })
          .where(eq(identities.id, identity.id))
          .returning();
        identity = updated;
      }
    } else {
      // Crea una nuova identity
      const [newIdentity] = await db
        .insert(identities)
        .values({
          firstName: data.firstName,
          lastName: data.lastName,
          email: normalizedEmail,
          emailVerified: false,
          phone: normalizedPhoneInput,
          phoneNormalized: phoneNormalized,
          phoneVerified: false,
          gender: data.gender || null,
          birthDate: data.birthDate && data.birthDate.length > 0 ? new Date(data.birthDate) : null,
          birthPlace: null,
          street: data.street?.trim() || null,
          city: data.city?.trim() || null,
          province: data.province?.trim().toUpperCase() || null,
          postalCode: data.postalCode?.trim() || null,
          country: 'IT',
        })
        .returning();
      identity = newIdentity;
    }

    // Controlla se cliente con questa identity già esiste
    const [existingCustomer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.email, normalizedEmail))
      .limit(1);

    if (existingCustomer) {
      return res.status(400).json({ message: "Email già registrata come cliente" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Crea cliente collegato all'identity
    const [customer] = await db
      .insert(siaeCustomers)
      .values({
        identityId: identity.id,
        uniqueCode: generateCustomerCode(),
        email: normalizedEmail,
        phone: phoneNormalized,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        authenticationType: "OTP",
        registrationIp: req.ip,
        phoneVerified: false,
        emailVerified: false,
        registrationCompleted: false,
        // Campi opzionali (stringa vuota → null)
        birthDate: data.birthDate && data.birthDate.length > 0 ? new Date(data.birthDate) : null,
        gender: data.gender || null,
        street: data.street?.trim() || null,
        city: data.city?.trim() || null,
        province: data.province?.trim().toUpperCase() || null,
        postalCode: data.postalCode?.trim() || null,
        addressLatitude: data.addressLatitude?.trim() || null,
        addressLongitude: data.addressLongitude?.trim() || null,
      })
      .returning();

    // Genera e invia OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minuti

    // Use MSG91 SMS Flow API if configured, otherwise fallback to local OTP
    if (isMSG91Configured()) {
      console.log(`[PUBLIC OTP] Using MSG91 SMS Flow for ${customer.phone}`);
      const result = await sendMSG91OTP(customer.phone, 10);
      
      if (!result.success) {
        console.error(`[PUBLIC OTP] MSG91 failed: ${result.message}`);
        return res.status(500).json({ message: "Errore nell'invio OTP. Riprova." });
      }
      
      // Store the OTP code in DB (generated locally, sent via MSG91 SMS)
      await db.insert(siaeOtpAttempts).values({
        customerId: customer.id,
        phone: customer.phone,
        otpCode: result.otpCode!, // Store the actual OTP code for local verification
        purpose: "registration",
        expiresAt,
        ipAddress: req.ip,
      });
      
      res.json({
        customerId: customer.id,
        identityId: identity.id,
        message: "Registrazione avviata. Inserisci il codice OTP ricevuto via SMS.",
        provider: "msg91"
      });
    } else {
      // Fallback locale per sviluppo
      const otp = generateOTP();
      
      await db.insert(siaeOtpAttempts).values({
        customerId: customer.id,
        phone: customer.phone,
        otpCode: otp,
        purpose: "registration",
        expiresAt,
        ipAddress: req.ip,
      });

      console.log(`[PUBLIC OTP] Local OTP for ${customer.phone}: ${otp}`);

      res.json({
        customerId: customer.id,
        identityId: identity.id,
        message: "Registrazione avviata. Inserisci il codice OTP ricevuto via SMS.",
        provider: "local"
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("[PUBLIC] Registration error:", error);
    res.status(500).json({ message: "Errore durante la registrazione" });
  }
});

// Verifica OTP
router.post("/api/public/customers/verify-otp", async (req, res) => {
  try {
    const { customerId, otpCode } = req.body;

    if (!customerId || !otpCode) {
      return res.status(400).json({ message: "Dati mancanti" });
    }

    // Get customer first to get their phone number
    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.id, customerId));

    if (!customer) {
      return res.status(400).json({ message: "Cliente non trovato" });
    }

    // Find pending OTP attempt
    const [otpAttempt] = await db
      .select()
      .from(siaeOtpAttempts)
      .where(
        and(
          eq(siaeOtpAttempts.customerId, customerId),
          eq(siaeOtpAttempts.status, "pending"),
          gt(siaeOtpAttempts.expiresAt, new Date())
        )
      )
      .orderBy(desc(siaeOtpAttempts.createdAt))
      .limit(1);

    if (!otpAttempt) {
      return res.status(400).json({ message: "Nessun OTP pendente. Richiedi un nuovo codice." });
    }

    // Local OTP verification (code is stored in DB, sent via MSG91 SMS)
    console.log(`[PUBLIC OTP] Verifying OTP for ${customer.phone} - provided: ${otpCode}, stored: ${otpAttempt.otpCode}`);
    
    if (otpAttempt.otpCode !== otpCode) {
      return res.status(400).json({ message: "Codice OTP non valido o scaduto" });
    }
    
    // OTP verification succeeded
    await db
      .update(siaeOtpAttempts)
      .set({ status: "verified", verifiedAt: new Date() })
      .where(eq(siaeOtpAttempts.id, otpAttempt.id));

    // Aggiorna cliente come verificato
    await db
      .update(siaeCustomers)
      .set({
        phoneVerified: true,
        registrationCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(siaeCustomers.id, customerId));

    // Crea sessione
    const sessionToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 giorni

    await db.insert(publicCustomerSessions).values({
      customerId,
      sessionToken,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Refresh customer data after update
    const [updatedCustomer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.id, customerId));

    res.json({
      token: sessionToken,
      customer: {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        firstName: updatedCustomer.firstName,
        lastName: updatedCustomer.lastName,
      },
    });
  } catch (error: any) {
    console.error("[PUBLIC] OTP verification error:", error);
    res.status(500).json({ message: "Errore durante la verifica" });
  }
});

// Resend OTP
router.post("/api/public/customers/resend-otp", async (req, res) => {
  try {
    const { customerId, retryType = "text" } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "ID cliente mancante" });
    }

    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.id, customerId));

    if (!customer) {
      return res.status(400).json({ message: "Cliente non trovato" });
    }

    if (customer.registrationCompleted) {
      return res.status(400).json({ message: "Registrazione già completata" });
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (isMSG91Configured()) {
      console.log(`[PUBLIC OTP] Resending via MSG91 SMS Flow to ${customer.phone}`);
      const result = await resendMSG91OTP(customer.phone, retryType as 'text' | 'voice');
      
      if (!result.success) {
        console.error(`[PUBLIC OTP] MSG91 resend failed: ${result.message}`);
        return res.status(500).json({ message: "Errore nel reinvio OTP. Riprova." });
      }

      // Store the OTP code in DB (generated locally, sent via MSG91 SMS)
      await db.insert(siaeOtpAttempts).values({
        customerId: customer.id,
        phone: customer.phone,
        otpCode: result.otpCode!,
        purpose: "registration",
        expiresAt,
        ipAddress: req.ip,
      });

      res.json({ message: "OTP reinviato con successo", provider: "msg91" });
    } else {
      // Local fallback
      const otp = generateOTP();

      await db.insert(siaeOtpAttempts).values({
        customerId: customer.id,
        phone: customer.phone,
        otpCode: otp,
        purpose: "registration",
        expiresAt,
        ipAddress: req.ip,
      });

      console.log(`[PUBLIC OTP] Local resend OTP for ${customer.phone}: ${otp}`);
      res.json({ message: "OTP reinviato con successo", provider: "local" });
    }
  } catch (error: any) {
    console.error("[PUBLIC] Resend OTP error:", error);
    res.status(500).json({ message: "Errore durante il reinvio OTP" });
  }
});

// Login cliente - RIMOSSO: ora usa /api/auth/login unificato

// Richiedi reset password cliente
router.post("/api/public/customers/forgot-password", async (req, res) => {
  console.log("[PUBLIC] Forgot password request received:", req.body);
  try {
    const { email } = req.body;

    if (!email) {
      console.log("[PUBLIC] Email missing in request");
      return res.status(400).json({ message: "Email richiesta" });
    }

    console.log("[PUBLIC] Looking up customer by email:", email.toLowerCase().trim());
    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.email, email.toLowerCase().trim()));

    const successMessage = "Se l'email è registrata, riceverai un link per reimpostare la password.";

    if (!customer) {
      console.log("[PUBLIC] Customer not found for email:", email);
      return res.json({ message: successMessage });
    }

    console.log("[PUBLIC] Customer found:", customer.id, customer.email);
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000);

    console.log("[PUBLIC] Updating customer with reset token");
    await db
      .update(siaeCustomers)
      .set({
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
        updatedAt: new Date(),
      })
      .where(eq(siaeCustomers.id, customer.id));

    const baseUrl = process.env.CUSTOM_DOMAIN
      ? `https://${process.env.CUSTOM_DOMAIN}`
      : process.env.PUBLIC_URL
        ? process.env.PUBLIC_URL.replace(/\/$/, "")
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "http://localhost:5000";
    const resetLink = `${baseUrl}/public/reset-password?token=${resetToken}`;
    console.log("[PUBLIC] Reset link generated:", resetLink);

    console.log("[PUBLIC] Sending password reset email to:", customer.email);
    await sendPasswordResetEmail({
      to: customer.email,
      firstName: customer.firstName,
      resetLink,
    });

    console.log("[PUBLIC] Password reset email sent successfully to:", customer.email);
    res.json({ message: successMessage });
  } catch (error: any) {
    console.error("[PUBLIC] Forgot password error:", error);
    res.status(500).json({ message: "Errore durante l'invio. Riprova più tardi." });
  }
});

// Verifica token reset password cliente
router.get("/api/public/customers/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, message: "Token mancante" });
    }

    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.resetPasswordToken, token));

    if (!customer) {
      return res.status(400).json({ valid: false, message: "Link non valido" });
    }

    if (customer.resetPasswordExpires && new Date() > new Date(customer.resetPasswordExpires)) {
      return res.status(400).json({ valid: false, message: "Link scaduto" });
    }

    res.json({ valid: true, email: customer.email });
  } catch (error: any) {
    console.error("[PUBLIC] Verify reset token error:", error);
    res.status(500).json({ valid: false, message: "Errore di verifica" });
  }
});

// Reset password cliente
router.post("/api/public/customers/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token e password richiesti" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "La password deve essere di almeno 8 caratteri" });
    }

    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.resetPasswordToken, token));

    if (!customer) {
      return res.status(400).json({ message: "Link non valido o scaduto" });
    }

    if (customer.resetPasswordExpires && new Date() > new Date(customer.resetPasswordExpires)) {
      return res.status(400).json({ message: "Link scaduto. Richiedi un nuovo reset password." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .update(siaeCustomers)
      .set({
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(siaeCustomers.id, customer.id));

    console.log("[PUBLIC] Password reset successful for customer:", customer.email);
    res.json({ message: "Password reimpostata con successo! Ora puoi accedere." });
  } catch (error: any) {
    console.error("[PUBLIC] Reset password error:", error);
    res.status(500).json({ message: "Errore durante il reset. Riprova più tardi." });
  }
});

// ==================== PASSWORD RESET VIA PHONE/OTP ====================

// Request password reset via phone (sends OTP)
router.post("/api/public/customers/forgot-password-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    
    console.log("[PUBLIC] Forgot password phone - input:", phone);

    if (!phone) {
      return res.status(400).json({ message: "Numero di telefono richiesto" });
    }

    // Normalize phone number - strip non-digits
    const normalizePhone = (p: string) => {
      let normalized = p.replace(/\D/g, '');
      if (normalized.startsWith('0039')) {
        normalized = normalized.substring(4);
      } else if (normalized.startsWith('39') && normalized.length > 10) {
        normalized = normalized.substring(2);
      }
      return normalized;
    };
    
    const normalizedPhone = normalizePhone(phone);
    console.log("[PUBLIC] Forgot password phone - normalized:", normalizedPhone);

    // UNIFIED SEARCH: Search in all user tables
    // 1. siaeCustomers (clients/customers)
    // 2. users (internal users: gestore, organizer, warehouse, bartender, super_admin)
    // 3. prProfiles (PR/promoters)
    
    type FoundUser = {
      id: string;
      phone: string;
      type: 'customer' | 'user' | 'pr';
      email?: string | null;
    };
    
    let foundUser: FoundUser | null = null;
    
    // Search in siaeCustomers
    const customers = await db.select().from(siaeCustomers);
    for (const c of customers) {
      if (!c.phone) continue;
      if (normalizePhone(c.phone) === normalizedPhone) {
        foundUser = { id: c.id, phone: c.phone, type: 'customer', email: c.email };
        console.log("[PUBLIC] Found in siaeCustomers:", c.id);
        break;
      }
    }
    
    // If not found, search in users table
    if (!foundUser) {
      const allUsers = await db.select().from(users);
      for (const u of allUsers) {
        if (!u.phone) continue;
        if (normalizePhone(u.phone) === normalizedPhone) {
          foundUser = { id: u.id, phone: u.phone, type: 'user', email: u.email };
          console.log("[PUBLIC] Found in users:", u.id, u.role);
          break;
        }
      }
    }
    
    // If not found, search in prProfiles table
    if (!foundUser) {
      const allPrProfiles = await db.select().from(prProfiles);
      for (const pr of allPrProfiles) {
        if (!pr.phone) continue;
        if (normalizePhone(pr.phone) === normalizedPhone) {
          foundUser = { id: pr.id, phone: pr.phone, type: 'pr', email: pr.email };
          console.log("[PUBLIC] Found in prProfiles:", pr.id);
          break;
        }
      }
    }

    // Always return success message to prevent enumeration
    const successMessage = "Se il numero è registrato, riceverai un codice OTP per reimpostare la password.";

    if (!foundUser) {
      console.log("[PUBLIC] Phone NOT found in any table:", phone, "normalized:", normalizedPhone);
      return res.json({ message: successMessage });
    }
    
    console.log("[PUBLIC] User found for password reset:", foundUser.id, "type:", foundUser.type, "phone:", foundUser.phone);

    // Generate OTP and store it
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (isMSG91Configured()) {
      console.log(`[PUBLIC] Sending password reset OTP via MSG91 to ${foundUser.phone}`);
      const result = await sendMSG91OTP(foundUser.phone, 10);
      
      if (!result.success) {
        console.error(`[PUBLIC] MSG91 failed for password reset: ${result.message}`);
        return res.status(500).json({ message: "Errore nell'invio OTP. Riprova." });
      }
      
      // Store OTP - use siaeOtpAttempts for customers, prOtpAttempts for PR/users
      if (foundUser.type === 'customer') {
        await db.insert(siaeOtpAttempts).values({
          customerId: foundUser.id,
          phone: foundUser.phone,
          otpCode: result.otpCode!,
          purpose: "password_reset",
          expiresAt,
          ipAddress: req.ip,
        });
      } else {
        // For users and PR, use prOtpAttempts with userId
        await db.insert(prOtpAttempts).values({
          userId: foundUser.type === 'user' ? foundUser.id : null,
          phone: foundUser.phone,
          otpCode: result.otpCode!,
          purpose: "password_reset",
          expiresAt,
          ipAddress: req.ip,
        });
      }
      
      console.log(`[PUBLIC] Password reset OTP sent successfully`);
      res.json({ 
        message: successMessage,
        customerId: foundUser.id,
        userType: foundUser.type,
        provider: "msg91"
      });
    } else {
      // Local fallback for development
      const otp = generateOTP();
      
      if (foundUser.type === 'customer') {
        await db.insert(siaeOtpAttempts).values({
          customerId: foundUser.id,
          phone: foundUser.phone,
          otpCode: otp,
          purpose: "password_reset",
          expiresAt,
          ipAddress: req.ip,
        });
      } else {
        await db.insert(prOtpAttempts).values({
          userId: foundUser.type === 'user' ? foundUser.id : null,
          phone: foundUser.phone,
          otpCode: otp,
          purpose: "password_reset",
          expiresAt,
          ipAddress: req.ip,
        });
      }

      console.log(`[PUBLIC] Local password reset OTP generated for ${foundUser.type} ${foundUser.id}, OTP: ${otp}`);
      res.json({ 
        message: successMessage,
        customerId: foundUser.id,
        userType: foundUser.type,
        provider: "local",
        // In development, show OTP for testing
        ...(process.env.NODE_ENV === 'development' ? { devOtp: otp } : {})
      });
    }
  } catch (error: any) {
    console.error("[PUBLIC] Forgot password phone error:", error);
    res.status(500).json({ message: "Errore durante la richiesta. Riprova più tardi." });
  }
});

// Verify OTP and reset password via phone - UNIFIED for all user types
router.post("/api/public/customers/reset-password-phone", async (req, res) => {
  try {
    const { customerId, userType, otpCode, password } = req.body;
    
    console.log("[PUBLIC] Reset password phone request:", { customerId, userType, otpCode: otpCode?.substring(0, 2) + '***', passwordLength: password?.length });

    if (!customerId || !otpCode || !password) {
      console.log("[PUBLIC] Reset password: missing data");
      return res.status(400).json({ message: "Dati mancanti" });
    }

    if (password.length < 8) {
      console.log("[PUBLIC] Reset password: password too short");
      return res.status(400).json({ message: "La password deve essere di almeno 8 caratteri" });
    }

    // Determine user type (default to 'customer' for backwards compatibility)
    const effectiveUserType = userType || 'customer';
    console.log("[PUBLIC] Reset password: effective user type:", effectiveUserType);
    
    let foundPhone: string | null = null;
    let otpAttempt: any = null;

    // Find user and OTP based on type
    if (effectiveUserType === 'customer') {
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.id, customerId));

      if (!customer) {
        console.log("[PUBLIC] Reset password: customer not found:", customerId);
        return res.status(400).json({ message: "Utente non trovato" });
      }
      foundPhone = customer.phone;
      console.log("[PUBLIC] Reset password: found customer:", customer.id, customer.phone);

      // Find OTP in siaeOtpAttempts
      [otpAttempt] = await db
        .select()
        .from(siaeOtpAttempts)
        .where(
          and(
            eq(siaeOtpAttempts.customerId, customerId),
            eq(siaeOtpAttempts.purpose, "password_reset"),
            eq(siaeOtpAttempts.status, "pending"),
            gt(siaeOtpAttempts.expiresAt, new Date())
          )
        )
        .orderBy(desc(siaeOtpAttempts.createdAt))
        .limit(1);
        
    } else if (effectiveUserType === 'user') {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, customerId));

      if (!user) {
        console.log("[PUBLIC] Reset password: user not found:", customerId);
        return res.status(400).json({ message: "Utente non trovato" });
      }
      foundPhone = user.phone;
      console.log("[PUBLIC] Reset password: found user:", user.id, user.phone, user.role);

      // Find OTP in prOtpAttempts (used for non-customer users)
      [otpAttempt] = await db
        .select()
        .from(prOtpAttempts)
        .where(
          and(
            eq(prOtpAttempts.userId, customerId),
            eq(prOtpAttempts.purpose, "password_reset"),
            eq(prOtpAttempts.status, "pending"),
            gt(prOtpAttempts.expiresAt, new Date())
          )
        )
        .orderBy(desc(prOtpAttempts.createdAt))
        .limit(1);
        
    } else if (effectiveUserType === 'pr') {
      const [prProfile] = await db
        .select()
        .from(prProfiles)
        .where(eq(prProfiles.id, customerId));

      if (!prProfile) {
        console.log("[PUBLIC] Reset password: PR not found:", customerId);
        return res.status(400).json({ message: "Utente non trovato" });
      }
      foundPhone = prProfile.phone;
      console.log("[PUBLIC] Reset password: found PR:", prProfile.id, prProfile.phone);

      // Find OTP in prOtpAttempts by phone (PR doesn't have userId in prOtpAttempts)
      [otpAttempt] = await db
        .select()
        .from(prOtpAttempts)
        .where(
          and(
            eq(prOtpAttempts.phone, prProfile.phone),
            eq(prOtpAttempts.purpose, "password_reset"),
            eq(prOtpAttempts.status, "pending"),
            gt(prOtpAttempts.expiresAt, new Date())
          )
        )
        .orderBy(desc(prOtpAttempts.createdAt))
        .limit(1);
    }

    if (!otpAttempt) {
      console.log("[PUBLIC] Reset password: no valid OTP found for:", customerId, effectiveUserType);
      return res.status(400).json({ message: "Codice OTP scaduto o non valido. Richiedi un nuovo codice." });
    }
    
    console.log("[PUBLIC] Reset password: found OTP attempt, stored:", otpAttempt.otpCode, "provided:", otpCode);

    // Verify OTP
    if (otpAttempt.otpCode !== otpCode) {
      console.log("[PUBLIC] Reset password: OTP mismatch");
      return res.status(400).json({ message: "Codice OTP non corretto" });
    }

    // Mark OTP as verified
    if (effectiveUserType === 'customer') {
      await db
        .update(siaeOtpAttempts)
        .set({ status: "verified", verifiedAt: new Date() })
        .where(eq(siaeOtpAttempts.id, otpAttempt.id));
    } else {
      await db
        .update(prOtpAttempts)
        .set({ status: "verified", verifiedAt: new Date() })
        .where(eq(prOtpAttempts.id, otpAttempt.id));
    }
    
    console.log("[PUBLIC] Reset password: OTP verified, updating password...");

    // Update password based on user type
    const passwordHash = await bcrypt.hash(password, 10);
    console.log("[PUBLIC] Reset password: new hash generated, length:", passwordHash.length);

    if (effectiveUserType === 'customer') {
      await db
        .update(siaeCustomers)
        .set({
          passwordHash,
          phoneVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(siaeCustomers.id, customerId));
    } else if (effectiveUserType === 'user') {
      await db
        .update(users)
        .set({
          passwordHash: passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, customerId));
    } else if (effectiveUserType === 'pr') {
      await db
        .update(prProfiles)
        .set({
          passwordHash: passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(prProfiles.id, customerId));
    }

    console.log("[PUBLIC] Password reset via phone successful for", effectiveUserType, ":", customerId);
    res.json({ message: "Password reimpostata con successo! Ora puoi accedere." });
  } catch (error: any) {
    console.error("[PUBLIC] Reset password phone error:", error);
    res.status(500).json({ message: "Errore durante il reset. Riprova più tardi." });
  }
});

// Resend password reset OTP - UNIFIED for all user types
router.post("/api/public/customers/resend-password-reset-otp", async (req, res) => {
  try {
    const { customerId, userType } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "ID utente mancante" });
    }

    const effectiveUserType = userType || 'customer';
    let foundPhone: string | null = null;
    let foundId: string = customerId;

    // Find user based on type
    if (effectiveUserType === 'customer') {
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.id, customerId));

      if (!customer) {
        return res.status(400).json({ message: "Utente non trovato" });
      }
      foundPhone = customer.phone;
    } else if (effectiveUserType === 'user') {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, customerId));

      if (!user) {
        return res.status(400).json({ message: "Utente non trovato" });
      }
      foundPhone = user.phone;
    } else if (effectiveUserType === 'pr') {
      const [prProfile] = await db
        .select()
        .from(prProfiles)
        .where(eq(prProfiles.id, customerId));

      if (!prProfile) {
        return res.status(400).json({ message: "Utente non trovato" });
      }
      foundPhone = prProfile.phone;
    }

    if (!foundPhone) {
      return res.status(400).json({ message: "Numero di telefono non trovato" });
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (isMSG91Configured()) {
      console.log(`[PUBLIC] Resending password reset OTP via MSG91 to ${foundPhone}`);
      const result = await resendMSG91OTP(foundPhone, 'text');
      
      if (!result.success) {
        console.error(`[PUBLIC] MSG91 resend failed: ${result.message}`);
        return res.status(500).json({ message: "Errore nel reinvio OTP. Riprova." });
      }

      // Store in appropriate table
      if (effectiveUserType === 'customer') {
        await db.insert(siaeOtpAttempts).values({
          customerId: foundId,
          phone: foundPhone,
          otpCode: result.otpCode!,
          purpose: "password_reset",
          expiresAt,
          ipAddress: req.ip,
        });
      } else {
        await db.insert(prOtpAttempts).values({
          userId: effectiveUserType === 'user' ? foundId : null,
          phone: foundPhone,
          otpCode: result.otpCode!,
          purpose: "password_reset",
          expiresAt,
          ipAddress: req.ip,
        });
      }

      res.json({ message: "OTP reinviato con successo", provider: "msg91" });
    } else {
      const otp = generateOTP();

      if (effectiveUserType === 'customer') {
        await db.insert(siaeOtpAttempts).values({
          customerId: foundId,
          phone: foundPhone,
          otpCode: otp,
          purpose: "password_reset",
          expiresAt,
          ipAddress: req.ip,
        });
      } else {
        await db.insert(prOtpAttempts).values({
          userId: effectiveUserType === 'user' ? foundId : null,
          phone: foundPhone,
          otpCode: otp,
          purpose: "password_reset",
          expiresAt,
          ipAddress: req.ip,
        });
      }

      console.log(`[PUBLIC] Local resend password reset OTP for ${foundPhone}: ${otp}`);
      res.json({ 
        message: "OTP reinviato con successo", 
        provider: "local",
        ...(process.env.NODE_ENV === 'development' ? { devOtp: otp } : {})
      });
    }
  } catch (error: any) {
    console.error("[PUBLIC] Resend password reset OTP error:", error);
    res.status(500).json({ message: "Errore durante il reinvio. Riprova più tardi." });
  }
});

// Profilo cliente autenticato
router.get("/api/public/customers/me", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    // Check if customer has a linked PR profile
    let hasPrProfile = false;
    let prCode: string | null = null;
    
    if (customer.id) {
      // Method 1: Check by identity_id (highest priority)
      if (customer.identityId) {
        const [prByIdentity] = await db.select().from(prProfiles)
          .where(and(
            eq(prProfiles.isActive, true),
            eq(prProfiles.identityId, customer.identityId)
          ));
        if (prByIdentity) {
          hasPrProfile = true;
          prCode = prByIdentity.prCode;
          console.log(`[CUSTOMERS/ME] Found PR by identity_id: ${customer.identityId}`);
        }
      }
      
      // Method 2: Check by phone (normalized)
      if (!hasPrProfile && customer.phone) {
        const phoneDigits = customer.phone.replace(/\D/g, '');
        const phoneBase = phoneDigits.startsWith('39') && phoneDigits.length > 10 
          ? phoneDigits.slice(2) : phoneDigits;
        
        const [prByPhone] = await db.select().from(prProfiles)
          .where(and(
            eq(prProfiles.isActive, true),
            or(
              eq(prProfiles.phone, customer.phone),
              eq(prProfiles.phone, phoneBase),
              sql`REPLACE(REPLACE(REPLACE(${prProfiles.phone}, '+', ''), ' ', ''), '-', '') LIKE ${'%' + phoneBase.slice(-9)}`
            )
          ));
        if (prByPhone) {
          hasPrProfile = true;
          prCode = prByPhone.prCode;
          console.log(`[CUSTOMERS/ME] Found PR by phone: ${customer.phone}`);
        }
      }
      
      // Method 3: Check by email (case-insensitive)
      if (!hasPrProfile && customer.email) {
        const [prByEmail] = await db.select().from(prProfiles)
          .where(and(
            eq(prProfiles.isActive, true),
            sql`LOWER(${prProfiles.email}) = LOWER(${customer.email})`
          ));
        if (prByEmail) {
          hasPrProfile = true;
          prCode = prByEmail.prCode;
          console.log(`[CUSTOMERS/ME] Found PR by email: ${customer.email}`);
        }
      }
    }

    res.json({
      id: customer.id,
      userId: customer.userId || null,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      phoneVerified: customer.phoneVerified || false,
      birthDate: customer.birthDate || null,
      city: customer.city || null,
      province: customer.province || null,
      _isUserWithoutSiaeProfile: customer._isUserWithoutSiaeProfile || false,
      hasPrProfile,
      prCode,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Profile error:", error);
    res.status(500).json({ message: "Errore nel caricamento profilo" });
  }
});

// Aggiorna profilo cliente autenticato
router.patch("/api/public/customers/me", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    // Only allow updating certain fields
    const { birthDate, city, province, firstName, lastName } = req.body;
    
    const updateData: any = { updatedAt: new Date() };
    
    if (birthDate) updateData.birthDate = new Date(birthDate);
    if (city) updateData.city = city;
    if (province) updateData.province = province;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    
    const [updated] = await db
      .update(siaeCustomers)
      .set(updateData)
      .where(eq(siaeCustomers.id, customer.id))
      .returning();
    
    console.log("[PUBLIC] Profile updated for customer:", customer.email);
    res.json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      birthDate: updated.birthDate,
      city: updated.city,
      province: updated.province,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Profile update error:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento profilo" });
  }
});

// Store pending customer phone changes (in-memory)
const pendingCustomerPhoneChanges = new Map<string, { newPhonePrefix: string; newPhone: string; expiresAt: Date }>();

// Request phone number change - sends OTP to new number
router.post("/api/public/customers/phone/request-change", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    const { newPhonePrefix = '+39', newPhone } = req.body;
    
    if (!newPhone || newPhone.replace(/\D/g, '').length < 9) {
      return res.status(400).json({ message: "Numero di telefono non valido (minimo 9 cifre)" });
    }
    
    // Clean phone number (remove non-digits)
    const cleanPhone = newPhone.replace(/\D/g, '');
    // Ensure prefix has + sign
    const prefix = newPhonePrefix.startsWith('+') ? newPhonePrefix : '+' + newPhonePrefix;
    const fullPhone = prefix + cleanPhone;
    
    // If phone is the same as current, accept immediately without OTP
    const currentPrefix = customer.phonePrefix || '+39';
    const currentPhone = customer.phone || '';
    if (prefix === currentPrefix && cleanPhone === currentPhone) {
      return res.json({ success: true, samePhone: true, message: "Numero di telefono già corretto" });
    }
    
    // Check if MSG91 is configured
    if (!isMSG91Configured()) {
      return res.status(503).json({ message: "Servizio OTP non configurato" });
    }
    
    // Check if this phone is already used by another customer
    const existingCustomers = await db.select()
      .from(siaeCustomers)
      .where(sql`${siaeCustomers.phone} LIKE ${'%' + cleanPhone.slice(-9)}`);
    
    const otherCustomer = existingCustomers.find(c => c.id !== customer.id);
    if (otherCustomer) {
      return res.status(400).json({ message: "Questo numero è già utilizzato da un altro account" });
    }
    
    // Send OTP to new phone
    const otpResult = await sendMSG91OTP(fullPhone);
    
    if (!otpResult.success) {
      console.error(`[CUSTOMER-PHONE] Failed to send OTP to ${fullPhone}:`, otpResult.message);
      return res.status(500).json({ message: "Errore nell'invio del codice OTP" });
    }
    
    // Store pending change with separate prefix and phone
    pendingCustomerPhoneChanges.set(customer.id, {
      newPhonePrefix: prefix,
      newPhone: cleanPhone,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    console.log(`[CUSTOMER-PHONE] OTP sent to ${fullPhone} for customer ${customer.id}`);
    res.json({ success: true, message: "Codice OTP inviato al nuovo numero" });
  } catch (error: any) {
    console.error("[CUSTOMER-PHONE] Error requesting phone change:", error);
    res.status(500).json({ message: error.message });
  }
});

// Verify OTP and complete phone change
router.post("/api/public/customers/phone/verify-change", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    const { otp } = req.body;
    
    if (!otp || otp.length < 4) {
      return res.status(400).json({ message: "Codice OTP non valido" });
    }
    
    // Get pending change
    const pendingChange = pendingCustomerPhoneChanges.get(customer.id);
    if (!pendingChange) {
      return res.status(400).json({ message: "Nessuna richiesta di cambio numero in corso. Richiedi prima l'OTP." });
    }
    
    if (pendingChange.expiresAt < new Date()) {
      pendingCustomerPhoneChanges.delete(customer.id);
      return res.status(400).json({ message: "Codice OTP scaduto. Richiedi un nuovo codice." });
    }
    
    // Verify OTP with full phone number
    const fullPhone = pendingChange.newPhonePrefix + pendingChange.newPhone;
    const verifyResult = await verifyMSG91OTP(fullPhone, otp);
    
    if (!verifyResult.success) {
      return res.status(400).json({ message: "Codice OTP non valido" });
    }
    
    // Update phone number with separate prefix and phone
    const [updated] = await db.update(siaeCustomers)
      .set({
        phonePrefix: pendingChange.newPhonePrefix,
        phone: pendingChange.newPhone,
        phoneVerified: true,
        updatedAt: new Date()
      })
      .where(eq(siaeCustomers.id, customer.id))
      .returning();
    
    // Also update identity if linked (for unified identity matching)
    if (customer.identityId) {
      const { identities } = await import("@shared/schema");
      await db.update(identities)
        .set({
          phone: pendingChange.newPhone,
          phonePrefix: pendingChange.newPhonePrefix,
          phoneNormalized: fullPhone,
          phoneVerified: true,
          updatedAt: new Date()
        })
        .where(eq(identities.id, customer.identityId));
      console.log(`[CUSTOMER-PHONE] Identity ${customer.identityId} updated with new phone ${fullPhone}`);
    }
    
    // Clean up
    pendingCustomerPhoneChanges.delete(customer.id);
    
    console.log(`[CUSTOMER-PHONE] Phone updated for customer ${customer.id} to ${fullPhone}`);
    res.json({ 
      success: true, 
      message: "Numero di telefono aggiornato con successo",
      phonePrefix: updated.phonePrefix,
      phone: updated.phone
    });
  } catch (error: any) {
    console.error("[CUSTOMER-PHONE] Error verifying phone change:", error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== CARRELLO ====================

// Ottieni carrello
router.get("/api/public/cart", async (req, res) => {
  try {
    const sessionId = getOrCreateSessionId(req, res);

    const items = await db
      .select({
        id: publicCartItems.id,
        ticketedEventId: publicCartItems.ticketedEventId,
        itemType: publicCartItems.itemType,
        sectorId: publicCartItems.sectorId,
        subscriptionTypeId: publicCartItems.subscriptionTypeId,
        seatId: publicCartItems.seatId,
        quantity: publicCartItems.quantity,
        ticketType: publicCartItems.ticketType,
        unitPrice: publicCartItems.unitPrice,
        participantFirstName: publicCartItems.participantFirstName,
        participantLastName: publicCartItems.participantLastName,
        reservedUntil: publicCartItems.reservedUntil,
        eventName: events.name,
        eventStart: events.startDatetime,
        sectorName: siaeEventSectors.name,
        subscriptionName: siaeSubscriptionTypes.name,
        locationName: locations.name,
      })
      .from(publicCartItems)
      .innerJoin(siaeTicketedEvents, eq(publicCartItems.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .leftJoin(siaeEventSectors, eq(publicCartItems.sectorId, siaeEventSectors.id))
      .leftJoin(siaeSubscriptionTypes, eq(publicCartItems.subscriptionTypeId, siaeSubscriptionTypes.id))
      .where(eq(publicCartItems.sessionId, sessionId));

    // Calcola totale
    const total = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

    res.json({
      items,
      total,
      itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error: any) {
    console.error("[PUBLIC] Cart error:", error);
    res.status(500).json({ message: "Errore nel caricamento carrello" });
  }
});

// Aggiungi al carrello
router.post("/api/public/cart/add", async (req, res) => {
  try {
    const sessionId = getOrCreateSessionId(req, res);
    const {
      ticketedEventId,
      sectorId,
      seatId,
      subscriptionTypeId,
      quantity = 1,
      ticketType = "intero",
      participantFirstName,
      participantLastName,
    } = req.body;

    // Se è un abbonamento
    if (subscriptionTypeId) {
      const [subscriptionType] = await db
        .select()
        .from(siaeSubscriptionTypes)
        .where(eq(siaeSubscriptionTypes.id, subscriptionTypeId));

      if (!subscriptionType) {
        return res.status(404).json({ message: "Tipo abbonamento non trovato" });
      }

      if (!subscriptionType.active) {
        return res.status(400).json({ message: "Abbonamento non disponibile" });
      }

      // Verifica disponibilità
      if (subscriptionType.maxQuantity && subscriptionType.soldCount >= subscriptionType.maxQuantity) {
        return res.status(400).json({ message: "Abbonamenti esauriti" });
      }

      // Verifica periodo di validità
      const now = new Date();
      if (subscriptionType.validFrom && now < new Date(subscriptionType.validFrom)) {
        return res.status(400).json({ message: "Vendita abbonamenti non ancora iniziata" });
      }
      if (subscriptionType.validTo && now > new Date(subscriptionType.validTo)) {
        return res.status(400).json({ message: "Vendita abbonamenti terminata" });
      }

      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);

      const [cartItem] = await db
        .insert(publicCartItems)
        .values({
          sessionId,
          ticketedEventId: subscriptionType.ticketedEventId,
          itemType: 'subscription',
          subscriptionTypeId,
          quantity,
          ticketType: 'abbonamento',
          unitPrice: subscriptionType.price,
          participantFirstName,
          participantLastName,
          reservedUntil,
        })
        .returning();

      return res.json(cartItem);
    }

    // Altrimenti è un biglietto normale
    if (!sectorId) {
      return res.status(400).json({ message: "Settore richiesto per biglietti" });
    }

    // Verifica evento e settore
    const [sector] = await db
      .select()
      .from(siaeEventSectors)
      .where(eq(siaeEventSectors.id, sectorId));

    if (!sector) {
      return res.status(404).json({ message: "Settore non trovato" });
    }

    // Verifica disponibilità
    if (!sector.isNumbered && sector.availableSeats < quantity) {
      return res.status(400).json({ message: "Posti insufficienti" });
    }

    // Calcola prezzo
    let unitPrice = Number(sector.priceIntero);
    if (ticketType === "ridotto" && sector.priceRidotto) {
      unitPrice = Number(sector.priceRidotto);
    }

    // Se posto numerato, verifica disponibilità
    if (sector.isNumbered && seatId) {
      const [seat] = await db
        .select()
        .from(siaeSeats)
        .where(eq(siaeSeats.id, seatId));

      if (!seat || seat.status !== "available") {
        return res.status(400).json({ message: "Posto non disponibile" });
      }

      // Riserva posto
      await db
        .update(siaeSeats)
        .set({ status: "reserved" })
        .where(eq(siaeSeats.id, seatId));
    }

    // Aggiungi al carrello
    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti

    const [cartItem] = await db
      .insert(publicCartItems)
      .values({
        sessionId,
        ticketedEventId,
        itemType: 'ticket',
        sectorId,
        seatId,
        quantity: sector.isNumbered ? 1 : quantity,
        ticketType,
        unitPrice: unitPrice.toString(),
        participantFirstName,
        participantLastName,
        reservedUntil,
      })
      .returning();

    res.json(cartItem);
  } catch (error: any) {
    console.error("[PUBLIC] Add to cart error:", error);
    res.status(500).json({ message: "Errore nell'aggiunta al carrello" });
  }
});

// Rimuovi dal carrello
router.delete("/api/public/cart/:itemId", async (req, res) => {
  try {
    const sessionId = getOrCreateSessionId(req, res);
    const { itemId } = req.params;

    // Trova item
    const [item] = await db
      .select()
      .from(publicCartItems)
      .where(
        and(eq(publicCartItems.id, itemId), eq(publicCartItems.sessionId, sessionId))
      );

    if (!item) {
      return res.status(404).json({ message: "Articolo non trovato" });
    }

    // Libera posto se numerato
    if (item.seatId) {
      await db
        .update(siaeSeats)
        .set({ status: "available" })
        .where(eq(siaeSeats.id, item.seatId));
    }

    // Rimuovi dal carrello
    await db.delete(publicCartItems).where(eq(publicCartItems.id, itemId));

    res.json({ message: "Articolo rimosso" });
  } catch (error: any) {
    console.error("[PUBLIC] Remove from cart error:", error);
    res.status(500).json({ message: "Errore nella rimozione" });
  }
});

// Svuota carrello
router.delete("/api/public/cart", async (req, res) => {
  try {
    const sessionId = getOrCreateSessionId(req, res);

    // Trova tutti gli item con posti numerati
    const items = await db
      .select()
      .from(publicCartItems)
      .where(eq(publicCartItems.sessionId, sessionId));

    // Libera posti
    for (const item of items) {
      if (item.seatId) {
        await db
          .update(siaeSeats)
          .set({ status: "available" })
          .where(eq(siaeSeats.id, item.seatId));
      }
    }

    // Svuota carrello
    await db.delete(publicCartItems).where(eq(publicCartItems.sessionId, sessionId));

    res.json({ message: "Carrello svuotato" });
  } catch (error: any) {
    console.error("[PUBLIC] Clear cart error:", error);
    res.status(500).json({ message: "Errore nello svuotamento carrello" });
  }
});

// ==================== CAPTCHA ====================

// Generate CAPTCHA for ticket purchase protection
router.get("/api/public/captcha/generate", async (req, res) => {
  try {
    // Fetch CAPTCHA config from siaeSystemConfig
    const [config] = await db.select().from(siaeSystemConfig).limit(1);
    const captchaEnabled = config?.captchaEnabled ?? true;
    const captchaMinChars = config?.captchaMinChars ?? 5;
    const captchaImageWidth = config?.captchaImageWidth ?? 200;
    const captchaImageHeight = config?.captchaImageHeight ?? 60;
    const captchaDistortion = config?.captchaDistortion ?? 'medium';

    // Generate CAPTCHA
    const captcha = svgCaptcha.create({
      size: captchaMinChars,
      width: captchaImageWidth,
      height: captchaImageHeight,
      noise: captchaDistortion === 'high' ? 3 : captchaDistortion === 'medium' ? 2 : 1,
      color: true,
      background: '#f0f0f0',
    });

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");

    // Store CAPTCHA with 5 minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    captchaStore.set(token, {
      text: captcha.text,
      expiresAt,
    });

    res.json({
      token,
      svg: captcha.data,
      width: captchaImageWidth,
      height: captchaImageHeight,
      enabled: captchaEnabled,
    });
  } catch (error: any) {
    console.error("[PUBLIC] CAPTCHA generate error:", error);
    res.status(500).json({ message: "Errore nella generazione CAPTCHA" });
  }
});

// Validate CAPTCHA
router.post("/api/public/captcha/validate", async (req, res) => {
  try {
    const { token, text } = req.body;

    if (!token || !text) {
      return res.status(400).json({ valid: false, message: "Token e testo richiesti" });
    }

    const captchaData = captchaStore.get(token);

    if (!captchaData) {
      return res.json({ valid: false, message: "CAPTCHA non trovato o scaduto" });
    }

    if (captchaData.expiresAt < new Date()) {
      captchaStore.delete(token);
      return res.json({ valid: false, message: "CAPTCHA scaduto" });
    }

    // Case-insensitive validation
    const isValid = captchaData.text.toLowerCase() === text.toLowerCase();

    if (isValid) {
      // Mark as validated but DON'T delete - will be deleted after payment intent creation
      captchaData.validated = true;
      captchaStore.set(token, captchaData);
      res.json({ valid: true, token: token });
    } else {
      // Delete invalid CAPTCHA so user gets a fresh one
      captchaStore.delete(token);
      res.json({ valid: false, message: "CAPTCHA non corretto" });
    }
  } catch (error: any) {
    console.error("[PUBLIC] CAPTCHA validate error:", error);
    res.status(500).json({ valid: false, message: "Errore nella validazione CAPTCHA" });
  }
});

// ==================== CHECKOUT ====================

// Verifica disponibilità sigilli fiscali (da chiamare prima del checkout)
router.get("/api/public/checkout/seal-status", async (req, res) => {
  try {
    const bridgeConnected = isBridgeConnected();
    const cardReadiness = isCardReadyForSeals();
    
    res.json({
      available: bridgeConnected && cardReadiness.ready,
      bridgeConnected,
      cardReady: cardReadiness.ready,
      error: !bridgeConnected 
        ? "Sistema sigilli fiscali offline. L'app desktop Event4U deve essere connessa."
        : !cardReadiness.ready 
          ? cardReadiness.error 
          : null
    });
  } catch (error: any) {
    console.error("[PUBLIC] Seal status check error:", error);
    res.json({
      available: false,
      bridgeConnected: false,
      cardReady: false,
      error: "Errore verifica disponibilità sigilli"
    });
  }
});

// Ottieni Stripe publishable key
router.get("/api/public/stripe-key", async (req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error: any) {
    console.error("[PUBLIC] Stripe key error:", error);
    res.status(500).json({ message: "Errore nel caricamento configurazione pagamento" });
  }
});

// Ottieni Stripe mode (production/sandbox) basato sulle chiavi
router.get("/api/public/stripe-mode", async (req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    const isProduction = publishableKey.startsWith('pk_live_');
    res.json({ 
      mode: isProduction ? 'production' : 'sandbox',
      isProduction 
    });
  } catch (error: any) {
    console.error("[PUBLIC] Stripe mode error:", error);
    res.json({ mode: 'sandbox', isProduction: false });
  }
});

// Crea payment intent per checkout personalizzato
router.post("/api/public/checkout/create-payment-intent", async (req, res) => {
  try {
    const sessionId = getOrCreateSessionId(req, res);
    const { captchaToken, captchaText } = req.body;
    let customer = await getAuthenticatedCustomer(req);

    if (!customer) {
      return res.status(401).json({ message: "Devi essere autenticato per procedere al pagamento" });
    }

    // Validate CAPTCHA if enabled
    const [captchaConfig] = await db.select().from(siaeSystemConfig).limit(1);
    const captchaEnabled = captchaConfig?.captchaEnabled ?? true;

    if (captchaEnabled) {
      if (!captchaToken) {
        return res.status(400).json({ 
          message: "CAPTCHA richiesto per procedere al pagamento",
          code: "CAPTCHA_REQUIRED"
        });
      }

      const captchaData = captchaStore.get(captchaToken);

      if (!captchaData) {
        return res.status(400).json({ 
          message: "CAPTCHA non trovato o scaduto. Riprova.",
          code: "CAPTCHA_EXPIRED"
        });
      }

      if (captchaData.expiresAt < new Date()) {
        captchaStore.delete(captchaToken);
        return res.status(400).json({ 
          message: "CAPTCHA scaduto. Riprova.",
          code: "CAPTCHA_EXPIRED"
        });
      }

      // Check that the CAPTCHA was previously validated via /captcha/validate endpoint
      if (!captchaData.validated) {
        return res.status(400).json({ 
          message: "CAPTCHA non validato. Clicca Verifica prima di procedere.",
          code: "CAPTCHA_NOT_VALIDATED"
        });
      }

      // Delete token after successful check (one-time use after validation)
      captchaStore.delete(captchaToken);

      console.log("[PUBLIC] CAPTCHA validation passed (pre-validated)");
    }

    // CRITICAL: Verifica smart card SIAE PRIMA di creare il payment intent
    // Non permettiamo pagamenti se non possiamo emettere sigilli fiscali
    // Uso versione async che richiede uno status fresco dal bridge se necessario
    const cardReadiness = await ensureCardReadyForSeals();
    if (!cardReadiness.ready) {
      console.log(`[PUBLIC] Create payment intent blocked: Card not ready - ${cardReadiness.error}`);
      
      // Determina il codice errore appropriato
      const errorCode = !isBridgeConnected() ? "SEAL_BRIDGE_OFFLINE" : "SEAL_CARD_NOT_READY";
      const errorMessage = !isBridgeConnected() 
        ? "Sistema sigilli fiscali non disponibile. L'app desktop Event4U deve essere connessa con la smart card SIAE inserita."
        : `Smart card SIAE non pronta: ${cardReadiness.error}`;
      
      return res.status(503).json({ 
        message: errorMessage,
        code: errorCode
      });
    }
    
    console.log("[PUBLIC] Smart card check passed, proceeding with payment intent creation");

    // Se l'utente non ha un profilo SIAE, crealo automaticamente
    if (customer._isUserWithoutSiaeProfile && customer.userId) {
      // Create identity first
      const { identity } = await findOrCreateIdentity({
        phone: customer.phone || '0000000000', // placeholder if no phone
        firstName: customer.firstName || 'Unknown',
        lastName: customer.lastName || 'User',
        email: customer.email,
      });
      
      const uniqueCode = `CL${Date.now().toString(36).toUpperCase()}`;
      const [newCustomer] = await db
        .insert(siaeCustomers)
        .values({
          identityId: identity.id,
          uniqueCode,
          userId: customer.userId,
          email: customer.email,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phone: customer.phone || '0000000000',
          phoneVerified: !!customer.phone, // Se ha telefono, consideralo verificato
          emailVerified: true, // Email già verificata durante registrazione
          registrationCompleted: true,
          isActive: true,
          authenticationType: 'unified',
          registrationIp: req.ip,
        })
        .returning();
      
      customer = newCustomer;
      console.log(`[PUBLIC] Auto-created SIAE profile for user ${customer.userId}: ${newCustomer.id}`);
    }

    // Carica carrello con info evento per ottenere companyId
    const items = await db
      .select({
        item: publicCartItems,
        companyId: siaeTicketedEvents.companyId,
      })
      .from(publicCartItems)
      .innerJoin(siaeTicketedEvents, eq(publicCartItems.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(publicCartItems.sessionId, sessionId));

    if (items.length === 0) {
      return res.status(400).json({ message: "Carrello vuoto" });
    }

    // Tutti gli items devono essere della stessa company
    const companyId = items[0].companyId;
    const allSameCompany = items.every(i => i.companyId === companyId);
    if (!allSameCompany) {
      return res.status(400).json({ message: "Non puoi acquistare biglietti di organizzatori diversi nello stesso ordine" });
    }

    // Calcola subtotale (prezzo biglietti)
    const subtotal = items.reduce((sum, { item }) => sum + Number(item.unitPrice) * item.quantity, 0);
    
    // Carica profilo commissioni e calcola sempre la commissione (per entrambe le modalità)
    let commissionAmount = 0;
    let commissionProfile = null;
    
    try {
      commissionProfile = await CommissionService.getCommissionProfile(companyId);
      
      if (commissionProfile) {
        // Calcola sempre la commissione per ogni item (canale online)
        for (const { item } of items) {
          const itemTotal = Number(item.unitPrice) * item.quantity;
          const itemCommission = CommissionService.calculateCommission('online', itemTotal, commissionProfile);
          commissionAmount += itemCommission;
        }
        console.log(`[PUBLIC] Commission calculated: ${commissionAmount.toFixed(2)} EUR, feePayer: ${commissionProfile.feePayer}`);
      }
    } catch (err) {
      console.error("[PUBLIC] Error loading commission profile:", err);
    }
    
    // Totale finale = subtotale + commissioni (solo se a carico cliente)
    const feePayer = commissionProfile?.feePayer || 'organizer';
    const customerPaysCommission = feePayer === 'customer';
    const total = subtotal + (customerPaysCommission ? commissionAmount : 0);
    const totalInCents = Math.round(total * 100);

    // Crea payment intent con Stripe
    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalInCents,
      currency: "eur",
      metadata: {
        customerId: customer.id,
        sessionId,
        itemsCount: items.length.toString(),
        subtotal: subtotal.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        feePayer,
      },
    });

    // Estrai solo gli items per il cartSnapshot (rimuovi companyId join)
    const cartItems = items.map(({ item }) => item);

    // Salva checkout session
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minuti

    const [checkoutSession] = await db
      .insert(publicCheckoutSessions)
      .values({
        sessionId,
        customerId: customer.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
        totalAmount: total.toString(),
        currency: "EUR",
        status: "pending",
        cartSnapshot: cartItems,
        customerIp: req.ip,
        customerUserAgent: req.headers["user-agent"],
        expiresAt,
      })
      .returning();

    res.json({
      clientSecret: paymentIntent.client_secret,
      checkoutSessionId: checkoutSession.id,
      total,
      subtotal,
      commissionAmount: customerPaysCommission ? commissionAmount : 0, // Solo se a carico cliente
      feePayer,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Create payment intent error:", error);
    res.status(500).json({ message: "Errore nella creazione del pagamento" });
  }
});

// Conferma pagamento e genera biglietti
router.post("/api/public/checkout/confirm", async (req, res) => {
  try {
    const { paymentIntentId, checkoutSessionId } = req.body;
    const customer = await getAuthenticatedCustomer(req);

    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    // Verifica checkout session
    const [checkoutSession] = await db
      .select()
      .from(publicCheckoutSessions)
      .where(eq(publicCheckoutSessions.id, checkoutSessionId));

    if (!checkoutSession || checkoutSession.customerId !== customer.id) {
      return res.status(404).json({ message: "Sessione checkout non trovata" });
    }

    if (checkoutSession.status === "completed") {
      return res.status(400).json({ message: "Pagamento già completato" });
    }

    if (checkoutSession.status === "processing") {
      return res.status(400).json({ message: "Pagamento in elaborazione, attendere", code: "PROCESSING" });
    }

    if (checkoutSession.status === "refunded") {
      return res.status(400).json({ message: "Pagamento già stornato", code: "ALREADY_REFUNDED" });
    }

    // IDEMPOTENZA: Marca subito come "processing" per evitare richieste duplicate
    const [updatedSession] = await db
      .update(publicCheckoutSessions)
      .set({ status: "processing" })
      .where(and(
        eq(publicCheckoutSessions.id, checkoutSessionId),
        eq(publicCheckoutSessions.status, "pending") // Solo se ancora pending
      ))
      .returning();

    if (!updatedSession) {
      // Un'altra richiesta ha già preso il lock
      return res.status(400).json({ message: "Pagamento già in elaborazione", code: "ALREADY_PROCESSING" });
    }

    // Verifica payment intent con Stripe
    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Pagamento non completato" });
    }

    // CRITICAL: Verifica che la smart card SIAE sia disponibile
    // Se il pagamento è già andato a buon fine ma la smart card non è pronta, STORNIAMO
    const bridgeConnected = isBridgeConnected();
    const cardReadiness = isCardReadyForSeals();

    if (!bridgeConnected || !cardReadiness.ready) {
      const errorReason = !bridgeConnected 
        ? "Desktop bridge non connesso" 
        : `Smart card non pronta: ${cardReadiness.error}`;
      
      console.log(`[PUBLIC] Checkout confirm failed after payment: ${errorReason}`);
      console.log(`[PUBLIC] Payment already succeeded, initiating refund for ${paymentIntentId}`);
      
      try {
        // STORNO AUTOMATICO - il pagamento è già completato ma non possiamo emettere sigilli
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
          metadata: {
            reason: 'fiscal_seal_unavailable_at_confirm',
            error: errorReason,
          }
        });
        
        console.log(`[PUBLIC] Refund created successfully: ${refund.id}, status: ${refund.status}`);
        
        // Aggiorna checkout session come stornata
        await db
          .update(publicCheckoutSessions)
          .set({
            status: "refunded",
            refundId: refund.id,
            refundReason: `Sigillo fiscale non disponibile al momento della conferma: ${errorReason}`,
          })
          .where(eq(publicCheckoutSessions.id, checkoutSessionId));
        
        return res.status(503).json({ 
          message: `Sistema sigilli fiscali non disponibile. Il pagamento è stato stornato automaticamente. ${!bridgeConnected ? "L'app desktop Event4U deve essere connessa." : ""}`,
          code: !bridgeConnected ? "SEAL_BRIDGE_OFFLINE_REFUNDED" : "SEAL_CARD_NOT_READY_REFUNDED",
          refunded: true,
          refundId: refund.id,
        });
        
      } catch (refundError: any) {
        console.error(`[PUBLIC] Failed to refund payment on confirm:`, refundError.message);
        
        // Se lo storno fallisce, segna come pending per gestione manuale
        await db
          .update(publicCheckoutSessions)
          .set({
            status: "refund_pending",
            refundReason: `Sigillo non disponibile: ${errorReason}. Storno fallito: ${refundError.message}`,
          })
          .where(eq(publicCheckoutSessions.id, checkoutSessionId));
        
        return res.status(503).json({ 
          message: `Errore critico: sigillo fiscale non disponibile e storno fallito. Contatta l'assistenza per il rimborso.`,
          code: "SEAL_ERROR_REFUND_FAILED",
          refunded: false,
        });
      }
    }

    // Genera transazione SIAE
    const cartItems = checkoutSession.cartSnapshot as any[];
    if (!cartItems || cartItems.length === 0) {
      console.error("[PUBLIC] Cart items empty in checkout session");
      throw new Error("Carrello vuoto nella sessione checkout");
    }
    const firstItem = cartItems[0];
    console.log(`[PUBLIC] Processing checkout with ${cartItems.length} cart items, first item ticketedEventId: ${firstItem.ticketedEventId}`);

    // Ottieni evento per la transazione
    const [ticketedEvent] = await db
      .select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, firstItem.ticketedEventId));

    if (!ticketedEvent) {
      console.error(`[PUBLIC] Ticketed event not found: ${firstItem.ticketedEventId}`);
      throw new Error(`Evento non trovato: ${firstItem.ticketedEventId}`);
    }
    console.log(`[PUBLIC] Found ticketed event: ${ticketedEvent.id}, companyId: ${ticketedEvent.companyId}`);

    // Ottieni canale emissione (online)
    const [emissionChannel] = await db
      .select()
      .from(siaeEmissionChannels)
      .where(eq(siaeEmissionChannels.companyId, ticketedEvent.companyId))
      .limit(1);

    // Crea transazione
    const [transaction] = await db
      .insert(siaeTransactions)
      .values({
        transactionCode: generateTransactionCode(),
        ticketedEventId: ticketedEvent.id,
        customerId: customer.id,
        emissionChannelCode: emissionChannel?.channelCode || "WEB",
        customerUniqueCode: customer.uniqueCode,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        transactionIp: req.ip,
        paymentCompletedAt: new Date(),
        paymentMethod: "card",
        paymentReference: paymentIntentId,
        totalAmount: checkoutSession.totalAmount,
        ticketsCount: cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        deliveryMethod: "email",
        status: "completed",
      })
      .returning();

    // Genera biglietti e/o abbonamenti
    const tickets: any[] = [];
    const subscriptions: any[] = [];

    for (const item of cartItems) {
      // Handle subscription items
      if (item.itemType === 'subscription' && item.subscriptionTypeId) {
        console.log(`[PUBLIC] Processing subscription item: subscriptionTypeId=${item.subscriptionTypeId}, quantity=${item.quantity}`);
        
        const [subscriptionType] = await db
          .select()
          .from(siaeSubscriptionTypes)
          .where(eq(siaeSubscriptionTypes.id, item.subscriptionTypeId));

        if (!subscriptionType) {
          console.error(`[PUBLIC] Subscription type not found: ${item.subscriptionTypeId}`);
          throw new Error(`Tipo abbonamento non trovato: ${item.subscriptionTypeId}`);
        }

        // Get activation card for fiscal seal
        const [subCard] = await db
          .select()
          .from(siaeActivationCards)
          .where(
            and(
              eq(siaeActivationCards.companyId, ticketedEvent.companyId),
              eq(siaeActivationCards.status, "active")
            )
          )
          .limit(1);

        // FIX ISSUE 2: Get max progressive number BEFORE the loop to avoid race conditions
        // FOR UPDATE in subquery doesn't work without explicit transaction, so we query once and increment locally
        const [maxProgressiveResult] = await db
          .select({ maxNum: sql<number>`COALESCE(MAX(progressive_number), 0)` })
          .from(siaeSubscriptions)
          .where(eq(siaeSubscriptions.companyId, ticketedEvent.companyId));
        
        let subscriptionProgressiveCounter = (maxProgressiveResult?.maxNum || 0);

        // Create subscription records
        for (let i = 0; i < item.quantity; i++) {
          // Generate subscription code and QR code
          const subscriptionCode = `ABO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const qrCode = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

          // Calculate rateo per event (total price / events count)
          const priceValue = parseFloat(subscriptionType.price);
          const rateoPerEvent = (priceValue / subscriptionType.eventsCount).toFixed(2);
          const ivaRate = parseFloat(subscriptionType.ivaRate || '22');
          const rateoVat = (parseFloat(rateoPerEvent) * ivaRate / 100).toFixed(2);

          // Request SIAE fiscal seal for subscription - REQUIRED for SIAE compliance
          const priceInCents = Math.round(priceValue * 100);
          // FIX ISSUE 3: Declare sealData properly - will be assigned in try, catch always returns
          let sealData: FiscalSealData | null = null;
          try {
            console.log(`[PUBLIC] Requesting fiscal seal for subscription ${i + 1}/${item.quantity}, price: ${priceInCents} cents`);
            sealData = await requestFiscalSeal(priceInCents);
            console.log(`[PUBLIC] Subscription seal received: ${sealData.sealCode}, counter: ${sealData.counter}`);
          } catch (sealError: any) {
            console.error(`[PUBLIC] Failed to get fiscal seal for subscription:`, sealError.message);
            
            // CRITICAL: If seal fails AFTER payment, we must REFUND - same as ticket flow
            // Without a fiscal seal, we cannot issue SIAE-compliant subscriptions
            try {
              console.log(`[PUBLIC] Initiating refund for payment intent ${paymentIntentId} due to subscription seal failure`);
              const stripe = await getUncachableStripeClient();
              
              const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                reason: 'requested_by_customer',
                metadata: {
                  reason: 'fiscal_seal_unavailable_subscription',
                  sealError: sealError.message,
                  subscriptionsCreated: subscriptions.length.toString(),
                  ticketsCreated: tickets.length.toString(),
                }
              });
              
              console.log(`[PUBLIC] Refund created successfully: ${refund.id}, status: ${refund.status}`);
              
              await db
                .update(publicCheckoutSessions)
                .set({
                  status: "refunded",
                  refundId: refund.id,
                  refundReason: `Sigillo fiscale abbonamento non disponibile: ${sealError.message}`,
                })
                .where(eq(publicCheckoutSessions.id, checkoutSessionId));
              
              // Cancel any already-created subscriptions
              if (subscriptions.length > 0) {
                for (const createdSub of subscriptions) {
                  await db
                    .update(siaeSubscriptions)
                    .set({ status: "cancelled" })
                    .where(eq(siaeSubscriptions.id, createdSub.id));
                }
                console.log(`[PUBLIC] Cancelled ${subscriptions.length} subscriptions due to seal failure`);
              }
              
              // Cancel any already-created tickets
              if (tickets.length > 0) {
                for (const createdTicket of tickets) {
                  await db
                    .update(siaeTickets)
                    .set({ status: "cancelled" })
                    .where(eq(siaeTickets.id, createdTicket.id));
                }
                console.log(`[PUBLIC] Cancelled ${tickets.length} tickets due to subscription seal failure`);
              }
              
              return res.status(503).json({
                message: `Impossibile generare sigillo fiscale per abbonamento. Il pagamento è stato stornato automaticamente.`,
                code: 'SEAL_ERROR_REFUNDED',
                refunded: true,
                refundId: refund.id,
              });
              
            } catch (refundError: any) {
              console.error(`[PUBLIC] Failed to refund payment for subscription:`, refundError.message);
              
              await db
                .update(publicCheckoutSessions)
                .set({
                  status: "refund_pending",
                  refundReason: `Sigillo abbonamento non disponibile: ${sealError.message}. Storno fallito: ${refundError.message}`,
                })
                .where(eq(publicCheckoutSessions.id, checkoutSessionId));
              
              return res.status(503).json({
                message: `Errore critico: sigillo fiscale non disponibile e storno fallito. Contatta l'assistenza per il rimborso.`,
                code: 'SEAL_ERROR_REFUND_FAILED',
                refunded: false,
                subscriptionsCreated: subscriptions.length,
                ticketsCreated: tickets.length,
              });
            }
          }

          // FIX ISSUE 3: If sealData is null after try-catch, something went wrong (should not happen since catch returns)
          if (!sealData) {
            throw new Error('Seal data not available - this should not happen as catch block always returns');
          }

          // FIX ISSUE 2: Increment local counter for each subscription in this batch
          subscriptionProgressiveCounter++;

          // Insert subscription with progressive number from local counter
          const [subscription] = await db
            .insert(siaeSubscriptions)
            .values({
              companyId: ticketedEvent.companyId,
              customerId: customer.id,
              subscriptionCode,
              progressiveNumber: subscriptionProgressiveCounter,
              turnType: subscriptionType.turnType || 'F',
              eventsCount: subscriptionType.eventsCount,
              eventsUsed: 0,
              validFrom: subscriptionType.validFrom || new Date(),
              validTo: subscriptionType.validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              totalAmount: subscriptionType.price,
              rateoPerEvent,
              rateoVat,
              holderFirstName: item.participantFirstName || customer.firstName,
              holderLastName: item.participantLastName || customer.lastName,
              status: 'active',
              qrCode,
              fiscalSealId: sealData.sealNumber || null,
              fiscalSealCode: sealData.sealCode,
              fiscalSealCounter: sealData.counter,
              cardCode: subCard?.cardCode || sealData.serialNumber || null,
              emissionChannelCode: 'WEB',
              emissionDate: new Date(),
              ticketedEventId: ticketedEvent.id,
              subscriptionTypeId: subscriptionType.id,
            })
            .returning();

          // Aggiorna qrCode con formato scannable (SIAE-SUB-{subscriptionId}) come per i biglietti
          const scannableQrCode = `SIAE-SUB-${subscription.id}`;
          await db
            .update(siaeSubscriptions)
            .set({ qrCode: scannableQrCode })
            .where(eq(siaeSubscriptions.id, subscription.id));
          
          // Aggiorna subscription locale con qrCode scannable
          subscription.qrCode = scannableQrCode;

          subscriptions.push(subscription);
          console.log(`[PUBLIC] Created subscription: ${subscriptionCode}, QR: ${scannableQrCode}, progressiveNumber: ${subscription.progressiveNumber}, seal: ${sealData.sealCode}`);
        }

        // Update subscription type sold count
        await db
          .update(siaeSubscriptionTypes)
          .set({
            soldCount: sql`${siaeSubscriptionTypes.soldCount} + ${item.quantity}`,
          })
          .where(eq(siaeSubscriptionTypes.id, item.subscriptionTypeId));

        continue; // Skip ticket processing for subscription items
      }

      // Handle ticket items (existing logic)
      console.log(`[PUBLIC] Processing cart item: sectorId=${item.sectorId}, quantity=${item.quantity}`);
      
      const [sector] = await db
        .select()
        .from(siaeEventSectors)
        .where(eq(siaeEventSectors.id, item.sectorId));

      if (!sector) {
        console.error(`[PUBLIC] Sector not found: ${item.sectorId}`);
        throw new Error(`Settore non trovato: ${item.sectorId}`);
      }

      // Ottieni carta attivazione per sigillo
      const [card] = await db
        .select()
        .from(siaeActivationCards)
        .where(
          and(
            eq(siaeActivationCards.companyId, ticketedEvent.companyId),
            eq(siaeActivationCards.status, "active")
          )
        )
        .limit(1);
      
      if (!card) {
        console.log(`[PUBLIC] No active activation card found for company ${ticketedEvent.companyId}, will use bridge card`);
      }

      for (let i = 0; i < item.quantity; i++) {
        // RICHIEDI SIGILLO FISCALE REALE DALLA SMART CARD SIAE
        // Questo è il cuore del sistema - senza sigillo, niente biglietto
        const priceInCents = Math.round(parseFloat(item.unitPrice) * 100);
        
        let sealData: FiscalSealData;
        try {
          console.log(`[PUBLIC] Requesting fiscal seal for ticket ${i + 1}/${item.quantity}, price: ${priceInCents} cents`);
          sealData = await requestFiscalSeal(priceInCents);
          console.log(`[PUBLIC] Seal received: ${sealData.sealCode}, counter: ${sealData.counter}`);
        } catch (sealError: any) {
          console.error(`[PUBLIC] Failed to get fiscal seal:`, sealError.message);
          
          // CRITICAL: Se il sigillo fallisce DOPO il pagamento, dobbiamo STORNARE il pagamento
          // Senza sigillo fiscale non possiamo emettere biglietti validi SIAE
          try {
            console.log(`[PUBLIC] Initiating refund for payment intent ${paymentIntentId} due to seal failure`);
            const stripe = await getUncachableStripeClient();
            
            // Storna l'intero importo
            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: 'requested_by_customer',
              metadata: {
                reason: 'fiscal_seal_unavailable',
                sealError: sealError.message,
                ticketsCreated: tickets.length.toString(),
              }
            });
            
            console.log(`[PUBLIC] Refund created successfully: ${refund.id}, status: ${refund.status}`);
            
            // Aggiorna checkout session come stornata
            await db
              .update(publicCheckoutSessions)
              .set({
                status: "refunded",
                refundId: refund.id,
                refundReason: `Sigillo fiscale non disponibile: ${sealError.message}`,
              })
              .where(eq(publicCheckoutSessions.id, checkoutSessionId));
            
            // Se abbiamo già creato alcuni biglietti prima del fallimento, li annulliamo
            if (tickets.length > 0) {
              for (const createdTicket of tickets) {
                await db
                  .update(siaeTickets)
                  .set({ status: "cancelled" })
                  .where(eq(siaeTickets.id, createdTicket.id));
              }
              console.log(`[PUBLIC] Cancelled ${tickets.length} tickets due to seal failure`);
            }
            
            return res.status(503).json({
              message: `Impossibile generare sigillo fiscale. Il pagamento è stato stornato automaticamente.`,
              code: 'SEAL_ERROR_REFUNDED',
              refunded: true,
              refundId: refund.id,
            });
            
          } catch (refundError: any) {
            console.error(`[PUBLIC] Failed to refund payment:`, refundError.message);
            
            // Se anche lo storno fallisce, segna come pending per gestione manuale
            await db
              .update(publicCheckoutSessions)
              .set({
                status: "refund_pending",
                refundReason: `Sigillo non disponibile: ${sealError.message}. Storno fallito: ${refundError.message}`,
              })
              .where(eq(publicCheckoutSessions.id, checkoutSessionId));
            
            return res.status(503).json({
              message: `Errore critico: sigillo fiscale non disponibile e storno fallito. Contatta l'assistenza per il rimborso.`,
              code: 'SEAL_ERROR_REFUND_FAILED',
              refunded: false,
              ticketsCreated: tickets.length,
            });
          }
        }

        const now = new Date();
        const emissionDateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const emissionTimeStr = now.toTimeString().slice(0, 5).replace(":", "");

        // Trova la carta nel database usando il serialNumber dal bridge
        let cardId = card?.id;
        if (!cardId && sealData.serialNumber) {
          console.log(`[PUBLIC] Looking up card by serialNumber: ${sealData.serialNumber}`);
          const [bridgeCard] = await db
            .select()
            .from(siaeActivationCards)
            .where(eq(siaeActivationCards.cardCode, sealData.serialNumber))
            .limit(1);
          
          if (bridgeCard) {
            cardId = bridgeCard.id;
            console.log(`[PUBLIC] Found card by serialNumber: ${cardId}`);
          } else {
            // Se la carta non esiste nel DB, creala automaticamente
            // FIX 2026-01-20: Usare resolveSystemCodeSafe per evitare errore SIAE 0600
            // Il default EVENT4U1 NON è registrato presso SIAE!
            const cachedEfff = getCachedEfffData();
            const systemCodeResult = resolveSystemCodeSafe(cachedEfff, { systemCode: process.env.SIAE_SYSTEM_CODE });
            if (!systemCodeResult.success || !systemCodeResult.systemCode) {
              throw new Error(`SIAE_SYSTEM_CODE_ERROR: ${systemCodeResult.error || 'Codice sistema SIAE non disponibile. Collegare la Smart Card o configurare il codice sistema.'}`);
            }
            const systemCode = systemCodeResult.systemCode;
            console.log(`[PUBLIC] Card not found, creating new card for serialNumber: ${sealData.serialNumber}, systemCode: ${systemCode} (source: ${systemCodeResult.source})`);
            const [newCard] = await db
              .insert(siaeActivationCards)
              .values({
                cardCode: sealData.serialNumber,
                systemCode: systemCode, // Usa systemId dalla smart card
                companyId: ticketedEvent.companyId,
                status: "active",
                activationDate: new Date(),
                progressiveCounter: sealData.counter,
              })
              .returning();
            cardId = newCard.id;
            console.log(`[PUBLIC] Created new card: ${cardId}`);
          }
        }

        if (!cardId) {
          throw new Error("Nessuna carta SIAE disponibile per generare il sigillo fiscale");
        }

        // Salva sigillo fiscale reale nel database
        const [fiscalSeal] = await db
          .insert(siaeFiscalSeals)
          .values({
            cardId: cardId,
            sealCode: sealData.sealCode,
            progressiveNumber: sealData.counter,
            emissionDate: now.toISOString().slice(5, 10).replace("-", ""),
            emissionTime: emissionTimeStr,
            amount: item.unitPrice.toString().padStart(8, "0"),
          })
          .returning();

        // Genera QR code con dati sigillo reale
        const qrData = JSON.stringify({
          seal: sealData.sealCode,
          sealNumber: sealData.sealNumber,
          serialNumber: sealData.serialNumber,
          counter: sealData.counter,
          event: ticketedEvent.siaeEventCode,
          sector: sector.sectorCode,
          mac: sealData.mac,
        });

        // Crea biglietto con sigillo fiscale REALE
        // Determina ticketType corretto per report C1
        const ticketType = item.ticketType || "intero";
        const ticketTypeCode = ticketType === "intero" ? "INT" : (ticketType === "ridotto" ? "RID" : "OMG");
        
        // Calcola progressivo sequenziale dell'evento (non il contatore della carta)
        // Il progressiveNumber deve essere sequenziale per l'evento, non basato sul contatore del sigillo
        const eventProgressiveNumber = (ticketedEvent.ticketsSold || 0) + tickets.length + 1;
        
        const [ticket] = await db
          .insert(siaeTickets)
          .values({
            ticketedEventId: ticketedEvent.id,
            sectorId: item.sectorId,
            transactionId: transaction.id,
            customerId: customer.id,
            fiscalSealId: fiscalSeal.id,
            fiscalSealCode: sealData.sealCode,
            fiscalSealCounter: sealData.counter, // Contatore carta SIAE
            progressiveNumber: eventProgressiveNumber, // Progressivo sequenziale dell'evento
            cardCode: sealData.serialNumber,
            emissionChannelCode: emissionChannel?.channelCode || "WEB",
            emissionDateStr,
            emissionTimeStr,
            ticketTypeCode: ticketTypeCode,
            ticketType: ticketType, // IMPORTANTE: per report C1
            sectorCode: sector.sectorCode,
            seatId: item.seatId,
            grossAmount: item.unitPrice,
            ticketPrice: item.unitPrice, // Prezzo biglietto per report
            participantFirstName: item.participantFirstName || customer.firstName,
            participantLastName: item.participantLastName || customer.lastName,
            status: "active",
            qrCode: qrData,
          })
          .returning();
        
        // Aggiorna qrCode con formato scannable (SIAE-TKT-{ticketId})
        const scannableQrCode = `SIAE-TKT-${ticket.id}`;
        await db
          .update(siaeTickets)
          .set({ qrCode: scannableQrCode })
          .where(eq(siaeTickets.id, ticket.id));
        
        // Aggiorna ticket locale con qrCode scannable
        ticket.qrCode = scannableQrCode;

        tickets.push(ticket);

        // Aggiorna posto come venduto
        if (item.seatId) {
          await db
            .update(siaeSeats)
            .set({ status: "sold", ticketId: ticket.id })
            .where(eq(siaeSeats.id, item.seatId));
        }
      }

      // Aggiorna disponibilità settore
      await db
        .update(siaeEventSectors)
        .set({
          availableSeats: sql`${siaeEventSectors.availableSeats} - ${item.quantity}`,
        })
        .where(eq(siaeEventSectors.id, item.sectorId));
    }

    // Aggiorna contatori evento
    await db
      .update(siaeTicketedEvents)
      .set({
        ticketsSold: sql`${siaeTicketedEvents.ticketsSold} + ${tickets.length}`,
        totalRevenue: sql`${siaeTicketedEvents.totalRevenue} + ${checkoutSession.totalAmount}`,
      })
      .where(eq(siaeTicketedEvents.id, ticketedEvent.id));

    // Aggiorna checkout session
    await db
      .update(publicCheckoutSessions)
      .set({
        status: "completed",
        transactionId: transaction.id,
        completedAt: new Date(),
      })
      .where(eq(publicCheckoutSessions.id, checkoutSessionId));

    // Registra commissioni nel ledger organizzatore se feePayer='organizer'
    // Usa i dati calcolati durante create-payment-intent dai metadati del payment intent
    try {
      const storedFeePayer = paymentIntent.metadata?.feePayer || 'organizer';
      const storedCommissionAmount = parseFloat(paymentIntent.metadata?.commissionAmount || '0');
      
      if (storedFeePayer === 'organizer' && storedCommissionAmount > 0) {
        const wallet = await WalletService.getOrCreateWallet(ticketedEvent.companyId);
        
        await WalletService.addLedgerEntry({
          companyId: ticketedEvent.companyId,
          walletId: wallet.id,
          type: 'commission',
          direction: 'debit',
          amount: storedCommissionAmount,
          referenceType: 'order',
          referenceId: transaction.id,
          channel: 'online',
          note: `Commissione vendita online - Transazione ${transaction.transactionCode}`,
        });
        
        console.log(`[PUBLIC] Commission ledger entry created: ${storedCommissionAmount.toFixed(2)} EUR for company ${ticketedEvent.companyId}`);
      }
    } catch (commissionError) {
      console.error("[PUBLIC] Error recording commission ledger entry:", commissionError);
    }

    // Accredita punti fedeltà
    try {
      await creditLoyaltyPoints(
        customer.id,
        ticketedEvent.companyId,
        parseFloat(checkoutSession.totalAmount?.toString() || "0"),
        transaction.id,
        `Acquisto biglietti - ${tickets.length} biglietto/i`
      );
    } catch (loyaltyError) {
      console.error("[PUBLIC] Error crediting loyalty points:", loyaltyError);
    }

    // Converti referral se presente (primo acquisto con codice referral)
    try {
      const referralResult = await convertReferralOnPurchase(
        customer.id,
        transaction.id,
        parseFloat(checkoutSession.totalAmount?.toString() || "0")
      );
      if (referralResult.converted) {
        console.log(`[PUBLIC] Referral converted: referrer=${referralResult.referrerId}, points=${referralResult.pointsCredited}`);
      }
    } catch (referralError) {
      console.error("[PUBLIC] Error converting referral:", referralError);
    }

    // Get event details for email
    const [eventDetails] = await db
      .select({
        eventName: events.name,
        eventStart: events.startDatetime,
        locationName: locations.name,
      })
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(eq(siaeTicketedEvents.id, ticketedEvent.id));

    // Async email sending - don't block the response
    (async () => {
      try {
        console.log('[PUBLIC] Starting async PDF/email generation for transaction:', transaction.transactionCode);
        
        // Get default ticket template for the company
        let [defaultTemplate] = await db
          .select()
          .from(ticketTemplates)
          .where(
            and(
              eq(ticketTemplates.companyId, ticketedEvent.companyId),
              eq(ticketTemplates.isDefault, true),
              eq(ticketTemplates.isActive, true)
            )
          )
          .limit(1);

        // Fallback to global system template if no company-specific template exists
        if (!defaultTemplate) {
          console.log('[PUBLIC] No company template found, trying global system template...');
          const [globalTemplate] = await db
            .select()
            .from(ticketTemplates)
            .where(
              and(
                isNull(ticketTemplates.companyId),
                eq(ticketTemplates.isDefault, true),
                eq(ticketTemplates.isActive, true)
              )
            )
            .limit(1);
          
          if (globalTemplate) {
            defaultTemplate = globalTemplate;
            console.log('[PUBLIC] Using global system template:', globalTemplate.name);
          }
        }

        // If still no template, use hardcoded basic template
        if (!defaultTemplate) {
          console.log('[PUBLIC] No templates found, using hardcoded basic template for company:', ticketedEvent.companyId);
          // Create a basic template structure for PDF generation
          defaultTemplate = {
            id: 'hardcoded-basic',
            companyId: null,
            name: 'Template Base Sistema',
            paperWidthMm: 80,
            paperHeightMm: 120,
            dpi: 203,
            isDefault: true,
            isActive: true,
            backgroundImageUrl: null,
            printOrientation: 'portrait',
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as typeof defaultTemplate;
        }

        // Get template elements
        let elements = await db
          .select()
          .from(ticketTemplateElements)
          .where(eq(ticketTemplateElements.templateId, defaultTemplate.id))
          .orderBy(ticketTemplateElements.zIndex);

        // If no elements found (hardcoded template or empty template), use default elements
        let parsedElements: Array<{
          type: string;
          x: number;
          y: number;
          width: number;
          height: number;
          content: string | null;
          fontSize: number | null;
          fontFamily: string | null;
          fontWeight: string | null;
          fontColor: string | null;
          textAlign: string | null;
          rotation: number | null;
        }>;

        if (elements.length === 0) {
          console.log('[PUBLIC] No template elements found, using default basic layout');
          // Default basic ticket layout
          parsedElements = [
            { type: 'dynamic', x: 5, y: 5, width: 70, height: 8, content: '{{event_name}}', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontColor: '#000000', textAlign: 'center', rotation: 0 },
            { type: 'dynamic', x: 5, y: 16, width: 35, height: 6, content: '{{event_date}}', fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontColor: '#333333', textAlign: 'left', rotation: 0 },
            { type: 'dynamic', x: 42, y: 16, width: 33, height: 6, content: '{{event_time}}', fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontColor: '#333333', textAlign: 'right', rotation: 0 },
            { type: 'dynamic', x: 5, y: 24, width: 70, height: 6, content: '{{venue_name}}', fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontColor: '#333333', textAlign: 'center', rotation: 0 },
            { type: 'line', x: 5, y: 32, width: 70, height: 1, content: null, fontSize: null, fontFamily: null, fontWeight: null, fontColor: '#cccccc', textAlign: null, rotation: 0 },
            { type: 'dynamic', x: 5, y: 36, width: 40, height: 6, content: '{{sector}}', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold', fontColor: '#000000', textAlign: 'left', rotation: 0 },
            { type: 'dynamic', x: 45, y: 36, width: 30, height: 6, content: '{{price}}', fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold', fontColor: '#000000', textAlign: 'right', rotation: 0 },
            { type: 'dynamic', x: 5, y: 44, width: 70, height: 5, content: '{{buyer_name}}', fontSize: 9, fontFamily: 'Arial', fontWeight: 'normal', fontColor: '#555555', textAlign: 'left', rotation: 0 },
            { type: 'qrcode', x: 27.5, y: 52, width: 25, height: 25, content: '{{qr_code}}', fontSize: null, fontFamily: null, fontWeight: null, fontColor: null, textAlign: null, rotation: 0 },
            { type: 'dynamic', x: 5, y: 80, width: 70, height: 4, content: '{{ticket_number}}', fontSize: 8, fontFamily: 'monospace', fontWeight: 'normal', fontColor: '#666666', textAlign: 'center', rotation: 0 },
            { type: 'dynamic', x: 5, y: 86, width: 70, height: 4, content: '{{fiscal_seal}}', fontSize: 7, fontFamily: 'monospace', fontWeight: 'normal', fontColor: '#888888', textAlign: 'center', rotation: 0 },
            { type: 'line', x: 5, y: 92, width: 70, height: 1, content: null, fontSize: null, fontFamily: null, fontWeight: null, fontColor: '#cccccc', textAlign: null, rotation: 0 },
            { type: 'dynamic', x: 5, y: 95, width: 70, height: 4, content: '{{emission_datetime}}', fontSize: 7, fontFamily: 'Arial', fontWeight: 'normal', fontColor: '#999999', textAlign: 'center', rotation: 0 },
            { type: 'text', x: 5, y: 100, width: 70, height: 4, content: 'Powered by Event4U', fontSize: 7, fontFamily: 'Arial', fontWeight: 'normal', fontColor: '#aaaaaa', textAlign: 'center', rotation: 0 },
          ];
        } else {
          // Parse elements from database
          parsedElements = elements.map((el) => {
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
        }

        const ticketHtmls: Array<{ id: string; html: string }> = [];
        const pdfBuffers: Buffer[] = [];

        for (const ticket of tickets) {
          // Get sector info for this ticket
          const [ticketSector] = await db
            .select()
            .from(siaeEventSectors)
            .where(eq(siaeEventSectors.id, ticket.sectorId));

          // Build ticket data for template
          const ticketData: Record<string, string> = {
            event_name: eventDetails?.eventName || '',
            event_date: eventDetails?.eventStart 
              ? new Date(eventDetails.eventStart).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
              : '',
            event_time: eventDetails?.eventStart 
              ? new Date(eventDetails.eventStart).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) 
              : '',
            venue_name: eventDetails?.locationName || '',
            price: `€ ${parseFloat(ticket.grossAmount).toFixed(2)}`,
            ticket_number: ticket.id.slice(-12).toUpperCase(),
            sector: ticketSector?.name || ticket.sectorCode || '',
            row: ticket.seatId ? 'N/A' : '-',
            seat: ticket.seatId ? 'N/A' : '-',
            buyer_name: `${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim(),
            organizer_company: '',
            ticketing_manager: 'Event4U',
            emission_datetime: new Date().toLocaleString('it-IT'),
            fiscal_seal: ticket.fiscalSealCode || '',
            qr_code: ticket.qrCode || '',
          };

          // Generate HTML for this ticket
          const ticketHtml = generateTicketHtml(
            {
              paperWidthMm: defaultTemplate.paperWidthMm,
              paperHeightMm: defaultTemplate.paperHeightMm,
              backgroundImageUrl: defaultTemplate.backgroundImageUrl,
              dpi: defaultTemplate.dpi || 96,
              printOrientation: defaultTemplate.printOrientation || 'auto',
            },
            parsedElements,
            ticketData,
            false // Don't skip background for PDF
          );

          ticketHtmls.push({ id: ticket.id, html: ticketHtml });

          // Generate PDF
          try {
            const pdfBuffer = await generateTicketPdf(
              ticketHtml,
              defaultTemplate.paperWidthMm,
              defaultTemplate.paperHeightMm
            );
            pdfBuffers.push(pdfBuffer);
          } catch (pdfError) {
            console.error('[PUBLIC] PDF generation failed for ticket:', ticket.id, pdfError);
          }
        }

        // Send email if we have PDFs
        if (pdfBuffers.length > 0 && customer.email) {
          await sendTicketEmail({
            to: customer.email,
            subject: `I tuoi biglietti per ${eventDetails?.eventName || 'l\'evento'}`,
            eventName: eventDetails?.eventName || 'Evento',
            tickets: ticketHtmls,
            pdfBuffers,
          });
          console.log('[PUBLIC] Ticket email sent successfully to:', customer.email);
        } else {
          console.log('[PUBLIC] No PDFs generated or no customer email, skipping email');
        }
      } catch (emailError) {
        console.error('[PUBLIC] Async email/PDF generation failed:', emailError);
      }
    })().catch((err) => {
      console.error('[PUBLIC] Unhandled error in async email/PDF generation:', err);
    });

    // Svuota carrello
    const sessionId = getOrCreateSessionId(req, res);
    await db.delete(publicCartItems).where(eq(publicCartItems.sessionId, sessionId));

    res.json({
      success: true,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      tickets: tickets.map((t) => ({
        id: t.id,
        fiscalSealCode: t.fiscalSealCode,
        sectorCode: t.sectorCode,
        qrCode: t.qrCode,
      })),
    });
  } catch (error: any) {
    console.error("[PUBLIC] Checkout confirm error:", error);
    
    // CRITICAL: Se arriviamo qui, il pagamento potrebbe essere già andato a buon fine
    // Dobbiamo tentare lo storno automatico per evitare di lasciare il cliente senza biglietti ma con addebito
    const { paymentIntentId, checkoutSessionId } = req.body;
    
    if (paymentIntentId && checkoutSessionId) {
      try {
        console.log(`[PUBLIC] Attempting auto-refund for unexpected error: ${error.message}`);
        const stripe = await getUncachableStripeClient();
        
        // Verifica se il pagamento è già completato
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status === "succeeded") {
          // Il pagamento è andato a buon fine, dobbiamo stornare
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
            metadata: {
              reason: 'ticket_generation_failed',
              error: error.message?.substring(0, 500) || 'Unknown error',
            }
          });
          
          console.log(`[PUBLIC] Auto-refund created: ${refund.id}`);
          
          // Aggiorna checkout session
          await db
            .update(publicCheckoutSessions)
            .set({
              status: "refunded",
              refundId: refund.id,
              refundReason: `Errore nella generazione biglietti: ${error.message?.substring(0, 200)}`,
            })
            .where(eq(publicCheckoutSessions.id, checkoutSessionId));
          
          return res.status(500).json({ 
            message: "Si è verificato un problema tecnico durante l'emissione dei biglietti. Non ti preoccupare: l'importo è stato automaticamente rimborsato sulla tua carta. Riprova tra qualche minuto oppure contatta l'organizzatore per assistenza.",
            code: "TICKET_ERROR_REFUNDED",
            refunded: true,
            refundId: refund.id,
          });
        }
      } catch (refundError: any) {
        console.error(`[PUBLIC] Auto-refund failed:`, refundError.message);
        
        // Tenta di segnare come refund_pending
        try {
          await db
            .update(publicCheckoutSessions)
            .set({
              status: "refund_pending",
              refundReason: `Errore: ${error.message}. Storno fallito: ${refundError.message}`,
            })
            .where(eq(publicCheckoutSessions.id, checkoutSessionId));
        } catch (dbError) {
          console.error(`[PUBLIC] Failed to mark session as refund_pending:`, dbError);
        }
        
        return res.status(500).json({ 
          message: "Si è verificato un problema durante l'elaborazione dell'ordine. Il nostro team è stato notificato e provvederà a verificare lo stato del pagamento. Riceverai un'email di conferma entro breve. Per assistenza immediata, contatta l'organizzatore dell'evento.",
          code: "CRITICAL_ERROR_REFUND_FAILED",
          refunded: false,
        });
      }
    }
    
    res.status(500).json({ message: "Si è verificato un problema tecnico durante la conferma dell'ordine. Ti invitiamo a riprovare tra qualche istante." });
  }
});

// Ottieni biglietti cliente
router.get("/api/public/tickets", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { transaction } = req.query;
    
    // Build where conditions
    const conditions = [eq(siaeTickets.customerId, customer.id)];
    
    // If transaction code is provided, filter by it
    if (transaction && typeof transaction === 'string') {
      // Find the transaction by code
      const transactionRecord = await db.select({ id: siaeTransactions.id })
        .from(siaeTransactions)
        .where(eq(siaeTransactions.transactionCode, transaction))
        .limit(1);
      
      if (transactionRecord.length > 0) {
        conditions.push(eq(siaeTickets.transactionId, transactionRecord[0].id));
      }
    }

    const tickets = await db
      .select({
        id: siaeTickets.id,
        fiscalSealCode: siaeTickets.fiscalSealCode,
        ticketTypeCode: siaeTickets.ticketTypeCode,
        sectorCode: siaeTickets.sectorCode,
        grossAmount: siaeTickets.grossAmount,
        status: siaeTickets.status,
        qrCode: siaeTickets.qrCode,
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        emissionDateStr: siaeTickets.emissionDateStr,
        eventName: events.name,
        eventStart: events.startDatetime,
        locationName: locations.name,
        sectorName: siaeEventSectors.name,
      })
      .from(siaeTickets)
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .where(and(...conditions))
      .orderBy(desc(siaeTickets.createdAt));

    res.json(tickets);
  } catch (error: any) {
    console.error("[PUBLIC] Get tickets error:", error);
    res.status(500).json({ message: "Errore nel caricamento biglietti" });
  }
});

// ==================== VETRINA LOCALI ====================

// Lista locali pubblici con prossimi eventi
router.get("/api/public/venues", async (req, res) => {
  try {
    const { city, userLat, userLng, limit = 20, offset = 0 } = req.query;
    const now = new Date();

    const hasUserLocation = userLat && userLng && 
      !isNaN(parseFloat(userLat as string)) && 
      !isNaN(parseFloat(userLng as string));

    const userLatNum = hasUserLocation ? parseFloat(userLat as string) : null;
    const userLngNum = hasUserLocation ? parseFloat(userLng as string) : null;

    const venuesList = await db
      .select({
        id: locations.id,
        name: locations.name,
        address: locations.address,
        city: locations.city,
        capacity: locations.capacity,
        heroImageUrl: locations.heroImageUrl,
        shortDescription: locations.shortDescription,
        openingHours: locations.openingHours,
        latitude: locations.latitude,
        longitude: locations.longitude,
      })
      .from(locations)
      .where(eq(locations.isPublic, true))
      .limit(Number(limit))
      .offset(Number(offset));

    let venuesWithDistance = venuesList.map(venue => {
      let distance: number | null = null;
      
      if (hasUserLocation && venue.latitude && venue.longitude) {
        const lat = parseFloat(venue.latitude);
        const lng = parseFloat(venue.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const toRad = (deg: number) => deg * (Math.PI / 180);
          const cosValue = Math.cos(toRad(userLatNum!)) * Math.cos(toRad(lat)) * 
            Math.cos(toRad(lng) - toRad(userLngNum!)) + 
            Math.sin(toRad(userLatNum!)) * Math.sin(toRad(lat));
          const clampedCosValue = Math.max(-1, Math.min(1, cosValue));
          distance = 6371 * Math.acos(clampedCosValue);
          if (isNaN(distance)) distance = null;
          else distance = Math.round(distance * 100) / 100;
        }
      }
      
      return { ...venue, distance };
    });

    if (hasUserLocation) {
      venuesWithDistance.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    // Per ogni locale, ottieni i prossimi eventi
    const venuesWithEvents = await Promise.all(
      venuesWithDistance.map(async (venue) => {
        const upcomingEvents = await db
          .select({
            id: siaeTicketedEvents.id,
            eventId: siaeTicketedEvents.eventId,
            eventName: events.name,
            eventStart: events.startDatetime,
            ticketingStatus: siaeTicketedEvents.ticketingStatus,
            totalCapacity: siaeTicketedEvents.totalCapacity,
            ticketsSold: siaeTicketedEvents.ticketsSold,
          })
          .from(siaeTicketedEvents)
          .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
          .where(
            and(
              eq(events.locationId, venue.id),
              eq(siaeTicketedEvents.ticketingStatus, "active"),
              gt(events.startDatetime, now)
            )
          )
          .orderBy(events.startDatetime)
          .limit(3);

        // Per ogni evento, ottieni il prezzo minimo dai settori
        const eventsWithPrices = await Promise.all(
          upcomingEvents.map(async (event) => {
            const sectors = await db
              .select({
                price: siaeEventSectors.priceIntero,
              })
              .from(siaeEventSectors)
              .where(eq(siaeEventSectors.ticketedEventId, event.id));

            const minPrice = sectors.length > 0
              ? Math.min(...sectors.map(s => parseFloat(s.price || "0")))
              : null;

            return {
              ...event,
              minPrice,
              availability: event.totalCapacity - event.ticketsSold,
            };
          })
        );

        return {
          ...venue,
          upcomingEvents: eventsWithPrices,
          eventCount: eventsWithPrices.length,
        };
      })
    );

    res.json(venuesWithEvents);
  } catch (error: any) {
    console.error("[PUBLIC] Get venues error:", error);
    res.status(500).json({ message: "Errore nel caricamento locali" });
  }
});

// Dettaglio singolo locale
router.get("/api/public/venues/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const [venue] = await db
      .select({
        id: locations.id,
        name: locations.name,
        address: locations.address,
        city: locations.city,
        capacity: locations.capacity,
        heroImageUrl: locations.heroImageUrl,
        shortDescription: locations.shortDescription,
        openingHours: locations.openingHours,
      })
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.isPublic, true)));

    if (!venue) {
      return res.status(404).json({ message: "Locale non trovato" });
    }

    // Ottieni tutti gli eventi futuri per questo locale
    const upcomingEvents = await db
      .select({
        id: siaeTicketedEvents.id,
        eventId: siaeTicketedEvents.eventId,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        ticketingStatus: siaeTicketedEvents.ticketingStatus,
        totalCapacity: siaeTicketedEvents.totalCapacity,
        ticketsSold: siaeTicketedEvents.ticketsSold,
        requiresNominative: siaeTicketedEvents.requiresNominative,
      })
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(
        and(
          eq(events.locationId, venue.id),
          eq(siaeTicketedEvents.ticketingStatus, "active"),
          gt(events.startDatetime, now)
        )
      )
      .orderBy(events.startDatetime);

    // Per ogni evento, ottieni prezzi e settori
    const eventsWithDetails = await Promise.all(
      upcomingEvents.map(async (event) => {
        const sectors = await db
          .select({
            id: siaeEventSectors.id,
            name: siaeEventSectors.name,
            price: siaeEventSectors.priceIntero,
            capacity: siaeEventSectors.capacity,
            availableSeats: siaeEventSectors.availableSeats,
          })
          .from(siaeEventSectors)
          .where(eq(siaeEventSectors.ticketedEventId, event.id));

        const minPrice = sectors.length > 0
          ? Math.min(...sectors.map(s => parseFloat(s.price || "0")))
          : null;

        return {
          ...event,
          minPrice,
          availability: event.totalCapacity - event.ticketsSold,
          sectors,
        };
      })
    );

    res.json({
      ...venue,
      upcomingEvents: eventsWithDetails,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get venue detail error:", error);
    res.status(500).json({ message: "Errore nel caricamento dettaglio locale" });
  }
});

// ==================== CUSTOMER ACCOUNT PORTAL ====================

// Aggiorna profilo cliente
router.patch("/api/public/account/profile", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { firstName, lastName, phone } = req.body;

    const [updated] = await db
      .update(siaeCustomers)
      .set({
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        updatedAt: new Date(),
      })
      .where(eq(siaeCustomers.id, customer.id))
      .returning();

    res.json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      phoneVerified: updated.phoneVerified || false,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Update profile error:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento profilo" });
  }
});

// Ottieni biglietti del cliente
router.get("/api/public/account/tickets", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    // Query semplificata per evitare errori Drizzle con left join multipli
    const ticketRows = await db
      .select()
      .from(siaeTickets)
      .where(eq(siaeTickets.customerId, customer.id));

    // Se non ci sono biglietti, ritorna array vuoti
    if (ticketRows.length === 0) {
      return res.json({ upcoming: [], past: [], total: 0 });
    }

    // Fetch dati correlati separatamente per robustezza
    const tickets = await Promise.all(ticketRows.map(async (ticket) => {
      let sectorName = null;
      let eventName = null;
      let eventStart = null;
      let eventEnd = null;
      let locationName = null;

      // Fetch sector
      if (ticket.sectorId) {
        const [sector] = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.id, ticket.sectorId));
        sectorName = sector?.name || null;
      }

      // Fetch ticketed event -> event -> location
      if (ticket.ticketedEventId) {
        const [ticketedEvent] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, ticket.ticketedEventId));
        if (ticketedEvent?.eventId) {
          const [event] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
          if (event) {
            eventName = event.name;
            eventStart = event.startDatetime;
            eventEnd = event.endDatetime;
            if (event.locationId) {
              const [location] = await db.select().from(locations).where(eq(locations.id, event.locationId));
              locationName = location?.name || null;
            }
          }
        }
      }

      const emittedAt = ticket.emissionDate 
        ? new Date(ticket.emissionDate).toISOString() 
        : null;

      return {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        ticketType: ticket.ticketType,
        ticketPrice: ticket.ticketPrice,
        participantFirstName: ticket.participantFirstName,
        participantLastName: ticket.participantLastName,
        status: ticket.status,
        emissionDate: ticket.emissionDate,
        emittedAt,
        qrCode: ticket.qrCode,
        sectorName,
        eventName,
        eventStart,
        eventEnd,
        locationName,
        ticketedEventId: ticket.ticketedEventId,
      };
    }));

    // Separa biglietti futuri/passati/annullati (include annullato_rivendita, refunded, etc.)
    const now = new Date();
    const cancelled = tickets.filter(t => isCancelledStatus(t.status));
    const activeTickets = tickets.filter(t => !isCancelledStatus(t.status));
    // Include both 'emitted' and 'active' status for valid tickets
    const validStatuses = ['emitted', 'active'];
    const upcoming = activeTickets.filter(t => t.eventStart && new Date(t.eventStart) >= now && validStatuses.includes(t.status || ''));
    const past = activeTickets.filter(t => !t.eventStart || new Date(t.eventStart) < now || !validStatuses.includes(t.status || ''));

    // Ordina per data evento decrescente
    upcoming.sort((a, b) => (b.eventStart ? new Date(b.eventStart).getTime() : 0) - (a.eventStart ? new Date(a.eventStart).getTime() : 0));
    past.sort((a, b) => (b.eventStart ? new Date(b.eventStart).getTime() : 0) - (a.eventStart ? new Date(a.eventStart).getTime() : 0));

    // Ordina annullati per data decrescente
    cancelled.sort((a, b) => (b.eventStart ? new Date(b.eventStart).getTime() : 0) - (a.eventStart ? new Date(a.eventStart).getTime() : 0));

    res.json({
      upcoming,
      past,
      cancelled,
      total: tickets.length,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get tickets error:", error);
    res.status(500).json({ message: "Errore nel caricamento biglietti" });
  }
});

// Ottieni abbonamenti del cliente autenticato
router.get("/api/public/account/subscriptions", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    // Query subscriptions for this customer
    const subscriptionRows = await db
      .select()
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.customerId, customer.id));

    // If no subscriptions, return empty arrays
    if (subscriptionRows.length === 0) {
      return res.json({ upcoming: [], past: [], total: 0 });
    }

    // Fetch related data for each subscription
    const subscriptions = await Promise.all(subscriptionRows.map(async (subscription) => {
      let subscriptionTypeName = null;
      let eventName = null;
      let eventStart = null;
      let eventEnd = null;
      let locationName = null;

      // Fetch subscription type name
      if (subscription.subscriptionTypeId) {
        const [subType] = await db.select().from(siaeSubscriptionTypes).where(eq(siaeSubscriptionTypes.id, subscription.subscriptionTypeId));
        subscriptionTypeName = subType?.name || null;
      }

      // Fetch ticketed event -> event -> location
      if (subscription.ticketedEventId) {
        const [ticketedEvent] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, subscription.ticketedEventId));
        if (ticketedEvent?.eventId) {
          const [event] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
          if (event) {
            eventName = event.name;
            eventStart = event.startDatetime;
            eventEnd = event.endDatetime;
            if (event.locationId) {
              const [location] = await db.select().from(locations).where(eq(locations.id, event.locationId));
              locationName = location?.name || null;
            }
          }
        }
      }

      return {
        id: subscription.id,
        subscriptionCode: subscription.subscriptionCode,
        qrCode: subscription.qrCode,
        holderFirstName: subscription.holderFirstName,
        holderLastName: subscription.holderLastName,
        status: subscription.status,
        eventsCount: subscription.eventsCount,
        eventsUsed: subscription.eventsUsed,
        validFrom: subscription.validFrom,
        validTo: subscription.validTo,
        fiscalSealCode: subscription.fiscalSealCode,
        progressiveNumber: subscription.progressiveNumber,
        cardCode: subscription.cardCode,
        fiscalSealCounter: subscription.fiscalSealCounter,
        emissionDate: subscription.emissionDate,
        subscriptionTypeName,
        eventName,
        eventStart,
        eventEnd,
        locationName,
      };
    }));

    // Separate upcoming/past subscriptions
    const now = new Date();
    const upcoming = subscriptions.filter(s => 
      s.validTo && new Date(s.validTo) >= now && s.status === 'active'
    );
    const past = subscriptions.filter(s => 
      !s.validTo || new Date(s.validTo) < now || s.status !== 'active'
    );

    // Sort by validTo date descending
    upcoming.sort((a, b) => (b.validTo ? new Date(b.validTo).getTime() : 0) - (a.validTo ? new Date(a.validTo).getTime() : 0));
    past.sort((a, b) => (b.validTo ? new Date(b.validTo).getTime() : 0) - (a.validTo ? new Date(a.validTo).getTime() : 0));

    res.json({
      upcoming,
      past,
      total: subscriptions.length,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get subscriptions error:", error);
    res.status(500).json({ message: "Errore nel caricamento abbonamenti" });
  }
});

// Ottieni liste ospiti per il cliente autenticato (UNIFICATO: usa listEntries)
router.get("/api/public/account/guest-entries", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer || !customer.id) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const entries = await db
      .select({
        id: listEntries.id,
        firstName: listEntries.firstName,
        lastName: listEntries.lastName,
        plusOnes: listEntries.plusOnes,
        qrCode: listEntries.qrCode,
        qrScannedAt: listEntries.qrScannedAt,
        status: listEntries.status,
        arrivedAt: listEntries.checkedInAt,
        createdAt: listEntries.createdAt,
        listName: eventLists.name,
        listType: eventLists.listType,
        eventId: events.id,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        locationName: locations.name,
        locationAddress: locations.address,
      })
      .from(listEntries)
      .innerJoin(eventLists, eq(listEntries.listId, eventLists.id))
      .innerJoin(events, eq(listEntries.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(eq(listEntries.customerId, customer.id))
      .orderBy(desc(events.startDatetime));

    const now = new Date();
    const upcoming = entries.filter(e => new Date(e.eventStart) >= now && e.status !== 'cancelled');
    const past = entries.filter(e => new Date(e.eventStart) < now || e.status === 'cancelled');

    res.json({
      upcoming,
      past,
      total: entries.length,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get guest entries error:", error);
    res.status(500).json({ message: "Errore nel caricamento liste ospiti" });
  }
});

// Ottieni prenotazioni tavoli per il cliente autenticato (con QR code partecipante)
router.get("/api/public/account/table-reservations", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    console.log("[PUBLIC-TABLE] Searching for customer:", { id: customer.id, phone: customer.phone, email: customer.email });

    const normalizePhone = (p: string) => p.replace(/\D/g, '');
    const getPhoneVariants = (phone: string): string[] => {
      const digits = normalizePhone(phone);
      let basePhone = digits;
      if (basePhone.startsWith('0039')) {
        basePhone = basePhone.slice(4);
      } else if (basePhone.startsWith('39') && basePhone.length > 10) {
        basePhone = basePhone.slice(2);
      }
      return [phone, digits, basePhone, '+39' + basePhone, '39' + basePhone, '0039' + basePhone];
    };
    
    // Build conditions to find participant entries
    const conditions: any[] = [];
    
    if (customer.id) {
      conditions.push(eq(tableBookingParticipants.linkedCustomerId, customer.id));
    }
    if (customer.userId) {
      conditions.push(eq(tableBookingParticipants.linkedUserId, customer.userId));
    }
    if (customer.email) {
      conditions.push(eq(tableBookingParticipants.email, customer.email));
      conditions.push(eq(tableBookingParticipants.email, customer.email.toLowerCase()));
    }
    if (customer.phone) {
      const variants = getPhoneVariants(customer.phone);
      for (const variant of variants) {
        conditions.push(eq(tableBookingParticipants.phone, variant));
      }
    }

    if (conditions.length === 0) {
      console.log("[PUBLIC-TABLE] No search conditions");
      return res.json([]);
    }

    // Find all participants matching the customer
    const participants = await db
      .select({
        participantId: tableBookingParticipants.id,
        bookingId: tableBookingParticipants.bookingId,
        firstName: tableBookingParticipants.firstName,
        lastName: tableBookingParticipants.lastName,
        qrCode: tableBookingParticipants.qrCode,
        isBooker: tableBookingParticipants.isBooker,
        approvalStatus: tableBookings.approvalStatus,
        tableName: eventTables.name,
        eventName: events.name,
        eventStart: events.startDatetime,
        locationName: locations.name,
      })
      .from(tableBookingParticipants)
      .innerJoin(tableBookings, eq(tableBookingParticipants.bookingId, tableBookings.id))
      .innerJoin(eventTables, eq(tableBookings.tableId, eventTables.id))
      .innerJoin(events, eq(tableBookings.eventId, events.id))
      .leftJoin(locations, eq(events.locationId, locations.id))
      .where(or(...conditions))
      .orderBy(desc(events.startDatetime));

    console.log("[PUBLIC-TABLE] Found", participants.length, "participant entries");

    // De-duplicate by participantId (user might match multiple conditions)
    const uniqueParticipants = Array.from(
      new Map(participants.map(p => [p.participantId, p])).values()
    );

    // Map to expected format
    const result = uniqueParticipants.map(p => ({
      id: p.bookingId,
      eventName: p.eventName || 'Evento',
      eventDate: p.eventStart?.toISOString() || null,
      tableName: p.tableName || 'Tavolo',
      venueName: p.locationName || 'Location',
      approvalStatus: p.approvalStatus || 'pending_approval',
      qrCode: p.qrCode,
      participantId: p.participantId,
      isBooker: p.isBooker || false,
      firstName: p.firstName,
      lastName: p.lastName,
    }));

    res.json(result);
  } catch (error: any) {
    console.error("[PUBLIC-TABLE] Error:", error);
    res.status(500).json({ message: "Errore nel caricamento prenotazioni tavoli" });
  }
});

// Ottieni entry liste ospiti per il cliente mobile (usa listEntries table)
// Questo endpoint cerca per phone/email del cliente siaeCustomers
router.get("/api/public/account/list-entries", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    console.log("[PUBLIC-LIST] Searching list entries for customer:", {
      id: customer.id,
      email: customer.email,
      phone: customer.phone,
      userId: customer.userId
    });

    // Normalize phone for matching - get base phone without country code
    const normalizePhone = (p: string) => p.replace(/\D/g, '');
    const getPhoneVariants = (phone: string): string[] => {
      const digits = normalizePhone(phone);
      let basePhone = digits;
      // Remove Italian prefix if present
      if (basePhone.startsWith('0039')) {
        basePhone = basePhone.slice(4);
      } else if (basePhone.startsWith('39') && basePhone.length > 10) {
        basePhone = basePhone.slice(2);
      }
      // Return all possible formats
      return [
        phone,                    // Original as-is
        digits,                   // Just digits
        basePhone,                // Without country code
        '+39' + basePhone,        // With +39 prefix
        '39' + basePhone,         // With 39 prefix
        '0039' + basePhone,       // With 0039 prefix
      ];
    };
    
    // Build conditions to find list entries
    const conditions: any[] = [];
    
    // If customer has a linked userId, search by clientUserId
    if (customer.userId) {
      conditions.push(eq(listEntries.clientUserId, customer.userId));
    }
    
    // Search by email
    if (customer.email) {
      conditions.push(eq(listEntries.email, customer.email));
      conditions.push(eq(listEntries.email, customer.email.toLowerCase()));
    }
    
    // Search by phone with ALL possible formats
    if (customer.phone) {
      const variants = getPhoneVariants(customer.phone);
      console.log("[PUBLIC-LIST] Phone variants for", customer.phone, ":", variants);
      for (const variant of variants) {
        conditions.push(eq(listEntries.phone, variant));
      }
    }

    if (conditions.length === 0) {
      console.log("[PUBLIC-LIST] No search conditions available");
      return res.json([]);
    }

    console.log("[PUBLIC-LIST] Searching with", conditions.length, "conditions");

    // Find all matching entries with event and location data
    const entries = await db
      .select({
        id: listEntries.id,
        firstName: listEntries.firstName,
        lastName: listEntries.lastName,
        phone: listEntries.phone,
        email: listEntries.email,
        qrCode: listEntries.qrCode,
        status: listEntries.status,
        plusOnes: listEntries.plusOnes,
        createdAt: listEntries.createdAt,
        listId: listEntries.listId,
        listName: eventLists.name,
        eventId: events.id,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        locationName: locations.name,
        locationAddress: locations.address,
      })
      .from(listEntries)
      .innerJoin(eventLists, eq(listEntries.listId, eventLists.id))
      .innerJoin(events, eq(listEntries.eventId, events.id))
      .leftJoin(locations, eq(events.locationId, locations.id))
      .where(or(...conditions))
      .orderBy(desc(events.startDatetime));

    console.log("[PUBLIC-LIST] Found", entries.length, "entries");

    // De-duplicate by entry id (user might match multiple conditions)
    const uniqueEntries = Array.from(
      new Map(entries.map(e => [e.id, e])).values()
    );

    // Auto-generate missing QR codes
    const { prStorage } = await import("./pr-storage");
    const entriesWithQr = await Promise.all(
      uniqueEntries.map(async (entry) => {
        if (!entry.qrCode) {
          console.log("[PUBLIC-LIST] Generating missing QR for entry:", entry.id);
          const updated = await prStorage.generateMissingQrCode(entry.id);
          if (updated?.qrCode) {
            return { ...entry, qrCode: updated.qrCode };
          }
        }
        return entry;
      })
    );

    // Map to format expected by mobile app
    const result = entriesWithQr.map(entry => ({
      id: entry.id,
      eventName: entry.eventName || 'Evento',
      eventDate: entry.eventStart?.toISOString() || null,
      listName: entry.listName || 'Lista',
      venueName: entry.locationName || 'Location',
      qrCode: entry.qrCode,
      status: entry.status || 'pending',
      firstName: entry.firstName,
      lastName: entry.lastName,
      plusOnes: entry.plusOnes || 0,
    }));

    res.json(result);
  } catch (error: any) {
    console.error("[PUBLIC-LIST] Error:", error);
    res.status(500).json({ message: "Errore nel caricamento liste" });
  }
});

// Generate missing QR code for a list entry
router.post("/api/public/account/list-entries/:id/generate-qr", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;
    const { prStorage } = await import("./pr-storage");

    // Verify the entry belongs to this customer
    const [entry] = await db
      .select()
      .from(listEntries)
      .where(eq(listEntries.id, id))
      .limit(1);

    if (!entry) {
      return res.status(404).json({ message: "Entry non trovata" });
    }

    // Check ownership - must match customer by userId, email, or phone
    const isOwner = 
      (entry.clientUserId && entry.clientUserId === customer.userId) ||
      (entry.email && customer.email && entry.email.toLowerCase() === customer.email.toLowerCase()) ||
      (entry.phone && customer.phone && entry.phone.replace(/\s/g, '') === customer.phone.replace(/\s/g, ''));

    if (!isOwner) {
      return res.status(403).json({ message: "Non autorizzato" });
    }

    if (entry.qrCode) {
      return res.json({ 
        success: true, 
        qrCode: entry.qrCode,
        message: "QR code già presente" 
      });
    }

    const updated = await prStorage.generateMissingQrCode(id);
    if (!updated) {
      return res.status(500).json({ message: "Errore generazione QR" });
    }

    console.log("[PUBLIC-LIST] Generated missing QR for entry:", id, updated.qrCode);
    res.json({ 
      success: true, 
      qrCode: updated.qrCode,
      message: "QR code generato" 
    });
  } catch (error: any) {
    console.error("[PUBLIC-LIST] Error generating QR:", error);
    res.status(500).json({ message: "Errore generazione QR" });
  }
});

// Ottieni dettaglio singolo biglietto
router.get("/api/public/account/tickets/:id", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    const [ticket] = await db
      .select({
        id: siaeTickets.id,
        ticketCode: siaeTickets.ticketCode,
        ticketType: siaeTickets.ticketType,
        ticketTypeCode: siaeTickets.ticketTypeCode,
        ticketPrice: siaeTickets.ticketPrice,
        grossAmount: siaeTickets.grossAmount,
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        status: siaeTickets.status,
        emissionDate: siaeTickets.emissionDate,
        qrCode: siaeTickets.qrCode,
        customText: siaeTickets.customText,
        fiscalSealCode: siaeTickets.fiscalSealCode,
        sectorId: siaeTickets.sectorId,
        sectorName: siaeEventSectors.name,
        ticketedEventId: siaeTickets.ticketedEventId,
        eventId: siaeTicketedEvents.eventId,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        locationName: locations.name,
        locationAddress: locations.address,
        allowsChangeName: siaeTicketedEvents.allowsChangeName,
        allowsResale: siaeTicketedEvents.allowsResale,
        nameChangeFee: siaeTicketedEvents.nameChangeFee,
        organizerCompany: companies.name,
        companyId: companies.id,
        ticketingManager: siaeSystemConfig.businessName,
        progressiveNumber: siaeFiscalSeals.progressiveNumber,
      })
      .from(siaeTickets)
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .innerJoin(companies, eq(events.companyId, companies.id))
      .leftJoin(siaeSystemConfig, eq(siaeSystemConfig.companyId, events.companyId))
      .leftJoin(siaeFiscalSeals, eq(siaeFiscalSeals.id, siaeTickets.fiscalSealId))
      .where(and(
        eq(siaeTickets.id, id),
        eq(siaeTickets.customerId, customer.id)
      ));

    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }

    // Calcola se cambio nominativo/rivendita sono ancora disponibili
    const now = new Date();
    const eventStart = new Date(ticket.eventStart);
    const hoursToEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Verifica se questo biglietto è il risultato di un cambio nominativo
    // (cioè se esiste un record in siaeNameChanges dove newTicketId = questo ticket)
    const [wasFromNameChange] = await db
      .select({ id: siaeNameChanges.id })
      .from(siaeNameChanges)
      .where(and(
        eq(siaeNameChanges.newTicketId, id),
        eq(siaeNameChanges.status, 'completed')
      ))
      .limit(1);
    
    const isFromNameChange = !!wasFromNameChange;

    // Se il biglietto è stato ottenuto tramite cambio nominativo, 
    // NON può più essere cambiato o rivenduto
    const canNameChange = !isFromNameChange && 
                          ticket.allowsChangeName && 
                          (ticket.status === 'emitted' || ticket.status === 'active') && 
                          hoursToEvent >= 24;
    
    // Rivendita consentita fino a 2 ore prima dell'evento (non ci sono limiti normativi specifici)
    // MA non per biglietti ottenuti tramite cambio nominativo
    const canResale = !isFromNameChange && 
                      ticket.allowsResale && 
                      (ticket.status === 'emitted' || ticket.status === 'active') && 
                      hoursToEvent >= 2;

    // Verifica se già in rivendita
    const [existingResale] = await db
      .select()
      .from(siaeResales)
      .where(and(
        eq(siaeResales.originalTicketId, id),
        or(eq(siaeResales.status, 'listed'), eq(siaeResales.status, 'pending'))
      ));

    // Query per i cambi nominativi collegati a questo biglietto
    const nameChangeHistory = await db
      .select({
        id: siaeNameChanges.id,
        originalTicketId: siaeNameChanges.originalTicketId,
        newTicketId: siaeNameChanges.newTicketId,
        newFirstName: siaeNameChanges.newFirstName,
        newLastName: siaeNameChanges.newLastName,
        newEmail: siaeNameChanges.newEmail,
        status: siaeNameChanges.status,
        processedAt: siaeNameChanges.processedAt,
        createdAt: siaeNameChanges.createdAt,
      })
      .from(siaeNameChanges)
      .where(
        or(
          eq(siaeNameChanges.originalTicketId, id),
          eq(siaeNameChanges.newTicketId, id)
        )
      )
      .orderBy(desc(siaeNameChanges.createdAt));

    // Se questo biglietto è un sostituto (newTicketId = questo ticket)
    let previousTicket: { id: string; sigilloFiscale: string | null; progressiveNumber: number | null } | null = null;
    let nameChangeDate: string | null = null;
    
    const nameChangeAsNew = nameChangeHistory.find(nc => nc.newTicketId === id && nc.status === 'completed');
    if (nameChangeAsNew) {
      nameChangeDate = nameChangeAsNew.processedAt ? new Date(nameChangeAsNew.processedAt).toISOString() : null;
      
      // Recupera i dati del biglietto originale
      const [originalTicketData] = await db
        .select({
          id: siaeTickets.id,
          fiscalSealCode: siaeTickets.fiscalSealCode,
          progressiveNumber: siaeFiscalSeals.progressiveNumber,
        })
        .from(siaeTickets)
        .leftJoin(siaeFiscalSeals, eq(siaeFiscalSeals.id, siaeTickets.fiscalSealId))
        .where(eq(siaeTickets.id, nameChangeAsNew.originalTicketId));
      
      if (originalTicketData) {
        previousTicket = {
          id: originalTicketData.id,
          sigilloFiscale: originalTicketData.fiscalSealCode,
          progressiveNumber: originalTicketData.progressiveNumber,
        };
      }
    }

    // Se questo biglietto è stato sostituito (originalTicketId = questo ticket)
    let replacedBy: { id: string; sigilloFiscale: string | null; progressiveNumber: number | null } | null = null;
    
    const nameChangeAsOriginal = nameChangeHistory.find(nc => nc.originalTicketId === id && nc.status === 'completed');
    if (nameChangeAsOriginal && nameChangeAsOriginal.newTicketId) {
      if (!nameChangeDate) {
        nameChangeDate = nameChangeAsOriginal.processedAt ? new Date(nameChangeAsOriginal.processedAt).toISOString() : null;
      }
      
      // Recupera i dati del nuovo biglietto
      const [newTicketData] = await db
        .select({
          id: siaeTickets.id,
          fiscalSealCode: siaeTickets.fiscalSealCode,
          progressiveNumber: siaeFiscalSeals.progressiveNumber,
        })
        .from(siaeTickets)
        .leftJoin(siaeFiscalSeals, eq(siaeFiscalSeals.id, siaeTickets.fiscalSealId))
        .where(eq(siaeTickets.id, nameChangeAsOriginal.newTicketId));
      
      if (newTicketData) {
        replacedBy = {
          id: newTicketData.id,
          sigilloFiscale: newTicketData.fiscalSealCode,
          progressiveNumber: newTicketData.progressiveNumber,
        };
      }
    }

    const emissionDateTime = ticket.emissionDate 
      ? new Date(ticket.emissionDate).toISOString() 
      : null;

    // Ensure ticketPrice always has a valid value (fallback to grossAmount)
    const effectiveTicketPrice = ticket.ticketPrice || ticket.grossAmount || '0';

    res.json({
      ...ticket,
      ticketPrice: effectiveTicketPrice, // Override with guaranteed value
      emittedAt: emissionDateTime,
      emissionDateTime: emissionDateTime,
      organizerCompany: ticket.organizerCompany || "Organizzatore",
      ticketingManager: ticket.ticketingManager || null,
      progressiveNumber: ticket.progressiveNumber || null,
      // Map DB field names to frontend expected names
      allowNameChange: ticket.allowsChangeName,
      allowResale: ticket.allowsResale,
      nameChangeFee: ticket.nameChangeFee || '0',
      resaleMaxMarkupPercent: 0,
      nameChangeDeadlineHours: 24,
      resaleDeadlineHours: 2,
      canNameChange,
      canResale: canResale && !existingResale,
      isListed: !!existingResale,
      existingResale: existingResale || null,
      hoursToEvent: Math.floor(hoursToEvent),
      // Flag per indicare se il biglietto proviene da un cambio nominativo
      // In tal caso, non mostrare l'intestatario e nascondere azioni
      isFromNameChange,
      // Name change information
      nameChangeHistory,
      previousTicket,
      replacedBy,
      nameChangeDate,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get ticket detail error:", error);
    res.status(500).json({ message: "Errore nel caricamento biglietto" });
  }
});

// Download PDF biglietto
router.get("/api/public/account/tickets/:id/pdf", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    // Get ticket with all needed info
    const [ticket] = await db
      .select({
        id: siaeTickets.id,
        ticketCode: siaeTickets.ticketCode,
        ticketType: siaeTickets.ticketType,
        ticketPrice: siaeTickets.ticketPrice,
        grossAmount: siaeTickets.grossAmount,
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        status: siaeTickets.status,
        qrCode: siaeTickets.qrCode,
        fiscalSealCode: siaeTickets.fiscalSealCode,
        sectorId: siaeTickets.sectorId,
        sectorCode: siaeTickets.sectorCode,
        ticketedEventId: siaeTickets.ticketedEventId,
        eventName: events.name,
        eventStart: events.startDatetime,
        locationName: locations.name,
        sectorName: siaeEventSectors.name,
        companyId: siaeTicketedEvents.companyId,
      })
      .from(siaeTickets)
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(and(
        eq(siaeTickets.id, id),
        eq(siaeTickets.customerId, customer.id)
      ));

    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }

    if (ticket.status !== 'active' && ticket.status !== 'emitted') {
      return res.status(400).json({ message: "Biglietto non scaricabile" });
    }

    const eventStartDate = ticket.eventStart ? new Date(ticket.eventStart) : new Date();
    const holderName = `${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim() || 'Ospite';
    const price = parseFloat(ticket.grossAmount || ticket.ticketPrice || '0').toFixed(2);

    // Fetch template for the company (if available)
    const template = await storage.getDefaultDigitalTicketTemplate(ticket.companyId || undefined);

    // Generate digital PDF with modern layout
    const pdfBuffer = await generateDigitalTicketPdf({
      eventName: ticket.eventName || 'Evento',
      eventDate: eventStartDate,
      locationName: ticket.locationName || '',
      sectorName: ticket.sectorName || ticket.sectorCode || '',
      holderName,
      price,
      ticketCode: ticket.ticketCode || ticket.id.slice(-12).toUpperCase(),
      qrCode: ticket.qrCode || `TICKET-${ticket.id}`,
      fiscalSealCode: ticket.fiscalSealCode || undefined,
    }, template);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="biglietto-${ticket.ticketCode}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error("[PUBLIC] Download ticket PDF error:", error);
    res.status(500).json({ message: "Errore nella generazione del PDF" });
  }
});

// Genera immagine biglietto per Apple Wallet
router.get("/api/public/account/tickets/:id/wallet/apple", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    // Get ticket with all needed info
    const [ticket] = await db
      .select({
        id: siaeTickets.id,
        ticketCode: siaeTickets.ticketCode,
        ticketType: siaeTickets.ticketType,
        ticketPrice: siaeTickets.ticketPrice,
        grossAmount: siaeTickets.grossAmount,
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        status: siaeTickets.status,
        qrCode: siaeTickets.qrCode,
        fiscalSealCode: siaeTickets.fiscalSealCode,
        sectorCode: siaeTickets.sectorCode,
        ticketedEventId: siaeTickets.ticketedEventId,
        eventName: events.name,
        eventStart: events.startDatetime,
        locationName: locations.name,
        sectorName: siaeEventSectors.name,
      })
      .from(siaeTickets)
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(and(
        eq(siaeTickets.id, id),
        eq(siaeTickets.customerId, customer.id)
      ));

    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }

    if (ticket.status !== 'active' && ticket.status !== 'emitted') {
      return res.status(400).json({ message: "Biglietto non valido per wallet" });
    }

    const eventDate = ticket.eventStart ? new Date(ticket.eventStart) : new Date();
    const holderName = `${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim() || 'Ospite';
    const price = parseFloat(ticket.grossAmount || ticket.ticketPrice || '0').toFixed(2);

    // Generate wallet image using pdf-service
    const imageBuffer = await generateWalletImage({
      eventName: ticket.eventName || 'Evento',
      eventDate,
      locationName: ticket.locationName || '',
      sectorName: ticket.sectorName || '',
      holderName,
      price,
      ticketCode: ticket.ticketCode || ticket.id.slice(-8).toUpperCase(),
      qrCode: ticket.qrCode || `TICKET-${ticket.id}`,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="wallet-ticket-${ticket.ticketCode}.png"`);
    res.send(imageBuffer);

  } catch (error: any) {
    console.error("[PUBLIC] Generate Apple Wallet image error:", error);
    res.status(500).json({ message: "Errore nella generazione dell'immagine wallet" });
  }
});

// Genera link per Google Wallet (redirect a pagina con istruzioni)
router.get("/api/public/account/tickets/:id/wallet/google", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    // Verifica che il biglietto esista e appartenga al cliente
    const [ticket] = await db
      .select({
        id: siaeTickets.id,
        ticketCode: siaeTickets.ticketCode,
        status: siaeTickets.status,
      })
      .from(siaeTickets)
      .where(and(
        eq(siaeTickets.id, id),
        eq(siaeTickets.customerId, customer.id)
      ));

    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }

    if (ticket.status !== 'active' && ticket.status !== 'emitted') {
      return res.status(400).json({ message: "Biglietto non valido per wallet" });
    }

    // Per ora, reindirizza all'endpoint Apple che genera l'immagine
    // In futuro si potrebbe integrare con Google Wallet API
    res.redirect(`/api/public/account/tickets/${id}/wallet/apple`);

  } catch (error: any) {
    console.error("[PUBLIC] Generate Google Wallet error:", error);
    res.status(500).json({ message: "Errore nella generazione del pass Google Wallet" });
  }
});

// Ottieni wallet e saldo
router.get("/api/public/account/wallet", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const wallet = await siaeStorage.getOrCreateCustomerWallet(customer.id);

    res.json({
      id: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
      isActive: wallet.isActive,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get wallet error:", error);
    res.status(500).json({ message: "Errore nel caricamento wallet" });
  }
});

// Ottieni storico transazioni wallet
router.get("/api/public/account/wallet/transactions", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = await siaeStorage.getWalletTransactions(customer.id, limit);

    res.json({ transactions });
  } catch (error: any) {
    console.error("[PUBLIC] Get wallet transactions error:", error);
    res.status(500).json({ message: "Errore nel caricamento transazioni" });
  }
});

// ==================== WALLET TOPUP ====================

// Crea payment intent per ricarica wallet
router.post("/api/public/account/wallet/topup", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer || !customer.id) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { amount } = req.body;
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount < 5 || numAmount > 500) {
      return res.status(400).json({ 
        message: "Importo non valido. Minimo €5, massimo €500." 
      });
    }

    const amountInCents = Math.round(numAmount * 100);
    
    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "eur",
      metadata: {
        type: "wallet_topup",
        customerId: customer.id,
        amount: numAmount.toString(),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: numAmount,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Wallet topup create error:", error);
    res.status(500).json({ message: "Errore nella creazione del pagamento" });
  }
});

// Conferma ricarica wallet dopo pagamento
router.post("/api/public/account/wallet/topup/confirm", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer || !customer.id) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ message: "Payment intent non fornito" });
    }

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ 
        message: "Pagamento non completato",
        status: paymentIntent.status,
      });
    }

    // Verifica che sia un topup per questo cliente
    if (paymentIntent.metadata?.type !== "wallet_topup" || 
        paymentIntent.metadata?.customerId !== customer.id) {
      return res.status(400).json({ message: "Payment intent non valido" });
    }

    const amount = parseFloat(paymentIntent.metadata.amount || "0");
    if (amount <= 0) {
      return res.status(400).json({ message: "Importo non valido" });
    }

    // Verifica che non sia già stato accreditato
    const existingTx = await db
      .select()
      .from(siaeWalletTransactions)
      .where(eq(siaeWalletTransactions.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (existingTx.length > 0) {
      return res.status(400).json({ message: "Ricarica già accreditata" });
    }

    // Accredita il wallet
    const wallet = await siaeStorage.getOrCreateCustomerWallet(customer.id);
    const currentBalance = parseFloat(wallet.balance || "0");
    const newBalance = currentBalance + amount;

    await siaeStorage.updateWalletBalance(wallet.id, newBalance.toFixed(2));

    const transaction = await siaeStorage.createWalletTransaction({
      walletId: wallet.id,
      customerId: customer.id,
      type: "credit",
      amount: amount.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description: `Ricarica wallet €${amount.toFixed(2)}`,
      stripePaymentIntentId: paymentIntentId,
      status: "completed",
    });

    res.json({
      success: true,
      transaction,
      newBalance: newBalance.toFixed(2),
    });
  } catch (error: any) {
    console.error("[PUBLIC] Wallet topup confirm error:", error);
    res.status(500).json({ message: "Errore nella conferma della ricarica" });
  }
});

// Crea Stripe Checkout Session per ricarica wallet (per app mobile)
router.post("/api/public/account/wallet/topup-checkout", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer || !customer.id) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { amount, successUrl, cancelUrl } = req.body;
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount < 5) {
      return res.status(400).json({ message: "Importo minimo €5.00" });
    }

    const amountInCents = Math.round(numAmount * 100);
    const stripe = await getUncachableStripeClient();
    
    // Create Stripe Checkout Session (hosted payment page)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Ricarica Wallet Event4U',
              description: `Ricarica di €${numAmount.toFixed(2)} sul tuo wallet`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.PUBLIC_URL || 'https://manage.eventfouryou.com'}/wallet/topup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.PUBLIC_URL || 'https://manage.eventfouryou.com'}/wallet/topup/cancel`,
      customer_email: customer.email,
      metadata: {
        type: "wallet_topup",
        customerId: customer.id,
        amount: numAmount.toString(),
      },
    });

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      amount: numAmount,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Wallet topup checkout session error:", error);
    res.status(500).json({ message: "Errore nella creazione della sessione di pagamento" });
  }
});

// Conferma ricarica wallet dopo Stripe Checkout Session
router.post("/api/public/account/wallet/topup-checkout/confirm", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer || !customer.id) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID non fornito" });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ 
        message: "Pagamento non completato",
        status: session.payment_status,
      });
    }

    // Verifica che sia un topup per questo cliente
    if (session.metadata?.type !== "wallet_topup" || 
        session.metadata?.customerId !== customer.id) {
      return res.status(400).json({ message: "Sessione non valida" });
    }

    const amount = parseFloat(session.metadata.amount || "0");
    if (amount <= 0) {
      return res.status(400).json({ message: "Importo non valido" });
    }

    const paymentIntentId = session.payment_intent as string;

    // Verifica che non sia già stato accreditato
    const existingTx = await db
      .select()
      .from(siaeWalletTransactions)
      .where(eq(siaeWalletTransactions.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (existingTx.length > 0) {
      // Già accreditato, restituisci successo con i dati esistenti
      const wallet = await siaeStorage.getOrCreateCustomerWallet(customer.id);
      return res.json({
        success: true,
        alreadyProcessed: true,
        newBalance: wallet.balance,
      });
    }

    // Accredita il wallet
    const wallet = await siaeStorage.getOrCreateCustomerWallet(customer.id);
    const currentBalance = parseFloat(wallet.balance || "0");
    const newBalance = currentBalance + amount;

    await siaeStorage.updateWalletBalance(wallet.id, newBalance.toFixed(2));

    const transaction = await siaeStorage.createWalletTransaction({
      walletId: wallet.id,
      customerId: customer.id,
      type: "credit",
      amount: amount.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description: `Ricarica wallet €${amount.toFixed(2)}`,
      stripePaymentIntentId: paymentIntentId,
      status: "completed",
    });

    res.json({
      success: true,
      transaction,
      newBalance: newBalance.toFixed(2),
    });
  } catch (error: any) {
    console.error("[PUBLIC] Wallet topup checkout confirm error:", error);
    res.status(500).json({ message: "Errore nella conferma della ricarica" });
  }
});

// ============ MOBILE TICKET CHECKOUT (Stripe Checkout Sessions) ============

// Crea Stripe Checkout session per acquisto biglietti da app mobile
router.post("/api/public/mobile/checkout", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Devi essere autenticato per procedere al pagamento" });
    }

    const { items, successUrl, cancelUrl } = req.body;
    
    // items = [{ ticketedEventId, sectorId, ticketTypeId, quantity, unitPrice }]
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Carrello vuoto" });
    }

    // Verifica eventi e calcola totali - SEMPRE validare prezzi dal database
    let subtotal = 0;
    const lineItems: any[] = [];
    const eventDetails: any[] = [];

    for (const item of items) {
      const { ticketedEventId, sectorId, ticketTypeId, quantity } = item;
      
      if (!ticketedEventId || !sectorId || !quantity) {
        return res.status(400).json({ message: "Dati biglietto incompleti" });
      }

      if (quantity < 1 || quantity > 10) {
        return res.status(400).json({ message: "Quantità non valida (1-10)" });
      }

      // Verifica evento esiste e attivo
      const [event] = await db
        .select()
        .from(siaeTicketedEvents)
        .where(eq(siaeTicketedEvents.id, ticketedEventId));

      if (!event || event.status !== 'active') {
        return res.status(400).json({ message: "Evento non disponibile" });
      }

      // Valida il prezzo dal database - NON fidarsi del client
      const [sector] = await db
        .select()
        .from(siaeEventSectors)
        .where(and(
          eq(siaeEventSectors.ticketedEventId, ticketedEventId),
          eq(siaeEventSectors.id, sectorId)
        ));

      if (!sector) {
        return res.status(400).json({ message: "Settore non trovato" });
      }

      // Usa il prezzo dal database (priceIntero è il prezzo base)
      const validatedPrice = Number(sector.priceIntero) || 0;
      if (validatedPrice <= 0) {
        return res.status(400).json({ message: "Prezzo non disponibile per questo settore" });
      }

      const itemTotal = validatedPrice * quantity;
      subtotal += itemTotal;

      lineItems.push({
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(validatedPrice * 100),
          product_data: {
            name: `${event.eventName} - ${sector.name || 'Biglietto'}`,
            description: `Quantità: ${quantity}`,
          },
        },
        quantity: quantity,
      });

      eventDetails.push({
        ticketedEventId,
        sectorId,
        ticketTypeId,
        quantity,
        unitPrice: validatedPrice,
        sectorName: sector.name,
        eventName: event.eventName,
        eventDate: event.eventDate,
      });
    }

    // Calcola commissioni (5%)
    const commissionAmount = subtotal * 0.05;
    const total = subtotal + commissionAmount;

    // Aggiungi commissioni come riga separata
    if (commissionAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(commissionAmount * 100),
          product_data: {
            name: 'Commissioni di servizio',
          },
        },
        quantity: 1,
      });
    }

    const stripe = await getUncachableStripeClient();

    // Crea Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl || 'https://manage.eventfouryou.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'https://manage.eventfouryou.com/checkout/cancel',
      customer_email: customer.email,
      metadata: {
        customerId: customer.id,
        type: 'mobile_ticket_purchase',
        itemsCount: items.length.toString(),
        subtotal: subtotal.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        total: total.toFixed(2),
        cartSnapshot: JSON.stringify(eventDetails),
      },
    });

    console.log(`[MOBILE] Created checkout session ${session.id} for customer ${customer.id}, total: €${total.toFixed(2)}`);

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      subtotal,
      commissionAmount,
      total,
      items: eventDetails,
    });
  } catch (error: any) {
    console.error("[MOBILE] Checkout session error:", error);
    res.status(500).json({ message: "Errore nella creazione della sessione di pagamento" });
  }
});

// Conferma checkout mobile dopo pagamento Stripe
router.post("/api/public/mobile/checkout/confirm", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID richiesto" });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verifica che la sessione appartenga a questo cliente
    if (session.metadata?.customerId !== customer.id) {
      return res.status(403).json({ message: "Sessione non autorizzata" });
    }

    // Verifica stato pagamento
    if (session.payment_status !== 'paid') {
      return res.json({
        success: false,
        status: session.payment_status,
        message: "Pagamento non completato",
      });
    }

    // Recupera dettagli dal metadata
    const cartSnapshot = JSON.parse(session.metadata?.cartSnapshot || '[]');
    const total = parseFloat(session.metadata?.total || '0');

    // TODO: Qui andrà la logica di emissione biglietti reali
    // Per ora, restituiamo solo conferma del pagamento

    console.log(`[MOBILE] Checkout confirmed for session ${sessionId}, total: €${total.toFixed(2)}`);

    res.json({
      success: true,
      status: 'completed',
      paymentIntentId: session.payment_intent as string,
      total,
      items: cartSnapshot,
      message: "Pagamento completato con successo",
    });
  } catch (error: any) {
    console.error("[MOBILE] Checkout confirm error:", error);
    res.status(500).json({ message: "Errore nella conferma del pagamento" });
  }
});

// Richiedi cambio nominativo
router.post("/api/public/account/name-change", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { 
      ticketId, 
      newFirstName, 
      newLastName,
      newEmail,
      newFiscalCode,
      newDocumentType,
      newDocumentNumber,
      newDateOfBirth 
    } = req.body;

    if (!ticketId || !newFirstName || !newLastName || !newEmail || !newFiscalCode || !newDocumentType || !newDocumentNumber || !newDateOfBirth) {
      return res.status(400).json({ message: "Dati incompleti. Tutti i campi sono obbligatori secondo le norme SIAE." });
    }

    // Verifica biglietto e permessi
    const [ticket] = await db
      .select({
        id: siaeTickets.id,
        status: siaeTickets.status,
        ticketedEventId: siaeTickets.ticketedEventId,
        customerId: siaeTickets.customerId,
        ticketPrice: siaeTickets.ticketPrice,
        grossAmount: siaeTickets.grossAmount,
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        sectorId: siaeTickets.sectorId,
        transactionId: siaeTickets.transactionId,
        ticketTypeCode: siaeTickets.ticketTypeCode,
        sectorCode: siaeTickets.sectorCode,
        allowsChangeName: siaeTicketedEvents.allowsChangeName,
        nameChangeFee: siaeTicketedEvents.nameChangeFee,
        autoApproveNameChanges: siaeTicketedEvents.autoApproveNameChanges,
        siaeEventCode: siaeTicketedEvents.siaeEventCode,
        eventStart: events.startDatetime,
      })
      .from(siaeTickets)
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(and(
        eq(siaeTickets.id, ticketId),
        eq(siaeTickets.customerId, customer.id)
      ));

    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }

    // Verifica se questo biglietto è il risultato di un cambio nominativo precedente
    // In tal caso, NON può più essere ceduto/cambiato
    const [wasFromNameChange] = await db
      .select({ id: siaeNameChanges.id })
      .from(siaeNameChanges)
      .where(and(
        eq(siaeNameChanges.newTicketId, ticketId),
        eq(siaeNameChanges.status, 'completed')
      ))
      .limit(1);
    
    if (wasFromNameChange) {
      return res.status(400).json({ 
        message: "Questo biglietto è già stato oggetto di un cambio nominativo e non può essere ceduto nuovamente" 
      });
    }

    const validStatuses = ['active', 'sold', 'paid', 'emitted', 'valid'];
    if (!validStatuses.includes(ticket.status || '')) {
      return res.status(400).json({ message: "Biglietto non valido per cambio nominativo" });
    }

    if (!ticket.allowsChangeName) {
      return res.status(400).json({ message: "Cambio nominativo non consentito per questo evento" });
    }

    const now = new Date();
    const eventStart = new Date(ticket.eventStart);
    const hoursToEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursToEvent < 24) {
      return res.status(400).json({ 
        message: `Cambio nominativo non più disponibile. Scadenza: 24h prima dell'evento` 
      });
    }

    // Check name change fee from event settings
    const fee = parseFloat(ticket.nameChangeFee || '0');
    const paymentStatus = fee > 0 ? 'pending' : 'not_required';

    // Crea richiesta cambio nominativo con dati SIAE completi
    const [nameChange] = await db
      .insert(siaeNameChanges)
      .values({
        originalTicketId: ticketId,
        requestedById: customer.id,
        requestedByType: 'customer',
        newFirstName,
        newLastName,
        newEmail,
        newFiscalCode: newFiscalCode.toUpperCase(),
        newDocumentType,
        newDocumentNumber,
        newDateOfBirth,
        fee: fee.toFixed(2),
        paymentStatus,
        status: 'pending',
      })
      .returning();

    console.log("[PUBLIC] Name change request created:", nameChange.id, "fee:", fee, "paymentStatus:", paymentStatus, "autoApprove:", ticket.autoApproveNameChanges);
    
    // Auto-approvazione se abilitata e nessuna fee richiesta
    if (ticket.autoApproveNameChanges && fee === 0) {
      console.log("[PUBLIC] Auto-approval enabled, checking bridge status...");
      const bridgeStatus = getCachedBridgeStatus();
      
      if (bridgeStatus.bridgeConnected && bridgeStatus.cardInserted) {
        try {
          // Request fiscal seal for new ticket
          const priceInCents = Math.round(Number(ticket.grossAmount || ticket.ticketPrice || 0) * 100);
          console.log(`[PUBLIC] Auto-approving name change ${nameChange.id}, requesting seal for ${priceInCents} cents`);
          const sealData = await requestFiscalSeal(priceInCents);
          
          // Process the name change in a transaction
          const result = await db.transaction(async (tx) => {
            // Mark original ticket as annulled for name change (SIAE-compliant)
            await tx.update(siaeTickets)
              .set({
                status: 'annullato_cambio_nominativo',
                cancellationReasonCode: '10', // TAB.5: "Cambio nominativo - vecchio titolo"
                cancellationDate: new Date(),
                updatedAt: new Date()
              })
              .where(eq(siaeTickets.id, ticketId));
            
            // Get next progressive number
            const [{ maxProgress }] = await tx
              .select({ maxProgress: sql<number>`COALESCE(MAX(progressive_number), 0)` })
              .from(siaeTickets)
              .where(eq(siaeTickets.ticketedEventId, ticket.ticketedEventId));
            const newProgressiveNumber = (maxProgress || 0) + 1;
            
            // Generate new ticket code
            const newTicketCode = `${ticket.siaeEventCode || 'TKT'}-NC-${newProgressiveNumber.toString().padStart(6, '0')}`;
            
            // Get original ticket full data for copying
            const [originalTicket] = await tx.select().from(siaeTickets).where(eq(siaeTickets.id, ticketId));
            
            // Create new ticket with new holder data (keep original customerId for ownership)
            const [newTicket] = await tx.insert(siaeTickets)
              .values({
                ticketedEventId: originalTicket!.ticketedEventId,
                sectorId: originalTicket!.sectorId,
                transactionId: originalTicket?.transactionId,
                customerId: originalTicket?.customerId || customer.id, // Preserve original ownership
                fiscalSealCode: sealData.sealCode,
                fiscalSealCounter: sealData.counter,
                progressiveNumber: newProgressiveNumber,
                cardCode: sealData.serialNumber,
                emissionDate: new Date(),
                emissionDateStr: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                emissionTimeStr: new Date().toTimeString().slice(0, 5).replace(':', ''),
                ticketTypeCode: originalTicket!.ticketTypeCode,
                sectorCode: originalTicket!.sectorCode,
                ticketCode: newTicketCode,
                ticketType: originalTicket?.ticketType,
                ticketPrice: originalTicket?.ticketPrice,
                seatId: originalTicket?.seatId,
                row: originalTicket?.row,
                seatNumber: originalTicket?.seatNumber,
                grossAmount: originalTicket?.grossAmount || '0',
                netAmount: originalTicket?.netAmount,
                vatAmount: originalTicket?.vatAmount,
                prevendita: originalTicket?.prevendita,
                prevenditaVat: originalTicket?.prevenditaVat,
                participantFirstName: newFirstName,
                participantLastName: newLastName,
                isComplimentary: originalTicket?.isComplimentary,
                paymentMethod: 'name_change',
                status: 'active',
                originalTicketId: ticketId,
                qrCode: `SIAE-TKT-NC-${newProgressiveNumber}`,
              })
              .returning();
            
            // Update original ticket with replacement reference
            await tx.update(siaeTickets)
              .set({ replacedByTicketId: newTicket.id })
              .where(eq(siaeTickets.id, ticketId));
            
            // Update name change request as completed
            const [updatedNameChange] = await tx.update(siaeNameChanges)
              .set({
                status: 'completed',
                newTicketId: newTicket.id,
                processedAt: new Date(),
                notes: 'Approvato automaticamente (auto-approval)',
                updatedAt: new Date()
              })
              .where(eq(siaeNameChanges.id, nameChange.id))
              .returning();
            
            return { newTicket, updatedNameChange };
          });
          
          console.log(`[PUBLIC] Auto-approval completed for name change ${nameChange.id}, new ticket: ${result.newTicket.id}`);
          
          // Send email to new holder (async, don't block response)
          (async () => {
            try {
              // Fetch event data
              const [ticketedEvent] = await db.select().from(siaeTicketedEvents).where(eq(siaeTicketedEvents.id, ticket.ticketedEventId));
              if (!ticketedEvent) return;
              
              const [event] = await db.select().from(events).where(eq(events.id, ticketedEvent.eventId));
              if (!event) return;
              
              const [sector] = await db.select().from(siaeEventSectors).where(eq(siaeEventSectors.id, ticket.sectorId));
              
              const ticketData = {
                eventName: event.name,
                eventDate: event.startDatetime,
                locationName: 'N/A',
                sectorName: sector?.name || 'N/A',
                holderName: `${newFirstName} ${newLastName}`,
                price: String(ticket.grossAmount || ticket.ticketPrice || '0'),
                ticketCode: result.newTicket.ticketCode || '',
                qrCode: result.newTicket.qrCode || '',
                fiscalSealCode: sealData.sealCode
              };
              
              const pdfBuffer = await generateDigitalTicketPdf(ticketData);
              
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
                to: newEmail,
                subject: `Cambio Nominativo Completato - ${event.name}`,
                eventName: event.name,
                tickets: [{ id: result.newTicket.id, html: ticketHtml }],
                pdfBuffers: [pdfBuffer]
              });
              
              console.log(`[PUBLIC] Email sent for name change ${nameChange.id} to ${newEmail}`);
            } catch (emailError) {
              console.error('[PUBLIC] Auto-approval email error:', emailError);
            }
          })();
          
          return res.json({
            message: "Cambio nominativo completato automaticamente. Il nuovo biglietto è stato emesso e inviato via email.",
            nameChangeId: nameChange.id,
            newTicketId: result.newTicket.id,
            fee: "0.00",
            paymentStatus: 'not_required',
            requiresPayment: false,
            autoApproved: true,
            status: 'completed'
          });
        } catch (autoApproveError: any) {
          console.error("[PUBLIC] Auto-approval failed:", autoApproveError);
          // Fall through to return pending status - will be processed manually
        }
      } else {
        console.log("[PUBLIC] Bridge not ready for auto-approval, request will be pending");
      }
    }
    
    res.json({ 
      message: fee > 0 
        ? "Richiesta creata. Per completare il cambio nominativo è richiesto il pagamento della commissione."
        : "Richiesta cambio nominativo inviata. Sarà processata a breve.",
      nameChangeId: nameChange.id,
      fee: fee.toFixed(2),
      paymentStatus,
      requiresPayment: fee > 0,
      autoApproved: false,
      status: 'pending'
    });
  } catch (error: any) {
    console.error("[PUBLIC] Name change error:", error);
    res.status(500).json({ message: "Errore nella richiesta cambio nominativo" });
  }
});

// Create payment intent for name change fee
router.post("/api/public/account/name-change/:id/pay", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    // Get name change request
    const [nameChange] = await db
      .select()
      .from(siaeNameChanges)
      .where(and(
        eq(siaeNameChanges.id, id),
        eq(siaeNameChanges.requestedById, customer.id)
      ));

    if (!nameChange) {
      return res.status(404).json({ message: "Richiesta non trovata" });
    }

    if (nameChange.paymentStatus === 'paid') {
      return res.status(400).json({ message: "Pagamento già effettuato" });
    }

    if (nameChange.status !== 'pending') {
      return res.status(400).json({ message: "Richiesta non valida per il pagamento" });
    }

    const feeAmount = parseFloat(nameChange.fee || '0');
    if (feeAmount <= 0) {
      return res.status(400).json({ message: "Nessuna commissione richiesta" });
    }

    const amountInCents = Math.round(feeAmount * 100);

    const stripe = await getUncachableStripeClient();
    
    // Check if we already have a payment intent for this request
    if (nameChange.paymentIntentId) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(nameChange.paymentIntentId);
        if (existingIntent.status === 'requires_payment_method' || existingIntent.status === 'requires_confirmation') {
          // Return existing intent
          return res.json({
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            amount: feeAmount,
          });
        }
      } catch (e) {
        // Intent not found or invalid, create new one
      }
    }
    
    // Use idempotency key to prevent duplicate intents
    const idempotencyKey = `name_change_fee_${id}_${feeAmount}`;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "eur",
      metadata: {
        type: "name_change_fee",
        nameChangeId: id,
        customerId: customer.id,
        amount: feeAmount.toString(),
      },
    }, {
      idempotencyKey,
    });

    // Save payment intent ID
    await db.update(siaeNameChanges)
      .set({ paymentIntentId: paymentIntent.id, updatedAt: new Date() })
      .where(eq(siaeNameChanges.id, id));

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: feeAmount,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Name change payment error:", error);
    res.status(500).json({ message: "Errore nella creazione del pagamento" });
  }
});

// Confirm name change fee payment
router.post("/api/public/account/name-change/:id/pay/confirm", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: "Payment intent non fornito" });
    }

    // Get name change request
    const [nameChange] = await db
      .select()
      .from(siaeNameChanges)
      .where(and(
        eq(siaeNameChanges.id, id),
        eq(siaeNameChanges.requestedById, customer.id)
      ));

    if (!nameChange) {
      return res.status(404).json({ message: "Richiesta non trovata" });
    }

    // Verify payment with Stripe
    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ 
        message: "Pagamento non completato",
        status: paymentIntent.status,
      });
    }

    // Verify metadata matches
    if (paymentIntent.metadata?.type !== "name_change_fee" || 
        paymentIntent.metadata?.nameChangeId !== id ||
        paymentIntent.metadata?.customerId !== customer.id) {
      return res.status(400).json({ message: "Payment intent non valido" });
    }

    // Update name change with payment confirmation
    const [updated] = await db.update(siaeNameChanges)
      .set({ 
        paymentStatus: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(siaeNameChanges.id, id))
      .returning();

    console.log("[PUBLIC] Name change fee paid:", id, "paymentIntentId:", paymentIntentId);
    
    // Check if auto-approval is enabled for this event
    const [ticketInfo] = await db
      .select({
        ticketId: siaeTickets.id,
        ticketedEventId: siaeTickets.ticketedEventId,
        ticketPrice: siaeTickets.ticketPrice,
        grossAmount: siaeTickets.grossAmount,
        sectorId: siaeTickets.sectorId,
        transactionId: siaeTickets.transactionId,
        ticketTypeCode: siaeTickets.ticketTypeCode,
        sectorCode: siaeTickets.sectorCode,
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        autoApproveNameChanges: siaeTicketedEvents.autoApproveNameChanges,
        siaeEventCode: siaeTicketedEvents.siaeEventCode,
      })
      .from(siaeTickets)
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .where(eq(siaeTickets.id, nameChange.originalTicketId));
    
    if (ticketInfo?.autoApproveNameChanges) {
      console.log("[PUBLIC] Auto-approval enabled after payment, checking bridge status...");
      const bridgeStatus = getCachedBridgeStatus();
      
      if (bridgeStatus.bridgeConnected && bridgeStatus.cardInserted) {
        try {
          // Request fiscal seal for new ticket
          const priceInCents = Math.round(Number(ticketInfo.grossAmount || ticketInfo.ticketPrice || 0) * 100);
          console.log(`[PUBLIC] Auto-approving name change ${id} after payment, requesting seal for ${priceInCents} cents`);
          const sealData = await requestFiscalSeal(priceInCents);
          
          // Process the name change in a transaction
          const result = await db.transaction(async (tx) => {
            // Mark original ticket as replaced
            await tx.update(siaeTickets)
              .set({
                status: 'replaced',
                cancellationReasonCode: 'CN',
                cancellationDate: new Date(),
                updatedAt: new Date()
              })
              .where(eq(siaeTickets.id, nameChange.originalTicketId));
            
            // Get next progressive number
            const [{ maxProgress }] = await tx
              .select({ maxProgress: sql<number>`COALESCE(MAX(progressive_number), 0)` })
              .from(siaeTickets)
              .where(eq(siaeTickets.ticketedEventId, ticketInfo.ticketedEventId));
            const newProgressiveNumber = (maxProgress || 0) + 1;
            
            // Generate new ticket code
            const newTicketCode = `${ticketInfo.siaeEventCode || 'TKT'}-NC-${newProgressiveNumber.toString().padStart(6, '0')}`;
            
            // Get original ticket full data
            const [originalTicket] = await tx.select().from(siaeTickets).where(eq(siaeTickets.id, nameChange.originalTicketId));
            
            // Create new ticket with new holder data (use full original ticket data)
            const [newTicket] = await tx.insert(siaeTickets)
              .values({
                ticketedEventId: originalTicket!.ticketedEventId,
                sectorId: originalTicket!.sectorId,
                transactionId: originalTicket?.transactionId,
                customerId: originalTicket?.customerId || customer.id, // Preserve original ownership
                fiscalSealCode: sealData.sealCode,
                fiscalSealCounter: sealData.counter,
                progressiveNumber: newProgressiveNumber,
                cardCode: sealData.serialNumber,
                emissionDate: new Date(),
                emissionDateStr: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                emissionTimeStr: new Date().toTimeString().slice(0, 5).replace(':', ''),
                ticketTypeCode: originalTicket!.ticketTypeCode,
                sectorCode: originalTicket!.sectorCode,
                ticketCode: newTicketCode,
                ticketType: originalTicket?.ticketType,
                ticketPrice: originalTicket?.ticketPrice,
                seatId: originalTicket?.seatId,
                row: originalTicket?.row,
                seatNumber: originalTicket?.seatNumber,
                grossAmount: originalTicket?.grossAmount || '0',
                netAmount: originalTicket?.netAmount,
                vatAmount: originalTicket?.vatAmount,
                prevendita: originalTicket?.prevendita,
                prevenditaVat: originalTicket?.prevenditaVat,
                participantFirstName: updated.newFirstName,
                participantLastName: updated.newLastName,
                isComplimentary: originalTicket?.isComplimentary,
                paymentMethod: 'name_change',
                status: 'active',
                originalTicketId: nameChange.originalTicketId,
                qrCode: `SIAE-TKT-NC-${newProgressiveNumber}`,
              })
              .returning();
            
            // Update original ticket with replacement reference
            await tx.update(siaeTickets)
              .set({ replacedByTicketId: newTicket.id })
              .where(eq(siaeTickets.id, nameChange.originalTicketId));
            
            // Update name change request as completed
            const [completedNameChange] = await tx.update(siaeNameChanges)
              .set({
                status: 'completed',
                newTicketId: newTicket.id,
                processedAt: new Date(),
                notes: 'Approvato automaticamente dopo pagamento (auto-approval)',
                updatedAt: new Date()
              })
              .where(eq(siaeNameChanges.id, id))
              .returning();
            
            return { newTicket, completedNameChange };
          });
          
          console.log(`[PUBLIC] Auto-approval after payment completed for ${id}, new ticket: ${result.newTicket.id}`);
          
          return res.json({
            success: true,
            message: "Pagamento confermato e cambio nominativo completato. Il nuovo biglietto è stato emesso.",
            nameChange: result.completedNameChange,
            newTicketId: result.newTicket.id,
            autoApproved: true,
          });
        } catch (autoApproveError: any) {
          console.error("[PUBLIC] Auto-approval after payment failed:", autoApproveError);
          // Fall through to return pending status
        }
      } else {
        console.log("[PUBLIC] Bridge not ready for auto-approval after payment");
      }
    }
    
    res.json({
      success: true,
      message: "Pagamento confermato. La tua richiesta è ora in attesa di approvazione.",
      nameChange: updated,
      autoApproved: false,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Name change payment confirm error:", error);
    res.status(500).json({ message: "Errore nella conferma del pagamento" });
  }
});

// Metti biglietto in rivendita
router.post("/api/public/account/resale", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { ticketId, resalePrice } = req.body;

    if (!ticketId || resalePrice === undefined) {
      return res.status(400).json({ message: "Dati incompleti" });
    }

    // Verifica biglietto e permessi
    const [ticket] = await db
      .select({
        id: siaeTickets.id,
        status: siaeTickets.status,
        ticketedEventId: siaeTickets.ticketedEventId,
        customerId: siaeTickets.customerId,
        ticketPrice: siaeTickets.ticketPrice,
        grossAmount: siaeTickets.grossAmount,
        allowsResale: siaeTicketedEvents.allowsResale,
        eventStart: events.startDatetime,
      })
      .from(siaeTickets)
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(and(
        eq(siaeTickets.id, ticketId),
        eq(siaeTickets.customerId, customer.id)
      ));

    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
    }

    // Verifica se questo biglietto è il risultato di un cambio nominativo precedente
    // In tal caso, NON può più essere rivenduto
    const [wasFromNameChange] = await db
      .select({ id: siaeNameChanges.id })
      .from(siaeNameChanges)
      .where(and(
        eq(siaeNameChanges.newTicketId, ticketId),
        eq(siaeNameChanges.status, 'completed')
      ))
      .limit(1);
    
    if (wasFromNameChange) {
      return res.status(400).json({ 
        message: "Questo biglietto è già stato oggetto di un cambio nominativo e non può essere rivenduto" 
      });
    }

    // Consenti rivendita per biglietti emitted o active (coerente con canResale nel frontend)
    if (ticket.status !== 'emitted' && ticket.status !== 'active') {
      return res.status(400).json({ message: "Biglietto non valido per rivendita" });
    }

    if (!ticket.allowsResale) {
      return res.status(400).json({ message: "Rivendita non consentita per questo evento" });
    }

    const now = new Date();
    const eventStart = new Date(ticket.eventStart);
    const hoursToEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Rivendita consentita fino a 2 ore prima dell'evento
    if (hoursToEvent < 2) {
      return res.status(400).json({ 
        message: `Rivendita non più disponibile. Scadenza: 2h prima dell'evento` 
      });
    }

    // Verifica prezzo massimo (no markup allowed by default)
    // Use ticketPrice with fallback to grossAmount
    const originalPrice = parseFloat(ticket.ticketPrice || ticket.grossAmount || '0');
    const maxPrice = originalPrice;

    if (resalePrice > maxPrice) {
      return res.status(400).json({ 
        message: `Prezzo massimo consentito: €${maxPrice.toFixed(2)} (non può superare il prezzo originale)` 
      });
    }

    // Verifica se già in rivendita
    const [existing] = await db
      .select()
      .from(siaeResales)
      .where(and(
        eq(siaeResales.originalTicketId, ticketId),
        or(eq(siaeResales.status, 'listed'), eq(siaeResales.status, 'pending'))
      ));

    if (existing) {
      return res.status(400).json({ message: "Biglietto già in rivendita" });
    }

    // Crea annuncio rivendita
    const effectiveOriginalPrice = ticket.ticketPrice || ticket.grossAmount || '0';
    const [resale] = await db
      .insert(siaeResales)
      .values({
        originalTicketId: ticketId,
        sellerId: customer.id,
        originalPrice: effectiveOriginalPrice,
        resalePrice: resalePrice.toFixed(2),
        status: 'listed',
        listedAt: new Date(),
      })
      .returning();

    console.log("[PUBLIC] Resale listing created:", resale.id);
    res.json({ 
      message: "Biglietto messo in vendita",
      resaleId: resale.id,
      resalePrice: resale.resalePrice,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Create resale error:", error);
    res.status(500).json({ message: "Errore nella creazione annuncio" });
  }
});

// Rimuovi biglietto dalla rivendita
router.delete("/api/public/account/resale/:id", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    const [resale] = await db
      .select()
      .from(siaeResales)
      .where(and(
        eq(siaeResales.id, id),
        eq(siaeResales.sellerId, customer.id),
        eq(siaeResales.status, 'listed')
      ));

    if (!resale) {
      return res.status(404).json({ message: "Annuncio non trovato" });
    }

    await db
      .update(siaeResales)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(siaeResales.id, id));

    console.log("[PUBLIC] Resale cancelled:", id);
    res.json({ message: "Annuncio rimosso" });
  } catch (error: any) {
    console.error("[PUBLIC] Cancel resale error:", error);
    res.status(500).json({ message: "Errore nella rimozione annuncio" });
  }
});

// Ottieni annunci rivendita del cliente
router.get("/api/public/account/resales", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const resales = await db
      .select({
        id: siaeResales.id,
        originalTicketId: siaeResales.originalTicketId,
        originalPrice: siaeResales.originalPrice,
        resalePrice: siaeResales.resalePrice,
        status: siaeResales.status,
        listedAt: siaeResales.listedAt,
        soldAt: siaeResales.soldAt,
        ticketCode: siaeTickets.ticketCode,
        eventName: events.name,
        eventStart: events.startDatetime,
        sectorName: siaeEventSectors.name,
      })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(eq(siaeResales.sellerId, customer.id))
      .orderBy(desc(siaeResales.listedAt));

    res.json({ resales });
  } catch (error: any) {
    console.error("[PUBLIC] Get resales error:", error);
    res.status(500).json({ message: "Errore nel caricamento annunci" });
  }
});

// ==================== RESALE PURCHASE FLOW (SIAE-COMPLIANT) ====================

// Get all available resales across all events (public, no auth required)
router.get("/api/public/resales", async (req, res) => {
  try {
    const now = new Date();
    
    const resales = await db
      .select({
        id: siaeResales.id,
        eventId: events.id,
        ticketedEventId: siaeTicketedEvents.id,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventImageUrl: events.imageUrl,
        locationName: locations.name,
        sectorName: siaeEventSectors.name,
        ticketType: siaeTickets.ticketType,
        originalPrice: siaeResales.originalPrice,
        resalePrice: siaeResales.resalePrice,
        listedAt: siaeResales.listedAt,
      })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(and(
        eq(siaeResales.status, 'listed'),
        gt(events.startDatetime, now)
      ))
      .orderBy(events.startDatetime, siaeResales.resalePrice);
    
    res.json(resales);
  } catch (error: any) {
    console.error("[PUBLIC] Get all resales error:", error);
    res.status(500).json({ message: "Errore nel caricamento rivendite" });
  }
});

// Get a single resale by ID (public, no auth required)
router.get("/api/public/resales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [resale] = await db
      .select({
        id: siaeResales.id,
        eventId: events.id,
        ticketedEventId: siaeTicketedEvents.id,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventImageUrl: events.imageUrl,
        locationName: locations.name,
        sectorName: siaeEventSectors.name,
        ticketType: siaeTickets.ticketType,
        originalPrice: siaeResales.originalPrice,
        resalePrice: siaeResales.resalePrice,
        listedAt: siaeResales.listedAt,
        status: siaeResales.status,
      })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(eq(siaeResales.id, id));
    
    if (!resale) {
      return res.status(404).json({ message: "Rivendita non trovata" });
    }
    
    res.json(resale);
  } catch (error: any) {
    console.error("[PUBLIC] Get single resale error:", error);
    res.status(500).json({ message: "Errore nel caricamento rivendita" });
  }
});

// Get available resales for an event (public, no auth required)
router.get("/api/public/events/:eventId/resales", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const resales = await db
      .select({
        id: siaeResales.id,
        resalePrice: siaeResales.resalePrice,
        originalPrice: siaeResales.originalPrice,
        listedAt: siaeResales.listedAt,
        ticketType: siaeTickets.ticketType,
        sectorName: siaeEventSectors.name,
        sectorId: siaeEventSectors.id,
      })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .where(and(
        eq(siaeTicketedEvents.eventId, eventId),
        eq(siaeResales.status, 'listed')
      ))
      .orderBy(siaeResales.resalePrice);
    
    res.json({ resales });
  } catch (error: any) {
    console.error("[PUBLIC] Get event resales error:", error);
    res.status(500).json({ message: "Errore nel caricamento rivendite" });
  }
});

// Reserve a resale for purchase (starts checkout, requires auth)
router.post("/api/public/resales/:id/reserve", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Devi essere loggato per acquistare" });
    }
    
    const { id } = req.params;
    const { buyerDocumentoTipo, buyerDocumentoNumero, captchaToken } = req.body;
    
    // CAPTCHA validation (same logic as normal checkout)
    const captchaEnabled = process.env.CAPTCHA_ENABLED !== 'false';
    if (captchaEnabled) {
      if (!captchaToken) {
        return res.status(400).json({ 
          message: "Verifica di sicurezza richiesta. Completa il CAPTCHA.",
          code: "CAPTCHA_REQUIRED"
        });
      }

      const captchaData = captchaStore.get(captchaToken);

      if (!captchaData) {
        return res.status(400).json({ 
          message: "CAPTCHA non trovato o scaduto. Riprova.",
          code: "CAPTCHA_EXPIRED"
        });
      }

      if (captchaData.expiresAt < new Date()) {
        captchaStore.delete(captchaToken);
        return res.status(400).json({ 
          message: "CAPTCHA scaduto. Riprova.",
          code: "CAPTCHA_EXPIRED"
        });
      }

      if (!captchaData.validated) {
        return res.status(400).json({ 
          message: "CAPTCHA non validato. Clicca Verifica prima di procedere.",
          code: "CAPTCHA_NOT_VALIDATED"
        });
      }

      // Delete token after successful check (one-time use after validation)
      captchaStore.delete(captchaToken);
      console.log("[RESALE] CAPTCHA validation passed");
    }
    
    // Get resale with ticket info
    const [resale] = await db
      .select({
        resale: siaeResales,
        ticket: siaeTickets,
        eventName: events.name,
        sectorName: siaeEventSectors.name,
      })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(eq(siaeResales.id, id));
    
    if (!resale) {
      return res.status(404).json({ message: "Rivendita non trovata" });
    }
    
    // Check buyer is not the seller
    if (resale.resale.sellerId === customer.id) {
      return res.status(400).json({ message: "Non puoi acquistare il tuo stesso biglietto" });
    }
    
    // Reserve for 30 minutes (Stripe requires expires_at to be at least 30 minutes)
    const reservedUntil = new Date(Date.now() + 30 * 60 * 1000);
    
    // ATOMIC: Update resale to reserved status ONLY if still listed
    // Uses returning() to verify exactly one row was updated
    const [updatedResale] = await db
      .update(siaeResales)
      .set({
        status: 'reserved',
        buyerId: customer.id,
        reservedAt: new Date(),
        reservedUntil,
        acquirenteDocumentoTipo: buyerDocumentoTipo || null,
        acquirenteDocumentoNumero: buyerDocumentoNumero || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(siaeResales.id, id),
        eq(siaeResales.status, 'listed')
      ))
      .returning();
    
    // If no rows updated, another buyer grabbed it first
    if (!updatedResale) {
      return res.status(409).json({ message: "Questo biglietto è stato appena acquistato da un altro utente" });
    }
    
    // Create Stripe checkout session
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' });
    
    const resalePrice = parseFloat(resale.resale.resalePrice);
    const platformFeePercent = 5; // 5% platform fee
    const platformFee = Math.round(resalePrice * platformFeePercent) / 100;
    const sellerPayout = resalePrice - platformFee;
    
    // Generate secure confirmation token (survives Stripe redirect when cookies are lost)
    const confirmToken = crypto.randomBytes(32).toString('hex');
    
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Rivendita: ${resale.eventName} - ${resale.sectorName}`,
              description: `Biglietto ${resale.ticket.ticketType} (Rivendita autorizzata)`,
            },
            unit_amount: Math.round(resalePrice * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/account/resale-success?resale_id=${id}&token=${confirmToken}`,
      cancel_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/account/tickets`,
      metadata: {
        resaleId: id,
        buyerId: customer.id,
        sellerId: resale.resale.sellerId,
        sellerPayout: sellerPayout.toFixed(2),
        platformFee: platformFee.toFixed(2),
        type: 'resale_purchase',
        confirmToken: confirmToken,
      },
      expires_at: Math.floor(reservedUntil.getTime() / 1000),
    });
    
    // Save checkout session ID AND confirmToken for authentication after redirect
    // FIX 2026-01-14: confirmToken was not being saved, causing authentication failure in /confirm endpoint
    await db
      .update(siaeResales)
      .set({
        stripeCheckoutSessionId: session.id,
        confirmToken: confirmToken, // CRITICAL: Must save token for /confirm endpoint authentication
        platformFee: platformFee.toFixed(2),
        sellerPayout: sellerPayout.toFixed(2),
      })
      .where(eq(siaeResales.id, id));
    
    console.log(`[RESALE] Reserved ${id} for buyer ${customer.id}, checkout: ${session.id}`);
    
    res.json({
      checkoutUrl: session.url,
      reservedUntil,
      resalePrice,
      platformFee,
      sellerPayout,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Reserve resale error:", error);
    res.status(500).json({ message: "Errore nella prenotazione" });
  }
});

// Create PaymentIntent for resale purchase (Stripe Elements flow, requires auth)
router.post("/api/public/resales/:id/payment-intent", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Devi essere loggato per acquistare" });
    }
    
    const { id } = req.params;
    const { captchaToken } = req.body;
    
    // CAPTCHA validation (same logic as normal checkout)
    const captchaEnabled = process.env.CAPTCHA_ENABLED !== 'false';
    if (captchaEnabled) {
      if (!captchaToken) {
        return res.status(400).json({ 
          message: "Verifica di sicurezza richiesta. Completa il CAPTCHA.",
          code: "CAPTCHA_REQUIRED"
        });
      }

      const captchaData = captchaStore.get(captchaToken);

      if (!captchaData) {
        return res.status(400).json({ 
          message: "CAPTCHA non trovato o scaduto. Riprova.",
          code: "CAPTCHA_EXPIRED"
        });
      }

      if (captchaData.expiresAt < new Date()) {
        captchaStore.delete(captchaToken);
        return res.status(400).json({ 
          message: "CAPTCHA scaduto. Riprova.",
          code: "CAPTCHA_EXPIRED"
        });
      }

      if (!captchaData.validated) {
        return res.status(400).json({ 
          message: "CAPTCHA non validato. Clicca Verifica prima di procedere.",
          code: "CAPTCHA_NOT_VALIDATED"
        });
      }

      // Delete token after successful check (one-time use after validation)
      captchaStore.delete(captchaToken);
      console.log("[RESALE-PAYMENT-INTENT] CAPTCHA validation passed");
    }
    
    // CRITICAL: Verifica smart card SIAE PRIMA di creare il payment intent
    // Non permettiamo pagamenti se non possiamo emettere sigilli fiscali
    // Usa versione async che richiede uno status fresco dal bridge se necessario (come negli acquisti normali)
    const cardReadiness = await ensureCardReadyForSeals();
    
    if (!cardReadiness.ready) {
      console.log(`[RESALE-PAYMENT-INTENT] Blocked: Card not ready - ${cardReadiness.error}`);
      
      // Determina il codice errore appropriato
      const errorCode = !isBridgeConnected() ? "SEAL_BRIDGE_OFFLINE" : "SEAL_CARD_NOT_READY";
      const errorMessage = !isBridgeConnected() 
        ? "Sistema sigilli fiscali non disponibile. L'app desktop Event4U deve essere connessa con la smart card SIAE inserita."
        : `Smart card SIAE non pronta: ${cardReadiness.error}`;
      
      return res.status(503).json({ 
        message: errorMessage,
        code: errorCode,
      });
    }
    
    console.log("[RESALE-PAYMENT-INTENT] Smart card check passed, proceeding with payment intent creation");
    
    // Get resale with ticket info
    const [resale] = await db
      .select({
        resale: siaeResales,
        ticket: siaeTickets,
        eventName: events.name,
        sectorName: siaeEventSectors.name,
      })
      .from(siaeResales)
      .innerJoin(siaeTickets, eq(siaeResales.originalTicketId, siaeTickets.id))
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(eq(siaeResales.id, id));
    
    if (!resale) {
      return res.status(404).json({ message: "Rivendita non trovata" });
    }
    
    // Check if already sold
    if (resale.resale.status === 'fulfilled' || resale.resale.status === 'paid') {
      return res.status(409).json({ message: "Questo biglietto è stato già venduto" });
    }
    
    // Check buyer is not the seller
    if (resale.resale.sellerId === customer.id) {
      return res.status(400).json({ message: "Non puoi acquistare il tuo stesso biglietto" });
    }
    
    // Reserve for 15 minutes (shorter than checkout session since user is on page)
    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);
    
    // ATOMIC: Update resale to reserved status ONLY if still listed (or already reserved by same buyer)
    const [updatedResale] = await db
      .update(siaeResales)
      .set({
        status: 'reserved',
        buyerId: customer.id,
        reservedAt: new Date(),
        reservedUntil,
        updatedAt: new Date(),
      })
      .where(and(
        eq(siaeResales.id, id),
        or(
          eq(siaeResales.status, 'listed'),
          and(eq(siaeResales.status, 'reserved'), eq(siaeResales.buyerId, customer.id))
        )
      ))
      .returning();
    
    // If no rows updated, another buyer grabbed it first
    if (!updatedResale) {
      return res.status(409).json({ message: "Questo biglietto è stato appena acquistato da un altro utente" });
    }
    
    // Create Stripe PaymentIntent (not Checkout Session)
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' });
    
    const resalePrice = parseFloat(resale.resale.resalePrice);
    const platformFeePercent = 5; // 5% platform fee
    const platformFee = Math.round(resalePrice * platformFeePercent) / 100;
    const sellerPayout = resalePrice - platformFee;
    
    // Generate secure confirmation token
    const confirmToken = crypto.randomBytes(32).toString('hex');
    
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(resalePrice * 100), // cents
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        resaleId: id,
        buyerId: customer.id,
        sellerId: resale.resale.sellerId,
        sellerPayout: sellerPayout.toFixed(2),
        platformFee: platformFee.toFixed(2),
        type: 'resale_purchase',
        confirmToken: confirmToken,
      },
      description: `Rivendita: ${resale.eventName} - ${resale.sectorName}`,
    });
    
    // Save PaymentIntent ID and confirmation token
    await db
      .update(siaeResales)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        platformFee: platformFee.toFixed(2),
        sellerPayout: sellerPayout.toFixed(2),
        confirmToken: confirmToken,
      })
      .where(eq(siaeResales.id, id));
    
    console.log(`[RESALE-PAYMENT-INTENT] Created PaymentIntent ${paymentIntent.id} for resale ${id}, buyer ${customer.id}`);
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      resaleId: id,
      resalePrice,
      platformFee,
      confirmToken,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Create resale payment intent error:", error);
    res.status(500).json({ message: "Errore nella creazione del pagamento" });
  }
});

// Confirm resale purchase (called after Stripe payment success)
router.post("/api/public/resales/:id/confirm", async (req, res) => {
  const startTime = Date.now();
  console.log(`[RESALE-CONFIRM] === REQUEST RECEIVED === resale_id=${req.params.id}`);
  
  try {
    const { id } = req.params;
    const { token } = req.body; // Confirmation token from URL (survives Stripe redirect)
    
    console.log(`[RESALE-CONFIRM] Processing resale ${id}, token provided: ${!!token}`);
    
    // Try session auth first, then fall back to token auth
    let customer = await getAuthenticatedCustomer(req);
    let buyerId: string | null = null;
    
    if (customer?.id) {
      console.log(`[RESALE-CONFIRM] Auth via session: customer=${customer.id}`);
      buyerId = customer.id;
    }
    
    // Get resale first (we need it to validate token)
    const [resale] = await db
      .select()
      .from(siaeResales)
      .where(eq(siaeResales.id, id));
    
    if (!resale) {
      console.log(`[RESALE-CONFIRM] REJECTED: Resale not found`);
      return res.status(404).json({ message: "Rivendita non trovata" });
    }
    
    // If no session auth, try token auth via Stripe metadata or stored confirmToken
    if (!buyerId && token) {
      console.log(`[RESALE-CONFIRM] Trying token auth...`);
      
      // First try: stored confirmToken on resale (PaymentIntent flow)
      if (resale.confirmToken && resale.confirmToken === token) {
        buyerId = resale.buyerId;
        console.log(`[RESALE-CONFIRM] Token auth via stored confirmToken SUCCESS: buyer=${buyerId}`);
        
        // Get customer data
        if (buyerId) {
          const [customerData] = await db
            .select()
            .from(siaeCustomers)
            .where(eq(siaeCustomers.id, buyerId));
          customer = customerData;
        }
      }
      // Fallback: check Stripe Checkout Session metadata (legacy flow)
      else if (resale.stripeCheckoutSessionId) {
        console.log(`[RESALE-CONFIRM] Trying legacy Checkout Session token auth...`);
        const stripe = (await import('stripe')).default;
        const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' });
        
        const stripeSession = await stripeClient.checkout.sessions.retrieve(resale.stripeCheckoutSessionId);
        
        // Validate token matches what was stored in Stripe metadata
        if (stripeSession.metadata?.confirmToken === token) {
          buyerId = stripeSession.metadata.buyerId || resale.buyerId;
          console.log(`[RESALE-CONFIRM] Legacy token auth SUCCESS: buyer=${buyerId}`);
          
          // Get customer data
          if (buyerId) {
            const [customerData] = await db
              .select()
              .from(siaeCustomers)
              .where(eq(siaeCustomers.id, buyerId));
            customer = customerData;
          }
        } else {
          console.log(`[RESALE-CONFIRM] Token auth FAILED: token mismatch`);
        }
      } else {
        console.log(`[RESALE-CONFIRM] Token auth FAILED: no confirmToken or checkout session`);
      }
    }
    
    // Must have valid buyer
    if (!buyerId) {
      console.log(`[RESALE-CONFIRM] REJECTED: Not authenticated (no session, no valid token)`);
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    // Verify buyer matches resale
    if (resale.buyerId !== buyerId) {
      console.log(`[RESALE-CONFIRM] REJECTED: Buyer mismatch (resale.buyerId=${resale.buyerId}, auth buyerId=${buyerId})`);
      return res.status(403).json({ message: "Non autorizzato" });
    }
    
    // Idempotency check: if already fulfilled, return success (prevents duplicate processing)
    if (resale.status === 'fulfilled') {
      console.log(`[RESALE-CONFIRM] Already fulfilled, returning cached success`);
      return res.json({
        success: true,
        message: "Acquisto già completato!",
        newTicketId: resale.newTicketId,
        newTicketCode: null, // Not available in this path
      });
    }
    
    // Accept 'reserved' or 'processing' (for retry after failure)
    if (resale.status !== 'reserved' && resale.status !== 'processing') {
      console.log(`[RESALE-CONFIRM] REJECTED: Invalid status ${resale.status}`);
      return res.status(400).json({ message: "Stato rivendita non valido" });
    }
    
    // Verify Stripe payment - check PaymentIntent first (Elements flow), then Checkout Session (redirect flow)
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' });
    
    let paymentIntentId: string | null = resale.stripePaymentIntentId || null;
    const expectedAmountInCents = Math.round(parseFloat(resale.resalePrice) * 100);
    
    if (resale.stripePaymentIntentId) {
      // PaymentIntent flow (Stripe Elements)
      console.log(`[RESALE-CONFIRM] Verifying PaymentIntent ${resale.stripePaymentIntentId}`);
      const paymentIntent = await stripeClient.paymentIntents.retrieve(resale.stripePaymentIntentId);
      
      // Check payment status
      if (paymentIntent.status !== 'succeeded') {
        console.log(`[RESALE-CONFIRM] PaymentIntent status: ${paymentIntent.status}`);
        return res.status(400).json({ message: "Pagamento non completato" });
      }
      
      // CRITICAL SECURITY: Verify amount matches expected resalePrice
      if (paymentIntent.amount !== expectedAmountInCents) {
        console.warn(
          `[RESALE-CONFIRM] SECURITY: PaymentIntent amount mismatch! ` +
          `Expected: ${expectedAmountInCents} cents (€${resale.resalePrice}), ` +
          `Got: ${paymentIntent.amount} cents. ` +
          `Resale: ${id}, PaymentIntent: ${paymentIntent.id}`
        );
        return res.status(400).json({ message: "L'importo del pagamento non corrisponde" });
      }
      
      console.log(`[RESALE-CONFIRM] PaymentIntent verified: status=succeeded, amount=${paymentIntent.amount} cents`);
    } else if (resale.stripeCheckoutSessionId) {
      // Legacy Checkout Session flow (redirect)
      console.log(`[RESALE-CONFIRM] Verifying Checkout Session ${resale.stripeCheckoutSessionId}`);
      const session = await stripeClient.checkout.sessions.retrieve(resale.stripeCheckoutSessionId);
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Pagamento non completato" });
      }
      
      // CRITICAL SECURITY: Verify amount matches expected resalePrice (Checkout Session amount is in cents)
      if (session.amount_total !== expectedAmountInCents) {
        console.warn(
          `[RESALE-CONFIRM] SECURITY: Checkout Session amount mismatch! ` +
          `Expected: ${expectedAmountInCents} cents (€${resale.resalePrice}), ` +
          `Got: ${session.amount_total} cents. ` +
          `Resale: ${id}, Session: ${session.id}`
        );
        return res.status(400).json({ message: "L'importo del pagamento non corrisponde" });
      }
      
      paymentIntentId = session.payment_intent as string;
      console.log(`[RESALE-CONFIRM] Checkout Session verified: status=paid, amount=${session.amount_total} cents`);
    } else {
      return res.status(400).json({ message: "Sessione pagamento non trovata" });
    }
    
    // === FULFILLMENT FLOW (SIAE-COMPLIANT WITH REAL FISCAL SEAL) ===
    console.log(`[RESALE] Starting fulfillment for ${id}`);
    
    // IMPORTANT: We do NOT update status to 'paid' yet!
    // We'll update status to 'fulfilled' only at the very end, after everything succeeds.
    // This prevents data loss if the process fails mid-way.
    
    // 1. Mark as processing (temporary state, will be fulfilled or rolled back)
    await db
      .update(siaeResales)
      .set({
        status: 'processing',
        stripePaymentIntentId: paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(siaeResales.id, id));
    
    // 2. Get original ticket details
    const [originalTicket] = await db
      .select()
      .from(siaeTickets)
      .where(eq(siaeTickets.id, resale.originalTicketId));
    
    if (!originalTicket) {
      return res.status(500).json({ message: "Biglietto originale non trovato" });
    }
    
    // NOTE: We do NOT annul the original ticket here yet!
    // We'll annul it ONLY after successfully creating the new ticket
    // This prevents the ticket from "disappearing" if something fails
    
    // Get ticketed event for company ID (needed for audit logs)
    const [ticketedEvent] = await db
      .select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, originalTicket.ticketedEventId));
    
    if (!ticketedEvent) {
      return res.status(500).json({ message: "Evento non trovato" });
    }
    
    // Helper function to refund payment and return error (like normal checkout)
    const refundAndReturnError = async (errorReason: string, errorCode: string) => {
      console.log(`[RESALE] Refunding payment due to: ${errorReason}`);
      
      try {
        const refund = await stripeClient.refunds.create({
          payment_intent: paymentIntentId!,
          reason: 'requested_by_customer',
          metadata: {
            reason: 'fiscal_seal_unavailable_at_confirm',
            error: errorReason,
            resaleId: id,
          }
        });
        
        console.log(`[RESALE] Refund created successfully: ${refund.id}, status: ${refund.status}`);
        
        // Update resale status back to listed (undo reservation)
        await db
          .update(siaeResales)
          .set({
            status: 'listed',
            buyerId: null,
            reservedAt: null,
            reservedUntil: null,
            stripePaymentIntentId: null,
            updatedAt: new Date(),
          })
          .where(eq(siaeResales.id, id));
        
        // Create audit log
        await siaeStorage.createAuditLog({
          companyId: ticketedEvent.companyId,
          userId: 'system',
          action: 'resale_blocked_no_smartcard',
          entityType: 'resale',
          entityId: id,
          description: `Rivendita bloccata: ${errorReason}. Rimborso effettuato.`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        
        return res.status(503).json({ 
          message: `Sistema sigilli fiscali non disponibile. Il pagamento è stato stornato automaticamente. ${errorReason}`,
          code: `${errorCode}_REFUNDED`,
          refunded: true,
          refundId: refund.id,
        });
        
      } catch (refundError: any) {
        console.error(`[RESALE] Failed to refund payment:`, refundError.message);
        
        // Mark resale as needing manual refund
        await db
          .update(siaeResales)
          .set({
            status: 'refund_pending',
            updatedAt: new Date(),
          })
          .where(eq(siaeResales.id, id));
        
        // Create audit log for failed refund
        await siaeStorage.createAuditLog({
          companyId: ticketedEvent.companyId,
          userId: 'system',
          action: 'resale_refund_failed',
          entityType: 'resale',
          entityId: id,
          description: `Rivendita bloccata: ${errorReason}. Rimborso FALLITO: ${refundError.message}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        
        return res.status(503).json({ 
          message: `Errore critico: sigillo fiscale non disponibile e storno fallito. Contatta l'assistenza per il rimborso.`,
          code: "SEAL_ERROR_REFUND_FAILED",
          refunded: false,
        });
      }
    };
    
    // 3. CRITICAL: Verify smart card is available (SIAE compliance - no temporary seals allowed)
    const now = new Date();
    const emissionDateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const emissionTimeStr = now.toTimeString().slice(0, 5).replace(':', '');
    let sealData: { sealCode: string; counter: number; serialNumber: string; sealNumber: string; mac: string } | null = null;
    let fiscalSealId: string | null = null;
    let fiscalSealCode: string | null = null;
    let fiscalSealCounter: number | null = null;
    let cardCode: string | null = null;
    
    const bridgeStatus = getCachedBridgeStatus();
    console.log(`[RESALE] Bridge status: connected=${bridgeStatus.bridgeConnected}, cardInserted=${bridgeStatus.cardInserted}, readerConnected=${bridgeStatus.readerConnected}`);
    
    // SIAE COMPLIANCE: Bridge MUST be truly ready (connected + card inserted + reader connected)
    // If not ready, we MUST refund the payment - no temporary seals allowed
    const bridgeTrulyReady = bridgeStatus.bridgeConnected === true && 
                              bridgeStatus.cardInserted === true && 
                              bridgeStatus.readerConnected === true;
    
    if (!bridgeTrulyReady) {
      const errorReason = !bridgeStatus.bridgeConnected 
        ? "Desktop bridge non connesso" 
        : !bridgeStatus.readerConnected 
          ? "Lettore smart card non connesso"
          : "Smart card SIAE non inserita";
      
      console.log(`[RESALE] Bridge not truly ready, blocking operation and refunding: ${errorReason}`);
      
      return await refundAndReturnError(errorReason, "SEAL_BRIDGE_OFFLINE");
    }
    
    // Bridge is ready, attempt to get real fiscal seal
    try {
      // Request real fiscal seal from smart card with outer timeout protection
      const priceInCents = Math.round(parseFloat(resale.resalePrice) * 100);
      console.log(`[RESALE] Bridge truly ready, attempting real fiscal seal for ${priceInCents} cents...`);
      
      // Use Promise.race with AGGRESSIVE external timeout
      const SEAL_OUTER_TIMEOUT = 4000; // 4 seconds - fail fast
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => {
          console.log(`[RESALE] OUTER TIMEOUT triggered after ${SEAL_OUTER_TIMEOUT}ms`);
          reject(new Error('OUTER_TIMEOUT: Timeout esterno sigillo fiscale'));
        }, SEAL_OUTER_TIMEOUT)
      );
      
      sealData = await Promise.race([
        requestFiscalSeal(priceInCents),
        timeoutPromise
      ]) as any;
      fiscalSealCode = sealData!.sealCode;
      fiscalSealCounter = sealData!.counter;
      cardCode = sealData!.serialNumber;
      console.log(`[RESALE] Got real fiscal seal: ${fiscalSealCode}`);
      
      // Find or create card in database
      let [bridgeCard] = await db
        .select()
        .from(siaeActivationCards)
        .where(eq(siaeActivationCards.cardCode, sealData!.serialNumber))
        .limit(1);
      
      if (!bridgeCard) {
        // FIX 2026-01-20: Usare resolveSystemCodeSafe per evitare errore SIAE 0600
        // Il default EVENT4U1 NON è registrato presso SIAE!
        const cachedEfff = getCachedEfffData();
        const systemCodeResult = resolveSystemCodeSafe(cachedEfff, { systemCode: process.env.SIAE_SYSTEM_CODE });
        if (!systemCodeResult.success || !systemCodeResult.systemCode) {
          throw new Error(`SIAE_SYSTEM_CODE_ERROR: ${systemCodeResult.error || 'Codice sistema SIAE non disponibile. Collegare la Smart Card o configurare il codice sistema.'}`);
        }
        const systemCode = systemCodeResult.systemCode;
        console.log(`[PUBLIC] Creating card for serialNumber: ${sealData!.serialNumber}, systemCode: ${systemCode} (source: ${systemCodeResult.source})`);
        [bridgeCard] = await db
          .insert(siaeActivationCards)
          .values({
            cardCode: sealData!.serialNumber,
            systemCode: systemCode,
            companyId: ticketedEvent.companyId,
            status: "active",
            activationDate: new Date(),
            progressiveCounter: sealData!.counter,
          })
          .returning();
      }
      
      // Create fiscal seal record for consistency with regular checkout
      const [fiscalSeal] = await db
        .insert(siaeFiscalSeals)
        .values({
          cardId: bridgeCard.id,
          sealCode: sealData!.sealCode,
          progressiveNumber: sealData!.counter,
          emissionDate: now.toISOString().slice(5, 10).replace("-", ""),
          emissionTime: emissionTimeStr,
          amount: resale.resalePrice.toString().padStart(8, "0"),
        })
        .returning();
      
      fiscalSealId = fiscalSeal.id;
      
    } catch (sealError: any) {
      // SIAE COMPLIANCE: If seal fails, refund payment - no temporary seals allowed
      console.error(`[RESALE] Failed to get fiscal seal, blocking operation and refunding:`, sealError);
      
      const errorReason = sealError.message?.includes('TIMEOUT') 
        ? "Timeout comunicazione smart card SIAE" 
        : `Errore sigillo fiscale: ${sealError.message || 'errore sconosciuto'}`;
      
      return await refundAndReturnError(errorReason, "SEAL_CARD_NOT_READY");
    }
    
    // CRITICAL FIX: Check if new ticket already exists (idempotency for retry scenarios)
    // This handles cases where the first confirm call created the ticket but failed before completing
    const [existingNewTicket] = await db
      .select()
      .from(siaeTickets)
      .where(and(
        eq(siaeTickets.originalTicketId, originalTicket.id),
        eq(siaeTickets.paymentMethod, 'resale')
      ));
    
    let newTicket: typeof siaeTickets.$inferSelect;
    
    if (existingNewTicket) {
      // Use existing ticket from a previous partial attempt
      console.log(`[RESALE] Found existing new ticket ${existingNewTicket.id} from previous attempt, reusing`);
      newTicket = existingNewTicket;
    } else {
      // 5. Create new ticket for buyer with all original ticket data
      const newTicketCode = `RT${now.getTime().toString(36).toUpperCase()}`;
      
      // Get next progressive number
      const [maxProg] = await db
        .select({ maxProg: sql<number>`COALESCE(MAX(${siaeTickets.progressiveNumber}), 0)` })
        .from(siaeTickets)
        .where(eq(siaeTickets.ticketedEventId, originalTicket.ticketedEventId));
      const newProgressiveNumber = (maxProg?.maxProg || 0) + 1;
      
      // Generate QR code with fiscal seal data
      const qrData = sealData ? JSON.stringify({
        seal: sealData.sealCode,
        sealNumber: sealData.sealNumber,
        serialNumber: sealData.serialNumber,
        counter: sealData.counter,
        mac: sealData.mac,
      }) : `SIAE-TKT-RESALE-${newProgressiveNumber}`;
      
      const [createdTicket] = await db
        .insert(siaeTickets)
        .values({
          ticketedEventId: originalTicket.ticketedEventId,
          transactionId: originalTicket.transactionId,
          sectorId: originalTicket.sectorId,
          ticketCode: newTicketCode,
          qrCode: qrData,
          ticketType: originalTicket.ticketType,
          ticketTypeCode: originalTicket.ticketTypeCode,
          sectorCode: originalTicket.sectorCode,
          ticketPrice: resale.resalePrice,
          seatNumber: originalTicket.seatNumber,
          row: originalTicket.row,
          seatId: originalTicket.seatId,
          fiscalSealId: fiscalSealId,
          fiscalSealCode: fiscalSealCode,
          fiscalSealCounter: fiscalSealCounter,
          cardCode: cardCode,
          progressiveNumber: newProgressiveNumber,
          grossAmount: resale.resalePrice,
          netAmount: originalTicket.netAmount,
          vatAmount: originalTicket.vatAmount,
          prevendita: originalTicket.prevendita,
          prevenditaVat: originalTicket.prevenditaVat,
          customerId: customer.id,
          participantFirstName: customer.firstName,
          participantLastName: customer.lastName,
          participantEmail: customer.email,
          participantPhone: customer.phone,
          participantFiscalCode: customer.fiscalCode,
          emissionDate: now,
          emissionDateStr: emissionDateStr,
          emissionTimeStr: emissionTimeStr,
          status: sealData ? 'active' : 'pending_fiscalization',
          originalTicketId: originalTicket.id,
          paymentMethod: 'resale',
          isComplimentary: originalTicket.isComplimentary,
        })
        .returning();
      
      newTicket = createdTicket;
      
      // Only update QR code with scannable format if seal is real
      // Keep provisional QR for pending fiscalization tickets
      if (sealData) {
        const scannableQrCode = `SIAE-TKT-${newTicket.id}`;
        await db
          .update(siaeTickets)
          .set({ qrCode: scannableQrCode })
          .where(eq(siaeTickets.id, newTicket.id));
      }
      
      console.log(`[RESALE] Created new ticket ${newTicket.id} with code ${newTicketCode}`);
    }
    
    // === CRITICAL: All DB operations MUST complete before sending response ===
    // Wrap in try-finally to ensure we always complete or properly fail
    
    const fulfillmentStartTime = Date.now();
    console.log(`[RESALE] Step 5: Annulling original ticket ${originalTicket.id}...`);
    
    // NOW annul the original ticket (only after new ticket is successfully created)
    await db
      .update(siaeTickets)
      .set({ 
        status: 'annullato_rivendita',
        cancellationReasonCode: 'RESALE',
        cancellationDate: now,
        replacedByTicketId: newTicket.id,
        updatedAt: now,
      })
      .where(eq(siaeTickets.id, originalTicket.id));
    
    console.log(`[RESALE] Step 5 DONE: Original ticket annulled in ${Date.now() - fulfillmentStartTime}ms`);
    
    // 6. Update resale with new ticket and sigillo (final successful state)
    console.log(`[RESALE] Step 6: Updating resale to fulfilled...`);
    await db
      .update(siaeResales)
      .set({
        status: 'fulfilled',
        paidAt: new Date(),
        soldAt: new Date(),
        acquirenteVerificato: true,
        acquirenteVerificaData: new Date(),
        newTicketId: newTicket.id,
        sigilloFiscaleRivendita: fiscalSealCode,
        originalTicketAnnulledAt: new Date(),
        fulfilledAt: new Date(),
        updatedAt: new Date(),
        confirmToken: null, // CRITICAL: Invalidate token after successful use
      })
      .where(eq(siaeResales.id, id));
    
    console.log(`[RESALE] Step 6 DONE: Resale marked fulfilled in ${Date.now() - fulfillmentStartTime}ms`);
    
    // 7. Credit seller wallet (use stored payout, or recompute if missing)
    console.log(`[RESALE] Step 7: Crediting seller wallet...`);
    let sellerPayout = parseFloat(resale.sellerPayout || '0');
    if (sellerPayout <= 0) {
      // Fallback: recompute from resale price with 5% platform fee
      const resalePrice = parseFloat(resale.resalePrice);
      const platformFee = Math.round(resalePrice * 5) / 100;
      sellerPayout = resalePrice - platformFee;
      console.log(`[RESALE] Recomputed payout: €${sellerPayout} (stored was null/zero)`);
    }
    
    let walletTxId: string | null = null;
    if (sellerPayout > 0) {
      const [walletTx] = await db
        .insert(siaeWalletTransactions)
        .values({
          customerId: resale.sellerId,
          type: 'resale_credit',
          amount: sellerPayout.toFixed(2),
          description: `Accredito rivendita biglietto ${originalTicket.ticketCode}`,
          resaleId: id,
          stripePaymentIntentId: paymentIntentId || null,
          status: 'completed',
        })
        .returning();
      
      walletTxId = walletTx.id;
      
      // Update resale with payout transaction
      await db
        .update(siaeResales)
        .set({ payoutTransactionId: walletTx.id })
        .where(eq(siaeResales.id, id));
      
      console.log(`[RESALE] Step 7 DONE: Credited seller ${resale.sellerId} with €${sellerPayout} in ${Date.now() - fulfillmentStartTime}ms`);
    } else {
      console.log(`[RESALE] Step 7 SKIPPED: No payout (sellerPayout=${sellerPayout})`);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[RESALE] === FULFILLMENT COMPLETE === ${id}: old ticket ${originalTicket.id} → new ticket ${newTicket.id} (total: ${totalTime}ms)`);
    
    // Send response AFTER all DB operations are complete
    // Use res.status().send() instead of res.json() to avoid stream issues
    const responsePayload = {
      success: true,
      message: "Acquisto completato!",
      newTicketId: newTicket.id,
      newTicketCode: newTicket.ticketCode,
      totalTimeMs: totalTime,
    };
    
    res.status(200).send(JSON.stringify(responsePayload));
    console.log(`[RESALE] Response sent for ${id}`);
  } catch (error: any) {
    console.error("[PUBLIC] Confirm resale error:", error);
    
    // COMPENSATION: Handle partial failures gracefully
    const resaleId = req.params.id;
    if (resaleId) {
      try {
        const [currentResale] = await db
          .select()
          .from(siaeResales)
          .where(eq(siaeResales.id, resaleId));
        
        if (currentResale && currentResale.status === 'processing') {
          // Check if new ticket was already created (partial success case)
          const [existingNewTicket] = await db
            .select()
            .from(siaeTickets)
            .where(and(
              eq(siaeTickets.originalTicketId, currentResale.originalTicketId),
              eq(siaeTickets.paymentMethod, 'resale')
            ));
          
          if (existingNewTicket) {
            // Partial success: new ticket exists, complete the fulfillment
            console.log(`[RESALE] Partial success detected: new ticket ${existingNewTicket.id} exists, completing fulfillment...`);
            
            // Get original ticket for wallet credit
            const [originalTicket] = await db
              .select()
              .from(siaeTickets)
              .where(eq(siaeTickets.id, currentResale.originalTicketId));
            
            // Annul original ticket if not already done
            await db
              .update(siaeTickets)
              .set({ 
                status: 'annullato_rivendita',
                cancellationReasonCode: 'RESALE',
                cancellationDate: new Date(),
                replacedByTicketId: existingNewTicket.id,
                updatedAt: new Date(),
              })
              .where(and(
                eq(siaeTickets.id, currentResale.originalTicketId),
                not(eq(siaeTickets.status, 'annullato_rivendita'))
              ));
            
            // Mark resale as fulfilled
            await db
              .update(siaeResales)
              .set({
                status: 'fulfilled',
                newTicketId: existingNewTicket.id,
                fulfilledAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(siaeResales.id, resaleId));
            
            // Credit seller wallet if not already done
            const existingWalletTx = await db
              .select()
              .from(siaeWalletTransactions)
              .where(eq(siaeWalletTransactions.resaleId, resaleId));
            
            if (existingWalletTx.length === 0 && currentResale.sellerId) {
              let sellerPayout = parseFloat(currentResale.sellerPayout || '0');
              if (sellerPayout <= 0) {
                const resalePrice = parseFloat(currentResale.resalePrice);
                const platformFee = Math.round(resalePrice * 5) / 100;
                sellerPayout = resalePrice - platformFee;
              }
              if (sellerPayout > 0) {
                await db
                  .insert(siaeWalletTransactions)
                  .values({
                    customerId: currentResale.sellerId,
                    type: 'resale_credit',
                    amount: sellerPayout.toFixed(2),
                    description: `Accredito rivendita biglietto ${originalTicket?.ticketCode || 'N/A'}`,
                    resaleId: resaleId,
                    status: 'completed',
                  });
                console.log(`[RESALE] Compensation: Credited seller ${currentResale.sellerId} with €${sellerPayout}`);
              }
            }
            
            console.log(`[RESALE] Completed partial fulfillment for ${resaleId}`);
            
            // CRITICAL: Return success since compensation worked!
            return res.status(200).send(JSON.stringify({
              success: true,
              message: "Acquisto completato!",
              newTicketId: existingNewTicket.id,
              recovered: true,
            }));
          } else {
            // No new ticket created, safe to reset to reserved for retry
            await db
              .update(siaeResales)
              .set({
                status: 'reserved',
                updatedAt: new Date(),
              })
              .where(eq(siaeResales.id, resaleId));
            console.log(`[RESALE] Compensated: reset ${resaleId} from 'processing' to 'reserved'`);
          }
        }
      } catch (compensationError) {
        console.error("[RESALE] Compensation failed:", compensationError);
      }
    }
    
    res.status(500).json({ message: "Errore nella conferma acquisto. Riprova." });
  }
});

// Recovery endpoint for stuck "processing" resales
router.post("/api/public/resales/:id/recover", async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.body;
    
    console.log(`[RESALE-RECOVERY] Starting recovery for resale ${id}`);
    
    // Get current resale state
    const [resale] = await db
      .select()
      .from(siaeResales)
      .where(eq(siaeResales.id, id));
    
    if (!resale) {
      return res.status(404).json({ message: "Rivendita non trovata" });
    }
    
    // Validate token if provided (for security)
    if (token && resale.confirmToken && token !== resale.confirmToken) {
      return res.status(403).json({ message: "Token non valido" });
    }
    
    // Only recover if stuck in processing
    if (resale.status !== 'processing') {
      return res.json({ 
        success: true, 
        message: `Rivendita già in stato: ${resale.status}`,
        status: resale.status,
        alreadyCompleted: resale.status === 'fulfilled'
      });
    }
    
    // Check if new ticket was already created
    const [existingNewTicket] = await db
      .select()
      .from(siaeTickets)
      .where(and(
        eq(siaeTickets.originalTicketId, resale.originalTicketId),
        eq(siaeTickets.paymentMethod, 'resale')
      ));
    
    if (existingNewTicket) {
      console.log(`[RESALE-RECOVERY] Found existing new ticket ${existingNewTicket.id}, completing fulfillment...`);
      
      // Get original ticket for info
      const [originalTicket] = await db
        .select()
        .from(siaeTickets)
        .where(eq(siaeTickets.id, resale.originalTicketId));
      
      // Annul original ticket if not already done
      if (originalTicket && originalTicket.status !== 'annullato_rivendita') {
        await db
          .update(siaeTickets)
          .set({ 
            status: 'annullato_rivendita',
            cancellationReasonCode: 'RESALE',
            cancellationDate: new Date(),
            replacedByTicketId: existingNewTicket.id,
            updatedAt: new Date(),
          })
          .where(eq(siaeTickets.id, resale.originalTicketId));
        console.log(`[RESALE-RECOVERY] Annulled original ticket ${resale.originalTicketId}`);
      }
      
      // Mark resale as fulfilled
      await db
        .update(siaeResales)
        .set({
          status: 'fulfilled',
          newTicketId: existingNewTicket.id,
          fulfilledAt: new Date(),
          paidAt: resale.paidAt || new Date(),
          soldAt: resale.soldAt || new Date(),
          originalTicketAnnulledAt: new Date(),
          updatedAt: new Date(),
          confirmToken: null,
        })
        .where(eq(siaeResales.id, id));
      
      // Credit seller wallet if not already done
      const existingWalletTx = await db
        .select()
        .from(siaeWalletTransactions)
        .where(eq(siaeWalletTransactions.resaleId, id))
        .limit(1);
      
      if (existingWalletTx.length === 0) {
        let sellerPayout = parseFloat(resale.sellerPayout || '0');
        if (sellerPayout <= 0) {
          const resalePrice = parseFloat(resale.resalePrice);
          const platformFee = Math.round(resalePrice * 5) / 100;
          sellerPayout = resalePrice - platformFee;
        }
        
        if (sellerPayout > 0) {
          const [walletTx] = await db
            .insert(siaeWalletTransactions)
            .values({
              customerId: resale.sellerId,
              type: 'resale_credit',
              amount: sellerPayout.toFixed(2),
              description: `Accredito rivendita biglietto ${originalTicket?.ticketCode || 'N/A'} (recovery)`,
              resaleId: id,
              stripePaymentIntentId: resale.stripePaymentIntentId || null,
              status: 'completed',
            })
            .returning();
          
          await db
            .update(siaeResales)
            .set({ payoutTransactionId: walletTx.id })
            .where(eq(siaeResales.id, id));
          
          console.log(`[RESALE-RECOVERY] Credited seller ${resale.sellerId} with €${sellerPayout}`);
        }
      } else {
        console.log(`[RESALE-RECOVERY] Wallet transaction already exists, skipping credit`);
      }
      
      console.log(`[RESALE-RECOVERY] Completed recovery for ${id}`);
      
      return res.json({
        success: true,
        message: "Rivendita completata con successo!",
        newTicketId: existingNewTicket.id,
        recovered: true,
      });
    } else {
      // No new ticket exists - this is a real failure
      console.log(`[RESALE-RECOVERY] No new ticket found for ${id}, cannot recover`);
      return res.status(400).json({
        success: false,
        message: "Impossibile recuperare: biglietto nuovo non trovato. Contatta l'assistenza.",
      });
    }
  } catch (error: any) {
    console.error("[RESALE-RECOVERY] Error:", error);
    res.status(500).json({ message: "Errore nel recupero" });
  }
});

// Release expired reservations (cleanup job)
router.post("/api/public/resales/cleanup-expired", async (req, res) => {
  try {
    const result = await db
      .update(siaeResales)
      .set({
        status: 'listed',
        buyerId: null,
        reservedAt: null,
        reservedUntil: null,
        stripeCheckoutSessionId: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(siaeResales.status, 'reserved'),
        lt(siaeResales.reservedUntil, new Date())
      ))
      .returning();
    
    console.log(`[RESALE] Released ${result.length} expired reservations`);
    res.json({ released: result.length });
  } catch (error: any) {
    console.error("[PUBLIC] Cleanup expired resales error:", error);
    res.status(500).json({ message: "Errore nel cleanup" });
  }
});

// ==================== PUBLIC TICKET VERIFICATION ====================

// Verify ticket by QR code - public endpoint (no auth required)
router.get("/api/public/tickets/verify/:code", async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({ 
        valid: false, 
        status: "invalid",
        message: "Codice biglietto mancante" 
      });
    }

    // Look up ticket by qr_code
    const [ticket] = await db
      .select({
        id: siaeTickets.id,
        ticketCode: siaeTickets.ticketCode,
        qrCode: siaeTickets.qrCode,
        status: siaeTickets.status,
        ticketType: siaeTickets.ticketType,
        ticketTypeCode: siaeTickets.ticketTypeCode,
        ticketPrice: siaeTickets.ticketPrice,
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        emissionDate: siaeTickets.emissionDate,
        usedAt: siaeTickets.usedAt,
        sectorName: siaeEventSectors.name,
        eventId: events.id,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        locationName: locations.name,
        locationAddress: locations.address,
        locationCity: locations.city,
      })
      .from(siaeTickets)
      .innerJoin(siaeEventSectors, eq(siaeTickets.sectorId, siaeEventSectors.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(eq(siaeTickets.qrCode, code));

    if (!ticket) {
      return res.status(404).json({ 
        valid: false, 
        status: "not_found",
        message: "Biglietto non trovato" 
      });
    }

    // Determine status
    let valid = false;
    let statusMessage = "";
    let ticketStatus = ticket.status;

    switch (ticket.status) {
      case "emitted":
      case "valid":
      case "active":
        valid = true;
        statusMessage = "Biglietto valido";
        ticketStatus = "valid";
        break;
      case "validated":
      case "used":
        valid = false;
        statusMessage = "Biglietto già utilizzato";
        ticketStatus = "used";
        break;
      case "cancelled":
        valid = false;
        statusMessage = "Biglietto annullato";
        ticketStatus = "cancelled";
        break;
      default:
        valid = false;
        statusMessage = "Stato biglietto non riconosciuto";
        ticketStatus = "invalid";
    }

    res.json({
      valid,
      status: ticketStatus,
      message: statusMessage,
      ticket: {
        ticketCode: ticket.ticketCode,
        ticketType: ticket.ticketType || ticket.ticketTypeCode,
        participantName: [ticket.participantFirstName, ticket.participantLastName]
          .filter(Boolean)
          .join(" ") || null,
        sector: ticket.sectorName,
        price: ticket.ticketPrice,
        emissionDate: ticket.emissionDate,
        usedAt: ticket.usedAt,
      },
      event: {
        id: ticket.eventId,
        name: ticket.eventName,
        startDate: ticket.eventStart,
        endDate: ticket.eventEnd,
        location: {
          name: ticket.locationName,
          address: ticket.locationAddress,
          city: ticket.locationCity,
        },
      },
    });
  } catch (error: any) {
    console.error("[PUBLIC] Ticket verification error:", error);
    res.status(500).json({ 
      valid: false, 
      status: "error",
      message: "Errore nella verifica del biglietto" 
    });
  }
});

// Ottieni richieste cambio nominativo del cliente
router.get("/api/public/account/name-changes", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const nameChanges = await db
      .select({
        id: siaeNameChanges.id,
        originalTicketId: siaeNameChanges.originalTicketId,
        newFirstName: siaeNameChanges.newFirstName,
        newLastName: siaeNameChanges.newLastName,
        fee: siaeNameChanges.fee,
        status: siaeNameChanges.status,
        createdAt: siaeNameChanges.createdAt,
        ticketCode: siaeTickets.ticketCode,
        eventName: events.name,
        eventStart: events.startDatetime,
      })
      .from(siaeNameChanges)
      .innerJoin(siaeTickets, eq(siaeNameChanges.originalTicketId, siaeTickets.id))
      .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .where(and(
        eq(siaeNameChanges.requestedById, customer.id),
        eq(siaeNameChanges.requestedByType, 'customer')
      ))
      .orderBy(desc(siaeNameChanges.createdAt));

    res.json({ nameChanges });
  } catch (error: any) {
    console.error("[PUBLIC] Get name changes error:", error);
    res.status(500).json({ message: "Errore nel caricamento richieste" });
  }
});

// ==================== PUBLIC RESERVATION ROUTES ====================
// Sistema di Prenotazione Liste/Tavoli (NON biglietteria SIAE)

function generateReservationQrToken(eventId: string): string {
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `RES-${eventId.slice(0, 6).toUpperCase()}-${random}`;
}

async function generateReservationQrCodeDataUrl(token: string): Promise<string> {
  try {
    return await QRCode.toDataURL(token, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch {
    return '';
  }
}

// GET /api/public/events/:eventId/subscriptions - Get available subscription types
router.get("/api/public/events/:eventId/subscriptions", async (req, res) => {
  try {
    const { eventId } = req.params;

    // First find the ticketed event for this event ID
    const [ticketedEvent] = await db
      .select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.eventId, eventId));

    if (!ticketedEvent) {
      return res.json([]);
    }

    const now = new Date();

    // Get active subscription types for this ticketed event
    const subscriptionTypes = await db
      .select({
        id: siaeSubscriptionTypes.id,
        name: siaeSubscriptionTypes.name,
        description: siaeSubscriptionTypes.description,
        price: siaeSubscriptionTypes.price,
        eventsCount: siaeSubscriptionTypes.eventsCount,
        turnType: siaeSubscriptionTypes.turnType,
        maxQuantity: siaeSubscriptionTypes.maxQuantity,
        soldCount: siaeSubscriptionTypes.soldCount,
        validFrom: siaeSubscriptionTypes.validFrom,
        validTo: siaeSubscriptionTypes.validTo,
      })
      .from(siaeSubscriptionTypes)
      .where(
        and(
          eq(siaeSubscriptionTypes.ticketedEventId, ticketedEvent.id),
          eq(siaeSubscriptionTypes.active, true),
          or(
            isNull(siaeSubscriptionTypes.validFrom),
            lte(siaeSubscriptionTypes.validFrom, now)
          ),
          or(
            isNull(siaeSubscriptionTypes.validTo),
            gte(siaeSubscriptionTypes.validTo, now)
          )
        )
      );

    // Calculate available quantity for each subscription type
    const result = subscriptionTypes.map(st => ({
      ...st,
      availableQuantity: st.maxQuantity ? st.maxQuantity - (st.soldCount || 0) : null,
      isAvailable: !st.maxQuantity || (st.soldCount || 0) < st.maxQuantity,
    })).filter(st => st.isAvailable);

    res.json(result);
  } catch (error: any) {
    console.error("[PUBLIC] Get subscriptions error:", error);
    res.status(500).json({ message: "Errore nel caricamento abbonamenti" });
  }
});

// GET /api/public/events/:eventId/reservation-settings - Get public reservation settings
router.get("/api/public/events/:eventId/reservation-settings", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const [settings] = await db.select()
      .from(eventReservationSettings)
      .where(eq(eventReservationSettings.eventId, eventId));
    
    if (!settings) {
      return res.json({
        eventId,
        listsEnabled: false,
        tablesEnabled: false,
        paidReservationsEnabled: false,
        listReservationFee: '0',
        listReservationFeeDescription: '',
        accessDisclaimer: "L'accesso è subordinato al rispetto delle condizioni del locale e alla verifica in fase di accreditamento.",
      });
    }
    
    res.json({
      eventId: settings.eventId,
      listsEnabled: settings.listsEnabled,
      tablesEnabled: settings.tablesEnabled,
      paidReservationsEnabled: settings.paidReservationsEnabled,
      listReservationFee: settings.listReservationFee,
      listReservationFeeDescription: settings.listReservationFeeDescription,
      accessDisclaimer: settings.accessDisclaimer || "L'accesso è subordinato al rispetto delle condizioni del locale e alla verifica in fase di accreditamento.",
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get reservation settings error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/public/events/:eventId/lists - Get available lists for public booking
router.get("/api/public/events/:eventId/lists", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const lists = await db.select({
      id: eventLists.id,
      name: eventLists.name,
      price: eventLists.price,
      maxCapacity: eventLists.maxCapacity,
      isActive: eventLists.isActive,
    })
      .from(eventLists)
      .where(and(
        eq(eventLists.eventId, eventId),
        eq(eventLists.isActive, true)
      ));
    
    const listsWithCounts = await Promise.all(lists.map(async (list) => {
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(listEntries)
        .where(eq(listEntries.listId, list.id));
      
      return {
        ...list,
        entriesCount: countResult?.count || 0,
      };
    }));
    
    res.json(listsWithCounts);
  } catch (error: any) {
    console.error("[PUBLIC] Get lists error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/public/events/:eventId/table-types - Get available table types for public booking
router.get("/api/public/events/:eventId/table-types", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const tables = await db.select({
      id: tableTypes.id,
      name: tableTypes.name,
      price: tableTypes.price,
      maxGuests: tableTypes.maxGuests,
      totalQuantity: tableTypes.totalQuantity,
      description: tableTypes.description,
      isActive: tableTypes.isActive,
    })
      .from(tableTypes)
      .where(and(
        eq(tableTypes.eventId, eventId),
        eq(tableTypes.isActive, true)
      ));
    
    const tablesWithCounts = await Promise.all(tables.map(async (table) => {
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(tableReservations)
        .where(and(
          eq(tableReservations.tableTypeId, table.id),
          or(
            eq(tableReservations.status, 'approved'),
            eq(tableReservations.status, 'pending')
          )
        ));
      
      return {
        ...table,
        reservedCount: countResult?.count || 0,
      };
    }));
    
    res.json(tablesWithCounts);
  } catch (error: any) {
    console.error("[PUBLIC] Get table types error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/public/reservations - Create a public reservation (no auth required)
router.post("/api/public/reservations", async (req, res) => {
  try {
    const {
      eventId,
      reservationType,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerEmail,
      prCode,
      listId,
      tableTypeId,
      guestCount,
      amount,
    } = req.body;
    
    if (!eventId || !reservationType || !customerFirstName || !customerLastName || !customerPhone) {
      return res.status(400).json({ message: "Dati mancanti" });
    }
    
    const [event] = await db.select({ id: events.id, companyId: events.companyId })
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }
    
    const qrToken = generateReservationQrToken(eventId);
    const qrCodeUrl = await generateReservationQrCodeDataUrl(qrToken);
    
    let prProfileId: string | null = null;
    let prCommissionAmount = '0';
    
    if (prCode) {
      const [prProfile] = await db.select()
        .from(prProfiles)
        .where(and(
          eq(prProfiles.prCode, prCode),
          eq(prProfiles.isActive, true)
        ));
      
      if (prProfile) {
        prProfileId = prProfile.id;
        const amountNum = parseFloat(amount || '0');
        const personCount = parseInt(guestCount || '1', 10) || 1;
        let commission = 0;
        const commissionPct = parseFloat(prProfile.commissionPercentage || '0');
        const commissionFixed = parseFloat(prProfile.commissionFixedPerPerson || '0');
        if (commissionPct > 0) {
          commission += (amountNum * commissionPct) / 100;
        }
        if (commissionFixed > 0) {
          commission += commissionFixed * personCount;
        }
        prCommissionAmount = commission.toFixed(2);
      }
    }
    
    const [reservation] = await db.insert(reservationPayments).values({
      eventId,
      companyId: event.companyId,
      reservationType,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerEmail: customerEmail || null,
      prCode: prCode || null,
      prProfileId,
      prCommissionAmount,
      listId: listId || null,
      tableTypeId: tableTypeId || null,
      guestCount: guestCount || null,
      amount: amount || '0',
      currency: 'EUR',
      paymentStatus: 'pending',
      qrToken,
      qrCodeUrl,
    }).returning();
    
    res.status(201).json({
      id: reservation.id,
      qrToken: reservation.qrToken,
      qrCodeUrl: reservation.qrCodeUrl,
      customerFirstName: reservation.customerFirstName,
      customerLastName: reservation.customerLastName,
      reservationType: reservation.reservationType,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Create reservation error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== SEAT SELECTION API ====================

// GET /api/public/events/:eventId/seats - Get all seats with their status
router.get("/api/public/events/:eventId/seats", async (req, res) => {
  try {
    const { eventId } = req.params;
    const sessionId = getOrCreateSessionId(req, res);
    const now = new Date();

    const [ticketedEvent] = await db
      .select({
        id: siaeTicketedEvents.id,
        eventId: siaeTicketedEvents.eventId,
        ticketingStatus: siaeTicketedEvents.ticketingStatus,
      })
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, eventId));

    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    const [event] = await db
      .select({
        locationId: events.locationId,
      })
      .from(events)
      .where(eq(events.id, ticketedEvent.eventId));

    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    const [floorPlan] = await db
      .select()
      .from(venueFloorPlans)
      .where(
        and(
          eq(venueFloorPlans.locationId, event.locationId),
          eq(venueFloorPlans.isDefault, true),
          eq(venueFloorPlans.isActive, true)
        )
      );

    if (!floorPlan) {
      return res.json({
        floorPlan: null,
        zones: [],
        sectors: [],
        message: "Nessuna planimetria configurata per questo evento"
      });
    }

    const zones = await db
      .select()
      .from(floorPlanZones)
      .where(
        and(
          eq(floorPlanZones.floorPlanId, floorPlan.id),
          eq(floorPlanZones.isActive, true)
        )
      );

    const zoneMappings = await db
      .select()
      .from(eventZoneMappings)
      .where(
        and(
          eq(eventZoneMappings.ticketedEventId, eventId),
          eq(eventZoneMappings.isActive, true)
        )
      );

    const mappingsByZone = new Map(zoneMappings.map(m => [m.zoneId, m]));

    const sectors = await db
      .select()
      .from(siaeEventSectors)
      .where(eq(siaeEventSectors.ticketedEventId, eventId));

    const sectorsById = new Map(sectors.map(s => [s.id, s]));

    const zonesWithSeats = await Promise.all(zones.map(async (zone) => {
      const seats = await db
        .select()
        .from(floorPlanSeats)
        .where(
          and(
            eq(floorPlanSeats.zoneId, zone.id),
            eq(floorPlanSeats.isActive, true)
          )
        );

      const seatStatuses = await db
        .select()
        .from(eventSeatStatus)
        .where(
          and(
            eq(eventSeatStatus.ticketedEventId, eventId),
            eq(eventSeatStatus.zoneId, zone.id)
          )
        );

      const statusBySeat = new Map(seatStatuses.map(s => [s.seatId, s]));

      const activeHolds = await db
        .select()
        .from(seatHolds)
        .where(
          and(
            eq(seatHolds.ticketedEventId, eventId),
            eq(seatHolds.zoneId, zone.id),
            eq(seatHolds.status, 'active'),
            gt(seatHolds.expiresAt, now)
          )
        );

      const holdsBySeat = new Map(activeHolds.map(h => [h.seatId, h]));

      const mapping = mappingsByZone.get(zone.id);
      const sector = mapping ? sectorsById.get(mapping.sectorId) : null;

      const seatsWithStatus = seats.map(seat => {
        const seatStatus = statusBySeat.get(seat.id);
        const hold = holdsBySeat.get(seat.id);

        let status: 'available' | 'held' | 'sold' | 'blocked' = 'available';
        let isMyHold = false;

        if (seat.isBlocked) {
          status = 'blocked';
        } else if (seatStatus) {
          if (seatStatus.status === 'sold') {
            status = 'sold';
          } else if (seatStatus.status === 'held' && hold) {
            status = 'held';
            isMyHold = hold.sessionId === sessionId;
          } else if (seatStatus.status === 'blocked') {
            status = 'blocked';
          }
        } else if (hold) {
          status = 'held';
          isMyHold = hold.sessionId === sessionId;
        }

        return {
          id: seat.id,
          seatLabel: seat.seatLabel,
          row: seat.row,
          seatNumber: seat.seatNumber,
          posX: seat.posX,
          posY: seat.posY,
          status,
          isMyHold,
          isAccessible: seat.isAccessible,
          holdExpiresAt: isMyHold && hold ? hold.expiresAt : null,
        };
      });

      return {
        id: zone.id,
        name: zone.name,
        zoneType: zone.zoneType,
        coordinates: zone.coordinates,
        fillColor: zone.fillColor,
        strokeColor: zone.strokeColor,
        opacity: zone.opacity,
        capacity: zone.capacity,
        sectorId: mapping?.sectorId || null,
        sectorName: sector?.name || null,
        price: mapping?.priceOverride || sector?.priceIntero || null,
        seats: seatsWithStatus,
      };
    }));

    const sectorsResponse = sectors.map(s => ({
      id: s.id,
      name: s.name,
      sectorCode: s.sectorCode,
      priceIntero: s.priceIntero,
      priceRidotto: s.priceRidotto,
    }));

    res.json({
      floorPlan: {
        id: floorPlan.id,
        name: floorPlan.name,
        imageUrl: floorPlan.imageUrl,
        width: floorPlan.imageWidth,
        height: floorPlan.imageHeight,
      },
      zones: zonesWithSeats,
      sectors: sectorsResponse,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get seats error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/public/events/:eventId/seats/:seatId/hold - Create a temporary hold on a seat
router.post("/api/public/events/:eventId/seats/:seatId/hold", async (req, res) => {
  try {
    const { eventId, seatId } = req.params;
    const sessionId = getOrCreateSessionId(req, res);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const [seat] = await db
      .select()
      .from(floorPlanSeats)
      .where(eq(floorPlanSeats.id, seatId));

    if (!seat) {
      return res.status(404).json({ message: "Posto non trovato" });
    }

    if (seat.isBlocked) {
      return res.status(400).json({ message: "Posto non disponibile" });
    }

    const [existingStatus] = await db
      .select()
      .from(eventSeatStatus)
      .where(
        and(
          eq(eventSeatStatus.ticketedEventId, eventId),
          eq(eventSeatStatus.seatId, seatId)
        )
      );

    if (existingStatus && existingStatus.status === 'sold') {
      return res.status(400).json({ message: "Posto già venduto" });
    }

    const [existingHold] = await db
      .select()
      .from(seatHolds)
      .where(
        and(
          eq(seatHolds.ticketedEventId, eventId),
          eq(seatHolds.seatId, seatId),
          eq(seatHolds.status, 'active'),
          gt(seatHolds.expiresAt, now)
        )
      );

    if (existingHold) {
      if (existingHold.sessionId === sessionId) {
        return res.json({
          holdId: existingHold.id,
          expiresAt: existingHold.expiresAt,
          message: "Hai già una prenotazione su questo posto"
        });
      }
      return res.status(400).json({ message: "Posto già prenotato da un altro utente" });
    }

    const [ticketedEvent] = await db
      .select({ id: siaeTicketedEvents.id })
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, eventId));

    if (!ticketedEvent) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    const [mapping] = await db
      .select()
      .from(eventZoneMappings)
      .where(
        and(
          eq(eventZoneMappings.ticketedEventId, eventId),
          eq(eventZoneMappings.zoneId, seat.zoneId)
        )
      );

    let priceSnapshot = null;
    if (mapping) {
      if (mapping.priceOverride) {
        priceSnapshot = mapping.priceOverride;
      } else {
        const [sector] = await db
          .select({ priceIntero: siaeEventSectors.priceIntero })
          .from(siaeEventSectors)
          .where(eq(siaeEventSectors.id, mapping.sectorId));
        priceSnapshot = sector?.priceIntero || null;
      }
    }

    const [newHold] = await db.insert(seatHolds).values({
      ticketedEventId: eventId,
      sectorId: mapping?.sectorId || null,
      seatId: seatId,
      zoneId: seat.zoneId,
      sessionId: sessionId,
      holdType: 'cart',
      quantity: 1,
      priceSnapshot: priceSnapshot,
      expiresAt: expiresAt,
      status: 'active',
    }).returning();

    if (existingStatus) {
      await db.update(eventSeatStatus)
        .set({
          status: 'held',
          currentHoldId: newHold.id,
          holdExpiresAt: expiresAt,
          updatedAt: now,
        })
        .where(eq(eventSeatStatus.id, existingStatus.id));
    } else {
      await db.insert(eventSeatStatus).values({
        ticketedEventId: eventId,
        seatId: seatId,
        zoneId: seat.zoneId,
        sectorId: mapping?.sectorId || null,
        status: 'held',
        currentHoldId: newHold.id,
        holdExpiresAt: expiresAt,
      });
    }

    res.status(201).json({
      holdId: newHold.id,
      expiresAt: expiresAt,
      seatLabel: seat.seatLabel,
      price: priceSnapshot,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Create hold error:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/public/events/:eventId/seats/:seatId/hold - Release a hold
router.delete("/api/public/events/:eventId/seats/:seatId/hold", async (req, res) => {
  try {
    const { eventId, seatId } = req.params;
    const sessionId = getOrCreateSessionId(req, res);
    const now = new Date();

    const [existingHold] = await db
      .select()
      .from(seatHolds)
      .where(
        and(
          eq(seatHolds.ticketedEventId, eventId),
          eq(seatHolds.seatId, seatId),
          eq(seatHolds.status, 'active'),
          gt(seatHolds.expiresAt, now)
        )
      );

    if (!existingHold) {
      return res.status(404).json({ message: "Hold non trovato" });
    }

    if (existingHold.sessionId !== sessionId) {
      return res.status(403).json({ message: "Non hai i permessi per rilasciare questo hold" });
    }

    await db.update(seatHolds)
      .set({
        status: 'released',
        updatedAt: now,
      })
      .where(eq(seatHolds.id, existingHold.id));

    await db.update(eventSeatStatus)
      .set({
        status: 'available',
        currentHoldId: null,
        holdExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(eventSeatStatus.ticketedEventId, eventId),
          eq(eventSeatStatus.seatId, seatId)
        )
      );

    res.json({ success: true, message: "Hold rilasciato con successo" });
  } catch (error: any) {
    console.error("[PUBLIC] Release hold error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/public/events/:eventId/holds/extend - Extend all holds for current session
router.post("/api/public/events/:eventId/holds/extend", async (req, res) => {
  try {
    const { eventId } = req.params;
    const sessionId = getOrCreateSessionId(req, res);
    const now = new Date();
    const extensionMinutes = 5;
    const maxExtensions = 2;

    const activeHolds = await db
      .select()
      .from(seatHolds)
      .where(
        and(
          eq(seatHolds.ticketedEventId, eventId),
          eq(seatHolds.sessionId, sessionId),
          eq(seatHolds.status, 'active'),
          gt(seatHolds.expiresAt, now)
        )
      );

    if (activeHolds.length === 0) {
      return res.status(404).json({ message: "Nessun hold attivo da estendere" });
    }

    const holdsToExtend = activeHolds.filter(h => h.extendedCount < maxExtensions);
    
    if (holdsToExtend.length === 0) {
      return res.status(400).json({ 
        message: "Hai già raggiunto il numero massimo di estensioni",
        maxExtensions 
      });
    }

    const extendedHolds: { holdId: string; newExpiresAt: Date }[] = [];

    for (const hold of holdsToExtend) {
      const newExpiresAt = new Date(hold.expiresAt.getTime() + extensionMinutes * 60 * 1000);

      await db.update(seatHolds)
        .set({
          expiresAt: newExpiresAt,
          extendedCount: hold.extendedCount + 1,
          updatedAt: now,
        })
        .where(eq(seatHolds.id, hold.id));

      await db.update(eventSeatStatus)
        .set({
          holdExpiresAt: newExpiresAt,
          updatedAt: now,
        })
        .where(eq(eventSeatStatus.currentHoldId, hold.id));

      extendedHolds.push({
        holdId: hold.id,
        newExpiresAt,
      });
    }

    const skippedCount = activeHolds.length - holdsToExtend.length;

    res.json({
      success: true,
      extendedCount: extendedHolds.length,
      skippedCount,
      holds: extendedHolds,
      extensionMinutes,
      message: `${extendedHolds.length} hold estesi di ${extensionMinutes} minuti`,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Extend holds error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/public/events/:eventId/my-holds - Get current session's holds
router.get("/api/public/events/:eventId/my-holds", async (req, res) => {
  try {
    const { eventId } = req.params;
    const sessionId = getOrCreateSessionId(req, res);
    const now = new Date();

    const myHolds = await db
      .select({
        holdId: seatHolds.id,
        seatId: seatHolds.seatId,
        zoneId: seatHolds.zoneId,
        sectorId: seatHolds.sectorId,
        expiresAt: seatHolds.expiresAt,
        extendedCount: seatHolds.extendedCount,
        priceSnapshot: seatHolds.priceSnapshot,
        createdAt: seatHolds.createdAt,
      })
      .from(seatHolds)
      .where(
        and(
          eq(seatHolds.ticketedEventId, eventId),
          eq(seatHolds.sessionId, sessionId),
          eq(seatHolds.status, 'active'),
          gt(seatHolds.expiresAt, now)
        )
      );

    const holdsWithDetails = await Promise.all(myHolds.map(async (hold) => {
      let seatLabel = null;
      if (hold.seatId) {
        const [seat] = await db
          .select({ seatLabel: floorPlanSeats.seatLabel })
          .from(floorPlanSeats)
          .where(eq(floorPlanSeats.id, hold.seatId));
        seatLabel = seat?.seatLabel || null;
      }

      let zoneName = null;
      if (hold.zoneId) {
        const [zone] = await db
          .select({ name: floorPlanZones.name })
          .from(floorPlanZones)
          .where(eq(floorPlanZones.id, hold.zoneId));
        zoneName = zone?.name || null;
      }

      return {
        ...hold,
        seatLabel,
        zoneName,
        remainingSeconds: Math.max(0, Math.floor((hold.expiresAt.getTime() - now.getTime()) / 1000)),
        canExtend: hold.extendedCount < 2,
      };
    }));

    res.json({
      holds: holdsWithDetails,
      totalHolds: holdsWithDetails.length,
      sessionId: sessionId.substring(0, 8) + '...', // Masked for security
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get my holds error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
