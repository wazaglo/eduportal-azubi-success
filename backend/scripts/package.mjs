import { readdirSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname, relative } from 'path';
import { execSync } from 'child_process';

const distDir = 'dist';
const deployDir = 'deployments';

function findJsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function createZip(sourceJs, zipPath) {
  const zipDir = dirname(zipPath);
  if (!existsSync(zipDir)) mkdirSync(zipDir, { recursive: true });

  // Use Python's zipfile module to create a proper ZIP
  execSync(
    `python3 -c "
import zipfile, os
zf = zipfile.ZipFile('${zipPath}', 'w', zipfile.ZIP_DEFLATED)
zf.write('${sourceJs}', os.path.basename('${sourceJs}'))
zf.close()
"`,
    { stdio: 'pipe' }
  );
}

console.log('Packaging Lambda handlers...');

if (!existsSync(distDir)) {
  console.error('dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

if (existsSync(deployDir)) {
  rmSync(deployDir, { recursive: true });
}

const jsFiles = findJsFiles(distDir);

let packaged = 0;
for (const jsFile of jsFiles) {
  const relativePath = relative(distDir, jsFile);
  const zipName = relativePath.replace(/\.js$/, '.zip');
  const zipPath = join(deployDir, zipName);

  createZip(jsFile, zipPath);
  packaged++;
  console.log(`  ✓ ${zipPath}`);
}

console.log(`\nPackaged ${packaged} handler(s) into ${deployDir}/`);
