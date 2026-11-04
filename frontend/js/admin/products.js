(function () {
  const { el } = App;
  const form = document.getElementById('filter-form');
  const root = document.getElementById('product-table');
  const pager = document.getElementById('pager');
  let page = 1;
  let requestId = 0;

  const query = () => {
    const q = {};
    ['search', 'category', 'status'].forEach((f) => { if (form.elements[f].value.trim()) q[f] = form.elements[f].value.trim(); });
    if (form.elements.lowStock.checked) q.lowStock = 'true';
    return q;
  };

  async function adjustStock(p) {
    // A small dialog asking for a +/- change.
    const input = el('input', { type: 'number', class: 'form-control', id: 'adj', step: 1, value: 0, 'aria-describedby': 'adj-help' });
    const error = el('div', { class: 'text-danger small mt-1', role: 'alert' });
    const modalEl = el('div', { class: 'modal fade', tabindex: '-1', 'aria-labelledby': 'adj-title', 'aria-hidden': 'true' }, el('div', { class: 'modal-dialog modal-dialog-centered' }, el('div', { class: 'modal-content' },
      el('div', { class: 'modal-header' }, el('h2', { class: 'modal-title h5', id: 'adj-title', text: `Adjust stock: ${p.name}` }), el('button', { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'modal', 'aria-label': 'Close' })),
      el('div', { class: 'modal-body' }, el('p', { text: `Current stock: ${p.stock}` }), el('label', { for: 'adj', class: 'form-label', text: 'Change by' }), input,
        el('div', { id: 'adj-help', class: 'form-text', text: 'Use a positive number to add stock (e.g. 20) or a negative one to remove (e.g. -3).' }), error),
      el('div', { class: 'modal-footer' }, el('button', { type: 'button', class: 'btn btn-outline-secondary', 'data-bs-dismiss': 'modal', text: 'Cancel' }),
        el('button', { type: 'button', class: 'btn btn-primary', id: 'adj-save', text: 'Save stock' })))));
    document.body.append(modalEl);
    const modal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    modalEl.addEventListener('shown.bs.modal', () => input.focus());
    modalEl.querySelector('#adj-save').addEventListener('click', async () => {
      const n = Number(input.value);
      if (!Number.isInteger(n) || n === 0) { error.textContent = 'Enter a whole number other than 0.'; return; }
      try {
        const res = await API.patch(`/products/${encodeURIComponent(p.id)}/stock`, { adjustment: n });
        modal.hide();
        App.toast(`Stock for ${p.name} is now ${res.data.product.stock}.`);
        load();
      } catch (err) { error.textContent = err.message; }
    });
    modal.show();
  }

  async function remove(p) {
    if (!(await App.confirm(`Delete "${p.name}"? If it appears in past orders it will be hidden instead, so order history stays correct.`, { title: 'Delete product', confirmText: 'Delete' }))) return;
    try {
      const res = await API.delete(`/products/${encodeURIComponent(p.id)}`);
      App.toast(res.message, res.data.deleted ? 'success' : 'warning');
      load();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function load() {
    const id = ++requestId;
    App.showLoading(root, 'Loading products...');
    try {
      const res = await API.get('/admin/products', { ...query(), page, limit: 10, sort: 'name_asc' });
      if (id !== requestId) return;
      const { products, pagination } = res.data;
      if (!products.length) {
        App.clear(pager);
        return App.showEmpty(root, { icon: 'box-seam', title: 'No products found', text: 'Try different filters, or add a new product.', action: { href: '/admin/product-form.html', label: 'Add product' } });
      }
      const rows = products.map((p) => {
        const low = p.stock <= 5;
        return el('tr', {},
          el('td', {}, App.img(p.imageUrl, '', 'admin-thumb')),
          el('td', {}, el('div', { class: 'fw-semibold', text: p.name }), el('small', { class: 'text-muted', text: p.category })),
          el('td', { text: App.formatPrice(p.price) }),
          el('td', {}, el('span', { class: `badge ${p.stock === 0 ? 'text-bg-danger' : low ? 'text-bg-warning' : 'text-bg-light border'}`, text: p.stock === 0 ? 'Out of stock' : low ? `${p.stock} (low)` : String(p.stock) })),
          el('td', {}, el('span', { class: `badge ${p.isActive ? 'text-bg-success' : 'text-bg-secondary'}`, text: p.isActive ? 'Active' : 'Hidden' }), p.isFeatured && el('span', { class: 'badge text-bg-info ms-1', text: 'Featured' })),
          el('td', { class: 'text-end text-nowrap' },
            el('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary me-1', onclick: () => adjustStock(p), 'aria-label': `Adjust stock for ${p.name}` }, App.icon('plus-slash-minus')),
            el('a', { class: 'btn btn-sm btn-outline-primary me-1', href: `/admin/product-form.html?id=${encodeURIComponent(p.id)}`, 'aria-label': `Edit ${p.name}` }, App.icon('pencil')),
            el('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', onclick: () => remove(p), 'aria-label': `Delete ${p.name}` }, App.icon('trash'))));
      });
      App.clear(root).append(el('div', { class: 'card' }, el('div', { class: 'table-responsive' }, el('table', { class: 'table table-hover mb-0' },
        el('caption', { class: 'visually-hidden', text: 'Products' }),
        el('thead', {}, el('tr', {}, ['Image', 'Product', 'Price', 'Stock', 'Status'].map((h) => el('th', { scope: 'col', text: h })), el('th', { scope: 'col', class: 'text-end', text: 'Actions' }))),
        el('tbody', {}, rows)))));
      App.pagination(pager, pagination, (p) => { page = p; load(); });
    } catch (err) { if (id === requestId) App.showError(root, err.message, load); }
  }

  App.start(async () => {
    const q = new URLSearchParams(location.search);
    if (q.get('lowStock') === 'true') form.elements.lowStock.checked = true;
    if (q.get('saved')) App.toast('Product saved.');
    try {
      (await API.get('/products/categories')).data.categories.forEach((c) => form.elements.category.append(el('option', { value: c.name, text: c.name })));
    } catch (e) { /* optional */ }
    const reload = () => { page = 1; load(); };
    form.addEventListener('submit', (e) => { e.preventDefault(); reload(); });
    form.elements.search.addEventListener('input', App.debounce(reload, 300));
    ['category', 'status', 'lowStock'].forEach((f) => form.elements[f].addEventListener('change', reload));
    await load();
  }, { auth: 'admin' });
})();
