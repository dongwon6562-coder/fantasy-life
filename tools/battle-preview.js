// 전투 연출 견본 페이지(dist/battle-preview.html)를 만든다. 게임과 같은 그림 코드를 쓴다.
//   node tools/battle-preview.js
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
writeFileSync('dist/_battle_entry.js', `import '../src/content.js';
import { battleDemo } from '../src/art/battle.js';
import { sceneImage } from '../src/art/scene.js';
globalThis.FL_DATA_URLS = true; // 견본 페이지는 그림을 data 주소로 넣는다
const GROUPS = [
  ['결투', 'harfen', [
    ['마주 섬', { kind: 'duel' }],
    ['강공이 들어감', { kind: 'duel', move: 'heavy', df: 1, lethal: true }],
    ['속공, 서로 맞음', { kind: 'duel', move: 'quick', df: 1, dm: 1, lethal: true }],
    ['막고 받아침', { kind: 'duel', move: 'guard', df: 1 }],
    ['허초가 읽힘', { kind: 'duel', move: 'feint', dm: 1 }],
    ['칼끼리 부딪침', { kind: 'duel', move: 'heavy' }],
    ['주문: 번개', { kind: 'duel', move: 'magic', spell: 'bolt', df: 1 }],
    ['검기로 끝냄', { kind: 'duel', move: 'aura', df: 1, lethal: true, end: 'win' }],
    ['졌다 (목검)', { kind: 'duel', move: 'quick', dm: 1, end: 'lose' }],
    ['검을 내림', { kind: 'duel', move: 'yield', end: 'yield' }],
    ['마법 겨루기', { kind: 'duel', magic: true, move: 'heavy', df: 1 }],
    ['마법 겨루기: 결계', { kind: 'duel', magic: true, move: 'guard', df: 1 }],
  ]],
  ['교전', 'ern', [
    ['고블린 무리와 마주침', { kind: 'fight', unit: 'goblin', count: 4, leader: 'goblin_chief', comps: 2 }],
    ['정면으로, 이김', { kind: 'fight', unit: 'bandit', count: 3, leader: 'bandit_chief', comps: 2, tactic: 'charge', result: 'victory', wounded: true }],
    ['기습, 늑대 떼', { kind: 'fight', unit: 'wolf', count: 3, leader: 'dire_wolf', comps: 1, tactic: 'ambush', result: 'victory' }],
    ['마법으로 먼저, 해골과 원령', { kind: 'fight', unit: 'skeleton', count: 3, leader: 'tower_wraith', comps: 2, mage: true, tactic: 'magic', result: 'victory' }],
    ['혼자서 거미 굴, 짐', { kind: 'fight', unit: 'cave_spider', count: 3, leader: 'spider_queen', comps: 0, tactic: 'charge', result: 'defeat', wounded: true }],
    ['오크에게서 달아남', { kind: 'fight', unit: 'orc', count: 2, leader: 'orc_chief', comps: 3, tactic: 'charge', result: 'flee' }],
    ['마력에 물든 곰', { kind: 'fight', unit: 'ghoul', count: 0, leader: 'mana_bear', comps: 2, tactic: 'charge', result: 'victory' }],
    ['와이번', { kind: 'fight', unit: 'cultist', count: 0, leader: 'wyvern', comps: 3, tactic: 'magic', mage: true, result: 'victory' }],
  ]],
  ['전쟁', 'verden', [
    ['두 군대가 마주 섬', { kind: 'war', ours: 120, theirs: 150 }],
    ['정면 진격, 이김', { kind: 'war', ours: 140, theirs: 110, plan: 'charge', outcome: 'win' }],
    ['기병으로 측면', { kind: 'war', ours: 120, theirs: 130, plan: 'flank', outcome: 'win' }],
    ['진을 치고 기다림', { kind: 'war', ours: 90, theirs: 150, plan: 'hold', outcome: 'draw' }],
    ['밤 기습', { kind: 'war', ours: 100, theirs: 140, plan: 'night', outcome: 'win' }],
    ['성벽에서 버팀', { kind: 'war', ours: 60, theirs: 170, plan: 'walls', outcome: 'win' }],
    ['정면 진격, 짐', { kind: 'war', ours: 80, theirs: 160, plan: 'charge', outcome: 'lose' }],
  ]],
];
const main = document.getElementById('groups');
for (const [name, place, items] of GROUPS) {
  const sec = document.createElement('section');
  sec.innerHTML = '<h2>' + name + '</h2><div class="stage"></div><div class="row"></div>';
  const stage = sec.querySelector('.stage'), row = sec.querySelector('.row');
  const art = sceneImage({ year: 505, month: name === '전쟁' ? 9 : 6, place });
  if (art) stage.style.backgroundImage = 'url(' + art + ')';
  let stop = null;
  items.forEach(([label, spec], i) => {
    const b = document.createElement('button'); b.className = 'ghost'; b.textContent = label;
    b.onclick = () => { stop?.(); stop = battleDemo(stage, spec); row.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
    row.appendChild(b);
    if (i === 1) b.click();
  });
  main.appendChild(sec);
}
`);
execSync('npx --yes esbuild@0.24.0 dist/_battle_entry.js --bundle --format=iife --minify --outfile=dist/_battle_bundle.js', { stdio: 'inherit' });
const js = readFileSync('dist/_battle_bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="ko" class="motion">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>전투 연출 견본</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
:root { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; --f-display: 'Gowun Batang', 'Noto Serif KR', serif; --f-body: 'IBM Plex Sans KR', system-ui, sans-serif; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg: #efe7d6; --line: #c9b994; --ink: #2a1d14; --muted: #6a5a44; --brass: #8a6426; } }
:root[data-theme="light"] { --bg: #efe7d6; --line: #c9b994; --ink: #2a1d14; --muted: #6a5a44; --brass: #8a6426; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; } }
:root[data-theme="dark"] { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--f-body); line-height: 1.6; }
main { max-width: 760px; margin: 0 auto; padding: 28px 16px 48px; display: grid; gap: 22px; }
h1 { font-family: var(--f-display); font-size: clamp(24px, 4vw, 34px); margin: 0; letter-spacing: .04em; }
h2 { font-family: var(--f-display); font-size: 19px; margin: 0 0 8px; color: var(--brass); }
p { margin: 0; }
.lead { color: var(--muted); max-width: 68ch; }
#groups { display: grid; gap: 26px; }
.stage { border: 1px solid var(--line); border-radius: 6px; background: #2a3036 center 60% / cover; }
.row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
button { font: inherit; cursor: pointer; }
.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; min-height: 40px; }
.ghost:hover { border-color: var(--brass); }
.ghost.on { border-color: var(--brass); color: var(--brass); }
</style>
</head>
<body>
<main>
  <header>
    <h1>전투 연출 견본</h1>
    <p class="lead">게임에서 싸움 장면이 뜰 때 사건 창 위쪽에 나오는 그림이다. 아래 단추를 누르면 그 상황의 연출을 다시 튼다. 게임에서는 내가 고른 수와 결과에 맞는 연출이 저절로 나온다.</p>
  </header>
  <div id="groups"></div>
</main>
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync('dist/battle-preview.html', html);
console.log('dist/battle-preview.html', (html.length / 1024).toFixed(0) + 'KB');
