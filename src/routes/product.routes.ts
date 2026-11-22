import { Router } from 'express';
import {
  getProducts,
  getPublicProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
} from '../controllers/product.controller';
import { requireAuth } from '../middleware/auth';
import { requireApiKey } from '../middleware/apiKey';
import { uploadImages } from '../middleware/upload';

const router = Router();

// Public / External catalog endpoints
router.get('/all', requireApiKey, getPublicProducts);
router.get('/search', searchProducts);
router.get('/category/:category', getProductsByCategory);

// Dashboard catalog endpoints (Authenticated or open list)
router.get('/', getProducts);
router.get('/:id', getProductById);

// Protected mutation endpoints
router.post('/', requireAuth, uploadImages.array('pictures', 10), createProduct);
router.post('/upload', requireAuth, uploadImages.array('pictures', 10), createProduct);
router.put('/:id', requireAuth, updateProduct);
router.delete('/:id', requireAuth, deleteProduct);

export default router;
