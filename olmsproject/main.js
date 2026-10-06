import { ProductService } from "./product-service.js";
import { OrderItem, Order } from "./order-model.js";
import { User } from "./user-model.js";

const service = new ProductService();

// Search, Edit and Delete display the full updated record set automatically.

service.createProduct({ productId: "P001", productName: "Fresh Milk 1L", category: "Dairy", price: 7.9, stockQuantity: 40 });
service.createProduct({ productId: "P002", productName: "Wholemeal Bread", category: "Bakery", price: 4.5, stockQuantity: 25 });
service.createProduct({ productId: "P003", productName: "Red Apples 1kg", category: "Produce", price: 9.9, stockQuantity: 60 });
service.createProduct({ productId: "P001", productName: "Duplicate", category: "Dairy", price: 1, stockQuantity: 1 }); // fails
service.createProduct({ productId: "P004", productName: "Bad Price", category: "Dairy", price: -2, stockQuantity: 1 }); // fails
service.displayProducts();

service.searchProducts("dairy");
service.searchProducts("xyz"); // not found

service.editProduct("P002", { price: 5.2, stockQuantity: 18 });
service.editProduct("P003", { stockQuantity: -5 }); // fails

service.deleteProduct("P003");        // asks for confirmation
service.deleteProduct("P003", true);  // deletes

// --- Order / User demo ---
const customer = new User({ userId: "U001", name: "Aina", email: "aina@example.com", role: "CUSTOMER" });
const order = new Order("O001", [new OrderItem("P001", 2, 7.9), new OrderItem("P002", 1, 5.2)]);
order.updateStatus("PROCESSING");
console.log(`\nOrder ${order.orderId} for ${customer.name}: ${order.status}, total RM${order.totalAmount.toFixed(2)}`);
