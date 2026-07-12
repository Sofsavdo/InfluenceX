import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(TelegramAuthGuard)
  @Get('thread/:id')
  getThread(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.chatService.getThread(req.userId, id);
  }

  @UseGuards(TelegramAuthGuard)
  @Post('message')
  sendMessage(@Req() req: Request & { userId: string }, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(req.userId, dto);
  }
}
