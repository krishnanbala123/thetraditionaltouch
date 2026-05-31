// assets/js/product-details.js
let selectedSize   = null;
let selectedAddon  = null;
let selectedSleeve = null;
let selectedLength = "48";
let currentProduct = null;
let selectedDupatta = false;

/** Discount % from an active event deal (0 = none) */
let activeEventDiscount = 0;

/**
 * effectiveDiscount(product)
 * Returns whichever is higher: the product's own discount or the live
 * event deal discount.  Always use this instead of product.discount directly.
 */
function effectiveDiscount(product) {
  return Math.max(product.discount || 0, activeEventDiscount);
}

// ── Size extra ──────────────────────────────────────────────────────────────
const SIZE_EXTRA_PRICE = {
  XS: 0, S: 0, M: 0, L: 0, XL: 0,
  "2XL": 50, "3XL": 50, "4XL": 100,
};

// ── Feeding add-ons ─────────────────────────────────────────────────────────
const FEEDING_ADDONS = [
  { id: "non_feeding",    label: "Non Feeding",    sublabel: "",                extra: 0  },
  { id: "center_feeding", label: "Center Feeding", sublabel: "(1 Invisible Zip)", extra: 50 },
];

// ── Sleeve options ───────────────────────────────────────────────────────────
const SLEEVE_OPTIONS = [
  { id: "full_gathering",         label: "Full Gathering Sleeves", extra: 0   },
  { id: "elbow",                  label: "Elbow Sleeves",          extra: -50 },
  { id: "elbow_puff",             label: "Elbow Puff Sleeve",      extra: -50 },
  { id: "three_quarter_scallop",  label: "3/4 Scallop Sleeve",     extra: -20 },
  { id: "three_quarter",          label: "3/4 Sleeve",             extra: -50 },
];

// ── Length options ───────────────────────────────────────────────────────────
const LENGTH_OPTIONS = [
  { id: "44", label: '44"',           extra: 0,  isDefault: false },
  { id: "46", label: '46"',           extra: 0,  isDefault: false },
  { id: "48", label: '48" (Standard)',extra: 0,  isDefault: true  },
  { id: "50", label: '50"',           extra: 0,  isDefault: false },
  { id: "52", label: '52"',           extra: 30, isDefault: false },
  { id: "54", label: '54"',           extra: 50, isDefault: false },
];

const DUPATTA_EXTRA = 200;

// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  if (!productId) {
    window.location.href = "shop.html";
    return;
  }
  // Fetch deal first, then fetch product so effectiveDiscount is ready
  fetchActiveDeal().then(() => fetchProductById(productId));
});

// ── Fetch active event deal ──────────────────────────────────────────────────
async function fetchActiveDeal() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/deal`);
    const data = await res.json();
    if (data.isEventDeal && data.deals?.length) {
      activeEventDiscount = Math.max(...data.deals.map((d) => d.discountPercent));
    } else {
      activeEventDiscount = 0;
    }
  } catch (err) {
    console.error("Deal fetch error:", err);
    activeEventDiscount = 0;
  }
}

// ── Fetch product ────────────────────────────────────────────────────────────
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
  // ── Use effectiveDiscount here ──
  const disc = effectiveDiscount(product);
  const base = disc
    ? Math.round(product.price - (product.price * disc) / 100)
    : product.price;

  const sizeExtra   = selectedSize   ? SIZE_EXTRA_PRICE[selectedSize] || 0 : 0;
  const addonObj    = FEEDING_ADDONS.find((a) => a.id === selectedAddon);
  const addonExtra  = addonObj  ? addonObj.extra  : 0;
  const lengthObj   = LENGTH_OPTIONS.find((l) => l.id === selectedLength);
  const lengthExtra = lengthObj ? lengthObj.extra : 0;
  const sleeveObj   = SLEEVE_OPTIONS.find((s) => s.id === selectedSleeve);
  const sleeveExtra = sleeveObj ? sleeveObj.extra : 0;
  const dupattaExtra = selectedDupatta ? DUPATTA_EXTRA : 0;

  return base + sizeExtra + addonExtra + lengthExtra + sleeveExtra + dupattaExtra;
}

function updatePriceDisplay() {
  if (!currentProduct) return;

  const finalPrice = computeFinalPrice(currentProduct);
  const priceEl    = document.querySelector(".new-price");
  if (priceEl) priceEl.textContent = `₹${finalPrice}`;

  // ── Use effectiveDiscount for the base in the breakdown too ──
  const disc = effectiveDiscount(currentProduct);
  const base = disc
    ? Math.round(currentProduct.price - (currentProduct.price * disc) / 100)
    : currentProduct.price;

  const sizeExtra   = selectedSize   ? SIZE_EXTRA_PRICE[selectedSize] || 0 : 0;
  const addonObj    = FEEDING_ADDONS.find((a) => a.id === selectedAddon);
  const addonExtra  = addonObj  ? addonObj.extra  : 0;
  const lengthObj   = LENGTH_OPTIONS.find((l) => l.id === selectedLength);
  const lengthExtra = lengthObj ? lengthObj.extra : 0;
  const sleeveObj   = SLEEVE_OPTIONS.find((s) => s.id === selectedSleeve);
  const sleeveExtra = sleeveObj ? sleeveObj.extra : 0;
  const dupattaExtra = selectedDupatta ? DUPATTA_EXTRA : 0;

  const breakdownEl = document.getElementById("price-breakdown");
  if (!breakdownEl) return;

  let lines = [`<span class="pb-base">Base: ₹${base}</span>`];
  if (sizeExtra > 0)
    lines.push(`<span class="pb-extra">+ Size (${selectedSize}): ₹${sizeExtra}</span>`);
  if (addonExtra > 0)
    lines.push(`<span class="pb-extra">+ Center Feeding: ₹${addonExtra}</span>`);
  if (lengthExtra > 0)
    lines.push(`<span class="pb-extra">+ Length (${selectedLength}"): ₹${lengthExtra}</span>`);
  if (selectedDupatta)
    lines.push(`<span class="pb-extra">+ Dupatta: ₹${DUPATTA_EXTRA}</span>`);
  if (sleeveExtra < 0)
    lines.push(`<span class="pb-extra">- Sleeve (${sleeveObj.label}): ₹${Math.abs(sleeveExtra)}</span>`);

  breakdownEl.innerHTML = lines.join("");
  breakdownEl.style.display =
    sizeExtra + addonExtra + lengthExtra + sleeveExtra + dupattaExtra !== 0 ? "flex" : "none";
}

// ── Render product ────────────────────────────────────────────────────────────
function renderProductDetail(product) {
  // ── Use effectiveDiscount for the displayed price ──
  const disc           = effectiveDiscount(product);
  const discountedPrice = disc
    ? Math.round(product.price - (product.price * disc) / 100)
    : product.price;

  // images
  const mainWrapper  = document.querySelector(".forslider .swiper-wrapper");
  const thumbWrapper = document.querySelector(".toslider .swiper-wrapper");
  if (mainWrapper && thumbWrapper) {
    mainWrapper.innerHTML = thumbWrapper.innerHTML = "";
    product.images.forEach((imgUrl) => {
      const slide = () => `
        <div class="swiper-slide">
          <div class="product-imgwrap">
            <img class="img-fluid" src="${imgUrl}" alt="${product.name}">
          </div>
        </div>`;
      mainWrapper.innerHTML  += slide();
      thumbWrapper.innerHTML += slide();
    });
  }

  // text
  document.querySelector(".cdxpro-detail h2").textContent = product.name;
  document.querySelector(".new-price").textContent = `₹${discountedPrice}`;
  document.querySelector(".old-price del").textContent = disc ? `₹${product.price}` : "";

  const badge = document.querySelector(".ofr-price .badge");
  if (badge) {
    badge.textContent    = disc ? `${disc}% off` : "";
    badge.style.display  = disc ? "inline-block" : "none";
  }

  const descEl = document.getElementById("product-description");
  if (descEl) descEl.textContent = product.description;

  renderStockNotice(product.globalStock ?? 10);
  renderSizes(product);
  renderFeedingAddons();
  renderSleeveOptions();
  renderLengthOptions();
  renderDupattaOption();

  selectedLength = "48";
  highlightLength("48");

  const wishlistBtn = document.querySelector(".cdxpro-detail a[href='wishlist.html']");
  if (wishlistBtn) {
    wishlistBtn.href    = "javascript:void(0)";
    wishlistBtn.onclick = () => WishlistManager.toggleWishlist(product._id, wishlistBtn);
  }

  document.title = `${product.name} - The Traditional Touch`;
  setupShareButtons(product);
  setupCartButton(product);
}

// ── Share buttons ─────────────────────────────────────────────────────────
function setupShareButtons(product) {
  const pageUrl   = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(product.name || "Check out this product");
  const pageDesc  = encodeURIComponent(
    product.description
      ? product.description.substring(0, 100) + "..."
      : "Beautiful traditional wear from The Traditional Touch"
  );

  const fbBtn    = document.querySelector(".share-iconlist .bg-fb a");
  const twtBtn   = document.querySelector(".share-iconlist .bg-twt a");
  const instaBtn = document.querySelector(".share-iconlist .bg-insta a");
  const whpBtn   = document.querySelector(".share-iconlist .bg-whp a");

  if (fbBtn) {
    fbBtn.href   = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    fbBtn.target = "_blank";
    fbBtn.rel    = "noopener noreferrer";
  }
  if (twtBtn) {
    twtBtn.href   = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
    twtBtn.target = "_blank";
    twtBtn.rel    = "noopener noreferrer";
  }
  if (instaBtn) {
    instaBtn.href    = "javascript:void(0);";
    instaBtn.onclick = (e) => {
      e.preventDefault();
      if (navigator.share) {
        navigator.share({ title: product.name, text: pageDesc, url: window.location.href }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showDetailMessage("Link copied! Paste it on Instagram.", "success");
        });
      }
    };
  }
  if (whpBtn) {
    whpBtn.href   = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;
    whpBtn.target = "_blank";
    whpBtn.rel    = "noopener noreferrer";
  }
}

// ── Global stock notice ──────────────────────────────────────────────────────
function renderStockNotice(globalStock) {
  const stockEl = document.querySelector(".product-detailright h5");
  if (!stockEl) return;
  if (globalStock <= 0) {
    stockEl.textContent = "⚠️ Currently out of stock — next batch coming soon!";
    stockEl.style.color = "#e53935";
  } else if (globalStock <= 3) {
    stockEl.textContent = `🔥 Hurry! Only ${globalStock} dress(es) left in this batch!`;
    stockEl.style.color = "#e53935";
  } else {
    stockEl.textContent = `Hurry! Only ${globalStock} left in stock`;
    stockEl.style.color = "";
  }
}

// ── Sizes ─────────────────────────────────────────────────────────────────────
function renderSizes(product) {
  const sizeList = document.querySelector(".product-size");
  if (!sizeList) return;
  sizeList.innerHTML = product.sizes
    .map((s) => {
      const extraPrice = SIZE_EXTRA_PRICE[s.size] || 0;
      const extraLabel = extraPrice > 0
        ? `<span class="size-extra-badge">+₹${extraPrice}</span>`
        : "";
      return `
      <li class="size-item" data-size="${s.size}">
        <span class="size-label">${s.size}</span>
        ${extraLabel}
      </li>`;
    })
    .join("");
  sizeList.querySelectorAll(".size-item").forEach((li) => {
    li.addEventListener("click", function () { selectSize(this, this.dataset.size); });
  });
}

// ── Feeding add-ons ──────────────────────────────────────────────────────────
function renderFeedingAddons() {
  const addonSection = document.getElementById("addon-section");
  if (!addonSection) return;
  addonSection.innerHTML = FEEDING_ADDONS.map(
    (addon) => `
    <li class="addon-item" id="addon-${addon.id}" onclick="selectAddon('${addon.id}')">
      <span class="addon-check"><i class="fa fa-check"></i></span>
      <span class="addon-name">${addon.label}${addon.sublabel ? ` <small>${addon.sublabel}</small>` : ""}</span>
      ${addon.extra > 0
        ? `<span class="addon-price-badge">+₹${addon.extra}</span>`
        : `<span class="addon-price-badge free">Free</span>`}
    </li>`
  ).join("");
}

// ── Sleeve ──────────────────────────────────────────────────────────────────
function renderSleeveOptions() {
  let sleeveGroup = document.getElementById("sleeve-group");
  if (!sleeveGroup) {
    const addonGroup = document.getElementById("addon-section")?.closest(".detail-group");
    if (!addonGroup) return;
    sleeveGroup = document.createElement("div");
    sleeveGroup.className = "detail-group";
    sleeveGroup.id = "sleeve-group";
    addonGroup.insertAdjacentElement("afterend", sleeveGroup);
  }
  sleeveGroup.innerHTML = `
    <h6>Sleeve Style</h6>
    <ul id="sleeve-section" style="display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:10px 0 18px;">
      ${SLEEVE_OPTIONS.map((s) => `
        <li class="addon-item" id="sleeve-${s.id}" onclick="selectSleeve('${s.id}')"
            style="flex:unset;min-width:unset;padding:10px 16px;">
          <span class="addon-check"><i class="fa fa-check"></i></span>
          <span class="addon-name" style="white-space:nowrap;">${s.label}</span>
          ${s.extra < 0
            ? `<span class="addon-price-badge">-₹${Math.abs(s.extra)}</span>`
            : `<span class="addon-price-badge free">Free</span>`}
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
    lengthGroup.id = "length-group";
    sleeveGroup.insertAdjacentElement("afterend", lengthGroup);
  }
  lengthGroup.innerHTML = `
    <h6>Length</h6>
    <p class="size-notice">* Standard is 48" | 52" +₹30 | 54" +₹50</p>
    <ul id="length-section" style="display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:10px 0 18px;">
      ${LENGTH_OPTIONS.map((l) => `
        <li class="size-item" id="length-${l.id}" onclick="selectLength('${l.id}')"
            style="min-width:80px;height:auto;padding:10px 14px;width:auto;">
          <span class="size-label" style="font-size:12px;">${l.label}</span>
          ${l.extra > 0 ? `<span class="size-extra-badge">+₹${l.extra}</span>` : ""}
        </li>`).join("")}
    </ul>`;
}

function renderDupattaOption() {
  let dupattaGroup = document.getElementById("dupatta-group");
  if (!dupattaGroup) {
    const lengthGroup = document.getElementById("length-group");
    if (!lengthGroup) return;
    dupattaGroup = document.createElement("div");
    dupattaGroup.className = "detail-group";
    dupattaGroup.id = "dupatta-group";
    lengthGroup.insertAdjacentElement("afterend", dupattaGroup);
  }
  dupattaGroup.innerHTML = `
    <h6>Dupatta Add-on</h6>
    <ul id="dupatta-section" style="display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:10px 0 18px;">
      <li class="addon-item" id="dupatta-no" onclick="selectDupatta(false)" style="flex:1;min-width:180px;">
        <span class="addon-check"><i class="fa fa-check"></i></span>
        <span class="addon-name">No Dupatta</span>
        <span class="addon-price-badge free">Free</span>
      </li>
      <li class="addon-item" id="dupatta-yes" onclick="selectDupatta(true)" style="flex:1;min-width:180px;">
        <span class="addon-check"><i class="fa fa-check"></i></span>
        <span class="addon-name">Dupatta <small>(Chiffon with 2 Side Borders)</small></span>
        <span class="addon-price-badge">+₹200</span>
      </li>
    </ul>`;
  document.getElementById("dupatta-no").classList.add("active");
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
  SLEEVE_OPTIONS.forEach((s) => {
    const el = document.getElementById(`sleeve-${s.id}`);
    if (el) el.classList.remove("active");
  });
  const el = document.getElementById(`sleeve-${sleeveId}`);
  if (el) el.classList.add("active");
  selectedSleeve = sleeveId;
  updatePriceDisplay();
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

function selectDupatta(withDupatta) {
  selectedDupatta = withDupatta;
  document.getElementById("dupatta-yes").classList.toggle("active",  withDupatta);
  document.getElementById("dupatta-no").classList.toggle("active",  !withDupatta);
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
        showDetailMessage("Please select a size!", "error");
        return;
      }
      if (!selectedAddon) {
        showDetailMessage("Please select a feeding type!", "error");
        return;
      }
      if (!selectedSleeve) {
        showDetailMessage("Please select a sleeve style!", "error");
        return;
      }

      const qty        = parseInt(document.querySelector(".pro-qty")?.value || 1);
      const finalPrice = computeFinalPrice(product);
      const addonObj   = FEEDING_ADDONS.find((a) => a.id === selectedAddon);
      const sleeveObj  = SLEEVE_OPTIONS.find((s)  => s.id === selectedSleeve);
      const lengthObj  = LENGTH_OPTIONS.find((l)  => l.id === selectedLength);

      CartManager.addToCart(product._id, qty, btn, selectedSize, {
        sleeve    : selectedSleeve,
        length    : selectedLength,
        addonType : selectedAddon,
        dupatta   : selectedDupatta,
        unitPrice : finalPrice,
      });

      showDetailMessage(
        `Added! Size: ${selectedSize} | ${sleeveObj.label} | ${lengthObj.label} | ${addonObj.label}${selectedDupatta ? " | Dupatta" : ""} | ₹${finalPrice}`,
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
    max-width:320px;line-height:1.5;
  `;
  div.innerText = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ── Related slider ─────────────────────────────────────────────────────────
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
  const slidesHTML = products
    .map((product) => {
      // ── Use effectiveDiscount in related slider too ──
      const disc            = effectiveDiscount(product);
      const discountedPrice = disc
        ? Math.round(product.price - (product.price * disc) / 100)
        : product.price;
      return `
      <div class="swiper-slide">
        <div class="product-boxwrap" data-product-id="${product._id}">
          <div class="product-imgwrap">
            <img class="img-fluid" src="${product.images[0]}" alt="${product.name}"
                onerror="this.src='./assets/images/dress/shop_1.jpeg'">
            ${disc ? `<span class="product-discount-label">${disc}%</span>` : ""}
            <ul class="social">
              <li>
                <a href="javascript:void(0);"
                  onclick="CartManager.addToCartAuto('${product._id}', 1, this, ${JSON.stringify(product.sizes).replace(/"/g, "&quot;")}, ${product.stock ?? product.globalStock ?? 10})">
                  <i data-feather="shopping-cart"></i>
                </a>
              </li>
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
                ${disc ? `<span class="old-price">₹${product.price}</span>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    })
    .join("");
  container.innerHTML = `<div class="swiper-wrapper">${slidesHTML}</div>`;
  const count = products.length;
  relatedSwiper = new Swiper(".productslide4", {
    slidesPerView: "auto",
    spaceBetween: 24,
    loop: count > 4,
    speed: 1200,
    centeredSlides: true,
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

// ── Size Guide Modal ─────────────────────────────────────────────────────────
function openSizeGuide() {
  const modal = document.getElementById("size-guide-modal");
  if (!modal) return;
  modal.style.display = "flex";
  modal.onclick = function (e) { if (e.target === modal) closeSizeGuide(); };
  document._sizeGuideEsc = (e) => { if (e.key === "Escape") closeSizeGuide(); };
  document.addEventListener("keydown", document._sizeGuideEsc);
}

function closeSizeGuide() {
  const modal = document.getElementById("size-guide-modal");
  if (modal) modal.style.display = "none";
  document.removeEventListener("keydown", document._sizeGuideEsc);
}