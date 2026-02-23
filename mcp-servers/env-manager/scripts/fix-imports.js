#!/usr/bin/env node
/**
 * Fix ES module imports in generated files to include .js extensions
 * This is necessary because tsoa transpiles TypeScript but doesn't add .js extensions
 * needed for Node.js ES module resolution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const generatedDir = path.join(distDir, 'generated');

// Regex patterns to find and fix imports
const importPatterns = [
    // Pattern for imports without .js extension
    {
        regex: /from\s+['"](\.[^'"]+)(?<!\.js)['"];/g,
        replace: (match, importPath) => {
            // Only add .js if it's a relative import and doesn't already have it
            if (!importPath.endsWith('.js') && !importPath.includes('.')) {
                return `from '${importPath}.js';`;
            }
            return match;
        }
    }
];

function fixImportsInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;

        // Apply each pattern
        importPatterns.forEach(({ regex, replace }) => {
            content = content.replace(regex, replace);
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`✓ Fixed imports in ${path.relative(distDir, filePath)}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
        return false;
    }
}

// Process all .js files in generated directory
try {
    const files = fs.readdirSync(generatedDir);
    let fixed = 0;
    files.forEach(file => {
        if (file.endsWith('.js') && file !== 'routes.js') {
            if (fixImportsInFile(path.join(generatedDir, file))) {
                fixed++;
            }
        }
    });

    // Special handling for routes.js - show what would be changed
    const routesPath = path.join(generatedDir, 'routes.js');
    if (fs.existsSync(routesPath)) {
        let content = fs.readFileSync(routesPath, 'utf-8');
        const hasControllerImport = content.includes("from './../controllers/ProjectController'");
        if (hasControllerImport) {
            content = content.replace(
                "from './../controllers/ProjectController'",
                "from './../controllers/ProjectController.js'"
            );
            fs.writeFileSync(routesPath, content, 'utf-8');
            console.log(`✓ Fixed imports in routes.js`);
            fixed++;
        }
    }

    console.log(`Import fixes complete (${fixed} files modified)`);
} catch (error) {
    console.error('Failed to process generated files:', error.message);
    process.exit(1);
}
