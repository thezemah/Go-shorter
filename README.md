# Go-shorter

A Chrome extension for personal go-links. Save URLs under short names and reach them by typing `go <name>` (or `go/<name>`) in the address bar. When you hit an unknown go-link, an add form opens pre-filled so you can capture it on the spot.

## Install (unpacked)

1. Clone this repo.
2. Open `chrome://extensions` and enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the repo root.
4. Pin the Go-shorter icon to the toolbar so the popup is one click away.

No build step — it's plain HTML/CSS/JS using Chrome's MV3 APIs.

## Usage

### Add a shortlink
- Click the toolbar icon → **+ Add** → enter a name (e.g. `gh`) and URL (e.g. `https://github.com`).
- Or open the full **Manage** page from the popup footer (also via `chrome://extensions` → Go-shorter → "Extension options").

### Visit a shortlink
- **Recommended**: type `go` in the address bar, press <kbd>Tab</kbd> or <kbd>Space</kbd>, then the name and <kbd>Enter</kbd>. This uses the omnibox keyword and is 100% reliable.
- **Also works**: type `go/<name>` and press <kbd>Enter</kbd>. Chrome may treat single-word entries as a search the first time; if so, append a trailing `/` (so `go/gh/`) or accept the navigation suggestion. After Chrome learns `go/` is a host it tends to keep doing so.

### Unknown shortlinks
Visit `go/somethingnew` and the extension opens its **Add** page with the name pre-filled. Save it and you're done.

### Manage
The full options page (Manage) lets you search, edit, delete, and **import / export** all shortlinks as JSON for backup or transfer.

## Storage

All data lives in `chrome.storage.local` under the key `shortlinks`:

```js
{
  "<name>": {
    url: "https://example.com",
    createdAt: 1714857600000,
    updatedAt: 1714857600000,
    hits: 0,
    lastUsed: null
  }
}
```

Nothing leaves your machine. No analytics, no network calls.

## File layout

| File                | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `manifest.json`     | MV3 manifest                                             |
| `background.js`     | Service worker: omnibox handler + go/ navigation hijack  |
| `lib/storage.js`    | Shared CRUD helpers (used by SW + pages)                 |
| `popup.{html,js,css}` | Toolbar popup                                          |
| `manage.{html,js,css}` | Full management page (options page)                   |
| `add.{html,js}`     | Add form, also shown for unknown `go/<name>` hits        |
| `icons/`            | Generated PNG icons + `.gen_icons.py` (regenerator)      |

## Limitations (v0.1)

- Only the exact `go/<name>` resolves. Trailing path segments like `go/docs/page` are not appended to the target URL.
- No placeholder syntax (`go/jira/{ticket}` style) yet.
- Local only — no cloud sync between devices. Use Export / Import in the Manage page to move data.

## Development

Edit files in place, then click the reload button on the extension's card in `chrome://extensions`. The service worker will restart and pages will pick up changes on next load.

To regenerate icons after a design change:

```sh
python3 icons/.gen_icons.py
```
