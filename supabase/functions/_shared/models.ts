// Server-side model catalog for the chat function: which plans may use which model and how
// many tokens each real token costs. Mirrors the client list in src/stores/chatStore.ts.
//
// Before this, the server forwarded whatever `model` the browser sent, so a free user could
// call an expensive model directly. Keep this in sync when adding models to chatStore.ts.

import type { PlanId } from "./planLimits.ts";

export interface ModelInfo {
  multiplier: number;
  plans: readonly PlanId[];
}

const ALL: readonly PlanId[] = ["free", "basic", "pro", "premium", "premium_plus", "max", "enterprise"];
const BASIC_UP: readonly PlanId[] = ["basic", "pro", "premium", "premium_plus", "max", "enterprise"];
const PRO_UP: readonly PlanId[] = ["pro", "premium", "premium_plus", "max", "enterprise"];
const PREMIUM_UP: readonly PlanId[] = ["premium", "premium_plus", "max", "enterprise"];

export const MODEL_CATALOG: Record<string, ModelInfo> = {
  // Free tier
  "openai/gpt-4o-mini": { multiplier: 1, plans: ALL },
  "deepseek/deepseek-chat-v3.1": { multiplier: 1, plans: ALL },
  "google/gemini-2.5-flash-lite": { multiplier: 1, plans: ALL },
  // Basic and up
  "openai/gpt-5-mini": { multiplier: 1, plans: BASIC_UP },
  "openai/gpt-5-nano": { multiplier: 1, plans: BASIC_UP },
  "google/gemini-3-flash-preview": { multiplier: 1.5, plans: BASIC_UP },
  "x-ai/grok-3-mini": { multiplier: 1, plans: BASIC_UP },
  "x-ai/grok-4-fast": { multiplier: 1, plans: BASIC_UP },
  "deepseek/deepseek-v3.2": { multiplier: 1, plans: BASIC_UP },
  "meta-llama/llama-3.1-70b-instruct": { multiplier: 1, plans: BASIC_UP },
  "meta-llama/llama-3.3-70b-instruct": { multiplier: 1, plans: BASIC_UP },
  "qwen/qwen3-coder": { multiplier: 1, plans: BASIC_UP },
  "qwen/qwen3-vl-235b-a22b-instruct": { multiplier: 1, plans: BASIC_UP },
  // Pro and up
  "qwen/qwen3-235b-a22b-2507": { multiplier: 1, plans: PRO_UP },
  "openai/gpt-5.1": { multiplier: 4, plans: PRO_UP },
  "x-ai/grok-4.1-fast": { multiplier: 1, plans: PRO_UP },
  "perplexity/sonar": { multiplier: 3, plans: PRO_UP },
  "meta-llama/llama-4-maverick": { multiplier: 1, plans: PRO_UP },
  "meta-llama/llama-4-scout": { multiplier: 1, plans: PRO_UP },
  // "Limited" variants are available to Pro (daily caps are applied in the app); full access Premium+.
  "openai/gpt-5.2": { multiplier: 6.5, plans: PRO_UP },
  "google/gemini-2.5-pro": { multiplier: 4, plans: PRO_UP },
  // Premium and up
  "anthropic/claude-sonnet-4.5": { multiplier: 6, plans: PREMIUM_UP },
  "anthropic/claude-opus-4.5": { multiplier: 10, plans: PREMIUM_UP },
  "moonshotai/kimi-k2.5": { multiplier: 1, plans: PREMIUM_UP },
  "mistralai/mistral-large-2512": { multiplier: 1, plans: PREMIUM_UP },
};

/** Cost multiplier applied to models that are not in the catalog yet (paid plans only). */
export const UNKNOWN_MODEL_MULTIPLIER = 4;

export interface ModelPolicy {
  allowed: boolean;
  multiplier: number;
  known: boolean;
}

export function modelPolicy(model: string, plan: PlanId): ModelPolicy {
  const info = Object.prototype.hasOwnProperty.call(MODEL_CATALOG, model) ? MODEL_CATALOG[model] : undefined;
  if (info) {
    return { allowed: info.plans.includes(plan), multiplier: info.multiplier, known: true };
  }
  // Unknown model: never for free / guests; paid plans may use it at a conservative cost.
  return { allowed: plan !== "free", multiplier: UNKNOWN_MODEL_MULTIPLIER, known: false };
}
