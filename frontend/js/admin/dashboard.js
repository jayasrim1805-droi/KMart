(function () {
  const { el } = App;
  const root = document.getElementById('dashboard');

  const statCard = (label, value, icon, cls = '') => el('div', { class: 'col-6 col-lg-3' }, el('div', { class: `card stat-card h-100 ${cls}` }, el('div', { class: 'card-body' },
    el('div', { class: 'text-muted small' }, App.icon(icon, 'me-1'), label), el('div', { class: 'stat-value', text: value }))));

  async function load() {
    App.showLoading(root, 'Loading dashboard...');
    try {
      const { stats, lowStockProducts, recentOrders } = (await API.get('/admin/dashboard')).data;
      App.clear(root).append(
        el('div', { class: 'row g-3 mb-4' },
          statCard('Total products', stats.totalProducts, 'box-seam'),
          statCard('Total orders', stats.totalOrders, 'receipt'),
          statCard('Pending orders', stats.pendingOrders, 'hourglass-split', stats.pendingOrders ? 'warn' : ''),
          statCard('Completed orders', stats.completedOrders, 'check2-circle'),
          statCard('Total sales', App.formatPrice(stats.totalSales), 'currency-rupee'),
          statCard('Low-stock products', stats.lowStockCount, 'exclamation-triangle', stats.lowStockCount ? 'alert' : ''),
          statCard('Cancelled orders', stats.cancelledOrders, 'x-circle'),
          statCard('Visible to students', stats.activeProducts, 'eye')),
        el('p', { class: 'small text-muted' }, App.icon('info-circle', 'me-1'),
          `Total sales adds up only orders marked Completed. Pending, Confirmed and Ready orders are not counted yet, and Cancelled orders never are. Low stock means ${stats.lowStockThreshold} or fewer in stock.`),
        el('div', { class: 'row g-4' },
          el('div', { class: 'col-lg-6' }, el('div', { class: 'card h-100' }, el('div', { class: 'card-body' },
            el('div', { class: 'd-flex justify-content-between align-items-center mb-2' }, el('h2', { class: 'h5 mb-0', text: 'Low-stock products' }), el('a', { class: 'btn btn-sm btn-outline-primary', href: '/admin/products.html?lowStock=true', text: 'View all' })),
            lowStockProducts.length
              ? el('ul', { class: 'list-group list-group-flush' }, lowStockProducts.map((p) => el('li', { class: 'list-group-item d-flex justify-content-between align-items-center' },
                  el('a', { href: `/admin/product-form.html?id=${encodeURIComponent(p.id)}`, text: p.name }), el('span', { class: `badge ${p.stock === 0 ? 'text-bg-danger' : 'text-bg-warning'}`, text: p.stock === 0 ? 'Out of stock' : `${p.stock} left` }))))
              : el('p', { class: 'text-muted mb-0', text: 'Everything is well stocked.' })))),
          el('div', { class: 'col-lg-6' }, el('div', { class: 'card h-100' }, el('div', { class: 'card-body' },
            el('div', { class: 'd-flex justify-content-between align-items-center mb-2' }, el('h2', { class: 'h5 mb-0', text: 'Recent orders' }), el('a', { class: 'btn btn-sm btn-outline-primary', href: '/admin/orders.html', text: 'Manage orders' })),
            recentOrders.length
              ? el('ul', { class: 'list-group list-group-flush' }, recentOrders.map((o) => el('li', { class: 'list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2' },
                  el('span', {}, el('strong', { text: o.orderNumber }), el('br'), el('small', { class: 'text-muted', text: `${o.user ? o.user.name : 'Deleted user'} - ${App.formatPrice(o.totalAmount)}` })), App.statusBadge(o.status))))
              : el('p', { class: 'text-muted mb-0', text: 'No orders yet.' }))))));
    } catch (err) { App.showError(root, err.message, load); }
  }
  App.start(load, { auth: 'admin' });
})();
