const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const User = require('../models/User');
const { config } = require('../config/env');
const { ORDER_STATUS } = require('../config/constants');
const { canTransition, ADMIN_CANCELLABLE, ADMIN_TRANSITIONS } = require('../utils/orderStatus');
const { cancelOrder } = require('../services/orderService');

/*
 * Dashboard numbers:
 *  - totalSales      = sum of totalAmount of orders with status "Completed" only
 *                      (Pending / Confirmed / Ready are not yet sales; Cancelled is never a sale)
 *  - pendingOrders   = orders with status "Pending"
 *  - completedOrders = orders with status "Completed"
 *  - lowStock        = active products with stock <= LOW_STOCK_THRESHOLD
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  const threshold = config.lowStockThreshold;
  const lowStockFilter = { isActive: true, stock: { $lte: threshold } };
  const [totalProducts, activeProducts, byStatus, sales, lowStockCount, lowStockProducts, recentOrders] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { status: ORDER_STATUS.COMPLETED } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Product.countDocuments(lowStockFilter),
    Product.find(lowStockFilter).sort({ stock: 1, name: 1 }).limit(10),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const totalOrders = byStatus.reduce((n, s) => n + s.count, 0);
  res.json({
    success: true,
    data: {
      stats: {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders: counts[ORDER_STATUS.PENDING] || 0,
        completedOrders: counts[ORDER_STATUS.COMPLETED] || 0,
        cancelledOrders: counts[ORDER_STATUS.CANCELLED] || 0,
        totalSales: sales.length ? Math.round(sales[0].total * 100) / 100 : 0,
        lowStockCount,
        lowStockThreshold: threshold,
        ordersByStatus: counts,
      },
      lowStockProducts,
      recentOrders,
    },
  });
});

exports.getOrders = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const q = (req.query.q || '').trim();
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').limit(200);
    filter.$or = [{ orderNumber: rx }, { user: { $in: users.map((u) => u._id) } }];
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email'), // only name + email are exposed
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data: { orders, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const next = req.body.status;
  const current = await Order.findById(req.params.id);
  if (!current) throw new AppError('Order not found.', 404);
  if (!canTransition(current.status, next)) {
    const allowed = ADMIN_TRANSITIONS[current.status] || [];
    throw new AppError(
      `Cannot change an order from "${current.status}" to "${next}". ` +
        (allowed.length ? `Allowed next status: ${allowed.join(', ')}.` : 'This order is finished and cannot be changed.'),
      409
    );
  }

  let order;
  if (next === ORDER_STATUS.CANCELLED) {
    order = await cancelOrder(current._id, req.user._id, ADMIN_CANCELLABLE); // restores stock once
  } else {
    // The filter includes the status we just read, so a simultaneous change by another admin is not overwritten.
    order = await Order.findOneAndUpdate(
      { _id: current._id, status: current.status },
      { $set: { status: next }, $push: { statusHistory: { status: next, changedBy: req.user._id, changedAt: new Date() } } },
      { new: true }
    );
  }
  if (!order) throw new AppError('This order was just changed by someone else. Refresh and try again.', 409);
  await order.populate('user', 'name email');
  res.json({ success: true, message: `Order marked as ${next}.`, data: { order } });
});
