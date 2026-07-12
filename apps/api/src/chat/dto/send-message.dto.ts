import { IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString() threadId: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
}
