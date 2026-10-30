// Monthly token limits per plan: the single server-side source of truth.
//
// Defaults below are the agreed numbers. Admin > Settings > Limits (system_settings.limits)
// overrides them: keys are "<plan>_tokens" (free_tokens, basic_tokens, ...) and "guest_tokens".
// Invalid / missing values fall back to the defaults, so a bad edit can never lock everyone out.

export const PLAN_IDS = ["free", "basic", "pro", "premium", "premium_plus", "max", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const DEFAULT_PLAN_TOKEN_LIMITS: Record<PlanId, number> = {
  free: 15_000,
  basic: 800_000,
  pro: 1_500_000,
  premium: 3_000_000,
  premium_plus: 7_000_000,
  max: 17_000_000,
  enterprise: 50_000_000,
};

export const DEFAULT_GUEST_TOKEN_LIMIT = 15_000;

export interface PlanLimits {
  plans: Record<PlanId, number>;
  guest: number;
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/** Unknown / missing plans are treated as free (the most restrictive plan). */
export function normalizePlan(value: unknown): PlanId {
  return isPlanId(value) ? value : "free";
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** Merge the raw system_settings.limits JSON over the defaults. */
export function mergeLimits(raw: unknown): PlanLimits {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const plans = { ...DEFAULT_PLAN_TOKEN_LIMITS };
  for (const id of PLAN_IDS) {
    const v = positiveInt(obj[`${id}_tokens`]);
    if (v !== null) plans[id] = v;
  }
  return { plans, guest: positiveInt(obj.guest_tokens) ?? DEFAULT_GUEST_TOKEN_LIMIT };
}

let cache: { at: number; limits: PlanLimits } | null = null;
const CACHE_MS = 60_000;

// deno-lint-ignore no-explicit-any
export async function getPlanLimits(admin: any, now: number = Date.now()): Promise<PlanLimits> {
  if (cache && now - cache.at < CACHE_MS) return cache.limits;
  let raw: unknown = null;
  try {
    const { data } = await admin.from("system_settings").select("value").eq("key", "limits").maybeSingle();
    raw = data?.value ?? null;
  } catch (err) {
    console.error("getPlanLimits: could not read system_settings, using defaults", err);
  }
  const limits = mergeLimits(raw);
  cache = { at: now, limits };
  return limits;
}

export function resetPlanLimitsCache() {
  cache = null;
}
