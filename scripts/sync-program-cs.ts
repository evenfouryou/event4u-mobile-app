import { Octokit } from "@octokit/rest";

async function syncFiles() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  
  try {
    // Get correct v3.34 file from SiaeBridge/Program.cs
    const { data: sourceFile } = await octokit.repos.getContent({
      owner, repo,
      path: "SiaeBridge/Program.cs"
    });
    
    const v334Content = Buffer.from((sourceFile as any).content, 'base64').toString('utf8');
    console.log("✅ Letto file sorgente v3.34 da SiaeBridge/Program.cs");
    
    // Get SHA of target file
    const { data: targetFile } = await octokit.repos.getContent({
      owner, repo,
      path: "desktop-app/SiaeBridge/Program.cs"
    });
    
    const targetSha = (targetFile as any).sha;
    console.log(`✅ SHA target: ${targetSha}`);
    
    // Update desktop-app/SiaeBridge/Program.cs with v3.34 content
    const { data: result } = await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: "desktop-app/SiaeBridge/Program.cs",
      message: "Sync Program.cs v3.34 fix to desktop-app folder",
      content: Buffer.from(v334Content).toString('base64'),
      sha: targetSha,
      branch: "main"
    });
    
    console.log("✅ File sincronizzato!");
    console.log("Commit:", result.commit.html_url);
    console.log("");
    console.log("Il workflow GitHub ripartirà automaticamente...");
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

syncFiles();
