const assert = require('assert');

function parseSemver(v) {
  const cleaned = v.trim().replace(/^v/i, '');
  const [versionPart] = cleaned.split('-');
  const parts = versionPart.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewerVersion(remoteTag, currentVersion) {
  const remote = parseSemver(remoteTag);
  const current = parseSemver(currentVersion);
  for (let i = 0; i < 3; i++) {
    if (remote[i] > current[i]) return true;
    if (remote[i] < current[i]) return false;
  }
  return false;
}

// 1. Basic equality & ordering
assert.strictEqual(isNewerVersion('v1.0.0', '1.0.0'), false);
assert.strictEqual(isNewerVersion('1.0.0', '1.0.0'), false);
assert.strictEqual(isNewerVersion('v1.0.1', '1.0.0'), true);
assert.strictEqual(isNewerVersion('v1.1.0', '1.0.0'), true);
assert.strictEqual(isNewerVersion('v2.0.0', '1.0.0'), true);
assert.strictEqual(isNewerVersion('v0.9.9', '1.0.0'), false);

// 2. Patch version bump
assert.strictEqual(isNewerVersion('v1.0.5', '1.0.4'), true);
assert.strictEqual(isNewerVersion('1.0.3', '1.0.4'), false);

// 3. Pre-release tags
assert.strictEqual(isNewerVersion('v1.0.1-beta.1', '1.0.0'), true);
assert.strictEqual(isNewerVersion('v1.0.0-rc.1', '1.0.0'), false);

// 4. Incomplete versions
assert.deepStrictEqual(parseSemver('1'), [1, 0, 0]);
assert.deepStrictEqual(parseSemver('1.2'), [1, 2, 0]);
assert.deepStrictEqual(parseSemver('v1.2.3'), [1, 2, 3]);

console.log('All updater assertions passed.');
