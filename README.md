# AI Sales Analyser — 100% FREE

Full-stack sales analytics platform. Every tool used is **completely free**.

## Free tools used
| Part        | Tool                          | Cost  |
|-------------|-------------------------------|-------|
| Backend     | FastAPI + Python               | Free  |
| Database    | SQLite (built into Python)     | Free  |
| Frontend    | React + Vite                   | Free  |
| Charts      | Recharts                       | Free  |
| AI Chat     | Google Gemini 1.5 Flash API    | Free  |

## Get your FREE Gemini API key (30 seconds)
1. Go to **https://aistudio.google.com**
2. Sign in with your Google account
3. Click **"Get API Key"** → **"Create API key"**
4. Copy the key — no credit card needed!
5. Free tier = **1,500 requests/day**

## Quick Start

### Step 1 — Backend
```bash
cd backend
pip install -r requirements.txt

# Set your FREE Gemini key
export GEMINI_API_KEY=your_key_here      # Mac/Linux
set GEMINI_API_KEY=your_key_here         # Windows

uvicorn main:app --reload --port 8000
```

### Step 2 — Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

### Step 3 — Open the app
Visit: **http://localhost:5173**

## First steps
1. Go to **Upload** → drag in `backend/sample_data.csv`
2. Go to **Dashboard** → see all charts
3. Go to **Forecast** → revenue projections
4. Go to **AI Chat** → ask "Which product had highest revenue?"

## Required CSV columns
| Column   | Description         |
|----------|---------------------|
| date     | Sale date           |
| product  | Product name        |
| region   | Sales region        |
| revenue  | Sale amount         |
| quantity | Units sold          |

Optional: `salesperson`, `category`
