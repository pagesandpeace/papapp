import { supabaseServer } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = params;

  const supabase = await supabaseServer();

  // Fetch event + store
  const { data: event } = await supabase
    .from("events")
    .select("*, stores(name, address)")
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <h1 className="text-2xl font-bold mb-4">Event not found</h1>
        <p className="text-neutral-600">This event does not exist.</p>
      </div>
    );
  }

  // Fetch bookings (normalize null -> [])
  const { data: bookingsData } = await supabase
    .from("event_bookings")
    .select("*, users(name, email)")
    .eq("event_id", id);

  const bookings = bookingsData ?? [];

  const seatsTaken = bookings.length;
  const seatsLeft = event.capacity - seatsTaken;
  const revenue = (event.price_pence * seatsTaken) / 100;

  return (
    <div className="pb-20">
      {/* HERO */}
      <div className="relative w-full h-80">
        <Image
          src={event.image_url || "/placeholder-event.jpg"}
          alt={event.title}
          fill
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />

        <div className="absolute bottom-6 left-8 text-white">
          <h1 className="text-4xl font-bold drop-shadow">{event.title}</h1>
          {event.subtitle && (
            <p className="text-lg mt-1 opacity-90">{event.subtitle}</p>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-6 mt-10 space-y-12">
        {/* TOP BAR */}
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-lg">
              {new Date(event.date).toLocaleString("en-GB")}
            </p>
            <p className="text-neutral-600">{event.stores?.name}</p>
          </div>

          <div className="flex gap-3">
            <Link href={`/admin/events/${event.id}/edit`}>
              <Button variant="primary">Edit Event</Button>
            </Link>
            <Link href="/admin/events">
              <Button variant="neutral">Back</Button>
            </Link>
          </div>
        </div>

        {/* DETAILS */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-3">Event Details</h2>
            <div className="space-y-2 text-neutral-800">
              <p>
                <strong>Date:</strong>{" "}
                {new Date(event.date).toLocaleString("en-GB")}
              </p>
              <p>
                <strong>Store:</strong> {event.stores?.name}
              </p>
              <p className="text-sm text-neutral-600">
                {event.stores?.address}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {event.published ? "Published" : "Draft"}
              </p>
            </div>
          </div>

          {/* CAPACITY + REVENUE */}
          <div className="flex flex-wrap gap-10 pt-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Capacity</h3>
              <p>
                <strong>Total seats:</strong> {event.capacity}
              </p>
              <p>
                <strong>Booked:</strong> {seatsTaken}
              </p>
              <p>
                <strong>Remaining:</strong> {seatsLeft}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Revenue</h3>
              <p>
                <strong>Ticket price:</strong> £
                {(event.price_pence / 100).toFixed(2)}
              </p>
              <p>
                <strong>Total revenue:</strong> £{revenue.toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        {/* DESCRIPTION */}
        <section>
          <h2 className="text-2xl font-semibold mb-3">Description</h2>
          <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </section>

        {/* BOOKINGS */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Bookings ({seatsTaken})
          </h2>

          {seatsTaken === 0 ? (
            <p className="text-neutral-600 italic">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between items-center p-4 border rounded-lg bg-white shadow-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {b.users?.name || "Guest"}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {b.users?.email}
                    </p>
                  </div>

                  <p className="font-medium text-neutral-800">
                    £{(event.price_pence / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
