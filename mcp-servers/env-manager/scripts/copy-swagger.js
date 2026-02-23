#!/usr/bin/env node
/**
 * Ensure swagger.json is available in dist for runtime serving.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const sourcePath = path.join(rootDir, 'src', 'generated', 'swagger.json');
const distDir = path.join(rootDir, 'dist', 'generated');
const distPath = path.join(distDir, 'swagger.json');

if (!fs.existsSync(sourcePath)) {
    console.error('swagger.json not found at src/generated. Run "npm run build" first.');
    process.exit(1);
}

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(sourcePath, distPath);
console.log('Copied swagger.json to dist/generated');
