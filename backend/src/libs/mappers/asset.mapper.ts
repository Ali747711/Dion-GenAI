import type { AssetRow } from "../../db/schema";
import type { Asset, AssetSource } from "../types/asset";

export function toApiAsset(row: AssetRow, projectName: string | null): Asset {
  return {
    id: row.id,
    kind: "audio",
    source: row.source as AssetSource,
    title: row.title,
    jobId: row.jobId,
    variantId: row.variantId,
    variantIndex: (row.variantIndex as 0 | 1 | null) ?? null,
    siblingAssetId: row.siblingAssetId,
    projectId: row.projectId,
    projectName,
    mimeType: row.mimeType,
    bytes: row.bytes,
    durationSeconds: row.durationSeconds,
    favorite: row.favorite,
    archived: row.archived,
    lyrics: row.lyrics,
    prompt: row.prompt,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    createdAt: row.createdAt.toISOString(),
    contentUrl: `/api/v1/assets/${row.id}/content`,
    downloadUrl: `/api/v1/assets/${row.id}/download`,
  };
}
