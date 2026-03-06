# Content Optimizer - Strapi Plugin

Real-time SEO and readability analysis for **Strapi v5**. Inline field stats, content validation, and readability checks - all updating live as you type, directly inside the Content Manager.

---

## Features

- **Inline field feedback** - character count, word count, and a status indicator injected below the title and description fields
- **Pixel-accurate truncation warnings** - uses the Canvas API to measure rendered width the same way Google does, so truncation warnings are reliable rather than character-count approximations
- **Readability analysis** - average sentence length, average paragraph length, paragraph density, and longest-sentence callouts
- **Content validation** - hard errors for missing or undersized content, warnings for long sentences
- **Context-aware sidebar panel** - switches between title stats, description stats, and full content stats depending on which field is active
- **Two-path content extraction** - reads Strapi Blocks JSON directly when available; falls back to DOM extraction for unsaved documents

---

## Requirements

| Dependency            | Version  |
| --------------------- | -------- |
| Strapi                | ^5.0.0   |
| React                 | ^18.0.0  |
| @strapi/design-system | ^2.0.0   |
| Node.js               | ≥18, ≤24 |

---

## Installation

### 1. Install the package

```bash
npm install @starstack/strapi-plugin-content-optimizer
```

### 2. Enable the plugin

In `config/plugins.ts`:

```ts
export default {
  "content-optimizer": {
    enabled: true,
  },
};
```

Or in `config/plugins.js`:

```js
module.exports = {
  "content-optimizer": {
    enabled: true,
  },
};
```

### 3. Rebuild and start

```bash
npm run build
npm run develop
```

---

## Where It Appears

Once installed, two UI elements appear inside any Content Manager edit view:

### Inline field stats

Injected directly below the **Title** and **Description** fields:

```
142 characters  |  23 words  |  Optimal ●
┌─────────────────────────────────────────┐
│ ✅ Optimal                              │
└─────────────────────────────────────────┘
```

### Right sidebar panel

A **Content Statistics** panel in the right sidebar that switches context based on the active field:

- **Title / Description active** → shows character count, word count, reading time
- **Content editor active** → shows word count (colour-coded), sentence count, paragraph count, and reading time.

---

## How Content Is Extracted

The plugin uses a two-path extraction strategy for Strapi Blocks fields:

**Path 1 - Blocks JSON (preferred):** Reads the structured JSON from `unstable_useContentManagerContext` directly. Accurate for saved and unsaved content.

**Path 2 - DOM fallback:** Walks the live Slate editor DOM when JSON is unavailable. Uses a leaf-block filter to avoid double-counting Slate's nested `<li><p>` structure.

Content is classified into three buckets:

- `headingBlocks` (h1–h6) - contribute to word count only
- `paragraphBlocks` (p, blockquote) - used for paragraph metrics and sentence metrics
- `listBlocks` (li) - used for word count and sentence metrics, not paragraph count

---

## Field Detection

Fields are located by querying the live DOM in priority order:

**Title:**

1. `[data-strapi-field="title"] input`
2. `input[name="title"]`
3. Label-text match for "meta title"

**Description:**

1. `[data-strapi-field="metaDescription"] textarea`
2. `[data-strapi-field="description"] textarea`
3. `textarea[name="metaDescription"]`
4. `textarea[name="description"]`
5. Label-text match for "meta description"

**Content editors:**

1. All `[data-strapi-field]` wrappers with a `contenteditable` child, excluding known SEO fields
2. Any remaining `contenteditable` elements not under a `[data-strapi-field]` wrapper (covers dynamic zones)

---

## Known Limitations

- Uses `unstable_useContentManagerContext` - this is an internal Strapi API marked unstable. It works across current Strapi 5.x releases but may require an update on future Strapi versions.
- Inline stats are injected via DOM manipulation (not React portals) to work reliably across Strapi's CSS grid layout. This means they are not rendered by React and won't appear in server-side renders.
- Field name detection is heuristic-based. Custom field names that don't match the standard patterns (`title`, `description`, `metaDescription`) may require the Strapi `data-strapi-field` attribute to be present.

---

## License

MIT © [Starstack](https://starstacktech.com)
