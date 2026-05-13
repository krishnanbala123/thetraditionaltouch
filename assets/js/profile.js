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

  document.querySelectorAll(".sidebar-nav a").forEach(a => a.classList.remove("active"));
  link.classList.add("active");

  document.querySelectorAll(".profile-section").forEach(s => s.classList.remove("active"));
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
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
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
    if (cached) { currentUser = cached; initProfile(); }
  }
}

// =============================================
//  INIT PROFILE UI
// =============================================
function initProfile() {
  const u = currentUser;
  const name  = u.name  || "User";
  const email = u.email || "";
  const phone = u.phone || "";

  document.getElementById("sb-name").textContent  = name;
  document.getElementById("sb-email").textContent = email;
  const init = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const avatarEl = document.getElementById("avatar-init");
  if (u.image) {
    avatarEl.innerHTML = `<img src="${u.image}" alt="${name}">`;
  } else {
    avatarEl.textContent = init;
  }

  const since = u.createdAt
    ? new Date(u.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short" })
    : "2024";

  document.getElementById("ov-since").textContent = since;
  document.getElementById("p-name").value  = name;
  document.getElementById("p-email").value = email;
  document.getElementById("p-phone").value = phone;
  document.getElementById("p-since").value = since;

  loadAddresses();
  loadOrders(); // ← real API

  // Open tab from URL after everything is set up
  openTabFromURL();
}

// =============================================
//  ORDERS — REAL API
// =============================================
const STATUS_MAP = {
  Pending:   { cls: "badge-processing", label: "Pending"   },
  Confirmed: { cls: "badge-shipped",    label: "Confirmed"  },
  Shipped:   { cls: "badge-shipped",    label: "Shipped"    },
  Delivered: { cls: "badge-delivered",  label: "Delivered"  },
  Cancelled: { cls: "badge-cancelled",  label: "Cancelled"  },
};

async function loadOrders() {
  // Show loading in both tables
  document.getElementById("ov-tbody").innerHTML  = `<tr><td colspan="4" class="loading-text"><i class="fa fa-spinner fa-spin"></i> Loading...</td></tr>`;
  document.getElementById("all-tbody").innerHTML = `<tr><td colspan="6" class="loading-text"><i class="fa fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res    = await fetch(`${CONFIG.BASE_URL}/orders`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const orders = await res.json();

    if (!res.ok) throw new Error(orders.message || "Failed to fetch orders");

    // Update order count card
    document.getElementById("ov-orders").textContent = orders.length;

    if (orders.length === 0) {
      const empty = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#aaa;">No orders yet. <a href="shop.html" style="color:var(--blue);">Start shopping!</a></td></tr>`;
      document.getElementById("ov-tbody").innerHTML  = empty.replace("colspan=\"6\"", "colspan=\"4\"");
      document.getElementById("all-tbody").innerHTML = empty;
      return;
    }

    // Overview table — latest 3
    document.getElementById("ov-tbody").innerHTML = orders.slice(0, 3).map(o => {
      const s   = STATUS_MAP[o.status] || { cls: "badge-processing", label: o.status };
      const date = new Date(o.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
      const id   = o._id.toString().slice(-8).toUpperCase();
      return `
        <tr>
          <td><strong style="color:#333;">#TTT-${id}</strong></td>
          <td>${date}</td>
          <td><strong>₹${o.totalPrice?.toLocaleString("en-IN") || 0}</strong></td>
          <td><span class="badge ${s.cls}">${s.label}</span></td>
        </tr>`;
    }).join("");

    // Full orders table
    document.getElementById("all-tbody").innerHTML = orders.map(o => {
      const s    = STATUS_MAP[o.status] || { cls: "badge-processing", label: o.status };
      const date = new Date(o.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
      const id   = o._id.toString().slice(-8).toUpperCase();
      // Extract city from address (first comma-separated segment after number)
      const addrParts = (o.address || "").split(",");
      const city = addrParts.length > 1 ? addrParts[1].trim() : (addrParts[0].trim() || "—");

      return `
        <tr>
          <td><strong style="color:#333;">#TTT-${id}</strong></td>
          <td>${date}</td>
          <td>${city}</td>
          <td><strong>₹${o.totalPrice?.toLocaleString("en-IN") || 0}</strong></td>
          <td><span class="badge ${s.cls}">${s.label}</span></td>
          <td>
            <a href="track-order.html?id=${o._id}" style="color:var(--blue);font-size:12px;text-decoration:none;font-weight:600;">
              <i class="fa fa-map-marker-alt"></i> Track
            </a>
          </td>
        </tr>`;
    }).join("");

  } catch (err) {
    console.error("Orders fetch error:", err);
    const errRow = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#e74c3c;">Failed to load orders.</td></tr>`;
    document.getElementById("ov-tbody").innerHTML  = errRow.replace("colspan=\"6\"", "colspan=\"4\"");
    document.getElementById("all-tbody").innerHTML = errRow;
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
    btn.innerHTML    = '<i class="fa fa-times"></i> Cancel';
    saveBtn.style.display = "inline-block";
  } else {
    nameIn.value     = currentUser.name  || "";
    phoneIn.value    = currentUser.phone || "";
    nameIn.disabled  = true;
    phoneIn.disabled = true;
    btn.innerHTML    = '<i class="fa fa-pencil-alt"></i> Edit';
    saveBtn.style.display = "none";
  }
}

async function savePersonal() {
  const name  = document.getElementById("p-name").value.trim();
  const phone = document.getElementById("p-phone").value.trim();

  if (!name)              { showToast("Name cannot be empty!", "error"); return; }
  if (name.length < 3)    { showToast("Name must be at least 3 characters!", "error"); return; }
  if (!/^[a-zA-Z\s]+$/.test(name)) { showToast("Name must contain only letters!", "error"); return; }
  if (phone && !/^[6-9]\d{9}$/.test(phone)) { showToast("Enter a valid 10-digit Indian mobile number!", "error"); return; }

  const saveBtn = document.getElementById("save-personal-btn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

  try {
    const res = await fetch(`${CONFIG.BASE_URL}/user/profile`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone })
    });
    const data = await res.json();

    if (res.ok) {
      currentUser = data.user || { ...currentUser, name, phone };
      localStorage.setItem("user", JSON.stringify(currentUser));

      document.getElementById("sb-name").textContent = currentUser.name;
      const init = currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      if (!currentUser.image) document.getElementById("avatar-init").textContent = init;

      document.getElementById("p-name").disabled  = true;
      document.getElementById("p-phone").disabled = true;
      document.getElementById("edit-toggle-btn").innerHTML = '<i class="fa fa-pencil-alt"></i> Edit';
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
    saveBtn.disabled = false;
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
  let html = "";

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
  ["addr-name-input","addr-phone-input","addr-line1","addr-line2","addr-city","addr-pin","addr-state"]
    .forEach(id => { document.getElementById(id).value = ""; });
}

document.getElementById("addressModal").addEventListener("click", function(e) {
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

  if (!line1)                        { showToast("Address Line 1 is required!", "error"); return; }
  if (!city)                         { showToast("City is required!", "error"); return; }
  if (!pin || !/^\d{6}$/.test(pin))  { showToast("Enter a valid 6-digit pincode!", "error"); return; }
  if (!state)                        { showToast("State is required!", "error"); return; }

  const parts = [line1];
  if (line2) parts.push(line2);
  parts.push(`${city} - ${pin}`);
  parts.push(state + ", India");
  if (phone) parts.push(`📞 ${phone}`);
  const addressStr = parts.join(", ");

  const btn = document.getElementById("save-addr-btn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

  try {
    const res = await fetch(`${CONFIG.BASE_URL}/user/profile`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressStr })
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
    btn.disabled = false;
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
document.querySelectorAll(".sidebar-nav a[data-tab]").forEach(link => {
  link.addEventListener("click", function(e) {
    e.preventDefault();
    const tab = this.getAttribute("data-tab");

    document.querySelectorAll(".sidebar-nav a").forEach(a => a.classList.remove("active"));
    this.classList.add("active");

    document.querySelectorAll(".profile-section").forEach(s => s.classList.remove("active"));
    document.getElementById("tab-" + tab).classList.add("active");

    // Update URL without reload
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
document.getElementById("profile-logout").addEventListener("click", function(e) {
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
  if (val.length >= 6)        s++;
  if (val.length >= 10)       s++;
  if (/[A-Z]/.test(val))      s++;
  if (/[0-9]/.test(val))      s++;
  if (/[!@#$%^&*]/.test(val)) s++;

  const lvl = [
    { w:"0%",   c:"#eee",    t:"",            tc:"#aaa"    },
    { w:"25%",  c:"#e74c3c", t:"Weak",        tc:"#e74c3c" },
    { w:"50%",  c:"#e67e22", t:"Fair",        tc:"#e67e22" },
    { w:"75%",  c:"#f1c40f", t:"Good",        tc:"#e0a800" },
    { w:"90%",  c:"#27ae60", t:"Strong",      tc:"#27ae60" },
    { w:"100%", c:"#1a7a45", t:"Very Strong", tc:"#1a7a45" },
  ][s];

  document.getElementById("str-bar").style.cssText = `width:${lvl.w};background:${lvl.c}`;
  const el = document.getElementById("str-text");
  el.textContent = lvl.t;
  el.style.color = lvl.tc;
}

// =============================================
//  CHANGE PASSWORD
// =============================================
function changePwd() {
  const cur = document.getElementById("cur-pwd").value.trim();
  const nw  = document.getElementById("new-pwd").value.trim();
  const con = document.getElementById("con-pwd").value.trim();
  if (!cur || !nw || !con) { showToast("Please fill all fields!", "error"); return; }
  if (nw !== con)           { showToast("Passwords do not match!", "error"); return; }
  if (nw.length < 6)        { showToast("Min 6 characters required!", "error"); return; }
  showToast("Password updated successfully! ✓", "success");
  document.getElementById("cur-pwd").value = "";
  document.getElementById("new-pwd").value = "";
  document.getElementById("con-pwd").value = "";
  checkStrength("");
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