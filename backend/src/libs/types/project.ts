import type { UUID } from "./common";
import type { Asset } from "./asset";

export interface Project {
  id: UUID;
  name: string;
  description: string | null;
  archived: boolean;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  assets: Asset[];
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  archived?: boolean;
}
