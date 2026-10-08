import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  code: text("code").primaryKey(), originalCode: text("original_code").notNull().default(""),
  application: text("application").notNull(), axle: text("axle").notNull().default(""),
  product: text("product").notNull(), type: text("type").notNull().default(""), hub: text("hub").notNull().default(""),
  priceCents: integer("price_cents"), stockQuantity: integer("stock_quantity"),
  active: integer("active", { mode: "boolean" }).notNull().default(true), imageUrl: text("image_url"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  emailVerifiedAt: text("email_verified_at"),
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

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), role: text("role").notNull().default("customer"),
  phone: text("phone").notNull().default("").unique(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  plate: text("plate").notNull(), brand: text("brand").notNull().default(""), model: text("model").notNull().default(""),
  year: text("year").notNull().default(""), version: text("version").notNull().default(""), hasAbs: integer("has_abs", { mode: "boolean" }),
  nickname: text("nickname").notNull().default(""), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const savedCartItems = sqliteTable("saved_cart_items", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), itemKey: text("item_key").notNull(),
  name: text("name").notNull(), fit: text("fit").notNull().default(""), priceCents: integer("price_cents").notNull(),
  quantity: integer("quantity").notNull().default(1), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const loginAttempts = sqliteTable("login_attempts", {
  email: text("email").primaryKey(), attempts: integer("attempts").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull().default(sql`CURRENT_TIMESTAMP`), lockedUntil: text("locked_until"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(), usedAt: text("used_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const emailVerificationTokens = sqliteTable("email_verification_tokens", {
  tokenHash: text("token_hash").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(), usedAt: text("used_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const securityEvents = sqliteTable("security_events", {
  id: text("id").primaryKey(), type: text("type").notNull(), userId: text("user_id"),
  subjectHash: text("subject_hash"), details: text("details").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
