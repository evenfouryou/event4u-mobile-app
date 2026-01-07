import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadFile(octokit: Octokit, owner: string, repo: string, localPath: string, remotePath: string) {
  try {
    const content = fs.readFileSync(localPath);
    const base64Content = content.toString('base64');
    
    // Check if file exists
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: remotePath });
      if (!Array.isArray(data)) {
        sha = data.sha;
      }
    } catch (e) {
      // File doesn't exist
    }
    
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: remotePath,
      message: `Add ${path.basename(remotePath)}`,
      content: base64Content,
      sha,
      branch: 'main'
    });
    
    console.log(`✅ ${remotePath}`);
    return true;
  } catch (e: any) {
    console.log(`❌ ${remotePath}: ${e.message}`);
    return false;
  }
}

async function addSiaeTemplates() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== AGGIUNTA TEMPLATE SIAE ===\n');
  
  const basePath = '/home/runner/workspace/attached_assets/siae_master/siae-master/src/SIAE/templates';
  
  // Files to upload
  const files = [
    // DTD files
    { local: `${basePath}/dtd/ControlloAccessi_v0001_20080626.dtd`, remote: 'siae_templates/dtd/ControlloAccessi_v0001_20080626.dtd' },
    { local: `${basePath}/dtd/Log_v0039_20040303.dtd`, remote: 'siae_templates/dtd/Log_v0039_20040303.dtd' },
    { local: `${basePath}/dtd/Lta_v0001_20081106.dtd`, remote: 'siae_templates/dtd/Lta_v0001_20081106.dtd' },
    { local: `${basePath}/dtd/RiepilogoGiornaliero_v0039_20040209.dtd`, remote: 'siae_templates/dtd/RiepilogoGiornaliero_v0039_20040209.dtd' },
    { local: `${basePath}/dtd/RiepilogoMensile_v0039_20040209.dtd`, remote: 'siae_templates/dtd/RiepilogoMensile_v0039_20040209.dtd' },
    // XML templates
    { local: `${basePath}/RCA_2015_09_22_001.xml`, remote: 'siae_templates/examples/RCA_2015_09_22_001.xml' },
    { local: `${basePath}/LOG_2015_09_22_001.xml`, remote: 'siae_templates/examples/LOG_2015_09_22_001.xml' },
    { local: `${basePath}/LTA_2015_09_22_001.xml`, remote: 'siae_templates/examples/LTA_2015_09_22_001.xml' },
    { local: `${basePath}/RMG_2015_09_00_001.xml`, remote: 'siae_templates/examples/RMG_2015_09_00_001.xml' },
  ];
  
  // Check RPM file (has space in name)
  const rpmPath = `${basePath}/RPM_2015_09_00_001 .xml`;
  if (fs.existsSync(rpmPath)) {
    files.push({ local: rpmPath, remote: 'siae_templates/examples/RPM_2015_09_00_001.xml' });
  }
  
  let success = 0;
  let failed = 0;
  
  for (const file of files) {
    if (fs.existsSync(file.local)) {
      if (await uploadFile(octokit, owner, repo, file.local, file.remote)) {
        success++;
      } else {
        failed++;
      }
      await sleep(400);
    } else {
      console.log(`⚠️ File non trovato: ${file.local}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Risultato: ${success} successi, ${failed} fallimenti`);
}

addSiaeTemplates().catch(console.error);
