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
  if (!xReplitToken) throw new Error('X_REPLIT_TOKEN not found');
  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);
  return connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const owner = 'evenfouryou';
  const repo = 'event4u-print-agent';
  
  const content = fs.readFileSync('./print-agent/package.json', 'utf-8');
  const base64Content = Buffer.from(content).toString('base64');
  
  // Get current file SHA
  let sha: string | undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path: 'package.json' });
    if ('sha' in data) sha = data.sha;
  } catch (e) {}
  
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo,
    path: 'package.json',
    message: 'Remove icon references to fix build',
    content: base64Content,
    sha
  });
  
  console.log('Updated! Build will restart automatically.');
  console.log('Check: https://github.com/evenfouryou/event4u-print-agent/actions');
}

main().catch(console.error);
