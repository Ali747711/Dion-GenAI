import { and, asc, desc, eq, ilike, lt, or, type SQL } from "drizzle-orm";

import { db, type Executor } from "../db/client";
import { assets, type AssetRow, type NewAssetRow } from "../db/schema";
import type { AssetListQuery } from "../libs/types/asset";
import type { Cursor } from "../libs/utils/pagination";

export const assetRepository = {
  async insert(row: NewAssetRow, executor: Executor = db): Promise<AssetRow> {
    const rows = await executor.insert(assets).values(row).returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create asset");
    return created;
  },

  async findById(id: string, executor: Executor = db): Promise<AssetRow | null> {
    const rows = await executor.select().from(assets).where(eq(assets.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async update(id: string, patch: Partial<AssetRow>, executor: Executor = db): Promise<AssetRow | null> {
    const rows = await executor
      .update(assets)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async findMany(query: AssetListQuery, cursor: Cursor | null, limit: number): Promise<AssetRow[]> {
    const conditions: SQL[] = [];
    if (query.q) conditions.push(ilike(assets.title, `%${query.q}%`));
    if (query.favorite !== undefined) conditions.push(eq(assets.favorite, query.favorite));
    if (query.projectId) conditions.push(eq(assets.projectId, query.projectId));
    if (query.archived !== undefined) conditions.push(eq(assets.archived, query.archived));
    if (query.source) conditions.push(eq(assets.source, query.source));

    const sortColumn = query.sort === "title" ? assets.title : query.sort === "duration" ? assets.durationSeconds : assets.createdAt;
    const direction = query.order === "asc" ? asc : desc;

    if (cursor) {
      // Cursor pagination is defined against createdAt+id regardless of sort,
      // which keeps pages stable for the common (createdAt) case; for the
      // title/duration sorts we fall back to createdAt+id as a tiebreaker.
      conditions.push(
        or(lt(assets.createdAt, new Date(cursor.createdAt)), and(eq(assets.createdAt, new Date(cursor.createdAt)), lt(assets.id, cursor.id))) as SQL
      );
    }

    return db
      .select()
      .from(assets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(direction(sortColumn), desc(assets.createdAt), desc(assets.id))
      .limit(limit);
  },
};
