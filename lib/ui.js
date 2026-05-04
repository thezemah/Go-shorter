// Shared UI primitives: SVG icons, favicons, toasts, modal, time formatting.

const SVG_ATTRS = `width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

const ICONS = {
  logo: `<svg ${SVG_ATTRS} stroke-width="3"><path d="M9 6l5 6-5 6"/><path d="M7 20h10" stroke-width="2.5"/></svg>`,
  search: `<svg ${SVG_ATTRS} stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  plus: `<svg ${SVG_ATTRS} stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>`,
  external: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>`,
  copy: `<svg ${SVG_ATTRS} stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
  edit: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  trash: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>`,
  check: `<svg ${SVG_ATTRS} stroke-width="2.4"><path d="m4 12 6 6L20 6"/></svg>`,
  close: `<svg ${SVG_ATTRS} stroke-width="2.2"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
  download: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`,
  upload: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></svg>`,
  link: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66L11 7"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66L13 17"/></svg>`,
  arrow: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
  sparkle: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>`,
  bolt: `<svg ${SVG_ATTRS} stroke-width="2"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>`,
};

function icon(name) {
  return ICONS[name] || "";
}

function setIcon(el, name) {
  if (el) el.innerHTML = icon(name);
}

function injectIcons(root = document) {
  for (const el of root.querySelectorAll("[data-icon]")) {
    el.innerHTML = icon(el.dataset.icon);
  }
}

// Best-effort favicon URL using Chrome's _favicon API (requires "favicon" perm).
// Falls back to a first-letter avatar via the caller (faviconElement).
function faviconUrl(targetUrl, size = 32) {
  try {
    const u = new URL(targetUrl);
    const params = new URLSearchParams({ pageUrl: u.origin, size: String(size) });
    return chrome.runtime.getURL("/_favicon/?" + params.toString());
  } catch {
    return null;
  }
}

function faviconElement(targetUrl, fallbackText = "") {
  const wrap = document.createElement("div");
  wrap.className = "favicon";
  const url = faviconUrl(targetUrl, 32);
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => renderFallback());
    wrap.appendChild(img);
  } else {
    renderFallback();
  }
  function renderFallback() {
    wrap.innerHTML = "";
    const span = document.createElement("span");
    span.className = "fallback";
    span.textContent = (fallbackText || "?").charAt(0).toUpperCase();
    wrap.appendChild(span);
  }
  return wrap;
}

// Toasts
let toastHost = null;
function ensureToastHost() {
  if (!toastHost) {
    toastHost = document.createElement("div");
    toastHost.className = "toast-host";
    document.body.appendChild(toastHost);
  }
  return toastHost;
}
function toast(message, opts = {}) {
  const host = ensureToastHost();
  const el = document.createElement("div");
  el.className = "toast" + (opts.error ? " error" : "");
  if (opts.icon) {
    const ic = document.createElement("span");
    ic.className = "icon";
    ic.innerHTML = icon(opts.icon);
    el.appendChild(ic);
  }
  const text = document.createElement("span");
  text.textContent = message;
  el.appendChild(text);
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 200ms, transform 200ms";
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 220);
  }, opts.duration || 2200);
}

// Confirmation modal — returns Promise<boolean>
function confirmModal({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2></h2>
        <div class="modal-body"></div>
        <div class="modal-actions">
          <button type="button" class="btn" data-action="cancel"></button>
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-action="confirm"></button>
        </div>
      </div>
    `;
    backdrop.querySelector("h2").textContent = title;
    backdrop.querySelector(".modal-body").textContent = message;
    backdrop.querySelector('[data-action="cancel"]').textContent = cancelLabel;
    const confirmBtn = backdrop.querySelector('[data-action="confirm"]');
    confirmBtn.textContent = confirmLabel;

    function close(result) {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      resolve(result);
    }
    function onKey(e) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close(false);
    });
    backdrop.querySelector('[data-action="cancel"]').addEventListener("click", () => close(false));
    confirmBtn.addEventListener("click", () => close(true));

    document.body.appendChild(backdrop);
    document.addEventListener("keydown", onKey);
    setTimeout(() => confirmBtn.focus(), 0);
  });
}

function relativeTime(ts) {
  if (!ts) return "—";
  const diff = (Date.now() - ts) / 1000;
  if (diff < 30) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const UI = { icon, setIcon, injectIcons, faviconUrl, faviconElement, toast, confirmModal, relativeTime };
if (typeof self !== "undefined") self.UI = UI;
