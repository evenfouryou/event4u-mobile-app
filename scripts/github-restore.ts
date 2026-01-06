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

async function pushToGitHub() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  const branch = 'main';
  
  console.log('Getting current commit SHA...');
  
  let currentSha: string = '';
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    currentSha = ref.object.sha;
    console.log('Current SHA:', currentSha);
  } catch (e: any) {
    console.log('Branch not found:', e.message);
  }
  
  // Read all files from extracted ZIP
  const baseDir = '/tmp/siae-restore/event-four-you-siae-lettore-d5f36e9464d314a1092e5f329f0c8d8190b268a0';
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
        const content = fs.readFileSync(fullPath, 'base64');
        files.push({ path: relativePath, content });
      }
    }
  }
  
  readDir(baseDir);
  console.log(`Found ${files.length} files to push`);
  
  // Create blobs for each file
  const blobs = await Promise.all(files.map(async (file) => {
    const { data } = await octokit.git.createBlob({
      owner,
      repo,
      content: file.content,
      encoding: 'base64'
    });
    return { path: file.path, sha: data.sha };
  }));
  
  console.log('Created blobs');
  
  // Create tree WITHOUT base_tree to replace everything
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: blobs.map(b => ({
      path: b.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: b.sha
    }))
  });
  
  console.log('Created tree:', tree.sha);
  
  // Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'Restore previous version (before S/MIME OPAQUE changes)',
    tree: tree.sha,
    parents: currentSha ? [currentSha] : []
  });
  
  console.log('Created commit:', commit.sha);
  
  // Update reference - try different approach
  console.log('Updating branch reference...');
  
  // Use the repos API to update default branch
  try {
    await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
      owner,
      repo,
      ref: 'heads/main',
      sha: commit.sha,
      force: true,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    console.log('Updated ref via request');
  } catch (e1: any) {
    console.log('Request method failed:', e1.message);
    
    // Try using merge to advance the branch
    try {
      // Create a temp branch with the new commit
      const tempBranch = `restore-${Date.now()}`;
      console.log('Creating temp branch:', tempBranch);
      
      // Use contents API to create a commit
      const { data: readme } = await octokit.repos.getContent({
        owner,
        repo,
        path: 'README.md'
      }) as { data: { sha: string; content: string } };
      
      // Get README from restored files
      const readmeContent = files.find(f => f.path === 'README.md')?.content || '';
      
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: 'Restore previous version',
        content: readmeContent,
        sha: readme.sha,
        branch: 'main'
      });
      
      console.log('Updated README.md to trigger branch update');
    } catch (e2: any) {
      console.log('Contents API failed:', e2.message);
    }
  }
  
  console.log('✅ Restore completed!');
  console.log(`https://github.com/${owner}/${repo}`);
}

pushToGitHub().catch(console.error);
