import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { db } from './db';
import { pushTokens, prProfiles, siaeCustomers, users } from '@shared/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

const expo = new Expo();

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
}

export async function sendPushNotification(
  token: string,
  payload: PushNotificationPayload
): Promise<ExpoPushTicket | null> {
  if (!Expo.isExpoPushToken(token)) {
    console.error(`[Push] Invalid Expo push token: ${token}`);
    return null;
  }

  const message: ExpoPushMessage = {
    to: token,
    sound: payload.sound ?? 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
    badge: payload.badge,
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return tickets[0] || null;
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    return null;
  }
}

export async function sendPushNotificationToMany(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<ExpoPushTicket[]> {
  const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));
  
  if (validTokens.length === 0) {
    console.log('[Push] No valid tokens to send to');
    return [];
  }

  const messages: ExpoPushMessage[] = validTokens.map(token => ({
    to: token,
    sound: payload.sound ?? 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
    badge: payload.badge,
  }));

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return tickets;
  } catch (error) {
    console.error('[Push] Error sending notifications:', error);
    return [];
  }
}

export async function sendNotificationToPrProfile(
  prProfileId: string,
  payload: PushNotificationPayload
): Promise<ExpoPushTicket[]> {
  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(
      and(
        eq(pushTokens.prProfileId, prProfileId),
        eq(pushTokens.isActive, true)
      )
    );

  if (tokens.length === 0) {
    console.log(`[Push] No active tokens for PR profile ${prProfileId}`);
    return [];
  }

  return sendPushNotificationToMany(
    tokens.map(t => t.token),
    payload
  );
}

export async function sendNotificationToCustomer(
  customerId: string,
  payload: PushNotificationPayload
): Promise<ExpoPushTicket[]> {
  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(
      and(
        eq(pushTokens.customerId, customerId),
        eq(pushTokens.isActive, true)
      )
    );

  if (tokens.length === 0) {
    console.log(`[Push] No active tokens for customer ${customerId}`);
    return [];
  }

  return sendPushNotificationToMany(
    tokens.map(t => t.token),
    payload
  );
}

export async function sendNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<ExpoPushTicket[]> {
  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(
      and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.isActive, true)
      )
    );

  if (tokens.length === 0) {
    console.log(`[Push] No active tokens for user ${userId}`);
    return [];
  }

  return sendPushNotificationToMany(
    tokens.map(t => t.token),
    payload
  );
}

export async function registerPushToken(
  token: string,
  platform: 'ios' | 'android' | 'web',
  options: {
    prProfileId?: string;
    customerId?: string;
    userId?: string;
    deviceId?: string;
  }
): Promise<{ success: boolean; id?: string }> {
  if (!Expo.isExpoPushToken(token)) {
    return { success: false };
  }

  try {
    const existing = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.token, token))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushTokens)
        .set({
          platform,
          prProfileId: options.prProfileId || existing[0].prProfileId,
          customerId: options.customerId || existing[0].customerId,
          userId: options.userId || existing[0].userId,
          deviceId: options.deviceId || existing[0].deviceId,
          isActive: true,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pushTokens.id, existing[0].id));
      
      return { success: true, id: existing[0].id };
    }

    const [inserted] = await db
      .insert(pushTokens)
      .values({
        token,
        platform,
        prProfileId: options.prProfileId,
        customerId: options.customerId,
        userId: options.userId,
        deviceId: options.deviceId,
      })
      .returning();

    return { success: true, id: inserted.id };
  } catch (error) {
    console.error('[Push] Error registering token:', error);
    return { success: false };
  }
}

export async function deactivatePushToken(token: string): Promise<boolean> {
  try {
    await db
      .update(pushTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushTokens.token, token));
    return true;
  } catch (error) {
    console.error('[Push] Error deactivating token:', error);
    return false;
  }
}
