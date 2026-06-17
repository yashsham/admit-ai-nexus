-- Phase 1 Critical Security Fixes

-- Fix Profile Data Exposure: Users should only see their own profile data
-- Drop the current permissive policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create user-specific profile access policy - users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Enable leaked password protection and set minimum security requirements
-- This helps prevent users from using compromised passwords
UPDATE auth.config SET
  password_min_length = 8,
  hibp_enabled = true;