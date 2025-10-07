-- Enable Row Level Security for all public tables in Attrition game
-- This migration adds comprehensive RLS policies to secure all game data

-- ======================
-- Enable RLS on all tables
-- ======================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE empires ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE colonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_levels ENABLE ROW LEVEL SECURITY;

-- ======================
-- Helper function to check if user is admin
-- ======================
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

-- ======================
-- Helper function to get user's empire_id
-- ======================
CREATE OR REPLACE FUNCTION get_user_empire_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT empire_id FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ======================
-- Users Table Policies
-- ======================
-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own non-critical fields
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their own role
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Admins have full access
CREATE POLICY "Admins have full access to users"
  ON users FOR ALL
  USING (is_admin());

-- Allow registration (insert new users)
CREATE POLICY "Allow user registration"
  ON users FOR INSERT
  WITH CHECK (true);

-- ======================
-- Empires Table Policies
-- ======================
-- Users can read their own empire
CREATE POLICY "Users can view own empire"
  ON empires FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own empire
CREATE POLICY "Users can update own empire"
  ON empires FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can create their empire
CREATE POLICY "Users can create own empire"
  ON empires FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins have full access to empires"
  ON empires FOR ALL
  USING (is_admin());

-- Allow reading basic empire info for leaderboards/public viewing
CREATE POLICY "Public can view empire names and scores"
  ON empires FOR SELECT
  USING (true);

-- ======================
-- Locations Table Policies
-- ======================
-- Everyone can view locations (universe is public knowledge)
CREATE POLICY "Everyone can view locations"
  ON locations FOR SELECT
  USING (true);

-- Only the owner can update their locations
CREATE POLICY "Owners can update own locations"
  ON locations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins have full access to locations"
  ON locations FOR ALL
  USING (is_admin());

-- System can create locations (for universe generation)
CREATE POLICY "System can create locations"
  ON locations FOR INSERT
  WITH CHECK (true);

-- ======================
-- Colonies Table Policies
-- ======================
-- Users can view their own colonies
CREATE POLICY "Users can view own colonies"
  ON colonies FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own colonies
CREATE POLICY "Users can manage own colonies"
  ON colonies FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to colonies"
  ON colonies FOR ALL
  USING (is_admin());

-- ======================
-- Buildings Table Policies
-- ======================
-- Users can view their own buildings
CREATE POLICY "Users can view own buildings"
  ON buildings FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own buildings
CREATE POLICY "Users can manage own buildings"
  ON buildings FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to buildings"
  ON buildings FOR ALL
  USING (is_admin());

-- ======================
-- Fleets Table Policies
-- ======================
-- Users can view their own fleets
CREATE POLICY "Users can view own fleets"
  ON fleets FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can view fleets at locations they can see (their own or public locations)
CREATE POLICY "Users can view fleets at public locations"
  ON fleets FOR SELECT
  USING (
    location_coord IN (
      SELECT coord FROM locations WHERE owner_id = auth.uid()
    ) OR
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own fleets
CREATE POLICY "Users can manage own fleets"
  ON fleets FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to fleets"
  ON fleets FOR ALL
  USING (is_admin());

-- ======================
-- Fleet Movements Table Policies
-- ======================
-- Users can view their own fleet movements
CREATE POLICY "Users can view own fleet movements"
  ON fleet_movements FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own fleet movements
CREATE POLICY "Users can manage own fleet movements"
  ON fleet_movements FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to fleet movements"
  ON fleet_movements FOR ALL
  USING (is_admin());

-- ======================
-- Messages Table Policies
-- ======================
-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    from_user_id = auth.uid() OR 
    to_user_id = auth.uid()
  );

-- Users can send messages (insert)
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can update received messages"
  ON messages FOR UPDATE
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Users can delete messages they sent or received
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (
    from_user_id = auth.uid() OR 
    to_user_id = auth.uid()
  );

-- Admins have full access
CREATE POLICY "Admins have full access to messages"
  ON messages FOR ALL
  USING (is_admin());

-- ======================
-- Research Projects Table Policies
-- ======================
-- Users can view their own research projects
CREATE POLICY "Users can view own research"
  ON research_projects FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own research projects
CREATE POLICY "Users can manage own research"
  ON research_projects FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to research"
  ON research_projects FOR ALL
  USING (is_admin());

-- ======================
-- Tech Queue Table Policies
-- ======================
-- Users can view their own tech queue
CREATE POLICY "Users can view own tech queue"
  ON tech_queue FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own tech queue
CREATE POLICY "Users can manage own tech queue"
  ON tech_queue FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to tech queue"
  ON tech_queue FOR ALL
  USING (is_admin());

-- ======================
-- Unit Queue Table Policies
-- ======================
-- Users can view their own unit queue
CREATE POLICY "Users can view own unit queue"
  ON unit_queue FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own unit queue
CREATE POLICY "Users can manage own unit queue"
  ON unit_queue FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to unit queue"
  ON unit_queue FOR ALL
  USING (is_admin());

-- ======================
-- Defense Queue Table Policies
-- ======================
-- Users can view their own defense queue
CREATE POLICY "Users can view own defense queue"
  ON defense_queue FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own defense queue
CREATE POLICY "Users can manage own defense queue"
  ON defense_queue FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to defense queue"
  ON defense_queue FOR ALL
  USING (is_admin());

-- ======================
-- Credit Transactions Table Policies
-- ======================
-- Users can view their own credit transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Only system (service role) can insert transactions
-- Users cannot directly modify their transaction history
CREATE POLICY "System can manage transactions"
  ON credit_transactions FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    is_admin()
  );

-- ======================
-- Tech Levels Table Policies
-- ======================
-- Users can view their own tech levels
CREATE POLICY "Users can view own tech levels"
  ON tech_levels FOR SELECT
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own tech levels
CREATE POLICY "Users can manage own tech levels"
  ON tech_levels FOR ALL
  USING (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empire_id IN (
      SELECT id FROM empires WHERE user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to tech levels"
  ON tech_levels FOR ALL
  USING (is_admin());

-- ======================
-- Grant necessary permissions
-- ======================
-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant permissions on tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant permissions on sequences (for auto-increment fields)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ======================
-- Comments
-- ======================
COMMENT ON FUNCTION is_admin() IS 'Helper function to check if current user has admin role';
COMMENT ON FUNCTION get_user_empire_id() IS 'Helper function to get the empire_id for the current user';

-- Add comments explaining the RLS policy strategy
COMMENT ON TABLE users IS 'User accounts with RLS: users can view/edit own data, admins have full access';
COMMENT ON TABLE empires IS 'Player empires with RLS: users manage own empire, public viewing for leaderboards';
COMMENT ON TABLE locations IS 'Universe locations with RLS: public read access, owner can update';
COMMENT ON TABLE colonies IS 'Player colonies with RLS: users can only access own empire colonies';
COMMENT ON TABLE buildings IS 'Buildings with RLS: users can only access buildings in their empire';
COMMENT ON TABLE fleets IS 'Player fleets with RLS: users can only access own empire fleets';
COMMENT ON TABLE fleet_movements IS 'Fleet movements with RLS: users can only access own empire movements';
COMMENT ON TABLE messages IS 'Messages with RLS: users can only access messages they sent/received';
COMMENT ON TABLE research_projects IS 'Research with RLS: users can only access own empire research';
COMMENT ON TABLE tech_queue IS 'Tech queue with RLS: users can only access own empire tech queue';
COMMENT ON TABLE unit_queue IS 'Unit queue with RLS: users can only access own empire unit queue';
COMMENT ON TABLE defense_queue IS 'Defense queue with RLS: users can only access own empire defense queue';
COMMENT ON TABLE credit_transactions IS 'Credit history with RLS: users can view own transactions, system manages';
COMMENT ON TABLE tech_levels IS 'Tech levels with RLS: users can only access own empire tech levels';
