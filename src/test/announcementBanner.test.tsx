import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
let plan = "free";
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ currentPlan: plan }) }));
vi.mock("../contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "en", t: (k: string) => k }) }));

import AnnouncementBanner from "@/components/AnnouncementBanner";

const row = (over: Record<string, unknown>) => ({
  id: "1", title: "T", body_md: "", severity: "info", audience: "all", starts_at: null, ends_at: null, active: true, ...over,
});
const renderBanner = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><AnnouncementBanner /></MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("AnnouncementBanner reads announcements from admin", () => {
  beforeEach(() => { rpc.mockReset(); plan = "free"; });

  it("shows the newest active announcement title", async () => {
    rpc.mockResolvedValue({ data: [row({ title: "Maintenance tonight" }), row({ id: "2", title: "Older" })], error: null });
    renderBanner();
    expect(await screen.findByText("Maintenance tonight")).toBeTruthy();
    expect(screen.queryByText("Older")).toBeNull();
    expect(rpc).toHaveBeenCalledWith("get_active_announcements");
  });

  it("shows only the Sorixlab badge when nothing is active", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    renderBanner();
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.getByText("builtBySorixlab")).toBeTruthy();
  });

  it("hides announcements meant for another plan, shows ones for the user's plan", async () => {
    rpc.mockResolvedValue({ data: [row({ title: "Pro only", audience: "pro" })], error: null });
    renderBanner();
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.queryByText("Pro only")).toBeNull();

    plan = "pro";
    renderBanner();
    expect(await screen.findByText("Pro only")).toBeTruthy();
  });

  it("does not break the page if the request fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    renderBanner();
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.getByText("builtBySorixlab")).toBeTruthy();
  });
});
