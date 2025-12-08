import { Octokit } from '@octokit/rest';

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

async function main() {
  const octokit = new Octokit({ auth: await getAccessToken() });
  
  const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
    owner: 'evenfouryou',
    repo: 'event-four-you-siae-lettore',
    per_page: 5
  });
  
  console.log('🔄 Stato Workflow (aggiornato):');
  console.log('');
  for (const run of runs.workflow_runs) {
    const status = run.conclusion || run.status;
    const icon = status === 'success' ? '✅' : 
                 status === 'failure' ? '❌' : 
                 status === 'queued' ? '📋' : 
                 status === 'in_progress' ? '🔄' : '⏳';
    console.log(`${icon} ${run.name}`);
    console.log(`   Status: ${status}`);
    console.log(`   Commit: ${run.head_sha.slice(0,7)} - ${run.head_commit?.message?.split('\n')[0] || ''}`);
    console.log(`   Started: ${new Date(run.created_at).toLocaleString()}`);
    console.log(`   URL: ${run.html_url}`);
    console.log('');
  }
}

main().catch(console.error);
