// =============================================
//  GLOBALS
// =============================================
const token = localStorage.getItem("token");
let currentUser = null;
let savedAddresses = [];

// =============================================
//  BOOT
// =============================================
if (!token) {
  document.getElementById("not-logged-view").style.display = "block";
} else {
  document.getElementById("logged-view").style.display = "block";
  fetchProfile();
}

// =============================================
//  AUTO-TAB FROM URL  (?tab=orders)
// =============================================
function openTabFromURL() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (!tab) return;

  const link = document.querySelector(`.sidebar-nav a[data-tab="${tab}"]`);
  if (!link) return;

  document
    .querySelectorAll(".sidebar-nav a")
    .forEach((a) => a.classList.remove("active"));
  link.classList.add("active");

  document
    .querySelectorAll(".profile-section")
    .forEach((s) => s.classList.remove("active"));
  const section = document.getElementById("tab-" + tab);
  if (section) section.classList.add("active");
}

// =============================================
//  FETCH PROFILE FROM API
// =============================================
async function fetchProfile() {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();
    currentUser = data;
    localStorage.setItem("user", JSON.stringify(data));
    initProfile();
  } catch (err) {
    console.error("Profile fetch error:", err);
    showToast("Could not load profile. Check connection.", "error");
    const cached = JSON.parse(localStorage.getItem("user") || "null");
    if (cached) {
      currentUser = cached;
      initProfile();
    }
  }
}

// =============================================
//  INIT PROFILE UI
// =============================================
function initProfile() {
  const u = currentUser;
  const name = u.name || "User";
  const email = u.email || "";
  const phone = u.phone || "";

  document.getElementById("sb-name").textContent = name;
  document.getElementById("sb-email").textContent = email;
  const init = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarEl = document.getElementById("avatar-init");
  if (u.image) {
    avatarEl.innerHTML = `<img src="${u.image}" alt="${name}">`;
  } else {
    avatarEl.textContent = init;
  }

  const since = u.createdAt
    ? new Date(u.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
      })
    : "2024";

  document.getElementById("ov-since").textContent = since;
  document.getElementById("p-name").value = name;
  document.getElementById("p-email").value = email;
  document.getElementById("p-phone").value = phone;
  document.getElementById("p-since").value = since;

  loadAddresses();
  loadOrders();
  loadWishlistOverview();

  openTabFromURL();
}

// =============================================
//  ORDERS — REAL API
// =============================================
const STATUS_MAP = {
  Pending:   { cls: "badge-processing", label: "Pending" },
  Confirmed: { cls: "badge-shipped",    label: "Confirmed" },
  Shipped:   { cls: "badge-shipped",    label: "Shipped" },
  Delivered: { cls: "badge-delivered",  label: "Delivered" },
  Cancelled: { cls: "badge-cancelled",  label: "Cancelled" },
};

async function loadOrders() {
  const spin4 = `<tr><td colspan="4"  class="loading-text"><i class="fa fa-spinner fa-spin"></i> Loading...</td></tr>`;
  const spin7 = `<tr><td colspan="7"  class="loading-text"><i class="fa fa-spinner fa-spin"></i> Loading...</td></tr>`;
  document.getElementById("ov-tbody").innerHTML  = spin4;
  document.getElementById("all-tbody").innerHTML = spin7;

  try {
    const res    = await fetch(`${CONFIG.BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orders = await res.json();
    if (!res.ok) throw new Error(orders.message || "Failed to fetch orders");

    document.getElementById("ov-orders").textContent = orders.length;

    if (orders.length === 0) {
      const emptyLink = `<a href="shop.html" style="color:var(--blue);">Start shopping!</a>`;
      document.getElementById("ov-tbody").innerHTML =
        `<tr><td colspan="4" style="text-align:center;padding:30px;color:#aaa;">No orders yet. ${emptyLink}</td></tr>`;
      document.getElementById("all-tbody").innerHTML =
        `<tr><td colspan="7" style="text-align:center;padding:30px;color:#aaa;">No orders yet. ${emptyLink}</td></tr>`;
      return;
    }

    // ── Overview: latest 3 (4 cols) ──────────────────────────────────────
    document.getElementById("ov-tbody").innerHTML = orders
      .slice(0, 3)
      .map((o) => {
        const s    = STATUS_MAP[o.status] || { cls: "badge-pending", label: o.status };
        const date = new Date(o.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        });
        const id = "#ORD-" + o._id.toString().slice(-6).toUpperCase();
        return `
        <tr>
          <td><strong style="color:#333;">${id}</strong></td>
          <td>${date}</td>
          <td><strong>₹${(o.totalPrice || 0).toLocaleString("en-IN")}</strong></td>
          <td><span class="badge ${s.cls}">${s.label}</span></td>
        </tr>`;
      })
      .join("");

    // ── Full orders: 7 cols ───────────────────────────────────────────────
    document.getElementById("all-tbody").innerHTML = orders
      .map((o) => {
        const s    = STATUS_MAP[o.status] || { cls: "badge-pending", label: o.status };
        const date = new Date(o.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        });
        const id    = "#ORD-" + o._id.toString().slice(-6).toUpperCase();
        const items = Array.isArray(o.items) ? o.items.length : 0;
        const pay   = o.paymentMethod || "—";

        // ── Track cell: button if tracking number exists, else "Pending" ──
        const hasTracking = o.trackingNumber;
        const courierCode = o.courierCode ?? 0;
        const trackCell   = hasTracking
          ? `<button
               onclick="quickTrack('${o._id}','${o.trackingNumber}',${courierCode})"
               style="background:var(--blue);color:#fff;border:none;padding:5px 12px;
                      border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;
                      font-family:'Jost',sans-serif;transition:background 0.2s;"
               onmouseover="this.style.background='var(--blue-dark)'"
               onmouseout="this.style.background='var(--blue)'">
               <i class="fa fa-map-marker-alt"></i> Track
             </button>`
          : `<span style="font-size:11px;color:#aaa;font-style:italic;">Not dispatched</span>`;

        return `
        <tr>
          <td><strong style="color:#333;">${id}</strong></td>
          <td>${date}</td>
          <td>${items} item${items !== 1 ? "s" : ""}</td>
          <td><strong>₹${(o.totalPrice || 0).toLocaleString("en-IN")}</strong></td>
          <td>
            <span style="font-size:11px;background:#f0f4f8;
              padding:3px 8px;border-radius:4px;">${pay}</span>
          </td>
          <td><span class="badge ${s.cls}">${s.label}</span></td>
          <td>${trackCell}</td>
        </tr>`;
      })
      .join("");

  } catch (err) {
    console.error("Orders fetch error:", err);
    document.getElementById("ov-tbody").innerHTML =
      `<tr><td colspan="4" style="text-align:center;padding:20px;color:#e74c3c;">Failed to load orders.</td></tr>`;
    document.getElementById("all-tbody").innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:20px;color:#e74c3c;">Failed to load orders.</td></tr>`;
  }
}

// =============================================
//  QUICK TRACK MODAL
// =============================================
async function quickTrack(orderId, trackingNumber, carrierCode) {

  // Remove any stale modal
  const old = document.getElementById("quick-track-modal");
  if (old) old.remove();

  // Build modal shell
  const modal = document.createElement("div");
  modal.id = "quick-track-modal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2000;
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:28px 26px;
                width:100%;max-width:500px;max-height:85vh;overflow-y:auto;
                box-shadow:0 20px 60px rgba(0,0,0,0.18);font-family:'Jost',sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <h4 style="margin:0;font-size:16px;font-weight:700;color:#333;">
          <i class="fa fa-truck" style="color:var(--blue);margin-right:8px;"></i>Tracking Status
        </h4>
        <button
          onclick="document.getElementById('quick-track-modal').remove()"
          style="background:none;border:none;font-size:20px;color:#aaa;cursor:pointer;line-height:1;padding:0;">
          ✕
        </button>
      </div>

      <div style="background:#f0f4f8;border-radius:8px;padding:10px 14px;
                  margin-bottom:16px;font-size:12px;color:#666;
                  display:flex;align-items:center;gap:8px;">
        <i class="fa fa-barcode" style="color:var(--blue);"></i>
        <span style="font-family:monospace;font-weight:600;font-size:13px;">${trackingNumber}</span>
      </div>

      <div id="qt-body">
        <div style="text-align:center;padding:36px;color:#888;">
          <i class="fa fa-spinner fa-spin" style="font-size:26px;color:var(--blue);"></i>
          <p style="margin:14px 0 0;font-size:14px;">Fetching tracking info…</p>
        </div>
      </div>

      <div style="text-align:right;margin-top:18px;padding-top:14px;border-top:1px solid #eee;">
        <a href="track-order.html?id=${orderId}"
           style="font-size:13px;color:var(--blue);text-decoration:none;font-weight:600;">
          View Full Tracking Page →
        </a>
      </div>
    </div>`;

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);

  // ── Fetch tracking info ───────────────────────────────────────────────
  const body = document.getElementById("qt-body");

  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/tracking/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        trackingNumber,
        carrierCode: Number(carrierCode) || 0,
        orderId,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      body.innerHTML = `
        <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;
                    padding:14px 16px;color:#dc2626;font-size:13px;display:flex;
                    align-items:center;gap:10px;">
          <i class="fa fa-circle-exclamation" style="font-size:16px;flex-shrink:0;"></i>
          <span>${data.error || "Could not fetch tracking info. Try the full tracking page."}</span>
        </div>`;
      return;
    }

    // Status colour map
    const STATUS_STYLE = {
      InfoReceived:   { bg: "#dbeafe", color: "#1e40af" },
      InTransit:      { bg: "#fef3c7", color: "#92400e" },
      OutForDelivery: { bg: "#d1fae5", color: "#065f46" },
      Delivered:      { bg: "#dcfce7", color: "#166534" },
      AttemptFail:    { bg: "#ffedd5", color: "#9a3412" },
      Exception:      { bg: "#fee2e2", color: "#991b1b" },
      Expired:        { bg: "#f1f5f9", color: "#475569" },
    };
    const sc = STATUS_STYLE[data.status] || { bg: "#f0f4f8", color: "#555" };

    const lastUpdate = data.lastUpdate
      ? new Date(data.lastUpdate).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "—";

    // Latest 5 events
    const eventsHtml = (data.events || []).slice(0, 5).map((ev, i) => {
      const dt   = ev.time_iso ? new Date(ev.time_iso) : null;
      const date = dt
        ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        : "—";
      const time = dt
        ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "—";
      return `
        <tr style="${i === 0 ? "background:#f0fdf4;" : ""}">
          <td style="padding:9px 10px;font-size:12px;color:#666;white-space:nowrap;
                     ${i === 0 ? "font-weight:600;" : ""}">${date}</td>
          <td style="padding:9px 10px;font-size:12px;color:#666;white-space:nowrap;
                     ${i === 0 ? "font-weight:600;" : ""}">${time}</td>
          <td style="padding:9px 10px;font-size:12px;color:#555;
                     ${i === 0 ? "font-weight:600;" : ""}">${ev.location || "—"}</td>
          <td style="padding:9px 10px;font-size:12px;color:#333;
                     ${i === 0 ? "font-weight:600;" : ""}">${ev.description || ev.stage || "—"}</td>
        </tr>`;
    }).join("");

    body.innerHTML = `
      <!-- Status + last update -->
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <span style="background:${sc.bg};color:${sc.color};padding:5px 14px;
                     border-radius:20px;font-size:12px;font-weight:700;
                     text-transform:uppercase;letter-spacing:.04em;">
          ${data.status || "Unknown"}
        </span>
        <span style="font-size:12px;color:#888;">
          <i class="fa fa-clock" style="margin-right:4px;"></i>${lastUpdate}
        </span>
      </div>

      <!-- Current location -->
      ${data.location ? `
        <div style="background:#f0f4f8;border-radius:8px;padding:10px 14px;
                    margin-bottom:14px;font-size:13px;color:#555;
                    display:flex;align-items:center;gap:8px;">
          <i class="fa fa-map-marker-alt" style="color:var(--blue);flex-shrink:0;"></i>
          <span>${data.location}</span>
        </div>` : ""}

      <!-- Events table -->
      ${eventsHtml
        ? `<div style="border:1px solid #e5e9ef;border-radius:8px;overflow:hidden;overflow-x:auto;">
             <table style="width:100%;border-collapse:collapse;min-width:360px;">
               <thead>
                 <tr style="background:var(--blue);">
                   <th style="color:#fff;font-size:11px;padding:9px 10px;text-align:left;
                              font-weight:700;letter-spacing:.05em;text-transform:uppercase;
                              white-space:nowrap;">Date</th>
                   <th style="color:#fff;font-size:11px;padding:9px 10px;text-align:left;
                              font-weight:700;letter-spacing:.05em;text-transform:uppercase;
                              white-space:nowrap;">Time</th>
                   <th style="color:#fff;font-size:11px;padding:9px 10px;text-align:left;
                              font-weight:700;letter-spacing:.05em;text-transform:uppercase;">Location</th>
                   <th style="color:#fff;font-size:11px;padding:9px 10px;text-align:left;
                              font-weight:700;letter-spacing:.05em;text-transform:uppercase;">Update</th>
                 </tr>
               </thead>
               <tbody>${eventsHtml}</tbody>
             </table>
           </div>`
        : `<p style="color:#aaa;text-align:center;font-size:13px;padding:20px 0;">
             No tracking events yet.
           </p>`}
    `;

  } catch (err) {
    console.error("Quick track error:", err);
    body.innerHTML = `
      <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;
                  padding:14px 16px;color:#dc2626;font-size:13px;display:flex;
                  align-items:center;gap:10px;">
        <i class="fa fa-circle-exclamation" style="font-size:16px;flex-shrink:0;"></i>
        <span>Network error. Please check your connection and try again.</span>
      </div>`;
  }
}

// =============================================
//  WISHLIST OVERVIEW
// =============================================
async function loadWishlistOverview() {
  const token = localStorage.getItem("token");
  if (!token) {
    document.getElementById("ov-wishlist").textContent = "0";
    return;
  }
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/wishlist`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      document.getElementById("ov-wishlist").textContent = "0";
      return;
    }
    const data     = await res.json();
    const products = data?.products || [];
    document.getElementById("ov-wishlist").textContent = products.length;
  } catch (err) {
    console.error("Wishlist overview error:", err);
    document.getElementById("ov-wishlist").textContent = "0";
  }
}

// =============================================
//  PERSONAL INFO — EDIT / SAVE
// =============================================
let isEditing = false;

function toggleEdit() {
  isEditing = !isEditing;
  const btn     = document.getElementById("edit-toggle-btn");
  const saveBtn = document.getElementById("save-personal-btn");
  const nameIn  = document.getElementById("p-name");
  const phoneIn = document.getElementById("p-phone");

  if (isEditing) {
    nameIn.disabled  = false;
    phoneIn.disabled = false;
    nameIn.focus();
    btn.innerHTML        = '<i class="fa fa-times"></i> Cancel';
    saveBtn.style.display = "inline-block";
  } else {
    nameIn.value         = currentUser.name  || "";
    phoneIn.value        = currentUser.phone || "";
    nameIn.disabled      = true;
    phoneIn.disabled     = true;
    btn.innerHTML        = '<i class="fa fa-pencil-alt"></i> Edit';
    saveBtn.style.display = "none";
  }
}

async function savePersonal() {
  const name  = document.getElementById("p-name").value.trim();
  const phone = document.getElementById("p-phone").value.trim();

  if (!name)               { showToast("Name cannot be empty!", "error");                          return; }
  if (name.length < 3)     { showToast("Name must be at least 3 characters!", "error");            return; }
  if (!/^[a-zA-Z\s]+$/.test(name)) { showToast("Name must contain only letters!", "error");       return; }
  if (phone && !/^[6-9]\d{9}$/.test(phone)) {
    showToast("Enter a valid 10-digit Indian mobile number!", "error");
    return;
  }

  const saveBtn    = document.getElementById("save-personal-btn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/user/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json();

    if (res.ok) {
      currentUser = data.user || { ...currentUser, name, phone };
      localStorage.setItem("user", JSON.stringify(currentUser));

      document.getElementById("sb-name").textContent = currentUser.name;
      const init = currentUser.name
        .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      if (!currentUser.image)
        document.getElementById("avatar-init").textContent = init;

      document.getElementById("p-name").disabled  = true;
      document.getElementById("p-phone").disabled = true;
      document.getElementById("edit-toggle-btn").innerHTML =
        '<i class="fa fa-pencil-alt"></i> Edit';
      saveBtn.style.display = "none";
      isEditing = false;
      showToast("Profile updated successfully! ✓", "success");
    } else {
      showToast(data.message || "Update failed. Try again!", "error");
    }
  } catch (err) {
    console.error("Save profile error:", err);
    showToast("Network error! Check your connection.", "error");
  } finally {
    saveBtn.disabled  = false;
    saveBtn.innerHTML = '<i class="fa fa-save"></i> &nbsp;Save Changes';
  }
}

// =============================================
//  ADDRESS
// =============================================
function loadAddresses() {
  const stored = JSON.parse(localStorage.getItem("savedAddresses") || "[]");
  savedAddresses = stored;

  if (currentUser.address && currentUser.address.trim()) {
    const apiAddr = currentUser.address.trim();
    if (!savedAddresses.includes(apiAddr)) {
      savedAddresses.unshift(apiAddr);
      localStorage.setItem("savedAddresses", JSON.stringify(savedAddresses));
    }
  }
  renderAddresses();
}

function renderAddresses() {
  const grid     = document.getElementById("address-grid");
  const userName = currentUser.name || "User";
  let html       = "";

  savedAddresses.forEach((addr, idx) => {
    const isDefault = idx === 0;
    html += `
      <div class="address-card ${isDefault ? "default" : ""}">
        ${isDefault ? '<span class="addr-badge">Default</span>' : ""}
        <p class="addr-name">${userName}</p>
        <p class="addr-text">${addr.replace(/,\s*/g, ",<br>")}</p>
        <div class="addr-actions">
          <button class="addr-btn danger" onclick="removeAddress(${idx})">Remove</button>
        </div>
      </div>`;
  });

  html += `
    <div class="add-addr-card" onclick="openAddressModal()">
      <i class="fa fa-plus-circle"></i>
      <span>Add New Address</span>
    </div>`;

  grid.innerHTML = html;
  document.getElementById("ov-addr-count").textContent = savedAddresses.length;
}

function removeAddress(idx) {
  savedAddresses.splice(idx, 1);
  localStorage.setItem("savedAddresses", JSON.stringify(savedAddresses));
  renderAddresses();
  showToast("Address removed.", "success");
}

function openAddressModal() {
  document.getElementById("addressModal").classList.add("open");
  document.getElementById("addr-name-input").value  = currentUser.name  || "";
  document.getElementById("addr-phone-input").value = currentUser.phone || "";
}

function closeAddressModal() {
  document.getElementById("addressModal").classList.remove("open");
  clearAddrForm();
}

function clearAddrForm() {
  ["addr-name-input","addr-phone-input","addr-line1","addr-line2",
   "addr-city","addr-pin","addr-state"]
    .forEach((id) => { document.getElementById(id).value = ""; });
}

document.getElementById("addressModal").addEventListener("click", function (e) {
  if (e.target === this) closeAddressModal();
});

async function saveAddress() {
  const name  = document.getElementById("addr-name-input").value.trim();
  const phone = document.getElementById("addr-phone-input").value.trim();
  const line1 = document.getElementById("addr-line1").value.trim();
  const line2 = document.getElementById("addr-line2").value.trim();
  const city  = document.getElementById("addr-city").value.trim();
  const pin   = document.getElementById("addr-pin").value.trim();
  const state = document.getElementById("addr-state").value.trim();

  if (!line1)                       { showToast("Address Line 1 is required!", "error");    return; }
  if (!city)                        { showToast("City is required!", "error");               return; }
  if (!pin || !/^\d{6}$/.test(pin)) { showToast("Enter a valid 6-digit pincode!", "error"); return; }
  if (!state)                       { showToast("State is required!", "error");              return; }

  const parts = [line1];
  if (line2) parts.push(line2);
  parts.push(`${city} - ${pin}`);
  parts.push(state + ", India");
  if (phone) parts.push(`📞 ${phone}`);
  const addressStr = parts.join(", ");

  const btn    = document.getElementById("save-addr-btn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/user/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: addressStr }),
    });
    const data = await res.json();

    if (res.ok) {
      currentUser = data.user || { ...currentUser, address: addressStr };
      localStorage.setItem("user", JSON.stringify(currentUser));
      savedAddresses.push(addressStr);
      localStorage.setItem("savedAddresses", JSON.stringify(savedAddresses));
      renderAddresses();
      closeAddressModal();
      showToast("Address saved successfully! ✓", "success");
    } else {
      showToast(data.message || "Failed to save address.", "error");
    }
  } catch (err) {
    showToast("Network error! Check connection.", "error");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa fa-save"></i> &nbsp;Save Address';
  }
}

// =============================================
//  MOBILE SIDEBAR TOGGLE
// =============================================
function toggleSidebar() {
  const sidebar = document.getElementById("profileSidebar");
  const toggle  = document.getElementById("sidebarToggle");
  sidebar.classList.toggle("sidebar-open");
  toggle.classList.toggle("open");
}

// =============================================
//  TAB SWITCH
// =============================================
document.querySelectorAll(".sidebar-nav a[data-tab]").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const tab = this.getAttribute("data-tab");

    document.querySelectorAll(".sidebar-nav a")
      .forEach((a) => a.classList.remove("active"));
    this.classList.add("active");

    document.querySelectorAll(".profile-section")
      .forEach((s) => s.classList.remove("active"));
    document.getElementById("tab-" + tab).classList.add("active");

    const url = new URL(window.location);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url);

    if (window.innerWidth <= 992) {
      document.getElementById("profileSidebar").classList.remove("sidebar-open");
      document.getElementById("sidebarToggle").classList.remove("open");
    }
  });
});

// =============================================
//  LOGOUT
// =============================================
document.getElementById("profile-logout").addEventListener("click", function (e) {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("savedAddresses");
  window.location.href = "login.html";
});

// =============================================
//  PASSWORD STRENGTH
// =============================================
function checkStrength(val) {
  let s = 0;
  if (val.length >= 6)          s++;
  if (val.length >= 10)         s++;
  if (/[A-Z]/.test(val))        s++;
  if (/[0-9]/.test(val))        s++;
  if (/[!@#$%^&*]/.test(val))   s++;

  const lvl = [
    { w: "0%",   c: "#eee",     t: "",            tc: "#aaa" },
    { w: "25%",  c: "#e74c3c",  t: "Weak",        tc: "#e74c3c" },
    { w: "50%",  c: "#e67e22",  t: "Fair",        tc: "#e67e22" },
    { w: "75%",  c: "#f1c40f",  t: "Good",        tc: "#e0a800" },
    { w: "90%",  c: "#27ae60",  t: "Strong",      tc: "#27ae60" },
    { w: "100%", c: "#1a7a45",  t: "Very Strong",  tc: "#1a7a45" },
  ][s];

  document.getElementById("str-bar").style.cssText =
    `width:${lvl.w};background:${lvl.c}`;
  const el    = document.getElementById("str-text");
  el.textContent = lvl.t;
  el.style.color = lvl.tc;
}

// =============================================
//  TOAST
// =============================================
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = "toast-msg " + type + " show";
  setTimeout(() => t.classList.remove("show"), 3000);
}

// =============================================
//  PROFILE PHOTO UPLOAD
// =============================================
document.getElementById("profile-image-input").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please select an image file!", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Image must be under 5MB!", "error");
    return;
  }

  const avatarEl = document.getElementById("avatar-init");
  avatarEl.innerHTML = `<i class="fa fa-spinner fa-spin" style="color:#fff;font-size:22px;"></i>`;

  try {
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes  = await fetch(`${CONFIG.BASE_URL}/upload`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}` },
      body:    formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.url)
      throw new Error(uploadData.error || "Upload failed");

    const profileRes  = await fetch(`${CONFIG.BASE_URL}/user/profile`, {
      method:  "PUT",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: uploadData.url }),
    });
    const profileData = await profileRes.json();
    if (!profileRes.ok) throw new Error(profileData.message || "Failed to save image");

    currentUser.image = uploadData.url;
    localStorage.setItem("user", JSON.stringify(currentUser));
    avatarEl.innerHTML = `<img src="${uploadData.url}" alt="Profile">`;
    showToast("Profile photo updated! ✓", "success");

  } catch (err) {
    console.error("Photo upload error:", err);
    const init = (currentUser.name || "U")
      .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    avatarEl.textContent = init;
    showToast(err.message || "Failed to upload photo. Try again!", "error");
  }

  this.value = "";
});

// =============================================
//  CHANGE PASSWORD
// =============================================
async function changePwd() {
  const cur = document.getElementById("cur-pwd").value.trim();
  const nw  = document.getElementById("new-pwd").value.trim();
  const con = document.getElementById("con-pwd").value.trim();

  if (!cur || !nw || !con) { showToast("Please fill all fields!", "error");                     return; }
  if (nw !== con)           { showToast("Passwords do not match!", "error");                    return; }
  if (nw.length < 6)        { showToast("Min 6 characters required!", "error");                 return; }
  if (!/[A-Z]/.test(nw))    { showToast("Password needs at least one uppercase letter!", "error"); return; }
  if (!/[0-9]/.test(nw))    { showToast("Password needs at least one number!", "error");        return; }
  if (!/[!@#$%^&*]/.test(nw)) { showToast("Password needs at least one special character!", "error"); return; }

  const btn    = document.querySelector("#tab-password .blue-btn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Updating...';

  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/user/change-password`, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPassword: cur, newPassword: nw }),
    });
    const data = await res.json();

    if (res.ok) {
      showToast("Password updated successfully! ✓", "success");
      document.getElementById("cur-pwd").value = "";
      document.getElementById("new-pwd").value = "";
      document.getElementById("con-pwd").value = "";
      checkStrength("");
    } else {
      showToast(data.message || "Update failed. Try again!", "error");
    }
  } catch (err) {
    console.error("Change password error:", err);
    showToast("Network error! Check connection.", "error");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa fa-lock"></i> &nbsp;Update Password';
  }
}