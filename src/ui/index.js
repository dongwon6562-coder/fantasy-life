// 화면 그리기. 상태(game)를 받아 HTML을 다시 그린다.
// 폰 화면을 먼저 생각한다: 위에 마을 풍경, 아래에 탭 막대, 카드는 손가락으로 누르기 좋게.
import {
  newGame, endMonth, slotsFor, playerAge, family, monthInfo, me, circleOf, rngOf,
} from '../game.js';
import { resolveEvent } from '../events.js';
import { FAMILIES, STATS, SKILLS, skillGrade, VILLAGE, REGION } from '../data.js';
import { autosave, autosaveSoon, summary } from '../save.js';
import { portrait } from '../art/portrait.js';
import { sceneImage, conditionText, prewarmScene, techsOf } from '../art/scene.js';
import { icon } from '../art/icons.js';
import { mountMap } from '../art/map.js';
import { L, traveling } from '../adventure/core.js';
import { placeName, HOME_NAMES } from '../places.js';
import { jobTitle } from '../jobs.js';
import { byId } from '../npc.js';
import { medallion, crest, divider, frameCss, ORNAMENT_CSS } from '../art/ornament.js';
import { interiorImage, interiorCached, sceneFor } from '../art/sceneInterior.js';
const ROOM_NAME = { hearth: '집 안', tavern: '주점 안', hall: '큰 방', temple: '신전 안', workshop: '일터' };
import { memberships } from '../factions.js';
import { lineage } from '../heir.js';
import { worldSummary } from '../world.js';
import { splitResult, J } from '../narrative/text.js';
import { $, $$, esc, root } from './util.js';
import { renderPlan, bindPlan, noteActUse } from './plan.js';
import { snapshot, diffSummary, summaryBody } from './summary.js';
import { renderToday, revealSpans } from './today.js';
import { renderPeople, bindPeople } from './people.js';
import { yearFold, yearSpan } from './yearfold.js';
import { applyPrefs, prefs, reducedMotion, revealOn, smoothOn, renderSettings, bindSettings } from './settings.js';
import { runGuide, stopGuide } from './guide.js';
import { installTouch } from './touch.js';
import { audio } from '../audio/index.js';
import { renderWorkshop } from './workshop.js';
import { renderWorld, bindWorld } from './world.js';
import './mapActions.js';
import { realmStatus } from '../realms/index.js';
import { playableRaces, raceInfo } from '../races/index.js';
import { renderParty } from './party.js';
import { renderYouthCard, renderYouthBlock } from './youth.js';
import { renderLegacy, renderLifeReview } from './legacy.js';
import { initBook, closeBook } from './book.js';
import { initWays, closeWays } from './ways.js';
import { renderSavesBlock, renderSlotsBlock, bindSaves } from './savesView.js';
import { shelveAuto, newUid } from './saves.js';
import { renderCrisis } from './crisis.js';
import { ownedGoods } from './era.js';
import { renderFaithBlock, renderSea } from './realms7.js';
import { renderCourtBlock } from './court.js';
import { renderResearchBlock, renderDeep } from './realms8.js';
import { renderKin, renderEstateBlock } from './realms9.js';
import { renderReputeBlock } from './repute.js';
import { renderSeal, sealRow, renderVocBlock } from './realms10.js';
import { renderTowerBlock, renderArmyBlock, renderArmyNow, renderLove } from './realms11.js';
import { renderFeud, renderExplore, renderExploreNow } from './realms12.js';
import { renderPeoples } from './peoples.js';
import { renderMentor } from './mentor.js';
import { renderArtsBlock } from './arts.js';
import { renderContestBlock } from './contest.js';
import { renderElderBlock } from './elder.js';
import { renderHealthNow, renderHealthBlock } from './health.js';
import { renderTrade, renderTradeNow } from './trade.js';
import { renderVillage } from './village.js';
import { renderOath } from './oath.js';
import { renderHouseBlock } from './house.js';
import { renderLetters } from './letters.js';
import { renderPoorNow, renderPoorBlock } from './poor.js';
import { renderSchoolBlock, renderSchoolNow } from './school.js';
import { renderLawNow, renderLawBlock } from './law.js';
import { renderHousehold } from './household.js';
import { renderAftermath, renderAftermathBlock, renderAftermathNow } from './aftermath.js';
import { renderInnNow, renderInnBlock } from './inn.js';
import { renderSecretBlock, renderSecretNow } from './secret.js';
import { renderTroupe, renderTroupeNow, renderTroupeBlock } from './troupe.js';
import { renderDragon, renderDragonNow, renderDragonBlock } from './dragon.js';
import { renderBondageNow, renderBondageBlock } from './bondage.js';
import { renderCompanyNow, renderCompanyBlock } from './company.js';
import { renderMines, renderMineNow, renderMineBlock } from './mine.js';
import { renderHeistNow, renderHeistBlock } from './heist.js';
import { renderLineageNow, renderLineageBlock } from './lineage.js';
import { renderHaunt, renderHauntNow, renderHauntBlock } from './haunt.js';
import { renderHerd, renderHerdNow, renderHerdLine, renderHerdBlock } from './herd.js';
import { renderFrontier, renderFrontierNow, renderFrontierBlock } from './frontier.js';
import { renderRevolt, renderRevoltNow, renderRevoltBlock } from './revolt.js';
import { renderCuisineNow, renderCuisineBlock } from './cuisine.js';
import { renderWorks, renderWorksNow, renderWorksBlock } from './works.js';
import { renderExileNow, renderExileBlock } from './exile.js';
import { renderSpyNow, renderSpyBlock } from './spy.js';
import { renderMana, renderManaNow, renderManaBlock } from './mana.js';
import { renderFarmNow, renderFarmBlock } from './farm.js';
import { renderClaimNow, renderClaimBlock } from './claim.js';
import { renderApoNow, renderApoBlock } from './apothecary.js';
import { renderRelicNow, renderRelicBlock } from './relic.js';
import { renderAgelessNow, renderAgelessBlock, renderFarewellBlock } from './ageless.js';
import { renderHeredityBlock } from './heredity.js';
import { renderSpiritNow, renderSpiritBlock } from './spirit.js';
import { renderBrewNow, renderBrewBlock } from './brew.js';
import { renderEnvoyNow, renderEnvoyBlock } from './envoy.js';
import { renderSiblings } from './siblings.js';
import { renderFamilyPick } from './famPick.js';
import { renderRuinsBlock, renderRuins } from './ruins.js';
import { renderSpellbook } from './spellbook.js';
import { renderSwordbook } from './swordbook.js';
import { renderDemongodBlock } from './demongod.js';
import { renderDemonland, renderDemonkindBlock } from './demonkind.js';
import { renderDelveMap, renderDelveBlock } from './delve.js';
import { renderArtificeBlock } from './artifice.js';
import { renderLandsMap } from './lands.js';
import { renderCrownsMap, renderCrownsBlock } from './crowns.js';
import { renderOrderBlock, renderOrders } from './order.js';
import { renderFoundingBlock, renderFoundings, renderFoundingChron } from './founding.js';
import { renderMountCard, renderMountBlock } from './mount.js';
import { renderHarborNow, renderHarbor, renderHarborBlock } from './harbor.js';
import { renderDemons, renderDemonsBlock } from './demons.js';
import { renderClothNow, renderClothBlock } from './cloth.js';
import { renderOriginBlock } from './origin.js';
import { renderFriends } from './friends.js';
import { renderPeers } from './peers.js';
import { renderBuilderNow, renderBuilderBlock } from './builder.js';
import { renderSpread } from './spread.js';
import { renderOccupied, renderOccupiedBlock } from './occupied.js';
import { renderCreditNow, renderCreditBlock } from './credit.js';
import { renderUndertakerNow, renderUndertakerBlock } from './undertaker.js';
import { renderBaseborn, renderBasebornBlock } from './baseborn.js';
import { renderFamTree } from './famtree.js';
import { renderSurveyNow, renderSurveyBlock, renderSurveyMap } from './survey.js';
import { renderStarsMap, renderStarsChron, renderStarsBlock } from './stars.js';
import { renderPrisonNow, renderPrisonBlock } from './prison.js';
import { renderRacePick } from './racePick.js';
import { renderMagejobNow } from './magejob.js';
import { renderMigrate, renderMigrateNow } from './migrate.js';
import { renderAdopt, renderAdoptBlock } from './adopt.js';
import { renderCloisterBlock, renderCloisters } from './cloister.js';
import { renderCarrierNow, renderCarrierBlock } from './carrier.js';
import { renderSociety, renderSocietyBlock } from './society.js';
import { renderOutlaws, renderOutlawsBlock } from './outlaws.js';
import { renderHunterNow, renderHunterBlock } from './hunter.js';
import { renderStepfamily } from './stepfamily.js';
import { renderLater, renderCity, renderNewage, renderLaterBlock } from './laterAge.js';
import { renderBirthPick, bindBirth, resetLooks, birthReady, birthValue } from './birth.js';
import { renderWilds, renderWildsNow, renderWildsBlock } from './wilds.js';
import { renderOmen, renderOmenNow } from './omen.js';
import { renderMysteryNow, renderMysteryBlock } from './mystery.js';
import { renderBeasts } from './beasts.js';
import { renderNature, renderNatureNow, natureRow, NATURE_ALARM } from './nature.js';
import { calamityAt } from '../nature/index.js';
import { renderPolitics, decorateMap, bindPolitics } from './politics.js';

// 시작 화면: 종족별 집안 (인간 집안은 race가 없다)
const familiesOf = (race) => FAMILIES.filter((f) => (f.race ?? 'human') === race);

let game = null;
const ui = {
  view: 'month', person: null, peopleFilter: 'all', plan: [], active: 0, outcome: null,
  setup: { mode: 'once', family: null, sex: 'm', name: '' },
  saves: {},
};
let unmountMap = null;
// 생애 책: 어디서든 [data-book] 단추로 연다 (한 번만 묶는다)
if (typeof document !== 'undefined') { initBook(() => game); initWays(() => game); }
let lastArt = null;   // 바로 전에 보인 풍경 (바뀌면 천천히 겹쳐 바꾼다)
let lastView = null;  // 바로 전 화면 (바뀌면 살짝 떠오르며 나타난다)
let ovFresh = false;  // 이번 그림에서 사건 창이 새로 열리나
let lastMonth = null; // 바로 전에 그린 달 (달이 바뀌면 이번 달 화면도 살짝 떠오른다)

// 폰 폭(860px 아래)이나 지도에서는 옆 '나' 칸이 CSS로 숨는데, 그래도 매달 통째로 그리고 있었다.
// 오래 한 판에서는 이 칸만 화면 요소 2천 개가 넘어 한 달 넘기기가 네 배 느려졌다 (31단계 헤드). 숨을 때는 아예 그리지 않는다.
const NARROW = '(max-width: 860px)';
// 탭을 옮기면 옆에서 밀려 들어온다 (오른쪽 탭이면 오른쪽에서)
const slideFrom = (a, b) => { const i = VIEWS.findIndex(([id]) => id === a), j = VIEWS.findIndex(([id]) => id === b); return i < 0 || j < 0 || i === j ? '' : j > i ? ' from-r' : ' from-l'; };
const narrow = () => { try { return matchMedia(NARROW).matches; } catch { return false; } };

export function start() {
  applyPrefs();
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyPrefs); } catch { /* 옛 브라우저 */ }
  try { matchMedia(NARROW).addEventListener('change', () => { if (game && document.querySelector('.wrap.game')) renderGame(); }); } catch { /* 옛 브라우저 */ }
  stopGuide();
  lastArt = null; lastView = null; lastMonth = null;
  renderSetup();
}

/* ---------- 시작 화면 ---------- */
const beginNote = (s) => `${s.family ? '' : '집안을 골라 주세요. '}${birthReady(s) ? '' : '큰 재능을 하나 골라 주세요. '}${s.name.trim() ? '' : '이름을 지어 주세요.'}`;
const TITLE_ART = { year: 500, month: 3 };
let titleArtReady = false;
function renderSetup() {
  const s = ui.setup;
  const auto = summary('auto');
  // 첫 화면 그림은 그리는 데 폰에서 0.15초쯤 걸린다. 글과 단추를 먼저 띄우고 그림은 바로 뒤에 채운다 (32단계 헤드).
  const art = titleArtReady ? sceneImage(TITLE_ART) : '';
  // 첫 그림은 화면이 한 번 그려진 뒤(다음 프레임)에 그린다: 폰에서 글과 단추가 먼저 보이게 (40단계 헤드)
  const afterPaint = (fn) => { try { requestAnimationFrame(() => setTimeout(fn, 0)); } catch { setTimeout(fn, 30); } };
  if (!titleArtReady) afterPaint(() => {
    titleArtReady = true;
    const url = sceneImage(TITLE_ART), ph = document.querySelector('.title-hero .hero-ph');
    if (url && ph) ph.outerHTML = `<img src="${url}" alt="${esc(VILLAGE)}의 이른 봄 풍경">`;
    // '이어 하기'를 누르면 바로 보일 풍경도 미리 그려 둔다
    if (auto?.scene && !auto.over) prewarmScene(auto.scene);
  });
  let races = [];
  try { races = playableRaces(); } catch (e) { console.error(e); }
  const race = s.race ?? 'human';
  const fams = races.length ? familiesOf(race) : FAMILIES;
  root().innerHTML = `
    <div class="title-hero">
      ${art ? `<img src="${art}" alt="${esc(VILLAGE)}의 이른 봄 풍경">` : '<div class="hero-ph" aria-hidden="true"></div>'}
      <div class="title-cap">
        <span class="eyebrow">용사력 500년 · ${esc(REGION)}</span>
        <h1>${esc(VILLAGE)}에서 태어나다</h1>
        ${crest('seal', 180)}
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
          ${renderRacePick(races, race)}
        </section>
        <section>
          <h2>태어날 집안${races.length > 1 ? ` <small>${esc(races.find((r) => r.id === race)?.name ?? '')} 집안 ${fams.length}곳</small>` : ''}</h2>
          ${renderFamilyPick(fams, s)}
        </section>
        ${renderBirthPick(s, race)}
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
        <div class="actions-row begin-bar">
          <button class="primary" id="begin" ${s.family && s.name.trim() && birthReady(s) ? '' : 'disabled'}>태어나기</button>
          <span class="note" id="begin-note">${beginNote(s)}</span>
        </div>
      </div>
    </div>`;

  $$('[data-mode]').forEach((b) => b.onclick = () => { s.mode = b.dataset.mode; renderSetup(); });
  $$('[data-family]').forEach((b) => b.onclick = () => { s.family = b.dataset.family; renderSetup(); });
  $$('[data-race]').forEach((b) => b.onclick = () => {
    if (s.race !== b.dataset.race) resetLooks(s);
    s.race = b.dataset.race;
    const fs = familiesOf(s.race);
    if (!fs.some((f) => f.id === s.family)) s.family = fs.length === 1 ? fs[0].id : null; // 집안이 하나뿐이면 바로 고른다
    renderSetup();
  });
  $$('[data-sex]').forEach((b) => b.onclick = () => { s.sex = b.dataset.sex; renderSetup(); });
  bindBirth(s, renderSetup);
  const input = $('#pname');
  input.oninput = () => {
    s.name = input.value;
    $('#begin').disabled = !(s.family && s.name.trim() && birthReady(s));
    $('#begin-note').textContent = beginNote(s);
  };
  $('#begin').onclick = () => {
    // 하던 삶은 지우지 않고 보관한다 (예전엔 한 번뿐인 삶을 새로 시작하면 하던 삶이 사라졌다)
    if (!shelveAuto()) { $('#begin-note').textContent = '저장 공간이 모자라 하던 삶을 보관할 수 없다. 위에서 안 쓰는 저장을 지워 주세요.'; return; }
    game = newGame({ name: s.name.trim(), sex: s.sex, familyId: s.family, mode: s.mode, birth: birthValue(s) });
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
  ui.plan = []; ui.active = 0; ui.pickedAct = null; ui.outcome = null; ui.person = null; ui.view = 'month';
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
      ${portrait(game, meP, { size: 84, bust: true, scars: p.scars ?? [], title: p.name })}
      <div>
        <h2>${esc(p.name)} ${esc(p.lastName)}</h2>
        <p>${age}살 ${months}개월${meP.agelessAt != null ? ` · 몸은 ${meP.agelessAt}살에 멈춤` : ''} · ${p.sex === 'm' ? '남' : '여'}</p>
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
    ${renderSpellbook(game, ui)}
    ${renderSwordbook(game)}
    ${renderDemongodBlock(game)}
    ${renderDelveBlock(game)}
    ${renderArtificeBlock(game)}
    ${renderCrownsBlock(game)}
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
    ${renderHeredityBlock(game)}
    ${renderAgelessBlock(game)}
    ${renderYouthBlock(game)}
    ${renderSchoolBlock(game)}
    ${renderOriginBlock(game)}
    ${renderDemonkindBlock(game)}
    ${renderLineageBlock(game)}
    ${renderElderBlock(game)}
    ${renderFarewellBlock(game)}
    ${renderHealthBlock(game)}
    ${renderReputeBlock(game)}
    ${renderTowerBlock(game)}
    ${renderRuinsBlock(game)}
    ${renderFaithBlock(game)}
    ${renderFoundingBlock(game)}
    ${renderCourtBlock(game)}
    ${renderOrderBlock(game)}
    ${renderEnvoyBlock(game)}
    ${renderClaimBlock(game)}
    ${renderRelicBlock(game)}
    ${renderSpiritBlock(game)}
    ${renderArmyBlock(game)}
    ${renderMountBlock(game)}
    ${renderCompanyBlock(game)}
    ${renderAftermathBlock(game)}
    ${renderWildsBlock(game)}
    ${renderMineBlock(game)}
    ${renderDragonBlock(game)}
    ${renderHauntBlock(game)}
    ${renderFarmBlock(game)}
    ${renderHerdBlock(game)}
    ${renderCuisineBlock(game)}
    ${renderApoBlock(game)}
    ${renderBrewBlock(game)}
    ${renderHarborBlock(game)}
    ${renderClothBlock(game)}
    ${renderBuilderBlock(game)}
    ${renderCarrierBlock(game)}
    ${renderHunterBlock(game)}
    ${renderSocietyBlock(game)}
    ${renderOccupiedBlock(game)}
    ${renderAdoptBlock(game)}
    ${renderBasebornBlock(game)}
    ${renderCreditBlock(game)}
    ${renderUndertakerBlock(game)}
    ${renderPrisonBlock(game)}
    ${renderSurveyBlock(game)}
    ${renderStarsBlock(game)}
    ${renderCloisterBlock(game)}
    ${renderOutlawsBlock(game)}
    ${renderDemonsBlock(game)}
    ${renderLaterBlock(game)}
    ${renderWorksBlock(game)}
    ${renderFrontierBlock(game)}
    ${renderRevoltBlock(game)}
    ${renderExileBlock(game)}
    ${renderSpyBlock(game)}
    ${renderManaBlock(game)}
    ${renderVocBlock(game)}
    ${renderArtsBlock(game)}
    ${renderTroupeBlock(game)}
    ${renderContestBlock(game)}
    ${renderMysteryBlock(game)}
    ${renderLawBlock(game)}
    ${renderSecretBlock(game)}
    ${renderHeistBlock(game)}
    ${renderBondageBlock(game)}
    ${renderPoorBlock(game)}
    ${renderHouseBlock(game)}
    ${renderInnBlock(game)}
    ${renderEstateBlock(game)}
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
  const rows = worldSummary(game).map((line) => {
    const i = line.indexOf(':');
    return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', line];
  });
  const seal = sealRow(game);
  if (seal) rows.push(seal);
  const nat = natureRow(game);
  if (nat) rows.push(nat);
  return rows;
}
const ALARM = new RegExp(`전쟁|내전|위독|붕괴|창궐|일촉즉발|집결|밀리는|흔들림|벼랑|마지막 고리|깨졌다|${NATURE_ALARM.source}`);
// 풍경 그림에 넘길 이 고장의 재앙 (src/nature)
function calamityNow() { try { return calamityAt(game); } catch (e) { console.error(e); return null; } }

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

// 이번 달 맨 위 '오늘의 장면' (src/ui/today.js). 글이 한 줄씩 드러나는 것은 달이 바뀐 첫 그림에서만.
function renderNews() {
  const key = `${game.player?.id}:${game.date.year * 12 + game.date.month}`;
  const reveal = revealOn() && ui.todaySeen !== key;
  ui.todaySeen = key;
  const rows = sameResults(game.lastResults).map(([r, n]) => `<li><b>${esc(r.name)}${n > 1 ? ` <small>×${n}</small>` : ''}</b><span class="scene-text">${esc(r.scene ?? r.text)}</span>${r.gains ? `<small class="gains">${esc(r.gains)}</small>` : ''}</li>`);
  // 넷 넘으면 셋만 펼쳐 두고 나머지는 접는다 (여러 달을 건너뛰면 수십 줄이라)
  const res = !rows.length ? '' : rows.length <= 4 ? `<ul class="results">${rows.join('')}</ul>`
    : `<ul class="results">${rows.slice(0, 3).join('')}</ul><details class="td-more"><summary>그 밖에 한 일 ${rows.length - 3}가지</summary><ul class="results">${rows.slice(3).join('')}</ul></details>`;
  return renderToday(game, { results: res, summary: summaryBody(ui.summary), world: renderWorldMini(), reveal });
}

// 같은 일을 같은 글로 여러 칸 했으면 한 줄로 (감옥에서 '견디기' 네 칸 같은 것)
function sameResults(list) {
  const out = [];
  for (const r of list) {
    const last = out[out.length - 1];
    if (last && last[0].name === r.name && (last[0].scene ?? last[0].text) === (r.scene ?? r.text) && !r.gains && !last[0].gains) last[1] += 1;
    else out.push([r, 1]);
  }
  return out;
}

function renderChron() {
  const tabs = `<div class="seg chron-tabs" role="tablist">
    <button role="tab" data-chron="me" aria-pressed="${ui.chronTab !== 'world' && ui.chronTab !== 'house'}">마을과 나</button>
    <button role="tab" data-chron="world" aria-pressed="${ui.chronTab === 'world'}">레오니아</button>
    <button role="tab" data-chron="house" aria-pressed="${ui.chronTab === 'house'}">가문</button>
  </div>`;
  if (ui.chronTab === 'world') return tabs + renderFoundingChron(game) + renderStarsChron(game) + renderWorld(game, ui);
  if (ui.chronTab === 'house') { try { return tabs + renderLegacy(game, ui); } catch (e) { console.error(e); } }
  return tabs + renderChronMe();
}

// 오래 산 삶에서는 기록이 수백 줄이라, 해마다 묶고 최근 두 해만 펼쳐 둔다. '내 일'만 골라 볼 수 있다.
const CHRON_F = [['all', '모두'], ['mine', '내 일'], ['town', '마을 소식']];
function renderChronMe() {
  const f = CHRON_F.some(([id]) => id === ui.chronFilter) ? ui.chronFilter : 'all';
  const all = game.chronicle ?? [];
  const pick = { all: () => true, mine: (c) => c.rel >= 100, town: (c) => !(c.rel >= 100) }[f];
  const items = all.filter(pick);
  const seg = `<div class="seg filters ch-filter" role="group" aria-label="보기">${CHRON_F.map(([id, name]) => `<button data-chronf="${id}" aria-pressed="${f === id}">${name}</button>`).join('')}</div>`;
  const mineN = (list) => { const n = list.filter((c) => c.rel >= 100).length; return f === 'all' && n ? ` · 내 일 ${n}` : ''; };
  const body = yearFold(items, (c) => `<li class="${c.rel >= 100 ? 'mine' : ''}"><time>${c.m}월</time><span>${esc(c.text)}</span></li>`, { count: mineN });
  return `<section class="card chron-card"><h2>연대기 <small>${esc(yearSpan(all) || '마을과 나의 기록')}</small></h2>
    ${all.length > 12 ? seg : ''}
    ${body || '<p class="note">아직 이 칸에 적힌 일이 없다.</p>'}
  </section>`;
}

// 카드가 많은 화면 맨 위의 '바로 가기' 줄: 있는 카드가 넷 이상이면 단다. 각 카드의 첫 <section>에 id를 붙인다.
// after: 앞의 몇 카드는 바로 가기 줄 위에 둔다(지도 화면은 지도가 먼저).
function withJump(parts, { after = 0 } = {}) {
  const has = (html) => !!html && html.includes('<section');
  const html = (list) => list.map(([id, , h]) => (has(h) ? h.replace('<section', `<section id="jp-${id}"`) : h ?? '')).join('');
  const have = parts.slice(after).filter(([, , h]) => has(h));
  if (have.length < 4) return html(parts);
  const nav = `<nav class="act-jump view-jump" aria-label="바로 가기">${have.map(([id, name]) => `<button class="ghost sm" data-view-jump="${id}">${esc(name)}</button>`).join('')}</nav>`;
  return html(parts.slice(0, after)) + nav + html(parts.slice(after));
}

// '나' 화면 바로 가기: 덩이가 여덟 넘으면 이름 줄 아래에 단다. 덩이의 첫 제목 글을 짧게 줄여 쓴다.
// 이번 달 화면: 한 줄짜리 알림 카드(…-now 카드 안에 note 한 줄)가 여럿이면 한 카드로 모은다.
// 큰 카드(재판, 밑바닥, 병 같은)는 그대로 두고, 모은 카드는 첫 한 줄 카드가 있던 자리에 놓는다.
const ONE_LINE = /^\s*<section class="card ([\w-]+-now)"><p class="note">([\s\S]*)<\/p><\/section>\s*$/;
function nowCards(parts) {
  const lines = parts.map((h) => (h ? ONE_LINE.exec(h) : null));
  if (lines.filter(Boolean).length < 2) return parts.join('');
  const first = lines.findIndex(Boolean);
  const merged = `<section class="card now-notes">${lines.filter(Boolean).map((m) => `<p class="note ${m[1]}">${m[2]}</p>`).join('')}</section>`;
  return parts.map((h, i) => (i === first ? merged : lines[i] ? '' : h)).join('');
}

const SHEET_SHORT = { '늙음과 마지막 해들': '늙음', '내기와 겨루기': '내기', '풀리지 않은 일': '미제', '연구와 발명': '연구', '글과 예술': '예술', '병과 의술': '병', '내 집 마련': '집', '법과 재판': '법', '학원과 시험': '학원', '밑바닥 삶': '밑바닥', '내 가게': '가게', '마물 사냥': '마물', '용병단과 깃발': '용병단', '광산과 땅 밑': '광산', '사슬과 자유': '사슬', '무대와 재주': '무대', '전쟁 뒤': '전쟁 뒤', '몸과 마음': '몸과 마음', '집과 재산': '재산', '어린 시절': '어린 시절', '가문의 내력': '가문', '망자와 저주': '저주', '목축과 유목': '목축', '봉기와 반란': '봉기', '요리사의 길': '요리', '유배와 망명': '유배', '첩보와 밀정': '첩보', '마나의 흐름': '마나', '숨은 왕가의 피': '왕가의 피', '약초와 약방': '약방', '성유물': '성유물', '늙지 않는 몸': '불로', '타고남과 핏줄': '핏줄', '스스로 고른 끝': '마지막', '정령': '정령', '양조장': '양조', '사절과 볼모': '사절', '유적과 고대 마법': '유적', '기사단': '기사단', '내 나라': '내 나라', '하늘 기수': '하늘 기수', '뱃일': '뱃일', '태어난 집안': '집안', '옷감과 바느질': '바느질', '마족': '마족', '새 시대': '새 시대', '목수와 석공': '목수', '길 위의 일': '길', '사교계': '사교계', '점령 아래에서': '점령', '사냥': '사냥', '산적': '산적', '빚과 돈놀이': '빚', '장의사와 묘지기': '장의', '서자와 혼외 자식': '서자', '측량과 지도': '측량', '별 공부': '별', '옥살이': '옥살이', '수도원과 은둔': '수도원', '거둔 아이와 거둔 집': '거둔 아이', '내 주문서': '주문서', '내 검술 수첩': '검술', '마신의 조각': '마신', '마왕 아래': '마왕', '미궁 공략': '미궁', '남의 나라 궁정': '궁정', '마도구 장인': '마도구' };
function sheetJump() {
  const sheet = document.querySelector('.sheet:not(.side)');
  if (!sheet || sheet.querySelector('.view-jump')) return;
  const blocks = [...sheet.querySelectorAll(':scope > .block')].filter((b) => b.querySelector('h3'));
  if (blocks.length < 8) return;
  const items = blocks.map((b, i) => {
    const h = b.querySelector('h3');
    const t = (h.firstChild?.textContent ?? h.textContent).trim().replace(/\s+/g, ' ');
    b.id = `jp-me${i}`;
    return [`me${i}`, SHEET_SHORT[t] ?? (t.length > 6 ? t.split(' ')[0] : t)];
  });
  const nav = document.createElement('nav');
  nav.className = 'act-jump view-jump sheet-jump';
  nav.setAttribute('aria-label', '바로 가기');
  nav.innerHTML = items.map(([id, name]) => `<button class="ghost sm" data-view-jump="${id}">${esc(name)}</button>`).join('');
  sheet.querySelector('.who')?.after(nav);
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
  const sceneArgs = { year: game.date.year, month: game.date.month, famine: !!game.world?.famine, plague: !!game.world?.plague, place: L(game).place, calamity: calamityNow(), techs: techsOf(game) };
  game.sceneArgs = sceneArgs; // 저장에 같이 남아, 다음에 켤 때 처음 화면이 떠 있는 동안 이 풍경을 미리 그린다 (32단계 헤드)
  const art = sceneImage(sceneArgs);
  // 38단계: 사건에 나오는 사람이 있으면(ctx의 id, 글에 이름이 나올 때만) 삽화 위에 반신 초상
  const who = (() => { try { const c = e?.ctx ?? {}; for (const k of ['id', 'pid', 'who', 'target']) { const q = typeof c[k] === 'number' ? byId(game, c[k]) : null; if (q && q !== me(game) && q.name && `${e.title} ${e.text}`.includes(q.name)) return q; } } catch (err) { console.error(err); } return null; })();
  const whoHtml = who ? `<span class="ev-who">${portrait(game, who, { size: 88, bust: true, title: who.name })}<b>${esc(who.name)}</b></span>` : '';
  const head = art ? `<div class="ev-art${who ? ' has-who' : ''}" aria-hidden="true"><i style="background-image:url(${art})"></i>${whoHtml}</div>` : '';
  // 한 줄씩 드러나기: 이 창을 처음 그릴 때만 (다시 그리면 바로 다 보인다)
  const key = ui.outcome ? `o:${ui.outcome.title}:${String(ui.outcome.text).length}` : `e:${e.id}:${e.title}:${game.date.year * 12 + game.date.month}`;
  const rv = revealOn() && ui.evSeen !== key ? ' rv' : '';
  ui.evSeen = key;
  let rvBase = 0;
  if (ui.outcome) {
    return `<div class="overlay${ovFresh ? ' fresh' : ''}"><div class="event${rv}" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      ${head}
      <div class="ev-body">
        <span class="eyebrow">용사력 ${game.date.year}년 ${monthInfo(game).name} · 그 뒤</span>
        <h2 id="ev-title">${esc(ui.outcome.title)}</h2>
        ${(() => { const r = splitResult(String(ui.outcome.text ?? '')); const t = revealSpans(r.scene); rvBase = t.n * t.step; return `<p class="outcome">${t.html}</p>${r.gains ? `<p class="gains ln" style="--ln:${t.n};--st:${t.step}s">${esc(r.gains)}</p>` : ''}`; })()}
        <div class="opts" style="--base:${rvBase.toFixed(2)}s"><button class="primary" id="ev-close">계속</button></div>
      </div>
    </div></div>`;
  }
  const t = revealSpans(e.text);
  rvBase = t.n * t.step;
  return `<div class="overlay${ovFresh ? ' fresh' : ''}"><div class="event${rv}" role="dialog" aria-modal="true" aria-labelledby="ev-title">
    ${head}
    <div class="ev-body">
      <span class="eyebrow">용사력 ${game.date.year}년 ${monthInfo(game).name} · 사건</span>
      <h2 id="ev-title">${esc(e.title)}</h2>
      <p class="ev-text">${t.html}</p>
      ${heirReview()}
      ${divider('diamond')}
      <div class="opts" style="--base:${rvBase.toFixed(2)}s">${e.choices.map((c, i) => `<button class="opt" data-choice="${i}" style="--i:${i}"><span class="n">${i + 1}</span><span>${esc(c)}</span></button>`).join('')}</div>
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
    <p>${esc(J(game.player.name, '은/는'))} ${rec?.age ?? playerAge(game)}살에 세상을 떠났다. ${esc(me(game).deathCause ?? '')}</p>
    <p class="note">${lineage(game).length > 2 ? `${L(game).gen}대에 걸친 집안의 이야기가 여기서 끝난다.` : ''} 뒤를 이을 핏줄이 없어 대가 끊겼다.</p>
    ${review}
    <div class="actions-row"><button class="ghost" id="to-house">가문 기록 보기</button><button class="primary" id="to-title">처음 화면으로</button></div>
  </section>`;
}

// '지금 이 순간' 맨 아래 띠: 내 초상과 이름·나이·일, 몸과 마음 한눈에. 누르면 '나' 화면
function heroStrip() {
  const p = game.player, meP = me(game);
  const job = (() => { try { return jobTitle(game); } catch { return ''; } })();
  const hurt = p.injuries?.length ?? 0;
  const meter = (k, v, warn) => `<span class="hm${warn ? ' warn' : ''}"><span>${k}</span><i><b style="width:${Math.max(0, Math.min(100, v))}%"></b></i></span>`;
  return `<button class="hero-me" id="hero-me" aria-label="나 보기">
    <span class="hm-face">${portrait(game, meP, { size: 56, scars: p.scars ?? [], ring: '#c9a25a', title: p.name })}${medallion({ size: 66 })}</span>
    <span class="hm-txt"><b>${esc(p.name)}</b><span>${playerAge(game)}살${job ? ` · ${esc(job)}` : ''}</span></span>
    <span class="hm-meters">${meter('피로', p.fatigue, p.fatigue > 70)}${meter('마음', 100 - p.stress, p.stress > 70)}${hurt ? `<span class="hm-hurt">다침 ${hurt}</span>` : ''}</span>
  </button>`;
}

// 38단계 장식 그림(src/art/ornament.js)의 기본 틀을 한 번만 붙인다
if (typeof document !== 'undefined' && !document.getElementById('orn-css')) document.head.insertAdjacentHTML('beforeend', `<style id="orn-css">${ORNAMENT_CSS}
${['.layout.view-people .card', '.layout.view-chron .card:not(.chron-card)', '.sheet:not(.side)', '.setup > section', '.layout.view-save .card', '.layout.view-map .card:not(.mapcard)'].map((selector) => frameCss({ selector, kind: 'knot', size: 26, color: '#a8843f', inset: 4 })).join('\n')}
${frameCss({ selector: '.layout.view-chron .chron-card', kind: 'leaf', size: 30, color: '#7a5524', inset: 6 })}</style>`);

const VIEWS = [
  ['month', '이번 달', 'scroll'],
  ['me', '나', 'body'],
  ['people', '사람들', 'visit'],
  ['map', '지도', 'wander'],
  ['chron', '연대기', 'book'],
  ['save', '설정', 'gear'],
];

// 탭 차례: '나'는 좁은 화면에서만 아래 탭에 있다
const tabOrder = () => VIEWS.filter(([id]) => id !== 'me' || narrow());
function stepView(dir) {
  const list = tabOrder(), i = list.findIndex(([id]) => id === ui.view);
  return i < 0 ? null : list[i + dir] ?? null;
}
function goView(id) {
  if (!game || id === ui.view) return;
  ui.view = id; ui.saves = {}; renderGame(); window.scrollTo({ top: 0 });
}
installTouch({
  canSwipe: () => !!(game && !game.over && !game.pendingEvent && !ui.outcome && document.querySelector('.layout > .main') && !document.querySelector('.overlay, .month-card, .guide-bubble, .book-ov, .ways-ov')),
  neighbor: (dir) => { const v = stepView(dir); return v ? { id: v[0], name: v[1], icon: icon(v[2], 22) } : null; },
  go: (dir) => { const v = stepView(dir); if (v) goView(v[0]); },
});

let roomTimer = null;
function paintRoomLater(args, monthKey, roomName) {
  if (typeof setTimeout === 'undefined') return;
  if (roomTimer) clearTimeout(roomTimer);
  const later = (fn) => { try { requestAnimationFrame(() => { roomTimer = setTimeout(fn, 160); }); } catch { roomTimer = setTimeout(fn, 160); } };
  roomTimer = null;
  later(() => {
    roomTimer = null;
    if (!game || game.date.year * 12 + game.date.month !== monthKey) return;
    let url = '';
    try { url = interiorImage(args); } catch (e) { console.error(e); }
    const img = document.querySelector('header.scene .scene-pic img:not(.prev)');
    if (!url || !img || lastMonth !== monthKey) return;
    if (!reducedMotion()) { img.classList.remove('xfade'); void img.offsetWidth; img.classList.add('xfade'); }
    img.src = url; img.alt = img.alt.replace(/ 풍경:/, ` ${roomName}:`);
    lastArt = url;
  });
}

function renderGame() {
  if (unmountMap) { unmountMap(); unmountMap = null; }
  const monthKey = game.date.year * 12 + game.date.month;
  ovFresh = !document.querySelector('.overlay:not(.out)'); // 사건 창이 새로 열리면 어둠이 깔리며 (창 안 글만 바뀌면 그대로)
  const mi = monthInfo(game);
  const p = game.player;
  const sceneArgs = { year: game.date.year, month: game.date.month, famine: !!game.world?.famine, plague: !!game.world?.plague, place: L(game).place, calamity: calamityNow(), techs: techsOf(game) };
  game.sceneArgs = sceneArgs; // 저장에 같이 남아, 다음에 켤 때 처음 화면이 떠 있는 동안 이 풍경을 미리 그린다 (32단계 헤드)
  // 38단계: 이번 달 한 일이 실내 쪽이면 머리 그림을 실내로 (길 위·재앙 든 달은 바깥 풍경, 도우미4 sceneInterior.js)
  const room = (() => { try { return sceneFor(game, sceneArgs.calamity); } catch (e) { console.error(e); return null; } })();
  // 실내 그림은 그려 둔 것만 바로 쓰고, 없으면 바깥 풍경을 먼저 띄운 뒤 화면 뒤에서 그려 바꿔 끼운다 (39단계 헤드: 폰에서 달 넘기기 270ms → 가볍게)
  const roomArgs = room ? { kind: room.kind, year: sceneArgs.year, month: sceneArgs.month, place: sceneArgs.place } : null;
  const roomArt = roomArgs ? (() => { try { return interiorCached(roomArgs); } catch (e) { console.error(e); return ''; } })() : '';
  const art = roomArt || sceneImage(sceneArgs);
  let main = '';
  if (ui.view === 'month') main = game.over ? renderOver() : renderCrisis(game) + renderNews() + nowCards([renderPrisonNow(game), renderBondageNow(game), renderMigrateNow(game), renderExileNow(game), renderLawNow(game), renderSecretNow(game), renderEnvoyNow(game), renderSpyNow(game, ui), renderHeistNow(game, ui), renderClaimNow(game, ui), renderRevoltNow(game), renderPoorNow(game), renderArmyNow(game), renderAftermathNow(game), renderDragonNow(game), renderHauntNow(game), renderExploreNow(game), renderFrontierNow(game), renderWildsNow(game), renderMineNow(game), renderHerdLine(game), renderTradeNow(game), renderWorksNow(game), renderNatureNow(game), renderManaNow(game), renderRelicNow(game), renderAgelessNow(game), renderSpiritNow(game), renderHealthNow(game), renderMysteryNow(game), renderOmenNow(game), renderLineageNow(game), renderSchoolNow(game), renderTroupeNow(game)]) + renderYouthCard(game, ui) + renderCompanyNow(game, ui) + renderFarmNow(game, ui) + renderHerdNow(game, ui) + renderCuisineNow(game, ui) + renderApoNow(game, ui) + renderBrewNow(game, ui) + renderHarborNow(game, ui) + renderClothNow(game, ui) + renderBuilderNow(game, ui) + renderCarrierNow(game, ui) + renderCreditNow(game, ui) + renderUndertakerNow(game, ui) + renderSurveyNow(game, ui) + renderMagejobNow(game, ui) + renderHunterNow(game, ui) + renderInnNow(game, ui) + renderWorkshop(game, ui) + renderPlan(game, ui);
  else if (ui.view === 'me') main = renderSheet();
  else if (ui.view === 'people') main = withJump([['tree', '족보', renderFamTree(game)], ['love', '사랑', renderLove(game)], ['kin', '자식', renderKin(game)], ['siblings', '형제', renderSiblings(game)], ['stepfamily', '새 식구', renderStepfamily(game)], ['adopt', '거둔 아이', renderAdopt(game)], ['baseborn', '서자', renderBaseborn(game)], ['friends', '벗', renderFriends(game)], ['peers', '같은 세대', renderPeers(game)], ['society', '사교계', renderSociety(game)], ['oath', '맹세', renderOath(game)], ['household', '식솔', renderHousehold(game)], ['troupe', '극단', renderTroupe(game)], ['letters', '편지', renderLetters(game)], ['village', '이웃', renderVillage(game)], ['aftermath', '전쟁 뒤', renderAftermath(game)], ['mentor', '제자', renderMentor(game)], ['beasts', '짐승', renderBeasts(game)], ['mount', '하늘 짐승', renderMountCard(game)], ['feud', '원한', renderFeud(game)], ['peoples', '종족의 땅', renderPeoples(game)], ['party', '동료', renderParty(game)], ['notebook', '인물 수첩', renderPeople(game, ui)]]);
  else if (ui.view === 'map') main = withJump([['map', '지도', renderMap()], ['pol', '대륙 정세', renderPolitics(game, ui)], ['lands', '고장들', renderLandsMap(game)], ['crowns', '왕좌', renderCrownsMap(game)], ['occupied', '점령지', renderOccupied(game)], ['migrate', '피난', renderMigrate(game)], ['outlaws', '산적', renderOutlaws(game)], ['founding', '새 나라', renderFoundings(game)], ['revolt', '민심', renderRevolt(game)], ['later', '새 기술', renderLater(game)], ['spread', '기술의 길', renderSpread(game)], ['city', '공장 거리', renderCity(game)], ['newage', '새 시대', renderNewage(game)], ['trade', '장사 길', renderTrade(game)], ['works', '큰 공사', renderWorks(game)], ['nature', '하늘과 땅', renderNature(game)], ['explore', '미지의 땅', renderExplore(game)], ['survey', '지도 공방', renderSurveyMap(game)], ['stars', '하늘', renderStarsMap(game)], ['ruins', '유적', renderRuins(game)], ['frontier', '변경 너머', renderFrontier(game)], ['wilds', '마물', renderWilds(game)], ['mine', '광산', renderMines(game)], ['herd', '목축', renderHerd(game)], ['seal', '봉인', renderSeal(game)], ['demonland', '마대륙', renderDemonland(game)], ['demons', '마족', renderDemons(game)], ['orders', '기사단', renderOrders(game)], ['cloister', '수도원', renderCloisters(game)], ['mana', '마나', renderMana(game)], ['dragon', '용', renderDragon(game)], ['haunt', '망자', renderHaunt(game)], ['omen', '예언', renderOmen(game)], ['delve', '미궁', renderDelveMap(game)], ['deep', '구렁', renderDeep(game)], ['sea', '바다', renderSea(game)], ['harbor', '포구', renderHarbor(game)], ['world', '레오니아', renderWorldCard()]], { after: 1 }); // 지도가 먼저 (폰에서 바로 보이게), 바로 가기는 지도 아래
  else if (ui.view === 'chron') main = renderChron();
  else if (ui.view === 'save') main = renderSave();
  const hero = ui.view === 'month';
  const viewName = VIEWS.find(([id]) => id === ui.view)?.[1] ?? '';
  root().innerHTML = `
    <header class="scene ${hero ? 'hero' : 'slim'}">
      <div class="scene-pic">
      ${art && lastArt && lastArt !== art && !reducedMotion() ? `<img class="prev" src="${lastArt}" alt="" aria-hidden="true">` : ''}
      ${art ? `<img class="${lastArt && lastArt !== art ? 'xfade' : ''}" src="${art}" alt="${esc(placeName(game))} ${roomArt ? ROOM_NAME[room.kind] ?? '안' : '풍경'}: ${mi.season}, ${esc(conditionText(game.date.year, game.date.month))}">` : ''}
      ${hero ? `<div class="hero-place"><span>${esc(placeName(game))}</span></div>` : ''}
      <div class="scene-cap">
        ${hero ? '' : `<h1 class="view-title">${esc(viewName)}</h1>`}
        <div class="date"><span class="yr">용사력 ${game.date.year}년</span><strong>${mi.name}</strong><span class="cond">${mi.season} · ${esc(conditionText(game.date.year, game.date.month))}</span></div>
        <div class="purse"><span>내 돈 <b>은화 ${p.money}</b></span><span>집안 돈 <b>은화 ${p.familyMoney}</b></span></div>
      </div>
      </div>
      ${hero && !game.over ? heroStrip() : ''}
    </header>
    <nav class="nav" aria-label="화면">
      ${VIEWS.map(([id, name, ic]) => `<button data-view="${id}" class="${id === 'me' ? 'only-narrow' : ''}" aria-current="${ui.view === id ? 'page' : 'false'}">${icon(ic, 20)}<span>${name}</span></button>`).join('')}
    </nav>
    <div class="wrap game">
      <div class="layout view-${ui.view}">
        ${ui.view === 'me' || ui.view === 'map' || narrow() ? '' : renderSheet().replace('class="sheet"', 'class="sheet side"')}
        <div class="main${lastView !== ui.view || (ui.view === 'month' && lastMonth !== monthKey) ? ` enter${slideFrom(lastView, ui.view)}` : ''}">${main}</div>
      </div>
    </div>
    ${game.over ? '' : renderEvent()}`;
  lastArt = art; lastView = ui.view; lastMonth = monthKey;
  if (roomArgs && !roomArt) paintRoomLater(roomArgs, monthKey, ROOM_NAME[room.kind] ?? '안');
  if (!game.over) { const ny = game.date.month === 12 ? game.date.year + 1 : game.date.year, nm = game.date.month === 12 ? 1 : game.date.month + 1; prewarmScene({ year: ny, month: nm, famine: game.world?.famine, plague: game.world?.plague, place: L(game).place, calamity: calamityNow(), techs: techsOf(game) }); }
  bindGame();
  if (ui.view === 'map') {
    const host = $('#map-host');
    if (host) {
      const um = mountMap(host, { here: L(game).place, game, onChange: () => renderGame() });
      const ud = decorateMap(host, game, ui);
      unmountMap = () => { ud(); um(); };
    }
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
  if (slotsFor(game)) { ui.lastPlan = ui.plan.map((c) => ({ ...c })); noteActUse(game, ui.plan); }
  ui.tplNote = null;
  for (let k = 0; k < times; k++) {
    passed++;
    endMonth(game, slotsFor(game) ? ui.plan.map((c) => ({ ...c })) : []);
    if (game.pendingEvent || game.over) break;
    if (untilEvent && slotsFor(game) > 0) break;
  }
  ui.active = 0; ui.pickedAct = null;
  try { ui.summary = snap && !game.over ? diffSummary(game, snap) : null; } catch (e) { console.error(e); ui.summary = null; }
  document.querySelectorAll('.month-card').forEach((x) => x.remove());
  showMonthCard(before, passed);
  renderGame();
  window.scrollTo({ top: 0 });
  autosaveSoon(game);
}

function bindGame() {
  const rerender = () => renderGame();
  const go = $('#go');
  if (go) go.onclick = () => advance(1);
  const hm = $('#hero-me');
  if (hm) hm.onclick = () => { ui.view = 'me'; renderGame(); window.scrollTo({ top: 0 }); };
  const skip = $('#skip');
  if (skip) skip.onclick = () => advance(36, true);
  const s3 = $('#skip3');
  if (s3) s3.onclick = () => advance(3);
  bindPlan(game, ui, rerender);
  bindPeople(game, ui, rerender);
  bindPolitics(ui, rerender);
  bindWorld(game, ui, rerender);
  const ws = $('details.ws-own'); // 다른 접는 카드도 .workshop 모양을 빌려 쓰니 내 일터만 따로 잡는다
  if (ws) ws.ontoggle = () => { ui.wsOpen = ws.open; };
  const sp = $('details.spy-card');
  if (sp) sp.ontoggle = () => { ui.spyOpen = sp.open; };
  const hz = $('details.heist-card');
  if (hz) hz.ontoggle = () => { ui.heistOpen = hz.open; };
  const fm = $('details.farm-card');
  if (fm) fm.ontoggle = () => { ui.farmOpen = fm.open; };
  const cl = $('details.claim-card');
  if (cl) cl.ontoggle = () => { ui.claimOpen = cl.open; };
  const hb = $('details.hb-card');
  if (hb) hb.ontoggle = () => { ui.hbOpen = hb.open; };
  const huc = $('details.hu-card');
  if (huc) huc.ontoggle = () => { ui.huOpen = huc.open; };
  const crc = $('details.cr-card');
  if (crc) crc.ontoggle = () => { ui.crOpen = crc.open; };
  // 족보 나무가 넓으면 '나'가 가운데 오게
  const fts = $('.ftree-scroll'), ftm = fts?.querySelector('.ftn.me');
  if (fts && ftm && fts.scrollWidth > fts.clientWidth) { const r = ftm.getBoundingClientRect(), c = fts.getBoundingClientRect(); fts.scrollLeft += r.left + r.width / 2 - (c.left + c.width / 2); }
  document.querySelectorAll('details.sp-school').forEach((d) => { d.ontoggle = () => { if (d.open) ui.spOpen = d.dataset.sp; else if (ui.spOpen === d.dataset.sp) ui.spOpen = ''; }; });
  const mjc = $('details.mj-card');
  if (mjc) mjc.ontoggle = () => { ui.mjOpen = mjc.open; };
  const svc = $('details.sv-card');
  if (svc) svc.ontoggle = () => { ui.svOpen = svc.open; };
  const utc = $('details.ut-card');
  if (utc) utc.ontoggle = () => { ui.utOpen = utc.open; };
  const cac = $('details.ca-card');
  if (cac) cac.ontoggle = () => { ui.caOpen = cac.open; };
  const bdc = $('details.bd-card');
  if (bdc) bdc.ontoggle = () => { ui.bdOpen = bdc.open; };
  const clc = $('details.cl-card');
  if (clc) clc.ontoggle = () => { ui.clOpen = clc.open; };
  const br = $('details.brew-card');
  if (br) br.ontoggle = () => { ui.brewOpen = br.open; };
  const ap = $('details.apo-card');
  if (ap) ap.ontoggle = () => { ui.apoOpen = ap.open; };
  const hd = $('details.herd-card');
  if (hd) hd.ontoggle = () => { ui.herdOpen = hd.open; };
  const cu = $('details.cu-card');
  if (cu) cu.ontoggle = () => { ui.cuOpen = cu.open; };
  const co = $('details.co-card');
  if (co) co.ontoggle = () => { ui.coOpen = co.open; };
  const inn = $('details.inn-card');
  if (inn) inn.ontoggle = () => { ui.innOpen = inn.open; };
  const yt = $('details.youth');
  if (yt) yt.ontoggle = () => { ui.ytOpen = yt.open; };
  $$('[data-ws-person]').forEach((b) => b.onclick = () => { ui.view = 'people'; ui.person = +b.dataset.wsPerson; renderGame(); window.scrollTo({ top: 0 }); });
  $$('[data-chron]').forEach((b) => b.onclick = () => { ui.chronTab = b.dataset.chron; renderGame(); });
  $$('[data-chronf]').forEach((b) => b.onclick = () => { ui.chronFilter = b.dataset.chronf; renderGame(); });
  if (ui.view === 'me') sheetJump();
  $$('[data-view-jump]').forEach((b) => b.onclick = () => document.getElementById(`jp-${b.dataset.viewJump}`)?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }));
  $$('[data-legacy]').forEach((b) => b.onclick = () => { ui.legacySel = b.dataset.legacy === 'close' ? null : +b.dataset.legacy; renderGame(); if (ui.legacySel != null) document.querySelector('.lr-detail')?.scrollIntoView({ block: 'start' }); });
  const la = $('[data-legacy-all]');
  if (la) la.onclick = () => { ui.legacyAll = true; renderGame(); };
  const th = $('#to-house');
  if (th) th.onclick = () => { ui.view = 'chron'; ui.chronTab = 'house'; renderGame(); window.scrollTo({ top: 0 }); };
  bindSettings(rerender, () => { ui.view = 'month'; renderGame(); window.scrollTo({ top: 0 }); });
  $$('[data-view]').forEach((b) => b.onclick = () => { if (b.dataset.view === ui.view) { window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); return; } goView(b.dataset.view); });
  bindSaves(ui.saves, { rerender, game });
  const tt = $('#to-title');
  if (tt) tt.onclick = () => { closeBook(); closeWays(); game = null; if (unmountMap) { unmountMap(); unmountMap = null; } document.querySelectorAll('.month-card').forEach((x) => x.remove()); start(); };
  $$('[data-choice]').forEach((b) => b.onclick = () => {
    const title = game.pendingEvent.title;
    const text = resolveEvent(game, rngOf(game), +b.dataset.choice);
    ui.outcome = { title, text };
    renderGame();
    autosaveSoon(game);
  });
  const ec = $('#ev-close');
  if (ec) ec.onclick = () => {
    ui.outcome = null;
    // 창이 스르르 걷힌 뒤 다음 화면 (움직임을 줄였으면 바로)
    const ov = $('.overlay');
    if (ov && smoothOn() && !game.pendingEvent) { ov.classList.add('out'); ec.disabled = true; setTimeout(() => { if (game) renderGame(); }, 200); }
    else renderGame();
  };
  // 한 줄씩 드러나는 중에 글을 누르면 바로 다 보인다
  $$('.rv').forEach((el) => el.addEventListener('click', (ev) => { if (!ev.target.closest('button, a, summary, input')) el.classList.add('done'); }));
  const firstOpt = $('.event .opt, #ev-close');
  if (firstOpt) firstOpt.focus({ preventScroll: true });
}
