// Maps the rows that admins edit in Admin > Scholars (courses, workshops, competitions) to the
// shapes the public pages render. The database is the source of truth for WHAT is live and for
// every field the admin can edit; the old hard-coded content in src/data/* is only used to fill
// fields the admin left empty, and as a fallback if the database cannot be reached.

import { courses as staticCourses, competitions as staticCompetitions, type Course, type Competition } from "@/data/academy";
import { WORKSHOPS as staticWorkshops, type WorkshopData } from "@/data/workshops";
import defaultCourseCover from "@/assets/course-prompt.jpg";
import defaultCompetitionCover from "@/assets/competition-ai.jpg";
import founderAsset from "@/assets/founder-rakib.jpg.asset.json";

/** Old static slug -> slug that exists in the database (the admin created the course under a different slug). */
export const COURSE_SLUG_ALIASES: Record<string, string> = {
  "ai-expertise-for-working-professionals": "ai-for-professionals",
};

const aliasToStatic = (dbSlug: string) =>
  Object.entries(COURSE_SLUG_ALIASES).find(([, v]) => v === dbSlug)?.[0] ?? dbSlug;

/** Slug to use in URLs / lookups: legacy static slugs resolve to the database slug. */
export const canonicalCourseSlug = (slug: string) => COURSE_SLUG_ALIASES[slug] ?? slug;

// ---------- raw rows (only the columns we read) ----------

export interface CourseRow {
  id: string; slug: string; title: string; tagline: string | null; level: string | null;
  duration_label: string | null; price_bdt: number | string | null; old_price_bdt: number | string | null;
  cover_url: string | null; banner_url: string | null; overview: string | null;
  outcomes: unknown; instructor: unknown; faqs: unknown; sort_order?: number | null;
}
export interface ModuleRow { id: string; course_id: string; title: string; sort_order: number | null }
export interface LessonRow { module_id: string; title: string; sort_order: number | null }

export interface WorkshopRow {
  id: string; slug: string; title: string; summary: string | null; description: string | null;
  cover_url: string | null; mentor_name: string | null; mentor_role: string | null; mentor_bio: string | null;
  mentor_avatar_url: string | null; duration_hours: number | string | null; price_bdt: number | string | null;
  starts_at: string | null; seats_total: number | null; seats_booked: number | null; location: string | null;
}

export interface CompetitionRow {
  id: string; slug: string; title: string; tagline: string | null; cover_url: string | null; overview: string | null;
  rules: unknown; prizes: unknown; tracks: unknown; criteria: unknown; timeline: unknown; faqs: unknown;
  entry_fee_bdt: number | string | null; prize_label: string | null; status_label: string | null;
  starts_at: string | null; deadline_at: string | null; max_participants: number | null;
}

// ---------- helpers ----------

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : [];
function objList<T extends string>(v: unknown, keys: readonly T[]): Record<T, string>[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => x && typeof x === "object")
    .map((x) => Object.fromEntries(keys.map((k) => [k, str((x as Record<string, unknown>)[k])])) as Record<T, string>)
    .filter((o) => keys.some((k) => o[k]));
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
/** "৳870" style label; 0 -> "Free". */
export function formatBdt(amount: number): string {
  return amount > 0 ? `৳${Math.round(amount).toLocaleString("en-US")}` : "Free";
}
export function formatBdtBn(amount: number): string {
  return String(Math.round(amount)).split("").map((d) => BN_DIGITS[+d] ?? d).join("");
}

// ---------- courses ----------

export interface CatalogCourse extends Course {
  id: string;
  priceBdt: number;
  oldPriceBdt: number | null;
  banner: string | null;
  /** true when this course also has the hand-written Bangla landing content (problems, perks...) */
  hasRichContent: boolean;
  /** true when the admin filled the field (so it overrides the built-in copy) */
  outcomesFromDb: boolean;
  curriculumFromDb: boolean;
  faqsFromDb: boolean;
}

export function buildCurriculum(modules: ModuleRow[], lessons: LessonRow[]) {
  const bySort = <T extends { sort_order: number | null }>(a: T, b: T) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
  return [...modules].sort(bySort).map((m) => ({
    title: m.title,
    lessons: lessons.filter((l) => l.module_id === m.id).sort(bySort).map((l) => l.title),
  }));
}

export function mapCourse(row: CourseRow, modules: ModuleRow[] = [], lessons: LessonRow[] = []): CatalogCourse {
  const fallback = staticCourses.find((c) => c.slug === row.slug || c.slug === aliasToStatic(row.slug));
  const inst = (row.instructor && typeof row.instructor === "object" ? row.instructor : {}) as Record<string, unknown>;
  const outcomes = strList(row.outcomes);
  const faqs = objList(row.faqs, ["q", "a"] as const).filter((f) => f.q && f.a);
  const curriculum = buildCurriculum(modules, lessons);
  const price = num(row.price_bdt);
  const old = num(row.old_price_bdt);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: str(row.tagline) || fallback?.tagline || "",
    level: (str(row.level) as Course["level"]) || fallback?.level || "Beginner",
    duration: str(row.duration_label) || fallback?.duration || "",
    priceLabel: formatBdt(price),
    cover: row.cover_url || fallback?.cover || defaultCourseCover,
    overview: str(row.overview) || fallback?.overview || "",
    outcomes: outcomes.length ? outcomes : fallback?.outcomes ?? [],
    curriculum: curriculum.length ? curriculum : fallback?.curriculum ?? [],
    instructor: {
      name: str(inst.name) || fallback?.instructor.name || "Sorix Scholars",
      role: str(inst.role) || fallback?.instructor.role || "",
      bio: str(inst.bio) || fallback?.instructor.bio || "",
    },
    faqs: faqs.length ? faqs : fallback?.faqs ?? [],
    priceBdt: price,
    oldPriceBdt: old > price ? old : null,
    banner: row.banner_url || null,
    hasRichContent: !!fallback,
    outcomesFromDb: outcomes.length > 0,
    curriculumFromDb: curriculum.length > 0,
    faqsFromDb: faqs.length > 0,
  };
}

// ---------- workshops ----------

export interface CatalogWorkshop extends WorkshopData {
  id: string;
  priceBdt: number;
  seatsLeft: number | null;
  startsAt: string | null;
  mentor: { name: string; role: string; bio: string; avatar: string | null };
}

const BN_MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${BN_MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`;
}
function timeLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function mapWorkshop(row: WorkshopRow): CatalogWorkshop {
  const fallback = staticWorkshops.find((w) => w.slug === row.slug);
  const price = num(row.price_bdt);
  const total = row.seats_total ?? null;
  const summary = str(row.summary) || str(row.description);
  return {
    id: row.id,
    slug: row.slug,
    badge: fallback?.badge || "Live workshop",
    title: row.title,
    desc: summary || fallback?.desc || "",
    price: formatBdt(price),
    oldPrice: undefined,
    date: dateLabel(row.starts_at) || fallback?.date || "",
    time: timeLabel(row.starts_at) || fallback?.time || "",
    location: str(row.location) || fallback?.location || "Online",
    cover: row.cover_url || fallback?.cover || founderAsset.url,
    heroTitleLines: fallback?.heroTitleLines ?? [row.title],
    heroTagline: str(row.description) || summary || fallback?.heroTagline || "",
    deadlineISO: row.starts_at || fallback?.deadlineISO || new Date(Date.now() + 14 * 86400000).toISOString(),
    problems: fallback?.problems ?? [],
    learnings: fallback?.learnings ?? [],
    curriculum: fallback?.curriculum ?? [],
    faqs: fallback?.faqs ?? [],
    perks: fallback?.perks ?? [],
    priceBdt: price,
    seatsLeft: total ? Math.max(0, total - (row.seats_booked ?? 0)) : null,
    startsAt: row.starts_at,
    mentor: {
      name: str(row.mentor_name) || "Md. Rakibul Islam",
      role: str(row.mentor_role) || "Founder, AI Sorix",
      bio: str(row.mentor_bio),
      avatar: row.mentor_avatar_url || null,
    },
  };
}

// ---------- competitions ----------

export interface CatalogCompetition extends Competition {
  id: string;
  entryFeeBdt: number;
  deadlineAt: string | null;
}

export function mapCompetition(row: CompetitionRow): CatalogCompetition {
  const fallback = staticCompetitions.find((c) => c.slug === row.slug);
  const tracks = objList(row.tracks, ["title", "desc"] as const);
  const criteria = objList(row.criteria, ["title", "desc"] as const);
  const timeline = objList(row.timeline, ["date", "title", "desc"] as const);
  const prizes = objList(row.prizes, ["place", "reward"] as const);
  const rules = strList(row.rules);
  const faqs = objList(row.faqs, ["q", "a"] as const).filter((f) => f.q && f.a);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: str(row.tagline) || fallback?.tagline || "",
    prize: str(row.prize_label) || fallback?.prize || "",
    status: str(row.status_label) || fallback?.status || "",
    cover: row.cover_url || fallback?.cover || defaultCompetitionCover,
    overview: str(row.overview) || fallback?.overview || "",
    tracks: tracks.length ? tracks : fallback?.tracks ?? [],
    criteria: criteria.length ? criteria : fallback?.criteria ?? [],
    timeline: timeline.length ? timeline : fallback?.timeline ?? [],
    prizes: prizes.length ? prizes : fallback?.prizes ?? [],
    rules: rules.length ? rules : fallback?.rules ?? [],
    faqs: faqs.length ? faqs : fallback?.faqs ?? [],
    entryFeeBdt: num(row.entry_fee_bdt),
    deadlineAt: row.deadline_at,
  };
}
