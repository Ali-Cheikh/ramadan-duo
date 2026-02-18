# Ramadan Quest - Technical Setup Guide (International)

This document contains all technical steps required to adapt Ramadan Quest for users in the US, Europe, or any other country.

## Overview

The app is currently configured for Tunisia with:
- 24 governorates
- GMT+1 timezone
- 2 AM daily reset

To support US or European users, you will update regions, timezone handling, and default database values.

---

## Prerequisites

- Node.js 18+ installed
- Supabase account
- Git installed
- Code editor (VS Code recommended)

---

## Step-by-Step Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/ramadan-duo.git
cd ramadan-duo
npm install
```

### 2. Configure Regions/States

Edit `lib/deed-utils.ts` and update the regions array:

**Current (Tunisia):**
```typescript
export const TUNISIA_REGIONS = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba',
  'Bizerte', 'Nabeul', 'Zaghouan', 'Beja',
  // ... 24 regions
];
```

**Change to your country:**
```typescript
export const YOUR_COUNTRY_REGIONS = [
  'Region 1', 'Region 2', 'Region 3',
  // ... list all your states/provinces/governorates
];
```

**Then update the export:**
```typescript
// Find and replace all instances of:
TUNISIA_REGIONS
// with:
YOUR_COUNTRY_REGIONS
```

### 3. Update Timezone Settings

Edit `lib/deed-utils.ts` and find the timezone functions:

**Current timezone (GMT+1):**
```typescript
export function getTodayDateWithReset(): string {
  const now = new Date();
  const gmtPlus1 = new Date(now.getTime() + (1 * 60 * 60 * 1000));
  
  // Reset happens at 2 AM
  if (gmtPlus1.getHours() < 2) {
    gmtPlus1.setDate(gmtPlus1.getDate() - 1);
  }
  
  return formatDate(gmtPlus1);
}
```

**Change to your timezone:**
```typescript
export function getTodayDateWithReset(): string {
  const now = new Date();
  
  // Change timezone offset (hours * 60 * 60 * 1000)
  // Examples:
  // GMT+0: 0 * 60 * 60 * 1000
  // GMT+1: 1 * 60 * 60 * 1000
  // GMT+2: 2 * 60 * 60 * 1000
  // GMT-5: -5 * 60 * 60 * 1000
  const yourTimezone = new Date(now.getTime() + (YOUR_OFFSET * 60 * 60 * 1000));
  
  // Optional: Change reset hour (currently 2 AM)
  if (yourTimezone.getHours() < YOUR_RESET_HOUR) {
    yourTimezone.setDate(yourTimezone.getDate() - 1);
  }
  
  return formatDate(yourTimezone);
}
```

### 4. Update Database Schema

Edit `supabase/migrations/00000000000000_complete_schema.sql`:

**Find and update default region:**
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Ramadan Warrior',
  region text NOT NULL DEFAULT 'Tunis',  -- Change this to your capital/main city
  -- ...
);
```

**Update mock data regions:**
```sql
INSERT INTO profiles (id, display_name, region, avatar_color, month_total_points) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test User 1', 'YourRegion1', '#7c3aed', 11),
  ('22222222-2222-2222-2222-222222222222', 'Test User 2', 'YourRegion2', '#dc2626', 10)
ON CONFLICT (id) DO NOTHING;
```

### 5. Setup Supabase

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy your project URL and anon key

2. **Create `.env.local` file:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. **Run Database Migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy entire content of `supabase/migrations/00000000000000_complete_schema.sql`
   - Paste and run in SQL Editor

### 6. Update Branding (Optional)

**Change app name in multiple files:**

`app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: 'Your Country Name - Ramadan Quest',
  description: 'Ramadan habit tracker for Your Country',
};
```

`app/page.tsx`:
```typescript
<h1 className="text-4xl font-bold text-white">
  Your Country Ramadan Quest
</h1>
```

### 7. Update Region Validation

Edit `components/dashboard/profile-settings.tsx`:

Find the region selector and update options:
```typescript
<select
  value={editedProfile.region}
  onChange={(e) => setEditedProfile({...editedProfile, region: e.target.value})}
  className="w-full p-2 border rounded-md"
>
  {YOUR_COUNTRY_REGIONS.map(region => (
    <option key={region} value={region}>{region}</option>
  ))}
</select>
```

### 8. Test the Setup

1. **Start development server:**
```bash
npm run dev
```

2. **Open browser:**
```
http://localhost:3000
```

3. **Test the flow:**
   - Sign up with test account
   - Check if region dropdown shows your regions
   - Complete a deed and verify timezone works
   - Check leaderboard displays correctly

### 9. Deploy to Production

**Option A: Vercel (Recommended)**
```bash
npm run build
vercel deploy
```

**Option B: Netlify**
```bash
npm run build
netlify deploy
```

Add environment variables in your hosting platform dashboard.

---

## US and Europe Examples

### United States (single timezone build)

If you plan to launch to a single US timezone (for example, only EST users), set a single offset:

```typescript
const estTime = new Date(now.getTime() + (-5 * 60 * 60 * 1000));
```

If you need true multi-timezone behavior in the US, consider storing a timezone per user and calculating reset per user on the server.

### United Kingdom (GMT)

```typescript
const ukTime = new Date(now.getTime() + (0 * 60 * 60 * 1000));
```

### Central Europe (CET / GMT+1)

```typescript
const cetTime = new Date(now.getTime() + (1 * 60 * 60 * 1000));
```

### Eastern Europe (EET / GMT+2)

```typescript
const eetTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
```

### Example 1: United States
```typescript
// 50 states
export const USA_REGIONS = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  // ... all 50 states
];

// EST timezone (GMT-5)
const estTime = new Date(now.getTime() + (-5 * 60 * 60 * 1000));
```

### Example 2: Saudi Arabia
```typescript
// 13 provinces
export const SAUDI_REGIONS = [
  'Riyadh', 'Makkah', 'Madinah', 'Eastern Province',
  'Asir', 'Tabuk', 'Qassim', 'Ha\'il', 'Jizan',
  'Najran', 'Al Bahah', 'Northern Borders', 'Al Jawf'
];

// AST timezone (GMT+3)
const astTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
```

### Example 3: Malaysia
```typescript
// 13 states + 3 federal territories
export const MALAYSIA_REGIONS = [
  'Johor', 'Kedah', 'Kelantan', 'Malacca', 'Negeri Sembilan',
  'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak',
  'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
];

// MYT timezone (GMT+8)
const mytTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
```

---

## Key Files Reference

| File | Purpose | What to Change |
|------|---------|----------------|
| `lib/deed-utils.ts` | Core logic | Regions array, timezone functions |
| `components/dashboard/profile-settings.tsx` | Profile editing | Region selector |
| `components/dashboard/leaderboard.tsx` | Rankings | Region filtering |
| `supabase/migrations/00000000000000_complete_schema.sql` | Database | Default region, mock data |
| `app/page.tsx` | Landing page | Branding, country name |
| `app/layout.tsx` | App metadata | Title, description |

---

## Troubleshooting

### Issue: Wrong timezone displaying
**Solution:** Check `getTodayDateWithReset()` offset calculation. Test with `console.log(new Date())`.

### Issue: Regions not showing in dropdown
**Solution:** Verify region array is exported and imported correctly in profile-settings.tsx.

### Issue: Database errors
**Solution:** Ensure migration ran successfully. Check Supabase logs for RLS policy issues.

### Issue: Leaderboard showing wrong data
**Solution:** Check if timezone affects date comparison in leaderboard queries.

---

## Support

For issues or questions:
1. Check [GitHub Issues](https://github.com/your-repo/ramadan-duo/issues)
2. Review Supabase documentation
3. Test with mock data first before going live

---

## License

This project is open source. Feel free to adapt for your country/region.

---

**Ready to customize?** Start with Step 1 and work through each section carefully. Test thoroughly before deploying to production! 🚀
