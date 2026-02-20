# Retention Reminders - Cron Job Setup

## Overview
The retention reminder system requires an external cron job to periodically send scheduled notifications. This prevents notifications from being sent only when users open the app.

## Setup Instructions

### Option 1: Using EasyCron (Free, Simple)

1. Go to https://www.easycron.com
2. Click "Add a cron job"
3. Set up:
   - **URL to call:** `https://ramadan-duo.vercel.app/api/reminders/send`
   - **HTTP Method:** POST
   - **Cron Expression:** `*/5 * * * *` (every 5 minutes)
   - **HTTP headers:** (optional, for future auth if needed)

4. Click "Create"

## Monitoring

### Check cron job execution:
```sql
-- In Supabase SQL Editor
SELECT id, user_id, reminder_type, scheduled_for, notification_sent, sent_at
FROM reminder_schedules
WHERE scheduled_for <= now()
ORDER BY sent_at DESC
LIMIT 10;
```

### Check failed subscriptions (dead endpoints):
```sql
-- Should be cleaned up automatically
SELECT COUNT(*) FROM push_subscriptions;
```

## Timing Recommendations

| Frequency | Pros | Cons |
|-----------|------|------|
| Every 5 min | Fast delivery, timely | May exceed free tier quotas |
| Every 15 min | Balanced | ~1 min delay in notifications |
| Every 30 min | Low cost | Users might lose reminders |
| Every hour | Minimal load | Defeats purpose of timely reminders |

**Recommendation:** **Every 5-10 minutes** balances delivery speed with cost.

## Timezone Considerations

The evening "last chance" reminder is calculated in GMT+1 (Tunisia time):
- Scheduled for **3:00 AM GMT+1** daily (before 3:30 AM reset)
- System automatically skips if already past 3 AM
- Next day's reminder created automatically

## Cost Estimation

**Vercel Free Tier:**
- 10,000 function invocations/month
- Every 5 min × 60 min × 24 hours × 30 days = 8,640 cron calls/month
- **Status:** ✅ Well within free tier

**Web Push Notifications:**
- Depends on subscriber count
- Each notification = micro cost on Supabase
- **Recommendation:** Monitor `/api/reminders/send` response for `sent` count

## Troubleshooting

### Reminders not sending?

1. Check cron job is triggering:
   - Visit `/api/reminders/send` manually
   - Should return `{ ok: true, sent: X }`

2. Check pending reminders exist:
   ```sql
   SELECT * FROM reminder_schedules 
   WHERE notification_sent = false 
   AND scheduled_for < now();
   ```

3. Check user has active subscriptions:
   ```sql
   SELECT COUNT(*) FROM push_subscriptions 
   WHERE user_id = '{USER_ID}';
   ```

4. Check service worker is registered:
   - Open DevTools → Application → Service Workers
   - Should see registered `/sw.js`

### Too many reminders?

The system deduplicates by using:
- `reminder_type` + `user_id` uniqueness
- `notification_sent` flag to prevent re-sends
- If issues persist, manually clear old schedules:

```sql
DELETE FROM reminder_schedules 
WHERE notification_sent = true 
AND sent_at < now() - interval '7 days';
```

## Future Enhancements

- [ ] Skip reminder if user already completed deeds today
- [ ] Vary messaging based on current streak length
- [ ] A/B test different reminder times (3 AM vs 10 PM)
- [ ] User settings to customize reminder frequency
- [ ] "Do Not Disturb" hours (e.g., skip midnight-6 AM)
- [ ] Smart batching (send max 1 notification per hour per user)
