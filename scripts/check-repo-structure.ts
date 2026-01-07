import { Octokit } from "@octokit/rest";

async function checkStructure() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  
  try {
    const { data: contents } = await octokit.repos.getContent({
      owner: "evenfouryou",
      repo: "event-four-you-siae-lettore",
      path: ""
    });
    
    console.log("=== ROOT FILES ===");
    for (const item of contents as any[]) {
      console.log(`${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
    }
    
    // Check if SiaeBridge folder exists
    try {
      const { data: siaeContents } = await octokit.repos.getContent({
        owner: "evenfouryou",
        repo: "event-four-you-siae-lettore",
        path: "SiaeBridge"
      });
      console.log("\n=== SiaeBridge/ ===");
      for (const item of siaeContents as any[]) {
        console.log(`${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
      }
    } catch {
      console.log("\n❌ Cartella SiaeBridge non trovata");
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

checkStructure();
