# Row Level Security (RLS) Policies for Attrition Game

## Overview

This document explains the Row Level Security policies implemented for the Attrition game database. RLS ensures that users can only access data they are authorized to see, providing a critical security layer for our multiplayer game.

## Security Model

### Core Principles

1. **User Isolation**: Each user can only access data for their own empire
2. **Admin Access**: Admins have full access to all data
3. **Public Information**: Some data (like locations and empire leaderboards) is publicly readable
4. **Audit Trail Protection**: Transaction history is read-only for users

### Authentication Context

All policies rely on Supabase's `auth.uid()` function, which returns the currently authenticated user's ID. This is automatically populated when users authenticate through Supabase Auth.

## Migration Application

### Applying the Migration

To apply the RLS policies to your Supabase instance:

```bash
# Using Supabase CLI
supabase db push

# Or apply directly to your Supabase project
# Go to SQL Editor in Supabase Dashboard and run the migration file
```

### Testing the Migration

After applying, you can verify RLS is enabled:

```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View all policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## Policy Breakdown by Table

### Users Table

**Security Model**: Users can view and edit their own profile, admins have full access.

- ✅ Users can **view** their own profile
- ✅ Users can **update** their own profile (except role)
- ✅ Anyone can **insert** new users (for registration)
- ✅ Admins have **full access**

**Key Features**:
- Users cannot change their own role (prevents privilege escalation)
- Registration is open (new users can sign up)

### Empires Table

**Security Model**: Users manage their own empire, public viewing for leaderboards.

- ✅ Users can **view** their own empire
- ✅ Users can **update** their own empire
- ✅ Users can **create** their empire
- ✅ Everyone can **view** all empires (for leaderboards)
- ✅ Admins have **full access**

**Key Features**:
- Public read access allows for leaderboards and empire discovery
- Users can only modify their own empire data

### Locations Table

**Security Model**: Universe is public knowledge, but owners control their territories.

- ✅ Everyone can **view** all locations
- ✅ Owners can **update** their locations
- ✅ System can **create** locations (universe generation)
- ✅ Admins have **full access**

**Key Features**:
- All locations are visible to everyone (part of game design)
- Only the owner can modify location properties

### Game Resource Tables

The following tables follow the same pattern - users can only access resources belonging to their empire:

#### Colonies
- Users manage colonies in their empire
- Includes: view, create, update, delete

#### Buildings
- Users manage buildings in their empire
- Buildings are tied to empire_id

#### Fleets
- Users manage their own fleets
- Can view fleets at their own locations
- Includes fleet composition and positioning

#### Fleet Movements
- Users track their own fleet movements
- Complete visibility of own movement history

#### Research Projects
- Users manage their own research
- Tech tree progression tied to empire

#### Queue Tables (Tech, Unit, Defense)
- Users manage their own production queues
- Cannot view other players' queues

### Messages Table

**Security Model**: Privacy-focused messaging system.

- ✅ Users can **view** messages they sent or received
- ✅ Users can **send** messages (insert)
- ✅ Users can **update** received messages (mark as read)
- ✅ Users can **delete** their own messages
- ✅ Admins have **full access**

**Key Features**:
- Both sender and recipient can see messages
- Recipients can mark messages as read
- Either party can delete messages

### Credit Transactions Table

**Security Model**: Audit trail with restricted modification.

- ✅ Users can **view** their own transactions
- ❌ Users **cannot modify** transactions
- ✅ Only **service role** can create/modify transactions
- ✅ Admins have **full access**

**Key Features**:
- Prevents users from manipulating their credit history
- Maintains audit trail integrity
- Service role is used for backend operations

### Tech Levels Table

**Security Model**: Empire-specific tech progression.

- ✅ Users can **view** their own tech levels
- ✅ Users can **manage** their tech levels
- ✅ Admins have **full access**

## Helper Functions

### `is_admin()`

Checks if the current user has admin role.

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**: Used in all admin policies to grant full access.

### `get_user_empire_id()`

Returns the empire_id for the current user.

```sql
CREATE OR REPLACE FUNCTION get_user_empire_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT empire_id FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**Usage**: Can be used in queries to filter by user's empire efficiently.

## Security Considerations

### Performance

- Policies use indexes effectively (empire_id, user_id are indexed)
- Helper functions are marked as `STABLE` where appropriate
- Subqueries in policies are optimized by PostgreSQL

### Edge Cases

1. **Users without Empires**: New users without empires can't access empire-dependent tables until they create an empire
2. **Deleted Empires**: CASCADE deletes ensure data consistency
3. **Service Role**: Backend services need service_role credentials for system operations

### Bypassing RLS

RLS can be bypassed by:
- Using the `service_role` API key (keep this secret!)
- Direct database access with superuser privileges
- Admins through normal authenticated channels

⚠️ **Never expose service_role key to clients!**

## Testing RLS Policies

### Test as Regular User

```sql
-- Set up test context (in Supabase SQL Editor)
SET request.jwt.claims = '{"sub": "<user-uuid-here>"}';

-- Try to access different tables
SELECT * FROM empires; -- Should only see own empire
SELECT * FROM colonies; -- Should only see own colonies
SELECT * FROM users WHERE id != auth.uid(); -- Should see nothing
```

### Test as Admin

```sql
-- Update a test user to admin
UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';

-- Authenticate as admin and verify full access
SELECT * FROM users; -- Should see all users
SELECT * FROM empires; -- Should see all empires
```

### Integration Tests

Create integration tests in your application:

```typescript
// Example test
describe('RLS Policies', () => {
  it('should prevent users from seeing other empires data', async () => {
    // Authenticate as user1
    const { data: user1Colonies } = await supabase
      .from('colonies')
      .select('*');
    
    // Should only return user1's colonies
    expect(user1Colonies).toHaveLength(user1ExpectedCount);
    
    // Switch to user2
    // Should not see user1's colonies
  });
});
```

## Common Patterns

### Querying Own Data

```typescript
// Automatically filtered by RLS
const { data: myEmpire } = await supabase
  .from('empires')
  .select('*')
  .single();

const { data: myColonies } = await supabase
  .from('colonies')
  .select('*');
```

### Admin Operations

```typescript
// Set up admin client with service role (server-side only!)
const adminClient = createClient(url, SERVICE_ROLE_KEY);

const { data: allUsers } = await adminClient
  .from('users')
  .select('*');
```

### Public Queries

```typescript
// Anyone can view leaderboard
const { data: topEmpires } = await supabase
  .from('empires')
  .select('id, name, credits, base_count')
  .order('credits', { ascending: false })
  .limit(10);
```

## Maintenance

### Adding New Tables

When adding new tables:

1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Create appropriate policies based on data sensitivity
3. Test policies with different user roles
4. Update this documentation

### Modifying Policies

To modify an existing policy:

```sql
-- Drop the old policy
DROP POLICY "policy_name" ON table_name;

-- Create the new policy
CREATE POLICY "policy_name" ON table_name
  FOR operation
  USING (condition);
```

## Troubleshooting

### "Permission Denied" Errors

1. Check if RLS is enabled on the table
2. Verify the user is authenticated (auth.uid() returns a value)
3. Check if appropriate policies exist for the operation
4. Verify the user's role and empire_id are set correctly

### Performance Issues

1. Ensure indexes exist on columns used in policy conditions
2. Consider using `SECURITY DEFINER` functions for complex checks
3. Monitor query plans to identify slow policy checks

### Policy Testing

Use PostgreSQL's `EXPLAIN` to see how policies affect queries:

```sql
EXPLAIN ANALYZE
SELECT * FROM colonies
WHERE empire_id = get_user_empire_id();
```

## Related Documentation

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Attrition Database Schema](./DATABASE_SCHEMA.md)

## Version History

- **v1.0.0** (2025-05-07): Initial RLS implementation for all tables
  - Added comprehensive policies for 14 tables
  - Created helper functions for admin checks
  - Implemented empire-based access control
