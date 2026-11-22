import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/** GET /api/order — List and filter orders */
export async function getOrders(req: Request, res: Response): Promise<void> {
  try {
    const { status, startDate, endDate, customer } = req.query;

    const where: any = {};

    if (status && ['pending', 'delivered', 'returned'].includes(status as string)) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    if (customer) {
      const term = customer as string;
      where.customer = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        customer: true,
        statusHistory: { orderBy: { timestamp: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders.',
    });
  }
}

/** POST /api/order — Create order */
export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body;
    const orderData = body.order || body;
    const { items, total, customer } = orderData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
      });
      return;
    }

    if (typeof total !== 'number' || total < 0) {
      res.status(400).json({
        success: false,
        message: 'Total amount must be a non-negative number.',
      });
      return;
    }

    if (!customer || typeof customer !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Customer information is required.',
      });
      return;
    }

    for (const item of items) {
      if (!item.productId) {
        res.status(400).json({
          success: false,
          message: 'Each item must specify a valid productId.',
        });
        return;
      }
      if (!item.quantity || item.quantity < 1) {
        res.status(400).json({
          success: false,
          message: 'Each item quantity must be at least 1.',
        });
        return;
      }
    }

    const order = await prisma.order.create({
      data: {
        total,
        status: 'pending',
        customer: {
          create: {
            name: customer.name || 'Guest Client',
            email: customer.email || null,
            address: customer.address || null,
            city: customer.city || null,
            phone: customer.phone || null,
          },
        },
        items: {
          create: items.map((i: any) => ({
            productId: String(i.productId),
            quantity: Number(i.quantity),
          })),
        },
        statusHistory: {
          create: [{ status: 'pending', note: 'Order registered via checkout' }],
        },
      },
      include: {
        items: true,
        customer: true,
        statusHistory: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order,
    });
  } catch (error: any) {
    console.error('[createOrder]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order record.',
    });
  }
}

/** GET /api/order/analytics */
export async function getOrderAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const [totalOrders, pendingOrders, deliveredOrders, returnedOrders, weeklyRaw, monthlyRaw] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'pending' } }),
        prisma.order.count({ where: { status: 'delivered' } }),
        prisma.order.count({ where: { status: 'returned' } }),

        // Group by day over last 7 days
        prisma.$queryRaw<{ date: string; orders: bigint; revenue: number }[]>`
          SELECT
            TO_CHAR("createdAt", 'YYYY-MM-DD') AS date,
            COUNT(*)::bigint AS orders,
            COALESCE(SUM(total), 0) AS revenue
          FROM "Order"
          WHERE "createdAt" >= ${oneWeekAgo}
          GROUP BY date
          ORDER BY date ASC
        `,

        // Group by month over last 30 days
        prisma.$queryRaw<{ month: string; orders: bigint; revenue: number }[]>`
          SELECT
            TO_CHAR("createdAt", 'YYYY-MM') AS month,
            COUNT(*)::bigint AS orders,
            COALESCE(SUM(total), 0) AS revenue
          FROM "Order"
          WHERE "createdAt" >= ${oneMonthAgo}
          GROUP BY month
          ORDER BY month ASC
        `,
      ]);

    res.status(200).json({
      success: true,
      statistics: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        returnedOrders,
        weeklyData: weeklyRaw.map((r) => ({
          date: r.date,
          orders: Number(r.orders),
          revenue: Number(r.revenue),
        })),
        monthlyData: monthlyRaw.map((r) => ({
          month: r.month,
          orders: Number(r.orders),
          revenue: Number(r.revenue),
        })),
      },
    });
  } catch (error: any) {
    console.error('[getOrderAnalytics]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate analytics.',
    });
  }
}

/** GET /api/order/date-range?start=...&end=... */
export async function getOrdersByDateRange(req: Request, res: Response): Promise<void> {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      res.status(400).json({
        success: false,
        message: 'Both "start" and "end" date query parameters are required.',
      });
      return;
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid ISO date format. Use YYYY-MM-DD.',
      });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { items: true, customer: true, statusHistory: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/** GET /api/order/customer/:email */
export async function getOrdersByCustomerEmail(req: Request, res: Response): Promise<void> {
  try {
    const email = decodeURIComponent(req.params.email);

    const orders = await prisma.order.findMany({
      where: { customer: { email } },
      include: { items: true, customer: true, statusHistory: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/** GET /api/order/:id */
export async function getOrderById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID.' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true, statusHistory: true },
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order record not found.' });
      return;
    }

    res.status(200).json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/** PUT /api/order/status/:id */
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid order ID.' });
      return;
    }

    const { status, note } = req.body;

    if (!status || !['pending', 'delivered', 'returned'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "pending", "delivered", or "returned".',
      });
      return;
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Order record not found.' });
      return;
    }

    const dateUpdates: any = {};
    if (status === 'delivered') dateUpdates.deliveryDate = new Date();
    if (status === 'returned') dateUpdates.returnDate = new Date();

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...dateUpdates,
        statusHistory: {
          create: [{ status, note: note || `Order transitioned to ${status}` }],
        },
      },
      include: { items: true, customer: true, statusHistory: true },
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      order: updatedOrder,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
