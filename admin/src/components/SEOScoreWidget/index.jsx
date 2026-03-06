import React, { useMemo, useState, useEffect } from "react";
import { Box, Typography, Flex } from "@strapi/design-system";
import { unstable_useContentManagerContext } from "@strapi/strapi/admin";

import {
  countGraphemes,
  countWords,
  isEffectivelyEmpty,
  splitSentences,
  calcReadingTime,
  formatReadingTime,
  cleanText,
} from "../../utils/textAnalysis.js";
import {
  parseBlocksJSON,
  extractStructuredContentFromEditor,
} from "../../utils/blocksParser.js";
import {
  SEO_FIELD_NAMES,
  BLOCK_SEL,
  CONTENT_WORD_MIN,
  CONTENT_WORD_MAX,
} from "../../utils/constants.js";
import {
  getTitleStatus,
  getDescStatus,
  getTitleWarning,
  getDescWarning,
  measureTitlePx,
  measureDescPx,
} from "../../utils/seoRules.js";
import {
  findFieldByHint,
  findInputByLabel,
  getAllContentEditables,
} from "../../utils/domHelpers.js";

const getContentText = () => {
  const editables = getAllContentEditables();
  if (editables.length > 0) {
    const parts = editables.map((editable) => {
      const clone = editable.cloneNode(true);
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
    });
    const combined = parts.filter(Boolean).join("\n\n");
    if (combined) return combined;
  }
  return "";
};

const extractAllStructuredContent = () => {
  const headingBlocks = [];
  const paragraphBlocks = [];
  const listBlocks = [];

  getAllContentEditables().forEach((editable) => {
    const result = extractStructuredContentFromEditor(editable);
    headingBlocks.push(...result.headingBlocks);
    paragraphBlocks.push(...result.paragraphBlocks);
    listBlocks.push(...result.listBlocks);
  });

  return { headingBlocks, paragraphBlocks, listBlocks };
};

export const SEOScoreWidget = () => {
  const [mounted, setMounted] = useState(false);
  const [modifiedData, setModifiedData] = useState({
    title: "",
    description: "",
    content: "",
  });
  const [error, setError] = useState(null);
  const [activeField, setActiveField] = useState(null);

  const _ctx = unstable_useContentManagerContext();
  const strapiDoc = /** @type {any} */ (_ctx)?.form?.values ?? null;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const extractFieldData = () => {
      try {
        const titleInput =
          document.querySelector('input[name="title"]') ||
          document.querySelector('input[name="metaTitle"]') ||
          document.querySelector('input[name$=".metaTitle"]') ||
          document.querySelector('[data-strapi-field="title"] input') ||
          findInputByLabel(["meta title", "metatitle"]) ||
          document.querySelector("#title");

        const descInput =
          document.querySelector(
            'textarea[name="metaDescription"],input[name="metaDescription"]',
          ) ||
          document.querySelector(
            'textarea[name$=".metaDescription"],input[name$=".metaDescription"]',
          ) ||
          document.querySelector(
            '[data-strapi-field="metaDescription"] textarea,[data-strapi-field="metaDescription"] input',
          ) ||
          findInputByLabel(["meta description", "metadescription"]) ||
          document.querySelector('input[name="description"]') ||
          document.querySelector('textarea[name="description"]') ||
          document.querySelector('[data-strapi-field="description"] input') ||
          document.querySelector('[data-strapi-field="description"] textarea');

        const allEditables = (() => {
          const r = [];
          const s = new Set();
          document.querySelectorAll("[data-strapi-field]").forEach((field) => {
            const fn = field.getAttribute("data-strapi-field") || "";
            if (SEO_FIELD_NAMES.has(fn)) return;
            const el =
              field.querySelector(
                '[contenteditable="true"],[role="textbox"]',
              ) || field.querySelector("textarea");
            if (el && !s.has(el)) {
              s.add(el);
              r.push(el);
            }
          });
          if (r.length === 0) {
            document
              .querySelectorAll(
                'textarea[name="content"],textarea[name="body"]',
              )
              .forEach((el) => {
                if (!s.has(el)) {
                  s.add(el);
                  r.push(el);
                }
              });
          }
          return r;
        })();

        const contentText = allEditables
          .map((el) =>
            el.tagName === "TEXTAREA"
              ? el.value
              : el.textContent || el.innerText || "",
          )
          .filter(Boolean)
          .join("\n\n");

        setModifiedData({
          title: titleInput?.value || "",
          description: descInput?.value || "",
          content: contentText,
        });
        setError(null);
      } catch (e) {
        setError(e.message);
        console.error("SEO Widget - Error:", e);
      }
    };

    extractFieldData();

    const resolveFieldType = (target) => {
      if (!target) return null;
      const fieldName = target.name || target.getAttribute?.("name") || "";
      const fieldId = target.id || target.getAttribute?.("id") || "";
      const isTitleField =
        fieldName === "title" ||
        fieldName === "metaTitle" ||
        fieldName.endsWith(".title") ||
        fieldName.endsWith(".metaTitle") ||
        fieldId === "title" ||
        fieldId === "metaTitle";
      const isDescField =
        fieldName === "description" ||
        fieldName === "metaDescription" ||
        fieldName.endsWith(".description") ||
        fieldName.endsWith(".metaDescription") ||
        fieldId === "description" ||
        fieldId === "metaDescription";
      if (isTitleField) return "title";
      if (isDescField) return "description";
      const labelDesc = findInputByLabel([
        "meta description",
        "metadescription",
      ]);
      const labelTitle = findInputByLabel(["meta title", "metatitle"]);
      if (labelDesc && target === labelDesc) return "description";
      if (labelTitle && target === labelTitle) return "title";
      return null;
    };

    const handleFieldFocus = (event) => {
      const type = resolveFieldType(event?.target);
      if (type) {
        setActiveField(type);
        extractFieldData();
      }
    };

    const handleFieldChange = (event) => {
      const type = resolveFieldType(event?.target);
      if (type) setActiveField(type);
      extractFieldData();
    };

    const handlePaste = () => setTimeout(extractFieldData, 300);

    let contentObserverTimer = null;
    const contentObserver = new MutationObserver(() => {
      clearTimeout(contentObserverTimer);
      contentObserverTimer = setTimeout(extractFieldData, 200);
    });

    const handleContentInteraction = () => {
      setActiveField("content");
      extractFieldData();
    };

    const attachContentEditor = () => {
      const editables = [];
      const seenAttach = new Set();
      document.querySelectorAll("[data-strapi-field]").forEach((field) => {
        const fn = field.getAttribute("data-strapi-field") || "";
        if (SEO_FIELD_NAMES.has(fn)) return;
        const el = field.querySelector(
          '[contenteditable="true"],[role="textbox"]',
        );
        if (el && !seenAttach.has(el)) {
          seenAttach.add(el);
          editables.push(el);
        }
      });
      if (editables.length === 0) {
        const fallback = document.querySelector(
          '[contenteditable="true"],[role="textbox"]',
        );
        if (fallback) editables.push(fallback);
      }
      editables.forEach((editable) => {
        if (!editable.dataset.seoContentAttached) {
          contentObserver.observe(editable, {
            characterData: true,
            childList: true,
            subtree: true,
          });
          editable.addEventListener("focus", handleContentInteraction);
          editable.addEventListener("click", handleContentInteraction);
          editable.addEventListener("keyup", handleContentInteraction);
          editable.dataset.seoContentAttached = "true";
          extractFieldData();
        }
      });
    };

    const collectFields = () => {
      const byName = Array.from(
        document.querySelectorAll(
          'input[name="title"],input[name="metaTitle"],input[name$=".metaTitle"],' +
            'textarea[name="metaDescription"],input[name="metaDescription"],' +
            'textarea[name$=".metaDescription"],input[name$=".metaDescription"],' +
            'input[name="description"],textarea[name="description"],' +
            'textarea[name="content"]',
        ),
      );
      const byLabel = [
        findInputByLabel(["meta description", "metadescription"]),
        findInputByLabel(["meta title", "metatitle"]),
      ].filter(Boolean);
      return [...new Set([...byName, ...byLabel])];
    };

    const attachField = (field) => {
      if (field && !field.dataset.seoListenerAttached) {
        field.addEventListener("focus", handleFieldFocus);
        field.addEventListener("click", handleFieldFocus);
        field.addEventListener("input", handleFieldChange);
        field.addEventListener("change", handleFieldChange);
        field.addEventListener("paste", handlePaste);
        field.addEventListener("keyup", handleFieldChange);
        field.addEventListener("blur", handleFieldChange);
        field.dataset.seoListenerAttached = "true";
      }
    };

    const observer = new MutationObserver(() => {
      collectFields().forEach(attachField);
      attachContentEditor();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const initialTimeout = setTimeout(() => {
      collectFields().forEach(attachField);
      attachContentEditor();
      extractFieldData();
    }, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(contentObserverTimer);
      observer.disconnect();
      contentObserver.disconnect();

      document
        .querySelectorAll("[data-seo-listener-attached]")
        .forEach((field) => {
          field.removeEventListener("focus", handleFieldFocus);
          field.removeEventListener("click", handleFieldFocus);
          field.removeEventListener("input", handleFieldChange);
          field.removeEventListener("change", handleFieldChange);
          field.removeEventListener("paste", handlePaste);
          field.removeEventListener("keyup", handleFieldChange);
          field.removeEventListener("blur", handleFieldChange);
          delete field.dataset.seoListenerAttached;
        });

      document.querySelectorAll("[data-seo-content-attached]").forEach((el) => {
        el.removeEventListener("focus", handleContentInteraction);
        el.removeEventListener("click", handleContentInteraction);
        el.removeEventListener("keyup", handleContentInteraction);
        delete el.dataset.seoContentAttached;
      });
    };
  }, []);

  const analysis = useMemo(() => {
    if (!mounted || !modifiedData || typeof modifiedData !== "object") {
      return {
        percentage: 0,
        checks: [
          {
            label: error ? `Error: ${error}` : "Waiting for content data...",
            passed: false,
          },
        ],
        categoryScores: {
          title: { score: 0, max: 30 },
          description: { score: 0, max: 30 },
          contentLength: { score: 0, max: 40 },
          sentenceLength: { score: 0, max: 10 },
          paragraphLength: { score: 0, max: 10 },
          paragraphDensity: { score: 0, max: 10 },
        },
        stats: { charCount: 0, wordCount: 0, readingTime: 0 },
        fieldStats: {
          title: { chars: 0, words: 0, readingTimeSec: 0 },
          description: { chars: 0, words: 0, readingTimeSec: 0 },
          content: {
            words: 0,
            sentences: 0,
            paragraphs: 0,
            longSentences: 0,
            readingTime: 0,
          },
        },
      };
    }

    let score = 0;
    let maxScore = 0;
    const checks = [];
    const categoryScores = {
      title: { score: 0, max: 30 },
      description: { score: 0, max: 30 },
      contentLength: { score: 0, max: 40 },
      sentenceLength: { score: 0, max: 10 },
      paragraphLength: { score: 0, max: 10 },
      paragraphDensity: { score: 0, max: 10 },
    };

    const ALL_FIELDS = ["content", "body", "description", "excerpt", "summary"];
    const BODY_FIELDS = ["content", "body", "excerpt", "summary"];
    let wordCount = 0;
    let charCount = 0;

    const normalizeText = (raw) => {
      if (!raw || typeof raw !== "string") return "";
      return raw
        .replace(/<[^>]*>/g, " ")
        .replace(/[\u200B\u200C\uFEFF\u200E\u200F\u2060]/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/[\r\n]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    };

    const allFieldTexts = [];
    if (modifiedData.title) allFieldTexts.push(modifiedData.title);
    ALL_FIELDS.forEach((f) => {
      if (modifiedData[f]) allFieldTexts.push(modifiedData[f]);
    });

    const bodyFieldTexts = [];
    BODY_FIELDS.forEach((f) => {
      if (modifiedData[f]) bodyFieldTexts.push(modifiedData[f]);
    });

    const normalizedAllFields = allFieldTexts
      .map(normalizeText)
      .filter(Boolean);
    const normalizedBodyFields = bodyFieldTexts
      .map(normalizeText)
      .filter(Boolean);
    charCount = normalizedAllFields.reduce(
      (sum, text) => sum + countGraphemes(text),
      0,
    );

    const _blocksJSON = (() => {
      if (!strapiDoc) return null;
      for (const key of Object.keys(strapiDoc)) {
        if (SEO_FIELD_NAMES.has(key)) continue;
        const v = strapiDoc[key];
        if (Array.isArray(v) && v.length > 0 && v[0]?.type) return v;
      }
      return null;
    })();

    const { headingBlocks, paragraphBlocks, listBlocks } = _blocksJSON
      ? parseBlocksJSON(_blocksJSON)
      : extractAllStructuredContent();
    const domHasBlocks =
      headingBlocks.length + paragraphBlocks.length + listBlocks.length > 0;

    const allBlocksText = domHasBlocks
      ? [...headingBlocks, ...paragraphBlocks, ...listBlocks].join(" ")
      : normalizedBodyFields.join(" ");
    wordCount = countWords(allBlocksText);
    const readingTime = calcReadingTime(wordCount);

    maxScore += 30;
    if (!isEffectivelyEmpty(modifiedData.title)) {
      const titleTrimmed = modifiedData.title.trim();
      const titleLength = countGraphemes(modifiedData.title);
      const titleGLen = countGraphemes(titleTrimmed);
      const titlePx = measureTitlePx(titleTrimmed);

      let charLevel, charMsg;
      if (titleGLen === 0) {
        charLevel = "error";
        charMsg = "❌ Title missing";
      } else if (titleGLen < 30) {
        charLevel = "error";
        charMsg = `❌ Title too short (${titleLength} chars) — Minimum recommended length is 30 characters.`;
      } else if (titleGLen <= 49) {
        charLevel = "warning";
        charMsg = `⚠️ Title shorter than recommended (${titleLength} chars) — Ideal: 50–60 characters.`;
      } else if (titleGLen <= 60) {
        charLevel = "success";
        charMsg = `✅ Title length is optimal for search results (${titleLength} chars).`;
      } else if (titleGLen <= 65) {
        charLevel = "warning";
        charMsg = `⚠️ Title may be truncated in search results (${titleLength} chars).`;
      } else {
        charLevel = "error";
        charMsg = `❌ Title exceeds recommended length (${titleLength} chars) — Ideal: 50–60 characters.`;
      }

      let pxLevel = null,
        pxMsg = null;
      if (titlePx !== null) {
        if (titlePx <= 580) {
          pxLevel = "success";
          pxMsg = "✅ Title pixel width is optimal for Google SERP.";
        } else if (titlePx <= 600) {
          pxLevel = "warning";
          pxMsg = "⚠️ Title is close to Google truncation limit.";
        } else {
          pxLevel = "error";
          pxMsg = "❌ Title will likely be truncated in Google results.";
        }
      }

      const levels = [charLevel, pxLevel].filter(Boolean);
      const worstLevel = levels.includes("error")
        ? "error"
        : levels.includes("warning")
        ? "warning"
        : "success";
      const titleScore =
        worstLevel === "success" ? 30 : worstLevel === "warning" ? 20 : 10;
      score += titleScore;
      categoryScores.title.score = titleScore;

      checks.push({ label: charMsg, passed: charLevel === "success" });
      if (pxMsg) checks.push({ label: pxMsg, passed: pxLevel === "success" });
    } else {
      checks.push({ label: "❌ Title missing", passed: false });
    }

    maxScore += 30;
    let hasDescription = false;

    if (!isEffectivelyEmpty(modifiedData.description)) {
      const descTrimmed = modifiedData.description.trim();
      const descLength = countGraphemes(modifiedData.description);
      const descGLen = countGraphemes(descTrimmed);
      const descPx = measureDescPx(descTrimmed);

      let charLevel, charMsg;
      if (descGLen < 120) {
        charLevel = "error";
        charMsg = `❌ Description is too short (${descLength} chars). Add more details. (ideal: 150–160)`;
      } else if (descGLen <= 149) {
        charLevel = "warning";
        charMsg = `⚠️ Description is shorter than ideal (${descLength} chars). Aim for 150–160.`;
      } else if (descGLen <= 160) {
        charLevel = "success";
        charMsg = `✅ Description length is optimal (${descLength} chars).`;
      } else if (descGLen <= 165) {
        charLevel = "warning";
        charMsg = `⚠️ Description may be truncated (${descLength} chars). Keep under 160.`;
      } else {
        charLevel = "error";
        charMsg = `❌ Description exceeds recommended length (${descLength} chars). Shorten to 150–160.`;
      }

      let pxLevel = null,
        pxMsg = null;
      if (descPx !== null) {
        if (descPx <= 920) {
          pxLevel = "success";
          pxMsg = "✅ Description pixel width is optimal.";
        } else if (descPx <= 960) {
          pxLevel = "warning";
          pxMsg = "⚠️ Description is close to Google truncation limit.";
        } else {
          pxLevel = "error";
          pxMsg = "❌ Description will likely be truncated in Google results.";
        }
      }

      const levels = [charLevel, pxLevel].filter(Boolean);
      const worstLevel = levels.includes("error")
        ? "error"
        : levels.includes("warning")
        ? "warning"
        : "success";
      const descScore =
        worstLevel === "success" ? 30 : worstLevel === "warning" ? 20 : 10;
      score += descScore;
      categoryScores.description.score = descScore;
      hasDescription = true;

      checks.push({ label: charMsg, passed: charLevel === "success" });
      if (pxMsg) checks.push({ label: pxMsg, passed: pxLevel === "success" });
    }

    if (!hasDescription) {
      checks.push({
        label: "❌ Add meta description (ideal: 150–160 chars)",
        passed: false,
      });
    }

    maxScore += 40;
    if (wordCount >= 600) {
      score += 40;
      categoryScores.contentLength.score = 40;
      checks.push({
        label: `✅ Excellent content length (${wordCount} words)`,
        passed: true,
      });
    } else if (wordCount >= 300) {
      score += 25;
      categoryScores.contentLength.score = 25;
      checks.push({
        label: `⚠️ Good but aim for 600+ words (${wordCount} words)`,
        passed: false,
      });
    } else if (wordCount >= 100) {
      score += 15;
      categoryScores.contentLength.score = 15;
      checks.push({
        label: `❌ Content too short (${wordCount}/300 words min)`,
        passed: false,
      });
    } else if (wordCount > 0) {
      score += 5;
      categoryScores.contentLength.score = 5;
      checks.push({
        label: `❌ Very short content (${wordCount}/300 words min)`,
        passed: false,
      });
    } else {
      checks.push({ label: "❌ Content missing", passed: false });
    }

    const bodyBlocks = [...paragraphBlocks, ...listBlocks];
    const bodyText = domHasBlocks
      ? bodyBlocks.join(" ")
      : normalizedBodyFields.join(" ");
    const paraArray = domHasBlocks
      ? paragraphBlocks
      : normalizedBodyFields
          .join("\n")
          .split(/\n\s*\n|\n/)
          .filter((p) => p.trim().length > 0);

    const bodyWordCount = countWords(bodyText);
    const sentences = splitSentences(bodyText);

    if (bodyText && bodyWordCount > 0) {
      maxScore += 10;
      if (sentences.length > 0) {
        const avgWordsPerSentence = bodyWordCount / sentences.length;

        if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20) {
          score += 10;
          categoryScores.sentenceLength.score = 10;
          checks.push({
            label: `✅ Ideal sentence length (avg ${Math.round(
              avgWordsPerSentence,
            )} words)`,
            passed: true,
          });
        } else if (avgWordsPerSentence <= 25) {
          score += 7;
          categoryScores.sentenceLength.score = 7;
          checks.push({
            label: `⚠️ Sentences acceptable (avg ${Math.round(
              avgWordsPerSentence,
            )} words). Ideal: 15-20.`,
            passed: false,
          });
        } else if (avgWordsPerSentence <= 35) {
          score += 4;
          categoryScores.sentenceLength.score = 4;
          checks.push({
            label: `⚠️ Sentences too long (avg ${Math.round(
              avgWordsPerSentence,
            )} words). Ideal: 15-20.`,
            passed: false,
          });
        } else {
          score += 2;
          categoryScores.sentenceLength.score = 2;
          checks.push({
            label: `❌ Sentences very long (avg ${Math.round(
              avgWordsPerSentence,
            )} words). Break them up!`,
            passed: false,
          });
        }

        const sentenceWords = sentences.map(
          (s) => s.trim().split(/\s+/).length,
        );
        const longestSentence = Math.max(...sentenceWords);
        if (longestSentence > 35) {
          checks.push({
            label: `⚠️ Longest sentence: ${longestSentence} words (max recommended: 35)`,
            passed: false,
          });
        }
      }

      maxScore += 10;
      if (paraArray.length > 0) {
        const sentencesPerParagraph = paraArray.map(
          (p) => splitSentences(p).length,
        );
        const avgSentencesPerPara =
          sentencesPerParagraph.reduce((a, b) => a + b, 0) / paraArray.length;
        const maxSentencesInPara = Math.max(...sentencesPerParagraph);

        if (avgSentencesPerPara >= 2 && avgSentencesPerPara <= 5) {
          score += 10;
          categoryScores.paragraphLength.score = 10;
          checks.push({
            label: `✅ Good paragraph length (avg ${Math.round(
              avgSentencesPerPara,
            )} sentences)`,
            passed: true,
          });
        } else if (avgSentencesPerPara <= 6) {
          score += 7;
          categoryScores.paragraphLength.score = 7;
          checks.push({
            label: `⚠️ Paragraphs slightly long (avg ${Math.round(
              avgSentencesPerPara,
            )} sentences). Ideal: 2-5.`,
            passed: false,
          });
        } else if (avgSentencesPerPara <= 8) {
          score += 4;
          categoryScores.paragraphLength.score = 4;
          checks.push({
            label: `⚠️ Paragraphs too long (avg ${Math.round(
              avgSentencesPerPara,
            )} sentences). Break them up!`,
            passed: false,
          });
        } else {
          score += 2;
          categoryScores.paragraphLength.score = 2;
          checks.push({
            label: `❌ Paragraphs very long (avg ${Math.round(
              avgSentencesPerPara,
            )} sentences). Ideal: 2-5.`,
            passed: false,
          });
        }
        if (maxSentencesInPara > 8) {
          checks.push({
            label: `⚠️ Longest paragraph: ${maxSentencesInPara} sentences (max recommended: 8)`,
            passed: false,
          });
        }
      }

      maxScore += 10;
      if (paraArray.length > 0) {
        const wordsPerParagraph = paraArray.map((p) => countWords(p));
        const avgWordsPerPara =
          wordsPerParagraph.reduce((a, b) => a + b, 0) / paraArray.length;
        const maxWordsInPara = Math.max(...wordsPerParagraph);

        if (avgWordsPerPara >= 40 && avgWordsPerPara <= 120) {
          score += 10;
          categoryScores.paragraphDensity.score = 10;
          checks.push({
            label: `✅ Perfect paragraph density (avg ${Math.round(
              avgWordsPerPara,
            )} words)`,
            passed: true,
          });
        } else if (avgWordsPerPara <= 150) {
          score += 7;
          categoryScores.paragraphDensity.score = 7;
          checks.push({
            label: `⚠️ Paragraphs acceptable (avg ${Math.round(
              avgWordsPerPara,
            )} words). Ideal: 40-120.`,
            passed: false,
          });
        } else if (avgWordsPerPara <= 200) {
          score += 4;
          categoryScores.paragraphDensity.score = 4;
          checks.push({
            label: `⚠️ Paragraphs too dense (avg ${Math.round(
              avgWordsPerPara,
            )} words). Break them up!`,
            passed: false,
          });
        } else {
          score += 2;
          categoryScores.paragraphDensity.score = 2;
          checks.push({
            label: `❌ Paragraphs very dense (avg ${Math.round(
              avgWordsPerPara,
            )} words). Ideal: 40-120.`,
            passed: false,
          });
        }
        if (maxWordsInPara > 200) {
          checks.push({
            label: `⚠️ Heaviest paragraph: ${maxWordsInPara} words (max recommended: 200)`,
            passed: false,
          });
        }
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const getRawFieldValue = (name) => {
      const el = document.querySelector(
        `input[name="${name}"], textarea[name="${name}"]`,
      );
      return el
        ? el.value
        : typeof modifiedData[name] === "string"
        ? modifiedData[name]
        : "";
    };

    const rawTitle = getRawFieldValue("title");
    const rawDesc = getRawFieldValue("description");

    const contentParagraphCount = domHasBlocks
      ? Math.max(paragraphBlocks.length, wordCount > 0 ? 1 : 0)
      : (() => {
          let total = 0;
          getAllContentEditables().forEach((editable) => {
            total += Array.from(
              editable.querySelectorAll("p, blockquote"),
            ).filter((el) =>
              /\S/.test(
                (el.textContent || "").replace(/[\u200b\uFEFF\u2060]/g, ""),
              ),
            ).length;
          });
          if (total > 0) return total;
          const raw = getContentText();
          const lines = raw.split(/\n+/).filter((p) => p.trim().length > 0);
          return lines.length || (wordCount > 0 ? 1 : 0);
        })();

    const contentSentenceCount = sentences.length;
    const contentLongSentences = sentences.filter(
      (s) => s.trim().split(/\s+/).filter(Boolean).length > 25,
    ).length;
    const contentReadingTime = calcReadingTime(wordCount);

    const editorHasAnyContent = getAllContentEditables().some((el) => {
      const visible = (el.innerText || el.textContent || "").replace(
        /[\u200b\uFEFF\u2060]/g,
        "",
      );
      return (
        /\S/.test(visible) ||
        el.querySelector("img, video, audio, iframe, figure") !== null
      );
    });

    const rawContent = getContentText();
    const contentWords = countWords(rawContent) || wordCount;

    const contentErrors = [];
    const contentWarnings = [];
    if (!editorHasAnyContent && isEffectivelyEmpty(rawContent)) {
      contentErrors.push("Content is required.");
    } else {
      const hasRealContent = rawContent.replace(/\n/g, "").trim().length > 0;
      if (!hasRealContent) {
        contentErrors.push("Content has empty paragraphs only.");
      } else {
        if (contentWords < CONTENT_WORD_MIN) {
          contentErrors.push(
            `Content must be at least ${CONTENT_WORD_MIN} words. (${contentWords} / ${CONTENT_WORD_MIN})`,
          );
        }
        if (contentWords > CONTENT_WORD_MAX) {
          contentErrors.push(
            `Content must not exceed ${CONTENT_WORD_MAX} words. (${contentWords} / ${CONTENT_WORD_MAX})`,
          );
        }
      }
    }
    if (contentLongSentences > 0) {
      contentWarnings.push(
        `${contentLongSentences} sentence${
          contentLongSentences > 1 ? "s exceed" : " exceeds"
        } 25 words — consider breaking them up.`,
      );
    }

    const fieldStats = {
      title: {
        chars: countGraphemes(rawTitle),
        words: countWords(rawTitle),
        readingTimeSec: Math.round((countWords(rawTitle) * 60) / 200),
      },
      description: {
        chars: countGraphemes(rawDesc),
        words: countWords(rawDesc),
        readingTimeSec: Math.round((countWords(rawDesc) * 60) / 200),
      },
      content: {
        words: contentWords,
        sentences: contentSentenceCount,
        paragraphs: contentParagraphCount,
        longSentences: contentLongSentences,
        readingTime: contentReadingTime,
        errors: contentErrors,
        warnings: contentWarnings,
      },
    };

    return {
      percentage,
      checks,
      categoryScores,
      stats: { charCount, wordCount, readingTime },
      fieldStats,
    };
  }, [mounted, modifiedData, error, strapiDoc]);

  if (!mounted) return null;

  return (
    <Box padding={0} background="neutral0" marginBottom={2}>
      <Flex direction="column" alignItems="stretch" gap={0}>
        <Box
          padding={4}
          background="neutral100"
          borderColor="neutral150"
          borderStyle="solid"
          borderWidth="0 0 1px 0"
          marginBottom={2}
          hasRadius
        >
          <Typography
            variant="sigma"
            textColor="neutral600"
            style={{ letterSpacing: "0.04em" }}
          >
            {activeField === "title"
              ? "Title Statistics:"
              : activeField === "description"
              ? "Description Statistics:"
              : "Content Statistics:"}
          </Typography>

          {!activeField && (
            <Box marginTop={3}>
              <Typography variant="pi" textColor="neutral400">
                Start typing in a field to see statistics.
              </Typography>
            </Box>
          )}

          {(activeField === "title" || activeField === "description") &&
            (() => {
              const fieldStat = analysis.fieldStats?.[activeField] ?? {
                chars: 0,
                words: 0,
                readingTimeSec: 0,
              };
              const rtSec = fieldStat.readingTimeSec ?? 0;
              const rtLabel =
                rtSec === 0
                  ? "0 sec"
                  : rtSec < 60
                  ? `${rtSec} sec`
                  : `${Math.ceil(rtSec / 60)} min`;
              return (
                <Box marginTop={3}>
                  <Flex alignItems="center" gap={2} marginBottom={2}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#666687",
                          fontFamily: "serif",
                          lineHeight: 1,
                        }}
                      >
                        T
                      </span>
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      Characters:{" "}
                      <strong style={{ color: "#32324d" }}>
                        {fieldStat.chars.toLocaleString()}
                      </strong>
                    </Typography>
                  </Flex>
                  <Flex alignItems="center" gap={2} marginBottom={2}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="13"
                        height="14"
                        viewBox="0 0 13 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="1"
                          y="1"
                          width="11"
                          height="12"
                          rx="1.5"
                          stroke="#666687"
                          strokeWidth="1.2"
                          fill="none"
                        />
                        <line
                          x1="3.5"
                          y1="4.5"
                          x2="9.5"
                          y2="4.5"
                          stroke="#666687"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                        <line
                          x1="3.5"
                          y1="7"
                          x2="9.5"
                          y2="7"
                          stroke="#666687"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                        <line
                          x1="3.5"
                          y1="9.5"
                          x2="7"
                          y2="9.5"
                          stroke="#666687"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                      </svg>
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      Words:{" "}
                      <strong style={{ color: "#32324d" }}>
                        {fieldStat.words.toLocaleString()}
                      </strong>
                    </Typography>
                  </Flex>
                  <Flex alignItems="center" gap={2}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="7"
                          cy="7"
                          r="5.5"
                          stroke="#666687"
                          strokeWidth="1.2"
                          fill="none"
                        />
                        <line
                          x1="7"
                          y1="7"
                          x2="7"
                          y2="4"
                          stroke="#666687"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="7"
                          y1="7"
                          x2="9.5"
                          y2="8.5"
                          stroke="#666687"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      Reading Time:{" "}
                      <strong style={{ color: "#32324d" }}>{rtLabel}</strong>{" "}
                      <span style={{ color: "#8e8ea9" }}>(200 wpm)</span>
                    </Typography>
                  </Flex>
                </Box>
              );
            })()}

          {activeField === "content" &&
            (() => {
              const cs = analysis.fieldStats?.content ?? {
                words: 0,
                sentences: 0,
                paragraphs: 0,
                longSentences: 0,
                readingTime: 0,
                errors: [],
                warnings: [],
              };
              const wordColor =
                cs.words === 0
                  ? "#d02b20"
                  : cs.words < 300
                  ? "#d02b20"
                  : cs.words > 5000
                  ? "#c07000"
                  : "#328048";
              return (
                <Box marginTop={3}>
                  <Flex alignItems="center" gap={2} marginBottom={2}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="13"
                        height="14"
                        viewBox="0 0 13 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="1"
                          y="1"
                          width="11"
                          height="12"
                          rx="1.5"
                          stroke="#666687"
                          strokeWidth="1.2"
                          fill="none"
                        />
                        <line
                          x1="3.5"
                          y1="4.5"
                          x2="9.5"
                          y2="4.5"
                          stroke="#666687"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                        <line
                          x1="3.5"
                          y1="7"
                          x2="9.5"
                          y2="7"
                          stroke="#666687"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                        <line
                          x1="3.5"
                          y1="9.5"
                          x2="7"
                          y2="9.5"
                          stroke="#666687"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                      </svg>
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      Words:{" "}
                      <strong style={{ color: wordColor }}>
                        {cs.words.toLocaleString()}
                      </strong>
                      {cs.words < 300 && cs.words > 0 && (
                        <span
                          style={{
                            color: "#d02b20",
                            fontSize: 11,
                            marginLeft: 4,
                          }}
                        >
                          ({300 - cs.words} to go)
                        </span>
                      )}
                      {cs.words > 5000 && (
                        <span
                          style={{
                            color: "#c07000",
                            fontSize: 11,
                            marginLeft: 4,
                          }}
                        >
                          ({cs.words - 5000} over limit)
                        </span>
                      )}
                    </Typography>
                  </Flex>
                  <Flex alignItems="center" gap={2} marginBottom={2}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="14"
                        height="12"
                        viewBox="0 0 14 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <line
                          x1="1"
                          y1="2"
                          x2="13"
                          y2="2"
                          stroke="#666687"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="1"
                          y1="6"
                          x2="10"
                          y2="6"
                          stroke="#666687"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <circle cx="12" cy="10" r="1" fill="#666687" />
                      </svg>
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      Sentences:{" "}
                      <strong style={{ color: "#32324d" }}>
                        {cs.sentences}
                      </strong>
                      {cs.longSentences > 0 && (
                        <span
                          style={{
                            color: "#c07000",
                            fontSize: 11,
                            marginLeft: 4,
                          }}
                        >
                          ({cs.longSentences} long{" "}
                          {cs.longSentences === 1 ? "sentence" : "sentences"}{" "}
                          &gt;25 words)
                        </span>
                      )}
                    </Typography>
                  </Flex>
                  <Flex alignItems="center" gap={2} marginBottom={2}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="13"
                        height="14"
                        viewBox="0 0 13 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="1"
                          y="1"
                          width="11"
                          height="5"
                          rx="1"
                          stroke="#666687"
                          strokeWidth="1.2"
                          fill="none"
                        />
                        <rect
                          x="1"
                          y="8"
                          width="11"
                          height="5"
                          rx="1"
                          stroke="#666687"
                          strokeWidth="1.2"
                          fill="none"
                        />
                      </svg>
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      Paragraphs:{" "}
                      <strong style={{ color: "#32324d" }}>
                        {cs.paragraphs}
                      </strong>
                    </Typography>
                  </Flex>
                  <Flex alignItems="center" gap={2}>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="7"
                          cy="7"
                          r="5.5"
                          stroke="#666687"
                          strokeWidth="1.2"
                          fill="none"
                        />
                        <line
                          x1="7"
                          y1="7"
                          x2="7"
                          y2="4"
                          stroke="#666687"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="7"
                          y1="7"
                          x2="9.5"
                          y2="8.5"
                          stroke="#666687"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      Reading Time:{" "}
                      <strong style={{ color: "#32324d" }}>
                        {formatReadingTime(cs.words)}
                      </strong>{" "}
                      <span style={{ color: "#8e8ea9" }}>(200 wpm)</span>
                    </Typography>
                  </Flex>
                </Box>
              );
            })()}
        </Box>
      </Flex>
    </Box>
  );
};
