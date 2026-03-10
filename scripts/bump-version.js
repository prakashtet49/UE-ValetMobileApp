/**
 * Bump version in app.json, package.json, and android/app/build.gradle.
 * Usage: node scripts/bump-version.js [major|minor|patch]
 * Default: patch (e.g. 1.0.0 -> 1.0.1)
 * major: 1.0.0 -> 2.0.0, minor: 1.0.0 -> 1.1.0, patch: 1.0.0 -> 1.0.1
 * versionCode is always incremented by 1.
 */
const fs = require('fs');
const path = require('path');

const bumpType = (process.argv[2] || 'patch').toLowerCase();
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: node scripts/bump-version.js [major|minor|patch]');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const packageJsonPath = path.join(root, 'package.json');
const buildGradlePath = path.join(root, 'android', 'app', 'build.gradle');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

const current = appJson.version || '1.0.0';
const parts = current.split('.').map(Number);
if (parts.length < 3) {
  while (parts.length < 3) parts.push(0);
}

if (bumpType === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (bumpType === 'minor') {
  parts[1] = (parts[1] || 0) + 1;
  parts[2] = 0;
} else {
  parts[2] = (parts[2] || 0) + 1;
}

const newVersion = parts.join('.');

const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);
const currentVersionCode = versionCodeMatch ? parseInt(versionCodeMatch[1], 10) : 1;
const newVersionCode = currentVersionCode + 1;

appJson.version = newVersion;
packageJson.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
buildGradle = buildGradle.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
fs.writeFileSync(buildGradlePath, buildGradle);

console.log(`Bumped ${bumpType}: ${current} -> ${newVersion}, versionCode ${currentVersionCode} -> ${newVersionCode}`);
