import OpenAI from 'openai';

class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chatCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string; name?: string }>;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }) {
    const completion = await this.openai.chat.completions.create({
      model: params.model,
      messages: params.messages.map(msg => {
        const message: any = {
          role: msg.role,
          content: msg.content,
        };
        if (msg.name) {
          message.name = msg.name;
        }
        return message;
      }),
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 1000,
      stream: params.stream || false,
    });

    return completion;
  }

  async generateImage(prompt: string, options: {
    size?: string;
    quality?: string;
    n?: number;
  } = {}) {
    const { size = '1024x1024', quality = 'standard', n = 1 } = options;

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: size as any,
      quality: quality as any,
      n,
      response_format: 'url',
    });

    return response.data?.map(img => ({
      url: img.url,
      revisedPrompt: img.revised_prompt,
    })) || [];
  }

  async generateCode(prompt: string, language: string = 'javascript') {
    const systemPrompt = `You are a helpful assistant that generates code. 
    Generate clean, well-commented, and efficient code in ${language}. 
    Provide only the code without explanations unless specifically requested.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-5',
      messages: messages as any,
      temperature: 0.2, // Lower temperature for more deterministic code
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || 'No code generated';
  }

  async analyzeDesign(imageBase64: string, mimeType: string) {
    const systemPrompt = `You are a design analysis expert. Analyze the uploaded design and generate a detailed prompt that could be used to recreate this design with AI tools.
    Focus on:
    1. Layout and composition
    2. Color scheme and typography
    3. Visual elements and their relationships
    4. Overall style and aesthetic
    5. Key features and functionality
    
    Provide a comprehensive prompt that captures all these elements.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this design and generate a prompt to recreate it.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || 'No analysis generated';
  }
}

export default new OpenAIService();
