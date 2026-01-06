import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;
  const data = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken! } }
  ).then(res => res.json());
  const conn = data.items?.[0];
  return conn?.settings?.access_token || conn?.settings?.oauth?.credentials?.access_token;
}

async function upload() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  const content = fs.readFileSync('/home/runner/workspace/siae-lettore-fix/main.js');
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: 'main.js' }) as any;
    sha = data.sha;
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path: 'main.js',
    message: 'Fix: prevent crash on window close (isDestroyed check)',
    content: content.toString('base64'),
    sha,
    branch: 'main'
  });
  console.log('✅ main.js updated with fix!');
}

upload().catch(console.error);
