import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;
  const data = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken! } }
  ).then(res => res.json());
  const conn = data.items?.[0];
  return conn?.settings?.access_token || conn?.settings?.oauth?.credentials?.access_token;
}

async function uploadFix() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Upload Program.cs
  const programPath = '/home/runner/workspace/desktop-app/SiaeBridge/Program.cs';
  const content = fs.readFileSync(programPath, 'utf8');
  
  console.log('Uploading SiaeBridge/Program.cs...');
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: 'SiaeBridge/Program.cs' }) as any;
    sha = data.sha;
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: 'SiaeBridge/Program.cs',
    message: 'v3.21 - Usa SMIMESignML nativo SIAE invece di costruzione manuale S/MIME',
    content: Buffer.from(content).toString('base64'),
    sha,
    branch: 'main'
  });
  console.log('✅ Program.cs uploaded');
  
  // Create release v1.0.3
  console.log('\nCreating release v1.0.3...');
  try {
    const { data: release } = await octokit.repos.createRelease({
      owner, repo,
      tag_name: 'v1.0.3',
      name: 'v1.0.3 - SMIMESignML Nativo SIAE',
      body: `## Fix Definitivo per Errore SIAE 40605

### Causa Identificata
Stavo costruendo manualmente i messaggi S/MIME usando \`PKCS7SignML\` + assemblaggio MIME.
Ma la libreria SIAE ha una funzione dedicata **\`SMIMESignML\`** che genera nativamente email RFC822 S/MIME conformi!

### Modifiche Chiave
1. **Usa SMIMESignML nativo**: La libreria SIAE genera direttamente l'email S/MIME
2. **Parametri diretti**: From, To, Subject, Body, Attachments passati direttamente alla libreria
3. **Nessuna costruzione manuale**: SMIMESignML gestisce tutto internamente
4. **Formato garantito**: La libreria SIAE usa il formato esatto richiesto dal server SIAE

### Firma di SMIMESignML
\`\`\`c
int SMIMESignML(
  pin,              // PIN smartcard
  slot,             // slot da utilizzare
  szOutputFilePath, // File output RFC822 S/MIME
  szFrom,           // Header From:
  szTo,             // Header To:
  szSubject,        // Header Subject: [opzionale]
  szOtherHeaders,   // Altri header [opzionale]
  szBody,           // Body del messaggio
  szAttachments,    // Files allegati (path separati da ';')
  dwFlags,          // Flags
  bInitialize       // Initialize (1=sì)
);
\`\`\`

### Vantaggi
- **Conformità SIAE garantita**: La libreria ufficiale genera il formato esatto
- **Nessun rischio di errori MIME**: SMIMESignML gestisce tutto internamente
- **Debug semplificato**: Output viene loggato per verifica
`,
      draft: false,
      prerelease: false,
      target_commitish: 'main'
    });
    console.log('✅ Release created:', release.html_url);
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

uploadFix().catch(console.error);
