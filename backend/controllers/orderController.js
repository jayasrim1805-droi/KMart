const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { placeOrder, cancelOrder } = require('../services/orderService');
const { ROLES } = require('../config/constants');
const { STUDENT_CANCELLABLE } = require('../utils/orderStatus');

exports.createOrder = asyncHandler(async (req, res) => {
  const { order, duplicate } = await placeOrder(req.user, req.body);
  res.status(duplicate ? 200 : 201).json({
    success: true,
    message: duplicate ? 'This order was already placed.' : 'Order placed! Collect it from the KMart counter.',
    data: { order },
  });
});

exports.getMyOrders = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const filter = { user: req.user._id }; // always limited to the logged-in student
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data: { orders, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } });
});

// Owner or admin only.
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new AppError('Order not found.', 404);
  const isOwner = !!order.user && String(order.user._id) === String(req.user._id); // user is null if the account was deleted
  if (!isOwner && req.user.role !== ROLES.ADMIN) throw new AppError('You do not have permission to view this order.', 403);
  res.json({ success: true, data: { order } });
});

exports.cancelMyOrder = asyncHandler(async (req, res) => {
  const existing = await Order.findById(req.params.id);
  if (!existing) throw new AppError('Order not found.', 404);
  if (String(existing.user) !== String(req.user._id)) throw new AppError('You do not have permission to change this order.', 403);
  const order = await cancelOrder(existing._id, req.user._id, STUDENT_CANCELLABLE);
  if (!order) throw new AppError(`An order that is "${existing.status}" can no longer be cancelled. Please contact the store.`, 409);
  res.json({ success: true, message: 'Order cancelled and stock released.', data: { order } });
});
