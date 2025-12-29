/**
 * Script per caricare i file desktop-app su GitHub
 * Usa l'integrazione GitHub di Replit
 */

import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

let connectionSettings = null;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
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

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function uploadFile(octokit, owner, repo, filePath, content, message) {
  try {
    // Check if file exists to get SHA
    let sha = null;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath
      });
      sha = data.sha;
      console.log(`  File exists, updating: ${filePath}`);
    } catch (e) {
      console.log(`  Creating new file: ${filePath}`);
    }

    // Upload file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: message,
      content: Buffer.from(content).toString('base64'),
      sha: sha
    });
    
    console.log(`  ✓ Uploaded: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error uploading ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Push to GitHub - Event4U SIAE Lettore');
  console.log('='.repeat(50));

  try {
    const octokit = await getGitHubClient();
    console.log('✓ GitHub client initialized');

    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✓ Authenticated as: ${user.login}`);

    // List repositories to find the correct one
    console.log('\nListing repositories...');
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated'
    });
    
    console.log('Available repositories:');
    repos.slice(0, 10).forEach(r => console.log(`  - ${r.name} (${r.full_name})`));
    
    // Try to find Event4U or similar
    const targetRepo = repos.find(r => 
      r.name.toLowerCase().includes('event4u') || 
      r.name.toLowerCase().includes('siae')
    );
    
    const owner = user.login;
    const repo = targetRepo ? targetRepo.name : repos[0]?.name;
    
    console.log(`\nTarget repository: ${owner}/${repo}`);

    // Files to upload
    const filesToUpload = [
      'desktop-app/main.js',
      'desktop-app/index.html',
      'desktop-app/styles.css',
      'desktop-app/renderer.js',
      'desktop-app/preload.js',
      'desktop-app/package.json',
      'desktop-app/BUILD_INSTRUCTIONS.md',
      'desktop-app/SiaeBridge/Program.cs',
      'desktop-app/SiaeBridge/SiaeBridge.csproj'
    ];

    console.log(`\nUploading ${filesToUpload.length} files...`);

    let successCount = 0;
    for (const file of filesToUpload) {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const success = await uploadFile(
          octokit,
          owner,
          repo,
          file,
          content,
          `Update ${path.basename(file)} - logging system and UI improvements`
        );
        if (success) successCount++;
      } else {
        console.log(`  ⚠ File not found: ${file}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Completed: ${successCount}/${filesToUpload.length} files uploaded`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
