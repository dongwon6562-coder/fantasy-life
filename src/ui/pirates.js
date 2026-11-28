// 49단계 '해적과 바다의 무법자' 화면(src/pirates). 읽기만 한다.
// piratesView(s): 지도 화면 카드 '바다 정세' (바다마다 해적단·이름난 선장·깃발·소굴, 털린 항로, 사냥 함대, 나와의 일)
// piratesBlockView(s): '나' 화면 덩이 '해적의 삶' (배 위 계급·몫·허가장·숨긴 보물)
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null; // 그림 날짜용
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'pirates', variant, year: G.date.year, month: G.date.month }), '') : '');
export const withPiratesGame = (g, fn) => { G = g; try { return fn(); } finally { G = null; } };

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);
const txt = (x) => (typeof x === 'string' ? x : x?.text ?? '');

function crew(c) {
  const sub = [c.sea, c.lair ? `소굴 ${c.lair}` : '', c.ships != null ? `배 ${c.ships}척` : '', c.since ? `${c.since}년부터` : ''].filter(Boolean).map(esc).join(' · ');
  return `<li class="pi-crew${c.gone ? ' gone' : ''}${c.mine ? ' mine' : ''}">
    <div class="pi-top"><span class="pi-flag" aria-hidden="true">${esc(c.flagSign ?? '⚑')}</span><b>${esc(c.name)}</b>${c.word ? `<em>${esc(c.word)}</em>` : ''}</div>
    ${c.captain ? `<p class="note">선장 <b>${esc(c.captain)}</b>${c.flag ? ` · 깃발 ${esc(c.flag)}` : ''}</p>` : ''}
    ${sub ? `<p class="note">${sub}</p>` : ''}
    ${c.power != null && !c.gone ? `<div class="pi-pow"><span>기세</span>${bar(c.power, c.power >= 60 ? 'warn' : 'mana')}</div>` : ''}
  </li>`;
}

export function piratesView(s) {
  if (!s || (!list(s.crews).length && !list(s.news).length)) return '';
  const live = list(s.crews).filter((c) => !c.gone);
  const v = s.hunt ? 'hunt' : live.some((c) => (c.power ?? 0) >= 60) ? 'raid' : 'sea';
  const src = art(v);
  return `<section class="card pi-card">
    <h2>바다 정세 <small>해적단 ${live.length}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="바다의 무법자">` : ''}
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    ${live.length ? `<ul class="pi-crews">${live.map(crew).join('')}</ul>` : ''}
    ${list(s.routes).length ? `<p class="ac-h">흔들리는 뱃길</p><ul class="ag-clues">${s.routes.map((r) => `<li>${typeof r === 'string' ? esc(r) : `<b>${esc(r.name)}</b>${r.word ? ` · ${esc(r.word)}` : ''}`}</li>`).join('')}</ul>` : ''}
    ${s.hunt ? `<p class="note"><b>해적 사냥</b> ${esc(txt(s.hunt))}</p>` : ''}
    ${s.me ? `<p class="note"><b>나와 바다</b> ${esc(txt(s.me))}</p>` : ''}
    ${list(s.crews).some((c) => c.gone) ? `<details class="pl-more"><summary>사라진 해적단 ${s.crews.filter((c) => c.gone).length}</summary><ul class="pi-crews">${s.crews.filter((c) => c.gone).map(crew).join('')}</ul></details>` : ''}
    ${list(s.news).length ? `<details class="pl-more"><summary>바다 소식 ${s.news.length}가지</summary><ul class="pl-news">${s.news.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function piratesBlockView(s) {
  const me = s?.life;
  if (!me) return '';
  return `<div class="block pi-block">
    <h3>해적의 삶 <small>${esc(me.rank ?? '')}</small></h3>
    ${me.crew ? `<p class="note"><b>${esc(me.crew)}</b>${me.captain ? ` · 선장 ${esc(me.captain)}` : ''}${me.ship ? ` · 배 ${esc(me.ship)}` : ''}</p>` : ''}
    ${me.share != null ? `<p class="note">받은 몫 은화 ${me.share}닢${me.bounty ? ` · <b class="down">현상금 ${me.bounty}닢</b>` : ''}</p>` : ''}
    ${me.letter ? `<p class="note"><b>사략 허가장</b> ${esc(txt(me.letter))}</p>` : ''}
    ${list(me.treasure).length ? `<p class="note">숨긴 보물: ${me.treasure.map((t) => esc(txt(t) || t.where)).join(' · ')}</p>` : ''}
    ${list(me.log).length ? `<details class="pl-more"><summary>바다에서 있었던 일 ${me.log.length}가지</summary><ul class="pl-news">${me.log.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
