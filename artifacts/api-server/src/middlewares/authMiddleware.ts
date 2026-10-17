import type { AuthUser } from "@workspace/api-zod";
import type { NextFunction, Request, Response } from "express";
import { clearSession, getSession, getSessionId, refreshSession } from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User;
    }
    interface AuthedRequest extends Request {
      user: User;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  req.isAuthenticated = function (this: Request): this is Express.AuthedRequest {
    return this.user != null;
  };

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }
  const refreshed = await refreshSession(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }
  req.user = refreshed.user;
  next();
}
