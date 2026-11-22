import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public auth endpoints
router.post('/login', login);
router.post('/logout', logout);

// Authenticated user session
router.get('/me', requireAuth, getMe);

export default router;
