/**
 * Upload diretto dei file su GitHub via API
 */

import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) throw new Error('Token non trovato');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
}

// File da caricare per il progetto desktop
// Formato: { local: path locale, remote: path nel repository GitHub }
const filesToUpload = [
  // GitHub Actions workflow - deve essere in .github/workflows/ nel repo
  { local: 'desktop-app/.github/workflows/build.yml', remote: '.github/workflows/build.yml' },
  // Electron app files - root del repo
  { local: 'desktop-app/package.json', remote: 'package.json' },
  { local: 'desktop-app/main.js', remote: 'main.js' },
  { local: 'desktop-app/preload.js', remote: 'preload.js' },
  { local: 'desktop-app/index.html', remote: 'index.html' },
  { local: 'desktop-app/styles.css', remote: 'styles.css' },
  { local: 'desktop-app/renderer.js', remote: 'renderer.js' },
  // SiaeBridge .NET project
  { local: 'desktop-app/SiaeBridge/SiaeBridge.csproj', remote: 'SiaeBridge/SiaeBridge.csproj' },
  { local: 'desktop-app/SiaeBridge/Program.cs', remote: 'SiaeBridge/Program.cs' },
  { local: 'desktop-app/SiaeBridge/LibSiae.cs', remote: 'SiaeBridge/LibSiae.cs' },
];

async function main() {
  console.log('📤 Caricamento file su GitHub...\n');
  
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Prima crea un README per inizializzare il repo
  console.log('📝 Inizializzazione repository...');
  
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: 'README.md',
      message: 'Initial commit - Event Four You SIAE Lettore',
      content: Buffer.from('# Event Four You SIAE Lettore\n\nSmart Card Reader per MiniLector EVO V3\n').toString('base64')
    });
    console.log('✅ README.md creato');
  } catch (e: any) {
    if (!e.message?.includes('sha')) {
      console.log('⚠️  README già esiste, continuo...');
    }
  }
  
  // Attendi un attimo per la sincronizzazione
  await new Promise(r => setTimeout(r, 1000));
  
  // Ora carica tutti i file uno per uno
  for (const file of filesToUpload) {
    const fullPath = path.join('/home/runner/workspace', file.local);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File non trovato: ${file.local}`);
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    try {
      // Prova a ottenere il file esistente per il SHA
      let sha: string | undefined;
      try {
        const { data: existing } = await octokit.repos.getContent({ owner, repo, path: file.remote });
        if ('sha' in existing) {
          sha = existing.sha;
        }
      } catch {
        // File non esiste, va bene
      }
      
      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: file.remote,
        message: `Update ${file.remote}`,
        content: Buffer.from(content).toString('base64'),
        sha
      });
      
      console.log(`✅ ${file.remote}`);
    } catch (e: any) {
      console.log(`❌ ${file.remote}: ${e.message}`);
    }
  }
  
  // Carica le DLL prebuilt per il bridge SIAE
  const dllsToUpload = [
    { local: 'desktop-app/SiaeBridge/prebuilt/libSIAE.dll', remote: 'SiaeBridge/prebuilt/libSIAE.dll' },
    { local: 'desktop-app/SiaeBridge/prebuilt/libSIAEp7.dll', remote: 'SiaeBridge/prebuilt/libSIAEp7.dll' },
    { local: 'desktop-app/SiaeBridge/prebuilt/Newtonsoft.Json.dll', remote: 'SiaeBridge/prebuilt/Newtonsoft.Json.dll' },
  ];
  
  for (const dll of dllsToUpload) {
    const fullPath = path.join('/home/runner/workspace', dll.local);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  DLL non trovata: ${dll.local}`);
      continue;
    }
    
    const content = fs.readFileSync(fullPath);
    
    try {
      let sha: string | undefined;
      try {
        const { data: existing } = await octokit.repos.getContent({ owner, repo, path: dll.remote });
        if ('sha' in existing) sha = existing.sha;
      } catch {}
      
      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: dll.remote,
        message: `Update ${dll.remote}`,
        content: content.toString('base64'),
        sha
      });
      
      console.log(`✅ ${dll.remote}`);
    } catch (e: any) {
      console.log(`❌ ${dll.remote}: ${e.message}`);
    }
  }
  
  console.log('\n🎉 Upload completato!');
  console.log(`\n📦 Repository: https://github.com/${owner}/${repo}`);
  console.log(`🔧 GitHub Actions: https://github.com/${owner}/${repo}/actions`);
  console.log('\n⏳ La build partirà automaticamente. Dopo 5-10 minuti potrai scaricare l\'installer.');
}

main().catch(e => {
  console.error('❌ Errore:', e.message);
  process.exit(1);
});
