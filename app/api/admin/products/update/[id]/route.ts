export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request, context: any) {
  try {
    // ⭐ Correct Next.js 15 param unwrapping
    const { id: productId } = await context.params;

    console.log("🔎 Updating product:", productId);

    const supabase = await supabaseServer();

    // -------------------------
    // AUTH CHECK
    // -------------------------
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    // -------------------------
    // READ BODY
    // -------------------------
    const body = await req.json();
    console.log("📨 Incoming body:", body);

    // -------------------------
    // VALID FIELDS
    // -------------------------
    const updatableFields = [
      "name",
      "slug",
      "description",
      "price",
      "inventory_count",
      "image_url",
      "author",
      "format",
      "language",
      "genre_id",    // TEXT COLUMN
      "vibe_id",     // UUID
      "theme_id"     // UUID
    ];

    const updateData: Record<string, any> = {};

    // -------------------------
    // CLEAN / NORMALISE FIELDS
    // -------------------------
    for (const key of updatableFields) {
      const value = body[key];

      // treat "" as NULL (clearing the field)
      if (value === "") {
        updateData[key] = null;
        continue;
      }

      // keep undefined values untouched
      if (value === undefined) continue;

      // normal assignment
      updateData[key] = value;
    }

    console.log("🛠 Final updateData:", updateData);

    // -------------------------
    // UPDATE DB
    // -------------------------
    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", productId)
      .select()
      .maybeSingle();

    console.log("📤 Update result:", data, "error:", error);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Product not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product: data });

  } catch (err) {
    console.error("🔥 Update route crashed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
