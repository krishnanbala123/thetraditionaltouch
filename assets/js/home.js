// home.js
let homeSwiper = null;

document.addEventListener("DOMContentLoaded", function () {
  fetchHomeProducts();
});

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
      // ✅ createdAt by sort — latest first
      const sorted = (data.products || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      const latest8 = sorted.slice(0, 8);
      renderHomeSlider(latest8);
    }
  } catch (error) {
    console.error("Home products error:", error);
  }
}

function renderHomeSlider(products) {
  const container = document.querySelector(".productslide5");
  if (!container) return;

  // ✅ Old swiper destroy + HTML clear
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
              <img class="img-fluid" src="${product.image}" alt="${product.name}"
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
      </div>
    `;
    })
    .join("");

  container.innerHTML = `<div class="swiper-wrapper">${slidesHTML}</div>`;

  const count = products.length;
  const shouldLoop = count > 5;

  homeSwiper = new Swiper(".productslide5", {
    slidesPerView: "auto",
    spaceBetween: 24,
    loop: shouldLoop,
    speed: 1200,
    centeredSlides: true,
    autoplay: count > 1 ? { delay: 2000 } : false,
    breakpoints: {
      1400: { slidesPerView: Math.min(5, count), centeredSlides: false },
      1024: { slidesPerView: Math.min(4, count), centeredSlides: false },
      768: { slidesPerView: Math.min(3, count), centeredSlides: false },
      480: { slidesPerView: Math.min(2, count), centeredSlides: false },
    },
  });

  if (typeof feather !== "undefined") feather.replace();
}
