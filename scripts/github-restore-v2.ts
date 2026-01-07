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
  
  console.log('=== RIPRISTINO REPOSITORY ===\n');
  
  // Find the good commit
  const { data: commits } = await octokit.repos.listCommits({
    owner, repo,
    per_page: 30
  });
  
  const goodCommit = commits.find(c => c.commit.message.includes('Sync Program.cs v3.34'));
  if (!goodCommit) {
    console.log('❌ Commit buono non trovato!');
    return;
  }
  
  console.log(`Commit buono: ${goodCommit.sha.substring(0,7)}`);
  
  // Get the tree SHA from good commit
  const { data: goodCommitData } = await octokit.git.getCommit({
    owner, repo,
    commit_sha: goodCommit.sha
  });
  const goodTreeSha = goodCommitData.tree.sha;
  console.log(`Tree buono: ${goodTreeSha.substring(0,7)}`);
  
  // Read the v3.35 Program.cs
  const fs = await import('fs');
  const newProgramCs = fs.readFileSync('/home/runner/workspace/desktop-app/SiaeBridge/Program.cs', 'utf-8');
  
  // Create blob for new Program.cs
  const { data: newBlob } = await octokit.git.createBlob({
    owner, repo,
    content: Buffer.from(newProgramCs).toString('base64'),
    encoding: 'base64'
  });
  console.log(`Nuovo blob Program.cs: ${newBlob.sha.substring(0,7)}`);
  
  // Create tree based on good tree, but override Program.cs
  const { data: newTree } = await octokit.git.createTree({
    owner, repo,
    base_tree: goodTreeSha,
    tree: [
      {
        path: 'desktop-app/SiaeBridge/Program.cs',
        mode: '100644',
        type: 'blob',
        sha: newBlob.sha
      }
    ]
  });
  console.log(`Nuovo tree: ${newTree.sha.substring(0,7)}`);
  
  // Get current HEAD
  const { data: ref } = await octokit.git.getRef({
    owner, repo,
    ref: 'heads/main'
  });
  const currentSha = ref.object.sha;
  
  // Create commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo,
    message: 'Restore full repository structure + v3.35 S/MIME SIAE fix',
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
  
  console.log('\n✅ FATTO!\n');
  
  // Verify
  const { data: newContents } = await octokit.repos.getContent({ owner, repo, path: '' });
  console.log('Nuova struttura root:');
  if (Array.isArray(newContents)) {
    newContents.forEach(f => console.log(`  ${f.type === 'dir' ? '📂' : '📄'} ${f.name}`));
  }
}

restoreRepo().catch(console.error);
