// ─────────────────────────────────────────────────────────
//  database/db.js  –  Shree Maharaja Silks  –  Stage 4
//
//  This file does two things:
//    1. Opens (or creates) the SQLite database file
//    2. Creates the three tables if they don't exist yet
//
//  Other files import "db" from here to run queries.
//  When you move to PostgreSQL later, only this file changes.
// ─────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const path     = require('path');

// The database will be saved as "shop.db" inside the database/ folder.
// If the file doesn't exist, better-sqlite3 creates it automatically.
const DB_PATH = path.join(__dirname, 'shop.db');

const db = new Database(DB_PATH);

// Speed up writes — SQLite is safe in WAL mode and much faster
db.pragma('journal_mode = WAL');

// Enforce foreign-key rules (e.g. can't add a variant for a product that doesn't exist)
db.pragma('foreign_keys = ON');

// ── CREATE TABLES ─────────────────────────────────────────
// "IF NOT EXISTS" means this is safe to run every time the server starts.
// If the tables already exist, it does nothing.

db.exec(`

  -- TABLE: products
  -- Stores the main info about each product
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL,       -- Sarees, Kurtis, Shirts, etc.
    fabric      TEXT,
    price       INTEGER NOT NULL,       -- selling price in rupees (no paise)
    mrp         INTEGER,               -- original / maximum retail price
    description TEXT,
    featured    INTEGER DEFAULT 0,     -- 1 = show as featured, 0 = normal
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  -- TABLE: product_images
  -- A product can have multiple photos.
  -- sort_order controls which photo appears first (0 = main photo).
  CREATE TABLE IF NOT EXISTS product_images (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL,
    url         TEXT    NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  -- TABLE: variants
  -- Each combination of colour + size is one row.
  -- sku must be unique across the whole shop (used for VasyERP sync later).
  -- stock is how many units are currently available.
  CREATE TABLE IF NOT EXISTS variants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL,
    colour      TEXT    NOT NULL,
    size        TEXT    NOT NULL,      -- "Free Size", "S", "M", "L", "XL", "XXL", "30"–"38"
    sku         TEXT    NOT NULL UNIQUE,
    stock       INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  -- TABLE: orders
  -- One row per customer order.
  -- order_number is the human-readable reference shown to customers (e.g. SMS-20250603-0001).
  -- status moves through: pending → confirmed → shipped → delivered (or cancelled).
  -- payment_method is "COD" now; will add "Razorpay" in Stage 5.
  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number     TEXT    NOT NULL UNIQUE,
    customer_name    TEXT    NOT NULL,
    customer_phone   TEXT    NOT NULL,
    customer_email   TEXT,
    address_line1    TEXT    NOT NULL,
    address_line2    TEXT,
    city             TEXT    NOT NULL,
    state            TEXT    NOT NULL,
    pincode          TEXT    NOT NULL,
    subtotal         INTEGER NOT NULL,
    shipping_fee     INTEGER NOT NULL DEFAULT 0,
    total            INTEGER NOT NULL,
    payment_method   TEXT    NOT NULL DEFAULT 'COD',
    payment_status   TEXT    NOT NULL DEFAULT 'pending',  -- pending | paid
    status           TEXT    NOT NULL DEFAULT 'pending',  -- pending | confirmed | shipped | delivered | cancelled
    notes            TEXT,
    created_at       TEXT    DEFAULT (datetime('now'))
  );

  -- TABLE: order_items
  -- One row per product line in an order.
  -- We snapshot the name, colour, size, sku, and price at time of purchase
  -- so that if you later edit a product, old orders still show correct info.
  CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL,
    product_id   INTEGER,
    variant_id   INTEGER,
    product_name TEXT    NOT NULL,
    colour       TEXT    NOT NULL,
    size         TEXT    NOT NULL,
    sku          TEXT    NOT NULL,
    price        INTEGER NOT NULL,
    qty          INTEGER NOT NULL,
    line_total   INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

`);

// Export the db object so other files can use it
module.exports = db;
