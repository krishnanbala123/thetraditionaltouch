// ══════════════════════════════════════════════════════════════════════════════
//  review.js  —  Product Review logic for The Traditional Touch
//  Handles: auth gate, star picker, fetch/render reviews, submit review
// ══════════════════════════════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────────────────────────
let pickedRating = 0;
const RSP_HINTS  = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

// ── DOM ready ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initAuthGate();
  initStarPicker();
  hookProductLoad();
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH GATE
//  Shows the write-review form when logged in, login prompt otherwise.
//  Also pre-fills the readonly name / email from localStorage.
// ══════════════════════════════════════════════════════════════════════════════
function initAuthGate() {
  const token    = localStorage.getItem("token");
  const gateEl   = document.getElementById("review-login-gate");
  const formWrap = document.getElementById("review-form-wrap");

  if (!gateEl || !formWrap) return;

  if (!token) {
    // Not logged in — show login prompt, hide form
    gateEl.style.display   = "block";
    formWrap.style.display = "none";
    return;
  }

  // Logged in — show form, hide gate
  gateEl.style.display   = "none";
  formWrap.style.display = "block";

  // Pre-fill readonly name & email from cached user (profile.js also stores this)
  prefillReviewerFields();
}

function prefillReviewerFields() {
  let user = null;

  // Try localStorage first (set by profile.js / fetchProfile)
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (_) { /* ignore */ }

  const nameEl  = document.getElementById("review-name");
  const emailEl = document.getElementById("review-email");

  if (!nameEl || !emailEl) return;

  if (user && user.name) {
    nameEl.value  = user.name;
    emailEl.value = user.email || "";
  } else {
    // Fallback: fetch from API (token exists but user not cached)
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${CONFIG.BASE_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.name) {
          localStorage.setItem("user", JSON.stringify(data));
          nameEl.value  = data.name  || "";
          emailEl.value = data.email || "";
        }
      })
      .catch((err) => console.warn("review.js: could not pre-fill user fields:", err));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  STAR PICKER
// ══════════════════════════════════════════════════════════════════════════════
function initStarPicker() {
  const stars = document.querySelectorAll(".rsp-stars i");
  if (!stars.length) return;

  stars.forEach((star) => {
    star.addEventListener("mouseover", () => highlightStars(+star.dataset.val));
    star.addEventListener("mouseout",  () => highlightStars(pickedRating));
    star.addEventListener("click",     () => {
      pickedRating = +star.dataset.val;
      document.getElementById("review-rating-val").value = pickedRating;
      const hint = document.getElementById("rsp-hint");
      if (hint) hint.textContent = RSP_HINTS[pickedRating] || "";
      highlightStars(pickedRating);
    });
  });
}

function highlightStars(val) {
  document.querySelectorAll(".rsp-stars i").forEach((s) => {
    s.classList.toggle("active", +s.dataset.val <= val);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function starsHTML(rating, cls = "star-row") {
  let html = `<span class="${cls}">`;
  for (let i = 1; i <= 5; i++) {
    html += `<i class="fa fa-star${i <= rating ? " filled" : ""}"></i>`;
  }
  return html + "</span>";
}

function summaryStarsHTML(avg) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    if (avg >= i)         html += `<i class="fa fa-star filled"></i>`;
    else if (avg >= i - 0.5) html += `<i class="fa fa-star half-filled"></i>`;
    else                  html += `<i class="fa fa-star"></i>`;
  }
  return html;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function showReviewMsg(msg, type) {
  const el = document.getElementById("review-form-msg");
  if (!el) return;
  el.textContent = msg;
  el.className   = type; // "success" or "error" — styled via CSS
}

// ══════════════════════════════════════════════════════════════════════════════
//  RENDER — Summary bar chart
// ══════════════════════════════════════════════════════════════════════════════
function renderSummary(avg, total, distribution) {
  const avgEl   = document.getElementById("rs-avg");
  const starsEl = document.getElementById("rs-stars");
  const countEl = document.getElementById("rs-count");
  const tabBadge = document.getElementById("review-tab-count");
  const barsEl  = document.getElementById("rs-bars");

  if (avgEl)   avgEl.textContent   = total > 0 ? avg.toFixed(1) : "—";
  if (starsEl) starsEl.innerHTML   = total > 0 ? summaryStarsHTML(avg) : "";
  if (countEl) countEl.textContent =
    total === 0 ? "No reviews yet" : `${total} review${total !== 1 ? "s" : ""}`;
  if (tabBadge) tabBadge.textContent = total;

  if (!barsEl) return;

  if (!distribution || distribution.length === 0) {
    barsEl.innerHTML = "";
    return;
  }

  barsEl.innerHTML = distribution
    .map(({ star, count }) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="rs-bar-row">
          <span class="rs-bar-label">${star}★</span>
          <div class="rs-bar-track">
            <div class="rs-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="rs-bar-count">${count}</span>
        </div>`;
    })
    .join("");
}

// ══════════════════════════════════════════════════════════════════════════════
//  RENDER — Review list
// ══════════════════════════════════════════════════════════════════════════════
function renderReviews(reviews) {
  const listEl  = document.getElementById("review-list");
  const emptyEl = document.getElementById("review-empty");

  if (!listEl) return;

  if (!reviews || reviews.length === 0) {
    listEl.innerHTML      = "";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  listEl.innerHTML = reviews
    .map(
      (r) => `
      <li>
        <div class="media">
          <div class="review-avatar">${initials(r.name)}</div>
          <div class="review-meta">
            <h6>${escapeHTML(r.name)}</h6>
            <div class="review-stars-row">
              ${starsHTML(r.rating)}
              <span class="review-date">${formatDate(r.createdAt)}</span>
            </div>
          </div>
        </div>
        <p class="review-comment">${escapeHTML(r.comment)}</p>
      </li>`
    )
    .join("");
}

// Basic XSS guard for user-generated content
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ══════════════════════════════════════════════════════════════════════════════
//  FETCH REVIEWS  (public — no token required)
// ══════════════════════════════════════════════════════════════════════════════
async function loadReviews(productId) {
  if (!productId) return;

  // Show skeleton while loading
  const listEl = document.getElementById("review-list");
  if (listEl) {
    listEl.innerHTML = `
      <li class="review-loading-state">
        <div class="review-skeleton"></div>
        <div class="review-skeleton short"></div>
      </li>`;
  }

  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/reviews/${productId}`);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.success) {
      renderSummary(data.avgRating, data.total, data.distribution);
      renderReviews(data.reviews);
    } else {
      throw new Error(data.message || "Unknown error");
    }
  } catch (err) {
    console.error("review.js › loadReviews:", err);
    if (listEl) listEl.innerHTML = "";
    const emptyEl = document.getElementById("review-empty");
    if (emptyEl) emptyEl.style.display = "block";
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  SUBMIT REVIEW  (protected — requires token)
// ══════════════════════════════════════════════════════════════════════════════
async function submitReview() {
  const productId = new URLSearchParams(window.location.search).get("id");
  const rating    = parseInt(document.getElementById("review-rating-val")?.value || "0", 10);
  const comment   = (document.getElementById("review-comment")?.value || "").trim();
  const btn       = document.getElementById("review-submit-btn");
  const token     = localStorage.getItem("token");

  // ── Client-side validation ──────────────────────────────────────────────────
  if (!productId)          return showReviewMsg("Invalid product.", "error");
  if (!token)              return showReviewMsg("Please log in to post a review.", "error");
  if (!rating || rating < 1) return showReviewMsg("Please select a star rating.", "error");
  if (!comment)            return showReviewMsg("Please write a review before submitting.", "error");
  if (comment.length < 5)  return showReviewMsg("Review is too short (min 5 characters).", "error");

  // ── Submit ──────────────────────────────────────────────────────────────────
  if (btn) { btn.disabled = true; btn.textContent = "Posting…"; }

  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/reviews/${productId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, comment }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showReviewMsg("✓ Review posted successfully!", "success");

      // Reset form
      const commentEl = document.getElementById("review-comment");
      if (commentEl) commentEl.value = "";
      pickedRating = 0;
      const ratingInput = document.getElementById("review-rating-val");
      if (ratingInput) ratingInput.value = 0;
      highlightStars(0);
      const hintEl = document.getElementById("rsp-hint");
      if (hintEl) hintEl.textContent = "Click to rate";

      // Reload reviews so new one appears immediately
      await loadReviews(productId);
    } else {
      // Surface backend error (duplicate review, validation, etc.)
      showReviewMsg(data.message || "Could not post review. Please try again.", "error");
    }
  } catch (err) {
    console.error("review.js › submitReview:", err);
    showReviewMsg("Network error. Please check your connection.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Post Review"; }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  HOOK INTO PRODUCT LOAD
//  product-details.js renders the product name into <h2>.
//  We watch for that mutation, then fire loadReviews once.
// ══════════════════════════════════════════════════════════════════════════════
function hookProductLoad() {
  const productId = new URLSearchParams(window.location.search).get("id");
  if (!productId) return;

  const h2 = document.querySelector(".cdxpro-detail h2");
  if (!h2) {
    // h2 not in DOM yet — wait for it
    const bodyObs = new MutationObserver(() => {
      const el = document.querySelector(".cdxpro-detail h2");
      if (el) { bodyObs.disconnect(); watchH2(el, productId); }
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });
    return;
  }

  watchH2(h2, productId);
}

function watchH2(h2El, productId) {
  // If already filled (e.g., synchronous render), load immediately
  if (h2El.textContent.trim()) {
    loadReviews(productId);
    return;
  }

  // Otherwise wait for text content to appear
  const obs = new MutationObserver(() => {
    if (h2El.textContent.trim()) {
      obs.disconnect();
      loadReviews(productId);
    }
  });
  obs.observe(h2El, { childList: true, characterData: true, subtree: true });
}