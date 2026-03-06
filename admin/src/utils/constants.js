export const BLOCK_SEL = "p, h1, h2, h3, h4, h5, h6, blockquote, li";

export const SEO_FIELD_NAMES = new Set([
  "title",
  "metaTitle",
  "description",
  "metaDescription",
  "siteDescription",
  "keywords",
  "metaKeywords",
  "canonicalURL",
  "metaRobots",
  "structuredData",
]);

// character thresholds: < tooShort | tooShort–shortMax | shortMax–optimalMax | optimalMax–longMax | > longMax
export const TITLE_THRESHOLDS = {
  tooShort: 30,
  shortMax: 49,
  optimalMax: 60,
  longMax: 65,
};

export const DESC_THRESHOLDS = {
  tooShort: 120,
  shortMax: 149,
  optimalMax: 160,
  longMax: 165,
};

export const CONTENT_WORD_MIN = 300;
export const CONTENT_WORD_MAX = 5000;
export const READING_WPM = 200;

export const TITLE_PX_OPTIMAL = 580;
export const TITLE_PX_WARN = 600;
export const DESC_PX_OPTIMAL = 920;
export const DESC_PX_WARN = 960;
