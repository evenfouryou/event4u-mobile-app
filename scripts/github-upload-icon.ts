import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  const connectionSettings = await fetch(
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

async function uploadIcon() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== UPLOAD ICONA 1024x1024 ===\n');
  
  const iconPath = '/home/runner/workspace/desktop-app/icon.png';
  const content = fs.readFileSync(iconPath);
  
  console.log(`Icona: ${content.length} bytes`);
  
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ 
      owner, repo, 
      path: 'desktop-app/icon.png' 
    });
    if (!Array.isArray(data)) sha = data.sha;
  } catch (e) {}
  
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: 'desktop-app/icon.png',
    message: 'Fix: Replace icon with proper 1024x1024 square PNG for electron-builder',
    content: content.toString('base64'),
    sha,
    branch: 'main'
  });
  
  console.log('✅ Icona caricata con successo!');
  
  // Trigger workflow
  console.log('\n📤 Avvio workflow...');
  try {
    await octokit.actions.createWorkflowDispatch({
      owner, repo,
      workflow_id: 'build.yml',
      ref: 'main'
    });
    console.log('✅ Workflow avviato');
  } catch (e: any) {
    console.log(`⚠️ Workflow verrà avviato dal push automatico`);
  }
}

uploadIcon().catch(console.error);
