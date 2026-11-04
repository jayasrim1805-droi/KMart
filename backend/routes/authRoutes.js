const router = require('express').Router();
const ctrl = require('../controllers/authController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');

router.post('/register', authLimiter, v.register, validate, ctrl.register);
router.post('/login', authLimiter, v.login, validate, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);

module.exports = router;
