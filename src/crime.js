// 악당의 길: 도둑질·사기·뒷조사·협박·암살, 목격자와 발각, 수배(열기)·현상금·체포·감옥·탈옥·도주.
// 악명(L(g).notoriety)과 이름값(L(g).renown)은 갈래 D의 game.life를 이어 쓴다.
//
// game.crime = {
//   craft: 0~100        범죄 수완 (몰래, 재빨리, 들키지 않게)
//   heat: { [place]: n } 그 고장 경비대가 나를 쫓는 정도 (0~100)
//   bounty: { [place]: n } 걸린 현상금 (은화)
//   record: [{ c, place, at, paid }] 들킨 죄
//   secrets: [{ id, what, power }] 뒷조사로 쥔 약점
//   jailed: null | { place, months, total }
//   gang: null | { id, rank, rep, since }   (underworld/gangs.js)
//   hostile: { [gangId]: true }            등 돌린 조직
//   murders: 0, crimes: 0, lastAt: null
// }
import { J, join, up, gains, pickLine } from './narrative/text.js';
import { ACTIONS } from './actions.js';
import { EVENTS } from './events.js';
import { HOOKS } from './hooks.js';
import { me, playerAge, gainStat, gainSkill } from './game.js';
import { living, byId, ageYears, fullName, has, kill } from './npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, SCENE_ID } from './adventure/core.js';
import { PLACES, leaveJob } from './places.js';
import { FOES } from './adventure/combat.js';
import { runFight } from './adventure/fight.js';
import { remember, rel } from './relations.js';
import * as T from './underworld/text.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mi = (g) => g.date.year * 12 + g.date.month;
export const here = (g) => L(g).place ?? 'ern';
const local = (g, p) => (p.place ?? 'ern') === here(g);
const placeName = (g, id = here(g)) => PLACES[id]?.name ?? '마을';

// 경비대: 장소마다 이름이 다르다
const WATCH = { ern: '마을 경비대', harfen: '하르펜 경비대', verden: '백작령 위병', leocast: '왕도 경비대' };
export const watchName = (g, id = here(g)) => WATCH[id] ?? '경비대';

// 경비대·현상금 사냥꾼을 적 목록에 더한다 (combat.js의 FOES에 덧붙이기)
Object.assign(FOES, {
  watchman: { name: '경비병', pow: 18, human: true, weapon: '미늘창' },
  watch_sergeant: { name: '경비대 조장', pow: 34, human: true, leader: true, weapon: '장검' },
  bounty_hunter: { name: '현상금 사냥꾼', pow: 30, human: true, weapon: '석궁' },
  hunter_chief: { name: '이름난 현상금 사냥꾼', pow: 48, human: true, leader: true, weapon: '쇠사슬 낫' },
});

export function crimeState(g) {
  g.crime ??= {};
  const c = g.crime;
  c.craft ??= 0;
  c.heat ??= {};
  c.bounty ??= {};
  c.record ??= [];
  c.secrets ??= [];
  c.jailed ??= null;
  c.gang ??= null;
  c.hostile ??= {};
  c.murders ??= 0;
  c.crimes ??= 0;
  c.lastAt ??= null;
  return c;
}
const C = crimeState;

// 죄의 무게: heat(경비대가 얼마나 들끓나) sev(형기, 달) noto(악명)
export const CRIMES = {
  pickpocket: { name: '소매치기', heat: 10, sev: 1, noto: 1 },
  burglary: { name: '빈집털이', heat: 18, sev: 3, noto: 2 },
  fraud: { name: '사기', heat: 14, sev: 2, noto: 2 },
  snoop: { name: '남의 집 엿보기', heat: 6, sev: 0, noto: 1 },
  blackmail: { name: '협박', heat: 18, sev: 4, noto: 3 },
  assault: { name: '폭행', heat: 20, sev: 3, noto: 3 },
  attempt: { name: '살인 미수', heat: 40, sev: 10, noto: 8 },
  murder: { name: '살인', heat: 70, sev: 24, noto: 15 },
  resist: { name: '경비대 습격', heat: 50, sev: 8, noto: 8 },
  jailbreak: { name: '탈옥', heat: 45, sev: 6, noto: 5 },
  smuggling: { name: '밀수', heat: 12, sev: 3, noto: 1 },
  extortion: { name: '갈취', heat: 14, sev: 2, noto: 2 },
};

// ---------- 악명 ----------
export function notoriety(g) { return L(g).notoriety ?? 0; }
export function addNotoriety(g, n) { L(g).notoriety = clamp((L(g).notoriety ?? 0) + n, 0, 100); }
export function notorietyWord(g) {
  const n = notoriety(g);
  if (n < 5) return null;
  if (n < 15) return '손버릇이 나쁘다는 소문';
  if (n < 30) return '뒷골목에서 이름이 오르내린다';
  if (n < 50) return '악명 높은 범죄자';
  if (n < 75) return '모두가 두려워하는 이름';
  return '왕국에 이름난 악당';
}
// 이 사람이 나의 악명을 어떻게 받아들이나: 양수면 호감, 음수면 반감 (한 번 만날 때의 보정)
export function reputationShift(g, p) {
  const n = notoriety(g), r = L(g).renown ?? 0;
  let s = r / 40;
  if (has(p, 'pious') || has(p, 'kind') || has(p, 'diligent')) s -= n / 14;
  else if (has(p, 'cruel') || has(p, 'greedy') || has(p, 'ambitious')) s += n / 30;
  else if (has(p, 'timid')) s -= n / 20;
  else s -= n / 25;
  if (p.job === 'gang_boss' || p.job === 'rat_boss' || p.thug) s += n / 20;
  return Math.round(s);
}

export const isJailed = (g) => !!C(g).jailed;
export const craftOf = (g) => C(g).craft;
function growCraft(g, base) {
  const c = C(g);
  const gnn = base * (1 - c.craft / 120) * (0.8 + g.player.stats.agi / 200);
  c.craft = Math.min(100, c.craft + gnn);
  return gnn;
}
// 몰래 하는 솜씨: 수완, 민첩, 감각
const stealth = (g) => C(g).craft * 0.6 + g.player.stats.agi * 0.25 + g.player.stats.sen * 0.25;
const check = (rng, value, difficulty) => rng.chance(clamp(0.5 + (value - difficulty) / 40, 0.05, 0.95));

// ---------- 들킴 ----------
// 기록에 남기고, 그 고장 경비대의 열기와 현상금을 올린다
export function reportCrime(g, crime, place = here(g), { mult = 1 } = {}) {
  const c = C(g);
  const d = CRIMES[crime];
  c.record.push({ c: crime, place, at: mi(g), paid: false });
  if (c.record.length > 40) c.record.splice(0, c.record.length - 40);
  c.heat[place] = clamp((c.heat[place] ?? 0) + d.heat * mult, 0, 100);
  if (d.sev >= 2) c.bounty[place] = (c.bounty[place] ?? 0) + d.sev * 5;
  addNotoriety(g, d.noto);
}
// 형기: 그 고장에서 갚지 않은 죄의 합. 영주의 성정에 따라 달라진다.
export function sentenceAt(g, place = here(g)) {
  const c = C(g);
  let m = c.record.filter((r) => !r.paid && r.place === place).reduce((s, r) => s + CRIMES[r.c].sev, 0);
  const t = g.realm?.lord?.temper;
  if (t === 'harsh') m *= 1.5;
  if (t === 'weak') m *= 0.7;
  if (c.gang && GANG_PROTECT(g, place)) m *= 0.7;
  return Math.min(60, Math.max(1, Math.round(m)));
}
export const fineAt = (g, place = here(g)) => sentenceAt(g, place) * 8;
const unpaidAt = (g, place = here(g)) => C(g).record.some((r) => !r.paid && r.place === place);
function clearAt(g, place) {
  const c = C(g);
  for (const r of c.record) if (r.place === place) r.paid = true;
  c.heat[place] = 0;
  c.bounty[place] = 0;
}
// 조직이 보호하는 고장인가 (gangs.js가 채운다)
let GANG_PROTECT = () => false;
export function setGangProtect(fn) { GANG_PROTECT = fn; }

// 목격자: 일을 벌인 그 고장 사람 중에서. exposure는 얼마나 드러난 일인가 (0~1)
function witnessOf(g, rng, exposure, exclude = []) {
  const p = clamp(exposure - stealth(g) / 160, 0.03, 0.92);
  if (!rng.chance(p)) return null;
  const locals = living(g).filter((x) => !x.isPlayer && local(g, x) && ageYears(x) >= 7 && !exclude.includes(x.id));
  return locals.length ? rng.pick(locals) : null;
}

// 들켰을 때의 이야기: 누가 보았고, 그 사람이 어떻게 하는가
function exposeCrime(g, rng, crime, { exposure, victim = null, what }) {
  const w = witnessOf(g, rng, exposure, victim ? [victim.id] : []);
  if (!w) return '';
  rel(w);
  const meP = me(g);
  const kin = g.player.familyIds.includes(w.id);
  w.known = true;
  remember(g, w, `${what} 것을 보았다`, -1, { tag: 'saw_crime', recall: `네가 ${what} 걸 내가 봤던 일` });
  if (kin) {
    w.affection -= 10; stress(g, 10);
    return T.WITNESS.kin(w);
  }
  // 아이일 때는 감옥 대신 매와 꾸지람
  if (playerAge(g) < 14) {
    w.affection -= 4; addNotoriety(g, 1); stress(g, 12);
    const f = byId(g, g.player.familyIds[0]);
    if (f?.alive) f.affection -= 4;
    return T.WITNESS.child(w, f);
  }
  if ((has(w, 'greedy') || has(w, 'cruel')) && ageYears(w) >= 16 && !sceneQueued(g, 'witness_blackmail')) {
    queueScene(g, 'witness_blackmail', { id: w.id, crime });
    return T.WITNESS.greedy(w);
  }
  if (has(w, 'gossip')) {
    addNotoriety(g, CRIMES[crime].noto + 1);
    for (const q of living(g)) if (q.known && local(g, q) && q !== w && (has(q, 'pious') || has(q, 'kind'))) q.affection -= 2;
    if (rng.chance(0.5)) reportCrime(g, crime, here(g), { mult: 0.6 });
    return T.WITNESS.gossip(w);
  }
  if (w.affection >= 50 && !has(w, 'pious')) {
    w.affection -= 8;
    return T.WITNESS.friend(w);
  }
  if (has(w, 'timid') && rng.chance(0.5)) { w.affection -= 6; return T.WITNESS.timid(w); }
  w.affection -= 8;
  reportCrime(g, crime);
  return T.WITNESS.report(w, watchName(g));
}

// 피해자가 나중에 눈치챈다
function victimSuspects(g, rng, victim, crime, chance) {
  if (!victim || !rng.chance(chance)) return '';
  rel(victim);
  victim.known = true;
  victim.affection -= 15;
  remember(g, victim, `${CRIMES[crime].name}을 당했다`, -1, { tag: 'victim', recall: `네가 내게 한 짓` });
  if (victim.affection <= -40) victim.bond = victim.bond === 'spouse' ? 'spouse' : 'enemy';
  if (has(victim, 'timid') || rng.chance(0.4)) return T.VICTIM.silent(victim);
  reportCrime(g, crime, here(g), { mult: 0.7 });
  return T.VICTIM.report(victim, watchName(g));
}

// 범죄 행동의 공통 마무리
function afterCrime(g, crime) {
  const c = C(g);
  c.crimes += 1;
  c.lastAt = mi(g);
}

// 고장마다 털 것과 사람 수
const LOOT = { ern: 1, harfen: 1.6, verden: 1.5, leocast: 2.4 };
const CROWD = { ern: 0.42, harfen: 0.4, verden: 0.42, leocast: 0.3 }; // 사람이 많을수록 소매치기는 덜 눈에 띈다
const lootMul = (g) => LOOT[here(g)] ?? 1;
const notJailed = (g) => !isJailed(g) && !L(g).travel;
const crimeAge = (n) => (g) => playerAge(g) >= n && notJailed(g);
const targetOk = (g, p) => p && p.alive && !p.away && !p.isPlayer && local(g, p);

// ---------- 범죄 행동 ----------
ACTIONS.push(
  {
    id: 'crime_pickpocket',
    name: '소매치기',
    icon: 'coin',
    crime: true,
    desc: '장터와 골목의 사람들 틈에서 남의 주머니를 노린다. 큰 고장일수록 벌이가 낫고 덜 눈에 띈다. 들키면 끝이다.',
    available: crimeAge(8),
    run(g, rng) {
      if (isJailed(g)) return '';
      tired(g, 6);
      const k = growCraft(g, 1.4), a = gainStat(g, 'agi', 0.4);
      const ok = check(rng, stealth(g), 22 + (here(g) === 'ern' ? 6 : 0));
      let text;
      if (ok) {
        const n = Math.max(1, Math.round(rng.int(1, 4) * lootMul(g) * (0.7 + C(g).craft / 80)));
        g.player.money += n;
        text = join(pickLine(g, rng, T.PICKPOCKET_OK), `은화 ${n}닢.`);
      } else text = pickLine(g, rng, T.PICKPOCKET_FAIL);
      const exp = ok ? CROWD[here(g)] ?? 0.4 : 0.85;
      afterCrime(g, 'pickpocket');
      return join(text, exposeCrime(g, rng, 'pickpocket', { exposure: exp, what: '남의 주머니를 터는' }), gains(up('수완', k), up('민첩', a)));
    },
  },
  {
    id: 'crime_burglary',
    name: '빈집 털기',
    icon: 'shield',
    crime: true,
    needsTarget: true,
    desc: '아는 사람의 집이 빈 틈을 노려 들어간다. 부잣집일수록 챙길 게 많지만, 들키면 그 사람과는 원수가 된다. (사람을 고른다)',
    available: crimeAge(13),
    run(g, rng, choice) {
      if (isJailed(g)) return '';
      const v = byId(g, choice.target);
      if (!targetOk(g, v)) return '그 집은 이 고장에 없다. 헛걸음이었다.';
      if (g.player.familyIds.includes(v.id)) return '식구의 궤짝을 열려다 손을 멈췄다. 어차피 같은 집 돈이다.';
      tired(g, 10); stress(g, 4);
      const k = growCraft(g, 1.6), sn = gainStat(g, 'sen', 0.3);
      const diff = 30 + (v.wealth > 100 ? 12 : 0) + (['knight_captain', 'count', 'gang_boss', 'guildmaster'].includes(v.job) ? 25 : 0);
      const ok = check(rng, stealth(g), diff);
      let text;
      if (ok) {
        const n = Math.max(2, Math.round(clamp(v.wealth * rng.float(0.12, 0.3), 2, 60) * (lootMul(g) > 1.5 ? 1.2 : 1)));
        v.wealth = Math.max(0, v.wealth - n);
        g.player.money += n;
        text = join(pickLine(g, rng, T.BURGLE_OK, v), `은화 ${n}닢을 챙겼다.`);
      } else text = pickLine(g, rng, T.BURGLE_FAIL, v);
      afterCrime(g, 'burglary');
      const w = exposeCrime(g, rng, 'burglary', { exposure: ok ? 0.35 : 0.75, victim: v, what: `${v.name}네 집을 터는` });
      const s = ok ? victimSuspects(g, rng, v, 'burglary', 0.25) : (v.affection -= 5, '');
      return join(text, w, s, gains(up('수완', k), up('감각', sn)));
    },
  },
  {
    id: 'crime_fraud',
    name: '사기',
    icon: 'scroll',
    crime: true,
    desc: '가짜 약, 없는 땅문서, 꾸며 낸 사연. 말솜씨와 머리로 남의 돈을 가져온다. 속은 사람은 오래 기억한다.',
    available: crimeAge(14),
    run(g, rng) {
      if (isJailed(g)) return '';
      tired(g, 6);
      const k = growCraft(g, 1.0), c = gainStat(g, 'cha', 0.4), i = gainStat(g, 'int', 0.3);
      const marks = living(g).filter((p) => !p.isPlayer && local(g, p) && ageYears(p) >= 16 && !g.player.familyIds.includes(p.id));
      const v = marks.length ? rng.pick(marks) : null;
      const power = g.player.stats.cha * 0.45 + g.player.stats.int * 0.35 + g.player.skills.trade * 0.3 + C(g).craft * 0.3;
      const diff = 26 + (v && (has(v, 'reserved') || has(v, 'greedy')) ? 8 : 0);
      if (!v) return '속일 만한 사람이 없었다.';
      v.known = true;
      if (check(rng, power, diff)) {
        const n = Math.max(2, Math.round(clamp(v.wealth * rng.float(0.1, 0.2), 2, 35) * lootMul(g)));
        v.wealth = Math.max(0, v.wealth - n);
        g.player.money += n;
        afterCrime(g, 'fraud');
        const s = victimSuspects(g, rng, v, 'fraud', 0.35);
        return join(pickLine(g, rng, T.FRAUD_OK, v), `은화 ${n}닢을 받아 냈다.`, s, gains(up('수완', k), up('매력', c), up('지능', i)));
      }
      afterCrime(g, 'fraud');
      v.affection -= 6;
      remember(g, v, '수상한 거래를 제안받았다', -1, { tag: 'fraud_try' });
      const rep = rng.chance(0.4) ? (reportCrime(g, 'fraud', here(g), { mult: 0.6 }), ` ${J(v.name, '은/는')} 경비대에 그 일을 이야기했다.`) : '';
      return join(pickLine(g, rng, T.FRAUD_FAIL, v), rep, gains(up('수완', k), up('매력', c)));
    },
  },
  {
    id: 'crime_snoop',
    name: '뒷조사',
    icon: 'wander',
    crime: true,
    needsTarget: true,
    desc: '누군가의 뒤를 밟고, 창문 밑에서 엿듣고, 하인을 구슬린다. 약점을 쥐면 협박할 수 있다. (사람을 고른다)',
    available: crimeAge(12),
    run(g, rng, choice) {
      if (isJailed(g)) return '';
      const v = byId(g, choice.target);
      if (!targetOk(g, v)) return '그 사람은 이 고장에 없다.';
      tired(g, 6);
      const k = growCraft(g, 0.9), sn = gainStat(g, 'sen', 0.5), i = gainStat(g, 'int', 0.3);
      const c = C(g);
      if (c.secrets.some((s) => s.id === v.id)) return join(`${v.name}의 약점은 이미 쥐고 있다. 더 캐 봐야 나올 게 없었다.`, gains(up('감각', sn)));
      if (!check(rng, stealth(g) + g.player.stats.int * 0.2, 28)) {
        afterCrime(g, 'snoop');
        return join(T.SNOOP_FAIL(v), exposeCrime(g, rng, 'snoop', { exposure: 0.5, victim: v, what: `${v.name}의 뒤를 밟는` }), gains(up('수완', k), up('감각', sn)));
      }
      const sec = secretOf(g, rng, v);
      c.secrets.push({ id: v.id, what: sec.what, power: sec.power, at: mi(g) });
      if (c.secrets.length > 12) c.secrets.shift();
      afterCrime(g, 'snoop');
      return join(T.SNOOP_OK(v, sec.what), gains(up('수완', k), up('감각', sn), up('지능', i)));
    },
  },
  {
    id: 'crime_blackmail',
    name: '협박',
    icon: 'scroll',
    crime: true,
    needsTarget: true,
    desc: '쥐고 있는 약점을 들이밀어 돈을 뜯는다. 겁먹고 내는 사람도, 끝까지 맞서는 사람도 있다. 약점을 쥔 사람에게만 할 수 있다. (사람을 고른다)',
    available: (g) => crimeAge(16)(g) && C(g).secrets.length > 0,
    run(g, rng, choice) {
      if (isJailed(g)) return '';
      const v = byId(g, choice.target);
      const c = C(g);
      const sec = v && c.secrets.find((s) => s.id === v.id);
      if (!v || !sec) return '그 사람에 대해선 쥐고 있는 게 없었다. 빈손으로 협박할 수는 없다.';
      if (!targetOk(g, v)) return '그 사람은 이 고장에 없다.';
      stress(g, 6);
      const k = growCraft(g, 0.8), w = gainStat(g, 'wil', 0.4);
      rel(v); v.known = true;
      afterCrime(g, 'blackmail');
      const fear = has(v, 'timid') ? 25 : has(v, 'brave') || has(v, 'cruel') ? -20 : 0;
      const nerve = g.player.stats.wil * 0.4 + g.player.stats.cha * 0.3 + C(g).craft * 0.3 + sec.power * 10 + fear;
      remember(g, v, '약점을 쥐고 협박했다', -1, { tag: 'blackmail', recall: '네가 날 협박했던 일' });
      v.affection -= 20;
      if (v.affection <= -40) v.bond = 'enemy';
      if (check(rng, nerve, 34)) {
        const n = Math.max(3, Math.round(clamp(v.wealth * (0.1 + sec.power * 0.08), 3, 80)));
        v.wealth = Math.max(0, v.wealth - n);
        g.player.money += n;
        sec.power = Math.max(0, sec.power - 1); // 같은 약점은 갈수록 힘을 잃는다
        if (sec.power === 0) c.secrets = c.secrets.filter((s) => s !== sec);
        return join(T.BLACKMAIL_OK(v, sec.what, n), gains(up('수완', k), up('의지', w)));
      }
      c.secrets = c.secrets.filter((s) => s !== sec);
      // 맞선다: 경비대에 가거나, 사람을 사서 갚는다
      if ((has(v, 'cruel') || v.wealth > 60) && rng.chance(0.5)) {
        queueScene(g, 'thugs', { id: v.id, why: 'blackmail' });
        return join(T.BLACKMAIL_THUGS(v), gains(up('의지', w)));
      }
      reportCrime(g, 'blackmail');
      return join(T.BLACKMAIL_REPORT(v, watchName(g)), gains(up('의지', w)));
    },
  },
  {
    id: 'crime_assassinate',
    name: '암살',
    icon: 'sword',
    crime: true,
    needsTarget: true,
    desc: '누군가를 죽인다. 약초를 알면 독을, 검을 알면 칼을 쓴다. 들키면 살인자로 쫓기고, 실패하면 상대가 나를 안다. 되돌릴 수 없다. (사람을 고른다)',
    available: crimeAge(16),
    run(g, rng, choice) {
      if (isJailed(g)) return '';
      const v = byId(g, choice.target);
      if (!targetOk(g, v)) return '그 사람은 이 고장에 없다. 칼을 다시 품에 넣었다.';
      return assassinate(g, rng, v, {});
    },
  },
  {
    id: 'crime_lie_low',
    name: '몸 사리기',
    icon: 'rest',
    desc: '사람 많은 곳을 피하고, 얌전히 일하는 척한다. 경비대의 눈길이 조금씩 식는다.',
    available: (g) => notJailed(g) && (C(g).heat[here(g)] ?? 0) > 0,
    run(g, rng) {
      if (isJailed(g)) return '';
      const c = C(g);
      c.heat[here(g)] = Math.max(0, (c.heat[here(g)] ?? 0) - rng.int(10, 16));
      stress(g, 4);
      return pickLine(g, rng, T.LIE_LOW);
    },
  },
  {
    id: 'crime_surrender',
    name: '죗값 치르기',
    icon: 'pray',
    desc: '경비대에 찾아가 벌금을 낸다. 돈이 모자라면 감옥에 간다. 이 고장의 죄는 깨끗해진다.',
    available: (g) => notJailed(g) && playerAge(g) >= 14 && unpaidAt(g),
    run(g, rng) {
      if (isJailed(g) || !unpaidAt(g)) return '';
      const fine = fineAt(g);
      if (g.player.money >= fine) {
        g.player.money -= fine;
        clearAt(g, here(g));
        addNotoriety(g, -2);
        note(g, `${watchName(g)}에 벌금 은화 ${fine}닢을 내고 죗값을 치렀다.`);
        return T.SURRENDER_FINE(watchName(g), fine);
      }
      const m = sentenceAt(g);
      jail(g, m);
      return T.SURRENDER_JAIL(watchName(g), m);
    },
  },
);

// 약점 만들기: 성격과 처지, 마을의 소문(관계 갈래의 NPC끼리 관계)에서 나온다
function secretOf(g, rng, v) {
  const ties = g.relations?.ties ?? [];
  const flirt = ties.find((t) => t.kind === 'flirt' && (t.a === v.id || t.b === v.id));
  if (flirt && v.spouseId) {
    const o = byId(g, flirt.a === v.id ? flirt.b : flirt.a);
    if (o) return { what: `배우자 몰래 ${J(o.name, '과/와')} 만나고 있다`, power: 3 };
  }
  const pool = [];
  if (has(v, 'drunkard')) pool.push({ what: '술값으로 진 빚을 식구들에게 숨기고 있다', power: 2 });
  if (has(v, 'greedy')) pool.push({ what: '세리에게 장부를 속여 세금을 빼돌렸다', power: 3 });
  if (has(v, 'pious')) pool.push({ what: '성광교 헌금함에 손을 댄 적이 있다', power: 3 });
  if (has(v, 'cruel')) pool.push({ what: '몇 해 전 일꾼 하나를 때려 불구로 만들고 입을 막았다', power: 3 });
  if (has(v, 'ambitious')) pool.push({ what: '영주의 반대파와 편지를 주고받는다', power: 3 });
  if (has(v, 'gossip')) pool.push({ what: '자기가 퍼뜨린 헛소문 때문에 한 집안이 마을을 떠났다', power: 1 });
  if (v.job === 'priest' || v.job === 'bishop') pool.push({ what: '밤마다 금서를 읽는다', power: 2 });
  if (v.job === 'guard' || v.job === 'knight' || v.job === 'knight_captain') pool.push({ what: '검은 장갑에게 뒷돈을 받는다', power: 3 });
  if (v.job === 'merchant' || v.job === 'shopkeeper' || v.job === 'trade_master') pool.push({ what: '저울에 납을 붙여 무게를 속인다', power: 2 });
  pool.push({ what: '젊었을 때 다른 고장에서 도망쳐 왔다', power: 1 }, { what: '숨겨 둔 자식이 있다', power: 2 });
  return rng.pick(pool);
}

// ---------- 암살 ----------
export function assassinate(g, rng, v, { contract = null } = {}) {
  stress(g, 18);
  tired(g, 10);
  const p = g.player;
  const poison = p.skills.herbs >= 25 && p.skills.herbs >= p.skills.sword;
  const method = poison ? 'poison' : 'blade';
  const power = poison
    ? p.skills.herbs * 0.5 + C(g).craft * 0.4 + p.stats.int * 0.2
    : p.skills.sword * 0.45 + C(g).craft * 0.35 + p.stats.agi * 0.3;
  const guarded = ['knight_captain', 'count', 'gang_boss', 'guildmaster', 'court_mage', 'bishop'].includes(v.job) ? 30 : 0;
  const diff = 32 + guarded + (has(v, 'brave') ? 6 : 0) + (v.job === 'guard' || v.job === 'knight' ? 10 : 0);
  const k = growCraft(g, 2.0);
  afterCrime(g, 'murder');
  rel(v);
  const kin = g.player.familyIds.includes(v.id);
  if (check(rng, power, diff)) {
    const cause = poison ? '알 수 없는 병' : '괴한의 칼';
    kill(g, v, cause);
    C(g).murders += 1;
    addNotoriety(g, 4);
    note(g, kin ? `${J(fullName(v), '을/를')} 죽였다. 아무도 모른다. 나만 안다.` : `${J(fullName(v), '을/를')} 죽였다.`);
    stress(g, kin ? 30 : 10 + (C(g).murders === 1 ? 15 : 0));
    // 가까운 사람들은 슬퍼하고, 범인을 찾는다
    for (const q of living(g)) if (!q.isPlayer && (q.spouseId === v.id || q.fatherId === v.id || q.motherId === v.id || v.childIds.includes(q.id))) {
      rel(q); remember(g, q, `${J(v.name, '을/를')} 잃었다`, 0, { tag: 'mourning' });
    }
    const scene = T.MURDER_OK(v, method, C(g).murders, kin);
    const w = exposeCrime(g, rng, 'murder', { exposure: poison ? 0.2 : 0.45, victim: v, what: poison ? `${v.name}의 잔에 무언가를 타는` : `${J(v.name, '을/를')} 찌르는` });
    // 목격자가 없어도 경비대는 수상한 죽음을 조사한다
    if (!w && !poison && rng.chance(0.25)) { C(g).heat[here(g)] = clamp((C(g).heat[here(g)] ?? 0) + 15, 0, 100); }
    return join(scene, w, gains(up('수완', k)));
  }
  // 실패: 상대가 살아남아 나를 안다
  v.affection = Math.min(v.affection, -60);
  v.bond = 'enemy';
  remember(g, v, '나를 죽이려 했다', -1, { tag: 'attempt', recall: '네가 날 죽이려 했던 그날 밤' });
  reportCrime(g, 'attempt');
  let wound = '';
  if (!poison && rng.chance(0.5)) {
    p.injuries.push({ name: '칼에 베인 팔', months: 3 });
    wound = ' 몸싸움 끝에 팔을 깊게 베였다.';
  }
  return join(T.MURDER_FAIL(v, method) + wound, gains(up('수완', k)));
}

// ---------- 감옥 ----------
export function jail(g, months) {
  const c = C(g);
  const place = here(g);
  months = Math.max(1, Math.round(months));
  c.jailed = { place, months, total: months };
  clearAt(g, place);
  leaveJob(g, `${placeName(g)} 감옥에 갇히며 일을 잃었다.`);
  note(g, `${placeName(g)} 감옥에 ${months}달 갇혔다.`);
  chron(g, `${g.player.name}, ${placeName(g)}에서 붙잡혀 ${months}달 옥살이를 하게 되다.`);
  const meP = me(g);
  for (const id of g.player.familyIds) { const f = byId(g, id); if (f?.alive && f !== meP) f.affection -= 6; }
  L(g).renown = Math.max(0, (L(g).renown ?? 0) - 2);
  stress(g, 20);
}
const JAIL_ACTIONS = new Set(['jail_endure', 'jail_labor', 'jail_talk', 'jail_escape']);
HOOKS.actionFilter.push((g, a) => {
  if (isJailed(g)) return JAIL_ACTIONS.has(a.id);
  if (JAIL_ACTIONS.has(a.id)) return false;
  return true;
});
ACTIONS.push(
  {
    id: 'jail_endure', name: '견디기', icon: 'meditate',
    desc: '좁은 감방에서 하루하루를 센다. 마음이 단단해지거나, 무너진다.',
    available: (g) => isJailed(g),
    run(g, rng) {
      if (!C(g).jailed) return '';
      const w = gainStat(g, 'wil', 0.8);
      stress(g, g.player.stress > 70 ? 2 : 6);
      return join(pickLine(g, rng, T.JAIL_ENDURE), gains(up('의지', w)));
    },
  },
  {
    id: 'jail_labor', name: '강제 노역', icon: 'labor',
    desc: '채석장과 성벽 공사에 끌려나간다. 고되지만 성실하면 형기가 조금 준다.',
    available: (g) => isJailed(g),
    run(g, rng) {
      if (!C(g).jailed) return '';
      tired(g, 20);
      const s = gainStat(g, 'str', 0.9);
      const c = C(g);
      if (rng.chance(0.25) && c.jailed.months > 1) { c.jailed.months -= 1; return join(pickLine(g, rng, T.JAIL_LABOR), '간수장이 형기를 한 달 줄여 주었다.', gains(up('힘', s))); }
      return join(pickLine(g, rng, T.JAIL_LABOR), gains(up('힘', s)));
    },
  },
  {
    id: 'jail_talk', name: '죄수들과 어울리기', icon: 'visit',
    desc: '같은 감방 사람들의 이야기를 듣는다. 뒷골목의 요령과 연줄이 생긴다.',
    available: (g) => isJailed(g),
    run(g, rng) {
      if (!C(g).jailed) return '';
      const k = growCraft(g, 1.2);
      stress(g, -4);
      const c = C(g);
      c.contacts = (c.contacts ?? 0) + 1;
      return join(pickLine(g, rng, T.JAIL_TALK), gains(up('수완', k)));
    },
  },
  {
    id: 'jail_escape', name: '탈옥', icon: 'travel',
    desc: '창살을 갈고, 간수를 매수하고, 하수구를 기어 나간다. 실패하면 형기가 늘고 다친다. 성공하면 쫓기는 몸이 된다.',
    available: (g) => isJailed(g),
    run(g, rng) {
      if (!C(g).jailed) return '';
      const c = C(g);
      const p = g.player;
      const power = C(g).craft * 0.5 + p.stats.agi * 0.3 + p.stats.int * 0.3 + (c.contacts ?? 0) * 2;
      tired(g, 15);
      if (check(rng, power, 50)) {
        const place = c.jailed.place;
        c.jailed = null;
        reportCrime(g, 'jailbreak', place);
        c.heat[place] = 100;
        note(g, `${placeName(g, place)} 감옥을 빠져나왔다.`);
        chron(g, `${g.player.name}, ${placeName(g, place)} 감옥을 탈옥하다.`);
        return T.ESCAPE_OK(placeName(g, place));
      }
      c.jailed.months += 6; c.jailed.total += 6;
      p.injuries.push({ name: '간수에게 맞은 갈비뼈', months: 2 });
      stress(g, 15);
      return T.ESCAPE_FAIL;
    },
  },
);

// ---------- 체포 장면 ----------
defineScene('arrest', {
  title: () => '체포',
  text: (g, s) => T.ARREST_TEXT(watchName(g), sentenceAt(g), fineAt(g), notoriety(g)),
  choices: (g) => {
    const out = [];
    const fine = fineAt(g);
    if (g.player.money >= fine) out.push({ label: `벌금을 낸다 (은화 ${fine}닢)`, key: 'fine' });
    out.push({ label: '순순히 따라간다', key: 'go' });
    out.push({ label: `뇌물을 찔러 준다 (은화 ${bribeCost(g)}닢)`, key: 'bribe' });
    out.push({ label: '달아난다', key: 'flee' });
    out.push({ label: '칼을 뽑는다', key: 'fight' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = C(g);
    const place = here(g);
    if (key === 'fine') {
      const fine = fineAt(g);
      if (g.player.money < fine) return resolveArrest(g, rng, 'go');
      g.player.money -= fine;
      clearAt(g, place);
      return T.ARREST_FINE(fine);
    }
    return resolveArrest(g, rng, key);
  },
});
const bribeCost = (g) => Math.round(6 + sentenceAt(g) * 4 * (g.realm?.lord?.temper === 'greedy' ? 0.6 : 1) * (C(g).gang && GANG_PROTECT(g, here(g)) ? 0.5 : 1));
function resolveArrest(g, rng, key) {
  const c = C(g);
  const place = here(g);
  const months = sentenceAt(g);
  if (key === 'bribe') {
    const cost = bribeCost(g);
    if (g.player.money < cost) { jail(g, months + 1); return T.BRIBE_BROKE(months + 1); }
    g.player.money -= cost;
    const odds = 0.55 + (g.realm?.lord?.temper === 'greedy' ? 0.25 : 0) - (g.realm?.lord?.temper === 'harsh' ? 0.25 : 0) + (c.gang && GANG_PROTECT(g, place) ? 0.2 : 0) - (notoriety(g) > 60 ? 0.2 : 0);
    if (rng.chance(clamp(odds, 0.1, 0.95))) { c.heat[place] = Math.max(0, (c.heat[place] ?? 0) - 40); return T.BRIBE_OK(cost); }
    jail(g, months + 2);
    return T.BRIBE_FAIL(cost, months + 2);
  }
  if (key === 'flee') {
    if (check(rng, g.player.stats.agi * 0.6 + c.craft * 0.4 + g.player.stats.sen * 0.2, 30)) {
      c.heat[place] = Math.min(100, (c.heat[place] ?? 0) + 10);
      c.bounty[place] = (c.bounty[place] ?? 0) + 10;
      addNotoriety(g, 2);
      return T.FLEE_OK(placeName(g));
    }
    jail(g, months + 3);
    return T.FLEE_FAIL(months + 3);
  }
  if (key === 'fight') {
    const enc = { unit: 'watchman', count: place === 'ern' ? 2 : place === 'leocast' ? 5 : 3, leader: place === 'ern' ? null : 'watch_sergeant' };
    const r = runFight(g, rng, { enc, reward: {} }, 'charge', { short: true });
    if (L(g).pendingDeath) { reportCrime(g, 'resist'); return r.text; }
    if (r.outcome === 'win' || r.outcome === 'overwhelm' || r.outcome === 'flee') {
      reportCrime(g, 'resist');
      c.heat[place] = 100;
      return join(r.text, T.FIGHT_WIN(watchName(g)));
    }
    reportCrime(g, 'resist');
    const m = sentenceAt(g);
    if (shouldHang(g)) return join(r.text, gallows(g));
    jail(g, m);
    return join(r.text, T.FIGHT_LOSE(m));
  }
  // 순순히
  if (shouldHang(g)) return gallows(g);
  jail(g, months);
  return T.GO_QUIET(months, placeName(g));
}
// 살인을 거듭한 악명 높은 자는 교수대에 선다
function shouldHang(g) {
  const c = C(g);
  const murders = c.record.filter((r) => !r.paid && r.place === here(g) && r.c === 'murder').length;
  return murders >= 2 || (murders >= 1 && notoriety(g) >= 60 && g.realm?.lord?.temper === 'harsh');
}
function gallows(g) {
  L(g).pendingDeath = '교수형';
  addNotoriety(g, 5);
  return T.GALLOWS(placeName(g));
}

// ---------- 목격자의 협박, 앙갚음하는 무리 ----------
defineScene('witness_blackmail', {
  title: () => '보았다는 사람',
  text: (g, s) => T.WB_TEXT(byId(g, s.id), CRIMES[s.crime].name),
  choices: (g, s) => {
    const w = byId(g, s.id);
    if (!w?.alive) return [{ label: '…', key: 'gone' }];
    return [
      { label: `입막음 값을 준다 (은화 ${wbCost(g, s)}닢)`, key: 'pay' },
      { label: '거꾸로 겁을 준다', key: 'scare' },
      { label: '아예 입을 막는다', key: 'kill' },
      { label: '마음대로 하라고 한다', key: 'dare' },
    ];
  },
  resolve(g, rng, s, key) {
    const w = byId(g, s.id);
    if (!w?.alive || key === 'gone') return '그 사람은 더 이상 아무 말도 할 수 없게 되었다.';
    if (key === 'pay') {
      const n = wbCost(g, s);
      if (g.player.money < n) { reportCrime(g, s.crime); return T.WB_BROKE(w); }
      g.player.money -= n; w.wealth += n;
      C(g).secrets.push({ id: w.id, what: '범죄를 보고도 입막음 값을 받았다', power: 2, at: mi(g) });
      return T.WB_PAY(w, n);
    }
    if (key === 'scare') {
      if (check(rng, g.player.stats.wil * 0.5 + g.player.stats.str * 0.3 + notoriety(g) * 0.4, 30 + (has(w, 'cruel') ? 10 : 0))) {
        w.affection -= 10; remember(g, w, '협박을 당했다', -1, { tag: 'threat' });
        return T.WB_SCARE_OK(w);
      }
      reportCrime(g, s.crime); reportCrime(g, 'assault', here(g), { mult: 0.5 });
      return T.WB_SCARE_FAIL(w, watchName(g));
    }
    if (key === 'kill') return assassinate(g, rng, w, {});
    reportCrime(g, s.crime);
    return T.WB_DARE(w, watchName(g));
  },
});
const wbCost = (g, s) => Math.round(8 + CRIMES[s.crime].sev * 6);

defineScene('thugs', {
  title: () => '골목의 사내들',
  text: (g, s) => T.THUGS_TEXT(byId(g, s.id)),
  choices: () => [
    { label: '맞서 싸운다', key: 'charge' },
    { label: '기습해서 먼저 친다', key: 'ambush' },
    { label: '지갑을 던지고 달아난다', key: 'run' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'run') {
      const n = Math.min(g.player.money, rng.int(5, 20));
      g.player.money -= n;
      stress(g, 10);
      return T.THUGS_RUN(n);
    }
    const enc = { unit: 'thug', count: rng.int(2, 4), leader: rng.chance(0.3) ? 'bandit_chief' : null };
    return runFight(g, rng, { enc, reward: {} }, key);
  },
});

// 현상금 사냥꾼
defineScene('bounty_hunters', {
  title: () => '현상금 사냥꾼',
  text: (g, s) => T.HUNTER_TEXT(s.total),
  choices: (g, s) => [
    { label: '싸운다', key: 'charge' },
    { label: '기습한다', key: 'ambush' },
    { label: `더 큰 돈을 쥐여 준다 (은화 ${Math.round(s.total * 0.8)}닢)`, key: 'pay' },
    { label: '얌전히 끌려간다', key: 'yield' },
  ],
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'pay') {
      const n = Math.round(s.total * 0.8);
      if (g.player.money >= n) { g.player.money -= n; return T.HUNTER_PAID(n); }
      key = 'yield';
    }
    if (key === 'yield') {
      // 현상금이 가장 큰 고장으로 끌려가 형을 산다
      const [place] = Object.entries(c.bounty).sort((a, b) => b[1] - a[1])[0] ?? [here(g)];
      const m = sentenceAt(g, place);
      L(g).place = place;
      L(g).travel = null;
      jail(g, m);
      return T.HUNTER_YIELD(placeName(g, place), m);
    }
    const enc = { unit: 'bounty_hunter', count: rng.int(1, 3), leader: s.total >= 80 ? 'hunter_chief' : null };
    const r = runFight(g, rng, { enc, reward: {} }, key, { short: true });
    if (r.outcome === 'win' || r.outcome === 'overwhelm') { addNotoriety(g, 2); return join(r.text, T.HUNTER_WIN); }
    if (r.outcome === 'flee') return join(r.text, T.HUNTER_FLED);
    // 지면 끌려간다
    const [place] = Object.entries(C(g).bounty).sort((a, b) => b[1] - a[1])[0] ?? [here(g)];
    const m = sentenceAt(g, place);
    if (L(g).pendingDeath) return r.text;
    L(g).place = place; L(g).travel = null;
    jail(g, m);
    return join(r.text, T.HUNTER_YIELD(placeName(g, place), m));
  },
});

// ---------- 한 달마다 ----------
HOOKS.afterNpc.push((g, rng, sim) => {
  const c = C(g);
  const place = here(g);
  // 열기는 조금씩 식는다
  for (const k of Object.keys(c.heat)) c.heat[k] = Math.max(0, c.heat[k] - (k === place ? 3 : 5));
  // 악명도 아주 천천히 잊힌다 (최근에 아무 일도 없었다면)
  if (c.lastAt == null || mi(g) - c.lastAt > 6) addNotoriety(g, -0.25);

  // 감옥
  if (c.jailed) {
    c.jailed.months -= 1;
    if (c.jailed.months <= 0) {
      const total = c.jailed.total;
      c.jailed = null;
      note(g, `${total}달 만에 감옥에서 풀려났다.`);
      sim.push({ text: `${J(g.player.name, '이/가')} ${total}달 옥살이를 마치고 풀려났다.`, who: [g.player.id], weight: 6 });
      stress(g, -10);
      // 오래 갇혀 있으면 배우자가 떠날 수도 있다
      const sp = byId(g, me(g).spouseId);
      if (sp?.alive && total >= 12 && sp.affection < 40 && rng.chance(0.4)) {
        sp.spouseId = null; me(g).spouseId = null; sp.bond = 'ex';
        note(g, `옥살이 동안 ${J(sp.name, '이/가')} 떠났다.`);
        sim.push({ text: `${J(fullName(sp), '이/가')} 옥살이하는 ${g.player.name}을 기다리지 못하고 집을 나갔다.`, who: [sp.id], weight: 8 });
      }
    }
    return;
  }
  if (L(g).travel || g.over) return;
  // 체포
  const h = c.heat[place] ?? 0;
  if (h >= 35 && unpaidAt(g) && playerAge(g) >= 14 && !sceneQueued(g, 'arrest') && rng.chance((h - 25) / 110)) {
    queueScene(g, 'arrest', {}, { first: true });
    return;
  }
  // 현상금 사냥꾼: 다른 고장의 현상금도 쫓아온다
  const total = Object.values(c.bounty).reduce((a, b) => a + b, 0);
  if (total >= 30 && playerAge(g) >= 15 && !sceneQueued(g, 'bounty_hunters') && rng.chance(Math.min(0.08, total / 1500))) {
    queueScene(g, 'bounty_hunters', { total });
  }
  // 악명이 퍼진다: 이 고장의 바른 사람들은 등을 돌리고, 거친 사람들은 다가온다
  if (g.date.month % 3 === 0 && notoriety(g) >= 15) {
    for (const q of living(g)) {
      if (q.isPlayer || !q.known || !local(g, q) || g.player.familyIds.includes(q.id)) continue;
      const d = reputationShift(g, q);
      if (d) q.affection = clamp(q.affection + Math.sign(d) * Math.min(3, Math.abs(d)), -100, 100);
    }
  }
});

// 감옥에서는 바깥의 평범한 사건이 일어나지 않는다 (한 번뿐인 사건과 감옥 장면은 남긴다)
const JAIL_SCENES = new Set(['arrest', 'gang_rescue', 'heir']);
HOOKS.endOfMonth.push((g) => {
  if (!isJailed(g) || !g.pendingEvent) return;
  const pe = g.pendingEvent;
  if (pe.id === SCENE_ID) { if (JAIL_SCENES.has(L(g).scene?.kind)) return; L(g).queue.unshift(L(g).scene); L(g).scene = null; g.pendingEvent = null; return; }
  const ev = EVENTS.find((e) => e.id === pe.id);
  if (ev?.once) return;
  g.pendingEvent = null;
});

// ---------- 새 게임, 옛 저장, 대 잇기 ----------
HOOKS.newGame.push((g) => { crimeState(g); });
HOOKS.migrate.push((g) => { crimeState(g); });
HOOKS.heir.push((g) => {
  const c = C(g);
  // 부모의 죄는 자식에게 넘어가지 않는다. 악명은 heir.js가 반으로 줄인다.
  g.crime = { craft: Math.floor(c.craft * 0.2), hostile: c.hostile };
  crimeState(g);
});
