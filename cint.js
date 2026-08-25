/*!
 * psend-widget.js
 * ─────────────────────────────────────────────────────────────
 * Works with ANY normal HTML <form> on your page — a <button
 * type="submit">, an <input type="submit">, or pressing Enter in
 * a field all trigger the browser's native form submit, which
 * this script listens for. Multi-step forms work too, as long as
 * it's all one <form> tag.
 *
 * ── SETUP ───────────────────────────────────────────────────────
 * 1. Put your chat_id in the page URL:  ?id=123456789
 *      e.g. https://yoursite.com/contact?id=123456789
 * 2. Add this line before </body>:
 *      <script src="https://web-production-dd84e.up.railway.app/static/psend-widget.js"></script>
 * 3. Build your form normally:
 *      <form>
 *        <input name="name">
 *        <input name="email">
 *        <textarea name="message"></textarea>
 *        <button type="submit">Submit</button>
 *      </form>
 *    Every named field gets collected and sent automatically.
 *
 * ── OPTIONAL SCRIPT-TAG ATTRIBUTES ───────────────────────────────
 *   data-chat-id      — override chat_id instead of reading ?id=
 *   data-api-base     — override the backend URL (default hardcoded below)
 *   data-success-url  — redirect target after a successful send (default "/success.html")
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  "use strict";

  // ── EDIT THIS if your backend lives somewhere else ─────────────
  var DEFAULT_API_BASE = "https://web-production-dd84e.up.railway.app";

  var CUR_SCRIPT = document.currentScript;
  if (!CUR_SCRIPT) {
    var scripts = document.getElementsByTagName("script");
    CUR_SCRIPT = scripts[scripts.length - 1];
  }

  function getIdFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw = params.get("id");
      if (raw && /^\d+(_\d+)?$/.test(raw.trim())) return raw.trim();
    } catch (e) {}
    return null;
  }

  var CHAT_ID = getIdFromUrl() || CUR_SCRIPT.getAttribute("data-chat-id");
  if (!CHAT_ID) return; // no ?id= on this page — nothing to send to

  var API_BASE    = (CUR_SCRIPT.getAttribute("data-api-base") || DEFAULT_API_BASE).replace(/\/+$/, "");
  var SEND_URL    = API_BASE + "/psend";
  var SUCCESS_URL = CUR_SCRIPT.getAttribute("data-success-url") || "/success.html";

  // ── toast for errors / success ──────────────────────────────────
  var toastEl = null;
  function toast(msg, kind) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText =
        "position:fixed;top:16px;left:50%;transform:translateX(-50%);" +
        "max-width:90vw;padding:12px 18px;border-radius:10px;font:14px/1.4 " +
        "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
        "box-shadow:0 6px 20px rgba(0,0,0,.2);z-index:2147483647;text-align:center;";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent  = msg;
    toastEl.style.background = kind === "err" ? "#fdeaea" : "#e9f9ef";
    toastEl.style.color      = kind === "err" ? "#b02a2a" : "#146c3f";
    toastEl.style.border     = "1px solid " + (kind === "err" ? "#f3c2c2" : "#bfe8cf");
    toastEl.style.display    = "block";
    clearTimeout(toastEl._hideTimer);
    toastEl._hideTimer = setTimeout(function () { toastEl.style.display = "none"; }, 4000);
  }

  // ── listen for any real form submit on the page ──────────────────
  document.addEventListener(
    "submit",
    function (e) {
      var form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      e.preventDefault(); // stop normal page navigation/reload

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      var fd = new FormData(form);
      fd.append("chat_id", CHAT_ID);

      fetch(SEND_URL, { method: "POST", body: fd })
        .then(function (res) {
          return res
            .json()
            .catch(function () { return null; })
            .then(function (data) { return { status: res.status, data: data }; });
        })
        .then(function (result) {
          if (result.data && result.data.ok) {
            toast("Message sent ✔", "ok");
            form.reset();
            setTimeout(function () { window.location.href = SUCCESS_URL; }, 1200);
          } else if (result.status === 403 && result.data && result.data.error === "admin_not_premium") {
            toast("This admin needs to renew premium before they can receive new messages here.", "err");
          } else {
            toast((result.data && result.data.message) || "Something went wrong. Please try again.", "err");
          }
        })
        .catch(function () {
          toast("Network error — please try again.", "err");
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    },
    true
  );
})();
