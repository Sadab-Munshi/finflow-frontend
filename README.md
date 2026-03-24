# 💰 FinFlow - Personal Finance Tracker

**Smart personal finance tracking with AI assistance**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-teal)](https://app.sadabmunshi.online)
[![Next.js](https://img.shields.io/badge/Next.js-15.1.0-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38bdf8)](https://tailwindcss.com)

---

## 🌐 Live Application

**Production URL:** https://app.sadabmunshi.online

---

## ✨ Features

### 💳 Core Features
- **Transaction Tracking** - Add income and expenses manually
- **AI Text Parsing** - Type naturally like "spent 500 on lunch" and AI extracts details
- **Voice Input** - Speak transactions in English, Hindi, or Bengali
- **Receipt Scanning** - Upload receipt images, AI extracts transaction data
- **Budget Management** - Set monthly budgets by category with spending alerts
- **Financial Insights** - AI-powered personalized financial advice
- **Monthly Reports** - Generated summaries of your finances

### 🔐 Authentication & Security
- Email/password authentication with Supabase
- Google OAuth login
- Cloudflare Turnstile CAPTCHA protection
- Row-level security (RLS) on database

### 🌍 Localization
- **Languages:** English, Hindi (हिंदी), Bengali (বাংলা)
- **Currency:** Indian Rupee (₹) with proper formatting
- **Date Format:** DD/MM/YYYY (Indian standard)

### 📱 Responsive Design
- Works seamlessly on mobile, tablet, and desktop
- Progressive Web App (PWA) support

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe code
- **Tailwind CSS 4** - Utility-first styling
- **Recharts** - Data visualization
- **Framer Motion** - Animations

### Backend & Database
- **Supabase** - PostgreSQL database + Authentication
- **Next.js API Routes** - Server-side API endpoints

### AI Services
| Service | Purpose |
|---------|---------|
| **Mistral AI** | Natural language transaction parsing |
| **Google Gemini** | Receipt OCR and data extraction |
| **Groq (Llama)** | Financial insights and report summaries |
| **Sarvam AI** | Speech-to-text for Indian languages |

### Security & Email
- **Cloudflare Turnstile** - Bot protection
- **Brevo** - Transactional emails (welcome emails)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- API keys for AI services (optional for basic features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

### Environment Variables

Create `.env.local` with these variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

# AI APIs (optional)
MISTRAL_API_KEY=your-key
GEMINI_API_KEY=your-key
GROQ_API_KEY=your-key
SARVAM_API_KEY=your-key

# App
NEXT_PUBLIC_APP_URL=https://app.sadabmunshi.online
```

---

## 📁 Project Structure

```
finflow/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth group (login, signup)
│   ├── (landing)/         # Landing pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── add/               # Add transaction
│   ├── history/           # Transaction history
│   ├── budgets/           # Budget management
│   ├── insights/          # AI insights
│   ├── reports/           # Monthly reports
│   ├── settings/          # User settings
│   └── profile/           # User profile
├── components/            # React components
│   ├── auth/             # Auth components
│   ├── layout/           # Layout components
│   └── ui/               # UI components
├── lib/                   # Utilities and helpers
│   ├── supabase/         # Supabase clients
│   ├── db.ts             # Database operations
│   ├── categories.ts     # Category definitions
│   └── utils.ts          # Utility functions
├── public/               # Static assets
├── docs/                 # Documentation
└── types/                # TypeScript types
```

---

## 📚 Documentation

Full documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [00-README-INDEX.md](docs/00-README-INDEX.md) | Documentation index |
| [01-PROJECT-OVERVIEW.md](docs/01-PROJECT-OVERVIEW.md) | Project overview and features |
| [02-SETUP-AND-RUN.md](docs/02-SETUP-AND-RUN.md) | Setup instructions |
| [03-FOLDER-STRUCTURE.md](docs/03-FOLDER-STRUCTURE.md) | Folder structure explained |
| [04-ENVIRONMENT-VARIABLES.md](docs/04-ENVIRONMENT-VARIABLES.md) | Environment variable guide |
| [05-PAGES-AND-ROUTES.md](docs/05-PAGES-AND-ROUTES.md) | Page and route documentation |
| [06-API-ENDPOINTS.md](docs/06-API-ENDPOINTS.md) | API endpoint reference |
| [07-COMPONENTS-LIST.md](docs/07-COMPONENTS-LIST.md) | Component documentation |
| [08-SUPABASE-DATABASE.md](docs/08-SUPABASE-DATABASE.md) | Database schema |
| [09-CURRENT-STATUS.md](docs/09-CURRENT-STATUS.md) | Current project status |
| [10-FUTURE-UPDATES-GUIDE.md](docs/10-FUTURE-UPDATES-GUIDE.md) | Guide for future updates |
| [11-DEPLOYMENT-GUIDE.md](docs/11-DEPLOYMENT-GUIDE.md) | Deployment instructions |

---

## 🚢 Deployment

The application is deployed on **Vercel**.

### Production Deployment
1. Push changes to main branch
2. Vercel automatically deploys
3. Verify at https://app.sadabmunshi.online

### Environment Variables on Vercel
All environment variables must be configured in Vercel Dashboard:
- Go to Project Settings → Environment Variables
- Add all variables from `.env.local`

---

## 🔒 Security Notes

- **Never commit `.env.local`** - It contains sensitive API keys
- **Service Role Key** - Only use on server, never in client code
- **Row Level Security** - Enabled on all Supabase tables
- **CAPTCHA** - Required on all authentication pages

---

## 🐛 Troubleshooting

### Build Errors
```bash
# Clean build cache
rm -rf .next
npm run build
```

### Database Connection Issues
- Verify Supabase project is active
- Check environment variables are correct
- Ensure Row Level Security policies are configured

### AI Features Not Working
- Verify API keys are set correctly
- Check API provider dashboard for quota limits
- Some AI services require activation time

---

## 📄 License

Private - All rights reserved.

---

## 🙏 Acknowledgments

Built with AI assistance and modern web technologies. Special thanks to:
- **Next.js Team** for the amazing framework
- **Supabase** for backend infrastructure
- **Vercel** for hosting and deployment

---

**Last Updated:** March 9, 2026
