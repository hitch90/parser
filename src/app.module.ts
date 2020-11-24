import { HttpModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MariniModule } from './marini/marini.module';

@Module({
  imports: [HttpModule, MariniModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
