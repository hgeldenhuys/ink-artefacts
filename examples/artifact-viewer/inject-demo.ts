/**
 * Companion script: simulates Claude injecting artifacts at runtime.
 * Run this in a separate terminal while the artifact viewer is open.
 * Each step drops a new JSON file into the artifacts directory.
 */
import { writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { homedir } from 'os';
import type { ArtifactDescriptor } from './types.js';

const artifactsDir = process.argv[2] || join(homedir(), '.claude', 'artifacts');
mkdirSync(artifactsDir, { recursive: true });

// Clean previous demo artifacts
try {
  const existing = readdirSync(artifactsDir);
  for (const f of existing) {
    if (f.startsWith('demo-')) {
      const { unlinkSync } = await import('fs');
      unlinkSync(join(artifactsDir, f));
    }
  }
} catch {}

function writeArtifact(descriptor: ArtifactDescriptor, filename: string) {
  const path = join(artifactsDir, filename);
  writeFileSync(path, JSON.stringify(descriptor, null, 2));
  console.log(`  Injected: ${descriptor.title} -> ${path}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Scan the project for JSON files ─────────────────────

function scanJsonFiles(dir: string): Array<{ name: string; path: string; size: number }> {
  const results: Array<{ name: string; path: string; size: number }> = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...scanJsonFiles(fullPath));
      } else if (extname(entry.name) === '.json') {
        try {
          const stat = statSync(fullPath);
          results.push({ name: fullPath.replace(dir + '/', ''), path: fullPath, size: stat.size });
        } catch {}
      }
    }
  } catch {}
  return results;
}

// ─── Scan directory for disk usage ───────────────────────

interface DirEntry {
  name: string;
  size: number;
  children?: DirEntry[];
}

function scanDiskUsage(dir: string, depth = 0, maxDepth = 2): DirEntry[] {
  const result: DirEntry[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const children = depth < maxDepth ? scanDiskUsage(fullPath, depth + 1, maxDepth) : [];
        const dirSize = children.reduce((sum, c) => sum + c.size, 0);
        result.push({ name: entry.name, size: dirSize, children: children.length > 0 ? children : undefined });
      } else {
        try {
          const stat = statSync(fullPath);
          result.push({ name: entry.name, size: stat.size });
        } catch {}
      }
    }
  } catch {}
  return result;
}

// ─── Run the injection sequence ──────────────────────────

const projectDir = join(process.cwd());

console.log('');
console.log('Artifact Injection Demo');
console.log('═══════════════════════');
console.log(`Artifacts dir: ${artifactsDir}`);
console.log(`Project dir:   ${projectDir}`);
console.log('');
console.log('Injecting artifacts one by one (2s intervals)...');
console.log('Switch to the artifact viewer to watch them appear!');
console.log('');

// Artifact 1: Package.json contents
await sleep(1000);
console.log('Step 1/4: Scanning package.json...');
try {
  const pkg = JSON.parse(String(await import('fs').then(fs => fs.readFileSync(join(projectDir, 'package.json'), 'utf-8'))));
  writeArtifact({
    id: 'pkg-json',
    title: 'package.json',
    type: 'json-tree',
    data: pkg,
    createdAt: new Date().toISOString(),
  }, 'demo-01-package.json');
} catch (e) {
  console.log('  Skipped (no package.json found)');
}

// Artifact 2: Disk usage
await sleep(2000);
console.log('Step 2/4: Scanning disk usage...');
const diskEntries = scanDiskUsage(projectDir);
writeArtifact({
  id: 'disk-usage',
  title: 'Disk Usage',
  type: 'disk-usage',
  data: { title: `Disk: ${basename(projectDir)}`, entries: diskEntries },
  createdAt: new Date().toISOString(),
}, 'demo-02-disk-usage.json');

// Artifact 3: JSON files found
await sleep(2000);
console.log('Step 3/4: Finding JSON files...');
const jsonFiles = scanJsonFiles(projectDir);
writeArtifact({
  id: 'json-files',
  title: 'JSON Files',
  type: 'table',
  data: {
    title: `JSON files in ${basename(projectDir)}`,
    columns: [
      { header: 'File', accessor: 'name' },
      { header: 'Size', accessor: 'sizeFormatted', align: 'right', width: 12 },
    ],
    rows: jsonFiles.map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      sizeFormatted: f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`,
    })),
  },
  createdAt: new Date().toISOString(),
}, 'demo-03-json-files.json');

// Artifact 4: tsconfig contents
await sleep(2000);
console.log('Step 4/4: Reading tsconfig.json...');
try {
  const tsconfig = JSON.parse(String(await import('fs').then(fs => fs.readFileSync(join(projectDir, 'tsconfig.json'), 'utf-8'))));
  writeArtifact({
    id: 'tsconfig',
    title: 'tsconfig.json',
    type: 'json-tree',
    data: tsconfig,
    createdAt: new Date().toISOString(),
  }, 'demo-04-tsconfig.json');
} catch {
  console.log('  Skipped (no tsconfig.json)');
}

console.log('');
console.log('All artifacts injected! Switch to the viewer to browse them.');
console.log('Use [ and ] to cycle between tabs.');
console.log('');
