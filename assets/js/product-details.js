// assets/js/product-details.js

let selectedSize = null;
let currentProduct = null;

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (!productId) {
    window.location.href = "shop.html";
    return;
  }

  fetchProductById(productId);
});

// ========================
// Fetch All → Filter by ID
// ========================
async function fetchProductById(productId) {
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(`${CONFIG.BASE_URL}/products`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      const product = data.products.find((p) => p._id === productId);

      if (product) {
        currentProduct = product;
        renderProductDetail(product);
      } else {
        alert("Product not found!");
        window.location.href = "shop.html";
      }
    } else {
      alert("Failed to load product!");
      window.location.href = "shop.html";
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Network error!");
  }
}

// ========================
// Render Product Detail
// ========================
function renderProductDetail(product) {
  const discountedPrice = product.discount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

  // Wishlist button setup
  const wishlistBtn = document.querySelector(
    ".cdxpro-detail a.btn-primary[href='wishlist.html']",
  );
  if (wishlistBtn) {
    wishlistBtn.setAttribute("data-wishlist-id", product._id);
    wishlistBtn.href = "javascript:void(0);";
    wishlistBtn.addEventListener("click", function (e) {
      e.preventDefault();
      WishlistManager.toggleWishlist(product._id, this);
    });
  }

  // Name
  const nameEl = document.querySelector(".cdxpro-detail h2");
  if (nameEl) nameEl.textContent = product.name;

  // Price
  const newPriceEl = document.querySelector(".new-price");
  if (newPriceEl) newPriceEl.textContent = `₹${discountedPrice}`;

  const oldPriceEl = document.querySelector(".old-price del");
  if (oldPriceEl) {
    oldPriceEl.textContent = product.discount ? `₹${product.price}` : "";
  }

  // Discount Badge
  const badgeEl = document.querySelector(".ofr-price .badge");
  if (badgeEl) {
    badgeEl.textContent = product.discount ? `${product.discount}% off` : "";
    badgeEl.style.display = product.discount ? "inline-block" : "none";
  }

  // Image - main + thumb
  const mainImgs = document.querySelectorAll(
    ".forslider .swiper-slide .product-imgwrap img",
  );
  mainImgs.forEach((img) => {
    img.src = product.image;
    img.alt = product.name;
  });

  const thumbImgs = document.querySelectorAll(
    ".toslider .swiper-slide .product-imgwrap img",
  );
  thumbImgs.forEach((img) => {
    img.src = product.image;
    img.alt = product.name;
  });

  // Sizes
  const sizeList = document.querySelector(".product-size");
  if (sizeList) {
    sizeList.innerHTML = product.sizes
      .map((s) => {
        const isOut = s.stock === 0;
        return `
        <li class="${isOut ? "" : ""}" 
            data-size="${s.size}"
            data-stock="${s.stock}"
            style="${isOut ? "opacity:0.4;cursor:not-allowed;" : "cursor:pointer;"}"
            onclick="${!isOut ? `selectSize(this, '${s.size}')` : ""}">
          <a href="javascript:void(0);">${s.size}</a>
          ${isOut ? '<small style="display:block;font-size:9px;color:red;line-height:1;">Out</small>' : ""}
        </li>
      `;
      })
      .join("");
  }

  // Page Title
  document.title = `${product.name} - The Traditional Touch`;

  // Add to Cart Button
  setupCartButton(product);
}

// ========================
// Setup Cart Button
// ========================
function setupCartButton(product) {
  const cartBtns = document.querySelectorAll(".btn-primary");
  cartBtns.forEach((btn) => {
    if (btn.textContent.trim().toLowerCase().includes("add to cart")) {
      btn.removeAttribute("href");
      btn.style.cursor = "pointer";
      btn.addEventListener("click", function (e) {
        e.preventDefault();

        if (!selectedSize) {
          showDetailMessage("Please select a size!", "error");
          return;
        }

        const qty = parseInt(document.querySelector(".pro-qty")?.value || 1);
        CartManager.addToCart(product._id, qty, btn, selectedSize);
        showDetailMessage(
          `Added to cart! Size: ${selectedSize}, Qty: ${qty}`,
          "success",
        );
      });
    }
  });
}

// ========================
// Size Select
// ========================
function selectSize(el, size) {
  document.querySelectorAll(".product-size li").forEach((li) => {
    li.classList.remove("active");
  });
  el.classList.add("active");
  selectedSize = size;
}

// ========================
// Toast Message
// ========================
function showDetailMessage(msg, type) {
  const existing = document.getElementById("detail-toast");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "detail-toast";
  div.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    background: ${type === "success" ? "#d4edda" : "#f8d7da"};
    color: ${type === "success" ? "#155724" : "#721c24"};
    border: 1px solid ${type === "success" ? "#c3e6cb" : "#f5c6cb"};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}
