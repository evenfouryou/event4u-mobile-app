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

  console.log('Token expires at:', connectionSettings?.settings?.expires_at);
  return connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
}

async function testAuth() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  // Test authentication
  const { data: user } = await octokit.users.getAuthenticated();
  console.log('Authenticated as:', user.login);
  
  // Test repo access
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({ per_page: 5 });
  console.log('Can access repos:', repos.map(r => r.full_name));
  
  // Check specific repo
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    console.log('Repo access:', repoData.full_name, 'permissions:', repoData.permissions);
  } catch (e: any) {
    console.log('Repo access error:', e.message);
  }
}

testAuth().catch(console.error);
