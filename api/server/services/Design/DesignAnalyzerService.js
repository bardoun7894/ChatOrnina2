const { logger } = require('@librechat/data-schemas');
const OpenAI = require('openai');
const axios = require('axios');

/**
 * Design Analysis Service
 * Analyzes design files (Figma, images, screenshots) using GPT-4 Vision
 * Provides feedback on UI/UX, accessibility, design patterns, and best practices
 */

let openai;
let initialized = false;

/**
 * Initialize the Design Analyzer Service
 * @returns {boolean} - True if service initialized successfully
 */
function initializeDesignAnalyzer() {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('[DesignAnalyzerService] OpenAI API key not configured');
    logger.info('[DesignAnalyzerService] Set OPENAI_API_KEY to enable design analysis');
    initialized = false;
    return false;
  }

  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    initialized = true;
    logger.info('[DesignAnalyzerService] Service initialized successfully');
    return true;
  } catch (error) {
    logger.error('[DesignAnalyzerService] Initialization failed:', error);
    initialized = false;
    return false;
  }
}

/**
 * Analysis focus areas
 */
const AnalysisFocus = {
  GENERAL: 'general',
  UI_UX: 'ui_ux',
  ACCESSIBILITY: 'accessibility',
  BRANDING: 'branding',
  RESPONSIVE: 'responsive',
  COLOR_THEORY: 'color_theory',
  TYPOGRAPHY: 'typography',
  LAYOUT: 'layout',
};

/**
 * System prompts for different analysis types
 */
const analysisPrompts = {
  [AnalysisFocus.GENERAL]: `You are an expert UI/UX designer and design critic. Analyze this design and provide comprehensive feedback on:
- Overall visual appeal and aesthetics
- User experience and usability
- Design consistency and patterns
- Strengths and areas for improvement
- Specific actionable recommendations

Provide your analysis in a structured format with clear sections.`,

  [AnalysisFocus.UI_UX]: `You are a UX specialist. Analyze this design focusing on:
- User flow and navigation clarity
- Interactive elements and affordances
- Information hierarchy
- Cognitive load and simplicity
- User engagement and conversion optimization
- Mobile vs desktop considerations

Provide specific, actionable UX improvements.`,

  [AnalysisFocus.ACCESSIBILITY]: `You are a web accessibility expert (WCAG 2.1 AA/AAA). Analyze this design for:
- Color contrast ratios
- Text readability and sizing
- Focus indicators and keyboard navigation
- Screen reader compatibility
- Alternative text for images
- Touch target sizes
- ARIA labels and semantic structure

Rate accessibility compliance and provide specific fixes.`,

  [AnalysisFocus.BRANDING]: `You are a brand identity expert. Analyze this design for:
- Brand consistency and visual identity
- Logo usage and placement
- Color palette alignment with brand
- Typography and font choices
- Tone and messaging alignment
- Brand personality expression

Evaluate brand coherence and provide recommendations.`,

  [AnalysisFocus.RESPONSIVE]: `You are a responsive design specialist. Analyze this design for:
- Mobile-first considerations
- Breakpoint strategy
- Content prioritization across devices
- Touch vs click interactions
- Performance implications
- Flexible layouts and grids

Provide responsive design recommendations.`,

  [AnalysisFocus.COLOR_THEORY]: `You are a color theory expert. Analyze the color usage in this design:
- Color harmony and palette selection
- Contrast and readability
- Emotional impact of colors
- Cultural considerations
- Color accessibility
- Brand color usage

Provide color recommendations and alternatives.`,

  [AnalysisFocus.TYPOGRAPHY]: `You are a typography specialist. Analyze the typography in this design:
- Font choices and pairing
- Type hierarchy and scale
- Line height and spacing
- Readability across devices
- Web font performance
- Typographic consistency

Provide typography improvements.`,

  [AnalysisFocus.LAYOUT]: `You are a layout and composition expert. Analyze the layout of this design:
- Grid system and alignment
- Visual hierarchy and focal points
- White space and breathing room
- Content organization
- Balance and symmetry
- Responsive grid behavior

Provide layout optimization suggestions.`,
};

/**
 * Analyze a design image using GPT-4 Vision
 * @param {Object} params
 * @param {string} params.imageUrl - URL or base64 of the design image
 * @param {string} [params.focus=GENERAL] - Analysis focus area
 * @param {string} [params.language='en'] - Response language (en or ar)
 * @param {string} [params.additionalContext] - Additional context about the design
 * @returns {Promise<{analysis: string, suggestions: Array<string>, rating?: number}>}
 */
async function analyzeDesign({ imageUrl, focus = AnalysisFocus.GENERAL, language = 'en', additionalContext = '' }) {
  if (!initialized) {
    throw new Error('Design Analyzer service not initialized. Please configure OPENAI_API_KEY.');
  }

  const systemPrompt = analysisPrompts[focus] || analysisPrompts[AnalysisFocus.GENERAL];
  const languageInstruction = language === 'ar' ? '\n\nPlease provide your response in Arabic (العربية).' : '';
  const contextInstruction = additionalContext ? `\n\nAdditional context: ${additionalContext}` : '';

  logger.info('[DesignAnalyzerService] Analyzing design', { focus, language });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + languageInstruction,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this design.' + contextInstruction,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const analysis = response.choices[0].message.content;

    // Extract suggestions (lines that start with bullet points or numbers)
    const suggestions = extractSuggestions(analysis);

    return {
      analysis,
      suggestions,
      focus,
      language,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[DesignAnalyzerService] Analysis failed:', error);
    throw error;
  }
}

/**
 * Analyze a Figma design by URL
 * @param {Object} params
 * @param {string} params.figmaUrl - Figma file or frame URL
 * @param {string} [params.focus=GENERAL] - Analysis focus area
 * @param {string} [params.language='en'] - Response language
 * @returns {Promise<{analysis: string, suggestions: Array<string>}>}
 */
async function analyzeFigmaDesign({ figmaUrl, focus = AnalysisFocus.GENERAL, language = 'en' }) {
  if (!initialized) {
    throw new Error('Design Analyzer service not initialized');
  }

  if (!process.env.FIGMA_ACCESS_TOKEN) {
    throw new Error('Figma access token not configured. Set FIGMA_ACCESS_TOKEN environment variable.');
  }

  logger.info('[DesignAnalyzerService] Analyzing Figma design', { figmaUrl, focus });

  try {
    // Extract file key and node ID from Figma URL
    const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);

    // Get image URL from Figma API
    const imageUrl = await getFigmaImageUrl(fileKey, nodeId);

    // Analyze the design image
    return await analyzeDesign({
      imageUrl,
      focus,
      language,
      additionalContext: `This is a Figma design from: ${figmaUrl}`,
    });
  } catch (error) {
    logger.error('[DesignAnalyzerService] Figma analysis failed:', error);
    throw error;
  }
}

/**
 * Compare two designs and provide comparative analysis
 * @param {Object} params
 * @param {string} params.imageUrl1 - First design image
 * @param {string} params.imageUrl2 - Second design image
 * @param {string} [params.focus=GENERAL] - Analysis focus
 * @param {string} [params.language='en'] - Response language
 * @returns {Promise<{analysis: string, winner?: string, differences: Array<string>}>}
 */
async function compareDesigns({ imageUrl1, imageUrl2, focus = AnalysisFocus.GENERAL, language = 'en' }) {
  if (!initialized) {
    throw new Error('Design Analyzer service not initialized');
  }

  const systemPrompt = `You are an expert design critic. Compare these two designs and provide:
1. Key differences between them
2. Strengths and weaknesses of each
3. Which design better achieves its goals (if applicable)
4. Specific recommendations for improvement
Focus area: ${focus}`;

  const languageInstruction = language === 'ar' ? '\n\nProvide your response in Arabic.' : '';

  logger.info('[DesignAnalyzerService] Comparing two designs');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + languageInstruction,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Design A:' },
            { type: 'image_url', image_url: { url: imageUrl1, detail: 'high' } },
            { type: 'text', text: 'Design B:' },
            { type: 'image_url', image_url: { url: imageUrl2, detail: 'high' } },
            { type: 'text', text: 'Please compare these designs in detail.' },
          ],
        },
      ],
      max_tokens: 2500,
      temperature: 0.7,
    });

    const analysis = response.choices[0].message.content;
    const differences = extractSuggestions(analysis);

    return {
      analysis,
      differences,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[DesignAnalyzerService] Comparison failed:', error);
    throw error;
  }
}

/**
 * Generate design suggestions based on a description
 * @param {Object} params
 * @param {string} params.description - Description of desired design
 * @param {string} [params.designType='web'] - Type of design (web, mobile, logo, etc.)
 * @param {string} [params.language='en'] - Response language
 * @returns {Promise<{suggestions: string, keyPoints: Array<string>}>}
 */
async function generateDesignSuggestions({ description, designType = 'web', language = 'en' }) {
  if (!initialized) {
    throw new Error('Design Analyzer service not initialized');
  }

  const systemPrompt = `You are a creative design consultant. Based on the description provided, suggest:
1. Design approach and style recommendations
2. Color palette suggestions
3. Typography recommendations
4. Layout structure ideas
5. Key UI elements to include
6. Accessibility considerations
7. Best practices for ${designType} design`;

  const languageInstruction = language === 'ar' ? '\n\nProvide suggestions in Arabic.' : '';

  logger.info('[DesignAnalyzerService] Generating design suggestions');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + languageInstruction,
        },
        {
          role: 'user',
          content: description,
        },
      ],
      max_tokens: 1500,
      temperature: 0.8,
    });

    const suggestions = response.choices[0].message.content;
    const keyPoints = extractSuggestions(suggestions);

    return {
      suggestions,
      keyPoints,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[DesignAnalyzerService] Suggestion generation failed:', error);
    throw error;
  }
}

/**
 * Extract bullet points and numbered lists from text
 * @private
 */
function extractSuggestions(text) {
  const lines = text.split('\n');
  const suggestions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match bullet points (-, *, •) or numbered lists (1., 2., etc.)
    if (/^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      suggestions.push(trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, ''));
    }
  }

  return suggestions;
}

/**
 * Parse Figma URL to extract file key and node ID
 * @private
 */
function parseFigmaUrl(url) {
  // Figma URL format: https://www.figma.com/file/{fileKey}/{title}?node-id={nodeId}
  // or: https://www.figma.com/design/{fileKey}/{title}?node-id={nodeId}
  const fileMatch = url.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
  const nodeMatch = url.match(/node-id=([^&]+)/);

  if (!fileMatch) {
    throw new Error('Invalid Figma URL format');
  }

  return {
    fileKey: fileMatch[2],
    nodeId: nodeMatch ? nodeMatch[1].replace(/-/g, ':') : null,
  };
}

/**
 * Get image URL from Figma API
 * @private
 */
async function getFigmaImageUrl(fileKey, nodeId) {
  const token = process.env.FIGMA_ACCESS_TOKEN;

  const params = {
    format: 'png',
    scale: 2,
  };

  if (nodeId) {
    params.ids = nodeId;
  }

  const response = await axios.get(`https://api.figma.com/v1/images/${fileKey}`, {
    headers: {
      'X-Figma-Token': token,
    },
    params,
  });

  if (!response.data.images) {
    throw new Error('Failed to get image from Figma API');
  }

  // Get the first image URL
  const imageUrl = Object.values(response.data.images)[0];
  return imageUrl;
}

module.exports = {
  initializeDesignAnalyzer,
  analyzeDesign,
  analyzeFigmaDesign,
  compareDesigns,
  generateDesignSuggestions,
  AnalysisFocus,
};
