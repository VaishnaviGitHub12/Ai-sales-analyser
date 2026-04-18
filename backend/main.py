from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os, json, re, requests
from datetime import datetime
from pydantic import BaseModel

from database import init_db, get_db_connection
from analysis import (
    get_summary_stats, get_revenue_by_period, get_top_products,
    get_regional_breakdown, get_forecast, run_sql_query
)

app = FastAPI(title="AI Sales Analyser - Free Edition", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://ai-sales-analyser.vercel.app",  # ← add this
        "https://*.vercel.app",                   # ← allows all vercel previews
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# FREE AI: Google Gemini 1.5 Flash — 1500 req/day FREE, no credit card
# Get free key: https://aistudio.google.com → "Get API Key"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

def call_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        return ("⚠️  No GEMINI_API_KEY found.\n"
                "Get a FREE key at: https://aistudio.google.com\n"
                "Then run:  export GEMINI_API_KEY=your_key_here")
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 1500, "temperature": 0.3}
    }
    try:
        r = requests.post(f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload, timeout=30)
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    except requests.exceptions.HTTPError:
        if r.status_code == 400:
            return "❌ Invalid API key. Get a free key at aistudio.google.com"
        return f"❌ Gemini API error {r.status_code}: {r.text}"
    except Exception as e:
        return f"❌ Error: {e}"

class ChatRequest(BaseModel):
    message: str
    conversation_history: list = []

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv','.xlsx','.xls')):
        raise HTTPException(400, "Only CSV and Excel files supported.")
    contents = await file.read()
    try:
        import io
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(400, f"Cannot parse file: {e}")

    df.columns = [c.strip().lower().replace(' ','_') for c in df.columns]
    required = {'date','revenue','product','region','quantity'}
    missing = required - set(df.columns)
    if missing:
        mapping = {}
        for col in df.columns:
            for req in list(missing):
                if req in col or col in req:
                    mapping[col] = req; missing.discard(req)
        df.rename(columns=mapping, inplace=True)
    if missing:
        raise HTTPException(400, f"Missing columns: {missing}. Found: {list(df.columns)}")

    df['date'] = pd.to_datetime(df['date'], infer_datetime_format=True, errors='coerce')
    df.dropna(subset=['date'], inplace=True)
    df['date'] = df['date'].dt.strftime('%Y-%m-%d')
    df['revenue'] = pd.to_numeric(df['revenue'], errors='coerce').fillna(0)
    df['quantity'] = pd.to_numeric(df.get('quantity',0), errors='coerce').fillna(0)

    conn = get_db_connection()
    df.to_sql('sales', conn, if_exists='replace', index=False)
    conn.close()
    return {"message": f"Loaded {len(df):,} rows", "rows": len(df),
            "columns": list(df.columns), "date_range": {"from": df['date'].min(), "to": df['date'].max()}}

@app.get("/api/stats/summary")
def summary(): return get_summary_stats()

@app.get("/api/stats/revenue-by-period")
def revenue_by_period(period: str = "monthly"): return get_revenue_by_period(period)

@app.get("/api/stats/top-products")
def top_products(limit: int = 10): return get_top_products(limit)

@app.get("/api/stats/regions")
def regions(): return get_regional_breakdown()

@app.get("/api/stats/forecast")
def forecast(periods: int = 6): return get_forecast(periods)

@app.post("/api/chat")
def chat(req: ChatRequest):
    conn = get_db_connection()
    try:
        schema = pd.read_sql("PRAGMA table_info(sales)", conn)[['name','type']].to_dict('records')
        sample = pd.read_sql("SELECT * FROM sales LIMIT 3", conn).to_dict('records')
    except:
        schema, sample = [], []
    finally:
        conn.close()

    history_text = "\n".join(
        f"{'User' if m.get('role')=='user' else 'Assistant'}: {m.get('content','')}"
        for m in req.conversation_history[-6:]
    )

    prompt = f"""You are an expert AI Sales Analyst with access to a SQLite 'sales' table.
Schema: {json.dumps(schema)}
Sample rows: {json.dumps(sample, default=str)}
Conversation so far:
{history_text}

User: {req.message}

Rules:
- If data is needed, write ONE SQL SELECT wrapped in <sql>...</sql>
- Give a clear business insight using numbers and trends
- Be concise and actionable like a senior analyst
- Only SELECT is allowed"""

    ai_text = call_gemini(prompt)
    sql_result = None
    if "<sql>" in ai_text:
        m = re.search(r'<sql>(.*?)</sql>', ai_text, re.DOTALL)
        if m:
            sql_result = run_sql_query(m.group(1).strip())
            ai_text = ai_text.replace(f"<sql>{m.group(1)}</sql>", "").strip()

    return {"response": ai_text, "sql_result": sql_result, "timestamp": datetime.now().isoformat()}

@app.get("/api/health")
def health():
    return {"status": "ok", "ai_provider": "Google Gemini 1.5 Flash (FREE)",
            "gemini_configured": bool(GEMINI_API_KEY), "timestamp": datetime.now().isoformat()}
