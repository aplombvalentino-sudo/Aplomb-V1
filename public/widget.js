/**
 * Aplomb Widget Loader
 *
 * Include this script on your product page:
 *   <script src="https://your-aplomb-domain.com/widget.js"
 *           data-brand="your-brand-slug"
 *           data-product="{{product.id}}"
 *           async></script>
 *
 * The widget opens as a modal overlay on the current page.
 */
(function () {
  "use strict";

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var brandSlug = script.getAttribute("data-brand");
  var productId = script.getAttribute("data-product") || "";
  var baseUrl = script.src.replace("/widget.js", "");

  // The iframe is served from the Aplomb origin; only trust postMessages from it.
  var aplombOrigin = (function () {
    try {
      return new URL(baseUrl).origin;
    } catch (_) {
      return null;
    }
  })();

  if (!brandSlug) {
    console.warn("[Aplomb] Missing data-brand attribute on widget script.");
    return;
  }

  // Build the widget URL
  var widgetUrl =
    baseUrl +
    "/widget?brand=" +
    encodeURIComponent(brandSlug) +
    (productId ? "&product=" + encodeURIComponent(productId) : "");

  // Inject a stylesheet for the trigger button so brand sites can override it
  // with their own CSS (the inline-style approach couldn't be overridden).
  // Brands can restyle by targeting [data-aplomb="trigger"] or override the
  // CSS custom properties --aplomb-bg / --aplomb-fg / --aplomb-radius, e.g.:
  //
  //   [data-aplomb="trigger"] {
  //     --aplomb-bg: #1d4ed8;
  //     --aplomb-radius: 999px;
  //     bottom: 16px; right: 16px;
  //   }
  //
  // Respects prefers-reduced-motion and includes a visible focus ring.
  function injectStyles() {
    if (document.getElementById("aplomb-styles")) return;
    var css = [
      "[data-aplomb='trigger']{",
      "  --aplomb-bg:#111010;",
      "  --aplomb-fg:#ffffff;",
      "  --aplomb-radius:10px;",
      "  position:fixed;bottom:24px;right:24px;z-index:9998;",
      "  background:var(--aplomb-bg);color:var(--aplomb-fg);",
      "  border:none;border-radius:var(--aplomb-radius);",
      "  padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;",
      "  box-shadow:0 4px 12px rgba(0,0,0,0.2);",
      "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;",
      "  transition:transform .2s ease, box-shadow .2s ease, opacity .2s ease;",
      "}",
      "[data-aplomb='trigger']:hover{",
      "  box-shadow:0 6px 20px rgba(0,0,0,0.28);transform:translateY(-1px);",
      "}",
      "[data-aplomb='trigger']:active{transform:translateY(0);}",
      "[data-aplomb='trigger']:focus-visible{",
      "  outline:2px solid var(--aplomb-fg);outline-offset:2px;",
      "}",
      "@media (prefers-reduced-motion: reduce){",
      "  [data-aplomb='trigger']{transition:none;}",
      "  [data-aplomb='trigger']:hover{transform:none;}",
      "}",
    ].join("");
    var style = document.createElement("style");
    style.id = "aplomb-styles";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  // Create trigger button
  function createTriggerButton() {
    injectStyles();
    var btn = document.createElement("button");
    btn.id = "aplomb-trigger";
    btn.type = "button";
    btn.innerText = "Find my size & outfit";
    btn.setAttribute("data-aplomb", "trigger");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.addEventListener("click", openWidget);
    document.body.appendChild(btn);
    return btn;
  }

  // Create modal overlay
  function createModal() {
    var overlay = document.createElement("div");
    overlay.id = "aplomb-overlay";
    overlay.setAttribute(
      "style",
      [
        "position:fixed",
        "inset:0",
        "z-index:9999",
        "background:rgba(0,0,0,0.5)",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:16px",
      ].join(";")
    );

    var container = document.createElement("div");
    container.setAttribute(
      "style",
      [
        "width:100%",
        "max-width:420px",
        "height:90vh",
        "max-height:700px",
        "border-radius:16px",
        "overflow:hidden",
        "position:relative",
        "background:#fff",
        "box-shadow:0 20px 60px rgba(0,0,0,0.3)",
      ].join(";")
    );

    var closeBtn = document.createElement("button");
    closeBtn.innerText = "×";
    closeBtn.setAttribute(
      "style",
      [
        "position:absolute",
        "top:8px",
        "right:12px",
        "z-index:10",
        "background:rgba(255,255,255,0.9)",
        "border:none",
        "border-radius:50%",
        "width:28px",
        "height:28px",
        "font-size:18px",
        "cursor:pointer",
        "line-height:1",
        "display:flex",
        "align-items:center",
        "justify-content:center",
      ].join(";")
    );
    closeBtn.addEventListener("click", closeWidget);

    var iframe = document.createElement("iframe");
    iframe.src = widgetUrl;
    iframe.setAttribute(
      "style",
      "width:100%;height:100%;border:none;display:block;"
    );
    iframe.setAttribute("title", "Aplomb Fit & Style");
    iframe.setAttribute("allow", "camera");

    container.appendChild(closeBtn);
    container.appendChild(iframe);
    overlay.appendChild(container);

    // Close on overlay click
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeWidget();
    });

    return overlay;
  }

  var modal = null;

  function openWidget() {
    if (!modal) modal = createModal();
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
  }

  function closeWidget() {
    if (modal) {
      document.body.removeChild(modal);
      modal = null;
      document.body.style.overflow = "";
    }
  }

  // Listen for close message from iframe — only from the Aplomb origin.
  window.addEventListener("message", function (e) {
    if (aplombOrigin && e.origin !== aplombOrigin) return;
    if (e.data && e.data.type === "aplomb:close") closeWidget();
  });

  // Initialise on DOMContentLoaded or immediately if already loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createTriggerButton);
  } else {
    createTriggerButton();
  }
})();
