// 화면 그리기. 상태(game)를 받아 HTML을 다시 그린다.
import {
  newGame, endMonth, availableActions, slotsFor, playerAge, family, monthInfo, me, circleOf,
  knownPeople, rngOf, byId, ageYears, fullName,
} from './game.js';
import { resolveEvent } from './events.js';
import { ACTIONS, jobName } from './actions.js';
import { FAMILIES, STATS, SKILLS, skillGrade, traitName, VILLAGE, REGION } from './data.js';
import { autosave, saveSlot, load, summary, clearAuto } from './save.js';

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const root = () => $('#app');

let game = null;
let ui = { tab: 'people', person: null, plan: [], outcome: null, setup: { mode: 'once', family: null, sex: 'm', name: '' } };

export function start() {
  const auto = summary('auto');
  renderSetup(auto);
}

/* ---------- 시작 화면 ---------- */
function renderSetup(auto) {
  const s = ui.setup;
  const slotSums = [1, 2, 3].map((i) => ({ i, s: summary('slot' + i) })).filter((x) => x.s);
  root().innerHTML = `
    <div class="wrap">
      <header class="title-block">
        <span class="eyebrow">용사력 500년 · ${esc(REGION)}</span>
        <h1>${esc(VILLAGE)}에서 태어나다</h1>
        <p>마신이 봉인된 지 오백 년. 레오니아 왕국 남쪽 끝 작은 마을에서 한 아이가 태어난다. 어떤 집에서 태어나, 어떤 사람으로 살지는 당신이 정한다. 마을 사람들은 당신이 보지 않아도 자기 삶을 산다.</p>
      </header>
      ${auto || slotSums.length ? `<div class="continue">
        ${auto ? `<button class="ghost" id="cont-auto">이어 하기: ${esc(auto.name)}, ${auto.age}살 (용사력 ${auto.year}년 ${auto.month}월)${auto.over ? ' · 끝난 삶' : ''}</button>` : ''}
        ${slotSums.map((x) => `<button class="ghost" data-slot="${x.i}">${x.i}번 저장: ${esc(x.s.name)}, ${x.s.age}살</button>`).join('')}
      </div>` : ''}
      <div class="setup">
        <section>
          <h2>삶의 방식</h2>
          <div class="choice-row">
            <button class="choice" data-mode="once" aria-pressed="${s.mode === 'once'}">
              <span class="tag">추천</span><strong>한 번뿐인 삶</strong>
              <span>매달 자동으로 저장되고 되돌릴 수 없다. 다친 몸도, 잘못된 선택도 그대로 안고 산다.</span>
            </button>
            <button class="choice" data-mode="free" aria-pressed="${s.mode === 'free'}">
              <span class="tag">편하게</span><strong>자유 모드</strong>
              <span>원할 때 저장하고, 예전 저장으로 돌아가 다시 고를 수 있다.</span>
            </button>
          </div>
        </section>
        <section>
          <h2>태어날 집안</h2>
          <div class="choice-row">
            ${FAMILIES.map((f) => `
              <button class="choice" data-family="${f.id}" aria-pressed="${s.family === f.id}">
                <span class="tag">${esc(f.standing)} · 집안 돈 은화 ${f.money}닢</span>
                <strong>${esc(f.name)}</strong>
                <span>${esc(f.desc)}</span>
              </button>`).join('')}
          </div>
        </section>
        <section>
          <h2>아이</h2>
          <div class="field-row">
            <label for="pname" class="note">이름</label>
            <input type="text" id="pname" maxlength="8" placeholder="예: 레온" value="${esc(s.name)}">
            <div class="seg" role="group" aria-label="성별">
              <button data-sex="m" aria-pressed="${s.sex === 'm'}">아들</button>
              <button data-sex="f" aria-pressed="${s.sex === 'f'}">딸</button>
            </div>
          </div>
        </section>
        <div class="actions-row">
          <button class="primary" id="begin" ${s.family && s.name.trim() ? '' : 'disabled'}>태어나기</button>
          <span class="note">${s.family ? '' : '집안을 골라 주세요. '}${s.name.trim() ? '' : '이름을 지어 주세요.'}</span>
        </div>
      </div>
    </div>`;

  root().querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { s.mode = b.dataset.mode; renderSetup(auto); });
  root().querySelectorAll('[data-family]').forEach((b) => b.onclick = () => { s.family = b.dataset.family; renderSetup(auto); });
  root().querySelectorAll('[data-sex]').forEach((b) => b.onclick = () => { s.sex = b.dataset.sex; renderSetup(auto); });
  const input = $('#pname');
  input.oninput = () => {
    s.name = input.value;
    $('#begin').disabled = !(s.family && s.name.trim());
  };
  $('#begin').onclick = () => {
    if (s.mode === 'once') clearAuto();
    game = newGame({ name: s.name.trim(), sex: s.sex, familyId: s.family, mode: s.mode });
    ui.plan = []; ui.outcome = null; ui.person = null;
    autosave(game);
    renderGame();
  };
  const ca = $('#cont-auto');
  if (ca) ca.onclick = () => { game = load('auto'); ui.plan = []; renderGame(); };
  root().querySelectorAll('[data-slot]').forEach((b) => b.onclick = () => { game = load('slot' + b.dataset.slot); ui.plan = []; renderGame(); });
}

/* ---------- 게임 화면 ---------- */
const bar = (label, v, max = 100, cls = '') => `
  <div class="stat ${cls}"><span>${label}</span><span class="bar"><i style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></i></span><span class="v">${Math.floor(v)}</span></div>`;

function renderSheet() {
  const p = game.player;
  const meP = me(game);
  const age = playerAge(game);
  const months = meP.ageMonths % 12;
  const circle = circleOf(game);
  const skillsShown = SKILLS.filter((s) => p.skills[s.id] >= 1);
  return `
  <aside class="sheet">
    <div class="who">
      <div class="sigil" aria-hidden="true">${esc(p.name[0])}</div>
      <div>
        <h2>${esc(p.name)} ${esc(p.lastName)}</h2>
        <p>${age}살 ${months}개월 · ${p.sex === 'm' ? '남' : '여'} · ${esc(family(game).name)}</p>
      </div>
    </div>
    <div class="block">
      <h3>능력치</h3>
      ${STATS.map((s) => bar(s.name, p.stats[s.id])).join('')}
    </div>
    <div class="block">
      <h3>마력</h3>
      ${p.manaAwakened
        ? `${bar('마력', p.mana, Math.max(50, Math.ceil(p.mana / 50) * 50), 'mana')}
           <p class="note">${circle ? `<span class="chip mana">${circle}서클</span> ` : ''}${circle ? '' : '아직 서클을 이루지 못했다. 마력과 마법 수련이 둘 다 필요하다.'}</p>`
        : '<p class="note">아직 마력을 느낀 적이 없다.</p>'}
    </div>
    <div class="block">
      <h3>기술</h3>
      ${skillsShown.length
        ? skillsShown.map((s) => `<div class="skill"><span>${s.name}</span><span class="g"><b>${skillGrade(p.skills[s.id])}</b> · ${Math.floor(p.skills[s.id])}</span></div>`).join('')
        : '<p class="note">아직 배운 기술이 없다.</p>'}
    </div>
    <div class="block">
      <h3>몸과 마음</h3>
      ${bar('피로', p.fatigue, 100, p.fatigue > 70 ? 'warn' : '')}
      ${bar('스트레스', p.stress, 100, p.stress > 70 ? 'warn' : '')}
      ${(p.injuries.length || p.scars?.length) ? `<p class="note">${p.injuries.map((i) => `<span class="chip hurt">${esc(i.name)} (${i.months}달)</span>`).join(' ')} ${(p.scars ?? []).map((s) => `<span class="chip">흉터: ${esc(s)}</span>`).join(' ')}</p>` : ''}
    </div>
  </aside>`;
}

function renderPlan() {
  const n = slotsFor(game);
  if (n === 0) {
    return `
    <section class="card">
      <h2>아기 시절 <small>스스로 고를 수 있는 일은 아직 없다</small></h2>
      <p class="baby">하루의 대부분을 자고, 먹고, 운다. 세 살이 되면 스스로 하루를 보낼 수 있다.</p>
      <div class="actions-row">
        <button class="primary" id="go">다음 달로</button>
        <button class="ghost" id="skip">사건이 생길 때까지 넘기기</button>
      </div>
    </section>`;
  }
  const acts = availableActions(game);
  while (ui.plan.length < n) ui.plan.push({ id: acts.find((a) => a.id === 'rest') ? 'rest' : acts[0].id });
  ui.plan.length = n;
  for (const c of ui.plan) if (!acts.some((a) => a.id === c.id)) c.id = 'rest';
  const known = knownPeople(game).filter((p) => p.alive && !p.away).sort((a, b) => b.affection - a.affection);
  for (const c of ui.plan) if (c.id === 'visit' && !known.some((p) => p.id === c.target)) c.target = known[0]?.id;
  const label = n === 4 ? ['첫째 주', '둘째 주', '셋째 주', '넷째 주'] : n === 3 ? ['상순', '중순', '하순'] : ['전반', '후반'];
  return `
  <section class="card">
    <h2>이번 달 계획 <small>${n}칸 · 나이가 들수록 늘어난다</small></h2>
    <div class="slots">
      ${ui.plan.map((c, i) => {
        const act = ACTIONS.find((a) => a.id === c.id);
        return `<div class="slot">
          <label for="slot-${i}">${label[i]}</label>
          <div class="pick">
            <select id="slot-${i}" data-i="${i}">
              ${acts.map((a) => `<option value="${a.id}" ${a.id === c.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}
            </select>
            ${act.needsTarget ? `<select id="target-${i}" data-t="${i}" aria-label="찾아갈 사람">
              ${known.map((p) => `<option value="${p.id}" ${p.id === c.target ? 'selected' : ''}>${esc(fullName(p))} (호감 ${p.affection})</option>`).join('')}
            </select>` : ''}
            <span class="desc">${esc(act.desc)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="actions-row">
      <button class="primary" id="go">이 달을 보낸다</button>
      <button class="ghost" id="skip3">같은 계획으로 석 달</button>
    </div>
  </section>`;
}

function renderNews() {
  const mi = monthInfo(game);
  return `
  <section class="card">
    <h2>이번 달 소식 <small>${esc(VILLAGE)} · ${mi.season}</small></h2>
    ${game.news.length
      ? `<ul class="news">${game.news.map((n) => `<li class="${n.rel >= 40 ? 'close' : ''}">${esc(n.text)}</li>`).join('')}</ul>`
      : '<p class="note">조용한 달이었다. 별다른 소문은 없다.</p>'}
    ${game.lastResults.length ? `<h2 style="margin-top:6px">지난달 한 일</h2>
      <ul class="results">${game.lastResults.map((r) => `<li><b>${esc(r.name)}</b>${esc(r.text)}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function renderTabs() {
  const tabs = [['people', '인물 수첩'], ['chron', '연대기'], ['save', '저장']];
  let body = '';
  if (ui.tab === 'people') body = renderPeople();
  if (ui.tab === 'chron') body = renderChron();
  if (ui.tab === 'save') body = renderSave();
  return `
  <section class="card">
    <div class="tabs" role="tablist">
      ${tabs.map(([id, name]) => `<button role="tab" data-tab="${id}" aria-selected="${ui.tab === id}">${name}</button>`).join('')}
    </div>
    ${body}
  </section>`;
}

function personMeta(p) {
  const fam = game.player.familyIds.includes(p.id);
  const status = !p.alive ? '세상을 떠남' : p.away ? '마을을 떠남' : `${ageYears(p)}살 · ${jobName(p)}`;
  return `${fam ? '가족 · ' : ''}${status}`;
}

function renderPeople() {
  const list = knownPeople(game).sort((a, b) => (b.alive - a.alive) || (game.player.familyIds.includes(b.id) - game.player.familyIds.includes(a.id)) || b.affection - a.affection);
  const sel = ui.person && byId(game, ui.person);
  return `
    ${sel ? renderPersonDetail(sel) : ''}
    <div class="people">
      ${list.map((p) => `
        <button class="person ${p.alive && !p.away ? '' : 'dead'}" data-person="${p.id}">
          <span class="nm">${esc(fullName(p))}</span>
          <span class="meta">${esc(personMeta(p))}</span>
          <span class="aff ${p.affection >= 20 ? 'pos' : p.affection < 0 ? 'neg' : ''}">호감 ${p.affection}</span>
        </button>`).join('')}
    </div>
    <p class="note">만난 사람은 여기에 기록되고, 그 사람의 삶이 바뀌면 함께 갱신된다. ${list.length}명을 안다.</p>`;
}

function renderPersonDetail(p) {
  const spouse = byId(game, p.spouseId);
  const kids = p.childIds.map((id) => byId(game, id)).filter(Boolean);
  return `
    <div class="detail">
      <strong>${esc(fullName(p))}</strong>
      <span class="note">${esc(personMeta(p))} · 성격: ${p.traits.map(traitName).join(', ')}${spouse ? ` · 배우자 ${esc(spouse.name)}` : ''}${kids.length ? ` · 자식 ${kids.map((k) => esc(k.name)).join(', ')}` : ''}</span>
      ${p.history.length ? `<ul>${p.history.slice(-8).map((h) => `<li>${h.y}년 ${h.m}월: ${esc(h.text)}</li>`).join('')}</ul>` : '<p class="note">아직 아는 이야기가 없다.</p>'}
    </div>`;
}

function renderChron() {
  const items = game.chronicle.slice(-120).reverse();
  return `<ul class="chron">${items.map((c) => `<li class="${c.rel >= 100 ? 'mine' : ''}"><time>${c.y}년 ${c.m}월</time><span>${esc(c.text)}</span></li>`).join('')}</ul>`;
}

function renderSave() {
  if (game.mode === 'once') {
    return '<p class="note">한 번뿐인 삶: 매달 자동으로 저장된다. 예전으로 돌아갈 수는 없다.</p><div class="actions-row"><button class="ghost" id="to-title">처음 화면으로</button></div>';
  }
  return `
    <p class="note">자유 모드: 칸을 골라 저장하고, 처음 화면에서 불러올 수 있다. 매달 자동 저장도 따로 된다.</p>
    <div class="actions-row">
      ${[1, 2, 3].map((i) => { const s = summary('slot' + i); return `<button class="ghost" data-save="${i}">${i}번에 저장${s ? ` (지금: ${esc(s.name)} ${s.age}살)` : ''}</button>`; }).join('')}
      <button class="ghost" id="to-title">처음 화면으로</button>
    </div>`;
}

function renderEvent() {
  const e = game.pendingEvent;
  if (!e && !ui.outcome) return '';
  if (ui.outcome) {
    return `<div class="overlay"><div class="event" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      <span class="eyebrow">${game.date.year}년 ${monthInfo(game).name}</span>
      <h2 id="ev-title">${esc(ui.outcome.title)}</h2>
      <p class="outcome">${esc(ui.outcome.text)}</p>
      <div class="opts"><button id="ev-close">계속</button></div>
    </div></div>`;
  }
  return `<div class="overlay"><div class="event" role="dialog" aria-modal="true" aria-labelledby="ev-title">
    <span class="eyebrow">${game.date.year}년 ${monthInfo(game).name} · 사건</span>
    <h2 id="ev-title">${esc(e.title)}</h2>
    <p>${esc(e.text)}</p>
    <div class="opts">${e.choices.map((c, i) => `<button data-choice="${i}">${esc(c)}</button>`).join('')}</div>
  </div></div>`;
}

function renderOver() {
  return `
  <section class="card">
    <h2>삶이 끝났다</h2>
    <p>${esc(game.player.name)}은(는) ${playerAge(game)}살에 세상을 떠났다. ${esc(me(game).deathCause ?? '')}</p>
    <p class="note">자식으로 이어 하기는 다음 시험판에서 들어간다.</p>
    <div class="actions-row"><button class="primary" id="to-title">처음 화면으로</button></div>
  </section>`;
}

function renderGame() {
  const mi = monthInfo(game);
  const p = game.player;
  root().innerHTML = `
    <div class="wrap">
      <header class="topbar">
        <div class="date">용사력 ${game.date.year}년 ${mi.name}<small>${mi.season} · ${esc(VILLAGE)}</small></div>
        <div class="purse"><span>내 돈 <b>은화 ${p.money}</b></span><span>집안 돈 <b>은화 ${p.familyMoney}</b></span><span>${game.mode === 'once' ? '한 번뿐인 삶' : '자유 모드'}</span></div>
      </header>
      <div class="layout">
        ${renderSheet()}
        <div class="main">
          ${game.over ? renderOver() : renderNews() + renderPlan()}
          ${renderTabs()}
        </div>
      </div>
    </div>
    ${game.over ? '' : renderEvent()}`;
  bindGame();
}

function advance(times = 1, untilEvent = false) {
  for (let k = 0; k < times; k++) {
    endMonth(game, slotsFor(game) ? ui.plan.map((c) => ({ ...c })) : []);
    autosave(game);
    if (game.pendingEvent || game.over) break;
    if (untilEvent && slotsFor(game) > 0) break;
  }
  renderGame();
  window.scrollTo({ top: 0 });
}

function bindGame() {
  const go = $('#go');
  if (go) go.onclick = () => advance(1);
  const skip = $('#skip');
  if (skip) skip.onclick = () => advance(36, true);
  const s3 = $('#skip3');
  if (s3) s3.onclick = () => advance(3);
  root().querySelectorAll('[data-i]').forEach((sel) => sel.onchange = () => {
    const c = ui.plan[+sel.dataset.i];
    c.id = sel.value;
    const act = ACTIONS.find((a) => a.id === c.id);
    if (act.needsTarget && !c.target) c.target = knownPeople(game).filter((p) => p.alive && !p.away).sort((a, b) => b.affection - a.affection)[0]?.id;
    renderGame();
  });
  root().querySelectorAll('[data-t]').forEach((sel) => sel.onchange = () => { ui.plan[+sel.dataset.t].target = +sel.value; });
  root().querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { ui.tab = b.dataset.tab; renderGame(); });
  root().querySelectorAll('[data-person]').forEach((b) => b.onclick = () => { ui.person = ui.person === +b.dataset.person ? null : +b.dataset.person; renderGame(); });
  root().querySelectorAll('[data-save]').forEach((b) => b.onclick = () => { saveSlot(game, +b.dataset.save); b.textContent = `${b.dataset.save}번에 저장됨`; });
  const tt = $('#to-title');
  if (tt) tt.onclick = () => { game = null; start(); };
  root().querySelectorAll('[data-choice]').forEach((b) => b.onclick = () => {
    const title = game.pendingEvent.title;
    const text = resolveEvent(game, rngOf(game), +b.dataset.choice);
    ui.outcome = { title, text };
    autosave(game);
    renderGame();
  });
  const ec = $('#ev-close');
  if (ec) ec.onclick = () => { ui.outcome = null; renderGame(); };
}
