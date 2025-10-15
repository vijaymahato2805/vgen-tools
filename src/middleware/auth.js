const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Dynamic user model selection
let UserModel;
try {
  // Test if we can use Supabase
  const UserSupabase = require('../models/UserSupabase');
  UserModel = UserSupabase;
  console.log(' Auth middleware using Supabase model');
} catch (error) {
  console.log(' Auth middleware using local fallback model');
  UserModel = require('../models/UserLocal');
}

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    // Get the Authorization header token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await UserModel.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({
          error: 'Token is not valid. User not found.'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          error: 'Account has been deactivated.'
        });
      }

      req.user = user;
      next();

    } catch (error) {
      console.error('JWT verification error:', error);
      return res.status(401).json({
        error: 'Token is not valid.'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Server error during authentication'
    });
  }
};

// Check if user is authenticated (optional auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);

          const user = await UserModel.findById(decoded.userId);

          if (user && user.is_active) {
            req.user = user;
          }
        } catch (error) {
          // Token is invalid but we don't fail the request
          console.log('Invalid token in optional auth:', error.message);
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

// Check user role/permissions
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied. Not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Rate limiting for authentication routes
const authRateLimit = (req, res, next) => {
  // This would typically use Redis or in-memory store for production
  // For now, we'll implement a simple in-memory rate limiter
  const clientIP = req.ip || req.connection.remoteAddress;
  const key = `auth_attempts_${clientIP}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // Simple in-memory store (in production, use Redis)
  if (!global.authAttempts) {
    global.authAttempts = {};
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean old attempts
  if (!global.authAttempts[key]) {
    global.authAttempts[key] = [];
  }

  global.authAttempts[key] = global.authAttempts[key].filter(
    timestamp => timestamp > windowStart
  );

  if (global.authAttempts[key].length >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many authentication attempts. Please try again later.'
    });
  }

  global.authAttempts[key].push(now);
  next();
};

// Check if user can make API requests (usage limits)
const checkUsageLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Check if user can make more requests
    if (!req.user.canMakeRequest()) {
      return res.status(429).json({
        error: 'Usage limit exceeded. Please upgrade your plan or try again next month.',
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('Usage limit check error:', error);
    next();
  }
};

// Middleware to increment usage count after successful requests
const incrementUsage = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    // Increment usage count after successful response
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      req.user.incrementUsage().catch(error => {
        console.error('Error incrementing usage:', error);
      });
    }

    originalSend.call(this, data);
  };

  next();
};

module.exports = {
  generateToken,
  protect,
  optionalAuth,
  authorize,
  authRateLimit,
  checkUsageLimit,
  incrementUsage
};