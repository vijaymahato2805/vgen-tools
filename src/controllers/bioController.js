const openaiService = require('../services/openaiService');

/**
 * Generate a bio using AI with social media optimization
 * @param {Object} bioData - User's bio information
 * @param {Object} options - Generation options (platform, tone, etc.)
 * @returns {string} Generated bio
 */
const generateBio = async (bioData, options = {}) => {
  try {
    const {
      platform = 'general',
      tone = 'professional',
      includeEmojis = false,
      keywords = [],
      customization = {},
      preview = false
    } = options;

    // Use the AI service to generate the bio
    const bio = await openaiService.generateBio(bioData, platform, tone, {
      maxTokens: 800,
      temperature: 0.6
    });

    return bio;

  } catch (error) {
    console.error('Bio generation error in controller:', error);
    throw new Error(`Bio generation failed: ${error.message}`);
  }
};

/**
 * Optimize existing bio with specific keywords
 * @param {string} currentBio - Current bio text
 * @param {Array} keywords - Keywords to integrate
 * @param {Object} options - Platform and tone options
 * @returns {string} Optimized bio
 */
const optimizeBioWithKeywords = async (currentBio, keywords, options = {}) => {
  try {
    const { platform = 'general', tone = 'professional' } = options;

    const prompt = `
      Optimize the following bio by naturally integrating these keywords: ${keywords.join(', ')}

      CURRENT BIO:
      ${currentBio}

      PLATFORM: ${platform}
      TONE: ${tone}

      REQUIREMENTS:
      - Integrate keywords naturally without keyword stuffing
      - Maintain the original voice and tone
      - Ensure the bio flows naturally
      - Keep within platform character limits
      - Make it more discoverable while keeping it authentic

      Return only the optimized bio text.
    `;

    const optimizedBio = await openaiService.generateCompletion(prompt, {
      maxTokens: 600,
      temperature: 0.5
    });

    return optimizedBio;

  } catch (error) {
    console.error('Bio keyword optimization error:', error);
    throw new Error(`Bio optimization failed: ${error.message}`);
  }
};

/**
 * Generate multiple bio variations for A/B testing
 * @param {Object} bioData - User's bio information
 * @param {string} platform - Target platform
 * @param {number} count - Number of variations to generate
 * @param {Object} options - Tone and customization options
 * @returns {Array} Array of bio variations
 */
const generateBioVariations = async (bioData, platform, count = 3, options = {}) => {
  try {
    const variations = [];
    const tones = ['professional', 'casual', 'creative', 'technical', 'friendly'];

    // Generate variations with different tones
    for (let i = 0; i < Math.min(count, tones.length); i++) {
      const tone = tones[i];

      const bio = await openaiService.generateBio(bioData, platform, tone, {
        maxTokens: 800,
        temperature: 0.7
      });

      variations.push({
        id: `variation_${i + 1}`,
        tone,
        content: bio,
        characterCount: bio.length,
        wordCount: bio.split(' ').length,
        platform
      });
    }

    return variations;

  } catch (error) {
    console.error('Bio variations generation error:', error);
    throw new Error(`Bio variations generation failed: ${error.message}`);
  }
};

/**
 * Generate platform-specific bio recommendations
 * @param {Object} userData - User's information
 * @returns {Object} Platform-specific recommendations
 */
const generatePlatformRecommendations = async (userData) => {
  try {
    const { personalInfo, experience, skills } = userData;

    const recommendations = {};

    // LinkedIn recommendations
    recommendations.linkedin = {
      focus: 'Professional achievements and industry expertise',
      keywords: extractIndustryKeywords(experience, skills),
      structure: [
        'Professional headline with key expertise',
        'Summary of experience and achievements',
        'Industry keywords for visibility',
        'Call to action for networking'
      ]
    };

    // Twitter recommendations
    recommendations.twitter = {
      focus: 'Concise professional identity and expertise',
      keywords: extractIndustryKeywords(experience, skills).slice(0, 3),
      structure: [
        'Brief professional description',
        'Key expertise areas',
        'Relevant hashtags',
        'Call to action'
      ]
    };

    // Instagram recommendations
    recommendations.instagram = {
      focus: 'Creative and personal professional story',
      keywords: extractIndustryKeywords(experience, skills).slice(0, 2),
      structure: [
        'Creative introduction',
        'Personal touch with professional focus',
        'Visual work emphasis',
        'Engaging call to action'
      ]
    };

    return recommendations;

  } catch (error) {
    console.error('Platform recommendations error:', error);
    throw new Error(`Platform recommendations failed: ${error.message}`);
  }
};

/**
 * Extract industry-specific keywords from user data
 * @param {Array} experience - Work experience
 * @param {Object} skills - Skills object
 * @returns {Array} Industry keywords
 */
const extractIndustryKeywords = (experience, skills) => {
  const keywords = [];

  // Extract from experience
  experience.forEach(exp => {
    if (exp.position) keywords.push(exp.position);
    if (exp.description) {
      // Simple keyword extraction (can be enhanced with NLP)
      const words = exp.description.split(' ');
      keywords.push(...words.filter(word => word.length > 5));
    }
  });

  // Extract from skills
  Object.values(skills).forEach(skillArray => {
    if (Array.isArray(skillArray)) {
      keywords.push(...skillArray);
    }
  });

  // Remove duplicates and filter
  return [...new Set(keywords)]
    .filter(keyword => keyword.length > 3)
    .slice(0, 10);
};

/**
 * Generate bio analytics and suggestions
 * @param {string} bio - Bio text
 * @param {string} platform - Target platform
 * @returns {Object} Analytics and suggestions
 */
const generateBioAnalytics = async (bio, platform) => {
  try {
    const platformLimits = {
      linkedin: 2600,
      twitter: 160,
      instagram: 150,
      general: 500,
      website: 1000
    };

    const analytics = {
      characterCount: bio.length,
      wordCount: bio.split(' ').length,
      sentenceCount: bio.split(/[.!?]+/).length - 1,
      platformLimit: platformLimits[platform] || 500,
      isWithinLimit: bio.length <= platformLimits[platform],
      readabilityScore: calculateReadabilityScore(bio),
      keywordDensity: await analyzeKeywordDensity(bio),
      suggestions: []
    };

    // Generate suggestions based on platform
    if (platform === 'linkedin' && bio.length < 100) {
      analytics.suggestions.push('LinkedIn bio is quite short. Consider adding more professional details.');
    }

    if (platform === 'twitter' && bio.length > 140) {
      analytics.suggestions.push('Twitter bio exceeds 160 characters. Consider shortening for better visibility.');
    }

    if (analytics.readabilityScore < 60) {
      analytics.suggestions.push('Consider simplifying the language for better readability.');
    }

    return analytics;

  } catch (error) {
    console.error('Bio analytics error:', error);
    throw new Error(`Bio analytics failed: ${error.message}`);
  }
};

/**
 * Calculate basic readability score
 * @param {string} text - Text to analyze
 * @returns {number} Readability score (0-100)
 */
const calculateReadabilityScore = (text) => {
  const sentences = text.split(/[.!?]+/).length - 1;
  const words = text.split(' ').length;
  const syllables = text.split(/[^aeiouy]+/gi).length - 1;

  if (sentences === 0 || words === 0) return 100;

  // Simplified Flesch Reading Ease Score
  const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));

  return Math.max(0, Math.min(100, score));
};

/**
 * Analyze keyword density in bio
 * @param {string} bio - Bio text
 * @returns {Object} Keyword density analysis
 */
const analyzeKeywordDensity = async (bio) => {
  try {
    // Simple keyword extraction (can be enhanced)
    const words = bio.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    const wordCount = {};

    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const totalWords = words.length;
    const topKeywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / totalWords) * 100).toFixed(2)
      }));

    return {
      totalWords,
      uniqueWords: Object.keys(wordCount).length,
      topKeywords,
      averageDensity: topKeywords.reduce((sum, kw) => sum + parseFloat(kw.density), 0) / topKeywords.length
    };

  } catch (error) {
    console.error('Keyword density analysis error:', error);
    return {
      totalWords: 0,
      uniqueWords: 0,
      topKeywords: [],
      averageDensity: 0
    };
  }
};

/**
 * Generate hashtag suggestions for social media bios
 * @param {Object} userData - User's information
 * @param {string} platform - Target platform
 * @returns {Array} Hashtag suggestions
 */
const generateHashtagSuggestions = async (userData, platform) => {
  try {
    const { personalInfo, experience, skills } = userData;

    // Extract potential hashtags from user data
    const hashtagSources = [
      ...(skills.technical || []),
      ...(skills.soft || []),
      ...(experience.map(exp => exp.position) || [])
    ];

    const hashtags = hashtagSources
      .filter(skill => skill && skill.length > 2)
      .map(skill => `#${skill.replace(/\s+/g, '')}`)
      .slice(0, platform === 'instagram' ? 5 : 3);

    // Add industry-specific hashtags
    const industryHashtags = {
      tech: ['#Technology', '#Innovation', '#DigitalTransformation'],
      design: ['#Design', '#Creativity', '#UX', '#UI'],
      business: ['#Business', '#Leadership', '#Strategy'],
      marketing: ['#Marketing', '#DigitalMarketing', '#Growth'],
      default: ['#Professional', '#Career', '#Growth']
    };

    // Determine industry (simplified logic)
    let industry = 'default';
    if (hashtagSources.some(skill => skill.toLowerCase().includes('tech'))) {
      industry = 'tech';
    } else if (hashtagSources.some(skill => skill.toLowerCase().includes('design'))) {
      industry = 'design';
    }

    hashtags.push(...industryHashtags[industry].slice(0, 2));

    return [...new Set(hashtags)];

  } catch (error) {
    console.error('Hashtag generation error:', error);
    return [];
  }
};

/**
 * Format bio for different platforms with specific optimizations
 * @param {string} bio - Original bio text
 * @param {string} platform - Target platform
 * @param {Object} options - Formatting options
 * @returns {string} Platform-optimized bio
 */
const formatBioForPlatform = async (bio, platform, options = {}) => {
  try {
    let formattedBio = bio;

    switch (platform) {
      case 'twitter':
        // Ensure under 160 characters, add hashtags if requested
        if (formattedBio.length > 160) {
          formattedBio = formattedBio.substring(0, 157) + '...';
        }
        if (options.includeHashtags) {
          const hashtags = await generateHashtagSuggestions({}, platform);
          formattedBio += '\n\n' + hashtags.join(' ');
        }
        break;

      case 'instagram':
        // Can include emojis, keep under 150 characters
        if (formattedBio.length > 150) {
          formattedBio = formattedBio.substring(0, 147) + '...';
        }
        // Add line breaks for better readability
        formattedBio = formattedBio.replace(/\. /g, '.\n\n');
        break;

      case 'linkedin':
        // Ensure professional formatting, good length
        if (formattedBio.length < 100) {
          formattedBio += '\n\n#professional #career';
        }
        break;

      default:
        // General formatting
        break;
    }

    return formattedBio;

  } catch (error) {
    console.error('Bio platform formatting error:', error);
    throw new Error(`Bio platform formatting failed: ${error.message}`);
  }
};

module.exports = {
  generateBio,
  optimizeBioWithKeywords,
  generateBioVariations,
  generatePlatformRecommendations,
  extractIndustryKeywords,
  generateBioAnalytics,
  calculateReadabilityScore,
  analyzeKeywordDensity,
  generateHashtagSuggestions,
  formatBioForPlatform
};