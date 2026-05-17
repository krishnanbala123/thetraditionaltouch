let selectedSize = null;
let selectedAddon = null;
let currentProduct = null;

// ========================
// Size Extra Price Map
// ========================
const SIZE_EXTRA_PRICE = {
  XS: 0,
  S: 0,
  M: 0,
  L: 0,
  XL: 0,
  "2XL": 50,
  "3XL": 50,
  "4XL": 100,
};

// ========================
// Addon Config
// ========================
const ADDONS = [
  { id: "non_feeding", label: "Non Feeding", extra: 0 },
  {
    id: "center_feeding",
    label: "Center Feeding",
    sublabel: "(1 Invisible Zip)",
    extra: 50,
  },
];

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

        const otherProducts = (data.products || [])
          .filter((p) => p._id !== productId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 8);

        renderRelatedSlider(otherProducts);
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
// Compute Final Price
// ========================
function computeFinalPrice(product) {
  const baseDiscounted = product.discount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

  const sizeExtra = selectedSize ? SIZE_EXTRA_PRICE[selectedSize] || 0 : 0;

  const addonObj = ADDONS.find((a) => a.id === selectedAddon);
  const addonExtra = addonObj ? addonObj.extra : 0;

  return baseDiscounted + sizeExtra + addonExtra;
}

// ========================
// Update Price Display
// ========================
function updatePriceDisplay() {
  const finalPrice = computeFinalPrice(currentProduct);
  const priceEl = document.querySelector(".new-price");
  if (priceEl) priceEl.textContent = `₹${finalPrice}`;

  // Show breakdown if extra charges apply
  const sizeExtra = selectedSize ? SIZE_EXTRA_PRICE[selectedSize] || 0 : 0;
  const addonObj = ADDONS.find((a) => a.id === selectedAddon);
  const addonExtra = addonObj ? addonObj.extra : 0;

  const breakdownEl = document.getElementById("price-breakdown");
  if (!breakdownEl) return;

  const baseDiscounted = currentProduct.discount
    ? Math.round(
        currentProduct.price -
          (currentProduct.price * currentProduct.discount) / 100,
      )
    : currentProduct.price;

  let lines = [`<span class="pb-base">Base: ₹${baseDiscounted}</span>`];
  if (sizeExtra > 0)
    lines.push(
      `<span class="pb-extra">+ Size (${selectedSize}): ₹${sizeExtra}</span>`,
    );
  if (addonExtra > 0)
    lines.push(
      `<span class="pb-extra">+ ${addonObj.label}: ₹${addonExtra}</span>`,
    );

  breakdownEl.innerHTML = lines.join("");
  breakdownEl.style.display = sizeExtra > 0 || addonExtra > 0 ? "flex" : "none";
}

// ========================
// Render Product
// ========================
function renderProductDetail(product) {
  const discountedPrice = product.discount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

  // ── Images ──
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
        </div>`;

      thumbWrapper.innerHTML += `
        <div class="swiper-slide">
          <div class="product-imgwrap">
            <img class="img-fluid" src="${imgUrl}" alt="${product.name}">
          </div>
        </div>`;
    });
  }

  // ── Text ──
  document.querySelector(".cdxpro-detail h2").textContent = product.name;
  document.querySelector(".new-price").textContent = `₹${discountedPrice}`;
  document.querySelector(".old-price del").textContent = product.discount
    ? `₹${product.price}`
    : "";

  const badge = document.querySelector(".ofr-price .badge");
  if (badge) {
    badge.textContent = product.discount ? `${product.discount}% off` : "";
    badge.style.display = product.discount ? "inline-block" : "none";
  }

  const descEl = document.getElementById("product-description");
  if (descEl) descEl.textContent = product.description;

  // ── Sizes ──
  renderSizes(product);

  // ── Addons ──
  renderAddons();

  // ── Wishlist ──
  const wishlistBtn = document.querySelector(
    ".cdxpro-detail a[href='wishlist.html']",
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
// Render Sizes
// ========================
function renderSizes(product) {
  const sizeList = document.querySelector(".product-size");
  if (!sizeList) return;

  sizeList.innerHTML = product.sizes
    .map((s) => {
      const isOut = s.stock === 0;
      const extraPrice = SIZE_EXTRA_PRICE[s.size] || 0;
      const extraLabel =
        extraPrice > 0
          ? `<span class="size-extra-badge">+₹${extraPrice}</span>`
          : "";

      return `
      <li
        class="size-item${isOut ? " size-out" : ""}"
        data-size="${s.size}"
        onclick="${!isOut ? `selectSize(this, '${s.size}')` : ""}">
        <span class="size-label">${s.size}</span>
        ${extraLabel}
        ${isOut ? `<span class="size-out-tag">Out</span>` : ""}
      </li>`;
    })
    .join("");
}

// ========================
// Render Addons
// ========================
function renderAddons() {
  const addonSection = document.getElementById("addon-section");
  if (!addonSection) return;

  addonSection.innerHTML = ADDONS.map(
    (addon) => `
    <li
      class="addon-item"
      id="addon-${addon.id}"
      onclick="selectAddon('${addon.id}')">
      <span class="addon-check"><i class="fa fa-check"></i></span>
      <span class="addon-name">${addon.label}${addon.sublabel ? ` <small>${addon.sublabel}</small>` : ""}</span>
      ${addon.extra > 0 ? `<span class="addon-price-badge">+₹${addon.extra}</span>` : `<span class="addon-price-badge free">Free</span>`}
    </li>`,
  ).join("");
}

// ========================
// Size Select
// ========================
function selectSize(el, size) {
  document.querySelectorAll(".product-size .size-item").forEach((li) => {
    li.classList.remove("active");
  });
  el.classList.add("active");
  selectedSize = size;
  updatePriceDisplay();
}

// ========================
// Addon Select
// ========================
function selectAddon(addonId) {
  document.querySelectorAll(".addon-item").forEach((el) => {
    el.classList.remove("active");
  });
  const el = document.getElementById(`addon-${addonId}`);
  if (el) el.classList.add("active");
  selectedAddon = addonId;
  updatePriceDisplay();
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
          showDetailMessage("Please select a size!", "error");
          return;
        }
        if (!selectedAddon) {
          showDetailMessage("Please select an add-on type!", "error");
          return;
        }

        const qty = parseInt(document.querySelector(".pro-qty")?.value || 1);
        const finalPrice = computeFinalPrice(product);
        const addonObj = ADDONS.find((a) => a.id === selectedAddon);

        CartManager.addToCart(product._id, qty, btn, selectedSize);

        showDetailMessage(
          `Added! Size: ${selectedSize} | ${addonObj.label} | ₹${finalPrice}`,
          "success",
        );
      };
    }
  });
}

// ========================
// Toast
// ========================
function showDetailMessage(msg, type) {
  const existing = document.getElementById("detail-toast");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "detail-toast";
  div.style.cssText = `
    position:fixed;bottom:30px;right:30px;padding:14px 22px;
    border-radius:10px;z-index:9999;font-size:14px;font-weight:500;
    box-shadow:0 4px 20px rgba(0,0,0,0.15);
    background:${type === "success" ? "#d4edda" : "#f8d7da"};
    color:${type === "success" ? "#155724" : "#721c24"};
  `;
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ========================
// Related Products Slider
// ========================
let relatedSwiper = null;

function renderRelatedSlider(products) {
  const container = document.querySelector(".productslide4");
  if (!container) return;

  if (relatedSwiper) {
    relatedSwiper.destroy(true, true);
    relatedSwiper = null;
  }
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = `<div class="swiper-wrapper">
      <div class="swiper-slide">
        <p style="text-align:center;padding:40px;">No related products found!</p>
      </div>
    </div>`;
    return;
  }

  const slidesHTML = products
    .map((product) => {
      const discountedPrice = product.discount
        ? Math.round(product.price - (product.price * product.discount) / 100)
        : product.price;

      const discountLabel = product.discount
        ? `<span class="product-discount-label">${product.discount}%</span>`
        : "";

      return `
      <div class="swiper-slide">
        <div class="product-boxwrap" data-product-id="${product._id}">
          <div class="product-imgwrap">
            <img class="img-fluid" src="${product.images[0]}" alt="${product.name}"
                onerror="this.src='./assets/images/dress/shop_1.jpeg'">
            ${discountLabel}
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
      </div>`;
    })
    .join("");

  container.innerHTML = `<div class="swiper-wrapper">${slidesHTML}</div>`;

  const count = products.length;
  const shouldLoop = count > 4;

  relatedSwiper = new Swiper(".productslide4", {
    slidesPerView: "auto",
    spaceBetween: 24,
    loop: shouldLoop,
    speed: 1200,
    centeredSlides: true,
    autoplay: count > 1 ? { delay: 2000 } : false,
    breakpoints: {
      1400: { slidesPerView: Math.min(4, count), centeredSlides: false },
      1024: { slidesPerView: Math.min(3, count), centeredSlides: false },
      768: { slidesPerView: Math.min(2, count), centeredSlides: false },
      480: { slidesPerView: Math.min(2, count), centeredSlides: false },
    },
  });

  if (typeof feather !== "undefined") feather.replace();
}
