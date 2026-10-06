import { Product } from "./product-model.js";

const TABLE_WIDTH = 90;

// ---------- Display helpers (presentation only) ----------

/** Formats one product as an aligned table row. */
function formatProductRow(product) {
  const id = product.productId.padEnd(12);
  const name = product.productName.padEnd(28);
  const category = product.category.padEnd(12);
  const price = `RM${product.price.toFixed(2)}`.padEnd(10);
  return `${id} | ${name} | ${category} | ${price} | ${product.stockQuantity}`;
}

/** Prints a list of products as a table, or an explicit empty-state message. */
function printTable(productList) {
  console.log("=".repeat(TABLE_WIDTH));
  console.log("productId".padEnd(12) + " | " + "productName".padEnd(28) + " | " +
    "category".padEnd(12) + " | " + "price".padEnd(10) + " | stockQuantity");
  console.log("-".repeat(TABLE_WIDTH));
  if (productList.length === 0) {
    console.log("No records found.");
  } else {
    productList.forEach(product => console.log(formatProductRow(product)));
  }
  console.log("=".repeat(TABLE_WIDTH));
}

// ---------- Product management module ----------

export class ProductService {
  #products = [];

  /** Returns the product with the given productId, or undefined. */
  #findProductById(productId) {
    return this.#products.find(product => product.productId === productId);
  }

  /**
   * CREATE: validates the input, builds a Product and stores it.
   * @param {Object} productData - { productId, productName, category, price, stockQuantity }
   * @returns {Product|null} the new product, or null if creation failed
   */
  createProduct(productData) {
    if (this.#findProductById(productData.productId)) {
      console.log(`\n[CREATE FAILED] productId '${productData.productId}' already exists.`);
      return null;
    }
    try {
      const product = new Product(productData);
      this.#products.push(product);
      console.log(`\n[CREATE SUCCESS] '${product.productName}' added.`);
      return product;
    } catch (error) {
      console.log(`\n[CREATE FAILED] ${error.message}`);
      return null;
    }
  }

  /**
   * SEARCH: matches an exact productId, or part of productName / category.
   * Shows the matches (or "Not found"), then the full updated record set.
   * @param {string} criteria
   * @returns {Product[]} matching products
   */
  searchProducts(criteria) {
    console.log(`\n--- SEARCH RESULTS FOR: "${criteria}" ---`);
    const term = String(criteria ?? "").toLowerCase().trim();
    if (term === "") {
      console.log("[SEARCH FAILED] Search criteria cannot be empty.");
      return [];
    }
    const results = this.#products.filter(product =>
      product.productId.toLowerCase() === term ||
      product.productName.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
    if (results.length === 0) console.log("Not found.");
    else printTable(results);
    this.#showFullRecordSet();
    return results;
  }

  /**
   * EDIT: finds the product by productId and applies validated updates
   * through the setters. Shows the full updated record set afterwards.
   * @param {string} productId
   * @param {Object} updates - e.g. { price: 5.2, stockQuantity: 18 }
   * @returns {boolean} true if every update was applied
   */
  editProduct(productId, updates) {
    const product = this.#findProductById(productId);
    if (!product) {
      console.log(`\n[EDIT FAILED] productId '${productId}' not found.`);
      return false;
    }
    try {
      Object.entries(updates).forEach(([field, value]) => { product[field] = value; });
      console.log(`\n[EDIT SUCCESS] '${productId}' updated.`);
      return true;
    } catch (error) {
      console.log(`\n[EDIT FAILED] ${error.message}`);
      return false;
    } finally {
      this.#showFullRecordSet();
    }
  }

  /**
   * DELETE: finds the product, shows its full attributes and asks for
   * confirmation; deletes only when confirmed is true.
   * @param {string} productId
   * @param {boolean} confirmed
   * @returns {boolean} true if the product was deleted
   */
  deleteProduct(productId, confirmed = false) {
    const product = this.#findProductById(productId);
    if (!product) {
      console.log(`\n[DELETE FAILED] productId '${productId}' not found.`);
      return false;
    }
    if (!confirmed) {
      console.log("\n[CONFIRMATION REQUIRED] Are you sure you want to delete this product?");
      printTable([product]);
      console.log("(Call deleteProduct(productId, true) to confirm.)");
      return false;
    }
    this.#products = this.#products.filter(item => item.productId !== productId);
    console.log(`\n[DELETE SUCCESS] '${productId}' deleted.`);
    this.#showFullRecordSet();
    return true;
  }

  /** DISPLAY: prints the given list (default: all products) as a table. */
  displayProducts(productList = this.#products) {
    printTable(productList);
  }

  #showFullRecordSet() {
    console.log("\nFull record set:");
    printTable(this.#products);
  }
}
