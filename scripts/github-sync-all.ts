import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE = '/home/runner/workspace';
const OWNER = 'evenfouryou';
const REPO = 'Event-Four-You-2026';
const BRANCH = 'main';

// Directories and files to exclude
const EXCLUDE = new Set([
  'node_modules',
  '.git',
  '.cache',
  '.config',
  '.local',
  '.npm',
  '.replit',
  'dist',
  '.upm',
  'android',
  'ios',
  '.gitignore',
  'replit.nix',
  '.breakpoints',
  'generated-icon.png',
  'tsconfig.tsbuildinfo'
]);

// File extensions to include
const INCLUDE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md',
  '.yml', '.yaml', '.sql', '.sh', '.env.example', '.gitkeep'
]);

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

function shouldIncludeFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath);
  
  // Check if in excluded list
  if (EXCLUDE.has(basename)) return false;
  
  // Include by extension
  if (INCLUDE_EXTENSIONS.has(ext)) return true;
  
  // Include specific files
  if (['package.json', 'package-lock.json', 'tsconfig.json', '.gitignore'].includes(basename)) {
    return true;
  }
  
  return false;
}

function getAllFiles(dir: string, prefix: string = ''): { path: string; fullPath: string }[] {
  const files: { path: string; fullPath: string }[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      if (EXCLUDE.has(entry.name)) continue;
      
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath, relativePath));
      } else if (shouldIncludeFile(entry.name)) {
        files.push({ path: relativePath, fullPath });
      }
    }
  } catch (e) {
    // Skip directories we can't read
  }
  
  return files;
}

async function pushFile(
  token: string,
  filePath: string,
  content: string,
  sha?: string
): Promise<boolean> {
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        message: `Update ${path.basename(filePath)}`,
        content,
        branch: BRANCH,
        ...(sha ? { sha } : {})
      })
    }
  );
  
  return response.ok;
}

async function getFileSha(token: string, filePath: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}?ref=${BRANCH}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.sha;
    }
  } catch (e) {
    // File doesn't exist
  }
  return null;
}

async function syncAll() {
  console.log('🔄 Sincronizzazione completa del repository...\n');
  
  const token = await getAccessToken();
  const files = getAllFiles(WORKSPACE);
  
  console.log(`📁 Trovati ${files.length} file da sincronizzare\n`);
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  // Process files in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(batch.map(async (file) => {
      try {
        // Skip .github/workflows - requires different permissions
        if (file.path.startsWith('.github/workflows')) {
          return { file: file.path, status: 'skipped', reason: 'workflows' };
        }
        
        const content = fs.readFileSync(file.fullPath);
        const base64Content = content.toString('base64');
        
        // Get existing SHA if file exists
        const sha = await getFileSha(token, file.path);
        
        const ok = await pushFile(token, file.path, base64Content, sha || undefined);
        
        return { file: file.path, status: ok ? 'success' : 'failed' };
      } catch (e: any) {
        return { file: file.path, status: 'failed', error: e.message };
      }
    }));
    
    for (const result of results) {
      if (result.status === 'success') {
        success++;
        process.stdout.write('✓');
      } else if (result.status === 'skipped') {
        skipped++;
        process.stdout.write('○');
      } else {
        failed++;
        process.stdout.write('✗');
      }
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < files.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log('\n');
  console.log(`\n✅ Sincronizzazione completata!`);
  console.log(`   ✓ ${success} file aggiornati`);
  console.log(`   ○ ${skipped} file saltati (workflows)`);
  console.log(`   ✗ ${failed} file falliti`);
  console.log(`\n📦 Repository: https://github.com/${OWNER}/${REPO}`);
  console.log(`🔨 Actions: https://github.com/${OWNER}/${REPO}/actions`);
}

syncAll().catch(e => {
  console.error('Errore:', e.message);
  process.exit(1);
});
