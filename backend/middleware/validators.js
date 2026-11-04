const { body, param, query } = require('express-validator');
const { CATEGORIES, ORDER_STATUS, MAX_ITEMS_PER_ORDER, MAX_QTY_PER_ITEM } = require('../config/constants');
const { ALL_STATUSES } = require('../utils/orderStatus');

const idParam = param('id').isMongoId().withMessage('Invalid ID.');
const page = query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('page must be 1 or more.').toInt();
const limit = query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50.').toInt();
const text = (name, max) => query(name).optional().isString().withMessage(`${name} must be text.`).trim().isLength({ max }).withMessage(`${name} is too long.`);

const register = [
  body('name').isString().withMessage('Name is required.').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters.'),
  body('email').isString().withMessage('Email is required.').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address.').isLength({ max: 120 }),
  body('password').isString().withMessage('Password is required.').isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters.')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter.').matches(/\d/).withMessage('Password must contain a number.'),
];

const login = [
  body('email').isString().withMessage('Email is required.').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address.'),
  body('password').isString().withMessage('Password is required.').isLength({ min: 1, max: 72 }).withMessage('Password is required.'),
];

const productBody = [
  body('name').isString().withMessage('Product name is required.').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
  body('description').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('Description is too long (max 1000).'),
  body('category').isIn(CATEGORIES).withMessage('Please choose a valid category.'),
  body('price').isFloat({ min: 0.01, max: 100000 }).withMessage('Price must be between 0.01 and 100000.')
    .bail().custom((v) => /^\d+(\.\d{1,2})?$/.test(String(v))).withMessage('Price can have at most 2 decimal places.'),
  body('stock').isInt({ min: 0, max: 100000 }).withMessage('Stock must be a whole number of 0 or more.'),
  body('imageUrl').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 })
    .custom((v) => /^https?:\/\/\S+$/i.test(v) || /^\/assets\/\S+$/.test(v)).withMessage('Image URL must start with http://, https:// or /assets/.'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false.'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be true or false.'),
];

const stockAdjustment = [
  idParam,
  body('adjustment').isInt({ min: -100000, max: 100000 }).withMessage('Adjustment must be a whole number.').toInt(),
];

const productList = [
  page, limit, text('search', 100), text('ids', 1200), text('q', 100),
  query('category').optional().isIn(CATEGORIES).withMessage('Unknown category.'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be 0 or more.'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be 0 or more.'),
  query('sort').optional().isIn(['name_asc', 'name_desc', 'price_asc', 'price_desc', 'newest']).withMessage('Unknown sort option.'),
  query('inStock').optional().isIn(['true', 'false']),
  query('featured').optional().isIn(['true', 'false']),
  query('status').optional().isIn(['active', 'inactive']),
  query('lowStock').optional().isIn(['true', 'false']),
];

const createOrder = [
  body('items').isArray({ min: 1, max: MAX_ITEMS_PER_ORDER }).withMessage(`An order needs 1-${MAX_ITEMS_PER_ORDER} items.`),
  body('items.*.productId').isMongoId().withMessage('Invalid product in order.'),
  body('items.*.quantity').isInt({ min: 1, max: MAX_QTY_PER_ITEM }).withMessage(`Quantity must be 1-${MAX_QTY_PER_ITEM}.`),
  body('idempotencyKey').optional({ values: 'falsy' }).matches(/^[A-Za-z0-9_-]{8,100}$/).withMessage('Invalid idempotency key.'),
  body('pickupInformation.contactName').optional({ values: 'falsy' }).isString().trim().isLength({ max: 60 }).withMessage('Contact name is too long.'),
  body('pickupInformation.phone').optional({ values: 'falsy' }).matches(/^[0-9+()\-\s]{7,20}$/).withMessage('Enter a valid phone number.'),
  body('pickupInformation.note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }).withMessage('Note is too long (max 200).'),
];

const orderStatus = [idParam, body('status').isIn(ALL_STATUSES).withMessage(`Status must be one of: ${ALL_STATUSES.join(', ')}.`)];

const adminOrderList = [
  page, limit, text('q', 100),
  query('status').optional().isIn(Object.values(ORDER_STATUS)).withMessage('Unknown status.'),
];
const myOrderList = [page, limit];

module.exports = { idParam, register, login, productBody, stockAdjustment, productList, createOrder, orderStatus, adminOrderList, myOrderList };
