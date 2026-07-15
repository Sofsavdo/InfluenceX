import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';

// @Global(): AuthModule (OTP oqimi) shu servisga muhtoj, boshqa modul hozircha yo'q -
// lekin AuthModule allaqachon @Global() bo'lgani uchun bu ham xuddi shu naqshga mos.
@Global()
@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
