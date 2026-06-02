import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import environment from '../config/environment.js';

const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of ApiError, classify it
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';

    // Handle Mongoose Validation Error (validation failure)
    if (error.name === 'ValidationError') {
      statusCode = 422;
      message = 'Validation failed';
      const errors = Object.values(error.errors).map((el) => ({
        field: el.path,
        message: el.message
      }));
      error = new ApiError(statusCode, message, errors, err.stack);
    } 
    // Handle Mongoose Cast Error (invalid ObjectId)
    else if (error.name === 'CastError') {
      statusCode = 404;
      message = 'Resource not found';
      error = new ApiError(statusCode, message, [], err.stack);
    } 
    // Handle Mongoose Duplicate Key Error
    else if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyValue)[0];
      message = `Duplicate field value: ${field}. Please use another value.`;
      error = new ApiError(statusCode, message, [], err.stack);
    } 
    // Handle JSON Web Token Errors
    else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token. Please log in again.';
      error = new ApiError(statusCode, message, [], err.stack);
    } 
    else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Your session has expired. Please log in again.';
      error = new ApiError(statusCode, message, [], err.stack);
    } 
    // Fallback error
    else {
      error = new ApiError(statusCode, message, [], err.stack);
    }
  }

  // Log the error
  logger.error(`${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}`);
  if (error.statusCode === 500) {
    logger.error(err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(environment.NODE_ENV === 'development' && { stack: error.stack })
  };

  res.status(error.statusCode).json(response);
};

export default errorHandler;
