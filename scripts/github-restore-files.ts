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

async function restoreFiles() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Get current Program.cs SHA (in root)
  const { data: currentFile } = await octokit.repos.getContent({
    owner,
    repo,
    path: 'Program.cs'
  }) as { data: { sha: string } };
  
  console.log('Current Program.cs SHA:', currentFile.sha);
  
  // Read restored Program.cs from SiaeBridge subfolder in ZIP
  const restoredPath = '/tmp/siae-restore/event-four-you-siae-lettore-d5f36e9464d314a1092e5f329f0c8d8190b268a0/SiaeBridge/Program.cs';
  const content = fs.readFileSync(restoredPath).toString('base64');
  
  // Update file
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'Program.cs',
    message: 'Restore: Revert S/MIME OPAQUE changes - back to previous version',
    content: content,
    sha: currentFile.sha,
    branch: 'main'
  });
  
  console.log('✅ Program.cs restored!');
  console.log(`https://github.com/${owner}/${repo}`);
}

restoreFiles().catch(console.error);
