// Server-side source of truth for subscription prices.
//
// Payment functions MUST use resolveCharge() and ignore any plan price / amount the
// browser sends, otherwise a logged-in user can pay 1 BDT for the most expensive plan.
//
// Keep this table in sync with the `plans` array in src/components/Pricing.jsx.
// Yearly price = monthly * 12 * 0.8 (20% discount), same formula as the UI.

export type BillingCycle = "monthly" | "yearly";

export const PLAN_MONTHLY_PRICE_BDT: Record<string, number> = {
  basic: 499,
  pro: 999,
  premium: 1999,
  premium_plus: 3999,
  max: 9999,
};

export function basePriceBdt(planId: unknown, cycle: unknown): number | null {
  if (typeof planId !== "string" || !Object.hasOwn(PLAN_MONTHLY_PRICE_BDT, planId)) return null;
  const monthly = PLAN_MONTHLY_PRICE_BDT[planId];
  if (cycle === "monthly") return monthly;
  if (cycle === "yearly") return Math.round(monthly * 12 * 0.8);
  return null;
}

export type Charge =
  | {
      ok: true;
      amount: number;
      baseAmount: number;
      discount: number;
      currency: "BDT";
      couponCode: string | null;
    }
  | { ok: false; status: number; error: string };

// deno-lint-ignore no-explicit-any
export async function resolveCharge(
  admin: any,
  planId: unknown,
  cycle: unknown,
  couponCode: unknown,
): Promise<Charge> {
  const baseAmount = basePriceBdt(planId, cycle);
  if (baseAmount === null) return { ok: false, status: 400, error: "Invalid plan or billing cycle" };

  let discount = 0;
  let appliedCode: string | null = null;

  if (typeof couponCode === "string" && couponCode.trim()) {
    const code = couponCode.trim().toUpperCase();
    if (code.length < 2 || code.length > 64) {
      return { ok: false, status: 400, error: "Invalid coupon" };
    }
    // Same rules as the validate-coupon function.
    const { data: coupon, error } = await admin
      .from("coupons")
      .select("code, percent_off, amount_off, max_redemptions, redeemed_count, expires_at, active")
      .ilike("code", code)
      .maybeSingle();

    if (error) return { ok: false, status: 500, error: "Coupon lookup failed" };
    if (!coupon || !coupon.active) return { ok: false, status: 400, error: "Coupon not found" };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { ok: false, status: 400, error: "Coupon expired" };
    }
    if (coupon.max_redemptions != null && (coupon.redeemed_count ?? 0) >= coupon.max_redemptions) {
      return { ok: false, status: 400, error: "Coupon fully redeemed" };
    }

    if (coupon.percent_off && coupon.percent_off > 0) {
      discount = Math.round((baseAmount * Math.min(coupon.percent_off, 100)) / 100);
    } else if (coupon.amount_off && Number(coupon.amount_off) > 0) {
      discount = Math.min(Number(coupon.amount_off), baseAmount);
    }
    appliedCode = coupon.code;
  }

  const amount = Math.max(baseAmount - discount, 0);
  if (amount <= 0) {
    return { ok: false, status: 400, error: "Total must be greater than zero" };
  }
  return { ok: true, amount, baseAmount, discount, currency: "BDT", couponCode: appliedCode };
}
