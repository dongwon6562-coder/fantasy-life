// 7단계: 신앙과 교단.
// - 내 신앙(game.faith): 섬기는 신, 믿음(0~100), 신성력, 교단 파벌, 대주교·성자, 이단 의심, 순례, 축일, 검은 새벽
// - 기도·예배·축일·순례·개종 행동, 신앙마다 제관 일거리
// - 이단 심문(성광의 땅에서 의심이 쌓이면), 금지된 마신 숭배 "검은 새벽"
// - 신앙이 관계(같은 신을 섬기면 가까워진다)와 나라의 대우(국경, 귀화)에 미치는 영향
// 화면 연결점: faithInfo(g), GODS, FEASTS, feastNow(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat, gainSkill } from '../game.js';
import { byId, fullName, has, living } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { registerJob } from '../jobs.js';
import { addAffinity, remember } from '../relations.js';
import { travelMonths, PLACES } from '../places.js';
import { isJailed, jail, addNotoriety, notoriety } from '../crime.js';
import { realmOf, realmState, REALMS, setBorderExtra } from '../realms/index.js';
import { raceOf, playerRace } from '../races/index.js';
import { GODS, GOD_IDS, OPEN_GODS, HIGH_RANKS, SECTS, PILGRIM, FEASTS, HERESY, DAWN_RANKS, DAWN_CITIES } from './data.js';

export { GODS, FEASTS, SECTS };
const mi = (g) => g.date.year * 12 + g.date.month;
const here = (g) => L(g).place;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fac = (g, id) => L(g).fac?.[id];

/* ---------- 상태 ---------- */
export function faithState(g) {
  if (!g.faith) g.faith = { god: startGod(g), devotion: 25, holy: 0, sect: null, rank: 0, suspicion: 0, prayedAt: -1, prayN: 0, pilgrim: null, pilgrimages: [], feasts: {}, dawn: null, inqAt: 0, sceneAt: 0 };
  const f = g.faith;
  if (!GODS[f.god]) f.god = 'solar';
  for (const k of ['devotion', 'holy', 'suspicion', 'rank']) if (!Number.isFinite(f[k])) f[k] = 0;
  f.pilgrimages ??= []; f.feasts ??= {};
  return f;
}
const F = faithState;
const raceGod = (race) => (race === 'elf' ? 'tree' : race === 'dwarf' || race === 'beast' ? 'ancestor' : race === 'demon' || race === 'half_demon' ? 'none' : null);
function startGod(g) {
  const race = g.player?.race ?? 'human';
  const byRace = raceGod(race);
  if (byRace) return byRace;
  if (race === 'half_elf') return 'solar';
  // 시골 집안은 어머니 쪽에서 대지의 어머니를 함께 모시기도 한다
  if (g.player?.familyId === 'farmer' && (((g.rngState?.s ?? 0) * 2654435761) >>> 0) % 10 < 3) return 'earth';
  return 'solar';
}
// NPC의 신앙: 따로 적지 않으면 종족·일·고장으로 정한다 (같은 사람은 늘 같다)
export function npcFaith(p) {
  if (!p) return 'solar';
  if (p.faith && GODS[p.faith]) return p.faith;
  const byRace = raceGod(raceOf(p));
  if (byRace) return byRace;
  if (p.job === 'priest') return 'solar';
  const h = (p.id * 2654435761) >>> 0;
  const realm = realmOf(p.place ?? 'ern');
  if (realm === 'holy') return 'solar';
  if (realm === 'free' && h % 5 === 0) return 'sea';
  if (realm === 'serenia' && h % 3 === 0) return 'none';
  if (['farmer', 'herbalist'].includes(p.job) && h % 4 === 0) return 'earth';
  if (h % 23 === 0) return 'none';
  return 'solar';
}
const godName = (id) => GODS[id]?.name ?? '성광교';
// 믿음이 깊은 정도를 말로
export const devotionWord = (v) => (v >= 85 ? '신앙이 삶 그 자체다' : v >= 60 ? '독실하다' : v >= 35 ? '꾸준히 믿는다' : v >= 15 ? '이름만 신자다' : '믿음이 식었다');
export const suspicionWord = (v) => (v >= 70 ? '이단심문소 장부에 이름이 있다' : v >= 40 ? '수군거림이 돈다' : v >= 15 ? '눈여겨보는 사람이 있다' : '');
export function faithTitle(g) {
  const f = F(g);
  if (f.god !== 'solar') return null;
  if (f.rank) return HIGH_RANKS[f.rank];
  return null;
}
// 화면용 한 묶음
export function faithInfo(g) {
  const f = F(g);
  const feast = feastNow(g);
  return {
    god: f.god, name: godName(f.god), deity: GODS[f.god].deity, desc: GODS[f.god].desc,
    devotion: Math.round(f.devotion), devotionWord: devotionWord(f.devotion),
    holy: Math.round(f.holy), title: faithTitle(g), sect: f.sect ? SECTS[f.sect].name : null,
    suspicion: Math.round(f.suspicion), suspicionWord: suspicionWord(f.suspicion),
    pilgrimages: f.pilgrimages.slice(), pilgrim: f.pilgrim ? PLACES[f.pilgrim.to]?.name ?? null : null,
    dawn: f.dawn ? DAWN_RANKS[f.dawn.rank] : null,
    feast: feast ? feast.name : null,
    shrine: GODS[f.god].shrines[here(g)] ?? null,
  };
}
// 지금 달의 내 축일
export function feastNow(g) {
  const f = F(g);
  return FEASTS.find((x) => x.month === g.date.month && (x.god === f.god || (x.god === '*' && f.god !== 'none'))) ?? null;
}
// flags.faith(예전 코드가 보는 값)를 믿음과 맞춘다: 성광교를 믿음 50 이상이면 devout
function syncFlag(g) {
  const f = F(g);
  g.flags ??= {};
  const v = f.god === 'solar' ? (f.devotion >= 50 ? 'devout' : 'nominal') : 'other';
  if (g.flags.faith !== v && (g.flags.faith != null || v !== 'nominal')) g.flags.faith = v;
  f.flagSet = g.flags.faith ?? null; // 다른 곳에서 바꾸면 알아챌 수 있게
}
const believe = (g, n) => { const f = F(g); f.devotion = clamp(f.devotion + n, 0, 100); };

/* ---------- 새 게임, 옛 저장, 대 잇기 ---------- */
HOOKS.newGame.push((g) => { F(g); });
HOOKS.migrate.push((g) => {
  const had = !!g.faith;
  const f = F(g);
  // 옛 저장: 세례 때 독실하다고 했으면 믿음을 그만큼 채운다
  if (!had && g.flags?.faith === 'devout') { f.god = 'solar'; f.devotion = 55; }
});
HOOKS.heir.push((g) => {
  const old = g.faith;
  const prev = old?.god ?? 'solar';
  g.faith = null;
  const f = F(g);
  const byRace = raceGod(g.player.race ?? 'human');
  f.god = byRace && prev !== 'none' ? byRace : prev === 'none' ? 'solar' : prev;
  f.devotion = old?.devotion >= 60 ? 40 : 25; // 독실한 부모 밑에서 자란 아이
  syncFlag(g);
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const f = F(g);
  const flag = g.flags?.faith;
  // 다른 곳(세례, 대성당 미사)에서 독실해졌다
  if (flag === 'devout' && f.flagSet !== 'devout') {
    if (f.god !== 'solar' && f.god !== 'none') f.suspicion = Math.max(0, f.suspicion - 20);
    f.god = 'solar'; f.devotion = Math.max(f.devotion, 52);
  }
  // 기도하지 않으면 믿음은 아주 천천히 식는다
  if (mi(g) - f.prayedAt > 6) f.devotion = Math.max(0, f.devotion - 0.25);
  // 성직자로 일하면 믿음과 신성력이 자란다
  const job = L(g).job?.id;
  if (job === 'cleric' || job?.endsWith('_keeper') || job === 'sea_priest') { believe(g, 0.4); if (f.holy > 0) f.holy = Math.min(100, f.holy + 0.25 + f.devotion / 400); }
  syncFlag(g);
  // 이단 의심: 성광의 땅에서 다른 신을 섬기면 쌓이고, 다른 곳에서는 옅어진다
  const realm = realmOf(here(g));
  let s = HERESY[realm]?.[f.god] ?? 0;
  if (f.devotion < 30) s *= 0.4; // 조용히 믿으면 덜 눈에 띈다
  if (f.dawn) s += realm === 'holy' ? 3 : 1;
  if (['half_demon', 'demon'].includes(playerRace(g)) && ['holy', 'leonia'].includes(realm)) s += 1.5;
  if (g.flags?.forbidden_magic) s += 0.5;
  if (s > 0 && !traveling(g) && !isJailed(g)) f.suspicion = Math.min(100, f.suspicion + s);
  else f.suspicion = Math.max(0, f.suspicion - (realm === 'holy' ? 0.2 : 0.8));
  // 순례가 끝났다
  if (f.pilgrim && !traveling(g) && !isJailed(g)) {
    if (here(g) === f.pilgrim.to) { if (!sceneQueued(g, 'pilgrim_end')) queueScene(g, 'pilgrim_end', { to: f.pilgrim.to }); }
    else if (mi(g) - f.pilgrim.at > 24) f.pilgrim = null; // 길을 잃었다 (다른 데로 가 버렸다)
  }
  if (!isAdult(g) || traveling(g) || isJailed(g) || L(g).queue.length || mi(g) - f.sceneAt < 6) return;
  // 이단 심문
  if (f.suspicion >= 40 && ['holy', 'leonia', 'march'].includes(realm) && mi(g) - f.inqAt >= 8 && rng.chance(f.suspicion / 160)) {
    f.inqAt = mi(g); f.sceneAt = mi(g);
    queueScene(g, 'faith_inquisition', {});
    return;
  }
  // 교단 안에서: 파벌 고르기, 대주교, 성자
  const c = fac(g, 'church');
  if (f.god === 'solar' && c?.member && job === 'cleric') {
    if (!f.sect && c.rank >= 1 && rng.chance(0.25)) { f.sceneAt = mi(g); queueScene(g, 'faith_sect', {}); return; }
    if (f.rank === 0 && c.rank >= 3 && f.devotion >= 70 && f.holy >= 25 && playerAge(g) >= 40 && rng.chance(0.15)) { f.sceneAt = mi(g); queueScene(g, 'faith_high', { to: 1 }); return; }
    if (f.rank === 1 && f.devotion >= 90 && f.holy >= 70 && rng.chance(0.08)) { f.sceneAt = mi(g); queueScene(g, 'faith_high', { to: 2 }); return; }
    if (f.sect && rng.chance(0.06)) { f.sceneAt = mi(g); queueScene(g, 'faith_sect_task', { sect: f.sect }); return; }
  }
  // 검은 새벽의 손짓
  if (!f.dawn && !f.dawnRefused && DAWN_CITIES.includes(here(g)) && playerAge(g) >= 18
    && (notoriety(g) >= 25 || g.player.stress >= 65 || g.flags?.met_forbidden_dealer || f.devotion < 10) && rng.chance(0.04)) {
    f.sceneAt = mi(g);
    queueScene(g, 'dawn_invite', {});
    return;
  }
  if (f.dawn && f.dawn.rank >= 1 && !f.dawn.task && rng.chance(0.07)) { f.sceneAt = mi(g); queueScene(g, 'dawn_task', {}); }
});

/* ---------- 관계: 같은 신을 섬기면 가까워진다 ---------- */
addAffinity((g, p) => {
  const f = F(g);
  const theirs = npcFaith(p);
  const pious = has(p, 'pious');
  if (theirs === f.god && f.god !== 'none') return (pious ? 2 : 0) + (f.devotion >= 50 ? 1 : 0);
  if (pious && theirs === 'solar') {
    if (f.dawn && f.suspicion >= 50) return -4;
    if (f.god !== 'solar') return -1;
  }
  return 0;
});

/* ---------- 나라의 대우: 국경에서 한 줄 ---------- */
const FAITH_HOME = { holy: 'solar', leonia: 'solar', valhart: 'solar', elf: 'tree', dwarf: 'ancestor', beast: 'ancestor', free: null, serenia: null, march: 'solar' };
export function faithLine(g, realm) {
  const f = F(g);
  const home = FAITH_HOME[realm];
  if (realm === 'holy' && f.god !== 'solar') return ' 성문의 사제가 내 목에 성광의 표식이 없는 것을 보고 장부에 무언가를 적었다. 이 나라에서 다른 신을 입에 올리면 이단심문소가 찾아온다.';
  if (realm === 'holy' && f.devotion >= 60) return ' 기도문을 막힘없이 외자 사제가 처음으로 웃었다.';
  if (home && home === f.god && f.god !== 'solar' && f.devotion >= 30) return ` 이곳 사람들도 ${J(GODS[f.god].deity, '을/를')} 섬긴다. 낯선 땅인데 낯설지 않다.`;
  if (realm === 'elf' && f.god === 'solar' && f.devotion >= 60) return ' 엘프 파수꾼이 내 성광의 표식을 보고 눈을 가늘게 떴다. 개종을 권하러 온 사제들을 이 숲은 오래 겪어 왔다.';
  return '';
}
setBorderExtra((g, realm) => faithLine(g, realm));

/* ---------- 기도 ---------- */
const PRAY = {
  solar: {
    young: ['잠들기 전에 어머니에게 배운 기도문을 외웠다. 절반은 무슨 뜻인지 몰랐다.', '예배당 의자에 앉아 다리를 흔들며 사제의 기도가 끝나기를 기다렸다.'],
    low: ['식사 전에 형식대로 성광의 표식을 그었다.', '기도문을 외우다 딴생각이 났다. 여신은 다 아실 것이다.'],
    mid: ['새벽 종소리에 맞춰 무릎을 꿇었다. 하루가 조금 가지런해졌다.', '성녀 리아나의 기도문을 처음부터 끝까지 외웠다. 마지막 구절에서 목이 메었다.'],
    high: ['기도는 이제 말이 아니다. 숨을 쉴 때마다 빛이 드나드는 것 같다.', '해가 뜨기 전에 일어나 빈 예배당에서 기도했다. 촛불이 바람도 없는데 흔들렸다.'],
  },
  earth: {
    young: ['할머니를 따라 밭고랑에 우유를 조금 부었다. 사제님한테는 비밀이라고 했다.'],
    low: ['밭에 나가기 전에 흙을 한 줌 쥐었다가 놓았다.'],
    mid: ['돌 제단에 보리 한 줌을 올리고 올해의 비를 빌었다.', '맨발로 밭을 걸었다. 발바닥으로 땅의 기분을 듣는다고 할머니는 말했었다.'],
    high: ['땅에 이마를 대고 오래 엎드려 있었다. 어머니의 심장 소리가 들렸다.'],
  },
  tree: {
    young: ['어른들처럼 나무 아래 가만히 앉아 있어 보았다. 금방 좀이 쑤셨다.'],
    low: ['잠깐 눈을 감고 숨을 골랐다. 세계수는 서두르지 않는다.'],
    mid: ['반나절을 말없이 앉아 있었다. 잎이 떨어지는 소리를 셀 수 있게 되었다.'],
    high: ['침묵이 깊어지면 나무와 나 사이의 경계가 흐려진다. 오늘은 거의 사라졌다.'],
  },
  ancestor: {
    young: ['아버지가 부르는 조상의 이름을 따라 불렀다. 너무 많아서 중간에 졸았다.'],
    low: ['밥 한 숟갈을 덜어 조상 몫으로 두었다.'],
    mid: ['불 앞에서 조상의 이름을 차례로 불렀다. 이름이 이어지는 한 우리는 끊어지지 않는다.'],
    high: ['이름을 부르다 보면 그들이 곁에 앉는 것 같다. 오늘은 할아버지가 웃었다.'],
  },
  sea: {
    young: ['부두에서 마른 빵 부스러기를 바다에 던졌다. 갈매기가 먼저 먹었다.'],
    low: ['배가 보이는 곳에서 짧게 늙은이에게 빌었다. 오늘은 잠잠하기를.'],
    mid: ['방파제 끝에 서서 소금물에 손을 담그고 늙은이의 이름을 불렀다.'],
    high: ['폭풍이 오는 냄새를 이제는 하루 먼저 맡는다. 늙은이가 귀띔해 주는 것이다.'],
  },
  none: {
    young: ['다들 기도할 때 눈을 감는 척만 했다.'], low: ['기도하는 사람들을 보며, 누구에게 비는 것인지 생각했다.'],
    mid: ['조용한 곳에 앉아 생각을 정리했다. 기도라고 부르지는 않는다.'], high: ['아무에게도 빌지 않는다. 그래서 내 일은 내가 진다.'],
  },
};
ACTIONS.push({
  id: 'pray', name: '기도', icon: 'pray',
  desc: '내가 섬기는 신에게 빈다. 마음이 가라앉고 믿음이 깊어진다. 성광교를 깊이 믿으면 드물게 신성력이 깨어난다.',
  available: (g) => playerAge(g) >= 5 && !traveling(g),
  run(g, rng) {
    const f = F(g);
    const again = f.prayedAt === mi(g);
    f.prayN = again ? f.prayN + 1 : 1;
    f.prayedAt = mi(g);
    const lv = playerAge(g) < 12 ? 'young' : f.devotion >= 70 ? 'high' : f.devotion >= 35 ? 'mid' : 'low';
    const line = rng.pick(PRAY[f.god][lv]);
    stress(g, again ? -2 : -8);
    const gain = (again ? 0.8 : rng.float(2, 3.5)) * (has(me(g), 'pious') ? 1.3 : 1) * (f.god === 'none' ? 0.3 : 1);
    believe(g, gain);
    const w = gainStat(g, 'wil', again ? 0.15 : 0.35);
    let extra = '';
    const cleric = L(g).job?.id === 'cleric' ? (fac(g, 'church')?.rank ?? 0) + 1 : 0;
    const tryNow = f.holyTry !== g.date.year && f.god === 'solar' && f.holy <= 0 && playerAge(g) >= 12 && g.player.stats.wil >= 25 && (cleric ? f.devotion >= 55 : f.devotion >= 80);
    if (tryNow) f.holyTry = g.date.year; // 한 해에 한 번만 깨어날 기회가 있다
    if (tryNow && rng.chance(cleric ? 0.06 + cleric * 0.04 : 0.03)) {
      f.holy = 1;
      note(g, '신성력이 깨어났다.');
      chron(g, `${g.player.name}에게 신성력이 깨어나다.`);
      extra = ' 기도가 끝날 무렵 손바닥이 뜨거워졌다. 눈을 뜨자 손끝에서 희미한 빛이 새어 나오고 있었다. 마력과는 다른 것이다. 신성력이다.';
    } else if (f.holy > 0) f.holy = Math.min(100, f.holy + (again ? 0.1 : 0.3 + f.devotion / 300));
    return `${again ? '같은 기도를 되풀이했다. ' : ''}${line}${extra}${gains([up('의지', w)])}`;
  },
});

/* ---------- 예배·제사 (그 신의 제단이 있는 곳) ---------- */
ACTIONS.push({
  id: 'worship', name: '예배', icon: 'pray',
  desc: '내 신의 제단이 있는 곳에서 예배하거나 제사를 올린다. 같은 신을 섬기는 사람들과 가까워진다.',
  available: (g) => playerAge(g) >= 6 && !traveling(g) && !!GODS[F(g).god].shrines[here(g)],
  run(g, rng) {
    const f = F(g);
    const G = GODS[f.god];
    if (!G.shrines[here(g)]) return '이 고장에는 내 신의 제단이 없다. 마음속으로만 빌었다.';
    tired(g, 3); stress(g, -6);
    believe(g, rng.float(3, 5));
    f.prayedAt = mi(g);
    if (realmOf(here(g)) === 'holy') { const R = realmState(g); R.piety = (R.piety ?? 0) + 1; }
    // 같은 신을 섬기는 이웃 하나와 가까워진다
    const near = living(g).filter((p) => !p.isPlayer && p.place === here(g) && npcFaith(p) === f.god && ageYears(p) >= 12);
    const p = rng.pick(near);
    let meet = '';
    if (p) { p.affection = Math.min(100, p.affection + 2); if (!p.known && rng.chance(0.3)) { p.known = true; meet = ` 옆자리의 ${J(fullName(p), '과/와')} 인사를 나누었다.`; } }
    let offer = '';
    if (spend(g, 1)) { offer = ' 헌금함에 은화 한 닢을 넣었다.'; believe(g, 1); }
    const lines = {
      solar: ['사제의 설교는 길었지만 성가는 아름다웠다.', '성광의 빵을 받아 입에 넣었다. 맛은 그냥 빵이었다. 그래도 무언가 달랐다.', '설교 사제가 검은 새벽의 소문을 들먹이며 이웃을 살피라고 했다. 사람들이 서로를 흘끔거렸다.'],
      earth: ['돌 제단 앞에 할머니 셋이 먼저 와 있었다. 아무도 말하지 않았다. 다들 성광교 미사에도 나가는 사람들이다.', '제단에 꿀을 부었다. 개미들이 먼저 찾아왔다. 대지의 어머니의 심부름꾼이라고 한다.'],
      tree: ['엘프들 사이에 끼어 앉았다. 반나절 동안 아무도 움직이지 않았다.', '나뭇잎 사이로 빛이 떨어졌다. 그 빛이 지나가는 동안만은 시간이 멈춘 것 같았다.'],
      ancestor: ['화로에 쇳조각을 하나 바치고 조상의 이름을 불렀다. 화로지기가 고개를 끄덕였다.', '토템 기둥 아래 고기 한 덩이를 놓았다. 아침이면 없어져 있을 것이다. 조상이 드신 것이다. 혹은 늑대가.'],
      sea: ['늙은이 바위에 마른 생선을 던졌다. 파도가 덥석 받아 갔다.', '선원들이 출항 전에 차례로 바위에 침을 뱉었다. 늙은이는 짠맛을 좋아한다고 한다.'],
      none: [''],
    }[f.god];
    return `${G.shrines[here(g)]}. ${rng.pick(lines)}${offer}${meet}`;
  },
});
const ageYears = (p) => Math.floor(p.ageMonths / 12);

/* ---------- 축일 ---------- */
ACTIONS.push({
  id: 'keep_feast', name: '축일 지내기', icon: 'pray',
  desc: '이달은 내 신앙의 축일이다. 식구와 이웃이 함께 모인다.',
  available: (g) => playerAge(g) >= 4 && !traveling(g) && !!feastNow(g) && F(g).feasts[feastNow(g).id] !== g.date.year,
  run(g, rng) {
    const f = F(g);
    const fe = feastNow(g);
    if (!fe || f.feasts[fe.id] === g.date.year) return '축일은 이미 지냈다.';
    f.feasts[fe.id] = g.date.year;
    stress(g, -12); believe(g, 5);
    f.prayedAt = mi(g);
    for (const id of g.player.familyIds) { const p = byId(g, id); if (p?.alive && !p.isPlayer) p.affection = Math.min(100, p.affection + 2); }
    const sp = byId(g, me(g).spouseId);
    if (sp?.alive) sp.affection = Math.min(100, sp.affection + 3);
    let extra = '';
    if (fe.id === 'dead') {
      const gone = g.people.filter((p) => !p.alive && p.known && !p.isPlayer).slice(-3);
      extra = gone.length ? ` 문간에 등불을 걸고 ${gone.map((p) => p.name).join(', ')}의 이름을 불렀다.` : ' 문간에 등불을 걸었다. 아직 부를 이름이 많지 않다는 것이 다행이었다.';
      if (f.dawn) extra += ' 등불 하나는 다른 쪽을 향해 걸었다. 새벽의 형제들만 아는 표시다.';
    }
    return `${fe.name}. ${fe.text}${extra}`;
  },
});

/* ---------- 순례 ---------- */
ACTIONS.push({
  id: 'pilgrimage', name: '순례 길', icon: 'travel',
  desc: '내 신앙의 성지로 길을 떠난다. 몇 달이 걸리고 길은 위험하지만, 돌아오는 사람은 무언가를 얻는다.',
  available: (g) => isAdult(g) && !traveling(g) && !F(g).pilgrim && F(g).devotion >= 30 && !!PILGRIM[F(g).god] && !sceneQueued(g, 'pilgrim_pick'),
  run(g) { queueScene(g, 'pilgrim_pick', {}); return '순례자의 지팡이와 조개껍데기 목걸이를 꺼내 보았다.'; },
});
defineScene('pilgrim_pick', {
  title: () => '어디로 순례를 떠날까',
  text: (g) => `${godName(F(g).god)}의 성지는 멀다. 길 위에서 죽는 순례자도 있다. 그래도 사람들은 간다.`,
  choices: (g) => {
    const f = F(g);
    if (traveling(g) || isJailed(g) || f.pilgrim) return [];
    const out = (PILGRIM[f.god] ?? []).map((x, i) => {
      const m = x.place === here(g) ? 0 : travelMonths(here(g), x.place);
      return { label: `${x.name} (${m ? `${m}달 길` : '바로 여기'})`, key: String(i) };
    });
    out.push({ label: '아직은 떠나지 않는다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const f = F(g);
    if (key === 'no') return '지팡이를 다시 벽에 기대 두었다.';
    const x = PILGRIM[f.god]?.[Number(key)];
    if (!x || traveling(g) || isJailed(g)) return '길을 떠날 수 없었다.';
    f.pilgrim = { to: x.place, at: mi(g) };
    if (x.place === here(g)) return `${x.name}. 멀리 갈 것도 없이 성지는 여기 있다. 마음을 가다듬고 그 앞으로 걸어갔다.`;
    const life = L(g);
    life.travel = { to: x.place, left: Math.max(1, travelMonths(life.place, x.place)), from: life.place };
    stress(g, -5);
    return `${J(x.name, '으로/로')} 순례를 떠났다. 길 위에서 다른 순례자들을 만날 것이다. 노잣돈을 노리는 자들도.`;
  },
});
defineScene('pilgrim_end', {
  title: () => '순례의 끝',
  text: (g, s) => {
    const f = F(g);
    const x = (PILGRIM[f.god] ?? []).find((p) => p.place === s.to);
    return x ? x.end : '성지에 닿았다.';
  },
  choices: (g, s) => {
    const f = F(g);
    if (!f.pilgrim || here(g) !== s.to) return [];
    const out = [];
    if (g.player.injuries.length) out.push({ label: '몸의 상처를 낫게 해 달라고 빈다', key: 'heal' });
    out.push({ label: '갈 길을 보여 달라고 빈다', key: 'guide' });
    out.push({ label: '먼저 간 사람들을 위해 빈다', key: 'dead' });
    out.push({ label: '아무것도 빌지 않는다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const f = F(g);
    const x = (PILGRIM[f.god] ?? []).find((p) => p.place === s.to);
    f.pilgrim = null;
    f.pilgrimages.push(x?.name ?? PLACES[s.to]?.name ?? s.to);
    believe(g, 12); stress(g, -20);
    L(g).renown = (L(g).renown ?? 0) + 1;
    note(g, `${x?.name ?? '성지'}에 순례를 다녀왔다.`);
    chron(g, `${g.player.name}, ${x?.name ?? '성지'}에 순례하다.`, 60);
    if (key === 'heal') {
      const n = g.player.injuries.filter((i) => !i.mortal).length;
      g.player.injuries = g.player.injuries.filter((i) => i.mortal);
      return n ? '밤새 기도하고 일어나니 오래 욱신거리던 곳이 조용했다. 기적인지, 쉰 덕분인지는 모른다. 순례자들은 기적이라고 했다.' : '깊은 상처는 그대로였다. 그래도 마음은 가벼워졌다.';
    }
    if (key === 'guide') {
      const k = rng.pick(['wil', 'int', 'sen', 'cha']);
      const v = gainStat(g, k, 2.5);
      return `꿈에서 갈림길을 보았다. 어느 쪽으로 가야 할지, 깨어나서도 기억이 났다.${gains([up({ wil: '의지', int: '지능', sen: '감각', cha: '매력' }[k], v)])}`;
    }
    if (key === 'dead') {
      const gone = g.people.filter((p) => !p.alive && p.known && !p.isPlayer);
      believe(g, 3);
      return gone.length ? `${gone.slice(-3).map((p) => p.name).join(', ')}. 이름을 하나씩 불렀다. 대답은 없었다. 대답이 없어서 오히려 다행이었다.` : '아직 떠나보낸 사람이 많지 않다. 앞으로 떠나보낼 사람들을 위해 미리 빌었다.';
    }
    believe(g, 5);
    if (f.god === 'solar' && f.holy <= 0 && f.devotion >= 70 && rng.chance(0.35)) { f.holy = 1; note(g, '신성력이 깨어났다.'); return '아무것도 빌지 않고 앉아 있었다. 비우고 나니 무언가가 채워졌다. 손끝에 희미한 빛이 맺혔다. 신성력이다.'; }
    return '아무것도 빌지 않았다. 그냥 거기 있었다. 그것으로 충분했다.';
  },
});

/* ---------- 개종 ---------- */
const canConvert = (g, god) => {
  const G = GODS[god];
  if (G.races && !G.races.includes(playerRace(g))) {
    const sp = byId(g, me(g).spouseId);
    if (!(sp?.alive && G.races.includes(raceOf(sp)))) return false;
  }
  return true;
};
ACTIONS.push({
  id: 'faith_seek', name: '다른 신앙 알아보기', icon: 'pray',
  desc: '이 고장의 다른 신앙을 찾아가 이야기를 듣는다. 마음이 움직이면 개종할 수도 있다. 개종은 가족과 이웃의 눈길을 바꾼다.',
  available: (g) => playerAge(g) >= 13 && !traveling(g) && OPEN_GODS.some((x) => x !== F(g).god && GODS[x].shrines[here(g)]) && !sceneQueued(g, 'faith_convert'),
  run(g) { queueScene(g, 'faith_convert', {}); return '낯선 제단 앞을 몇 번이고 지나쳤다. 오늘은 걸음을 멈췄다.'; },
});
defineScene('faith_convert', {
  title: () => '다른 신',
  text: (g) => {
    const others = OPEN_GODS.filter((x) => x !== F(g).god && GODS[x].shrines[here(g)]);
    return others.map((x) => `${GODS[x].shrines[here(g)]}: ${GODS[x].desc}`).join(' ') || '이 고장에는 다른 제단이 없다.';
  },
  choices: (g) => {
    if (traveling(g)) return [];
    const f = F(g);
    const out = OPEN_GODS.filter((x) => x !== f.god && GODS[x].shrines[here(g)]).map((x) => (canConvert(g, x)
      ? { label: `${J(GODS[x].deity, '을/를')} 섬기기로 한다`, key: x }
      : { label: `${GODS[x].name}의 이야기만 듣는다 (같은 핏줄이 아니면 받아 주지 않는다)`, key: 'listen' }));
    if (!out.length) return [];
    out.push({ label: '이야기만 듣고 돌아간다', key: 'listen' });
    return out;
  },
  resolve(g, rng, s, key) {
    const f = F(g);
    if (key === 'listen' || !GODS[key]) { gainStat(g, 'int', 0.3); return '사제는 아니, 제관은 서두르지 않았다. "마음이 정해지면 다시 오시오." 돌아오는 길에 들은 이야기를 여러 번 되새겼다.'; }
    if (!canConvert(g, key)) return '그들은 나를 받아 주지 않았다.';
    const prev = f.god;
    f.god = key;
    f.devotion = 20;
    f.convertedAt = mi(g);
    if (key === 'solar') f.suspicion = Math.max(0, f.suspicion - 30);
    syncFlag(g);
    note(g, `${godName(prev)}을(를) 떠나 ${J(godName(key), '으로/로')} 개종했다.`);
    chron(g, `${g.player.name}, ${J(godName(key), '으로/로')} 개종하다.`, 50);
    // 독실한 가족은 서운해한다
    const hurt = [];
    for (const id of [...g.player.familyIds, me(g).spouseId]) {
      const p = byId(g, id);
      if (!p?.alive || p.isPlayer) continue;
      if (npcFaith(p) === prev && npcFaith(p) !== 'none') { p.affection -= has(p, 'pious') ? 12 : 4; hurt.push(p.name); remember(g, p, '조상의 신을 버렸다', -1, { tag: 'apostate' }); }
    }
    const fam = hurt.length ? ` ${hurt.slice(0, 2).join(', ')}의 얼굴이 굳었다.` : '';
    const lines = {
      solar: '사제가 이마에 성수를 떨어뜨렸다. 성광의 표식을 목에 걸었다. 차가운 쇠가 금방 체온으로 데워졌다.',
      earth: '할머니 제관이 내 손바닥에 흙을 쥐여 주고 손을 감쌌다. "어머니는 누구도 내치지 않아." 흙이 따뜻했다.',
      tree: '엘프 정원지기가 말없이 은잎 하나를 건넸다. 그것으로 끝이었다. 세계수는 서약을 묻지 않는다.',
      ancestor: '화로지기가 내 이름을 조상의 이름들 끝에 붙여 불렀다. 이제 나도 언젠가 불릴 이름이 되었다.',
      sea: '선원들이 나를 방파제 끝에서 바다로 밀었다. 짠물을 실컷 먹고 기어 올라오자 다들 박수를 쳤다. 그게 입문 의식이었다.',
    }[key];
    return `${lines}${fam}`;
  },
});

/* ---------- 신성력: 치유의 기도 ---------- */
ACTIONS.push({
  id: 'holy_heal', name: '치유의 기도', icon: 'pray',
  desc: '신성력으로 상처를 낫게 한다. 내 상처, 아니면 고장의 병자들. 지친다.',
  available: (g) => F(g).holy >= 5 && playerAge(g) >= 12 && !traveling(g),
  run(g, rng) {
    const f = F(g);
    tired(g, 14);
    const mine = g.player.injuries.filter((i) => !i.mortal);
    if (mine.length) {
      for (const i of mine) i.months = Math.max(0, i.months - Math.ceil(f.holy / 15));
      g.player.injuries = g.player.injuries.filter((i) => i.months > 0 || i.mortal);
      f.holy = Math.min(100, f.holy + 0.3);
      return '상처 위에 손을 얹고 기도했다. 빛이 살 속으로 스며들었다. 쑤시던 것이 가라앉았다.';
    }
    const sick = living(g).filter((p) => !p.isPlayer && p.place === here(g));
    const p = rng.pick(sick);
    L(g).renown = (L(g).renown ?? 0) + (rng.chance(0.4) ? 1 : 0);
    f.holy = Math.min(100, f.holy + 0.4);
    believe(g, 1);
    if (p) { p.affection = Math.min(100, p.affection + 6); if (!p.known) p.known = true; remember(g, p, '병을 고쳐 주었다', 1, { tag: 'healed' }); }
    return p ? `${J(fullName(p), '이/가')} 열병으로 누워 있다는 소식을 듣고 찾아갔다. 이마에 손을 얹었다. 사흘 뒤 그가 일어나 앉았다.` : '구호소를 돌며 병자들의 이마에 손을 얹었다.';
  },
});

/* ---------- 신앙마다 제관 일 ---------- */
registerJob('earth_keeper', {
  name: '대지의 제관', places: ['ern', 'verden', 'gruental'], skill: 'herbs', stat: 'wil', stat2: 'sen', wage: [1, 2, 4, 6], npcJob: 'herbalist',
  req: (g) => (F(g).god === 'earth' && F(g).devotion >= 35 ? null : '대지의 어머니를 섬기고 믿음 35'),
  lines: ['산모의 배에 흙 한 줌을 올리고 순산을 빌었다.', '가뭄 든 밭에 나가 맨발로 비를 불렀다. 사제가 멀리서 보고 있었다.', '첫 이삭 인형을 엮는 법을 아이들에게 가르쳤다.'],
});
registerJob('fire_keeper', {
  name: '조상의 화로지기', places: ['hammer', 'fur'], skill: 'smithing', stat: 'wil', wage: [2, 3, 5, 8], npcJob: 'smith',
  req: (g) => (F(g).god === 'ancestor' && F(g).devotion >= 35 ? null : '조상을 모시고 믿음 35'),
  lines: ['밤새 화로에 숯을 넣으며 조상의 이름을 외웠다.', '새로 죽은 전사의 이름을 토템 기둥에 새겼다. 손이 떨리지 않게 숨을 참았다.', '이름을 잊어버린 집안이 찾아왔다. 족보를 거슬러 그 이름을 찾아 주었다.'],
});
registerJob('sea_priest', {
  name: '바다의 제관', places: ['barka'], skill: 'trade', stat: 'wil', stat2: 'sen', wage: [2, 3, 5, 9], npcJob: 'sailor',
  req: (g) => (F(g).god === 'sea' && F(g).devotion >= 35 ? null : '바다의 늙은이를 섬기고 믿음 35'),
  lines: ['출항하는 배마다 뱃머리에 소금을 뿌려 주었다. 선장들이 은화를 쥐여 주었다.', '폭풍에 돌아오지 못한 배의 이름을 늙은이 바위에 새겼다.', '바닷물 맛으로 내일 날씨를 점쳤다. 맞았다. 대개는 맞는다.'],
});

/* ---------- 교단 안의 길: 파벌, 대주교, 성자 ---------- */
defineScene('faith_sect', {
  title: () => '교단 안의 갈림길',
  text: () => `서품을 받고 나니 교단이 하나가 아니라는 것이 보였다. 정통파는 "${SECTS.orthodox.claim}" 성녀파는 "${SECTS.saint.claim}" 정화파는 "${SECTS.purge.claim}" 셋 다 성녀 리아나의 이름을 부른다.`,
  choices: (g) => (F(g).sect ? [] : [
    { label: `정통파에 선다 (${SECTS.orthodox.head})`, key: 'orthodox' },
    { label: `성녀파에 선다 (${SECTS.saint.head})`, key: 'saint' },
    { label: `정화파에 선다 (${SECTS.purge.head})`, key: 'purge' },
    { label: '어느 쪽에도 서지 않는다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    const f = F(g);
    if (key === 'none') { f.sect = null; f.sceneAt = mi(g) + 24; return '어느 편도 들지 않았다. 아무도 나를 밀어주지 않을 것이다. 아무도 나를 버리지도 않을 것이다.'; }
    f.sect = key;
    note(g, `교단의 ${SECTS[key].name}에 섰다.`);
    if (key === 'orthodox') { const c = fac(g, 'church'); if (c) c.merit += 20; return '주교 앞에서 교황 성하께 충성을 맹세했다. 승급의 길이 조금 넓어졌다. 대신 내 말은 이제 내 것이 아니다.'; }
    if (key === 'saint') { believe(g, 5); return '수도원장이 내 손을 잡았다. 그 손은 밭일로 거칠었다. "우리 쪽은 출세하지 못하오. 대신 잠은 잘 자지."'; }
    addNotoriety(g, 2);
    return '정화파 사제들이 내게 성흔기사단의 표식이 새겨진 단검을 건넸다. "이단은 병이오. 병은 도려내는 것이오."';
  },
});
// 파벌마다 몇 해에 한 번 오는 일
defineScene('faith_sect_task', {
  title: (g, s) => `${SECTS[s.sect]?.name ?? '교단'}의 부탁`,
  text: (g, s) => ({
    orthodox: '대주교의 비서가 찾아왔다. 다음 왕위 다툼에서 교단은 장남 쪽에 선다. 내 교구의 영주에게 그 뜻을 전하고, 반대하면 파문을 암시하라고 했다.',
    saint: '수도원에 역병 환자들이 몰려들었다. 정통파 주교는 문을 닫으라고 명했다. 수도원장은 아무 말 없이 내 얼굴만 보았다.',
    purge: '정화파 사제가 쪽지를 내밀었다. 이 고장의 산파가 밤마다 돌 제단에 간다고 한다. 대지의 어머니를 섬기는 늙은이다. 심문소에 넘기라고 했다.',
  }[s.sect] ?? '교단에서 사람이 왔다.'),
  choices: (g, s) => (F(g).sect !== s.sect ? [] : ({
    orthodox: [{ label: '명대로 전한다', key: 'do' }, { label: '전하는 척만 한다', key: 'soft' }, { label: '거절한다', key: 'no' }],
    saint: [{ label: '문을 열어 둔다', key: 'do' }, { label: '주교의 명을 따른다', key: 'no' }],
    purge: [{ label: '심문소에 넘긴다', key: 'do' }, { label: '산파에게 몰래 알려 준다', key: 'warn' }, { label: '못 본 척한다', key: 'no' }],
  }[s.sect])),
  resolve(g, rng, s, key) {
    const f = F(g);
    const c = fac(g, 'church');
    if (s.sect === 'orthodox') {
      if (key === 'do') { if (c) c.merit += 40; L(g).renown += 2; believe(g, -3); return '영주는 얼굴이 하얘져서 고개를 끄덕였다. 교단의 칼은 칼집에서 나오지 않아도 벤다. 주교의 장부에 내 이름 옆에 동그라미가 쳐졌다.'; }
      if (key === 'soft') { if (c) c.merit += 10; return '뜻은 전했지만 파문 이야기는 하지 않았다. 영주는 고맙다는 듯 술잔을 내밀었다. 주교에게는 영주가 망설이더라고 적어 보냈다.'; }
      if (c) c.merit = Math.max(0, c.merit - 30);
      return '"그건 사제의 일이 아닙니다." 비서는 웃으며 돌아갔다. 다음 승급 명단에서 내 이름이 빠졌다는 소문이 들렸다.';
    }
    if (s.sect === 'saint') {
      if (key === 'do') {
        believe(g, 8); L(g).renown += 2;
        if (f.holy > 0) f.holy = Math.min(100, f.holy + 3);
        if (rng.chance(0.25)) { g.player.injuries.push({ name: '역병의 열', months: 3 }); return '석 달 동안 병자들 곁을 지켰다. 나도 열이 올랐다. 그래도 문은 닫지 않았다. 살아 나간 사람들이 수도원 담에 이름을 새기고 갔다.'; }
        return '석 달 동안 병자들 곁을 지켰다. 반은 죽고 반은 살았다. 살아 나간 사람들이 수도원 담에 이름을 새기고 갔다.';
      }
      if (c) c.merit += 15;
      believe(g, -6); stress(g, 15);
      return '문을 닫았다. 문 너머에서 밤새 두드리는 소리가 났다. 주교는 현명한 판단이라고 했다.';
    }
    // 정화파
    if (key === 'do') { if (c) c.merit += 35; addNotoriety(g, 3); stress(g, 10); believe(g, 2); chron(g, `한 고장의 산파가 이단으로 심문소에 끌려가다.`, 40); return '산파는 저항하지 않았다. 끌려가면서 나를 한 번 쳐다보았다. 그 눈빛이 오래 남았다. 정화파 사제들은 잘했다고 했다.'; }
    if (key === 'warn') {
      if (rng.chance(0.3)) { f.suspicion = Math.min(100, f.suspicion + 30); return '산파는 그날 밤 사라졌다. 정화파는 누가 귀띔했는지 찾고 있다. 내 이름이 그 장부의 맨 위에 있다.'; }
      believe(g, 3); return '산파는 그날 밤 짐을 싸서 사라졌다. 정화파 사제들은 한발 늦었다며 이를 갈았다.';
    }
    return '쪽지를 화로에 넣었다. 정화파 사제는 다음에 나를 볼 때 인사를 하지 않았다.';
  },
});
defineScene('faith_high', {
  title: (g, s) => (s.to === 2 ? '기적' : '추기경단의 부름'),
  text: (g, s) => (s.to === 2
    ? '역병이 돈 마을에서 밤새 기도했다. 새벽에 눈을 뜨자 마을 전체가 희미한 빛에 덮여 있었다. 병자들이 하나둘 일어나 앉았다. 사람들이 내 옷자락을 붙잡고 울었다. 소문은 성도까지 닿을 것이다. 교단은 기적을 사랑하지만, 살아 있는 성자는 두려워한다.'
    : '성도 솔라리스에서 봉인된 편지가 왔다. 추기경단이 나를 대주교로 천거한다고 했다. 대주교는 교구 수십 개를 다스리고, 교황 선출에 한 표를 가진다.'),
  choices: (g, s) => {
    const f = F(g);
    if (!(s.to === 1 && f.rank === 0) && !(s.to === 2 && f.rank === 1)) return [];
    return s.to === 2
      ? [{ label: '기적을 받아들인다', key: 'yes' }, { label: '이것은 여신의 일이지 내 일이 아니라고 말한다', key: 'humble' }]
      : [{ label: '받아들인다', key: 'yes' }, { label: '교구에 남겠다고 한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const f = F(g);
    if (s.to === 2) {
      f.rank = 2; f.holy = Math.min(100, f.holy + 10); L(g).renown += 10;
      note(g, '사람들이 나를 성자라 부르기 시작했다.');
      chron(g, `${g.player.name}, 기적을 일으켜 살아 있는 성자로 불리다.`);
      if (key === 'humble') { believe(g, 5); return '나는 아무것도 하지 않았다고 말했다. 사람들은 그 말 때문에 더 확신했다. 교황청은 나를 성자로 인정하는 문서를 쓰는 데 일 년을 끌었다. 그동안 내 이름을 부르는 사람은 늘기만 했다.'; }
      if (f.sect !== 'orthodox') f.suspicion = Math.min(100, f.suspicion + 15);
      return '나는 무릎을 꿇고 빛을 받아들였다. 그날부터 사람들은 나를 성자라 불렀다. 교황청에서 온 사절은 축하하면서도 내 얼굴을 오래 살폈다.';
    }
    if (key === 'no') { f.sceneAt = mi(g) + 36; believe(g, 3); return '편지를 정중하게 돌려보냈다. 내 교구의 사람들은 이름을 다 안다. 대주교는 이름을 모르는 사람들을 다스린다.'; }
    f.rank = 1; L(g).renown += 5;
    note(g, '대주교가 되었다.');
    chron(g, `${g.player.name}, 성광교 대주교에 오르다.`);
    return '솔라리스 대성당에서 대주교의 반지를 받았다. 무거웠다. 반지가 아니라 그 반지에 입 맞추려고 줄을 선 사람들이.';
  },
});

/* ---------- 이단 심문 ---------- */
defineScene('faith_inquisition', {
  title: () => '이단심문관',
  text: (g) => {
    const f = F(g);
    const why = f.dawn ? '검은 새벽의 집회에서 너를 보았다는 사람이 있다.'
      : f.god !== 'solar' ? `${J(GODS[f.god].deity, '을/를')} 섬긴다고 들었다.`
        : ['half_demon', 'demon'].includes(playerRace(g)) ? '너의 핏줄에 대해 묻고 싶은 것이 있다.'
          : '네 이름이 고발장에 적혀 있다.';
    return `회색 망토의 사내 둘이 문을 두드렸다. 이단심문소의 표식. "${why} 함께 가자. 오래 걸리지 않는다." 오래 걸리지 않는다고 말한 사람치고 금방 돌아온 사람은 없다고 들었다.`;
  },
  choices: (g) => {
    const f = F(g);
    if (traveling(g) || isJailed(g) || !['holy', 'leonia', 'march'].includes(realmOf(here(g)))) return [];
    const out = [{ label: '믿음을 증명한다 (심문을 받는다)', key: 'prove' }];
    if (f.god !== 'solar') out.push({ label: '성광교로 개종하겠다고 맹세한다', key: 'recant' });
    out.push({ label: `헌금을 바친다 (은화 ${bribe(g)}닢)`, key: 'bribe' });
    if (knownNeighbors(g).length) out.push({ label: '다른 사람을 고발한다', key: 'accuse' });
    out.push({ label: '밤에 달아난다', key: 'flee' });
    return out;
  },
  resolve(g, rng, s, key) {
    const f = F(g);
    const hard = realmOf(here(g)) === 'holy' ? 1.4 : 1;
    if (key === 'recant') {
      f.god = 'solar'; f.devotion = 15; f.suspicion = Math.max(0, f.suspicion - 45);
      syncFlag(g);
      note(g, '이단심문관 앞에서 성광교로 개종을 맹세했다.');
      return '심문관 앞에서 성광의 표식을 그었다. 무릎이 차가운 돌바닥에 닿았다. 그들은 만족한 얼굴로 돌아갔다. 집에 돌아와 손을 오래 씻었다.';
    }
    if (key === 'bribe') {
      const n = bribe(g);
      if (!spend(g, n)) return resolveInq(g, rng, 'prove', hard);
      f.suspicion = Math.max(0, f.suspicion - 25);
      return `은화 ${n}닢을 "성당 보수 헌금"이라고 적힌 장부에 올렸다. 심문관은 장부를 덮었다. "여신께서 보셨을 것이다." 다음에는 더 큰 헌금이 필요할 것이다.`;
    }
    if (key === 'accuse') {
      const p = rng.pick(knownNeighbors(g));
      if (!p) return resolveInq(g, rng, 'prove', hard);
      f.suspicion = Math.max(0, f.suspicion - 35);
      p.affection = Math.min(p.affection, -40);
      remember(g, p, '나를 이단으로 고발했다', -1, { tag: 'accused', recall: '네가 심문관에게 내 이름을 댄 날' });
      addNotoriety(g, 3);
      believe(g, -5); stress(g, 15);
      if (rng.chance(0.3 * hard)) { p.alive = false; p.deathCause = '화형'; p.history.push({ y: g.date.year, m: g.date.month, text: '이단으로 몰려 화형을 당했다.' }); chron(g, `${p.name}, 이단으로 몰려 화형당하다.`, 60); return `${fullName(p)}의 이름을 댔다. 심문관의 눈이 그쪽으로 돌아갔다. 한 달 뒤 광장에 장작이 쌓였다. 나는 가지 않았다. 연기는 집에서도 보였다.`; }
      return `${fullName(p)}의 이름을 댔다. 심문관들은 그를 데려갔다가 석 달 뒤에 풀어 주었다. 돌아온 그는 나를 보고도 아무 말도 하지 않았다. 그게 더 무서웠다.`;
    }
    if (key === 'flee') {
      const out = nearestFree(g);
      if (!out) return resolveInq(g, rng, 'prove', hard);
      f.suspicion = Math.max(0, f.suspicion - 10);
      addNotoriety(g, 4);
      const life = L(g);
      if (life.job) life.job = null;
      life.travel = { to: out, left: Math.max(1, travelMonths(life.place, out)), from: life.place };
      return `그날 밤 짐을 싸서 뒷문으로 나갔다. 일도 집도 두고 왔다. ${PLACES[out].name} 쪽으로 간다. 성광의 땅에서 도망친 이단자라는 소문이 나보다 먼저 갈 것이다.`;
    }
    return resolveInq(g, rng, 'prove', hard);
  },
});
const bribe = (g) => Math.round(20 + F(g).suspicion * 0.8);
const knownNeighbors = (g) => g.people.filter((p) => p.alive && p.known && !p.isPlayer && !p.away && p.place === here(g) && !g.player.familyIds.includes(p.id) && p.id !== me(g).spouseId && ageYears(p) >= 16);
function nearestFree(g) {
  const cands = Object.keys(PLACES).filter((p) => !PLACES[p].hidden && !['holy', 'leonia'].includes(realmOf(p)) && REALMS[realmOf(p)]);
  cands.sort((a, b) => travelMonths(here(g), a) - travelMonths(here(g), b));
  return cands[0] ?? null;
}
function resolveInq(g, rng, key, hard) {
  const f = F(g);
  const power = g.player.stats.wil * 0.6 + (f.god === 'solar' ? f.devotion * 0.4 : 0) + g.player.stats.int * 0.2 - (f.dawn ? 25 : 0);
  if (check(rng, power, 40 * hard)) {
    f.suspicion = Math.max(0, f.suspicion - 40);
    stress(g, 15);
    return '사흘 동안 같은 질문을 백 번 받았다. 교리문답을 거꾸로 외우게 했다. 손톱 밑에 바늘이 들어오기 전에, 그들은 나를 풀어 주었다. "의심은 풀렸다. 당분간은."';
  }
  // 실패: 옥살이. 검은 새벽이 들통나면 성도에서는 화형
  if (f.dawn && realmOf(here(g)) === 'holy' && f.suspicion >= 80 && rng.chance(0.5)) {
    L(g).pendingDeath = '화형';
    chron(g, `${g.player.name}, 마신 숭배자로 화형당하다.`);
    return '심문소의 지하실에서 그들은 결국 원하는 것을 얻었다. 검은 새벽의 표식이 내 몸에서 나왔다. 광장에 장작이 쌓였다. 마지막으로 본 것은 금빛 대성당의 돔이었다.';
  }
  f.suspicion = Math.max(0, f.suspicion - 30);
  g.player.injuries.push({ name: '심문소에서 얻은 상처', months: 3 });
  jail(g, Math.round(4 * hard + (f.dawn ? 6 : 0)));
  return '대답이 마음에 들지 않았던 모양이다. 심문소 지하실에서 며칠을 보냈는지 모른다. 정신이 들었을 때는 감옥이었다. 회개할 시간을 주겠다고 했다.';
}

/* ---------- 검은 새벽 ---------- */
defineScene('dawn_invite', {
  title: () => '검은 새벽',
  text: () => '선술집 구석에서 낯선 사람이 맞은편에 앉았다. 손목 안쪽에 검은 해가 뜨는 문신이 있었다. "성광은 너에게 무엇을 주었지? 우리는 오백 년 전에 빼앗긴 것을 되찾으려 한다. 힘을. 마신께서 깨어나시면 지금 위에 있는 자들은 모두 아래로 간다." 그는 탁자 위에 검은 깃털 하나를 두고 갔다.',
  choices: (g) => (F(g).dawn || traveling(g) || isJailed(g) ? [] : [
    { label: '깃털을 집는다', key: 'join' },
    { label: '깃털을 두고 나간다', key: 'no' },
    { label: '이단심문소에 알린다', key: 'report' },
  ]),
  resolve(g, rng, s, key) {
    const f = F(g);
    if (key === 'join') {
      f.dawn = { rank: 0, rites: 0, task: false };
      note(g, '검은 새벽에 들어갔다.');
      return '깃털을 집었다. 사흘 뒤 문틈으로 쪽지가 들어왔다. 장소와 시간, 그리고 검은 해 그림. 이제 돌아갈 길은 없다. 들키면 화형이다.';
    }
    f.dawnRefused = true;
    if (key === 'report') {
      believe(g, 4);
      if (f.god === 'solar') f.suspicion = Math.max(0, f.suspicion - 15);
      queueFight(g, rng, { title: '검은 새벽 소탕', intro: '심문관들을 안내해 지하 집회장으로 내려갔다. 촛불 너머로 검은 두건들이 일어섰다.', enc: { unit: 'cultist', count: rng.int(2, 4), leader: rng.chance(0.4) ? 'cult_priest' : null }, reward: { money: 15, renown: 3 }, avoidLabel: '심문관들 뒤로 물러난다', avoidText: '칼은 심문관들에게 맡겼다. 지하실에서 비명이 오래 이어졌다.' });
      return '깃털을 들고 성당으로 갔다. 심문관들이 고개를 끄덕였다. "길을 안내하라."';
    }
    return '깃털을 탁자에 둔 채 나왔다. 등 뒤에서 그 사람이 웃는 소리가 들렸다. "언젠가는 집게 될 거다."';
  },
});
ACTIONS.push({
  id: 'dawn_rite', name: '검은 새벽 집회', icon: 'magic',
  desc: '지하 집회장에서 마신에게 기도한다. 마력이 자라고 서열이 오른다. 들킬 때마다 화형대에 가까워진다.',
  available: (g) => !!F(g).dawn && isAdult(g) && !traveling(g) && DAWN_CITIES.includes(here(g)),
  run(g, rng) {
    const f = F(g);
    const d = f.dawn;
    if (!d || !DAWN_CITIES.includes(here(g))) return '이 고장에는 새벽의 형제들이 모이는 곳이 없다.';
    d.rites += 1;
    tired(g, 10);
    f.suspicion = Math.min(100, f.suspicion + rng.int(3, 8));
    if (g.player.manaAwakened) g.player.mana = (g.player.mana ?? 0) + 1.5 + g.player.manaPotential * 2;
    const w = gainStat(g, 'wil', 0.4);
    let rank = '';
    if (d.rank < 2 && d.rites >= [6, 18][d.rank]) { d.rank += 1; rank = ` 오늘부터 나는 ${DAWN_RANKS[d.rank]}다.`; note(g, `검은 새벽의 ${DAWN_RANKS[d.rank]}이(가) 되었다.`); }
    return `${rng.pick(['촛불 아홉 개 사이에서 검은 해의 기도문을 외웠다. 땅 밑에서 무언가가 대답하는 것 같았다.', '두건 쓴 사람들이 손목을 그어 피를 한 그릇에 모았다. 내 피도 섞였다. 따뜻했다.', '사도가 마신이 깨어나는 날의 이야기를 했다. 왕들이 무릎을 꿇고, 교황의 금관이 진창에 구른다.'])}${rank}${gains([up('의지', w), g.player.manaAwakened ? '마력 +' : null])}`;
  },
});
defineScene('dawn_task', {
  title: () => '사도의 부탁',
  text: () => '사도가 나를 따로 불렀다. "왕도 대성당 지하에 성녀의 유물이 있다. 봉인을 지탱하는 쐐기 가운데 하나지. 그것을 가져와라. 아니면 우리를 뒤쫓는 심문관 하나를 조용히 만들어라. 어느 쪽이든 마신께서 기억하실 것이다."',
  choices: (g) => (!F(g).dawn || F(g).dawn.task || traveling(g) || isJailed(g) ? [] : [
    { label: '유물을 훔치러 간다', key: 'relic' },
    { label: '심문관을 노린다', key: 'kill' },
    { label: '못 하겠다고 한다', key: 'no' },
    { label: '이단심문소에 모든 것을 털어놓는다', key: 'betray' },
  ]),
  resolve(g, rng, s, key) {
    const f = F(g);
    const d = f.dawn;
    if (!d) return '검은 새벽과는 이미 끝났다.';
    d.task = true;
    if (key === 'relic') {
      if (check(rng, g.player.stats.agi * 0.5 + g.player.stats.sen * 0.4 + (L(g).crime?.craft ?? 0) * 0.2, 45)) {
        d.rank = Math.min(2, d.rank + 1); addNotoriety(g, 6); f.suspicion = Math.min(100, f.suspicion + 15);
        chron(g, '왕도 대성당 지하에서 성녀의 유물이 사라지다. 교단은 범인을 찾고 있다.');
        return '지하 납골당의 자물쇠는 오백 년 묵은 것이었다. 은 상자는 생각보다 가벼웠다. 사도는 상자를 받아 들고 처음으로 무릎을 꿇었다. 나에게.';
      }
      f.suspicion = Math.min(100, f.suspicion + 35);
      jail(g, 10);
      return '납골당 문 앞에서 성흔기사에게 붙잡혔다. 사도는 나를 모른다고 할 것이다.';
    }
    if (key === 'kill') {
      queueFight(g, rng, { title: '골목의 심문관', intro: '회색 망토가 골목으로 꺾어 드는 것을 따라갔다. 그는 혼자가 아니었다.', enc: { unit: 'watchman', count: 2, leader: 'watch_sergeant' }, reward: { money: 5 }, avoidLabel: '그림자 속으로 물러난다', avoidText: '칼을 거두고 물러났다. 사도에게는 기회가 없었다고 할 것이다.' });
      d.rank = Math.min(2, d.rank + 1); addNotoriety(g, 8); f.suspicion = Math.min(100, f.suspicion + 10);
      return '사도가 회색 망토 하나의 이름과 그가 매일 지나는 골목을 알려 주었다.';
    }
    if (key === 'betray') {
      f.dawn = null; f.dawnRefused = true;
      f.suspicion = Math.max(0, f.suspicion - 30);
      L(g).renown += 4; believe(g, 10);
      chron(g, `검은 새벽의 집회장이 이단심문소에 발각되어 수십 명이 끌려가다.`);
      return '이단심문소 문을 두드렸다. 이름과 장소와 날짜를 모두 댔다. 그 주에 지하 집회장 세 곳이 불탔다. 나는 회개한 자로 장부에 올랐다. 살아남은 형제들이 나를 찾고 있을 것이다.';
    }
    d.rank = Math.max(0, d.rank - 1);
    return '"겁쟁이에게 마신의 은총은 없다." 사도는 차갑게 말했다. 집회에서 내 자리가 뒤로 밀렸다.';
  },
});
