import { Octokit } from "@octokit/rest";

async function fixWorkflow() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  const filePath = ".github/workflows/build.yml";
  
  const workflowContent = `name: Build SiaeBridge

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Setup .NET 8.0
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '8.0.x'
        
    - name: Restore dependencies
      run: dotnet restore desktop-app/SiaeBridge/SiaeBridge.csproj
      
    - name: Publish
      run: dotnet publish desktop-app/SiaeBridge/SiaeBridge.csproj -c Release -r win-x86 --self-contained -o ./publish
      
    - name: Create ZIP
      shell: pwsh
      run: |
        Compress-Archive -Path ./publish/* -DestinationPath ./SiaeBridge-v3.34.zip
        
    - name: Upload artifact
      uses: actions/upload-artifact@v4
      with:
        name: SiaeBridge-v3.34
        path: ./SiaeBridge-v3.34.zip
        
    - name: Create Release
      uses: softprops/action-gh-release@v1
      with:
        tag_name: v3.34
        name: SiaeBridge v3.34 - Fix SIAE Filename
        body: |
          ## SiaeBridge v3.34
          
          **FIX CRITICO**: Il nome file allegato ora è corretto.
          
          Prima: \`C_UsersPcAppDataLocalTempRCA_..._timestamp.p7m\`
          Dopo: \`RCA_2026_01_04_EVENT4U1_001_XSI_V.01.00.p7m\`
          
          ### Installazione
          1. Estrai lo ZIP
          2. Sostituisci SiaeBridge.exe
          3. Riavvia l'app
        files: ./SiaeBridge-v3.34.zip
        draft: false
        prerelease: false
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;

  try {
    // Get current file SHA
    const { data: currentFile } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
    });
    
    const sha = (currentFile as any).sha;
    const base64Content = Buffer.from(workflowContent).toString("base64");
    
    const { data: result } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: "Fix workflow path: desktop-app/SiaeBridge/",
      content: base64Content,
      sha: sha,
      branch: "main"
    });
    
    console.log("✅ Workflow corretto!");
    console.log("Commit:", result.commit.html_url);
    console.log("");
    console.log("Il build ripartirà automaticamente...");
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

fixWorkflow();
