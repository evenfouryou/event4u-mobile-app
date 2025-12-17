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
import { getConnectedAgents, sendPrintJobToAgent } from './print-relay';

const router = Router();

function getUser(req: Request) {
  return (req as any).user;
}

function requireAuth(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (!['super_admin', 'gestore'].includes(user.role)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Accesso negato - solo super admin' });
  }
  next();
}

// ==================== TICKET TEMPLATES ====================

// GET all templates for company (gestore and super_admin can view)
router.get('/templates', requireAuth, async (req: Request, res: Response) => {
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

// GET single template with elements (gestore and super_admin can view)
router.get('/templates/:id', requireAuth, async (req: Request, res: Response) => {
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

// POST create template (super_admin only)
router.post('/templates', requireSuperAdmin, async (req: Request, res: Response) => {
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

// PATCH update template (super_admin only)
router.patch('/templates/:id', requireSuperAdmin, async (req: Request, res: Response) => {
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
      printOrientation: z.enum(['auto', 'portrait', 'landscape']).optional(),
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
    if (validated.printOrientation !== undefined) updateData.printOrientation = validated.printOrientation;
    
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

// DELETE template (super_admin only)
router.delete('/templates/:id', requireSuperAdmin, async (req: Request, res: Response) => {
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

// POST add element to template (super_admin only)
router.post('/templates/:templateId/elements', requireSuperAdmin, async (req: Request, res: Response) => {
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

// PATCH update element - with Zod validation and explicit element ownership check (super_admin only)
router.patch('/templates/:templateId/elements/:elementId', requireSuperAdmin, async (req: Request, res: Response) => {
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
    
    // Convert numeric values to strings for decimal columns
    const updateData: Record<string, any> = { ...validated };
    if (updateData.x !== undefined) updateData.x = String(updateData.x);
    if (updateData.y !== undefined) updateData.y = String(updateData.y);
    if (updateData.width !== undefined) updateData.width = String(updateData.width);
    if (updateData.height !== undefined) updateData.height = String(updateData.height);
    
    const [element] = await db.update(ticketTemplateElements)
      .set(updateData)
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

// DELETE element - with explicit element ownership check (super_admin only)
router.delete('/templates/:templateId/elements/:elementId', requireSuperAdmin, async (req: Request, res: Response) => {
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

// POST bulk update elements (for save all at once from editor) (super_admin only)
router.post('/templates/:templateId/elements/bulk', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { elements } = req.body;
    const user = getUser(req);
    
    console.log('[BulkSave] Template ID:', templateId);
    console.log('[BulkSave] Elements received:', JSON.stringify(elements, null, 2));
    console.log('[BulkSave] Elements count:', elements?.length || 0);
    
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
    let elementsArray;
    try {
      elementsArray = z.array(bulkElementSchema).parse(elements || []);
      console.log('[BulkSave] Validated elements:', elementsArray.length);
    } catch (validationError: any) {
      console.error('[BulkSave] Validation failed:', validationError.errors);
      throw validationError;
    }
    
    // Delete existing elements and replace with new ones
    await db.delete(ticketTemplateElements)
      .where(eq(ticketTemplateElements.templateId, templateId));
    
    let insertedElements: any[] = [];
    if (elementsArray.length > 0) {
      // Convert numeric values to strings for decimal columns
      const elementsWithTemplateId = elementsArray.map((el) => ({
        ...el,
        templateId,
        x: String(el.x),
        y: String(el.y),
        width: String(el.width),
        height: String(el.height),
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

// ==================== TEST PRINT ====================

// Generate HTML for printing a ticket from template
// skipBackground: true when printing on pre-printed paper (carta pre-stampata)
// Helper: check if a color is too light for printing on white paper
function isLightColor(hex: string | null): boolean {
  if (!hex) return false;
  const color = hex.replace('#', '');
  if (color.length !== 6) return false;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Calculate perceived brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180; // Colors with brightness > 180 are too light
}

export function generateTicketHtml(
  template: { paperWidthMm: number; paperHeightMm: number; backgroundImageUrl: string | null; dpi?: number; printOrientation?: string },
  elements: Array<{ type: string; x: number; y: number; width: number; height: number; content: string | null; fontSize: number | null; fontFamily: string | null; fontWeight: string | null; fontColor: string | null; textAlign: string | null; rotation: number | null }>,
  data: Record<string, string>,
  skipBackground: boolean = false
): string {
  // IMPORTANT: Always use 96 DPI for HTML rendering (browser standard)
  // The printer will receive the page in mm and handle scaling itself
  // Using higher DPI here would cause misaligned elements
  const browserDpi = 96;
  const mmToPx = browserDpi / 25.4; // 96 DPI = ~3.78 pixels per mm
  
  // Determine print orientation
  const templateOrientation = template.printOrientation;
  const naturalOrientation = template.paperWidthMm > template.paperHeightMm ? 'landscape' : 'portrait';
  const printOrientation = templateOrientation === 'auto' || !templateOrientation
    ? naturalOrientation
    : templateOrientation;
  const isLandscape = printOrientation === 'landscape';
  
  // For landscape on thermal printers, we need to swap dimensions
  // The print agent will also swap dimensions, so HTML must match
  let pageWidthMm: number, pageHeightMm: number;
  if (isLandscape && template.paperWidthMm < template.paperHeightMm) {
    // Swap dimensions for landscape when paper is naturally portrait
    pageWidthMm = template.paperHeightMm;
    pageHeightMm = template.paperWidthMm;
  } else {
    pageWidthMm = template.paperWidthMm;
    pageHeightMm = template.paperHeightMm;
  }
  
  const widthPx = Math.round(pageWidthMm * mmToPx);
  const heightPx = Math.round(pageHeightMm * mmToPx);
  
  // Replace placeholders in content with actual data
  const replacePlaceholders = (text: string | null): string => {
    if (!text) return '';
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || `{{${key}}}`);
  };
  
  // When skipBackground is true (pre-printed paper), force dark colors
  // because light colors (white text) would be invisible on white paper
  const getVisibleColor = (color: string | null, defaultColor: string = '#000000'): string => {
    if (skipBackground && isLightColor(color)) {
      console.log(`[Print] Forcing dark color: ${color} -> #000000 (skipBackground=true)`);
      return '#000000'; // Force black for visibility
    }
    return color || defaultColor;
  };
  
  // Generate element HTML
  const elementsHtml = elements.map(el => {
    const x = Math.round(el.x * mmToPx);
    const y = Math.round(el.y * mmToPx);
    const w = Math.round(el.width * mmToPx);
    const h = Math.round(el.height * mmToPx);
    const rotation = el.rotation || 0;
    
    const baseStyle = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${w}px;
      height: ${h}px;
      ${rotation ? `transform: rotate(${rotation}deg);` : ''}
    `;
    
    if (el.type === 'text' || el.type === 'dynamic') {
      const content = replacePlaceholders(el.content);
      const textColor = getVisibleColor(el.fontColor, '#000000');
      return `<div style="${baseStyle}
        font-size: ${el.fontSize || 12}px;
        font-family: ${el.fontFamily || 'Arial'}, sans-serif;
        font-weight: ${el.fontWeight || 'normal'};
        color: ${textColor};
        text-align: ${el.textAlign || 'left'};
        overflow: hidden;
        white-space: pre-wrap;
        word-break: break-word;
      ">${content}</div>`;
    } else if (el.type === 'image' && el.content) {
      return `<img src="${el.content}" style="${baseStyle} object-fit: contain;" />`;
    } else if (el.type === 'qrcode') {
      const qrContent = replacePlaceholders(el.content);
      return `<div style="${baseStyle} display: flex; align-items: center; justify-content: center;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=${Math.min(w, h)}x${Math.min(w, h)}&data=${encodeURIComponent(qrContent)}" style="max-width: 100%; max-height: 100%;" />
      </div>`;
    } else if (el.type === 'rectangle') {
      const rectColor = getVisibleColor(el.fontColor, '#000000');
      return `<div style="${baseStyle}
        background-color: ${rectColor};
        border: 1px solid ${rectColor};
      "></div>`;
    } else if (el.type === 'line') {
      const lineColor = getVisibleColor(el.fontColor, '#000000');
      return `<div style="${baseStyle}
        border-top: 1px solid ${lineColor};
        height: 0;
      "></div>`;
    } else if (el.type === 'cutline') {
      const lineColor = getVisibleColor(el.fontColor, '#000000');
      return `<div style="${baseStyle}
        border-top: 1px dashed ${lineColor};
        height: 0;
      "></div>`;
    }
    return '';
  }).join('\n');
  
  // Note: printOrientation is already calculated at the top of the function
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: ${pageWidthMm}mm ${pageHeightMm}mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      width: ${widthPx}px; 
      height: ${heightPx}px; 
      position: relative;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  </style>
</head>
<body>
  ${(template.backgroundImageUrl && !skipBackground) ? `<img class="background" src="${template.backgroundImageUrl}" />` : ''}
  ${elementsHtml}
</body>
</html>`;
}

// Sample data for test prints
const TEST_PRINT_DATA: Record<string, string> = {
  event_name: 'Concerto Rock Festival',
  event_date: '25/12/2024',
  event_time: '21:00',
  venue_name: 'Stadio San Siro',
  price: '€ 45,00',
  ticket_number: 'TKT-TEST-001234',
  sector: 'Tribuna A',
  row: '12',
  seat: '45',
  buyer_name: 'Mario Rossi',
  organizer_company: 'Eventi SpA',
  ticketing_manager: 'Biglietteria Centrale Srl',
  emission_datetime: new Date().toLocaleString('it-IT'),
  fiscal_seal: 'TEST-SIAE-PROVA',
  qr_code: 'https://event4u.test/verify/TEST001',
};

// GET connected agents for test print (super_admin only)
router.get('/templates/:templateId/agents', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const user = getUser(req);
    
    // Get template to determine company
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    // Verify access (super_admin can access all, gestore only their company)
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Use template's company to get connected agents
    const agents = getConnectedAgents(template.companyId);
    res.json(agents);
  } catch (error) {
    console.error('Error fetching connected agents:', error);
    res.status(500).json({ error: 'Errore nel recupero agenti' });
  }
});

// POST send test print (super_admin only)
router.post('/templates/:templateId/test-print', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { agentId, skipBackground = true } = req.body; // Default: skip background for pre-printed paper
    const user = getUser(req);
    
    if (!agentId) {
      return res.status(400).json({ error: 'ID agente richiesto' });
    }
    
    // Verify template exists and belongs to user's company
    const [template] = await db.select().from(ticketTemplates)
      .where(eq(ticketTemplates.id, templateId))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    if (user.role !== 'super_admin' && template.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Get template elements
    const elements = await db.select().from(ticketTemplateElements)
      .where(eq(ticketTemplateElements.templateId, templateId))
      .orderBy(ticketTemplateElements.zIndex);
    
    // Parse elements for HTML generation
    const parsedElements = elements.map(el => {
      // For dynamic fields, use {{fieldKey}} as content so it gets replaced
      // For static fields, use staticValue directly
      let content = el.staticValue;
      if (el.fieldKey && !el.staticValue) {
        content = `{{${el.fieldKey}}}`;
      } else if (el.fieldKey && el.staticValue) {
        // If both are set, staticValue might contain the template with placeholders
        content = el.staticValue;
      }
      
      return {
        type: el.type,
        x: parseFloat(el.x as any),
        y: parseFloat(el.y as any),
        width: parseFloat(el.width as any),
        height: parseFloat(el.height as any),
        content,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        fontWeight: el.fontWeight,
        fontColor: el.color,
        textAlign: el.textAlign,
        rotation: el.rotation,
      };
    });
    
    console.log('[TestPrint] Template:', template.name, 'Elements count:', parsedElements.length);
    console.log('[TestPrint] Parsed elements:', JSON.stringify(parsedElements, null, 2));
    
    // Generate HTML for the ticket
    // skipBackground: true = don't print background (for pre-printed paper)
    const ticketHtml = generateTicketHtml(
      {
        paperWidthMm: template.paperWidthMm,
        paperHeightMm: template.paperHeightMm,
        backgroundImageUrl: template.backgroundImageUrl,
        dpi: template.dpi || 203, // Use template DPI, default 203 for thermal
        printOrientation: (template as any).printOrientation || 'auto',
      },
      parsedElements,
      TEST_PRINT_DATA,
      skipBackground // Default true for pre-printed paper
    );
    
    console.log('[TestPrint] Generated HTML length:', ticketHtml.length);
    console.log('[TestPrint] HTML preview:', ticketHtml.substring(0, 500));
    console.log('[TestPrint] Print orientation:', (template as any).printOrientation || 'auto');
    
    // Determine effective orientation for the print agent
    const naturalOrientation = template.paperWidthMm > template.paperHeightMm ? 'landscape' : 'portrait';
    const effectiveOrientation = (template as any).printOrientation === 'auto' || !(template as any).printOrientation
      ? naturalOrientation
      : (template as any).printOrientation;
    
    // Build the print job payload with pre-rendered HTML
    // Note: 'type' must be 'ticket' for print-agent to use the HTML
    const printPayload = {
      id: `test-${Date.now()}`,
      type: 'ticket', // Use 'ticket' type so print-agent uses the HTML
      paperWidthMm: template.paperWidthMm,
      paperHeightMm: template.paperHeightMm,
      orientation: effectiveOrientation, // Pass orientation to print agent
      html: ticketHtml, // Pre-rendered HTML for the printer
      isTestPrint: true,
    };
    
    // Send to agent via WebSocket
    const sent = sendPrintJobToAgent(agentId, printPayload);
    
    if (!sent) {
      return res.status(503).json({ error: 'Agente non connesso o non raggiungibile' });
    }
    
    res.json({ success: true, message: 'Stampa di prova inviata' });
  } catch (error) {
    console.error('Error sending test print:', error);
    res.status(500).json({ error: 'Errore nell\'invio stampa di prova' });
  }
});

export default router;
