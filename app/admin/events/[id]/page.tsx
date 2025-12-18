import { supabaseServer } from "@/lib/supabase/server";
import EditEventForm from "./edit/EditEventForm";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventPage({ params }: PageProps) {
  // ✅ UNWRAP PARAMS
  const { id } = await params;

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

  // FETCH EVENT
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("EVENT FETCH ERROR:", error);
  }

  // FETCH STORES
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name");

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <h1 className="text-3xl font-bold mb-4">Event not found</h1>
        <p className="text-neutral-600">This event does not exist.</p>
      </div>
    );
  }

  return <EditEventForm event={event} stores={stores || []} />;
}
