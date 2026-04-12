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
// Render Product Detail
// ========================
function renderProductDetail(product) {
  const discountedPrice = product.discount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

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
        <li
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

  // Wishlist button
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
          CartManager.showToast("Please select a size!", "warn");
          return;
        }

        const qty = parseInt(document.querySelector(".pro-qty")?.value || 1);
        CartManager.addToCart(product._id, qty, btn, selectedSize);
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
// Related Products
// ========================
function fetchRelatedProducts(currentProductId, allProducts) {
  const related = allProducts
    .filter((p) => p._id !== currentProductId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // ✅ latest first
    .slice(0, 7);

  renderRelatedProducts(related);
}

function renderRelatedProducts(products) {
  const wrapper = document.getElementById("related-products-wrapper");
  if (!wrapper) return;

  if (!products || products.length === 0) {
    wrapper.innerHTML = `
      <div class="swiper-slide">
        <p style="padding:20px;color:#888;">No related products found!</p>
      </div>`;
    return;
  }

  wrapper.innerHTML = products
    .map((product) => {
      const discountedPrice = product.discount
        ? Math.round(product.price - (product.price * product.discount) / 100)
        : product.price;

      return `
      <div class="swiper-slide">
        <div class="product-boxwrap">
          <div class="product-imgwrap">
            <a href="product-details.html?id=${product._id}">
              <img class="img-fluid" src="${product.image}" alt="${product.name}"
                   onerror="this.src='./assets/images/fashion/product/1.jpg'">
            </a>
            ${product.discount ? `<span class="product-discount-label">${product.discount}%</span>` : ""}
            <ul class="social">
              <li>
                <a href="javascript:void(0);"
                  onclick="CartManager.addToCartAuto('${product._id}', 1, this, ${JSON.stringify(product.sizes).replace(/"/g, "&quot;")})">
                  <i data-feather="shopping-cart"></i>
                </a>
              </li>
              <li>
                <a href="product-details.html?id=${product._id}">
                  <i data-feather="eye"></i>
                </a>
              </li>
              <li>
                <a href="javascript:void(0);"
                   data-wishlist-id="${product._id}"
                   onclick="WishlistManager.toggleWishlist('${product._id}', this)">
                  <i data-feather="heart"></i>
                </a>
              </li>
            </ul>
          </div>
          <div class="product-detailwrap">
            <div>
              <a href="product-details.html?id=${product._id}">
                <h5>${product.name}</h5>
              </a>
              <div class="pro-price">
                ₹${discountedPrice}
                ${product.discount ? `<span class="old-price">₹${product.price}</span>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  if (typeof feather !== "undefined") feather.replace();
}
