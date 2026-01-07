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
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // First, let's check what's in the repo
  console.log('Checking repository contents...');
  try {
    const { data: repoInfo } = await octokit.repos.get({ owner, repo });
    console.log('Repo:', repoInfo.full_name, '- default branch:', repoInfo.default_branch);
    
    const { data: contents } = await octokit.repos.getContent({ owner, repo, path: '' });
    console.log('Root contents:', Array.isArray(contents) ? contents.map(c => c.name).join(', ') : 'single file');
  } catch (e: any) {
    console.log('Error getting repo:', e.message);
    return;
  }
  
  // Check if .github folder exists
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: '.github/workflows' });
    console.log('.github/workflows exists');
  } catch (e) {
    console.log('.github/workflows does not exist, need to create it');
    
    // Create .github/workflows/build.yml
    const workflowContent = fs.readFileSync('.github/workflows/build-siae-bridge.yml', 'base64');
    
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: '.github/workflows/build.yml',
        message: 'Add GitHub Actions workflow for v3.35',
        content: workflowContent,
        branch: 'main'
      });
      console.log('✅ Workflow file created!');
    } catch (createErr: any) {
      console.log('Error creating workflow:', createErr.message);
      console.log('Full error:', JSON.stringify(createErr.response?.data, null, 2));
    }
  }
}

main().catch(console.error);
