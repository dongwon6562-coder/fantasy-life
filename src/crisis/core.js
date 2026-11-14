// 세계의 위기: 마물 대침공·역병·큰 전쟁처럼 몇 년에 걸쳐 오는 큰일.
// - 위기는 플레이어와 상관없이 오고, 단계를 밟아 나아가고, 끝난다. 플레이어가 없어도 결말은 난다.
// - 위기의 "깊이"(sev, 0~100)가 결말을 정한다. 낮으면 막아 냈고, 높으면 나라가 크게 다친다.
// - 단계가 바뀔 때마다 고를 것이 온다. 영웅(맞선다), 방관(몸을 사린다), 이용(위기로 이득을 본다).
// - 매달 할 수 있는 행동: "위기에 손을 보탠다"(영웅), "위기를 이용한다"(이용).
// 상태는 game.crisis 하나: { active, past, calm }
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { J } from '../narrative/text.js';
import { monthIndex } from '../world.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron } from '../adventure/core.js';
import { members, addLoyalty } from '../party/core.js';

// 레오니아 왕국 안의 고장. 위기는 이 안에서 벌어진다.
export const LEONIA = ['ern', 'harfen', 'verden', 'leocast', 'gruental'];
export const inLeonia = (g) => LEONIA.includes(L(g).place);
// 위기가 끝나면 다음 위기까지 쉬는 달 수 (한 사람의 일생에 서너 번)
export const CALM_MONTHS = [12 * 7, 12 * 12];
export const STANCE = { hero: '영웅', idle: '방관', use: '이용' };

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function defaultCrisis(g) { return { active: null, past: [], calm: g?.date ? monthIndex(g) + 12 * 6 : 0 }; }
export function CR(g) {
  if (!g.crisis) g.crisis = defaultCrisis(g);
  return g.crisis;
}
HOOKS.newGame.push((g) => { g.crisis = defaultCrisis(g); });
HOOKS.migrate.push((g) => { g.crisis = Object.assign(defaultCrisis(g), g.crisis ?? {}); });

// 위기 종류. def = { name, kind, trigger(g) → 이번 달 시작할 확률, init(g, rng, c), sev0,
//   phases: [{ id, name, months: [a, b], intro(g, c), tick?(g, rng, c, say), text(g, c), choices(g, c) → [{ label, key, stance }], resolve(g, rng, c, key) → 글 }],
//   help(g, rng, c) → 글, exploit(g, rng, c) → 글, helpName, exploitName, end(g, rng, c, result) → 글 }
export const CRISES = {};
export function defineCrisis(id, def) { CRISES[id] = { id, ...def }; }

export const active = (g) => CR(g).active;
export const defOf = (c) => (c ? CRISES[c.id] : null);
export const phaseOf = (c) => defOf(c)?.phases[c.phase] ?? null;

// 위기의 깊이를 움직인다 (+면 나빠짐)
export function deepen(g, n) { const c = active(g); if (c) c.sev = clamp(c.sev + n, 0, 100); }
export const sevWord = (v) => (v >= 80 ? '나라가 무너질 지경' : v >= 60 ? '걷잡을 수 없다' : v >= 40 ? '위태롭다' : v >= 20 ? '고비는 넘기고 있다' : '거의 잡혔다');

// 플레이어가 어느 쪽에 섰는지 남긴다. 동료들도 저마다 반응한다.
export function deed(g, stance, weight = 1) {
  const c = active(g);
  if (!c || !STANCE[stance]) return;
  c.deeds[stance] = (c.deeds[stance] ?? 0) + weight;
  for (const p of members(g)) {
    const t = p.traits;
    if (stance === 'hero') addLoyalty(p, t.includes('brave') || t.includes('kind') ? 3 : t.includes('timid') ? -1 : 1);
    else if (stance === 'use') addLoyalty(p, t.includes('greedy') || t.includes('cruel') ? 2 : t.includes('kind') || t.includes('pious') ? -5 : -1);
    else if (stance === 'idle') addLoyalty(p, t.includes('brave') ? -2 : t.includes('timid') ? 1 : 0);
  }
}

export function startCrisis(g, rng, id) {
  const D = CRISES[id];
  const c = { id, phase: 0, start: monthIndex(g), y: g.date.year, due: 0, sev: D.sev0 ?? 50, deeds: { hero: 0, idle: 0, use: 0 }, helped: -1, used: -1, data: {} };
  CR(g).active = c;
  D.init?.(g, rng, c);
  enterPhase(g, rng, c, 0);
  (g.realm?.log ?? []).push({ y: g.date.year, m: g.date.month, text: `${D.name} 시작` });
  chron(g, `${D.name}${J(D.name, '이/가').slice(D.name.length)} 시작되다.`, 95);
}

function enterPhase(g, rng, c, idx) {
  const D = defOf(c);
  const ph = D.phases[idx];
  c.phase = idx;
  c.due = monthIndex(g) + rng.int(ph.months[0], ph.months[1]);
  g.news.unshift({ text: ph.intro(g, c), rel: 100, big: true });
  // 고를 것은 어른이 되어 왕국 안에 있을 때만 온다. 아이에게 위기는 어른들의 얼굴로만 보인다.
  if (isAdult(g) && inLeonia(g) && !g.over) queueScene(g, 'crisis_turn', { phase: idx, cid: c.start }, { first: true });
}

function endCrisis(g, rng, c) {
  const D = defOf(c);
  const result = c.sev < 35 ? 'saved' : c.sev < 65 ? 'scarred' : 'ruin';
  const st = stanceOf(c);
  const text = D.end(g, rng, c, result);
  const life = L(g);
  let mine = '';
  if (st === 'hero') { life.renown += result === 'saved' ? 12 : 6; mine = result === 'saved' ? ' 사람들은 그 이름을 오래 기억할 것이다.' : ' 다 막지는 못했지만, 끝까지 물러서지 않은 사람으로 기억되었다.'; chron(g, `${g.player.name}, ${D.name}에 맞서 싸운 사람으로 이름을 남기다.`, 90); }
  else if (st === 'use') { life.notoriety += 6; mine = ' 위기 속에서 주머니를 불린 사람으로, 뒤에서 손가락질을 받았다.'; chron(g, `${g.player.name}, ${D.name} 속에서 큰돈을 벌다. 사람들은 좋게 말하지 않았다.`, 70); }
  else if (isAdult(g)) mine = ' 나는 그저 살아남았다. 그것도 쉬운 일은 아니었다.';
  CR(g).past.push({ id: c.id, name: D.name, from: c.y, to: g.date.year, result, stance: isAdult(g) ? st : 'child', sev: Math.round(c.sev) });
  if (CR(g).past.length > 12) CR(g).past.shift();
  CR(g).active = null;
  CR(g).calm = monthIndex(g) + rng.int(CALM_MONTHS[0], CALM_MONTHS[1]);
  (g.realm?.log ?? []).push({ y: g.date.year, m: g.date.month, text: `${D.name} 끝 (${RESULT_NAME[result]})` });
  chron(g, `${D.name}${J(D.name, '이/가').slice(D.name.length)} 끝나다. ${RESULT_NAME[result]}.`, 95);
  note(g, `${D.name}${J(D.name, '이/가').slice(D.name.length)} 끝났다. 나는 ${STANCE[st]} 쪽이었다.`);
  g.news.unshift({ text: `${text}${mine}`, rel: 100, big: true });
}
export const RESULT_NAME = { saved: '끝내 막아 냈다', scarred: '큰 상처를 남겼다', ruin: '나라가 무너질 뻔했다' };

export function stanceOf(c) {
  const d = c.deeds;
  if (d.hero >= 2 && d.hero >= d.use) return 'hero';
  if (d.use >= 2 && d.use > d.hero) return 'use';
  return 'idle';
}

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.realm) return;
  const cr = CR(g);
  const c = cr.active;
  if (!c) {
    if (monthIndex(g) < cr.calm) return;
    for (const [id, D] of Object.entries(CRISES)) {
      if (rng.chance(D.trigger(g) ?? 0)) { startCrisis(g, rng, id); return; }
    }
    return;
  }
  const D = defOf(c);
  const say = (text, rel = 70) => g.news.unshift({ text, rel });
  // 세상 혼자서도 위기는 조금씩 움직인다
  c.sev = clamp(c.sev + (D.drift?.(g, c) ?? 0) + rng.normal(0, 1), 0, 100);
  D.phases[c.phase].tick?.(g, rng, c, say);
  if (!cr.active) return; // 단계 도중에 끝났을 수 있다
  if (monthIndex(g) >= c.due) {
    if (c.phase + 1 >= D.phases.length) endCrisis(g, rng, c);
    else enterPhase(g, rng, c, c.phase + 1);
  }
});

/* ---------- 단계마다 오는 선택 ---------- */
defineScene('crisis_turn', {
  title: (g, s) => { const c = active(g); return c && c.start === s.cid ? `${defOf(c).name}: ${defOf(c).phases[s.phase].name}` : '위기'; },
  text: (g, s) => {
    const c = active(g);
    if (!c || c.start !== s.cid) return '큰일은 이미 지나갔다.';
    return `${defOf(c).phases[s.phase].text(g, c)} (지금 형편: ${sevWord(c.sev)})`;
  },
  choices: (g, s) => {
    const c = active(g);
    if (!c || c.start !== s.cid) return [{ label: '알겠다', key: 'none' }];
    return defOf(c).phases[s.phase].choices(g, c).map((x) => ({ label: x.label, key: x.key }));
  },
  resolve(g, rng, s, key) {
    const c = active(g);
    if (!c || c.start !== s.cid) return '지나간 일이다.';
    const ph = defOf(c).phases[s.phase];
    // 고른 길이 그 사이 막혔으면(돈이 없어짐, 치유사 동료가 떠남 등) 같은 편의 남은 길, 없으면 첫 길로 간다
    const open = ph.choices(g, c);
    let ch = open.find((x) => x.key === key);
    if (!ch) { const was = (s.choices ?? []).find((x) => x.key === key); ch = open.find((x) => x.stance === was?.stance) ?? open[0]; }
    if (!ch) return '지나간 일이다.';
    deed(g, ch.stance, 2);
    return ph.resolve(g, rng, c, ch.key);
  },
});

/* ---------- 매달 할 수 있는 일 ---------- */
const canAct = (g) => isAdult(g) && !traveling(g) && inLeonia(g) && !!active(g);
ACTIONS.push({
  id: 'crisis_help',
  name: '위기에 손을 보탠다',
  icon: 'shield',
  desc: '나라를 덮친 큰일에 맞선다. 위험하고, 돈이 되지 않는다.',
  available: (g) => canAct(g) && active(g).helped !== monthIndex(g) && !!defOf(active(g)).help,
  run(g, rng) {
    const c = active(g);
    c.helped = monthIndex(g);
    deed(g, 'hero');
    return defOf(c).help(g, rng, c);
  },
});
ACTIONS.push({
  id: 'crisis_use',
  name: '위기를 이용한다',
  icon: 'coin',
  desc: '모두가 무너질 때가 돈 벌 때다. 사람들은 잊지 않는다.',
  available: (g) => canAct(g) && active(g).used !== monthIndex(g) && !!defOf(active(g)).exploit,
  run(g, rng) {
    const c = active(g);
    c.used = monthIndex(g);
    deed(g, 'use');
    return defOf(c).exploit(g, rng, c);
  },
});

/* ---------- 화면용 ---------- */
// 도우미스레드1이 위기 화면(배너·연표)에 쓴다
export function crisisStatus(g) {
  const cr = CR(g);
  const c = cr.active;
  const D = defOf(c);
  return {
    active: c ? {
      id: c.id, name: D.name, kind: D.kind, phase: c.phase + 1, phases: D.phases.length, phaseName: D.phases[c.phase].name,
      since: c.y, sev: Math.round(c.sev), sevWord: sevWord(c.sev), stance: stanceOf(c), stanceName: STANCE[stanceOf(c)], deeds: { ...c.deeds },
      helpName: D.helpName, exploitName: D.exploitName,
    } : null,
    past: cr.past.map((p) => ({ ...p, resultName: RESULT_NAME[p.result], stanceName: STANCE[p.stance] ?? '아이였다' })),
  };
}

export { sceneQueued };

// 대 잇기: 위기는 세상의 일이라 이어진다. 다만 어느 편에 섰는지는 새 사람이 다시 정한다.
HOOKS.heir.push((g) => {
  const c = CR(g).active;
  if (c) c.deeds = { hero: 0, idle: 0, use: 0 };
});
