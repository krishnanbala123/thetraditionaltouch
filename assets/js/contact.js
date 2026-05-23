// contact.js - Handles contact form submission

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".contact-form form");

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = form.querySelector('input[name="name"]').value.trim();
    const email = form.querySelector('input[name="email"]').value.trim();
    const subject = form.querySelector('input[name="subject"]').value.trim();
    const message = form.querySelector('textarea[name="message"]').value.trim();

    if (!name || !email || !subject || !message) {
      showToast("Please fill in all fields.", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${CONFIG.BASE_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast("Message sent! We'll get back to you within 24 hours.", "success");
        form.reset();
      } else {
        showToast(data.error || "Something went wrong. Please try again.", "error");
      }
    } catch (err) {
      console.error("Contact form error:", err);
      showToast("Unable to send message. Please check your connection.", "error");
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
});

// ── Toast Notification ──────────────────────────────────────────────
function showToast(message, type = "success") {
  // Remove any existing toast
  const existing = document.getElementById("contact-toast");
  if (existing) existing.remove();

  const colors = {
    success: { bg: "#0f4c35", border: "#7dbfa0", icon: "fa-check-circle" },
    error:   { bg: "#4c0f0f", border: "#c97b7b", icon: "fa-times-circle" },
  };

  const { bg, border, icon } = colors[type] || colors.success;

  const toast = document.createElement("div");
  toast.id = "contact-toast";
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: ${bg};
    color: #fff;
    padding: 14px 20px;
    border-radius: 6px;
    border-left: 4px solid ${border};
    font-size: 14px;
    font-family: 'Jost', sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 340px;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  toast.innerHTML = `<i class="fa ${icon}"></i> ${message}`;
  document.body.appendChild(toast);

  // Fade in
  requestAnimationFrame(() => { toast.style.opacity = "1"; });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}