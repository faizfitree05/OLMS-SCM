import { MAX_USER_NAME_LENGTH, USER_ROLES } from './constants.js';
import { requirePlainObject } from './input-guard.js';
import {
  requireEnum, requireId, requireMaxLength, requireNonEmptyString, requireValidEmail,
} from './validators.js';

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
