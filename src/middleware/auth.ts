import { Request, Response, NextFunction } from 'express';
import { extractToken, verifyToken, JWTPayload } from '../lib/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/** Express middleware to enforce JWT authentication */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication required: Missing authorization token or cookie.',
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed: Invalid or expired token.',
    });
    return;
  }

  req.user = payload;
  next();
}
