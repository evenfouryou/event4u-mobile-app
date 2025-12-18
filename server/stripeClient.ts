// Stripe Client for Event4U Ticketing - Based on Replit Stripe Integration
// Supports both Replit connector and environment variables as fallback
import Stripe from 'stripe';

let connectionSettings: any;

async function getCredentials() {
  // First, check for environment variables (works in both dev and production)
  const rawPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const rawSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (rawPublishableKey && rawSecretKey) {
    // Log key prefixes for debugging (never log full keys!)
    console.log("[Stripe] Using environment variables for credentials");
    console.log("[Stripe] Publishable key prefix:", rawPublishableKey.substring(0, 20) + "...");
    console.log("[Stripe] Secret key prefix:", rawSecretKey.substring(0, 15) + "...");
    
    return {
      publishableKey: rawPublishableKey.trim(),
      secretKey: rawSecretKey.trim(),
    };
  }

  // Fallback to Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Stripe credentials not found. Set STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY environment variables.');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  console.log(`[Stripe] Trying Replit connector for ${targetEnvironment}...`);

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found. Set STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY environment variables.`);
  }

  console.log(`[Stripe] Using Replit connector for ${targetEnvironment}`);
  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

// WARNING: Never cache this client - always get fresh instance
export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia' as any,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

// StripeSync singleton for webhook processing and data sync
let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
