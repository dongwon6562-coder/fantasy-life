// 19단계 '전쟁 뒤의 삶' 화면(src/aftermath). 읽기만 한다.
// renderAftermath: '사람들' 화면 카드 (끌려간 사람, 전쟁 과부와 고아, 돌아오지 못한 사람, 적국 출신 이웃, 끝난 전쟁, 불탄 고장)
// renderAftermathBlock: '나' 화면 덩이 (술, 악몽, 전우의 부탁, 청원, 기록)
// renderAftermathNow: 이번 달 화면 한 줄 (지금 있는 고장이 불탔거나 술에 깊이 기댈 때)
import { aftermathInfo } from '../aftermath/index.js';
import { J } from '../narrative/text.js';
import { L } from '../adventure/core.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const OUTCOME = { win: '이겼다', lose: '졌다', truce: '휴전' };
const names = (l, n = 4) => (l.length > n ? `${l.slice(0, n).map(esc).join(', ')} 외 ${l.length - n}명` : l.map(esc).join(', '));

export function renderAftermathNow(game) {
  const s = safe(() => aftermathInfo(game));
  if (!s) return '';
  const here = safe(() => L(game).place, 'ern');
  const ruin = s.ruins.find((r) => r.place === here && r.damage > 0);
  const lines = [];
  if (ruin) lines.push(`<b>불탄 고장</b> ${esc(ruin.placeName)}: ${esc(ruin.word)} (${esc(ruin.war)}). 할 일의 '불탄 마을 다시 세우기'로 거들 수 있다.`);
  if (s.drink >= 40) lines.push(`<b class="warn">술</b> ${esc(s.drinkWord)}. 할 일의 '술 끊기'로 끊어 볼 수 있다.`);
  if (!lines.length) return '';
  return `<section class="card am-now"><p class="note">${lines.join('<br>')}</p></section>`;
}

export function renderAftermath(game) {
  const s = safe(() => aftermathInfo(game));
  if (!s) return '';
  const any = s.atWar.length || s.drafted.length || s.widows.length || s.orphans.length || s.missing.length || s.foreign.length || s.wars.length || s.ruins.length;
  if (!any) return '';
  const sub = [];
  if (s.atWar.length) sub.push(`${s.atWar.map((w) => esc(w.name)).join(', ')} 중`);
  else if (s.wars.length) sub.push(`${esc(s.wars[s.wars.length - 1].name)} 뒤`);
  const row = (name, note, cls = '') => `<li class="${cls}"><div class="top"><strong>${esc(name)}</strong></div><span class="note">${note}</span></li>`;
  const sec = (title, items) => (items.length ? `<h4 class="ct-h">${title}</h4><ul class="ct-houses am-list">${items.join('')}</ul>` : '');
  const drafted = s.drafted.map((d) => row(d.name, `${esc(d.home)} 사람 · ${esc(d.war)}에 끌려감 · ${d.months ? `${d.months}달째` : '이번 달'}`));
  const widows = s.widows.map((w) => row(w.name, `${esc(w.war)}에서 남편 ${esc(J(w.husband, '을/를'))} 잃음 · ${w.y}년${w.remarried ? ' · 다시 혼인함' : ''}`));
  const orphans = s.orphans.map((o) => row(o.name, `${o.age}살 · 아버지 ${esc(J(o.father, '이/가'))} 전사함${o.adopted ? ' · <b class="ok">내가 거둔 아이</b>' : ''}`, o.adopted ? 'here' : ''));
  const missing = s.missing.map((x) => row(x.name, `${esc(x.war)}에서 돌아오지 않음 · ${x.y}년`, 'gone'));
  const foreign = s.foreign.map((f) => `<li><div class="wd-row kn-row"><span><strong>${esc(f.name)}</strong> · ${esc(f.from)}에서 옴 · ${esc(f.placeName)}</span>${bar(f.affection + 50, f.affection < -10 ? 'low' : 'kin')}</div></li>`);
  const wars = s.wars.slice().reverse().map((w) => {
    const bits = [`<b>${esc(OUTCOME[w.outcome] ?? w.outcome)}</b>`];
    if (w.back.length) bits.push(`돌아옴 ${names(w.back)}`);
    if (w.maimed.length) bits.push(`다쳐 돌아옴 ${names(w.maimed, 3)}`);
    if (w.dead.length) bits.push(`전사 ${names(w.dead)}`);
    if (w.missing.length) bits.push(`행방불명 ${names(w.missing)}`);
    return `<li><time>${w.y}년</time><span>${esc(w.name)} · ${bits.join(' · ')}</span></li>`;
  });
  const ruins = s.ruins.map((r) => `<li class="${r.damage > 0 ? '' : 'gone'}"><div class="wd-row kn-row"><span><strong>${esc(r.placeName)}</strong> · ${esc(r.word)}${r.helped ? ` · 내가 거든 일 ${r.helped}번` : ''}</span>${bar(100 - r.damage, r.damage >= 40 ? 'low' : 'kin')}</div><span class="note">${esc(r.war)}에 불탐</span></li>`);
  return `<section class="card aftermath-card">
    <h2>전쟁 뒤 <small>${sub.join('')}</small></h2>
    ${sec(`끌려간 사람 ${s.drafted.length}명`, drafted)}
    ${sec(`불탄 고장 ${s.ruins.length}곳`, ruins)}
    ${sec(`전쟁 과부 ${s.widows.length}명`, widows)}
    ${sec(`전쟁 고아 ${s.orphans.length}명`, orphans)}
    ${sec(`돌아오지 못한 사람 ${s.missing.length}명`, missing)}
    ${sec(`적국에서 온 이웃 ${s.foreign.length}명`, foreign)}
    ${wars.length ? `<details class="pl-more"><summary>끝난 전쟁 ${wars.length}번</summary><ul class="pl-news">${wars.join('')}</ul></details>` : ''}
  </section>`;
}

export function renderAftermathBlock(game) {
  const s = safe(() => aftermathInfo(game));
  if (!s) return '';
  const any = s.drink >= 15 || s.nights || s.favors || s.petitioned || s.log.length;
  if (!any) return '';
  const chips = [];
  if (s.nights) chips.push(['전쟁 꿈을 꾼 밤', `${s.nights}번`, true]);
  if (s.favors) chips.push(['들어준 전우의 부탁', `${s.favors}번`, false]);
  if (s.petitioned) chips.push(['상이군인 청원', '냈다', false]);
  return `<div class="block aftermath-block">
    <h3>전쟁 뒤</h3>
    ${s.drink >= 15 ? `<div class="wd-row kn-row am-drink"><span>${esc(s.drinkWord)}</span>${bar(s.drink, 'low')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>전쟁 뒤에 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
