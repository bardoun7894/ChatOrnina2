import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[Whisper API] Received transcription request');

  try {
    // Parse multipart form data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const audioFile = files.audio?.[0];
    if (!audioFile) {
      console.error('[Whisper API] No audio file in request');
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Get language from form fields (default to auto-detect)
    const language = fields.language?.[0] || undefined;
    console.log(`[Whisper API] Audio file: ${audioFile.originalFilename}, size: ${audioFile.size} bytes, language: ${language || 'auto-detect'}`);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[Whisper API] OPENAI_API_KEY not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    console.log('[Whisper API] Sending request to OpenAI Whisper...');

    try {
      // Log file details for debugging
      const stats = fs.statSync(audioFile.filepath);
      console.log('[Whisper API] File stats:', {
        size: stats.size,
        path: audioFile.filepath,
        mimetype: audioFile.mimetype
      });

      // Use OpenAI SDK for better reliability
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile.filepath) as any,
        model: 'whisper-1',
        language: language || undefined, // Auto-detect if not provided
        // Enhanced prompt with common Syrian Arabic phrases
        prompt: 'محادثة عربية سورية طبيعية. الكلمات الشائعة: مرحبا، أهلاً، كيف حالك، شكراً، تمام، الحمد لله، إن شاء الله، يعطيك العافية',
      });

      console.log('[Whisper API] ✅ Transcription successful (raw):', transcription.text);

      // Post-process: Fix common Whisper errors for Syrian Arabic
      const correctedText = transcription.text
        .replace(/Naah/gi, 'نعم')
        .replace(/نااه/g, 'نعم')
        .replace(/لأ/g, 'لا')
        .trim();

      console.log('[Whisper API] ✅ Transcription corrected:', correctedText);

      // Clean up temp file
      fs.unlinkSync(audioFile.filepath);

      return res.status(200).json({ text: correctedText });
    } catch (transcriptionError: any) {
      console.error('[Whisper API] ❌ Transcription error:', {
        message: transcriptionError.message,
        status: transcriptionError.status,
        error: transcriptionError.error,
      });
      
      // Clean up temp file on error
      if (fs.existsSync(audioFile.filepath)) {
        fs.unlinkSync(audioFile.filepath);
      }
      
      throw transcriptionError;
    }

  } catch (error: any) {
    console.error('[Whisper API] ❌ Error:', error);
    return res.status(500).json({ 
      error: 'Transcription failed',
      details: error.message 
    });
  }
}
