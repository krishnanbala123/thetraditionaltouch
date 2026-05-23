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
    let url = `${CONFIG.BASE_URL}/products?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      allProducts = data.products;
      renderProducts(data.products);
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

      const hasStock = product.sizes.some((s) => s.stock > 0);

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
                <a href="javascript:void(0);" onclick="quickAddToCart(event, '${product._id}', this)">
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
// Quick Add to Cart (Shop page)
// ========================
function quickAddToCart(event, id, btnEl) {
  event.preventDefault();

  const product = allProducts.find((p) => p._id === id);
  if (!product) {
    CartManager.showToast("Product not found!", "error");
    return;
  }

  const availableSizes = product.sizes.filter((s) => s.stock > 0);
  if (availableSizes.length === 0) {
    CartManager.showToast("Out of stock!", "error");
    return;
  }

  const defaultSize = availableSizes[0].size;
  CartManager.addToCart(id, 1, btnEl, defaultSize); // ✅ btnEl pass
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
  const searchInput = document.querySelector(".search-bar input");
  const searchBtn = document.querySelector(".search-bar .btn-primary");

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      searchQuery = searchInput.value.trim();
      currentPage = 1;
      fetchProducts(currentPage, searchQuery);

      // Search bar close
      document.querySelector(".search-bar").classList.remove("show");
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchQuery = searchInput.value.trim();
        currentPage = 1;
        fetchProducts(currentPage, searchQuery);
        document.querySelector(".search-bar").classList.remove("show");
      }
    });
  }
}

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
        // only one checkbox select
        Object.keys(discountMap).forEach((otherId) => {
          if (otherId !== id) {
            document.getElementById(otherId).checked = false;
          }
        });

        if (this.checked) {
          selectedDiscount = discountMap[id];
        } else {
          selectedDiscount = null;
        }

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

  const filteredProducts = allProducts.filter((product) => {
    return (product.discount || 0) >= selectedDiscount;
  });

  renderProducts(filteredProducts);
}

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
        // one checkbox only
        Object.keys(arrivalMap).forEach((otherId) => {
          if (otherId !== id) {
            document.getElementById(otherId).checked = false;
          }
        });

        if (this.checked) {
          selectedArrival = arrivalMap[id];
        } else {
          selectedArrival = null;
        }

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

  const filteredProducts = allProducts.filter((product) => {
    const createdDate = new Date(product.createdAt);

    const diffTime = now - createdDate;

    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays <= selectedArrival;
  });

  renderProducts(filteredProducts);
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
