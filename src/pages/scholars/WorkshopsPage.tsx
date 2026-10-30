import { MapPin, Calendar, Clock, ArrowRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { useWorkshops } from "@/hooks/useScholarsCatalog";

export default function WorkshopsPage() {
  const { items: workshops, isLoading } = useWorkshops();
  return (
    <div className="bg-background min-h-screen">
      <SEOHead
        title="Sorix Scholars — আমাদের ওয়ার্কশপসমূহ"
        description="সরাসরি এক্সপার্টদের কাছ থেকে শিখুন। প্র্যাক্টিক্যাল লাইভ AI ওয়ার্কশপে জয়েন করে নিজের স্কিল নেক্সট লেভেলে নিয়ে যান।"
        path="/sorixscholars/workshops"
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h1
            className="text-3xl sm:text-4xl lg:text-[52px] leading-tight font-bold text-foreground"
            style={{ fontFamily: "'Playfair Display', 'Noto Serif Bengali', Georgia, serif" }}
          >
            আমাদের ওয়ার্কশপসমূহ
          </h1>
          <p className="mt-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
            অভিজ্ঞ মেন্টরদের সরাসরি তত্ত্বাবধান পেতে অবিলম্বে আমাদের বাস্তবমুখী লাইভ কর্মশালাসমূহে অংশগ্রহণ করুন এবং আপনার পেশাগত দক্ষতাকে পরবর্তী স্তরে উন্নীত করুন।
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {!isLoading && workshops.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">নতুন ওয়ার্কশপ শীঘ্রই আসছে।</p>
          )}
          {workshops.map((w) => (
            <Link
              key={w.slug}
              to={`/sorixscholars/workshops/${w.slug}`}
              className="group rounded-3xl bg-card border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img src={w.cover} alt={w.title} className="w-full h-full object-cover" loading="lazy" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-500 text-white text-[11px] font-bold shadow">
                  {w.badge}
                </span>
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-[11px] font-semibold text-white">
                    <Calendar className="w-3 h-3" /> {w.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-[11px] font-semibold text-white">
                    <Clock className="w-3 h-3" /> {w.time}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3.5 h-3.5" /> {w.location}
                </div>
                <h2
                  className="text-lg sm:text-xl font-bold text-foreground leading-snug"
                  style={{ fontFamily: "'Playfair Display', 'Noto Serif Bengali', Georgia, serif" }}
                >
                  {w.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{w.desc}</p>
                <div className="mt-5 pt-5 border-t border-border/60 flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-bold text-foreground">{w.price}</span>
                    {w.oldPrice && (
                      <span className="text-sm line-through text-rose-500/80">{w.oldPrice}</span>
                    )}
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold whitespace-nowrap"
                  >
                    বিস্তারিত দেখুন <ArrowRight className="w-3.5 h-3.5" />
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
