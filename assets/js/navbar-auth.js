// (function () {
//   const token = localStorage.getItem("token");
//   const user = JSON.parse(localStorage.getItem("user") || "null");
//   const wrap = document.getElementById("user-dropdown-wrap");

//   if (!wrap) return;

//   const userIcon = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
//     <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
//   </svg>`;

//   if (token && user) {
//     // ✅ Logged in
//     wrap.innerHTML = `
//   <a class="dropdown-action" href="javascript:void(0);">${userIcon}</a>
//   <ul class="dropdownitem-list">
//     <li class="dropdown-greeting">Hi, ${user.name || "User"} 👋</li>
//     <li><a href="profile1.html">My Profile</a></li>
//     <li><a href="track-order.html">Track Order</a></li>
//     <li class="dropdown-divider-item"><a href="#" id="logout-btn">Logout</a></li>
//   </ul>
// `;

//     document
//       .getElementById("logout-btn")
//       .addEventListener("click", function (e) {
//         e.preventDefault();
//         localStorage.removeItem("token");
//         localStorage.removeItem("user");
//         window.location.href = "login.html";
//       });
//   } else {
//     // ❌ Not logged in
//     wrap.innerHTML = `
//       <a class="dropdown-action" href="javascript:void(0);">${userIcon}</a>
//       <ul class="dropdownitem-list">
//         <li><a href="login.html">Login</a></li>
//         <li><a href="register.html">Register</a></li>
//       </ul>
//     `;
//   }
// })();

(function () {
  const token = localStorage.getItem("token");
  const wrap = document.getElementById("user-dropdown-wrap");

  if (!wrap) return;

  if (!token) {
    const list = wrap.querySelector(".dropdownitem-list");
    if (list) {
      list.innerHTML = `
        <li><a href="login.html">Login</a></li>
        <li><a href="register.html">Register</a></li>
      `;
    }
    return;
  }

  // ✅ Logged in — fetch profile
  fetch(`${CONFIG.BASE_URL}/user/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Auth failed");
      return res.json();
    })
    .then((user) => {
      const firstName = (user.name || "User").split(" ")[0];

      const actionBtn = wrap.querySelector(".dropdown-action");
      if (actionBtn && user.image) {
        const existingImg = actionBtn.querySelector("img.profile-avatar");
        if (!existingImg) {
          const svg = actionBtn.querySelector("svg");
          if (svg) svg.style.display = "none";

          const img = document.createElement("img");
          img.src = user.image;
          img.alt = firstName;
          img.className = "profile-avatar";
          img.style.cssText =
            "width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #ccc;";
          img.onerror = function () {
            this.style.display = "none";
            if (svg) svg.style.display = "";
          };
          const mobileLabel = actionBtn.querySelector(".mobile-label");
          if (mobileLabel) {
            actionBtn.insertBefore(img, mobileLabel);
          } else {
            actionBtn.appendChild(img);
          }
        }
      }

      // ✅ Update list only
      const list = wrap.querySelector(".dropdownitem-list");
      if (list) {
        list.innerHTML = `
          <li style="padding:10px 16px;font-weight:600;border-bottom:1px solid #eee;cursor:default;">
            Hi, ${firstName} 👋
          </li>
          <li><a href="profile1.html">My Profile</a></li>
          <li><a href="track-order.html">Track Order</a></li>
          <li><a href="#" id="logout-btn" style="color:red;">Logout</a></li>
        `;

        document
          .getElementById("logout-btn")
          ?.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
          });
      }
    })
    .catch(() => {
      const list = wrap.querySelector(".dropdownitem-list");
      if (list) {
        list.innerHTML = `
          <li><a href="login.html">Login</a></li>
          <li><a href="register.html">Register</a></li>
        `;
      }
    });
})();

// Mobile My Orders — token check
const ordersLink = document.getElementById("mobile-orders-link");
if (ordersLink) {
  const token = localStorage.getItem("token");
  if (!token) {
    ordersLink.href = "login.html";
  } else {
    ordersLink.href = "profile1.html?tab=orders";
  }
}
