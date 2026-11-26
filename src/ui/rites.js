// 47단계 '축제와 인생 의례' 화면(src/rites). 읽기만 한다.
// festNowView(s): 이번 달 화면 작은 카드 (이번 달 축제, 다음 축제)
// ritesView(s): '사람들' 화면 카드 (고장 축제 달력 열두 달, 내가 연·후원한 축제, 인생 의례 기록, 고장마다 다른 풍습)
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null; // 그림 날짜용
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'rites', variant, year: G.date.year, month: G.date.month }), '') : '');
export const withGame = (g, fn) => { G = g; try { return fn(); } finally { G = null; } };

const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
// 축제 갈래: 씨뿌리기·추수·겨울 밤·기념일·달맞이·불·사냥 등. 모르는 갈래는 '축제'
export const FEAST_KIND = {
  sow: { word: '씨뿌리기', sign: '❀' }, harvest: { word: '추수', sign: '❦' }, winter: { word: '겨울 밤', sign: '✦' },
  seal: { word: '기념일', sign: '✠' }, moon: { word: '달맞이', sign: '☾' }, fire: { word: '불 축제', sign: '✹' },
  hunt: { word: '사냥 축제', sign: '➶' }, faith: { word: '축일', sign: '✝' }, market: { word: '장날', sign: '⚖' },
};
const kindOf = (k) => FEAST_KIND[k] ?? { word: '축제', sign: '✧' };
// 인생 의례 갈래
export const RITE_KIND = { name: '이름 짓기', coming: '성년식', wed: '혼례', funeral: '장례', vow: '서원', other: '의례' };
const riteWord = (k) => RITE_KIND[k] ?? k ?? '의례';

const left = (n) => (n == null ? '' : n <= 0 ? '이번 달' : n === 1 ? '다음 달' : `${n}달 뒤`);

function feastRow(f, cls = '') {
  const k = kindOf(f.kind);
  return `<li class="rt-feast ${cls}"><i aria-hidden="true">${k.sign}</i><div><b>${esc(f.name)}</b><small>${[f.where, f.m ? `${f.m}월` : '', left(f.in)].filter(Boolean).map(esc).join(' · ')}</small>${f.text ? `<p class="note">${esc(f.text)}</p>` : ''}</div></li>`;
}

export function festNowView(s) {
  if (!s || (!s.now?.length && !s.next)) return '';
  const now = s.now ?? [];
  return `<section class="card rt-now">
    <h2>${now.length ? '이번 달 축제' : '다가오는 축제'}${s.place ? ` <small>${esc(s.place)}</small>` : ''}</h2>
    ${now.length ? `<ul class="rt-feasts">${now.map((f) => feastRow(f, 'on')).join('')}</ul>` : ''}
    ${s.next ? `<p class="note rt-next">다음 축제: <b>${esc(s.next.name)}</b>${s.next.where ? ` · ${esc(s.next.where)}` : ''}${s.next.in != null ? ` · ${left(s.next.in)}` : ''}</p>` : ''}
  </section>`;
}

// 열두 달 띠: 달마다 축제 표시, 이번 달 밝게
function calendar(s) {
  const cal = s.calendar ?? [];
  if (!cal.length) return '';
  const by = Array.from({ length: 12 }, (_, i) => cal.filter((c) => c.m === i + 1));
  const cur = G?.date?.month ?? s.month;
  return `<ol class="rt-cal">${by.map((list, i) => `<li class="${i + 1 === cur ? 'cur' : ''}${list.length ? ' has' : ''}"><span>${i + 1}월</span>${list.map((c) => `<i title="${esc(c.name)}">${kindOf(c.kind).sign}</i>`).join('')}</li>`).join('')}</ol>
    <ul class="rt-feasts">${cal.slice().sort((a, b) => a.m - b.m).map((c) => feastRow(c, c.m === cur ? 'on' : '')).join('')}</ul>`;
}

function rite(r) {
  return `<li><time>${when(r)}</time><span><b>${esc(riteWord(r.kind))}</b>${r.who ? ` · ${esc(r.who)}` : ''}${r.text ? ` · ${esc(r.text)}` : ''}</span></li>`;
}

export function ritesView(s) {
  if (!s || (!s.calendar?.length && !s.rites?.length && !s.log?.length)) return '';
  const v = s.now?.length ? (s.mine ? 'host' : 'feast') : s.rites?.length ? 'rite' : 'calendar';
  const src = art(v);
  const mine = s.mine ? (typeof s.mine === 'string' ? s.mine : s.mine.text) : '';
  return `<section class="card rt-card">
    <h2>축제와 의례 <small>${s.place ? esc(s.place) : ''}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="축제와 의례">` : ''}
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    ${calendar(s)}
    ${mine ? `<p class="note"><b>내가 연 축제</b> ${esc(mine)}</p>` : ''}
    ${s.customs?.length ? `<p class="ac-h">이 고장의 풍습</p><ul class="ag-clues">${s.customs.map((c) => `<li>${typeof c === 'string' ? esc(c) : `<b>${esc(riteWord(c.kind))}</b> · ${esc(c.text)}`}</li>`).join('')}</ul>` : ''}
    ${s.rites?.length ? `<details class="pl-more" open><summary>집안의 의례 ${s.rites.length}가지</summary><ul class="pl-news">${s.rites.slice().reverse().map(rite).join('')}</ul></details>` : ''}
    ${s.log?.length ? `<details class="pl-more"><summary>축제에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
