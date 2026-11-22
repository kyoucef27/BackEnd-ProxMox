import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/** Express middleware for public external API access with x-api-key */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== env.MY_SECRET_KEY) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing x-api-key header.',
    });
    return;
  }

  next();
}
