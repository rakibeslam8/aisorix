import { BookOpen, ArrowRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { useCourses } from "@/hooks/useScholarsCatalog";

export default function CoursesPage() {
  const { items: courses, isLoading } = useCourses();

  return (
    <div className="bg-background min-h-screen">
      <SEOHead
        title="Sorix Scholars — আমাদের কোর্সসমূহ"
        description="AI Sorix-এর practitioner-built কোর্স। প্রফেশনালদের জন্য তৈরি practical AI masterclass।"
        path="/sorixscholars/courses"
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h1
            className="text-3xl sm:text-4xl lg:text-[52px] leading-tight font-bold text-foreground"
            style={{ fontFamily: "'Playfair Display', 'Noto Serif Bengali', Georgia, serif" }}
          >
            আমাদের কোর্সসমূহ
          </h1>
          <p className="mt-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
            আধুনিক টেকনোলজি আর AI-এর সঠিক ব্যবহার শিখে ক্যারিয়ারে পরের ধাপে যেতে চান? তাহলে আমাদের স্পেশাল কোর্সগুলো আপনার জন্যই!
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {!isLoading && courses.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">নতুন কোর্স শীঘ্রই আসছে।</p>
          )}
          {courses.map((course) => (
          <Link key={course.slug} to={`/sorixscholars/courses/${course.slug}`} className="group rounded-3xl bg-card border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col">
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={course.cover}
                alt={course.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-background/90 backdrop-blur text-[11px] font-bold text-foreground shadow">
                
              </span> */}
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/90 backdrop-blur text-[11px] font-semibold text-foreground shadow">
                <BookOpen className="w-3 h-3" />
                {course.duration}
              </span>
            </div>

            <div className="p-5 sm:p-6 flex-1 flex flex-col">
              <h2
                className="text-lg sm:text-xl font-bold text-foreground leading-snug"
                style={{ fontFamily: "'Playfair Display', 'Noto Serif Bengali', Georgia, serif" }}
              >
                {course.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{course.tagline}</p>
              <div className="mt-5 pt-5 border-t border-border/60 flex items-center justify-between gap-3">
                <div className="text-lg sm:text-xl font-bold text-foreground">{course.priceLabel}</div>
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
