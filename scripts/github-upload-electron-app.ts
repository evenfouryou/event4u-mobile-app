import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;
  const data = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken! } }
  ).then(res => res.json());
  const conn = data.items?.[0];
  return conn?.settings?.access_token || conn?.settings?.oauth?.credentials?.access_token;
}

async function uploadFile(octokit: Octokit, owner: string, repo: string, repoPath: string, localPath: string) {
  const content = fs.readFileSync(localPath);
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: repoPath }) as any;
    sha = data.sha;
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path: repoPath,
    message: `Add ${path.basename(repoPath)}`,
    content: content.toString('base64'),
    sha,
    branch: 'main'
  });
  console.log(`✅ ${repoPath}`);
}

async function upload() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  const base = '/home/runner/workspace/siae-lettore-fix';
  
  console.log('Uploading COMPLETE SIAE Lettore Electron app...\n');
  
  // Electron app files (root)
  const electronFiles = ['main.js', 'index.html', 'renderer.js', 'preload.js', 'styles.css', 'package.json', 'icon.png', 'README.md', 'BUILD_INSTRUCTIONS.md', 'build-local.ps1'];
  for (const f of electronFiles) {
    const localPath = path.join(base, f);
    if (fs.existsSync(localPath)) {
      await uploadFile(octokit, owner, repo, f, localPath);
    }
  }
  
  // SiaeBridge .NET (dentro desktop-app)
  const bridgeFiles = [
    'desktop-app/SiaeBridge/Program.cs',
    'desktop-app/SiaeBridge/SiaeBridge.csproj',
    'desktop-app/SiaeBridge/LibSiae.cs',
    'desktop-app/SiaeBridge/SIAEReader.cs',
    'desktop-app/SiaeBridge/libSIAEp7.dll',
    'desktop-app/SiaeBridge/prebuilt/libSIAE.dll',
    'desktop-app/SiaeBridge/prebuilt/Newtonsoft.Json.dll',
    'desktop-app/build-local.ps1',
    'desktop-app/BUILD_INSTRUCTIONS.md',
    'desktop-app/index.html',
    'desktop-app/main.js',
    'desktop-app/package.json',
    'desktop-app/preload.js',
    'desktop-app/renderer.js',
    'desktop-app/styles.css'
  ];
  
  for (const f of bridgeFiles) {
    const localPath = path.join(base, f);
    if (fs.existsSync(localPath)) {
      await uploadFile(octokit, owner, repo, f, localPath);
    }
  }
  
  console.log('\n✅ App Electron completa caricata!');
}

upload().catch(console.error);
