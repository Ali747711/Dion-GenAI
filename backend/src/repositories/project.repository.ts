import { and, desc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { assets, projects, type NewProjectRow, type ProjectRow } from "../db/schema";

export const projectRepository = {
  async findMany(filter: { archived?: boolean }): Promise<ProjectRow[]> {
    const conditions = [];
    if (filter.archived !== undefined) conditions.push(eq(projects.archived, filter.archived));
    return db
      .select()
      .from(projects)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(projects.createdAt));
  },

  async findById(id: string): Promise<ProjectRow | null> {
    const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async create(input: Pick<NewProjectRow, "name" | "description">): Promise<ProjectRow> {
    const [row] = await db.insert(projects).values(input).returning();
    if (!row) throw new Error("Failed to create project");
    return row;
  },

  async update(id: string, patch: Partial<Pick<ProjectRow, "name" | "description" | "archived">>): Promise<ProjectRow | null> {
    const rows = await db
      .update(projects)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async countAssets(projectId: string): Promise<number> {
    const rows = await db.select({ id: assets.id }).from(assets).where(eq(assets.projectId, projectId));
    return rows.length;
  },
};
