import { Router, Request, Response } from "express";
import { db } from "./db";
import { landingPages, landingLeads, users } from "@shared/schema";
import { eq, desc, and, sql, count, like, or } from "drizzle-orm";

const router = Router();

// ========== PUBLIC ROUTES ==========

// Get landing page by slug (for public rendering)
router.get("/api/landing/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const [page] = await db.select()
      .from(landingPages)
      .where(and(
        eq(landingPages.slug, slug),
        eq(landingPages.isActive, true)
      ))
      .limit(1);
    
    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    
    // Parse JSON fields
    const result = {
      ...page,
      painPoints: page.painPoints ? JSON.parse(page.painPoints) : null,
      valueProps: page.valueProps ? JSON.parse(page.valueProps) : null,
      faqs: page.faqs ? JSON.parse(page.faqs) : null,
    };
    
    res.json(result);
  } catch (error: any) {
    console.error("[Landing] Error getting page:", error);
    res.status(500).json({ error: error.message });
  }
});

// Submit lead (public endpoint)
router.post("/api/landing/:slug/leads", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const {
      role,
      fullName,
      instagram,
      phoneOrEmail,
      venueName,
      venueRole,
      avgTables,
      avgGuests,
      city,
      note
    } = req.body;
    
    // Validate required fields
    if (!role || !fullName || !instagram || !phoneOrEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    if (!["venue", "promoter"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    
    // Find landing page
    const [page] = await db.select()
      .from(landingPages)
      .where(and(
        eq(landingPages.slug, slug),
        eq(landingPages.isActive, true)
      ))
      .limit(1);
    
    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    
    // Insert lead
    const [lead] = await db.insert(landingLeads)
      .values({
        landingPageId: page.id,
        role: role.trim(),
        fullName: fullName.trim(),
        instagram: instagram.trim().replace(/^@/, ''), // Remove @ if present
        phoneOrEmail: phoneOrEmail.trim(),
        venueName: venueName?.trim() || null,
        venueRole: venueRole?.trim() || null,
        avgTables: avgTables?.trim() || null,
        avgGuests: avgGuests?.trim() || null,
        city: city?.trim() || page.targetCity || "Miami",
        note: note?.trim() || null,
        status: "new",
      })
      .returning();
    
    res.json({ ok: true, id: lead.id });
  } catch (error: any) {
    console.error("[Landing] Error submitting lead:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all landing pages (admin)
router.get("/api/admin/landing-pages", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const pages = await db.select({
      id: landingPages.id,
      slug: landingPages.slug,
      title: landingPages.title,
      subtitle: landingPages.subtitle,
      isActive: landingPages.isActive,
      venueSpots: landingPages.venueSpots,
      promoterSpots: landingPages.promoterSpots,
      targetCity: landingPages.targetCity,
      accentColor: landingPages.accentColor,
      createdAt: landingPages.createdAt,
    })
      .from(landingPages)
      .orderBy(desc(landingPages.createdAt));
    
    // Get lead counts for each page
    const leadCounts = await db.select({
      landingPageId: landingLeads.landingPageId,
      total: count(),
    })
      .from(landingLeads)
      .groupBy(landingLeads.landingPageId);
    
    const countMap = new Map(leadCounts.map(c => [c.landingPageId, Number(c.total)]));
    
    const result = pages.map(p => ({
      ...p,
      leadCount: countMap.get(p.id) || 0,
    }));
    
    res.json(result);
  } catch (error: any) {
    console.error("[Landing Admin] Error getting pages:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single landing page (admin)
router.get("/api/admin/landing-pages/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { id } = req.params;
    
    const [page] = await db.select()
      .from(landingPages)
      .where(eq(landingPages.id, id))
      .limit(1);
    
    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    
    // Parse JSON fields
    const result = {
      ...page,
      painPoints: page.painPoints ? JSON.parse(page.painPoints) : [],
      valueProps: page.valueProps ? JSON.parse(page.valueProps) : [],
      faqs: page.faqs ? JSON.parse(page.faqs) : [],
    };
    
    res.json(result);
  } catch (error: any) {
    console.error("[Landing Admin] Error getting page:", error);
    res.status(500).json({ error: error.message });
  }
});

// Seed Miami template (can be called to initialize default landing page)
router.post("/api/admin/landing-pages/seed-miami", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    // Check if already exists
    const existing = await db.select({ id: landingPages.id })
      .from(landingPages)
      .where(eq(landingPages.slug, 'usa'))
      .limit(1);
    
    if (existing.length > 0) {
      return res.json({ message: "Miami template already exists", id: existing[0].id });
    }
    
    const miamiTemplate = {
      slug: 'usa',
      title: 'The door runs on chaos. We run it on numbers.',
      subtitle: 'Tables, tickets, promoters — tracked in real time. If you don\'t control the numbers, you don\'t control the deal.',
      heroText: 'If you can\'t prove your numbers, you can\'t negotiate your money.',
      accentColor: '#77f2b4',
      painPoints: JSON.stringify([
        { icon: '❌', text: 'Guestlists aren\'t tracked → you can\'t prove performance' },
        { icon: '❌', text: 'Tables cancel last minute → no deposits, no penalties' },
        { icon: '❌', text: 'Promoters get paid "by feel" → no leverage, no accountability' }
      ]),
      valueProps: JSON.stringify([
        { title: 'Venue Control', description: 'Deposits, table inventory, live revenue, promoter performance' },
        { title: 'Promoter Proof', description: 'Scanned guests verification, real stats, commission leverage' },
        { title: 'Real-Time Ops', description: 'Fast check-in, dashboards, reports in minutes' }
      ]),
      faqs: JSON.stringify([
        { question: 'Is it live?', answer: 'We\'re in pilot mode. We\'re selecting a small group of venues and promoters in Miami to test and refine the system before launch.' },
        { question: 'Pricing?', answer: 'Pilot partners get preferred pricing locked in before public launch. Apply now to secure your spot.' },
        { question: 'Is it a marketplace?', answer: 'No. This is an operating system for your nightlife business — not a marketplace. You control your data, your promoters, your revenue.' }
      ]),
      venueSpots: 2,
      promoterSpots: 10,
      targetCity: 'Miami',
      isActive: true,
    };
    
    const [page] = await db.insert(landingPages)
      .values(miamiTemplate)
      .returning();
    
    console.log("[Landing] Miami template seeded successfully");
    res.json({ message: "Miami template created", page });
  } catch (error: any) {
    console.error("[Landing Admin] Error seeding Miami template:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create landing page (admin)
router.post("/api/admin/landing-pages", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const {
      slug,
      title,
      subtitle,
      heroText,
      accentColor,
      painPoints,
      valueProps,
      faqs,
      venueSpots,
      promoterSpots,
      targetCity,
    } = req.body;
    
    if (!slug || !title) {
      return res.status(400).json({ error: "Slug and title are required" });
    }
    
    // Check slug uniqueness
    const existing = await db.select({ id: landingPages.id })
      .from(landingPages)
      .where(eq(landingPages.slug, slug.toLowerCase().trim()))
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: "Slug already exists" });
    }
    
    const [page] = await db.insert(landingPages)
      .values({
        slug: slug.toLowerCase().trim(),
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        heroText: heroText?.trim() || null,
        accentColor: accentColor || "#77f2b4",
        painPoints: painPoints ? JSON.stringify(painPoints) : null,
        valueProps: valueProps ? JSON.stringify(valueProps) : null,
        faqs: faqs ? JSON.stringify(faqs) : null,
        venueSpots: venueSpots || 2,
        promoterSpots: promoterSpots || 10,
        targetCity: targetCity || "Miami",
        isActive: true,
      })
      .returning();
    
    res.json(page);
  } catch (error: any) {
    console.error("[Landing Admin] Error creating page:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update landing page (admin)
router.patch("/api/admin/landing-pages/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { id } = req.params;
    const updates: any = {};
    
    const allowedFields = [
      'slug', 'title', 'subtitle', 'heroText', 'accentColor',
      'painPoints', 'valueProps', 'faqs', 'venueSpots', 
      'promoterSpots', 'targetCity', 'isActive'
    ];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (['painPoints', 'valueProps', 'faqs'].includes(field)) {
          updates[field] = req.body[field] ? JSON.stringify(req.body[field]) : null;
        } else {
          updates[field] = req.body[field];
        }
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }
    
    updates.updatedAt = new Date();
    
    // If updating slug, check uniqueness
    if (updates.slug) {
      const existing = await db.select({ id: landingPages.id })
        .from(landingPages)
        .where(and(
          eq(landingPages.slug, updates.slug.toLowerCase().trim()),
          sql`${landingPages.id} != ${id}`
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(400).json({ error: "Slug already exists" });
      }
      updates.slug = updates.slug.toLowerCase().trim();
    }
    
    const [page] = await db.update(landingPages)
      .set(updates)
      .where(eq(landingPages.id, id))
      .returning();
    
    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    
    res.json(page);
  } catch (error: any) {
    console.error("[Landing Admin] Error updating page:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete landing page (admin)
router.delete("/api/admin/landing-pages/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { id } = req.params;
    
    // Delete associated leads first
    await db.delete(landingLeads)
      .where(eq(landingLeads.landingPageId, id));
    
    // Delete page
    const [deleted] = await db.delete(landingPages)
      .where(eq(landingPages.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    
    res.json({ ok: true });
  } catch (error: any) {
    console.error("[Landing Admin] Error deleting page:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== LEADS MANAGEMENT ==========

// Get leads for a landing page (admin)
router.get("/api/admin/landing-pages/:id/leads", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { id } = req.params;
    const { status, role, search, limit = "50", offset = "0" } = req.query;
    
    let conditions = [eq(landingLeads.landingPageId, id)];
    
    if (status && status !== 'all') {
      conditions.push(eq(landingLeads.status, status as string));
    }
    
    if (role && role !== 'all') {
      conditions.push(eq(landingLeads.role, role as string));
    }
    
    const leads = await db.select({
      lead: landingLeads,
      assignedUser: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      }
    })
      .from(landingLeads)
      .leftJoin(users, eq(landingLeads.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(desc(landingLeads.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    // Get total count
    const [countResult] = await db.select({ count: count() })
      .from(landingLeads)
      .where(and(...conditions));
    
    res.json({
      leads: leads.map(l => ({
        ...l.lead,
        assignedUser: l.assignedUser,
      })),
      total: Number(countResult.count),
    });
  } catch (error: any) {
    console.error("[Landing Admin] Error getting leads:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all leads across all landing pages (admin)
router.get("/api/admin/landing-leads", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { status, role, pageId, limit = "50", offset = "0" } = req.query;
    
    let conditions: any[] = [];
    
    if (status && status !== 'all') {
      conditions.push(eq(landingLeads.status, status as string));
    }
    
    if (role && role !== 'all') {
      conditions.push(eq(landingLeads.role, role as string));
    }
    
    if (pageId) {
      conditions.push(eq(landingLeads.landingPageId, pageId as string));
    }
    
    const leads = await db.select({
      lead: landingLeads,
      page: {
        id: landingPages.id,
        slug: landingPages.slug,
        title: landingPages.title,
      },
      assignedUser: {
        id: users.id,
        email: users.email,
      }
    })
      .from(landingLeads)
      .leftJoin(landingPages, eq(landingLeads.landingPageId, landingPages.id))
      .leftJoin(users, eq(landingLeads.assignedTo, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(landingLeads.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    // Get total count
    const [countResult] = await db.select({ count: count() })
      .from(landingLeads)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    res.json({
      leads: leads.map(l => ({
        ...l.lead,
        landingPage: l.page,
        assignedUser: l.assignedUser,
      })),
      total: Number(countResult.count),
    });
  } catch (error: any) {
    console.error("[Landing Admin] Error getting all leads:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update lead status (admin)
router.patch("/api/admin/landing-leads/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    
    const updates: any = { updatedAt: new Date() };
    
    if (status) {
      if (!['new', 'contacted', 'qualified', 'converted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updates.status = status;
      if (status === 'contacted') {
        updates.lastContactedAt = new Date();
      }
    }
    
    if (assignedTo !== undefined) {
      updates.assignedTo = assignedTo || null;
    }
    
    const [lead] = await db.update(landingLeads)
      .set(updates)
      .where(eq(landingLeads.id, id))
      .returning();
    
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    
    res.json(lead);
  } catch (error: any) {
    console.error("[Landing Admin] Error updating lead:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete lead (admin)
router.delete("/api/admin/landing-leads/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { id } = req.params;
    
    const [deleted] = await db.delete(landingLeads)
      .where(eq(landingLeads.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: "Lead not found" });
    }
    
    res.json({ ok: true });
  } catch (error: any) {
    console.error("[Landing Admin] Error deleting lead:", error);
    res.status(500).json({ error: error.message });
  }
});

// Export leads as CSV (admin)
router.get("/api/admin/landing-pages/:id/leads/export", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const { id } = req.params;
    
    const leads = await db.select()
      .from(landingLeads)
      .where(eq(landingLeads.landingPageId, id))
      .orderBy(desc(landingLeads.createdAt));
    
    // Generate CSV
    const headers = [
      'ID', 'Role', 'Full Name', 'Instagram', 'Phone/Email',
      'Venue Name', 'Venue Role', 'Avg Tables', 'Avg Guests',
      'City', 'Note', 'Status', 'Created At'
    ];
    
    const rows = leads.map(l => [
      l.id,
      l.role,
      l.fullName,
      l.instagram,
      l.phoneOrEmail,
      l.venueName || '',
      l.venueRole || '',
      l.avgTables || '',
      l.avgGuests || '',
      l.city || '',
      l.note?.replace(/"/g, '""') || '',
      l.status,
      l.createdAt?.toISOString() || '',
    ].map(v => `"${v}"`).join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${id}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error("[Landing Admin] Error exporting leads:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get lead stats (admin)
router.get("/api/admin/landing-stats", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    // Total leads by status
    const byStatus = await db.select({
      status: landingLeads.status,
      count: count(),
    })
      .from(landingLeads)
      .groupBy(landingLeads.status);
    
    // Total leads by role
    const byRole = await db.select({
      role: landingLeads.role,
      count: count(),
    })
      .from(landingLeads)
      .groupBy(landingLeads.role);
    
    // Total leads by page
    const byPage = await db.select({
      pageId: landingLeads.landingPageId,
      slug: landingPages.slug,
      title: landingPages.title,
      count: count(),
    })
      .from(landingLeads)
      .leftJoin(landingPages, eq(landingLeads.landingPageId, landingPages.id))
      .groupBy(landingLeads.landingPageId, landingPages.slug, landingPages.title);
    
    // Recent leads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [recentCount] = await db.select({ count: count() })
      .from(landingLeads)
      .where(sql`${landingLeads.createdAt} >= ${sevenDaysAgo}`);
    
    res.json({
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, Number(s.count)])),
      byRole: Object.fromEntries(byRole.map(r => [r.role, Number(r.count)])),
      byPage: byPage.map(p => ({
        pageId: p.pageId,
        slug: p.slug,
        title: p.title,
        count: Number(p.count),
      })),
      recentLeads: Number(recentCount.count),
    });
  } catch (error: any) {
    console.error("[Landing Admin] Error getting stats:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
