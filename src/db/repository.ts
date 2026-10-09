import { db } from './index.ts';
import { users, products, orders, orderItems } from './schema.ts';
import { eq, desc, asc } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const displayName = name || email.split('@')[0] || 'Pelanggan Madura';
    const result = await db
      .insert(users)
      .values({
        uid,
        name: displayName,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name: displayName,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Gagal menyinkronkan profil pengguna ke database.', { cause: error });
  }
}

export async function getAllProducts() {
  try {
    return await db.select().from(products).orderBy(asc(products.id));
  } catch (error) {
    console.error('Database query failed in getAllProducts:', error);
    throw new Error('Gagal memuat katalog produk dari Cloud SQL.', { cause: error });
  }
}

export async function createProductRecord(data: {
  sku: string;
  name: string;
  category: string;
  description: string;
  origin: string;
  unit: string;
  weightGram: number;
  price: number;
  stock: number;
  imageUrl: string;
}) {
  try {
    const result = await db
      .insert(products)
      .values({
        sku: data.sku,
        name: data.name,
        category: data.category,
        description: data.description,
        origin: data.origin,
        unit: data.unit,
        weightGram: data.weightGram,
        price: data.price,
        stock: data.stock,
        soldCount: 0,
        imageUrl: data.imageUrl,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in createProductRecord:', error);
    throw new Error('Gagal menambahkan produk baru ke database.', { cause: error });
  }
}

export async function updateProductRecord(
  id: number,
  data: {
    name?: string;
    category?: string;
    origin?: string;
    unit?: string;
    price?: number;
    stock?: number;
    description?: string;
  }
) {
  try {
    const result = await db
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in updateProductRecord:', error);
    throw new Error('Gagal memperbarui data produk dan stok.', { cause: error });
  }
}

export async function deleteProductRecord(id: number) {
  try {
    await db.delete(products).where(eq(products.id, id));
    return { success: true };
  } catch (error) {
    console.error('Database query failed in deleteProductRecord:', error);
    throw new Error('Produk tidak dapat dihapus karena terkait dengan riwayat order.', { cause: error });
  }
}

export async function getAllCustomers() {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const allOrders = await db.select().from(orders);

    return allUsers.map((u) => {
      const userOrders = allOrders.filter(
        (o) => o.userUid === u.uid || o.customerEmail.toLowerCase() === u.email.toLowerCase()
      );
      const totalSpent = userOrders
        .filter((o) => o.paymentStatus === 'lunas')
        .reduce((acc, curr) => acc + curr.totalAmount, 0);
      return {
        ...u,
        orderCount: userOrders.length,
        totalSpent,
      };
    });
  } catch (error) {
    console.error('Database query failed in getAllCustomers:', error);
    throw new Error('Gagal mengambil daftar pelanggan.', { cause: error });
  }
}

export async function createOrUpdateCustomerRecord(data: {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid: data.uid,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        role: 'customer',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in createOrUpdateCustomerRecord:', error);
    throw new Error('Gagal menyimpan data pelanggan.', { cause: error });
  }
}

export async function getAllOrdersWithItems() {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.id));
    const allItems = await db.select().from(orderItems);

    return allOrders.map((order) => ({
      ...order,
      items: allItems.filter((item) => item.orderId === order.id),
    }));
  } catch (error) {
    console.error('Database query failed in getAllOrdersWithItems:', error);
    throw new Error('Gagal memuat data pesanan dari database.', { cause: error });
  }
}

export async function createOrderTransaction(payload: {
  userUid: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  courierName: string;
  shippingCost: number;
  paymentMethod: string;
  paymentSenderName: string;
  paymentProofUrl: string;
  notes: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}) {
  try {
    const allProducts = await db.select().from(products);
    let subtotalAmount = 0;

    const enrichedItems = payload.items.map((reqItem) => {
      const prod = allProducts.find((p) => p.id === reqItem.productId);
      if (!prod) {
        throw new Error(`Produk ID ${reqItem.productId} tidak ditemukan.`);
      }
      if (prod.stock < reqItem.quantity) {
        throw new Error(`Stok produk "${prod.name}" tidak mencukupi (Tersisa: ${prod.stock}).`);
      }
      const itemSubtotal = prod.price * reqItem.quantity;
      subtotalAmount += itemSubtotal;
      return {
        productId: prod.id,
        productName: prod.name,
        productCategory: prod.category,
        price: prod.price,
        quantity: reqItem.quantity,
        subtotal: itemSubtotal,
        currentStock: prod.stock,
        currentSold: prod.soldCount,
      };
    });

    const totalAmount = subtotalAmount + payload.shippingCost;
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const orderNumber = `MDR-${datePart}-${randomDigits}`;
    const trackingNumber = `MXP-${Math.floor(100000000 + Math.random() * 900000000)}`;

    // Upsert customer record in users table so Data Pelanggan is automatically updated
    const customerUid = payload.userUid || `cust-${payload.customerPhone.replace(/\D/g, '')}`;
    await db
      .insert(users)
      .values({
        uid: customerUid,
        name: payload.customerName,
        email: payload.customerEmail,
        phone: payload.customerPhone,
        address: payload.shippingAddress,
        city: payload.shippingCity,
        role: 'customer',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          name: payload.customerName,
          email: payload.customerEmail,
          phone: payload.customerPhone,
          address: payload.shippingAddress,
          city: payload.shippingCity,
        },
      });

    const isInstantPaid = payload.paymentMethod.toLowerCase().includes('cod');
    const insertedOrders = await db
      .insert(orders)
      .values({
        orderNumber,
        userUid: customerUid,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        shippingAddress: payload.shippingAddress,
        shippingCity: payload.shippingCity,
        courierName: payload.courierName,
        trackingNumber,
        subtotalAmount,
        shippingCost: payload.shippingCost,
        totalAmount,
        paymentMethod: payload.paymentMethod,
        paymentProofUrl: payload.paymentProofUrl || `REF-${datePart}-${randomDigits}`,
        paymentSenderName: payload.paymentSenderName || payload.customerName,
        paymentStatus: isInstantPaid ? 'lunas' : 'menunggu_verifikasi',
        shippingStatus: 'diproses',
        notes: payload.notes || '',
      })
      .returning();

    const createdOrder = insertedOrders[0];

    for (const item of enrichedItems) {
      await db.insert(orderItems).values({
        orderId: createdOrder.id,
        productId: item.productId,
        productName: item.productName,
        productCategory: item.productCategory,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });

      // Deduct stock and increment soldCount in real-time
      await db
        .update(products)
        .set({
          stock: item.currentStock - item.quantity,
          soldCount: item.currentSold + item.quantity,
        })
        .where(eq(products.id, item.productId));
    }

    return {
      ...createdOrder,
      items: enrichedItems,
    };
  } catch (error) {
    console.error('Database query failed in createOrderTransaction:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Gagal memproses transaksi checkout.',
      { cause: error }
    );
  }
}

export async function updateOrderPaymentAndShipping(
  orderId: number,
  updates: {
    paymentStatus?: string;
    shippingStatus?: string;
    trackingNumber?: string;
    paymentProofUrl?: string;
    paymentSenderName?: string;
  }
) {
  try {
    const result = await db
      .update(orders)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in updateOrderPaymentAndShipping:', error);
    throw new Error('Gagal memperbarui status order dan pengiriman.', { cause: error });
  }
}
