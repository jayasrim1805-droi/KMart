// An error we throw on purpose; the error handler turns it into a JSON response.
class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}
module.exports = AppError;
