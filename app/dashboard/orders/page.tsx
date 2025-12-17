import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";

type OrderRow = {
  id: string;
  total: number | string;
  status: string;
  created_at: string;
  order_items?: {
    quantity: number;
    price: number;
  }[];
};

export default async function OrdersPage() {
  const supabase = await supabaseServer();

  // Get user
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return (
      <main className="p-8">
        <p className="opacity-60 text-sm">
          Please sign in to view your orders.
        </p>
      </main>
    );
  }

  // Fetch orders + items server-side
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      total,
      status,
      created_at,
      stripe_receipt_url,
      order_items (
        quantity,
        price
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Failed to load orders:", error);
    return (
      <main className="p-8">
        <p className="opacity-60 text-sm">Failed to load orders.</p>
      </main>
    );
  }

  const orders = (data ?? []).map((o: OrderRow) => ({
    id: o.id,
    total: Number(o.total),
    status: o.status,
    created_at: o.created_at,
    itemCount: o.order_items?.length ?? 0,
  }));

  // FULL UI BELOW — EXACTLY LIKE YOUR ORIGINAL PAGE
  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* HEADER */}
        <header className="pb-4 border-b">
          <h1 className="text-3xl font-semibold tracking-wide">
            My Orders 📦
          </h1>
          <p className="text-sm opacity-60 mt-1">
            An overview of your recent purchases.
          </p>
        </header>

        {/* EMPTY STATE */}
        {orders.length === 0 && (
          <div className="text-center py-20 opacity-70">
            <p>No orders yet.</p>
            <Link
              href="/shop"
              className="underline text-accent mt-2 inline-block"
            >
              Browse the shop →
            </Link>
          </div>
        )}

        {/* TABLE */}
        {orders.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#F3ECE5] text-[#111]/70 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Items</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t hover:bg-[#FAF6F1]/60 transition-colors"
                  >
                    <td className="px-5 py-4">
                      {new Date(o.created_at).toLocaleDateString("en-GB")}
                    </td>

                    <td className="px-5 py-4">
                      {o.itemCount} item(s)
                    </td>

                    <td className="px-5 py-4 font-medium">
                      £{o.total.toFixed(2)}
                    </td>

                    <td className="px-5 py-4 capitalize">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-md
                          ${
                            o.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : o.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-200 text-gray-700"
                          }
                        `}
                      >
                        {o.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="text-accent underline hover:opacity-70"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
