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
  auth: { persistSession: false, autoRefreshToken: false },
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRate = applyRateLimit(`admin:reminders:cancel:${ip}`, 30, 60_000);
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
    const body = await request.json();
    const { reminder_id } = body;

    if (!reminder_id) {
      return NextResponse.json({ error: 'reminder_id required' }, { status: 400 });
    }

    if (!UUID_REGEX.test(reminder_id)) {
      return NextResponse.json({ error: 'Invalid reminder_id' }, { status: 400 });
    }

    // Delete the reminder
    const { error: deleteError } = await supabase
      .from('reminder_schedules')
      .delete()
      .eq('id', reminder_id);

    if (deleteError) {
      console.error('Error deleting reminder:', deleteError);
      return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Reminder cancelled and deleted' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
