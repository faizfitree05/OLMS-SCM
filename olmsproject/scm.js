// scm.js - entities (Product, User, Order), their services and the ScmSystem facade
import {
  BaseService, DuplicateError, ForbiddenError, InsufficientStockError, InvalidStateError, ValidationError,
  formatMoney, roundMoney, printDetails, printTable,
  rejectUnknownFields, requireAtLeastOneField, requirePlainObject,
  MAX_CATEGORY_LENGTH, MAX_PRODUCT_NAME_LENGTH, MAX_STOCK_LIMIT, MAX_USER_NAME_LENGTH, MAX_ITEM_QUANTITY,
  MAX_ORDER_ITEMS, USER_ROLES, ORDER_STATUSES, STATUS_TRANSITIONS, OPEN_ORDER_STATUSES,
  requireArrayLength, requireEnum, requireId, requireIntegerInRange, requireIsoDate, requireMaxLength,
  requireMoney, requireNonEmptyString, requireValidEmail,
} from './core.js';

// ===== product-model.js =====
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

// ===== user-model.js =====
/** User entity (customer, admin or driver) with validated accessors. */
export class User {
  #userId;
  #name;
  #email;
  #role;

  constructor(userData) {
    requirePlainObject(userData, 'userData');
    this.#userId = requireId(userData.userId, 'userId');
    this.name = userData.name;
    this.email = userData.email;
    this.role = userData.role;
  }

  get userId() { return this.#userId; }
  get name() { return this.#name; }
  get email() { return this.#email; }
  get role() { return this.#role; }

  set name(value) {
    const name = requireNonEmptyString(value, 'name');
    this.#name = requireMaxLength(name, MAX_USER_NAME_LENGTH, 'name');
  }

  set email(value) { this.#email = requireValidEmail(value); }

  set role(value) { this.#role = requireEnum(value, USER_ROLES, 'role'); }

  toJSON() {
    return { userId: this.#userId, name: this.#name, email: this.#email, role: this.#role };
  }
}

// ===== order-model.js =====
/** One product line of an order. unitPrice is locked when the order is placed. */
export class OrderItem {
  #productId;
  #itemQuantity;
  #unitPrice;

  constructor(itemData) {
    requirePlainObject(itemData, 'order item');
    this.#productId = requireId(itemData.productId, 'productId');
    this.itemQuantity = itemData.itemQuantity;
    this.#unitPrice = requireMoney(itemData.unitPrice, 'unitPrice');
  }

  get productId() { return this.#productId; }
  get itemQuantity() { return this.#itemQuantity; }
  get unitPrice() { return this.#unitPrice; }

  set itemQuantity(value) {
    this.#itemQuantity = requireIntegerInRange(value, 1, MAX_ITEM_QUANTITY, 'itemQuantity');
  }

  calculateSubtotal() { return roundMoney(this.#itemQuantity * this.#unitPrice); }

  toJSON() {
    return {
      productId: this.#productId,
      itemQuantity: this.#itemQuantity,
      unitPrice: this.#unitPrice,
      subtotal: this.calculateSubtotal(),
    };
  }
}

/** Customer order. New orders always start as PENDING. */
export class Order {
  #orderId;
  #customerId;
  #orderDate;
  #status = 'PENDING';
  #items;

  constructor(orderData) {
    requirePlainObject(orderData, 'orderData');
    this.#orderId = requireId(orderData.orderId, 'orderId');
    this.#customerId = requireId(orderData.customerId, 'customerId');
    this.#orderDate = requireIsoDate(orderData.orderDate ?? new Date().toISOString(), 'orderDate');
    this.#items = Order.#buildItems(orderData.items);
  }

  static #buildItems(itemsData) {
    requireArrayLength(itemsData, 1, MAX_ORDER_ITEMS, 'items');
    const items = itemsData.map((itemData) => new OrderItem(itemData));
    const ids = new Set(items.map((item) => item.productId));
    if (ids.size !== items.length) throw new ValidationError('items must not repeat a productId.');
    return items;
  }

  get orderId() { return this.#orderId; }
  get customerId() { return this.#customerId; }
  get orderDate() { return this.#orderDate; }
  get status() { return this.#status; }
  get items() { return [...this.#items]; }
  get totalAmount() { return this.calculateTotal(); }

  calculateTotal() {
    return roundMoney(this.#items.reduce((sum, item) => sum + item.calculateSubtotal(), 0));
  }

  /** Validates the requested status and the life-cycle rule; returns the canonical status. */
  assertCanTransitionTo(newStatus) {
    const target = requireEnum(newStatus, ORDER_STATUSES, 'status');
    if (!STATUS_TRANSITIONS[this.#status].includes(target)) {
      throw new InvalidStateError(`Cannot change status from ${this.#status} to ${target}.`);
    }
    return target;
  }

  updateStatus(newStatus) { this.#status = this.assertCanTransitionTo(newStatus); }

  toJSON() {
    return {
      orderId: this.#orderId,
      customerId: this.#customerId,
      orderDate: this.#orderDate,
      status: this.#status,
      items: this.#items.map((item) => item.toJSON()),
      totalAmount: this.calculateTotal(),
    };
  }
}

// ===== product-service.js =====
const PRODUCT_FIELDS = ['productId', 'productName', 'category', 'price', 'stockQuantity'];
const PRODUCT_EDITABLE_FIELDS = ['productName', 'category', 'price', 'stockQuantity'];

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
    return this.applyUpdates(this.getById(productId), updates, PRODUCT_EDITABLE_FIELDS, Product);
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

// ===== user-service.js =====
const USER_FIELDS = ['userId', 'name', 'email', 'role'];
const USER_EDITABLE_FIELDS = ['name', 'email', 'role'];

const USER_COLUMNS = [
  { header: 'userId', value: (u) => u.userId },
  { header: 'name', value: (u) => u.name },
  { header: 'email', value: (u) => u.email },
  { header: 'role', value: (u) => u.role },
];

/** User management module: Create, Search, Edit, Delete and Data Display. */
export class UserService extends BaseService {
  constructor() {
    super('User', 'userId', USER_COLUMNS);
  }

  add(userData) {
    requirePlainObject(userData, 'userData');
    rejectUnknownFields(userData, USER_FIELDS, 'userData');
    const user = new User(userData);
    this.#assertEmailAvailable(user.email, null);
    return this.insert(user);
  }

  update(userId, updates) {
    const user = this.getById(userId);
    if (updates && typeof updates === 'object' && 'email' in updates) {
      this.#assertEmailAvailable(requireValidEmail(updates.email), user.userId);
    }
    return this.applyUpdates(user, updates, USER_EDITABLE_FIELDS, User);
  }

  matches(user, term) {
    return user.userId.toLowerCase() === term
      || user.name.toLowerCase().includes(term)
      || user.email.includes(term)
      || user.role.toLowerCase() === term;
  }

  #assertEmailAvailable(email, ownUserId) {
    const clash = this.all().find((u) => u.email === email && u.userId !== ownUserId);
    if (clash) throw new DuplicateError(`Duplicate email "${email}" (already used by ${clash.userId}).`);
  }

  createUser(userData) { return this.runCreate(userData); }

  searchUsers(criteria) { return this.runSearch(criteria); }

  editUser(userId, updates) { return this.runEdit(userId, updates); }

  deleteUser(userId, confirmed = false) { return this.runDelete(userId, confirmed); }

  displayUsers(userList) { this.display(userList); }
}

// ===== order-service.js =====
const ORDER_FIELDS = ['orderId', 'customerId', 'items'];
const LINE_FIELDS = ['productId', 'itemQuantity'];

const ORDER_COLUMNS = [
  { header: 'orderId', value: (o) => o.orderId },
  { header: 'customerId', value: (o) => o.customerId },
  { header: 'orderDate', value: (o) => o.orderDate.slice(0, 10) },
  { header: 'status', value: (o) => o.status },
  { header: 'items', value: (o) => o.items.length, align: 'right' },
  { header: 'totalAmount', value: (o) => formatMoney(o.calculateTotal()), align: 'right' },
];

const ITEM_COLUMNS = [
  { header: 'productId', value: (i) => i.productId },
  { header: 'itemQuantity', value: (i) => i.itemQuantity, align: 'right' },
  { header: 'unitPrice', value: (i) => formatMoney(i.unitPrice), align: 'right' },
  { header: 'subtotal', value: (i) => formatMoney(i.calculateSubtotal()), align: 'right' },
];

/**
 * Order module. Depends on ProductService (stock, prices) and UserService (customers),
 * which are injected so the three modules are integrated without being tightly coupled.
 */
export class OrderService extends BaseService {
  #products;
  #users;

  constructor(productService, userService) {
    super('Order', 'orderId', ORDER_COLUMNS);
    this.#products = productService;
    this.#users = userService;
    productService.addDeletionGuard((id) => this.#assertProductNotInOpenOrder(id));
    userService.addDeletionGuard((id) => this.#assertCustomerHasNoOpenOrders(id));
  }

  // ---------- core operations ----------
  add(orderData) {
    requirePlainObject(orderData, 'orderData');
    rejectUnknownFields(orderData, ORDER_FIELDS, 'orderData');
    const customer = this.#requireCustomer(orderData.customerId);
    const lines = this.#priceLines(orderData.items);
    const order = new Order({ orderId: orderData.orderId, customerId: customer.userId, items: lines });
    this.insert(order);
    lines.forEach((line) => this.#products.adjustStockQuantity(line.productId, -line.itemQuantity));
    return order;
  }

  update(orderId, updates) {
    const order = this.getById(orderId);
    requirePlainObject(updates, 'updates');
    rejectUnknownFields(updates, ['status'], 'updates');
    requireAtLeastOneField(updates, 'updates');
    const target = order.assertCanTransitionTo(updates.status);
    if (target === 'CANCELLED') this.#restock(order);
    order.updateStatus(target);
    return order;
  }

  remove(orderId) {
    const order = this.getById(orderId);
    if (order.status !== 'CANCELLED') {
      throw new InvalidStateError(`Only CANCELLED orders can be deleted (current status: ${order.status}).`);
    }
    return super.remove(orderId);
  }

  matches(order, term) {
    return order.orderId.toLowerCase() === term
      || order.customerId.toLowerCase() === term
      || order.status.toLowerCase() === term;
  }

  describe(order) {
    const lines = order.items.map((i) => `${i.productId} x${i.itemQuantity} @ ${formatMoney(i.unitPrice)}`);
    return {
      orderId: order.orderId,
      customerId: order.customerId,
      orderDate: order.orderDate,
      status: order.status,
      items: lines.join(', '),
      totalAmount: formatMoney(order.calculateTotal()),
    };
  }

  // ---------- private helpers ----------
  #requireCustomer(customerId) {
    const customer = this.#users.getById(requireId(customerId, 'customerId'));
    if (customer.role !== 'CUSTOMER') {
      throw new ForbiddenError(`User "${customer.userId}" has role ${customer.role}; only CUSTOMER accounts can place orders.`);
    }
    return customer;
  }

  /** Looks up each product, checks stock and locks the current price into the line. */
  #priceLines(items) {
    requireArrayLength(items, 1, MAX_ORDER_ITEMS, 'items');
    return items.map((line) => {
      requirePlainObject(line, 'order line');
      rejectUnknownFields(line, LINE_FIELDS, 'order line');
      const product = this.#products.getById(line.productId);
      const itemQuantity = requireIntegerInRange(line.itemQuantity, 1, MAX_ITEM_QUANTITY, 'itemQuantity');
      if (product.stockQuantity < itemQuantity) {
        throw new InsufficientStockError(
          `Insufficient stock for ${product.productId}: requested ${itemQuantity}, available ${product.stockQuantity}.`);
      }
      return { productId: product.productId, itemQuantity, unitPrice: product.price };
    });
  }

  #restock(order) {
    order.items.forEach((item) => this.#products.adjustStockQuantity(item.productId, item.itemQuantity));
  }

  #openOrders() {
    return this.all().filter((order) => OPEN_ORDER_STATUSES.includes(order.status));
  }

  #assertProductNotInOpenOrder(productId) {
    const used = this.#openOrders().filter((o) => o.items.some((i) => i.productId === productId));
    if (used.length > 0) {
      throw new InvalidStateError(`Product "${productId}" is used by open order(s): ${used.map((o) => o.orderId).join(', ')}.`);
    }
  }

  #assertCustomerHasNoOpenOrders(userId) {
    const open = this.#openOrders().filter((o) => o.customerId === userId);
    if (open.length > 0) {
      throw new InvalidStateError(`User "${userId}" has open order(s): ${open.map((o) => o.orderId).join(', ')}.`);
    }
  }

  // ---------- console API ----------
  createOrder(orderData) { return this.runCreate(orderData); }

  searchOrders(criteria) { return this.runSearch(criteria); }

  editOrder(orderId, updates) { return this.runEdit(orderId, updates); }

  deleteOrder(orderId, confirmed = false) { return this.runDelete(orderId, confirmed); }

  displayOrders(orderList) { this.display(orderList); }

  /** Shows one order with its lines, subtotals and calculateTotal(). */
  showOrder(orderId) {
    const order = this.attempt('VIEW', () => this.getById(orderId));
    if (!order) return null;
    printDetails(this.describe(order));
    printTable(ITEM_COLUMNS, order.items);
    console.log(`calculateTotal() = ${formatMoney(order.calculateTotal())}`);
    return order;
  }
}

// ===== scm-system.js =====
const SAMPLE_USERS = [
  { userId: 'A001', name: 'Nurul Huda', email: 'nurul.huda@olms.my', role: 'ADMIN' },
  { userId: 'C001', name: 'Aisyah Rahman', email: 'aisyah@mail.my', role: 'CUSTOMER' },
  { userId: 'C002', name: 'Daniel Lim', email: 'daniel.lim@mail.my', role: 'CUSTOMER' },
  { userId: 'D001', name: 'Kumar Raj', email: 'kumar.raj@olms.my', role: 'DRIVER' },
];

const SAMPLE_PRODUCTS = [
  { productId: 'P001', productName: 'Fresh Milk 1L', category: 'Dairy', price: 6.5, stockQuantity: 40 },
  { productId: 'P002', productName: 'Wholemeal Bread', category: 'Bakery', price: 4.2, stockQuantity: 25 },
  { productId: 'P003', productName: 'Bananas 1kg', category: 'Produce', price: 5.9, stockQuantity: 60 },
  { productId: 'P004', productName: 'Eggs Grade A (10)', category: 'Dairy', price: 11.5, stockQuantity: 30 },
  { productId: 'P005', productName: 'Jasmine Rice 5kg', category: 'Pantry', price: 32.9, stockQuantity: 15 },
];

/** Integration facade: wires the Product, User and Order modules together. */
export class ScmSystem {
  constructor() {
    this.users = new UserService();
    this.products = new ProductService();
    this.orders = new OrderService(this.products, this.users);
  }

  /** Loads silent sample data (used by the API and defensive-programming demos). */
  loadSampleData() {
    SAMPLE_USERS.forEach((user) => this.users.add(user));
    SAMPLE_PRODUCTS.forEach((product) => this.products.add(product));
    return this;
  }

  inventoryValue() {
    return roundMoney(this.products.all().reduce((sum, p) => sum + p.price * p.stockQuantity, 0));
  }

  /** Prints all three modules and a one-line summary. */
  displayDashboard() {
    console.log('USERS');
    this.users.displayUsers();
    console.log('\nPRODUCTS');
    this.products.displayProducts();
    console.log('\nORDERS');
    this.orders.displayOrders();
    const counts = `${this.users.all().length} users, ${this.products.all().length} products, ${this.orders.all().length} orders`;
    console.log(`\nSummary: ${counts}; inventory value RM ${formatMoney(this.inventoryValue())}`);
  }
}
