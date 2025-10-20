const OpenAI = require('openai');
const { logger } = require('@librechat/data-schemas');
const fs = require('fs');

let openai;

function initializeWhisper() {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    logger.info('[WhisperService] OpenAI Whisper initialized');
    return true;
  }
  logger.warn('[WhisperService] OPENAI_API_KEY not set');
  return false;
}

async function transcribeAudio(audioFile, language = 'auto') {
  if (!openai) throw new Error('Whisper not initialized');
  
  let fileStream;
  if (typeof audioFile === 'string') {
    fileStream = fs.createReadStream(audioFile);
  } else {
    const tempPath = '/tmp/audio_' + Date.now() + '.webm';
    fs.writeFileSync(tempPath, audioFile);
    fileStream = fs.createReadStream(tempPath);
  }

  const transcription = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
    language: language === 'auto' ? undefined : language,
    response_format: 'verbose_json',
  });

  return {
    text: transcription.text,
    language: transcription.language,
    duration: transcription.duration,
  };
}

const isInitialized = initializeWhisper();
module.exports = { isInitialized, transcribeAudio };
