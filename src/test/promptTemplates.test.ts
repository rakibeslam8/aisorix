import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ADDENDUM_HEADER, MAX_ADDENDUM_CHARS, buildAddendum, getPromptAddendum, resetPromptCache, withAdminPrompt,
} from "../../supabase/functions/_shared/promptTemplates";

const adminWith = (row: unknown, spy = vi.fn()) => ({
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { spy(); return { data: row }; } }) }) }),
});

describe("admin prompt addendum", () => {
  beforeEach(() => resetPromptCache());

  it("untouched seed templates (version 1) change nothing", () => {
    expect(buildAddendum({ body: "You are Sorix Health, an informational medical research assistant.", current_version: 1 })).toBe("");
    expect(buildAddendum({ body: "x" })).toBe("");
    expect(buildAddendum(null)).toBe("");
  });

  it("an admin-edited template (version > 1) is appended, trimmed and capped", () => {
    expect(buildAddendum({ body: "  Always answer in Bangla.  ", current_version: 2 })).toBe("Always answer in Bangla.");
    expect(buildAddendum({ body: "a".repeat(MAX_ADDENDUM_CHARS + 500), current_version: 3 })).toHaveLength(MAX_ADDENDUM_CHARS);
  });

  it("ignores junk values", () => {
    for (const bad of [{ body: 5, current_version: 2 }, { body: "x", current_version: "abc" }, { body: null, current_version: 9 }]) {
      expect(buildAddendum(bad as never)).toBe("");
    }
  });

  it("keeps the built-in prompt first and never replaces it", () => {
    const out = withAdminPrompt("BUILT-IN PROMPT", "Be brief.");
    expect(out.startsWith("BUILT-IN PROMPT")).toBe(true);
    expect(out).toContain(ADDENDUM_HEADER);
    expect(out.endsWith("Be brief.")).toBe(true);
    expect(withAdminPrompt("BUILT-IN PROMPT", "")).toBe("BUILT-IN PROMPT");
  });

  it("reads the template once per minute per tool", async () => {
    const spy = vi.fn();
    const admin = adminWith({ body: "Be brief.", current_version: 2 }, spy);
    expect(await getPromptAddendum(admin, "chat", 1_000)).toBe("Be brief.");
    await getPromptAddendum(admin, "chat", 30_000);
    expect(spy).toHaveBeenCalledTimes(1);
    await getPromptAddendum(admin, "health", 30_000); // different tool
    expect(spy).toHaveBeenCalledTimes(2);
    await getPromptAddendum(admin, "chat", 61_001);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("a database error means no addendum, never a failed request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { from: () => { throw new Error("db down"); } };
    expect(await getPromptAddendum(broken, "chat")).toBe("");
  });
});
