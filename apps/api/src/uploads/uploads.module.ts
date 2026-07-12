import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [S3Service],
  exports: [S3Service],
})
export class UploadsModule {}
