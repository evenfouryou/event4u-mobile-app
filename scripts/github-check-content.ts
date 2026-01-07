import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken!
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Get Program.cs content and check version
  const { data: programFile } = await octokit.repos.getContent({ 
    owner, 
    repo, 
    path: 'Program.cs' 
  }) as { data: { content: string } };
  
  const content = Buffer.from(programFile.content, 'base64').toString('utf-8');
  
  // Find version line
  const versionMatch = content.match(/SiaeBridge v(\d+\.\d+)/);
  if (versionMatch) {
    console.log(`✅ GitHub repo has version: ${versionMatch[1]}`);
  }
  
  // Check for v3.35 post-processing fix
  if (content.includes('v3.35 FIX: Post-processing S/MIME headers')) {
    console.log('✅ v3.35 FIX is present in the pushed code!');
  } else if (content.includes('v3.34')) {
    console.log('⚠️ Still at v3.34 - need to push v3.35');
  }
  
  // Show first few lines of version info
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SiaeBridge v3.')) {
      console.log(`Line ${i+1}: ${lines[i].trim()}`);
    }
  }
}

main().catch(console.error);
