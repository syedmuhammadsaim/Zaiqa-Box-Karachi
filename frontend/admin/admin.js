/**
 * ZaiqaBox Karachi - Admin Portal Client Logic
 * Connects to FastAPI Backend and Microsoft SQL Server (SSMS)
 * Full CRUD: Menu, Plans, Delivery Zones, Testimonials, FAQs, Leads CRM, Website Settings
 */

const API_BASE = "";
let currentToken = localStorage.getItem("zaiqabox_admin_token") || localStorage.getItem("zaiqa_admin_token") || "";
let cachedDishes = [];
let cachedLeads = [];
let cachedPlans = [];
let cachedZones = [];
let cachedTestimonials = [];
let cachedFaqs = [];

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  bindNavigation();
  bindModals();
});

// Toast notification helper
function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Authentication Check & Login
function initAuth() {
  const loginWrapper = document.getElementById("loginWrapper");
  const appShell = document.getElementById("appShell");
  const loginForm = document.getElementById("adminLoginForm");
  const logoutBtn = document.getElementById("adminLogoutBtn");

  if (currentToken) {
    fetch(`${API_BASE}/api/admin/verify`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    }).then(res => {
      if (res.ok) {
        showApp();
      } else {
        showLogin();
      }
    }).catch(() => showLogin());
  } else {
    showLogin();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = document.getElementById("loginUsername").value.trim();
      const p = document.getElementById("loginPassword").value.trim();

      try {
        const res = await fetch(`${API_BASE}/api/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          currentToken = data.token;
          localStorage.setItem("zaiqabox_admin_token", currentToken);
          showApp();
          showToast(`Welcome back, ${u || "Admin"}! Signed in successfully.`, "success", 2000);
        } else {
          alert(data.detail || "Invalid login credentials.");
        }
      } catch (err) {
        alert("Failed to connect to authentication server.");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("zaiqabox_admin_token");
      currentToken = "";
      showLogin();
      showToast("Signed out.");
    });
  }

  function showApp() {
    if (loginWrapper) loginWrapper.style.display = "none";
    if (appShell) appShell.classList.add("active");
    loadDashboardStats();
    loadMenuItems();
    loadPlans();
    loadDeliveryZones();
    loadTestimonials();
    loadFaqs();
    loadLeads();
    loadSettings();
  }

  function showLogin() {
    if (loginWrapper) loginWrapper.style.display = "flex";
    if (appShell) appShell.classList.remove("active");
  }
}

// Tab Switching & Mobile Menu
function bindNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("sidebar");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");
      switchTab(targetTab);
      if (sidebar) sidebar.classList.remove("open");
    });
  });

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
}

function switchTab(tabId) {
  const navItems = document.querySelectorAll(".nav-item");
  const panes = document.querySelectorAll(".tab-pane");

  navItems.forEach(n => {
    if (n.getAttribute("data-tab") === tabId) n.classList.add("active");
    else n.classList.remove("active");
  });

  panes.forEach(p => {
    if (p.id === `tab-${tabId}`) p.classList.add("active");
    else p.classList.remove("active");
  });

  if (tabId === "overview") loadDashboardStats();
  if (tabId === "menu") loadMenuItems();
  if (tabId === "plans") loadPlans();
  if (tabId === "delivery") loadDeliveryZones();
  if (tabId === "testimonials") loadTestimonials();
  if (tabId === "faqs") loadFaqs();
  if (tabId === "leads") loadLeads();
  if (tabId === "settings") loadSettings();
}

// 1. DASHBOARD OVERVIEW & STATS
async function loadDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    const stats = await res.json();

    document.getElementById("statTotalLeads").textContent = stats.total_leads || 0;
    document.getElementById("statNewLeads").textContent = stats.new_leads || 0;
    document.getElementById("statActiveDishes").textContent = stats.active_dishes || 0;
    document.getElementById("statActivePlans").textContent = stats.active_plans || 0;

    const tbody = document.getElementById("overviewRecentLeadsTable");
    if (tbody) {
      let recent = stats.recent_leads;
      if (!recent) {
        // Fallback fetch if stats didn't return recent_leads directly
        try {
          const lRes = await fetch(`${API_BASE}/api/admin/leads`, {
            headers: { "Authorization": `Bearer ${currentToken}` }
          });
          if (lRes.ok) {
            const allLeads = await lRes.json();
            recent = allLeads.slice(0, 6);
          }
        } catch (e) {}
      }

      recent = recent || [];
      if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-muted); padding: 1.5rem;">No leads captured yet.</td></tr>`;
      } else {
        tbody.innerHTML = recent.map(l => `
          <tr>
            <td>${l.Timestamp ? l.Timestamp.substring(0, 16) : '-'}</td>
            <td><strong>${l.Name}</strong></td>
            <td><a href="https://wa.me/${l.WhatsApp}" target="_blank" style="color: #25D366; font-weight: bold; text-decoration: none;">${l.WhatsApp}</a></td>
            <td>${l.Area}</td>
            <td>${l.Plan}</td>
            <td><span class="badge ${getBadgeClass(l.Status)}">${l.Status}</span></td>
            <td><button class="btn btn-primary btn-sm" onclick="switchTab('leads')">View</button></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error("Dashboard stats error", err);
  }
}

function getBadgeClass(status) {
  if (status === "New") return "badge-new";
  if (status === "Contacted") return "badge-contacted";
  if (status === "Subscribed") return "badge-subscribed";
  return "badge-archived";
}

// 2. MENU ITEMS CRUD
async function loadMenuItems() {
  const grid = document.getElementById("dishesGrid");
  if (!grid) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/menu`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    cachedDishes = await res.json();

    grid.innerHTML = cachedDishes.map(d => `
      <div class="dish-card">
        <div class="dish-card-img-wrap">
          <img src="../${d.ImageUrl}" alt="${d.Title}" class="dish-card-img" onerror="this.src='../assets/menu/monday_tikka_bowl.jpg'">
          <div class="dish-card-badge">${d.DayOfWeek}</div>
        </div>
        <div class="dish-card-body">
          <h4 class="dish-card-title">${d.Title}</h4>
          <p class="dish-card-desc">${d.Description}</p>
          <div style="font-size: 0.8rem; color: #475569; margin-bottom: 0.5rem;">
            <strong>Sides:</strong> ${d.Sides}
          </div>
          <div class="dish-card-meta">
            <span>🔥 ${d.Calories} kcal</span>
            <span>🥩 ${d.ProteinGrams}g Protein</span>
            <span>⭐ ${d.Rating} (${d.ReviewsCount})</span>
          </div>
          <div class="dish-card-actions">
            <button class="btn btn-outline btn-sm" onclick="editDish(${d.Id})">✏️ Edit</button>
            <button class="btn btn-outline btn-sm" style="color: #EF4444; border-color: #EF4444;" onclick="deleteDish(${d.Id})">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Menu load error", err);
  }
}

function openAddDishModal() {
  const dishModal = document.getElementById("dishModal");
  document.getElementById("dishModalTitle").textContent = "Add Menu Dish";
  document.getElementById("dishId").value = "";
  document.getElementById("dishForm").reset();
  dishModal.classList.add("open");
}

function editDish(id) {
  const d = cachedDishes.find(item => item.Id === id);
  if (!d) return;

  const dishModal = document.getElementById("dishModal");
  document.getElementById("dishModalTitle").textContent = "Edit Menu Dish";
  document.getElementById("dishId").value = d.Id;
  document.getElementById("dishDay").value = d.DayOfWeek;
  document.getElementById("dishTitle").value = d.Title;
  document.getElementById("dishDescription").value = d.Description;
  document.getElementById("dishSides").value = d.Sides;
  document.getElementById("dishImageUrl").value = d.ImageUrl;
  document.getElementById("dishRating").value = d.Rating;
  document.getElementById("dishReviews").value = d.ReviewsCount;
  document.getElementById("dishCalories").value = d.Calories;
  document.getElementById("dishProtein").value = d.ProteinGrams;
  document.getElementById("dishBadge").value = d.Badge || "Nutritionist Choice";

  dishModal.classList.add("open");
}

async function deleteDish(id) {
  if (!confirm("Are you sure you want to remove this dish from the weekly rotation?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/menu/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast("Dish removed from rotation.", "info");
      loadMenuItems();
      loadDashboardStats();
    }
  } catch (e) {
    alert("Could not delete dish.");
  }
}

// 3. PLANS & PRICING CRUD
async function loadPlans() {
  const container = document.getElementById("plansListContainer");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/plans`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    cachedPlans = await res.json();

    container.innerHTML = cachedPlans.map(p => `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-title">
          <span>${p.Name} (${(p.PlanCode || '').toUpperCase()})</span>
          <span class="badge ${p.IsPopular ? 'badge-subscribed' : 'badge-new'}">${p.Badge || 'Standard'}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Plan Name</label>
            <input type="text" id="plan_name_${p.Id}" class="form-input" value="${p.Name}">
          </div>
          <div class="form-group">
            <label class="form-label">Price (PKR)</label>
            <input type="number" id="plan_price_${p.Id}" class="form-input" value="${p.Price}">
          </div>
          <div class="form-group">
            <label class="form-label">Lunches Count</label>
            <input type="number" id="plan_lunches_${p.Id}" class="form-input" value="${p.LunchesCount}">
          </div>
          <div class="form-group">
            <label class="form-label">Period Text</label>
            <input type="text" id="plan_period_${p.Id}" class="form-input" value="${p.PeriodText}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" id="plan_desc_${p.Id}" class="form-input" value="${p.Description}">
        </div>
        <div class="form-group">
          <label class="form-label">Features (Pipe '|' separated)</label>
          <input type="text" id="plan_features_${p.Id}" class="form-input" value="${(p.features || []).join(' | ')}">
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-accent btn-sm" onclick="savePlan(${p.Id})">💾 Save Plan Changes</button>
          <button class="btn btn-outline btn-sm" style="color: #EF4444; border-color: #EF4444;" onclick="deletePlan(${p.Id})">🗑️ Delete Plan</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error("Plans load error", e);
  }
}

async function savePlan(id) {
  const name = document.getElementById(`plan_name_${id}`).value.trim();
  const price = parseFloat(document.getElementById(`plan_price_${id}`).value) || 3500;
  const lunches = parseInt(document.getElementById(`plan_lunches_${id}`).value) || 5;
  const period = document.getElementById(`plan_period_${id}`).value.trim();
  const desc = document.getElementById(`plan_desc_${id}`).value.trim();
  const rawFeatures = document.getElementById(`plan_features_${id}`).value;
  const features = rawFeatures.split("|").map(f => f.trim()).filter(Boolean);

  try {
    const res = await fetch(`${API_BASE}/api/admin/plans/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        Name: name,
        LunchesCount: lunches,
        Price: price,
        PeriodText: period,
        Description: desc,
        features: features,
        IsPopular: lunches > 10
      })
    });
    if (res.ok) {
      showToast("Plan details updated!", "success");
      loadPlans();
    }
  } catch (e) {
    alert("Could not update plan.");
  }
}

async function deletePlan(id) {
  if (!confirm("Are you sure you want to delete this subscription plan?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/plans/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast("Plan deleted successfully.", "info");
      loadPlans();
      loadDashboardStats();
    }
  } catch (e) {
    alert("Could not delete plan.");
  }
}

// 4. DELIVERY ZONES CRUD
async function loadDeliveryZones() {
  const tbody = document.getElementById("deliveryZonesTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/delivery`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    cachedZones = await res.json();

    tbody.innerHTML = cachedZones.map(z => `
      <tr>
        <td><strong>${z.ZoneName}</strong></td>
        <td><input type="text" id="zone_cov_${z.Id}" class="form-input" value="${z.CoverageDetails}" style="font-size: 0.85rem; padding: 0.35rem 0.6rem;"></td>
        <td><span class="badge ${z.IsFree ? 'badge-subscribed' : 'badge-contacted'}">${z.IsFree ? 'Free' : 'Charged'}</span></td>
        <td><input type="number" id="zone_fee_${z.Id}" class="form-input" value="${z.DailyFee}" style="width: 100px; padding: 0.35rem;"></td>
        <td><input type="text" id="zone_time_${z.Id}" class="form-input" value="${z.TimingWindow}" style="width: 150px; padding: 0.35rem;"></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-accent btn-sm" onclick="saveDeliveryZone(${z.Id}, '${z.ZoneName}', ${z.IsFree ? 'true' : 'false'})">Save</button>
            <button class="btn btn-outline btn-sm" style="color: #EF4444; border-color: #EF4444;" onclick="deleteDeliveryZone(${z.Id})">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error("Delivery zones load error", e);
  }
}

async function saveDeliveryZone(id, name, isFree) {
  const cov = document.getElementById(`zone_cov_${id}`).value.trim();
  const fee = parseFloat(document.getElementById(`zone_fee_${id}`).value) || 0;
  const time = document.getElementById(`zone_time_${id}`).value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/admin/delivery/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        ZoneName: name,
        CoverageDetails: cov,
        IsFree: isFree,
        DailyFee: fee,
        TimingWindow: time
      })
    });
    if (res.ok) {
      showToast(`Zone '${name}' saved!`, "success");
    }
  } catch (e) {
    alert("Could not save delivery zone.");
  }
}

async function deleteDeliveryZone(id) {
  if (!confirm("Are you sure you want to remove this delivery zone?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/delivery/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast("Delivery zone deleted.", "info");
      loadDeliveryZones();
    }
  } catch (e) {
    alert("Could not delete delivery zone.");
  }
}

// 5. TESTIMONIALS / REVIEWS CRUD
async function loadTestimonials() {
  const tbody = document.getElementById("testimonialsTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/testimonials`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    cachedTestimonials = await res.json();

    if (cachedTestimonials.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--admin-muted);">No testimonials configured. Click 'Add New Review'.</td></tr>`;
      return;
    }

    tbody.innerHTML = cachedTestimonials.map(t => `
      <tr>
        <td><strong>${t.CustomerName}</strong></td>
        <td>${t.CompanyArea}</td>
        <td>⭐ ${t.Rating}</td>
        <td style="max-width: 300px; font-size: 0.85rem;">${t.ReviewText}</td>
        <td>
          <button class="btn btn-outline btn-sm" style="color: #EF4444; border-color: #EF4444;" onclick="deleteTestimonial(${t.Id})">🗑️ Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error("Testimonials load error", e);
  }
}

async function deleteTestimonial(id) {
  if (!confirm("Delete this review from the website?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/testimonials/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast("Review deleted.", "info");
      loadTestimonials();
    }
  } catch (e) {
    alert("Could not delete review.");
  }
}

// 6. FAQS CRUD
async function loadFaqs() {
  const tbody = document.getElementById("faqsTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/faqs`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    cachedFaqs = await res.json();

    if (cachedFaqs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--admin-muted);">No FAQs configured. Click 'Add New FAQ'.</td></tr>`;
      return;
    }

    tbody.innerHTML = cachedFaqs.map(f => `
      <tr>
        <td><strong>${f.Question}</strong></td>
        <td style="max-width: 320px; font-size: 0.85rem;">${f.Answer}</td>
        <td><span class="badge badge-contacted">${f.Category || 'General'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" style="color: #EF4444; border-color: #EF4444;" onclick="deleteFaq(${f.Id})">🗑️ Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error("FAQs load error", e);
  }
}

async function deleteFaq(id) {
  if (!confirm("Delete this FAQ item?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/faqs/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast("FAQ removed.", "info");
      loadFaqs();
    }
  } catch (e) {
    alert("Could not delete FAQ.");
  }
}

// 7. LEADS CRM
async function loadLeads() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/leads`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    cachedLeads = await res.json();
    renderLeadsTable(cachedLeads);
  } catch (err) {
    console.error("Leads load error", err);
  }
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById("leadsTableBody");
  if (!tbody) return;

  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--admin-muted);">No leads matching the filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(l => {
    const waChatUrl = `https://wa.me/${l.WhatsApp}?text=${encodeURIComponent(`Hi ${l.Name}! Thank you for choosing ZaiqaBox Karachi. Regarding your corporate meal inquiry for ${l.Area}...`)}`;
    return `
      <tr>
        <td>#${l.Id}</td>
        <td>${l.Timestamp ? l.Timestamp.substring(0, 16) : '-'}</td>
        <td><strong>${l.Name}</strong><br><small style="color: var(--admin-muted);">${l.Email}</small></td>
        <td><a href="${waChatUrl}" target="_blank" style="color: #25D366; font-weight: 600;">💬 ${l.WhatsApp}</a></td>
        <td>${l.Area}</td>
        <td>${l.Plan}</td>
        <td style="max-width: 200px; font-size: 0.82rem; color: #475569;">${l.AiSummary || '-'}</td>
        <td>
          <select class="form-select" style="font-size: 0.8rem; padding: 0.25rem;" onchange="updateLeadStatus(${l.Id}, this.value)">
            <option value="New" ${l.Status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${l.Status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Subscribed" ${l.Status === 'Subscribed' ? 'selected' : ''}>Subscribed</option>
            <option value="Archived" ${l.Status === 'Archived' ? 'selected' : ''}>Archived</option>
          </select>
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <a href="${waChatUrl}" target="_blank" class="btn btn-primary btn-sm" title="Chat on WhatsApp">💬 Chat</a>
            <button class="btn btn-outline btn-sm" style="color: #EF4444; border-color: #EF4444;" onclick="deleteLead(${l.Id})" title="Delete Lead">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

const searchInput = document.getElementById("leadsSearchInput");
const statusFilter = document.getElementById("leadsStatusFilter");

function filterLeads() {
  const q = (searchInput ? searchInput.value : "").toLowerCase();
  const st = statusFilter ? statusFilter.value : "ALL";

  const filtered = cachedLeads.filter(l => {
    const matchSearch = (l.Name || "").toLowerCase().includes(q) ||
                        (l.Email || "").toLowerCase().includes(q) ||
                        (l.WhatsApp || "").includes(q);
    const matchStatus = (st === "ALL") || (l.Status === st);
    return matchSearch && matchStatus;
  });
  renderLeadsTable(filtered);
}

if (searchInput) searchInput.addEventListener("input", filterLeads);
if (statusFilter) statusFilter.addEventListener("change", filterLeads);

async function updateLeadStatus(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/leads/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Lead #${id} status updated to ${newStatus}`, "info");
      loadDashboardStats();
    }
  } catch (e) {
    alert("Could not update lead status.");
  }
}

async function deleteLead(id) {
  if (!confirm("Are you sure you want to delete this lead?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/leads/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast("Lead deleted.", "info");
      loadLeads();
      loadDashboardStats();
    }
  } catch (e) {
    alert("Could not delete lead.");
  }
}

// 8. WEBSITE SETTINGS
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/settings`, {
      headers: { "Authorization": `Bearer ${currentToken}` }
    });
    if (!res.ok) return;
    const settings = await res.json();

    if (document.getElementById("setBrandName")) document.getElementById("setBrandName").value = settings.brand_name || "ZaiqaBox Karachi";
    if (document.getElementById("setAnnouncement")) document.getElementById("setAnnouncement").value = settings.announcement_text || "";
    if (document.getElementById("setWhatsapp")) document.getElementById("setWhatsapp").value = settings.whatsapp_number || "923378034564";
    if (document.getElementById("setEmail")) document.getElementById("setEmail").value = settings.email || "contact@zaiqabox.pk";
    if (document.getElementById("setOutsideFee")) document.getElementById("setOutsideFee").value = settings.outside_zone_fee_per_day || "200";
    if (document.getElementById("setPauseDeadline")) document.getElementById("setPauseDeadline").value = settings.pause_deadline || "8:00 PM the night prior";
    if (document.getElementById("setCompliance")) document.getElementById("setCompliance").value = settings.compliance_note || "For any medical or dietary questions, our human nutritionist will assist you.";
  } catch (e) {
    console.error("Settings load error", e);
  }
}

const saveSettingsBtn = document.getElementById("saveSettingsBtn");
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", async () => {
    const payload = {
      settings: {
        brand_name: document.getElementById("setBrandName").value.trim(),
        announcement_text: document.getElementById("setAnnouncement").value.trim(),
        whatsapp_number: document.getElementById("setWhatsapp").value.trim(),
        email: document.getElementById("setEmail").value.trim(),
        outside_zone_fee_per_day: document.getElementById("setOutsideFee").value.trim(),
        pause_deadline: document.getElementById("setPauseDeadline").value.trim(),
        compliance_note: document.getElementById("setCompliance").value.trim()
      }
    };

    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Website settings saved! Live site updated.", "success");
      }
    } catch (e) {
      alert("Could not save settings.");
    }
  });
}

// BIND ALL MODALS & BUTTONS
function bindModals() {
  // Menu Dish Modal
  const openAddDishBtn = document.getElementById("openAddDishBtn");
  const dishModal = document.getElementById("dishModal");
  const closeDishModal = document.getElementById("closeDishModal");
  const cancelDishBtn = document.getElementById("cancelDishBtn");
  const saveDishBtn = document.getElementById("saveDishBtn");

  if (openAddDishBtn) openAddDishBtn.addEventListener("click", openAddDishModal);
  if (closeDishModal) closeDishModal.addEventListener("click", () => dishModal.classList.remove("open"));
  if (cancelDishBtn) cancelDishBtn.addEventListener("click", () => dishModal.classList.remove("open"));

  if (saveDishBtn) {
    saveDishBtn.addEventListener("click", async () => {
      const id = document.getElementById("dishId").value;
      const fileInput = document.getElementById("dishImageFile");

      let imageUrl = document.getElementById("dishImageUrl").value.trim();

      if (fileInput && fileInput.files && fileInput.files[0]) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        try {
          const uploadRes = await fetch(`${API_BASE}/api/admin/menu/upload-image`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${currentToken}` },
            body: formData
          });
          const uploadData = await uploadRes.json();
          if (uploadData.image_url) {
            imageUrl = uploadData.image_url;
          }
        } catch (err) {
          console.error("Image upload failed", err);
        }
      }

      const payload = {
        DayOfWeek: document.getElementById("dishDay").value,
        Title: document.getElementById("dishTitle").value.trim(),
        Description: document.getElementById("dishDescription").value.trim(),
        Sides: document.getElementById("dishSides").value.trim(),
        ImageUrl: imageUrl || "assets/menu/monday_tikka_bowl.jpg",
        Rating: parseFloat(document.getElementById("dishRating").value) || 4.9,
        ReviewsCount: parseInt(document.getElementById("dishReviews").value) || 120,
        Calories: parseInt(document.getElementById("dishCalories").value) || 500,
        ProteinGrams: parseInt(document.getElementById("dishProtein").value) || 30,
        Badge: document.getElementById("dishBadge").value.trim() || "Chef Special",
        DisplayOrder: 1,
        IsActive: true
      };

      if (!payload.Title || !payload.Description) {
        alert("Please provide dish title and description.");
        return;
      }

      try {
        const url = id ? `${API_BASE}/api/admin/menu/${id}` : `${API_BASE}/api/admin/menu`;
        const method = id ? "PUT" : "POST";
        const res = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          dishModal.classList.remove("open");
          showToast(id ? "Dish updated successfully!" : "New dish added to menu!", "success");
          loadMenuItems();
          loadDashboardStats();
        } else {
          alert("Failed to save dish.");
        }
      } catch (e) {
        alert("Error saving dish.");
      }
    });
  }

  // Plan Modal
  const openAddPlanBtn = document.getElementById("openAddPlanBtn");
  const planModal = document.getElementById("planModal");
  const closePlanModal = document.getElementById("closePlanModal");
  const cancelPlanBtn = document.getElementById("cancelPlanBtn");
  const saveModalPlanBtn = document.getElementById("saveModalPlanBtn");

  if (openAddPlanBtn) {
    openAddPlanBtn.addEventListener("click", () => {
      document.getElementById("planForm").reset();
      planModal.classList.add("open");
    });
  }
  if (closePlanModal) closePlanModal.addEventListener("click", () => planModal.classList.remove("open"));
  if (cancelPlanBtn) cancelPlanBtn.addEventListener("click", () => planModal.classList.remove("open"));

  if (saveModalPlanBtn) {
    saveModalPlanBtn.addEventListener("click", async () => {
      const name = document.getElementById("modalPlanName").value.trim();
      const price = parseFloat(document.getElementById("modalPlanPrice").value) || 3500;
      const lunches = parseInt(document.getElementById("modalPlanLunches").value) || 5;
      const period = document.getElementById("modalPlanPeriod").value.trim();
      const badge = document.getElementById("modalPlanBadge").value.trim();
      const desc = document.getElementById("modalPlanDesc").value.trim();
      const rawFeat = document.getElementById("modalPlanFeatures").value;
      const features = rawFeat.split("|").map(f => f.trim()).filter(Boolean);

      if (!name || !desc) {
        alert("Please provide plan name and description.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/admin/plans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          },
          body: JSON.stringify({
            Name: name,
            Price: price,
            LunchesCount: lunches,
            PeriodText: period,
            Badge: badge,
            Description: desc,
            features: features,
            IsPopular: false
          })
        });
        if (res.ok) {
          planModal.classList.remove("open");
          showToast("New subscription plan created!", "success");
          loadPlans();
          loadDashboardStats();
        } else {
          alert("Could not create plan.");
        }
      } catch (e) {
        alert("Error saving plan.");
      }
    });
  }

  // Delivery Zone Modal
  const openAddZoneBtn = document.getElementById("openAddZoneBtn");
  const zoneModal = document.getElementById("zoneModal");
  const closeZoneModal = document.getElementById("closeZoneModal");
  const cancelZoneBtn = document.getElementById("cancelZoneBtn");
  const saveModalZoneBtn = document.getElementById("saveModalZoneBtn");

  if (openAddZoneBtn) {
    openAddZoneBtn.addEventListener("click", () => {
      document.getElementById("zoneForm").reset();
      zoneModal.classList.add("open");
    });
  }
  if (closeZoneModal) closeZoneModal.addEventListener("click", () => zoneModal.classList.remove("open"));
  if (cancelZoneBtn) cancelZoneBtn.addEventListener("click", () => zoneModal.classList.remove("open"));

  if (saveModalZoneBtn) {
    saveModalZoneBtn.addEventListener("click", async () => {
      const name = document.getElementById("modalZoneName").value.trim();
      const coverage = document.getElementById("modalZoneCoverage").value.trim();
      const isFree = document.getElementById("modalZoneIsFree").value === "true";
      const fee = parseFloat(document.getElementById("modalZoneFee").value) || 0;
      const timing = document.getElementById("modalZoneTiming").value.trim();

      if (!name || !coverage) {
        alert("Please fill in zone name and coverage details.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/admin/delivery`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          },
          body: JSON.stringify({
            ZoneName: name,
            CoverageDetails: coverage,
            IsFree: isFree,
            DailyFee: fee,
            TimingWindow: timing
          })
        });
        if (res.ok) {
          zoneModal.classList.remove("open");
          showToast("New delivery zone added!", "success");
          loadDeliveryZones();
        } else {
          alert("Could not add delivery zone.");
        }
      } catch (e) {
        alert("Error saving delivery zone.");
      }
    });
  }

  // Testimonial Modal
  const openAddTestimonialBtn = document.getElementById("openAddTestimonialBtn");
  const testimonialModal = document.getElementById("testimonialModal");
  const closeTestModal = document.getElementById("closeTestModal");
  const cancelTestBtn = document.getElementById("cancelTestBtn");
  const saveModalTestBtn = document.getElementById("saveModalTestBtn");

  if (openAddTestimonialBtn) {
    openAddTestimonialBtn.addEventListener("click", () => {
      document.getElementById("testForm").reset();
      testimonialModal.classList.add("open");
    });
  }
  if (closeTestModal) closeTestModal.addEventListener("click", () => testimonialModal.classList.remove("open"));
  if (cancelTestBtn) cancelTestBtn.addEventListener("click", () => testimonialModal.classList.remove("open"));

  if (saveModalTestBtn) {
    saveModalTestBtn.addEventListener("click", async () => {
      const name = document.getElementById("modalTestName").value.trim();
      const area = document.getElementById("modalTestArea").value.trim();
      const rating = parseFloat(document.getElementById("modalTestRating").value) || 5.0;
      const text = document.getElementById("modalTestText").value.trim();

      if (!name || !text) {
        alert("Please provide customer name and review text.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/admin/testimonials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          },
          body: JSON.stringify({
            CustomerName: name,
            CompanyArea: area,
            Rating: rating,
            ReviewText: text
          })
        });
        if (res.ok) {
          testimonialModal.classList.remove("open");
          showToast("New customer review added!", "success");
          loadTestimonials();
        } else {
          alert("Could not add testimonial.");
        }
      } catch (e) {
        alert("Error saving review.");
      }
    });
  }

  // FAQ Modal
  const openAddFaqBtn = document.getElementById("openAddFaqBtn");
  const faqModal = document.getElementById("faqModal");
  const closeFaqModal = document.getElementById("closeFaqModal");
  const cancelFaqBtn = document.getElementById("cancelFaqBtn");
  const saveModalFaqBtn = document.getElementById("saveModalFaqBtn");

  if (openAddFaqBtn) {
    openAddFaqBtn.addEventListener("click", () => {
      document.getElementById("faqForm").reset();
      faqModal.classList.add("open");
    });
  }
  if (closeFaqModal) closeFaqModal.addEventListener("click", () => faqModal.classList.remove("open"));
  if (cancelFaqBtn) cancelFaqBtn.addEventListener("click", () => faqModal.classList.remove("open"));

  if (saveModalFaqBtn) {
    saveModalFaqBtn.addEventListener("click", async () => {
      const question = document.getElementById("modalFaqQuestion").value.trim();
      const answer = document.getElementById("modalFaqAnswer").value.trim();
      const category = document.getElementById("modalFaqCategory").value;

      if (!question || !answer) {
        alert("Please provide both question and answer.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/admin/faqs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          },
          body: JSON.stringify({
            Question: question,
            Answer: answer,
            Category: category
          })
        });
        if (res.ok) {
          faqModal.classList.remove("open");
          showToast("New FAQ item added!", "success");
          loadFaqs();
        } else {
          alert("Could not add FAQ.");
        }
      } catch (e) {
        alert("Error saving FAQ.");
      }
    });
  }
}
