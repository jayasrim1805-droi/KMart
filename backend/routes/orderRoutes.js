const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.use(protect); // every order route needs a logged-in user

router.post('/', v.createOrder, validate, ctrl.createOrder);
router.get('/my-orders', v.myOrderList, validate, ctrl.getMyOrders); // must stay above "/:id"
router.get('/:id', v.idParam, validate, ctrl.getOrder);
router.patch('/:id/cancel', v.idParam, validate, ctrl.cancelMyOrder);

module.exports = router;
