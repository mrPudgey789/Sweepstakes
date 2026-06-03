# Known issues (found and fixed)

## 1. Share link 404 for logged-out visitors
**Bug:** `/j/<slug>` returned 404 for anonymous visitors.
**Cause:** The join page queried `organisers!inner(display_name, email)` via the anon Supabase client. The `organisers` table RLS only allowed `auth.uid() = auth_id`, so the inner join returned nothing for anonymous users, and `notFound()` fired.
**Initial hotfix:** Added `USING (true)` SELECT policy on `organisers`. This fixed the 404 but exposed all organiser data (emails, PayPal links) to anonymous API calls.
**Proper fix:**
- Removed the blanket `USING (true)` policy.
- Changed the join page to use `createAdminClient()` (server-side only, never exposed to the browser).
- Removed `email` from the organiser select on the join page; only `display_name` is fetched.
- Created a `public_organiser_info` view exposing only `id` and `display_name` for organisers with non-draft sweepstakes.

## 2. Organiser entry matching by display name
**Bug:** The organiser's "Your team" card and next match did not show because matching was by display name, but the organiser name could differ from the player display name.
**Cause:** Compared `organiserName` to `entry.players.display_name`, which could be different strings.
**Fix:** Match by the logged-in user's email instead of display name.

## 3. Hardcoded tournament UUID
**Bug:** Multiple pages and API routes hardcoded `00000000-0000-0000-0000-000000002026` as the tournament ID, which broke after reseeding.
**Fix:** Changed all references to query by tournament name (`FIFA World Cup 2026`) dynamically.

## 4. RLS blocking player views
**Bug:** Players could only see their own entries, not other players in the same sweepstake.
**Cause:** Entries RLS policy only allowed `player_id IN (SELECT ... WHERE auth_id = auth.uid())`.
**Fix:** Created API routes (`/api/player/peers`, `/api/player/dashboard`, `/api/player/entry`) that use the admin client to bypass RLS for server-side data access.

## 5. Stale `.next` cache causing 404s on chunk files
**Bug:** After code changes, the browser would request old chunk filenames that no longer exist.
**Cause:** Hot module replacement cache mismatch.
**Fix:** Hard refresh (`Cmd+Shift+R`) or clear `.next` directory and restart dev server.

## 6. Football-data.org returning 2022 data
**Bug:** The API client fetched the 2022 World Cup instead of 2026.
**Cause:** No `season=2026` filter on API calls.
**Fix:** Added `?season=2026` to all football-data.org API calls.

## 7. Map iteration TypeScript errors on Vercel
**Bug:** `[...new Set()]` and `for (const [k,v] of map)` caused build failures on Vercel.
**Cause:** TypeScript target did not support `downlevelIteration`.
**Fix:** Used `Array.from()` and `.forEach()` instead.
