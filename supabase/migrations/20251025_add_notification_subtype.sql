-- Add notification_subtype column if it doesn't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS notification_subtype VARCHAR(255);

-- Update the type check constraint to include 'login'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'login'));

-- Create login_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  country VARCHAR(100),
  city VARCHAR(100),
  latitude FLOAT,
  longitude FLOAT,
  device_name VARCHAR(255),
  browser_name VARCHAR(100),
  os_name VARCHAR(100),
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for login_history
CREATE INDEX IF NOT EXISTS idx_login_history_user_id_date ON public.login_history(user_id, logged_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_subtype ON public.notifications(type, notification_subtype);

-- Enable RLS on login_history
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy for login_history
CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create or replace function to add login notification
CREATE OR REPLACE FUNCTION public.create_login_notification(
  p_user_id UUID,
  p_ip_address VARCHAR,
  p_country VARCHAR,
  p_city VARCHAR,
  p_latitude FLOAT,
  p_longitude FLOAT,
  p_device_name VARCHAR,
  p_browser_name VARCHAR,
  p_os_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Insert login record
  INSERT INTO public.login_history (
    user_id,
    ip_address,
    country,
    city,
    latitude,
    longitude,
    device_name,
    browser_name,
    os_name,
    logged_in_at
  ) VALUES (
    p_user_id,
    p_ip_address,
    p_country,
    p_city,
    p_latitude,
    p_longitude,
    p_device_name,
    p_browser_name,
    p_os_name,
    NOW()
  );

  -- Create notification for login
  INSERT INTO public.notifications (
    user_id,
    type,
    notification_subtype,
    is_read,
    created_at
  ) VALUES (
    p_user_id,
    'login',
    CONCAT(
      p_country,
      CASE WHEN p_city IS NOT NULL THEN CONCAT(', ', p_city) ELSE '' END,
      ' (', p_ip_address, ')'
    ),
    false,
    NOW()
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
