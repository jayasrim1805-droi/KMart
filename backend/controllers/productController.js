const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { CATEGORIES, ROLES } = require('../config/constants');
const { config } = require('../config/env');

const SORTS = {
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  price_asc: { price: 1, name: 1 },
  price_desc: { price: -1, name: 1 },
  newest: { createdAt: -1 },
};

// Only these fields may be set from a request (protects against mass-assignment).
const pickProductFields = (b) => {
  const data = {
    name: b.name,
    description: b.description || '',
    category: b.category,
    price: Number(b.price),
    stock: Number(b.stock),
    imageUrl: b.imageUrl || '',
  };
  if (b.isActive !== undefined) data.isActive = b.isActive === true || b.isActive === 'true';
  if (b.isFeatured !== undefined) data.isFeatured = b.isFeatured === true || b.isFeatured === 'true';
  return data;
};

function buildFilter(q, { admin }) {
  const f = {};
  if (!admin) f.isActive = true; // students never see hidden products
  const search = (q.search || q.q || '').trim();
  if (search) f.name = { $regex: escapeRegex(search), $options: 'i' };
  if (q.category) f.category = q.category;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    f.price = {};
    if (q.minPrice !== undefined) f.price.$gte = Number(q.minPrice);
    if (q.maxPrice !== undefined) f.price.$lte = Number(q.maxPrice);
  }
  if (q.inStock === 'true') f.stock = { $gt: 0 };
  if (q.featured === 'true') f.isFeatured = true;
  if (q.ids) {
    f._id = { $in: q.ids.split(',').map((s) => s.trim()).filter((s) => mongoose.isValidObjectId(s)).slice(0, 50) };
  }
  if (admin) {
    if (q.status === 'active') f.isActive = true;
    if (q.status === 'inactive') f.isActive = false;
    if (q.lowStock === 'true') f.stock = { $lte: config.lowStockThreshold };
  }
  return f;
}

async function listProducts(req, res, admin) {
  const page = req.query.page || 1;
  const limit = req.query.limit || 12;
  const filter = buildFilter(req.query, { admin });
  const sort = SORTS[req.query.sort] || SORTS.name_asc;
  const [products, total] = await Promise.all([
    Product.find(filter).collation({ locale: 'en' }).sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { products, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } },
  });
}

exports.getProducts = asyncHandler((req, res) => listProducts(req, res, false));
exports.getAdminProducts = asyncHandler((req, res) => listProducts(req, res, true));

// Category list with the number of visible products in each (for the homepage and filters).
exports.getCategories = asyncHandler(async (req, res) => {
  const counts = await Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
  const map = new Map(counts.map((c) => [c._id, c.count]));
  res.json({ success: true, data: { categories: CATEGORIES.map((name) => ({ name, count: map.get(name) || 0 })) } });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  const isAdmin = req.user && req.user.role === ROLES.ADMIN;
  if (!product || (!product.isActive && !isAdmin)) throw new AppError('Product not found.', 404);
  res.json({ success: true, data: { product } });
});

exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(pickProductFields(req.body));
  res.status(201).json({ success: true, message: 'Product created.', data: { product } });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { $set: pickProductFields(req.body) }, { new: true, runValidators: true });
  if (!product) throw new AppError('Product not found.', 404);
  res.json({ success: true, message: 'Product updated.', data: { product } });
});

// Relative stock change (+10, -3). Safer than overwriting the number while orders are arriving.
exports.adjustStock = asyncHandler(async (req, res) => {
  const { adjustment } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, stock: { $gte: -adjustment } }, // blocks results below zero
    { $inc: { stock: adjustment } },
    { new: true }
  );
  if (!product) {
    if (!(await Product.exists({ _id: req.params.id }))) throw new AppError('Product not found.', 404);
    throw new AppError('Stock cannot go below zero.', 409);
  }
  res.json({ success: true, message: 'Stock updated.', data: { product } });
});

// Products that appear in past orders are hidden (isActive:false) instead of removed,
// so order history stays correct. Unused products are deleted for real.
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  if (await Order.exists({ 'items.product': product._id })) {
    product.isActive = false;
    await product.save();
    return res.json({
      success: true,
      message: 'This product appears in past orders, so it was hidden from students instead of deleted.',
      data: { deleted: false, deactivated: true, product },
    });
  }
  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted.', data: { deleted: true, deactivated: false } });
});
