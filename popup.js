UI.injectIcons();

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const addFormEl = document.getElementById("add-form");
const addNameEl = document.getElementById("add-name");
const addUrlEl = document.getElementById("add-url");
const addErrorEl = document.getElementById("add-error");
const toggleAddEl = document.getElementById("toggle-add");
const addCancelEl = document.getElementById("add-cancel");
const openManageEl = document.getElementById("open-manage");

let allLinks = {};

async function refresh() {
  allLinks = await Storage.getAll();
  render();
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const allNames = Object.keys(allLinks);
  const filtered = allNames
    .filter((n) => !query || n.includes(query) || allLinks[n].url.toLowerCase().includes(query))
    .sort((a, b) => {
      const ah = allLinks[a].hits || 0;
      const bh = allLinks[b].hits || 0;
      if (ah !== bh) return bh - ah;
      return a.localeCompare(b);
    });

  listEl.innerHTML = "";
  if (allNames.length === 0) {
    emptyEl.hidden = false;
    countEl.textContent = "";
  } else {
    emptyEl.hidden = true;
    countEl.textContent = `${filtered.length} of ${allNames.length}`;
    for (const name of filtered) listEl.appendChild(renderRow(name, allLinks[name]));
  }
}

function renderRow(name, entry) {
  const li = document.createElement("li");
  li.className = "list-row";
  li.tabIndex = 0;

  const fav = UI.faviconElement(entry.url, name);

  const info = document.createElement("div");
  info.className = "info";
  const nameEl = document.createElement("span");
  nameEl.className = "name";
  const prefix = document.createElement("span");
  prefix.className = "name-prefix";
  prefix.textContent = "go/";
  nameEl.append(prefix, document.createTextNode(name));

  const urlEl = document.createElement("span");
  urlEl.className = "url";
  urlEl.textContent = entry.url;
  info.append(nameEl, urlEl);

  const actions = document.createElement("div");
  actions.className = "actions";

  actions.append(
    iconButton("copy", "Copy URL", async (e) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(entry.url);
      UI.toast("URL copied", { icon: "check" });
    }),
    iconButton("external", "Open in new tab", (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: entry.url });
      Storage.recordHit(name);
    }),
    iconButton("trash", "Delete", async (e) => {
      e.stopPropagation();
      const ok = await UI.confirmModal({
        title: "Delete shortlink?",
        message: `go/${name} will be permanently removed.`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (ok) {
        await Storage.remove(name);
        UI.toast(`Deleted go/${name}`);
      }
    }),
  );

  li.append(fav, info, actions);

  li.addEventListener("click", () => {
    Storage.recordHit(name);
    chrome.tabs.update({ url: entry.url });
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

function showAddForm(show) {
  addFormEl.hidden = !show;
  addErrorEl.hidden = true;
  addErrorEl.textContent = "";
  if (show) {
    addNameEl.value = "";
    addUrlEl.value = "";
    setTimeout(() => addNameEl.focus(), 30);
  }
}

toggleAddEl.addEventListener("click", () => showAddForm(addFormEl.hidden));
addCancelEl.addEventListener("click", () => showAddForm(false));

addFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const name = addNameEl.value.trim().toLowerCase();
    await Storage.set(name, addUrlEl.value);
    showAddForm(false);
    UI.toast(`Added go/${name}`, { icon: "check" });
  } catch (err) {
    addErrorEl.innerHTML = `${UI.icon("close")} <span></span>`;
    addErrorEl.querySelector("span").textContent = err.message;
    addErrorEl.hidden = false;
  }
});

addFormEl.addEventListener("keydown", (e) => {
  if (e.key === "Escape") showAddForm(false);
});

searchEl.addEventListener("input", render);

document.addEventListener("keydown", (e) => {
  if (e.target === addNameEl || e.target === addUrlEl || e.target === searchEl) return;
  if (e.key === "/" || e.key === "f") {
    e.preventDefault();
    searchEl.focus();
  } else if (e.key === "n") {
    e.preventDefault();
    showAddForm(true);
  }
});

openManageEl.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[Storage.STORAGE_KEY]) refresh();
});

refresh();
