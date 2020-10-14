import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const convert = require('xml-js');
import axios from 'axios';

@Injectable()
export class AppService {
  producerToReplace = ['4 BABY', 'MATEX', 'SCORPIO', 'TT', 'Dr.Browns', 'Angelcare', 'ANGELCARE', 'Nikidom', 'THERMOBABY', 'AZ', 'B.O.'];
  categoryToMap = [
    {
      name: 'gryzak',
      toName: 'Zabawki > Gryzaki',
    },
    {
      name: 'gryzaki',
      toName: 'Zabawki > Gryzaki',
    },
    {
      name: 'grzechotka',
      toName: 'Zabawki > Grzechotki',
    },
    {
      name: 'pojemnik na smoczek',
      toName: 'Smoczki > Pojemniki na smoczki',
    },
    {
      name: 'przytulanka',
      toName: 'Zabawki > Pluszowe'
    },
    {
      name: 'lalka',
      toName: 'Zabawki > Lalki'
    },
    {
      name: 'Smoczki i ustniki',
      toName: 'Smoczki'
    },
    {
      name: 'smoczki uspakajające',
      toName: 'Smoczki > Smoczki uspakajające'
    },
    {
      name: 'butelki',
      toName: 'Butelki i kubki'
    },
    {
      name: 'bidon',
      toName: 'Butelki i kubki'
    },
    {
      name: 'okrycie kąpielowe',
      toName: 'Ręczniki i okrycia kąpielowe > Okrycia kąpielowe'
    },
    {
      name: 'ręcznik',
      toName: 'Ręczniki i okrycia kąpielowe > Ręczniki'
    },
    {
      name: 'sztućce',
      toName: 'Naczynia i sztućce'
    },
    {
      name: 'gryzaczek do karmienia',
      toName: 'Karmienie'
    },
    {
      name: 'wkłady wymienne do gryzaczka',
      toName: 'Karmienie'
    },
    {
      name: 'lusterko do obserwacji',
      toName: 'Akcesoria samochodowe'
    },
    {
      name: 'zasłonki przeciwsłoneczne',
      toName: 'Akcesoria samochodowe'
    },
    {
      name: 'zasłonka samochodowa',
      toName: 'Akcesoria samochodowe'
    },
    {
      name: 'osłona przeciwsłoneczna',
      toName: 'Akcesoria samochodowe'
    },
    {
      name: 'zasłonki samochodowe',
      toName: 'Akcesoria samochodowe'
    },
    {
      name: 'termometr bezdotykowy',
      toName: 'Zdrowie'
    },
    {
      name: 'inteligentny termometr',
      toName: 'Zdrowie'
    },
    {
      name: 'inteligentny wskaźnik temperatury',
      toName: 'Zdrowie'
    },


  ];

  constructor() {}

  async getMariniXml() {
    const xml = await axios('https://marini.pl/b2b/marini-b2b.xml').then(res => res);
    return convert.xml2json(xml.data, { compact: true, spaces: 4 });
  }

  getHello(): string {
    return 'Hello World!';
  }

  parseProduct(product) {
    const producer = this.getProducer(product);
    let name = product.nazwa._text;

    this.producerToReplace.map(i => {
      name = name.replace(i, '');
    });

    return {
      id: product.kod._text,
      sku: this.setSku(product),
      name: this.setName(name.replace(producer, '').trim()),
      price: this.setPrice(product),
      producer,
      description: product.opis?._text,
      stock: this.setStock(product),
      category: this.setCategories(product),
      images: product?.zdjecia?._text.split(' ').join(','),
      taxClass: this.setVat(product)
    };
  }

  setSku({ kod, EAN }) {
    if (EAN?._text) return EAN._text;
    return kod._text;
  }

  setName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  setCategories({ grupa, nazwa }) {
    const cat = grupa._text;
    const name = nazwa._text.toLowerCase().trim();

    let cats = cat.split('/');

    cats = cats.filter(i => i !== 'AKCESORIA');

    cats = cats.map(c => {
      const name = c.toLowerCase().trim();
      return name.charAt(0).toUpperCase() + name.slice(1);
    });

    const producer = cats[0];
    if (producer.toLowerCase() === 'akcesoria') {
      return 'Akcesoria';
    }

    if (cats.length === 1 && cats[0] !== 'Akcesoria') {
      return 'Akcesoria > ' + cats[0];
    }

    if (cats.indexOf('Akcesoria') === -1) {
      cats[0] = 'Akcesoria';
    }

    let catToReturn = cats.join(' > ');

    const catsToLower = cats.map(i => i.toLowerCase().trim());
    this.categoryToMap.map(i => {
      if (name.indexOf(i.name) > -1) {
        catToReturn = 'Akcesoria > ' + i.toName;
      } else if (catsToLower.indexOf(i.name) > -1) {
        catToReturn = 'Akcesoria > ' + i.toName;
      }
    });

    return catToReturn;
  }

  setPrice({ cena, VAT }) {
    const vat = parseInt(VAT._text);
    const price = parseInt(cena._text);
    return Math.round((price + (price * vat / 100)) * 1.13) + 0.99;
  }

  setVat({VAT}) {
    const vat = parseInt(VAT._text);
    if (vat === 23) {
      return '';
    }
    if (vat === 5) {
      return 'obnizona-stawka-5';
    }
    if (vat === 8) {
      return 'obnizona-stawka-8';
    }
    return 'zerowa-stawka';
  }

  getProducer({ grupa }) {
    const producer = grupa?._text;
    if (producer) {
      return producer.split('/')[0].trim();
    }
  }

  setStock({ stan }) {
    const stock = stan._text;
    if (stock === 'brak') return 0;
    if (stock === 'mała ilość') return 5;
    if (stock === 'średnia ilość') return 10;
    if (stock === 'duża ilość') return 20;
    return 1;
  }
}
