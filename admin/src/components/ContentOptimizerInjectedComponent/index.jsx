import React, { useEffect, useState, useRef } from "react";
import { unstable_useContentManagerContext } from "@strapi/strapi/admin";

import {
  countGraphemes,
  countWords,
  isEffectivelyEmpty,
  splitSentences,
  calcReadingTime,
} from "../../utils/textAnalysis.js";
import {
  parseBlocksJSON,
  extractStructuredContentFromEditor,
} from "../../utils/blocksParser.js";
import { CONTENT_WORD_MIN, CONTENT_WORD_MAX } from "../../utils/constants.js";
import {
  getTitleStatus,
  getDescStatus,
  getTitleWarning,
  getDescWarning,
} from "../../utils/seoRules.js";
import {
  getTitleInput,
  getDescInput,
  getContentEditors,
  findFieldByHint,
  findInputByLabel,
  getOrCreateFeedback,
  getOrCreateContentStats,
  isContentManagerRoute,
} from "../../utils/domHelpers.js";

export const ContentOptimizerInjectedComponent = () => {
  const [mounted, setMounted] = useState(false);

  const docDataRef = useRef(null);
  const _ctx = unstable_useContentManagerContext();
  docDataRef.current = /** @type {any} */ (_ctx)?.form?.values ?? null;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const analyzeContent = (editor, fieldName, docData) => {
      let headingBlocks, paragraphBlocks, listBlocks;

      // Prefer Blocks JSON over DOM - more accurate and works on unsaved docs
      const fieldValue = docData?.[fieldName];
      if (
        Array.isArray(fieldValue) &&
        fieldValue.length > 0 &&
        fieldValue[0]?.type
      ) {
        ({ headingBlocks, paragraphBlocks, listBlocks } =
          parseBlocksJSON(fieldValue));
      } else {
        ({ headingBlocks, paragraphBlocks, listBlocks } =
          extractStructuredContentFromEditor(editor));
      }

      const allText = [
        ...headingBlocks,
        ...paragraphBlocks,
        ...listBlocks,
      ].join(" ");
      const bodyText = [...paragraphBlocks, ...listBlocks].join(" ");

      if (isEffectivelyEmpty(allText)) {
        const hasMedia = !!editor?.querySelector(
          "img, video, audio, iframe, figure",
        );
        return {
          wordCount: 0,
          sentenceCount: 0,
          paragraphCount: 0,
          longSentenceCount: 0,
          readingTime: 0,
          hasMedia,
        };
      }

      const wordCount = countWords(allText);
      const sentences = splitSentences(bodyText);
      const sentenceCount = sentences.length;
      const longSentenceCount = sentences.filter(
        (s) => countWords(s) > 25,
      ).length;
      const paragraphCount = Math.max(
        paragraphBlocks.length,
        wordCount > 0 ? 1 : 0,
      );
      const readingTime = calcReadingTime(wordCount);

      return {
        wordCount,
        sentenceCount,
        paragraphCount,
        longSentenceCount,
        readingTime,
        hasMedia: false,
      };
    };

    const getContentValidation = (stats) => {
      const errors = [];
      const warnings = [];
      const { wordCount, longSentenceCount, hasMedia } = stats;

      if (wordCount === 0 && !hasMedia) {
        errors.push("Content is required.");
      } else if (wordCount > 0) {
        if (wordCount < CONTENT_WORD_MIN) {
          errors.push(
            `Content must be at least ${CONTENT_WORD_MIN} words. (${wordCount} / ${CONTENT_WORD_MIN})`,
          );
        }
        if (wordCount > CONTENT_WORD_MAX) {
          errors.push(
            `Content must not exceed ${CONTENT_WORD_MAX} words. (${wordCount} / ${CONTENT_WORD_MAX})`,
          );
        }
      }

      if (longSentenceCount > 0) {
        warnings.push(
          `${longSentenceCount} sentence${
            longSentenceCount > 1 ? "s exceed" : " exceeds"
          } 25 words, consider breaking them up.`,
        );
      }

      return { errors, warnings };
    };

    const renderFeedback = (wrapper, chars, words, status, warning) => {
      if (!wrapper) return;

      const statParts = [
        `<span>${chars} characters</span>`,
        `<span style="color:#d9d9e3">|</span>`,
        `<span>${words} word${words === 1 ? "" : "s"}</span>`,
      ];
      if (status) {
        statParts.push(`<span style="color:#d9d9e3">|</span>`);
        statParts.push(
          `<span style="display:inline-flex;align-items:center;gap:2px;">` +
            `<span style="color:${status.color};font-size:8px;line-height:1;">●</span>` +
            `<span style="color:${status.color};font-weight:600;">${status.label}</span>` +
            `</span>`,
        );
      }

      const statHtml = `
        <div style="display:flex;align-items:center;gap:6px;
          font-size:12px;color:#666687;margin-top:4px;margin-bottom:6px;
          font-family:inherit;flex-wrap:wrap;"
        >${statParts.join("")}</div>`;

      let cardHtml = "";
      if (status) {
        const lbl = status.label;
        let bg, border, color, icon;
        if (lbl === "Optimal") {
          bg = "#eafbea";
          border = "1.5px solid #67ae6e";
          color = "#1d6b3e";
          icon = "✅";
        } else if (lbl === "Short" || lbl === "Long") {
          bg = "#fdf4dc";
          border = "1.5px solid #f5c842";
          color = "#73520f";
          icon = "⚠️";
        } else {
          bg = "#fce8e8";
          border = "1.5px solid #d02b20";
          color = "#b5180d";
          icon = "🔴";
        }
        const bodyHtml = warning
          ? `<div style="font-weight:600;">${icon} ${lbl}</div>
             <div style="margin-top:2px;font-size:11px;opacity:0.85;">${warning}</div>`
          : `<span style="font-weight:600;">${icon} ${lbl}</span>`;
        cardHtml = `<div style="
          background:${bg};border:${border};border-radius:6px;
          padding:8px 12px;margin-bottom:16px;
          font-size:12px;color:${color};font-family:inherit;line-height:1.5;
        ">${bodyHtml}</div>`;
      } else {
        cardHtml = `<div style="margin-bottom:12px;"></div>`;
      }

      wrapper.innerHTML = statHtml + cardHtml;
    };

    const renderContentStats = (wrapper, stats, validation) => {
      if (!wrapper) return;
      const { wordCount, sentenceCount, paragraphCount } = stats;
      const { errors, warnings } = validation;

      const statusColor =
        errors.length > 0
          ? wordCount < CONTENT_WORD_MIN || wordCount > CONTENT_WORD_MAX
            ? "#d02b20"
            : "#d02b20"
          : "#328048";
      const statusLabel =
        errors.length > 0
          ? wordCount < CONTENT_WORD_MIN
            ? "Too Short"
            : wordCount > CONTENT_WORD_MAX
            ? "Too Long"
            : "Error"
          : "Optimal";

      const statHtml = `
  <div style="
    display:flex;align-items:center;gap:6px;flex-wrap:wrap;
    font-size:12px;color:#666687;margin-top:6px;margin-bottom:6px;
    font-family:inherit;
  ">
    <span>No of Paragraph - ${paragraphCount}</span>
    <span style="color:#d9d9e3">|</span>
    <span>No of Sentences - ${sentenceCount}</span>
    <span style="color:#d9d9e3">|</span>
    <span>No of Words - ${wordCount.toLocaleString()}</span>
    ${
      wordCount > 0
        ? `
    <span style="color:#d9d9e3">|</span>
    <span style="display:inline-flex;align-items:center;gap:2px;">
      <span style="color:${statusColor};font-size:8px;line-height:1;">●</span>
      <span style="color:${statusColor};font-weight:600;">${statusLabel}</span>
    </span>`
        : ""
    }
  </div>`;

      let cardHtml = "";
      if (wordCount > 0) {
        let bg, border, color, icon, label, detail;

        if (errors.length > 0) {
          bg = "#fce8e8";
          border = "1.5px solid #d02b20";
          color = "#b5180d";
          icon = "🔴";
          label =
            wordCount < CONTENT_WORD_MIN
              ? "Too Short"
              : wordCount > CONTENT_WORD_MAX
              ? "Too Long"
              : "Error";
          detail = errors[0];
        } else {
          bg = "#eafbea";
          border = "1.5px solid #67ae6e";
          color = "#1d6b3e";
          icon = "✅";
          label = "Optimal";
          detail = warnings.length > 0 ? warnings[0] : null;
        }

        const bodyHtml = detail
          ? `<div style="font-weight:600;">${icon} ${label}</div>
             <div style="margin-top:2px;font-size:11px;opacity:0.85;">${detail}</div>`
          : `<span style="font-weight:600;">${icon} ${label}</span>`;

        cardHtml = `<div style="
          background:${bg};border:${border};border-radius:6px;
          padding:8px 12px;margin-bottom:16px;
          font-size:12px;color:${color};font-family:inherit;line-height:1.5;
        ">${bodyHtml}</div>`;
      } else {
        cardHtml = `<div style="margin-bottom:12px;"></div>`;
      }

      wrapper.innerHTML = statHtml + cardHtml;
    };

    const update = () => {
      if (!isContentManagerRoute()) {
        document
          .querySelectorAll("[data-optimizer-feedback]")
          .forEach((el) => el.remove());
        return;
      }

      const titleInput = getTitleInput();
      const descInput = getDescInput();

      if (titleInput) {
        const text = titleInput.value || "";
        const trimmed = text.trim();
        const chars = countGraphemes(text);
        const trimmedChars = countGraphemes(trimmed);
        const words = countWords(text);
        const wrapper = getOrCreateFeedback(titleInput, "cop-title-feedback");
        renderFeedback(
          wrapper,
          chars,
          words,
          isEffectivelyEmpty(text) ? null : getTitleStatus(trimmedChars),
          isEffectivelyEmpty(text)
            ? null
            : getTitleWarning(trimmedChars, trimmed),
        );
      }

      if (descInput) {
        const text = descInput.value || "";
        const trimmed = text.trim();
        const chars = countGraphemes(text);
        const trimmedChars = countGraphemes(trimmed);
        const words = countWords(text);
        const wrapper = getOrCreateFeedback(descInput, "cop-desc-feedback");
        renderFeedback(
          wrapper,
          chars,
          words,
          isEffectivelyEmpty(text) ? null : getDescStatus(trimmedChars),
          isEffectivelyEmpty(text)
            ? null
            : getDescWarning(trimmedChars, trimmed),
        );
      }

      getContentEditors().forEach(({ fieldName, editor }) => {
        const stats = analyzeContent(editor, fieldName, docDataRef.current);
        const validation = getContentValidation(stats);
        const wrapper = getOrCreateContentStats(editor, fieldName);
        renderContentStats(wrapper, stats, validation);
      });
    };

    let rafPending = false;
    const scheduleUpdate = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        update();
      });
    };

    const editorObservers = [];

    const attachListeners = () => {
      const sel = [
        '[data-strapi-field="title"] input',
        '[data-strapi-field="title"] textarea',
        '[data-strapi-field="description"] textarea',
        '[data-strapi-field="description"] input',
        '[data-strapi-field="metaDescription"] textarea',
        '[data-strapi-field="metaDescription"] input',
        'input[name="title"]',
        'textarea[name="title"]',
        'textarea[name="description"]',
        'input[name="description"]',
        'textarea[name="metaDescription"]',
        'input[name="metaDescription"]',
        'input[name$=".title"]',
        'textarea[name$=".title"]',
        'textarea[name$=".description"]',
        'input[name$=".description"]',
        'textarea[name$=".metaDescription"]',
        'input[name$=".metaDescription"]',
      ];
      document.querySelectorAll(sel.join(",")).forEach((f) => {
        if (!f.dataset.copAttached) {
          f.addEventListener("input", scheduleUpdate);
          f.addEventListener("change", scheduleUpdate);
          f.addEventListener("paste", () => setTimeout(scheduleUpdate, 200));
          f.dataset.copAttached = "true";
        }
      });

      [
        findFieldByHint(["title"]),
        findInputByLabel(["meta description", "metadescription"]),
      ].forEach((f) => {
        if (f && !f.dataset.copAttached) {
          f.addEventListener("input", scheduleUpdate);
          f.addEventListener("change", scheduleUpdate);
          f.addEventListener("paste", () => setTimeout(scheduleUpdate, 200));
          f.dataset.copAttached = "true";
        }
      });

      getContentEditors().forEach(({ editor }) => {
        if (!editor.dataset.copContentAttached) {
          const editorObserver = new MutationObserver(scheduleUpdate);
          editorObserver.observe(editor, {
            childList: true,
            subtree: true,
            characterData: true,
          });
          editorObservers.push(editorObserver);
          editor.addEventListener("input", scheduleUpdate);
          editor.addEventListener("keyup", scheduleUpdate);
          editor.dataset.copContentAttached = "true";
        }
      });
    };

    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some(
        (m) =>
          !(
            m.target.dataset?.optimizerFeedback ||
            m.target.closest?.("[data-optimizer-feedback]")
          ),
      );
      if (relevant) {
        attachListeners();
        scheduleUpdate();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const initTimeout = setTimeout(() => {
      attachListeners();
      scheduleUpdate();
    }, 400);

    return () => {
      clearTimeout(initTimeout);
      observer.disconnect();
      editorObservers.forEach((obs) => obs.disconnect());
      document
        .querySelectorAll("[data-optimizer-feedback]")
        .forEach((el) => el.remove());
    };
  }, [mounted]);

  return null;
};
