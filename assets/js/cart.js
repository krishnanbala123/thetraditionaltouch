// =============================================
//  THE TRADITIONAL TOUCH - Cart Manager
//  Uses CONFIG.BASE_URL from config.js
//  APIs:
//   POST   /api/cart  → Add to cart
//   GET    /api/cart  → View cart
//   PUT    /api/cart  → Update quantity
//   DELETE /api/cart  → Remove item
// =============================================

const CartManager = (() => {
  function getEndpoint() {
    return `${CONFIG.BASE_URL}/cart`;
  }

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  // -------------------------------------------------------
  // Navbar Badge Update
  // -------------------------------------------------------
  function updateBadge(count) {
    const badges = document.querySelectorAll(".nav-iconlist .nav-notification");
    const cartBadge = badges[0];
    if (!cartBadge) return;
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? "flex" : "none";
  }

  // -------------------------------------------------------
  // GET /api/cart → Load cart count for navbar badge
  // -------------------------------------------------------
  async function loadCartCount() {
    const token = getToken();
    if (!token) {
      updateBadge(0);
      return;
    }

    try {
      const res = await fetch(getEndpoint(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        updateBadge(0);
        return;
      }

      const data = await res.json();
      const items = data?.items || data?.cart?.items || [];
      const totalQty = items.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0,
      );
      updateBadge(totalQty);
    } catch (err) {
      console.error("[Cart] Load badge error:", err);
      updateBadge(0);
    }
  }

  // -------------------------------------------------------
  // POST /api/cart → Add item to cart
  // -------------------------------------------------------
  async function addToCart(productId, quantity = 1, buttonEl = null) {
    const token = getToken();

    if (!token) {
      showToast("Please login to add items to cart.", "warn");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
      return;
    }

    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl._origHTML = buttonEl.innerHTML;
      buttonEl.innerHTML = `<i class="fa fa-spinner fa-spin"></i>`;
    }

    try {
      const res = await fetch(getEndpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, quantity }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.message || "Could not add item.", "error");
        return;
      }

      const items = data?.cart?.items || data?.items || [];
      const totalQty = items.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0,
      );
      updateBadge(totalQty);
      showToast("Item added to cart! 🛒", "success");
    } catch (err) {
      console.error("[Cart] Add error:", err);
      showToast("Network error. Please try again.", "error");
    } finally {
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.innerHTML =
          buttonEl._origHTML || `<i data-feather="shopping-cart"></i>`;
        if (window.feather) feather.replace();
      }
    }
  }

  // -------------------------------------------------------
  // PUT /api/cart → Update quantity
  // -------------------------------------------------------
  async function updateCartItem(productId, quantity) {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(getEndpoint(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, quantity }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data?.message || "Update failed.", "error");
        return null;
      }

      return data;
    } catch (err) {
      console.error("[Cart] Update error:", err);
      showToast("Network error.", "error");
      return null;
    }
  }

  // -------------------------------------------------------
  // DELETE /api/cart → Remove item
  // -------------------------------------------------------
  async function removeCartItem(productId) {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(getEndpoint(), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data?.message || "Remove failed.", "error");
        return null;
      }

      return data;
    } catch (err) {
      console.error("[Cart] Remove error:", err);
      showToast("Network error.", "error");
      return null;
    }
  }

  // -------------------------------------------------------
  // CART PAGE - Render cart items into table
  // -------------------------------------------------------
  async function renderCartPage() {
    const cartBody = document.querySelector(".cartBody");
    if (!cartBody) return; // Not on cart page

    const token = getToken();

    // Not logged in
    if (!token) {
      cartBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:40px;">
            <p style="font-size:16px; color:#888;">Please <a href="login.html" style="color:#e74c3c;">login</a> to view your cart.</p>
          </td>
        </tr>`;
      updateSummary([], 0);
      return;
    }

    // Loading state
    cartBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:40px;">
          <i class="fa fa-spinner fa-spin" style="font-size:28px; color:#e74c3c;"></i>
          <p style="margin-top:10px; color:#888;">Loading your cart...</p>
        </td>
      </tr>`;

    try {
      const res = await fetch(getEndpoint(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        cartBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#888;">Failed to load cart.</td></tr>`;
        return;
      }

      const data = await res.json();
      const items = data?.items || data?.cart?.items || [];

      // Update navbar badge
      const totalQty = items.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0,
      );
      updateBadge(totalQty);

      // Empty cart
      if (items.length === 0) {
        cartBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:50px;">
              <i class="fa fa-shopping-cart" style="font-size:48px; color:#ddd; display:block; margin-bottom:15px;"></i>
              <p style="font-size:16px; color:#888; margin-bottom:20px;">Your cart is empty!</p>
              <a href="shop.html" class="btn btn-primary btn-md">Continue Shopping</a>
            </td>
          </tr>`;
        updateSummary([], 0);
        return;
      }

      // Render rows
      cartBody.innerHTML = items
        .map((item) => {
          const product = item.productId; // populated object from API
          const itemId = item._id;
          const pid = product?._id || "";
          const name = product?.name || "Product";
          const price = product?.price || 0;
          const image =
            product?.image || "./assets/images/fashion/product/1.jpg";
          const qty = item.quantity || 1;
          const total = price * qty;
          const tax = (total * 0.01).toFixed(2); // 1% tax example

          // Image URL — if it's just a filename, use placeholder
          const imgSrc = image.startsWith("http")
            ? image
            : `./assets/images/fashion/product/1.jpg`;

          return `
          <tr data-product-id="${pid}" data-item-id="${itemId}">
            <td>
              <div class="product-imgwrap">
                <img class="img-fluid" src="${imgSrc}" alt="${name}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
              </div>
            </td>
            <td><strong>${name}</strong></td>
            <td>
              <div class="input-group pro-quantity">
                <span class="input-group-text count-minus" onclick="CartManager.changeQty(this, '${pid}', -1)">
                  <i class="fa fa-minus"></i>
                </span>
                <input class="form-control pro-qty" type="text" value="${qty}" readonly style="width:50px; text-align:center;">
                <span class="input-group-text count-plus" onclick="CartManager.changeQty(this, '${pid}', 1)">
                  <i class="fa fa-plus"></i>
                </span>
              </div>
            </td>
            <td>₹${price}</td>
            <td>₹${tax}</td>
            <td class="item-total">₹${total}</td>
            <td>
              <div class="cart-action">
                <a class="delete text-danger ml-10" href="javascript:void(0);" onclick="CartManager.removeItem(this, '${pid}')">
                  <i data-feather="trash-2"></i>
                </a>
              </div>
            </td>
          </tr>`;
        })
        .join("");

      // Re-init feather icons
      if (window.feather) feather.replace();

      // Update summary table
      updateSummary(items);
    } catch (err) {
      console.error("[Cart] Render error:", err);
      cartBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#888;">Something went wrong.</td></tr>`;
    }
  }

  // -------------------------------------------------------
  // Update summary table (bottom right)
  // -------------------------------------------------------
  function updateSummary(items) {
    const summaryTable = document.querySelector(".chekout-tbl tbody");
    if (!summaryTable) return;

    let subtotal = 0;
    items.forEach((item) => {
      const price = item.productId?.price || 0;
      const qty = item.quantity || 1;
      subtotal += price * qty;
    });

    const tax = (subtotal * 0.01).toFixed(2);
    const discount = 0;
    const grand = (subtotal + parseFloat(tax) - discount).toFixed(2);

    summaryTable.innerHTML = `
      <tr>
        <th>Subtotal</th>
        <td>₹${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <th>Tax (1%)</th>
        <td>₹${tax}</td>
      </tr>
      <tr>
        <th>Discount</th>
        <td>₹${discount}.00</td>
      </tr>
      <tr>
        <th>Grand Total</th>
        <td class="text-success"><strong>₹${grand}</strong></td>
      </tr>
      <tr>
        <td colspan="2">
          <a class="btn btn-primary btn-md" href="checkout.html">Proceed to checkout</a>
        </td>
      </tr>`;
  }

  // -------------------------------------------------------
  // Change quantity (+/-)  — called from HTML onclick
  // -------------------------------------------------------
  async function changeQty(btnEl, productId, delta) {
    const row = btnEl.closest("tr");
    const qtyEl = row.querySelector(".pro-qty");
    let qty = parseInt(qtyEl.value) + delta;

    if (qty < 1) qty = 1;

    // Disable buttons during API call
    row
      .querySelectorAll(".count-minus, .count-plus")
      .forEach((b) => (b.style.pointerEvents = "none"));

    const data = await updateCartItem(productId, qty);

    if (data) {
      qtyEl.value = qty;

      // Recalculate row total
      const priceEl = row.querySelector("td:nth-child(4)");
      const totalEl = row.querySelector(".item-total");
      const price = parseFloat(priceEl?.textContent?.replace("₹", "") || 0);
      const total = price * qty;
      const tax = (total * 0.01).toFixed(2);

      if (totalEl) totalEl.textContent = `₹${total}`;
      const taxEl = row.querySelector("td:nth-child(5)");
      if (taxEl) taxEl.textContent = `₹${tax}`;

      // Recalculate summary
      const allRows = document.querySelectorAll(
        ".cartBody tr[data-product-id]",
      );
      let subtotal = 0;
      allRows.forEach((r) => {
        const t = parseFloat(
          r.querySelector(".item-total")?.textContent?.replace("₹", "") || 0,
        );
        subtotal += t;
      });

      const items = data?.cart?.items || [];
      updateBadge(items.reduce((s, i) => s + (i.quantity || 1), 0));

      // Re-render summary with current values
      const fakeitems = [];
      allRows.forEach((r) => {
        const pid = r.dataset.productId;
        const q = parseInt(r.querySelector(".pro-qty")?.value || 1);
        const p = parseFloat(
          r.querySelector("td:nth-child(4)")?.textContent?.replace("₹", "") ||
            0,
        );
        fakeitems.push({ productId: { _id: pid, price: p }, quantity: q });
      });
      updateSummary(fakeitems);

      showToast("Cart updated!", "success");
    }

    row
      .querySelectorAll(".count-minus, .count-plus")
      .forEach((b) => (b.style.pointerEvents = "auto"));
  }

  // -------------------------------------------------------
  // Remove item — called from HTML onclick
  // -------------------------------------------------------
  async function removeItem(btnEl, productId) {
    const row = btnEl.closest("tr");

    // Animate row
    row.style.opacity = "0.4";
    row.style.pointerEvents = "none";

    const data = await removeCartItem(productId);

    if (data) {
      row.remove();

      // Update badge
      const items = data?.cart?.items || [];
      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
      updateBadge(totalQty);

      // Check if cart is now empty
      const remaining = document.querySelectorAll(
        ".cartBody tr[data-product-id]",
      );
      if (remaining.length === 0) {
        document.querySelector(".cartBody").innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:50px;">
              <i class="fa fa-shopping-cart" style="font-size:48px; color:#ddd; display:block; margin-bottom:15px;"></i>
              <p style="font-size:16px; color:#888; margin-bottom:20px;">Your cart is empty!</p>
              <a href="shop.html" class="btn btn-primary btn-md">Continue Shopping</a>
            </td>
          </tr>`;
        updateSummary([]);
      } else {
        // Recalculate summary
        const allRows = document.querySelectorAll(
          ".cartBody tr[data-product-id]",
        );
        const fakeitems = [];
        allRows.forEach((r) => {
          const q = parseInt(r.querySelector(".pro-qty")?.value || 1);
          const p = parseFloat(
            r.querySelector("td:nth-child(4)")?.textContent?.replace("₹", "") ||
              0,
          );
          fakeitems.push({ productId: { price: p }, quantity: q });
        });
        updateSummary(fakeitems);
      }

      showToast("Item removed from cart.", "success");
    } else {
      row.style.opacity = "1";
      row.style.pointerEvents = "auto";
    }
  }

  // -------------------------------------------------------
  // Clear entire cart — "Clear Shopping Cart" button
  // -------------------------------------------------------
  async function clearCart() {
    const rows = document.querySelectorAll(".cartBody tr[data-product-id]");
    if (rows.length === 0) return;

    if (!confirm("Are you sure you want to clear the entire cart?")) return;

    // Remove all items one by one
    for (const row of rows) {
      const pid = row.dataset.productId;
      await removeCartItem(pid);
    }

    document.querySelector(".cartBody").innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:50px;">
          <i class="fa fa-shopping-cart" style="font-size:48px; color:#ddd; display:block; margin-bottom:15px;"></i>
          <p style="font-size:16px; color:#888; margin-bottom:20px;">Your cart is empty!</p>
          <a href="shop.html" class="btn btn-primary btn-md">Continue Shopping</a>
        </td>
      </tr>`;

    updateBadge(0);
    updateSummary([]);
    showToast("Cart cleared!", "success");
  }

  // -------------------------------------------------------
  // Toast Notification
  // -------------------------------------------------------
  function showToast(message, type = "success") {
    const existing = document.getElementById("ttt-toast");
    if (existing) existing.remove();

    const bg = { success: "#22c55e", error: "#ef4444", warn: "#f97316" };
    const icon = { success: "✓", error: "✕", warn: "⚠" };

    if (!document.getElementById("ttt-toast-style")) {
      const style = document.createElement("style");
      style.id = "ttt-toast-style";
      style.textContent = `
        @keyframes tttSlideIn {
          from { opacity:0; transform: translateY(20px); }
          to   { opacity:1; transform: translateY(0); }
        }`;
      document.head.appendChild(style);
    }

    const toast = document.createElement("div");
    toast.id = "ttt-toast";
    toast.style.cssText = `
      position: fixed; bottom: 85px; right: 20px;
      background: ${bg[type] || bg.success};
      color: #fff; padding: 13px 20px;
      border-radius: 10px; font-size: 14px; font-weight: 500;
      z-index: 999999; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
      display: flex; align-items: center; gap: 10px;
      max-width: 290px; animation: tttSlideIn .3s ease;
    `;
    toast.innerHTML = `<span style="font-size:17px">${icon[type]}</span>${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = "opacity .3s";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 320);
    }, 2800);
  }

  // -------------------------------------------------------
  // Bind product card cart buttons (index.html, shop.html)
  // -------------------------------------------------------
  function bindCardButtons() {
    document.querySelectorAll(".product-boxwrap").forEach((wrap) => {
      const productId = wrap.dataset.productId;
      if (!productId) return;

      const cartBtn = wrap.querySelector(".social li:first-child a");
      if (!cartBtn) return;

      cartBtn.href = "javascript:void(0);";
      cartBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        addToCart(productId, 1, this);
      });
    });
  }

  // -------------------------------------------------------
  // Bind product detail page button
  // -------------------------------------------------------
  function bindDetailButton() {
    const addBtn = document.querySelector(
      ".product-detailright a.btn-primary, .cdxpro-detail a.btn-primary",
    );
    if (!addBtn) return;
    if (!addBtn.textContent.toLowerCase().includes("add to cart")) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id") || document.body.dataset.productId;
    if (!productId) return;

    addBtn.href = "javascript:void(0);";
    addBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const qtyEl = document.querySelector(".pro-qty");
      const qty = qtyEl ? parseInt(qtyEl.value) || 1 : 1;
      addToCart(productId, qty, this);
    });
  }

  // -------------------------------------------------------
  // Bind Quick-View Popup button
  // -------------------------------------------------------
  function bindPopupButton() {
    const popup = document.getElementById("quickpopupPopup");
    const addBtn = popup?.querySelector(".btn-primary");
    if (!addBtn) return;
    if (!addBtn.textContent.toLowerCase().includes("add to cart")) return;

    addBtn.href = "javascript:void(0);";
    addBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const productId = popup.dataset.productId;
      if (!productId) {
        showToast("Product ID missing.", "error");
        return;
      }
      addToCart(productId, 1, this);
    });
  }

  // -------------------------------------------------------
  // Bind "Clear Shopping Cart" button
  // -------------------------------------------------------
  function bindClearCart() {
    const clearBtn = document.querySelector(".removeAll_cart");
    if (!clearBtn) return;
    clearBtn.addEventListener("click", function (e) {
      e.preventDefault();
      clearCart();
    });
  }

  // -------------------------------------------------------
  // INIT
  // -------------------------------------------------------
  function init() {
    loadCartCount(); // navbar badge
    bindCardButtons(); // shop / index product cards
    bindDetailButton(); // product detail page
    bindPopupButton(); // quick view popup
    bindClearCart(); // clear cart button

    // If on cart page → render cart
    if (document.querySelector(".cartBody")) {
      renderCartPage();
    }
  }

  // Public API
  return { init, addToCart, loadCartCount, showToast, changeQty, removeItem };
})();

document.addEventListener("DOMContentLoaded", () => CartManager.init());
