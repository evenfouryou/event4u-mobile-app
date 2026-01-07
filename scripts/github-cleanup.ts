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

async function cleanup() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Remove duplicate libSIAEp7.dll from root (keep in prebuilt)
  console.log('Rimuovo libSIAEp7.dll duplicato dalla root...');
  
  try {
    // Get file SHA
    const { data: file } = await octokit.repos.getContent({
      owner, repo,
      path: 'libSIAEp7.dll'
    }) as { data: { sha: string } };
    
    // Delete file
    await octokit.repos.deleteFile({
      owner, repo,
      path: 'libSIAEp7.dll',
      message: 'Cleanup: remove duplicate libSIAEp7.dll (kept in prebuilt/)',
      sha: file.sha,
      branch: 'main'
    });
    
    console.log('✅ libSIAEp7.dll rimosso dalla root');
  } catch (e: any) {
    console.log('Errore:', e.message);
  }
}

cleanup().catch(console.error);
