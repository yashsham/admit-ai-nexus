# Admit AI Nexus 🎓

**Admit AI Nexus** is an intelligent admission automation platform designed to streamline student recruitment. It combines a modern React frontend with a powerful Python backend driven by AI agents to manage campaigns, personalize communication, and analyze engagement.

## 🚀 Features

-   **🤖 AI-Powered Campaigns**: Generates personalized emails and WhatsApp messages using **Llama 3** (via Groq) and **CrewAI**.
-   **📧 Design-First Communication**: Sends beautiful, HTML-rich emails with context-aware links (e.g., dynamically finding "Scholarship" pages vs "Sports" pages).
-   **📊 Real-Time Analytics**: 
    -   **Engagement Tracking**: Monitor Messages Sent, Calls Made, and Responses.
    -   **Delivery Rates**: Track successful vs. failed deliveries per channel.
    -   **Interest Detection**: Automatically tags candidates as "Interested" based on their replies.
    -   **Failure Analysis**: Detailed logs of delivery failures for debugging.
-   **🔒 Secure Multi-Tenancy**: Strict data isolation ensuring users only access their own campaigns and candidates.
-   **📂 Batch Processing**: Upload thousands of candidates via CSV and process them efficiently.
-   **🔗 Multi-Channel**: Integrated support for Email (SendGrid/SMTP), WhatsApp (Meta/Twilio), and Voice (Retell AI).

## 🛠️ Tech Stack

### Frontend
-   **React** (Vite)
-   **TypeScript**
-   **Tailwind CSS** & **Shadcn UI**
-   **Recharts** for Analytics
-   **Supabase Realtime** for live updates

### Backend
-   **FastAPI** (Python)
-   **Supabase** (PostgreSQL & Auth)
-   **CrewAI** & **LangChain** (AI Orchestration)
-   **Groq API** (Primary LLM)
-   **Gemini / OpenRouter** (Fallback LLMs)

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
cp ../.env.example .env  # Populate with your API keys
python -m uvicorn app.main:app --reload
# Running on http://localhost:8000
```

## 🌍 Deployment

### Frontend (GitHub Pages)
The frontend is automatically deployed via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`.

**Critical Requirement**:
Set these **Repository Secrets** in GitHub (Settings > Secrets > Actions):
-   `VITE_API_URL`: Your Backend URL (e.g., `https://your-app.onrender.com/api`)
-   `VITE_GROQ_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.

### Backend (Render / Docker)
The backend is containerized using Docker.

1.  Connect your GitHub repo to **Render**.
2.  Select **Web Service**.
3.  **Runtime**: Docker
4.  **Root Directory**: `backend`
5.  **Environment Variables**: Add all keys from `.env.example` (GROQ_API_KEY, SUPABASE_URL, etc.).

**Note**: The Docker Entrypoint is `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

## 📝 Latest Updates (v2.1)
-   **✅ Security**: Implemented strict User ID filtering for all Analytics endpoints.
-   **🔥 Interested Candidates**: New dashboard component counting leads who replied positively.
-   **📈 Dashboard Revamp**: Added Channel Performance breakdown and Recent Failure logs.
-   **⚡ Performance**: Optimized database queries for O(1) space complexity and parallel execution.

---
*Built for the Future of Admissions.*
