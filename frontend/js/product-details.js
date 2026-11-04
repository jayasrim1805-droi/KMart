(function () {
  const { el } = App;
  const root = document.getElementById('product-detail');

  App.start(async () => {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) return App.showEmpty(root, { icon: 'question-circle', title: 'No product selected', action: { href: '/products.html', label: 'Browse products' } });
    App.showLoading(root);
    let product;
    try {
      product = (await API.get(`/products/${encodeURIComponent(id)}`)).data.product;
    } catch (err) {
      return err.status === 404 || err.status === 400
        ? App.showEmpty(root, { icon: 'emoji-frown', title: 'Product not found', text: 'It may have been removed or is no longer sold.', action: { href: '/products.html', label: 'Browse products' } })
        : App.showError(root, err.message, () => location.reload());
    }
    document.title = `${product.name} - KMart`;
    const stock = App.stockInfo(product);
    const available = product.isActive && product.stock > 0;
    const max = Math.min(product.stock, KMartCart.MAX_QTY);

    const qty = el('input', { type: 'number', id: 'qty', class: 'form-control text-center', min: 1, max, value: 1, disabled: !available, 'aria-describedby': 'qty-help qty-error' });
    const qtyError = el('div', { id: 'qty-error', class: 'text-danger small mt-1', role: 'alert' });
    const validQty = () => {
      const n = Number(qty.value);
      if (!Number.isInteger(n) || n < 1) return 'Enter a whole number of 1 or more.';
      if (n > max) return `Only ${max} available per order.`;
      return '';
    };
    const step = (d) => { qty.value = Math.min(Math.max((parseInt(qty.value, 10) || 1) + d, 1), max); qtyError.textContent = ''; };
    qty.addEventListener('input', () => { qtyError.textContent = validQty(); });

    const addBtn = el('button', { type: 'button', class: 'btn btn-primary btn-lg', disabled: !available, onclick: () => {
      const err = validQty();
      qtyError.textContent = err;
      if (err) return qty.focus();
      const r = KMartCart.add(product, Number(qty.value));
      App.toast(r.message, r.ok ? 'success' : 'warning');
    } }, App.icon('cart-plus'), available ? ' Add to cart' : ' Unavailable');

    App.clear(root).append(
      el('nav', { 'aria-label': 'Breadcrumb' }, el('ol', { class: 'breadcrumb' },
        el('li', { class: 'breadcrumb-item' }, el('a', { href: '/products.html', text: 'Products' })),
        el('li', { class: 'breadcrumb-item' }, el('a', { href: `/products.html?category=${encodeURIComponent(product.category)}`, text: product.category })),
        el('li', { class: 'breadcrumb-item active', 'aria-current': 'page', text: product.name }))),
      el('div', { class: 'row g-4 g-lg-5' },
        el('div', { class: 'col-md-6' }, App.img(product.imageUrl, product.name, 'detail-img')),
        el('div', { class: 'col-md-6' },
          el('span', { class: 'badge category-badge mb-2', text: product.category }),
          el('h1', { class: 'page-title', text: product.name }),
          el('p', { class: 'price fs-2 mb-1', text: App.formatPrice(product.price) }),
          el('p', { class: `fw-semibold ${stock.cls}` }, App.icon(available ? 'check-circle' : 'x-circle', 'me-1'), stock.text, available ? ` (${product.stock} available)` : ''),
          el('p', { text: product.description || 'No description provided.' }),
          el('div', { class: 'mb-3', style: null },
            el('label', { for: 'qty', class: 'form-label fw-semibold', text: 'Quantity' }),
            el('div', { class: 'input-group qty-control' },
              el('button', { type: 'button', class: 'btn btn-outline-secondary', 'aria-label': 'Decrease quantity', disabled: !available, onclick: () => step(-1) }, App.icon('dash')),
              qty,
              el('button', { type: 'button', class: 'btn btn-outline-secondary', 'aria-label': 'Increase quantity', disabled: !available, onclick: () => step(1) }, App.icon('plus'))),
            el('div', { id: 'qty-help', class: 'form-text', text: available ? `Up to ${max} per order.` : 'This product cannot be ordered right now.' }), qtyError),
          el('div', { class: 'd-flex flex-wrap gap-2' }, addBtn, el('a', { class: 'btn btn-outline-primary btn-lg', href: '/cart.html', text: 'View cart' })),
          el('p', { class: 'small text-muted mt-3 mb-0' }, App.icon('shop', 'me-1'), 'Pickup only: collect from the KMart counter and pay there.'))));
  });
})();
