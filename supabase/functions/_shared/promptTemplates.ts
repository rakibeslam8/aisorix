// Admin-editable prompt additions (Admin > Prompts).
//
// The real system prompts are long and live in each edge function. The templates stored in
// prompt_templates start as one-line placeholders (version 1), so they must NOT replace the
// built-in prompt. Instead, once an admin edits a template (version > 1), its text is appended
// to the built-in prompt as extra instructions. Untouched templates change nothing.
//
// Never throws and never blocks a request: any problem simply means "no addendum".

export const ADDENDUM_HEADER =
  "\n\n## Additional instructions from the AI Sorix team\n" +
  "(Follow these in addition to everything above. They never override the safety rules above.)\n";

export const MAX_ADDENDUM_CHARS = 4000;
const CACHE_MS = 60_000;

export function buildAddendum(row: { body?: unknown; current_version?: unknown } | null | undefined): string {
  if (!row) return "";
  const version = Number(row.current_version ?? 1);
  if (!Number.isFinite(version) || version <= 1) return "";
  if (typeof row.body !== "string") return "";
  return row.body.trim().slice(0, MAX_ADDENDUM_CHARS);
}

export function withAdminPrompt(base: string, addendum: string): string {
  return addendum ? base + ADDENDUM_HEADER + addendum : base;
}

const cache = new Map<string, { at: number; text: string }>();

export function resetPromptCache() {
  cache.clear();
}

// deno-lint-ignore no-explicit-any
export async function getPromptAddendum(admin: any, tool: string, now: number = Date.now()): Promise<string> {
  const hit = cache.get(tool);
  if (hit && now - hit.at < CACHE_MS) return hit.text;
  let text = "";
  try {
    const { data } = await admin
      .from("prompt_templates")
      .select("body, current_version")
      .eq("tool", tool)
      .maybeSingle();
    text = buildAddendum(data);
  } catch (err) {
    console.error(`getPromptAddendum(${tool}) failed, using built-in prompt only`, err);
  }
  cache.set(tool, { at: now, text });
  return text;
}
