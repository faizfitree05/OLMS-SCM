import { ScmSystem } from '../scm-system.js';
import { runCases, step } from './helpers.js';

export function createLab5Context() {
  return { system: new ScmSystem() };
}

const user = (userId, name, email, role) => ({ userId, name, email, role });

function userCreateOk({ users }) {
  return [
    ['createUser(C001)', () => users.createUser(user('C001', 'Aisyah Rahman', 'aisyah@mail.my', 'CUSTOMER'))],
    ['createUser(C002)', () => users.createUser(user('C002', 'Daniel Lim', 'daniel.lim@mail.my', 'CUSTOMER'))],
    ['createUser(A001)', () => users.createUser(user('A001', 'Nurul Huda', 'nurul.huda@olms.my', 'ADMIN'))],
    ['createUser(D001)', () => users.createUser(user('D001', 'Kumar Raj', 'kumar.raj@olms.my', 'DRIVER'))],
    ['createUser(C003)', () => users.createUser(user('C003', 'Temp Customer', 'temp@mail.my', 'CUSTOMER'))],
  ];
}

function userCreateFail({ users }) {
  return [
    ['createUser with duplicate userId C001', () => users.createUser(user('C001', 'Other', 'other@mail.my', 'CUSTOMER'))],
    ['createUser with duplicate email', () => users.createUser(user('C009', 'Other', 'AISYAH@mail.my', 'CUSTOMER'))],
    ['createUser with invalid email', () => users.createUser(user('C010', 'Bad Email', 'not-an-email', 'CUSTOMER'))],
    ['createUser with invalid role MANAGER', () => users.createUser(user('C011', 'Boss', 'boss@mail.my', 'MANAGER'))],
  ];
}

const figure1 = {
  title: 'Figure 1: User module - Create (successful and rejected inputs) and Data Display',
  run({ system }) {
    runCases(userCreateOk(system));
    runCases(userCreateFail(system));
    step('displayUsers()');
    system.users.displayUsers();
  },
};

const figure2 = {
  title: 'Figure 2: User module - Search (match, no match, empty keyword)',
  run({ system }) {
    runCases([
      ['searchUsers("daniel")  - partial name match', () => system.users.searchUsers('daniel')],
      ['searchUsers("zzz")  - no match', () => system.users.searchUsers('zzz')],
      ['searchUsers("")  - empty keyword', () => system.users.searchUsers('')],
    ]);
  },
};

const figure3 = {
  title: 'Figure 3: User module - Edit (successful and unsuccessful)',
  run({ system }) {
    runCases([
      ['editUser("C002", { name, email })', () => system.users.editUser('C002', { name: 'Daniel Lim Wei', email: 'daniel.wei@mail.my' })],
      ['editUser("C001", { role: "OWNER" })  - invalid role', () => system.users.editUser('C001', { role: 'OWNER' })],
      ['editUser("U999", { name })  - unknown user', () => system.users.editUser('U999', { name: 'Ghost' })],
    ]);
  },
};

const figure4 = {
  title: 'Figure 4: User module - Delete (confirmation, deletion, repeated deletion)',
  run({ system }) {
    runCases([
      ['deleteUser("C003")  - no confirmation yet', () => system.users.deleteUser('C003')],
      ['deleteUser("C003", true)', () => system.users.deleteUser('C003', true)],
      ['deleteUser("C003", true)  - already deleted', () => system.users.deleteUser('C003', true)],
    ]);
  },
};

function productSeed({ products }) {
  const p = (productId, productName, category, price, stockQuantity) =>
    ({ productId, productName, category, price, stockQuantity });
  return [
    ['createProduct(P001)', () => products.createProduct(p('P001', 'Fresh Milk 1L', 'Dairy', 6.5, 40))],
    ['createProduct(P002)', () => products.createProduct(p('P002', 'Wholemeal Bread', 'Bakery', 4.2, 25))],
    ['createProduct(P003)', () => products.createProduct(p('P003', 'Bananas 1kg', 'Produce', 5.9, 60))],
    ['createProduct(P004)', () => products.createProduct(p('P004', 'Eggs Grade A (10)', 'Dairy', 11.5, 30))],
    ['createProduct(P005)', () => products.createProduct(p('P005', 'Jasmine Rice 5kg', 'Pantry', 32.9, 15))],
    ['createProduct(P001)  - duplicate', () => products.createProduct(p('P001', 'Copy', 'Dairy', 1, 1))],
  ];
}

const figure5 = {
  title: 'Figure 5: Product module (from Part 2) running inside the integrated system',
  run({ system }) {
    runCases(productSeed(system));
    step('searchProducts("dairy")');
    system.products.searchProducts('dairy');
    step('editProduct("P002", { price: 4.5 })');
    system.products.editProduct('P002', { price: 4.5 });
  },
};

const line = (productId, itemQuantity) => ({ productId, itemQuantity });

function orderCases({ orders }) {
  return [
    ['createOrder(O1001) for C001', () => orders.createOrder({ orderId: 'O1001', customerId: 'C001', items: [line('P001', 2), line('P003', 1)] })],
    ['createOrder(O1002) for C002', () => orders.createOrder({ orderId: 'O1002', customerId: 'C002', items: [line('P002', 1), line('P004', 3)] })],
    ['createOrder for unknown customer', () => orders.createOrder({ orderId: 'O1003', customerId: 'C404', items: [line('P001', 1)] })],
    ['createOrder for an ADMIN account', () => orders.createOrder({ orderId: 'O1003', customerId: 'A001', items: [line('P001', 1)] })],
    ['createOrder with unknown product', () => orders.createOrder({ orderId: 'O1003', customerId: 'C001', items: [line('P404', 1)] })],
    ['createOrder with insufficient stock (P005 x100)', () => orders.createOrder({ orderId: 'O1003', customerId: 'C001', items: [line('P005', 100)] })],
    ['createOrder with duplicate orderId', () => orders.createOrder({ orderId: 'O1001', customerId: 'C001', items: [line('P001', 1)] })],
  ];
}

const figure6 = {
  title: 'Figure 6: Order module - Create (stock is reduced, bad orders are rejected)',
  run({ system }) {
    runCases(orderCases(system));
    step('displayOrders()');
    system.orders.displayOrders();
    step('displayProducts()  - stock of P001-P004 has dropped');
    system.products.displayProducts();
  },
};

const figure7 = {
  title: 'Figure 7: Order module - order details, subtotals and calculateTotal()',
  run({ system }) {
    runCases([
      ['showOrder("O1001")', () => system.orders.showOrder('O1001')],
      ['showOrder("O9999")  - unknown order', () => system.orders.showOrder('O9999')],
    ]);
  },
};

const figure8 = {
  title: 'Figure 8: Order module - Search by status, customer and orderId',
  run({ system }) {
    runCases([
      ['searchOrders("pending")  - by status', () => system.orders.searchOrders('pending')],
      ['searchOrders("C002")  - by customerId', () => system.orders.searchOrders('C002')],
      ['searchOrders("delivered")  - no match', () => system.orders.searchOrders('delivered')],
    ]);
  },
};

const figure9 = {
  title: 'Figure 9: Order module - Edit (status life cycle, cancellation restores stock)',
  run({ system }) {
    runCases([
      ['editOrder("O1001", { status: "PROCESSING" })', () => system.orders.editOrder('O1001', { status: 'PROCESSING' })],
      ['editOrder("O1001", { status: "DELIVERED" })  - skips a step', () => system.orders.editOrder('O1001', { status: 'DELIVERED' })],
      ['editOrder("O1002", { status: "CANCELLED" })', () => system.orders.editOrder('O1002', { status: 'CANCELLED' })],
    ]);
    step('displayProducts()  - P002 and P004 stock is back to the original level');
    system.products.displayProducts();
  },
};

const figure10 = {
  title: 'Figure 10: Order module - Delete (only cancelled orders can be removed)',
  run({ system }) {
    runCases([
      ['deleteOrder("O1002")  - no confirmation yet', () => system.orders.deleteOrder('O1002')],
      ['deleteOrder("O1001", true)  - still PROCESSING', () => system.orders.deleteOrder('O1001', true)],
      ['deleteOrder("O1002", true)', () => system.orders.deleteOrder('O1002', true)],
    ]);
  },
};

const figure11 = {
  title: 'Figure 11: System integration - cross-module rules and final dashboard',
  run({ system }) {
    runCases([
      ['deleteProduct("P001", true)  - used by open order O1001', () => system.products.deleteProduct('P001', true)],
      ['deleteUser("C001", true)  - has open order O1001', () => system.users.deleteUser('C001', true)],
      ['editOrder("O1001", SHIPPED)', () => system.orders.editOrder('O1001', { status: 'SHIPPED' })],
      ['editOrder("O1001", DELIVERED)', () => system.orders.editOrder('O1001', { status: 'DELIVERED' })],
      ['deleteProduct("P003", true)  - allowed now (no open order)', () => system.products.deleteProduct('P003', true)],
    ]);
    step('displayDashboard()');
    system.displayDashboard();
  },
};

export const lab5Scenarios = [
  figure1, figure2, figure3, figure4, figure5, figure6, figure7, figure8, figure9, figure10, figure11,
];
