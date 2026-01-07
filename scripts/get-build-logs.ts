import { Octokit } from "@octokit/rest";

async function getLogs() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN not set");
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  
  try {
    // Get latest run
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 1
    });
    
    if (runs.workflow_runs.length === 0) {
      console.log("No runs found");
      return;
    }
    
    const runId = runs.workflow_runs[0].id;
    
    // Get jobs for this run
    const { data: jobs } = await octokit.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId
    });
    
    for (const job of jobs.jobs) {
      console.log(`=== Job: ${job.name} ===`);
      console.log(`Status: ${job.status}, Conclusion: ${job.conclusion}`);
      
      for (const step of job.steps || []) {
        const icon = step.conclusion === 'success' ? '✅' : 
                     step.conclusion === 'failure' ? '❌' : '⏳';
        console.log(`  ${icon} ${step.name}: ${step.conclusion || step.status}`);
      }
    }
    
    // Try to get logs
    try {
      const { data: logs } = await octokit.actions.downloadJobLogsForWorkflowRun({
        owner,
        repo,
        job_id: jobs.jobs[0].id
      });
      
      // Get last 100 lines
      const logLines = (logs as string).split('\n');
      const lastLines = logLines.slice(-100);
      console.log("\n=== ULTIMI LOG ===");
      console.log(lastLines.join('\n'));
    } catch (e) {
      console.log("\nNon posso scaricare i log dettagliati. Controlla su GitHub.");
    }
    
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

getLogs();
