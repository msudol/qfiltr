#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var sourcePath = path.join(root, 'index.js');
var distDir = path.join(root, 'dist');
var distPath = path.join(distDir, 'qfiltr.js');

var source = fs.readFileSync(sourcePath, 'utf8');
var exportPattern = /\nmodule\.exports\s*=\s*qfiltr;\s*$/;

if (!exportPattern.test(source)) {
    throw new Error('build-standalone: expected `module.exports = qfiltr;` at end of index.js');
}

var browserExport = [
    '',
    '// Browser global export for standalone usage',
    'if (typeof window !== "undefined") {',
    '    window.qfiltr = qfiltr;',
    '}',
    'else if (typeof self !== "undefined") {',
    '    self.qfiltr = qfiltr;',
    '}',
    ''
].join('\n');

var output = source.replace(exportPattern, '\n' + browserExport);

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, {recursive: true});
}

fs.writeFileSync(distPath, output, 'utf8');

console.log('Standalone build complete:');
console.log(' - ' + path.relative(root, distPath));
