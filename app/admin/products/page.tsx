export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Products | Pages & Peace",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
  const supabase = await supabaseServer();

  // ✅ Fetch all products EXCEPT event-ticket products
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .neq("product_type", "event")   // ← FILTER OUT EVENTS
    .order("created_at", { ascending: false });

  if (error) console.error("PRODUCT FETCH ERROR:", error);

  return (
    <main className="max-w-6xl mx-auto py-10 px-6 space-y-10">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-wide">Products</h1>
          <p className="text-neutral-600 text-sm">
            Manage shop products and track inventory.
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button variant="primary">+ Add Product</Button>
        </Link>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f4f0ea] text-left text-xs uppercase tracking-wide text-[#444]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 w-28">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products?.map((p) => {
              const low = p.inventory_count <= 3;
              const out = p.inventory_count <= 0;

              return (
                <tr
                  key={p.id}
                  className="border-t hover:bg-[#faf8f5] transition"
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.product_type}</td>
                  <td className="px-4 py-3">
                    £{Number(p.price).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">
                    {out ? (
                      <span className="text-red-600 font-semibold">
                        Out of Stock
                      </span>
                    ) : (
                      p.inventory_count
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {out ? (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-red-200 text-red-800 border border-red-300">
                        Out
                      </span>
                    ) : low ? (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-yellow-200 text-yellow-800 border border-yellow-300">
                        Low
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-green-200 text-green-800 border border-green-300">
                        In Stock
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`}>
                      <Button variant="neutral" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products?.length === 0 && (
          <p className="p-6 text-neutral-600 text-center">No products yet.</p>
        )}
      </div>
    </main>
  );
}
