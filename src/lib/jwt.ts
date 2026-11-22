import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { env } from '../config/env';

export interface JWTPayload {
  sub: string;      // User identifier (email or id)
  role: string;     // e.g. 'admin'
  iat?: number;
  exp?: number;
}

/** Sign a JWT token (default expiry: 8h) */
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
}

/** Verify a JWT token – returns payload or null */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/** Extract token from Authorization header or cookie */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization ?? '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Check cookie (from cookie-parser)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}
