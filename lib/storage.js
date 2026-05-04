// Shared storage helpers for Go-shorter.
// Loaded as a classic script in popup/manage/add pages, and via importScripts in the service worker.

const STORAGE_KEY = "shortlinks";

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

function normalizeName(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

function isValidName(name) {
  return NAME_PATTERN.test(name);
}

function isValidUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function getAll() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

async function get(name) {
  const all = await getAll();
  return all[normalizeName(name)] || null;
}

async function set(name, url) {
  const cleanName = normalizeName(name);
  const cleanUrl = typeof url === "string" ? url.trim() : "";
  if (!isValidName(cleanName)) {
    throw new Error("Name must use letters, numbers, '.', '_', or '-' (e.g. 'gh', 'team-wiki').");
  }
  if (!isValidUrl(cleanUrl)) {
    throw new Error("URL must be a valid http(s) address.");
  }
  const all = await getAll();
  const existing = all[cleanName];
  all[cleanName] = {
    url: cleanUrl,
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now(),
    hits: existing ? existing.hits : 0,
    lastUsed: existing ? existing.lastUsed : null,
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: all });
  return all[cleanName];
}

async function remove(name) {
  const cleanName = normalizeName(name);
  const all = await getAll();
  if (!(cleanName in all)) return false;
  delete all[cleanName];
  await chrome.storage.local.set({ [STORAGE_KEY]: all });
  return true;
}

async function rename(oldName, newName) {
  const oldClean = normalizeName(oldName);
  const newClean = normalizeName(newName);
  if (oldClean === newClean) return;
  if (!isValidName(newClean)) {
    throw new Error("Name must use letters, numbers, '.', '_', or '-'.");
  }
  const all = await getAll();
  if (!(oldClean in all)) throw new Error(`No shortlink named "${oldClean}".`);
  if (newClean in all) throw new Error(`A shortlink named "${newClean}" already exists.`);
  all[newClean] = all[oldClean];
  delete all[oldClean];
  await chrome.storage.local.set({ [STORAGE_KEY]: all });
}

async function recordHit(name) {
  const cleanName = normalizeName(name);
  const all = await getAll();
  if (!all[cleanName]) return;
  all[cleanName].hits = (all[cleanName].hits || 0) + 1;
  all[cleanName].lastUsed = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEY]: all });
}

async function replaceAll(obj) {
  if (!obj || typeof obj !== "object") throw new Error("Import payload must be an object.");
  const sanitized = {};
  for (const [rawName, rawEntry] of Object.entries(obj)) {
    const name = normalizeName(rawName);
    if (!isValidName(name)) continue;
    const url = rawEntry && typeof rawEntry === "object" ? rawEntry.url : null;
    if (!isValidUrl(url)) continue;
    sanitized[name] = {
      url: url.trim(),
      createdAt: Number(rawEntry.createdAt) || Date.now(),
      updatedAt: Number(rawEntry.updatedAt) || Date.now(),
      hits: Number(rawEntry.hits) || 0,
      lastUsed: rawEntry.lastUsed ? Number(rawEntry.lastUsed) : null,
    };
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: sanitized });
  return sanitized;
}

const Storage = {
  STORAGE_KEY,
  normalizeName,
  isValidName,
  isValidUrl,
  getAll,
  get,
  set,
  remove,
  rename,
  recordHit,
  replaceAll,
};

if (typeof self !== "undefined") {
  self.Storage = Storage;
}
