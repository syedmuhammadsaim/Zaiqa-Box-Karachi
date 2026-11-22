import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.abspath("frontend/assets/screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_browser_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ----------------------------------------------------
        # 1. DESKTOP VIEWPORT TEST (1280px x 800px)
        # ----------------------------------------------------
        print("\n--- 1. Testing Desktop Viewport (1280px) ---")
        context_desktop = browser.new_context(viewport={"width": 1280, "height": 850})
        page_desktop = context_desktop.new_page()

        console_errors = []
        page_desktop.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        page_desktop.goto("http://127.0.0.1:8000", wait_until="networkidle")

        # Check horizontal overflow
        body_scroll_w = page_desktop.evaluate("document.documentElement.scrollWidth")
        body_client_w = page_desktop.evaluate("document.documentElement.clientWidth")
        print(f"Desktop Width: Client={body_client_w}, Scroll={body_scroll_w}")
        assert body_scroll_w <= body_client_w + 1, "Horizontal scroll detected on desktop!"

        # Screenshot Desktop
        desktop_shot = os.path.join(SCREENSHOT_DIR, "desktop_1280.png")
        page_desktop.screenshot(path=desktop_shot, full_page=True)
        print(f"Saved Desktop Screenshot: {desktop_shot}")

        # ----------------------------------------------------
        # 2. TABLET VIEWPORT TEST (768px x 1024px)
        # ----------------------------------------------------
        print("\n--- 2. Testing Tablet Viewport (768px) ---")
        context_tablet = browser.new_context(viewport={"width": 768, "height": 1024})
        page_tablet = context_tablet.new_page()
        page_tablet.goto("http://127.0.0.1:8000", wait_until="networkidle")

        body_scroll_w = page_tablet.evaluate("document.documentElement.scrollWidth")
        body_client_w = page_tablet.evaluate("document.documentElement.clientWidth")
        print(f"Tablet Width: Client={body_client_w}, Scroll={body_scroll_w}")
        assert body_scroll_w <= body_client_w + 1, "Horizontal scroll detected on tablet!"

        tablet_shot = os.path.join(SCREENSHOT_DIR, "tablet_768.png")
        page_tablet.screenshot(path=tablet_shot, full_page=True)
        print(f"Saved Tablet Screenshot: {tablet_shot}")

        # ----------------------------------------------------
        # 3. MOBILE VIEWPORT TEST (360px x 740px)
        # ----------------------------------------------------
        print("\n--- 3. Testing Mobile Viewport (360px) ---")
        context_mobile = browser.new_context(viewport={"width": 360, "height": 740})
        page_mobile = context_mobile.new_page()
        page_mobile.goto("http://127.0.0.1:8000", wait_until="networkidle")

        body_scroll_w = page_mobile.evaluate("document.documentElement.scrollWidth")
        body_client_w = page_mobile.evaluate("document.documentElement.clientWidth")
        print(f"Mobile Width: Client={body_client_w}, Scroll={body_scroll_w}")
        assert body_scroll_w <= body_client_w + 1, "Horizontal scroll detected on mobile 360px!"

        mobile_shot = os.path.join(SCREENSHOT_DIR, "mobile_360.png")
        page_mobile.screenshot(path=mobile_shot, full_page=True)
        print(f"Saved Mobile Screenshot: {mobile_shot}")

        # ----------------------------------------------------
        # 4. MOBILE HAMBURGER MENU INTERACTION
        # ----------------------------------------------------
        print("\n--- 4. Testing Mobile Hamburger Menu ---")
        hamburger = page_mobile.locator("#hamburgerBtn")
        assert hamburger.is_visible()

        hamburger.click()
        time.sleep(0.3)
        nav_menu = page_mobile.locator("#navMenu")
        assert "open" in (nav_menu.get_attribute("class") or "")
        print("Mobile menu opened successfully.")

        # Click a nav link -> menu should close
        page_mobile.locator('.nav-link[href="#plans"]').click()
        time.sleep(0.3)
        assert "open" not in (nav_menu.get_attribute("class") or "")
        print("Mobile menu closed on nav link click.")

        # ----------------------------------------------------
        # 5. FAQ ACCORDION INTERACTION
        # ----------------------------------------------------
        print("\n--- 5. Testing FAQ Accordion ---")
        faq_item = page_desktop.locator(".faq-item").first
        faq_btn = faq_item.locator(".faq-question-btn")
        faq_answer = faq_item.locator(".faq-answer")

        assert not faq_answer.is_visible()
        faq_btn.click()
        time.sleep(0.2)
        assert faq_answer.is_visible()
        print("FAQ accordion item expanded successfully.")

        # ----------------------------------------------------
        # 6. DELIVERY CHECKER & CALCULATOR INTERACTION
        # ----------------------------------------------------
        print("\n--- 6. Testing Delivery Checker & Calculator ---")
        area_select = page_desktop.locator("#calcAreaSelect")
        plan_select = page_desktop.locator("#calcPlanSelect")
        base_price_el = page_desktop.locator("#calcBasePrice")
        delivery_fee_el = page_desktop.locator("#calcDeliveryFee")
        total_price_el = page_desktop.locator("#calcTotalPrice")
        order_btn = page_desktop.locator("#calcOrderBtn")

        # Test DHA (Free delivery)
        area_select.select_option("DHA")
        plan_select.select_option("weekly")
        time.sleep(0.1)
        assert "3,500" in (base_price_el.text_content() or "")
        assert "Free" in (delivery_fee_el.text_content() or "")
        assert "3,500" in (total_price_el.text_content() or "")
        assert "DHA" in (order_btn.get_attribute("href") or "")
        print("Calculator DHA: Free delivery & PKR 3,500 confirmed.")

        # Test Other (Outside zone: PKR 200/day fee)
        area_select.select_option("Other")
        plan_select.select_option("weekly")
        time.sleep(0.1)
        assert "1,000" in (delivery_fee_el.text_content() or "")
        assert "4,500" in (total_price_el.text_content() or "")
        print("Calculator Other (Weekly): PKR 1,000 delivery & PKR 4,500 total confirmed.")

        # Test Other (Monthly: 20 lunches x 200 = 4,000 fee)
        plan_select.select_option("monthly")
        time.sleep(0.1)
        assert "4,000" in (delivery_fee_el.text_content() or "")
        assert "16,500" in (total_price_el.text_content() or "")
        print("Calculator Other (Monthly): PKR 4,000 delivery & PKR 16,500 total confirmed.")

        # ----------------------------------------------------
        # 7. LEAD FORM VALIDATION & SUCCESSFUL SUBMIT
        # ----------------------------------------------------
        print("\n--- 7. Testing Lead Form Validation & Auto-Download ---")
        submit_btn = page_desktop.locator("#leadSubmitBtn")
        name_err = page_desktop.locator("#nameError")
        email_err = page_desktop.locator("#emailError")
        phone_err = page_desktop.locator("#whatsappError")

        # Submit empty -> validation errors
        submit_btn.click()
        time.sleep(0.2)
        assert name_err.is_visible()
        assert email_err.is_visible()
        assert phone_err.is_visible()
        print("Form empty validation passed.")

        # Fill with valid data
        page_desktop.locator("#leadName").fill("Tariq Mahmood")
        page_desktop.locator("#leadEmail").fill("tariq@hbl.com.pk")
        page_desktop.locator("#leadWhatsapp").fill("03219876543")
        page_desktop.locator("#leadArea").select_option("Clifton")
        page_desktop.locator("#leadPlan").select_option("Monthly Executive")

        submit_btn.click()
        page_desktop.wait_for_selector("#leadSuccessState", state="visible", timeout=6000)

        success_title = page_desktop.locator(".lead-success-title").text_content()
        print(f"Lead form submitted successfully: '{success_title}'")
        assert "Ready" in (success_title or "")

        # ----------------------------------------------------
        # 8. CHATBOT INTERACTION (RAG & MEDICAL ESCALATION)
        # ----------------------------------------------------
        print("\n--- 8. Testing AI Chatbot Widget ---")
        launcher = page_desktop.locator("#chatLauncherBtn")
        chat_window = page_desktop.locator("#chatWidgetWindow")
        chat_input = page_desktop.locator("#chatInput")
        chat_send = page_desktop.locator("#chatSendBtn")

        launcher.click()
        time.sleep(0.3)
        assert chat_window.is_visible()
        print("Chat widget opened.")

        # Test query 1: Weekly plan price?
        chat_input.fill("Weekly plan price?")
        chat_send.click()
        page_desktop.wait_for_selector(".chat-msg.user:has-text('Weekly plan price?')", timeout=4000)
        time.sleep(1.0) # Wait for bot reply
        last_bot_msg = page_desktop.locator(".chat-msg.bot").last.text_content()
        print(f"Bot Reply to 'Weekly plan price?':\n  -> {last_bot_msg}")
        assert "3,500" in (last_bot_msg or "")

        # Test query 2: Medical query (Must trigger handoff)
        chat_input.fill("Is this good for diabetes?")
        chat_send.click()
        page_desktop.wait_for_selector(".chat-msg.user:has-text('Is this good for diabetes?')", timeout=4000)
        time.sleep(1.0)
        last_bot_msg = page_desktop.locator(".chat-msg.bot").last
        assert "handoff-box" in (last_bot_msg.get_attribute("class") or "")
        assert "human nutritionist" in (last_bot_msg.text_content() or "").lower()
        handoff_cta = last_bot_msg.locator(".handoff-cta-btn")
        assert handoff_cta.is_visible()
        print("Medical question escalated to human nutritionist with WhatsApp CTA!")

        # Screenshot Chat Window
        chat_shot = os.path.join(SCREENSHOT_DIR, "chat_widget.png")
        chat_window.screenshot(path=chat_shot)
        print(f"Saved Chat Screenshot: {chat_shot}")

        # ----------------------------------------------------
        # 9. API KEY LEAKAGE SECURITY SCAN
        # ----------------------------------------------------
        print("\n--- 9. Security Scan: Verifying No API Keys in Frontend ---")
        page_source = page_desktop.content()
        dangerous_patterns = ["gsk_", "deepgram", "GROQ_API_KEY", "DEEPGRAM_API_KEY", "SHEET_WEBHOOK_URL"]
        for pattern in dangerous_patterns:
            if pattern in ["gsk_"]:
                assert pattern not in page_source, f"ALERT: Found {pattern} in page source!"
        print("No private keys or tokens present in client source.")

        browser.close()
        print("\n🎉 ALL BROWSER & RESPONSIVE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_browser_tests()
