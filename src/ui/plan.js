// 이번 달 계획: 위에 칸(주), 아래에 행동 카드. 칸을 누르고 카드를 누르면 들어간다.
import { J } from '../narrative/text.js';
import { availableActions, slotsFor, knownPeople, fullName } from '../game.js';
import { ACTIONS } from '../actions.js';
import { actionIcon, icon } from '../art/icons.js';
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
  ['bondage', '사슬', /^bondage_(serve|escape|ransom)$/],
  ['exile', '유배와 망명', /^exile_/],
  ['crisis', '나라의 큰일', /^crisis_/],
  ['founding', '내 나라', /^found_/],
  ['jail', '감옥', /^jail_/],
  ['work', '일과 벌이', /^(work|seek_job|ld_work$|day_labor|inn_kitchen|herbs|help_home|shop_manage|open_shop|domain_|realm_office|farmer|merchant|estate_|voc_|nature_|trade_)/],
  ['cuisine', '요리사의 길', /^cuisine_/],
  ['inn', '내 가게', /^inn_(open|work|manage)$/],
  ['works', '큰 공사', /^works_/],
  ['mine', '광산', /^mine_/],
  ['farm', '내 농장', /^farm_/],
  ['apo', '약초와 약방', /^apo_/],
  ['brew', '양조장', /^brew_/],
  ['harbor', '포구와 고기잡이', /^harbor_/],
  ['cloth', '옷감과 바느질', /^cloth_/],
  ['demon', '해협 너머 마족', /^demon_/],
  ['demongod', '봉인과 마신', /^dg_/],
  ['newage', '새 시대', /^(na_|city_)/],
  ['builder', '목수와 석공', /^builder_/],
  ['carrier', '길 위의 일', /^carrier_/],
  ['credit', '돈놀이와 전당포', /^credit_/],
  ['undertaker', '장의사와 묘지기', /^ut_/],
  ['migrate', '피난민', /^mg_/],
  ['survey', '측량과 지도', /^sv_/],
  ['stars', '별 보기', /^st_/],
  ['magejob', '마법으로 먹고살기', /^mj_/],
  ['artifice', '마도구 공방', /^af_/],
  ['cloister', '수도원', /^cloister_/],
  ['hunter', '사냥', /^hunter_/],
  ['outlaw', '현상금 사냥', /^out_hunt$/],
  ['spread', '기술 퍼뜨리기', /^spread_/],
  ['herd', '목축과 유목', /^herd_/],
  ['frontier', '개척', /^frontier_/],
  ['learn', '배움과 수련', /^(school_|study|train_body|sword_|sw_(form|secret|aura|challenge|blade)$|meditate|magic_|spell_|circle_exam|sp_(school|chant|create)$|legend_lesson|research|seal_study|tower_(join|duty|exam|craft)|ruin_(read|restore|book))/],
  ['mana', '마나 샘', /^mana_/],
  ['spirit', '정령', /^spirit_/],
  ['ageless', '늙지 않는 몸', /^(noah_|dragonname_|after_rename|sealbreath_)/],
  ['arts', '글과 예술', /^arts_/],
  ['troupe', '유랑극단', /^troupe_/],
  ['faith', '믿음과 기도', /^(pray|worship|keep_feast|pilgrimage|faith_seek|holy_heal)$|^omen_/],
  ['revolt', '봉기와 반란', /^revolt_/],
  ['court', '궁정', /^(court_|crowns_)/],
  ['envoy', '사절과 외교', /^envoy_/],
  ['accord', '나라 사이 일', /^ac_/],
  ['claim', '숨은 왕가의 피', /^claim_/],
  ['relic', '성유물', /^relic_/],
  ['army', '군대', /^army_/],
  ['order', '기사단', /^order_/],
  ['mount', '하늘 짐승', /^mount_/],
  ['company', '용병단', /^company_/],
  ['aftermath', '전쟁 뒤', /^aftermath_/],
  ['people', '사람과 마을', /^(visit|play|wander|rel_|faction_door|bard|era_|kin_|love_|mentor_|sw_(found|hall)$|village_|mystery_|letters_|feud_reconcile|peoples_|repute_(boast|feast|clear))/],
  ['health', '병과 몸', /^health_/],
  ['oath', '맹세', /^oath_/],
  ['elder', '마지막 해들', /^elder_/],
  ['lineage', '가문', /^lineage_/],
  ['house', '집과 살림', /^(house_|household_)/],
  ['road', '길과 모험', /^(party_|gather_party|ld_pass$|travel|on_road|housing|quest|delve|dv_|deep_|pol_|explore_|gear|pioneer|buy_title|tower_dare|wolves|goblins|ruin_dig)/],
  ['wilds', '마물 사냥', /^wilds_/],
  ['dragon', '용의 땅', /^dragon_/],
  ['haunt', '망자와 저주', /^haunt_/],
  ['beast', '짐승', /^beast_/],
  ['law', '법과 재판', /^law_/],
  ['contest', '내기와 겨루기', /^contest_/],
  ['sea', '바다', /^(sail|sailing|at_sea|cargo|shipyard|sea_|serpent_lair|saltrock|pirate_)/],
  ['poor', '밑바닥', /^poor_/],
  ['secret', '비밀과 이중생활', /^secret_/],
  ['spy', '첩보와 밀정', /^spy_/],
  ['slavery', '노예와 자유', /^bondage_/],
  ['heist', '큰 한탕', /^heist_/],
  ['dark', '어두운 일', /^(crime_|gang_|out_|dawn_rite|repute_slander|forbidden_rite|feud_plot|vessel_rite|imprint_rite|bloodyears_rite)/],
  ['rest', '쉼', /^(rest|drift_years)$/],
];
// 고장마다 따로 있는 일(이름이 고장 이름으로 시작)과 어린아이 일은 하는 일에 맞는 묶음으로 보낸다.
const PLACE_ACTS = {
  work: ['harfen_market', 'barka_exchange', 'graubel_forge', 'silverleaf_trade', 'spell_work'],
  learn: ['harfen_dojo', 'harfen_library', 'verden_yard', 'leocast_library', 'leocast_tower', 'leocast_dojo', 'eisen_academy', 'serenia_lecture', 'silverleaf_tree', 'graubel_watch', 'spell_study', 'circle_exam'],
  faith: ['solaris_mass', 'solaris_pilgrims'],
  people: ['serenia_teahouse', 'barka_harbor', 'tag_along', 'beg_story', 'mud_play'],
  contest: ['eisen_arena', 'fur_trial'],
  dark: ['slums'],
};
const PLACE_GROUP = Object.fromEntries(Object.entries(PLACE_ACTS).flatMap(([g, ids]) => ids.map((id) => [id, g])));
const groupIndex = (id) => (PLACE_GROUP[id] ? GROUPS.findIndex(([g]) => g === PLACE_GROUP[id]) : GROUPS.findIndex(([, , re]) => re.test(id)));
export const groupNameOf = (id) => GROUPS[groupIndex(id)]?.[1] ?? '그 밖';
function groupActs(acts) {
  const out = GROUPS.map(([id, name]) => [id, name, []]);
  const etc = ['etc', '그 밖', []];
  for (const a of acts) {
    const i = groupIndex(a.id);
    (i >= 0 ? out[i][2] : etc[2]).push(a);
  }
  return [...out, etc].filter(([, , l]) => l.length);
}
const actCard = (a, ui, counts) => `<button class="act" data-act="${a.id}" aria-pressed="${ui.plan[ui.active].id === a.id}">
          <span class="ic">${actionIcon(a, 30)}</span>
          <span class="nm">${esc(a.name)}</span>
          <span class="ds">${esc(a.desc ?? '')}</span>
          ${counts[a.id] ? `<span class="cnt" aria-label="${counts[a.id]}칸에 들어 있음">${counts[a.id]}</span>` : ''}
        </button>`;

// 자주 하는 일: 이 삶에서 달마다 고른 일을 기억해 두고(이 기기, 오래된 달은 옅어진다) 맨 위에 모아 보인다.
// 보여 주는 방식만 바꾼다: 할 수 있는 일 목록(available)은 그대로.
function useMap(game) {
  const u = prefs().actUse;
  return u && u.life === lifeId(game) && u.c && typeof u.c === 'object' ? u.c : {};
}
export function noteActUse(game, plan) {
  try {
    const c = { ...useMap(game) };
    for (const k of Object.keys(c)) { c[k] = Math.round(c[k] * 0.85 * 100) / 100; if (c[k] < 0.3) delete c[k]; }
    for (const s of plan ?? []) if (s?.id && s.id !== 'rest') c[s.id] = (c[s.id] ?? 0) + 1;
    setPref('actUse', { life: lifeId(game), c });
  } catch (e) { console.error(e); }
}
const usualActs = (game, acts) => {
  const c = useMap(game);
  return acts.filter((a) => (c[a.id] ?? 0) >= 1.5).sort((a, b) => c[b.id] - c[a.id]).slice(0, 6);
};

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
  const usual = acts.length > 12 ? usualActs(game, acts) : [];
  const folded = Array.isArray(prefs().foldActs) ? prefs().foldActs : [];
  const foldable = groups.map(([gid]) => gid).filter((gid) => gid !== 'dark' && gid !== 'crisis');
  const allFolded = foldable.length > 0 && foldable.every((gid) => folded.includes(gid));
  // 짧게 보기: 할 일 카드에서 설명을 빼고 이름만(이 기기에 기억). 고른 칸의 설명은 칸 줄 아래에 한 줄로.
  const many = acts.length > 12;
  const compact = many && !!prefs().actCompact;
  // 방금 누른 일의 설명을 먼저(칸이 다음으로 넘어가도), 칸을 고르면 그 칸의 일
  const nowAct = (ui.pickedAct && ACTIONS.find((a) => a.id === ui.pickedAct)) || activeAct;

  return `
  <section class="card plan">
    <h2>이번 달 계획 <small class="hint-wide">칸을 고르고, 아래에서 할 일을 누른다</small><small class="hint-narrow">할 일을 누르면 아래 칸에 차례로 들어간다</small></h2>
    ${many ? '' : `<div class="ways-row">${waysButton()}<span class="note">지금 해 볼 수 있는 일과 갈 수 있는 길</span></div>`}
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
      ${many ? `<div class="plan-bar">
        <label class="act-find"><span class="pb-ic" aria-hidden="true">${icon('eye', 18)}</span><input type="search" id="act-q" value="${esc(ui.actQ ?? '')}" placeholder="할 일 ${acts.length}가지에서 찾기" aria-label="할 일 찾기" autocomplete="off"><span class="note" id="act-q-n" hidden></span></label>
        <div class="pb-tools">${waysButton('갈 수 있는 길')}${groups.length > 3 ? `<button class="ghost sm" id="act-fold" data-fold="${allFolded ? 0 : 1}">${allFolded ? '다 펼치기' : '다 접기'}</button>` : ''}<button class="ghost sm" id="act-compact" aria-pressed="${compact}">${compact ? '설명 보기' : '이름만'}</button></div>
      </div>` : ''}
      ${usual.length >= 2 ? `<div class="act-group act-usual" id="ag-usual"><h4><span class="ag-ic">${icon('hourglass', 18)}</span>자주 하는 일</h4><div class="act-grid">${usual.map((a) => actCard(a, ui, counts)).join('')}</div></div>` : ''}
      ${groups.length > 3 && acts.length > 12 ? `<nav class="act-jump" aria-label="할 일 묶음으로 가기">${groups.map(([gid, name, list]) => `<button class="ghost sm" data-act-jump="${gid}">${esc(name)} <small>${list.length}</small></button>`).join('')}</nav>` : ''}
      ${groups.map(([gid, name, list]) => {
        const cards = list.map((a) => actCard(gid === 'crisis' ? crisisActDesc(game, a) : a, ui, counts)).join('');
        const gic = `<span class="ag-ic">${actionIcon(list[0], 18)}</span>`;
        if (gid === 'crisis') return `<div class="act-group cr-acts" id="ag-${gid}"><h4>${gic}${name}</h4><div class="act-grid">${cards}</div></div>`;
        // 어두운 일은 처음부터 접어 둔다. 다른 묶음은 펼쳐 두되, 접은 묶음은 기억한다(이 기기). 고른 일이 든 묶음은 늘 펼친다.
        const chosen = list.some((a) => counts[a.id]);
        const open = chosen || (gid === 'dark' ? ui.darkOpen : !folded.includes(gid));
        return `<details class="act-group${gid === 'dark' ? ' dark' : ''}" id="ag-${gid}" data-ag="${gid}"${open ? ' open' : ''}><summary><h4>${gic}${name}</h4><span class="note">${list.length}가지</span></summary><div class="act-grid">${cards}</div></details>`;
      }).join('')}
    </div>
    ${renderTpl(game, ui)}
    <div class="actions-row plan-tools">
      <button class="ghost sm" id="fill">${esc(`모든 칸을 '${activeAct?.name ?? ''}'${J(activeAct?.name ?? '', '으로/로').slice((activeAct?.name ?? '').length)}`)}</button>
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
    if (d.dataset.auto) { delete d.dataset.auto; return; } // 찾기가 잠깐 펼친 것은 기억하지 않는다
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
  // 할 일 찾기: 다시 그리지 않고 카드만 숨긴다. 찾는 동안은 묶음을 다 펼치고 '자주 하는 일'은 감춘다.
  const q = document.getElementById('act-q');
  if (q) q.oninput = () => {
    ui.actQ = q.value;
    const t = q.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('.acts .act-group').forEach((g) => {
      if (g.id === 'ag-usual') { g.hidden = !!t; return; }
      let any = 0;
      g.querySelectorAll('.act').forEach((b) => { const hit = !t || b.textContent.toLowerCase().includes(t); b.hidden = !hit; if (hit) any++; });
      g.hidden = !!t && !any;
      if (g.tagName === 'DETAILS') {
        if (t && any && !g.open) { g.dataset.auto = '1'; g.dataset.searchOpened = '1'; g.open = true; }
        else if (!t && g.dataset.searchOpened) { delete g.dataset.searchOpened; g.dataset.auto = '1'; g.open = false; }
      }
      shown += any;
    });
    const nav = document.querySelector('.act-jump');
    if (nav) nav.hidden = !!t;
    const n = document.getElementById('act-q-n');
    if (n) { n.hidden = !t; n.textContent = shown ? `${shown}가지` : '맞는 일이 없다'; }
  };
  if (q && q.value) q.oninput();
  // 묶음 다 접기/펼치기: 접으면 묶음 이름만 남아 한눈에 고른다. 고른 일이 든 묶음은 그래도 펼친다.
  const fold = document.getElementById('act-fold');
  if (fold) fold.onclick = () => {
    const ids = [...document.querySelectorAll('.acts details.act-group[data-ag]')].map((d) => d.dataset.ag).filter((x) => x !== 'dark');
    setPref('foldActs', fold.dataset.fold === '1' ? ids : []);
    rerender();
  };
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
