import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  getAllProducts,
  createProductRecord,
  updateProductRecord,
  deleteProductRecord,
  getAllCustomers,
  createOrUpdateCustomerRecord,
  getAllOrdersWithItems,
  createOrderTransaction,
  updateOrderPaymentAndShipping,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Public Storefront Endpoints
  app.get('/api/products', async (_req, res) => {
    try {
      const products = await getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat produk.' });
    }
  });

  app.get('/api/orders/track/:query', async (req, res) => {
    try {
      const q = req.params.query.trim().toLowerCase();
      const allOrders = await getAllOrdersWithItems();
      const matched = allOrders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.trackingNumber.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q)
      );
      res.json(matched);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal melacak pesanan.' });
    }
  });

  app.post('/api/orders/checkout', async (req, res) => {
    try {
      const created = await createOrderTransaction(req.body);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal membuat pesanan.' });
    }
  });

  app.patch('/api/orders/:id/proof', async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const { paymentProofUrl, paymentSenderName } = req.body;
      const updated = await updateOrderPaymentAndShipping(orderId, {
        paymentProofUrl,
        paymentSenderName,
        paymentStatus: 'menunggu_verifikasi',
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal mengunggah bukti pembayaran.' });
    }
  });

  // Admin Login via Form Credentials
  app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    if (
      (email === 'admin@maduramarket.id' || email === 'admin') &&
      (password === 'madura2026' || password === 'admin123')
    ) {
      res.json({
        token: 'MADURA-ADMIN-SESSION-2026',
        admin: {
          uid: 'admin-madura-01',
          name: 'Admin Utama Madura',
          email: 'admin@maduramarket.id',
          role: 'admin',
        },
      });
    } else {
      res.status(401).json({ error: 'Email atau kata sandi admin tidak sesuai.' });
    }
  });

  // Sync Firebase Auth User to Cloud SQL
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        const userRecord = await getOrCreateUser(
          req.user.uid,
          req.user.email || 'user@maduramarket.id',
          req.user.name
        );
        return res.json(userRecord);
      }
      res.json({ uid: 'admin-madura-01', email: 'admin@maduramarket.id', role: 'admin' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal sinkronisasi akun.' });
    }
  });

  // Protected Admin Routes (accepts either Firebase ID Token or Admin Form Session Key)
  app.get('/api/admin/orders', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const orders = await getAllOrdersWithItems();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat data order.' });
    }
  });

  app.patch('/api/admin/orders/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderId = Number(req.params.id);
      const updated = await updateOrderPaymentAndShipping(orderId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal memperbarui status pesanan.' });
    }
  });

  app.get('/api/admin/customers', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const customers = await getAllCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat data pelanggan.' });
    }
  });

  app.post('/api/admin/customers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const saved = await createOrUpdateCustomerRecord(req.body);
      res.json(saved);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data pelanggan.' });
    }
  });

  app.post('/api/admin/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      const created = await createProductRecord(req.body);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menambah produk.' });
    }
  });

  app.patch('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = Number(req.params.id);
      const updated = await updateProductRecord(productId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal memperbarui produk.' });
    }
  });

  app.delete('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = Number(req.params.id);
      const result = await deleteProductRecord(productId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menghapus produk.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use('/src/assets', express.static(path.join(__dirname, 'src/assets')));
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MADURA Marketplace Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
