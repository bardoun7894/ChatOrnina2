import { NextRequest, NextResponse } from 'next/server';
import KieAIService from '@/services/kieai';

const kieaiService = new KieAIService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, prompt, options } = body;

    if (!type || !prompt) {
      return NextResponse.json(
        { error: 'Type and prompt are required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'text':
        const messages = options?.messages || [{ role: 'user', content: prompt }];
        const model = options?.model || 'gpt-4o';
        result = await kieaiService.chatCompletion(messages, model);
        break;

      case 'image':
        result = await kieaiService.generateImage(prompt, options);
        break;

      case 'video':
        result = await kieaiService.generateVideo(prompt, options);
        break;

      case 'code':
        const language = options?.language || 'javascript';
        result = await kieaiService.generateCode(prompt, language);
        break;

      case 'figma':
        result = await kieaiService.generateFigmaToCode(prompt, options);
        break;

      case 'analyze':
        const { imageBase64, mimeType } = options;
        if (!imageBase64 || !mimeType) {
          return NextResponse.json(
            { error: 'Image data and MIME type are required for analysis' },
            { status: 400 }
          );
        }
        result = await kieaiService.analyzeDesign(imageBase64, mimeType);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be text, image, video, code, figma, or analyze' },
          { status: 400 }
        );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('KIE.AI API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'KIE.AI API endpoint' });
}