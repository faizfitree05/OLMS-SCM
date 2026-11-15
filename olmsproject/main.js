import { createLab5Context, lab5Scenarios } from './demo/lab5-scenarios.js';
import { createLab7Context, lab7Scenarios } from './demo/lab7-scenarios.js';
import { createLab8Context, lab8Scenarios } from './demo/lab8-scenarios.js';

const DEMOS = {
  lab5: { create: createLab5Context, scenarios: lab5Scenarios },
  lab7: { create: createLab7Context, scenarios: lab7Scenarios },
  lab8: { create: createLab8Context, scenarios: lab8Scenarios },
};

async function runDemo(name) {
  const demo = DEMOS[name];
  if (!demo) {
    console.log(`Unknown demo "${name}". Use one of: ${Object.keys(DEMOS).join(', ')}`);
    return;
  }
  const context = await demo.create();
  for (const scenario of demo.scenarios) {
    console.log(`\n===== ${scenario.title} =====`);
    await scenario.run(context);
  }
  if (context.close) await context.close();
}

await runDemo(process.argv[2] ?? 'lab5');
