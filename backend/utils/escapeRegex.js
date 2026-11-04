// Makes user text safe to use inside a MongoDB $regex.
module.exports = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
