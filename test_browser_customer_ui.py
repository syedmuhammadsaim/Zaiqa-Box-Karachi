import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.abspath("frontend/assets/screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        # Handle browser alert popups automatically
        page.on("dialog", lambda dialog: dialog.accept())

        print("--- 1. Loading Website with Updated Luxury Skillet & Banner Palette ---")
        page.goto("http://127.0.0.1:8000", wait_until="networkidle")

        # Take screenshot of new luxury theme
        shot_palette = os.path.join(SCREENSHOT_DIR, "new_luxury_palette.png")
        page.screenshot(path=shot_palette)
        print(f"Saved: {shot_palette}")

        # Open Auth Modal
        print("\n--- 2. Testing Customer Registration Modal ---")
        open_btn = page.locator("#openAuthModalBtn")
        assert open_btn.is_visible()
        open_btn.click()

        auth_modal = page.locator("#userAuthModal")
        page.wait_for_selector("#userAuthModal.open", timeout=4000)
        assert auth_modal.is_visible()

        # Switch to Create Account Tab
        page.locator("#tabRegisterBtn").click()
        time.sleep(0.3)

        # Screenshot Auth Modal
        shot_auth = os.path.join(SCREENSHOT_DIR, "customer_auth_modal.png")
        auth_modal.screenshot(path=shot_auth)
        print(f"Saved: {shot_auth}")

        # Fill Registration
        unique_email = f"fatima_{int(time.time())}@bankalfalah.com"
        page.locator("#regFullName").fill("Fatima Noor")
        page.locator("#regEmail").fill(unique_email)
        page.locator("#regWhatsapp").fill("03211234567")
        page.locator("#regArea").select_option("Clifton")
        page.locator("#regAddress").fill("Bahria Complex 3, M.T. Khan Road")
        page.locator("#regPassword").fill("fatimaSecure2026")

        page.locator("#regSubmitBtn").click()
        time.sleep(1.0)

        # Verify Nav User State
        user_pill = page.locator("#openDashboardBtn")
        page.wait_for_selector("#openDashboardBtn", state="visible", timeout=5000)
        nav_name = page.locator("#navUserName").text_content()
        print(f"Logged In User displayed in Navbar: '{nav_name}'")
        assert "Fatima" in nav_name

        # Click User Pill to Open Customer Portal
        print("\n--- 3. Testing Customer Lunch Dashboard Modal ---")
        user_pill.click()
        dash_modal = page.locator("#customerDashboardModal")
        page.wait_for_selector("#customerDashboardModal.open", timeout=4000)
        assert dash_modal.is_visible()

        # Check values in dashboard
        cust_name = page.locator("#dashCustomerName").text_content()
        plan_name = page.locator("#dashPlanName").text_content()
        lunches = page.locator("#dashLunchesRemaining").text_content()
        print(f"Dashboard Profile: Name='{cust_name}', Plan='{plan_name}', Lunches='{lunches}'")
        assert "Fatima Noor" in cust_name

        # Screenshot Dashboard Modal
        shot_dash = os.path.join(SCREENSHOT_DIR, "customer_dashboard_modal.png")
        dash_modal.screenshot(path=shot_dash)
        print(f"Saved: {shot_dash}")

        browser.close()
        print("\n🎉 ALL CUSTOMER REGISTRATION, LOGIN & DASHBOARD TESTS PASSED!")

if __name__ == "__main__":
    run()
