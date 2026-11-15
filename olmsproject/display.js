import { AppError } from './errors.js';
import { EMPTY_MESSAGE, MAX_CELL_WIDTH } from './constants.js';

function truncate(text, maxWidth) {
  return text.length > maxWidth ? `${text.slice(0, maxWidth - 3)}...` : text;
}

function formatLine(values, widths, columns) {
  const padded = values.map((value, i) =>
    columns[i].align === 'right' ? value.padStart(widths[i]) : value.padEnd(widths[i]));
  return `| ${padded.join(' | ')} |`;
}

/** Prints rows as an aligned table, or the empty-state message when there are no rows. */
export function printTable(columns, rows) {
  if (rows.length === 0) {
    console.log(EMPTY_MESSAGE);
    return;
  }
  const cells = rows.map((row) => columns.map((col) => truncate(String(col.value(row)), MAX_CELL_WIDTH)));
  const widths = columns.map((col, i) => Math.max(col.header.length, ...cells.map((r) => r[i].length)));
  console.log(formatLine(columns.map((col) => col.header), widths, columns));
  console.log(`|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`);
  cells.forEach((row) => console.log(formatLine(row, widths, columns)));
}

/** Prints every attribute of one record as "name : value" lines. */
export function printDetails(fields) {
  const keyWidth = Math.max(...Object.keys(fields).map((key) => key.length));
  Object.entries(fields).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(keyWidth)} : ${value}`);
  });
}

/** Reports a failed action; unexpected (non-AppError) errors are labelled as such. */
export function reportFailure(tag, error) {
  const prefix = error instanceof AppError ? '' : 'Unexpected error: ';
  console.log(`[${tag} FAILED] ${prefix}${error.message}`);
}
