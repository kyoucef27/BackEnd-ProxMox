import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import fs from 'fs/promises';
import path from 'path';

/** GET /api/products */
export async function getProducts(_req: Request, res: Response): Promise<void> {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products.',
    });
  }
}

/** GET /api/products/all — External public endpoint with x-api-key */
export async function getPublicProducts(_req: Request, res: Response): Promise<void> {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products.',
    });
  }
}

/** GET /api/products/:id */
export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid product ID.' });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product record not found.' });
      return;
    }

    res.status(200).json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/** POST /api/products & POST /api/products/upload — Multipart upload */
export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      price,
      desc,
      fullDesc,
      category,
      productType,
      platform,
      subscriptionDuration = 'N/A',
      deliveryMethod = 'email',
      inStock,
    } = req.body;

    const files = req.files as Express.Multer.File[] | undefined;

    if (!name || !price || !desc || !fullDesc || !category || !productType || !platform) {
      res.status(400).json({
        success: false,
        message: 'Missing required product attributes.',
      });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one visual asset image file is required.',
      });
      return;
    }

    if (!['Streaming', 'Gaming', 'Software', 'Other'].includes(category)) {
      res.status(400).json({ success: false, message: 'Invalid category classification.' });
      return;
    }

    if (!['account', 'subscription', 'license', 'gift-card'].includes(productType)) {
      res.status(400).json({ success: false, message: 'Invalid product type specification.' });
      return;
    }

    // Map uploaded files to public URLs
    const pictureUrls = files.map((file) => `/uploads/${file.filename}`);
    const isAvailable = inStock === 'on' || inStock === 'true' || inStock === true;

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        desc,
        fullDesc,
        category,
        productType,
        platform,
        subscriptionDuration,
        deliveryMethod,
        inStock: isAvailable,
        pictures: pictureUrls,
        views: 0,
        stars: 0,
        sold: 0,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product registered successfully in database.',
      product,
    });
  } catch (error: any) {
    console.error('[createProduct]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create product record.',
    });
  }
}

/** PUT /api/products/:id */
export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid product ID.' });
      return;
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Product record not found.' });
      return;
    }

    const body = req.body;
    const data: any = {};

    if (typeof body.name === 'string') data.name = body.name;
    if (body.price !== undefined) data.price = Number(body.price);
    if (typeof body.desc === 'string') data.desc = body.desc;
    if (typeof body.fullDesc === 'string') data.fullDesc = body.fullDesc;
    if (typeof body.category === 'string') data.category = body.category;
    if (typeof body.productType === 'string') data.productType = body.productType;
    if (typeof body.platform === 'string') data.platform = body.platform;
    if (typeof body.subscriptionDuration === 'string') data.subscriptionDuration = body.subscriptionDuration;
    if (typeof body.deliveryMethod === 'string') data.deliveryMethod = body.deliveryMethod;
    if (typeof body.inStock === 'boolean') data.inStock = body.inStock;
    if (body.inStock === 'true' || body.inStock === 'false') data.inStock = body.inStock === 'true';

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    res.status(200).json({
      success: true,
      message: 'Product record updated successfully.',
      product: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/** DELETE /api/products/:id */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'Invalid product ID.' });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product record not found.' });
      return;
    }

    // Delete associated local files from public/uploads
    if (product.pictures && product.pictures.length > 0) {
      await Promise.allSettled(
        product.pictures.map(async (url) => {
          // url format: /uploads/filename.jpg
          const cleanPath = url.startsWith('/') ? url.slice(1) : url;
          const absolutePath = path.join(process.cwd(), 'public', cleanPath);
          try {
            await fs.unlink(absolutePath);
          } catch {
            // Ignore if file doesn't exist
          }
        })
      );
    }

    await prisma.product.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Product and associated asset photography purged successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/** GET /api/products/category/:category */
export async function getProductsByCategory(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.params;

    if (!['Streaming', 'Gaming', 'Software', 'Other'].includes(category)) {
      res.status(400).json({ success: false, message: 'Invalid category classification.' });
      return;
    }

    const products = await prisma.product.findMany({
      where: { category },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/** GET /api/products/search?q=... */
export async function searchProducts(req: Request, res: Response): Promise<void> {
  try {
    const q = req.query.q as string | undefined;

    if (!q || !q.trim()) {
      res.status(400).json({ success: false, message: 'Search parameter "q" is required.' });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { desc: { contains: q, mode: 'insensitive' } },
          { platform: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
