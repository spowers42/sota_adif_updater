import { runFlow } from './prompts/flow.js';

runFlow().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
