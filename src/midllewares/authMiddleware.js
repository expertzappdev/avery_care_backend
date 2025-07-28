import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

/**
 * @desc    Protect routes - Middleware to authenticate users using JWT
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token from the Authorization header (e.g., "Bearer TOKEN")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the JWT_SECRET from environment variables
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by the ID extracted from the token and exclude the password field
      req.user = await User.findById(decoded.id).select('-password');

      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      // Log the error for debugging purposes
      console.error(error);
      // Set status to 401 Unauthorized
      res.status(401);
      // Throw an error indicating token failure
      throw new Error('Not authorized, token failed');
    }
  }

  // If no token is found in the request headers
  if (!token) {
    // Set status to 401 Unauthorized
    res.status(401);
    // Throw an error indicating no token was provided
    throw new Error('Not authorized, no token');
  }
});

export { protect };