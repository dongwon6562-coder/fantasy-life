// 이번 달 계획: 위에 칸(주), 아래에 행동 카드. 칸을 누르고 카드를 누르면 들어간다.
import { availableActions, slotsFor, knownPeople, fullName } from '../game.js';
import { ACTIONS } from '../actions.js';
import { actionIcon } from '../art/icons.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';
import { crisisActDesc } from './crisis.js';
import { prefs, setPref } from './settings.js';
import { lifeId } from './saves.js';
import { waysButton } from './ways.js';

const LABELS = { 4: ['첫째 주', '둘째 주', '셋째 주', '넷째 주'], 3: ['상순', '중순', '하순'], 2: ['전반', '후반'], 1: ['이번 달'] };

const visitable = (game) => knownPeople(game).filter((p) => p.alive && !p.away).sort((a, b) => b.affection - a.affection);

/** 계획을 지금 할 수 있는 행동에 맞게 다듬는다 */
export function normalizePlan(game, ui) {
  const n = slotsFor(game);
  if (!n) { ui.plan = []; return; }
  const acts = availableActions(game);
  const fallback = acts.find((a) => a.id === 'rest') ? 'rest' : acts[0].id;
  while (ui.plan.length < n) ui.plan.push({ id: fallback });
  ui.plan.length = n;
  const people = visitable(game);
  for (const c of ui.plan) {
    if (!acts.some((a) => a.id === c.id)) { c.id = fallback; delete c.target; }
    const act = ACTIONS.find((a) => a.id === c.id);
    if (act?.needsTarget && !people.some((p) => p.id === c.target)) c.target = people[0]?.id;
  }
  ui.active = Math.min(ui.active ?? 0, n - 1);
}

/* ---------- 할 일 틀: 지난달 그대로, 저장한 틀 (이 기기에만 저장) ---------- */
const TPL_MAX = 6;
const tpls = () => (Array.isArray(prefs().planTpls) ? prefs().planTpls.filter((t) => t && Array.isArray(t.plan) && t.plan.length) : []);
const samePlan = (a, b) => a.length === b.length && a.every((c, i) => c.id === b[i].id && (c.target ?? null) === (b[i].target ?? null));
const actName = (id) => ACTIONS.find((a) => a.id === id)?.name ?? id;
/** 틀 이름 기본값: 들어 있는 일 이름을 많은 순으로 */
function tplDefaultName(plan) {
  const n = {};
  plan.forEach((c) => { n[c.id] = (n[c.id] ?? 0) + 1; });
  return Object.keys(n).sort((a, b) => n[b] - n[a]).slice(0, 3).map(actName).join('·').slice(0, 20);
}
/** 틀을 지금 칸 수에 맞춰 넣는다. 칸이 더 많으면 틀을 되풀이한다. 지금 못 하는 일은 다듬기에서 바뀐다. */
function applyTpl(game, ui, src, keepTargets) {
  const n = slotsFor(game);
  ui.plan = Array.from({ length: n }, (_, i) => { const c = { ...src[i % src.length] }; if (!keepTargets) delete c.target; return c; });
  const want = ui.plan.map((c) => c.id);
  ui.active = 0;
  normalizePlan(game, ui);
  const lost = [...new Set(want.filter((id, i) => ui.plan[i].id !== id))];
  ui.tplNote = lost.length ? `지금은 할 수 없는 일(${lost.map(actName).join(', ')})은 다른 일로 바뀌었다.` : null;
}

function renderTpl(game, ui) {
  const list = tpls();
  const last = ui.lastPlan?.length && !samePlan(ui.lastPlan, ui.plan) ? ui.lastPlan : null;
  const chips = [
    last ? `<button class="ghost sm tpl" data-tpl="last" title="${esc(last.map((c) => actName(c.id)).join(', '))}">지난달 그대로</button>` : '',
    ...list.map((t, i) => `<button class="ghost sm tpl" data-tpl="${i}" aria-pressed="${samePlan(t.plan, ui.plan)}" title="${esc(t.plan.map((c) => actName(c.id)).join(', '))}">${esc(t.name)}</button>`),
    `<button class="ghost sm tpl add" id="tpl-open" aria-expanded="${!!ui.tplEdit}">${list.length ? '틀 정리' : '이 계획을 틀로 저장'}</button>`,
  ].join('');
  let edit = '';
  if (ui.tplEdit) {
    const full = list.length >= TPL_MAX;
    edit = `<div class="tpl-edit">
      ${full ? `<p class="note">틀은 ${TPL_MAX}개까지 둘 수 있다. 하나를 지우면 새로 저장할 수 있다.</p>` : `<label class="tpl-name"><span>지금 계획을 틀로 저장</span>
        <span class="tpl-in"><input id="tpl-name" maxlength="20" value="${esc(tplDefaultName(ui.plan))}" aria-label="틀 이름"><button class="primary sm" id="tpl-save">저장</button></span></label>
        <p class="note">${esc(ui.plan.map((c) => actName(c.id)).join(' → '))}</p>`}
      ${list.length ? `<ul class="tpl-list">${list.map((t, i) => `<li><span class="txt"><strong>${esc(t.name)}</strong><span class="note">${esc(t.plan.map((c) => actName(c.id)).join(' → '))}</span></span>${ui.tplDel === i
        ? `<span class="sv-confirm"><button class="danger sm" data-tpl-del="${i}">정말 지우기</button><button class="ghost sm" data-tpl-keep>그만두기</button></span>`
        : `<button class="ghost sm" data-tpl-ask="${i}">지우기</button>`}</li>`).join('')}</ul>` : ''}
      <div class="actions-row"><button class="ghost sm" id="tpl-close">닫기</button></div>
    </div>`;
  }
  return `<div class="plan-tpl">
    <div class="tpl-row"><span class="lbl">틀</span>${chips}</div>
    ${ui.tplNote ? `<p class="note warn">${esc(ui.tplNote)}</p>` : ''}
    ${edit}
  </div>`;
}

function bindTpl(game, ui, rerender) {
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => [...document.querySelectorAll(q)];
  $$('[data-tpl]').forEach((b) => b.onclick = () => {
    const k = b.dataset.tpl;
    if (k === 'last') applyTpl(game, ui, ui.lastPlan, true);
    else { const t = tpls()[+k]; if (t) applyTpl(game, ui, t.plan, t.life === lifeId(game)); }
    rerender();
  });
  const open = $('#tpl-open');
  if (open) open.onclick = () => { ui.tplEdit = !ui.tplEdit; ui.tplDel = null; rerender(); };
  const close = $('#tpl-close');
  if (close) close.onclick = () => { ui.tplEdit = false; ui.tplDel = null; rerender(); };
  const save = $('#tpl-save');
  if (save) save.onclick = () => {
    const name = ($('#tpl-name')?.value ?? '').trim() || tplDefaultName(ui.plan);
    const list = tpls();
    if (list.length >= TPL_MAX) return;
    list.push({ name: name.slice(0, 20), plan: ui.plan.map((c) => (c.target != null ? { id: c.id, target: c.target } : { id: c.id })), life: lifeId(game) });
    setPref('planTpls', list);
    ui.tplEdit = false; ui.tplNote = null;
    rerender();
  };
  const name = $('#tpl-name');
  if (name) name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); save?.click(); } };
  $$('[data-tpl-ask]').forEach((b) => b.onclick = () => { ui.tplDel = +b.dataset.tplAsk; rerender(); });
  $$('[data-tpl-keep]').forEach((b) => b.onclick = () => { ui.tplDel = null; rerender(); });
  $$('[data-tpl-del]').forEach((b) => b.onclick = () => { const list = tpls(); list.splice(+b.dataset.tplDel, 1); setPref('planTpls', list); ui.tplDel = null; rerender(); });
}

// 행동 묶음: 고르기 쉽게 성격별로 나눈다. 어두운 일은 접어 둔다(고르면 펼쳐진 채로).
const GROUPS = [
  ['crisis', '나라의 큰일', /^crisis_/],
  ['work', '일과 벌이', /^(work|seek_job|day_labor|inn_kitchen|herbs|help_home|shop_manage|open_shop|domain_|realm_office|farmer|merchant|estate_|voc_|nature_|trade_)/],
  ['learn', '배움과 수련', /^(school_|study|train_body|sword_|meditate|magic_|legend_lesson|research|seal_study|tower_(join|duty|exam|craft))/],
  ['arts', '글과 예술', /^arts_/],
  ['faith', '믿음과 기도', /^(pray|worship|keep_feast|pilgrimage|faith_seek|holy_heal)$|^omen_/],
  ['court', '궁정', /^court_/],
  ['army', '군대', /^army_/],
  ['people', '사람과 마을', /^(visit|play|wander|rel_|faction_door|bard|era_|kin_|love_|mentor_|village_|mystery_|letters_|feud_reconcile|peoples_|repute_(boast|feast|clear))/],
  ['health', '병과 몸', /^health_/],
  ['oath', '맹세', /^oath_/],
  ['elder', '마지막 해들', /^elder_/],
  ['house', '집과 살림', /^(house_|household_)/],
  ['road', '길과 모험', /^(party_|gather_party|travel|on_road|housing|quest|delve|deep_|pol_|explore_|gear|pioneer|buy_title|tower_dare|wolves|goblins)/],
  ['beast', '짐승', /^beast_/],
  ['law', '법과 재판', /^law_/],
  ['contest', '내기와 겨루기', /^contest_/],
  ['sea', '바다', /^(sail|sailing|at_sea|cargo|shipyard|sea_|serpent_lair|saltrock|pirate_)/],
  ['poor', '밑바닥', /^poor_/],
  ['dark', '어두운 일', /^(crime_|gang_|dawn_rite|repute_slander|forbidden_rite|feud_plot)/],
  ['rest', '쉼', /^(rest|drift_years)$/],
];
export const groupNameOf = (id) => GROUPS.find(([, , re]) => re.test(id))?.[1] ?? '그 밖';
function groupActs(acts) {
  const out = GROUPS.map(([id, name]) => [id, name, []]);
  const etc = ['etc', '그 밖', []];
  for (const a of acts) {
    const i = GROUPS.findIndex(([, , re]) => re.test(a.id));
    (i >= 0 ? out[i][2] : etc[2]).push(a);
  }
  return [...out, etc].filter(([, , l]) => l.length);
}
const actCard = (a, ui, counts) => `<button class="act" data-act="${a.id}" aria-pressed="${ui.plan[ui.active].id === a.id}">
          <span class="ic">${actionIcon(a, 26)}</span>
          <span class="nm">${esc(a.name)}</span>
          <span class="ds">${esc(a.desc ?? '')}</span>
          ${counts[a.id] ? `<span class="cnt" aria-label="${counts[a.id]}칸에 들어 있음">${counts[a.id]}</span>` : ''}
        </button>`;

export function renderPlan(game, ui) {
  const n = slotsFor(game);
  if (n === 0) {
    return `
    <section class="card plan">
      <h2>아기 시절 <small>스스로 고를 수 있는 일은 아직 없다</small></h2>
      <p class="baby">하루의 대부분을 자고, 먹고, 운다. 세 살이 되면 스스로 하루를 보낼 수 있다.</p>
      <div class="actions-row plan-tools"><button class="ghost sm" id="skip">사건이 생기거나 세 살이 될 때까지 넘기기</button></div>
      <div class="sticky-go"><button class="primary go-btn" id="go">다음 달로</button></div>
    </section>`;
  }
  normalizePlan(game, ui);
  const acts = availableActions(game);
  const labels = LABELS[n] ?? ui.plan.map((_, i) => `${i + 1}번째`);
  const people = visitable(game);
  const activeAct = ACTIONS.find((a) => a.id === ui.plan[ui.active].id);
  const counts = {};
  ui.plan.forEach((c) => { counts[c.id] = (counts[c.id] ?? 0) + 1; });
  const groups = groupActs(acts);
  const folded = Array.isArray(prefs().foldActs) ? prefs().foldActs : [];
  // 짧게 보기: 할 일 카드에서 설명을 빼고 이름만(이 기기에 기억). 고른 칸의 설명은 칸 줄 아래에 한 줄로.
  const many = acts.length > 12;
  const compact = many && !!prefs().actCompact;
  // 방금 누른 일의 설명을 먼저(칸이 다음으로 넘어가도), 칸을 고르면 그 칸의 일
  const nowAct = (ui.pickedAct && ACTIONS.find((a) => a.id === ui.pickedAct)) || activeAct;

  return `
  <section class="card plan">
    <h2>이번 달 계획 <small class="hint-wide">칸을 고르고, 아래에서 할 일을 누른다</small><small class="hint-narrow">할 일을 누르면 아래 칸에 차례로 들어간다</small></h2>
    <div class="ways-row">${waysButton()}<span class="note">지금 해 볼 수 있는 일과 갈 수 있는 길</span></div>
    <div class="slotbar" role="tablist" aria-label="이번 달의 칸" style="--n:${n}">
      ${ui.plan.map((c, i) => {
        const act = ACTIONS.find((a) => a.id === c.id);
        const who = act?.needsTarget ? people.find((p) => p.id === c.target) : null;
        return `<button class="slotchip" role="tab" data-slot-i="${i}" aria-selected="${i === ui.active}">
          <span class="wk">${labels[i]}</span>
          <span class="ic">${actionIcon(act, 22)}</span>
          <span class="nm">${esc(act?.name ?? '')}</span>
          ${who ? `<span class="who">${esc(who.name)}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
    ${compact && nowAct ? `<p class="note act-now"><b>${nowAct === activeAct ? `${esc(labels[ui.active])} · ` : ''}${esc(nowAct.name)}</b> ${esc(nowAct.desc ?? '')}</p>` : ''}
    ${activeAct?.needsTarget ? `
      <div class="targets">
        <p class="note">${labels[ui.active]}: 누구를 찾아갈까</p>
        <div class="target-row">
          ${people.map((p) => `<button class="target" data-target="${p.id}" aria-pressed="${p.id === ui.plan[ui.active].target}">
            ${portrait(game, p, { size: 48 })}
            <span class="nm">${esc(p.name)}</span>
            <span class="aff ${p.affection >= 20 ? 'pos' : p.affection < 0 ? 'neg' : ''}">${p.affection}</span>
          </button>`).join('')}
        </div>
      </div>` : ''}
    <div class="acts${compact ? ' compact' : ''}">
      ${many ? `<div class="act-tools"><span class="note">할 일 ${acts.length}가지</span><button class="ghost sm" id="act-compact" aria-pressed="${compact}">${compact ? '설명까지 보기' : '이름만 짧게 보기'}</button></div>` : ''}
      ${groups.length > 3 && acts.length > 12 ? `<nav class="act-jump" aria-label="할 일 묶음으로 가기">${groups.map(([gid, name, list]) => `<button class="ghost sm" data-act-jump="${gid}">${esc(name)} <small>${list.length}</small></button>`).join('')}</nav>` : ''}
      ${groups.map(([gid, name, list]) => {
        const cards = list.map((a) => actCard(gid === 'crisis' ? crisisActDesc(game, a) : a, ui, counts)).join('');
        if (gid === 'crisis') return `<div class="act-group cr-acts" id="ag-${gid}"><h4>${name}</h4><div class="act-grid">${cards}</div></div>`;
        // 어두운 일은 처음부터 접어 둔다. 다른 묶음은 펼쳐 두되, 접은 묶음은 기억한다(이 기기). 고른 일이 든 묶음은 늘 펼친다.
        const chosen = list.some((a) => counts[a.id]);
        const open = chosen || (gid === 'dark' ? ui.darkOpen : !folded.includes(gid));
        return `<details class="act-group${gid === 'dark' ? ' dark' : ''}" id="ag-${gid}" data-ag="${gid}"${open ? ' open' : ''}><summary><h4>${name}</h4><span class="note">${list.length}가지</span></summary><div class="act-grid">${cards}</div></details>`;
      }).join('')}
    </div>
    ${renderTpl(game, ui)}
    <div class="actions-row plan-tools">
      <button class="ghost sm" id="fill">${esc(`모든 칸을 '${activeAct?.name ?? ''}'(으)로`)}</button>
      <button class="ghost sm" id="skip3">같은 계획으로 석 달 보내기</button>
    </div>
    <div class="sticky-go"><button class="primary go-btn" id="go">이 달을 보낸다</button></div>
  </section>`;
}

export function bindPlan(game, ui, rerender) {
  document.querySelectorAll('[data-slot-i]').forEach((b) => b.onclick = () => { ui.active = +b.dataset.slotI; ui.pickedAct = null; rerender(); });
  document.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
    const c = ui.plan[ui.active];
    c.id = b.dataset.act;
    ui.pickedAct = c.id;
    const act = ACTIONS.find((a) => a.id === c.id);
    if (act?.needsTarget) {
      if (!c.target) c.target = visitable(game)[0]?.id;
    } else if (ui.active < ui.plan.length - 1) {
      ui.active++; // 다음 칸으로
    }
    rerender();
    if (act?.needsTarget) document.querySelector('.targets')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  document.querySelectorAll('[data-target]').forEach((b) => b.onclick = () => {
    ui.plan[ui.active].target = +b.dataset.target;
    if (ui.active < ui.plan.length - 1) ui.active++;
    rerender();
  });
  document.querySelectorAll('details.act-group[data-ag]').forEach((d) => d.ontoggle = () => {
    const gid = d.dataset.ag;
    if (gid === 'dark') { ui.darkOpen = d.open; return; }
    const cur = Array.isArray(prefs().foldActs) ? prefs().foldActs : [];
    const next = d.open ? cur.filter((x) => x !== gid) : [...new Set([...cur, gid])];
    if (next.length !== cur.length) setPref('foldActs', next);
  });
  // 묶음으로 가기: 접혀 있으면 펼치고 그 묶음 머리로 굴린다
  document.querySelectorAll('[data-act-jump]').forEach((b) => b.onclick = () => {
    const g = document.getElementById(`ag-${b.dataset.actJump}`);
    if (!g) return;
    if (g.tagName === 'DETAILS' && !g.open) g.open = true;
    g.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  const cmp = document.getElementById('act-compact');
  if (cmp) cmp.onclick = () => { setPref('actCompact', !prefs().actCompact); rerender(); };
  bindTpl(game, ui, rerender);
  const fill = document.getElementById('fill');
  if (fill) fill.onclick = () => {
    const src = ui.plan[ui.active];
    ui.plan = ui.plan.map(() => ({ ...src }));
    ui.tplNote = null;
    rerender();
  };
}
