import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  PlayCircle,
  Play,
  AlertCircle,
  CheckCircle2,
  Shield,
  Star,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import ContactModal from "@/components/academy/ContactModal";
import { supabase } from "@/integrations/supabase/client";
import ScholarsEnrollButton from "@/components/scholars/ScholarsEnrollButton";

const BN_NUM = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export const toBn = (n: number | string) =>
  String(n).split("").map((d) => BN_NUM[+d] ?? d).join("");

export interface DetailConfig {
  // Meta
  seoTitle: string;
  seoDescription: string;
  seoPath: string;
  backHref: string;
  backLabel: string;

  // Hero
  heroBadge: string;
  heroTitleLines: string[]; // big serif lines
  heroTagline: string;
  heroPills: { icon: React.ReactNode; label: string }[];
  heroCoverUrl: string;
  primaryCtaLabel: string;
  curriculumCtaLabel: string;
  deadlineISO?: string; // for countdown

  // Sections
  problemsTitle: string;
  problems: string[];
  problemsFootnote: string;

  learningsTitle: string;
  learnings: { title: string; desc: string }[];

  curriculumTitle: string;
  curriculumPill: string;
  curriculum: { title: string; lessons: string[] }[];

  mentorPill: string;
  mentorName: string;
  mentorRole: string;
  mentorBio: string;
  mentorImageUrl: string;

  faqsTitle: string;
  faqs: { q: string; a: string }[];

  enrollTitle: string;
  enrollSubtitle: string;
  enrollPerks: string[];
  price: string;
  oldPrice?: string;
  discountLabel?: string;
  enrollCtaLabel: string;

  contactSubjectPrefix: string;
  contactModalTitle: string;

  // Optional auto-enrollment when the user is signed in
  enrollKind?: "course" | "workshop" | "competition";
  enrollSlug?: string;
  // Numeric BDT price used by the Scholars secure-checkout button
  enrollPriceBdt?: number;
  enrollItemTitle?: string;
  enrollSeatsAvailable?: number | null;
}

const bnFont = { fontFamily: "'Noto Serif Bengali', serif" };
const displayFont = {
  fontFamily: "'Playfair Display', 'Noto Serif Bengali', serif",
};

export default function SorixDetailPage({ cfg }: { cfg: DetailConfig }) {
  const [openModule, setOpenModule] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [promo, setPromo] = useState("");
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!cfg.deadlineISO) return;
    const target = new Date(cfg.deadlineISO).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cfg.deadlineISO]);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const totalLessons = cfg.curriculum.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="bg-background pb-24">
      <SEOHead
        title={cfg.seoTitle}
        description={cfg.seoDescription}
        path={cfg.seoPath}
        ogImage={cfg.heroCoverUrl}
      />

      {/* Back */}
      <div className="bg-[#0a1530]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Link
            to={cfg.backHref}
            className="inline-flex items-center gap-1.5 text-sm text-blue-200/80 hover:text-white transition-colors"
            style={bnFont}
          >
            <ArrowLeft className="w-4 h-4" /> {cfg.backLabel}
          </Link>
        </div>
      </div>

      {/* HERO */}
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
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-sm"
              style={bnFont}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {cfg.heroBadge}
            </div>
            <h1
              className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight"
              style={displayFont}
            >
              {cfg.heroTitleLines.map((l, i) => (
                <div key={i} className={i === cfg.heroTitleLines.length - 1 ? "text-yellow-300" : ""}>
                  {l}
                </div>
              ))}
            </h1>
            <div className="mt-6 pl-4 border-l-2 border-blue-400/60">
              <p className="text-base sm:text-lg text-blue-100/90 leading-relaxed" style={bnFont}>
                {cfg.heroTagline}
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {cfg.heroPills.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-blue-100"
                  style={bnFont}
                >
                  <span className="text-blue-300">{p.icon}</span>
                  {p.label}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo("enroll")}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-[#0a1530] font-bold shadow-lg shadow-yellow-400/30 transition"
                style={bnFont}
              >
                {cfg.primaryCtaLabel} <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTo("curriculum")}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold transition"
                style={bnFont}
              >
                <BookOpen className="w-4 h-4" /> {cfg.curriculumCtaLabel}
              </button>
            </div>
          </div>

          {/* Video card + countdown */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video">
              <img
                src={cfg.heroCoverUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <button
                onClick={() =>
                  toast("ভিডিও শীঘ্রই আসছে", {
                    description: "প্রিভিউ ভিডিও যোগ করা হচ্ছে।",
                  })
                }
                className="absolute inset-0 flex items-center justify-center group"
                aria-label="Play preview"
              >
                <span className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-2xl group-hover:scale-110 transition">
                  <Play className="w-9 h-9 text-white fill-white ml-1" />
                </span>
              </button>
            </div>

            {cfg.deadlineISO && (
              <div
                className="mt-4 flex items-center justify-center gap-3 sm:gap-5 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-sm flex-wrap"
                style={bnFont}
              >
                <span className="inline-flex items-center gap-1.5 text-rose-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  রেজিস্ট্রেশন শেষ হতে বাকি:
                </span>
                {(["d", "h", "m", "s"] as const).map((k, i) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className="text-white font-bold text-lg">
                      {toBn(String(countdown[k]).padStart(2, "0"))}
                    </span>
                    <span className="text-blue-200/70 text-xs">
                      {k === "d" ? "দিন" : k === "h" ? "ঘণ্টা" : k === "m" ? "মিনিট" : "সেকেন্ড"}
                    </span>
                    {i < 3 && <span className="text-blue-200/40">:</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PROBLEMS */}
      {cfg.problems.length > 0 && (
      <section className="bg-[#f6f7fb] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-center text-3xl sm:text-4xl font-bold text-[#0a1530]"
            style={displayFont}
          >
            {cfg.problemsTitle}
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded bg-rose-400" />
          <div className="mt-12 grid sm:grid-cols-2 gap-5">
            {cfg.problems.map((p) => (
              <div
                key={p}
                className="flex gap-4 rounded-2xl bg-white border-l-[3px] border-rose-400 p-6 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                </div>
                <p className="text-[#0a1530] leading-relaxed" style={bnFont}>
                  {p}
                </p>
              </div>
            ))}
          </div>
          {cfg.problemsFootnote && (
            <div
              className="mt-8 rounded-2xl bg-[#0a1530] text-white px-8 py-10 text-center leading-loose"
              style={bnFont}
            >
              {cfg.problemsFootnote}
            </div>
          )}
        </div>
      </section>
      )}

      {/* LEARNINGS */}
      {cfg.learnings.length > 0 && (
      <section
        className="relative py-20 text-white"
        style={{ background: "linear-gradient(180deg, #061026 0%, #0a1734 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl font-bold" style={displayFont}>
            {cfg.learningsTitle}
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded bg-blue-400" />
          <div className="mt-12 grid sm:grid-cols-2 gap-5">
            {cfg.learnings.map((l) => (
              <div
                key={l.title}
                className="flex gap-4 rounded-2xl bg-white/[0.03] border border-white/10 p-6 hover:border-blue-400/40 transition"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                  <PlayCircle className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-snug" style={bnFont}>
                    {l.title}
                  </h3>
                  <p className="mt-2 text-sm text-blue-100/70 leading-relaxed" style={bnFont}>
                    {l.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CURRICULUM */}
      {cfg.curriculum.length > 0 && (
      <section
        id="curriculum"
        className="relative py-20 text-white"
        style={{ background: "linear-gradient(180deg, #061026 0%, #08142e 100%)" }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl font-bold" style={displayFont}>
            {cfg.curriculumTitle}
          </h2>
          <div className="mt-5 flex justify-center">
            <span
              className="px-5 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-200 text-sm"
              style={bnFont}
            >
              {cfg.curriculumPill.replace("{n}", toBn(cfg.curriculum.length)).replace(
                "{t}",
                toBn(totalLessons),
              )}
            </span>
          </div>

          <div className="relative mt-12 pl-14 sm:pl-16">
            <div className="absolute left-5 sm:left-7 top-4 bottom-4 w-px bg-blue-400/20" />
            <div className="space-y-4">
              {cfg.curriculum.map((m, i) => {
                const open = openModule === i;
                return (
                  <div key={m.title} className="relative">
                    <div
                      className="absolute -left-14 sm:-left-16 top-4 w-10 h-10 rounded-full bg-[#08142e] border border-blue-400/40 text-blue-200 flex items-center justify-center font-bold shadow-lg shadow-blue-500/10"
                      style={bnFont}
                    >
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
                        <h3 className="text-lg sm:text-xl font-bold leading-snug" style={bnFont}>
                          {m.title}
                        </h3>
                        <p className="mt-1 text-sm text-blue-100/60" style={bnFont}>
                          {toBn(m.lessons.length)} টি ক্লাস
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 mt-1 text-blue-200 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {open && (
                      <ul className="mt-2 ml-2 rounded-2xl bg-blue-500/[0.04] border border-blue-400/20 px-6 py-4 space-y-3">
                        {m.lessons.map((l, li) => (
                          <li key={l} className="flex items-center gap-4 text-blue-50/90">
                            <span
                              className="text-blue-300/70 text-sm w-5 text-right"
                              style={bnFont}
                            >
                              {toBn(li + 1)}
                            </span>
                            <PlayCircle className="w-4 h-4 text-blue-300 flex-shrink-0" />
                            <span className="text-sm sm:text-base" style={bnFont}>
                              {l}
                            </span>
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

      {/* MENTOR */}
      <section className="bg-gradient-to-b from-[#f6f7fb] to-white pt-20">
        <h2
          className="text-center text-3xl sm:text-4xl font-bold text-[#0a1530]"
          style={displayFont}
        >
          {cfg.mentorPill === "আয়োজক" ? "আয়োজকের পরিচয়" : "আপনার ইনস্ট্রাক্টর"}
        </h2>
      </section>
      <section className="bg-[#06102a] text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10 items-center">
          <div className="rounded-3xl overflow-hidden border border-white/10 aspect-square max-w-md mx-auto md:mx-0 shadow-2xl">
            <img
              src={cfg.mentorImageUrl}
              alt={cfg.mentorName}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span
              className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-sm"
              style={bnFont}
            >
              {cfg.mentorPill}
            </span>
            <h3
              className="mt-5 text-4xl sm:text-5xl font-bold leading-tight"
              style={displayFont}
            >
              {cfg.mentorName}
            </h3>
            <p className="mt-3 text-blue-300" style={bnFont}>
              {cfg.mentorRole}
            </p>
            <p
              className="mt-6 pl-4 border-l-2 border-blue-400/60 text-blue-100/80 leading-relaxed"
              style={bnFont}
            >
              {cfg.mentorBio}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {cfg.faqs.length > 0 && (
      <section className="bg-[#f6f7fb] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-center text-3xl sm:text-4xl font-bold text-[#0a1530]"
            style={displayFont}
          >
            {cfg.faqsTitle}
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded bg-blue-400" />
          <div className="mt-10 space-y-3">
            {cfg.faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={f.q}
                  className={`rounded-2xl border overflow-hidden transition ${
                    open
                      ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                          open ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        ?
                      </span>
                      <span
                        className={`font-semibold ${open ? "text-blue-700" : "text-[#0a1530]"}`}
                        style={bnFont}
                      >
                        {f.q}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div
                      className="px-6 pb-5 pl-16 -mt-1 text-slate-700 leading-relaxed"
                      style={bnFont}
                    >
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ENROLL */}
      <section
        id="enroll"
        className="bg-gradient-to-b from-white to-[#f6f7fb] py-20"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-center text-4xl sm:text-5xl font-bold text-[#0a1530]"
            style={displayFont}
          >
            {cfg.enrollTitle}
          </h2>
          <p className="mt-3 text-center text-slate-600" style={bnFont}>
            {cfg.enrollSubtitle}
          </p>

          <div className="relative mt-12 rounded-3xl bg-[#06102a] text-white p-6 sm:p-10 shadow-2xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <div
              className="absolute top-4 right-4 sm:top-6 sm:right-6 px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/40 flex items-center gap-1"
              style={bnFont}
            >
              <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" /> বেস্ট ভ্যালু
            </div>

            <div className="grid md:grid-cols-2 gap-10 mt-2">
              <div>
                <h3 className="text-xl font-bold" style={bnFont}>
                  যা যা পাচ্ছেন:
                </h3>
                <ul className="mt-6 space-y-4">
                  {cfg.enrollPerks.map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span className="text-blue-50/90" style={bnFont}>
                        {t}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {cfg.oldPrice && (
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 line-through text-lg" style={bnFont}>
                      {cfg.oldPrice}
                    </span>
                    {cfg.discountLabel && (
                      <span
                        className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold"
                        style={bnFont}
                      >
                        {cfg.discountLabel}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className="mt-2 text-6xl sm:text-7xl font-bold tracking-tight"
                  style={displayFont}
                >
                  {cfg.price}
                </div>
                <p className="mt-2 text-blue-200/70 text-sm" style={bnFont}>
                  সীমিত সময়ের জন্য
                </p>

                <div className="mt-6">
                  <label
                    className="text-xs text-blue-200/80 mb-2 block"
                    style={bnFont}
                  >
                    প্রোমো কোড (যদি থাকে)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
                      <Tag className="w-4 h-4 text-blue-300" />
                      <input
                        type="text"
                        value={promo}
                        onChange={(e) => setPromo(e.target.value)}
                        placeholder="কুপন কোড দিন"
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-blue-100/40"
                        style={bnFont}
                      />
                    </div>
                    <button
                      onClick={() =>
                        toast("শীঘ্রই আসছে", {
                          description: "প্রোমো কোড সিস্টেম শীঘ্রই চালু হবে।",
                        })
                      }
                      className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <p
                  className="mt-4 text-center text-yellow-300 text-sm font-semibold"
                  style={bnFont}
                >
                  ⚡ মাত্র {toBn(998)} টি সিট বাকি
                </p>

                {cfg.enrollKind && cfg.enrollSlug && typeof cfg.enrollPriceBdt === "number" ? (
                  <div className="mt-4 flex justify-center">
                    <ScholarsEnrollButton
                      kind={cfg.enrollKind}
                      slug={cfg.enrollSlug}
                      title={cfg.enrollItemTitle || cfg.heroTitleLines.join(" ")}
                      priceBdt={cfg.enrollPriceBdt}
                      seatsAvailable={cfg.enrollSeatsAvailable ?? null}
                      className="w-full text-lg py-4 rounded-2xl"
                    />
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      setModalOpen(true);
                      if (cfg.enrollKind && cfg.enrollSlug) {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            await supabase.rpc("enroll_item" as any, {
                              _kind: cfg.enrollKind,
                              _slug: cfg.enrollSlug,
                              _title: cfg.heroTitleLines.join(" "),
                            });
                          }
                        } catch {}
                      }
                    }}
                    className="mt-4 w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-95 text-white font-bold text-lg transition shadow-xl"
                    style={bnFont}
                  >
                    {cfg.enrollCtaLabel} <ArrowRight className="w-5 h-5" />
                  </button>
                )}

                <div
                  className="mt-5 flex items-center justify-center gap-5 text-xs text-blue-200/80"
                  style={bnFont}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" /> সিকিউর পেমেন্ট
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-300" /> লাইফটাইম অ্যাক্সেস
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[min(960px,calc(100vw-2rem))] z-40">
        <div
          className="rounded-2xl bg-[#06102a]/95 backdrop-blur border border-white/10 shadow-2xl px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-5 flex-wrap"
          style={bnFont}
        >
          <span className="text-white font-semibold text-sm sm:text-base line-clamp-1 flex-1 min-w-0">
            {cfg.heroTitleLines.join(" ")}
          </span>
          <span className="text-yellow-300 font-bold">{cfg.price}</span>
          {cfg.deadlineISO && (
            <span className="hidden sm:inline text-xs text-blue-200/80">
              {toBn(String(countdown.d).padStart(2, "0"))}:
              {toBn(String(countdown.h).padStart(2, "0"))}:
              {toBn(String(countdown.m).padStart(2, "0"))}:
              {toBn(String(countdown.s).padStart(2, "0"))}
            </span>
          )}
          <button
            onClick={() => scrollTo("enroll")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-[#0a1530] font-bold text-sm whitespace-nowrap"
          >
            {cfg.primaryCtaLabel} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={cfg.contactModalTitle}
        subtitle="তথ্য পাঠান, আমরা ২৪ ঘণ্টার মধ্যে যোগাযোগ করবো।"
        subjectPrefix={cfg.contactSubjectPrefix}
        extraLabel="Phone / WhatsApp (optional)"
      />
    </div>
  );
}
