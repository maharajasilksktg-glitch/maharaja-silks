// ─────────────────────────────────────────────────────────
//  routes/orders.js  –  Shree Maharaja Silks  –  Stage 4
//
//  Endpoints:
//    POST /api/orders          → place a new order
//    GET  /api/orders/:id      → get one order (for confirmation page)
//    GET  /api/admin/orders    → list all orders (admin)
//    PUT  /api/admin/orders/:id/status → update order status (admin)
// ─────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE            = 49;  // ₹49 if below threshold

// ── GENERATE ORDER NUMBER ──────────────────────────────────
// Format:  SMS-YYYYMMDD-NNNN  (e.g. SMS-20250603-0001)
// NNNN is the count of orders placed today + 1
function generateOrderNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // "20250603"
  const count = db.prepare(
    "SELECT COUNT(*) AS n FROM orders WHERE order_number LIKE 'SMS-' || ? || '-%'"
  ).get(today).n;
  const seq   = String(count + 1).padStart(4, '0');
  return `SMS-${today}-${seq}`;
}

// ── POST /api/orders ──────────────────────────────────────
// Places a new Cash on Delivery order.
// Request body:
//   {
//     customer: { name, phone, email, address_line1, address_line2, city, state, pincode },
//     items: [ { productId, variantId, sku, productName, colour, size, price, qty } ],
//     notes: "optional delivery note"
//   }
router.post('/', (req, res) => {
  try {
    const { customer, items, notes } = req.body;

    // ── Validate input ──
    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'customer and items are required' });
    }
    const required = ['name', 'phone', 'address_line1', 'city', 'state', 'pincode'];
    for (const field of required) {
      if (!customer[field] || !customer[field].toString().trim()) {
        return res.status(400).json({ success: false, error: `Customer ${field} is required` });
      }
    }

    // ── Place the order in a transaction ──
    // A transaction means: either EVERYTHING succeeds, or NOTHING is saved.
    // This prevents partially-created orders or stock going negative.
    const placeOrder = db.transaction(() => {

      // 1. Check stock for every item and deduct it
      for (const item of items) {
        const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(item.variantId);

        if (!variant) {
          throw new Error(`Variant not found for SKU ${item.sku}`);
        }
        if (variant.stock < item.qty) {
          throw new Error(
            `Sorry, only ${variant.stock} unit(s) of "${item.productName}" (${item.colour}, ${item.size}) left in stock.`
          );
        }

        // Deduct the stock
        db.prepare('UPDATE variants SET stock = stock - ? WHERE id = ?')
          .run(item.qty, item.variantId);
      }

      // 2. Calculate totals
      const subtotal    = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
      const total       = subtotal + shippingFee;

      // 3. Create the order row
      const orderNumber = generateOrderNumber();
      const orderResult = db.prepare(`
        INSERT INTO orders
          (order_number, customer_name, customer_phone, customer_email,
           address_line1, address_line2, city, state, pincode,
           subtotal, shipping_fee, total, payment_method, notes)
        VALUES
          (@order_number, @customer_name, @customer_phone, @customer_email,
           @address_line1, @address_line2, @city, @state, @pincode,
           @subtotal, @shipping_fee, @total, 'COD', @notes)
      `).run({
        order_number:  orderNumber,
        customer_name:  customer.name.trim(),
        customer_phone: customer.phone.trim(),
        customer_email: customer.email?.trim() || null,
        address_line1:  customer.address_line1.trim(),
        address_line2:  customer.address_line2?.trim() || null,
        city:           customer.city.trim(),
        state:          customer.state.trim(),
        pincode:        customer.pincode.trim(),
        subtotal,
        shipping_fee: shippingFee,
        total,
        notes: notes?.trim() || null,
      });

      const orderId = orderResult.lastInsertRowid;

      // 4. Insert each order item
      const insertItem = db.prepare(`
        INSERT INTO order_items
          (order_id, product_id, variant_id, product_name, colour, size, sku, price, qty, line_total)
        VALUES
          (@order_id, @product_id, @variant_id, @product_name, @colour, @size, @sku, @price, @qty, @line_total)
      `);

      for (const item of items) {
        insertItem.run({
          order_id:     orderId,
          product_id:   item.productId  || null,
          variant_id:   item.variantId  || null,
          product_name: item.productName,
          colour:       item.colour,
          size:         item.size,
          sku:          item.sku,
          price:        item.price,
          qty:          item.qty,
          line_total:   item.price * item.qty,
        });
      }

      return { orderId, orderNumber, subtotal, shippingFee, total };
    });

    const result = placeOrder();
    res.json({ success: true, ...result });

  } catch (err) {
    console.error('POST /api/orders error:', err);
    // Send the human-readable error message to the browser
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── GET /api/orders/:id ────────────────────────────────────
// Returns a single order with its items.
// Used by the order confirmation page.
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ success: true, order: { ...order, items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
