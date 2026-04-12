const OrderManager = (() => {
  const API = CONFIG.BASE_URL;

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  // -----------------------------------------
  // 1. Load User Profile (Auto Fill Checkout)
  // -----------------------------------------
  async function loadUserProfile() {
    try {
      const res = await fetch(`${API}/user/profile`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const user = await res.json();

      // Fill form
      document.getElementById("fname").value =
        user.name?.split(" ")[0] || "";
      document.getElementById("lname").value =
        user.name?.split(" ").slice(1).join(" ") || "";

      document.querySelector("textarea").value = user.address || "";

      // Optional: store phone
      document.body.dataset.phone = user.phone || "";
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }

  // -----------------------------------------
  // 2. Update User Profile (if changed)
  // -----------------------------------------
  async function updateUserProfile(name, address) {
    try {
      await fetch(`${API}/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name,
          address,
        }),
      });
    } catch (err) {
      console.error("Profile update failed:", err);
    }
  }

  // -----------------------------------------
  // 3. Place Order
  // -----------------------------------------
  async function placeOrder() {
    try {
      const fname = document.getElementById("fname").value.trim();
      const lname = document.getElementById("lname").value.trim();
      const address = document.querySelector("textarea").value.trim();

      const fullName = `${fname} ${lname}`;

      if (!fname || !address) {
        alert("Please fill required fields");
        return;
      }

      // 👉 Update user profile before order
      await updateUserProfile(fullName, address);

      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          paymentMethod: "Razorpay", // ✅ only Razorpay
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Order failed");
      }

      alert("Order placed successfully 🎉");

      // Redirect to orders page (optional)
      window.location.href = "orders.html";
    } catch (err) {
      console.error("Order error:", err);
      alert("Something went wrong!");
    }
  }

  // -----------------------------------------
  // 4. Init
  // -----------------------------------------
  function init() {
    loadUserProfile();

    const btn = document.querySelector(".btn-primary");

    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        placeOrder();
      });
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", OrderManager.init);