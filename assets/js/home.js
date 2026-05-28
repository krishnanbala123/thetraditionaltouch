// home.js
let homeSwiper = null;
let timerInterval = null;

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

  // Build 5 skeleton slides
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
      </div>
    `
    )
    .join("");

  container.innerHTML = `<div class="swiper-wrapper">${skeletonSlides}</div>`;

  // Init a plain swiper just for the skeleton so it respects breakpoints
  new Swiper("#home-product-slider", {
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
  showSkeletonLoader(); // ← show skeletons immediately

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
    // On error, clear the skeleton gracefully
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

      const sizesJson = JSON.stringify(product.sizes || []).replace(
        /"/g,
        "&quot;"
      );

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
        </div>
      `;
    })
    .join("");

  container.innerHTML = `<div class="swiper-wrapper">${slidesHTML}</div>`;

  const count = products.length;

  homeSwiper = new Swiper("#home-product-slider", {
    slidesPerView: 1,
    spaceBetween: 16,
    loop: count > 5,
    speed: 1200,
    centeredSlides: false,
    autoplay:
      count > 1 ? { delay: 2500, disableOnInteraction: false } : false,
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
// DEAL BANNER + COUNTDOWN TIMER
// ─────────────────────────────────────────────

async function fetchAndStartDeal() {
  const dealSection = document
    .querySelector(".counter-banner")
    ?.closest("section");
  if (dealSection) dealSection.style.display = "none";

  try {
    const res = await fetch(`${CONFIG.BASE_URL}/deal`);
    const data = await res.json();

    if (!res.ok || !data.deal) return;

    const deal = data.deal;

    const endDate = new Date(deal.endsAt);
    if (endDate <= new Date()) return;

    if (dealSection) dealSection.style.display = "";

    const heading = document.querySelector(".counter-banner h3");
    const subheading = document.querySelector(".counter-banner h2");
    if (heading && deal.product?.name) {
      heading.textContent = `Hurry up! Get ${deal.discountPercent}% off on ${deal.product.name}`;
    }
    if (subheading) {
      subheading.textContent = "Deals Of The Day";
    }

    const shopBtn = document.querySelector(".counter-banner .btn-white");
    if (shopBtn && deal.product?._id) {
      shopBtn.href = `product-details.html?id=${deal.product._id}`;
    }

    const dayEl = document.getElementById("day");
    const hourEl = document.getElementById("hour");
    const minuteEl = document.getElementById("minute");
    const secondEl = document.getElementById("second");

    if (!dayEl || !hourEl || !minuteEl || !secondEl) return;

    startCountdown(endDate, dayEl, hourEl, minuteEl, secondEl, dealSection);
  } catch (err) {
    console.error("Deal fetch error:", err);
  }
}

function startCountdown(
  endDate,
  dayEl,
  hourEl,
  minuteEl,
  secondEl,
  dealSection
) {
  if (timerInterval) clearInterval(timerInterval);

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    const diff = endDate.getTime() - Date.now();

    if (diff <= 0) {
      dayEl.textContent = "00";
      hourEl.textContent = "00";
      minuteEl.textContent = "00";
      secondEl.textContent = "00";
      clearInterval(timerInterval);
      if (dealSection) dealSection.style.display = "none";
      return;
    }

    dayEl.textContent = pad(Math.floor(diff / 86400000));
    hourEl.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    minuteEl.textContent = pad(Math.floor((diff % 3600000) / 60000));
    secondEl.textContent = pad(Math.floor((diff % 60000) / 1000));
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}