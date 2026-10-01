import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { assets, type ProjectRow } from "../db/schema";
import AppError, { ErrorCode, Message } from "../libs/Errors";
import { toApiAsset } from "../libs/mappers/asset.mapper";
import type { CreateProjectInput, Project, ProjectDetail, ProjectUpdateInput } from "../libs/types/project";
import { projectRepository } from "../repositories/project.repository";

async function toApiProject(row: ProjectRow): Promise<Project> {
  const assetCount = await projectRepository.countAssets(row.id);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    archived: row.archived,
    assetCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const projectService = {
  async listProjects(filter: { archived?: boolean }): Promise<Project[]> {
    const rows = await projectRepository.findMany(filter);
    return Promise.all(rows.map(toApiProject));
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    const row = await projectRepository.create({ name: input.name, description: input.description ?? null });
    return toApiProject(row);
  },

  async getProjectDetail(id: string): Promise<ProjectDetail> {
    const row = await projectRepository.findById(id);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const assetRows = await db.select().from(assets).where(eq(assets.projectId, id));
    const project = await toApiProject(row);
    return { ...project, assets: assetRows.map((asset) => toApiAsset(asset, row.name)) };
  },

  async updateProject(id: string, patch: ProjectUpdateInput): Promise<Project> {
    const row = await projectRepository.update(id, patch);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return toApiProject(row);
  },
};
