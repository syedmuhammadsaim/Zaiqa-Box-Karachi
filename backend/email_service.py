"""
ZaiqaBox Karachi - Automated Email Notification Service
Sends automated branded HTML emails to:
1. The Admin (zaiqaboxkarachi@gmail.com - Instant lead alert with client details, plan, area, WhatsApp 1-click link)
2. The Customer (Lead confirmation, meal rotation & nutrition guide download, WhatsApp direct link)
"""

import os
import smtplib
import json
import asyncio
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

EMAIL_LOGS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "sent_emails_log.json")


def get_smtp_config() -> Dict[str, Any]:
    # Always reload to pick up any updates from .env or admin panel
    load_dotenv(override=True)
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com").strip(),
        "port": int(os.getenv("SMTP_PORT", 587)),
        "user": os.getenv("SMTP_USER", "zaiqaboxkarachi@gmail.com").strip(),
        "password": os.getenv("SMTP_PASSWORD", "").strip(),
        "from_email": os.getenv("SMTP_FROM_EMAIL", "zaiqaboxkarachi@gmail.com").strip(),
        "admin_email": os.getenv("ADMIN_NOTIFICATION_EMAIL", "zaiqaboxkarachi@gmail.com").strip()
    }


def _log_email_to_file(to_email: str, subject: str, email_type: str, lead_data: Dict[str, Any], sent_via_smtp: bool, status_msg: str = None):
    try:
        os.makedirs(os.path.dirname(EMAIL_LOGS_FILE), exist_ok=True)
        logs = []
        if os.path.exists(EMAIL_LOGS_FILE):
            try:
                with open(EMAIL_LOGS_FILE, "r", encoding="utf-8") as f:
                    logs = json.load(f)
            except Exception:
                logs = []
        logs.append({
            "timestamp": datetime.now().isoformat(),
            "to": to_email,
            "subject": subject,
            "type": email_type,
            "sent_via_smtp": sent_via_smtp,
            "status": status_msg,
            "lead_name": lead_data.get("name"),
            "lead_plan": lead_data.get("plan"),
            "lead_area": lead_data.get("area"),
            "lead_whatsapp": lead_data.get("whatsapp")
        })
        with open(EMAIL_LOGS_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        print(f"[Email Log Error] {e}")


def _send_smtp_html(to_email: str, subject: str, html_content: str) -> Tuple[bool, str]:
    cfg = get_smtp_config()
    if not cfg["user"] or not cfg["password"]:
        note = "SMTP_PASSWORD not set in .env. Logged to sent_emails_log.json. To send live to inboxes, add 16-character Google App Password in .env"
        print(f"[Email Notice] {note}")
        return False, note

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"ZaiqaBox Karachi <{cfg['from_email'] or cfg['user']}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=12) as server:
            server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(msg["From"], [to_email], msg.as_string())
        return True, "Delivered successfully via SMTP"
    except Exception as e:
        err_msg = str(e)
        print(f"[SMTP Send Exception] Failed sending to {to_email}: {err_msg}")
        return False, err_msg


def build_customer_email_html(lead_data: Dict[str, Any]) -> str:
    name = lead_data.get("name", "Valued Professional")
    plan = lead_data.get("plan", "Weekly Trial")
    area = lead_data.get("area", "Karachi Corporate Hub")
    wa_url = f"https://wa.me/923001234567?text=Hi%20ZaiqaBox!%20My%20name%20is%20{name}.%20I%20just%20filled%20the%20form%20for%20the%20{plan}.%20Please%20confirm%20my%20delivery%20details."

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF5EC; margin: 0; padding: 20px; color: #140C07; }}
        .email-container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(20, 12, 7, 0.08); border: 1px solid #EADBCE; }}
        .email-header {{ background: #140C07; padding: 28px 24px; text-align: center; border-bottom: 3px solid #F5A623; }}
        .header-title {{ color: #F5A623; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 0.5px; }}
        .header-sub {{ color: #FAF5EC; font-size: 13px; margin-top: 6px; letter-spacing: 0.3px; }}
        .email-body {{ padding: 30px 24px; line-height: 1.6; font-size: 15px; }}
        .highlight-box {{ background: #FAF5EC; border-left: 4px solid #2E7D32; border-radius: 6px; padding: 16px 18px; margin: 20px 0; }}
        .btn-wa {{ display: inline-block; background: #25D366; color: #FFFFFF !important; text-decoration: none; font-weight: bold; padding: 14px 26px; border-radius: 30px; font-size: 15px; margin-top: 15px; }}
        .btn-guide {{ display: inline-block; background: #F5A623; color: #140C07 !important; text-decoration: none; font-weight: bold; padding: 12px 22px; border-radius: 30px; font-size: 14px; margin-top: 10px; margin-right: 10px; }}
        .footer {{ background: #140C07; color: #94A3B8; padding: 20px 24px; font-size: 12px; text-align: center; line-height: 1.5; }}
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <div class="header-title">🍱 ZaiqaBox Karachi</div>
          <div class="header-sub">Fresh, Home-Cooked Corporate Lunch Subscriptions</div>
        </div>
        <div class="email-body">
          <p>Dear <strong>{name}</strong>,</p>
          <p>Thank you for submitting your request for a fresh, home-cooked corporate lunch subscription with <strong>ZaiqaBox Karachi</strong>!</p>
          
          <div class="highlight-box">
            <h4 style="margin: 0 0 10px 0; color: #140C07;">📋 Your Selected Plan & Delivery Details:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Interested Plan:</strong> {plan}</li>
              <li><strong>Office Location:</strong> {area} (Free Delivery in DHA, Clifton & PECHS)</li>
              <li><strong>Delivery Window:</strong> 12:30 PM – 1:30 PM (Mon – Fri)</li>
              <li><strong>Pause Flexibility:</strong> Pause anytime before 8:00 PM prior; credits roll over!</li>
            </ul>
          </div>

          <p>We have attached our complimentary corporate guide to help you fuel your workday with nutrition-dense, balanced meals.</p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="http://127.0.0.1:8000/assets/office_lunch_guide.pdf" class="btn-guide">📥 Download Nutrition Guide (PDF)</a>
            <br><br>
            <a href="{wa_url}" class="btn-wa">💬 Confirm Delivery on WhatsApp</a>
          </div>

          <p style="font-size: 14px; color: #64748B;">
            If you have any specific dietary preferences or questions, our team is directly available on WhatsApp at <a href="https://wa.me/923001234567" style="color: #2E7D32; font-weight: bold;">+92 300 1234567</a> or reply to <a href="mailto:zaiqaboxkarachi@gmail.com">zaiqaboxkarachi@gmail.com</a>.
          </p>
        </div>
        <div class="footer">
          &copy; 2026 ZaiqaBox Karachi &bull; Clifton, DHA &amp; PECHS<br>
          Fresh, portion-controlled corporate lunches delivered straight to your office desk.
        </div>
      </div>
    </body>
    </html>
    """


def build_admin_alert_html(lead_data: Dict[str, Any]) -> str:
    name = lead_data.get("name", "N/A")
    email = lead_data.get("email", "N/A")
    whatsapp = lead_data.get("whatsapp", "N/A")
    area = lead_data.get("area", "N/A")
    plan = lead_data.get("plan", "N/A")
    summary = lead_data.get("ai_summary", "New corporate lunch inquiry received via website.")
    timestamp = lead_data.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    wa_direct = f"https://wa.me/{whatsapp}?text=Hi%20{name},%20this%20is%20ZaiqaBox%20Karachi.%20Thank%20you%20for%20inquiring%20about%20our%20{plan}!"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: Arial, sans-serif; background: #0F172A; color: #F8FAFC; margin: 0; padding: 20px; }}
        .card {{ max-width: 620px; margin: 0 auto; background: #1E293B; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }}
        .card-header {{ background: #F5A623; color: #140C07; padding: 20px 24px; font-weight: 800; font-size: 20px; }}
        .card-body {{ padding: 24px; font-size: 14px; line-height: 1.6; }}
        table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        td {{ padding: 10px 12px; border-bottom: 1px solid #334155; }}
        td.label {{ font-weight: bold; width: 35%; color: #94A3B8; }}
        td.val {{ color: #F8FAFC; }}
        .btn {{ display: inline-block; background: #25D366; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 12px 20px; border-radius: 6px; margin-right: 10px; }}
        .btn-portal {{ display: inline-block; background: #3B82F6; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 12px 20px; border-radius: 6px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="card-header">
          ⚡ New ZaiqaBox Corporate Lead Received!
        </div>
        <div class="card-body">
          <p style="color: #F8FAFC; font-size: 15px;">A new corporate client has submitted the website order form:</p>
          <table>
            <tr><td class="label">Customer Name:</td><td class="val"><strong>{name}</strong></td></tr>
            <tr><td class="label">Email Address:</td><td class="val"><a href="mailto:{email}" style="color: #38BDF8;">{email}</a></td></tr>
            <tr><td class="label">WhatsApp Number:</td><td class="val"><a href="{wa_direct}" style="color: #25D366; font-weight: bold;">{whatsapp}</a></td></tr>
            <tr><td class="label">Office Location:</td><td class="val">{area}</td></tr>
            <tr><td class="label">Requested Plan:</td><td class="val"><span style="background: #0284C7; padding: 3px 8px; border-radius: 4px; font-size: 13px;">{plan}</span></td></tr>
            <tr><td class="label">AI Lead Summary:</td><td class="val">{summary}</td></tr>
            <tr><td class="label">Submission Time:</td><td class="val">{timestamp}</td></tr>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="{wa_direct}" class="btn">💬 Chat Customer on WhatsApp</a>
            <a href="http://127.0.0.1:8000/admin/" class="btn-portal">⚙️ Open Admin Portal</a>
          </div>
        </div>
      </div>
    </body>
    </html>
    """


async def send_dual_lead_emails(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sends email to customer and email to admin (zaiqaboxkarachi@gmail.com) concurrently in background threads.
    Logs every email to sent_emails_log.json.
    """
    cfg = get_smtp_config()
    customer_email = lead_data.get("email")
    admin_recipient = cfg["admin_email"] or "zaiqaboxkarachi@gmail.com"

    customer_subject = f"🍱 Welcome to ZaiqaBox Karachi - Your Corporate Lunch Guide & {lead_data.get('plan', 'Plan')} Details"
    admin_subject = f"⚡ New Corporate Lead: {lead_data.get('name', 'Client')} ({lead_data.get('area', 'Karachi')} - {lead_data.get('plan', 'Plan')})"

    customer_html = build_customer_email_html(lead_data)
    admin_html = build_admin_alert_html(lead_data)

    async def _send_cust():
        if not customer_email:
            return False, "No customer email provided"
        sent, status_msg = await asyncio.to_thread(_send_smtp_html, customer_email, customer_subject, customer_html)
        _log_email_to_file(customer_email, customer_subject, "customer_confirmation", lead_data, sent, status_msg)
        return sent, status_msg

    async def _send_adm():
        sent, status_msg = await asyncio.to_thread(_send_smtp_html, admin_recipient, admin_subject, admin_html)
        _log_email_to_file(admin_recipient, admin_subject, "admin_alert", lead_data, sent, status_msg)
        return sent, status_msg

    cust_res, adm_res = await asyncio.gather(_send_cust(), _send_adm(), return_exceptions=True)

    cust_sent = cust_res[0] if isinstance(cust_res, tuple) else False
    adm_sent = adm_res[0] if isinstance(adm_res, tuple) else False

    print(f"[Email Service] Form submission: Admin mail ({admin_recipient}) sent: {adm_sent}, Customer mail ({customer_email}) sent: {cust_sent}")

    return {
        "admin_recipient": admin_recipient,
        "customer_recipient": customer_email,
        "admin_email_sent": adm_sent,
        "customer_email_sent": cust_sent,
        "logged_to_file": True
    }


async def test_send_email(to_email: str = None) -> Dict[str, Any]:
    cfg = get_smtp_config()
    recipient = to_email or cfg["admin_email"] or "zaiqaboxkarachi@gmail.com"
    subject = "🧪 ZaiqaBox Karachi - SMTP Email Test"
    html = f"""
    <div style="font-family: Arial; padding: 20px; background: #FAF5EC; color: #140C07;">
      <h2 style="color: #2E7D32;">✅ ZaiqaBox Email Configuration Verified!</h2>
      <p>This is a live test notification from your ZaiqaBox Karachi server.</p>
      <p>Sent to: <strong>{recipient}</strong> at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    """
    sent, msg = await asyncio.to_thread(_send_smtp_html, recipient, subject, html)
    return {"to": recipient, "success": sent, "message": msg}
