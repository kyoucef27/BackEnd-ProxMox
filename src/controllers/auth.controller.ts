import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { AuthenticatedRequest } from '../middleware/auth';

/** POST /api/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    // Look up user in Customer table
    const user = await prisma.customer.findFirst({ where: { email } });

    if (!user || user.password !== password) {
      res.status(401).json({
        success: false,
        message: 'Authentication rejected: Invalid email or password.',
      });
      return;
    }

    const token = signToken({ sub: email, role: 'admin' });

    // Set cookie for browser sessions
    res.cookie('token', token, {
      path: '/',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
      sameSite: 'lax',
      httpOnly: false, // allow client-side reading if needed
      secure: process.env.NODE_ENV === 'production',
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
      },
    });
  } catch (error: any) {
    console.error('[auth.login]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal authentication server error.',
    });
  }
}

/** POST /api/auth/logout */
export function logout(_req: Request, res: Response): void {
  res.clearCookie('token', { path: '/' });
  res.status(200).json({
    success: true,
    message: 'Session terminated successfully.',
  });
}

/** GET /api/auth/me */
export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated.' });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: { email: req.user.sub },
      select: { id: true, name: true, email: true, phone: true, city: true, address: true },
    });

    res.status(200).json({
      success: true,
      user: customer || { email: req.user.sub, role: req.user.role },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
