// 12단계 갈래 화면: 원수와 복수(src/feud). 읽기만 한다.
import { feudInfo } from '../feud/index.js';
import { byId } from '../game.js';
import { PLACES } from '../places.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

/* ---------- 원한: '사람들' 화면 카드 ---------- */
export function renderFeud(game) {
  const f = safe(() => feudInfo(game));
  if (!f) return '';
  if (!f.foes.length && !f.nemeses.length && !f.avenged && !f.forgiven) return '';
  const SHOW = 4;
  const row = (x) => {
    const p = byId(game, x.id);
    const tags = [];
    if (x.inherited) tags.push([`${x.gen + 1}대째 이어진 원한`, 'dark']);
    if (x.formerFriend) tags.push(['옛 친구', '']);
    if (x.strikes) tags.push([`나를 친 적 ${x.strikes}번`, 'dark']);
    const where = PLACES[x.place]?.name;
    return `<li class="kn-kid fd-foe${x.heat >= 65 ? ' hot' : ''}">
      ${p ? `<button class="kn-face" data-person="${x.id}" aria-label="${esc(x.name)}의 기록">${portrait(game, p, { size: 48 })}</button>` : ''}
      <div class="kn-txt">
        <div class="top"><strong>${esc(x.name)}</strong><span class="note">${x.age}살${where ? ` · ${esc(where)}` : ''}</span></div>
        <span class="note fd-heat"><b>원한 ${x.heat}</b> · ${esc(x.heatWord)}</span>
        <div class="fd-bar">${bar(x.heat, 'low')}</div>
        ${x.why.length ? `<span class="note fd-why">${x.why.slice(-2).map((w) => esc(w)).join(' · ')}</span>` : ''}
        ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
      </div></li>`;
  };
  const top = f.foes.slice(0, SHOW).map(row).join('');
  const rest = f.foes.slice(SHOW);
  const sum = [];
  if (f.avenged) sum.push(`갚은 원한 ${f.avenged}`);
  if (f.forgiven) sum.push(`풀어 준 원한 ${f.forgiven}`);
  return `<section class="card feud-card">
    <h2>원한 <small>${f.foes.length ? `나를 미워하는 사람 ${f.foes.length}명` : '지금은 원수가 없다'}</small></h2>
    ${top ? `<ul class="kn-list">${top}</ul>` : ''}
    ${rest.length ? `<details class="pl-more"><summary>그 밖의 원수 ${rest.length}명</summary><ul class="kn-list">${rest.map(row).join('')}</ul></details>` : ''}
    ${f.houses.length ? `<p class="note">원수 집안: ${f.houses.map((h) => `${esc(h.name)} 집안 (${h.count}명${h.gens > 1 ? `, ${h.gens}대째` : ''})`).join(', ')}</p>` : ''}
    ${f.nemeses.length ? `<p class="note">선대의 원수: ${f.nemeses.map((n) => `${esc(n.name)}${n.place && PLACES[n.place] ? ` (${esc(PLACES[n.place].name)})` : ''}`).join(', ')}</p>` : ''}
    ${sum.length ? `<p class="note">${sum.join(' · ')}</p>` : ''}
    ${f.log.length ? `<details class="pl-more"><summary>원한에 얽힌 일 ${f.log.length}가지</summary><ul class="pl-news">${f.log.slice().reverse().map((n) => `<li><time>${n.y}년 ${n.m}월</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
