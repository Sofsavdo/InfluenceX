import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { S3Service } from './s3.service';
import { PresignUploadDto } from './dto/presign-upload.dto';

/**
 * PRD "Portfolio", "Avatar", "Logo", chat "attachmentUrl" - hammasi shu bir xil
 * presign oqimidan foydalanadi: client -> API (JWT emas, Telegram initData bilan
 * himoyalangan) -> presigned PUT URL -> client to'g'ridan-to'g'ri S3'ga yuklaydi.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly s3Service: S3Service) {}

  @UseGuards(TelegramAuthGuard)
  @Post('presign')
  presign(@Body() dto: PresignUploadDto) {
    return this.s3Service.presignUpload(dto.purpose, dto.fileName, dto.contentType);
  }
}
