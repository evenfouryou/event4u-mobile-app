import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  const connectionSettings = await fetch(
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

async function syncFile(octokit: Octokit, owner: string, repo: string, localPath: string, remotePath: string) {
  const content = fs.readFileSync(localPath, 'utf-8');
  
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: remotePath });
    if (!Array.isArray(data)) sha = data.sha;
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: remotePath,
    message: 'v3.36: Fix smart card detection - scan all slots and fallback to Initialize()',
    content: Buffer.from(content).toString('base64'),
    sha,
    branch: 'main'
  });
  
  console.log(`✅ ${remotePath}`);
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== SYNC v3.36 CARD DETECTION FIX ===\n');
  
  await syncFile(octokit, owner, repo,
    '/home/runner/workspace/desktop-app/SiaeBridge/Program.cs',
    'desktop-app/SiaeBridge/Program.cs'
  );
  
  console.log('\n📤 Triggering build workflow...');
  try {
    await octokit.actions.createWorkflowDispatch({
      owner, repo,
      workflow_id: 'build.yml',
      ref: 'main'
    });
    console.log('✅ Workflow triggered');
  } catch (e: any) {
    console.log(`⚠️ Workflow will be triggered by push`);
  }
  
  console.log('\n🎉 Done! Check https://github.com/evenfouryou/event-four-you-siae-lettore/actions');
}

main().catch(console.error);
