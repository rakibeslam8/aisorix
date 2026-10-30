import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  PlayCircle,
  Play,
  AlertCircle,
  CheckCircle2,
  Monitor,
  Shield,
  Star,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import ContactModal from "@/components/academy/ContactModal";
import ScholarsEnrollButton from "@/components/scholars/ScholarsEnrollButton";
import { useCourse } from "@/hooks/useScholarsCatalog";
import { canonicalCourseSlug, formatBdtBn } from "@/lib/scholarsCatalog";
import courseCover from "@/assets/course-prompt.jpg";
import mentorImg from "@/assets/founder-rakib.jpg.asset.json";

// ---------- Bangla content (hard-coded for ai-for-professionals) ----------

const BN_NUM = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (n: number) => String(n).split("").map((d) => BN_NUM[+d] ?? d).join("");

const PROBLEMS = [
  "অফিসের ছোট ছোট কাজ (ইমেইল, রিপোর্ট, সামারি) করতেই অনেক বেশি সময় চলে যায়।",
  "অনেক টুলের নাম জানেন, কিন্তু আসল কাজে কোনটা কীভাবে ইউজ করবেন সেটা ক্লিয়ার না।",
  "মিটিং, ডকুমেন্টেশন, প্রেজেন্টেশন - সব মিলিয়ে ডেইলি কাজ অনেক সময় এলোমেলো লাগে।",
  "AI ইউজ করলেও আউটপুট অনেক সময় প্রফেশনাল লেভেলের হয় না।",
];

const LEARNINGS: { title: string; desc: string }[] = [
  {
    title: "১৫ দিনের structured learning roadmap",
    desc: "এই মডিউলে আমরা বিস্তারিতভাবে এই বিষয়টি নিয়ে আলোচনা করবো এবং বাস্তব জীবনে এর প্রয়োগ শিখবো।",
  },
  {
    title: "প্রতিটি ক্লাসে practical use-case walkthrough",
    desc: "এই মডিউলে আমরা বিস্তারিতভাবে এই বিষয়টি নিয়ে আলোচনা করবো এবং বাস্তব জীবনে এর প্রয়োগ শিখবো।",
  },
  {
    title: "Office-ready prompt, doc, presentation workflow",
    desc: "এই মডিউলে আমরা বিস্তারিতভাবে এই বিষয়টি নিয়ে আলোচনা করবো এবং বাস্তব জীবনে এর প্রয়োগ শিখবো।",
  },
  {
    title: "টুল বাছাই + real কাজে apply করার clear system",
    desc: "এই মডিউলে আমরা বিস্তারিতভাবে এই বিষয়টি নিয়ে আলোচনা করবো এবং বাস্তব জীবনে এর প্রয়োগ শিখবো।",
  },
  {
    title: "সময় বাঁচানোর automation mindset",
    desc: "এই মডিউলে আমরা বিস্তারিতভাবে এই বিষয়টি নিয়ে আলোচনা করবো এবং বাস্তব জীবনে এর প্রয়োগ শিখবো।",
  },
  {
    title: "Job context-এ AI ইউজ করার confidence",
    desc: "এই মডিউলে আমরা বিস্তারিতভাবে এই বিষয়টি নিয়ে আলোচনা করবো এবং বাস্তব জীবনে এর প্রয়োগ শিখবো।",
  },
];

const PERKS = [
  { t: "লাইফটাইম এক্সেস", d: "এই কোর্সে লাইফ টাইম এক্সেস পাবেন" },
  { t: "সার্টিফিকেট", d: "কোর্স কমপ্লিট করার পর সার্টিফিকেট পাবেন" },
  { t: "কমিউনিটি এক্সেস", d: "কোর্সটি করছেন এমন সব মানুষের কমিউনিটিতে যুক্ত হতে পারবেন" },
  { t: "মেন্টর সাপোর্ট", d: "ক্লাসের নিচেই প্রশ্ন করার অপশন পাবেন, মেন্টর নিজে আপনাকে উত্তর দিবেন।" },
  { t: "প্রম্পট ই-বুক", d: "আপনার জব লাইফের জন্য প্রয়োজনীয় প্রম্পট এর একটি ই-বুক পাবেন" },
  { t: "কুইজ", d: "ক্লাস করে কুইজ দিয়ে নিজেকে যাচাই করতে পারবেন" },
];

const CURRICULUM: { title: string; lessons: string[] }[] = [
  {
    title: "Foundation - Learn the ABC of AI",
    lessons: [
      "Overview and Outcome - What you will learn in Section 01",
      "The Purpose of Using AI - You need the answer of WHY",
      "Demystifying the Hype - What is AI & What is not",
      "Making AI Mindset - The Renaissance of Your Brain",
      "Prompt Engineering - All the details you must know",
    ],
  },
  {
    title: "AI in Writing - Make your Pen Mightier",
    lessons: [
      "Section overview & outcomes",
      "Professional email drafting with AI",
      "Tone, style and audience control",
      "Reports & long-form documents",
      "Meeting notes → structured summary",
      "Editing, proofreading & rewrite workflow",
      "Hands-on: your weekly writing system",
    ],
  },
  {
    title: "AI in Presentation & Graphics - Turn Your Unseen Ideas into Picture-Perfect Visual",
    lessons: [
      "Section overview & outcomes",
      "Slide outline generation",
      "Speaker notes & narration script",
      "Choosing the right AI deck tool",
      "Designing slides with AI",
      "Image generation basics",
      "Brand-safe visual prompts",
      "Charts & data visualization",
      "Icon & illustration workflow",
      "Editing AI-generated images",
      "Pitch deck case study",
      "Sales deck case study",
      "Hands-on: build your own deck",
    ],
  },
  {
    title: "AI in Research - From Confusion to Conclusion Like Sherlock",
    lessons: [
      "Section overview & outcomes",
      "Web research workflow with AI",
      "Source evaluation & fact-checking",
      "Summarising long PDFs & papers",
      "Building a research brief",
      "Hands-on: complete research project",
    ],
  },
  {
    title: "AI in Data Analysis - Decode Data & Take Decision",
    lessons: [
      "Section overview & outcomes",
      "Spreadsheets + AI basics",
      "Cleaning messy data",
      "Asking the right analytical questions",
      "Insight extraction & storytelling",
      "Hands-on: real dataset walkthrough",
    ],
  },
  {
    title: "AI in Personal Productivity - Less Stress, More Success",
    lessons: [
      "Section overview & outcomes",
      "Daily routine automation",
      "Building your personal prompt library",
      "Inbox, calendar & task workflow",
      "Avoiding burnout with AI",
      "Capstone: ship a workflow in your own job",
    ],
  },
];


const FAQS = [
  { q: "কোডিং না জানলে কি কোর্সটি করা যাবে?", a: "হ্যাঁ। সম্পূর্ণ কোর্সটি no-code, শুধু AI টুল ব্যবহার শেখানো হবে।" },
  { q: "কোর্স access কতদিন থাকবে?", a: "একবার এনরোল করলে লাইফটাইম এক্সেস — যত খুশি revisit করতে পারবেন।" },
  { q: "সার্টিফিকেট পাব?", a: "হ্যাঁ, capstone সম্পন্ন করলে Sorix Scholars verified certificate পাবেন।" },
  { q: "ক্লাস কি লাইভ?", a: "না, ক্লাসগুলো রেকর্ডেড। নিজের সময়মতো দেখতে পারবেন। প্রশ্নের উত্তর মেন্টর দিবেন।" },
  { q: "পেমেন্ট কিভাবে করব?", a: "bKash, Nagad, কার্ড সহ সকল নিরাপদ পেমেন্ট মেথড সাপোর্ট করি।" },
];

// ---------- Component ----------

export default function CourseDetailPage() {
  const { slug = "" } = useParams();
  const { course, isLoading } = useCourse(slug);
  const [openModule, setOpenModule] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [promo, setPromo] = useState("");
  if (canonicalCourseSlug(slug) !== slug) return <Navigate to={`/sorixscholars/courses/${canonicalCourseSlug(slug)}`} replace />;
  if (isLoading) return <div className="min-h-[60vh] bg-[#0a1530]" />;
  // Not published (or deleted) in the admin => not live.
  if (!course) return <Navigate to="/sorixscholars/courses" replace />;

  // Admin-edited content wins; the hand-written Bangla copy is used only for the original course
  // when the admin has not filled the matching field.
  const rich = course.hasRichContent;
  const problems = rich ? PROBLEMS : [];
  const learnings = course.outcomesFromDb
    ? course.outcomes.map((t) => ({ title: t, desc: "" }))
    : rich ? LEARNINGS : [];
  const curriculum = course.curriculumFromDb ? course.curriculum : rich ? CURRICULUM : [];
  const faqs = course.faqsFromDb ? course.faqs : rich ? FAQS : [];
  const totalLessons = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
  const discountPct = course.oldPriceBdt ? Math.round((1 - course.priceBdt / course.oldPriceBdt) * 100) : 0;


  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const bnFont = { fontFamily: "'Noto Serif Bengali', serif" };
  const displayFont = { fontFamily: "'Playfair Display', 'Noto Serif Bengali', serif" };

  return (
    <div className="bg-background">
      <SEOHead
        title={`${course.title} · Sorix Scholars`}
        description={course.tagline}
        path={`/sorixscholars/courses/${course.slug}`}
        ogImage={course.cover}
      />

      {/* Back link */}
      <div className="bg-[#0a1530]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Link
            to="/sorixscholars/courses"
            className="inline-flex items-center gap-1.5 text-sm text-blue-200/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> সব কোর্স
          </Link>
        </div>
      </div>

      {/* ============ 1. HERO ============ */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background:
            "radial-gradient(1200px 600px at 80% 0%, #1e3a8a55, transparent 60%), linear-gradient(180deg, #0a1530 0%, #0b1a3a 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-sm" style={bnFont}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> ভর্তি হন এখনই
            </div>
            <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight" style={displayFont}>
              {course.title}
            </h1>
            <div className="mt-6 pl-4 border-l-2 border-blue-400/60">
              <p className="text-lg text-blue-100/90 leading-relaxed" style={bnFont}>
                {course.tagline}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo("enroll")}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30 transition"
                style={bnFont}
              >
                কোর্সে ভর্তি হোন <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTo("curriculum")}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold transition"
                style={bnFont}
              >
                <BookOpen className="w-4 h-4" /> কারিকুলাম দেখুন
              </button>
            </div>
          </div>

          {/* Video card */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video">
              <img src={course.cover ?? courseCover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <button
                onClick={() => toast("ভিডিও শীঘ্রই আসছে", { description: "প্রিভিউ ভিডিও যোগ করা হচ্ছে।" })}
                className="absolute inset-0 flex items-center justify-center group"
                aria-label="Play preview"
              >
                <span className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-2xl group-hover:scale-110 transition">
                  <Play className="w-9 h-9 text-white fill-white ml-1" />
                </span>
              </button>
              <div className="absolute left-4 right-4 bottom-4 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/60 backdrop-blur border border-white/10 text-sm" style={bnFont}>
                <span>🚀 আজই শুরু করুন আপনার AI জার্নি</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 2. PROBLEMS ============ */}
      {problems.length > 0 && (
      <section className="bg-[#f6f7fb] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl font-bold text-[#0a1530]" style={displayFont}>
            এই সমস্যাগুলোর সাথে কি আপনি রিলেট করতে পারছেন?
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 gap-5">
            {problems.map((p) => (
              <div key={p} className="flex gap-4 rounded-2xl bg-white border-l-[3px] border-rose-400 p-6 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                </div>
                <p className="text-[#0a1530] leading-relaxed" style={bnFont}>{p}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-[#0a1530] text-white px-8 py-10 text-center leading-loose" style={bnFont}>
            এই কোর্সে আমরা ধাপে ধাপে এই সমস্যাগুলোর সমাধান করবো যাতে আপনি কম সময়ে গুছিয়ে, স্মার্টভাবে আর প্রফেশনাল মানে কাজ শেষ করতে পারেন।
          </div>
        </div>
      </section>
      )}

      {/* ============ 3. LEARNINGS ============ */}
      {learnings.length > 0 && (
      <section
        className="py-20 text-white"
        style={{
          background:
            "linear-gradient(180deg, #061026 0%, #0a1734 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl font-bold" style={displayFont}>
            কোর্সে কী কী শিখতে পারবেন
          </h2>
          <div className="mx-auto mt-3 h-px w-20 bg-white/30" />
          <div className="mt-12 grid sm:grid-cols-2 gap-5">
            {learnings.map((l) => (
              <div key={l.title} className="flex gap-4 rounded-2xl bg-white/[0.03] border border-white/10 p-6 hover:border-blue-400/40 transition">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                  <PlayCircle className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-snug">{l.title}</h3>
                  <p className="mt-2 text-sm text-blue-100/70 leading-relaxed" style={bnFont}>{l.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ============ 4. SUMMARY + PERKS ============ */}
      <section className="bg-gradient-to-b from-[#f6f7fb] to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-6">
          {/* Summary */}
          <div className="rounded-3xl bg-white/80 backdrop-blur border border-slate-200 p-8 lg:p-10 shadow-sm">
            <h2 className="text-3xl font-bold text-[#0a1530]" style={displayFont}>কোর্স সামারি</h2>
            <p className="mt-5 text-[#0a1530]/80 leading-relaxed" style={bnFont}>
              {course.overview || course.tagline}
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {rich ? (
                <>
                  <Stat big="১৫ দিনের" small="execution roadmap" />
                  <Stat big="৫টি" small="practical module" />
                  <Stat big="১৫টি" small="office use-case class" />
                </>
              ) : (
                <>
                  <Stat big={`${toBn(curriculum.length)}টি`} small="মডিউল" />
                  <Stat big={`${toBn(totalLessons)}টি`} small="ক্লাস" />
                  <Stat big={course.level} small={course.duration || "লেভেল"} />
                </>
              )}
              <Stat big="লাইফটাইম অ্যাক্সেস" small="কোর্সে লাইফ টাইম এক্সেস" />
              <div className="sm:col-span-2 rounded-2xl bg-white border border-slate-200 p-5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0a1530]" style={bnFont}>সকল ডিভাইস সাপোর্ট</div>
                  <div className="text-sm text-slate-500 mt-1" style={bnFont}>মোবাইল ও পিসি থেকে দেখার সুবিধা</div>
                </div>
                <Monitor className="w-7 h-7 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Perks */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0a1530] to-[#10204a] text-white p-8 lg:p-10 shadow-2xl">
            <h2 className="text-3xl font-bold" style={displayFont}>আপনি পাবেন</h2>
            <p className="mt-2 text-blue-100/70" style={bnFont}>কোর্সের সাথে যা যা থাকছে</p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {PERKS.map((p) => (
                <div key={p.t} className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
                  <div className="flex items-center gap-2 text-blue-300 font-semibold" style={bnFont}>
                    <CheckCircle2 className="w-4 h-4" /> {p.t}
                  </div>
                  <p className="mt-2 text-sm text-blue-100/70 leading-relaxed" style={bnFont}>{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 5. CURRICULUM ============ */}
      {curriculum.length > 0 && (
      <section
        id="curriculum"
        className="relative py-20 text-white"
        style={{ background: "linear-gradient(180deg, #061026 0%, #08142e 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl font-bold" style={displayFont}>
            কোর্স কারিকুলাম
          </h2>
          <div className="mt-5 flex justify-center">
            <span className="px-5 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-200 text-sm" style={bnFont}>
              মোট {toBn(curriculum.length)} টি মডিউল • {toBn(totalLessons)} টি ক্লাস
            </span>
          </div>

          <div className="relative mt-12 pl-14 sm:pl-16">
            {/* vertical line */}
            <div className="absolute left-5 sm:left-7 top-4 bottom-4 w-px bg-blue-400/20" />
            <div className="space-y-4">
              {curriculum.map((m, i) => {
                const open = openModule === i;
                return (
                  <div key={m.title} className="relative">
                    {/* number bubble */}
                    <div className="absolute -left-14 sm:-left-16 top-4 w-10 h-10 rounded-full bg-[#08142e] border border-blue-400/40 text-blue-200 flex items-center justify-center font-bold shadow-lg shadow-blue-500/10" style={bnFont}>
                      {toBn(i + 1)}
                    </div>
                    <button
                      onClick={() => setOpenModule(open ? null : i)}
                      className={`w-full text-left rounded-2xl border transition px-6 py-5 flex items-start justify-between gap-4 ${
                        open
                          ? "bg-blue-500/[0.06] border-blue-400/40"
                          : "bg-white/[0.02] border-white/10 hover:border-blue-400/30"
                      }`}
                    >
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold leading-snug">{m.title}</h3>
                        <p className="mt-1 text-sm text-blue-100/60" style={bnFont}>
                          {toBn(m.lessons.length)} টি ক্লাস
                        </p>
                      </div>
                      <ChevronDown className={`w-5 h-5 mt-1 text-blue-200 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <ul className="mt-2 ml-2 rounded-2xl bg-blue-500/[0.04] border border-blue-400/20 px-6 py-4 space-y-3">
                        {m.lessons.map((l, li) => (
                          <li key={l} className="flex items-center gap-4 text-blue-50/90">
                            <span className="text-blue-300/70 text-sm w-5 text-right" style={bnFont}>{toBn(li + 1)}</span>
                            <PlayCircle className="w-4 h-4 text-blue-300 flex-shrink-0" />
                            <span className="text-sm sm:text-base">{l}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ============ 6. MENTOR ============ */}
      <section className="bg-gradient-to-b from-[#f6f7fb] to-white pt-20">
        <h2 className="text-center text-3xl sm:text-4xl font-bold text-[#0a1530]" style={displayFont}>
          শিক্ষার্থীদের মন্তব্য
        </h2>
      </section>
      <section className="bg-[#06102a] text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10 items-center">
          <div className="rounded-3xl overflow-hidden border border-white/10 aspect-square max-w-md mx-auto md:mx-0 shadow-2xl">
            <img src={mentorImg.url} alt={course.instructor.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-sm" style={bnFont}>
              আপনার মেন্টর
            </span>
            <h3 className="mt-5 text-4xl sm:text-5xl font-bold leading-tight" style={displayFont}>
              {course.instructor.name}
            </h3>
            <p className="mt-3 text-blue-300" style={bnFont}>{course.instructor.role}</p>
            <p className="mt-6 text-blue-100/80 leading-relaxed" style={bnFont}>
              {course.instructor.bio}
            </p>
          </div>
        </div>
      </section>

      {/* ============ 7. FAQ ============ */}
      {faqs.length > 0 && (
      <section className="bg-[#f6f7fb] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl font-bold text-[#0a1530]" style={displayFont}>
            সচরাচর জিজ্ঞাসিত প্রশ্নাবলী
          </h2>
          <div className="mt-10 space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-semibold text-[#0a1530]" style={bnFont}>{f.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-6 pb-5 -mt-1 text-slate-600 leading-relaxed" style={bnFont}>{f.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ============ 8. ENROLL ============ */}
      <section id="enroll" className="bg-gradient-to-b from-white to-[#f6f7fb] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-4xl sm:text-5xl font-bold text-[#0a1530]" style={displayFont}>
            এখনই প্রিবুক করুন
          </h2>
          <p className="mt-3 text-center text-slate-600" style={bnFont}>
            এটি বিশেষ প্রিবুক মূল্য, প্রিবুকিং শেষ হলে কখনই এই মূল্যে কোর্সটি কিনতে পারবেন না
          </p>

          <div className="relative mt-12 rounded-3xl bg-[#06102a] text-white p-6 sm:p-10 shadow-2xl overflow-hidden">
            {/* best value badge */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/40 flex items-center gap-1" style={bnFont}>
              <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" /> বেস্ট ভ্যালু
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <h3 className="text-xl font-bold" style={bnFont}>কোর্সে যা যা পাচ্ছেন:</h3>
                <ul className="mt-6 space-y-4">
                  {(rich
                    ? ["১৫ দিনের structured learning roadmap","প্রতিটি ক্লাসে practical use-case walkthrough","Office-ready prompt, doc, presentation workflow","টুল বাছাই + real কাজে apply করার clear system","কোর্সে লাইফটাইম অ্যাক্সেস","কোর্স শেষে সার্টিফিকেট"]
                    : [...course.outcomes.slice(0, 4), "কোর্সে লাইফটাইম অ্যাক্সেস", "কোর্স শেষে সার্টিফিকেট"]
                  ).map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span className="text-blue-50/90" style={bnFont}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {course.oldPriceBdt ? (
                  <div className="flex items-center gap-3">
                    <span className="text-blue-200/60 line-through text-lg" style={bnFont}>৳{formatBdtBn(course.oldPriceBdt)}</span>
                    {discountPct > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold" style={bnFont}>{formatBdtBn(discountPct)}% ছাড়</span>
                    )}
                  </div>
                ) : null}
                <div className="mt-2 text-6xl sm:text-7xl font-bold tracking-tight" style={displayFont}>
                  {course.priceBdt > 0 ? (<><span className="text-blue-300 text-3xl align-top mr-1">৳</span>{formatBdtBn(course.priceBdt)}</>) : "ফ্রি"}
                </div>

                <div className="mt-6 flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <Tag className="w-4 h-4 text-blue-300" />
                    <input
                      type="text"
                      value={promo}
                      onChange={(e) => setPromo(e.target.value)}
                      placeholder="প্রোমো কোড থাকলে লিখুন"
                      className="flex-1 bg-transparent outline-none text-sm placeholder:text-blue-100/40"
                      style={bnFont}
                    />
                  </div>
                  <button
                    onClick={() => toast("শীঘ্রই আসছে", { description: "প্রোমো কোড সিস্টেম শীঘ্রই চালু হবে।" })}
                    className="px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm"
                    style={bnFont}
                  >
                    প্রয়োগ করুন
                  </button>
                </div>

                <div className="mt-4">
                  <ScholarsEnrollButton
                    kind="course"
                    slug={course.slug}
                    title={course.title}
                    priceBdt={course.priceBdt}
                    className="w-full text-lg py-4 rounded-2xl"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300" style={bnFont}>
                  <Shield className="w-4 h-4" /> ১০০% নিরাপদ পেমেন্ট ও ইনস্ট্যান্ট এক্সেস
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`প্রিবুক · ${course.title}`}
        subtitle="তথ্য পাঠান, আমরা ২৪ ঘণ্টার মধ্যে যোগাযোগ করবো।"
        subjectPrefix={`Pre-book: ${course.title}`}
        extraLabel="Company / Role (optional)"
      />
    </div>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5">
      <div className="text-xl font-bold text-[#0a1530]" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>{big}</div>
      <div className="mt-1 text-sm text-slate-500">{small}</div>
    </div>
  );
}
