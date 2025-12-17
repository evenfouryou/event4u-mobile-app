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
  isBridgeConnected,
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
  publicCartItems,
  publicCheckoutSessions,
  publicCustomerSessions,
  events,
  locations,
  insertPublicCartItemSchema,
} from "@shared/schema";
import { eq, and, gt, lt, desc, sql, gte, lte, or, isNull } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { generateTicketHtml } from "./template-routes";
import { generateTicketPdf } from "./pdf-service";
import { sendTicketEmail, sendPasswordResetEmail } from "./email-service";
import { ticketTemplates, ticketTemplateElements } from "@shared/schema";

const router = Router();

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
    // Utente loggato tramite sessione Passport
    // Cerca il profilo cliente SIAE collegato all'utente
    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.userId, req.user.id));
    
    if (customer) {
      return customer;
    }
    
    // Se non esiste un profilo SIAE, restituisci i dati base dell'utente
    // per permettere la creazione on-demand durante il checkout
    return {
      id: null,
      userId: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      phone: req.user.phone || null,
      phoneVerified: false,
      isActive: true,
      _isUserWithoutSiaeProfile: true,
    };
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
          gt(events.startDatetime, now),
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
          eq(events.status, "scheduled"),
          gt(events.startDatetime, now),
          eq(locations.isPublic, true) // Only public locations
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

    // Controlla se email o telefono già esistono
    const [existing] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.email, data.email));

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
        email: data.email,
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
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minuti

    await db.insert(siaeOtpAttempts).values({
      customerId: customer.id,
      phone: customer.phone,
      otpCode: otp,
      purpose: "registration",
      expiresAt,
      ipAddress: req.ip,
    });

    // TODO: Invia OTP via SMS (per ora log)
    console.log(`[OTP] Codice per ${customer.phone}: ${otp}`);

    res.json({
      customerId: customer.id,
      message: "Registrazione avviata. Inserisci il codice OTP ricevuto via SMS.",
    });
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

    // Trova OTP valido
    const [otpAttempt] = await db
      .select()
      .from(siaeOtpAttempts)
      .where(
        and(
          eq(siaeOtpAttempts.customerId, customerId),
          eq(siaeOtpAttempts.otpCode, otpCode),
          eq(siaeOtpAttempts.status, "pending"),
          gt(siaeOtpAttempts.expiresAt, new Date())
        )
      );

    if (!otpAttempt) {
      return res.status(400).json({ message: "Codice OTP non valido o scaduto" });
    }

    // Aggiorna OTP come verificato
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

    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.id, customerId));

    res.json({
      token: sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  } catch (error: any) {
    console.error("[PUBLIC] OTP verification error:", error);
    res.status(500).json({ message: "Errore durante la verifica" });
  }
});

// Login cliente
router.post("/api/public/customers/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email e password richieste" });
    }

    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.email, email));

    if (!customer || !customer.passwordHash) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    const validPassword = await bcrypt.compare(password, customer.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }

    if (!customer.registrationCompleted) {
      return res.status(403).json({ message: "Completa la registrazione con OTP" });
    }

    // Crea sessione
    const sessionToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(publicCustomerSessions).values({
      customerId: customer.id,
      sessionToken,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      token: sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  } catch (error: any) {
    console.error("[PUBLIC] Login error:", error);
    res.status(500).json({ message: "Errore durante il login" });
  }
});

// Richiedi reset password cliente
router.post("/api/public/customers/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email richiesta" });
    }

    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.email, email.toLowerCase().trim()));

    const successMessage = "Se l'email è registrata, riceverai un link per reimpostare la password.";

    if (!customer) {
      return res.json({ message: successMessage });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000);

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

    await sendPasswordResetEmail({
      to: customer.email,
      firstName: customer.firstName,
      resetLink,
    });

    console.log("[PUBLIC] Password reset email sent to:", customer.email);
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
        sectorId: publicCartItems.sectorId,
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
        locationName: locations.name,
      })
      .from(publicCartItems)
      .innerJoin(siaeTicketedEvents, eq(publicCartItems.ticketedEventId, siaeTicketedEvents.id))
      .innerJoin(events, eq(siaeTicketedEvents.eventId, events.id))
      .innerJoin(locations, eq(events.locationId, locations.id))
      .innerJoin(siaeEventSectors, eq(publicCartItems.sectorId, siaeEventSectors.id))
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
      quantity = 1,
      ticketType = "intero",
      participantFirstName,
      participantLastName,
    } = req.body;

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

// Crea payment intent per checkout personalizzato
router.post("/api/public/checkout/create-payment-intent", async (req, res) => {
  try {
    const sessionId = getOrCreateSessionId(req, res);
    let customer = await getAuthenticatedCustomer(req);

    if (!customer) {
      return res.status(401).json({ message: "Devi essere autenticato per procedere al pagamento" });
    }

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

    // CRITICAL: Verifica che la smart card SIAE sia disponibile PRIMA di tutto
    // Senza sigillo fiscale, non possiamo emettere biglietti
    if (!isBridgeConnected()) {
      console.log("[PUBLIC] Checkout failed: Desktop bridge not connected");
      return res.status(503).json({ 
        message: "Sistema sigilli fiscali non disponibile. L'app desktop Event4U deve essere connessa con la smart card SIAE inserita. Riprova tra qualche minuto.",
        code: "SEAL_BRIDGE_OFFLINE"
      });
    }

    const cardReadiness = isCardReadyForSeals();
    if (!cardReadiness.ready) {
      console.log(`[PUBLIC] Checkout failed: Card not ready - ${cardReadiness.error}`);
      return res.status(503).json({ 
        message: `Smart card SIAE non pronta: ${cardReadiness.error}. Riprova tra qualche minuto.`,
        code: "SEAL_CARD_NOT_READY"
      });
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

    // Verifica payment intent con Stripe
    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Pagamento non completato" });
    }

    // Genera transazione SIAE
    const cartItems = checkoutSession.cartSnapshot as any[];
    const firstItem = cartItems[0];

    // Ottieni evento per la transazione
    const [ticketedEvent] = await db
      .select()
      .from(siaeTicketedEvents)
      .where(eq(siaeTicketedEvents.id, firstItem.ticketedEventId));

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

    // Genera biglietti
    const tickets: any[] = [];

    for (const item of cartItems) {
      const [sector] = await db
        .select()
        .from(siaeEventSectors)
        .where(eq(siaeEventSectors.id, item.sectorId));

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
          // Se fallisce la generazione sigillo, NON possiamo creare il biglietto
          // Aggiorna checkout session come in attesa
          await db
            .update(publicCheckoutSessions)
            .set({
              status: "waiting_for_seal",
            })
            .where(eq(publicCheckoutSessions.id, checkoutSessionId));
          
          return res.status(503).json({
            message: `Impossibile generare sigillo fiscale: ${sealError.message.replace(/^[A-Z_]+:\s*/, '')}`,
            code: sealError.message.split(':')[0] || 'SEAL_ERROR',
            ticketsCreated: tickets.length,
            ticketsRemaining: cartItems.reduce((sum: number, it: any) => sum + it.quantity, 0) - tickets.length
          });
        }

        const now = new Date();
        const emissionDateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const emissionTimeStr = now.toTimeString().slice(0, 5).replace(":", "");

        // Salva sigillo fiscale reale nel database
        const [fiscalSeal] = await db
          .insert(siaeFiscalSeals)
          .values({
            cardId: card?.id || "",
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
        const [ticket] = await db
          .insert(siaeTickets)
          .values({
            ticketedEventId: ticketedEvent.id,
            sectorId: item.sectorId,
            transactionId: transaction.id,
            customerId: customer.id,
            fiscalSealId: fiscalSeal.id,
            fiscalSealCode: sealData.sealCode,
            progressiveNumber: sealData.counter,
            cardCode: sealData.serialNumber,
            emissionChannelCode: emissionChannel?.channelCode || "WEB",
            emissionDateStr,
            emissionTimeStr,
            ticketTypeCode: item.ticketType === "intero" ? "INT" : "RID",
            sectorCode: sector.sectorCode,
            seatId: item.seatId,
            grossAmount: item.unitPrice,
            participantFirstName: item.participantFirstName || customer.firstName,
            participantLastName: item.participantLastName || customer.lastName,
            status: "valid",
            qrCode: qrData,
          })
          .returning();

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
        const [defaultTemplate] = await db
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

        if (!defaultTemplate) {
          console.log('[PUBLIC] No default ticket template found for company:', ticketedEvent.companyId);
          return;
        }

        // Get template elements
        const elements = await db
          .select()
          .from(ticketTemplateElements)
          .where(eq(ticketTemplateElements.templateId, defaultTemplate.id))
          .orderBy(ticketTemplateElements.zIndex);

        // Parse elements for HTML generation
        const parsedElements = elements.map((el) => {
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
    res.status(500).json({ message: "Errore nella conferma del pagamento" });
  }
});

// Ottieni biglietti cliente
router.get("/api/public/tickets", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
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
      .where(eq(siaeTickets.customerId, customer.id))
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

export default router;
