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
  getCachedEfffData,
  type FiscalSealData 
} from "./bridge-relay";
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
  guestListEntries,
  guestLists,
  tableBookings,
  eventTables,
  venueFloorPlans,
  floorPlanZones,
  eventZoneMappings,
} from "@shared/schema";
import { eq, and, gt, lt, desc, sql, gte, lte, or, isNull } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { generateTicketHtml } from "./template-routes";
import { generateTicketPdf, generateWalletImage, generateDigitalTicketPdf } from "./pdf-service";
import { sendTicketEmail, sendPasswordResetEmail } from "./email-service";
import { ticketTemplates, ticketTemplateElements } from "@shared/schema";
import { sendOTP as sendMSG91OTP, verifyOTP as verifyMSG91OTP, resendOTP as resendMSG91OTP, isMSG91Configured } from "./msg91-service";
import { siaeStorage } from "./siae-storage";
import { siaeNameChanges, siaeResales, siaeWalletTransactions, eventReservationSettings, eventLists, listEntries, tableTypes, tableReservations, reservationPayments, prProfiles, siaeSubscriptionTypes, siaeSubscriptions } from "@shared/schema";
import svgCaptcha from "svg-captcha";
import QRCode from "qrcode";

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

// ==================== EVENTI PUBBLICI ====================

// Lista eventi disponibili per acquisto
router.get("/api/public/events", async (req, res) => {
  try {
    const { city, dateFrom, dateTo, limit = 20, offset = 0 } = req.query;
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
      })
      .from(siaeTicketedEvents)
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(
        and(
          eq(siaeTicketedEvents.ticketingStatus, "active"),
          eq(events.isPublic, true), // Only show events marked as public
          or(eq(events.status, "scheduled"), eq(events.status, "ongoing")), // Include both scheduled and ongoing events
          gt(events.endDatetime, now), // Event hasn't ended yet
          or(isNull(siaeTicketedEvents.saleStartDate), lte(siaeTicketedEvents.saleStartDate, now)),
          or(isNull(siaeTicketedEvents.saleEndDate), gte(siaeTicketedEvents.saleEndDate, now))
        )
      )
      .orderBy(events.startDatetime)
      .limit(Number(limit))
      .offset(Number(offset));

    // Aggiungi info disponibilità
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

        return {
          ...event,
          minPrice,
          totalAvailable,
          sectorsCount: sectors.length,
        };
      })
    );

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
});

// Registrazione cliente
router.post("/api/public/customers/register", async (req, res) => {
  try {
    const data = customerRegisterSchema.parse(req.body);
    
    // Normalizza email (minuscole e trim)
    const normalizedEmail = data.email.toLowerCase().trim();

    // Controlla se email o telefono già esistono
    const [existing] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.email, normalizedEmail));

    if (existing) {
      return res.status(400).json({ message: "Email già registrata" });
    }

    const [existingPhone] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.phone, data.phone));

    if (existingPhone) {
      return res.status(400).json({ message: "Telefono già registrato" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Crea cliente
    const [customer] = await db
      .insert(siaeCustomers)
      .values({
        uniqueCode: generateCustomerCode(),
        email: normalizedEmail,
        phone: data.phone.startsWith("+") ? data.phone : `+39${data.phone}`,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        authenticationType: "OTP",
        registrationIp: req.ip,
        phoneVerified: false,
        emailVerified: false,
        registrationCompleted: false,
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

// Profilo cliente autenticato
router.get("/api/public/customers/me", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    res.json({
      id: customer.id,
      userId: customer.userId || null,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      phoneVerified: customer.phoneVerified || false,
      _isUserWithoutSiaeProfile: customer._isUserWithoutSiaeProfile || false,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Profile error:", error);
    res.status(500).json({ message: "Errore nel caricamento profilo" });
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
      const uniqueCode = `CL${Date.now().toString(36).toUpperCase()}`;
      const [newCustomer] = await db
        .insert(siaeCustomers)
        .values({
          uniqueCode,
          userId: customer.userId,
          email: customer.email,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phone: customer.phone || null,
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

    // Carica carrello
    const items = await db
      .select()
      .from(publicCartItems)
      .where(eq(publicCartItems.sessionId, sessionId));

    if (items.length === 0) {
      return res.status(400).json({ message: "Carrello vuoto" });
    }

    // Calcola totale
    const total = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
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
      },
    });

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
        cartSnapshot: items,
        customerIp: req.ip,
        customerUserAgent: req.headers["user-agent"],
        expiresAt,
      })
      .returning();

    res.json({
      clientSecret: paymentIntent.client_secret,
      checkoutSessionId: checkoutSession.id,
      total,
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
              fiscalSealId: sealData.sealId || null,
              fiscalSealCode: sealData.sealCode,
              fiscalSealCounter: sealData.counter,
              cardCode: subCard?.serialNumber || sealData.serialNumber || null,
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
            // IMPORTANTE: Usare systemId dalla smart card (EFFF data), non un placeholder
            const cachedEfff = getCachedEfffData();
            const systemCode = cachedEfff?.systemId || process.env.SIAE_SYSTEM_CODE || 'EVENT4U1';
            console.log(`[PUBLIC] Card not found, creating new card for serialNumber: ${sealData.serialNumber}, systemCode: ${systemCode}`);
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
    const { city, limit = 20, offset = 0 } = req.query;
    const now = new Date();

    // Query base per locali pubblici
    let query = db
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
      .where(eq(locations.isPublic, true))
      .limit(Number(limit))
      .offset(Number(offset));

    const venuesList = await query;

    // Per ogni locale, ottieni i prossimi eventi
    const venuesWithEvents = await Promise.all(
      venuesList.map(async (venue) => {
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

    // Separa biglietti futuri/passati/annullati
    const now = new Date();
    const cancelled = tickets.filter(t => t.status === 'cancelled');
    const activeTickets = tickets.filter(t => t.status !== 'cancelled');
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

// Ottieni liste ospiti per il cliente autenticato
router.get("/api/public/account/guest-entries", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer || !customer.id) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const entries = await db
      .select({
        id: guestListEntries.id,
        firstName: guestListEntries.firstName,
        lastName: guestListEntries.lastName,
        plusOnes: guestListEntries.plusOnes,
        qrCode: guestListEntries.qrCode,
        qrScannedAt: guestListEntries.qrScannedAt,
        status: guestListEntries.status,
        arrivedAt: guestListEntries.arrivedAt,
        createdAt: guestListEntries.createdAt,
        listName: guestLists.name,
        listType: guestLists.listType,
        eventId: events.id,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        locationName: locations.name,
        locationAddress: locations.address,
      })
      .from(guestListEntries)
      .innerJoin(guestLists, eq(guestListEntries.guestListId, guestLists.id))
      .innerJoin(events, eq(guestListEntries.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(eq(guestListEntries.customerId, customer.id))
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

// Ottieni prenotazioni tavoli per il cliente autenticato
router.get("/api/public/account/table-reservations", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer || !customer.id) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const reservations = await db
      .select({
        id: tableBookings.id,
        customerName: tableBookings.customerName,
        guestsCount: tableBookings.guestsCount,
        qrCode: tableBookings.qrCode,
        qrScannedAt: tableBookings.qrScannedAt,
        status: tableBookings.status,
        arrivedAt: tableBookings.arrivedAt,
        confirmedAt: tableBookings.confirmedAt,
        depositAmount: tableBookings.depositAmount,
        depositPaid: tableBookings.depositPaid,
        createdAt: tableBookings.createdAt,
        tableName: eventTables.name,
        tableType: eventTables.tableType,
        tableCapacity: eventTables.capacity,
        minSpend: eventTables.minSpend,
        eventId: events.id,
        eventName: events.name,
        eventStart: events.startDatetime,
        eventEnd: events.endDatetime,
        locationName: locations.name,
        locationAddress: locations.address,
      })
      .from(tableBookings)
      .innerJoin(eventTables, eq(tableBookings.tableId, eventTables.id))
      .innerJoin(events, eq(tableBookings.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .where(eq(tableBookings.customerId, customer.id))
      .orderBy(desc(events.startDatetime));

    const now = new Date();
    const upcoming = reservations.filter(r => new Date(r.eventStart) >= now && r.status !== 'cancelled');
    const past = reservations.filter(r => new Date(r.eventStart) < now || r.status === 'cancelled');

    res.json({
      upcoming,
      past,
      total: reservations.length,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Get table reservations error:", error);
    res.status(500).json({ message: "Errore nel caricamento prenotazioni tavoli" });
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

    const canNameChange = ticket.allowsChangeName && 
                          (ticket.status === 'emitted' || ticket.status === 'active') && 
                          hoursToEvent >= 24;
    
    // Rivendita consentita fino a 2 ore prima dell'evento (non ci sono limiti normativi specifici)
    const canResale = ticket.allowsResale && 
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

    const emissionDateTime = ticket.emissionDate 
      ? new Date(ticket.emissionDate).toISOString() 
      : null;

    res.json({
      ...ticket,
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
    });

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
        participantFirstName: siaeTickets.participantFirstName,
        participantLastName: siaeTickets.participantLastName,
        allowsChangeName: siaeTicketedEvents.allowsChangeName,
        nameChangeFee: siaeTicketedEvents.nameChangeFee,
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

    if (ticket.status !== 'emitted' && ticket.status !== 'active') {
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

    console.log("[PUBLIC] Name change request created:", nameChange.id, "fee:", fee, "paymentStatus:", paymentStatus);
    res.json({ 
      message: fee > 0 
        ? "Richiesta creata. Per completare il cambio nominativo è richiesto il pagamento della commissione."
        : "Richiesta cambio nominativo inviata",
      nameChangeId: nameChange.id,
      fee: fee.toFixed(2),
      paymentStatus,
      requiresPayment: fee > 0,
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
    res.json({
      success: true,
      message: "Pagamento confermato. La tua richiesta è ora in attesa di approvazione.",
      nameChange: updated,
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
    const originalPrice = parseFloat(ticket.ticketPrice || '0');
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
    const [resale] = await db
      .insert(siaeResales)
      .values({
        originalTicketId: ticketId,
        sellerId: customer.id,
        originalPrice: ticket.ticketPrice || '0',
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
    const { buyerDocumentoTipo, buyerDocumentoNumero } = req.body;
    
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
    
    // Reserve for 10 minutes
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000);
    
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
      success_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/account/resale-success?resale_id=${id}`,
      cancel_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/account/tickets`,
      metadata: {
        resaleId: id,
        buyerId: customer.id,
        sellerId: resale.resale.sellerId,
        sellerPayout: sellerPayout.toFixed(2),
        platformFee: platformFee.toFixed(2),
        type: 'resale_purchase',
      },
      expires_at: Math.floor(reservedUntil.getTime() / 1000),
    });
    
    // Save checkout session ID
    await db
      .update(siaeResales)
      .set({
        stripeCheckoutSessionId: session.id,
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

// Confirm resale purchase (called after Stripe payment success)
router.post("/api/public/resales/:id/confirm", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    const { id } = req.params;
    
    // Get resale
    const [resale] = await db
      .select()
      .from(siaeResales)
      .where(and(
        eq(siaeResales.id, id),
        eq(siaeResales.buyerId, customer.id)
      ));
    
    if (!resale) {
      return res.status(404).json({ message: "Rivendita non trovata" });
    }
    
    if (resale.status !== 'reserved') {
      return res.status(400).json({ message: "Stato rivendita non valido" });
    }
    
    // Verify Stripe payment
    if (!resale.stripeCheckoutSessionId) {
      return res.status(400).json({ message: "Sessione pagamento non trovata" });
    }
    
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' });
    
    const session = await stripeClient.checkout.sessions.retrieve(resale.stripeCheckoutSessionId);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: "Pagamento non completato" });
    }
    
    // === FULFILLMENT FLOW (SIAE-COMPLIANT) ===
    console.log(`[RESALE] Starting fulfillment for ${id}`);
    
    // 1. Mark as paid
    await db
      .update(siaeResales)
      .set({
        status: 'paid',
        paidAt: new Date(),
        soldAt: new Date(),
        stripePaymentIntentId: session.payment_intent as string,
        acquirenteVerificato: true,
        acquirenteVerificaData: new Date(),
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
    
    // 3. Annul original ticket (SIAE requirement)
    await db
      .update(siaeTickets)
      .set({
        status: 'annullato_rivendita',
        annullamentoMotivo: `Rivendita completata - ID: ${id}`,
        annullamentoData: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(siaeTickets.id, resale.originalTicketId));
    
    // 4. Generate new fiscal seal for new ticket
    const now = new Date();
    const newSigillo = `R${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // 5. Create new ticket for buyer
    const newTicketCode = `RT${now.getTime().toString(36).toUpperCase()}`;
    const newQrCode = `${newTicketCode}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    const [newTicket] = await db
      .insert(siaeTickets)
      .values({
        ticketedEventId: originalTicket.ticketedEventId,
        transactionId: originalTicket.transactionId,
        sectorId: originalTicket.sectorId,
        ticketCode: newTicketCode,
        qrCode: newQrCode,
        ticketType: originalTicket.ticketType,
        ticketTypeCode: originalTicket.ticketTypeCode,
        ticketPrice: resale.resalePrice,
        ticketCategory: originalTicket.ticketCategory,
        seatNumber: originalTicket.seatNumber,
        seatRow: originalTicket.seatRow,
        sigilloFiscale: newSigillo,
        customerId: customer.id,
        participantFirstName: customer.firstName,
        participantLastName: customer.lastName,
        participantEmail: customer.email,
        participantPhone: customer.phone,
        participantFiscalCode: customer.fiscalCode,
        emissionDate: now,
        status: 'emesso',
        emissionChannel: 'resale',
      })
      .returning();
    
    // 6. Update resale with new ticket and sigillo
    await db
      .update(siaeResales)
      .set({
        status: 'fulfilled',
        newTicketId: newTicket.id,
        sigilloFiscaleRivendita: newSigillo,
        originalTicketAnnulledAt: new Date(),
        fulfilledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(siaeResales.id, id));
    
    // 7. Credit seller wallet (use stored payout, or recompute if missing)
    let sellerPayout = parseFloat(resale.sellerPayout || '0');
    if (sellerPayout <= 0) {
      // Fallback: recompute from resale price with 5% platform fee
      const resalePrice = parseFloat(resale.resalePrice);
      const platformFee = Math.round(resalePrice * 5) / 100;
      sellerPayout = resalePrice - platformFee;
      console.log(`[RESALE] Recomputed payout: €${sellerPayout} (stored was null/zero)`);
    }
    if (sellerPayout > 0) {
      const [walletTx] = await db
        .insert(siaeWalletTransactions)
        .values({
          customerId: resale.sellerId,
          type: 'resale_credit',
          amount: sellerPayout.toFixed(2),
          description: `Accredito rivendita biglietto ${originalTicket.ticketCode}`,
          resaleId: id,
          stripePaymentIntentId: session.payment_intent as string,
          status: 'completed',
        })
        .returning();
      
      // Update resale with payout transaction
      await db
        .update(siaeResales)
        .set({ payoutTransactionId: walletTx.id })
        .where(eq(siaeResales.id, id));
      
      console.log(`[RESALE] Credited seller ${resale.sellerId} with €${sellerPayout}`);
    }
    
    console.log(`[RESALE] Fulfilled ${id}: old ticket ${originalTicket.id} → new ticket ${newTicket.id}`);
    
    res.json({
      success: true,
      message: "Acquisto completato!",
      newTicketId: newTicket.id,
      newTicketCode: newTicket.ticketCode,
    });
  } catch (error: any) {
    console.error("[PUBLIC] Confirm resale error:", error);
    res.status(500).json({ message: "Errore nella conferma acquisto" });
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
        if (prProfile.commissionType === 'percentage') {
          prCommissionAmount = ((amountNum * parseFloat(prProfile.commissionValue || '0')) / 100).toFixed(2);
        } else {
          prCommissionAmount = prProfile.commissionValue || '0';
        }
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

export default router;
