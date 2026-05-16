// assets/js/cart.js

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
    const allBadges = document.querySelectorAll(".nav-notification");
    const cartBadge = allBadges[0]; // First one = cart badge
    if (!cartBadge) return;

    if (count > 0) {
      cartBadge.textContent = count;
      cartBadge.style.display = "flex";
    } else {
      cartBadge.textContent = "0";
      cartBadge.style.display = "none";
    }
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
  // POST /api/cart → Add item ✅ size added
  // -------------------------------------------------------
  async function addToCart(
    productId,
    quantity = 1,
    buttonEl = null,
    size = "M",
  ) {
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
    console.log(productId, size, quantity, "cart");

    try {
      const res = await fetch(getEndpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, size, quantity }),
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
      showToast("Item added to cart!", "success");
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

  async function addToCartAuto(
    productId,
    quantity = 1,
    buttonEl = null,
    sizes = [],
  ) {
    const available = Array.isArray(sizes)
      ? sizes.filter((s) => s.stock > 0)
      : [];

    if (available.length === 0) {
      showToast("Out of stock!", "error");
      return;
    }

    const size = available[0].size;
    await addToCart(productId, quantity, buttonEl, size);
  }

  // return object:
  return {
    init,
    addToCart,
    addToCartAuto,
    loadCartCount,
    showToast,
    changeQty,
    removeItem,
  };
  // -------------------------------------------------------
  // PUT /api/cart → Update quantity ✅ size added
  // -------------------------------------------------------
  async function updateCartItem(productId, quantity, size) {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(getEndpoint(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, quantity, size }),
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
  // DELETE /api/cart → Remove item ✅ size added
  // -------------------------------------------------------
  async function removeCartItem(productId, size) {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(getEndpoint(), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, size }),
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
  // CART PAGE - Render
  // -------------------------------------------------------
  async function renderCartPage() {
    const cartBody = document.querySelector(".cartBody");
    if (!cartBody) return;

    const token = getToken();

    if (!token) {
      cartBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:40px;">
            <p style="font-size:16px; color:#888;">
              Please <a href="login.html" style="color:#e74c3c;">login</a> to view your cart.
            </p>
          </td>
        </tr>`;
      updateSummary([]);
      return;
    }

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
        cartBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center;padding:30px;color:#888;">
              Failed to load cart.
            </td>
          </tr>`;
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
              <i class="fa fa-shopping-cart" 
                 style="font-size:48px; color:#ddd; display:block; margin-bottom:15px;"></i>
              <p style="font-size:16px; color:#888; margin-bottom:20px;">
                Your cart is empty!
              </p>
              <a href="shop.html" class="btn btn-primary btn-md">Continue Shopping</a>
            </td>
          </tr>`;
        updateSummary([]);
        return;
      }

      // Render rows
      cartBody.innerHTML = items
        .map((item) => {
          const product = item.productId;
          const pid = product?._id || "";
          const name = product?.name || "Product";
          const price = product?.price || 0;
          const discount = product?.discount || 0;
          const discountedPrice = discount
            ? Math.round(price - (price * discount) / 100)
            : price;
          const image =
            product?.images[0] || "./assets/images/fashion/product/1.jpg";
          const qty = item.quantity || 1;
          const size = item.size || "";
          const total = discountedPrice * qty;

          const imgSrc = image.startsWith("http")
            ? image
            : "./assets/images/fashion/product/1.jpg";

          return `
          <tr data-product-id="${pid}" data-size="${size}">
           <td>
            <div class="product-imgwrap">
              <a href="product-details.html?id=${pid}">
                <img class="img-fluid" src="${imgSrc}" alt="${name}"
                    style="width:70px; height:70px; object-fit:cover; border-radius:8px; cursor:pointer;"
                    onerror="this.src='./assets/images/fashion/product/1.jpg'">
              </a>
            </div>
          </td>
            <td>
              <strong>${name}</strong><br>
              <small class="text-muted">Size: ${size}</small>
            </td>
            <td>
              <div class="input-group pro-quantity">
                <span class="input-group-text count-minus"
                      onclick="CartManager.changeQty(this, '${pid}', -1, '${size}')">
                  <i class="fa fa-minus"></i>
                </span>
                <input class="form-control pro-qty" type="text" 
                       value="${qty}" readonly 
                       style="width:50px; text-align:center;">
                <span class="input-group-text count-plus"
                      onclick="CartManager.changeQty(this, '${pid}', 1, '${size}')">
                  <i class="fa fa-plus"></i>
                </span>
              </div>
            </td>
            <td>₹${discountedPrice}</td>
            <td>-</td>
            <td class="item-total">₹${total}</td>
            <td>
              <div class="cart-action">
                <a class="delete text-danger ml-10" href="javascript:void(0);"
                   onclick="CartManager.removeItem(this, '${pid}', '${size}')">
                  <i data-feather="trash-2"></i>
                </a>
              </div>
            </td>
          </tr>`;
        })
        .join("");

      if (window.feather) feather.replace();
      updateSummary(items);
    } catch (err) {
      console.error("[Cart] Render error:", err);
      cartBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:30px;color:#888;">
            Something went wrong.
          </td>
        </tr>`;
    }
  }

  // -------------------------------------------------------
  // Summary Table
  // -------------------------------------------------------
  function updateSummary(items) {
    const summaryTable = document.querySelector(".chekout-tbl tbody");
    if (!summaryTable) return;

    let subtotal = 0;
    items.forEach((item) => {
      const price = item.productId?.price || 0;
      const discount = item.productId?.discount || 0;
      const discountedPrice = discount
        ? Math.round(price - (price * discount) / 100)
        : price;
      const qty = item.quantity || 1;
      subtotal += discountedPrice * qty;
    });

    const grand = subtotal.toFixed(2);

    summaryTable.innerHTML = `
      <tr>
        <th>Subtotal</th>
        <td>₹${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <th>Grand Total</th>
        <td class="text-success"><strong>₹${grand}</strong></td>
      </tr>
      <tr>
        <td colspan="2">
          <a class="btn btn-primary btn-md" href="checkout.html">
            Proceed to checkout
          </a>
        </td>
      </tr>`;
  }

  // -------------------------------------------------------
  // Change Qty ✅ size pass
  // -------------------------------------------------------
  async function changeQty(btnEl, productId, delta, size) {
    const row = btnEl.closest("tr");
    const qtyEl = row.querySelector(".pro-qty");
    let qty = parseInt(qtyEl.value) + delta;
    if (qty < 1) qty = 1;

    row
      .querySelectorAll(".count-minus, .count-plus")
      .forEach((b) => (b.style.pointerEvents = "none"));

    const data = await updateCartItem(productId, qty, size);

    if (data) {
      qtyEl.value = qty;

      const priceEl = row.querySelector("td:nth-child(4)");
      const totalEl = row.querySelector(".item-total");
      const price = parseFloat(priceEl?.textContent?.replace("₹", "") || 0);
      const total = price * qty;
      if (totalEl) totalEl.textContent = `₹${total}`;

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
        fakeitems.push({ productId: { price: p, discount: 0 }, quantity: q });
      });
      updateSummary(fakeitems);

      const items = data?.cart?.items || [];
      updateBadge(items.reduce((s, i) => s + (i.quantity || 1), 0));
      showToast("Cart updated!", "success");
    }

    row
      .querySelectorAll(".count-minus, .count-plus")
      .forEach((b) => (b.style.pointerEvents = "auto"));
  }

  // -------------------------------------------------------
  // Remove Item ✅ size pass
  // -------------------------------------------------------
  async function removeItem(btnEl, productId, size) {
    const row = btnEl.closest("tr");
    row.style.opacity = "0.4";
    row.style.pointerEvents = "none";

    const data = await removeCartItem(productId, size);

    if (data) {
      row.remove();

      const items = data?.cart?.items || [];
      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
      updateBadge(totalQty);

      const remaining = document.querySelectorAll(
        ".cartBody tr[data-product-id]",
      );
      if (remaining.length === 0) {
        document.querySelector(".cartBody").innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:50px;">
              <i class="fa fa-shopping-cart" 
                 style="font-size:48px; color:#ddd; display:block; margin-bottom:15px;"></i>
              <p style="font-size:16px; color:#888; margin-bottom:20px;">
                Your cart is empty!
              </p>
              <a href="shop.html" class="btn btn-primary btn-md">Continue Shopping</a>
            </td>
          </tr>`;
        updateSummary([]);
      } else {
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
          fakeitems.push({ productId: { price: p, discount: 0 }, quantity: q });
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
  // Clear Cart
  // -------------------------------------------------------
  async function clearCart() {
    const rows = document.querySelectorAll(".cartBody tr[data-product-id]");
    if (rows.length === 0) return;
    if (!confirm("Are you sure you want to clear the entire cart?")) return;

    for (const row of rows) {
      const pid = row.dataset.productId;
      const size = row.dataset.size;
      await removeCartItem(pid, size);
    }

    document.querySelector(".cartBody").innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:50px;">
          <i class="fa fa-shopping-cart" 
             style="font-size:48px; color:#ddd; display:block; margin-bottom:15px;"></i>
          <p style="font-size:16px; color:#888; margin-bottom:20px;">
            Your cart is empty!
          </p>
          <a href="shop.html" class="btn btn-primary btn-md">Continue Shopping</a>
        </td>
      </tr>`;

    updateBadge(0);
    updateSummary([]);
    showToast("Cart cleared!", "success");
  }

  // -------------------------------------------------------
  // Toast
  // -------------------------------------------------------
  function showToast(message, type = "success") {
    const existing = document.getElementById("ttt-toast");
    if (existing) existing.remove();

    const bg = { success: "#22c55e", error: "#ef4444", warn: "#f97316" };
    const icon = { success: "✓", error: "✕", warn: "⚠" };

    const toast = document.createElement("div");
    toast.id = "ttt-toast";
    toast.style.cssText = `
      position: fixed; bottom: 85px; right: 20px;
      background: ${bg[type] || bg.success};
      color: #fff; padding: 13px 20px;
      border-radius: 10px; font-size: 14px; font-weight: 500;
      z-index: 999999; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
      display: flex; align-items: center; gap: 10px;
      max-width: 290px;
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
  // Bind Detail Page Button ✅ size pass
  // -------------------------------------------------------
  function bindDetailButton() {
    const addBtn = document.querySelector(
      ".product-detailright a.btn-primary, .cdxpro-detail a.btn-primary",
    );
    if (!addBtn) return;
    if (!addBtn.textContent.toLowerCase().includes("add to cart")) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");
    if (!productId) return;

    addBtn.href = "javascript:void(0);";
    addBtn.addEventListener("click", function (e) {
      e.preventDefault();

      const selectedSizeEl = document.querySelector(".product-size li.active");
      const size = selectedSizeEl?.dataset?.size || null;

      if (!size) {
        showToast("Please select a size!", "warn");
        return;
      }

      const qtyEl = document.querySelector(".pro-qty");
      const qty = qtyEl ? parseInt(qtyEl.value) || 1 : 1;

      addToCart(productId, qty, this, size);
    });
  }

  // -------------------------------------------------------
  // Bind Clear Cart
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
    loadCartCount();
    bindClearCart();

    if (document.querySelector(".cartBody")) {
      renderCartPage();
    }
  }

  return {
    init,
    addToCart,
    addToCartAuto,
    loadCartCount,
    showToast,
    changeQty,
    removeItem,
  };
})();

document.addEventListener("DOMContentLoaded", () => CartManager.init());
