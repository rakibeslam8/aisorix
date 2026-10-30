-- Server-side token metering.
--
-- Until now token limits were enforced only in the browser (and only project-ai /
-- cineshoot touched subscriptions.tokens_used, which was never reset). This adds:
--   * public.token_usage  - one ledger for logged-in users ('u:<uuid>'), guests
--                           ('g:<guest id>') and a per-IP backstop ('ip:<hash>')
--   * usage_get / usage_add - atomic read/add with a lazy reset of the usage window
--   * limits seeded in system_settings so Admin > Settings > Limits really controls them
--   * get_public_plan_limits() so the website can show the same numbers

-- ---------------------------------------------------------------------------
-- 1. Ledger (service role only: RLS on, no policies, no grants)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.token_usage (
  key          text PRIMARY KEY,
  tokens_used  bigint      NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.token_usage FROM PUBLIC, anon, authenticated;

-- Keep today's recorded usage for paying users (window = their billing period start).
INSERT INTO public.token_usage (key, tokens_used, period_start)
SELECT 'u:' || s.user_id::text, s.tokens_used, s.current_period_start
FROM public.subscriptions s
WHERE s.status = 'active' AND s.tokens_used > 0
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. usage_get: current usage, resetting the window when it has expired or when the
--    user's subscription period has restarted (renewal / plan upgrade).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usage_get(p_key text, p_window_days integer DEFAULT 30)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row       public.token_usage%ROWTYPE;
  v_sub_start timestamptz;
BEGIN
  SELECT * INTO v_row FROM public.token_usage WHERE key = p_key;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF p_key LIKE 'u:%' THEN
    SELECT s.current_period_start INTO v_sub_start
    FROM public.subscriptions s
    WHERE s.user_id = substr(p_key, 3)::uuid AND s.status = 'active'
    LIMIT 1;
  END IF;

  IF v_row.period_start + make_interval(days => p_window_days) <= now()
     OR (v_sub_start IS NOT NULL AND v_sub_start > v_row.period_start) THEN
    UPDATE public.token_usage
       SET tokens_used = 0, period_start = now(), updated_at = now()
     WHERE key = p_key;
    RETURN 0;
  END IF;

  RETURN v_row.tokens_used;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. usage_add: atomically add tokens, return the new total. For paying users the total
--    is mirrored to subscriptions.tokens_used so existing screens / cineshoot stay correct.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usage_add(p_key text, p_tokens bigint, p_window_days integer DEFAULT 30)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_add bigint := GREATEST(COALESCE(p_tokens, 0), 0);
  v_new bigint;
BEGIN
  PERFORM public.usage_get(p_key, p_window_days);  -- applies the lazy reset first

  INSERT INTO public.token_usage AS t (key, tokens_used, period_start)
  VALUES (p_key, v_add, now())
  ON CONFLICT (key) DO UPDATE
    SET tokens_used = t.tokens_used + v_add, updated_at = now()
  RETURNING t.tokens_used INTO v_new;

  IF p_key LIKE 'u:%' THEN
    UPDATE public.subscriptions
       SET tokens_used = LEAST(v_new, 2147483647)::integer
     WHERE user_id = substr(p_key, 3)::uuid AND status = 'active';
  END IF;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.usage_get(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.usage_add(text, bigint, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usage_get(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.usage_add(text, bigint, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Limits: seed the agreed numbers (editable in Admin > Settings > Limits)
-- ---------------------------------------------------------------------------
INSERT INTO public.system_settings (key, value)
VALUES (
  'limits',
  jsonb_build_object(
    'free_tokens',         15000,
    'basic_tokens',        800000,
    'pro_tokens',          1500000,
    'premium_tokens',      3000000,
    'premium_plus_tokens', 7000000,
    'max_tokens',          17000000,
    'enterprise_tokens',   50000000,
    'guest_tokens',        15000
  )
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Public, read-only view of just the limits (no other settings are exposed).
CREATE OR REPLACE FUNCTION public.get_public_plan_limits()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT value FROM public.system_settings WHERE key = 'limits'), '{}'::jsonb);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_plan_limits() TO anon, authenticated, service_role;
