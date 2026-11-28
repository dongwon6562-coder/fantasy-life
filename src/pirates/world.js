// 해적들의 바다: 플레이어 없이도 해적단이 상선을 털고, 시세가 흔들리고, 해군이 사냥 함대를 보내고,
// 선장이 늙거나 목이 매달리고, 새 해적단이 일어난다. 망한 해적단의 선장은 보물을 묻고, 졸개들은 뭍에서 늙는다.
import { HOOKS } from '../hooks.js';
import { WORLD_TICKS } from '../world.js';
import { J } from '../narrative/text.js';
import { atWarRealm, warsOf, foeIn } from '../politics/state.js';
import { realmName } from '../realms/index.js';
import {
  PI, fill, live, bandById, bandsIn, power, capName, plog, clamp, mi, ownRng, SEAS, SEA_IDS, FIRST_BANDS, NEW_BANDS, NEW_LAIRS,
  CAP_NAMES, NICKS, NAVY_NAME, myBandId,
} from './state.js';

export const FEED = { fact: null, mine: null };

function newCap(rng, y, used = []) {
  const sex = rng.chance(0.3) ? 'f' : 'm';
  const names = CAP_NAMES[sex].filter((n) => !used.includes(n));
  return { name: rng.pick(names.length ? names : CAP_NAMES[sex]), nick: rng.pick(NICKS), age: rng.int(28, 48), since: y, sex };
}
const usedNames = (g) => PI(g).bands.map((b) => b.cap.name);

export function seed(g) {
  const P = fill(g);
  if (P.bands.length) return;
  const rng = ownRng(g, 4901);
  for (const b of FIRST_BANDS) {
    P.bands.push({
      ...b, cap: newCap(rng, g.date.year - rng.int(2, 15), usedNames(g)), wealth: rng.int(80, 300), prizes: rng.int(5, 40),
      letter: null, born: g.date.year - rng.int(10, 60), fell: null, fame: rng.int(20, 60), mine: false,
    });
  }
  for (const s of SEA_IDS) P.danger[s] = dangerOf(g, s);
}
export function dangerOf(g, sea) {
  const p = bandsIn(g, sea).reduce((a, b) => a + power(b), 0);
  return clamp(Math.round(p / 3.2), 0, 100);
}

/* ---------- 달마다: 약탈과 시세 ---------- */
function raidMonth(g, rng) {
  const P = PI(g);
  const mine = myBandId(g);
  for (const s of SEA_IDS) P.losses[s] = Math.max(0, P.losses[s] * 0.5);
  for (const b of live(g)) {
    const foes = b.letter ? b.letter.foe : null;
    if (!rng.chance(clamp(0.18 + b.ships * 0.05, 0.1, 0.5))) continue;
    // 해군 사냥 함대가 같은 바다에 있으면 조심한다
    if (P.fleets.some((f) => f.sea === b.sea && f.left > 0) && rng.chance(0.5)) continue;
    const take = rng.int(8, 30) * (1 + b.ships * 0.15);
    b.wealth += Math.round(take); b.prizes += 1; b.fame = clamp(b.fame + 0.6, 0, 100);
    P.losses[b.sea] += 1;
    if (rng.chance(0.25) && b.men < b.ships * 40 + 20) b.men += rng.int(1, 6);
    // 털린 상선의 짐 값이 그 바다 항구에서 오른다 (sea/core.js 시세 흔들림에 얹는다)
    const good = rng.pick(SEAS[b.sea].goods);
    const drift = g.sea?.drift;
    if (drift) for (const port of SEAS[b.sea].ports) {
      const k = `${port}:${good}`;
      drift[k] = clamp((drift[k] ?? 0) + 0.035, -0.3, 0.3);
    }
    if (b.id === mine) b.men = Math.max(b.men, 20);
    void foes;
  }
  for (const s of SEA_IDS) P.danger[s] = clamp(Math.round(P.danger[s] * 0.7 + dangerOf(g, s) * 0.3 + P.losses[s] * 2), 0, 100);
}

/* ---------- 달마다: 사냥 함대 ---------- */
function fleetMonth(g, rng, say) {
  const P = PI(g);
  for (const f of P.fleets) {
    if (f.left <= 0) continue;
    f.left -= 1;
    const b = bandById(g, f.target);
    if (!b || b.fell) { f.left = 0; continue; }
    if (!rng.chance(0.3)) continue;
    const win = rng.chance(clamp(0.4 + (f.str - power(b)) / 250, 0.15, 0.75));
    if (win) {
      const lostShips = Math.min(b.ships, rng.int(1, 2));
      b.ships -= lostShips; b.men = Math.max(0, b.men - rng.int(8, 25)); b.wealth = Math.round(b.wealth * 0.8); f.wins += 1;
      plog(g, `${J(NAVY_NAME[f.realm], '이/가')} ${b.name}의 배 ${lostShips}척을 잡았다.`);
      if (b.ships <= 0 || b.men < 15) fall(g, rng, b, rng.chance(0.55) ? 'hanged' : rng.chance(0.5) ? 'fled' : 'sunk', say, f.realm);
    } else {
      f.str = Math.max(10, f.str - rng.int(10, 25));
      b.fame = clamp(b.fame + 3, 0, 100);
      if (b.ships < 6 && rng.chance(0.2)) { b.ships += 1; plog(g, `${J(b.name, '이/가')} ${NAVY_NAME[f.realm]}의 배 한 척을 빼앗았다.`); }
    }
  }
  P.fleets = P.fleets.filter((f) => f.left > 0 || mi(g) - (f.at ?? 0) < 24);
}

/* ---------- 해적단이 망한다 ---------- */
export function fall(g, rng, b, how, say, by = null) {
  if (b.fell) return;
  const P = PI(g);
  b.fell = { y: g.date.year, how, by };
  P.tally.fell += 1;
  const nm = capName(b);
  const text = how === 'hanged' ? `${b.name}의 선장 ${J(nm, '이/가')} 잡혀 ${by === 'free' ? '포르텔' : '클라인 항'} 부두에서 목이 매달렸다. ${J(b.flag, '은/는')} 불태워졌다.`
    : how === 'fled' ? `${J(b.name, '이/가')} 흩어졌다. 선장 ${J(nm, '은/는')} 금고를 들고 어디론가 사라졌다.`
    : how === 'mutiny' ? `${b.name}에서 선상 반란이 났다. 선장 ${J(nm, '이/가')} 바다에 던져지고 무리는 갈라졌다.`
    : how === 'pardon' ? `${b.name}의 해적들이 사면령을 받아들이고 칼을 내려놓았다.`
    : `${J(b.name, '이/가')} 폭풍과 해군에 쫓기다 마지막 배까지 잃었다.`;
  plog(g, text);
  say?.(text, true);
  FEED.fact?.(g, 'pi_fall', { band: b.name, cap: nm, how, pl: b.lairAt ?? (b.sea === 'west' ? 'klein' : 'portel') });
  // 선장이 살아 달아났거나 바다에 숨겼으면 보물을 묻는다
  if ((how === 'fled' || how === 'hanged' || how === 'sunk') && b.wealth + b.prizes * 3 >= 40 && rng.chance(how === 'fled' ? 0.9 : 0.6)) {
    const near = rng.pick(SEAS[b.sea].ports.filter((p) => p !== 'crow'));
    P.hoards.push({ id: P.seq++, band: b.name, cap: nm, isle: b.lair, near, value: Math.max(40, Math.round((b.wealth + b.prizes * 3) * rng.float(0.4, 0.8))), y: g.date.year, dug: null, cursed: rng.chance(0.2), sea: b.sea });
    P.tally.hoards += 1;
  }
  // 살아남은 사람들은 뭍에서 늙는다
  const alive = how === 'fled' || how === 'pardon' ? 2 : how === 'mutiny' ? 1 : 1;
  for (let i = 0; i < alive; i++) {
    const c = i === 0 && (how === 'fled' || how === 'pardon') ? { name: b.cap.name, nick: b.cap.nick, cap: true } : { name: rng.pick([...CAP_NAMES.m, ...CAP_NAMES.f]), nick: rng.pick(NICKS), cap: false };
    P.retired.push({ ...c, band: b.name, y: g.date.year, place: rng.pick(SEAS[b.sea].ports.filter((p) => p !== 'crow')), born: g.date.year - rng.int(30, 50), met: 0 });
  }
  if (P.retired.length > 12) P.retired.splice(0, P.retired.length - 12);
  // 내가 든 해적단이 망하면 나도 바다에 남겨진다
  if (myBandId(g) === b.id) FEED.mine?.(g, b, how);
  // 까마귀 둥지는 섬 자체가 해적의 요새다. 까마귀단이 무너지면 남은 자들이 새 선장을 세워 다시 깃발을 올린다 (작게)
  if (b.id === 'crow') {
    P.bands = P.bands.filter((x) => x !== b);
    P.bands.push({ ...b, fell: null, cap: newCap(rng, g.date.year, usedNames(g)), ships: 1, men: 35, wealth: 70, prizes: 0, fame: 10, born: g.date.year, letter: null });
    for (const f of P.fleets) if (f.target === 'crow') f.left = 0;
    P.bands.push({ ...b, id: `crow${P.seq++}`, fell: b.fell, name: `옛 ${b.name}` });
    plog(g, `까마귀 둥지에 남은 해적들이 새 선장 ${J(capName(P.bands[P.bands.length - 2]), '을/를')} 세우고 까마귀 깃발을 다시 올렸다.`);
  }
}

/* ---------- 해마다 (1월) ---------- */
function year(g, rng, say) {
  const P = PI(g);
  for (const b of live(g)) {
    b.cap.age += 1;
    b.wealth = Math.max(0, Math.round(b.wealth * 0.85 - b.men * 0.3));
    // 선장 교대: 늙어 죽거나, 몫이 말라 반란이 나거나
    const old = b.cap.age >= 55 && rng.chance((b.cap.age - 50) * 0.04);
    const broke = b.wealth < 30 && b.id !== myBandId(g) && g.date.year - b.born >= 3 && rng.chance(0.3);
    if (old || broke) {
      const was = capName(b);
      if (broke && rng.chance(0.3)) { fall(g, rng, b, 'mutiny', say); continue; }
      b.cap = newCap(rng, g.date.year, usedNames(g));
      plog(g, old ? `${b.name}의 선장 ${J(was, '이/가')} 늙어 죽었다. 새 선장은 ${capName(b)}.` : `${b.name}에서 선상 반란이 났다. ${J(was, '을/를')} 몰아내고 ${J(capName(b), '이/가')} 선장이 되었다.`);
    }
    // 노획이 쌓이면 배를 늘린다
    if (b.wealth >= 200 + b.ships * 80 && b.ships < 6) { b.ships += 1; b.wealth -= 120; b.men += rng.int(8, 20); }
    b.men = Math.min(b.men, b.ships * 45 + 20);
    b.fame = clamp(b.fame - 2, 0, 100);
  }
  // 사냥 함대: 바다가 험하면 나라가 함대를 보낸다
  for (const s of SEA_IDS) {
    const d = P.danger[s];
    if (P.fleets.some((f) => f.sea === s && f.left > 0) || g.date.year - (P.fleetAt?.[s] ?? -99) < 3) continue;
    if (d < 35 || !rng.chance(clamp((d - 25) / 80, 0.1, 0.7))) continue;
    const target = bandsIn(g, s).filter((x) => !x.letter).sort((a, b) => power(b) - power(a))[0];
    if (!target) continue;
    const realm = SEAS[s].navy;
    const f = { id: P.seq++, realm, sea: s, target: target.id, left: rng.int(6, 12), str: Math.round(power(target) * rng.float(0.8, 1.5)) + 20 - (atWarRealm(g, realm) ? 30 : 0), wins: 0, at: mi(g) };
    P.fleets.push(f); P.tally.fleets += 1; (P.fleetAt ??= {})[s] = g.date.year;
    const text = `${J(NAVY_NAME[realm], '이/가')} ${J(SEAS[s].name, '으로/로')} 해적 사냥 함대를 띄웠다. 노리는 것은 ${capWith(target)}의 목이다.`;
    plog(g, text); say?.(text);
    FEED.fact?.(g, 'pi_fleet', { navy: NAVY_NAME[realm], band: target.name, pl: SEAS[s].board });
  }
  // 새 해적단: 바다에 해적단이 하나뿐이면 흩어진 졸개들이 새 깃발을 올린다
  for (const s of SEA_IDS) {
    if (bandsIn(g, s).length >= 2 || !rng.chance(bandsIn(g, s).length ? 0.3 : 0.6)) continue;
    const used = P.bands.filter((b) => !b.fell || g.date.year - b.fell.y < 40).map((b) => b.name); // 망한 지 마흔 해가 지나면 옛 이름을 다시 쓰는 무리가 나온다
    const pick = NEW_BANDS.filter(([n]) => !used.includes(n));
    const [name, flag] = pick.length ? rng.pick(pick) : [`${rng.pick(NICKS)}의 무리`, '검은 바탕에 흰 해골'];
    const b = {
      id: `b${P.seq++}`, name, flag, lair: rng.pick(NEW_LAIRS), lairAt: null, sea: s, code: rng.pick(['even', 'captain', 'blood']),
      men: rng.int(20, 45), ships: 1, cap: newCap(rng, g.date.year, usedNames(g)), wealth: rng.int(20, 60), prizes: 0,
      letter: null, born: g.date.year, fell: null, fame: rng.int(5, 15), mine: false,
    };
    P.bands.push(b); P.tally.rose += 1;
    const text = `${SEAS[s].name}에 새 깃발이 올랐다. ${J(b.flag, '을/를')} 단 ${J(name, '이/가')} 상선을 털기 시작했다고 한다.`;
    plog(g, text); say?.(text);
    FEED.fact?.(g, 'pi_rise', { band: name, flag: b.flag, pl: SEAS[s].board });
  }
  // 사략선 허가장: 해군을 가진 나라가 전쟁 중이면 해적단 하나에 적국 배를 털게 허락한다
  for (const s of SEA_IDS) {
    const realm = SEAS[s].navy;
    const w = warsOf(g, realm)[0];
    for (const b of bandsIn(g, s)) {
      if (b.letter && (!w || foeIn(w, realm) !== b.letter.foe || g.date.year > b.letter.until)) {
        const back = rng.chance(0.6);
        plog(g, `${b.name}의 사략선 허가장이 끝났다.${back ? ' 그들은 다시 해적으로 돌아갔다.' : ' 몇은 뭍에 올라 술집을 차렸다.'}`);
        if (!back) b.men = Math.round(b.men * 0.7);
        b.letter = null;
      }
    }
    if (!w) continue;
    const foe = foeIn(w, realm);
    if (bandsIn(g, s).some((b) => b.letter)) continue;
    const b = bandsIn(g, s).filter((x) => x.id !== myBandId(g) && x.id !== 'crow' && !P.fleets.some((f) => f.left > 0 && f.target === x.id))[0];
    if (!b || !rng.chance(0.5)) continue;
    b.letter = { realm, foe, until: g.date.year + 3 };
    P.tally.letters += 1;
    const text = `${J(realmName(realm), '이/가')} ${b.name}에 사략선 허가장을 내주었다. 이제 ${realmName(foe)}의 배를 터는 것은 나라가 허락한 일이다.`;
    plog(g, text); say?.(text);
  }
  // 드물게 사면령: 레오니아가 칼을 내려놓는 해적을 받아 준다
  if (rng.chance(0.04)) {
    const b = bandsIn(g, 'west').filter((x) => x.id !== myBandId(g)).sort((a, c) => power(a) - power(c))[0];
    if (b) { const text = '레오니아가 해적 사면령을 내렸다. 칼을 내려놓고 이름을 적으면 지난 죄를 묻지 않는다고 한다.'; say?.(text); plog(g, text); fall(g, rng, b, 'pardon', say); PI(g).pardonAt = g.date.year; }
  }
  // 묻힌 보물은 세월이 지나면 누가 먼저 파 간다
  for (const h of P.hoards) if (!h.dug && g.date.year - h.y > 6 && rng.chance(0.08)) h.dug = { y: g.date.year, by: rng.pick(['떠돌이 어부', '다른 해적단', '해군 측량대', '모래 파는 아이들']) };
  if (P.hoards.length > 14) P.hoards = P.hoards.filter((h, i) => !h.dug || i >= P.hoards.length - 6);
  const rest = P.bands.filter((b) => b.fell);
  if (rest.length > 12) P.bands = P.bands.filter((b) => !b.fell || rest.indexOf(b) >= rest.length - 12);
}
const capWith = (b) => `${b.name}의 선장 ${capName(b)}`;

export function piratesMonth(g, say) {
  if (!g.pirates || !g.date) return;
  const rng = ownRng(g, 49);
  raidMonth(g, rng);
  fleetMonth(g, rng, say);
  if (g.date.month === 1) year(g, rng, say);
}
WORLD_TICKS.push((g, rng, say) => { if (!g.pirates) return; piratesMonth(g, say); });
HOOKS.newGame.push((g) => { fill(g); seed(g); });
HOOKS.migrate.push((g) => { fill(g); seed(g); });
