const router = require('express').Router();
const admin = require('../controllers/adminController');
const products = require('../controllers/productController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin')); // everything below is admin-only

router.get('/dashboard', admin.getDashboard);
router.get('/products', v.productList, validate, products.getAdminProducts);
router.get('/orders', v.adminOrderList, validate, admin.getOrders);
router.patch('/orders/:id/status', v.orderStatus, validate, admin.updateOrderStatus);

module.exports = router;
