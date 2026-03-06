import { SEO_FIELD_NAMES } from "./constants.js";

export const findFieldByHint = (hints) => {
  const inputs = Array.from(document.querySelectorAll("input, textarea"));
  return (
    inputs.find((el) => {
      const name = (el.getAttribute("name") || "").toLowerCase();
      const id = (el.getAttribute("id") || "").toLowerCase();
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      return hints.some(
        (h) => name.includes(h) || id.includes(h) || aria.includes(h),
      );
    }) || null
  );
};

// Strapi 5 component sub-field textareas (e.g. defaultSeo.metaDescription)
// may have no name/id — labels are the only reliable anchor in those cases
export const findInputByLabel = (labelTexts) => {
  const labels = Array.from(document.querySelectorAll("label"));
  const label = labels.find((l) =>
    labelTexts.some((t) =>
      l.textContent.trim().toLowerCase().includes(t.toLowerCase()),
    ),
  );
  if (!label) return null;

  if (label.htmlFor) {
    const el = document.getElementById(label.htmlFor);
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return el;
  }

  let node = label.parentElement;
  for (let i = 0; i < 6 && node; i++) {
    const f = node.querySelector("input, textarea");
    if (f) return f;
    node = node.parentElement;
  }
  return null;
};

export const getTitleInput = () =>
  document.querySelector(
    '[data-strapi-field="title"] input,' +
      '[data-strapi-field="title"] textarea,' +
      'input[name="title"],textarea[name="title"],' +
      'input[name$=".title"],textarea[name$=".title"]',
  ) || findFieldByHint(["title"]);

export const getDescInput = () =>
  document.querySelector(
    '[data-strapi-field="metaDescription"] textarea,' +
      '[data-strapi-field="metaDescription"] input,' +
      '[data-strapi-field="description"] textarea,' +
      '[data-strapi-field="description"] input',
  ) ||
  document.querySelector(
    'textarea[name="metaDescription"],input[name="metaDescription"],' +
      'textarea[name="description"],input[name="description"]',
  ) ||
  document.querySelector(
    'textarea[name$=".metaDescription"],input[name$=".metaDescription"],' +
      'textarea[name$=".description"],input[name$=".description"]',
  ) ||
  findInputByLabel(["meta description", "metadescription"]) ||
  findFieldByHint(["metadescription"]);

// Discovers all blocks-editor contenteditable elements, one per field,
// skipping known SEO-only fields. Handles regular fields AND dynamic zones.
export const getContentEditors = () => {
  const results = [];
  const seen = new Set();

  document.querySelectorAll("[data-strapi-field]").forEach((field) => {
    const fieldName = field.getAttribute("data-strapi-field") || "";
    if (SEO_FIELD_NAMES.has(fieldName)) return;

    const editable =
      field.querySelector('[contenteditable="true"]') ||
      field.querySelector('[role="textbox"]');

    if (editable && !seen.has(editable)) {
      seen.add(editable);
      results.push({ fieldName, editor: editable });
    }
  });

  // Second pass: pick up contenteditables not under any [data-strapi-field]
  // (covers dynamic zone components, repeatable fields, custom fields)
  const allEditables = document.querySelectorAll(
    '[contenteditable="true"],[role="textbox"]',
  );
  let dynamicIdx = 0;
  allEditables.forEach((editable) => {
    if (seen.has(editable)) return;
    if (editable.closest("[data-optimizer-feedback]")) return;
    const strapiField = editable.closest("[data-strapi-field]");
    if (
      strapiField &&
      SEO_FIELD_NAMES.has(strapiField.getAttribute("data-strapi-field") || "")
    )
      return;

    seen.add(editable);
    const fieldName = strapiField
      ? strapiField.getAttribute("data-strapi-field") ||
        `dynamic-${dynamicIdx++}`
      : `dynamic-${dynamicIdx++}`;
    results.push({ fieldName, editor: editable });
  });

  return results;
};

export const getAllContentEditables = () => {
  return getContentEditors().map(({ editor }) => editor);
};

// Walks up from inputEl to find the element that is a direct child
// of a CSS-grid container — needed to insert feedback at the right DOM level
export const findGridItem = (inputEl) => {
  let cur = inputEl;
  while (cur && cur !== document.body) {
    const parent = cur.parentElement;
    if (!parent || parent === document.body) break;
    const display = window.getComputedStyle(parent).display;
    if (display === "grid" || display === "inline-grid") return cur;
    cur = parent;
  }
  return inputEl?.parentElement || null;
};

export const getOrCreateFeedback = (inputEl, id) => {
  let wrapper = document.getElementById(id);
  if (wrapper) return wrapper;

  const gridItem = findGridItem(inputEl);
  if (!gridItem || !gridItem.parentElement) return null;

  wrapper = document.createElement("div");
  wrapper.id = id;
  wrapper.dataset.optimizerFeedback = "true";

  const fieldSiblings = Array.from(gridItem.parentElement.children).filter(
    (el) => el !== gridItem && !el.dataset.optimizerFeedback,
  );

  if (fieldSiblings.length > 0) {
    wrapper.style.cssText = "width: 100%;";
    gridItem.appendChild(wrapper);
  } else {
    wrapper.style.cssText = "grid-column: 1 / -1; width: 100%;";
    gridItem.parentElement.insertBefore(wrapper, gridItem.nextSibling);
  }

  return wrapper;
};

export const getOrCreateContentStats = (editor, fieldName) => {
  const id = `cop-content-stats-${fieldName || "default"}`;
  let wrapper = document.getElementById(id);
  if (wrapper) return wrapper;

  const fieldWrapper = editor.closest("[data-strapi-field]");
  const startEl = fieldWrapper || editor;
  const gridItem = findGridItem(startEl);
  const anchor = gridItem || fieldWrapper || editor.parentElement;
  if (!anchor || !anchor.parentElement) return null;

  wrapper = document.createElement("div");
  wrapper.id = id;
  wrapper.dataset.optimizerFeedback = "true";
  wrapper.style.cssText = "grid-column: 1 / -1; width: 100%;";
  anchor.parentElement.insertBefore(wrapper, anchor.nextSibling);

  return wrapper;
};

export const isContentManagerRoute = () =>
  /\/content-manager\/(collection-types|single-types)\//.test(
    window.location.pathname,
  );
