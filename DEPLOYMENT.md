# Deployment Checklist

## Pre-Deployment

### Database Migrations
- [ ] Run `20260221_create_achievements_table.sql` in Supabase SQL Editor
- [ ] Run `20260221_add_achievements_rpc.sql`
- [ ] Run `20260221_add_rank_tracking.sql`
- [ ] Run `20260221_add_retention_reminders.sql`
- [ ] Verify tables created: `achievements`, `reminder_schedules`, `rank_changes`

### Code Review
- [ ] No TypeScript errors in:
  - `app/dashboard/page.tsx`
  - `components/dashboard/stats-tab.tsx`
  - `app/api/reminders/send/route.ts`
  - `app/api/push/send/route.ts`
- [ ] Service worker (`public/sw.js`) updated
- [ ] Manifest (`public/manifest.json`) created
- [ ] All imports validated

### Environment
- [ ] All required `.env` variables present (no new ones added)
- [ ] VAPID keys valid and in place
- [ ] Supabase service role key accessible

## Deployment Steps

### 1. Push to Vercel
```bash
git add .
git commit -m "feat: add achievements, retention reminders, and stats tab"
git push origin main
```
- [ ] Deployment triggers automatically
- [ ] Build succeeds (check Vercel dashboard)
- [ ] No runtime errors in logs

### 2. Test on Live App
- [ ] Open https://ramadan-duo.vercel.app
- [ ] Log in to dashboard
- [ ] Tab navigation works (Tracker, Leaderboard, Friends, Stats)
- [ ] Stats tab loads with empty/populated achievements

### 3. Test Notifications
- [ ] Request notification permission → should trigger
- [ ] Enable notifications → should subscribe to push
- [ ] Send nudge from friend → should show personalized notification
- [ ] Check service worker in DevTools

### 4. Set Up Cron Job
- [ ] Choose cron provider (EasyCron recommended for easy setup)
- [ ] Configure to call `/api/reminders/send` every 5-10 minutes
- [ ] Note cron job URL (for manual triggers if needed)
- [ ] Test manual trigger: `curl -X POST https://ramadan-duo.vercel.app/api/reminders/send`
- [ ] Should return `{ "ok": true, "sent": 0 }` (0 sent initially)

### 5. Test Full Flow
Complete this sequence:
1. [ ] Log in
2. [ ] Complete all 12 deeds (to reach 1 day progress)
3. [ ] Should see toast: "Push notifications enabled" or "Reminders scheduled"
4. [ ] Check stats tab → should show 1 day committed
5. [ ] Wait for or manually trigger cron job
6. [ ] Should receive hourly + evening reminders (check phone notifications)
7. [ ] Repeat deed completion 3 times → should see streak badge `🔥 3-Day Streak!`
8. [ ] Open stats tab → should see badge displayed

## Post-Deployment Monitoring

### Daily Checks (First Week)
- [ ] Check error logs in Vercel
- [ ] Monitor cron job execution (should see entries in task logs)
- [ ] Verify no database errors in Supabase logs
- [ ] Monitor push notification delivery rate
- [ ] Check user feedback for any issues

### Weekly Checks
- [ ] Review analytics:
  - How many users enabled notifications?
  - How many reminders sent?
  - How many clicked notifications?
- [ ] Check database growth:
  - How many achievements earned?
  - How many streak milestones hit?

### Monthly Checks
- [ ] Review retention metrics
- [ ] Analyze notification open rates
- [ ] Gather user feedback on notification frequency
- [ ] Consider adjustments (more/fewer reminders, timing changes)

## Rollback Plan

If critical issues occur:

1. **Disable reminders immediately:**
   ```sql
   UPDATE reminder_schedules SET notification_sent = true;
   ```

2. **Disable cron job:**
   - Pause in EasyCron or remove Vercel cron config

3. **Revert code:**
   ```bash
   git revert HEAD
   git push origin main
   ```

4. **Clear stale schedules:**
   ```sql
   DELETE FROM reminder_schedules;
   ```

## Success Metrics

After deployment, track:

- **Notification Permission Rate:** % of users granting permission
- **Notification Open Rate:** % of notifications clicked
- **Reminder Effectiveness:** Do reminders reduce churn?
- **Achievement System:** Are users motivated by streaks?
- **App Installs:** Any increase after PWA manifest?
- **Daily Active Users:** Trend before/after retention messaging

## Known Limitations

- ⚠️ Reminders require external cron job (not automatic)
- ⚠️ Notifications only work if user granted permission
- ⚠️ Browser must support Web Push API (all modern browsers do)
- ⚠️ Notifications may not show if PWA not installed (depends on browser)

## Questions?

Refer to:
- `FEATURES_IMPLEMENTED.md` - Full feature details
- `CRON_SETUP.md` - Cron job setup guide
- Migration files in `supabase/migrations/` for SQL details
