# Velurian Standalone API Backend

Dedicated Node.js & TypeScript REST API service for Velurian Atelier dashboard and public storefront client applications.

---

## Architecture Overview

- **Runtime**: Node.js v20+ / TypeScript
- **Web Framework**: Express 4 with typed routers and middleware
- **Database ORM**: Prisma ORM with PostgreSQL
- **Authentication**: Stateless JWT (`jsonwebtoken`) supporting both HTTP Bearer headers and `token` cookies
- **File Storage**: Local Multer storage serving uploaded images statically via `/uploads/*`
- **Security**: CORS origin whitelisting, credentials support, API key verification for public headless storefronts

---

## Directory Structure

```
backend/
├── prisma/
│   └── schema.prisma         # PostgreSQL schema (Customer, Product, Order, OrderItem, StatusHistory)
├── public/
│   └── uploads/              # Local storage for uploaded product visuals
├── src/
│   ├── config/
│   │   └── env.ts            # Typed environment variables validation
│   ├── controllers/
│   │   ├── auth.controller.ts    # Login, logout, getMe
│   │   ├── product.controller.ts # Product CRUD, category & search, multi-image upload
│   │   └── order.controller.ts   # Order ingestion, status transitions, analytics
│   ├── lib/
│   │   ├── jwt.ts            # JWT signing, verification, cookie/header extraction
│   │   └── prisma.ts         # PrismaClient singleton instance
│   ├── middleware/
│   │   ├── apiKey.ts         # x-api-key guard for public storefront endpoints
│   │   ├── auth.ts           # requireAuth middleware for protected endpoints
│   │   └── upload.ts         # Multer multipart disk storage engine
│   ├── routes/
│   │   ├── auth.routes.ts    # /api/auth/*
│   │   ├── product.routes.ts # /api/products/*
│   │   └── order.routes.ts   # /api/order/*
│   └── index.ts              # Express application bootstrap & static serving
├── .env                      # Local environment configuration
├── package.json              # Standalone dependencies and build scripts
└── tsconfig.json             # Strict TypeScript configuration
```

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL database instance running locally or remotely

### 2. Configure Environment (`.env`)
Make sure `backend/.env` contains your database connection string and secrets:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dashboard?schema=public"
JWT_SECRET="velurian-atelier-secret-jwt-key-2026-production"
JWT_EXPIRES_IN="8h"
MY_SECRET_KEY="123456"
FRONTEND_URL="http://localhost:3000"
```

### 3. Install Dependencies & Generate Prisma Client
```bash
# In the backend directory:
npm install
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```
The server will boot on `http://localhost:5000` with hot-reloading via `tsx watch`.

### 5. Production Build & Run
```bash
npm run build
npm start
```

---

## API Endpoints Reference

### Health Check
- `GET /api/health` — Service status, environment, and uptime check.

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/login` | Login with `{ email, password }`. Sets cookie & returns JWT. | No |
| `POST` | `/api/auth/logout` | Clears authentication session cookie. | No |
| `GET`  | `/api/auth/me` | Fetch currently authenticated user identity. | Yes (Bearer/Cookie) |

### Products (`/api/products`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/products` | Retrieve all active catalog products. | No |
| `GET` | `/api/products/:id` | Retrieve single product dossier by numeric ID. | No |
| `GET` | `/api/products/search?q=term` | Search catalog by title or description. | No |
| `GET` | `/api/products/category/:category` | Filter products by category (`Streaming`, `Gaming`, etc.). | No |
| `GET` | `/api/products/all` | Public headless storefront catalog feed. | `x-api-key: 123456` |
| `POST` | `/api/products` | Create product with multipart `pictures` (up to 10 files). | Yes |
| `POST` | `/api/products/upload` | Alias for product creation with image upload. | Yes |
| `PUT` | `/api/products/:id` | Update product attributes. | Yes |
| `DELETE` | `/api/products/:id` | Remove product and unlink associated images from disk. | Yes |

### Orders (`/api/order`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/order` | Ingest new order (items, customer details, total). | No |
| `GET` | `/api/order` | List orders with optional filters (`status`, `startDate`, `endDate`, `customer`). | Yes |
| `GET` | `/api/order/:id` | Retrieve detailed order record with items and timeline. | Yes |
| `GET` | `/api/order/analytics` | Aggregate revenue, order volume, daily/weekly/monthly stats. | Yes |
| `GET` | `/api/order/date-range?startDate=...&endDate=...` | Query orders within specified temporal boundaries. | Yes |
| `GET` | `/api/order/customer/:email` | Retrieve order history for a customer email. | Yes |
| `PUT` | `/api/order/status/:id` | Transition order status (`pending`, `delivered`, `returned`) with audit record. | Yes |

### Static Media Assets
- `GET /uploads/:filename` — Publicly accessible URL for uploaded product images.
"# BackEnd-ProxMox" 
