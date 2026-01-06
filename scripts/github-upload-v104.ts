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
  
  const programPath = '/home/runner/workspace/desktop-app/SiaeBridge/Program.cs';
  const content = fs.readFileSync(programPath, 'utf8');
  
  console.log('Uploading SiaeBridge/Program.cs...');
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: 'SiaeBridge/Program.cs' }) as any;
    sha = data.sha;
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: 'SiaeBridge/Program.cs',
    message: 'v3.21 - SMIMESignML nativo SIAE (fix warnings)',
    content: Buffer.from(content).toString('base64'),
    sha,
    branch: 'main'
  });
  console.log('✅ Program.cs uploaded');
  
  // Aggiorna la release v1.0.3 description
  console.log('\nUpdating release v1.0.3...');
  try {
    const { data: releases } = await octokit.repos.listReleases({ owner, repo });
    const release = releases.find(r => r.tag_name === 'v1.0.3');
    if (release) {
      await octokit.repos.updateRelease({
        owner, repo,
        release_id: release.id,
        body: release.body + '\n\n### Update\n- Fixed unreachable code warning'
      });
      console.log('✅ Release updated');
    }
  } catch (e: any) {
    console.log('Release update skipped:', e.message);
  }
}

upload().catch(console.error);
