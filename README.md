# Webflow CMS Binding Highlighter

VS Code / Cursor extension that **highlights Webflow `{{wf ...}}` CMS bindings** in HTML, JSON, and JSON-LD, and validates JSON-LD schema while treating Webflow CMS bindings as placeholders. **Your file on disk is never modified** — binding highlights are editor-only.

## Features

- Decoded field-name pills by default, so `{{wf ...}}` appears as a compact purple label while the real source text stays intact.
- Optional highlight mode for showing the full encoded binding with a purple highlight.
- Hover a highlighted span to see decoded **field path** and **Webflow type** when parseable (`path`, `type` from the inner JSON).
- JSON-LD syntax validation for brackets, quotes, commas, and malformed structure.
- Schema.org-aware validation for unknown `@type` values, unknown properties, and missing Google rich-result fields.
- Schema.org property completions inside typed JSON-LD objects.
- Quick fixes to insert recommended fields for common rich-result types such as `Product`, `Article`, `Recipe`, `LocalBusiness`, `Event`, `FAQPage`, `BreadcrumbList`, `Organization`, `WebSite`, and `VideoObject`.
- Toggle highlights without uninstalling.

## Default Pill View

![Default pill view showing decoded Webflow CMS fields](docs/assets/default-pill-view.png)

The pills are editor-only decorations. Selecting or copying a pill still copies the original encoded Webflow binding text from the file, not the decoded label shown in the editor.

## Installation

> **Note:** This extension will be available on the VS Code Marketplace shortly. Until then, you can install it manually using one of the methods below.

### 1. Install from VSIX (Easiest)

A pre-compiled `.vsix` file is included in this repository.

1. Open the **Extensions** view in VS Code/Cursor (`Cmd+Shift+X` or `Ctrl+Shift+X`).
2. Click the **...** (More Actions) menu in the top right.
3. Select **Install from VSIX...**.
4. Select `webflow-cms-binding-highlighter-0.2.0.vsix` from the root of this project.

### 2. Folder-based Install (Best for Development)

If you want to load the extension directly from the source code:

1. Open the **Command Palette** (`Cmd+Shift+P` or `Ctrl+Shift+P`).
2. Search for and select **Developer: Install Extension from Location...**.
3. Select the **root folder** of this repository (the one containing `package.json`).

> **Note:** Do not choose `out/`, `out/src/`, or any subfolders. Cursor/VS Code needs the folder containing `package.json` to recognize it as a valid extension.

## Usage

1. Open an `.html` file (or JSON / TS / JS per settings) that contains Webflow bindings such as:

```json
"url": "{{wf {&quot;path&quot;:&quot;main-image&quot;,&quot;type&quot;:&quot;ImageRef&quot;\} }}"
```

1. Bindings are highlighted automatically when `webflowCmsBindings.enabled` is true.
2. Command Palette: **Webflow CMS Bindings: Toggle Highlights** to enable or disable decorations.
3. Command Palette: **Webflow CMS Bindings: Toggle Pill Display** to switch between decoded field-name pills and highlighted encoded text.
4. Command Palette: **Webflow CMS Bindings: Validate Schema** to manually validate JSON-LD schema blocks.
5. Inside a JSON-LD object with `@type`, trigger completions to see schema.org properties that are valid for that type.
6. Use the **Insert recommended properties** quick fix to add missing rich-result fields for supported schema types.

By default, the extension visually hides the encoded binding and shows a decoded field-name pill. The file contents are unchanged.

To shut off pills and show the full encoded binding with a purple highlight instead, use **Webflow CMS Bindings: Toggle Pill Display** or set:

```json
"webflowCmsBindings.displayMode": "highlight"
```

To return to the default pill view:

```json
"webflowCmsBindings.displayMode": "pill"
```

## Settings


| Setting                          | Default                                             | Description                                                                                                                                                                  |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webflowCmsBindings.enabled`     | `true`                                              | Master switch for highlights.                                                                                                                                                |
| `webflowCmsBindings.displayMode` | `pill`                                              | `pill` visually hides the encoded span and shows a decoded field-name pill while preserving source text. `highlight` keeps encoded bindings visible with a purple highlight. |
| `webflowCmsBindings.languages`   | `html`, `javascript`, `typescript`, `json`, `jsonc` | Language IDs to decorate.                                                                                                                                                    |
| `webflowCmsBindings.debounceMs`  | `100`                                               | Delay after edits before refreshing decorations (ms).                                                                                                                        |
| `webflowCmsBindings.validate.enabled` | `true` | Validate JSON-LD schema blocks while ignoring Webflow CMS bindings. |
| `webflowCmsBindings.validate.severity` | `warning` | Diagnostic severity for schema.org type/property and missing required-property issues. One of `error`, `warning`, or `information`. |
| `webflowCmsBindings.recommend.enabled` | `true` | Show schema.org property completions and recommended-field quick fixes. |
| `webflowCmsBindings.recommend.includeGoogleRequired` | `true` | Include Google rich-result required and recommended fields in diagnostics and quick fixes. |


## Development

```bash
npm install
npm run compile
npm test
npm run package
```

Press **F5** in VS Code with this folder open (**Run Extension**) to launch an Extension Development Host with this extension loaded.

## How it works

The extension scans document text for spans starting with `{{wf`, parses the inner `{ ... }` object that Webflow embeds (including `&quot;` entity-encoded strings and `\}`-style closing braces), then applies editor decorations over each span. Underlying text — including entities — is unchanged; copy/paste and saves preserve Webflow’s encoding. In pill mode, the encoded span is visually hidden with decoration styling and the decoded field name is rendered as an editor-only attachment.

For schema validation, the extension finds JSON-LD blocks in HTML (`<script type="application/ld+json">`) and standalone JSON/JSONC files. It sanitizes each Webflow binding into a same-length placeholder before parsing, so bindings such as `{{wf ...}}` do not break JSON validation and diagnostic offsets still point back to the original source. The sanitized JSON-LD is parsed with `jsonc-parser`, then checked against bundled schema.org data and curated Google rich-result requirements.

The recommender uses the enclosing object’s `@type` to suggest valid schema.org properties and to offer quick fixes for missing required or recommended fields.