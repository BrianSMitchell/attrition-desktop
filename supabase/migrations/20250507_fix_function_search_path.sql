-- Fix function search_path security warnings
-- This migration sets explicit search_path for security-sensitive functions

-- ======================
-- Fix is_admin() function
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp;

COMMENT ON FUNCTION is_admin() IS 'Helper function to check if current user has admin role. Uses explicit search_path for security.';

-- ======================
-- Fix get_user_empire_id() function
-- ======================
CREATE OR REPLACE FUNCTION get_user_empire_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT empire_id FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE 
SET search_path = public, pg_temp;

COMMENT ON FUNCTION get_user_empire_id() IS 'Helper function to get empire_id for current user. Uses explicit search_path for security.';

-- ======================
-- Fix update_updated_at_column() function
-- ======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp. Uses explicit search_path for security.';

-- ======================
-- Verification
-- ======================
-- You can verify the search_path is set by running:
-- SELECT proname, prosecdef, proconfig 
-- FROM pg_proc 
-- WHERE proname IN ('is_admin', 'get_user_empire_id', 'update_updated_at_column');
