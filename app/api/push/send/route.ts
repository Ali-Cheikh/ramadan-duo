import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

type SendPushBody = {
  toUserId: string;
  message: string;
};

export async function POST(request: NextRequest) {
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

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResult, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userResult?.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const senderId = userResult.user.id;
  const body = (await request.json()) as SendPushBody;

  if (!body?.toUserId || !body?.message) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: friendship, error: friendshipError } = await serviceClient
    .from('friend_requests')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${body.toUserId}),and(sender_id.eq.${body.toUserId},receiver_id.eq.${senderId})`)
    .limit(1)
    .maybeSingle();

  if (friendshipError || !friendship) {
    return NextResponse.json({ error: 'Not allowed to notify this user' }, { status: 403 });
  }

  const { data: subscriptions, error: subscriptionsError } = await serviceClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', body.toUserId);

  if (subscriptionsError) {
    return NextResponse.json({ error: 'Could not load push subscriptions' }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'No active subscriptions' });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const payload = JSON.stringify({
    title: 'Ramadan Quest',
    body: body.message,
    url: '/dashboard',
  });

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

  return NextResponse.json({ ok: true, sent: sentCount });
}
