const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { calculateTotal } = require('../utils/money');
const { generateOrderNumber } = require('../utils/orderNumber');
const { ORDER_STATUS, MAX_QTY_PER_ITEM } = require('../config/constants');

// Give back stock that was reserved for an order that did not complete.
async function releaseStock(reserved) {
  if (!reserved.length) return;
  await Product.bulkWrite(
    reserved.map((r) => ({ updateOne: { filter: { _id: r.productId }, update: { $inc: { stock: r.quantity } } } }))
  );
}

/**
 * Places an order. The browser only sends product IDs and quantities;
 * names, prices and totals always come from the database.
 *
 * Overselling is prevented with an ATOMIC conditional update per product:
 *   findOneAndUpdate({ _id, isActive: true, stock: { $gte: qty } }, { $inc: { stock: -qty } })
 * MongoDB applies this as a single operation, so two students cannot both take the last item.
 * If anything fails afterwards, the stock already taken is put back (compensation).
 * This works on a standalone MongoDB server - no replica set needed.
 */
async function placeOrder(user, { items, pickupInformation = {}, idempotencyKey }) {
  // Merge repeated products into one line.
  const wanted = new Map();
  for (const item of items) {
    const id = String(item.productId);
    wanted.set(id, (wanted.get(id) || 0) + Number(item.quantity));
  }
  for (const qty of wanted.values()) {
    if (qty > MAX_QTY_PER_ITEM) throw new AppError(`You can order at most ${MAX_QTY_PER_ITEM} of one product.`, 400);
  }

  // Same checkout attempt sent twice? Return the order we already made.
  if (idempotencyKey) {
    const existing = await Order.findOne({ user: user._id, idempotencyKey });
    if (existing) return { order: existing, duplicate: true };
  }

  // Friendly pre-check so the student sees every problem at once.
  const products = await Product.find({ _id: { $in: [...wanted.keys()] } });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const problems = [];
  for (const [id, qty] of wanted) {
    const p = byId.get(id);
    if (!p || !p.isActive) problems.push('A product in your cart is no longer available.');
    else if (p.stock < qty) problems.push(p.stock === 0 ? `"${p.name}" is out of stock.` : `Only ${p.stock} of "${p.name}" left (you asked for ${qty}).`);
  }
  if (problems.length) throw new AppError(problems.join(' '), 409, problems.map((m) => ({ message: m })));

  // The real protection: reserve stock atomically.
  const reserved = [];
  const orderItems = [];
  try {
    for (const [id, qty] of wanted) {
      const updated = await Product.findOneAndUpdate(
        { _id: id, isActive: true, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
      );
      if (!updated) throw new AppError(`Sorry, "${byId.get(id).name}" just sold out. Please review your cart.`, 409);
      reserved.push({ productId: id, quantity: qty });
      orderItems.push({ product: updated._id, name: updated.name, price: updated.price, imageUrl: updated.imageUrl, quantity: qty });
    }

    const totalAmount = calculateTotal(orderItems);
    let order;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        order = await Order.create({
          orderNumber: generateOrderNumber(),
          user: user._id,
          items: orderItems,
          totalAmount,
          status: ORDER_STATUS.PENDING,
          pickupInformation: {
            contactName: pickupInformation.contactName || user.name,
            phone: pickupInformation.phone || '',
            note: pickupInformation.note || '',
          },
          idempotencyKey: idempotencyKey || undefined,
          statusHistory: [{ status: ORDER_STATUS.PENDING, changedBy: user._id }],
        });
        break;
      } catch (err) {
        const clash = err.code === 11000 && err.keyPattern && err.keyPattern.orderNumber;
        if (!clash || attempt === 4) throw err; // retry only if the random order number clashed
      }
    }
    return { order, duplicate: false };
  } catch (err) {
    await releaseStock(reserved).catch((e) => console.error('Stock rollback failed:', e));
    if (err.code === 11000 && err.keyPattern && err.keyPattern.idempotencyKey) {
      const existing = await Order.findOne({ user: user._id, idempotencyKey });
      if (existing) return { order: existing, duplicate: true };
    }
    throw err;
  }
}

/**
 * Cancels an order exactly once and puts its stock back.
 * The status change and the "stockRestored" flag are set in ONE atomic update whose filter requires
 * stockRestored:false and an allowed current status, so two simultaneous cancels cannot both succeed.
 * Returns the updated order, or null if the order could not be cancelled.
 */
async function cancelOrder(orderId, actorId, allowedFrom) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: allowedFrom }, stockRestored: false },
    {
      $set: { status: ORDER_STATUS.CANCELLED, stockRestored: true },
      $push: { statusHistory: { status: ORDER_STATUS.CANCELLED, changedBy: actorId, changedAt: new Date() } },
    },
    { new: true }
  );
  if (!order) return null;
  // Products that were deleted simply match nothing, which is fine.
  await Product.bulkWrite(
    order.items.map((i) => ({ updateOne: { filter: { _id: i.product }, update: { $inc: { stock: i.quantity } } } }))
  );
  return order;
}

module.exports = { placeOrder, cancelOrder, releaseStock };
