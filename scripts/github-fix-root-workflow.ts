import { Octokit } from '@octokit/rest';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  const connectionSettings = await fetch(
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

async function fixWorkflow() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== FIX ROOT WORKFLOW ===\n');
  
  const newWorkflow = `name: Build SiaeBridge

on:
  push:
    branches: [ main ]
    paths:
      - 'desktop-app/SiaeBridge/**'
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '8.0.x'
    
    - name: Restore dependencies
      run: dotnet restore desktop-app/SiaeBridge/SiaeBridge.csproj
    
    - name: Build
      run: dotnet publish desktop-app/SiaeBridge/SiaeBridge.csproj -c Release -r win-x86 --self-contained -o ./publish
    
    - name: Copy SIAE DLLs
      run: |
        copy desktop-app\\SiaeBridge\\prebuilt\\libSIAE.dll publish\\
        copy desktop-app\\SiaeBridge\\prebuilt\\libSIAEp7.dll publish\\
    
    - name: Upload artifact
      uses: actions/upload-artifact@v4
      with:
        name: SiaeBridge-win-x86
        path: ./publish/
`;

  // Get current file SHA
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: '.github/workflows/build.yml' });
    if (!Array.isArray(data)) {
      sha = data.sha;
    }
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: '.github/workflows/build.yml',
    message: 'Fix: use win-x86 runtime for SiaeBridge',
    content: Buffer.from(newWorkflow).toString('base64'),
    sha,
    branch: 'main'
  });
  
  console.log('✅ Workflow aggiornato con win-x86');
  
  // Trigger new run
  console.log('\nTriggering new workflow run...');
  try {
    await octokit.actions.createWorkflowDispatch({
      owner, repo,
      workflow_id: 'build.yml',
      ref: 'main'
    });
    console.log('✅ Workflow avviato');
  } catch (e: any) {
    console.log(`⚠️ Avvio manuale fallito: ${e.message}`);
  }
}

fixWorkflow().catch(console.error);
