// Shared validation helpers (single responsibility: input validation only)

export function requireNonEmptyString(value, fieldName, maxLength = Infinity) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Validation Error: ${fieldName} must be a non-empty string.`);
  }
  if (value.trim().length > maxLength) {
    throw new Error(`Validation Error: ${fieldName} must not exceed ${maxLength} characters.`);
  }
  return value.trim();
}

export function requireNonNegativeNumber(value, fieldName) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new Error(`Validation Error: ${fieldName} must be a non-negative number.`);
  }
  return value;
}

export function requireInteger(value, fieldName, minimum) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`Validation Error: ${fieldName} must be an integer >= ${minimum}.`);
  }
  return value;
}

export function requireEnum(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new Error(`Validation Error: ${fieldName} must be one of ${allowedValues.join(", ")}.`);
  }
  return value;
}
