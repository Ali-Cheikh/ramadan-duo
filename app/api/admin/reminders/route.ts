import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRate = applyRateLimit(`admin:reminders:list:${ip}`, 60, 60_000);
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
    // Fetch all pending reminders
    const { data: pendingReminders, error } = await supabase
      .from('reminder_schedules')
      .select('id, user_id, reminder_type, scheduled_for, notification_sent')
      .eq('notification_sent', false)
      .order('scheduled_for', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    return NextResponse.json(pendingReminders || []);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
