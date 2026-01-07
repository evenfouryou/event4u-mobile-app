import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as crypto from 'crypto';

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

function getFileHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);
}

async function compareFiles() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== CONFRONTO FILE LOCALI vs GITHUB ===\n');
  
  const filesToCheck = [
    { local: '/home/runner/workspace/desktop-app/main.js', remote: 'desktop-app/main.js' },
    { local: '/home/runner/workspace/desktop-app/renderer.js', remote: 'desktop-app/renderer.js' },
    { local: '/home/runner/workspace/desktop-app/preload.js', remote: 'desktop-app/preload.js' },
    { local: '/home/runner/workspace/desktop-app/index.html', remote: 'desktop-app/index.html' },
    { local: '/home/runner/workspace/desktop-app/styles.css', remote: 'desktop-app/styles.css' },
    { local: '/home/runner/workspace/desktop-app/package.json', remote: 'desktop-app/package.json' },
    { local: '/home/runner/workspace/desktop-app/SiaeBridge/Program.cs', remote: 'desktop-app/SiaeBridge/Program.cs' },
    { local: '/home/runner/workspace/desktop-app/SiaeBridge/LibSiae.cs', remote: 'desktop-app/SiaeBridge/LibSiae.cs' },
    { local: '/home/runner/workspace/desktop-app/SiaeBridge/SiaeBridge.csproj', remote: 'desktop-app/SiaeBridge/SiaeBridge.csproj' },
    { local: '/home/runner/workspace/server/email-service.ts', remote: 'server/email-service.ts' },
  ];
  
  const needsSync: { local: string; remote: string; localSize: number; remoteSize: number }[] = [];
  
  for (const file of filesToCheck) {
    if (!fs.existsSync(file.local)) {
      console.log(`⚠️ ${file.remote}: File locale non esiste`);
      continue;
    }
    
    const localContent = fs.readFileSync(file.local, 'utf-8');
    const localHash = getFileHash(localContent);
    const localSize = localContent.length;
    
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: file.remote });
      if (!Array.isArray(data) && data.content) {
        const remoteContent = Buffer.from(data.content, 'base64').toString();
        const remoteHash = getFileHash(remoteContent);
        const remoteSize = remoteContent.length;
        
        if (localHash === remoteHash) {
          console.log(`✅ ${file.remote}: Sincronizzato (${localSize} bytes)`);
        } else {
          console.log(`❌ ${file.remote}: DIVERSO (locale: ${localSize}b, remoto: ${remoteSize}b)`);
          needsSync.push({ ...file, localSize, remoteSize });
        }
      }
    } catch (e) {
      console.log(`⚠️ ${file.remote}: Non trovato su GitHub`);
      needsSync.push({ ...file, localSize, remoteSize: 0 });
    }
  }
  
  if (needsSync.length > 0) {
    console.log(`\n=== FILE DA SINCRONIZZARE: ${needsSync.length} ===\n`);
    
    for (const file of needsSync) {
      console.log(`📤 Caricamento: ${file.remote}...`);
      
      const content = fs.readFileSync(file.local);
      
      let sha: string | undefined;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: file.remote });
        if (!Array.isArray(data)) sha = data.sha;
      } catch (e) {}
      
      try {
        await octokit.repos.createOrUpdateFileContents({
          owner, repo,
          path: file.remote,
          message: `Sync ${file.remote.split('/').pop()} with latest local changes`,
          content: content.toString('base64'),
          sha,
          branch: 'main'
        });
        console.log(`   ✅ OK`);
      } catch (e: any) {
        console.log(`   ❌ Errore: ${e.message}`);
      }
    }
  } else {
    console.log('\n✅ Tutti i file sono sincronizzati!');
  }
}

compareFiles().catch(console.error);
