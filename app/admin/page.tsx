import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import DashboardKpiCards from "@/components/admin/dashboard/DashboardKpiCards";
import LowStockWidget from "@/components/admin/dashboard/LowStockWidget";
import CollapsibleSection from "@/components/admin/dashboard/CollapsibleSection";
import ChartWrapper from "@/components/admin/dashboard/ChartWrapper";

import ShopRevenueChart from "@/components/admin/dashboard/ShopRevenueChart";
import EventRevenueChart from "@/components/admin/dashboard/EventRevenueChart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChartPoint = { month: string; value: number };

type MetricRow = {
  month: string;
  shop_revenue: number;
  event_revenue: number;
};

export default async function AdminDashboardPage() {
  const supabase = await supabaseServer();

  // AUTH
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/sign-in?callbackURL=/admin/dashboard");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // RPC CALL
  const { data: rpc } = await supabase.rpc(
    "get_admin_dashboard_metrics"
  );

  // READ VALUES DIRECTLY FROM RPC
  const totals = rpc?.totals ?? {};
  const metrics: MetricRow[] = rpc?.metrics ?? [];
  const lowStock = rpc?.low_stock_products ?? [];

  // CHART DATA
  const shopRevenueData: ChartPoint[] = metrics.map((m) => ({
    month: m.month,
    value: m.shop_revenue,
  }));

  const eventRevenueData: ChartPoint[] = metrics.map((m) => ({
    month: m.month,
    value: m.event_revenue,
  }));

  // KPI DATA
  const totalRevenue = totals.total_revenue ?? 0;
  const shopRevenue = totals.total_revenue_shop ?? 0;
  const eventRevenue = totals.total_revenue_events ?? 0;
  const totalEvents = totals.total_events ?? 0;
  const totalBookings = totals.total_bookings ?? 0;
  const totalSignups = totals.total_signups ?? 0;

  // FEEDBACK
  const { data: feedbackData } = await supabase
    .from("feedback")
    .select("rating");

  const feedback = feedbackData ?? [];
  const totalFeedback = feedback.length;

  const averageRating =
    totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

  // NEWSLETTER
  const { data: subs } = await supabase
    .from("newsletter_subscribers")
    .select("id");

  const totalEmailSubscribers = subs?.length ?? 0;

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
