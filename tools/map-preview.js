// 대륙 지도 견본 페이지(dist/map-preview.html)를 만든다. 게임과 같은 그림 코드를 쓴다.
//   node tools/map-preview.js
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
writeFileSync('dist/_map_entry.js', `import { mountMap } from '../src/art/map.js';
globalThis.FL_DATA_URLS = true; // 견본 페이지는 그림을 data 주소로 넣는다
mountMap(document.getElementById('host'), { here: 'ern' });
`);
execSync('npx --yes esbuild@0.24.0 dist/_map_entry.js --bundle --format=iife --minify --outfile=dist/_map_bundle.js', { stdio: 'inherit' });
const js = readFileSync('dist/_map_bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>대륙 지도 견본</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
:root {
  --bg: #17130f; --panel: #221c16; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a;
  --parch: #efe3c4; --parch-ink: #2a1d14;
  --f-display: 'Gowun Batang', 'Noto Serif KR', serif; --f-body: 'IBM Plex Sans KR', system-ui, sans-serif;
}
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg: #efe7d6; --panel: #e6dcc6; --line: #c9b994; --ink: #2a1d14; --muted: #6a5a44; --brass: #8a6426; } }
:root[data-theme="light"] { --bg: #efe7d6; --panel: #e6dcc6; --line: #c9b994; --ink: #2a1d14; --muted: #6a5a44; --brass: #8a6426; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #17130f; --panel: #221c16; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; } }
:root[data-theme="dark"] { --bg: #17130f; --panel: #221c16; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--f-body); line-height: 1.6; }
main { max-width: 1240px; margin: 0 auto; padding: 28px 16px 48px; display: grid; gap: 18px; }
h1 { font-family: var(--f-display); font-size: clamp(24px, 4vw, 34px); margin: 0; letter-spacing: .04em; }
h2 { font-family: var(--f-display); font-size: 19px; margin: 0 0 6px; color: var(--brass); }
h3 { font-family: var(--f-display); margin: 0; }
p { margin: 0; }
.lead { color: var(--muted); max-width: 68ch; }
button { font: inherit; cursor: pointer; }
.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 8px 14px; min-height: 40px; }
.ghost:hover { border-color: var(--brass); }
.note { color: var(--muted); font-size: 13px; }
.map-host { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 12px; align-items: start; }
.map-tools { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
.map-tools .zoom { display: flex; gap: 6px; }
.mapbox { position: relative; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; background: #cdbb92; aspect-ratio: 1.6; }
.mapbox svg { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; font-family: var(--f-body); }
.mapbox svg.drag { cursor: grabbing; }
.mapbox .t3 { display: none; }
.mapbox svg.zoomed .t3 { display: inline; }
.mapbox .place { cursor: pointer; }
.mapbox .place:hover .mk, .mapbox .place.on .mk { stroke: #9a2a17; stroke-width: 2.6; }
.mapbox .place.on text { fill: #9a2a17; }
.mapbox .rlbl { cursor: pointer; }
.mapbox .rlbl:hover text, .mapbox .rlbl.on text { fill: #9a2a17; }
.map-loading { position: absolute; inset: 0; display: grid; place-items: center; color: var(--parch-ink); font-family: var(--f-display); background: repeating-linear-gradient(45deg, #d8c79f 0 12px, #d2c096 12px 24px); }
.map-info { background: var(--parch); color: var(--parch-ink); border-radius: 6px; padding: 14px 16px; display: grid; gap: 6px; box-shadow: inset 0 0 30px rgba(120, 80, 30, .25); }
.map-info .kind { font-size: 12px; letter-spacing: .12em; color: #7a5a2a; }
.map-info .here { color: #9a2a17; }
.map-info h3 { font-size: 20px; }
.map-info .note { color: #6a5a44; }
.map-info .desc { line-height: 1.7; font-size: 14px; }
.map-info .todo { font-size: 13px; display: grid; gap: 2px; }
.map-info .todo span { font-size: 11px; letter-spacing: .12em; color: #7a5a2a; }
ul { margin: 0; padding-left: 20px; display: grid; gap: 4px; max-width: 72ch; }
@media (max-width: 860px) { .map-host { grid-template-columns: minmax(0, 1fr); } .mapbox { aspect-ratio: 1.15; } }
</style>
</head>
<body>
<main>
  <header>
    <h1>대륙 지도 견본</h1>
    <p class="lead">게임 안 지도 화면과 똑같은 그림이다. 끌어서 움직이고, 휠이나 두 손가락으로 확대해 본다. 장소나 나라 이름을 누르면 설명이 나온다.</p>
  </header>
  <div id="host" class="map-host"></div>
  <section>
    <h2>달라진 점</h2>
    <ul>
      <li>산은 능선과 그늘 빗금이 있는 봉우리로, 숲은 잎 넓은 나무와 바늘잎 나무가 섞인 덩어리로 그렸다. 죽은 숲, 늪, 메마른 땅, 재의 평원도 저마다 다른 기호를 쓴다.</li>
      <li>마을과 도시 둘레에 밭이 깔리고, 들판에는 풀과 외딴 나무가 있다.</li>
      <li>바닷가 윤곽과 물결선을 펜 선으로 또렷하게 긋고, 먼바다에는 잔물결과 배, 바다뱀을 넣었다.</li>
      <li>국경은 끊어 긋는 선과 옅은 물감 띠로 나타냈다.</li>
      <li>수도, 도시, 마을, 요새, 미궁, 폐허, 명소 기호를 새로 그렸고, 글자는 옛 책 느낌의 바탕체로 바꿨다.</li>
      <li>확대해도 선이 뭉개지지 않게 그림을 두 배 크기로 그린다. 글자는 확대와 축소에 맞춰 크기가 바뀌어 늘 읽을 만하다.</li>
      <li>열여섯 방위 나침반, 방위선, 눈금 테두리, 제목과 축척을 넣었다.</li>
    </ul>
  </section>
</main>
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync('dist/map-preview.html', html);
console.log('dist/map-preview.html', (html.length / 1024).toFixed(0) + 'KB');
