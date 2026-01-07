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
  
  console.log('=== RIPRISTINO REPOSITORY (v3) ===\n');
  
  // Check branch protection
  console.log('Controllo protezione branch...');
  try {
    const { data: protection } = await octokit.repos.getBranchProtection({
      owner, repo,
      branch: 'main'
    });
    console.log('Branch protetto:', JSON.stringify(protection, null, 2));
  } catch (e: any) {
    if (e.status === 404) {
      console.log('✅ Branch NON protetto');
    } else {
      console.log('Errore check protezione:', e.message);
    }
  }
  
  // The commit 887299e was already created, try to push using force
  const commitSha = '887299ed7f8dd5bd5a96011dd029005abcb1ec8e';
  
  console.log(`\nProvo a forzare l'update del ref a ${commitSha.substring(0,7)}...`);
  
  try {
    // Try with force=true
    await octokit.git.updateRef({
      owner, repo,
      ref: 'heads/main',
      sha: commitSha,
      force: true
    });
    console.log('✅ Ref aggiornato con force!');
  } catch (e: any) {
    console.log(`❌ Errore force update: ${e.status} - ${e.message}`);
    
    // Try direct API call with proper path
    console.log('\nProvo chiamata API diretta...');
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sha: commitSha,
            force: true
          })
        }
      );
      
      if (response.ok) {
        console.log('✅ Push riuscito via fetch diretto!');
      } else {
        const data = await response.json();
        console.log(`❌ Errore: ${response.status}`, data);
      }
    } catch (e2: any) {
      console.log('❌ Anche fetch diretto fallito:', e2.message);
    }
  }
  
  // Verify current state
  console.log('\n=== VERIFICA FINALE ===');
  const { data: newContents } = await octokit.repos.getContent({ owner, repo, path: '' });
  console.log('Struttura root:');
  if (Array.isArray(newContents)) {
    newContents.forEach(f => console.log(`  ${f.type === 'dir' ? '📂' : '📄'} ${f.name}`));
  }
}

restoreRepo().catch(console.error);
