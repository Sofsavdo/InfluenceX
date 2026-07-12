import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ContentType } from '@influencex/shared';

// PRD kelajak reja "Shop Integrations" - yengil versiya (2026-07-12). Biznes o'z mahsulot/
// xizmatini ro'yxatga qo'shadi - InfluenceX checkout/inventar/domain BOSHQARMAYDI, faqat
// mahsulotni "blogerlarga ko'rinsin" belgisi orqali CPA kampaniyaga aylantiradi.
export class CreateProductDto {
  @IsString() name: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;

  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsString() currency?: string; // standart UZS

  // Mahsulotning haqiqiy sotuv/buyurtma sahifasi (Uzum e'loni, Instagram/Telegram do'koni,
  // o'z sayti va h.k.) - InfluenceX bu yerda checkout QILMAYDI, faqat shu sahifaga yo'naltiradi.
  @IsUrl({ require_tld: false }) externalUrl: string;

  // Har bir tasdiqlangan konversiya (sotuv) uchun kreatorga to'lanadigan summa.
  @IsNumber() @Min(0) cpaRate: number;

  @IsOptional() @IsEnum(ContentType) contentType?: ContentType;

  // "Blogerlarga ko'rinsin" yoqilganda avtomatik yaratiladigan CPA kampaniyada nechta
  // bloger qatnasha olishi (standart: 20 - katalog uslubidagi kampaniya, ko'p kishiga ochiq).
  @IsOptional() @IsInt() @Min(1) creatorsCount?: number;
}
