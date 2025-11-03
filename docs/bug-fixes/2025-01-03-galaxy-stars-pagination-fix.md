# Galaxy Stars Pagination Bug Fix

**Date:** January 3, 2025  
**Status:** ✅ Fixed  
**Severity:** Critical - 65% of regions showing no stars

---

## Summary

Fixed a critical bug where **65 out of 100 galaxy regions (25-99)** were showing no stars despite stars existing in the database. The root cause was **Supabase's default 1000-row query limit** cutting off results before all stars could be fetched.

---

## Symptoms

- Regions 0-24: ✅ Stars displayed correctly
- **Regions 25-34: ❌ No stars displayed (10 regions affected)**
- Regions 35-44: ✅ Stars displayed correctly
- **Regions 45-99: ❌ No stars displayed (55 regions affected)**

**Total affected:** 65 regions with stars in the database but not rendering in the client.

---

## Root Cause Analysis

### Investigation Process

1. **Initial hypothesis:** Stars not being set on system objects in client
   - Added debug logging to GalaxyView.ts
   - Found API was returning 0 stars for affected regions

2. **Database verification:** Checked if stars existed in database
   - Queried Supabase directly for region 25
   - **Found 38 stars in region 25 in the database**
   - Confirmed stars exist but API wasn't returning them

3. **API query analysis:** Tested the exact API endpoint logic
   - Pattern `A00:25:%:00` (specific region): ✅ Returned 38 stars
   - Pattern `A00:%:%:00` (entire galaxy): ❌ Returned 0 stars for region 25
   - Total stars returned by galaxy query: **1,000 exactly**

4. **Pagination discovery:** 
   - Supabase has a **default row limit of 1,000 records**
   - Galaxy 0 has **3,551 total stars**
   - Query was being cut off after 1,000 results
   - Stars for regions 25+ were beyond the 1,000-row cutoff

### Technical Details

**Before Fix:**
```typescript
const { data: stars } = await supabase
  .from(DB_TABLES.LOCATIONS)
  .select('coord, star_overhaul')
  .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'star')
  .like('coord', like);
// Returns only first 1000 rows - missing 2,551 stars!
```

**After Fix:**
```typescript
// Fetch ALL stars using pagination
let allStars: any[] = [];
let from = 0;
const pageSize = 1000;
let hasMore = true;

while (hasMore) {
  const { data: stars, error } = await supabase
    .from(DB_TABLES.LOCATIONS)
    .select('coord, star_overhaul')
    .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'star')
    .like('coord', like)
    .range(from, from + pageSize - 1);
  
  if (error) throw error;
  
  if (stars && stars.length > 0) {
    allStars = allStars.concat(stars);
    from += pageSize;
    hasMore = stars.length === pageSize;
  } else {
    hasMore = false;
  }
}
// Now fetches all 3,551 stars across 4 pages!
```

---

## Fix Implementation

### Files Changed

1. **`packages/server/src/routes/universe.ts`**
   - Added pagination loop to `/api/universe/galaxy/:server/:galaxy/regions` endpoint (line 365-393)
   - Added pagination loop to `/api/universe/galaxy/:server/:galaxy/region-stars` endpoint (line 424-474)
   - Both endpoints now fetch ALL stars using `range()` pagination

2. **`packages/client/src/components/game/map-next/views/GalaxyView.ts`**
   - Removed debug logging (was used to diagnose the issue)
   - Client code was working correctly - no functional changes needed

### Testing Results

**Before Fix:**
- Pages fetched: 1 (implicit default limit)
- Stars returned: 1,000
- Regions with data: 35/100
- Region 25 stars: 0 ❌

**After Fix:**
- Pages fetched: 4 (1000 + 1000 + 1000 + 551)
- Stars returned: 3,551
- Regions with data: 100/100 ✅
- Region 25 stars: 38 ✅

---

## Impact

### Performance
- **Marginal increase in API response time** (4 sequential queries vs 1)
- Each page takes ~100-200ms, total ~400-800ms for full galaxy
- **Still acceptable for UX** - galaxy loads once on navigation
- **Future optimization:** Could parallelize page fetches if needed

### Correctness
- ✅ All 100 regions now render correctly
- ✅ All 3,551 stars now display
- ✅ Star density matches actual game data
- ✅ No more "ghost" empty regions

---

## Lessons Learned

### What Went Well
1. **Systematic debugging approach** - ruled out client, then API, then database
2. **Direct database verification** - confirmed data existence before fixing code
3. **Incremental testing** - tested pagination logic before deploying
4. **Clear commit messages** - documented the bug and fix for future reference

### What Could Be Improved
1. **Default limits should be documented** - easy to forget Supabase defaults
2. **Add monitoring** - detect when queries hit row limits
3. **Consider batch endpoints** - pre-paginated data for known-large queries
4. **Load testing** - would have caught this with a full galaxy scan

### Prevention for Future
- ✅ **Always use `.range()` or explicit `.limit()`** when querying large datasets
- ✅ **Test with production-scale data** - our test galaxy had < 1000 stars
- ✅ **Add query result count logging** - log when we get exactly 1000 results (likely a limit)
- ✅ **Document expected data sizes** - "Galaxy has ~3500 stars, plan for pagination"

---

## Related Issues

- Original issue: Stars not rendering in galaxy view
- Symptom: Regions 25-34 and 45-99 showing as empty
- Discovery: User reported "I bet stars exist" - they were right!

---

## Commits

- `7bd3f7e` - fix(server): add pagination to fetch all galaxy stars
- `70a2301` - chore(client): remove debug logging from GalaxyView

---

## Verification Steps

To verify the fix is working:

1. Start the dev server: `pnpm run dev`
2. Navigate to Galaxy view in the game client
3. Check browser console for star counts per region
4. Verify regions 25, 26, 27, etc. now show stars
5. Confirm all 100 regions have star data (some may have 0 naturally)

Expected console output:
```
[GalaxyView] Pre-loaded ALL systems (100 per region) for 100 regions, with star colors applied where available
```

---

## Additional Notes

### Why This Bug Was Hidden

1. **Development galaxies had < 1000 stars** - never hit the limit during testing
2. **Query worked "mostly"** - 35% of regions showed stars, looked plausible
3. **No warning from Supabase** - silently truncated results at 1000
4. **Region numbering pattern** - regions 0-24 and 35-44 worked, seemed random

### Why Pagination Wasn't Initially Used

The original code assumed `.like()` queries would return all matching rows. This is a common assumption when coming from traditional SQL where queries return full result sets by default. Supabase's PostgREST API enforces pagination for safety/performance, which is good practice but can catch developers off guard.

### Future Improvements

Consider these optimizations if API response time becomes an issue:

1. **Parallel pagination:**
   ```typescript
   const pages = await Promise.all([
     fetchPage(0, 1000),
     fetchPage(1000, 2000),
     fetchPage(2000, 3000),
     fetchPage(3000, 4000)
   ]);
   ```

2. **Server-side caching:** Cache galaxy star data for 5-10 minutes
3. **Client-side caching:** Store in IndexedDB, invalidate on universe regeneration
4. **Batch API endpoint:** `/api/universe/galaxy/:server/:galaxy/all-data` that pre-paginates on server

---

**Status:** ✅ **RESOLVED** - All 100 regions now render correctly with proper star data.
