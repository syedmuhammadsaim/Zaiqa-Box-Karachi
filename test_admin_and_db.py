import httpx

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=10.0)

print("=== 1. TEST PUBLIC SITE DATA FROM SQL SERVER ===")
res = client.get("/api/site/data")
assert res.status_code == 200
data = res.json()
print("Database Engine:", data.get("database_engine"))
print("Active Menu Count:", len(data.get("menu", [])))
print("First Menu Item:", data["menu"][0]["Title"], "| Rating:", data["menu"][0]["Rating"], "| Image:", data["menu"][0]["ImageUrl"])
assert len(data["menu"]) >= 5
assert data["menu"][0]["Rating"] is not None
assert "assets/menu/" in data["menu"][0]["ImageUrl"]

print("\n=== 2. TEST ADMIN LOGIN ===")
login_res = client.post("/api/admin/login", json={"username": "admin", "password": "zaiqabox2026"})
assert login_res.status_code == 200
login_data = login_res.json()
token = login_data["token"]
print("Admin Login Success! User:", login_data["user"]["fullName"])

headers = {"Authorization": f"Bearer {token}"}

print("\n=== 3. TEST ADMIN STATS ===")
stats_res = client.get("/api/admin/stats", headers=headers)
assert stats_res.status_code == 200
stats = stats_res.json()
print("Stats from SQL Server:", stats)
assert stats["database_engine"].startswith("Microsoft SQL Server")

print("\n=== 4. TEST ADDING MENU DISH VIA ADMIN API ===")
new_dish = {
    "DayOfWeek": "Friday",
    "Title": "Special Grilled Herb Trout",
    "Description": "Fresh ocean trout pan-seared in garlic herb butter with steamed lemon greens.",
    "Sides": "Brown rice pilaf & mint raita",
    "ImageUrl": "assets/menu/friday_grilled_fish.jpg",
    "Rating": 5.0,
    "ReviewsCount": 190,
    "Badge": "Executive Choice",
    "Calories": 510,
    "ProteinGrams": 42,
    "DisplayOrder": 6,
    "IsActive": True
}
add_res = client.post("/api/admin/menu", json=new_dish, headers=headers)
assert add_res.status_code == 200
print("Dish added:", add_res.json())

# Check menu count increased
menu_res = client.get("/api/admin/menu", headers=headers)
menu_items = menu_res.json()
print(f"Total Menu Items in DB: {len(menu_items)}")
assert len(menu_items) >= 6

# Find added dish and delete it to keep clean state
added = [d for d in menu_items if d["Title"] == "Special Grilled Herb Trout"]
if added:
    del_res = client.delete(f"/api/admin/menu/{added[0]['Id']}", headers=headers)
    assert del_res.status_code == 200
    print("Cleaned up test dish successfully.")

print("\n=== 5. TEST LEAD CAPTURE WRITES DIRECTLY TO SQL SERVER ===")
lead_res = client.post("/api/lead", json={
    "name": "Kamran Akram",
    "email": "kamran@corporate.pk",
    "whatsapp": "03331234567",
    "area": "Clifton",
    "plan": "Monthly Executive",
    "consent": True
})
assert lead_res.status_code == 200
print("Lead submitted:", lead_res.json().get("status"))

# Verify lead exists in SQL Server
leads_res = client.get("/api/admin/leads", headers=headers)
assert leads_res.status_code == 200
leads = leads_res.json()
print(f"Total Leads in SQL Server: {len(leads)}")
latest_lead = leads[0]
print("Latest Lead in SQL Server:", latest_lead["Name"], "| WhatsApp:", latest_lead["WhatsApp"], "| Status:", latest_lead["Status"])
assert latest_lead["Name"] == "Kamran Akram"
assert latest_lead["WhatsApp"] == "923331234567"

print("\n=== 6. TEST UPDATING LEAD STATUS VIA ADMIN ===")
update_res = client.put(f"/api/admin/leads/{latest_lead['Id']}", json={"status": "Contacted", "notes": "Called and sent WhatsApp menu."}, headers=headers)
assert update_res.status_code == 200
print("Updated lead status to 'Contacted'.")

print("\nALL SQL SERVER & ADMIN API TESTS PASSED PERFECTLY!")
