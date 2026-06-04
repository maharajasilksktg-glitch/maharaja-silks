/* ═══════════════════════════════════════════════════════════
   order-confirmation.js  –  Shree Maharaja Silks  –  Stage 4
   Reads the order ID from the URL (?id=5), fetches the order
   from the server, and displays the confirmation details.
   ═══════════════════════════════════════════════════════════ */

'use strict';

function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

async function loadConfirmation() {
  // Read ?id=5 from the URL
  const params  = new URLSearchParams(window.location.search);
  const orderId = params.get('id');

  if (!orderId) {
    show('errorMsg');
    return;
  }

  try {
    const res  = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();

    if (!data.success) { show('errorMsg'); return; }

    const o = data.order;

    // Order number
    document.getElementById('confirmOrderNumber').textContent = o.order_number;

    // Phone
    document.getElementById('confirmPhone').textContent = o.customer_phone;

    // Address block
    const addrParts = [
      o.customer_name,
      o.address_line1,
      o.address_line2,
      `${o.city}, ${o.state} – ${o.pincode}`,
    ].filter(Boolean);
    document.getElementById('confirmAddress').innerHTML = addrParts.join('<br/>');

    // Items list
    document.getElementById('confirmItems').innerHTML = o.items.map(item => `
      <div class="confirm-item">
        <div class="confirm-item-name">
          ${item.product_name}
          <div class="confirm-item-meta">${item.colour} · ${item.size} · Qty: ${item.qty}</div>
        </div>
        <span>${fmt(item.line_total)}</span>
      </div>
    `).join('') + `
      <div class="confirm-item" style="color:#7A6550">
        <span>Subtotal</span><span>${fmt(o.subtotal)}</span>
      </div>
      <div class="confirm-item" style="color:#7A6550">
        <span>Shipping</span>
        <span>${o.shipping_fee === 0 ? 'FREE 🎉' : fmt(o.shipping_fee)}</span>
      </div>
    `;

    // Total
    document.getElementById('confirmTotal').textContent = fmt(o.total);

    show('confirmationContent');

  } catch (err) {
    console.error(err);
    show('errorMsg');
  }
}

function show(id) {
  document.getElementById('loadingMsg').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
}

loadConfirmation();
