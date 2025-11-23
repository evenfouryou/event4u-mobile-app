// Referenced from blueprints: javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Replit Auth disabled - using classic email/password login
// import { setupAuth, isAuthenticated } from "./replitAuth";
import { isAuthenticated } from "./replitAuth";
import {
  insertCompanySchema,
  insertLocationSchema,
  insertEventSchema,
  insertStationSchema,
  insertProductSchema,
  insertStockMovementSchema,
  insertPriceListItemSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";
import nodemailer from "nodemailer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit Auth disabled - using classic email/password login only
  // await setupAuth(app);

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
    role: z.enum(['organizer', 'warehouse', 'bartender']).default('organizer'),
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
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'Event4U <noreply@event4u.com>',
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

      if (!user.emailVerified) {
        return res.status(403).json({ message: "Email non verificata" });
      }

      // Use passport login to properly set up session
      (req as any).login({ claims: { sub: user.id, email: user.email } }, (err: any) => {
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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
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

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
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

      const validated = updateEventSchema.parse(req.body);
      const updatedEvent = await storage.updateEvent(id, validated);
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

      // Get all consumptions for this event
      const movements = await db
        .select()
        .from(stockMovements)
        .where(and(eq(stockMovements.toEventId, id), eq(stockMovements.type, 'CONSUME')));

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
  app.get('/api/events/:id/stations', isAuthenticated, async (req: any, res) => {
    try {
      const stations = await storage.getStationsByEvent(req.params.id);
      res.json(stations);
    } catch (error) {
      console.error("Error fetching stations:", error);
      res.status(500).json({ message: "Failed to fetch stations" });
    }
  });

  app.post('/api/events/:id/stations', isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertStationSchema.parse({ ...req.body, eventId: req.params.id });
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

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
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

  // ===== USERS =====
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }
      const users = await storage.getUsersByCompany(companyId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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
        if (!stock || parseFloat(stock.quantity) < parseFloat(quantity)) {
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

  app.post('/api/price-lists', isAuthenticated, async (req: any, res) => {
    try {
      const companyId = await getUserCompanyId(req);
      if (!companyId) {
        return res.status(403).json({ message: "No company associated" });
      }

      const { insertPriceListSchema } = await import('@shared/schema');
      const validated = insertPriceListSchema.parse(req.body);

      const priceList = await storage.createPriceList({
        ...validated,
        companyId,
      });
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

      const item = await storage.updatePriceListItem(id, companyId, validated);
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

      // Calculate total consumption
      const totalReport = {
        eventId,
        stations: stationReports,
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
