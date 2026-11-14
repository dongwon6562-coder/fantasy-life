// 이름난 사람들: 모험가, 기사, 마법사, 상인, 무법자, 학자. 해마다 이름을 얻거나 잃고, 늙고, 죽는다.
// 마을을 떠난 사람(에른의 소꿉친구, 형제)도 여기서 이어서 살아간다. 크게 된 사람은 빈 자리(길드 지부장, 기사단장)를 잇는다.
// 장소의 중요한 사람이 죽으면 자리가 비고, 한두 달 뒤 누군가 그 자리를 잇는다.
import { H, clamp, MAX, KIND, GUILD_RANKS, personName } from './state.js';
import { J } from '../narrative/text.js';
import { JOBS } from '../data.js';
import { makePerson, byId, fullName, ageYears, relevance, kill } from '../npc.js';
import { monthIndex } from '../world.js';

const PLACE_NAME = { ern: '에른', harfen: '하르펜', verden: '베르덴', leocast: '왕도' };
const nm = (n) => `${n.epithet ? `'${n.epithet}' ` : ''}${n.name} ${n.lastName}`;

// 이름값에 따른 칭호. 높은 서클은 아주 드물다: 4서클은 이름값 85, 5서클은 97에서야.
export function notableTitle(n) {
  if (n.kind === 'adventurer') return `${GUILD_RANKS[[0, 15, 30, 45, 62, 80, 95].filter((t) => n.fame >= t).length - 1]}급 모험가`;
  if (n.kind === 'mage') return `${n.fame >= 97 ? 5 : n.fame >= 85 ? 4 : n.fame >= 60 ? 3 : 2}서클 마법사`;
  if (n.kind === 'knight') return n.fame >= 75 ? '이름난 기사' : n.fame >= 45 ? '정기사' : '견습 기사';
  if (n.kind === 'merchant') return n.fame >= 70 ? '큰 상인' : '상인';
  if (n.kind === 'outlaw') return n.fame >= 60 ? '현상금이 걸린 무법자' : '뒷골목의 칼잡이';
  return n.fame >= 70 ? '이름난 학자' : '학자';
}
export const notableLine = (n) => `${nm(n)} (${notableTitle(n)}, ${n.age}세${n.place ? `, ${PLACE_NAME[n.place] ?? ''}` : ''})`;

// 이 사람 이야기를 플레이어가 얼마나 신경 쓸까
const relOf = (g, n) => (n.pid ? relevance(g, byId(g, n.pid)) : 0);

function addNotable(g, n) {
  const list = H(g).notables;
  list.push(n);
  if (list.length > MAX.notables) {
    // 플레이어와 이어진 사람은 남기고, 이름값이 가장 낮은 사람부터 잊힌다
    const cand = list.filter((x) => !x.pid).sort((a, b) => a.fame - b.fame)[0] ?? list.sort((a, b) => a.fame - b.fame)[0];
    list.splice(list.indexOf(cand), 1);
  }
}
const drop = (g, n) => { const l = H(g).notables; const i = l.indexOf(n); if (i >= 0) l.splice(i, 1); };

// 마을을 떠난 사람을 이어서 살게 한다
function recruitAway(g, rng) {
  const hist = H(g);
  const seen = new Set(hist.seenAway);
  for (const p of g.people) {
    if (!p.away || !p.alive || p.isPlayer || seen.has(p.id)) continue;
    hist.seenAway.push(p.id);
    let kind = null;
    if (p.job === 'adventurer' || p.job === 'hunter') kind = 'adventurer';
    else if (p.job === 'merchant') kind = 'merchant';
    else if (p.traits?.includes('ambitious') || rng.chance(0.35)) kind = rng.pick(['adventurer', 'knight', 'merchant', 'outlaw', 'adventurer']);
    if (!kind) continue;
    addNotable(g, { name: p.name, lastName: p.lastName, sex: p.sex, kind, fame: rng.int(4, 14), age: ageYears(p), place: rng.pick(['harfen', 'harfen', 'leocast', 'verden']), since: g.date.year, pid: p.id, home: 'ern' });
  }
  if (hist.seenAway.length > 120) hist.seenAway.splice(0, hist.seenAway.length - 120);
}

function spawnNotable(g, rng) {
  const P = H(g).powers, r = g.realm;
  const kinds = ['adventurer', 'knight', 'mage', 'merchant', 'outlaw', 'scholar'];
  const kind = rng.weighted(kinds, (k) => ({ adventurer: P.guild, knight: P.knights, mage: P.mages * 0.5, merchant: P.merchants, outlaw: r.blackGlove * 0.7, scholar: 8 + r.era * 4 })[k]);
  const sex = kind === 'knight' ? (rng.chance(0.12) ? 'f' : 'm') : rng.chance(0.4) ? 'f' : 'm';
  addNotable(g, { ...personName(rng, sex), sex, kind, fame: rng.int(14, 30), age: rng.int(19, 30), place: rng.pick(['harfen', 'leocast', 'leocast', 'verden']), since: g.date.year });
}

function die(g, rng, n, cause, say, record) {
  const p = n.pid ? byId(g, n.pid) : null;
  const rel = relOf(g, n);
  if (p?.alive) kill(g, p, cause);
  drop(g, n);
  const big = n.fame >= 70 || rel >= 60;
  say(`${notableTitle(n)} ${J(nm(n), '이/가')} ${cause}${cause.endsWith('마쳤다') ? '' : cause.endsWith('으로') ? ' 세상을 떠났다' : ' 목숨을 잃었다'}. ${n.age}세였다.${rel >= 40 ? ` 에른 사람들은 ${n.sex === 'f' ? '그녀' : '그'}가 어릴 적 뛰놀던 모습을 기억한다.` : ''}`, big, rel || null);
  if (big) record(`${nm(n)} 사망`);
}

function yearOf(g, rng, n, say, record) {
  const r = g.realm, P = H(g).powers;
  const p = n.pid ? byId(g, n.pid) : null;
  if (p && !p.alive) { drop(g, n); return; }
  n.age += 1;
  if (p) p.ageMonths += 12; // 떠난 사람은 마을 시뮬레이션에서 빠져 있으니 여기서 나이를 먹는다
  const rel = relOf(g, n);
  const war = r.balhart.war || r.succession === 'civilwar' || r.north.war;
  // 죽음
  let risk = n.age > 55 ? (n.age - 55) * 0.012 : 0.004;
  if (n.kind === 'adventurer') risk += Math.max(0.01, 0.06 - n.fame * 0.0005) + (r.monsters > 60 ? 0.02 : 0);
  if (n.kind === 'knight') risk += war ? 0.05 : 0.008;
  if (n.kind === 'outlaw') risk += 0.03 + Math.max(0, 50 - r.blackGlove) * 0.001;
  if (rng.chance(risk)) {
    const cause = n.age > 62 && rng.chance(0.6) ? '노환으로'
      : n.kind === 'adventurer' ? rng.pick(['미궁 깊은 곳에서', '마물 토벌 중에', '호위하던 상단이 습격당해'])
      : n.kind === 'knight' ? (war ? rng.pick(['전장에서', '요새 공방전에서']) : '마상 시합 사고로')
      : n.kind === 'outlaw' ? rng.pick(['교수대에서 생을 마쳤다', '뒷골목 칼부림에서'])
      : rng.pick(['열병으로', '마차 사고로']);
    die(g, rng, n, cause, say, record);
    return;
  }
  // 이름값의 흐름
  const before = n.fame;
  const grow = n.age < 33 ? 3 : n.age < 48 ? 0.8 : -2.2;
  n.fame = clamp(n.fame + rng.normal(grow * (n.kind === 'mage' ? 0.55 : 1), 3.5), 0, 100);
  // 공적
  if (rng.chance(0.16 + (war && n.kind === 'knight' ? 0.15 : 0) + (r.monsters > 55 && n.kind === 'adventurer' ? 0.1 : 0))) {
    n.fame = clamp(n.fame + rng.int(7, 15), 0, 100);
    const deed = {
      adventurer: n.fame >= 55 ? ['미궁의 주인을 쓰러뜨렸다', '마을 하나를 삼킨 오우거 무리를 홀로 몰아냈다', '아무도 돌아오지 못한 폐광에서 살아 돌아왔다'] : ['고블린 굴 하나를 동료들과 소탕했다', '길을 잃은 상단을 이끌고 숲을 빠져나왔다', '다친 동료를 업고 미궁 삼 층에서 살아 나왔다'],
      knight: war ? ['적 기병대의 돌격을 막아 냈다', '포위된 요새를 구해 냈다'] : ['마상 시합에서 우승했다', '왕도 검술 대회에서 이름을 떨쳤다'],
      mage: ['새 술식을 협회에 올렸다', '마물이 넘치던 미궁 입구를 결계로 봉했다', '서클 승급 시험을 통과했다'],
      merchant: ['큰 군납 계약을 따냈다', '남부 교역로를 새로 열었다'],
      outlaw: ['귀족의 금고를 털었다', '경비대장의 목에 칼을 대고 빠져나갔다'],
      scholar: ['오래된 마신 전쟁 기록을 풀어냈다', '세레니아에서 강의를 맡았다'],
    }[n.kind];
    const big = (before < 80 && n.fame >= 80) || rel >= 60;
    if (n.fame >= 40 || rel >= 40) say(`${notableTitle(n)} ${J(nm(n), '이/가')} ${rng.pick(deed)}.${rel >= 40 ? ' 에른을 떠났던 그 사람이다.' : ''}`, big, rel || null);
    if (big) record(`${nm(n)}, ${J(notableTitle(n), '으로/로')} 이름을 떨침`);
    if (p) p.history.push({ y: g.date.year, m: g.date.month, text: `${J(notableTitle(n), '으로/로')} 이름을 알렸다.` });
  } else if (rng.chance(n.kind === 'outlaw' ? 0.12 : 0.04)) {
    // 몰락
    if (n.kind === 'outlaw' && rng.chance(0.5)) { die(g, rng, n, '경비대에 붙잡혀 교수대에서 생을 마쳤다', say, record); return; }
    n.fame = clamp(n.fame - rng.int(15, 28), 0, 100);
    const fallTxt = {
      adventurer: '의뢰를 버리고 도망쳤다는 소문이 돌아 길드에서 쫓겨났다',
      knight: '부정한 돈을 받은 일이 드러나 박차를 빼앗겼다',
      mage: P.church > 60 ? '성광교 이단 심문관에게 끌려갔다. 금기 마법을 썼다는 혐의다' : '실험 중 폭발로 탑 한 층을 날렸다. 협회가 근신을 명했다',
      merchant: '빚에 몰려 가게를 넘겼다',
      outlaw: '경비대에 붙잡혀 지하 감옥에 갇혔다',
      scholar: '표절이 드러나 세레니아에서 쫓겨났다',
    }[n.kind];
    say(`${notableTitle(n)} ${J(nm(n), '이/가')} ${fallTxt}.`, rel >= 60, rel || null);
    if (n.kind === 'mage' && P.church > 60 && rng.chance(0.4)) { n.kind = 'outlaw'; }
  }
  // 은퇴: 늙은 사람은 칼을 놓는다. 에른 출신은 고향으로 돌아온다.
  if ((n.age > (n.kind === 'scholar' ? 64 : 58) && rng.chance(0.18)) || n.fame <= 3) {
    drop(g, n);
    if (p && n.home === 'ern' && p.alive) {
      p.away = false; p.place = 'ern';
      p.history.push({ y: g.date.year, m: g.date.month, text: '오랜 떠돌이 생활을 접고 에른으로 돌아왔다.' });
      say(`${J(fullName(p), '이/가')} 오랜 세월 끝에 에른으로 돌아왔다. ${n.fame >= 45 ? `${J(notableTitle(n), '으로/로')} 이름을 날리던 사람이다.` : '떠날 때보다 많이 늙었다.'}`, rel >= 60, Math.max(rel, 45));
    } else if (n.fame >= 60) say(`${notableTitle(n)} ${J(nm(n), '이/가')} 은퇴했다. ${rng.pick(['남쪽 바닷가에 작은 집을 샀다고 한다.', '제자들에게 모든 것을 넘겼다.', '조용히 수도원에 들어갔다.'])}`);
  }
}

// ---------- 빈 자리 잇기 ----------
const HEIR_OF = {
  guildmaster: (n) => n.kind === 'adventurer' && n.fame >= 60 && n.age >= 35,
  knight_captain: (n) => n.kind === 'knight' && n.fame >= 55,
  senior_knight: (n) => n.kind === 'knight',
  sword_master: (n) => n.kind === 'knight' && n.fame >= 45,
  court_mage: (n) => n.kind === 'mage' && n.fame >= 62,
  trade_master: (n) => n.kind === 'merchant' && n.fame >= 50,
  gang_boss: (n) => n.kind === 'outlaw' && n.fame >= 40,
  scholar: (n) => n.kind === 'scholar',
};
const SKIP_ROLES = new Set(['rival']);

function succeed(g, rng, place, role, old, say, record) {
  const life = g.life;
  const job = old?.job ?? role;
  const cand = HEIR_OF[role] ? H(g).notables.filter(HEIR_OF[role]).sort((a, b) => b.fame - a.fame)[0] : null;
  let p;
  if (cand && cand.pid && byId(g, cand.pid)?.alive) {
    p = byId(g, cand.pid);
    p.away = false;
  } else {
    const sex = cand?.sex ?? (role === 'count' || role === 'bishop' ? 'm' : old?.sex ?? (rng.chance(0.5) ? 'm' : 'f'));
    const age = cand?.age ?? (role === 'count' ? rng.int(18, 40) : rng.int(28, 50));
    p = makePerson(rng, { sex, ageMonths: age * 12 + rng.int(0, 11), job, traits: old?.traits ?? [] });
    if (cand) { p.name = cand.name; p.lastName = cand.lastName; }
    else if (role === 'count' && old) p.lastName = old.lastName;
    g.people.push(p);
  }
  p.job = job; p.place = place; p.role = role;
  p.skill = Math.max(p.skill ?? 0, cand ? Math.round(40 + cand.fame * 0.5) : Math.max(35, (old?.skill ?? 55) - rng.int(0, 12)));
  p.wealth = Math.max(p.wealth ?? 0, rng.int(30, 200));
  p.history.push({ y: g.date.year, m: g.date.month, text: `${PLACE_NAME[place]}의 ${JOBS[job]?.name ?? role} 자리에 올랐다.` });
  life.placeNpcs[place].push(p.id);
  if (cand) drop(g, cand);
  const oldRel = old ? relevance(g, old) : 0;
  const big = role === 'count' || role === 'court_mage' || (role === 'knight_captain' && place === 'leocast');
  const title = JOBS[job]?.name ?? role;
  const text = role === 'count'
    ? `베르덴 백작 ${J(old?.name ?? '', '이/가')} 세상을 떠나고 ${J(fullName(p), '이/가')} 작위를 이었다.`
    : `${PLACE_NAME[place]}의 ${title} 자리에 ${J(fullName(p), '이/가')} 올랐다.${cand ? ` ${J(notableTitle(cand), '으로/로')} 이름을 날리던 사람이다.` : ''}${old ? ` 전임자 ${J(old.name, '은/는')} ${old.alive ? '자리에서 물러났다' : '세상을 떠났다'}.` : ''}`;
  say(text, big, oldRel >= 40 ? Math.round(oldRel) : null);
  if (big) record(`${PLACE_NAME[place]} ${title}: ${fullName(p)}`);
}

function vacancies(g, rng, say, record) {
  const life = g.life, hist = H(g);
  if (!life?.placeNpcs) return;
  const now = monthIndex(g);
  for (const [place, ids] of Object.entries(life.placeNpcs)) {
    if (!PLACE_NAME[place]) continue;
    const people = ids.map((id) => byId(g, id)).filter(Boolean);
    const roles = new Set(people.map((p) => p.role).filter((r) => r && !SKIP_ROLES.has(r)));
    for (const role of roles) {
      const holders = people.filter((p) => p.role === role);
      if (holders.some((p) => p.alive && !p.away)) { delete hist.vacant[`${place}:${role}`]; continue; }
      const key = `${place}:${role}`;
      if (hist.vacant[key] == null) { hist.vacant[key] = now; continue; }
      if (now - hist.vacant[key] < 2 || !rng.chance(0.5)) continue;
      delete hist.vacant[key];
      const old = holders[holders.length - 1];
      succeed(g, rng, place, role, old, say, record);
    }
  }
  // 죽은 사람 id는 placeNpcs에 그대로 둔다(역할 기록). 너무 길어지면 오래된 죽은 사람부터 뺀다.
  for (const [place, ids] of Object.entries(life.placeNpcs)) {
    if (ids.length > 24) {
      const deadIdx = ids.findIndex((id) => !byId(g, id)?.alive);
      if (deadIdx >= 0) ids.splice(deadIdx, 1);
    }
  }
  // 베르덴 백작가의 가주는 베르덴의 백작과 같은 사람이다
  const count = (life.placeNpcs.verden ?? []).map((id) => byId(g, id)).find((p) => p?.alive && p.role === 'count');
  const vh = hist.houses.find((h) => h.seat === 'verden' && !h.fallen);
  if (count && vh) { vh.head = count.name; vh.age = ageYears(count); }
}

export function peopleTick(g, rng, say, record, yearEnd) {
  recruitAway(g, rng);
  vacancies(g, rng, say, record);
  if (!yearEnd) return;
  for (const n of [...H(g).notables]) yearOf(g, rng, n, say, record);
  if (H(g).notables.length < 10 && rng.chance(0.7)) spawnNotable(g, rng);
}
