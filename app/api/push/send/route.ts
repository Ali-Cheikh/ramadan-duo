import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

type SendPushBody = {
  toUserId: string;
  message: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRate = applyRateLimit(`push:send:ip:${ip}`, 120, 60_000);
  if (!ipRate.allowed) {
    return rateLimitResponse(ipRate.retryAfterSec);
  }

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

  const senderRate = applyRateLimit(`push:send:user:${senderId}`, 20, 60_000);
  if (!senderRate.allowed) {
    return rateLimitResponse(senderRate.retryAfterSec);
  }

  if (!body?.toUserId || !body?.message) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!UUID_REGEX.test(body.toUserId)) {
    return NextResponse.json({ error: 'Invalid target user id' }, { status: 400 });
  }

  const pairRate = applyRateLimit(`push:send:pair:${senderId}:${body.toUserId}`, 5, 60_000);
  if (!pairRate.allowed) {
    return rateLimitResponse(pairRate.retryAfterSec);
  }

  const sanitizedMessage = body.message.trim();
  if (!sanitizedMessage || sanitizedMessage.length > 280) {
    return NextResponse.json({ error: 'Message must be 1-280 characters' }, { status: 400 });
  }

  // Get sender's username for personalized notification
  const { data: senderProfile, error: senderError } = await serviceClient
    .from('profiles')
    .select('username, display_name')
    .eq('id', senderId)
    .maybeSingle();

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

  const senderName = senderProfile?.username || senderProfile?.display_name || 'A friend';
  const notificationTitle = `🌙 ${senderName} nudged you!`;
  
  const payload = JSON.stringify({
    title: notificationTitle,
    body: sanitizedMessage,
    url: '/dashboard/friends',
    tag: 'nudge-notification',
    requireInteraction: false,
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
