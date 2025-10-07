# RLS Quick Start Guide

## 🚀 Quick Steps to Enable RLS

### Option 1: Using Supabase Dashboard (Recommended for Production)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your Attrition project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run Migration**
   - Open the file: `supabase/migrations/20250507_enable_rls_policies.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl + Enter`

4. **Verify Success**
   ```sql
   -- Check RLS is enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   ORDER BY tablename;
   
   -- Should show rowsecurity = true for all tables
   ```

### Option 2: Using Supabase CLI (Local Development)

```bash
# If you haven't set up Supabase CLI yet
npm install -g supabase

# Link to your project (only needed once)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push

# Or run a specific migration
supabase db execute supabase/migrations/20250507_enable_rls_policies.sql
```

## ⚠️ Important Pre-Migration Checklist

- [ ] **Backup your database** (Supabase Dashboard → Database → Backups)
- [ ] **Test on staging first** if you have a staging environment
- [ ] **Verify auth.uid() is working** with your current authentication setup
- [ ] **Review policies** to ensure they match your security requirements

## 🔍 Post-Migration Verification

### 1. Check RLS Status

```sql
-- All tables should have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Should return 0 rows
```

### 2. Check Policies

```sql
-- View all policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should show policies for all 14 tables
```

### 3. Test User Access

```typescript
// In your application
const { data: myEmpire, error } = await supabase
  .from('empires')
  .select('*')
  .single();

console.log('My Empire:', myEmpire); // Should only return your empire
console.log('Error:', error); // Should be null if you're authenticated
```

### 4. Test Data Isolation

Create two test users and verify they cannot see each other's data:

```typescript
// User 1 creates some colonies
const user1Client = createClient(/* user1 credentials */);
await user1Client.from('colonies').insert({
  empire_id: user1EmpireId,
  name: 'User1 Colony'
});

// User 2 tries to view User 1's colonies
const user2Client = createClient(/* user2 credentials */);
const { data: colonies } = await user2Client
  .from('colonies')
  .select('*');

// colonies should be empty or only contain user2's colonies
```

## 🐛 Troubleshooting Common Issues

### Issue: "permission denied for table X"

**Cause**: RLS is enabled but no policies match the query.

**Solution**: 
1. Verify the user is authenticated: `SELECT auth.uid();`
2. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'X';`
3. Verify user has empire_id set: `SELECT empire_id FROM users WHERE id = auth.uid();`

### Issue: Users can't see any data after enabling RLS

**Cause**: User not authenticated or policies too restrictive.

**Solution**:
```sql
-- Check if user is authenticated
SELECT auth.uid(); -- Should return a UUID

-- Check if user has empire
SELECT empire_id FROM users WHERE id = auth.uid(); -- Should return UUID

-- If empire_id is NULL, user needs to create an empire first
```

### Issue: "function auth.uid() does not exist"

**Cause**: Supabase auth extensions not enabled.

**Solution**:
```sql
-- Enable auth extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "auth";
```

### Issue: Admin users can't access data

**Cause**: User role not set to 'admin'.

**Solution**:
```sql
-- Set user as admin (use service_role key for this)
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

## 🔄 Rolling Back (If Needed)

If you need to temporarily disable RLS:

```sql
-- ⚠️ CAUTION: This removes all security!
-- Only use for debugging, never in production

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE empires DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE colonies DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE fleets DISABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE research_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tech_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE unit_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE defense_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE tech_levels DISABLE ROW LEVEL SECURITY;
```

To completely remove policies:

```sql
-- Drop all policies (creates a migration to undo changes)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
                      policy_record.policyname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Drop helper functions
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS get_user_empire_id();
```

## 📋 Testing Checklist

After applying the migration, test these scenarios:

- [ ] Regular user can view own empire
- [ ] Regular user cannot view other empires' colonies
- [ ] Regular user can send messages
- [ ] Regular user can view received messages
- [ ] Regular user cannot modify credit_transactions
- [ ] Admin user can view all data
- [ ] Unauthenticated users can view locations
- [ ] Unauthenticated users can view empire leaderboard
- [ ] User cannot change own role to admin
- [ ] Service role can modify credit_transactions

## 📚 Additional Resources

- **Full Documentation**: See `docs/RLS_POLICIES.md` for complete details
- **Database Schema**: See migration files in `supabase/migrations/`
- **Supabase RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS Docs**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## 🆘 Need Help?

If you encounter issues:

1. Check the Supabase logs (Dashboard → Logs)
2. Review the full documentation in `docs/RLS_POLICIES.md`
3. Test queries in SQL Editor with `EXPLAIN ANALYZE`
4. Check that your authentication is working correctly

## 🎯 Next Steps

After successfully enabling RLS:

1. **Update your application code** to handle permission errors gracefully
2. **Add integration tests** for RLS policies
3. **Monitor performance** - RLS policies can add overhead
4. **Review audit logs** regularly to ensure security compliance
5. **Document any custom policies** you add in the future
