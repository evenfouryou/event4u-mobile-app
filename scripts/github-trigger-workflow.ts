import { Octokit } from '@octokit/rest';

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

async function checkWorkflows() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // List workflows
  console.log('Checking workflows...');
  try {
    const { data: workflows } = await octokit.actions.listRepoWorkflows({ owner, repo });
    console.log('Workflows found:', workflows.total_count);
    workflows.workflows.forEach(w => console.log(`  - ${w.name} (${w.state})`));
    
    if (workflows.total_count > 0) {
      // Trigger the first workflow
      const workflow = workflows.workflows[0];
      console.log(`\nTriggering workflow: ${workflow.name}...`);
      
      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflow.id,
        ref: 'main'
      });
      
      console.log('✅ Workflow triggered!');
      console.log(`Check: https://github.com/${owner}/${repo}/actions`);
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

checkWorkflows().catch(console.error);
