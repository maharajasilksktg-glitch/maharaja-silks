/* ═══════════════════════════════════════════════════════════
   Admin Panel – Shree Maharaja Silks – admin.js
   Handles:
     • Loading and displaying the products table
     • Add / Edit product form
     • Image upload and removal
     • Colour tag input
     • Variant stock grid generation
     • Saving (create or update) a product
     • Deleting a product
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────
   COLOUR HEX MAP  –  used to colour the tags and dots
   ───────────────────────────────────────────────────────── */
const COLOUR_HEX = {
  'Red':'#C0392B','Royal Blue':'#2471A3','Forest Green':'#1E8449',
  'Pink':'#E91E8C','Sky Blue':'#5DADE2','Yellow':'#F1C40F',
  'Mustard':'#D4AC0D','Teal':'#148F77','White':'#BDB5A8',
  'Light Blue':'#AED6F1','Beige':'#C4A882','Black':'#2C2C2C',
  'Navy':'#1B3A6B','Dark Grey':'#5D6D7E','Maroon':'#7B1C2E',
  'Camel':'#C19A6B','Charcoal':'#424949','Red & Gold':'#B03030',
  'Pink & Silver':'#E75480','Purple & Gold':'#6C3483','Peach':'#FFAA88',
  'Lavender':'#9B7FC7','Mint Green':'#5DB87B','Magenta':'#C0185D',
  'Orange':'#E67E22','Dark Blue':'#1A2980','Olive':'#6B7D2A',
  'Off White':'#C8C0B0','Coral':'#FF6B6B','Indigo':'#3F4C8A',
  'Sage Green':'#6A8F6A','Grey':'#7F8C8D',
};

// Size options for each system
const SIZE_SYSTEMS = {
  free:     ['Free Size'],
  clothing: ['S', 'M', 'L', 'XL', 'XXL'],
  pants:    ['30', '32', '34', '36', '38'],
};

/* ─────────────────────────────────────────────────────────
   STATE
   ───────────────────────────────────────────────────────── */
let colours     = [];   // array of colour strings added by the admin
let deleteTargetId = null; // which product id is pending deletion

/* ─────────────────────────────────────────────────────────
   SHOW / HIDE VIEWS
   The page has two sections: "products list" and "add/edit form"
   ───────────────────────────────────────────────────────── */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
}

/* ─────────────────────────────────────────────────────────
   FLASH MESSAGE  –  green for success, red for error
   Disappears after 4 seconds
   ───────────────────────────────────────────────────────── */
function flash(msg, type = 'success') {
  const el = document.getElementById('flash');
  el.textContent = msg;
  el.className = `flash ${type}`;
  el.classList.remove('hidden');
  clearTimeout(flash._timer);
  flash._timer = setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ─────────────────────────────────────────────────────────
   FORMAT PRICE
   ───────────────────────────────────────────────────────── */
function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

/* ─────────────────────────────────────────────────────────
   LOAD AND RENDER PRODUCTS TABLE
   ───────────────────────────────────────────────────────── */
async function loadProducts() {
  try {
    const res  = await fetch('/api/admin/products');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    renderProductsTable(data.products);
  } catch (err) {
    document.getElementById('productsBody').innerHTML =
      `<tr><td colspan="9" style="color:#C62828;text-align:center;padding:32px">
        Error loading products: ${err.message}
      </td></tr>`;
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsBody');

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-loading">No products yet. Click "Add New Product" to get started.</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => {
    const disc = p.mrp && p.mrp > p.price
      ? `<br/><small style="color:#888;text-decoration:line-through">${fmt(p.mrp)}</small>` : '';

    const imgCell = p.image
      ? `<img class="product-thumb" src="${p.image}" alt="${p.name}" />`
      : `<div class="product-thumb-placeholder">👔</div>`;

    return `
      <tr>
        <td>${imgCell}</td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td class="price-cell">${fmt(p.price)}${disc}</td>
        <td>${p.mrp ? fmt(p.mrp) : '—'}</td>
        <td style="text-align:center">${p.variant_count}</td>
        <td style="text-align:center">${p.total_stock ?? 0}</td>
        <td>
          ${p.featured
            ? '<span class="badge-featured">⭐ Yes</span>'
            : '<span class="badge-no">No</span>'}
        </td>
        <td class="actions-cell">
          <button class="btn-icon" title="Edit" onclick="startEdit(${p.id})">✏️</button>
          <button class="btn-icon delete" title="Delete" onclick="confirmDelete(${p.id}, '${p.name.replace(/'/g,"\\'")}')">🗑️</button>
        </td>
      </tr>`;
  }).join('');
}

/* ─────────────────────────────────────────────────────────
   OPEN THE ADD-PRODUCT FORM (blank)
   ───────────────────────────────────────────────────────── */
function openAddForm() {
  // Clear everything
  document.getElementById('editProductId').value = '';
  document.getElementById('formTitle').textContent = 'Add New Product';
  document.getElementById('fName').value     = '';
  document.getElementById('fCategory').value = '';
  document.getElementById('fFabric').value   = '';
  document.getElementById('fPrice').value    = '';
  document.getElementById('fMrp').value      = '';
  document.getElementById('fDesc').value     = '';
  document.getElementById('fFeatured').checked = false;

  // Clear images
  document.getElementById('existingImages').innerHTML = '';
  document.getElementById('newImagePreviews').innerHTML = '';
  document.getElementById('fImages').value = '';

  // Clear colours and variant grid
  colours = [];
  renderColourTags();
  document.getElementById('variantGridWrap').classList.add('hidden');
  document.getElementById('existingVariantsSummary').classList.add('hidden');
  document.querySelector('input[name="sizeSystem"][value="free"]').checked = true;

  showView('form');
}

/* ─────────────────────────────────────────────────────────
   OPEN THE EDIT FORM (pre-filled with existing product data)
   ───────────────────────────────────────────────────────── */
async function startEdit(productId) {
  try {
    const res  = await fetch(`/api/admin/products/${productId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    const p = data.product;

    document.getElementById('editProductId').value       = p.id;
    document.getElementById('formTitle').textContent     = 'Edit Product';
    document.getElementById('fName').value               = p.name;
    document.getElementById('fCategory').value           = p.category;
    document.getElementById('fFabric').value             = p.fabric || '';
    document.getElementById('fPrice').value              = p.price;
    document.getElementById('fMrp').value                = p.mrp || '';
    document.getElementById('fDesc').value               = p.description || '';
    document.getElementById('fFeatured').checked         = p.featured === 1;

    // Show existing images
    renderExistingImages(p.images || []);
    document.getElementById('newImagePreviews').innerHTML = '';
    document.getElementById('fImages').value = '';

    // Load colours and sizes from existing variants
    loadVariantsIntoForm(p.variants || [], p.category);

    showView('form');
  } catch (err) {
    flash('Could not load product: ' + err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   RENDER EXISTING IMAGES (with delete buttons)
   ───────────────────────────────────────────────────────── */
function renderExistingImages(images) {
  const container = document.getElementById('existingImages');
  container.innerHTML = images.map((img, i) => `
    <div class="preview-item" id="imgItem-${img.id}">
      <img src="${img.url}" alt="Product image" />
      ${i === 0 ? '<span class="main-badge">MAIN</span>' : ''}
      <button class="remove-img-btn" onclick="deleteImage(${img.id})" title="Remove photo">×</button>
    </div>
  `).join('');
}

/* ─────────────────────────────────────────────────────────
   DELETE A PHOTO
   ───────────────────────────────────────────────────────── */
async function deleteImage(imageId) {
  if (!confirm('Remove this photo?')) return;
  try {
    const res  = await fetch(`/api/admin/images/${imageId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    document.getElementById(`imgItem-${imageId}`)?.remove();
  } catch (err) {
    flash('Could not delete image: ' + err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   LOAD EXISTING VARIANTS INTO THE FORM
   Figures out which size system was used, restores colours,
   then rebuilds the grid filled with existing stock numbers.
   ───────────────────────────────────────────────────────── */
function loadVariantsIntoForm(variants, category) {
  if (variants.length === 0) {
    colours = [];
    renderColourTags();
    document.getElementById('variantGridWrap').classList.add('hidden');
    return;
  }

  // Determine size system from the first variant's size value
  const firstSize = variants[0].size;
  let sizeSystem = 'free';
  if (['S','M','L','XL','XXL'].includes(firstSize))  sizeSystem = 'clothing';
  if (['30','32','34','36','38'].includes(firstSize)) sizeSystem = 'pants';

  document.querySelector(`input[name="sizeSystem"][value="${sizeSystem}"]`).checked = true;

  // Extract unique colours (preserving order)
  colours = [...new Set(variants.map(v => v.colour))];
  renderColourTags();

  // Build the grid, then fill in stocks
  buildVariantGrid();

  // Fill in stock values
  for (const v of variants) {
    const input = document.querySelector(
      `.stock-input[data-colour="${CSS.escape(v.colour)}"][data-size="${CSS.escape(v.size)}"]`
    );
    if (input) input.value = v.stock;
  }

  document.getElementById('existingVariantsSummary').classList.remove('hidden');
}

/* ─────────────────────────────────────────────────────────
   COLOUR TAG INPUT
   ───────────────────────────────────────────────────────── */
function renderColourTags() {
  const wrap  = document.getElementById('colourTagWrap');
  const input = document.getElementById('colourTagInput');

  // Remove all existing tags (but keep the input)
  wrap.querySelectorAll('.colour-tag').forEach(t => t.remove());

  // Re-add tags before the input
  colours.forEach(c => {
    const tag = document.createElement('span');
    tag.className = 'colour-tag';
    tag.style.background = COLOUR_HEX[c] || '#888';
    tag.innerHTML = `${c} <button type="button" data-colour="${c}" title="Remove">×</button>`;
    wrap.insertBefore(tag, input);
  });
}

function addColour(name) {
  name = name.trim();
  if (!name || colours.includes(name)) return;
  colours.push(name);
  renderColourTags();
}

// Clicking the wrap focuses the input
document.getElementById('colourTagWrap').addEventListener('click', function () {
  document.getElementById('colourTagInput').focus();
});

// Enter or comma adds the colour
document.getElementById('colourTagInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addColour(this.value.replace(',', ''));
    this.value = '';
  }
});

// Remove a colour tag when its × is clicked
document.getElementById('colourTagWrap').addEventListener('click', function (e) {
  if (e.target.dataset.colour) {
    const c = e.target.dataset.colour;
    colours = colours.filter(x => x !== c);
    renderColourTags();
  }
});

/* ─────────────────────────────────────────────────────────
   BUILD THE VARIANT STOCK GRID
   Creates a table: rows = colours, columns = sizes,
   cells = number inputs for stock quantity
   ───────────────────────────────────────────────────────── */
function buildVariantGrid() {
  if (colours.length === 0) {
    alert('Please add at least one colour first.');
    return;
  }

  const system = document.querySelector('input[name="sizeSystem"]:checked').value;
  const sizes  = SIZE_SYSTEMS[system];
  const table  = document.getElementById('variantGridTable');

  // Build header row: first cell = "Colour", then one cell per size
  let html = `<thead><tr>
    <th class="colour-col">Colour</th>
    ${sizes.map(s => `<th>${s}</th>`).join('')}
  </tr></thead><tbody>`;

  // Build one row per colour
  for (const colour of colours) {
    const hex = COLOUR_HEX[colour] || '#888';
    html += `<tr>
      <td class="colour-name">
        <span class="colour-dot" style="background:${hex}"></span>${colour}
      </td>
      ${sizes.map(size => `
        <td>
          <input
            type="number"
            class="stock-input"
            data-colour="${colour}"
            data-size="${size}"
            value="0"
            min="0"
          />
        </td>`).join('')}
    </tr>`;
  }

  html += '</tbody>';
  table.innerHTML = html;
  document.getElementById('variantGridWrap').classList.remove('hidden');
}

document.getElementById('generateGridBtn').addEventListener('click', buildVariantGrid);

/* ─────────────────────────────────────────────────────────
   READ VARIANT DATA FROM THE GRID
   Returns an array of { colour, size, stock } objects
   ───────────────────────────────────────────────────────── */
function readVariantsFromGrid() {
  const inputs   = document.querySelectorAll('.stock-input');
  const variants = [];
  inputs.forEach(input => {
    variants.push({
      colour: input.dataset.colour,
      size:   input.dataset.size,
      stock:  Number(input.value) || 0,
    });
  });
  return variants;
}

/* ─────────────────────────────────────────────────────────
   IMAGE FILE PICKER  –  show previews of newly selected files
   ───────────────────────────────────────────────────────── */
document.getElementById('fImages').addEventListener('change', function () {
  const preview = document.getElementById('newImagePreviews');
  preview.innerHTML = '';

  Array.from(this.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      item.innerHTML = `<img src="${e.target.result}" alt="preview" />
        <span style="font-size:10px;color:#999;text-align:center;display:block;margin-top:3px">New</span>`;
      preview.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
});

/* ─────────────────────────────────────────────────────────
   SAVE PRODUCT  –  handles both CREATE (new) and UPDATE (edit)
   ───────────────────────────────────────────────────────── */
document.getElementById('saveProductBtn').addEventListener('click', saveProduct);

async function saveProduct() {
  const btn        = document.getElementById('saveProductBtn');
  const editId     = document.getElementById('editProductId').value;
  const isEditing  = editId !== '';

  // ── Gather form values ──
  const name     = document.getElementById('fName').value.trim();
  const category = document.getElementById('fCategory').value;
  const fabric   = document.getElementById('fFabric').value.trim();
  const price    = document.getElementById('fPrice').value;
  const mrp      = document.getElementById('fMrp').value;
  const desc     = document.getElementById('fDesc').value.trim();
  const featured = document.getElementById('fFeatured').checked;

  // ── Basic validation ──
  if (!name)     { flash('Product name is required.',  'error'); return; }
  if (!category) { flash('Please select a category.',  'error'); return; }
  if (!price)    { flash('Selling price is required.', 'error'); return; }

  const variants = readVariantsFromGrid();
  if (variants.length === 0) {
    flash('Please generate the variant grid and fill in at least one size + colour.', 'error');
    return;
  }

  btn.disabled   = true;
  btn.textContent = 'Saving…';

  try {
    // ── Step 1: Create or update the product ──
    let productId;

    if (isEditing) {
      const res  = await fetch(`/api/admin/products/${editId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, fabric, price, mrp, description: desc, featured }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      productId = Number(editId);
    } else {
      const res  = await fetch('/api/admin/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, fabric, price, mrp, description: desc, featured }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      productId = data.id;
    }

    // ── Step 2: Upload any new images ──
    const fileInput = document.getElementById('fImages');
    if (fileInput.files.length > 0) {
      const formData = new FormData();
      Array.from(fileInput.files).forEach(f => formData.append('images', f));

      const imgRes  = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body:   formData,   // multipart upload — no Content-Type header needed, browser sets it
      });
      const imgData = await imgRes.json();
      if (!imgData.success) throw new Error('Image upload failed: ' + imgData.error);
    }

    // ── Step 3: Save variants ──
    const varRes  = await fetch(`/api/admin/products/${productId}/variants`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ variants }),
    });
    const varData = await varRes.json();
    if (!varData.success) throw new Error(varData.error);

    // ── Done! ──
    flash(isEditing ? `"${name}" updated successfully.` : `"${name}" added to the shop!`);
    showView('products');
    loadProducts();

  } catch (err) {
    flash('Save failed: ' + err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Save Product';
  }
}

/* ─────────────────────────────────────────────────────────
   DELETE PRODUCT
   ───────────────────────────────────────────────────────── */
function confirmDelete(productId, productName) {
  deleteTargetId = productId;
  document.getElementById('deleteMsg').textContent =
    `Delete "${productName}"? This cannot be undone. All variants and photos will also be removed.`;
  document.getElementById('deleteOverlay').classList.remove('hidden');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  try {
    const res  = await fetch(`/api/admin/products/${deleteTargetId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    document.getElementById('deleteOverlay').classList.add('hidden');
    deleteTargetId = null;
    flash('Product deleted.');
    loadProducts();
  } catch (err) {
    flash('Delete failed: ' + err.message, 'error');
  }
});

document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
  document.getElementById('deleteOverlay').classList.add('hidden');
  deleteTargetId = null;
});

/* ─────────────────────────────────────────────────────────
   ORDERS – load and render the orders table
   ───────────────────────────────────────────────────────── */
async function loadOrders() {
  document.getElementById('ordersBody').innerHTML =
    '<tr><td colspan="9" class="table-loading">Loading orders…</td></tr>';
  try {
    const res  = await fetch('/api/admin/orders');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    renderOrdersTable(data.orders);
    updatePendingBadge(data.orders);
  } catch (err) {
    document.getElementById('ordersBody').innerHTML =
      `<tr><td colspan="9" style="color:#C62828;text-align:center;padding:32px">Error: ${err.message}</td></tr>`;
  }
}

function updatePendingBadge(orders) {
  const pending = orders.filter(o => o.status === 'pending').length;
  const badge   = document.getElementById('pendingBadge');
  badge.textContent = pending;
  pending > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
}

const STATUS_LABELS = {
  pending:   'Pending',
  confirmed: 'Confirmed',
  shipped:   'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersBody');

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-loading">No orders yet. Orders placed in the shop will appear here.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => {
    // Format the date nicely:  "03 Jun 2025, 14:32"
    const d    = new Date(o.created_at);
    const date = isNaN(d) ? o.created_at : d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    // Build the status dropdown so the admin can change it inline
    const statusOptions = Object.entries(STATUS_LABELS).map(([val, label]) =>
      `<option value="${val}" ${o.status === val ? 'selected' : ''}>${label}</option>`
    ).join('');

    return `
      <tr>
        <td><strong style="color:#7B1C2E">${o.order_number}</strong></td>
        <td style="font-size:12px;color:#666">${date}</td>
        <td>${o.customer_name}</td>
        <td style="font-size:13px">${o.customer_phone}</td>
        <td style="text-align:center">${o.item_count}</td>
        <td style="font-weight:700;color:#7B1C2E">${fmt(o.total)}</td>
        <td><span style="font-size:12px">${o.payment_method}</span></td>
        <td>
          <select class="status-select" data-order-id="${o.id}" onchange="updateOrderStatus(${o.id}, this.value)">
            ${statusOptions}
          </select>
        </td>
        <td>
          <button class="btn-icon" title="View details" onclick="openOrderPanel(${o.id})">👁️</button>
        </td>
      </tr>`;
  }).join('');
}

/* Update order status when admin changes the dropdown */
async function updateOrderStatus(orderId, newStatus) {
  try {
    const res  = await fetch(`/api/admin/orders/${orderId}/status`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    orderFlash(`Status updated to "${STATUS_LABELS[newStatus]}".`);
    // Refresh badge count
    const res2 = await fetch('/api/admin/orders');
    const d2   = await res2.json();
    if (d2.success) updatePendingBadge(d2.orders);
  } catch (err) {
    orderFlash('Could not update status: ' + err.message, true);
  }
}

/* Open the order detail side panel */
async function openOrderPanel(orderId) {
  try {
    const res  = await fetch(`/api/admin/orders/${orderId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    const o = data.order;

    document.getElementById('orderPanelTitle').textContent = o.order_number;

    const addrLines = [
      o.address_line1,
      o.address_line2,
      `${o.city}, ${o.state}`,
      `Pincode: ${o.pincode}`,
    ].filter(Boolean).join('<br/>');

    document.getElementById('orderPanelBody').innerHTML = `
      <div class="panel-section">
        <strong>Customer</strong>
        <p>${o.customer_name}<br/>📞 ${o.customer_phone}${o.customer_email ? '<br/>✉️ ' + o.customer_email : ''}</p>
      </div>
      <div class="panel-section">
        <strong>Delivery Address</strong>
        <address>${addrLines}</address>
      </div>
      ${o.notes ? `<div class="panel-section"><strong>Delivery Notes</strong><p>${o.notes}</p></div>` : ''}
      <div class="panel-section">
        <strong>Items Ordered</strong>
        <div class="panel-items">
          ${o.items.map(i => `
            <div class="panel-item">
              <div>
                <div class="panel-item-name">${i.product_name}</div>
                <div class="panel-item-meta">${i.colour} · ${i.size} · SKU: ${i.sku} · Qty: ${i.qty}</div>
              </div>
              <span class="panel-item-price">${fmt(i.line_total)}</span>
            </div>`).join('')}
          <div class="panel-total">
            <span>Subtotal</span><span>${fmt(o.subtotal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:14px;color:#7A6550;margin-top:4px">
            <span>Shipping</span><span>${o.shipping_fee === 0 ? 'FREE 🎉' : fmt(o.shipping_fee)}</span>
          </div>
          <div class="panel-total" style="margin-top:8px">
            <span>Total (COD)</span><span>${fmt(o.total)}</span>
          </div>
        </div>
      </div>
      <div class="panel-section">
        <strong>Payment</strong>
        <p>${o.payment_method} · <span class="status-badge status-${o.status}">${STATUS_LABELS[o.status]}</span></p>
      </div>
    `;

    document.getElementById('orderPanel').classList.remove('hidden');
    document.getElementById('orderOverlay').classList.remove('hidden');
  } catch (err) {
    orderFlash('Could not load order: ' + err.message, true);
  }
}

function closeOrderPanel() {
  document.getElementById('orderPanel').classList.add('hidden');
  document.getElementById('orderOverlay').classList.add('hidden');
}

document.getElementById('orderPanelClose').addEventListener('click', closeOrderPanel);
document.getElementById('orderOverlay').addEventListener('click', closeOrderPanel);
document.getElementById('refreshOrdersBtn').addEventListener('click', loadOrders);

function orderFlash(msg, isError = false) {
  const el = document.getElementById('orderFlash');
  el.textContent = msg;
  el.className = `flash ${isError ? 'error' : 'success'}`;
  el.classList.remove('hidden');
  clearTimeout(orderFlash._t);
  orderFlash._t = setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ─────────────────────────────────────────────────────────
   NAV & BUTTON WIRING
   ───────────────────────────────────────────────────────── */
document.getElementById('addProductBtn').addEventListener('click', openAddForm);

// Both cancel buttons (top of form and bottom of form)
document.getElementById('cancelFormBtn').addEventListener('click',  () => showView('products'));
document.getElementById('cancelFormBtn2').addEventListener('click', () => showView('products'));

// Sidebar navigation — switches between Products and Orders views
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    this.classList.add('active');
    const view = this.dataset.view;
    showView(view);
    if (view === 'orders') loadOrders();
  });
});

/* ─────────────────────────────────────────────────────────
   INIT  –  load products when page opens
   ───────────────────────────────────────────────────────── */
loadProducts();
// Also load orders in background so the pending badge is correct from the start
fetch('/api/admin/orders').then(r => r.json()).then(d => {
  if (d.success) updatePendingBadge(d.orders);
});
