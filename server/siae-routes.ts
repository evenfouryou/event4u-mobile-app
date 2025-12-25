// SIAE Module API Routes
import { Router, Request, Response, NextFunction } from "express";
import { siaeStorage } from "./siae-storage";
import { storage } from "./storage";
import { db } from "./db";
import { events, siaeCashiers, siaeTickets, siaeTransactions, siaeSubscriptions, siaeCashierAllocations, siaeOtpAttempts, siaeNameChanges, siaeResales, publicCartItems, publicCheckoutSessions, publicCustomerSessions, tableBookings, guestListEntries, siaeTransmissions, companies, siaeEmissionChannels, siaeSystemConfig } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requestFiscalSeal, isCardReadyForSeals, isBridgeConnected, getCachedBridgeStatus, requestXmlSignature } from "./bridge-relay";
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
    const { reasonCode, refund, refundReason } = req.body;
    if (!reasonCode) {
      return res.status(400).json({ message: "Causale annullamento richiesta" });
    }
    const user = req.user as any;
    
    // Prima ottieni il biglietto per avere il transactionId
    const existingTicket = await siaeStorage.getSiaeTicket(req.params.id);
    if (!existingTicket) {
      return res.status(404).json({ message: "Biglietto non trovato" });
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

// Send XML transmission via email
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
    
    // Get company name
    const company = await storage.getCompany(transmission.companyId);
    const companyName = company?.name || 'N/A';
    
    // Import email service
    const { sendSiaeTransmissionEmail } = await import('./email-service');
    
    // Send the email to SIAE test environment
    const destinationEmail = getSiaeDestinationEmail(toEmail);
    await sendSiaeTransmissionEmail({
      to: destinationEmail,
      companyName,
      transmissionType: transmission.transmissionType as 'daily' | 'monthly' | 'corrective',
      periodDate: new Date(transmission.periodDate),
      ticketsCount: transmission.ticketsCount || 0,
      totalAmount: transmission.totalAmount || '0',
      xmlContent: transmission.fileContent,
      transmissionId: transmission.id,
    });
    
    console.log(`[SIAE-ROUTES] Transmission sent to: ${destinationEmail} (Test mode: ${SIAE_TEST_MODE})`);
    
    // Update transmission status to sent
    await siaeStorage.updateSiaeTransmission(id, {
      status: 'sent',
      sentDate: new Date(),
    });
    
    res.json({ success: true, message: "Email inviata con successo" });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to send transmission email:', error);
    res.status(500).json({ message: error.message });
  }
});

// Generate and send automatic daily transmission
router.post("/api/siae/companies/:companyId/transmissions/send-daily", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { date, toEmail } = req.body;
    
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    
    // Get activation card for company
    const activationCards = await siaeStorage.getSiaeActivationCardsByCompany(companyId);
    const activeCard = activationCards.find(c => c.status === 'active');
    
    if (!activeCard) {
      return res.status(400).json({ message: "Nessuna carta di attivazione attiva trovata" });
    }
    
    // Get system config for fiscal code
    const systemConfig = await siaeStorage.getSiaeSystemConfig(companyId);
    
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
    
    // Build XML report
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ComunicazioneDatiTitoli xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(systemConfig?.taxId || '')}</CodiceFiscaleEmittente>
    <NumeroCarta>${escapeXml(activeCard.cardCode)}</NumeroCarta>
    <DataRiferimento>${formatSiaeDate(reportDate)}</DataRiferimento>
    <DataOraGenerazione>${formatSiaeDateTime(new Date())}</DataOraGenerazione>
    <TipoTrasmissione>ORDINARIA</TipoTrasmissione>
  </Intestazione>
  <ElencoTitoli>`;
    
    for (const ticket of dayTickets) {
      let ticketedEvent = null;
      if (ticket.sectorId) {
        const sector = await siaeStorage.getSiaeEventSector(ticket.sectorId);
        if (sector?.ticketedEventId) {
          ticketedEvent = await siaeStorage.getSiaeTicketedEvent(sector.ticketedEventId);
        }
      } else if (ticket.ticketedEventId) {
        ticketedEvent = await siaeStorage.getSiaeTicketedEvent(ticket.ticketedEventId);
      }
      
      xml += `
    <Titolo>
      <NumeroProgressivo>${ticket.progressiveNumber || 0}</NumeroProgressivo>
      <SigilloFiscale>${escapeXml(ticket.fiscalSealCode)}</SigilloFiscale>
      <TipologiaTitolo>${escapeXml(ticket.ticketTypeCode)}</TipologiaTitolo>
      <DataOraEmissione>${formatSiaeDateTime(ticket.emissionDate)}</DataOraEmissione>
      <CodiceCanale>${escapeXml(ticket.emissionChannelCode)}</CodiceCanale>
      <ImportoLordo>${parseFloat(ticket.grossAmount || '0').toFixed(2)}</ImportoLordo>
      <ImportoNetto>${parseFloat(ticket.netAmount || '0').toFixed(2)}</ImportoNetto>
      <Diritti>0.00</Diritti>
      <IVA>${parseFloat(ticket.vatAmount || '0').toFixed(2)}</IVA>
      <CodiceGenere>${escapeXml(ticketedEvent?.genreCode || '')}</CodiceGenere>
      <CodicePrestazione>${escapeXml(ticket.ticketTypeCode || '')}</CodicePrestazione>
      <DataEvento>${formatSiaeDate(ticketedEvent?.saleStartDate || null)}</DataEvento>
      <NominativoAcquirente>
        <Nome>${escapeXml(ticket.participantFirstName || '')}</Nome>
        <Cognome>${escapeXml(ticket.participantLastName || '')}</Cognome>
      </NominativoAcquirente>
      <Stato>${escapeXml(ticket.status)}</Stato>
    </Titolo>`;
    }
    
    xml += `
  </ElencoTitoli>
  <Riepilogo>
    <TotaleTitoli>${dayTickets.length}</TotaleTitoli>
    <TotaleImportoLordo>${dayTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0).toFixed(2)}</TotaleImportoLordo>
    <TotaleDiritti>0.00</TotaleDiritti>
    <TotaleIVA>${dayTickets.reduce((sum, t) => sum + parseFloat(t.vatAmount || '0'), 0).toFixed(2)}</TotaleIVA>
  </Riepilogo>
</ComunicazioneDatiTitoli>`;
    
    const totalAmount = dayTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0).toString();
    
    // Create transmission record
    const transmission = await siaeStorage.createSiaeTransmission({
      companyId,
      transmissionType: 'daily',
      periodDate: reportDate,
      fileContent: xml,
      status: 'pending',
      ticketsCount: dayTickets.length,
      totalAmount,
    });
    
    // Get company name
    const company = await storage.getCompany(companyId);
    const companyName = company?.name || 'N/A';
    
    // Import and send the email
    const { sendSiaeTransmissionEmail } = await import('./email-service');
    
    const dailyDestination = getSiaeDestinationEmail(toEmail);
    await sendSiaeTransmissionEmail({
      to: dailyDestination,
      companyName,
      transmissionType: 'daily',
      periodDate: reportDate,
      ticketsCount: dayTickets.length,
      totalAmount,
      xmlContent: xml,
      transmissionId: transmission.id,
    });
    
    console.log(`[SIAE-ROUTES] Daily transmission sent to: ${dailyDestination} (Test mode: ${SIAE_TEST_MODE})`);
    
    // Update transmission status
    await siaeStorage.updateSiaeTransmission(transmission.id, {
      status: 'sent',
      sentDate: new Date(),
    });
    
    res.json({
      success: true,
      message: "Trasmissione giornaliera generata e inviata con successo",
      transmission: {
        id: transmission.id,
        ticketsCount: dayTickets.length,
        totalAmount,
        sentTo: dailyDestination,
      }
    });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to send daily transmission:', error);
    res.status(500).json({ message: error.message });
  }
});

// Test email endpoint for transmission
router.post("/api/siae/transmissions/test-email", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { toEmail, companyId } = req.body;
    
    if (!toEmail) {
      return res.status(400).json({ message: "Indirizzo email richiesto" });
    }
    
    // Get company name
    const company = companyId ? await storage.getCompany(companyId) : null;
    const companyName = company?.name || 'Test Company';
    
    // Create test XML
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<ComunicazioneDatiTitoli xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>TEST00000000000</CodiceFiscaleEmittente>
    <NumeroCarta>TEST-CARD-001</NumeroCarta>
    <DataRiferimento>${formatSiaeDate(new Date())}</DataRiferimento>
    <DataOraGenerazione>${formatSiaeDateTime(new Date())}</DataOraGenerazione>
    <TipoTrasmissione>TEST</TipoTrasmissione>
  </Intestazione>
  <ElencoTitoli>
    <Titolo>
      <NumeroProgressivo>1</NumeroProgressivo>
      <SigilloFiscale>TEST-SEAL-001</SigilloFiscale>
      <TipologiaTitolo>01</TipologiaTitolo>
      <DataOraEmissione>${formatSiaeDateTime(new Date())}</DataOraEmissione>
      <CodiceCanale>WEB</CodiceCanale>
      <ImportoLordo>10.00</ImportoLordo>
      <ImportoNetto>8.20</ImportoNetto>
      <Diritti>0.00</Diritti>
      <IVA>1.80</IVA>
      <CodiceGenere>01</CodiceGenere>
      <CodicePrestazione>01</CodicePrestazione>
      <DataEvento>${formatSiaeDate(new Date())}</DataEvento>
      <NominativoAcquirente>
        <Nome>Test</Nome>
        <Cognome>Utente</Cognome>
      </NominativoAcquirente>
      <Stato>emesso</Stato>
    </Titolo>
  </ElencoTitoli>
  <Riepilogo>
    <TotaleTitoli>1</TotaleTitoli>
    <TotaleImportoLordo>10.00</TotaleImportoLordo>
    <TotaleDiritti>0.00</TotaleDiritti>
    <TotaleIVA>1.80</TotaleIVA>
  </Riepilogo>
</ComunicazioneDatiTitoli>`;
    
    // Import and send the test email
    const { sendSiaeTransmissionEmail } = await import('./email-service');
    
    await sendSiaeTransmissionEmail({
      to: toEmail,
      companyName,
      transmissionType: 'daily',
      periodDate: new Date(),
      ticketsCount: 1,
      totalAmount: '10.00',
      xmlContent: testXml,
      transmissionId: 'TEST-' + Date.now(),
    });
    
    res.json({
      success: true,
      message: `Email di test inviata con successo a ${toEmail}`,
    });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to send test email:', error);
    res.status(500).json({ message: error.message });
  }
});

// Check for SIAE email responses and update transmission statuses
router.post("/api/siae/transmissions/check-responses", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const { checkForSiaeResponses } = await import('./gmail-client');
    
    console.log('[SIAE-ROUTES] Checking for SIAE email responses...');
    const responses = await checkForSiaeResponses();
    
    const updates: Array<{transmissionId: string; status: string; protocolNumber?: string}> = [];
    
    for (const response of responses) {
      // Try to match with existing transmissions
      if (response.transmissionId) {
        const transmission = await siaeStorage.getSiaeTransmission(response.transmissionId);
        if (transmission && transmission.status === 'sent') {
          // Update the transmission based on the response
          const newStatus = response.status === 'accepted' ? 'received' : 
                           response.status === 'rejected' ? 'rejected' : 
                           response.status === 'error' ? 'error' : 'sent';
          
          await siaeStorage.updateSiaeTransmission(response.transmissionId, {
            status: newStatus,
            receivedAt: response.date,
            receiptProtocol: response.protocolNumber || null,
            receiptContent: response.body.substring(0, 1000), // First 1000 chars
            errorMessage: response.errorMessage || null,
          });
          
          updates.push({
            transmissionId: response.transmissionId,
            status: newStatus,
            protocolNumber: response.protocolNumber,
          });
          
          // Log the update
          await siaeStorage.createSiaeLog({
            companyId: transmission.companyId,
            eventType: response.status === 'accepted' ? 'transmission_confirmed' : 'transmission_error',
            eventDetails: `Risposta SIAE per trasmissione ${response.transmissionId}: ${response.status}${response.protocolNumber ? ` - Protocollo: ${response.protocolNumber}` : ''}`,
            transmissionId: response.transmissionId,
          });
        }
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
        transmissionId: r.transmissionId,
      })),
    });
  } catch (error: any) {
    console.error('[SIAE-ROUTES] Failed to check SIAE responses:', error);
    
    // Check for Gmail permission errors
    if (error.message?.includes('Insufficient Permission') || error.code === 403) {
      return res.status(403).json({ 
        message: "L'integrazione Gmail non ha i permessi per leggere le email. Usa la conferma manuale del protocollo per registrare le risposte SIAE.",
        code: 'GMAIL_PERMISSION_DENIED'
      });
    }
    
    if (error.message?.includes('Gmail not connected')) {
      return res.status(400).json({ 
        message: "Gmail non è connesso. Configura l'integrazione Gmail nelle impostazioni o usa la conferma manuale del protocollo.",
        code: 'GMAIL_NOT_CONNECTED'
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
      eventType: 'transmission_confirmed',
      eventDetails: `Conferma ricezione trasmissione ${id} - Protocollo: ${receiptProtocol}`,
      transmissionId: id,
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
    
    // Get system config for fiscal code
    const systemConfig = await siaeStorage.getSiaeSystemConfig(companyId);
    
    // Build XML report
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ComunicazioneDatiTitoli xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(systemConfig?.taxId || '')}</CodiceFiscaleEmittente>
    <NumeroCarta>${escapeXml(activeCard.cardCode)}</NumeroCarta>
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
      <ImportoLordo>${parseFloat(ticket.grossAmount || '0').toFixed(2)}</ImportoLordo>
      <ImportoNetto>${parseFloat(ticket.netAmount || '0').toFixed(2)}</ImportoNetto>
      <Diritti>0.00</Diritti>
      <IVA>${parseFloat(ticket.vatAmount || '0').toFixed(2)}</IVA>
      <CodiceGenere>${escapeXml(ticketedEvent?.genreCode || '')}</CodiceGenere>
      <CodicePrestazione>${escapeXml(ticket.ticketTypeCode || '')}</CodicePrestazione>
      <DataEvento>${formatSiaeDate(ticketedEvent?.saleStartDate || null)}</DataEvento>
      <NominativoAcquirente>
        <Nome>${escapeXml(ticket.participantFirstName || '')}</Nome>
        <Cognome>${escapeXml(ticket.participantLastName || '')}</Cognome>
      </NominativoAcquirente>
      <Stato>${escapeXml(ticket.status)}</Stato>
    </Titolo>`;
    }
    
    xml += `
  </ElencoTitoli>
  <Riepilogo>
    <TotaleTitoli>${dayTickets.length}</TotaleTitoli>
    <TotaleImportoLordo>${dayTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0).toFixed(2)}</TotaleImportoLordo>
    <TotaleDiritti>0.00</TotaleDiritti>
    <TotaleIVA>${dayTickets.reduce((sum, t) => sum + parseFloat(t.vatAmount || '0'), 0).toFixed(2)}</TotaleIVA>
  </Riepilogo>
</ComunicazioneDatiTitoli>`;
    
    // Create transmission record
    const transmission = await siaeStorage.createSiaeTransmission({
      companyId,
      transmissionType: 'daily',
      periodDate: reportDate,
      fileContent: xml,
      status: 'pending',
      ticketsCount: dayTickets.length,
      totalAmount: dayTickets.reduce((sum, t) => sum + parseFloat(t.grossAmount || '0'), 0).toString(),
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
    
    // Get system config for fiscal code
    const systemConfig = await siaeStorage.getSiaeSystemConfig(ticketedEvent.companyId);
    
    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportEvento xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(systemConfig?.taxId || '')}</CodiceFiscaleEmittente>
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
      const soldTickets = sectorTickets.filter(t => t.status !== 'cancelled');
      
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
    <TotaleBigliettiValidi>${allTickets.filter(t => t.status !== 'cancelled').length}</TotaleBigliettiValidi>
    <TotaleBigliettiAnnullati>${allTickets.filter(t => t.status === 'cancelled').length}</TotaleBigliettiAnnullati>
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
    
    // Get system config for fiscal code
    const systemConfig = await siaeStorage.getSiaeSystemConfig(companyId);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportAnnullamenti xmlns="urn:siae:biglietteria:2025">
  <Intestazione>
    <CodiceFiscaleEmittente>${escapeXml(systemConfig?.taxId || '')}</CodiceFiscaleEmittente>
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
    <TotaleRimborsato>${(cancelledTickets.reduce((sum, t) => sum + (Number(t.refundAmount) || 0), 0) / 100).toFixed(2)}</TotaleRimborsato>
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
  
  // For daily report: filter tickets by today's emission date
  // For monthly report: filter tickets by month of reportDate
  let tickets = allTickets;
  let cancelledTickets = allTickets.filter(t => t.status === 'cancelled');
  
  if (!isMonthly) {
    // Daily report: only tickets emitted today
    tickets = allTickets.filter(t => {
      if (!t.emissionDate) return false;
      const ticketDate = new Date(t.emissionDate).toISOString().split('T')[0];
      return ticketDate === today;
    });
    // Also filter cancelled tickets for today
    cancelledTickets = allTickets.filter(t => {
      if (t.status !== 'cancelled') return false;
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
      if (t.status !== 'cancelled') return false;
      if (t.cancellationDate) {
        const cancelDate = new Date(t.cancellationDate);
        return cancelDate.getMonth() === refMonth && cancelDate.getFullYear() === refYear;
      }
      return false;
    });
  }
  
  // Filter only active/emitted tickets for sales calculations
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
    const location = event.locationId ? await storage.getLocation(event.locationId) : null;
    
    const sectors = await siaeStorage.getSiaeEventSectors(id);
    const allTickets = await siaeStorage.getSiaeTicketsByEvent(id);
    
    // Usa la funzione helper per costruire i dati del report
    const reportData = buildC1ReportData(event, company, siaeConfig, location, sectors, allTickets, { 
      reportType,
      reportDate: new Date()
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

    // Get company data for Quadro A - Organizzatore
    const company = await storage.getCompany(event.companyId);
    
    // Ottieni siaeSystemConfig per QUADRO A - Titolare Sistema Emissione
    // Usa getGlobalSiaeSystemConfig() perché la config viene salvata globalmente
    const siaeConfig = await siaeStorage.getGlobalSiaeSystemConfig() || null;
    
    // Ottieni location per QUADRO A - Dati Locale
    const location = event.locationId ? await storage.getLocation(event.locationId) : null;

    // Get tickets and sectors for C1 report data (usa stesse funzioni del GET)
    const allTickets = await siaeStorage.getSiaeTicketsByEvent(id);
    const sectors = await siaeStorage.getSiaeEventSectors(id);
    
    // Usa la funzione helper condivisa per costruire i dati del report
    // Questo garantisce che GET e POST usino gli stessi calcoli
    const reportData = buildC1ReportData(event, company, siaeConfig, location, sectors, allTickets, { 
      reportType,
      reportDate: new Date()
    });
    const { quadroA, quadroB, quadroC } = reportData;

    // Build C1 XML content - SIAE Official Format (Provvedimento 356768/2025)
    const eventDate = event.eventDate ? new Date(event.eventDate) : new Date();
    const now = new Date();
    
    // Format dates for SIAE XML (YYYYMMDD format)
    const dataEvento = eventDate.toISOString().split('T')[0].replace(/-/g, '');
    const dataGenerazione = now.toISOString().split('T')[0].replace(/-/g, '');
    const oraGenerazione = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const oraEvento = event.eventTime ? event.eventTime.replace(':', '') : '2100';
    
    // Get progressive number for this transmission
    const transmissionCount = await siaeStorage.getSiaeTransmissionCount(event.companyId);
    const progressivoGenerazione = transmissionCount + 1;
    
    const fileName = `C1_${event.code || id}_${dataEvento}.xml`;
    
    // Determine event type (spettacolo vs intrattenimento) and tax type
    const isIntrattenimento = event.eventType === 'intrattenimento';
    const tipoTassazione = isIntrattenimento ? 'I' : 'S'; // I=Intrattenimento, S=Spettacolo
    const tipoGenere = event.siaeGenreCode || '61'; // Default to 61 (discoteca)
    
    // Group tickets by sector and ticket type for proper SIAE OrdineDiPosto structure
    // Each OrdineDiPosto should contain TitoliAccesso grouped by ticket type
    const ticketsBySector: Map<string, { 
      sectorCode: string;
      capacity: number;
      ticketsByType: Map<string, { quantity: number; grossAmount: number; vatAmount: number }>;
    }> = new Map();
    
    // Process all tickets to build proper groupings
    const soldTickets = allTickets.filter(t => t.status === 'emitted' || t.status === 'used');
    for (const ticket of soldTickets) {
      const sectorCode = ticket.sectorCode || 'A0';
      const ticketTypeCode = ticket.ticketTypeCode || 'FD'; // SIAE ticket type code
      
      if (!ticketsBySector.has(sectorCode)) {
        const sector = sectors.find(s => s.sectorCode === sectorCode);
        ticketsBySector.set(sectorCode, {
          sectorCode,
          capacity: sector?.capacity || 0,
          ticketsByType: new Map()
        });
      }
      
      const sectorData = ticketsBySector.get(sectorCode)!;
      // Get VAT rate (default 10% for entertainment/spectacles)
      const ivaRate = Number((ticket as any).ivaRate || (ticket as any).vatRate) || 10;
      const ticketPriceNet = Number(ticket.price) || 0;
      const ticketTotalPrice = Number((ticket as any).totalPrice) || 0;
      const ticketVatAmountStored = Number((ticket as any).vatAmount) || 0;
      
      // Calculate gross and VAT correctly based on available data
      let ticketPriceGross: number;
      let ticketVatAmount: number;
      
      if (ticketTotalPrice > 0) {
        // We have totalPrice (gross) - this is the preferred path
        ticketPriceGross = ticketTotalPrice;
        if (ticketVatAmountStored > 0) {
          ticketVatAmount = ticketVatAmountStored;
        } else if (ticketPriceNet > 0 && ticketTotalPrice > ticketPriceNet) {
          // VAT = gross - net (most accurate when both are available)
          ticketVatAmount = ticketTotalPrice - ticketPriceNet;
        } else {
          // Calculate VAT from gross using rate
          ticketVatAmount = ticketTotalPrice * ivaRate / (100 + ivaRate);
        }
      } else {
        // Only net price available - calculate gross and VAT from net
        // IVA = net * rate / 100, Gross = net + IVA
        ticketVatAmount = ticketPriceNet * ivaRate / 100;
        ticketPriceGross = ticketPriceNet + ticketVatAmount;
      }
      
      if (!sectorData.ticketsByType.has(ticketTypeCode)) {
        sectorData.ticketsByType.set(ticketTypeCode, { quantity: 0, grossAmount: 0, vatAmount: 0 });
      }
      const typeData = sectorData.ticketsByType.get(ticketTypeCode)!;
      typeData.quantity++;
      typeData.grossAmount += ticketPriceGross; // Use gross for CorrispettivoLordo
      typeData.vatAmount += ticketVatAmount;
    }
    
    // Also add sectors with no tickets (capacity only)
    for (const sector of sectors) {
      const sectorCode = sector.sectorCode || 'A0';
      if (!ticketsBySector.has(sectorCode)) {
        ticketsBySector.set(sectorCode, {
          sectorCode,
          capacity: sector.capacity || 0,
          ticketsByType: new Map()
        });
      }
    }
    
    // Generate OrdineDiPosto XML for each sector
    const ordiniDiPostoXml = Array.from(ticketsBySector.entries()).map(([sectorCode, sectorData]) => {
      // Generate TitoliAccesso entries for each ticket type in this sector
      const titoliAccessoXml = Array.from(sectorData.ticketsByType.entries()).map(([tipoTitolo, typeData]) => {
        // Convert amounts to cents (SIAE format uses integer cents)
        const corrispettivoLordoCents = Math.round(typeData.grossAmount * 100);
        // Use actual accumulated VAT from tickets (supports both 10% and 22% rates)
        const ivaCents = Math.round(typeData.vatAmount * 100);
        
        return `                <TitoliAccesso>
                    <TipoTitolo>${tipoTitolo}</TipoTitolo>
                    <Quantita>${typeData.quantity}</Quantita>
                    <CorrispettivoLordo>${corrispettivoLordoCents}</CorrispettivoLordo>
                    <Prevendita>0</Prevendita>
                    <IVACorrispettivo>${ivaCents}</IVACorrispettivo>
                    <IVAPrevendita>0</IVAPrevendita>
                    <ImportoPrestazione>0</ImportoPrestazione>
                </TitoliAccesso>`;
      }).join('\n');
      
      if (sectorData.ticketsByType.size > 0) {
        return `            <OrdineDiPosto>
                <CodiceOrdine>${sectorCode}</CodiceOrdine>
                <Capienza>${sectorData.capacity}</Capienza>
${titoliAccessoXml}
                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>
            </OrdineDiPosto>`;
      } else {
        return `            <OrdineDiPosto>
                <CodiceOrdine>${sectorCode}</CodiceOrdine>
                <Capienza>${sectorData.capacity}</Capienza>
                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>
            </OrdineDiPosto>`;
      }
    }).join('\n');
    
    // Get Titolare data from siaeSystemConfig
    const titolareDenominazione = siaeConfig?.businessName || company?.name || '';
    const titolareCodiceFiscale = siaeConfig?.taxId || company?.fiscalCode || '';
    const sistemaEmissione = siaeConfig?.systemCode || event.emissionSystemCode || '';
    
    // Get Organizzatore data
    const organizzatoreDenominazione = company?.name || '';
    const organizzatoreCodiceFiscale = company?.fiscalCode || company?.taxId || '';
    
    // Get Locale data
    const localeDenominazione = location?.name || event.venueName || '';
    const codiceLocale = location?.siaeLocationCode || event.siaeLocationCode || '';

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<RiepilogoGiornaliero Data="${dataEvento}" DataGenerazione="${dataGenerazione}" OraGenerazione="${oraGenerazione}" ProgressivoGenerazione="${progressivoGenerazione}" Sostituzione="N">
    <Titolare>
        <Denominazione>${escapeXml(titolareDenominazione)}</Denominazione>
        <CodiceFiscale>${titolareCodiceFiscale}</CodiceFiscale>
        <SistemaEmissione>${sistemaEmissione}</SistemaEmissione>
    </Titolare>
    <Organizzatore>
        <Denominazione>${escapeXml(organizzatoreDenominazione)}</Denominazione>
        <CodiceFiscale>${organizzatoreCodiceFiscale}</CodiceFiscale>
        <TipoOrganizzatore valore="G"/>
        <Evento>
            <Intrattenimento>
                <TipoTassazione valore="${tipoTassazione}"/>
            </Intrattenimento>
            <Locale>
                <Denominazione>${escapeXml(localeDenominazione)}</Denominazione>
                <CodiceLocale>${codiceLocale}</CodiceLocale>
            </Locale>
            <DataEvento>${dataEvento}</DataEvento>
            <OraEvento>${oraEvento}</OraEvento>
            <MultiGenere>
                <TipoGenere>${tipoGenere}</TipoGenere>
                <IncidenzaGenere>0</IncidenzaGenere>
                <TitoliOpere>
                    <Titolo>${escapeXml(event.name || quadroA.denominazioneEvento)}</Titolo>
                </TitoliOpere>
            </MultiGenere>
${ordiniDiPostoXml}
        </Evento>
    </Organizzatore>
</RiepilogoGiornaliero>`;

    // Check if digital signature is requested via smart card
    const { signWithSmartCard } = req.body;
    let finalXmlContent = xmlContent;
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
        finalXmlContent = signature.signedXml;
        signatureData = {
          signatureValue: signature.signatureValue,
          certificateData: signature.certificateData,
          signedAt: signature.signedAt
        };
        console.log('[C1 Send] XML signed successfully at', signature.signedAt);
        
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
    const transmission = await siaeStorage.createSiaeTransmission({
      companyId: event.companyId,
      ticketedEventId: id, // Collegamento all'evento SIAE
      transmissionType: isMonthly ? 'monthly' : 'daily',
      periodDate: eventDate,
      fileName: fileName,
      fileContent: finalXmlContent, // Use signed XML if signature was requested
      status: 'pending',
      ticketsCount: reportData.activeTicketsCount,
      ticketsCancelled: reportData.cancelledTicketsCount,
      totalAmount: reportData.totalRevenue.toFixed(2),
    });

    // Optionally send email
    if (toEmail) {
      const { sendSiaeTransmissionEmail } = await import('./email-service');
      
      await sendSiaeTransmissionEmail({
        to: toEmail,
        companyName: company?.name || 'N/A',
        transmissionType: isMonthly ? 'monthly' : 'daily',
        periodDate: eventDate,
        ticketsCount: reportData.activeTicketsCount,
        totalAmount: reportData.totalRevenue.toFixed(2),
        xmlContent: finalXmlContent, // Use signed XML if signature was requested
        transmissionId: transmission.id,
      });

      await siaeStorage.updateSiaeTransmission(transmission.id, {
        status: 'sent',
        sentAt: new Date(),
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
    const location = event.locationId ? await storage.getLocation(event.locationId) : null;
    
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
      
      // Update ticket with fiscal seal if available
      if (fiscalSealData?.sealCode && result.ticket) {
        await siaeStorage.updateSiaeTicket(result.ticket.id, {
          fiscalSealCode: fiscalSealData.sealCode
        });
        // Update result.ticket for response
        result.ticket.fiscalSealCode = fiscalSealData.sealCode;
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
      sectorCode: sector.sectorCode || '',
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
    
    // Update ticket with fiscal seal if available
    if (fiscalSealCode && result.ticket) {
      await siaeStorage.updateSiaeTicket(result.ticket.id, {
        fiscalSealCode
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
    
    const activeTickets = tickets.filter(t => t.status !== 'cancelled');
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
        totalTicketsCancelled: tickets.filter(t => t.status === 'cancelled').length,
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
