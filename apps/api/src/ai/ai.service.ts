import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { AiProvider } from './providers/ai-provider.interface';
import { GenerateBriefDto } from './dto/generate-brief.dto';
import { BriefResultDto } from './dto/brief-result.dto';

/**
 * PRD (asl PRD "AI Brief Generator"): Biznes mahsulotini tavsiflaydi,
 * AI professional kampaniya brifini avtomatik yaratadi. PRD v2 §5:
 * bu Faza 1'ning yagona AI moduli (Pricing/Matching/Fraud Detection - Faza 2).
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly openAi: OpenAiProvider,
    private readonly gemini: GeminiProvider,
  ) {}

  async generateBrief(dto: GenerateBriefDto): Promise<BriefResultDto> {
    const provider = this.resolveProvider();
    const prompt = this.buildPrompt(dto);

    let raw: string;
    try {
      raw = await provider.generateJson(prompt);
    } catch (err) {
      this.logger.error(`AI brief generatsiyasi muvaffaqiyatsiz: ${(err as Error).message}`);
      throw new InternalServerErrorException(
        'AI brief generatsiya qilinmadi. AI_PROVIDER/OPENAI_API_KEY/GEMINI_API_KEY sozlamalarini tekshiring.',
      );
    }

    return this.parseAndValidate(raw);
  }

  private resolveProvider(): AiProvider {
    const preferred = this.config.get<string>('AI_PROVIDER', 'openai').toLowerCase();
    return preferred === 'gemini' ? this.gemini : this.openAi;
  }

  private buildPrompt(dto: GenerateBriefDto): string {
    return `Quyidagi mahsulot/xizmat tavsifi asosida InfluenceX platformasi uchun kreator marketing kampaniyasi brifi tuzing.

Mahsulot/xizmat tavsifi: "${dto.productDescription}"
${dto.objectiveHint ? `Maqsad bo'yicha ishora: "${dto.objectiveHint}"` : ''}
${dto.budgetHint ? `Byudjet bo'yicha ishora: "${dto.budgetHint}"` : ''}

Javobni FAQAT quyidagi JSON formatida qaytaring (o'zbek tilida, boshqa hech qanday matn qo'shmang):
{
  "title": "qisqa va jozibali kampaniya sarlavhasi",
  "description": "2-4 jumlali batafsil tavsif",
  "objective": "kampaniyaning asosiy maqsadi (masalan: sotuvni oshirish, brend tanilishi, ilova o'rnatish)",
  "suggestedContentType": "REEL | STORY | POST | UGC_VIDEO | PRODUCT_REVIEW dan biri",
  "suggestedCollaborationModel": "FIXED | BARTER dan biri (MVP'da faqat shular qo'llab-quvvatlanadi)",
  "suggestedBudgetRangeUzs": { "min": raqam, "max": raqam },
  "creatorRequirements": {
    "minFollowers": raqam,
    "categories": ["kategoriya1", "kategoriya2"],
    "languages": ["uz"]
  }
}`;
  }

  private parseAndValidate(raw: string): BriefResultDto {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new InternalServerErrorException('AI javobi JSON formatida emas — qayta urinib ko\'ring');
    }

    if (!parsed.title || !parsed.description || !parsed.objective) {
      throw new InternalServerErrorException('AI javobida majburiy maydonlar yetishmayapti');
    }

    return {
      title: parsed.title,
      description: parsed.description,
      objective: parsed.objective,
      suggestedContentType: parsed.suggestedContentType ?? 'REEL',
      suggestedCollaborationModel: parsed.suggestedCollaborationModel ?? 'FIXED',
      suggestedBudgetRangeUzs: parsed.suggestedBudgetRangeUzs ?? { min: 0, max: 0 },
      creatorRequirements: parsed.creatorRequirements ?? {},
    };
  }
}
