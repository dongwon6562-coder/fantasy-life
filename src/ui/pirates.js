// 49단계 '해적과 바다의 무법자' 화면(src/pirates). 읽기만 한다.
// piratesView(s): 지도 화면 카드 '바다 정세' (바다마다 해적단·선장·깃발·소굴, 흔들리는 뱃길, 사냥 함대, 은퇴한 해적, 소식)
// piratesBlockView(s): '나' 화면 덩이 '해적의 삶' (배 위 계급·몫·허가장·보물 지도·현상금)
import { piratesInfo } from '../pirates/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null; // 그림 날짜용
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'pirates', variant, year: G.date.year, month: G.date.month }), '') : '');

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);

function crew(c) {
  const sub = [c.sea, c.lair ? `소굴 ${c.lair}` : '', c.ships ? `배 ${c.ships}척` : '', c.men ? `${c.men}명` : '', c.since && !c.gone ? `${c.since}년부터` : ''].filter(Boolean).map(esc).join(' · ');
  return `<li class="pi-crew${c.gone ? ' gone' : ''}${c.mine ? ' mine' : ''}">
    <div class="pi-top"><b>${esc(c.name)}</b>${c.word ? `<em class="${c.gone ? 'down' : 'plain'}">${esc(c.word)}</em>` : ''}</div>
    ${c.captain || c.flag ? `<p class="note">${c.captain ? `선장 <b>${esc(c.captain)}</b>` : ''}${c.captain && c.flag ? ' · ' : ''}${c.flag ? `깃발 ${esc(c.flag)}` : ''}</p>` : ''}
    ${sub ? `<p class="note">${sub}</p>` : ''}
    ${c.letter && !c.gone ? `<p class="note">${esc(c.letter)}</p>` : ''}
    ${c.power != null && !c.gone ? `<div class="pi-pow"><span>기세</span>${bar(c.power, c.power >= 60 ? 'warn' : 'mana')}</div>` : ''}
  </li>`;
}

function route(r) {
  return `<li class="pi-route"><div class="wd-row kn-row"><span><b>${esc(r.name)}</b> · ${esc(r.word ?? '')}${r.losses ? ` · 잃은 배 ${r.losses}` : ''}</span>${bar(r.danger ?? 0, (r.danger ?? 0) >= 55 ? 'warn' : 'kin')}</div></li>`;
}

export function piratesView(s) {
  if (!s || (!list(s.crews).length && !list(s.news).length)) return '';
  const all = list(s.crews), live = all.filter((c) => !c.gone), fell = all.filter((c) => c.gone);
  const hunt = list(s.hunt);
  const v = hunt.length ? 'hunt' : live.some((c) => (c.power ?? 0) >= 60) ? 'raid' : 'sea';
  const src = art(v);
  // 내가 있는 바다의 해적단을 먼저
  const mineFirst = live.slice().sort((a, b) => (b.mine - a.mine) || ((b.sea === s.here) - (a.sea === s.here)) || ((b.power ?? 0) - (a.power ?? 0)));
  const top = mineFirst.slice(0, 4), rest = mineFirst.slice(4);
  return `<section class="card pi-card">
    <h2>바다 정세 <small>해적단 ${live.length}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="바다의 무법자">` : ''}
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    ${list(s.routes).length ? `<p class="ac-h">뱃길 위험</p><ul class="pi-routes">${s.routes.map(route).join('')}</ul>` : ''}
    ${hunt.length ? `<p class="note"><b>해적 사냥</b> ${hunt.map((h) => esc(`${J(h.navy, '이/가')} ${h.sea}에서 ${J(h.target || '해적', '을/를')} 쫓는다 (${h.months}달 남음)`)).join(' · ')}</p>` : ''}
    ${top.length ? `<ul class="pi-crews">${top.map(crew).join('')}</ul>` : ''}
    ${rest.length ? `<details class="pl-more"><summary>다른 해적단 ${rest.length}</summary><ul class="pi-crews">${rest.map(crew).join('')}</ul></details>` : ''}
    ${s.hoards ? `<p class="note">아직 아무도 파내지 않은 보물이 ${s.hoards}곳에 묻혀 있다고 한다.</p>` : ''}
    ${list(s.retired).length ? `<details class="pl-more"><summary>칼을 내려놓은 해적 ${s.retired.length}</summary><ul class="pi-retired">${s.retired.map((r) => `<li>${esc(r.name)}${r.cap ? ' (선장이었다)' : ''} · ${esc(r.band)} · 지금 ${esc(r.place)}</li>`).join('')}</ul></details>` : ''}
    ${fell.length ? `<details class="pl-more"><summary>사라진 해적단 ${fell.length}</summary><ul class="pi-crews">${fell.map(crew).join('')}</ul></details>` : ''}
    ${list(s.news).length ? `<details class="pl-more"><summary>바다 소식 ${s.news.length}가지</summary><ul class="pl-news">${s.news.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function piratesBlockView(s) {
  const me = s?.life;
  if (!me || (!me.rank && !me.letter && !list(me.treasure).length && !me.bounty && !me.ancestor && !list(me.log).length)) return '';
  const tally = [me.raids ? `턴 배 ${me.raids}` : '', me.share ? `받은 몫 ${me.share}닢` : '', me.taken ? `사략으로 잡은 배 ${me.taken}` : '', me.hunts ? `해적 사냥 ${me.hunts}번` : ''].filter(Boolean).join(' · ');
  return `<div class="block pi-block">
    <h3>해적의 삶 <small>${esc(me.rank ?? (me.letter ? '사략선' : ''))}</small></h3>
    ${me.crew ? `<p class="note"><b>${esc(me.crew)}</b>${me.captain ? ` · 선장 ${esc(me.captain)}` : ''}${me.ship?.name ? ` · 배 ${esc(me.ship.name)}` : ''}</p>` : ''}
    ${me.code ? `<p class="note">배의 규율: ${esc(me.code)}</p>` : ''}
    ${me.standing != null ? `<div class="wd-row kn-row"><span>배 위 신망</span>${bar(me.standing, 'kin')}</div>` : ''}
    ${tally || me.bounty ? `<p class="note">${tally}${tally && me.bounty ? ' · ' : ''}${me.bounty ? `<b class="down">현상금 ${me.bounty}</b>` : ''}</p>` : ''}
    ${me.letter ? `<p class="note"><b>사략 허가장</b> ${esc(`${me.letter.realm}의 이름으로 ${me.letter.foe}의 배를 턴다 · 잡은 배 ${me.letter.taken ?? 0} · ${me.letter.months}달 남음`)}</p>` : ''}
    ${list(me.treasure).length ? `<p class="note">보물 지도: ${me.treasure.map((t) => esc(`${t.isle}(${t.near} 앞바다) 조각 ${t.pieces} · ${t.word}`)).join(' / ')}</p>` : ''}
    ${me.ancestor ? `<p class="note">${esc(me.ancestor)}</p>` : ''}
    ${list(me.log).length ? `<details class="pl-more"><summary>바다에서 있었던 일 ${me.log.length}가지</summary><ul class="pl-news">${me.log.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

export function renderPiratesMap(game) { G = game; try { return piratesView(safe(() => piratesInfo(game))); } finally { G = null; } }
export function renderPiratesBlock(game) { G = game; try { return piratesBlockView(safe(() => piratesInfo(game))); } finally { G = null; } }
