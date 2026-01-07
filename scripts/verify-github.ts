import { Octokit } from "@octokit/rest";

async function verify() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  
  console.log("=== VERIFICA COMPLETA GITHUB ===\n");
  
  // 1. Check Program.cs version
  try {
    const { data } = await octokit.repos.getContent({
      owner, repo,
      path: "desktop-app/SiaeBridge/Program.cs"
    });
    
    const content = Buffer.from((data as any).content, 'base64').toString('utf8');
    const hasV334 = content.includes('v3.34');
    const hasAttachmentFix = content.includes('attachmentName}|{attachmentName}');
    const hasCorrectLog = content.includes('v3.34 FIX: Attachment string uses ONLY filename');
    
    console.log("1. PROGRAM.CS (desktop-app/SiaeBridge/)");
    console.log(`   Versione v3.34: ${hasV334 ? '✅' : '❌'}`);
    console.log(`   Fix attachments: ${hasAttachmentFix ? '✅' : '❌'}`);
    console.log(`   Log corretto: ${hasCorrectLog ? '✅' : '❌'}`);
    console.log(`   SHA: ${(data as any).sha.substring(0, 12)}`);
  } catch (e: any) {
    console.log("1. PROGRAM.CS: ❌ Errore:", e.message);
  }
  
  // 2. Check if old SiaeBridge folder is gone
  try {
    await octokit.repos.getContent({ owner, repo, path: "SiaeBridge" });
    console.log("\n2. CARTELLA OBSOLETA /SiaeBridge/: ⚠️ ANCORA PRESENTE");
  } catch {
    console.log("\n2. CARTELLA OBSOLETA /SiaeBridge/: ✅ Eliminata");
  }
  
  // 3. Check latest build
  try {
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner, repo, per_page: 3
    });
    
    console.log("\n3. ULTIMI BUILD:");
    for (const run of runs.workflow_runs) {
      const icon = run.conclusion === 'success' ? '✅' : 
                   run.conclusion === 'failure' ? '❌' : '⏳';
      console.log(`   ${icon} ${run.name} - ${run.conclusion || run.status} (${run.created_at})`);
    }
  } catch (e: any) {
    console.log("\n3. BUILD: ❌ Errore:", e.message);
  }
  
  // 4. Check releases
  try {
    const { data: releases } = await octokit.repos.listReleases({
      owner, repo, per_page: 3
    });
    
    console.log("\n4. RELEASES:");
    if (releases.length === 0) {
      console.log("   ⚠️ Nessuna release trovata");
    } else {
      for (const rel of releases) {
        console.log(`   📦 ${rel.tag_name} - ${rel.name} (${rel.created_at})`);
        for (const asset of rel.assets) {
          console.log(`      📄 ${asset.name} (${asset.download_count} downloads)`);
        }
      }
    }
  } catch (e: any) {
    console.log("\n4. RELEASES: ❌ Errore:", e.message);
  }
  
  // 5. Check repository structure
  try {
    const { data: contents } = await octokit.repos.getContent({
      owner, repo, path: "desktop-app/SiaeBridge"
    });
    
    console.log("\n5. STRUTTURA desktop-app/SiaeBridge/:");
    for (const item of contents as any[]) {
      console.log(`   ${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
    }
  } catch (e: any) {
    console.log("\n5. STRUTTURA: ❌ Errore:", e.message);
  }
}

verify();
