import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useActiveAnnouncements } from "@/hooks/useActiveAnnouncements";

const DOT_COLOR = {
  info: "bg-primary",
  success: "bg-emerald-500",
  warn: "bg-amber-500",
  critical: "bg-red-500",
};

// Top-of-page pill. The "Built by Sorixlab" badge is static; the text next to it is the
// newest active announcement created in the admin panel. With no active announcement,
// only the badge is shown.
const AnnouncementBanner = () => {
  const { t } = useLanguage();
  const { currentPlan } = useSubscription();
  const { data: announcements } = useActiveAnnouncements(currentPlan);
  const announcement = announcements?.[0];

  return (
    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 w-auto max-w-[95%]">
      <div className="flex justify-center">
        <div
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5
          rounded-full
          bg-white/20 dark:bg-gray-800/30
          backdrop-blur-lg
          shadow-md hover:shadow-lg
          text-[9px] sm:text-xs
          transition-all duration-300
          max-w-full"
        >
          <Link
            to="/about-sorix-lab"
            className="inline-flex items-center px-1.5 sm:px-2 py-0.5
              rounded-full text-[8px] sm:text-[10px] font-medium whitespace-nowrap
              bg-primary/10 dark:bg-primary/20 text-primary
              hover:bg-primary/20 dark:hover:bg-primary/30 transition"
          >
            {t("builtBySorixlab")}
          </Link>

          {announcement && (
            <>
              <span className={`h-1 w-1 shrink-0 rounded-full ${DOT_COLOR[announcement.severity] ?? DOT_COLOR.info}`} />
              <span
                className="text-foreground/80 dark:text-foreground/70 truncate"
                title={announcement.body_md || announcement.title}
              >
                {announcement.title}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
