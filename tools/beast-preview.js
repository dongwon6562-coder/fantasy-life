// 짐승 초상 견본 페이지(dist/beast-preview.html)를 만든다. 게임과 같은 그림 코드를 쓴다.
//   node tools/beast-preview.js
import { writeFileSync, mkdirSync } from 'node:fs';
import { beastPortrait } from '../src/art/beastPortrait.js';

mkdirSync('dist', { recursive: true });
const S = 132;
const cell = (svg, label) => `<figure>${svg}<figcaption>${label}</figcaption></figure>`;
const row = (title, lead, cells) => `<section><h2>${title}</h2><p class="lead">${lead}</p><div class="grid">${cells.join('')}</div></section>`;
const many = (kind, sub, n, o = {}) => Array.from({ length: n }, (_, i) => cell(beastPortrait({ kind, sub, id: `${kind}${sub ?? ''}${i * 7 + 3}`, ...o }, { size: S }), o.label ?? `${i + 1}`));

const html = `<title>짐승 초상</title>
<style>
  :root { --bg: #efe6d2; --ink: #2a2018; --mute: #6a5a48; --card: #e4d8be; --line: #c9b994; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #1a1612; --ink: #eadfc8; --mute: #a89a82; --card: #26201a; --line: #3a3026; } }
  :root[data-theme="dark"] { --bg: #1a1612; --ink: #eadfc8; --mute: #a89a82; --card: #26201a; --line: #3a3026; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: "Noto Serif KR", "Nanum Myeongjo", serif; line-height: 1.6; }
  main { max-width: 1040px; margin: 0 auto; padding: 28px 16px 60px; }
  h1 { font-size: 28px; margin: 0 0 6px; } h2 { font-size: 18px; margin: 30px 0 2px; }
  .lead { color: var(--mute); margin: 0 0 12px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 12px; }
  figure { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 10px 6px 6px; text-align: center; }
  figure svg { width: 100%; height: auto; max-width: 132px; display: block; margin: 0 auto; }
  figcaption { font-size: 12px; color: var(--mute); margin-top: 4px; }
</style>
<main>
  <h1>짐승 초상</h1>
  <p class="lead">사람 초상과 같은 둥근 틀에 그린다. 같은 짐승은 늘 같은 털빛과 무늬로 나온다.</p>
  ${row('개', '귀 모양, 털빛, 이마의 흰 줄, 얼룩이 저마다 다르다. 마지막 둘은 늙은 개와 떠돌이 개.', [...many('dog', null, 6), cell(beastPortrait({ kind: 'dog', id: 'dog3', old: true }, { size: S }), '늙음'), cell(beastPortrait({ kind: 'dog', id: 'dog17', wild: true }, { size: S }), '목줄 없음')])}
  ${row('말', '털빛과 이마의 흰 줄. 굴레를 씌운 말과 들말.', [...many('horse', null, 6), cell(beastPortrait({ kind: 'horse', id: 'horse3', old: true }, { size: S }), '늙음'), cell(beastPortrait({ kind: 'horse', id: 'horse17', wild: true }, { size: S }), '들말')])}
  ${row('매', '사나운 눈썹뼈와 굽은 부리, 가슴의 무늬.', [...many('hawk', null, 6), cell(beastPortrait({ kind: 'hawk', id: 'hawk3', old: true }, { size: S }), '늙음')])}
  ${row('사역마', '고양이, 부엉이, 까마귀, 은여우. 눈과 둘레에 마력의 빛이 돈다. 은여우는 그림자가 꼬리 셋으로 갈라진다.', [...many('familiar', 'cat', 2), ...many('familiar', 'owl', 2), ...many('familiar', 'raven', 2), ...many('familiar', 'fox', 2)])}
  ${row('마수', '큰 늑대, 드레이크, 그리핀, 그림자 표범.', [...many('monster', 'direwolf', 2), ...many('monster', 'drake', 2), ...many('monster', 'griffin', 2), ...many('monster', 'shadowcat', 2)])}
</main>`;
writeFileSync('dist/beast-preview.html', html);
console.log('dist/beast-preview.html', Math.round(html.length / 1024) + 'KB');
