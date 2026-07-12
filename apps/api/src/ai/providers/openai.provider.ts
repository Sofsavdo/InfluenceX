import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';

/**
 * OpenAI Chat Completions API orqali (Node 20+ global fetch, qo'shimcha SDK shart emas).
 * Hujjat: https://platform.openai.com/docs/api-reference/chat
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'OPENAI' as const;
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly config: ConfigService) {}

  async generateJson(prompt: string): Promise<string> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY sozlanmagan (.env)');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content:
              'Siz InfluenceX platformasi uchun marketing kampaniyasi brifi yozuvchi yordamchisiz. ' +
              'Faqat so\'ralgan formatdagi JSON bilan javob bering, boshqa hech qanday matn qo\'shmang.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`OpenAI xatosi: ${res.status} ${body}`);
      throw new Error(`OpenAI so'rovi muvaffaqiyatsiz: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '{}';
  }
}
