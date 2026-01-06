import { Router } from "express";
import { db } from "./db";
import {
  loyaltyPrograms,
  loyaltyTiers,
  loyaltyPoints,
  loyaltyPointLedger,
  loyaltyRewards,
  siaeCustomers,
  siaeTicketedEvents,
  companies,
} from "@shared/schema";
import { eq, and, desc, sql, asc, count } from "drizzle-orm";

const router = Router();

// ==================== ADMIN APIs (per gestori) ====================

// GET /api/loyalty/program - Ottieni programma della company
router.get("/api/loyalty/program", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    res.json(program || null);
  } catch (error) {
    console.error("Error fetching loyalty program:", error);
    res.status(500).json({ message: "Errore nel recupero del programma fedeltà" });
  }
});

// POST /api/loyalty/program - Crea/aggiorna programma
router.post("/api/loyalty/program", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const { name, pointsPerEuro, isActive } = req.body;

    const [existingProgram] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    if (existingProgram) {
      const [updated] = await db
        .update(loyaltyPrograms)
        .set({
          name: name || existingProgram.name,
          pointsPerEuro: pointsPerEuro?.toString() || existingProgram.pointsPerEuro,
          isActive: isActive !== undefined ? isActive : existingProgram.isActive,
        })
        .where(eq(loyaltyPrograms.id, existingProgram.id))
        .returning();
      return res.json(updated);
    }

    const [newProgram] = await db
      .insert(loyaltyPrograms)
      .values({
        companyId: user.companyId,
        name: name || "Programma Fedeltà",
        pointsPerEuro: pointsPerEuro?.toString() || "1",
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    res.json(newProgram);
  } catch (error) {
    console.error("Error creating/updating loyalty program:", error);
    res.status(500).json({ message: "Errore nella creazione/aggiornamento del programma" });
  }
});

// PUT /api/loyalty/program/toggle - Attiva/disattiva
router.put("/api/loyalty/program/toggle", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    if (!program) {
      return res.status(404).json({ message: "Programma fedeltà non trovato" });
    }

    const [updated] = await db
      .update(loyaltyPrograms)
      .set({ isActive: !program.isActive })
      .where(eq(loyaltyPrograms.id, program.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error toggling loyalty program:", error);
    res.status(500).json({ message: "Errore nel toggle del programma" });
  }
});

// GET /api/loyalty/tiers - Lista livelli
router.get("/api/loyalty/tiers", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    if (!program) {
      return res.json([]);
    }

    const tiers = await db
      .select()
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.programId, program.id))
      .orderBy(asc(loyaltyTiers.minPoints));

    res.json(tiers);
  } catch (error) {
    console.error("Error fetching loyalty tiers:", error);
    res.status(500).json({ message: "Errore nel recupero dei livelli" });
  }
});

// POST /api/loyalty/tiers - Crea livello
router.post("/api/loyalty/tiers", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    if (!program) {
      return res.status(404).json({ message: "Prima crea un programma fedeltà" });
    }

    const { name, minPoints, discountPercent, benefits, color, sortOrder } = req.body;

    const [newTier] = await db
      .insert(loyaltyTiers)
      .values({
        programId: program.id,
        name,
        minPoints: minPoints || 0,
        discountPercent: discountPercent?.toString() || "0",
        benefits,
        color: color || "#CD7F32",
        sortOrder: sortOrder || 0,
      })
      .returning();

    res.json(newTier);
  } catch (error) {
    console.error("Error creating loyalty tier:", error);
    res.status(500).json({ message: "Errore nella creazione del livello" });
  }
});

// PUT /api/loyalty/tiers/:id - Modifica livello
router.put("/api/loyalty/tiers/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const { id } = req.params;
    const { name, minPoints, discountPercent, benefits, color, sortOrder } = req.body;

    const [tier] = await db
      .select()
      .from(loyaltyTiers)
      .innerJoin(loyaltyPrograms, eq(loyaltyTiers.programId, loyaltyPrograms.id))
      .where(and(eq(loyaltyTiers.id, id), eq(loyaltyPrograms.companyId, user.companyId)));

    if (!tier) {
      return res.status(404).json({ message: "Livello non trovato" });
    }

    const [updated] = await db
      .update(loyaltyTiers)
      .set({
        name: name !== undefined ? name : tier.loyalty_tiers.name,
        minPoints: minPoints !== undefined ? minPoints : tier.loyalty_tiers.minPoints,
        discountPercent: discountPercent !== undefined ? discountPercent.toString() : tier.loyalty_tiers.discountPercent,
        benefits: benefits !== undefined ? benefits : tier.loyalty_tiers.benefits,
        color: color !== undefined ? color : tier.loyalty_tiers.color,
        sortOrder: sortOrder !== undefined ? sortOrder : tier.loyalty_tiers.sortOrder,
      })
      .where(eq(loyaltyTiers.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating loyalty tier:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del livello" });
  }
});

// DELETE /api/loyalty/tiers/:id - Elimina livello
router.delete("/api/loyalty/tiers/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const { id } = req.params;

    const [tier] = await db
      .select()
      .from(loyaltyTiers)
      .innerJoin(loyaltyPrograms, eq(loyaltyTiers.programId, loyaltyPrograms.id))
      .where(and(eq(loyaltyTiers.id, id), eq(loyaltyPrograms.companyId, user.companyId)));

    if (!tier) {
      return res.status(404).json({ message: "Livello non trovato" });
    }

    await db.delete(loyaltyTiers).where(eq(loyaltyTiers.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting loyalty tier:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del livello" });
  }
});

// GET /api/loyalty/rewards - Lista premi
router.get("/api/loyalty/rewards", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    if (!program) {
      return res.json([]);
    }

    const rewards = await db
      .select()
      .from(loyaltyRewards)
      .where(eq(loyaltyRewards.programId, program.id))
      .orderBy(asc(loyaltyRewards.pointsCost));

    res.json(rewards);
  } catch (error) {
    console.error("Error fetching loyalty rewards:", error);
    res.status(500).json({ message: "Errore nel recupero dei premi" });
  }
});

// POST /api/loyalty/rewards - Crea premio
router.post("/api/loyalty/rewards", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    if (!program) {
      return res.status(404).json({ message: "Prima crea un programma fedeltà" });
    }

    const { name, description, pointsCost, type, value, imageUrl, availableQuantity, isActive } = req.body;

    const [newReward] = await db
      .insert(loyaltyRewards)
      .values({
        programId: program.id,
        name,
        description,
        pointsCost,
        type: type || "discount",
        value: value?.toString(),
        imageUrl,
        availableQuantity,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    res.json(newReward);
  } catch (error) {
    console.error("Error creating loyalty reward:", error);
    res.status(500).json({ message: "Errore nella creazione del premio" });
  }
});

// PUT /api/loyalty/rewards/:id - Modifica premio
router.put("/api/loyalty/rewards/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const { id } = req.params;
    const { name, description, pointsCost, type, value, imageUrl, availableQuantity, isActive } = req.body;

    const [reward] = await db
      .select()
      .from(loyaltyRewards)
      .innerJoin(loyaltyPrograms, eq(loyaltyRewards.programId, loyaltyPrograms.id))
      .where(and(eq(loyaltyRewards.id, id), eq(loyaltyPrograms.companyId, user.companyId)));

    if (!reward) {
      return res.status(404).json({ message: "Premio non trovato" });
    }

    const [updated] = await db
      .update(loyaltyRewards)
      .set({
        name: name !== undefined ? name : reward.loyalty_rewards.name,
        description: description !== undefined ? description : reward.loyalty_rewards.description,
        pointsCost: pointsCost !== undefined ? pointsCost : reward.loyalty_rewards.pointsCost,
        type: type !== undefined ? type : reward.loyalty_rewards.type,
        value: value !== undefined ? value.toString() : reward.loyalty_rewards.value,
        imageUrl: imageUrl !== undefined ? imageUrl : reward.loyalty_rewards.imageUrl,
        availableQuantity: availableQuantity !== undefined ? availableQuantity : reward.loyalty_rewards.availableQuantity,
        isActive: isActive !== undefined ? isActive : reward.loyalty_rewards.isActive,
      })
      .where(eq(loyaltyRewards.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating loyalty reward:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del premio" });
  }
});

// DELETE /api/loyalty/rewards/:id - Elimina premio
router.delete("/api/loyalty/rewards/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const { id } = req.params;

    const [reward] = await db
      .select()
      .from(loyaltyRewards)
      .innerJoin(loyaltyPrograms, eq(loyaltyRewards.programId, loyaltyPrograms.id))
      .where(and(eq(loyaltyRewards.id, id), eq(loyaltyPrograms.companyId, user.companyId)));

    if (!reward) {
      return res.status(404).json({ message: "Premio non trovato" });
    }

    await db.delete(loyaltyRewards).where(eq(loyaltyRewards.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting loyalty reward:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del premio" });
  }
});

// GET /api/loyalty/stats - Overview programma
router.get("/api/loyalty/stats", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    if (!program) {
      return res.json({
        totalCustomers: 0,
        totalPoints: 0,
        totalRedeemed: 0,
        tierDistribution: [],
      });
    }

    const pointsData = await db
      .select({
        totalCustomers: count(loyaltyPoints.id),
        totalPoints: sql<number>`COALESCE(SUM(${loyaltyPoints.totalPoints}), 0)`,
        lifetimePoints: sql<number>`COALESCE(SUM(${loyaltyPoints.lifetimePoints}), 0)`,
      })
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.programId, program.id));

    const tierDistribution = await db
      .select({
        tierId: loyaltyTiers.id,
        tierName: loyaltyTiers.name,
        tierColor: loyaltyTiers.color,
        customerCount: count(loyaltyPoints.id),
      })
      .from(loyaltyTiers)
      .leftJoin(loyaltyPoints, eq(loyaltyTiers.id, loyaltyPoints.currentTierId))
      .where(eq(loyaltyTiers.programId, program.id))
      .groupBy(loyaltyTiers.id, loyaltyTiers.name, loyaltyTiers.color);

    const redeemedData = await db
      .select({
        totalRedeemed: sql<number>`COALESCE(SUM(ABS(${loyaltyPointLedger.points})), 0)`,
      })
      .from(loyaltyPointLedger)
      .where(
        and(
          eq(loyaltyPointLedger.programId, program.id),
          eq(loyaltyPointLedger.type, "redeem")
        )
      );

    res.json({
      totalCustomers: pointsData[0]?.totalCustomers || 0,
      totalPoints: pointsData[0]?.totalPoints || 0,
      lifetimePoints: pointsData[0]?.lifetimePoints || 0,
      totalRedeemed: redeemedData[0]?.totalRedeemed || 0,
      tierDistribution,
    });
  } catch (error) {
    console.error("Error fetching loyalty stats:", error);
    res.status(500).json({ message: "Errore nel recupero delle statistiche" });
  }
});

// GET /api/loyalty/customers - Lista clienti con punti e tier
router.get("/api/loyalty/customers", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const user = req.user as any;
    if (!user.companyId) {
      return res.status(400).json({ message: "Utente non associato a una company" });
    }

    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, user.companyId));

    if (!program) {
      return res.json([]);
    }

    const customers = await db
      .select({
        customerId: siaeCustomers.id,
        firstName: siaeCustomers.firstName,
        lastName: siaeCustomers.lastName,
        email: siaeCustomers.email,
        totalPoints: loyaltyPoints.totalPoints,
        lifetimePoints: loyaltyPoints.lifetimePoints,
        tierId: loyaltyTiers.id,
        tierName: loyaltyTiers.name,
        tierColor: loyaltyTiers.color,
      })
      .from(loyaltyPoints)
      .innerJoin(siaeCustomers, eq(loyaltyPoints.customerId, siaeCustomers.id))
      .leftJoin(loyaltyTiers, eq(loyaltyPoints.currentTierId, loyaltyTiers.id))
      .where(eq(loyaltyPoints.programId, program.id))
      .orderBy(desc(loyaltyPoints.totalPoints));

    res.json(customers);
  } catch (error) {
    console.error("Error fetching loyalty customers:", error);
    res.status(500).json({ message: "Errore nel recupero dei clienti" });
  }
});

// ==================== PUBLIC APIs (per clienti) ====================

// GET /api/public/loyalty/my-points - I miei punti e tier
router.get("/api/public/loyalty/my-points", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const customerPoints = await db
      .select({
        totalPoints: loyaltyPoints.totalPoints,
        lifetimePoints: loyaltyPoints.lifetimePoints,
        programId: loyaltyPoints.programId,
        tierName: loyaltyTiers.name,
        tierColor: loyaltyTiers.color,
        tierMinPoints: loyaltyTiers.minPoints,
        tierDiscountPercent: loyaltyTiers.discountPercent,
        programName: loyaltyPrograms.name,
        companyId: loyaltyPrograms.companyId,
      })
      .from(loyaltyPoints)
      .innerJoin(loyaltyPrograms, eq(loyaltyPoints.programId, loyaltyPrograms.id))
      .leftJoin(loyaltyTiers, eq(loyaltyPoints.currentTierId, loyaltyTiers.id))
      .where(eq(loyaltyPoints.customerId, customer.id));

    if (customerPoints.length === 0) {
      return res.json([]);
    }

    const result = await Promise.all(
      customerPoints.map(async (cp) => {
        const allTiers = await db
          .select()
          .from(loyaltyTiers)
          .where(eq(loyaltyTiers.programId, cp.programId))
          .orderBy(asc(loyaltyTiers.minPoints));

        const currentTierIndex = allTiers.findIndex((t) => t.name === cp.tierName);
        const nextTier = currentTierIndex >= 0 && currentTierIndex < allTiers.length - 1 
          ? allTiers[currentTierIndex + 1] 
          : null;

        const [companyData] = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, cp.companyId));

        return {
          ...cp,
          companyName: companyData?.name,
          nextTierName: nextTier?.name,
          nextTierMinPoints: nextTier?.minPoints,
          progressToNext: nextTier 
            ? Math.min(100, Math.round(((cp.totalPoints || 0) / nextTier.minPoints) * 100))
            : 100,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Error fetching customer points:", error);
    res.status(500).json({ message: "Errore nel recupero dei punti" });
  }
});

// GET /api/public/loyalty/rewards - Premi disponibili per il cliente
router.get("/api/public/loyalty/rewards", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const customerPoints = await db
      .select()
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.customerId, customer.id));

    if (customerPoints.length === 0) {
      return res.json([]);
    }

    const programIds = customerPoints.map((cp) => cp.programId);

    const rewards = await db
      .select({
        id: loyaltyRewards.id,
        name: loyaltyRewards.name,
        description: loyaltyRewards.description,
        pointsCost: loyaltyRewards.pointsCost,
        type: loyaltyRewards.type,
        value: loyaltyRewards.value,
        imageUrl: loyaltyRewards.imageUrl,
        availableQuantity: loyaltyRewards.availableQuantity,
        programId: loyaltyRewards.programId,
        programName: loyaltyPrograms.name,
      })
      .from(loyaltyRewards)
      .innerJoin(loyaltyPrograms, eq(loyaltyRewards.programId, loyaltyPrograms.id))
      .where(
        and(
          eq(loyaltyRewards.isActive, true),
          sql`${loyaltyRewards.programId} = ANY(${programIds})`
        )
      )
      .orderBy(asc(loyaltyRewards.pointsCost));

    const rewardsWithStatus = rewards.map((r) => {
      const points = customerPoints.find((cp) => cp.programId === r.programId);
      return {
        ...r,
        customerPoints: points?.totalPoints || 0,
        canRedeem: (points?.totalPoints || 0) >= r.pointsCost && 
          (r.availableQuantity === null || r.availableQuantity > 0),
      };
    });

    res.json(rewardsWithStatus);
  } catch (error) {
    console.error("Error fetching available rewards:", error);
    res.status(500).json({ message: "Errore nel recupero dei premi" });
  }
});

// POST /api/public/loyalty/rewards/:id/redeem - Riscatta premio
router.post("/api/public/loyalty/rewards/:id/redeem", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const { id } = req.params;

    const [reward] = await db
      .select()
      .from(loyaltyRewards)
      .where(and(eq(loyaltyRewards.id, id), eq(loyaltyRewards.isActive, true)));

    if (!reward) {
      return res.status(404).json({ message: "Premio non trovato o non attivo" });
    }

    if (reward.availableQuantity !== null && reward.availableQuantity <= 0) {
      return res.status(400).json({ message: "Premio esaurito" });
    }

    const [customerPoints] = await db
      .select()
      .from(loyaltyPoints)
      .where(
        and(
          eq(loyaltyPoints.customerId, customer.id),
          eq(loyaltyPoints.programId, reward.programId)
        )
      );

    if (!customerPoints || customerPoints.totalPoints < reward.pointsCost) {
      return res.status(400).json({ message: "Punti insufficienti" });
    }

    await db.insert(loyaltyPointLedger).values({
      customerId: customer.id,
      programId: reward.programId,
      points: -reward.pointsCost,
      type: "redeem",
      referenceId: reward.id,
      description: `Riscatto premio: ${reward.name}`,
    });

    await db
      .update(loyaltyPoints)
      .set({
        totalPoints: customerPoints.totalPoints - reward.pointsCost,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyPoints.id, customerPoints.id));

    if (reward.availableQuantity !== null) {
      await db
        .update(loyaltyRewards)
        .set({ availableQuantity: reward.availableQuantity - 1 })
        .where(eq(loyaltyRewards.id, id));
    }

    res.json({
      success: true,
      message: `Premio "${reward.name}" riscattato con successo!`,
      reward: {
        name: reward.name,
        type: reward.type,
        value: reward.value,
      },
      remainingPoints: customerPoints.totalPoints - reward.pointsCost,
    });
  } catch (error) {
    console.error("Error redeeming reward:", error);
    res.status(500).json({ message: "Errore nel riscatto del premio" });
  }
});

// GET /api/public/loyalty/history - Storico transazioni punti
router.get("/api/public/loyalty/history", async (req, res) => {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    const history = await db
      .select({
        id: loyaltyPointLedger.id,
        points: loyaltyPointLedger.points,
        type: loyaltyPointLedger.type,
        description: loyaltyPointLedger.description,
        createdAt: loyaltyPointLedger.createdAt,
        programName: loyaltyPrograms.name,
      })
      .from(loyaltyPointLedger)
      .innerJoin(loyaltyPrograms, eq(loyaltyPointLedger.programId, loyaltyPrograms.id))
      .where(eq(loyaltyPointLedger.customerId, customer.id))
      .orderBy(desc(loyaltyPointLedger.createdAt))
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error("Error fetching points history:", error);
    res.status(500).json({ message: "Errore nel recupero dello storico" });
  }
});

// ==================== HELPER: Credit Loyalty Points ====================
// This function should be called after a successful ticket purchase

export async function creditLoyaltyPoints(
  customerId: string,
  companyId: string,
  amount: number,
  referenceId: string,
  description: string
): Promise<void> {
  try {
    const [program] = await db
      .select()
      .from(loyaltyPrograms)
      .where(and(eq(loyaltyPrograms.companyId, companyId), eq(loyaltyPrograms.isActive, true)));

    if (!program) {
      console.log(`[LOYALTY] No active program for company ${companyId}`);
      return;
    }

    const pointsPerEuro = parseFloat(program.pointsPerEuro || "1");
    const pointsEarned = Math.floor(amount * pointsPerEuro);

    if (pointsEarned <= 0) {
      return;
    }

    let [customerPoints] = await db
      .select()
      .from(loyaltyPoints)
      .where(
        and(
          eq(loyaltyPoints.customerId, customerId),
          eq(loyaltyPoints.programId, program.id)
        )
      );

    if (!customerPoints) {
      const [newPoints] = await db
        .insert(loyaltyPoints)
        .values({
          customerId,
          programId: program.id,
          totalPoints: 0,
          lifetimePoints: 0,
        })
        .returning();
      customerPoints = newPoints;
    }

    await db.insert(loyaltyPointLedger).values({
      customerId,
      programId: program.id,
      points: pointsEarned,
      type: "earn",
      referenceId,
      description,
    });

    const newTotal = (customerPoints.totalPoints || 0) + pointsEarned;
    const newLifetime = (customerPoints.lifetimePoints || 0) + pointsEarned;

    const tiers = await db
      .select()
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.programId, program.id))
      .orderBy(desc(loyaltyTiers.minPoints));

    let newTierId: string | null = null;
    for (const tier of tiers) {
      if (newLifetime >= tier.minPoints) {
        newTierId = tier.id;
        break;
      }
    }

    await db
      .update(loyaltyPoints)
      .set({
        totalPoints: newTotal,
        lifetimePoints: newLifetime,
        currentTierId: newTierId,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyPoints.id, customerPoints.id));

    console.log(`[LOYALTY] Credited ${pointsEarned} points to customer ${customerId}`);
  } catch (error) {
    console.error("[LOYALTY] Error crediting points:", error);
  }
}

// Helper function to get authenticated customer (from public-routes.ts pattern)
async function getAuthenticatedCustomer(req: any): Promise<any | null> {
  if (req.user && req.isAuthenticated && req.isAuthenticated()) {
    if (req.user.accountType === "customer" && req.user.customerId) {
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.id, req.user.customerId));
      return customer || null;
    }
    if (req.user.role === "cliente" && req.user.customerId) {
      const [customer] = await db
        .select()
        .from(siaeCustomers)
        .where(eq(siaeCustomers.id, req.user.customerId));
      return customer || null;
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const [customer] = await db
      .select()
      .from(siaeCustomers)
      .where(eq(siaeCustomers.authToken, token));
    return customer || null;
  }

  return null;
}

export default router;
