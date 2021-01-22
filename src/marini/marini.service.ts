import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as convert from 'xml-js';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

@Injectable()
export class MariniService {
  WooCommerce = null;
  producerToReplace = [
    '4 BABY',
    'MATEX',
    'SCORPIO',
    'TT',
    'Dr.Browns',
    'Angelcare',
    'ANGELCARE',
    'Nikidom',
    'THERMOBABY',
    'AZ',
    'B.O.',
  ];

  constructor() {
    this.wcConnection();
  }

  async getParsedProducts() {
    const json = await this.getMariniXml();
    const products = JSON.parse(json).MARINI.b2b;
    const parsedProducts = [];

    for (const product of products) {
      parsedProducts.push(this.parseProduct(product));
    }

    return parsedProducts;
  }

  async getMariniXml() {
    const xml = await axios('https://marini.pl/b2b/marini-b2b.xml').then(
      res => res,
    );
    return convert.xml2json(xml.data, { compact: true, spaces: 4 });
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
      promo_price: this.setPromoPrice(product),
      producer,
      description: product.opis?._text,
      stock: this.setStock(product),
      category: this.setCategories(product),
      images: this.setImages(product),
      taxClass: this.setVat(product),
    };
  }

  setImages({ zdjecia }) {
    if (zdjecia?._text) {
      const imgArr = [];
      zdjecia._text.split(' ').map(img => imgArr.push({ src: img }));
      return imgArr;
    }
  }

  setSku({ kod, EAN }) {
    if (EAN?._text) return EAN._text;
    return kod._text;
  }

  setName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  setCategories({ grupa, nazwa }) {
    const cat = grupa._text;
    return cat.split('/').join('>');
  }

  setPrice({ cena, VAT }) {
    const vat = parseInt(VAT._text);
    const price = parseInt(cena._text);

    if (price > 500) {
      return Math.round((price + (price * vat) / 100) * 1.06) + 0.99;
    } else if (price > 400) {
      return Math.round((price + (price * vat) / 100) * 1.08) + 0.99;
    } else if (price > 300) {
      return Math.round((price + (price * vat) / 100) * 1.1) + 0.99;
    } else if (price > 200) {
      return Math.round((price + (price * vat) / 100) * 1.12) + 0.99;
    } else if (price > 100) {
      return Math.round((price + (price * vat) / 100) * 1.16) + 0.99;
    }

    return Math.round((price + (price * vat) / 100) * 1.2) + 0.99;
  }

  setPromoPrice({ cena, VAT }) {
    const vat = parseInt(VAT._text);
    const price = parseInt(cena._text);

    if (price > 500) {
      return Math.round((price + (price * vat) / 100) * 1.03) + 0.99;
    } else if (price > 400) {
      return Math.round((price + (price * vat) / 100) * 1.04) + 0.99;
    } else if (price > 300) {
      return Math.round((price + (price * vat) / 100) * 1.06) + 0.99;
    } else if (price > 200) {
      return Math.round((price + (price * vat) / 100) * 1.08) + 0.99;
    } else if (price > 100) {
      return Math.round((price + (price * vat) / 100) * 1.1) + 0.99;
    }

    return Math.round((price + (price * vat) / 100) * 1.10) + 0.99;
  }

  setVat({ VAT }) {
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

  wcConnection() {
    this.WooCommerce = new WooCommerceRestApi({
      url: 'https://kidify.pl',
      consumerKey: 'ck_5d7957b0d032201a10f84763f7578fd14c057a8d',
      consumerSecret: 'cs_bf5729ca9177c4454183abb99df4bcb963a163f4',
      version: 'wc/v3',
    });
  }

  async updateStocks() {
    const productsFromMarini = await this.getParsedProducts();
    const productsWithVariants = [];
    for (let i = 0; i < productsFromMarini.length; i++) {
      const p = productsFromMarini[i];
      const pData = await this.getProductInWc(p);
      const productsFromWC = pData.data;
      console.log(`zaczynam przetwarzanie elementu ${i}`);
      if (productsFromWC.length) {
        console.log(`przetwarzam ${productsFromWC[0].id}`);
        if (productsFromWC[0].type === 'variable') {
          productsWithVariants.push(productsFromWC[0]);
          console.log(`produkt z wariantami ${productsFromWC[0].id}`);
        } else if (productsFromWC[0].type == 'simple' && productsFromWC[0].stock_quantity != p.stock && productsFromWC[0].regular_price != p.price) {
            const updatedProduct = await this.updateProductInWc(productsFromWC[0], {
              stock_quantity: p.stock,
              regular_price: p.price.toString(),
              sale_price: p.promo_price.toString(),
              manage_stock: true
            });
            console.log(`Zaktualizowany ${i} z ${productsFromMarini.length}, `, updatedProduct.data.sku);
          }
        } else {
          console.log('tworze product');
          const createdProduct = await this.createProductInWC(p);
          console.log('Utworzony product', createdProduct.data.name);
        }
      }
    return true;
  }

  getProductInWc(product) {
    return this.WooCommerce.get('products', { sku: product.sku })
  }

  updateProductInWc(product, data) {
    console.log(data);
    return this.WooCommerce.put(`products/${product.id}`, data);
  }

  createProductInWC(product) {
    return this.WooCommerce.post(`products`, {
      name: product.name,
      type: "simple",
      regular_price: product.price.toString(),
      sale_price: product.promo_price.toString(),
      description: product.description,
      "categories": [],
      images: product.images,
      sku: product.sku.toString(),
      stock_quantity: product.stock,
      manage_stock: true,
      tax_class: product.taxClass
    });
  }
}
