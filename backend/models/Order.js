const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../config/constants');

// A snapshot of the product at the time of purchase. Later price or name changes
// (or deleting the product) never change old orders.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' } },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: [(v) => v.length > 0, 'An order needs at least one item'] },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PENDING },
    pickupInformation: {
      contactName: { type: String, trim: true, maxlength: 60 },
      phone: { type: String, trim: true, maxlength: 20, default: '' },
      note: { type: String, trim: true, maxlength: 200, default: '' },
    },
    // Sent by the browser for each checkout attempt so a double click cannot create two orders.
    idempotencyKey: { type: String, maxlength: 100 },
    // Guards against restoring stock twice when an order is cancelled.
    stockRestored: { type: Boolean, default: false },
    statusHistory: [historySchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.idempotencyKey;
        return ret;
      },
    },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'items.product': 1 });
// One idempotency key per user (only applies when a key exists).
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Order', orderSchema);
