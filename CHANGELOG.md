# Changelog

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
