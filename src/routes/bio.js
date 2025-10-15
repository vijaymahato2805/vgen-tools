const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, checkUsageLimit } = require('../middleware/auth');
const bioController = require('../controllers/bioController');

const router = express.Router();

// Input validation rules
const generateBioValidation = [
  body('personalInfo')
    .isObject()
    .withMessage('Personal information is required'),
  body('platform')
    .isIn(['linkedin', 'twitter', 'instagram', 'general', 'website'])
    .withMessage('Valid platform must be specified'),
  body('tone')
    .optional()
    .isIn(['professional', 'casual', 'creative', 'technical', 'friendly'])
    .withMessage('Invalid tone selected'),
  body('includeEmojis')
    .optional()
    .isBoolean()
    .withMessage('includeEmojis must be a boolean'),
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('customization')
    .optional()
    .isObject()
    .withMessage('Customization options must be an object')
];

// @route   POST /api/bio/generate
// @desc    Generate AI bio
// @access  Private
router.post('/generate', protect, checkUsageLimit, generateBioValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { personalInfo, experience, skills, achievements, platform, tone, includeEmojis, keywords, customization } = req.body;

    const bioData = {
      personalInfo,
      experience: experience || [],
      skills: skills || [],
      achievements: achievements || []
    };

    const options = {
      platform: platform || 'general',
      tone: tone || 'professional',
      includeEmojis: includeEmojis || false,
      keywords: keywords || [],
      customization: customization || {}
    };

    const bio = await bioController.generateBio(bioData, options);

    res.json({
      success: true,
      message: 'Bio generated successfully',
      data: {
        bio,
        platform: options.platform,
        tone: options.tone,
        characterCount: bio.length,
        wordCount: bio.split(' ').length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bio generation error:', error);
    res.status(500).json({
      error: 'Failed to generate bio. Please try again.'
    });
  }
});

// @route   GET /api/bio/platforms
// @desc    Get available platforms and their specifications
// @access  Public
router.get('/platforms', (req, res) => {
  const platforms = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Professional networking platform',
      maxLength: 2600,
      audience: 'Professionals, recruiters, business contacts',
      bestFor: 'Career networking, job searching, professional branding',
      tips: [
        'Focus on professional achievements and expertise',
        'Include industry keywords for better visibility',
        'Mention career goals and aspirations',
        'Use complete sentences and professional language'
      ],
      features: ['Professional tone', 'Industry keywords', 'Achievement focus']
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      description: 'Micro-blogging and social networking',
      maxLength: 160,
      audience: 'General public, professionals, industry peers',
      bestFor: 'Quick professional updates, networking, personal branding',
      tips: [
        'Be concise and impactful',
        'Use relevant hashtags',
        'Show personality while maintaining professionalism',
        'Include call-to-action when appropriate'
      ],
      features: ['Concise format', 'Hashtag support', 'Personal touch']
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Photo and video sharing platform',
      maxLength: 150,
      audience: 'Visual audience, younger professionals, creatives',
      bestFor: 'Creative professionals, visual storytelling, personal brand',
      tips: [
        'Can include emojis for visual appeal',
        'Focus on creativity and unique perspective',
        'Use engaging, conversational tone',
        'Highlight visual or creative work'
      ],
      features: ['Visual appeal', 'Emoji support', 'Creative focus']
    },
    {
      id: 'general',
      name: 'General Purpose',
      description: 'All-purpose professional bio',
      maxLength: 500,
      audience: 'General professional use',
      bestFor: 'Websites, portfolios, general professional profiles',
      tips: [
        'Balanced length and detail',
        'Professional yet approachable tone',
        'Comprehensive overview of expertise',
        'Include key achievements and skills'
      ],
      features: ['Balanced length', 'Comprehensive info', 'Professional tone']
    },
    {
      id: 'website',
      name: 'Website/About Page',
      description: 'Personal or professional website bio',
      maxLength: 1000,
      audience: 'Website visitors, potential clients, employers',
      bestFor: 'Personal websites, about pages, professional portfolios',
      tips: [
        'More detailed and narrative style',
        'Tell your professional story',
        'Include unique value proposition',
        'Show personality and approachability'
      ],
      features: ['Detailed narrative', 'Story telling', 'Personal touch']
    }
  ];

  res.json({
    success: true,
    data: {
      platforms,
      total: platforms.length
    }
  });
});

// @route   GET /api/bio/tones
// @desc    Get available tone options
// @access  Public
router.get('/tones', (req, res) => {
  const tones = [
    {
      id: 'professional',
      name: 'Professional',
      description: 'Formal, business-appropriate tone',
      useCase: 'Corporate environments, conservative industries',
      characteristics: ['Formal language', 'Achievement focused', 'Industry terminology']
    },
    {
      id: 'casual',
      name: 'Casual',
      description: 'Friendly, approachable tone',
      useCase: 'Creative industries, startups, personal branding',
      characteristics: ['Conversational', 'Personable', 'Approachable']
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Unique, expressive tone',
      useCase: 'Design, arts, creative fields',
      characteristics: ['Expressive', 'Unique voice', 'Creative flair']
    },
    {
      id: 'technical',
      name: 'Technical',
      description: 'Precise, expertise-focused tone',
      useCase: 'IT, engineering, technical fields',
      characteristics: ['Technical terminology', 'Expertise focus', 'Precise language']
    },
    {
      id: 'friendly',
      name: 'Friendly',
      description: 'Warm, welcoming tone',
      useCase: 'Service industries, education, community roles',
      characteristics: ['Warm language', 'Welcoming', 'Approachable']
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

// @route   POST /api/bio/preview
// @desc    Generate bio preview (without consuming usage)
// @access  Private
router.post('/preview', protect, generateBioValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { personalInfo, experience, skills, achievements, platform, tone, includeEmojis, keywords, customization } = req.body;

    const bioData = {
      personalInfo,
      experience: experience || [],
      skills: skills || [],
      achievements: achievements || []
    };

    const options = {
      platform: platform || 'general',
      tone: tone || 'professional',
      includeEmojis: includeEmojis || false,
      keywords: keywords || [],
      customization: customization || {},
      preview: true
    };

    const bio = await bioController.generateBio(bioData, options);

    res.json({
      success: true,
      message: 'Bio preview generated successfully',
      data: {
        bio,
        platform: options.platform,
        tone: options.tone,
        characterCount: bio.length,
        wordCount: bio.split(' ').length,
        isPreview: true
      }
    });

  } catch (error) {
    console.error('Bio preview error:', error);
    res.status(500).json({
      error: 'Failed to generate bio preview. Please try again.'
    });
  }
});

// @route   POST /api/bio/optimize-keywords
// @desc    Optimize bio with specific keywords
// @access  Private
router.post('/optimize-keywords', protect, [
  body('currentBio')
    .isString()
    .notEmpty()
    .withMessage('Current bio is required'),
  body('keywords')
    .isArray({ min: 1 })
    .withMessage('At least one keyword is required'),
  body('platform')
    .isIn(['linkedin', 'twitter', 'instagram', 'general', 'website'])
    .withMessage('Valid platform must be specified')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentBio, keywords, platform, tone } = req.body;

    const optimizedBio = await bioController.optimizeBioWithKeywords(currentBio, keywords, {
      platform: platform || 'general',
      tone: tone || 'professional'
    });

    res.json({
      success: true,
      message: 'Bio optimized with keywords successfully',
      data: {
        originalBio: currentBio,
        optimizedBio,
        keywords,
        platform,
        characterCount: optimizedBio.length,
        improvements: 'Keywords integrated naturally into bio'
      }
    });

  } catch (error) {
    console.error('Bio optimization error:', error);
    res.status(500).json({
      error: 'Failed to optimize bio. Please try again.'
    });
  }
});

// @route   POST /api/bio/generate-variations
// @desc    Generate multiple bio variations for A/B testing
// @access  Private
router.post('/generate-variations', protect, checkUsageLimit, [
  body('personalInfo')
    .isObject()
    .withMessage('Personal information is required'),
  body('platform')
    .isIn(['linkedin', 'twitter', 'instagram', 'general', 'website'])
    .withMessage('Valid platform must be specified'),
  body('count')
    .optional()
    .isInt({ min: 2, max: 5 })
    .withMessage('Count must be between 2 and 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { personalInfo, experience, skills, achievements, platform, count = 3, tone } = req.body;

    const bioData = {
      personalInfo,
      experience: experience || [],
      skills: skills || [],
      achievements: achievements || []
    };

    const variations = await bioController.generateBioVariations(bioData, platform, count, {
      tone: tone || 'professional'
    });

    res.json({
      success: true,
      message: 'Bio variations generated successfully',
      data: {
        variations,
        platform,
        count,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bio variations error:', error);
    res.status(500).json({
      error: 'Failed to generate bio variations. Please try again.'
    });
  }
});

module.exports = router;