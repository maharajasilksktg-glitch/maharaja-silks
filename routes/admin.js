// ─────────────────────────────────────────────────────────
//  routes/admin.js  –  Shree Maharaja Silks  –  Stage 3
//
//  All API endpoints used by the admin page.
//  These URLs all start with /api/admin/...
//
//  Endpoints:
//    GET    /api/admin/products              → list all products
//    POST   /api/admin/products              → create a new product
//    GET    /api/admin/products/:id          → get one product (for editing)
//    PUT    /api/admin/products/:id          → update a product's details
//    DELETE /api/admin/products/:id          → delete a product
//    POST   /api/admin/products/:id/images   → upload photo(s)
//    DELETE /api/admin/images/:imageId       → delete one photo
//    PUT    /api/admin/products/:id/variants → replace all variants for a product
// ─────────────────────────────────────────────────────────

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const db      = require('../database/db');

// ── MULTER SETUP ──────────────────────────────────────────
// Multer handles file uploads. We tell it:
//   WHERE  to save files  (public/uploads/)
//   WHAT   to name them   (timestamp + original filename to avoid collisions)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: function (req, file, cb) {
    // e.g.  1704067200000-my-saree.jpg
    const unique = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, unique);
  },
});

// Only allow image files for safety
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ok = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB per image
});

// ── SKU GENERATOR ─────────────────────────────────────────
function makeSku(category, productId, colour, size) {
  const cat = category.slice(0, 3).toUpperCase();
  const pid = String(productId).padStart(3, '0');
  const col = colour.replace(/[\s&]/g, '').slice(0, 4).toUpperCase();
  const sz  = String(size).replace(/\s+/g, '').toUpperCase();
  return `SMS-${cat}-${pid}-${col}-${sz}`;
}

// ── GET /api/admin/products ───────────────────────────────
// Returns all products with their main image URL and variant count.
// Used to populate the products table on the admin page.
router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT
        p.*,
        pi.url        AS image,
        COUNT(v.id)   AS variant_count,
        SUM(v.stock)  AS total_stock
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.sort_order = 0
      LEFT JOIN variants v        ON v.product_id  = p.id
      GROUP BY p.id
      ORDER BY p.id DESC
    `).all();

    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/admin/products ──────────────────────────────
// Creates a new product (no images or variants yet).
// The frontend will upload images and variants in separate calls right after.
router.post('/products', (req, res) => {
  try {
    const { name, category, fabric, price, mrp, description, featured } = req.body;

    // Basic validation — these fields are required
    if (!name || !category || !price) {
      return res.status(400).json({ success: false, error: 'name, category and price are required' });
    }

    const result = db.prepare(`
      INSERT INTO products (name, category, fabric, price, mrp, description, featured)
      VALUES (@name, @category, @fabric, @price, @mrp, @description, @featured)
    `).run({ name, category, fabric: fabric || '', price: Number(price),
              mrp: mrp ? Number(mrp) : null, description: description || '',
              featured: featured ? 1 : 0 });

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/admin/products/:id ───────────────────────────
// Returns one product with all its images and variants.
// Used to pre-fill the edit form.
router.get('/products/:id', (req, res) => {
  try {
    const id      = Number(req.params.id);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const images   = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(id);
    const variants = db.prepare('SELECT * FROM variants WHERE product_id = ? ORDER BY colour, size').all(id);

    res.json({ success: true, product: { ...product, images, variants } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/admin/products/:id ───────────────────────────
// Updates a product's basic details (name, price, etc.)
router.put('/products/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, category, fabric, price, mrp, description, featured } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ success: false, error: 'name, category and price are required' });
    }

    db.prepare(`
      UPDATE products SET
        name = @name, category = @category, fabric = @fabric,
        price = @price, mrp = @mrp, description = @description, featured = @featured
      WHERE id = @id
    `).run({ id, name, category, fabric: fabric || '', price: Number(price),
              mrp: mrp ? Number(mrp) : null, description: description || '',
              featured: featured ? 1 : 0 });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/admin/products/:id ────────────────────────
// Permanently deletes a product AND all its images and variants
// (the "ON DELETE CASCADE" in our schema handles variants and images automatically)
router.delete('/products/:id', (req, res) => {
  try {
    const id = Number(req.params.id);

    // Also delete the physical image files from disk
    const images = db.prepare('SELECT url FROM product_images WHERE product_id = ?').all(id);
    for (const img of images) {
      // img.url looks like "/uploads/filename.jpg"
      const filePath = path.join(__dirname, '..', 'public', img.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/admin/products/:id/images ───────────────────
// Uploads one or more photos for a product.
// The files land in public/uploads/ and their paths are saved to product_images.
router.post('/products/:id/images', upload.array('images', 10), (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    // Find the current highest sort_order so new images go at the end
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?'
    ).get(productId).m;

    const insert = db.prepare(
      'INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, ?)'
    );

    const savedImages = [];
    req.files.forEach((file, i) => {
      const url = '/uploads/' + file.filename;
      insert.run(productId, url, maxOrder + 1 + i);
      savedImages.push({ url, sort_order: maxOrder + 1 + i });
    });

    res.json({ success: true, images: savedImages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/admin/images/:imageId ─────────────────────
// Deletes one photo (from the database AND from disk).
router.delete('/images/:imageId', (req, res) => {
  try {
    const imageId = Number(req.params.imageId);
    const row     = db.prepare('SELECT url FROM product_images WHERE id = ?').get(imageId);
    if (!row) return res.status(404).json({ success: false, error: 'Image not found' });

    // Delete physical file
    const filePath = path.join(__dirname, '..', 'public', row.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/admin/products/:id/variants ──────────────────
// Replaces ALL variants for a product with the submitted list.
// The admin sends an array of { colour, size, stock } objects.
// This keeps things simple — just re-create the whole variant set.
router.put('/products/:id/variants', (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product   = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const { variants } = req.body; // array of { colour, size, stock }
    if (!Array.isArray(variants)) {
      return res.status(400).json({ success: false, error: 'variants must be an array' });
    }

    // Do everything in a transaction so it's all-or-nothing
    const replaceVariants = db.transaction(() => {
      // Delete all existing variants for this product
      db.prepare('DELETE FROM variants WHERE product_id = ?').run(productId);

      // Re-insert the new set
      const insert = db.prepare(`
        INSERT INTO variants (product_id, colour, size, sku, stock)
        VALUES (@product_id, @colour, @size, @sku, @stock)
      `);

      for (const v of variants) {
        const sku = makeSku(product.category, productId, v.colour, v.size);
        insert.run({
          product_id: productId,
          colour:     v.colour,
          size:       v.size,
          sku,
          stock:      Number(v.stock) || 0,
        });
      }
    });

    replaceVariants();

    // Return the saved variants (with their new IDs and SKUs)
    const saved = db.prepare('SELECT * FROM variants WHERE product_id = ?').all(productId);
    res.json({ success: true, variants: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/admin/orders ─────────────────────────────────
// Returns all orders, newest first.
router.get('/orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
      FROM orders o
      ORDER BY o.id DESC
    `).all();
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/admin/orders/:id ─────────────────────────────
// Returns one order with its items.
router.get('/orders/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ success: true, order: { ...order, items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/admin/orders/:id/status ──────────────────────
// Updates order status. Body: { status: "confirmed" }
router.put('/orders/:id/status', (req, res) => {
  try {
    const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const { status } = req.body;
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
