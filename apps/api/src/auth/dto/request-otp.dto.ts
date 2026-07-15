import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  // O'zbekiston formatiga yumshoq talab: + bilan boshlanuvchi, 9-15 raqam.
  // Boshqa mamlakat kodlarini ham qabul qiladi (E.164 umumiy shakli).
  @IsString()
  @Matches(/^\+[1-9]\d{8,14}$/, { message: "Telefon raqam +998901234567 formatida bo'lishi kerak" })
  phone: string;
}
