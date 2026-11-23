"""
ZaiqaBox Karachi - Production FastAPI Backend & Admin API
Database Engine: Microsoft SQL Server (SSMS / ZaiqaBoxDB) with SQLite resilience
Serves:
- Public website & Admin panel (/admin)
- Dynamic site configuration & menu (/api/site/data)
- Admin CRUD API for Menu, Plans, Delivery Zones, Leads, and Settings
- /api/chat with RAG & Medical Compliance Guardrails
- /api/stt & /api/tts & /api/voice via Deepgram
- /api/lead with AI lead summary, SQL Server persistence & Google Sheet webhook
- /api/health
"""

import os
import re
import csv
import json
import time
import base64
import io
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Optional, Any

from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, File, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv
import httpx

# Reusable HTTP client with persistent connection pool to eliminate TLS handshake latency
voice_client = httpx.AsyncClient(timeout=10.0, limits=httpx.Limits(max_keepalive_connections=15, max_connections=30))

# Load environment variables
load_dotenv()

from backend.guardrails import (
    check_input_guardrails,
    check_output_guardrails,
    HANDOFF_REPLY_EN,
    HANDOFF_REPLY_UR
)
from backend.rag import rag_engine
from backend.database import db

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b").strip()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "").strip()
DEEPGRAM_STT_MODEL = os.getenv("DEEPGRAM_STT_MODEL", "nova-2").strip()
DEEPGRAM_STT_LANGUAGE = os.getenv("DEEPGRAM_STT_LANGUAGE", "en").strip()
DEEPGRAM_TTS_VOICE = os.getenv("DEEPGRAM_TTS_VOICE", "aura-asteria-en").strip()

SHEET_WEBHOOK_URL = os.getenv("SHEET_WEBHOOK_URL", "").strip()

ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "*").strip()
ALLOWED_ORIGINS = [orig.strip() for orig in ALLOWED_ORIGINS_RAW.split(",") if orig.strip()]

BACKUP_LEADS_FILE = os.path.join(os.path.dirname(__file__), "leads_backup.json")

# FastAPI App
app = FastAPI(
    title="ZaiqaBox Karachi API & Admin Portal",
    description="Backend services for ZaiqaBox Karachi meal subscriptions & Admin management",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if "*" not in ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Rate Limiter
RATE_LIMIT_PER_MINUTE = 90
ip_request_timestamps = defaultdict(list)


@app.middleware("http")
async def rate_limit_and_security_headers(request: Request, call_next):
    # Enforce basic rate limit on /api/ endpoints (excluding admin endpoints from strict limits)
    if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/admin"):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        ip_request_timestamps[client_ip] = [
            t for t in ip_request_timestamps[client_ip] if now - t < 60
        ]
        if len(ip_request_timestamps[client_ip]) >= RATE_LIMIT_PER_MINUTE:
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests. Please slow down and try again shortly."}
            )
        ip_request_timestamps[client_ip].append(now)

    try:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Disable caching for HTML, CSS, JS so frontend updates appear instantly
        if request.url.path == "/" or any(request.url.path.endswith(ext) for ext in [".html", ".css", ".js"]):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response
    except Exception as e:
        print(f"[ERROR] Server error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "An unexpected server error occurred."}
        )


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
    force_english: Optional[bool] = False


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class LeadRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    whatsapp: str = Field(..., min_length=10, max_length=20)
    area: str = Field(..., max_length=50)
    plan: str = Field(..., max_length=100)
    consent: bool = True


class CustomerRegisterRequest(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=50)
    whatsapp: str = Field(..., min_length=10, max_length=20)
    area: str = Field(..., max_length=50)
    officeAddress: Optional[str] = ""


class CustomerLoginRequest(BaseModel):
    email: str
    password: str


class CustomerPauseRequest(BaseModel):
    customerId: int
    action: str = "pause" # "pause" or "resume"


class CustomerAddressRequest(BaseModel):
    customerId: int
    officeAddress: str
    area: str


class CustomerProfileUpdateRequest(BaseModel):
    customerId: int
    fullName: str
    whatsapp: str
    area: str
    officeAddress: str
    profileImage: Optional[str] = None


class ToggleDatePauseRequest(BaseModel):
    customerId: int
    date: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class MenuItemPayload(BaseModel):
    DayOfWeek: str
    Title: str
    Description: str
    Sides: str
    ImageUrl: str
    Rating: float = 4.9
    ReviewsCount: int = 120
    Badge: str = "Chef Special"
    Calories: int = 500
    ProteinGrams: int = 35
    DisplayOrder: int = 1
    IsActive: bool = True


class PlanPayload(BaseModel):
    Name: str
    LunchesCount: int
    Price: float
    PeriodText: str
    Badge: Optional[str] = ""
    Description: str
    features: List[str] = []
    IsPopular: bool = False


class ZonePayload(BaseModel):
    ZoneName: str
    CoverageDetails: str
    IsFree: bool
    DailyFee: float
    TimingWindow: str = "12:30 PM – 1:30 PM"


class FaqPayload(BaseModel):
    Question: str
    Answer: str
    Category: Optional[str] = "General"
    DisplayOrder: Optional[int] = 1


class TestimonialPayload(BaseModel):
    CustomerName: str
    CompanyArea: str
    Rating: Optional[float] = 5.0
    ReviewText: str
    AvatarUrl: Optional[str] = "assets/avatars/avatar1.jpg"
    DisplayOrder: Optional[int] = 1


class LeadUpdatePayload(BaseModel):
    status: str
    notes: Optional[str] = None


class SettingsPayload(BaseModel):
    settings: Dict[str, str]


def sanitize_input(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"<[^>]*>", "", text).strip()


def validate_pakistani_phone(phone: str) -> bool:
    clean = re.sub(r"[\s\-\(\)]", "", phone)
    pattern = r"^(\+92|92|0)?3[0-9]{9}$"
    return bool(re.match(pattern, clean))


def normalize_pakistani_phone(phone: str) -> str:
    clean = re.sub(r"[\s\-\(\)\+]", "", phone)
    if clean.startswith("03"):
        clean = "92" + clean[1:]
    elif clean.startswith("3") and len(clean) == 10:
        clean = "92" + clean
    return clean


# Simple Admin Token check (header Authorization: Bearer zaiqabox-secret-admin-token)
def verify_admin_auth(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized admin access.")
    token = authorization.split(" ")[1]
    if token != "zaiqabox-admin-token-2026":
        raise HTTPException(status_code=403, detail="Invalid admin session token.")
    return True


# ==========================================
# CUSTOMER USER AUTH & PORTAL API
# ==========================================
@app.post("/api/user/register")
async def customer_register(payload: CustomerRegisterRequest):
    name = sanitize_input(payload.fullName)
    email = str(payload.email).strip().lower()
    whatsapp = sanitize_input(payload.whatsapp)
    area = sanitize_input(payload.area)
    address = sanitize_input(payload.officeAddress or "")
    pwd = payload.password

    if not validate_pakistani_phone(whatsapp):
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid Pakistani WhatsApp number (e.g. 03001234567 or +923001234567)."
        )

    norm_whatsapp = normalize_pakistani_phone(whatsapp)
    customer = db.register_customer(name, email, pwd, norm_whatsapp, area, address)
    if not customer:
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please log in.")

    # Generate a lightweight customer session token
    token = f"cust_{customer['Id']}_{int(time.time())}"
    return {
        "status": "success",
        "message": "Account created successfully! Welcome to ZaiqaBox Karachi.",
        "token": token,
        "customer": customer
    }


@app.post("/api/user/login")
async def customer_login(payload: CustomerLoginRequest):
    email = str(payload.email).strip().lower()

    # Automatic unified detection: check if Admin credentials are used
    admin_user = db.verify_admin(email, payload.password)
    if admin_user:
        return {
            "status": "success",
            "role": "admin",
            "redirect": "/admin/index.html",
            "message": "Welcome Admin! Redirecting to Admin Operations Portal...",
            "token": "zaiqabox-admin-token-2026",
            "user": admin_user
        }

    # Verify Customer credentials
    customer = db.login_customer(email, payload.password)
    if not customer:
        raise HTTPException(status_code=401, detail="Invalid email/username or password.")

    token = f"cust_{customer['Id']}_{int(time.time())}"
    return {
        "status": "success",
        "role": "customer",
        "message": f"Welcome back, {customer.get('FullName', 'Customer')}!",
        "token": token,
        "customer": customer
    }


@app.get("/api/user/profile/{customer_id}")
async def customer_profile(customer_id: int):
    profile = db.get_customer_profile(customer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return {"status": "success", "profile": profile}


@app.get("/api/user/calendar/{customer_id}")
async def customer_calendar(customer_id: int):
    data = db.get_customer_calendar(customer_id)
    return {"status": "success", "calendar": data}


@app.post("/api/user/calendar/toggle-pause")
async def toggle_meal_pause(payload: ToggleDatePauseRequest):
    from datetime import datetime, timezone, timedelta
    karachi_tz = timezone(timedelta(hours=5))
    now_karachi = datetime.now(karachi_tz)
    today = now_karachi.date()
    tomorrow = today + timedelta(days=1)
    
    try:
        req_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    if req_date < today:
        raise HTTPException(status_code=400, detail="Cannot pause or change past dates.")
    if req_date == today:
        raise HTTPException(status_code=400, detail="Today's meal is already in kitchen dispatch and cannot be paused.")
    if req_date == tomorrow and now_karachi.hour >= 20:
        raise HTTPException(status_code=400, detail="Cannot pause tomorrow's meal after 8:00 PM cutoff.")
    
    result = db.toggle_customer_date_pause(payload.customerId, payload.date)
    action_text = "paused" if result.get("action") == "paused" else "resumed"
    formatted = req_date.strftime("%A, %d %b")
    
    msg = f"Meal for {formatted} has been {action_text} successfully! Your lunch credits remain safe."
    
    updated_cal = db.get_customer_calendar(payload.customerId)
    return {
        "status": "success",
        "action": result.get("action"),
        "message": msg,
        "calendar": updated_cal
    }


@app.post("/api/user/pause")
async def customer_pause(payload: CustomerPauseRequest):
    # Enforce 8:00 PM cutoff awareness
    if payload.action == "pause":
        db.pause_customer_subscription(payload.customerId)
        msg = "Your lunch delivery has been paused. Paused meal credit has rolled forward to extend your plan."
    else:
        db.resume_customer_subscription(payload.customerId)
        msg = "Your lunch delivery subscription has been resumed!"

    return {"status": "success", "message": msg}


@app.post("/api/user/update-address")
async def customer_update_address(payload: CustomerAddressRequest):
    addr = sanitize_input(payload.officeAddress)
    area = sanitize_input(payload.area)
    db.update_customer_address(payload.customerId, addr, area)
    return {"status": "success", "message": "Delivery address updated for upcoming lunches."}


@app.post("/api/user/update-profile")
async def customer_update_profile(payload: CustomerProfileUpdateRequest):
    name = sanitize_input(payload.fullName)
    whatsapp = sanitize_input(payload.whatsapp)
    area = sanitize_input(payload.area)
    address = sanitize_input(payload.officeAddress)
    profile_img = payload.profileImage

    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Please enter a valid full name.")
    if not validate_pakistani_phone(whatsapp):
        raise HTTPException(status_code=400, detail="Please provide a valid Pakistani phone/WhatsApp number.")

    updated_customer = db.update_customer_profile(
        customer_id=payload.customerId,
        full_name=name,
        whatsapp=whatsapp,
        area=area,
        office_address=address,
        profile_image=profile_img
    )
    if not updated_customer:
        raise HTTPException(status_code=404, detail="Customer account not found.")

    return {
        "status": "success",
        "message": "Profile updated successfully!",
        "customer": updated_customer
    }


# ==========================================
# PUBLIC SITE DYNAMIC DATA
# ==========================================
@app.get("/api/site/data")
async def get_site_data():
    """Returns dynamic menu, plans, delivery zones, faqs, testimonials, video, and settings from database."""
    data = db.get_public_site_data()
    data["promo_video"] = {
        "src": "assets/videos/zaikabox_kitchen.mp4",
        "poster": "assets/videos/kitchen_poster.jpg",
        "title": "Fresh Daily Preparation in Karachi (Low Oil & Pure Spices)"
    }
    return data


# ==========================================
# ADMIN AUTH & STATS
# ==========================================
@app.post("/api/admin/login")
async def admin_login(payload: AdminLoginRequest):
    user = db.verify_admin(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {
        "status": "success",
        "token": "zaiqabox-admin-token-2026",
        "user": user
    }


@app.get("/api/admin/verify")
async def admin_verify(auth: bool = Depends(verify_admin_auth)):
    return {"status": "valid"}


@app.get("/api/admin/stats")
async def admin_stats(auth: bool = Depends(verify_admin_auth)):
    return db.get_admin_stats()


# ==========================================
# ADMIN MENU CRUD
# ==========================================
@app.get("/api/admin/menu")
async def get_admin_menu(auth: bool = Depends(verify_admin_auth)):
    return db.get_menu_items()


@app.post("/api/admin/menu")
async def add_admin_menu_item(item: MenuItemPayload, auth: bool = Depends(verify_admin_auth)):
    db.add_menu_item(item.dict())
    return {"status": "success", "message": "Dish added successfully"}


@app.put("/api/admin/menu/{item_id}")
async def update_admin_menu_item(item_id: int, item: MenuItemPayload, auth: bool = Depends(verify_admin_auth)):
    db.update_menu_item(item_id, item.dict())
    return {"status": "success", "message": "Dish updated successfully"}


@app.delete("/api/admin/menu/{item_id}")
async def delete_admin_menu_item(item_id: int, auth: bool = Depends(verify_admin_auth)):
    db.delete_menu_item(item_id)
    return {"status": "success", "message": "Dish removed successfully"}


@app.post("/api/admin/menu/upload-image")
async def upload_menu_image(file: UploadFile = File(...), auth: bool = Depends(verify_admin_auth)):
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "assets", "menu"))
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"custom_{int(time.time())}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    return {"status": "success", "image_url": f"assets/menu/{filename}"}


# ==========================================
# ADMIN PLANS CRUD
# ==========================================
@app.get("/api/admin/plans")
async def get_admin_plans(auth: bool = Depends(verify_admin_auth)):
    return db.get_plans()


@app.post("/api/admin/plans")
async def add_admin_plan(payload: PlanPayload, auth: bool = Depends(verify_admin_auth)):
    plan_id = db.add_plan(payload.dict())
    return {"status": "success", "message": "Plan added successfully", "id": plan_id}


@app.put("/api/admin/plans/{plan_id}")
async def update_admin_plan(plan_id: int, payload: PlanPayload, auth: bool = Depends(verify_admin_auth)):
    db.update_plan(plan_id, payload.dict())
    return {"status": "success", "message": "Plan updated successfully"}


@app.delete("/api/admin/plans/{plan_id}")
async def delete_admin_plan(plan_id: int, auth: bool = Depends(verify_admin_auth)):
    db.delete_plan(plan_id)
    return {"status": "success", "message": "Plan deleted successfully"}


# ==========================================
# ADMIN DELIVERY ZONES CRUD
# ==========================================
@app.get("/api/admin/delivery")
async def get_admin_delivery(auth: bool = Depends(verify_admin_auth)):
    return db.get_delivery_zones()


@app.post("/api/admin/delivery")
async def add_admin_zone(payload: ZonePayload, auth: bool = Depends(verify_admin_auth)):
    zone_id = db.add_delivery_zone(payload.dict())
    return {"status": "success", "message": "Delivery zone added", "id": zone_id}


@app.put("/api/admin/delivery/{zone_id}")
async def update_admin_zone(zone_id: int, payload: ZonePayload, auth: bool = Depends(verify_admin_auth)):
    db.update_delivery_zone(zone_id, payload.dict())
    return {"status": "success", "message": "Delivery zone updated"}


@app.delete("/api/admin/delivery/{zone_id}")
async def delete_admin_zone(zone_id: int, auth: bool = Depends(verify_admin_auth)):
    db.delete_delivery_zone(zone_id)
    return {"status": "success", "message": "Delivery zone deleted"}


# ==========================================
# ADMIN FAQS CRUD
# ==========================================
@app.get("/api/admin/faqs")
async def get_admin_faqs(auth: bool = Depends(verify_admin_auth)):
    return db.get_faqs()


@app.post("/api/admin/faqs")
async def add_admin_faq(payload: FaqPayload, auth: bool = Depends(verify_admin_auth)):
    faq_id = db.add_faq(payload.dict())
    return {"status": "success", "message": "FAQ added successfully", "id": faq_id}


@app.put("/api/admin/faqs/{faq_id}")
async def update_admin_faq(faq_id: int, payload: FaqPayload, auth: bool = Depends(verify_admin_auth)):
    db.update_faq(faq_id, payload.dict())
    return {"status": "success", "message": "FAQ updated successfully"}


@app.delete("/api/admin/faqs/{faq_id}")
async def delete_admin_faq(faq_id: int, auth: bool = Depends(verify_admin_auth)):
    db.delete_faq(faq_id)
    return {"status": "success", "message": "FAQ deleted successfully"}


# ==========================================
# ADMIN TESTIMONIALS / REVIEWS CRUD
# ==========================================
@app.get("/api/admin/testimonials")
async def get_admin_testimonials(auth: bool = Depends(verify_admin_auth)):
    return db.get_testimonials()


@app.post("/api/admin/testimonials")
async def add_admin_testimonial(payload: TestimonialPayload, auth: bool = Depends(verify_admin_auth)):
    test_id = db.add_testimonial(payload.dict())
    return {"status": "success", "message": "Testimonial added successfully", "id": test_id}


@app.put("/api/admin/testimonials/{test_id}")
async def update_admin_testimonial(test_id: int, payload: TestimonialPayload, auth: bool = Depends(verify_admin_auth)):
    db.update_testimonial(test_id, payload.dict())
    return {"status": "success", "message": "Testimonial updated successfully"}


@app.delete("/api/admin/testimonials/{test_id}")
async def delete_admin_testimonial(test_id: int, auth: bool = Depends(verify_admin_auth)):
    db.delete_testimonial(test_id)
    return {"status": "success", "message": "Testimonial deleted successfully"}


# ==========================================
# ADMIN LEADS MANAGEMENT
# ==========================================
@app.get("/api/admin/leads")
async def get_admin_leads(auth: bool = Depends(verify_admin_auth)):
    return db.get_leads()


@app.put("/api/admin/leads/{lead_id}")
async def update_lead_status(lead_id: int, payload: LeadUpdatePayload, auth: bool = Depends(verify_admin_auth)):
    db.update_lead(lead_id, payload.status, payload.notes)
    return {"status": "success", "message": "Lead status updated"}


@app.delete("/api/admin/leads/{lead_id}")
async def delete_admin_lead(lead_id: int, auth: bool = Depends(verify_admin_auth)):
    db.delete_lead(lead_id)
    return {"status": "success", "message": "Lead deleted successfully"}
    db.update_lead(lead_id, payload.status, payload.notes)
    return {"status": "success", "message": "Lead status updated"}


@app.get("/api/admin/leads/export-csv")
async def export_leads_csv(auth: bool = Depends(verify_admin_auth)):
    leads = db.get_leads()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "Name", "Email", "WhatsApp", "Area", "Plan", "AI Summary", "Status", "Notes"])
    for l in leads:
        writer.writerow([
            l.get("Id"), l.get("Timestamp"), l.get("Name"), l.get("Email"),
            l.get("WhatsApp"), l.get("Area"), l.get("Plan"), l.get("AiSummary"),
            l.get("Status"), l.get("Notes")
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ZaiqaBox_Leads_Export.csv"}
    )


# ==========================================
# ADMIN SETTINGS
# ==========================================
@app.get("/api/admin/settings")
async def get_admin_settings(auth: bool = Depends(verify_admin_auth)):
    return db.get_settings()


@app.put("/api/admin/settings")
async def update_admin_settings(payload: SettingsPayload, auth: bool = Depends(verify_admin_auth)):
    db.update_settings(payload.settings)
    return {"status": "success", "message": "Settings saved successfully"}


def is_roman_urdu(text: str) -> bool:
    if not text:
        return False
    lower = text.lower().strip()
    
    # Distinct Roman Urdu phrases that NEVER occur in English
    distinct_urdu_phrases = [
        "kya hai", "kya hy", "kya he", "kitna hai", "kitne ka", "kitnay ka", "kahan deliver",
        "kaise karein", "kaise karo", "batao", "batayein", "bataiye", "chahiye", "mangwana hai",
        "order karna", "paise kitne", "kitne rupay", "khana kaisa", "salam", "assalam", "bhai",
        "shukriya", "chutti hai", "theek hai", "nahi chahiye", "kaun sa", "kab ayega", "kab aayega",
        "baat karni", "baat karna", "bande se", "insan se"
    ]
    if any(p in lower for p in distinct_urdu_phrases):
        return True

    # Single-word Roman Urdu markers (strictly Urdu, NO English collision)
    urdu_markers = {
        "kya", "hain", "hoga", "hogi", "bhai", "kitna", "kitne", "kitni", "kitnay",
        "kaise", "kahan", "kider", "kidhar", "bolo", "batayein", "batao", "bataiye",
        "nahi", "chahiye", "dedo", "hafta", "mahina", "paise", "rupay", "mujhe",
        "shukriya", "theek", "chutti", "roti", "salan", "daal", "sabzi", "bhejo",
        "mangwana", "aapka", "humara", "tumhara", "khana", "baat", "karni", "bande", "insan"
    }
    words = set(re.findall(r'\b[a-z]+\b', lower))
    matches = len(words.intersection(urdu_markers))
    
    # Require at least 2 distinct Urdu words to avoid false positives on English sentences
    return matches >= 2


# ==========================================
# CHATBOT ENDPOINT (Groq + RAG + Guardrails)
# ==========================================
@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest):
    user_msg = sanitize_input(payload.message)
    if not user_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    user_is_urdu = False if payload.force_english else is_roman_urdu(user_msg)

    # STEP 1: Guardrail check
    is_blocked, handoff_reply, detected_reason = check_input_guardrails(user_msg)
    if is_blocked:
        audio_b64 = ""
        if DEEPGRAM_API_KEY:
            try:
                url = f"https://api.deepgram.com/v1/speak?model={DEEPGRAM_TTS_VOICE}"
                headers = {
                    "Authorization": f"Token {DEEPGRAM_API_KEY}",
                    "Content-Type": "application/json"
                }
                body = {"text": handoff_reply[:180]}
                tts_res = await voice_client.post(url, headers=headers, json=body)
                if tts_res.status_code == 200:
                    audio_b64 = base64.b64encode(tts_res.content).decode("utf-8")
            except Exception as e:
                print(f"[Guardrail TTS Error] {e}")

        return {
            "reply": handoff_reply,
            "handoff": True,
            "sources": [],
            "reason": f"Medical/Dietary guardrail triggered ({detected_reason})",
            "audio_base64": audio_b64
        }

    # STEP 1.5: Human Agent / Support Request Handoff
    human_keywords = [
        "human", "representative", "live agent", "real person", "person", "support",
        "customer care", "customer support", "call me", "call", "agent", "talk to human",
        "talk to a human", "talk to someone", "speak to someone", "banda", "banday",
        "insan", "baat karni", "rabta"
    ]
    lower_msg = user_msg.lower()
    is_human_request = (
        any(re.search(rf"\b{re.escape(k)}\b", lower_msg) for k in ["human", "representative", "agent", "support"]) or
        any(phrase in lower_msg for phrase in ["talk to", "speak to", "connect me", "customer care", "call me", "bande se", "insan se", "baat karni"]) or
        lower_msg.strip() in ["human", "talk to human", "talk to a human", "agent", "support", "call"]
    )
    if is_human_request:
        if user_is_urdu:
            human_reply = "Aap humare team member se direct WhatsApp par +92 337 8034564 par baat kar sakte hain ya neeche diye gaye button par click karein."
        else:
            human_reply = "I would be glad to connect you with our human team! You can chat directly with us on WhatsApp at +92 337 8034564, or click the WhatsApp button below."

        audio_b64 = ""
        if DEEPGRAM_API_KEY:
            try:
                url = f"https://api.deepgram.com/v1/speak?model={DEEPGRAM_TTS_VOICE}"
                headers = {
                    "Authorization": f"Token {DEEPGRAM_API_KEY}",
                    "Content-Type": "application/json"
                }
                body = {"text": human_reply[:180]}
                tts_res = await voice_client.post(url, headers=headers, json=body)
                if tts_res.status_code == 200:
                    audio_b64 = base64.b64encode(tts_res.content).decode("utf-8")
            except Exception as e:
                print(f"[Human TTS Error] {e}")

        return {
            "reply": human_reply,
            "handoff": True,
            "sources": ["customer_support"],
            "audio_base64": audio_b64
        }

    # STEP 2: RAG retrieval
    top_chunks = rag_engine.search(user_msg, top_k=3)
    sources = list(set(c["source"] for c in top_chunks))
    context_str = "\n\n".join([f"[{c['heading']}]: {c['content']}" for c in top_chunks])

    # STEP 3: LLM generation
    if user_is_urdu:
        lang_rule = (
            "LANGUAGE RULE (MANDATORY):\n"
            "- The user asked in Roman Urdu / Roman English.\n"
            "- You MUST reply strictly in polite, natural Roman Urdu (e.g. 'ZaiqaBox ka Weekly plan PKR 3,500 ka hai...').\n"
            "- Do NOT reply in English.\n"
            "- Keep your answer very concise (1 to 2 spoken sentences, maximum 25 words) so voice replies are fast.\n"
            "- Do not use any markdown formatting or asterisks."
        )
    else:
        lang_rule = (
            "LANGUAGE RULE (MANDATORY):\n"
            "- The user asked in English.\n"
            "- You MUST reply strictly in clear, professional English.\n"
            "- Do NOT reply in Urdu.\n"
            "- Keep your answer very concise (1 to 2 spoken sentences, maximum 25 words) so voice replies are fast.\n"
            "- Do not use any markdown formatting or asterisks."
        )

    system_prompt = (
        "You are 'ZaiqaBox AI', the lightning-fast voice assistant of ZaiqaBox Karachi.\n"
        f"{lang_rule}\n\n"
        "KEY FACTS:\n"
        "- Weekly Trial: 5 lunches, PKR 3,500 (Mon-Fri).\n"
        "- Monthly Executive: 20 lunches, PKR 12,500 (4 weeks).\n"
        "- Delivery: 100% Free in DHA, Clifton & PECHS (12:30 PM - 1:30 PM). Outside areas: PKR 200/day.\n"
        "- Pause: WhatsApp us before 8:00 PM prior to pause meal or change address.\n"
        "- Food: Fresh, nutritionist-reviewed home-cooked meals (Chicken Tikka, Daal Palak, Fish, Handi).\n"
        "- Compliance: No medical or diabetic cure claims.\n\n"
        f"Context:\n{context_str}"
    )

    llm_reply = ""
    if GROQ_API_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)
            messages = [{"role": "system", "content": system_prompt}]
            if payload.history:
                for h in payload.history[-4:]:
                    r = h.get("role", "user")
                    c = sanitize_input(h.get("content", ""))
                    if r in ["user", "assistant"] and c:
                        messages.append({"role": r, "content": c})
            messages.append({"role": "user", "content": user_msg})

            completion = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=90
            )
            llm_reply = completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"[Groq Error] {e}")

    # Fallback if Groq unavailable - matching EXACT language
    if not llm_reply:
        lower_msg = user_msg.lower()
        if user_is_urdu:
            if any(w in lower_msg for w in ["human", "insan", "banda", "baat", "call", "agent", "whatsapp"]):
                llm_reply = "Aap humare team member se direct WhatsApp par +92 337 8034564 par baat kar sakte hain."
            elif any(w in lower_msg for w in ["weekly", "hafta", "trial"]):
                llm_reply = "ZaiqaBox ka Weekly Trial plan PKR 3,500 ka hai jisme 5 fresh lunches Clifton, DHA aur PECHS me free deliver hotay hain."
            elif any(w in lower_msg for w in ["monthly", "month", "executive", "mahina"]):
                llm_reply = "Monthly Executive plan 20 lunches ke liye PKR 12,500 ka hai, pure mahine Monday se Friday delivery hoti hai."
            elif any(w in lower_msg for w in ["price", "cost", "kitna", "rates", "package", "plan", "paise", "deal", "deals", "offer"]):
                llm_reply = "Humare do plans hain: Weekly Trial PKR 3,500 aur Monthly Executive PKR 12,500. Clifton, DHA aur PECHS me delivery free hai."
            elif any(w in lower_msg for w in ["kahan", "delivery", "area", "gulshan", "pechs", "clifton", "dha"]):
                llm_reply = "DHA, Clifton aur PECHS me delivery bilkul free hai 12:30 se 1:30 PM ke darmiyan. Dusre ilaqon ke liye 200 rupay delivery charge hai."
            elif any(w in lower_msg for w in ["pause", "chutti", "cancel", "address"]):
                llm_reply = "Aap raat 8 baje se pehle humein WhatsApp par message karke lunch pause ya address change kar sakte hain, credits roll over ho jatay hain."
            elif any(w in lower_msg for w in ["menu", "khana", "salan", "dishes"]):
                llm_reply = "Humare menu me Chicken Tikka Bowl (Mon), Daal Palak (Tue), Chicken Handi (Wed), Chana Medley (Thu), aur Grilled Fish (Fri) shamil hain."
            else:
                llm_reply = "ZaiqaBox offers Weekly Trial (PKR 3,500 for 5 lunches) and Monthly Executive (PKR 12,500 for 20 lunches). Delivery is free in Clifton, DHA and PECHS."
        else:
            if any(w in lower_msg for w in ["human", "person", "representative", "agent", "support", "talk to", "call"]):
                llm_reply = "I would be glad to connect you with our human team! You can chat directly with us on WhatsApp at +92 337 8034564."
            elif any(w in lower_msg for w in ["pause", "change", "address", "skip", "tomorrow"]):
                llm_reply = "You can easily pause your lunch subscription or update your delivery address before 8:00 PM the night prior via WhatsApp."
            elif any(w in lower_msg for w in ["weekly", "trial"]):
                llm_reply = "The Weekly Trial plan is PKR 3,500 for 5 fresh lunches (Mon-Fri) with free delivery in DHA, Clifton, and PECHS."
            elif any(w in lower_msg for w in ["monthly", "executive"]):
                llm_reply = "The Monthly Executive plan is PKR 12,500 for 20 lunches across 4 weeks with free delivery in DHA, Clifton, and PECHS."
            elif any(w in lower_msg for w in ["price", "cost", "rates", "plan", "package", "deal", "deals", "offer", "discount"]):
                llm_reply = "ZaiqaBox offers the Weekly Trial plan (5 lunches at PKR 3,500) and Monthly Executive plan (20 lunches at PKR 12,500) with free delivery in DHA, Clifton & PECHS."
            elif any(w in lower_msg for w in ["delivery", "area", "timing", "gulshan"]):
                llm_reply = "Delivery is 100% free across DHA, Clifton, and PECHS between 12:30 PM and 1:30 PM. Outside zones like Gulshan have a PKR 200/day delivery surcharge."
            elif any(w in lower_msg for w in ["menu", "food", "dishes", "eating"]):
                llm_reply = "Our weekly menu rotation features: Chicken Tikka Bowl (Mon), Daal Palak (Tue), Chicken Handi (Wed), Chana Medley (Thu), and Grilled Fish (Fri)."
            else:
                llm_reply = "ZaiqaBox Karachi delivers fresh, portion-controlled corporate lunches across Clifton, DHA, and PECHS. Our Weekly Trial is PKR 3,500 and Monthly Executive is PKR 12,500."

    # STEP 4: Post-check output guardrails
    is_violated, sanitized_reply = check_output_guardrails(llm_reply)

    # Generate speech audio for natural voice output (single generation!)
    audio_b64 = ""
    if DEEPGRAM_API_KEY and sanitized_reply:
        try:
            url = f"https://api.deepgram.com/v1/speak?model={DEEPGRAM_TTS_VOICE}"
            headers = {
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": "application/json"
            }
            # Fast speech synthesis: synthesize first clean sentence to keep voice response sub-second
            clean_speech = re.sub(r'[*_#`~]', '', sanitized_reply).strip()
            if payload.force_english and "." in clean_speech:
                clean_speech = clean_speech.split(".")[0].strip() + "."
            clean_speech = clean_speech[:180]
            body = {"text": clean_speech}
            tts_res = await voice_client.post(url, headers=headers, json=body)
            if tts_res.status_code == 200:
                audio_b64 = base64.b64encode(tts_res.content).decode("utf-8")
        except Exception as e:
            print(f"[Chat TTS Error] {e}")

    return {
        "reply": sanitized_reply,
        "handoff": is_violated,
        "sources": sources,
        "audio_base64": audio_b64
    }


# ==========================================
# SPEECH-TO-TEXT & TEXT-TO-SPEECH
# ==========================================
@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file received.")

    transcript = ""
    if DEEPGRAM_API_KEY:
        try:
            url = f"https://api.deepgram.com/v1/listen?model={DEEPGRAM_STT_MODEL}&detect_language=true&smart_format=true"
            headers = {
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": file.content_type or "audio/webm"
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, content=audio_bytes)
                if res.status_code == 200:
                    data = res.json()
                    channels = data.get("results", {}).get("channels", [])
                    if channels and channels[0].get("alternatives"):
                        transcript = channels[0]["alternatives"][0].get("transcript", "").strip()
        except Exception as e:
            print(f"[Deepgram STT Exception] {e}")

    if not transcript:
        transcript = "Weekly plan price?"

    return {"transcript": transcript}


@app.post("/api/tts")
async def text_to_speech(payload: TTSRequest):
    text = sanitize_input(payload.text)
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    if len(text) > 500:
        text = text[:500]

    if DEEPGRAM_API_KEY:
        try:
            url = f"https://api.deepgram.com/v1/speak?model={DEEPGRAM_TTS_VOICE}"
            headers = {
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": "application/json"
            }
            body = {"text": text}
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=body)
                if res.status_code == 200:
                    return Response(content=res.content, media_type="audio/mpeg")
        except Exception as e:
            print(f"[Deepgram TTS Exception] {e}")

    return Response(status_code=204)


@app.post("/api/voice")
async def voice_assistant(file: UploadFile = File(...), transcript_hint: Optional[str] = Form(None)):
    audio_bytes = await file.read()
    transcript = (transcript_hint or "").strip()

    # Transcribe audio using Deepgram if not already provided by browser
    if not transcript and DEEPGRAM_API_KEY and audio_bytes:
        try:
            url = f"https://api.deepgram.com/v1/listen?model={DEEPGRAM_STT_MODEL}&smart_format=true&keywords=deal:2&keywords=end call:3&keywords=call end:3&keywords=hang up:3&keywords=hello:2&keywords=kya:2&keywords=lunch:2&keywords=plan:2&keywords=price:2"
            headers = {
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": file.content_type or "audio/webm"
            }
            res = await voice_client.post(url, headers=headers, content=audio_bytes)
            if res.status_code == 200:
                data = res.json()
                channels = data.get("results", {}).get("channels", [])
                if channels and channels[0].get("alternatives"):
                    transcript = channels[0]["alternatives"][0].get("transcript", "").strip()
        except Exception as e:
            print(f"[Voice STT Error] {e}")

    # Check if user spoke a command to end the call
    lower_transcript = transcript.lower()
    end_call_patterns = [
        r"\bend\s*(the\s*)?call\b",
        r"\bcall\s*end\b",
        r"\bhang\s*up\b",
        r"\bclose\s*(the\s*)?call\b",
        r"\bstop\s*(the\s*)?call\b",
        r"\bdisconnect\s*(the\s*)?call\b",
        r"\bcall\s*kat\s*(do|dein|karo)?\b",
        r"\bcall\s*band\s*(karo|kardein|kar\s*do)?\b",
        r"\bband\s*karo\b",
        r"\bcall\s*khatam\b",
        r"\bgood\s*bye\b",
        r"\bbye\s*bye\b"
    ]
    if any(re.search(p, lower_transcript) for p in end_call_patterns) or lower_transcript in ["end call", "hang up", "bye", "goodbye"]:
        return {
            "transcript": transcript,
            "reply": "Call ended. Thank you for calling ZaiqaBox Karachi!",
            "end_call": True,
            "handoff": False,
            "sources": [],
            "audio_base64": ""
        }

    if not transcript:
        transcript = "What are the lunch plans and deals for ZaiqaBox Karachi?"

    # Voice assistant responds strictly in English quickly
    chat_result = await chat_endpoint(ChatRequest(message=transcript, history=[], force_english=True))
    reply = chat_result.get("reply", "")
    handoff = chat_result.get("handoff", False)
    sources = chat_result.get("sources", [])
    audio_b64 = chat_result.get("audio_base64", "")

    return {
        "transcript": transcript,
        "reply": reply,
        "handoff": handoff,
        "sources": sources,
        "audio_base64": audio_b64
    }


# ==========================================
# LEAD CAPTURE (Database + Sheets + Backup)
# ==========================================
@app.post("/api/lead")
async def capture_lead(payload: LeadRequest):
    name = sanitize_input(payload.name)
    whatsapp = sanitize_input(payload.whatsapp)
    area = sanitize_input(payload.area)
    plan = sanitize_input(payload.plan)
    email = str(payload.email).strip().lower()

    if not validate_pakistani_phone(whatsapp):
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid Pakistani WhatsApp number (e.g. 03001234567 or +923001234567)."
        )

    norm_whatsapp = normalize_pakistani_phone(whatsapp)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Generate 1-line AI summary with strict compliance
    ai_summary = f"Corporate lead from {area} interested in {plan} plan, wants WhatsApp contact."
    if GROQ_API_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)
            prompt = (
                f"Write a single concise sentence summarizing this corporate lead: Name: {name}, Area: {area}, "
                f"Plan: {plan}, WhatsApp: {norm_whatsapp}. "
                "STRICT RULE: Never make or mention any medical, diabetic, or weight-loss claims."
            )
            completion = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=80
            )
            generated_summary = completion.choices[0].message.content.strip()
            is_bad, _ = check_output_guardrails(generated_summary)
            if not is_bad and len(generated_summary) < 200:
                ai_summary = generated_summary
        except Exception as e:
            print(f"[Groq Lead Summary Error] {e}")

    lead_data = {
        "timestamp": timestamp,
        "name": name,
        "email": email,
        "whatsapp": norm_whatsapp,
        "area": area,
        "plan": plan,
        "ai_summary": ai_summary,
        "source": "Website Lead Form",
        "status": "New"
    }

    # 1. Save directly into SQL Server / SQLite database
    try:
        db.insert_lead(lead_data)
        print("[DB] Lead saved to database successfully.")
    except Exception as e:
        print(f"[DB Lead Error] {e}")

    # 2. Send dual email notifications: (1) Admin alert email, (2) User confirmation & guide email
    try:
        from backend.email_service import send_dual_lead_emails
        email_status = await send_dual_lead_emails(lead_data)
        print(f"[Lead Email Dispatch] Result: {email_status}")
    except Exception as e:
        print(f"[Lead Email Service Exception] {e}")

    # 3. Post to Google Sheets Webhook
    sheet_success = False
    if SHEET_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                res = await client.post(SHEET_WEBHOOK_URL, json=lead_data)
                if res.status_code in [200, 201, 302]:
                    sheet_success = True
        except Exception as e:
            print(f"[Google Sheet Exception] {e}")

    # 4. Fallback: Save to local leads_backup.json
    try:
        existing_leads = []
        if os.path.exists(BACKUP_LEADS_FILE):
            with open(BACKUP_LEADS_FILE, "r", encoding="utf-8") as f:
                try:
                    existing_leads = json.load(f)
                except Exception:
                    existing_leads = []
        lead_entry = lead_data.copy()
        lead_entry["sheet_synced"] = sheet_success
        existing_leads.append(lead_entry)
        with open(BACKUP_LEADS_FILE, "w", encoding="utf-8") as f:
            json.dump(existing_leads, f, indent=2)
    except Exception as e:
        print(f"[Leads Backup Error] {e}")

    return {
        "status": "success",
        "message": "Thank you! Your lead has been received. Your guide is ready.",
        "download_url": "/assets/office_lunch_guide.pdf",
        "ai_summary": ai_summary
    }


# ==========================================
# HEALTH ENDPOINT
# ==========================================
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ZaiqaBox Karachi API & Admin Portal",
        "timestamp": datetime.now().isoformat(),
        "database_engine": "Microsoft SQL Server (SSMS / ZaiqaBoxDB)" if db.use_sql_server else "SQLite Local",
        "sql_server_connected": db.use_sql_server,
        "rag_chunks_indexed": len(rag_engine.chunks),
        "groq_configured": bool(GROQ_API_KEY),
        "deepgram_configured": bool(DEEPGRAM_API_KEY),
        "sheet_configured": bool(SHEET_WEBHOOK_URL)
    }


# ==========================================
# STATIC FILE MOUNTS
# ==========================================
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
admin_dir = os.path.join(frontend_dir, "admin")
assets_dir = os.path.join(frontend_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

if os.path.exists(admin_dir):
    app.mount("/admin", StaticFiles(directory=admin_dir, html=True), name="admin")

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
