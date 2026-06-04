/* ═══════════════════════════════════════════════════════════
   Shree Maharaja Silks  –  main.js  –  Stage 4
   Products now come from the database via /api/products.
   Cart is persisted in localStorage so it survives page refresh.
   "Proceed to Checkout" navigates to /checkout.
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────
   COLOUR HEX MAP  –  used for the colour swatches in modal
   ───────────────────────────────────────────────────────── */
const COLOUR_HEX = {
  'Red': '#C0392B', 'Royal Blue': '#2471A3', 'Forest Green': '#1E8449',
  'Pink': '#E91E8C', 'Sky Blue': '#5DADE2', 'Yellow': '#F1C40F',
  'Mustard': '#D4AC0D', 'Teal': '#148F77', 'White': '#F0EBE3',
  'Light Blue': '#AED6F1', 'Beige': '#D5C5A1', 'Black': '#2C2C2C',
  'Navy': '#1B3A6B', 'Dark Grey': '#5D6D7E', 'Maroon': '#7B1C2E',
  'Camel': '#C19A6B', 'Charcoal': '#424949', 'Red & Gold': '#B03030',
  'Pink & Silver': '#E75480', 'Purple & Gold': '#6C3483', 'Peach': '#FFCBA4',
  'Lavender': '#D7BDE2', 'Mint Green': '#A9DFBF', 'Magenta': '#C0185D',
  'Orange': '#E67E22', 'Dark Blue': '#1A2980', 'Olive': '#808000',
  'Off White': '#F5F0E8', 'Coral': '#FF6B6B', 'Indigo': '#3F4C8A',
  'Sage Green': '#8FAF80', 'Grey': '#7F8C8D',
};

/* ─────────────────────────────────────────────────────────
   STATE  –  everything the page currently "remembers"
   ───────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────
   LOCALSTORAGE HELPERS
   The cart is saved under the key "sms_cart" so it
   survives a page refresh and is readable by checkout.js.
   ───────────────────────────────────────────────────────── */
function loadCartFromStorage() {
  try { return JSON.parse(localStorage.getItem('sms_cart') || '[]'); } catch { return []; }
}
function saveCartToStorage(cart) {
  localStorage.setItem('sms_cart', JSON.stringify(cart));
}

let state = {
  products:        [],     // loaded from API
  activeCategory:  'All',
  searchQuery:     '',
  sortBy:          'featured',
  cart:            loadCartFromStorage(),  // restored from localStorage
  wishlist:        [],
  quickViewProduct: null,
  selectedColour:   null,
  selectedSize:     null,
};

/* ─────────────────────────────────────────────────────────
   FORMAT PRICE  →  1299  becomes  "₹1,299"
   ───────────────────────────────────────────────────────── */
function formatPrice(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function discountPercent(price, mrp) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/* ─────────────────────────────────────────────────────────
   FETCH PRODUCTS FROM THE API
   Builds the URL with query parameters based on current state,
   then calls the server and updates the grid.
   ───────────────────────────────────────────────────────── */
async function fetchAndRender() {
  showLoading(true);

  // Build URL: e.g. /api/products?category=Sarees&search=silk&sort=price-low
  const params = new URLSearchParams();
  if (state.activeCategory !== 'All') params.set('category', state.activeCategory);
  if (state.searchQuery.trim())        params.set('search',   state.searchQuery.trim());
  if (state.sortBy !== 'featured')     params.set('sort',     state.sortBy);

  try {
    const res  = await fetch(`/api/products?${params}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.error);

    state.products = data.products;
    renderGrid();
  } catch (err) {
    console.error('Failed to fetch products:', err);
    document.getElementById('productGrid').innerHTML =
      '<p style="color:#7B1C2E;text-align:center;padding:40px">Could not load products. Is the server running?</p>';
  } finally {
    showLoading(false);
  }
}

/* ─────────────────────────────────────────────────────────
   FETCH ONE PRODUCT (for quick view — gets full variant data)
   ───────────────────────────────────────────────────────── */
async function fetchProduct(id) {
  const res  = await fetch(`/api/products/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.product;
}

/* ─────────────────────────────────────────────────────────
   LOADING SPINNER  –  shows while fetching from server
   ───────────────────────────────────────────────────────── */
function showLoading(on) {
  const grid = document.getElementById('productGrid');
  if (on) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:#C5973A">
        <div style="font-size:32px;margin-bottom:8px">⟳</div>
        <p>Loading products…</p>
      </div>`;
  }
}

/* ─────────────────────────────────────────────────────────
   BUILD A PRODUCT CARD (returns HTML string)
   ───────────────────────────────────────────────────────── */
function buildProductCard(product) {
  const disc       = discountPercent(product.price, product.mrp);
  const inWishlist = state.wishlist.includes(product.id);
  const img        = product.image || `https://placehold.co/480x600/fdf0f5/8B1A4A?text=${encodeURIComponent(product.name)}`;

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-img-wrap">
        <img src="${img}" alt="${product.name}" class="product-img" loading="lazy" />
        ${disc > 0 ? `<span class="product-badge">${disc}% off</span>` : ''}
        <div class="product-actions">
          <button class="action-btn" data-action="wishlist" data-id="${product.id}">
            ${inWishlist ? '&#9829; Saved' : '&#9825; Wishlist'}
          </button>
          <button class="action-btn" data-action="quickview" data-id="${product.id}">
            Quick View
          </button>
        </div>
      </div>
      <div class="product-info">
        <p class="product-category">${product.category}</p>
        <p class="product-name">${product.name}</p>
        <div class="product-price">
          <span class="price-now">${formatPrice(product.price)}</span>
          ${product.mrp > product.price ? `<span class="price-old">${formatPrice(product.mrp)}</span>` : ''}
          ${disc > 0 ? `<span class="price-discount">${disc}% off</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────
   RENDER GRID
   ───────────────────────────────────────────────────────── */
function renderGrid() {
  const grid      = document.getElementById('productGrid');
  const noResults = document.getElementById('noResults');
  const countEl   = document.getElementById('resultsCount');

  if (state.products.length === 0) {
    grid.innerHTML = '';
    noResults.classList.remove('hidden');
  } else {
    noResults.classList.add('hidden');
    grid.innerHTML = state.products.map(buildProductCard).join('');
  }
  countEl.textContent = `${state.products.length} product${state.products.length !== 1 ? 's' : ''}`;
}

/* ─────────────────────────────────────────────────────────
   QUICK VIEW MODAL
   ───────────────────────────────────────────────────────── */
async function openQuickView(productId) {
  try {
    // Fetch full product details (includes variants array) from the API
    const product = await fetchProduct(productId);

    // Build a lookup map: "colour|size" → stock
    // (The API gives us an array of variants; we convert it to a map for easy lookup)
    // variantMap stores stock AND the variant id + sku (needed for checkout)
    product.variantMap  = {};  // "colour|size" → stock count
    product.variantMeta = {};  // "colour|size" → { id, sku }
    const colours = new Set();
    const sizes   = new Set();
    for (const v of product.variants) {
      product.variantMap[`${v.colour}|${v.size}`]  = v.stock;
      product.variantMeta[`${v.colour}|${v.size}`] = { id: v.id, sku: v.sku };
      colours.add(v.colour);
      sizes.add(v.size);
    }
    product.colours = [...colours];
    product.sizes   = [...sizes];

    state.quickViewProduct = product;
    state.selectedColour   = product.colours[0];
    state.selectedSize     = product.sizes[0];

    // Fill in the modal fields
    const img = (product.images && product.images[0]) ? product.images[0].url
      : `https://placehold.co/480x640/F5EEE4/7B1C2E?text=${encodeURIComponent(product.name)}`;

    document.getElementById('modalImage').src              = img;
    document.getElementById('modalImage').alt              = product.name;
    document.getElementById('modalCategory').textContent   = product.category;
    document.getElementById('modalName').textContent       = product.name;
    document.getElementById('modalPrice').textContent      = formatPrice(product.price);
    document.getElementById('modalFabric').textContent     = `Fabric: ${product.fabric || ''}`;
    document.getElementById('modalDesc').textContent       = product.description || '';

    const disc   = discountPercent(product.price, product.mrp);
    const mrpEl  = document.getElementById('modalMrp');
    const discEl = document.getElementById('modalDiscount');
    if (disc > 0) {
      mrpEl.textContent  = formatPrice(product.mrp);
      discEl.textContent = `${disc}% off`;
      mrpEl.style.display  = '';
      discEl.style.display = '';
    } else {
      mrpEl.style.display  = 'none';
      discEl.style.display = 'none';
    }

    // Colour swatches
    document.getElementById('colourSwatches').innerHTML = product.colours.map(c => `
      <button class="swatch ${c === state.selectedColour ? 'selected' : ''}"
        style="background:${COLOUR_HEX[c] || '#ccc'}"
        data-colour="${c}" title="${c}">
      </button>
    `).join('');

    renderSizeButtons();
    updateStockInfo();

    document.getElementById('quickViewOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

  } catch (err) {
    console.error('Failed to open quick view:', err);
  }
}

/* Helper: re-draws the size buttons whenever colour changes */
function renderSizeButtons() {
  const product = state.quickViewProduct;
  document.getElementById('selectedSizeLabel').textContent = state.selectedSize || '';

  document.getElementById('sizeButtons').innerHTML = product.sizes.map(size => {
    const stock = product.variantMap[`${state.selectedColour}|${size}`] ?? 0;
    return `
      <button class="size-btn ${size === state.selectedSize ? 'selected' : ''}"
        ${stock === 0 ? 'disabled' : ''}
        data-size="${size}"
        title="${stock === 0 ? 'Out of stock' : stock + ' in stock'}"
      >${size}</button>
    `;
  }).join('');
}

/* Helper: updates the stock message below the size buttons */
function updateStockInfo() {
  const product = state.quickViewProduct;
  const stock   = product.variantMap[`${state.selectedColour}|${state.selectedSize}`] ?? 0;
  const el      = document.getElementById('stockInfo');

  if (stock === 0) {
    el.textContent = 'Out of stock for this combination';
    el.className   = 'stock-info low';
  } else if (stock <= 3) {
    el.textContent = `Only ${stock} left in stock!`;
    el.className   = 'stock-info low';
  } else {
    el.textContent = `In stock (${stock} available)`;
    el.className   = 'stock-info';
  }

  document.getElementById('addToCartBtn').disabled = stock === 0;
}

function closeQuickView() {
  document.getElementById('quickViewOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  state.quickViewProduct = null;
}

/* ─────────────────────────────────────────────────────────
   CART
   ───────────────────────────────────────────────────────── */
function addToCart(product, colour, size) {
  const key      = `${product.id}|${colour}|${size}`;
  const existing = state.cart.find(i => i.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
    const img  = (product.images && product.images[0]) ? product.images[0].url : '';
    const meta = product.variantMeta?.[`${colour}|${size}`] || {};
    state.cart.push({
      key,
      productId: product.id,
      variantId: meta.id  || null,   // needed for stock deduction at checkout
      sku:       meta.sku || '',     // needed for order record
      name:      product.name,
      image:     img,
      price:     product.price,
      colour,
      size,
      qty: 1,
    });
  }
  saveCartToStorage(state.cart);
  renderCart();
  updateBadges();
  openCart();
}

function removeFromCart(key) {
  state.cart = state.cart.filter(i => i.key !== key);
  saveCartToStorage(state.cart);
  renderCart();
  updateBadges();
}

function changeQty(key, delta) {
  const item = state.cart.find(i => i.key === key);
  if (item) {
    item.qty = Math.max(1, item.qty + delta);
    saveCartToStorage(state.cart);
    renderCart();
  }
}

function renderCart() {
  const container  = document.getElementById('cartItems');
  const footer     = document.getElementById('cartFooter');
  const subtotalEl = document.getElementById('cartSubtotal');

  if (state.cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    footer.style.display = 'none';
    updateShippingBar(0);
    return;
  }

  let subtotal = 0;
  container.innerHTML = state.cart.map(item => {
    subtotal += item.price * item.qty;
    const img = item.image || `https://placehold.co/68x80/F5EEE4/7B1C2E?text=${encodeURIComponent(item.name.slice(0,8))}`;
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${img}" alt="${item.name}" />
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-variant">${item.colour} · ${item.size}</p>
          <p class="cart-item-price">${formatPrice(item.price)}</p>
          <div class="cart-qty-row">
            <button class="qty-btn" data-action="qty-down" data-key="${item.key}">−</button>
            <span class="qty-display">${item.qty}</span>
            <button class="qty-btn" data-action="qty-up"   data-key="${item.key}">+</button>
          </div>
        </div>
        <button class="remove-btn" data-action="remove-cart" data-key="${item.key}">✕</button>
      </div>`;
  }).join('');

  subtotalEl.textContent  = formatPrice(subtotal);
  footer.style.display    = 'flex';
  updateShippingBar(subtotal);
}

function updateShippingBar(subtotal) {
  const THRESHOLD = 999;
  const fillEl = document.getElementById('shippingFill');
  const msgEl  = document.getElementById('shippingMsg');
  const leftEl = document.getElementById('shippingLeft');

  if (subtotal >= THRESHOLD) {
    fillEl.style.width = '100%';
    msgEl.innerHTML    = '🎉 You have free shipping!';
  } else {
    fillEl.style.width = ((subtotal / THRESHOLD) * 100) + '%';
    leftEl.textContent = formatPrice(THRESHOLD - subtotal);
    msgEl.innerHTML    = `Add ${formatPrice(THRESHOLD - subtotal)} more for <strong>free shipping!</strong>`;
  }
}

function openCart()  {
  document.getElementById('cartSidebar').classList.remove('hidden');
  document.getElementById('cartOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartSidebar').classList.add('hidden');
  document.getElementById('cartOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

/* ─────────────────────────────────────────────────────────
   WISHLIST
   ───────────────────────────────────────────────────────── */
function toggleWishlist(productId) {
  const idx = state.wishlist.indexOf(productId);
  if (idx === -1) state.wishlist.push(productId);
  else            state.wishlist.splice(idx, 1);
  renderWishlist();
  updateBadges();
  renderGrid();
}

function renderWishlist() {
  const container = document.getElementById('wishlistItems');
  const items     = state.products.filter(p => state.wishlist.includes(p.id));

  if (items.length === 0) {
    container.innerHTML = '<p class="cart-empty">Your wishlist is empty.</p>';
    return;
  }
  container.innerHTML = items.map(p => {
    const img = p.image || '';
    return `
      <div class="wishlist-item">
        <img class="wishlist-item-img" src="${img}" alt="${p.name}" />
        <div class="wishlist-item-info">
          <p class="wishlist-item-name">${p.name}</p>
          <p class="wishlist-item-price">${formatPrice(p.price)}</p>
        </div>
        <button class="remove-btn" data-action="remove-wishlist" data-id="${p.id}">✕</button>
      </div>`;
  }).join('');
}

function openWishlist()  {
  document.getElementById('wishlistSidebar').classList.remove('hidden');
  document.getElementById('wishlistOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeWishlist() {
  document.getElementById('wishlistSidebar').classList.add('hidden');
  document.getElementById('wishlistOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

/* ─────────────────────────────────────────────────────────
   BADGES  –  numbers on the cart and wishlist icons
   ───────────────────────────────────────────────────────── */
function updateBadges() {
  document.getElementById('cartCount').textContent     = state.cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('wishlistCount').textContent = state.wishlist.length;
}

/* ─────────────────────────────────────────────────────────
   EVENT DELEGATION  –  one listener handles all clicks
   ───────────────────────────────────────────────────────── */
document.addEventListener('click', function (e) {
  const el     = e.target;
  const action = el.dataset.action;

  // Category tab clicked
  if (el.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    state.activeCategory = el.dataset.cat;
    fetchAndRender();
    return;
  }

  // Quick View button on a card
  if (action === 'quickview') { openQuickView(Number(el.dataset.id)); return; }

  // Wishlist heart on a card
  if (action === 'wishlist') { toggleWishlist(Number(el.dataset.id)); return; }

  // Colour swatch inside modal
  if (el.classList.contains('swatch')) {
    state.selectedColour = el.dataset.colour;
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedSize = state.quickViewProduct.sizes[0];
    renderSizeButtons();
    updateStockInfo();
    return;
  }

  // Size button inside modal
  if (el.classList.contains('size-btn') && !el.disabled) {
    state.selectedSize = el.dataset.size;
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('selectedSizeLabel').textContent = state.selectedSize;
    updateStockInfo();
    return;
  }

  // Add to Cart (modal button)
  if (el.id === 'addToCartBtn') {
    addToCart(state.quickViewProduct, state.selectedColour, state.selectedSize);
    closeQuickView();
    return;
  }

  // Add to Wishlist (modal button)
  if (el.id === 'addToWishlistBtn') {
    toggleWishlist(state.quickViewProduct.id);
    el.textContent = state.wishlist.includes(state.quickViewProduct.id) ? '♥ Wishlisted' : '♡ Wishlist';
    return;
  }

  // Close modal
  if (el.id === 'quickViewOverlay' || el.id === 'modalClose') { closeQuickView(); return; }

  // Cart open / close
  if (el.id === 'cartToggle' || el.closest('#cartToggle')) { openCart(); return; }
  if (el.id === 'cartClose'  || el.id === 'cartOverlay')  { closeCart(); return; }

  // Wishlist open / close
  if (el.id === 'wishlistToggle' || el.closest('#wishlistToggle')) { openWishlist(); return; }
  if (el.id === 'wishlistClose'  || el.id === 'wishlistOverlay')  { closeWishlist(); return; }

  // Qty buttons inside cart
  if (action === 'qty-up')   { changeQty(el.dataset.key, +1); return; }
  if (action === 'qty-down') { changeQty(el.dataset.key, -1); return; }

  // Remove item from cart or wishlist
  if (action === 'remove-cart')     { removeFromCart(el.dataset.key); return; }
  if (action === 'remove-wishlist') { toggleWishlist(Number(el.dataset.id)); return; }
});

/* ─────────────────────────────────────────────────────────
   SEARCH  –  debounced so it doesn't fire on every keystroke
   "Debounce" means: wait 300ms after the user stops typing,
   then fetch. Prevents hammering the server.
   ───────────────────────────────────────────────────────── */
let searchTimer;
document.getElementById('searchInput').addEventListener('input', function () {
  state.searchQuery = this.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchAndRender, 300);
});

/* Sort dropdown */
document.getElementById('sortSelect').addEventListener('change', function () {
  state.sortBy = this.value;
  fetchAndRender();
});

/* Escape key closes any open overlay */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeQuickView(); closeCart(); closeWishlist(); }
});

/* ─────────────────────────────────────────────────────────
   CHECKOUT BUTTON  –  goes to /checkout page
   ───────────────────────────────────────────────────────── */
document.getElementById('checkoutBtn')?.addEventListener('click', () => {
  if (state.cart.length === 0) return;
  window.location.href = '/checkout';
});

/* ─────────────────────────────────────────────────────────
   INIT  –  runs once when the page loads
   ───────────────────────────────────────────────────────── */
updateBadges();
renderCart();      // restore cart UI from localStorage
fetchAndRender();
