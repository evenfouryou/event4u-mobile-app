import { Octokit } from "@octokit/rest";

async function cleanup() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  
  // Folders to check and delete
  const foldersToDelete = [
    "SiaeBridge",           // Duplicate in root
    "siae-lettore-fix"      // Stale snapshots
  ];
  
  for (const folder of foldersToDelete) {
    try {
      // Get all files in folder
      const { data: contents } = await octokit.repos.getContent({
        owner, repo,
        path: folder
      });
      
      if (Array.isArray(contents)) {
        console.log(`\n=== Eliminando ${folder}/ (${contents.length} file) ===`);
        
        for (const file of contents) {
          if (file.type === 'file') {
            await octokit.repos.deleteFile({
              owner, repo,
              path: file.path,
              message: `Cleanup: remove obsolete ${file.path}`,
              sha: file.sha,
              branch: "main"
            });
            console.log(`  ✅ Eliminato: ${file.path}`);
          } else if (file.type === 'dir') {
            // Recursively get and delete files in subdirectory
            const { data: subContents } = await octokit.repos.getContent({
              owner, repo,
              path: file.path
            });
            
            if (Array.isArray(subContents)) {
              for (const subFile of subContents) {
                if (subFile.type === 'file') {
                  await octokit.repos.deleteFile({
                    owner, repo,
                    path: subFile.path,
                    message: `Cleanup: remove obsolete ${subFile.path}`,
                    sha: subFile.sha,
                    branch: "main"
                  });
                  console.log(`  ✅ Eliminato: ${subFile.path}`);
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      if (e.status === 404) {
        console.log(`\n⚠️ ${folder}/ non trovata (già eliminata o non esiste)`);
      } else {
        console.log(`\n❌ Errore ${folder}/: ${e.message}`);
      }
    }
  }
  
  console.log("\n✅ Pulizia completata!");
}

cleanup();
