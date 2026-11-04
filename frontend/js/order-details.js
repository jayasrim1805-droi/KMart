(function () {
  const { el } = App;
  const root = document.getElementById('order-detail');
  const CANCELLABLE = ['Pending', 'Confirmed']; // matches the server rule for students

  async function load() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) return App.showEmpty(root, { icon: 'question-circle', title: 'No order selected', action: { href: '/my-orders.html', label: 'My orders' } });
    App.showLoading(root);
    let order;
    try {
      order = (await API.get(`/orders/${encodeURIComponent(id)}`)).data.order;
    } catch (err) {
      if (err.status === 403 || err.status === 404 || err.status === 400) {
        return App.showEmpty(root, { icon: 'lock', title: 'Order not found', text: 'This order does not exist or belongs to another account.', action: { href: '/my-orders.html', label: 'My orders' } });
      }
      return App.showError(root, err.message, load);
    }
    const isOwner = order.user && order.user.id === App.session.user.id;
    const rows = order.items.map((i) => el('tr', {},
      el('td', {}, el('div', { class: 'd-flex align-items-center gap-3' }, App.img(i.imageUrl, '', 'cart-thumb'), el('span', { text: i.name }))),
      el('td', { class: 'text-end', text: App.formatPrice(i.price) }), el('td', { class: 'text-end', text: i.quantity }),
      el('td', { class: 'text-end fw-semibold', text: App.formatPrice(Math.round(i.price * 100) * i.quantity / 100) })));
    const cancelBtn = isOwner && CANCELLABLE.includes(order.status) && el('button', { type: 'button', class: 'btn btn-outline-danger', onclick: async () => {
      if (!(await App.confirm('Cancel this order? The items go back into stock.', { title: 'Cancel order', confirmText: 'Cancel order' }))) return;
      try { await API.patch(`/orders/${encodeURIComponent(order.id)}/cancel`); App.toast('Order cancelled.', 'success'); load(); }
      catch (err) { App.toast(err.message, 'danger'); load(); }
    } }, 'Cancel order');
    const pick = order.pickupInformation || {};

    App.clear(root).append(
      params.get('placed') === '1' && el('div', { class: 'alert alert-success', role: 'status' }, el('h2', { class: 'h5', text: 'Order placed!' }),
        el('p', { class: 'mb-0' }, 'Your order reference is ', el('strong', { text: order.orderNumber }), '. Show it at the KMart counter to collect and pay for your items.')),
      el('nav', { 'aria-label': 'Breadcrumb' }, el('ol', { class: 'breadcrumb' }, el('li', { class: 'breadcrumb-item' }, el('a', { href: '/my-orders.html', text: 'My orders' })), el('li', { class: 'breadcrumb-item active', 'aria-current': 'page', text: order.orderNumber }))),
      el('div', { class: 'd-flex flex-wrap align-items-center gap-3 mb-3' }, el('h1', { class: 'page-title mb-0 me-auto', text: order.orderNumber }), App.statusBadge(order.status), cancelBtn),
      el('div', { class: 'row g-4' },
        el('div', { class: 'col-lg-8' }, el('div', { class: 'card' }, el('div', { class: 'table-responsive' }, el('table', { class: 'table mb-0' },
          el('caption', { class: 'visually-hidden', text: 'Items in this order' }),
          el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Item' }), el('th', { scope: 'col', class: 'text-end', text: 'Price' }), el('th', { scope: 'col', class: 'text-end', text: 'Qty' }), el('th', { scope: 'col', class: 'text-end', text: 'Subtotal' }))),
          el('tbody', {}, rows),
          el('tfoot', {}, el('tr', {}, el('th', { colspan: 3, class: 'text-end', text: 'Total' }), el('th', { class: 'text-end', text: App.formatPrice(order.totalAmount) }))))))),
        el('div', { class: 'col-lg-4' },
          el('div', { class: 'card mb-3' }, el('div', { class: 'card-body' }, el('h2', { class: 'h6', text: 'Pickup details' }),
            el('p', { class: 'mb-1', text: `Name: ${pick.contactName || '-'}` }), pick.phone && el('p', { class: 'mb-1', text: `Phone: ${pick.phone}` }),
            pick.note && el('p', { class: 'mb-1', text: `Note: ${pick.note}` }), el('p', { class: 'small text-muted mb-0', text: `Placed ${App.formatDate(order.createdAt)}. Pay at the counter.` }))),
          el('div', { class: 'card' }, el('div', { class: 'card-body' }, el('h2', { class: 'h6', text: 'Progress' }),
            el('ul', { class: 'timeline' }, (order.statusHistory || []).map((h) => el('li', {}, el('div', { class: 'fw-semibold', text: h.status }), el('div', { class: 'small text-muted', text: App.formatDate(h.changedAt) })))))))));
  }
  App.start(load, { auth: 'user' });
})();
