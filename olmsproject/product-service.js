import { BaseService } from './base-service.js';
import { InsufficientStockError, ValidationError } from './errors.js';
import { formatMoney } from './money.js';
import { Product } from './product-model.js';
import { rejectUnknownFields, requirePlainObject } from './input-guard.js';

const PRODUCT_FIELDS = ['productId', 'productName', 'category', 'price', 'stockQuantity'];
const EDITABLE_FIELDS = ['productName', 'category', 'price', 'stockQuantity'];

const PRODUCT_COLUMNS = [
  { header: 'productId', value: (p) => p.productId },
  { header: 'productName', value: (p) => p.productName },
  { header: 'category', value: (p) => p.category },
  { header: 'price', value: (p) => formatMoney(p.price), align: 'right' },
  { header: 'stockQuantity', value: (p) => p.stockQuantity, align: 'right' },
];

/** Product management module: Create, Search, Edit, Delete and Data Display. */
export class ProductService extends BaseService {
  constructor() {
    super('Product', 'productId', PRODUCT_COLUMNS);
  }

  // ---------- core operations ----------
  add(productData) {
    requirePlainObject(productData, 'productData');
    rejectUnknownFields(productData, PRODUCT_FIELDS, 'productData');
    return this.insert(new Product(productData));
  }

  update(productId, updates) {
    return this.applyUpdates(this.getById(productId), updates, EDITABLE_FIELDS, Product);
  }

  matches(product, term) {
    return product.productId.toLowerCase() === term
      || product.productName.toLowerCase().includes(term)
      || product.category.toLowerCase().includes(term);
  }

  describe(product) {
    return { ...product.toJSON(), price: formatMoney(product.price) };
  }

  /** Adds (positive) or removes (negative) stock; never lets stock go below zero. */
  adjustStockQuantity(productId, delta) {
    if (!Number.isInteger(delta) || delta === 0) throw new ValidationError('stock change must be a non-zero integer.');
    const product = this.getById(productId);
    if (product.stockQuantity + delta < 0) {
      throw new InsufficientStockError(
        `Insufficient stock for ${productId}: requested ${-delta}, available ${product.stockQuantity}.`);
    }
    product.stockQuantity = product.stockQuantity + delta;
    return product;
  }

  // ---------- console API (names from the Part 1 method dictionary) ----------
  createProduct(productData) { return this.runCreate(productData); }

  searchProducts(criteria) { return this.runSearch(criteria); }

  editProduct(productId, updates) { return this.runEdit(productId, updates); }

  deleteProduct(productId, confirmed = false) { return this.runDelete(productId, confirmed); }

  displayProducts(productList) { this.display(productList); }
}
