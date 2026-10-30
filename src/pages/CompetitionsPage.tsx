import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useCompetitions } from "@/hooks/useScholarsCatalog";

export default function CompetitionsPage() {
  const { items: competitions, isLoading } = useCompetitions();
  return (
    <div className="bg-background min-h-screen">
      <SEOHead
        title="Sorix Scholars — আমাদের কম্পিটিশনসমূহ"
        description="Sorix Scholars কম্পিটিশন — বিল্ড চ্যালেঞ্জ ও স্টার্টআপ ফান্ডিং কম্পিটিশনে অংশ নিন। ক্যাশ, ক্রেডিট, মেন্টরশিপ ও লঞ্চ স্পটলাইট।"
        path="/sorixscholars/competitions"
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h1
            className="text-3xl sm:text-4xl lg:text-[52px] leading-tight font-bold text-foreground"
            style={{ fontFamily: "'Playfair Display', 'Noto Serif Bengali', Georgia, serif" }}
          >
            আমাদের কম্পিটিশনসমূহ
          </h1>
          <p className="mt-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
            বিশ্বব্যাপী বিল্ডার, টিম ও আর্লি-স্টেজ ফাউন্ডারদের জন্য আমাদের কম্পিটিশন। ক্যাশ, ক্রেডিট, মেন্টরশিপ ও লঞ্চ রানওয়ে জিতুন।
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {!isLoading && competitions.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">নতুন কম্পিটিশন শীঘ্রই আসছে।</p>
          )}
          {competitions.map((c) => (
            <Link
              key={c.slug}
              to={`/sorixscholars/competitions/${c.slug}`}
              className="group rounded-3xl bg-card border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={c.cover}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500 text-white text-[11px] font-bold shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {c.status}
                </span>
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur text-[11px] font-semibold text-white">
                  <Trophy className="w-3 h-3" /> {c.prize}
                </span>
              </div>

              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                <h2
                  className="text-lg sm:text-xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors"
                  style={{ fontFamily: "'Playfair Display', 'Noto Serif Bengali', Georgia, serif" }}
                >
                  {c.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{c.tagline}</p>
                <div className="mt-5 pt-5 border-t border-border/60 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground line-clamp-1">{c.prize}</div>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold group-hover:bg-primary/20 transition-colors whitespace-nowrap">
                    বিস্তারিত <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
