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

async function uploadFile(octokit: any, owner: string, repo: string, filePath: string, message: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  let sha: string | undefined;
  try {
    const { data: existing } = await octokit.repos.getContent({ owner, repo, path: filePath });
    sha = 'sha' in existing ? existing.sha : undefined;
  } catch {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: filePath,
    message,
    content: Buffer.from(content).toString('base64'),
    sha
  });
  
  console.log(`✅ ${filePath}`);
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  await uploadFile(octokit, owner, repo, 'desktop-app/SiaeBridge/Program.cs', 'Fix: Use TcpListener instead of HttpListener (no admin required)');
  await uploadFile(octokit, owner, repo, 'desktop-app/SiaeBridge/SiaeBridge.csproj', 'Fix: Add Microsoft.CSharp reference');
  
  console.log('🔄 Build ripartirà automaticamente');
}

main().catch(e => console.error('❌', e.message));
