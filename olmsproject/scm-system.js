import { OrderService } from './order-service.js';
import { ProductService } from './product-service.js';
import { UserService } from './user-service.js';
import { formatMoney, roundMoney } from './money.js';

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
