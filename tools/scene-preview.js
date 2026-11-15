// 풍경 그림 견본 페이지(dist/scene-preview.html)를 만든다. 게임과 같은 그림 코드를 쓴다.
//   node tools/scene-preview.js
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
writeFileSync('dist/_scene_entry.js', `import { sceneImage, conditionText } from '../src/art/scene.js';
import { P } from '../src/art/mapdata.js';
globalThis.FL_DATA_URLS = true; // 견본 페이지는 그림을 data 주소로 넣는다
const $ = (s) => document.querySelector(s);
const st = { place: 'ern', year: 505, month: 7, famine: false, plague: false };
const sel = $('#place');
const areas = [...new Set(P.map((p) => p.area || '그 밖'))];
sel.innerHTML = areas.map((a) => '<optgroup label="' + a + '">' + P.filter((p) => (p.area || '그 밖') === a).map((p) => '<option value="' + p.id + '">' + p.n + '</option>').join('') + '</optgroup>').join('');
sel.value = st.place;
$('#months').innerHTML = Array.from({ length: 12 }, (_, i) => '<button class="ghost" data-m="' + (i + 1) + '">' + (i + 1) + '월</button>').join('');
function show() {
  $('#view').src = sceneImage(st);
  $('#cap').textContent = '용사력 ' + st.year + '년 ' + st.month + '월 · ' + conditionText(st.year, st.month) + (st.famine ? ' · 흉년' : '') + (st.plague ? ' · 역병' : '');
  document.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', +b.dataset.m === st.month));
  $('#famine').classList.toggle('on', st.famine); $('#plague').classList.toggle('on', st.plague);
}
sel.onchange = () => { st.place = sel.value; show(); };
$('#months').onclick = (e) => { const m = e.target.dataset.m; if (m) { st.month = +m; show(); } };
$('#prev').onclick = () => { st.year--; show(); };
$('#next').onclick = () => { st.year++; show(); };
$('#famine').onclick = () => { st.famine = !st.famine; show(); };
$('#plague').onclick = () => { st.plague = !st.plague; show(); };
show();
const picks = [['ern', 505, 1], ['harfen', 505, 4], ['leocast', 505, 10], ['solaris', 506, 9], ['serenia', 505, 7], ['barka', 505, 6], ['graubel', 505, 12], ['eisen', 505, 5], ['iela', 505, 6], ['grondar', 505, 6], ['redcastle', 505, 7], ['saltmare', 505, 6],
  // 계절과 날씨: 뇌우, 눈보라, 바람, 오로라, 반딧불, 안개
  ['ern', 502, 8], ['ern', 500, 1], ['ern', 503, 11], ['graubel', 514, 2], ['ern', 505, 8], ['serenia', 502, 8], ['leocast', 507, 10], ['harfen', 538, 2], ['ern', 507, 3], ['ern', 500, 7], ['verden', 519, 10], ['ern', 501, 5]];
let i = 0;
(function next() {
  if (i >= picks.length) return;
  const [place, year, month] = picks[i++], p = P.find((q) => q.id === place);
  const f = document.createElement('figure');
  f.innerHTML = '<img alt="" src="' + sceneImage({ place, year, month }) + '"><figcaption>' + (p ? p.n : place) + ' · ' + month + '월 · ' + conditionText(year, month) + '</figcaption>';
  f.onclick = () => { st.place = place; st.year = year; st.month = month; sel.value = place; show(); scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#gallery').appendChild(f);
  setTimeout(next, 30);
})();
`);
execSync('npx --yes esbuild@0.24.0 dist/_scene_entry.js --bundle --format=iife --minify --outfile=dist/_scene_bundle.js', { stdio: 'inherit' });
const js = readFileSync('dist/_scene_bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>풍경 그림 견본</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
:root { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; --f-display: 'Gowun Batang', 'Noto Serif KR', serif; --f-body: 'IBM Plex Sans KR', system-ui, sans-serif; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg: #efe7d6; --line: #c9b994; --ink: #2a1d14; --muted: #6a5a44; --brass: #8a6426; } }
:root[data-theme="light"] { --bg: #efe7d6; --line: #c9b994; --ink: #2a1d14; --muted: #6a5a44; --brass: #8a6426; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; } }
:root[data-theme="dark"] { --bg: #17130f; --line: #3d3328; --ink: #e8dcc6; --muted: #a89982; --brass: #c9a25a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--f-body); line-height: 1.6; }
main { max-width: 1240px; margin: 0 auto; padding: 28px 16px 48px; display: grid; gap: 18px; }
h1 { font-family: var(--f-display); font-size: clamp(24px, 4vw, 34px); margin: 0; letter-spacing: .04em; }
h2 { font-family: var(--f-display); font-size: 19px; margin: 0 0 6px; color: var(--brass); }
p { margin: 0; }
.lead { color: var(--muted); max-width: 68ch; }
button, select { font: inherit; cursor: pointer; }
.ghost, select { background: transparent; color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; min-height: 40px; }
select option, select optgroup { color: #2a1d14; background: #efe7d6; }
.ghost:hover { border-color: var(--brass); }
.ghost.on { border-color: var(--brass); color: var(--brass); }
.row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
#view { display: block; width: 100%; aspect-ratio: 2.5; border: 1px solid var(--line); border-radius: 6px; background: #221c16; }
#cap { color: var(--muted); font-size: 14px; }
#gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
figure { margin: 0; cursor: pointer; }
figure img { display: block; width: 100%; aspect-ratio: 2.5; border: 1px solid var(--line); border-radius: 6px; }
figcaption { color: var(--muted); font-size: 13px; margin-top: 4px; }
</style>
</head>
<body>
<main>
  <header>
    <h1>풍경 그림 견본</h1>
    <p class="lead">게임 맨 위에 나오는 풍경과 똑같은 그림이다. 장소와 달을 바꿔 본다. 하루 중 때와 날씨는 그 달에 따라 정해지므로, 해를 넘기면 다른 때와 날씨가 나온다.</p>
  </header>
  <div class="row">
    <select id="place" aria-label="장소"></select>
    <button class="ghost" id="prev">앞 해</button>
    <button class="ghost" id="next">다음 해</button>
    <button class="ghost" id="famine">흉년</button>
    <button class="ghost" id="plague">역병</button>
  </div>
  <div class="row" id="months"></div>
  <img id="view" alt="풍경 그림">
  <p id="cap"></p>
  <section>
    <h2>여러 곳</h2>
    <div id="gallery"></div>
  </section>
</main>
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync('dist/scene-preview.html', html);
console.log('dist/scene-preview.html', (html.length / 1024).toFixed(0) + 'KB');
