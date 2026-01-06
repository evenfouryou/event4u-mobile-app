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

async function fullRestore() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  const baseDir = '/tmp/siae-restore2/event-four-you-siae-lettore-d5f36e9464d314a1092e5f329f0c8d8190b268a0';
  
  // Read all files from ZIP
  const files: { path: string; content: string }[] = [];
  
  function readDir(dir: string, prefix: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        if (entry.name !== '.git') {
          readDir(fullPath, relativePath);
        }
      } else {
        const content = fs.readFileSync(fullPath).toString('base64');
        files.push({ path: relativePath, content });
      }
    }
  }
  
  readDir(baseDir);
  console.log(`Found ${files.length} files to upload`);
  
  // Get current tree
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
  const currentSha = ref.object.sha;
  console.log('Current SHA:', currentSha);
  
  // Get current tree to find existing files
  const { data: currentCommit } = await octokit.git.getCommit({ owner, repo, commit_sha: currentSha });
  const { data: currentTree } = await octokit.git.getTree({ 
    owner, repo, 
    tree_sha: currentCommit.tree.sha, 
    recursive: 'true' 
  });
  
  // Build map of existing files
  const existingFiles = new Map<string, string>();
  currentTree.tree.forEach(f => {
    if (f.type === 'blob' && f.sha) {
      existingFiles.set(f.path!, f.sha);
    }
  });
  console.log(`Existing files: ${existingFiles.size}`);
  
  // Update each file one by one
  let updated = 0;
  let created = 0;
  let errors = 0;
  
  for (const file of files) {
    try {
      const existingSha = existingFiles.get(file.path);
      
      if (existingSha) {
        // Update existing file
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: file.path,
          message: `Restore: ${file.path}`,
          content: file.content,
          sha: existingSha,
          branch: 'main'
        });
        updated++;
      } else {
        // Create new file
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: file.path,
          message: `Restore: ${file.path}`,
          content: file.content,
          branch: 'main'
        });
        created++;
      }
      console.log(`✓ ${file.path}`);
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    } catch (e: any) {
      console.log(`✗ ${file.path}: ${e.message}`);
      errors++;
    }
  }
  
  console.log(`\n✅ Restore completed!`);
  console.log(`   Updated: ${updated}, Created: ${created}, Errors: ${errors}`);
  console.log(`https://github.com/${owner}/${repo}`);
}

fullRestore().catch(console.error);
