-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.send_contact_email(
  contact_name TEXT,
  contact_email TEXT,
  contact_message TEXT,
  form_type TEXT DEFAULT 'contact'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result json;
BEGIN
  -- Insert the contact submission into our database
  INSERT INTO public.contact_submissions (name, email, message)
  VALUES (contact_name, contact_email, contact_message);
  
  -- Return success response
  result := json_build_object(
    'success', true,
    'message', 'Contact form submitted successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    result := json_build_object(
      'success', false,
      'message', 'Failed to submit contact form: ' || SQLERRM
    );
    
    RETURN result;
END;
$$;

-- Fix the existing update function as well
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;