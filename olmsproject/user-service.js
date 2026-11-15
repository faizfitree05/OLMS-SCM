import { BaseService } from './base-service.js';
import { DuplicateError } from './errors.js';
import { rejectUnknownFields, requirePlainObject } from './input-guard.js';
import { User } from './user-model.js';
import { requireValidEmail } from './validators.js';

const USER_FIELDS = ['userId', 'name', 'email', 'role'];
const EDITABLE_FIELDS = ['name', 'email', 'role'];

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
    return this.applyUpdates(user, updates, EDITABLE_FIELDS, User);
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
