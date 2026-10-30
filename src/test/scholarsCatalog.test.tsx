import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ---- minimal chainable supabase mock: every builder method returns itself, awaiting resolves the table data
type Rows = Record<string, unknown[] | Error>;
let tables: Rows = {};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const result = () => {
        const d = tables[table] ?? [];
        return d instanceof Error ? { data: null, error: d } : { data: d, error: null };
      };
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "order"]) b[m] = () => b;
      b.maybeSingle = () => { const r = result(); return Promise.resolve({ data: (r.data as unknown[] | null)?.[0] ?? null, error: r.error }); };
      b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result()).then(res, rej);
      return b;
    },
  },
}));
vi.mock("@/contexts/ScholarsI18nContext", () => ({ useScholarsLang: () => ({ t: (bn: string) => bn, lang: "bn" }) }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/components/academy/ContactModal", () => ({ default: () => null }));
vi.mock("@/components/scholars/ScholarsEnrollButton", () => ({ default: ({ priceBdt }: { priceBdt: number }) => <button>ENROLL {priceBdt}</button> }));

import { mapCourse, mapWorkshop, mapCompetition, canonicalCourseSlug, formatBdt, type CourseRow } from "@/lib/scholarsCatalog";
import CoursesPage from "@/pages/CoursesPage";
import CompetitionsPage from "@/pages/CompetitionsPage";
import WorkshopsPage from "@/pages/scholars/WorkshopsPage";
import CourseDetailPage from "@/pages/CourseDetailPage";

const courseRow = (over: Partial<CourseRow> = {}): CourseRow => ({
  id: "c1", slug: "new-course", title: "Brand New Course", tagline: "Fresh tagline", level: "Beginner",
  duration_label: "3 weeks", price_bdt: 1200, old_price_bdt: 2000, cover_url: "https://x/y.png", banner_url: null,
  overview: "Overview text", outcomes: ["Learn A", "Learn B"], instructor: { name: "Jane", role: "Coach", bio: "Bio" },
  faqs: [{ q: "Q1?", a: "A1" }], ...over,
});

const wrap = (ui: React.ReactNode, path = "/") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => { tables = {}; });

describe("catalog mappers", () => {
  it("uses the admin's values and formats the price", () => {
    const c = mapCourse(courseRow(), [{ id: "m2", course_id: "c1", title: "Second", sort_order: 1 }, { id: "m1", course_id: "c1", title: "First", sort_order: 0 }],
      [{ module_id: "m1", title: "L1", sort_order: 0 }, { module_id: "m2", title: "L2", sort_order: 0 }]);
    expect(c.title).toBe("Brand New Course");
    expect(c.priceLabel).toBe("৳1,200");
    expect(c.priceBdt).toBe(1200);
    expect(c.oldPriceBdt).toBe(2000);
    expect(c.outcomes).toEqual(["Learn A", "Learn B"]);
    expect(c.curriculum.map((m) => m.title)).toEqual(["First", "Second"]);
    expect(c.curriculum[0].lessons).toEqual(["L1"]);
    expect(c.curriculumFromDb && c.outcomesFromDb && c.faqsFromDb).toBe(true);
    expect(c.hasRichContent).toBe(false);
  });

  it("fills empty admin fields from the built-in copy only for the original course", () => {
    const orig = mapCourse(courseRow({ slug: "ai-for-professionals", outcomes: [], faqs: [], tagline: "", overview: "" }));
    expect(orig.hasRichContent).toBe(true);
    expect(orig.outcomesFromDb).toBe(false);
    expect(orig.tagline.length).toBeGreaterThan(0);
    expect(orig.priceBdt).toBe(1200); // price always comes from the database, never from the static copy
    const other = mapCourse(courseRow({ outcomes: [], tagline: "" }));
    expect(other.tagline).toBe("");
    expect(other.outcomes).toEqual([]);
  });

  it("treats a bad price as free and ignores an old price that is not higher", () => {
    const c = mapCourse(courseRow({ price_bdt: "abc", old_price_bdt: 0 }));
    expect(c.priceBdt).toBe(0);
    expect(c.oldPriceBdt).toBeNull();
    expect(formatBdt(0)).toBe("Free");
  });

  it("resolves the legacy static course slug to the database slug", () => {
    expect(canonicalCourseSlug("ai-expertise-for-working-professionals")).toBe("ai-for-professionals");
    expect(canonicalCourseSlug("anything-else")).toBe("anything-else");
  });

  it("maps workshops (seats left, date from starts_at) and competitions (jsonb lists)", () => {
    const w = mapWorkshop({ id: "w1", slug: "w-new", title: "W", summary: "Sum", description: null, cover_url: null, mentor_name: null, mentor_role: null,
      mentor_bio: null, mentor_avatar_url: null, duration_hours: 2, price_bdt: "500", starts_at: "2027-03-05T15:00:00Z", seats_total: 20, seats_booked: 18, location: null });
    expect(w.seatsLeft).toBe(2);
    expect(w.priceBdt).toBe(500);
    expect(w.date).toMatch(/2027/);
    const c = mapCompetition({ id: "k1", slug: "k-new", title: "K", tagline: null, cover_url: null, overview: null, rules: ["R1", ""],
      prizes: [{ place: "1st", reward: "$100" }, { bad: 1 }], tracks: [], criteria: [], timeline: [{ date: "Jan", title: "Open", desc: "" }],
      faqs: [{ q: "q", a: "" }], entry_fee_bdt: 250, prize_label: "$100", status_label: "Open", starts_at: null, deadline_at: null, max_participants: null });
    expect(c.rules).toEqual(["R1"]);
    expect(c.prizes).toEqual([{ place: "1st", reward: "$100" }]);
    expect(c.faqs).toEqual([]);
    expect(c.entryFeeBdt).toBe(250);
    expect(c.status).toBe("Open");
  });
});

describe("public Scholars pages show what the admin published", () => {
  it("lists every published course with a link to its page", async () => {
    tables.courses = [courseRow(), courseRow({ id: "c2", slug: "second", title: "Second Course" })];
    wrap(<CoursesPage />);
    expect(await screen.findByText("Brand New Course")).toBeTruthy();
    expect(screen.getByText("Second Course")).toBeTruthy();
    const link = screen.getByText("Second Course").closest("a");
    expect(link?.getAttribute("href")).toBe("/sorixscholars/courses/second");
    expect(screen.getAllByText("৳1,200").length).toBe(2);
  });

  it("shows nothing for a course the admin has not published (the database returns no row)", async () => {
    tables.courses = [];
    wrap(<CoursesPage />);
    expect(await screen.findByText("নতুন কোর্স শীঘ্রই আসছে।")).toBeTruthy();
    expect(screen.queryByText("AI Expertise for Working Professionals")).toBeNull();
  });

  it("falls back to the built-in content when the database cannot be reached", async () => {
    tables.courses = new Error("network");
    wrap(<CoursesPage />);
    // the hook retries once (about 1s) before it gives up and shows the built-in content
    expect(await screen.findByText("AI Expertise for Working Professionals", {}, { timeout: 4000 })).toBeTruthy();
  }, 8000);

  it("lists published competitions and workshops from the database", async () => {
    tables.competitions = [{ id: "k1", slug: "k-new", title: "Admin Made Contest", tagline: "t", cover_url: null, overview: null, rules: [], prizes: [], tracks: [],
      criteria: [], timeline: [], faqs: [], entry_fee_bdt: 0, prize_label: "৳50,000", status_label: "Open", starts_at: null, deadline_at: null, max_participants: null }];
    tables.workshops = [{ id: "w1", slug: "w-new", title: "Admin Made Workshop", summary: "s", description: null, cover_url: null, mentor_name: null, mentor_role: null,
      mentor_bio: null, mentor_avatar_url: null, duration_hours: 2, price_bdt: 300, starts_at: null, seats_total: null, seats_booked: 0, location: "Zoom" }];
    wrap(<CompetitionsPage />);
    expect(await screen.findByText("Admin Made Contest")).toBeTruthy();
    expect(screen.queryByText("Sorixlab Build Challenge")).toBeNull();
    wrap(<WorkshopsPage />);
    await waitFor(() => expect(screen.getByText("Admin Made Workshop")).toBeTruthy());
    expect(screen.getByText("Admin Made Workshop").closest("a")?.getAttribute("href")).toBe("/sorixscholars/workshops/w-new");
  });
});

describe("course detail page", () => {
  const renderDetail = (slug: string) =>
    wrap(
      <Routes>
        <Route path="/sorixscholars/courses/:slug" element={<CourseDetailPage />} />
        <Route path="/sorixscholars/courses" element={<div>COURSE LIST</div>} />
      </Routes>,
      `/sorixscholars/courses/${slug}`,
    );

  it("renders an admin-created course from its own fields: price, curriculum, FAQ", async () => {
    tables.courses = [courseRow()];
    tables.course_modules = [{ id: "m1", course_id: "c1", title: "Admin Module One", sort_order: 0 }];
    tables.course_lessons = [{ module_id: "m1", title: "Admin Lesson", sort_order: 0 }];
    renderDetail("new-course");
    expect((await screen.findAllByText("Brand New Course")).length).toBeGreaterThan(0);
    expect(screen.getByText("Admin Module One")).toBeTruthy();
    expect(screen.getByText("Q1?")).toBeTruthy();
    expect(screen.getByText("১২০০")).toBeTruthy(); // current price
    expect(screen.getByText("৳২০০০")).toBeTruthy(); // strikethrough price
    expect(screen.queryByText("এই সমস্যাগুলোর সাথে কি আপনি রিলেট করতে পারছেন?")).toBeNull(); // no built-in copy for new courses
  });

  it("sends visitors away from a course that is not published", async () => {
    tables.courses = [];
    renderDetail("draft-course");
    expect(await screen.findByText("COURSE LIST")).toBeTruthy();
  });

  it("redirects the old static URL to the database slug", async () => {
    tables.courses = [courseRow({ slug: "ai-for-professionals", title: "AI for Professionals" })];
    renderDetail("ai-expertise-for-working-professionals");
    expect((await screen.findAllByText("AI for Professionals")).length).toBeGreaterThan(0);
  });
});
