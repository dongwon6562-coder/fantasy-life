// 모든 점검을 나눠서 함께 돌린다 (npm run test:fast).
// npm test의 목록(package.json "test")을 그대로 읽어, CPU 수만큼 동시에 돌린다. 하나씩 돌리면 10분이 넘었다.
// 목록은 계속 npm test에 덧붙이면 된다. 이 파일은 고칠 필요가 없다.
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import os from 'os';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const jobs = pkg.scripts.test.split('&&').map((s) => s.trim()).filter(Boolean);
const N = Math.max(1, Number(process.env.JOBS) || os.cpus().length);
const logDir = new URL('../.testlogs/', import.meta.url);
mkdirSync(logDir, { recursive: true });

// 오래 걸리는 것부터 시작해야 전체가 빨리 끝난다
const SLOW = ['breaktest', 'racetest', 'fuzzd', 'faithtest', 'domaintest', 'eventtest', 'reltest', 'lifetest', 'legendtest', 'seatest', 'deeptest', 'vocationtest'];
const weight = (cmd) => { const i = SLOW.findIndex((s) => cmd.includes(s)); return i < 0 ? 99 : i; };
// 지난번에 잰 시간이 있으면 그 순서로 (35단계 헤드: 새 점검이 늘며 SLOW 표 밖의 느린 점검이 끝에 몰려 꼬리가 길었다)
const TIMES = new URL('times.json', logDir);
let past = {};
try { past = JSON.parse(readFileSync(TIMES)); } catch { /* 처음엔 없다 */ }
const nameOf = (cmd) => (cmd.split(/\s+/).find((a) => a.endsWith('.js')) ?? cmd).replace(/^tools\//, '').replace(/\.js$/, '');
const queue = [...jobs].sort((a, b) => (past[nameOf(b)] ?? 0) - (past[nameOf(a)] ?? 0) || weight(a) - weight(b));

const t0 = Date.now();
const results = [];
function runOne(cmd) {
  return new Promise((resolve) => {
    const [bin, ...args] = cmd.split(/\s+/);
    const start = Date.now();
    // 함께 돌릴 때는 점검 안의 '1분 안' 문턱을 넉넉히 (부하 탓에 벽시계로 넘는다)
    const p = spawn(bin, args, { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...(N > 1 ? { FL_PARALLEL: '1' } : {}) } });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => {
      const name = (args.find((a) => a.endsWith('.js')) ?? bin).replace(/^tools\//, '').replace(/\.js$/, '');
      writeFileSync(new URL(`${name}.log`, logDir), out);
      results.push({ cmd, name, code, sec: (Date.now() - start) / 1000, tail: out.trim().split('\n').slice(-6).join('\n') });
      process.stdout.write(`${code === 0 ? '✓' : '✗'} ${name} (${((Date.now() - start) / 1000).toFixed(0)}초)\n`);
      resolve();
    });
  });
}
async function worker() { while (queue.length) await runOne(queue.shift()); }
await Promise.all(Array.from({ length: N }, worker));

writeFileSync(TIMES, JSON.stringify(Object.fromEntries(results.map((r) => [r.name, Math.round(r.sec)]))));
const bad = results.filter((r) => r.code !== 0);
console.log(`\n${results.length}개 점검, ${N}개씩 함께, ${((Date.now() - t0) / 1000).toFixed(0)}초`);
for (const r of bad) console.log(`\n✗ ${r.name} (로그 .testlogs/${r.name}.log)\n${r.tail}`);
console.log(bad.length ? `\n실패 ${bad.length}개` : '\n모두 통과');
process.exit(bad.length ? 1 : 0);
