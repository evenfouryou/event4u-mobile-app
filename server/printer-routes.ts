import { Router, Request, Response } from 'express';
import { db } from './db';
import { 
  printerModels, printerAgents, printerProfiles, printJobs, cashierSessions,
  insertPrinterModelSchema, updatePrinterModelSchema,
  insertPrinterProfileSchema, updatePrinterProfileSchema,
  insertPrintJobSchema, insertCashierSessionSchema
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// Type for authenticated user
interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  companyId?: string;
}

const router = Router();

// Helper to get authenticated user
function getUser(req: Request): AuthenticatedUser | null {
  return req.user as AuthenticatedUser | null;
}

// Middleware per verificare ruolo super admin (modelli stampante solo super admin)
function requireSuperAdmin(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Accesso negato - Solo Super Admin' });
  }
  next();
}

// Middleware per verificare ruolo gestore o superiore (profili e agenti)
function requireAdmin(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (!['super_admin', 'gestore'].includes(user.role)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  next();
}

// Middleware per verificare ruolo cassiere o superiore
function requireCashierOrAbove(req: Request, res: Response, next: Function) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (!['super_admin', 'gestore', 'cassiere'].includes(user.role)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  next();
}

// ==================== PRINTER MODELS (Super Admin only) ====================

// GET all printer models
router.get('/models', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const models = await db.select().from(printerModels).orderBy(desc(printerModels.createdAt));
    res.json(models);
  } catch (error) {
    console.error('Error fetching printer models:', error);
    res.status(500).json({ error: 'Errore nel recupero modelli stampante' });
  }
});

// POST create printer model
router.post('/models', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = insertPrinterModelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [model] = await db.insert(printerModels).values(parsed.data).returning();
    res.status(201).json(model);
  } catch (error) {
    console.error('Error creating printer model:', error);
    res.status(500).json({ error: 'Errore nella creazione modello stampante' });
  }
});

// PATCH update printer model
router.patch('/models/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updatePrinterModelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [model] = await db.update(printerModels)
      .set(parsed.data)
      .where(eq(printerModels.id, id))
      .returning();
    
    if (!model) {
      return res.status(404).json({ error: 'Modello non trovato' });
    }
    res.json(model);
  } catch (error) {
    console.error('Error updating printer model:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento modello stampante' });
  }
});

// DELETE printer model
router.delete('/models/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(printerModels).where(eq(printerModels.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting printer model:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione modello stampante' });
  }
});

// ==================== PRINTER PROFILES (Per-company) ====================

// GET profiles for company
router.get('/profiles', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    if (!companyId && user?.role !== 'super_admin') {
      return res.status(400).json({ error: 'Company ID richiesto' });
    }
    
    let query = db.select().from(printerProfiles);
    if (companyId) {
      query = query.where(eq(printerProfiles.companyId, companyId)) as any;
    }
    
    const profiles = await query.orderBy(desc(printerProfiles.createdAt));
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching printer profiles:', error);
    res.status(500).json({ error: 'Errore nel recupero profili stampante' });
  }
});

// POST create profile (admin - gestore or super_admin)
router.post('/profiles', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID richiesto' });
    }
    
    const parsed = insertPrinterProfileSchema.safeParse({ ...req.body, companyId });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [profile] = await db.insert(printerProfiles).values(parsed.data).returning();
    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating printer profile:', error);
    res.status(500).json({ error: 'Errore nella creazione profilo stampante' });
  }
});

// PATCH update profile (super_admin only)
router.patch('/profiles/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updatePrinterProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [profile] = await db.update(printerProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(printerProfiles.id, id))
      .returning();
    
    if (!profile) {
      return res.status(404).json({ error: 'Profilo non trovato' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error updating printer profile:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento profilo stampante' });
  }
});

// DELETE profile (super_admin only)
router.delete('/profiles/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(printerProfiles).where(eq(printerProfiles.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting printer profile:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione profilo stampante' });
  }
});

// ==================== PRINTER AGENTS ====================

// GET agents for company (cassiere+ access per widget dashboard)
router.get('/agents', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    let query = db.select().from(printerAgents);
    if (companyId) {
      query = query.where(eq(printerAgents.companyId, companyId)) as any;
    }
    
    const agents = await query.orderBy(desc(printerAgents.lastHeartbeat));
    res.json(agents);
  } catch (error) {
    console.error('Error fetching printer agents:', error);
    res.status(500).json({ error: 'Errore nel recupero agenti stampante' });
  }
});

// POST register agent (admin authenticated, returns token for desktop app)
router.post('/agents/register', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { deviceName, printerModelId, printerName, capabilities } = req.body;
    
    // Use admin's company or allow super_admin to specify company
    let companyId = user?.companyId;
    if (user?.role === 'super_admin' && req.body.companyId) {
      companyId = req.body.companyId;
    }
    
    if (!companyId || !deviceName) {
      return res.status(400).json({ error: 'companyId e deviceName richiesti' });
    }
    
    // Generate auth token
    const authToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(authToken).digest('hex');
    
    // Check if agent already exists
    const existing = await db.select().from(printerAgents)
      .where(and(
        eq(printerAgents.companyId, companyId),
        eq(printerAgents.deviceName, deviceName)
      ))
      .limit(1);
    
    let agent;
    if (existing.length > 0) {
      // Update existing
      [agent] = await db.update(printerAgents)
        .set({
          authToken: hashedToken,
          printerModelId,
          printerName,
          capabilities,
          status: 'offline',
          updatedAt: new Date()
        })
        .where(eq(printerAgents.id, existing[0].id))
        .returning();
    } else {
      // Create new
      [agent] = await db.insert(printerAgents).values({
        companyId,
        deviceName,
        authToken: hashedToken,
        printerModelId,
        printerName,
        capabilities,
        status: 'offline'
      }).returning();
    }
    
    // Return unhashed token to agent (only time it's visible)
    res.status(201).json({ ...agent, authToken });
  } catch (error) {
    console.error('Error registering printer agent:', error);
    res.status(500).json({ error: 'Errore nella registrazione agente stampante' });
  }
});

// DELETE agent (gestore can delete own company agents)
router.delete('/agents/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    
    // Verify agent belongs to user's company (unless super_admin)
    const agent = await db.select().from(printerAgents)
      .where(eq(printerAgents.id, id))
      .limit(1);
    
    if (agent.length === 0) {
      return res.status(404).json({ error: 'Agente non trovato' });
    }
    
    if (user?.role !== 'super_admin' && agent[0].companyId !== user?.companyId) {
      return res.status(403).json({ error: 'Non autorizzato ad eliminare questo agente' });
    }
    
    await db.delete(printerAgents).where(eq(printerAgents.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting printer agent:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione agente stampante' });
  }
});

// POST verify/connect agent (for desktop app - no session required)
// Security: Only validate by token hash - companyId from stored agent, not from client
router.post('/agents/connect', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token richiesto' });
    }
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find agent by token only - do NOT trust client-provided companyId
    const agents = await db.select().from(printerAgents)
      .where(eq(printerAgents.authToken, hashedToken))
      .limit(1);
    
    if (agents.length === 0) {
      return res.status(401).json({ error: 'Token non valido' });
    }
    
    const agent = agents[0];
    
    // Only update heartbeat here - status is set to 'online' by WebSocket connection
    // This prevents showing 'online' when WebSocket fails to connect
    await db.update(printerAgents)
      .set({
        lastHeartbeat: new Date(),
        updatedAt: new Date()
      })
      .where(eq(printerAgents.id, agent.id));
    
    // Return agent info including companyId from server (trusted source)
    res.json({
      success: true,
      agentId: agent.id,
      companyId: agent.companyId,
      deviceName: agent.deviceName,
      printerName: agent.printerName,
      wsUrl: '/ws/print-agent'
    });
  } catch (error) {
    console.error('Error connecting printer agent:', error);
    res.status(500).json({ error: 'Errore nella connessione agente stampante' });
  }
});

// Middleware per verificare token agente stampante (per endpoint desktop app)
async function verifyAgentToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token richiesto' });
  }
  
  const token = authHeader.substring(7);
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const agents = await db.select().from(printerAgents)
    .where(eq(printerAgents.authToken, hashedToken))
    .limit(1);
  
  if (agents.length === 0) {
    return res.status(401).json({ error: 'Token non valido' });
  }
  
  (req as any).printerAgent = agents[0];
  next();
}

// PATCH heartbeat from agent (requires agent token)
router.patch('/agents/:id/heartbeat', verifyAgentToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agent = (req as any).printerAgent;
    
    // Verify agent matches ID
    if (agent.id !== id) {
      return res.status(403).json({ error: 'Non autorizzato per questo agente' });
    }
    
    const { status, capabilities } = req.body;
    
    const [updatedAgent] = await db.update(printerAgents)
      .set({
        status: status || 'online',
        capabilities,
        lastHeartbeat: new Date(),
        updatedAt: new Date()
      })
      .where(eq(printerAgents.id, id))
      .returning();
    
    if (!updatedAgent) {
      return res.status(404).json({ error: 'Agent non trovato' });
    }
    res.json(updatedAgent);
  } catch (error) {
    console.error('Error updating agent heartbeat:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento heartbeat' });
  }
});

// ==================== PRINT JOBS ====================

// GET pending jobs for agent (requires agent token)
router.get('/jobs/pending/:agentId', verifyAgentToken, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = (req as any).printerAgent;
    
    // Verify agent matches ID
    if (agent.id !== agentId) {
      return res.status(403).json({ error: 'Non autorizzato per questo agente' });
    }
    
    const jobs = await db.select().from(printJobs)
      .where(and(
        eq(printJobs.agentId, agentId),
        eq(printJobs.status, 'pending')
      ))
      .orderBy(printJobs.createdAt);
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching pending jobs:', error);
    res.status(500).json({ error: 'Errore nel recupero lavori in attesa' });
  }
});

// POST create print job
router.post('/jobs', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID richiesto' });
    }
    
    const parsed = insertPrintJobSchema.safeParse({
      ...req.body,
      companyId,
      createdBy: user?.id
    });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dati non validi', details: parsed.error.errors });
    }
    
    const [job] = await db.insert(printJobs).values(parsed.data).returning();
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating print job:', error);
    res.status(500).json({ error: 'Errore nella creazione lavoro di stampa' });
  }
});

// PATCH update job status
router.patch('/jobs/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, errorMessage } = req.body;
    
    const updates: any = { status };
    if (status === 'completed') {
      updates.printedAt = new Date();
    }
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }
    
    const [job] = await db.update(printJobs)
      .set(updates)
      .where(eq(printJobs.id, id))
      .returning();
    
    if (!job) {
      return res.status(404).json({ error: 'Job non trovato' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento stato lavoro' });
  }
});

// ==================== CASHIER SESSIONS ====================

// GET active session for user
router.get('/cashier/session', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non autenticato' });
    }
    
    const sessions = await db.select().from(cashierSessions)
      .where(and(
        eq(cashierSessions.userId, userId),
        eq(cashierSessions.status, 'active')
      ))
      .limit(1);
    
    res.json(sessions[0] || null);
  } catch (error) {
    console.error('Error fetching cashier session:', error);
    res.status(500).json({ error: 'Errore nel recupero sessione cassa' });
  }
});

// POST open cashier session
router.post('/cashier/session', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    const userId = user?.id;
    
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'Company ID e User ID richiesti' });
    }
    
    const { eventId, printerAgentId } = req.body;
    
    const [session] = await db.insert(cashierSessions).values({
      companyId,
      userId,
      eventId,
      printerAgentId,
      status: 'active'
    }).returning();
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating cashier session:', error);
    res.status(500).json({ error: 'Errore nell\'apertura sessione cassa' });
  }
});

// PATCH close cashier session
router.patch('/cashier/session/:id/close', requireCashierOrAbove, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, ticketsIssued, totalAmount } = req.body;
    
    const [session] = await db.update(cashierSessions)
      .set({
        status: 'closed',
        closedAt: new Date(),
        notes,
        ticketsIssued,
        totalAmount
      })
      .where(eq(cashierSessions.id, id))
      .returning();
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error closing cashier session:', error);
    res.status(500).json({ error: 'Errore nella chiusura sessione cassa' });
  }
});

// GET cashier sessions history
router.get('/cashier/sessions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const companyId = user?.companyId;
    let query = db.select().from(cashierSessions);
    if (companyId) {
      query = query.where(eq(cashierSessions.companyId, companyId)) as any;
    }
    
    const sessions = await query.orderBy(desc(cashierSessions.openedAt));
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching cashier sessions:', error);
    res.status(500).json({ error: 'Errore nel recupero storico sessioni cassa' });
  }
});

export default router;
