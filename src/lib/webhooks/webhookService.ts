/**
 * Webhook Notification System
 * 
 * Sends HTTP callbacks when document processing events occur.
 */

import prisma from '@/lib/db';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export type WebhookEvent = 
  | 'document.uploaded'
  | 'document.processing'
  | 'document.completed'
  | 'document.failed'
  | 'batch.started'
  | 'batch.completed';

interface WebhookConfig {
  url: string;
  secret?: string;
  events: WebhookEvent[];
  active: boolean;
}

// In-memory webhook registry (in production, store in DB)
const webhooks: Map<string, WebhookConfig> = new Map();

/**
 * Register a webhook
 */
export function registerWebhook(id: string, config: WebhookConfig): void {
  webhooks.set(id, config);
}

/**
 * Unregister a webhook
 */
export function unregisterWebhook(id: string): void {
  webhooks.delete(id);
}

/**
 * List all webhooks
 */
export function listWebhooks(): { id: string; config: WebhookConfig }[] {
  return Array.from(webhooks.entries()).map(([id, config]) => ({ id, config }));
}

/**
 * Send webhook notification
 */
export async function sendWebhookNotification(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const matchingWebhooks = Array.from(webhooks.values()).filter(
    w => w.active && w.events.includes(event)
  );

  const sendPromises = matchingWebhooks.map(async (webhook) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        const signature = await generateSignature(JSON.stringify(payload), webhook.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Webhook failed: ${webhook.url} - ${response.status}`);
      }
    } catch (error) {
      console.error(`Webhook error: ${webhook.url}`, error);
    }
  });

  await Promise.allSettled(sendPromises);
}

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Helper: Notify document events
 */
export async function notifyDocumentEvent(
  event: WebhookEvent,
  documentId: string,
  additionalData?: Record<string, unknown>
): Promise<void> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { extractedData: true },
    });

    if (!document) return;

    await sendWebhookNotification(event, {
      documentId: document.id,
      fileName: document.originalName,
      status: document.status,
      classification: document.classification,
      extractedData: document.extractedData,
      ...additionalData,
    });
  } catch (error) {
    console.error('Failed to send document webhook:', error);
  }
}
