// app/admin/page.tsx
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { supabaseServer } from "@/lib/supabase/server";

import DashboardKpiCards from "@/components/admin/dashboard/DashboardKpiCards";
import LowStockWidget from "@/components/admin/dashboard/LowStockWidget";
import CollapsibleSection from "@/components/admin/dashboard/CollapsibleSection";
import ChartWrapper from "@/components/admin/dashboard/ChartWrapper";
import ShopRevenueChart from "@/components/admin/dashboard/ShopRevenueChart";
import EventRevenueChart from "@/components/admin/dashboard/EventRevenueChart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------
   TYPES
------------------------------------------------------------------ */
type ChartPoint = {
  month: string;
  value: number;
};

type MetricRow = {
  month: string;
  shop_revenue: number;
  event_revenue: number;
};

/* ------------------------------------------------------------------
   PAGE
------------------------------------------------------------------ */
export default async function AdminDashboardPage() {
  // 🔴 Disable all caching (auth + RPC + cookies)
  noStore();

  const supabase = await supabaseServer();

  /* ------------------------------------------------------------------
     AUTH
  ------------------------------------------------------------------ */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?callbackURL=/admin");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("❌ Failed to load user profile:", profileError);
  }

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  /* ------------------------------------------------------------------
     RPC – ADMIN METRICS (SOURCE OF TRUTH)
  ------------------------------------------------------------------ */
  const { data: rpc, error: rpcError } = await supabase.rpc(
    "get_admin_dashboard_metrics"
  );

  if (rpcError) {
    console.error("❌ Admin metrics RPC failed:", rpcError);
  }

  const totals = rpc?.totals ?? {};
  const metrics: MetricRow[] = rpc?.metrics ?? [];
  const lowStock = rpc?.low_stock_products ?? [];

  /* ------------------------------------------------------------------
     CHART DATA
  ------------------------------------------------------------------ */
  const shopRevenueData: ChartPoint[] = metrics.map((m) => ({
    month: m.month,
    value: m.shop_revenue,
  }));

  const eventRevenueData: ChartPoint[] = metrics.map((m) => ({
    month: m.month,
    value: m.event_revenue,
  }));

  /* ------------------------------------------------------------------
     KPI DATA (MATCHES RPC KEYS EXACTLY)
  ------------------------------------------------------------------ */
  const totalRevenue = totals.total_revenue ?? 0;
  const shopRevenue = totals.shop_revenue ?? 0;
  const eventRevenue = totals.event_revenue ?? 0;
  const totalEvents = totals.total_events ?? 0;
  const totalBookings = totals.event_bookings ?? 0;
  const totalSignups = totals.total_signups ?? 0;

  /* ------------------------------------------------------------------
     FEEDBACK
  ------------------------------------------------------------------ */
  const { data: feedbackData } = await supabase
    .from("feedback")
    .select("rating");

  const feedback = feedbackData ?? [];
  const totalFeedback = feedback.length;

  const averageRating =
    totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

  /* ------------------------------------------------------------------
     NEWSLETTER
  ------------------------------------------------------------------ */
  const { data: subs } = await supabase
    .from("newsletter_subscribers")
    .select("id");

  const totalEmailSubscribers = subs?.length ?? 0;

  /* ------------------------------------------------------------------
     DEBUG (safe to remove later)
  ------------------------------------------------------------------ */
  console.log("ADMIN DASHBOARD RENDER", new Date().toISOString());
  console.log("ADMIN TOTALS", totals);

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */
  return (
    <div className="space-y-10 max-w-6xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <DashboardKpiCards
        totalRevenue={totalRevenue}
        shopRevenue={shopRevenue}
        eventRevenue={eventRevenue}
        totalEvents={totalEvents}
        totalBookings={totalBookings}
        totalSignups={totalSignups}
        totalFeedback={totalFeedback}
        averageRating={averageRating}
        totalEmailSubscribers={totalEmailSubscribers}
      />

      <LowStockWidget items={lowStock} />

      {/* SHOP REVENUE */}
      <CollapsibleSection title="Shop Revenue">
        <ChartWrapper>
          <ShopRevenueChart data={shopRevenueData} />
        </ChartWrapper>
      </CollapsibleSection>

      {/* EVENT REVENUE */}
      <CollapsibleSection title="Event Revenue">
        <ChartWrapper>
          <EventRevenueChart data={eventRevenueData} />
        </ChartWrapper>
      </CollapsibleSection>
    </div>
  );
}
