const OrderManager = (() => {
  const API = CONFIG.BASE_URL;

  const getToken = () => localStorage.getItem("token") || "";

  // -----------------------------------------
  // Load Profile
  // -----------------------------------------
  async function loadUserProfile() {
    try {
      const res = await fetch(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      const user = await res.json();

      document.getElementById("fname").value =
        user.name?.split(" ")[0] || "";
      document.getElementById("lname").value =
        user.name?.split(" ").slice(1).join(" ") || "";

      document.querySelector("textarea").value = user.address || "";
      document.body.dataset.phone = user.phone || "";
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------------------
  // Update Profile
  // -----------------------------------------
  async function updateUserProfile(name, address) {
    await fetch(`${API}/user/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ name, address }),
    });
  }

  // -----------------------------------------
  // 🔥 MAIN PAYMENT FLOW
  // -----------------------------------------
  async function startPayment() {
    try {
      const fname = document.getElementById("fname").value.trim();
      const lname = document.getElementById("lname").value.trim();
      const address = document.querySelector("textarea").value.trim();

      if (!fname || !address) {
        alert("Fill required fields");
        return;
      }

      const fullName = `${fname} ${lname}`;

      await updateUserProfile(fullName, address);

      // 👉 Calculate amount from cart UI instead of localStorage
      let amount = 0;
      document.querySelectorAll(".item-total").forEach((el) => {
        amount += parseFloat(el.textContent.replace("₹", "")) || 0;
      });

      if (!amount) {
        alert("Cart is empty");
        return;
      }

      // -----------------------------------
      // 1. Create Razorpay Order
      // -----------------------------------
      const res = await fetch(`${API}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const order = await res.json();

      if (!order.id) {
        alert("Payment init failed");
        return;
      }

      // -----------------------------------
      // 2. Razorpay
      // -----------------------------------
      const options = {
        key: "rzp_test_Skvus1wnQRpKJr",
        amount: order.amount,
        currency: "INR",
        name: "The Traditional Touch",
        order_id: order.id,

        handler: async function (response) {
          try {
            // -----------------------------------
            // 3. Verify Payment
            // -----------------------------------
            const verifyRes = await fetch(`${API}/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (!verifyData.success) {
              alert("Payment verification failed");
              return;
            }

            // -----------------------------------
            // 4. Place Order
            // -----------------------------------
            const finalRes = await fetch(`${API}/orders`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`,
              },
              body: JSON.stringify({
                paymentMethod: "Razorpay",
                paymentId: response.razorpay_payment_id,
                address,
                phone: document.body.dataset.phone,
              }),
            });

            const data = await finalRes.json();

            if (!finalRes.ok) throw new Error(data.message);

            alert("✅ Order placed!");

            localStorage.removeItem("cart");

            window.location.href = "orders.html";
          } catch (err) {
            console.error(err);
            alert("Order failed");
          }
        },

        prefill: {
          name: fullName,
          contact: document.body.dataset.phone || "",
        },

        theme: { color: "#3399cc" },
      };

      new Razorpay(options).open();
    } catch (err) {
      console.error(err);
      alert("Payment error");
    }
  }

  // -----------------------------------------
  // INIT
  // -----------------------------------------
  function init() {
    loadUserProfile();

    const btn = document.getElementById("pay-btn");

    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        startPayment(); // ✅ FIXED
      });
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", OrderManager.init);