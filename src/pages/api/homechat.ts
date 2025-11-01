import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_AI_BASE_URL = 'https://api.kie.ai';

// Helper function to call Kie.ai API
async function callKieAI(endpoint: string, body: any) {
  const response = await fetch(`${KIE_AI_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Kie.ai API error: ${response.statusText}`);
  }

  return response.json();
}

// Poll task status for Kie.ai video operations (Sora)
async function pollTaskStatus(taskId: string, maxAttempts = 300, interval = 2000): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${KIE_AI_BASE_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to check task status: ${response.statusText}`);
    }

    const result = await response.json();
    const state = result.data?.state;

    console.log(`[Video Poll ${i + 1}/${maxAttempts}] Task ${taskId} - State: ${state}`);

    if (state === 'success') {
      console.log(`[Video Success] Task ${taskId} completed`);
      return result;
    }

    if (state === 'fail') {
      const failMsg = result.data?.failMsg || 'Task failed';
      console.error(`[Video Failed] Task ${taskId} - ${failMsg}`);
      throw new Error(failMsg);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Task timeout after ${maxAttempts * interval / 1000} seconds`);
}

// Poll Midjourney task status
async function pollMidjourneyStatus(taskId: string, maxAttempts = 300, interval = 3000): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${KIE_AI_BASE_URL}/api/v1/mj/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to check Midjourney task status: ${response.statusText}`);
    }

    const result = await response.json();
    const successFlag = result.data?.successFlag;

    console.log(`[Midjourney Poll ${i + 1}/${maxAttempts}] Task ${taskId} - successFlag: ${successFlag}`);

    // successFlag: 0 (Generating), 1 (Success), 2 (Failed), 3 (Generation Failed)
    if (successFlag === 1) {
      console.log(`[Midjourney Success] Task ${taskId} completed`);
      return result;
    }

    if (successFlag === 2 || successFlag === 3) {
      const errorMsg = result.data?.errorMessage || 'Midjourney generation failed';
      console.error(`[Midjourney Failed] Task ${taskId} - ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Midjourney task timeout after ${maxAttempts * interval / 1000} seconds`);
}

// Helper to parse form data
async function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({ keepExtensions: true, maxFileSize: 10 * 1024 * 1024 }); // 10MB limit
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if this is a multipart/form-data request (for transcription)
    const contentType = req.headers['content-type'] || '';
    let type = 'chat';
    let messages, prompt, userName;

    if (contentType.includes('multipart/form-data')) {
      // Parse form data for transcription
      const { fields, files } = await parseForm(req);
      type = Array.isArray(fields.type) ? fields.type[0] : fields.type || 'transcribe';

      if (type === 'transcribe') {
        // Handle audio transcription
        const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;

        if (!audioFile) {
          return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('[Transcribe Request] Processing audio file:', audioFile.originalFilename);

        try {
          // Send to OpenAI Whisper API
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFile.filepath),
            model: 'whisper-1',
            // Language omitted for auto-detection (supports Arabic, English, and 90+ languages)
          });

          console.log('[Transcribe Success] Text:', transcription.text);

          // Clean up the temporary file
          fs.unlinkSync(audioFile.filepath);

          return res.status(200).json({
            success: true,
            text: transcription.text,
          });
        } catch (error: any) {
          console.error('[Transcribe Error]:', error);
          // Clean up the temporary file on error
          if (fs.existsSync(audioFile.filepath)) {
            fs.unlinkSync(audioFile.filepath);
          }
          throw error;
        }
      }
    } else {
      // Manually parse JSON body since bodyParser is disabled
      let body: any = {};

      console.log('[HomeChat] Content-Type:', req.headers['content-type']);
      console.log('[HomeChat] Method:', req.method);

      // Read the raw body for JSON requests
      const rawBody = await new Promise<string>((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
          data += chunk;
          console.log('[HomeChat] Received chunk, total size:', data.length);
        });
        req.on('end', () => {
          console.log('[HomeChat] Body read complete, size:', data.length);
          resolve(data);
        });
        req.on('error', reject);
      });

      if (rawBody) {
        try {
          body = JSON.parse(rawBody);
          console.log('[HomeChat] Parsed body:', body);
        } catch (e) {
          console.error('[HomeChat] JSON Parse Error:', e);
          console.error('[HomeChat] Raw body:', rawBody.substring(0, 200));
          return res.status(400).json({ error: 'Invalid JSON body' });
        }
      }

      messages = body.messages;
      type = body.type || 'chat';
      prompt = body.prompt;
      userName = body.userName;
    }

    // Handle different request types
    if (type === 'image') {
      // Kie.ai Midjourney Image Generation
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for image generation' });
      }

      console.log(`[Image Request] Generating image with Midjourney for prompt: "${prompt}"`);

      // Create Midjourney image generation task
      const imageData = await callKieAI('/api/v1/mj/generate', {
        taskType: 'mj_txt2img',
        prompt: prompt,
        speed: 'fast',
        aspectRatio: '16:9',
        version: '7',
        enableTranslation: true, // Auto-translate if prompt is not English
      });

      console.log('[Image Response] Create task response:', JSON.stringify(imageData, null, 2));

      const taskId = imageData.data?.taskId;

      if (!taskId) {
        console.error('[Image Error] No taskId in response:', imageData);

        // Check for specific error codes
        if (imageData.code === 402) {
          throw new Error('Insufficient credits. Please top up your account to generate images.');
        }

        throw new Error(imageData.msg || 'Failed to create image generation task');
      }

      console.log(`[Image Task] Created task with ID: ${taskId}, starting polling...`);

      // Poll for task completion using Midjourney-specific endpoint
      const completedTask = await pollMidjourneyStatus(taskId);

      console.log('[Image Completed] Task result:', JSON.stringify(completedTask, null, 2));

      const resultInfoJson = completedTask.data?.resultInfoJson;
      const resultUrls = resultInfoJson?.resultUrls || [];

      // Get all image URLs (Midjourney generates 4 images)
      const imageUrls = resultUrls.map((url: any) => url.resultUrl).filter(Boolean);

      console.log('[Image URLs] Extracted URLs:', imageUrls);

      if (imageUrls.length > 0) {
        return res.status(200).json({
          success: true,
          imageUrls: imageUrls, // Return all image URLs instead of just one
          prompt: prompt
        });
      } else {
        throw new Error('No images were generated');
      }
    } else if (type === 'video') {
      // Kie.ai Sora 2 Pro Video Generation
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for video generation' });
      }

      console.log(`[Video Request] Starting video generation for prompt: "${prompt}"`);

      const videoData = await callKieAI('/api/v1/jobs/createTask', {
        model: 'sora-2-text-to-video',
        input: {
          prompt: prompt,
          aspect_ratio: 'landscape',
          n_frames: '10',
          remove_watermark: true,
        }
      });

      console.log('[Video Response] Create task response:', JSON.stringify(videoData, null, 2));

      const taskId = videoData.data?.taskId || videoData.taskId;

      if (!taskId) {
        console.error('[Video Error] No taskId in response:', videoData);
        throw new Error('Failed to create video generation task');
      }

      console.log(`[Video Task] Created task with ID: ${taskId}, starting polling...`);

      const completedTask = await pollTaskStatus(taskId);

      console.log('[Video Completed] Task result:', JSON.stringify(completedTask, null, 2));

      const resultJson = completedTask.data?.resultJson;
      const result = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
      const videoUrl = result?.resultUrls?.[0] || result?.videoUrl || result?.url;

      console.log('[Video URL] Extracted URL:', videoUrl);

      if (videoUrl) {
        return res.status(200).json({
          success: true,
          videoUrl: videoUrl, // Use Kie.ai URL directly (stored for 15 days)
          type: 'video',
          model: 'sora-2-text-to-video', // Return the model name
        });
      } else {
        console.error('[Video Error] No URL found in result:', result);
        throw new Error('Video generation failed - no URL returned');
      }
    } else if (type === 'code') {
      // Code Generation with GPT-4
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for code generation' });
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful coding assistant. Provide only code blocks without extra explanation.' },
          { role: 'user', content: `Provide only the code block for the following request: ${prompt}` }
        ],
        temperature: 0.7,
      });

      const code = completion.choices[0]?.message?.content || '';

      return res.status(200).json({
        success: true,
        code,
        type: 'code',
        model: 'gpt-4o',
      });
    } else {
      // Regular Chat with GPT-4
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required for chat' });
      }

      // Add system message with user's name if provided
      // Extract first name only if full name is provided
      const firstName = userName ? userName.split(' ')[0] : null;

      const systemMessage = firstName
        ? {
            role: 'system' as const,
            content: `You are Ornina AI, a helpful and friendly AI assistant. You are chatting with ${firstName}. Only mention their name when it's natural and relevant to the conversation (like when greeting them for the first time, or when they ask about their name). Don't use their name in every response. When they ask about your name, introduce yourself as Ornina AI.`
          }
        : {
            role: 'system' as const,
            content: 'You are Ornina AI, a helpful and friendly AI assistant. When users ask about your name or greet you, introduce yourself as Ornina AI.'
          };

      const formattedMessages = [
        systemMessage,
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }))
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content || 'No response';

      return res.status(200).json({
        success: true,
        message: response,
        type: 'chat',
        model: 'gpt-4o',
      });
    }
  } catch (error: any) {
    console.error('HomeChat API error:', error);

    // Handle OpenAI-specific errors
    if (error?.error?.message) {
      return res.status(error.status || 500).json({
        error: 'OpenAI API error',
        details: error.error.message,
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
