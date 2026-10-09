import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  MapPin,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Product, CartItem, Order, formatIDR, CATEGORIES } from './types.ts';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer.tsx';
import { TrackingView } from './components/TrackingView.tsx';
import { AdminView } from './components/AdminView.tsx';

type ActivePage = 'store' | 'tracking' | 'admin';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua Kategori');
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('Semua Kabupaten');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');

  // Shopping Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Selected product detail modal for Contiguous Purchase Module (PDP)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Tracking query passed after checkout
  const [trackingQuery, setTrackingQuery] = useState<string>('MDR-');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = (product: Product, delta = 1) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + delta);
        if (nextQty <= 0) {
          return prev.filter((item) => item.product.id !== product.id);
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      if (delta > 0) {
        return [...prev, { product, quantity: Math.min(product.stock, delta) }];
      }
      return prev;
    });
  };

  const handleUpdateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = Math.min(item.product.stock, item.quantity + delta);
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const filteredProducts = products
    .filter((p) => {
      const matchesCat =
        selectedCategory === 'Semua Kategori' || p.category === selectedCategory;
      const matchesOrigin =
        originFilter === 'Semua Kabupaten' || p.origin === originFilter;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.origin.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesOrigin && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return b.soldCount - a.soldCount;
    });

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F8] text-[#111827]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#katalog"
            onClick={(e) => {
              e.preventDefault();
              setActivePage('store');
              setSelectedCategory('Semua Kategori');
            }}
            className="text-xl font-display font-bold tracking-tight text-neutral-900 whitespace-nowrap"
          >
            MADURA
          </a>

          {/* Zone 2: 5 Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
            <button
              onClick={() => {
                setActivePage('store');
                setSelectedCategory('Semua Kategori');
              }}
              className={`hover:text-neutral-900 transition-colors whitespace-nowrap cursor-pointer ${
                activePage === 'store' && selectedCategory === 'Semua Kategori'
                  ? 'text-neutral-900 underline underline-offset-8 decoration-2 decoration-[#B91C1C]'
                  : ''
              }`}
            >
              Katalog Utama
            </button>
            <button
              onClick={() => {
                setActivePage('store');
                setSelectedCategory('Kuliner & Olahan Laut');
              }}
              className={`hover:text-neutral-900 transition-colors whitespace-nowrap cursor-pointer ${
                activePage === 'store' && selectedCategory === 'Kuliner & Olahan Laut'
                  ? 'text-neutral-900 underline underline-offset-8 decoration-2 decoration-[#B91C1C]'
                  : ''
              }`}
            >
              Kuliner Laut
            </button>
            <button
              onClick={() => {
                setActivePage('store');
                setSelectedCategory('Batik & Kriya Warisan');
              }}
              className={`hover:text-neutral-900 transition-colors whitespace-nowrap cursor-pointer ${
                activePage === 'store' && selectedCategory === 'Batik & Kriya Warisan'
                  ? 'text-neutral-900 underline underline-offset-8 decoration-2 decoration-[#B91C1C]'
                  : ''
              }`}
            >
              Batik & Kriya
            </button>
            <button
              onClick={() => {
                setActivePage('store');
                setSelectedCategory('Jamu & Rempah Alami');
              }}
              className={`hover:text-neutral-900 transition-colors whitespace-nowrap cursor-pointer ${
                activePage === 'store' && selectedCategory === 'Jamu & Rempah Alami'
                  ? 'text-neutral-900 underline underline-offset-8 decoration-2 decoration-[#B91C1C]'
                  : ''
              }`}
            >
              Jamu & Rempah
            </button>
            <button
              onClick={() => setActivePage('tracking')}
              className={`hover:text-neutral-900 transition-colors whitespace-nowrap cursor-pointer ${
                activePage === 'tracking'
                  ? 'text-neutral-900 underline underline-offset-8 decoration-2 decoration-[#B91C1C]'
                  : ''
              }`}
            >
              Lacak Kiriman
            </button>
          </nav>

          {/* Zone 3: 2 Primary Actions (Admin Panel & Shopping Cart) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActivePage(activePage === 'admin' ? 'store' : 'admin')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                activePage === 'admin'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              {activePage === 'admin' ? 'Kembali ke Toko' : 'Admin Panel'}
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Keranjang</span>
              <span className="font-mono font-bold">({totalCartItems})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Router */}
      <main className="flex-1">
        {activePage === 'admin' && (
          <AdminView
            products={products}
            onRefreshStoreProducts={fetchProducts}
          />
        )}

        {activePage === 'tracking' && (
          <TrackingView initialQuery={trackingQuery} />
        )}

        {activePage === 'store' && (
          <div>
            {/* Section 1: Storefront Hero */}
            <section className="border-b border-neutral-200 bg-white">
              <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-6 space-y-5">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="font-semibold text-[#B91C1C]">
                        Sentra Produk Khas Daerah Pulau Madura
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Bangkalan · Sampang · Pamekasan · Sumenep</span>
                    </div>

                    <h1
                      className="text-3xl sm:text-4xl lg:text-[42px] font-display font-bold text-neutral-900 leading-[1.15]"
                      style={{ textWrap: 'balance' }}
                    >
                      Belanja Produk Asli Madura dengan Pengiriman Cepat & Terpercaya
                    </h1>

                    <p className="text-base text-neutral-600 leading-relaxed max-w-xl">
                      Kurasi langsung dari pengrajin dan produsen lokal terbaik di empat kabupaten Madura. Mulai dari petis udang super, bebek bumbu hitam vakum, batik tulis gentongan Tanjung Bumi, hingga jamu keraton Sumenep dengan jaminan stok real-time.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <a
                        href="#katalog-produk"
                        className="px-5 py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <span>Belanja Sekarang</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setActivePage('tracking')}
                        className="px-5 py-3 bg-[#F9F9F8] hover:bg-neutral-200/70 text-neutral-800 border border-neutral-300 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <Truck className="w-4 h-4 text-neutral-600" />
                        <span>Cek Status Resi Pengiriman</span>
                      </button>
                    </div>

                    {/* Quantitative Proof Adjacency */}
                    <div className="pt-4 border-t border-neutral-200 grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="font-mono font-bold text-sm text-neutral-900">
                          12 Produk Unggulan
                        </div>
                        <div className="text-neutral-500 mt-0.5">
                          3 Kategori Khas Daerah
                        </div>
                      </div>
                      <div>
                        <div className="font-mono font-bold text-sm text-neutral-900">
                          6–10 Jam Sampai
                        </div>
                        <div className="text-neutral-500 mt-0.5">
                          Same-Day via Jembatan Suramadu
                        </div>
                      </div>
                      <div>
                        <div className="font-mono font-bold text-sm text-neutral-900">
                          100% Real-Time SQL
                        </div>
                        <div className="text-neutral-500 mt-0.5">
                          Sinkronisasi Stok & Bukti Bayar
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900 aspect-16/9">
                      <img
                        src="/src/assets/images/hero_madura_marketplace_1791263562807.jpg"
                        alt="Koleksi Kuliner, Batik Tulis Tanjung Bumi, dan Jamu Rempah Asli Madura"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-6">
                        <div className="text-white space-y-1">
                          <div className="text-xs font-medium text-amber-300">
                            Pengiriman Setiap Hari dari Gudang Terpadu Pamekasan & Bangkalan
                          </div>
                          <div className="text-sm sm:text-base font-semibold">
                            Gratis Ongkir Otomatis untuk Pembelian di Atas Rp250.000
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Featured Catalog & Quick-Add Retail Experience */}
            <section
              id="katalog-produk"
              className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-6"
            >
              {/* Search, Category Filter Tabs, and County Filter Bar */}
              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Interactive Category Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F9F9F8] border border-neutral-200 rounded-lg">
                    {CATEGORIES.map((category) => {
                      const count =
                        category === 'Semua Kategori'
                          ? products.length
                          : products.filter((p) => p.category === category).length;
                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            selectedCategory === category
                              ? 'bg-neutral-900 text-white'
                              : 'text-neutral-600 hover:text-neutral-900'
                          }`}
                        >
                          {category} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Search & Sort Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari petis, lorjuk, batik, jamu..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
                      <select
                        value={originFilter}
                        onChange={(e) => setOriginFilter(e.target.value)}
                        className="px-3 py-2 text-xs font-medium bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 cursor-pointer"
                      >
                        <option value="Semua Kabupaten">Semua Kabupaten</option>
                        <option value="Bangkalan">Kab. Bangkalan</option>
                        <option value="Sampang">Kab. Sampang</option>
                        <option value="Pamekasan">Kab. Pamekasan</option>
                        <option value="Sumenep">Kab. Sumenep</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 text-xs font-medium bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 cursor-pointer"
                      >
                        <option value="popular">Paling Laris</option>
                        <option value="price-asc">Harga Terendah</option>
                        <option value="price-desc">Harga Tertinggi</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Grid (3 columns on desktop per E-Commerce reference) */}
              {isLoadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-neutral-200 rounded-xl overflow-hidden h-96 animate-pulse p-4 flex flex-col justify-between"
                    >
                      <div className="bg-neutral-200 h-52 rounded-lg" />
                      <div className="space-y-2">
                        <div className="h-3 bg-neutral-200 rounded w-1/2" />
                        <div className="h-5 bg-neutral-200 rounded w-3/4" />
                        <div className="h-8 bg-neutral-200 rounded w-full mt-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => {
                    const cartEntry = cart.find((c) => c.product.id === product.id);
                    const qtyInCart = cartEntry ? cartEntry.quantity : 0;

                    return (
                      <article
                        key={product.id}
                        className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
                      >
                        <div>
                          {/* Product Image Container (4:3 aspect ratio) */}
                          <div
                            onClick={() => setSelectedProduct(product)}
                            className="aspect-4/3 bg-[#F9F9F8] overflow-hidden border-b border-neutral-100 cursor-pointer"
                          >
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover hover:scale-103 transition-transform duration-200"
                            />
                          </div>

                          <div className="p-5 space-y-2">
                            {/* Clean unboxed metadata with typographic separators (Zero-Pill Rule) */}
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                              <span className="uppercase tracking-wider font-medium text-[11px] text-[#B91C1C]">
                                {product.category}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>Asli {product.origin}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{product.unit}</span>
                            </div>

                            <h3
                              onClick={() => setSelectedProduct(product)}
                              className="text-base font-semibold text-neutral-900 hover:text-[#B91C1C] transition-colors cursor-pointer"
                            >
                              {product.name}
                            </h3>

                            <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          </div>
                        </div>

                        {/* Price & Instant Retail Stepper Footer */}
                        <div className="px-5 pb-5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[15px] font-mono font-bold text-neutral-900 tabular-nums">
                              {formatIDR(product.price)}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                              Stok: {product.stock} · Terjual {product.soldCount}
                            </div>
                          </div>

                          {qtyInCart === 0 ? (
                            <button
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => handleAddToCart(product, 1)}
                              className="px-4 py-2 bg-neutral-900 hover:bg-[#B91C1C] disabled:bg-neutral-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>
                                {product.stock > 0 ? 'Tambah' : 'Stok Habis'}
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center border border-[#B91C1C] rounded-lg bg-red-50/40">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(product.id, -1)}
                                className="w-8 h-8 flex items-center justify-center text-[#B91C1C] hover:bg-red-100 rounded-l-lg cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-mono font-bold text-neutral-900">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(product.id, 1)}
                                disabled={qtyInCart >= product.stock}
                                className="w-8 h-8 flex items-center justify-center text-[#B91C1C] hover:bg-red-100 disabled:opacity-40 rounded-r-lg cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 3: Authentic Origin & Reliable Shipping Guarantee */}
            <section className="border-t border-neutral-200 bg-white">
              <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      <ShieldCheck className="w-4 h-4 text-[#B91C1C]" />
                      <span>01. Jaminan Keaslian Sentra Daerah</span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Setiap produk dikurasi langsung dari pengrajin batik Tanjung Bumi Bangkalan, nelayan pesisir Pamekasan, dan peracik jamu tradisional Sumenep dengan standar higienitas ritel modern.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      <Truck className="w-4 h-4 text-[#B91C1C]" />
                      <span>02. Sistem Pengiriman Terpercaya</span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Kemasan kuliner menggunakan segel vakum kedap udara. Didukung armada Same-Day via Jembatan Suramadu serta ekspedisi nasional dengan nomor resi yang dapat dilacak real-time.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      <MapPin className="w-4 h-4 text-[#B91C1C]" />
                      <span>03. Sinkronisasi Inventaris Cloud SQL</span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Seluruh ketersediaan stok, riwayat pesanan pelanggan, verifikasi bukti pembayaran, hingga laporan penjualan terhubung secara langsung ke database PostgreSQL berbasis cloud.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Product Detail Contiguous Purchase Modal (PDP) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-3xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-xl">
            <div className="aspect-4/3 md:aspect-auto bg-[#F9F9F8]">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#B91C1C]">
                    {selectedProduct.category} · {selectedProduct.origin}
                  </span>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer"
                  >
                    Tutup ✕
                  </button>
                </div>

                <h2 className="text-xl font-display font-bold text-neutral-900">
                  {selectedProduct.name}
                </h2>

                <div className="text-lg font-mono font-bold text-neutral-900">
                  {formatIDR(selectedProduct.price)}
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  {selectedProduct.description}
                </p>

                <div className="pt-2 border-t border-neutral-200 text-xs text-neutral-600 space-y-1">
                  <div>
                    Kode SKU: <span className="font-mono">{selectedProduct.sku}</span>
                  </div>
                  <div>
                    Kemasan: <span className="font-mono">{selectedProduct.unit}</span> ({selectedProduct.weightGram}g)
                  </div>
                  <div>
                    Stok Tersedia:{' '}
                    <span className="font-mono font-semibold text-neutral-900">
                      {selectedProduct.stock} unit
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 flex gap-2">
                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct, 1);
                    setSelectedProduct(null);
                    setIsCartOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Tambah ke Keranjang & Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Checkout Bar on Storefront when Cart has items */}
      {activePage === 'store' && totalCartItems > 0 && !isCartOpen && (
        <div className="sticky bottom-4 z-30 max-w-xl mx-auto w-full px-4">
          <div className="bg-neutral-900 text-white rounded-xl px-5 py-3.5 shadow-xl flex items-center justify-between gap-4 border border-neutral-800">
            <div>
              <div className="text-xs text-neutral-300">
                {totalCartItems} produk dalam keranjang
              </div>
              <div className="text-sm font-mono font-bold">
                Subtotal: {formatIDR(totalCartPrice)}
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span>Lanjut Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Cart & Checkout Drawer */}
      <CartCheckoutDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onOrderSuccess={async (order: Order) => {
          setIsCartOpen(false);
          await fetchProducts();
          setTrackingQuery(order.orderNumber);
          setActivePage('tracking');
        }}
      />

      {/* Clean Footer */}
      <footer className="border-t border-neutral-200 bg-white mt-auto">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            <span className="font-display font-bold text-neutral-900">MADURA</span> — Marketplace Produk Khas Daerah & Pengiriman Terpercaya
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActivePage('store')}
              className="hover:text-neutral-900 cursor-pointer"
            >
              Katalog Produk (12)
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActivePage('tracking')}
              className="hover:text-neutral-900 cursor-pointer"
            >
              Lacak Pengiriman
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActivePage('admin')}
              className="hover:text-neutral-900 cursor-pointer"
            >
              Portal Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
