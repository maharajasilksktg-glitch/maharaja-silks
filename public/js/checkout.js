/* ═══════════════════════════════════════════════════════════
   checkout.js  –  Shree Maharaja Silks  –  Stage 4
   Runs on the /checkout page.
   Reads the cart from localStorage, shows the order summary,
   validates the form, and posts the order to /api/orders.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const FREE_SHIPPING = 999;
const SHIPPING_FEE  = 49;

/* ─────────────────────────────────────────────────────────
   LOAD CART FROM LOCALSTORAGE
   main.js saves the cart there every time it changes.
   ───────────────────────────────────────────────────────── */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('sms_cart') || '[]');
  } catch {
    return [];
  }
}

const cart = getCart();

/* ─────────────────────────────────────────────────────────
   FORMAT PRICE
   ───────────────────────────────────────────────────────── */
function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

/* ─────────────────────────────────────────────────────────
   RENDER ORDER SUMMARY
   ───────────────────────────────────────────────────────── */
function renderSummary() {
  if (cart.length === 0) {
    document.getElementById('emptyCartMsg').classList.remove('hidden');
    document.getElementById('checkoutLayout').classList.add('hidden');
    return;
  }

  // Build item rows
  const summaryItems = document.getElementById('summaryItems');
  summaryItems.innerHTML = cart.map(item => {
    const img = item.image
      ? `<img class="summary-item-img" src="${item.image}" alt="${item.name}" />`
      : `<div class="summary-item-img" style="display:flex;align-items:center;justify-content:center;font-size:22px">👔</div>`;
    return `
      <div class="summary-item">
        ${img}
        <div class="summary-item-info">
          <p class="summary-item-name">${item.name}</p>
          <p class="summary-item-variant">${item.colour} · ${item.size}</p>
          <p class="summary-item-qty">Qty: ${item.qty}</p>
        </div>
        <span class="summary-item-price">${fmt(item.price * item.qty)}</span>
      </div>`;
  }).join('');

  // Calculate totals
  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingFee = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  const total       = subtotal + shippingFee;

  document.getElementById('summarySubtotal').textContent = fmt(subtotal);
  document.getElementById('summaryTotal').textContent    = fmt(total);
  document.getElementById('totalNote').textContent       = total.toLocaleString('en-IN');

  // Shipping row
  const shippingEl = document.getElementById('summaryShipping');
  if (shippingFee === 0) {
    shippingEl.textContent = 'FREE 🎉';
    shippingEl.style.color = '#2E7D32';
  } else {
    shippingEl.textContent = fmt(shippingFee);
    shippingEl.style.color = '';
  }

  // Free shipping nudge (shows how much more to add)
  const nudge = document.getElementById('shippingNudge');
  if (shippingFee > 0) {
    const remaining = FREE_SHIPPING - subtotal;
    nudge.textContent = `Add ${fmt(remaining)} more to get FREE shipping!`;
    nudge.classList.add('visible');
  } else {
    nudge.classList.remove('visible');
  }
}

/* ─────────────────────────────────────────────────────────
   VALIDATE THE FORM
   Returns null if valid, or an error string if not.
   ───────────────────────────────────────────────────────── */
function validateForm() {
  const phone = document.getElementById('cPhone').value.trim();
  const pin   = document.getElementById('cPin').value.trim();

  if (!document.getElementById('cName').value.trim())  return 'Please enter your full name.';
  if (!phone)                                           return 'Please enter your phone number.';
  if (!/^\d{10}$/.test(phone))                          return 'Phone number must be exactly 10 digits.';
  if (!document.getElementById('cAddr1').value.trim())  return 'Please enter your address.';
  if (!document.getElementById('cCity').value.trim())   return 'Please enter your city.';
  if (!document.getElementById('cState').value)         return 'Please select your state.';
  if (!pin)                                             return 'Please enter your pincode.';
  if (!/^\d{6}$/.test(pin))                             return 'Pincode must be exactly 6 digits.';

  return null;
}

/* ─────────────────────────────────────────────────────────
   SHOW / HIDE ERROR
   ───────────────────────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById('checkoutError');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function hideError() {
  document.getElementById('checkoutError').classList.add('hidden');
}

/* ─────────────────────────────────────────────────────────
   PLACE ORDER
   Called when "Place Order" button is clicked.
   ───────────────────────────────────────────────────────── */
async function placeOrder() {
  hideError();

  const err = validateForm();
  if (err) { showError(err); return; }

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled    = true;
  btn.textContent = 'Placing Order…';

  // Build the payload for the API
  const payload = {
    customer: {
      name:          document.getElementById('cName').value.trim(),
      phone:         document.getElementById('cPhone').value.trim(),
      email:         document.getElementById('cEmail').value.trim(),
      address_line1: document.getElementById('cAddr1').value.trim(),
      address_line2: document.getElementById('cAddr2').value.trim(),
      city:          document.getElementById('cCity').value.trim(),
      state:         document.getElementById('cState').value,
      pincode:       document.getElementById('cPin').value.trim(),
    },
    // Map each cart item to what the server expects
    items: cart.map(item => ({
      productId:   item.productId,
      variantId:   item.variantId,   // needed for stock deduction
      sku:         item.sku,
      productName: item.name,
      colour:      item.colour,
      size:        item.size,
      price:       item.price,
      qty:         item.qty,
    })),
    notes: document.getElementById('cNotes').value.trim(),
  };

  try {
    const res  = await fetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.success) {
      showError(data.error || 'Could not place order. Please try again.');
      btn.disabled    = false;
      btn.textContent = 'Place Order (Cash on Delivery)';
      return;
    }

    // Clear the cart from localStorage — order is placed!
    localStorage.removeItem('sms_cart');

    // Go to the confirmation page
    window.location.href = `/order-confirmation.html?id=${data.orderId}`;

  } catch (networkErr) {
    showError('Network error. Please check your connection and try again.');
    btn.disabled    = false;
    btn.textContent = 'Place Order (Cash on Delivery)';
  }
}

/* ─────────────────────────────────────────────────────────
   Only allow digits in phone and pincode fields
   ───────────────────────────────────────────────────────── */
document.getElementById('cPhone').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});
document.getElementById('cPin').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});

document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);

/* ─────────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────────── */
renderSummary();
