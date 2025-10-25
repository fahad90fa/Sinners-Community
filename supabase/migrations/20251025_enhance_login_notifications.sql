-- Enhance login_history table with location and device information
ALTER TABLE login_history 
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT,
ADD COLUMN IF NOT EXISTS device_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS browser_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS os_name VARCHAR(100);

-- Update notifications table to support login notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS notification_subtype VARCHAR(50);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_id_date ON login_history(user_id, logged_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_subtype ON notifications(type, notification_subtype);

-- Create function to add login notification
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

-- Create function to create follow notification
CREATE OR REPLACE FUNCTION public.create_follow_notification(
  p_follower_id UUID,
  p_followee_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    actor_user_id,
    type,
    is_read,
    created_at
  ) VALUES (
    p_followee_id,
    p_follower_id,
    'follow',
    false,
    NOW()
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to create like notification
CREATE OR REPLACE FUNCTION public.create_like_notification(
  p_user_id UUID,
  p_post_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_post_owner_id UUID;
BEGIN
  -- Get post owner
  SELECT user_id INTO v_post_owner_id FROM public.posts WHERE id = p_post_id;

  -- Only create notification if liker is not the post owner
  IF v_post_owner_id != p_user_id THEN
    INSERT INTO public.notifications (
      user_id,
      actor_user_id,
      type,
      post_id,
      is_read,
      created_at
    ) VALUES (
      v_post_owner_id,
      p_user_id,
      'like',
      p_post_id,
      false,
      NOW()
    ) RETURNING id INTO v_notification_id;
  END IF;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to create comment notification
CREATE OR REPLACE FUNCTION public.create_comment_notification(
  p_user_id UUID,
  p_comment_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_post_owner_id UUID;
  v_post_id UUID;
BEGIN
  -- Get post from comment
  SELECT post_id INTO v_post_id FROM public.comments WHERE id = p_comment_id;
  SELECT user_id INTO v_post_owner_id FROM public.posts WHERE id = v_post_id;

  -- Only create notification if commenter is not the post owner
  IF v_post_owner_id != p_user_id THEN
    INSERT INTO public.notifications (
      user_id,
      actor_user_id,
      type,
      post_id,
      comment_id,
      is_read,
      created_at
    ) VALUES (
      v_post_owner_id,
      p_user_id,
      'comment',
      v_post_id,
      p_comment_id,
      false,
      NOW()
    ) RETURNING id INTO v_notification_id;
  END IF;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to create mention notification
CREATE OR REPLACE FUNCTION public.create_mention_notification(
  p_mentioned_user_id UUID,
  p_creator_user_id UUID,
  p_post_id UUID,
  p_comment_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Only create notification if mentioned user is not the creator
  IF p_mentioned_user_id != p_creator_user_id THEN
    INSERT INTO public.notifications (
      user_id,
      actor_user_id,
      type,
      post_id,
      comment_id,
      is_read,
      created_at
    ) VALUES (
      p_mentioned_user_id,
      p_creator_user_id,
      'mention',
      p_post_id,
      p_comment_id,
      false,
      NOW()
    ) RETURNING id INTO v_notification_id;
  END IF;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new follows
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_follow_notification(NEW.follower_id, NEW.followee_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_follow();

-- Create trigger for new likes
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_like_notification(NEW.user_id, NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_like();

-- Create trigger for new comments
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_comment_notification(NEW.user_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();

-- Update notifications table type check to include 'login'
ALTER TABLE notifications DROP CONSTRAINT IF NOT EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('like', 'comment', 'follow', 'mention', 'login'));
