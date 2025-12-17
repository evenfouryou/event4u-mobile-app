// SIAE Module API Routes
import { Router, Request, Response, NextFunction } from "express";
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";
import { db } from "./db";
import { events, siaeCashiers, siaeTickets, siaeTransactions, siaeSubscriptions, siaeCashierAllocations } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requestFiscalSeal, isCardReadyForSeals, isBridgeConnected, getCachedBridgeStatus } from "./bridge-relay";
import { sendPrintJobToAgent, getConnectedAgents } from "./print-relay";
import { generateTicketHtml } from "./template-routes";
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
  insertSiaeAuditLogSchema,
  insertSiaeNumberedSeatSchema,
  insertSiaeSmartCardSessionSchema,
  insertSiaeSmartCardSealLogSchema,
} from "@shared/schema";

// Helper to create validated partial schemas for PATCH operations
// Uses .strict() to reject unknown fields and .refine() to reject empty payloads
function makePatchSchema<T extends z.ZodTypeAny>(schema: T) {
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
const patchActivationCardSchema = makePatchSchema(insertSiaeActivationCardSchema.omit({ cardNumber: true }));
const patchEmissionChannelSchema = makePatchSchema(insertSiaeEmissionChannelSchema.omit({ activationCardId: true }));
const patchSystemConfigSchema = makePatchSchema(insertSiaeSystemConfigSchema.omit({ companyId: true }));
const patchCustomerSchema = makePatchSchema(insertSiaeCustomerSchema.omit({ companyId: true, customerCode: true }));
const patchTicketedEventSchema = makePatchSchema(insertSiaeTicketedEventSchema.omit({ companyId: true }));
const patchEventSectorSchema = makePatchSchema(insertSiaeEventSectorSchema.omit({ eventId: true }));
const patchSeatSchema = makePatchSchema(insertSiaeSeatSchema.omit({ sectorId: true }));
const patchFiscalSealSchema = makePatchSchema(insertSiaeFiscalSealSchema.omit({ sealNumber: true, activationCardId: true }));
const patchTicketSchema = makePatchSchema(insertSiaeTicketSchema.omit({ eventId: true, sectorId: true, fiscalSealId: true }));
const patchTransactionSchema = makePatchSchema(insertSiaeTransactionSchema.omit({ customerId: true, ticketId: true }));
const patchNameChangeSchema = makePatchSchema(insertSiaeNameChangeSchema.omit({ ticketId: true, originalCustomerId: true }));
const patchResaleSchema = makePatchSchema(insertSiaeResaleSchema.omit({ originalTicketId: true, sellerId: true }));
const patchTransmissionSchema = makePatchSchema(insertSiaeTransmissionSchema.omit({ companyId: true }));
const patchBoxOfficeSessionSchema = makePatchSchema(insertSiaeBoxOfficeSessionSchema.omit({ channelId: true, userId: true }));
const patchSubscriptionSchema = makePatchSchema(insertSiaeSubscriptionSchema.omit({ customerId: true }));
const patchNumberedSeatSchema = makePatchSchema(insertSiaeNumberedSeatSchema.omit({ sectorId: true }));

const router = Router();

console.log('[SIAE Routes] Router initialized, registering routes...');

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
    const card = await siaeStorage.getActivationCardBySerial(req.params.serial);
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
    const stats = await siaeStorage.getActivationCardUsageStats(card.id);
    res.json({ card, ...stats, notFound: false });
  } catch (error: any) {
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

router.get("/api/siae/customers", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const customers = await siaeStorage.getSiaeCustomers();
    res.json(customers);
  } catch (error: any) {
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
  try {
    const customer = await siaeStorage.getSiaeCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Cliente non trovato" });
    }
    
    // Verifica se ci sono record collegati che impedirebbero l'eliminazione
    const [hasTickets] = await db.select({ count: sql<number>`count(*)` })
      .from(siaeTickets)
      .where(eq(siaeTickets.customerId, req.params.id));
    
    const [hasTransactions] = await db.select({ count: sql<number>`count(*)` })
      .from(siaeTransactions)
      .where(eq(siaeTransactions.customerId, req.params.id));
    
    const [hasSubscriptions] = await db.select({ count: sql<number>`count(*)` })
      .from(siaeSubscriptions)
      .where(eq(siaeSubscriptions.customerId, req.params.id));
    
    if (Number(hasTickets?.count) > 0 || Number(hasTransactions?.count) > 0 || Number(hasSubscriptions?.count) > 0) {
      return res.status(409).json({ 
        message: "Impossibile eliminare il cliente: ha biglietti, transazioni o abbonamenti associati. Disattivalo invece di eliminarlo." 
      });
    }
    
    const deleted = await siaeStorage.deleteSiaeCustomer(req.params.id);
    if (!deleted) {
      return res.status(500).json({ message: "Errore durante l'eliminazione" });
    }
    
    res.json({ message: "Cliente eliminato con successo" });
  } catch (error: any) {
    // Gestisci errori di vincolo FK
    if (error.code === '23503') { // PostgreSQL foreign key violation
      return res.status(409).json({ 
        message: "Impossibile eliminare il cliente: ha record associati nel sistema. Disattivalo invece di eliminarlo." 
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
    
    // Generate 6-digit OTP using secure random
    const otpCode = generateSecureOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    await siaeStorage.createSiaeOtpAttempt({
      phone: data.phone,
      otpCode,
      purpose: data.purpose,
      expiresAt,
    });
    
    // In production, send SMS via provider
    // For now, log OTP for testing
    console.log(`[SIAE OTP] Phone: ${data.phone}, OTP: ${otpCode}`);
    
    res.json({ message: "OTP inviato con successo", expiresIn: 300 });
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
    
    // Get the OTP attempt (storage returns raw record, we validate status/expiry here)
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
      isNewCustomer: !customer 
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
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

router.post("/api/siae/ticketed-events", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeTicketedEventSchema.parse(req.body);
    const event = await siaeStorage.createSiaeTicketedEvent(data);
    res.status(201).json(event);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/ticketed-events/:id", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    console.log("[SIAE PATCH] Received body:", JSON.stringify(req.body).substring(0, 500));
    const data = patchTicketedEventSchema.parse(req.body);
    console.log("[SIAE PATCH] Parsed data:", JSON.stringify(data).substring(0, 500));
    const event = await siaeStorage.updateSiaeTicketedEvent(req.params.id, data);
    if (!event) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
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
    const deleted = await siaeStorage.deleteSiaeEventSector(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Settore non trovato" });
    }
    res.json({ message: "Settore eliminato con successo" });
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

// ==================== Tickets (Organizer / Box Office) ====================

// Schema minimo per emissione manuale - sigillo generato server-side
// .strict() rifiuta qualsiasi campo non definito nello schema (inclusi tentativi di iniezione sigillo)
const manualTicketEmissionSchema = z.object({
  ticketedEventId: z.string().min(1, "ID evento richiesto"),
  sectorId: z.string().min(1, "ID settore richiesto"),
  ticketTypeCode: z.string().min(1, "Tipo biglietto richiesto"),
  sectorCode: z.string().optional(),
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
    const ticketData = {
      ticketedEventId: data.ticketedEventId,
      sectorId: data.sectorId,
      ticketTypeCode: data.ticketTypeCode,
      sectorCode: data.sectorCode || sector.sectorCode,
      customerId: data.customerId || null,
      participantFirstName: data.participantFirstName || null,
      participantLastName: data.participantLastName || null,
      emissionDate: data.emissionDate ? new Date(data.emissionDate) : now,
      emissionDateStr,
      emissionTimeStr,
      grossAmount: grossAmount,
      // SIGILLO GENERATO SERVER-SIDE - OBBLIGATORIO SIAE
      fiscalSealCode: sealData.sealCode,
      progressiveNumber: sealData.counter,
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

router.post("/api/siae/tickets/:id/cancel", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { reasonCode } = req.body;
    if (!reasonCode) {
      return res.status(400).json({ message: "Causale annullamento richiesta" });
    }
    const user = req.user as any;
    const ticket = await siaeStorage.cancelSiaeTicket(req.params.id, reasonCode, user.id);
    if (!ticket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
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

// ==================== Name Changes (Customer / Organizer) ====================

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
    const data = insertSiaeNameChangeSchema.parse(req.body);
    const change = await siaeStorage.createSiaeNameChange(data);
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

// ==================== Resales (Customer) ====================

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
    const resales = await siaeStorage.getAvailableSiaeResalesByEvent(req.params.eventId);
    res.json(resales);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/siae/resales", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeResaleSchema.parse(req.body);
    const resale = await siaeStorage.createSiaeResale(data);
    res.status(201).json(resale);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/api/siae/resales/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = patchResaleSchema.parse(req.body);
    const resale = await siaeStorage.updateSiaeResale(req.params.id, data);
    if (!resale) {
      return res.status(404).json({ message: "Rimessa in vendita non trovata" });
    }
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

router.post("/api/siae/transmissions", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeTransmissionSchema.parse(req.body);
    const transmission = await siaeStorage.createSiaeTransmission(data);
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
    res.json(transmission);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
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

router.post("/api/siae/subscriptions", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const data = insertSiaeSubscriptionSchema.parse(req.body);
    const subscription = await siaeStorage.createSiaeSubscription(data);
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
    res.json(subscription);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
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
    
    const data = insertSiaeSubscriptionSchema.parse({
      ...req.body,
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

// Helper to escape XML special characters
function escapeXml(str: string | null | undefined): string {
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

// Format date for SIAE XML (YYYY-MM-DD)
function formatSiaeDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

// Format datetime for SIAE XML (YYYY-MM-DDTHH:MM:SS)
function formatSiaeDateTime(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().replace('.000Z', '');
}

// Generate XML for daily ticket report (Provvedimento 356768/2025)
router.get("/api/siae/companies/:companyId/reports/xml/daily", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { date, eventId } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: "Data obbligatoria (formato: YYYY-MM-DD)" });
    }
    
    const reportDate = new Date(date as string);
    
    // Get activation card for company
    const activationCards = await siaeStorage.getSiaeActivationCardsByCompany(companyId);
    const activeCard = activationCards.find(c => c.status === 'active');
    
    if (!activeCard) {
      return res.status(400).json({ message: "Nessuna carta di attivazione attiva trovata" });
    }
    
    // Get all tickets for the date range
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Build XML report
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ComunicazioneDatiTitoli xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(activeCard.fiscalCode)}</CodiceFiscaleEmittente>
    <NumeroCarta>${escapeXml(activeCard.cardNumber)}</NumeroCarta>
    <DataRiferimento>${formatSiaeDate(reportDate)}</DataRiferimento>
    <DataOraGenerazione>${formatSiaeDateTime(new Date())}</DataOraGenerazione>
    <TipoTrasmissione>ORDINARIA</TipoTrasmissione>
  </Intestazione>
  <ElencoTitoli>`;
    
    // Get tickets issued on this date
    const allTickets = await siaeStorage.getSiaeTicketsByCompany(companyId);
    const dayTickets = allTickets.filter(t => {
      const ticketDate = new Date(t.emissionDate);
      return ticketDate >= startOfDay && ticketDate <= endOfDay;
    });
    
    for (const ticket of dayTickets) {
      // Get related data - first try via sector, then fallback to ticketedEventId
      let ticketedEvent = null;
      if (ticket.sectorId) {
        const sector = await siaeStorage.getSiaeEventSector(ticket.sectorId);
        if (sector?.ticketedEventId) {
          ticketedEvent = await siaeStorage.getSiaeTicketedEvent(sector.ticketedEventId);
        }
      }
      // Fallback to direct ticketedEventId if sector lookup failed
      if (!ticketedEvent && ticket.ticketedEventId) {
        ticketedEvent = await siaeStorage.getSiaeTicketedEvent(ticket.ticketedEventId);
      }
      
      xml += `
    <Titolo>
      <NumeroProgressivo>${ticket.progressiveNumber || 0}</NumeroProgressivo>
      <SigilloFiscale>${escapeXml(ticket.fiscalSealCode)}</SigilloFiscale>
      <TipologiaTitolo>${escapeXml(ticket.ticketTypeCode)}</TipologiaTitolo>
      <DataOraEmissione>${formatSiaeDateTime(ticket.emissionDate)}</DataOraEmissione>
      <CodiceCanale>${escapeXml(ticket.emissionChannelCode)}</CodiceCanale>
      <ImportoLordo>${(ticket.grossPrice / 100).toFixed(2)}</ImportoLordo>
      <ImportoNetto>${(ticket.netPrice / 100).toFixed(2)}</ImportoNetto>
      <Diritti>${(ticket.siaeFee / 100).toFixed(2)}</Diritti>
      <IVA>${(ticket.vatAmount / 100).toFixed(2)}</IVA>
      <CodiceGenere>${escapeXml(ticketedEvent?.eventGenreCode || '')}</CodiceGenere>
      <CodicePrestazione>${escapeXml(ticket.serviceCode)}</CodicePrestazione>
      <DataEvento>${formatSiaeDate(ticketedEvent?.eventDate || null)}</DataEvento>
      <NominativoAcquirente>
        <Nome>${escapeXml(ticket.holderFirstName)}</Nome>
        <Cognome>${escapeXml(ticket.holderLastName)}</Cognome>
        <CodiceFiscale>${escapeXml(ticket.holderFiscalCode)}</CodiceFiscale>
      </NominativoAcquirente>
      <Stato>${escapeXml(ticket.status)}</Stato>
    </Titolo>`;
    }
    
    xml += `
  </ElencoTitoli>
  <Riepilogo>
    <TotaleTitoli>${dayTickets.length}</TotaleTitoli>
    <TotaleImportoLordo>${(dayTickets.reduce((sum, t) => sum + t.grossPrice, 0) / 100).toFixed(2)}</TotaleImportoLordo>
    <TotaleDiritti>${(dayTickets.reduce((sum, t) => sum + t.siaeFee, 0) / 100).toFixed(2)}</TotaleDiritti>
    <TotaleIVA>${(dayTickets.reduce((sum, t) => sum + t.vatAmount, 0) / 100).toFixed(2)}</TotaleIVA>
  </Riepilogo>
</ComunicazioneDatiTitoli>`;
    
    // Create transmission record
    const transmission = await siaeStorage.createSiaeTransmission({
      companyId,
      activationCardId: activeCard.id,
      transmissionType: 'daily_report',
      reportDate: reportDate,
      xmlContent: xml,
      status: 'pending',
      totalTickets: dayTickets.length,
      totalAmount: dayTickets.reduce((sum, t) => sum + t.grossPrice, 0),
      totalSiaeFee: dayTickets.reduce((sum, t) => sum + t.siaeFee, 0),
    });
    
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="SIAE_${formatSiaeDate(reportDate)}_${transmission.id}.xml"`);
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Generate XML for event report (all tickets for a specific event)
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
    
    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportEvento xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(activeCard.fiscalCode)}</CodiceFiscaleEmittente>
    <NumeroCarta>${escapeXml(activeCard.cardNumber)}</NumeroCarta>
    <DataOraGenerazione>${formatSiaeDateTime(new Date())}</DataOraGenerazione>
  </Intestazione>
  <DatiEvento>
    <CodiceEvento>${escapeXml(ticketedEvent.id)}</CodiceEvento>
    <Denominazione>${escapeXml(ticketedEvent.eventName)}</Denominazione>
    <CodiceGenere>${escapeXml(ticketedEvent.eventGenreCode)}</CodiceGenere>
    <DataEvento>${formatSiaeDate(ticketedEvent.eventDate)}</DataEvento>
    <OraInizio>${escapeXml(ticketedEvent.startTime || '')}</OraInizio>
    <Luogo>${escapeXml(ticketedEvent.venueName)}</Luogo>
    <Indirizzo>${escapeXml(ticketedEvent.venueAddress)}</Indirizzo>
    <Comune>${escapeXml(ticketedEvent.venueCity)}</Comune>
    <Provincia>${escapeXml(ticketedEvent.venueProvince)}</Provincia>
  </DatiEvento>
  <ElencoSettori>`;
    
    for (const sector of sectors) {
      const sectorTickets = allTickets.filter(t => t.sectorId === sector.id);
      const soldTickets = sectorTickets.filter(t => t.status !== 'cancelled');
      
      xml += `
    <Settore>
      <CodiceSettore>${escapeXml(sector.sectorCode)}</CodiceSettore>
      <Denominazione>${escapeXml(sector.name)}</Denominazione>
      <CapienzaTotale>${sector.totalCapacity}</CapienzaTotale>
      <PostiNumerati>${sector.isNumbered ? 'SI' : 'NO'}</PostiNumerati>
      <BigliettiEmessi>${sectorTickets.length}</BigliettiEmessi>
      <BigliettiValidi>${soldTickets.length}</BigliettiValidi>
      <ImportoTotale>${(soldTickets.reduce((sum, t) => sum + t.grossPrice, 0) / 100).toFixed(2)}</ImportoTotale>
    </Settore>`;
    }
    
    xml += `
  </ElencoSettori>
  <Riepilogo>
    <TotaleBigliettiEmessi>${allTickets.length}</TotaleBigliettiEmessi>
    <TotaleBigliettiValidi>${allTickets.filter(t => t.status !== 'cancelled').length}</TotaleBigliettiValidi>
    <TotaleBigliettiAnnullati>${allTickets.filter(t => t.status === 'cancelled').length}</TotaleBigliettiAnnullati>
    <TotaleIncassoLordo>${(allTickets.reduce((sum, t) => sum + t.grossPrice, 0) / 100).toFixed(2)}</TotaleIncassoLordo>
    <TotaleDiritti>${(allTickets.reduce((sum, t) => sum + t.siaeFee, 0) / 100).toFixed(2)}</TotaleDiritti>
    <TotaleIVA>${(allTickets.reduce((sum, t) => sum + t.vatAmount, 0) / 100).toFixed(2)}</TotaleIVA>
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
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportAnnullamenti xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(activeCard.fiscalCode)}</CodiceFiscaleEmittente>
    <NumeroCarta>${escapeXml(activeCard.cardNumber)}</NumeroCarta>
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
      <ImportoRimborsato>${(ticket.refundAmount ? ticket.refundAmount / 100 : 0).toFixed(2)}</ImportoRimborsato>
    </Annullamento>`;
    }
    
    xml += `
  </ElencoAnnullamenti>
  <Riepilogo>
    <TotaleAnnullamenti>${cancelledTickets.length}</TotaleAnnullamenti>
    <TotaleRimborsato>${(cancelledTickets.reduce((sum, t) => sum + (t.refundAmount || 0), 0) / 100).toFixed(2)}</TotaleRimborsato>
  </Riepilogo>
</ReportAnnullamenti>`;
    
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="SIAE_Cancellations_${formatSiaeDate(startDate)}_${formatSiaeDate(endDate)}.xml"`);
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
    const userId = req.user?.id;
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
    const userId = req.user?.id;
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
      companyId: req.user?.companyId || '',
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
        companyId: req.user?.companyId || '',
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
    const userId = req.user?.id;
    
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
        companyId: req.user?.companyId || '',
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
        companyId: req.user?.companyId || '',
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
        companyId: req.user?.companyId || '',
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
    const userId = req.user?.id;
    
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
      companyId: req.user?.companyId || '',
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
    const userId = req.user?.id;
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

// C1 Report - Daily Register (Registro Giornaliero)
// Uses ALL tickets (including cashier-emitted tickets without transactions)
router.get('/api/siae/ticketed-events/:id/reports/c1', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    const sectors = await siaeStorage.getSiaeEventSectors(id);
    const tickets = await siaeStorage.getSiaeTicketsByEvent(id);
    
    // Filter only active/emitted tickets
    const activeTickets = tickets.filter(t => t.status !== 'cancelled');

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
      
      salesByDate[dateStr].ticketsSold += 1;
      salesByDate[dateStr].totalAmount += Number(ticket.ticketPrice) || 0;

      // Aggregate by ticket type
      const ticketType = ticket.ticketType || 'intero';
      if (!salesByDate[dateStr].byTicketType[ticketType]) {
        salesByDate[dateStr].byTicketType[ticketType] = { 
          name: ticketType === 'intero' ? 'Intero' : ticketType === 'ridotto' ? 'Ridotto' : ticketType === 'omaggio' ? 'Omaggio' : ticketType, 
          quantity: 0, 
          amount: 0 
        };
      }
      salesByDate[dateStr].byTicketType[ticketType].quantity += 1;
      salesByDate[dateStr].byTicketType[ticketType].amount += Number(ticket.ticketPrice) || 0;

      // Aggregate by sector
      const sector = sectors.find(s => s.id === ticket.sectorId);
      const sectorName = sector?.name || 'Sconosciuto';
      if (!salesByDate[dateStr].bySector[sectorName]) {
        salesByDate[dateStr].bySector[sectorName] = { name: sectorName, quantity: 0, amount: 0 };
      }
      salesByDate[dateStr].bySector[sectorName].quantity += 1;
      salesByDate[dateStr].bySector[sectorName].amount += Number(ticket.ticketPrice) || 0;
    }

    const dailySales = Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate totals
    const totalTicketsSold = activeTickets.length;
    const totalRevenue = activeTickets.reduce((sum, t) => sum + (Number(t.ticketPrice) || 0), 0);
    
    // Calculate VAT
    const vatRate = event.vatRate || 10;
    const vatAmount = totalRevenue * (vatRate / (100 + vatRate));
    const netRevenue = totalRevenue - vatAmount;

    res.json({
      reportType: 'C1',
      reportName: 'Registro Giornaliero',
      eventId: id,
      eventName: event.eventName,
      eventCode: event.eventCode,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      venueName: event.venueName,
      generatedAt: new Date().toISOString(),
      totalTicketsSold,
      totalRevenue,
      vatRate,
      vatAmount,
      netRevenue,
      cancelledTickets: tickets.filter(t => t.status === 'cancelled').length,
      dailySales,
      sectors: sectors.map(s => ({
        id: s.id,
        name: s.name,
        sectorCode: s.sectorCode,
        capacity: s.capacity,
        availableSeats: s.availableSeats,
        soldCount: s.capacity - s.availableSeats,
        priceIntero: Number(s.priceIntero) || 0,
        priceRidotto: Number(s.priceRidotto) || 0,
        revenue: activeTickets.filter(t => t.sectorId === s.id).reduce((sum, t) => sum + (Number(t.ticketPrice) || 0), 0),
      })),
      ticketTypes: {
        intero: {
          count: activeTickets.filter(t => t.ticketType === 'intero').length,
          amount: activeTickets.filter(t => t.ticketType === 'intero').reduce((s, t) => s + (Number(t.ticketPrice) || 0), 0)
        },
        ridotto: {
          count: activeTickets.filter(t => t.ticketType === 'ridotto').length,
          amount: activeTickets.filter(t => t.ticketType === 'ridotto').reduce((s, t) => s + (Number(t.ticketPrice) || 0), 0)
        },
        omaggio: {
          count: activeTickets.filter(t => t.ticketType === 'omaggio').length,
          amount: 0
        }
      }
    });
  } catch (error: any) {
    console.error('[C1 Report] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// C2 Report - Event Summary (Riepilogo Abbonamenti)
router.get('/api/siae/ticketed-events/:id/reports/c2', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

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
        ticketTypeCode: s.ticketTypeCode,
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

    // Raggruppa abbonamenti per tipo
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

    res.json({
      reportType: 'C2',
      reportName: 'Riepilogo Abbonamenti',
      eventId: id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      eventGenre: event.eventGenre,
      eventLocation: event.eventLocation,
      generatedAt: new Date().toISOString(),
      summary: {
        totalCapacity: event.totalCapacity || 0,
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
      subscriptionSummary: Object.values(subscriptionsByType),
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
      <TipoBiglietto>${s.ticketTypeCode || ''}</TipoBiglietto>
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
      const dateStr = tx.transactionDate ? new Date(tx.transactionDate).toISOString().split('T')[0] : 'N/D';
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
        ticketTypeCode: s.ticketTypeCode,
        capacity: s.capacity,
        soldCount: s.capacity - s.availableSeats,
        availableSeats: s.availableSeats,
        price: Number(s.price) || 0,
        revenue: (s.capacity - s.availableSeats) * (Number(s.price) || 0),
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
    const userId = req.user?.id;
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
        companyId: req.user?.companyId || '',
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
      .orderBy(desc(siaeTicketedEvents.eventDate));
    
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
    const { sectorId, ticketType, price, participantFirstName, participantLastName, participantPhone, participantEmail, paymentMethod, skipFiscalSeal, quantity = 1 } = req.body;
    
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
        sectorCode: sector.sectorCode,
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
            companyId: user.companyId,
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
            companyId: user.companyId,
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
      companyId: user.companyId,
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
      companyId: user.companyId,
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
router.post("/api/siae/tickets/cancel-range", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { ticketedEventId, fromNumber, toNumber, reasonCode, note } = req.body;
    
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
          cancelledByUserId: user.id,
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
      userId: user.id,
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
        ticketPrice: s.ticketPrice
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
    const { sectorId, ticketType, ticketPrice, participantFirstName, participantLastName, paymentMethod, isComplimentary } = req.body;
    
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
        fiscalSealCode = sealData?.sealNumber;
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
      ticketCode,
      ticketType,
      ticketPrice: Number(ticketPrice),
      customerId: null,
      issuedByUserId: cashierId,
      participantFirstName: participantFirstName || null,
      participantLastName: participantLastName || null,
      isComplimentary: isComplimentary || false,
      paymentMethod: paymentMethod || 'cash',
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
    
    // Update ticket with fiscal seal if available
    if (fiscalSealCode && result.ticket) {
      await siaeStorage.updateSiaeTicket(result.ticket.id, {
        fiscalSealCode,
        fiscalSeal: JSON.stringify(fiscalSeal)
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
    
    const activeTickets = todayTickets.filter(t => t.status !== 'cancelled');
    const cancelledTickets = todayTickets.filter(t => t.status === 'cancelled');
    
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
      
      const price = Number(ticket.ticketPrice) || 0;
      
      switch (ticket.ticketType) {
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
      }
    }
    
    const activeTickets = tickets.filter(t => t.status !== 'cancelled');
    const totalRevenue = activeTickets.reduce((sum, t) => sum + (Number(t.ticketPrice) || 0), 0);
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
        totalTicketsCancelled: tickets.filter(t => t.status === 'cancelled').length,
        totalRevenue,
        vatRate,
        vatAmount,
        netRevenue
      },
      sectors: Array.from(sectorStats.values()),
      ticketTypes: {
        intero: {
          count: activeTickets.filter(t => t.ticketType === 'intero').length,
          amount: activeTickets.filter(t => t.ticketType === 'intero').reduce((s, t) => s + (Number(t.ticketPrice) || 0), 0)
        },
        ridotto: {
          count: activeTickets.filter(t => t.ticketType === 'ridotto').length,
          amount: activeTickets.filter(t => t.ticketType === 'ridotto').reduce((s, t) => s + (Number(t.ticketPrice) || 0), 0)
        },
        omaggio: {
          count: activeTickets.filter(t => t.ticketType === 'omaggio').length,
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
    
    // Determine print agent ID
    let printerAgentId = agentId;
    
    // If no agent specified, try to get from cashier's default printer
    if (!printerAgentId && user.role === 'cassiere') {
      const cashierId = getSiaeCashierId(user);
      if (cashierId) {
        const [cashier] = await db.select().from(siaeCashiers).where(eq(siaeCashiers.id, cashierId));
        if (cashier?.defaultPrinterAgentId) {
          printerAgentId = cashier.defaultPrinterAgentId;
        }
      }
    }
    
    // Get first connected agent for the company if still no agent
    if (!printerAgentId) {
      const agents = getConnectedAgents(event.companyId);
      if (agents.length > 0) {
        printerAgentId = agents[0].agentId;
      }
    }
    
    if (!printerAgentId) {
      return res.status(503).json({ 
        message: "Nessun agente di stampa connesso. Avviare l'applicazione desktop Event4U.",
        errorCode: "NO_PRINT_AGENT"
      });
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
    
    // Build ticket data for template
    const ticketData: Record<string, string> = {
      event_name: event.eventName || '',
      event_date: event.eventDate ? new Date(event.eventDate).toLocaleDateString('it-IT') : '',
      event_time: event.eventTime || '',
      venue_name: event.venueName || '',
      price: `€ ${Number(ticket.ticketPrice || 0).toFixed(2).replace('.', ',')}`,
      ticket_number: ticket.ticketCode || '',
      progressive_number: String(ticket.progressiveNumber || ''),
      sector: sector?.sectorName || '',
      row: '',
      seat: '',
      buyer_name: ticket.participantFirstName && ticket.participantLastName 
        ? `${ticket.participantFirstName} ${ticket.participantLastName}` 
        : '',
      organizer_company: event.organizerName || '',
      ticketing_manager: '',
      emission_datetime: ticket.emittedAt ? new Date(ticket.emittedAt).toLocaleString('it-IT') : '',
      fiscal_seal: (ticket as any).fiscalSealNumber || '',
      qr_code: `https://manage.eventfouryou.com/verify/${ticket.ticketCode}`,
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
    
    res.json({ success: true, message: "Stampa inviata", agentId: printerAgentId });
  } catch (error: any) {
    console.error('[TicketPrint] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

console.log('[SIAE Routes] All routes registered including /api/siae/tickets/:id/print');

export default router;
