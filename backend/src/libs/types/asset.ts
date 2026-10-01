import type { UUID } from "./common";

export type AssetSource = "music" | "cover" | "sound" | "speech" | "voice_preview";

export interface Asset {
  id: UUID;
  kind: "audio";
  source: AssetSource;
  title: string;
  jobId: UUID | null;
  variantId: UUID | null;
  variantIndex: 0 | 1 | null;
  siblingAssetId: UUID | null;
  projectId: UUID | null;
  projectName: string | null;
  mimeType: string;
  bytes: number;
  durationSeconds: number | null;
  favorite: boolean;
  archived: boolean;
  lyrics: string | null;
  prompt: string | null;
  tags: string[];
  createdAt: string;
  contentUrl: string;
  downloadUrl: string;
}

export interface AssetUpdateInput {
  title?: string;
  favorite?: boolean;
  archived?: boolean;
  projectId?: UUID | null;
}

export interface AssetListQuery {
  q?: string;
  favorite?: boolean;
  projectId?: string;
  archived?: boolean;
  source?: AssetSource;
  sort?: "createdAt" | "title" | "duration";
  order?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}
