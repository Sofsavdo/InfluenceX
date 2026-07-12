import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

// @Global(): TelegramAuthGuard/JwtAuthGuard deyarli har bir modulda (@UseGuards orqali)
// ishlatiladi - har birida alohida "imports: [AuthModule]" yozishdan qochish uchun global qilingan.
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TelegramAuthGuard, JwtAuthGuard],
  exports: [TelegramAuthGuard, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
