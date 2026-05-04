const params = new URLSearchParams(location.search);
const requestedName = (params.get("name") || "").trim().toLowerCase();

const titleEl = document.getElementById("title");
const ledeEl = document.getElementById("lede");
const nameEl = document.getElementById("name");
const urlEl = document.getElementById("url");
const errorEl = document.getElementById("error");
const formEl = document.getElementById("form");
const cancelBtn = document.getElementById("cancel");
const saveGoBtn = document.getElementById("save-go");

let saveAndGo = false;

if (requestedName) {
  titleEl.textContent = `"go/${requestedName}" isn't set up yet`;
  ledeEl.innerHTML = `Add a URL for it now and the next time you type <code>go ${escapeHtml(requestedName)}</code> it'll just work.`;
  nameEl.value = requestedName;
  setTimeout(() => urlEl.focus(), 0);
} else {
  setTimeout(() => nameEl.focus(), 0);
}

saveGoBtn.addEventListener("click", () => {
  saveAndGo = true;
});

cancelBtn.addEventListener("click", () => {
  history.length > 1 ? history.back() : window.close();
});

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  try {
    const entry = await Storage.set(nameEl.value, urlEl.value);
    if (saveAndGo) {
      location.replace(entry.url);
    } else {
      titleEl.textContent = "Saved!";
      ledeEl.innerHTML = `<code>go/${escapeHtml(Storage.normalizeName(nameEl.value))}</code> now points to <a href="${entry.url}">${escapeHtml(entry.url)}</a>.`;
      formEl.hidden = true;
    }
  } catch (err) {
    saveAndGo = false;
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
