const openaiService = require('../services/openaiService');

/**
 * Generate a cover letter using AI
 * @param {Object} resumeData - User's resume information
 * @param {string} jobDescription - Job description text
 * @param {Object} options - Generation options (tone, company info, etc.)
 * @returns {string} Generated cover letter
 */
const generateCoverLetter = async (resumeData, jobDescription, options = {}) => {
  try {
    const { tone = 'professional', companyInfo = {}, customization = {}, preview = false } = options;

    // Use the AI service to generate the cover letter
    const coverLetter = await openaiService.generateCoverLetter(resumeData, jobDescription, {
      maxTokens: 1200,
      temperature: 0.5
    });

    return coverLetter;

  } catch (error) {
    console.error('Cover letter generation error in controller:', error);
    throw new Error(`Cover letter generation failed: ${error.message}`);
  }
};

/**
 * Analyze job description for better cover letter generation
 * @param {string} jobDescription - Job description text
 * @returns {Object} Analysis results
 */
const analyzeJobDescription = async (jobDescription) => {
  try {
    const prompt = `
      Analyze the following job description and extract key information for cover letter writing:

      JOB DESCRIPTION:
      ${jobDescription}

      Please provide analysis in the following JSON format:
      {
        "keyRequirements": ["most important job requirements"],
        "preferredQualifications": ["nice-to-have qualifications"],
        "companyValues": ["company culture and values mentioned"],
        "keywords": ["important keywords and phrases"],
        "responsibilities": ["main job responsibilities"],
        "industry": "industry or sector",
        "jobLevel": "entry|mid|senior|executive",
        "suggestedTone": "formal|professional|enthusiastic|confident",
        "focusAreas": ["areas to emphasize in cover letter"]
      }

      Be specific and thorough in your analysis.
    `;

    const response = await openaiService.generateCompletion(prompt, {
      maxTokens: 1000,
      temperature: 0.3
    });

    return JSON.parse(response);

  } catch (error) {
    console.error('Job description analysis error:', error);
    throw new Error(`Job analysis failed: ${error.message}`);
  }
};

/**
 * Format resume data for cover letter generation
 * @param {Object} resumeData - Raw resume data
 * @returns {Object} Formatted resume data
 */
const formatResumeForCoverLetter = (resumeData) => {
  const {
    personalInfo,
    experience = [],
    skills = {},
    education = []
  } = resumeData;

  // Extract key information for cover letter
  const formattedData = {
    name: `${personalInfo.firstName} ${personalInfo.lastName}`,
    contact: {
      email: personalInfo.email,
      phone: personalInfo.phone || '',
      location: personalInfo.location || ''
    },
    summary: personalInfo.summary || '',

    // Get most recent or relevant experience
    experience: experience.slice(0, 3).map(exp => ({
      position: exp.position,
      company: exp.company,
      duration: `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`,
      keyAchievements: Array.isArray(exp.description)
        ? exp.description.slice(0, 2)
        : [exp.description || ''].slice(0, 2)
    })),

    // Key skills for this job
    skills: [
      ...(skills.technical || []).slice(0, 5),
      ...(skills.soft || []).slice(0, 3)
    ],

    // Most recent education
    education: education.slice(0, 2).map(edu => ({
      degree: edu.degree,
      field: edu.fieldOfStudy,
      institution: edu.institution
    }))
  };

  return formattedData;
};

/**
 * Generate cover letter in different formats
 * @param {Object} resumeData - Resume data
 * @param {string} jobDescription - Job description
 * @param {string} format - Output format (text, html)
 * @param {Object} options - Generation options
 * @returns {string} Formatted cover letter
 */
const generateFormattedCoverLetter = async (resumeData, jobDescription, format = 'text', options = {}) => {
  try {
    const coverLetter = await generateCoverLetter(resumeData, jobDescription, options);

    switch (format) {
      case 'html':
        return formatCoverLetterAsHTML(coverLetter, resumeData, options);
      case 'text':
      default:
        return coverLetter;
    }

  } catch (error) {
    console.error('Cover letter formatting error:', error);
    throw new Error(`Cover letter formatting failed: ${error.message}`);
  }
};

/**
 * Format cover letter as HTML
 * @param {string} coverLetter - Cover letter text
 * @param {Object} resumeData - Resume data for header
 * @param {Object} options - Formatting options
 * @returns {string} HTML formatted cover letter
 */
const formatCoverLetterAsHTML = (coverLetter, resumeData, options = {}) => {
  const { personalInfo } = resumeData;
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cover Letter - ${personalInfo.firstName} ${personalInfo.lastName}</title>
        <style>
            body {
                font-family: 'Georgia', serif;
                margin: 0;
                padding: 20px;
                line-height: 1.6;
                max-width: 800px;
            }
            .header {
                margin-bottom: 30px;
            }
            .contact-info {
                margin-bottom: 20px;
            }
            .date {
                text-align: right;
                margin-bottom: 20px;
            }
            .recipient {
                margin-bottom: 20px;
            }
            .salutation {
                margin-bottom: 15px;
            }
            .body {
                margin-bottom: 30px;
            }
            .paragraph {
                margin-bottom: 15px;
                text-align: justify;
            }
            .closing {
                margin-top: 30px;
            }
            .signature {
                margin-top: 40px;
            }
            .name {
                font-weight: bold;
                border-top: 1px solid #000;
                padding-top: 10px;
                width: fit-content;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="contact-info">
                ${personalInfo.firstName} ${personalInfo.lastName}<br>
                ${personalInfo.email}<br>
                ${personalInfo.phone ? `${personalInfo.phone}<br>` : ''}
                ${personalInfo.location || ''}
            </div>
        </div>

        <div class="date">
            ${today}
        </div>

        <div class="body">
            ${coverLetter.split('\n\n').map(paragraph => {
              if (paragraph.trim()) {
                return `<p class="paragraph">${paragraph.trim()}</p>`;
              }
              return '';
            }).join('\n')}
        </div>

        <div class="closing">
            Sincerely,<br><br>
            <div class="signature">
                <div class="name">${personalInfo.firstName} ${personalInfo.lastName}</div>
            </div>
        </div>
    </body>
    </html>
  `;

  return html;
};

/**
 * Generate company-specific cover letter variations
 * @param {Object} resumeData - Resume data
 * @param {string} jobDescription - Job description
 * @param {Array} companyVariations - Different company emphases
 * @returns {Array} Array of cover letters for different company focuses
 */
const generateCompanyVariations = async (resumeData, jobDescription, companyVariations = []) => {
  try {
    const variations = [];

    for (const variation of companyVariations) {
      const customizedOptions = {
        ...variation,
        customization: {
          companyFocus: variation.companyFocus,
          emphasis: variation.emphasis
        }
      };

      const coverLetter = await generateCoverLetter(resumeData, jobDescription, customizedOptions);
      variations.push({
        type: variation.type,
        focus: variation.companyFocus,
        coverLetter
      });
    }

    return variations;

  } catch (error) {
    console.error('Company variation generation error:', error);
    throw new Error(`Company variation generation failed: ${error.message}`);
  }
};

/**
 * Generate cover letter length variations (short, medium, long)
 * @param {Object} resumeData - Resume data
 * @param {string} jobDescription - Job description
 * @param {Object} options - Generation options
 * @returns {Object} Different length versions of the cover letter
 */
const generateLengthVariations = async (resumeData, jobDescription, options = {}) => {
  try {
    const variations = {};
    const tones = ['short', 'medium', 'long'];

    for (const length of tones) {
      const lengthOptions = {
        ...options,
        customization: {
          ...options.customization,
          length: length,
          maxTokens: length === 'short' ? 600 : length === 'medium' ? 900 : 1200
        }
      };

      variations[length] = await generateCoverLetter(resumeData, jobDescription, lengthOptions);
    }

    return variations;

  } catch (error) {
    console.error('Length variation generation error:', error);
    throw new Error(`Length variation generation failed: ${error.message}`);
  }
};

module.exports = {
  generateCoverLetter,
  analyzeJobDescription,
  formatResumeForCoverLetter,
  generateFormattedCoverLetter,
  formatCoverLetterAsHTML,
  generateCompanyVariations,
  generateLengthVariations
};