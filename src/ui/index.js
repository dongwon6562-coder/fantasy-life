// 화면 그리기. 상태(game)를 받아 HTML을 다시 그린다.
// 폰 화면을 먼저 생각한다: 위에 마을 풍경, 아래에 탭 막대, 카드는 손가락으로 누르기 좋게.
import {
  newGame, endMonth, slotsFor, playerAge, family, monthInfo, me, circleOf, rngOf,
} from '../game.js';
import { resolveEvent } from '../events.js';
import { FAMILIES, STATS, SKILLS, skillGrade, VILLAGE, REGION } from '../data.js';
import { autosave, saveSlot, load, summary, clearAuto } from '../save.js';
import { portrait } from '../art/portrait.js';
import { sceneImage, conditionText } from '../art/scene.js';
import { icon } from '../art/icons.js';
import { mountMap } from '../art/map.js';
import { $, $$, esc, root } from './util.js';
import { renderPlan, bindPlan } from './plan.js';
import { renderPeople, bindPeople } from './people.js';

let game = null;
const ui = {
  view: 'month', person: null, peopleFilter: 'all', plan: [], active: 0, outcome: null,
  setup: { mode: 'once', family: null, sex: 'm', name: '' },
};
let unmountMap = null;

export function start() {
  renderSetup(summary('auto'));
}

/* ---------- 시작 화면 ---------- */
function renderSetup(auto) {
  const s = ui.setup;
  const slotSums = [1, 2, 3].map((i) => ({ i, s: summary('slot' + i) })).filter((x) => x.s);
  const art = sceneImage({ year: 500, month: 3 });
  root().innerHTML = `
    <div class="title-hero">
      ${art ? `<img src="${art}" alt="${esc(VILLAGE)}의 이른 봄 풍경">` : ''}
      <div class="title-cap">
        <span class="eyebrow">용사력 500년 · ${esc(REGION)}</span>
        <h1>${esc(VILLAGE)}에서 태어나다</h1>
      </div>
    </div>
    <div class="wrap">
      <header class="title-block">
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
            <input type="text" id="pname" maxlength="8" placeholder="예: 레온" value="${esc(s.name)}" autocomplete="off">
            <div class="seg" role="group" aria-label="성별">
              <button data-sex="m" aria-pressed="${s.sex === 'm'}">아들</button>
              <button data-sex="f" aria-pressed="${s.sex === 'f'}">딸</button>
            </div>
          </div>
        </section>
        <div class="actions-row">
          <button class="primary" id="begin" ${s.family && s.name.trim() ? '' : 'disabled'}>태어나기</button>
          <span class="note" id="begin-note">${s.family ? '' : '집안을 골라 주세요. '}${s.name.trim() ? '' : '이름을 지어 주세요.'}</span>
        </div>
      </div>
    </div>`;

  $$('[data-mode]').forEach((b) => b.onclick = () => { s.mode = b.dataset.mode; renderSetup(auto); });
  $$('[data-family]').forEach((b) => b.onclick = () => { s.family = b.dataset.family; renderSetup(auto); });
  $$('[data-sex]').forEach((b) => b.onclick = () => { s.sex = b.dataset.sex; renderSetup(auto); });
  const input = $('#pname');
  input.oninput = () => {
    s.name = input.value;
    $('#begin').disabled = !(s.family && s.name.trim());
    $('#begin-note').textContent = `${s.family ? '' : '집안을 골라 주세요. '}${s.name.trim() ? '' : '이름을 지어 주세요.'}`;
  };
  $('#begin').onclick = () => {
    if (s.mode === 'once') clearAuto();
    game = newGame({ name: s.name.trim(), sex: s.sex, familyId: s.family, mode: s.mode });
    resetUi();
    autosave(game);
    renderGame();
  };
  const ca = $('#cont-auto');
  if (ca) ca.onclick = () => { game = load('auto'); resetUi(); renderGame(); };
  $$('[data-slot]').forEach((b) => b.onclick = () => { game = load('slot' + b.dataset.slot); resetUi(); renderGame(); });
}

function resetUi() {
  ui.plan = []; ui.active = 0; ui.outcome = null; ui.person = null; ui.view = 'month';
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
      ${portrait(game, meP, { size: 84, scars: p.scars ?? [], ring: '#c9a25a', title: p.name })}
      <div>
        <h2>${esc(p.name)} ${esc(p.lastName)}</h2>
        <p>${age}살 ${months}개월 · ${p.sex === 'm' ? '남' : '여'}</p>
        <p>${esc(family(game).name)}</p>
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
           <p class="note">${circle ? `<span class="chip mana">${circle}서클</span>` : '아직 서클을 이루지 못했다. 마력과 마법 수련이 둘 다 필요하다.'}</p>`
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

function renderNews() {
  const mi = monthInfo(game);
  return `
  <section class="card news-card">
    <h2>이번 달 소식 <small>${esc(VILLAGE)} · ${mi.season}</small></h2>
    ${game.news.length
      ? `<ul class="news">${game.news.map((n) => `<li class="${n.rel >= 40 ? 'close' : ''}">${esc(n.text)}</li>`).join('')}</ul>`
      : '<p class="note">조용한 달이었다. 별다른 소문은 없다.</p>'}
    ${game.lastResults.length ? `<h3 class="sub">지난달 한 일</h3>
      <ul class="results">${game.lastResults.map((r) => `<li><b>${esc(r.name)}</b><span>${esc(r.text)}</span></li>`).join('')}</ul>` : ''}
  </section>`;
}

function renderChron() {
  const items = game.chronicle.slice(-160).reverse();
  return `<section class="card"><h2>연대기 <small>마을과 나의 기록</small></h2>
    <ul class="chron">${items.map((c) => `<li class="${c.rel >= 100 ? 'mine' : ''}"><time>${c.y}년 ${c.m}월</time><span>${esc(c.text)}</span></li>`).join('')}</ul></section>`;
}

function renderSave() {
  if (game.mode === 'once') {
    return `<section class="card"><h2>저장</h2><p class="note">한 번뿐인 삶: 매달 자동으로 저장된다. 예전으로 돌아갈 수는 없다.</p><div class="actions-row"><button class="ghost" id="to-title">처음 화면으로</button></div></section>`;
  }
  return `<section class="card"><h2>저장</h2>
    <p class="note">자유 모드: 칸을 골라 저장하고, 처음 화면에서 불러올 수 있다. 매달 자동 저장도 따로 된다.</p>
    <div class="actions-row">
      ${[1, 2, 3].map((i) => { const s = summary('slot' + i); return `<button class="ghost" data-save="${i}">${i}번에 저장${s ? ` (지금: ${esc(s.name)} ${s.age}살)` : ''}</button>`; }).join('')}
      <button class="ghost" id="to-title">처음 화면으로</button>
    </div></section>`;
}

function renderMap() {
  return `<section class="card mapcard"><h2>대륙 지도 <small>용사력 ${game.date.year}년</small></h2><div id="map-host" class="map-host"></div></section>`;
}

function renderEvent() {
  const e = game.pendingEvent;
  if (!e && !ui.outcome) return '';
  const art = sceneImage({ year: game.date.year, month: game.date.month, famine: game.world?.famine, plague: game.world?.plague });
  const head = `${art ? `<div class="ev-art" style="background-image:url(${art})" aria-hidden="true"></div>` : ''}`;
  if (ui.outcome) {
    return `<div class="overlay"><div class="event" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      ${head}
      <div class="ev-body">
        <span class="eyebrow">용사력 ${game.date.year}년 ${monthInfo(game).name} · 그 뒤</span>
        <h2 id="ev-title">${esc(ui.outcome.title)}</h2>
        <p class="outcome">${esc(ui.outcome.text)}</p>
        <div class="opts"><button class="primary" id="ev-close">계속</button></div>
      </div>
    </div></div>`;
  }
  return `<div class="overlay"><div class="event" role="dialog" aria-modal="true" aria-labelledby="ev-title">
    ${head}
    <div class="ev-body">
      <span class="eyebrow">용사력 ${game.date.year}년 ${monthInfo(game).name} · 사건</span>
      <h2 id="ev-title">${esc(e.title)}</h2>
      <p class="ev-text">${esc(e.text)}</p>
      <div class="opts">${e.choices.map((c, i) => `<button class="opt" data-choice="${i}"><span class="n">${i + 1}</span><span>${esc(c)}</span></button>`).join('')}</div>
    </div>
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

const VIEWS = [
  ['month', '이번 달', 'scroll'],
  ['me', '나', 'body'],
  ['people', '사람들', 'visit'],
  ['map', '지도', 'wander'],
  ['chron', '연대기', 'book'],
  ['save', '저장', 'home'],
];

function renderGame() {
  if (unmountMap) { unmountMap(); unmountMap = null; }
  const mi = monthInfo(game);
  const p = game.player;
  const art = sceneImage({ year: game.date.year, month: game.date.month, famine: game.world?.famine, plague: game.world?.plague });
  let main = '';
  if (ui.view === 'month') main = game.over ? renderOver() : renderNews() + renderPlan(game, ui);
  else if (ui.view === 'me') main = renderSheet();
  else if (ui.view === 'people') main = renderPeople(game, ui);
  else if (ui.view === 'map') main = renderMap();
  else if (ui.view === 'chron') main = renderChron();
  else if (ui.view === 'save') main = renderSave();
  root().innerHTML = `
    <header class="scene">
      ${art ? `<img src="${art}" alt="${esc(VILLAGE)} 풍경: ${mi.season}, ${esc(conditionText(game.date.year, game.date.month))}">` : ''}
      <div class="scene-cap">
        <div class="date"><span class="yr">용사력 ${game.date.year}년</span><strong>${mi.name}</strong><span class="cond">${mi.season} · ${esc(conditionText(game.date.year, game.date.month))}</span></div>
        <div class="purse"><span>내 돈 <b>은화 ${p.money}</b></span><span>집안 돈 <b>은화 ${p.familyMoney}</b></span></div>
      </div>
    </header>
    <nav class="nav" aria-label="화면">
      ${VIEWS.map(([id, name, ic]) => `<button data-view="${id}" class="${id === 'me' ? 'only-narrow' : ''}" aria-current="${ui.view === id ? 'page' : 'false'}">${icon(ic, 20)}<span>${name}</span></button>`).join('')}
    </nav>
    <div class="wrap game">
      <div class="layout view-${ui.view}">
        ${ui.view === 'me' ? '' : renderSheet().replace('class="sheet"', 'class="sheet side"')}
        <div class="main">${main}</div>
      </div>
    </div>
    ${game.over ? '' : renderEvent()}`;
  bindGame();
  if (ui.view === 'map') {
    const host = $('#map-host');
    if (host) unmountMap = mountMap(host, { here: game.location ?? 'ern', game, onChange: () => renderGame() });
  }
}

function advance(times = 1, untilEvent = false) {
  for (let k = 0; k < times; k++) {
    endMonth(game, slotsFor(game) ? ui.plan.map((c) => ({ ...c })) : []);
    autosave(game);
    if (game.pendingEvent || game.over) break;
    if (untilEvent && slotsFor(game) > 0) break;
  }
  ui.active = 0;
  renderGame();
  window.scrollTo({ top: 0 });
}

function bindGame() {
  const rerender = () => renderGame();
  const go = $('#go');
  if (go) go.onclick = () => advance(1);
  const skip = $('#skip');
  if (skip) skip.onclick = () => advance(36, true);
  const s3 = $('#skip3');
  if (s3) s3.onclick = () => advance(3);
  bindPlan(game, ui, rerender);
  bindPeople(game, ui, rerender);
  $$('[data-view]').forEach((b) => b.onclick = () => { ui.view = b.dataset.view; renderGame(); window.scrollTo({ top: 0 }); });
  $$('[data-save]').forEach((b) => b.onclick = () => { saveSlot(game, +b.dataset.save); b.textContent = `${b.dataset.save}번에 저장됨`; });
  const tt = $('#to-title');
  if (tt) tt.onclick = () => { game = null; if (unmountMap) { unmountMap(); unmountMap = null; } start(); };
  $$('[data-choice]').forEach((b) => b.onclick = () => {
    const title = game.pendingEvent.title;
    const text = resolveEvent(game, rngOf(game), +b.dataset.choice);
    ui.outcome = { title, text };
    autosave(game);
    renderGame();
  });
  const ec = $('#ev-close');
  if (ec) ec.onclick = () => { ui.outcome = null; renderGame(); };
  const firstOpt = $('.event .opt, #ev-close');
  if (firstOpt) firstOpt.focus({ preventScroll: true });
}
