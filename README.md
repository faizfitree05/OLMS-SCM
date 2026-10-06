# Online Local Mart System (OLMS)

**Project Title:** Online Local Mart System (OLMS)  
**Target Environment:** Web / Mobile / Standalone Application  

---

## Project Overview
The **Online Local Mart System (OLMS)** is designed to digitize local mart inventory management and ordering processes. This system provides core functions for managing products, tracking inventory levels, processing orders and handling user accounts efficiently.

---

## Team Members (Group 7)

| Name | Role | GitHub Profile |
| :--- | :--- | :--- |
| **Muhammad Faiz Fitree bin Zuffree** | Team Lead / Software Developer | [@faizfitree05](https://github.com/faizfitree05) |
| **Ts. Dr. Loo Yim Ling** | Lecturer | [@YimLingLoo](https://github.com/YimLingLoo) |

---

## Coding Standards & Modularity Guidelines (listed in Assignment Part 1 Report)

* **Naming & Terminology Standards:** All modules, methods, variables, and private class fields (`#field`) must follow standardized camelCase/PascalCase naming and strict primary domain terms. Prohibited aliases (e.g., using `qty` instead of `stockQuantity`) are strictly forbidden.
* **Modularity & Encapsulation:** Functions must adhere to the Single Responsibility Principle (SRP), stay under 30 lines, enforce encapsulation via ES6 getters/setters.

## Run
Requires Node.js 14+.

    node main.js      # or: npm start

## Files
| File | Purpose |
| --- | --- |
| main.js | Demo of every function, including failure cases |
| product-service.js | createProduct, searchProducts, editProduct, deleteProduct, displayProducts |
| product-model.js | Product entity (private fields, validated getters/setters) |
| user-model.js | User entity |
| order-model.js | Order and OrderItem entities |
| validators.js | Shared validation helpers |

## Conventions
PascalCase classes, camelCase methods/variables, `#private` fields, UPPER_SNAKE_CASE constants, kebab-case file names.
Functions stay under 30 lines. Search, edit and delete display the full updated record set automatically.



---


