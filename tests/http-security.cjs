// Read-only smoke test against the two temporary local production servers.
const assert = require('node:assert/strict');
const web = 'http://127.0.0.1:3101';
const admin = 'http://127.0.0.1:3100';

async function main() {
  for (const base of [web, admin]) {
    const response = await fetch(base + '/login');
    assert.equal(response.status, 200);
    const policy = response.headers.get('content-security-policy');
    const nonce = policy?.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce, 'Response needs a CSP nonce');
    assert.doesNotMatch(policy.split(';').find(p => p.trim().startsWith('script-src ')), /unsafe-inline|unsafe-eval/);
    const html = await response.text();
    const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m => m[2].trim());
    assert.ok(inlineScripts.length > 0);
    assert.ok(inlineScripts.every(m => m[1].includes(`nonce="${nonce}"`)), 'Every inline script must carry the response nonce');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    console.log(`${base}: login 200, nonce matches scripts, security headers present`);
  }
  const checks = [
    [admin + '/alunos', 307],
    [admin + '/api/private-test', 401],
    [web + '/aluno/cursos', 307],
    [web + '/api/lesson/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/video', 401],
    [web + '/api/cron/expiry-warning', 401],
    [web + '/api/aluno/exportar-dados', 401],
  ];
  for (const [url, expected] of checks) {
    const response = await fetch(url, { redirect: 'manual' });
    assert.equal(response.status, expected, url);
    console.log(`${new URL(url).pathname}: ${response.status}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
