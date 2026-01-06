import { Router, Request, Response } from "express";
import { db } from "./db";
import { 
  marketingEmailTemplates, 
  marketingEmailCampaigns, 
  marketingEmailLogs,
  siaeCustomers,
  siaeTickets,
  siaeTicketedEvents,
  events,
  insertMarketingEmailTemplateSchema,
  insertMarketingEmailCampaignSchema,
} from "@shared/schema";
import { eq, and, sql, desc, gte, lte, count, isNull } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import { emailTransporter } from "./email-service";
import { z } from "zod";

const router = Router();

function getCompanyId(req: Request): string | null {
  const user = req.user as any;
  return user?.companyId || null;
}

// CRUD Template Email

// GET /api/marketing/templates - Lista template
router.get("/api/marketing/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const templates = await db.select()
      .from(marketingEmailTemplates)
      .where(eq(marketingEmailTemplates.companyId, companyId))
      .orderBy(desc(marketingEmailTemplates.createdAt));

    res.json(templates);
  } catch (error) {
    console.error("[MARKETING] Error fetching templates:", error);
    res.status(500).json({ message: "Errore nel caricamento dei template" });
  }
});

// POST /api/marketing/templates - Crea template
router.post("/api/marketing/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const data = insertMarketingEmailTemplateSchema.parse({
      ...req.body,
      companyId,
    });

    const [template] = await db.insert(marketingEmailTemplates)
      .values(data)
      .returning();

    res.status(201).json(template);
  } catch (error) {
    console.error("[MARKETING] Error creating template:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    res.status(500).json({ message: "Errore nella creazione del template" });
  }
});

// PUT /api/marketing/templates/:id - Modifica template
router.put("/api/marketing/templates/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const { id } = req.params;
    const { name, subject, htmlContent, type, isActive } = req.body;

    const [updated] = await db.update(marketingEmailTemplates)
      .set({ 
        name, 
        subject, 
        htmlContent, 
        type, 
        isActive,
        updatedAt: new Date(),
      })
      .where(and(
        eq(marketingEmailTemplates.id, id),
        eq(marketingEmailTemplates.companyId, companyId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Template non trovato" });
    }

    res.json(updated);
  } catch (error) {
    console.error("[MARKETING] Error updating template:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento del template" });
  }
});

// DELETE /api/marketing/templates/:id - Elimina template
router.delete("/api/marketing/templates/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const { id } = req.params;

    const [deleted] = await db.delete(marketingEmailTemplates)
      .where(and(
        eq(marketingEmailTemplates.id, id),
        eq(marketingEmailTemplates.companyId, companyId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Template non trovato" });
    }

    res.json({ message: "Template eliminato" });
  } catch (error) {
    console.error("[MARKETING] Error deleting template:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del template" });
  }
});

// CRUD Campagne

// GET /api/marketing/campaigns - Lista campagne con stats
router.get("/api/marketing/campaigns", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const campaigns = await db.select({
      campaign: marketingEmailCampaigns,
      template: marketingEmailTemplates,
    })
      .from(marketingEmailCampaigns)
      .leftJoin(marketingEmailTemplates, eq(marketingEmailCampaigns.templateId, marketingEmailTemplates.id))
      .where(eq(marketingEmailCampaigns.companyId, companyId))
      .orderBy(desc(marketingEmailCampaigns.createdAt));

    res.json(campaigns.map(c => ({
      ...c.campaign,
      template: c.template,
    })));
  } catch (error) {
    console.error("[MARKETING] Error fetching campaigns:", error);
    res.status(500).json({ message: "Errore nel caricamento delle campagne" });
  }
});

// POST /api/marketing/campaigns - Crea campagna (draft)
router.post("/api/marketing/campaigns", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const data = insertMarketingEmailCampaignSchema.parse({
      ...req.body,
      companyId,
      status: 'draft',
    });

    const [campaign] = await db.insert(marketingEmailCampaigns)
      .values(data)
      .returning();

    res.status(201).json(campaign);
  } catch (error) {
    console.error("[MARKETING] Error creating campaign:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    res.status(500).json({ message: "Errore nella creazione della campagna" });
  }
});

// PUT /api/marketing/campaigns/:id - Modifica campagna
router.put("/api/marketing/campaigns/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const { id } = req.params;
    const { name, templateId, eventId, triggerType } = req.body;

    const [updated] = await db.update(marketingEmailCampaigns)
      .set({ name, templateId, eventId, triggerType })
      .where(and(
        eq(marketingEmailCampaigns.id, id),
        eq(marketingEmailCampaigns.companyId, companyId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Campagna non trovata" });
    }

    res.json(updated);
  } catch (error) {
    console.error("[MARKETING] Error updating campaign:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della campagna" });
  }
});

// POST /api/marketing/campaigns/:id/schedule - Programma invio
router.post("/api/marketing/campaigns/:id/schedule", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const { id } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ message: "Data programmazione richiesta" });
    }

    const [updated] = await db.update(marketingEmailCampaigns)
      .set({ 
        scheduledAt: new Date(scheduledAt),
        status: 'scheduled',
      })
      .where(and(
        eq(marketingEmailCampaigns.id, id),
        eq(marketingEmailCampaigns.companyId, companyId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Campagna non trovata" });
    }

    res.json(updated);
  } catch (error) {
    console.error("[MARKETING] Error scheduling campaign:", error);
    res.status(500).json({ message: "Errore nella programmazione della campagna" });
  }
});

// POST /api/marketing/campaigns/:id/send - Invia subito
router.post("/api/marketing/campaigns/:id/send", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const { id } = req.params;

    const [campaign] = await db.select()
      .from(marketingEmailCampaigns)
      .where(and(
        eq(marketingEmailCampaigns.id, id),
        eq(marketingEmailCampaigns.companyId, companyId)
      ));

    if (!campaign) {
      return res.status(404).json({ message: "Campagna non trovata" });
    }

    if (!campaign.templateId) {
      return res.status(400).json({ message: "Template non selezionato" });
    }

    const [template] = await db.select()
      .from(marketingEmailTemplates)
      .where(eq(marketingEmailTemplates.id, campaign.templateId));

    if (!template) {
      return res.status(400).json({ message: "Template non trovato" });
    }

    let customers: Array<{ id: string; email: string; firstName: string | null }> = [];

    if (campaign.eventId) {
      const tickets = await db.select({
        customerId: siaeTickets.customerId,
      })
        .from(siaeTickets)
        .innerJoin(siaeTicketedEvents, eq(siaeTickets.ticketedEventId, siaeTicketedEvents.id))
        .where(eq(siaeTicketedEvents.eventId, campaign.eventId));

      const customerIds = [...new Set(tickets.map(t => t.customerId).filter(Boolean))] as string[];
      
      if (customerIds.length > 0) {
        const customersData = await db.select({
          id: siaeCustomers.id,
          email: siaeCustomers.email,
          firstName: siaeCustomers.firstName,
        })
          .from(siaeCustomers)
          .where(sql`${siaeCustomers.id} = ANY(${customerIds})`);
        
        customers = customersData.filter(c => c.email);
      }
    } else {
      const customersData = await db.select({
        id: siaeCustomers.id,
        email: siaeCustomers.email,
        firstName: siaeCustomers.firstName,
      })
        .from(siaeCustomers)
        .where(eq(siaeCustomers.companyId, companyId));
      
      customers = customersData.filter(c => c.email);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const customer of customers) {
      try {
        const personalizedHtml = template.htmlContent
          .replace(/\{\{firstName\}\}/g, customer.firstName || 'Cliente')
          .replace(/\{\{email\}\}/g, customer.email);

        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || `"Event4U" <${process.env.SMTP_USER}>`,
          to: customer.email,
          subject: template.subject,
          html: personalizedHtml,
        });

        await db.insert(marketingEmailLogs).values({
          campaignId: campaign.id,
          customerId: customer.id,
          email: customer.email,
          status: 'sent',
          sentAt: new Date(),
        });

        successCount++;
      } catch (emailError) {
        console.error(`[MARKETING] Error sending email to ${customer.email}:`, emailError);
        
        await db.insert(marketingEmailLogs).values({
          campaignId: campaign.id,
          customerId: customer.id,
          email: customer.email,
          status: 'failed',
          errorMessage: emailError instanceof Error ? emailError.message : 'Errore sconosciuto',
        });

        errorCount++;
      }
    }

    await db.update(marketingEmailCampaigns)
      .set({
        status: 'sent',
        sentAt: new Date(),
        recipientCount: customers.length,
      })
      .where(eq(marketingEmailCampaigns.id, id));

    res.json({
      message: `Campagna inviata: ${successCount} successi, ${errorCount} errori`,
      successCount,
      errorCount,
      totalRecipients: customers.length,
    });
  } catch (error) {
    console.error("[MARKETING] Error sending campaign:", error);
    res.status(500).json({ message: "Errore nell'invio della campagna" });
  }
});

// DELETE /api/marketing/campaigns/:id - Elimina campagna
router.delete("/api/marketing/campaigns/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const { id } = req.params;

    await db.delete(marketingEmailLogs)
      .where(eq(marketingEmailLogs.campaignId, id));

    const [deleted] = await db.delete(marketingEmailCampaigns)
      .where(and(
        eq(marketingEmailCampaigns.id, id),
        eq(marketingEmailCampaigns.companyId, companyId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Campagna non trovata" });
    }

    res.json({ message: "Campagna eliminata" });
  } catch (error) {
    console.error("[MARKETING] Error deleting campaign:", error);
    res.status(500).json({ message: "Errore nell'eliminazione della campagna" });
  }
});

// Analytics

// GET /api/marketing/campaigns/:id/stats - Statistiche campagna
router.get("/api/marketing/campaigns/:id/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const { id } = req.params;

    const [campaign] = await db.select()
      .from(marketingEmailCampaigns)
      .where(and(
        eq(marketingEmailCampaigns.id, id),
        eq(marketingEmailCampaigns.companyId, companyId)
      ));

    if (!campaign) {
      return res.status(404).json({ message: "Campagna non trovata" });
    }

    const logs = await db.select()
      .from(marketingEmailLogs)
      .where(eq(marketingEmailLogs.campaignId, id));

    const stats = {
      totalSent: logs.filter(l => l.status === 'sent').length,
      totalFailed: logs.filter(l => l.status === 'failed').length,
      totalOpened: logs.filter(l => l.openedAt).length,
      totalClicked: logs.filter(l => l.clickedAt).length,
      openRate: 0,
      clickRate: 0,
    };

    if (stats.totalSent > 0) {
      stats.openRate = Math.round((stats.totalOpened / stats.totalSent) * 100);
      stats.clickRate = Math.round((stats.totalClicked / stats.totalSent) * 100);
    }

    res.json(stats);
  } catch (error) {
    console.error("[MARKETING] Error fetching campaign stats:", error);
    res.status(500).json({ message: "Errore nel caricamento delle statistiche" });
  }
});

// GET /api/marketing/analytics - Overview marketing
router.get("/api/marketing/analytics", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const campaigns = await db.select()
      .from(marketingEmailCampaigns)
      .where(and(
        eq(marketingEmailCampaigns.companyId, companyId),
        gte(marketingEmailCampaigns.createdAt, thirtyDaysAgo)
      ));

    const campaignIds = campaigns.map(c => c.id);
    
    let logs: any[] = [];
    if (campaignIds.length > 0) {
      logs = await db.select()
        .from(marketingEmailLogs)
        .where(sql`${marketingEmailLogs.campaignId} = ANY(${campaignIds})`);
    }

    const totalTemplates = await db.select({ count: count() })
      .from(marketingEmailTemplates)
      .where(eq(marketingEmailTemplates.companyId, companyId));

    const analytics = {
      totalCampaigns: campaigns.length,
      totalTemplates: totalTemplates[0]?.count || 0,
      totalEmailsSent: logs.filter(l => l.status === 'sent').length,
      totalOpens: logs.filter(l => l.openedAt).length,
      totalClicks: logs.filter(l => l.clickedAt).length,
      averageOpenRate: 0,
      averageClickRate: 0,
      campaignsByStatus: {
        draft: campaigns.filter(c => c.status === 'draft').length,
        scheduled: campaigns.filter(c => c.status === 'scheduled').length,
        sent: campaigns.filter(c => c.status === 'sent').length,
      },
    };

    const sentEmails = logs.filter(l => l.status === 'sent').length;
    if (sentEmails > 0) {
      analytics.averageOpenRate = Math.round((analytics.totalOpens / sentEmails) * 100);
      analytics.averageClickRate = Math.round((analytics.totalClicks / sentEmails) * 100);
    }

    res.json(analytics);
  } catch (error) {
    console.error("[MARKETING] Error fetching analytics:", error);
    res.status(500).json({ message: "Errore nel caricamento delle analytics" });
  }
});

// GET /api/marketing/events - Lista eventi per selezione campagna
router.get("/api/marketing/events", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "Company non trovata" });
    }

    const eventsList = await db.select({
      id: events.id,
      name: events.name,
      date: events.date,
    })
      .from(events)
      .where(eq(events.companyId, companyId))
      .orderBy(desc(events.date));

    res.json(eventsList);
  } catch (error) {
    console.error("[MARKETING] Error fetching events:", error);
    res.status(500).json({ message: "Errore nel caricamento degli eventi" });
  }
});

export default router;
