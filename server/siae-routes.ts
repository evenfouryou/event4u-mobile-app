// SIAE Module API Routes
import { Router, Request, Response, NextFunction } from "express";
import { siaeStorage } from "./siae-storage";
import { db } from "./db";
import { events } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requestFiscalSeal, isCardReadyForSeals, isBridgeConnected } from "./bridge-relay";
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
    const data = patchTicketedEventSchema.parse(req.body);
    const event = await siaeStorage.updateSiaeTicketedEvent(req.params.id, data);
    if (!event) {
      return res.status(404).json({ message: "Evento biglietteria non trovato" });
    }
    res.json(event);
  } catch (error: any) {
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
router.get('/api/siae/ticketed-events/:id/reports/c1', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    const sectors = await siaeStorage.getSiaeEventSectorsByEvent(id);
    const transactions = await siaeStorage.getSiaeTransactionsByEvent(id);
    const tickets = await siaeStorage.getSiaeTicketsByEvent(id);

    const salesByDate: Record<string, { 
      date: string; 
      ticketsSold: number; 
      totalAmount: number;
      byTicketType: Record<string, { name: string; quantity: number; amount: number }>;
    }> = {};

    for (const tx of transactions) {
      if (tx.status !== 'completed') continue;
      const dateStr = tx.transactionDate ? new Date(tx.transactionDate).toISOString().split('T')[0] : 'N/D';
      
      if (!salesByDate[dateStr]) {
        salesByDate[dateStr] = {
          date: dateStr,
          ticketsSold: 0,
          totalAmount: 0,
          byTicketType: {},
        };
      }
      
      salesByDate[dateStr].ticketsSold += tx.ticketsCount || 0;
      salesByDate[dateStr].totalAmount += Number(tx.totalAmount) || 0;

      const txTickets = tickets.filter(t => t.transactionId === tx.id);
      for (const ticket of txTickets) {
        const sector = sectors.find(s => s.id === ticket.sectorId);
        const sectorName = sector?.name || 'Sconosciuto';
        if (!salesByDate[dateStr].byTicketType[sectorName]) {
          salesByDate[dateStr].byTicketType[sectorName] = { name: sectorName, quantity: 0, amount: 0 };
        }
        salesByDate[dateStr].byTicketType[sectorName].quantity += 1;
        salesByDate[dateStr].byTicketType[sectorName].amount += Number(ticket.ticketPrice) || 0;
      }
    }

    const dailySales = Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      reportType: 'C1',
      reportName: 'Registro Giornaliero',
      eventId: id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      generatedAt: new Date().toISOString(),
      totalTicketsSold: event.ticketsSold || 0,
      totalRevenue: Number(event.totalRevenue) || 0,
      dailySales,
      sectors: sectors.map(s => ({
        id: s.id,
        name: s.name,
        capacity: s.capacity,
        availableSeats: s.availableSeats,
        soldCount: s.capacity - s.availableSeats,
        price: Number(s.price) || 0,
        revenue: (s.capacity - s.availableSeats) * (Number(s.price) || 0),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// C2 Report - Event Summary (Riepilogo Evento)
router.get('/api/siae/ticketed-events/:id/reports/c2', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await siaeStorage.getSiaeTicketedEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Evento non trovato" });
    }

    const sectors = await siaeStorage.getSiaeEventSectorsByEvent(id);
    const transactions = await siaeStorage.getSiaeTransactionsByEvent(id);
    
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
      const sectorRevenue = soldCount * (Number(s.price) || 0);
      const sectorVat = sectorRevenue * (vatRate / (100 + vatRate));
      return {
        id: s.id,
        name: s.name,
        sectorCode: s.sectorCode,
        ticketTypeCode: s.ticketTypeCode,
        capacity: s.capacity,
        ticketsSold: soldCount,
        availableSeats: s.availableSeats,
        price: Number(s.price) || 0,
        grossRevenue: sectorRevenue,
        vatAmount: sectorVat,
        netRevenue: sectorRevenue - sectorVat,
      };
    });

    res.json({
      reportType: 'C2',
      reportName: 'Riepilogo Evento',
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

    const sectors = await siaeStorage.getSiaeEventSectorsByEvent(id);
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
      <Prezzo>${Number(s.price || 0).toFixed(2)}</Prezzo>
      <Incasso>${((s.capacity - s.availableSeats) * Number(s.price || 0)).toFixed(2)}</Incasso>
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

    const sectors = await siaeStorage.getSiaeEventSectorsByEvent(id);
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

export default router;
