import { Octokit } from "@octokit/rest";

async function checkBuild() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN not set");
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  
  try {
    // Get workflow runs
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 5
    });
    
    if (runs.workflow_runs.length === 0) {
      console.log("Nessun build trovato ancora. Aspetta qualche secondo...");
      return;
    }
    
    const latestRun = runs.workflow_runs[0];
    console.log("=== STATO BUILD ===");
    console.log(`Workflow: ${latestRun.name}`);
    console.log(`Status: ${latestRun.status}`);
    console.log(`Conclusion: ${latestRun.conclusion || 'in corso...'}`);
    console.log(`Started: ${latestRun.created_at}`);
    console.log(`URL: ${latestRun.html_url}`);
    
    if (latestRun.conclusion === 'success') {
      console.log("");
      console.log("✅ BUILD COMPLETATO!");
      console.log("");
      console.log("Scarica da: https://github.com/evenfouryou/event-four-you-siae-lettore/releases");
    } else if (latestRun.conclusion === 'failure') {
      console.log("");
      console.log("❌ BUILD FALLITO - controlla i log su GitHub");
    } else {
      console.log("");
      console.log("⏳ Build in corso... ricontrolla tra qualche secondo");
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

checkBuild();
