import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  CLIENT_QUICK_ACTIONS: 'client_quick_actions',
  PR_QUICK_ACTIONS: 'pr_quick_actions',
};

export type ClientQuickAction = 'buy-tickets' | 'my-qr' | 'wallet' | 'resell' | 'pr-area' | 'scanner-area' | 'profile' | 'events';
export type PrQuickAction = 'events' | 'lists' | 'wallet' | 'profile' | 'scanner' | 'client-switch';

export interface QuickActionConfig {
  id: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_CLIENT_ACTIONS: ClientQuickAction[] = ['buy-tickets', 'my-qr', 'wallet', 'resell'];
const DEFAULT_PR_ACTIONS: PrQuickAction[] = ['events', 'lists', 'scanner', 'wallet'];

export async function getClientQuickActions(): Promise<ClientQuickAction[]> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.CLIENT_QUICK_ACTIONS);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_CLIENT_ACTIONS;
  } catch (error) {
    console.error('Error loading client quick actions:', error);
    return DEFAULT_CLIENT_ACTIONS;
  }
}

export async function setClientQuickActions(actions: ClientQuickAction[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.CLIENT_QUICK_ACTIONS, JSON.stringify(actions));
  } catch (error) {
    console.error('Error saving client quick actions:', error);
  }
}

export async function getPrQuickActions(): Promise<PrQuickAction[]> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.PR_QUICK_ACTIONS);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_PR_ACTIONS;
  } catch (error) {
    console.error('Error loading PR quick actions:', error);
    return DEFAULT_PR_ACTIONS;
  }
}

export async function setPrQuickActions(actions: PrQuickAction[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.PR_QUICK_ACTIONS, JSON.stringify(actions));
  } catch (error) {
    console.error('Error saving PR quick actions:', error);
  }
}
