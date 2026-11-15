/** Rounds a monetary value to 2 decimal places (avoids 0.1 + 0.2 style float drift). */
export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formats a monetary value for display, e.g. 6.5 -> "6.50". */
export function formatMoney(value) {
  return roundMoney(value).toFixed(2);
}
