// home.js
let homeSwiper = null;
let timerInterval = null;

document.addEventListener("DOMContentLoaded", function () {
  fetchHomeProducts();
  fetchAndStartDeal();
});

// ─────────────────────────────────────────────
// PRODUCT SLIDER
// ─────────────────────────────────────────────

async function fetchHomeProducts() {
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(
      `${CONFIG.BASE_URL}/products?page=1&limit=8&sort=latest`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    if (response.ok) {
      const sorted = (data.products || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      renderHomeSlider(sorted.slice(0, 8));
    }
  } catch (error) {
    console.error("Home products error:", error);
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

      return `
        <div class="swiper-slide">
          <div class="product-boxwrap" data-product-id="${product._id}">
            <div class="product-imgwrap">
              <a href="product-details.html?id=${product._id}">
                <img class="img-fluid" src="${product.images[0]}" alt="${product.name}"
                  onerror="this.src='./assets/images/dress/shop_1.jpeg'">
              </a>
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
        </div>
      `;
    })
    .join("");

  container.innerHTML = `<div class="swiper-wrapper">${slidesHTML}</div>`;

  const count = products.length;

  homeSwiper = new Swiper("#home-product-slider", {
    slidesPerView: 1,
    spaceBetween: 24,
    loop: count > 5,
    speed: 1200,
    centeredSlides: false,
    autoplay: count > 1 ? { delay: 2500, disableOnInteraction: false } : false,
    breakpoints: {
      480: { slidesPerView: Math.min(2, count) },
      768: { slidesPerView: Math.min(3, count) },
      1024: { slidesPerView: Math.min(4, count) },
      1400: { slidesPerView: Math.min(5, count) },
    },
  });

  if (typeof feather !== "undefined") feather.replace();
}

// ─────────────────────────────────────────────
// DEAL BANNER + COUNTDOWN TIMER
// ─────────────────────────────────────────────

async function fetchAndStartDeal() {
  // Hide the banner immediately — only show it once we confirm an active deal
  const dealSection = document
    .querySelector(".counter-banner")
    ?.closest("section");
  if (dealSection) dealSection.style.display = "none";

  try {
    const res = await fetch(`${CONFIG.BASE_URL}/deal`);
    const data = await res.json();

    if (!res.ok || !data.deal) return; // stay hidden

    const deal = data.deal;

    // Validate the end date is actually in the future
    const endDate = new Date(deal.endsAt);
    if (endDate <= new Date()) return; // deal already expired, stay hidden

    // Show the section now that we have a valid deal
    if (dealSection) dealSection.style.display = "";

    // Update banner text
    const heading = document.querySelector(".counter-banner h3");
    const subheading = document.querySelector(".counter-banner h2");
    if (heading && deal.product?.name) {
      heading.textContent = `Hurry up! Get ${deal.discountPercent}% off on ${deal.product.name}`;
    }
    if (subheading) {
      subheading.textContent = "Deals Of The Day";
    }

    // Wire up the shop now button to the deal product
    const shopBtn = document.querySelector(".counter-banner .btn-white");
    if (shopBtn && deal.product?._id) {
      shopBtn.href = `product-details.html?id=${deal.product._id}`;
    }

    // Start the countdown
    const dayEl = document.getElementById("day");
    const hourEl = document.getElementById("hour");
    const minuteEl = document.getElementById("minute");
    const secondEl = document.getElementById("second");

    if (!dayEl || !hourEl || !minuteEl || !secondEl) return;

    startCountdown(endDate, dayEl, hourEl, minuteEl, secondEl, dealSection);
  } catch (err) {
    console.error("Deal fetch error:", err);
    // stay hidden on error
  }
}

function startCountdown(
  endDate,
  dayEl,
  hourEl,
  minuteEl,
  secondEl,
  dealSection,
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
      if (dealSection) dealSection.style.display = "none"; // hide when expired
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
