const openaiService = require('../services/openaiService');

/**
 * Analyze resume with AI and ATS scoring
 * @param {string} resumeText - Resume text to analyze
 * @param {Object} options - Analysis options (industry, experience level, job description)
 * @returns {Object} Analysis results with ATS score
 */
const analyzeResume = async (resumeText, options = {}) => {
  try {
    const { industry = 'general', experienceLevel = 'mid', jobDescription = '' } = options;

    // Use the AI service to analyze the resume
    const analysis = await openaiService.analyzeResume(resumeText, jobDescription, {
      maxTokens: 2000,
      temperature: 0.3
    });

    // Enhance analysis with ATS scoring
    const atsScore = await calculateATSScore(resumeText, jobDescription);
    const keywordOptimization = await optimizeKeywords(resumeText, jobDescription, { industry });
    const skills = await extractSkills(resumeText);

    return {
      ...analysis,
      atsScore,
      keywordOptimization,
      skills,
      industry,
      experienceLevel,
      analysisDate: new Date().toISOString()
    };

  } catch (error) {
    console.error('Resume analysis error in controller:', error);
    throw new Error(`Resume analysis failed: ${error.message}`);
  }
};

/**
 * Calculate ATS compatibility score
 * @param {string} resumeText - Resume text
 * @param {string} jobDescription - Job description for keyword matching
 * @returns {Object} ATS compatibility score and details
 */
const calculateATSScore = async (resumeText, jobDescription = '') => {
  try {
    const atsCriteria = {
      formatting: 25,
      keywords: 25,
      structure: 20,
      content: 15,
      skills: 15
    };

    let score = 0;
    const details = {};

    // Formatting score (25 points)
    const formattingScore = assessFormatting(resumeText);
    score += formattingScore;
    details.formatting = {
      score: formattingScore,
      maxScore: 25,
      feedback: getFormattingFeedback(formattingScore)
    };

    // Keyword score (25 points)
    const keywordScore = assessKeywords(resumeText, jobDescription);
    score += keywordScore;
    details.keywords = {
      score: keywordScore,
      maxScore: 25,
      feedback: getKeywordFeedback(keywordScore)
    };

    // Structure score (20 points)
    const structureScore = assessStructure(resumeText);
    score += structureScore;
    details.structure = {
      score: structureScore,
      maxScore: 20,
      feedback: getStructureFeedback(structureScore)
    };

    // Content score (15 points)
    const contentScore = assessContent(resumeText);
    score += contentScore;
    details.content = {
      score: contentScore,
      maxScore: 15,
      feedback: getContentFeedback(contentScore)
    };

    // Skills score (15 points)
    const skillsScore = assessSkillsSection(resumeText);
    score += skillsScore;
    details.skills = {
      score: skillsScore,
      maxScore: 15,
      feedback: getSkillsFeedback(skillsScore)
    };

    const percentage = Math.round((score / 100) * 100);

    return {
      overallScore: percentage,
      score: score,
      maxScore: 100,
      grade: getGradeFromScore(percentage),
      details,
      recommendations: generateATSRecommendations(details),
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('ATS score calculation error:', error);
    throw new Error(`ATS score calculation failed: ${error.message}`);
  }
};

/**
 * Assess resume formatting for ATS compatibility
 * @param {string} resumeText - Resume text
 * @returns {number} Formatting score (0-25)
 */
const assessFormatting = (resumeText) => {
  let score = 0;

  // Check for standard fonts (would need font detection in real implementation)
  score += 5; // Assume standard fonts

  // Check for consistent formatting
  const hasConsistentSpacing = !/\t/.test(resumeText) && !/ {3,}/.test(resumeText);
  if (hasConsistentSpacing) score += 5;

  // Check for readable structure
  const hasSections = /\b(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE)\b/i.test(resumeText);
  if (hasSections) score += 5;

  // Check for bullet points (but not excessive)
  const bulletCount = (resumeText.match(/•|●|■|▪|▫|◦|◦/g) || []).length;
  if (bulletCount > 0 && bulletCount < 50) score += 5;

  // Check for appropriate length
  const lines = resumeText.split('\n').length;
  if (lines > 20 && lines < 100) score += 5;

  return Math.min(score, 25);
};

/**
 * Assess keyword matching
 * @param {string} resumeText - Resume text
 * @param {string} jobDescription - Job description
 * @returns {number} Keyword score (0-25)
 */
const assessKeywords = (resumeText, jobDescription) => {
  if (!jobDescription) return 15; // Default score if no job description

  const resumeWords = resumeText.toLowerCase().split(/\W+/);
  const jobWords = jobDescription.toLowerCase().split(/\W+/);

  // Extract important words (nouns, verbs, adjectives)
  const importantJobWords = jobWords.filter(word =>
    word.length > 4 &&
    !['with', 'from', 'this', 'that', 'will', 'have', 'been', 'were', 'from'].includes(word) &&
    (word.includes('ing') || word.includes('er') || word.includes('ly') || word.length > 6)
  );

  let matches = 0;
  importantJobWords.forEach(jobWord => {
    if (resumeWords.includes(jobWord)) matches++;
  });

  const matchPercentage = (matches / importantJobWords.length) * 25;
  return Math.min(Math.round(matchPercentage), 25);
};

/**
 * Assess resume structure
 * @param {string} resumeText - Resume text
 * @returns {number} Structure score (0-20)
 */
const assessStructure = (resumeText) => {
  let score = 0;

  // Check for contact information
  const hasContact = /\b(email|phone|address|linkedin|github)\b/i.test(resumeText);
  if (hasContact) score += 5;

  // Check for required sections
  const sections = ['experience', 'education', 'skills'];
  sections.forEach(section => {
    if (new RegExp(`\\b${section}\\b`, 'i').test(resumeText)) score += 3;
  });

  // Check for chronological order indicators
  const hasDates = /\b(20\d{2}|19\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(resumeText);
  if (hasDates) score += 3;

  // Check for achievements vs responsibilities
  const achievementKeywords = /\b(led|managed|improved|increased|decreased|achieved|delivered|created|built|developed)\b/i;
  if (achievementKeywords.test(resumeText)) score += 3;

  return Math.min(score, 20);
};

/**
 * Assess content quality
 * @param {string} resumeText - Resume text
 * @returns {number} Content score (0-15)
 */
const assessContent = (resumeText) => {
  let score = 0;

  // Check for quantifiable achievements
  const quantifiableRegex = /\b(\d+%|\d+\s*(percent|million|billion|thousand|users?|customers?|dollars?|hours?|projects?))\b/i;
  if (quantifiableRegex.test(resumeText)) score += 5;

  // Check for action verbs
  const actionVerbs = /\b(achieved|improved|increased|decreased|delivered|created|built|developed|led|managed|designed|implemented|optimized)\b/i;
  const actionVerbCount = (resumeText.match(actionVerbs) || []).length;
  if (actionVerbCount > 5) score += 4;

  // Check for industry-specific keywords
  const hasTechnicalTerms = /\b(agile|scrum|api|database|analytics|strategy|optimization|framework|platform)\b/i.test(resumeText);
  if (hasTechnicalTerms) score += 3;

  // Check for soft skills
  const softSkills = /\b(communication|leadership|teamwork|problem.solving|analytical|creative|adaptable)\b/i;
  if (softSkills.test(resumeText)) score += 3;

  return Math.min(score, 15);
};

/**
 * Assess skills section
 * @param {string} resumeText - Resume text
 * @returns {number} Skills score (0-15)
 */
const assessSkillsSection = (resumeText) => {
  let score = 0;

  const skillsMatch = resumeText.match(/skills?\s*:?\s*(.+?)(?:\n\n|\n\s*\n|$)/i);
  if (skillsMatch) {
    const skillsText = skillsMatch[1];
    const skillCount = skillsText.split(/[,;]/).length;

    if (skillCount >= 5 && skillCount <= 20) score += 5;
    if (skillsText.length > 50) score += 5;

    // Check for technical vs soft skills balance
    const technicalSkills = /\b(javascript|python|java|react|node|aws|docker|sql|mongodb|git)\b/i;
    const softSkills = /\b(communication|leadership|teamwork|problem.solving|analytical)\b/i;

    if (technicalSkills.test(skillsText)) score += 3;
    if (softSkills.test(skillsText)) score += 2;
  }

  return Math.min(score, 15);
};

/**
 * Optimize resume with keywords from job description
 * @param {string} resumeText - Resume text
 * @param {string} jobDescription - Job description
 * @param {Object} options - Optimization options
 * @returns {Object} Keyword optimization suggestions
 */
const optimizeKeywords = async (resumeText, jobDescription, options = {}) => {
  try {
    const { industry = 'general' } = options;

    const prompt = `
      Analyze the following resume and job description to suggest keyword optimizations:

      RESUME:
      ${resumeText}

      JOB DESCRIPTION:
      ${jobDescription}

      INDUSTRY: ${industry}

      Please provide keyword optimization suggestions in the following JSON format:
      {
        "missingKeywords": ["important keywords from job description not in resume"],
        "recommendedAdditions": ["specific suggestions for adding keywords naturally"],
        "keywordDensity": {"current": "percentage", "recommended": "percentage"},
        "industryKeywords": ["industry-specific keywords to consider"],
        "skillMatches": ["skills already well represented"],
        "optimizationTips": ["specific tips for keyword placement"]
      }
    `;

    const response = await openaiService.generateCompletion(prompt, {
      maxTokens: 1000,
      temperature: 0.3
    });

    const suggestions = JSON.parse(response);

    return {
      ...suggestions,
      optimizedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Keyword optimization error:', error);
    throw new Error(`Keyword optimization failed: ${error.message}`);
  }
};

/**
 * Extract skills from resume text
 * @param {string} resumeText - Resume text
 * @returns {Object} Extracted skills organized by category
 */
const extractSkills = async (resumeText) => {
  try {
    const prompt = `
      Extract and categorize skills from the following resume text:

      RESUME TEXT:
      ${resumeText}

      Please organize skills into categories and return in the following JSON format:
      {
        "technical": ["JavaScript", "React", "Node.js"],
        "soft": ["Leadership", "Communication", "Problem Solving"],
        "languages": ["English", "Spanish"],
        "tools": ["Git", "Docker", "AWS"],
        "certifications": ["AWS Certified Developer", "PMP"],
        "totalSkills": "total_count"
      }
    `;

    const response = await openaiService.generateCompletion(prompt, {
      maxTokens: 800,
      temperature: 0.2
    });

    const skills = JSON.parse(response);

    return {
      ...skills,
      extractedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Skill extraction error:', error);
    throw new Error(`Skill extraction failed: ${error.message}`);
  }
};

/**
 * Compare multiple resumes
 * @param {Array} resumes - Array of resume texts
 * @param {string} jobDescription - Job description
 * @returns {Object} Comparison results
 */
const compareResumes = async (resumes, jobDescription) => {
  try {
    const comparison = {
      totalResumes: resumes.length,
      rankings: [],
      strengths: {},
      weaknesses: {},
      recommendations: {}
    };

    // Analyze each resume
    for (let i = 0; i < resumes.length; i++) {
      const analysis = await analyzeResume(resumes[i], { jobDescription });
      const atsScore = await calculateATSScore(resumes[i], jobDescription);

      comparison.rankings.push({
        resumeIndex: i,
        overallScore: analysis.overallScore,
        atsScore: atsScore.overallScore,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses
      });
    }

    // Sort by overall score
    comparison.rankings.sort((a, b) => b.overallScore - a.overallScore);

    return comparison;

  } catch (error) {
    console.error('Resume comparison error:', error);
    throw new Error(`Resume comparison failed: ${error.message}`);
  }
};

/**
 * Extract text from uploaded file
 * @param {Object} file - Uploaded file object
 * @returns {string} Extracted text
 */
const extractTextFromFile = async (file) => {
  try {
    // In a real implementation, you would use a library like pdf-parse for PDFs
    // or mammoth for Word documents to extract text content
    // For now, we'll return a placeholder

    if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf8');
    }

    // For PDF and Word files, you would implement actual text extraction
    // This is a placeholder for demonstration
    return `Text extraction from ${file.originalname} would be implemented here using appropriate libraries like pdf-parse for PDFs or mammoth for Word documents.`;

  } catch (error) {
    console.error('File text extraction error:', error);
    throw new Error(`Text extraction failed: ${error.message}`);
  }
};

// Helper functions for feedback generation
const getGradeFromScore = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

const getFormattingFeedback = (score) => {
  if (score >= 20) return 'Excellent formatting for ATS compatibility';
  if (score >= 15) return 'Good formatting with minor improvements needed';
  if (score >= 10) return 'Moderate formatting issues that may affect ATS parsing';
  return 'Significant formatting problems that will likely cause ATS issues';
};

const getKeywordFeedback = (score) => {
  if (score >= 20) return 'Excellent keyword optimization and job matching';
  if (score >= 15) return 'Good keyword usage with room for improvement';
  if (score >= 10) return 'Limited keyword optimization - consider adding more relevant terms';
  return 'Poor keyword matching - resume may not pass ATS keyword filters';
};

const getStructureFeedback = (score) => {
  if (score >= 15) return 'Well-structured resume with clear sections';
  if (score >= 10) return 'Generally well-structured with some organizational issues';
  if (score >= 5) return 'Structure needs improvement for better ATS compatibility';
  return 'Poor structure that may confuse ATS systems';
};

const getContentFeedback = (score) => {
  if (score >= 12) return 'Strong, quantifiable content that demonstrates value';
  if (score >= 8) return 'Good content with some quantifiable achievements';
  if (score >= 4) return 'Content could benefit from more specific examples';
  return 'Content lacks specificity and quantifiable achievements';
};

const getSkillsFeedback = (score) => {
  if (score >= 12) return 'Excellent skills presentation with good balance';
  if (score >= 8) return 'Good skills section with minor improvements needed';
  if (score >= 4) return 'Skills section needs better organization and specificity';
  return 'Skills section is inadequate or missing important skills';
};

const generateATSRecommendations = (details) => {
  const recommendations = [];

  if (details.formatting.score < 20) {
    recommendations.push('Use standard fonts (Arial, Calibri) and consistent formatting');
  }

  if (details.keywords.score < 20) {
    recommendations.push('Incorporate more keywords from the job description');
  }

  if (details.structure.score < 15) {
    recommendations.push('Ensure clear section headings and chronological order');
  }

  if (details.content.score < 12) {
    recommendations.push('Add quantifiable achievements and use action verbs');
  }

  if (details.skills.score < 12) {
    recommendations.push('Expand and better organize the skills section');
  }

  return recommendations;
};

module.exports = {
  analyzeResume,
  calculateATSScore,
  optimizeKeywords,
  extractSkills,
  compareResumes,
  extractTextFromFile,
  assessFormatting,
  assessKeywords,
  assessStructure,
  assessContent,
  assessSkillsSection
};