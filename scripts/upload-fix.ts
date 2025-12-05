import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  const settings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken! } }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return settings?.settings?.access_token || settings.settings?.oauth?.credentials?.access_token;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  const filePath = 'desktop-app/SiaeBridge/SiaeBridge.csproj';
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Ottieni SHA
  const { data: existing } = await octokit.repos.getContent({ owner, repo, path: filePath });
  const sha = 'sha' in existing ? existing.sha : undefined;
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: filePath,
    message: 'Fix: Add Windows Forms reference for System Tray',
    content: Buffer.from(content).toString('base64'),
    sha
  });
  
  console.log('✅ File aggiornato!');
  console.log('🔄 La build ripartirà automaticamente.');
}

main().catch(e => console.error('❌', e.message));
