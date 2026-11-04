// Shopping cart: stored in localStorage (non-sensitive data only) + the cart page.
// Prices and stock saved here are only for display. The server re-checks everything at checkout.
const KMartCart = (() => {
  const KEY = 'kmart_cart';
  const MAX_QTY = 20;

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((i) => i && typeof i.productId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0 && Number.isFinite(Number(i.price)))
        .map((i) => ({ productId: i.productId, name: String(i.name || ''), price: Number(i.price), imageUrl: String(i.imageUrl || ''), stock: Number(i.stock) || 0, quantity: i.quantity }));
    } catch (e) {
      return [];
    }
  }
  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage full or blocked */ }
    window.dispatchEvent(new Event('kmart:cart'));
  }
  const limitFor = (item) => Math.max(0, Math.min(item.stock, MAX_QTY));

  const api = {
    MAX_QTY,
    items: read,
    count: () => read().reduce((n, i) => n + i.quantity, 0),
    // Totals are summed in whole paise to avoid 0.1 + 0.2 style errors.
    subtotal: (item) => Math.round(item.price * 100) * item.quantity / 100,
    total: () => read().reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0) / 100,

    add(product, qty = 1) {
      if (!product.isActive || product.stock < 1) return { ok: false, message: `${product.name} is out of stock.` };
      const items = read();
      const existing = items.find((i) => i.productId === product.id);
      const snapshot = { productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, stock: product.stock };
      if (existing) Object.assign(existing, snapshot);
      const current = existing ? existing.quantity : 0;
      const max = Math.min(product.stock, MAX_QTY);
      if (current >= max) return { ok: false, message: `You already have the maximum available (${max}) of ${product.name}.` };
      const next = Math.min(current + qty, max);
      if (existing) existing.quantity = next; else items.push({ ...snapshot, quantity: next });
      write(items);
      return { ok: true, message: next < current + qty ? `Added. Only ${max} available, so the quantity was limited.` : `${product.name} added to your cart.` };
    },
    setQuantity(productId, qty) {
      const items = read();
      const item = items.find((i) => i.productId === productId);
      if (!item) return;
      const q = Math.floor(Number(qty));
      item.quantity = Number.isFinite(q) ? Math.min(Math.max(q, 1), limitFor(item) || 1) : 1;
      write(items);
    },
    remove(productId) { write(read().filter((i) => i.productId !== productId)); },
    clear() { write([]); },

    // Refreshes prices/stock from the server. Returns a list of messages about what changed.
    async sync() {
      const items = read();
      if (!items.length) return [];
      const res = await API.get('/products', { ids: items.map((i) => i.productId).join(','), limit: 50 });
      const fresh = new Map(res.data.products.map((p) => [p.id, p]));
      const notes = [];
      const kept = [];
      items.forEach((item) => {
        const p = fresh.get(item.productId);
        if (!p || !p.isActive || p.stock < 1) { notes.push(`"${item.name}" is no longer available and was removed.`); return; }
        if (p.price !== item.price) notes.push(`The price of "${p.name}" changed to ${App.formatPrice(p.price)}.`);
        const updated = { ...item, name: p.name, price: p.price, imageUrl: p.imageUrl, stock: p.stock };
        const max = limitFor(updated);
        if (updated.quantity > max) { notes.push(`Only ${max} of "${p.name}" available, quantity reduced.`); updated.quantity = max; }
        kept.push(updated);
      });
      write(kept);
      return notes;
    },
  };
  return api;
})();

/* ---------------- Cart page ---------------- */
(function () {
  const root = document.getElementById('cart-page');
  if (!root) return;
  const { el } = App;

  function render() {
    const items = KMartCart.items();
    App.clear(root);
    if (!items.length) {
      return App.showEmpty(root, { icon: 'cart-x', title: 'Your cart is empty', text: 'Add something from the catalogue and it will show up here.', action: { href: '/products.html', label: 'Browse products' } });
    }
    const rows = items.map((item) => {
      const max = Math.min(item.stock, KMartCart.MAX_QTY);
      const input = el('input', { type: 'number', class: 'form-control form-control-sm', min: 1, max, value: item.quantity, 'aria-label': `Quantity for ${item.name}` });
      input.addEventListener('change', () => { KMartCart.setQuantity(item.productId, input.value); render(); });
      return el('tr', {},
        el('td', {}, el('div', { class: 'd-flex align-items-center gap-3' }, App.img(item.imageUrl, '', 'cart-thumb'),
          el('div', {}, el('a', { class: 'fw-semibold text-decoration-none', href: `/product-details.html?id=${encodeURIComponent(item.productId)}`, text: item.name }), el('div', { class: 'small text-muted', text: `${App.formatPrice(item.price)} each` })))),
        el('td', {}, el('div', { class: 'input-group input-group-sm qty-control' },
          el('button', { type: 'button', class: 'btn btn-outline-secondary', 'aria-label': `Decrease quantity of ${item.name}`, disabled: item.quantity <= 1, onclick: () => { KMartCart.setQuantity(item.productId, item.quantity - 1); render(); } }, App.icon('dash')),
          input,
          el('button', { type: 'button', class: 'btn btn-outline-secondary', 'aria-label': `Increase quantity of ${item.name}`, disabled: item.quantity >= max, onclick: () => { KMartCart.setQuantity(item.productId, item.quantity + 1); render(); } }, App.icon('plus')))),
        el('td', { class: 'text-end fw-semibold', text: App.formatPrice(KMartCart.subtotal(item)) }),
        el('td', { class: 'text-end' }, el('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', 'aria-label': `Remove ${item.name} from cart`, onclick: () => { KMartCart.remove(item.productId); render(); App.toast(`${item.name} removed.`, 'secondary'); } }, App.icon('trash'))));
    });

    root.append(el('div', { class: 'row g-4' },
      el('div', { class: 'col-lg-8' }, el('div', { class: 'card' }, el('div', { class: 'table-responsive' }, el('table', { class: 'table mb-0' },
        el('caption', { class: 'visually-hidden', text: 'Items in your cart' }),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Product' }), el('th', { scope: 'col', text: 'Quantity' }), el('th', { scope: 'col', class: 'text-end', text: 'Subtotal' }), el('th', { scope: 'col', class: 'text-end' }, el('span', { class: 'visually-hidden', text: 'Remove' })))),
        el('tbody', {}, rows))))),
      el('div', { class: 'col-lg-4' }, el('div', { class: 'card' }, el('div', { class: 'card-body' },
        el('h2', { class: 'h5', text: 'Order summary' }),
        el('div', { class: 'd-flex justify-content-between' }, el('span', { text: `Items (${KMartCart.count()})` }), el('span', { text: App.formatPrice(KMartCart.total()) })),
        el('hr'),
        el('div', { class: 'd-flex justify-content-between fs-5 fw-bold mb-3' }, el('span', { text: 'Total' }), el('span', { text: App.formatPrice(KMartCart.total()) })),
        el('p', { class: 'small text-muted', text: 'Pay at the store counter when you pick up your order.' }),
        el('a', { class: 'btn btn-primary w-100 mb-2', href: '/checkout.html', text: 'Proceed to checkout' }),
        el('a', { class: 'btn btn-outline-primary w-100 mb-2', href: '/products.html', text: 'Continue shopping' }),
        el('button', { type: 'button', class: 'btn btn-link text-danger w-100', onclick: async () => {
          if (await App.confirm('Remove every item from your cart?', { title: 'Clear cart', confirmText: 'Clear cart' })) { KMartCart.clear(); render(); }
        }, text: 'Clear cart' }))))));
  }

  App.start(async () => {
    App.showLoading(root, 'Checking prices and availability...');
    try {
      const notes = await KMartCart.sync();
      notes.forEach((n) => App.toast(n, 'warning'));
    } catch (err) { App.toast('Could not refresh prices. Showing saved cart.', 'warning'); }
    render();
  });
})();
