const manifest = require('./manifest');

// Structured Tools - Keeping only essential tools
const DALLE3 = require('./structured/DALLE3');
const GoogleSearchAPI = require('./structured/GoogleSearch');

// Removed: FluxAPI, OpenWeather, StructuredWolfram, createYouTubeTools, 
// StructuredACS, StructuredSD, TraversaalSearch, createOpenAIImageTools, TavilySearchResults

module.exports = {
  ...manifest,
  // Structured Tools - Keeping only essential tools
  DALLE3,
  GoogleSearchAPI,
};
