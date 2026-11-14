// 음악·효과음 미리듣기 페이지(dist/audio-preview.html)를 만든다. 게임과 같은 소리 코드를 묶어 넣는다.
//   node tools/audio-preview.js
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
execSync('npx --yes esbuild@0.24.0 src/audio/preview.js --bundle --format=iife --minify --outfile=dist/audio-preview.js', { stdio: 'inherit' });
const js = readFileSync('dist/audio-preview.js', 'utf8');

const html = `<title>에른 마을 음악과 효과음</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
/* 게임과 같은 촛불 서재 빛깔(한 가지 어두운 모습으로 고정). 위에 붙박이 재생 막대, 아래로 곡 목록과 효과음 판. */
:root {
  --bg: #17130f; --panel: #221c16; --panel-2: #2b241c; --line: #3d3328;
  --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; --brass-dim: #8a6d38;
  --f-display: 'Gowun Batang', 'Noto Serif KR', 'Batang', serif;
  --f-body: 'IBM Plex Sans KR', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 15px; line-height: 1.6; -webkit-tap-highlight-color: transparent; }
button, input { font: inherit; color: inherit; }
button { cursor: pointer; touch-action: manipulation; }
:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
h1, h2, h3 { font-family: var(--f-display); font-weight: 700; margin: 0; text-wrap: balance; }
.wrap { max-width: 920px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 28px; }
.head { display: grid; gap: 8px; }
.eyebrow { color: var(--brass); letter-spacing: .16em; font-size: 12px; }
.head h1 { font-size: clamp(26px, 5vw, 38px); line-height: 1.25; }
.head p { margin: 0; color: var(--muted); max-width: 62ch; }
#count { color: var(--ink); font-variant-numeric: tabular-nums; }

.deck { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; display: grid; gap: 10px; box-shadow: 0 10px 28px rgba(0, 0, 0, .45); }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }
.deck-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.now { flex: 1 1 180px; min-width: 0; display: grid; }
.now strong { font-family: var(--f-display); font-size: 19px; line-height: 1.3; }
.now span { color: var(--muted); font-size: 13px; }
.deck button { border: 1px solid var(--line); background: var(--panel-2); border-radius: 8px; padding: 8px 14px; min-height: 40px; }
.deck button:disabled { opacity: .45; cursor: default; }
#tour[aria-pressed="true"] { border-color: var(--brass); color: var(--brass); }
#scope { display: block; width: 100%; height: 44px; }
.vols { display: flex; gap: 8px 22px; flex-wrap: wrap; }
.vols label { display: grid; grid-template-columns: auto minmax(90px, 1fr) 2.4em; align-items: center; gap: 10px; flex: 1 1 220px; min-width: 0; font-size: 13.5px; color: var(--muted); }
.vols input { width: 100%; min-width: 0; accent-color: var(--brass); }
.vols output { text-align: right; font-variant-numeric: tabular-nums; }
#tour-note { margin: 0; color: var(--brass); font-size: 13.5px; }
#tour-note:empty { display: none; }

.part { display: grid; gap: 18px; }
.part > h2 { font-size: 22px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
.grp { display: grid; gap: 8px; }
.grp h3 { font-family: var(--f-body); font-weight: 500; font-size: 12.5px; letter-spacing: .12em; color: var(--muted); }
.tracks { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.track { width: 100%; display: grid; grid-template-columns: 36px minmax(0, 1fr) minmax(0, 1.1fr); align-items: center; gap: 4px 14px; text-align: left; background: transparent; border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px 10px 10px; }
.track:hover { background: var(--panel); }
.track[aria-pressed="true"] { background: var(--panel-2); border-color: var(--brass-dim); }
.pp { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--brass-dim); display: grid; place-items: center; color: var(--brass); }
.pp::before { content: ""; border-left: 10px solid currentColor; border-top: 6.5px solid transparent; border-bottom: 6.5px solid transparent; margin-left: 3px; }
.track[aria-pressed="true"] .pp { background: var(--brass); color: var(--bg); }
.track[aria-pressed="true"] .pp::before { border: 0; margin: 0; width: 11px; height: 11px; background: currentColor; border-radius: 1px; }
.tt { display: grid; min-width: 0; }
.tt strong { font-family: var(--f-display); font-size: 17px; line-height: 1.35; }
.wh { color: var(--muted); font-size: 13px; }
.meta { display: grid; min-width: 0; font-size: 12.5px; color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }
.meta .ins { color: var(--brass-dim); }
@media (max-width: 620px) {
  .track { grid-template-columns: 36px minmax(0, 1fr); }
  .meta { grid-column: 2; text-align: left; }
}
.pads { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 6px; }
.padb { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 10px 8px; min-height: 44px; font-size: 14px; }
.padb:hover { border-color: var(--brass-dim); }
.padb:active { background: var(--brass); color: var(--bg); border-color: var(--brass); }
.foot { color: var(--muted); font-size: 13px; margin: 0; max-width: 66ch; }
</style>
<div class="wrap">
  <header class="head">
    <span class="eyebrow">용사력 500년 · 소리 미리듣기</span>
    <h1>에른 마을 음악과 효과음</h1>
    <p>전부 브라우저가 그 자리에서 만들어 내는 소리다. 곡을 누르면 흐르고, 다른 곡을 누르면 게임에서처럼 서서히 넘어간다. <span id="count"></span></p>
  </header>

  <div class="deck">
    <div class="deck-top">
      <div class="now"><strong id="now-name">멈춤</strong><span id="now-where">곡을 누르면 시작한다</span></div>
      <button type="button" id="tour" aria-pressed="false">게임처럼 이어 듣기 (1분)</button>
      <button type="button" id="stop" disabled>멈추기</button>
    </div>
    <canvas id="scope" aria-hidden="true"></canvas>
    <p id="tour-note" aria-live="polite"></p>
    <div class="vols">
      <label>음악 <input type="range" id="vol-music" min="0" max="100" step="5" value="70"><output>70</output></label>
      <label>효과음 <input type="range" id="vol-sfx" min="0" max="100" step="5" value="80"><output>80</output></label>
    </div>
  </div>

  <section class="part"><h2>음악</h2><div id="tracks" class="part"></div></section>
  <section class="part"><h2>효과음</h2><div id="sfx" class="part"></div></section>
  <p class="foot">게임에서는 장소·계절·사건에 따라 곡이 저절로 골라진다. 폰이 무음 모드이면 소리가 나지 않을 수 있다.</p>
</div>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
writeFileSync('dist/audio-preview.html', html);
console.log('dist/audio-preview.html', (html.length / 1024).toFixed(0) + 'KB');
