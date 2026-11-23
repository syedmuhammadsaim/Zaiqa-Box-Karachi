"""
ZaiqaBox Karachi - Automated Email Notification Service
Sends automated branded HTML emails to:
1. The Admin (zaiqaboxkarachi@gmail.com - Instant lead alert with client details, plan, area, WhatsApp 1-click link)
2. The Customer (Lead confirmation, meal rotation & nutrition guide download, WhatsApp direct link)
"""

import os
import re
import smtplib
import json
import asyncio
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.utils import formataddr, formatdate, make_msgid
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


def _send_smtp_html(to_email: str, subject: str, html_content: str, reply_to: str = "") -> Tuple[bool, str]:
    cfg = get_smtp_config()
    sender_addr = (cfg["from_email"] or cfg["user"] or "").strip()
    if not sender_addr or not cfg["password"]:
        note = "SMTP_PASSWORD not set in .env. Logged to sent_emails_log.json."
        print(f"[Email Notice] {note}")
        return False, note

    try:
        # Standard RFC structure for emails with embedded images:
        # Related (outer) -> Alternative (plain + html) -> Image (inline cid)
        msg = MIMEMultipart("related")
        msg["Subject"] = subject
        msg["From"] = formataddr(("ZaiqaBox Karachi", sender_addr))
        msg["To"] = to_email.strip()
        if reply_to:
            msg["Reply-To"] = reply_to.strip()
        
        # Standard RFC compliant headers for clean inbox placement
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain="gmail.com")

        # Inner container for text and HTML parts
        msg_alt = MIMEMultipart("alternative")

        # Generate clean plain text version (prevents spam filters from penalizing HTML-only emails)
        plain_text = re.sub(r'<style.*?</style>', '', html_content, flags=re.DOTALL)
        plain_text = re.sub(r'<[^>]+>', ' ', plain_text)
        plain_text = re.sub(r'\s+', ' ', plain_text).strip()

        part_plain = MIMEText(plain_text, "plain", "utf-8")
        part_html = MIMEText(html_content, "html", "utf-8")
        msg_alt.attach(part_plain)
        msg_alt.attach(part_html)
        msg.attach(msg_alt)

        # Attach logo as inline image with Content-ID <zaiqabox_logo>
        logo_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "assets", "logo_email.png")
        if not os.path.exists(logo_path):
            logo_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "assets", "logo.png")

        if os.path.exists(logo_path):
            try:
                with open(logo_path, "rb") as img_f:
                    logo_img = MIMEImage(img_f.read(), _subtype="png")
                    logo_img.add_header("Content-ID", "<zaiqabox_logo>")
                    logo_img.add_header("Content-Disposition", "inline", filename="zaiqabox_logo.png")
                    msg.attach(logo_img)
            except Exception as img_err:
                print(f"[Email Service] Logo attach error: {img_err}")

        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg["user"], cfg["password"])
            # In SMTP standard, sender envelope must be bare email address
            server.sendmail(sender_addr, [to_email.strip()], msg.as_string())
        return True, "Delivered successfully via SMTP"
    except Exception as e:
        err_msg = str(e)
        print(f"[SMTP Send Exception] Failed sending to {to_email}: {err_msg}")
        return False, err_msg


def build_customer_email_html(lead_data: Dict[str, Any]) -> str:
    name = lead_data.get("name", "Valued Professional")
    plan = lead_data.get("plan", "Weekly Trial")
    area = lead_data.get("area", "Karachi Corporate Hub")
    wa_url = f"https://wa.me/923378034564?text=Hi%20ZaiqaBox!%20My%20name%20is%20{name}.%20I%20just%20filled%20the%20form%20for%20the%20{plan}.%20Please%20confirm%20my%20delivery%20details."

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
          <img src="cid:zaiqabox_logo" alt="ZaiqaBox Karachi" width="150" style="display: block; max-width: 150px; height: auto; margin: 0 auto 10px auto; border: 0;" />
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

          <p>We are delighted to have you on board. Our nutritionist-reviewed lunch boxes ensure clean energy and balanced meals for corporate professionals across Karachi.</p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="{wa_url}" class="btn-wa">💬 Confirm Delivery on WhatsApp</a>
          </div>

          <p style="font-size: 14px; color: #64748B;">
            If you have any specific dietary preferences or questions, our team is directly available on WhatsApp at <a href="https://wa.me/923378034564" style="color: #2E7D32; font-weight: bold;">+92 337 8034564</a> or reply to <a href="mailto:zaiqaboxkarachi@gmail.com">zaiqaboxkarachi@gmail.com</a>.
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
    summary = lead_data.get("ai_summary", "New corporate lunch request.")
    timestamp = lead_data.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6; background-color: #ffffff; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0;">
        <img src="cid:zaiqabox_logo" alt="ZaiqaBox Karachi" width="150" style="display: block; max-width: 150px; height: auto; margin: 0 auto 10px auto; border: 0;" />
        <h2 style="color: #2E7D32; margin: 0; font-size: 20px; font-weight: bold;">New ZaiqaBox Corporate Lunch Order</h2>
        <div style="color: #64748b; font-size: 13px; margin-top: 4px;">Automated Website Lead Dispatch</div>
      </div>
      <p>Hello Team,</p>
      <p>A new customer has just submitted their lunch details on the ZaiqaBox Karachi website:</p>
      
      <table style="border-collapse: collapse; width: 100%; max-width: 550px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <tr style="background-color: #f8fafc;">
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold; width: 35%;">Customer Name:</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1;"><strong>{name}</strong></td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold;">WhatsApp / Phone:</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1;"><a href="https://wa.me/{whatsapp}" style="color: #25d366; font-weight: bold;">{whatsapp}</a></td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold;">Email:</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1;"><a href="mailto:{email}">{email}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold;">Delivery Area:</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1;">{area}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold;">Interested Plan:</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; color: #0284c7; font-weight: bold;">{plan}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold;">Inquiry Notes:</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1;">{summary}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold;">Date & Time:</td>
          <td style="padding: 10px 14px; border: 1px solid #cbd5e1;">{timestamp}</td>
        </tr>
      </table>

      <p style="margin-top: 20px;">
        To contact the customer immediately, reply to this email directly or message them on WhatsApp: <a href="https://wa.me/{whatsapp}">https://wa.me/{whatsapp}</a>
      </p>
      <p style="font-size: 13px; color: #64748b; margin-top: 30px;">
        ZaiqaBox Karachi automated lead dispatch notification.
      </p>
    </body>
    </html>
    """


async def send_dual_lead_emails(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sends email to customer and email to admin (zaiqaboxkarachi@gmail.com and backup owner) concurrently in background threads.
    Logs every email to sent_emails_log.json.
    """
    cfg = get_smtp_config()
    customer_email = lead_data.get("email")

    # Ensure notifications reach both zaiqaboxkarachi@gmail.com and owner address
    admin_raw = cfg["admin_email"] or "zaiqaboxkarachi@gmail.com"
    admin_recipients = [r.strip() for r in admin_raw.split(",") if r.strip()]
    for target in ["zaiqaboxkarachi@gmail.com", "syedmuhammadsaim.contact@gmail.com"]:
        if target not in admin_recipients:
            admin_recipients.append(target)

    customer_subject = f"🍱 Welcome to ZaiqaBox Karachi - Your Corporate Lunch Guide & {lead_data.get('plan', 'Plan')} Details"
    admin_subject = f"New Corporate Lunch Order - {lead_data.get('name', 'Client')} ({lead_data.get('plan', 'Plan')})"

    customer_html = build_customer_email_html(lead_data)
    admin_html = build_admin_alert_html(lead_data)

    async def _send_cust():
        if not customer_email:
            return False, "No customer email provided"
        sent, status_msg = await asyncio.to_thread(_send_smtp_html, customer_email, customer_subject, customer_html, "")
        _log_email_to_file(customer_email, customer_subject, "customer_confirmation", lead_data, sent, status_msg)
        return sent, status_msg

    async def _send_adm_target(recipient: str):
        sent, status_msg = await asyncio.to_thread(_send_smtp_html, recipient, admin_subject, admin_html, customer_email or "")
        _log_email_to_file(recipient, admin_subject, "admin_alert", lead_data, sent, status_msg)
        return sent, status_msg

    tasks = [_send_cust()] + [_send_adm_target(r) for r in admin_recipients]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    cust_sent = results[0][0] if (isinstance(results[0], tuple) and len(results[0]) > 0) else False
    adm_sent = any(r[0] for r in results[1:] if (isinstance(r, tuple) and len(r) > 0))

    print(f"[Email Service] Lead email results - Admin targets ({admin_recipients}): {results[1:]}, Customer ({customer_email}): {cust_sent}")

    return {
        "admin_recipients": admin_recipients,
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
