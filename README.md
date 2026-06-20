<div align="center">

#  Massar — AI-Powered Adaptive Learning Platform

**An intelligent, full-stack educational platform that uses Bayesian Knowledge Tracing (BKT) to personalize every student's learning journey in real time.**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini_2.5_Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)

</div>

---

##  Project Overview

**Massar** (مسار — Arabic for "pathway") is a full-stack adaptive learning management system (LMS) built as a capstone university project. It goes beyond traditional LMS platforms by integrating a real-time AI engine that:

1. **Automatically extracts Knowledge Components (KCs)** from any uploaded PDF or PowerPoint slide deck using Google Gemini AI.
2. **Tracks student mastery** of each knowledge component using the **Bayesian Knowledge Tracing (BKT)** algorithm — the same probabilistic model used by Carnegie Learning and Khan Academy.
3. **Generates personalized, difficulty-adaptive quizzes** that become harder as a student's mastery improves.
4. **Produces AI study aids** (summary sheets and interactive mind maps) on-demand from course materials.

The platform supports three user roles — **Students**, **Instructors**, and **Administrators** — each with a fully distinct, bilingual (Arabic/English) dashboard experience.

---

## ✨ Features

### 🧠 AI & Adaptive Learning Engine
- **Automatic Knowledge Component Extraction** — Upload any PDF/PPTX and Gemini 2.5 Flash extracts the 5–7 most critical learning concepts from the actual document content (never from the filename or course title).
- **Bayesian Knowledge Tracing (BKT)** — A four-parameter probabilistic model updates each student's mastery probability after every quiz answer in real time.
- **Adaptive Quiz Generation** — Quizzes are dynamically generated from a student's weakest knowledge components, with difficulty scaling to their current mastery level.
- **AI-Powered Study Aids** — One-click generation of Markdown summary sheets and Mermaid.js interactive mind maps per course.
- **Content Validation** — AI validates instructor-manually-added topics against uploaded document content to prevent inaccurate knowledge maps.

###  Student Experience
- Personal dashboard with per-course mastery progress charts (Recharts).
- Take adaptive quizzes tied to specific knowledge components.
- Download AI-generated study summaries as PDF.
- Join study groups via QR code or unique join code.
- Group chat with real-time messaging (Supabase Realtime).
- Full Arabic/English bilingual interface with RTL layout switching.

###  Instructor Dashboard
- Create and manage courses with full CRUD.
- Upload course documents (PDF, PPTX) — AI processes them automatically.
- View and edit AI-generated knowledge components for each course.
- Create and manage student groups, assign quizzes, and share resources.
- Track individual and group student progress with interactive charts.
- Assign group-level quizzes from any knowledge component pool.

###  Authentication & Authorization
- Email/password authentication via Supabase Auth.
- Google OAuth (Single Sign-On).
- Password reset via email link.
- JWT-based role validation on every protected API endpoint.

###  Admin Panel
- Full user management: view, promote, demote, and delete users.
- Override user roles across the platform.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, React Router v6, Recharts, Lucide React |
| **UI/Styling** | Vanilla CSS with glassmorphism, custom design system, full RTL support |
| **Backend** | Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2.0 |
| **Database** | PostgreSQL via Supabase, with SQLite local fallback |
| **Auth** | Supabase Auth (Email/Password + Google OAuth) |
| **AI** | Google Gemini 2.5 Flash (KC extraction, quiz generation, study aids) |
| **File Parsing** | PyPDF2, python-pptx |
| **Deployment** | Render (Backend), Vercel (Frontend) |
| **Testing** | Playwright (E2E) |
| **Real-time** | Supabase Realtime (group chat) |

---

##  Architecture

```
massar/
├── backend/                    # Python / FastAPI API server
│   ├── app/
│   │   ├── api/                # Route handlers (auth, courses, groups, quiz, …)
│   │   ├── core/               # Business logic & services
│   │   │   ├── ai_service.py   # Gemini AI integration (KC extraction, quiz gen, study aids)
│   │   │   ├── security.py     # JWT auth, password hashing
│   │   │   ├── group_codes.py  # QR code join-link generation
│   │   │   └── supabase_client.py
│   │   ├── database/           # SQLAlchemy engine & session factory
│   │   ├── models/             # ORM models (User, Course, Group, KC, Quiz, …)
│   │   └── main.py             # FastAPI app, CORS, router registration
│   ├── requirements.txt
│   ├── Procfile                # Render deployment command
│   └── render.yaml             # Render IaC config
│
└── frontend/                   # React / Vite SPA
    ├── src/
    │   ├── pages/              # Route-level views
    │   │   ├── Auth.jsx        # Login / Sign-up / Google OAuth
    │   │   ├── Dashboard.jsx   # Student dashboard + BKT progress
    │   │   ├── InstructorDashboard.jsx  # Full instructor control panel
    │   │   ├── AdminDashboard.jsx       # Admin user management
    │   │   ├── Quiz.jsx        # Adaptive quiz flow
    │   │   └── Profile.jsx
    │   ├── components/         # Reusable UI components
    │   │   ├── StudentGroups.jsx  # Group chat, resources, quiz assignments
    │   │   └── KCList.jsx        # Knowledge component display
    │   ├── services/
    │   │   ├── api.js          # Axios client (points to VITE_API_URL)
    │   │   └── supabase.js     # Supabase client
    │   ├── App.jsx             # Root app, routing, i18n translation map
    │   └── index.css           # Global design system (3,000+ lines, dark theme)
    ├── vite.config.js
    └── vercel.json             # SPA fallback routing for Vercel
```

### Data Flow — Student Takes a Quiz

```
Student clicks "Start Quiz"
        │
        ▼
Frontend (Quiz.jsx) → POST /quiz/generate
        │
        ▼
Backend selects the student's weakest KCs (lowest mastery_prob)
        │
        ▼
ai_service.py → Gemini 2.5 Flash generates 5 MCQs, difficulty scaled by mastery
        │
        ▼
Student answers each question
        │
        ▼
POST /quiz/submit → BKT algorithm updates mastery_prob per KC
        │
        ▼
Dashboard re-renders with updated Recharts progress bars
```

---

##  Installation & Local Setup

### Prerequisites
- **Python 3.12+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+ LTS** — [nodejs.org](https://nodejs.org/)
- A **Supabase** project — [supabase.com](https://supabase.com/) (free tier works)
- A **Google Gemini API Key** — [ai.google.dev](https://ai.google.dev/)

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/massar.git
cd massar
```

### 2. Backend Setup
```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
# Supabase — from Project Settings → API
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_secret_key

# Database — from Project Settings → Database → Connection String
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# CORS — set to your frontend URL
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
uvicorn app.main:app --reload
# Server runs at http://localhost:8000
# Interactive API docs at http://localhost:8000/docs
```

### 3. Frontend Setup
```bash
# Open a new terminal window
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
# App runs at http://localhost:5173
```

---

##  Usage

| Role | Access |
|---|---|
| **Student** | Register an account → enroll in a course → take adaptive quizzes → view progress → join a study group |
| **Instructor** | Register → upload PDFs/PPTXs → AI auto-generates knowledge components → assign group quizzes → monitor student mastery |
| **Admin** | Dedicated `/admin` panel → manage all users and roles |

---

## 📸 Screenshots

> _Screenshots and a live demo will be added here._

| View | Description |
|---|---|
| Student Dashboard | Mastery progress bars per KC using Recharts |
| Instructor Dashboard | Full course + group + KC management UI |
| Adaptive Quiz | MCQ flow with BKT mastery update on submit |
| AI Study Aids | Markdown summary + Mermaid mind map output |
| Group Chat | Real-time messaging via Supabase Realtime |

---

## 🔬 Algorithms

### Bayesian Knowledge Tracing (BKT)
BKT models each knowledge component as a hidden Markov model with four parameters:

| Parameter | Meaning |
|---|---|
| `P(L₀)` | Prior probability the student already knows the KC |
| `P(T)` | Probability the student will learn the KC after a practice opportunity |
| `P(G)` | Probability of a correct answer without knowing the KC (guess) |
| `P(S)` | Probability of an incorrect answer despite knowing the KC (slip) |

After each quiz answer, the posterior mastery probability is updated using Bayes' theorem. This drives the adaptive difficulty of subsequent quiz questions and highlights which KCs need review on the student dashboard.

---

## 🔭 Future Improvements

- [ ] **Spaced Repetition Scheduler** — Integrate SM-2/Anki-style review scheduling based on BKT mastery decay over time.
- [ ] **Mobile App** — React Native companion app with offline quiz caching.
- [ ] **LTI 1.3 Integration** — Plug Massar directly into Moodle, Canvas, or Blackboard as an LTI tool.
- [ ] **Collaborative Annotations** — Allow students to annotate uploaded PDFs and share annotations within a group.
- [ ] **Analytics Export** — CSV/Excel export of student mastery data for instructors.
- [ ] **Multi-language AI** — Extend beyond Arabic/English to support more languages in KC extraction.
- [ ] **Notifications** — Push notifications for quiz assignments and group messages.
- [ ] **Migrate to `google-genai` SDK** — Upgrade from deprecated `google-generativeai` to the new `google-genai` package.

---

## 📄 License

This project was developed as a university capstone project. All rights reserved.

---

<div align="center">
Built with ❤️ as a capstone project
</div>
