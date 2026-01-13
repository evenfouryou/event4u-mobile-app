import * as fs from 'fs';
import * as path from 'path';

const OWNER = 'evenfouryou';
const REPO = 'Event-Four-You-2026';
const BRANCH = 'main';

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
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

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function githubApi(token: string, endpoint: string, method: string = 'GET', body?: any) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${error}`);
  }
  
  return response.json();
}

async function pushWorkflows() {
  console.log('🔄 Pushing GitHub Actions workflows...\n');
  
  const token = await getAccessToken();
  
  // Get current commit SHA
  console.log('Getting current commit...');
  const refData = await githubApi(token, `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`);
  const currentCommitSha = refData.object.sha;
  console.log('Current commit:', currentCommitSha);
  
  // Get current commit's tree
  const commitData = await githubApi(token, `/repos/${OWNER}/${REPO}/git/commits/${currentCommitSha}`);
  const baseTreeSha = commitData.tree.sha;
  console.log('Base tree:', baseTreeSha);
  
  // Read workflow files
  const workflowFiles = [
    { path: '.github/workflows/android-build.yml', local: '/home/runner/workspace/.github/workflows/android-build.yml' },
    { path: '.github/workflows/ios-build.yml', local: '/home/runner/workspace/.github/workflows/ios-build.yml' }
  ];
  
  const treeItems: any[] = [];
  
  for (const file of workflowFiles) {
    if (!fs.existsSync(file.local)) {
      console.log(`⚠ File not found: ${file.local}`);
      continue;
    }
    
    const content = fs.readFileSync(file.local, 'utf-8');
    
    // Create blob
    console.log(`Creating blob for ${file.path}...`);
    const blobData = await githubApi(token, `/repos/${OWNER}/${REPO}/git/blobs`, 'POST', {
      content: Buffer.from(content).toString('base64'),
      encoding: 'base64'
    });
    
    treeItems.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha
    });
    
    console.log(`✓ Blob created: ${blobData.sha}`);
  }
  
  if (treeItems.length === 0) {
    throw new Error('No files to push');
  }
  
  // Create new tree
  console.log('\nCreating new tree...');
  const treeData = await githubApi(token, `/repos/${OWNER}/${REPO}/git/trees`, 'POST', {
    base_tree: baseTreeSha,
    tree: treeItems
  });
  console.log('New tree:', treeData.sha);
  
  // Create commit
  console.log('Creating commit...');
  const newCommitData = await githubApi(token, `/repos/${OWNER}/${REPO}/git/commits`, 'POST', {
    message: 'Add GitHub Actions workflows for Android and iOS builds',
    tree: treeData.sha,
    parents: [currentCommitSha]
  });
  console.log('New commit:', newCommitData.sha);
  
  // Update ref
  console.log('Updating branch reference...');
  await githubApi(token, `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, 'PATCH', {
    sha: newCommitData.sha
  });
  
  console.log('\n✅ Workflows pushed successfully!');
  console.log(`\n🔨 Check build progress at:\nhttps://github.com/${OWNER}/${REPO}/actions`);
}

pushWorkflows().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
