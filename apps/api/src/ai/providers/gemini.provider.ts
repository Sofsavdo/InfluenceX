import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';

/**
 * Google Gemini API orqali (generateContent, REST). Hujjat:
 * https://ai.google.dev/api/generate-content
 */
@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'GEMINI' as const;
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly config: ConfigService) {}

  async generateJson(prompt: string): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY sozlanmagan (.env)');
    }

    const model = this.config.get<string>('GEMINI_MODEL', 'gemini-1.5-flash');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Gemini xatosi: ${res.status} ${body}`);
      throw new Error(`Gemini so'rovi muvaffaqiyatsiz: ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  }
}
