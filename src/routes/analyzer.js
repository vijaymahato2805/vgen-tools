const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { protect, checkUsageLimit } = require('../middleware/auth');
const analyzerController = require('../controllers/analyzerController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' ||
        file.mimetype === 'text/plain' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, DOC, and DOCX files are allowed.'), false);
    }
  }
});

// Input validation rules
const analyzeResumeValidation = [
  body('resumeText')
    .optional()
    .isString()
    .isLength({ min: 100 })
    .withMessage('Resume text must be at least 100 characters long'),
  body('jobDescription')
    .optional()
    .isString()
    .isLength({ min: 50 })
    .withMessage('Job description must be at least 50 characters long'),
  body('industry')
    .optional()
    .isString()
    .withMessage('Industry must be a string'),
  body('experienceLevel')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'executive'])
    .withMessage('Invalid experience level')
];

// @route   POST /api/analyzer/analyze
// @desc    Analyze resume with AI
// @access  Private
router.post('/analyze', protect, checkUsageLimit, analyzeResumeValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resumeText, jobDescription, industry, experienceLevel } = req.body;

    if (!resumeText && !req.file) {
      return res.status(400).json({
        error: 'Either resume text or file must be provided'
      });
    }

    const options = {
      industry: industry || 'general',
      experienceLevel: experienceLevel || 'mid',
      jobDescription: jobDescription || ''
    };

    let textToAnalyze = resumeText;

    // If file is uploaded, extract text from it
    if (req.file) {
      textToAnalyze = await analyzerController.extractTextFromFile(req.file);
    }

    const analysis = await analyzerController.analyzeResume(textToAnalyze, options);

    res.json({
      success: true,
      message: 'Resume analyzed successfully',
      data: {
        analysis,
        industry: options.industry,
        experienceLevel: options.experienceLevel,
        analyzedAt: new Date().toISOString(),
        textLength: textToAnalyze.length
      }
    });

  } catch (error) {
    console.error('Resume analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze resume. Please try again.'
    });
  }
});

// @route   POST /api/analyzer/analyze-file
// @desc    Analyze uploaded resume file
// @access  Private
router.post('/analyze-file', protect, checkUsageLimit, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Resume file is required'
      });
    }

    const { jobDescription, industry, experienceLevel } = req.body;

    const options = {
      industry: industry || 'general',
      experienceLevel: experienceLevel || 'mid',
      jobDescription: jobDescription || ''
    };

    const textToAnalyze = await analyzerController.extractTextFromFile(req.file);
    const analysis = await analyzerController.analyzeResume(textToAnalyze, options);

    res.json({
      success: true,
      message: 'Resume file analyzed successfully',
      data: {
        analysis,
        filename: req.file.originalname,
        fileSize: req.file.size,
        industry: options.industry,
        experienceLevel: options.experienceLevel,
        analyzedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Resume file analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze resume file. Please try again.'
    });
  }
});

// @route   POST /api/analyzer/ats-score
// @desc    Get ATS compatibility score
// @access  Private
router.post('/ats-score', protect, [
  body('resumeText')
    .isString()
    .isLength({ min: 100 })
    .withMessage('Resume text is required'),
  body('jobDescription')
    .optional()
    .isString()
    .withMessage('Job description must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resumeText, jobDescription } = req.body;

    const atsScore = await analyzerController.calculateATSScore(resumeText, jobDescription);

    res.json({
      success: true,
      message: 'ATS score calculated successfully',
      data: {
        atsScore,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('ATS score calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate ATS score. Please try again.'
    });
  }
});

// @route   GET /api/analyzer/industries
// @desc    Get available industry categories
// @access  Public
router.get('/industries', (req, res) => {
  const industries = [
    {
      id: 'technology',
      name: 'Technology',
      description: 'Software, Hardware, IT Services',
      keywords: ['JavaScript', 'Python', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes']
    },
    {
      id: 'healthcare',
      name: 'Healthcare',
      description: 'Medical, Pharmaceutical, Biotechnology',
      keywords: ['HIPAA', 'FDA', 'Clinical', 'Patient Care', 'Medical Records']
    },
    {
      id: 'finance',
      name: 'Finance',
      description: 'Banking, Investment, Insurance',
      keywords: ['Financial Analysis', 'Risk Management', 'CFA', 'Bloomberg', 'Excel']
    },
    {
      id: 'education',
      name: 'Education',
      description: 'Teaching, Administration, Research',
      keywords: ['Curriculum Development', 'Classroom Management', 'Assessment', 'Pedagogy']
    },
    {
      id: 'marketing',
      name: 'Marketing',
      description: 'Digital Marketing, Advertising, PR',
      keywords: ['SEO', 'Content Marketing', 'Google Analytics', 'Social Media', 'Branding']
    },
    {
      id: 'engineering',
      name: 'Engineering',
      description: 'Mechanical, Electrical, Civil Engineering',
      keywords: ['CAD', 'AutoCAD', 'Project Management', 'Quality Control', 'Safety']
    },
    {
      id: 'sales',
      name: 'Sales',
      description: 'Business Development, Account Management',
      keywords: ['CRM', 'Lead Generation', 'Relationship Building', 'Negotiation']
    },
    {
      id: 'general',
      name: 'General',
      description: 'General business and administration',
      keywords: ['Project Management', 'Communication', 'Leadership', 'Organization']
    }
  ];

  res.json({
    success: true,
    data: {
      industries,
      total: industries.length
    }
  });
});

// @route   POST /api/analyzer/keyword-optimization
// @desc    Optimize resume with keywords
// @access  Private
router.post('/keyword-optimization', protect, [
  body('resumeText')
    .isString()
    .isLength({ min: 100 })
    .withMessage('Resume text is required'),
  body('jobDescription')
    .isString()
    .isLength({ min: 50 })
    .withMessage('Job description is required'),
  body('industry')
    .optional()
    .isString()
    .withMessage('Industry must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resumeText, jobDescription, industry } = req.body;

    const optimization = await analyzerController.optimizeKeywords(resumeText, jobDescription, {
      industry: industry || 'general'
    });

    res.json({
      success: true,
      message: 'Keywords optimized successfully',
      data: {
        optimization,
        industry: industry || 'general',
        optimizedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Keyword optimization error:', error);
    res.status(500).json({
      error: 'Failed to optimize keywords. Please try again.'
    });
  }
});

// @route   GET /api/analyzer/ats-tips
// @desc    Get ATS optimization tips
// @access  Public
router.get('/ats-tips', (req, res) => {
  const tips = {
    formatting: [
      'Use standard fonts (Arial, Calibri, Times New Roman)',
      'Keep font size between 10-12 points',
      'Use bold for headings, not italics or underline',
      'Avoid tables, graphics, and images',
      'Use standard section headings (Experience, Education, Skills)'
    ],
    content: [
      'Include relevant keywords from job description',
      'Quantify achievements with numbers',
      'Use action verbs to start bullet points',
      'Keep bullet points concise (1-2 lines)',
      'Include location and contact information',
      'Save as .docx or .pdf with standard naming'
    ],
    structure: [
      'Put most important information first',
      'Use reverse chronological order',
      'Include all standard sections',
      'Keep resume to 1-2 pages',
      'Use consistent formatting throughout'
    ],
    commonMistakes: [
      'Using fancy graphics or unusual fonts',
      'Including personal information (age, marital status)',
      'Using headers/footers for important information',
      'Submitting in wrong file format',
      'Having spelling or grammatical errors'
    ]
  };

  res.json({
    success: true,
    data: {
      tips,
      categories: Object.keys(tips),
      totalTips: Object.values(tips).flat().length
    }
  });
});

// @route   POST /api/analyzer/compare-resumes
// @desc    Compare multiple resumes for a job
// @access  Private
router.post('/compare-resumes', protect, checkUsageLimit, [
  body('resumes')
    .isArray({ min: 2, max: 5 })
    .withMessage('Must provide 2-5 resumes to compare'),
  body('jobDescription')
    .isString()
    .isLength({ min: 50 })
    .withMessage('Job description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resumes, jobDescription } = req.body;

    const comparison = await analyzerController.compareResumes(resumes, jobDescription);

    res.json({
      success: true,
      message: 'Resume comparison completed successfully',
      data: {
        comparison,
        totalResumes: resumes.length,
        comparedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Resume comparison error:', error);
    res.status(500).json({
      error: 'Failed to compare resumes. Please try again.'
    });
  }
});

// @route   POST /api/analyzer/extract-skills
// @desc    Extract skills from resume text
// @access  Private
router.post('/extract-skills', protect, [
  body('resumeText')
    .isString()
    .isLength({ min: 100 })
    .withMessage('Resume text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resumeText } = req.body;

    const skills = await analyzerController.extractSkills(resumeText);

    res.json({
      success: true,
      message: 'Skills extracted successfully',
      data: {
        skills,
        extractedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Skill extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract skills. Please try again.'
    });
  }
});

module.exports = router;