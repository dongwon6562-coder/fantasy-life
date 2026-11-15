// 사건 삽화: 큰 사건이 뜰 때 사건 창 위쪽 그림 칸(.ev-art)에 그 장면의 그림 한 장을 얹는다.
// 규칙은 건드리지 않는다. 떠 있는 사건을 읽기만 하고, 스스로 화면에 붙는다 (전투 연출과 같은 방식).
//
//   vignetteImage(spec) → 그림 주소 (없으면 '')
//     spec: { plate, variant?, year, month, place, me?, other?, seed? }
//       plate   : wedding funeral birth muster square plague monsters famine fire prison voyage court festival chapel dragon road bedside ritual
//       me/other: 게임 속 사람 (머리·옷 빛깔과 성별·나이를 읽는다). 없어도 된다.
//   vignetteFor(game, { title, text, outcome }) → spec 또는 null : 지금 뜬 사건에 어울리는 그림
//
// 그림은 한 번 그려 JPEG로 바꿔 두고(작은 캔버스는 바로 비운다) 여덟 장까지만 기억한다.
// 전투 연출(.fl-battle)이 붙은 창에는 얹지 않는다.
import { HOOKS } from '../hooks.js';
import { rng, strSeed, canvasUrl, dropUrl } from './sceneKit.js';
import { conditions } from './scene.js';
import { describe } from './scenePlaces.js';
import { skyOf } from './sceneSky.js';
import { paletteOf } from './sceneLand.js';
import { VW, VH, toner, lookFor } from './vignetteKit.js';
import { PLATES } from './vignettePlates.js';

const hasDom = typeof document !== 'undefined';
const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };
const SCALE = 1.5; // 그리는 크기: 960x360

/* ---------- 그리기 ---------- */
// 판마다 당겨 그릴 중심(x)과 배율
const FOCUS = { wedding: [410, 1.15], funeral: [330, 1.2], birth: [300, 1.1], muster: [380, 1.25], square: [330, 1.15], plague: [330, 1.25], monsters: [330, 1.2], famine: [330, 1.15], fire: [300, 1.25], prison: [380, 1.15], voyage: [330, 1.15], court: [400, 1.1], festival: [320, 1.3], chapel: [330, 1.1], dragon: [320, 1], road: [300, 1.25], bedside: [330, 1.15], ritual: [320, 1.2] };
const cache = new Map();
export function vignetteImage(spec) {
  if (!hasDom || !spec || !PLATES[spec.plate]) return '';
  const year = spec.year ?? 505, month = spec.month ?? 6, place = spec.place ?? 'ern';
  const me = lookFor(spec.me, 11), other = lookFor(spec.other, (spec.seed ?? 5) + 17);
  if (!spec.other) other.female = !me.female;
  const key = [spec.plate, spec.variant ?? '', year, month, place, spec.seed ?? 0, me.hair, me.cloth, me.female, Math.floor(me.age / 10), other.hair, other.cloth].join('|');
  if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    const D = describe(place), k = year * 12 + month;
    const c = conditions(year, month);
    const weather = c.weather === 'snow' && D.biome === 'island' ? 'rain' : c.weather;
    const S = skyOf(c.tod, weather, D.biome, k), P = paletteOf(month, D.biome, !!spec.famine);
    const cv = document.createElement('canvas'); cv.width = VW * SCALE; cv.height = VH * SCALE;
    const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE);
    const seed = (strSeed(spec.plate + (spec.variant ?? '')) ^ (D.seed * 7 + (spec.seed ?? 0) * 131)) >>> 0;
    // 작은 화면에서도 사람이 보이도록 판마다 정해 둔 곳을 중심으로 조금 당겨 그린다
    const [fx, fk] = FOCUS[spec.plate] ?? [320, 1.15];
    ctx.translate(fx, VH); ctx.scale(fk, fk); ctx.translate(-fx, -VH);
    PLATES[spec.plate]({ ctx, S, P, D, R: rng(seed), t: toner(S), q: D.seed % 89, k, month, year, me, other, variant: spec.variant ?? null });
    url = canvasUrl(cv, 'image/jpeg', 0.86);
  } catch { url = ''; }
  if (!url) return '';
  while (cache.size >= 8) { const [k0, old] = cache.entries().next().value; cache.delete(k0); dropUrl(old); }
  cache.set(key, url);
  return url;
}

/* ---------- 어느 사건에 어느 그림인가 ---------- */
// 사건 id로 바로 정해지는 것. 값: 'plate' 또는 'plate:variant'
const BY_ID = {
  rel_heartbreak: 'wedding:far',
  ch_first_death: 'funeral', ch_grave_visit: 'funeral:visit', king_mourning: 'funeral:state', later_old_friend_dies: 'funeral', legend_death_news: 'funeral:visit', adult_inheritance: 'funeral:visit', chain_war_return: 'funeral:visit',
  sibling_born: 'birth', later_grandchild: 'birth:grand', infant_fever: 'birth:fever',
  chain_conscript: 'muster', north_volunteers: 'muster', war_levy_horse: 'muster', civil_banner: 'muster', war_refugees: 'muster:refugee', refugee_orphan: 'muster:refugee',
  legend_rank_entry: 'square:herald', coronation: 'square:herald', lord_procession: 'square:herald', tax_day: 'square:herald', guild_bounty: 'square:notice', magic_exam_notice: 'square:notice', adult_mage_registration: 'square:notice',
  lord_public_flogging: 'square:flog', adult_heretic_trial: 'square:trial', inquisitor_visit: 'square:trial',
  plague_quarantine: 'plague',
  monster_raid: 'monsters', dungeon_overflow_rumor: 'monsters', goblins: 'monsters', wolves: 'monsters:wolves',
  famine_neighbor: 'famine', farm_blight: 'famine', harsh_winter: 'famine',
  chain_loan_threat: 'fire', civil_looters: 'fire', bread_riot: 'fire:riot', era_mill_anger: 'fire:riot',
  harvest_festival: 'festival', seal_festival: 'festival', era_lamp_festival: 'festival', night_of_dead: 'festival:dead', traveling_troupe: 'festival:troupe',
  baptism: 'chapel:child', coming_of_age: 'chapel', ch_school_first: 'chapel:child', ch_school_recite: 'chapel:child',
  legend_dragon_reveal: 'dragon', dragon_hoard_rumor: 'dragon',
  adult_leave_home: 'road', chain_friend_leaving: 'road', later_child_leaves: 'road', ch_bestie_crossroads: 'road', later_return_home: 'road:return', adult_old_friend_returns: 'road:return',
  chain_illness_start: 'bedside', chain_illness_turn: 'bedside', later_will: 'bedside', adult_parent_aging: 'bedside',
  mana_test: 'ritual:orb', mana_awaken: 'ritual', circle_exam_run: 'ritual', circle_exam_control: 'ritual', magic_misfire: 'ritual:wild', chain_darkmage_reveal: 'ritual:dark', magic_forbidden_copy: 'ritual:dark', duel_aura_awakening: 'ritual',
  legend_magnus_audience: 'court',
};
// 장면 종류(life.scene.kind)로 정해지는 것
const BY_SCENE = {
  heir: 'bedside:last',
  arrest: 'square:guards', caught_illegal: 'square:guards', bounty_hunters: 'square:guards',
  faith_inquisition: 'chapel:inquisition', realm_inquisitor: 'chapel:inquisition', faith_convert: 'chapel', faith_high: 'chapel', pilgrim_end: 'chapel',
  fief_grant: 'court', buy_title: 'court', domain_rank: 'court', nation_name: 'court', realm_office: 'court', civil_side: 'muster',
  sail: 'voyage:harbor', shipyard: 'voyage:harbor', cargo: 'voyage:harbor', sea_event: 'voyage', pirate_den: 'voyage:pirate', pirate_raid: 'voyage:pirate', navy_hunt: 'voyage:pirate', sea_bounty: 'voyage', serpent_lair: 'voyage:serpent',
  farewell: 'road', realm_raid: 'fire',
};
// 결과 글(그 뒤)에서 알아보는 것. 앞에 있는 것이 먼저다.
const BY_OUTCOME = [
  [/예배당 종이 울렸다|혼례를 올렸|부부가 되었|혼인 서약/, 'wedding'],
  [/감옥|옥에 갇|옥살이|쇠창살|지하 감방|갇혀 지냈|노역|포승줄/, 'prison'],
  [/태어났다|아이를 안았|갓난/, 'birth'],
  [/장례를 치|관을 내렸|무덤 앞에|묻어 주었|숨을 거두었|세상을 떠났/, 'funeral'],
  [/난파|배가 부서|가라앉았/, 'voyage:wreck'],
];
// 제목에서 알아보는 것 (id로 정해지지 않은 사건과 장면에 쓴다)
const BY_TITLE = [
  [/혼례|혼인|결혼/, 'wedding'], [/장례|국상|부고|무덤|유품/, 'funeral'], [/출산|갓난|손주|동생/, 'birth'],
  [/폭풍|풍랑/, 'voyage:storm', 'sea'], [/해적/, 'voyage:pirate', 'sea'], [/바다뱀|해룡|크라켄/, 'voyage:serpent', 'sea'],
  [/역병|열병|돌림병/, 'plague'], [/징집|원군|출정|징발|전선/, 'muster'], [/피란|난민/, 'muster:refugee'],
  [/마물|고블린|늑대|물결|포위|범람/, 'monsters'], [/기근|흉년|굶주/, 'famine'], [/폭동|약탈/, 'fire:riot'], [/불타|화재|방화/, 'fire'],
  [/십강|포고|칙령|사면령/, 'square:herald'], [/태형|처형|효수/, 'square:flog'], [/이단|심문/, 'square:trial'],
  [/서임|작위|알현|대관|책봉/, 'court'], [/수확제|축제|잔치|봉인제/, 'festival'], [/세례|성인식|서품/, 'chapel'],
  [/용왕|드래곤|와이번의 둥지/, 'dragon'], [/승급 시험|수정구|폭주/, 'ritual'], [/체포|감옥/, 'square:guards'],
];
// 나라의 큰일(crisis_turn) 장면은 제목이 '큰일 이름: 단계 이름'이다
function crisisPlate(title, text) {
  if (/열병|역병|환자|번짐|절정|잦아듦/.test(title)) return /잦아듦/.test(title) ? 'funeral' : 'plague';
  if (/전쟁|징집령|전선|고향 앞|전쟁의 끝/.test(title)) return /전쟁의 끝/.test(title) ? 'funeral:visit' : /전선/.test(title) ? 'muster:refugee' : 'muster';
  if (/검은 물결|징조|범람|포위|반격/.test(title)) return /징조/.test(title) ? 'monsters:wolves' : /여파/.test(title) ? 'fire' : 'monsters';
  return /불/.test(text) ? 'fire' : null;
}
const atSea = (g) => safe(() => !!(g.life?.travel && g.sea?.voyage) || !!g.life?.atSea, false);

/** 지금 뜬 사건(또는 그 결과)에 어울리는 그림. 없으면 null */
export function vignetteFor(g, { title = '', text = '', outcome = false } = {}) {
  if (!g) return null;
  let pick = null;
  if (outcome) pick = BY_OUTCOME.find(([re]) => re.test(text))?.[1] ?? null;
  else {
    const pe = g.pendingEvent, id = pe?.id ?? '';
    if (id === 'duel_round' || id === 'duel_start') return null;
    const kind = id === 'life_scene' ? g.life?.scene?.kind : null;
    if (kind === 'fight' || kind === 'battle') return null;
    pick = BY_ID[id] ?? (kind === 'crisis_turn' ? crisisPlate(title, text) : null) ?? (kind ? BY_SCENE[kind] : null) ?? null;
    if (kind === 'sea_event') pick = /폭풍|풍랑/.test(title) ? 'voyage:storm' : /해적|검은 돛/.test(title) ? 'voyage:pirate' : /뱀|괴물|촉수/.test(title + text) ? 'voyage:serpent' : 'voyage';
    if (!pick) pick = BY_TITLE.find(([re, , need]) => re.test(title) && (!need || kind || atSea(g)))?.[1] ?? null;
  }
  if (!pick) return null;
  const [plate, variant] = pick.split(':');
  const me = safe(() => g.people.find((p) => p.id === g.player.id));
  const other = safe(() => g.people.find((p) => p.id === me.spouseId)) ?? null;
  return {
    plate, variant: variant ?? null, year: g.date?.year ?? 505, month: g.date?.month ?? 6, place: g.life?.place ?? 'ern',
    famine: !!g.world?.famine, me, other, seed: strSeed(String(title)) % 997,
  };
}

/* ---------- 화면에 얹기 ---------- */
let game = null;
const keep = (g) => { game = g; };
HOOKS.newGame.push(keep); HOOKS.migrate.push(keep); HOOKS.afterMonth.push(keep); (HOOKS.heir ??= []).push(keep);

let last = null;   // 사건이 떠 있을 때 고른 그림 (그 뒤 화면에서도 이어 쓴다)
let styled = false;
function css() {
  if (styled) return; styled = true;
  const st = document.createElement('style');
  st.textContent = `.ev-art.fl-vig{height:auto!important;aspect-ratio:${VW}/${VH}}
.ev-art.fl-vig::after{background:linear-gradient(transparent 74%,var(--panel))!important}
.ev-art.fl-vig i{background-position:50% 50%!important;animation-duration:40s!important}`;
  document.head.appendChild(st);
}
function refresh() {
  const ev = document.querySelector('.overlay .event');
  if (!ev) { last = null; return; }
  const art = ev.querySelector('.ev-art');
  if (art?.classList.contains('fl-battle')) return; // 전투 연출이 차지한 창
  const out = ev.querySelector('.outcome');
  const title = ev.querySelector('#ev-title')?.textContent ?? '';
  let spec;
  if (out) spec = safe(() => vignetteFor(game, { title, text: out.textContent ?? '', outcome: true })) ?? last;
  else { spec = safe(() => vignetteFor(game, { title, text: ev.querySelector('.ev-text')?.textContent ?? '' })); last = spec; }
  if (!spec) return;
  if (out) last = spec;
  const url = vignetteImage(spec);
  if (!url) return;
  css();
  let host = art;
  if (!host) { host = document.createElement('div'); host.className = 'ev-art'; host.setAttribute('aria-hidden', 'true'); ev.prepend(host); }
  let i = host.querySelector('i');
  if (!i) { i = document.createElement('i'); host.prepend(i); }
  const want = `url("${url}")`;
  if (i.dataset.vig !== url) { i.style.backgroundImage = want; i.dataset.vig = url; }
  host.classList.add('fl-vig');
}
function init() {
  const watch = () => {
    const app = document.getElementById('app');
    if (!app) return;
    let queued = false;
    // 전투 연출이 먼저 자리를 잡도록 한 박자 늦게 본다
    new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(() => queueMicrotask(() => { queued = false; safe(refresh); })); } }).observe(app, { childList: true });
    safe(refresh);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
}
if (hasDom) init();
