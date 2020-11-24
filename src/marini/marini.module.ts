import { Module } from '@nestjs/common';
import { MariniService } from './marini.service';
import { MariniController } from './marini.controller';

@Module({
  providers: [MariniService],
  controllers: [MariniController]
})
export class MariniModule {}
