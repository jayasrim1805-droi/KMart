const { validationResult } = require('express-validator');

// Runs after the validator chains; returns 400 with a list of field errors.
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg }));
  return res.status(400).json({ success: false, message: errors[0].message, errors });
};
