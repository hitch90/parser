import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as convert from 'xml-js';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import PromiseQueue from 'easy-promise-queue';

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
      producer,
      description: product.opis?._text,
      stock: this.setStock(product),
      category: this.setCategories(product),
      images: product?.zdjecia?._text.split(' ').join(','),
      taxClass: this.setVat(product),
    };
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
    return Math.round((price + (price * vat) / 100) * 1.13) + 0.99;
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
      consumerKey: 'ck_621b6dd1d27b56134a048d28515307abf9e37f44',
      consumerSecret: 'cs_0374c1d420cc8fcb271f5dfff349da6fb0a0b22a',
      version: 'wc/v3',
    });
  }

  async updateStocks() {
    let productsFromAPI = await this.getParsedProducts();
    productsFromAPI = productsFromAPI.slice(0, 1000);
    productsFromAPI.map(async p => await this.getProductInWc(p));
    return true;
  }

  async getProductInWc(product) {
    await this.WooCommerce.get('products', { sku: product.sku })
      .then(res => {
        const productsArr = res.data;
        if (productsArr.length) {
          productsArr.map(async item => {
            await this.updateProductInWc(item, { stock: product.stock })
              .then(c => console.log('updated', c.id))
              .catch(er => console.log('update', product.sku, er.response))
          });
        }
      })
      .catch(err => console.log(product.sku, err.response.status));
  }

  async updateProductInWc(product, data) {
    return await this.WooCommerce.put(`products/${product.id}`, data);
  }
}
