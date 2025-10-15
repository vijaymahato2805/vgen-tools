const openaiService = require('../services/openaiService');

/**
 * Generate interview questions using AI
 * @param {string} jobDescription - Job description text
 * @param {Object} options - Generation options (question type, difficulty, count)
 * @returns {Object} Generated interview questions with metadata
 */
const generateInterviewQuestions = async (jobDescription, options = {}) => {
  try {
    const {
      questionType = 'mixed',
      difficulty = 'mixed',
      count = 10,
      industry = 'general',
      customization = {},
      preview = false
    } = options;

    // Use the AI service to generate the interview questions
    const questions = await openaiService.generateInterviewQuestions(jobDescription, questionType, {
      maxTokens: 1800,
      temperature: 0.5
    });

    return questions;

  } catch (error) {
    console.error('Interview questions generation error in controller:', error);
    throw new Error(`Interview questions generation failed: ${error.message}`);
  }
};

/**
 * Generate answer guidance for interview questions
 * @param {Array} questions - Array of interview questions
 * @param {Object} options - Answer generation options (resume data, experience)
 * @returns {Array} Answer guidance for each question
 */
const generateAnswerGuidance = async (questions, options = {}) => {
  try {
    const { resumeData = {}, experience = '' } = options;

    const answers = [];

    for (const question of questions) {
      const prompt = `
        Provide guidance for answering this interview question:

        QUESTION: ${question.question}

        CONTEXT:
        - Question Type: ${question.type}
        - Difficulty: ${question.difficulty}
        - Category: ${question.category}

        ${resumeData ? `USER BACKGROUND: ${JSON.stringify(resumeData, null, 2)}` : ''}
        ${experience ? `ADDITIONAL EXPERIENCE: ${experience}` : ''}

        Provide answer guidance in the following format:
        {
          "question": "${question.question}",
          "suggestedApproach": "Brief description of how to approach this question",
          "keyPoints": ["main points to cover"],
          "structure": "STAR|CAR|Technical|Behavioral",
          "tips": ["specific tips for this question"],
          "exampleOutline": "Brief example of how to structure the answer",
          "commonMistakes": ["things to avoid"]
        }
      `;

      const response = await openaiService.generateCompletion(prompt, {
        maxTokens: 800,
        temperature: 0.6
      });

      try {
        const guidance = JSON.parse(response);
        answers.push({
          ...guidance,
          questionId: question.id,
          questionType: question.type,
          difficulty: question.difficulty
        });
      } catch (parseError) {
        // If JSON parsing fails, create a structured response
        answers.push({
          question: question.question,
          questionId: question.id,
          questionType: question.type,
          difficulty: question.difficulty,
          suggestedApproach: response.substring(0, 200),
          keyPoints: ['Structure your answer clearly', 'Use specific examples', 'Show enthusiasm'],
          structure: 'STAR',
          tips: ['Be specific', 'Use metrics', 'Show self-awareness'],
          exampleOutline: 'Brief example structure',
          commonMistakes: ['Being too vague', 'Not providing examples']
        });
      }
    }

    return answers;

  } catch (error) {
    console.error('Answer guidance generation error:', error);
    throw new Error(`Answer guidance generation failed: ${error.message}`);
  }
};

/**
 * Generate a complete mock interview session
 * @param {string} jobDescription - Job description text
 * @param {Object} options - Mock interview options
 * @returns {Object} Complete mock interview with questions and guidance
 */
const generateMockInterview = async (jobDescription, options = {}) => {
  try {
    const { duration = 30, questionCount = 8 } = options;

    // Generate questions for the mock interview
    const questions = await generateInterviewQuestions(jobDescription, {
      count: questionCount,
      questionType: 'mixed',
      difficulty: 'mixed'
    });

    // Generate answer guidance for all questions
    const mockQuestions = questions.questions.map((q, index) => ({
      ...q,
      order: index + 1,
      estimatedTime: calculateQuestionTime(q.type, q.difficulty),
      followUpQuestions: generateFollowUpQuestions(q)
    }));

    const mockInterview = {
      id: generateMockInterviewId(),
      jobDescription: jobDescription.substring(0, 200) + '...',
      questions: mockQuestions,
      totalQuestions: mockQuestions.length,
      estimatedDuration: duration,
      structure: {
        introduction: 'Welcome and overview of the role',
        technical: mockQuestions.filter(q => q.type === 'technical').length,
        behavioral: mockQuestions.filter(q => q.type === 'behavioral').length,
        situational: mockQuestions.filter(q => q.type === 'situational').length,
        conclusion: 'Your questions and next steps'
      },
      tips: [
        'Take your time to think before answering',
        'Ask clarifying questions if needed',
        'Use specific examples from your experience',
        'Show enthusiasm for the role and company'
      ],
      createdAt: new Date().toISOString()
    };

    return mockInterview;

  } catch (error) {
    console.error('Mock interview generation error:', error);
    throw new Error(`Mock interview generation failed: ${error.message}`);
  }
};

/**
 * Generate follow-up questions for a given question
 * @param {Object} question - Original question object
 * @returns {Array} Follow-up questions
 */
const generateFollowUpQuestions = (question) => {
  const followUps = {
    technical: [
      'Can you explain your thought process?',
      'What are the trade-offs of your approach?',
      'How would you handle edge cases?'
    ],
    behavioral: [
      'What did you learn from that experience?',
      'How would you handle that situation differently now?',
      'What was the impact on your team?'
    ],
    situational: [
      'What would be your immediate next steps?',
      'How would you measure success?',
      'What potential challenges do you anticipate?'
    ]
  };

  return followUps[question.type] || followUps.behavioral;
};

/**
 * Calculate estimated time for a question based on type and difficulty
 * @param {string} type - Question type
 * @param {string} difficulty - Question difficulty
 * @returns {number} Estimated time in minutes
 */
const calculateQuestionTime = (type, difficulty) => {
  const baseTimes = {
    technical: { easy: 3, medium: 5, hard: 8 },
    behavioral: { easy: 2, medium: 4, hard: 6 },
    situational: { easy: 3, medium: 5, hard: 7 }
  };

  return baseTimes[type]?.[difficulty] || 4;
};

/**
 * Generate mock interview ID
 * @returns {string} Unique mock interview ID
 */
const generateMockInterviewId = () => {
  return `mi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate interview practice plan
 * @param {Object} userGoals - User's interview goals
 * @param {number} timeAvailable - Time available for practice (in days)
 * @returns {Object} Practice plan
 */
const generatePracticePlan = async (userGoals, timeAvailable = 14) => {
  try {
    const { targetRole, experienceLevel, focusAreas } = userGoals;

    const practicePlan = {
      totalDays: timeAvailable,
      dailyCommitment: '30-45 minutes',
      phases: [
        {
          phase: 1,
          name: 'Foundation Building',
          days: 1,
          focus: 'Review fundamentals and common questions',
          activities: [
            'Research target companies and roles',
            'Practice introduction and elevator pitch',
            'Review basic technical concepts'
          ]
        },
        {
          phase: 2,
          name: 'Skill Development',
          days: 2,
          focus: 'Develop storytelling and technical skills',
          activities: [
            'Practice behavioral questions using STAR method',
            'Work on technical problem-solving',
            'Record and review practice answers'
          ]
        },
        {
          phase: 3,
          name: 'Mock Interviews',
          days: 3,
          focus: 'Full interview simulation',
          activities: [
            'Conduct timed mock interviews',
            'Practice with industry-specific questions',
            'Get feedback on performance'
          ]
        }
      ],
      milestones: [
        'Day 3: Complete 50 practice questions',
        'Day 7: Conduct first full mock interview',
        'Day 10: Achieve consistent STAR responses',
        'Day 14: Ready for real interviews'
      ],
      resources: [
        'Interview preparation books',
        'Online coding platforms',
        'Mock interview services',
        'Industry-specific forums'
      ]
    };

    return practicePlan;

  } catch (error) {
    console.error('Practice plan generation error:', error);
    throw new Error(`Practice plan generation failed: ${error.message}`);
  }
};

/**
 * Analyze interview performance and provide feedback
 * @param {Array} responses - User's interview responses
 * @param {Array} questions - Original questions
 * @returns {Object} Performance analysis
 */
const analyzeInterviewPerformance = async (responses, questions) => {
  try {
    const analysis = {
      overallScore: 0,
      strengths: [],
      areasForImprovement: [],
      detailedFeedback: [],
      recommendations: []
    };

    // Mock analysis - in real implementation, this would use more sophisticated analysis
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const question = questions[i];

      const feedback = {
        question: question.question,
        questionType: question.type,
        responseQuality: Math.floor(Math.random() * 100), // Mock score
        feedback: generateResponseFeedback(response, question),
        suggestions: generateResponseSuggestions(question.type)
      };

      analysis.detailedFeedback.push(feedback);
    }

    analysis.overallScore = Math.round(
      analysis.detailedFeedback.reduce((sum, fb) => sum + fb.responseQuality, 0) /
      analysis.detailedFeedback.length
    );

    analysis.strengths = [
      'Good structure in responses',
      'Relevant examples provided',
      'Clear communication'
    ];

    analysis.areasForImprovement = [
      'Could provide more specific metrics',
      'Consider elaborating on technical details',
      'Work on pacing and timing'
    ];

    analysis.recommendations = [
      'Practice more technical questions',
      'Record yourself to improve delivery',
      'Focus on quantifying achievements'
    ];

    return analysis;

  } catch (error) {
    console.error('Interview performance analysis error:', error);
    throw new Error(`Interview performance analysis failed: ${error.message}`);
  }
};

/**
 * Generate response feedback for a specific question
 * @param {string} response - User's response
 * @param {Object} question - Question object
 * @returns {string} Feedback text
 */
const generateResponseFeedback = (response, question) => {
  const feedbacks = {
    technical: 'Good technical depth. Consider discussing trade-offs and alternatives.',
    behavioral: 'Nice use of specific examples. The STAR structure is well applied.',
    situational: 'Thoughtful approach to the scenario. Good problem-solving mindset.'
  };

  return feedbacks[question.type] || 'Solid response with good structure and content.';
};

/**
 * Generate response suggestions based on question type
 * @param {string} questionType - Type of question
 * @returns {Array} Suggestions for improvement
 */
const generateResponseSuggestions = (questionType) => {
  const suggestions = {
    technical: [
      'Explain your thought process step by step',
      'Mention any assumptions you\'re making',
      'Discuss edge cases and error handling'
    ],
    behavioral: [
      'Use specific metrics to quantify your impact',
      'Explain what you learned from the experience',
      'Connect the example to the target role'
    ],
    situational: [
      'Clarify your priorities in the scenario',
      'Explain your decision-making process',
      'Discuss how you would measure success'
    ]
  };

  return suggestions[questionType] || [
    'Structure your response clearly',
    'Use specific examples',
    'Show enthusiasm and confidence'
  ];
};

/**
 * Generate common interview mistakes to avoid
 * @returns {Array} Common mistakes and how to avoid them
 */
const generateCommonMistakes = () => {
  return [
    {
      mistake: 'Not researching the company',
      impact: 'Shows lack of genuine interest',
      howToAvoid: 'Research company values, recent news, and culture'
    },
    {
      mistake: 'Being too vague in examples',
      impact: 'Makes responses less compelling',
      howToAvoid: 'Use specific metrics and detailed examples'
    },
    {
      mistake: 'Not asking questions',
      impact: 'Misses opportunity to show engagement',
      howToAvoid: 'Prepare thoughtful questions about the role and company'
    },
    {
      mistake: 'Dominating the conversation',
      impact: 'Can come across as arrogant',
      howToAvoid: 'Listen actively and engage in dialogue'
    },
    {
      mistake: 'Bad-mouthing previous employers',
      impact: 'Raises red flags about attitude',
      howToAvoid: 'Focus on positive learning experiences'
    }
  ];
};

/**
 * Generate industry-specific interview strategies
 * @param {string} industry - Target industry
 * @returns {Object} Industry-specific strategies
 */
const generateIndustryStrategies = (industry) => {
  const strategies = {
    technology: {
      focus: 'Technical depth and problem-solving ability',
      preparation: [
        'Practice coding interviews on LeetCode/HackerRank',
        'Understand system design principles',
        'Be ready to discuss specific technologies'
      ],
      tips: [
        'Explain your thought process clearly',
        'Ask clarifying questions',
        'Show enthusiasm for learning new technologies'
      ]
    },
    finance: {
      focus: 'Analytical thinking and attention to detail',
      preparation: [
        'Review financial concepts and terminology',
        'Practice case studies and market analysis',
        'Understand regulatory environment'
      ],
      tips: [
        'Be precise with numbers and calculations',
        'Show understanding of risk management',
        'Demonstrate ethical decision-making'
      ]
    },
    consulting: {
      focus: 'Structured thinking and communication',
      preparation: [
        'Practice case interviews extensively',
        'Develop structured problem-solving approach',
        'Work on presentation and communication skills'
      ],
      tips: [
        'Structure your answers clearly',
        'Show logical thinking process',
        'Ask insightful questions'
      ]
    }
  };

  return strategies[industry] || {
    focus: 'General professional skills and experience',
    preparation: [
      'Research company and role thoroughly',
      'Prepare specific examples from your experience',
      'Practice common interview questions'
    ],
    tips: [
      'Be authentic and enthusiastic',
      'Show clear communication skills',
      'Demonstrate problem-solving ability'
    ]
  };
};

module.exports = {
  generateInterviewQuestions,
  generateAnswerGuidance,
  generateMockInterview,
  generateFollowUpQuestions,
  calculateQuestionTime,
  generateMockInterviewId,
  generatePracticePlan,
  analyzeInterviewPerformance,
  generateResponseFeedback,
  generateResponseSuggestions,
  generateCommonMistakes,
  generateIndustryStrategies
};