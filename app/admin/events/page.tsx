// app/admin/events/page.tsx
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import EventsTabs from "@/components/admin/events/EventsTab";

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
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-10">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Events</h1>

        {/* Create Event button */}
        <Link href="/admin/events/new">
          <Button variant="primary">+ Create Event</Button>
        </Link>
      </div>

      {/* Tabs + cards grid */}
      <EventsTabs events={events ?? []} />
    </div>
  );
}
