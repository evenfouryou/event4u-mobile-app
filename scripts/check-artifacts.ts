import { Octokit } from "@octokit/rest";

async function checkArtifacts() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  
  // Get latest successful run
  const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
    owner: "evenfouryou",
    repo: "event-four-you-siae-lettore",
    status: "success",
    per_page: 1
  });
  
  if (runs.workflow_runs.length === 0) {
    console.log("Nessun build completato trovato");
    return;
  }
  
  const runId = runs.workflow_runs[0].id;
  console.log(`Build: ${runs.workflow_runs[0].html_url}\n`);
  
  // Get artifacts
  const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
    owner: "evenfouryou",
    repo: "event-four-you-siae-lettore",
    run_id: runId
  });
  
  console.log("=== ARTIFACTS DISPONIBILI ===\n");
  
  for (const artifact of artifacts.artifacts) {
    console.log(`📦 ${artifact.name}`);
    console.log(`   Size: ${(artifact.size_in_bytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Expires: ${artifact.expires_at}`);
    console.log(`   Download: https://github.com/evenfouryou/event-four-you-siae-lettore/actions/runs/${runId}`);
    console.log("");
  }
}

checkArtifacts();
