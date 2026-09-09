import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const generatedDirectories = ['dist'];
const generatedFiles = ['server.cjs'];

for (const directory of generatedDirectories) {
  await rm(resolve(projectRoot, directory), { recursive: true, force: true });
}

for (const file of generatedFiles) {
  await rm(resolve(projectRoot, file), { force: true });
}

for (const entry of await readdir(projectRoot, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.log')) {
    try {
      await rm(resolve(projectRoot, entry.name), { force: true });
    } catch (error) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
      console.warn(`Skipped locked runtime log: ${entry.name}`);
    }
  }
}

console.log('Removed generated builds and root-level runtime logs.');
