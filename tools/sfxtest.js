// 29단계 효과음·환경음(실제 녹음) 점검. 1초 안쪽.
//  - SPRITE 표의 파일이 assets/audio에 다 있고, 자리(시작+길이)가 파일 길이 안에 든다 (m4a의 mvhd에서 길이를 읽는다)
//  - 효과음·환경음이 부르는 녹음 이름이 SPRITE에 다 있다. 깔개 녹음 파일이 다 있다
//  - 효과음+환경음 파일이 합쳐 5MB 안쪽
//  - window.__flAssets가 없으면(play.html, node) 아무것도 불러오지 않고 조용히 돈다
//  - docs/CREDITS.md에 출처가 적혀 있다
import fs from 'node:fs';
import path from 'node:path';
import { SPRITE, SFX, SOUND_FILES, playSfx, loadSound } from '../src/audio/sfx.js';
import { Ambience, AMB_BEDS, AMB_SHOTS, AMBIENCES } from '../src/audio/ambience.js';

let bad = 0;
const fail = (m) => { bad += 1; console.log('  ✗', m); };
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const A = path.join(root, 'assets/audio');

// m4a 길이(초): moov/mvhd
function m4aSeconds(buf) {
  const walk = (s, e) => {
    for (let i = s; i + 8 <= e;) {
      const size = buf.readUInt32BE(i), type = buf.toString('latin1', i + 4, i + 8);
      if (size < 8) return null;
      if (type === 'moov') return walk(i + 8, i + size);
      if (type === 'mvhd') {
        const v = buf[i + 8];
        return v === 1 ? Number(buf.readBigUInt64BE(i + 32)) / buf.readUInt32BE(i + 28) : buf.readUInt32BE(i + 24) / buf.readUInt32BE(i + 20);
      }
      i += size;
    }
    return null;
  };
  return walk(0, buf.length);
}

// 1. 파일과 자리
const files = new Set([...SOUND_FILES, ...AMB_BEDS.map((b) => `amb/${b}`)]);
const len = {};
let total = 0;
for (const f of files) {
  const p = path.join(A, `${f}.m4a`);
  if (!fs.existsSync(p)) { fail(`파일 없음: ${f}.m4a`); continue; }
  const b = fs.readFileSync(p);
  total += b.length;
  len[f] = m4aSeconds(b);
  if (!(len[f] > 0)) fail(`길이를 못 읽음: ${f}`);
}
for (const [name, list] of Object.entries(SPRITE)) {
  if (!list.length) fail(`녹음이 없는 이름: ${name}`);
  for (const [f, off, d] of list) {
    if (!(d > 0.03)) fail(`너무 짧은 녹음: ${name} ${d}`);
    if (len[f] && off + d > len[f] + 0.01) fail(`자리가 파일 밖: ${name} ${off}+${d} > ${len[f].toFixed(2)}`);
  }
}
for (const b of AMB_BEDS) if (len[`amb/${b}`] && len[`amb/${b}`] < 20) fail(`깔개가 짧음: ${b}`);
const extra = ['sfx', 'amb'].flatMap((d) => fs.readdirSync(path.join(A, d)).map((x) => `${d}/${x.replace(/\.m4a$/, '')}`)).filter((x) => !files.has(x));
if (extra.length) fail(`안 쓰는 파일: ${extra.join(', ')}`);
if (total > 5 * 1024 * 1024) fail(`효과음+환경음이 5MB를 넘음: ${(total / 1048576).toFixed(2)}MB`);

// 2. 부르는 이름이 다 있나: 가짜 소리 도구로 효과음을 여러 번 내 본다
const called = new Set();
const fakeK = { p: 1, g: 1, rl: 1, rec: (n) => { called.add(n); return null; }, note() {}, perc() {}, pick: (a) => a[Math.floor(Math.random() * a.length)] };
for (let i = 0; i < 40; i++) for (const s of Object.values(SFX)) s.play(fakeK, 0);
for (const n of called) if (!SPRITE[n]) fail(`효과음이 부르는 녹음이 없음: ${n}`);
const ambSrc = fs.readFileSync(path.join(root, 'src/audio/ambience.js'), 'utf8');
for (const [, n] of ambSrc.matchAll(/(?:shots?\(|k\.rec\()'(\w+)'/g)) if (!SPRITE[n]) fail(`환경음이 부르는 녹음이 없음: ${n}`);
if (/k\.(noise|tone|metal|crackle|knock|thud|step)\(/.test(ambSrc)) fail('환경음에 합성 소리가 남아 있음');

// 3. __flAssets 없이: 아무것도 불러오지 않고, 소리 마디도 만들지 않는다
let made = 0, fetched = 0;
const node = () => { made += 1; return { connect() {}, start() {}, stop() {}, gain: { value: 0, setValueAtTime() {}, setValueCurveAtTime() {}, linearRampToValueAtTime() {} }, frequency: { value: 0 }, Q: { value: 0 }, playbackRate: { value: 1 }, pan: { value: 0 } }; };
const ctx = { currentTime: 0, destination: {}, decodeAudioData() { fetched += 1; }, createBufferSource: node, createGain: node, createBiquadFilter: node, createStereoPanner: node };
globalThis.fetch = () => { fetched += 1; return new Promise(() => {}); };
const group = { ctx, dead: false, e: { duck() {} }, bus: () => ({ in: {} }), dry: {}, note() {}, perc() {}, fadeIn() {}, stop() { this.dead = true; } };
for (const id of Object.keys(SFX)) playSfx(group, id);
if (loadSound(ctx, 'sfx/ui') !== null) fail('__flAssets 없이 소리를 돌려줌');
const amb = new Ambience({ ctx, group: () => ({ ...group, dead: false }) });
amb.timer = 1;
for (const { id } of AMBIENCES) { amb.set(id, 0.1); for (let i = 0; i < 30; i++) { ctx.currentTime += 0.4; amb.tick(); } }
amb.stop();
if (fetched) fail(`__flAssets 없이 ${fetched}번 불러오려 함`);
if (made) fail(`__flAssets 없이 소리 마디 ${made}개를 만듦`);

// 4. 출처
const cred = fs.existsSync(path.join(root, 'docs/CREDITS.md')) ? fs.readFileSync(path.join(root, 'docs/CREDITS.md'), 'utf8') : '';
const rows = (cred.match(/freesound\.org\/s\/\d+/g) ?? []).length;
if (rows < 100) fail(`docs/CREDITS.md 출처 줄이 모자람 (${rows})`);
if (!/publicdomain\/zero/.test(cred)) fail('CREDITS.md에 CC0 라이선스가 안 적힘');

console.log(`효과음 ${Object.keys(SFX).length}개, 녹음 이름 ${Object.keys(SPRITE).length}개, 가끔 나는 소리 ${AMB_SHOTS.length}개, 깔개 ${AMB_BEDS.length}개, 파일 ${files.size}개 ${(total / 1048576).toFixed(2)}MB, 출처 ${rows}줄`);
if (bad) { console.log(`FAIL ${bad}`); process.exit(1); }
console.log('OK');
