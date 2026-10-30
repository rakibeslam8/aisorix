import { useParams, Navigate } from "react-router-dom";
import { Calendar, Trophy, Globe } from "lucide-react";
import SorixDetailPage from "@/components/scholars/SorixDetailPage";
import { useCompetition } from "@/hooks/useScholarsCatalog";
import founderAsset from "@/assets/founder-rakib.jpg.asset.json";

export default function CompetitionDetailPage() {
  const { slug = "" } = useParams();
  const { competition: c, isLoading } = useCompetition(slug);
  if (isLoading) return <div className="min-h-[60vh]" />;
  if (!c) return <Navigate to="/sorixscholars/competitions" replace />;

  // Hard-coded Bangla detail content per competition slug
  const isStartup = c.slug === "startup-funding";
  // Only the two original competitions have hand-written Bangla landing copy; any competition
  // created in the admin is rendered from its own fields (prizes, rules, timeline, FAQs).
  const rich = isStartup || c.slug === "ai-challenge";

  const problems = !rich ? [] : isStartup
    ? [
        "একটা ভালো AI আইডিয়া আছে, কিন্তু ফান্ডিং কোথা থেকে আসবে জানেন না।",
        "Investor pitch তৈরি করতে গিয়ে আটকে যাচ্ছেন।",
        "একা একা startup চালাতে গিয়ে mentor এর অভাব ফিল করছেন।",
        "Product আছে, কিন্তু launch করার runway পাচ্ছেন না।",
      ]
    : [
        "Hackathon-এ অংশ নিতে চান কিন্তু সঠিক প্ল্যাটফর্ম পাচ্ছেন না।",
        "AI দিয়ে কিছু একটা build করতে চান, কিন্তু idea থেকে product পর্যন্ত guidance দরকার।",
        "নিজের skill দেখানোর মত একটা showcase platform খুঁজছেন।",
        "Cash prize ও real users পাওয়ার সুযোগ মিস করতে চান না।",
      ];

  const learnings = !rich
    ? c.prizes.map((p) => ({ title: p.place, desc: p.reward }))
    : isStartup
    ? [
        { title: "Investor-ready pitch", desc: "১২ সপ্তাহে ১:১ মেন্টরিং নিয়ে নিজের pitch তৈরি করুন।" },
        { title: "Funding up to $50K", desc: "Winner team পাবে $50,000 ক্যাশ ফান্ডিং + launch runway।" },
        { title: "Operator mentorship", desc: "SorixLab-এর engineer ও operator দের কাছ থেকে hands-on guidance।" },
        { title: "Launch spotlight", desc: "AI Sorix ecosystem-এর মাধ্যমে global audience এর কাছে launch।" },
      ]
    : [
        { title: "Cash + AI credits", desc: "Grand Prize $8,000 cash + AI Sorix credits + launch feature।" },
        { title: "Real user testing", desc: "Week 5-এ real users আপনার product test করবে।" },
        { title: "Mentor matching", desc: "Industry mentor-এর সাথে weekly office hours।" },
        { title: "Demo day spotlight", desc: "Live online demo day-এ judges + investors-এর সামনে showcase।" },
      ];

  const curriculum = c.timeline.map((t) => ({
    title: `${t.date} · ${t.title}`,
    lessons: [t.desc],
  }));

  const faqs = [
    ...c.faqs.map((f) => ({ q: f.q, a: f.a })),
    ...(!rich ? [] : [
    { q: "Worldwide কি apply করা যাবে?", a: "হ্যাঁ — competition সম্পূর্ণ online এবং বিশ্বের যে কোনো দেশ থেকে participate করা যাবে।" },
    { q: "Team size কত?", a: isStartup ? "Solo founder থেকে শুরু করে সর্বোচ্চ ৪ জনের team allowed।" : "Individual বা সর্বোচ্চ ৪ জনের team।" },
  ]),
  ];

  const perks = !rich
    ? [...c.prizes.map((p) => `${p.place}: ${p.reward}`), ...c.rules]
    : isStartup
    ? [
        "Up to $50,000 funding",
        "১২ সপ্তাহের ১:১ mentorship",
        "AI Sorix launch spotlight",
        "Investor panel-এর সামনে pitch",
        "Standard founder-friendly equity terms",
        "Global founder community access",
      ]
    : [
        "$15,000 total prize pool",
        "AI Sorix model credits",
        "Mentor matching + office hours",
        "Real user testing week",
        "Live demo day showcase",
        "Winner spotlight + launch feature",
      ];

  return (
    <SorixDetailPage
      cfg={{
        seoTitle: `${c.title} · Sorix Scholars`,
        seoDescription: c.tagline,
        seoPath: `/sorixscholars/competitions/${c.slug}`,
        backHref: "/sorixscholars/competitions",
        backLabel: "সব কম্পিটিশন",

        heroBadge: c.status,
        heroTitleLines: !rich
          ? [c.title]
          : isStartup
          ? ["SorixLab", "Startup Funding"]
          : ["SorixLab", "Build Challenge"],
        heroTagline: c.tagline,
        heroPills: [
          { icon: <Trophy className="w-4 h-4" />, label: c.prize },
          { icon: <Calendar className="w-4 h-4" />, label: c.timeline[0]?.date ?? "Open" },
          { icon: <Globe className="w-4 h-4" />, label: "Online · Worldwide" },
        ],
        heroCoverUrl: c.cover,
        primaryCtaLabel: "Apply now",
        curriculumCtaLabel: "Timeline দেখুন",
        deadlineISO: c.deadlineAt ?? new Date(Date.now() + 14 * 86400000).toISOString(),

        problemsTitle: "কেন এই কম্পিটিশন আপনার জন্য?",
        problems,
        problemsFootnote:
          "এই কম্পিটিশনে আমরা mentor, funding আর global spotlight — সবকিছু একসাথে দিচ্ছি যাতে আপনার AI idea production-ready হয়ে দ্রুত launch করতে পারে।",

        learningsTitle: "এই কম্পিটিশন থেকে যা যা পাবেন",
        learnings,

        curriculumTitle: "Competition Timeline",
        curriculumPill: "মোট {n} টি ধাপ",
        curriculum,

        mentorPill: "আয়োজক",
        mentorName: "Md. Rakibul Islam",
        mentorRole: "Founder, AI Sorix · SorixLab",
        mentorBio:
          "SorixLab টিম বিশ্বজুড়ে ফাউন্ডার ও বিল্ডারদের সাথে কাজ করার অভিজ্ঞতা থেকে এই কম্পিটিশনটি ডিজাইন করেছে। লক্ষ্য — সেরা AI বিল্ডারদের funding, mentorship আর global launch runway দেওয়া।",
        mentorImageUrl: founderAsset.url,

        faqsTitle: "সচরাচর জিজ্ঞাসিত প্রশ্ন",
        faqs,

        enrollTitle: "এখনই Apply করুন",
        enrollSubtitle:
          "Applications take under five minutes. আমরা ২ business days এর মধ্যে reply করি।",
        enrollPerks: perks,
        price: c.prize,
        enrollCtaLabel: "Apply now",

        contactSubjectPrefix: `Apply: ${c.title}`,
        contactModalTitle: `Apply · ${c.title}`,

        enrollKind: "competition",
        enrollSlug: c.slug,
        enrollPriceBdt: c.entryFeeBdt,
        enrollItemTitle: c.title,
      }}
    />
  );
}
