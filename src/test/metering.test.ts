import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_PLAN_TOKEN_LIMITS, DEFAULT_GUEST_TOKEN_LIMIT, getPlanLimits, mergeLimits, normalizePlan, resetPlanLimitsCache,
} from "../../supabase/functions/_shared/planLimits";
import { MODEL_CATALOG, UNKNOWN_MODEL_MULTIPLIER, modelPolicy } from "../../supabase/functions/_shared/models";
import {
  addUsage, contentText, estimateTokens, getEffectivePlan, getUsage, messagesTokens, meterSse, remainingCharge,
  type StreamSummary,
} from "../../supabase/functions/_shared/usage";

describe("plan limits", () => {
  it("defaults are the agreed numbers", () => {
    expect(DEFAULT_PLAN_TOKEN_LIMITS).toEqual({
      free: 15_000, basic: 800_000, pro: 1_500_000, premium: 3_000_000,
      premium_plus: 7_000_000, max: 17_000_000, enterprise: 50_000_000,
    });
    expect(DEFAULT_GUEST_TOKEN_LIMIT).toBe(15_000);
  });

  it("admin settings override defaults per plan", () => {
    const l = mergeLimits({ free_tokens: 20_000, pro_tokens: "2000000", guest_tokens: 5000 });
    expect(l.plans.free).toBe(20_000);
    expect(l.plans.pro).toBe(2_000_000);
    expect(l.plans.basic).toBe(800_000); // untouched
    expect(l.guest).toBe(5000);
  });

  it("bad admin values never lock everyone out (fall back to defaults)", () => {
    for (const bad of [0, -5, "abc", NaN, null, undefined, {}, [], Infinity]) {
      const l = mergeLimits({ free_tokens: bad, basic_tokens: bad, guest_tokens: bad });
      expect(l.plans.free).toBe(15_000);
      expect(l.plans.basic).toBe(800_000);
      expect(l.guest).toBe(15_000);
    }
    expect(mergeLimits(null).plans).toEqual(DEFAULT_PLAN_TOKEN_LIMITS);
    expect(mergeLimits("nope").plans).toEqual(DEFAULT_PLAN_TOKEN_LIMITS);
  });

  it("unknown plans are treated as free", () => {
    for (const p of ["", "gold", undefined, null, 5, "__proto__"]) expect(normalizePlan(p)).toBe("free");
    expect(normalizePlan("max")).toBe("max");
  });

  describe("getPlanLimits", () => {
    beforeEach(() => resetPlanLimitsCache());
    const adminWith = (value: unknown, spy = vi.fn()) => ({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { spy(); return { data: { value } }; } }) }) }),
    });

    it("reads system_settings.limits and caches for a minute", async () => {
      const spy = vi.fn();
      const admin = adminWith({ free_tokens: 30_000 }, spy);
      expect((await getPlanLimits(admin, 1_000)).plans.free).toBe(30_000);
      await getPlanLimits(admin, 30_000);
      expect(spy).toHaveBeenCalledTimes(1);
      await getPlanLimits(admin, 61_001);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("falls back to defaults if the database read throws", async () => {
      const admin = { from: () => { throw new Error("db down"); } };
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect((await getPlanLimits(admin)).plans).toEqual(DEFAULT_PLAN_TOKEN_LIMITS);
    });
  });
});

describe("model access by plan", () => {
  it("free users can use free models only", () => {
    expect(modelPolicy("openai/gpt-4o-mini", "free")).toMatchObject({ allowed: true, multiplier: 1, known: true });
    expect(modelPolicy("anthropic/claude-opus-4.5", "free").allowed).toBe(false);
    expect(modelPolicy("openai/gpt-5-mini", "free").allowed).toBe(false);
  });

  it("premium models need premium+; costs match the app", () => {
    expect(modelPolicy("anthropic/claude-opus-4.5", "pro").allowed).toBe(false);
    expect(modelPolicy("anthropic/claude-opus-4.5", "premium")).toMatchObject({ allowed: true, multiplier: 10 });
    expect(modelPolicy("anthropic/claude-sonnet-4.5", "max").multiplier).toBe(6);
    expect(modelPolicy("openai/gpt-5.2", "pro")).toMatchObject({ allowed: true, multiplier: 6.5 });
    expect(modelPolicy("openai/gpt-5.2", "basic").allowed).toBe(false);
    expect(modelPolicy("google/gemini-3-flash-preview", "basic").multiplier).toBe(1.5);
  });

  it("unknown models: blocked for free/guests, charged conservatively for paid", () => {
    expect(modelPolicy("some/new-model", "free").allowed).toBe(false);
    expect(modelPolicy("some/new-model", "basic")).toMatchObject({ allowed: true, known: false, multiplier: UNKNOWN_MODEL_MULTIPLIER });
    for (const k of ["__proto__", "constructor", "toString", ""]) expect(modelPolicy(k, "free").allowed).toBe(false);
  });

  it("every catalog entry is available to enterprise and has a positive multiplier", () => {
    for (const [name, info] of Object.entries(MODEL_CATALOG)) {
      expect(info.multiplier, name).toBeGreaterThan(0);
      expect(info.plans, name).toContain("enterprise");
    }
  });
});

describe("token estimation", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
  it("counts text parts and images in array content", () => {
    expect(contentText("hi")).toBe("hi");
    expect(contentText(null)).toBe("");
    const withImage = [{ type: "text", text: "describe" }, { type: "image_url", image_url: { url: "data:..." } }];
    expect(estimateTokens(contentText(withImage))).toBeGreaterThan(1000);
    expect(messagesTokens([{ content: "abcd" }, { content: "abcdefgh" }, {}])).toBe(3);
  });
});

describe("remainingCharge", () => {
  it("uses provider usage when present and never goes negative", () => {
    const s: StreamSummary = { text: "x".repeat(400), usage: { total_tokens: 1000 } };
    expect(remainingCharge(100, s, 1, 100)).toBe(900);
    expect(remainingCharge(100, s, 6, 600)).toBe(5400); // premium multiplier
    expect(remainingCharge(100, { text: "", usage: { total_tokens: 50 } }, 1, 100)).toBe(0);
  });
  it("falls back to a characters/4 estimate", () => {
    expect(remainingCharge(100, { text: "x".repeat(400) }, 1, 100)).toBe(100);
    expect(remainingCharge(100, { text: "x".repeat(400) }, 2, 200)).toBe(200);
  });
});

describe("meterSse", () => {
  const enc = new TextEncoder();
  const run = async (chunks: string[], onDone: (s: StreamSummary) => unknown) => {
    const src = new ReadableStream<Uint8Array>({
      start(c) { chunks.forEach((x) => c.enqueue(enc.encode(x))); c.close(); },
    });
    const out = await new Response(src.pipeThrough(meterSse(onDone as never))).text();
    return out;
  };
  const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

  it("forwards bytes unchanged and collects text + usage, even when split mid-line", async () => {
    const full =
      sse({ choices: [{ delta: { content: "Hel" } }] }) +
      sse({ choices: [{ delta: { content: "lo" } }] }) +
      sse({ choices: [], usage: { total_tokens: 42 } }) +
      "data: [DONE]\n\n";
    const cut = [full.slice(0, 20), full.slice(20, 75), full.slice(75)];
    let summary: StreamSummary | undefined;
    const out = await run(cut, (s) => { summary = s; });
    expect(out).toBe(full);
    expect(summary?.text).toBe("Hello");
    expect(summary?.usage?.total_tokens).toBe(42);
  });

  it("ignores comments, blanks and non-JSON lines", async () => {
    let summary: StreamSummary | undefined;
    const out = await run([": OPENROUTER PROCESSING\n\n", "data: not json\n\n", sse({ choices: [{ delta: { content: "ok" } }] })], (s) => { summary = s; });
    expect(summary?.text).toBe("ok");
    expect(out).toContain(": OPENROUTER PROCESSING");
  });

  it("a failing onDone never breaks the client's stream", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await run([sse({ choices: [{ delta: { content: "hi" } }] })], () => { throw new Error("db"); });
    expect(out).toContain("hi");
  });
});

describe("ledger helpers", () => {
  it("getUsage returns the number, or null on error (callers fail open)", async () => {
    expect(await getUsage({ rpc: async () => ({ data: 1234, error: null }) }, "u:1", 30)).toBe(1234);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getUsage({ rpc: async () => ({ data: null, error: { message: "x" } }) }, "u:1", 30)).toBeNull();
  });

  it("addUsage sends rounded, non-negative tokens and skips zero", async () => {
    const rpc = vi.fn(async () => ({ data: 7, error: null }));
    expect(await addUsage({ rpc }, "u:1", 10.6, 30)).toBe(7);
    expect(rpc).toHaveBeenCalledWith("usage_add", { p_key: "u:1", p_tokens: 11, p_window_days: 30 });
    expect(await addUsage({ rpc }, "u:1", -5, 30)).toBeNull();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("getEffectivePlan reads the DB plan and defaults to free", async () => {
    const mk = (data: unknown) => ({
      from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data }) }) }) }) }) }) }),
    });
    expect(await getEffectivePlan(mk({ plan_id: "pro" }), "u")).toBe("pro");
    expect(await getEffectivePlan(mk(null), "u")).toBe("free");
    expect(await getEffectivePlan(mk({ plan_id: "hacker" }), "u")).toBe("free");
  });
});
