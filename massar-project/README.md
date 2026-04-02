# 🚀 Massar Platform - Developer Onboarding Guide

Welcome to the **Massar Project**! Massar is a full-stack educational platform powered by an Artificial Intelligence engine that utilizes Bayesian Knowledge Tracing (BKT) to dynamically evaluate student performance. 

This guide is designed for a completely brand-new machine. It assumes you have **zero programming languages** downloaded. Follow these instructions exactly in order, and you will have the entire dual-stack platform running on your Localhost in 10 minutes.

---

## 🛠️ Phase 1: Core Prerequisites
Before downloading the code, your computer needs the engines required to run it. Please download and install the following three tools:

1. **Git** *(To clone the repository)*
   * Download from [git-scm.com](https://git-scm.com/) and install with default settings.
2. **Node.js** *(To run the React Frontend)*
   * Download the **LTS Version** from [nodejs.org](https://nodejs.org/). This automatically installs `npm`. 
3. **Python 3.12+** *(To run the AI API Backend)*
   * Download from [python.org](https://www.python.org/downloads/). 
   * ⚠️ **CRITICAL WINDOWS STEP**: When the Python installer opens, you **must** check the box at the very bottom that says **"Add Python to PATH"** before clicking Install.

---

## 📦 Phase 2: Clone the Environment
Open a Terminal (or Command Prompt / PowerShell) and type:

```bash
# 1. Download the code from GitHub to your computer
git clone https://github.com/SS7ZH/Massar.git

# 2. Enter the main project folder
cd Massar/massar-project
```

*(Note: Keep this terminal window open. We will now split into two separate servers working in parallel).*

---

## 🧠 Phase 3: Start the Backend (Python / FastAPI)
The Backend is the brain of Massar. It handles Supabase Authentication, PostgreSQL database connections, and the math engine.

In your terminal, run the following commands:
```bash
# 1. Enter the backend folder
cd backend

# 2. Create an isolated Python Virtual Environment
python -m venv venv

# 3. Activate the Environment
# If you are on Windows:
.\venv\Scripts\activate
# If you are on Mac/Linux:
source venv/bin/activate

# 4. Install all the massive AI & Backend dependencies
pip install -r requirements.txt
```

### 🛑 WAIT! You need the Secret Keys!
Before you can run the backend, it needs to know how to log into the cloud database.
1. Create a new file inside the `backend` folder and name it exactly **`.env`**
2. Ask your Lead Developer (SS7ZH) to securely message you the 3 Secret Keys, and paste them into your `.env` file like this:
```env
SUPABASE_URL=https://[MASKED].supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiI...[MASKED]
DATABASE_URL=postgresql://postgres:[MASKED]@db.cxpsub.supabase.co:5432/postgres
```

Now, boot up the Backend Server:
```bash
uvicorn app.main:app --reload
```
✅ *The Backend is now actively listening on `http://localhost:8000`! Leave this terminal running forever.*

---

## 🎨 Phase 4: Start the Frontend (React / Vite)
The Frontend is the gorgeous, glassmorphism UI where the students interact with the platform.

**Open a BRAND NEW Terminal Window (Leave the Python terminal alone!)**
```bash
# 1. Navigate to the frontend folder
cd "path/to/Massar/massar-project/frontend"

# 2. Command Node to physically download all the React UI dependencies 
npm install

# 3. Boot up the Frontend Server
npm run dev
```

✅ *The Frontend is now actively running!*

---

## 🏆 Phase 5: You're Done!
Open your web browser (Google Chrome, Firefox, etc.) and type:
**`http://localhost:5173`** 

You should immediately see the Massar Homepage. Click "Login" and test it out! Any graphical changes you make to the `.jsx` files will auto-update in 1 millisecond. Welcome to the Team!
