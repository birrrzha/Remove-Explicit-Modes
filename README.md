# Remove Explicit Modes

Figma plugin that lists **explicit variable modes** applied anywhere inside your current selection (library name + mode name only—no per-layer breakdown). Each row has a control to **clear** that explicit override on layers that use that exact collection/mode, so they inherit again from parents.

## Use in Figma

1. Run `npm run build` (see below) so `dist/code.js` exists.
2. **Plugins → Development → Import plugin from manifest…** and choose this folder’s `manifest.json`.
3. Open the plugin, select frames or other layers on the canvas, and review the list.
4. Use the remove action on a row to drop that explicit mode on matching layers in the selection subtree.

**Labels**

- **Published variables:** Shows the **team library** name when it can be resolved; otherwise the collection name.
- **Local variables:** Shows the **current file** name (document name).
- If the same library + mode label would appear twice (different collections), the library line includes **`· Collection name`** for disambiguation.

## Development

Requirements: [Node.js](https://nodejs.org/) (includes npm).

```bash
npm install
npm run build      # compile plugin code → dist/code.js
npm run watch      # rebuild on save
```

The UI is `ui.html`; it is inlined into the bundle via webpack for `figma.showUI`. Official plugin API overview: [Plugin Quickstart](https://www.figma.com/plugin-docs/plugin-quickstart-guide/).

## Project layout

| Path | Role |
|------|------|
| `src/code.ts` | Main thread: scan selection, resolve names, clear explicit modes |
| `ui.html` | Plugin UI (list + remove actions) |
| `dist/code.js` | Built output referenced by `manifest.json` |
