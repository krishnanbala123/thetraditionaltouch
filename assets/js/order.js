const OrderManager = (() => {
  const API      = CONFIG.BASE_URL;
  const getToken = () => localStorage.getItem("token") || "";

  // ── Price constants (mirrors backend) ──────────────────────────────────────
  const SIZE_EXTRA   = { "2XL": 50, "3XL": 50, "4XL": 100 };
  const ADDON_EXTRA  = { center_feeding: 50 };
  const LENGTH_EXTRA = { "52": 30, "54": 50 };

  // ── Coupon state ────────────────────────────────────────────────────────────
  let appliedCoupon = null; // { code, type, value } or null

  function calcDeliveryFee(totalQty, isInsideTamilNadu) {
    const pairs = Math.ceil(totalQty / 2);
    return isInsideTamilNadu ? pairs * 70 : pairs * 100;
  }

  function computeUnitPrice(item) {
    if (item.unitPrice) return item.unitPrice;
    const p           = item.productId;
    const base        = p.discount
      ? Math.round(p.price - (p.price * p.discount) / 100)
      : p.price;
    const sizeExtra   = SIZE_EXTRA[item.size]                      || 0;
    const addonExtra  = ADDON_EXTRA[item.customisation?.addonType] || 0;
    const lengthExtra = LENGTH_EXTRA[item.customisation?.length]   || 0;
    return base + sizeExtra + addonExtra + lengthExtra;
  }

  // ── Compute discount from applied coupon ────────────────────────────────────
  function computeDiscount(subtotal) {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === "percentage") {
      return Math.round((subtotal * appliedCoupon.value) / 100);
    }
    // flat — never exceed subtotal
    return Math.min(appliedCoupon.value, subtotal);
  }

  // ── Fetch cart from API ─────────────────────────────────────────────────────
  async function fetchCart() {
    const res  = await fetch(`${API}/cart`, {
      headers: {
        Authorization:  `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return data?.items || data?.cart?.items || [];
  }

  // ── Read state dropdown ─────────────────────────────────────────────────────
  function getIsInsideTamilNadu() {
    const stateEl = document.getElementById("state");
    if (!stateEl || !stateEl.value.trim()) return true;
    return stateEl.value.trim().toLowerCase() === "tamil nadu";
  }

  // ── Render price breakdown ──────────────────────────────────────────────────
  function updatePriceSummary(items, isInsideTamilNadu = true) {
    let subtotal = 0;
    let totalQty = 0;
    items.forEach(item => {
      subtotal += computeUnitPrice(item) * (item.quantity || 1);
      totalQty += item.quantity || 1;
    });

    const deliveryFee = totalQty > 0
      ? calcDeliveryFee(totalQty, isInsideTamilNadu) : 0;
    const discount   = computeDiscount(subtotal);
    const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

    const el = id => document.getElementById(id);
    if (el("summary-subtotal"))  el("summary-subtotal").textContent  = `₹${subtotal.toFixed(2)}`;
    if (el("summary-delivery"))  el("summary-delivery").textContent  = deliveryFee > 0 ? `₹${deliveryFee}` : "FREE";
    if (el("summary-total"))     el("summary-total").textContent     = `₹${grandTotal.toFixed(2)}`;

    // Show / hide discount row
    const discountRow = el("discount-row");
    if (discountRow) {
      if (discount > 0) {
        discountRow.style.display = "";
        if (el("summary-discount"))  el("summary-discount").textContent  = `-₹${discount}`;
        if (el("discount-label"))    el("discount-label").textContent    =
          appliedCoupon.type === "percentage"
            ? `${appliedCoupon.value}% off`
            : `₹${appliedCoupon.value} off`;
      } else {
        discountRow.style.display = "none";
      }
    }

    window._checkoutSubtotal   = subtotal;
    window._checkoutDiscount   = discount;
    window._checkoutDelivery   = deliveryFee;
    window._checkoutGrandTotal = grandTotal;
  }

  // ── Apply coupon ────────────────────────────────────────────────────────────
  async function applyCoupon() {
    const inputEl = document.getElementById("coupon-input");
    const msgEl   = document.getElementById("coupon-msg");
    const applyBtn = document.getElementById("apply-coupon-btn");
    const code    = inputEl?.value.trim().toUpperCase();

    if (!code) {
      showCoToast("Please enter a coupon code.", "warn");
      return;
    }

    // Show loading state
    if (applyBtn) { applyBtn.disabled = true; applyBtn.textContent = "Checking…"; }
    if (msgEl)    { msgEl.style.display = "block"; msgEl.className = "coupon-msg loading"; msgEl.textContent = "Validating code…"; }

    try {
      // Need subtotal to check minimum order
      const items    = await fetchCart();
      let subtotal   = 0;
      items.forEach(item => { subtotal += computeUnitPrice(item) * (item.quantity || 1); });

      const res  = await fetch(`${API}/coupons`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: "validate", code, subtotal }),
      });
      const data = await res.json();

      if (!res.ok || !data.valid) {
        // Invalid coupon
        appliedCoupon = null;
        if (msgEl) {
          msgEl.className   = "coupon-msg error";
          msgEl.textContent = data.message || "Invalid or expired coupon.";
        }
        updatePriceSummary(items, getIsInsideTamilNadu());
      } else {
        // Valid coupon
        appliedCoupon = data.coupon; // { code, type, value }
        const savingText = appliedCoupon.type === "percentage"
          ? `${appliedCoupon.value}% off`
          : `₹${appliedCoupon.value} off`;
        if (msgEl) {
          msgEl.className   = "coupon-msg success";
          msgEl.textContent = `✓ Coupon applied — ${savingText}!`;
        }
        if (inputEl) inputEl.disabled = true;
        // ✅ Update prices FIRST before anything else
        updatePriceSummary(items, getIsInsideTamilNadu());
        if (applyBtn) {
          applyBtn.textContent = "Remove";
          applyBtn.disabled    = false;
          applyBtn.onclick     = removeCoupon;
          return; // skip re-enabling below (button already set to Remove)
        }
      }
    } catch (err) {
      console.error("[OrderManager] applyCoupon:", err);
      if (msgEl) {
        msgEl.className   = "coupon-msg error";
        msgEl.textContent = "Could not validate coupon. Please try again.";
      }
    } finally {
      // Only reset button text if coupon was NOT successfully applied
      if (!appliedCoupon) {
        if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = "Apply"; }
      }
    }
  }

  // ── Remove coupon ───────────────────────────────────────────────────────────
  async function removeCoupon() {
    appliedCoupon = null;

    const inputEl  = document.getElementById("coupon-input");
    const msgEl    = document.getElementById("coupon-msg");
    const applyBtn = document.getElementById("apply-coupon-btn");

    if (inputEl)  { inputEl.disabled = false; inputEl.value = ""; }
    if (msgEl)    { msgEl.style.display = "none"; msgEl.textContent = ""; }
    if (applyBtn) { applyBtn.textContent = "Apply"; applyBtn.onclick = applyCoupon; }

    const items = await fetchCart();
    updatePriceSummary(items, getIsInsideTamilNadu());
  }

  // ── Load & render order summary ─────────────────────────────────────────────
  async function loadSummary() {
    const listEl  = document.getElementById("summary-items");
    const countEl = document.getElementById("summary-item-count");
    const payBtn  = document.getElementById("pay-btn");
    if (!listEl) return;

    const token = getToken();
    if (!token) {
      listEl.innerHTML = `<div class="empty-cart"><i class="fa fa-cart-shopping"></i>
        <p>Please <a href="login.html">login</a> to continue.</p></div>`;
      if (countEl) countEl.textContent = "0 items";
      updatePriceSummary([]);
      return;
    }

    try {
      const items = await fetchCart();

      if (items.length === 0) {
        listEl.innerHTML = `<div class="empty-cart"><i class="fa fa-cart-shopping"></i>
          <p>Your cart is empty.</p><a href="shop.html">← Continue Shopping</a></div>`;
        if (countEl) countEl.textContent = "0 items";
        updatePriceSummary([]);
        return;
      }

      if (countEl)
        countEl.textContent = `${items.length} item${items.length > 1 ? "s" : ""}`;

      listEl.innerHTML = items.map(item => {
        const p         = item.productId;
        const unitPrice = computeUnitPrice(item);
        const qty       = item.quantity || 1;
        const img       = p?.images?.[0] || "";
        const name      = p?.name || "Product";
        const size      = item.size || "";
        return `
          <div class="cart-item-row">
            ${img
              ? `<img class="cart-item-img" src="${img}" alt="${name}"
                      onerror="this.style.display='none'">`
              : `<div class="cart-item-img-placeholder">
                   <i class="fa fa-shirt"></i>
                 </div>`}
            <div class="cart-item-info">
              <div class="cart-item-name">${name}</div>
              <div class="cart-item-meta">
                Size: ${size}
                ${item.customisation?.addonType && item.customisation.addonType !== "non_feeding"
                  ? ` | ${item.customisation.addonType.replace(/_/g, " ")}` : ""}
                ${item.customisation?.length
                  ? ` | ${item.customisation.length}"` : ""}
              </div>
              <div class="cart-item-qty">
                <i class="fa fa-xmark" style="font-size:9px;"></i> ${qty}
              </div>
            </div>
            <div class="cart-item-price">₹${unitPrice * qty}</div>
          </div>`;
      }).join("");

      updatePriceSummary(items, getIsInsideTamilNadu());
      if (payBtn) payBtn.disabled = false;

    } catch (err) {
      console.error("[OrderManager] loadSummary:", err);
      listEl.innerHTML = `<div class="empty-cart"><p>Failed to load cart.</p></div>`;
    }
  }

  // ── Load user profile into form fields ─────────────────────────────────────
  async function loadUserProfile() {
    try {
      const res  = await fetch(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const user = await res.json();
      const parts = (user.name || "").split(" ");
      const el    = id => document.getElementById(id);
      if (el("fname"))   el("fname").value   = parts[0] || "";
      if (el("lname"))   el("lname").value   = parts.slice(1).join(" ") || "";
      if (el("phone"))   el("phone").value   = user.phone   || "";
      if (el("address")) el("address").value = user.address || "";
    } catch (err) {
      console.error("[OrderManager] loadUserProfile:", err);
    }
  }

  // ── Save profile ────────────────────────────────────────────────────────────
  async function updateUserProfile(name, address, phone) {
    await fetch(`${API}/user/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ name, address, phone }),
    });
  }

  // ── Reset pay button ────────────────────────────────────────────────────────
  function resetPayBtn() {
    const btn = document.getElementById("pay-btn");
    const txt = document.getElementById("pay-btn-text");
    if (btn) btn.disabled = false;
    if (txt) txt.textContent = "Place Order & Pay";
  }

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showCoToast(msg, type = "success") {
    if (typeof showToast === "function") { showToast(msg, type); return; }
    const t = document.getElementById("co-toast");
    if (!t) return;
    const icons = { success: "✓", error: "✕", warn: "⚠" };
    t.innerHTML  = `<span>${icons[type]}</span> ${msg}`;
    t.className  = `show ${type}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = ""; }, 3200);
  }

  // ── Main payment flow ───────────────────────────────────────────────────────
  async function startPayment() {
    if (typeof validate === "function" && !validate()) {
      showCoToast("Please fill required fields correctly.", "warn");
      return;
    }

    const token = getToken();
    if (!token) {
      showCoToast("Please login to continue.", "warn");
      setTimeout(() => (window.location.href = "login.html"), 1500);
      return;
    }

    const el       = id => document.getElementById(id);
    const fname    = el("fname")?.value.trim()    || "";
    const lname    = el("lname")?.value.trim()    || "";
    const phone    = el("phone")?.value.trim()    || "";
    const rawAddr  = el("address")?.value.trim()  || "";
    const district = el("district")?.value.trim() || "";
    const state    = el("state")?.value.trim()    || "";
    const pincode  = el("pincode")?.value.trim()  || "";
    const country  = el("country")?.value.trim()  || "";
    const notes    = el("order-notes")?.value.trim() || "";
    const fullName = `${fname} ${lname}`.trim();
    const isInsideTamilNadu = getIsInsideTamilNadu();

    // Build full address string: "Door no., Street, Area, City, District, State - Pincode, Country"
    const address = [rawAddr, district, state, pincode, country]
      .filter(Boolean)
      .join(", ");

    const payBtn    = el("pay-btn");
    const payBtnTxt = el("pay-btn-text");
    if (payBtn) payBtn.disabled = true;
    if (payBtnTxt) payBtnTxt.innerHTML =
      '<span class="spin"><i class="fa fa-spinner"></i></span> Processing…';

    try {
      await updateUserProfile(fullName, rawAddr, phone);

      // Ensure grand total is calculated
      const items = await fetchCart();
      if (!items.length) {
        showCoToast("Your cart is empty!", "error");
        resetPayBtn(); return;
      }

      let grandTotal = window._checkoutGrandTotal;
      if (!grandTotal) {
        let subtotal = 0, qty = 0;
        items.forEach(item => {
          subtotal += computeUnitPrice(item) * (item.quantity || 1);
          qty      += item.quantity || 1;
        });
        const discount = computeDiscount(subtotal);
        grandTotal = subtotal - discount + calcDeliveryFee(qty, isInsideTamilNadu);
      }

      // ── Step 1: Create order in DB (paymentStatus: Pending) ───────────────
      if (payBtnTxt) payBtnTxt.innerHTML =
        '<span class="spin"><i class="fa fa-spinner"></i></span> Creating order…';

      const orderRes  = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethod: "Razorpay",
          address,
          phone,
          isInsideTamilNadu,
          notes,
          couponCode: appliedCoupon?.code || null, // ← send coupon to backend
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        showCoToast(orderData.message || "Order creation failed.", "error");
        resetPayBtn(); return;
      }

      const mongoOrderId = orderData.order._id;

      // ── Step 2: Create Razorpay payment order ─────────────────────────────
      if (payBtnTxt) payBtnTxt.innerHTML =
        '<span class="spin"><i class="fa fa-spinner"></i></span> Opening payment…';

      const rzpRes   = await fetch(`${API}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: grandTotal }),
      });
      const rzpOrder = await rzpRes.json();

      if (!rzpOrder.id) {
        showCoToast("Payment initialisation failed. Try again.", "error");
        resetPayBtn(); return;
      }

      // ── Step 3: Open Razorpay modal ───────────────────────────────────────
      const options = {
        key:         "rzp_live_T1ZjErMMCEB7AM",
        amount:      rzpOrder.amount,
        currency:    "INR",
        name:        "The Traditional Touch",
        description: "Anarkali Collection",
        image:       "./assets/images/dress/logo_1.png",
        order_id:    rzpOrder.id,

        handler: async function (response) {
          try {
            if (payBtnTxt) payBtnTxt.innerHTML =
              '<span class="spin"><i class="fa fa-spinner"></i></span> Verifying payment…';

            // ── Step 4: Verify + update paymentId & paymentStatus ─────────
            const verifyRes  = await fetch(`${API}/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                mongoOrderId,
              }),
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.success) {
              showCoToast("Payment verification failed. Contact support.", "error");
              resetPayBtn(); return;
            }

            // ✅ Order complete
            showCoToast("🎉 Order placed successfully!", "success");
            localStorage.removeItem("cart");
            appliedCoupon = null; // clear coupon state

            setTimeout(() => {
              window.location.href = `invoice.html?orderId=${mongoOrderId}`;
            }, 1500);

          } catch (err) {
            showCoToast(err.message || "Order failed. Contact support.", "error");
            resetPayBtn();
          }
        },

        modal: {
          ondismiss: function () {
            fetch(`${API}/orders/${mongoOrderId}`, {
              method:  "PATCH",
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
            showCoToast("Payment cancelled.", "warn");
            resetPayBtn();
          },
        },

        prefill: { name: fullName, contact: phone },
        theme:   { color: "#3498db" },
      };

      new Razorpay(options).open();

    } catch (err) {
      console.error("[OrderManager] startPayment:", err);
      showCoToast("Something went wrong. Please try again.", "error");
      resetPayBtn();
    }
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    loadUserProfile();
    loadSummary();

    // Recalculate delivery when state changes
    const stateEl = document.getElementById("state");
    if (stateEl) {
      stateEl.addEventListener("change", async () => {
        const items = await fetchCart();
        updatePriceSummary(items, getIsInsideTamilNadu());
      });
    }

    // Wire up coupon apply button
    const applyBtn = document.getElementById("apply-coupon-btn");
    if (applyBtn) applyBtn.addEventListener("click", applyCoupon);

    // Allow Enter key in coupon input
    const couponInput = document.getElementById("coupon-input");
    if (couponInput) {
      couponInput.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); applyCoupon(); }
      });
    }

    // Attach pay button listener
    const btn = document.getElementById("pay-btn");
    if (btn) {
      btn.addEventListener("click", e => {
        e.preventDefault();
        startPayment();
      });
    }
  }

  return { init, loadSummary, updatePriceSummary, applyCoupon, removeCoupon };
})();

document.addEventListener("DOMContentLoaded", OrderManager.init);