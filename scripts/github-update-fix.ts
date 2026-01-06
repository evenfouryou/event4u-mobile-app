import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

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

async function updateFile() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Update Program.cs with the fix info in comments
  // Read local Program.cs to check for S/MIME opaque format
  const programCsPath = '/home/runner/workspace/desktop-app/SiaeBridge/Program.cs';
  const localContent = fs.readFileSync(programCsPath, 'utf8');
  
  // Check existing file on GitHub
  console.log('Checking SiaeBridge/Program.cs on GitHub...');
  try {
    const { data } = await octokit.repos.getContent({
      owner, repo,
      path: 'SiaeBridge/Program.cs'
    }) as { data: { sha: string, content: string } };
    
    const currentContent = Buffer.from(data.content, 'base64').toString('utf8');
    console.log('GitHub file size:', currentContent.length);
    console.log('Local file size:', localContent.length);
    
    if (currentContent === localContent) {
      console.log('Files are identical, no update needed');
    } else {
      console.log('Files differ, updating...');
      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: 'SiaeBridge/Program.cs',
        message: 'Fix S/MIME: ensure opaque format (application/pkcs7-mime)',
        content: Buffer.from(localContent).toString('base64'),
        sha: data.sha,
        branch: 'main'
      });
      console.log('✅ Program.cs updated');
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  
  // Create a new release
  console.log('\nCreating new release v1.0.1...');
  try {
    const { data: release } = await octokit.repos.createRelease({
      owner, repo,
      tag_name: 'v1.0.1',
      name: 'v1.0.1 - Fix SIAE Error 40605',
      body: `## Fix SIAE Error 40605

### Problema Risolto
- Il server normalizzava i line endings del messaggio S/MIME **dopo** la firma
- Questo corrompeva il contenuto firmato causando errore 40605 "riepilogo illegibile"

### Modifiche
- Rimossa normalizzazione CRLF post-firma in email-service.ts
- Buffer encoding cambiato da 'utf8' a 'binary' per preservare dati
- Aggiunto warning per line endings misti

### Note
- Il bridge deve inviare il messaggio già con CRLF corretti
- Il server ora passa il messaggio firmato senza modifiche
`,
      draft: false,
      prerelease: false,
      target_commitish: 'main'
    });
    console.log('✅ Release created:', release.html_url);
  } catch (e: any) {
    if (e.message.includes('already_exists')) {
      console.log('Release v1.0.1 already exists');
    } else {
      console.log('Release error:', e.message);
    }
  }
}

updateFile().catch(console.error);
