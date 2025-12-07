// GitHub Integration for Smart Card Reader Repository
// Uses Replit's GitHub connector

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

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Read file from desktop-app directory
function readDesktopFile(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'desktop-app', filename);
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error(`Failed to read ${filename}:`, e);
    return '';
  }
}

// Read binary file from desktop-app directory and return base64
function readDesktopFileBinary(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'desktop-app', filename);
    return fs.readFileSync(filePath).toString('base64');
  } catch (e) {
    console.error(`Failed to read binary ${filename}:`, e);
    return '';
  }
}

// Get text files to upload from local desktop-app directory
function getFilesToUpload(): Record<string, string> {
  return {
    'main.js': readDesktopFile('main.js'),
    'preload.js': readDesktopFile('preload.js'),
    'index.html': readDesktopFile('index.html'),
    'styles.css': readDesktopFile('styles.css'),
    'renderer.js': readDesktopFile('renderer.js'),
    'package.json': readDesktopFile('package.json'),
    'README.md': readDesktopFile('README.md'),
    'BUILD_INSTRUCTIONS.md': readDesktopFile('BUILD_INSTRUCTIONS.md'),
    'build-local.ps1': readDesktopFile('build-local.ps1'),
    '.github/workflows/build.yml': readDesktopFile('.github/workflows/build.yml'),
    'SiaeBridge/SiaeBridge.csproj': readDesktopFile('SiaeBridge/SiaeBridge.csproj'),
    'SiaeBridge/Program.cs': readDesktopFile('SiaeBridge/Program.cs'),
    'SiaeBridge/LibSiae.cs': readDesktopFile('SiaeBridge/LibSiae.cs')
  };
}

// Get binary files to upload (already base64 encoded)
function getBinaryFilesToUpload(): Record<string, string> {
  return {
    'SiaeBridge/prebuilt/libSIAE.dll': readDesktopFileBinary('SiaeBridge/prebuilt/libSIAE.dll'),
    'SiaeBridge/prebuilt/Newtonsoft.Json.dll': readDesktopFileBinary('SiaeBridge/prebuilt/Newtonsoft.Json.dll')
  };
}

export async function updateSmartCardReaderRepo(): Promise<{ success: boolean; repoUrl?: string; error?: string; filesUploaded?: number }> {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`GitHub user: ${user.login}`);
    
    const repoName = 'event-four-you-siae-lettore';
    
    // Check if repo exists
    let repoExists = false;
    try {
      await octokit.repos.get({ owner: user.login, repo: repoName });
      repoExists = true;
      console.log('Repository found, updating files...');
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }
    
    // Create repo if it doesn't exist
    if (!repoExists) {
      console.log('Creating new repository...');
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'Event4U Smart Card Reader - Applicazione Electron per MiniLector EVO V3',
        private: false,
        auto_init: true
      });
      // Wait for repo to be ready
      console.log('Waiting for repository to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    const FILES_TO_UPLOAD = getFilesToUpload();
    const BINARY_FILES_TO_UPLOAD = getBinaryFilesToUpload();
    let filesUploaded = 0;
    let workflowSkipped = false;
    
    // Upload text files
    for (const [filename, content] of Object.entries(FILES_TO_UPLOAD)) {
      if (!content) {
        console.log(`Skipping ${filename} (empty or not found)`);
        continue;
      }
      
      console.log(`Uploading ${filename}...`);
      
      let success = false;
      let lastError: any = null;
      
      for (let attempt = 0; attempt < 3 && !success; attempt++) {
        try {
          // Check if file exists
          let sha: string | undefined;
          try {
            const { data: existingFile } = await octokit.repos.getContent({
              owner: user.login,
              repo: repoName,
              path: filename
            });
            if ('sha' in existingFile) {
              sha = existingFile.sha;
            }
          } catch (e: any) {
            // 404 is expected for new files
          }
          
          // Create or update file
          await octokit.repos.createOrUpdateFileContents({
            owner: user.login,
            repo: repoName,
            path: filename,
            message: sha ? `Update ${filename}` : `Add ${filename}`,
            content: Buffer.from(content).toString('base64'),
            ...(sha ? { sha } : {})
          });
          
          success = true;
          filesUploaded++;
          console.log(`  ✓ ${filename} uploaded`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e: any) {
          lastError = e;
          if (filename.includes('.github') && e.message.includes('workflow')) {
            console.log(`  ⚠ Workflow file skipped (add manually via GitHub UI)`);
            workflowSkipped = true;
            break;
          }
          console.log(`  Attempt ${attempt + 1}/3 failed for ${filename}: ${e.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // Upload binary files (already base64 encoded)
    for (const [filename, base64Content] of Object.entries(BINARY_FILES_TO_UPLOAD)) {
      if (!base64Content) {
        console.log(`Skipping binary ${filename} (empty or not found)`);
        continue;
      }
      
      console.log(`Uploading binary ${filename}...`);
      
      let success = false;
      
      for (let attempt = 0; attempt < 3 && !success; attempt++) {
        try {
          // Check if file exists
          let sha: string | undefined;
          try {
            const { data: existingFile } = await octokit.repos.getContent({
              owner: user.login,
              repo: repoName,
              path: filename
            });
            if ('sha' in existingFile) {
              sha = existingFile.sha;
            }
          } catch (e: any) {
            // 404 is expected for new files
          }
          
          // Create or update file (content is already base64)
          await octokit.repos.createOrUpdateFileContents({
            owner: user.login,
            repo: repoName,
            path: filename,
            message: sha ? `Update ${filename}` : `Add ${filename}`,
            content: base64Content,
            ...(sha ? { sha } : {})
          });
          
          success = true;
          filesUploaded++;
          console.log(`  ✓ ${filename} uploaded`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e: any) {
          console.log(`  Attempt ${attempt + 1}/3 failed for binary ${filename}: ${e.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    const repoUrl = `https://github.com/${user.login}/${repoName}`;
    console.log(`Repository ready: ${repoUrl}`);
    console.log(`Files uploaded: ${filesUploaded}`);
    
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

// Keep old function name for backward compatibility
export const createSmartCardReaderRepo = updateSmartCardReaderRepo;
