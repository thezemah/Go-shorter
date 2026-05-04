UI.injectIcons();

const RECENT_LIMIT = 5;

const listEl = document.getElementById("list");
const recentEl = document.getElementById("recent-section");
const emptyEl = document.getElementById("empty");
const totalEl = document.getElementById("total");
const addBtn = document.getElementById("add-btn");
const openManageEl = document.getElementById("open-manage");

async function refresh() {
  const all = await Storage.getAll();
  render(all);
}

function render(all) {
  const entries = Object.entries(all);
  const total = entries.length;

  if (total === 0) {
    recentEl.hidden = true;
    emptyEl.hidden = false;
    totalEl.textContent = "";
    return;
  }

  emptyEl.hidden = true;
  recentEl.hidden = false;

  const recents = entries
    .map(([name, e]) => ({ name, ...e, sortKey: e.lastUsed || e.createdAt || 0 }))
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, RECENT_LIMIT);

  listEl.innerHTML = "";
  for (const row of recents) listEl.appendChild(renderRow(row));

  if (total > RECENT_LIMIT) {
    totalEl.textContent = ` (${total})`;
  } else {
    totalEl.textContent = ` (${total})`;
  }
}

function renderRow(row) {
  const li = document.createElement("li");
  li.className = "list-row";
  li.tabIndex = 0;

  const fav = UI.faviconElement(row.url, row.name);

  const info = document.createElement("div");
  info.className = "info";
  const nameEl = document.createElement("span");
  nameEl.className = "name";
  const prefix = document.createElement("span");
  prefix.className = "name-prefix";
  prefix.textContent = "go/";
  nameEl.append(prefix, document.createTextNode(row.name));

  const urlEl = document.createElement("span");
  urlEl.className = "url";
  urlEl.textContent = row.url;
  info.append(nameEl, urlEl);

  const actions = document.createElement("div");
  actions.className = "actions";

  actions.append(
    iconButton("copy", "Copy URL", async (e) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(row.url);
      UI.toast("URL copied", { icon: "check" });
    }),
    iconButton("external", "Open in new tab", (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: row.url });
      Storage.recordHit(row.name);
    }),
    iconButton("trash", "Delete", async (e) => {
      e.stopPropagation();
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

  li.append(fav, info, actions);

  li.addEventListener("click", () => {
    Storage.recordHit(row.name);
    chrome.tabs.update({ url: row.url });
    window.close();
  });
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter") li.click();
  });

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

addBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("add.html") });
  window.close();
});

openManageEl.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[Storage.STORAGE_KEY]) refresh();
});

refresh();
