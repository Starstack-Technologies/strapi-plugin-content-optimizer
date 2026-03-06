import { BLOCK_SEL } from "./constants.js";
import { cleanText } from "./textAnalysis.js";

const extractTextFromChildren = (children) => {
  if (!Array.isArray(children)) return "";
  return children
    .map((n) => {
      if (typeof n.text === "string") return n.text;
      if (Array.isArray(n.children)) return extractTextFromChildren(n.children);
      return "";
    })
    .join("");
};

// Detects raw HTML tags a user may have typed/pasted into a paragraph block
const detectPastedHtmlTag = (text) => {
  const m = text.match(/^<\/?([a-z][a-z0-9]*)[\s>/]/i);
  return m ? m[1].toLowerCase() : null;
};

const classifyPastedHtml = (text, tagName, headings, paragraphs, lists) => {
  if (/^h[1-6]$/.test(tagName)) {
    const stripped = text.replace(/<[^>]+>/g, "").trim();
    if (stripped) headings.push(stripped);
  } else if (tagName === "ul" || tagName === "ol") {
    // pure structural wrapper — skip
  } else if (tagName === "li") {
    const stripped = text.replace(/<[^>]+>/g, "").trim();
    if (stripped) lists.push(stripped);
  } else {
    const stripped = text.replace(/<[^>]+>/g, "").trim();
    if (stripped) paragraphs.push(stripped);
    else if (!tagName) paragraphs.push(text);
  }
};

// PATH 1:
// headingBlocks (h1–h6) → word count only
// paragraphBlocks (p, blockquote) → paragraph + sentence metrics
// listBlocks (li) → word count + sentence metrics (not paragraph count)
export const parseBlocksJSON = (blocks) => {
  const headingBlocks = [];
  const paragraphBlocks = [];
  const listBlocks = [];

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { headingBlocks, paragraphBlocks, listBlocks };
  }

  const collectListItems = (children) => {
    for (const item of children || []) {
      if (item?.type === "list-item") {
        const textParts = [];
        const nestedLists = [];
        for (const child of item.children || []) {
          if (child?.type === "list") {
            nestedLists.push(child);
          } else {
            textParts.push(child);
          }
        }
        const text = extractTextFromChildren(textParts).trim();
        if (text) listBlocks.push(text);
        for (const nested of nestedLists) {
          collectListItems(nested.children);
        }
      }
    }
  };

  for (const block of blocks) {
    if (!block || typeof block.type !== "string") continue;

    switch (block.type) {
      case "heading": {
        const text = extractTextFromChildren(block.children).trim();
        if (text) headingBlocks.push(text);
        break;
      }
      case "paragraph":
      case "quote":
      case "code": {
        const rawText = extractTextFromChildren(block.children).trim();
        if (!rawText) break;
        const tagName = detectPastedHtmlTag(rawText);
        if (tagName) {
          classifyPastedHtml(
            rawText,
            tagName,
            headingBlocks,
            paragraphBlocks,
            listBlocks,
          );
        } else {
          paragraphBlocks.push(rawText);
        }
        break;
      }
      case "list":
        collectListItems(block.children);
        break;
      default:
        break;
    }
  }

  return { headingBlocks, paragraphBlocks, listBlocks };
};

// PATH 2: DOM extraction fallback (used when Blocks JSON is unavailable)
// Uses leaf-block filter to avoid double-counting Slate's <li><p>text</p></li> nesting
export const extractStructuredContentFromEditor = (editor) => {
  const headingBlocks = [];
  const paragraphBlocks = [];
  const listBlocks = [];

  if (!editor) return { headingBlocks, paragraphBlocks, listBlocks };

  const clone = editor.cloneNode(true);
  clone
    .querySelectorAll("[data-slate-zero-width]")
    .forEach((el) => el.remove());

  const allBlocks = Array.from(clone.querySelectorAll(BLOCK_SEL));
  const leafBlocks = allBlocks.filter((el) => !el.querySelector(BLOCK_SEL));

  leafBlocks.forEach((el) => {
    const text = cleanText(el.textContent || "");
    if (!text) return;

    const tag = el.tagName.toLowerCase();
    const insideList = !!el.closest("li");

    if (/^h[1-6]$/.test(tag)) {
      headingBlocks.push(text);
    } else if (tag === "li" || insideList) {
      listBlocks.push(text);
    } else {
      const tagName = detectPastedHtmlTag(text);
      if (tagName) {
        classifyPastedHtml(
          text,
          tagName,
          headingBlocks,
          paragraphBlocks,
          listBlocks,
        );
      } else {
        paragraphBlocks.push(text);
      }
    }
  });

  return { headingBlocks, paragraphBlocks, listBlocks };
};

export const extractEditorText = (editor) => {
  if (!editor) return "";
  const clone = editor.cloneNode(true);
  clone
    .querySelectorAll("[data-slate-zero-width]")
    .forEach((el) => el.remove());

  const allBlocks = Array.from(clone.querySelectorAll(BLOCK_SEL));
  const blockEls = allBlocks.filter((el) => !el.querySelector(BLOCK_SEL));

  if (blockEls.length > 0) {
    return blockEls
      .map((el) => cleanText(el.textContent || ""))
      .filter(Boolean)
      .join(" ");
  }
  return cleanText(clone.textContent || clone.innerText || "");
};
