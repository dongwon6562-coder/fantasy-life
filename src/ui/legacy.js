// 일생 돌아보기와 가문 기록. 죽을 때(대 잇기 창, 삶이 끝난 화면) 한 삶의 연표를 보여 주고,
// 연대기의 '가문' 탭에서 대대로 이어진 사람들과 그들이 남긴 이름을 보여 준다. 규칙은 건드리지 않고 읽기만 한다.
import { L } from '../adventure/core.js';
import { me, playerAge, family } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

// 연대기에서 한 삶의 몫: 앞 세대가 죽은 해부터 이 사람이 죽은 해까지의 '내 일'(rel 100)
function lifeSpan(game, i) {
  const anc = L(game).ancestors;
  const rec = anc[i];
  const prev = anc[i - 1];
  const from = prev ? prev.died : (rec?.born ?? -1e9);
  const to = rec ? rec.died : 1e9;
  return { from, to, born: rec ? rec.born : game.date.year - playerAge(game) };
}

/** 한 삶의 연표 항목들 (같은 글 되풀이는 묶는다). i가 ancestors.length면 지금 사는 사람. */
export function lifeTimeline(game, i) {
  const { from, to, born } = lifeSpan(game, i);
  const rec0 = L(game).ancestors[i];
  const who = `${rec0 ? rec0.name : game.player.name}, `;
  const out = [];
  const seen = new Map();
  for (const c of game.chronicle ?? []) {
    if (((c.rel ?? 0) < 100 && !((c.rel ?? 0) >= 70 && c.text.startsWith(who))) || c.y < from || c.y > to) continue;
    // 앞 세대가 죽은 해에는 그 달 이후만 (같은 해에 일어난 앞 세대 일은 빼기 어렵지만 대를 잇는 줄부터 시작)
    const key = c.text.replace(/\d+/g, '#');
    if (seen.has(key)) { seen.get(key).n++; seen.get(key).last = c.y; continue; }
    const e = { y: c.y, m: c.m, age: c.y - born, text: c.text, n: 1 };
    seen.set(key, e);
    out.push(e);
  }
  // 앞 세대가 죽은 해에 그 사람 몫으로 쌓인 줄은 뒤 세대에서 뺀다 ('잇다' 줄 앞까지)
  if (i > 0) {
    const k = out.findIndex((e) => /대째 .*잇다/.test(e.text));
    if (k > 0) out.splice(0, k);
  }
  // 죽은 해에 뒤 세대 몫으로 쌓인 줄은 이 삶에서 뺀다 (죽음 줄까지)
  const rec = L(game).ancestors[i];
  if (rec) {
    const d = out.findIndex((e) => e.y === rec.died && e.text.startsWith(`${rec.name} `) && e.text.includes('세상을 떠나다'));
    if (d >= 0) out.splice(d + 1);
  }
  return out;
}

// 한 삶의 큰 고비: 연대기에서 그 사람 이름으로 시작하는 줄 (태어남·죽음·대 잇기는 뺀다)
const DEED = /오르다|되다|공인받다|정복|쓰러뜨|걸작|이름난|해내|세우|닿다|물려받다|이끌고|망명|추방|탈옥|들어가다|올리다|사다|서다/;
export function deedsOf(game, i, name) {
  let items = [];
  try { items = lifeTimeline(game, i); } catch (e) { console.error(e); }
  return items.filter((e) => (e.text.startsWith(`${name}, `) || e.text.startsWith(`${name}의 `)) && DEED.test(e.text) && !/태어나다|세상을 떠나다|대째/.test(e.text))
    .map((e) => ({ age: e.age, y: e.y, text: e.text.startsWith(`${name}, `) ? e.text.slice(name.length + 2) : e.text }));
}

const tlItem = (e) => `<li><span class="tl-age">${e.age >= 0 ? `${e.age}살` : ''}</span><span class="tl-text">${esc(e.text)}${e.n > 1 ? ` <em>외 ${e.n - 1}번</em>` : ''}</span><time>${e.y}년</time></li>`;

function timelineList(items, max = 40) {
  if (!items.length) return '<p class="note">남은 기록이 많지 않다. 오래된 일은 잊혔다.</p>';
  if (items.length <= max) return `<ol class="tl">${items.map(tlItem).join('')}</ol>`;
  // 앞 몇 줄과 뒤쪽을 보여 주고 가운데는 접는다
  const head = items.slice(0, 8), mid = items.slice(8, items.length - (max - 8)), tail = items.slice(items.length - (max - 8));
  return `<ol class="tl">${head.map(tlItem).join('')}</ol>
    <details class="tl-more"><summary>그 사이의 일 ${mid.length}가지</summary><ol class="tl">${mid.map(tlItem).join('')}</ol></details>
    <ol class="tl">${tail.map(tlItem).join('')}</ol>`;
}

function kidsOf(game, p) {
  return (p?.childIds ?? []).map((id) => byId(game, id)).filter(Boolean);
}

// 한 사람이 남긴 것: 배우자, 자식, 요약
function legacyFacts(game, rec, person) {
  const sp = person?.spouseId != null ? byId(game, person.spouseId) : null;
  const kids = kidsOf(game, person);
  const facts = [];
  if (rec?.summary) for (const s of rec.summary.split(', ')) if (s) facts.push(s);
  if (sp) facts.push(`배우자 ${sp.name}`);
  if (kids.length) facts.push(`자식 ${kids.length}명${kids.some((k) => !k.alive) ? ` (먼저 보낸 자식 ${kids.filter((k) => !k.alive).length})` : ''}`);
  return facts;
}

/** 한 삶 돌아보기. 대 잇기 창 안(compact)과 삶이 끝난 화면에서 쓴다. */
export function renderLifeReview(game, rec, { compact = false } = {}) {
  if (!rec) return '';
  const anc = L(game).ancestors;
  let i = anc.findIndex((a) => a === rec || (a.id === rec.id && a.died === rec.died));
  if (i < 0) i = anc.length - 1;
  const person = byId(game, rec.id);
  let items = [];
  try { items = lifeTimeline(game, i); } catch (e) { console.error(e); }
  const facts = legacyFacts(game, rec, person);
  const head = `<div class="lr-head">
      ${person ? portrait(game, person, { size: compact ? 56 : 84, scars: i === anc.length - 1 ? game.player.scars ?? [] : [] }) : ''}
      <div><strong>${esc(rec.name)} ${esc(rec.lastName ?? '')}</strong>
        <span class="note">${rec.born}년 ~ ${rec.died}년 · ${rec.age}살${rec.cause ? ` · ${esc(rec.cause)}` : ''}</span>
        ${anc.length > 1 || L(game).gen > 1 ? `<span class="note">${i + 1}대째</span>` : ''}</div>
    </div>`;
  const chips = facts.length ? `<div class="lr-chips">${facts.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>` : '';
  if (compact) {
    return `<details class="lr compact"><summary>지나온 삶 돌아보기</summary>${head}${chips}${timelineList(items, 24)}</details>`;
  }
  return `<div class="lr">${head}${chips}<h3>한 삶의 연표</h3>${timelineList(items)}</div>`;
}

/* ---------- 가계도 ---------- */

function treeRow(game, { name, first, last, years, cause, person, summary, current }, nextId, idx, house) {
  const shown = last && last !== house ? `${first} ${last}` : first;
  const deeds = deedsOf(game, idx, first).slice(-4);
  const sp = person?.spouseId != null ? byId(game, person.spouseId) : null;
  const kids = kidsOf(game, person);
  return `<li class="ft-gen${current ? ' now' : ''}">
    <div class="ft-couple">
      <button class="ft-who" data-legacy="${idx}">
        ${person ? portrait(game, person, { size: 48 }) : ''}
        <span><span class="ft-n">${idx + 1}대</span><strong>${esc(shown ?? name)}</strong><span class="note">${esc(years)}${cause ? ` · ${esc(cause)}` : ''}</span></span>
      </button>
      ${sp ? `<div class="ft-sp" data-ws-person="${sp.id}" role="button" tabindex="0">${portrait(game, sp, { size: 36 })}<span class="note">${esc(sp.name)}${sp.alive ? '' : ' †'}</span></div>` : ''}
    </div>
    ${summary ? `<p class="ft-sum">${esc(summary)}</p>` : ''}
    ${deeds.length ? `<ul class="ft-deeds">${deeds.map((d) => `<li><span>${d.age}살</span>${esc(d.text)}</li>`).join('')}</ul>` : ''}
    ${kids.length ? `<div class="ft-kids">${kids.map((k) => `<span class="ft-kid${k.id === nextId ? ' heir' : ''}${k.alive ? '' : ' dead'}" ${k.isPlayer ? '' : `data-ws-person="${k.id}" role="button" tabindex="0"`}>${esc(k.name)}${k.alive ? '' : ' †'}</span>`).join('')}</div>` : ''}
  </li>`;
}

/** 연대기 '가문' 탭 */
export function renderLegacy(game, ui = {}) {
  const life = L(game);
  const anc = life.ancestors;
  const meP = me(game);
  const alive = !game.over && game.player.alive !== false;
  const gens = anc.map((a) => ({ name: `${a.name} ${a.lastName ?? ''}`.trim(), first: a.name, last: a.lastName, years: `${a.born}~${a.died}년, ${a.age}살`, cause: a.cause, person: byId(game, a.id), summary: a.summary }));
  if (alive) gens.push({ name: `${game.player.name} ${game.player.lastName}`, first: game.player.name, last: game.player.lastName, years: `${game.date.year - playerAge(game)}년~ 살아 있음, ${playerAge(game)}살`, person: meP, current: true });
  const ids = [...anc.map((a) => a.id), alive ? meP.id : null];
  const first = anc[0]?.born ?? game.date.year - playerAge(game);
  const span = game.date.year - first;
  // 대대로 쌓인 이름: 각 대가 남긴 요약을 모아 같은 것끼리 센다
  const names = new Map();
  anc.forEach((a, k) => (a.summary ?? '').split(', ').filter(Boolean).forEach((s) => {
    const key = s.replace(/\d+/g, '').trim();
    const v = names.get(key) ?? { text: s, gens: [] };
    v.gens.push(k + 1); v.text = s; names.set(key, v);
  }));
  const longest = anc.reduce((m, a) => (a.age > (m?.age ?? -1) ? a : m), null);
  const sel = ui.legacySel != null && ui.legacySel < gens.length ? ui.legacySel : null;
  let detail = '';
  if (sel != null) {
    const items = (() => { try { return lifeTimeline(game, sel); } catch (e) { console.error(e); return []; } })();
    detail = `<section class="card lr-detail"><h2>${esc(gens[sel].name)} <small>${sel + 1}대 · ${esc(gens[sel].years)}</small></h2>
      ${(() => { const f = legacyFacts(game, anc[sel], gens[sel].person); return f.length ? `<div class="lr-chips">${f.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''; })()}
      ${timelineList(items)}
      <div class="actions-row"><button class="ghost" data-legacy="close">접기</button></div></section>`;
  }
  return `<section class="card legacy">
    <h2>${esc(game.player.lastName)} 가문 <small>${esc(family(game).name)}</small></h2>
    <div class="lg-stats">
      <div><b>${gens.length}</b><span>대</span></div>
      <div><b>${span}</b><span>년</span></div>
      ${longest ? `<div><b>${longest.age}</b><span>가장 오래 산 ${esc(longest.name)}</span></div>` : ''}
    </div>
    ${names.size ? `<div class="lg-names"><span class="lbl">대대로 쌓인 이름</span>${[...names.values()].map((v) => `<span class="chip">${esc(v.text)}<em>${v.gens.length > 3 ? `${v.gens[0]}대부터 ${v.gens.length}번` : v.gens.map((n) => `${n}대`).join('·')}</em></span>`).join('')}</div>` : `<p class="note">${anc.length ? '아직 집 밖까지 알려진 이름은 없다. 이름은 한 대에 다 쌓이지 않는다.' : '아직 대를 이은 적이 없다. 이 삶이 끝나면 여기에 이름이 남는다.'}</p>`}
    ${(() => { const house = game.player.lastName; const rows = gens.map((g, k) => treeRow(game, g, ids[k + 1], k, house)); const cut = rows.length > 5 && !ui.legacyAll ? rows.length - 4 : 0;
      return `${cut ? `<button class="ghost ft-older" data-legacy-all>앞선 ${cut}대 펼치기 <small>${esc(gens[0].first)}부터</small></button>` : ''}<ol class="ft${cut ? ' cut' : ''}">${rows.slice(cut).join('')}</ol>`; })()}
    <p class="note">이름을 누르면 그 사람의 연표를 볼 수 있다.</p>
  </section>${detail}`;
}
