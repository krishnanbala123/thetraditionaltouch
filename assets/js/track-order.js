// assets/js/track-order.js
// Handles shipment tracking — manual form + auto-track from ?id= URL param
// Requires config.js loaded first (provides CONFIG.BASE_URL)

document.addEventListener("DOMContentLoaded", () => {

  // ── DOM refs ─────────────────────────────────────────────────────────────────
  const form           = document.getElementById("tracking-form");
  const input          = document.getElementById("tracking-input");
  const courierSelect  = document.getElementById("courier-select");
  const errorBox       = document.getElementById("tracking-error");
  const errorText      = errorBox.querySelector("span");
  const resultsSection = document.getElementById("tracking-results");
  const autoLoadBanner = document.getElementById("auto-load-banner");
  const autoLoadText   = document.getElementById("auto-load-text");

  // Result slots
  const elCourier     = document.getElementById("res-courier");
  const elAWB         = document.getElementById("res-awb");
  const elStatus      = document.getElementById("res-status");
  const elLastUpdate  = document.getElementById("res-last-update");
  const elOrigin      = document.getElementById("res-origin");
  const elDest        = document.getElementById("res-destination");
  const elSigned      = document.getElementById("res-signed-by");
  const elOriginRow   = document.getElementById("res-origin-row");
  const elDestRow     = document.getElementById("res-dest-row");
  const elSignedRow   = document.getElementById("res-signed-row");
  const elEventCount  = document.getElementById("res-event-count");
  const elTimeline    = document.getElementById("res-timeline");

  // Progress steps
  const stepOrdered   = document.getElementById("step-ordered");
  const stepPickup    = document.getElementById("step-pickup");
  const stepTransit   = document.getElementById("step-transit");
  const stepDelivered = document.getElementById("step-delivered");

  // ── Status meta ───────────────────────────────────────────────────────────────
  const STATUS_META = {
    Pending:        { label: "Pending",           cls: "status-pending",   step: 1 },
    InfoReceived:   { label: "Info Received",     cls: "status-info",      step: 1 },
    InTransit:      { label: "In Transit",        cls: "status-transit",   step: 3 },
    OutForDelivery: { label: "Out for Delivery",  cls: "status-out",       step: 3 },
    AttemptFail:    { label: "Attempt Failed",    cls: "status-attempt",   step: 3 },
    Delivered:      { label: "Delivered",         cls: "status-delivered", step: 4 },
    Exception:      { label: "Exception / Issue", cls: "status-exception", step: 3 },
    Expired:        { label: "Expired",           cls: "status-expired",   step: 1 },
  };

  function getStatusMeta(tag) {
    return STATUS_META[tag] || { label: tag || "Unknown", cls: "status-pending", step: 1 };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function showError(msg) {
    errorText.textContent        = msg;
    errorBox.style.display       = "flex";
    resultsSection.style.display = "none";
  }

  function hideError() { errorBox.style.display = "none"; }

  function setButtonLoading(isLoading) {
    const btn     = form.querySelector("button[type=submit]");
    btn.disabled  = isLoading;
    btn.innerHTML = isLoading
      ? `<i class="fa fa-spinner fa-spin"></i> Tracking…`
      : `<i class="fa fa-search"></i> Track Order`;
  }

  function updateProgressSteps(step) {
    [stepOrdered, stepPickup, stepTransit, stepDelivered].forEach((el, i) => {
      if (el) el.classList.toggle("active", i < step);
    });
  }

  function renderTimeline(checkpoints) {
    if (!checkpoints || checkpoints.length === 0) {
      elTimeline.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:24px;color:#999;">
            No checkpoint data available yet.
          </td>
        </tr>`;
      return;
    }
    elTimeline.innerHTML = checkpoints.map((cp, i) => {
      const dt   = cp.time ? new Date(cp.time) : null;
      const date = dt ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
      const time = dt ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
      const meta = getStatusMeta(cp.tag);
      return `
        <tr${i === 0 ? ' class="latest-checkpoint"' : ""}>
          <td>${date}</td>
          <td>${time}</td>
          <td>${cp.location || "—"}</td>
          <td><span class="track-status-badge ${meta.cls}">${meta.label}</span></td>
          <td>${cp.message || "—"}</td>
        </tr>`;
    }).join("");
  }

  // ── Fetch from AfterShip via your backend ─────────────────────────────────────
  async function trackShipment(trackingNumber, courier) {
    const res = await fetch(`${CONFIG.BASE_URL}/track`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ trackingNumber, courier }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${res.status})`);
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Tracking failed.");
    return data.data;
  }

  // ── Fetch order from your backend by order ID ─────────────────────────────────
  // Your order object should have `trackingNumber` and `courier` fields.
  // If your schema uses different field names, adjust below.
  async function fetchOrderById(orderId) {
    const token = localStorage.getItem("token");
    const res   = await fetch(`${CONFIG.BASE_URL}/orders/${orderId}`, {
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Could not fetch order (${res.status})`);
    }
    return res.json();
  }

  // ── Render live AfterShip result ──────────────────────────────────────────────
  function renderResult(result) {
    const meta = getStatusMeta(result.status);

    elCourier.textContent    = result.courierName || result.courier;
    elAWB.textContent        = result.trackingNumber;
    elLastUpdate.textContent = formatDate(result.lastUpdate);
    elEventCount.textContent = result.checkpoints.length;
    elStatus.textContent     = meta.label;
    elStatus.className       = `track-status-badge ${meta.cls}`;

    if (result.origin)      { elOrigin.textContent = result.origin;      elOriginRow.style.display = ""; }
    else                      elOriginRow.style.display = "none";
    if (result.destination) { elDest.textContent   = result.destination; elDestRow.style.display   = ""; }
    else                      elDestRow.style.display = "none";
    if (result.signedBy)    { elSigned.textContent  = result.signedBy;   elSignedRow.style.display  = ""; }
    else                      elSignedRow.style.display = "none";

    updateProgressSteps(meta.step);
    renderTimeline(result.checkpoints);
    resultsSection.style.display = "block";
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Render order-only status (no AWB yet) ─────────────────────────────────────
  // Uses your own DB order status without hitting AfterShip.
  function renderOrderOnlyStatus(order) {
    const ORDER_STATUS_META = {
      Pending:   { label: "Order Placed",  cls: "status-pending",   step: 1 },
      Confirmed: { label: "Confirmed",     cls: "status-info",      step: 2 },
      Shipped:   { label: "Shipped",       cls: "status-transit",   step: 3 },
      Delivered: { label: "Delivered",     cls: "status-delivered", step: 4 },
      Cancelled: { label: "Cancelled",     cls: "status-exception", step: 1 },
    };
    const meta    = ORDER_STATUS_META[order.status] || { label: order.status || "Processing", cls: "status-pending", step: 1 };
    const shortId = "#TTT-" + (order._id || "").toString().slice(-6).toUpperCase();

    elCourier.textContent    = order.courierName || order.courier || "Awaiting Assignment";
    elAWB.textContent        = shortId;
    elLastUpdate.textContent = formatDate(order.updatedAt || order.createdAt);
    elEventCount.textContent = "—";
    elStatus.textContent     = meta.label;
    elStatus.className       = `track-status-badge ${meta.cls}`;

    elOriginRow.style.display = "none";
    elDestRow.style.display   = "none";
    elSignedRow.style.display = "none";

    updateProgressSteps(meta.step);

    // Build a timeline from whatever order history your API returns,
    // falling back to a single row showing current status.
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    if (history.length > 0) {
      elEventCount.textContent = history.length;
      elTimeline.innerHTML = history.map((h, i) => {
        const hMeta = ORDER_STATUS_META[h.status] || meta;
        return `
          <tr${i === 0 ? ' class="latest-checkpoint"' : ""}>
            <td>${formatDate(h.updatedAt || h.date)}</td>
            <td>—</td>
            <td>${h.location || "Maraimalai Nagar, Chengalpattu"}</td>
            <td><span class="track-status-badge ${hMeta.cls}">${hMeta.label}</span></td>
            <td>${h.note || `Order ${hMeta.label.toLowerCase()}.`}</td>
          </tr>`;
      }).join("");
    } else {
      elTimeline.innerHTML = `
        <tr class="latest-checkpoint">
          <td>${formatDate(order.createdAt)}</td>
          <td>—</td>
          <td>Maraimalai Nagar, Chengalpattu</td>
          <td><span class="track-status-badge ${meta.cls}">${meta.label}</span></td>
          <td>Your order is ${meta.label.toLowerCase()}. Tracking details will appear once shipped.</td>
        </tr>`;
    }

    resultsSection.style.display = "block";
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── AUTO-TRACK from ?id= ──────────────────────────────────────────────────────
  async function autoTrackFromOrderId(orderId) {
    autoLoadBanner.style.display = "flex";
    autoLoadText.textContent     = "Loading your order details…";
    hideError();

    try {
      const order = await fetchOrderById(orderId);

      // Case A: order has a courier AWB → hit AfterShip for live tracking
      if (order.trackingNumber && order.courier) {
        autoLoadText.textContent = `Fetching live tracking for ${order.trackingNumber}…`;

        // Pre-fill the manual form so user can re-search if needed
        input.value         = order.trackingNumber;
        courierSelect.value = order.courier;

        try {
          const result = await trackShipment(order.trackingNumber, order.courier);
          renderResult(result);
          autoLoadText.textContent = "Live tracking loaded ✓";
          setTimeout(() => { autoLoadBanner.style.display = "none"; }, 2000);
        } catch (trackErr) {
          // AfterShip failed — fall back to order status
          autoLoadBanner.style.display = "none";
          showError(`Live courier tracking unavailable: ${trackErr.message}. Showing your order status instead.`);
          renderOrderOnlyStatus(order);
        }

      // Case B: no AWB yet — show order status from your DB
      } else {
        autoLoadBanner.style.display = "none";
        renderOrderOnlyStatus(order);
      }

    } catch (err) {
      autoLoadBanner.style.display = "none";
      showError(`Could not load order: ${err.message}`);
    }
  }

  // ── Manual form submit ─────────────────────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const trackingNumber = input.value.trim();
    const courier        = courierSelect.value;
    if (!trackingNumber) return;

    hideError();
    setButtonLoading(true);
    try {
      const result = await trackShipment(trackingNumber, courier);
      renderResult(result);
    } catch (err) {
      showError(err.message || "Something went wrong. Please try again.");
    } finally {
      setButtonLoading(false);
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────────
  const orderId = new URLSearchParams(window.location.search).get("id");
  if (orderId) autoTrackFromOrderId(orderId);

});