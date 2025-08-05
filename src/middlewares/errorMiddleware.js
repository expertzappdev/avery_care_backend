// Middleware for handling 404 (Not Found) errors
const notFound = (req, res, next) => {
  // Create a new Error object with a "Not Found" message including the original URL
  const error = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
  // Set the response status code to 404 (Not Found)
  res.status(404);
  // Pass the error to the next middleware in the chain (which will be the errorHandler)
  next(error);
};

// Middleware for handling general errors
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  // Set the response status code
  res.status(statusCode);
  // Send a JSON response with the error message
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };