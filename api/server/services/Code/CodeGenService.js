const { logger } = require('@librechat/data-schemas');
const OpenAI = require('openai');

/**
 * Enhanced Code Generation Service
 * Provides advanced code generation, explanation, refactoring, and optimization
 * Supports multiple programming languages with syntax validation
 */

let openai;
let initialized = false;

// Supported programming languages
const SupportedLanguages = {
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  PYTHON: 'python',
  JAVA: 'java',
  CSHARP: 'csharp',
  CPP: 'cpp',
  GO: 'go',
  RUST: 'rust',
  PHP: 'php',
  RUBY: 'ruby',
  SWIFT: 'swift',
  KOTLIN: 'kotlin',
  SQL: 'sql',
  HTML: 'html',
  CSS: 'css',
  BASH: 'bash',
};

// Code generation modes
const GenerationMode = {
  GENERATE: 'generate',
  EXPLAIN: 'explain',
  REFACTOR: 'refactor',
  OPTIMIZE: 'optimize',
  DEBUG: 'debug',
  TEST: 'test',
  CONVERT: 'convert',
  DOCUMENT: 'document',
};

/**
 * Initialize the Code Generation Service
 * @returns {boolean} - True if service initialized successfully
 */
function initializeCodeGenService() {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('[CodeGenService] OpenAI API key not configured');
    logger.info('[CodeGenService] Set OPENAI_API_KEY to enable code generation');
    initialized = false;
    return false;
  }

  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    initialized = true;
    logger.info('[CodeGenService] Service initialized successfully');
    return true;
  } catch (error) {
    logger.error('[CodeGenService] Initialization failed:', error);
    initialized = false;
    return false;
  }
}

/**
 * System prompts for different generation modes
 */
const modePrompts = {
  [GenerationMode.GENERATE]: (language) => `You are an expert ${language} developer. Generate clean, efficient, well-structured code that follows best practices and industry standards. Include:
- Proper error handling
- Input validation
- Clear variable and function names
- Appropriate comments for complex logic
- Type hints/annotations where applicable
- Modern language features and patterns`,

  [GenerationMode.EXPLAIN]: (language) => `You are a patient programming instructor. Explain the provided ${language} code in clear, simple terms:
- What the code does (high-level overview)
- How it works (step-by-step breakdown)
- Key concepts and patterns used
- Potential edge cases or limitations
- Performance considerations
Adapt explanation depth to the user's level.`,

  [GenerationMode.REFACTOR]: (language) => `You are a senior ${language} developer specializing in code refactoring. Improve the code by:
- Enhancing readability and maintainability
- Removing code smells and anti-patterns
- Applying SOLID principles
- Improving naming conventions
- Reducing complexity and duplication
- Maintaining the same functionality
Explain each significant change made.`,

  [GenerationMode.OPTIMIZE]: (language) => `You are a performance optimization specialist for ${language}. Optimize the code for:
- Runtime performance and efficiency
- Memory usage
- Algorithm complexity (Big O)
- Resource utilization
- Scalability
Explain the optimizations and their impact.`,

  [GenerationMode.DEBUG]: (language) => `You are an experienced ${language} debugger. Analyze the code to:
- Identify bugs, errors, and potential issues
- Explain why each issue occurs
- Provide corrected code
- Suggest preventive measures
- Add defensive programming techniques`,

  [GenerationMode.TEST]: (language) => `You are a test automation expert for ${language}. Create comprehensive tests:
- Unit tests for all functions/methods
- Edge cases and boundary conditions
- Error scenarios and exception handling
- Mock external dependencies
- Follow testing best practices (AAA pattern, descriptive names)
Use appropriate testing frameworks for ${language}.`,

  [GenerationMode.CONVERT]: (fromLang, toLang) => `You are a polyglot developer. Convert code from ${fromLang} to ${toLang}:
- Maintain the same functionality
- Use idiomatic ${toLang} patterns and conventions
- Adapt to ${toLang} best practices
- Handle language-specific features appropriately
- Add comments explaining significant conversions`,

  [GenerationMode.DOCUMENT]: (language) => `You are a technical documentation specialist. Document the ${language} code by:
- Writing comprehensive docstrings/JSDoc comments
- Explaining parameters, return values, and exceptions
- Providing usage examples
- Describing complex algorithms or business logic
- Following language-specific documentation standards`,
};

/**
 * Generate code based on a description
 * @param {Object} params
 * @param {string} params.description - What the code should do
 * @param {string} params.language - Programming language
 * @param {string} [params.framework] - Optional framework/library context
 * @param {string} [params.style='clean'] - Code style (clean, compact, verbose)
 * @param {string} [params.responseLanguage='en'] - Response language (en or ar)
 * @returns {Promise<{code: string, explanation: string, language: string}>}
 */
async function generateCode({ description, language, framework = '', style = 'clean', responseLanguage = 'en' }) {
  if (!initialized) {
    throw new Error('Code Generation service not initialized. Please configure OPENAI_API_KEY.');
  }

  const systemPrompt = modePrompts[GenerationMode.GENERATE](language);
  const frameworkContext = framework ? `\n\nUse the ${framework} framework/library.` : '';
  const styleContext = `\n\nCode style preference: ${style}`;
  const languageInstruction = responseLanguage === 'ar' ? '\n\nProvide explanations in Arabic (العربية), but keep code and comments in English.' : '';

  logger.info('[CodeGenService] Generating code', { language, framework, style });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + frameworkContext + styleContext + languageInstruction,
        },
        {
          role: 'user',
          content: description,
        },
      ],
      temperature: 0.3, // Lower temperature for more deterministic code
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    const { code, explanation } = extractCodeAndExplanation(content);

    return {
      code,
      explanation,
      language,
      framework,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[CodeGenService] Code generation failed:', error);
    throw error;
  }
}

/**
 * Explain existing code
 * @param {Object} params
 * @param {string} params.code - Code to explain
 * @param {string} params.language - Programming language
 * @param {string} [params.level='intermediate'] - Explanation level (beginner, intermediate, advanced)
 * @param {string} [params.responseLanguage='en'] - Response language
 * @returns {Promise<{explanation: string, keyPoints: Array<string>}>}
 */
async function explainCode({ code, language, level = 'intermediate', responseLanguage = 'en' }) {
  if (!initialized) {
    throw new Error('Code Generation service not initialized');
  }

  const systemPrompt = modePrompts[GenerationMode.EXPLAIN](language);
  const levelContext = `\n\nExplanation level: ${level}`;
  const languageInstruction = responseLanguage === 'ar' ? '\n\nProvide the explanation in Arabic (العربية).' : '';

  logger.info('[CodeGenService] Explaining code', { language, level });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + levelContext + languageInstruction,
        },
        {
          role: 'user',
          content: `Explain this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const explanation = response.choices[0].message.content;
    const keyPoints = extractKeyPoints(explanation);

    return {
      explanation,
      keyPoints,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[CodeGenService] Code explanation failed:', error);
    throw error;
  }
}

/**
 * Refactor code to improve quality
 * @param {Object} params
 * @param {string} params.code - Code to refactor
 * @param {string} params.language - Programming language
 * @param {Array<string>} [params.goals] - Specific refactoring goals
 * @param {string} [params.responseLanguage='en'] - Response language
 * @returns {Promise<{refactoredCode: string, changes: Array<string>, explanation: string}>}
 */
async function refactorCode({ code, language, goals = [], responseLanguage = 'en' }) {
  if (!initialized) {
    throw new Error('Code Generation service not initialized');
  }

  const systemPrompt = modePrompts[GenerationMode.REFACTOR](language);
  const goalsContext = goals.length > 0 ? `\n\nFocus on these goals: ${goals.join(', ')}` : '';
  const languageInstruction = responseLanguage === 'ar' ? '\n\nProvide explanations in Arabic, but keep code in English.' : '';

  logger.info('[CodeGenService] Refactoring code', { language, goals });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + goalsContext + languageInstruction,
        },
        {
          role: 'user',
          content: `Refactor this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    const { code: refactoredCode, explanation } = extractCodeAndExplanation(content);
    const changes = extractKeyPoints(explanation);

    return {
      refactoredCode,
      changes,
      explanation,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[CodeGenService] Code refactoring failed:', error);
    throw error;
  }
}

/**
 * Optimize code for performance
 * @param {Object} params
 * @param {string} params.code - Code to optimize
 * @param {string} params.language - Programming language
 * @param {string} [params.optimizationGoal='speed'] - speed, memory, or both
 * @param {string} [params.responseLanguage='en'] - Response language
 * @returns {Promise<{optimizedCode: string, improvements: Array<string>, metrics?: Object}>}
 */
async function optimizeCode({ code, language, optimizationGoal = 'speed', responseLanguage = 'en' }) {
  if (!initialized) {
    throw new Error('Code Generation service not initialized');
  }

  const systemPrompt = modePrompts[GenerationMode.OPTIMIZE](language);
  const goalContext = `\n\nOptimization goal: ${optimizationGoal}`;
  const languageInstruction = responseLanguage === 'ar' ? '\n\nProvide explanations in Arabic, but keep code in English.' : '';

  logger.info('[CodeGenService] Optimizing code', { language, optimizationGoal });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + goalContext + languageInstruction,
        },
        {
          role: 'user',
          content: `Optimize this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    const { code: optimizedCode, explanation } = extractCodeAndExplanation(content);
    const improvements = extractKeyPoints(explanation);

    return {
      optimizedCode,
      improvements,
      explanation,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[CodeGenService] Code optimization failed:', error);
    throw error;
  }
}

/**
 * Debug code and find issues
 * @param {Object} params
 * @param {string} params.code - Code to debug
 * @param {string} params.language - Programming language
 * @param {string} [params.errorMessage] - Error message if any
 * @param {string} [params.responseLanguage='en'] - Response language
 * @returns {Promise<{issues: Array<Object>, fixedCode: string, explanation: string}>}
 */
async function debugCode({ code, language, errorMessage = '', responseLanguage = 'en' }) {
  if (!initialized) {
    throw new Error('Code Generation service not initialized');
  }

  const systemPrompt = modePrompts[GenerationMode.DEBUG](language);
  const errorContext = errorMessage ? `\n\nError message: ${errorMessage}` : '';
  const languageInstruction = responseLanguage === 'ar' ? '\n\nProvide explanations in Arabic, but keep code in English.' : '';

  logger.info('[CodeGenService] Debugging code', { language, hasError: !!errorMessage });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + errorContext + languageInstruction,
        },
        {
          role: 'user',
          content: `Debug this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    const { code: fixedCode, explanation } = extractCodeAndExplanation(content);
    const issues = extractKeyPoints(explanation);

    return {
      issues: issues.map((issue) => ({ description: issue })),
      fixedCode,
      explanation,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[CodeGenService] Code debugging failed:', error);
    throw error;
  }
}

/**
 * Generate unit tests for code
 * @param {Object} params
 * @param {string} params.code - Code to test
 * @param {string} params.language - Programming language
 * @param {string} [params.testFramework] - Testing framework to use
 * @param {string} [params.responseLanguage='en'] - Response language
 * @returns {Promise<{tests: string, coverage: Array<string>}>}
 */
async function generateTests({ code, language, testFramework = '', responseLanguage = 'en' }) {
  if (!initialized) {
    throw new Error('Code Generation service not initialized');
  }

  const systemPrompt = modePrompts[GenerationMode.TEST](language);
  const frameworkContext = testFramework ? `\n\nUse ${testFramework} testing framework.` : '';
  const languageInstruction = responseLanguage === 'ar' ? '\n\nProvide explanations in Arabic, but keep test code in English.' : '';

  logger.info('[CodeGenService] Generating tests', { language, testFramework });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt + frameworkContext + languageInstruction,
        },
        {
          role: 'user',
          content: `Generate tests for this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    const { code: tests, explanation } = extractCodeAndExplanation(content);
    const coverage = extractKeyPoints(explanation);

    return {
      tests,
      coverage,
      explanation,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[CodeGenService] Test generation failed:', error);
    throw error;
  }
}

/**
 * Convert code from one language to another
 * @param {Object} params
 * @param {string} params.code - Code to convert
 * @param {string} params.fromLanguage - Source language
 * @param {string} params.toLanguage - Target language
 * @param {string} [params.responseLanguage='en'] - Response language
 * @returns {Promise<{convertedCode: string, notes: Array<string>}>}
 */
async function convertCode({ code, fromLanguage, toLanguage, responseLanguage = 'en' }) {
  if (!initialized) {
    throw new Error('Code Generation service not initialized');
  }

  const systemPrompt = modePrompts[GenerationMode.CONVERT](fromLanguage, toLanguage);
  const languageInstruction = responseLanguage === 'ar' ? '\n\nProvide explanations in Arabic, but keep code in English.' : '';

  logger.info('[CodeGenService] Converting code', { fromLanguage, toLanguage });

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
          content: `Convert this ${fromLanguage} code to ${toLanguage}:\n\n\`\`\`${fromLanguage}\n${code}\n\`\`\``,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    const { code: convertedCode, explanation } = extractCodeAndExplanation(content);
    const notes = extractKeyPoints(explanation);

    return {
      convertedCode,
      notes,
      explanation,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    logger.error('[CodeGenService] Code conversion failed:', error);
    throw error;
  }
}

/**
 * Extract code blocks and explanation from response
 * @private
 */
function extractCodeAndExplanation(content) {
  // Extract code from markdown code blocks
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];

  let code = '';
  let explanation = content;

  if (matches.length > 0) {
    // Get the largest code block (likely the main code)
    code = matches.reduce((longest, match) => (match[1].length > longest.length ? match[1] : longest), '').trim();

    // Remove code blocks from explanation
    explanation = content.replace(codeBlockRegex, '[Code Block]').trim();
  }

  return { code, explanation };
}

/**
 * Extract key points from text
 * @private
 */
function extractKeyPoints(text) {
  const lines = text.split('\n');
  const points = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      points.push(trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, ''));
    }
  }

  return points;
}

module.exports = {
  initializeCodeGenService,
  generateCode,
  explainCode,
  refactorCode,
  optimizeCode,
  debugCode,
  generateTests,
  convertCode,
  SupportedLanguages,
  GenerationMode,
};
