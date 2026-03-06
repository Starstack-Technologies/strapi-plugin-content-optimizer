import { READING_WPM } from "./constants.js";

// Reused for the lifetime of the module — falls back to spread operator
// if Intl.Segmenter is unavailable (ZWJ sequences like 👨‍👩‍👧‍👦 may count as multiple chars in fallback)
const _segmenter =
  typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter() : null;

export const countGraphemes = (text) => {
  if (!text) return 0;
  if (_segmenter) return [..._segmenter.segment(text)].length;
  return [...text].length;
};

// \u200D (ZWJ) is intentionally preserved — it is structural glue inside multi-codepoint emoji
export const cleanText = (s) =>
  (s || "")
    .replace(/[\u200b\uFEFF\u2060\u00ad]/g, "")
    .replace(/\u00a0/g, " ")
    .trim();

// A token must contain at least one alphanumeric char (covers Latin, Cyrillic, CJK)
export const countWords = (text) => {
  if (!text || !text.trim()) return 0;
  return (text.match(/\S+/g) || []).filter((w) =>
    /[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF]/.test(w),
  ).length;
};

export const isEffectivelyEmpty = (text) => {
  if (!text) return true;
  return cleanText(text).length === 0;
};

// Returns reading time in minutes (floored, not ceiled) so 1 word doesn't jump to "1 min"
export const calcReadingTime = (wordCount) =>
  wordCount > 0 ? Math.floor(wordCount / READING_WPM) : 0;

// Returns reading time in seconds for display purposes
export const calcReadingTimeSec = (wordCount) =>
  wordCount > 0 ? Math.round((wordCount / READING_WPM) * 60) : 0;

// Formats reading time for display: shows seconds below 1 min, minutes above
export const formatReadingTime = (wordCount) => {
  if (wordCount === 0) return "0 sec";
  const secs = Math.round((wordCount / READING_WPM) * 60);
  if (secs < 60) return `${secs} sec`;
  return `${Math.floor(secs / 60)} min`;
};

// Masks common abbreviations and decimals to avoid false-positive sentence splits
export const splitSentences = (text) => {
  if (!text || !text.trim()) return [];
  let masked = text
    .replace(
      /\b(Mr|Mrs|Ms|Dr|Prof|Jr|Sr|St|Rev|Gen|Gov|Sgt|Cpl|Pvt|U\.S|U\.K|U\.N|e\.g|i\.e)\./gi,
      "$1\u0000",
    )
    .replace(/(\d+)\.(\d+)/g, "$1\u0000$2");
  const raw = masked.match(/[^.!?]+[.!?]+/g) || [];
  return raw.map((s) => s.replace(/\u0000/g, "."));
};
