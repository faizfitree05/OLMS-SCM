import { ScmSystem } from '../scm-system.js';
import { runCases, runProbes, step } from './helpers.js';

export function createLab7Context() {
  return { system: new ScmSystem().loadSampleData() };
}

const product = (overrides = {}) => ({
  productId: 'P100', productName: 'Test Item', category: 'Pantry', price: 1, stockQuantity: 1, ...overrides,
});
const POLLUTED = '{"productId":"P100","productName":"X","category":"Y","price":1,"stockQuantity":1,"__proto__":{"isAdmin":true}}';

function typeCases(p) {
  return [
    ['add(null)', () => p.add(null)],
    ['add([])', () => p.add([])],
    ['add("P100")  - a string instead of an object', () => p.add('P100')],
    ['add({})  - empty object', () => p.add({})],
    ['add({ ...valid, discount: 50 })  - unknown field', () => p.add(product({ discount: 50 }))],
    ['add(JSON.parse(... "__proto__" ...))  - prototype pollution', () => p.add(JSON.parse(POLLUTED))],
    ['price = NaN', () => p.add(product({ price: NaN }))],
    ['price = Infinity', () => p.add(product({ price: Infinity }))],
    ['price = "5.00"  - number sent as text', () => p.add(product({ price: '5.00' }))],
  ];
}

function rangeCases(p) {
  return [
    ['price = 1.999  - 3 decimal places', () => p.add(product({ price: 1.999 }))],
    ['price = -1', () => p.add(product({ price: -1 }))],
    ['price = 100000.01  - above MAX_PRICE', () => p.add(product({ price: 100000.01 }))],
    ['stockQuantity = 2.5', () => p.add(product({ stockQuantity: 2.5 }))],
    ['stockQuantity = 100001  - above MAX_STOCK_LIMIT', () => p.add(product({ stockQuantity: 100001 }))],
    ['productName = 151 characters', () => p.add(product({ productName: 'x'.repeat(151) }))],
    ['productName = "     "  - whitespace only', () => p.add(product({ productName: '     ' }))],
    ['productId = "P 1;DROP"  - illegal characters', () => p.add(product({ productId: 'P 1;DROP' }))],
    ['productName = "<b>Hot</b>\\n  Sauce"  - markup is stripped', () => p.add(product({ productName: '<b>Hot</b>\n  Sauce' }))],
  ];
}

const figure1 = {
  title: 'Figure 1: Defensive Create - hostile and malformed product input',
  run({ system }) {
    step('createProduct(null)  - console flow keeps running instead of crashing');
    system.products.createProduct(null);
    console.log('');
    runProbes(typeCases(system.products));
    runProbes(rangeCases(system.products));
  },
};

function editCases(p) {
  return [
    ['update("P001", { price: 7, stockQuantity: -5 })  - one bad field', () => p.update('P001', { price: 7, stockQuantity: -5 })],
    ['update("P001", {})  - nothing to change', () => p.update('P001', {})],
    ['update("P001", { productId: "P999" })  - id is read-only', () => p.update('P001', { productId: 'P999' })],
    ['update("P001", "price=1")  - not an object', () => p.update('P001', 'price=1')],
    ['update("P001", null)', () => p.update('P001', null)],
    ['update("P001", { stockQuantity: "10" })  - text', () => p.update('P001', { stockQuantity: '10' })],
    ['update("P404", { price: 1 })  - unknown product', () => p.update('P404', { price: 1 })],
    ['update("P001", { price: 7.25 })  - valid', () => p.update('P001', { price: 7.25 })],
  ];
}

const figure2 = {
  title: 'Figure 2: Defensive Edit - all-or-nothing updates and read-only fields',
  run({ system }) {
    runProbes(editCases(system.products).slice(0, 1));
    step('displayProducts([P001])  - the rejected edit changed nothing (price still 6.50, stock 40)');
    system.products.displayProducts([system.products.getById('P001')]);
    console.log('');
    runProbes(editCases(system.products).slice(1));
  },
};

function searchCases(p) {
  return [
    ['search("")', () => p.search('')],
    ['search("     ")', () => p.search('     ')],
    ['search("a" x 101)  - longer than MAX_SEARCH_LENGTH', () => p.search('a'.repeat(101))],
    ['search(42)  - number', () => p.search(42)],
    ['search(null)', () => p.search(null)],
    ['search(undefined)', () => p.search(undefined)],
    ['search(".*")  - regex characters are plain text', () => p.search('.*')],
    ['search("(")  - would crash a naive RegExp', () => p.search('(')],
    ['search("<script>alert(1)</script>")  - markup stripped first', () => p.search('<script>alert(1)</script>')],
    ['search("  MILK ")  - case and spaces ignored', () => p.search('  MILK ')],
  ];
}

const figure3 = {
  title: 'Figure 3: Defensive Search - empty, oversized, wrong-type and special-character keywords',
  run({ system }) {
    runProbes(searchCases(system.products));
  },
};

const line = (productId, itemQuantity) => ({ productId, itemQuantity });
const order = (overrides = {}) => ({
  orderId: 'O2001', customerId: 'C001', items: [line('P001', 2)], ...overrides,
});

function orderShapeCases(o) {
  return [
    ['add({ ...order, items: undefined })', () => o.add(order({ items: undefined }))],
    ['add({ ...order, items: [] })  - empty basket', () => o.add(order({ items: [] }))],
    ['add({ ...order, items: "P001" })', () => o.add(order({ items: 'P001' }))],
    ['add(order with 21 lines)  - above MAX_ORDER_ITEMS', () => o.add(order({ items: Array.from({ length: 21 }, (_, i) => line(`P${i}`, 1)) }))],
    ['add(order with P001 twice)  - duplicate lines', () => o.add(order({ items: [line('P001', 1), line('P001', 1)] }))],
    ['add(line with unitPrice: 0.01)  - price tampering', () => o.add(order({ items: [{ ...line('P001', 1), unitPrice: 0.01 }] }))],
    ['add({ ...order, status: "DELIVERED" })  - status tampering', () => o.add(order({ status: 'DELIVERED' }))],
    ['add({ ...order, customerId: undefined })', () => o.add(order({ customerId: undefined }))],
  ];
}

function orderQuantityCases(o) {
  return [
    ['itemQuantity = 0', () => o.add(order({ items: [line('P001', 0)] }))],
    ['itemQuantity = -1', () => o.add(order({ items: [line('P001', -1)] }))],
    ['itemQuantity = 2.5', () => o.add(order({ items: [line('P001', 2.5)] }))],
    ['itemQuantity = "3"  - text', () => o.add(order({ items: [line('P001', '3')] }))],
    ['itemQuantity = 1001  - above MAX_ITEM_QUANTITY', () => o.add(order({ items: [line('P001', 1001)] }))],
    ['itemQuantity = 41  - more than the 40 in stock', () => o.add(order({ items: [line('P001', 41)] }))],
    ['add(valid order O2001: P001 x2)', () => o.add(order())],
  ];
}

const figure4 = {
  title: 'Figure 4: Defensive Order creation - malformed baskets, tampering and stock limits',
  run({ system }) {
    runProbes(orderShapeCases(system.orders));
    runProbes(orderQuantityCases(system.orders));
  },
};

function ruleCases({ orders, products, users }) {
  return [
    ['update("O2001", { status: "DELIVERED" })  - skips steps', () => orders.update('O2001', { status: 'DELIVERED' })],
    ['update("O2001", { status: "LOST" })  - not a status', () => orders.update('O2001', { status: 'LOST' })],
    ['update("O2001", { status: 42 })', () => orders.update('O2001', { status: 42 })],
    ['update("O2001", { status: "PENDING" })  - same state', () => orders.update('O2001', { status: 'PENDING' })],
    ['remove("O2001")  - order is still open', () => orders.remove('O2001')],
    ['products.remove("P001")  - used by open order', () => products.remove('P001')],
    ['users.remove("C001")  - has an open order', () => users.remove('C001')],
    ['update("O2001", { status: "cancelled" })  - stock restored', () => orders.update('O2001', { status: 'cancelled' })],
    ['update("O2001", { status: "PROCESSING" })  - cancelled is final', () => orders.update('O2001', { status: 'PROCESSING' })],
  ];
}

const figure5 = {
  title: 'Figure 5: Defensive business rules - status life cycle and referential integrity',
  run({ system }) {
    runProbes(ruleCases(system));
    step('displayProducts([P001])  - cancelling restored the 2 reserved units');
    system.products.displayProducts([system.products.getById('P001')]);
    step('deleteProduct("P002", "yes")  - only the boolean true counts as confirmation');
    system.products.deleteProduct('P002', 'yes');
  },
};

const LONG_NAME = 'Organic Free-Range Cold-Pressed Extra Virgin Olive Oil, Family Value Pack';

const figure6 = {
  title: 'Figure 6: Defensive output - bad lists, empty state and very long values',
  run({ system }) {
    runCases([
      ['displayProducts(null)', () => system.products.displayProducts(null)],
      ['displayProducts("abc")', () => system.products.displayProducts('abc')],
      ['displayProducts([])  - empty state', () => system.products.displayProducts([])],
      ['createProduct with a 73-character name', () => system.products.createProduct(product({ productId: 'P200', productName: LONG_NAME }))],
      ['displayProducts([P200])  - table cell is shortened', () => system.products.displayProducts([system.products.getById('P200')])],
      ['deleteProduct("P200")  - details view still shows the full name', () => system.products.deleteProduct('P200')],
    ]);
  },
};

export const lab7Scenarios = [figure1, figure2, figure3, figure4, figure5, figure6];
