// assets/js/wishlist.js

const WishlistManager = (() => {
  // -------------------------------------------------------
  // CONFIG
  // -------------------------------------------------------
  function getEndpoint() {
    return `${CONFIG.BASE_URL}/wishlist`;
  }

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  // -------------------------------------------------------
  // Navbar Wishlist Badge
  // Mirrors cart.js: uses querySelectorAll(".nav-notification")[1]
  // (cart badge = index 0, wishlist badge = index 1)
  // -------------------------------------------------------
  function updateWishlistBadge(count) {
    const allBadges = document.querySelectorAll(".nav-notification");
    const wishlistBadge = allBadges[1]; // Second badge = wishlist
    if (!wishlistBadge) return;

    if (count > 0) {
      wishlistBadge.textContent = count;
      wishlistBadge.style.display = "flex";
    } else {
      wishlistBadge.textContent = "0";
      wishlistBadge.style.display = "none";
    }
  }

  // -------------------------------------------------------
  // Load Wishlist Count (navbar badge + mark hearts)
  // -------------------------------------------------------
  async function loadWishlistCount() {
    const token = getToken();

    if (!token) {
      updateWishlistBadge(0);
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
        updateWishlistBadge(0);
        return;
      }

      const data = await res.json();
      const products = data?.products || [];

      updateWishlistBadge(products.length);
      markWishlistedProducts(products.map((p) => p._id));
    } catch (err) {
      console.error("[Wishlist] Load error:", err);
      updateWishlistBadge(0);
    }
  }

  // -------------------------------------------------------
  // Mark Wishlisted Hearts
  // -------------------------------------------------------
  function markWishlistedProducts(productIds = []) {
    document.querySelectorAll("[data-wishlist-id]").forEach((btn) => {
      const pid = btn.dataset.wishlistId;
      const icon = btn.querySelector("i");

      if (productIds.includes(pid)) {
        btn.classList.add("wishlisted");
        if (icon) {
          icon.style.color = "#e74c3c";
          icon.style.fill = "#e74c3c";
        }
      } else {
        btn.classList.remove("wishlisted");
        if (icon) {
          icon.style.color = "";
          icon.style.fill = "";
        }
      }
    });
  }

  // -------------------------------------------------------
  // Toggle Wishlist (add / remove)
  // -------------------------------------------------------
  async function toggleWishlist(productId, btnEl = null) {
    const token = getToken();

    if (!token) {
      showToast("Please login to add to wishlist.", "warn");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
      return;
    }

    // Show spinner
    if (btnEl) {
      btnEl.disabled = true;
      btnEl._origHTML = btnEl.innerHTML;
      btnEl.innerHTML = `<i class="fa fa-spinner fa-spin"></i>`;
    }

    try {
      const res = await fetch(getEndpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.message || "Something went wrong.", "error");
        return;
      }

      const products = data?.wishlist?.products || [];
      updateWishlistBadge(products.length);

      const isAdded = data.message?.toLowerCase().includes("added");

      // Update all matching heart buttons
      document
        .querySelectorAll(`[data-wishlist-id="${productId}"]`)
        .forEach((btn) => {
          const icon = btn.querySelector("i");

          if (isAdded) {
            btn.classList.add("wishlisted");
            if (icon) {
              icon.style.color = "#e74c3c";
              icon.style.fill = "#e74c3c";
            }
          } else {
            btn.classList.remove("wishlisted");
            if (icon) {
              icon.style.color = "";
              icon.style.fill = "";
            }
          }
        });

      showToast(
        isAdded ? "Added to wishlist!" : "Removed from wishlist.",
        isAdded ? "success" : "warn",
      );
    } catch (err) {
      console.error("[Wishlist] Toggle error:", err);
      showToast("Network error. Please try again.", "error");
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = btnEl._origHTML || `<i data-feather="heart"></i>`;
        if (window.feather) feather.replace();
      }
    }
  }

  // -------------------------------------------------------
  // Render Wishlist Page
  // -------------------------------------------------------
  async function renderWishlistPage() {
    const tbody = document.querySelector(".wishlistBody");
    if (!tbody) return;

    const token = getToken();

    if (!token) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:40px;">
            Please <a href="login.html" style="color:#e74c3c;">login</a> to view your wishlist.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:40px;">
          <i class="fa fa-spinner fa-spin" style="font-size:28px; color:#e74c3c;"></i>
          <p style="margin-top:10px; color:#888;">Loading wishlist...</p>
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
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:30px;">
              Failed to load wishlist.
            </td>
          </tr>`;
        return;
      }

      const data = await res.json();
      const products = data?.products || [];

      updateWishlistBadge(products.length);

      // Empty wishlist
      if (products.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:50px;">
              <i class="fa fa-heart" style="font-size:48px; color:#ddd; display:block; margin-bottom:15px;"></i>
              <p style="font-size:16px; color:#888; margin-bottom:20px;">Your wishlist is empty!</p>
              <a href="shop.html" class="btn btn-primary btn-md">Continue Shopping</a>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = products
        .map((product) => {
          console.log("Wishlist Product:", product);

          // ── Image ──────────────────────────────────────────────
          const productImage =
            Array.isArray(product.images) &&
            product.images.length > 0 &&
            product.images[0]
              ? product.images[0]
              : "./assets/images/fashion/product/1.jpg";

          // ── Price ──────────────────────────────────────────────
          const discountedPrice = product.discount
            ? Math.round(product.price - (product.price * product.discount) / 100)
            : product.price;

          // ── Stock ─────────────────────────────────────────────
          // sizes[] = [{ size: "M" }, { size: "L" }] — labels only, NO per-size stock
          // Stock is a single top-level number: product.stock
          const sizesArray = Array.isArray(product.sizes) ? product.sizes : [];
          const hasStock   = (product.stock ?? 0) > 0;

          // First defined size — auto-picked for "Add to cart"
          // User can always go to the product page to pick a different size
          const firstAvailableSize = sizesArray[0]?.size || "";

          // All defined sizes as a display label (e.g. "S, M, L, XL")
          const allSizes = sizesArray.map((s) => s.size).join(", ");

          return `
            <tr data-product-id="${product._id}">
              <td>
                <div class="product-imgwrap">
                  <img
                    class="img-fluid"
                    src="${productImage}"
                    alt="${product.name}"
                    style="width:70px; height:70px; object-fit:cover; border-radius:8px;"
                    onerror="this.src='./assets/images/fashion/product/1.jpg'"
                  >
                </div>
              </td>

              <td>
                <a class="text-default" href="product-details.html?id=${product._id}">
                  <strong>${product.name}</strong>
                </a>
                ${allSizes
                  ? `<br><small class="text-muted">Sizes: ${allSizes}</small>`
                  : ""}
              </td>

              <td>
                ₹${discountedPrice}
                ${product.discount
                  ? `<br><small><del style="color:#aaa;">₹${product.price}</del></small>`
                  : ""}
              </td>

              <td>
                <span style="color:${hasStock ? "#22c55e" : "#ef4444"}; font-weight:500;">
                  ${hasStock ? "In Stock" : "Out of Stock"}
                </span>
              </td>

              <td>
                ${hasStock
                  ? `<a
                      class="btn btn-primary btn-sm"
                      href="javascript:void(0);"
                      onclick="WishlistManager.addToCartFromWishlist('${product._id}', '${firstAvailableSize}', this)"
                    >
                      Add to cart
                    </a>`
                  : `<button class="btn btn-sm" disabled style="background:#ccc; cursor:not-allowed;">
                      Out of Stock
                    </button>`}
              </td>

              <td>
                <div class="cart-action">
                  <a
                    class="delete text-danger"
                    href="javascript:void(0);"
                    onclick="WishlistManager.removeFromWishlistPage('${product._id}', this)"
                  >
                    <i data-feather="trash-2"></i>
                  </a>
                </div>
              </td>
            </tr>`;
        })
        .join("");

      if (window.feather) feather.replace();
    } catch (err) {
      console.error("[Wishlist] Render error:", err);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:30px;">
            Something went wrong.
          </td>
        </tr>`;
    }
  }

  // -------------------------------------------------------
  // Add to Cart from Wishlist Page
  // Delegates to CartManager — mirrors cart.js pattern
  // -------------------------------------------------------
  async function addToCartFromWishlist(productId, size, btnEl) {
    if (!size) {
      showToast("No size available!", "error");
      return;
    }

    await CartManager.addToCart(productId, 1, btnEl, size);
  }

  // -------------------------------------------------------
  // Remove Item on Wishlist Page
  // -------------------------------------------------------
  async function removeFromWishlistPage(productId, btnEl) {
    const row = btnEl.closest("tr");

    row.style.opacity = "0.4";
    row.style.pointerEvents = "none";

    try {
      const token = getToken();

      const res = await fetch(getEndpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) throw new Error("Remove failed");

      row.remove();
      loadWishlistCount();

      const remaining = document.querySelectorAll(".wishlistBody tr[data-product-id]");

      if (remaining.length === 0) {
        document.querySelector(".wishlistBody").innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:50px;">
              <i class="fa fa-heart" style="font-size:48px; color:#ddd; display:block; margin-bottom:15px;"></i>
              <p style="font-size:16px; color:#888; margin-bottom:20px;">Your wishlist is empty!</p>
            </td>
          </tr>`;
      }

      showToast("Removed from wishlist.", "warn");
    } catch (err) {
      console.error("[Wishlist] Remove error:", err);
      row.style.opacity = "1";
      row.style.pointerEvents = "auto";
      showToast("Failed to remove item.", "error");
    }
  }

  // -------------------------------------------------------
  // Toast — unified with cart.js (same structure & styling)
  // Uses id "wishlist-toast" to avoid colliding with "ttt-toast"
  // -------------------------------------------------------
  function showToast(message, type = "success") {
    const existing = document.getElementById("wishlist-toast");
    if (existing) existing.remove();

    const bg   = { success: "#22c55e", error: "#ef4444", warn: "#f97316" };
    const icon = { success: "✓",       error: "✕",       warn: "⚠" };

    const toast = document.createElement("div");
    toast.id = "wishlist-toast";
    toast.style.cssText = `
      position: fixed; bottom: 85px; right: 20px;
      background: ${bg[type] || bg.success};
      color: #fff; padding: 13px 20px;
      border-radius: 10px; font-size: 14px; font-weight: 500;
      z-index: 999999; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
      display: flex; align-items: center; gap: 10px;
      max-width: 290px;
    `;
    toast.innerHTML = `<span style="font-size:17px;">${icon[type]}</span>${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = "opacity .3s";
      toast.style.opacity    = "0";
      setTimeout(() => toast.remove(), 320);
    }, 2800);
  }

  // -------------------------------------------------------
  // INIT
  // -------------------------------------------------------
  function init() {
    loadWishlistCount();

    if (document.querySelector(".wishlistBody")) {
      renderWishlistPage();
    }
  }

  // -------------------------------------------------------
  // Public API — mirrors cart.js exposure style
  // -------------------------------------------------------
  return {
    init,
    toggleWishlist,
    loadWishlistCount,
    addToCartFromWishlist,
    removeFromWishlistPage,
    showToast,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  WishlistManager.init();
});