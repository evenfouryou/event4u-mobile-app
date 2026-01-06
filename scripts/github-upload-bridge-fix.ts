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
    message: 'Fix S/MIME: include ALL headers in signed content (From/To/Subject/Date)',
    content: Buffer.from(content).toString('base64'),
    sha,
    branch: 'main'
  });
  console.log('✅ Program.cs uploaded');
  
  // Create release
  console.log('\nCreating release v1.0.2...');
  try {
    const { data: release } = await octokit.repos.createRelease({
      owner, repo,
      tag_name: 'v1.0.2',
      name: 'v1.0.2 - Fix SIAE Error 40605 (Header Fix)',
      body: `## Fix Critico per Errore SIAE 40605

### Causa Identificata
Confrontando con l'esempio SIAE ufficiale (prova.eml), abbiamo scoperto che:
- Il contenuto firmato DEVE includere TUTTI gli header (From, To, Subject, Date, MIME-Version)
- Gli header NON sono "esterni" ma parte integrante del contenuto firmato

### Modifiche
1. **Header nel contenuto firmato**: From, To, Subject, Date ora inclusi nel PKCS7
2. **Formato SIAE**: Usa \`application/x-pkcs7-mime\` con \`x-\` prefix
3. **Struttura MIME**: Conforme all'esempio prova.eml ufficiale
4. **Charset**: Windows-1252 come nell'esempio
5. **Debug**: Log delle prime 10 righe del MIME prima della firma

### Note Tecniche
- L'esempio SIAE mostra che il base64 decodificato contiene gli header completi
- Il formato corretto è S/MIME opaque con tutto il messaggio dentro il PKCS7
`,
      draft: false,
      prerelease: false,
      target_commitish: 'main'
    });
    console.log('✅ Release created:', release.html_url);
  } catch (e: any) {
    if (e.message.includes('already_exists')) {
      console.log('Release v1.0.2 already exists, creating v1.0.3...');
      const { data: release } = await octokit.repos.createRelease({
        owner, repo,
        tag_name: 'v1.0.3',
        name: 'v1.0.3 - Fix SIAE Error 40605 (Header Fix)',
        body: `## Fix Critico per Errore SIAE 40605 - Headers inclusi nel contenuto firmato`,
        draft: false,
        prerelease: false,
        target_commitish: 'main'
      });
      console.log('✅ Release created:', release.html_url);
    } else {
      console.log('Error:', e.message);
    }
  }
}

uploadFix().catch(console.error);
