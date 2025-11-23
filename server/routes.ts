// Referenced from blueprints: javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Replit Auth disabled - using classic email/password login
// import { setupAuth, isAuthenticated } from "./replitAuth";
import { getSession } from "./replitAuth";
import passport from "passport";
import {
  insertCompanySchema,
  insertLocationSchema,
  insertEventSchema,
  updateEventSchema,
  insertStationSchema,
  insertProductSchema,
  insertStockMovementSchema,
  insertPriceListItemSchema,
  stockMovements,
  priceListItems,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";
import nodemailer from "nodemailer";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup passport for classic email/password authentication (no Replit OAuth)
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Passport serialization for classic login
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

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
      const validated = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validated.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validated.password, 10);

      // Create user
      const user = await storage.createUser({
        email: validated.email,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role,
        companyId: validated.companyId,
        emailVerified: false,
      });

      // Send welcome email
      try {
        const fromEmail = process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>';
        await emailTransporter.sendMail({
          from: fromEmail,
          to: user.email,
          subject: 'Benvenuto su Event4U',
          html: `
            <h2>Benvenuto su Event Four You, ${user.firstName}!</h2>
            <p>Il tuo account è stato creato con successo.</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Ruolo:</strong> ${user.role}</p>
            <p>Puoi accedere alla piattaforma con le credenziali fornite.</p>
            <p>Grazie per esserti registrato!</p>
            <br/>
            <p>Il Team Event Four You</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Continue even if email fails
      }

      res.json({ 
        message: "Registration successful", 
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

  // Classic email/password login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e password richiesti" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }

      // Super admin can login without email verification
      if (!user.emailVerified && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Email non verificata" });
      }

      // Use passport login to properly set up session
      (req as any).login({ 
        claims: { sub: user.id, email: user.email },
        role: user.role,
        companyId: user.companyId
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

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Helper function to get user's company ID
  const getUserCompanyId = async (req: any): Promise<string | null> => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    return user?.companyId || null;
  };

  // Helper function to check if user is super admin
  const isSuperAdmin = async (req: any): Promise<boolean> => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    return user?.role === 'super_admin';
  };

  // ===== COMPANIES =====
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const companies = await storage.getAllCompanies();
      res.json(companies);
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
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const company = await storage.updateCompany(req.params.id, req.body);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

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

  // ===== EVENTS =====
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
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
      const validated = insertEventSchema.parse({ ...req.body, companyId });
      const event = await storage.createEvent(validated);
      res.json(event);
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: error.message || "Failed to create event" });
    }
  });

  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
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

      const validated = updateEventSchema.parse(req.body);
      // Convert actualRevenue to string for database storage
      const updateData: any = { ...validated };
      if (validated.actualRevenue !== undefined && validated.actualRevenue !== null) {
        updateData.actualRevenue = validated.actualRevenue.toString();
      }
      const updatedEvent = await storage.updateEvent(id, updateData);
      res.json(updatedEvent);
    } catch (error: any) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: error.message || "Failed to update event" });
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
      const movements = await db
        .select()
        .from(stockMovements)
        .where(and(
          eq(stockMovements.companyId, companyId),
          eq(stockMovements.toEventId, id),
          eq(stockMovements.type, 'CONSUME')
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

  app.post('/api/products', isAdminOrSuperAdmin, async (req: any, res) => {
    try {
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

  app.post('/api/suppliers', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (currentUser.role !== 'super_admin' && currentUser.role !== 'gestore')) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const { email, password, firstName, lastName, role, companyId } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Admin può creare utenti solo nella sua company
      let targetCompanyId = companyId;
      if (currentUser.role === 'gestore') {
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
        emailVerified: true, // Admin-created users are auto-verified
      });

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

      await storage.deleteUser(targetUserId);
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

      // Only the actual impersonator (super_admin) can stop impersonation
      if (impersonator.role !== 'super_admin') {
        return res.status(403).json({ message: "Forbidden: Only super admin can stop impersonation" });
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

  app.get('/api/stock/movements', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const movements = await storage.getMovementsByCompany(companyId);
      res.json(movements);
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
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { eventId } = req.params;
      const movements = await storage.getMovementsByEvent(eventId);
      const products = await storage.getProductsByCompany(companyId);
      const stations = await storage.getStationsByEvent(eventId);

      // Calculate consumption per station
      const stationReports = await Promise.all(stations.map(async (station) => {
        const stationMovements = movements.filter(m => 
          m.toStationId === station.id || m.fromStationId === station.id
        );

        const consumed = stationMovements
          .filter(m => m.type === 'CONSUME' && m.fromStationId === station.id)
          .reduce((acc, m) => {
            const product = products.find(p => p.id === m.productId);
            if (!product) return acc;
            
            const qty = parseFloat(m.quantity);
            const cost = parseFloat(product.costPrice) * qty;
            
            return {
              items: [...acc.items, {
                productId: m.productId,
                productName: product.name,
                quantity: qty,
                costPrice: product.costPrice,
                totalCost: cost,
              }],
              totalCost: acc.totalCost + cost,
            };
          }, { items: [] as any[], totalCost: 0 });

        return {
          stationId: station.id,
          stationName: station.name,
          ...consumed,
        };
      }));

      // Calculate total consumption aggregated by product
      const consumptionByProduct = new Map<string, {
        productId: string;
        productName: string;
        totalQuantity: number;
        costPrice: string;
        totalCost: number;
      }>();

      // Aggregate consumption from all stations
      stationReports.forEach(station => {
        station.items.forEach(item => {
          const existing = consumptionByProduct.get(item.productId);
          if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalCost += item.totalCost;
          } else {
            consumptionByProduct.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              totalQuantity: item.quantity,
              costPrice: item.costPrice,
              totalCost: item.totalCost,
            });
          }
        });
      });

      const consumedProducts = Array.from(consumptionByProduct.values());

      const totalReport = {
        eventId,
        stations: stationReports,
        consumedProducts, // New: Total consumption per product across all stations
        totalCost: stationReports.reduce((sum, s) => sum + s.totalCost, 0),
      };

      res.json(totalReport);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
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

  const httpServer = createServer(app);
  return httpServer;
}
