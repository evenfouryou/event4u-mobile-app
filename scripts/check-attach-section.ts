import { Octokit } from "@octokit/rest";

async function checkAttachSection() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  
  const { data } = await octokit.repos.getContent({
    owner: "evenfouryou",
    repo: "event-four-you-siae-lettore",
    path: "desktop-app/SiaeBridge/Program.cs"
  });
  
  const content = Buffer.from((data as any).content, 'base64').toString('utf8');
  const lines = content.split('\n');
  
  console.log("=== Cerca 'attachments =' nel codice ===\n");
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('attachments =') || lines[i].includes('attachments=')) {
      console.log(`\nLinea ${i + 1}: ${lines[i]}`);
      // Print context
      for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 5); j++) {
        const prefix = j === i ? '>>> ' : '    ';
        console.log(`${prefix}${j + 1}: ${lines[j]}`);
      }
    }
  }
  
  console.log("\n\n=== Cerca save con timestamp ===\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('File.WriteAllBytes') && !lines[i].includes('//')) {
      console.log(`Linea ${i + 1}: ${lines[i].trim()}`);
    }
  }
}

checkAttachSection();
