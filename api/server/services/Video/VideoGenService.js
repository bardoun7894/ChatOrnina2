const { logger } = require('@librechat/data-schemas');
const axios = require('axios');

/**
 * Video Generation Service
 * Provides unified interface for video generation providers
 * Currently supports: Runway ML, Stability AI
 */

let initialized = false;

// Supported providers
const VideoProvider = {
  RUNWAY: 'runway',
  STABILITY: 'stability',
};

// Provider configurations
const providerConfig = {
  [VideoProvider.RUNWAY]: {
    apiUrl: 'https://api.runwayml.com/v1',
    apiKey: process.env.RUNWAY_API_KEY,
    models: ['gen2', 'gen3'],
  },
  [VideoProvider.STABILITY]: {
    apiUrl: 'https://api.stability.ai/v2beta',
    apiKey: process.env.STABILITY_API_KEY,
    models: ['stable-video-diffusion-1.1'],
  },
};

/**
 * Initialize the Video Generation Service
 * @returns {boolean} - True if at least one provider is configured
 */
function initializeVideoService() {
  const runwayConfigured = !!process.env.RUNWAY_API_KEY;
  const stabilityConfigured = !!process.env.STABILITY_API_KEY;

  if (!runwayConfigured && !stabilityConfigured) {
    logger.warn('[VideoGenService] No video generation providers configured');
    logger.info('[VideoGenService] Set RUNWAY_API_KEY or STABILITY_API_KEY to enable video generation');
    initialized = false;
    return false;
  }

  if (runwayConfigured) {
    logger.info('[VideoGenService] Runway ML provider initialized');
  }
  if (stabilityConfigured) {
    logger.info('[VideoGenService] Stability AI provider initialized');
  }

  initialized = true;
  return true;
}

/**
 * Generate video from text prompt
 * @param {Object} params
 * @param {string} params.prompt - Text description of the video
 * @param {string} params.provider - Provider to use (runway or stability)
 * @param {number} [params.duration=5] - Video duration in seconds
 * @param {string} [params.aspectRatio='16:9'] - Video aspect ratio
 * @param {string} [params.model] - Specific model to use
 * @returns {Promise<{jobId: string, status: string, provider: string}>}
 */
async function generateVideoFromText({ prompt, provider = VideoProvider.RUNWAY, duration = 5, aspectRatio = '16:9', model }) {
  if (!initialized) {
    throw new Error('Video generation service not initialized. Please configure a provider.');
  }

  const config = providerConfig[provider];
  if (!config || !config.apiKey) {
    throw new Error(`Provider ${provider} not configured`);
  }

  logger.info(`[VideoGenService] Generating video with ${provider}`, {
    promptLength: prompt.length,
    duration,
    aspectRatio,
  });

  try {
    if (provider === VideoProvider.RUNWAY) {
      return await generateWithRunway({ prompt, duration, aspectRatio, model, config });
    } else if (provider === VideoProvider.STABILITY) {
      return await generateWithStability({ prompt, duration, aspectRatio, model, config });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    logger.error('[VideoGenService] Video generation failed:', error);
    throw error;
  }
}

/**
 * Generate video from image + prompt
 * @param {Object} params
 * @param {string} params.imageUrl - URL or base64 of source image
 * @param {string} params.prompt - Text description for video motion
 * @param {string} params.provider - Provider to use
 * @param {number} [params.duration=5] - Video duration in seconds
 * @returns {Promise<{jobId: string, status: string, provider: string}>}
 */
async function generateVideoFromImage({ imageUrl, prompt, provider = VideoProvider.RUNWAY, duration = 5 }) {
  if (!initialized) {
    throw new Error('Video generation service not initialized');
  }

  const config = providerConfig[provider];
  if (!config || !config.apiKey) {
    throw new Error(`Provider ${provider} not configured`);
  }

  logger.info(`[VideoGenService] Generating video from image with ${provider}`);

  try {
    if (provider === VideoProvider.RUNWAY) {
      return await generateImageToVideoRunway({ imageUrl, prompt, duration, config });
    } else if (provider === VideoProvider.STABILITY) {
      return await generateImageToVideoStability({ imageUrl, prompt, duration, config });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    logger.error('[VideoGenService] Image-to-video generation failed:', error);
    throw error;
  }
}

/**
 * Check the status of a video generation job
 * @param {string} jobId - Job ID from generation request
 * @param {string} provider - Provider that created the job
 * @returns {Promise<{status: string, videoUrl?: string, progress?: number}>}
 */
async function checkVideoStatus(jobId, provider) {
  const config = providerConfig[provider];
  if (!config || !config.apiKey) {
    throw new Error(`Provider ${provider} not configured`);
  }

  try {
    const response = await axios.get(`${config.apiUrl}/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    return {
      status: data.status,
      videoUrl: data.output?.url || data.videoUrl,
      progress: data.progress || 0,
      estimatedTime: data.estimatedTime,
    };
  } catch (error) {
    logger.error('[VideoGenService] Status check failed:', error);
    throw error;
  }
}

/**
 * Generate video with Runway ML
 * @private
 */
async function generateWithRunway({ prompt, duration, aspectRatio, model, config }) {
  const selectedModel = model || 'gen3';

  const response = await axios.post(
    `${config.apiUrl}/generate`,
    {
      model: selectedModel,
      prompt,
      duration,
      aspectRatio,
      options: {
        seed: Math.floor(Math.random() * 1000000),
      },
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    jobId: response.data.id,
    status: response.data.status || 'processing',
    provider: VideoProvider.RUNWAY,
    estimatedTime: response.data.estimatedTime,
  };
}

/**
 * Generate video with Stability AI
 * @private
 */
async function generateWithStability({ prompt, duration, aspectRatio, model, config }) {
  const selectedModel = model || 'stable-video-diffusion-1.1';

  const response = await axios.post(
    `${config.apiUrl}/video/generate`,
    {
      model: selectedModel,
      text_prompts: [{ text: prompt, weight: 1 }],
      cfg_scale: 7.0,
      motion_bucket_id: duration,
      seed: Math.floor(Math.random() * 4294967295),
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    jobId: response.data.id,
    status: 'processing',
    provider: VideoProvider.STABILITY,
  };
}

/**
 * Generate image-to-video with Runway ML
 * @private
 */
async function generateImageToVideoRunway({ imageUrl, prompt, duration, config }) {
  const response = await axios.post(
    `${config.apiUrl}/image-to-video`,
    {
      model: 'gen3',
      imageUrl,
      prompt,
      duration,
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    jobId: response.data.id,
    status: response.data.status || 'processing',
    provider: VideoProvider.RUNWAY,
  };
}

/**
 * Generate image-to-video with Stability AI
 * @private
 */
async function generateImageToVideoStability({ imageUrl, prompt, duration, config }) {
  const response = await axios.post(
    `${config.apiUrl}/image-to-video`,
    {
      image: imageUrl,
      cfg_scale: 2.5,
      motion_bucket_id: duration,
      seed: Math.floor(Math.random() * 4294967295),
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return {
    jobId: response.data.id,
    status: 'processing',
    provider: VideoProvider.STABILITY,
  };
}

/**
 * Get list of available providers and models
 * @returns {Array<{provider: string, models: Array<string>, configured: boolean}>}
 */
function getAvailableProviders() {
  return Object.entries(providerConfig).map(([provider, config]) => ({
    provider,
    models: config.models,
    configured: !!config.apiKey,
  }));
}

module.exports = {
  initializeVideoService,
  generateVideoFromText,
  generateVideoFromImage,
  checkVideoStatus,
  getAvailableProviders,
  VideoProvider,
};
