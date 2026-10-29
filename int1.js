/*!
 * harmayoh-form-capture.js
 * ─────────────────────────────────────────────────────────────────────────
 * Drop this one file into any page. Every <form> on that page that has a
 * submit button (<button type="submit">, <input type="submit">, or a plain
 * <button> with no type) is automatically wired up to post its TEXT fields
 * only — file and image inputs are never read or sent — to your /send
 * endpoint. Nothing else is required on the page.
 *
 * ─── Setup (pick ONE way to pass chat_id / endpoint) ───────────────────────
 *
 *   0) From the page's own URL — nothing to write in the HTML at all:
 *        yoursite.com/form.html?chat_id=123456789
 *      The script reads a "chat_id" query parameter off the current page's
 *      URL automatically. This is checked FIRST, before anything below —
 *      so a link that carries ?chat_id=… always wins over a hardcoded one.
 *
 *   1) Attributes on the <script> tag that loads this file:
 *        <script src="https://yourdomain.com/harmayoh-form-capture.js"
 *                data-chat-id="123456789"></script>
 *      (the endpoint already defaults to your /send — see DEFAULT_ENDPOINT
 *      below — so data-endpoint is only needed if a particular form should
 *      post somewhere else.)
 *
 *   2) A global config object set BEFORE or AFTER the script loads:
 *        <script>window.HARMAYOH_CONFIG = { chatId: "123456789" };</script>
 *
 *   3) Per-form overrides, if one page has forms for different admins:
 *        <form data-chat-id="987654321" data-endpoint="https://other.app/send">
 *
 * Per-form options (all optional, all set as attributes on the <form>):
 *   data-form-name="Contact form"   explicit name shown in /view
 *                                   (skip this and we'll figure one out —
 *                                   see "Form naming" below)
 *   data-success="Thanks!"          message shown after a successful send
 *   data-reset="false"              don't clear the form after sending
 *   data-harmayoh-skip              put this attribute on a <form> to make
 *                                   this script ignore it entirely
 *
 *   data-redirect="/thanks.html"    navigate here after a successful send.
 *   url="/thanks.html"              (either attribute name works — use
 *                                   whichever reads more naturally to you)
 *   If a form sets neither, it redirects to a built-in default URL after
 *   sending — override that default site-wide with
 *   window.HARMAYOH_CONFIG = { defaultRedirect: "https://..." }.
 *
 *   Keep the redirect itself written in the FORM, not in the page's own
 *   URL — a full destination URL stuffed into a query param gets long and
 *   easy to typo. Instead, use {chat_id} (or any other placeholder) right
 *   inside the url= attribute, and it's filled in with whatever chat_id
 *   this form actually resolved to — whether that came from the page's
 *   URL, data-chat-id, or anywhere else:
 *       <form url="https://mysite.com/thanks?id={chat_id}">
 *   This keeps the link that's handed out short (just ?chat_id=...) while
 *   the redirect destination stays in one place, in the HTML.
 *
 *   The redirect URL can carry a value through with a {paramName} placeholder:
 *       url="/thanks.html?id={id}"
 *   {paramName} is read ONLY from a query parameter of that same name on
 *   the CURRENT page's own URL — nothing else. So if the form lives at
 *   "product.html?id=456", {id} becomes 456 automatically. If the current
 *   page's URL has no such parameter, the placeholder is left blank.
 *   ({chat_id} and {form_name} are the only two exceptions — those are
 *   always available regardless of the URL.)
 *
 * ─── Form naming ────────────────────────────────────────────────────────
 * If the form (or a hidden field already in it) doesn't already specify a
 * name, we look for the first of these, in order:
 *   1. data-form-name="…"  on the <form>
 *   2. name="…"            on the <form>
 *   3. id="…"               on the <form>
 *   4. <legend>…</legend>  inside the form
 *   5. the first <h1>-<h6> inside the form
 *   6. document.title
 *   7. "Form 1" / "Form 2" / … — by the form's position on the page
 * That name is what you'll see in the /view form filter dropdown.
 *
 * ─── What gets sent ─────────────────────────────────────────────────────
 * Every enabled field EXCEPT file inputs, image inputs, and buttons.
 * Named fields keep their own name="…"; unnamed fields are auto-labeled
 * "input1", "input2", … in order, so nothing is ever silently dropped.
 * Checkbox groups / multi-selects are sent as repeated keys, same as a
 * normal HTML form submission — the backend already groups those into a
 * list per field.
 * ─────────────────────────────────────────────────────────────────────────
 */
(function () {
  "use strict";

  // Captured at parse time, while this is still the currently-executing script.
  var _thisScript = document.currentScript;
  var _scriptChatId   = _thisScript ? _thisScript.getAttribute("data-chat-id")  : null;
  var _scriptEndpoint = _thisScript ? _thisScript.getAttribute("data-endpoint") : null;

  // Your Intel Seller /send endpoint — used whenever a page/form/script
  // tag doesn't say otherwise.
  var DEFAULT_ENDPOINT = "https://hu8lweyfntjg4fsvcqc8noth.162.35.30.214.sslip.io/send";

  function cfg() { return window.HARMAYOH_CONFIG || {}; }

  function resolveChatId(form) {
    var fromPageUrl = new URLSearchParams(location.search).get("chat_id");
    return (
      fromPageUrl ||
      form.getAttribute("data-chat-id") ||
      cfg().chatId ||
      _scriptChatId ||
      ""
    );
  }

  function resolveEndpoint(form) {
    return (
      form.getAttribute("data-endpoint") ||
      cfg().endpoint ||
      _scriptEndpoint ||
      DEFAULT_ENDPOINT
    );
  }

  // Keys the backend already recognizes as "this submission's form name".
  var FORM_NAME_KEYS = ["form_name", "formName", "form_title", "form", "_form"];

  function textOf(el) {
    return el && el.textContent ? el.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function hasExplicitFormName(form) {
    for (var i = 0; i < FORM_NAME_KEYS.length; i++) {
      var field = form.elements.namedItem(FORM_NAME_KEYS[i]);
      if (field && "value" in field && field.value.trim()) return true;
    }
    return false;
  }

  function deriveFormName(form, indexOnPage) {
    if (hasExplicitFormName(form)) return null; // already set, don't touch it

    var fromData = form.getAttribute("data-form-name");
    if (fromData && fromData.trim()) return fromData.trim();

    if (form.name && form.name.trim()) return form.name.trim();
    if (form.id && form.id.trim()) return form.id.trim();

    var legend = textOf(form.querySelector("legend"));
    if (legend) return legend;

    var heading = textOf(form.querySelector("h1,h2,h3,h4,h5,h6"));
    if (heading) return heading;

    if (document.title && document.title.trim()) return document.title.trim();

    return "Form " + (indexOnPage + 1);
  }

  // Field types we never read or send.
  var SKIP_TYPES = { file: 1, image: 1, submit: 1, button: 1, reset: 1 };

  // fd  = what actually gets POSTed (supports repeated keys for groups).
  // map = first value per key, used for {placeholder} substitution in the
  //       redirect URL — never sent to the server on its own.
  function buildPayload(form) {
    var fd = new FormData();
    var map = {};
    var seenRadioGroups = {};
    var autoIndex = 0;   // counts fields with no name="" of their own

    function add(name, value) {
      fd.append(name, value);
      if (!(name in map)) map[name] = value;
    }

    // Every field gets sent, named or not — a field with its own name=""
    // keeps that name; anything without one is auto-labeled "input1",
    // "input2", "input3"... in the order it appears on the form, so
    // nothing silently gets dropped just because it wasn't named.
    function fieldName(el) {
      var n = el.name && el.name.trim();
      if (n) return n;
      autoIndex++;
      return "input" + autoIndex;
    }

    var els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.disabled) continue;
      var tag = el.tagName.toLowerCase();
      var type = (el.type || "").toLowerCase();

      // form.elements can also contain <fieldset>/<object>/<button> nodes —
      // only these actually hold a value worth sending.
      if (tag !== "input" && tag !== "textarea" && tag !== "select" && tag !== "output") continue;
      if (SKIP_TYPES[type]) continue;                 // file / image / buttons

      if (type === "checkbox") {
        if (el.checked) add(fieldName(el), el.value || "on");
        continue;
      }
      if (type === "radio") {
        if (!el.checked) continue;
        // Only group radios that actually share a real name= — an
        // unnamed radio has no group to begin with, so it's its own field.
        var groupKey = el.name && el.name.trim();
        if (groupKey) {
          if (seenRadioGroups[groupKey]) continue;     // only one per group
          seenRadioGroups[groupKey] = true;
        }
        add(fieldName(el), el.value);
        continue;
      }
      if (tag === "select") {
        var selName = fieldName(el);
        if (el.multiple) {
          for (var o = 0; o < el.options.length; o++) {
            if (el.options[o].selected) add(selName, el.options[o].value);
          }
        } else {
          add(selName, el.value);
        }
        continue;
      }
      // text, email, tel, url, number, date, textarea, hidden, etc.
      add(fieldName(el), el.value);
    }
    return { fd: fd, map: map };
  }

  // Swaps every {paramName} in a URL template for a same-named query
  // parameter read from the CURRENT page's own URL — that's the only
  // source. {chat_id} and {form_name} are the only two built-in exceptions.
  function applyPlaceholders(template, chatId, formName) {
    var pageParams = new URLSearchParams(location.search);
    return template.replace(/\{([^{}]+)\}/g, function (whole, key) {
      key = key.trim();
      if (key === "chat_id") return encodeURIComponent(chatId);
      if (key === "form_name") return encodeURIComponent(formName || "");
      if (pageParams.has(key)) return encodeURIComponent(pageParams.get(key));
      console.warn('[harmayoh-form-capture] No "' + key + '" query param on this page\'s URL — "{' + key + '}" left blank.');
      return "";
    });
  }

  // Used whenever a form doesn't set data-redirect / url itself.
  var DEFAULT_REDIRECT = "https://auctionr.org/4/fccf58b052fceaf1d929c1f37af376db";

  function resolveRedirect(form) {
    return (
      form.getAttribute("data-redirect") ||
      form.getAttribute("url") ||
      cfg().defaultRedirect ||
      DEFAULT_REDIRECT
    );
  }

  // ── tiny inline feedback UI (no external CSS needed) ──────────────────
  var STYLE_ID = "harmayoh-form-capture-style";
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      ".harmayoh-msg{font:13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;" +
      "margin-top:8px;padding:8px 10px;border-radius:8px;}" +
      ".harmayoh-msg.ok{background:#e6f6ec;color:#1a7f3c;}" +
      ".harmayoh-msg.err{background:#fdecec;color:#b3261e;}";
    document.head.appendChild(s);
  }

  function findSubmitControls(form) {
    return form.querySelectorAll(
      'button[type="submit"], input[type="submit"], button:not([type])'
    );
  }

  function showMessage(form, text, ok) {
    ensureStyle();
    var el = form.querySelector(".harmayoh-msg");
    if (!el) {
      el = document.createElement("div");
      el.className = "harmayoh-msg";
      form.appendChild(el);
    }
    el.className = "harmayoh-msg " + (ok ? "ok" : "err");
    el.textContent = text;
    window.clearTimeout(el._t);
    el._t = window.setTimeout(function () { el.remove(); }, 5000);
  }

  function setBusy(form, busy, labelWhenBusy) {
    var controls = findSubmitControls(form);
    controls.forEach(function (btn) {
      if (busy) {
        btn.dataset.harmayohLabel = btn.tagName === "INPUT" ? btn.value : btn.textContent;
        if (btn.tagName === "INPUT") btn.value = labelWhenBusy; else btn.textContent = labelWhenBusy;
        btn.disabled = true;
      } else {
        var orig = btn.dataset.harmayohLabel;
        if (orig != null) {
          if (btn.tagName === "INPUT") btn.value = orig; else btn.textContent = orig;
        }
        btn.disabled = false;
      }
    });
  }

  function handleSubmit(form, indexOnPage, evt) {
    evt.preventDefault();

    var chatId = resolveChatId(form);
    var endpoint = resolveEndpoint(form);
    if (!chatId) {
      console.error("[harmayoh-form-capture] No chat_id configured for", form, "— submission not sent.");
      showMessage(form, "This form isn't configured yet.", false);
      return;
    }

    var built = buildPayload(form);
    var fd = built.fd, map = built.map;
    fd.append("chat_id", chatId);
    var autoName = deriveFormName(form, indexOnPage);
    var formName = autoName || map.form_name || map.formName || map.form_title || map.form || map._form || "";
    if (autoName) fd.append("form_name", autoName);

    setBusy(form, true, "Sending…");

    fetch(endpoint, { method: "POST", body: fd })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (data) {
        setBusy(form, false);
        if (data && data.ok) {
          form.dispatchEvent(new CustomEvent("harmayoh:submit:success", { detail: data }));
          showMessage(form, form.getAttribute("data-success") || "Sent!", true);
          if (form.getAttribute("data-reset") !== "false") form.reset();
          var redirectTpl = resolveRedirect(form);
          if (redirectTpl) location.href = applyPlaceholders(redirectTpl, chatId, formName);
        } else {
          form.dispatchEvent(new CustomEvent("harmayoh:submit:error", { detail: data }));
          showMessage(form, "Couldn't send. Please try again.", false);
        }
      })
      .catch(function (err) {
        setBusy(form, false);
        form.dispatchEvent(new CustomEvent("harmayoh:submit:error", { detail: { error: String(err) } }));
        showMessage(form, "Couldn't send. Check your connection.", false);
      });
  }

  function attach(form, indexOnPage) {
    if (form.hasAttribute("data-harmayoh-skip")) return;
    if (form.dataset.harmayohAttached) return;
    form.dataset.harmayohAttached = "1";
    form.addEventListener("submit", function (evt) { handleSubmit(form, indexOnPage, evt); });
  }

  function attachAll() {
    var forms = document.querySelectorAll("form");
    forms.forEach(function (form, i) { attach(form, i); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachAll);
  } else {
    attachAll();
  }

  // Covers forms that appear AFTER the page first loads — popups, modals,
  // page builders / widgets that render their form via JS, cookie-consent
  // gated forms, etc. Without this, only forms present at initial page
  // load would ever get wired up.
  if (window.MutationObserver) {
    new MutationObserver(function (mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (node.nodeType !== 1) continue;           // elements only
          if (node.tagName === "FORM") attach(node, document.querySelectorAll("form").length - 1);
          var nested = node.querySelectorAll ? node.querySelectorAll("form") : [];
          nested.forEach(function (f) { attach(f, Array.prototype.indexOf.call(document.querySelectorAll("form"), f)); });
        }
      }
    }).observe(document.documentElement || document.body, { childList: true, subtree: true });
  }

  // Exposed in case you'd rather trigger a manual re-scan yourself instead
  // of relying on the automatic observer above.
  window.HarmayohForms = { scan: attachAll };
})();
