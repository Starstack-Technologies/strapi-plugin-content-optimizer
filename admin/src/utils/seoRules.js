import {
  TITLE_THRESHOLDS as TT,
  DESC_THRESHOLDS as DT,
  TITLE_PX_OPTIMAL,
  TITLE_PX_WARN,
  DESC_PX_OPTIMAL,
  DESC_PX_WARN,
} from "./constants.js";
import { isEffectivelyEmpty } from "./textAnalysis.js";

let _canvas = null;
const getCanvas = () => {
  if (!_canvas) {
    try {
      _canvas = document.createElement("canvas");
    } catch {
      /* SSR / non-browser */
    }
  }
  return _canvas;
};

const measurePx = (text, font) => {
  try {
    const canvas = getCanvas();
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.font = font;
    return Math.round(ctx.measureText(text).width);
  } catch {
    return null;
  }
};

export const measureTitlePx = (text) =>
  measurePx(text, "20px Arial, sans-serif");

export const measureDescPx = (text) =>
  measurePx(text, "13px Arial, sans-serif");

export const getTitleStatus = (len) => {
  if (len === 0) return null;
  if (len < TT.tooShort) return { label: "Too Short", color: "#d02b20" };
  if (len <= TT.shortMax) return { label: "Short", color: "#c07000" };
  if (len <= TT.optimalMax) return { label: "Optimal", color: "#328048" };
  if (len <= TT.longMax) return { label: "Long", color: "#c07000" };
  return { label: "Too Long", color: "#d02b20" };
};

export const getDescStatus = (len) => {
  if (len === 0) return null;
  if (len < DT.tooShort) return { label: "Too Short", color: "#d02b20" };
  if (len <= DT.shortMax) return { label: "Short", color: "#c07000" };
  if (len <= DT.optimalMax) return { label: "Optimal", color: "#328048" };
  if (len <= DT.longMax) return { label: "Long", color: "#c07000" };
  return { label: "Too Long", color: "#d02b20" };
};

export const getTitleWarning = (len, text) => {
  if (len === 0) return null;
  let msg = null;

  if (len < TT.tooShort) {
    msg = "Title is too short. Minimum recommended length is 30 characters.";
  } else if (len <= TT.shortMax) {
    msg = "Title is shorter than recommended (ideal: 50–60 characters).";
  } else if (len > TT.longMax) {
    msg = "Title exceeds recommended length (50–60 characters).";
  }

  const px = measureTitlePx(text);
  if (px !== null) {
    if (px > TITLE_PX_WARN) {
      const pxNote = "Title will likely be truncated in Google results.";
      return msg ? `${msg} ${pxNote}` : pxNote;
    }
    if (px > TITLE_PX_OPTIMAL && !msg) {
      return "Title is close to Google truncation limit.";
    }
  }

  if (!msg && len >= 61 && len <= TT.longMax) {
    msg = "Title may be truncated in search results (61–65 characters).";
  }

  return msg;
};

export const getDescWarning = (len, text) => {
  if (len === 0) return null;
  let msg = null;

  if (len < DT.tooShort) {
    msg =
      "Description is too short. Add more details. (ideal: 150–160 characters)";
  } else if (len <= DT.shortMax) {
    msg = "Description is shorter than ideal (150–160 characters).";
  } else if (len <= DT.optimalMax) {
    msg = null;
  } else if (len <= DT.longMax) {
    msg =
      "Description may be truncated in search results (161–165 characters).";
  } else {
    msg =
      "Description exceeds recommended length. Shorten to 150–160 characters.";
  }

  const px = measureDescPx(text);
  if (px !== null) {
    if (px > DESC_PX_WARN) {
      const pxNote = "Description will likely be truncated in Google results.";
      return msg ? `${msg} ${pxNote}` : pxNote;
    }
    if (px > DESC_PX_OPTIMAL && !msg) {
      return "Description is close to Google truncation limit.";
    }
  }

  return msg;
};
