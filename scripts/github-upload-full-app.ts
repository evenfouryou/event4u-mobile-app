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

async function uploadFile(octokit: Octokit, owner: string, repo: string, path: string, localPath: string, message: string) {
  const content = fs.readFileSync(localPath);
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path }) as any;
    sha = data.sha;
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path, message,
    content: content.toString('base64'),
    sha,
    branch: 'main'
  });
  console.log(`✅ ${path} uploaded`);
}

async function upload() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('Uploading complete SIAE Lettore app...\n');
  
  // Upload DLLs
  await uploadFile(octokit, owner, repo, 
    'SiaeBridge/prebuilt/libSIAE.dll',
    '/home/runner/workspace/desktop-app/SiaeBridge/prebuilt/libSIAE.dll',
    'Add libSIAE.dll for smart card operations'
  );
  
  await uploadFile(octokit, owner, repo,
    'SiaeBridge/prebuilt/libSIAEp7.dll', 
    '/home/runner/workspace/desktop-app/SiaeBridge/prebuilt/libSIAEp7.dll',
    'Add libSIAEp7.dll for PKCS7/SMIME signatures'
  );
  
  // Upload csproj
  await uploadFile(octokit, owner, repo,
    'SiaeBridge/SiaeBridge.csproj',
    '/home/runner/workspace/desktop-app/SiaeBridge/SiaeBridge.csproj',
    'Add project file'
  );
  
  // Upload Program.cs
  await uploadFile(octokit, owner, repo,
    'SiaeBridge/Program.cs',
    '/home/runner/workspace/desktop-app/SiaeBridge/Program.cs',
    'v3.21 - SMIMESignML nativo SIAE'
  );
  
  console.log('\n✅ All files uploaded!');
  console.log('\n⚠️  Ora devi creare manualmente .github/workflows/build.yml su GitHub');
}

upload().catch(console.error);
