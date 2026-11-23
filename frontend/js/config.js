/**
 * ZaiqaBox Karachi - Central Client Configuration
 * Edit prices, delivery zones, WhatsApp number, and text here.
 * All frontend elements dynamically read from this file.
 */

const CONFIG = {
  brand: {
    name: "ZaiqaBox Karachi",
    tagline: "Fresh, Home-Cooked, Portion-Controlled Office Lunches",
    city: "Karachi, Pakistan",
    email: "zaiqaboxkarachi@gmail.com",
    whatsappNumber: "923378034564", // Format: 923XXXXXXXXX (no + or spaces for wa.me links)
    displayWhatsapp: "+92 337 8034564",
    logoPath: "assets/logo.png",
    bannerPath: "assets/banner.jpg",
    pdfPath: "assets/office_lunch_guide.pdf",
    complianceNote: "For any medical or dietary questions, our human nutritionist will assist you."
  },

  announcement: {
    enabled: true,
    text: "Order before 8:00 PM for tomorrow's lunch delivery | Free delivery in DHA, Clifton & PECHS (12:30 PM – 1:30 PM)"
  },

  plans: [
    {
      id: "weekly",
      name: "Weekly Trial",
      lunches: 5,
      price: 3500,
      formattedPrice: "PKR 3,500",
      perMeal: "PKR 700 / meal",
      period: "5 Lunches (Mon – Fri)",
      popular: false,
      badge: "Popular for Trying",
      description: "Ideal for corporate professionals experiencing nutritious home-cooked office lunches for the first week.",
      features: [
        "5 fresh home-cooked lunches (Mon-Fri)",
        "Nutritionist-reviewed portions",
        "Free delivery in DHA, Clifton & PECHS",
        "Arrives fresh between 12:30 – 1:30 PM",
        "Pause anytime before 8:00 PM prior"
      ]
    },
    {
      id: "monthly",
      name: "Monthly Executive",
      lunches: 20,
      price: 12500,
      formattedPrice: "PKR 12,500",
      perMeal: "PKR 625 / meal (Save PKR 1,500)",
      period: "20 Lunches (4 Weeks)",
      popular: true,
      badge: "Most Popular / Best Value",
      description: "The complete hassle-free office lunch subscription for corporate executives with highest savings.",
      features: [
        "20 fresh home-cooked lunches (4 weeks)",
        "Save PKR 1,500 compared to weekly renew",
        "Nutritionist-reviewed balanced rotation",
        "Free delivery in DHA, Clifton & PECHS",
        "Arrives fresh between 12:30 – 1:30 PM",
        "Flexible pause & credit rollover"
      ]
    }
  ],

  delivery: {
    freeZones: ["DHA", "Clifton", "PECHS"],
    window: "12:30 PM – 1:30 PM",
    outsideZoneFeePerDay: 200,
    pauseDeadline: "8:00 PM the night prior",
    zonesInfo: [
      {
        name: "DHA (Defence)",
        phases: "Phases 1 through 8",
        status: "Free Delivery",
        timing: "12:30 PM – 1:30 PM"
      },
      {
        name: "Clifton",
        phases: "All Blocks (Block 1 - 9, Sea View, Bilawal Chwrangi)",
        status: "Free Delivery",
        timing: "12:30 PM – 1:30 PM"
      },
      {
        name: "PECHS",
        phases: "Blocks 1, 2, 3, 6 & Extension",
        status: "Free Delivery",
        timing: "12:30 PM – 1:30 PM"
      },
      {
        name: "Other Karachi Areas",
        phases: "Gulshan, Saddar, I.I. Chundrigar, Bahadurabad, etc.",
        status: "PKR 200 / day",
        timing: "12:30 PM – 1:30 PM"
      }
    ]
  },

  social: {
    instagram: "https://instagram.com/zaiqabox",
    facebook: "https://facebook.com/zaiqabox",
    tiktok: "https://tiktok.com/@zaiqabox"
  },

  api: {
    baseUrl: "" // Relative to current domain
  },

  analytics: {
    googleAnalyticsId: "", // Replace with G-XXXXXXXXXX
    metaPixelId: "",       // Replace with XXXXXXXXXXXXXXX
    debugMode: true        // Logs all events to browser console
  }
};

// Freeze configuration in production-like manner
if (typeof Object.freeze === "function") {
  Object.freeze(CONFIG);
}
