// GitHub Integration for Mobile App Repository
// Uploads mobile-app folder to evenfouryou/event4u-mobile-app

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

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Recursively get all files from a directory
function getAllFiles(dirPath: string, basePath: string = ''): { path: string; content: string; isBinary: boolean }[] {
  const files: { path: string; content: string; isBinary: boolean }[] = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      // Skip node_modules, .expo, and other build artifacts
      if (item === 'node_modules' || item === '.expo' || item === 'dist' || 
          item === 'build' || item === '.git' || item === 'android' || 
          item === 'ios' || item === '.cache') {
        continue;
      }
      
      const fullPath = path.join(dirPath, item);
      const relativePath = basePath ? `${basePath}/${item}` : item;
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath, relativePath));
      } else {
        // Check if binary
        const ext = path.extname(item).toLowerCase();
        const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.ttf', '.otf', '.woff', '.woff2', '.eot'];
        const isBinary = binaryExts.includes(ext);
        
        try {
          const content = isBinary 
            ? fs.readFileSync(fullPath).toString('base64')
            : fs.readFileSync(fullPath, 'utf-8');
          
          files.push({ path: relativePath, content, isBinary });
        } catch (e) {
          console.error(`Failed to read ${relativePath}:`, e);
        }
      }
    }
  } catch (e) {
    console.error(`Failed to read directory ${dirPath}:`, e);
  }
  
  return files;
}

export async function updateMobileAppRepo(): Promise<{ success: boolean; repoUrl?: string; error?: string; filesUploaded?: number }> {
  try {
    const octokit = await getGitHubClient();
    
    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`GitHub user: ${user.login}`);
    
    const owner = 'evenfouryou';
    const repoName = 'event4u-mobile-app';
    
    // Verify repo exists
    try {
      await octokit.repos.get({ owner, repo: repoName });
      console.log('Repository found, updating files...');
    } catch (e: any) {
      if (e.status === 404) {
        return { success: false, error: `Repository ${owner}/${repoName} not found. Please create it first.` };
      }
      throw e;
    }
    
    // Get all files from mobile-app directory
    const mobileAppPath = path.join(process.cwd(), 'mobile-app');
    const files = getAllFiles(mobileAppPath);
    
    console.log(`Found ${files.length} files to upload`);
    
    let filesUploaded = 0;
    let errors: string[] = [];
    
    // Upload files in batches
    for (const file of files) {
      console.log(`Uploading ${file.path}...`);
      
      let success = false;
      
      for (let attempt = 0; attempt < 3 && !success; attempt++) {
        try {
          // Check if file exists to get SHA
          let sha: string | undefined;
          try {
            const { data: existingFile } = await octokit.repos.getContent({
              owner,
              repo: repoName,
              path: file.path
            });
            if ('sha' in existingFile) {
              sha = existingFile.sha;
            }
          } catch (e: any) {
            // 404 is expected for new files
          }
          
          // Create or update file
          const content = file.isBinary ? file.content : Buffer.from(file.content).toString('base64');
          
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo: repoName,
            path: file.path,
            message: sha ? `Update ${file.path}` : `Add ${file.path}`,
            content,
            ...(sha ? { sha } : {})
          });
          
          success = true;
          filesUploaded++;
          console.log(`  ✓ ${file.path}`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e: any) {
          console.log(`  Attempt ${attempt + 1}/3 failed: ${e.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (attempt === 2) {
            errors.push(`${file.path}: ${e.message}`);
          }
        }
      }
    }
    
    const repoUrl = `https://github.com/${owner}/${repoName}`;
    console.log(`\nRepository updated: ${repoUrl}`);
    console.log(`Files uploaded: ${filesUploaded}/${files.length}`);
    
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
    }
    
    return { 
      success: true, 
      repoUrl,
      filesUploaded
    };
    
  } catch (error: any) {
    console.error('GitHub error:', error.message);
    return { success: false, error: error.message };
  }
}
