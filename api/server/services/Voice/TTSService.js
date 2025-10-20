const OpenAI = require('openai');
const { logger } = require('@librechat/data-schemas');

let openai;

function initializeTTS() {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    logger.info('[TTSService] OpenAI TTS initialized');
    return true;
  }
  logger.warn('[TTSService] OPENAI_API_KEY not set');
  return false;
}

const VOICES = { ar: 'onyx', en: 'alloy' };

async function textToSpeech(text, language = 'en', voice = null) {
  if (!openai) throw new Error('TTS not initialized');
  
  const selectedVoice = voice || VOICES[language] || 'alloy';
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: selectedVoice,
    input: text,
    speed: 1.0,
  });

  return Buffer.from(await mp3.arrayBuffer());
}

const isInitialized = initializeTTS();
module.exports = { isInitialized, textToSpeech, VOICES };
