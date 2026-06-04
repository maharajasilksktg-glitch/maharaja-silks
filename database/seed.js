// ─────────────────────────────────────────────────────────
//  database/seed.js  –  Shree Maharaja Silks  –  Stage 2
//
//  Run this ONCE to fill the database with sample products.
//  Command:  node database/seed.js
//
//  It is SAFE to run again — it checks if data already exists
//  before inserting, so you won't get duplicates.
// ─────────────────────────────────────────────────────────

const db = require('./db');

// ── HELPER: build a SKU from parts ────────────────────────
// Format: SMS-{CAT}-{PRODUCT_ID}-{COLOUR_CODE}-{SIZE_CODE}
// Example: SMS-SAR-001-RED-FS  (Saree #1, Red, Free Size)
function makeSku(category, productId, colour, size) {
  // Take first 3 letters of category, uppercase
  const cat  = category.slice(0, 3).toUpperCase();
  // Zero-pad product id to 3 digits
  const pid  = String(productId).padStart(3, '0');
  // Take first 4 letters of colour, uppercase, remove spaces
  const col  = colour.replace(/\s+/g, '').slice(0, 4).toUpperCase();
  // Size: remove spaces
  const sz   = String(size).replace(/\s+/g, '').toUpperCase();
  return `SMS-${cat}-${pid}-${col}-${sz}`;
}

// ── SAMPLE PRODUCTS ────────────────────────────────────────
// Same 12 products that were in main.js, now going into the DB
const PRODUCTS = [
  {
    name: 'Kanjivaram Silk Saree',
    category: 'Sarees',
    fabric: 'Pure Silk',
    price: 4500,
    mrp: 5500,
    description: 'Handwoven Kanjivaram silk with traditional zari border. Perfect for weddings and festivals.',
    featured: 1,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Kanjivaram+Saree',
    colours: ['Red', 'Royal Blue', 'Forest Green'],
    sizes: ['Free Size'],
    variants: { 'Red|Free Size': 8, 'Royal Blue|Free Size': 5, 'Forest Green|Free Size': 3 },
  },
  {
    name: 'Chiffon Printed Saree',
    category: 'Sarees',
    fabric: 'Chiffon',
    price: 1299,
    mrp: 1799,
    description: 'Light and breezy chiffon saree with floral prints. Ideal for casual and office wear.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Chiffon+Saree',
    colours: ['Pink', 'Sky Blue', 'Yellow'],
    sizes: ['Free Size'],
    variants: { 'Pink|Free Size': 12, 'Sky Blue|Free Size': 9, 'Yellow|Free Size': 6 },
  },
  {
    name: 'Cotton Anarkali Kurti',
    category: 'Kurtis',
    fabric: '100% Cotton',
    price: 799,
    mrp: 1099,
    description: 'Comfortable Anarkali-style kurti in breathable cotton. Great for daily wear.',
    featured: 1,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Anarkali+Kurti',
    colours: ['Mustard', 'Teal', 'White'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    variants: {
      'Mustard|S': 4, 'Mustard|M': 7, 'Mustard|L': 5, 'Mustard|XL': 3, 'Mustard|XXL': 1,
      'Teal|S': 6,    'Teal|M': 8,    'Teal|L': 6,    'Teal|XL': 2,    'Teal|XXL': 0,
      'White|S': 5,   'White|M': 5,   'White|L': 4,   'White|XL': 3,   'White|XXL': 2,
    },
  },
  {
    name: 'Straight Fit Formal Shirt',
    category: 'Shirts',
    fabric: 'Cotton Blend',
    price: 599,
    mrp: 899,
    description: 'Crisp formal shirt, perfect for office and special occasions.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Formal+Shirt',
    colours: ['White', 'Light Blue', 'Beige'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    variants: {
      'White|S': 10, 'White|M': 12, 'White|L': 8,  'White|XL': 5,      'White|XXL': 3,
      'Light Blue|S': 7, 'Light Blue|M': 9, 'Light Blue|L': 6, 'Light Blue|XL': 4, 'Light Blue|XXL': 2,
      'Beige|S': 5,  'Beige|M': 6,  'Beige|L': 4,  'Beige|XL': 2,      'Beige|XXL': 1,
    },
  },
  {
    name: 'Slim Fit Trousers',
    category: 'Pants',
    fabric: 'Poly-Viscose',
    price: 699,
    mrp: 999,
    description: 'Smart slim-fit trousers with a comfortable stretch. Suitable for work and casual outings.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Slim+Trousers',
    colours: ['Black', 'Navy', 'Dark Grey'],
    sizes: ['30', '32', '34', '36', '38'],
    variants: {
      'Black|30': 5, 'Black|32': 8, 'Black|34': 7, 'Black|36': 4, 'Black|38': 2,
      'Navy|30': 4,  'Navy|32': 6,  'Navy|34': 5,  'Navy|36': 3,  'Navy|38': 1,
      'Dark Grey|30': 3, 'Dark Grey|32': 5, 'Dark Grey|34': 4, 'Dark Grey|36': 2, 'Dark Grey|38': 0,
    },
  },
  {
    name: 'Woollen V-Neck Sweater',
    category: 'Sweaters',
    fabric: 'Merino Wool Blend',
    price: 1299,
    mrp: 1799,
    description: 'Soft and warm V-neck sweater. A winter wardrobe essential.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=V-Neck+Sweater',
    colours: ['Maroon', 'Camel', 'Charcoal'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    variants: {
      'Maroon|S': 4, 'Maroon|M': 6, 'Maroon|L': 5, 'Maroon|XL': 3, 'Maroon|XXL': 1,
      'Camel|S': 3,  'Camel|M': 5,  'Camel|L': 4,  'Camel|XL': 2,  'Camel|XXL': 1,
      'Charcoal|S': 5, 'Charcoal|M': 7, 'Charcoal|L': 6, 'Charcoal|XL': 4, 'Charcoal|XXL': 2,
    },
  },
  {
    name: 'Bridal Lehenga Choli',
    category: 'Lehengas',
    fabric: 'Heavy Net with Embroidery',
    price: 8999,
    mrp: 12000,
    description: 'Stunning bridal lehenga with heavy embroidery and flare. The centrepiece of your special day.',
    featured: 1,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Bridal+Lehenga',
    colours: ['Red & Gold', 'Pink & Silver', 'Purple & Gold'],
    sizes: ['Free Size'],
    variants: {
      'Red & Gold|Free Size': 3, 'Pink & Silver|Free Size': 4, 'Purple & Gold|Free Size': 2,
    },
  },
  {
    name: 'Printed Salwar Suit',
    category: 'Suits',
    fabric: 'Georgette',
    price: 1499,
    mrp: 1999,
    description: 'Elegant printed georgette salwar suit with dupatta. Perfect for parties and festivals.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Salwar+Suit',
    colours: ['Peach', 'Lavender', 'Mint Green'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    variants: {
      'Peach|S': 5, 'Peach|M': 7, 'Peach|L': 6, 'Peach|XL': 3, 'Peach|XXL': 2,
      'Lavender|S': 4, 'Lavender|M': 6, 'Lavender|L': 5, 'Lavender|XL': 2, 'Lavender|XXL': 1,
      'Mint Green|S': 3, 'Mint Green|M': 5, 'Mint Green|L': 4, 'Mint Green|XL': 2, 'Mint Green|XXL': 0,
    },
  },
  {
    name: 'Silk Cotton Saree',
    category: 'Sarees',
    fabric: 'Silk Cotton',
    price: 2200,
    mrp: 2800,
    description: 'Lightweight silk-cotton blend saree with woven border. Easy drape for daily wear.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Silk+Cotton+Saree',
    colours: ['Magenta', 'Orange', 'Dark Blue'],
    sizes: ['Free Size'],
    variants: { 'Magenta|Free Size': 7, 'Orange|Free Size': 5, 'Dark Blue|Free Size': 6 },
  },
  {
    name: 'Linen Casual Shirt',
    category: 'Shirts',
    fabric: 'Pure Linen',
    price: 849,
    mrp: 1200,
    description: 'Breathable linen shirt — cool, relaxed fit for summer days.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Linen+Shirt',
    colours: ['Olive', 'Off White', 'Sky Blue'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    variants: {
      'Olive|S': 3,     'Olive|M': 5,     'Olive|L': 4,     'Olive|XL': 3,     'Olive|XXL': 1,
      'Off White|S': 4, 'Off White|M': 6, 'Off White|L': 5, 'Off White|XL': 3, 'Off White|XXL': 2,
      'Sky Blue|S': 5,  'Sky Blue|M': 7,  'Sky Blue|L': 6,  'Sky Blue|XL': 4,  'Sky Blue|XXL': 2,
    },
  },
  {
    name: 'Track Jogger Pants',
    category: 'Pants',
    fabric: 'Cotton Fleece',
    price: 549,
    mrp: 799,
    description: 'Comfortable jogger pants with elastic waist. Great for home and gym.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=Jogger+Pants',
    colours: ['Black', 'Grey', 'Navy'],
    sizes: ['30', '32', '34', '36', '38'],
    variants: {
      'Black|30': 8, 'Black|32': 10, 'Black|34': 8, 'Black|36': 5, 'Black|38': 3,
      'Grey|30': 6,  'Grey|32': 8,   'Grey|34': 7,  'Grey|36': 4,  'Grey|38': 2,
      'Navy|30': 5,  'Navy|32': 7,   'Navy|34': 6,  'Navy|36': 3,  'Navy|38': 1,
    },
  },
  {
    name: 'A-Line Kurti Set',
    category: 'Kurtis',
    fabric: 'Rayon',
    price: 999,
    mrp: 1399,
    description: 'Flowy A-line kurti with printed palazzo. A stylish everyday combo.',
    featured: 0,
    image: 'https://placehold.co/480x640/F5EEE4/7B1C2E?text=A-Line+Kurti',
    colours: ['Coral', 'Indigo', 'Sage Green'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    variants: {
      'Coral|S': 5,     'Coral|M': 8,     'Coral|L': 6,     'Coral|XL': 4,     'Coral|XXL': 2,
      'Indigo|S': 4,    'Indigo|M': 7,    'Indigo|L': 5,    'Indigo|XL': 3,    'Indigo|XXL': 1,
      'Sage Green|S': 3,'Sage Green|M': 6,'Sage Green|L': 4,'Sage Green|XL': 2,'Sage Green|XXL': 0,
    },
  },
];

// ── INSERT PRODUCTS ────────────────────────────────────────
// We use a "transaction" so that if anything goes wrong,
// NONE of the data is saved (all-or-nothing).

const insertAll = db.transaction(() => {

  // Check if products table already has data
  const count = db.prepare('SELECT COUNT(*) as n FROM products').get().n;
  if (count > 0) {
    console.log(`ℹ️  Database already has ${count} products. Skipping seed.`);
    console.log('   To re-seed, delete database/shop.db and run again.');
    return;
  }

  // Prepared statements — SQLite compiles the query once, runs it many times
  const insertProduct = db.prepare(`
    INSERT INTO products (name, category, fabric, price, mrp, description, featured)
    VALUES (@name, @category, @fabric, @price, @mrp, @description, @featured)
  `);

  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, url, sort_order)
    VALUES (@product_id, @url, @sort_order)
  `);

  const insertVariant = db.prepare(`
    INSERT INTO variants (product_id, colour, size, sku, stock)
    VALUES (@product_id, @colour, @size, @sku, @stock)
  `);

  for (const p of PRODUCTS) {
    // Insert the product row
    const result = insertProduct.run({
      name:        p.name,
      category:    p.category,
      fabric:      p.fabric,
      price:       p.price,
      mrp:         p.mrp,
      description: p.description,
      featured:    p.featured,
    });

    const productId = result.lastInsertRowid; // the new auto-generated ID

    // Insert main image
    insertImage.run({ product_id: productId, url: p.image, sort_order: 0 });

    // Insert each variant (colour + size combination)
    for (const [key, stock] of Object.entries(p.variants)) {
      const [colour, size] = key.split('|');
      const sku = makeSku(p.category, productId, colour, size);
      insertVariant.run({ product_id: productId, colour, size, sku, stock });
    }

    console.log(`  ✅ Inserted: ${p.name} (id=${productId})`);
  }

  console.log('\n🎉 Seed complete! Database is ready.');
});

insertAll();
