const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, checkUsageLimit } = require('../middleware/auth');
const coverLetterController = require('../controllers/coverLetterController');

const router = express.Router();

// Input validation rules
const generateCoverLetterValidation = [
  body('resumeData')
    .isObject()
    .withMessage('Resume data is required'),
  body('jobDescription')
    .isString()
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters long'),
  body('companyInfo')
    .optional()
    .isObject()
    .withMessage('Company information must be an object'),
  body('tone')
    .optional()
    .isIn(['formal', 'professional', 'enthusiastic', 'confident'])
    .withMessage('Invalid tone selected'),
  body('customization')
    .optional()
    .isObject()
    .withMessage('Customization options must be an object')
];

// @route   POST /api/cover-letter/generate
// @desc    Generate AI cover letter
// @access  Private
router.post('/generate', protect, checkUsageLimit, generateCoverLetterValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resumeData, jobDescription, companyInfo, tone, customization } = req.body;

    const options = {
      tone: tone || 'professional',
      companyInfo: companyInfo || {},
      customization: customization || {}
    };

    const coverLetter = await coverLetterController.generateCoverLetter(resumeData, jobDescription, options);

    res.json({
      success: true,
      message: 'Cover letter generated successfully',
      data: {
        coverLetter,
        tone: options.tone,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Cover letter generation error:', error);
    res.status(500).json({
      error: 'Failed to generate cover letter. Please try again.'
    });
  }
});

// @route   GET /api/cover-letter/templates
// @desc    Get available cover letter templates
// @access  Public
router.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'standard',
      name: 'Standard',
      description: 'Traditional cover letter format with professional structure',
      features: ['Professional format', 'Standard sections', 'Classic layout']
    },
    {
      id: 'modern',
      name: 'Modern',
      description: 'Contemporary design with clean formatting and modern language',
      features: ['Modern language', 'Clean design', 'Current trends']
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Unique approach for creative industries and innovative companies',
      features: ['Creative approach', 'Unique structure', 'Industry-specific']
    },
    {
      id: 'executive',
      name: 'Executive',
      description: 'Leadership-focused format for senior-level positions',
      features: ['Leadership focus', 'Achievement emphasis', 'Strategic approach']
    },
    {
      id: 'technical',
      name: 'Technical',
      description: 'Designed for technical roles with emphasis on skills and expertise',
      features: ['Technical focus', 'Skills emphasis', 'Project highlights']
    },
    {
      id: 'career-change',
      name: 'Career Change',
      description: 'Specialized format for transitioning to a new career field',
      features: ['Transition focus', 'Transferable skills', 'Adaptation emphasis']
    }
  ];

  res.json({
    success: true,
    data: {
      templates,
      total: templates.length
    }
  });
});

// @route   POST /api/cover-letter/preview
// @desc    Generate cover letter preview (without consuming usage)
// @access  Private
router.post('/preview', protect, generateCoverLetterValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resumeData, jobDescription, companyInfo, tone, customization } = req.body;

    const options = {
      tone: tone || 'professional',
      companyInfo: companyInfo || {},
      customization: customization || {},
      preview: true
    };

    const coverLetter = await coverLetterController.generateCoverLetter(resumeData, jobDescription, options);

    res.json({
      success: true,
      message: 'Cover letter preview generated successfully',
      data: {
        coverLetter,
        tone: options.tone,
        isPreview: true
      }
    });

  } catch (error) {
    console.error('Cover letter preview error:', error);
    res.status(500).json({
      error: 'Failed to generate cover letter preview. Please try again.'
    });
  }
});

// @route   GET /api/cover-letter/tones
// @desc    Get available tone options for cover letters
// @access  Public
router.get('/tones', (req, res) => {
  const tones = [
    {
      id: 'formal',
      name: 'Formal',
      description: 'Traditional, professional tone suitable for conservative industries',
      useCase: 'Corporate, Legal, Finance, Government positions'
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Balanced, business-appropriate tone for most industries',
      useCase: 'General business, Technology, Healthcare positions'
    },
    {
      id: 'enthusiastic',
      name: 'Enthusiastic',
      description: 'Energetic, passionate tone showing genuine interest',
      useCase: 'Startups, Creative fields, Education, Non-profit'
    },
    {
      id: 'confident',
      name: 'Confident',
      description: 'Assertive, self-assured tone highlighting achievements',
      useCase: 'Sales, Marketing, Leadership, Executive positions'
    }
  ];

  res.json({
    success: true,
    data: {
      tones,
      total: tones.length
    }
  });
});

// @route   POST /api/cover-letter/analyze-job
// @desc    Analyze job description for better cover letter generation
// @access  Private
router.post('/analyze-job', protect, [
  body('jobDescription')
    .isString()
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { jobDescription } = req.body;

    const analysis = await coverLetterController.analyzeJobDescription(jobDescription);

    res.json({
      success: true,
      message: 'Job description analyzed successfully',
      data: {
        analysis
      }
    });

  } catch (error) {
    console.error('Job analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze job description. Please try again.'
    });
  }
});

// @route   GET /api/cover-letter/download/:id
// @desc    Download generated cover letter (placeholder)
// @access  Private
router.get('/download/:id', protect, (req, res) => {
  // TODO: Implement cover letter download functionality
  res.json({
    success: true,
    message: 'Cover letter download feature coming soon',
    data: {
      downloadUrl: null,
      format: 'pdf'
    }
  });
});

module.exports = router;