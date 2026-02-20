/*
  # Register Push Subscription RPC

  Fixes 403 on push_subscriptions upsert when an endpoint already exists
  under another user/device session by handling registration in a
  SECURITY DEFINER function.
*/

CREATE OR REPLACE FUNCTION public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  IF p_endpoint IS NULL OR p_p256dh IS NULL OR p_auth IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid subscription payload');
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    last_seen_at
  )
  VALUES (
    v_user,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_user_agent,
    now()
  )
  ON CONFLICT (endpoint)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    last_seen_at = now(),
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text, text) TO authenticated;
