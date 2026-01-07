import { Octokit } from "@octokit/rest";

async function checkRelease() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  
  const { data: releases } = await octokit.repos.listReleases({
    owner: "evenfouryou",
    repo: "event-four-you-siae-lettore",
    per_page: 5
  });
  
  console.log("=== RELEASES DISPONIBILI ===\n");
  
  for (const rel of releases) {
    console.log(`📦 ${rel.tag_name} - ${rel.name}`);
    console.log(`   Data: ${rel.created_at}`);
    console.log(`   Assets:`);
    for (const asset of rel.assets) {
      console.log(`     📄 ${asset.name}`);
      console.log(`        Download: ${asset.browser_download_url}`);
    }
    console.log("");
  }
}

checkRelease();
