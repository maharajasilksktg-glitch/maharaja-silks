// ─────────────────────────────────────────────────────────
//  routes/products.js  –  Shree Maharaja Silks  –  Stage 2
//
//  This file defines API "endpoints" — URLs that the
//  browser (or admin page) can call to get product data.
//
//  Endpoints:
//    GET  /api/products          → list all products (with filters)
//    GET  /api/products/:id      → one product with its variants
//    GET  /api/categories        → list of unique categories
// ─────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// ── GET /api/products ─────────────────────────────────────
// Returns a list of products.
// Optional query parameters (add ?key=value to the URL):
//   ?category=Sarees    → only sarees
//   ?search=silk        → products whose name/fabric/category contains "silk"
//   ?sort=price-low     → sort by price ascending
//   ?sort=price-high    → sort by price descending
//   ?sort=featured      → featured products first (default)
router.get('/', (req, res) => {
  try {
    const { category, search, sort } = req.query;

    // Build the SQL query dynamically based on which filters were given
    let sql    = `SELECT p.*, pi.url AS image FROM products p
                  LEFT JOIN product_images pi
                    ON pi.product_id = p.id AND pi.sort_order = 0`;
    const params = [];
    const where  = [];

    if (category && category !== 'All') {
      where.push('p.category = ?');
      params.push(category);
    }

    if (search) {
      // Search across name, category, and fabric columns
      where.push('(p.name LIKE ? OR p.category LIKE ? OR p.fabric LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }

    // Sorting
    if (sort === 'price-low')  sql += ' ORDER BY p.price ASC';
    else if (sort === 'price-high') sql += ' ORDER BY p.price DESC';
    else sql += ' ORDER BY p.featured DESC, p.id ASC'; // featured first by default

    const products = db.prepare(sql).all(...params);

    res.json({ success: true, products });
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch products' });
  }
});

// ── GET /api/products/:id ─────────────────────────────────
// Returns ONE product with all its images and variants.
// Example: GET /api/products/3
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);

    // Fetch the product row
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fetch all images for this product
    const images = db.prepare(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order'
    ).all(id);

    // Fetch all variants for this product
    const variants = db.prepare(
      'SELECT * FROM variants WHERE product_id = ? ORDER BY colour, size'
    ).all(id);

    res.json({ success: true, product: { ...product, images, variants } });
  } catch (err) {
    console.error('GET /api/products/:id error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch product' });
  }
});

// ── GET /api/categories ───────────────────────────────────
// Returns the unique list of categories that exist in the DB.
// The frontend uses this to build the category tabs.
router.get('/meta/categories', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT DISTINCT category FROM products ORDER BY category'
    ).all();
    const categories = rows.map(r => r.category);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch categories' });
  }
});

module.exports = router;
