import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";
import { initSiaeScheduler } from "./siae-scheduler";
import { runIdentityUnificationMigration } from "./migrations/identity-unification";

export async function serveStatic(app: Express, _server: Server) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

(async () => {
  try {
    console.log('[startup] Starting production server...');
    
    // Run identity unification migration (idempotent - safe to run multiple times)
    console.log('[startup] Running identity unification migration...');
    await runIdentityUnificationMigration();
    console.log('[startup] Identity migration completed');
    
    await runApp(serveStatic);
    console.log('[startup] Server started successfully');
    initSiaeScheduler();
    console.log('[startup] SIAE scheduler initialized');
  } catch (error) {
    console.error('[startup] Fatal error during startup:', error);
    process.exit(1);
  }
})();
