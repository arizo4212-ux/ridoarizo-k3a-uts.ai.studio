import React, { useState } from 'react';
import {
  Search,
  Truck,
  CheckCircle2,
  Package,
  Clock,
  Upload,
  FileText,
  MapPin,
} from 'lucide-react';
import { Order, formatIDR } from '../types.ts';

interface TrackingViewProps {
  initialQuery?: string;
}

export const TrackingView: React.FC<TrackingViewProps> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery || 'MDR-');
  const [results, setResults] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proofInputMap, setProofInputMap] = useState<Record<number, string>>({});
  const [senderInputMap, setSenderInputMap] = useState<Record<number, string>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleTrack = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const targetQ = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!targetQ) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(targetQ)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Error tracking order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    handleTrack(undefined, initialQuery || 'MDR-');
  }, [initialQuery]);

  const handleUploadProof = async (orderId: number) => {
    const proofVal = proofInputMap[orderId]?.trim();
    const senderVal = senderInputMap[orderId]?.trim();
    if (!proofVal) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/proof`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentProofUrl: proofVal,
          paymentSenderName: senderVal || 'Pelanggan MADURA',
        }),
      });
      if (res.ok) {
        setFeedbackMsg(
          'Bukti pembayaran berhasil dikirim ke Cloud SQL dan siap diverifikasi oleh Admin.'
        );
        setTimeout(() => setFeedbackMsg(null), 4000);
        await handleTrack();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStepIndex = (shippingStatus: string) => {
    switch (shippingStatus) {
      case 'diproses':
        return 1;
      case 'dikemas':
        return 2;
      case 'dalam_perjalanan':
        return 3;
      case 'selesai':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-medium text-[#B91C1C] mb-1">
          Sistem Ekspedisi & Logistik Terpadu Pulau Madura
        </p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900">
          Lacak Status Pengiriman & Konfirmasi Pembayaran
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Masukkan nomor pesanan (contoh: <span className="font-mono">MDR-20261005-882</span>), nomor resi kurir, atau nomor telepon penerima untuk memantau posisi paket secara real-time.
        </p>
      </div>

      <form onSubmit={(e) => handleTrack(e)} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik No. Order (MDR-...), No. Resi (MXP-...), atau No. HP..."
            className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
        >
          {isLoading ? 'Mencari di Database...' : 'Cek Status Real-Time'}
        </button>
      </form>

      {feedbackMsg && (
        <div className="mb-6 p-4 bg-emerald-900 text-white text-xs font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {hasSearched && results.length === 0 && !isLoading && (
        <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-neutral-900">
            Pesanan tidak ditemukan
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Pastikan nomor order atau nomor telepon sesuai dengan yang terdaftar saat checkout. Ketik <span className="font-mono">MDR-</span> untuk melihat daftar pengiriman aktif.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {results.map((order) => {
          const step = getStepIndex(order.shippingStatus);
          return (
            <div
              key={order.id}
              className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
                <div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="font-mono font-bold text-neutral-900 text-sm">
                      {order.orderNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      Penerima: <strong className="text-neutral-900">{order.customerName}</strong> — {order.shippingAddress}, {order.shippingCity}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-neutral-500">
                    Kurir: <span className="font-medium text-neutral-800">{order.courierName}</span>
                  </div>
                  <div className="text-xs font-mono font-semibold text-neutral-900 mt-0.5">
                    No. Resi: {order.trackingNumber}
                  </div>
                </div>
              </div>

              {/* 4-Stage Real-time Shipping Stepper */}
              <div>
                <div className="text-xs font-semibold text-neutral-900 mb-3">
                  Tahapan Pengiriman Paket
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div
                    className={`p-3 rounded-lg border ${
                      step >= 1
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-[#F9F9F8] text-neutral-400 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span>TAHAP 01</span>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-semibold">Pesanan Diterima</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Tercatat di sistem Cloud SQL
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      step >= 2
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-[#F9F9F8] text-neutral-400 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span>TAHAP 02</span>
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-semibold">Dikemas Sentra Madura</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Segel vakum & quality check
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      step >= 3
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-[#F9F9F8] text-neutral-400 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span>TAHAP 03</span>
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-semibold">Dalam Perjalanan</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Lintas Jembatan Suramadu / Kargo
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      step >= 4
                        ? 'bg-emerald-800 text-white border-emerald-800'
                        : 'bg-[#F9F9F8] text-neutral-400 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span>TAHAP 04</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-semibold">Tiba di Tujuan</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Diterima oleh pelanggan
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items & Payment Verification Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-neutral-100">
                <div>
                  <div className="text-xs font-semibold text-neutral-900 mb-2">
                    Daftar Produk ({order.items.length} jenis)
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-neutral-700">
                        <span>
                          <strong className="font-mono">{item.quantity}x</strong>{' '}
                          {item.productName}
                        </span>
                        <span className="font-mono">{formatIDR(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-neutral-500 pt-1 border-t border-neutral-100">
                      <span>Ongkos Kirim ({order.courierName})</span>
                      <span className="font-mono">{formatIDR(order.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-neutral-900 pt-1">
                      <span>Total Pembayaran</span>
                      <span className="font-mono text-sm">
                        {formatIDR(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F9F9F8] border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Status & Bukti Pembayaran</span>
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        order.paymentStatus === 'lunas'
                          ? 'text-emerald-700'
                          : order.paymentStatus === 'ditolak'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {order.paymentStatus === 'lunas'
                        ? '✓ Lunas (Telah Di-Approve Admin)'
                        : order.paymentStatus === 'ditolak'
                        ? '✕ Bukti Ditolak — Unggah Ulang'
                        : '⏳ Menunggu Approval Admin'}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-600 space-y-1 mb-3">
                    <div>Metode: {order.paymentMethod}</div>
                    <div>
                      Bukti Tercatat:{' '}
                      <span className="font-mono font-semibold text-neutral-900">
                        {order.paymentProofUrl || '-'}
                      </span>
                    </div>
                  </div>

                  {order.paymentStatus !== 'lunas' && (
                    <div className="space-y-2 pt-2 border-t border-neutral-200">
                      <div className="text-[11px] font-medium text-neutral-700">
                        Perbarui / Unggah Nomor Referensi Bukti Transfer:
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={senderInputMap[order.id] || ''}
                          onChange={(e) =>
                            setSenderInputMap({
                              ...senderInputMap,
                              [order.id]: e.target.value,
                            })
                          }
                          placeholder="Nama Pengirim Rekening"
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-md"
                        />
                        <input
                          type="text"
                          value={proofInputMap[order.id] || ''}
                          onChange={(e) =>
                            setProofInputMap({
                              ...proofInputMap,
                              [order.id]: e.target.value,
                            })
                          }
                          placeholder="No. Ref / URL Bukti Bayar"
                          className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-white border border-neutral-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleUploadProof(order.id)}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Kirim Bukti</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
