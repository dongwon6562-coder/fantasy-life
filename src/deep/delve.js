// 깊은 구렁 내려가기, 탐사대 주점, 마석 거래소와 유물 감정.
// - 한 번 내려가면 한 달. 열어 둔 돌문에서 출발해 신중하게(4층까지) 또는 과감하게(7층까지) 내려간다.
// - 층마다 교전, 위험, 발견이 있고 다친 몸은 다음 층으로 이어진다(교전 규칙의 hp).
// - 파티 동료, 고용한 길잡이, 손잡은 다른 탐사대가 함께 간다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { circleOf, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, traveling, isAdult, note, chron, stress, tired, check, gains, up } from '../adventure/core.js';
import { runFight, companionsFor } from '../adventure/fight.js';
import { playerVitality, playerPower, threatWord } from '../adventure/combat.js';
import { D, FLOORS, STRATA, stratumOf, isGuardFloor, RELICS, relicsOfStratum, charmBonus, lordAlive } from './core.js';

const atGorge = (g) => L(g).place === 'gorge' && !traveling(g);
const won = (r) => r.outcome === 'win' || r.outcome === 'overwhelm';
export const supplyCost = (gate) => 3 + Math.floor(gate / 5) * 3;
export const gatesOpen = (g) => { const out = [0]; for (let f = 5; f <= Math.min(D(g).gate, 25); f += 5) out.push(f); return out; };

/* ---------- 내려가기 ---------- */
ACTIONS.push({
  id: 'deep_descend',
  name: '깊은 구렁에 내려간다',
  icon: 'dungeon',
  desc: '돌문을 지나 미궁으로 내려간다. 한 달이 걸린다. 깊을수록 마석이 굵고, 돌아오지 못하는 사람도 많다.',
  available: (g) => isAdult(g) && atGorge(g) && !sceneQueued(g, 'deep_descend') && !g.player.injuries.some((i) => i.mortal),
  run(g) { queueScene(g, 'deep_descend'); return '돌문 앞 수비대 초소에 이름을 적었다.'; },
});
defineScene('deep_descend', {
  need: (g) => atGorge(g),
  title: () => '깊은 구렁의 돌문',
  text: (g) => {
    const d = D(g);
    const comps = companionsWith(g);
    const pow = playerPower(g) + comps.reduce((a, c) => a + c.pow, 0);
    const st = stratumOf(Math.max(1, d.gate + 1));
    const where = d.gate >= FLOORS ? '나는 이미 왕좌의 문까지 길을 열었다.' : d.gate ? `내가 연 가장 깊은 돌문은 ${d.gate}층이다. 그 아래는 ${st.name}.` : '처음이라면 1층 옛 갱도부터다.';
    const enc = (STRATA.find((x) => x === st) ?? STRATA[0]).guard.enc;
    return `드워프 수비대장이 두꺼운 장부를 넘긴다. "돌아오면 이름 옆에 줄을 긋고, 안 돌아오면 장의사에게 넘기오." ${where} 다음 문지기는, 가늠해 보니 ${threatWord(pow, enc)}${comps.length ? ` 함께 가는 사람: ${comps.map((c) => c.name).join(', ')}.` : ' 혼자다.'}${d.guide ? ' 길잡이도 하나 붙었다.' : ''}`;
  },
  choices: (g) => {
    const d = D(g);
    const out = [];
    const gates = gatesOpen(g).reverse().slice(0, 3);
    for (const gt of gates) {
      const cost = supplyCost(gt);
      if (g.player.money < cost) continue;
      const from = gt ? `${gt}층 돌문에서` : '1층부터';
      out.push({ label: `${from} 신중하게 (식량과 횃불 은화 ${cost}닢)`, key: `go:${gt}:careful` });
      out.push({ label: `${from} 과감하게 (은화 ${cost}닢)`, key: `go:${gt}:bold` });
    }
    if (!out.length) out.push({ label: '빈손으로 1층만 살핀다', key: 'go:0:poor' });
    out.push({ label: '돌아선다', key: 'leave' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    if (key === 'leave') return '돌문 너머에서 올라오는 더운 바람을 한참 맞다가 돌아섰다.';
    const [, gt, stance] = key.split(':');
    const gate = Math.min(Number(gt) || 0, D(g).gate);
    return expedition(g, rng, gate, stance);
  },
});

// 함께 가는 사람: 파티(또는 친한 모험가) + 손잡은 탐사대
function companionsWith(g) {
  const comps = companionsFor(g).slice();
  const al = D(g).ally;
  if (al) comps.push({ name: al.name, pow: al.pow });
  return comps;
}

export function expedition(g, rng, gate, stance) {
  const d = D(g);
  const life = L(g);
  const poor = stance === 'poor';
  if (!poor) g.player.money = Math.max(0, g.player.money - supplyCost(gate));
  const comps = companionsWith(g);
  const ally = d.ally;
  const guide = d.guide;
  d.guide = false; d.ally = null;
  d.runs += 1;
  const maxFloors = poor ? 1 : stance === 'bold' ? 7 : 4;
  const turnAt = stance === 'bold' ? 30 : 55;
  const flee = stance === 'bold' ? 18 : 40;
  let hp = playerVitality(g) - (poor ? 15 : 0);
  let ore = 0;
  const found = [];
  const lines = [];
  let end = 'out';
  let floor = gate;
  tired(g, 10);
  lines.push(gate ? `${gate}층 돌문의 쇠사슬을 풀고 내려갔다.` : '1층으로 내려가는 계단은 드워프의 발에 맞춰 깎여 있어 낮고 촘촘했다.');
  if (comps.length) lines.push(`${J(comps.map((c) => c.name).join(', '), '과/와')} 함께였다.`);
  for (let n = 0; n < maxFloors && floor < FLOORS; n++) {
    floor += 1;
    const st = stratumOf(floor);
    const si = STRATA.indexOf(st);
    lines.push(`[${floor}층 · ${st.name}] ${rng.pick(st.text)}`);
    if (floor === FLOORS) {
      // 왕좌의 문: 여기서 멈춘다. 주인은 따로 만난다(lord.js)
      d.gate = FLOORS;
      lines.push('마지막 계단 끝에 문이 있다. 드워프의 문이다. 문 너머에서 누군가 곡괭이로 바위를 두드리는 소리가 들린다. 천 년 동안 쉬지 않은 소리다. 오늘은 여기까지다. 다음에는 이 문을 연다.');
      chron(g, `${g.player.name}, 깊은 구렁의 바닥, 왕좌의 문 앞에 서다.`, 70);
      end = 'gate';
      break;
    }
    if (isGuardFloor(floor)) {
      const r = runFight(g, rng, { enc: { ...st.guard.enc }, reward: {} }, tacticFor(g, rng, true), { companions: comps, flee: flee - 10, hp, noTire: true, short: true });
      hp = r.hp ?? hp;
      lines.push(st.guard.text, r.text);
      if (r.outcome === 'lose') { end = 'lose'; break; }
      if (r.outcome === 'flee') { end = 'fled'; break; }
      ore += rng.int(st.ore[0], st.ore[1]) * 4;
      if (floor > d.gate) {
        d.gate = floor;
        lines.push(`문지기가 지키던 돌문의 빗장을 벗겼다. 이제 ${floor}층에서 바로 내려갈 수 있다.`);
        if (floor >= 10) chron(g, `${g.player.name}, 깊은 구렁 ${floor}층의 문지기를 쓰러뜨리다.`, 30 + floor * 2);
        life.renown += Math.ceil(floor / 5);
      }
      if (rng.chance(0.5)) found.push(dropRelic(rng, si));
    } else {
      const roll = rng.next();
      if (roll < 0.6) {
        const [unit, a, b] = rng.pick(st.foes);
        const r = runFight(g, rng, { enc: { unit, count: rng.int(a, b) }, reward: {} }, tacticFor(g, rng, false), { companions: comps, flee, hp, noTire: true, short: true });
        hp = r.hp ?? hp;
        lines.push(r.text);
        if (r.outcome === 'lose') { end = 'lose'; break; }
        if (r.outcome === 'flee') { end = 'fled'; break; }
        ore += rng.int(st.ore[0], st.ore[1]);
        if (rng.chance(0.08)) found.push(dropRelic(rng, si));
      } else if (roll < 0.85) {
        const h = st.hazard;
        const val = (g.player.stats[h.stat] ?? 30) + charmBonus(g, 'hazard') + (guide ? 15 : 0) + comps.length * 3;
        if (check(rng, val, h.dc)) lines.push(`${h.text} ${h.ok}`);
        else {
          const dmg = rng.int(12, 24);
          hp -= dmg;
          stress(g, 5);
          if (rng.chance(0.35)) g.player.injuries.push({ name: `${h.name}에 다친 몸`, months: 2 });
          lines.push(`${h.text} ${h.bad}`);
          if (hp <= 15) { end = 'fled'; lines.push('더는 버틸 수 없었다. 동료들이 나를 끌고 올라갔다.'); break; }
        }
      } else {
        if (rng.chance(0.4)) { const id = dropRelic(rng, si); found.push(id); lines.push(`무너진 벽 틈에서 무언가 반짝였다. 처음 보는 물건이다.`); }
        else { const c = rng.int(st.ore[0], st.ore[1]) * 2; ore += c; lines.push('앞서 죽은 탐사대의 짐 꾸러미를 찾았다. 마석 주머니가 그대로 있었다. 이름표는 장의사에게 갖다주기로 했다.'); }
      }
    }
    d.deepest = Math.max(d.deepest, floor);
    if (hp < turnAt && n < maxFloors - 1 && floor < FLOORS) { lines.push(stance === 'bold' ? '피가 너무 많이 났다. 과감함에도 끝이 있다. 올라가기로 했다.' : '상처가 쌓였다. 더 내려가는 것은 욕심이다. 발길을 돌렸다.'); break; }
  }
  // 결과
  const saved = end === 'lose' && d.charms.includes('ferry_coin');
  if (saved) {
    d.charms.splice(d.charms.indexOf('ferry_coin'), 1);
    lines.push('정신을 잃기 직전, 품속의 뱃사공 동전이 차갑게 식으며 사라졌다. 눈을 떴을 때는 돌문 앞이었고, 짐은 그대로였다.');
  } else if (end === 'lose') {
    ore = Math.floor(ore / 3);
    if (found.length) { found.splice(0, Math.ceil(found.length / 2)); lines.push('정신을 차려 보니 짐의 절반이 없었다.'); }
  }
  const trade = 1 + (g.player.skills.trade ?? 0) / 300;
  const money = Math.round(ore * trade);
  g.player.money += money;
  d.ore += money;
  for (const id of found) d.relics.push({ id, known: false });
  if (d.relics.length > 12) d.relics.splice(0, d.relics.length - 12);
  if (ally && money > 10) { const share = Math.floor(money * 0.3); g.player.money -= share; lines.push(`${J(ally.name, '은/는')} 약속대로 마석의 삼 할을 챙겨 갔다.`); }
  if (d.deepest > d.record.depth) {
    d.record = { who: g.player.name, depth: d.deepest };
    if (d.deepest >= 10) { chron(g, `${g.player.name}, 깊은 구렁 ${d.deepest}층에 닿아 구렁목의 기록을 새로 쓰다.`, 40 + d.deepest); life.renown += 3; }
  }
  tired(g, 15);
  stress(g, end === 'lose' ? 10 : end === 'fled' ? 6 : -4);
  const sum = { out: '살아서 올라왔다.', gate: '살아서 올라왔다. 수비대장이 내 이름 옆에 붉은 줄을 그었다. 바닥까지 간 사람의 표시다.', fled: '쫓기듯 올라왔다.', lose: saved ? '' : '수비대가 돌문 앞에 쓰러진 나를 끌어냈다.' }[end];
  return `${lines.join(' ')} ${sum}${money ? ` 마석 거래소에서 은화 ${money}닢을 받았다.` : ''}${found.length ? ` 이름 모를 물건 ${found.length}개를 챙겼다. 감정해 봐야 안다.` : ''}`.replace(/\s+/g, ' ').trim();
}
function tacticFor(g, rng, big) {
  if (circleOf(g) >= (big ? 2 : 1)) return 'magic';
  return rng.chance(0.5) ? 'ambush' : 'charge';
}
function dropRelic(rng, si) {
  const pool = relicsOfStratum(si);
  return pool.length ? rng.pick(pool) : 'rune_pick';
}

/* ---------- 탐사대 주점 ---------- */
ACTIONS.push({
  id: 'deep_tavern',
  name: '탐사대 주점에 간다',
  icon: 'visit',
  desc: '다른 탐사대의 소식을 듣고, 길잡이를 사고, 함께 내려갈 탐사대를 찾는다.',
  available: (g) => isAdult(g) && atGorge(g) && !sceneQueued(g, 'deep_tavern'),
  run(g) { queueScene(g, 'deep_tavern'); return '탐사대 주점 "마지막 계단"의 문을 밀었다.'; },
});
defineScene('deep_tavern', {
  need: (g) => atGorge(g),
  title: () => '탐사대 주점 "마지막 계단"',
  text: (g) => {
    const d = D(g);
    const board = d.rivals.map((r) => (r.alive ? `${r.name}(${r.leader}, ${r.depth ? `${r.depth}층` : '입구'})` : `${r.name}(전멸)`)).join(', ');
    const lord = { alive: '깊은 왕은 아직 바닥에 있다.', slain: '깊은 왕은 내 손에 죽었다. 사람들이 잔을 들어 보인다.', sealed: '깊은 왕은 다시 잠들었다. 구렁의 바람이 조금 식었다.', pact: '아무도 모르지만, 깊은 왕은 내 안에서 속삭인다.', taken: `깊은 왕은 ${d.lordBy}에게 쓰러졌다.` }[d.lord];
    return `벽에 탐사대 이름이 적힌 판자가 걸려 있다. ${board}. 구렁목의 기록은 ${d.record.depth ? `${d.record.who}의 ${d.record.depth}층` : '아직 없다'}. ${lord}`;
  },
  choices: (g) => {
    const d = D(g);
    const out = [];
    if (!d.guide && g.player.money >= 15) out.push({ label: '늙은 드워프 길잡이를 산다 (은화 15닢, 다음 한 번)', key: 'guide' });
    if (!d.ally) for (const r of d.rivals.filter((x) => x.alive && x.depth >= Math.max(1, d.gate - 5)).slice(0, 2)) out.push({ label: `${J(r.name, '과/와')} 함께 내려가자고 한다 (마석 삼 할을 나눈다)`, key: `ally:${r.name}` });
    out.push({ label: '구석에서 소문을 듣는다', key: 'rumor' });
    out.push({ label: '그냥 나온다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const d = D(g);
    if (key === 'none') return '독한 버섯술 냄새만 맡고 나왔다.';
    if (key === 'guide') {
      if (d.guide || g.player.money < 15) return '길잡이는 이미 다른 탐사대에 붙었다.';
      g.player.money -= 15; d.guide = true;
      return '수염을 세 갈래로 땋은 늙은 드워프가 은화를 깨물어 보았다. "내 아비가 이 구렁을 팠지. 무너질 곳은 냄새로 안다." 다음에 내려갈 때 함께 간다.';
    }
    if (key.startsWith('ally:')) {
      const r = d.rivals.find((x) => x.alive && x.name === key.slice(5));
      if (!r || d.ally) return '그 탐사대는 이미 내려가고 없었다.';
      const myPow = playerPower(g);
      if (myPow < 25 && rng.chance(0.6)) return `${J(r.leader, '은/는')} 내 팔뚝을 보더니 웃었다. "짐꾼으로라면 받아 주지."`;
      d.ally = { name: `${r.name}의 ${r.leader}`, pow: Math.round(r.pow * 0.6) };
      return `${J(r.leader, '과/와')} 손바닥을 마주쳤다. "바닥에서 보자. 둘 다 살아서." 다음에 내려갈 때 ${J(r.name, '이/가')} 함께 간다.`;
    }
    stress(g, -4);
    return rng.pick([
      '불의 회랑의 쇠다리는 드워프가 아니라 그보다 먼저 온 누군가가 놓았다는 이야기를 들었다.',
      '뱃사공에게 동전을 주면 강을 건너게 해 준다고 한다. 동전이 없으면 뱃사공이 사람을 삯으로 받는다고.',
      '버섯 숲의 포자를 마시고 돌아온 사람은 다시는 해를 보고 싶어 하지 않는다고 한다.',
      '첫 드워프 왕 그론이 이 구렁을 팠고, 아래에서 무언가를 만났고, 돌아오지 않았다. 그 뒤로 드워프는 왕을 "깊은 왕"이라 부르지 않는다.',
      '심연에서 들려오는 목소리는 듣는 사람마다 다르게 들린다고 한다. 대개는 죽은 사람의 목소리다.',
      '그론의 반지가 심연 어딘가에 떨어져 있다고, 늙은 길잡이가 맹세했다. 반지만 있으면 왕을 다시 재울 수 있다고.',
    ]);
  },
});

/* ---------- 마석 거래소와 유물 감정 ---------- */
ACTIONS.push({
  id: 'deep_market',
  name: '유물 감정소에 간다',
  icon: 'coin',
  desc: '미궁에서 가져온 물건을 감정하고, 쓰거나 판다. 저주받은 물건도 있다.',
  available: (g) => atGorge(g) && D(g).relics.length > 0 && !sceneQueued(g, 'deep_market'),
  run(g) { queueScene(g, 'deep_market'); return '유물 감정소의 쇠창살 너머로 짐을 내밀었다.'; },
});
defineScene('deep_market', {
  need: (g) => atGorge(g) && D(g).relics.length > 0,
  title: () => '유물 감정소',
  text: (g) => {
    const d = D(g);
    const list = d.relics.map((r, i) => `${i + 1}번 ${r.known ? RELICS[r.id].name : '이름 모를 물건'}`).join(', ');
    return `외눈 안경을 낀 감정사가 손가락으로 탁자를 두드린다. "깊은 데서 나온 물건은 반은 보물이고 반은 무덤이오. 감정비는 하나에 은화 10닢." 가진 것: ${list}.${d.charms.length ? ` 지니고 다니는 것: ${d.charms.map((id) => RELICS[id].name).join(', ')}.` : ''}`;
  },
  choices: (g) => {
    const d = D(g);
    const out = [];
    d.relics.slice(0, 4).forEach((r, i) => {
      const R = RELICS[r.id];
      if (!r.known) {
        if (g.player.money >= 10) out.push({ label: `${i + 1}번 물건을 감정한다 (은화 10닢)`, key: `appraise:${i}` });
        out.push({ label: `${i + 1}번 물건을 감정 없이 쓴다`, key: `use:${i}` });
      } else {
        if (R.kind !== 'sell' && R.kind !== 'key') out.push({ label: `${J(R.name, '을/를')} 쓴다${R.curse ? ' (저주가 있다)' : ''}`, key: `use:${i}` });
        out.push({ label: `${J(R.name, '을/를')} 판다 (은화 ${sellValue(g, R)}닢)`, key: `sell:${i}` });
      }
    });
    out.push({ label: '그냥 나온다', key: 'none' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const d = D(g);
    if (key === 'none') return '물건들을 도로 싸서 나왔다.';
    const [how, n] = key.split(':');
    const r = d.relics[Number(n)];
    if (!r || !RELICS[r.id]) return '감정사가 고개를 갸웃했다. 그 물건은 이미 없었다.';
    const R = RELICS[r.id];
    if (how === 'appraise') {
      if (g.player.money < 10) return '감정비가 모자랐다.';
      g.player.money -= 10; r.known = true;
      return `감정사가 물건을 이리저리 돌려 보더니 숨을 들이켰다. "이건 ${R.name}. 깊은 데서 나온 진짜요." ${R.desc}${R.curse ? ' 감정사가 목소리를 낮췄다. "그리고 이건 저주가 걸려 있소. 쓰면 대가를 치를 거요."' : ''} 값은 은화 ${sellValue(g, R)}닢쯤.`;
    }
    if (how === 'sell') {
      const v = sellValue(g, R);
      g.player.money += v;
      d.relics.splice(Number(n), 1);
      if (R.value >= 150) chron(g, `${g.player.name}, 깊은 구렁에서 가져온 ${J(R.name, '을/를')} 팔다.`, 20);
      return `${J(R.name, '을/를')} 은화 ${v}닢에 넘겼다.${r.id === 'gron_ring' ? ' 감정사의 손이 떨렸다. 드워프 왕궁에서 사람이 올 거라고 했다.' : ''}`;
    }
    // 쓴다
    return useRelic(g, Number(n));
  },
});
export const sellValue = (g, R) => Math.round(R.value * (1 + (g.player.skills.trade ?? 0) / 250));

export function useRelic(g, i) {
  const d = D(g);
  const r = d.relics[i];
  if (!r) return '그 물건은 이미 없었다.';
  const R = RELICS[r.id];
  const lines = [];
  if (R.kind === 'sell' || R.kind === 'key') {
    r.known = true;
    return `${J(R.name, '을/를')} 이리저리 만져 보았지만 쓸 데를 알 수 없었다. ${R.desc}`;
  }
  d.relics.splice(i, 1);
  if (R.kind === 'charm') {
    if (!d.charms.includes(r.id)) d.charms.push(r.id);
    lines.push(`${J(R.name, '을/를')} 품에 넣었다. ${R.desc}`);
  } else if (R.kind === 'gear') {
    const gear = L(g).gear;
    if ((gear[R.gear.slot] ?? 0) < R.gear.v) { gear[R.gear.slot] = R.gear.v; gear[R.gear.slot + 'Name'] = R.name; lines.push(`${J(R.name, '을/를')} 손질해 몸에 맞췄다. ${R.desc}`); }
    else { g.player.money += Math.round(R.value / 2); lines.push(`${R.name}보다 지금 것이 낫다. 대장장이에게 은화 ${Math.round(R.value / 2)}닢에 넘겼다.`); }
  } else if (R.kind === 'stat') {
    if (d.used.includes(r.id)) { lines.push(`${R.name}에서는 더 이상 아무것도 느껴지지 않았다. 같은 것은 두 번 듣지 않는다.`); }
    else {
      d.used.push(r.id);
      const ups = [];
      for (const [k, v] of Object.entries(R.stat)) { g.player.stats[k] = Math.min(100, (g.player.stats[k] ?? 0) + v); ups.push(up({ str: '힘', agi: '민첩', int: '지능', wil: '의지', cha: '매력', sen: '감각' }[k] ?? k, v)); }
      lines.push(`${J(R.name, '을/를')} 썼다. 몸속에서 무언가 바뀌었다.${gains(ups)}`);
    }
  }
  if (R.curse && (R.kind !== 'stat' || d.used.includes(r.id))) {
    stress(g, R.curse.stress ?? 0);
    if (R.curse.noto) L(g).notoriety = Math.min(100, (L(g).notoriety ?? 0) + R.curse.noto);
    lines.push(R.curse.text);
  }
  if (!r.known) lines.unshift('무엇인지도 모르는 채로 썼다.');
  return lines.join(' ');
}

export { atGorge, lordAlive, playerAge };
