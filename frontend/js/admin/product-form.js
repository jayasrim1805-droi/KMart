(function () {
  const form = document.getElementById('product-form');
  const alertBox = document.getElementById('form-alert');
  const { el } = App;
  const id = new URLSearchParams(location.search).get('id');

  function validate() {
    const f = form.elements;
    const errors = [];
    if (f.name.value.trim().length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters.' });
    if (!f.category.value) errors.push({ field: 'category', message: 'Choose a category.' });
    const price = Number(f.price.value);
    if (f.price.value === '' || !(price >= 0.01) || price > 100000) errors.push({ field: 'price', message: 'Price must be between 0.01 and 100000.' });
    else if (!/^\d+(\.\d{1,2})?$/.test(f.price.value)) errors.push({ field: 'price', message: 'Use at most 2 decimal places.' });
    if (f.stock.value === '' || !Number.isInteger(Number(f.stock.value)) || Number(f.stock.value) < 0) errors.push({ field: 'stock', message: 'Stock must be a whole number, 0 or more.' });
    const url = f.imageUrl.value.trim();
    if (url && !/^https?:\/\/\S+$/i.test(url) && !/^\/assets\/\S+$/.test(url)) errors.push({ field: 'imageUrl', message: 'Start the URL with http://, https:// or /assets/.' });
    if (f.description.value.length > 1000) errors.push({ field: 'description', message: 'Description is too long (max 1000).' });
    return errors;
  }

  function preview() {
    const url = form.elements.imageUrl.value.trim();
    const box = document.getElementById('image-preview');
    App.clear(box);
    if (/^https?:\/\/\S+$/i.test(url) || /^\/assets\/\S+$/.test(url)) box.append(App.img(url, 'Image preview', 'detail-img'));
  }

  App.start(async () => {
    const f = form.elements;
    (await API.get('/products/categories')).data.categories.forEach((c) => f.category.append(el('option', { value: c.name, text: c.name })));
    if (id) {
      document.getElementById('form-title').textContent = 'Edit product';
      document.title = 'Edit product - KMart Admin';
      try {
        const p = (await API.get(`/products/${encodeURIComponent(id)}`)).data.product;
        f.name.value = p.name; f.description.value = p.description || ''; f.category.value = p.category; f.price.value = p.price;
        f.stock.value = p.stock; f.imageUrl.value = p.imageUrl || ''; f.isActive.checked = p.isActive; f.isFeatured.checked = p.isFeatured;
      } catch (err) {
        form.hidden = true;
        return App.showEmpty(document.getElementById('form-state'), { icon: 'emoji-frown', title: 'Product not found', action: { href: '/admin/products.html', label: 'Back to products' } });
      }
    }
    preview();
    f.imageUrl.addEventListener('change', preview);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      App.clear(alertBox);
      const errors = validate();
      App.showFieldErrors(form, errors);
      if (errors.length) return form.querySelector('.is-invalid').focus();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Saving...';
      const body = {
        name: f.name.value.trim(), description: f.description.value.trim(), category: f.category.value,
        price: Number(f.price.value), stock: Number(f.stock.value), imageUrl: f.imageUrl.value.trim(),
        isActive: f.isActive.checked, isFeatured: f.isFeatured.checked,
      };
      try {
        await (id ? API.put(`/products/${encodeURIComponent(id)}`, body) : API.post('/products', body));
        location.href = '/admin/products.html?saved=1';
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Save product';
        if (err.errors && err.errors.length) App.showFieldErrors(form, err.errors);
        alertBox.append(el('div', { class: 'alert alert-danger', role: 'alert', text: err.message }));
      }
    });
  }, { auth: 'admin' });
})();
