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

async function checkWorkflows() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== ROOT WORKFLOW (.github/workflows/build.yml) ===\n');
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: '.github/workflows/build.yml' });
    if (!Array.isArray(data) && data.content) {
      console.log(Buffer.from(data.content, 'base64').toString());
    }
  } catch (e) {
    console.log('Non trovato');
  }
  
  console.log('\n=== ULTIMI RUN E ERRORI ===');
  const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 5 });
  for (const run of runs.workflow_runs) {
    console.log(`\n${run.name} - ${run.status}/${run.conclusion}`);
    if (run.conclusion === 'failure') {
      const { data: jobs } = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id: run.id });
      for (const job of jobs.jobs) {
        if (job.conclusion === 'failure') {
          console.log(`  Job fallito: ${job.name}`);
          for (const step of job.steps || []) {
            if (step.conclusion === 'failure') {
              console.log(`    Step fallito: ${step.name}`);
            }
          }
        }
      }
    }
  }
}

checkWorkflows().catch(console.error);
