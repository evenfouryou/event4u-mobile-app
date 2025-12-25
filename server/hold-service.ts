import { db } from "./db";
import { 
  seatHolds, 
  seatHoldEvents, 
  eventSeatStatus,
  floorPlanSeats,
  floorPlanZones,
  siaeEventSectors,
  type SeatHold,
  type InsertSeatHold,
} from "@shared/schema";
import { eq, and, lt, inArray, sql, isNull, or } from "drizzle-orm";

const HOLD_TTL_CART = 10 * 60 * 1000; // 10 minuti per carrello
const HOLD_TTL_CHECKOUT = 15 * 60 * 1000; // 15 minuti per checkout
const HOLD_TTL_STAFF = 60 * 60 * 1000; // 1 ora per staff reserve
const MAX_EXTENSIONS = 2; // Massimo 2 estensioni

export interface HoldResult {
  success: boolean;
  hold?: SeatHold;
  error?: string;
  expiresAt?: Date;
}

export interface HoldOptions {
  ticketedEventId: string;
  sessionId: string;
  sectorId?: string;
  seatId?: string;
  zoneId?: string;
  customerId?: string;
  userId?: string;
  holdType?: 'cart' | 'checkout' | 'staff_reserve';
  quantity?: number;
  priceSnapshot?: string;
}

export interface SeatStatusUpdate {
  eventId: string;
  sectorId?: string;
  zoneId?: string;
  seatId?: string;
  status: 'available' | 'held' | 'sold' | 'blocked';
  holdId?: string;
  expiresAt?: Date;
  sessionId?: string;
}

type WebSocketBroadcast = (eventId: string, update: SeatStatusUpdate) => void;

let wsBroadcast: WebSocketBroadcast | null = null;

export function setWebSocketBroadcast(fn: WebSocketBroadcast) {
  wsBroadcast = fn;
}

function broadcastStatusUpdate(update: SeatStatusUpdate) {
  if (wsBroadcast) {
    wsBroadcast(update.eventId, update);
  }
}

function getTTL(holdType: string): number {
  switch (holdType) {
    case 'checkout': return HOLD_TTL_CHECKOUT;
    case 'staff_reserve': return HOLD_TTL_STAFF;
    case 'cart':
    default: return HOLD_TTL_CART;
  }
}

export async function createHold(options: HoldOptions): Promise<HoldResult> {
  const {
    ticketedEventId,
    sessionId,
    sectorId,
    seatId,
    zoneId,
    customerId,
    userId,
    holdType = 'cart',
    quantity = 1,
    priceSnapshot,
  } = options;

  try {
    const result = await db.transaction(async (tx) => {
      if (seatId) {
        const existingHold = await tx.query.seatHolds.findFirst({
          where: and(
            eq(seatHolds.seatId, seatId),
            eq(seatHolds.ticketedEventId, ticketedEventId),
            eq(seatHolds.status, 'active')
          ),
        });

        if (existingHold) {
          if (existingHold.sessionId === sessionId) {
            return {
              success: true,
              hold: existingHold,
              expiresAt: existingHold.expiresAt,
            };
          }
          return {
            success: false,
            error: 'Questo posto è già in opzione da un altro utente',
          };
        }
      }

      if (zoneId && !seatId) {
        const activeHoldsInZone = await tx.select({
          totalQuantity: sql<number>`COALESCE(SUM(${seatHolds.quantity}), 0)`,
        })
          .from(seatHolds)
          .where(and(
            eq(seatHolds.zoneId, zoneId),
            eq(seatHolds.ticketedEventId, ticketedEventId),
            eq(seatHolds.status, 'active')
          ));

        const zone = await tx.query.floorPlanZones.findFirst({
          where: eq(floorPlanZones.id, zoneId),
        });

        if (zone && zone.capacity) {
          const heldQuantity = Number(activeHoldsInZone[0]?.totalQuantity || 0);
          const availableCapacity = zone.capacity - heldQuantity;
          
          if (quantity > availableCapacity) {
            return {
              success: false,
              error: `Solo ${availableCapacity} posti disponibili in questa zona`,
            };
          }
        }
      }

      const ttl = getTTL(holdType);
      const expiresAt = new Date(Date.now() + ttl);

      const [newHold] = await tx.insert(seatHolds).values({
        ticketedEventId,
        sessionId,
        sectorId,
        seatId,
        zoneId,
        customerId,
        userId,
        holdType,
        quantity,
        priceSnapshot,
        expiresAt,
        status: 'active',
      }).returning();

      await tx.insert(seatHoldEvents).values({
        holdId: newHold.id,
        eventType: 'created',
        previousStatus: null,
        newStatus: 'active',
        metadata: { holdType, quantity },
      });

      if (seatId) {
        await tx.insert(eventSeatStatus).values({
          ticketedEventId,
          seatId,
          sectorId,
          status: 'held',
          currentHoldId: newHold.id,
          holdExpiresAt: expiresAt,
        }).onConflictDoUpdate({
          target: [eventSeatStatus.ticketedEventId, eventSeatStatus.seatId],
          set: {
            status: 'held',
            currentHoldId: newHold.id,
            holdExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
        });
      }

      if (zoneId && !seatId) {
        await tx.insert(eventSeatStatus).values({
          ticketedEventId,
          zoneId,
          sectorId,
          status: 'held',
          currentHoldId: newHold.id,
          holdExpiresAt: expiresAt,
        }).onConflictDoUpdate({
          target: [eventSeatStatus.ticketedEventId, eventSeatStatus.zoneId],
          set: {
            status: 'held',
            currentHoldId: newHold.id,
            holdExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        hold: newHold,
        expiresAt,
      };
    });

    if (result.success && result.hold) {
      broadcastStatusUpdate({
        eventId: ticketedEventId,
        sectorId,
        zoneId,
        seatId,
        status: 'held',
        holdId: result.hold.id,
        expiresAt: result.expiresAt,
        sessionId,
      });
    }

    return result;
  } catch (error) {
    console.error('Error creating hold:', error);
    return {
      success: false,
      error: 'Errore durante la prenotazione del posto',
    };
  }
}

export async function extendHold(holdId: string, sessionId: string): Promise<HoldResult> {
  try {
    const hold = await db.query.seatHolds.findFirst({
      where: and(
        eq(seatHolds.id, holdId),
        eq(seatHolds.status, 'active')
      ),
    });

    if (!hold) {
      return {
        success: false,
        error: 'Hold non trovato o già scaduto',
      };
    }

    if (hold.sessionId !== sessionId) {
      return {
        success: false,
        error: 'Non hai i permessi per estendere questa opzione',
      };
    }

    if (hold.extendedCount >= MAX_EXTENSIONS) {
      return {
        success: false,
        error: 'Hai raggiunto il numero massimo di estensioni',
      };
    }

    const ttl = getTTL(hold.holdType);
    const newExpiresAt = new Date(Date.now() + ttl);

    const [updatedHold] = await db.update(seatHolds)
      .set({
        expiresAt: newExpiresAt,
        extendedCount: hold.extendedCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(seatHolds.id, holdId))
      .returning();

    await db.insert(seatHoldEvents).values({
      holdId: holdId,
      eventType: 'extended',
      previousStatus: 'active',
      newStatus: 'active',
      metadata: { 
        previousExpiresAt: hold.expiresAt,
        newExpiresAt,
        extensionCount: hold.extendedCount + 1,
      },
    });

    if (hold.seatId) {
      await db.update(eventSeatStatus)
        .set({
          holdExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(and(
          eq(eventSeatStatus.ticketedEventId, hold.ticketedEventId),
          eq(eventSeatStatus.seatId, hold.seatId)
        ));
    }

    broadcastStatusUpdate({
      eventId: hold.ticketedEventId,
      sectorId: hold.sectorId ?? undefined,
      zoneId: hold.zoneId ?? undefined,
      seatId: hold.seatId ?? undefined,
      status: 'held',
      holdId: holdId,
      expiresAt: newExpiresAt,
      sessionId,
    });

    return {
      success: true,
      hold: updatedHold,
      expiresAt: newExpiresAt,
    };
  } catch (error) {
    console.error('Error extending hold:', error);
    return {
      success: false,
      error: 'Errore durante l\'estensione dell\'opzione',
    };
  }
}

export async function releaseHold(holdId: string, sessionId: string): Promise<HoldResult> {
  try {
    const result = await db.transaction(async (tx) => {
      const hold = await tx.query.seatHolds.findFirst({
        where: eq(seatHolds.id, holdId),
      });

      if (!hold) {
        return {
          success: false,
          error: 'Hold non trovato',
          hold: undefined,
        };
      }

      if (hold.sessionId !== sessionId && hold.status === 'active') {
        return {
          success: false,
          error: 'Non hai i permessi per rilasciare questa opzione',
          hold: undefined,
        };
      }

      const previousStatus = hold.status;

      const [updatedHold] = await tx.update(seatHolds)
        .set({
          status: 'released',
          updatedAt: new Date(),
        })
        .where(eq(seatHolds.id, holdId))
        .returning();

      await tx.insert(seatHoldEvents).values({
        holdId: holdId,
        eventType: 'released',
        previousStatus,
        newStatus: 'released',
        metadata: { releasedBy: sessionId },
      });

      if (hold.seatId) {
        await tx.update(eventSeatStatus)
          .set({
            status: 'available',
            currentHoldId: null,
            holdExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(eventSeatStatus.ticketedEventId, hold.ticketedEventId),
            eq(eventSeatStatus.seatId, hold.seatId)
          ));
      }

      if (hold.zoneId && !hold.seatId) {
        await tx.update(eventSeatStatus)
          .set({
            status: 'available',
            currentHoldId: null,
            holdExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(eventSeatStatus.ticketedEventId, hold.ticketedEventId),
            eq(eventSeatStatus.zoneId, hold.zoneId)
          ));
      }

      return {
        success: true,
        hold: updatedHold,
        ticketedEventId: hold.ticketedEventId,
        sectorId: hold.sectorId,
        zoneId: hold.zoneId,
        seatId: hold.seatId,
      };
    });

    if (result.success && result.hold) {
      broadcastStatusUpdate({
        eventId: result.ticketedEventId!,
        sectorId: result.sectorId ?? undefined,
        zoneId: result.zoneId ?? undefined,
        seatId: result.seatId ?? undefined,
        status: 'available',
        sessionId,
      });
    }

    return {
      success: result.success,
      hold: result.hold,
      error: result.error,
    };
  } catch (error) {
    console.error('Error releasing hold:', error);
    return {
      success: false,
      error: 'Errore durante il rilascio dell\'opzione',
    };
  }
}

export async function convertHoldToOrder(holdId: string, orderId: string): Promise<HoldResult> {
  try {
    const hold = await db.query.seatHolds.findFirst({
      where: and(
        eq(seatHolds.id, holdId),
        eq(seatHolds.status, 'active')
      ),
    });

    if (!hold) {
      return {
        success: false,
        error: 'Hold non trovato o già convertito/scaduto',
      };
    }

    const [updatedHold] = await db.update(seatHolds)
      .set({
        status: 'converted',
        convertedToOrderId: orderId,
        updatedAt: new Date(),
      })
      .where(eq(seatHolds.id, holdId))
      .returning();

    await db.insert(seatHoldEvents).values({
      holdId: holdId,
      eventType: 'converted',
      previousStatus: 'active',
      newStatus: 'converted',
      metadata: { orderId },
    });

    if (hold.seatId) {
      await db.update(eventSeatStatus)
        .set({
          status: 'sold',
          currentHoldId: null,
          holdExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(eventSeatStatus.ticketedEventId, hold.ticketedEventId),
          eq(eventSeatStatus.seatId, hold.seatId)
        ));
    }

    broadcastStatusUpdate({
      eventId: hold.ticketedEventId,
      sectorId: hold.sectorId ?? undefined,
      zoneId: hold.zoneId ?? undefined,
      seatId: hold.seatId ?? undefined,
      status: 'sold',
    });

    return {
      success: true,
      hold: updatedHold,
    };
  } catch (error) {
    console.error('Error converting hold:', error);
    return {
      success: false,
      error: 'Errore durante la conversione dell\'opzione',
    };
  }
}

export async function cleanupExpiredHolds(): Promise<{ cleaned: number }> {
  const now = new Date();
  
  try {
    const expiredHolds = await db.select()
      .from(seatHolds)
      .where(and(
        eq(seatHolds.status, 'active'),
        lt(seatHolds.expiresAt, now)
      ));

    if (expiredHolds.length === 0) {
      return { cleaned: 0 };
    }

    const holdIds = expiredHolds.map(h => h.id);

    await db.update(seatHolds)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(inArray(seatHolds.id, holdIds));

    for (const hold of expiredHolds) {
      await db.insert(seatHoldEvents).values({
        holdId: hold.id,
        eventType: 'expired',
        previousStatus: 'active',
        newStatus: 'expired',
        metadata: { expiredAt: now.toISOString() },
      });

      if (hold.seatId) {
        await db.update(eventSeatStatus)
          .set({
            status: 'available',
            currentHoldId: null,
            holdExpiresAt: null,
            updatedAt: now,
          })
          .where(and(
            eq(eventSeatStatus.ticketedEventId, hold.ticketedEventId),
            eq(eventSeatStatus.seatId, hold.seatId)
          ));
      }

      broadcastStatusUpdate({
        eventId: hold.ticketedEventId,
        sectorId: hold.sectorId ?? undefined,
        zoneId: hold.zoneId ?? undefined,
        seatId: hold.seatId ?? undefined,
        status: 'available',
      });
    }

    console.log(`Cleaned up ${expiredHolds.length} expired holds`);
    return { cleaned: expiredHolds.length };
  } catch (error) {
    console.error('Error cleaning up expired holds:', error);
    return { cleaned: 0 };
  }
}

export async function getActiveHolds(ticketedEventId: string, sessionId?: string): Promise<SeatHold[]> {
  const conditions = [
    eq(seatHolds.ticketedEventId, ticketedEventId),
    eq(seatHolds.status, 'active'),
  ];

  if (sessionId) {
    conditions.push(eq(seatHolds.sessionId, sessionId));
  }

  return db.query.seatHolds.findMany({
    where: and(...conditions),
    with: {
      seat: true,
      zone: true,
      sector: true,
    },
  });
}

export async function getEventSeatStatuses(ticketedEventId: string): Promise<{
  seatId: string | null;
  zoneId: string | null;
  status: string;
  holdExpiresAt: Date | null;
}[]> {
  return db.select({
    seatId: eventSeatStatus.seatId,
    zoneId: eventSeatStatus.zoneId,
    status: eventSeatStatus.status,
    holdExpiresAt: eventSeatStatus.holdExpiresAt,
  })
    .from(eventSeatStatus)
    .where(eq(eventSeatStatus.ticketedEventId, ticketedEventId));
}

export async function upgradeHoldToCheckout(holdId: string, sessionId: string): Promise<HoldResult> {
  try {
    const hold = await db.query.seatHolds.findFirst({
      where: and(
        eq(seatHolds.id, holdId),
        eq(seatHolds.status, 'active')
      ),
    });

    if (!hold) {
      return {
        success: false,
        error: 'Hold non trovato',
      };
    }

    if (hold.sessionId !== sessionId) {
      return {
        success: false,
        error: 'Non hai i permessi per questa operazione',
      };
    }

    const newExpiresAt = new Date(Date.now() + HOLD_TTL_CHECKOUT);

    const [updatedHold] = await db.update(seatHolds)
      .set({
        holdType: 'checkout',
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(seatHolds.id, holdId))
      .returning();

    await db.insert(seatHoldEvents).values({
      holdId: holdId,
      eventType: 'extended',
      previousStatus: 'active',
      newStatus: 'active',
      metadata: { 
        upgradedTo: 'checkout',
        previousExpiresAt: hold.expiresAt,
        newExpiresAt,
      },
    });

    if (hold.seatId) {
      await db.update(eventSeatStatus)
        .set({
          holdExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(and(
          eq(eventSeatStatus.ticketedEventId, hold.ticketedEventId),
          eq(eventSeatStatus.seatId, hold.seatId)
        ));
    }

    return {
      success: true,
      hold: updatedHold,
      expiresAt: newExpiresAt,
    };
  } catch (error) {
    console.error('Error upgrading hold:', error);
    return {
      success: false,
      error: 'Errore durante l\'upgrade dell\'opzione',
    };
  }
}

let cleanupInterval: NodeJS.Timeout | null = null;

export function startHoldCleanupJob(intervalMs: number = 30000) {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  cleanupInterval = setInterval(async () => {
    await cleanupExpiredHolds();
  }, intervalMs);

  console.log(`Hold cleanup job started (interval: ${intervalMs}ms)`);
}

export function stopHoldCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Hold cleanup job stopped');
  }
}
