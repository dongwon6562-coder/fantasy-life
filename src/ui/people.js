// 인물 수첩: 초상이 있는 명단과, 누르면 펼쳐지는 자세한 기록.
import { knownPeople, byId, ageYears, fullName } from '../game.js';
import { jobName } from '../actions.js';
import { traitName } from '../data.js';
import { portrait, looksOf } from '../art/portrait.js';
import { relationLabel, memoriesOf } from '../relations.js';
import { J } from '../narrative/text.js';
import { esc, clamp } from './util.js';

const FILTERS = [['all', '모두'], ['family', '가족'], ['close', '가까운 사이'], ['foe', '껄끄러운 사이'], ['gone', '떠난 사람']];
const SORTS = [['close', '가까운 순'], ['recent', '최근 만난 순'], ['name', '이름 순'], ['age', '나이 순']];
const isHere = (p) => p.alive && !p.away;
const FILTER_FN = {
  all: () => true,
  family: (p, game) => isFamily(game, p),
  close: (p) => isHere(p) && p.affection >= 30,
  foe: (p) => isHere(p) && (p.affection < 0 || (p.rivalry ?? 0) >= 40),
  gone: (p) => !isHere(p),
};
// 찾기 글: 이름, 성, 하는 일, 관계 말
const searchText = (game, p) => `${fullName(p)} ${p.name} ${personMeta(game, p)} ${relationLabel(game, p)}`.toLowerCase();
const matchQ = (text, q) => q.split(/\s+/).filter(Boolean).every((w) => text.includes(w));

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
  const f = FILTER_FN[ui.peopleFilter] ? ui.peopleFilter : 'all';
  const sort = SORTS.some(([id]) => id === ui.peopleSort) ? ui.peopleSort : 'close';
  const q = (ui.peopleQ ?? '').trim().toLowerCase();
  let list = knownPeople(game).filter((p) => !p.isPlayer);
  const counts = Object.fromEntries(Object.entries(FILTER_FN).map(([id, fn]) => [id, list.filter((p) => fn(p, game)).length]));
  list = list.filter((p) => FILTER_FN[f](p, game));
  const seen = (p) => p.lastSeen ?? -1;
  const SORT_FN = {
    close: (a, b) => (isHere(b) - isHere(a)) || (isFamily(game, b) - isFamily(game, a)) || b.affection - a.affection,
    recent: (a, b) => (isHere(b) - isHere(a)) || seen(b) - seen(a) || b.affection - a.affection,
    name: (a, b) => fullName(a).localeCompare(fullName(b), 'ko'),
    age: (a, b) => (isHere(b) - isHere(a)) || (b.ageMonths ?? 0) - (a.ageMonths ?? 0),
  };
  list.sort(SORT_FN[sort]);
  const shown = list.filter((p) => !q || matchQ(searchText(game, p), q)).length;
  const sel = ui.person && byId(game, ui.person);
  // 오래 산 삶에서는 떠난 사람이 수십 명이라, '모두'·'가족'에서는 떠난 사람을 접어 아래에 둔다 (이름 순은 그대로).
  const fold = (f === 'all' || f === 'family') && sort !== 'name';
  const goneAll = fold ? list.filter((p) => !isHere(p)) : [];
  const useFold = goneAll.length > 3 && goneAll.length < list.length;
  const here = useFold ? list.filter(isHere) : list;
  const gone = useFold ? goneAll : [];
  const card = (p) => personCard(game, ui, p, q);
  return `
  <section class="card notebook">
    <h2>인물 수첩 <small>만난 사람 ${counts.all}명</small></h2>
    ${sel ? renderDetail(game, sel) : ''}
    <div class="seg filters" role="group" aria-label="보기">
      ${FILTERS.map(([id, name]) => `<button data-pfilter="${id}" aria-pressed="${f === id}">${name} <small>${counts[id]}</small></button>`).join('')}
    </div>
    ${counts.all > 6 ? `<div class="p-find">
      <label class="p-q"><span class="sr">사람 찾기</span><input type="search" id="people-q" placeholder="이름, 하는 일로 찾기" value="${esc(ui.peopleQ ?? '')}" autocomplete="off"></label>
      <label class="p-sort"><span class="sr">늘어놓기</span><select id="people-sort">${SORTS.map(([id, name]) => `<option value="${id}"${sort === id ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
    </div>
    <p class="note p-count" aria-live="polite">${q ? (shown ? `찾은 사람 ${shown}명` : '그런 사람은 이 칸에 없다.') : ''}</p>` : ''}
    ${list.length ? `<div class="people">${here.map(card).join('')}</div>${gone.length ? `<details class="p-gone"${q || (sel && gone.includes(sel)) ? ' open' : ''}><summary>떠난 사람 ${gone.length}명 <small>세상을 떠났거나 마을을 떠난 사람</small></summary><div class="people">${gone.map(card).join('')}</div></details>` : ''}` : '<p class="note">아직 이 칸에 적힌 사람이 없다.</p>'}
    <p class="note">만난 사람은 여기에 적히고, 그 사람의 삶이 바뀌면 기록도 함께 바뀐다.</p>
  </section>`;
}

function personCard(game, ui, p, q) {
  return `
        <button class="person ${p.alive && !p.away ? '' : 'dead'}" data-person="${p.id}" data-q="${esc(searchText(game, p))}" aria-pressed="${ui.person === p.id}"${q && !matchQ(searchText(game, p), q) ? ' hidden' : ''}>
          ${portrait(game, p, { size: 52 })}
          <span class="txt">
            <span class="nm">${esc(fullName(p))}</span>
            <span class="meta">${esc(personMeta(game, p))}</span>
            <span class="rel">${affBar(p.affection)}<span class="aff ${p.affection >= 20 ? 'pos' : p.affection < 0 ? 'neg' : ''}">${esc(relationLabel(game, p))}</span></span>
          </span>
        </button>`;
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
          <div class="rel big">${affBar(p.affection)}<span class="aff ${p.affection >= 20 ? 'pos' : p.affection < 0 ? 'neg' : ''}">${esc(relationLabel(game, p))} · ${relWord(p.affection)} (호감 ${p.affection})</span></div>
        </div>
      </div>
      ${(spouse || kids.length || parents.length) ? `<p class="kin">
        ${parents.length ? `<span>부모 ${parents.map(link).join(', ')}</span>` : ''}
        ${spouse ? `<span>배우자 ${link(spouse)}</span>` : ''}
        ${kids.length ? `<span>자식 ${kids.map(link).join(', ')}</span>` : ''}
      </p>` : ''}
      ${memoriesOf(p).length ? `<div class="memories"><h4>${esc(J(p.name, '이/가'))} 기억하는 나</h4><ul>${memoriesOf(p).slice(-6).reverse().map((m) => `<li class="${m.tone > 0 ? 'good' : m.tone < 0 ? 'bad' : ''}"><time>${m.y}년 ${m.m}월</time>${esc(m.text)}</li>`).join('')}</ul></div>` : ''}
      <h4>삶의 기록</h4>
      ${p.history.length
        ? `<ol class="timeline">${p.history.slice(-12).reverse().map((h) => `<li><time>${h.y}년 ${h.m}월</time><span>${esc(h.text)}</span></li>`).join('')}</ol>`
        : '<p class="note">아직 아는 이야기가 없다.</p>'}
      <button class="ghost close-bottom" data-person-close>닫기</button>
    </article>`;
}

export function bindPeople(game, ui, rerender) {
  document.querySelectorAll('[data-pfilter]').forEach((b) => b.onclick = () => { ui.peopleFilter = b.dataset.pfilter; rerender(); });
  // 찾기는 다시 그리지 않고 숨기기만 한다 (글자 칸의 커서가 그대로 남게)
  const qIn = document.getElementById('people-q');
  if (qIn) qIn.oninput = () => {
    ui.peopleQ = qIn.value;
    const q = qIn.value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll('.people .person').forEach((el) => { const hit = !q || matchQ(el.dataset.q ?? '', q); el.hidden = !hit; if (hit) n++; });
    const gone = document.querySelector('.p-gone');
    if (gone && q) gone.open = true;
    const c = document.querySelector('.p-count');
    if (c) c.textContent = q ? (n ? `찾은 사람 ${n}명` : '그런 사람은 이 칸에 없다.') : '';
  };
  const sortSel = document.getElementById('people-sort');
  if (sortSel) sortSel.onchange = () => { ui.peopleSort = sortSel.value; rerender(); };
  document.querySelectorAll('[data-person]').forEach((b) => b.onclick = () => {
    const id = +b.dataset.person;
    if (id === game.player.id) return;
    ui.person = ui.person === id ? null : id;
    rerender();
    if (ui.person) document.querySelector('.detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  document.querySelectorAll('[data-person-close]').forEach((c) => c.onclick = () => { ui.person = null; rerender(); });
}
