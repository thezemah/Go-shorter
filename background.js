// Service worker: omnibox handler + go/<name> navigation interceptor.
importScripts("lib/storage.js");

const OMNIBOX_DEFAULT = "Type a go-link name (e.g. gh). Enter to open; unknown names open the add form.";

chrome.runtime.onInstalled.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: OMNIBOX_DEFAULT });
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const query = Storage.normalizeName(text);
  const all = await Storage.getAll();
  const names = Object.keys(all).sort();
  const matches = (query
    ? names.filter((n) => n.includes(query) || all[n].url.toLowerCase().includes(query))
    : names
  ).slice(0, 8);
  suggest(
    matches.map((name) => ({
      content: name,
      description: `go/${escapeXml(name)} → ${escapeXml(all[name].url)}`,
    })),
  );
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const name = Storage.normalizeName(text);
  if (!name) return;
  const entry = await Storage.get(name);
  if (entry) {
    await Storage.recordHit(name);
    openUrl(entry.url, disposition);
  } else {
    openUrl(addUrl(name), disposition);
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    let parsed;
    try {
      parsed = new URL(details.url);
    } catch {
      return;
    }
    if (parsed.hostname !== "go") return;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      // Bare http://go/ — open manage page.
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("manage.html") });
      return;
    }
    const name = Storage.normalizeName(decodeURIComponent(segments[0]));
    const entry = name ? await Storage.get(name) : null;
    if (entry) {
      await Storage.recordHit(name);
      chrome.tabs.update(details.tabId, { url: entry.url });
    } else {
      chrome.tabs.update(details.tabId, { url: addUrl(name) });
    }
  },
  { url: [{ hostEquals: "go" }] },
);

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
