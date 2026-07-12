import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ApplicationsModule } from './applications/applications.module';
import { EscrowModule } from './escrow/escrow.module';
import { ChatModule } from './chat/chat.module';
import { RatingsModule } from './ratings/ratings.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { UploadsModule } from './uploads/uploads.module';
import { PricingModule } from './pricing/pricing.module';
import { MatchingModule } from './matching/matching.module';
import { FraudModule } from './fraud/fraud.module';
import { ConversionsModule } from './conversions/conversions.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { EarningsModule } from './earnings/earnings.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 2026-07-11 xavfsizlik kuchaytirilishi: PRD "AI Fraud Detection"/production-readiness
    // tahlilida qayd etilgan bo'shliq - avval hech qanday so'rov chegaralash (rate limiting)
    // yo'q edi, bu esa brute-force (admin login) va DoS xavfini oshirardi. Standart:
    // 1 daqiqada IP boshiga 100 so'rov; sezgir endpoint'lar (auth/admin/login) alohida
    // @Throttle() bilan qattiqroq cheklanadi (auth.controller.ts).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    ApplicationsModule,
    EscrowModule,
    ChatModule,
    RatingsModule,
    AdminModule,
    AiModule,
    TelegramBotModule,
    UploadsModule,
    PricingModule,
    MatchingModule,
    FraudModule,
    ConversionsModule,
    PortfolioModule,
    EarningsModule,
    AnalyticsModule,
    ProductsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
