import { Octokit } from "@octokit/rest";

async function checkStructure() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  
  try {
    const { data: contents } = await octokit.repos.getContent({
      owner: "evenfouryou",
      repo: "event-four-you-siae-lettore",
      path: "desktop-app"
    });
    
    console.log("=== desktop-app/ ===");
    for (const item of contents as any[]) {
      console.log(`${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
    }
    
    // Check SiaeBridge inside desktop-app
    try {
      const { data: siaeContents } = await octokit.repos.getContent({
        owner: "evenfouryou",
        repo: "event-four-you-siae-lettore",
        path: "desktop-app/SiaeBridge"
      });
      console.log("\n=== desktop-app/SiaeBridge/ ===");
      for (const item of siaeContents as any[]) {
        console.log(`${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
      }
    } catch {
      console.log("\n❌ desktop-app/SiaeBridge non trovata");
    }
  } catch (error: any) {
    console.error("desktop-app non trovata:", error.message);
  }
}

checkStructure();
