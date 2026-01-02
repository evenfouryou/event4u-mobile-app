import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
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

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const OWNER = 'evenfouryou';
const REPO = 'event-four-you-siae-lettore';
const COMMIT_MESSAGE = 'v3.14: CAdES-BES SHA-256 con SigningCertificateV2 (ETSI EN 319 122-1)';

interface FileUpdate {
  localPath: string;
  repoPath: string;
  binary?: boolean;
}

const filesToUpdate: FileUpdate[] = [
  // SiaeBridge .NET project files
  {
    localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/Program.cs',
    repoPath: 'desktop-app/SiaeBridge/Program.cs'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/LibSiae.cs',
    repoPath: 'desktop-app/SiaeBridge/LibSiae.cs'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/SIAEReader.cs',
    repoPath: 'desktop-app/SiaeBridge/SIAEReader.cs'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/SiaeBridge.csproj',
    repoPath: 'desktop-app/SiaeBridge/SiaeBridge.csproj'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/libSIAEp7.dll',
    repoPath: 'desktop-app/SiaeBridge/libSIAEp7.dll',
    binary: true
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/prebuilt/libSIAE.dll',
    repoPath: 'desktop-app/SiaeBridge/prebuilt/libSIAE.dll',
    binary: true
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/SiaeBridge/prebuilt/Newtonsoft.Json.dll',
    repoPath: 'desktop-app/SiaeBridge/prebuilt/Newtonsoft.Json.dll',
    binary: true
  },
  // Electron app files
  {
    localPath: 'siae-lettore-fix/desktop-app/main.js',
    repoPath: 'desktop-app/main.js'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/preload.js',
    repoPath: 'desktop-app/preload.js'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/renderer.js',
    repoPath: 'desktop-app/renderer.js'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/index.html',
    repoPath: 'desktop-app/index.html'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/styles.css',
    repoPath: 'desktop-app/styles.css'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/package.json',
    repoPath: 'desktop-app/package.json'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/build-local.ps1',
    repoPath: 'desktop-app/build-local.ps1'
  },
  {
    localPath: 'siae-lettore-fix/desktop-app/BUILD_INSTRUCTIONS.md',
    repoPath: 'desktop-app/BUILD_INSTRUCTIONS.md'
  },
  // Root files
  {
    localPath: 'siae-lettore-fix/README.md',
    repoPath: 'README.md'
  },
  {
    localPath: 'siae-lettore-fix/package.json',
    repoPath: 'package.json'
  },
  {
    localPath: 'siae-lettore-fix/main.js',
    repoPath: 'main.js'
  },
  {
    localPath: 'siae-lettore-fix/preload.js',
    repoPath: 'preload.js'
  },
  {
    localPath: 'siae-lettore-fix/renderer.js',
    repoPath: 'renderer.js'
  },
  {
    localPath: 'siae-lettore-fix/index.html',
    repoPath: 'index.html'
  },
  {
    localPath: 'siae-lettore-fix/styles.css',
    repoPath: 'styles.css'
  },
  {
    localPath: 'siae-lettore-fix/build-local.ps1',
    repoPath: 'build-local.ps1'
  },
  {
    localPath: 'siae-lettore-fix/BUILD_INSTRUCTIONS.md',
    repoPath: 'BUILD_INSTRUCTIONS.md'
  },
  {
    localPath: 'siae-lettore-fix/icon.png',
    repoPath: 'icon.png',
    binary: true
  },
  // GitHub Actions workflow
  {
    localPath: 'siae-lettore-fix/.github/workflows/build-release.yml',
    repoPath: '.github/workflows/build-release.yml'
  }
];

async function getDefaultBranch(octokit: Octokit): Promise<string> {
  try {
    const { data: repo } = await octokit.repos.get({
      owner: OWNER,
      repo: REPO
    });
    return repo.default_branch;
  } catch (error) {
    console.log('Could not determine default branch, trying "main"...');
    return 'main';
  }
}

async function getFileSha(octokit: Octokit, filePath: string, branch: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: branch
    });
    
    if (Array.isArray(data)) {
      throw new Error(`${filePath} is a directory, not a file`);
    }
    
    return data.sha;
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`File ${filePath} does not exist in repo, will create new`);
      return null;
    }
    throw error;
  }
}

async function updateFile(
  octokit: Octokit, 
  localPath: string, 
  repoPath: string, 
  branch: string,
  binary: boolean = false
): Promise<void> {
  const absolutePath = path.resolve(process.cwd(), localPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Local file not found: ${absolutePath}`);
  }
  
  const contentBuffer = fs.readFileSync(absolutePath);
  const contentBase64 = contentBuffer.toString('base64');
  
  const sha = await getFileSha(octokit, repoPath, branch);
  
  console.log(`Updating ${repoPath}${binary ? ' (binary)' : ''}...`);
  console.log(`  Local file size: ${contentBuffer.length} bytes`);
  console.log(`  SHA: ${sha || '(new file)'}`);
  
  const params: any = {
    owner: OWNER,
    repo: REPO,
    path: repoPath,
    message: COMMIT_MESSAGE,
    content: contentBase64,
    branch: branch
  };
  
  if (sha) {
    params.sha = sha;
  }
  
  const { data } = await octokit.repos.createOrUpdateFileContents(params);
  
  console.log(`  ✓ Updated successfully!`);
  console.log(`  Commit: ${data.commit.sha}`);
  console.log(`  URL: ${data.commit.html_url}`);
}

export async function pushSiaeBridgeUpdates(): Promise<void> {
  console.log('='.repeat(60));
  console.log('SiaeBridge GitHub Push Script');
  console.log('='.repeat(60));
  console.log(`Repository: ${OWNER}/${REPO}`);
  console.log(`Commit message: ${COMMIT_MESSAGE}`);
  console.log('');
  
  const octokit = await getGitHubClient();
  console.log('✓ GitHub client authenticated');
  
  const branch = await getDefaultBranch(octokit);
  console.log(`✓ Default branch: ${branch}`);
  console.log('');
  
  for (const file of filesToUpdate) {
    await updateFile(octokit, file.localPath, file.repoPath, branch, file.binary || false);
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('All files pushed successfully!');
  console.log('='.repeat(60));
}

pushSiaeBridgeUpdates()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  });
