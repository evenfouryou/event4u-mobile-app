/**
 * Script per creare repository GitHub e fare push del progetto
 * Usa l'integrazione GitHub di Replit
 */

import { Octokit } from '@octokit/rest';

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
    throw new Error('Token Replit non trovato');
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
    throw new Error('GitHub non connesso. Vai su Replit e connetti GitHub nelle integrazioni.');
  }
  return accessToken;
}

async function main() {
  console.log('🚀 Push Event Four You SIAE Lettore su GitHub\n');
  
  try {
    const accessToken = await getAccessToken();
    const octokit = new Octokit({ auth: accessToken });
    
    // Ottieni info utente
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Connesso come: ${user.login}`);
    
    const repoName = 'event-four-you-siae-lettore';
    
    // Verifica se il repo esiste già
    let repoExists = false;
    try {
      await octokit.repos.get({ owner: user.login, repo: repoName });
      repoExists = true;
      console.log(`📂 Repository esistente: https://github.com/${user.login}/${repoName}`);
    } catch {
      repoExists = false;
    }
    
    // Crea repository se non esiste
    if (!repoExists) {
      console.log('📦 Creazione nuovo repository...');
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'Event Four You SIAE Lettore - Smart Card Reader per MiniLector EVO V3',
        private: false,
        auto_init: false
      });
      console.log(`✅ Repository creato: https://github.com/${user.login}/${repoName}`);
    }
    
    console.log('\n📋 Istruzioni per completare il push:\n');
    console.log('Esegui questi comandi nel terminale Replit Shell:\n');
    console.log(`  git remote add github https://github.com/${user.login}/${repoName}.git`);
    console.log('  git add .');
    console.log('  git commit -m "Event Four You SIAE Lettore - Initial commit"');
    console.log('  git push github main\n');
    console.log('Poi vai su GitHub Actions per avviare la build!');
    console.log(`  https://github.com/${user.login}/${repoName}/actions\n`);
    
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  }
}

main();
