const tbody = document.getElementById("links-body");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");
const addFormEl = document.getElementById("add-form");
const addNameEl = document.getElementById("add-name");
const addUrlEl = document.getElementById("add-url");
const addErrorEl = document.getElementById("add-error");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
const tableEl = document.getElementById("links-table");

let allLinks = {};
let sortKey = "name";
let sortDir = "asc";
let editingName = null;

async function refresh() {
  allLinks = await Storage.getAll();
  render();
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const rows = Object.entries(allLinks)
    .filter(([name, e]) => !query || name.includes(query) || e.url.toLowerCase().includes(query))
    .map(([name, e]) => ({ name, ...e }));

  rows.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = "";
  if (Object.keys(allLinks).length === 0) {
    emptyEl.hidden = false;
    tableEl.hidden = true;
  } else {
    emptyEl.hidden = true;
    tableEl.hidden = false;
    for (const row of rows) {
      tbody.appendChild(row.name === editingName ? renderEditRow(row) : renderRow(row));
    }
  }

  for (const th of tableEl.querySelectorAll("th[data-sort]")) {
    th.classList.toggle("sorted", th.dataset.sort === sortKey);
    th.classList.toggle("desc", th.dataset.sort === sortKey && sortDir === "desc");
  }
}

function renderRow(row) {
  const tr = document.createElement("tr");
  tr.append(
    cell("name", `go/${row.name}`),
    urlCell(row.url),
    cell("meta num", String(row.hits || 0)),
    cell("meta", formatTime(row.lastUsed)),
    cell("meta", formatTime(row.createdAt)),
    actionsCell(row),
  );
  return tr;
}

function renderEditRow(row) {
  const tr = document.createElement("tr");
  tr.classList.add("editing");

  const nameTd = document.createElement("td");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = row.name;
  nameTd.appendChild(nameInput);

  const urlTd = document.createElement("td");
  urlTd.colSpan = 3;
  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.value = row.url;
  urlTd.appendChild(urlInput);

  const createdTd = cell("meta", formatTime(row.createdAt));

  const actionsTd = document.createElement("td");
  actionsTd.className = "actions";
  const saveBtn = button("Save", "Save changes", async () => {
    try {
      const newName = nameInput.value.trim().toLowerCase();
      const newUrl = urlInput.value.trim();
      if (newName !== row.name) {
        await Storage.rename(row.name, newName);
      }
      await Storage.set(newName, newUrl);
      editingName = null;
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  });
  saveBtn.classList.add("primary");
  const cancelBtn = button("Cancel", "Cancel", () => {
    editingName = null;
    render();
  });
  actionsTd.append(saveBtn, cancelBtn);

  tr.append(nameTd, urlTd, createdTd, actionsTd);
  setTimeout(() => urlInput.focus(), 0);
  return tr;
}

function cell(cls, text) {
  const td = document.createElement("td");
  td.className = cls;
  td.textContent = text;
  return td;
}

function urlCell(url) {
  const td = document.createElement("td");
  td.className = "url";
  const a = document.createElement("a");
  a.href = url;
  a.textContent = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  td.appendChild(a);
  return td;
}

function actionsCell(row) {
  const td = document.createElement("td");
  td.className = "actions";
  const editBtn = button("Edit", "Edit", () => {
    editingName = row.name;
    render();
  });
  editBtn.classList.add("icon");
  const deleteBtn = button("Delete", "Delete", async () => {
    if (!confirm(`Delete go/${row.name}?`)) return;
    await Storage.remove(row.name);
    await refresh();
  });
  deleteBtn.classList.add("icon", "danger");
  td.append(editBtn, deleteBtn);
  return td;
}

function button(label, title, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.title = title;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString();
}

addFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  addErrorEl.hidden = true;
  try {
    await Storage.set(addNameEl.value, addUrlEl.value);
    addNameEl.value = "";
    addUrlEl.value = "";
    addNameEl.focus();
    await refresh();
  } catch (err) {
    addErrorEl.textContent = err.message;
    addErrorEl.hidden = false;
  }
});

searchEl.addEventListener("input", render);

tableEl.addEventListener("click", (e) => {
  const th = e.target.closest("th[data-sort]");
  if (!th) return;
  const key = th.dataset.sort;
  if (sortKey === key) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortKey = key;
    sortDir = "asc";
  }
  render();
});

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
});

importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async () => {
  const file = importFile.files && importFile.files[0];
  importFile.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!confirm("Importing will replace all current shortlinks. Continue?")) return;
    await Storage.replaceAll(parsed);
    await refresh();
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[Storage.STORAGE_KEY]) refresh();
});

refresh();
