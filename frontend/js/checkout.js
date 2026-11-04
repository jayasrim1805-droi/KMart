(function () {
  const { el } = App;
  const root = document.getElementById('checkout-page');
  if (!root) return;

  // One key per cart contents: if the request is repeated (double click, retry) the server returns the same order.
  function idempotencyKey() {
    const sig = KMartCart.items().map((i) => `${i.productId}:${i.quantity}`).sort().join('|');
    try {
      const saved = JSON.parse(sessionStorage.getItem('kmart_checkout') || 'null');
      if (saved && saved.sig === sig) return saved.key;
      const key = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'k' + Date.now() + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('kmart_checkout', JSON.stringify({ sig, key }));
      return key;
    } catch (e) {
      return 'k' + Date.now() + Math.random().toString(36).slice(2, 10);
    }
  }

  function render(user, messages = []) {
    const items = KMartCart.items();
    App.clear(root);
    if (!items.length) {
      return App.showEmpty(root, { icon: 'cart-x', title: 'Nothing to check out', text: 'Your cart is empty.', action: { href: '/products.html', label: 'Browse products' } });
    }
    const alertBox = el('div', { id: 'checkout-alert', 'aria-live': 'polite' }, messages.map((m) => el('div', { class: 'alert alert-warning', role: 'alert', text: m })));
    const field = (id, label, attrs, help) => el('div', { class: 'mb-3' },
      el('label', { for: id, class: 'form-label', text: label }), el('input', { id, name: id, class: 'form-control', ...attrs }),
      help && el('div', { class: 'form-text', text: help }), el('div', { class: 'invalid-feedback', 'data-error-for': id }));
    const form = el('form', { id: 'checkout-form', novalidate: true },
      field('contactName', 'Name for pickup', { type: 'text', value: user.name, maxlength: 60, required: true, autocomplete: 'name' }),
      field('phone', 'Phone number (optional)', { type: 'tel', maxlength: 20, autocomplete: 'tel', inputmode: 'tel' }, 'Only used if the store needs to reach you about this order.'),
      el('div', { class: 'mb-3' }, el('label', { for: 'note', class: 'form-label', text: 'Note for the store (optional)' }),
        el('textarea', { id: 'note', name: 'note', class: 'form-control', rows: 3, maxlength: 200 }), el('div', { class: 'invalid-feedback', 'data-error-for': 'note' })),
      el('button', { type: 'submit', class: 'btn btn-primary btn-lg w-100', text: 'Confirm order' }));

    const summary = items.map((i) => el('li', { class: 'list-group-item d-flex justify-content-between gap-3' },
      el('span', { text: `${i.quantity} x ${i.name}` }), el('span', { class: 'text-nowrap', text: App.formatPrice(KMartCart.subtotal(i)) })));

    root.append(el('div', { class: 'row g-4' },
      el('div', { class: 'col-lg-7' }, alertBox, el('div', { class: 'card' }, el('div', { class: 'card-body' },
        el('h2', { class: 'h5', text: 'Pickup details' }),
        el('p', { class: 'text-muted small', text: 'You collect this order at the campus store counter and pay there. No online payment is needed.' }), form))),
      el('div', { class: 'col-lg-5' }, el('div', { class: 'card' }, el('div', { class: 'card-body' },
        el('h2', { class: 'h5', text: 'Order summary' }), el('ul', { class: 'list-group list-group-flush mb-3' }, summary),
        el('div', { class: 'd-flex justify-content-between fs-5 fw-bold', text: '' }, el('span', { text: 'Total' }), el('span', { text: App.formatPrice(KMartCart.total()) })),
        el('a', { class: 'btn btn-link px-0', href: '/cart.html', text: 'Edit cart' }))))));

    form.addEventListener('submit', (e) => submit(e, form, user));
  }

  let submitting = false;
  async function submit(e, form, user) {
    e.preventDefault();
    if (submitting) return; // blocks double clicks
    const name = form.elements.contactName.value.trim();
    const phone = form.elements.phone.value.trim();
    const errors = [];
    if (!name) errors.push({ field: 'contactName', message: 'Enter the name to use for pickup.' });
    if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) errors.push({ field: 'phone', message: 'Enter a valid phone number.' });
    App.showFieldErrors(form, errors);
    if (errors.length) return form.querySelector('.is-invalid').focus();

    submitting = true;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Placing order...';
    try {
      const res = await API.post('/orders', {
        items: KMartCart.items().map((i) => ({ productId: i.productId, quantity: i.quantity })), // only IDs and quantities
        pickupInformation: { contactName: name, phone, note: form.elements.note.value.trim() },
        idempotencyKey: idempotencyKey(),
      });
      KMartCart.clear();
      try { sessionStorage.removeItem('kmart_checkout'); } catch (err) { /* ignore */ }
      location.href = `/order-details.html?id=${encodeURIComponent(res.data.order.id)}&placed=1`;
    } catch (err) {
      submitting = false;
      if (err.status === 401) return App.requireLogin();
      // The cart is kept. For stock/price problems, refresh it so the student sees what changed.
      let notes = [err.message];
      if (err.status === 409) { try { notes = notes.concat(await KMartCart.sync()); } catch (x) { /* ignore */ } }
      render(user, notes);
      if (err.errors && err.errors.length) App.showFieldErrors(document.getElementById('checkout-form'), err.errors);
      document.getElementById('checkout-alert').scrollIntoView({ block: 'nearest' });
    }
  }

  App.start(async () => {
    App.showLoading(root, 'Checking availability...');
    let notes = [];
    try { notes = await KMartCart.sync(); } catch (err) { /* server will re-check anyway */ }
    render(App.session.user, notes);
  }, { auth: 'user' });
})();
