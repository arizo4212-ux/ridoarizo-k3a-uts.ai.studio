import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Truck,
  CreditCard,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import {
  CartItem,
  Order,
  formatIDR,
  COURIER_OPTIONS,
  PAYMENT_METHODS,
} from '../types.ts';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderSuccess,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingCity, setShippingCity] = useState('Surabaya');
  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedCourier, setSelectedCourier] = useState(COURIER_OPTIONS[0]);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [paymentSenderName, setPaymentSenderName] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const totalWeightGram = cart.reduce(
    (sum, item) => sum + item.product.weightGram * item.quantity,
    0
  );
  // Free shipping promo if subtotal >= 250,000
  const isFreeShipping = subtotal >= 250000;
  const shippingCost = isFreeShipping ? 0 : selectedCourier.cost;
  const grandTotal = subtotal + shippingCost;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload = {
        userUid: `cust-${customerPhone.replace(/\D/g, '') || Date.now()}`,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        shippingCity,
        courierName: selectedCourier.name,
        shippingCost,
        paymentMethod: selectedPayment.name,
        paymentSenderName: paymentSenderName || customerName,
        paymentProofUrl:
          paymentProofUrl ||
          `TRF-${selectedPayment.id.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        notes,
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
        })),
      };

      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan.');
      }

      setCompletedOrder(data);
      onClearCart();
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProofFileSim = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProofUrl(
        `BUKTI-${file.name.replace(/\s+/g, '_').toUpperCase()}-${Date.now().toString().slice(-5)}`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white h-full flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Top Drawer Bar */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-[#F9F9F8]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#B91C1C]" />
            <div>
              <h2 className="text-base font-display font-bold text-neutral-900">
                {step === 'cart' && 'Keranjang Belanja MADURA'}
                {step === 'checkout' && 'Pengiriman & Pembayaran'}
                {step === 'success' && 'Bukti Pesanan Terkonfirmasi'}
              </h2>
              <p className="text-xs text-neutral-500">
                {step === 'cart' &&
                  `${cart.reduce((a, b) => a + b.quantity, 0)} produk dipilih · Total berat ${(totalWeightGram / 1000).toFixed(2)} kg`}
                {step === 'checkout' && 'Langkah 2 dari 2 — Alur Checkout Cepat'}
                {step === 'success' && 'Tersimpan di Cloud SQL Real-Time'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setStep('cart');
              onClose();
            }}
            className="p-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Keranjang Belanja Masih Kosong
                  </div>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Pilih produk kuliner laut, batik tulis Tanjung Bumi, atau jamu rempah khas Madura di katalog utama.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Free shipping threshold indicator */}
                  <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
                    {isFreeShipping ? (
                      <div className="font-medium text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Selamat! Pesanan Anda mendapat <strong>Gratis Ongkir Ekspedisi Madura</strong>.
                        </span>
                      </div>
                    ) : (
                      <div className="text-neutral-700">
                        Tambah belanja{' '}
                        <span className="font-mono font-semibold text-[#B91C1C]">
                          {formatIDR(250000 - subtotal)}
                        </span>{' '}
                        lagi untuk menikmati <strong>Gratis Ongkir</strong> lintas Suramadu & Jawa Timur.
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-neutral-200">
                    {cart.map(({ product, quantity }) => (
                      <div key={product.id} className="py-4 flex gap-3.5">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-lg object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-neutral-500">
                            {product.category} · {product.origin}
                          </div>
                          <div className="text-sm font-semibold text-neutral-900 truncate">
                            {product.name}
                          </div>
                          <div className="text-xs font-mono font-medium text-neutral-700 mt-0.5">
                            {formatIDR(product.price)} / {product.unit}
                          </div>

                          <div className="flex items-center justify-between mt-2.5">
                            <div className="flex items-center border border-neutral-300 rounded-lg bg-[#F9F9F8]">
                              <button
                                type="button"
                                onClick={() => onUpdateQty(product.id, -1)}
                                className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-neutral-200 rounded-l-lg cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-mono font-semibold">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQty(product.id, 1)}
                                disabled={quantity >= product.stock}
                                className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-neutral-200 disabled:opacity-40 rounded-r-lg cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold text-neutral-900">
                                {formatIDR(product.price * quantity)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(product.id)}
                                className="text-neutral-400 hover:text-red-600 p-1 cursor-pointer"
                                title="Hapus item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Section 1: Penerima & Alamat */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                  <MapPin className="w-4 h-4 text-[#B91C1C]" />
                  <span>1. Informasi Penerima & Alamat Pengiriman</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Nama Lengkap Penerima
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Ahmad Fauzi"
                      className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Nomor WhatsApp Aktif
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Email Konfirmasi Pesanan
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Kota / Kabupaten Tujuan
                    </label>
                    <select
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                    >
                      <option value="Surabaya">Surabaya (Via Suramadu)</option>
                      <option value="Bangkalan">Bangkalan — Madura</option>
                      <option value="Sampang">Sampang — Madura</option>
                      <option value="Pamekasan">Pamekasan — Madura</option>
                      <option value="Sumenep">Sumenep — Madura</option>
                      <option value="Malang">Malang / Sidoarjo / Gresik</option>
                      <option value="Jakarta">Jakarta & Jabodetabek</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Alamat Lengkap & Patokan
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan..."
                    className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              {/* Section 2: Kurir Pengiriman Terpercaya */}
              <div className="space-y-2.5 pt-3 border-t border-neutral-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                  <Truck className="w-4 h-4 text-[#B91C1C]" />
                  <span>2. Pilih Layanan Pengiriman Terpercaya</span>
                </div>

                <div className="space-y-2">
                  {COURIER_OPTIONS.map((courier) => {
                    const active = selectedCourier.id === courier.id;
                    return (
                      <label
                        key={courier.id}
                        onClick={() => setSelectedCourier(courier)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          active
                            ? 'border-neutral-900 bg-neutral-900/5'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-neutral-900">
                            {courier.name}
                          </div>
                          <div className="text-neutral-500 text-[11px]">
                            {courier.eta}
                          </div>
                        </div>
                        <div className="font-mono font-semibold text-neutral-900">
                          {isFreeShipping ? 'GRATIS' : formatIDR(courier.cost)}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Metode Pembayaran & Upload Bukti */}
              <div className="space-y-3 pt-3 border-t border-neutral-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                  <CreditCard className="w-4 h-4 text-[#B91C1C]" />
                  <span>3. Metode Pembayaran & Bukti Transfer</span>
                </div>

                <select
                  value={selectedPayment.id}
                  onChange={(e) => {
                    const found = PAYMENT_METHODS.find((m) => m.id === e.target.value);
                    if (found) setSelectedPayment(found);
                  }}
                  className="w-full px-3 py-2.5 text-xs font-medium bg-[#F9F9F8] border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>

                <div className="p-3 bg-[#F9F9F8] border border-neutral-200 rounded-lg text-xs space-y-1">
                  <div className="font-mono font-semibold text-neutral-900">
                    {selectedPayment.account}
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    {selectedPayment.instruction}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Nama Pengirim Rekening / E-Wallet
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentSenderName}
                      onChange={(e) => setPaymentSenderName(e.target.value)}
                      placeholder="Sesuai nama di bukti transfer"
                      className="w-full px-3 py-2 text-xs bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Kode Referensi / Unggah Bukti Bayar
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentProofUrl}
                      onChange={(e) => setPaymentProofUrl(e.target.value)}
                      placeholder="Ketik No. Ref atau pilih file..."
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F9F9F8] border border-neutral-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">
                    Atau lampirkan file struk transfer (otomatis mengisi kode bukti):
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleProofFileSim}
                    className="block w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-neutral-200 file:text-neutral-800 hover:file:bg-neutral-300 cursor-pointer"
                  />
                </div>
              </div>
            </form>
          )}

          {step === 'success' && completedOrder && (
            <div className="space-y-6 py-4">
              <div className="p-5 bg-emerald-950 text-white rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pesanan Berhasil Dibuat & Stok Gudang Diperbarui</span>
                </div>
                <div className="text-xl font-mono font-bold">
                  {completedOrder.orderNumber}
                </div>
                <p className="text-xs text-emerald-100/90">
                  Bukti pembayaran Anda (<span className="font-mono">{completedOrder.paymentProofUrl}</span>) telah masuk ke antrean Approval Admin.
                </p>
              </div>

              <div className="bg-[#F9F9F8] border border-neutral-200 rounded-xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Nomor Resi Pengiriman</span>
                  <span className="font-mono font-bold text-neutral-900">
                    {completedOrder.trackingNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Ekspedisi</span>
                  <span className="font-medium text-neutral-900">
                    {completedOrder.courierName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tujuan</span>
                  <span className="font-medium text-neutral-900">
                    {completedOrder.customerName} ({completedOrder.shippingCity})
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-200">
                  <span className="font-semibold text-neutral-900">Total Tagihan</span>
                  <span className="font-mono font-bold text-sm text-[#B91C1C]">
                    {formatIDR(completedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const orderToTrack = completedOrder;
                  setStep('cart');
                  onOrderSuccess(orderToTrack);
                }}
                className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Pantau Status Pengiriman Real-Time Sekarang</span>
              </button>
            </div>
          )}
        </div>

        {/* Sticky Bottom Footer Summary */}
        {cart.length > 0 && step !== 'success' && (
          <div className="p-6 border-t border-neutral-200 bg-[#F9F9F8] space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal Produk</span>
                <span className="font-mono font-medium">{formatIDR(subtotal)}</span>
              </div>
              {step === 'checkout' && (
                <div className="flex justify-between text-neutral-600">
                  <span>Ongkos Kirim ({selectedCourier.name.split(' ')[0]})</span>
                  <span className="font-mono font-medium">
                    {shippingCost === 0 ? 'GRATIS' : formatIDR(shippingCost)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1.5 border-t border-neutral-200">
                <span>Total Pembayaran</span>
                <span className="font-mono text-base text-[#B91C1C]">
                  {formatIDR(step === 'checkout' ? grandTotal : subtotal)}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Lanjut ke Pengiriman & Pembayaran</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-3 bg-white border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-xl hover:bg-neutral-50 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {isSubmitting ? 'Memproses ke SQL...' : 'Konfirmasi & Buat Pesanan'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
