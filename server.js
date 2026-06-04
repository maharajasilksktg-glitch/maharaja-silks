// ─────────────────────────────────────────────────────────
//  server.js  –  Shree Maharaja Silks  –  Stage 3
// ─────────────────────────────────────────────────────────

const express = require('express');
const path    = require('path');

require('./database/db'); // opens DB and creates tables

const productRoutes = require('./routes/products');
const adminRoutes   = require('./routes/admin');
const orderRoutes   = require('./routes/orders');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Public shop API
app.use('/api/products', productRoutes);

// Admin API
app.use('/api/admin', adminRoutes);

// Orders API
app.use('/api/orders', orderRoutes);

// Serve the admin page at /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅  Shop:  http://localhost:${PORT}`);
  console.log(`🛠️   Admin: http://localhost:${PORT}/admin`);
});
