const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-image-marker',
  'android',
  'build.gradle',
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

const original = fs.readFileSync(target, 'utf8');

// Gradle 9+ removed the RepositoryHandler.jcenter() convenience method.
// react-native-image-marker still calls it; remove the line to keep builds working.
const patched = original.replace(/^\s*jcenter\(\)\s*\r?\n/m, '');

if (patched !== original) {
  fs.writeFileSync(target, patched, 'utf8');
}
