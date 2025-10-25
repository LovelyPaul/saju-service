import { auth } from '@clerk/nextjs/server';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/nextjs/server';

/**
 * Get current logged-in Clerk user ID
 * @returns Clerk user ID or null if not authenticated
 */
export async function getCurrentClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Verify Clerk webhook signature
 * @param request - Request object
 * @param webhookSecret - Webhook secret from environment
 * @returns WebhookEvent or null if verification fails
 */
export async function verifyClerkWebhook(
  request: Request,
  webhookSecret: string
): Promise<WebhookEvent | null> {
  try {
    // Get the headers
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    // If there are no headers, error out
    if (!svixId || !svixTimestamp || !svixSignature) {
      return null;
    }

    // Get the body
    const payload = await request.text();

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(webhookSecret);

    // Verify the payload with the headers
    const evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;

    return evt;
  } catch (error) {
    console.error('Error verifying Clerk webhook:', error);
    return null;
  }
}
