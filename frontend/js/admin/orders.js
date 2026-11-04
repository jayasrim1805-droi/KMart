(function () {
  const { el } = App;
  const form = document.getElementById('filter-form');
  const root = document.getElementById('order-table');
  const pager = document.getElementById('pager');
  let page = 1;
  let requestId = 0;

  // Mirrors the server's rules (the server is the one that really enforces them).
  const NEXT = { 'Pending': ['Confirmed', 'Cancelled'], 'Confirmed': ['Ready for Pickup', 'Cancelled'], 'Ready for Pickup': ['Completed', 'Cancelled'], 'Completed': [], 'Cancelled': [] };

  async function changeStatus(order, status, modal) {
    if (status === 'Cancelled' && !(await App.confirm(`Cancel order ${order.orderNumber}? Its items will be returned to stock. This cannot be undone.`, { title: 'Cancel order', confirmText: 'Cancel order' }))) return;
    try {
      const res = await API.patch(`/admin/orders/${encodeURIComponent(order.id)}/status`, { status });
      App.toast(res.message);
      modal.hide();
      load();
    } catch (err) { App.toast(err.message, 'danger'); load(); }
  }

  function showDetails(order) {
    const next = NEXT[order.status] || [];
    const pick = order.pickupInformation || {};
    const items = order.items.map((i) => el('tr', {}, el('td', { text: i.name }), el('td', { class: 'text-end', text: App.formatPrice(i.price) }), el('td', { class: 'text-end', text: i.quantity }), el('td', { class: 'text-end', text: App.formatPrice(Math.round(i.price * 100) * i.quantity / 100) })));
    const modalEl = el('div', { class: 'modal fade', tabindex: '-1', 'aria-labelledby': 'od-title', 'aria-hidden': 'true' }, el('div', { class: 'modal-dialog modal-lg modal-dialog-scrollable' }, el('div', { class: 'modal-content' },
      el('div', { class: 'modal-header' }, el('h2', { class: 'modal-title h5', id: 'od-title', text: `Order ${order.orderNumber}` }), el('button', { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'modal', 'aria-label': 'Close' })),
      el('div', { class: 'modal-body' },
        el('div', { class: 'd-flex flex-wrap gap-3 align-items-center mb-3' }, App.statusBadge(order.status), el('span', { class: 'text-muted small', text: `Placed ${App.formatDate(order.createdAt)}` })),
        el('p', { class: 'mb-1' }, el('strong', { text: 'Student: ' }), order.user ? `${order.user.name} (${order.user.email})` : 'Deleted account'),
        el('p', { class: 'mb-1' }, el('strong', { text: 'Pickup name: ' }), pick.contactName || '-'),
        pick.phone && el('p', { class: 'mb-1' }, el('strong', { text: 'Phone: ' }), pick.phone),
        pick.note && el('p', { class: 'mb-1' }, el('strong', { text: 'Note: ' }), pick.note),
        el('div', { class: 'table-responsive mt-3' }, el('table', { class: 'table table-sm' },
          el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Item' }), el('th', { scope: 'col', class: 'text-end', text: 'Price' }), el('th', { scope: 'col', class: 'text-end', text: 'Qty' }), el('th', { scope: 'col', class: 'text-end', text: 'Subtotal' }))),
          el('tbody', {}, items), el('tfoot', {}, el('tr', {}, el('th', { colspan: 3, class: 'text-end', text: 'Total' }), el('th', { class: 'text-end', text: App.formatPrice(order.totalAmount) }))))),
        el('h3', { class: 'h6', text: 'History' }),
        el('ul', { class: 'timeline' }, (order.statusHistory || []).map((h) => el('li', {}, el('span', { class: 'fw-semibold', text: h.status }), el('span', { class: 'small text-muted ms-2', text: App.formatDate(h.changedAt) }))))),
      el('div', { class: 'modal-footer justify-content-between' },
        el('span', { class: 'small text-muted', text: next.length ? 'Update the status:' : 'This order is finished and cannot be changed.' }),
        el('div', { class: 'd-flex gap-2' }, next.map((s) => el('button', { type: 'button', class: `btn ${s === 'Cancelled' ? 'btn-outline-danger' : 'btn-primary'}`, onclick: () => changeStatus(order, s, modal), text: s === 'Cancelled' ? 'Cancel order' : `Mark ${s}` })))))));
    document.body.append(modalEl);
    const modal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    modal.show();
  }

  async function load() {
    const id = ++requestId;
    App.showLoading(root, 'Loading orders...');
    const q = {};
    if (form.elements.q.value.trim()) q.q = form.elements.q.value.trim();
    if (form.elements.status.value) q.status = form.elements.status.value;
    try {
      const res = await API.get('/admin/orders', { ...q, page, limit: 10 });
      if (id !== requestId) return;
      const { orders, pagination } = res.data;
      if (!orders.length) { App.clear(pager); return App.showEmpty(root, { icon: 'receipt', title: 'No orders found', text: 'Try a different search or status.' }); }
      const rows = orders.map((o) => el('tr', {},
        el('td', { class: 'fw-semibold', text: o.orderNumber }),
        el('td', {}, el('div', { text: o.user ? o.user.name : 'Deleted account' }), el('small', { class: 'text-muted', text: o.user ? o.user.email : '' })),
        el('td', { text: App.formatDate(o.createdAt) }), el('td', { text: o.items.reduce((n, i) => n + i.quantity, 0) }),
        el('td', { text: App.formatPrice(o.totalAmount) }), el('td', {}, App.statusBadge(o.status)),
        el('td', { class: 'text-end' }, el('button', { type: 'button', class: 'btn btn-sm btn-outline-primary', onclick: () => showDetails(o), 'aria-label': `View order ${o.orderNumber}`, text: 'Details' }))));
      App.clear(root).append(el('div', { class: 'card' }, el('div', { class: 'table-responsive' }, el('table', { class: 'table table-hover mb-0' },
        el('caption', { class: 'visually-hidden', text: 'Customer orders' }),
        el('thead', {}, el('tr', {}, ['Order', 'Student', 'Placed', 'Items', 'Total', 'Status'].map((h) => el('th', { scope: 'col', text: h })), el('th', { scope: 'col' }, el('span', { class: 'visually-hidden', text: 'Actions' })))),
        el('tbody', {}, rows)))));
      App.pagination(pager, pagination, (p) => { page = p; load(); });
    } catch (err) { if (id === requestId) App.showError(root, err.message, load); }
  }

  App.start(async () => {
    const reload = () => { page = 1; load(); };
    form.addEventListener('submit', (e) => { e.preventDefault(); reload(); });
    form.elements.q.addEventListener('input', App.debounce(reload, 300));
    form.elements.status.addEventListener('change', reload);
    await load();
  }, { auth: 'admin' });
})();
