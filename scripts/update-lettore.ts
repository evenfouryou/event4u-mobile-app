import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";

async function updateFile() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN not set");
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  const filePath = "SiaeBridge/Program.cs";
  
  try {
    // Get current file SHA
    const { data: currentFile } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
    });
    
    console.log("Current file SHA:", (currentFile as any).sha);
    
    // Read local v3.34 file
    const localPath = path.join("/home/runner/workspace", "desktop-app/SiaeBridge/Program.cs");
    const content = fs.readFileSync(localPath, "utf8");
    const base64Content = Buffer.from(content).toString("base64");
    
    // Update file on GitHub
    const { data: result } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: "Update SiaeBridge to v3.34 - Fix attachment filename for SIAE",
      content: base64Content,
      sha: (currentFile as any).sha,
      branch: "main"
    });
    
    console.log("✅ File updated successfully!");
    console.log("Commit SHA:", result.commit.sha);
    console.log("Commit URL:", result.commit.html_url);
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

updateFile();
