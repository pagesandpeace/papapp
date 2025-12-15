// app/admin/events/page.tsx
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import EventsTabs from "@/components/admin/events//EventsTab"; // 👈 using YOUR tabs component

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEventsPage() {
  const supabase = await supabaseServer();

  // AUTH
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/sign-in?callbackURL=/admin/events");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // FETCH EVENTS
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    console.error("EVENT FETCH ERROR:", error);
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-10">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Events</h1>

        {/* Create Event button at top */}
        <a href="/admin/events/new">
          <Button variant="primary">+ Create Event</Button>
        </a>
      </div>

      {/* Tabs + cards grid using your EventsTabs component */}
      <EventsTabs events={events ?? []} />
    </div>
  );
}
