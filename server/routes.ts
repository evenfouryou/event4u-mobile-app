// Referenced from blueprints: javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertCompanySchema,
  insertLocationSchema,
  insertEventSchema,
  insertStationSchema,
  insertProductSchema,
  insertStockMovementSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

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

  const httpServer = createServer(app);
  return httpServer;
}
