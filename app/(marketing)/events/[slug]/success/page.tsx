export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EventSuccessPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { session_id?: string };
}) {
  const { slug } = params;
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    return redirect("/events");
  }

  const supabase = await supabaseServer();

  /* ------------------------------------------
     1. Fetch event via slug
  ------------------------------------------- */
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (eventErr || !event) {
    console.error("❌ Event not found:", eventErr);
    return redirect("/events");
  }

  /* ------------------------------------------
     2. Verify booking was created by webhook
  ------------------------------------------- */
  const { data: booking } = await supabase
    .from("event_bookings")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .single();

  // If missing: webhook hasn't fired yet
  const bookingCreated = Boolean(booking);

  /* ------------------------------------------
     3. Render
  ------------------------------------------- */
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-10">
      <div className="bg-white shadow-sm border border-accent/10 rounded-2xl max-w-xl p-10 text-center">

        <h1 className="text-3xl font-bold text-foreground mb-4">
          Booking Confirmed 🎉
        </h1>

        <p className="text-foreground/80 mb-6 text-lg">
          Your place at <strong>{event.title}</strong> has been booked.
        </p>

        {/* Handle webhook delay */}
        {!bookingCreated && (
          <p className="text-amber-600 font-medium mb-6">
            Your payment is confirmed — finalising your booking…
            <br />
            Refresh in a moment.
          </p>
        )}

        <div className="space-y-4 mt-8">
          <Link
            href={`/events/${event.slug}`}
            className="block bg-accent text-white py-3 rounded-lg font-semibold hover:opacity-90"
          >
            View Event Details
          </Link>

          <Link
            href="/dashboard/events"
            className="block text-accent underline"
          >
            Go to My Bookings
          </Link>

          <Link
            href="/events"
            className="block text-foreground/60 underline text-sm"
          >
            Back to All Events
          </Link>
        </div>
      </div>
    </main>
  );
}
