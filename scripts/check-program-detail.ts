import { Octokit } from "@octokit/rest";

async function checkProgram() {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  
  const { data } = await octokit.repos.getContent({
    owner: "evenfouryou",
    repo: "event-four-you-siae-lettore",
    path: "desktop-app/SiaeBridge/Program.cs"
  });
  
  const content = Buffer.from((data as any).content, 'base64').toString('utf8');
  
  // Find the SMIMESignML handler section
  console.log("=== Sezione SMIMESignML (salvataggio file) ===\n");
  
  const lines = content.split('\n');
  let inSection = false;
  let sectionStart = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('case "smime_signml"')) {
      inSection = true;
      sectionStart = i;
    }
    if (inSection && (lines[i].includes('timestamp') || lines[i].includes('DateTime.Now.Ticks') || lines[i].includes('workdir') || lines[i].includes('File.WriteAll') || lines[i].includes('attachments ='))) {
      console.log(`Linea ${i + 1}: ${lines[i].trim()}`);
    }
    if (inSection && i > sectionStart + 200) break;
  }
  
  // Check for any timestamp patterns in file saving
  console.log("\n=== Pattern timestamp nel file ===");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Ticks') || lines[i].includes('timestamp') || (lines[i].includes('DateTime') && lines[i].includes('Now'))) {
      if (!lines[i].includes('//') && !lines[i].trim().startsWith('//')) {
        console.log(`Linea ${i + 1}: ${lines[i].trim()}`);
      }
    }
  }
}

checkProgram();
