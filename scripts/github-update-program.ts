import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

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

async function updateProgram() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Paths to update (both locations in the repo)
  const paths = [
    'SiaeBridge/Program.cs',
    'desktop-app/SiaeBridge/Program.cs'
  ];
  
  // Read updated Program.cs from local workspace
  const localPath = '/home/runner/workspace/desktop-app/SiaeBridge/Program.cs';
  const content = fs.readFileSync(localPath).toString('base64');
  
  for (const path of paths) {
    try {
      // Get current file SHA
      const { data: currentFile } = await octokit.repos.getContent({
        owner,
        repo,
        path
      }) as { data: { sha: string } };
      
      // Update file
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: 'Add S/MIME OPAQUE format and debug logging for SIAE compliance',
        content,
        sha: currentFile.sha,
        branch: 'main'
      });
      
      console.log(`✅ Updated: ${path}`);
    } catch (e: any) {
      console.log(`❌ Error updating ${path}: ${e.message}`);
    }
  }
  
  console.log(`\n✅ Done! https://github.com/${owner}/${repo}`);
}

updateProgram().catch(console.error);
