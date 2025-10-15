const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, checkUsageLimit } = require('../middleware/auth');
const flashcardController = require('../controllers/flashcardController');

const router = express.Router();

// Input validation rules
const generateFlashcardsValidation = [
  body('content')
    .isString()
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters long'),
  body('subject')
    .optional()
    .isString()
    .withMessage('Subject must be a string'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard', 'mixed'])
    .withMessage('Invalid difficulty level'),
  body('count')
    .optional()
    .isInt({ min: 5, max: 20 })
    .withMessage('Count must be between 5 and 20'),
  body('customization')
    .optional()
    .isObject()
    .withMessage('Customization options must be an object')
];

// @route   POST /api/flashcard/generate
// @desc    Generate AI flashcards
// @access  Private
router.post('/generate', protect, checkUsageLimit, generateFlashcardsValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { content, subject, difficulty, count, customization } = req.body;

    const options = {
      subject: subject || 'general',
      difficulty: difficulty || 'mixed',
      count: count || 10,
      customization: customization || {}
    };

    const flashcards = await flashcardController.generateFlashcards(content, options);

    res.json({
      success: true,
      message: 'Flashcards generated successfully',
      data: {
        flashcards: flashcards.flashcards,
        totalCards: flashcards.totalCards,
        estimatedStudyTime: flashcards.estimatedStudyTime,
        subject: options.subject,
        difficulty: options.difficulty,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Flashcard generation error:', error);
    res.status(500).json({
      error: 'Failed to generate flashcards. Please try again.'
    });
  }
});

// @route   GET /api/flashcard/subjects
// @desc    Get available subjects for flashcards
// @access  Public
router.get('/subjects', (req, res) => {
  const subjects = [
    {
      id: 'general',
      name: 'General Knowledge',
      description: 'General topics and concepts',
      categories: ['General', 'Miscellaneous', 'Basic Knowledge']
    },
    {
      id: 'programming',
      name: 'Programming',
      description: 'Programming languages and concepts',
      categories: ['JavaScript', 'Python', 'Java', 'C++', 'Algorithms', 'Data Structures']
    },
    {
      id: 'mathematics',
      name: 'Mathematics',
      description: 'Math concepts and formulas',
      categories: ['Algebra', 'Calculus', 'Geometry', 'Statistics', 'Trigonometry']
    },
    {
      id: 'science',
      name: 'Science',
      description: 'Scientific concepts and principles',
      categories: ['Physics', 'Chemistry', 'Biology', 'Earth Science']
    },
    {
      id: 'language',
      name: 'Language Learning',
      description: 'Vocabulary and grammar',
      categories: ['English', 'Spanish', 'French', 'German', 'Grammar', 'Vocabulary']
    },
    {
      id: 'history',
      name: 'History',
      description: 'Historical events and figures',
      categories: ['World History', 'Ancient History', 'Modern History', 'Geography']
    },
    {
      id: 'medical',
      name: 'Medical',
      description: 'Medical terminology and concepts',
      categories: ['Anatomy', 'Physiology', 'Medical Terms', 'Diseases']
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Business concepts and terminology',
      categories: ['Marketing', 'Finance', 'Management', 'Economics']
    }
  ];

  res.json({
    success: true,
    data: {
      subjects,
      total: subjects.length
    }
  });
});

// @route   POST /api/flashcard/preview
// @desc    Generate flashcard preview (without consuming usage)
// @access  Private
router.post('/preview', protect, generateFlashcardsValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { content, subject, difficulty, count, customization } = req.body;

    const options = {
      subject: subject || 'general',
      difficulty: difficulty || 'mixed',
      count: Math.min(count || 5, 5), // Limit preview to 5 cards
      customization: customization || {},
      preview: true
    };

    const flashcards = await flashcardController.generateFlashcards(content, options);

    res.json({
      success: true,
      message: 'Flashcard preview generated successfully',
      data: {
        flashcards: flashcards.flashcards,
        totalCards: flashcards.totalCards,
        subject: options.subject,
        isPreview: true,
        previewNote: 'This is a preview. Generate full set for complete flashcards.'
      }
    });

  } catch (error) {
    console.error('Flashcard preview error:', error);
    res.status(500).json({
      error: 'Failed to generate flashcard preview. Please try again.'
    });
  }
});

// @route   POST /api/flashcard/generate-study-plan
// @desc    Generate spaced repetition study plan
// @access  Private
router.post('/generate-study-plan', protect, [
  body('flashcardIds')
    .isArray({ min: 1 })
    .withMessage('Flashcard IDs are required'),
  body('studyDays')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Study days must be between 1 and 30'),
  body('dailyCards')
    .optional()
    .isInt({ min: 5, max: 50 })
    .withMessage('Daily cards must be between 5 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { flashcardIds, studyDays = 7, dailyCards = 20 } = req.body;

    const studyPlan = await flashcardController.generateStudyPlan(flashcardIds, {
      studyDays,
      dailyCards
    });

    res.json({
      success: true,
      message: 'Study plan generated successfully',
      data: {
        studyPlan,
        totalCards: flashcardIds.length,
        studyDays,
        dailyCards,
        estimatedCompletion: new Date(Date.now() + (studyDays * 24 * 60 * 60 * 1000)).toISOString()
      }
    });

  } catch (error) {
    console.error('Study plan generation error:', error);
    res.status(500).json({
      error: 'Failed to generate study plan. Please try again.'
    });
  }
});

// @route   GET /api/flashcard/spaced-repetition-algorithms
// @desc    Get available spaced repetition algorithms
// @access  Public
router.get('/spaced-repetition-algorithms', (req, res) => {
  const algorithms = [
    {
      id: 'leitner',
      name: 'Leitner System',
      description: 'Cards move between boxes based on performance',
      intervals: [1, 3, 7, 14, 30],
      difficulty: 'Simple',
      bestFor: 'Beginners and consistent study patterns'
    },
    {
      id: 'sm2',
      name: 'SM-2 Algorithm',
      description: 'SuperMemo-2 algorithm with variable intervals',
      intervals: 'Dynamic based on performance',
      difficulty: 'Moderate',
      bestFor: 'Long-term retention and adaptive scheduling'
    },
    {
      id: 'anki',
      name: 'Anki Algorithm',
      description: 'Modified SM-2 with fuzzy intervals',
      intervals: 'Dynamic with randomization',
      difficulty: 'Advanced',
      bestFor: 'Complex subjects and varied study sessions'
    },
    {
      id: 'custom',
      name: 'Custom Schedule',
      description: 'User-defined study intervals',
      intervals: 'User configurable',
      difficulty: 'Flexible',
      bestFor: 'Personalized study preferences'
    }
  ];

  res.json({
    success: true,
    data: {
      algorithms,
      total: algorithms.length,
      recommended: 'sm2'
    }
  });
});

// @route   POST /api/flashcard/schedule-review
// @desc    Schedule flashcard review session
// @access  Private
router.post('/schedule-review', protect, [
  body('flashcardId')
    .isString()
    .notEmpty()
    .withMessage('Flashcard ID is required'),
  body('performance')
    .isIn(['easy', 'good', 'hard', 'again'])
    .withMessage('Valid performance rating is required'),
  body('algorithm')
    .optional()
    .isIn(['leitner', 'sm2', 'anki', 'custom'])
    .withMessage('Valid algorithm must be specified')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { flashcardId, performance, algorithm = 'sm2' } = req.body;

    const nextReview = await flashcardController.scheduleNextReview(flashcardId, performance, algorithm);

    res.json({
      success: true,
      message: 'Next review scheduled successfully',
      data: {
        flashcardId,
        performance,
        algorithm,
        nextReview,
        interval: nextReview.interval,
        easeFactor: nextReview.easeFactor || 2.5
      }
    });

  } catch (error) {
    console.error('Review scheduling error:', error);
    res.status(500).json({
      error: 'Failed to schedule review. Please try again.'
    });
  }
});

// @route   GET /api/flashcard/study-stats/:userId
// @desc    Get user's flashcard study statistics
// @access  Private
router.get('/study-stats/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is requesting their own stats or is admin
    if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Can only view your own statistics.'
      });
    }

    const stats = await flashcardController.getStudyStats(userId);

    res.json({
      success: true,
      data: {
        stats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Study stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve study statistics. Please try again.'
    });
  }
});

module.exports = router;