// assets/js/product-details.js
let selectedSize    = null;
let selectedAddon   = null;   // feeding type
let selectedSleeve  = null;
let selectedLength  = "48";   // default standard
let currentProduct  = null;

// ── Size extra ──────────────────────────────────────────────────────────────
const SIZE_EXTRA_PRICE = {
  XS: 0, S: 0, M: 0, L: 0, XL: 0,
  "2XL": 50, "3XL": 50, "4XL": 100,
};

// ── Feeding add-ons ─────────────────────────────────────────────────────────
const FEEDING_ADDONS = [
  { id: "non_feeding",    label: "Non Feeding",    sublabel: "",                    extra: 0  },
  { id: "center_feeding", label: "Center Feeding", sublabel: "(1 Invisible Zip)",   extra: 50 },
];

// ── Sleeve options ───────────────────────────────────────────────────────────
const SLEEVE_OPTIONS = [
  { id: "full_gathering",         label: "Full Gathering Sleeves", extra: 0 },
  { id: "elbow",                  label: "Elbow Sleeves",          extra: 0 },
  { id: "elbow_puff",             label: "Elbow Puff Sleeve",      extra: 0 },
  { id: "three_quarter_scallop",  label: "3/4 Scallop Sleeve",     extra: 0 },
  { id: "three_quarter",          label: "3/4 Sleeve",             extra: 0 },
];

// ── Length options ───────────────────────────────────────────────────────────
const LENGTH_OPTIONS = [
  { id: "44", label: '44"', extra: 0  },
  { id: "46", label: '46"', extra: 0  },
  { id: "48", label: '48" (Standard)', extra: 0, isDefault: true },
  { id: "50", label: '50"', extra: 0  },
  { id: "52", label: '52"', extra: 30 },
  { id: "54", label: '54"', extra: 50 },
];

// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  if (!productId) { window.location.href = "shop.html"; return; }
  fetchProductById(productId);
});

// ── Fetch ────────────────────────────────────────────────────────────────────
async function fetchProductById(productId) {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`${CONFIG.BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (response.ok) {
      const product = data.products.find((p) => p._id === productId);
      if (product) {
        currentProduct = product;
        // attach global stock from API response
        currentProduct.globalStock = data.globalStock ?? 10;
        renderProductDetail(product);
        const others = (data.products || [])
          .filter((p) => p._id !== productId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 8);
        renderRelatedSlider(others);
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

// ── Price computation ────────────────────────────────────────────────────────
function computeFinalPrice(product) {
  const base = product.discount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

  const sizeExtra   = selectedSize   ? SIZE_EXTRA_PRICE[selectedSize] || 0 : 0;
  const addonObj    = FEEDING_ADDONS.find((a) => a.id === selectedAddon);
  const addonExtra  = addonObj ? addonObj.extra : 0;
  const lengthObj   = LENGTH_OPTIONS.find((l) => l.id === selectedLength);
  const lengthExtra = lengthObj ? lengthObj.extra : 0;

  return base + sizeExtra + addonExtra + lengthExtra;
}

function updatePriceDisplay() {
  if (!currentProduct) return;
  const finalPrice = computeFinalPrice(currentProduct);
  const priceEl    = document.querySelector(".new-price");
  if (priceEl) priceEl.textContent = `₹${finalPrice}`;

  const base = currentProduct.discount
    ? Math.round(currentProduct.price - (currentProduct.price * currentProduct.discount) / 100)
    : currentProduct.price;

  const sizeExtra   = selectedSize   ? SIZE_EXTRA_PRICE[selectedSize] || 0 : 0;
  const addonObj    = FEEDING_ADDONS.find((a) => a.id === selectedAddon);
  const addonExtra  = addonObj ? addonObj.extra : 0;
  const lengthObj   = LENGTH_OPTIONS.find((l) => l.id === selectedLength);
  const lengthExtra = lengthObj ? lengthObj.extra : 0;

  const breakdownEl = document.getElementById("price-breakdown");
  if (!breakdownEl) return;

  let lines = [`<span class="pb-base">Base: ₹${base}</span>`];
  if (sizeExtra   > 0) lines.push(`<span class="pb-extra">+ Size (${selectedSize}): ₹${sizeExtra}</span>`);
  if (addonExtra  > 0) lines.push(`<span class="pb-extra">+ Center Feeding: ₹${addonExtra}</span>`);
  if (lengthExtra > 0) lines.push(`<span class="pb-extra">+ Length (${selectedLength}"): ₹${lengthExtra}</span>`);

  breakdownEl.innerHTML      = lines.join("");
  breakdownEl.style.display  = (sizeExtra + addonExtra + lengthExtra) > 0 ? "flex" : "none";
}

// ── Render product ────────────────────────────────────────────────────────────
function renderProductDetail(product) {
  const discountedPrice = product.discount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

  // images
  const mainWrapper  = document.querySelector(".forslider .swiper-wrapper");
  const thumbWrapper = document.querySelector(".toslider .swiper-wrapper");
  if (mainWrapper && thumbWrapper) {
    mainWrapper.innerHTML = thumbWrapper.innerHTML = "";
    product.images.forEach((imgUrl) => {
      const slide = (cls) => `
        <div class="swiper-slide">
          <div class="product-imgwrap">
            <img class="img-fluid" src="${imgUrl}" alt="${product.name}">
          </div>
        </div>`;
      mainWrapper.innerHTML  += slide("forslider");
      thumbWrapper.innerHTML += slide("toslider");
    });
  }

  // text
  document.querySelector(".cdxpro-detail h2").textContent  = product.name;
  document.querySelector(".new-price").textContent          = `₹${discountedPrice}`;
  document.querySelector(".old-price del").textContent      = product.discount ? `₹${product.price}` : "";
  const badge = document.querySelector(".ofr-price .badge");
  if (badge) {
    badge.textContent    = product.discount ? `${product.discount}% off` : "";
    badge.style.display  = product.discount ? "inline-block" : "none";
  }
  const descEl = document.getElementById("product-description");
  if (descEl) descEl.textContent = product.description;

  // global stock notice
  renderStockNotice(product.globalStock ?? 10);

  // sizes
  renderSizes(product);

  // add-ons
  renderFeedingAddons();
  renderSleeveOptions();
  renderLengthOptions();

  // default length
  selectedLength = "48";
  highlightLength("48");

  // wishlist
  const wishlistBtn = document.querySelector(".cdxpro-detail a[href='wishlist.html']");
  if (wishlistBtn) {
    wishlistBtn.href    = "javascript:void(0)";
    wishlistBtn.onclick = () => WishlistManager.toggleWishlist(product._id, wishlistBtn);
  }

  document.title = `${product.name} - The Traditional Touch`;
  setupCartButton(product);
}

// ── Global stock notice ──────────────────────────────────────────────────────
function renderStockNotice(globalStock) {
  const stockEl = document.querySelector(".product-detailright h5");
  if (!stockEl) return;
  if (globalStock <= 0) {
    stockEl.textContent  = "⚠️ Currently out of stock — next batch coming soon!";
    stockEl.style.color  = "#e53935";
  } else if (globalStock <= 3) {
    stockEl.textContent  = `🔥 Hurry! Only ${globalStock} dress(es) left in this batch!`;
    stockEl.style.color  = "#e53935";
  } else {
    stockEl.textContent  = `Hurry! Only ${globalStock} left in stock`;
    stockEl.style.color  = "";
  }
}

// ── Sizes ─────────────────────────────────────────────────────────────────────
function renderSizes(product) {
  const sizeList = document.querySelector(".product-size");
  if (!sizeList) return;
  sizeList.innerHTML = product.sizes.map((s) => {
    const extraPrice = SIZE_EXTRA_PRICE[s.size] || 0;
    const extraLabel = extraPrice > 0
      ? `<span class="size-extra-badge">+₹${extraPrice}</span>` : "";
    return `
      <li class="size-item" data-size="${s.size}">
        <span class="size-label">${s.size}</span>
        ${extraLabel}
      </li>`;
  }).join("");
  sizeList.querySelectorAll(".size-item").forEach((li) => {
    li.addEventListener("click", function () { selectSize(this, this.dataset.size); });
  });
}

// ── Feeding add-ons ──────────────────────────────────────────────────────────
function renderFeedingAddons() {
  const addonSection = document.getElementById("addon-section");
  if (!addonSection) return;
  addonSection.innerHTML = FEEDING_ADDONS.map((addon) => `
    <li class="addon-item" id="addon-${addon.id}" onclick="selectAddon('${addon.id}')">
      <span class="addon-check"><i class="fa fa-check"></i></span>
      <span class="addon-name">${addon.label}${addon.sublabel ? ` <small>${addon.sublabel}</small>` : ""}</span>
      ${addon.extra > 0
        ? `<span class="addon-price-badge">+₹${addon.extra}</span>`
        : `<span class="addon-price-badge free">Free</span>`}
    </li>`).join("");
}

// ── Sleeve ──────────────────────────────────────────────────────────────────
function renderSleeveOptions() {
  // Find or create sleeve section
  let sleeveGroup = document.getElementById("sleeve-group");
  if (!sleeveGroup) {
    // Insert after addon group
    const addonGroup = document.getElementById("addon-section")?.closest(".detail-group");
    if (!addonGroup) return;
    sleeveGroup = document.createElement("div");
    sleeveGroup.className = "detail-group";
    sleeveGroup.id        = "sleeve-group";
    addonGroup.insertAdjacentElement("afterend", sleeveGroup);
  }
  sleeveGroup.innerHTML = `
    <h6>Sleeve Style</h6>
    <ul id="sleeve-section" style="
      display:flex; flex-wrap:wrap; gap:8px;
      list-style:none; padding:0; margin:10px 0 18px;">
      ${SLEEVE_OPTIONS.map((s) => `
        <li class="addon-item" id="sleeve-${s.id}"
            onclick="selectSleeve('${s.id}')"
            style="flex:unset; min-width:unset; padding:10px 16px;">
          <span class="addon-check"><i class="fa fa-check"></i></span>
          <span class="addon-name" style="white-space:nowrap;">${s.label}</span>
          <span class="addon-price-badge free">Free</span>
        </li>`).join("")}
    </ul>`;
}

// ── Length ──────────────────────────────────────────────────────────────────
function renderLengthOptions() {
  let lengthGroup = document.getElementById("length-group");
  if (!lengthGroup) {
    const sleeveGroup = document.getElementById("sleeve-group");
    if (!sleeveGroup) return;
    lengthGroup = document.createElement("div");
    lengthGroup.className = "detail-group";
    lengthGroup.id        = "length-group";
    sleeveGroup.insertAdjacentElement("afterend", lengthGroup);
  }
  lengthGroup.innerHTML = `
    <h6>Length</h6>
    <p class="size-notice">* Standard is 48" | 52" +₹30 | 54" +₹50</p>
    <ul id="length-section" style="
      display:flex; flex-wrap:wrap; gap:8px;
      list-style:none; padding:0; margin:10px 0 18px;">
      ${LENGTH_OPTIONS.map((l) => `
        <li class="size-item" id="length-${l.id}"
            onclick="selectLength('${l.id}')"
            style="min-width:80px; height:auto; padding:10px 14px; width:auto;">
          <span class="size-label" style="font-size:12px;">${l.label}</span>
          ${l.extra > 0 ? `<span class="size-extra-badge">+₹${l.extra}</span>` : ""}
        </li>`).join("")}
    </ul>`;
}

// ── Selection handlers ────────────────────────────────────────────────────────
function selectSize(el, size) {
  document.querySelectorAll(".product-size .size-item").forEach((li) => li.classList.remove("active"));
  el.classList.add("active");
  selectedSize = size;
  updatePriceDisplay();
}

function selectAddon(addonId) {
  document.querySelectorAll(".addon-item").forEach((el) => el.classList.remove("active"));
  // Re-activate sleeve selection (they share .addon-item class)
  if (selectedSleeve) {
    const sleeveEl = document.getElementById(`sleeve-${selectedSleeve}`);
    if (sleeveEl) sleeveEl.classList.add("active");
  }
  const el = document.getElementById(`addon-${addonId}`);
  if (el) el.classList.add("active");
  selectedAddon = addonId;
  updatePriceDisplay();
}

function selectSleeve(sleeveId) {
  // Only deselect other sleeve items
  SLEEVE_OPTIONS.forEach((s) => {
    const el = document.getElementById(`sleeve-${s.id}`);
    if (el) el.classList.remove("active");
  });
  const el = document.getElementById(`sleeve-${sleeveId}`);
  if (el) el.classList.add("active");
  selectedSleeve = sleeveId;
}

function selectLength(lengthId) {
  LENGTH_OPTIONS.forEach((l) => {
    const el = document.getElementById(`length-${l.id}`);
    if (el) el.classList.remove("active");
  });
  highlightLength(lengthId);
  selectedLength = lengthId;
  updatePriceDisplay();
}

function highlightLength(lengthId) {
  const el = document.getElementById(`length-${lengthId}`);
  if (el) el.classList.add("active");
}

// ── Cart ─────────────────────────────────────────────────────────────────────
function setupCartButton(product) {
  document.querySelectorAll(".btn-primary").forEach((btn) => {
    if (!btn.textContent.toLowerCase().includes("add to cart")) return;
    btn.onclick = function () {
      if (!selectedSize) {
        showDetailMessage("Please select a size!", "error"); return;
      }
      if (!selectedAddon) {
        showDetailMessage("Please select a feeding type!", "error"); return;
      }
      if (!selectedSleeve) {
        showDetailMessage("Please select a sleeve style!", "error"); return;
      }

      const qty        = parseInt(document.querySelector(".pro-qty")?.value || 1);
      const finalPrice = computeFinalPrice(product);
      const addonObj   = FEEDING_ADDONS.find((a) => a.id === selectedAddon);
      const sleeveObj  = SLEEVE_OPTIONS.find((s) => s.id === selectedSleeve);
      const lengthObj  = LENGTH_OPTIONS.find((l) => l.id === selectedLength);

      CartManager.addToCart(
        product._id, qty, btn, selectedSize,
        {
          sleeve:    selectedSleeve,
          length:    selectedLength,
          addonType: selectedAddon,
          unitPrice: computeFinalPrice(product),   // ✅ pass the correct price
        }
      );

      showDetailMessage(
        `Added! Size: ${selectedSize} | ${sleeveObj.label} | ${lengthObj.label} | ${addonObj.label} | ₹${finalPrice}`,
        "success"
      );
    };
  });
}

// ── Toast ────────────────────────────────────────────────────────────────────
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
    max-width:320px; line-height:1.5;
  `;
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ── Related slider (unchanged) ────────────────────────────────────────────────
let relatedSwiper = null;
function renderRelatedSlider(products) {
  const container = document.querySelector(".productslide4");
  if (!container) return;
  if (relatedSwiper) { relatedSwiper.destroy(true, true); relatedSwiper = null; }
  container.innerHTML = "";
  if (!products || products.length === 0) {
    container.innerHTML = `<div class="swiper-wrapper"><div class="swiper-slide"><p style="text-align:center;padding:40px;">No related products found!</p></div></div>`;
    return;
  }
  const slidesHTML = products.map((product) => {
    const discountedPrice = product.discount
      ? Math.round(product.price - (product.price * product.discount) / 100)
      : product.price;
    return `
      <div class="swiper-slide">
        <div class="product-boxwrap" data-product-id="${product._id}">
          <div class="product-imgwrap">
            <img class="img-fluid" src="${product.images[0]}" alt="${product.name}"
                onerror="this.src='./assets/images/dress/shop_1.jpeg'">
            ${product.discount ? `<span class="product-discount-label">${product.discount}%</span>` : ""}
            <ul class="social">
              <li><a href="product-details.html?id=${product._id}"><i data-feather="eye"></i></a></li>
              <li><a href="javascript:void(0);" data-wishlist-id="${product._id}"
                     onclick="WishlistManager.toggleWishlist('${product._id}', this)">
                <i data-feather="heart"></i></a></li>
            </ul>
          </div>
          <div class="product-detailwrap">
            <div>
              <a href="product-details.html?id=${product._id}"><h5>${product.name}</h5></a>
              <div class="pro-price">
                ₹${discountedPrice}
                ${product.discount ? `<span class="old-price">₹${product.price}</span>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join("");
  container.innerHTML = `<div class="swiper-wrapper">${slidesHTML}</div>`;
  const count = products.length;
  relatedSwiper = new Swiper(".productslide4", {
    slidesPerView: "auto", spaceBetween: 24,
    loop: count > 4, speed: 1200, centeredSlides: true,
    autoplay: count > 1 ? { delay: 2000 } : false,
    breakpoints: {
      1400: { slidesPerView: Math.min(4, count), centeredSlides: false },
      1024: { slidesPerView: Math.min(3, count), centeredSlides: false },
      768:  { slidesPerView: Math.min(2, count), centeredSlides: false },
      480:  { slidesPerView: Math.min(2, count), centeredSlides: false },
    },
  });
  if (typeof feather !== "undefined") feather.replace();
}