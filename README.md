# 🚀 VGen Tools — Ultimate AI Productivity Platform

VGen Tools is the **8-in-1 AI-powered web app** built with **Node.js, Express, and Google Gemini AI**. It serves as a comprehensive toolset for career development, knowledge creation, and productivity enhancement.

It empowers users to generate **resumes**, **cover letters**, **bios**, **flashcards**, analyze **resumes**, prepare for **interviews**, and discover **local services** — all seamlessly integrated into one intuitive platform.

## 🌟 Features

✅ **AI Resume Generator** — Craft professional resumes instantly with **Template Selection & Customization** 🎨, including a gallery of modern designs (e.g., minimalist, academic, technical) and personalized color/font options for download-ready perfection.

✅ **AI Cover Letter Generator** 📝 — Seamlessly generate tailored cover letters by combining your resume with a user-pasted job description, ensuring relevance and professionalism.

✅ **AI Bio Writer** — Produce engaging bios in various tones, enhanced with **Social Media Optimization** 📱 for platforms like LinkedIn, Twitter/X, and Instagram, respecting character limits and style guidelines.

✅ **AI Flashcard Maker** — Transform notes into interactive Q&A flashcards, featuring **Spaced Repetition Scheduling** 🧠 to track reviews and suggest optimal study sessions based on proven algorithms like Anki.

✅ **AI Resume Analyzer** — Receive detailed strengths, weaknesses, missing keywords, and an **ATS Compatibility Score** ✅ with targeted feedback to optimize for Applicant Tracking Systems and avoid common pitfalls.

✅ **AI Interview Question Generator** 🗣️ — Input a job description to generate probable technical, behavioral, and situational questions, complete with suggested answer structures for confident preparation.

✅ **Local Service Finder (demo)** — Explore nearby services with this static prototype, ready for expansion into a dynamic recommendation engine.

✅ **User Authentication & History** 💾 — Secure login/signup system enabling users to save, edit, and manage all generated content (resumes, bios, flashcards) across sessions for enhanced retention and personalization.

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Google Gemini AI** - AI-powered content generation
- **Supabase** - Backend-as-a-Service database and authentication
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware
- **Express Rate Limit** - API rate limiting

### Development Tools
- **Nodemon** - Development auto-reload
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase project and API keys
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vgen-tools.git
   cd vgen-tools
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Google Gemini API Configuration
   GEMINI_API_KEY=your_gemini_api_key_here

   # Database Configuration (Supabase)
   SUPABASE_URL=https://rvqyzwgdkevuirfsozsu.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cXl6d2dka2V2dWlyZnNvenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzMxNDMsImV4cCI6MjA3MzYwOTE0M30.U2mFJdeQ84AWgCwON9Vez3qfJ67wyK-tpmsfmcQvWOs

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Check if the server is running**
   ```bash
   npm run health
   ```

The server will be running at `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update user profile |

### Resume Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resume/generate` | Generate AI resume |
| GET | `/api/resume/templates` | Get resume templates |
| POST | `/api/resume/preview` | Preview resume (no usage cost) |

### Cover Letter Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cover-letter/generate` | Generate AI cover letter |
| GET | `/api/cover-letter/templates` | Get cover letter templates |
| GET | `/api/cover-letter/tones` | Get available tones |

### Bio Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bio/generate` | Generate AI bio |
| GET | `/api/bio/platforms` | Get platform specifications |
| GET | `/api/bio/tones` | Get available tones |

### Flashcard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flashcard/generate` | Generate AI flashcards |
| GET | `/api/flashcard/subjects` | Get available subjects |
| POST | `/api/flashcard/generate-study-plan` | Generate study plan |

### Analyzer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyzer/analyze` | Analyze resume |
| POST | `/api/analyzer/ats-score` | Get ATS compatibility score |
| GET | `/api/analyzer/industries` | Get industry categories |

### Interview Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/generate-questions` | Generate interview questions |
| GET | `/api/interview/question-types` | Get question types |
| POST | `/api/interview/generate-answers` | Generate answer guidance |

### Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/service/search` | Search local services |
| GET | `/api/service/categories` | Get service categories |
| GET | `/api/service/featured` | Get featured services |

### History Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history` | Get user's content history |
| POST | `/api/history` | Save new content |
| PUT | `/api/history/:id` | Update content |
| DELETE | `/api/history/:id` | Delete content |

## 🚢 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   npm run deploy:vercel
   ```

3. **Set Environment Variables**
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Add environment variables from your `.env` file

### Render

1. **Connect to Render**
   - Fork this repository
   - Connect your GitHub repository to Render
   - Render will automatically detect the `render.yaml` configuration

2. **Configure Environment Variables**
   - Add the same environment variables from your `.env` file

### Docker

1. **Build Docker image**
   ```bash
   docker build -t vgen-tools .
   ```

2. **Run container**
   ```bash
   docker run -p 3000:3000 --env-file .env vgen-tools
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `JWT_SECRET` | JWT secret key | Yes |
| `JWT_EXPIRE` | JWT expiration time | No (default: 7d) |

### Rate Limiting

- **Authentication routes**: 5 attempts per 15 minutes per IP
- **API routes**: 100 requests per 15 minutes per IP
- **Usage limits**: Based on user subscription plan

## 📊 Usage Limits

### Free Tier
- 10 AI generations per month
- Basic templates and features
- Standard support

### Premium Tier
- Unlimited AI generations
- All templates and features
- Priority support

## 🔒 Security Features

- **Password hashing** with bcrypt
- **JWT authentication** with secure tokens
- **Rate limiting** to prevent abuse
- **CORS protection** for cross-origin requests
- **Helmet security** headers
- **Input validation** with express-validator

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Project Structure

```
vgen-tools/
├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   └── app.js          # Main application file
├── templates/          # View templates
├── uploads/           # File uploads
├── public/            # Static files
├── .env.example       # Environment variables template
├── vercel.json        # Vercel deployment config
├── render.yaml        # Render deployment config
├── Dockerfile         # Docker configuration
└── README.md          # Project documentation
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google** for providing the Gemini AI API
- **Supabase** for the database and authentication
- **Express.js** community for the excellent framework
- All contributors and supporters

## 📞 Support

For support, email support@vgentools.com or join our Discord community.

---

**Made with ❤️ by the VGen Tools Team**