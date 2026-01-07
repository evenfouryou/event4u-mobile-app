import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

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

async function pushToGitHub() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  const branch = 'main';
  
  console.log('Getting current commit SHA...');
  
  let currentSha: string = '';
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    currentSha = ref.object.sha;
    console.log('Current SHA:', currentSha);
  } catch (e: any) {
    console.log('Branch not found, will create new:', e.message);
  }
  
  const files: { path: string; content: string }[] = [];
  
  // Add source files from desktop-app/SiaeBridge
  const baseDir = '/home/runner/workspace/desktop-app/SiaeBridge';
  
  function readDir(dir: string, prefix: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        if (entry.name !== 'bin' && entry.name !== 'obj' && entry.name !== '.git') {
          readDir(fullPath, relativePath);
        }
      } else {
        const content = fs.readFileSync(fullPath, 'base64');
        files.push({ path: relativePath, content });
      }
    }
  }
  
  readDir(baseDir);
  
  // Add workflow file
  const workflowContent = fs.readFileSync('.github/workflows/build-siae-bridge.yml', 'base64');
  files.push({ path: '.github/workflows/build.yml', content: workflowContent });
  
  console.log(`Found ${files.length} files to push (including workflow)`);
  
  const blobs = await Promise.all(files.map(async (file) => {
    const { data } = await octokit.git.createBlob({
      owner,
      repo,
      content: file.content,
      encoding: 'base64'
    });
    return { path: file.path, sha: data.sha };
  }));
  
  console.log('Created blobs');
  
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: blobs.map(b => ({
      path: b.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: b.sha
    })),
    base_tree: currentSha
  });
  
  console.log('Created tree:', tree.sha);
  
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'v3.35: Fix SIAE 40605 - S/MIME headers with correct RCA filename and Content-Type',
    tree: tree.sha,
    parents: currentSha ? [currentSha] : []
  });
  
  console.log('Created commit:', commit.sha);
  
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.sha
  });
  
  console.log('✅ Pushed to GitHub successfully!');
  console.log('https://github.com/evenfouryou/event-four-you-siae-lettore');
  console.log('\nThe workflow should trigger automatically.');
  console.log('Check: https://github.com/evenfouryou/event-four-you-siae-lettore/actions');
}

pushToGitHub().catch(console.error);
