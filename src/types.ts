export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  description: string;
  origin: string;
  unit: string;
  weightGram: number;
  price: number;
  stock: number;
  soldCount: number;
  imageUrl: string;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  productId: number;
  productName: string;
  productCategory: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  userUid: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  courierName: string;
  trackingNumber: string;
  subtotalAmount: number;
  shippingCost: number;
  totalAmount: number;
  paymentMethod: string;
  paymentProofUrl: string;
  paymentSenderName: string;
  paymentStatus: 'menunggu_verifikasi' | 'lunas' | 'ditolak' | string;
  shippingStatus: 'diproses' | 'dikemas' | 'dalam_perjalanan' | 'selesai' | string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface Customer {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  role: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const CATEGORIES = [
  'Semua Kategori',
  'Kuliner & Olahan Laut',
  'Batik & Kriya Warisan',
  'Jamu & Rempah Alami',
] as const;

export const COURIER_OPTIONS = [
  {
    id: 'madura-sameday',
    name: 'Madura Express Same-Day (Via Suramadu)',
    eta: 'Tiba Hari Ini (6–10 Jam)',
    cost: 15000,
  },
  {
    id: 'trunojoyo-reg',
    name: 'Trunojoyo Kurir Reguler (Jawa & Nasional)',
    eta: 'Estimasi 1–2 Hari Kerja',
    cost: 12000,
  },
  {
    id: 'jnt-kargo',
    name: 'J&T Express Kargo Cold-Pack Aman',
    eta: 'Estimasi 2–3 Hari Kerja',
    cost: 18000,
  },
  {
    id: 'madura-instant',
    name: 'Madura Express Instant (Area Bangkalan–Sumenep)',
    eta: 'Tiba dalam 2 Jam',
    cost: 10000,
  },
];

export const PAYMENT_METHODS = [
  {
    id: 'qris',
    name: 'QRIS Nasional MADURA (Instan Semua E-Wallet & M-Banking)',
    account: 'NMID: ID2026089918273 (PT Madura Retail Nusantara)',
    instruction: 'Scan atau masukkan nomor referensi transaksi QRIS Anda pada bukti bayar.',
  },
  {
    id: 'bca',
    name: 'Transfer Bank BCA (8291-0029-11)',
    account: '8291-0029-11 a/n PT Madura Retail Nusantara',
    instruction: 'Lakukan transfer sesuai nominal tagihan dan unggah kode referensi / foto resi.',
  },
  {
    id: 'mandiri',
    name: 'Transfer Bank Mandiri (14000-8829-192)',
    account: '14000-8829-192 a/n PT Madura Retail Nusantara',
    instruction: 'Transfer melalui Livin by Mandiri atau ATM dan cantumkan nama pengirim.',
  },
  {
    id: 'bri',
    name: 'Transfer BRI (0021-01-992811-502)',
    account: '0021-01-992811-502 a/n PT Madura Retail Nusantara',
    instruction: 'Transfer via BRImo dan masukkan nomor referensi bukti pembayaran.',
  },
];
