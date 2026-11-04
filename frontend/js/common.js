// Shared helpers used by every page: safe DOM building, navbar/footer, toasts, dialogs, session.
(function () {
  const App = (window.App = {});

  // Edit these to match your campus.
  App.store = {
    location: 'Ground floor, Main Block (next to the library)',
    hours: 'Monday to Saturday, 9:00 AM - 5:00 PM',
    email: 'store@kmart.example',
    phone: '+91 00000 00000',
  };

  /* ---------- Safe DOM builder: text is always inserted as text, never as HTML ---------- */
  App.el = function (tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    children.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return node;
  };
  const el = App.el;
  App.icon = (name, extra) => el('i', { class: `bi bi-${name}${extra ? ' ' + extra : ''}`, 'aria-hidden': 'true' });
  App.clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };
  App.$ = (sel, root) => (root || document).querySelector(sel);

  /* ---------- Formatting ---------- */
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
  App.formatPrice = (n) => money.format(Number(n) || 0);
  App.formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  App.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const STATUS_CLASS = { 'Pending': 'status-pending', 'Confirmed': 'status-confirmed', 'Ready for Pickup': 'status-ready', 'Completed': 'status-completed', 'Cancelled': 'status-cancelled' };
  App.statusBadge = (status) => el('span', { class: `badge status-badge ${STATUS_CLASS[status] || 'bg-secondary'}`, text: status });

  const CATEGORY_ICONS = { 'Stationery': 'pencil', 'Books': 'book', 'Snacks': 'cookie', 'Beverages': 'cup-hot', 'Accessories': 'usb-plug', 'College Essentials': 'backpack' };
  App.categoryIcon = (c) => CATEGORY_ICONS[c] || 'tag';

  // Stock text + CSS class. lowStock is the same idea as the server's LOW_STOCK_THRESHOLD (default 5).
  App.stockInfo = (p) => {
    if (!p.isActive) return { text: 'Unavailable', cls: 'stock-out' };
    if (p.stock <= 0) return { text: 'Out of stock', cls: 'stock-out' };
    if (p.stock <= 5) return { text: `Only ${p.stock} left`, cls: 'stock-low' };
    return { text: 'In stock', cls: 'stock-in' };
  };

  // Broken image? Swap in the local placeholder once (the site stays usable if an image URL fails).
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.fallbackUsed) {
      t.dataset.fallbackUsed = '1';
      t.src = '/assets/images/placeholder.svg';
    }
  }, true);
  App.img = (url, alt, cls) => el('img', { src: url || '/assets/images/placeholder.svg', alt: alt || '', class: cls, loading: 'lazy' });

  /* ---------- Page states ---------- */
  App.showLoading = (container, text = 'Loading...') => {
    App.clear(container).append(el('div', { class: 'text-center py-5', role: 'status' },
      el('div', { class: 'spinner-border text-success', 'aria-hidden': 'true' }), el('p', { class: 'mt-2 mb-0 text-muted', text })));
  };
  App.showEmpty = (container, { icon = 'inbox', title, text, action }) => {
    App.clear(container).append(el('div', { class: 'empty-state' }, App.icon(icon), el('h2', { class: 'h4 mt-2', text: title }),
      text && el('p', { class: 'text-muted', text }), action && el('a', { class: 'btn btn-primary', href: action.href, text: action.label })));
  };
  App.showError = (container, message, retry) => {
    App.clear(container).append(el('div', { class: 'alert alert-danger d-flex flex-wrap align-items-center gap-3', role: 'alert' },
      App.icon('exclamation-triangle-fill'), el('span', { class: 'me-auto', text: message }),
      retry && el('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', onclick: retry, text: 'Try again' })));
  };

  /* ---------- Toasts and confirmation dialog (Bootstrap) ---------- */
  App.toast = (message, type = 'success') => {
    let area = document.getElementById('toast-area');
    if (!area) {
      area = el('div', { id: 'toast-area', class: 'toast-container position-fixed bottom-0 end-0 p-3' });
      document.body.append(area);
    }
    const t = el('div', { class: `toast align-items-center text-bg-${type} border-0`, role: type === 'danger' ? 'alert' : 'status', 'aria-live': type === 'danger' ? 'assertive' : 'polite', 'aria-atomic': 'true' },
      el('div', { class: 'd-flex' }, el('div', { class: 'toast-body', text: message }),
        el('button', { type: 'button', class: `btn-close ${type === 'warning' ? '' : 'btn-close-white'} me-2 m-auto`, 'data-bs-dismiss': 'toast', 'aria-label': 'Close' })));
    area.append(t);
    t.addEventListener('hidden.bs.toast', () => t.remove());
    new bootstrap.Toast(t, { delay: 5000 }).show();
  };

  // Returns a Promise<boolean>. Use for anything destructive.
  App.confirm = (message, { title = 'Are you sure?', confirmText = 'Confirm', danger = true } = {}) =>
    new Promise((resolve) => {
      let answer = false;
      const modal = el('div', { class: 'modal fade', tabindex: '-1', 'aria-labelledby': 'confirm-title', 'aria-hidden': 'true' },
        el('div', { class: 'modal-dialog modal-dialog-centered' }, el('div', { class: 'modal-content' },
          el('div', { class: 'modal-header' }, el('h2', { class: 'modal-title h5', id: 'confirm-title', text: title }),
            el('button', { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'modal', 'aria-label': 'Close' })),
          el('div', { class: 'modal-body', text: message }),
          el('div', { class: 'modal-footer' },
            el('button', { type: 'button', class: 'btn btn-outline-secondary', 'data-bs-dismiss': 'modal', text: 'Keep it' }),
            el('button', { type: 'button', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, id: 'confirm-ok', text: confirmText })))));
      document.body.append(modal);
      const bs = new bootstrap.Modal(modal);
      modal.querySelector('#confirm-ok').addEventListener('click', () => { answer = true; bs.hide(); });
      modal.addEventListener('hidden.bs.modal', () => { modal.remove(); resolve(answer); });
      bs.show();
    });

  /* ---------- Pagination control ---------- */
  App.pagination = (container, { page, totalPages }, onChange) => {
    App.clear(container);
    if (totalPages <= 1) return;
    const item = (label, target, { disabled, active, aria } = {}) =>
      el('li', { class: `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}` },
        el('button', { type: 'button', class: 'page-link', 'aria-label': aria, 'aria-current': active ? 'page' : null, disabled, onclick: () => onChange(target), text: label }));
    const pages = [];
    for (let p = 1; p <= totalPages; p++) if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    const list = el('ul', { class: 'pagination justify-content-center flex-wrap' }, item('Previous', page - 1, { disabled: page <= 1 }));
    let prev = 0;
    pages.forEach((p) => {
      if (p - prev > 1) list.append(el('li', { class: 'page-item disabled' }, el('span', { class: 'page-link', text: '...' })));
      list.append(item(String(p), p, { active: p === page, aria: `Page ${p}` }));
      prev = p;
    });
    list.append(item('Next', page + 1, { disabled: page >= totalPages }));
    container.append(el('nav', { 'aria-label': 'Pagination' }, list));
  };

  /* ---------- Product card (shared by home and catalogue) ---------- */
  App.productCard = (p) => {
    const stock = App.stockInfo(p);
    const available = p.isActive && p.stock > 0;
    const addBtn = el('button', { type: 'button', class: 'btn btn-primary btn-sm flex-fill', disabled: !available,
      'aria-label': `Add ${p.name} to cart`,
      onclick: () => {
        const r = KMartCart.add(p, 1);
        App.toast(r.message, r.ok ? 'success' : 'warning');
      } }, App.icon('cart-plus'), ' Add to cart');
    return el('div', { class: 'col' }, el('article', { class: 'card product-card' },
      el('a', { href: `/product-details.html?id=${encodeURIComponent(p.id)}`, tabindex: '-1', 'aria-hidden': 'true' }, App.img(p.imageUrl, '', 'thumb')),
      el('div', { class: 'card-body d-flex flex-column' },
        el('span', { class: 'badge category-badge align-self-start mb-2', text: p.category }),
        el('h3', { class: 'card-title h6' }, el('a', { href: `/product-details.html?id=${encodeURIComponent(p.id)}`, text: p.name })),
        el('div', { class: 'd-flex justify-content-between align-items-baseline mt-auto pt-2' },
          el('span', { class: 'price', text: App.formatPrice(p.price) }), el('small', { class: `fw-semibold ${stock.cls}`, text: stock.text })),
        el('div', { class: 'd-flex gap-2 mt-3' },
          el('a', { class: 'btn btn-outline-primary btn-sm flex-fill', href: `/product-details.html?id=${encodeURIComponent(p.id)}`, text: 'Details' }), addBtn))));
  };

  /* ---------- Session ---------- */
  App.session = { user: null };
  App.loadSession = async () => {
    try { App.session.user = (await API.get('/auth/me')).data.user; } catch (e) { App.session.user = null; }
  };
  const here = () => location.pathname + location.search;
  App.requireLogin = () => {
    if (App.session.user) return true;
    location.replace('/login.html?next=' + encodeURIComponent(here()));
    return false;
  };
  App.requireAdmin = () => {
    if (!App.requireLogin()) return false;
    if (App.session.user.role === 'admin') return true;
    location.replace('/');
    return false;
  };
  // Only allow redirects to pages on this same site.
  App.safeNext = (next) => (typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : null);

  App.logout = async () => {
    try { await API.post('/auth/logout'); } catch (e) { /* ignore */ }
    location.href = '/';
  };

  /* ---------- Navbar and footer ---------- */
  App.renderNavbar = () => {
    const host = document.getElementById('navbar');
    if (!host) return;
    const page = document.body.dataset.page;
    const user = App.session.user;
    const link = (key, href, label, icon) => el('li', { class: 'nav-item' },
      el('a', { class: `nav-link${page === key ? ' active' : ''}`, href, 'aria-current': page === key ? 'page' : null }, icon && App.icon(icon, 'me-1'), label));

    const account = user
      ? el('li', { class: 'nav-item dropdown' },
          el('button', { class: 'nav-link dropdown-toggle btn btn-link', type: 'button', 'data-bs-toggle': 'dropdown', 'aria-expanded': 'false' }, App.icon('person-circle', 'me-1'), user.name.split(' ')[0]),
          el('ul', { class: 'dropdown-menu dropdown-menu-end' },
            el('li', {}, el('span', { class: 'dropdown-item-text small text-muted', text: user.email })),
            el('li', {}, el('a', { class: 'dropdown-item', href: '/my-orders.html', text: 'My orders' })),
            user.role === 'admin' && el('li', {}, el('a', { class: 'dropdown-item', href: '/admin/dashboard.html', text: 'Admin dashboard' })),
            el('li', {}, el('hr', { class: 'dropdown-divider' })),
            el('li', {}, el('button', { type: 'button', class: 'dropdown-item', onclick: App.logout, text: 'Log out' }))))
      : [link('login', '/login.html', 'Login', 'box-arrow-in-right'), link('register', '/register.html', 'Register', 'person-plus')];

    const nav = el('nav', { class: 'navbar navbar-expand-lg site-nav navbar-dark', 'aria-label': 'Main navigation' }, el('div', { class: 'container' },
      el('a', { class: 'brand', href: '/', 'aria-label': 'KMart home' }, el('span', { class: 'brand-tag', 'aria-hidden': 'true', text: 'K' }), el('span', { text: 'Mart' })),
      el('button', { class: 'navbar-toggler', type: 'button', 'data-bs-toggle': 'collapse', 'data-bs-target': '#nav-menu', 'aria-controls': 'nav-menu', 'aria-expanded': 'false', 'aria-label': 'Toggle navigation' }, el('span', { class: 'navbar-toggler-icon' })),
      el('div', { class: 'collapse navbar-collapse', id: 'nav-menu' },
        el('ul', { class: 'navbar-nav me-auto mb-2 mb-lg-0' }, link('home', '/', 'Home'), link('products', '/products.html', 'Products'), link('orders', '/my-orders.html', 'My Orders')),
        el('ul', { class: 'navbar-nav align-items-lg-center' },
          link('cart', '/cart.html', [ 'Cart ', el('span', { class: 'badge rounded-pill cart-count', text: '0' }) ], 'cart3'), account))));
    App.clear(host).append(nav);

    if (document.body.hasAttribute('data-admin')) {
      const sub = (key, href, label) => el('li', { class: 'nav-item' }, el('a', { class: `nav-link${page === key ? ' active' : ''}`, href, 'aria-current': page === key ? 'page' : null, text: label }));
      host.append(el('div', { class: 'admin-subnav' }, el('div', { class: 'container' },
        el('ul', { class: 'nav', 'aria-label': 'Admin sections' }, sub('admin-dashboard', '/admin/dashboard.html', 'Dashboard'), sub('admin-products', '/admin/products.html', 'Products'), sub('admin-orders', '/admin/orders.html', 'Orders')))));
    }
    App.updateCartBadge();
  };

  App.updateCartBadge = () => {
    const n = typeof KMartCart !== 'undefined' ? KMartCart.count() : 0;
    document.querySelectorAll('.cart-count').forEach((b) => { b.textContent = n; b.setAttribute('aria-label', `${n} items in cart`); });
  };
  window.addEventListener('kmart:cart', App.updateCartBadge);
  window.addEventListener('storage', App.updateCartBadge); // cart changed in another tab

  App.renderFooter = () => {
    const host = document.getElementById('footer');
    if (!host) return;
    const s = App.store;
    App.clear(host).append(el('footer', { class: 'site-footer py-5' }, el('div', { class: 'container' }, el('div', { class: 'row g-4' },
      el('div', { class: 'col-md-4' }, el('div', { class: 'brand mb-2' }, el('span', { class: 'brand-tag', 'aria-hidden': 'true', text: 'K' }), el('span', { text: 'Mart' })),
        el('p', { class: 'small mb-0', text: 'Your campus store, online. Order what you need and collect it at the counter.' })),
      el('div', { class: 'col-6 col-md-4' }, el('h2', { text: 'Visit the store' }),
        el('p', { class: 'small mb-1' }, App.icon('geo-alt', 'me-2'), s.location), el('p', { class: 'small mb-0' }, App.icon('clock', 'me-2'), s.hours)),
      el('div', { class: 'col-6 col-md-4' }, el('h2', { text: 'Quick links' }),
        el('ul', { class: 'list-unstyled small mb-0' },
          el('li', {}, el('a', { href: '/products.html', text: 'Products' })), el('li', {}, el('a', { href: '/my-orders.html', text: 'My orders' })), el('li', {}, el('a', { href: '/cart.html', text: 'Cart' })))),
      el('div', { class: 'col-12' }, el('hr', { class: 'border-secondary' }), el('p', { class: 'small mb-0', text: `\u00A9 ${new Date().getFullYear()} KMart Campus Store. College project - no online payments; pay at the counter on pickup.` }))))));
  };

  /* ---------- Page starter: every page script calls App.start(...) once ---------- */
  // auth: 'none' | 'user' | 'admin'
  App.start = async (pageFn, { auth = 'none' } = {}) => {
    await App.loadSession();
    App.renderNavbar();
    App.renderFooter();
    if (auth === 'user' && !App.requireLogin()) return;
    if (auth === 'admin' && !App.requireAdmin()) return;
    try { await pageFn(); } catch (err) { console.error(err); App.toast(err.message || 'Something went wrong.', 'danger'); }
  };

  // Shows server-side field errors under the matching inputs: <input name="email"> + <div data-error-for="email">
  App.showFieldErrors = (form, errors) => {
    form.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
    (errors || []).forEach((e) => {
      const input = form.querySelector(`[name="${CSS.escape(e.field)}"]`);
      const box = form.querySelector(`[data-error-for="${CSS.escape(e.field)}"]`);
      if (input) input.classList.add('is-invalid');
      if (box) box.textContent = e.message;
    });
  };
})();
