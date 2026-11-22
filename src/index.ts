import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import { UPLOAD_DIR } from './middleware/upload';

const app = express();

// ==========================================
// Middleware Pipeline
// ==========================================

// CORS configuration supporting credentials from frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Cookie'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve local media uploads statically
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/public/uploads', express.static(UPLOAD_DIR));

// Request logger in dev
if (process.env.NODE_ENV !== 'test') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ==========================================
// Routes
// ==========================================

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Velurian Standalone Backend Service',
    environment: env.NODE_ENV,
    port: env.PORT,
  });
});

// Mounted feature routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/order', orderRoutes);

// 404 Handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ==========================================
// Server Bootstrap
// ==========================================

const server = app.listen(env.PORT, () => {
  console.log(`
  ══════════════════════════════════════════════════════════
  ✦ VELURIAN STANDALONE BACKEND RUNNING
  ══════════════════════════════════════════════════════════
  ► Local URL:      http://localhost:${env.PORT}
  ► Health Check:   http://localhost:${env.PORT}/api/health
  ► Auth Router:    http://localhost:${env.PORT}/api/auth
  ► Products API:   http://localhost:${env.PORT}/api/products
  ► Orders API:     http://localhost:${env.PORT}/api/order
  ► Static Uploads: http://localhost:${env.PORT}/uploads/
  ══════════════════════════════════════════════════════════
  `);
});

export { app, server };
