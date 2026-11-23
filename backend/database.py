"""
ZaiqaBox Karachi - Database Abstraction Layer
Primary Engine: Microsoft SQL Server (SSMS compatible via pyodbc)
Fallback Engine: SQLite (ensures 100% uptime if SQL Server is paused or on differing setups)
"""

import os
import json
import sqlite3
from typing import List, Dict, Any, Optional

# pyodbc for Microsoft SQL Server
try:
    import pyodbc
    PYODBC_AVAILABLE = True
except ImportError:
    PYODBC_AVAILABLE = False

SQL_SERVER_CONN_STR = os.getenv(
    "SQL_SERVER_CONN_STR",
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=ZaiqaBoxDB;Trusted_Connection=yes;"
)

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "zaiqabox_local.db")


class DatabaseManager:
    def __init__(self):
        self.use_sql_server = False
        self.init_connection()

    def init_connection(self):
        """Attempts to connect to Microsoft SQL Server; falls back to SQLite if unavailable."""
        if PYODBC_AVAILABLE and SQL_SERVER_CONN_STR:
            try:
                conn = pyodbc.connect(SQL_SERVER_CONN_STR, timeout=3)
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                conn.close()
                self.use_sql_server = True
                print("[DB] Connected successfully to Microsoft SQL Server (ZaiqaBoxDB)!")
                return
            except Exception as e:
                print(f"[DB] Microsoft SQL Server not connected ({e}). Using local database.")

        self.use_sql_server = False
        self.init_sqlite()

    def get_conn(self):
        """Returns active database connection."""
        if self.use_sql_server:
            try:
                return pyodbc.connect(SQL_SERVER_CONN_STR, autocommit=True)
            except Exception as e:
                print(f"[DB Error] SQL Server reconnect failed: {e}. Falling back to SQLite.")
                self.use_sql_server = False
                return self.get_sqlite_conn()
        else:
            return self.get_sqlite_conn()

    def get_sqlite_conn(self):
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def init_sqlite(self):
        """Initializes SQLite schema and seeds if SQL Server is not reachable."""
        conn = self.get_sqlite_conn()
        cur = conn.cursor()

        cur.execute("""
        CREATE TABLE IF NOT EXISTS AdminUsers (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Username TEXT UNIQUE NOT NULL,
            PasswordHash TEXT NOT NULL,
            FullName TEXT NOT NULL,
            Role TEXT DEFAULT 'admin',
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS MenuItems (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            DayOfWeek TEXT NOT NULL,
            Title TEXT NOT NULL,
            Description TEXT NOT NULL,
            Sides TEXT NOT NULL,
            ImageUrl TEXT NOT NULL,
            Rating REAL DEFAULT 4.9,
            ReviewsCount INTEGER DEFAULT 130,
            Badge TEXT DEFAULT 'Nutritionist-Choice',
            Calories INTEGER DEFAULT 520,
            ProteinGrams INTEGER DEFAULT 36,
            DisplayOrder INTEGER DEFAULT 1,
            IsActive INTEGER DEFAULT 1,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS Plans (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            PlanCode TEXT UNIQUE NOT NULL,
            Name TEXT NOT NULL,
            LunchesCount INTEGER NOT NULL,
            Price REAL NOT NULL,
            PeriodText TEXT NOT NULL,
            Badge TEXT,
            Description TEXT NOT NULL,
            FeaturesJson TEXT NOT NULL,
            IsPopular INTEGER DEFAULT 0,
            IsActive INTEGER DEFAULT 1
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS DeliveryZones (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            ZoneName TEXT NOT NULL,
            CoverageDetails TEXT NOT NULL,
            IsFree INTEGER DEFAULT 1,
            DailyFee REAL DEFAULT 0.0,
            TimingWindow TEXT DEFAULT '12:30 PM – 1:30 PM',
            DisplayOrder INTEGER DEFAULT 1,
            IsActive INTEGER DEFAULT 1
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS Leads (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            Name TEXT NOT NULL,
            Email TEXT NOT NULL,
            WhatsApp TEXT NOT NULL,
            Area TEXT NOT NULL,
            Plan TEXT NOT NULL,
            AiSummary TEXT,
            Source TEXT DEFAULT 'Website Form',
            Status TEXT DEFAULT 'New',
            Notes TEXT
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS SiteSettings (
            SettingKey TEXT PRIMARY KEY,
            SettingValue TEXT NOT NULL,
            Description TEXT
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS Customers (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            FullName TEXT NOT NULL,
            Email TEXT UNIQUE NOT NULL,
            PasswordHash TEXT NOT NULL,
            WhatsApp TEXT NOT NULL,
            Area TEXT NOT NULL,
            OfficeAddress TEXT,
            ActivePlan TEXT DEFAULT 'Weekly Trial',
            LunchesRemaining INTEGER DEFAULT 5,
            SubscriptionStatus TEXT DEFAULT 'Active',
            ProfileImage TEXT,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Auto-migration for existing SQLite tables
        try:
            cur.execute("ALTER TABLE Customers ADD COLUMN ProfileImage TEXT")
        except Exception:
            pass

        cur.execute("""
        CREATE TABLE IF NOT EXISTS FAQs (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Question TEXT NOT NULL,
            Answer TEXT NOT NULL,
            Category TEXT DEFAULT 'General',
            DisplayOrder INTEGER DEFAULT 1,
            IsActive INTEGER DEFAULT 1,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS Testimonials (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            CustomerName TEXT NOT NULL,
            CompanyArea TEXT NOT NULL,
            Rating REAL DEFAULT 5.0,
            ReviewText TEXT NOT NULL,
            AvatarUrl TEXT DEFAULT 'assets/avatars/avatar1.jpg',
            DisplayOrder INTEGER DEFAULT 1,
            IsActive INTEGER DEFAULT 1,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Seed SQLite if empty
        cur.execute("SELECT COUNT(*) FROM AdminUsers")
        if cur.fetchone()[0] == 0:
            cur.execute("INSERT INTO AdminUsers (Username, PasswordHash, FullName) VALUES ('admin', 'zaiqabox2026', 'ZaiqaBox Operations Admin')")

            # Seed MenuItems
            menu_data = [
                ('Monday', 'Tender Chicken Tikka Rice Bowl', 'Flame-grilled boneless chicken breast marinated in traditional low-oil spices, placed over aromatic steamed brown and basmati rice.', 'Kachumber garden salad, mint yogurt raita & lemon wedge', 'assets/menu/monday_tikka_bowl.jpg', 4.9, 148, 'High Protein', 520, 38, 1, 1),
                ('Tuesday', 'Homestyle Daal Palak & Tawa Rotis', 'Slow-simmered protein-rich yellow lentils gently tempered with fresh organic spinach, cumin seeds, garlic, and pure olive-blend tarka.', 'Two whole-wheat stone-ground tawa rotis, cucumber raita & fresh salad', 'assets/menu/tuesday_daal_palak.jpg', 4.8, 124, 'Iron & Fiber Rich', 460, 22, 2, 1),
                ('Wednesday', 'Light Desi Chicken Handi', 'Tender chicken cubes braised in a velvety roasted tomato, ginger, and cracked black pepper reduction, prepared with minimal oil.', 'Two whole-wheat chapatis, sliced cucumbers, and pickled radish', 'assets/menu/wednesday_chicken_handi.jpg', 4.9, 162, 'Chef Special', 540, 36, 3, 1),
                ('Thursday', 'Spiced Chana Medley & Matar Pulao', 'Tender garbanzo chickpeas stewed in an aromatic whole-spice masala, served with fragrant basmati green pea pulao for sustained energy.', 'Chilled cucumber-mint raita, onion rings & lemon dressing', 'assets/menu/thursday_chana_pulao.jpg', 4.8, 119, 'Plant Powered', 490, 24, 4, 1),
                ('Friday', 'Grilled Fish Fillet / Herb Cutlets', 'Pan-seared ocean fish or crisp herb chicken cutlets seasoned with crushed black pepper, sea salt, oregano, and cold-pressed mustard oil.', 'Fluffy steamed herbed rice, charred bell peppers & garlic dipping sauce', 'assets/menu/friday_grilled_fish.jpg', 5.0, 185, 'Weekend Special', 510, 40, 5, 1)
            ]
            cur.executemany("INSERT INTO MenuItems (DayOfWeek, Title, Description, Sides, ImageUrl, Rating, ReviewsCount, Badge, Calories, ProteinGrams, DisplayOrder, IsActive) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", menu_data)

            # Seed Plans
            cur.execute("""
            INSERT INTO Plans (PlanCode, Name, LunchesCount, Price, PeriodText, Badge, Description, FeaturesJson, IsPopular, IsActive)
            VALUES 
            ('weekly', 'Weekly Trial', 5, 3500, '5 Lunches (Mon – Fri)', 'Popular for Trying', 'Ideal for corporate professionals experiencing nutritious home-cooked office lunches for the first week.', '["5 fresh home-cooked lunches (Mon-Fri)","Nutritionist-reviewed portions","Free delivery in DHA, Clifton & PECHS","Arrives fresh between 12:30 – 1:30 PM","Pause anytime before 8:00 PM prior"]', 0, 1),
            ('monthly', 'Monthly Executive', 20, 12500, '20 Lunches (4 Weeks)', 'Most Popular / Best Value', 'The complete hassle-free office lunch subscription for corporate executives with highest savings.', '["20 fresh home-cooked lunches (4 weeks)","Save PKR 1,500 compared to weekly renew","Nutritionist-reviewed balanced rotation","Free delivery in DHA, Clifton & PECHS","Arrives fresh between 12:30 – 1:30 PM","Flexible pause & credit rollover"]', 1, 1)
            """)

            # Seed Zones
            cur.execute("""
            INSERT INTO DeliveryZones (ZoneName, CoverageDetails, IsFree, DailyFee, TimingWindow, DisplayOrder, IsActive)
            VALUES 
            ('DHA (Defence)', 'Phases 1 through 8', 1, 0, '12:30 PM – 1:30 PM', 1, 1),
            ('Clifton', 'All Blocks (Block 1 - 9, Sea View, Bilawal Chwrangi)', 1, 0, '12:30 PM – 1:30 PM', 2, 1),
            ('PECHS', 'Blocks 1, 2, 3, 6 & Extension', 1, 0, '12:30 PM – 1:30 PM', 3, 1),
            ('Other Karachi Areas', 'Gulshan, Saddar, I.I. Chundrigar, Bahadurabad, etc.', 0, 200, '12:30 PM – 1:30 PM', 4, 1)
            """)

            # Seed Settings
            cur.executemany("INSERT INTO SiteSettings (SettingKey, SettingValue, Description) VALUES (?,?,?)", [
                ('brand_name', 'ZaiqaBox Karachi', 'Brand business name'),
                ('whatsapp_number', '923378034564', 'Corporate WhatsApp number'),
                ('display_whatsapp', '+92 337 8034564', 'Formatted display phone number'),
                ('email', 'contact@zaiqabox.pk', 'Official customer support email'),
                ('announcement_text', 'Order before 8:00 PM for tomorrow\'s lunch delivery | Free delivery in DHA, Clifton & PECHS (12:30 PM – 1:30 PM)', 'Announcement banner'),
                ('outside_zone_fee_per_day', '200', 'Daily outside zone surcharge'),
                ('delivery_window', '12:30 PM – 1:30 PM', 'Drop-off time window'),
                ('pause_deadline', '8:00 PM the night prior', 'Pause cutoff'),
                ('compliance_note', 'For any medical or dietary questions, our human nutritionist will assist you.', 'Compliance')
            ])

        conn.commit()
        conn.close()

    # --- QUERY HELPERS ---
    def rows_to_dicts(self, cursor, rows) -> List[Dict[str, Any]]:
        if not rows:
            return []
        if hasattr(rows[0], "keys"): # sqlite3.Row
            return [dict(r) for r in rows]
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]

    # --- PUBLIC SITE DATA ---
    def get_public_site_data(self) -> Dict[str, Any]:
        """Loads all active data for the public website."""
        conn = self.get_conn()
        cur = conn.cursor()

        # Menu
        cur.execute("SELECT * FROM MenuItems WHERE IsActive = 1 ORDER BY DisplayOrder ASC")
        menu_items = self.rows_to_dicts(cur, cur.fetchall())

        # Plans
        cur.execute("SELECT * FROM Plans WHERE IsActive = 1 ORDER BY Price ASC")
        plans_raw = self.rows_to_dicts(cur, cur.fetchall())
        for p in plans_raw:
            try:
                p["features"] = json.loads(p.get("FeaturesJson") or "[]")
            except Exception:
                p["features"] = []

        # Delivery
        cur.execute("SELECT * FROM DeliveryZones WHERE IsActive = 1 ORDER BY DisplayOrder ASC")
        zones = self.rows_to_dicts(cur, cur.fetchall())

        # FAQs
        try:
            cur.execute("SELECT * FROM FAQs WHERE IsActive = 1 ORDER BY DisplayOrder ASC")
            faqs = self.rows_to_dicts(cur, cur.fetchall())
        except Exception:
            faqs = []

        # Testimonials
        try:
            cur.execute("SELECT * FROM Testimonials WHERE IsActive = 1 ORDER BY DisplayOrder ASC")
            testimonials = self.rows_to_dicts(cur, cur.fetchall())
        except Exception:
            testimonials = []

        # Settings
        cur.execute("SELECT SettingKey, SettingValue FROM SiteSettings")
        settings_raw = self.rows_to_dicts(cur, cur.fetchall())
        settings = {s["SettingKey"]: s["SettingValue"] for s in settings_raw}

        conn.close()
        return {
            "menu": menu_items,
            "plans": plans_raw,
            "delivery_zones": zones,
            "faqs": faqs,
            "testimonials": testimonials,
            "settings": settings,
            "database_engine": "Microsoft SQL Server" if self.use_sql_server else "Local SQLite"
        }

    # --- ADMIN STATS ---
    def get_admin_stats(self) -> Dict[str, Any]:
        conn = self.get_conn()
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM Leads")
        total_leads = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM Leads WHERE Status = 'New'")
        new_leads = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM MenuItems WHERE IsActive = 1")
        active_dishes = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM Plans WHERE IsActive = 1")
        active_plans = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM DeliveryZones WHERE IsActive = 1")
        active_zones = cur.fetchone()[0]

        # Fetch 6 most recent leads for Operations Overview table
        plan_col = "[Plan]" if self.use_sql_server else "Plan"
        if self.use_sql_server:
            cur.execute(f"SELECT TOP 6 Id, Timestamp, Name, Email, WhatsApp, Area, {plan_col} AS [Plan], AiSummary, Status, Notes FROM Leads ORDER BY Id DESC")
        else:
            cur.execute(f"SELECT Id, Timestamp, Name, Email, WhatsApp, Area, {plan_col} AS [Plan], AiSummary, Status, Notes FROM Leads ORDER BY Id DESC LIMIT 6")
        recent_leads = self.rows_to_dicts(cur, cur.fetchall())

        conn.close()
        return {
            "total_leads": total_leads,
            "new_leads": new_leads,
            "active_dishes": active_dishes,
            "active_plans": active_plans,
            "active_zones": active_zones,
            "recent_leads": recent_leads,
            "database_engine": "Microsoft SQL Server (SSMS)" if self.use_sql_server else "SQLite Local",
            "server_host": "localhost (ZaiqaBoxDB)" if self.use_sql_server else "Localfile"
        }

    # --- MENU CRUD ---
    def get_menu_items(self) -> List[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM MenuItems ORDER BY DisplayOrder ASC")
        items = self.rows_to_dicts(cur, cur.fetchall())
        conn.close()
        return items

    def add_menu_item(self, item: Dict[str, Any]) -> int:
        conn = self.get_conn()
        cur = conn.cursor()
        sql = """
        INSERT INTO MenuItems 
        (DayOfWeek, Title, Description, Sides, ImageUrl, Rating, ReviewsCount, Badge, Calories, ProteinGrams, DisplayOrder, IsActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            item.get("DayOfWeek", "Monday"),
            item.get("Title", "New Dish"),
            item.get("Description", ""),
            item.get("Sides", ""),
            item.get("ImageUrl", "assets/menu/monday_tikka_bowl.jpg"),
            float(item.get("Rating", 4.9)),
            int(item.get("ReviewsCount", 100)),
            item.get("Badge", "Popular"),
            int(item.get("Calories", 500)),
            int(item.get("ProteinGrams", 30)),
            int(item.get("DisplayOrder", 1)),
            1 if item.get("IsActive", True) else 0
        )
        cur.execute(sql, params)
        conn.close()
        return 1

    def update_menu_item(self, item_id: int, item: Dict[str, Any]) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        sql = """
        UPDATE MenuItems SET
            DayOfWeek = ?,
            Title = ?,
            Description = ?,
            Sides = ?,
            ImageUrl = ?,
            Rating = ?,
            ReviewsCount = ?,
            Badge = ?,
            Calories = ?,
            ProteinGrams = ?,
            DisplayOrder = ?,
            IsActive = ?
        WHERE Id = ?
        """
        params = (
            item.get("DayOfWeek", "Monday"),
            item.get("Title", ""),
            item.get("Description", ""),
            item.get("Sides", ""),
            item.get("ImageUrl", ""),
            float(item.get("Rating", 4.9)),
            int(item.get("ReviewsCount", 100)),
            item.get("Badge", ""),
            int(item.get("Calories", 500)),
            int(item.get("ProteinGrams", 30)),
            int(item.get("DisplayOrder", 1)),
            1 if item.get("IsActive", True) else 0,
            item_id
        )
        cur.execute(sql, params)
        conn.close()
        return True

    def delete_menu_item(self, item_id: int) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM MenuItems WHERE Id = ?", (item_id,))
        conn.close()
        return True

    # --- PLANS CRUD ---
    def get_plans(self) -> List[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM Plans ORDER BY Price ASC")
        plans = self.rows_to_dicts(cur, cur.fetchall())
        conn.close()
        for p in plans:
            try:
                p["features"] = json.loads(p.get("FeaturesJson") or "[]")
            except Exception:
                p["features"] = []
        return plans

    def update_plan(self, plan_id: int, p: Dict[str, Any]) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        features_json = json.dumps(p.get("features", [])) if isinstance(p.get("features"), list) else p.get("FeaturesJson", "[]")
        sql = """
        UPDATE Plans SET
            Name = ?,
            LunchesCount = ?,
            Price = ?,
            PeriodText = ?,
            Badge = ?,
            Description = ?,
            FeaturesJson = ?,
            IsPopular = ?
        WHERE Id = ?
        """
        params = (
            p.get("Name", ""),
            int(p.get("LunchesCount", 5)),
            float(p.get("Price", 3500)),
            p.get("PeriodText", ""),
            p.get("Badge", ""),
            p.get("Description", ""),
            features_json,
            1 if p.get("IsPopular") else 0,
            plan_id
        )
        cur.execute(sql, params)
        conn.close()
        return True

    def add_plan(self, p: Dict[str, Any]) -> int:
        conn = self.get_conn()
        cur = conn.cursor()
        features_json = json.dumps(p.get("features", [])) if isinstance(p.get("features"), list) else p.get("FeaturesJson", "[]")
        plan_code = p.get("PlanCode") or f"plan_{int(time.time())}"
        sql = """
        INSERT INTO Plans (PlanCode, Name, LunchesCount, Price, PeriodText, Badge, Description, FeaturesJson, IsPopular, IsActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            plan_code,
            p.get("Name", "New Meal Plan"),
            int(p.get("LunchesCount", 5)),
            float(p.get("Price", 3500)),
            p.get("PeriodText", "Weekly"),
            p.get("Badge", ""),
            p.get("Description", ""),
            features_json,
            1 if p.get("IsPopular") else 0,
            1
        )
        cur.execute(sql, params)
        conn.close()
        return 1

    def delete_plan(self, plan_id: int) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM Plans WHERE Id = ?", (plan_id,))
        conn.close()
        return True

    # --- DELIVERY ZONES CRUD ---
    def get_delivery_zones(self) -> List[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM DeliveryZones ORDER BY DisplayOrder ASC")
        zones = self.rows_to_dicts(cur, cur.fetchall())
        conn.close()
        return zones

    def add_delivery_zone(self, z: Dict[str, Any]) -> int:
        conn = self.get_conn()
        cur = conn.cursor()
        sql = """
        INSERT INTO DeliveryZones (ZoneName, CoverageDetails, IsFree, DailyFee, TimingWindow, DisplayOrder, IsActive)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        """
        params = (
            z.get("ZoneName", "New Zone"),
            z.get("CoverageDetails", ""),
            1 if z.get("IsFree") else 0,
            float(z.get("DailyFee", 0)),
            z.get("TimingWindow", "12:30 PM – 1:30 PM"),
            int(z.get("DisplayOrder", 99))
        )
        cur.execute(sql, params)
        conn.close()
        return 1

    def delete_delivery_zone(self, zone_id: int) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM DeliveryZones WHERE Id = ?", (zone_id,))
        conn.close()
        return True

    def update_delivery_zone(self, zone_id: int, z: Dict[str, Any]) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        sql = """
        UPDATE DeliveryZones SET
            ZoneName = ?,
            CoverageDetails = ?,
            IsFree = ?,
            DailyFee = ?,
            TimingWindow = ?
        WHERE Id = ?
        """
        params = (
            z.get("ZoneName", ""),
            z.get("CoverageDetails", ""),
            1 if z.get("IsFree") else 0,
            float(z.get("DailyFee", 0)),
            z.get("TimingWindow", "12:30 PM – 1:30 PM"),
            zone_id
        )
        cur.execute(sql, params)
        conn.close()
        return True

    # --- LEADS CRUD ---
    def get_leads(self) -> List[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        plan_col = "[Plan]" if self.use_sql_server else "Plan"
        cur.execute(f"SELECT Id, Timestamp, Name, Email, WhatsApp, Area, {plan_col} AS [Plan], AiSummary, Source, Status, Notes FROM Leads ORDER BY Id DESC")
        leads = self.rows_to_dicts(cur, cur.fetchall())
        conn.close()
        return leads

    def insert_lead(self, lead: Dict[str, Any]) -> int:
        conn = self.get_conn()
        cur = conn.cursor()
        plan_col = "[Plan]" if self.use_sql_server else "Plan"
        sql = f"""
        INSERT INTO Leads (Name, Email, WhatsApp, Area, {plan_col}, AiSummary, Source, Status, Notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            lead.get("name", ""),
            lead.get("email", ""),
            lead.get("whatsapp", ""),
            lead.get("area", ""),
            lead.get("plan", ""),
            lead.get("ai_summary", ""),
            lead.get("source", "Website Form"),
            lead.get("status", "New"),
            lead.get("notes", "")
        )
        cur.execute(sql, params)
        conn.close()
        return 1

    def update_lead(self, lead_id: int, status: str, notes: Optional[str] = None) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        if notes is not None:
            cur.execute("UPDATE Leads SET Status = ?, Notes = ? WHERE Id = ?", (status, notes, lead_id))
        else:
            cur.execute("UPDATE Leads SET Status = ? WHERE Id = ?", (status, lead_id))
        conn.close()
        return True

    def delete_lead(self, lead_id: int) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM Leads WHERE Id = ?", (lead_id,))
        conn.close()
        return True

    # --- FAQS CRUD ---
    def get_faqs(self) -> List[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM FAQs ORDER BY DisplayOrder ASC")
        faqs = self.rows_to_dicts(cur, cur.fetchall())
        conn.close()
        return faqs

    def add_faq(self, faq: Dict[str, Any]) -> int:
        conn = self.get_conn()
        cur = conn.cursor()
        sql = "INSERT INTO FAQs (Question, Answer, Category, DisplayOrder, IsActive) VALUES (?, ?, ?, ?, 1)"
        params = (
            faq.get("Question", ""),
            faq.get("Answer", ""),
            faq.get("Category", "General"),
            int(faq.get("DisplayOrder", 1))
        )
        cur.execute(sql, params)
        conn.close()
        return 1

    def update_faq(self, faq_id: int, faq: Dict[str, Any]) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        sql = "UPDATE FAQs SET Question = ?, Answer = ?, Category = ?, DisplayOrder = ? WHERE Id = ?"
        params = (
            faq.get("Question", ""),
            faq.get("Answer", ""),
            faq.get("Category", "General"),
            int(faq.get("DisplayOrder", 1)),
            faq_id
        )
        cur.execute(sql, params)
        conn.close()
        return True

    def delete_faq(self, faq_id: int) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM FAQs WHERE Id = ?", (faq_id,))
        conn.close()
        return True

    # --- TESTIMONIALS CRUD ---
    def get_testimonials(self) -> List[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM Testimonials ORDER BY DisplayOrder ASC")
        testimonials = self.rows_to_dicts(cur, cur.fetchall())
        conn.close()
        return testimonials

    def add_testimonial(self, test: Dict[str, Any]) -> int:
        conn = self.get_conn()
        cur = conn.cursor()
        sql = "INSERT INTO Testimonials (CustomerName, CompanyArea, Rating, ReviewText, AvatarUrl, DisplayOrder, IsActive) VALUES (?, ?, ?, ?, ?, ?, 1)"
        params = (
            test.get("CustomerName", "Valued Customer"),
            test.get("CompanyArea", "Karachi Corporate"),
            float(test.get("Rating", 5.0)),
            test.get("ReviewText", ""),
            test.get("AvatarUrl", "assets/avatars/avatar1.jpg"),
            int(test.get("DisplayOrder", 1))
        )
        cur.execute(sql, params)
        conn.close()
        return 1

    def update_testimonial(self, test_id: int, test: Dict[str, Any]) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        sql = "UPDATE Testimonials SET CustomerName = ?, CompanyArea = ?, Rating = ?, ReviewText = ?, AvatarUrl = ?, DisplayOrder = ? WHERE Id = ?"
        params = (
            test.get("CustomerName", ""),
            test.get("CompanyArea", ""),
            float(test.get("Rating", 5.0)),
            test.get("ReviewText", ""),
            test.get("AvatarUrl", "assets/avatars/avatar1.jpg"),
            int(test.get("DisplayOrder", 1)),
            test_id
        )
        cur.execute(sql, params)
        conn.close()
        return True

    def delete_testimonial(self, test_id: int) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM Testimonials WHERE Id = ?", (test_id,))
        conn.close()
        return True

    # --- SETTINGS CRUD ---
    def get_settings(self) -> Dict[str, str]:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("SELECT SettingKey, SettingValue FROM SiteSettings")
        rows = self.rows_to_dicts(cur, cur.fetchall())
        conn.close()
        return {r["SettingKey"]: r["SettingValue"] for r in rows}

    def update_settings(self, settings_dict: Dict[str, str]) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        for k, v in settings_dict.items():
            cur.execute("UPDATE SiteSettings SET SettingValue = ? WHERE SettingKey = ?", (str(v), k))
        conn.close()
        return True

    # --- CUSTOMER USER AUTH & PORTAL ---
    def register_customer(self, full_name: str, email: str, password: str, whatsapp: str, area: str, office_address: str = "") -> Optional[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        try:
            # Check if email exists
            cur.execute("SELECT Id FROM Customers WHERE Email = ?", (email.lower(),))
            if cur.fetchone():
                conn.close()
                return None # Email already exists

            sql = """
            INSERT INTO Customers (FullName, Email, PasswordHash, WhatsApp, Area, OfficeAddress, ActivePlan, LunchesRemaining, SubscriptionStatus)
            VALUES (?, ?, ?, ?, ?, ?, 'Weekly Trial', 5, 'Active')
            """
            cur.execute(sql, (full_name, email.lower(), password, whatsapp, area, office_address))
            
            # Fetch newly created customer
            cur.execute("SELECT Id, FullName, Email, WhatsApp, Area, OfficeAddress, ActivePlan, LunchesRemaining, SubscriptionStatus, ProfileImage FROM Customers WHERE Email = ?", (email.lower(),))
            row = cur.fetchone()
            conn.close()
            if not row:
                return None
            return dict(zip([c[0] for c in cur.description], row)) if not hasattr(row, "keys") else dict(row)
        except Exception as e:
            print(f"[DB Error] Customer register: {e}")
            conn.close()
            return None

    def login_customer(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("SELECT Id, FullName, Email, PasswordHash, WhatsApp, Area, OfficeAddress, ActivePlan, LunchesRemaining, SubscriptionStatus, ProfileImage FROM Customers WHERE Email = ?", (email.lower(),))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        user = dict(zip([c[0] for c in cur.description], row)) if not hasattr(row, "keys") else dict(row)
        if user.get("PasswordHash") == password:
            user.pop("PasswordHash", None)
            return user
        return None

    def get_customer_profile(self, customer_id: int) -> Optional[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("SELECT Id, FullName, Email, WhatsApp, Area, OfficeAddress, ActivePlan, LunchesRemaining, SubscriptionStatus, ProfileImage, CreatedAt FROM Customers WHERE Id = ?", (customer_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return dict(zip([c[0] for c in cur.description], row)) if not hasattr(row, "keys") else dict(row)

    def update_customer_profile(self, customer_id: int, full_name: str, whatsapp: str, area: str, office_address: str, profile_image: Optional[str] = None) -> Optional[Dict[str, Any]]:
        conn = self.get_conn()
        cur = conn.cursor()
        try:
            if profile_image is not None and profile_image.strip():
                cur.execute(
                    "UPDATE Customers SET FullName = ?, WhatsApp = ?, Area = ?, OfficeAddress = ?, ProfileImage = ? WHERE Id = ?",
                    (full_name, whatsapp, area, office_address, profile_image, customer_id)
                )
            else:
                cur.execute(
                    "UPDATE Customers SET FullName = ?, WhatsApp = ?, Area = ?, OfficeAddress = ? WHERE Id = ?",
                    (full_name, whatsapp, area, office_address, customer_id)
                )
            cur.execute(
                "SELECT Id, FullName, Email, WhatsApp, Area, OfficeAddress, ActivePlan, LunchesRemaining, SubscriptionStatus, ProfileImage, CreatedAt FROM Customers WHERE Id = ?",
                (customer_id,)
            )
            row = cur.fetchone()
            conn.close()
            if not row:
                return None
            return dict(zip([c[0] for c in cur.description], row)) if not hasattr(row, "keys") else dict(row)
        except Exception as e:
            print(f"[DB Error] update_customer_profile: {e}")
            conn.close()
            return None

    def pause_customer_subscription(self, customer_id: int) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE Customers SET SubscriptionStatus = 'Paused' WHERE Id = ?", (customer_id,))
        conn.close()
        return True

    def resume_customer_subscription(self, customer_id: int) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE Customers SET SubscriptionStatus = 'Active' WHERE Id = ?", (customer_id,))
        conn.close()
        return True

    def update_customer_address(self, customer_id: int, new_address: str, area: str) -> bool:
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE Customers SET OfficeAddress = ?, Area = ? WHERE Id = ?", (new_address, area, customer_id))
        conn.close()
        return True

    # --- AUTHENTICATION ---
    def verify_admin(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        clean_user = str(username or "").strip().lower()
        admin_aliases = ["admin", "zaiqaboxkarachi@gmail.com", "admin@zaiqabox.pk", "admin@zaiqabox.com"]
        
        conn = self.get_conn()
        cur = conn.cursor()
        if clean_user in admin_aliases:
            cur.execute("SELECT Id, Username, FullName, Role, PasswordHash FROM AdminUsers WHERE LOWER(Username) = 'admin' OR LOWER(Username) = ?", (clean_user,))
        else:
            cur.execute("SELECT Id, Username, FullName, Role, PasswordHash FROM AdminUsers WHERE LOWER(Username) = ?", (clean_user,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        user = dict(zip([col[0] for col in cur.description], row)) if not hasattr(row, "keys") else dict(row)
        if user.get("PasswordHash") == password: # Simple plaintext / hash comparison
            return {
                "id": user["Id"],
                "username": user["Username"],
                "fullName": user["FullName"],
                "role": user["Role"]
            }
        return None


# Global singleton instance
db = DatabaseManager()
