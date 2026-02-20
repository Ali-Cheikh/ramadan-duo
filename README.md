<div style="display:flex; justify-content:space-between; align-items:center;">
  <h1>Ramadan Quest</h1>
  <img src="./public/ico.png" alt="Ramadan Quest icon" width="64" height="64" />
</div>

<p align="center">
  <img src="./public/cover.png" alt="Ramadan Quest cover" width="720" />
</p>

A Duolingo-inspired habit tracker for Ramadan. Check off daily deeds, keep your streak, compete with friends, and get notified to stay on track.

---

## Why Ramadan Quest?

Most Ramadan apps are overwhelming or abandoned after a week. Ramadan Quest keeps it simple:
- **12 deeds, not 100.** Three per spiritual pillar — enough to feel meaningful, not enough to feel like a chore.
- **One minute per day.** Check in, see your streak, and move on.
- **Stay motivated with notifications.** Friend nudges, achievement badges, and smart reminders keep you engaged without being annoying.
- **Built for any region.** Set your timezone and regions, then deploy. Works for any country.

---

## Quick Start

1. **Clone and install:**
   ```bash
   git clone https://github.com/your-repo/ramadan-quest.git
   cd ramadan-quest
   npm install
   ```

2. **Configure for your region:** See [SETUP_GUIDE.md](./SETUP_GUIDE.md)

3. **Set up Supabase:** Create a free account, run migrations

4. **Deploy:** `vercel deploy` or similar

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

## Stack

- [Next.js](https://nextjs.org) — React framework
- [Supabase](https://supabase.com) — PostgreSQL database with auth
- [shadcn/ui](https://ui.shadcn.com) — Component library
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) — Browser notifications
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) — Background sync

## Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** — How to deploy for your region, set regions/timezone
- **[FEATURES_IMPLEMENTED.md](./FEATURES_IMPLEMENTED.md)** — Complete feature breakdown
- **[CRON_SETUP.md](./CRON_SETUP.md)** — Retention reminder cron job setup
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Deployment checklist

## Features

### 📱 Daily Habit Tracking
- 12 balanced deeds grouped into 4 pillars (prayer, iman, fasting, social good)
- Daily streaks with visual progress tracking
- Month-long leaderboard to stay motivated

### 🎖️ Achievements & Badges
- Auto-awarded badges for 3, 7, 14, and 30-day streaks
- Stats dashboard showing achievements and key metrics
- Celebrate milestones with toast notifications

### 🔔 Push Notifications
- **Friend nudges:** Personalized notifications from friends
- **Retention reminders:** Hourly check-ins + evening "last chance" notifications
- **Rank changes:** Alerts when you move up/down the leaderboard
- Web push API integration with service worker

### 📲 Progressive Web App
- Install as standalone app on home screen
- Works offline with service worker
- Native app-like experience

## Push Notifications & Retention Setup

### Environment Variables

Add these to `.env.local` for push notifications:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@domain.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Migrations

Run these in order in your Supabase SQL Editor:

1. `supabase/migrations/00000000000000_run_first.sql` (base schema)
2. `supabase/migrations/20260220_register_push_subscription_rpc.sql` (push subscriptions)
3. `supabase/migrations/20260221_create_achievements_table.sql` (badges)
4. `supabase/migrations/20260221_add_achievements_rpc.sql` (achievement logic)
5. `supabase/migrations/20260221_add_rank_tracking.sql` (leaderboard tracking)
6. `supabase/migrations/20260221_add_retention_reminders.sql` (retention system)

### Cron Job for Retention Reminders

The retention reminder system requires a cron job to send scheduled notifications. See [CRON_SETUP.md](./CRON_SETUP.md) for detailed setup instructions.

**Quick start:** Use [EasyCron](https://www.easycron.com) to POST to `/api/reminders/send` every 5 minutes.

## License

MIT — open source and free to use, fork, and adapt.

---

> Independent project. Not affiliated with or endorsed by Duolingo.

*Made with ❤️ for Ramadan 2026*