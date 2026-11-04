const mongoose = require('mongoose');
const { CATEGORIES } = require('../config/constants');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true, minlength: 2, maxlength: 100, unique: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    category: { type: String, required: [true, 'Category is required'], enum: { values: CATEGORIES, message: 'Invalid category' } },
    price: { type: Number, required: [true, 'Price is required'], min: [0.01, 'Price must be at least 0.01'], max: 100000 },
    imageUrl: { type: String, trim: true, default: '' },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: { validator: Number.isInteger, message: 'Stock must be a whole number' },
    },
    isActive: { type: Boolean, default: true }, // false = hidden from students
    isFeatured: { type: Boolean, default: false }, // shown on the homepage
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

productSchema.index({ isActive: 1, category: 1, price: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ stock: 1 });

module.exports = mongoose.model('Product', productSchema);
