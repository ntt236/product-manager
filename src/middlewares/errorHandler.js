const errorHandler = (err, req, res, next) => {
  // Check if response was already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle PostgreSQL unique constraint violations (23505)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists with unique constraint violation.',
      detail: err.detail || 'Duplicate key value.',
    });
  }

  // Handle PostgreSQL foreign key violations (23503)
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced foreign key does not exist or cannot be deleted/updated due to relation.',
      detail: err.detail || 'Foreign key violation.',
    });
  }

  // Handle PostgreSQL invalid text representation for integer/uuid (22P02)
  if (err.code === '22P02') {
    return res.status(400).json({
      success: false,
      message: 'Invalid input syntax for parameter type.',
    });
  }

  // Handle generic error
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
