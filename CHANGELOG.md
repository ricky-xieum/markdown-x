# Changelog

## 0.2.3 (2026-06-27)

Auto-refresh is back, and the update path is now simplified to match VS Code's built-in markdown preview:

- Restore `onDidChangeTextDocument` (typing, 200 ms debounce) and `onDidSaveTextDocument` (save, immediate) triggers. Non-`file:` schemes are filtered so writes into Output channels / git buffers / other virtual docs can't feedback-loop.
- Drop the `!ps.panel.visible` gate and the `pendingUpdate` bookkeeping from `updateContent`. `retainContextWhenHidden: true` already keeps hidden webviews alive and `postMessage` delivers regardless of which tab is in front — no need for us to defer updates.
- Drop the `postMessage` delivery fallback that used to fire a full HTML rewrite. If a message ever really is dropped, the manual Refresh button (nuke-and-pave dispose+recreate, added in 0.2.2) covers the edge case.
- Result: `updateContent` is ~10 lines instead of ~30, with no branching outside the initial-render check. Automatic refresh should now behave the same as the built-in previewer.

## 0.2.2 (2026-06-27)

- Mx: Refresh Preview now disposes the WebviewPanel and creates a brand-new one in the same column, instead of reusing the panel and re-assigning `webview.html`. Reassigning HTML on an existing webview was proving unreliable — VS Code / Chromium sometimes retained stale DOM or cache state that we couldn't force to reload from the extension side. Recreating the panel is the equivalent of the user hitting F5 in a browser tab and is now the only refresh path we ship. Trade-off: scroll position resets and embedded assets (Mermaid, Kroki, KaTeX) re-fetch, which is intentional for a "clean slate" refresh.

## 0.2.1 (2026-06-27)

- Fix Mx: Refresh Preview button/command sometimes doing nothing. The refresh path was going through `updateContent`, which skips work when the panel's `visible` flag is briefly false — that's the right behavior for background auto-updates but the wrong behavior for a user-initiated click. Refresh now bypasses the visibility gate and forces a full HTML rebuild via `generateHtml` directly.
- Use the panel's original `document.uri` when calling `vscode.workspace.openTextDocument` so the freshest in-memory document (including unsaved edits) is picked up reliably.

## 0.2.0 (2026-06-26)

Breaking: auto-refresh has been removed in favor of a reliable manual refresh.

- Remove the typing / save / file-watcher auto-refresh triggers and the diagnostic Output channel.
- New `Mx: Refresh Preview` command, available from:
  - the refresh button on the preview toolbar (next to Show Source)
  - the command palette
  - `Cmd/Ctrl+R` while the preview panel is focused

## 0.1.15 (2026-06-25)

- Add `!!!` non-collapsible admonition syntax (Material for MkDocs compatible). Renders as a callout box with type-based accent color; `???` / `???+` continue to render as a collapsible `<details>`.
- Auto-refresh hardening + critical bug fix:
  - Filter out non-`file:` scheme documents from refresh triggers. Previously every `OutputChannel.appendLine` write created a `TextDocument` change event, which our handler logged again, creating a feedback loop that could starve real markdown edits.
  - Add `FileSystemWatcher` for `**/*.{md,markdown,mdx}` so external edits (other editors, git pull, formatter from another extension) are picked up too.
  - Optional "Markdown X" Output channel logs each refresh source (`type` / `save` / `fs-watcher`) and the `updateContent` result for diagnostics.

## 0.1.14 (2026-06-21)

- Render PlantUML, D2, Graphviz, Pikchr, Svgbob, Nomnoml, WaveDrom, Vega/Vega-Lite, and ~20 more diagram formats via Kroki. The code-block language identifier (e.g. ` ```plantuml `, ` ```d2 `, ` ```dot `) is routed to the Kroki server and the SVG is inlined as an `<img>`.
- New settings:
  - `markdown-x.enableKroki` (boolean, default `true`)
  - `markdown-x.krokiServerUrl` (string, default `https://kroki.io`) — point at your self-hosted Kroki instance for offline / private use.

## 0.1.13 (2026-06-02)

- Fix images missing from PDF / Word / Print exports. Image paths are now embedded as data URIs so Puppeteer (PDF), html-to-docx (Word), and the temp HTML file (Print) can all see them.
- Auto-refresh hardening:
  - Trigger on save (`onDidSaveTextDocument`) in addition to typing, so saves never miss a refresh.
  - Debounce shortened from 300 ms to 200 ms.
  - Updates that arrive while the preview tab is hidden are now queued and flushed when the tab becomes visible again (previously they were silently dropped).
- `autoPreviewOnly` mode now uses a single shared preview window. Switching to a different markdown file closes the previous auto preview instead of stacking another panel. Manual previews (Cmd+Shift+V, explorer right-click) still create per-file panels.

## 0.1.12 (2026-06-01)

Performance:

- Bundle Mermaid and KaTeX locally under `media/vendor/` instead of loading from jsDelivr on every render. Eliminates the per-preview network round-trip and lets the preview work fully offline.
- Slim `highlight.js` to ~30 commonly-used languages via `lib/core` (was the full ~190-language bundle). Trims ~700 KB from the extension bundle.

Preview behavior (XM-1):

- New `markdown-x.autoPreviewOnly` setting (boolean, default `false`). When enabled, opening a markdown file opens the preview only — the source editor is closed. Source can be reopened via the "Show Source" button or `Cmd/Ctrl+Shift+V`.
- Manual `Cmd/Ctrl+Shift+V` from a markdown editor now always opens the preview side-by-side (no more closing the source).
- `Cmd/Ctrl+Shift+V` from inside a preview opens the source side-by-side; preview stays open.
- "Show Source" toolbar button no longer disposes the preview — it brings the source editor up beside it.
- Auto-preview-only triggers only on file open (not on tab switches), so manually opening the source via Show Source / shortcut is respected for the rest of the session.

## 0.1.11 (2026-05-11)

- Collapsible admonitions: support MkDocs-style `???` (collapsed) and `???+` (open) syntax with optional type and title
- Type-based accent colors for note / info / tip / warning / danger
- Allow raw `<details>` / `<summary>` HTML through the parser; other raw HTML is still escaped

## 0.1.10 (2026-05-06)

- Add Cmd/Ctrl+Shift+V keybinding for "Show Source" in preview, so the same shortcut now toggles between editor and preview

## 0.1.9 (2026-05-03)

- Single-panel toggle: opening preview closes the source editor; "Show Source" button in preview reopens the source and closes preview
- Auto-refresh fallback: if webview is not ready and an incremental message is dropped, fall back to a full re-render so preview never goes stale

## 0.1.8 (2026-04-24)

- Reliable auto-refresh: mermaid diagrams update correctly when source is edited, added, removed, or reordered (was previously index-based and could misalign)
- In-preview search (Cmd/Ctrl+F): live highlight, Enter / Shift+Enter to navigate, ESC to close
- Remove manual "Refresh Preview" command — auto-refresh handles all cases now

## 0.1.7 (2026-04-22)

- Fix blank preview after VS Code restart when only preview panel remained
- Add "Configure Keyboard Shortcuts..." command for easy key binding management
- Restrict toolbar buttons to markdown editor / preview panel (hide on Claude chat and other tabs)
- Harden lightbox CSS against host style interference
- Handle file:// protocol in image paths

## 0.1.6 (2026-04-08)

- Fix image loading for files outside document directory (workspace-wide resource access)

## 0.1.5 (2026-04-07)

- Explorer context menu: right-click .md file to open preview
- Multiple independent preview panels (one per file)
- Per-file scroll sync and document change tracking

## 0.1.4 (2026-04-06)

- Fix scroll jump when switching files during preview
- Fix diagram scale not applied in production build
- Fix mermaid toolbar scope issue on content update

## 0.1.3 (2026-04-06)

- Preview performance improvements
- Diagram resize toolbar fix
- Cmd/Ctrl + scroll to resize font
- Scroll sync improvements
- Code cleanup and refactoring

## 0.1.2 (2026-04-03)

- Custom colored toolbar icons (cyan/blue)
- Word export fix (corrupted docx)
- Font/theme settings applied to print and PDF export
- Toolbar cleanup and Mx: prefix for menu items
- Brave/Arc browser support for PDF export

## 0.1.0 (2026-04-01)

First release.

- Markdown preview with side-by-side editing
- PDF export (requires Chrome/Edge/Brave)
- Word (.docx) export
- Print
- PDF page preview in VSCode tab
- Mermaid diagrams with resizable controls
- KaTeX math rendering
- Syntax highlighting for code blocks
- Image lightbox (click to zoom)
- 4 themes: Auto, Light, Dark, Sepia
- Font family and size customization
- Custom CSS support
- Outline navigation (H1-H6)
- Editor-to-preview scroll sync
- English and Korean localization
