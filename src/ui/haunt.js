// 22단계 '망자와 저주' 화면(src/haunt). 읽기만 한다.
// renderHauntNow: 이번 달 화면 한 줄 (망령이 이 고장에 있거나, 집안의 저주가 있거나, 들끓는 자리가 있을 때)
// renderHaunt: 지도 화면 카드 (이 고장의 흉흉함과 영매, 겪어 본 흉한 자리, 망령, 기록)
// renderHauntBlock: '나' 화면 덩이 (집안의 저주, 지닌 저주받은 물건, 영매 솜씨, 겪은 일)
import { hauntInfo, hauntLine } from '../haunt/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderHauntNow(game) {
  const line = safe(() => hauntLine(game), null);
  if (!line) return '';
  const [head, ...rest] = line.split(':');
  const bad = /^망령/.test(head);
  return `<section class="card haunt-now"><p class="note"><b${bad ? ' class="warn"' : ''}>${esc(head)}</b> ${esc(rest.join(':').trim())}</p></section>`;
}

export function renderHaunt(game) {
  const s = safe(() => hauntInfo(game));
  if (!s) return '';
  const hereIds = new Set(s.here.map((x) => x.id));
  const list = s.known.slice().sort((a, b) => (b.wraith - a.wraith) || (hereIds.has(b.id) - hereIds.has(a.id)) || (b.restless - a.restless));
  if (!list.length && !s.wraith && !s.dread && !s.log.length) return '';
  const row = (x) => {
    const bits = [esc(x.kind)];
    if (x.real === false) bits.push('헛소문이었다');
    else if (x.feel) bits.push(`기운이 ${esc(x.feel)}`);
    if (x.restless) bits.push('<b class="warn">들끓는다</b>');
    if (x.wraith) bits.push(`<b class="warn">망령이 되었다</b>`);
    const who = x.known >= 2 ? `<span class="note">${esc(x.dead)} · ${esc(x.how)}${x.grief ? ` · ${esc(x.grief)}` : ''}${x.ask ? ` · 바라는 것: ${esc(x.ask)}` : ''}</span>` : '';
    return `<li class="${x.wraith ? 'bad' : ''}"><div class="top"><strong>${esc(x.name)}</strong><span class="note">${esc(x.place)}${hereIds.has(x.id) ? ' · 여기' : ''}</span></div>
      <span class="note">${bits.join(' · ')}</span>${who}</li>`;
  };
  const top = list.slice(0, 5), rest = list.slice(5);
  const here = [s.dread ? esc(s.dread) : '', s.medium ? `영매 ${esc(s.medium)}` : '', s.frauds ? `사기꾼 무당 ${s.frauds}명` : '', s.here.length && !list.some((x) => hereIds.has(x.id)) ? `흉하다는 자리 ${s.here.length}곳` : ''].filter(Boolean);
  return `<section class="card haunt-card">
    <h2>망자와 흉한 자리 <small>${list.length ? `겪어 본 자리 ${list.length}곳` : '이 고장'}</small></h2>
    ${here.length ? `<p class="note">이 고장: ${here.join(' · ')}</p>` : ''}
    ${s.wraith ? `<p class="note"><b class="warn">망령 ${esc(s.wraith.name)}</b> · ${esc(s.wraith.place)}${s.wraith.hurt ? ` · ${s.wraith.hurt}명이 죽었다` : ''}</p>` : ''}
    ${top.length ? `<ul class="ct-houses ht-list">${top.map(row).join('')}</ul>` : ''}
    ${rest.length ? `<details class="pl-more"><summary>다른 자리 ${rest.length}곳</summary><ul class="ct-houses ht-list">${rest.map(row).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>망자에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderHauntBlock(game) {
  const s = safe(() => hauntInfo(game));
  const M = s?.me;
  if (!M) return '';
  const chips = [];
  if (M.visits) chips.push(['흉한 자리에 감', `${M.visits}번`]);
  if (M.laid) chips.push(['달래 보낸 넋', `${M.laid}`, 'up']);
  if (M.rites) chips.push(['해 준 굿', `${M.rites}번`]);
  if (M.exposed) chips.push(['밝혀낸 헛소문', `${M.exposed}번`]);
  if (M.robbed) chips.push(['무덤을 턺', `${M.robbed}번`, 'down']);
  if (M.fakes) chips.push(['가짜 굿', `${M.fakes}번`, 'down']);
  if (M.faced) chips.push(['망령과 마주함', `${M.faced}번`]);
  if (M.wraiths) chips.push(['쓰러뜨린 망령', `${M.wraiths}`, 'up']);
  if (M.fled) chips.push(['달아남', `${M.fled}번`, 'down']);
  if (M.lifted) chips.push(['푼 저주', `${M.lifted}번`, 'up']);
  const C = s.curse;
  if (!chips.length && !C && !s.items.length && M.medium < 10) return '';
  return `<div class="block haunt-block">
    <h3>망자와 저주</h3>
    ${C ? `<div class="sc-acad"><div class="top"><strong>${esc(C.name)}</strong><span class="note">${C.gens > 1 ? `${C.gens}대째` : '내 대에 내렸다'}</span></div>
      <span class="note">${C.known ? `${esc(C.why)}${C.power ? ` · <b class="warn">${esc(C.power)}</b>` : ''}` : '까닭을 아직 모른다'}</span></div>` : ''}
    ${s.items.length ? `<h4 class="ct-h">지닌 저주받은 물건 ${s.items.length}개</h4><ul class="am-rows">${s.items.map((it) => `<li><strong>${esc(it.name)}</strong>${it.desc ? ` <span class="note">${esc(it.desc)}</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${M.medium >= 10 ? `<div class="wd-row kn-row"><span>영매 솜씨 · ${esc(M.mediumWord)}</span>${bar(M.medium, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
  </div>`;
}
