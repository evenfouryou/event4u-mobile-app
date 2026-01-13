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

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function pushToGitHub() {
  const accessToken = await getAccessToken();
  
  const owner = 'evenfouryou';
  const repo = 'Event-Four-You-2026';
  const branch = 'main';
  
  console.log('Pushing files to Event-Four-You-2026 via REST API...\n');
  
  // Files to push
  const filesToPush = [
    '.github/workflows/android-build.yml',
    '.github/workflows/ios-build.yml',
    'capacitor.config.ts',
    'client/src/workers/scanner-search.worker.ts',
    'client/src/hooks/use-scanner-search-worker.ts'
  ];
  
  for (const filePath of filesToPush) {
    const fullPath = path.join('/home/runner/workspace', filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠ Skipping ${filePath} - not found`);
      continue;
    }
    
    const content = fs.readFileSync(fullPath);
    const base64Content = content.toString('base64');
    
    // Check if file exists to get SHA
    let sha: string | undefined;
    try {
      const checkResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        sha = data.sha;
      }
    } catch (e) {
      // File doesn't exist, that's fine
    }
    
    console.log(`Pushing ${filePath}${sha ? ' (updating)' : ' (creating)'}...`);
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          message: `Add/update ${path.basename(filePath)}`,
          content: base64Content,
          branch,
          ...(sha ? { sha } : {})
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`✗ Failed to push ${filePath}:`, response.status, error);
    } else {
      console.log(`✓ ${filePath}`);
    }
  }
  
  console.log('\n✅ Push complete!');
  console.log(`\nCheck build progress at:\nhttps://github.com/${owner}/${repo}/actions`);
}

pushToGitHub().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
