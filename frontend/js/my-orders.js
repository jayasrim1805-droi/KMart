(function () {
  const { el } = App;
  const root = document.getElementById('orders-list');
  const pager = document.getElementById('pager');
  let page = 1;

  async function load() {
    App.showLoading(root, 'Loading your orders...');
    try {
      const res = await API.get('/orders/my-orders', { page, limit: 8 });
      const { orders, pagination } = res.data;
      if (!orders.length) {
        App.clear(pager);
        return App.showEmpty(root, { icon: 'receipt', title: 'No orders yet', text: 'When you place an order it will appear here.', action: { href: '/products.html', label: 'Start shopping' } });
      }
      App.clear(root).append(el('div', { class: 'd-grid gap-3' }, orders.map((o) => {
        const count = o.items.reduce((n, i) => n + i.quantity, 0);
        return el('article', { class: 'card' }, el('div', { class: 'card-body d-flex flex-wrap align-items-center gap-3' },
          el('div', { class: 'me-auto' },
            el('h2', { class: 'h6 mb-1' }, el('a', { class: 'text-decoration-none', href: `/order-details.html?id=${encodeURIComponent(o.id)}`, text: o.orderNumber })),
            el('div', { class: 'small text-muted', text: App.formatDate(o.createdAt) }),
            el('div', { class: 'small', text: o.items.slice(0, 2).map((i) => `${i.quantity} x ${i.name}`).join(', ') + (o.items.length > 2 ? ` and ${o.items.length - 2} more` : '') })),
          el('div', { class: 'text-end' }, el('div', { class: 'price', text: App.formatPrice(o.totalAmount) }), el('small', { class: 'text-muted', text: `${count} item${count === 1 ? '' : 's'}` })),
          App.statusBadge(o.status),
          el('a', { class: 'btn btn-outline-primary btn-sm', href: `/order-details.html?id=${encodeURIComponent(o.id)}`, text: 'View details' })));
      })));
      App.pagination(pager, pagination, (p) => { page = p; load(); window.scrollTo({ top: 0 }); });
    } catch (err) { App.showError(root, err.message, load); }
  }
  App.start(load, { auth: 'user' });
})();
