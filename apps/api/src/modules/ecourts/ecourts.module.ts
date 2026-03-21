import { Module } from '@nestjs/common';
import { EcourtsController } from './ecourts.controller';
import { EcourtsService } from './ecourts.service';

@Module({
  controllers: [EcourtsController],
  providers: [EcourtsService],
  exports: [EcourtsService],
})
export class EcourtsModule {}
