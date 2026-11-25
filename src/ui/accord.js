// 45단계 '대륙 정세' 화면(src/accord). 읽기만 한다.
// accordView(s): 지도 화면 카드 (나라끼리 동맹·조약·혼인·봉쇄·국경 다툼·전쟁, 나라마다 편, 그게 내 고장에 미치는 것, 소식)
// 지도 위 선은 src/art/map.js MAP_LINKS로 그린다 (accordLinks).
import { esc } from './util.js';

// 사이 갈래: 좋은 사이(동맹·혼인·조약·무역), 날 선 사이(봉쇄·국경 다툼·끊김), 싸움(전쟁)
export const TIE_KIND = {
  ally: { word: '동맹', tone: 'good', sign: '＝' },
  marriage: { word: '혼인 동맹', tone: 'good', sign: '♡' },
  pact: { word: '조약', tone: 'good', sign: '＝' },
  trade: { word: '무역 조약', tone: 'good', sign: '⇄' },
  embargo: { word: '무역 봉쇄', tone: 'tense', sign: '✕' },
  border: { word: '국경 다툼', tone: 'tense', sign: '⚑' },
  cold: { word: '사이가 틀어짐', tone: 'tense', sign: '…' },
  war: { word: '전쟁', tone: 'war', sign: '⚔' },
};
const kindOf = (k) => TIE_KIND[k] ?? { word: k, tone: 'tense', sign: '·' };
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;

function tie(t) {
  const k = kindOf(t.kind);
  return `<li class="ac-tie ${k.tone}">
    <span class="ac-a">${esc(t.aName)}</span><i aria-hidden="true">${k.sign}</i><span class="ac-b">${esc(t.bName)}</span>
    <em>${esc(t.word ?? k.word)}${t.since ? ` · ${t.since}년부터` : ''}</em>
    ${t.text ? `<p class="note">${esc(t.text)}</p>` : ''}
  </li>`;
}

export function accordView(s) {
  if (!s || !s.ties?.length) return '';
  const tone = (x) => kindOf(x.kind).tone;
  const groups = [['war', '싸우는 나라'], ['tense', '날 선 사이'], ['good', '손잡은 나라']]
    .map(([t, label]) => [label, s.ties.filter((x) => tone(x) === t)]).filter(([, l]) => l.length);
  return `<section class="card ac-map">
    <h2>대륙 정세 <small>${s.year ? `${s.year}년 ` : ''}얽힌 사이 ${s.ties.length}</small></h2>
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    ${groups.map(([label, list]) => `<p class="ac-h">${label}</p><ul class="ac-ties">${list.map(tie).join('')}</ul>`).join('')}
    ${s.here?.length ? `<p class="note"><b>이 고장에 닿는 것</b></p><ul class="ag-clues">${s.here.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    ${s.me ? `<p class="note"><b>내 자리</b> ${esc(s.me)}</p>` : ''}
    ${s.news?.length ? `<details class="pl-more"><summary>나라 사이 소식 ${s.news.length}가지</summary><ul class="pl-news">${s.news.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
    <p class="note ac-key"><span class="good">━ 손잡음</span> <span class="tense">┅ 날 섬</span> <span class="war">━ 싸움</span> · 지도 위에 선으로 그렸다</p>
  </section>`;
}

// 지도 선: [{ a, b, tone, word }] (a·b는 나라 id)
export const accordLinks = (s) => (s?.ties ?? []).filter((t) => t.a && t.b && t.a !== t.b).map((t) => ({ a: t.a, b: t.b, tone: kindOf(t.kind).tone, word: t.word ?? kindOf(t.kind).word }));
