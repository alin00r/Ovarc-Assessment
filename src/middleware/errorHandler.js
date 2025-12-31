/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds the maximum limit of 10MB.',
    });
  }

  if (err.message === 'Only CSV files are allowed') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: errors,
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'A record with this data already exists.',
    });
  }

  // Sequelize database errors
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      error: 'Database error occurred.',
    });
  }

  // Sequelize connection errors
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      success: false,
      error: 'Unable to connect to database.',
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production' ? 'An error occurred' : message,
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
