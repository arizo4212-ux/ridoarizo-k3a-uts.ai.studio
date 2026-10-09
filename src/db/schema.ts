import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull().default('-'),
  address: text('address').notNull().default('-'),
  city: text('city').notNull().default('Bangkalan'),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  origin: text('origin').notNull(),
  unit: text('unit').notNull(),
  weightGram: integer('weight_gram').notNull().default(250),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(25),
  soldCount: integer('sold_count').notNull().default(0),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userUid: text('user_uid').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  shippingCity: text('shipping_city').notNull(),
  courierName: text('courier_name').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  subtotalAmount: integer('subtotal_amount').notNull(),
  shippingCost: integer('shipping_cost').notNull(),
  totalAmount: integer('total_amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentProofUrl: text('payment_proof_url').notNull().default(''),
  paymentSenderName: text('payment_sender_name').notNull().default(''),
  paymentStatus: text('payment_status').notNull().default('menunggu_verifikasi'),
  shippingStatus: text('shipping_status').notNull().default('diproses'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  productName: text('product_name').notNull(),
  productCategory: text('product_category').notNull(),
  price: integer('price').notNull(),
  quantity: integer('quantity').notNull(),
  subtotal: integer('subtotal').notNull(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
