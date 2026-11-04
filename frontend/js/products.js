// Product catalogue: search, filters, sorting and pagination. Filters are kept in the URL
// so links (e.g. from the homepage categories) and the browser Back button work.
(function () {
  const { el } = App;
  const form = document.getElementById('filter-form');
  const grid = document.getElementById('product-grid');
  const pager = document.getElementById('pager');
  const countBox = document.getElementById('result-count');
  let requestId = 0; // ignore out-of-date responses when the user types quickly

  const state = { page: 1 };
  const fields = ['search', 'category', 'minPrice', 'maxPrice', 'sort', 'inStock'];

  function readUrl() {
    const q = new URLSearchParams(location.search);
    state.page = parseInt(q.get('page'), 10) || 1;
    fields.forEach((f) => {
      const input = form.elements[f];
      if (!input) return;
      if (input.type === 'checkbox') input.checked = q.get(f) === 'true';
      else input.value = q.get(f) || (f === 'sort' ? 'name_asc' : '');
    });
  }
  function collect() {
    const q = {};
    fields.forEach((f) => {
      const input = form.elements[f];
      const v = input.type === 'checkbox' ? (input.checked ? 'true' : '') : input.value.trim();
      if (v) q[f] = v;
    });
    return q;
  }

  async function load() {
    const id = ++requestId;
    const q = collect();
    const min = Number(q.minPrice), max = Number(q.maxPrice);
    if (q.minPrice && q.maxPrice && min > max) {
      countBox.textContent = '';
      App.clear(pager);
      return App.showEmpty(grid, { icon: 'currency-rupee', title: 'Check your price range', text: 'The minimum price is higher than the maximum.' });
    }
    // Keep the address bar in sync with the filters.
    const urlParams = new URLSearchParams({ ...q, ...(state.page > 1 ? { page: state.page } : {}) });
    history.replaceState(null, '', urlParams.toString() ? `?${urlParams}` : location.pathname);

    App.showLoading(grid, 'Loading products...');
    try {
      const res = await API.get('/products', { ...q, page: state.page, limit: 12 });
      if (id !== requestId) return;
      const { products, pagination } = res.data;
      countBox.textContent = pagination.total ? `${pagination.total} product${pagination.total === 1 ? '' : 's'} found` : '';
      if (!products.length) {
        App.clear(pager);
        const filtered = Object.keys(q).some((k) => k !== 'sort');
        return App.showEmpty(grid, filtered
          ? { icon: 'search', title: 'No products match your filters', text: 'Try a different search or clear the filters.' }
          : { icon: 'box-seam', title: 'No products available yet', text: 'The store is being stocked. Please check back soon.' });
      }
      App.clear(grid).append(el('div', { class: 'row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4' }, products.map(App.productCard)));
      App.pagination(pager, pagination, (p) => { state.page = p; load(); window.scrollTo({ top: 0 }); });
    } catch (err) {
      if (id === requestId) App.showError(grid, err.message, load);
    }
  }

  App.start(async () => {
    try {
      const cats = (await API.get('/products/categories')).data.categories;
      const select = form.elements.category;
      cats.forEach((c) => select.append(el('option', { value: c.name, text: c.name })));
    } catch (e) { /* filter still works without the list */ }
    readUrl();
    const reload = () => { state.page = 1; load(); };
    form.addEventListener('submit', (e) => { e.preventDefault(); reload(); });
    form.elements.search.addEventListener('input', App.debounce(reload, 300));
    ['category', 'sort', 'inStock'].forEach((f) => form.elements[f].addEventListener('change', reload));
    ['minPrice', 'maxPrice'].forEach((f) => form.elements[f].addEventListener('change', reload));
    document.getElementById('clear-filters').addEventListener('click', () => { form.reset(); form.elements.sort.value = 'name_asc'; reload(); });
    await load();
  });
})();
