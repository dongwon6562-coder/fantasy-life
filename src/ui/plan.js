// 이번 달 계획: 위에 칸(주), 아래에 행동 카드. 칸을 누르고 카드를 누르면 들어간다.
import { availableActions, slotsFor, knownPeople, fullName } from '../game.js';
import { ACTIONS } from '../actions.js';
import { actionIcon } from '../art/icons.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

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

  return `
  <section class="card plan">
    <h2>이번 달 계획 <small class="hint-wide">칸을 고르고, 아래에서 할 일을 누른다</small><small class="hint-narrow">할 일을 누르면 아래 칸에 차례로 들어간다</small></h2>
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
    <div class="acts">
      ${acts.map((a) => {
        const on = ui.plan[ui.active].id === a.id;
        return `<button class="act" data-act="${a.id}" aria-pressed="${on}">
          <span class="ic">${actionIcon(a, 26)}</span>
          <span class="nm">${esc(a.name)}</span>
          <span class="ds">${esc(a.desc ?? '')}</span>
          ${counts[a.id] ? `<span class="cnt" aria-label="${counts[a.id]}칸에 들어 있음">${counts[a.id]}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
    <div class="actions-row plan-tools">
      <button class="ghost sm" id="fill">모든 칸을 '${esc(activeAct?.name ?? '')}'(으)로</button>
      <button class="ghost sm" id="skip3">같은 계획으로 석 달 보내기</button>
    </div>
    <div class="sticky-go"><button class="primary go-btn" id="go">이 달을 보낸다</button></div>
  </section>`;
}

export function bindPlan(game, ui, rerender) {
  document.querySelectorAll('[data-slot-i]').forEach((b) => b.onclick = () => { ui.active = +b.dataset.slotI; rerender(); });
  document.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
    const c = ui.plan[ui.active];
    c.id = b.dataset.act;
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
  const fill = document.getElementById('fill');
  if (fill) fill.onclick = () => {
    const src = ui.plan[ui.active];
    ui.plan = ui.plan.map(() => ({ ...src }));
    rerender();
  };
}
