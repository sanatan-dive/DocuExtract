import { NextRequest, NextResponse } from 'next/server';
import { 
  registerWebhook, 
  unregisterWebhook, 
  listWebhooks, 
  WebhookEvent 
} from '@/lib/webhooks/webhookService';
import { v4 as uuidv4 } from 'uuid';

// List all webhooks
export async function GET() {
  try {
    const webhooks = listWebhooks();
    return NextResponse.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error('List webhooks error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}

// Register a new webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, secret, events } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one event type is required' },
        { status: 400 }
      );
    }

    const validEvents: WebhookEvent[] = [
      'document.uploaded',
      'document.processing',
      'document.completed',
      'document.failed',
      'batch.started',
      'batch.completed',
    ];

    const invalidEvents = events.filter((e: string) => !validEvents.includes(e as WebhookEvent));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    const id = uuidv4();
    registerWebhook(id, {
      url,
      secret,
      events,
      active: true,
    });

    return NextResponse.json({
      success: true,
      data: { id, url, events },
      message: 'Webhook registered successfully',
    });

  } catch (error) {
    console.error('Register webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register webhook' },
      { status: 500 }
    );
  }
}

// Delete a webhook
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Webhook ID required' },
        { status: 400 }
      );
    }

    unregisterWebhook(id);

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted',
    });

  } catch (error) {
    console.error('Delete webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
