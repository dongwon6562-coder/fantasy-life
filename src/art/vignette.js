// 사건 삽화: 큰 사건이 뜰 때 사건 창 위쪽 그림 칸(.ev-art)에 그 장면의 그림 한 장을 얹는다.
// 규칙은 건드리지 않는다. 떠 있는 사건을 읽기만 하고, 스스로 화면에 붙는다 (전투 연출과 같은 방식).
//
//   vignetteImage(spec) → 그림 주소 (없으면 '')
//     spec: { plate, variant?, year, month, place, me?, other?, seed? }
//       plate   : wedding funeral birth muster square plague monsters famine fire prison voyage court festival chapel dragon road bedside ritual depths seal trade beast army love tower
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
import { PLATES as PLATES1 } from './vignettePlates.js';
import { PLATES2 } from './vignettePlates2.js';
import { PLATES3 } from './vignettePlates3.js';
import { PLATES4 } from './vignettePlates4.js';
import { regionOfSite } from './mapTrail.js';

const PLATES = { ...PLATES1, ...PLATES2, ...PLATES3, ...PLATES4 };

const hasDom = typeof document !== 'undefined';
const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };
const SCALE = 1.5; // 그리는 크기: 960x360

/* ---------- 그리기 ---------- */
// 판마다 당겨 그릴 중심(x)과 배율
const FOCUS = { wedding: [410, 1.15], funeral: [330, 1.2], birth: [300, 1.1], muster: [380, 1.25], square: [330, 1.15], plague: [330, 1.25], monsters: [330, 1.2], famine: [330, 1.15], fire: [300, 1.25], prison: [380, 1.15], voyage: [330, 1.15], court: [400, 1.1], festival: [320, 1.3], chapel: [330, 1.1], dragon: [320, 1], road: [300, 1.25], bedside: [330, 1.15], ritual: [320, 1.2], depths: [330, 1.1], seal: [330, 1.1], trade: [330, 1.1], beast: [310, 1.15], mentor: [320, 1.1], nature: [330, 1.1], beastlife: [330, 1.1], peoples: [320, 1.1], feud: [330, 1.1], explore: [330, 1.1], army: [330, 1.1], love: [360, 1.25], tower: [330, 1.1] };
// 늘 밤이나 해 질 녘이어야 하는 그림
const TOD = { 'nature:flood': 'night', 'nature:storm': 'night', 'nature:winter': 'dusk', 'nature:granary': 'dusk', 'nature:drought': 'day', 'nature:locust': 'day', 'beastlife:bond': 'night', 'beastlife:grave': 'dusk', 'peoples:elf_fall': 'night', 'peoples:beast_totem': 'night', 'peoples:beast_hunt': 'dusk', 'feud:turned': 'dusk', 'feud:plot': 'night', 'feud:strike': 'night', 'feud:peace': 'dawn', 'seal:stone': 'night', 'seal:visitor': 'night', 'seal:alley': 'dusk' };
// 날씨가 정해진 그림
const WX = { 'nature:drought': 'clear', 'nature:locust': 'clear', 'nature:quake': 'cloudy', 'nature:flood': 'rain', 'nature:storm': 'storm', 'nature:winter': 'snow', 'nature:granary': 'cloudy', 'beastlife:bond': 'clear' };
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
    const weather = WX[`${spec.plate}:${spec.variant ?? ''}`] ?? (c.weather === 'snow' && D.biome === 'island' ? 'rain' : c.weather);
    const S = skyOf(TOD[`${spec.plate}:${spec.variant ?? 'stone'}`] ?? c.tod, weather, D.biome, k), P = paletteOf(month, D.biome, !!spec.famine);
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
  seal_dream: 'seal:dream', seal_scholar: 'seal:map', seal_spy_found: 'seal:alley', seal_demon_offer: 'seal:visitor', seal_wedge_raid: 'seal:stone', seal_fragment_buyer: 'seal:shard', seal_council_voice: 'court', seal_rite_call: 'seal:rite', seal_after_break: 'seal:broken',
  health_quack: 'square:notice', health_doctor: 'trade:healer', health_quarantine: 'plague', health_body: 'road',
  arts_critic: 'square:notice', arts_reader: 'ritual:study', arts_forger: 'trade:bard', arts_rival: 'court', arts_forbidden_find: 'ritual:dark', arts_burning: 'fire',
  omen_false_prophet: 'square:herald', omen_witness: 'seal:dream', omen_faction: 'trade:bard', omen_hunter: 'seal:alley', omen_pilgrims: 'funeral:visit', omen_church: 'chapel:inquisition',
  wilds_herd: 'monsters', wilds_refugees: 'muster:refugee', wilds_settle: 'trade:builder', wilds_buyer: 'trade:alchemy',
  school_call: 'square:notice', school_dorm: 'night', school_noble: 'court', school_alum_help: 'road:return', school_alum_plea: 'dusk', school_alum_rival: 'square:guards', school_reunion: 'festival', school_parent_alum: 'road:return',
  law_accused: 'square:herald', law_wrong: 'square:notice', law_witness: 'court', law_judge: 'court', law_pardon: 'prison', law_stain: 'road',
  research_buyer: 'ritual:study', research_claim: 'ritual:study', research_mentor: 'ritual:study', research_rival: 'ritual:study', research_spy_offer: 'ritual:study', research_sue: 'square:herald',
};
// 장면 종류(life.scene.kind)로 정해지는 것
const BY_SCENE = {
  nature_drought: 'nature:drought', nature_flood: 'nature:flood', nature_winter: 'nature:winter', nature_quake: 'nature:quake', nature_locust: 'nature:locust', nature_storm: 'nature:storm', nature_granary: 'nature:granary',
  beast_buy: 'beastlife:market', beast_sell: 'beastlife:market', beast_event: 'beastlife:care', beast_familiar: 'beastlife:bond', beast_death: 'beastlife:grave',
  heir: 'bedside:last',
  arrest: 'square:guards', caught_illegal: 'square:guards', bounty_hunters: 'square:guards',
  faith_inquisition: 'chapel:inquisition', realm_inquisitor: 'chapel:inquisition', faith_convert: 'chapel', faith_high: 'chapel', pilgrim_end: 'chapel',
  fief_grant: 'court', buy_title: 'court', domain_rank: 'court', nation_name: 'court', realm_office: 'court', civil_side: 'muster',
  sail: 'voyage:harbor', shipyard: 'voyage:harbor', cargo: 'voyage:harbor', sea_event: 'voyage', pirate_den: 'voyage:pirate', pirate_raid: 'voyage:pirate', navy_hunt: 'voyage:pirate', sea_bounty: 'voyage', serpent_lair: 'voyage:serpent',
  farewell: 'road', realm_raid: 'fire',
  court_offer: 'court', court_patron: 'court', court_marriage: 'court', court_plot: 'court', court_fall: 'court', court_turn: 'court', court_affair: 'court',
  // 11단계: 군대·사랑·마탑
  army_march: 'army:march', army_muster: 'muster', army_press: 'muster', army_clash: 'army:clash', army_promote: 'army:promote', army_term: 'army:camp', army_enlist: 'army:camp', army_event: 'army:camp', army_ransom: 'prison', army_hunted: 'square:guards',
  love_glance: 'love:meet', love_admirer: 'love:meet', love_wish: 'love:meet', love_temptation: 'love:walk', love_bloom: 'bedside', love_wedding: 'wedding', love_arranged: 'wedding', love_unrequited: 'wedding:far',
  love_quarrel: 'love:quarrel', love_betrayed: 'love:quarrel', love_caught: 'love:caught', love_leave: 'road', love_after: 'funeral:visit',
  tower_join: 'tower:hall', tower_pick: 'tower:hall', tower_craft_pick: 'trade:alchemy', tower_duty: 'tower:hall', tower_master_lesson: 'tower:hall', tower_master_errand: 'tower:hall', tower_vote: 'tower:vote', tower_exam: 'ritual', tower_burning: 'fire', tower_inquisitor: 'chapel:inquisition', tower_exposed: 'chapel:inquisition',
  tower_black_invite: 'ritual:dark', forbidden_pick: 'ritual:dark', tower_master_death: 'bedside:last', tower_clinic: 'trade:healer', tower_craft: 'trade:alchemy',
  research_pick: 'ritual:study',
  // 12단계: 원수와 복수
  feud_turned: 'feud:turned', feud_plot: 'feud:plot', feud_strike: 'feud:strike', feud_offer: 'feud:offer', feud_peace: 'feud:peace', feud_deathbed: 'bedside',
  // 13단계: 제자와 문하
  mentor_pick: 'mentor:lesson', mentor_lesson: 'mentor:lesson', mentor_graduate: 'mentor:bow', mentor_surpass: 'mentor:bow', mentor_found: 'mentor:found', mentor_betray: 'road', mentor_reclaim: 'feud:offer', mentor_succession: 'bedside:last',
  // 14단계: 이웃과 마을 살이 (새 그림 없이 있는 판을 붙임)
  village_meeting: 'square:herald', village_election: 'square:notice', village_task: 'trade:builder', village_judge: 'square:herald', village_snub: 'feud:turned', village_quarrel: 'feud:turned', village_stranger: 'muster:refugee',
  // 12단계: 다른 종족의 땅 (의식과 이름 받기는 아래에서 땅에 따라 고른다)
  peoples_friend: 'feud:peace', peoples_grudge: 'trade:bard', peoples_defend: 'square:herald', peoples_slavers: 'seal:alley', peoples_mixed_marriage: 'wedding', peoples_halfelf_years: 'funeral:visit',
  // 12단계: 탐험 (가는 길과 깊은 곳은 아래에서 땅에 따라 고른다)
  explore_plan: 'seal:map', explore_home: 'road:return', explore_give: 'ritual:study',
  deep_descend: 'depths', deep_throne: 'depths:throne',
  // 14단계: 장사 길과 상단 (trade_event는 아래에서 일에 따라 고른다)
  trade_market: 'beastlife:market', trade_caravan: 'road', trade_bandits: 'feud:strike', trade_toll: 'square:guards', trade_house: 'mentor:found', trade_rival: 'feud:plot', trade_event: 'beastlife:market',
  // 14단계: 글과 예술 (기존 그림을 이어 붙임)
  // 20단계: 비밀과 이중생활 (새 그림 없이 있는 판을 붙임)
  secret_bastard: 'bedside', secret_child: 'funeral:visit', secret_alias: 'seal:map', secret_mask: 'seal:alley', secret_knower: 'seal:alley', secret_exposed: 'square:guards', secret_halfsib: 'funeral:visit', secret_legacy: 'ritual:study',
  // 19단계: 전쟁 뒤의 삶 (새 그림 없이 있는 판을 붙임)
  aftermath_return: 'road:return', aftermath_aid: 'funeral:visit', aftermath_widow: 'funeral:visit', aftermath_foreigner: 'square:guards', aftermath_night: 'bedside', aftermath_reunion: 'feud:peace',
  // 18단계: 편지와 먼 인연 (새 그림 없이 있는 판을 붙임)
  letters_write: 'ritual:study', letters_send: 'road', letters_arrive: 'road:return', letters_found: 'road', letters_forge: 'ritual:study', letters_bundle: 'funeral:visit',
  // 17단계: 하인과 식솔 (새 그림 없이 있는 판을 붙임)
  household_hire: 'mentor:bow', household_manage: 'mentor:bow', household_thief: 'square:guards', household_ears: 'seal:alley', household_skim: 'ritual:study', household_grievance: 'mentor:bow',
  household_old: 'bedside', household_heir: 'mentor:bow', household_serve: 'court', household_errand: 'road', household_overheard: 'seal:alley', household_framed: 'square:guards', household_strongbox: 'seal:alley',
  // 16단계: 맹세와 의형제 (새 그림 없이 있는 판을 붙임)
  oath_blood: 'feud:peace', oath_blood_call: 'feud:strike', oath_blood_mourn: 'funeral:visit', oath_liege_offer: 'court', oath_liege_call: 'muster', oath_liege_gone: 'court',
  oath_man: 'mentor:bow', oath_man_turn: 'road', oath_vow: 'chapel', oath_vow_test: 'chapel', oath_pact: 'feud:offer', oath_pact_call: 'square:herald', oath_pact_due: 'wedding',
  // 15단계: 늙음과 마지막 해들 (새 그림 없이 있는 판을 붙임)
  elder_retire: 'mentor:bow', elder_amends: 'feud:peace', elder_journey: 'road', elder_memoir: 'ritual:study', elder_memoir_read: 'ritual:study', elder_funeral_wish: 'chapel',
  elder_forget: 'road:return', elder_deathbed: 'bedside:last', elder_funeral: 'funeral', elder_grave_foe: 'funeral:visit', elder_grave_stranger: 'funeral:visit',
  // 15단계: 병과 의술
  health_treat: 'bedside',
  // 16단계: 예언과 징조 (새 그림 없이 있는 판을 붙임)
  omen_named: 'seal:visitor',
  // 17단계: 법과 재판
  law_trial: 'court',
  // 19단계: 마물의 땅
  wilds_nest: 'monsters',
  // 18단계: 학원과 시험
  school_exam: 'square:notice', school_take: 'ritual:study', school_appoint: 'court', school_fee: 'ritual:study', school_finals: 'ritual:study',
  arts_pick: 'ritual:study', arts_theme: 'ritual:study', arts_done: 'ritual:study', arts_patron: 'court', arts_ban: 'chapel:inquisition',

  // 15단계: 내기와 겨루기 (기존 그림을 이어 붙임)
  contest_gamble: 'trade:bard', contest_urge: 'trade:bard', contest_arena: 'feud:strike', contest_fair: 'festival', contest_round: 'festival',
  // 16단계: 풀리지 않은 일 (기존 그림을 이어 붙임)
  mystery_case: 'square:notice', mystery_offer: 'feud:plot', mystery_revenge: 'feud:strike', mystery_old: 'ritual:study',
  // 17단계: 내 집 마련과 살림 (기존 그림을 이어 붙임)
  house_build: 'trade:builder', house_work: 'trade:builder', house_warm: 'festival', house_room: 'trade:builder', house_event: 'square:notice', house_heir: 'funeral:visit', house_move: 'road', house_move_house: 'road',
  // 18단계: 밑바닥에서 살기 (기존 그림을 이어 붙임)
  poor_boss: 'seal:alley', poor_slum: 'seal:alley', poor_chance: 'road:return', poor_rise: 'road:return', poor_bond: 'square:notice', poor_bond_work: 'trade:builder',
  poor_alms: 'chapel', poor_hire: 'trade:builder', poor_bondsman: 'seal:alley',
  // 19단계: 주점과 여관 꾸리기 (기존 그림을 이어 붙임)
  // 20단계: 유랑극단 (기존 그림을 이어 붙임)
  troupe_arrive: 'festival', troupe_show: 'trade:bard', troupe_manage: 'road', troupe_fire: 'road', troupe_move: 'road', troupe_event: 'road',
  inn_open: 'trade:builder', inn_work: 'trade:bard', inn_manage: 'ritual:study', inn_price: 'ritual:study', inn_hire: 'trade:builder', inn_fire: 'trade:builder', inn_event: 'trade:bard',
};
const TRADE_ART = { famine: 'famine', army: 'muster', smuggle: 'seal:alley', credit: 'court', guard_thief: 'square:flog', porter: 'road', rumor: 'trade:bard' };
// 새 일(voc_path의 길 id, voc_event의 사건 id)마다의 그림. 없으면 지금 하는 일의 일터 그림
const VOC_ART = {
  royal_physician: 'court', plague_doctor: 'plague', court_bard: 'court', ballad: 'trade:bard', school: 'trade:teacher', book: 'ritual:study', elixir: 'trade:alchemy', stone: 'trade:alchemy', build: 'trade:builder', white_stag: 'beast:stag', beast_slayer: 'beast:ash',
  lords_deer: 'beast:deer', wolf_pack: 'monsters:wolves', lost_child: 'beast:tracks', tavern_brawl: 'trade:bard', tower_inspect: 'trade:alchemy',
};
const JOB_ART = { physician: 'trade:healer', bard: 'trade:bard', tutor: 'trade:teacher', scholar: 'trade:teacher', alchemist: 'trade:alchemy', carpenter: 'trade:builder', mason: 'trade:builder', hunter: 'beast:tracks' };
const BEAST_ART = { great_boar: 'beast:boar', cave_bear: 'beast:bear', ash_bear: 'beast:ash' };
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
    pick = BY_ID[id] ?? BY_SCENE[id] ?? (kind === 'crisis_turn' ? crisisPlate(title, text) : null) ?? (kind ? BY_SCENE[kind] : null) ?? null;
    if (kind === 'sea_event') pick = /폭풍|풍랑/.test(title) ? 'voyage:storm' : /해적|검은 돛/.test(title) ? 'voyage:pirate' : /뱀|괴물|촉수/.test(title + text) ? 'voyage:serpent' : 'voyage';
    if (kind === 'voc_path' || kind === 'voc_event') { const sc = g.life.scene; pick = VOC_ART[sc.path ?? sc.ev] ?? JOB_ART[g.life?.job?.id] ?? null; }
    if (kind === 'peoples_rite' && g.life.scene.id) pick = `peoples:${g.life.scene.id}`;
    if (kind === 'troupe_event') pick = { censor: 'square:trial', quarrel: 'feud:offer', love: 'festival', lover: 'road', feast: 'court', theft: 'seal:alley' }[g.life.scene.ev] ?? pick;
    if (kind === 'inn_event') pick = { brawl: 'feud:strike', guest: 'square:herald', gang: 'seal:alley', smuggle: 'seal:alley', guard: 'square:notice', arrears: 'square:notice', tax: 'court', rival_open: 'feud:plot', rival: 'feud:plot' }[g.life.scene.ev] ?? pick;
    if (kind === 'poor_slum') pick = { winter: 'famine', share: 'seal:alley', sick: 'famine', kid: 'seal:alley', gang: 'feud:plot' }[g.life.scene.ev] ?? pick;
    if (kind === 'house_event') pick = { fire: 'fire', thief: 'seal:alley', neighbor: 'feud:offer' }[g.life.scene.ev] ?? pick;
    if (id === 'peoples_name') pick = { silverleaf: 'peoples:elf_dew', hammer: 'peoples:dwarf_fire', fur: 'peoples:beast_totem' }[g.life?.place] ?? pick;
    if (kind === 'explore_leg' || kind === 'explore_heart' || kind === 'explore_name') { const rg = kind === 'explore_name' ? regionOfSite(g.life.scene.site) : g.explore?.exp?.region; if (rg) pick = kind === 'explore_leg' ? `explore:${rg}` : `explore:heart-${rg}`; }
    if (kind === 'trade_event') pick = TRADE_ART[g.life.scene.ev] ?? pick;
    if (kind === 'voc_beast') pick = BEAST_ART[g.life.scene.beast] ?? 'beast:boar';
    if (!pick) pick = BY_TITLE.find(([re, , need]) => re.test(title) && (!need || kind || atSea(g)))?.[1] ?? null;
  }
  if (!pick) return null;
  const [plate, variant] = pick.split(':');
  const me = safe(() => g.people.find((p) => p.id === g.player.id));
  // 사랑 장면은 그 장면의 상대를 그린다
  const other = safe(() => ((plate === 'love' || plate === 'feud' || /^(feud|mentor)_/.test(g.life.scene?.kind ?? '')) && g.life.scene?.id != null ? g.people.find((p) => p.id === g.life.scene.id) : null)) ?? safe(() => g.people.find((p) => p.id === me.spouseId)) ?? null;
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
