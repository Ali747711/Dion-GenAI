import { inArray } from "drizzle-orm";

import { db } from "../db/client";
import { projects, type AssetRow } from "../db/schema";
import AppError, { ErrorCode, Message } from "../libs/Errors";
import { toApiAsset } from "../libs/mappers/asset.mapper";
import type { Asset, AssetListQuery, AssetUpdateInput } from "../libs/types/asset";
import { clampLimit, decodeCursor, encodeCursor } from "../libs/utils/pagination";
import { assetRepository } from "../repositories/asset.repository";
import { projectRepository } from "../repositories/project.repository";

async function projectNamesFor(rows: AssetRow[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((row) => row.projectId).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();
  const rowsWithNames = await db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, ids));
  return new Map(rowsWithNames.map((row) => [row.id, row.name]));
}

export const assetService = {
  async listAssets(query: AssetListQuery): Promise<{ items: Asset[]; nextCursor: string | null }> {
    const limit = clampLimit(query.limit, 20, 50);
    const cursor = decodeCursor(query.cursor);

    const rows = await assetRepository.findMany(query, cursor, limit + 1);
    const page = rows.slice(0, limit);
    const hasMore = rows.length > limit;

    const names = await projectNamesFor(page);
    const items = page.map((row) => toApiAsset(row, row.projectId ? (names.get(row.projectId) ?? null) : null));

    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

    return { items, nextCursor };
  },

  async getAsset(id: string): Promise<Asset> {
    const row = await assetRepository.findById(id);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    const projectName = row.projectId ? await projectRepository.findById(row.projectId).then((p) => p?.name ?? null) : null;
    return toApiAsset(row, projectName);
  },

  async getAssetRow(id: string): Promise<AssetRow> {
    const row = await assetRepository.findById(id);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return row;
  },

  async updateAsset(id: string, patch: AssetUpdateInput): Promise<Asset> {
    if (patch.projectId) {
      const project = await projectRepository.findById(patch.projectId);
      if (!project) throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { projectId: "Project not found" } });
    }
    const row = await assetRepository.update(id, patch);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    const projectName = row.projectId ? await projectRepository.findById(row.projectId).then((p) => p?.name ?? null) : null;
    return toApiAsset(row, projectName);
  },
};
