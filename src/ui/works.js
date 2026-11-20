// 24단계 '세상을 바꾸는 큰 공사' 화면(src/works). 읽기만 한다.
// renderWorksNow: 이번 달 화면 한 줄 (감독일 때, 이 고장에서 공사 중일 때)
// renderWorks: 지도 화면 카드 (아홉 공사: 단계와 진척, 돈줄, 부역·품삯, 사고, 머릿돌, 내가 낀 몫, 기록)
// renderWorksBlock: '나' 화면 덩이 (댄 돈, 일한 달, 감독, 부역, 머릿돌, 빼돌림)
import { worksInfo, worksLine } from '../works/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const ORDER = { building: 0, stalled: 1, done: 2, idle: 3 };

export function renderWorksNow(game) {
  const line = safe(() => worksLine(game), null);
  if (!line) return '';
  const bad = /멈춤|손을 놓음/.test(line);
  const [head, ...rest] = line.split(':');
  return `<section class="card works-now"><p class="note"><b${bad ? ' class="warn"' : ''}>${esc(head)}</b> ${esc(rest.join(':').trim())}</p></section>`;
}

export function renderWorks(game) {
  const s = safe(() => worksInfo(game));
  if (!s || !s.works.length) return '';
  const row = (w) => {
    const started = w.stage !== 'idle' || w.pct > 0;
    const bits = w.mine ? [] : [esc(w.patron)];
    if (w.labor) bits.push(esc(w.labor));
    if (w.funds) bits.push(/바닥|없다/.test(w.funds) ? `<b class="warn">${esc(w.funds)}</b>` : esc(w.funds));
    if (w.years) bits.push(`${w.years}해째`);
    if (w.strike) bits.push('<b class="warn">석공들이 손을 놓았다</b>');
    const hurt = [w.falls ? `무너짐 ${w.falls}번` : '', w.deaths ? `죽은 일꾼 ${w.deaths}명` : '', w.ruins ? `짓다 버린 일 ${w.ruins}번` : ''].filter(Boolean);
    const me = [w.mine ? '내가 일으킨 공사' : '', w.overseer ? '내가 감독' : '', w.myGold ? `내가 댄 돈 은화 ${w.myGold}닢` : '', w.myMonths ? `내가 일한 ${w.myMonths}달` : ''].filter(Boolean);
    return `<li class="${w.mine || w.overseer ? 'here' : w.stage === 'stalled' ? 'bad' : w.stage === 'done' ? 'gone' : ''}"><div class="top"><strong>${esc(w.name)}</strong><span class="note">${esc(w.placeName)}${w.here ? ' · 여기' : ''}</span></div>
      ${started && w.stage !== 'done' ? `<div class="wd-row kn-row"><span>${w.stage === 'idle' ? `짓다 버린 자리 · ${w.pct}%에서 멈췄다` : `${esc(w.stageName)} ${w.pct}% · ${esc(w.word)}`}</span>${bar(w.pct, w.stage === 'building' ? 'kin' : 'low')}</div>` : `<span class="note">${w.stage === 'done' ? `<b>완공</b>${w.carved ? ` · 머릿돌에 ${esc(w.carved)}` : ''}` : '아직 손대지 않았다'}</span>`}
      ${started && w.stage !== 'done' && w.stage !== 'idle' && bits.length ? `<span class="note">${bits.join(' · ')}</span>` : ''}
      ${hurt.length ? `<span class="note">${hurt.join(' · ')}</span>` : ''}${me.length ? `<span class="note">${me.join(' · ')}</span>` : ''}</li>`;
  };
  const sorted = s.works.slice().sort((a, b) => ((b.mine || b.overseer) - (a.mine || a.overseer)) || (b.here - a.here) || (ORDER[a.stage] - ORDER[b.stage]) || (b.pct - a.pct));
  const top = sorted.slice(0, 5), rest = sorted.slice(5);
  const building = s.works.filter((w) => w.stage === 'building').length;
  return `<section class="card works-card">
    <h2>큰 공사 <small>짓는 중 ${building} · 완공 ${s.done.length}</small></h2>
    <ul class="ct-houses wk-list">${top.map(row).join('')}</ul>
    ${rest.length ? `<details class="pl-more"><summary>다른 공사 ${rest.length}곳</summary><ul class="ct-houses wk-list">${rest.map(row).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>공사에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderWorksBlock(game) {
  const s = safe(() => worksInfo(game));
  const M = s?.me;
  if (!M) return '';
  const chips = [];
  if (M.gold) chips.push(['공사에 댄 돈', `은화 ${M.gold}닢`]);
  if (M.months) chips.push(['공사장에서 일한 달', `${M.months}`]);
  if (M.opened) chips.push(['일으킨 공사', `${M.opened}곳`, 'up']);
  if (M.carved) chips.push(['머릿돌에 새긴 이름', `${M.carved}번`, 'up']);
  if (M.drafted) chips.push(['부역에 끌려감', `${M.drafted}번`]);
  if (M.dodged) chips.push(['부역을 피함', `${M.dodged}번`, 'down']);
  if (M.skimmed) chips.push(['공사 돈을 빼돌림', `${M.skimmed}번`, 'down']);
  if (!chips.length && !M.overseer) return '';
  return `<div class="block works-block">
    <h3>큰 공사</h3>
    ${M.overseer ? `<p class="note">지금 <b>${esc(M.overseer)}</b> 공사를 감독한다</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
  </div>`;
}
