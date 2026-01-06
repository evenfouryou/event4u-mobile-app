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

async function uploadEmailServiceFix() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Read local email-service.ts
  const localPath = '/home/runner/workspace/server/email-service.ts';
  const localContent = fs.readFileSync(localPath, 'utf8');
  
  console.log('Uploading server/email-service.ts to GitHub...');
  console.log('Local file size:', localContent.length, 'bytes');
  
  // Check if file exists on GitHub
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner, repo,
      path: 'server/email-service.ts'
    }) as { data: { sha: string } };
    sha = data.sha;
    console.log('File exists on GitHub, will update');
  } catch (e) {
    console.log('File does not exist on GitHub, will create');
  }
  
  // Upload
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: 'server/email-service.ts',
    message: 'Fix S/MIME: remove CRLF normalization that corrupted signed message (error 40605)',
    content: Buffer.from(localContent).toString('base64'),
    sha,
    branch: 'main'
  });
  
  console.log('✅ email-service.ts uploaded to GitHub!');
}

uploadEmailServiceFix().catch(console.error);
