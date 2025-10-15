const openaiService = require('../services/openaiService');

/**
 * Generate flashcards using AI with spaced repetition scheduling
 * @param {string} content - Content to create flashcards from
 * @param {Object} options - Generation options (subject, difficulty, count)
 * @returns {Object} Generated flashcards with metadata
 */
const generateFlashcards = async (content, options = {}) => {
  try {
    const {
      subject = 'general',
      difficulty = 'mixed',
      count = 10,
      customization = {},
      preview = false
    } = options;

    // Use the AI service to generate the flashcards
    const flashcards = await openaiService.generateFlashcards(content, subject, {
      maxTokens: 1500,
      temperature: 0.4
    });

    // Add spaced repetition metadata to each flashcard
    const enhancedFlashcards = flashcards.flashcards.map(card => ({
      ...card,
      id: generateFlashcardId(),
      createdAt: new Date().toISOString(),
      lastReviewed: null,
      nextReview: new Date().toISOString(),
      interval: 1, // days
      easeFactor: 2.5,
      repetitions: 0,
      totalReviews: 0,
      correctReviews: 0,
      streak: 0,
      difficulty: card.difficulty || difficulty,
      tags: extractTagsFromContent(card.question + ' ' + card.answer),
      performance: 'new' // new, easy, good, hard, again
    }));

    return {
      flashcards: enhancedFlashcards,
      totalCards: enhancedFlashcards.length,
      estimatedStudyTime: `${Math.ceil(enhancedFlashcards.length * 2)} minutes`, // Assume 2 minutes per card
      subject,
      difficulty,
      algorithm: 'sm2', // Default spaced repetition algorithm
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Flashcard generation error in controller:', error);
    throw new Error(`Flashcard generation failed: ${error.message}`);
  }
};

/**
 * Generate unique flashcard ID
 * @returns {string} Unique flashcard ID
 */
const generateFlashcardId = () => {
  return `fc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Extract tags from flashcard content
 * @param {string} content - Flashcard question and answer
 * @returns {Array} Extracted tags
 */
const extractTagsFromContent = (content) => {
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'];
  const words = content.toLowerCase().split(/\W+/).filter(word => word.length > 3 && !commonWords.includes(word));
  return [...new Set(words)].slice(0, 5); // Return up to 5 unique tags
};

/**
 * Generate spaced repetition study plan
 * @param {Array} flashcardIds - Array of flashcard IDs
 * @param {Object} options - Study plan options
 * @returns {Object} Generated study plan
 */
const generateStudyPlan = async (flashcardIds, options = {}) => {
  try {
    const { studyDays = 7, dailyCards = 20, algorithm = 'sm2' } = options;

    const totalCards = flashcardIds.length;
    const cardsPerDay = Math.min(dailyCards, Math.ceil(totalCards / studyDays));

    const studyPlan = {
      totalCards,
      studyDays,
      cardsPerDay,
      algorithm,
      schedule: [],
      createdAt: new Date().toISOString()
    };

    // Generate daily schedule
    for (let day = 1; day <= studyDays; day++) {
      const startIndex = (day - 1) * cardsPerDay;
      const endIndex = Math.min(startIndex + cardsPerDay, totalCards);
      const dayCards = flashcardIds.slice(startIndex, endIndex);

      studyPlan.schedule.push({
        day,
        date: new Date(Date.now() + (day * 24 * 60 * 60 * 1000)).toISOString(),
        cards: dayCards,
        cardCount: dayCards.length,
        estimatedTime: `${dayCards.length * 2} minutes`
      });
    }

    return studyPlan;

  } catch (error) {
    console.error('Study plan generation error:', error);
    throw new Error(`Study plan generation failed: ${error.message}`);
  }
};

/**
 * Schedule next review using spaced repetition algorithm
 * @param {string} flashcardId - Flashcard ID
 * @param {string} performance - Performance rating (easy, good, hard, again)
 * @param {string} algorithm - Spaced repetition algorithm to use
 * @returns {Object} Next review schedule
 */
const scheduleNextReview = async (flashcardId, performance, algorithm = 'sm2') => {
  try {
    const now = new Date();

    // SM-2 Algorithm implementation
    const calculateSM2Interval = (repetitions, easeFactor, previousInterval) => {
      if (repetitions === 0) return 1;
      if (repetitions === 1) return 6;

      return Math.ceil(previousInterval * easeFactor);
    };

    const updateEaseFactor = (currentEaseFactor, performance) => {
      const quality = { again: 0, hard: 3, good: 4, easy: 5 }[performance] || 4;

      const newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

      return Math.max(1.3, newEaseFactor);
    };

    // Default flashcard data (in real implementation, this would be fetched from database)
    const flashcard = {
      repetitions: 0,
      easeFactor: 2.5,
      interval: 1,
      lastReviewed: now
    };

    // Update based on performance
    let newRepetitions = flashcard.repetitions;
    let newEaseFactor = updateEaseFactor(flashcard.easeFactor, performance);
    let newInterval = calculateSM2Interval(flashcard.repetitions, newEaseFactor, flashcard.interval);

    if (performance === 'again') {
      newRepetitions = 0;
      newInterval = 1;
    } else if (performance === 'hard') {
      newInterval = Math.max(1, Math.ceil(flashcard.interval * 1.2));
    } else if (performance === 'good') {
      newRepetitions += 1;
    } else if (performance === 'easy') {
      newRepetitions += 1;
      newInterval = Math.ceil(flashcard.interval * newEaseFactor);
    }

    const nextReview = new Date(now.getTime() + (newInterval * 24 * 60 * 60 * 1000));

    return {
      flashcardId,
      nextReview: nextReview.toISOString(),
      interval: newInterval,
      easeFactor: newEaseFactor,
      repetitions: newRepetitions,
      performance,
      scheduledAt: now.toISOString()
    };

  } catch (error) {
    console.error('Next review scheduling error:', error);
    throw new Error(`Review scheduling failed: ${error.message}`);
  }
};

/**
 * Get user's flashcard study statistics
 * @param {string} userId - User ID
 * @returns {Object} Study statistics
 */
const getStudyStats = async (userId) => {
  try {
    // In a real implementation, this would query the database for user's flashcards
    const mockStats = {
      totalCards: 0,
      cardsStudied: 0,
      averageAccuracy: 0,
      studyStreak: 0,
      totalStudyTime: 0,
      cardsDue: 0,
      cardsDueToday: 0,
      performance: {
        easy: 0,
        good: 0,
        hard: 0,
        again: 0
      },
      recentActivity: [],
      achievements: [],
      studyGoal: {
        daily: 20,
        weekly: 100,
        monthly: 400
      },
      currentProgress: {
        daily: 0,
        weekly: 0,
        monthly: 0
      }
    };

    return mockStats;

  } catch (error) {
    console.error('Study stats retrieval error:', error);
    throw new Error(`Study stats retrieval failed: ${error.message}`);
  }
};

/**
 * Generate flashcard categories and organization
 * @param {Array} flashcards - Array of flashcards
 * @returns {Object} Organized flashcards by category
 */
const organizeFlashcards = (flashcards) => {
  try {
    const categories = {};

    flashcards.forEach(card => {
      const category = card.category || 'General';

      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(card);
    });

    return {
      categories,
      totalCategories: Object.keys(categories).length,
      cardsByCategory: Object.fromEntries(
        Object.entries(categories).map(([category, cards]) => [category, cards.length])
      )
    };

  } catch (error) {
    console.error('Flashcard organization error:', error);
    throw new Error(`Flashcard organization failed: ${error.message}`);
  }
};

/**
 * Generate study session recommendations
 * @param {Array} flashcards - User's flashcards
 * @param {Object} preferences - User preferences
 * @returns {Object} Study recommendations
 */
const generateStudyRecommendations = async (flashcards, preferences = {}) => {
  try {
    const now = new Date();
    const cardsDue = flashcards.filter(card => new Date(card.nextReview) <= now);

    const recommendations = {
      cardsToStudy: cardsDue.length,
      recommendedSessionTime: Math.min(cardsDue.length * 2, 30), // Max 30 minutes
      priorityCards: cardsDue.slice(0, 10), // First 10 cards
      suggestedBreaks: cardsDue.length > 20,
      focusAreas: [],
      tips: []
    };

    // Generate focus areas based on performance
    const performanceGroups = { easy: [], good: [], hard: [], again: [] };

    cardsDue.forEach(card => {
      if (performanceGroups[card.performance]) {
        performanceGroups[card.performance].push(card);
      }
    });

    if (performanceGroups.again.length > 0) {
      recommendations.focusAreas.push('Review cards that need more practice');
      recommendations.tips.push('Spend extra time on cards marked as "Again"');
    }

    if (performanceGroups.hard.length > cardsDue.length * 0.3) {
      recommendations.focusAreas.push('Focus on difficult concepts');
      recommendations.tips.push('Consider reviewing related study materials for hard cards');
    }

    return recommendations;

  } catch (error) {
    console.error('Study recommendations error:', error);
    throw new Error(`Study recommendations failed: ${error.message}`);
  }
};

/**
 * Generate flashcard progress report
 * @param {string} userId - User ID
 * @param {string} period - Time period (week, month, year)
 * @returns {Object} Progress report
 */
const generateProgressReport = async (userId, period = 'week') => {
  try {
    // Calculate date range
    const now = new Date();
    const periodDays = { week: 7, month: 30, year: 365 }[period] || 7;
    const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    // Mock progress data (in real implementation, this would be from database)
    const report = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      summary: {
        cardsStudied: 0,
        averageAccuracy: 0,
        totalStudyTime: 0,
        improvement: 0
      },
      dailyBreakdown: [],
      strengths: [],
      areasForImprovement: [],
      achievements: [],
      goals: {
        target: 0,
        achieved: 0,
        percentage: 0
      }
    };

    return report;

  } catch (error) {
    console.error('Progress report generation error:', error);
    throw new Error(`Progress report generation failed: ${error.message}`);
  }
};

/**
 * Generate flashcard difficulty assessment
 * @param {Array} flashcards - Array of flashcards
 * @returns {Object} Difficulty assessment
 */
const assessFlashcardDifficulty = async (flashcards) => {
  try {
    const assessment = {
      overallDifficulty: 'medium',
      distribution: {
        easy: 0,
        medium: 0,
        hard: 0
      },
      recommendations: [],
      averageLength: {
        question: 0,
        answer: 0
      }
    };

    flashcards.forEach(card => {
      assessment.distribution[card.difficulty || 'medium']++;

      assessment.averageLength.question += card.question.length;
      assessment.averageLength.answer += card.answer.length;
    });

    assessment.averageLength.question = Math.round(assessment.averageLength.question / flashcards.length);
    assessment.averageLength.answer = Math.round(assessment.averageLength.answer / flashcards.length);

    // Generate recommendations based on distribution
    const totalCards = flashcards.length;
    const easyPercentage = (assessment.distribution.easy / totalCards) * 100;
    const hardPercentage = (assessment.distribution.hard / totalCards) * 100;

    if (easyPercentage > 70) {
      assessment.recommendations.push('Consider increasing difficulty for better learning');
      assessment.overallDifficulty = 'easy';
    } else if (hardPercentage > 50) {
      assessment.recommendations.push('Consider reviewing prerequisite concepts');
      assessment.overallDifficulty = 'hard';
    }

    return assessment;

  } catch (error) {
    console.error('Difficulty assessment error:', error);
    throw new Error(`Difficulty assessment failed: ${error.message}`);
  }
};

/**
 * Generate flashcard study reminders
 * @param {Array} flashcards - User's flashcards
 * @returns {Array} Study reminders
 */
const generateStudyReminders = async (flashcards) => {
  try {
    const now = new Date();
    const cardsDue = flashcards.filter(card => new Date(card.nextReview) <= now);

    const reminders = [];

    if (cardsDue.length > 0) {
      reminders.push({
        type: 'due_cards',
        message: `You have ${cardsDue.length} cards due for review`,
        priority: 'high',
        actionUrl: '/study/due'
      });
    }

    // Weekly review reminder
    const lastWeeklyReview = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const recentReviews = flashcards.filter(card =>
      card.lastReviewed && new Date(card.lastReviewed) > lastWeeklyReview
    );

    if (recentReviews.length < flashcards.length * 0.3) {
      reminders.push({
        type: 'weekly_goal',
        message: 'Consider increasing your weekly study frequency',
        priority: 'medium',
        actionUrl: '/study/weekly'
      });
    }

    return reminders;

  } catch (error) {
    console.error('Study reminders generation error:', error);
    throw new Error(`Study reminders generation failed: ${error.message}`);
  }
};

module.exports = {
  generateFlashcards,
  generateFlashcardId,
  extractTagsFromContent,
  generateStudyPlan,
  scheduleNextReview,
  getStudyStats,
  organizeFlashcards,
  generateStudyRecommendations,
  generateProgressReport,
  assessFlashcardDifficulty,
  generateStudyReminders
};