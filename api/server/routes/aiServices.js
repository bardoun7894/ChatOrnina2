const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const { checkUsageQuota, incrementUsage } = require('~/server/middleware/usageTracking');
const { aiServiceRateLimiter } = require('~/server/middleware/rateLimitByTier');
const { logger } = require('@librechat/data-schemas');

// Import AI services
const CodeGenService = require('~/server/services/Code/CodeGenService');
const DesignAnalyzerService = require('~/server/services/Design/DesignAnalyzerService');
const VideoGenService = require('~/server/services/Video/VideoGenService');
const WhisperService = require('~/server/services/Voice/WhisperService');
const TTSService = require('~/server/services/Voice/TTSService');

const router = express.Router();

// Apply rate limiting and authentication to all routes
router.use(requireJwtAuth);
router.use(aiServiceRateLimiter);

/**
 * Code Generation Routes
 */

// POST /api/ai/code/generate - Generate code from description
router.post('/code/generate', checkUsageQuota('codeGenerations'), async (req, res) => {
  try {
    const { description, language, framework, style, responseLanguage } = req.body;

    if (!description || !language) {
      return res.status(400).json({ message: 'Description and language are required' });
    }

    const result = await CodeGenService.generateCode({
      description,
      language,
      framework,
      style,
      responseLanguage,
    });

    await incrementUsage(req.user._id, 'codeGenerations');

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Code generation failed:', error);
    res.status(500).json({ message: 'Code generation failed', error: error.message });
  }
});

// POST /api/ai/code/explain - Explain code
router.post('/code/explain', async (req, res) => {
  try {
    const { code, language, level, responseLanguage } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const result = await CodeGenService.explainCode({
      code,
      language,
      level,
      responseLanguage,
    });

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Code explanation failed:', error);
    res.status(500).json({ message: 'Code explanation failed', error: error.message });
  }
});

// POST /api/ai/code/refactor - Refactor code
router.post('/code/refactor', checkUsageQuota('codeGenerations'), async (req, res) => {
  try {
    const { code, language, goals, responseLanguage } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const result = await CodeGenService.refactorCode({
      code,
      language,
      goals,
      responseLanguage,
    });

    await incrementUsage(req.user._id, 'codeGenerations');

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Code refactoring failed:', error);
    res.status(500).json({ message: 'Code refactoring failed', error: error.message });
  }
});

// POST /api/ai/code/optimize - Optimize code
router.post('/code/optimize', checkUsageQuota('codeGenerations'), async (req, res) => {
  try {
    const { code, language, optimizationGoal, responseLanguage } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const result = await CodeGenService.optimizeCode({
      code,
      language,
      optimizationGoal,
      responseLanguage,
    });

    await incrementUsage(req.user._id, 'codeGenerations');

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Code optimization failed:', error);
    res.status(500).json({ message: 'Code optimization failed', error: error.message });
  }
});

/**
 * Design Analysis Routes
 */

// POST /api/ai/design/analyze - Analyze design image
router.post('/design/analyze', checkUsageQuota('designAnalyses'), async (req, res) => {
  try {
    const { imageUrl, focus, language, additionalContext } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const result = await DesignAnalyzerService.analyzeDesign({
      imageUrl,
      focus,
      language,
      additionalContext,
    });

    await incrementUsage(req.user._id, 'designAnalyses');

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Design analysis failed:', error);
    res.status(500).json({ message: 'Design analysis failed', error: error.message });
  }
});

// POST /api/ai/design/figma - Analyze Figma design
router.post('/design/figma', checkUsageQuota('designAnalyses'), async (req, res) => {
  try {
    const { figmaUrl, focus, language } = req.body;

    if (!figmaUrl) {
      return res.status(400).json({ message: 'Figma URL is required' });
    }

    const result = await DesignAnalyzerService.analyzeFigmaDesign({
      figmaUrl,
      focus,
      language,
    });

    await incrementUsage(req.user._id, 'designAnalyses');

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Figma analysis failed:', error);
    res.status(500).json({ message: 'Figma analysis failed', error: error.message });
  }
});

// POST /api/ai/design/compare - Compare two designs
router.post('/design/compare', checkUsageQuota('designAnalyses'), async (req, res) => {
  try {
    const { imageUrl1, imageUrl2, focus, language } = req.body;

    if (!imageUrl1 || !imageUrl2) {
      return res.status(400).json({ message: 'Two image URLs are required' });
    }

    const result = await DesignAnalyzerService.compareDesigns({
      imageUrl1,
      imageUrl2,
      focus,
      language,
    });

    await incrementUsage(req.user._id, 'designAnalyses');

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Design comparison failed:', error);
    res.status(500).json({ message: 'Design comparison failed', error: error.message });
  }
});

/**
 * Video Generation Routes
 */

// POST /api/ai/video/text-to-video - Generate video from text
router.post('/video/text-to-video', checkUsageQuota('videos'), async (req, res) => {
  try {
    const { prompt, provider, duration, aspectRatio, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const result = await VideoGenService.generateVideoFromText({
      prompt,
      provider,
      duration,
      aspectRatio,
      model,
    });

    await incrementUsage(req.user._id, 'videos');

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Video generation failed:', error);
    res.status(500).json({ message: 'Video generation failed', error: error.message });
  }
});

// POST /api/ai/video/image-to-video - Generate video from image
router.post('/video/image-to-video', checkUsageQuota('videos'), async (req, res) => {
  try {
    const { imageUrl, prompt, provider, duration } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const result = await VideoGenService.generateVideoFromImage({
      imageUrl,
      prompt,
      provider,
      duration,
    });

    await incrementUsage(req.user._id, 'videos');

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Image-to-video generation failed:', error);
    res.status(500).json({ message: 'Image-to-video generation failed', error: error.message });
  }
});

// GET /api/ai/video/status/:jobId - Check video generation status
router.get('/video/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { provider } = req.query;

    if (!provider) {
      return res.status(400).json({ message: 'Provider is required' });
    }

    const result = await VideoGenService.checkVideoStatus(jobId, provider);

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Video status check failed:', error);
    res.status(500).json({ message: 'Video status check failed', error: error.message });
  }
});

/**
 * Voice Services Routes
 */

// POST /api/ai/voice/transcribe - Speech-to-text
router.post('/voice/transcribe', async (req, res) => {
  try {
    const { audioFile, language } = req.body;

    if (!audioFile) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    const result = await WhisperService.transcribeAudio(audioFile, language);

    res.json(result);
  } catch (error) {
    logger.error('[AI Services] Transcription failed:', error);
    res.status(500).json({ message: 'Transcription failed', error: error.message });
  }
});

// POST /api/ai/voice/speak - Text-to-speech
router.post('/voice/speak', async (req, res) => {
  try {
    const { text, language, voice } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const audioBuffer = await TTSService.textToSpeech(text, language, voice);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });
    res.send(audioBuffer);
  } catch (error) {
    logger.error('[AI Services] TTS failed:', error);
    res.status(500).json({ message: 'Text-to-speech failed', error: error.message });
  }
});

/**
 * Service Status Routes
 */

// GET /api/ai/status - Get status of all AI services
router.get('/status', async (req, res) => {
  try {
    const status = {
      code: CodeGenService.initializeCodeGenService(),
      design: DesignAnalyzerService.initializeDesignAnalyzer(),
      video: {
        providers: VideoGenService.getAvailableProviders(),
      },
      voice: {
        whisper: WhisperService.initializeWhisper(),
        tts: TTSService.initializeTTS(),
      },
    };

    res.json(status);
  } catch (error) {
    logger.error('[AI Services] Status check failed:', error);
    res.status(500).json({ message: 'Status check failed', error: error.message });
  }
});

module.exports = router;
