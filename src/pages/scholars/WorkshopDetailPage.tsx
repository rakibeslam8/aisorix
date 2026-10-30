import { useParams, Navigate } from "react-router-dom";
import { Calendar, Clock, MapPin } from "lucide-react";
import SorixDetailPage from "@/components/scholars/SorixDetailPage";
import { useWorkshop } from "@/hooks/useScholarsCatalog";
import founderAsset from "@/assets/founder-rakib.jpg.asset.json";

export default function WorkshopDetailPage() {
  const { slug = "" } = useParams();
  const { workshop: w, isLoading } = useWorkshop(slug);
  if (isLoading) return <div className="min-h-[60vh]" />;
  if (!w) return <Navigate to="/sorixscholars/workshops" replace />;

  return (
    <SorixDetailPage
      cfg={{
        seoTitle: `${w.title} · Sorix Scholars Workshop`,
        seoDescription: w.desc,
        seoPath: `/sorixscholars/workshops/${w.slug}`,
        backHref: "/sorixscholars/workshops",
        backLabel: "সব ওয়ার্কশপ",

        heroBadge: w.badge,
        heroTitleLines: w.heroTitleLines,
        heroTagline: w.heroTagline,
        heroPills: [
          { icon: <Calendar className="w-4 h-4" />, label: w.date },
          { icon: <Clock className="w-4 h-4" />, label: w.time },
          { icon: <MapPin className="w-4 h-4" />, label: w.location },
        ],
        heroCoverUrl: w.cover,
        primaryCtaLabel: "সিট বুক করুন",
        curriculumCtaLabel: "কারিকুলাম দেখুন",
        deadlineISO: w.deadlineISO,

        problemsTitle: "কেন এই ওয়ার্কশপটি আপনার প্রয়োজন?",
        problems: w.problems,
        problemsFootnote:
          "এই ওয়ার্কশপে আমরা ধাপে ধাপে এই সমস্যাগুলোর সমাধান করবো যাতে আপনি AI ব্যবহার করে নিজের কাজ দ্রুত, স্মার্ট এবং প্রফেশনালভাবে শেষ করতে পারেন।",

        learningsTitle: "এই ওয়ার্কশপ থেকে যা যা শিখবেন",
        learnings: w.learnings,

        curriculumTitle: "ওয়ার্কশপ কারিকুলাম",
        curriculumPill: "মোট {n} টি সেশন • {t} টি টপিক",
        curriculum: w.curriculum,

        mentorPill: "আপনার ইনস্ট্রাক্টর",
        mentorName: w.mentor.name,
        mentorRole: w.mentor.role,
        mentorBio: w.mentor.bio || "AI এবং টেকনোলজি নিয়ে কাজ করার দীর্ঘ অভিজ্ঞতা থেকে তিনি এই ওয়ার্কশপটি সাজিয়েছেন।",
        mentorImageUrl: w.mentor.avatar || founderAsset.url,

        faqsTitle: "সচরাচর জিজ্ঞাসিত প্রশ্ন",
        faqs: w.faqs,

        enrollTitle: "এখনই রেজিস্ট্রেশন করুন",
        enrollSubtitle:
          "সীমিত সিট, সীমিত সময়। আজই রেজিস্ট্রেশন করে নিজের জায়গা নিশ্চিত করুন।",
        enrollPerks: w.perks,
        price: w.price,
        oldPrice: w.oldPrice,
        discountLabel: w.oldPrice ? "৫৩% ছাড়" : undefined,
        enrollCtaLabel: "রেজিস্ট্রেশন করুন",

        contactSubjectPrefix: `Workshop Booking: ${w.title}`,
        contactModalTitle: `সিট বুকিং · ${w.title}`,

        enrollKind: "workshop",
        enrollSlug: w.slug,
        enrollPriceBdt: w.priceBdt,
        enrollItemTitle: w.title,
        enrollSeatsAvailable: w.seatsLeft,
      }}
    />
  );
}
