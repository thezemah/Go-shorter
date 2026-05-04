const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
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
  const names = Object.keys(allLinks)
    .filter((n) => !query || n.includes(query) || allLinks[n].url.toLowerCase().includes(query))
    .sort();

  listEl.innerHTML = "";
  if (Object.keys(allLinks).length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  for (const name of names) {
    listEl.appendChild(renderRow(name, allLinks[name]));
  }
}

function renderRow(name, entry) {
  const li = document.createElement("li");

  const info = document.createElement("div");
  info.className = "info";
  const nameEl = document.createElement("span");
  nameEl.className = "name";
  nameEl.textContent = `go/${name}`;
  const urlEl = document.createElement("a");
  urlEl.className = "url";
  urlEl.href = entry.url;
  urlEl.textContent = entry.url;
  urlEl.target = "_blank";
  urlEl.rel = "noopener noreferrer";
  info.appendChild(nameEl);
  info.appendChild(urlEl);

  const actions = document.createElement("div");
  actions.className = "actions";

  const openBtn = button("↗", "Open", () => {
    chrome.tabs.create({ url: entry.url });
    Storage.recordHit(name);
  });
  const copyBtn = button("⧉", "Copy URL", async () => {
    await navigator.clipboard.writeText(entry.url);
    copyBtn.textContent = "✓";
    setTimeout(() => (copyBtn.textContent = "⧉"), 800);
  });
  const deleteBtn = button("✕", "Delete", async () => {
    if (!confirm(`Delete go/${name}?`)) return;
    await Storage.remove(name);
    refresh();
  });
  deleteBtn.classList.add("danger");

  actions.append(openBtn, copyBtn, deleteBtn);

  li.append(info, actions);
  return li;
}

function button(label, title, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon";
  b.title = title;
  b.textContent = label;
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
    addNameEl.focus();
  }
}

toggleAddEl.addEventListener("click", () => showAddForm(addFormEl.hidden));
addCancelEl.addEventListener("click", () => showAddForm(false));

addFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await Storage.set(addNameEl.value, addUrlEl.value);
    showAddForm(false);
    await refresh();
  } catch (err) {
    addErrorEl.textContent = err.message;
    addErrorEl.hidden = false;
  }
});

searchEl.addEventListener("input", render);

openManageEl.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[Storage.STORAGE_KEY]) refresh();
});

refresh();
