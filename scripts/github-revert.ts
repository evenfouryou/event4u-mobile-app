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

async function revertByReplacingFiles() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  const previousCommit = 'd5f36e9464d314a1092e5f329f0c8d8190b268a0';
  
  console.log('Getting files from previous commit...');
  
  // Get the tree from the previous commit
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: previousCommit
  });
  
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitData.tree.sha,
    recursive: 'true'
  });
  
  console.log(`Found ${treeData.tree.length} files in previous commit`);
  
  // Get current commit SHA
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: 'heads/main'
  });
  const currentSha = ref.object.sha;
  console.log('Current SHA:', currentSha);
  
  // Create new commit with the old tree
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'Revert: Remove S/MIME OPAQUE changes',
    tree: commitData.tree.sha,
    parents: [currentSha]
  });
  
  console.log('Created revert commit:', newCommit.sha);
  
  // Now try to update ref using repos API instead
  try {
    // Try using contents API to update a file which triggers ref update
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'Program.cs',
      ref: previousCommit
    });
    
    if ('content' in fileData) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'Program.cs',
        message: 'Revert to previous version',
        content: fileData.content,
        sha: (await octokit.repos.getContent({ owner, repo, path: 'Program.cs' }) as any).data.sha,
        branch: 'main'
      });
      console.log('Updated Program.cs');
    }
  } catch (e: any) {
    console.log('File update error:', e.message);
  }
  
  console.log('✅ Tentativo di ripristino completato');
  console.log(`https://github.com/${owner}/${repo}`);
}

revertByReplacingFiles().catch(console.error);
