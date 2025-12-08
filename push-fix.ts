import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

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
  const filePath = 'desktop-app/SiaeBridge/Program.cs';
  
  // Read local file
  const localContent = fs.readFileSync(filePath, 'utf8');
  const contentBase64 = Buffer.from(localContent).toString('base64');
  
  // Get current file SHA from GitHub
  console.log('📥 Getting current file from GitHub...');
  let sha: string;
  try {
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath
    });
    sha = (fileData as any).sha;
    console.log(`   SHA: ${sha}`);
  } catch (e) {
    console.log('   File not found, will create new');
    sha = '';
  }
  
  // Update file
  console.log('📤 Pushing PIN fix to GitHub...');
  const { data: result } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: 'Fix PIN verification: nPIN must be 1 (USER_PIN_REFERENCE), not pin.Length\n\nBased on official SIAE documentation test.c line 233:\nres=pVerifyPINML(1, (char*) pin, slot);',
    content: contentBase64,
    sha: sha || undefined
  });
  
  console.log(`✅ Pushed! Commit: ${result.commit.sha.slice(0,7)}`);
  console.log(`   URL: ${result.commit.html_url}`);
  
  // Also update BUILD_INSTRUCTIONS.md
  const buildInstructions = fs.readFileSync('desktop-app/BUILD_INSTRUCTIONS.md', 'utf8');
  const buildBase64 = Buffer.from(buildInstructions).toString('base64');
  
  try {
    const { data: buildFile } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'desktop-app/BUILD_INSTRUCTIONS.md'
    });
    
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'desktop-app/BUILD_INSTRUCTIONS.md',
      message: 'Update BUILD_INSTRUCTIONS with PIN fix documentation',
      content: buildBase64,
      sha: (buildFile as any).sha
    });
    console.log('✅ BUILD_INSTRUCTIONS.md updated');
  } catch (e) {
    console.log('⚠️ Could not update BUILD_INSTRUCTIONS.md');
  }
  
  // Wait a moment then check workflow
  console.log('\n⏳ Waiting for workflow to start...');
  await new Promise(r => setTimeout(r, 5000));
  
  const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: 3
  });
  
  console.log('\n🔄 Workflow status:');
  for (const run of runs.workflow_runs) {
    const status = run.conclusion || run.status;
    const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : status === 'queued' ? '📋' : '⏳';
    console.log(`   ${icon} ${run.name}: ${status} - ${new Date(run.created_at).toLocaleString()}`);
  }
}

main().catch(console.error);
