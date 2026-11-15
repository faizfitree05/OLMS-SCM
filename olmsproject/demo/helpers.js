/** Prints the call being demonstrated, so every output block is self-explaining. */
export function step(text) {
  console.log(`\n> ${text}`);
}

/** Runs [label, action] pairs in order, printing each label first. */
export function runCases(cases) {
  cases.forEach(([label, action]) => {
    step(label);
    action();
  });
}

function summarize(result) {
  if (Array.isArray(result)) return `${result.length} record(s)`;
  const text = JSON.stringify(result);
  return text && text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

/**
 * Calls an action that may throw and prints a one-line verdict:
 * ACCEPTED with a short result, or REJECTED with the error code and message.
 */
export function probe(label, action) {
  console.log(`> ${label}`);
  try {
    console.log(`    ACCEPTED -> ${summarize(action())}`);
  } catch (error) {
    console.log(`    REJECTED [${error.code ?? error.name}] ${error.message}`);
  }
}

export function runProbes(cases) {
  cases.forEach(([label, action]) => probe(label, action));
}
