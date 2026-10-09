import React, { useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  Search,
  LogIn,
  LogOut,
  FileCheck,
  TrendingUp,
  Users,
  ShoppingBag,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { Product, Order, Customer, formatIDR, CATEGORIES } from '../types.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut } from 'firebase/auth';

interface AdminViewProps {
  products: Product[];
  onRefreshStoreProducts: () => Promise<void>;
}

type AdminTab = 'produk' | 'order' | 'pelanggan' | 'approval' | 'laporan';

export const AdminView: React.FC<AdminViewProps> = ({
  products,
  onRefreshStoreProducts,
}) => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<{
    name: string;
    email: string;
  } | null>(null);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('admin@maduramarket.id');
  const [loginPassword, setLoginPassword] = useState('madura2026');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Tab (matching exact 5 UTS specs)
  const [activeTab, setActiveTab] = useState<AdminTab>('produk');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua Kategori');

  // Product Form Modal / Drawer State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    category: 'Kuliner & Olahan Laut',
    description: '',
    origin: 'Pamekasan',
    unit: 'Pack 250g',
    weightGram: 250,
    price: 45000,
    stock: 30,
    imageUrl: '/src/assets/images/cat_kuliner_madura_1791263576508.jpg',
  });

  // Customer Add Form State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Bangkalan',
  });

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (!adminToken) return { 'Content-Type': 'application/json' };
    if (adminToken === 'MADURA-ADMIN-SESSION-2026') {
      return {
        'Content-Type': 'application/json',
        'x-madura-admin-key': adminToken,
      };
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };
  };

  const fetchAdminData = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || adminToken;
    if (!activeToken) return;
    setIsLoadingData(true);
    const headers: Record<string, string> =
      activeToken === 'MADURA-ADMIN-SESSION-2026'
        ? { 'Content-Type': 'application/json', 'x-madura-admin-key': activeToken }
        : { 'Content-Type': 'application/json', Authorization: `Bearer ${activeToken}` };

    try {
      const [ordersRes, custRes] = await Promise.all([
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/customers', { headers }),
      ]);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData);
      }
      await onRefreshStoreProducts();
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal login admin.');
      }
      setAdminToken(data.token);
      setAdminProfile({ name: data.admin.name, email: data.admin.email });
      await fetchAdminData(data.token);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      setAdminToken(idToken);
      setAdminProfile({
        name: cred.user.displayName || 'Admin Google',
        email: cred.user.email || 'admin@maduramarket.id',
      });
      await fetchAdminData(idToken);
    } catch (err: any) {
      setLoginError('Login Google dibatalkan atau gagal. Gunakan Form Login Admin di atas.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore if not signed into firebase
    }
    setAdminToken(null);
    setAdminProfile(null);
  };

  const handleQuickStockAdjust = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ stock: newStock }),
      });
      if (res.ok) {
        await onRefreshStoreProducts();
        showToast(`Stok "${product.name}" diperbarui menjadi ${newStock} unit.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: productForm.name,
            category: productForm.category,
            origin: productForm.origin,
            unit: productForm.unit,
            price: Number(productForm.price),
            stock: Number(productForm.stock),
            description: productForm.description,
          }),
        });
        if (res.ok) {
          showToast(`Produk "${productForm.name}" berhasil diperbarui di Cloud SQL.`);
          setEditingProduct(null);
          await onRefreshStoreProducts();
        }
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...productForm,
            price: Number(productForm.price),
            stock: Number(productForm.stock),
            weightGram: Number(productForm.weightGram),
          }),
        });
        if (res.ok) {
          showToast(`Produk baru "${productForm.name}" ditambahkan ke Cloud SQL.`);
          setShowAddProduct(false);
          await onRefreshStoreProducts();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal menghapus produk.');
        return;
      }
      await onRefreshStoreProducts();
      showToast(`Produk "${product.name}" berhasil dihapus.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: number,
    updates: { paymentStatus?: string; shippingStatus?: string }
  ) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await fetchAdminData();
        showToast(`Status pesanan #${orderId} berhasil disinkronkan ke Cloud SQL.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          uid: `cust-${Date.now()}`,
          ...customerForm,
        }),
      });
      if (res.ok) {
        setShowAddCustomer(false);
        setCustomerForm({
          name: '',
          email: '',
          phone: '',
          address: '',
          city: 'Bangkalan',
        });
        await fetchAdminData();
        showToast(`Data pelanggan "${customerForm.name}" berhasil disimpan.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // If not logged in, render Clean Admin Login Form (Spec #3: "Ada admin panel dan form login untuk Kelola")
  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-neutral-200 rounded-xl p-8">
        <div className="mb-6">
          <p className="text-xs font-medium text-[#B91C1C] tracking-wide mb-1">
            Portal Manajemen Internal
          </p>
          <h1 className="text-2xl font-display font-bold text-neutral-900">
            Login Admin MADURA
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Masuk untuk mengelola produk & stok, order, data pelanggan, approval bukti pembayaran, dan laporan sales.
          </p>
        </div>

        {loginError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleFormLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Email Administrator
            </label>
            <input
              type="text"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="admin@maduramarket.id"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div className="p-3 bg-neutral-100 rounded-lg text-xs text-neutral-600 space-y-1">
            <div className="font-medium text-neutral-900">Akses Demo Evaluasi UTS:</div>
            <div className="font-mono">Email: admin@maduramarket.id</div>
            <div className="font-mono">Sandi: madura2026</div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoggingIn ? 'Memverifikasi...' : 'Masuk ke Admin Panel'}</span>
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px bg-neutral-200 flex-1" />
          <span className="text-xs text-neutral-400">atau SSO Google</span>
          <div className="h-px bg-neutral-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogleAdminLogin}
          disabled={isLoggingIn}
          className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Masuk dengan Akun Google</span>
        </button>
      </div>
    );
  }

  // Computed metrics for Sales Report & Tabs
  const pendingApprovalOrders = orders.filter(
    (o) => o.paymentStatus === 'menunggu_verifikasi'
  );
  const paidOrders = orders.filter((o) => o.paymentStatus === 'lunas');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalItemsSold = products.reduce((acc, p) => acc + p.soldCount, 0);
  const totalStockAvailable = products.reduce((acc, p) => acc + p.stock, 0);

  // Category breakdown for Sales Report
  const categoryReport = CATEGORIES.filter((c) => c !== 'Semua Kategori').map((cat) => {
    const catProducts = products.filter((p) => p.category === cat);
    const unitsSold = catProducts.reduce((sum, p) => sum + p.soldCount, 0);
    const grossSales = catProducts.reduce((sum, p) => sum + p.soldCount * p.price, 0);
    return {
      category: cat,
      productCount: catProducts.length,
      unitsSold,
      grossSales,
    };
  });

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      categoryFilter === 'Semua Kategori' || p.category === categoryFilter;
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.origin.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Panel Kendali Operasional</span>
            <span aria-hidden="true">·</span>
            <span>Sinkronisasi Cloud SQL Aktif</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">
            Manajemen Marketplace MADURA
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAdminData()}
            className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-neutral-900">
              {adminProfile?.name}
            </div>
            <div className="text-xs text-neutral-500">{adminProfile?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="mt-4 p-3.5 bg-neutral-900 text-white text-xs font-medium rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs for the 5 Mandatory Admin Functions */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5 p-1.5 bg-neutral-200/70 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('produk')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'produk'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>1. Data Produk & Stok ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('order')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'order'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>2. Data Order & Riwayat ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pelanggan')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'pelanggan'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>3. Data Pelanggan ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('approval')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'approval'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>
            4. Approval Bukti Pembayaran ({pendingApprovalOrders.length} Menunggu)
          </span>
        </button>

        <button
          onClick={() => setActiveTab('laporan')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'laporan'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>5. Laporan Sales</span>
        </button>
      </div>

      {/* TAB 1: DATA PRODUK DAN STOK */}
      {activeTab === 'produk' && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama produk, SKU, kota..."
                  className="pl-9 pr-4 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 w-64"
                />
              </div>
              <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setEditingProduct(null);
                setProductForm({
                  sku: `MDR-NEW-${Math.floor(100 + Math.random() * 900)}`,
                  name: '',
                  category: 'Kuliner & Olahan Laut',
                  description: '',
                  origin: 'Pamekasan',
                  unit: 'Pack 250g',
                  weightGram: 250,
                  price: 45000,
                  stock: 30,
                  imageUrl: '/src/assets/images/cat_kuliner_madura_1791263576508.jpg',
                });
                setShowAddProduct(true);
              }}
              className="px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap w-fit cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Khas</span>
            </button>
          </div>

          {(showAddProduct || editingProduct) && (
            <form
              onSubmit={handleSaveProduct}
              className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-semibold text-neutral-900">
                  {editingProduct
                    ? `Edit Produk: ${editingProduct.name}`
                    : 'Tambah Produk Khas Daerah Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-900"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Kode SKU
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={productForm.sku}
                    onChange={(e) =>
                      setProductForm({ ...productForm, sku: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Nama Produk
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({ ...productForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let defaultImg =
                        '/src/assets/images/cat_kuliner_madura_1791263576508.jpg';
                      if (cat === 'Batik & Kriya Warisan') {
                        defaultImg =
                          '/src/assets/images/cat_batik_kriya_1791263591352.jpg';
                      } else if (cat === 'Jamu & Rempah Alami') {
                        defaultImg =
                          '/src/assets/images/cat_jamu_rempah_1791263602873.jpg';
                      }
                      setProductForm({
                        ...productForm,
                        category: cat,
                        imageUrl: defaultImg,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                  >
                    <option value="Kuliner & Olahan Laut">Kuliner & Olahan Laut</option>
                    <option value="Batik & Kriya Warisan">Batik & Kriya Warisan</option>
                    <option value="Jamu & Rempah Alami">Jamu & Rempah Alami</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Kabupaten Asal Madura
                  </label>
                  <select
                    value={productForm.origin}
                    onChange={(e) =>
                      setProductForm({ ...productForm, origin: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                  >
                    <option value="Bangkalan">Bangkalan</option>
                    <option value="Sampang">Sampang</option>
                    <option value="Pamekasan">Pamekasan</option>
                    <option value="Sumenep">Sumenep</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Kemasan / Satuan
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Harga (IDR)
                    </label>
                    <input
                      type="number"
                      required
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Stok Gudang
                    </label>
                    <input
                      type="number"
                      required
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          stock: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Deskripsi Produk
                </label>
                <textarea
                  rows={2}
                  required
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Simpan ke Database SQL
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-[#F9F9F8] text-xs font-semibold text-neutral-600">
                    <th className="py-3 px-4">SKU & Produk</th>
                    <th className="py-3 px-4">Kategori & Asal</th>
                    <th className="py-3 px-4">Satuan</th>
                    <th className="py-3 px-4 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 text-center">Kontrol Stok Real-Time</th>
                    <th className="py-3 px-4 text-right">Terjual</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50/80">
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-neutral-500">
                          {product.sku}
                        </div>
                        <div className="font-semibold text-neutral-900 mt-0.5">
                          {product.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        <div>{product.category}</div>
                        <div className="text-neutral-400">Kab. {product.origin}</div>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{product.unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-neutral-900">
                        {formatIDR(product.price)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleQuickStockAdjust(product, -1)}
                            className="w-6 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-mono flex items-center justify-center cursor-pointer"
                            title="Kurangi 1 stok"
                          >
                            -
                          </button>
                          <span
                            className={`font-mono font-semibold w-10 text-center ${
                              product.stock <= 5 ? 'text-red-600' : 'text-neutral-900'
                            }`}
                          >
                            {product.stock}
                          </span>
                          <button
                            onClick={() => handleQuickStockAdjust(product, 5)}
                            className="px-1.5 h-6 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-mono text-[11px] flex items-center justify-center cursor-pointer"
                            title="Tambah 5 stok"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-700">
                        {product.soldCount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowAddProduct(false);
                              setProductForm({
                                sku: product.sku,
                                name: product.name,
                                category: product.category,
                                description: product.description,
                                origin: product.origin,
                                unit: product.unit,
                                weightGram: product.weightGram,
                                price: product.price,
                                stock: product.stock,
                                imageUrl: product.imageUrl,
                              });
                            }}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer"
                            title="Edit Produk"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA ORDER DAN RIWAYAT */}
      {activeTab === 'order' && (
        <div className="mt-6 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Daftar Seluruh Order & Riwayat Pengiriman Real-Time
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Perbarui status tahapan ekspedisi untuk sinkronisasi langsung dengan halaman pelacakan pembeli.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-[#F9F9F8] text-xs font-semibold text-neutral-600">
                    <th className="py-3 px-4">No. Order & Waktu</th>
                    <th className="py-3 px-4">Pelanggan & Tujuan</th>
                    <th className="py-3 px-4">Rincian Item</th>
                    <th className="py-3 px-4">Ekspedisi & Resi</th>
                    <th className="py-3 px-4 text-right">Total Tagihan</th>
                    <th className="py-3 px-4">Status Pembayaran</th>
                    <th className="py-3 px-4">Status Pengiriman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50/70 align-top">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-neutral-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-neutral-500 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-900">
                          {order.customerName}
                        </div>
                        <div className="text-neutral-500 font-mono text-[11px]">
                          {order.customerPhone}
                        </div>
                        <div className="text-neutral-600 mt-0.5">
                          {order.shippingAddress}, {order.shippingCity}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-neutral-700">
                              <span className="font-mono font-semibold">
                                {item.quantity}x
                              </span>{' '}
                              {item.productName}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-800">
                          {order.courierName}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500 mt-0.5">
                          Resi: {order.trackingNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-neutral-900">
                        {formatIDR(order.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-medium ${
                            order.paymentStatus === 'lunas'
                              ? 'text-emerald-700'
                              : order.paymentStatus === 'ditolak'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {order.paymentStatus === 'lunas'
                            ? 'Lunas Terverifikasi'
                            : order.paymentStatus === 'ditolak'
                            ? 'Bukti Ditolak'
                            : 'Menunggu Approval'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={order.shippingStatus}
                          onChange={(e) =>
                            handleUpdateOrderStatus(order.id, {
                              shippingStatus: e.target.value,
                            })
                          }
                          className="px-2.5 py-1.5 text-xs font-medium bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 cursor-pointer"
                        >
                          <option value="diproses">1. Pesanan Diproses</option>
                          <option value="dikemas">2. Dikemas Gudang Madura</option>
                          <option value="dalam_perjalanan">
                            3. Dalam Perjalanan (Suramadu/Kargo)
                          </option>
                          <option value="selesai">4. Tiba di Tujuan (Selesai)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA PELANGGAN */}
      {activeTab === 'pelanggan' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Database Pelanggan Terdaftar & Riwayat Belanja
              </h2>
              <p className="text-xs text-neutral-500">
                Data pelanggan tersinkronisasi otomatis setiap kali pembeli melakukan checkout atau login.
              </p>
            </div>
            <button
              onClick={() => setShowAddCustomer(!showAddCustomer)}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pelanggan</span>
            </button>
          </div>

          {showAddCustomer && (
            <form
              onSubmit={handleSaveCustomer}
              className="bg-white border border-neutral-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={customerForm.email}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  No. WhatsApp / Telepon
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Alamat & Kota
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.address}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, address: e.target.value })
                  }
                  placeholder="Jl. Raya..."
                  className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-[#B91C1C] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Simpan Pelanggan
              </button>
            </form>
          )}

          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-[#F9F9F8] text-xs font-semibold text-neutral-600">
                    <th className="py-3 px-4">ID Pelanggan</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Kontak (Email & Telepon)</th>
                    <th className="py-3 px-4">Alamat Pengiriman Utama</th>
                    <th className="py-3 px-4 text-right">Frekuensi Order</th>
                    <th className="py-3 px-4 text-right">Total Nilai Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-neutral-50/70">
                      <td className="py-3.5 px-4 font-mono text-neutral-500">
                        {cust.uid}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">
                        {cust.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-neutral-800">{cust.email}</div>
                        <div className="font-mono text-neutral-500">{cust.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {cust.address} · <span className="font-medium">{cust.city}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-neutral-900">
                        {cust.orderCount} pesanan
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                        {formatIDR(cust.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: APPROVAL BUKTI PEMBAYARAN */}
      {activeTab === 'approval' && (
        <div className="mt-6 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-200">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Verifikasi & Approval Bukti Pembayaran Pelanggan
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Periksa nomor referensi mutasi bank / QRIS pelanggan dan setujui pembayaran untuk memproses pengiriman.
                </p>
              </div>
              <div className="text-xs font-mono text-neutral-600">
                Antrean Verifikasi: {pendingApprovalOrders.length} transaksi
              </div>
            </div>

            <div className="mt-4 divide-y divide-neutral-200">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-neutral-900">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-neutral-800">
                        {order.customerName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-neutral-500">{order.paymentMethod}</span>
                    </div>

                    <div className="text-xs text-neutral-600">
                      Pengirim Rek/E-Wallet:{' '}
                      <span className="font-medium text-neutral-900">
                        {order.paymentSenderName || order.customerName}
                      </span>{' '}
                      · Kode Referensi / Bukti:{' '}
                      <span className="font-mono font-semibold text-[#B91C1C]">
                        {order.paymentProofUrl || 'BELUM DIUNGGAH'}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-500">
                      Item:{' '}
                      {order.items
                        .map((i) => `${i.quantity}x ${i.productName}`)
                        .join(', ')}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right mr-2">
                      <div className="text-[11px] text-neutral-500">Nominal Transfer</div>
                      <div className="text-sm font-mono font-bold text-neutral-900">
                        {formatIDR(order.totalAmount)}
                      </div>
                    </div>

                    {order.paymentStatus === 'menunggu_verifikasi' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleUpdateOrderStatus(order.id, {
                              paymentStatus: 'lunas',
                              shippingStatus: 'dikemas',
                            })
                          }
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Lunas & Kemas</span>
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateOrderStatus(order.id, {
                              paymentStatus: 'ditolak',
                            })
                          }
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Tolak Bukti
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            order.paymentStatus === 'lunas'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                        >
                          {order.paymentStatus === 'lunas'
                            ? '✓ Telah Di-Approve (Lunas)'
                            : '✕ Bukti Ditolak'}
                        </span>
                        {order.paymentStatus !== 'lunas' && (
                          <button
                            onClick={() =>
                              handleUpdateOrderStatus(order.id, {
                                paymentStatus: 'lunas',
                              })
                            }
                            className="text-xs underline text-neutral-600 hover:text-neutral-900 cursor-pointer"
                          >
                            Ubah Jadi Lunas
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LAPORAN SALES */}
      {activeTab === 'laporan' && (
        <div className="mt-6 space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <div className="text-xs text-neutral-500">
                Total Omzet Terverifikasi (Lunas)
              </div>
              <div className="text-2xl font-mono font-bold text-neutral-900 mt-1.5">
                {formatIDR(totalRevenue)}
              </div>
              <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Dari {paidOrders.length} transaksi selesai/lunas</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <div className="text-xs text-neutral-500">
                Menunggu Verifikasi Pembayaran
              </div>
              <div className="text-2xl font-mono font-bold text-amber-700 mt-1.5">
                {formatIDR(
                  pendingApprovalOrders.reduce((acc, o) => acc + o.totalAmount, 0)
                )}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {pendingApprovalOrders.length} pesanan dalam antrean approval
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <div className="text-xs text-neutral-500">Total Unit Produk Terjual</div>
              <div className="text-2xl font-mono font-bold text-neutral-900 mt-1.5">
                {totalItemsSold.toLocaleString('id-ID')} unit
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Akumulasi seluruh produk khas Madura
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <div className="text-xs text-neutral-500">Sisa Stok Inventaris Gudang</div>
              <div className="text-2xl font-mono font-bold text-neutral-900 mt-1.5">
                {totalStockAvailable.toLocaleString('id-ID')} unit
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Tersebar di {products.length} SKU aktif
              </div>
            </div>
          </div>

          {/* Performance by Category */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">
                Laporan Penjualan per Kategori Produk Khas Daerah
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-[#F9F9F8] text-xs font-semibold text-neutral-600">
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Jumlah SKU</th>
                    <th className="py-3 px-4 text-right">Total Unit Terjual</th>
                    <th className="py-3 px-4 text-right">Estimasi Nilai Penjualan Kotor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {categoryReport.map((row) => (
                    <tr key={row.category} className="hover:bg-neutral-50">
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">
                        {row.category}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutral-700">
                        {row.productCount} produk
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-neutral-900">
                        {row.unitsSold} unit
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                        {formatIDR(row.grossSales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ledger Table of All Transactions */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">
                Jurnal Transaksi Penjualan Real-Time (Cloud SQL)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-[#F9F9F8] text-xs font-semibold text-neutral-600">
                    <th className="py-3 px-4">No. Faktur</th>
                    <th className="py-3 px-4">Pelanggan & Kota</th>
                    <th className="py-3 px-4">Metode Pembayaran</th>
                    <th className="py-3 px-4 text-right">Subtotal Produk</th>
                    <th className="py-3 px-4 text-right">Ongkos Kirim</th>
                    <th className="py-3 px-4 text-right">Total Dibayar</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-mono font-semibold text-neutral-900">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-neutral-700">
                        {o.customerName} · {o.shippingCity}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{o.paymentMethod}</td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-700">
                        {formatIDR(o.subtotalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-700">
                        {formatIDR(o.shippingCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                        {formatIDR(o.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium ${
                            o.paymentStatus === 'lunas'
                              ? 'text-emerald-700'
                              : o.paymentStatus === 'ditolak'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {o.paymentStatus === 'lunas' ? 'Lunas' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
