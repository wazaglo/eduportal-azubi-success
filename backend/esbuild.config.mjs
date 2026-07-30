import * as esbuild from 'esbuild';
import { readdirSync } from 'fs';
import { join } from 'path';

const srcDir = 'src/functions';
const outDir = 'dist';

function findEntryPoints(dir) {
  const entries = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...findEntryPoints(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      entries.push(fullPath);
    }
  }
  return entries;
}

const entryPoints = findEntryPoints(srcDir);

const buildConfig = {
  entryPoints,
  outdir: outDir,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  minify: true,
  outbase: 'src/functions',
  external: ['@aws-sdk/*', 'aws-lambda'],
};

esbuild.build(buildConfig).catch(() => process.exit(1));
