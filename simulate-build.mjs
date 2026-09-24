// Stands in for a 45-minute Unity WebGL build: writes, in seconds, the same kinds of files
// Unity produces, so the preview pipeline and CDN headers can be tested end to end.
//
//   node simulate-build.mjs <outDir>
//
// Output (like Unity 2020+ with Brotli/Gzip, plus a Unity 2019 .unityweb file):
//   index.html                 page that checks every file loads correctly and shows ✅/❌
//   build-info.json            branch, commit, time
//   Build/test.wasm.br         real WebAssembly (exports add), Brotli -> needs Content-Encoding: br + application/wasm
//   Build/test.framework.js.gz JavaScript, gzip -> needs Content-Encoding: gzip + text/javascript
//   Build/test.data.gz         data, gzip
//   Build/test.data.unityweb   Unity 2019 style: gzip bytes served *without* Content-Encoding
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const out = process.argv[2] ?? 'build';
const info = {
  ref: process.env.GITHUB_REF_NAME ?? 'local',
  sha: (process.env.GITHUB_SHA ?? 'local').slice(0, 7),
  built_at: new Date().toISOString(),
};
const marker = `vault-publisher-test ${info.sha}`;

// (module (func (export "add") (param i32 i32) (result i32) local.get 0 local.get 1 i32.add))
const wasm = Buffer.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
  0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
]);

const page = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>vault-publisher test build</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
  li { list-style: none; } code { background: #eee; padding: 0 .25rem; }
</style>
<h1>vault-publisher test build</h1>
<p>Branch <code>${info.ref}</code>, commit <code>${info.sha}</code>, built ${info.built_at}</p>
<ul id="results"></ul>
<p id="summary"></p>
<script src="Build/test.framework.js.gz"></script>
<script>
  const results = document.getElementById('results');
  const checks = [
    ['Brotli WebAssembly (Content-Encoding: br, application/wasm)', async () => {
      const { instance } = await WebAssembly.instantiateStreaming(fetch('Build/test.wasm.br'));
      return instance.exports.add(2, 3) === 5;
    }],
    ['Gzip JavaScript (Content-Encoding: gzip)', async () => window.frameworkLoaded === ${JSON.stringify(marker)}],
    ['Gzip data file', async () => (await (await fetch('Build/test.data.gz')).text()) === ${JSON.stringify(marker)}],
    ['Unity 2019 .unityweb served raw (gzip bytes, no Content-Encoding)', async () => {
      const bytes = new Uint8Array(await (await fetch('Build/test.data.unityweb')).arrayBuffer());
      return bytes[0] === 0x1f && bytes[1] === 0x8b;
    }],
    ['build-info.json', async () => (await (await fetch('build-info.json')).json()).sha === ${JSON.stringify(info.sha)}],
  ];
  (async () => {
    let passed = 0;
    for (const [name, check] of checks) {
      let ok = false, error = '';
      try { ok = await check(); } catch (err) { error = ' — ' + err.message; }
      if (ok) passed++;
      const li = document.createElement('li');
      li.textContent = (ok ? '✅ ' : '❌ ') + name + error;
      results.append(li);
    }
    document.getElementById('summary').textContent = passed + ' / ' + checks.length + ' checks passed';
    document.title = (passed === checks.length ? 'PASS' : 'FAIL') + ' — vault-publisher test build';
  })();
</script>
</html>
`;

mkdirSync(join(out, 'Build'), { recursive: true });
writeFileSync(join(out, 'index.html'), page);
writeFileSync(join(out, 'build-info.json'), JSON.stringify(info, null, 2));
writeFileSync(join(out, 'Build/test.wasm.br'), brotliCompressSync(wasm));
writeFileSync(join(out, 'Build/test.framework.js.gz'), gzipSync(`window.frameworkLoaded = ${JSON.stringify(marker)};`));
writeFileSync(join(out, 'Build/test.data.gz'), gzipSync(marker));
writeFileSync(join(out, 'Build/test.data.unityweb'), gzipSync(marker));
console.log(`Wrote simulated build for ${info.ref}@${info.sha} to ${out}/`);
