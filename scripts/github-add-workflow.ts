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

async function uploadWorkflow() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Read workflow file from .github/workflows
  const workflowPath = '.github/workflows/build-siae-bridge.yml';
  const content = fs.readFileSync(workflowPath).toString('base64');
  
  // Check if file exists
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: '.github/workflows/build.yml'
    }) as { data: { sha: string } };
    sha = data.sha;
    console.log('Workflow file exists, updating...');
  } catch (e) {
    console.log('Workflow file does not exist, creating...');
  }
  
  // Create or update workflow file
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: '.github/workflows/build.yml',
    message: 'v3.35: Fix SIAE 40605 - S/MIME headers with correct RCA filename',
    content,
    sha,
    branch: 'main'
  });
  
  console.log('✅ Workflow uploaded!');
  console.log('GitHub Actions will now automatically build and create releases on push.');
  console.log('\nCheck: https://github.com/evenfouryou/event-four-you-siae-lettore/actions');
}

uploadWorkflow().catch(console.error);
