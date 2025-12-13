/**
 * Script per fare push del Print Agent su GitHub
 * Usa l'integrazione GitHub di Replit
 */

import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Token Replit non trovato');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub non connesso. Vai su Replit e connetti GitHub nelle integrazioni.');
  }
  return accessToken;
}

async function main() {
  console.log('🚀 Push Event4U Print Agent su GitHub\n');
  
  const owner = 'evenfouryou';
  const repo = 'event4u-print-agent';
  
  try {
    const accessToken = await getAccessToken();
    const octokit = new Octokit({ auth: accessToken });
    
    // Ottieni info utente
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Connesso come: ${user.login}`);
    
    // Files da pushare
    const files = [
      { path: 'main.js', localPath: 'print-agent/main.js' },
      { path: 'index.html', localPath: 'print-agent/index.html' },
      { path: 'package.json', localPath: 'print-agent/package.json' },
      { path: 'preload.js', localPath: 'print-agent/preload.js' },
      { path: 'renderer.js', localPath: 'print-agent/renderer.js' },
      { path: 'styles.css', localPath: 'print-agent/styles.css' },
      { path: 'README.md', localPath: 'print-agent/README.md' }
    ];
    
    console.log(`📂 Target: https://github.com/${owner}/${repo}`);
    
    // Get current commit SHA
    let currentSha: string | undefined;
    let treeSha: string | undefined;
    
    try {
      const { data: ref } = await octokit.git.getRef({
        owner,
        repo,
        ref: 'heads/main'
      });
      currentSha = ref.object.sha;
      
      const { data: commit } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: currentSha
      });
      treeSha = commit.tree.sha;
      console.log(`📍 Current commit: ${currentSha.substring(0, 7)}`);
    } catch (e) {
      console.log('📝 No existing commits, creating initial commit...');
    }
    
    // Create blobs for each file
    console.log('📦 Creating file blobs...');
    const treeItems: Array<{path: string, mode: '100644', type: 'blob', sha: string}> = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file.localPath, 'utf-8');
      
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64'
      });
      
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });
      console.log(`   ✓ ${file.path}`);
    }
    
    // Create tree
    console.log('🌳 Creating tree...');
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      tree: treeItems,
      base_tree: treeSha
    });
    
    // Create commit
    console.log('📝 Creating commit...');
    const commitMessage = 'Fix stampa: DPI corretto e timeout aumentato v1.4.5\n\n- Timeout caricamento immagini da 800ms a 2000ms per QR code\n- Versione 1.4.5';
    
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: tree.sha,
      parents: currentSha ? [currentSha] : []
    });
    
    // Update reference
    console.log('🔄 Updating main branch...');
    try {
      await octokit.git.updateRef({
        owner,
        repo,
        ref: 'heads/main',
        sha: commit.sha
      });
    } catch (e) {
      // Branch doesn't exist, create it
      await octokit.git.createRef({
        owner,
        repo,
        ref: 'refs/heads/main',
        sha: commit.sha
      });
    }
    
    console.log('\n✅ Push completato!');
    console.log(`   Commit: ${commit.sha.substring(0, 7)}`);
    console.log(`   URL: https://github.com/${owner}/${repo}`);
    
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
    if (error.status === 404) {
      console.error('   Il repository non esiste o non hai accesso.');
    }
    process.exit(1);
  }
}

main();
