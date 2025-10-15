const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 2000,
        temperature: 0.7,
      }
    });
    this.maxTokens = parseInt(process.env.GEMINI_MAX_TOKENS) || 2000;
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const systemPrompt = 'You are VGen Tools, an AI assistant specialized in career development, content creation, and productivity enhancement. Provide helpful, accurate, and professional responses.';
      const fullPrompt = `${systemPrompt}\n\n${prompt}`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Google Gemini API Error:', error);
      throw new Error(`Google Gemini API request failed: ${error.message}`);
    }
  }

  async generateEmbedding(text) {
    try {
      // Note: Google Gemini doesn't have a direct embedding equivalent like OpenAI's
      // This is a placeholder for future implementation if needed
      console.warn('Embedding generation not available in Gemini API');
      return [];
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  // Resume generation with template selection
  async generateResume(userData, template = 'modern', options = {}) {
    const templatePrompts = {
      modern: 'Create a modern, clean resume with contemporary formatting and design elements.',
      minimalist: 'Create a minimalist resume with simple, clean lines and plenty of white space.',
      academic: 'Create an academic-style resume emphasizing research, publications, and educational background.',
      technical: 'Create a technical resume highlighting technical skills, projects, and certifications.',
      creative: 'Create a creative resume with unique formatting and visual elements for creative industries.',
      executive: 'Create an executive resume with a professional, leadership-focused layout.'
    };

    const prompt = `
      ${templatePrompts[template] || templatePrompts.modern}

      Please generate a professional resume based on the following information:
      ${JSON.stringify(userData, null, 2)}

      Format the resume in a structured, professional manner suitable for download.
      Include all relevant sections and ensure ATS-friendly formatting.
      Use clear headings and organize information logically.

      Return the resume as a formatted text that can be easily parsed and styled.
    `;

    return this.generateCompletion(prompt);
  }

  // Cover letter generation
  async generateCoverLetter(resumeData, jobDescription, options = {}) {
    const prompt = `
      Generate a professional, tailored cover letter based on:

      RESUME INFORMATION:
      ${JSON.stringify(resumeData, null, 2)}

      JOB DESCRIPTION:
      ${jobDescription}

      REQUIREMENTS:
      - Customize the cover letter to match the job requirements
      - Highlight relevant experience and skills from the resume
      - Show enthusiasm for the role and company
      - Keep it concise (3-4 paragraphs)
      - Use professional language and tone
      - Include specific examples where possible

      Format it as a properly structured cover letter with:
      - Header with contact information
      - Date
      - Employer's contact information
      - Salutation
      - Body paragraphs
      - Closing

      Return only the cover letter content, ready to be used in a document.
    `;

    return this.generateCompletion(prompt);
  }

  // Bio generation with social media optimization
  async generateBio(userData, platform = 'general', tone = 'professional', options = {}) {
    const platformLimits = {
      linkedin: 2600,
      twitter: 160,
      instagram: 150,
      general: 500
    };

    const tonePrompts = {
      professional: 'Write in a professional, formal tone suitable for business and career purposes.',
      casual: 'Write in a friendly, approachable tone while maintaining professionalism.',
      creative: 'Write in an engaging, creative tone that showcases personality and uniqueness.',
      technical: 'Write in a technical, precise tone emphasizing expertise and achievements.'
    };

    const prompt = `
      ${tonePrompts[tone] || tonePrompts.professional}

      Generate a bio for ${platform} with the following information:
      ${JSON.stringify(userData, null, 2)}

      REQUIREMENTS:
      - Keep within ${platformLimits[platform]} characters
      - Make it engaging and impactful
      - Highlight key strengths and achievements
      - Include relevant keywords for the industry/field
      - End with a call-to-action or forward-looking statement
      - Optimize for the specific platform's audience and style

      Return only the bio text, ready to be used directly.
    `;

    return this.generateCompletion(prompt);
  }

  // Flashcard generation with spaced repetition
  async generateFlashcards(content, subject = 'general', options = {}) {
    const prompt = `
      Transform the following content into interactive Q&A flashcards:

      CONTENT:
      ${content}

      SUBJECT: ${subject}

      REQUIREMENTS:
      - Create 5-10 high-quality flashcards
      - Each card should have a clear question and accurate answer
      - Focus on key concepts, definitions, and important facts
      - Make questions challenging but fair
      - Ensure answers are concise and complete
      - Organize cards by difficulty if possible

      Return the flashcards in the following JSON format:
      {
        "flashcards": [
          {
            "id": "unique_id",
            "question": "What is...?",
            "answer": "The definition or explanation...",
            "difficulty": "easy|medium|hard",
            "category": "topic_category"
          }
        ],
        "totalCards": number,
        "estimatedStudyTime": "time_in_minutes"
      }
    `;

    const response = await this.generateCompletion(prompt);
    return JSON.parse(response);
  }

  // Resume analysis with ATS scoring
  async analyzeResume(resumeText, jobDescription = '', options = {}) {
    const prompt = `
      Analyze the following resume and provide detailed feedback:

      RESUME CONTENT:
      ${resumeText}

      ${jobDescription ? `JOB DESCRIPTION: ${jobDescription}` : ''}

      Provide analysis in the following JSON format:
      {
        "overallScore": "percentage_0_100",
        "atsCompatibility": "percentage_0_100",
        "strengths": ["list", "of", "key", "strengths"],
        "weaknesses": ["list", "of", "areas", "for", "improvement"],
        "missingKeywords": ["keywords", "that", "should", "be", "included"],
        "recommendations": ["specific", "actionable", "suggestions"],
        "sectionAnalysis": {
          "contactInfo": {"score": 0-100, "feedback": "comments"},
          "summary": {"score": 0-100, "feedback": "comments"},
          "experience": {"score": 0-100, "feedback": "comments"},
          "education": {"score": 0-100, "feedback": "comments"},
          "skills": {"score": 0-100, "feedback": "comments"}
        },
        "keywordOptimization": ["suggested", "keywords", "to", "add"]
      }

      Be thorough but constructive in your feedback.
    `;

    const response = await this.generateCompletion(prompt);
    return JSON.parse(response);
  }

  // Interview question generation
  async generateInterviewQuestions(jobDescription, questionType = 'mixed', options = {}) {
    const typePrompts = {
      technical: 'Generate technical questions focusing on specific skills, technologies, and problem-solving abilities.',
      behavioral: 'Generate behavioral questions that assess past experiences, soft skills, and cultural fit.',
      situational: 'Generate situational questions that test how candidates would handle specific work scenarios.',
      mixed: 'Generate a balanced mix of technical, behavioral, and situational questions.'
    };

    const prompt = `
      ${typePrompts[questionType] || typePrompts.mixed}

      Based on the following job description, generate relevant interview questions:

      JOB DESCRIPTION:
      ${jobDescription}

      REQUIREMENTS:
      - Create 8-12 thoughtful, relevant questions
      - Include a mix of difficulty levels
      - Focus on job requirements and responsibilities
      - Make questions specific to the role and industry
      - Include both common and unique questions

      Return questions in the following JSON format:
      {
        "questions": [
          {
            "id": "unique_id",
            "question": "The interview question",
            "type": "technical|behavioral|situational",
            "difficulty": "easy|medium|hard",
            "category": "specific_category",
            "suggestedAnswer": "Brief guidance on what to look for in answers"
          }
        ],
        "totalQuestions": number,
        "questionDistribution": {
          "technical": count,
          "behavioral": count,
          "situational": count
        }
      }
    `;

    const response = await this.generateCompletion(prompt);
    return JSON.parse(response);
  }
}

module.exports = new GeminiService();