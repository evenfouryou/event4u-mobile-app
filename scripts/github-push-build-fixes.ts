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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pushFixes() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== PUSH BUILD FIXES ===\n');
  
  const files = [
    {
      local: '/home/runner/workspace/desktop-app/.github/workflows/build.yml',
      remote: 'desktop-app/.github/workflows/build.yml',
      name: 'build.yml (fixed paths)'
    },
    {
      local: '/home/runner/workspace/desktop-app/package.json',
      remote: 'desktop-app/package.json',
      name: 'package.json (icon.png, resources path)'
    },
    {
      local: '/home/runner/workspace/desktop-app/resources/SiaeBridge/.gitkeep',
      remote: 'desktop-app/resources/SiaeBridge/.gitkeep',
      name: 'resources/.gitkeep'
    }
  ];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file.local);
      const base64Content = content.toString('base64');
      
      let sha: string | undefined;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: file.remote });
        if (!Array.isArray(data)) {
          sha = data.sha;
        }
      } catch (e) {
        // File doesn't exist
      }
      
      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: file.remote,
        message: `Fix build: ${file.name}`,
        content: base64Content,
        sha,
        branch: 'main'
      });
      
      console.log(`✅ ${file.name}`);
    } catch (e: any) {
      console.log(`❌ ${file.name}: ${e.message}`);
    }
    await sleep(400);
  }
  
  console.log('\n=== VERIFICA WORKFLOW ===');
  try {
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner, repo,
      per_page: 3
    });
    console.log(`\nUltime esecuzioni:`);
    runs.workflow_runs.forEach(run => {
      console.log(`  - ${run.name}: ${run.status} (${run.conclusion || 'in corso'})`);
    });
  } catch (e) {
    console.log('Impossibile verificare workflow');
  }
}

pushFixes().catch(console.error);
