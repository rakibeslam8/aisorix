import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { courses as staticCourses, competitions as staticCompetitions } from "@/data/academy";
import { WORKSHOPS as staticWorkshops } from "@/data/workshops";
import {
  canonicalCourseSlug,
  mapCompetition,
  mapCourse,
  mapWorkshop,
  COURSE_SLUG_ALIASES,
  type CatalogCompetition,
  type CatalogCourse,
  type CatalogWorkshop,
  type CompetitionRow,
  type CourseRow,
  type LessonRow,
  type ModuleRow,
  type WorkshopRow,
} from "@/lib/scholarsCatalog";

// Public Scholars content, read from the tables that Admin > Scholars edits.
// Only published rows are visible to visitors (row level security), so publishing in the admin
// is what makes an item live; unpublishing removes it. Admin edits appear within a minute
// (or immediately on tab focus). If the database cannot be reached we fall back to the
// built-in content so the pages never go blank.

const QUERY_OPTS = { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } as const;

const COURSE_COLS =
  "id, slug, title, tagline, level, duration_label, price_bdt, old_price_bdt, cover_url, banner_url, overview, outcomes, instructor, faqs, sort_order";
const WORKSHOP_COLS =
  "id, slug, title, summary, description, cover_url, mentor_name, mentor_role, mentor_bio, mentor_avatar_url, duration_hours, price_bdt, starts_at, seats_total, seats_booked, location";
const COMPETITION_COLS =
  "id, slug, title, tagline, cover_url, overview, rules, prizes, tracks, criteria, timeline, faqs, entry_fee_bdt, prize_label, status_label, starts_at, deadline_at, max_participants";

const digits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

const staticCourseFallback = (): CatalogCourse[] =>
  staticCourses.map((c) => ({
    ...c,
    id: c.slug,
    slug: canonicalCourseSlug(c.slug),
    priceBdt: digits(c.priceLabel),
    oldPriceBdt: null,
    banner: null,
    hasRichContent: true,
    outcomesFromDb: false,
    curriculumFromDb: false,
    faqsFromDb: false,
  }));

const staticWorkshopFallback = (): CatalogWorkshop[] =>
  staticWorkshops.map((w) => ({
    ...w,
    id: w.slug,
    priceBdt: digits(w.price),
    seatsLeft: null,
    startsAt: null,
    mentor: { name: "Md. Rakibul Islam", role: "Founder, AI Sorix", bio: "", avatar: null },
  }));

const staticCompetitionFallback = (): CatalogCompetition[] =>
  staticCompetitions.map((c) => ({ ...c, id: c.slug, entryFeeBdt: 0, deadlineAt: null }));

export interface CatalogResult<T> {
  items: T[];
  isLoading: boolean;
  /** true when the database could not be reached and built-in content is shown instead */
  isFallback: boolean;
}

async function fetchCourses(): Promise<CatalogCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_COLS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as CourseRow[]).map((r) => mapCourse(r));
}

export function useCourses(): CatalogResult<CatalogCourse> {
  const q = useQuery({ queryKey: ["scholars", "courses"], queryFn: fetchCourses, ...QUERY_OPTS });
  if (q.isError) return { items: staticCourseFallback(), isLoading: false, isFallback: true };
  return { items: q.data ?? [], isLoading: q.isLoading, isFallback: false };
}

/** One published course with its curriculum. `course` is null when it is not published / does not exist. */
export function useCourse(slug: string) {
  const dbSlug = canonicalCourseSlug(slug);
  const q = useQuery({
    queryKey: ["scholars", "course", dbSlug],
    queryFn: async (): Promise<CatalogCourse | null> => {
      const { data, error } = await supabase
        .from("courses")
        .select(COURSE_COLS)
        .eq("slug", dbSlug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as CourseRow;
      const { data: mods, error: mErr } = await supabase
        .from("course_modules")
        .select("id, course_id, title, sort_order")
        .eq("course_id", row.id)
        .order("sort_order");
      if (mErr) throw mErr;
      const modules = (mods ?? []) as unknown as ModuleRow[];
      let lessons: LessonRow[] = [];
      if (modules.length) {
        const { data: ls, error: lErr } = await supabase
          .from("course_lessons")
          .select("module_id, title, sort_order")
          .in("module_id", modules.map((m) => m.id))
          .order("sort_order");
        if (lErr) throw lErr;
        lessons = (ls ?? []) as unknown as LessonRow[];
      }
      return mapCourse(row, modules, lessons);
    },
    ...QUERY_OPTS,
  });
  if (q.isError) {
    const fb = staticCourseFallback().find((c) => c.slug === dbSlug) ?? null;
    return { course: fb, isLoading: false, isFallback: true };
  }
  return { course: q.data ?? null, isLoading: q.isLoading, isFallback: false };
}

export function useWorkshops(): CatalogResult<CatalogWorkshop> {
  const q = useQuery({
    queryKey: ["scholars", "workshops"],
    queryFn: async (): Promise<CatalogWorkshop[]> => {
      const { data, error } = await supabase
        .from("workshops")
        .select(WORKSHOP_COLS)
        .eq("is_published", true)
        .order("starts_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return ((data ?? []) as unknown as WorkshopRow[]).map(mapWorkshop);
    },
    ...QUERY_OPTS,
  });
  if (q.isError) return { items: staticWorkshopFallback(), isLoading: false, isFallback: true };
  return { items: q.data ?? [], isLoading: q.isLoading, isFallback: false };
}

export function useWorkshop(slug: string) {
  const { items, isLoading, isFallback } = useWorkshops();
  return { workshop: items.find((w) => w.slug === slug) ?? null, isLoading, isFallback };
}

export function useCompetitions(): CatalogResult<CatalogCompetition> {
  const q = useQuery({
    queryKey: ["scholars", "competitions"],
    queryFn: async (): Promise<CatalogCompetition[]> => {
      const { data, error } = await supabase
        .from("competitions")
        .select(COMPETITION_COLS)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as CompetitionRow[]).map(mapCompetition);
    },
    ...QUERY_OPTS,
  });
  if (q.isError) return { items: staticCompetitionFallback(), isLoading: false, isFallback: true };
  return { items: q.data ?? [], isLoading: q.isLoading, isFallback: false };
}

export function useCompetition(slug: string) {
  const { items, isLoading, isFallback } = useCompetitions();
  return { competition: items.find((c) => c.slug === slug) ?? null, isLoading, isFallback };
}

export { COURSE_SLUG_ALIASES };
