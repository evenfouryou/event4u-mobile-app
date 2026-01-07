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

async function checkRepository() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('=== VERIFICA REPOSITORY GITHUB ===\n');
  
  // Get repo info
  const { data: repoInfo } = await octokit.repos.get({ owner, repo });
  console.log(`📁 Repository: ${repoInfo.full_name}`);
  console.log(`   Branch default: ${repoInfo.default_branch}`);
  console.log(`   Ultimo push: ${repoInfo.pushed_at}`);
  console.log(`   Dimensione: ${repoInfo.size} KB\n`);
  
  // Get all contents recursively
  async function listContents(path: string = '', indent: string = ''): Promise<string[]> {
    const allFiles: string[] = [];
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path });
      
      if (Array.isArray(data)) {
        for (const item of data) {
          allFiles.push(item.path);
          console.log(`${indent}${item.type === 'dir' ? '📂' : '📄'} ${item.name} ${item.type === 'file' ? `(${item.size} bytes)` : ''}`);
          
          if (item.type === 'dir') {
            const subFiles = await listContents(item.path, indent + '  ');
            allFiles.push(...subFiles);
          }
        }
      }
    } catch (e: any) {
      console.log(`${indent}❌ Errore: ${e.message}`);
    }
    return allFiles;
  }
  
  console.log('📋 CONTENUTO DEL REPOSITORY:\n');
  const files = await listContents();
  
  // Check for duplicates (files with similar names)
  console.log('\n=== CONTROLLO DUPLICATI ===\n');
  
  const basenames: { [key: string]: string[] } = {};
  for (const file of files) {
    const basename = file.split('/').pop() || file;
    if (!basenames[basename]) {
      basenames[basename] = [];
    }
    basenames[basename].push(file);
  }
  
  let duplicatesFound = false;
  for (const [name, paths] of Object.entries(basenames)) {
    if (paths.length > 1) {
      console.log(`⚠️ File duplicato: ${name}`);
      paths.forEach(p => console.log(`   - ${p}`));
      duplicatesFound = true;
    }
  }
  
  if (!duplicatesFound) {
    console.log('✅ Nessun file duplicato trovato!');
  }
  
  // Get recent commits
  console.log('\n=== ULTIMI COMMIT ===\n');
  const { data: commits } = await octokit.repos.listCommits({ owner, repo, per_page: 5 });
  for (const commit of commits) {
    const date = new Date(commit.commit.author?.date || '').toLocaleString('it-IT');
    console.log(`📝 ${commit.sha.substring(0, 7)} - ${commit.commit.message.split('\n')[0]}`);
    console.log(`   ${date}\n`);
  }
  
  // Check releases
  console.log('=== RELEASES ===\n');
  try {
    const { data: releases } = await octokit.repos.listReleases({ owner, repo });
    if (releases.length === 0) {
      console.log('⚠️ Nessun release pubblicato');
    } else {
      for (const release of releases.slice(0, 5)) {
        console.log(`🏷️ ${release.tag_name} - ${release.name}`);
        console.log(`   Creato: ${new Date(release.created_at).toLocaleString('it-IT')}`);
        if (release.assets.length > 0) {
          console.log(`   Assets: ${release.assets.map(a => a.name).join(', ')}`);
        }
        console.log('');
      }
    }
  } catch (e) {
    console.log('⚠️ Nessun release trovato');
  }
  
  // Check workflows
  console.log('=== GITHUB ACTIONS ===\n');
  try {
    const { data: workflows } = await octokit.actions.listRepoWorkflows({ owner, repo });
    if (workflows.total_count === 0) {
      console.log('⚠️ Nessun workflow configurato');
      console.log('   Per abilitare build automatiche, aggiungi .github/workflows/build.yml');
    } else {
      for (const wf of workflows.workflows) {
        console.log(`🔄 ${wf.name} (${wf.state})`);
      }
    }
  } catch (e) {
    console.log('⚠️ GitHub Actions non configurato');
  }
  
  console.log('\n=== FINE VERIFICA ===');
}

checkRepository().catch(console.error);
