import { Router } from 'express';
import {
  getOrders,
  createOrder,
  getOrderAnalytics,
  getOrdersByDateRange,
  getOrdersByCustomerEmail,
  getOrderById,
  updateOrderStatus,
} from '../controllers/order.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Order ingestion (can be created by store customers or dashboard)
router.post('/', createOrder);

// Analytics and reporting (specific routes before /:id)
router.get('/analytics', requireAuth, getOrderAnalytics);
router.get('/date-range', requireAuth, getOrdersByDateRange);
router.get('/customer/:email', requireAuth, getOrdersByCustomerEmail);

// Order status updates (support both /status/:id and /:id/status for flexibility)
router.put('/status/:id', requireAuth, updateOrderStatus);
router.put('/:id/status', requireAuth, updateOrderStatus);

// Main order query and details
router.get('/', requireAuth, getOrders);
router.get('/:id', requireAuth, getOrderById);

export default router;
