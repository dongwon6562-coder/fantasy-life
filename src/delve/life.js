// 미궁 공략: 거리에서 공략대를 꾸리고(dv_crew), 입구나 지난번 표식에서 출발해(dv_plan) 한 걸음씩 내려간다(dv_run).
// 걸음마다 싸움, 함정, 벽화(깊은 층의 비밀 조각), 보물 상자, 다른 공략대(dv_rival). 야영하거나 표식을 남기고 돌아서면 거리에서 마석을 판다.
// 가장 깊은 곳에는 주인이 있고, 끝없는 탑은 열 층마다 문지기가 막는다.
import { ACTIONS } from '../actions.js';
import { circleOf } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { runFight, companionsFor } from '../adventure/fight.js';
import { playerVitality, playerPower, threatWord, foeTotal } from '../adventure/combat.js';
import { deed } from '../repute/index.js';
import { levelAt } from '../wilds/state.js';
import { J } from '../narrative/text.js';
import {
  D, DELVES, mi, clamp, here, placeName, free, adult, delveAt, layerOf, guardEnc, markOf, mineOf, logD, stonePrice, canEnter, CREW_ROLES, CREW_NAMES,
} from './core.js';

const MAX_STEPS = 6;
const bottom = (id) => DELVES[id].floors;
const strip = (s) => { const o = { ...s }; delete o.kind; delete o.at; delete o.t; return o; };
const crewComps = (g) => D(g).crew.map((c) => ({ name: `${CREW_ROLES[c.role].name} ${c.name}`, pow: c.pow, role: CREW_ROLES[c.role].role }));
const hasRole = (g, r) => D(g).crew.some((c) => c.role === r);
export function partyFor(g, s) {
  const out = [...companionsFor(g), ...crewComps(g)];
  if (s?.merc) out.push({ name: '고용한 칼잡이 둘', pow: 30, role: 'blade' });
  if (s?.ally) { const p = D(g).parties.find((x) => x.id === s.ally); if (p?.alive) out.push({ name: p.name, pow: Math.round(p.pow * 0.6), role: 'blade' }); }
  return out;
}
const capOf = (g, s) => 5 + D(g).crew.filter((c) => c.role === 'porter').length * 3 + Math.min(3, partyFor(g, s).length);
const crewWage = (g) => D(g).crew.reduce((t, c) => t + c.wage, 0);

/* ---------- 행동 ---------- */
ACTIONS.push(
  {
    id: 'dv_go', name: '미궁 공략에 나선다', icon: 'skull',
    desc: '여러 층을 차례로 내려가는 긴 공략. 걸음마다 더 내려갈지, 야영할지, 표식을 남기고 돌아설지 고른다. 다음엔 표식에서 시작할 수 있다.',
    available: (g) => {
      const id = delveAt(here(g));
      return !!id && free(g) && adult(g) && canEnter(g, id) && mi(g) - D(g).runAt >= 1 && !sceneQueued(g, 'dv_plan') && !sceneQueued(g, 'dv_run')
        && !g.player.injuries.some((i) => i.mortal);
    },
    run(g) {
      const id = delveAt(here(g));
      D(g).runAt = mi(g);
      queueScene(g, 'dv_plan', { id }, { first: true });
      return `${DELVES[id].name} 입구에 섰다. 먼저 들어간 공략대들의 발자국이 어둠 속으로 이어진다.`;
    },
  },
  {
    id: 'dv_crew', name: '공략대를 꾸린다', icon: 'people',
    desc: '미궁 앞 거리에서 짐꾼·척후·방패잡이·치유사를 산다. 공략에 나설 때마다 품삯을 준다.',
    available: (g) => { const id = delveAt(here(g)); return !!id && !!DELVES[id].town && free(g) && adult(g) && canEnter(g, id) && mi(g) - D(g).crewAt >= 2 && !sceneQueued(g, 'dv_crew'); },
    run(g) { D(g).crewAt = mi(g); queueScene(g, 'dv_crew', { id: delveAt(here(g)) }, { first: true }); return `${DELVES[delveAt(here(g))].town}의 술집에 들어섰다. 일감을 기다리는 사람들이 고개를 들었다.`; },
  },
);

/* ---------- 공략대 ---------- */
defineScene('dv_crew', {
  need: (g, s) => delveAt(here(g)) === s.id,
  title: () => '공략대',
  text: (g, s) => {
    const c = D(g).crew;
    return `${DELVES[s.id].town}에는 미궁 일로 먹고사는 사람이 많다. ${c.length ? `지금 공략대: ${c.map((x) => `${CREW_ROLES[x.role].name} ${x.name}`).join(', ')}. 공략 한 번에 품삯 은화 ${crewWage(g)}닢.` : '아직 함께할 사람이 없다.'} 셋까지 데리고 다닐 수 있다.`;
  },
  choices: (g) => {
    const c = D(g).crew;
    const out = [];
    if (c.length < 3) for (const [r, v] of Object.entries(CREW_ROLES)) if (!c.some((x) => x.role === r) && g.player.money >= v.wage * 2) out.push({ label: `${J(v.name, '을/를')} 들인다 (선금 은화 ${v.wage * 2}, ${v.desc})`, key: `hire:${r}` });
    if (c.length) out.push({ label: '공략대를 해산한다', key: 'disband' });
    out.push({ label: '술만 한 잔 하고 나온다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const st = D(g);
    if (key === 'none') return '미궁에서 돌아온 사람들의 이야기를 듣다 나왔다. 반은 거짓말이고 반은 진짜다.';
    if (key === 'disband') { st.crew = []; return '품삯을 셈해 주고 헤어졌다. "다음에 또 불러 주쇼."'; }
    const r = key.split(':')[1], v = CREW_ROLES[r];
    if (!v || st.crew.length >= 3 || g.player.money < v.wage * 2) return '셈이 맞지 않았다. 다음에 다시 오기로 했다.';
    g.player.money -= v.wage * 2;
    const name = rng.pick(CREW_NAMES.filter((n) => !st.crew.some((x) => x.name === n)));
    st.crew.push({ name, role: r, pow: v.pow + rng.int(0, 6), wage: v.wage, at: s.id });
    return `${v.name} ${J(name, '이/가')} 손을 내밀었다. ${{ porter: '"짐은 맡기쇼. 마석 한 톨도 안 흘립니다."', scout: '"발밑은 내가 봅니다. 앞은 당신이 보쇼."', shield: '"내 뒤에 서쇼. 그게 내 일이오."', healer: '"다치면 부르세요. 죽기 전에만."' }[r]}`;
  },
});

/* ---------- 출발 ---------- */
defineScene('dv_plan', {
  need: (g, s) => delveAt(here(g)) === s.id,
  title: (g, s) => DELVES[s.id].name,
  text: (g, s) => {
    const d = DELVES[s.id], m = mineOf(g, s.id), st = D(g), mast = st.masters[s.id], rec = st.rec[s.id];
    const pow = playerPower(g) + partyFor(g, s).reduce((a, c) => a + c.pow, 0);
    const lay = d.layers.map((l) => `${l.name}(${l.to}층까지)`).join(', ');
    const first = layerOf(s.id, Math.max(1, m.mark + 1));
    const enc = { unit: first.foes[0][0], count: first.foes[0][2] };
    const deep = d.endless ? `꼭대기를 본 사람은 없다. 기록은 ${rec.best}층(${rec.holder ?? '아무도'}).` : `가장 깊은 곳은 ${d.floors}층. ${mast.alive ? '주인이 있다.' : '주인은 쓰러졌고, 아직 새 주인이 들어앉지 않았다고 한다.'}`;
    const mine = m.runs ? ` 나는 ${m.deepest}층까지 가 보았다.${m.mark ? ` ${m.mark}층에 표식이 있다.` : ''}` : '';
    const crew = st.crew.length ? ` 공략대 품삯은 은화 ${crewWage(g)}닢이다.` : '';
    return `${lay}. ${deep}${mine}${crew} 첫 층대의 무리는, 가늠해 보니 ${threatWord(pow, enc)}`;
  },
  choices: (g, s) => {
    const m = mineOf(g, s.id);
    const out = [{ label: '입구부터 내려간다', key: 'entry' }];
    if (m.mark > 0 && m.mark < bottom(s.id)) out.push({ label: `${m.mark}층 표식에서 시작한다`, key: 'mark' });
    if (g.player.money >= 20 + crewWage(g)) out.push({ label: '칼잡이 둘을 더 사서 간다 (은화 20)', key: m.mark > 0 && m.mark < bottom(s.id) ? 'mark_m' : 'entry_m' });
    out.push({ label: '오늘은 돌아선다', key: 'leave' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'leave') return '입구의 찬 바람을 맞으며 한참 서 있다가 돌아섰다.';
    const st = D(g), m = mineOf(g, s.id);
    // 품삯: 못 주면 공략대가 떠난다
    const wage = crewWage(g);
    let paid = '';
    if (wage) { if (g.player.money >= wage) { g.player.money -= wage; paid = ` 공략대에 품삯 은화 ${wage}닢을 주었다.`; } else { st.crew = []; paid = ' 품삯을 줄 돈이 없어 공략대가 흩어졌다.'; } }
    const merc = key.endsWith('_m');
    if (merc) { if (g.player.money >= 20) g.player.money -= 20; else return '칼잡이들에게 줄 돈이 모자랐다. 다음에 오기로 했다.'; }
    const start = key.startsWith('mark') ? m.mark : 0;
    m.runs += 1;
    const hp = playerVitality(g);
    tired(g, 10);
    queueScene(g, 'dv_run', { id: s.id, floor: start, hp, hp0: hp, bag: 0, loads: 0, steps: 0, merc, ally: null, met: [], found: 0 }, { first: true });
    return `${start ? `${start}층 표식까지 서둘러 내려갔다.` : '첫 계단을 밟았다.'}${paid}${merc ? ' 칼잡이 둘이 뒤를 따른다.' : ''}`;
  },
});

/* ---------- 한 걸음씩 ---------- */
function encFor(g, rng, id, floor) {
  const l = layerOf(id, floor);
  const [unit, a, b] = rng.pick(l.foes);
  let count = Math.max(1, rng.int(a, b));
  if (id === 'rift' && levelAt(g, 'graubel') >= 60) count += 1; // 마물 기세가 세면 틈에서 더 기어 나온다
  return { unit, count };
}
const tacticOf = (g, rng) => (hasRole(g, 'scout') ? 'ambush' : circleOf(g) >= 1 && rng.chance(0.5) ? 'magic' : rng.chance(0.5) ? 'ambush' : 'charge');
function fight(g, rng, s, enc, flee = 35) {
  return runFight(g, rng, { enc, reward: {} }, tacticOf(g, rng), { companions: partyFor(g, s), flee, hp: s.hp, noTire: true, short: true });
}
const hpWord = (s) => { const r = s.hp / s.hp0; return r > 0.8 ? '몸은 아직 멀쩡하다' : r > 0.55 ? '숨이 거칠다' : r > 0.3 ? '상처가 쌓였다' : '더 버티기 어렵다'; };

defineScene('dv_run', {
  need: (g, s) => delveAt(here(g)) === s.id && !L(g).travel,
  title: (g, s) => `${DELVES[s.id].name} · ${s.floor ? `${s.floor}층` : '입구'}`,
  text: (g, s) => {
    const d = DELVES[s.id], l = layerOf(s.id, Math.max(1, s.floor));
    const atBottom = !d.endless && s.floor >= d.floors;
    const where = s.floor ? `${l.name}. ` : '';
    const mast = D(g).masters[s.id];
    const end = atBottom ? (mast.alive ? `가장 깊은 곳이다. 문 너머에 ${d.master.text}. ` : '가장 깊은 곳이다. 주인의 방은 비어 있다. ') : '';
    return `${where}${end}${hpWord(s)}. 짐에는 은화 ${Math.round(s.bag)}닢어치 마석과 부산물.${s.steps >= MAX_STEPS - 1 ? ' 가져온 식량이 거의 떨어졌다.' : ''}`;
  },
  choices: (g, s) => {
    const d = DELVES[s.id], out = [];
    const atBottom = !d.endless && s.floor >= d.floors;
    if (s.steps < MAX_STEPS && !atBottom && s.floor < d.floors) out.push({ label: `더 내려간다 (${d.endless && Math.floor((s.floor + d.step) / 10) > Math.floor(s.floor / 10) ? '문지기가 있는 층' : layerOf(s.id, Math.min(d.floors, s.floor + d.step)).name})`, key: 'down' });
    if (atBottom && D(g).masters[s.id].alive && s.steps < MAX_STEPS + 1) out.push({ label: '주인의 방에 들어간다', key: 'master' });
    if (s.steps < MAX_STEPS && s.hp < s.hp0 * 0.85) out.push({ label: '여기서 야영한다', key: 'camp' });
    out.push({ label: s.floor >= 5 ? `${markOf(s.id, s.floor) || s.floor}층에 표식을 남기고 돌아선다` : '돌아선다', key: 'out' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'out') return exitRun(g, rng, s, 'out');
    if (key === 'camp') return camp(g, rng, s);
    if (key === 'master') return master(g, rng, s);
    return down(g, rng, s);
  },
});

function next(g, s, lead) { queueScene(g, 'dv_run', strip(s), { first: true }); return lead; }

function down(g, rng, s) {
  const d = DELVES[s.id], m = mineOf(g, s.id), st = D(g);
  let target = Math.min(d.floors, s.floor + d.step);
  let enc;
  const guardFloor = d.endless ? Math.floor(target / 10) * 10 : 0;
  if (d.endless && guardFloor > s.floor) { target = guardFloor; enc = guardEnc(guardFloor); } else enc = encFor(g, rng, s.id, target);
  s.steps += 1;
  tired(g, 6);
  const r = fight(g, rng, s, enc);
  s.hp = r.hp ?? s.hp;
  const l = layerOf(s.id, target);
  const head = `[${target}층 · ${l.name}] ${r.text}`;
  if (r.outcome === 'lose') return exitRun(g, rng, s, 'lose', head);
  if (r.outcome === 'flee') return exitRun(g, rng, s, 'fled', head);
  s.floor = target;
  m.deepest = Math.max(m.deepest, s.floor);
  // 수확
  const full = s.loads >= capOf(g, s);
  const got = rng.int(l.harvest[0], l.harvest[1]) * (full ? 0.3 : 1);
  s.bag += got; s.loads += 1;
  const lines = [head, full ? '짐이 꽉 차서 값진 것만 골라 담았다.' : ''];
  // 함정
  if (rng.chance(l.danger / 22)) {
    const avoid = (g.player.stats.sen + g.player.stats.agi) / 2 + (hasRole(g, 'scout') ? 25 : 0);
    if (rng.chance(clamp(0.3 + (avoid - l.danger * 6) / 80, 0.1, 0.92))) lines.push(`${l.hazard}. 미리 알아채고 비켜 갔다.`);
    else { const dmg = 6 + l.danger * 2; s.hp = Math.max(1, s.hp - dmg); lines.push(`${l.hazard}. 피하지 못해 몸을 다쳤다.`); }
  }
  // 깊은 층의 비밀 조각
  const k = d.lore.findIndex((_, i) => !m.lore.includes(i) && s.floor >= Math.ceil(d.floors * (i + 1) / 4));
  if (k >= 0 && rng.chance(0.45 + (hasRole(g, 'scout') ? 0.3 : 0))) { m.lore.push(k); s.found += 1; lines.push(`벽화를 찾았다. ${d.lore[k]}`); }
  // 보물 상자 / 샘
  if (rng.chance(0.12)) {
    if (rng.chance(0.25)) {
      const r2 = fight(g, rng, s, { unit: 'mimic', count: 1 });
      s.hp = r2.hp ?? s.hp;
      lines.push(`상자가 입을 벌렸다. ${r2.text}`);
      if (r2.outcome === 'lose') return exitRun(g, rng, s, 'lose', lines.filter(Boolean).join(' '));
    } else { const b = rng.int(l.harvest[0], l.harvest[1]) * 2; s.bag += b; lines.push('먼지 쌓인 상자에서 마석 꾸러미가 나왔다.'); }
  } else if (rng.chance(0.08)) { s.hp = Math.min(s.hp0, s.hp + 20); lines.push('바위 틈에서 맑은 물이 솟는 곳을 찾아 상처를 씻었다.'); }
  // 기록
  const rec = st.rec[s.id];
  if (s.floor > rec.best) {
    const was = rec.holder;
    Object.assign(rec, { best: s.floor, holder: g.player.name, me: true, y: g.date.year });
    L(g).renown = (L(g).renown ?? 0) + (d.endless ? 6 : 3);
    if (d.endless || !was) chron(g, `${J(g.player.name, '이/가')} ${d.name} ${s.floor}층에 닿았다. ${d.endless ? '이제까지 누구도 오르지 못한 층이다.' : '이 미궁에서 가장 깊이 내려간 기록이다.'}`, 100);
    lines.push(d.endless ? `${s.floor}층. 기록이 바뀌었다. 탑 아래 거리의 칠판에 내 이름이 적힐 것이다.` : '');
    logD(g, `${d.name} ${s.floor}층 기록.`);
  }
  // 다른 공략대
  const p = st.parties.find((x) => x.alive && x.at === s.id && !s.met.includes(x.id) && Math.abs(x.best - s.floor) <= d.step * 3);
  if (p && rng.chance(0.4)) { s.met.push(p.id); queueScene(g, 'dv_rival', { pid: p.id, run: strip(s) }, { first: true }); return lines.filter(Boolean).join(' '); }
  if (s.steps >= MAX_STEPS && (d.endless || s.floor < d.floors)) return exitRun(g, rng, s, 'food', lines.filter(Boolean).join(' '));
  return next(g, s, lines.filter(Boolean).join(' '));
}

function camp(g, rng, s) {
  const l = layerOf(s.id, Math.max(1, s.floor));
  s.steps += 1;
  const heal = 15 + (hasRole(g, 'healer') ? 15 : 0) + (partyFor(g, s).some((c) => c.role === 'healer') ? 5 : 0);
  s.hp = Math.min(s.hp0, s.hp + heal);
  tired(g, -5);
  if (s.floor > 0 && rng.chance(0.1 + l.danger * 0.03)) {
    const enc = encFor(g, rng, s.id, Math.max(1, s.floor));
    enc.count = Math.max(1, Math.floor(enc.count / 2));
    const r = fight(g, rng, s, enc, 30);
    s.hp = r.hp ?? s.hp;
    const head = `불을 지피고 눈을 붙이려는데 어둠 속에서 무언가 다가왔다. ${r.text}`;
    if (r.outcome === 'lose') return exitRun(g, rng, s, 'lose', head);
    if (r.outcome === 'flee') return exitRun(g, rng, s, 'fled', head);
    return next(g, s, head);
  }
  return next(g, s, `${hasRole(g, 'healer') ? '치유사가 상처를 꿰매고 붕대를 갈았다.' : '모닥불 곁에서 붕대를 갈고 몇 시간 눈을 붙였다.'} 멀리서 물 떨어지는 소리만 들렸다.`);
}

function master(g, rng, s) {
  const d = DELVES[s.id], m = mineOf(g, s.id), st = D(g);
  s.steps += 1;
  const enc = { unit: d.master.unit, count: d.master.count, leader: d.master.leader };
  const r = runFight(g, rng, { enc, reward: {} }, circleOf(g) >= 2 ? 'magic' : 'charge', { companions: partyFor(g, s), flee: 25, hp: s.hp, noTire: true, short: true });
  s.hp = r.hp ?? s.hp;
  const head = `[가장 깊은 곳] ${d.master.text}. ${r.text}`;
  if (r.outcome === 'lose') return exitRun(g, rng, s, 'lose', head);
  if (r.outcome === 'flee') return exitRun(g, rng, s, 'fled', head);
  const last = d.layers[d.layers.length - 1];
  s.bag += last.harvest[1] * 4;
  m.clears += 1;
  const first = !m.secret;
  m.secret = true;
  Object.assign(st.masters[s.id], { alive: false, since: mi(g), by: g.player.name });
  L(g).renown = (L(g).renown ?? 0) + 6 + last.danger;
  deed(g, 'brave', 3, `${d.name}의 주인을 쓰러뜨렸다더라.`);
  note(g, `${d.name}의 주인을 쓰러뜨렸다.`);
  chron(g, `${J(g.player.name, '이/가')} ${d.name}의 가장 깊은 곳에서 주인을 쓰러뜨렸다.`, 100);
  logD(g, `${d.name}의 주인을 쓰러뜨렸다.`);
  if (g.life?.dungeons && g.life.dungeons[s.id]) g.life.dungeons[s.id].cleared = true;
  return exitRun(g, rng, s, 'cleared', `${head} 주인이 쓰러진 자리에서 오래 숨을 골랐다.${first ? ` 그리고 알게 되었다. ${d.secret}` : ''}`);
}

function exitRun(g, rng, s, why, head = '') {
  const d = DELVES[s.id], m = mineOf(g, s.id), st = D(g);
  let bag = s.bag;
  if (why === 'lose') bag *= 0.25;
  if (why === 'fled') bag *= 0.5;
  if (s.ally) bag *= 0.67; // 함께 내려간 공략대와 나눈다
  const price = stonePrice(g, s.id);
  const money = Math.round(bag * price);
  g.player.money += money;
  if (st.towns[s.id]) st.towns[s.id].sold += bag;
  if (why !== 'lose') { const mk = markOf(s.id, s.floor); if (mk > m.mark && mk < d.floors) m.mark = mk; }
  m.best = Math.max(m.best ?? 0, s.floor);
  tired(g, 12);
  stress(g, why === 'cleared' ? -12 : why === 'lose' ? 10 : 3);
  const tail = {
    out: `${s.floor ? `${s.floor}층에서 ` : ''}발길을 돌렸다.`, food: '식량이 떨어져 더 버티지 못하고 올라왔다.', fled: '쫓기듯 계단을 거슬러 올라왔다. 짐 절반을 버렸다.',
    lose: '정신을 차렸을 때는 입구 근처였다. 짐은 거의 다 잃었다.', cleared: '주인의 방에서 나와 천천히 올라왔다.',
  }[why];
  const sell = money ? ` ${d.town ?? placeName(d.place)}에서 마석과 부산물을 팔아 은화 ${money}닢을 받았다.${price < 0.85 ? ' 마석 값이 많이 떨어져 있었다.' : price > 1.15 ? ' 마석 값이 좋았다.' : ''}` : '';
  const mark = why !== 'lose' && m.mark && m.mark === markOf(s.id, s.floor) && s.floor >= 5 ? ` ${m.mark}층 벽에 내 표식을 새겼다.` : '';
  return `${head ? head + ' ' : ''}${tail}${sell}${mark}`.trim();
}

/* ---------- 다른 공략대 ---------- */
defineScene('dv_rival', {
  need: (g, s) => !!D(g).parties.find((x) => x.id === s.pid && x.alive) && delveAt(here(g)) === s.run?.id,
  title: () => '다른 공략대',
  text: (g, s) => {
    const p = D(g).parties.find((x) => x.id === s.pid);
    return `계단참에서 횃불 여럿과 마주쳤다. ${p.name}, 대장은 ${p.leader}. ${p.fame >= 40 ? '이름난 공략대다.' : '거리에서 몇 번 본 얼굴들이다.'} 그들 짐도 묵직하다. 서로 칼자루에 손을 얹은 채 잠깐 말이 없었다.`;
  },
  choices: (g, s) => [{ label: '길을 비켜 준다', key: 'pass' }, { label: '함께 내려가자고 한다', key: 'join' }, { label: '그들 짐을 걸고 칼을 뽑는다', key: 'fight' }],
  resolve(g, rng, s, key) {
    const st = D(g), p = st.parties.find((x) => x.id === s.pid), run = { ...s.run };
    if (key === 'pass') { p.fame = Math.min(100, p.fame + 1); return next(g, run, `${J(p.leader, '이/가')} 고개를 까딱하고 지나갔다. 미궁 안에서는 그게 예의다.`); }
    if (key === 'join') {
      if (rng.chance(0.65 + (L(g).renown ?? 0) / 200)) { run.ally = p.id; return next(g, run, `${J(p.leader, '이/가')} 잠깐 생각하더니 웃었다. "몫은 셋에 하나요." 횃불이 두 배가 되었다.`); }
      return next(g, run, `"우린 우리 길로 가오." ${J(p.name, '이/가')} 먼저 아래로 내려갔다.`);
    }
    const enc = { unit: 'bandit', count: 3, leader: 'bandit_chief', leaderPow: Math.round(p.pow * 0.7), leaderName: p.leader };
    const r = fight(g, rng, run, enc, 30);
    run.hp = r.hp ?? run.hp;
    L(g).notoriety = (L(g).notoriety ?? 0) + 3;
    deed(g, 'kind', -2, '미궁 안에서 다른 공략대 짐을 털었다더라.');
    if (r.outcome === 'win' || r.outcome === 'overwhelm') {
      run.bag += 20 + p.pow / 2; p.fame = Math.max(0, p.fame - 10); p.pow = Math.max(30, p.pow - 5);
      logD(g, `미궁 안에서 ${p.name}의 짐을 빼앗았다.`);
      return next(g, run, `${r.text} ${J(p.name, '은/는')} 짐을 버리고 위로 달아났다. 거리에 이 이야기가 돌 것이다.`);
    }
    run.bag *= 0.5;
    if (r.outcome === 'lose') return exitRun(g, rng, run, 'lose', r.text);
    return next(g, run, `${r.text} 짐 절반을 내주고 물러났다.`);
  },
});
void foeTotal;
