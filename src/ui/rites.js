// 47단계 '축제와 인생 의례' 화면(src/rites). 읽기만 한다.
// festNowView(s): 이번 달 화면 작은 카드 (이번 달 축제, 다음 축제)
// ritesView(s): '사람들' 화면 카드 (고장 축제 달력 열두 달, 내가 연·후원한 축제, 인생 의례 기록, 고장마다 다른 풍습)
import { ritesNow, ritesInfo } from '../rites/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null; // 그림 날짜용
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'rites', variant, year: G.date.year, month: G.date.month }), '') : '');

const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
// 축제 갈래: 씨뿌리기·추수·겨울 밤·기념일·달맞이·불·사냥 등. 모르는 갈래는 '축제'
export const FEAST_KIND = {
  fire: { word: '불놀이', sign: '✹' }, harvest: { word: '거두기', sign: '❦' }, market: { word: '큰 장', sign: '⚖' }, drink: { word: '술', sign: '♨' },
  contest: { word: '겨룸', sign: '⚔' }, parade: { word: '행렬', sign: '⚑' }, sacred: { word: '제사', sign: '✠' }, mourn: { word: '기리는 날', sign: '✝' },
  vigil: { word: '밤샘', sign: '☾' }, hunt: { word: '사냥', sign: '➶' }, grim: { word: '이름만 축제', sign: '·' },
};
const kindOf = (k) => FEAST_KIND[k] ?? { word: '축제', sign: '✧' };
// 인생 의례 갈래
export const RITE_KIND = { feast: '축제', name: '이름 짓기', coming: '성년식', wed: '혼례', funeral: '장례', vow: '서원', other: '의례' };
const riteWord = (k) => RITE_KIND[k] ?? k ?? '의례';

const left = (n) => (n == null ? '' : n <= 0 ? '이번 달' : n === 1 ? '다음 달' : `${n}달 뒤`);

function feastRow(f, cls = '') {
  cls = `${cls}${f.mine ? ' mine' : ''}`;
  const k = kindOf(f.kind);
  return `<li class="rt-feast ${cls}"><i aria-hidden="true">${k.sign}</i><div><b>${esc(f.name)}</b><small>${[f.kindWord ?? k.word, f.where, f.m ? `${f.m}월` : '', left(f.in)].filter(Boolean).map(esc).join(' · ')}</small>${f.text ? `<p class="note">${esc(f.text)}</p>` : ''}</div></li>`;
}

// 이번 달 카드엔 축제 설명을 다시 쓰지 않는다 (오늘의 장면 글에 이미 나온다, 48단계)
export function festNowView(s) {
  if (!s || (!s.now?.length && !s.next)) return '';
  const now = s.now ?? [];
  return `<section class="card rt-now">
    <h2>${now.length ? '이번 달 축제' : '다가오는 축제'}${s.place ? ` <small>${esc(s.place)}</small>` : ''}</h2>
    ${now.length ? `<ul class="rt-feasts">${now.map((f) => feastRow({ ...f, text: null }, 'on')).join('')}</ul>` : ''}
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
    <details class="pl-more"><summary>축제 ${cal.length}가지 자세히</summary><ul class="rt-feasts">${cal.slice().sort((a, b) => a.m - b.m).map((c) => feastRow(c, c.m === cur ? 'on' : '')).join('')}</ul></details>`;
}

function rite(r) {
  return `<li${r.mine ? ' class="rt-my"' : ''}><time>${when(r)}</time><span><b>${esc(riteWord(r.kind))}</b>${r.mine ? ' · 우리 집' : ''} · ${esc(r.text ?? r.who ?? '')}</span></li>`;
}

export function ritesView(s) {
  if (!s || (!s.calendar?.length && !s.rites?.length && !s.log?.length)) return '';
  const v = s.now?.length ? (s.mine ? 'host' : 'feast') : s.rites?.length ? 'rite' : 'calendar';
  const src = art(v);
  const mine = Array.isArray(s.mine) ? s.mine : s.mine ? [{ text: typeof s.mine === 'string' ? s.mine : s.mine.text }] : [];
  const cu = s.customs && !Array.isArray(s.customs) ? s.customs : null;
  const customs = cu ? [
    cu.naming ? ['이름 짓기', cu.naming] : null,
    cu.coming ? ['성년식', `${cu.coming.age}살에 ${cu.coming.title}`] : null,
    cu.wed ? ['혼례', cu.wed] : null,
    cu.funeral ? ['장례', cu.funeral] : null,
  ].filter(Boolean) : (s.customs ?? []).map((c) => (typeof c === 'string' ? [null, c] : [riteWord(c.kind), c.text]));
  const made = cu?.made ?? [];
  return `<section class="card rt-card">
    <h2>축제와 의례 <small>${s.place ? esc(s.place) : ''}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="축제와 의례">` : ''}
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    ${calendar(s)}
    ${mine.length ? `<p class="ac-h">내가 열거나 보탠 축제</p><ul class="ag-clues">${mine.map((x) => `<li>${x.text ? esc(x.text) : `${x.y ? `${x.y}년 ` : ''}<b>${esc(x.name)}</b>${x.placeName ? ` · ${esc(x.placeName)}` : ''}${x.how ? ` · ${esc(x.how)}` : ''}`}</li>`).join('')}</ul>` : ''}
    ${made.length ? `<p class="ac-h">고장에 남은 놀이</p><ul class="ag-clues">${made.map((x) => `<li><b>${esc(x.name)}</b>${x.place ? ` · ${esc(x.place)}` : ''}${x.m ? ` · ${x.m}월` : ''}${x.by ? ` · 처음 연 사람 ${esc(x.by)}` : ''}</li>`).join('')}</ul>` : ''}
    ${customs.length ? `<details class="pl-more"><summary>${cu?.name ? `${esc(cu.name)} 풍습` : '이 고장의 풍습'}</summary><ul class="rt-customs">${customs.map(([k, t]) => `<li>${k ? `<b>${esc(k)}</b>` : ''}<p>${esc(t)}</p></li>`).join('')}</ul></details>` : ''}
    ${s.rites?.length ? `<details class="pl-more" open><summary>치른 의례 ${s.rites.length}가지</summary><ul class="pl-news">${s.rites.map(rite).join('')}</ul></details>` : ''}
    ${s.log?.length ? `<details class="pl-more"><summary>축제에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderRitesNow(game) { G = game; try { return festNowView(safe(() => ritesNow(game))); } finally { G = null; } }
export function renderRites(game) { G = game; try { return ritesView(safe(() => ritesInfo(game))); } finally { G = null; } }
