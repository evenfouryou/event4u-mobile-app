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

async function checkRepo() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  console.log('Checking repo branches...');
  
  try {
    const { data: branches } = await octokit.repos.listBranches({ owner, repo });
    console.log('Branches:', branches.map(b => b.name));
    
    const { data: commits } = await octokit.repos.listCommits({ owner, repo, per_page: 5 });
    console.log('\nRecent commits:');
    commits.forEach(c => console.log(`  ${c.sha.substring(0,7)} - ${c.commit.message}`));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

checkRepo().catch(console.error);
