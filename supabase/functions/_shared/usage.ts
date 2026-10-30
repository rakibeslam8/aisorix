// Server-side token metering helpers (dependency-free so they can be unit tested).
// Ledger lives in public.token_usage, accessed through usage_get / usage_add (service role only).

import { normalizePlan, type PlanId } from "./planLimits.ts";

export const USER_WINDOW_DAYS = 30;
export const GUEST_WINDOW_DAYS = 30;
/** Per-IP backstop for guests: daily budget = guest limit * this factor (IPs are shared on mobile networks). */
export const IP_WINDOW_DAYS = 1;
export const IP_LIMIT_MULTIPLIER = 10;

export const estimateTokens = (text: string): number => Math.ceil((text ?? "").length / 4);

/** Text of an OpenAI-style message content (string, or array of text / image parts). */
export function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part && typeof part === "object") {
        const p = part as { type?: string; text?: string };
        if (p.type === "text" && typeof p.text === "string") return p.text;
        if (p.type === "image_url") return "x".repeat(4000); // ~1000 tokens per image
      }
      return "";
    })
    .join("\n");
}

export function messagesTokens(messages: Array<{ content?: unknown }>): number {
  return messages.reduce((sum, m) => sum + estimateTokens(contentText(m?.content)), 0);
}

// deno-lint-ignore no-explicit-any
type Admin = any;

/** Current usage, or null if the ledger could not be read (callers fail open and log). */
export async function getUsage(admin: Admin, key: string, windowDays: number): Promise<number | null> {
  try {
    const { data, error } = await admin.rpc("usage_get", { p_key: key, p_window_days: windowDays });
    if (error) throw error;
    return Number(data ?? 0);
  } catch (err) {
    console.error("usage_get failed", key.split(":")[0], err);
    return null;
  }
}

export async function addUsage(admin: Admin, key: string, tokens: number, windowDays: number): Promise<number | null> {
  const t = Math.max(0, Math.round(tokens));
  if (t === 0) return null;
  try {
    const { data, error } = await admin.rpc("usage_add", { p_key: key, p_tokens: t, p_window_days: windowDays });
    if (error) throw error;
    return Number(data ?? 0);
  } catch (err) {
    console.error("usage_add failed", key.split(":")[0], err);
    return null;
  }
}

/** The plan comes from the database, never from the browser. Non-active subscriptions count as free. */
export async function getEffectivePlan(admin: Admin, userId: string): Promise<PlanId> {
  try {
    const { data } = await admin
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return normalizePlan(data?.plan_id);
  } catch (err) {
    console.error("getEffectivePlan failed, treating as free", err);
    return "free";
  }
}

/** Anonymous per-IP key (hashed, so raw IPs are not stored). */
export async function ipUsageKey(headers: Headers): Promise<string | null> {
  const raw =
    headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  if (!raw) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `ip:${hex.slice(0, 16)}`;
}

export interface Usage {
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface StreamSummary {
  text: string;
  usage?: Usage;
}

/**
 * Extra tokens to charge once a response is complete.
 * `preCharged` is what was already charged for the input before the call.
 * Uses the provider's reported usage when present, otherwise a characters/4 estimate.
 */
export function remainingCharge(
  inputEstimate: number,
  summary: StreamSummary,
  multiplier: number,
  preCharged: number,
): number {
  const real = summary.usage?.total_tokens ?? inputEstimate + estimateTokens(summary.text);
  return Math.max(0, Math.round(real * multiplier) - preCharged);
}

/**
 * Pass-through SSE transform: forwards every byte unchanged while collecting the generated text
 * and the provider's usage block. `onDone` runs when the stream ends; errors in it never reach the client.
 */
export function meterSse(onDone: (summary: StreamSummary) => Promise<void> | void): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = "";
  const summary: StreamSummary = { text: "" };

  const readLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const parsed = JSON.parse(payload);
      const delta = parsed?.choices?.[0]?.delta?.content;
      if (typeof delta === "string") summary.text += delta;
      if (parsed?.usage && typeof parsed.usage === "object") summary.usage = parsed.usage;
    } catch {
      /* partial or non-JSON line: ignore */
    }
  };

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      buffer += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        readLine(buffer.slice(0, nl).replace(/\r$/, ""));
        buffer = buffer.slice(nl + 1);
      }
    },
    async flush() {
      buffer += decoder.decode();
      if (buffer) readLine(buffer.replace(/\r$/, ""));
      try {
        await onDone(summary);
      } catch (err) {
        console.error("meterSse onDone failed", err);
      }
    },
  });
}
