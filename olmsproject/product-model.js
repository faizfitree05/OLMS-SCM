import { requireNonEmptyString, requireNonNegativeNumber, requireInteger } from "./validators.js";

const MAX_PRODUCT_NAME_LENGTH = 150;

/** Product entity: private fields, validated getters/setters. */
export class Product {
  #productId;
  #productName;
  #category;
  #price;
  #stockQuantity;

  constructor(productData) {
    this.#productId = requireNonEmptyString(productData.productId, "productId");
    this.productName = productData.productName;
    this.category = productData.category;
    this.price = productData.price;
    this.stockQuantity = productData.stockQuantity;
  }

  get productId() { return this.#productId; }

  get productName() { return this.#productName; }
  set productName(newProductName) {
    this.#productName = requireNonEmptyString(newProductName, "productName", MAX_PRODUCT_NAME_LENGTH);
  }

  get category() { return this.#category; }
  set category(newCategory) {
    this.#category = requireNonEmptyString(newCategory, "category");
  }

  get price() { return this.#price; }
  set price(newPrice) {
    this.#price = requireNonNegativeNumber(newPrice, "price");
  }

  get stockQuantity() { return this.#stockQuantity; }
  set stockQuantity(newStockQuantity) {
    this.#stockQuantity = requireInteger(newStockQuantity, "stockQuantity", 0);
  }
}
