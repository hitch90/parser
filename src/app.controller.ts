import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const parser = require('fast-xml-parser');

@Controller()
export class AppController {
  disallowProducts = ['chodzik', 'fotelik', 'wózek', 'adapter', 'adaptery', 'huśtawka',
    'kojec', 'łóżeczko', 'leżaczek', 'rajstopy', 'ubranko', 'waga', 'termoopakowanie', 'krzesełko',
    'uchwyt', 'napoje', 'torba', 'pojemnik', 'szelki', 'pisuar', 'nocnik', 'nakładka', 'wanienka',
    'aspirator', 'inhalator', 'podgrzewacz', 'sterylizator', 'suszarka', 'sanki', 'spacerówka', 'moskitiera'
  ];
  disallowCategory = ['ubranka', 'drewex', 'zetpol', 'promocje', 'womar', 'dr. brown\'s', 'dla mamy', 'wagi', 'elektronika', '59s'];

  constructor(private readonly appService: AppService) {
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('marini')
  async getMariniJSON() {
    const json = await this.appService.getMariniXml();
    let products = JSON.parse(json).MARINI.b2b;
    const parsedProducts = [];
    console.log(products[8885]);
    this.disallowProducts.map(i => {
      products = products.filter(item => {
        const name = item.nazwa._text.toLowerCase().split(' ');
        return name.indexOf(i) === -1;
      });
    });

    this.disallowCategory.map(i => {
      products = products.filter(item => {
        const category = item.grupa._text.toLowerCase().trim().split('/');
        return category.indexOf(i) === -1;
      });
    });

    for (const product of products) {
      parsedProducts.push(this.appService.parseProduct(product));
    }

    return parsedProducts;
  }
}
