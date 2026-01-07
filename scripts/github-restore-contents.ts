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
  
  console.log('=== TEST PERMESSI SCRITTURA ===\n');
  
  // Check user info and permissions
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Utente: ${user.login}`);
  
  // Check repo access
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  console.log(`Repo: ${repoData.full_name}`);
  console.log(`Permessi:`);
  console.log(`  - admin: ${repoData.permissions?.admin}`);
  console.log(`  - push: ${repoData.permissions?.push}`);
  console.log(`  - pull: ${repoData.permissions?.pull}`);
  
  // Try to create a simple test file
  console.log('\nProvo a creare un file di test...');
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: 'test-write-access.txt',
      message: 'Test write access',
      content: Buffer.from('test').toString('base64'),
      branch: 'main'
    });
    console.log('✅ Scrittura riuscita!');
    
    // Delete the test file
    const { data: file } = await octokit.repos.getContent({ owner, repo, path: 'test-write-access.txt' });
    if (!Array.isArray(file)) {
      await octokit.repos.deleteFile({
        owner, repo,
        path: 'test-write-access.txt',
        message: 'Remove test file',
        sha: file.sha
      });
      console.log('✅ File di test eliminato');
    }
  } catch (e: any) {
    console.log(`❌ Errore scrittura: ${e.status} - ${e.message}`);
    console.log('Dettagli:', JSON.stringify(e.response?.data, null, 2));
  }
}

restoreRepo().catch(console.error);
