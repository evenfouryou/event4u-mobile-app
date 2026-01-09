import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, between, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import {
  organizerPlans,
  organizerSubscriptions,
  organizerCommissionProfiles,
  organizerWallets,
  organizerWalletLedger,
  organizerInvoices,
  organizerInvoiceItems,
  companies,
  insertOrganizerPlanSchema,
  insertOrganizerSubscriptionSchema,
  insertOrganizerCommissionProfileSchema,
} from "@shared/schema";
import {
  CommissionService,
  WalletService,
  BillingService,
  SubscriptionService,
} from "./billing-service";

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autorizzato" });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ message: "Accesso riservato ai Super Admin" });
  }
  next();
}

function requireGestore(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || (user.role !== "super_admin" && user.role !== "gestore")) {
    return res.status(403).json({ message: "Accesso riservato ai Gestori" });
  }
  next();
}

// ============================================================================
// ADMIN ENDPOINTS - Plans Management
// ============================================================================

router.get("/api/admin/billing/plans", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const plans = await db.select().from(organizerPlans).orderBy(desc(organizerPlans.createdAt));
    res.json(plans);
  } catch (error) {
    console.error("[Billing] Error fetching plans:", error);
    res.status(500).json({ message: "Errore nel recupero dei piani" });
  }
});

router.post("/api/admin/billing/plans", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const validated = insertOrganizerPlanSchema.parse(req.body);
    const [plan] = await db.insert(organizerPlans).values(validated).returning();
    res.status(201).json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    console.error("[Billing] Error creating plan:", error);
    res.status(500).json({ message: "Errore nella creazione del piano" });
  }
});

router.put("/api/admin/billing/plans/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = insertOrganizerPlanSchema.partial().parse(req.body);
    
    const [plan] = await db
      .update(organizerPlans)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(organizerPlans.id, id))
      .returning();

    if (!plan) {
      return res.status(404).json({ message: "Piano non trovato" });
    }
    res.json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    console.error("[Billing] Error updating plan:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del piano" });
  }
});

router.delete("/api/admin/billing/plans/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [plan] = await db
      .update(organizerPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(organizerPlans.id, id))
      .returning();

    if (!plan) {
      return res.status(404).json({ message: "Piano non trovato" });
    }
    res.json({ message: "Piano disattivato", plan });
  } catch (error) {
    console.error("[Billing] Error deactivating plan:", error);
    res.status(500).json({ message: "Errore nella disattivazione del piano" });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Organizer Subscriptions
// ============================================================================

router.get("/api/admin/billing/organizers", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const allCompanies = await db.select().from(companies).where(eq(companies.active, true));

    const result = await Promise.all(
      allCompanies.map(async (company) => {
        const subscription = await SubscriptionService.getSubscription(company.id);
        const wallet = await WalletService.getOrCreateWallet(company.id);
        const commissionProfile = await CommissionService.getCommissionProfile(company.id);

        return {
          company,
          subscription,
          wallet: {
            id: wallet.id,
            balance: wallet.balance,
            thresholdAmount: wallet.thresholdAmount,
            currency: wallet.currency,
          },
          commissionProfile,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("[Billing] Error fetching organizers:", error);
    res.status(500).json({ message: "Errore nel recupero degli organizzatori" });
  }
});

router.get("/api/admin/billing/organizers/:companyId", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    const subscription = await SubscriptionService.getSubscription(companyId);
    const wallet = await WalletService.getOrCreateWallet(companyId);
    const commissionProfile = await CommissionService.getCommissionProfile(companyId);
    const invoices = await BillingService.getInvoicesByCompany(companyId);
    const ledgerEntries = await WalletService.getLedgerEntries(companyId, 50);

    let plan = null;
    if (subscription?.planId) {
      [plan] = await db.select().from(organizerPlans).where(eq(organizerPlans.id, subscription.planId)).limit(1);
    }

    res.json({
      company,
      subscription,
      plan,
      wallet,
      commissionProfile,
      invoices,
      recentLedgerEntries: ledgerEntries,
    });
  } catch (error) {
    console.error("[Billing] Error fetching organizer details:", error);
    res.status(500).json({ message: "Errore nel recupero dei dettagli" });
  }
});

router.post("/api/admin/billing/organizers/:companyId/subscription", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    // Convert date strings to Date objects for drizzle-zod validation
    const requestData = {
      ...req.body,
      companyId,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      nextBillingDate: req.body.nextBillingDate ? new Date(req.body.nextBillingDate) : undefined,
    };

    const validated = insertOrganizerSubscriptionSchema.parse(requestData);

    const [subscription] = await db.insert(organizerSubscriptions).values(validated).returning();
    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[Billing] Zod validation error:", error.errors);
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    console.error("[Billing] Error creating subscription:", error);
    res.status(500).json({ message: "Errore nella creazione dell'abbonamento" });
  }
});

router.put("/api/admin/billing/organizers/:companyId/subscription", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { status, endDate } = req.body;

    const subscription = await SubscriptionService.getSubscription(companyId);
    if (!subscription) {
      return res.status(404).json({ message: "Abbonamento non trovato" });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (endDate) updateData.endDate = new Date(endDate);

    const [updated] = await db
      .update(organizerSubscriptions)
      .set(updateData)
      .where(eq(organizerSubscriptions.id, subscription.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("[Billing] Error updating subscription:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento dell'abbonamento" });
  }
});

router.put("/api/admin/billing/organizers/:companyId/commissions", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    const existingProfile = await CommissionService.getCommissionProfile(companyId);

    if (existingProfile) {
      const [updated] = await db
        .update(organizerCommissionProfiles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(organizerCommissionProfiles.id, existingProfile.id))
        .returning();
      return res.json(updated);
    }

    const validated = insertOrganizerCommissionProfileSchema.parse({
      ...req.body,
      companyId,
    });

    const [profile] = await db.insert(organizerCommissionProfiles).values(validated).returning();
    res.status(201).json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    console.error("[Billing] Error updating commission profile:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del profilo commissioni" });
  }
});

router.put("/api/admin/billing/organizers/:companyId/wallet-threshold", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { thresholdAmount } = req.body;

    if (typeof thresholdAmount !== "number" && typeof thresholdAmount !== "string") {
      return res.status(400).json({ message: "thresholdAmount richiesto" });
    }

    const wallet = await WalletService.getOrCreateWallet(companyId);

    const [updated] = await db
      .update(organizerWallets)
      .set({ thresholdAmount: String(thresholdAmount), updatedAt: new Date() })
      .where(eq(organizerWallets.id, wallet.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("[Billing] Error updating wallet threshold:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della soglia wallet" });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Invoices
// ============================================================================

router.get("/api/admin/billing/invoices", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { status, from, to } = req.query;

    let query = db.select().from(organizerInvoices);

    const conditions = [];
    if (status && typeof status === "string") {
      conditions.push(eq(organizerInvoices.status, status));
    }
    if (from && typeof from === "string") {
      conditions.push(gte(organizerInvoices.createdAt!, new Date(from)));
    }
    if (to && typeof to === "string") {
      conditions.push(lte(organizerInvoices.createdAt!, new Date(to)));
    }

    const invoices = conditions.length > 0
      ? await db.select().from(organizerInvoices).where(and(...conditions)).orderBy(desc(organizerInvoices.createdAt))
      : await db.select().from(organizerInvoices).orderBy(desc(organizerInvoices.createdAt));

    res.json(invoices);
  } catch (error) {
    console.error("[Billing] Error fetching invoices:", error);
    res.status(500).json({ message: "Errore nel recupero delle fatture" });
  }
});

router.post("/api/admin/billing/organizers/:companyId/invoices", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { periodStart, periodEnd, notes } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ message: "periodStart e periodEnd richiesti" });
    }

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    const invoice = await BillingService.createInvoice({
      companyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      notes,
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error("[Billing] Error creating invoice:", error);
    res.status(500).json({ message: "Errore nella creazione della fattura" });
  }
});

router.put("/api/admin/billing/invoices/:id/mark-paid", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await BillingService.markInvoicePaid(id);
    res.json(invoice);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invoice not found") {
        return res.status(404).json({ message: "Fattura non trovata" });
      }
      if (error.message === "Invoice already paid") {
        return res.status(400).json({ message: "Fattura già pagata" });
      }
    }
    console.error("[Billing] Error marking invoice paid:", error);
    res.status(500).json({ message: "Errore nel segnare la fattura come pagata" });
  }
});

// ============================================================================
// ORGANIZER ENDPOINTS - Subscription
// ============================================================================

router.get("/api/organizer/billing/subscription", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const subscription = await SubscriptionService.getSubscription(companyId);
    if (!subscription) {
      return res.json(null);
    }

    let plan = null;
    if (subscription.planId) {
      [plan] = await db.select().from(organizerPlans).where(eq(organizerPlans.id, subscription.planId)).limit(1);
    }

    const eventsRemaining = await SubscriptionService.getEventsRemaining(companyId);
    const canCreate = await SubscriptionService.canCreateEvent(companyId);

    res.json({
      subscription,
      plan,
      eventsRemaining,
      canCreateEvent: canCreate,
    });
  } catch (error) {
    console.error("[Billing] Error fetching subscription:", error);
    res.status(500).json({ message: "Errore nel recupero dell'abbonamento" });
  }
});

// ============================================================================
// ORGANIZER ENDPOINTS - Wallet & Ledger
// ============================================================================

router.get("/api/organizer/billing/wallet", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const wallet = await WalletService.getOrCreateWallet(companyId);
    const thresholdStatus = await WalletService.checkThreshold(companyId);

    res.json({
      wallet,
      thresholdStatus,
    });
  } catch (error) {
    console.error("[Billing] Error fetching wallet:", error);
    res.status(500).json({ message: "Errore nel recupero del wallet" });
  }
});

router.get("/api/organizer/billing/ledger", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const { from, to, event_id, limit: limitParam } = req.query;
    const limit = limitParam ? parseInt(limitParam as string) : 100;

    const conditions = [eq(organizerWalletLedger.companyId, companyId)];

    if (from && typeof from === "string") {
      conditions.push(gte(organizerWalletLedger.createdAt!, new Date(from)));
    }
    if (to && typeof to === "string") {
      conditions.push(lte(organizerWalletLedger.createdAt!, new Date(to)));
    }
    if (event_id && typeof event_id === "string") {
      conditions.push(
        and(
          eq(organizerWalletLedger.referenceType, "event"),
          eq(organizerWalletLedger.referenceId, event_id)
        )!
      );
    }

    const entries = await db
      .select()
      .from(organizerWalletLedger)
      .where(and(...conditions))
      .orderBy(desc(organizerWalletLedger.createdAt))
      .limit(limit);

    res.json(entries);
  } catch (error) {
    console.error("[Billing] Error fetching ledger:", error);
    res.status(500).json({ message: "Errore nel recupero del ledger" });
  }
});

// ============================================================================
// ORGANIZER ENDPOINTS - Invoices
// ============================================================================

router.get("/api/organizer/billing/invoices", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const invoices = await BillingService.getInvoicesByCompany(companyId);

    const invoicesWithItems = await Promise.all(
      invoices.map(async (invoice) => {
        const items = await db
          .select()
          .from(organizerInvoiceItems)
          .where(eq(organizerInvoiceItems.invoiceId, invoice.id));
        return { ...invoice, items };
      })
    );

    res.json(invoicesWithItems);
  } catch (error) {
    console.error("[Billing] Error fetching invoices:", error);
    res.status(500).json({ message: "Errore nel recupero delle fatture" });
  }
});

// ============================================================================
// REPORTS - Helper Functions
// ============================================================================

interface SalesReportData {
  period: { from: string; to: string };
  summary: {
    ticketsSoldTotal: number;
    ticketsSoldOnline: number;
    ticketsSoldPrinted: number;
    ticketsSoldPr: number;
    grossRevenueTotal: number;
    commissionOnline: number;
    commissionPrinted: number;
    commissionPr: number;
    commissionTotal: number;
    netToOrganizer: number;
    walletDebt: number;
    invoicesIssued: number;
    invoicesPaid: number;
  };
  byEvent: Array<{
    eventId: string;
    eventName: string;
    eventDate: string;
    ticketsSold: number;
    grossRevenue: number;
    commissions: number;
    netRevenue: number;
  }>;
  byChannel: Array<{
    channel: 'online' | 'printed' | 'pr';
    ticketsSold: number;
    grossRevenue: number;
    commissions: number;
  }>;
}

function generateCSV(data: SalesReportData): string {
  const lines: string[] = [];
  
  lines.push("REPORT VENDITE");
  lines.push(`Periodo: ${data.period.from} - ${data.period.to}`);
  lines.push("");
  
  lines.push("RIEPILOGO");
  lines.push(`Biglietti Venduti Totale,${data.summary.ticketsSoldTotal}`);
  lines.push(`Biglietti Online,${data.summary.ticketsSoldOnline}`);
  lines.push(`Biglietti Biglietteria,${data.summary.ticketsSoldPrinted}`);
  lines.push(`Biglietti PR,${data.summary.ticketsSoldPr}`);
  lines.push(`Ricavo Lordo Totale,${data.summary.grossRevenueTotal.toFixed(2)}`);
  lines.push(`Commissioni Online,${data.summary.commissionOnline.toFixed(2)}`);
  lines.push(`Commissioni Biglietteria,${data.summary.commissionPrinted.toFixed(2)}`);
  lines.push(`Commissioni PR,${data.summary.commissionPr.toFixed(2)}`);
  lines.push(`Commissioni Totali,${data.summary.commissionTotal.toFixed(2)}`);
  lines.push(`Netto Organizzatore,${data.summary.netToOrganizer.toFixed(2)}`);
  lines.push(`Debito Wallet,${data.summary.walletDebt.toFixed(2)}`);
  lines.push(`Fatture Emesse,${data.summary.invoicesIssued}`);
  lines.push(`Fatture Pagate,${data.summary.invoicesPaid}`);
  lines.push("");
  
  if (data.byEvent.length > 0) {
    lines.push("PER EVENTO");
    lines.push("ID Evento,Nome Evento,Data Evento,Biglietti Venduti,Ricavo Lordo,Commissioni,Ricavo Netto");
    for (const event of data.byEvent) {
      lines.push(`${event.eventId},${event.eventName.replace(/,/g, ";")},${event.eventDate},${event.ticketsSold},${event.grossRevenue.toFixed(2)},${event.commissions.toFixed(2)},${event.netRevenue.toFixed(2)}`);
    }
    lines.push("");
  }
  
  if (data.byChannel.length > 0) {
    lines.push("PER CANALE");
    lines.push("Canale,Biglietti Venduti,Ricavo Lordo,Commissioni");
    for (const channel of data.byChannel) {
      const channelLabel = channel.channel === 'online' ? 'Online' : channel.channel === 'printed' ? 'Biglietteria' : 'PR';
      lines.push(`${channelLabel},${channel.ticketsSold},${channel.grossRevenue.toFixed(2)},${channel.commissions.toFixed(2)}`);
    }
  }
  
  return lines.join("\n");
}

async function generateSalesReport(
  companyIdFilter: string | null,
  eventIdFilter: string | null,
  fromDate: string | null,
  toDate: string | null
): Promise<SalesReportData> {
  const conditions = [];
  
  if (companyIdFilter) {
    conditions.push(eq(organizerWalletLedger.companyId, companyIdFilter));
  }
  if (fromDate) {
    conditions.push(gte(organizerWalletLedger.createdAt!, new Date(fromDate)));
  }
  if (toDate) {
    conditions.push(lte(organizerWalletLedger.createdAt!, new Date(toDate)));
  }
  if (eventIdFilter) {
    conditions.push(
      and(
        eq(organizerWalletLedger.referenceType, "event"),
        eq(organizerWalletLedger.referenceId, eventIdFilter)
      )!
    );
  }
  
  conditions.push(eq(organizerWalletLedger.type, "commission"));
  
  const entries = await db
    .select()
    .from(organizerWalletLedger)
    .where(and(...conditions))
    .orderBy(desc(organizerWalletLedger.createdAt));
  
  const channelData: Record<string, { ticketsSold: number; grossRevenue: number; commissions: number }> = {
    online: { ticketsSold: 0, grossRevenue: 0, commissions: 0 },
    printed: { ticketsSold: 0, grossRevenue: 0, commissions: 0 },
    pr: { ticketsSold: 0, grossRevenue: 0, commissions: 0 },
  };
  
  const eventData: Record<string, { eventName: string; eventDate: string; ticketsSold: number; grossRevenue: number; commissions: number }> = {};
  
  for (const entry of entries) {
    const amount = Math.abs(parseFloat(entry.amount));
    const channel = entry.channel || "online";
    const ticketCount = entry.ticketQuantity || 1;
    const grossAmount = entry.ticketGrossAmount ? parseFloat(entry.ticketGrossAmount) : 0;
    
    if (channelData[channel]) {
      channelData[channel].ticketsSold += ticketCount;
      channelData[channel].grossRevenue += grossAmount;
      channelData[channel].commissions += amount;
    }
    
    if (entry.referenceType === "event" && entry.referenceId) {
      if (!eventData[entry.referenceId]) {
        eventData[entry.referenceId] = {
          eventName: entry.eventName || "Evento",
          eventDate: entry.createdAt ? new Date(entry.createdAt).toISOString().split("T")[0] : "",
          ticketsSold: 0,
          grossRevenue: 0,
          commissions: 0,
        };
      }
      eventData[entry.referenceId].ticketsSold += ticketCount;
      eventData[entry.referenceId].grossRevenue += grossAmount;
      eventData[entry.referenceId].commissions += amount;
    }
  }
  
  const invoiceConditions = [];
  if (companyIdFilter) {
    invoiceConditions.push(eq(organizerInvoices.companyId, companyIdFilter));
  }
  if (fromDate) {
    invoiceConditions.push(gte(organizerInvoices.createdAt!, new Date(fromDate)));
  }
  if (toDate) {
    invoiceConditions.push(lte(organizerInvoices.createdAt!, new Date(toDate)));
  }
  
  const allInvoices = invoiceConditions.length > 0
    ? await db.select().from(organizerInvoices).where(and(...invoiceConditions))
    : await db.select().from(organizerInvoices);
  
  const invoicesIssued = allInvoices.filter(i => i.status === "issued" || i.status === "paid").length;
  const invoicesPaid = allInvoices.filter(i => i.status === "paid").length;
  
  let walletDebt = 0;
  if (companyIdFilter) {
    const wallet = await WalletService.getOrCreateWallet(companyIdFilter);
    walletDebt = Math.abs(Math.min(0, parseFloat(wallet.balance)));
  }
  
  const ticketsSoldTotal = channelData.online.ticketsSold + channelData.printed.ticketsSold + channelData.pr.ticketsSold;
  const grossRevenueTotal = channelData.online.grossRevenue + channelData.printed.grossRevenue + channelData.pr.grossRevenue;
  const commissionTotal = channelData.online.commissions + channelData.printed.commissions + channelData.pr.commissions;
  
  return {
    period: {
      from: fromDate || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split("T")[0],
      to: toDate || new Date().toISOString().split("T")[0],
    },
    summary: {
      ticketsSoldTotal,
      ticketsSoldOnline: channelData.online.ticketsSold,
      ticketsSoldPrinted: channelData.printed.ticketsSold,
      ticketsSoldPr: channelData.pr.ticketsSold,
      grossRevenueTotal,
      commissionOnline: channelData.online.commissions,
      commissionPrinted: channelData.printed.commissions,
      commissionPr: channelData.pr.commissions,
      commissionTotal,
      netToOrganizer: grossRevenueTotal - commissionTotal,
      walletDebt,
      invoicesIssued,
      invoicesPaid,
    },
    byEvent: Object.entries(eventData).map(([eventId, data]) => ({
      eventId,
      eventName: data.eventName,
      eventDate: data.eventDate,
      ticketsSold: data.ticketsSold,
      grossRevenue: data.grossRevenue,
      commissions: data.commissions,
      netRevenue: data.grossRevenue - data.commissions,
    })),
    byChannel: [
      { channel: 'online' as const, ...channelData.online },
      { channel: 'printed' as const, ...channelData.printed },
      { channel: 'pr' as const, ...channelData.pr },
    ].filter(c => c.ticketsSold > 0 || c.commissions > 0),
  };
}

// ============================================================================
// REPORTS - Admin
// ============================================================================

router.get("/api/admin/billing/reports/sales", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { from, to, companyId, eventId, format } = req.query;
    
    const reportData = await generateSalesReport(
      companyId as string | null,
      eventId as string | null,
      from as string | null,
      to as string | null
    );
    
    if (format === "csv") {
      const csv = generateCSV(reportData);
      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="report-sales-${dateStr}.csv"`);
      return res.send(csv);
    }
    
    res.json(reportData);
  } catch (error) {
    console.error("[Billing] Error generating sales report:", error);
    res.status(500).json({ message: "Errore nella generazione del report" });
  }
});

// ============================================================================
// REPORTS - Organizer
// ============================================================================

router.get("/api/organizer/billing/reports/sales", requireAuth, requireGestore, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Utente non associato a un'azienda" });
    }

    const { from, to, eventId, format } = req.query;
    
    const reportData = await generateSalesReport(
      companyId,
      eventId as string | null,
      from as string | null,
      to as string | null
    );
    
    if (format === "csv") {
      const csv = generateCSV(reportData);
      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="report-sales-${dateStr}.csv"`);
      return res.send(csv);
    }
    
    res.json(reportData);
  } catch (error) {
    console.error("[Billing] Error generating sales report:", error);
    res.status(500).json({ message: "Errore nella generazione del report" });
  }
});

export default router;
