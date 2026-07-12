// =============================================
//  track-order.js  —  The Traditional Touch
//  Handles: manual tracking form + auto-load
//  from ?id= (coming from My Orders in profile)
// =============================================

const TOKEN = localStorage.getItem("token");

// ── 17track carrier code map ──────────────────────────────────────────────
// Update these codes to match what's in your 17track dashboard
const CARRIER_CODES = {
  dtdc:      100069,
  stcourier: 100604,
};

// ── Status badge metadata ─────────────────────────────────────────────────
// ── Complete 17track main status + sub_status label map ───────────────────
const STATUS_META = {
  // Main statuses
  InfoReceived:        { cls: "status-info",      label: "Info Received" },
  InTransit:           { cls: "status-transit",   label: "In Transit" },
  OutForDelivery:      { cls: "status-out",       label: "Out for Delivery" },
  Delivered:           { cls: "status-delivered", label: "Delivered" },
  AvailableForPickup:  { cls: "status-transit",   label: "Ready for Pickup" },
  DeliveryFailure:     { cls: "status-attempt",   label: "Delivery Failed" },
  Exception:           { cls: "status-exception", label: "Exception" },
  Expired:             { cls: "status-expired",   label: "Expired" },
  NotFound:            { cls: "status-expired",   label: "Not Found" },

  // InTransit sub-statuses
  InTransit_PickedUp:                  { cls: "status-transit",   label: "Picked Up" },
  InTransit_Departure:                 { cls: "status-transit",   label: "Departed Origin" },
  InTransit_Arrival:                   { cls: "status-transit",   label: "Arrived at Hub" },
  InTransit_CustomsProcessing:         { cls: "status-transit",   label: "Customs Processing" },
  InTransit_CustomsReleased:           { cls: "status-transit",   label: "Customs Cleared" },
  InTransit_CustomsRequiringInformation:{ cls: "status-attempt",  label: "Customs: Info Needed" },
  InTransit_Other:                     { cls: "status-transit",   label: "On the Way" },

  // Delivered sub-statuses
  Delivered_Other:                     { cls: "status-delivered", label: "Delivered" },

  // AvailableForPickup sub-statuses
  AvailableForPickup_Other:            { cls: "status-transit",   label: "Ready for Pickup" },

  // OutForDelivery sub-statuses
  OutForDelivery_Other:                { cls: "status-out",       label: "Out for Delivery" },

  // DeliveryFailure sub-statuses
  DeliveryFailure_Other:               { cls: "status-attempt",   label: "Delivery Failed" },
  DeliveryFailure_NoBody:              { cls: "status-attempt",   label: "Recipient Unavailable" },
  DeliveryFailure_Security:            { cls: "status-attempt",   label: "Security Hold" },
  DeliveryFailure_Rejected:            { cls: "status-attempt",   label: "Recipient Refused" },
  DeliveryFailure_InvalidAddress:      { cls: "status-attempt",   label: "Invalid Address" },

  // Exception sub-statuses
  Exception_Other:                     { cls: "status-exception", label: "Exception" },
  Exception_Returning:                 { cls: "status-exception", label: "Returning to Sender" },
  Exception_Returned:                  { cls: "status-exception", label: "Returned to Sender" },
  Exception_NoBody:                    { cls: "status-exception", label: "Recipient Not Found" },
  Exception_Security:                  { cls: "status-exception", label: "Security Issue" },
  Exception_Damaged:                   { cls: "status-exception", label: "Parcel Damaged" },
  Exception_Lost:                      { cls: "status-exception", label: "Parcel Lost" },

  // Expired sub-statuses
  Expired_Other:                       { cls: "status-expired",   label: "Expired" },

  // NotFound sub-statuses
  NotFound_Other:                      { cls: "status-expired",   label: "Not Found" },
  NotFound_InvalidCode:                { cls: "status-expired",   label: "Invalid Number" },
};

// ── Updated statusBadge: checks stage AND sub_status, never shows Unknown ──
function statusBadge(stage, subStatus) {
  // Try sub_status first (more specific), then stage, then generic fallback
  const key = (subStatus && STATUS_META[subStatus]) ? subStatus
             : (stage    && STATUS_META[stage])    ? stage
             : null;

  if (!key) return "";  // blank — never "Unknown"

  const m = STATUS_META[key];
  return `<span class="track-status-badge ${m.cls}">${m.label}</span>`;
}

// ── Progress bar step activator ───────────────────────────────────────────
function setProgressSteps(status) {
  const STEP_IDS = ["step-ordered", "step-pickup", "step-transit", "step-delivered"];

  // How many steps should be "active" for each 17track status
  const REACHED = {
    InfoReceived:   1,
    InTransit:      2,
    OutForDelivery: 3,
    Delivered:      4,
    AttemptFail:    3,
    Exception:      2,
    Expired:        2,
  };

  const reached = REACHED[status] ?? 1;

  STEP_IDS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (i < reached) el.classList.add("active");
    else             el.classList.remove("active");
  });
}

// ── Error banner helpers ──────────────────────────────────────────────────
function showTrackError(msg) {
  const el = document.getElementById("tracking-error");
  el.style.display = "flex";
  el.querySelector("span").textContent = msg;
  document.getElementById("tracking-results").style.display = "none";
}

function hideTrackError() {
  document.getElementById("tracking-error").style.display = "none";
}

// ── Render full tracking results into the page ────────────────────────────
function renderTrackingResults(data, trackingNumber, courierLabel) {
  hideTrackError();

  const lastUpdate = data.lastUpdate
    ? new Date(data.lastUpdate).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  // Info grid
  document.getElementById("res-courier").textContent     = courierLabel || "—";
  document.getElementById("res-awb").textContent         = trackingNumber || "—";
  document.getElementById("res-last-update").textContent = lastUpdate;
  document.getElementById("res-event-count").textContent =
    (data.events?.length ?? 0) + " event" + (data.events?.length !== 1 ? "s" : "");

  // Status badge — swap outerHTML so the badge classes apply correctly
  const statusEl = document.getElementById("res-status");
  if (statusEl) statusEl.outerHTML =
    `<div class="track-info-value" id="res-status">${statusBadge(data.status)}</div>`;

  // Origin = earliest event location; destination = latest known location
  const events = data.events || [];
  document.getElementById("res-origin").textContent =
    events.length ? (events[events.length - 1].location || "—") : "—";
  document.getElementById("res-destination").textContent = data.location || "—";

  // Signed-by row — only show for Delivered
  const signedRow = document.getElementById("res-signed-row");
  const signedByEl = document.getElementById("res-signed-by");
  if (data.status === "Delivered" && events[0]?.description) {
    signedByEl.textContent   = events[0].description;
    signedRow.style.display  = "";
  } else {
    signedRow.style.display  = "none";
  }

  // Progress steps
  setProgressSteps(data.status);

  // Timeline table
  const tbody = document.getElementById("res-timeline");
  if (!events.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" style="text-align:center;padding:28px;color:#aaa;">
        No tracking events available yet.
       </td></tr>`;
  } else {
    tbody.innerHTML = events.map((ev, i) => {
      const dt   = ev.time_iso ? new Date(ev.time_iso) : null;
      const date = dt
        ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—";
      const time = dt
        ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "—";

      // Pass both stage and sub_status — badge picks the most specific known one
      const badge = statusBadge(ev.stage, ev.sub_status);

      return `
        <tr class="${i === 0 ? "latest-checkpoint" : ""}">
          <td>${date}</td>
          <td>${time}</td>
          <td>${ev.location || "—"}</td>
          <td>${badge || '<span style="font-size:11px;color:#ccc;">—</span>'}</td>
          <td>${ev.description || "—"}</td>
        </tr>`;
    }).join("");
  }

  // Show the results section and scroll to it smoothly
  const resultsEl = document.getElementById("tracking-results");
  resultsEl.style.display = "block";
  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });

  // Re-init feather icons in case any were injected dynamically
  if (typeof feather !== "undefined") feather.replace();
}

// ── Core API call → POST /tracking/info ──────────────────────────────────
async function fetchTracking({ trackingNumber, carrierCode, orderId, courierLabel }) {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/tracking/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
      body: JSON.stringify({
        trackingNumber,
        carrierCode: Number(carrierCode) || 0,
        ...(orderId ? { orderId } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showTrackError(
        data.error ||
        "No tracking information found for this number. " +
        "Please check the number and try again."
      );
      return;
    }

    renderTrackingResults(data, trackingNumber, courierLabel);

  } catch (err) {
    console.error("Track fetch error:", err);
    showTrackError(
      "Network error. Please check your connection and try again."
    );
  }
}

// ── Manual form submit ────────────────────────────────────────────────────
document.getElementById("tracking-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  hideTrackError();

  const trackingNumber = document.getElementById("tracking-input").value.trim().toUpperCase();
  const courierSelect  = document.getElementById("courier-select");
  const courierKey     = courierSelect.value;
  const courierLabel   = courierSelect.options[courierSelect.selectedIndex].text;
  const carrierCode    = CARRIER_CODES[courierKey] ?? 0;

  if (!trackingNumber) {
    showTrackError("Please enter a tracking / AWB number.");
    return;
  }

  const btn  = this.querySelector("button[type=submit]");
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Tracking…`;

  await fetchTracking({ trackingNumber, carrierCode, courierLabel });

  btn.disabled  = false;
  btn.innerHTML = orig;
});

// ── Auto-load from ?id= (arriving from My Orders via profile page) ─────────

(async function autoLoadFromOrderId() {
  const params  = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!orderId || !TOKEN) return;

  const banner   = document.getElementById("auto-load-banner");
  const bannerTx = document.getElementById("auto-load-text");
  banner.style.display = "flex";
  bannerTx.textContent = "Looking up your order…";

  try {
    const orderRes = await fetch(`${CONFIG.BASE_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (!orderRes.ok) {
      throw new Error(
        orderRes.status === 404
          ? "Order not found. It may belong to a different account."
          : "Failed to load order details."
      );
    }

    // FIX: API returns { order: {...} } — unwrap it
    const json  = await orderRes.json();
    const order = json.order ?? json;

    if (!order?.trackingNumber) {
      banner.style.display = "none";
      showTrackError(
        "No tracking number has been assigned to this order yet. " +
        "Please check back after your order is dispatched."
      );
      return;
    }

    const trackingNumber = order.trackingNumber;
    const carrierCode    = order.courierCode;   // 100604 for stcourier

    // Pre-fill the form
    document.getElementById("tracking-input").value = trackingNumber;

    const CODE_TO_KEY = Object.fromEntries(
      Object.entries(CARRIER_CODES).map(([k, v]) => [v, k])
    );
    const selectKey = CODE_TO_KEY[carrierCode] || "dtdc";
    document.getElementById("courier-select").value = selectKey;

    const courierSelect = document.getElementById("courier-select");
    // Use the select label, fall back to courierName from DB (e.g. "ST Courier")
    const courierLabel  = courierSelect.options[courierSelect.selectedIndex]?.text
                          || order.courierName
                          || "Unknown Courier";

    const shortId = orderId.slice(-6).toUpperCase();
    bannerTx.textContent = `Fetching live tracking for order #ORD-${shortId}…`;

    await fetchTracking({
      trackingNumber,
      carrierCode: Number(carrierCode) || 0,
      orderId,
      courierLabel,
    });

  } catch (err) {
    console.error("Auto-load error:", err);
    showTrackError(err.message || "Could not load order tracking details.");
  } finally {
    banner.style.display = "none";
  }
})();