import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { parseRangeHeader } from "../libs/utils/range";
import { respondData, respondError, respondList } from "../libs/utils/respond";
import { parseOrThrow } from "../libs/utils/validate";
import { assetService } from "../services/asset.service";
import { extensionForMime, storageService } from "../services/storage.service";
import { assetIdParamSchema, assetUpdateSchema, listAssetsQuerySchema } from "../validators/asset.validator";

export const assetController: Record<string, RequestHandler> = {};

assetController.list = async (req, res) => {
  try {
    const query = parseOrThrow(listAssetsQuerySchema, req.query);
    const { items, nextCursor } = await assetService.listAssets(query);
    respondList(res, HttpCode.OK, items, nextCursor);
  } catch (error) {
    respondError(res, error);
  }
};

assetController.getById = async (req, res) => {
  try {
    const { id } = parseOrThrow(assetIdParamSchema, req.params);
    const asset = await assetService.getAsset(id);
    respondData(res, HttpCode.OK, asset);
  } catch (error) {
    respondError(res, error);
  }
};

assetController.update = async (req, res) => {
  try {
    const { id } = parseOrThrow(assetIdParamSchema, req.params);
    const patch = parseOrThrow(assetUpdateSchema, req.body);
    const asset = await assetService.updateAsset(id, patch);
    respondData(res, HttpCode.OK, asset);
  } catch (error) {
    respondError(res, error);
  }
};

assetController.content = async (req, res) => {
  try {
    const { id } = parseOrThrow(assetIdParamSchema, req.params);
    const row = await assetService.getAssetRow(id);
    const stat = await storageService.stat(row.storageKey);
    const size = stat.size;

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", row.mimeType);

    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Length", String(size));
      res.status(HttpCode.OK);
      storageService.createReadStream(row.storageKey).pipe(res);
      return;
    }

    const parsed = parseRangeHeader(range, size);
    if (!parsed) {
      res.setHeader("Content-Range", `bytes */${size}`);
      res.status(HttpCode.RANGE_NOT_SATISFIABLE).end();
      return;
    }

    const { start, end } = parsed;
    res.status(HttpCode.PARTIAL_CONTENT);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", String(end - start + 1));
    storageService.createReadStream(row.storageKey, { start, end }).pipe(res);
  } catch (error) {
    respondError(res, error);
  }
};

assetController.download = async (req, res) => {
  try {
    const { id } = parseOrThrow(assetIdParamSchema, req.params);
    const row = await assetService.getAssetRow(id);
    const stat = await storageService.stat(row.storageKey);
    const extension = extensionForMime(row.mimeType);

    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Length", String(stat.size));
    res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(row.title)}.${extension}"`);
    storageService.createReadStream(row.storageKey).pipe(res);
  } catch (error) {
    respondError(res, error);
  }
};

function sanitizeFilename(title: string): string {
  const cleaned = title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 100);
  return cleaned.length > 0 ? cleaned : "track";
}
