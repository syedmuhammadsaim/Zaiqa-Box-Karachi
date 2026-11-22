import httpx
import pyodbc

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=10.0)

print("=== 1. TEST USER REGISTRATION API ===")
reg_payload = {
    "fullName": "Bilal Tariq",
    "email": "bilal.tariq@engro.com",
    "whatsapp": "03009876543",
    "area": "DHA",
    "officeAddress": "6th Floor, The Harbor Front, Clifton",
    "password": "corporatePass123"
}

res = client.post("/api/user/register", json=reg_payload)
print("Register status:", res.status_code)
if res.status_code == 400 and "already exists" in res.text:
    print("User already registered, proceeding to login...")
else:
    assert res.status_code == 200
    print("Registration response:", res.json())

print("\n=== 2. TEST USER LOGIN API ===")
login_res = client.post("/api/user/login", json={
    "email": "bilal.tariq@engro.com",
    "password": "corporatePass123"
})
assert login_res.status_code == 200
login_data = login_res.json()
print("Login success! Customer:", login_data["customer"]["FullName"], "| Plan:", login_data["customer"]["ActivePlan"])
cust_id = login_data["customer"]["Id"]

print("\n=== 3. VERIFY DIRECTLY IN SQL SERVER (SSMS) ===")
conn_str = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=ZaiqaBoxDB;Trusted_Connection=yes;"
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()
cursor.execute("SELECT Id, FullName, Email, WhatsApp, Area, OfficeAddress, ActivePlan, LunchesRemaining, SubscriptionStatus FROM dbo.Customers WHERE Email = ?", ("bilal.tariq@engro.com",))
row = cursor.fetchone()
print("SQL Server row found:", row)
assert row is not None
assert row[1] == "Bilal Tariq"
conn.close()

print("\n=== 4. TEST PAUSE / RESUME SUBSCRIPTION ===")
pause_res = client.post("/api/user/pause", json={"customerId": cust_id, "action": "pause"})
assert pause_res.status_code == 200
print("Pause result:", pause_res.json().get("message"))

resume_res = client.post("/api/user/pause", json={"customerId": cust_id, "action": "resume"})
assert resume_res.status_code == 200
print("Resume result:", resume_res.json().get("message"))

print("\n=== 5. TEST UPDATE DELIVERY ADDRESS ===")
addr_res = client.post("/api/user/update-address", json={
    "customerId": cust_id,
    "officeAddress": "Floor 12, Ocean Tower, Clifton",
    "area": "Clifton"
})
assert addr_res.status_code == 200
print("Address update result:", addr_res.json().get("message"))

print("\nALL USER REGISTRATION & SQL SERVER TESTS PASSED!")
