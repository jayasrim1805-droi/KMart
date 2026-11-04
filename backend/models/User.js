const mongoose = require('mongoose');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true, // normalised, so "A@x.com" and "a@x.com" are the same account
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: { type: String, required: true, select: false }, // never returned by queries by default
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
