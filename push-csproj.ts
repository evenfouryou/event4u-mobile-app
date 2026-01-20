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

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const OWNER = 'evenfouryou';
  const REPO = 'event-four-you-siae-lettore';
  
  // Get current SHA
  const { data: file } = await octokit.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path: 'desktop-app/SiaeBridge/SiaeBridge.csproj',
    ref: 'main'
  });
  
  const sha = (file as any).sha;
  
  // Read and encode file
  const content = fs.readFileSync('siae-lettore-fix/SiaeBridge/SiaeBridge.csproj', 'utf8');
  const contentBase64 = Buffer.from(content).toString('base64');
  
  // Update file
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: 'desktop-app/SiaeBridge/SiaeBridge.csproj',
    message: 'Add BouncyCastle.Cryptography dependency',
    content: contentBase64,
    sha: sha,
    branch: 'main'
  });
  
  console.log('SiaeBridge.csproj updated with BouncyCastle dependency!');
}

main().catch(e => console.error('Error:', e.message));
