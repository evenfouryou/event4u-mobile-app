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

  connectionSettings = await fetch(
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRemoteFiles(octokit: Octokit, owner: string, repo: string, remotePath: string): Promise<Set<string>> {
  const files = new Set<string>();
  
  async function scan(currentPath: string) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: currentPath });
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.type === 'file') {
            files.add(item.path);
          } else if (item.type === 'dir') {
            await scan(item.path);
          }
        }
      }
    } catch (e) {
      // Path doesn't exist
    }
  }
  
  await scan(remotePath);
  return files;
}

async function uploadFile(octokit: Octokit, owner: string, repo: string, localPath: string, remotePath: string): Promise<boolean> {
  try {
    const content = fs.readFileSync(localPath);
    const base64Content = content.toString('base64');
    
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: remotePath });
      if (!Array.isArray(data)) {
        sha = data.sha;
      }
    } catch (e) {
      // File doesn't exist
    }
    
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: remotePath,
      message: `Sync ${path.basename(remotePath)}`,
      content: base64Content,
      sha,
      branch: 'main'
    });
    
    return true;
  } catch (e: any) {
    console.log(`❌ ${remotePath}: ${e.message}`);
    return false;
  }
}

async function syncDesktopApp() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== SINCRONIZZAZIONE DESKTOP-APP ===\n');
  
  // Get current remote files
  console.log('📋 Controllo file remoti...');
  const remoteFiles = await getRemoteFiles(octokit, owner, repo, 'desktop-app');
  console.log(`   Trovati ${remoteFiles.size} file remoti\n`);
  
  // Local files to check
  const localBase = '/home/runner/workspace/desktop-app';
  const filesToCheck = [
    'README.md',
    '.github/workflows/build.yml',
    'package.json',
    'main.js',
    'preload.js',
    'renderer.js',
    'index.html',
    'styles.css',
    'icon.png',
    'build-local.ps1',
    'BUILD_INSTRUCTIONS.md',
    'SiaeBridge/LibSiae.cs',
    'SiaeBridge/Program.cs',
    'SiaeBridge/SIAEReader.cs',
    'SiaeBridge/SiaeBridge.csproj',
    'SiaeBridge/libSIAEp7.dll',
    'SiaeBridge/prebuilt/Newtonsoft.Json.dll',
    'SiaeBridge/prebuilt/libSIAE.dll',
    'SiaeBridge/prebuilt/libSIAEp7.dll',
  ];
  
  const toUpload: { local: string; remote: string }[] = [];
  
  for (const file of filesToCheck) {
    const localPath = path.join(localBase, file);
    const remotePath = `desktop-app/${file}`;
    
    if (fs.existsSync(localPath)) {
      if (!remoteFiles.has(remotePath)) {
        toUpload.push({ local: localPath, remote: remotePath });
      }
    }
  }
  
  console.log(`📤 File da caricare: ${toUpload.length}\n`);
  
  let success = 0;
  for (const item of toUpload) {
    console.log(`   Uploading: ${item.remote}`);
    if (await uploadFile(octokit, owner, repo, item.local, item.remote)) {
      console.log(`   ✅ OK`);
      success++;
    }
    await sleep(400);
  }
  
  console.log(`\n📊 Risultato: ${success}/${toUpload.length} file caricati`);
  
  // Final verification
  console.log('\n=== VERIFICA FINALE ===');
  const finalFiles = await getRemoteFiles(octokit, owner, repo, 'desktop-app');
  console.log(`File in desktop-app/: ${finalFiles.size}`);
  finalFiles.forEach(f => console.log(`  - ${f}`));
}

syncDesktopApp().catch(console.error);
