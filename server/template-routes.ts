import { Router, Request, Response } from 'express';
import { db } from './db';
import { eq, and, desc } from 'drizzle-orm';
import {
  ticketTemplates,
  ticketTemplateElements,
  insertTicketTemplateSchema,
  insertTicketTemplateElementSchema,
  updateTicketTemplateSchema,
  updateTicketTemplateElementSchema,
} from '@shared/schema';
import { z } from 'zod';

const router = Router();

function getUser(req: Request) {
  return (req as any).user;
}

function requireAdmin(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (!['super_admin', 'gestore'].includes(user.role)) {
    return res.status(403).json({ error: 'Accesso negato - solo admin' });
  }
  next();
}

// ==================== TICKET TEMPLATES ====================

// GET all templates for company
router.get('/templates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    
    let query = db.select().from(ticketTemplates);
    if (companyId && user.role !== 'super_admin') {
      query = query.where(eq(ticketTemplates.companyId, companyId)) as any;
    }
    
    const templates = await query.orderBy(desc(ticketTemplates.createdAt));
    res.json(templates);
  } catch (error) {
    console.error('Error fetching ticket templates:', error);
    res.status(500).json({ error: 'Errore nel recupero template' });
  }
});

// GET single template with elements
router.get('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, id))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    // Check company access
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const elements = await db.select().from(ticketTemplateElements)
      .where(eq(ticketTemplateElements.templateId, id))
      .orderBy(ticketTemplateElements.zIndex);
    
    res.json({ ...template, elements });
  } catch (error) {
    console.error('Error fetching ticket template:', error);
    res.status(500).json({ error: 'Errore nel recupero template' });
  }
});

// POST create template
router.post('/templates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const validated = insertTicketTemplateSchema.parse(req.body);
    
    // Use user's company if not super_admin
    const companyId = user.role === 'super_admin' 
      ? (validated.companyId || user.companyId)
      : user.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'companyId richiesto' });
    }
    
    const [template] = await db.insert(ticketTemplates).values({
      ...validated,
      companyId,
    }).returning();
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating ticket template:', error);
    res.status(500).json({ error: 'Errore nella creazione template' });
  }
});

// PATCH update template
router.patch('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    
    // Check ownership
    const [existing] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && existing.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Validate update data - explicitly exclude sensitive fields like companyId
    const updateSchema = z.object({
      name: z.string().optional(),
      backgroundImageUrl: z.string().nullable().optional(),
      paperWidthMm: z.number().optional(),
      paperHeightMm: z.number().optional(),
      dpi: z.number().optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    });
    const validated = updateSchema.parse(req.body);
    
    // Only set validated fields, never allow companyId or other sensitive fields
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      version: (existing.version || 1) + 1,
    };
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.backgroundImageUrl !== undefined) updateData.backgroundImageUrl = validated.backgroundImageUrl;
    if (validated.paperWidthMm !== undefined) updateData.paperWidthMm = validated.paperWidthMm;
    if (validated.paperHeightMm !== undefined) updateData.paperHeightMm = validated.paperHeightMm;
    if (validated.dpi !== undefined) updateData.dpi = validated.dpi;
    if (validated.isDefault !== undefined) updateData.isDefault = validated.isDefault;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    
    const [template] = await db.update(ticketTemplates)
      .set(updateData)
      .where(eq(ticketTemplates.id, id))
      .returning();
    
    res.json(template);
  } catch (error) {
    console.error('Error updating ticket template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi', details: error.errors });
    }
    res.status(500).json({ error: 'Errore nell\'aggiornamento template' });
  }
});

// DELETE template
router.delete('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    
    // Check ownership
    const [existing] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && existing.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Elements are deleted via CASCADE
    await db.delete(ticketTemplates).where(eq(ticketTemplates.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket template:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione template' });
  }
});

// ==================== TEMPLATE ELEMENTS ====================

// POST add element to template
router.post('/templates/:templateId/elements', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const user = getUser(req);
    
    // Verify template ownership
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const validated = insertTicketTemplateElementSchema.parse({
      ...req.body,
      templateId,
    });
    
    const [element] = await db.insert(ticketTemplateElements).values(validated).returning();
    
    // Update template version
    await db.update(ticketTemplates)
      .set({ updatedAt: new Date(), version: (template.version || 1) + 1 })
      .where(eq(ticketTemplates.id, templateId));
    
    res.status(201).json(element);
  } catch (error) {
    console.error('Error creating template element:', error);
    res.status(500).json({ error: 'Errore nella creazione elemento' });
  }
});

// PATCH update element - with Zod validation and explicit element ownership check
router.patch('/templates/:templateId/elements/:elementId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId, elementId } = req.params;
    const user = getUser(req);
    
    // First verify that the element exists AND belongs to the specified template
    const [existingElement] = await db.select().from(ticketTemplateElements)
      .where(and(
        eq(ticketTemplateElements.id, elementId),
        eq(ticketTemplateElements.templateId, templateId)
      ))
      .limit(1);
    
    if (!existingElement) {
      return res.status(404).json({ error: 'Elemento non trovato nel template specificato' });
    }
    
    // Now verify template ownership
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Validate only allowed fields - block id, templateId, createdAt
    const elementUpdateSchema = z.object({
      type: z.string().optional(),
      fieldKey: z.string().nullable().optional(),
      staticValue: z.string().nullable().optional(),
      x: z.number().min(0).max(500).optional(),
      y: z.number().min(0).max(500).optional(),
      width: z.number().min(1).max(500).optional(),
      height: z.number().min(1).max(500).optional(),
      rotation: z.number().min(-360).max(360).optional(),
      fontFamily: z.string().max(100).optional(),
      fontSize: z.number().min(4).max(200).optional(),
      fontWeight: z.string().optional(),
      textAlign: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      barcodeFormat: z.string().nullable().optional(),
      qrErrorCorrection: z.enum(['L', 'M', 'Q', 'H']).optional(),
      zIndex: z.number().min(0).max(1000).optional(),
      visibilityConditions: z.any().optional(),
    });
    
    const validated = elementUpdateSchema.parse(req.body);
    
    const [element] = await db.update(ticketTemplateElements)
      .set(validated)
      .where(and(
        eq(ticketTemplateElements.id, elementId),
        eq(ticketTemplateElements.templateId, templateId)
      ))
      .returning();
    
    // Update template version
    await db.update(ticketTemplates)
      .set({ updatedAt: new Date(), version: (template.version || 1) + 1 })
      .where(eq(ticketTemplates.id, templateId));
    
    res.json(element);
  } catch (error) {
    console.error('Error updating template element:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi', details: error.errors });
    }
    res.status(500).json({ error: 'Errore nell\'aggiornamento elemento' });
  }
});

// DELETE element - with explicit element ownership check
router.delete('/templates/:templateId/elements/:elementId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId, elementId } = req.params;
    const user = getUser(req);
    
    // First verify that the element exists AND belongs to the specified template
    const [existingElement] = await db.select().from(ticketTemplateElements)
      .where(and(
        eq(ticketTemplateElements.id, elementId),
        eq(ticketTemplateElements.templateId, templateId)
      ))
      .limit(1);
    
    if (!existingElement) {
      return res.status(404).json({ error: 'Elemento non trovato nel template specificato' });
    }
    
    // Verify template ownership
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    await db.delete(ticketTemplateElements)
      .where(and(
        eq(ticketTemplateElements.id, elementId),
        eq(ticketTemplateElements.templateId, templateId)
      ));
    
    // Update template version
    await db.update(ticketTemplates)
      .set({ updatedAt: new Date(), version: (template.version || 1) + 1 })
      .where(eq(ticketTemplates.id, templateId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template element:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione elemento' });
  }
});

// Validation schema for bulk elements
const bulkElementSchema = z.object({
  type: z.string(),
  fieldKey: z.string().nullable().optional(),
  staticValue: z.string().nullable().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional().default(0),
  fontFamily: z.string().optional().default('Arial'),
  fontSize: z.number().optional().default(12),
  fontWeight: z.string().optional().default('normal'),
  textAlign: z.string().optional().default('left'),
  color: z.string().optional().default('#000000'),
  barcodeFormat: z.string().nullable().optional(),
  zIndex: z.number().optional().default(0),
});

// POST bulk update elements (for save all at once from editor)
router.post('/templates/:templateId/elements/bulk', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { elements } = req.body;
    const user = getUser(req);
    
    // Verify template ownership
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Validate all elements
    const elementsArray = z.array(bulkElementSchema).parse(elements || []);
    
    // Delete existing elements and replace with new ones
    await db.delete(ticketTemplateElements)
      .where(eq(ticketTemplateElements.templateId, templateId));
    
    let insertedElements: any[] = [];
    if (elementsArray.length > 0) {
      const elementsWithTemplateId = elementsArray.map((el) => ({
        ...el,
        templateId,
      }));
      
      insertedElements = await db.insert(ticketTemplateElements)
        .values(elementsWithTemplateId)
        .returning();
    }
    
    // Update template version
    await db.update(ticketTemplates)
      .set({ updatedAt: new Date(), version: (template.version || 1) + 1 })
      .where(eq(ticketTemplates.id, templateId));
    
    res.json({ success: true, elements: insertedElements });
  } catch (error) {
    console.error('Error bulk updating template elements:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati elementi non validi', details: error.errors });
    }
    res.status(500).json({ error: 'Errore nel salvataggio elementi' });
  }
});

export default router;
