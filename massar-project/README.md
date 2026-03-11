# Massar Project (مسار)

## Overview
Massar is an adaptive learning path recommendation system designed to help students overcome the "lost" feeling in their academic journeys. Unlike traditional static learning methods (reading PDFs/PPTs), Massar provides a personalized, dynamic experience by analyzing student performance and interests in real-time.

## Core Idea & Problem Statement
- **Problem:** Students often find academic choices overwhelming, and traditional study materials are static, offering no interactive feedback on mastery.
- **Solution:** An intelligent platform that **deconstructs educational content** into granular Knowledge Components (KCs) and uses a **Bayesian Knowledge Tracing (BKT)** algorithm to track mastery and recommend optimal learning paths.

## Main Features
1. **Learning Command Center:** Personalized student dashboard charting learning paths and progress.
2. **AI Content Deconstruction:** Automated extraction of Knowledge Components from uploaded files (PDFs/PPTs).
3. **Adaptive Quizzing:** Quizzes that dynamically adjust difficulty and content based on student mastery level.
4. **Instructor Portal:** Tools to create groups, monitor progress, and identify strengths/weaknesses in a cohort.
5. **Social Learning:** Group chats and private messaging for mentorship and collaboration.

## Technical Architecture
- **Frontend:** React (Vite), Tailwind CSS, Framer Motion
- **Backend:** Python (FastAPI) handling the core BKT engine logic
- **Infrastructure:** Google Cloud Platform (GCP)
- **Database & Auth:** Firebase (Firestore, Cloud Storage, Firebase Auth)
- **AI Integration:** Vertex AI (Gemini/Llama-3) for semantic analysis and content deconstruction

## Directory Structure
- `backend/` - Python FastAPI (The AI/BKT Brain)
- `frontend/` - React/Vite (The User Interface)
- `docs/` - Sprint 0 documents, diagrams, and glossary

## Setup Instructions
(Setup instructions for installing dependencies will be added here...)
