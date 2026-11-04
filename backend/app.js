const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');
const csrfProtection = require('./middleware/csrf');
const adminPageGuard = require('./middleware/adminPageGuard');

const app = express();
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

app.disable('x-powered-by');

// Security headers. The CSP allows only our own files plus Bootstrap (jsDelivr) and Google Fonts.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'], // admins may use any https image URL
        'connect-src': ["'self'"],
        'upgrade-insecure-requests': null, // keeps http://localhost working
      },
    },
  })
);

app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

// ---- API ----
app.use('/api', apiLimiter, csrfProtection);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'KMart API is running.' }));
app.use('/api', notFound);

// ---- Frontend (same origin as the API, so no CORS is needed) ----
app.use('/admin', adminPageGuard);
app.use(express.static(FRONTEND_DIR));

app.use(errorHandler);

module.exports = app;
