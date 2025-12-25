import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { 
  createHold, 
  extendHold, 
  releaseHold, 
  getActiveHolds, 
  getEventSeatStatuses,
  upgradeHoldToCheckout,
  cleanupExpiredHolds,
} from "./hold-service";
import { 
  seatHolds, 
  siaeTicketedEvents, 
  floorPlanSeats, 
  floorPlanZones,
  zoneMetrics,
  recommendationLogs,
  eventSeatStatus,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

const holdRequestSchema = z.object({
  sectorId: z.string().optional(),
  seatId: z.string().optional(),
  zoneId: z.string().optional(),
  holdType: z.enum(['cart', 'checkout', 'staff_reserve']).optional(),
  quantity: z.number().min(1).max(20).optional(),
  priceSnapshot: z.string().optional(),
});

const extendHoldSchema = z.object({
  holdId: z.string(),
});

const releaseHoldSchema = z.object({
  holdId: z.string(),
});

const recommendationSchema = z.object({
  partySize: z.number().min(1).max(50).optional(),
  preferAccessible: z.boolean().optional(),
  preferredZoneType: z.enum(['table', 'sector', 'vip', 'general']).optional(),
  maxPrice: z.number().optional(),
});

function getSessionId(req: Request): string {
  if (req.session && (req.session as any).id) {
    return (req.session as any).id;
  }
  const clientId = req.headers['x-client-id'] as string;
  if (clientId) {
    return clientId;
  }
  return `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

router.post("/api/events/:eventId/seats/hold", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const validation = holdRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Dati non validi", 
        details: validation.error.errors 
      });
    }

    const { sectorId, seatId, zoneId, holdType, quantity, priceSnapshot } = validation.data;

    if (!seatId && !zoneId) {
      return res.status(400).json({ 
        success: false, 
        error: "Devi specificare un posto (seatId) o una zona (zoneId)" 
      });
    }

    const event = await db.query.siaeTicketedEvents.findFirst({
      where: eq(siaeTicketedEvents.id, eventId),
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Evento non trovato" });
    }

    const sessionId = getSessionId(req);
    const userId = (req.user as any)?.id;
    const customerId = req.body.customerId;

    const result = await createHold({
      ticketedEventId: eventId,
      sessionId,
      sectorId,
      seatId,
      zoneId,
      customerId,
      userId,
      holdType,
      quantity,
      priceSnapshot,
    });

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({
      success: true,
      hold: result.hold,
      expiresAt: result.expiresAt,
      sessionId,
    });
  } catch (error) {
    console.error("Error creating hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/events/:eventId/seats/extend", async (req: Request, res: Response) => {
  try {
    const validation = extendHoldSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Dati non validi" 
      });
    }

    const { holdId } = validation.data;
    const sessionId = getSessionId(req);

    const result = await extendHold(holdId, sessionId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({
      success: true,
      hold: result.hold,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Error extending hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/events/:eventId/seats/release", async (req: Request, res: Response) => {
  try {
    const validation = releaseHoldSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Dati non validi" 
      });
    }

    const { holdId } = validation.data;
    const sessionId = getSessionId(req);

    const result = await releaseHold(holdId, sessionId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error releasing hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.delete("/api/events/:eventId/seats/hold/:holdId", async (req: Request, res: Response) => {
  try {
    const { holdId } = req.params;
    const sessionId = getSessionId(req);

    const result = await releaseHold(holdId, sessionId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error releasing hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/events/:eventId/seats/upgrade-checkout", async (req: Request, res: Response) => {
  try {
    const { holdId } = req.body;
    
    if (!holdId) {
      return res.status(400).json({ 
        success: false, 
        error: "holdId richiesto" 
      });
    }

    const sessionId = getSessionId(req);
    const result = await upgradeHoldToCheckout(holdId, sessionId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json({
      success: true,
      hold: result.hold,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Error upgrading hold:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.get("/api/events/:eventId/seats/status", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await db.query.siaeTicketedEvents.findFirst({
      where: eq(siaeTicketedEvents.id, eventId),
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Evento non trovato" });
    }

    const statuses = await getEventSeatStatuses(eventId);

    res.json({
      success: true,
      seats: statuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting seat status:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.get("/api/events/:eventId/seats/my-holds", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const sessionId = getSessionId(req);

    const holds = await getActiveHolds(eventId, sessionId);

    res.json({
      success: true,
      holds,
      sessionId,
    });
  } catch (error) {
    console.error("Error getting my holds:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.get("/api/events/:eventId/heatmap", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await db.query.siaeTicketedEvents.findFirst({
      where: eq(siaeTicketedEvents.id, eventId),
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Evento non trovato" });
    }

    const metrics = await db.select()
      .from(zoneMetrics)
      .where(eq(zoneMetrics.ticketedEventId, eventId));

    const seatStatuses = await db.select({
      zoneId: eventSeatStatus.zoneId,
      status: eventSeatStatus.status,
      count: sql<number>`count(*)`,
    })
      .from(eventSeatStatus)
      .where(eq(eventSeatStatus.ticketedEventId, eventId))
      .groupBy(eventSeatStatus.zoneId, eventSeatStatus.status);

    const heatmapData = metrics.map(m => ({
      zoneId: m.zoneId,
      totalCapacity: m.totalCapacity,
      available: m.availableCount,
      held: m.heldCount,
      sold: m.soldCount,
      blocked: m.blockedCount,
      occupancyPercent: Number(m.occupancyPercent),
      popularityScore: m.popularityScore,
      color: getHeatmapColor(Number(m.occupancyPercent)),
    }));

    res.json({
      success: true,
      heatmap: heatmapData,
      rawSeatStatuses: seatStatuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting heatmap:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

function getHeatmapColor(occupancyPercent: number): string {
  if (occupancyPercent >= 90) return '#ef4444';
  if (occupancyPercent >= 70) return '#f97316';
  if (occupancyPercent >= 50) return '#eab308';
  if (occupancyPercent >= 30) return '#84cc16';
  return '#22c55e';
}

router.post("/api/events/:eventId/recommendations", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const validation = recommendationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Dati non validi" 
      });
    }

    const { partySize, preferAccessible, preferredZoneType, maxPrice } = validation.data;
    const sessionId = getSessionId(req);

    const availableZones = await db.query.zoneMetrics.findMany({
      where: and(
        eq(zoneMetrics.ticketedEventId, eventId),
        sql`${zoneMetrics.availableCount} >= ${partySize || 1}`
      ),
      orderBy: [desc(zoneMetrics.popularityScore)],
    });

    let filteredZones = availableZones;

    if (preferAccessible) {
      const accessibleZoneIds = await db.select({ id: floorPlanZones.id })
        .from(floorPlanZones)
        .where(eq(floorPlanZones.metadata, sql`'{"accessible": true}'::jsonb`));
      
      const accessibleIds = accessibleZoneIds.map(z => z.id);
      filteredZones = filteredZones.filter(z => accessibleIds.includes(z.zoneId));
    }

    const suggestedZones = filteredZones.slice(0, 3);

    await db.insert(recommendationLogs).values({
      ticketedEventId: eventId,
      sessionId,
      partySize,
      preferAccessible,
      preferredZoneType,
      maxPrice: maxPrice?.toString(),
      suggestedZoneIds: suggestedZones.map(z => z.zoneId),
    });

    res.json({
      success: true,
      recommendations: suggestedZones.map(z => ({
        zoneId: z.zoneId,
        availableSeats: z.availableCount,
        occupancyPercent: Number(z.occupancyPercent),
        popularityScore: z.popularityScore,
        reason: (z.popularityScore ?? 50) > 70 
          ? 'Zona molto popolare' 
          : z.availableCount > (partySize || 1) * 2 
            ? 'Ottima disponibilità' 
            : 'Buona posizione',
      })),
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

router.post("/api/internal/cleanup-holds", async (req: Request, res: Response) => {
  try {
    const result = await cleanupExpiredHolds();
    res.json({ success: true, cleaned: result.cleaned });
  } catch (error) {
    console.error("Error cleaning up holds:", error);
    res.status(500).json({ success: false, error: "Errore interno del server" });
  }
});

export default router;
