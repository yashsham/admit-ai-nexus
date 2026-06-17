-- Fix security issue: Restrict profiles table access to authenticated users only
-- This replaces the overly permissive "true" policy that allowed anyone to view all profile data

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a new, more secure policy that only allows authenticated users to view profiles
-- This prevents anonymous users from accessing sensitive personal information
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Optional: If you want even stricter security, you could restrict to users viewing only their own profiles
-- Uncomment the following lines and comment out the above policy if needed:
-- CREATE POLICY "Users can view their own profile" 
-- ON public.profiles 
-- FOR SELECT 
-- TO authenticated
-- USING (auth.uid() = user_id);