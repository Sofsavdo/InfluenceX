import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Admin Panel (apps/admin, Next.js — desktop brauzer, Telegram WebView emas) uchun
 * Bearer JWT autentifikatsiyasi. PRD v2 §2: Moderator/Admin alohida veb-asoslangan
 * Admin Panel orqali ishlaydi, shuning uchun TelegramAuthGuard'dan farqli, oddiy
 * email+parol -> JWT oqimidan foydalanadi (AuthService.loginAdmin).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization: Bearer <token> header topilmadi');
    }

    const token = authHeader.slice('Bearer '.length);
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati o\'tgan');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    request.user = user;
    request.userId = user.id;
    return true;
  }
}
