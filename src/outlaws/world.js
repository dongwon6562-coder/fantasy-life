// 산적 무리의 한 달: 무법한 고장 근처 숲에 무리가 서고, 커지고, 길을 막고, 토벌되거나 흩어진다. 플레이어 없이도 굴러간다.
// 꺾인 봉기(revolt)의 잔당과 전쟁 뒤 탈영병이 숲으로 들어가 무리가 된다. 전쟁이 나면 사면받고 군에 드는 무리도 있다.
import { WORLD_TICKS } from '../world.js';
import { J } from '../narrative/text.js';
import { OS, LAIRS, LAIR_IDS, MAX_BANDS, liveBands, bandAt, newBand, endBand, lawless, olog, outRng, placeName, clamp, mi, NICKS, CHIEF_NAMES, chiefLine, bounty } from './state.js';

const mine = (g, b) => g.outlaws?.me?.band === b.id;
const iLead = (g, b) => mine(g, b) && g.outlaws.me.role === 'chief';

// 토벌: 영주의 군사 대 무리. 이기면 무리가 꺾이고, 지면 무리 이름이 오른다
export function purge(g, b, rng, say, { troops } = {}) {
  const L0 = LAIRS[b.lair] ?? { force: 50, lord: '영주' };
  const t = troops ?? L0.force * 0.6 + rng.int(0, 30);
  const us = b.men * 0.9 + (b.deal ? 10 : 0) + (b.noble ? 8 : 0) + rng.int(0, 25);
  if (t >= us) {
    const crushed = t >= us + 15 || b.men < 12;
    if (crushed) {
      say(`${L0.lord}의 토벌대가 ${LAIRS[b.lair].name} 산채를 불태웠다. ${J(b.chief, '은/는')} ${placeName(b.lair)} 장터 교수대에 매달렸다.`, true);
      olog(g, `${J(b.name, '이/가')} 토벌되었다.`);
      endBand(g, b, 'crushed');
      return 'crushed';
    }
    b.men = Math.max(3, Math.round(b.men * 0.5)); b.heat = 25; b.toll = false; b.fame = clamp(b.fame - 5, 0, 100);
    say(`${L0.lord}의 토벌대가 ${LAIRS[b.lair].name}까지 쳐들어갔다. ${J(b.name, '은/는')} 반이 넘게 죽거나 붙잡히고 나머지는 더 깊은 숲으로 숨었다.`);
    olog(g, `${J(b.name, '이/가')} 토벌대에 꺾여 숨었다.`);
    return 'broken';
  }
  b.heat = 20; b.fame = clamp(b.fame + 15, 0, 100); b.men = Math.round(b.men * 1.1) + 2;
  say(`${L0.lord}의 토벌대가 ${LAIRS[b.lair].name}에서 매복에 걸려 쫓겨 왔다. ${chiefLine(b)} 이름이 노래로 불리기 시작했다.`, true);
  olog(g, `${J(b.name, '이/가')} 토벌대를 물리쳤다.`);
  return 'held';
}

// 두목이 바뀐다 (늙음·죽음·현상금). 무리 안 다툼으로 쪼개지기도
export function newChief(g, b, rng, why = 'old') {
  const old = b.chief;
  b.chief = `${rng.pick(NICKS)} ${rng.pick(CHIEF_NAMES)}`; b.chiefSince = mi(g);
  b.men = Math.round(b.men * (why === 'old' ? 0.9 : 0.7));
  olog(g, `${J(old, '이/가')} 죽고 ${J(b.chief, '이/가')} ${J(b.name, '을/를')} 물려받았다.`);
  return b.chief;
}

export function outMonth(g, say) {
  if (!g.outlaws) return;
  const S = OS(g), rng = outRng(g, 3), b0 = g.realm?.balhart;
  // 전쟁 뒤: 탈영병과 돌아갈 데 없는 병사들
  if (b0?.war) S.war = true;
  else if (S.war === true) { S.war = 'after'; S.afterAt = mi(g); }
  else if (S.war === 'after' && mi(g) - (S.afterAt ?? 0) > 36) S.war = false;
  // 꺾인 봉기의 잔당
  const rv = (g.revolt?.past ?? []).filter((x) => x.out === 'crushed');
  for (const x of rv) {
    const key = `${x.y}:${x.place}:${x.leader}`;
    if (S.seenRv.includes(key)) continue;
    S.seenRv.push(key); if (S.seenRv.length > 24) S.seenRv.shift();
    if (g.date.year - x.y > 1 || !LAIRS[x.place]) continue;
    const b = bandAt(g, x.place);
    if (b) { b.men += rng.int(4, 10); b.noble = b.noble || rng.chance(0.3); }
    else if (liveBands(g).length < MAX_BANDS && rng.chance(0.5)) {
      const nb = newBand(g, x.place, rng, { men: rng.int(8, 14), noble: rng.chance(0.5) });
      say(`꺾인 봉기의 잔당이 ${J(LAIRS[x.place].name, '으로/로')} 숨어들어 ${J(nb.name, '이/가')} 되었다는 말이 돈다.`);
      olog(g, `봉기 잔당이 ${J(nb.name, '이/가')} 되었다.`);
    }
  }
  // 새 무리
  if (liveBands(g).length < MAX_BANDS) {
    const free = LAIR_IDS.filter((pl) => !bandAt(g, pl) && !S.past.some((p) => p.lair === pl && g.date.year - p.to < 4));
    const pl = free.length ? rng.pick(free) : null;
    if (pl && rng.chance(0.0015 + lawless(g, pl) * 0.00022)) {
      const nb = newBand(g, pl, rng, { men: rng.int(5, 9) + (S.war === 'after' ? 4 : 0), noble: rng.chance(g.world?.famine ? 0.4 : 0.18) });
      say(`${LAIRS[pl].name}에 무리가 들었다. ${placeName(pl)} 가는 길에서 짐수레가 털렸다고 한다. 무리를 이끄는 자는 ${J(nb.chief, '으로/로')} 불린다.`);
      olog(g, `${LAIRS[pl].name}에 ${J(nb.name, '이/가')} 섰다.`);
    }
  }
  // 무리마다
  for (const b of liveBands(g)) {
    const pr = outRng(g, 17 + b.id * 13), law = lawless(g, b.lair), me = mine(g, b);
    b.men = clamp(b.men + (law - 22) * 0.01 + (b.noble ? 0.06 : 0) + pr.normal(0, 0.35), 0, 80);
    b.loot = Math.round((b.loot + b.men * 0.12 + (b.toll ? 1.5 : 0)) * 10) / 10;
    b.fame = clamp(b.fame + b.men * 0.012 + (b.toll ? 0.2 : 0) - 0.06, 0, 100);
    b.heat = clamp(b.heat + b.men * 0.025 + (b.toll ? 0.35 : 0) - (b.noble ? 0.12 : 0) - (b.deal ? 0.05 : 0) - 0.15, 0, 100);
    if (!b.toll && b.men >= 15 && pr.chance(0.04)) {
      b.toll = true;
      say(`${J(b.name, '이/가')} ${LAIRS[b.lair].name} 길목에 통나무를 걸쳐 놓고 지나가는 사람마다 통행세를 받는다고 한다.`);
      olog(g, `${J(b.name, '이/가')} 길목에 통행세를 걸었다.`);
    }
    if (!b.deal && b.men >= 10 && pr.chance(b.noble ? 0.02 : 0.008)) { b.deal = true; olog(g, `${placeName(b.lair)} 사람들이 ${J(b.name, '과/와')} 몰래 거래를 텄다.`); }
    if (b.noble && g.world?.famine && pr.chance(0.05)) say(`흉년인데 ${placeName(b.lair)} 마을 집집마다 문 앞에 곡식 자루가 놓여 있었다. 사람들은 ${J(b.name, '이/가')} 세리 수레를 털어 나눠 준 거라고 쑥덕인다.`);
    if (pr.chance(0.03)) say(`${placeName(LAIRS[b.lair].road.find((x) => x !== b.lair) ?? b.lair)} 가는 길에서 ${J(b.name, '이/가')} ${pr.pick(['소금 상단', '세리 수레', '포도주 짐마차', '순례자 일행', '양털 상인'])}을 털었다.`);
    // 흩어짐: 사람이 너무 줄면
    if (b.men < 3 && !me) { say(`${J(b.name, '이/가')} 흩어졌다. ${LAIRS[b.lair].name} 산채에는 타다 남은 모닥불 자리만 남았다.`); olog(g, `${J(b.name, '이/가')} 흩어졌다.`); endBand(g, b, 'scattered'); continue; }
    // 전쟁이 나면 사면받고 군에 드는 무리
    if (b0?.war && !me && b.men >= 10 && pr.chance(0.006)) {
      say(`${J(b.chief, '이/가')} 무리를 이끌고 산에서 내려왔다. 왕실이 지난 죄를 묻지 않는 대신 발하르트 전선으로 보낸다고 한다.`, true);
      olog(g, `${J(b.name, '이/가')} 사면받고 군에 들어갔다.`); endBand(g, b, 'pardoned'); continue;
    }
    // 두목이 늙거나 죽는다
    if (!iLead(g, b) && mi(g) - b.chiefSince > 12 * 12 && pr.chance(0.008)) newChief(g, b, pr, 'old');
    // 토벌
    if (b.heat >= 50 && pr.chance(0.035 + (b.heat - 50) * 0.002)) {
      if (me) { if (b.purgeAt == null) b.purgeAt = mi(g); }
      else purge(g, b, pr, say);
    }
    // 내 무리: 토벌대가 왔는데 두 달 넘게 맞서지 않았으면 저절로
    if (me && b.purgeAt != null && mi(g) - b.purgeAt > 2) { b.purgeAt = null; purge(g, b, pr, say); }
  }
}
export const bountyOf = bounty;

WORLD_TICKS.push((g, worldRng, say) => outMonth(g, say));
