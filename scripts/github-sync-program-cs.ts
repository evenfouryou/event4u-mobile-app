import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken!
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
}

async function syncProgramCs() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== SYNC PROGRAM.CS v3.35 ===\n');
  
  // Check remote version
  console.log('📋 Versione su GitHub:');
  try {
    const { data } = await octokit.repos.getContent({ 
      owner, repo, 
      path: 'desktop-app/SiaeBridge/Program.cs' 
    });
    if (!Array.isArray(data) && data.content) {
      const content = Buffer.from(data.content, 'base64').toString();
      const versionMatch = content.match(/SiaeBridge v([\d.]+)/);
      if (versionMatch) {
        console.log(`   Versione: ${versionMatch[1]}`);
      }
      
      // Check if v3.35 fix is present
      if (content.includes('v3.35 FIX CRITICO: Post-processing header S/MIME')) {
        console.log('   ✅ Fix v3.35 già presente su GitHub');
        return;
      } else {
        console.log('   ❌ Fix v3.35 NON presente - aggiornamento necessario');
      }
    }
  } catch (e) {
    console.log('   File non trovato');
  }
  
  // Read local file
  const localPath = '/home/runner/workspace/desktop-app/SiaeBridge/Program.cs';
  const localContent = fs.readFileSync(localPath, 'utf-8');
  
  console.log('\n📋 Versione locale:');
  const localVersionMatch = localContent.match(/SiaeBridge v([\d.]+)/);
  if (localVersionMatch) {
    console.log(`   Versione: ${localVersionMatch[1]}`);
  }
  
  // Check for v3.35 fix
  if (localContent.includes('v3.35 FIX CRITICO: Post-processing header S/MIME')) {
    console.log('   ✅ Fix v3.35 presente localmente');
  }
  
  // Upload to GitHub
  console.log('\n📤 Caricamento su GitHub...');
  
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ 
      owner, repo, 
      path: 'desktop-app/SiaeBridge/Program.cs' 
    });
    if (!Array.isArray(data)) {
      sha = data.sha;
    }
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: 'desktop-app/SiaeBridge/Program.cs',
    message: 'Update Program.cs to v3.35 - Fix SIAE 40605 (S/MIME header post-processing)',
    content: Buffer.from(localContent).toString('base64'),
    sha,
    branch: 'main'
  });
  
  console.log('✅ Program.cs v3.35 caricato con successo!');
  
  // Also sync main.js if it has updates
  console.log('\n📤 Sincronizzazione main.js...');
  const mainJsPath = '/home/runner/workspace/desktop-app/main.js';
  const mainJsContent = fs.readFileSync(mainJsPath, 'utf-8');
  
  let mainJsSha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ 
      owner, repo, 
      path: 'desktop-app/main.js' 
    });
    if (!Array.isArray(data)) {
      mainJsSha = data.sha;
    }
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: 'desktop-app/main.js',
    message: 'Sync main.js with latest changes',
    content: Buffer.from(mainJsContent).toString('base64'),
    sha: mainJsSha,
    branch: 'main'
  });
  
  console.log('✅ main.js sincronizzato!');
  
  // Also sync email-service.ts
  console.log('\n📤 Sincronizzazione email-service.ts...');
  const emailServicePath = '/home/runner/workspace/server/email-service.ts';
  const emailServiceContent = fs.readFileSync(emailServicePath, 'utf-8');
  
  let emailSha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ 
      owner, repo, 
      path: 'server/email-service.ts' 
    });
    if (!Array.isArray(data)) {
      emailSha = data.sha;
    }
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: 'server/email-service.ts',
    message: 'Sync email-service.ts with latest changes',
    content: Buffer.from(emailServiceContent).toString('base64'),
    sha: emailSha,
    branch: 'main'
  });
  
  console.log('✅ email-service.ts sincronizzato!');
  
  console.log('\n=== SINCRONIZZAZIONE COMPLETATA ===');
}

syncProgramCs().catch(console.error);
