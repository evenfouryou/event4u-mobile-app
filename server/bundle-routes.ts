import { Router } from "express";
import { db } from "./db";
import {
  productBundles,
  productBundleItems,
  bundlePurchases,
  events,
  siaeEventSectors,
  siaeTicketedEvents,
  siaeCustomers,
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte, isNull, or } from "drizzle-orm";
import { randomBytes } from "crypto";
import QRCode from "qrcode";

const router = Router();

// === ADMIN APIs ===

// GET /api/bundles - Lista bundle della company
router.get("/api/bundles", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const bundles = await db
      .select({
        id: productBundles.id,
        name: productBundles.name,
        description: productBundles.description,
        type: productBundles.type,
        basePrice: productBundles.basePrice,
        originalPrice: productBundles.originalPrice,
        minGroupSize: productBundles.minGroupSize,
        maxGroupSize: productBundles.maxGroupSize,
        imageUrl: productBundles.imageUrl,
        isActive: productBundles.isActive,
        validFrom: productBundles.validFrom,
        validTo: productBundles.validTo,
        availableQuantity: productBundles.availableQuantity,
        soldCount: productBundles.soldCount,
        ticketedEventId: productBundles.ticketedEventId,
        createdAt: productBundles.createdAt,
      })
      .from(productBundles)
      .where(eq(productBundles.companyId, user.companyId))
      .orderBy(desc(productBundles.createdAt));

    res.json(bundles);
  } catch (error) {
    console.error("Error fetching bundles:", error);
    res.status(500).json({ message: "Errore nel recupero dei bundle" });
  }
});

// POST /api/bundles - Crea bundle
router.post("/api/bundles", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const {
      name,
      description,
      type,
      basePrice,
      originalPrice,
      minGroupSize,
      maxGroupSize,
      imageUrl,
      validFrom,
      validTo,
      availableQuantity,
      ticketedEventId,
    } = req.body;

    if (!name || !type || !basePrice) {
      return res.status(400).json({ message: "Nome, tipo e prezzo sono obbligatori" });
    }

    const [newBundle] = await db
      .insert(productBundles)
      .values({
        companyId: user.companyId,
        ticketedEventId: ticketedEventId || null,
        name,
        description: description || null,
        type,
        basePrice: basePrice.toString(),
        originalPrice: originalPrice ? originalPrice.toString() : null,
        minGroupSize: minGroupSize || 1,
        maxGroupSize: maxGroupSize || null,
        imageUrl: imageUrl || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        availableQuantity: availableQuantity || null,
      })
      .returning();

    res.json(newBundle);
  } catch (error) {
    console.error("Error creating bundle:", error);
    res.status(500).json({ message: "Errore nella creazione del bundle" });
  }
});

// PUT /api/bundles/:id - Modifica bundle
router.put("/api/bundles/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const { id } = req.params;
    const {
      name,
      description,
      type,
      basePrice,
      originalPrice,
      minGroupSize,
      maxGroupSize,
      imageUrl,
      isActive,
      validFrom,
      validTo,
      availableQuantity,
      ticketedEventId,
    } = req.body;

    const [existing] = await db
      .select()
      .from(productBundles)
      .where(and(eq(productBundles.id, id), eq(productBundles.companyId, user.companyId)));

    if (!existing) {
      return res.status(404).json({ message: "Bundle non trovato" });
    }

    const [updated] = await db
      .update(productBundles)
      .set({
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        type: type !== undefined ? type : existing.type,
        basePrice: basePrice !== undefined ? basePrice.toString() : existing.basePrice,
        originalPrice: originalPrice !== undefined ? originalPrice?.toString() || null : existing.originalPrice,
        minGroupSize: minGroupSize !== undefined ? minGroupSize : existing.minGroupSize,
        maxGroupSize: maxGroupSize !== undefined ? maxGroupSize : existing.maxGroupSize,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        validFrom: validFrom !== undefined ? (validFrom ? new Date(validFrom) : null) : existing.validFrom,
        validTo: validTo !== undefined ? (validTo ? new Date(validTo) : null) : existing.validTo,
        availableQuantity: availableQuantity !== undefined ? availableQuantity : existing.availableQuantity,
        ticketedEventId: ticketedEventId !== undefined ? ticketedEventId : existing.ticketedEventId,
      })
      .where(eq(productBundles.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating bundle:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del bundle" });
  }
});

// DELETE /api/bundles/:id - Elimina bundle
router.delete("/api/bundles/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(productBundles)
      .where(and(eq(productBundles.id, id), eq(productBundles.companyId, user.companyId)));

    if (!existing) {
      return res.status(404).json({ message: "Bundle non trovato" });
    }

    // Delete items first
    await db.delete(productBundleItems).where(eq(productBundleItems.bundleId, id));

    // Delete bundle
    await db.delete(productBundles).where(eq(productBundles.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting bundle:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del bundle" });
  }
});

// GET /api/bundles/:id/items - Lista elementi del bundle
router.get("/api/bundles/:id/items", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    const items = await db
      .select()
      .from(productBundleItems)
      .where(eq(productBundleItems.bundleId, id))
      .orderBy(productBundleItems.sortOrder);

    res.json(items);
  } catch (error) {
    console.error("Error fetching bundle items:", error);
    res.status(500).json({ message: "Errore nel recupero degli elementi" });
  }
});

// POST /api/bundles/:id/items - Aggiungi elemento
router.post("/api/bundles/:id/items", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;
    const { itemType, itemName, quantity, sectorId, productId, sortOrder } = req.body;

    if (!itemType || !itemName) {
      return res.status(400).json({ message: "Tipo e nome elemento sono obbligatori" });
    }

    const [newItem] = await db
      .insert(productBundleItems)
      .values({
        bundleId: id,
        itemType,
        itemName,
        quantity: quantity || 1,
        sectorId: sectorId || null,
        productId: productId || null,
        sortOrder: sortOrder || 0,
      })
      .returning();

    res.json(newItem);
  } catch (error) {
    console.error("Error adding bundle item:", error);
    res.status(500).json({ message: "Errore nell'aggiunta dell'elemento" });
  }
});

// DELETE /api/bundles/:id/items/:itemId - Rimuovi elemento
router.delete("/api/bundles/:id/items/:itemId", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { itemId } = req.params;

    await db.delete(productBundleItems).where(eq(productBundleItems.id, itemId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing bundle item:", error);
    res.status(500).json({ message: "Errore nella rimozione dell'elemento" });
  }
});

// GET /api/bundles/stats - Statistiche vendite bundle
router.get("/api/bundles/stats", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    // Get all bundles for company
    const bundles = await db
      .select()
      .from(productBundles)
      .where(eq(productBundles.companyId, user.companyId));

    const bundleIds = bundles.map((b) => b.id);

    if (bundleIds.length === 0) {
      return res.json({
        totalBundles: 0,
        activeBundles: 0,
        totalSold: 0,
        totalRevenue: "0",
        purchasesByBundle: [],
      });
    }

    // Get purchases
    const purchases = await db
      .select()
      .from(bundlePurchases)
      .where(sql`${bundlePurchases.bundleId} = ANY(${bundleIds})`);

    const totalRevenue = purchases
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + parseFloat(p.totalPrice || "0"), 0);

    const purchasesByBundle = bundles.map((bundle) => {
      const bundlePurchasesList = purchases.filter((p) => p.bundleId === bundle.id);
      return {
        bundleId: bundle.id,
        bundleName: bundle.name,
        soldCount: bundle.soldCount || 0,
        revenue: bundlePurchasesList
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + parseFloat(p.totalPrice || "0"), 0),
      };
    });

    res.json({
      totalBundles: bundles.length,
      activeBundles: bundles.filter((b) => b.isActive).length,
      totalSold: bundles.reduce((sum, b) => sum + (b.soldCount || 0), 0),
      totalRevenue: totalRevenue.toFixed(2),
      purchasesByBundle,
    });
  } catch (error) {
    console.error("Error fetching bundle stats:", error);
    res.status(500).json({ message: "Errore nel recupero delle statistiche" });
  }
});

// GET /api/bundles/purchases - Lista tutti gli acquisti della company
router.get("/api/bundles/purchases", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    // Get all bundles for company
    const bundles = await db
      .select({ id: productBundles.id, name: productBundles.name })
      .from(productBundles)
      .where(eq(productBundles.companyId, user.companyId));

    const bundleIds = bundles.map((b) => b.id);

    if (bundleIds.length === 0) {
      return res.json([]);
    }

    const purchases = await db
      .select({
        id: bundlePurchases.id,
        bundleId: bundlePurchases.bundleId,
        groupSize: bundlePurchases.groupSize,
        totalPrice: bundlePurchases.totalPrice,
        status: bundlePurchases.status,
        createdAt: bundlePurchases.createdAt,
        customerEmail: siaeCustomers.email,
        customerFirstName: siaeCustomers.firstName,
        customerLastName: siaeCustomers.lastName,
      })
      .from(bundlePurchases)
      .leftJoin(siaeCustomers, eq(bundlePurchases.customerId, siaeCustomers.id))
      .where(sql`${bundlePurchases.bundleId} = ANY(${bundleIds})`)
      .orderBy(desc(bundlePurchases.createdAt))
      .limit(100);

    // Add bundle name to each purchase
    const purchasesWithBundleName = purchases.map((p) => ({
      ...p,
      bundleName: bundles.find((b) => b.id === p.bundleId)?.name || "Unknown",
    }));

    res.json(purchasesWithBundleName);
  } catch (error) {
    console.error("Error fetching all bundle purchases:", error);
    res.status(500).json({ message: "Errore nel recupero degli acquisti" });
  }
});

// GET /api/bundles/:id/purchases - Lista acquisti del bundle
router.get("/api/bundles/:id/purchases", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    const purchases = await db
      .select({
        id: bundlePurchases.id,
        groupSize: bundlePurchases.groupSize,
        totalPrice: bundlePurchases.totalPrice,
        status: bundlePurchases.status,
        qrCode: bundlePurchases.qrCode,
        createdAt: bundlePurchases.createdAt,
        customerEmail: siaeCustomers.email,
        customerFirstName: siaeCustomers.firstName,
        customerLastName: siaeCustomers.lastName,
      })
      .from(bundlePurchases)
      .leftJoin(siaeCustomers, eq(bundlePurchases.customerId, siaeCustomers.id))
      .where(eq(bundlePurchases.bundleId, id))
      .orderBy(desc(bundlePurchases.createdAt));

    res.json(purchases);
  } catch (error) {
    console.error("Error fetching bundle purchases:", error);
    res.status(500).json({ message: "Errore nel recupero degli acquisti" });
  }
});

// === PUBLIC APIs ===

// GET /api/public/events/:eventId/bundles - Bundle disponibili per evento
router.get("/api/public/events/:eventId/bundles", async (req, res) => {
  try {
    const { eventId } = req.params;
    const now = new Date();

    // Get bundles for this event that are active and valid
    const bundles = await db
      .select({
        id: productBundles.id,
        name: productBundles.name,
        description: productBundles.description,
        type: productBundles.type,
        basePrice: productBundles.basePrice,
        originalPrice: productBundles.originalPrice,
        minGroupSize: productBundles.minGroupSize,
        maxGroupSize: productBundles.maxGroupSize,
        imageUrl: productBundles.imageUrl,
        validFrom: productBundles.validFrom,
        validTo: productBundles.validTo,
        availableQuantity: productBundles.availableQuantity,
        soldCount: productBundles.soldCount,
      })
      .from(productBundles)
      .where(
        and(
          eq(productBundles.ticketedEventId, eventId),
          eq(productBundles.isActive, true),
          or(isNull(productBundles.validFrom), lte(productBundles.validFrom, now)),
          or(isNull(productBundles.validTo), gte(productBundles.validTo, now))
        )
      );

    // Get items for each bundle
    const bundlesWithItems = await Promise.all(
      bundles.map(async (bundle) => {
        const items = await db
          .select()
          .from(productBundleItems)
          .where(eq(productBundleItems.bundleId, bundle.id))
          .orderBy(productBundleItems.sortOrder);

        // Check availability
        const isAvailable =
          bundle.availableQuantity === null ||
          (bundle.soldCount || 0) < bundle.availableQuantity;

        return {
          ...bundle,
          items,
          isAvailable,
          remainingQuantity:
            bundle.availableQuantity !== null
              ? bundle.availableQuantity - (bundle.soldCount || 0)
              : null,
        };
      })
    );

    res.json(bundlesWithItems);
  } catch (error) {
    console.error("Error fetching event bundles:", error);
    res.status(500).json({ message: "Errore nel recupero dei bundle" });
  }
});

// POST /api/public/bundles/:id/purchase - Acquista bundle
router.post("/api/public/bundles/:id/purchase", async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, eventId, groupSize } = req.body;

    // Get bundle
    const [bundle] = await db.select().from(productBundles).where(eq(productBundles.id, id));

    if (!bundle) {
      return res.status(404).json({ message: "Bundle non trovato" });
    }

    if (!bundle.isActive) {
      return res.status(400).json({ message: "Bundle non disponibile" });
    }

    // Check validity dates
    const now = new Date();
    if (bundle.validFrom && new Date(bundle.validFrom) > now) {
      return res.status(400).json({ message: "Bundle non ancora disponibile" });
    }
    if (bundle.validTo && new Date(bundle.validTo) < now) {
      return res.status(400).json({ message: "Bundle scaduto" });
    }

    // Check quantity
    if (
      bundle.availableQuantity !== null &&
      (bundle.soldCount || 0) >= bundle.availableQuantity
    ) {
      return res.status(400).json({ message: "Bundle esaurito" });
    }

    // Validate group size for group_discount type
    const actualGroupSize = groupSize || 1;
    if (bundle.type === "group_discount") {
      if (bundle.minGroupSize && actualGroupSize < bundle.minGroupSize) {
        return res.status(400).json({
          message: `Minimo ${bundle.minGroupSize} persone richieste`,
        });
      }
      if (bundle.maxGroupSize && actualGroupSize > bundle.maxGroupSize) {
        return res.status(400).json({
          message: `Massimo ${bundle.maxGroupSize} persone consentite`,
        });
      }
    }

    // Calculate total price (for groups, multiply by group size)
    let totalPrice = parseFloat(bundle.basePrice);
    if (bundle.type === "group_discount") {
      totalPrice = totalPrice * actualGroupSize;
    }

    // Generate unique QR code
    const qrCodeData = `BUNDLE-${id}-${randomBytes(8).toString("hex").toUpperCase()}`;

    // Create purchase
    const [purchase] = await db
      .insert(bundlePurchases)
      .values({
        bundleId: id,
        customerId: customerId || null,
        eventId: eventId || bundle.ticketedEventId,
        groupSize: actualGroupSize,
        totalPrice: totalPrice.toFixed(2),
        status: "pending",
        qrCode: qrCodeData,
      })
      .returning();

    // Update sold count
    await db
      .update(productBundles)
      .set({ soldCount: (bundle.soldCount || 0) + 1 })
      .where(eq(productBundles.id, id));

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    res.json({
      ...purchase,
      qrCodeImage,
    });
  } catch (error) {
    console.error("Error purchasing bundle:", error);
    res.status(500).json({ message: "Errore nell'acquisto del bundle" });
  }
});

// GET /api/public/bundles/my-purchases - Miei acquisti bundle
router.get("/api/public/bundles/my-purchases", async (req, res) => {
  try {
    const customerId = req.query.customerId as string;

    if (!customerId) {
      return res.status(400).json({ message: "ID cliente richiesto" });
    }

    const purchases = await db
      .select({
        id: bundlePurchases.id,
        groupSize: bundlePurchases.groupSize,
        totalPrice: bundlePurchases.totalPrice,
        status: bundlePurchases.status,
        qrCode: bundlePurchases.qrCode,
        createdAt: bundlePurchases.createdAt,
        bundleName: productBundles.name,
        bundleType: productBundles.type,
        bundleDescription: productBundles.description,
      })
      .from(bundlePurchases)
      .innerJoin(productBundles, eq(bundlePurchases.bundleId, productBundles.id))
      .where(eq(bundlePurchases.customerId, customerId))
      .orderBy(desc(bundlePurchases.createdAt));

    res.json(purchases);
  } catch (error) {
    console.error("Error fetching my purchases:", error);
    res.status(500).json({ message: "Errore nel recupero degli acquisti" });
  }
});

// PUT /api/public/bundles/purchases/:id/complete - Completa acquisto
router.put("/api/public/bundles/purchases/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    const [updated] = await db
      .update(bundlePurchases)
      .set({
        status: "completed",
        transactionId: transactionId || null,
      })
      .where(eq(bundlePurchases.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Acquisto non trovato" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error completing purchase:", error);
    res.status(500).json({ message: "Errore nel completamento dell'acquisto" });
  }
});

export default router;
