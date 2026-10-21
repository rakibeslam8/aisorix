import { describe, it, expect } from "vitest";
// Server-side price table used by the payment edge functions (Deno code, plain TS).
import { resolveCharge, basePriceBdt } from "../../supabase/functions/_shared/pricing";

// Minimal fake of: admin.from("coupons").select(...).ilike(...).maybeSingle()
const db = (coupon: unknown, error: unknown = null) => ({
  from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: coupon, error }) }) }) }),
});
const noCoupon = db(null);

describe("server-side pricing", () => {
  it("monthly prices match the pricing page", () => {
    expect(basePriceBdt("basic", "monthly")).toBe(499);
    expect(basePriceBdt("pro", "monthly")).toBe(999);
    expect(basePriceBdt("premium", "monthly")).toBe(1999);
    expect(basePriceBdt("premium_plus", "monthly")).toBe(3999);
    expect(basePriceBdt("max", "monthly")).toBe(9999);
  });

  it("yearly = round(monthly * 12 * 0.8), same formula as Pricing.jsx", () => {
    for (const [plan, monthly] of [["basic", 499], ["pro", 999], ["premium", 1999], ["premium_plus", 3999], ["max", 9999]] as const) {
      expect(basePriceBdt(plan, "yearly")).toBe(Math.round(monthly * 12 * 0.8));
    }
  });

  it("charges the real price of the plan, never a client-supplied amount", async () => {
    const r = await resolveCharge(noCoupon, "max", "monthly", null);
    expect(r).toMatchObject({ ok: true, amount: 9999, currency: "BDT" });
  });

  it("rejects free, enterprise, unknown and prototype-key plans", async () => {
    for (const plan of ["free", "enterprise", "nope", "__proto__", "constructor", "toString", undefined, null, 42, {}]) {
      expect((await resolveCharge(noCoupon, plan, "monthly", null)).ok).toBe(false);
    }
  });

  it("rejects invalid billing cycles", async () => {
    for (const cycle of ["weekly", "", "MONTHLY", undefined, null]) {
      expect((await resolveCharge(noCoupon, "pro", cycle, null)).ok).toBe(false);
    }
  });

  it("applies percent coupons with the same rounding as validate-coupon", async () => {
    const r = await resolveCharge(db({ code: "HALF", percent_off: 50, active: true, redeemed_count: 0 }), "pro", "monthly", " half ");
    expect(r).toMatchObject({ ok: true, discount: 500, amount: 499, couponCode: "HALF" });
  });

  it("caps fixed-amount coupons and refuses a zero total", async () => {
    const small = await resolveCharge(db({ code: "XX", amount_off: 100, active: true }), "basic", "monthly", "xx");
    expect(small).toMatchObject({ ok: true, amount: 399 });
    const big = await resolveCharge(db({ code: "XX", amount_off: 100000, active: true }), "basic", "monthly", "xx");
    expect(big.ok).toBe(false);
    const full = await resolveCharge(db({ code: "FF", percent_off: 100, active: true }), "basic", "monthly", "ff");
    expect(full.ok).toBe(false);
  });

  it("rejects expired, inactive, used-up and unknown coupons", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    for (const coupon of [
      null,
      { code: "EX", percent_off: 10, active: true, expires_at: past },
      { code: "IN", percent_off: 10, active: false },
      { code: "UP", percent_off: 10, active: true, max_redemptions: 5, redeemed_count: 5 },
    ]) {
      expect((await resolveCharge(db(coupon), "pro", "monthly", "ANY")).ok).toBe(false);
    }
  });

  it("a coupon lookup error fails closed (500) instead of giving a free plan", async () => {
    const r = await resolveCharge(db(null, { message: "boom" }), "pro", "monthly", "ANY");
    expect(r).toMatchObject({ ok: false, status: 500 });
  });
});
