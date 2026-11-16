// 앓는 삶: 병에 걸리고, 누구에게 맡길지 고르고, 낫거나 몸에 무언가를 남긴다. 식구가 앓으면 그 손을 잡는다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, up, gains, spend, canSpend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { byId, kill, ageYears } from '../npc.js';
import { realmOf } from '../realms/index.js';
import { invented } from '../era/state.js';
import { knows } from '../magic/spells.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { V, addFame as vocFame } from '../vocation/core.js';
import { HS, mi, clamp, KINDS, CHRONIC, HEALERS, hlog, sevWord, hasChronic, mySick } from './state.js';
import { outbreaksIn } from './world.js';

const here = (g) => L(g).place;
const free = (g) => !L(g).travel && !isJailed(g) && !g.over;
const wage = (g) => PLACES[here(g)]?.wage ?? 1;
const town = (g) => (PLACES[here(g)]?.house ?? 0) > 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 17) ^ Math.imul(mi(g) * 29 + salt + 7, 2246822519)) | 0 });
const whoName = (g, s) => (s.who === 'me' ? '나' : byId(g, s.who)?.name ?? '식구');
const sickById = (g, id) => HS(g).sick.find((s) => s.id === id) ?? null;

// 함께 사는 가까운 식구: 부모·형제(집안), 배우자, 자식 가운데 같은 고장에 있는 사람
export function closeKin(g) {
  const meP = me(g), id = g.player.id, fam = new Set(g.player.familyIds ?? []);
  return g.people.filter((p) => p.alive && !p.isPlayer && !p.away && (fam.has(p.id) || p.id === meP?.spouseId || p.fatherId === id || p.motherId === id) && (p.place ?? 'ern') === here(g));
}

/* ---------- 병에 걸린다 ---------- */
export function fallSick(g, kind, who, rng, sev = null) {
  const H = HS(g), K = KINDS[kind];
  if (!K || H.sick.some((s) => s.who === who && s.kind === kind)) return null;
  const s = { id: H.seq++, kind, who, sev: Math.round(sev ?? (kind === 'plague' ? rng.int(35, 55) : rng.int(18, 40))), peak: 0, months: 0, start: mi(g), treat: null };
  s.peak = s.sev;
  H.sick.push(s);
  if (who === 'me') { note(g, `${J(K.name, '을/를')} 앓기 시작했다.`); hlog(g, `${J(K.name, '을/를')} 앓기 시작했다.`); }
  else hlog(g, `${byId(g, who)?.name ?? '식구'}, ${J(K.name, '을/를')} 앓다.`);
  if (!sceneQueued(g, 'health_treat') && (who === 'me' ? playerAge(g) >= 12 : playerAge(g) >= 14)) queueScene(g, 'health_treat', { sid: s.id, quack: rng.chance(0.35) }, { first: who === 'me' });
  return s;
}
// 낫지 않는 것이 남는다
export function addChronic(g, id, from = null) {
  const H = HS(g), C = CHRONIC[id];
  if (!C || hasChronic(g, id)) return false;
  H.chronic.push({ id, since: g.date.year, from });
  for (const [k, v] of Object.entries(C.stat)) g.player.stats[k] = Math.max(1, (g.player.stats[k] ?? 30) + v);
  note(g, `${from ? `${J(KINDS[from]?.name ?? '병', '이/가')} 지나간 뒤 ` : ''}${C.name}: ${C.desc}`);
  hlog(g, `${J(C.name, '이/가')} 남았다.`);
  return true;
}

// 치료의 힘 (0~1, 돌팔이는 음수)
export function healPower(g, by, kind) {
  const K = KINDS[kind];
  let p = K.cure[by] ?? 0;
  if (by === 'physician' && kind === 'rot' && invented(g, 'healstone')) p += 0.1;
  if (by === 'temple') { const f = faithState(g); p *= 0.6 + f.devotion / 100; if (realmOf(here(g)) === 'holy') p *= 1.2; }
  if (by === 'self_heal') p = clamp((K.cure.physician ?? 0.5) * (0.4 + (g.player.skills.healing ?? 0) / 80), 0, 0.9);
  if (by === 'self_herbs') p = clamp((K.cure.herbalist ?? 0.4) * (0.4 + (g.player.skills.herbs ?? 0) / 70), 0, 0.85);
  if (by === 'self_magic') p = kind === 'rot' && !knows(g, 'cure') ? 0.6 : K.cure.mage;
  return Math.round(clamp(p, -0.5, 0.95) * 100) / 100;
}

/* ---------- 누구에게 맡길까 ---------- */
function options(g, s) {
  const out = [];
  const pl = here(g), w = wage(g), sk = g.player.skills ?? {};
  const cost = (id) => Math.max(1, Math.round(HEALERS[id].cost * w));
  if ((sk.healing ?? 0) >= 30) out.push({ by: 'self_heal', label: '내 의술로 다스린다', cost: 1 });
  if ((sk.herbs ?? 0) >= 25) out.push({ by: 'self_herbs', label: '약초를 직접 달인다', cost: 0 });
  if (knows(g, 'cure') || (s.kind === 'rot' && knows(g, 'mend'))) out.push({ by: 'self_magic', label: '치유 마법을 건다', cost: 0 });
  if (HEALERS.physician.places.includes(pl)) out.push({ by: 'physician', label: `의원에게 보인다 (은화 ${cost('physician')}닢)`, cost: cost('physician') });
  if (HEALERS.mage.places.includes(pl)) out.push({ by: 'mage', label: `치유 마법사를 부른다 (은화 ${cost('mage')}닢)`, cost: cost('mage') });
  if (town(g)) out.push({ by: 'herbalist', label: `약초꾼을 찾는다 (은화 ${cost('herbalist')}닢)`, cost: cost('herbalist') });
  if (town(g)) out.push({ by: 'temple', label: `신전에 가 치유를 빈다 (헌금 ${cost('temple')}닢)`, cost: cost('temple') });
  if (s.quack && town(g)) out.push({ by: 'quack', label: `떠돌이 약장수의 만병통치약 (은화 ${cost('quack')}닢)`, cost: cost('quack') });
  return out.filter((o) => o.cost === 0 || canSpend(g, o.cost));
}
const TREAT_TEXT = {
  self_heal: '맥을 짚고 열을 쟀다. 해야 할 것과 하지 말아야 할 것을 안다. 아는 것과 견디는 것은 다르지만.',
  self_herbs: '버드나무 껍질과 쑥을 달였다. 쓴 김이 방에 가득 찼다.',
  self_magic: '두 손을 얹고 술식을 그렸다. 손바닥 아래에서 열기가 천천히 빠져나갔다.',
  physician: '의원은 혀를 보고 맥을 짚더니 약재 세 봉지를 싸 주었다. "하루 두 번, 거르지 마시오. 그리고 물은 꼭 끓여 마시고."',
  mage: '흰 옷의 치유 마법사가 왔다. 가슴 위에 푸른 술식이 떠올랐다가 스며들었다. 비싼 값을 한다.',
  herbalist: '약초꾼 노파는 냄새를 맡아 보고 마른 풀 몇 가지를 골라 주었다. "사흘이면 땀이 날 거요. 땀이 나면 사는 거고."',
  temple: '사제가 성수를 뿌리고 기도문을 읊었다. 촛불 냄새 속에서 잠깐 몸이 가벼워지는 것 같았다.',
  quack: '약장수는 푸른 병을 흔들며 "용의 쓸개로 만든" 약이라고 했다. 맛은 독한 술과 녹슨 쇠 같았다.',
  rest: '아무에게도 맡기지 않았다. 문을 닫고 누워 몸이 이기기를 기다렸다.',
};
defineScene('health_treat', {
  keep: true,
  need: (g, s) => !!sickById(g, s.sid) && (sickById(g, s.sid).who === 'me' || !!byId(g, sickById(g, s.sid).who)?.alive),
  title: (g, s) => { const x = sickById(g, s.sid); return x.who === 'me' ? KINDS[x.kind].name : `${whoName(g, x)}의 ${KINDS[x.kind].name}`; },
  text: (g, s) => {
    const x = sickById(g, s.sid), K = KINDS[x.kind];
    const who = x.who === 'me' ? '내가' : `${J(whoName(g, x), '이/가')}`;
    return `${who} ${J(K.name, '을/를')} 앓는다. ${K.desc} 지금은 ${sevWord(x.sev)}. 누구에게 맡길까.`;
  },
  choices: (g, s) => [...options(g, sickById(g, s.sid)).map((o) => ({ label: o.label, key: o.by })), { label: '아무에게도 맡기지 않고 버틴다', key: 'rest' }],
  resolve(g, rng, s, key) {
    const x = sickById(g, s.sid);
    if (!x) return '';
    if (key === 'rest') { x.treat = null; return TREAT_TEXT.rest; }
    const o = options(g, x).find((y) => y.by === key);
    if (!o) return '그 사이 형편이 달라졌다. 돈이 모자라 아무에게도 맡기지 못했다.';
    if (o.cost > 0 && !spend(g, o.cost)) return '주머니가 모자랐다. 아무에게도 맡기지 못했다.';
    const power = healPower(g, key, x.kind);
    x.treat = { by: key, power, left: key === 'quack' ? 2 : 3 };
    if (key === 'temple') { const f = faithState(g); f.devotion = clamp(f.devotion + 2, 0, 100); }
    if (key === 'self_heal') gainSkill(g, 'healing', 1, 'int');
    if (key === 'self_herbs') gainSkill(g, 'herbs', 1, 'sen');
    if (key === 'self_magic' && g.player.mana != null) g.player.mana = Math.max(0, g.player.mana - 5);
    if (key === 'quack') HS(g).quacked += 1;
    return TREAT_TEXT[key] ?? '';
  },
});

/* ---------- 행동 ---------- */
ACTIONS.push({
  id: 'health_rest', name: '몸조리하기', icon: 'rest',
  desc: '일을 놓고 누워서 앓는다. 병을 이기는 것은 결국 몸이다. 잘 먹고 잘 자면 빨리 낫는다.',
  available: (g) => !g.over && !L(g).travel && mySick(g).length > 0,
  run(g, rng) {
    const s = mySick(g).sort((a, b) => b.sev - a.sev)[0];
    if (!s) return '이제 앓던 기운이 다 빠졌다.';
    const H = HS(g);
    if (H.restAt !== mi(g)) { H.restAt = mi(g); s.sev = clamp(s.sev - (5 + g.player.stats.wil / 20), 0, 100); }
    g.player.fatigue = Math.max(0, g.player.fatigue - 12); stress(g, -2);
    return `${rng.pick(['묽은 보리죽을 몇 숟갈 넘기고 다시 누웠다.', '땀에 젖은 이불을 갈았다. 창밖 소리가 멀게 들렸다.', '하루 종일 천장의 얼룩을 세었다. 얼룩이 마흔세 개였다.'])} ${sevWord(s.sev)}.`;
  },
});
const needCare = (g) => HS(g).sick.find((s) => !s.treat && (s.who === 'me' || closeKin(g).some((p) => p.id === s.who)));
ACTIONS.push({
  id: 'health_seek', name: '치료 구하기', icon: 'heart',
  desc: '앓는 나나 식구를 누구에게 맡길지 정한다. 의원, 약초꾼, 신전, 치유 마법사. 고장마다 있는 사람이 다르고 값도 다르다.',
  available: (g) => playerAge(g) >= 12 && free(g) && !!needCare(g) && !sceneQueued(g, 'health_treat'),
  run(g, rng) {
    const s = needCare(g);
    if (!s) return '맡길 병자가 없다.';
    tired(g, 3);
    queueScene(g, 'health_treat', { sid: s.id, quack: rng.chance(0.35) }, { first: true });
    return `${s.who === 'me' ? '앓는 몸을 일으켜' : `${J(whoName(g, s), '을/를')} 눕혀 두고`} 고을을 돌며 물었다. 누가 잘 고치는지.`;
  },
});
ACTIONS.push({
  id: 'health_tend', name: '병자 돌보기', icon: 'heart',
  desc: '병이 도는 고장에서 앓는 이웃을 돌본다. 물을 끓이고, 이마를 식히고, 죽은 사람을 묻는다. 옮을 수 있다.',
  available: (g) => playerAge(g) >= 14 && free(g) && outbreaksIn(g, here(g)).length > 0 && mySick(g).length === 0,
  run(g, rng) {
    const o = outbreaksIn(g, here(g)).sort((a, b) => b.sev - a.sev)[0];
    if (!o) return '병은 이제 이 고장을 떠났다.';
    tired(g, 14); stress(g, 4);
    const H = HS(g);
    const h = gainSkill(g, 'healing', 0.8, 'int'), b = gainSkill(g, 'herbs', 0.5, 'sen');
    if (H.tendAt !== mi(g)) {
      H.tendAt = mi(g);
      deed(g, 'kind', 6, `${g.player.name}${J(g.player.name, '이/가').slice(g.player.name.length)} ${KINDS[o.kind].name} 도는 골목에서 병자들을 돌본다고 한다.`);
      if (L(g).job?.id === 'physician') { V(g).patients = (V(g).patients ?? 0) + rng.int(2, 6); vocFame(g, 'healer', 1.5); }
    }
    const caught = ownRng(g, 31).chance(0.06 * o.sev * (1.2 - Math.min(0.6, (g.player.skills.healing ?? 0) / 100)));
    const line = rng.pick(['끓인 물을 집집마다 날랐다. 문이 열리지 않는 집도 있었다.', '열에 들뜬 아이의 이마에 젖은 천을 얹었다. 아이 어머니는 고맙다는 말 대신 울었다.', '새벽에 수레 하나를 끌고 다니며 밤사이 떠난 사람들을 실었다. 이름을 아는 얼굴이 둘 있었다.']);
    if (caught) fallSick(g, o.kind, 'me', ownRng(g, 32));
    return `${line}${caught ? ' 저녁 무렵 내 이마도 뜨거워지기 시작했다.' : ''}${gains([up('의술', h), up('약초', b)])}`;
  },
});

/* ---------- 한 달: 옮고, 깊어지고, 낫거나 남는다 ---------- */
const WOUND = /베인|물린|찢|상처|부러|화살|칼|창|발톱|이빨/;
function catchChance(g, o, who) {
  const p = g.player;
  let c = o.sev * 0.2;
  if (who === 'me') {
    c *= 1.25 - Math.min(0.6, p.stats.str / 160 + p.stats.wil / 300);
    if (L(g).home === 'street') c *= 1.7;
    if (playerAge(g) >= 55) c *= 1.3;
    if (o.kind === 'lung' && hasChronic(g, 'lungs')) c *= 1.6;
  } else c *= 0.7 + (100 - (who.health ?? 70)) / 120 + (ageYears(who) >= 60 || ageYears(who) < 5 ? 0.4 : 0);
  if (g.world?.famine) c *= 1.3;
  return clamp(c, 0, 0.5);
}
HOOKS.afterMonth.push((g) => {
  const H = g.health;
  if (!H || g.over || !g.player) return;
  const rng = ownRng(g, 3);
  const p = g.player, age = playerAge(g);
  // 옮는다
  if (!L(g).travel && age >= 6) {
    for (const o of outbreaksIn(g, here(g))) if (rng.chance(catchChance(g, o, 'me'))) fallSick(g, o.kind, 'me', rng);
    let one = false;
    for (const k of closeKin(g)) {
      if (one) break;
      for (const o of outbreaksIn(g, here(g))) if (rng.chance(catchChance(g, o, k) * 0.7)) { if (fallSick(g, o.kind, k.id, rng)) { one = true; break; } }
    }
  }
  // 상처가 덧난다
  if (p.injuries.some((i) => WOUND.test(i.name)) && !H.sick.some((s) => s.who === 'me' && s.kind === 'rot')) {
    const odds = (invented(g, 'healstone') ? 0.02 : 0.045) * (knows(g, 'mend') ? 0.5 : 1) * (L(g).home === 'street' ? 1.5 : 1);
    if (rng.chance(odds)) fallSick(g, 'rot', 'me', rng, rng.int(20, 35));
  }
  // 깊어지거나 낫는다
  for (const s of [...H.sick]) {
    const K = KINDS[s.kind];
    const person = s.who === 'me' ? null : byId(g, s.who);
    if (s.who !== 'me' && (!person || !person.alive)) { H.sick = H.sick.filter((x) => x !== s); continue; }
    const resist = s.who === 'me' ? (p.stats.str + p.stats.wil) / 25 + (age < 40 ? 2 : age >= 60 ? -3 : 0) + (L(g).home === 'street' ? -2 : 0) : (person.health ?? 70) / 14 - (ageYears(person) >= 65 ? 3 : 0);
    const tp = s.treat && s.treat.left > 0 ? s.treat.power : 0;
    // 병은 처음 몇 달 깊어지다가, 몸이 버티면 저절로 기운다
    const grow = K.grow * (s.months < K.last[0] ? 1 : s.months < K.last[1] ? 0.5 : 0.15);
    s.sev = clamp(s.sev + grow * rng.float(0.5, 1.2) - resist - tp * 26, 0, 100);
    s.peak = Math.max(s.peak, s.sev);
    s.months += 1;
    if (s.treat) { s.treat.left -= 1; if (s.treat.left <= 0) s.treat = null; }
    if (s.who === 'me') { p.fatigue = Math.min(100, p.fatigue + s.sev / 5); p.stress = Math.min(100, p.stress + s.sev / 25); }
    const done = (cured) => {
      H.sick = H.sick.filter((x) => x !== s);
      if (!cured) return;
      H.cured += 1;
      if (s.who === 'me') {
        for (const [cid, odds] of Object.entries(K.leaves)) if (rng.chance(odds * s.peak / 100)) { addChronic(g, cid, s.kind); break; }
        hlog(g, `${J(K.name, '을/를')} 이겨 냈다.`);
      } else { person.health = Math.max(15, (person.health ?? 70) - Math.round(s.peak / 8)); hlog(g, `${person.name}, ${J(K.name, '을/를')} 이겨 내다.`); }
    };
    if (s.sev <= 0) { done(true); continue; }
    // 고비: 병이 깊어지면 한 번, 목숨을 건 밤이 온다. 깊을수록, 맡긴 데가 없을수록 위태롭다.
    if (s.sev >= 70 && !s.crisis) {
      s.crisis = true;
      const lethal = K.deadly * (1 - Math.max(0, tp)) * (s.sev / 85) * (s.who === 'me' ? 1 : 1.5);
      if (s.who === 'me') {
        if (age >= 16 && rng.chance(lethal)) { L(g).pendingDeath = K.name; H.sick = H.sick.filter((x) => x !== s); chron(g, `${g.player.name}, ${J(K.name, '으로/로')} 쓰러지다.`, 100); return; }
      } else if (ageYears(person) >= 3 && rng.chance(lethal)) {
        kill(g, person, K.name); stress(g, 25);
        hlog(g, `${person.name}, ${J(K.name, '으로/로')} 세상을 떠나다.`); note(g, `${J(person.name, '이/가')} ${J(K.name, '으로/로')} 세상을 떠났다.`);
        H.sick = H.sick.filter((x) => x !== s); continue;
      }
      s.sev = Math.min(s.sev, 75);
    }
    if (s.months > K.last[1] + 4) done(true);
  }
  // 낫지 않는 것
  for (const c of H.chronic) {
    const C = CHRONIC[c.id];
    if (!C) continue;
    if (C.tire) p.fatigue = Math.min(100, p.fatigue + C.tire);
    if (C.winter && [12, 1, 2].includes(g.date.month)) p.fatigue = Math.min(100, p.fatigue + C.winter);
    if (C.fits && rng.chance(C.fits)) { p.fatigue = Math.min(100, p.fatigue + 10); p.stress = Math.min(100, p.stress + 8); }
  }
});

// 대를 잇는다: 앓던 병과 몸의 장애는 떠난 사람과 함께 간다. 집안 내력은 피를 타고 내려올 수 있다.
HOOKS.heir?.push((g, rng) => {
  const H = HS(g);
  const r = makeRng({ s: ((g.rngState?.s ?? 3) ^ 0x5bd1e995 ^ mi(g)) | 0 });
  const old = H.chronic.filter((c) => CHRONIC[c.id]?.heir);
  H.chronic = [];
  H.sick = H.sick.filter((s) => s.who !== 'me');
  for (const s of H.sick) if (s.who === g.player.id) s.who = 'me';
  for (const c of old) H.lineage[c.id] = (H.lineage[c.id] ?? 0) + 1;
  for (const [id, n] of Object.entries(H.lineage)) {
    if (n > 0 && r.chance(CHRONIC[id].heir)) { addChronic(g, id, null); hlog(g, `집안 내력인 ${J(CHRONIC[id].name, '이/가')} 나에게도 내려왔다.`); }
  }
});
