import { requireNonEmptyString, requireEnum } from "./validators.js";

const MAX_USER_NAME_LENGTH = 100;
const USER_ROLES = ["CUSTOMER", "ADMIN", "DRIVER"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** User entity (CUSTOMER, ADMIN or DRIVER) with validated accessors. */
export class User {
  #userId;
  #name;
  #email;
  #role;

  constructor(userData) {
    this.#userId = requireNonEmptyString(userData.userId, "userId");
    this.name = userData.name;
    this.email = userData.email;
    this.role = userData.role;
  }

  get userId() { return this.#userId; }

  get name() { return this.#name; }
  set name(newName) {
    this.#name = requireNonEmptyString(newName, "name", MAX_USER_NAME_LENGTH);
  }

  get email() { return this.#email; }
  set email(newEmail) {
    const email = requireNonEmptyString(newEmail, "email");
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error("Validation Error: email must be a valid email address.");
    }
    this.#email = email;
  }

  get role() { return this.#role; }
  set role(newRole) {
    this.#role = requireEnum(newRole, "role", USER_ROLES);
  }
}
