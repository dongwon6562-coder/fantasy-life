// 인물 수첩: 초상이 있는 명단과, 누르면 펼쳐지는 자세한 기록.
import { knownPeople, byId, ageYears, fullName } from '../game.js';
import { jobName } from '../actions.js';
import { traitName } from '../data.js';
import { portrait, looksOf } from '../art/portrait.js';
import { esc, clamp } from './util.js';

const FILTERS = [['all', '모두'], ['family', '가족'], ['close', '가까운 사이'], ['gone', '떠난 사람']];

function isFamily(game, p) { return game.player.familyIds.includes(p.id); }

export function personMeta(game, p) {
  const status = !p.alive ? '세상을 떠남' : p.away ? '마을을 떠남' : `${ageYears(p)}살 · ${jobName(p)}`;
  return `${isFamily(game, p) ? '가족 · ' : ''}${status}`;
}

function relWord(a) {
  if (a >= 80) return '깊은 정';
  if (a >= 60) return '아주 가까움';
  if (a >= 35) return '가까움';
  if (a >= 15) return '아는 사이';
  if (a >= 0) return '서먹함';
  if (a >= -30) return '껄끄러움';
  return '적의';
}

function affBar(a) {
  const pct = clamp((a + 100) / 2, 0, 100);
  return `<span class="affbar ${a < 0 ? 'neg' : ''}" title="호감 ${a}"><i style="left:50%;width:${Math.abs(pct - 50)}%;${a < 0 ? `left:${pct}%` : ''}"></i></span>`;
}

export function renderPeople(game, ui) {
  const f = ui.peopleFilter ?? 'all';
  let list = knownPeople(game).filter((p) => !p.isPlayer);
  const counts = {
    all: list.length,
    family: list.filter((p) => isFamily(game, p)).length,
    close: list.filter((p) => p.alive && !p.away && p.affection >= 30).length,
    gone: list.filter((p) => !p.alive || p.away).length,
  };
  if (f === 'family') list = list.filter((p) => isFamily(game, p));
  if (f === 'close') list = list.filter((p) => p.alive && !p.away && p.affection >= 30);
  if (f === 'gone') list = list.filter((p) => !p.alive || p.away);
  list.sort((a, b) => ((b.alive && !b.away) - (a.alive && !a.away)) || (isFamily(game, b) - isFamily(game, a)) || b.affection - a.affection);
  const sel = ui.person && byId(game, ui.person);
  return `
  <section class="card notebook">
    <h2>인물 수첩 <small>만난 사람 ${counts.all}명</small></h2>
    ${sel ? renderDetail(game, sel) : ''}
    <div class="seg filters" role="group" aria-label="보기">
      ${FILTERS.map(([id, name]) => `<button data-pfilter="${id}" aria-pressed="${f === id}">${name} <small>${counts[id]}</small></button>`).join('')}
    </div>
    ${list.length ? `<div class="people">
      ${list.map((p) => `
        <button class="person ${p.alive && !p.away ? '' : 'dead'}" data-person="${p.id}" aria-pressed="${ui.person === p.id}">
          ${portrait(game, p, { size: 52 })}
          <span class="txt">
            <span class="nm">${esc(fullName(p))}</span>
            <span class="meta">${esc(personMeta(game, p))}</span>
            <span class="rel">${affBar(p.affection)}<span class="aff ${p.affection >= 20 ? 'pos' : p.affection < 0 ? 'neg' : ''}">${relWord(p.affection)}</span></span>
          </span>
        </button>`).join('')}
    </div>` : '<p class="note">아직 이 칸에 적힌 사람이 없다.</p>'}
    <p class="note">만난 사람은 여기에 적히고, 그 사람의 삶이 바뀌면 기록도 함께 바뀐다.</p>
  </section>`;
}

function renderDetail(game, p) {
  const spouse = byId(game, p.spouseId);
  const kids = (p.childIds ?? []).map((id) => byId(game, id)).filter(Boolean);
  const parents = [byId(game, p.fatherId), byId(game, p.motherId)].filter(Boolean);
  const link = (q) => q.known || q.isPlayer ? `<button class="linkish" data-person="${q.id}">${esc(q.isPlayer ? q.name + '(나)' : q.name)}</button>` : esc(q.name);
  return `
    <article class="detail" aria-label="${esc(fullName(p))}의 기록">
      <button class="close" data-person-close aria-label="닫기">×</button>
      <div class="detail-head">
        ${portrait(game, p, { size: 112 })}
        <div>
          <h3>${esc(fullName(p))}</h3>
          <p class="note">${esc(personMeta(game, p))}</p>
          <p class="note">${esc(looksOf(game, p))}</p>
          <div class="chips">${p.traits.map((t) => `<span class="chip">${esc(traitName(t))}</span>`).join('')}</div>
          <div class="rel big">${affBar(p.affection)}<span class="aff ${p.affection >= 20 ? 'pos' : p.affection < 0 ? 'neg' : ''}">${relWord(p.affection)} · 호감 ${p.affection}</span></div>
        </div>
      </div>
      ${(spouse || kids.length || parents.length) ? `<p class="kin">
        ${parents.length ? `<span>부모 ${parents.map(link).join(', ')}</span>` : ''}
        ${spouse ? `<span>배우자 ${link(spouse)}</span>` : ''}
        ${kids.length ? `<span>자식 ${kids.map(link).join(', ')}</span>` : ''}
      </p>` : ''}
      ${p.history.length
        ? `<ol class="timeline">${p.history.slice(-12).reverse().map((h) => `<li><time>${h.y}년 ${h.m}월</time><span>${esc(h.text)}</span></li>`).join('')}</ol>`
        : '<p class="note">아직 아는 이야기가 없다.</p>'}
    </article>`;
}

export function bindPeople(game, ui, rerender) {
  document.querySelectorAll('[data-pfilter]').forEach((b) => b.onclick = () => { ui.peopleFilter = b.dataset.pfilter; rerender(); });
  document.querySelectorAll('[data-person]').forEach((b) => b.onclick = () => {
    const id = +b.dataset.person;
    if (id === game.player.id) return;
    ui.person = ui.person === id ? null : id;
    rerender();
    if (ui.person) document.querySelector('.detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  const c = document.querySelector('[data-person-close]');
  if (c) c.onclick = () => { ui.person = null; rerender(); };
}
