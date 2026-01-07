import { Octokit } from "@octokit/rest";

async function compareFiles() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  const owner = "evenfouryou";
  const repo = "event-four-you-siae-lettore";
  
  // Check both Program.cs files
  const paths = [
    "SiaeBridge/Program.cs",
    "desktop-app/SiaeBridge/Program.cs"
  ];
  
  for (const path of paths) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path });
      const content = Buffer.from((data as any).content, 'base64').toString('utf8');
      
      // Check for v3.34 marker
      const hasV334 = content.includes('v3.34');
      const hasTimestamp = content.includes('${timestamp}') || content.includes('_timestamp') || content.includes('ToUnixTime');
      const hasAttachmentFix = content.includes('attachmentName}|{attachmentName}');
      
      console.log(`\n=== ${path} ===`);
      console.log(`  SHA: ${(data as any).sha.substring(0, 8)}`);
      console.log(`  Contiene v3.34: ${hasV334 ? '✅' : '❌'}`);
      console.log(`  Ha fix attachment: ${hasAttachmentFix ? '✅' : '❌'}`);
      console.log(`  Ha timestamp pattern: ${hasTimestamp ? '⚠️ SI' : '✅ NO'}`);
      
      // Show relevant lines
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('attachments =') && lines[i].includes('attachmentName')) {
          console.log(`  Linea ${i+1}: ${lines[i].trim()}`);
        }
      }
    } catch (e: any) {
      console.log(`\n=== ${path} ===`);
      console.log(`  ❌ Non trovato: ${e.message}`);
    }
  }
}

compareFiles();
