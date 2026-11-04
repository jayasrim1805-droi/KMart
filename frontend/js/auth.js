// Login and registration pages.
(function () {
  const { el } = App;
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const form = loginForm || registerForm;
  if (!form) return;
  const alertBox = document.getElementById('form-alert');

  const showAlert = (msg) => { App.clear(alertBox).append(el('div', { class: 'alert alert-danger', role: 'alert', text: msg })); alertBox.scrollIntoView({ block: 'nearest' }); };
  const setBusy = (busy, label) => { const b = form.querySelector('button[type="submit"]'); b.disabled = busy; b.textContent = busy ? 'Please wait...' : label; };

  function afterAuth(user) {
    const next = App.safeNext(new URLSearchParams(location.search).get('next'));
    location.href = next || (user.role === 'admin' ? '/admin/dashboard.html' : '/');
  }

  // Quick checks in the browser (the server repeats them - never rely on the browser alone).
  function validate() {
    const errors = [];
    const v = (n) => form.elements[n].value;
    if (registerForm) {
      if (v('name').trim().length < 2) errors.push({ field: 'name', message: 'Enter your full name (at least 2 characters).' });
    }
    if (!/^\S+@\S+\.\S+$/.test(v('email').trim())) errors.push({ field: 'email', message: 'Enter a valid email address.' });
    if (registerForm) {
      const p = v('password');
      if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) errors.push({ field: 'password', message: 'Use at least 8 characters with a letter and a number.' });
      if (v('confirmPassword') !== p) errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
    } else if (!v('password')) errors.push({ field: 'password', message: 'Enter your password.' });
    return errors;
  }

  App.start(async () => {
    if (App.session.user) return afterAuth(App.session.user); // already logged in
    if (new URLSearchParams(location.search).get('admin') === '1') {
      App.clear(alertBox).append(el('div', { class: 'alert alert-info', role: 'status', text: 'Please log in with an administrator account to open the admin area.' }));
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const label = registerForm ? 'Create account' : 'Log in';
      App.clear(alertBox);
      const errors = validate();
      App.showFieldErrors(form, errors);
      if (errors.length) return form.querySelector('.is-invalid').focus();
      setBusy(true, label);
      try {
        const body = registerForm
          ? { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), password: form.elements.password.value }
          : { email: form.elements.email.value.trim(), password: form.elements.password.value };
        const res = await API.post(registerForm ? '/auth/register' : '/auth/login', body);
        afterAuth(res.data.user);
      } catch (err) {
        setBusy(false, label);
        if (err.errors && err.errors.length) App.showFieldErrors(form, err.errors);
        showAlert(err.message);
      }
    });
  });
})();
