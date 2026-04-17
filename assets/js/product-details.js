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
// Fetch Product
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
        // ✅ Already fetched data — again API call இல்ல
        fetchRelatedProducts(productId, data.products);
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
// Render Product
// ========================
function renderProductDetail(product) {
  const discountedPrice = product.discount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

  // ================= IMAGE FIX =================
  const mainWrapper = document.querySelector(".forslider .swiper-wrapper");
  const thumbWrapper = document.querySelector(".toslider .swiper-wrapper");

  if (mainWrapper && thumbWrapper) {
    mainWrapper.innerHTML = "";
    thumbWrapper.innerHTML = "";

    product.images.forEach((imgUrl) => {
      mainWrapper.innerHTML += `
        <div class="swiper-slide">
          <div class="product-imgwrap">
            <img class="img-fluid" src="${imgUrl}" alt="${product.name}">
          </div>
        </div>
      `;

      thumbWrapper.innerHTML += `
        <div class="swiper-slide">
          <div class="product-imgwrap">
            <img class="img-fluid" src="${imgUrl}" alt="${product.name}">
          </div>
        </div>
      `;
    });
  }

  // ================= TEXT =================
  document.querySelector(".cdxpro-detail h2").textContent = product.name;

  document.querySelector(".new-price").textContent = `₹${discountedPrice}`;

  document.querySelector(".old-price del").textContent =
    product.discount ? `₹${product.price}` : "";

  const badge = document.querySelector(".ofr-price .badge");
  if (badge) {
    badge.textContent = product.discount ? `${product.discount}% off` : "";
    badge.style.display = product.discount ? "inline-block" : "none";
  }

  // ================= DESCRIPTION FIX =================
  const descEl = document.getElementById("product-description");
  if (descEl) descEl.textContent = product.description;

  // ================= SIZE =================
  const sizeList = document.querySelector(".product-size");
  if (sizeList) {
    sizeList.innerHTML = product.sizes
      .map((s) => {
        const isOut = s.stock === 0;
        return `
        <li 
          data-size="${s.size}"
          style="${isOut ? "opacity:0.4;cursor:not-allowed;" : "cursor:pointer;"}"
          onclick="${!isOut ? `selectSize(this, '${s.size}')` : ""}">
          <a href="javascript:void(0);">${s.size}</a>
          ${
            isOut
              ? '<small style="color:red;font-size:10px;">Out</small>'
              : ""
          }
        </li>
      `;
      })
      .join("");
  }

  // ================= WISHLIST =================
  const wishlistBtn = document.querySelector(
    ".cdxpro-detail a[href='wishlist.html']"
  );

  if (wishlistBtn) {
    wishlistBtn.href = "javascript:void(0)";
    wishlistBtn.onclick = () =>
      WishlistManager.toggleWishlist(product._id, wishlistBtn);
  }

  document.title = `${product.name} - The Traditional Touch`;

  setupCartButton(product);
}

// ========================
// Cart
// ========================
function setupCartButton(product) {
  const cartBtns = document.querySelectorAll(".btn-primary");

  cartBtns.forEach((btn) => {
    if (btn.textContent.toLowerCase().includes("add to cart")) {
      btn.onclick = function () {
        if (!selectedSize) {
          CartManager.showToast("Please select a size!", "warn");
          return;
        }

        const qty = parseInt(document.querySelector(".pro-qty")?.value || 1);

        CartManager.addToCart(product._id, qty, btn, selectedSize);

        showDetailMessage(
          `Added to cart! Size: ${selectedSize}, Qty: ${qty}`,
          "success"
        );
      };
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
// Toast
// ========================
function fetchRelatedProducts(currentProductId, allProducts) {
  const related = allProducts
    .filter((p) => p._id !== currentProductId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // ✅ latest first
    .slice(0, 7);

  const div = document.createElement("div");
  div.id = "detail-toast";

  div.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 9999;
    background: ${type === "success" ? "#d4edda" : "#f8d7da"};
    color: ${type === "success" ? "#155724" : "#721c24"};
  `;

  div.innerText = msg;
  document.body.appendChild(div);

  setTimeout(() => div.remove(), 3000);
}
