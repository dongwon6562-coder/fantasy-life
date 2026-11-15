// 화면 그리기. 상태(game)를 받아 HTML을 다시 그린다.
// 폰 화면을 먼저 생각한다: 위에 마을 풍경, 아래에 탭 막대, 카드는 손가락으로 누르기 좋게.
import {
  newGame, endMonth, slotsFor, playerAge, family, monthInfo, me, circleOf, rngOf,
} from '../game.js';
import { resolveEvent } from '../events.js';
import { FAMILIES, STATS, SKILLS, skillGrade, VILLAGE, REGION } from '../data.js';
import { autosave, summary } from '../save.js';
import { portrait } from '../art/portrait.js';
import { sceneImage, conditionText } from '../art/scene.js';
import { icon } from '../art/icons.js';
import { mountMap } from '../art/map.js';
import { L, traveling } from '../adventure/core.js';
import { placeName, HOME_NAMES } from '../places.js';
import { jobTitle } from '../jobs.js';
import { memberships } from '../factions.js';
import { lineage } from '../heir.js';
import { worldSummary } from '../world.js';
import { splitResult } from '../narrative/text.js';
import { $, $$, esc, root } from './util.js';
import { renderPlan, bindPlan } from './plan.js';
import { snapshot, diffSummary, renderSummary } from './summary.js';
import { renderPeople, bindPeople } from './people.js';
import { applyPrefs, prefs, reducedMotion, renderSettings, bindSettings } from './settings.js';
import { runGuide, stopGuide } from './guide.js';
import { audio } from '../audio/index.js';
import { renderWorkshop } from './workshop.js';
import { renderWorld, bindWorld } from './world.js';
import './mapActions.js';
import { realmStatus } from '../realms/index.js';
import { playableRaces, raceInfo } from '../races/index.js';
import { renderParty } from './party.js';
import { renderYouthCard, renderYouthBlock } from './youth.js';
import { renderLegacy, renderLifeReview } from './legacy.js';
import { renderSavesBlock, renderSlotsBlock, bindSaves } from './savesView.js';
import { shelveAuto, newUid } from './saves.js';
import { renderCrisis } from './crisis.js';
import { ownedGoods } from './era.js';
import { renderFaithBlock, renderSea } from './realms7.js';
import { renderCourtBlock } from './court.js';
import { renderResearchBlock, renderDeep } from './realms8.js';

// 시작 화면: 종족별 집안 (인간 집안은 race가 없다)
const familiesOf = (race) => FAMILIES.filter((f) => (f.race ?? 'human') === race);

let game = null;
const ui = {
  view: 'month', person: null, peopleFilter: 'all', plan: [], active: 0, outcome: null,
  setup: { mode: 'once', family: null, sex: 'm', name: '' },
  saves: {},
};
let unmountMap = null;
let lastArt = null;   // 바로 전에 보인 풍경 (바뀌면 천천히 겹쳐 바꾼다)
let lastView = null;  // 바로 전 화면 (바뀌면 살짝 떠오르며 나타난다)

export function start() {
  applyPrefs();
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyPrefs); } catch { /* 옛 브라우저 */ }
  stopGuide();
  lastArt = null; lastView = null;
  renderSetup();
}

/* ---------- 시작 화면 ---------- */
function renderSetup() {
  const s = ui.setup;
  const auto = summary('auto');
  const art = sceneImage({ year: 500, month: 3 });
  let races = [];
  try { races = playableRaces(); } catch (e) { console.error(e); }
  const race = s.race ?? 'human';
  const raceNow = races.find((r) => r.id === race);
  const fams = races.length ? familiesOf(race) : FAMILIES;
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
      ${renderSavesBlock(ui.saves)}
      <div class="setup">
        ${auto ? `<h2 class="setup-h">새로 태어나기${auto.over ? '' : ` <small>지금 하던 삶(${esc(auto.name)})은 지워지지 않고 '다른 삶'에 보관된다</small>`}</h2>` : `<div class="first-time">
          <h2>이렇게 흘러간다</h2>
          <ol>
            <li><b>한 달씩 산다.</b> 세 살부터 한 달을 몇 칸으로 나눠 할 일을 고른다.</li>
            <li><b>세상은 혼자 굴러간다.</b> 내가 보지 않아도 마을 사람과 나라는 자기 삶을 산다.</li>
            <li><b>삶은 이어진다.</b> 죽으면 자식 가운데 한 명으로 이어서 산다.</li>
          </ol>
        </div>`}
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
          <h2>종족</h2>
          <div class="seg race-seg" role="group" aria-label="종족">
            ${races.map((r) => `<button data-race="${r.id}" aria-pressed="${race === r.id}">${esc(r.name)}</button>`).join('')}
          </div>
          ${raceNow ? `<p class="race-desc"><b>${esc(raceNow.name)}</b> · 수명 ${raceNow.life >= 500 ? '천 년 가까이' : `${raceNow.life}년쯤`} · ${esc(raceNow.desc)}</p>` : ''}
        </section>
        <section>
          <h2>태어날 집안</h2>
          <div class="choice-row">
            ${fams.map((f) => `
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

  $$('[data-mode]').forEach((b) => b.onclick = () => { s.mode = b.dataset.mode; renderSetup(); });
  $$('[data-family]').forEach((b) => b.onclick = () => { s.family = b.dataset.family; renderSetup(); });
  $$('[data-race]').forEach((b) => b.onclick = () => {
    s.race = b.dataset.race;
    const fs = familiesOf(s.race);
    if (!fs.some((f) => f.id === s.family)) s.family = fs.length === 1 ? fs[0].id : null; // 집안이 하나뿐이면 바로 고른다
    renderSetup();
  });
  $$('[data-sex]').forEach((b) => b.onclick = () => { s.sex = b.dataset.sex; renderSetup(); });
  const input = $('#pname');
  input.oninput = () => {
    s.name = input.value;
    $('#begin').disabled = !(s.family && s.name.trim());
    $('#begin-note').textContent = `${s.family ? '' : '집안을 골라 주세요. '}${s.name.trim() ? '' : '이름을 지어 주세요.'}`;
  };
  $('#begin').onclick = () => {
    // 하던 삶은 지우지 않고 보관한다 (예전엔 한 번뿐인 삶을 새로 시작하면 하던 삶이 사라졌다)
    if (!shelveAuto()) { $('#begin-note').textContent = '저장 공간이 모자라 하던 삶을 보관할 수 없다. 위에서 안 쓰는 저장을 지워 주세요.'; return; }
    game = newGame({ name: s.name.trim(), sex: s.sex, familyId: s.family, mode: s.mode });
    game.uid = newUid();
    resetUi();
    autosave(game);
    renderGame();
  };
  bindSaves(ui.saves, {
    rerender: () => renderSetup(),
    play: (g) => { if (!g) return; game = g; resetUi(); renderGame(); },
  });
}

function resetUi() {
  ui.plan = []; ui.active = 0; ui.outcome = null; ui.person = null; ui.view = 'month';
  ui.lastPlan = null; ui.summary = null; ui.tplNote = null; ui.tplEdit = false; ui.peopleQ = '';
}

/* ---------- 게임 화면 ---------- */
const bar = (label, v, max = 100, cls = '') => `
  <div class="stat ${cls}"><span>${label}</span><span class="bar"><i style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></i></span><span class="v">${Math.floor(v)}</span></div>`;

function lifeLines() {
  const life = L(game);
  const rows = [];
  rows.push(['사는 곳', `${placeName(game)}${traveling(game) ? '' : ` · ${HOME_NAMES[life.home] ?? ''}`}`]);
  try {
    const r = raceInfo(game);
    if (r.id !== 'human' || r.beast) rows.push(['종족', `${r.beast ?? r.name}${r.bodyAge !== r.age ? ` · 몸은 ${r.bodyAge}살쯤` : ''}${r.treatment !== 'normal' ? ` · 여기서는 ${r.treatmentWord}` : ''}${r.farewells ? ` · 떠나보낸 인간 친구 ${r.farewells}명` : ''}`]);
  } catch (e) { console.error(e); }
  const job = jobTitle(game);
  if (job) rows.push(['일', job]);
  try { const og = ownedGoods(game); if (og.length) rows.push(['살림', og.map((x) => `${x.name}${x.n > 1 ? ` ×${x.n}` : ''}`).join(', ')]); } catch (e) { console.error(e); }
  const ms = memberships(game);
  if (ms.length) rows.push(['소속', ms.join(', ')]);
  const g = life.gear;
  if (g.weaponName || g.armorName) rows.push(['장비', [g.weaponName, g.armorName].filter(Boolean).join(', ')]);
  if (life.renown >= 5) rows.push(['이름값', String(Math.floor(life.renown))]);
  if (life.notoriety >= 5) rows.push(['악명', String(Math.floor(life.notoriety))]);
  const line = lineage(game);
  if (line.length > 1) { const nm = line.slice(0, -1).map((a) => a.name); rows.push(['가문', `${life.gen}대째 · ${(nm.length > 3 ? [nm[0], '…', ...nm.slice(-2)] : nm).join(' → ')} → ${game.player.name}`]); }
  return rows.map(([k, v]) => `<div class="skill"><span>${k}</span><span class="g lifev">${esc(v)}</span></div>`).join('');
}

// 같은 흉터가 여러 번이면 한 칩에 '×3'으로
function scarChips(scars = []) {
  const n = new Map();
  for (const s of scars) n.set(s, (n.get(s) ?? 0) + 1);
  return [...n].map(([s, k]) => `<span class="chip">흉터: ${esc(s)}${k > 1 ? ` ×${k}` : ''}</span>`).join(' ');
}

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
      <h3>삶</h3>
      ${lifeLines()}
    </div>
    ${renderYouthBlock(game)}
    ${renderFaithBlock(game)}
    ${renderCourtBlock(game)}
    ${renderResearchBlock(game)}
    <div class="block">
      <h3>몸과 마음</h3>
      ${bar('피로', p.fatigue, 100, p.fatigue > 70 ? 'warn' : '')}
      ${bar('스트레스', p.stress, 100, p.stress > 70 ? 'warn' : '')}
      ${(p.injuries.length || p.scars?.length) ? `<p class="note">${p.injuries.map((i) => `<span class="chip hurt">${esc(i.name)} (${i.months}달)</span>`).join(' ')} ${scarChips(p.scars)}</p>` : ''}
    </div>
  </aside>`;
}

// 세계 정세: world.js의 '키: 값' 줄들을 표로
function worldRows() {
  return worldSummary(game).map((line) => {
    const i = line.indexOf(':');
    return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', line];
  });
}
const ALARM = /전쟁|내전|위독|붕괴|창궐|일촉즉발|집결|밀리는/;

function renderWorldCard() {
  const rows = worldRows();
  if (!rows.length) return '';
  return `<section class="card world">
    <h2>레오니아 정세 <small>용사력 ${game.date.year}년 ${monthInfo(game).name}</small></h2>
    <dl class="world-grid">${rows.map(([k, v]) => `<div class="${ALARM.test(v) ? 'alarm' : ''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </section>`;
}

function renderWorldMini() {
  const rows = worldRows();
  if (!rows.length) return '';
  const hot = rows.filter(([, v]) => ALARM.test(v));
  const head = hot.length ? hot.map(([k, v]) => `${k} ${v}`).join(' · ') : '큰 변고는 없다';
  // 접어 둔다: 큰 일은 접힌 줄에도 붉게 보인다 (폰에서 계획까지 덜 굴리게)
  return `<details class="world-mini">
    <summary><span class="lbl">레오니아 정세</span><span class="hd ${hot.length ? 'alarm' : ''}">${esc(head)}</span></summary>
    <dl class="world-grid">${rows.map(([k, v]) => `<div class="${ALARM.test(v) ? 'alarm' : ''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </details>`;
}

function renderNews() {
  const mi = monthInfo(game);
  return `
  <section class="card news-card">
    <h2>이번 달 소식 <small>${esc(placeName(game))} · ${mi.season}</small></h2>
    ${game.news.length
      ? `<ul class="news">${game.news.map((n) => `<li class="${n.rel >= 40 ? 'close' : ''}">${esc(n.text)}</li>`).join('')}</ul>`
      : '<p class="note">조용한 달이었다. 별다른 소문은 없다.</p>'}
    ${renderWorldMini()}
    ${game.lastResults.length ? `<h3 class="sub">지난달 한 일</h3>
      <ul class="results">${game.lastResults.map((r) => `<li><b>${esc(r.name)}</b><span class="scene-text">${esc(r.scene ?? r.text)}</span>${r.gains ? `<small class="gains">${esc(r.gains)}</small>` : ''}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function renderChron() {
  const tabs = `<div class="seg chron-tabs" role="tablist">
    <button role="tab" data-chron="me" aria-pressed="${ui.chronTab !== 'world' && ui.chronTab !== 'house'}">마을과 나</button>
    <button role="tab" data-chron="world" aria-pressed="${ui.chronTab === 'world'}">레오니아</button>
    <button role="tab" data-chron="house" aria-pressed="${ui.chronTab === 'house'}">가문</button>
  </div>`;
  if (ui.chronTab === 'world') return tabs + renderWorld(game, ui);
  if (ui.chronTab === 'house') { try { return tabs + renderLegacy(game, ui); } catch (e) { console.error(e); } }
  const items = game.chronicle.slice(-160).reverse();
  return tabs + `<section class="card"><h2>연대기 <small>마을과 나의 기록</small></h2>
    <ul class="chron">${items.map((c) => `<li class="${c.rel >= 100 ? 'mine' : ''}"><time>${c.y}년 ${c.m}월</time><span>${esc(c.text)}</span></li>`).join('')}</ul></section>`;
}

function renderSave() {
  return `${renderSlotsBlock(game, ui.saves)}${renderSettings()}`;
}

function renderMap() {
  let where = '';
  try { const r = realmStatus(game); where = `${r.line}${r.citizen !== r.here ? ` · 국적 ${r.citizenName}` : ''}`; } catch (e) { console.error(e); }
  return `<section class="card mapcard"><h2>대륙 지도 <small>${esc(where || `용사력 ${game.date.year}년`)}</small></h2><div id="map-host" class="map-host"></div></section>`;
}

function renderEvent() {
  const e = game.pendingEvent;
  if (!e && !ui.outcome) return '';
  const art = sceneImage({ year: game.date.year, month: game.date.month, famine: game.world?.famine, plague: game.world?.plague, place: L(game).place });
  const head = `${art ? `<div class="ev-art" aria-hidden="true"><i style="background-image:url(${art})"></i></div>` : ''}`;
  if (ui.outcome) {
    return `<div class="overlay"><div class="event" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      ${head}
      <div class="ev-body">
        <span class="eyebrow">용사력 ${game.date.year}년 ${monthInfo(game).name} · 그 뒤</span>
        <h2 id="ev-title">${esc(ui.outcome.title)}</h2>
        ${(() => { const r = splitResult(String(ui.outcome.text ?? '')); return `<p class="outcome">${esc(r.scene)}</p>${r.gains ? `<p class="gains">${esc(r.gains)}</p>` : ''}`; })()}
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
      ${heirReview()}
      <div class="opts">${e.choices.map((c, i) => `<button class="opt" data-choice="${i}" style="--i:${i}"><span class="n">${i + 1}</span><span>${esc(c)}</span></button>`).join('')}</div>
    </div>
  </div></div>`;
}

// 대 잇기 창 안에 접힌 '지나온 삶 돌아보기'
function heirReview() {
  const s = L(game).scene;
  if (game.pendingEvent?.id !== 'life_scene' || s?.kind !== 'heir') return '';
  try { return renderLifeReview(game, s.record, { compact: true }); } catch (e) { console.error(e); return ''; }
}

function renderOver() {
  const rec = L(game).ancestors.at(-1);
  let review = '';
  try { review = renderLifeReview(game, rec); } catch (e) { console.error(e); }
  return `
  <section class="card over">
    <h2>삶이 끝났다</h2>
    <p>${esc(`${game.player.name}은(는)`)} ${rec?.age ?? playerAge(game)}살에 세상을 떠났다. ${esc(me(game).deathCause ?? '')}</p>
    <p class="note">${lineage(game).length > 2 ? `${L(game).gen}대에 걸친 집안의 이야기가 여기서 끝난다.` : ''} 뒤를 이을 자식이 없어 대가 끊겼다.</p>
    ${review}
    <div class="actions-row"><button class="ghost" id="to-house">가문 기록 보기</button><button class="primary" id="to-title">처음 화면으로</button></div>
  </section>`;
}

const VIEWS = [
  ['month', '이번 달', 'scroll'],
  ['me', '나', 'body'],
  ['people', '사람들', 'visit'],
  ['map', '지도', 'wander'],
  ['chron', '연대기', 'book'],
  ['save', '설정', 'gear'],
];

function renderGame() {
  if (unmountMap) { unmountMap(); unmountMap = null; }
  const mi = monthInfo(game);
  const p = game.player;
  const art = sceneImage({ year: game.date.year, month: game.date.month, famine: game.world?.famine, plague: game.world?.plague, place: L(game).place });
  let main = '';
  if (ui.view === 'month') main = game.over ? renderOver() : renderCrisis(game) + renderSummary(ui.summary) + renderNews() + renderYouthCard(game, ui) + renderWorkshop(game, ui) + renderPlan(game, ui);
  else if (ui.view === 'me') main = renderSheet();
  else if (ui.view === 'people') main = renderParty(game) + renderPeople(game, ui);
  else if (ui.view === 'map') main = renderMap() + renderDeep(game) + renderSea(game) + renderWorldCard(); // 지도가 먼저 (폰에서 바로 보이게)
  else if (ui.view === 'chron') main = renderChron();
  else if (ui.view === 'save') main = renderSave();
  root().innerHTML = `
    <header class="scene">
      ${art && lastArt && lastArt !== art && !reducedMotion() ? `<img class="prev" src="${lastArt}" alt="" aria-hidden="true">` : ''}
      ${art ? `<img class="${lastArt && lastArt !== art ? 'xfade' : ''}" src="${art}" alt="${esc(placeName(game))} 풍경: ${mi.season}, ${esc(conditionText(game.date.year, game.date.month))}">` : ''}
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
        <div class="main${lastView !== ui.view ? ' enter' : ''}">${main}</div>
      </div>
    </div>
    ${game.over ? '' : renderEvent()}`;
  lastArt = art; lastView = ui.view;
  bindGame();
  if (ui.view === 'map') {
    const host = $('#map-host');
    if (host) unmountMap = mountMap(host, { here: L(game).place, game, onChange: () => renderGame() });
  }
  // 설정 화면: 소리 켜기·끄기와 음량은 소리 모듈이 직접 그린다 (없으면 내 음량 칸이 그대로 남는다)
  const ah = $('#audio-host');
  if (ah && audio?.mountSettings) { try { audio.mountSettings(ah); } catch (e) { console.error(e); } }
  guideLater();
}

// 안내는 화면이 자리 잡은 뒤에 (달 넘김 카드가 떠 있으면 그게 걷힌 뒤에)
function guideLater() {
  const blocked = !!(game.over || game.pendingEvent || ui.outcome || ui.view !== 'month' || document.querySelector('.month-card'));
  if (blocked) { stopGuide(); return; }
  requestAnimationFrame(() => runGuide({}));
}

/* 달 넘김 카드: 한 달(또는 여러 달)이 흐른 걸 잠깐 보여 준다. 누르면 바로 걷힌다. */
function showMonthCard(before, passed) {
  if (!prefs().monthCard || reducedMotion() || game.over) return;
  const mi = monthInfo(game);
  const seasonTurn = mi.season !== before.season ? `${mi.season}이 왔다` : ''; // 봄·여름·가을·겨울 모두 받침이 있다
  const flow = passed >= 12 ? `${Math.floor(passed / 12)}년${passed % 12 ? ` ${passed % 12}달` : ''}이 흘렀다` : passed > 1 ? `${passed}달이 흘렀다` : '';
  const yearTurn = game.date.year !== before.year ? `용사력 ${game.date.year}년이 밝았다` : '';
  const lines = [yearTurn, flow, seasonTurn].filter(Boolean);
  const el = document.createElement('div');
  el.className = 'month-card';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div class="mc-in">
    <span class="mc-yr">용사력 ${game.date.year}년</span>
    <strong>${esc(mi.name)}</strong>
    <span class="mc-cond">${esc(mi.season)} · ${esc(conditionText(game.date.year, game.date.month))}</span>
    ${lines.length ? `<span class="mc-line">${esc(lines.join(' · '))}</span>` : ''}
  </div>`;
  document.body.appendChild(el);
  let gone = false;
  const close = () => {
    if (gone) return; gone = true;
    el.classList.add('out');
    setTimeout(() => { el.remove(); if (game) guideLater(); }, 380);
  };
  el.onclick = close;
  setTimeout(close, game.pendingEvent ? 900 : 1500);
}

function advance(times = 1, untilEvent = false) {
  const before = { year: game.date.year, season: monthInfo(game).season };
  let passed = 0;
  const snap = (() => { try { return snapshot(game); } catch (e) { console.error(e); return null; } })();
  if (slotsFor(game)) ui.lastPlan = ui.plan.map((c) => ({ ...c }));
  ui.tplNote = null;
  for (let k = 0; k < times; k++) {
    passed++;
    endMonth(game, slotsFor(game) ? ui.plan.map((c) => ({ ...c })) : []);
    autosave(game);
    if (game.pendingEvent || game.over) break;
    if (untilEvent && slotsFor(game) > 0) break;
  }
  ui.active = 0;
  try { ui.summary = snap && !game.over ? diffSummary(game, snap) : null; } catch (e) { console.error(e); ui.summary = null; }
  document.querySelectorAll('.month-card').forEach((x) => x.remove());
  showMonthCard(before, passed);
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
  bindWorld(game, ui, rerender);
  const ws = $('details.workshop');
  if (ws) ws.ontoggle = () => { ui.wsOpen = ws.open; };
  const yt = $('details.youth');
  if (yt) yt.ontoggle = () => { ui.ytOpen = yt.open; };
  $$('[data-ws-person]').forEach((b) => b.onclick = () => { ui.view = 'people'; ui.person = +b.dataset.wsPerson; renderGame(); window.scrollTo({ top: 0 }); });
  $$('[data-chron]').forEach((b) => b.onclick = () => { ui.chronTab = b.dataset.chron; renderGame(); });
  $$('[data-legacy]').forEach((b) => b.onclick = () => { ui.legacySel = b.dataset.legacy === 'close' ? null : +b.dataset.legacy; renderGame(); if (ui.legacySel != null) document.querySelector('.lr-detail')?.scrollIntoView({ block: 'start' }); });
  const la = $('[data-legacy-all]');
  if (la) la.onclick = () => { ui.legacyAll = true; renderGame(); };
  const th = $('#to-house');
  if (th) th.onclick = () => { ui.view = 'chron'; ui.chronTab = 'house'; renderGame(); window.scrollTo({ top: 0 }); };
  bindSettings(rerender, () => { ui.view = 'month'; renderGame(); window.scrollTo({ top: 0 }); });
  $$('[data-view]').forEach((b) => b.onclick = () => { ui.view = b.dataset.view; ui.saves = {}; renderGame(); window.scrollTo({ top: 0 }); });
  bindSaves(ui.saves, { rerender, game });
  const tt = $('#to-title');
  if (tt) tt.onclick = () => { game = null; if (unmountMap) { unmountMap(); unmountMap = null; } document.querySelectorAll('.month-card').forEach((x) => x.remove()); start(); };
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
