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

async function restoreRepo() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // First, find the full SHA of the good commit
  console.log('Cerco il commit con la struttura completa...');
  
  const { data: commits } = await octokit.repos.listCommits({
    owner, repo,
    per_page: 30
  });
  
  // Find the commit "Sync Program.cs v3.34"
  const goodCommit = commits.find(c => c.commit.message.includes('Sync Program.cs v3.34'));
  
  if (!goodCommit) {
    console.log('Commit non trovato! Cerco più indietro...');
    // Look for any older commit with desktop-app
    for (const commit of commits.slice(0, 10)) {
      console.log(`Controllando ${commit.sha.substring(0,7)}: ${commit.commit.message.substring(0,50)}`);
    }
    return;
  }
  
  const goodCommitSha = goodCommit.sha;
  console.log(`Trovato commit buono: ${goodCommitSha}`);
  
  // Get the tree from the good commit
  const { data: commitData } = await octokit.git.getCommit({
    owner, repo,
    commit_sha: goodCommitSha
  });
  
  const goodTreeSha = commitData.tree.sha;
  console.log(`Tree SHA del commit buono: ${goodTreeSha}`);
  
  // Get current HEAD
  const { data: ref } = await octokit.git.getRef({
    owner, repo,
    ref: 'heads/main'
  });
  const currentSha = ref.object.sha;
  console.log(`HEAD attuale: ${currentSha}`);
  
  // Get the full tree recursively
  const { data: fullTree } = await octokit.git.getTree({
    owner, repo,
    tree_sha: goodTreeSha,
    recursive: 'true'
  });
  
  console.log(`Files nel tree originale: ${fullTree.tree.length}`);
  
  // Read the v3.35 Program.cs from local
  const fs = await import('fs');
  const newProgramCs = fs.readFileSync('/home/runner/workspace/desktop-app/SiaeBridge/Program.cs', 'utf-8');
  
  // Create a new blob for the updated Program.cs
  const { data: newBlob } = await octokit.git.createBlob({
    owner, repo,
    content: Buffer.from(newProgramCs).toString('base64'),
    encoding: 'base64'
  });
  console.log(`Creato nuovo blob per Program.cs v3.35: ${newBlob.sha.substring(0,7)}`);
  
  // Create new tree with the updated Program.cs
  const treeItems = fullTree.tree
    .filter(f => f.type === 'blob' && f.path !== 'desktop-app/SiaeBridge/Program.cs')
    .map(f => ({
      path: f.path!,
      mode: f.mode as "100644",
      type: 'blob' as const,
      sha: f.sha!
    }));
  
  // Add the new Program.cs
  treeItems.push({
    path: 'desktop-app/SiaeBridge/Program.cs',
    mode: '100644' as const,
    type: 'blob' as const,
    sha: newBlob.sha
  });
  
  console.log(`Creando nuovo tree con ${treeItems.length} files...`);
  
  const { data: newTree } = await octokit.git.createTree({
    owner, repo,
    tree: treeItems
  });
  console.log(`Nuovo tree creato: ${newTree.sha.substring(0,7)}`);
  
  // Create commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo,
    message: 'Restore full repository structure + v3.35 fix for SIAE 40605',
    tree: newTree.sha,
    parents: [currentSha]
  });
  console.log(`Nuovo commit: ${newCommit.sha.substring(0,7)}`);
  
  // Update ref
  await octokit.git.updateRef({
    owner, repo,
    ref: 'heads/main',
    sha: newCommit.sha
  });
  
  console.log('\n✅ Repository ripristinato con struttura completa + fix v3.35!');
  
  // Verify
  const { data: newContents } = await octokit.repos.getContent({ owner, repo, path: '' });
  console.log('\nNuova struttura root:');
  if (Array.isArray(newContents)) {
    newContents.forEach(f => console.log(`  ${f.type === 'dir' ? '📂' : '📄'} ${f.name}`));
  }
}

restoreRepo().catch(console.error);
