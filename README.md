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
Both of these work out of the box — **no `/etc/hosts` or DNS changes required**:

- Type `go/<name>` and press <kbd>Enter</kbd>. Chrome sends that text to your default search engine; the extension catches the search navigation, recognizes the `go/<name>` pattern in the query, and redirects the tab to your saved URL before the search results render.
- Or use the omnibox keyword: type `go`, press <kbd>Tab</kbd> or <kbd>Space</kbd>, then the name and <kbd>Enter</kbd>.

How the search-redirect path works: any default search engine that puts the typed text into a query parameter (`q`, `query`, `p`, `text`, or `wd` — covers Google, Bing, DuckDuckGo, Brave, Yahoo, Yandex, Baidu, etc.) is supported. The service worker's `chrome.webNavigation.onBeforeNavigate` listener inspects each top-frame navigation, extracts the query, and rewrites the URL when it matches.

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
| `lib/design.css`    | Design tokens + base components (light/dark)             |
| `lib/ui.js`         | Shared UI helpers: SVG icons, favicons, toasts, modal    |
| `popup.{html,js,css}` | Toolbar popup                                          |
| `manage.{html,js,css}` | Full management page (options page)                   |
| `add.{html,js,css}` | Add form, also shown for unknown `go/<name>` hits        |
| `icons/`            | Generated PNG icons + `.gen_icons.py` (regenerator)      |

## UI

- Light + dark themes via `prefers-color-scheme`.
- Real favicons next to each saved link (Chrome's `_favicon` API; first-letter fallback when unavailable).
- Toasts for confirmations, modal for destructive actions — no native `alert()`/`confirm()`.
- Keyboard shortcuts inside the popup and manage page: <kbd>/</kbd> focus search, <kbd>n</kbd> new shortlink, <kbd>Esc</kbd> dismiss.

## Limitations (v0.2)

- Only the exact `go/<name>` resolves. Trailing path segments like `go/docs/page` are not appended to the target URL.
- No placeholder syntax (`go/jira/{ticket}` style) yet.
- Local only — no cloud sync between devices. Use Export / Import in the Manage page to move data.

## Development

Edit files in place, then click the reload button on the extension's card in `chrome://extensions`. The service worker will restart and pages will pick up changes on next load.

To regenerate icons after a design change:

```sh
python3 icons/.gen_icons.py
```
