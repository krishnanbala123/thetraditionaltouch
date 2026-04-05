const API_BASE_URL = CONFIG.BASE_URL;

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");

  // ========================
  // Real-time validation
  // ========================
  const nameInput = form.querySelector('input[type="text"]');
  const emailInput = form.querySelector('input[type="email"]');
  const passwordInput = form.querySelector('input[type="password"]');
  const agreeCheckbox = document.getElementById("agree");

  nameInput.addEventListener("input", () => validateName(nameInput));
  emailInput.addEventListener("input", () => validateEmail(emailInput));
  passwordInput.addEventListener("input", () =>
    validatePassword(passwordInput),
  );

  // ========================
  // Form Submit
  // ========================
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // All validations
    const isNameValid = validateName(nameInput);
    const isEmailValid = validateEmail(emailInput);
    const isPasswordValid = validatePassword(passwordInput);

    // Checkbox validation
    if (!agreeCheckbox.checked) {
      showMessage("Please agree to terms and conditions!", "error");
      return;
    }

    // Oru field valid
    if (!isNameValid || !isEmailValid || !isPasswordValid) return;

    // Button disable
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fa fa-spinner fa-spin"></i> Registering...';

    try {
      const response = await fetch(`${CONFIG.BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(data.message || "Registered successfully! 🎉", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } else {
        showMessage(data.message || "Registration failed. Try again!", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa fa-paper-plane"></i> Register';
      }
    } catch (error) {
      console.error("Register Error:", error);
      showMessage("Network error! Check your connection.", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa fa-paper-plane"></i> Register';
    }
  });
});

// ========================
// Validation Functions
// ========================

function validateName(input) {
  const value = input.value.trim();
  if (!value) {
    showFieldError(input, "Name is required!");
    return false;
  } else if (value.length < 3) {
    showFieldError(input, "Name must be at least 3 characters!");
    return false;
  } else if (!/^[a-zA-Z\s]+$/.test(value)) {
    showFieldError(input, "Name must contain only letters!");
    return false;
  }
  clearFieldError(input);
  return true;
}

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
  } else if (!/[A-Z]/.test(value)) {
    showFieldError(
      input,
      "Password must contain at least one uppercase letter!",
    );
    return false;
  } else if (!/[0-9]/.test(value)) {
    showFieldError(input, "Password must contain at least one number!");
    return false;
  } else if (!/[!@#$%^&*]/.test(value)) {
    showFieldError(
      input,
      "Password must contain at least one special character (!@#$%^&*)!",
    );
    return false;
  }
  clearFieldError(input);
  return true;
}

// ========================
// Error UI Functions
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
