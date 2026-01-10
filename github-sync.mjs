import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
const owner = "evenfouryou";
const repo = "Event-Four-You-2026";
const branch = "main";

if (!token) {
  console.error("No GitHub token found");
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

async function getLatestCommit() {
  const { data } = await octokit.repos.getBranch({
    owner,
    repo,
    branch
  });
  return data.commit.sha;
}

async function run() {
  try {
    console.log("✓ GitHub API access working with token!");
    const sha = await getLatestCommit();
    console.log("Latest remote commit SHA:", sha);
    
  } catch (error) {
    console.error("Error:", error.message);
    if (error.status === 401) {
      console.error("Token is invalid or expired");
    }
  }
}

run();
