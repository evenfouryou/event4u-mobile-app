/**
 * Script per fare push del SIAE Lettore su GitHub
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
  console.log('🚀 Push Event4U SIAE Lettore v3.7 su GitHub\n');
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  try {
    const accessToken = await getAccessToken();
    const octokit = new Octokit({ auth: accessToken });
    
    // Ottieni info utente
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Connesso come: ${user.login}`);
    
    // Files da pushare - SIAE Lettore COMPLETO
    // La struttura del repo è: root/SiaeBridge, root/main.js, etc.
    const files = [
      // SiaeBridge (.NET)
      { path: 'SiaeBridge/Program.cs', localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/Program.cs' },
      { path: 'SiaeBridge/SiaeBridge.csproj', localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/SiaeBridge.csproj' },
      { path: 'SiaeBridge/LibSiae.cs', localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/LibSiae.cs' },
      { path: 'SiaeBridge/SIAEReader.cs', localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/SIAEReader.cs' },
      // Electron app
      { path: 'main.js', localPath: 'siae-lettore-fix/desktop-app/main.js' },
      { path: 'preload.js', localPath: 'siae-lettore-fix/desktop-app/preload.js' },
      { path: 'renderer.js', localPath: 'siae-lettore-fix/desktop-app/renderer.js' },
      { path: 'index.html', localPath: 'siae-lettore-fix/desktop-app/index.html' },
      { path: 'styles.css', localPath: 'siae-lettore-fix/desktop-app/styles.css' },
      { path: 'package.json', localPath: 'siae-lettore-fix/desktop-app/package.json' },
      // Build instructions
      { path: 'BUILD_INSTRUCTIONS.md', localPath: 'siae-lettore-fix/desktop-app/BUILD_INSTRUCTIONS.md' },
      { path: 'build-local.ps1', localPath: 'siae-lettore-fix/desktop-app/build-local.ps1' }
    ];
    
    // Binary files (DLLs)
    const binaryFiles = [
      { path: 'SiaeBridge/libSIAEp7.dll', localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/libSIAEp7.dll' },
      { path: 'SiaeBridge/prebuilt/libSIAE.dll', localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/prebuilt/libSIAE.dll' },
      { path: 'SiaeBridge/prebuilt/Newtonsoft.Json.dll', localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/prebuilt/Newtonsoft.Json.dll' }
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
    
    // Text files
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
    
    // Binary files
    for (const file of binaryFiles) {
      const content = fs.readFileSync(file.localPath);
      
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: content.toString('base64'),
        encoding: 'base64'
      });
      
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });
      console.log(`   ✓ ${file.path} (binary)`);
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
    const commitMessage = 'v3.11: Fix missing System.Security.Permissions\n\n- Added System.Security.Permissions NuGet package v8.0.0\n- Required by Newtonsoft.Json on .NET 8\n- Fixes FileNotFoundException on DynamicCodeGeneration';
    
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
