import { Octokit } from "@octokit/rest";

async function fullCheck() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           VERIFICA COMPLETA GITHUB & SERVER              ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  // 1. Check Program.cs
  console.log("━━━ 1. PROGRAM.CS (desktop-app/SiaeBridge/) ━━━");
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: "desktop-app/SiaeBridge/Program.cs" });
    const content = Buffer.from((data as any).content, 'base64').toString('utf8');
    
    const checks = [
      { name: "Versione v3.34", ok: content.includes('v3.34') },
      { name: "Fix attachments (nome|nome)", ok: content.includes('attachmentName}|{attachmentName}') },
      { name: "Log fix", ok: content.includes('Attachment string uses ONLY filename') },
      { name: "Salvataggio workdir", ok: content.includes('Attachment saved to workdir') },
      { name: "NO timestamp in attach", ok: !content.includes('timestamp}${fileExtension}') }
    ];
    
    for (const c of checks) {
      console.log(`   ${c.ok ? '✅' : '❌'} ${c.name}`);
    }
    console.log(`   SHA: ${(data as any).sha.substring(0, 12)}`);
  } catch (e: any) {
    console.log(`   ❌ Errore: ${e.message}`);
  }
  
  // 2. Check obsolete folders
  console.log("\n━━━ 2. PULIZIA REPOSITORY ━━━");
  const obsoletePaths = ["SiaeBridge", "siae-lettore-fix"];
  for (const p of obsoletePaths) {
    try {
      await octokit.repos.getContent({ owner, repo, path: p });
      console.log(`   ⚠️ /${p}/ ancora presente (obsoleto)`);
    } catch {
      console.log(`   ✅ /${p}/ eliminata`);
    }
  }
  
  // 3. Check all required files exist
  console.log("\n━━━ 3. FILE NECESSARI ━━━");
  const requiredFiles = [
    "desktop-app/SiaeBridge/Program.cs",
    "desktop-app/SiaeBridge/SiaeBridge.csproj",
    "desktop-app/SiaeBridge/LibSiae.cs",
    "desktop-app/SiaeBridge/libSIAEp7.dll",
    "desktop-app/SiaeBridge/prebuilt/libSIAE.dll",
    ".github/workflows/build.yml"
  ];
  
  for (const f of requiredFiles) {
    try {
      await octokit.repos.getContent({ owner, repo, path: f });
      console.log(`   ✅ ${f}`);
    } catch {
      console.log(`   ❌ ${f} MANCANTE!`);
    }
  }
  
  // 4. Latest builds
  console.log("\n━━━ 4. ULTIMI 3 BUILD ━━━");
  try {
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 3 });
    for (const run of runs.workflow_runs) {
      const icon = run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '❌' : '⏳';
      const time = new Date(run.created_at).toLocaleString('it-IT');
      console.log(`   ${icon} ${run.conclusion || run.status} - ${time}`);
    }
  } catch (e: any) {
    console.log(`   ❌ Errore: ${e.message}`);
  }
  
  // 5. Latest artifact
  console.log("\n━━━ 5. ARTIFACT PIÙ RECENTE ━━━");
  try {
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, status: "success", per_page: 1 });
    if (runs.workflow_runs.length > 0) {
      const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({ owner, repo, run_id: runs.workflow_runs[0].id });
      for (const a of artifacts.artifacts) {
        console.log(`   📦 ${a.name} (${(a.size_in_bytes / 1024 / 1024).toFixed(1)} MB)`);
        console.log(`   📅 Scade: ${a.expires_at}`);
      }
    }
  } catch (e: any) {
    console.log(`   ❌ Errore: ${e.message}`);
  }
}

fullCheck();
