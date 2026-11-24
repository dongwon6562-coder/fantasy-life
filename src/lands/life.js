// 새 고장에서 사는 일: 처음 들어선 날의 인상(말투), 그 고장 일거리, 해마다 한 번 마주치는 풍습, 그 고장의 위험,
// 숨은 도시 둘(이엘라·그론다르)의 통행 허가. 앞머리 ld_.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat, me } from '../game.js';
import { EVENTS, age, here, onRoad, money, stress, injure } from '../events/core.js';
import { L, defineScene, queueScene, sceneQueued, note } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { deed } from '../repute/index.js';
import { raceOf } from '../races/index.js';
import { PLACES } from '../places.js';
import { LANDS } from './data.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const S = (g) => (g.lands ??= { pop: {}, pass: {}, seen: [], customAt: {}, worked: {}, log: [], newsAt: -99 });
const busy = (g) => g.over || g.bondage?.slave || g.crime?.jailed || g.army?.campaign || g.army?.captive || !!L(g).heirPending;
const land = (g) => (onRoad(g) ? null : LANDS[here(g)] ?? null);
const able = (g) => !busy(g) && !onRoad(g) && !!land(g);
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const llog = (g, text) => { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 24) s.log.splice(0, s.log.length - 24); };

/* ---------- 처음 들어선 날 ---------- */
HOOKS.afterActions.push((g) => {
  if (!g.lands || !g.life || onRoad(g)) return;
  const id = here(g), d = LANDS[id];
  if (!d || S(g).seen.includes(id)) return;
  S(g).seen.push(id);
  if (age(g) < 6) return;
  note(g, `${d.name}에서 처음 하룻밤을 묵었다. ${d.custom.title} 같은 풍습이 있는 고장이라고 한다. 사람들은 이렇게 말한다. ${d.speech}`);
});

/* ---------- 그 고장 일거리 ---------- */
ACTIONS.push({
  id: 'ld_work',
  name: '그 고장 일',
  icon: 'labor',
  desc: '이 고장에서만 하는 일을 거든다. 고장마다 일도 품삯도 다르다.',
  available: (g) => able(g) && age(g) >= 14,
  run(g, rng) {
    const d = land(g);
    if (!d) return '오늘은 일거리가 없었다.';
    const w = d.work, sk = w.skill ? (g.player.skills[w.skill] ?? 0) : 30;
    const boom = (PLACES[here(g)]?.wage ?? d.wage) / d.wage; // 고장이 크면 품삯도 오른다
    const pay = Math.max(1, Math.round(rng.int(w.pay[0], w.pay[1]) * 0.45 * (0.8 + sk / 200) * boom)); // 품팔이(2닢)보다 조금 낫고 제대로 된 일자리보다는 못하게
    g.player.money += pay;
    g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 14);
    stress(g, 3);
    if (w.skill) gainSkill(g, w.skill, 0.4);
    const s = S(g); s.worked[here(g)] = (s.worked[here(g)] ?? 0) + 1;
    if (s.worked[here(g)] === 12) { renown(g, 2); llog(g, `${d.name}에서 ${J(w.name, '으로/로')} 한 해를 났다. 이제 그 고장 사람들이 나를 안다.`); }
    return `${w.name}. ${rng.pick(w.text)} 은화 ${pay}닢을 받았다.`;
  },
});

/* ---------- 풍습: 해마다 한 번쯤 ---------- */
const EFFECT = {
  stress: (g, v) => stress(g, v),
  fatigue: (g, v) => { g.player.fatigue = clamp((g.player.fatigue ?? 0) + v, 0, 100); },
  rep: (g, v) => renown(g, v),
  luck: (g, v) => stress(g, -2 * v),
  kind: (g, v) => deed(g, 'kind', v, null),
  pious: (g, v) => { if (g.faith) g.faith.piety = (g.faith.piety ?? 0) + v; },
  suspect: (g, v) => { if (g.faith) g.faith.suspicion = clamp((g.faith.suspicion ?? 0) + v, 0, 100); },
  money: (g, v) => { g.player.money = Math.max(0, g.player.money + v); },
  trade: (g, v) => gainSkill(g, 'trade', v),
  letters: (g, v) => gainSkill(g, 'letters', v),
  smithing: (g, v) => gainSkill(g, 'smithing', v),
  wil: (g, v) => gainStat(g, 'wil', v),
};
const apply = (g, eff) => { for (const [k, v] of Object.entries(eff ?? {})) EFFECT[k]?.(g, v); };
HOOKS.afterMonth.push((g, rng) => {
  if (!g.lands || !able(g) || age(g) < 10 || L(g).queue.length) return;
  const id = here(g), s = S(g);
  if (!s.seen.includes(id) || (s.customAt[id] ?? -1) >= g.date.year || sceneQueued(g, 'ld_custom')) return;
  if (!rng.chance(0.18)) return;
  s.customAt[id] = g.date.year;
  queueScene(g, 'ld_custom', { id });
});
defineScene('ld_custom', {
  need: (g, s) => !onRoad(g) && here(g) === s.id && !!LANDS[s.id],
  title: (g, s) => LANDS[s.id].custom.title,
  text: (g, s) => LANDS[s.id].custom.text,
  choices: (g, s) => LANDS[s.id].custom.choices.filter(([, , e]) => !(e.money < 0 && money(g) < -e.money)).map(([label], i) => ({ label, key: String(LANDS[s.id].custom.choices.findIndex((c) => c[0] === label)) })),
  resolve(g, rng, s, key) {
    const c = LANDS[s.id].custom.choices[Number(key)] ?? LANDS[s.id].custom.choices[0];
    apply(g, c[2]);
    return c[1];
  },
});

/* ---------- 그 고장의 위험 ---------- */
EVENTS.push({
  id: 'ld_danger', cooldown: 18,
  cond: (g) => able(g) && age(g) >= 12 && S(g).seen.includes(here(g)),
  chance: (g) => (land(g)?.danger.p ?? 0) * (1.3 - (g.lands?.pop?.[here(g)] ?? 50) / 200),
  weight: 20,
  prepare: (g) => ({ id: here(g) }),
  title: '고장의 사고',
  text: (g, c) => LANDS[c.id].danger.text,
  choices: [
    { label: '털고 일어난다', run: (g, rng, c) => {
      const d = LANDS[c.id].danger, out = [];
      if (d.hurt && rng.chance(0.6)) { injure(g, d.hurt, rng.int(1, 3)); out.push(`${d.hurt}.`); }
      if (d.money) { const n = Math.min(money(g), d.money); g.player.money -= n; if (n) out.push(`은화 ${n}닢을 잃었다.`); }
      stress(g, d.stress ?? 4);
      return out.length ? out.join(' ') : '털고 일어났다. 이 고장에 산다는 건 이런 일도 겪는다는 뜻이다.';
    } },
  ],
});

/* ---------- 숨은 도시의 통행 허가 ---------- */
const gateFor = (g) => Object.entries(LANDS).find(([id, d]) => d.gate && d.gate.at === here(g) && !d.gate.races.includes(raceOf(me(g))) && !S(g).pass[id]) ?? null;
ACTIONS.push({
  id: 'ld_pass',
  name: '통행 허가 청하기',
  icon: 'seal',
  desc: '이 고장 너머 숨은 도시로 들어갈 허가를 청한다. 보증과 수수료가 든다.',
  available: (g) => !busy(g) && !onRoad(g) && age(g) >= 16 && !!gateFor(g),
  run(g, rng) {
    const [id, d] = gateFor(g) ?? [];
    if (!d) return '청할 것이 없었다.';
    const gt = d.gate;
    if (money(g) < gt.fee) return `${gt.name}에는 은화 ${gt.fee}닢이 든다. 지금은 모자란다.`;
    g.player.money -= gt.fee;
    const odds = clamp(0.35 + (L(g).renown ?? 0) / 100 + (S(g).worked[here(g)] ?? 0) * 0.02, 0.1, 0.9);
    if (!rng.chance(odds)) {
      g.player.money += Math.floor(gt.fee / 2);
      return `${J(gt.need, '을/를')} 받으러 갔지만 아직 나를 믿지 못하겠다고 했다. 수수료 반은 돌려받았다. 이 고장에서 더 지내며 이름을 알려야겠다.`;
    }
    S(g).pass[id] = true;
    llog(g, `${J(gt.name, '을/를')} 받았다. 이제 ${d.name}에 들어갈 수 있다.`);
    note(g, `${J(gt.name, '을/를')} 받았다.`);
    return `${J(gt.need, '을/를')} 받아 ${J(gt.name, '을/를')} 얻었다. 이제 ${J(d.name, '으로/로')} 가는 길이 열렸다.`;
  },
});

// 대를 이으면: 통행 허가는 내 이름에 붙은 것이라 사라진다. 고장에서 쌓은 일솜씨 기록도 새로.
HOOKS.heir.push((g) => { if (!g.lands) return; g.lands.pass = {}; g.lands.worked = {}; });
