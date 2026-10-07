import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  code: text("code").primaryKey(), originalCode: text("original_code").notNull().default(""),
  application: text("application").notNull(), axle: text("axle").notNull().default(""),
  product: text("product").notNull(), type: text("type").notNull().default(""), hub: text("hub").notNull().default(""),
  priceCents: integer("price_cents"), stockQuantity: integer("stock_quantity"),
  active: integer("active", { mode: "boolean" }).notNull().default(true), imageUrl: text("image_url"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), customerName: text("customer_name").notNull(), customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull().default(""), postalCode: text("postal_code").notNull().default(""),
  totalCents: integer("total_cents").notNull().default(0), status: text("status").notNull().default("pending"),
  paymentProvider: text("payment_provider").notNull().default("manual"), paymentReference: text("payment_reference"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }), orderId: text("order_id").notNull().references(() => orders.id),
  productCode: text("product_code").notNull().references(() => products.code), quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
});
