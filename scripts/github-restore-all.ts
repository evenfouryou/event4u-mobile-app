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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function restoreRepo() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== RIPRISTINO COMPLETO REPOSITORY ===\n');
  
  // Get list of files from good commit
  const goodCommitSha = 'b133bb9b895325f5b347c235d1ee95c88531ccf1';
  
  const { data: goodCommitData } = await octokit.git.getCommit({
    owner, repo,
    commit_sha: goodCommitSha
  });
  
  const { data: fullTree } = await octokit.git.getTree({
    owner, repo,
    tree_sha: goodCommitData.tree.sha,
    recursive: 'true'
  });
  
  // Get current files
  const { data: currentContents } = await octokit.repos.getContent({ owner, repo, path: '' });
  const currentFiles = new Set<string>();
  if (Array.isArray(currentContents)) {
    for (const item of currentContents) {
      if (item.type === 'file') {
        currentFiles.add(item.name);
      }
    }
  }
  currentFiles.add('LibSiae.cs');
  currentFiles.add('Program.cs');
  currentFiles.add('SiaeBridge.csproj');
  
  // Filter files that need to be restored (only blobs, not trees)
  const filesToRestore = fullTree.tree.filter(f => 
    f.type === 'blob' && 
    !currentFiles.has(f.path!) &&
    !f.path!.startsWith('SiaeBridge/') // Skip old SiaeBridge folder
  );
  
  console.log(`Files da ripristinare: ${filesToRestore.length}`);
  console.log('');
  
  // Read local Program.cs for updating
  const fs = await import('fs');
  const localProgramCs = fs.readFileSync('/home/runner/workspace/desktop-app/SiaeBridge/Program.cs', 'utf-8');
  
  let restored = 0;
  let errors = 0;
  
  for (const file of filesToRestore) {
    const path = file.path!;
    
    // Skip certain files
    if (path.includes('.github/')) {
      console.log(`⏭️  Skipping workflow: ${path}`);
      continue;
    }
    
    try {
      // Get file content from old commit
      let content: string;
      
      if (path === 'desktop-app/SiaeBridge/Program.cs') {
        // Use local v3.35 version
        content = localProgramCs;
        console.log(`📝 ${path} (v3.35 locale)`);
      } else {
        // Fetch from old commit
        const { data: blobData } = await octokit.git.getBlob({
          owner, repo,
          file_sha: file.sha!
        });
        
        if (blobData.encoding === 'base64') {
          content = Buffer.from(blobData.content, 'base64').toString('utf-8');
        } else {
          content = blobData.content;
        }
        console.log(`📄 ${path}`);
      }
      
      // Create file
      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: path,
        message: `Restore ${path}`,
        content: Buffer.from(content).toString('base64'),
        branch: 'main'
      });
      
      restored++;
      
      // Rate limiting
      await sleep(300);
      
    } catch (e: any) {
      console.log(`❌ Errore ${path}: ${e.message}`);
      errors++;
    }
  }
  
  console.log(`\n✅ Ripristinati: ${restored}`);
  console.log(`❌ Errori: ${errors}`);
  
  // Verify
  console.log('\n=== VERIFICA FINALE ===');
  const { data: newContents } = await octokit.repos.getContent({ owner, repo, path: '' });
  console.log('Struttura root:');
  if (Array.isArray(newContents)) {
    newContents.forEach(f => console.log(`  ${f.type === 'dir' ? '📂' : '📄'} ${f.name}`));
  }
}

restoreRepo().catch(console.error);
