import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
const owner = "evenfouryou";
const repo = "Event-Four-You-2026";
const branch = "main";

const octokit = new Octokit({ auth: token });

// Files/folders to exclude from sync
const EXCLUDE = [
  'node_modules', '.git', '.cache', '.replit', 'replit.nix', '.upm',
  'github-sync.mjs', 'github-force-push.mjs', '.config', 'generated-icon.png',
  '.breakpoints', 'package-lock.json', '.env', 'drizzle'
];

function shouldExclude(filePath) {
  return EXCLUDE.some(ex => filePath.startsWith(ex) || filePath.includes('/' + ex));
}

function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (shouldExclude(relativePath)) continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (stat.isFile()) {
      files.push({ path: relativePath, fullPath });
    }
  }
  return files;
}

async function createBlob(content) {
  const { data } = await octokit.git.createBlob({
    owner, repo,
    content: Buffer.from(content).toString('base64'),
    encoding: 'base64'
  });
  return data.sha;
}

async function run() {
  try {
    console.log("📂 Scanning local files...");
    const files = getAllFiles('/home/runner/workspace');
    console.log(`Found ${files.length} files to sync\n`);

    // Get current commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner, repo, ref: 'heads/' + branch
    });
    const parentSha = refData.object.sha;
    console.log("Current remote SHA:", parentSha);

    // Create blobs and tree entries
    console.log("\n📤 Uploading files to GitHub...");
    const treeEntries = [];
    let uploaded = 0;
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file.fullPath);
        const sha = await createBlob(content);
        treeEntries.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha
        });
        uploaded++;
        if (uploaded % 50 === 0) {
          console.log(`  Uploaded ${uploaded}/${files.length}...`);
        }
      } catch (err) {
        console.log(`  Skip: ${file.path} (${err.message})`);
      }
    }
    console.log(`✓ Uploaded ${uploaded} files`);

    // Create tree
    console.log("\n🌳 Creating new tree...");
    const { data: treeData } = await octokit.git.createTree({
      owner, repo,
      tree: treeEntries
    });
    console.log("Tree SHA:", treeData.sha);

    // Create commit
    console.log("\n💾 Creating commit...");
    const { data: commitData } = await octokit.git.createCommit({
      owner, repo,
      message: "Sync from Replit - Staff app implementation",
      tree: treeData.sha,
      parents: [parentSha]
    });
    console.log("Commit SHA:", commitData.sha);

    // Update branch reference
    console.log("\n🚀 Pushing to GitHub...");
    await octokit.git.updateRef({
      owner, repo,
      ref: 'heads/' + branch,
      sha: commitData.sha,
      force: true
    });

    console.log("\n✅ Successfully pushed to GitHub!");
    console.log(`   https://github.com/${owner}/${repo}`);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

run();
