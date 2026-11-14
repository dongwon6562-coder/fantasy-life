// 세계 연대기 화면: 나 없이도 굴러가는 레오니아 (src/history).
// 세력의 힘, 가문, 상단, 이름난 사람, 곳곳의 변화, 왕국의 큰일 연표.
import { worldChronicle, notablesOf, housesOf, companiesOf, powerOf, placeChanges } from '../history/index.js';
import { houseName, SEAT_NAME } from '../history/nobles.js';
import { notableTitle } from '../history/people.js';
import { POWERS, COMPANY_KIND, TEMPER, KIND } from '../history/state.js';
import { esc } from './util.js';
import { renderCrisisPast } from './crisis.js';
import { renderEra } from './era.js';

const PLACE_NAME = { ern: '에른', harfen: '하르펜', verden: '베르덴', leocast: '왕도' };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const safe = (fn, d) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };

// 연표 줄의 종류: 첫 낱말로 가른다 (색만 다르게)
function kindOf(text) {
  if (/전쟁|반란|내전|침공|전투|함락/.test(text)) return 'war';
  if (/죽음|사망|세상을 떠|숨짐|전사|처형/.test(text)) return 'death';
  if (/발명|세웠다|문을 열/.test(text)) return 'invent';
  if (/교체|즉위|이음|올랐|서임/.test(text)) return 'rise';
  if (/몰락|파산|무너|문을 닫/.test(text)) return 'fall';
  return '';
}

export function renderWorld(game, ui) {
  const houses = safe(() => [...housesOf(game)].sort((a, b) => b.power - a.power), []);
  const companies = safe(() => [...companiesOf(game)].sort((a, b) => b.fortune - a.fortune), []);
  const notables = safe(() => notablesOf(game), []);
  const log = safe(() => worldChronicle(game), []);
  const powers = Object.keys(POWERS).map((k) => [k, safe(() => powerOf(game, k), 50)]).sort((a, b) => b[1] - a[1]);
  const changes = Object.keys(PLACE_NAME).map((p) => [p, safe(() => placeChanges(game, p), [])]).filter(([, l]) => l.length);
  const sec = ui.worldSec ?? 'chron';
  const tabs = [['chron', '큰일'], ['era', '시대'], ['powers', '세력'], ['houses', '가문·상단'], ['people', '이름난 사람'], ['places', '곳곳']];

  let body = '';
  if (sec === 'era') {
    body = safe(() => renderEra(game), '');
  } else if (sec === 'powers') {
    body = `<div class="wd-powers">${powers.map(([k, v]) => `<div class="wd-row"><span>${esc(POWERS[k])}</span>${bar(v)}<span class="v">${v}</span></div>`).join('')}</div>
      <p class="note">세력의 힘은 해마다 바뀐다. 귀족·기사·성광교·길드·마도사·상인이 서로 밀고 당긴다.</p>`;
  } else if (sec === 'houses') {
    body = `<h3 class="sub">가문</h3>
      <div class="wd-cards">${houses.map((h) => `<div class="wd-card">
        <div class="top"><strong>${esc(houseName(h))}</strong><span>${esc(SEAT_NAME[h.seat] ?? '')}</span></div>
        <p class="note">가주 ${esc(h.head)}${h.age ? ` (${h.age}세)` : ''} · ${esc(TEMPER[h.temper] ?? '')}${h.gen ? ` · ${h.gen}대` : ''}</p>
        <div class="wd-row"><span>세력</span>${bar(h.power)}<span class="v">${Math.round(h.power)}</span></div>
      </div>`).join('') || '<p class="note">살아남은 가문이 없다.</p>'}</div>
      <h3 class="sub">상단</h3>
      <div class="wd-cards">${companies.map((c) => `<div class="wd-card">
        <div class="top"><strong>${esc(c.name)}</strong><span>${esc(COMPANY_KIND[c.kind] ?? '')}</span></div>
        <div class="wd-row"><span>${c.fortune > 70 ? '번창' : c.fortune < 20 ? '휘청' : '재산'}</span>${bar(c.fortune, c.fortune < 20 ? 'low' : c.fortune > 70 ? 'high' : '')}<span class="v">${Math.round(c.fortune)}</span></div>
        ${c.founded ? `<p class="note">용사력 ${c.founded}년 세움</p>` : ''}
      </div>`).join('') || '<p class="note">상단이 없다.</p>'}</div>`;
  } else if (sec === 'people') {
    body = notables.length ? `<ul class="wd-people">${notables.map((n) => `<li>
        <span class="k">${esc(KIND[n.kind] ?? '')}</span>
        <strong>${n.epithet ? `'${esc(n.epithet)}' ` : ''}${esc(n.name)} ${esc(n.lastName ?? '')}</strong>
        <span class="note">${esc(notableTitle(n))} · ${n.age}세${n.place ? ` · ${esc(PLACE_NAME[n.place] ?? '')}` : ''}${n.pid ? ' · 아는 사람' : ''}</span>
        ${bar(n.fame, 'fame')}
      </li>`).join('')}</ul>` : '<p class="note">아직 이름을 떨친 사람이 없다.</p>';
  } else if (sec === 'places') {
    body = changes.length ? changes.map(([p, l]) => `<div class="wd-place"><h4>${esc(PLACE_NAME[p])}</h4><ul>${l.slice(-6).reverse().map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')
      : '<p class="note">아직 눈에 띄게 달라진 곳이 없다.</p>';
  } else {
    // 큰일 연표: 해마다 묶어서, 최근 것부터
    const byYear = new Map();
    for (const e of [...log].reverse().slice(0, 200)) {
      if (!byYear.has(e.y)) byYear.set(e.y, []);
      byYear.get(e.y).push(e);
    }
    body = renderCrisisPast(game) + (log.length ? `<ol class="wd-years">${[...byYear].map(([y, es]) => `<li><h4>용사력 ${y}년</h4><ul>${es.map((e) => `<li class="${kindOf(e.text)}"><time>${e.m}월</time><span>${esc(e.text)}</span></li>`).join('')}</ul></li>`).join('')}</ol>`
      : '<p class="note">아직 왕국에 큰일이 없었다.</p>');
  }

  return `<section class="card worldview">
    <h2>레오니아 연대기 <small>내가 보지 않아도 세상은 움직인다</small></h2>
    <div class="seg wd-tabs" role="tablist">${tabs.map(([id, name]) => `<button role="tab" data-wsec="${id}" aria-selected="${sec === id}" aria-pressed="${sec === id}">${name}</button>`).join('')}</div>
    ${body}
  </section>`;
}

export function bindWorld(game, ui, rerender) {
  document.querySelectorAll('[data-wsec]').forEach((b) => b.onclick = () => { ui.worldSec = b.dataset.wsec; rerender(); });
}
