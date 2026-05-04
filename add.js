UI.injectIcons();

const params = new URLSearchParams(location.search);
const requestedName = (params.get("name") || "").trim().toLowerCase();

const titleEl = document.getElementById("title");
const ledeEl = document.getElementById("lede");
const heroMarkEl = document.getElementById("hero-mark");
const nameEl = document.getElementById("name");
const urlEl = document.getElementById("url");
const errorEl = document.getElementById("error");
const formEl = document.getElementById("form");
const cancelBtn = document.getElementById("cancel");
const saveBtn = document.getElementById("save");
const saveGoBtn = document.getElementById("save-go");
const successEl = document.getElementById("success");
const successLedeEl = document.getElementById("success-lede");
const successManageBtn = document.getElementById("success-manage");
const successGoBtn = document.getElementById("success-go");

let saveAndGo = false;
let savedUrl = null;

if (requestedName) {
  heroMarkEl.innerHTML = UI.icon("sparkle");
  titleEl.textContent = `“go/${requestedName}” isn't set up yet`;
  ledeEl.innerHTML = `Add a destination URL and the next time you type <code>go ${escapeHtml(requestedName)}</code> it'll just work.`;
  nameEl.value = requestedName;
  setTimeout(() => urlEl.focus(), 30);
} else {
  setTimeout(() => nameEl.focus(), 30);
}

saveBtn.addEventListener("click", () => {
  saveAndGo = false;
});
saveGoBtn.addEventListener("click", () => {
  saveAndGo = true;
});

cancelBtn.addEventListener("click", () => {
  if (history.length > 1) history.back();
  else window.close();
});

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  try {
    const entry = await Storage.set(nameEl.value, urlEl.value);
    savedUrl = entry.url;
    if (saveAndGo) {
      location.replace(entry.url);
      return;
    }
    formEl.hidden = true;
    heroMarkEl.hidden = true;
    titleEl.hidden = true;
    ledeEl.hidden = true;
    successLedeEl.innerHTML = `<code>go/${escapeHtml(Storage.normalizeName(nameEl.value))}</code> now points to <a href="${escapeAttr(entry.url)}" target="_blank">${escapeHtml(entry.url)}</a>.`;
    successEl.hidden = false;
  } catch (err) {
    saveAndGo = false;
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

successGoBtn.addEventListener("click", () => {
  if (savedUrl) location.replace(savedUrl);
});
successManageBtn.addEventListener("click", () => {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  else location.href = chrome.runtime.getURL("manage.html");
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(str) {
  return escapeHtml(str);
}
