import { Controller, Get } from '@nestjs/common';
import { MariniService } from './marini.service';

@Controller('marini')
export class MariniController {
  constructor(private mariniService: MariniService) {
  }

  @Get('products')
  async getMariniJSON() {
    return await this.mariniService.getParsedProducts();
  }

  @Get('update-stocks')
  updateStocksMariniProducts() {
    return this.mariniService.updateStocks();
  }
}
