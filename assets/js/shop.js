// assets/js/shop.js

let currentPage = 1;
const limit = 8;
let searchQuery = "";
let allProducts = [];
let selectedDiscount = null;
let selectedArrival = null;

document.addEventListener("DOMContentLoaded", function () {
  fetchProducts();
  setupSearch();
  setupDiscountFilter();
  setupArrivalFilter();
});

// ========================
// Fetch Products
// ========================
async function fetchProducts(page = 1, search = "") {
  const token = localStorage.getItem("token");
  const productGrid = document.querySelector(".grid-view-page");

  productGrid.innerHTML = `
    <div class="col-span-12 text-center" style="padding: 60px 0;">
      <i class="fa fa-spinner fa-spin fa-2x"></i>
      <p style="margin-top:10px;">Loading products...</p>
    </div>`;

  try {
    // Build URL — search is sent to the backend so it queries ALL products in DB
    let url = `${CONFIG.BASE_URL}/products?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      allProducts = data.products;

      // Apply any active client-side filter on top of the API results
      applyActiveFilter();

      renderPagination(data.pagination);
    } else {
      productGrid.innerHTML = `
        <div class="col-span-12 text-center" style="padding:60px 0;">
          <p>Failed to load products!</p>
        </div>`;
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    productGrid.innerHTML = `
      <div class="col-span-12 text-center" style="padding:60px 0;">
        <p>Network error! Check connection.</p>
      </div>`;
  }
}

// ========================
// Apply whichever filter is currently active
// Called after every fetchProducts() so filters stay in sync
// ========================
function applyActiveFilter() {
  if (selectedDiscount) {
    applyDiscountFilter();
  } else if (selectedArrival) {
    applyArrivalFilter();
  } else {
    renderProducts(allProducts);
  }
}

// ========================
// Render Product Cards
// ========================
function renderProducts(products) {
  const productGrid = document.querySelector(".grid-view-page");

  if (!products || products.length === 0) {
    productGrid.innerHTML = `
      <div class="col-span-12 text-center" style="padding:60px 0;">
        <i class="fa fa-box-open fa-3x" style="color:#ccc;"></i>
        <p style="margin-top:15px;">No products found!</p>
      </div>`;
    return;
  }

  productGrid.innerHTML = products
    .map((product) => {
      const discountedPrice = product.discount
        ? Math.round(product.price - (product.price * product.discount) / 100)
        : product.price;

      const discountLabel = product.discount
        ? `<span class="product-discount-label">${product.discount}%</span>`
        : "";

      const stock    = product.stock ?? 0;
      const hasStock = stock > 0;

      const sizesJson = JSON.stringify(product.sizes || []).replace(/"/g, "&quot;");

      return `
      <div class="col-span-12 lg:col-span-3 md:col-span-4 sm:col-span-6">
        <div class="product-boxwrap">
          <div class="product-imgwrap">
            <a href="product-details.html?id=${product._id}">
              <img class="img-fluid" src="${product.images[0]}"
                   alt="${product.name}"
                   onerror="this.src='./assets/images/fashion/product/1.jpg'">
            </a>
            ${discountLabel}
            ${!hasStock ? `<span class="product-sale-label" style="background:gray;">Out of Stock</span>` : ""}
            <ul class="social">
              <li>
                <a href="javascript:void(0);"
                   onclick="quickAddToCart(event, '${product._id}', this, ${stock}, ${sizesJson})">
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

// ========================
// Quick Add to Cart
// ========================
function quickAddToCart(event, id, btnEl, stock, sizes) {
  event.preventDefault();

  const product = allProducts.find((p) => p._id === id);
  if (!product) {
    CartManager.showToast("Product not found!", "error");
    return;
  }

  if ((stock ?? 0) <= 0) {
    CartManager.showToast("Out of stock!", "error");
    return;
  }

  const hasSizes = Array.isArray(sizes) && sizes.length > 0;
  if (!hasSizes) {
    window.location.href = `product-details.html?id=${id}`;
    return;
  }

  CartManager.addToCartAuto(id, 1, btnEl, sizes, stock);
}

// ========================
// Render Pagination
// ========================
function renderPagination(pagination) {
  const paginationEl = document.querySelector(".cdx-pagination");
  if (!paginationEl) return;

  const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;

  if (totalPages <= 1) {
    paginationEl.innerHTML = "";
    return;
  }

  let html = `
    <li>
      <a href="javascript:void(0);" onclick="${hasPrevPage ? `changePage(${currentPage - 1})` : "void(0)"}"
         style="${!hasPrevPage ? "opacity:0.4;pointer-events:none;" : ""}">
        <i class="fa fa-angle-left"></i>
      </a>
    </li>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <li class="${i === currentPage ? "active" : ""}">
        <a href="javascript:void(0);" onclick="changePage(${i})">${i}</a>
      </li>`;
  }

  html += `
    <li>
      <a href="javascript:void(0);" onclick="${hasNextPage ? `changePage(${currentPage + 1})` : "void(0)"}"
         style="${!hasNextPage ? "opacity:0.4;pointer-events:none;" : ""}">
        <i class="fa fa-angle-right"></i>
      </a>
    </li>`;

  paginationEl.innerHTML = html;
}

// ========================
// Page Change
// ========================
function changePage(page) {
  currentPage = page;
  fetchProducts(currentPage, searchQuery);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ========================
// Search Setup
// ========================
function setupSearch() {
  // ── Header search bar ──
  const headerInput = document.querySelector(".search-bar input");
  const headerBtn   = document.querySelector(".search-bar .btn-primary");

  if (headerBtn) {
    headerBtn.addEventListener("click", function () {
      triggerSearch(headerInput.value.trim());
      document.querySelector(".search-bar").classList.remove("show");
    });
  }

  if (headerInput) {
    headerInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        triggerSearch(headerInput.value.trim());
        document.querySelector(".search-bar").classList.remove("show");
      }
    });
  }

  // ── Inline shop search bar ──
  const shopInput = document.getElementById("shop-search-input");
  const shopBtn   = document.getElementById("shop-search-btn");
  const shopClear = document.getElementById("shop-search-clear");

  if (shopBtn) {
    shopBtn.addEventListener("click", function () {
      triggerSearch(shopInput.value.trim());
    });
  }

  if (shopInput) {
    shopInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        triggerSearch(shopInput.value.trim());
      }
    });

    shopInput.addEventListener("input", function () {
      toggleClearBtn(shopInput, shopClear);
    });
  }

  if (shopClear) {
    shopClear.addEventListener("click", function () {
      shopInput.value = "";
      shopClear.style.display = "none";
      triggerSearch("");
      shopInput.focus();
    });
  }
}

// ========================
// Trigger Search
// Resets page + clears client-side filters so results are consistent
// ========================
function triggerSearch(query) {
  searchQuery = query;
  currentPage = 1;

  // Clear client-side filters so they don't mask search results
  clearAllFilters();

  // Update clear button visibility
  const shopInput = document.getElementById("shop-search-input");
  const shopClear = document.getElementById("shop-search-clear");
  toggleClearBtn(shopInput, shopClear);

  // Fetch from backend — search runs across ALL products in the database
  fetchProducts(currentPage, searchQuery);
}

// ========================
// Clear all client-side filters (checkboxes + state)
// ========================
function clearAllFilters() {
  selectedDiscount = null;
  selectedArrival  = null;

  const allCheckboxIds = [
    "discount1","discount2","discount3","discount4","discount5",
    "ratinglist1","ratinglist2","ratinglist3","ratinglist4","ratinglist5",
  ];
  allCheckboxIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
}

function toggleClearBtn(input, clearBtn) {
  if (!clearBtn) return;
  clearBtn.style.display = input && input.value.trim() ? "flex" : "none";
}

// ========================
// Discount Filter
// NOTE: filters the current page's 8 products client-side.
// For full-database discount filtering, move this param to the API.
// ========================
function setupDiscountFilter() {
  const discountMap = {
    discount1: 10,
    discount2: 20,
    discount3: 30,
    discount4: 40,
    discount5: 50,
  };

  Object.keys(discountMap).forEach((id) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        // Uncheck all others
        Object.keys(discountMap).forEach((otherId) => {
          if (otherId !== id) document.getElementById(otherId).checked = false;
        });
        // Clear arrival filter
        selectedArrival = null;
        ["ratinglist1","ratinglist2","ratinglist3","ratinglist4","ratinglist5"]
          .forEach((rid) => { const el = document.getElementById(rid); if (el) el.checked = false; });

        selectedDiscount = this.checked ? discountMap[id] : null;
        applyDiscountFilter();
      });
    }
  });
}

function applyDiscountFilter() {
  if (!selectedDiscount) {
    renderProducts(allProducts);
    return;
  }
  const filtered = allProducts.filter(
    (p) => (p.discount || 0) >= selectedDiscount
  );
  renderProducts(filtered);
}

// ========================
// Arrival Filter
// NOTE: filters the current page's 8 products client-side.
// ========================
function setupArrivalFilter() {
  const arrivalMap = {
    ratinglist1: 7,
    ratinglist2: 30,
    ratinglist3: 60,
    ratinglist4: 180,
    ratinglist5: 365,
  };

  Object.keys(arrivalMap).forEach((id) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        // Uncheck all others
        Object.keys(arrivalMap).forEach((otherId) => {
          if (otherId !== id) document.getElementById(otherId).checked = false;
        });
        // Clear discount filter
        selectedDiscount = null;
        ["discount1","discount2","discount3","discount4","discount5"]
          .forEach((did) => { const el = document.getElementById(did); if (el) el.checked = false; });

        selectedArrival = this.checked ? arrivalMap[id] : null;
        applyArrivalFilter();
      });
    }
  });
}

function applyArrivalFilter() {
  if (!selectedArrival) {
    renderProducts(allProducts);
    return;
  }
  const now = new Date();
  const filtered = allProducts.filter((p) => {
    const diffDays = (now - new Date(p.createdAt)) / (1000 * 60 * 60 * 24);
    return diffDays <= selectedArrival;
  });
  renderProducts(filtered);
}

// ========================
// Toast Message
// ========================
function showShopMessage(msg, type) {
  const existing = document.getElementById("shop-toast");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "shop-toast";
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