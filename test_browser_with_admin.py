import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.abspath("frontend/assets/screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ----------------------------------------------------
        # 1. PUBLIC WEBSITE - DESKTOP VIEWPORT
        # ----------------------------------------------------
        print("\n--- 1. Testing Public Website with Live Menu ---")
        context_desktop = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context_desktop.new_page()
        page.goto("http://127.0.0.1:8000", wait_until="networkidle")

        # Wait for dynamic menu to load from SQL Server
        page.wait_for_selector(".menu-card", timeout=5000)
        menu_cards = page.locator(".menu-card")
        count = menu_cards.count()
        print(f"Total dynamic menu cards rendered: {count}")
        assert count >= 5

        # Check first dish has star rating and image
        first_dish = menu_cards.first
        title = first_dish.locator(".menu-dish-title").text_content()
        rating = first_dish.locator(".star-rating").text_content()
        img_src = first_dish.locator(".menu-card-img").get_attribute("src")
        print(f"First Dish: '{title}' | Rating: '{rating}' | Img: '{img_src}'")
        assert "Tikka" in title
        assert "★" in rating
        assert "assets/menu/" in img_src

        # Capture Desktop Full Page Screenshot
        shot_desktop = os.path.join(SCREENSHOT_DIR, "desktop_1280.png")
        page.screenshot(path=shot_desktop, full_page=True)
        print(f"Saved: {shot_desktop}")

        # Capture Menu Section Specific Screenshot
        menu_section = page.locator("#menu")
        shot_menu = os.path.join(SCREENSHOT_DIR, "menu_cards_preview.png")
        menu_section.screenshot(path=shot_menu)
        print(f"Saved: {shot_menu}")

        # ----------------------------------------------------
        # 2. RESPONSIVENESS - TABLET (768px) & MOBILE (360px)
        # ----------------------------------------------------
        print("\n--- 2. Testing Tablet & Mobile Viewports ---")
        context_tablet = browser.new_context(viewport={"width": 768, "height": 1024})
        page_tablet = context_tablet.new_page()
        page_tablet.goto("http://127.0.0.1:8000", wait_until="networkidle")
        shot_tablet = os.path.join(SCREENSHOT_DIR, "tablet_768.png")
        page_tablet.screenshot(path=shot_tablet, full_page=True)
        print(f"Saved: {shot_tablet}")

        context_mobile = browser.new_context(viewport={"width": 360, "height": 740})
        page_mobile = context_mobile.new_page()
        page_mobile.goto("http://127.0.0.1:8000", wait_until="networkidle")
        shot_mobile = os.path.join(SCREENSHOT_DIR, "mobile_360.png")
        page_mobile.screenshot(path=shot_mobile, full_page=True)
        print(f"Saved: {shot_mobile}")

        # ----------------------------------------------------
        # 3. ADMIN PORTAL TESTING (SSMS INTEGRATED)
        # ----------------------------------------------------
        print("\n--- 3. Testing Admin Portal (Login & Dashboard) ---")
        page_admin = context_desktop.new_page()
        page_admin.goto("http://127.0.0.1:8000/admin/index.html", wait_until="networkidle")

        # Check Login View
        login_wrapper = page_admin.locator("#loginWrapper")
        assert login_wrapper.is_visible()
        shot_admin_login = os.path.join(SCREENSHOT_DIR, "admin_login.png")
        page_admin.screenshot(path=shot_admin_login)
        print(f"Saved: {shot_admin_login}")

        # Sign In
        page_admin.locator("#loginUsername").fill("admin")
        page_admin.locator("#loginPassword").fill("zaiqabox2026")
        page_admin.locator("#loginSubmitBtn").click()

        # Wait for App Shell
        page_admin.wait_for_selector("#appShell.active", timeout=5000)
        time.sleep(1.0)
        print("Admin signed in successfully!")

        # Verify DB Status Banner shows SQL Server
        db_text = page_admin.locator("#dbStatusText").text_content()
        print(f"Admin DB Indicator: '{db_text}'")
        assert "Microsoft SQL Server" in db_text

        # Capture Admin Overview Dashboard Screenshot
        shot_admin_dash = os.path.join(SCREENSHOT_DIR, "admin_dashboard.png")
        page_admin.screenshot(path=shot_admin_dash)
        print(f"Saved: {shot_admin_dash}")

        # Switch to Menu Tab
        page_admin.locator('.nav-item[data-tab="menu"]').click()
        page_admin.wait_for_selector(".dish-admin-card", timeout=4000)
        time.sleep(0.5)
        shot_admin_menu = os.path.join(SCREENSHOT_DIR, "admin_menu.png")
        page_admin.screenshot(path=shot_admin_menu)
        print(f"Saved: {shot_admin_menu}")

        # Switch to Leads Tab
        page_admin.locator('.nav-item[data-tab="leads"]').click()
        time.sleep(0.5)
        shot_admin_leads = os.path.join(SCREENSHOT_DIR, "admin_leads.png")
        page_admin.screenshot(path=shot_admin_leads)
        print(f"Saved: {shot_admin_leads}")

        browser.close()
        print("\n🎉 ALL PUBLIC & ADMIN BROWSER TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()
