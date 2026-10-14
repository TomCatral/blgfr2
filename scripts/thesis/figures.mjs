/**
 * Generates every thesis figure. Run: node scripts/thesis/figures.mjs [outputDir]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.resolve('output/diagrams');

let failed = 0;
for (const script of ['figures-a.mjs', 'figures-b.mjs', 'figures-c.mjs']) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync(process.execPath, [path.join(here, script), out], { stdio: 'inherit' });
  if (result.status !== 0) failed += 1;
}

process.exit(failed === 0 ? 0 : 1);
