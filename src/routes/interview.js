const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, checkUsageLimit } = require('../middleware/auth');
const interviewController = require('../controllers/interviewController');

const router = express.Router();

// Input validation rules
const generateQuestionsValidation = [
  body('jobDescription')
    .isString()
    .isLength({ min: 50 })
    .withMessage('Job description must be at least 50 characters long'),
  body('questionType')
    .optional()
    .isIn(['technical', 'behavioral', 'situational', 'mixed'])
    .withMessage('Invalid question type'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard', 'mixed'])
    .withMessage('Invalid difficulty level'),
  body('count')
    .optional()
    .isInt({ min: 5, max: 20 })
    .withMessage('Count must be between 5 and 20'),
  body('industry')
    .optional()
    .isString()
    .withMessage('Industry must be a string'),
  body('customization')
    .optional()
    .isObject()
    .withMessage('Customization options must be an object')
];

// @route   POST /api/interview/generate-questions
// @desc    Generate AI interview questions
// @access  Private
router.post('/generate-questions', protect, checkUsageLimit, generateQuestionsValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { jobDescription, questionType, difficulty, count, industry, customization } = req.body;

    const options = {
      questionType: questionType || 'mixed',
      difficulty: difficulty || 'mixed',
      count: count || 10,
      industry: industry || 'general',
      customization: customization || {}
    };

    const questions = await interviewController.generateInterviewQuestions(jobDescription, options);

    res.json({
      success: true,
      message: 'Interview questions generated successfully',
      data: {
        questions: questions.questions,
        totalQuestions: questions.totalQuestions,
        questionDistribution: questions.questionDistribution,
        jobDescription: jobDescription.substring(0, 200) + '...',
        options,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Interview questions generation error:', error);
    res.status(500).json({
      error: 'Failed to generate interview questions. Please try again.'
    });
  }
});

// @route   GET /api/interview/question-types
// @desc    Get available question types and examples
// @access  Public
router.get('/question-types', (req, res) => {
  const questionTypes = [
    {
      id: 'technical',
      name: 'Technical Questions',
      description: 'Questions about specific technical skills and knowledge',
      purpose: 'Assess technical competency and expertise',
      examples: [
        'Explain how you would optimize a slow database query.',
        'How does garbage collection work in Java?',
        'Describe the difference between REST and GraphQL APIs.'
      ],
      bestFor: ['Technical roles', 'Engineering positions', 'Developer roles'],
      weight: 40
    },
    {
      id: 'behavioral',
      name: 'Behavioral Questions',
      description: 'Questions about past experiences and behavior patterns',
      purpose: 'Predict future performance based on past behavior',
      examples: [
        'Tell me about a time when you faced a challenging deadline.',
        'Describe a situation where you had to resolve a conflict in a team.',
        'Give an example of when you took initiative on a project.'
      ],
      bestFor: ['All roles', 'Leadership positions', 'Team-based roles'],
      weight: 35
    },
    {
      id: 'situational',
      name: 'Situational Questions',
      description: 'Hypothetical scenarios to assess problem-solving',
      purpose: 'Evaluate decision-making and problem-solving skills',
      examples: [
        'How would you handle a situation where a project is behind schedule?',
        'What would you do if you discovered a major bug right before deployment?',
        'How would you approach learning a new technology for a project?'
      ],
      bestFor: ['Problem-solving roles', 'Leadership positions', 'Complex projects'],
      weight: 25
    }
  ];

  res.json({
    success: true,
    data: {
      questionTypes,
      total: questionTypes.length,
      recommendedDistribution: {
        technical: 40,
        behavioral: 35,
        situational: 25
      }
    }
  });
});

// @route   GET /api/interview/industries
// @desc    Get industry-specific question patterns
// @access  Public
router.get('/industries', (req, res) => {
  const industries = [
    {
      id: 'technology',
      name: 'Technology',
      description: 'Software, IT, and Tech industry',
      focusAreas: ['System Design', 'Algorithms', 'Programming Languages', 'Agile/Scrum'],
      commonQuestionTypes: ['technical', 'behavioral', 'situational'],
      difficulty: 'medium-hard'
    },
    {
      id: 'finance',
      name: 'Finance',
      description: 'Banking, Investment, and Financial Services',
      focusAreas: ['Risk Management', 'Financial Analysis', 'Regulatory Compliance', 'Client Relations'],
      commonQuestionTypes: ['behavioral', 'situational', 'technical'],
      difficulty: 'medium'
    },
    {
      id: 'healthcare',
      name: 'Healthcare',
      description: 'Medical, Pharmaceutical, and Healthcare services',
      focusAreas: ['Patient Care', 'Medical Knowledge', 'Ethics', 'Team Coordination'],
      commonQuestionTypes: ['behavioral', 'situational'],
      difficulty: 'medium'
    },
    {
      id: 'marketing',
      name: 'Marketing',
      description: 'Digital Marketing, Advertising, and Brand Management',
      focusAreas: ['Campaign Strategy', 'Analytics', 'Creative Thinking', 'Market Research'],
      commonQuestionTypes: ['behavioral', 'situational', 'technical'],
      difficulty: 'easy-medium'
    },
    {
      id: 'consulting',
      name: 'Consulting',
      description: 'Management Consulting and Advisory Services',
      focusAreas: ['Problem Solving', 'Client Management', 'Strategic Thinking', 'Project Management'],
      commonQuestionTypes: ['behavioral', 'situational', 'technical'],
      difficulty: 'hard'
    },
    {
      id: 'sales',
      name: 'Sales',
      description: 'Business Development and Sales',
      focusAreas: ['Relationship Building', 'Negotiation', 'Goal Achievement', 'Customer Focus'],
      commonQuestionTypes: ['behavioral', 'situational'],
      difficulty: 'easy-medium'
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

// @route   POST /api/interview/preview-questions
// @desc    Generate interview questions preview (without consuming usage)
// @access  Private
router.post('/preview-questions', protect, generateQuestionsValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { jobDescription, questionType, difficulty, count, industry, customization } = req.body;

    const options = {
      questionType: questionType || 'mixed',
      difficulty: difficulty || 'mixed',
      count: Math.min(count || 5, 5), // Limit preview to 5 questions
      industry: industry || 'general',
      customization: customization || {},
      preview: true
    };

    const questions = await interviewController.generateInterviewQuestions(jobDescription, options);

    res.json({
      success: true,
      message: 'Interview questions preview generated successfully',
      data: {
        questions: questions.questions,
        totalQuestions: questions.totalQuestions,
        isPreview: true,
        previewNote: 'This is a preview. Generate full set for complete question bank.'
      }
    });

  } catch (error) {
    console.error('Interview questions preview error:', error);
    res.status(500).json({
      error: 'Failed to generate interview questions preview. Please try again.'
    });
  }
});

// @route   POST /api/interview/generate-answers
// @desc    Generate suggested answers for interview questions
// @access  Private
router.post('/generate-answers', protect, checkUsageLimit, [
  body('questions')
    .isArray({ min: 1, max: 10 })
    .withMessage('Must provide 1-10 questions'),
  body('resumeData')
    .optional()
    .isObject()
    .withMessage('Resume data must be an object'),
  body('experience')
    .optional()
    .isString()
    .withMessage('Experience must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { questions, resumeData, experience } = req.body;

    const answers = await interviewController.generateAnswerGuidance(questions, {
      resumeData: resumeData || {},
      experience: experience || ''
    });

    res.json({
      success: true,
      message: 'Answer guidance generated successfully',
      data: {
        answers,
        totalQuestions: questions.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Answer generation error:', error);
    res.status(500).json({
      error: 'Failed to generate answer guidance. Please try again.'
    });
  }
});

// @route   GET /api/interview/answer-structure
// @desc    Get interview answer structures and frameworks
// @access  Public
router.get('/answer-structure', (req, res) => {
  const structures = {
    star: {
      name: 'STAR Method',
      description: 'Situation, Task, Action, Result',
      steps: [
        'Situation: Set the context and background',
        'Task: Explain your specific responsibility',
        'Action: Detail the steps you took',
        'Result: Share the outcome and impact'
      ],
      bestFor: ['Behavioral questions', 'Leadership examples', 'Problem-solving situations']
    },
    car: {
      name: 'CAR Method',
      description: 'Challenge, Action, Result',
      steps: [
        'Challenge: Describe the challenge or context',
        'Action: Explain your specific actions',
        'Result: Share the outcome and learning'
      ],
      bestFor: ['Concise responses', 'Technical challenges', 'Quick examples']
    },
    behavioral: {
      name: 'Behavioral Framework',
      description: 'Past behavior predicts future performance',
      steps: [
        'Recall a specific example from your experience',
        'Explain the situation and your role',
        'Detail your thought process and actions',
        'Share the results and what you learned'
      ],
      bestFor: ['Behavioral interview questions', 'Experience-based questions']
    },
    technical: {
      name: 'Technical Framework',
      description: 'Structured approach for technical questions',
      steps: [
        'Clarify understanding of the question',
        'Outline your approach or methodology',
        'Provide step-by-step solution',
        'Explain trade-offs and alternatives'
      ],
      bestFor: ['Technical questions', 'Algorithm problems', 'System design']
    }
  };

  res.json({
    success: true,
    data: {
      structures,
      total: Object.keys(structures).length,
      recommended: 'star'
    }
  });
});

// @route   POST /api/interview/mock-interview
// @desc    Generate a mock interview session
// @access  Private
router.post('/mock-interview', protect, checkUsageLimit, [
  body('jobDescription')
    .isString()
    .isLength({ min: 50 })
    .withMessage('Job description is required'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 60 })
    .withMessage('Duration must be between 15 and 60 minutes'),
  body('questionCount')
    .optional()
    .isInt({ min: 5, max: 15 })
    .withMessage('Question count must be between 5 and 15')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { jobDescription, duration = 30, questionCount = 8 } = req.body;

    const mockInterview = await interviewController.generateMockInterview(jobDescription, {
      duration,
      questionCount
    });

    res.json({
      success: true,
      message: 'Mock interview generated successfully',
      data: {
        mockInterview,
        estimatedDuration: duration,
        totalQuestions: questionCount,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Mock interview generation error:', error);
    res.status(500).json({
      error: 'Failed to generate mock interview. Please try again.'
    });
  }
});

// @route   GET /api/interview/tips
// @desc    Get general interview tips and best practices
// @access  Public
router.get('/tips', (req, res) => {
  const tips = {
    preparation: [
      'Research the company thoroughly',
      'Prepare specific examples from your experience',
      'Practice common interview questions',
      'Prepare questions to ask the interviewer'
    ],
    during_interview: [
      'Arrive 10-15 minutes early',
      'Make good eye contact and smile',
      'Use the STAR method for behavioral questions',
      'Ask clarifying questions when needed',
      'Take notes during the interview'
    ],
    technical_interviews: [
      'Think out loud when solving problems',
      'Ask about constraints and edge cases',
      'Explain your thought process clearly',
      'Discuss trade-offs and alternatives'
    ],
    follow_up: [
      'Send a thank-you email within 24 hours',
      'Reference specific discussion points',
      'Reiterate your interest in the role',
      'Follow up if you haven\'t heard back in 1-2 weeks'
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

module.exports = router;