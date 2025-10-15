const openaiService = require('../services/openaiService');

/**
 * Generate a resume using AI
 * @param {Object} resumeData - User's resume information
 * @param {Object} options - Generation options (template, customization)
 * @returns {string} Generated resume content
 */
const generateResume = async (resumeData, options = {}) => {
  try {
    const { template = 'modern', customization = {}, preview = false } = options;

    // Use the AI service to generate the resume
    const resume = await openaiService.generateResume(resumeData, template, {
      maxTokens: 1500,
      temperature: 0.3
    });

    return resume;

  } catch (error) {
    console.error('Resume generation error in controller:', error);
    throw new Error(`Resume generation failed: ${error.message}`);
  }
};

/**
 * Format resume data for AI processing
 * @param {Object} rawData - Raw resume data from request
 * @returns {Object} Formatted resume data
 */
const formatResumeData = (rawData) => {
  const {
    personalInfo,
    experience = [],
    education = [],
    skills = [],
    projects = [],
    certifications = [],
    languages = []
  } = rawData;

  // Format personal information
  const formattedPersonalInfo = {
    fullName: `${personalInfo.firstName} ${personalInfo.lastName}`.trim(),
    email: personalInfo.email,
    phone: personalInfo.phone || '',
    location: personalInfo.location || '',
    website: personalInfo.website || '',
    linkedin: personalInfo.linkedin || '',
    github: personalInfo.github || '',
    summary: personalInfo.summary || ''
  };

  // Format experience
  const formattedExperience = experience.map(exp => ({
    company: exp.company || '',
    position: exp.position || '',
    startDate: exp.startDate || '',
    endDate: exp.endDate || '',
    current: exp.current || false,
    location: exp.location || '',
    description: Array.isArray(exp.description)
      ? exp.description.join('\n')
      : exp.description || '',
    achievements: exp.achievements || []
  }));

  // Format education
  const formattedEducation = education.map(edu => ({
    institution: edu.institution || '',
    degree: edu.degree || '',
    fieldOfStudy: edu.fieldOfStudy || '',
    startDate: edu.startDate || '',
    endDate: edu.endDate || '',
    gpa: edu.gpa || '',
    honors: edu.honors || '',
    relevantCoursework: edu.relevantCoursework || []
  }));

  // Format skills by category
  const formattedSkills = {};
  if (skills.technical) formattedSkills.technical = Array.isArray(skills.technical) ? skills.technical : [skills.technical];
  if (skills.soft) formattedSkills.soft = Array.isArray(skills.soft) ? skills.soft : [skills.soft];
  if (skills.languages) formattedSkills.languages = Array.isArray(skills.languages) ? skills.languages : [skills.languages];
  if (skills.tools) formattedSkills.tools = Array.isArray(skills.tools) ? skills.tools : [skills.tools];

  // Format projects
  const formattedProjects = projects.map(project => ({
    name: project.name || '',
    description: project.description || '',
    technologies: project.technologies || [],
    startDate: project.startDate || '',
    endDate: project.endDate || '',
    url: project.url || '',
    github: project.github || ''
  }));

  // Format certifications
  const formattedCertifications = certifications.map(cert => ({
    name: cert.name || '',
    issuer: cert.issuer || '',
    date: cert.date || '',
    expiryDate: cert.expiryDate || '',
    credentialId: cert.credentialId || '',
    url: cert.url || ''
  }));

  // Format languages
  const formattedLanguages = languages.map(lang => ({
    language: lang.language || '',
    proficiency: lang.proficiency || 'Intermediate'
  }));

  return {
    personalInfo: formattedPersonalInfo,
    experience: formattedExperience,
    education: formattedEducation,
    skills: formattedSkills,
    projects: formattedProjects,
    certifications: formattedCertifications,
    languages: formattedLanguages
  };
};

/**
 * Generate resume in different formats (JSON, HTML, Markdown)
 * @param {Object} resumeData - Formatted resume data
 * @param {string} format - Output format
 * @param {string} template - Template style
 * @returns {string} Formatted resume
 */
const generateFormattedResume = async (resumeData, format = 'markdown', template = 'modern') => {
  try {
    let formattedResume = '';

    switch (format) {
      case 'html':
        formattedResume = await generateHTMLResume(resumeData, template);
        break;
      case 'json':
        formattedResume = JSON.stringify(resumeData, null, 2);
        break;
      case 'markdown':
      default:
        formattedResume = await generateMarkdownResume(resumeData, template);
        break;
    }

    return formattedResume;

  } catch (error) {
    console.error('Resume formatting error:', error);
    throw new Error(`Resume formatting failed: ${error.message}`);
  }
};

/**
 * Generate HTML resume
 * @param {Object} resumeData - Formatted resume data
 * @param {string} template - Template style
 * @returns {string} HTML resume
 */
const generateHTMLResume = async (resumeData, template) => {
  const { personalInfo, experience, education, skills, projects, certifications, languages } = resumeData;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${personalInfo.fullName} - Resume</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section h2 { border-bottom: 2px solid #333; padding-bottom: 5px; }
            .experience-item, .education-item, .project-item { margin-bottom: 15px; }
            .date { font-weight: bold; color: #666; }
            .company, .institution { font-weight: bold; }
            .skills { display: flex; flex-wrap: wrap; gap: 10px; }
            .skill-tag { background: #f0f0f0; padding: 5px 10px; border-radius: 15px; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${personalInfo.fullName}</h1>
            <p>${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}</p>
            ${personalInfo.website ? `<p><a href="${personalInfo.website}">${personalInfo.website}</a></p>` : ''}
        </div>

        ${personalInfo.summary ? `
        <div class="section">
            <h2>Professional Summary</h2>
            <p>${personalInfo.summary}</p>
        </div>
        ` : ''}

        ${experience.length > 0 ? `
        <div class="section">
            <h2>Professional Experience</h2>
            ${experience.map(exp => `
                <div class="experience-item">
                    <div class="company">${exp.position}</div>
                    <div class="company">${exp.company}</div>
                    <div class="date">${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}</div>
                    ${exp.location ? `<div>${exp.location}</div>` : ''}
                    <p>${exp.description}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${education.length > 0 ? `
        <div class="section">
            <h2>Education</h2>
            ${education.map(edu => `
                <div class="education-item">
                    <div class="institution">${edu.degree} in ${edu.fieldOfStudy}</div>
                    <div class="institution">${edu.institution}</div>
                    <div class="date">${edu.startDate} - ${edu.endDate}</div>
                    ${edu.gpa ? `<div>GPA: ${edu.gpa}</div>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${Object.keys(skills).length > 0 ? `
        <div class="section">
            <h2>Skills</h2>
            <div class="skills">
                ${Object.entries(skills).map(([category, skillList]) =>
                  skillList.map(skill => `<span class="skill-tag">${skill}</span>`).join('')
                ).join('')}
            </div>
        </div>
        ` : ''}

        ${projects.length > 0 ? `
        <div class="section">
            <h2>Projects</h2>
            ${projects.map(project => `
                <div class="project-item">
                    <div class="company">${project.name}</div>
                    <p>${project.description}</p>
                    ${project.technologies.length > 0 ? `<div><strong>Technologies:</strong> ${project.technologies.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${certifications.length > 0 ? `
        <div class="section">
            <h2>Certifications</h2>
            ${certifications.map(cert => `
                <div>${cert.name} - ${cert.issuer} (${cert.date})</div>
            `).join('')}
        </div>
        ` : ''}

        ${languages.length > 0 ? `
        <div class="section">
            <h2>Languages</h2>
            ${languages.map(lang => `
                <div>${lang.language} - ${lang.proficiency}</div>
            `).join('')}
        </div>
        ` : ''}
    </body>
    </html>
  `;

  return html;
};

/**
 * Generate Markdown resume
 * @param {Object} resumeData - Formatted resume data
 * @param {string} template - Template style
 * @returns {string} Markdown resume
 */
const generateMarkdownResume = async (resumeData, template) => {
  const { personalInfo, experience, education, skills, projects, certifications, languages } = resumeData;

  let markdown = `# ${personalInfo.fullName}\n\n`;

  if (personalInfo.email || personalInfo.phone || personalInfo.location) {
    markdown += `${personalInfo.email || ''} | ${personalInfo.phone || ''} | ${personalInfo.location || ''}\n\n`;
  }

  if (personalInfo.website || personalInfo.linkedin || personalInfo.github) {
    const links = [personalInfo.website, personalInfo.linkedin, personalInfo.github].filter(Boolean);
    markdown += `${links.join(' | ')}\n\n`;
  }

  if (personalInfo.summary) {
    markdown += `## Professional Summary\n\n${personalInfo.summary}\n\n`;
  }

  if (experience.length > 0) {
    markdown += `## Professional Experience\n\n`;
    experience.forEach(exp => {
      markdown += `### ${exp.position}\n`;
      markdown += `**${exp.company}**`;
      if (exp.location) markdown += ` | ${exp.location}`;
      markdown += `\n\n${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}\n\n`;
      markdown += `${exp.description}\n\n`;
    });
  }

  if (education.length > 0) {
    markdown += `## Education\n\n`;
    education.forEach(edu => {
      markdown += `### ${edu.degree} in ${edu.fieldOfStudy}\n`;
      markdown += `**${edu.institution}**`;
      if (edu.location) markdown += ` | ${edu.location}`;
      markdown += `\n\n${edu.startDate} - ${edu.endDate}`;
      if (edu.gpa) markdown += ` | GPA: ${edu.gpa}`;
      markdown += `\n\n`;
    });
  }

  if (Object.keys(skills).length > 0) {
    markdown += `## Skills\n\n`;
    Object.entries(skills).forEach(([category, skillList]) => {
      if (skillList.length > 0) {
        markdown += `**${category.charAt(0).toUpperCase() + category.slice(1)}:** ${skillList.join(', ')}\n\n`;
      }
    });
  }

  if (projects.length > 0) {
    markdown += `## Projects\n\n`;
    projects.forEach(project => {
      markdown += `### ${project.name}\n\n`;
      markdown += `${project.description}\n\n`;
      if (project.technologies.length > 0) {
        markdown += `**Technologies:** ${project.technologies.join(', ')}\n\n`;
      }
      if (project.url || project.github) {
        markdown += `**Links:** ${[project.url, project.github].filter(Boolean).join(', ')}\n\n`;
      }
    });
  }

  if (certifications.length > 0) {
    markdown += `## Certifications\n\n`;
    certifications.forEach(cert => {
      markdown += `- **${cert.name}** - ${cert.issuer} (${cert.date})\n`;
    });
    markdown += `\n`;
  }

  if (languages.length > 0) {
    markdown += `## Languages\n\n`;
    languages.forEach(lang => {
      markdown += `- ${lang.language} - ${lang.proficiency}\n`;
    });
    markdown += `\n`;
  }

  return markdown;
};

module.exports = {
  generateResume,
  formatResumeData,
  generateFormattedResume,
  generateHTMLResume,
  generateMarkdownResume
};