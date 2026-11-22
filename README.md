# ZaiqaBox Karachi - Corporate Lunch Subscription Web Platform

A production-ready full-stack web application for **ZaiqaBox Karachi**: a corporate lunch subscription service delivering fresh, home-cooked, portion-controlled, and nutritionist-reviewed healthy lunch boxes to office professionals in DHA, Clifton, and PECHS Karachi.

This project includes a responsive one-page website (HTML5, CSS3, Vanilla JS), a Python FastAPI backend, an AI Chatbot (Groq LLM + BM25 RAG), a Voice Assistant (Deepgram STT & TTS), strict medical compliance guardrails, an automated lead capture pipeline with Google Sheets integration, and an instant delivery/pricing calculator.

---

## 🚀 Key Features

1. **Modern Brand Website**:
   - Built with the official ZaiqaBox logo, responsive dark-green and skillet-walnut overlay hero banner, and custom luxury color scheme (#1B1109 skillet walnut, #184D30 forest green, #E69F24 flame gold, #FAF7F2 cream).
   - Fully responsive on Mobile (360px), Tablet (768px), and Desktop (1280px+). No horizontal overflow.
   - Accessible buttons and form inputs (>= 44px touch targets).

2. **Full-Featured Admin Operations Portal (`/admin`)**:
   - Dedicated dashboard connected directly to **Microsoft SQL Server (SSMS)**.
   - **Menu & Dishes Management**: Add, edit, or delete dishes; set custom food pictures, star ratings (e.g. `★ 4.9`), descriptions, sides, calories, and protein macros.
   - **Plans & Pricing Management**: Dynamically change Weekly Trial and Monthly Executive prices, lunch counts, and feature bullets.
   - **Delivery Zones Management**: Configure free delivery clusters (DHA, Clifton, PECHS) and outside zone daily charges (PKR 200/day).
   - **Leads CRM**: View all captured website leads in real-time, update statuses (`New`, `Contacted`, `Subscribed`, `Archived`), 1-click WhatsApp customer chat, and export to CSV.
   - **Website Settings**: Instantly update announcement bar text, WhatsApp phone number, support email, and pause cutoff deadlines.

3. **Microsoft SQL Server (SSMS) Integration**:
   - Native integration with Microsoft SQL Server using `pyodbc` and `ODBC Driver 17 for SQL Server`.
   - Complete T-SQL schema script provided at `database/schema_sql_server.sql` ready to open and run in SQL Server Management Studio (SSMS).
   - Automatic resilient local fallback to SQLite if SQL Server is ever stopped, guaranteeing 100% website uptime.

4. **Dynamic Menu with Photos, Descriptions & Star Ratings**:
   - Each weekday lunch features high-resolution food photography, chef descriptions, star reviews, calories, and direct WhatsApp order links.
   - Dynamically synced with the database: changes made in the Admin Panel immediately reflect on the public landing page!

2. **Delivery Checker & Price Calculator**:
   - Instant calculation for DHA, Clifton, and PECHS (Free Delivery) vs. Outside Zones (PKR 200/day).
   - Real-time price breakdown with 1-click pre-filled WhatsApp order generation.

3. **Strict Medical & Dietary Guardrails (`backend/guardrails.py`)**:
   - Prohibits medical, diabetic, or weight-loss claims ("lose weight", "diabetic friendly", "cures", etc.).
   - Intercepts inquiries in English, Urdu, and Roman Urdu.
   - Automatically escalates medical queries to a human nutritionist with a WhatsApp contact button.

4. **AI Chatbot (`frontend/js/chatbot.js` + `backend/rag.py`)**:
   - Powered by Groq LLaMA 3.3 with local BM25 ranking over verified knowledge chunks.
   - Answers strictly from facts; zero hallucinations or invented prices.

5. **AI Voice Assistant (`frontend/js/voice.js`)**:
   - Microphone recording with MediaRecorder.
   - Speech-to-Text (STT) via Deepgram Nova.
   - Text-to-Speech (TTS) via Deepgram Aura voice (with Web Speech API fallback).
   - Clear UI states: Listening, Thinking, Speaking, with Stop controls.

6. **Lead Capture & Free Nutrition Guide Incentive**:
   - Captures corporate leads with Pakistani phone number validation (`03XXXXXXXXX` / `+923XXXXXXXXX`).
   - Uses Groq to generate a 1-line compliance-safe AI lead summary.
   - Automatically saves to Google Sheets via webhook; falls back to `backend/leads_backup.json` if offline.
   - Automatically triggers the download of the 5-Day Office Lunch Nutrition Guide PDF upon successful submission.

7. **Centralized Client Configuration (`frontend/js/config.js`)**:
   - Single file where the client can update prices, meal plans, delivery zones, phone numbers, and announcement texts without touching HTML or backend code.

---

## 📂 Project Structure

```
ZaiqaBox Karachi/
│
├── frontend/
│   ├── index.html              # Semantic HTML5 single-page application
│   ├── css/
│   │   └── style.css           # Mobile-first CSS with custom brand palette
│   ├── js/
│   │   ├── config.js           # Single editable client configuration file
│   │   ├── script.js           # Core site logic, calculator, lead form, analytics
│   │   ├── chatbot.js          # AI chatbot widget with quick chips & handoff
│   │   └── voice.js            # Voice assistant (Deepgram STT/TTS & browser fallback)
│   └── assets/
│       ├── logo.png            # Official ZaiqaBox logo
│       ├── banner.jpg          # Hero background banner
│       └── office_lunch_guide.pdf # 5-Day Office Lunch Balanced Nutrition Guide
│
├── backend/
│   ├── main.py                 # FastAPI application serving API & static frontend
│   ├── rag.py                  # BM25 knowledge retrieval engine
│   ├── guardrails.py           # Medical/weight-loss compliance & escalation
│   ├── requirements.txt        # Python backend dependencies
│   └── leads_backup.json       # Local backup storage for offline leads
│
├── knowledge/
│   ├── menu_and_plans.md       # Verified subscription plans & sample menu
│   ├── delivery_policy.md      # Delivery zones, timings & pause cutoff rules
│   └── faq.md                  # Approved FAQ answers
│
├── google-apps-script.gs       # Google Sheets lead capture webhook script
├── .env.example                # Template for environment variables
├── .env                        # Local environment configuration (ignored by git)
├── .gitignore                  # Git ignore rules
└── README.md                   # Setup, configuration & deployment guide
```

---

## 🛠️ Quick Start & Local Run

### 1. Prerequisites
- Python 3.10+ installed on your system.

### 2. Install Dependencies
Open your terminal in the project root directory and run:
```bash
pip install -r backend/requirements.txt
```

### 3. Run the Project
Start the unified server with a single command (it serves both backend API and frontend static files):
```bash
uvicorn backend.main:app --reload --port 8000
```

### 4. View in Browser
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🔑 Environment Variables Setup (`.env`)

Copy `.env.example` to `.env` (or edit the existing `.env`):
```env
# Groq LLM API Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Deepgram Voice API Configuration (STT & TTS)
DEEPGRAM_API_KEY=your_deepgram_api_key_here
DEEPGRAM_STT_MODEL=nova-2
DEEPGRAM_STT_LANGUAGE=en
DEEPGRAM_TTS_VOICE=aura-asteria-en

# Google Sheets Webhook URL
SHEET_WEBHOOK_URL=https://script.google.com/macros/s/your_deployment_id/exec

# Security & CORS settings
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

# Server Host & Port
HOST=0.0.0.0
PORT=8000
```

*Note: If API keys are not provided during initial demo or testing, the backend features intelligent factual fallbacks for RAG queries and browser speech synthesis for voice so that the platform functions without crashing!*

---

## 📊 Google Sheets Setup Guide

Follow these steps to connect your lead capture form to Google Sheets:

1. Go to [Google Sheets](https://sheets.new) and create a new spreadsheet named **"ZaiqaBox Leads"**.
2. Rename the first sheet tab to **"Leads"**.
3. In Row 1, add these headers across columns A to I:
   - `Timestamp` | `Name` | `Email` | `WhatsApp` | `Area` | `Plan` | `AI Summary` | `Source` | `Status`
4. In the top menu, click **Extensions > Apps Script**.
5. Delete any code in the editor and paste the full contents of `google-apps-script.gs`.
6. Click **Deploy > New deployment**.
7. In the left panel, click the gear icon and select **Web app**.
8. Fill in:
   - **Description**: `ZaiqaBox Lead Webhook`
   - **Execute as**: `Me (your Google email)`
   - **Who has access**: `Anyone` *(Important: must be Anyone so your backend can post to it without OAuth prompts)*
9. Click **Deploy**. Authorize the required Google permissions when prompted.
10. Copy the generated **Web App URL** and paste it into your `.env` file as `SHEET_WEBHOOK_URL`.

---

## ⚙️ Client Customization (`frontend/js/config.js`)

When prices, delivery areas, or WhatsApp numbers change, edit **only** `frontend/js/config.js`:
- `brand.whatsappNumber`: Update to your active WhatsApp business number (format: `923XXXXXXXXX`).
- `plans`: Adjust lunch counts, weekly/monthly prices, per-meal text, or features.
- `delivery.freeZones`: Add or remove free delivery zones.
- `delivery.outsideZoneFeePerDay`: Change the outside-zone rate (currently PKR 200).
- `announcement.text`: Edit top banner announcement.

---

## 🔒 Security & Medical Compliance

- **No API Keys in Frontend**: Groq and Deepgram keys remain strictly server-side.
- **Medical Compliance**: Words like "lose weight", "diabetic friendly", and "cures" are strictly blocked. Any health or dietary questions are routed to human nutritionists.
- **Rate Limiting**: IP-based rate limiting (60 requests/min) on `/api/` routes prevents abuse.
- **Input Sanitization**: Strip dangerous HTML tags from all inputs.
- **CORS Restriction**: Limited to verified origins configured in `.env`.
