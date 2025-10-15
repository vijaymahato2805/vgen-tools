const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, checkUsageLimit } = require('../middleware/auth');
const resumeController = require('../controllers/resumeController');

const router = express.Router();

// Input validation rules
const generateResumeValidation = [
  body('personalInfo')
    .isObject()
    .withMessage('Personal information is required'),
  body('personalInfo.firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('personalInfo.lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('personalInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('personalInfo.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('template')
    .optional()
    .isIn(['modern', 'minimalist', 'academic', 'technical', 'creative', 'executive'])
    .withMessage('Invalid template selected'),
  body('customization')
    .optional()
    .isObject()
    .withMessage('Customization options must be an object'),
  body('sections')
    .optional()
    .isArray()
    .withMessage('Sections must be an array')
];

// @route   POST /api/resume/generate
// @desc    Generate AI resume
// @access  Private
router.post('/generate', protect, checkUsageLimit, generateResumeValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { personalInfo, experience, education, skills, projects, certifications, languages, template, customization } = req.body;

    const resumeData = {
      personalInfo,
      experience: experience || [],
      education: education || [],
      skills: skills || [],
      projects: projects || [],
      certifications: certifications || [],
      languages: languages || []
    };

    const options = {
      template: template || 'modern',
      customization: customization || {}
    };

    const resume = await resumeController.generateResume(resumeData, options);

    res.json({
      success: true,
      message: 'Resume generated successfully',
      data: {
        resume,
        template: options.template,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Resume generation error:', error);
    res.status(500).json({
      error: 'Failed to generate resume. Please try again.'
    });
  }
});

// @route   GET /api/resume/templates
// @desc    Get available resume templates
// @access  Public
router.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'modern',
      name: 'Modern',
      description: 'Clean, contemporary design with modern typography and spacing',
      preview: '/templates/modern-preview.png',
      features: ['Clean layout', 'Modern fonts', 'Professional colors']
    },
    {
      id: 'minimalist',
      name: 'Minimalist',
      description: 'Simple, clean design with plenty of white space',
      preview: '/templates/minimalist-preview.png',
      features: ['Minimal design', 'Clean lines', 'Focus on content']
    },
    {
      id: 'academic',
      name: 'Academic',
      description: 'Traditional academic format emphasizing research and publications',
      preview: '/templates/academic-preview.png',
      features: ['Research focus', 'Publication emphasis', 'Formal structure']
    },
    {
      id: 'technical',
      name: 'Technical',
      description: 'Designed for IT and technical professionals with skills emphasis',
      preview: '/templates/technical-preview.png',
      features: ['Skills highlight', 'Project focus', 'Technical layout']
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Unique, eye-catching design for creative professionals',
      preview: '/templates/creative-preview.png',
      features: ['Unique layout', 'Creative elements', 'Visual appeal']
    },
    {
      id: 'executive',
      name: 'Executive',
      description: 'Professional, leadership-focused design for senior positions',
      preview: '/templates/executive-preview.png',
      features: ['Leadership focus', 'Achievement emphasis', 'Professional tone']
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

// @route   POST /api/resume/preview
// @desc    Generate resume preview (without consuming usage)
// @access  Private
router.post('/preview', protect, generateResumeValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { personalInfo, experience, education, skills, projects, certifications, languages, template, customization } = req.body;

    const resumeData = {
      personalInfo,
      experience: experience || [],
      education: education || [],
      skills: skills || [],
      projects: projects || [],
      certifications: certifications || [],
      languages: languages || []
    };

    const options = {
      template: template || 'modern',
      customization: customization || {},
      preview: true
    };

    const resume = await resumeController.generateResume(resumeData, options);

    res.json({
      success: true,
      message: 'Resume preview generated successfully',
      data: {
        resume,
        template: options.template,
        isPreview: true
      }
    });

  } catch (error) {
    console.error('Resume preview error:', error);
    res.status(500).json({
      error: 'Failed to generate resume preview. Please try again.'
    });
  }
});

// @route   GET /api/resume/download/:id
// @desc    Download generated resume (placeholder)
// @access  Private
router.get('/download/:id', protect, (req, res) => {
  // TODO: Implement resume download functionality
  // This would typically retrieve a saved resume and return it as PDF or Word document
  res.json({
    success: true,
    message: 'Resume download feature coming soon',
    data: {
      downloadUrl: null,
      format: 'pdf'
    }
  });
});

module.exports = router;