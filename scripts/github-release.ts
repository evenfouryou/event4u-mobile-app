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

async function checkAndCreateRelease() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Check existing releases
  console.log('Checking existing releases...');
  const { data: releases } = await octokit.repos.listReleases({ owner, repo });
  
  if (releases.length > 0) {
    console.log('Existing releases:');
    releases.forEach(r => console.log(`  - ${r.tag_name}: ${r.name}`));
  } else {
    console.log('No existing releases found.');
  }
  
  // Check existing tags
  console.log('\nChecking existing tags...');
  const { data: tags } = await octokit.repos.listTags({ owner, repo });
  
  if (tags.length > 0) {
    console.log('Existing tags:');
    tags.forEach(t => console.log(`  - ${t.name}`));
  } else {
    console.log('No existing tags found.');
  }
  
  // Get latest commit
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
  console.log('\nLatest commit:', ref.object.sha);
  
  // Create new release v1.0.0
  console.log('\nCreating release v1.0.0...');
  
  const { data: release } = await octokit.repos.createRelease({
    owner,
    repo,
    tag_name: 'v1.0.0',
    name: 'v1.0.0 - S/MIME OPAQUE Support',
    body: `## Event4U SIAE Bridge v1.0.0

### Novità
- ✅ Supporto S/MIME OPAQUE (application/pkcs7-mime) per conformità SIAE
- ✅ Debug logging delle prime 25 righe del messaggio S/MIME
- ✅ Validazione CRLF migliorata
- ✅ Normalizzazione automatica line endings

### Fix
- Risolto errore 40605 "messaggio corrotto" nelle trasmissioni RCA
- Eliminati problemi di boundary sync con multipart/signed

### Note Tecniche
- Il bridge ora produce S/MIME opaque invece di multipart/signed
- Il contenuto firmato è incapsulato dentro il PKCS7
- Nessun rischio di corruzione CRLF/boundary

### Requisiti
- Windows 10/11
- .NET 6.0 o superiore
- Smart Card SIAE con lettore compatibile
`,
    draft: false,
    prerelease: false,
    target_commitish: 'main'
  });
  
  console.log('✅ Release created:', release.html_url);
}

checkAndCreateRelease().catch(console.error);
