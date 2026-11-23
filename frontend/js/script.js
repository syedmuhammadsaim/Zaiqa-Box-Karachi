/**
 * ZaiqaBox Karachi - Core Site Logic (Dynamic SQL Server / SSMS Sync)
 * Binds public data, delivery calculator, lead capture, and event tracking.
 */

document.addEventListener("DOMContentLoaded", () => {
  initIntroSplash(); // Cinematic Logo Break / Shatter Intro
  initNavbarAndMobileMenu();
  renderDynamicConfig();
  fetchDynamicSiteData(); // Sync live with SQL Server / Admin Panel
  initDeliveryCalculator();
  initFaqAccordion();
  initLeadForm();
  initEventTracking();
  initCustomerAuthAndPortal(); // Customer Registration, Login & Portal
});

function initIntroSplash() {
  const splash = document.getElementById("introSplash");
  const skipBtn = document.getElementById("skipSplashBtn");
  if (!splash) return;

  // ZERO-LAG REFRESH: If user already saw intro in this session, skip immediately!
  if (sessionStorage.getItem("zaiqabox_intro_seen")) {
    document.body.classList.remove("splash-loading");
    splash.style.display = "none";
    if (splash.parentNode) splash.parentNode.removeChild(splash);
    return;
  }

  // Mark as seen for all subsequent refreshes in this session
  sessionStorage.setItem("zaiqabox_intro_seen", "true");

  let hasEnded = false;

  function shatterAndDismiss() {
    if (hasEnded) return;
    hasEnded = true;

    // Trigger smooth parting immediately
    splash.classList.add("cracking");
    setTimeout(() => {
      splash.classList.add("shattered");
      document.body.classList.remove("splash-loading");
    }, 100);

    setTimeout(() => {
      splash.classList.add("dismissed");
    }, 450);

    setTimeout(() => {
      splash.style.display = "none";
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 950);
  }

  // Click anywhere or tap Skip to dismiss smoothly
  if (skipBtn) {
    skipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      shatterAndDismiss();
    });
  }
  splash.addEventListener("click", shatterAndDismiss);

  // Silky Smooth Cinematic Timeline:
  // 1. 0.0s - 0.6s: Whole logo displays with breathing golden aura
  // 2. 0.6s: Golden energy illuminates the logo
  setTimeout(() => {
    if (!hasEnded) splash.classList.add("cracking");
  }, 600);

  // 3. 1.1s: Logo gently parts & velvet curtains glide open smoothly
  setTimeout(() => {
    if (!hasEnded) {
      splash.classList.add("shattered");
      document.body.classList.remove("splash-loading");
    }
  }, 1100);

  // 4. 1.8s: Fully reveals the website with silky fade
  setTimeout(() => {
    if (!hasEnded) {
      splash.classList.add("dismissed");
      setTimeout(() => {
        splash.style.display = "none";
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 600);
    }
  }, 1800);
}

function trackEvent(eventName, params = {}) {
  if (CONFIG.analytics && CONFIG.analytics.debugMode) {
    console.log(`[Analytics Event] ${eventName}:`, params);
  }
  if (typeof window.gtag === "function" && CONFIG.analytics.googleAnalyticsId) {
    window.gtag("event", eventName, params);
  }
  if (typeof window.fbq === "function" && CONFIG.analytics.metaPixelId) {
    window.fbq("track", eventName, params);
  }
}

function initNavbarAndMobileMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-link");

  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      hamburgerBtn.classList.toggle("active", isOpen);
      hamburgerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
        hamburgerBtn.classList.remove("active");
        hamburgerBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  const yearEl = document.getElementById("currentYear");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

function createWhatsAppUrl(message) {
  const phone = (CONFIG.brand && CONFIG.brand.whatsappNumber) || "923378034564";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Fetch live data from SQL Server (ZaiqaBoxDB)
async function fetchDynamicSiteData() {
  try {
    const res = await fetch("/api/site/data");
    if (!res.ok) return;
    const data = await res.json();

    // 1. Update announcement text if changed
    if (data.settings && data.settings.announcement_text) {
      const el = document.getElementById("announcementText");
      if (el) el.innerHTML = data.settings.announcement_text;
    }

    // 2. Render live menu items with images, descriptions and star ratings
    if (data.menu && data.menu.length > 0) {
      renderLiveMenu(data.menu);
    }

    // 3. Update plans if returned from database
    if (data.plans && data.plans.length > 0) {
      renderPlansFromDB(data.plans);
    }

    // 4. Update customer reviews / testimonials
    if (data.testimonials && data.testimonials.length > 0) {
      renderTestimonialsFromDB(data.testimonials);
    }

    // 5. Update FAQs
    if (data.faqs && data.faqs.length > 0) {
      renderFaqsFromDB(data.faqs);
    }

    // 6. Update Promo Video if set
    if (data.promo_video && data.promo_video.src) {
      const vid = document.getElementById("kitchenVideoPlayer");
      if (vid && data.promo_video.src) {
        vid.src = data.promo_video.src;
        if (data.promo_video.poster) vid.poster = data.promo_video.poster;
      }
    }
  } catch (err) {
    console.warn("[Site Data Sync] Using local config fallback.", err);
  }
}

function renderTestimonialsFromDB(testimonials) {
  const container = document.getElementById("testimonialsGrid");
  if (!container || !testimonials || testimonials.length === 0) return;

  container.innerHTML = testimonials.map(t => {
    const starCount = Math.round(t.Rating || 5);
    const stars = "★".repeat(starCount);
    return `
      <div class="testimonial-card">
        <div class="testimonial-rating" style="color: #F5A623;">${stars}</div>
        <p class="testimonial-text">"${t.ReviewText}"</p>
        <div class="testimonial-author">
          <strong>${t.CustomerName}</strong>
          <span>${t.CompanyArea}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderFaqsFromDB(faqs) {
  const container = document.getElementById("faqAccordion");
  if (!container || !faqs || faqs.length === 0) return;

  container.innerHTML = faqs.map(f => `
    <div class="faq-item">
      <button class="faq-question-btn" type="button" aria-expanded="false">
        <span>${f.Question}</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer">
        ${f.Answer}
      </div>
    </div>
  `).join('');

  initFaqAccordion();
}

// Render menu items with rich photos, star ratings, and full descriptions
function renderLiveMenu(menuItems) {
  const menuContainer = document.getElementById("menuGrid");
  if (!menuContainer) return;

  menuContainer.innerHTML = menuItems.map(dish => {
    const stars = "★".repeat(Math.round(dish.Rating || 5));
    const waOrderMsg = `Hi ZaiqaBox! I would like to order the ${dish.DayOfWeek} special: ${dish.Title}. Please confirm delivery.`;
    const waUrl = createWhatsAppUrl(waOrderMsg);

    return `
      <div class="menu-card">
        <div class="menu-card-img-wrap">
          <img src="${dish.ImageUrl}" alt="${dish.Title}" class="menu-card-img" onerror="this.src='assets/menu/monday_tikka_bowl.jpg'">
          <div class="menu-card-badge">${dish.Badge || 'Nutritionist Choice'}</div>
          <div class="menu-card-day">${dish.DayOfWeek}</div>
        </div>
        <div class="menu-card-body">
          <div class="menu-rating-row">
            <span class="star-rating">${stars}</span>
            <strong style="color: var(--walnut); font-size: 0.95rem;">${dish.Rating || 4.9}</strong>
            <span class="rating-count">(${dish.ReviewsCount || 120}+ reviews)</span>
          </div>
          <h3 class="menu-dish-title">${dish.Title}</h3>
          <p class="menu-dish-desc">${dish.Description}</p>
          <div class="menu-sides-box">
            <strong>Sides:</strong> ${dish.Sides}
          </div>
          <div class="menu-macros-row">
            <span>🔥 ${dish.Calories} kcal</span>
            <span>🥩 ${dish.ProteinGrams}g Protein</span>
            <span>⚖️ Portion-Controlled</span>
          </div>
          <a href="${waUrl}" class="btn btn-whatsapp btn-block menu-order-dish-btn" target="_blank" rel="noopener" onclick="trackEvent('whatsapp_click', { dish: '${dish.Title}' })">
            <span>💬</span> Order ${dish.DayOfWeek}'s Lunch
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function renderPlansFromDB(dbPlans) {
  const pricingGrid = document.getElementById("pricingGrid");
  if (!pricingGrid) return;

  pricingGrid.innerHTML = dbPlans.map(plan => {
    const formattedPrice = `PKR ${parseFloat(plan.Price).toLocaleString()}`;
    const perMealCalc = `PKR ${Math.round(plan.Price / plan.LunchesCount).toLocaleString()} / meal`;
    const waMsg = `Hi ZaiqaBox! I want to order the ${plan.Name} (${formattedPrice} for ${plan.LunchesCount} lunches). Please confirm delivery.`;
    const waUrl = createWhatsAppUrl(waMsg);

    return `
      <div class="plan-card ${plan.IsPopular ? 'featured' : ''}">
        ${plan.Badge ? `<div class="plan-badge">${plan.Badge}</div>` : ''}
        <div class="plan-header">
          <h3 class="plan-name">${plan.Name}</h3>
          <div class="plan-period">${plan.PeriodText}</div>
          <div class="plan-price-wrap">
            <span class="plan-price">${formattedPrice}</span>
            <div class="plan-per-meal">${perMealCalc}</div>
          </div>
        </div>
        <p class="plan-desc">${plan.Description}</p>
        <ul class="plan-features">
          ${(plan.features || []).map(f => `<li>${f}</li>`).join('')}
        </ul>
        <a href="${waUrl}" class="btn ${plan.IsPopular ? 'btn-accent' : 'btn-primary'} btn-block" target="_blank" rel="noopener" onclick="trackEvent('whatsapp_click', { plan: '${plan.PlanCode}' })">
          <svg viewBox="0 0 448 512" width="18" height="18" fill="currentColor" style="vertical-align: middle; margin-right: 6px;"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
          <span>Order on WhatsApp</span>
        </a>
      </div>
    `;
  }).join('');
}

function renderDynamicConfig() {
  const heroWhatsappBtn = document.getElementById("heroWhatsappBtn");
  if (heroWhatsappBtn) {
    const heroMsg = "Hi ZaiqaBox! I am interested in your nutritionist-reviewed corporate lunch boxes. Please share today's menu and subscription details.";
    heroWhatsappBtn.href = createWhatsAppUrl(heroMsg);
    heroWhatsappBtn.addEventListener("click", () => trackEvent("whatsapp_click", { location: "hero" }));
  }

  const floatingWhatsapp = document.getElementById("floatingWhatsapp");
  if (floatingWhatsapp) {
    floatingWhatsapp.href = createWhatsAppUrl("Hi ZaiqaBox! I want to inquire about your corporate lunch subscription.");
    floatingWhatsapp.addEventListener("click", () => trackEvent("whatsapp_click", { location: "floating" }));
  }

  const footerWhatsapp = document.getElementById("footerWhatsappLink");
  if (footerWhatsapp) {
    footerWhatsapp.href = createWhatsAppUrl("Hi ZaiqaBox! I would like to order or ask about corporate delivery.");
  }

  // Delivery Zones Initial
  const deliveryZonesGrid = document.getElementById("deliveryZonesGrid");
  if (deliveryZonesGrid && CONFIG.delivery && CONFIG.delivery.zonesInfo) {
    deliveryZonesGrid.innerHTML = CONFIG.delivery.zonesInfo.map(zone => {
      const isFree = zone.status.toLowerCase().includes("free");
      return `
        <div class="zone-card">
          <span class="zone-status ${isFree ? 'free' : 'paid'}">${zone.status}</span>
          <h3 class="zone-name">${zone.name}</h3>
          <p class="zone-coverage">${zone.phases}</p>
          <div class="zone-time">⏰ Arrives ${zone.timing}</div>
        </div>
      `;
    }).join('');
  }
}

function initDeliveryCalculator() {
  const areaSelect = document.getElementById("calcAreaSelect");
  const planSelect = document.getElementById("calcPlanSelect");
  const basePriceEl = document.getElementById("calcBasePrice");
  const deliveryFeeEl = document.getElementById("calcDeliveryFee");
  const deliveryNoteEl = document.getElementById("calcDeliveryNote");
  const totalPriceEl = document.getElementById("calcTotalPrice");
  const calcOrderBtn = document.getElementById("calcOrderBtn");

  function updateCalculation() {
    if (!areaSelect || !planSelect) return;

    const selectedArea = areaSelect.value;
    const selectedPlanId = planSelect.value;
    const plan = CONFIG.plans.find(p => p.id === selectedPlanId) || CONFIG.plans[0];

    const isFreeZone = CONFIG.delivery.freeZones.includes(selectedArea);
    const outsideFeePerDay = CONFIG.delivery.outsideZoneFeePerDay;
    const totalDeliveryFee = isFreeZone ? 0 : outsideFeePerDay * plan.lunches;
    const grandTotal = plan.price + totalDeliveryFee;

    basePriceEl.textContent = plan.formattedPrice;

    if (isFreeZone) {
      deliveryFeeEl.textContent = "PKR 0 (Free Delivery)";
      deliveryNoteEl.className = "delivery-badge-note free";
      deliveryNoteEl.textContent = `✅ Free delivery in ${selectedArea} between 12:30 PM and 1:30 PM!`;
    } else {
      deliveryFeeEl.textContent = `PKR ${totalDeliveryFee.toLocaleString()} (PKR ${outsideFeePerDay}/day × ${plan.lunches} lunches)`;
      deliveryNoteEl.className = "delivery-badge-note paid";
      deliveryNoteEl.textContent = `⚠️ Outside free zones: PKR ${outsideFeePerDay}/day delivery charge applies.`;
    }

    totalPriceEl.textContent = `PKR ${grandTotal.toLocaleString()}`;

    const orderMsg = `Hi ZaiqaBox! I used the calculator and want to order:\nPlan: ${plan.name} (${plan.formattedPrice})\nArea: ${selectedArea}\nDelivery: ${isFreeZone ? 'Free' : `PKR ${totalDeliveryFee.toLocaleString()}`}\nTotal: PKR ${grandTotal.toLocaleString()}.\nPlease confirm delivery.`;
    calcOrderBtn.href = createWhatsAppUrl(orderMsg);
  }

  if (areaSelect && planSelect) {
    areaSelect.addEventListener("change", updateCalculation);
    planSelect.addEventListener("change", updateCalculation);
    updateCalculation();
  }

  if (calcOrderBtn) {
    calcOrderBtn.addEventListener("click", () => {
      trackEvent("whatsapp_click", {
        location: "calculator",
        area: areaSelect.value,
        plan: planSelect.value
      });
    });
  }
}

function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach(item => {
    const btn = item.querySelector(".faq-question-btn");
    btn.addEventListener("click", () => {
      const isActive = item.classList.contains("active");
      faqItems.forEach(other => {
        other.classList.remove("active");
        const otherBtn = other.querySelector(".faq-question-btn");
        if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
      });
      if (!isActive) {
        item.classList.add("active");
        btn.setAttribute("aria-expanded", "true");
        trackEvent("faq_opened", { question: btn.textContent.trim() });
      }
    });
  });
}

function initLeadForm() {
  const form = document.getElementById("leadForm");
  const successState = document.getElementById("leadSuccessState");
  const submitBtn = document.getElementById("leadSubmitBtn");
  const btnText = document.getElementById("leadBtnText");
  const btnSpinner = document.getElementById("leadBtnSpinner");
  const manualDownloadBtn = document.getElementById("leadManualDownloadBtn");
  const successWhatsappBtn = document.getElementById("leadSuccessWhatsappBtn");

  if (!form) return;

  const nameInput = document.getElementById("leadName");
  const emailInput = document.getElementById("leadEmail");
  const whatsappInput = document.getElementById("leadWhatsapp");
  const areaSelect = document.getElementById("leadArea");
  const planSelect = document.getElementById("leadPlan");
  const consentCheckbox = document.getElementById("leadConsent");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const whatsappError = document.getElementById("whatsappError");
  const consentError = document.getElementById("consentError");

  function isValidPakistaniPhone(phone) {
    const clean = phone.replace(/[\s\-\(\)]/g, "");
    return /^(\+92|92|0)?3[0-9]{9}$/.test(clean);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    nameError.classList.remove("visible");
    emailError.classList.remove("visible");
    whatsappError.classList.remove("visible");
    consentError.classList.remove("visible");

    let hasError = false;

    if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
      nameError.classList.add("visible");
      hasError = true;
    }

    if (!isValidEmail(emailInput.value.trim())) {
      emailError.classList.add("visible");
      hasError = true;
    }

    if (!isValidPakistaniPhone(whatsappInput.value.trim())) {
      whatsappError.classList.add("visible");
      hasError = true;
    }

    if (!consentCheckbox.checked) {
      consentError.classList.add("visible");
      hasError = true;
    }

    if (hasError) return;

    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      whatsapp: whatsappInput.value.trim(),
      area: areaSelect.value,
      plan: planSelect.value,
      consent: true
    };

    // If user is a Guest (not registered / logged in), prompt to activate account
    if (!currentCustomer) {
      window.pendingLeadData = payload;

      // Pre-fill registration fields with entered data
      const regName = document.getElementById("regFullName");
      const regEmail = document.getElementById("regEmail");
      const regWa = document.getElementById("regWhatsapp");
      const regArea = document.getElementById("regArea");
      if (regName) regName.value = payload.name;
      if (regEmail) regEmail.value = payload.email;
      if (regWa) regWa.value = payload.whatsapp;
      if (regArea) regArea.value = payload.area;

      // Show guest prompt banner
      const banner = document.getElementById("authGuestPromptBanner");
      if (banner) banner.style.display = "block";

      // Open Auth modal directly on Register tab
      const tabRegisterBtn = document.getElementById("tabRegisterBtn");
      if (tabRegisterBtn) tabRegisterBtn.click();
      const authModal = document.getElementById("userAuthModal");
      if (authModal) authModal.classList.add("open");
      return;
    }

    submitBtn.disabled = true;
    btnText.style.display = "none";
    btnSpinner.style.display = "inline";

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        trackEvent("form_submit", {
          area: payload.area,
          plan: payload.plan
        });

        if (currentCustomer) {
          currentCustomer.ActivePlan = payload.plan;
          localStorage.setItem("zaiqabox_customer_user", JSON.stringify(currentCustomer));
        }

        form.style.display = "none";
        successState.style.display = "block";

        const downloadUrl = data.download_url || "assets/office_lunch_guide.pdf";
        triggerPdfDownload(downloadUrl);

        if (manualDownloadBtn) {
          manualDownloadBtn.href = downloadUrl;
          manualDownloadBtn.addEventListener("click", () => {
            trackEvent("pdf_download", { trigger: "manual_click" });
          });
        }

        if (successWhatsappBtn) {
          const successMsg = `Hi ZaiqaBox! I just downloaded the nutrition guide. I am from ${payload.area} and interested in the ${payload.plan}. Please share your weekly subscription details!`;
          successWhatsappBtn.href = createWhatsAppUrl(successMsg);
        }
      } else {
        alert(data.detail || data.message || "Failed to submit. Please check your information and try again.");
      }
    } catch (err) {
      console.error("[Lead Form Error]", err);
      alert("A network error occurred. Please try again or message us on WhatsApp.");
    } finally {
      submitBtn.disabled = false;
      btnText.style.display = "inline";
      btnSpinner.style.display = "none";
    }
  });

  // Wire "Back to Form" button on success card
  const backToFormBtn = document.getElementById("leadBackToFormBtn");
  if (backToFormBtn) {
    backToFormBtn.addEventListener("click", () => {
      successState.style.display = "none";
      form.style.display = "block";
      submitBtn.disabled = false;
      btnText.style.display = "inline";
      btnSpinner.style.display = "none";
    });
  }
}

function triggerPdfDownload(url) {
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = "ZaiqaBox_Office_Nutrition_Guide.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    trackEvent("pdf_download", { trigger: "auto_download" });
  } catch (e) {
    console.error("[Download Error]", e);
  }
}

function initEventTracking() {
  const guideLinks = document.querySelectorAll('a[href="#lead-capture"]');
  guideLinks.forEach(link => {
    link.addEventListener("click", () => {
      trackEvent("guide_cta_clicked", { source: link.id || "nav_or_hero" });
    });
  });
}

/**
 * Display luxury floating welcome message with user's name for exactly 2 seconds
 */
function showWelcomeMessage(userName, subtitle = "Signed in successfully • Enjoy your premium lunch!") {
  const existing = document.getElementById("welcomeUserToast");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "welcomeUserToast";
  container.className = "welcome-toast-container";

  const cleanName = String(userName || "Customer").trim();
  const firstLetter = cleanName.charAt(0).toUpperCase() || "👋";

  container.innerHTML = `
    <div class="welcome-toast" role="alert" aria-live="assertive">
      <div class="welcome-toast-icon">${firstLetter}</div>
      <div class="welcome-toast-content">
        <div class="welcome-toast-title">Welcome back, <span>${cleanName}</span>! 👋</div>
        <div class="welcome-toast-subtitle">${subtitle}</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Display for exactly 2 seconds (2000ms), then smoothly fade out
  setTimeout(() => {
    const toast = container.querySelector(".welcome-toast");
    if (toast) {
      toast.classList.add("fade-out");
      setTimeout(() => {
        container.remove();
      }, 400);
    } else {
      container.remove();
    }
  }, 2000);
}

function showToast(message, type = "info", duration = 3000) {
  const existing = document.getElementById("genericToastNotice");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "genericToastNotice";
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.right = "24px";
  toast.style.zIndex = "99999";
  toast.style.background = type === "success" ? "#15803D" : type === "error" ? "#B91C1C" : "#1F2937";
  toast.style.color = "#FFF";
  toast.style.padding = "12px 20px";
  toast.style.borderRadius = "8px";
  toast.style.fontWeight = "600";
  toast.style.fontSize = "0.9rem";
  toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
  toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  toast.textContent = message;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

/**
 * Customer User Registration, Login & Portal Management
 */
let currentCustomer = null;

function initCustomerAuthAndPortal() {
  const authModal = document.getElementById("userAuthModal");
  const dashModal = document.getElementById("customerDashboardModal");
  const openAuthBtn = document.getElementById("openAuthModalBtn");
  const closeAuthBtn = document.getElementById("closeAuthModalBtn");
  const openDashBtn = document.getElementById("openDashboardBtn");
  const closeDashBtn = document.getElementById("closeDashboardModalBtn");
  const logoutBtn = document.getElementById("customerLogoutBtn");

  // Check saved customer session & update navbar for customer or admin
  try {
    const saved = localStorage.getItem("zaiqabox_customer_user");
    if (saved) {
      currentCustomer = JSON.parse(saved);
    }
  } catch (e) {
    currentCustomer = null;
  }
  updateNavCustomerState();

  // Open/Close Auth Modal
  if (openAuthBtn) {
    openAuthBtn.addEventListener("click", () => {
      if (authModal) authModal.classList.add("open");
    });
  }
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener("click", () => {
      if (authModal) authModal.classList.remove("open");
    });
  }

  // Open/Close Dashboard Modal
  if (openDashBtn) {
    openDashBtn.addEventListener("click", () => {
      if (dashModal && currentCustomer) {
        populateDashboardUI();
        dashModal.classList.add("open");
      }
    });
  }
  if (closeDashBtn) {
    closeDashBtn.addEventListener("click", () => {
      if (dashModal) dashModal.classList.remove("open");
    });
  }

  // Tabs & Forms
  const tabLogin = document.getElementById("tabLoginBtn");
  const tabRegister = document.getElementById("tabRegisterBtn");
  const formLogin = document.getElementById("customerLoginForm");
  const formRegister = document.getElementById("customerRegisterForm");
  const formAdmin = document.getElementById("adminLoginForm");
  const switchReg = document.getElementById("switchToRegisterLink");
  const switchLog = document.getElementById("switchToLoginLink");

  // Switch tabs between Sign In & Register
  function setAuthTab(tabName) {
    if (tabLogin) tabLogin.classList.toggle("active", tabName === "login");
    if (tabRegister) tabRegister.classList.toggle("active", tabName === "register");

    if (formLogin) {
      formLogin.classList.toggle("active", tabName === "login");
      formLogin.style.display = tabName === "login" ? "block" : "none";
    }
    if (formRegister) {
      formRegister.classList.toggle("active", tabName === "register");
      formRegister.style.display = tabName === "register" ? "block" : "none";
    }
  }

  if (tabLogin) tabLogin.addEventListener("click", () => setAuthTab("login"));
  if (tabRegister) tabRegister.addEventListener("click", () => setAuthTab("register"));
  if (switchReg) switchReg.addEventListener("click", (e) => { e.preventDefault(); setAuthTab("register"); });
  if (switchLog) switchLog.addEventListener("click", (e) => { e.preventDefault(); setAuthTab("login"); });

  // Check URL params to auto-open login modal if redirected from admin
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auth") === "login" || urlParams.get("auth") === "admin" || urlParams.get("login")) {
      if (authModal) {
        authModal.classList.add("open");
        setAuthTab("login");
      }
    }
  } catch (paramErr) {}

  // Handle Login Submit (Customer OR Admin unified login)
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginCustEmail").value.trim();
      const pwd = document.getElementById("loginCustPassword").value.trim();

      try {
        const res = await fetch("/api/user/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pwd })
        });
        const data = await res.json();

        // 1. If Admin logged in: Redirect to Admin Panel immediately
        if (res.ok && (data.role === "admin" || data.redirect)) {
          const adminTok = data.token || "zaiqabox-admin-token-2026";
          localStorage.setItem("zaiqabox_admin_token", adminTok);
          localStorage.setItem("zaiqa_admin_token", adminTok);
          if (authModal) authModal.classList.remove("open");

          const adminName = (data.user && (data.user.fullName || data.user.FullName || data.user.username || data.user.Username))
            ? (data.user.fullName || data.user.FullName || data.user.username || data.user.Username)
            : (email.includes("@") ? email.split("@")[0] : "Admin");
          showWelcomeMessage(adminName, "Welcome Admin! Redirecting to Operations Portal...");

          setTimeout(() => {
            window.location.href = "admin/index.html";
          }, 1500);
          return;
        }

        // 2. If Customer logged in: Show Welcome Message for 2 seconds & Open their Lunch Dashboard
        if (res.ok && data.customer) {
          currentCustomer = data.customer;

          // If user came from filling guest lead form, sync plan and trigger lead capture
          if (window.pendingLeadData) {
            const pending = window.pendingLeadData;
            window.pendingLeadData = null;
            const banner = document.getElementById("authGuestPromptBanner");
            if (banner) banner.style.display = "none";

            currentCustomer.ActivePlan = pending.plan;
            currentCustomer.Area = pending.area;

            try {
              fetch("/api/lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pending)
              });
            } catch (leadErr) {
              console.error("[Auto Lead Submit Error]", leadErr);
            }
          }

          localStorage.setItem("zaiqabox_customer_user", JSON.stringify(currentCustomer));
          localStorage.setItem("zaiqabox_customer_token", data.token);
          updateNavCustomerState();
          if (authModal) authModal.classList.remove("open");

          // User-specific welcome message for 2 seconds
          const customerName = currentCustomer.FullName || currentCustomer.name || "Valued Customer";
          showWelcomeMessage(customerName, "Signed in successfully • Opening your Lunch Portal...");

          setTimeout(() => {
            populateDashboardUI();
            if (dashModal) dashModal.classList.add("open");
          }, 800);
        } else {
          alert(data.detail || "Invalid email/username or password.");
        }
      } catch (err) {
        alert("Failed to connect to authentication server.");
      }
    });
  }

  // Handle Direct Admin Form Submit
  if (formAdmin) {
    formAdmin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("adminLoginUsername").value.trim();
      const password = document.getElementById("adminLoginPassword").value.trim();

      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem("zaiqabox_admin_token", data.token);
          localStorage.setItem("zaiqa_admin_token", data.token);
          if (authModal) authModal.classList.remove("open");

          showWelcomeMessage(username || "Admin", "Signed in as Admin • Redirecting to Operations Portal...");

          setTimeout(() => {
            window.location.href = "admin/index.html";
          }, 2000);
        } else {
          alert(data.detail || "Invalid admin username or password.");
        }
      } catch (err) {
        alert("Failed to connect to Admin portal service.");
      }
    });
  }

  // Handle Register Submit
  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("regFullName").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const whatsapp = document.getElementById("regWhatsapp").value.trim();
      const area = document.getElementById("regArea").value;
      const addr = document.getElementById("regAddress").value.trim();
      const pwd = document.getElementById("regPassword").value.trim();

      const regSubmitBtn = document.getElementById("regSubmitBtn");
      if (regSubmitBtn) regSubmitBtn.disabled = true;

      try {
        const res = await fetch("/api/user/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: name,
            email: email,
            whatsapp: whatsapp,
            area: area,
            officeAddress: addr,
            password: pwd
          })
        });
        const data = await res.json();
        if (regSubmitBtn) regSubmitBtn.disabled = false;

        if (res.ok) {
          // Switch to Login Tab immediately (Do NOT go to home section)
          setAuthTab("login");

          // Pre-fill registered email in login form
          const loginEmailInput = document.getElementById("loginCustEmail");
          const loginPwdInput = document.getElementById("loginCustPassword");
          if (loginEmailInput) loginEmailInput.value = email;
          if (loginPwdInput) {
            loginPwdInput.value = "";
            loginPwdInput.focus();
          }

          // Show prominent success notice in the modal
          const guestPrompt = document.getElementById("authGuestPromptBanner");
          if (guestPrompt) {
            guestPrompt.style.display = "block";
            guestPrompt.style.background = "#DCFCE7";
            guestPrompt.style.borderColor = "#86EFAC";
            guestPrompt.style.color = "#15803D";
            guestPrompt.innerHTML = `✅ <strong>Account created successfully!</strong> Please enter your password to sign in.`;
          }

          showToast("Registration successful! Please sign in with your password.", "success", 4000);
        } else {
          alert(data.detail || "Registration failed. Please check your details.");
        }
      } catch (err) {
        if (regSubmitBtn) regSubmitBtn.disabled = false;
        alert("Network error. Please try again.");
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("zaiqabox_customer_user");
      localStorage.removeItem("zaiqabox_customer_token");
      currentCustomer = null;
      updateNavCustomerState();
      if (dashModal) dashModal.classList.remove("open");
      alert("You have been signed out.");
    });
  }

  // Handle Pause / Resume Toggle
  const pauseBtn = document.getElementById("dashTogglePauseBtn");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", async () => {
      if (!currentCustomer) return;
      const isCurrentlyActive = (currentCustomer.SubscriptionStatus || "Active") === "Active";
      const action = isCurrentlyActive ? "pause" : "resume";

      try {
        const res = await fetch("/api/user/pause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: currentCustomer.Id,
            action: action
          })
        });
        const data = await res.json();
        if (res.ok) {
          currentCustomer.SubscriptionStatus = isCurrentlyActive ? "Paused" : "Active";
          localStorage.setItem("zaiqabox_customer_user", JSON.stringify(currentCustomer));
          populateDashboardUI();
          alert(data.message || "Subscription status updated!");
        }
      } catch (err) {
        alert("Could not update pause status.");
      }
    });
  }

  // Handle Update Delivery Address
  const saveAddrBtn = document.getElementById("dashSaveAddressBtn");
  if (saveAddrBtn) {
    saveAddrBtn.addEventListener("click", async () => {
      if (!currentCustomer) return;
      const input = document.getElementById("dashNewAddressInput");
      const newAddr = input ? input.value.trim() : "";
      if (!newAddr) {
        alert("Please enter a valid office address.");
        return;
      }

      try {
        const res = await fetch("/api/user/update-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: currentCustomer.Id,
            officeAddress: newAddr,
            area: currentCustomer.Area || "DHA"
          })
        });
        const data = await res.json();
        if (res.ok) {
          currentCustomer.OfficeAddress = newAddr;
          localStorage.setItem("zaiqabox_customer_user", JSON.stringify(currentCustomer));
          alert("Delivery address updated successfully for upcoming meals!");
        }
      } catch (err) {
        alert("Could not update address.");
      }
    });
  }

  // Handle Profile Avatar Image Upload & Compression
  const avatarInput = document.getElementById("dashAvatarInput");
  if (avatarInput) {
    avatarInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !currentCustomer) return;

      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

          currentCustomer.ProfileImage = dataUrl;
          localStorage.setItem("zaiqabox_customer_user", JSON.stringify(currentCustomer));
          populateDashboardUI();
          updateNavCustomerState();

          try {
            const res = await fetch("/api/user/update-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId: currentCustomer.Id,
                fullName: currentCustomer.FullName || "",
                whatsapp: currentCustomer.WhatsApp || "",
                area: currentCustomer.Area || "DHA",
                officeAddress: currentCustomer.OfficeAddress || "",
                profileImage: dataUrl
              })
            });
            const data = await res.json();
            if (res.ok && data.customer) {
              currentCustomer = data.customer;
              localStorage.setItem("zaiqabox_customer_user", JSON.stringify(currentCustomer));
            }
            showWelcomeMessage(currentCustomer.FullName, "Profile photo updated successfully! 📷");
          } catch (err) {
            console.error("[Avatar Upload Error]", err);
          }
        };
        img.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle Edit Profile Collapsible Form
  const openEditBtn = document.getElementById("openEditProfileBtn");
  const closeEditBtn = document.getElementById("closeEditProfilePanelBtn");
  const cancelEditBtn = document.getElementById("cancelEditProfileBtn");
  const editPanel = document.getElementById("dashEditProfilePanel");
  const editForm = document.getElementById("customerEditProfileForm");

  function toggleEditProfile(show) {
    if (!editPanel) return;
    if (show && currentCustomer) {
      const editName = document.getElementById("editFullName");
      const editWa = document.getElementById("editWhatsapp");
      const editArea = document.getElementById("editArea");
      const editAddr = document.getElementById("editOfficeAddress");
      if (editName) editName.value = currentCustomer.FullName || "";
      if (editWa) editWa.value = currentCustomer.WhatsApp || "";
      if (editArea) editArea.value = currentCustomer.Area || "DHA";
      if (editAddr) editAddr.value = currentCustomer.OfficeAddress || "";
      editPanel.style.display = "block";
    } else {
      editPanel.style.display = "none";
    }
  }

  if (openEditBtn) openEditBtn.addEventListener("click", () => toggleEditProfile(true));
  if (closeEditBtn) closeEditBtn.addEventListener("click", () => toggleEditProfile(false));
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => toggleEditProfile(false));

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentCustomer) return;

      const saveBtn = document.getElementById("saveProfileBtn");
      const btnText = document.getElementById("saveProfileBtnText");
      const btnSpinner = document.getElementById("saveProfileBtnSpinner");
      if (saveBtn) saveBtn.disabled = true;
      if (btnText) btnText.style.display = "none";
      if (btnSpinner) btnSpinner.style.display = "inline";

      const fullName = document.getElementById("editFullName").value.trim();
      const whatsapp = document.getElementById("editWhatsapp").value.trim();
      const area = document.getElementById("editArea").value;
      const officeAddress = document.getElementById("editOfficeAddress").value.trim();

      try {
        const res = await fetch("/api/user/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: currentCustomer.Id,
            fullName: fullName,
            whatsapp: whatsapp,
            area: area,
            officeAddress: officeAddress,
            profileImage: currentCustomer.ProfileImage || null
          })
        });
        const data = await res.json();
        if (res.ok && data.customer) {
          currentCustomer = data.customer;
          localStorage.setItem("zaiqabox_customer_user", JSON.stringify(currentCustomer));
          populateDashboardUI();
          updateNavCustomerState();
          toggleEditProfile(false);
          showWelcomeMessage(currentCustomer.FullName, "Profile details saved successfully! ✅");
        } else {
          alert(data.detail || "Could not update profile.");
        }
      } catch (err) {
        alert("Network error updating profile.");
      } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (btnText) btnText.style.display = "inline";
        if (btnSpinner) btnSpinner.style.display = "none";
      }
    });
  }
}

function updateNavCustomerState() {
  const guestNav = document.getElementById("guestNavActions");
  const userNav = document.getElementById("userNavActions");
  const adminNav = document.getElementById("adminNavActions");
  const navName = document.getElementById("navUserName");
  const navTag = document.getElementById("navUserPlanTag");
  const navAvatarImg = document.getElementById("navUserAvatarImg");
  const navAvatarDot = document.getElementById("navUserAvatarDot");

  const adminToken = localStorage.getItem("zaiqabox_admin_token") || localStorage.getItem("zaiqa_admin_token");

  // 1. If Admin is Signed In:
  if (adminToken) {
    if (adminNav) adminNav.style.display = "flex";
    if (guestNav) guestNav.style.display = "none";
    if (userNav) userNav.style.display = "none";

    const adminLogoutBtn = document.getElementById("navAdminLogoutBtn");
    if (adminLogoutBtn && !adminLogoutBtn._bound) {
      adminLogoutBtn._bound = true;
      adminLogoutBtn.addEventListener("click", () => {
        localStorage.removeItem("zaiqabox_admin_token");
        localStorage.removeItem("zaiqa_admin_token");
        updateNavCustomerState();
        showToast("Signed out of Admin account.", "info");
      });
    }
    return;
  }

  // Not admin:
  if (adminNav) adminNav.style.display = "none";

  // 2. If Customer is Signed In:
  if (currentCustomer && currentCustomer.FullName) {
    if (guestNav) guestNav.style.display = "none";
    if (userNav) userNav.style.display = "flex";
    if (navName) navName.textContent = currentCustomer.FullName.split(" ")[0];
    if (navTag) navTag.textContent = currentCustomer.SubscriptionStatus || "Active";

    // Show custom profile image if uploaded
    if (currentCustomer.ProfileImage && navAvatarImg) {
      navAvatarImg.src = currentCustomer.ProfileImage;
      navAvatarImg.style.display = "inline-block";
      if (navAvatarDot) navAvatarDot.style.display = "none";
    } else if (navAvatarImg) {
      navAvatarImg.style.display = "none";
      if (navAvatarDot) navAvatarDot.style.display = "inline-block";
    }
  } else {
    // 3. Guest (neither admin nor customer):
    if (guestNav) guestNav.style.display = "flex";
    if (userNav) userNav.style.display = "none";
  }
}

function populateDashboardUI() {
  if (!currentCustomer) return;
  const nameEl = document.getElementById("dashCustomerName");
  const emailEl = document.getElementById("dashCustomerEmail");
  const planEl = document.getElementById("dashPlanName");
  const statusEl = document.getElementById("dashSubStatus");
  const lunchesEl = document.getElementById("dashLunchesRemaining");
  const areaEl = document.getElementById("dashDeliveryArea");
  const addrInput = document.getElementById("dashNewAddressInput");
  const pauseBtn = document.getElementById("dashTogglePauseBtn");
  const waSupportBtn = document.getElementById("dashWhatsappSupportBtn");
  const dashDownloadPdfBtn = document.getElementById("dashDownloadPdfBtn");
  const avatarImg = document.getElementById("dashAvatarImg");
  const avatarCircle = document.getElementById("dashAvatarCircle");

  if (nameEl) nameEl.textContent = currentCustomer.FullName;
  if (emailEl) emailEl.textContent = currentCustomer.Email;
  if (planEl) planEl.textContent = currentCustomer.ActivePlan || "Weekly Trial";

  // Update Profile Picture or Fallback Initial
  if (currentCustomer.ProfileImage && avatarImg) {
    avatarImg.src = currentCustomer.ProfileImage;
    avatarImg.style.display = "block";
    if (avatarCircle) avatarCircle.style.display = "none";
  } else {
    if (avatarImg) avatarImg.style.display = "none";
    if (avatarCircle) {
      avatarCircle.style.display = "flex";
      const initial = (currentCustomer.FullName || "C").charAt(0).toUpperCase();
      avatarCircle.textContent = initial;
    }
  }

  // Link PDF download button directly to nutrition guide asset
  if (dashDownloadPdfBtn) {
    dashDownloadPdfBtn.href = "assets/office_lunch_guide.pdf";
  }

  const isPaused = (currentCustomer.SubscriptionStatus === "Paused");
  if (statusEl) {
    statusEl.textContent = isPaused ? "⏸️ Paused" : "🟢 Active";
    statusEl.style.background = isPaused ? "#FEF3C7" : "#E8F5E9";
    statusEl.style.color = isPaused ? "#92400E" : "#1B5E20";
  }

  if (lunchesEl) lunchesEl.textContent = currentCustomer.LunchesRemaining || "5";
  if (areaEl) areaEl.textContent = `Delivery: ${currentCustomer.Area || 'DHA'}`;
  if (addrInput) addrInput.value = currentCustomer.OfficeAddress || "";

  if (pauseBtn) {
    pauseBtn.innerHTML = isPaused ? "<span>▶️</span> Resume Lunch Delivery" : "<span>⏸️</span> Pause Tomorrow's Lunch";
    pauseBtn.className = isPaused ? "btn btn-primary btn-block" : "btn btn-outline btn-block";
  }

  if (waSupportBtn) {
    const waMsg = `Hi ZaiqaBox! I am ${currentCustomer.FullName} (${currentCustomer.Email}). I have an inquiry about my ${currentCustomer.ActivePlan} subscription.`;
    waSupportBtn.href = createWhatsAppUrl(waMsg);
  }

  // Load Interactive Meal Pause Calendar for this customer
  if (currentCustomer.Id) {
    loadCustomerMealCalendar(currentCustomer.Id);
  }
}

// ==========================================
// INTERACTIVE MEAL PAUSE CALENDAR LOGIC
// ==========================================
async function loadCustomerMealCalendar(customerId) {
  const grid = document.getElementById("mealCalGrid");
  const activeCountEl = document.getElementById("calActiveCount");
  const pausedCountEl = document.getElementById("calPausedCount");
  if (!grid || !customerId) return;

  try {
    const res = await fetch(`/api/user/calendar/${customerId}`);
    if (!res.ok) {
      grid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem;">Could not load meal calendar.</div>`;
      return;
    }
    const data = await res.json();
    const cal = data.calendar;

    if (activeCountEl) activeCountEl.textContent = cal.total_active_meals || 0;
    if (pausedCountEl) pausedCountEl.textContent = cal.total_paused_meals || 0;

    if (!cal.schedule || cal.schedule.length === 0) {
      grid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem;">No working days scheduled.</div>`;
      return;
    }

    grid.innerHTML = cal.schedule.map(s => {
      let actionBtnHtml = "";
      if (s.is_past) {
        actionBtnHtml = `<span style="font-size: 0.75rem; color: #64748B; font-weight: 600;">Delivered</span>`;
      } else if (s.is_locked) {
        actionBtnHtml = `
          <button class="cal-btn cal-btn-locked" title="${s.lock_reason || 'Locked after 8:00 PM cutoff'}" disabled>
            🔒 Locked
          </button>
        `;
      } else if (s.is_paused) {
        actionBtnHtml = `
          <button class="cal-btn cal-btn-resume" onclick="handleDatePauseToggle(${customerId}, '${s.date}')">
            ▶️ Resume
          </button>
        `;
      } else {
        actionBtnHtml = `
          <button class="cal-btn cal-btn-pause" onclick="handleDatePauseToggle(${customerId}, '${s.date}')">
            ⏸️ Pause
          </button>
        `;
      }

      return `
        <div class="cal-day-card ${s.is_paused ? 'is-paused' : ''} ${s.is_locked ? 'is-locked' : ''}">
          <div class="cal-day-left">
            <img src="${s.dish_image}" alt="${s.dish_title}" class="cal-dish-img" onerror="this.src='assets/menu/monday_tikka_bowl.jpg'">
            <div class="cal-day-info">
              <div class="cal-day-date">
                <span>${s.formatted_date}</span>
                ${s.is_today ? '<span class="cal-tag-today">TODAY</span>' : ''}
              </div>
              <div class="cal-dish-name" title="${s.dish_title}">${s.dish_title}</div>
              <div class="cal-dish-meta">🔥 ${s.calories} kcal • 🥩 ${s.protein}g Protein</div>
            </div>
          </div>
          <div class="cal-day-right">
            <span class="cal-badge ${s.status_badge}">${s.status_label}</span>
            ${actionBtnHtml}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Calendar load error", err);
    grid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem;">Failed to load calendar.</div>`;
  }
}

// Global handler for clicking pause/resume on a calendar date
window.handleDatePauseToggle = async function(customerId, dateStr) {
  try {
    const res = await fetch("/api/user/calendar/toggle-pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customerId, date: dateStr })
    });
    const data = await res.json();
    if (res.ok) {
      showWelcomeMessage(currentCustomer ? currentCustomer.FullName : "Customer", data.message || "Calendar updated successfully!");
      loadCustomerMealCalendar(customerId);
    } else {
      alert(data.detail || "Could not update calendar.");
    }
  } catch (err) {
    alert("Connection error. Please try again.");
  }
};

