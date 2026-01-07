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
  const repo = "Event-Four-You-2026";
  const filePath = ".github/workflows/build-siae-bridge.yml";
  
  try {
    // Try to get current file
    let sha: string | undefined;
    try {
      const { data: currentFile } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      sha = (currentFile as any).sha;
      console.log("Updating existing file, SHA:", sha);
    } catch (e) {
      console.log("Creating new file");
    }
    
    const localPath = path.join("/home/runner/workspace", filePath);
    const content = fs.readFileSync(localPath, "utf8");
    const base64Content = Buffer.from(content).toString("base64");
    
    const { data: result } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: "Add GitHub Actions workflow for SiaeBridge build",
      content: base64Content,
      sha: sha,
      branch: "main"
    });
    
    console.log("✅ Workflow file updated!");
    console.log("Commit SHA:", result.commit.sha);
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

updateFile();
