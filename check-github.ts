import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const { data: user } = await octokit.users.getAuthenticated();
  console.log('GitHub User:', user.login);
  
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 20
  });
  
  console.log('\n=== Repos ===');
  for (const repo of repos) {
    const name = repo.name.toLowerCase();
    if (name.includes('siae') || name.includes('event') || name.includes('lettore')) {
      console.log(`\n📁 ${repo.full_name}`);
      console.log(`   URL: ${repo.html_url}`);
      
      try {
        const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
          owner: repo.owner.login,
          repo: repo.name,
          per_page: 5
        });
        if (runs.workflow_runs.length > 0) {
          console.log('   🔄 Workflow runs:');
          for (const run of runs.workflow_runs) {
            const status = run.conclusion || run.status;
            const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳';
            console.log(`      ${icon} ${run.name}: ${status} - ${new Date(run.created_at).toLocaleString()}`);
          }
        } else {
          console.log('   ⚠️ Nessun workflow eseguito');
        }
      } catch (e: any) {
        console.log('   ⚠️ Nessun workflow configurato');
      }
    }
  }
}

main().catch(console.error);

// Check latest commit on GitHub vs local
async function checkLatestCommit() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const { data: commits } = await octokit.repos.listCommits({
    owner: 'evenfouryou',
    repo: 'event-four-you-siae-lettore',
    per_page: 3
  });
  
  console.log('\n=== Ultimi commit su GitHub ===');
  for (const commit of commits) {
    console.log(`- ${commit.sha.slice(0,7)}: ${commit.commit.message.split('\n')[0]}`);
    console.log(`  Data: ${new Date(commit.commit.author?.date || '').toLocaleString()}`);
  }
  
  // Check if PIN fix is in the commits
  const hasFixCommit = commits.some(c => 
    c.commit.message.toLowerCase().includes('pin') || 
    c.commit.message.toLowerCase().includes('npin') ||
    c.commit.message.toLowerCase().includes('verify')
  );
  
  if (!hasFixCommit) {
    console.log('\n⚠️ La correzione PIN NON è ancora su GitHub!');
    console.log('   Devi fare push delle modifiche.');
  }
}

checkLatestCommit().catch(console.error);
