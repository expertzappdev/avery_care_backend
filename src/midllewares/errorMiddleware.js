// Middleware for handling 404 (Not Found) errors
const notFound = (req, res, next) => {
  // Create a new Error object with a "Not Found" message including the original URL
  const error = new Error(`Not Found - ${req.originalUrl}`);
  // Set the response status code to 404 (Not Found)
  res.status(404);
  // Pass the error to the next middleware in the chain (which will be the errorHandler)
  next(error);
};

// Middleware for handling general errors
const errorHandler = (err, req, res, next) => {
  // Determine the appropriate status code for the error.
  // If the response status code is still 200 (OK), it means an error occurred
  // during a seemingly successful request, so set it to 500 (Internal Server Error).
  // Otherwise, use the status code already set (e.g., 400, 401).
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  // Set the response status code
  res.status(statusCode);
  // Send a JSON response with the error message
  res.json({
    message: err.message,
    // Include the stack trace only in development mode for debugging.
    // In production, keep it null for security reasons.
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };