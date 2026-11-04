const { config } = require('../config/env');

const notFound = (req, res) => res.status(404).json({ success: false, message: 'API route not found.' });

// One place that turns every error into a consistent JSON response.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message;
  let details = err.details;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Validation failed.';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid value supplied.';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    message = `That ${field === 'user' ? 'request' : field} already exists.`;
  } else if (!err.isOperational) {
    status = 500;
    message = 'Something went wrong on the server.';
  }

  if (status >= 500 && config.nodeEnv !== 'test') console.error(err);

  const body = { success: false, message };
  if (details) body.errors = details;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
