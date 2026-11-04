const router = require('express').Router();
const ctrl = require('../controllers/productController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');

// Public
router.get('/', v.productList, validate, ctrl.getProducts);
router.get('/categories', ctrl.getCategories); // must stay above "/:id"
router.get('/:id', v.idParam, validate, optionalAuth, ctrl.getProduct);

// Admin only
const adminOnly = [protect, restrictTo('admin')];
router.post('/', adminOnly, v.productBody, validate, ctrl.createProduct);
router.put('/:id', adminOnly, v.idParam, v.productBody, validate, ctrl.updateProduct);
router.patch('/:id/stock', adminOnly, v.stockAdjustment, validate, ctrl.adjustStock);
router.delete('/:id', adminOnly, v.idParam, validate, ctrl.deleteProduct);

module.exports = router;
