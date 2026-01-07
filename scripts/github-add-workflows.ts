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

async function addWorkflows() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== AGGIUNTA GITHUB ACTIONS WORKFLOWS ===\n');
  
  const buildWorkflow = `name: Build SiaeBridge

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
      run: dotnet build desktop-app/SiaeBridge/SiaeBridge.csproj --configuration Release --no-restore
    
    - name: Publish
      run: dotnet publish desktop-app/SiaeBridge/SiaeBridge.csproj -c Release -r win-x64 --self-contained -o ./publish
    
    - name: Upload artifact
      uses: actions/upload-artifact@v4
      with:
        name: SiaeBridge-win-x64
        path: ./publish/
`;

  const releaseWorkflow = `name: Release Electron App

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-electron:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '8.0.x'
    
    - name: Build SiaeBridge
      run: |
        cd desktop-app/SiaeBridge
        dotnet publish -c Release -r win-x64 --self-contained -o ../resources/SiaeBridge
    
    - name: Install dependencies
      run: |
        cd desktop-app
        npm install
    
    - name: Build Electron app
      run: |
        cd desktop-app
        npm run build
      env:
        GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
    
    - name: Upload Release
      uses: actions/upload-artifact@v4
      with:
        name: Event4U-SIAE-Lettore-Setup
        path: desktop-app/dist/*.exe
`;

  const workflows = [
    { path: '.github/workflows/build.yml', content: buildWorkflow, name: 'build.yml' },
    { path: '.github/workflows/release.yml', content: releaseWorkflow, name: 'release.yml' }
  ];
  
  for (const wf of workflows) {
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: wf.path,
        message: `Add GitHub Actions workflow: ${wf.name}`,
        content: Buffer.from(wf.content).toString('base64'),
        branch: 'main'
      });
      console.log(`✅ Creato: ${wf.path}`);
    } catch (e: any) {
      console.log(`❌ Errore ${wf.path}: ${e.status} - ${e.message}`);
      if (e.response?.data) {
        console.log('Dettagli:', JSON.stringify(e.response.data, null, 2));
      }
    }
  }
  
  console.log('\n=== VERIFICA ===');
  try {
    const { data: workflows } = await octokit.actions.listRepoWorkflows({ owner, repo });
    console.log(`Workflows trovati: ${workflows.total_count}`);
    workflows.workflows.forEach(w => console.log(`  - ${w.name}: ${w.state}`));
  } catch (e: any) {
    console.log('Workflows non ancora disponibili (potrebbero essere in elaborazione)');
  }
}

addWorkflows().catch(console.error);
