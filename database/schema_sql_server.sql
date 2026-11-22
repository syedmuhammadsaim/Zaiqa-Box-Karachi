-- ====================================================================
-- ZaiqaBox Karachi - SQL Server Database Setup Script (SSMS Compatible)
-- Database: ZaiqaBoxDB
-- Run this script in SQL Server Management Studio (SSMS) to create
-- or reset the database and seed initial verified corporate data.
-- ====================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ZaiqaBoxDB')
BEGIN
    CREATE DATABASE [ZaiqaBoxDB];
    PRINT 'Database [ZaiqaBoxDB] created.';
END
GO

USE [ZaiqaBoxDB];
GO

-- 1. Admin Users Table
IF OBJECT_ID(N'dbo.AdminUsers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdminUsers (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        FullName NVARCHAR(100) NOT NULL,
        Role NVARCHAR(20) DEFAULT 'admin',
        CreatedAt DATETIME DEFAULT GETDATE(),
        LastLogin DATETIME NULL
    );
    PRINT 'Table [AdminUsers] created.';
END
GO

-- 2. Menu Items Table (with Images, Descriptions, Star Ratings, Calories)
IF OBJECT_ID(N'dbo.MenuItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        DayOfWeek NVARCHAR(20) NOT NULL, -- Monday, Tuesday, Wednesday, Thursday, Friday
        Title NVARCHAR(150) NOT NULL,
        Description NVARCHAR(600) NOT NULL,
        Sides NVARCHAR(300) NOT NULL,
        ImageUrl NVARCHAR(500) NOT NULL,
        Rating DECIMAL(2,1) DEFAULT 4.9,
        ReviewsCount INT DEFAULT 132,
        Badge NVARCHAR(50) DEFAULT 'Nutritionist-Choice',
        Calories INT DEFAULT 520,
        ProteinGrams INT DEFAULT 36,
        DisplayOrder INT DEFAULT 1,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [MenuItems] created.';
END
GO

-- 3. Subscription Plans Table
IF OBJECT_ID(N'dbo.Plans', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Plans (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PlanCode NVARCHAR(50) NOT NULL UNIQUE,
        Name NVARCHAR(100) NOT NULL,
        LunchesCount INT NOT NULL,
        Price DECIMAL(10,2) NOT NULL,
        PeriodText NVARCHAR(100) NOT NULL,
        Badge NVARCHAR(100) NULL,
        Description NVARCHAR(600) NOT NULL,
        FeaturesJson NVARCHAR(MAX) NOT NULL,
        IsPopular BIT DEFAULT 0,
        IsActive BIT DEFAULT 1,
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [Plans] created.';
END
GO

-- 4. Delivery Zones Table
IF OBJECT_ID(N'dbo.DeliveryZones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DeliveryZones (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ZoneName NVARCHAR(100) NOT NULL,
        CoverageDetails NVARCHAR(300) NOT NULL,
        IsFree BIT DEFAULT 1,
        DailyFee DECIMAL(10,2) DEFAULT 0.00,
        TimingWindow NVARCHAR(100) DEFAULT '12:30 PM – 1:30 PM',
        DisplayOrder INT DEFAULT 1,
        IsActive BIT DEFAULT 1,
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [DeliveryZones] created.';
END
GO

-- 5. Captured Leads Table
IF OBJECT_ID(N'dbo.Leads', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Leads (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Timestamp DATETIME DEFAULT GETDATE(),
        Name NVARCHAR(100) NOT NULL,
        Email NVARCHAR(150) NOT NULL,
        WhatsApp NVARCHAR(50) NOT NULL,
        Area NVARCHAR(50) NOT NULL,
        [Plan] NVARCHAR(100) NOT NULL,
        AiSummary NVARCHAR(600) NULL,
        Source NVARCHAR(50) DEFAULT 'Website Form',
        Status NVARCHAR(50) DEFAULT 'New', -- 'New', 'Contacted', 'Subscribed', 'Archived'
        Notes NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [Leads] created.';
END
GO

-- 6. Customers Table (User Registration & Subscriptions)
IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(150) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        WhatsApp NVARCHAR(50) NOT NULL,
        Area NVARCHAR(50) NOT NULL,
        OfficeAddress NVARCHAR(300) NULL,
        ActivePlan NVARCHAR(100) DEFAULT 'Weekly Trial',
        LunchesRemaining INT DEFAULT 5,
        SubscriptionStatus NVARCHAR(50) DEFAULT 'Active', -- 'Active', 'Paused', 'Inactive'
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [Customers] created.';
END
GO

-- 7. Site Settings Table (Key/Value for Announcement, Contact, Policies)
IF OBJECT_ID(N'dbo.SiteSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SiteSettings (
        SettingKey NVARCHAR(100) PRIMARY KEY,
        SettingValue NVARCHAR(MAX) NOT NULL,
        Description NVARCHAR(300) NULL,
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table [SiteSettings] created.';
END
GO

-- ====================================================================
-- SEED INITIAL DATA
-- ====================================================================

-- 1. Default Admin User (username: admin, password: zaiqabox2026)
IF NOT EXISTS (SELECT 1 FROM dbo.AdminUsers WHERE Username = 'admin')
BEGIN
    INSERT INTO dbo.AdminUsers (Username, PasswordHash, FullName, Role)
    VALUES ('admin', 'zaiqabox2026', 'ZaiqaBox Operations Admin', 'admin');
    PRINT 'Admin user seeded.';
END
GO

-- 2. Default Menu Items (Monday - Friday) with Rich Details & Star Ratings
IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems)
BEGIN
    INSERT INTO dbo.MenuItems (DayOfWeek, Title, Description, Sides, ImageUrl, Rating, ReviewsCount, Badge, Calories, ProteinGrams, DisplayOrder, IsActive)
    VALUES 
    (
        'Monday',
        'Tender Chicken Tikka Rice Bowl',
        'Flame-grilled boneless chicken breast marinated in traditional low-oil spices, placed over aromatic steamed brown and basmati rice.',
        'Kachumber garden salad, mint yogurt raita & lemon wedge',
        'assets/menu/monday_tikka_bowl.jpg',
        4.9,
        148,
        'High Protein',
        520,
        38,
        1,
        1
    ),
    (
        'Tuesday',
        'Homestyle Daal Palak & Tawa Rotis',
        'Slow-simmered protein-rich yellow lentils gently tempered with fresh organic spinach, cumin seeds, garlic, and pure olive-blend tarka.',
        'Two whole-wheat stone-ground tawa rotis, cucumber raita & fresh salad',
        'assets/menu/tuesday_daal_palak.jpg',
        4.8,
        124,
        'Iron & Fiber Rich',
        460,
        22,
        2,
        1
    ),
    (
        'Wednesday',
        'Light Desi Chicken Handi',
        'Tender chicken cubes braised in a velvety roasted tomato, ginger, and cracked black pepper reduction, prepared with minimal oil.',
        'Two whole-wheat chapatis, sliced cucumbers, and pickled radish',
        'assets/menu/wednesday_chicken_handi.jpg',
        4.9,
        162,
        'Chef Special',
        540,
        36,
        3,
        1
    ),
    (
        'Thursday',
        'Spiced Chana Medley & Matar Pulao',
        'Tender garbanzo chickpeas stewed in an aromatic whole-spice masala, served with fragrant basmati green pea pulao for sustained energy.',
        'Chilled cucumber-mint raita, onion rings & lemon dressing',
        'assets/menu/thursday_chana_pulao.jpg',
        4.8,
        119,
        'Plant Powered',
        490,
        24,
        4,
        1
    ),
    (
        'Friday',
        'Grilled Fish Fillet / Herb Cutlets',
        'Pan-seared ocean fish or crisp herb chicken cutlets seasoned with crushed black pepper, sea salt, oregano, and cold-pressed mustard oil.',
        'Fluffy steamed herbed rice, charred bell peppers & garlic dipping sauce',
        'assets/menu/friday_grilled_fish.jpg',
        5.0,
        185,
        'Weekend Special',
        510,
        40,
        5,
        1
    );
    PRINT 'Menu items seeded.';
END
GO

-- 3. Default Verified Meal Plans
IF NOT EXISTS (SELECT 1 FROM dbo.Plans)
BEGIN
    INSERT INTO dbo.Plans (PlanCode, Name, LunchesCount, Price, PeriodText, Badge, Description, FeaturesJson, IsPopular, IsActive)
    VALUES 
    (
        'weekly',
        'Weekly Trial',
        5,
        3500.00,
        '5 Lunches (Mon – Fri)',
        'Popular for Trying',
        'Ideal for corporate professionals experiencing nutritious home-cooked office lunches for the first week.',
        '["5 fresh home-cooked lunches (Mon-Fri)","Nutritionist-reviewed portions","Free delivery in DHA, Clifton & PECHS","Arrives fresh between 12:30 – 1:30 PM","Pause anytime before 8:00 PM prior"]',
        0,
        1
    ),
    (
        'monthly',
        'Monthly Executive',
        20,
        12500.00,
        '20 Lunches (4 Weeks)',
        'Most Popular / Best Value',
        'The complete hassle-free office lunch subscription for corporate executives with highest savings.',
        '["20 fresh home-cooked lunches (4 weeks)","Save PKR 1,500 compared to weekly renew","Nutritionist-reviewed balanced rotation","Free delivery in DHA, Clifton & PECHS","Arrives fresh between 12:30 – 1:30 PM","Flexible pause & credit rollover"]',
        1,
        1
    );
    PRINT 'Plans seeded.';
END
GO

-- 4. Default Delivery Zones
IF NOT EXISTS (SELECT 1 FROM dbo.DeliveryZones)
BEGIN
    INSERT INTO dbo.DeliveryZones (ZoneName, CoverageDetails, IsFree, DailyFee, TimingWindow, DisplayOrder, IsActive)
    VALUES
    ('DHA (Defence)', 'Phases 1 through 8', 1, 0.00, '12:30 PM – 1:30 PM', 1, 1),
    ('Clifton', 'All Blocks (Block 1 - 9, Sea View, Bilawal Chwrangi)', 1, 0.00, '12:30 PM – 1:30 PM', 2, 1),
    ('PECHS', 'Blocks 1, 2, 3, 6 & Extension', 1, 0.00, '12:30 PM – 1:30 PM', 3, 1),
    ('Other Karachi Areas', 'Gulshan, Saddar, I.I. Chundrigar, Bahadurabad, etc.', 0, 200.00, '12:30 PM – 1:30 PM', 4, 1);
    PRINT 'Delivery zones seeded.';
END
GO

-- 5. Default Settings
IF NOT EXISTS (SELECT 1 FROM dbo.SiteSettings)
BEGIN
    INSERT INTO dbo.SiteSettings (SettingKey, SettingValue, Description)
    VALUES
    ('brand_name', 'ZaiqaBox Karachi', 'Brand business name'),
    ('whatsapp_number', '923001234567', 'Corporate WhatsApp number (no + or spaces)'),
    ('display_whatsapp', '+92 300 1234567', 'Formatted display phone number'),
    ('email', 'contact@zaiqabox.pk', 'Official customer support email'),
    ('announcement_text', 'Order before 8:00 PM for tomorrow''s lunch delivery | Free delivery in DHA, Clifton & PECHS (12:30 PM – 1:30 PM)', 'Announcement banner at top of site'),
    ('outside_zone_fee_per_day', '200', 'Daily delivery surcharge for locations outside free zones'),
    ('delivery_window', '12:30 PM – 1:30 PM', 'Standard lunch drop-off time window'),
    ('pause_deadline', '8:00 PM the night prior', 'Strict cutoff for next-day pause or address change'),
    ('compliance_note', 'For any medical or dietary questions, our human nutritionist will assist you.', 'Mandatory compliance statement');
    PRINT 'Site settings seeded.';
END
GO

PRINT '=======================================================';
PRINT 'ZaiqaBoxDB setup and seeding completed successfully!';
PRINT '=======================================================';
GO
