UI.injectIcons();

const listEl = document.getElementById("links-list");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");
const addFormEl = document.getElementById("add-form");
const addNameEl = document.getElementById("add-name");
const addUrlEl = document.getElementById("add-url");
const addErrorEl = document.getElementById("add-error");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");

const statTotal = document.getElementById("stat-total");
const statHits = document.getElementById("stat-hits");
const statTop = document.getElementById("stat-top");
const statRecent = document.getElementById("stat-recent");

let allLinks = {};

async function refresh() {
  allLinks = await Storage.getAll();
  renderStats();
  render();
}

function renderStats() {
  const entries = Object.entries(allLinks);
  statTotal.textContent = String(entries.length);
  const totalHits = entries.reduce((s, [, e]) => s + (e.hits || 0), 0);
  statHits.textContent = totalHits.toLocaleString();
  if (entries.length) {
    const top = entries.reduce((a, b) => ((b[1].hits || 0) > (a[1].hits || 0) ? b : a));
    statTop.textContent = top[1].hits ? `go/${top[0]}` : "—";
    const recent = entries.reduce((a, b) =>
      (b[1].createdAt || 0) > (a[1].createdAt || 0) ? b : a,
    );
    statRecent.textContent = recent[1].createdAt ? `go/${recent[0]}` : "—";
  } else {
    statTop.textContent = "—";
    statRecent.textContent = "—";
  }
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const rows = Object.entries(allLinks)
    .filter(([n, e]) => !query || n.includes(query) || e.url.toLowerCase().includes(query))
    .map(([name, e]) => ({ name, ...e }));

  rows.sort(comparator(sortEl.value));

  listEl.innerHTML = "";
  if (Object.keys(allLinks).length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  if (rows.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.innerHTML = `<p>No matches for "<strong></strong>".</p>`;
    li.querySelector("strong").textContent = query;
    listEl.appendChild(li);
    return;
  }
  for (const row of rows) listEl.appendChild(renderRow(row));
}

function comparator(key) {
  return (a, b) => {
    switch (key) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "hits-desc":
        return (b.hits || 0) - (a.hits || 0) || a.name.localeCompare(b.name);
      case "recent-desc":
        return (b.lastUsed || 0) - (a.lastUsed || 0) || a.name.localeCompare(b.name);
      case "created-desc":
        return (b.createdAt || 0) - (a.createdAt || 0);
      case "created-asc":
        return (a.createdAt || 0) - (b.createdAt || 0);
      default:
        return 0;
    }
  };
}

function renderRow(row) {
  const li = document.createElement("li");
  li.className = "link-row";

  const fav = UI.faviconElement(row.url, row.name);

  const nameWrap = document.createElement("div");
  nameWrap.className = "name-wrap";
  const nameEl = document.createElement("div");
  nameEl.className = "name";
  const prefix = document.createElement("span");
  prefix.className = "name-prefix";
  prefix.textContent = "go/";
  nameEl.append(prefix, document.createTextNode(row.name));
  const meta = document.createElement("div");
  meta.className = "meta";
  const lastBit = row.lastUsed ? `Last used ${UI.relativeTime(row.lastUsed)}` : "Never used";
  meta.textContent = `Added ${UI.relativeTime(row.createdAt)} · ${lastBit}`;
  nameWrap.append(nameEl, meta);

  const urlWrap = document.createElement("div");
  urlWrap.className = "url";
  const urlA = document.createElement("a");
  urlA.href = row.url;
  urlA.textContent = row.url;
  urlA.target = "_blank";
  urlA.rel = "noopener noreferrer";
  urlA.title = row.url;
  urlA.addEventListener("click", () => Storage.recordHit(row.name));
  urlWrap.appendChild(urlA);

  const hitsEl = document.createElement("div");
  hitsEl.className = "hits";
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = `${row.hits || 0} hit${row.hits === 1 ? "" : "s"}`;
  hitsEl.appendChild(pill);

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(
    iconButton("copy", "Copy URL", async () => {
      await navigator.clipboard.writeText(row.url);
      UI.toast("URL copied", { icon: "check" });
    }),
    iconButton("edit", "Edit", () => openEditModal(row)),
    iconButton("trash", "Delete", async () => {
      const ok = await UI.confirmModal({
        title: "Delete shortlink?",
        message: `go/${row.name} will be permanently removed.`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (ok) {
        await Storage.remove(row.name);
        UI.toast(`Deleted go/${row.name}`);
      }
    }),
  );

  li.append(fav, nameWrap, urlWrap, hitsEl, actions);
  return li;
}

function iconButton(iconName, title, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn btn-icon";
  b.title = title;
  b.setAttribute("aria-label", title);
  b.innerHTML = UI.icon(iconName);
  b.addEventListener("click", onClick);
  return b;
}

function openEditModal(row) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h2>Edit shortlink</h2>
      <div class="modal-body">
        <label class="field">Name
          <span class="input-group">
            <span class="prefix">go/</span>
            <input type="text" id="m-name" autocomplete="off" />
          </span>
        </label>
        <label class="field">URL
          <input class="input" type="url" id="m-url" />
        </label>
        <p class="error" id="m-error" hidden></p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="save">
          <span data-icon="check"></span>Save
        </button>
      </div>
    </div>
  `;
  UI.injectIcons(backdrop);
  const nameInput = backdrop.querySelector("#m-name");
  const urlInput = backdrop.querySelector("#m-url");
  const errorEl = backdrop.querySelector("#m-error");
  nameInput.value = row.name;
  urlInput.value = row.url;

  function close() {
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
    if (e.key === "Enter" && (e.target === nameInput || e.target === urlInput)) save();
  }
  async function save() {
    errorEl.hidden = true;
    try {
      const newName = nameInput.value.trim().toLowerCase();
      const newUrl = urlInput.value.trim();
      if (newName !== row.name) await Storage.rename(row.name, newName);
      await Storage.set(newName, newUrl);
      close();
      UI.toast("Saved", { icon: "check" });
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-action="cancel"]').addEventListener("click", close);
  backdrop.querySelector('[data-action="save"]').addEventListener("click", save);
  document.body.appendChild(backdrop);
  document.addEventListener("keydown", onKey);
  setTimeout(() => urlInput.focus(), 30);
}

addFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  addErrorEl.hidden = true;
  try {
    const name = addNameEl.value.trim().toLowerCase();
    await Storage.set(name, addUrlEl.value);
    addNameEl.value = "";
    addUrlEl.value = "";
    addNameEl.focus();
    UI.toast(`Added go/${name}`, { icon: "check" });
  } catch (err) {
    addErrorEl.textContent = err.message;
    addErrorEl.hidden = false;
  }
});

searchEl.addEventListener("input", render);
sortEl.addEventListener("change", render);

exportBtn.addEventListener("click", async () => {
  const data = await Storage.getAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `go-shorter-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  UI.toast("Exported", { icon: "check" });
});

importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async () => {
  const file = importFile.files && importFile.files[0];
  importFile.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const ok = await UI.confirmModal({
      title: "Replace all shortlinks?",
      message: "Importing will replace your current shortlinks. This can't be undone unless you exported first.",
      confirmLabel: "Replace all",
      danger: true,
    });
    if (!ok) return;
    await Storage.replaceAll(parsed);
    UI.toast("Imported", { icon: "check" });
  } catch (err) {
    UI.toast(`Import failed: ${err.message}`, { error: true });
  }
});

document.addEventListener("keydown", (e) => {
  const inField =
    e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  if (inField) return;
  if (e.key === "/") {
    e.preventDefault();
    searchEl.focus();
  } else if (e.key === "n") {
    e.preventDefault();
    addNameEl.focus();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[Storage.STORAGE_KEY]) refresh();
});

refresh();
