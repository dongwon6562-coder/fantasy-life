import '../src/content.js';
// 유전과 타고남(src/heredity/)을 브라우저 없이 돌려 보는 점검. 1분 안에 끝나게: 형편을 직접 맞추고 잰다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me, gainSkill } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { makePerson, byId } from '../src/npc.js';
import { makeRng } from '../src/rng.js';
import { becomeHeir } from '../src/heir.js';
import { looksOf } from '../src/art/portrait.js';
import { birthOptions, cleanBirth, heredityInfo, heredityLine, heredityState as HD, bloodOf, bloodHint, resembleOf, inherit, giftFromBlood, BIRTH_GIFT_IDS } from '../src/heredity/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const seen = {};
const samples = [];

function month(g, want = ['rest'], pick = null) {
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = want.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (!a || g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) if (bad(r.text) || josa(r.text)) fail('bad result', r);
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent, s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen[s.kind] = (seen[s.kind] ?? 0) + 1;
    if (pe.choices.length > 8) fail('too many choices', s?.kind);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, out);
    if (/^heredity_/.test(s?.kind ?? '')) {
      if (josa(out) || josa(pe.text) || pe.choices.some(josa)) fail('josa', s.kind, pe.text, out);
      samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
    }
  }
  const st = JSON.stringify(heredityInfo(g));
  if (/NaN|undefined/.test(st)) fail('bad info', st.slice(0, 300));
}
const born = (seed, birth, family = 'farmer') => newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed, birth });

// 1. 고를 거리
{
  const o = birthOptions();
  if (o.gifts.length !== 6 || BIRTH_GIFT_IDS.join() !== 'magic,sword,letters,trade,craft,faith') fail('gifts', o.gifts.map((x) => x.id));
  if (o.modes.length !== 2 || o.traits.length < 10 || o.maxTraits !== 2) fail('options', JSON.stringify(o).slice(0, 200));
  if (!(o.looks.hair.length >= 5 && o.looks.eyes.length >= 5)) fail('looks options', o.looks);
  if (JSON.stringify(o).match(/undefined|NaN/)) fail('options text');
}

// 2. 평범하게: 예전처럼, 부모는 핏줄을 갖는다
{
  const g = born(501);
  const H = HD(g), m = me(g);
  if (H.chosen || H.gift) fail('plain chose', H);
  if (g.birth !== undefined) fail('birth left on game');
  for (const id of [m.fatherId, m.motherId]) if (!byId(g, id)?.blood?.t) fail('parent blood missing', id);
  if (m.traits.length !== 2) fail('plain traits', m.traits);
}

// 3. 큰 재능 하나 + 성격 + 생김새
{
  const g = born(502, { gift: 'magic', traits: ['brave', 'kind'], looks: { hair: 4, eyes: 3 } });
  const H = HD(g), m = me(g), p = g.player;
  if (H.gift !== 'magic' || H.owner !== p.id || !H.chosen) fail('gift not set', H);
  if (m.traits.join() !== 'brave,kind') fail('chosen traits', m.traits);
  if (!(p.manaPotential >= 0.72 && p.manaPotential <= 0.86)) fail('magic potential', p.manaPotential);
  if (!(p.talents.int >= 1.2)) fail('int talent', p.talents.int);
  const lk = looksOf(g, m);
  if (!/붉은/.test(lk) || !/파란/.test(lk)) fail('chosen looks', lk);
  // 큰 재능은 그 길을 빨리 늘린다
  const a = JSON.parse(JSON.stringify(g)), b = JSON.parse(JSON.stringify(g));
  b.heredity.gift = null;
  const ga = gainSkill(a, 'magic', 1), gb = gainSkill(b, 'magic', 1);
  if (Math.abs(ga / gb - 1.6) > 0.01) fail('skill boost', ga, gb);
  if (Math.abs(gainSkill(a, 'sword', 1) / gainSkill(b, 'sword', 1) - 1) > 0.01) fail('boost leaks to other skill');
  // 신앙
  const f = born(503, { gift: 'faith' });
  if (!me(f).traits.includes('pious') || me(f).traits.length > 2) fail('faith pious', me(f).traits);
  if (f.faith && f.faith.devotion < 55) fail('faith devotion', f.faith.devotion);
  // 잘못 넣은 값은 걸러진다
  const c = cleanBirth({ gift: 'dragon', traits: ['brave', 'timid', 'kind', 'lazy'], looks: { hair: 99, eyes: 1 } });
  if (c.gift !== null || c.traits.join() !== 'brave,kind' || c.looks?.hair !== undefined || c.looks?.eyes !== 1) fail('cleanBirth', JSON.stringify(c));
  const d = born(504, { gift: 'zzz', traits: 'nope', looks: 5 });
  if (HD(d).gift) fail('bad birth accepted');
  // 모든 큰 재능이 새 게임을 깨지 않는다
  for (const k of BIRTH_GIFT_IDS) { const x = born(510 + k.length, { gift: k }); if (HD(x).gift !== k) fail('gift', k); if (/NaN|undefined/.test(JSON.stringify(heredityInfo(x)))) fail('info', k); }
}

// 4. 큰 마력은 마법사로 실패하지 않는다: 일곱 살 전에 깨어난다 (네 판 모두)
{
  for (const seed of [601, 602, 603, 604]) {
    const g = born(seed, { gift: 'magic' });
    while (playerAge(g) < 7 && !g.over) month(g);
    if (!g.player.manaAwakened) fail('magic gift not awakened', seed, playerAge(g));
  }
  // 평범하게 태어나 마력 그릇이 작으면 저절로 깨지 않는다
  const g = born(605);
  g.player.manaPotential = 0.05;
  while (playerAge(g) < 7 && !g.over) month(g);
  if (g.player.manaAwakened) fail('plain low mana awakened');
}

// 5. 핏줄: 반쯤 닮고 가끔 튄다 (정해진 주사위로 400번)
{
  const rng = makeRng({ s: 4242 });
  const T = (v) => ({ str: v, agi: v, int: v, wil: v, cha: v, sen: v });
  const hi = { t: T(1.6), mana: 0.8 }, lo = { t: T(0.7), mana: 0.04 };
  let mh = 0, ml = 0, sh = 0, sl = 0, leaps = 0, manaLeap = 0;
  for (let i = 0; i < 400; i++) {
    const a = inherit(rng, hi, hi), b = inherit(rng, lo, lo);
    mh += a.mana; ml += b.mana; sh += a.t.str; sl += b.t.str;
    if (a.leap) leaps++; if (b.leap) leaps++; if (b.leap === 'mana') manaLeap++;
    for (const x of [a, b]) for (const v of Object.values(x.t)) if (!(v >= 0.5 && v <= 1.8)) fail('talent range', v);
  }
  mh /= 400; ml /= 400; sh /= 400; sl /= 400;
  if (!(mh > 0.45 && ml < 0.22)) fail('mana inherit', mh, ml);
  if (!(sh > 1.2 && sl < 0.95)) fail('talent inherit', sh, sl);
  if (!(leaps >= 16 && leaps <= 70)) fail('leap rate', leaps);
  if (verbose) console.log({ mh, ml, sh, sl, leaps, manaLeap });
  if (giftFromBlood({ t: T(1), mana: 0.6 }, rng) !== 'magic') fail('kin gift magic');
  if (giftFromBlood({ t: { ...T(1), sen: 1.5 }, mana: 0.1 }, rng) !== 'sen') fail('kin gift stat');
}

// 6. 새 아이(NPC 포함): 핏줄과 성격을 부모에게서
{
  const g = born(701);
  const rng = rngOf(g);
  const fa = makePerson(rng, { sex: 'm', ageMonths: 30 * 12, job: 'farmer' }), mo = makePerson(rng, { sex: 'f', ageMonths: 28 * 12, job: 'farmer' });
  fa.traits = ['brave', 'diligent']; mo.traits = ['brave', 'generous'];
  fa.blood = { t: { str: 1.7, agi: 1, int: 1, wil: 1, cha: 1, sen: 1 }, mana: 0.7 }; mo.blood = { t: { str: 1.6, agi: 1, int: 1, wil: 1, cha: 1, sen: 1 }, mana: 0.6 };
  g.people.push(fa, mo);
  let str = 0, brave = 0, magicKid = 0;
  const kids = [];
  for (let i = 0; i < 40; i++) { const k = makePerson(rng, { fatherId: fa.id, motherId: mo.id, lastName: fa.lastName }); g.people.push(k); kids.push(k); }
  runHooks('afterNpc', g, rng, []);
  for (const k of kids) {
    if (!k.blood?.t) { fail('newborn blood missing'); break; }
    str += k.blood.t.str; if (k.traits.includes('brave')) brave++;
    if (k.blood.mana >= 0.3) magicKid++;
    if (k.traits.length !== 2) fail('newborn traits', k.traits);
  }
  if (!(str / 40 > 1.2)) fail('newborn str', str / 40);
  if (!(brave >= 14)) fail('newborn brave', brave);
  if (!(magicKid >= 15)) fail('newborn mana', magicKid);
  const r = resembleOf(g, kids[0]);
  if (bad(r)) fail('resemble', r);
  const h = bloodHint(g, fa);
  if (bad(h) || !/마력/.test(h) || josa(h)) fail('blood hint', h);
  if (bad(bloodHint(g, makePerson(rng, {})))) fail('hint plain');
}

// 7. 대 잇기: 자식은 핏줄대로, 큰 재능은 이어지지 않는다
{
  const g = born(801, { gift: 'magic' });
  while (playerAge(g) < 3) month(g);
  const p = g.player, meP = me(g);
  const sp = makePerson(rngOf(g), { sex: meP.sex === 'm' ? 'f' : 'm', ageMonths: 30 * 12, job: 'farmer' });
  sp.blood = { t: { str: 1, agi: 1, int: 1, wil: 1, cha: 1, sen: 1 }, mana: 0.5 };
  g.people.push(sp);
  const kid = makePerson(rngOf(g), { ageMonths: 0, lastName: p.lastName, fatherId: meP.sex === 'm' ? meP.id : sp.id, motherId: meP.sex === 'm' ? sp.id : meP.id });
  g.people.push(kid); meP.childIds.push(kid.id); sp.childIds.push(kid.id);
  runHooks('afterNpc', g, rngOf(g), []);
  const kb = kid.blood;
  if (!kb) fail('kid blood');
  kid.ageMonths = 16 * 12;
  const oldId = p.id, oldMana = p.manaPotential;
  L(g).ancestors.push({ name: p.name, lastName: p.lastName, id: meP.id, born: g.date.year - 30, died: g.date.year, age: 30, cause: '병', summary: '' });
  meP.alive = false;
  becomeHeir(g, rngOf(g), kid);
  if (g.player.id !== kid.id) fail('heir not switched');
  if (HD(g).gift || HD(g).owner) fail('gift passed to heir', HD(g));
  if (kb && Math.abs(g.player.manaPotential - kb.mana) > 0.001) fail('heir mana not from blood', g.player.manaPotential, kb.mana);
  if (Math.abs((byId(g, oldId).blood?.mana ?? -1) - Math.round(oldMana * 100) / 100) > 0.001) fail('old player blood snapshot');
  if (kb && kb.mana > 0.25 && !g.player.manaAwakened) fail('heir mana not awakened');
  if (Math.abs(gainSkill(JSON.parse(JSON.stringify(g)), 'magic', 1) - gainSkill(JSON.parse(JSON.stringify(g)), 'magic', 1)) > 1e-9) fail('nondeterministic');
}

// 8. 세상이 알아본다, 시기 (장면을 직접 띄운다)
{
  for (const [k, key] of [['magic', 0], ['sword', 1], ['faith', 0]]) {
    const g = born(900 + key + k.length, { gift: k });
    while (playerAge(g) < 8) month(g);
    L(g).queue = L(g).queue.filter((q) => !/^heredity_/.test(q.kind));
    HD(g).seen = false; HD(g).envy = false; HD(g).eventAt = 0; // 저절로 이미 떴을 수 있다
    const before = g.player.skills.magic + g.player.skills.sword + g.player.skills.letters;
    queueScene(g, 'heredity_seen', { gift: k }, { first: true });
    let shown = false;
    for (let i = 0; i < 4 && !shown; i++) month(g, ['rest'], (kind) => (kind === 'heredity_seen' ? (shown = true, key) : -1));
    if (!shown) fail('seen never shown', k);
    if (!HD(g).seen) fail('seen not marked', k);
    const after = g.player.skills.magic + g.player.skills.sword + g.player.skills.letters;
    if (key === 0 && !(after >= before + 7)) fail('seen go no skill', k, before, after);
    while (playerAge(g) < 12) month(g);
    L(g).queue = L(g).queue.filter((q) => !/^heredity_/.test(q.kind));
    HD(g).envy = false;
    queueScene(g, 'heredity_envy', { gift: k }, { first: true });
    shown = false;
    for (let i = 0; i < 4 && !shown; i++) month(g, ['rest'], (kind) => (kind === 'heredity_envy' ? (shown = true, 2) : -1));
    if (!shown || !HD(g).envy) fail('envy', k);
  }
  // 재능을 고르지 않았으면 장면이 버려진다
  const g = born(950);
  while (playerAge(g) < 8) month(g);
  queueScene(g, 'heredity_seen', { gift: 'magic' }, { first: true });
  month(g);
  if (HD(g).seen) fail('plain seen');
}

// 9. 저장 불러오기
{
  const g = born(1001, { gift: 'trade', looks: { hair: 1 } });
  const x = JSON.parse(JSON.stringify(g));
  x.people[0].blood = { t: 'x', mana: 'y' };
  x.heredity.gift = 'dragon';
  me(x).looks = 'blue';
  x.people[1].looks = { hair: 99, eyes: 2 };
  runHooks('migrate', x);
  if (x.people[0].blood) fail('bad blood kept');
  if (x.heredity.gift !== null) fail('bad gift kept');
  if (me(x).looks) fail('bad looks kept');
  if (JSON.stringify(x.people[1].looks) !== '{"eyes":2}') fail('looks range', x.people[1].looks);
  const y = JSON.parse(JSON.stringify(g)); delete y.heredity;
  runHooks('migrate', y);
  if (!y.heredity || y.heredity.gift !== null) fail('old save');
  if (bad(String(heredityLine(g)))) fail('line', heredityLine(g));
}

// 10. 자동 플레이: 큰 재능 두 판, 평범 한 판을 마흔 살까지
{
  for (const [seed, gift] of [[1101, 'magic'], [1102, 'sword'], [1103, null]]) {
    const g = born(seed, gift ? { gift } : undefined);
    while (playerAge(g) < 40 && !g.over) {
      const acts = availableActions(g);
      const rng = rngOf(g);
      month(g, [acts[rng.int(0, acts.length - 1)]?.id ?? 'rest']);
    }
    if (verbose) console.log(seed, gift, playerAge(g), Object.entries(g.player.skills).map(([k, v]) => `${k}:${v.toFixed(0)}`).join(' '), JSON.stringify(heredityInfo(g)).slice(0, 200));
  }
}

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen).filter(([k]) => /^heredity_/.test(k)))));
if (verbose) for (const s of samples.slice(0, 12)) console.log(s);
if (problems) { console.log(`hereditytest: ${problems} problems`); process.exit(1); }
console.log('OK');
