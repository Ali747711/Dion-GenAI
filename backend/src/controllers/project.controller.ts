import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { respondData, respondError, respondList } from "../libs/utils/respond";
import { parseOrThrow } from "../libs/utils/validate";
import { projectService } from "../services/project.service";
import { createProjectSchema, listProjectsQuerySchema, projectIdParamSchema, projectUpdateSchema } from "../validators/project.validator";

export const projectController: Record<string, RequestHandler> = {};

projectController.list = async (req, res) => {
  try {
    const query = parseOrThrow(listProjectsQuerySchema, req.query);
    const projects = await projectService.listProjects(query);
    respondList(res, HttpCode.OK, projects, null);
  } catch (error) {
    respondError(res, error);
  }
};

projectController.create = async (req, res) => {
  try {
    const body = parseOrThrow(createProjectSchema, req.body);
    const project = await projectService.createProject(body);
    respondData(res, HttpCode.CREATED, project);
  } catch (error) {
    respondError(res, error);
  }
};

projectController.getById = async (req, res) => {
  try {
    const { id } = parseOrThrow(projectIdParamSchema, req.params);
    const project = await projectService.getProjectDetail(id);
    respondData(res, HttpCode.OK, project);
  } catch (error) {
    respondError(res, error);
  }
};

projectController.update = async (req, res) => {
  try {
    const { id } = parseOrThrow(projectIdParamSchema, req.params);
    const patch = parseOrThrow(projectUpdateSchema, req.body);
    const project = await projectService.updateProject(id, patch);
    respondData(res, HttpCode.OK, project);
  } catch (error) {
    respondError(res, error);
  }
};
