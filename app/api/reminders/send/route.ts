import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // This endpoint should only be called from trusted sources (cron job with API key)
  // In production, you'd add additional auth like a secret token
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const rawVapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@example.com';
  const vapidSubject = rawVapidSubject.replace(/\s+/g, '').replace('mailto:<', 'mailto:').replace('>', '');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'Push is not configured on server' }, { status: 500 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Get all pending reminders that are due
    const { data: pendingReminders, error: remindersError } = await serviceClient
      .from('reminder_schedules')
      .select('id, user_id, reminder_type, scheduled_for')
      .eq('notification_sent', false)
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      return NextResponse.json({ error: 'Failed to fetch reminders', sent: 0 });
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'No pending reminders' });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    let sentCount = 0;
    const reminderIds: string[] = [];

    // Group by user and send notifications
    const remindersByUser = new Map<string, any[]>();
    pendingReminders.forEach((reminder: any) => {
      if (!remindersByUser.has(reminder.user_id)) {
        remindersByUser.set(reminder.user_id, []);
      }
      remindersByUser.get(reminder.user_id)!.push(reminder);
      reminderIds.push(reminder.id);
    });

    // Send notifications to each user
    const userArray = Array.from(remindersByUser.entries());
    for (let idx = 0; idx < userArray.length; idx++) {
      const [userId, reminders] = userArray[idx];
      // Get user's subscriptions
      const { data: subscriptions, error: subsError } = await serviceClient
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId);

      if (subsError || !subscriptions || subscriptions.length === 0) {
        continue;
      }

      // Determine which type of reminder to send (prioritize evening over hourly)
      const hasEveningReminder = reminders.some((r: any) => r.reminder_type === 'evening_last_chance');
      const reminderType = hasEveningReminder ? 'evening_last_chance' : 'hourly';

      let title = 'Keep Your Streak Alive! 🔥';
      let body = 'Don\'t lose your progress, open Ramadan Quest now!';
      
      if (reminderType === 'evening_last_chance') {
        title = '🌙 Last Chance Tonight!';
        body = 'Your streak resets in 3 hours. Complete your deeds now!';
      } else {
        title = '⏰ Daily Reminder';
        body = 'Keep your streak alive - check in to Ramadan Quest!';
      }

      const payload = JSON.stringify({
        title,
        body,
        url: '/dashboard',
        tag: `reminder-${reminderType}`,
      });

      // Send to all subscriptions
      await Promise.all(
        subscriptions.map(async (subscription: any) => {
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
    }

    // Mark reminders as sent
    if (reminderIds.length > 0) {
      await serviceClient
        .from('reminder_schedules')
        .update({ notification_sent: true, sent_at: new Date().toISOString() })
        .in('id', reminderIds);
    }

    return NextResponse.json({ ok: true, sent: sentCount });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json({ error: 'Failed to send reminders', sent: 0 }, { status: 500 });
  }
}
