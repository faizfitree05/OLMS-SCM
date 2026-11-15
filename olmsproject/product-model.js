import {
  MAX_CATEGORY_LENGTH, MAX_PRODUCT_NAME_LENGTH, MAX_STOCK_LIMIT,
} from './constants.js';
import { requirePlainObject } from './input-guard.js';
import {
  requireId, requireIntegerInRange, requireMaxLength, requireMoney, requireNonEmptyString,
} from './validators.js';

/** Product entity. All fields are private; changes go through validating setters. */
export class Product {
  #productId;
  #productName;
  #category;
  #price;
  #stockQuantity;

  constructor(productData) {
    requirePlainObject(productData, 'productData');
    this.#productId = requireId(productData.productId, 'productId');
    this.productName = productData.productName;
    this.category = productData.category;
    this.price = productData.price;
    this.stockQuantity = productData.stockQuantity;
  }

  get productId() { return this.#productId; }
  get productName() { return this.#productName; }
  get category() { return this.#category; }
  get price() { return this.#price; }
  get stockQuantity() { return this.#stockQuantity; }

  set productName(value) {
    const name = requireNonEmptyString(value, 'productName');
    this.#productName = requireMaxLength(name, MAX_PRODUCT_NAME_LENGTH, 'productName');
  }

  set category(value) {
    const category = requireNonEmptyString(value, 'category');
    this.#category = requireMaxLength(category, MAX_CATEGORY_LENGTH, 'category');
  }

  set price(value) { this.#price = requireMoney(value, 'price'); }

  set stockQuantity(value) {
    this.#stockQuantity = requireIntegerInRange(value, 0, MAX_STOCK_LIMIT, 'stockQuantity');
  }

  toJSON() {
    return {
      productId: this.#productId,
      productName: this.#productName,
      category: this.#category,
      price: this.#price,
      stockQuantity: this.#stockQuantity,
    };
  }
}
