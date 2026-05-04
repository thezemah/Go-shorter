// Service worker: omnibox handler + go/<name> resolver across navigations.
//
// We resolve "go/<name>" without requiring any hosts-file or DNS changes.
// Two paths get intercepted in chrome.webNavigation.onBeforeNavigate:
//   1) Direct: http://go/<name> (only fires if the user has DNS for `go` —
//      kept as belt-and-suspenders, no host_permissions required).
//   2) Search redirect: when Chrome turns the omnibox text "go/<name>" into
//      a query for the default search engine, the navigation goes to a URL
//      like https://www.google.com/search?q=go%2Ffoo. We pull the query
//      param out and treat it the same way.
//
// An in-memory cache of the shortlinks map keeps the listener fast enough
// that we redirect before the search page paints.

importScripts("lib/storage.js");

const OMNIBOX_DEFAULT =
  "Type a go-link name (e.g. gh). Enter to open; unknown names open the add form.";

const SEARCH_PARAM_NAMES = ["q", "query", "p", "text", "wd"];
const GO_QUERY_PATTERN = /^\s*go\/([a-z0-9][a-z0-9._-]*)\/?\s*$/i;

let linkCache = {};
let cacheReady = primeCache();

async function primeCache() {
  linkCache = await Storage.getAll();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[Storage.STORAGE_KEY]) {
    linkCache = changes[Storage.STORAGE_KEY].newValue || {};
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: OMNIBOX_DEFAULT });
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  await cacheReady;
  const query = Storage.normalizeName(text);
  const names = Object.keys(linkCache).sort();
  const matches = (query
    ? names.filter((n) => n.includes(query) || linkCache[n].url.toLowerCase().includes(query))
    : names
  ).slice(0, 8);
  suggest(
    matches.map((name) => ({
      content: name,
      description: `go/${escapeXml(name)} → ${escapeXml(linkCache[name].url)}`,
    })),
  );
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  await cacheReady;
  const name = Storage.normalizeName(text);
  if (!name) return;
  const entry = linkCache[name];
  if (entry) {
    Storage.recordHit(name);
    openUrl(entry.url, disposition);
  } else {
    openUrl(addUrl(name), disposition);
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const target = resolveNavigation(details.url);
  if (!target) return;
  chrome.tabs.update(details.tabId, { url: target.url });
  if (target.hit) Storage.recordHit(target.hit);
});

function resolveNavigation(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // Don't recurse on our own extension pages.
  if (url.protocol === "chrome-extension:") return null;

  // (1) Direct host: http://go/<name> (rare without DNS; cheap to check).
  if (url.hostname === "go") {
    const segs = url.pathname.split("/").filter(Boolean);
    if (segs.length === 0) {
      return { url: chrome.runtime.getURL("manage.html") };
    }
    return resolveName(decodeURIComponent(segs[0]));
  }

  // (2) Search-engine redirect: any navigation whose query carries "go/<name>".
  for (const param of SEARCH_PARAM_NAMES) {
    const value = url.searchParams.get(param);
    if (!value) continue;
    const match = GO_QUERY_PATTERN.exec(value);
    if (match) return resolveName(match[1]);
  }
  return null;
}

function resolveName(rawName) {
  const name = Storage.normalizeName(rawName || "");
  if (!name) return null;
  const entry = linkCache[name];
  if (entry) return { url: entry.url, hit: name };
  return { url: addUrl(name) };
}

function addUrl(name) {
  const base = chrome.runtime.getURL("add.html");
  return name ? `${base}?name=${encodeURIComponent(name)}` : base;
}

function openUrl(url, disposition) {
  if (disposition === "newForegroundTab") {
    chrome.tabs.create({ url, active: true });
  } else if (disposition === "newBackgroundTab") {
    chrome.tabs.create({ url, active: false });
  } else {
    chrome.tabs.update({ url });
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
