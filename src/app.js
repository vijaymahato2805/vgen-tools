const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
console.log('DEBUG: src/app.js started.');

const app = express();
const PORT = process.env.PORT || 3000;
console.log(`DEBUG: Server will attempt to run on port: ${PORT}`);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../templates'));


// Routes
console.log('DEBUG: Loading routes...');
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const coverLetterRoutes = require('./routes/coverLetter');
const bioRoutes = require('./routes/bio');
const flashcardRoutes = require('./routes/flashcard');
const analyzerRoutes = require('./routes/analyzer');
const interviewRoutes = require('./routes/interview');
const serviceRoutes = require('./routes/service');
const historyRoutes = require('./routes/history');
console.log('DEBUG: Routes loaded.');

console.log('DEBUG: Registering API routes...');
app.use('/api/auth', authRoutes);
console.log('DEBUG: /api/auth registered.');
app.use('/api/resume', resumeRoutes);
console.log('DEBUG: /api/resume registered.');
app.use('/api/cover-letter', coverLetterRoutes);
console.log('DEBUG: /api/cover-letter registered.');
app.use('/api/bio', bioRoutes);
console.log('DEBUG: /api/bio registered.');
app.use('/api/flashcard', flashcardRoutes);
console.log('DEBUG: /api/flashcard registered.');
app.use('/api/analyzer', analyzerRoutes);
console.log('DEBUG: /api/analyzer registered.');
app.use('/api/interview', interviewRoutes);
console.log('DEBUG: /api/interview registered.');
app.use('/api/service', serviceRoutes);
console.log('DEBUG: /api/service registered.');
app.use('/api/history', historyRoutes);
console.log('DEBUG: /api/history registered.');
console.log('DEBUG: All API routes registered.');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler - serve frontend for GET requests
app.use((req, res) => {
  // For GET requests that don't match API routes, serve the frontend
  if (req.method === 'GET' && !req.path.startsWith('/api/') && req.path !== '/health') {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('DEBUG: Global error handler caught an error:', err);
  console.error('Error stack:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
if (require.main === module) {
  console.log('DEBUG: Attempting to start server...');
  app.listen(PORT, () => {
    console.log(`🚀 VGen Tools server running on port ${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  }).on('error', (err) => {
    console.error('DEBUG: Server failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;