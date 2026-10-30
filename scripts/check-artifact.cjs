// Verify the distributable, never dependencies resolved from the checkout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-artifact-'));
const vsce = path.resolve('node_modules/@vscode/vsce/vsce');
try {
  const artifact = path.join(temp, 'extension.vsix');
  const run = args => execFileSync(process.execPath, [vsce, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const listed = run(['ls']).trim().split(/\r?\n/);
  run(['package', '--skip-license', '--out', artifact]); // Default secret scanning must succeed.
  const entries = execFileSync('unzip', ['-Z1', artifact], { encoding: 'utf8' }).trim().split(/\r?\n/);
  const files = entries.filter(p => p.startsWith('extension/')).map(p => p.slice(10));
  const check = paths => {
    assert(paths.includes('node_modules/jsonc-parser/lib/umd/main.js'), 'Runtime parser missing');
    for (const file of paths) {
      assert(!/(^|\/)(\.cursor|\.git|\.vscode|test|tests|scripts|docs)(\/|$)/.test(file), `Development content: ${file}`);
      assert(!/(^|\/)(\.env(?:\.[^/]*)?|\.npmrc|\.vsce|[^/]*\.(?:pem|key|p12|pfx)|[^/]*\.vsix)$/.test(file), `Sensitive/generated content: ${file}`);
      if (file.startsWith('node_modules/')) assert(file.startsWith('node_modules/jsonc-parser/'), `Unexpected packaged dependency: ${file}`);
    }
  };
  check(listed);
  check(files);
  execFileSync('unzip', ['-q', artifact, '-d', temp]);
  const extension = path.join(temp, 'extension');
  const probe = `
    const assert = require('node:assert/strict');
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function(id, ...args) { return id === 'vscode' ? {} : original.call(this, id, ...args); };
    const root = ${JSON.stringify(extension)};
    const manifest = require(root + '/package.json');
    const entry = require(root + '/' + manifest.main);
    assert.equal(typeof entry.activate, 'function');
    assert.equal(typeof entry.deactivate, 'function');
    const parserPath = require.resolve('jsonc-parser', { paths: [root] });
    assert(parserPath.startsWith(root + '/node_modules/'));
    assert.deepEqual(require(parserPath).parse('{"@type":"Product"}'), { '@type': 'Product' });
  `;
  const env = { ...process.env }; delete env.NODE_PATH;
  execFileSync(process.execPath, ['-e', probe], { cwd: temp, env, stdio: 'inherit' });
  console.log(`Artifact regression passed: ${files.length} packaged files, default secret scan, isolated entry load`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
