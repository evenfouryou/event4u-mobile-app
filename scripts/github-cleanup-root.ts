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

async function cleanupRoot() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== PULIZIA DUPLICATI ROOT ===\n');
  
  // Files to delete from root (duplicates of desktop-app/SiaeBridge/)
  const filesToDelete = [
    'LibSiae.cs',
    'Program.cs', 
    'SiaeBridge.csproj'
  ];
  
  // Also need to delete prebuilt folder
  const foldersToDelete = ['prebuilt'];
  
  for (const file of filesToDelete) {
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner, repo,
        path: file
      });
      
      if (!Array.isArray(fileData)) {
        await octokit.repos.deleteFile({
          owner, repo,
          path: file,
          message: `Cleanup: remove duplicate ${file} from root`,
          sha: fileData.sha
        });
        console.log(`🗑️  Eliminato: ${file}`);
        await sleep(300);
      }
    } catch (e: any) {
      if (e.status !== 404) {
        console.log(`❌ Errore ${file}: ${e.message}`);
      }
    }
  }
  
  // Delete files in prebuilt folder
  for (const folder of foldersToDelete) {
    try {
      const { data: contents } = await octokit.repos.getContent({
        owner, repo,
        path: folder
      });
      
      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item.type === 'file') {
            await octokit.repos.deleteFile({
              owner, repo,
              path: item.path,
              message: `Cleanup: remove duplicate ${item.path}`,
              sha: item.sha
            });
            console.log(`🗑️  Eliminato: ${item.path}`);
            await sleep(300);
          }
        }
      }
    } catch (e: any) {
      if (e.status !== 404) {
        console.log(`❌ Errore ${folder}: ${e.message}`);
      }
    }
  }
  
  console.log('\n✅ Pulizia completata!');
  
  // Verify
  console.log('\n=== STRUTTURA FINALE ===');
  const { data: newContents } = await octokit.repos.getContent({ owner, repo, path: '' });
  if (Array.isArray(newContents)) {
    newContents.forEach(f => console.log(`  ${f.type === 'dir' ? '📂' : '📄'} ${f.name}`));
  }
}

cleanupRoot().catch(console.error);
