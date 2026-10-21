import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicAnnouncement {
  id: string;
  title: string;
  body_md: string;
  severity: string; // info | success | warn | critical
  audience: string; // "all" or a plan id such as "pro"
  starts_at: string | null;
  ends_at: string | null;
}

/**
 * Announcements created in the admin panel (Admin > Announcements).
 * Uses the public-read RPC, which already applies active + starts_at/ends_at filtering
 * on the server, so nothing is exposed that visitors should not see.
 * Refetches every minute and when the tab regains focus, so admin changes show up quickly.
 */
export function useActiveAnnouncements(plan: string = "free") {
  return useQuery({
    queryKey: ["active-announcements"],
    queryFn: async (): Promise<PublicAnnouncement[]> => {
      const { data, error } = await supabase.rpc("get_active_announcements");
      if (error) throw error;
      return (data ?? []) as PublicAnnouncement[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
    select: (rows) =>
      rows.filter((a) => {
        const aud = (a.audience || "all").trim().toLowerCase();
        return aud === "all" || aud === plan.toLowerCase();
      }),
  });
}
