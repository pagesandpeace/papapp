import { db } from "@/lib/db";
import { marketing_blocks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function fetchShopHero() {
  const row = await db
    .select()
    .from(marketing_blocks)
    .where(eq(marketing_blocks.key, "shop_hero"))
    .limit(1);

  const block = row[0];

  if (!block) return null;

  // Scheduling logic
  const now = new Date();
  const starts = block.starts_at ? new Date(block.starts_at) : null;
  const ends = block.ends_at ? new Date(block.ends_at) : null;

  const active =
    block.visible &&
    (!starts || starts <= now) &&
    (!ends || now <= ends);

  return active ? block : null;
}
