# Setup Guide

How to deploy Ramadan Quest for your own country or community.

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account
- Git

---

## 1. Clone and install

```bash
git clone https://github.com/your-repo/ramadan-quest.git
cd ramadan-quest
npm install
```

---

## 2. Configure your regions

Open `lib/deed-utils.ts` and replace the regions array with your own states, provinces, or governorates:

```typescript
export const REGIONS = [
  'Region A',
  'Region B',
  'Region C',
  // ...
];
```

The same `REGIONS` export is used by the profile selector and leaderboard filter, so you only need to change it in one place.

---

## 3. Set your timezone

The daily reset is calculated in `lib/deed-utils.ts`. The current implementation uses a hardcoded UTC offset, which breaks during daylight saving time. Replace it with this DST-safe version:

```typescript
// Set these two values for your deployment
const TIMEZONE = 'Africa/Tunis'; // IANA timezone name — see full list below
const RESET_HOUR = 2;            // Hour at which the day resets (24h format)

export function getTodayDateWithReset(): string {
  const now = new Date();

  // Get the current hour in the target timezone — handles DST automatically
  const hourInZone = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(now),
    10
  );

  // Get today's date string in the target timezone
  const dateInZone = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, // en-CA gives YYYY-MM-DD format
  }).format(now);

  // If we're before the reset hour, treat it as the previous day
  if (hourInZone < RESET_HOUR) {
    const d = new Date(dateInZone);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  return dateInZone;
}
```

**Common IANA timezone names:**

| Country / Region | Timezone |
|---|---|
| Tunisia, Algeria, most of W. Europe | `Africa/Tunis` / `Europe/Paris` |
| Egypt, South Africa, Eastern Europe | `Africa/Cairo` / `Europe/Helsinki` |
| Saudi Arabia, Iraq, Kuwait | `Asia/Riyadh` |
| Pakistan | `Asia/Karachi` |
| Bangladesh | `Asia/Dhaka` |
| Malaysia, Indonesia (West) | `Asia/Kuala_Lumpur` |
| Turkey | `Europe/Istanbul` |
| UK | `Europe/London` |
| US Eastern | `America/New_York` |
| US Central | `America/Chicago` |
| US Pacific | `America/Los_Angeles` |

The full list is at [en.wikipedia.org/wiki/List_of_tz_database_time_zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

> **Why not use `getTime() + offset`?** Fixed offsets break when clocks change for daylight saving time. IANA timezone strings let the platform handle those transitions correctly.

---

## 4. Update the database defaults

Edit `supabase/migrations/00000000000000_complete_schema.sql` and update the default region to a sensible value for your deployment:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Ramadan Warrior',
  region text NOT NULL DEFAULT 'Your Default Region', -- ← change this
  -- ...
);
```

Also update the mock seed data if present:

```sql
INSERT INTO profiles (id, display_name, region, avatar_color, month_total_points) VALUES
  ('11111111-...', 'Test User 1', 'Your Region', '#7c3aed', 11),
  ('22222222-...', 'Test User 2', 'Your Region', '#dc2626', 10)
ON CONFLICT (id) DO NOTHING;
```

---

## 5. Connect Supabase

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then run the migrations in order in Supabase SQL Editor:

1. `supabase/migrations/00000000000000_run_first.sql` (base schema)
2. `supabase/migrations/20260220_register_push_subscription_rpc.sql` (if using push notifications)
3. `supabase/migrations/20260221_*.sql` (achievements, reminders, etc.)

For each file:
1. Open your Supabase project → SQL Editor
2. Paste the file contents
3. Run it

---

## 6. Test locally

```bash
npm run dev
```

Go to `http://localhost:3000` and verify:

- Sign up and log in
- Region dropdown shows your regions  
- Completing a deed saves correctly and updates points
- The leaderboard loads with your user
- The daily reset fires at the right time (check console: `getTodayDateWithReset()`)
- If achievements migrations ran: Stats tab should load with badge guide
- If push migrations ran: Friends tab should show "Enable notifications" option

**Verify database tables exist:**

Open Supabase SQL Editor and run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Should show at least: `profiles`, `daily_logs`, `daily_stats`, `friend_requests`, `friend_nudges`, `push_subscriptions`

Optional (if you ran all migrations): `achievements`, `reminder_schedules`, `rank_changes`

---

## 6b. Configure Push Notifications (Optional)

To enable browser push notifications and retention reminders:

### Generate VAPID Keys

Run this command to generate a VAPID key pair:

```bash
npx web-push generate-vapid-keys
```

Add the keys to your `.env.local`:

```
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:your-email@domain.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Set Up Retention Reminders Cron Job

After deployment, configure a cron job to send scheduled notifications. See [CRON_SETUP.md](./CRON_SETUP.md) for detailed instructions.

**Quick option:** Use [EasyCron](https://www.easycron.com):
- URL: `https://your-domain.com/api/reminders/send`
- Method: POST
- Schedule: `*/5 * * * *` (every 5 minutes)

---

## 7. Deploy

**Vercel:**
```bash
vercel deploy
```

**Netlify:**
```bash
npm run build
netlify deploy
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in your hosting dashboard.

---

## File reference

| File | What to change |
|---|---|
| `lib/deed-utils.ts` | `REGIONS`, `TIMEZONE`, `RESET_HOUR` |
| `supabase/migrations/00000000000000_run_first.sql` | Default region (line ~65), seed data (optional) |
| `app/layout.tsx` | Page title, description, manifest |
| `.env.local` | Supabase keys, VAPID keys (if using push notifications) |

---

## Troubleshooting

**Migration errors:** Check Supabase Dashboard → SQL Editor → Logs. Make sure you run migrations in order. If a migration fails, fix the issue and re-run just that file.

**Wrong date showing for users:** Verify `TIMEZONE` is the correct IANA string. Log `getTodayDateWithReset()` in the browser console to check.

**Regions not appearing in dropdown:** Make sure `REGIONS` is exported from `deed-utils.ts` and imported in `profile-settings.tsx`.

**Database errors on signup:** Check that migrations ran without errors and RLS policies are enabled. Supabase Dashboard → Logs will show details.

**Leaderboard showing stale data:** Verify timezone is correct (see step 3). Both tracker and leaderboard use `getTodayDateWithReset()`.

**Stats/achievements tab not showing:** Make sure `20260221_create_achievements_table.sql` was run. Check that `achievements` table exists in Supabase.

**Notifications not working:** 
1. Verify VAPID keys are set in `.env.local`
2. Check `/api/push/public-key` returns valid key via browser DevTools
3. Ensure service worker is registered (DevTools → Application → Service Workers)
4. Browser must support Web Push API (all modern browsers do)