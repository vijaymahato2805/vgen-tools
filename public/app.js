// API Configuration
const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
    auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        me: '/api/auth/me'
    },
    bio: {
        generate: '/api/bio/generate',
        platforms: '/api/bio/platforms'
    },
    resume: {
        generate: '/api/resume/generate'
    },
    coverLetter: {
        generate: '/api/cover-letter/generate'
    },
    flashcard: {
        generate: '/api/flashcard/generate'
    },
    interview: {
        generate: '/api/interview/generate'
    },
    analyzer: {
        analyze: '/api/analyzer/analyze'
    },
    history: {
        save: '/api/history',
        get: '/api/history'
    }
};

// Global state
let currentUser = null;
let currentToken = localStorage.getItem('token');
let currentToolModal = null; // Track which tool is currently open in modal

// Utility functions
const showSpinner = () => {
    document.getElementById('loadingSpinner').style.display = 'flex';
};

const hideSpinner = () => {
    document.getElementById('loadingSpinner').style.display = 'none';
};

const showModal = (modalId) => {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
};

const hideModal = (modalId) => {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';

    // Clear current tool modal tracking when tool modal is closed
    if (modalId === 'toolModal') {
        currentToolModal = null;
        console.log('DEBUG: Cleared currentToolModal');
    }
};

const showNotification = (message, type = 'success') => {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);

    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
};

const makeAPIRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('DEBUG: Making API request to:', endpoint);
    console.log('DEBUG: currentToken available:', !!currentToken);

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
        console.log('DEBUG: Added Authorization header');
    } else {
        console.log('DEBUG: No token available, request will fail auth');
    }

    try {
        console.log('DEBUG: Sending request...');
        const response = await fetch(url, config);
        console.log('DEBUG: Response status:', response.status);

        const data = await response.json();

        if (!response.ok) {
            console.error('DEBUG: API request failed with status:', response.status, 'data:', data);
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        console.log('DEBUG: API request successful');
        return data;
    } catch (error) {
        console.error('DEBUG: API request failed:', error);
        throw error;
    }
};

// Authentication functions
const handleLogin = async (email, password) => {
    try {
        const response = await makeAPIRequest(API_ENDPOINTS.auth.login, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        console.log('DEBUG: Login response received');
        currentToken = response.data.token;
        currentUser = response.data.user;

        console.log('DEBUG: Setting currentToken:', !!currentToken);
        console.log('DEBUG: Setting currentUser:', !!currentUser);
        console.log('DEBUG: User data:', currentUser);

        localStorage.setItem('token', currentToken);
        localStorage.setItem('user', JSON.stringify(currentUser));

        updateAuthUI();
        hideModal('authModal');
        showNotification(`Welcome back, ${currentUser.firstName || currentUser.first_name}!`);

        // Check if there's a pending tool to redirect to
        const pendingTool = sessionStorage.getItem('pendingTool');
        if (pendingTool) {
            console.log('DEBUG: Redirecting to pending tool:', pendingTool);
            sessionStorage.removeItem('pendingTool');
            showToolModal(pendingTool);
        } else {
            // Check if tool modal is open and refresh it (legacy behavior)
            const toolModal = document.getElementById('toolModal');
            if (toolModal && toolModal.style.display === 'block' && currentToolModal) {
                console.log('DEBUG: Tool modal is open after login, refreshing content for:', currentToolModal);
                const toolContent = document.getElementById('toolContent');
                if (toolContent && toolContent.querySelector('.auth-required')) {
                    console.log('DEBUG: Tool modal shows auth required, refreshing with authenticated content');
                    showToolModal(currentToolModal);
                }
            }
        }

        return response.data;
    } catch (error) {
        console.error('DEBUG: Login failed:', error);
        showNotification(error.message || 'Login failed', 'error');
        throw error;
    }
};

const handleRegister = async (email, password, firstName, lastName) => {
    try {
        console.log('DEBUG: Attempting registration for email:', email);
        const response = await makeAPIRequest(API_ENDPOINTS.auth.register, {
            method: 'POST',
            body: JSON.stringify({ email, password, firstName, lastName })
        });

        console.log('DEBUG: Registration response received');
        currentToken = response.data.token;
        currentUser = response.data.user;

        console.log('DEBUG: Setting currentToken:', !!currentToken);
        console.log('DEBUG: Setting currentUser:', !!currentUser);

        localStorage.setItem('token', currentToken);
        localStorage.setItem('user', JSON.stringify(currentUser));

        updateAuthUI();
        hideModal('authModal');
        showNotification('Registration successful!');

        // Check if there's a pending tool to redirect to
        const pendingTool = sessionStorage.getItem('pendingTool');
        if (pendingTool) {
            console.log('DEBUG: Redirecting to pending tool after registration:', pendingTool);
            sessionStorage.removeItem('pendingTool');
            showToolModal(pendingTool);
        } else {
            // Check if tool modal is open and refresh it (legacy behavior)
            const toolModal = document.getElementById('toolModal');
            if (toolModal && toolModal.style.display === 'block' && currentToolModal) {
                console.log('DEBUG: Tool modal is open after registration, refreshing content for:', currentToolModal);
                const toolContent = document.getElementById('toolContent');
                if (toolContent && toolContent.querySelector('.auth-required')) {
                    console.log('DEBUG: Tool modal shows auth required, refreshing with authenticated content');
                    showToolModal(currentToolModal);
                }
            }
        }

        return response.data;
    } catch (error) {
        console.error('DEBUG: Registration failed:', error);
        showNotification(error.message || 'Registration failed', 'error');
        throw error;
    }
};

const handleLogout = () => {
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    showNotification('Logged out successfully');
};

const updateAuthUI = () => {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const navAuth = document.querySelector('.nav-auth');

    if (currentUser && currentToken) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        
        // Add user menu
        navAuth.innerHTML = `
            <div class="user-menu">
                <span class="user-name">Welcome, ${currentUser.firstName || currentUser.first_name}!</span>
                <button class="btn btn-outline" id="logoutBtn">Logout</button>
            </div>
        `;

        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    } else {
        loginBtn.style.display = 'inline-flex';
        registerBtn.style.display = 'inline-flex';
        
        navAuth.innerHTML = `
            <button id="loginBtn" class="btn btn-outline">Login</button>
            <button id="registerBtn" class="btn btn-primary">Register</button>
        `;
    }
};

// Tool functions
const showToolModal = (toolType) => {
    console.log('DEBUG: showToolModal called for tool:', toolType);
    console.log('DEBUG: currentUser exists:', !!currentUser);
    console.log('DEBUG: currentToken exists:', !!currentToken);

    const modalTitle = document.getElementById('toolModalTitle');
    const toolFormContainer = document.getElementById('toolFormContainer');
    const toolResultContainer = document.getElementById('toolResultContainer');

    const toolConfig = {
        bio: { title: 'AI Bio Generator', icon: 'user-circle' },
        resume: { title: 'AI Resume Builder', icon: 'file-alt' },
        'cover-letter': { title: 'Cover Letter Generator', icon: 'envelope' },
        interview: { title: 'Interview Preparation', icon: 'comments' },
        flashcard: { title: 'Smart Flashcards', icon: 'layer-group' },
        analyzer: { title: 'Content Analyzer', icon: 'chart-line' }
    };

    if (toolConfig[toolType]) {
        currentToolModal = toolType; // Track current tool
        console.log('DEBUG: Set currentToolModal to:', currentToolModal);

        modalTitle.innerHTML = `<i class="fas fa-${toolConfig[toolType].icon}"></i> ${toolConfig[toolType].title}`;

        if (!currentUser) {
            console.log('DEBUG: User not authenticated, showing login modal directly');
            // Store the tool type so we can redirect back after login
            sessionStorage.setItem('pendingTool', toolType);
            
            // Set up login modal
            document.getElementById('modalTitle').textContent = 'Login to Access ' + toolConfig[toolType].title;
            document.getElementById('nameFields').style.display = 'none';
            document.getElementById('authForm').reset();
            document.getElementById('switchText').textContent = "Don't have an account? ";
            document.getElementById('switchAuth').textContent = 'Register here';
            
            // Show login modal instead of tool modal
            showModal('authModal');
        } else {
            console.log('DEBUG: Showing tool form for authenticated user');
            toolFormContainer.innerHTML = generateToolForm(toolType);
            toolResultContainer.innerHTML = ''; // Clear previous results
            setupToolForm(toolType);
            showModal('toolModal');
        }
    }
};

const generateToolForm = (toolType) => {
    const forms = {
        bio: `
            <form id="${toolType}Form">
                <div class="form-section">
                    <h4>Personal Information</h4>
                    <div class="form-group">
                        <label for="fullName">Full Name</label>
                        <input type="text" id="fullName" name="fullName" required>
                    </div>
                    <div class="form-group">
                        <label for="jobTitle">Current/Desired Job Title</label>
                        <input type="text" id="jobTitle" name="jobTitle" required>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Platform & Style</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="platform">Platform</label>
                            <select id="platform" name="platform" required>
                                <option value="linkedin">LinkedIn</option>
                                <option value="twitter">Twitter/X</option>
                                <option value="instagram">Instagram</option>
                                <option value="general">General Purpose</option>
                                <option value="website">Website</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="tone">Tone</label>
                            <select id="tone" name="tone" required>
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                                <option value="creative">Creative</option>
                                <option value="technical">Technical</option>
                                <option value="friendly">Friendly</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Additional Details</h4>
                    <div class="form-group">
                        <label for="experience">Key Experience/Skills</label>
                        <textarea id="experience" name="experience" rows="3" placeholder="Enter key experience, skills, or achievements"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="keywords">Keywords (optional)</label>
                        <input type="text" id="keywords" name="keywords" placeholder="Enter keywords separated by commas">
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-full">Generate Bio</button>
            </form>
        `,
        
        resume: `
            <form id="${toolType}Form">
                <div class="form-section">
                    <h4>Personal Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="fullName">Full Name</label>
                            <input type="text" id="fullName" name="fullName" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="phone">Phone</label>
                            <input type="tel" id="phone" name="phone" required>
                        </div>
                        <div class="form-group">
                            <label for="location">Location</label>
                            <input type="text" id="location" name="location" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Professional Summary</h4>
                    <div class="form-group">
                        <label for="jobTitle">Target Job Title</label>
                        <input type="text" id="jobTitle" name="jobTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="summary">Professional Summary</label>
                        <textarea id="summary" name="summary" rows="4" placeholder="Brief summary of your professional background and goals"></textarea>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-full">Generate Resume</button>
            </form>
        `,
        
        'cover-letter': `
            <form id="coverletterForm">
                <div class="form-section">
                    <h4>Personal Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="fullName">Full Name</label>
                            <input type="text" id="fullName" name="fullName" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Job Details</h4>
                    <div class="form-group">
                        <label for="jobTitle">Job Title</label>
                        <input type="text" id="jobTitle" name="jobTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="companyName">Company Name</label>
                        <input type="text" id="companyName" name="companyName" required>
                    </div>
                    <div class="form-group">
                        <label for="jobDescription">Job Description (optional)</label>
                        <textarea id="jobDescription" name="jobDescription" rows="3" placeholder="Paste the job description or key requirements"></textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Your Background</h4>
                    <div class="form-group">
                        <label for="experience">Relevant Experience</label>
                        <textarea id="experience" name="experience" rows="4" placeholder="Describe your relevant experience and achievements" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="skills">Key Skills</label>
                        <input type="text" id="skills" name="skills" placeholder="Enter key skills separated by commas">
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-full">Generate Cover Letter</button>
            </form>
        `,
        
        interview: `
            <form id="${toolType}Form">
                <div class="form-section">
                    <h4>Interview Details</h4>
                    <div class="form-group">
                        <label for="jobTitle">Job Title</label>
                        <input type="text" id="jobTitle" name="jobTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="companyName">Company Name</label>
                        <input type="text" id="companyName" name="companyName" required>
                    </div>
                    <div class="form-group">
                        <label for="interviewType">Interview Type</label>
                        <select id="interviewType" name="interviewType" required>
                            <option value="behavioral">Behavioral</option>
                            <option value="technical">Technical</option>
                            <option value="case-study">Case Study</option>
                            <option value="general">General</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Your Background</h4>
                    <div class="form-group">
                        <label for="experience">Experience Level</label>
                        <select id="experience" name="experience" required>
                            <option value="entry">Entry Level (0-2 years)</option>
                            <option value="mid">Mid Level (3-5 years)</option>
                            <option value="senior">Senior Level (6+ years)</option>
                            <option value="executive">Executive Level</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="skills">Key Skills/Technologies</label>
                        <input type="text" id="skills" name="skills" placeholder="Enter relevant skills separated by commas">
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-full">Generate Interview Questions</button>
            </form>
        `,
        
        flashcard: `
            <form id="${toolType}Form">
                <div class="form-section">
                    <h4>Content Details</h4>
                    <div class="form-group">
                        <label for="topic">Topic/Subject</label>
                        <input type="text" id="topic" name="topic" required placeholder="e.g., JavaScript Fundamentals, Marketing Concepts">
                    </div>
                    <div class="form-group">
                        <label for="content">Content to Convert</label>
                        <textarea id="content" name="content" rows="6" required placeholder="Paste your study material, notes, or content here"></textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Flashcard Settings</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="difficulty">Difficulty Level</label>
                            <select id="difficulty" name="difficulty" required>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="cardCount">Number of Cards</label>
                            <select id="cardCount" name="cardCount" required>
                                <option value="5">5 Cards</option>
                                <option value="10">10 Cards</option>
                                <option value="15">15 Cards</option>
                                <option value="20">20 Cards</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-full">Generate Flashcards</button>
            </form>
        `,
        
        analyzer: `
            <form id="${toolType}Form">
                <div class="form-section">
                    <h4>Content Analysis</h4>
                    <div class="form-group">
                        <label for="analysisType">Analysis Type</label>
                        <select id="analysisType" name="analysisType" required>
                            <option value="readability">Readability Analysis</option>
                            <option value="sentiment">Sentiment Analysis</option>
                            <option value="keywords">Keyword Extraction</option>
                            <option value="summary">Content Summary</option>
                            <option value="seo">SEO Analysis</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="content">Content to Analyze</label>
                        <textarea id="content" name="content" rows="8" required placeholder="Paste your content here for analysis"></textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Additional Options</h4>
                    <div class="form-group">
                        <label for="targetAudience">Target Audience (optional)</label>
                        <input type="text" id="targetAudience" name="targetAudience" placeholder="e.g., General public, Technical professionals, Students">
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-full">Analyze Content</button>
            </form>
        `
    };

    return forms[toolType] || '<p>Tool interface coming soon!</p>';
};

const setupToolForm = (toolType) => {
    const form = document.getElementById(`${toolType.replace('-', '')}Form`);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            if (key === 'keywords' || key === 'skills') {
                data[key] = value.split(',').map(k => k.trim()).filter(k => k);
            } else {
                data[key] = value;
            }
        });

        showSpinner();

        try {
            let response;
            
            switch (toolType) {
                case 'bio':
                    response = await makeAPIRequest(API_ENDPOINTS.bio.generate, {
                        method: 'POST',
                        body: JSON.stringify({
                            personalInfo: {
                                name: data.fullName,
                                jobTitle: data.jobTitle
                            },
                            platform: data.platform,
                            tone: data.tone,
                            experience: data.experience ? [data.experience] : [],
                            keywords: data.keywords || []
                        })
                    });
                    break;
                    
                case 'resume':
                    response = await makeAPIRequest(API_ENDPOINTS.resume.generate, {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                    break;
                    
                case 'cover-letter':
                    response = await makeAPIRequest(API_ENDPOINTS.coverLetter.generate, {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                    break;
                    
                case 'interview':
                    response = await makeAPIRequest(API_ENDPOINTS.interview.generate, {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                    break;
                    
                case 'flashcard':
                    response = await makeAPIRequest(API_ENDPOINTS.flashcard.generate, {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                    break;
                    
                case 'analyzer':
                    response = await makeAPIRequest(API_ENDPOINTS.analyzer.analyze, {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                    break;
                    
                default:
                    throw new Error(`Tool "${toolType}" is not yet implemented`);
            }

            hideSpinner();
            
            // Show results
            document.getElementById('toolResultContainer').innerHTML = `
                <div class="tool-results">
                    <h4>Generated Content</h4>
                    <div class="result-content">
                        <pre>${JSON.stringify(response.data, null, 2)}</pre>
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-outline" onclick="saveToHistory('${toolType}', response.data)">Save to History</button>
                    </div>
                </div>
            `;

        } catch (error) {
            hideSpinner();
            showNotification(error.message || 'Generation failed', 'error');
        }
    });
};

const saveToHistory = async (type, content) => {
    try {
        await makeAPIRequest(API_ENDPOINTS.history.save, {
            method: 'POST',
            body: JSON.stringify({
                type,
                title: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${new Date().toLocaleDateString()}`,
                content,
                metadata: { generatedAt: new Date().toISOString() }
            })
        });
        
        showNotification('Content saved to history!');
    } catch (error) {
        showNotification(error.message || 'Failed to save', 'error');
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateAuthUI();
        } catch (e) {
            localStorage.removeItem('user');
        }
    }

    // Navigation toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    // Authentication modal
    document.getElementById('loginBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Login to VGen Tools';
        document.getElementById('nameFields').style.display = 'none';
        document.getElementById('authForm').reset();
        document.getElementById('switchText').textContent = "Don't have an account? ";
        document.getElementById('switchAuth').textContent = 'Register here';
        showModal('authModal');
    });

    document.getElementById('registerBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Register for VGen Tools';
        document.getElementById('nameFields').style.display = 'flex';
        document.getElementById('authForm').reset();
        document.getElementById('switchText').textContent = 'Already have an account? ';
        document.getElementById('switchAuth').textContent = 'Login here';
        showModal('authModal');
    });

    document.getElementById('getStartedBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Register for VGen Tools';
        document.getElementById('nameFields').style.display = 'flex';
        document.getElementById('authForm').reset();
        document.getElementById('switchText').textContent = 'Already have an account? ';
        document.getElementById('switchAuth').textContent = 'Login here';
        showModal('authModal');
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        hideModal('authModal');
    });

    document.getElementById('closeToolModal').addEventListener('click', () => {
        hideModal('toolModal');
    });

    // Auth form switch
    document.getElementById('switchAuth').addEventListener('click', (e) => {
        e.preventDefault();
        const nameFields = document.getElementById('nameFields');
        const modalTitle = document.getElementById('modalTitle');
        const switchText = document.getElementById('switchText');
        const switchAuth = document.getElementById('switchAuth');

        if (nameFields.style.display === 'none') {
            // Switch to register
            modalTitle.textContent = 'Register for VGen Tools';
            nameFields.style.display = 'flex';
            switchText.textContent = 'Already have an account? ';
            switchAuth.textContent = 'Login here';
        } else {
            // Switch to login
            modalTitle.textContent = 'Login to VGen Tools';
            nameFields.style.display = 'none';
            switchText.textContent = "Don't have an account? ";
            switchAuth.textContent = 'Register here';
        }
    });

    // Auth form submission
    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');

        showSpinner();

        try {
            if (document.getElementById('nameFields').style.display === 'none') {
                // Login
                await handleLogin(email, password);
            } else {
                // Register
                await handleRegister(email, password, firstName, lastName);
            }
        } catch (error) {
            console.error('Auth error:', error);
        } finally {
            hideSpinner();
        }
    });

    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const toolType = e.target.closest('.tool-card').dataset.tool;
            showToolModal(toolType);
        });
    });

    // Footer tool links
    document.querySelectorAll('.footer-column a[data-tool]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const toolType = e.target.dataset.tool;
            showToolModal(toolType);
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});