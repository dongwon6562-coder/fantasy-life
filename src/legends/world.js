// 큰 인물들이 플레이어 없이도 산다: 옮겨 다니고, 늙고, 죽고, 십강의 자리가 바뀐다.
// world.js의 한 달(WORLD_TICKS)에 끼어든다. 한 해가 끝나는 12월에 나이·힘·죽음·십강 발표를 본다.
import { WORLD_TICKS, nudge } from '../world.js';
import { H } from '../history/state.js';
import { J } from '../narrative/text.js';
import { LG, legend, legendName, playerScore, RANK_N, MAX_LIST, ROSTER } from './state.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PLACE_NAME = { ern: '에른', harfen: '하르펜', verden: '베르덴', leocast: '왕도', eisen: '아이젠베르크', serenia: '세레니아', solaris: '솔라리스', barka: '바르카', graubel: '그라우벨', fur: '털가죽 시장', silverleaf: '은잎 마을', hammer: '쇠망치 골', gruental: '그뤼엔탈' };
export const placeName = (id) => PLACE_NAME[id] ?? '먼 곳';

// 죽었을 때 세계가 받는 충격
const ON_DEATH = {
  leon: (g) => { nudge(g, 'tension', -6); },
  magnus: (g) => { const P = H(g)?.powers; if (P) P.mages = clamp(P.mages - 8, 0, 100); },
  cecilia: (g) => { nudge(g, 'heroRite', -8); const P = H(g)?.powers; if (P) P.church = clamp(P.church - 4, 0, 100); },
  kairen: (g) => { const P = H(g)?.powers; if (P) P.guild = clamp(P.guild - 3, 0, 100); },
  garum: (g) => { nudge(g, 'heroRite', 3); },
};
const DEATH_LINE = {
  leon: '검왕 레온 발하르트가 아이젠베르크에서 숨을 거두었다. 마지막까지 목검을 쥐고 있었다고 한다. 제국의 장례 행렬이 사흘 동안 이어졌다.',
  magnus: '마도사 협회장 마그누스가 세상을 떠났다. 세레니아의 일곱 탑이 하룻밤 내내 불을 밝혔다. 다음 협회장 자리를 두고 벌써 파벌이 갈린다.',
  cecilia: '성흔대장 세실리아가 죽었다는 소식이 왔다. 교단은 순교라 했다. 어떻게 죽었는지는 말하지 않았다.',
  kairen: 'S급 모험가 카이렌 하스가 미궁에서 돌아오지 않았다. 길드가 그의 이름을 기록석에서 지우지 않기로 했다.',
  garum: '수인 대족장 가룸이 성광국 국경에서 쓰러졌다. 털가죽 시장의 북이 이레 동안 울렸다.',
  bram: '모루왕 브람이 대장간에서 숨을 거두었다. 끝내 다 벼리지 못한 칼 한 자루가 모루 위에 남았다.',
};

// 새로 떠오르는 사람 (history의 이름난 사람이 없을 때)
const RISING = [
  { name: '오토 크라머', title: '제국 기사단장', kind: 'sword', haunts: ['eisen', 'eisen', 'leocast'] },
  { name: '이졸데 바인', title: '6서클 대마법사', kind: 'mage', haunts: ['serenia'] },
  { name: '세라핀', title: '잿빛 날개의 마족 장군', kind: 'demon', haunts: ['far'], race: 'demon' },
  { name: '하겐 슈타일', title: 'S급 모험가', kind: 'adventurer', haunts: ['barka', 'harfen'] },
  { name: '루나리엘', title: '엘프 숲지기 대장', kind: 'mage', haunts: ['silverleaf'], race: 'elf' },
  { name: '토르빈', title: '깊은 구렁의 수호자', kind: 'dwarf', haunts: ['hammer'], race: 'dwarf' },
];
const KIND_TITLE = { adventurer: 'S급 모험가', knight: '기사단의 검', mage: '5서클 대마법사', outlaw: '피에 젖은 칼', merchant: '거상', scholar: '대학자' };
const KIND_MAP = { adventurer: 'adventurer', knight: 'sword', mage: 'mage', outlaw: 'sword' };

function addLegend(g, x) {
  const lg = LG(g);
  lg.list.push({ alive: true, bond: 0, role: null, met: false, seen: false, timeless: false, hidden: false, race: 'human', ...x });
  // 너무 많아지면 이름이 바랜 사람(죽었고 플레이어와 얽히지 않은 사람)부터 잊는다
  while (lg.list.length > MAX_LIST) {
    const old = lg.list.find((y) => !y.alive && !y.role && !ROSTER.some((r) => r.id === y.id)) ?? lg.list.find((y) => !y.alive && !y.role);
    if (!old) break;
    lg.list.splice(lg.list.indexOf(old), 1);
  }
}

function die(g, x, say, record, cause) {
  x.alive = false; x.died = g.date.year;
  say(DEATH_LINE[x.id] ?? `${legendName(x)} ${cause ?? '세상을 떠났다'}.`, true);
  record(`${legendName(x)} 사망`);
  ON_DEATH[x.id]?.(g);
  if (x.role || x.bond >= 20 || x.bond <= -20) LG(g).news.push({ k: 'death', id: x.id });
}

function deathChance(x) {
  if (x.timeless) return x.id === 'noah' ? 0 : 0.002;
  const a = x.age ?? 40;
  const life = x.race === 'dwarf' ? 280 : x.race === 'elf' ? 900 : x.race === 'beast' ? 62 : 72;
  let c = a > life - 4 ? (a - (life - 6)) * 0.025 : 0.002;
  c += { adventurer: 0.025, beast: 0.015, holy: 0.012, sword: 0.004 }[x.kind] ?? 0;
  return clamp(c, 0, 0.6);
}

function drift(g, rng, x) {
  if (x.timeless) { x.power = clamp(x.power + rng.normal(0, 0.3), 85, 100); return; }
  const a = x.age ?? 40;
  const prime = x.race === 'dwarf' ? 200 : x.race === 'elf' ? 600 : 45;
  let d = rng.normal(0, 0.8);
  if (a < prime - 10) d += 0.6;
  else if (a > prime + 13) d -= 0.4 + (a - prime - 13) * 0.06;
  x.power = clamp(x.power + d, 40, 99);
}

// 십강 순서: 살아 있는 큰 인물과 플레이어를 같은 잣대로 줄 세운다
export function ranking(g) {
  const lg = LG(g);
  const rows = lg.list.filter((x) => x.alive).map((x) => ({ id: x.id, power: x.power }));
  const ps = playerScore(g);
  if (g.player && ps >= 55) rows.push({ id: 'player', power: ps });
  return rows.sort((a, b) => b.power - a.power).slice(0, RANK_N).map((r) => r.id);
}

function announce(g, say, record) {
  const lg = LG(g);
  const now = ranking(g);
  const before = lg.ranks ?? [];
  const entered = now.filter((id) => !before.includes(id));
  const left = before.filter((id) => !now.includes(id) && id !== 'player' && legend(g, id)?.alive);
  lg.ranks = now;
  const pr = now.indexOf('player');
  const wasRank = lg.playerRank;
  lg.playerRank = pr >= 0 ? pr + 1 : null;
  const nameOf = (id) => (id === 'player' ? g.player.name : legendName(legend(g, id)));
  for (const id of entered) {
    if (id === 'player') continue;
    say(`모험가 길드와 마도사 협회가 새 십강을 발표했다. ${J(nameOf(id), '이/가')} ${now.indexOf(id) + 1}위에 이름을 올렸다.`, true);
    record(`${nameOf(id)}, 십강 ${now.indexOf(id) + 1}위`);
  }
  for (const id of left) say(`${J(nameOf(id), '이/가')} 십강 명단에서 빠졌다. 사람들은 그의 전성기가 지났다고 수군거린다.`);
  if (lg.playerRank && !wasRank) { lg.news.push({ k: 'rank', n: lg.playerRank }); record(`${g.player.name}, 십강 ${lg.playerRank}위`); }
  else if (!lg.playerRank && wasRank) lg.news.push({ k: 'unrank' });
}

WORLD_TICKS.push((g, rng, say, record) => {
  if (!g.legends) return;
  const lg = g.legends;
  // 매달: 옮겨 다니기
  for (const x of lg.list) {
    if (!x.alive || !x.haunts?.length || x.haunts.length < 2) continue;
    if (rng.chance(0.06)) {
      const to = rng.pick(x.haunts);
      if (to !== x.at) {
        x.at = to;
        if (!x.hidden && to !== 'far' && ['leocast', 'harfen', 'verden'].includes(to) && rng.chance(0.5)) say(`${legendName(x)}의 일행이 ${placeName(to)}에 들어왔다는 소문이 돈다.`);
      }
    }
  }
  if (g.date.month !== 12) return;
  // 한 해: 나이, 힘, 죽음
  for (const x of [...lg.list]) {
    if (!x.alive) continue;
    if (x.age != null) x.age += 1;
    drift(g, rng, x);
    if (rng.chance(deathChance(x))) die(g, x, say, record);
  }
  // 빈자리: history의 이름난 사람이 먼저 오르고, 없으면 먼 나라에서 누군가 떠오른다
  const aliveN = lg.list.filter((x) => x.alive).length;
  if (aliveN < RANK_N + 2) {
    const hist = H(g);
    const n = hist?.notables?.filter((y) => y.fame >= 92 && KIND_MAP[y.kind]).sort((a, b) => b.fame - a.fame)[0];
    if (n && rng.chance(0.7)) {
      hist.notables.splice(hist.notables.indexOf(n), 1);
      const at = n.place ?? 'leocast';
      addLegend(g, { id: `n${g.date.year}${rng.int(10, 99)}`, name: `${n.name} ${n.lastName}`, title: KIND_TITLE[n.kind] ?? '이름난 사람', kind: KIND_MAP[n.kind], age: n.age, power: 64 + (n.fame - 92) * 1.5, at, haunts: [at, at, 'leocast'], pid: n.pid ?? null, from: n.home ?? null });
    } else if (rng.chance(0.35)) {
      const used = new Set(lg.list.map((x) => x.name));
      const r = RISING.find((y) => !used.has(y.name));
      if (r) addLegend(g, { id: `r${g.date.year}${rng.int(10, 99)}`, ...r, age: r.race === 'elf' ? rng.int(180, 400) : r.race === 'dwarf' ? rng.int(90, 160) : r.race === 'demon' ? null : rng.int(28, 40), timeless: r.race === 'demon', power: rng.int(64, 72), at: r.haunts[0] });
    }
  }
  announce(g, say, record);
});
