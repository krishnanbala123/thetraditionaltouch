const API_BASE_URL = CONFIG.BASE_URL;

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");

  // ========================
  // Input Selectors
  // ========================
  const emailInput = form.querySelector('input[type="text"]');
  const passwordInput = form.querySelector('input[type="password"]');

  // ========================
  // Password show/hide toggle
  // ========================
  const toggleBtn = document.querySelector(".toggle-show");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      this.classList.toggle("fa-eye");
      this.classList.toggle("fa-eye-slash");
    });
  }

  // ========================
  // Real-time validation
  // ========================
  emailInput.addEventListener("input", () => validateEmail(emailInput));
  passwordInput.addEventListener("input", () =>
    validatePassword(passwordInput),
  );

  // ========================
  // Form Submit
  // ========================
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // All validations
    const isEmailValid = validateEmail(emailInput);
    const isPasswordValid = validatePassword(passwordInput);

    if (!isEmailValid || !isPasswordValid) return;

    // Button disable
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Logging in...';

    try {
      const response = await fetch(`${CONFIG.BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // ✅ Save token & user
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        showMessage(data.message || "Login successful! 🎉", "success");

        setTimeout(() => {
          window.location.href = "index.html"; // 🔴 Change to your dashboard page if needed
        }, 2000);
      } else {
        showMessage(data.message || "Invalid email or password!", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa fa-sign-in"></i> Login';
      }
    } catch (error) {
      console.error("Login Error:", error);
      showMessage("Network error! Check your connection.", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa fa-sign-in"></i> Login';
    }
  });
});

// ========================
// Validation Functions
// ========================

function validateEmail(input) {
  const value = input.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!value) {
    showFieldError(input, "Email is required!");
    return false;
  } else if (!emailRegex.test(value)) {
    showFieldError(input, "Enter a valid email address!");
    return false;
  }
  clearFieldError(input);
  return true;
}

function validatePassword(input) {
  const value = input.value.trim();
  if (!value) {
    showFieldError(input, "Password is required!");
    return false;
  } else if (value.length < 6) {
    showFieldError(input, "Password must be at least 6 characters!");
    return false;
  }
  clearFieldError(input);
  return true;
}

// ========================
// Error UI Functions  ← register.js la iruntha exact same style
// ========================

function showFieldError(input, message) {
  clearFieldError(input);

  input.style.borderColor = "#dc3545";

  const error = document.createElement("small");
  error.className = "field-error-msg";
  error.style.cssText =
    "color: #dc3545; font-size: 12px; margin-top: 4px; display: block;";
  error.innerText = "⚠️ " + message;

  input.closest(".form-group").appendChild(error);
}

function clearFieldError(input) {
  input.style.borderColor = "";

  const formGroup = input.closest(".form-group");

  // 🔥 Remove ALL existing errors inside this group
  const errors = formGroup.querySelectorAll(".field-error-msg");
  errors.forEach((err) => err.remove());
}

function showMessage(msg, type) {
  const existing = document.getElementById("api-message");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "api-message";
  div.style.cssText = `
    padding: 12px 18px;
    border-radius: 8px;
    margin-bottom: 15px;
    font-weight: 500;
    font-size: 14px;
    text-align: center;
    background-color: ${type === "success" ? "#d4edda" : "#f8d7da"};
    color: ${type === "success" ? "#155724" : "#721c24"};
    border: 1px solid ${type === "success" ? "#c3e6cb" : "#f5c6cb"};
  `;
  div.innerText = msg;

  const formEl = document.querySelector("form");
  formEl.insertBefore(div, formEl.firstChild);

  setTimeout(() => div.remove(), 4000);
}
