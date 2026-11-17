// 예언 곁에서 사는 삶: 징조를 풀고, 예언을 외치고(맞으면 이름이, 틀리면 손가락질이 남는다),
// 나나 내 자식이 예언 속 사람으로 지목된다. 받아들일지, 부정할지, 그 믿음을 이용할지.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { byId, ageYears } from '../npc.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { SS, stageOf, sealPower } from '../seal/state.js';
import { OS, SIGNS, PROPHECIES, BY_NAME, clamp, mi, olog, pending, birthYear } from './state.js';

const here = (g) => L(g).place;
const free = (g) => !L(g).travel && !isJailed(g) && !g.over;
const town = (g) => (PLACES[here(g)]?.house ?? 0) > 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 31) ^ Math.imul(mi(g) * 37 + salt + 11, 2654435761)) | 0 });

// 내 피붙이: 나와 내 자식들 (살아 있는)
export function myBlood(g) {
  const meP = me(g);
  if (!meP) return [];
  return [meP, ...(meP.childIds ?? []).map((id) => byId(g, id)).filter((c) => c && c.alive)];
}
const isMine = (g, id) => myBlood(g).some((p) => p.id === id);
const pName = (g, id) => (id === g.player.id ? g.player.name : byId(g, id)?.name ?? '아이');
// 예언 속 사람으로 지목된 내 피붙이: [{ pro, P, p }]
export function chosenOfMine(g) {
  const O = OS(g), out = [];
  for (const [pro, P] of Object.entries(O.prophecies)) {
    if (!P.chosen) continue;
    const p = byId(g, P.chosen.id);
    if (p?.alive && isMine(g, p.id)) out.push({ pro, P, p });
  }
  return out;
}
export const amChosen = (g) => chosenOfMine(g).some((c) => c.p.id === g.player.id);

/* ---------- 예언 속 사람 찾기 ---------- */
// 꼬리별의 해에 난 피붙이, 봉인의 고리가 풀린 해에 난 피붙이, 봉인을 지킨 이름난 나
function candidate(g, pro) {
  const O = OS(g), blood = myBlood(g), meP = me(g);
  const grownEnough = (p) => (p.id === g.player.id ? playerAge(g) >= 14 : ageYears(p) >= 4);
  if (pro === 'star') return blood.find((p) => grownEnough(p) && O.comets.includes(birthYear(g, p))) ?? null;
  if (pro === 'seal') {
    if (stageOf(sealPower(g)) < 3 || O.prophecies.seal.belief < 35 || SS(g).ending) return null;
    if (isAdult(g) && (SS(g).me.guard >= 2 || (L(g).renown ?? 0) >= 45)) return meP;
    return blood.find((p) => grownEnough(p) && O.ash.includes(birthYear(g, p))) ?? null;
  }
  return null;
}

export function nameChosen(g, pro, p, by, { queue = true } = {}) {
  const P = OS(g).prophecies[pro];
  P.chosen = { id: p.id, name: p.name, by, stance: null, at: mi(g), era: g.realm?.era ?? 0 };
  P.named = (P.named ?? 0) + 1;
  if (P.status === 'whisper') P.status = 'spread';
  olog(g, `${PROPHECIES[pro].name}: ${J(p.id === g.player.id ? g.player.name : p.name, '이/가')} 예언 속 사람으로 지목되었다.`);
  if (queue && !g.over) queueScene(g, 'omen_named', { pro, pid: p.id, by });
  return P.chosen;
}

/* ---------- 장면: 예언 속 사람으로 지목되다 ---------- */
const NAMED_TEXT = {
  seer: (g, who, child, pro) => `세레니아에서 왔다는 별 보는 노인이 문을 두드렸다. 노인은 ${child ? `${J(who, '을/를')} 오래 들여다보더니` : '내 얼굴을 오래 들여다보더니'} 손가락으로 ${child ? '그 아이가' : '내가'} 태어난 해를 짚었다. "${pro === 'star' ? '꼬리별의 해' : '고리가 풀린 해'}. 그 해에 난 아이를 찾아 열두 고장을 돌았소."`,
  temple: (g, who, child, pro) => `교단의 사제 둘이 찾아왔다. 하나는 젊고 하나는 늙었다. "${PROPHECIES[pro].name}을 아시오?" 늙은 사제가 ${child ? J(who, '을/를') : '나를'} 보며 예언의 글귀를 읊었다. 젊은 사제는 그 사이 무언가를 장부에 적었다. 대성당에서 이 ${child ? '아이' : '사람'}를 지켜보겠다고 했다.`,
  cult: (g, who, child) => `검은 옷의 사내가 문간에 섰다. 해가 중천인데 그림자가 이상하게 옅었다. "마지막 실을 잡을 이를 찾았소." 사내의 눈이 ${child ? `${who}에게` : '나에게'} 머물렀다. "잡는 손이 묶을지 끊을지는 아직 모르지만, 새벽은 기다릴 줄 아오."`,
};
defineScene('omen_named', {
  need: (g, s) => !!byId(g, s.pid)?.alive && OS(g).prophecies[s.pro]?.chosen?.id === s.pid,
  title: (g, s) => PROPHECIES[s.pro].name,
  text: (g, s) => {
    const child = s.pid !== g.player.id, who = pName(g, s.pid);
    return `${NAMED_TEXT[s.by](g, who, child, s.pro)} ${PROPHECIES[s.pro].words} 이 말이 이 고장에 퍼지는 데는 사흘이면 될 것이다.`;
  },
  choices: (g, s) => (s.pid === g.player.id ? [
    { label: '예언 속 사람임을 받아들인다', key: 'embrace' },
    { label: '나는 아니라고 잘라 말한다', key: 'deny' },
    { label: '사람들의 믿음을 이용한다', key: 'use' },
  ] : [
    { label: s.by === 'cult' ? '사내를 쫓아내고 아이를 신전에 데려간다' : '아이를 신전에 데려가 축복을 받게 한다', key: 'embrace' },
    { label: '아이를 감추고 식구들 입단속을 한다', key: 'deny' },
    { label: '아이를 앞세워 사람들을 모은다', key: 'use' },
  ]),
  resolve(g, rng, s, key) {
    const O = OS(g), P = O.prophecies[s.pro], c = P.chosen;
    if (!c || c.id !== s.pid) return '그 사이 말이 바뀌었다. 예언 속 사람은 다른 집 아이라고들 한다.';
    const child = s.pid !== g.player.id, who = pName(g, s.pid), f = faithState(g);
    c.stance = key;
    if (key === 'embrace') {
      P.belief = clamp(P.belief + 5, 0, 100);
      L(g).renown = (L(g).renown ?? 0) + (child ? 3 : 5);
      if (child || s.by !== 'cult') f.devotion = clamp(f.devotion + 3, 0, 100);
      if (s.by === 'cult' && !child) { f.suspicion = clamp(f.suspicion + 8, 0, 100); SS(g).cult = clamp(SS(g).cult + 1, 0, 100); }
      stress(g, 3);
      note(g, `${child ? `${who}` : '나'}, ${PROPHECIES[s.pro].name} 속 사람으로 지목되다. ${child ? '아이를 신전에 데려갔다.' : '그 말을 받아들였다.'}`);
      chron(g, `${J(who, '이/가')} ${PROPHECIES[s.pro].name} 속 사람으로 이름이 나다.`, 60);
      if (child) return `${J(who, '을/를')} 안고 신전에 갔다. 사제가 이마에 기름을 발라 주었다. 아이는 울지 않았다. 돌아오는 길에 모르는 사람들이 고개를 숙였다. 아이는 그게 왜인지 몰랐다. 나도 잘 몰랐다.`;
      return s.by === 'cult'
        ? '고개를 끄덕였다. 사내가 웃었다. 그 웃음이 마음에 걸렸다. 그날부터 낯선 사람들이 내 뒤를 따라다닌다. 교단의 장부에도 내 이름이 올랐을 것이다.'
        : '고개를 끄덕였다. 그날부터 사람들이 나를 다르게 본다. 장터에서 값을 깎아 주는 사람도, 침을 뱉는 사람도 생겼다. 예언 속 사람으로 사는 일은 생각보다 무겁다.';
    }
    if (key === 'deny') {
      P.belief = clamp(P.belief - 2, 0, 100);
      if (s.by === 'cult') stress(g, 4);
      return child
        ? `문을 닫았다. 식구들에게 이 일을 입 밖에 내지 말라고 일렀다. ${J(who, '은/는')} 그날 밤 왜 다들 자기를 보느냐고 물었다. 대답해 주지 않았다.`
        : '"잘못 찾아오셨소." 문을 닫았다. 말은 그래도 퍼졌다. 그래도 내가 부정했다는 말도 함께 퍼졌다. 사람들은 곧 다른 이야깃거리를 찾을 것이다.';
    }
    // use: 믿는 이들의 바침
    const gift = rng.int(15, 40) + Math.round(P.belief / 4);
    g.player.money += gift;
    O.me.used += 1;
    L(g).notoriety = (L(g).notoriety ?? 0) + 2;
    deed(g, 'honest', -4, `${J(g.player.name, '이/가')} 예언을 팔아 돈을 모은다는 말이 돈다.`);
    note(g, `${child ? who : '나'}, ${PROPHECIES[s.pro].name}을 앞세워 사람을 모으다.`);
    return `${child ? `${J(who, '을/를')} 문간에 앉혀 두었다.` : '문간에 앉았다.'} 사람들이 왔다. 손을 대 보고, 빵을 두고, 은화를 두고 갔다. 한 달에 은화 ${gift}닢이 모였다. 믿음은 값이 나간다. 그 값을 언젠가 치를지도 모른다.`;
  },
});

/* ---------- 행동 ---------- */
// 징조 풀이: 지금 도는 징조를 옛 예언서와 맞춰 본다. 솜씨가 늘면 헛징조와 참된 징조를 가린다.
ACTIONS.push({
  id: 'omen_read', name: '징조 풀이', icon: 'star',
  desc: '하늘과 땅의 징조를 옛 예언서와 맞춰 본다. 풀이가 맞으면 다가올 일을 먼저 안다. 헛징조도 섞여 있다.',
  available: (g) => isAdult(g) && free(g) && ((g.player.skills.letters ?? 0) >= 10 || OS(g).lore >= 10 || pending(g).length > 0),
  run(g, rng) {
    const O = OS(g);
    tired(g, 4);
    gainSkill(g, 'letters', 0.6, 'int');
    const gain = O.lore < 40 ? 3 : O.lore < 70 ? 2 : 1;
    O.lore = clamp(O.lore + gain, 0, 100);
    const s = pending(g).find((x) => !x.read);
    if (!s) {
      const pro = rng.pick(Object.keys(PROPHECIES));
      return `요즘 도는 징조는 다 풀어 보았다. 대신 ${PROPHECIES[pro].from}을 다시 읽었다. ${PROPHECIES[pro].words} 몇 번을 읽어도 뜻이 하나로 모이지 않는다.`;
    }
    s.read = true;
    const skill = O.lore / 120 + g.player.stats.int / 400 + (g.player.skills.letters ?? 0) / 400;
    const right = rng.chance(clamp(0.35 + skill, 0.35, 0.92));
    s.judged = right ? s.pre : !s.pre;
    const K = SIGNS[s.kind];
    const verdict = s.judged ? '이번 것은 헛것이 아니라는 느낌이 든다. 옛 책에서 같은 징조를 본 해마다 그 일이 왔다.' : '책을 덮었다. 같은 징조가 아무 일 없이 지나간 해가 더 많았다. 이번 것은 헛것으로 보인다.';
    return `"${s.short}." 옛 예언서를 뒤졌다. 이런 징조는 ${K.portent}는 뜻이라고 적혀 있다. ${verdict}`;
  },
});

// 예언하기: 참이라고 본 징조를 장터에서 외친다. 맞으면 예언자로 이름이 나고, 틀리면 거짓 예언자로 손가락질받는다.
const preachable = (g) => pending(g).find((s) => s.read && s.judged === true && !s.preached);
ACTIONS.push({
  id: 'omen_preach', name: '예언하기', icon: 'scroll',
  desc: '참된 징조라고 본 것을 사람들 앞에서 외친다. 맞으면 예언자로 이름이 나고, 틀리면 거짓 예언자가 된다. 교단은 허락 없는 예언자를 좋아하지 않는다.',
  available: (g) => isAdult(g) && free(g) && town(g) && !!preachable(g) && OS(g).me.banned <= mi(g),
  run(g, rng) {
    const O = OS(g), s = preachable(g);
    if (!s) return '외칠 만한 징조가 없다.';
    s.preached = true;
    O.me.preached += 1;
    tired(g, 5);
    const f = faithState(g);
    if (!O.me.approved) f.suspicion = clamp(f.suspicion + 2, 0, 100);
    olog(g, `장터에서 "${SIGNS[s.kind].portent}"고 외쳤다.`);
    return `장터 우물가 돌 위에 올라섰다. "${J(s.short, '을/를')} 보았는가. ${SIGNS[s.kind].portent}!" 처음에는 비웃음이, 나중에는 침묵이 돌아왔다. ${rng.pick(['몇 사람은 내 이름을 물었다.', '한 아낙이 아이 손을 잡고 서둘러 돌아갔다.', '누군가 교단에 일러바치겠다고 중얼거렸다.'])} 이제 기다리는 일만 남았다.`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.omen || !g.realm) return;
  const O = OS(g), rng = ownRng(g, 5), now = mi(g);

  // 내가 외친 예언이 맞았나
  for (const s of O.signs) {
    if (!s.preached || !s.end || s.paid) continue;
    s.paid = true;
    if (s.end === 'came') {
      O.me.right += 1;
      L(g).renown = (L(g).renown ?? 0) + 4;
      O.belief = clamp(O.belief + 3, 0, 100);
      note(g, `내가 외친 예언이 맞았다. ${SIGNS[s.kind].portent}.`);
      if (O.me.right === 3) chron(g, `${J(g.player.name, '이/가')} 예언자로 이름이 나다.`, 60);
      g.news.unshift({ text: `장터 사람들이 ${g.player.name}의 예언을 떠올린다. ${SIGNS[s.kind].portent}고 외쳤던 사람이다.`, rel: 80 });
    } else {
      O.me.wrong += 1;
      L(g).notoriety = (L(g).notoriety ?? 0) + 2;
      stress(g, 4);
      if (!O.me.approved) faithState(g).suspicion = clamp(faithState(g).suspicion + 3, 0, 100);
      deed(g, 'honest', -2, `${J(g.player.name, '이/가')} 외친 예언이 빗나갔다고들 한다.`);
      g.news.unshift({ text: `${g.player.name}의 예언은 빗나갔다. 장터 아이들이 그 흉내를 내며 논다.`, rel: 70 });
    }
  }

  // 지목된 사람이 죽으면 예언은 다른 사람을 찾는다
  for (const P of Object.values(O.prophecies)) {
    if (!P.chosen) continue;
    const p = byId(g, P.chosen.id);
    if (!p || !p.alive) { P.lost.push({ name: P.chosen.name, y: g.date.year }); if (P.lost.length > 6) P.lost.shift(); P.chosen = null; }
  }

  // 예언이 이루어진다: 꼬리별의 아이가 어른이 되어 시대가 바뀌는 것을 보거나, 봉인의 실을 잡은 이가 묶는 쪽에 서거나
  const st = O.prophecies.star, sc = st.chosen;
  if (sc && sc.stance && sc.stance !== 'deny' && (g.realm.era ?? 0) > sc.era && st.status !== 'fulfilled') {
    const p = byId(g, sc.id);
    if (p?.alive && ageYears(p) >= 15 && isMine(g, p.id)) {
      st.status = 'fulfilled';
      L(g).renown = (L(g).renown ?? 0) + (p.id === g.player.id ? 10 : 5);
      chron(g, `시대가 바뀌다. 사람들은 꼬리별의 해에 난 ${p.id === g.player.id ? g.player.name : p.name}의 이름을 그 시대와 함께 기억한다.`, 80);
      note(g, `꼬리별의 예언이 이루어졌다고들 한다. ${p.id === g.player.id ? '나를 두고 하는 말이다.' : `${J(p.name, '을/를')} 두고 하는 말이다.`}`);
    }
  }
  const sp = O.prophecies.seal, ch = sp.chosen;
  if (ch && SS(g).ending && !ch.done) {
    ch.done = true;
    const p = byId(g, ch.id);
    if (p?.alive && isMine(g, p.id) && ch.stance === 'embrace') {
      const kept = SS(g).ending === 'resealed';
      chron(g, kept ? `${p.id === g.player.id ? g.player.name : p.name}, 일곱 번째 금의 예언 속 사람으로 기억되다. 실을 잡은 손은 묶는 쪽이었다.` : `봉인이 끊어지다. 예언 속 사람이라던 ${p.id === g.player.id ? g.player.name : p.name}의 이름을 사람들이 원망과 함께 부른다.`, 85);
      if (kept) L(g).renown = (L(g).renown ?? 0) + 8; else L(g).notoriety = (L(g).notoriety ?? 0) + 4;
    }
  }

  // 예언 속 사람으로 지목된다 (예언마다 한 번에 한 사람, 내 집안에서는 한 예언에 두 번까지)
  if (sceneQueued(g, 'omen_named')) return;
  for (const pro of ['star', 'seal']) {
    const P = O.prophecies[pro];
    if (P.chosen || (P.named ?? 0) >= 2 || now - (P.lastTry ?? -99) < 6) continue;
    const p = candidate(g, pro);
    if (!p) continue;
    P.lastTry = now;
    if (!rng.chance(0.25 + P.belief / 400)) continue;
    const by = pro === 'seal' ? (SS(g).cult >= 35 && rng.chance(0.45) ? 'cult' : 'temple') : rng.chance(0.6) ? 'seer' : 'temple';
    nameChosen(g, pro, p, by);
    break;
  }
});
export { BY_NAME };
