import { Module } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreatorsController } from './creators.controller';
import { PackagesModule } from '../packages/packages.module';

@Module({
  imports: [PackagesModule],
  controllers: [CreatorsController],
  providers: [CreatorsService],
})
export class CreatorsModule {}
