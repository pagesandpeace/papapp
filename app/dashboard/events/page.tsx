export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Events | Pages & Peace",
  description: "View your event bookings and browse upcoming events.",
  robots: { index: false, follow: false },
};

export default async function DashboardEventsPage() {
  const supabase = await supabaseServer();

  // AUTH
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    redirect("/sign-in?callbackURL=/dashboard/events");
  }

  /* --------------------------------------------------
     FETCH USER BOOKINGS
  -------------------------------------------------- */
  const { data: bookings, error: bookingsErr } = await supabase
    .from("event_bookings")
    .select("*")
    .eq("user_id", user.id);

  if (bookingsErr) console.error("Failed to load bookings:", bookingsErr);

  /* --------------------------------------------------
     FETCH ALL EVENTS
  -------------------------------------------------- */
  const { data: allEvents } = await supabase.from("events").select("*");

  /* --------------------------------------------------
     FETCH USER ORDERS
  -------------------------------------------------- */
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id);

  /* --------------------------------------------------
     MERGE BOOKINGS + EVENTS
  -------------------------------------------------- */
  const now = new Date();

  const bookingData = (bookings || []).map((b) => {
    const event = allEvents?.find((e) => e.id === b.event_id);
    const order = orders?.find(
      (o) => o.stripe_checkout_session_id === b.stripe_checkout_session_id
    );

    return { booking: b, event, order };
  });

  const upcoming = bookingData
    .filter((b) => b.event && new Date(b.event.date) >= now)
    .sort(
      (a, b) =>
        new Date(a.event!.date).getTime() -
        new Date(b.event!.date).getTime()
    );

  const past = bookingData
    .filter((b) => b.event && new Date(b.event.date) < now)
    .sort(
      (a, b) =>
        new Date(b.event!.date).getTime() -
        new Date(a.event!.date).getTime()
    );

  /* --------------------------------------------------
     BROWSE EVENTS — SEATS LEFT
  -------------------------------------------------- */
  const { data: allBookings } = await supabase
    .from("event_bookings")
    .select("*");

  const browseEvents = (allEvents || []).map((evt) => {
    const active = (allBookings || []).filter(
      (b) => b.event_id === evt.id && !b.cancelled
    ).length;

    const remaining = evt.capacity - active;

    return { ...evt, remaining, soldOut: remaining <= 0 };
  });

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] font-[Montserrat] px-6 md:px-8 py-12 md:py-16">
      <section className="mx-auto max-w-5xl space-y-12">
        {/* HEADER */}
        <header className="flex flex-col gap-2 border-b border-[#dcd6cf] pb-6">
          <h1 className="text-3xl font-semibold tracking-widest">Events 🎟️</h1>
          <p className="text-[#111]/70 text-sm">
            Your bookings, past events, and what's coming up next.
          </p>
        </header>

        {/* ============================================================
           SECTION 1 — NEXT EVENT
        ============================================================ */}
        {upcoming.length > 0 && (() => {
          const next = upcoming[0];
          const evt = next.event!;
          const date = new Date(evt.date);
          const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);

          return (
            <div className="rounded-xl overflow-hidden shadow border border-[#e1dcd4] bg-white">
              <div className="relative h-56 w-full">
                <img
                  src={evt.image_url || "/placeholder-event.jpg"}
                  alt={evt.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <h2 className="absolute bottom-4 left-6 text-2xl font-bold text-white drop-shadow-lg">
                  Your Next Event
                </h2>
              </div>

              <div className="p-6 space-y-2">
                <h3 className="text-2xl font-semibold">{evt.title}</h3>
                <p className="text-sm text-neutral-700">{evt.subtitle}</p>

                <p className="font-medium mt-2">
                  {date.toLocaleString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                <p className="text-sm text-[#5DA865]">
                  {diffDays <= 0 ? "Today" : `In ${diffDays} days`}
                </p>

                <div className="pt-4">
                  <Link
                    href={`/dashboard/bookings/${next.booking.id}`}
                    className="inline-block px-5 py-2 rounded-md bg-accent text-white font-medium hover:opacity-90"
                  >
                    View Booking
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ============================================================
           SECTION 2 — UPCOMING BOOKINGS LIST
        ============================================================ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-wide">Upcoming Bookings</h2>

          {upcoming.length <= 1 ? (
            <p className="text-sm text-neutral-600">No other upcoming events.</p>
          ) : (
            <div className="space-y-6">
              {upcoming.slice(1).map(({ booking, event }) => (
                <div
                  key={booking.id}
                  className="flex gap-4 bg-white border border-[#e7dfd4] rounded-xl shadow-sm p-4 hover:shadow-md transition"
                >
                  <img
                    src={event!.image_url || "/placeholder-event.jpg"}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{event!.title}</h3>
                    <p className="text-sm text-neutral-700">
                      {new Date(event!.date).toLocaleString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="font-medium text-[#2f6b3a] mt-1">
                      £{(event!.price_pence / 100).toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/bookings/${booking.id}`}
                    className="self-center px-4 py-2 text-sm bg-accent text-white rounded-md hover:opacity-90"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
           SECTION 3 — PAST EVENTS
        ============================================================ */}
        <div className="space-y-4 opacity-90">
          <h2 className="text-2xl font-semibold tracking-wide">Past Events</h2>

          {past.length === 0 ? (
            <p className="text-sm text-neutral-600">No past events yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {past.map(({ booking, event }) => (
                <div
                  key={booking.id}
                  className="bg-white border border-[#e7dfd4] rounded-xl p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-lg">{event!.title}</h3>
                  <p className="mt-2 text-sm text-neutral-700">
                    {new Date(event!.date).toLocaleString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
           SECTION 4 — BROWSE EVENTS
        ============================================================ */}
        <div className="space-y-4 pt-12 border-t border-[#dcd6cf]">
          <h2 className="text-2xl font-semibold tracking-wide">Browse Events</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {browseEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-[#e7dfd4] rounded-xl shadow-sm hover:shadow-md transition overflow-hidden"
              >
                <img
                  src={evt.image_url || "/placeholder-event.jpg"}
                  className="h-40 w-full object-cover"
                />

                <div className="p-5 space-y-2">
                  <h3 className="text-lg font-semibold">{evt.title}</h3>

                  <p className="text-sm text-neutral-700">
                    {new Date(evt.date).toLocaleString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  {/* Availability badge */}
                  {evt.soldOut ? (
                    <span className="inline-block px-3 py-1 rounded-full bg-red-200 text-red-700 text-xs font-medium border border-red-300">
                      Sold Out
                    </span>
                  ) : evt.remaining <= 5 ? (
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-200 text-amber-800 text-xs font-medium border border-amber-300">
                      Limited availability
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full bg-green-200 text-green-800 text-xs font-medium border border-green-300">
                      Available
                    </span>
                  )}

                  <div className="pt-3">
                    <Link
                      href={`/dashboard/events/${evt.id}`}
                      className="block w-full text-center px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90"
                    >
                      View Event
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>
    </main>
  );
}
