// Typed errors. Every error carries a machine-readable code and an HTTP-style status
// so the console layer and the API middleware can report failures consistently.
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message) { super(message, 'VALIDATION_ERROR', 400); }
}
export class UnauthorizedError extends AppError {
  constructor(message) { super(message, 'UNAUTHORIZED', 401); }
}
export class ForbiddenError extends AppError {
  constructor(message) { super(message, 'FORBIDDEN', 403); }
}
export class NotFoundError extends AppError {
  constructor(message) { super(message, 'NOT_FOUND', 404); }
}
export class MethodNotAllowedError extends AppError {
  constructor(message) { super(message, 'METHOD_NOT_ALLOWED', 405); }
}
export class DuplicateError extends AppError {
  constructor(message) { super(message, 'DUPLICATE', 409); }
}
export class InvalidStateError extends AppError {
  constructor(message) { super(message, 'INVALID_STATE', 409); }
}
export class InsufficientStockError extends AppError {
  constructor(message) { super(message, 'INSUFFICIENT_STOCK', 422); }
}
export class PayloadTooLargeError extends AppError {
  constructor(message) { super(message, 'PAYLOAD_TOO_LARGE', 413); }
}
export class UnsupportedMediaTypeError extends AppError {
  constructor(message) { super(message, 'UNSUPPORTED_MEDIA_TYPE', 415); }
}
export class TooManyRequestsError extends AppError {
  constructor(message) { super(message, 'TOO_MANY_REQUESTS', 429); }
}
