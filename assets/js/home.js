// home.js

// ─── All module-level state declared once ───────────────────
let homeSwiper = null;
let skeletonSwiper = null;   // tracks the skeleton swiper so we can destroy it cleanly
let timerInterval = null;
let dealIndex = 0;
let dealRotateTimeout = null;

document.addEventListener("DOMContentLoaded", function () {
  fetchHomeProducts();
  fetchAndStartDeal();
});

// ─────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────

function showSkeletonLoader() {
  const container = document.querySelector("#home-product-slider");
  if (!container) return;

  // Destroy any previous swiper on this element before touching innerHTML
  if (skeletonSwiper) {
    skeletonSwiper.destroy(true, true);
    skeletonSwiper = null;
  }
  if (homeSwiper) {
    homeSwiper.destroy(true, true);
    homeSwiper = null;
  }

  const skeletonSlides = Array.from({ length: 5 })
    .map(
      () => `
      <div class="swiper-slide">
        <div class="skeleton-card">
          <div class="skeleton-img skeleton-shimmer"></div>
          <div class="skeleton-body">
            <div class="skeleton-title skeleton-shimmer"></div>
            <div class="skeleton-price skeleton-shimmer"></div>
          </div>
        </div>
      </div>`
    )
    .join("");

  container.innerHTML = `<div class="swiper-wrapper">${skeletonSlides}</div>`;

  // Guard: make sure the element is still in the DOM before Swiper touches it
  const el = document.querySelector("#home-product-slider");
  if (!el || !document.body.contains(el)) return;

  skeletonSwiper = new Swiper("#home-product-slider", {
    slidesPerView: 1,
    spaceBetween: 16,
    allowTouchMove: false,
    breakpoints: {
      480: { slidesPerView: 2, spaceBetween: 20 },
      720: { slidesPerView: 4, spaceBetween: 24 },
      1024: { slidesPerView: 4, spaceBetween: 24 },
      1400: { slidesPerView: 5, spaceBetween: 24 },
    },
  });
}

// ─────────────────────────────────────────────
// PRODUCT SLIDER
// ─────────────────────────────────────────────

async function fetchHomeProducts() {
  showSkeletonLoader();

  const token = localStorage.getItem("token");

  try {
    const response = await fetch(
      `${CONFIG.BASE_URL}/products?page=1&limit=8&sort=latest`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      const sorted = (data.products || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      renderHomeSlider(sorted.slice(0, 8));
    }
  } catch (error) {
    console.error("Home products error:", error);
    const container = document.querySelector("#home-product-slider");
    if (container) {
      container.innerHTML = `<div class="swiper-wrapper">
        <div class="swiper-slide">
          <p style="text-align:center;padding:40px;">Failed to load products.</p>
        </div>
      </div>`;
    }
  }
}

function renderHomeSlider(products) {
  const container = document.querySelector("#home-product-slider");
  if (!container) return;

  // ── Destroy BOTH swiper instances before replacing innerHTML ──
  if (skeletonSwiper) {
    skeletonSwiper.destroy(true, true);
    skeletonSwiper = null;
  }
  if (homeSwiper) {
    homeSwiper.destroy(true, true);
    homeSwiper = null;
  }

  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = `<div class="swiper-wrapper">
      <div class="swiper-slide">
        <p style="text-align:center;padding:40px;">No products found!</p>
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

      const stock = product.stock ?? 0;
      const hasStock = stock > 0;

      const sizesJson = JSON.stringify(product.sizes || []).replace(/"/g, "&quot;");

      return `
        <div class="swiper-slide">
          <div class="product-boxwrap" data-product-id="${product._id}">
            <div class="product-imgwrap">
              <a href="product-details.html?id=${product._id}">
                <img class="img-fluid" src="${product.images[0]}" alt="${product.name}"
                  onerror="this.src='./assets/images/dress/shop_1.jpeg'">
              </a>
              ${discountLabel}
              ${!hasStock ? `<span class="product-sale-label" style="background:gray;">Out of Stock</span>` : ""}
              <ul class="social">
                <li>
                  <a href="javascript:void(0);"
                    onclick="CartManager.addToCartAuto('${product._id}', 1, this, ${sizesJson}, ${stock})">
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

  // Guard: element must still be in the DOM
  const el = document.querySelector("#home-product-slider");
  if (!el || !document.body.contains(el)) return;

  const count = products.length;

  homeSwiper = new Swiper("#home-product-slider", {
    slidesPerView: 1,
    spaceBetween: 16,
    loop: count > 5,
    speed: 1200,
    centeredSlides: false,
    autoplay: count > 1 ? { delay: 2500, disableOnInteraction: false } : false,
    breakpoints: {
      480: { slidesPerView: Math.min(2, count), spaceBetween: 20 },
      720: { slidesPerView: Math.min(4, count), spaceBetween: 24 },
      1024: { slidesPerView: Math.min(4, count), spaceBetween: 24 },
      1400: { slidesPerView: Math.min(5, count), spaceBetween: 24 },
    },
  });

  if (typeof feather !== "undefined") feather.replace();
}

// ─────────────────────────────────────────────
// DEAL BANNER + ROTATING COUNTDOWN TIMER
// ─────────────────────────────────────────────

async function fetchAndStartDeal() {
  const dealSection = document.querySelector(".counter-banner")?.closest("section");
  if (dealSection) dealSection.style.display = "none";

  try {
    const res = await fetch(`${CONFIG.BASE_URL}/deal`);
    const data = await res.json();

    const now = new Date();
    const deals = (data.deals || (data.deal ? [data.deal] : [])).filter(
      (d) => new Date(d.endsAt) > now
    );

    if (!deals.length) return;

    if (dealSection) dealSection.style.display = "";

    injectDealDots(deals.length);

    dealIndex = 0;
    showDeal(deals, dealIndex, dealSection);
  } catch (err) {
    console.error("Deal fetch error:", err);
  }
}

function injectDealDots(count) {
  const banner = document.querySelector(".counter-banner");
  if (!banner || count < 2) return;

  banner.querySelector(".deal-dots")?.remove();

  const dotsEl = document.createElement("div");
  dotsEl.className = "deal-dots";
  dotsEl.style.cssText = "display:flex;gap:6px;justify-content:center;margin-top:14px;";

  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    dot.dataset.index = i;
    dot.style.cssText =
      "width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.35);transition:background .3s,transform .3s;cursor:pointer;display:inline-block;";
    dotsEl.appendChild(dot);
  }

  banner.querySelector(".btn-white")?.insertAdjacentElement("afterend", dotsEl);
}

function updateDots(activeIndex) {
  document.querySelectorAll(".deal-dots span").forEach((dot, i) => {
    dot.style.background =
      i === activeIndex ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)";
    dot.style.transform = i === activeIndex ? "scale(1.25)" : "scale(1)";
  });
}

function showDeal(deals, index, dealSection) {
  if (dealRotateTimeout) clearTimeout(dealRotateTimeout);
  if (timerInterval) clearInterval(timerInterval);

  const deal = deals[index];
  updateDots(index);

  const heading = document.querySelector(".counter-banner h3");
  const shopBtn = document.querySelector(".counter-banner .btn-white");

  if (heading && deal.product?.name) {
    heading.textContent = `Hurry up! Get ${deal.discountPercent}% off on ${deal.product.name}`;
  }
  if (shopBtn && deal.product?._id) {
    shopBtn.href = `product-details.html?id=${deal.product._id}`;
  }

  const dayEl = document.getElementById("day");
  const hourEl = document.getElementById("hour");
  const minuteEl = document.getElementById("minute");
  const secondEl = document.getElementById("second");
  if (!dayEl || !hourEl || !minuteEl || !secondEl) return;

  startCountdown(new Date(deal.endsAt), dayEl, hourEl, minuteEl, secondEl);

  if (deals.length > 1) {
    dealRotateTimeout = setTimeout(() => {
      showDeal(deals, (index + 1) % deals.length, dealSection);
    }, 6000);
  }
}

function startCountdown(endDate, dayEl, hourEl, minuteEl, secondEl) {
  if (timerInterval) clearInterval(timerInterval);

  function pad(n) { return String(n).padStart(2, "0"); }

  function tick() {
    const diff = endDate.getTime() - Date.now();
    if (diff <= 0) {
      dayEl.textContent = hourEl.textContent = minuteEl.textContent = secondEl.textContent = "00";
      clearInterval(timerInterval);
      return;
    }
    dayEl.textContent    = pad(Math.floor(diff / 86400000));
    hourEl.textContent   = pad(Math.floor((diff % 86400000) / 3600000));
    minuteEl.textContent = pad(Math.floor((diff % 3600000) / 60000));
    secondEl.textContent = pad(Math.floor((diff % 60000) / 1000));
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}