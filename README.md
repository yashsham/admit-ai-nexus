# Admit AI Nexus 🎓

**Admit AI Nexus** is an intelligent admission automation platform designed to streamline student recruitment. It combines a modern React frontend with a powerful Python backend driven by AI agents to manage campaigns, personalize communication, and analyze engagement.

## 🚀 Features

-   **🤖 AI-Powered Campaigns**: Generates personalized emails and WhatsApp messages using **Llama 3** (via Groq) and **CrewAI**.
-   **📧 Design-First Communication**: Sends beautiful, HTML-rich emails with context-aware links (e.g., dynamically finding "Scholarship" pages vs "Sports" pages).
-   **📊 Real-Time Analytics**: Dashboard for tracking delivery rates, engagement, and candidate reach.
-   **📂 Batch Processing**: Upload thousands of candidates via CSV and process them efficiently.
-   **🔗 Multi-Channel**: Integrated support for Email (SendGrid/SMTP) and WhatsApp.

## 🛠️ Tech Stack

### Frontend
-   **React** (Vite)
-   **TypeScript**
-   **Tailwind CSS** & **Shadcn UI**
-   **Recharts** for Analytics

### Backend
-   **FastAPI** (Python)
-   **Supabase** (Database & Auth)
-   **CrewAI** & **LangChain** (AI Orchestration)
-   **Groq API** (LLM)
-   **Tavily API** (Search & Verification)

## 🏗️ Architecture

This project uses a decoupled architecture:
1.  **Frontend**: Hosted on **GitHub Pages**. Code is in `src/`.
2.  **Backend**: Hosted on **Render** as a Web Service. Code is in `backend/`.
3.  **Database**: Managed **Supabase** instance.

## ⚙️ Local Setup

### 1. Frontend
```bash
npm install
cp .env.example .env  # Add your VITE_* keys
npm run dev
# Running on http://localhost:5173
```

### 2. Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env  # Add GROQ_API_KEY, SUPABASE_URL, etc.
python -m uvicorn app.main:app --reload
# Running on http://localhost:8000
```

## 🌍 Deployment

### Frontend (GitHub Pages)
The frontend is automatically deployed via GitHub Actions (`.github/workflows/deploy.yml`).

**Critical Requirement**:
You must set the following **Repository Secrets** in GitHub (Settings > Secrets > Actions):
-   `VITE_API_URL`: `https://admit-ai-backend.onrender.com/api`
-   `VITE_GROQ_API_KEY`: Your Groq Key
-   `VITE_SUPABASE_URL`: Your Supabase URL
-   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key

### Backend (Render)
1.  Connect your GitHub repo to **Render**.
2.  Select **Web Service**.
3.  **Build Command**: `pip install -r backend/requirements.txt`
4.  **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5.  **Root Directory**: `backend`
6.  **Environment Variables**: Add all backend `.env` variables (GROQ_API_KEY, SMTP credentials, etc.).

## 📝 Latest Updates
-   **Fixed**: Email AI Generation crash due to missing dependencies.
-   **Improved**: Dynamic Link Generation (links are now relevant to the specific Campaign Goal).
-   **Secure**: CORS configured for Production and Local Development.

---
*Built for the Future of Admissions.*
