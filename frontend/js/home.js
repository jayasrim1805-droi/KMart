// Homepage: category tiles + featured products from the API.
(function () {
  const { el } = App;
  App.start(async () => {
    const catBox = document.getElementById('category-list');
    const featBox = document.getElementById('featured-list');

    App.showLoading(catBox);
    App.showLoading(featBox);

    API.get('/products/categories').then((res) => {
      App.clear(catBox).append(el('div', { class: 'row row-cols-2 row-cols-md-3 row-cols-lg-6 g-3' },
        res.data.categories.map((c) => el('div', { class: 'col' }, el('a', { class: 'category-tile', href: `/products.html?category=${encodeURIComponent(c.name)}` },
          App.icon(App.categoryIcon(c.name)), el('div', { class: 'fw-semibold mt-2', text: c.name }), el('small', { class: 'text-muted', text: `${c.count} item${c.count === 1 ? '' : 's'}` }))))));
    }).catch((err) => App.showError(catBox, err.message, () => location.reload()));

    API.get('/products', { featured: 'true', limit: 4, sort: 'newest' }).then((res) => {
      const products = res.data.products;
      if (!products.length) return App.showEmpty(featBox, { icon: 'box-seam', title: 'No featured products yet', text: 'Check the full catalogue instead.', action: { href: '/products.html', label: 'Browse products' } });
      App.clear(featBox).append(el('div', { class: 'row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4' }, products.map(App.productCard)));
    }).catch((err) => App.showError(featBox, err.message, () => location.reload()));
  });
})();
