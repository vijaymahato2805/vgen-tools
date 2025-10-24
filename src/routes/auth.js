const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
console.log('DEBUG: src/routes/auth.js started.');

// Try Supabase first, fallback to local if connection fails
let UserModel;
let usingSupabase = false;

// Initialize user model with proper connection testing
async function initializeUserModel() {
  console.log('DEBUG: Initializing user model...');
  try {
    // Test if we can actually connect to Supabase
    const { supabase, isOnline } = require('../config/supabase');
    const supabaseIsOnline = await isOnline; // Await the promise
    
    if (!supabaseIsOnline) {
      throw new Error('Supabase connection test failed in config/supabase.js');
    }
    
    // If we get here, Supabase is working
    const testSupabase = require('../models/UserSupabase');
    UserModel = testSupabase;
    usingSupabase = true;
    console.log('✅ Using Supabase for authentication (connection verified)');
  } catch (error) {
    console.error('ERROR: Supabase connection failed in auth.js, using local fallback:', error.message);
    UserModel = require('../models/UserLocal');
    usingSupabase = false;
  }
  console.log('DEBUG: User model initialized. Using Supabase:', usingSupabase);
}

// Initialize immediately but don't block the module loading
initializeUserModel().catch((err) => {
  console.error('ERROR: initializeUserModel caught an unexpected error:', err.message);
  console.log('⚠️  Fallback to local authentication due to initialization error');
  UserModel = require('../models/UserLocal');
  usingSupabase = false;
});

// Set default to local for immediate use
if (!UserModel) {
  console.log('DEBUG: UserModel not set, defaulting to UserLocal.');
  UserModel = require('../models/UserLocal');
  usingSupabase = false;
}
console.log('DEBUG: Current UserModel:', UserModel.name || 'Unknown');
const {
  generateToken,
  protect,
  optionalAuth,
  authRateLimit,
  checkUsageLimit
} = require('../middleware/auth');

const router = express.Router();

// Input validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimit, registerValidation, async (req, res) => {
  console.log('DEBUG: POST /api/auth/register hit.');
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('DEBUG: Register validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    console.log('DEBUG: Register validation passed.');

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with this email address'
      });
    }

    // Create new user
    console.log('🔧 Creating user with model:', UserModel.name || 'Unknown');
    console.log(`[Vercel] Attempting to create user: ${email}`);
    const user = await UserModel.create({
      email,
      password,
      firstName,
      lastName
    });
    console.log(`[Vercel] User created successfully: ${user.id}`);

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('ERROR: Registration error:', error);
    res.status(500).json({
      error: 'Registration failed. Please try again.'
    });
  }
});
console.log('DEBUG: POST /api/auth/register route configured.');

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authRateLimit, loginValidation, async (req, res) => {
  console.log('DEBUG: POST /api/auth/login hit.');
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('DEBUG: Login validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    console.log('DEBUG: Login validation passed.');

    const { email, password } = req.body;

    // Find user by email
    console.log(`[Vercel] Finding user by email: ${email}`);
    const user = await UserModel.findByEmail(email);

    if (!user) {
      console.log(`[Vercel] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[Vercel] User found: ${email}. Comparing password...`);
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log(`[Vercel] Password does not match for user: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[Vercel] Password matches for user: ${email}`);

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account has been deactivated. Please contact support.'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('ERROR: Login error:', error);
    res.status(500).json({
      error: 'Login failed. Please try again.'
    });
  }
});
console.log('DEBUG: POST /api/auth/login route configured.');

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  console.log('DEBUG: GET /api/auth/me hit.');
  try {
    const user = await UserModel.findById(req.user.id);
    console.log('DEBUG: User found for /me:', !!user);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('ERROR: Get profile error:', error);
    res.status(500).json({
      error: 'Failed to retrieve profile'
    });
  }
});
console.log('DEBUG: GET /api/auth/me route configured.');

// @route   PUT /api/auth/me
// @desc    Update current user profile
// @access  Private
router.put('/me', protect, async (req, res) => {
  console.log('DEBUG: PUT /api/auth/me hit.');
  try {
    const updates = req.body;
    const allowedUpdates = ['firstName', 'lastName', 'bio', 'location', 'website', 'linkedin', 'github', 'preferences'];
    console.log('DEBUG: Updates received for /me:', updates);

    // Filter out disallowed updates
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const user = await UserModel.findById(req.user.id);
    if (user) {
      Object.assign(user, filteredUpdates);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('ERROR: Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile'
    });
  }
});
console.log('DEBUG: PUT /api/auth/me route configured.');

// @route   POST /api/auth/logout
// @desc    Logout user (client-side should remove token)
// @access  Private
router.post('/logout', protect, (req, res) => {
  console.log('DEBUG: POST /api/auth/logout hit.');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});
console.log('DEBUG: POST /api/auth/logout route configured.');

// @route   GET /api/auth/usage
// @desc    Get current usage statistics
// @access  Private
router.get('/usage', protect, async (req, res) => {
  console.log('DEBUG: GET /api/auth/usage hit.');
  try {
    const user = await UserModel.findById(req.user.id);
    console.log('DEBUG: User found for /usage:', !!user);

    res.json({
      success: true,
      data: {
        usage: {
          current: user.subscription.usageCount,
          limit: user.subscription.monthlyLimit,
          resetDate: user.subscription.resetDate,
          canMakeRequest: user.canMakeRequest()
        }
      }
    });

  } catch (error) {
    console.error('ERROR: Usage check error:', error);
    res.status(500).json({
      error: 'Failed to retrieve usage information'
    });
  }
});
console.log('DEBUG: GET /api/auth/usage route configured.');

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  console.log('DEBUG: POST /api/auth/forgot-password hit.');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('DEBUG: Forgot password validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    console.log('DEBUG: Forgot password validation passed.');

    const { email } = req.body;

    const user = await UserModel.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // TODO: Send email with reset token
    // For now, we'll just return success
    console.log('Password reset token generated:', resetToken);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('ERROR: Forgot password error:', error);
    res.status(500).json({
      error: 'Failed to process password reset request'
    });
  }
});
console.log('DEBUG: POST /api/auth/forgot-password route configured.');

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  console.log('DEBUG: POST /api/auth/reset-password/:token hit.');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('DEBUG: Reset password validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    console.log('DEBUG: Reset password validation passed.');

    const { password } = req.body;
    const { token } = req.params;

    // Find user with valid reset token
    const users = await UserModel.find({ passwordResetToken: crypto.createHash('sha256').update(token).digest('hex') });
    const user = users.find(u => u.password_reset_expires && new Date(u.password_reset_expires) > new Date());

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password_hash = await bcrypt.hash(password, 12);
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('ERROR: Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password'
    });
  }
});
console.log('DEBUG: POST /api/auth/reset-password/:token route configured.');
console.log('DEBUG: src/routes/auth.js finished initialization.');

module.exports = router;