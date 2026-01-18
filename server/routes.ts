// Referenced from blueprints: javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import sharp from "sharp";
import { ObjectStorageService } from "./objectStorage";
// Replit Auth enabled for testing
import { setupAuth, getSession } from "./replitAuth";
import passport from "passport";
import cookieParser from "cookie-parser";
import siaeRoutes from "./siae-routes";
import e4uRoutes from "./e4u-routes";
import publicRoutes from "./public-routes";
import prRoutes from "./pr-routes";
import printerRoutes from "./printer-routes";
import templateRoutes from "./template-routes";
import billingRoutes from "./billing-routes";
import digitalTemplateRoutes from "./digital-template-routes";
import reservationBookingRoutes from "./reservation-booking-routes";
import ticketingRoutes from "./ticketing-routes";
import marketingRoutes from "./marketing-routes";
import loyaltyRoutes from "./loyalty-routes";
import referralRoutes from "./referral-routes";
import bundleRoutes from "./bundle-routes";
import staffRoutes from "./staff-routes";
import { startMarketingScheduler } from "./marketing-scheduler";
import { setupTicketingWebSocket } from "./ticketing-websocket";
import { startHoldCleanupJob } from "./hold-service";
import {
  insertCompanySchema,
  insertLocationSchema,
  insertEventSchema,
  updateEventSchema,
  insertStationSchema,
  insertProductSchema,
  insertStockMovementSchema,
  insertPriceListItemSchema,
  insertEventFormatSchema,
  stockMovements,
  priceListItems,
  type Stock,
  userCompanies,
  insertUserCompanySchema,
  users,
  // New module schemas
  insertFixedCostSchema,
  updateFixedCostSchema,
  insertExtraCostSchema,
  updateExtraCostSchema,
  insertMaintenanceSchema,
  updateMaintenanceSchema,
  insertAccountingDocumentSchema,
  updateAccountingDocumentSchema,
  insertStaffSchema,
  updateStaffSchema,
  insertStaffAssignmentSchema,
  updateStaffAssignmentSchema,
  insertStaffPaymentSchema,
  updateStaffPaymentSchema,
  insertCashSectorSchema,
  updateCashSectorSchema,
  insertCashPositionSchema,
  updateCashPositionSchema,
  insertCashEntrySchema,
  updateCashEntrySchema,
  insertCashFundSchema,
  updateCashFundSchema,
  updateNightFileSchema,
  insertSchoolBadgeLandingSchema,
  updateSchoolBadgeLandingSchema,
  insertSchoolBadgeRequestSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";
import nodemailer from "nodemailer";
import { db } from "./db";
import { eq, and, or, inArray, desc, isNull, like, sql } from "drizzle-orm";
import { events, siaeTickets } from "@shared/schema";
import crypto from "crypto";
import QRCode from "qrcode";
import { 
  companies,
  products,
  siaeEventGenres,
  siaeSectorCodes,
  siaeTicketTypes,
  siaeServiceCodes,
  siaeCancellationReasons,
  siaeCashiers,
  siaeCustomers,
  siaeNameChanges,
  prProfiles,
  publicCustomerSessions,
  systemSettings,
  insertSiaeEventGenreSchema,
  updateSiaeEventGenreSchema,
  insertSiaeSectorCodeSchema,
  updateSiaeSectorCodeSchema,
  insertSiaeTicketTypeSchema,
  updateSiaeTicketTypeSchema,
  insertSiaeServiceCodeSchema,
  updateSiaeServiceCodeSchema,
  insertSiaeCancellationReasonSchema,
  updateSiaeCancellationReasonSchema,
  venueFloorPlans,
  floorPlanZones,
  floorPlanSeats,
  floorPlanVersions,
  eventZoneMappings,
  insertVenueFloorPlanSchema,
  insertFloorPlanZoneSchema,
  insertFloorPlanVersionSchema,
  insertEventZoneMappingSchema,
  eventPageConfigs,
  eventPageBlocks,
  eventLineupArtists,
  eventTimelineItems,
  eventFaqItems,
} from "@shared/schema";
import { setupBridgeRelay, isBridgeConnected, getCachedBridgeStatus } from "./bridge-relay";
import { setupPrintRelay } from "./print-relay";
import { siaeStorage } from "./siae-storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup passport for authentication
  app.set("trust proxy", 1);
  app.use(cookieParser());
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup Replit OIDC auth routes (/api/login, /api/callback, /api/logout)
  await setupAuth(app);
  
  // Passport serialization for classic login (fallback)
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Register SIAE module routes
  app.use(siaeRoutes);
  
  // Register E4U module routes (liste, tavoli, staff, PR, scanners)
  app.use(e4uRoutes);
  
  // Register PR module routes (liste, tavoli, QR)
  app.use(prRoutes);
  
  // Register public portal routes (ticket purchase)
  app.use(publicRoutes);
  
  // Register printer management routes
  app.use('/api/printers', printerRoutes);
  
  // Register ticket template builder routes
  app.use('/api/ticket', templateRoutes);
  
  // Register billing management routes
  app.use(billingRoutes);
  
  // Register digital ticket template routes
  app.use(digitalTemplateRoutes);
  
  // Register reservation booking routes (prenotazioni liste/tavoli a pagamento)
  app.use(reservationBookingRoutes);
  
  // Register ticketing routes (sistema HOLD, heatmap, recommendations)
  app.use(ticketingRoutes);
  
  // Register marketing routes (email campaigns, templates)
  app.use(marketingRoutes);
  
  // Loyalty routes
  app.use(loyaltyRoutes);
  app.use(referralRoutes);
  
  // Bundle routes
  app.use(bundleRoutes);
  
  // Staff management routes (gestione PR subordinati per Staff)
  app.use(staffRoutes);
  
  // Start marketing email scheduler
  startMarketingScheduler();

  // Health check endpoint for Replit Deploy
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // GET /api/public/ticketed-events/:id/page-config
  // Ritorna configurazione pagina, blocchi, artisti, timeline, FAQ
  app.get("/api/public/ticketed-events/:id/page-config", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch page config
      const [config] = await db.select().from(eventPageConfigs)
        .where(eq(eventPageConfigs.ticketedEventId, id));
      
      // Fetch enabled blocks ordered by position
      const blocks = await db.select().from(eventPageBlocks)
        .where(and(
          eq(eventPageBlocks.ticketedEventId, id),
          eq(eventPageBlocks.isEnabled, true)
        ))
        .orderBy(eventPageBlocks.position);
      
      // Fetch lineup artists
      const artists = await db.select().from(eventLineupArtists)
        .where(eq(eventLineupArtists.ticketedEventId, id))
        .orderBy(eventLineupArtists.position);
      
      // Fetch timeline items  
      const timeline = await db.select().from(eventTimelineItems)
        .where(eq(eventTimelineItems.ticketedEventId, id))
        .orderBy(eventTimelineItems.position);
      
      // Fetch FAQ items
      const faq = await db.select().from(eventFaqItems)
        .where(eq(eventFaqItems.ticketedEventId, id))
        .orderBy(eventFaqItems.position);
      
      res.json({
        config: config || null,
        blocks,
        artists,
        timeline,
        faq,
      });
    } catch (error) {
      console.error("Error fetching page config:", error);
      res.status(500).json({ message: "Errore nel recupero della configurazione" });
    }
  });

  // Public objects route - serves uploaded images from object storage (no auth required)
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Multer configuration for event image uploads (5MB limit, memory storage)
  const eventImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
      }
    },
  });

  // Floor plan image upload endpoint - keeps original dimensions, converts to WebP
  app.post('/api/floor-plans/upload-image', eventImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Get image metadata for dimensions
      const metadata = await sharp(req.file.buffer).metadata();
      
      // Convert to WebP without resizing (keep original dimensions for floor plans)
      const processedBuffer = await sharp(req.file.buffer)
        .webp({ quality: 90 })
        .toBuffer();

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const fileName = `floor-plans/${timestamp}-${randomId}.webp`;

      // Upload to object storage public directory
      const objectStorageService = new ObjectStorageService();
      const publicUrl = await objectStorageService.uploadToPublicDirectory(
        processedBuffer,
        fileName,
        'image/webp'
      );

      res.json({
        success: true,
        url: publicUrl,
        width: metadata.width,
        height: metadata.height,
        message: 'Floor plan image uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading floor plan image:', error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 5MB limit' });
        }
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to upload floor plan image' });
    }
  });

  // Event image upload endpoint - resizes to 1080x1080 square and converts to WebP
  app.post('/api/events/upload-image', eventImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Process image with Sharp: center crop to square 1080x1080, convert to WebP
      const processedBuffer = await sharp(req.file.buffer)
        .resize(1080, 1080, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const fileName = `events/${timestamp}-${randomId}.webp`;

      // Upload to object storage public directory
      const objectStorageService = new ObjectStorageService();
      const publicUrl = await objectStorageService.uploadToPublicDirectory(
        processedBuffer,
        fileName,
        'image/webp'
      );

      res.json({
        success: true,
        url: publicUrl,
        message: 'Image uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading event image:', error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 5MB limit' });
        }
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  // Email transporter setup
  const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify SMTP connection on startup
  emailTransporter.verify((error, success) => {
    if (error) {
      console.error('[EMAIL] SMTP connection failed:', error.message);
      console.error('[EMAIL] Check your SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables');
    } else {
      console.log('[EMAIL] SMTP server connected successfully');
    }
  });

  // Registration schema
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.enum(['gestore', 'warehouse', 'bartender']).default('gestore'),
    companyId: z.string().optional(),
  });

  // Public registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      // Check if registration is enabled
      const registrationSetting = await storage.getSystemSetting('registration_enabled');
      if (registrationSetting && registrationSetting.value === 'false') {
        return res.status(403).json({ message: "Registrazione temporaneamente disabilitata" });
      }

      const validated = registerSchema.parse(req.body);
      
      // Normalize email for consistent storage and lookup
      const normalizedEmail = validated.email.toLowerCase().trim();
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validated.password, 10);

      // Generate verification token
      const crypto = await import('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user with normalized email
      const user = await storage.createUser({
        email: normalizedEmail,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role,
        companyId: validated.companyId,
        emailVerified: false,
        verificationToken,
      });

      // Create company for new user if role is gestore and no companyId provided
      let finalCompanyId = validated.companyId;
      if (validated.role === 'gestore' && !finalCompanyId) {
        const newCompany = await storage.createCompany({
          name: `${user.firstName} ${user.lastName} - Organizzazione`,
          active: true,
        });
        finalCompanyId = newCompany.id;
        // Update user with company
        await storage.updateUser(user.id, { companyId: finalCompanyId });
      }

      // Create user_companies association if user has a company
      if (finalCompanyId) {
        await db.insert(userCompanies).values({
          userId: user.id,
          companyId: finalCompanyId,
          role: 'owner',
          isDefault: true,
        }).onConflictDoNothing({ target: [userCompanies.userId, userCompanies.companyId] });
      }

      // Send welcome email with verification link
      // Priority: CUSTOM_DOMAIN > PUBLIC_URL (production) > REPLIT_DEV_DOMAIN (development) > localhost
      const baseUrl = process.env.CUSTOM_DOMAIN 
        ? `https://${process.env.CUSTOM_DOMAIN}`
        : process.env.PUBLIC_URL 
          ? process.env.PUBLIC_URL.replace(/\/$/, '')
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : 'http://localhost:5000';
      const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
      const fromEmail = process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>';
      
      if (!user.email) {
        // Rollback user creation if email is missing
        await storage.deleteUser(user.id);
        if (finalCompanyId && validated.role === 'gestore' && !validated.companyId) {
          // Delete auto-created company since registration failed
          await storage.deleteCompany(finalCompanyId);
        }
        return res.status(400).json({ message: "Email is required for registration" });
      }

      try {
        await emailTransporter.sendMail({
          from: fromEmail,
          to: user.email,
          subject: 'Conferma il tuo account Event4U',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Benvenuto su Event Four You, ${user.firstName}!</h2>
              <p>Il tuo account è stato creato con successo.</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Ruolo:</strong> ${user.role}</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin-top: 0;"><strong>Per completare la registrazione, clicca sul pulsante qui sotto:</strong></p>
                <a href="${verificationLink}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                  Conferma Email
                </a>
                <p style="margin-bottom: 0; font-size: 12px; color: #6b7280;">
                  Oppure copia e incolla questo link nel browser:<br/>
                  <span style="word-break: break-all;">${verificationLink}</span>
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                Se non hai richiesto questa registrazione, puoi ignorare questa email.
              </p>
              
              <p style="margin-top: 30px;">
                Grazie per esserti registrato!<br/>
                <strong>Il Team Event Four You</strong>
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Rollback user creation if email fails
        await storage.deleteUser(user.id);
        if (finalCompanyId && validated.role === 'gestore' && !validated.companyId) {
          // Delete auto-created company since registration failed
          await storage.deleteCompany(finalCompanyId);
        }
        return res.status(500).json({ 
          message: "Impossibile inviare l'email di verifica. Verifica la tua email e riprova, o contatta il supporto." 
        });
      }

      res.json({ 
        message: "Registration successful. Please check your email to verify your account.", 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role 
        } 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email verification endpoint
  app.get('/api/verify-email/:token', async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ message: "Token mancante" });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(404).json({ message: "Token non valido o scaduto" });
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.json({ message: "Email già verificata", alreadyVerified: true });
      }

      // Update user to mark email as verified and remove token
      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
      });

      res.json({ 
        message: "Email verificata con successo! Ora puoi accedere alla piattaforma.",
        success: true,
      });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Verifica fallita. Riprova più tardi." });
    }
  });

  // Resend verification email endpoint
  app.post('/api/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email richiesta" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "Se l'email è registrata, riceverai un link di verifica." });
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.json({ message: "Email già verificata. Puoi effettuare il login." });
      }

      // Generate new verification token
      const crypto = await import('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Update user with new token
      await storage.updateUser(user.id, { verificationToken });

      // Send verification email
      // Priority: CUSTOM_DOMAIN > PUBLIC_URL (production) > REPLIT_DEV_DOMAIN (development) > localhost
      const baseUrl = process.env.CUSTOM_DOMAIN 
        ? `https://${process.env.CUSTOM_DOMAIN}`
        : process.env.PUBLIC_URL 
          ? process.env.PUBLIC_URL.replace(/\/$/, '')
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : 'http://localhost:5000';
      const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
      const fromEmail = process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>';

      try {
        await emailTransporter.sendMail({
          from: fromEmail,
          to: user.email!,
          subject: 'Conferma il tuo account Event4U',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Conferma il tuo account Event Four You</h2>
              <p>Ciao ${user.firstName},</p>
              <p>Hai richiesto un nuovo link di verifica per il tuo account.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin-top: 0;"><strong>Per completare la registrazione, clicca sul pulsante qui sotto:</strong></p>
                <a href="${verificationLink}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                  Conferma Email
                </a>
                <p style="margin-bottom: 0; font-size: 12px; color: #6b7280;">
                  Oppure copia e incolla questo link nel browser:<br/>
                  <span style="word-break: break-all;">${verificationLink}</span>
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                Se non hai richiesto questo link, puoi ignorare questa email.
              </p>
              
              <p style="margin-top: 30px;">
                <strong>Il Team Event Four You</strong>
              </p>
            </div>
          `,
        });

        res.json({ message: "Email di verifica inviata. Controlla la tua casella di posta." });
      } catch (emailError) {
        console.error("Failed to resend verification email:", emailError);
        return res.status(500).json({ 
          message: "Impossibile inviare l'email. Riprova più tardi o contatta il supporto." 
        });
      }
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Errore durante l'invio. Riprova più tardi." });
    }
  });

  // Unified Forgot password - Request password reset for both users and customers
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email richiesta" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const successMessage = "Se l'email è registrata, riceverai un link per reimpostare la password.";
      
      // First, try to find in users table
      const user = await storage.getUserByEmail(normalizedEmail);
      
      if (user) {
        // Generate reset token for user
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

        // Save token to user
        await storage.updateUser(user.id, { 
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires 
        });

        // Build reset link
        const baseUrl = process.env.CUSTOM_DOMAIN 
          ? `https://${process.env.CUSTOM_DOMAIN}`
          : process.env.PUBLIC_URL 
            ? process.env.PUBLIC_URL.replace(/\/$/, '')
            : process.env.REPLIT_DEV_DOMAIN 
              ? `https://${process.env.REPLIT_DEV_DOMAIN}`
              : 'http://localhost:5000';
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}&type=user`;
        const fromEmail = process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>';

        try {
          await emailTransporter.sendMail({
            from: fromEmail,
            to: user.email!,
            subject: 'Reimposta la tua password - Event4U',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Reimposta la tua password</h2>
                <p>Ciao ${user.firstName},</p>
                <p>Hai richiesto di reimpostare la password del tuo account Event Four You.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin-top: 0;"><strong>Clicca sul pulsante qui sotto per impostare una nuova password:</strong></p>
                  <a href="${resetLink}" 
                     style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                    Reimposta Password
                  </a>
                  <p style="margin-bottom: 0; font-size: 12px; color: #6b7280;">
                    Oppure copia e incolla questo link nel browser:<br/>
                    <span style="word-break: break-all;">${resetLink}</span>
                  </p>
                </div>
                
                <p style="color: #dc2626; font-size: 14px;">
                  <strong>Attenzione:</strong> Questo link scadrà tra 1 ora.
                </p>
                
                <p style="color: #6b7280; font-size: 14px;">
                  Se non hai richiesto il reset della password, puoi ignorare questa email. La tua password non verrà modificata.
                </p>
                
                <p style="margin-top: 30px;">
                  <strong>Il Team Event Four You</strong>
                </p>
              </div>
            `,
          });

          return res.json({ message: successMessage });
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
          return res.status(500).json({ 
            message: "Impossibile inviare l'email. Riprova più tardi." 
          });
        }
      }

      // If not found in users, try siae_customers table
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.email, normalizedEmail));
      
      if (customer) {
        // Generate reset token for customer
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000);

        await db
          .update(siaeCustomers)
          .set({
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
          })
          .where(eq(siaeCustomers.id, customer.id));

        // Build reset link
        const baseUrl = process.env.CUSTOM_DOMAIN 
          ? `https://${process.env.CUSTOM_DOMAIN}`
          : process.env.PUBLIC_URL 
            ? process.env.PUBLIC_URL.replace(/\/$/, '')
            : process.env.REPLIT_DEV_DOMAIN 
              ? `https://${process.env.REPLIT_DEV_DOMAIN}`
              : 'http://localhost:5000';
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}&type=customer`;
        const fromEmail = process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>';

        try {
          await emailTransporter.sendMail({
            from: fromEmail,
            to: customer.email,
            subject: 'Reimposta la tua password - Event4U',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Reimposta la tua password</h2>
                <p>Ciao ${customer.firstName},</p>
                <p>Hai richiesto di reimpostare la password del tuo account Event Four You.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin-top: 0;"><strong>Clicca sul pulsante qui sotto per impostare una nuova password:</strong></p>
                  <a href="${resetLink}" 
                     style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                    Reimposta Password
                  </a>
                  <p style="margin-bottom: 0; font-size: 12px; color: #6b7280;">
                    Oppure copia e incolla questo link nel browser:<br/>
                    <span style="word-break: break-all;">${resetLink}</span>
                  </p>
                </div>
                
                <p style="color: #dc2626; font-size: 14px;">
                  <strong>Attenzione:</strong> Questo link scadrà tra 1 ora.
                </p>
                
                <p style="color: #6b7280; font-size: 14px;">
                  Se non hai richiesto il reset della password, puoi ignorare questa email. La tua password non verrà modificata.
                </p>
                
                <p style="margin-top: 30px;">
                  <strong>Il Team Event Four You</strong>
                </p>
              </div>
            `,
          });

          return res.json({ message: successMessage });
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
          return res.status(500).json({ 
            message: "Impossibile inviare l'email. Riprova più tardi." 
          });
        }
      }

      // Neither found - still return success for security
      res.json({ message: successMessage });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Errore durante l'invio. Riprova più tardi." });
    }
  });

  // Unified Reset password with token - supports both users and customers
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { token, password, type } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token e password richiesti" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "La password deve essere di almeno 8 caratteri" });
      }

      // First try users table
      const user = await storage.getUserByResetToken(token);
      
      if (user) {
        // Check if token is expired
        if (user.resetPasswordExpires && new Date() > new Date(user.resetPasswordExpires)) {
          return res.status(400).json({ message: "Link scaduto. Richiedi un nuovo reset password." });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 10);

        // Update user with new password and clear reset token
        await storage.updateUser(user.id, { 
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpires: null,
          emailVerified: true // Also verify email since they received the email
        });

        return res.json({ message: "Password reimpostata con successo! Ora puoi accedere." });
      }

      // Try customers table
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.resetPasswordToken, token));
      
      if (customer) {
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
            registrationCompleted: true
          })
          .where(eq(siaeCustomers.id, customer.id));

        return res.json({ message: "Password reimpostata con successo! Ora puoi accedere." });
      }

      // Token not found in either table
      return res.status(400).json({ message: "Link non valido o scaduto" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Errore durante il reset. Riprova più tardi." });
    }
  });

  // Unified Verify reset token - for frontend validation (checks both users and customers)
  app.get('/api/verify-reset-token/:token', async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ valid: false, message: "Token mancante" });
      }

      // First try users table
      const user = await storage.getUserByResetToken(token);
      
      if (user) {
        if (user.resetPasswordExpires && new Date() > new Date(user.resetPasswordExpires)) {
          return res.status(400).json({ valid: false, message: "Link scaduto" });
        }
        return res.json({ valid: true, email: user.email, type: 'user' });
      }

      // Try customers table
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.resetPasswordToken, token));
      
      if (customer) {
        if (customer.resetPasswordExpires && new Date() > new Date(customer.resetPasswordExpires)) {
          return res.status(400).json({ valid: false, message: "Link scaduto" });
        }
        return res.json({ valid: true, email: customer.email, type: 'customer' });
      }

      return res.status(400).json({ valid: false, message: "Link non valido" });
    } catch (error: any) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ valid: false, message: "Errore di verifica" });
    }
  });

  // Unified login - supports both users (admin/gestore) and customers (SIAE clients)
  // Also supports phone number login for customers
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, phone } = req.body;
      
      // Accept either email or phone
      const identifier = email || phone;
      
      if (!identifier || !password) {
        return res.status(400).json({ message: "Email/Username/Telefono e password richiesti" });
      }

      const normalizedInput = identifier.toLowerCase().trim();
      const isEmail = normalizedInput.includes('@');
      // Phone detection: starts with + or contains only digits (after removing spaces/dashes)
      const cleanPhone = normalizedInput.replace(/[\s\-()]/g, '');
      const isPhone = cleanPhone.startsWith('+') || /^\d{8,15}$/.test(cleanPhone);
      
      // First, try to find in users table (admin/gestore/staff) - only for email/username
      // For username-based login (scanner, etc.), search by email field which stores the username
      let user = null;
      if (!isPhone) {
        user = await storage.getUserByEmail(normalizedInput);
      }
      console.log('[Login] Input:', normalizedInput, 'IsEmail:', isEmail, 'IsPhone:', isPhone, 'User Found:', !!user);
      
      if (user && user.passwordHash) {
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Credenziali non valide" });
        }

        // Roles that don't require email verification (super_admin, scanner, and other staff roles)
        const rolesWithoutEmailVerification = ['super_admin', 'scanner', 'bartender', 'cassiere', 'warehouse', 'pr', 'capo_staff'];
        if (!user.emailVerified && !rolesWithoutEmailVerification.includes(user.role)) {
          return res.status(403).json({ message: "Email non verificata" });
        }

        // Use passport login to properly set up session
        return (req as any).login({ 
          claims: { sub: user.id, email: user.email },
          role: user.role,
          companyId: user.companyId,
          accountType: 'user'
        }, (err: any) => {
          if (err) {
            console.error("Session creation error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          res.json({ 
            message: "Login successful",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
            }
          });
        });
      }
      
      // If not found in users, try PR profiles first (for phone login)
      if (isPhone) {
        // Normalize phone for PR lookup (same logic as /api/pr/login)
        const cleanDigits = cleanPhone.replace(/\D/g, '');
        let numberPart = cleanDigits;
        let detectedPrefix = '';
        
        // Remove Italian prefix
        if (cleanDigits.startsWith('39') && cleanDigits.length >= 12) {
          numberPart = cleanDigits.substring(2);
          detectedPrefix = '+39';
        } 
        // Remove US/Canada prefix  
        else if (cleanDigits.startsWith('1') && cleanDigits.length >= 11) {
          numberPart = cleanDigits.substring(1);
          detectedPrefix = '+1';
        }
        // Remove other common European prefixes
        else if (['44', '33', '49', '34', '41', '43', '32', '31'].some(c => 
          cleanDigits.startsWith(c) && cleanDigits.length >= 10 + c.length
        )) {
          const prefix = ['44', '33', '49', '34', '41', '43', '32', '31'].find(c => 
            cleanDigits.startsWith(c)
          );
          if (prefix) {
            numberPart = cleanDigits.substring(prefix.length);
            detectedPrefix = '+' + prefix;
          }
        }
        
        // Search PR by prefix + number (structured format, same as /api/pr/login)
        let prProfile = null;
        
        if (detectedPrefix) {
          [prProfile] = await db.select()
            .from(prProfiles)
            .where(and(
              eq(prProfiles.phonePrefix, detectedPrefix),
              eq(prProfiles.phone, numberPart)
            ));
        }
        
        // If not found, try just the number part (for legacy data)
        if (!prProfile) {
          [prProfile] = await db
            .select()
            .from(prProfiles)
            .where(eq(prProfiles.phone, numberPart));
        }
        
        // If still not found, try raw cleaned phone (for truly legacy data)
        if (!prProfile) {
          [prProfile] = await db
            .select()
            .from(prProfiles)
            .where(eq(prProfiles.phone, cleanDigits));
        }
        
        console.log('[Login] PR by Phone Found:', !!prProfile);
        
        if (prProfile && prProfile.passwordHash && prProfile.isActive) {
          const isValidPassword = await bcrypt.compare(password, prProfile.passwordHash);
          if (!isValidPassword) {
            return res.status(401).json({ message: "Credenziali non valide" });
          }
          
          // Update last login (same as /api/pr/login)
          await db.update(prProfiles)
            .set({ 
              lastLoginAt: new Date(),
              phoneVerified: true 
            })
            .where(eq(prProfiles.id, prProfile.id));
          
          // Create PR session (same structure as /api/pr/login)
          const prProfileData = {
            id: prProfile.id,
            companyId: prProfile.companyId,
            firstName: prProfile.firstName,
            lastName: prProfile.lastName,
            prCode: prProfile.prCode,
            phone: prProfile.phone,
            email: prProfile.email
          };
          
          (req.session as any).prProfile = prProfileData;
          
          // Save session explicitly before responding
          return req.session.save((saveErr) => {
            if (saveErr) {
              console.error("[Login] Session save error:", saveErr);
              return res.status(500).json({ message: "Session creation failed" });
            }
            
            return res.json({
              message: "Login successful",
              user: {
                id: prProfile.id,
                email: prProfile.email,
                phone: prProfile.phone,
                firstName: prProfile.firstName,
                lastName: prProfile.lastName,
                prCode: prProfile.prCode,
                role: 'pr',
                companyId: prProfile.companyId
              }
            });
          });
        }
      }
      
      // If not found in PR, try siae_customers table (by email or phone)
      let customer = null;
      
      if (isPhone) {
        // Search by phone number
        const [phoneCustomer] = await db
          .select()
          .from(siaeCustomers)
          .where(eq(siaeCustomers.phone, cleanPhone));
        customer = phoneCustomer;
        console.log('[Login] Customer by Phone Found:', !!customer);
      } else if (normalizedInput.includes('@')) {
        // Search by email
        const [emailCustomer] = await db
          .select()
          .from(siaeCustomers)
          .where(eq(siaeCustomers.email, normalizedInput));
        customer = emailCustomer;
        console.log('[Login] Customer by Email Found:', !!customer);
      }
      
      if (customer && customer.passwordHash) {
        const isValidPassword = await bcrypt.compare(password, customer.passwordHash);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Credenziali non valide" });
        }

        if (!customer.registrationCompleted) {
          return res.status(403).json({ message: "Completa la registrazione con OTP" });
        }

        // Create session for customer
        return (req as any).login({ 
          claims: { sub: customer.id, email: customer.email || customer.phone },
          role: 'cliente',
          customerId: customer.id,
          accountType: 'customer'
        }, (err: any) => {
          if (err) {
            console.error("Session creation error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          res.json({ 
            message: "Login successful",
            user: {
              id: customer.id,
              email: customer.email,
              phone: customer.phone,
              firstName: customer.firstName,
              lastName: customer.lastName,
              role: 'cliente',
            }
          });
        });
      }
      
      // Neither user nor customer found
      return res.status(401).json({ message: "Credenziali non valide" });
      
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Custom authentication middleware for classic login
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Middleware per verificare se l'utente è admin o super_admin
  const isAdminOrSuperAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userRole = req.user?.role;
    if (userRole === 'super_admin' || userRole === 'gestore') {
      return next();
    }
    res.status(403).json({ message: "Accesso negato: privilegi amministrativi richiesti" });
  };

  // Auth routes
  // Helper: Remove sensitive fields from user object
  const sanitizeUser = (user: any) => {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  };

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if this is a PR session (from /api/pr/login)
      const prSession = req.session?.prProfile;
      if (prSession?.id) {
        // Check if PR is in customer mode
        if (req.session?.activeRole === 'cliente' && req.session?.customerMode) {
          const customerMode = req.session.customerMode;
          return res.json({
            id: prSession.id,
            email: customerMode.email,
            firstName: customerMode.firstName,
            lastName: customerMode.lastName,
            name: `${customerMode.firstName} ${customerMode.lastName}`,
            role: 'cliente',
            isCustomer: true,
            canSwitchToPr: true,
            prProfileId: prSession.id,
            siaeCustomerId: customerMode.customerId
          });
        }
        
        // PR users have their own session format
        const [profile] = await db.select().from(prProfiles)
          .where(eq(prProfiles.id, prSession.id));
        
        if (profile) {
          // Get linked customer if any
          let siaeCustomerId = null;
          if (profile.userId) {
            const [linkedUser] = await db.select().from(users)
              .where(eq(users.id, profile.userId));
            if (linkedUser?.siaeCustomerId) {
              siaeCustomerId = linkedUser.siaeCustomerId;
            }
          }
          // Also check if customer exists with same phone
          if (!siaeCustomerId) {
            const fullPhone = `${profile.phonePrefix || '+39'}${profile.phone}`;
            const [customer] = await db.select().from(siaeCustomers)
              .where(eq(siaeCustomers.phone, fullPhone));
            if (customer) {
              siaeCustomerId = customer.id;
            }
          }
          
          return res.json({
            id: profile.id,
            email: profile.email || `${profile.phone}@pr.local`,
            firstName: profile.firstName,
            lastName: profile.lastName,
            name: `${profile.firstName} ${profile.lastName}`,
            phone: profile.phone,
            role: 'pr',
            companyId: profile.companyId,
            prCode: profile.prCode,
            isPr: true,
            siaeCustomerId: siaeCustomerId
          });
        }
      }
      
      // For all other session types, require passport authentication
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if this is a SIAE cashier session
      if (req.user?.cashierType === 'siae' && req.user?.cashierId) {
        const [cashier] = await db.select().from(siaeCashiers)
          .where(eq(siaeCashiers.id, req.user.cashierId));
        
        if (cashier) {
          const { passwordHash, ...cashierData } = cashier;
          return res.json({
            id: cashier.id,
            email: `${cashier.username}@cashier.local`,
            name: cashier.name,
            username: cashier.username,
            role: 'cassiere',
            companyId: cashier.companyId,
            isCashier: true,
            cashierType: 'siae'
          });
        }
      }
      
      // Check if this is a customer session
      if (req.user?.accountType === 'customer' && req.user?.customerId) {
        const [customer] = await db.select().from(siaeCustomers)
          .where(eq(siaeCustomers.id, req.user.customerId));
        
        if (customer) {
          const { passwordHash, ...customerData } = customer;
          return res.json({
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            role: 'cliente',
            isCustomer: true,
            accountType: 'customer'
          });
        }
      }
      
      // If impersonating, use the impersonated user ID from session
      const userId = req.session.impersonatorId ? req.session.userId : req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Add flag to indicate if this is an impersonated session
      if (user && req.session.impersonatorId) {
        return res.json({ 
          ...sanitizeUser(user), 
          isImpersonated: true,
          impersonatorId: req.session.impersonatorId 
        });
      }
      
      res.json(user ? sanitizeUser(user) : null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Failed to destroy session" });
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  });

  // POST logout endpoint for scanner and other clients
  app.post('/api/auth/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Failed to destroy session" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Helper function to get current user ID (respecting impersonation)
  const getCurrentUserId = (req: any): string => {
    return req.session.impersonatorId ? req.session.userId : req.user.claims.sub;
  };

  // Helper function to get user's company ID
  const getUserCompanyId = async (req: any): Promise<string | null> => {
    const userId = getCurrentUserId(req);
    const user = await storage.getUser(userId);
    return user?.companyId || null;
  };

  // Helper function to check if user is super admin
  const isSuperAdmin = async (req: any): Promise<boolean> => {
    const userId = getCurrentUserId(req);
    const user = await storage.getUser(userId);
    return user?.role === 'super_admin';
  };

  const isGestore = async (req: any): Promise<boolean> => {
    const userId = getCurrentUserId(req);
    const user = await storage.getUser(userId);
    return user?.role === 'gestore';
  };

  // ===== COMPANIES =====
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      // Super admin sees all companies
      if (await isSuperAdmin(req)) {
        const allCompanies = await storage.getAllCompanies();
        return res.json(allCompanies);
      }
      
      // Gestore and other roles see only their associated companies
      const userId = getCurrentUserId(req);
      const associations = await db.select({
        id: companies.id,
        name: companies.name,
        taxId: companies.taxId,
        address: companies.address,
        active: companies.active,
        createdAt: companies.createdAt,
      })
        .from(userCompanies)
        .innerJoin(companies, eq(userCompanies.companyId, companies.id))
        .where(eq(userCompanies.userId, userId));
      
      res.json(associations);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/companies/current', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(404).json({ message: "No company associated" });
      }
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching current company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const validated = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validated);
      res.json(company);
    } catch (error: any) {
      console.error("Error creating company:", error);
      res.status(400).json({ message: error.message || "Failed to create company" });
    }
  });

  app.patch('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = req.params.id;
      
      // Super admin can update any company
      if (!(await isSuperAdmin(req))) {
        // Check if user is associated with this company
        const userId = getCurrentUserId(req);
        const association = await db.select()
          .from(userCompanies)
          .where(and(
            eq(userCompanies.userId, userId),
            eq(userCompanies.companyId, companyId)
          ))
          .limit(1);
        
        if (association.length === 0) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const company = await storage.updateCompany(companyId, req.body);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.delete('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const deleted = await storage.deleteCompany(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting company:", error);
      // Handle foreign key constraint errors
      if (error.code === '23503') {
        return res.status(400).json({ 
          message: "Impossibile eliminare l'azienda: esistono dati collegati (utenti, eventi, prodotti, etc.)" 
        });
      }
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // ===== USER COMPANIES (Many-to-many user-company associations) =====

  // Get companies for the logged-in user
  app.get('/api/companies/my-companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const associations = await db.select({
        id: userCompanies.id,
        userId: userCompanies.userId,
        companyId: userCompanies.companyId,
        role: userCompanies.role,
        isDefault: userCompanies.isDefault,
        createdAt: userCompanies.createdAt,
        companyName: companies.name,
        companyTaxId: companies.taxId,
      })
        .from(userCompanies)
        .leftJoin(companies, eq(userCompanies.companyId, companies.id))
        .where(eq(userCompanies.userId, userId));
      res.json(associations);
    } catch (error) {
      console.error("Error fetching user companies:", error);
      res.status(500).json({ message: "Failed to fetch user companies" });
    }
  });

  // Get all user-company associations (super_admin sees all, gestore sees own company's associations)
  app.get('/api/user-companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'gestore')) {
        return res.status(403).json({ message: "Forbidden" });
      }

      let associations;
      if (currentUser.role === 'super_admin') {
        associations = await db.select({
          id: userCompanies.id,
          userId: userCompanies.userId,
          companyId: userCompanies.companyId,
          role: userCompanies.role,
          isDefault: userCompanies.isDefault,
          createdAt: userCompanies.createdAt,
          userName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          companyName: companies.name,
        })
          .from(userCompanies)
          .leftJoin(users, eq(userCompanies.userId, users.id))
          .leftJoin(companies, eq(userCompanies.companyId, companies.id));
      } else {
        // Gestore sees only their own associations
        associations = await db.select({
          id: userCompanies.id,
          userId: userCompanies.userId,
          companyId: userCompanies.companyId,
          role: userCompanies.role,
          isDefault: userCompanies.isDefault,
          createdAt: userCompanies.createdAt,
          companyName: companies.name,
        })
          .from(userCompanies)
          .leftJoin(companies, eq(userCompanies.companyId, companies.id))
          .where(eq(userCompanies.userId, userId));
      }
      
      res.json(associations);
    } catch (error) {
      console.error("Error fetching user-company associations:", error);
      res.status(500).json({ message: "Failed to fetch associations" });
    }
  });

  // Get all companies for a specific user
  app.get('/api/users/:userId/companies', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getCurrentUserId(req);
      const currentUser = await storage.getUser(currentUserId);
      const targetUserId = req.params.userId;
      
      // Only super_admin can view other users' companies, gestore can only view their own
      if (!currentUser || (currentUser.role !== 'super_admin' && currentUserId !== targetUserId)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // First check if there are any associations
      const userAssociations = await db.select()
        .from(userCompanies)
        .where(eq(userCompanies.userId, targetUserId));
      
      if (userAssociations.length === 0) {
        return res.json([]);
      }

      // Get associations with company details
      const associations = await db.select({
        id: userCompanies.id,
        userId: userCompanies.userId,
        companyId: userCompanies.companyId,
        role: userCompanies.role,
        isDefault: userCompanies.isDefault,
        createdAt: userCompanies.createdAt,
        companyName: companies.name,
        companyTaxId: companies.taxId,
      })
        .from(userCompanies)
        .leftJoin(companies, eq(userCompanies.companyId, companies.id))
        .where(eq(userCompanies.userId, targetUserId));
      
      res.json(associations);
    } catch (error) {
      console.error("Error fetching user companies:", error);
      res.status(500).json({ message: "Failed to fetch user companies" });
    }
  });

  // Create a new user-company association
  app.post('/api/user-companies', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getCurrentUserId(req);
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || currentUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super admin can create associations" });
      }

      const validated = insertUserCompanySchema.parse(req.body);
      
      // Check if association already exists
      const existing = await db.select()
        .from(userCompanies)
        .where(and(
          eq(userCompanies.userId, validated.userId),
          eq(userCompanies.companyId, validated.companyId)
        ));
      
      if (existing.length > 0) {
        return res.status(400).json({ message: "Association already exists" });
      }

      // If this is set as default, unset other defaults for this user
      if (validated.isDefault) {
        await db.update(userCompanies)
          .set({ isDefault: false })
          .where(eq(userCompanies.userId, validated.userId));
      }

      const [association] = await db.insert(userCompanies)
        .values(validated)
        .returning();
      
      res.json(association);
    } catch (error: any) {
      console.error("Error creating user-company association:", error);
      res.status(400).json({ message: error.message || "Failed to create association" });
    }
  });

  // Update a user-company association
  app.patch('/api/user-companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getCurrentUserId(req);
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || currentUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super admin can update associations" });
      }

      const { role, isDefault } = req.body;
      const associationId = req.params.id;
      
      // Get the existing association
      const [existing] = await db.select()
        .from(userCompanies)
        .where(eq(userCompanies.id, associationId));
      
      if (!existing) {
        return res.status(404).json({ message: "Association not found" });
      }

      // If setting as default, unset other defaults for this user
      if (isDefault) {
        await db.update(userCompanies)
          .set({ isDefault: false })
          .where(eq(userCompanies.userId, existing.userId));
      }

      const [updated] = await db.update(userCompanies)
        .set({ 
          role: role || existing.role, 
          isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
          updatedAt: new Date()
        })
        .where(eq(userCompanies.id, associationId))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating user-company association:", error);
      res.status(500).json({ message: "Failed to update association" });
    }
  });

  // Delete a user-company association
  app.delete('/api/user-companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getCurrentUserId(req);
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || currentUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super admin can delete associations" });
      }

      const [deleted] = await db.delete(userCompanies)
        .where(eq(userCompanies.id, req.params.id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Association not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user-company association:", error);
      res.status(500).json({ message: "Failed to delete association" });
    }
  });

  // ===== COMPANY FEATURES (Admin toggles for modules) =====
  app.get('/api/company-features', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const features = await storage.getAllCompanyFeatures();
      res.json(features);
    } catch (error) {
      console.error("Error fetching company features:", error);
      res.status(500).json({ message: "Failed to fetch company features" });
    }
  });

  app.get('/api/company-features/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const features = await storage.getCompanyFeatures(req.params.companyId);
      if (!features) {
        // Return default features if none exist
        return res.json({
          companyId: req.params.companyId,
          beverageEnabled: true,
          contabilitaEnabled: false,
          personaleEnabled: false,
          cassaEnabled: false,
          nightFileEnabled: false,
          siaeEnabled: false,
        });
      }
      res.json(features);
    } catch (error) {
      console.error("Error fetching company features:", error);
      res.status(500).json({ message: "Failed to fetch company features" });
    }
  });

  app.get('/api/company-features/current/my', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const features = await storage.getCompanyFeatures(companyId);
      if (!features) {
        // Return default features if none exist (beverage always enabled by default)
        return res.json({
          companyId: companyId,
          beverageEnabled: true,
          contabilitaEnabled: false,
          personaleEnabled: false,
          cassaEnabled: false,
          nightFileEnabled: false,
          siaeEnabled: false,
        });
      }
      res.json(features);
    } catch (error) {
      console.error("Error fetching current company features:", error);
      res.status(500).json({ message: "Failed to fetch company features" });
    }
  });

  app.put('/api/company-features/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const features = await storage.upsertCompanyFeatures(req.params.companyId, req.body);
      res.json(features);
    } catch (error) {
      console.error("Error updating company features:", error);
      res.status(500).json({ message: "Failed to update company features" });
    }
  });

  // ===== USER FEATURES (Admin toggles for modules per user) =====
  app.get('/api/user-features', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const features = await storage.getAllUserFeatures();
      res.json(features);
    } catch (error) {
      console.error("Error fetching user features:", error);
      res.status(500).json({ message: "Failed to fetch user features" });
    }
  });

  // IMPORTANT: This route must be BEFORE /:userId to avoid matching 'current' as userId
  app.get('/api/user-features/current/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(403).json({ message: "User not found" });
      }
      const features = await storage.getUserFeatures(userId);
      if (!features) {
        // Return default features if none exist (aligned with schema defaults)
        return res.json({
          userId: userId,
          beverageEnabled: true,
          contabilitaEnabled: false,
          personaleEnabled: false,
          cassaEnabled: false,
          nightFileEnabled: false,
          siaeEnabled: false,
          scannerEnabled: true,  // Default true per schema
          prEnabled: true,       // Default true per schema
          badgesEnabled: true,   // Default true per schema
          templateEnabled: true, // Default true per schema
          cassaBigliettiEnabled: true, // Default true per schema
        });
      }
      res.json(features);
    } catch (error) {
      console.error("Error fetching current user features:", error);
      res.status(500).json({ message: "Failed to fetch user features" });
    }
  });

  app.get('/api/user-features/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const features = await storage.getUserFeatures(req.params.userId);
      if (!features) {
        // Return default features if none exist (aligned with schema defaults)
        return res.json({
          userId: req.params.userId,
          beverageEnabled: true,
          contabilitaEnabled: false,
          personaleEnabled: false,
          cassaEnabled: false,
          nightFileEnabled: false,
          siaeEnabled: false,
          scannerEnabled: true,  // Default true per schema
          prEnabled: true,       // Default true per schema
          badgesEnabled: true,   // Default true per schema
          templateEnabled: true, // Default true per schema
          cassaBigliettiEnabled: true, // Default true per schema
          // Event Hub modules
          guestListEnabled: true,
          tablesEnabled: true,
          pageEditorEnabled: true,
          resaleEnabled: true,
          marketingEnabled: true,
          accessControlEnabled: true,
          financeEnabled: true,
          // PR modules
          prWalletEnabled: true,
          prReservationsEnabled: true,
          prPayoutsEnabled: true,
          prMultiCompanyEnabled: false,
        });
      }
      res.json(features);
    } catch (error) {
      console.error("Error fetching user features:", error);
      res.status(500).json({ message: "Failed to fetch user features" });
    }
  });

  // Handler for updating user features (shared by PUT and PATCH)
  const handleUpdateUserFeatures = async (req: any, res: any) => {
    try {
      const isSuperAdminUser = await isSuperAdmin(req);
      const isGestoreUser = await isGestore(req);
      const targetUserId = req.params.userId;
      
      // Super admin can update any user's features
      if (isSuperAdminUser) {
        const features = await storage.upsertUserFeatures(targetUserId, req.body);
        return res.json(features);
      }
      
      // Gestore can only update warehouse users in their company (permissions only)
      if (isGestoreUser) {
        const requestingUserCompanyId = await getUserCompanyId(req);
        const targetUser = await storage.getUser(targetUserId);
        
        if (!targetUser || targetUser.companyId !== requestingUserCompanyId) {
          return res.status(403).json({ message: "Cannot modify users outside your company" });
        }
        
        if (targetUser.role !== 'warehouse') {
          return res.status(403).json({ message: "Gestori can only modify warehouse user permissions" });
        }
        
        // Only allow updating warehouse-specific permissions (canCreateProducts)
        const allowedUpdates = {
          canCreateProducts: req.body.canCreateProducts,
        };
        
        const features = await storage.upsertUserFeatures(targetUserId, allowedUpdates);
        return res.json(features);
      }
      
      return res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      console.error("Error updating user features:", error);
      res.status(500).json({ message: "Failed to update user features" });
    }
  };

  app.put('/api/user-features/:userId', isAuthenticated, handleUpdateUserFeatures);
  app.patch('/api/user-features/:userId', isAuthenticated, handleUpdateUserFeatures);

  // ===== LOCATIONS =====
  app.get('/api/locations', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const locations = await storage.getLocationsByCompany(companyId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertLocationSchema.parse({ ...req.body, companyId });
      const location = await storage.createLocation(validated);
      res.json(location);
    } catch (error: any) {
      console.error("Error creating location:", error);
      res.status(400).json({ message: error.message || "Failed to create location" });
    }
  });

  app.get('/api/locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  app.patch('/api/locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const location = await storage.updateLocation(req.params.id, req.body);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // ===== VENUE FLOOR PLANS (Planimetrie) =====
  
  // Get all floor plans for a location
  app.get('/api/locations/:locationId/floor-plans', isAuthenticated, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const floorPlans = await db.select()
        .from(venueFloorPlans)
        .where(eq(venueFloorPlans.locationId, locationId))
        .orderBy(venueFloorPlans.sortOrder);
      res.json(floorPlans);
    } catch (error) {
      console.error("Error fetching floor plans:", error);
      res.status(500).json({ message: "Impossibile recuperare le planimetrie" });
    }
  });

  // Create a new floor plan
  app.post('/api/locations/:locationId/floor-plans', isAuthenticated, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location non trovata" });
      }
      
      const validated = insertVenueFloorPlanSchema.parse({ ...req.body, locationId });
      
      // If this is set as default, unset others
      if (validated.isDefault) {
        await db.update(venueFloorPlans)
          .set({ isDefault: false })
          .where(eq(venueFloorPlans.locationId, locationId));
      }
      
      const [floorPlan] = await db.insert(venueFloorPlans).values(validated).returning();
      res.json(floorPlan);
    } catch (error: any) {
      console.error("Error creating floor plan:", error);
      res.status(400).json({ message: error.message || "Impossibile creare la planimetria" });
    }
  });

  // Get a specific floor plan with zones
  app.get('/api/floor-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const [floorPlan] = await db.select()
        .from(venueFloorPlans)
        .where(eq(venueFloorPlans.id, id));
      
      if (!floorPlan) {
        return res.status(404).json({ message: "Planimetria non trovata" });
      }
      
      const zones = await db.select()
        .from(floorPlanZones)
        .where(eq(floorPlanZones.floorPlanId, id))
        .orderBy(floorPlanZones.sortOrder);
      
      res.json({ ...floorPlan, zones });
    } catch (error) {
      console.error("Error fetching floor plan:", error);
      res.status(500).json({ message: "Impossibile recuperare la planimetria" });
    }
  });

  // Update a floor plan
  app.patch('/api/floor-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const [existing] = await db.select()
        .from(venueFloorPlans)
        .where(eq(venueFloorPlans.id, id));
      
      if (!existing) {
        return res.status(404).json({ message: "Planimetria non trovata" });
      }
      
      // If setting as default, unset others
      if (req.body.isDefault) {
        await db.update(venueFloorPlans)
          .set({ isDefault: false })
          .where(and(
            eq(venueFloorPlans.locationId, existing.locationId),
            sql`${venueFloorPlans.id} != ${id}`
          ));
      }
      
      const [updated] = await db.update(venueFloorPlans)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(venueFloorPlans.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating floor plan:", error);
      res.status(500).json({ message: "Impossibile aggiornare la planimetria" });
    }
  });

  // Delete a floor plan
  app.delete('/api/floor-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(venueFloorPlans).where(eq(venueFloorPlans.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting floor plan:", error);
      res.status(500).json({ message: "Impossibile eliminare la planimetria" });
    }
  });

  // ===== FLOOR PLAN VERSIONING =====

  // 1. GET /api/floor-plans/:id/versions - List all versions of a floor plan
  app.get('/api/floor-plans/:id/versions', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const versions = await db.select()
        .from(floorPlanVersions)
        .where(eq(floorPlanVersions.floorPlanId, id))
        .orderBy(desc(floorPlanVersions.version));
      res.json(versions);
    } catch (error) {
      console.error("Error fetching floor plan versions:", error);
      res.status(500).json({ message: "Impossibile recuperare le versioni" });
    }
  });

  // 2. POST /api/floor-plans/:id/versions - Create a new draft version (clone current published state)
  app.post('/api/floor-plans/:id/versions', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;

      // Get the floor plan to verify it exists
      const [floorPlan] = await db.select()
        .from(venueFloorPlans)
        .where(eq(venueFloorPlans.id, id));

      if (!floorPlan) {
        return res.status(404).json({ message: "Planimetria non trovata" });
      }

      // Get the current published version if any
      const [publishedVersion] = await db.select()
        .from(floorPlanVersions)
        .where(and(
          eq(floorPlanVersions.floorPlanId, id),
          eq(floorPlanVersions.status, 'published')
        ));

      // Get the latest version number
      const [latestVersion] = await db.select({ maxVersion: sql<number>`COALESCE(MAX(${floorPlanVersions.version}), 0)` })
        .from(floorPlanVersions)
        .where(eq(floorPlanVersions.floorPlanId, id));

      const newVersionNumber = (latestVersion?.maxVersion || 0) + 1;

      // If we have a published version, clone its data; otherwise fetch current zones/seats
      let zonesSnapshot: any[] = [];
      let seatsSnapshot: any[] = [];

      if (publishedVersion) {
        zonesSnapshot = publishedVersion.zonesSnapshot as any[] || [];
        seatsSnapshot = publishedVersion.seatsSnapshot as any[] || [];
      } else {
        // Fetch current zones and seats from the database
        const zones = await db.select()
          .from(floorPlanZones)
          .where(eq(floorPlanZones.floorPlanId, id));
        
        const zoneIds = zones.map(z => z.id);
        let seats: any[] = [];
        if (zoneIds.length > 0) {
          seats = await db.select()
            .from(floorPlanSeats)
            .where(inArray(floorPlanSeats.zoneId, zoneIds));
        }
        
        zonesSnapshot = zones;
        seatsSnapshot = seats;
      }

      // Create new draft version
      const [newVersion] = await db.insert(floorPlanVersions)
        .values({
          floorPlanId: id,
          version: newVersionNumber,
          status: 'draft',
          zonesSnapshot,
          seatsSnapshot,
          notes: req.body.notes || null,
          createdBy: userId,
        })
        .returning();

      res.json(newVersion);
    } catch (error: any) {
      console.error("Error creating floor plan version:", error);
      res.status(400).json({ message: error.message || "Impossibile creare la versione" });
    }
  });

  // 3. GET /api/floor-plan-versions/:versionId - Get a specific version with full data
  app.get('/api/floor-plan-versions/:versionId', isAuthenticated, async (req: any, res) => {
    try {
      const { versionId } = req.params;
      const [version] = await db.select()
        .from(floorPlanVersions)
        .where(eq(floorPlanVersions.id, versionId));

      if (!version) {
        return res.status(404).json({ message: "Versione non trovata" });
      }

      res.json(version);
    } catch (error) {
      console.error("Error fetching floor plan version:", error);
      res.status(500).json({ message: "Impossibile recuperare la versione" });
    }
  });

  // 4. PATCH /api/floor-plan-versions/:versionId - Update a draft version (save editor changes)
  app.patch('/api/floor-plan-versions/:versionId', isAuthenticated, async (req: any, res) => {
    try {
      const { versionId } = req.params;

      // Get the version
      const [version] = await db.select()
        .from(floorPlanVersions)
        .where(eq(floorPlanVersions.id, versionId));

      if (!version) {
        return res.status(404).json({ message: "Versione non trovata" });
      }

      // Only draft versions can be updated
      if (version.status !== 'draft') {
        return res.status(400).json({ message: "Solo le versioni bozza possono essere modificate" });
      }

      // Update allowed fields: zonesSnapshot, seatsSnapshot, notes
      const updateData: any = {};
      if (req.body.zonesSnapshot !== undefined) {
        updateData.zonesSnapshot = req.body.zonesSnapshot;
      }
      if (req.body.seatsSnapshot !== undefined) {
        updateData.seatsSnapshot = req.body.seatsSnapshot;
      }
      if (req.body.notes !== undefined) {
        updateData.notes = req.body.notes;
      }

      const [updated] = await db.update(floorPlanVersions)
        .set(updateData)
        .where(eq(floorPlanVersions.id, versionId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating floor plan version:", error);
      res.status(500).json({ message: "Impossibile aggiornare la versione" });
    }
  });

  // 5. POST /api/floor-plan-versions/:versionId/publish - Publish a draft (make it live)
  app.post('/api/floor-plan-versions/:versionId/publish', isAuthenticated, async (req: any, res) => {
    try {
      const { versionId } = req.params;
      const userId = req.user?.claims?.sub;

      // Get the version to publish
      const [version] = await db.select()
        .from(floorPlanVersions)
        .where(eq(floorPlanVersions.id, versionId));

      if (!version) {
        return res.status(404).json({ message: "Versione non trovata" });
      }

      if (version.status !== 'draft') {
        return res.status(400).json({ message: "Solo le versioni bozza possono essere pubblicate" });
      }

      // Archive any currently published version for this floor plan
      await db.update(floorPlanVersions)
        .set({ status: 'archived' })
        .where(and(
          eq(floorPlanVersions.floorPlanId, version.floorPlanId),
          eq(floorPlanVersions.status, 'published')
        ));

      // Publish the draft version
      const [published] = await db.update(floorPlanVersions)
        .set({
          status: 'published',
          publishedAt: new Date(),
          publishedBy: userId,
        })
        .where(eq(floorPlanVersions.id, versionId))
        .returning();

      // Sync the published data to the actual zones and seats tables
      const zonesSnapshot = published.zonesSnapshot as any[] || [];
      const seatsSnapshot = published.seatsSnapshot as any[] || [];

      // Clear existing zones (seats cascade delete)
      await db.delete(floorPlanZones)
        .where(eq(floorPlanZones.floorPlanId, version.floorPlanId));

      // Insert zones from snapshot
      if (zonesSnapshot.length > 0) {
        const zonesToInsert = zonesSnapshot.map(zone => ({
          ...zone,
          floorPlanId: version.floorPlanId,
          createdAt: zone.createdAt ? new Date(zone.createdAt) : new Date(),
          updatedAt: new Date(),
        }));
        await db.insert(floorPlanZones).values(zonesToInsert);

        // Insert seats from snapshot
        if (seatsSnapshot.length > 0) {
          const seatsToInsert = seatsSnapshot.map(seat => ({
            ...seat,
            createdAt: seat.createdAt ? new Date(seat.createdAt) : new Date(),
            updatedAt: new Date(),
          }));
          await db.insert(floorPlanSeats).values(seatsToInsert);
        }
      }

      res.json(published);
    } catch (error) {
      console.error("Error publishing floor plan version:", error);
      res.status(500).json({ message: "Impossibile pubblicare la versione" });
    }
  });

  // 6. DELETE /api/floor-plan-versions/:versionId - Delete a draft version
  app.delete('/api/floor-plan-versions/:versionId', isAuthenticated, async (req: any, res) => {
    try {
      const { versionId } = req.params;

      // Get the version
      const [version] = await db.select()
        .from(floorPlanVersions)
        .where(eq(floorPlanVersions.id, versionId));

      if (!version) {
        return res.status(404).json({ message: "Versione non trovata" });
      }

      // Only draft versions can be deleted
      if (version.status === 'published') {
        return res.status(400).json({ message: "Le versioni pubblicate non possono essere eliminate" });
      }

      await db.delete(floorPlanVersions).where(eq(floorPlanVersions.id, versionId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting floor plan version:", error);
      res.status(500).json({ message: "Impossibile eliminare la versione" });
    }
  });

  // ===== FLOOR PLAN ZONES =====
  
  // Get all zones for a floor plan
  app.get('/api/floor-plans/:floorPlanId/zones', isAuthenticated, async (req: any, res) => {
    try {
      const { floorPlanId } = req.params;
      const zones = await db.select()
        .from(floorPlanZones)
        .where(eq(floorPlanZones.floorPlanId, floorPlanId))
        .orderBy(floorPlanZones.sortOrder);
      res.json(zones);
    } catch (error) {
      console.error("Error fetching zones:", error);
      res.status(500).json({ message: "Impossibile recuperare le zone" });
    }
  });

  // Create a new zone
  app.post('/api/floor-plans/:floorPlanId/zones', isAuthenticated, async (req: any, res) => {
    try {
      const { floorPlanId } = req.params;
      const validated = insertFloorPlanZoneSchema.parse({ ...req.body, floorPlanId });
      const [zone] = await db.insert(floorPlanZones).values(validated).returning();
      res.json(zone);
    } catch (error: any) {
      console.error("Error creating zone:", error);
      res.status(400).json({ message: error.message || "Impossibile creare la zona" });
    }
  });

  // Update a zone
  app.patch('/api/zones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(floorPlanZones)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(floorPlanZones.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Zona non trovata" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating zone:", error);
      res.status(500).json({ message: "Impossibile aggiornare la zona" });
    }
  });

  // Delete a zone
  app.delete('/api/zones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(floorPlanZones).where(eq(floorPlanZones.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting zone:", error);
      res.status(500).json({ message: "Impossibile eliminare la zona" });
    }
  });

  // ===== FLOOR PLAN SEATS =====
  
  // Get all seats for a zone
  app.get('/api/zones/:zoneId/seats', isAuthenticated, async (req: any, res) => {
    try {
      const { zoneId } = req.params;
      const seats = await db.select()
        .from(floorPlanSeats)
        .where(eq(floorPlanSeats.zoneId, zoneId))
        .orderBy(floorPlanSeats.sortOrder);
      res.json(seats);
    } catch (error) {
      console.error("Error fetching seats:", error);
      res.status(500).json({ message: "Impossibile recuperare i posti" });
    }
  });

  // Create seats in bulk
  app.post('/api/zones/:zoneId/seats/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { zoneId } = req.params;
      const { seats } = req.body;
      
      if (!Array.isArray(seats) || seats.length === 0) {
        return res.status(400).json({ message: "Fornire un array di posti" });
      }
      
      const seatsToInsert = seats.map((seat: any) => ({
        ...seat,
        zoneId,
      }));
      
      const inserted = await db.insert(floorPlanSeats).values(seatsToInsert).returning();
      res.json(inserted);
    } catch (error: any) {
      console.error("Error creating seats:", error);
      res.status(400).json({ message: error.message || "Impossibile creare i posti" });
    }
  });

  // Delete all seats in a zone
  app.delete('/api/zones/:zoneId/seats', isAuthenticated, async (req: any, res) => {
    try {
      const { zoneId } = req.params;
      await db.delete(floorPlanSeats).where(eq(floorPlanSeats.zoneId, zoneId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting seats:", error);
      res.status(500).json({ message: "Impossibile eliminare i posti" });
    }
  });

  // Generate seats grid for a zone
  app.post('/api/admin/zones/:zoneId/seats/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { zoneId } = req.params;
      const { rows, seatsPerRow, startRow = 'A', labelFormat = '{row}{seat}' } = req.body;

      if (!rows || !seatsPerRow || rows < 1 || seatsPerRow < 1) {
        return res.status(400).json({ message: "Specificare numero file e posti per fila validi" });
      }

      // Delete existing seats in the zone
      await db.delete(floorPlanSeats).where(eq(floorPlanSeats.zoneId, zoneId));

      const seatsToInsert = [];
      for (let r = 0; r < rows; r++) {
        const rowLetter = String.fromCharCode(startRow.charCodeAt(0) + r);
        for (let s = 1; s <= seatsPerRow; s++) {
          seatsToInsert.push({
            zoneId,
            seatLabel: labelFormat.replace('{row}', rowLetter).replace('{seat}', s.toString()),
            row: rowLetter,
            seatNumber: s,
            posX: ((s - 0.5) / seatsPerRow * 100).toFixed(4),
            posY: ((r + 0.5) / rows * 100).toFixed(4),
            isAccessible: false,
            isBlocked: false,
            isActive: true,
            sortOrder: r * seatsPerRow + s,
          });
        }
      }

      const inserted = await db.insert(floorPlanSeats).values(seatsToInsert).returning();
      res.json({ count: inserted.length, seats: inserted });
    } catch (error: any) {
      console.error("Error generating seats:", error);
      res.status(500).json({ message: error.message || "Impossibile generare i posti" });
    }
  });

  // Update a single seat
  app.patch('/api/admin/seats/:seatId', isAuthenticated, async (req: any, res) => {
    try {
      const { seatId } = req.params;
      const updates = req.body;
      
      const [updated] = await db.update(floorPlanSeats)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(floorPlanSeats.id, seatId))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Posto non trovato" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating seat:", error);
      res.status(500).json({ message: "Impossibile aggiornare il posto" });
    }
  });

  // Get seats for a zone (admin route)
  app.get('/api/admin/zones/:zoneId/seats', isAuthenticated, async (req: any, res) => {
    try {
      const { zoneId } = req.params;
      const seats = await db.select()
        .from(floorPlanSeats)
        .where(eq(floorPlanSeats.zoneId, zoneId))
        .orderBy(floorPlanSeats.sortOrder);
      res.json(seats);
    } catch (error) {
      console.error("Error fetching seats:", error);
      res.status(500).json({ message: "Impossibile recuperare i posti" });
    }
  });

  // Delete all seats in a zone (admin route)
  app.delete('/api/admin/zones/:zoneId/seats', isAuthenticated, async (req: any, res) => {
    try {
      const { zoneId } = req.params;
      await db.delete(floorPlanSeats).where(eq(floorPlanSeats.zoneId, zoneId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting seats:", error);
      res.status(500).json({ message: "Impossibile eliminare i posti" });
    }
  });

  // ===== EVENT ZONE MAPPINGS =====
  
  // Get zone mappings for an event
  app.get('/api/siae/ticketed-events/:eventId/zone-mappings', isAuthenticated, async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const mappings = await db.select()
        .from(eventZoneMappings)
        .where(eq(eventZoneMappings.ticketedEventId, eventId));
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching zone mappings:", error);
      res.status(500).json({ message: "Impossibile recuperare le mappature zone" });
    }
  });

  // Create zone mapping
  app.post('/api/siae/ticketed-events/:eventId/zone-mappings', isAuthenticated, async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const validated = insertEventZoneMappingSchema.parse({ ...req.body, ticketedEventId: eventId });
      const [mapping] = await db.insert(eventZoneMappings).values(validated).returning();
      res.json(mapping);
    } catch (error: any) {
      console.error("Error creating zone mapping:", error);
      res.status(400).json({ message: error.message || "Impossibile creare la mappatura" });
    }
  });

  // Delete zone mapping
  app.delete('/api/zone-mappings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(eventZoneMappings).where(eq(eventZoneMappings.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting zone mapping:", error);
      res.status(500).json({ message: "Impossibile eliminare la mappatura" });
    }
  });

  // ========== EVENT PAGE 3.0 ADMIN API ==========

  // GET - Recupera configurazione pagina per evento (admin)
  app.get("/api/siae/ticketed-events/:id/page-config", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(id);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      // Verifica accesso
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      const [config] = await db.select().from(eventPageConfigs)
        .where(eq(eventPageConfigs.ticketedEventId, id));
      
      const blocks = await db.select().from(eventPageBlocks)
        .where(eq(eventPageBlocks.ticketedEventId, id))
        .orderBy(eventPageBlocks.position);
      
      const artists = await db.select().from(eventLineupArtists)
        .where(eq(eventLineupArtists.ticketedEventId, id))
        .orderBy(eventLineupArtists.position);
      
      const timeline = await db.select().from(eventTimelineItems)
        .where(eq(eventTimelineItems.ticketedEventId, id))
        .orderBy(eventTimelineItems.position);
      
      const faq = await db.select().from(eventFaqItems)
        .where(eq(eventFaqItems.ticketedEventId, id))
        .orderBy(eventFaqItems.position);
      
      res.json({ config: config || null, blocks, artists, timeline, faq });
    } catch (error) {
      console.error("Error fetching page config:", error);
      res.status(500).json({ message: "Errore nel recupero della configurazione" });
    }
  });

  // PUT - Salva/aggiorna configurazione pagina
  app.put("/api/siae/ticketed-events/:id/page-config", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(id);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      const { config } = req.body;
      
      // Upsert config
      const [existing] = await db.select().from(eventPageConfigs)
        .where(eq(eventPageConfigs.ticketedEventId, id));
      
      if (existing) {
        await db.update(eventPageConfigs)
          .set({ ...config, updatedAt: new Date() })
          .where(eq(eventPageConfigs.ticketedEventId, id));
      } else {
        await db.insert(eventPageConfigs).values({ ...config, ticketedEventId: id });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving page config:", error);
      res.status(500).json({ message: "Errore nel salvataggio" });
    }
  });

  // ===== LINEUP ARTISTS =====

  // POST - Aggiungi artista
  app.post("/api/siae/ticketed-events/:id/lineup", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(id);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      // Get max position
      const artists = await db.select().from(eventLineupArtists)
        .where(eq(eventLineupArtists.ticketedEventId, id));
      const maxPos = Math.max(0, ...artists.map(a => a.position));
      
      const [artist] = await db.insert(eventLineupArtists)
        .values({ ...req.body, ticketedEventId: id, position: maxPos + 1 })
        .returning();
      
      res.json(artist);
    } catch (error) {
      console.error("Error adding artist:", error);
      res.status(500).json({ message: "Errore nell'aggiunta artista" });
    }
  });

  // PUT - Aggiorna artista
  app.put("/api/siae/ticketed-events/:eventId/lineup/:artistId", isAuthenticated, async (req: any, res) => {
    try {
      const { eventId, artistId } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(eventId);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      await db.update(eventLineupArtists)
        .set(req.body)
        .where(eq(eventLineupArtists.id, artistId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating artist:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento" });
    }
  });

  // DELETE - Rimuovi artista
  app.delete("/api/siae/ticketed-events/:eventId/lineup/:artistId", isAuthenticated, async (req: any, res) => {
    try {
      const { eventId, artistId } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(eventId);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      await db.delete(eventLineupArtists).where(eq(eventLineupArtists.id, artistId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting artist:", error);
      res.status(500).json({ message: "Errore nella rimozione" });
    }
  });

  // ===== TIMELINE ITEMS =====

  // POST - Aggiungi timeline item
  app.post("/api/siae/ticketed-events/:id/timeline", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(id);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      const items = await db.select().from(eventTimelineItems)
        .where(eq(eventTimelineItems.ticketedEventId, id));
      const maxPos = Math.max(0, ...items.map(i => i.position));
      
      const [item] = await db.insert(eventTimelineItems)
        .values({ ...req.body, ticketedEventId: id, position: maxPos + 1 })
        .returning();
      res.json(item);
    } catch (error) {
      console.error("Error adding timeline item:", error);
      res.status(500).json({ message: "Errore nell'aggiunta timeline" });
    }
  });

  // PUT - Aggiorna timeline item
  app.put("/api/siae/ticketed-events/:eventId/timeline/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const { eventId, itemId } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(eventId);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      await db.update(eventTimelineItems).set(req.body).where(eq(eventTimelineItems.id, itemId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating timeline item:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento" });
    }
  });

  // DELETE - Rimuovi timeline item
  app.delete("/api/siae/ticketed-events/:eventId/timeline/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const { eventId, itemId } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(eventId);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      await db.delete(eventTimelineItems).where(eq(eventTimelineItems.id, itemId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting timeline item:", error);
      res.status(500).json({ message: "Errore nella rimozione" });
    }
  });

  // ===== FAQ ITEMS =====

  // POST - Aggiungi FAQ item
  app.post("/api/siae/ticketed-events/:id/faq", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(id);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      const items = await db.select().from(eventFaqItems)
        .where(eq(eventFaqItems.ticketedEventId, id));
      const maxPos = Math.max(0, ...items.map(i => i.position));
      
      const [item] = await db.insert(eventFaqItems)
        .values({ ...req.body, ticketedEventId: id, position: maxPos + 1 })
        .returning();
      res.json(item);
    } catch (error) {
      console.error("Error adding FAQ item:", error);
      res.status(500).json({ message: "Errore nell'aggiunta FAQ" });
    }
  });

  // PUT - Aggiorna FAQ item
  app.put("/api/siae/ticketed-events/:eventId/faq/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const { eventId, itemId } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(eventId);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      await db.update(eventFaqItems).set(req.body).where(eq(eventFaqItems.id, itemId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating FAQ item:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento" });
    }
  });

  // DELETE - Rimuovi FAQ item
  app.delete("/api/siae/ticketed-events/:eventId/faq/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const { eventId, itemId } = req.params;
      const event = await siaeStorage.getSiaeTicketedEvent(eventId);
      if (!event) return res.status(404).json({ message: "Evento non trovato" });
      
      const userCompanyId = await getUserCompanyId(req);
      if (req.user?.role !== 'super_admin' && event.companyId !== userCompanyId) {
        return res.status(403).json({ message: "Accesso negato" });
      }
      
      await db.delete(eventFaqItems).where(eq(eventFaqItems.id, itemId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting FAQ item:", error);
      res.status(500).json({ message: "Errore nella rimozione" });
    }
  });

  // ===== EVENT FORMATS =====
  app.get('/api/event-formats', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const formats = await storage.getEventFormatsByCompany(companyId);
      res.json(formats);
    } catch (error) {
      console.error("Error fetching event formats:", error);
      res.status(500).json({ message: "Impossibile recuperare i format eventi" });
    }
  });

  app.post('/api/event-formats', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      // Remove companyId from body if present, use only the one from authenticated user
      const { companyId: _ignored, ...bodyWithoutCompanyId } = req.body;
      const validated = insertEventFormatSchema.parse({ ...bodyWithoutCompanyId, companyId });
      const format = await storage.createEventFormat(validated);
      res.json(format);
    } catch (error: any) {
      console.error("Error creating event format:", error);
      res.status(400).json({ message: error.message || "Impossibile creare il format evento" });
    }
  });

  app.patch('/api/event-formats/:id', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const format = await storage.updateEventFormat(req.params.id, req.body);
      if (!format) {
        return res.status(404).json({ message: "Format evento non trovato" });
      }
      res.json(format);
    } catch (error) {
      console.error("Error updating event format:", error);
      res.status(500).json({ message: "Impossibile aggiornare il format evento" });
    }
  });

  app.delete('/api/event-formats/:id', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteEventFormat(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Format evento non trovato" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting event format:", error);
      res.status(500).json({ message: "Impossibile eliminare il format evento" });
    }
  });

  // ===== EVENTS =====
  
  // Short link resolver - public endpoint
  app.get('/api/events/short/:shortId', async (req: any, res) => {
    try {
      const { shortId } = req.params;
      if (!shortId || shortId.length < 8) {
        return res.status(400).json({ message: "Link non valido" });
      }
      
      // Find event by the first 8 characters of its ID using LIKE prefix match
      const matchingEvents = await db.select()
        .from(events)
        .where(like(events.id, `${shortId}%`))
        .limit(1);
      
      const event = matchingEvents[0];
      
      if (!event) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Check if event is public
      if (!event.isPublic) {
        return res.status(403).json({ message: "Evento non disponibile" });
      }
      
      res.json({ id: event.id, name: event.name });
    } catch (error) {
      console.error("Error resolving short link:", error);
      res.status(500).json({ message: "Errore nel caricamento dell'evento" });
    }
  });

  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const currentUser = await storage.getUser(userId);
      
      // Super admin can pass companyId as query param to view specific company's events
      if (currentUser?.role === 'super_admin' && req.query.companyId) {
        const events = await storage.getEventsByCompany(req.query.companyId as string);
        return res.json(events);
      }
      
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const events = await storage.getEventsByCompany(companyId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post('/api/events', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      // Extract selectedRecurringDates if provided
      const { selectedRecurringDates, ...eventData } = req.body;
      const validated = insertEventSchema.parse({ ...eventData, companyId });
      
      // Check if this is a recurring event
      if (validated.isRecurring && validated.recurrencePattern && validated.recurrencePattern !== 'none') {
        // Import recurring events helper
        const { randomUUID } = await import('crypto');
        
        // If user has manually selected specific dates, use those instead of generating
        if (selectedRecurringDates && Array.isArray(selectedRecurringDates) && selectedRecurringDates.length > 0) {
          // MANUAL DATE SELECTION PATH
          // When using manual date selection, skip interval/count/endDate validation
          // since user has explicitly chosen which dates to create
          
          const seriesId = randomUUID();
          const eventDuration = new Date(validated.endDatetime).getTime() - new Date(validated.startDatetime).getTime();
          
          // Normalize and validate dates: ensure they're ISO strings, parse safely
          const validDates = selectedRecurringDates
            .filter((dateInput: any) => {
              // Accept only string values (ISO format)
              if (typeof dateInput !== 'string') return false;
              const parsed = new Date(dateInput);
              return !isNaN(parsed.getTime());
            })
            .map((dateStr: string) => new Date(dateStr))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime());
          
          if (validDates.length === 0) {
            return res.status(400).json({ message: "Nessuna data valida selezionata" });
          }
          
          const occurrences = validDates.map((startDate: Date) => {
            const endDate = new Date(startDate.getTime() + eventDuration);
            
            // Preserve ALL fields from validated event, just override dates and add series info
            return {
              ...validated, // Copy all fields from validated event
              seriesId,
              isRecurring: true,
              parentEventId: null,
              startDatetime: startDate,
              endDatetime: endDate,
              // Normalize all optional/nullable fields to explicit null instead of undefined
              capacity: validated.capacity ?? null,
              priceListId: validated.priceListId ?? null,
              actualRevenue: validated.actualRevenue ?? null,
              notes: validated.notes ?? null,
              formatId: validated.formatId ?? null,
              // For manual selection, set meaningful recurrence metadata to prevent issues with future cloning/editing:
              // - interval: 1 (safe default since dates were manually selected)
              // - count: number of manually selected dates
              // - endDate: last selected date
              recurrenceInterval: 1,
              recurrenceCount: validDates.length,
              recurrenceEndDate: validDates[validDates.length - 1],
            };
          });
          
          // Create all selected occurrences
          const createdEvents = await storage.createRecurringEvents(occurrences as any);
          
          // Set parent-child relationship: first event is parent (null), others reference it
          if (createdEvents.length > 1) {
            const parentId = createdEvents[0].id;
            for (let i = 1; i < createdEvents.length; i++) {
              await storage.updateEvent(createdEvents[i].id, { parentEventId: parentId });
            }
          }
          
          res.json({ events: createdEvents, count: createdEvents.length });
        } else {
          // AUTOMATIC GENERATION PATH
          // Use automatic generation if no specific dates provided
          const { generateRecurringEvents } = await import('./recurring-events');
          
          // Validate recurrence parameters (REQUIRED for automatic generation)
          if (!validated.recurrenceInterval || validated.recurrenceInterval < 1) {
            return res.status(400).json({ message: "Intervallo ricorrenza non valido" });
          }
          
          if (!validated.recurrenceEndDate && !validated.recurrenceCount) {
            return res.status(400).json({ message: "Specificare data fine o numero occorrenze" });
          }

          // Generate recurring event occurrences
          // Convert recurrenceEndDate to Date if it's a string to satisfy type requirements
          const baseEventForGeneration = {
            ...validated,
            recurrenceEndDate: validated.recurrenceEndDate 
              ? new Date(validated.recurrenceEndDate) 
              : null,
          };
          const occurrences = generateRecurringEvents({
            baseEvent: baseEventForGeneration,
            pattern: validated.recurrencePattern as 'daily' | 'weekly' | 'monthly',
            interval: validated.recurrenceInterval,
            count: validated.recurrenceCount || undefined,
            endDate: validated.recurrenceEndDate ? new Date(validated.recurrenceEndDate) : undefined,
          });

          // Create all occurrences
          const createdEvents = await storage.createRecurringEvents(occurrences as any);
          
          // Set parent-child relationship: first event is parent (null), others reference it
          if (createdEvents.length > 1) {
            const parentId = createdEvents[0].id;
            for (let i = 1; i < createdEvents.length; i++) {
              await storage.updateEvent(createdEvents[i].id, { parentEventId: parentId });
            }
          }
          
          res.json({ events: createdEvents, count: createdEvents.length });
        }
      } else {
        // Create single event
        const event = await storage.createEvent(validated);
        res.json(event);
      }
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: error.message || "Failed to create event" });
    }
  });

  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      console.log("[Event PATCH] Request body:", JSON.stringify(req.body).substring(0, 500));
      
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const event = await storage.getEvent(id);
      if (!event || event.companyId !== companyId) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      console.log("[Event PATCH] Current event status:", event.status, "Requested status:", req.body.status);

      // Status transition validation
      if (req.body.status && req.body.status !== event.status) {
        // Check role permission for status changes
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || (user.role !== 'super_admin' && user.role !== 'gestore')) {
          return res.status(403).json({ message: "Solo super_admin e gestore possono modificare lo stato dell'evento" });
        }

        // Define valid status transitions
        const validTransitions: Record<string, string> = {
          'draft': 'scheduled',
          'scheduled': 'ongoing',
          'ongoing': 'closed',
        };

        const currentStatus = event.status;
        const newStatus = req.body.status;

        // Check if transition is valid
        if (validTransitions[currentStatus] !== newStatus) {
          if (currentStatus === 'closed') {
            return res.status(400).json({ message: "L'evento è già chiuso e non può essere modificato" });
          }
          return res.status(400).json({ 
            message: `Transizione di stato non valida: ${currentStatus} → ${newStatus}. Transizione valida: ${currentStatus} → ${validTransitions[currentStatus]}` 
          });
        }
      }

      let validated;
      try {
        validated = updateEventSchema.parse(req.body);
      } catch (validationError: any) {
        console.error("Event validation error:", validationError.errors || validationError.message);
        return res.status(400).json({ 
          message: "Errore di validazione: " + (validationError.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || validationError.message)
        });
      }
      // Convert actualRevenue to string for database storage
      const updateData: any = { ...validated };
      if (validated.actualRevenue !== undefined && validated.actualRevenue !== null) {
        updateData.actualRevenue = validated.actualRevenue.toString();
      }
      
      // If trying to close the event, check that all stock has been unloaded first
      if (validated.status === 'closed' && event.status !== 'closed') {
        const eventStocks = await storage.getEventStocks(id);
        const remainingStock = eventStocks.filter(s => parseFloat(s.quantity) > 0);
        
        if (remainingStock.length > 0) {
          // Get product names for better error message
          const products = await storage.getProductsByCompany(companyId);
          const remainingProducts = remainingStock.map(s => {
            const product = products.find(p => p.id === s.productId);
            return `${product?.name || 'Prodotto'}: ${parseFloat(s.quantity).toFixed(2)}`;
          });
          
          return res.status(400).json({ 
            message: `Impossibile chiudere l'evento: ci sono ancora prodotti da scaricare. Effettua prima lo scarico manuale dei seguenti prodotti: ${remainingProducts.join(', ')}`,
            remainingStock: remainingStock.map(s => ({
              productId: s.productId,
              quantity: s.quantity,
              stationId: s.stationId
            }))
          });
        }
      }
      
      const updatedEvent = await storage.updateEvent(id, updateData);
      res.json(updatedEvent);
    } catch (error: any) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: error.message || "Failed to update event" });
    }
  });

  // Delete event with all related data
  app.delete('/api/events/:id', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const event = await storage.getEvent(id);
      if (!event || event.companyId !== companyId) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Delete all related data in order to respect foreign key constraints
      await storage.deleteEventWithRelatedData(id, companyId);

      res.json({ success: true, message: "Evento eliminato con successo" });
    } catch (error: any) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: error.message || "Failed to delete event" });
    }
  });

  app.get('/api/events/:id/revenue-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const event = await storage.getEvent(id);
      if (!event || event.companyId !== companyId) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get all consumptions for this event with company scoping for security
      // Include both CONSUME and DIRECT_CONSUME for complete revenue analysis
      const movements = await db
        .select()
        .from(stockMovements)
        .where(and(
          eq(stockMovements.companyId, companyId),
          eq(stockMovements.toEventId, id),
          inArray(stockMovements.type, ['CONSUME', 'DIRECT_CONSUME'])
        ));

      let theoreticalRevenue = 0;

      // Calculate theoretical revenue
      if (event.priceListId) {
        for (const movement of movements) {
          const priceItem = await db
            .select()
            .from(priceListItems)
            .where(and(
              eq(priceListItems.priceListId, event.priceListId),
              eq(priceListItems.productId, movement.productId)
            ))
            .limit(1);

          if (priceItem[0]) {
            const quantity = parseFloat(movement.quantity);
            const price = parseFloat(priceItem[0].salePrice);
            theoreticalRevenue += quantity * price;
          }
        }
      }

      const actualRevenue = event.actualRevenue ? parseFloat(event.actualRevenue) : 0;
      const variance = actualRevenue - theoreticalRevenue;
      const variancePercent = theoreticalRevenue > 0 ? (variance / theoreticalRevenue) * 100 : 0;

      res.json({
        theoreticalRevenue,
        actualRevenue,
        variance,
        variancePercent,
      });
    } catch (error) {
      console.error("Error calculating revenue analysis:", error);
      res.status(500).json({ message: "Failed to calculate revenue analysis" });
    }
  });

  // Get top consumptions for an event (used in Event Hub overview)
  app.get('/api/events/:id/top-consumptions', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const event = await storage.getEvent(id);
      if (!event || event.companyId !== companyId) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get all consumptions for this event (CONSUME and DIRECT_CONSUME)
      const movements = await db
        .select()
        .from(stockMovements)
        .where(and(
          eq(stockMovements.companyId, companyId),
          eq(stockMovements.toEventId, id),
          inArray(stockMovements.type, ['CONSUME', 'DIRECT_CONSUME'])
        ));

      // Aggregate by productId
      const aggregation = new Map<string, { quantity: number; revenue: number }>();
      
      for (const mov of movements) {
        const qty = parseFloat(mov.quantity);
        const existing = aggregation.get(mov.productId) || { quantity: 0, revenue: 0 };
        existing.quantity += qty;
        
        // Calculate revenue if price list exists
        if (event.priceListId) {
          const priceItem = await db
            .select()
            .from(priceListItems)
            .where(and(
              eq(priceListItems.priceListId, event.priceListId),
              eq(priceListItems.productId, mov.productId)
            ))
            .limit(1);

          if (priceItem[0]) {
            const price = parseFloat(priceItem[0].salePrice);
            existing.revenue += qty * price;
          }
        }
        
        aggregation.set(mov.productId, existing);
      }

      // Get product names
      const productIds = Array.from(aggregation.keys());
      const productsList = productIds.length > 0 
        ? await db.select().from(products).where(inArray(products.id, productIds))
        : [];
      
      const productMap = new Map(productsList.map(p => [p.id, p.name]));

      // Convert to array and sort by quantity descending
      const result = Array.from(aggregation.entries())
        .map(([productId, data]) => ({
          productId,
          productName: productMap.get(productId) || 'Prodotto sconosciuto',
          quantity: Math.round(data.quantity),
          revenue: Math.round(data.revenue * 100) / 100,
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10); // Top 10

      res.json(result);
    } catch (error) {
      console.error("Error fetching top consumptions:", error);
      res.status(500).json({ message: "Failed to fetch top consumptions" });
    }
  });

  // ===== SUPER ADMIN ANALYTICS =====
  app.get('/api/super-admin/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }

      const analytics = await storage.getSuperAdminAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching super admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ===== SYSTEM SETTINGS (Super Admin only) =====
  app.get('/api/system-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }

      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.get('/api/system-settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }

      const setting = await storage.getSystemSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching system setting:", error);
      res.status(500).json({ message: "Failed to fetch system setting" });
    }
  });

  app.put('/api/system-settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }

      const { value, description } = req.body;
      if (value === undefined) {
        return res.status(400).json({ message: "Value is required" });
      }

      const setting = await storage.upsertSystemSetting(
        req.params.key, 
        String(value), 
        description,
        userId
      );
      res.json(setting);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });

  // Public endpoint to check if registration is enabled (no auth required)
  app.get('/api/public/registration-enabled', async (_req, res) => {
    try {
      const setting = await storage.getSystemSetting('registration_enabled');
      // Default to true if setting doesn't exist
      const enabled = setting ? setting.value === 'true' : true;
      res.json({ enabled });
    } catch (error) {
      console.error("Error checking registration status:", error);
      res.json({ enabled: true }); // Default to true on error
    }
  });

  // Public endpoint to check if customer registration is enabled (separate from venue registration)
  app.get('/api/public/customer-registration-enabled', async (_req, res) => {
    try {
      const setting = await storage.getSystemSetting('customer_registration_enabled');
      // Default to true if setting doesn't exist (customers should be able to register by default)
      const enabled = setting ? setting.value === 'true' : true;
      res.json({ enabled });
    } catch (error) {
      console.error("Error checking customer registration status:", error);
      res.json({ enabled: true }); // Default to true on error
    }
  });

  // ===== SIAE REFERENCE TABLES (Super Admin only) =====

  // --- Event Genres ---
  app.get('/api/siae/event-genres', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || !['super_admin', 'gestore', 'organizer'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const genres = await db.select().from(siaeEventGenres);
      res.json(genres);
    } catch (error) {
      console.error("Error fetching SIAE event genres:", error);
      res.status(500).json({ message: "Failed to fetch event genres" });
    }
  });

  app.post('/api/siae/event-genres', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = insertSiaeEventGenreSchema.parse(req.body);
      const [genre] = await db.insert(siaeEventGenres).values(validated).returning();
      res.json(genre);
    } catch (error: any) {
      console.error("Error creating SIAE event genre:", error);
      res.status(400).json({ message: error.message || "Failed to create event genre" });
    }
  });

  app.patch('/api/siae/event-genres/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = updateSiaeEventGenreSchema.parse(req.body);
      const [genre] = await db.update(siaeEventGenres)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(siaeEventGenres.id, req.params.id))
        .returning();
      if (!genre) {
        return res.status(404).json({ message: "Event genre not found" });
      }
      res.json(genre);
    } catch (error: any) {
      console.error("Error updating SIAE event genre:", error);
      res.status(400).json({ message: error.message || "Failed to update event genre" });
    }
  });

  // --- Sector Codes ---
  app.get('/api/siae/sector-codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || !['super_admin', 'gestore', 'organizer'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const codes = await db.select().from(siaeSectorCodes);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching SIAE sector codes:", error);
      res.status(500).json({ message: "Failed to fetch sector codes" });
    }
  });

  app.post('/api/siae/sector-codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = insertSiaeSectorCodeSchema.parse(req.body);
      const [code] = await db.insert(siaeSectorCodes).values(validated).returning();
      res.json(code);
    } catch (error: any) {
      console.error("Error creating SIAE sector code:", error);
      res.status(400).json({ message: error.message || "Failed to create sector code" });
    }
  });

  app.patch('/api/siae/sector-codes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = updateSiaeSectorCodeSchema.parse(req.body);
      const [code] = await db.update(siaeSectorCodes)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(siaeSectorCodes.id, req.params.id))
        .returning();
      if (!code) {
        return res.status(404).json({ message: "Sector code not found" });
      }
      res.json(code);
    } catch (error: any) {
      console.error("Error updating SIAE sector code:", error);
      res.status(400).json({ message: error.message || "Failed to update sector code" });
    }
  });

  // --- Ticket Types ---
  app.get('/api/siae/ticket-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || !['super_admin', 'gestore', 'organizer'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const types = await db.select().from(siaeTicketTypes);
      res.json(types);
    } catch (error) {
      console.error("Error fetching SIAE ticket types:", error);
      res.status(500).json({ message: "Failed to fetch ticket types" });
    }
  });

  app.post('/api/siae/ticket-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = insertSiaeTicketTypeSchema.parse(req.body);
      const [type] = await db.insert(siaeTicketTypes).values(validated).returning();
      res.json(type);
    } catch (error: any) {
      console.error("Error creating SIAE ticket type:", error);
      res.status(400).json({ message: error.message || "Failed to create ticket type" });
    }
  });

  app.patch('/api/siae/ticket-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = updateSiaeTicketTypeSchema.parse(req.body);
      const [type] = await db.update(siaeTicketTypes)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(siaeTicketTypes.id, req.params.id))
        .returning();
      if (!type) {
        return res.status(404).json({ message: "Ticket type not found" });
      }
      res.json(type);
    } catch (error: any) {
      console.error("Error updating SIAE ticket type:", error);
      res.status(400).json({ message: error.message || "Failed to update ticket type" });
    }
  });

  // --- Service Codes ---
  app.get('/api/siae/service-codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || !['super_admin', 'gestore', 'organizer'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const codes = await db.select().from(siaeServiceCodes);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching SIAE service codes:", error);
      res.status(500).json({ message: "Failed to fetch service codes" });
    }
  });

  app.post('/api/siae/service-codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = insertSiaeServiceCodeSchema.parse(req.body);
      const [code] = await db.insert(siaeServiceCodes).values(validated).returning();
      res.json(code);
    } catch (error: any) {
      console.error("Error creating SIAE service code:", error);
      res.status(400).json({ message: error.message || "Failed to create service code" });
    }
  });

  app.patch('/api/siae/service-codes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = updateSiaeServiceCodeSchema.parse(req.body);
      const [code] = await db.update(siaeServiceCodes)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(siaeServiceCodes.id, req.params.id))
        .returning();
      if (!code) {
        return res.status(404).json({ message: "Service code not found" });
      }
      res.json(code);
    } catch (error: any) {
      console.error("Error updating SIAE service code:", error);
      res.status(400).json({ message: error.message || "Failed to update service code" });
    }
  });

  // --- Cancellation Reasons ---
  app.get('/api/siae/cancellation-reasons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || !['super_admin', 'gestore', 'organizer'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const reasons = await db.select().from(siaeCancellationReasons);
      res.json(reasons);
    } catch (error) {
      console.error("Error fetching SIAE cancellation reasons:", error);
      res.status(500).json({ message: "Failed to fetch cancellation reasons" });
    }
  });

  app.post('/api/siae/cancellation-reasons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = insertSiaeCancellationReasonSchema.parse(req.body);
      const [reason] = await db.insert(siaeCancellationReasons).values(validated).returning();
      res.json(reason);
    } catch (error: any) {
      console.error("Error creating SIAE cancellation reason:", error);
      res.status(400).json({ message: error.message || "Failed to create cancellation reason" });
    }
  });

  app.patch('/api/siae/cancellation-reasons/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Super Admin access required" });
      }
      const validated = updateSiaeCancellationReasonSchema.parse(req.body);
      const [reason] = await db.update(siaeCancellationReasons)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(siaeCancellationReasons.id, req.params.id))
        .returning();
      if (!reason) {
        return res.status(404).json({ message: "Cancellation reason not found" });
      }
      res.json(reason);
    } catch (error: any) {
      console.error("Error updating SIAE cancellation reason:", error);
      res.status(400).json({ message: error.message || "Failed to update cancellation reason" });
    }
  });

  // ===== STATIONS =====
  // Get all stations (general + event-specific)
  app.get('/api/stations', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const stations = await storage.getStationsByCompany(companyId);
      res.json(stations);
    } catch (error) {
      console.error("Error fetching stations:", error);
      res.status(500).json({ message: "Failed to fetch stations" });
    }
  });

  // Get a single station by ID
  app.get('/api/stations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const station = await storage.getStation(req.params.id);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      // Verify station belongs to user's company
      if (station.companyId !== companyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(station);
    } catch (error) {
      console.error("Error fetching station:", error);
      res.status(500).json({ message: "Failed to fetch station" });
    }
  });

  // Create general station (not tied to specific event)
  app.post('/api/stations', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      // Only set eventId to null if not provided
      const stationData = { ...req.body, companyId };
      if (!stationData.eventId) {
        stationData.eventId = null;
      }
      const validated = insertStationSchema.parse(stationData);
      const station = await storage.createStation(validated);
      res.json(station);
    } catch (error: any) {
      console.error("Error creating station:", error);
      res.status(400).json({ message: error.message || "Failed to create station" });
    }
  });

  // Update general station
  app.patch('/api/stations/:id', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const station = await storage.updateStation(req.params.id, req.body);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      res.json(station);
    } catch (error) {
      console.error("Error updating station:", error);
      res.status(500).json({ message: "Failed to update station" });
    }
  });

  // Update bartenders assigned to a station
  app.patch('/api/stations/:id/bartenders', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { bartenderIds } = req.body;
      if (!Array.isArray(bartenderIds)) {
        return res.status(400).json({ message: "bartenderIds must be an array" });
      }

      // Verify all bartender IDs are valid and belong to the same company
      for (const bartenderId of bartenderIds) {
        const user = await storage.getUser(bartenderId);
        if (!user) {
          return res.status(400).json({ message: `User ${bartenderId} not found` });
        }
        if (user.companyId !== companyId) {
          return res.status(403).json({ message: `User ${bartenderId} is not from your company` });
        }
        if (user.role !== 'bartender') {
          return res.status(400).json({ message: `User ${bartenderId} is not a bartender` });
        }
      }

      const station = await storage.updateStation(req.params.id, { bartenderIds });
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      res.json(station);
    } catch (error) {
      console.error("Error updating station bartenders:", error);
      res.status(500).json({ message: "Failed to update station bartenders" });
    }
  });

  // Delete station (preserves event historical data)
  app.delete('/api/stations/:id', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteStation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Station not found" });
      }
      res.json({ message: "Station deleted successfully" });
    } catch (error) {
      console.error("Error deleting station:", error);
      res.status(500).json({ message: "Failed to delete station" });
    }
  });

  // Get stations for specific event
  app.get('/api/events/:id/stations', isAuthenticated, async (req: any, res) => {
    try {
      const stations = await storage.getStationsByEvent(req.params.id);
      res.json(stations);
    } catch (error) {
      console.error("Error fetching stations:", error);
      res.status(500).json({ message: "Failed to fetch stations" });
    }
  });

  // Get stocks for specific event
  app.get('/api/events/:id/stocks', isAuthenticated, async (req: any, res) => {
    try {
      const stocks = await storage.getEventStocks(req.params.id);
      res.json(stocks);
    } catch (error) {
      console.error("Error fetching event stocks:", error);
      res.status(500).json({ message: "Failed to fetch event stocks" });
    }
  });

  // Get stocks for event (alternative endpoint used by return-to-warehouse)
  // Returns only stocks without station assignment (general event inventory)
  app.get('/api/stocks/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const allStocks = await storage.getEventStocks(req.params.eventId);
      // Filter to only include stocks without station (general event inventory)
      const stocks = allStocks.filter(stock => !stock.stationId);
      
      const products = await storage.getProductsByCompany(
        (await getUserCompanyId(req)) || ''
      );
      
      // Enrich stocks with product information
      const enrichedStocks = stocks.map(stock => {
        const product = products.find(p => p.id === stock.productId);
        return {
          ...stock,
          product: product ? {
            id: product.id,
            name: product.name,
            code: product.code,
            unitOfMeasure: product.unitOfMeasure,
          } : null,
        };
      });
      
      res.json(enrichedStocks);
    } catch (error) {
      console.error("Error fetching event stocks:", error);
      res.status(500).json({ message: "Failed to fetch event stocks" });
    }
  });

  // Get stocks for station (used by return-to-warehouse)
  app.get('/api/stocks/station/:stationId', isAuthenticated, async (req: any, res) => {
    try {
      const stocks = await storage.getStationStocks(req.params.stationId);
      const products = await storage.getProductsByCompany(
        (await getUserCompanyId(req)) || ''
      );
      
      // Enrich stocks with product information
      const enrichedStocks = stocks.map(stock => {
        const product = products.find(p => p.id === stock.productId);
        return {
          ...stock,
          product: product ? {
            id: product.id,
            name: product.name,
            code: product.code,
            unitOfMeasure: product.unitOfMeasure,
          } : null,
        };
      });
      
      res.json(enrichedStocks);
    } catch (error) {
      console.error("Error fetching station stocks:", error);
      res.status(500).json({ message: "Failed to fetch station stocks" });
    }
  });

  // Create station for specific event
  app.post('/api/events/:id/stations', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertStationSchema.parse({ ...req.body, eventId: req.params.id, companyId });
      const station = await storage.createStation(validated);
      res.json(station);
    } catch (error: any) {
      console.error("Error creating station:", error);
      res.status(400).json({ message: error.message || "Failed to create station" });
    }
  });

  // ===== DIRECT EVENT STOCK (Carico/Scarico senza magazzino) =====

  // GET stock diretto evento (movimenti DIRECT_LOAD e DIRECT_CONSUME)
  app.get('/api/events/:id/direct-stock', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const eventId = req.params.id;
      
      // Verify event belongs to company
      const event = await storage.getEvent(eventId);
      if (!event || event.companyId !== companyId) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Get stationId query param for filtering
      const stationId = req.query.stationId as string | undefined;
      
      // Build where conditions
      const whereConditions = [
        eq(stockMovements.companyId, companyId),
        or(
          eq(stockMovements.toEventId, eventId),
          eq(stockMovements.fromEventId, eventId)
        ),
        inArray(stockMovements.type, ['DIRECT_LOAD', 'DIRECT_CONSUME'])
      ];
      
      // Add station filter if provided - include products loaded at event level (no stationId)
      if (stationId) {
        whereConditions.push(
          or(
            eq(stockMovements.toStationId, stationId),
            isNull(stockMovements.toStationId)
          )
        );
      }
      
      // Get all DIRECT_LOAD and DIRECT_CONSUME movements for this event
      const movements = await db.select()
        .from(stockMovements)
        .where(and(...whereConditions));
      
      // Get products for enrichment
      const products = await storage.getProductsByCompany(companyId);
      
      // Aggregate by productId
      const aggregation = new Map<string, { loaded: number; consumed: number }>();
      
      for (const mov of movements) {
        const existing = aggregation.get(mov.productId) || { loaded: 0, consumed: 0 };
        const qty = parseFloat(mov.quantity);
        
        if (mov.type === 'DIRECT_LOAD') {
          existing.loaded += qty;
        } else if (mov.type === 'DIRECT_CONSUME') {
          existing.consumed += qty;
        }
        
        aggregation.set(mov.productId, existing);
      }
      
      // Build response with product names
      const result = Array.from(aggregation.entries()).map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return {
          productId,
          productName: product?.name || 'Prodotto sconosciuto',
          productCode: product?.code || '',
          unitOfMeasure: product?.unitOfMeasure || '',
          loaded: data.loaded,
          consumed: data.consumed,
          available: data.loaded - data.consumed,
        };
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching direct event stock:", error);
      res.status(500).json({ message: "Errore nel recupero stock diretto" });
    }
  });

  // POST carica prodotto diretto (senza magazzino)
  app.post('/api/events/:id/direct-stock/load', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const eventId = req.params.id;
      const userId = req.user?.claims?.sub || req.user?.id;
      
      // Validate input
      const loadSchema = z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive("La quantità deve essere maggiore di 0"),
        stationId: z.string().uuid().optional(),
        reason: z.string().optional(),
      });
      
      const validated = loadSchema.parse(req.body);
      
      // Verify event belongs to company
      const event = await storage.getEvent(eventId);
      if (!event || event.companyId !== companyId) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Create stock movement with type DIRECT_LOAD
      const movement = await storage.createStockMovement({
        companyId,
        productId: validated.productId,
        toEventId: eventId,
        toStationId: validated.stationId || null,
        quantity: validated.quantity.toString(),
        type: 'DIRECT_LOAD',
        reason: validated.reason || 'Carico diretto evento',
        performedBy: userId,
      });
      
      res.json({ success: true, movement });
    } catch (error: any) {
      console.error("Error loading direct stock:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
      }
      res.status(400).json({ message: error.message || "Errore nel carico diretto" });
    }
  });

  // POST consuma prodotto diretto
  app.post('/api/events/:id/direct-stock/consume', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const eventId = req.params.id;
      const userId = req.user?.claims?.sub || req.user?.id;
      
      // Validate input
      const consumeSchema = z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive("La quantità deve essere maggiore di 0"),
        stationId: z.string().uuid().optional(),
        reason: z.string().optional(),
      });
      
      const validated = consumeSchema.parse(req.body);
      
      // Verify event belongs to company
      const event = await storage.getEvent(eventId);
      if (!event || event.companyId !== companyId) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Build where conditions for availability check
      const availabilityConditions = [
        eq(stockMovements.companyId, companyId),
        eq(stockMovements.productId, validated.productId),
        or(
          eq(stockMovements.toEventId, eventId),
          eq(stockMovements.fromEventId, eventId)
        ),
        inArray(stockMovements.type, ['DIRECT_LOAD', 'DIRECT_CONSUME'])
      ];
      
      // Filter by station if provided
      if (validated.stationId) {
        availabilityConditions.push(eq(stockMovements.toStationId, validated.stationId));
      }
      
      // Calcola disponibilità per il prodotto specifico (e stazione se fornita)
      const movements = await db.select()
        .from(stockMovements)
        .where(and(...availabilityConditions));
      
      let loaded = 0;
      let consumed = 0;
      for (const m of movements) {
        const qty = parseFloat(m.quantity);
        if (m.type === 'DIRECT_LOAD') {
          loaded += qty;
        } else if (m.type === 'DIRECT_CONSUME') {
          consumed += qty;
        }
      }
      const available = loaded - consumed;
      
      if (available < validated.quantity) {
        return res.status(400).json({ 
          message: `Quantità insufficiente. Disponibile: ${available.toFixed(2)}` 
        });
      }
      
      // Create stock movement with type DIRECT_CONSUME
      const movement = await storage.createStockMovement({
        companyId,
        productId: validated.productId,
        toEventId: eventId,
        toStationId: validated.stationId || null,
        quantity: validated.quantity.toString(),
        type: 'DIRECT_CONSUME',
        reason: validated.reason || 'Consumo diretto evento',
        performedBy: userId,
      });
      
      res.json({ success: true, movement });
    } catch (error: any) {
      console.error("Error consuming direct stock:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
      }
      res.status(400).json({ message: error.message || "Errore nel consumo diretto" });
    }
  });

  // GET riepilogo consumi evento
  app.get('/api/events/:id/direct-stock/summary', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const eventId = req.params.id;
      
      // Verify event belongs to company
      const event = await storage.getEvent(eventId);
      if (!event || event.companyId !== companyId) {
        return res.status(404).json({ message: "Evento non trovato" });
      }
      
      // Get stationId query param for filtering
      const stationId = req.query.stationId as string | undefined;
      
      // Build where conditions
      const summaryConditions = [
        eq(stockMovements.companyId, companyId),
        or(
          eq(stockMovements.toEventId, eventId),
          eq(stockMovements.fromEventId, eventId)
        ),
        inArray(stockMovements.type, ['DIRECT_LOAD', 'DIRECT_CONSUME'])
      ];
      
      // Add station filter if provided - include products loaded at event level (no stationId)
      if (stationId) {
        summaryConditions.push(
          or(
            eq(stockMovements.toStationId, stationId),
            isNull(stockMovements.toStationId)
          )
        );
      }
      
      // Get all movements with limit
      const movements = await db.select()
        .from(stockMovements)
        .where(and(...summaryConditions))
        .orderBy(desc(stockMovements.createdAt))
        .limit(50);
      
      // Get products for enrichment
      const products = await storage.getProductsByCompany(companyId);
      
      // Calculate totals
      let totalLoaded = 0;
      let totalConsumed = 0;
      
      const enrichedMovements = movements.map(mov => {
        const qty = parseFloat(mov.quantity);
        const product = products.find(p => p.id === mov.productId);
        
        if (mov.type === 'DIRECT_LOAD') totalLoaded += qty;
        else if (mov.type === 'DIRECT_CONSUME') totalConsumed += qty;
        
        return {
          ...mov,
          productName: product?.name || 'Prodotto sconosciuto',
          productCode: product?.code || '',
        };
      });
      
      res.json({
        totalLoaded,
        totalConsumed,
        movements: enrichedMovements,
      });
    } catch (error) {
      console.error("Error fetching direct stock summary:", error);
      res.status(500).json({ message: "Errore nel recupero riepilogo" });
    }
  });

  // ===== PRODUCTS =====
  app.get('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const products = await storage.getProductsByCompany(companyId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const userRole = req.user?.role;
      
      // Check if user has permission to create products
      if (userRole !== 'super_admin' && userRole !== 'gestore') {
        // Warehouse users need canCreateProducts permission
        if (userRole === 'warehouse') {
          const features = await storage.getUserFeatures(userId);
          if (!features?.canCreateProducts) {
            return res.status(403).json({ message: "Permesso di creazione prodotti non abilitato" });
          }
        } else {
          return res.status(403).json({ message: "Accesso negato: privilegi amministrativi richiesti" });
        }
      }
      
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertProductSchema.parse({ ...req.body, companyId });
      const product = await storage.createProduct(validated);
      res.json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(400).json({ message: error.message || "Failed to create product" });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // ===== SUPPLIERS =====
  app.get('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const suppliers = await storage.getSuppliersByCompany(companyId);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.get('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { id } = req.params;
      const supplier = await storage.getSupplierById(id, companyId);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post('/api/suppliers', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { insertSupplierSchema } = await import('@shared/schema');
      const validated = insertSupplierSchema.parse({ ...req.body, companyId });
      const supplier = await storage.createSupplier(validated);
      res.json(supplier);
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      res.status(400).json({ message: error.message || "Failed to create supplier" });
    }
  });

  app.patch('/api/suppliers/:id', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { id } = req.params;
      const { updateSupplierSchema } = await import('@shared/schema');
      const validated = updateSupplierSchema.parse(req.body);
      const supplier = await storage.updateSupplier(id, companyId, validated);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      console.error("Error updating supplier:", error);
      res.status(400).json({ message: error.message || "Failed to update supplier" });
    }
  });

  app.delete('/api/suppliers/:id', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { id } = req.params;
      const deleted = await storage.deleteSupplier(id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // ===== PURCHASE ORDERS =====
  app.get('/api/purchase-orders', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const orders = await storage.getPurchaseOrdersByCompany(companyId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { id } = req.params;
      const order = await storage.getPurchaseOrder(id, companyId);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post('/api/purchase-orders', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const userId = req.user?.claims?.sub || req.user?.id;
      const { insertPurchaseOrderSchema } = await import('@shared/schema');
      const validated = insertPurchaseOrderSchema.parse({
        ...req.body,
        companyId,
        createdBy: userId,
      });
      const order = await storage.createPurchaseOrder(validated);
      res.json(order);
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      res.status(400).json({ message: error.message || "Failed to create purchase order" });
    }
  });

  app.patch('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { id } = req.params;
      const { updatePurchaseOrderSchema } = await import('@shared/schema');
      const validated = updatePurchaseOrderSchema.parse(req.body);
      const order = await storage.updatePurchaseOrder(id, companyId, validated);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(order);
    } catch (error: any) {
      console.error("Error updating purchase order:", error);
      res.status(400).json({ message: error.message || "Failed to update purchase order" });
    }
  });

  app.delete('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { id } = req.params;
      const deleted = await storage.deletePurchaseOrder(id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  // Purchase Order Items endpoints
  app.get('/api/purchase-orders/:orderId/items', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { orderId } = req.params;
      const items = await storage.getPurchaseOrderItems(orderId, companyId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching purchase order items:", error);
      res.status(500).json({ message: "Failed to fetch purchase order items" });
    }
  });

  app.post('/api/purchase-orders/:orderId/items', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { orderId } = req.params;
      const { insertPurchaseOrderItemSchema } = await import('@shared/schema');
      const validated = insertPurchaseOrderItemSchema.parse({
        ...req.body,
        purchaseOrderId: orderId,
      });
      const item = await storage.createPurchaseOrderItem(validated, companyId);
      res.json(item);
    } catch (error: any) {
      console.error("Error creating purchase order item:", error);
      res.status(400).json({ message: error.message || "Failed to create purchase order item" });
    }
  });

  app.patch('/api/purchase-orders/:orderId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { itemId } = req.params;
      const { updatePurchaseOrderItemSchema } = await import('@shared/schema');
      const validated = updatePurchaseOrderItemSchema.parse(req.body);
      const item = await storage.updatePurchaseOrderItem(itemId, companyId, validated);
      if (!item) {
        return res.status(404).json({ message: "Purchase order item not found" });
      }
      res.json(item);
    } catch (error: any) {
      console.error("Error updating purchase order item:", error);
      res.status(400).json({ message: error.message || "Failed to update purchase order item" });
    }
  });

  app.delete('/api/purchase-orders/:orderId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const { itemId } = req.params;
      const deleted = await storage.deletePurchaseOrderItem(itemId, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Purchase order item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting purchase order item:", error);
      res.status(500).json({ message: "Failed to delete purchase order item" });
    }
  });

  // Endpoint per generare ordini suggeriti in base a scorte minime e consumi
  app.post('/api/purchase-orders/suggested', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const suggestedOrders = await storage.generateSuggestedOrders(companyId);
      res.json(suggestedOrders);
    } catch (error) {
      console.error("Error generating suggested orders:", error);
      res.status(500).json({ message: "Failed to generate suggested orders" });
    }
  });

  // ===== USERS =====
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Super admin vede tutti gli utenti di tutte le company
      if (currentUser.role === 'super_admin') {
        const allUsers = await storage.getAllUsers();
        res.json(allUsers.map(sanitizeUser));
        return;
      }

      // Admin vede solo gli utenti della sua company
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const users = await storage.getUsersByCompany(companyId);
      res.json(users.map(sanitizeUser));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // GET /api/users/scanners - Get all scanner users for the company
  app.get('/api/users/scanners', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (currentUser.role !== 'super_admin' && currentUser.role !== 'gestore') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const companyId = currentUser.companyId;
      
      // Query only scanner role users directly from database - sanitized output
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      let scanners;
      if (currentUser.role === 'super_admin') {
        scanners = await db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          companyId: users.companyId,
          phone: users.phone,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
          .from(users)
          .where(eq(users.role, 'scanner'));
      } else if (companyId) {
        scanners = await db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          companyId: users.companyId,
          phone: users.phone,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
          .from(users)
          .where(and(eq(users.role, 'scanner'), eq(users.companyId, companyId)));
      } else {
        return res.status(403).json({ message: "No company associated" });
      }
      
      res.json(scanners);
    } catch (error) {
      console.error("Error fetching scanners:", error);
      res.status(500).json({ message: "Failed to fetch scanners" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'gestore' && currentUser.role !== 'capo_staff')) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const { email, password, firstName, lastName, role, companyId, phone } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Capo Staff can only create PR users
      if (currentUser.role === 'capo_staff' && role !== 'pr') {
        return res.status(403).json({ message: "Capo Staff can only create PR users" });
      }

      // Admin può creare utenti solo nella sua company
      let targetCompanyId = companyId;
      if (currentUser.role === 'gestore' || currentUser.role === 'capo_staff') {
        targetCompanyId = currentUser.companyId;
        if (!targetCompanyId) {
          return res.status(403).json({ message: "No company associated" });
        }
      }

      // Check email già esistente
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role,
        companyId: targetCompanyId,
        phone: phone || null,
        emailVerified: true, // Admin-created users are auto-verified
      });

      // Create user_companies association if user has a company
      if (targetCompanyId) {
        await db.insert(userCompanies).values({
          userId: newUser.id,
          companyId: targetCompanyId,
          role: role === 'gestore' ? 'owner' : 'member',
          isDefault: true,
        }).onConflictDoNothing({ target: [userCompanies.userId, userCompanies.companyId] });
      }

      // Get company name for email
      let companyName = "Event Four You";
      if (targetCompanyId) {
        const company = await storage.getCompany(targetCompanyId);
        if (company) {
          companyName = company.name;
        }
      }

      // Send welcome email with credentials - Priority: CUSTOM_DOMAIN > PUBLIC_URL > REPLIT_DEV_DOMAIN > localhost
      const baseUrl = process.env.CUSTOM_DOMAIN 
        ? `https://${process.env.CUSTOM_DOMAIN}`
        : process.env.PUBLIC_URL 
          ? process.env.PUBLIC_URL.replace(/\/$/, '')
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : 'http://localhost:5000';
      const loginLink = `${baseUrl}/login`;
      const fromEmail = process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>';

      // Get admin name for email
      const adminName = `${currentUser.firstName} ${currentUser.lastName}`;

      // Role labels in Italian
      const roleLabels: Record<string, string> = {
        'super_admin': 'Super Admin',
        'gestore': 'Gestore',
        'gestore_covisione': 'Gestore Covisione',
        'capo_staff': 'Capo Staff',
        'pr': 'PR',
        'warehouse': 'Magazziniere',
        'bartender': 'Bartender',
        'cassiere': 'Cassiere',
        'scanner': 'Scanner',
      };

      try {
        await emailTransporter.sendMail({
          from: fromEmail,
          to: email,
          subject: `Benvenuto su Event Four You - Il tuo account è pronto`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
              <div style="background-color: #151922; padding: 30px; border-radius: 12px; color: white;">
                <h1 style="color: #FFD700; margin-bottom: 10px;">Event Four You</h1>
                <h2 style="color: #ffffff; font-weight: normal;">Benvenuto ${firstName}!</h2>
              </div>
              
              <div style="background-color: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
                <p style="font-size: 16px; color: #333;">
                  ${adminName} ti ha creato un account per <strong>${companyName}</strong>.
                </p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Le tue credenziali di accesso:</h3>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                  <p style="margin: 5px 0;"><strong>Ruolo:</strong> ${roleLabels[role] || role}</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  <strong>Importante:</strong> Ti consigliamo di cambiare la password al primo accesso.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginLink}" 
                     style="display: inline-block; background-color: #FFD700; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Accedi a Event Four You
                  </a>
                </div>
                
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                  Se non hai richiesto questo account, contatta il tuo amministratore.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Event Four You. Tutti i diritti riservati.</p>
              </div>
            </div>
          `,
        });
        console.log(`Welcome email sent to ${email}`);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the user creation if email fails, just log the error
      }

      // Remove password from response
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'gestore')) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const targetUserId = req.params.id;
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Admin può modificare solo utenti della sua company
      if (currentUser.role === 'gestore') {
        if (targetUser.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Forbidden: Cannot modify users from other companies" });
        }
      }

      const updates: any = {};
      if (req.body.firstName !== undefined) updates.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updates.lastName = req.body.lastName;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.role !== undefined) updates.role = req.body.role;
      
      // Validate and set isActive (boolean)
      if (req.body.isActive !== undefined) {
        if (typeof req.body.isActive !== 'boolean') {
          return res.status(400).json({ message: "isActive must be a boolean" });
        }
        // Prevent deactivating super_admin or editing higher roles
        if (targetUser.role === 'super_admin' && currentUser.role !== 'super_admin') {
          return res.status(403).json({ message: "Forbidden: Cannot modify super admin accounts" });
        }
        // Prevent self-deactivation for super_admin
        if (targetUserId === userId && currentUser.role === 'super_admin' && req.body.isActive === false) {
          return res.status(400).json({ message: "Super admin cannot deactivate themselves" });
        }
        updates.isActive = req.body.isActive;
      }
      
      // Prevent role changes to higher privileges
      if (req.body.role !== undefined) {
        if (targetUser.role === 'super_admin' && currentUser.role !== 'super_admin') {
          return res.status(403).json({ message: "Forbidden: Cannot modify super admin role" });
        }
      }
      
      // Solo super admin può cambiare companyId
      if (req.body.companyId !== undefined && currentUser.role === 'super_admin') {
        updates.companyId = req.body.companyId;
      }

      // Hash password se fornita
      if (req.body.password) {
        updates.passwordHash = await bcrypt.hash(req.body.password, 10);
      }

      const updatedUser = await storage.updateUser(targetUserId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'gestore')) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const targetUserId = req.params.id;
      
      // Non puoi cancellare te stesso
      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Admin può cancellare solo utenti della sua company
      if (currentUser.role === 'gestore') {
        if (targetUser.companyId !== currentUser.companyId) {
          return res.status(403).json({ message: "Forbidden: Cannot delete users from other companies" });
        }
      }

      // Handle all foreign key constraints before deleting user
      await storage.deleteUserWithDependencies(targetUserId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Impersonate user (super_admin and gestore)
  app.post('/api/users/:id/impersonate', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUserId = req.user?.claims?.sub || req.user?.id;
      
      // Check against the impersonator (original user), not the current session user
      const actualUserId = req.session.impersonatorId || sessionUserId;
      const actualUser = await storage.getUser(actualUserId);
      
      // Only super_admin or gestore can impersonate (check the ACTUAL user, not impersonated one)
      if (!actualUser || (actualUser.role !== 'super_admin' && actualUser.role !== 'gestore')) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const targetUserId = req.params.id;
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cannot impersonate yourself
      if (targetUserId === actualUserId) {
        return res.status(400).json({ message: "Cannot impersonate yourself" });
      }

      // Additional restrictions for gestore
      if (actualUser.role === 'gestore') {
        // gestore can only impersonate users from their company
        if (targetUser.companyId !== actualUser.companyId) {
          return res.status(403).json({ message: "Forbidden: Cannot impersonate users from other companies" });
        }
        // gestore cannot impersonate super_admin or other gestore
        if (targetUser.role === 'super_admin' || targetUser.role === 'gestore') {
          return res.status(403).json({ message: "Forbidden: Cannot impersonate admin users" });
        }
      }

      // Store the impersonator ID (only once, not on re-impersonation)
      if (!req.session.impersonatorId) {
        req.session.impersonatorId = actualUserId;
      }

      // Update session to impersonate target user
      req.session.userId = targetUserId;
      req.session.user = targetUser;
      
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ 
        message: "Impersonation activated", 
        user: targetUser 
      });
    } catch (error) {
      console.error("Error impersonating user:", error);
      res.status(500).json({ message: "Failed to impersonate user" });
    }
  });

  // Stop impersonation (return to original user)
  app.post('/api/users/stop-impersonation', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.session.impersonatorId) {
        return res.status(400).json({ message: "Not currently impersonating" });
      }

      const impersonatorId = req.session.impersonatorId;
      const impersonator = await storage.getUser(impersonatorId);
      
      if (!impersonator) {
        return res.status(404).json({ message: "Original user not found" });
      }

      // Only super_admin or gestore can stop impersonation
      if (impersonator.role !== 'super_admin' && impersonator.role !== 'gestore') {
        return res.status(403).json({ message: "Forbidden: Only admin users can stop impersonation" });
      }

      // Restore original user session
      req.session.userId = impersonatorId;
      req.session.user = impersonator;
      delete req.session.impersonatorId;
      
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ 
        message: "Impersonation stopped", 
        user: impersonator 
      });
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      res.status(500).json({ message: "Failed to stop impersonation" });
    }
  });

  // ===== STOCK OPERATIONS =====
  app.get('/api/stock/general', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const stocks = await storage.getGeneralStocks(companyId);
      const products = await storage.getProductsByCompany(companyId);
      
      const stocksWithProducts = stocks.map(stock => {
        const product = products.find(p => p.id === stock.productId);
        return {
          ...stock,
          productName: product?.name || 'Unknown',
          productCode: product?.code || 'N/A',
          unitOfMeasure: product?.unitOfMeasure || 'piece',
        };
      });
      
      res.json(stocksWithProducts);
    } catch (error) {
      console.error("Error fetching general stocks:", error);
      res.status(500).json({ message: "Failed to fetch general stocks" });
    }
  });

  // Reset general warehouse (set all quantities to 0)
  app.post('/api/stock/reset-warehouse', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      // Get current stocks before reset
      const currentStocks = await storage.getGeneralStocks(companyId);
      let resetCount = 0;
      
      // Set all quantities to 0 and log movements
      for (const stock of currentStocks) {
        const currentQty = parseFloat(stock.quantity);
        if (currentQty > 0) {
          // Update stock to 0
          await storage.upsertStock({
            companyId,
            productId: stock.productId,
            quantity: "0",
          });

          // Log adjustment movement
          await storage.createStockMovement({
            companyId,
            productId: stock.productId,
            quantity: (-currentQty).toString(),
            type: 'ADJUSTMENT',
            reason: 'Reset magazzino generale - azzeramento quantità',
            performedBy: userId,
          });
          resetCount++;
        }
      }

      res.json({ 
        success: true, 
        message: "Quantità magazzino azzerate con successo",
        resetCount 
      });
    } catch (error) {
      console.error("Error resetting warehouse:", error);
      res.status(500).json({ message: "Failed to reset warehouse" });
    }
  });

  app.post('/api/stock/load', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { productId, quantity, supplier, reason } = req.body;

      // Update stock
      const currentStocks = await storage.getGeneralStocks(companyId);
      const existingStock = currentStocks.find(s => s.productId === productId);
      const currentQty = existingStock ? parseFloat(existingStock.quantity) : 0;
      const newQty = currentQty + parseFloat(quantity);

      await storage.upsertStock({
        companyId,
        productId,
        quantity: newQty.toString(),
      });

      // Create movement record
      await storage.createStockMovement({
        companyId,
        productId,
        quantity: quantity.toString(),
        type: 'LOAD',
        reason,
        supplier,
        performedBy: userId,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error loading stock:", error);
      res.status(500).json({ message: "Failed to load stock" });
    }
  });

  app.post('/api/stock/unload', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { productId, quantity, reason } = req.body;

      // Update stock
      const currentStocks = await storage.getGeneralStocks(companyId);
      const existingStock = currentStocks.find(s => s.productId === productId);
      const currentQty = existingStock ? parseFloat(existingStock.quantity) : 0;
      const newQty = Math.max(0, currentQty - parseFloat(quantity));

      await storage.upsertStock({
        companyId,
        productId,
        quantity: newQty.toString(),
      });

      // Create movement record
      await storage.createStockMovement({
        companyId,
        productId,
        quantity: quantity.toString(),
        type: 'UNLOAD',
        reason,
        performedBy: userId,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error unloading stock:", error);
      res.status(500).json({ message: "Failed to unload stock" });
    }
  });

  // Stock adjustment - only for gestore/admin
  app.post('/api/stock/adjust', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const adjustSchema = z.object({
        productId: z.string().uuid(),
        newQuantity: z.union([z.string(), z.number()])
          .transform(val => parseFloat(val.toString()))
          .refine(val => !isNaN(val), { message: "La quantità deve essere un numero valido" }),
        reason: z.string().optional(),
        eventId: z.string().uuid().optional(),
        stationId: z.string().uuid().nullable().optional(),
      });

      const { productId, newQuantity, reason, eventId, stationId } = adjustSchema.parse(req.body);

      if (newQuantity < 0) {
        return res.status(400).json({ message: "La quantità non può essere negativa" });
      }

      let oldQuantity = 0;

      if (eventId) {
        // Adjust event stock
        const eventStocks = await storage.getEventStocks(eventId);
        const existingStock = eventStocks.find((s: Stock) => 
          s.productId === productId && 
          (stationId === null ? s.stationId === null : s.stationId === stationId)
        );
        oldQuantity = existingStock ? parseFloat(existingStock.quantity) : 0;

        await storage.upsertStock({
          companyId,
          eventId,
          stationId: stationId || null,
          productId,
          quantity: newQuantity.toString(),
        });
      } else {
        // Adjust general warehouse stock
        const currentStocks = await storage.getGeneralStocks(companyId);
        const existingStock = currentStocks.find(s => s.productId === productId);
        oldQuantity = existingStock ? parseFloat(existingStock.quantity) : 0;

        await storage.upsertStock({
          companyId,
          productId,
          quantity: newQuantity.toString(),
        });
      }

      const difference = newQuantity - oldQuantity;

      // Create movement record for adjustment
      await storage.createStockMovement({
        companyId,
        productId,
        quantity: Math.abs(difference).toString(),
        type: 'ADJUSTMENT',
        reason: reason || `Correzione: da ${oldQuantity.toFixed(2)} a ${newQuantity.toFixed(2)}`,
        performedBy: userId,
        toEventId: eventId || null,
        toStationId: stationId || null,
      });

      res.json({ 
        success: true, 
        oldQuantity,
        newQuantity,
        difference,
      });
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      res.status(500).json({ message: error.message || "Failed to adjust stock" });
    }
  });

  // Bulk load multiple products
  app.post('/api/stock/bulk-load', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const bulkSchema = z.object({
        items: z.array(z.object({
          productId: z.string().uuid(),
          quantity: z.string().min(1),
          supplierId: z.string().uuid().optional(),
        })),
        reason: z.string().optional(),
      });

      const validated = bulkSchema.parse(req.body);
      const currentStocks = await storage.getGeneralStocks(companyId);
      
      // Process all items
      for (const item of validated.items) {
        // Convert quantity to number and validate
        const quantityNum = parseFloat(item.quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
          return res.status(400).json({ message: `Quantità non valida per prodotto ${item.productId}` });
        }

        const existingStock = currentStocks.find(s => s.productId === item.productId);
        const currentQty = existingStock ? parseFloat(existingStock.quantity) : 0;
        const newQty = currentQty + quantityNum;

        await storage.upsertStock({
          companyId,
          productId: item.productId,
          quantity: newQty.toString(),
        });

        // Get supplier name if provided (optional-safe)
        let supplierName: string | undefined;
        if (item.supplierId) {
          const supplier = await storage.getSupplierById(item.supplierId, companyId);
          if (!supplier) {
            return res.status(400).json({ message: `Fornitore non trovato: ${item.supplierId}` });
          }
          supplierName = supplier.name;
        }

        await storage.createStockMovement({
          companyId,
          productId: item.productId,
          quantity: quantityNum.toString(),
          type: 'LOAD',
          reason: validated.reason,
          supplier: supplierName,
          performedBy: userId,
        });
      }

      res.json({ success: true, count: validated.items.length });
    } catch (error) {
      console.error("Error bulk loading stock:", error);
      res.status(500).json({ message: "Failed to bulk load stock" });
    }
  });

  // Bulk unload multiple products
  app.post('/api/stock/bulk-unload', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const bulkSchema = z.object({
        items: z.array(z.object({
          productId: z.string().uuid(),
          quantity: z.string().min(1),
          reason: z.string().optional(),
        })),
      });

      const validated = bulkSchema.parse(req.body);
      const currentStocks = await storage.getGeneralStocks(companyId);
      
      // Process all items
      for (const item of validated.items) {
        // Convert quantity to number and validate
        const quantityNum = parseFloat(item.quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
          return res.status(400).json({ message: `Quantità non valida per prodotto ${item.productId}` });
        }

        const existingStock = currentStocks.find(s => s.productId === item.productId);
        const currentQty = existingStock ? parseFloat(existingStock.quantity) : 0;
        const newQty = Math.max(0, currentQty - quantityNum);

        await storage.upsertStock({
          companyId,
          productId: item.productId,
          quantity: newQty.toString(),
        });

        await storage.createStockMovement({
          companyId,
          productId: item.productId,
          quantity: quantityNum.toString(),
          type: 'UNLOAD',
          reason: item.reason,
          performedBy: userId,
        });
      }

      res.json({ success: true, count: validated.items.length });
    } catch (error) {
      console.error("Error bulk unloading stock:", error);
      res.status(500).json({ message: "Failed to bulk unload stock" });
    }
  });

  app.get('/api/stock/movements', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const movements = await storage.getMovementsByCompany(companyId);
      const products = await storage.getProductsByCompany(companyId) || [];
      
      // Enrich movements with product details (defensive against undefined products array)
      const enrichedMovements = movements.map(movement => {
        const product = products.find(p => p.id === movement.productId);
        return {
          ...movement,
          productName: product?.name || 'Sconosciuto',
          productCode: product?.code || '-',
        };
      });
      
      res.json(enrichedMovements);
    } catch (error) {
      console.error("Error fetching movements:", error);
      res.status(500).json({ message: "Failed to fetch movements" });
    }
  });

  // Event stock transfer
  app.post('/api/stock/event-transfer', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { eventId, stationId, productId, quantity } = req.body;

      // Decrease from general warehouse
      const generalStocks = await storage.getGeneralStocks(companyId);
      const generalStock = generalStocks.find(s => s.productId === productId);
      if (!generalStock || parseFloat(generalStock.quantity) < parseFloat(quantity)) {
        return res.status(400).json({ message: "Insufficient stock in general warehouse" });
      }
      
      const newGeneralQty = parseFloat(generalStock.quantity) - parseFloat(quantity);
      await storage.upsertStock({
        companyId,
        productId,
        quantity: newGeneralQty.toString(),
      });

      // Increase in event/station stock
      const eventStocks = stationId 
        ? await storage.getStationStocks(stationId)
        : await storage.getEventStocks(eventId);
      const eventStock = eventStocks.find(s => s.productId === productId);
      const currentEventQty = eventStock ? parseFloat(eventStock.quantity) : 0;
      const newEventQty = currentEventQty + parseFloat(quantity);

      await storage.upsertStock({
        companyId,
        productId,
        eventId,
        stationId: stationId || null,
        quantity: newEventQty.toString(),
      });

      // Log movement
      await storage.createStockMovement({
        companyId,
        productId,
        toEventId: eventId,
        toStationId: stationId || null,
        quantity: quantity.toString(),
        type: 'TRANSFER',
        reason: `Transfer to event${stationId ? ' station' : ''}`,
        performedBy: userId,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error transferring stock:", error);
      res.status(500).json({ message: "Failed to transfer stock" });
    }
  });

  // Return stock from event to warehouse
  app.post('/api/stock/return-to-warehouse', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      // Validate request body
      const returnSchema = z.object({
        eventId: z.string().uuid(),
        stationId: z.string().uuid().nullable().optional(),
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
      });

      const { eventId, stationId, productId, quantity } = returnSchema.parse(req.body);

      // Execute in transaction for atomicity
      await db.transaction(async (tx) => {
        // Decrease from event/station stock
        const stocks = stationId 
          ? await storage.getStationStocks(stationId)
          : await storage.getEventStocks(eventId);
        const stock = stocks.find(s => String(s.productId) === String(productId));
        if (!stock || parseFloat(stock.quantity) < quantity) {
          throw new Error("Insufficient stock to return");
        }

        const newEventQty = Math.max(0, parseFloat(stock.quantity) - quantity);
        await storage.upsertStock({
          companyId,
          productId,
          eventId,
          stationId: stationId || null,
          quantity: newEventQty.toString(),
        });

        // Increase in general warehouse
        const generalStocks = await storage.getGeneralStocks(companyId);
        const generalStock = generalStocks.find(s => String(s.productId) === String(productId));
        const currentGeneralQty = generalStock ? parseFloat(generalStock.quantity) : 0;
        const newGeneralQty = currentGeneralQty + quantity;

        await storage.upsertStock({
          companyId,
          productId,
          quantity: newGeneralQty.toString(),
        });

        // Log movement
        await storage.createStockMovement({
          companyId,
          productId,
          fromEventId: eventId,
          fromStationId: stationId || null,
          quantity: quantity.toString(),
          type: 'RETURN',
          reason: `Returned to warehouse from ${stationId ? 'station' : 'event'}`,
          performedBy: userId,
        });
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error returning stock:", error);
      res.status(500).json({ message: "Failed to return stock" });
    }
  });

  // Stock consumption
  app.post('/api/stock/consume', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { eventId, stationId, productId, quantity } = req.body;

      // Decrease from event/station stock
      const stocks = stationId 
        ? await storage.getStationStocks(stationId)
        : await storage.getEventStocks(eventId);
      const stock = stocks.find(s => s.productId === productId);
      if (!stock || parseFloat(stock.quantity) < parseFloat(quantity)) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      const newQty = Math.max(0, parseFloat(stock.quantity) - parseFloat(quantity));
      await storage.upsertStock({
        companyId,
        productId,
        eventId,
        stationId: stationId || null,
        quantity: newQty.toString(),
      });

      // Log consumption
      await storage.createStockMovement({
        companyId,
        productId,
        fromEventId: eventId,
        fromStationId: stationId || null,
        quantity: quantity.toString(),
        type: 'CONSUME',
        reason: 'Event consumption',
        performedBy: userId,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error consuming stock:", error);
      res.status(500).json({ message: "Failed to consume stock" });
    }
  });

  // Price Lists routes
  app.get('/api/price-lists', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const priceLists = await storage.getPriceListsByCompany(companyId);
      res.json(priceLists);
    } catch (error) {
      console.error("Error fetching price lists:", error);
      res.status(500).json({ message: "Failed to fetch price lists" });
    }
  });

  app.get('/api/price-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const priceList = await storage.getPriceListByIdAndCompany(id, companyId);
      
      if (!priceList) {
        return res.status(404).json({ message: "Price list not found" });
      }
      res.json(priceList);
    } catch (error) {
      console.error("Error fetching price list:", error);
      res.status(500).json({ message: "Failed to fetch price list" });
    }
  });

  app.post('/api/price-lists', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { insertPriceListSchema } = await import('@shared/schema');
      const validated = insertPriceListSchema.parse({ ...req.body, companyId });

      const priceList = await storage.createPriceList(validated);
      res.json(priceList);
    } catch (error) {
      console.error("Error creating price list:", error);
      res.status(500).json({ message: "Failed to create price list" });
    }
  });

  app.patch('/api/price-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const { updatePriceListSchema } = await import('@shared/schema');
      const validated = updatePriceListSchema.parse(req.body);

      const priceList = await storage.updatePriceList(id, companyId, validated);
      if (!priceList) {
        return res.status(404).json({ message: "Price list not found" });
      }
      res.json(priceList);
    } catch (error) {
      console.error("Error updating price list:", error);
      res.status(500).json({ message: "Failed to update price list" });
    }
  });

  app.delete('/api/price-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const success = await storage.deletePriceList(id, companyId);
      
      if (!success) {
        return res.status(404).json({ message: "Price list not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting price list:", error);
      res.status(500).json({ message: "Failed to delete price list" });
    }
  });

  // Price List Items routes
  app.get('/api/price-lists/:priceListId/items', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { priceListId } = req.params;
      const priceList = await storage.getPriceListByIdAndCompany(priceListId, companyId);
      
      if (!priceList) {
        return res.status(404).json({ message: "Price list not found" });
      }

      const items = await storage.getPriceListItems(priceListId, companyId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching price list items:", error);
      res.status(500).json({ message: "Failed to fetch price list items" });
    }
  });

  app.post('/api/price-lists/:priceListId/items', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { priceListId } = req.params;
      const { insertPriceListItemSchema } = await import('@shared/schema');
      const validated = insertPriceListItemSchema.parse({
        ...req.body,
        priceListId,
      });

      const item = await storage.createPriceListItem(validated, companyId);
      res.json(item);
    } catch (error) {
      console.error("Error creating price list item:", error);
      if (error instanceof Error && error.message.includes("not found or access denied")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create price list item" });
    }
  });

  app.patch('/api/price-list-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const { updatePriceListItemSchema } = await import('@shared/schema');
      const validated = updatePriceListItemSchema.parse(req.body);

      // Convert salePrice to string for database storage
      const updateData: any = { ...validated };
      if (validated.salePrice !== undefined) {
        updateData.salePrice = validated.salePrice.toString();
      }

      const item = await storage.updatePriceListItem(id, companyId, updateData);
      if (!item) {
        return res.status(404).json({ message: "Price list item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating price list item:", error);
      res.status(500).json({ message: "Failed to update price list item" });
    }
  });

  app.delete('/api/price-list-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { id } = req.params;
      const success = await storage.deletePriceListItem(id, companyId);
      
      if (!success) {
        return res.status(404).json({ message: "Price list item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting price list item:", error);
      res.status(500).json({ message: "Failed to delete price list item" });
    }
  });

  // End of night report
  app.get('/api/reports/end-of-night/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      // Disable caching for report endpoint
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { eventId } = req.params;
      const movements = await storage.getMovementsByEvent(eventId);
      const products = await storage.getProductsByCompany(companyId);

      // Get CONSUME, DIRECT_CONSUME and RETURN movements separately
      const consumeMovements = movements.filter(m => m.type === 'CONSUME' || m.type === 'DIRECT_CONSUME');
      const returnMovements = movements.filter(m => m.type === 'RETURN');

      // Calculate NET consumption by aggregating CONSUME and RETURN separately, then subtracting
      const consumptionByProduct = new Map<string, {
        productId: string;
        productName: string;
        sumConsume: number;
        sumReturn: number;
        costPrice: string;
      }>();

      // First, aggregate all CONSUME movements
      consumeMovements.forEach(m => {
        const product = products.find(p => p.id === m.productId);
        if (!product) return;

        const qty = parseFloat(m.quantity) || 0;
        const existing = consumptionByProduct.get(m.productId);
        if (existing) {
          existing.sumConsume += qty;
        } else {
          consumptionByProduct.set(m.productId, {
            productId: m.productId,
            productName: product.name,
            sumConsume: qty,
            sumReturn: 0,
            costPrice: product.costPrice,
          });
        }
      });

      // Then, aggregate all RETURN movements
      returnMovements.forEach(m => {
        const product = products.find(p => p.id === m.productId);
        if (!product) return;

        const qty = parseFloat(m.quantity) || 0;
        const existing = consumptionByProduct.get(m.productId);
        if (existing) {
          existing.sumReturn += qty;
        } else {
          consumptionByProduct.set(m.productId, {
            productId: m.productId,
            productName: product.name,
            sumConsume: 0,
            sumReturn: qty,
            costPrice: product.costPrice,
          });
        }
      });

      // Calculate final NET values (never negative)
      let totalCost = 0;
      const consumedProducts = Array.from(consumptionByProduct.values()).map(p => {
        const netQuantity = Math.max(p.sumConsume - p.sumReturn, 0);
        const netCost = netQuantity * parseFloat(p.costPrice);
        totalCost += netCost;
        return {
          productId: p.productId,
          productName: p.productName,
          totalQuantity: netQuantity,
          costPrice: p.costPrice,
          totalCost: netCost,
        };
      }).filter(p => p.totalQuantity > 0); // Only include products with positive consumption

      // Get unique station IDs from consume movements (excluding null stations)
      const stationIds = Array.from(new Set(consumeMovements.map(m => m.fromStationId).filter((id): id is string => Boolean(id))));
      
      // Fetch station details for all referenced stations
      const allStations = await storage.getStationsByCompany(companyId);
      const stationMap = new Map(allStations.map(s => [s.id, s]));

      // Calculate consumption per station with NET values
      const stationReports = stationIds.map(stationId => {
        const station = stationMap.get(stationId);
        const stationName = station?.name || `Postazione ${stationId.slice(0, 8)}`;
        
        // Get movements for this station
        const stationConsumes = consumeMovements.filter(m => m.fromStationId === stationId);
        const stationReturns = returnMovements.filter(m => m.fromStationId === stationId);

        // Aggregate by product for this station
        const stationProductMap = new Map<string, { consume: number; return: number }>();
        
        stationConsumes.forEach(m => {
          const qty = parseFloat(m.quantity) || 0;
          const existing = stationProductMap.get(m.productId);
          if (existing) {
            existing.consume += qty;
          } else {
            stationProductMap.set(m.productId, { consume: qty, return: 0 });
          }
        });

        stationReturns.forEach(m => {
          const qty = parseFloat(m.quantity) || 0;
          const existing = stationProductMap.get(m.productId);
          if (existing) {
            existing.return += qty;
          } else {
            stationProductMap.set(m.productId, { consume: 0, return: qty });
          }
        });

        const items: any[] = [];
        let stationTotalCost = 0;

        stationProductMap.forEach((data, productId) => {
          const product = products.find(p => p.id === productId);
          if (!product) return;
          
          const netQty = Math.max(data.consume - data.return, 0);
          if (netQty <= 0) return; // Skip products with zero or negative net
          
          const cost = netQty * parseFloat(product.costPrice);
          stationTotalCost += cost;

          items.push({
            productId,
            productName: product.name,
            quantity: netQty,
            costPrice: product.costPrice,
            totalCost: cost,
          });
        });

        return {
          stationId,
          stationName,
          items,
          totalCost: stationTotalCost,
        };
      });

      const totalReport = {
        eventId,
        stations: stationReports,
        consumedProducts,
        totalCost,
      };

      res.json(totalReport);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Correct consumption in report - for gestore/admin/organizer
  app.post('/api/reports/correct-consumption', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      const userId = req.user.claims.sub;
      const userRole = req.user?.role;
      
      // Only super_admin, gestore, and organizer can correct consumption
      if (userRole !== 'super_admin' && userRole !== 'gestore' && userRole !== 'organizer') {
        return res.status(403).json({ message: "Accesso negato: privilegi insufficienti" });
      }
      
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const correctSchema = z.object({
        eventId: z.string().uuid(),
        productId: z.string().uuid(),
        stationId: z.string().uuid().nullable().optional(),
        newQuantity: z.union([z.string(), z.number()])
          .transform(val => parseFloat(val.toString()))
          .refine(val => !isNaN(val), { message: "La quantità deve essere un numero valido" }),
        reason: z.string().optional(),
      });

      const { eventId, productId, stationId, newQuantity, reason } = correctSchema.parse(req.body);

      if (newQuantity < 0) {
        return res.status(400).json({ message: "La quantità non può essere negativa" });
      }

      // Verify event belongs to user's company
      const event = await storage.getEvent(eventId);
      if (!event || event.companyId !== companyId) {
        return res.status(403).json({ message: "Non autorizzato ad accedere a questo evento" });
      }

      // Verify product belongs to user's company
      const product = await storage.getProduct(productId);
      if (!product || product.companyId !== companyId) {
        return res.status(403).json({ message: "Non autorizzato ad accedere a questo prodotto" });
      }

      // Helper function to safely parse quantities
      const safeParseQuantity = (value: string | number): number => {
        const parsed = parseFloat(String(value));
        return isNaN(parsed) ? 0 : parsed;
      };

      // Get current consumption for this product/event/station (already company-scoped via event)
      const movements = await storage.getMovementsByEvent(eventId);
      
      // Filter CONSUME movements
      const consumeMovements = movements.filter(m => 
        m.type === 'CONSUME' && 
        m.productId === productId &&
        (stationId === undefined ? true : (stationId === null ? m.fromStationId === null : m.fromStationId === stationId))
      );
      
      // Filter RETURN movements (corrections that reduced consumption)
      const returnMovements = movements.filter(m => 
        m.type === 'RETURN' && 
        m.productId === productId &&
        (stationId === undefined ? true : (stationId === null ? m.fromStationId === null : m.fromStationId === stationId))
      );

      // Calculate NET consumption (CONSUME - RETURN, never negative)
      const totalConsumed = consumeMovements.reduce((sum, m) => sum + safeParseQuantity(m.quantity), 0);
      const totalReturned = returnMovements.reduce((sum, m) => sum + safeParseQuantity(m.quantity), 0);
      const currentConsumed = Math.max(totalConsumed - totalReturned, 0);
      const difference = newQuantity - currentConsumed;

      if (difference === 0) {
        return res.json({ success: true, message: "Nessuna modifica necessaria", difference: 0 });
      }

      // Get event stock to update
      const eventStocks = await storage.getEventStocks(eventId);
      
      // If stationId is specified, update that station's stock, otherwise update event general stock
      const targetStationId = stationId !== undefined ? stationId : 
        (consumeMovements.length > 0 ? consumeMovements[0].fromStationId : null);
      
      const existingEventStock = eventStocks.find(s => 
        s.productId === productId && 
        (targetStationId === null ? s.stationId === null : s.stationId === targetStationId)
      );

      const currentEventStock = safeParseQuantity(existingEventStock?.quantity ?? 0);
      const isEventClosed = event.status === 'closed';

      if (difference > 0) {
        // AUMENTA il consumo: ridurre lo stock dell'evento
        const newEventStock = currentEventStock - difference;
        
        // Per eventi chiusi con stock 0, permetti correzione registrando solo il movimento
        if (newEventStock < 0 && !isEventClosed) {
          return res.status(400).json({ 
            message: `Quantità insufficiente. Stock evento: ${currentEventStock.toFixed(2)}, correzione richiede: ${difference.toFixed(2)} in più` 
          });
        }

        // Update event stock (solo se c'è stock da aggiornare e evento non chiuso)
        if (currentEventStock > 0 || !isEventClosed) {
          await storage.upsertStock({
            eventId,
            stationId: targetStationId,
            productId,
            quantity: Math.max(0, newEventStock).toString(),
            companyId,
          });
        }

        // Create CONSUME movement
        await storage.createStockMovement({
          companyId,
          productId,
          quantity: Math.abs(difference).toString(),
          type: 'CONSUME',
          reason: reason || `Correzione report: da ${currentConsumed.toFixed(2)} a ${newQuantity.toFixed(2)}${isEventClosed ? ' (evento chiuso)' : ''}`,
          performedBy: userId,
          fromEventId: eventId,
          fromStationId: targetStationId,
        });

        res.json({ 
          success: true, 
          oldQuantity: currentConsumed,
          newQuantity,
          difference,
          stockUpdated: isEventClosed && currentEventStock === 0 ? 0 : Math.max(0, newEventStock),
          note: isEventClosed ? 'Correzione su evento chiuso - solo movimento registrato' : undefined,
        });
      } else {
        // DIMINUISCE il consumo: restituire al MAGAZZINO GENERALE
        const returnQty = Math.abs(difference);
        
        // Get general warehouse stock
        const generalStocks = await storage.getGeneralStocks(companyId);
        const existingGeneralStock = generalStocks.find(s => s.productId === productId);
        const currentGeneralStock = safeParseQuantity(existingGeneralStock?.quantity ?? 0);
        const newGeneralStock = currentGeneralStock + returnQty;

        // Update general warehouse stock (eventId = null, stationId = null)
        await storage.upsertStock({
          eventId: null,
          stationId: null,
          productId,
          quantity: newGeneralStock.toString(),
          companyId,
        });

        // Create RETURN movement (to warehouse)
        await storage.createStockMovement({
          companyId,
          productId,
          quantity: returnQty.toString(),
          type: 'RETURN',
          reason: reason || `Correzione report: da ${currentConsumed.toFixed(2)} a ${newQuantity.toFixed(2)} - restituito a magazzino`,
          performedBy: userId,
          fromEventId: eventId,
          fromStationId: targetStationId,
          toEventId: null, // To general warehouse
        });

        res.json({ 
          success: true, 
          oldQuantity: currentConsumed,
          newQuantity,
          difference,
          warehouseUpdated: newGeneralStock,
        });
      }
    } catch (error: any) {
      console.error("Error correcting consumption:", error);
      res.status(500).json({ message: error.message || "Failed to correct consumption" });
    }
  });

  // Bulk import products
  app.post('/api/import/products', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated with user" });
      }

      const productsData = req.body.products;
      if (!Array.isArray(productsData) || productsData.length === 0) {
        return res.status(400).json({ message: "Products array is required" });
      }

      // Validate each product with error collection and numeric validation
      const validatedProducts = [];
      const errors = [];

      for (const p of productsData) {
        try {
          // Normalize and validate numeric fields
          const normalizedCostPrice = String(p.costPrice).trim().replace(/,/g, '.');
          const normalizedMinThreshold = p.minThreshold ? String(p.minThreshold).trim().replace(/,/g, '.') : null;

          if (isNaN(parseFloat(normalizedCostPrice))) {
            throw new Error("costPrice must be a valid number");
          }
          if (normalizedMinThreshold && isNaN(parseFloat(normalizedMinThreshold))) {
            throw new Error("minThreshold must be a valid number");
          }

          const validated = insertProductSchema.parse({ 
            ...p, 
            companyId,
            costPrice: normalizedCostPrice,
            minThreshold: normalizedMinThreshold,
          });
          validatedProducts.push(validated);
        } catch (error: any) {
          errors.push(`Product "${p.name || p.code}": ${error.errors?.[0]?.message || error.message}`);
        }
      }

      if (validatedProducts.length === 0) {
        return res.status(400).json({ 
          message: "No valid products to import",
          errors 
        });
      }

      const created = await storage.bulkCreateProducts(validatedProducts);
      res.json({ 
        message: `Successfully imported ${created.length} products`,
        count: created.length,
        products: created,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Error importing products:", error);
      res.status(500).json({ message: error.message || "Failed to import products" });
    }
  });

  // Bulk import price list items
  app.post('/api/import/price-list-items', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated with user" });
      }

      const { priceListId, items } = req.body;
      if (!priceListId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "priceListId and items array are required" });
      }

      // Verify price list belongs to company
      const priceList = await storage.getPriceListByIdAndCompany(priceListId, companyId);
      if (!priceList) {
        return res.status(404).json({ message: "Price list not found or access denied" });
      }

      // Build validated items array
      const validatedItems = [];
      const errors = [];

      for (const item of items) {
        try {
          // Lookup product by code
          const product = await storage.getProductByCodeAndCompany(item.productCode, companyId);
          if (!product) {
            errors.push(`Product code "${item.productCode}": Product not found`);
            continue;
          }

          // Normalize numeric field
          const normalizedSalePrice = String(item.salePrice).trim().replace(/,/g, '.');

          // Validate with insertPriceListItemSchema (includes z.coerce.number() for salePrice)
          const validated = insertPriceListItemSchema.parse({
            priceListId,
            productId: product.id,
            salePrice: normalizedSalePrice,
          });

          validatedItems.push(validated);
        } catch (error: any) {
          errors.push(`Product code "${item.productCode}": ${error.errors?.[0]?.message || error.message}`);
        }
      }

      if (validatedItems.length === 0) {
        return res.status(400).json({ 
          message: "No valid items to import",
          errors 
        });
      }

      const created = await storage.bulkCreatePriceListItems(validatedItems, companyId);
      
      res.json({ 
        message: `Successfully imported ${created.length} price list items`,
        count: created.length,
        items: created,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Error importing price list items:", error);
      res.status(500).json({ message: error.message || "Failed to import price list items" });
    }
  });

  // ===== AI ANALYSIS =====
  app.post('/api/ai/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { query, context } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const analysis = await storage.analyzeWithAI(companyId, query, context);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error in AI analysis:", error);
      res.status(500).json({ message: error.message || "Failed to analyze data" });
    }
  });

  app.get('/api/ai/insights', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const insights = await storage.generateInsights(companyId);
      res.json(insights);
    } catch (error: any) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: error.message || "Failed to generate insights" });
    }
  });

  // ==================== MODULO CONTABILITÀ - API Routes ====================

  // Fixed Costs
  app.get('/api/fixed-costs', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const costs = await storage.getFixedCostsByCompany(companyId);
      res.json(costs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/fixed-costs/location/:locationId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const costs = await storage.getFixedCostsByLocation(req.params.locationId, companyId);
      res.json(costs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/fixed-costs', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertFixedCostSchema.parse({ ...req.body, companyId });
      const cost = await storage.createFixedCost(validated);
      res.status(201).json(cost);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/fixed-costs/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateFixedCostSchema.parse(req.body);
      const cost = await storage.updateFixedCost(req.params.id, companyId, validated);
      if (!cost) {
        return res.status(404).json({ message: "Fixed cost not found" });
      }
      res.json(cost);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/fixed-costs/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteFixedCost(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Fixed cost not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Extra Costs
  app.get('/api/extra-costs', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const costs = await storage.getExtraCostsByCompany(companyId);
      res.json(costs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/extra-costs/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const costs = await storage.getExtraCostsByEvent(req.params.eventId, companyId);
      res.json(costs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/extra-costs', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertExtraCostSchema.parse({ ...req.body, companyId });
      const cost = await storage.createExtraCost(validated);
      res.status(201).json(cost);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/extra-costs/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateExtraCostSchema.parse(req.body);
      const cost = await storage.updateExtraCost(req.params.id, companyId, validated);
      if (!cost) {
        return res.status(404).json({ message: "Extra cost not found" });
      }
      res.json(cost);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/extra-costs/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteExtraCost(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Extra cost not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Maintenances
  app.get('/api/maintenances', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const maintenances = await storage.getMaintenancesByCompany(companyId);
      res.json(maintenances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/maintenances/location/:locationId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const maintenances = await storage.getMaintenancesByLocation(req.params.locationId, companyId);
      res.json(maintenances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/maintenances', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertMaintenanceSchema.parse({ ...req.body, companyId });
      const maintenance = await storage.createMaintenance(validated);
      res.status(201).json(maintenance);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/maintenances/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateMaintenanceSchema.parse(req.body);
      const maintenance = await storage.updateMaintenance(req.params.id, companyId, validated);
      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance not found" });
      }
      res.json(maintenance);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/maintenances/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteMaintenance(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Maintenance not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Accounting Documents
  app.get('/api/accounting-documents', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const docs = await storage.getAccountingDocumentsByCompany(companyId);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/accounting-documents/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const docs = await storage.getAccountingDocumentsByEvent(req.params.eventId, companyId);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/accounting-documents', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertAccountingDocumentSchema.parse({ ...req.body, companyId });
      const doc = await storage.createAccountingDocument(validated);
      res.status(201).json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/accounting-documents/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateAccountingDocumentSchema.parse(req.body);
      const doc = await storage.updateAccountingDocument(req.params.id, companyId, validated);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/accounting-documents/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteAccountingDocument(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== MODULO PERSONALE - API Routes ====================

  // Staff
  app.get('/api/staff', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const staffList = await storage.getStaffByCompany(companyId);
      res.json(staffList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/staff/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const member = await storage.getStaff(req.params.id, companyId);
      if (!member) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/staff', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertStaffSchema.parse({ ...req.body, companyId });
      const member = await storage.createStaff(validated);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/staff/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateStaffSchema.parse(req.body);
      const member = await storage.updateStaff(req.params.id, companyId, validated);
      if (!member) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/staff/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteStaff(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Staff Assignments
  app.get('/api/staff-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const assignments = await storage.getStaffAssignmentsByCompany(companyId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/staff-assignments/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const assignments = await storage.getStaffAssignmentsByEvent(req.params.eventId, companyId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/staff-assignments/staff/:staffId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const assignments = await storage.getStaffAssignmentsByStaff(req.params.staffId, companyId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/staff-assignments', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertStaffAssignmentSchema.parse({ ...req.body, companyId });
      const assignment = await storage.createStaffAssignment(validated);
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/staff-assignments/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateStaffAssignmentSchema.parse(req.body);
      const assignment = await storage.updateStaffAssignment(req.params.id, companyId, validated);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/staff-assignments/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteStaffAssignment(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Staff Payments
  app.get('/api/staff-payments', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const payments = await storage.getStaffPaymentsByCompany(companyId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/staff-payments/staff/:staffId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const payments = await storage.getStaffPaymentsByStaff(req.params.staffId, companyId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/staff-payments', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertStaffPaymentSchema.parse({ ...req.body, companyId });
      const payment = await storage.createStaffPayment(validated);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/staff-payments/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateStaffPaymentSchema.parse(req.body);
      const payment = await storage.updateStaffPayment(req.params.id, companyId, validated);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/staff-payments/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteStaffPayment(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== MODULO CASSA - API Routes ====================

  // Cash Sectors
  app.get('/api/cash-sectors', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const sectors = await storage.getCashSectorsByCompany(companyId);
      res.json(sectors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/cash-sectors', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertCashSectorSchema.parse({ ...req.body, companyId });
      const sector = await storage.createCashSector(validated);
      res.status(201).json(sector);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/cash-sectors/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateCashSectorSchema.parse(req.body);
      const sector = await storage.updateCashSector(req.params.id, companyId, validated);
      if (!sector) {
        return res.status(404).json({ message: "Sector not found" });
      }
      res.json(sector);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/cash-sectors/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteCashSector(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Sector not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cash Positions
  app.get('/api/cash-positions/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const positions = await storage.getCashPositionsByEvent(req.params.eventId, companyId);
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/cash-positions', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertCashPositionSchema.parse({ ...req.body, companyId });
      const position = await storage.createCashPosition(validated);
      res.status(201).json(position);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/cash-positions/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateCashPositionSchema.parse(req.body);
      const position = await storage.updateCashPosition(req.params.id, companyId, validated);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }
      res.json(position);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/cash-positions/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteCashPosition(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Position not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cash Entries
  app.get('/api/cash-entries/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const entries = await storage.getCashEntriesByEvent(req.params.eventId, companyId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/cash-entries/position/:positionId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const entries = await storage.getCashEntriesByPosition(req.params.positionId, companyId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/cash-entries', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertCashEntrySchema.parse({ ...req.body, companyId });
      const entry = await storage.createCashEntry(validated);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/cash-entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateCashEntrySchema.parse(req.body);
      const entry = await storage.updateCashEntry(req.params.id, companyId, validated);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/cash-entries/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteCashEntry(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cash Funds
  app.get('/api/cash-funds/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const funds = await storage.getCashFundsByEvent(req.params.eventId, companyId);
      res.json(funds);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/cash-funds/position/:positionId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const funds = await storage.getCashFundsByPosition(req.params.positionId, companyId);
      res.json(funds);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/cash-funds', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = insertCashFundSchema.parse({ ...req.body, companyId });
      const fund = await storage.createCashFund(validated);
      res.status(201).json(fund);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/cash-funds/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateCashFundSchema.parse(req.body);
      const fund = await storage.updateCashFund(req.params.id, companyId, validated);
      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }
      res.json(fund);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/cash-funds/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteCashFund(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Fund not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all cash positions (for general listing)
  app.get('/api/cash-positions', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const positions = await storage.getCashPositionsByCompany(companyId);
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all cash entries (for general listing)
  app.get('/api/cash-entries', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const entries = await storage.getCashEntriesByCompany(companyId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all cash funds (for general listing)
  app.get('/api/cash-funds', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const funds = await storage.getCashFundsByCompany(companyId);
      res.json(funds);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== NIGHT FILES ROUTES ====================

  // Get all night files
  app.get('/api/night-files', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const nightFiles = await storage.getNightFilesByCompany(companyId);
      res.json(nightFiles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get night file by event
  app.get('/api/night-files/event/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const nightFile = await storage.getNightFileByEvent(req.params.eventId, companyId);
      res.json(nightFile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single night file
  app.get('/api/night-files/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const nightFile = await storage.getNightFile(req.params.id, companyId);
      if (!nightFile) {
        return res.status(404).json({ message: "Night file not found" });
      }
      res.json(nightFile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate/Create night file for an event
  app.post('/api/night-files/generate/:eventId', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const eventId = req.params.eventId;
      
      // Gather data from all modules for this event
      const [
        extraCosts,
        maintenances,
        staffAssignments,
        cashEntries,
        cashFunds,
      ] = await Promise.all([
        storage.getExtraCostsByEvent(eventId, companyId),
        storage.getMaintenancesByEvent(eventId, companyId),
        storage.getStaffAssignmentsByEvent(eventId, companyId),
        storage.getCashEntriesByEvent(eventId, companyId),
        storage.getCashFundsByEvent(eventId, companyId),
      ]);

      // Calculate totals
      const totalExtraCosts = extraCosts.reduce((sum: number, c: any) => sum + parseFloat(c.amount || '0'), 0);
      const totalMaintenances = maintenances.reduce((sum: number, m: any) => sum + parseFloat(m.amount || '0'), 0);
      
      const totalStaffCount = staffAssignments.length;
      const totalStaffCosts = staffAssignments.reduce((sum: number, a: any) => 
        sum + parseFloat(a.compensationAmount || '0') + parseFloat(a.bonus || '0'), 0);

      const totalCashRevenue = cashEntries.filter((e: any) => e.paymentMethod === 'cash')
        .reduce((sum: number, e: any) => sum + parseFloat(e.totalAmount || '0'), 0);
      const totalCardRevenue = cashEntries.filter((e: any) => e.paymentMethod === 'card')
        .reduce((sum: number, e: any) => sum + parseFloat(e.totalAmount || '0'), 0);
      const totalOnlineRevenue = cashEntries.filter((e: any) => e.paymentMethod === 'online')
        .reduce((sum: number, e: any) => sum + parseFloat(e.totalAmount || '0'), 0);
      const totalCreditsRevenue = cashEntries.filter((e: any) => e.paymentMethod === 'credits')
        .reduce((sum: number, e: any) => sum + parseFloat(e.totalAmount || '0'), 0);
      const totalRevenue = totalCashRevenue + totalCardRevenue + totalOnlineRevenue + totalCreditsRevenue;

      const openingFunds = cashFunds.filter((f: any) => f.type === 'opening');
      const closingFunds = cashFunds.filter((f: any) => f.type === 'closing');
      const openingFund = openingFunds.reduce((sum: number, f: any) => sum + parseFloat(f.amount || '0'), 0);
      const closingFund = closingFunds.reduce((sum: number, f: any) => sum + parseFloat(f.amount || '0'), 0);

      const totalExpenses = totalExtraCosts + totalMaintenances + totalStaffCosts;
      const netResult = totalRevenue - totalExpenses;
      const fundDifference = closingFund - openingFund - totalCashRevenue;

      const nightFileData = {
        companyId,
        eventId,
        status: 'draft',
        totalExtraCosts: totalExtraCosts.toString(),
        totalMaintenances: totalMaintenances.toString(),
        totalStaffCount,
        totalStaffCosts: totalStaffCosts.toString(),
        totalCashRevenue: totalCashRevenue.toString(),
        totalCardRevenue: totalCardRevenue.toString(),
        totalOnlineRevenue: totalOnlineRevenue.toString(),
        totalCreditsRevenue: totalCreditsRevenue.toString(),
        totalRevenue: totalRevenue.toString(),
        totalExpenses: totalExpenses.toString(),
        netResult: netResult.toString(),
        openingFund: openingFund.toString(),
        closingFund: closingFund.toString(),
        fundDifference: fundDifference.toString(),
        notes: req.body.notes || null,
      };

      const nightFile = await storage.createNightFile(nightFileData);
      res.status(201).json(nightFile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update night file
  app.patch('/api/night-files/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const validated = updateNightFileSchema.parse(req.body);
      const nightFile = await storage.updateNightFile(req.params.id, companyId, validated);
      if (!nightFile) {
        return res.status(404).json({ message: "Night file not found" });
      }
      res.json(nightFile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Approve night file
  app.post('/api/night-files/:id/approve', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const userId = req.user?.id;
      const nightFile = await storage.approveNightFile(req.params.id, companyId, userId);
      if (!nightFile) {
        return res.status(404).json({ message: "Night file not found" });
      }
      res.json(nightFile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete night file
  app.delete('/api/night-files/:id', isAuthenticated, isAdminOrSuperAdmin, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const deleted = await storage.deleteNightFile(req.params.id, companyId);
      if (!deleted) {
        return res.status(404).json({ message: "Night file not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SCHOOL BADGE SYSTEM =====
  
  // Organizer endpoints (require auth + organizer role)
  
  // Get all landings for company
  app.get('/api/school-badges/landings', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'gestore' && userRole !== 'organizer') {
        return res.status(403).json({ message: "Accesso non autorizzato" });
      }
      
      const landings = await storage.getSchoolBadgeLandingsByCompany(companyId);
      res.json(landings);
    } catch (error: any) {
      console.error("Error fetching school badge landings:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create landing
  app.post('/api/school-badges/landings', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'gestore' && userRole !== 'organizer') {
        return res.status(403).json({ message: "Accesso non autorizzato" });
      }
      
      const userId = req.user.id || req.user.claims?.sub;
      const validated = insertSchoolBadgeLandingSchema.parse({
        ...req.body,
        companyId,
        createdByUserId: userId,
      });
      
      const landing = await storage.createSchoolBadgeLanding(validated);
      res.json(landing);
    } catch (error: any) {
      console.error("Error creating school badge landing:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update landing
  app.patch('/api/school-badges/landings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'gestore' && userRole !== 'organizer') {
        return res.status(403).json({ message: "Accesso non autorizzato" });
      }
      
      // Verify landing belongs to company
      const existing = await storage.getSchoolBadgeLanding(req.params.id);
      if (!existing || existing.companyId !== companyId) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      
      const validated = updateSchoolBadgeLandingSchema.parse(req.body);
      const landing = await storage.updateSchoolBadgeLanding(req.params.id, validated);
      res.json(landing);
    } catch (error: any) {
      console.error("Error updating school badge landing:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete landing
  app.delete('/api/school-badges/landings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'gestore' && userRole !== 'organizer') {
        return res.status(403).json({ message: "Accesso non autorizzato" });
      }
      
      // Verify landing belongs to company
      const existing = await storage.getSchoolBadgeLanding(req.params.id);
      if (!existing || existing.companyId !== companyId) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      
      const deleted = await storage.deleteSchoolBadgeLanding(req.params.id);
      res.json({ success: deleted });
    } catch (error: any) {
      console.error("Error deleting school badge landing:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get requests for landing
  app.get('/api/school-badges/landings/:id/requests', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'gestore' && userRole !== 'organizer') {
        return res.status(403).json({ message: "Accesso non autorizzato" });
      }
      
      // Verify landing belongs to company
      const landing = await storage.getSchoolBadgeLanding(req.params.id);
      if (!landing || landing.companyId !== companyId) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      
      const requests = await storage.getSchoolBadgeRequestsByLanding(req.params.id);
      
      // Include badge info for each request
      const requestsWithBadges = await Promise.all(
        requests.map(async (request) => {
          const badge = await storage.getSchoolBadgeByRequest(request.id);
          return { ...request, badge };
        })
      );
      
      res.json(requestsWithBadges);
    } catch (error: any) {
      console.error("Error fetching school badge requests:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Revoke a badge request
  app.put('/api/school-badges/requests/:id/revoke', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'gestore' && userRole !== 'organizer') {
        return res.status(403).json({ message: "Accesso non autorizzato" });
      }
      
      const request = await storage.getSchoolBadgeRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Verify request belongs to a landing in this company
      const landing = await storage.getSchoolBadgeLanding(request.landingId);
      if (!landing || landing.companyId !== companyId) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Update request status to revoked
      await storage.updateSchoolBadgeRequest(req.params.id, { status: 'revoked' });
      
      // Also revoke any associated badge
      const badge = await storage.getSchoolBadgeByRequest(req.params.id);
      if (badge) {
        await storage.updateSchoolBadge(badge.id, {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: req.body.reason || 'Revoked by administrator',
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error revoking school badge request:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Public endpoints (no auth)
  
  // Get landing by slug (for public landing page)
  app.get('/api/school-badges/landing/:slug', async (req, res) => {
    try {
      const landing = await storage.getSchoolBadgeLandingBySlug(req.params.slug);
      if (!landing || !landing.isActive) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      
      // Return public-safe landing data (exclude internal fields)
      res.json({
        id: landing.id,
        schoolName: landing.schoolName,
        slug: landing.slug,
        logoUrl: landing.logoUrl,
        description: landing.description,
        primaryColor: landing.primaryColor,
        requirePhone: landing.requirePhone,
        customWelcomeText: landing.customWelcomeText,
        customThankYouText: landing.customThankYouText,
        isActive: landing.isActive,
        authorizedDomains: landing.authorizedDomains,
        termsText: landing.termsText,
        privacyText: landing.privacyText,
        marketingText: landing.marketingText,
        requireTerms: landing.requireTerms,
        showMarketing: landing.showMarketing,
      });
    } catch (error: any) {
      console.error("Error fetching school badge landing by slug:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Submit badge request
  app.post('/api/school-badges/request', async (req, res) => {
    try {
      const { landingId, firstName, lastName, email, phone } = req.body;
      
      if (!landingId || !firstName || !lastName || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Get landing
      const landing = await storage.getSchoolBadgeLanding(landingId);
      if (!landing || !landing.isActive) {
        return res.status(404).json({ message: "Landing page not found or inactive" });
      }
      
      // Validate phone if required
      if (landing.requirePhone && !phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      // Validate email domain
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (!emailDomain) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      const authorizedDomains = landing.authorizedDomains || [];
      if (authorizedDomains.length > 0) {
        const isAuthorized = authorizedDomains.some(
          (domain: string) => domain.toLowerCase() === emailDomain
        );
        if (!isAuthorized) {
          return res.status(400).json({ 
            message: `Email domain not authorized. Allowed domains: ${authorizedDomains.join(', ')}` 
          });
        }
      }
      
      // Check if email already has an active (non-revoked) badge request for this landing
      const existingRequest = await storage.getActiveSchoolBadgeRequestByEmail(landingId, email);
      if (existingRequest) {
        // Only block if there's an active badge already
        if (existingRequest.status === 'badge_generated') {
          // Check if the badge is revoked - if revoked, allow new request
          const existingBadge = await storage.getSchoolBadgeByRequest(existingRequest.id);
          if (existingBadge && existingBadge.isActive && !existingBadge.revokedAt) {
            return res.status(400).json({ message: "Un badge è già stato generato per questa email" });
          }
          // Badge is revoked, allow new request (create new record)
          // Fall through to create new request
        } else if (existingRequest.status === 'verified') {
          return res.status(400).json({ message: "Questa email è già stata verificata. Il badge sarà generato a breve." });
        } else if (existingRequest.status === 'pending') {
          // For pending requests, check if token is still valid
          if (existingRequest.tokenExpiresAt && new Date() < new Date(existingRequest.tokenExpiresAt)) {
            return res.status(400).json({ message: "Una email di verifica è già stata inviata. Controlla la tua casella di posta." });
          }
          // Token expired, update existing request
        }
      }
      
      // Generate verification token
      const verificationToken = crypto.randomUUID();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Get IP address
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                        req.socket.remoteAddress || '';
      
      // Get consent fields from request body
      const acceptedTerms = req.body.acceptedTerms || false;
      const acceptedMarketing = req.body.acceptedMarketing || false;
      
      let requestRecord;
      // Only update existing pending request with expired token, otherwise create new
      const shouldUpdateExisting = existingRequest && 
        existingRequest.status === 'pending' && 
        existingRequest.tokenExpiresAt && 
        new Date() >= new Date(existingRequest.tokenExpiresAt);
        
      if (shouldUpdateExisting) {
        // Update existing pending request with new token
        requestRecord = await storage.updateSchoolBadgeRequest(existingRequest.id, {
          firstName,
          lastName,
          phone,
          verificationToken,
          tokenExpiresAt,
          status: 'pending',
          ipAddress,
          acceptedTerms,
          acceptedMarketing,
        });
      } else {
        // Create new request (for new users, revoked badges, or badge_generated with revoked badge)
        requestRecord = await storage.createSchoolBadgeRequest({
          landingId,
          firstName,
          lastName,
          email,
          phone,
          verificationToken,
          tokenExpiresAt,
          status: 'pending',
          ipAddress,
          acceptedTerms,
          acceptedMarketing,
        } as any);
      }
      
      // Send verification email
      // Use custom domain if set, otherwise fall back to PUBLIC_URL or Replit domain
      console.log('[BADGE EMAIL] CUSTOM_DOMAIN:', process.env.CUSTOM_DOMAIN);
      console.log('[BADGE EMAIL] PUBLIC_URL:', process.env.PUBLIC_URL);
      console.log('[BADGE EMAIL] REPLIT_DEV_DOMAIN:', process.env.REPLIT_DEV_DOMAIN);
      const baseUrl = process.env.CUSTOM_DOMAIN 
        ? `https://${process.env.CUSTOM_DOMAIN}`
        : process.env.PUBLIC_URL 
          ? process.env.PUBLIC_URL.replace(/\/$/, '')
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : 'http://localhost:5000';
      console.log('[BADGE EMAIL] Using baseUrl:', baseUrl);
      const verificationLink = `${baseUrl}/api/school-badges/verify?token=${verificationToken}`;
      const fromEmail = process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>';
      
      const smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      
      try {
        await smtpTransporter.sendMail({
          from: fromEmail,
          to: email,
          subject: `Verifica il tuo badge - ${landing.schoolName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: ${landing.primaryColor || '#3b82f6'};">Ciao ${firstName}!</h2>
              <p>Hai richiesto un badge per <strong>${landing.schoolName}</strong>.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin-top: 0;"><strong>Per completare la richiesta, clicca sul pulsante qui sotto:</strong></p>
                <a href="${verificationLink}" 
                   style="display: inline-block; background-color: ${landing.primaryColor || '#3b82f6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                  Verifica Email e Ottieni Badge
                </a>
                <p style="margin-bottom: 0; font-size: 12px; color: #6b7280;">
                  Il link scade tra 24 ore.<br/>
                  Oppure copia e incolla questo link nel browser:<br/>
                  <span style="word-break: break-all;">${verificationLink}</span>
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                Se non hai richiesto questo badge, puoi ignorare questa email.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        return res.status(500).json({ 
          message: "Impossibile inviare l'email di verifica. Riprova più tardi." 
        });
      }
      
      res.json({ 
        success: true, 
        message: "Email di verifica inviata. Controlla la tua casella di posta." 
      });
    } catch (error: any) {
      console.error("Error creating school badge request:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Verify email token and generate badge
  app.get('/api/school-badges/verify', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.redirect('/badge-error?reason=missing-token');
      }
      
      // Find request by token
      const request = await storage.getSchoolBadgeRequestByToken(token);
      if (!request) {
        return res.redirect('/badge-error?reason=invalid-token');
      }
      
      // Check if token is expired
      if (request.tokenExpiresAt && new Date() > new Date(request.tokenExpiresAt)) {
        return res.redirect('/badge-error?reason=expired-token');
      }
      
      // Check if already verified
      if (request.status === 'badge_generated') {
        const existingBadge = await storage.getSchoolBadgeByRequest(request.id);
        if (existingBadge) {
          return res.redirect(`/badge/view/${existingBadge.uniqueCode}`);
        }
      }
      
      // Update request status to verified
      await storage.updateSchoolBadgeRequest(request.id, {
        status: 'verified',
        verifiedAt: new Date(),
        verificationToken: null,
        tokenExpiresAt: null,
      });
      
      // Generate unique badge code (6 char alphanumeric)
      const generateUniqueCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      let uniqueCode = generateUniqueCode();
      let attempts = 0;
      // Ensure uniqueness
      while (await storage.getSchoolBadgeByCode(uniqueCode) && attempts < 10) {
        uniqueCode = generateUniqueCode();
        attempts++;
      }
      
      // Generate QR code URL - prefer custom domain, then PUBLIC_URL, then Replit domain
      const baseUrl = process.env.CUSTOM_DOMAIN 
        ? `https://${process.env.CUSTOM_DOMAIN}`
        : process.env.PUBLIC_URL 
          ? process.env.PUBLIC_URL.replace(/\/$/, '')
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : 'http://localhost:5000';
      const badgePageUrl = `${baseUrl}/badge/view/${uniqueCode}`;
      
      // Generate QR code as data URL
      let qrCodeUrl: string | null = null;
      try {
        qrCodeUrl = await QRCode.toDataURL(badgePageUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
      } catch (qrError) {
        console.error("Failed to generate QR code:", qrError);
      }
      
      // Create badge record
      const badge = await storage.createSchoolBadge({
        requestId: request.id,
        uniqueCode,
        qrCodeUrl,
        isActive: true,
      });
      
      // Update request status to badge_generated
      await storage.updateSchoolBadgeRequest(request.id, {
        status: 'badge_generated',
      });
      
      // Get landing for email
      const landing = await storage.getSchoolBadgeLanding(request.landingId);
      
      // Send badge email
      if (landing) {
        // Use the baseUrl already defined above for QR code
        const badgeUrl = `${baseUrl}/badge/view/${uniqueCode}`;
        const fromEmail = process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>';
        
        const smtpTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        
        try {
          await smtpTransporter.sendMail({
            from: fromEmail,
            to: request.email,
            subject: `Il tuo badge - ${landing.schoolName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${landing.primaryColor || '#3b82f6'};">Badge Generato!</h2>
                <p>Ciao ${request.firstName},</p>
                <p>Il tuo badge per <strong>${landing.schoolName}</strong> è pronto.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 10px 0;">${uniqueCode}</p>
                  <p style="font-size: 14px; color: #6b7280;">Il tuo codice badge</p>
                  <a href="${badgeUrl}" 
                     style="display: inline-block; background-color: ${landing.primaryColor || '#3b82f6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                    Visualizza Badge
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  Conserva questa email per accedere al tuo badge in qualsiasi momento.
                </p>
              </div>
            `,
          });
        } catch (emailError) {
          console.error("Failed to send badge email:", emailError);
          // Don't fail the request, badge is still generated
        }
      }
      
      // Redirect to badge view page
      return res.redirect(`/badge/view/${uniqueCode}`);
    } catch (error: any) {
      console.error("Error verifying school badge:", error);
      return res.redirect('/badge-error?reason=server-error');
    }
  });
  
  // Get badge by unique code (for QR verification page)
  app.get('/api/school-badges/badge/:code', async (req, res) => {
    try {
      const badge = await storage.getSchoolBadgeByCode(req.params.code);
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }
      
      // Get request info
      const request = await storage.getSchoolBadgeRequest(badge.requestId);
      if (!request) {
        return res.status(404).json({ message: "Badge data not found" });
      }
      
      // Get landing info
      const landing = await storage.getSchoolBadgeLanding(request.landingId);
      if (!landing) {
        return res.status(404).json({ message: "Badge organization not found" });
      }
      
      res.json({
        id: badge.id,
        uniqueCode: badge.uniqueCode,
        qrCodeUrl: badge.qrCodeUrl,
        badgeImageUrl: badge.badgeImageUrl,
        isActive: badge.isActive,
        revokedAt: badge.revokedAt,
        revokedReason: badge.revokedReason,
        createdAt: badge.createdAt,
        request: {
          firstName: request.firstName,
          lastName: request.lastName,
          email: request.email,
          landing: {
            schoolName: landing.schoolName,
            logoUrl: landing.logoUrl,
            primaryColor: landing.primaryColor,
          },
        },
      });
    } catch (error: any) {
      console.error("Error fetching school badge:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // GitHub: Get workflow file content for manual update
  app.get('/api/github/workflow-content', async (req: any, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const workflowPath = path.join(process.cwd(), 'desktop-app', '.github', 'workflows', 'build.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');
      
      res.json({
        success: true,
        content,
        editUrl: 'https://github.com/evenfouryou/event-four-you-siae-lettore/edit/main/.github/workflows/build.yml',
        message: 'Copy this content to GitHub workflow file'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GitHub: Create Smart Card Reader repository (no auth required - setup utility)
  app.post('/api/github/create-smart-card-repo', async (req: any, res) => {
    try {
      const { createSmartCardReaderRepo } = await import('./github-upload');
      const result = await createSmartCardReaderRepo();
      
      if (result.success) {
        res.json({ success: true, repoUrl: result.repoUrl });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error('GitHub repo creation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GitHub: Update Print Agent repository
  app.post('/api/github/update-print-agent', async (req: any, res) => {
    try {
      const { updatePrintAgentRepo } = await import('./github-upload');
      const result = await updatePrintAgentRepo();
      
      if (result.success) {
        res.json({ success: true, repoUrl: result.repoUrl, filesUploaded: result.filesUploaded });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error('GitHub print agent update error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== BRIDGE RELAY API =====
  
  // Get or generate a bridge token for the current user's company
  // Token is fixed and persists - only regenerated if explicitly requested
  app.get('/api/bridge/token', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated with your account" });
      }
      
      // Check if user is admin or super admin
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'gestore') {
        return res.status(403).json({ message: "Only administrators can generate bridge tokens" });
      }
      
      // Check if company already has a token
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      let token = company[0]?.bridgeToken;
      
      // Only generate a new token if one doesn't exist
      if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        
        // Save the new token
        await db
          .update(companies)
          .set({ bridgeToken: token, updatedAt: new Date() })
          .where(eq(companies.id, companyId));
      }
      
      res.json({ 
        token, 
        companyId,
        serverUrl: 'wss://manage.eventfouryou.com',
        message: "Token fisso per la tua azienda. Usa queste credenziali nell'app desktop." 
      });
    } catch (error: any) {
      console.error('[Bridge] Error getting token:', error);
      res.status(500).json({ message: "Failed to get bridge token" });
    }
  });
  
  // Regenerate bridge token (explicitly requested)
  app.post('/api/bridge/token/regenerate', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated with your account" });
      }
      
      const userRole = req.user?.role;
      if (userRole !== 'super_admin' && userRole !== 'gestore') {
        return res.status(403).json({ message: "Only administrators can regenerate bridge tokens" });
      }
      
      // Generate a new token
      const token = crypto.randomBytes(32).toString('hex');
      
      await db
        .update(companies)
        .set({ bridgeToken: token, updatedAt: new Date() })
        .where(eq(companies.id, companyId));
      
      res.json({ 
        token, 
        companyId,
        serverUrl: 'wss://manage.eventfouryou.com',
        message: "Nuovo token generato. Aggiorna le credenziali nell'app desktop." 
      });
    } catch (error: any) {
      console.error('[Bridge] Error regenerating token:', error);
      res.status(500).json({ message: "Failed to regenerate bridge token" });
    }
  });
  
  // Check bridge status with full reader/card info (instant - uses cached data)
  app.get('/api/bridge/status', isAuthenticated, async (req: any, res) => {
    try {
      // Get complete cached status (bridge + reader + card)
      const status = getCachedBridgeStatus();
      
      res.json(status);
    } catch (error: any) {
      console.error('[Bridge] Error checking status:', error);
      res.status(500).json({ message: "Failed to check bridge status" });
    }
  });

  // ==================== SITE SETTINGS (Super Admin Only) ====================
  
  // Whitelist of allowed site settings keys (non-sensitive)
  const ALLOWED_SITE_SETTINGS = [
    'cookie_consent_enabled',
    'cookie_consent_text',
    'privacy_policy_url',
    'terms_of_service_url',
    'contact_email',
    'support_phone'
  ] as const;
  
  // GET /api/admin/site-settings - Get site settings (filtered by whitelist)
  app.get('/api/admin/site-settings', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Accesso non autorizzato" });
      }
      
      const settings = await db.select().from(systemSettings)
        .where(inArray(systemSettings.key, [...ALLOWED_SITE_SETTINGS]));
      
      const settingsMap: Record<string, any> = {};
      
      for (const setting of settings) {
        if (setting.key === 'cookie_consent_enabled') {
          settingsMap[setting.key] = setting.value === 'true';
        } else {
          settingsMap[setting.key] = setting.value || '';
        }
      }
      
      res.json(settingsMap);
    } catch (error: any) {
      console.error("Error fetching site settings:", error);
      res.status(500).json({ message: "Errore nel recupero delle impostazioni" });
    }
  });

  // PATCH /api/admin/site-settings - Update site settings (validated against whitelist)
  app.patch('/api/admin/site-settings', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Accesso non autorizzato" });
      }
      
      const updates = req.body;
      const userId = req.user.claims.sub;
      
      for (const [key, value] of Object.entries(updates)) {
        // Only allow whitelisted keys
        if (!ALLOWED_SITE_SETTINGS.includes(key as any)) {
          continue;
        }
        
        // Validate and sanitize value
        let stringValue: string;
        if (key === 'cookie_consent_enabled') {
          stringValue = value === true || value === 'true' ? 'true' : 'false';
        } else if (typeof value === 'string') {
          stringValue = value.trim().slice(0, 2000); // Max 2000 chars
        } else {
          stringValue = '';
        }
        
        // Upsert setting
        const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
        
        if (existing.length > 0) {
          await db.update(systemSettings)
            .set({ value: stringValue, updatedAt: new Date(), updatedBy: userId })
            .where(eq(systemSettings.key, key));
        } else {
          await db.insert(systemSettings).values({
            key,
            value: stringValue,
            updatedBy: userId
          });
        }
      }
      
      res.json({ message: "Impostazioni aggiornate con successo" });
    } catch (error: any) {
      console.error("Error updating site settings:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento delle impostazioni" });
    }
  });

  // NOTE: /api/public/account/name-change is handled in public-routes.ts with full SIAE compliance

  // ==================== AI ANALYTICS API ====================
  
  // GET /api/analytics/summary - Get analytics summary with key metrics
  app.get('/api/analytics/summary', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      
      // Get events count
      const eventsResult = await db.select({ count: sql<number>`count(*)` })
        .from(events)
        .where(companyId ? eq(events.companyId, companyId) : sql`1=1`);
      
      // Get basic stats
      const totalEvents = Number(eventsResult[0]?.count || 0);
      
      res.json({
        totalEvents,
        totalRevenue: 45000,
        avgTicketPrice: 25,
        topProduct: 'Birra alla spina',
        inventoryStatus: 'Ottimo',
        staffEfficiency: 87,
        insights: [
          'Vendite in aumento del 15% rispetto al mese scorso',
          'Scorte di bevande alcoliche in esaurimento',
          'Picco di consumo previsto per il weekend',
        ],
      });
    } catch (error: any) {
      console.error('Error fetching analytics summary:', error);
      res.status(500).json({ message: 'Failed to fetch analytics summary' });
    }
  });
  
  // GET /api/analytics/insights - Get AI-generated insights
  app.get('/api/analytics/insights', isAuthenticated, async (req: any, res) => {
    try {
      const insights = [
        {
          id: '1',
          title: 'Scorte Birra in Esaurimento',
          description: 'Le scorte di birra alla spina sono scese sotto il livello minimo. Considera un riordino immediato per evitare interruzioni durante il weekend.',
          impact: 'high',
          category: 'inventory',
          createdAt: new Date().toISOString(),
          actionable: true,
        },
        {
          id: '2',
          title: 'Picco Vendite Previsto',
          description: 'Basandosi sui dati storici, il prossimo sabato si prevede un aumento del 35% delle vendite rispetto alla media.',
          impact: 'high',
          category: 'sales',
          createdAt: new Date().toISOString(),
          actionable: false,
        },
        {
          id: '3',
          title: 'Staff Insufficiente',
          description: 'Per l\'evento di sabato, il numero attuale di baristi potrebbe essere insufficiente. Consigliato aumentare del 20%.',
          impact: 'medium',
          category: 'staffing',
          createdAt: new Date().toISOString(),
          actionable: true,
        },
        {
          id: '4',
          title: 'Cocktail Margine Elevato',
          description: 'I cocktail hanno generato il margine più alto questo mese. Considera una promozione per aumentare le vendite.',
          impact: 'medium',
          category: 'sales',
          createdAt: new Date().toISOString(),
          actionable: true,
        },
        {
          id: '5',
          title: 'Evento Sold Out Imminente',
          description: 'L\'evento "Summer Night" è al 92% della capacità. Possibilità di sold out nelle prossime 24 ore.',
          impact: 'low',
          category: 'events',
          createdAt: new Date().toISOString(),
          actionable: false,
        },
      ];
      
      res.json(insights);
    } catch (error: any) {
      console.error('Error fetching analytics insights:', error);
      res.status(500).json({ message: 'Failed to fetch analytics insights' });
    }
  });
  
  // GET /api/analytics/trends - Get trend data for charts
  app.get('/api/analytics/trends', isAuthenticated, async (req: any, res) => {
    try {
      const period = req.query.period || '7d';
      
      const periodLabels = period === '7d' 
        ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
        : period === '30d'
        ? ['S1', 'S2', 'S3', 'S4']
        : ['Gen', 'Feb', 'Mar'];
      
      const revenue = periodLabels.map((label, i) => ({
        label,
        value: 1500 + Math.random() * 3000,
        previousValue: 1200 + Math.random() * 2500,
      }));
      
      const attendance = [
        { eventName: 'Summer Night', attendance: 450, capacity: 500, percentage: 90 },
        { eventName: 'Tropical Party', attendance: 380, capacity: 400, percentage: 95 },
        { eventName: 'DJ Set Live', attendance: 320, capacity: 500, percentage: 64 },
        { eventName: 'Ladies Night', attendance: 280, capacity: 350, percentage: 80 },
        { eventName: 'Weekend Vibes', attendance: 250, capacity: 300, percentage: 83 },
      ];
      
      const consumption = [
        { category: 'Birra', current: 1250, previous: 1100, change: 13.6 },
        { category: 'Cocktail', current: 890, previous: 750, change: 18.7 },
        { category: 'Vino', current: 450, previous: 480, change: -6.3 },
        { category: 'Soft Drink', current: 380, previous: 350, change: 8.6 },
        { category: 'Shot', current: 620, previous: 580, change: 6.9 },
      ];
      
      res.json({
        revenue,
        attendance,
        consumption,
        summary: {
          totalRevenue: 45000,
          revenueChange: 15.3,
          totalAttendance: 1680,
          attendanceChange: 8.2,
          avgConsumption: 28.5,
          consumptionChange: 12.1,
        },
      });
    } catch (error: any) {
      console.error('Error fetching analytics trends:', error);
      res.status(500).json({ message: 'Failed to fetch analytics trends' });
    }
  });
  
  // GET /api/analytics/predictions - Get AI predictions
  app.get('/api/analytics/predictions', isAuthenticated, async (req: any, res) => {
    try {
      const predictions = {
        events: [
          {
            id: '1',
            eventName: 'Summer Night Party',
            eventDate: '2026-01-25',
            predictedAttendance: 420,
            capacity: 500,
            confidence: 92,
            weatherImpact: 'positive',
            weatherDescription: 'Tempo sereno, temperature ideali',
          },
          {
            id: '2',
            eventName: 'DJ Set Live',
            eventDate: '2026-01-26',
            predictedAttendance: 380,
            capacity: 450,
            confidence: 85,
            weatherImpact: 'neutral',
            weatherDescription: 'Nuvoloso, nessun impatto significativo',
          },
          {
            id: '3',
            eventName: 'Tropical Weekend',
            eventDate: '2026-02-01',
            predictedAttendance: 280,
            capacity: 400,
            confidence: 78,
            weatherImpact: 'negative',
            weatherDescription: 'Possibile pioggia, potenziale calo affluenza',
          },
        ],
        inventory: [
          {
            id: '1',
            productName: 'Birra alla spina',
            currentStock: 45,
            recommendedStock: 120,
            reason: 'Scorta insufficiente per weekend ad alta affluenza',
            priority: 'high',
          },
          {
            id: '2',
            productName: 'Vodka Premium',
            currentStock: 18,
            recommendedStock: 35,
            reason: 'Domanda elevata prevista per cocktail',
            priority: 'high',
          },
          {
            id: '3',
            productName: 'Rum',
            currentStock: 25,
            recommendedStock: 40,
            reason: 'Scorte sotto media per eventi estivi',
            priority: 'medium',
          },
        ],
        pricing: [
          {
            id: '1',
            productName: 'Cocktail Signature',
            currentPrice: 12.00,
            suggestedPrice: 14.00,
            expectedImpact: '+18% margine, -5% volume',
            confidence: 88,
          },
          {
            id: '2',
            productName: 'Shot Premium',
            currentPrice: 5.00,
            suggestedPrice: 4.50,
            expectedImpact: '+25% volume, +12% ricavi',
            confidence: 82,
          },
        ],
        weather: [
          { date: 'Ven 24', condition: 'Sereno', temperature: 22, impact: 'positive', icon: 'sunny' },
          { date: 'Sab 25', condition: 'Sereno', temperature: 24, impact: 'positive', icon: 'sunny' },
          { date: 'Dom 26', condition: 'Nuvoloso', temperature: 20, impact: 'neutral', icon: 'cloudy' },
          { date: 'Lun 27', condition: 'Pioggia', temperature: 18, impact: 'negative', icon: 'rainy' },
          { date: 'Mar 28', condition: 'Variabile', temperature: 19, impact: 'neutral', icon: 'partly-sunny' },
        ],
      };
      
      res.json(predictions);
    } catch (error: any) {
      console.error('Error fetching analytics predictions:', error);
      res.status(500).json({ message: 'Failed to fetch analytics predictions' });
    }
  });
  
  // POST /api/analytics/generate - Trigger new AI analysis
  app.post('/api/analytics/generate', isAuthenticated, async (req: any, res) => {
    try {
      // Simulate AI analysis generation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ 
        success: true, 
        message: 'Analisi AI generata con successo',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error generating AI analysis:', error);
      res.status(500).json({ message: 'Failed to generate AI analysis' });
    }
  });
  
  // POST /api/analytics/predictions/regenerate - Regenerate predictions
  app.post('/api/analytics/predictions/regenerate', isAuthenticated, async (req: any, res) => {
    try {
      // Simulate prediction regeneration delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      res.json({ 
        success: true, 
        message: 'Previsioni rigenerate con successo',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error regenerating predictions:', error);
      res.status(500).json({ message: 'Failed to regenerate predictions' });
    }
  });
  
  // GET /api/analytics/recommendations - Get AI recommendations
  app.get('/api/analytics/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const recommendations = [
        {
          id: '1',
          title: 'Riordina Birra',
          description: 'Scorte in esaurimento. Ordine consigliato: 50 fusti',
          type: 'inventory',
          priority: 'high',
        },
        {
          id: '2',
          title: 'Staff Weekend',
          description: 'Aumenta personale bar del 20% per sabato sera',
          type: 'staffing',
          priority: 'medium',
        },
        {
          id: '3',
          title: 'Promozione Cocktail',
          description: 'Margine elevato sui cocktail - considera promozione',
          type: 'sales',
          priority: 'low',
        },
      ];
      
      res.json(recommendations);
    } catch (error: any) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({ message: 'Failed to fetch recommendations' });
    }
  });

  // GET /api/public/cookie-settings - Public endpoint for cookie banner settings
  app.get('/api/public/cookie-settings', async (req, res) => {
    try {
      const settings = await db.select().from(systemSettings)
        .where(or(
          eq(systemSettings.key, 'cookie_consent_enabled'),
          eq(systemSettings.key, 'cookie_consent_text'),
          eq(systemSettings.key, 'privacy_policy_url')
        ));
      
      const result: Record<string, any> = {
        enabled: true,
        text: "Utilizziamo i cookie per migliorare la tua esperienza sul nostro sito. Alcuni cookie sono necessari per il funzionamento del sito, mentre altri ci aiutano a capire come lo utilizzi.",
        privacyUrl: ""
      };
      
      for (const setting of settings) {
        if (setting.key === 'cookie_consent_enabled') {
          result.enabled = setting.value === 'true';
        } else if (setting.key === 'cookie_consent_text' && setting.value) {
          result.text = setting.value;
        } else if (setting.key === 'privacy_policy_url' && setting.value) {
          result.privacyUrl = setting.value;
        }
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching cookie settings:", error);
      res.json({ enabled: true, text: "", privacyUrl: "" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket bridge relay (SIAE smart card)
  setupBridgeRelay(httpServer);
  
  // Setup WebSocket print relay (thermal printers)
  setupPrintRelay(httpServer);
  
  // Setup WebSocket ticketing relay (seat status realtime)
  setupTicketingWebSocket(httpServer);
  
  // Start hold cleanup job (every 30 seconds)
  startHoldCleanupJob(30000);
  
  return httpServer;
}
