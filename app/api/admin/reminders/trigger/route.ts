import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { applyRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
const rawVapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@ali-cheikh.com';
const vapidSubject = rawVapidSubject.replace(/\s+/g, '').replace('mailto:<', 'mailto:').replace('>', '');

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
  throw new Error('Missing Supabase or VAPID environment variables');
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRate = applyRateLimit(`admin:reminders:trigger:${ip}`, 20, 60_000);
  if (!ipRate.allowed) {
    return rateLimitResponse(ipRate.retryAfterSec);
  }

  // Verify admin secret
  const adminSecret = request.headers.get('x-admin-secret');
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const { reminder_id } = requestBody;

    if (!reminder_id) {
      return NextResponse.json({ error: 'reminder_id required' }, { status: 400 });
    }

    if (!UUID_REGEX.test(reminder_id)) {
      return NextResponse.json({ error: 'Invalid reminder_id' }, { status: 400 });
    }

    // Get the reminder
    const { data: reminder, error: reminderError } = await serviceClient
      .from('reminder_schedules')
      .select('id, user_id, reminder_type, notification_sent')
      .eq('id', reminder_id)
      .maybeSingle();

    if (reminderError || !reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    if (reminder.notification_sent) {
      return NextResponse.json({ error: 'Reminder already sent' }, { status: 409 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey as string, vapidPrivateKey as string);

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await serviceClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', reminder.user_id);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No push subscriptions found for user', sent: 0 },
        { status: 400 }
      );
    }

    // Prepare notification
    const notificationTitle = reminder.reminder_type === 'evening_last_chance'
      ? '🌙 Last Chance Tonight!'
      : '⏰ Daily Reminder';

    const notificationBody = reminder.reminder_type === 'evening_last_chance'
      ? 'Your streak resets in 3 hours. Complete your deeds now!'
      : 'Keep your streak alive - check in to Ramadan Quest!';

    const payload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      url: '/dashboard',
      tag: `reminder-${reminder.reminder_type}`,
    });

    // Send to all subscriptions
    let sentCount = 0;
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload
          );
          sentCount += 1;
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await serviceClient.from('push_subscriptions').delete().eq('id', subscription.id);
          }
        }
      })
    );

    // Mark as sent
    await serviceClient
      .from('reminder_schedules')
      .update({ notification_sent: true, sent_at: new Date().toISOString() })
      .eq('id', reminder_id);

    return NextResponse.json({ ok: true, sent: sentCount, message: 'Reminder triggered manually' });
  } catch (error) {
    console.error('Error triggering reminder:', error);
    return NextResponse.json({ error: 'Failed to trigger reminder', sent: 0 }, { status: 500 });
  }
}
