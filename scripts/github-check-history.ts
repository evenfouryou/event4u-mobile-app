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

async function checkHistory() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Check commits from a few days ago to see the structure
  console.log('=== ULTIMI 20 COMMIT ===\n');
  
  const { data: commits } = await octokit.repos.listCommits({ 
    owner, repo, 
    per_page: 20 
  });
  
  for (const commit of commits) {
    const date = new Date(commit.commit.author?.date || '').toLocaleString('it-IT');
    const msg = commit.commit.message.split('\n')[0].substring(0, 60);
    console.log(`${commit.sha.substring(0, 7)} | ${date} | ${msg}`);
  }
  
  // Get the tree from an older commit to see what folders existed
  console.log('\n=== CONFRONTO STRUTTURA ===\n');
  
  // Current structure
  console.log('STRUTTURA ATTUALE:');
  const { data: currentContents } = await octokit.repos.getContent({ owner, repo, path: '' });
  if (Array.isArray(currentContents)) {
    currentContents.forEach(f => console.log(`  ${f.type === 'dir' ? '📂' : '📄'} ${f.name}`));
  }
  
  // Check an older commit (before my changes)
  // Find commit before "Cleanup: remove obsolete"
  const olderCommit = commits.find(c => 
    c.commit.message.includes('Add GitHub Actions workflow') || 
    c.commit.message.includes('v3.34') ||
    c.commit.message.includes('v3.33')
  );
  
  if (olderCommit) {
    console.log(`\nSTRUTTURA AL COMMIT ${olderCommit.sha.substring(0,7)} (${olderCommit.commit.message.split('\n')[0].substring(0,40)}):`);
    try {
      const { data: tree } = await octokit.git.getTree({
        owner, repo,
        tree_sha: olderCommit.sha,
        recursive: 'false'
      });
      tree.tree.forEach(f => {
        if (f.type === 'tree') console.log(`  📂 ${f.path}`);
        else console.log(`  📄 ${f.path}`);
      });
    } catch (e) {
      console.log('  (errore nel recupero)');
    }
  }
  
  // Check commit from Jan 6
  console.log('\n=== CERCANDO STRUTTURA PRECEDENTE (2 Gennaio) ===');
  const { data: olderCommits } = await octokit.repos.listCommits({ 
    owner, repo, 
    per_page: 5,
    until: '2026-01-03T00:00:00Z'
  });
  
  if (olderCommits.length > 0) {
    const jan2Commit = olderCommits[0];
    console.log(`Commit del 2 Gennaio: ${jan2Commit.sha.substring(0,7)}`);
    
    try {
      const { data: tree } = await octokit.git.getTree({
        owner, repo,
        tree_sha: jan2Commit.sha
      });
      console.log('Struttura:');
      tree.tree.forEach(f => {
        if (f.type === 'tree') console.log(`  📂 ${f.path}`);
        else console.log(`  📄 ${f.path}`);
      });
    } catch (e: any) {
      console.log('Errore:', e.message);
    }
  }
}

checkHistory().catch(console.error);
