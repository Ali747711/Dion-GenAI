import type { RequestHandler } from "express";

import { SESSION_COOKIE_NAME } from "../libs/configs";
import AppError, { ErrorCode, HttpCode, Message } from "../libs/Errors";
import { respondData, respondError } from "../libs/utils/respond";
import { parseOrThrow } from "../libs/utils/validate";
import { sessionService } from "../services/session.service";
import { loginSchema } from "../validators/session.validator";

function sessionSave(session: Express.Request["session"]): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((error) => (error ? reject(error) : resolve()));
  });
}

function sessionRegenerate(session: Express.Request["session"]): Promise<void> {
  return new Promise((resolve, reject) => {
    session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function sessionDestroy(session: Express.Request["session"]): Promise<void> {
  return new Promise((resolve, reject) => {
    session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

export const sessionController: Record<string, RequestHandler> = {};

sessionController.getSession = async (req, res) => {
  try {
    if (!req.session.csrfToken) {
      req.session.csrfToken = sessionService.generateCsrfToken();
      await sessionSave(req.session);
    }
    const authenticated = Boolean(req.session.authenticated);
    respondData(res, HttpCode.OK, {
      authenticated,
      owner: authenticated ? { name: sessionService.ownerName() } : null,
      csrfToken: req.session.csrfToken,
    });
  } catch (error) {
    respondError(res, error);
  }
};

sessionController.login = async (req, res) => {
  try {
    const body = parseOrThrow(loginSchema, req.body);
    const valid = await sessionService.verifyPassword(body.password);
    if (!valid) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, Message.INVALID_CREDENTIALS);
    }

    // Regenerate the session id on login to prevent session fixation; the
    // CSRF token that guarded this very request already came from the
    // pre-login (anonymous) session and was validated by middleware before
    // we get here.
    await sessionRegenerate(req.session);
    req.session.authenticated = true;
    req.session.csrfToken = sessionService.generateCsrfToken();
    await sessionSave(req.session);

    respondData(res, HttpCode.OK, {
      authenticated: true,
      owner: { name: sessionService.ownerName() },
      csrfToken: req.session.csrfToken,
    });
  } catch (error) {
    respondError(res, error);
  }
};

sessionController.logout = async (req, res) => {
  try {
    await sessionDestroy(req.session);
    res.clearCookie(SESSION_COOKIE_NAME);
    respondData(res, HttpCode.OK, { authenticated: false });
  } catch (error) {
    respondError(res, error);
  }
};
