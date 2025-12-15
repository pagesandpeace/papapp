export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import StartEventCheckout from "@/components/events/StartEventCheckout";

export default async function EventDetailPage(props: { params: Promise<{ id: string }> }) {
  // ✅ FIXED — MUST AWAIT PARAMS BECAUSE IT'S A PROMISE
  const { id: eventId } = await props.params;

  const supabase = await supabaseServer();

  /* --------------------------- GET USER --------------------------- */
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return (
      <main className="min-h-screen p-8 text-center">
        <p className="text-sm opacity-70">Please sign in to view this event.</p>
      </main>
    );
  }

  /* ------------------------ FETCH EVENT ------------------------ */
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event || eventErr) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium">Event not found.</p>
      </main>
    );
  }

  /* ---------------------- FETCH CATEGORY NAMES ---------------------- */
  const { data: categoryLinks } = await supabase
    .from("event_category_links")
    .select("category_id")
    .eq("event_id", eventId);

  const categoryIds = categoryLinks?.map((c) => c.category_id) ?? [];

  const { data: categories } =
    categoryIds.length > 0
      ? await supabase
          .from("event_categories")
          .select("*")
          .in("id", categoryIds)
      : { data: [] };

  /* ---------------------- FETCH STORE ---------------------- */
  const store = event.store_id
    ? (
        await supabase
          .from("stores")
          .select("*")
          .eq("id", event.store_id)
          .single()
      ).data
    : null;

  /* ---------------------- FETCH USER BOOKINGS ---------------------- */
  const { data: userBookings } = await supabase
    .from("event_bookings")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", eventId);

  const userHasBooking = (userBookings?.length ?? 0) > 0;

  /* ---------------------- SEAT AVAILABILITY ---------------------- */
  const { data: allBookings } = await supabase
    .from("event_bookings")
    .select("*")
    .eq("event_id", eventId);

  const activeBookings =
    (allBookings ?? []).filter((b) => !b.cancelled).length;

  const remainingSeats = event.capacity - activeBookings;

  const soldOut = remainingSeats <= 0;
  const limited = !soldOut && remainingSeats <= 5;

  const formattedDate = new Date(event.date).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ---------------------- UI ---------------------- */
  return (
    <main className="min-h-screen bg-[#FAF6F1]">
      {/* HERO IMAGE */}
      <div className="relative w-full h-[50vh] min-h-[300px]">
        <Image
          src={event.image_url || "/placeholder-event.jpg"}
          alt={event.title}
          fill
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <h1 className="absolute bottom-8 left-8 text-white text-4xl font-extrabold drop-shadow tracking-tight">
          {event.title}
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-10 space-y-10">

        {/* SUBTITLE */}
        {event.subtitle && (
          <p className="text-xl text-neutral-700 italic text-center">
            {event.subtitle}
          </p>
        )}

        {/* SHORT DESCRIPTION */}
        {event.short_description && (
          <p className="text-center text-neutral-700 text-lg max-w-2xl mx-auto">
            {event.short_description}
          </p>
        )}

        {/* CATEGORIES */}
        {categories && categories.length > 0 && (
          <section className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Categories</h2>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1 bg-[#fff7e6] text-[#c67b00] rounded-full border text-xs"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* DETAILS */}
        <section className="space-y-6 text-neutral-700 text-lg">

          <div className="border-b pb-4">
            <strong className="block text-[#111] mb-1">Date & Time</strong>
            {formattedDate}
          </div>

          <div className="border-b pb-4">
            <strong className="block text-[#111] mb-1">Location</strong>
            {store?.address || store?.name || "Pages & Peace"}
          </div>

          <div className="border-b pb-4">
            <strong className="block text-[#111] mb-1">Price</strong>
            £{(event.price_pence / 100).toFixed(2)}
          </div>

          <div className="border-b pb-4">
            <strong className="block text-[#111] mb-1">Availability</strong>
            {soldOut ? (
              <span className="text-red-600 font-semibold">Sold Out</span>
            ) : limited ? (
              <span className="text-orange-600 font-semibold">Limited seats</span>
            ) : (
              <span className="text-green-700 font-semibold">Seats available</span>
            )}
          </div>

          {event.description && (
            <div>
              <strong className="block text-[#111] mb-2">About this event</strong>
              <p className="leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}
        </section>

        {/* CHECKOUT */}
        <section className="bg-white border rounded-xl p-6 shadow-sm text-center space-y-6">
          <h2 className="text-xl font-semibold">
            {userHasBooking ? "Bring a Friend" : "Book Your Place"}
          </h2>

          {!soldOut && (
            <StartEventCheckout eventId={eventId} />
          )}

          {soldOut && (
            <button
              disabled
              className="bg-red-300 text-white px-8 py-3 rounded-lg font-semibold cursor-not-allowed opacity-70"
            >
              Sold Out
            </button>
          )}

          <Link
            href="/dashboard/legal/event-booking-terms"
            className="underline text-sm text-[var(--accent)] block"
          >
            Booking Terms & Conditions
          </Link>
        </section>

      </div>
    </main>
  );
}
