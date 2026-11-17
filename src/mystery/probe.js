// 조사: 현장 살피기, 용의자 캐묻기, 뒷골목에서 소식 사기, 이름난 사람에게 도움 청하기, 범인 지목하기.
import { ACTIONS } from '../actions.js';
import { gainStat, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, gains, up } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { GANGS, myGang } from '../underworld/gangs.js';
import { LG, legendName } from '../legends/index.js';
import { J } from '../narrative/text.js';
import { M, KINDS, mi, here, placeName, free, stat, bigTown, openHere, caseById, culpritOf, kindName, caseTitle, closeCase, logMystery } from './core.js';

// 장물아비가 진범인 도난 사건은 그 고장 조직의 일이다
export const gangOf = (c) => (c.kind === 'theft' && culpritOf(c)?.role === '뒷골목 장물아비' ? Object.keys(GANGS).find((id) => GANGS[id].place === c.place) ?? null : null);
const legendHere = (g, c) => LG(g).list.find((x) => x.alive && !x.timeless && x.at === c.place && ['adventurer', 'holy', 'sword', 'mage'].includes(x.kind)) ?? null;
const canProbe = (g) => playerAge(g) >= 14 && free(g) && !!openHere(g);
const left = (c) => c.suspects.filter((s) => !s.cleared);

// 단서 하나: 죄 없는 사람 하나를 풀어 주거나, 진범을 가리킨다. 진범이 없으면 마지막에는 모두 풀려난다.
function clue(g, rng, c, how, target = null) {
  const innocents = c.suspects.filter((s) => !s.guilty && !s.cleared);
  const cul = culpritOf(c);
  let line;
  if (target) {
    if (target.guilty) { target.pointed = true; c.heat += 1; line = `${target.name}의 말이 앞뒤가 맞지 않았다. ${target.motive}.`; }
    else { target.cleared = true; line = `${J(target.name, '은/는')} 그날 다른 곳에 있었다. 본 사람이 있다.`; }
  } else if (innocents.length && (rng.chance(0.6) || !cul || cul.pointed)) {
    const s = rng.pick(innocents); s.cleared = true;
    line = `${J(s.name, '은/는')} 아니다. ${how}에서 그것을 알았다.`;
  } else if (cul) {
    cul.pointed = true; c.heat += 1;
    line = `${how}에서 나온 것이 ${J(cul.name, '을/를')} 가리킨다.`;
  } else line = `${how}에서 이상한 것을 찾았다. 사람의 짓이라고 하기엔 너무 깨끗하다.`;
  c.clues.push(line);
  if (c.clues.length > 8) c.clues.shift();
  return line;
}

ACTIONS.push({
  id: 'mystery_probe',
  name: '풀리지 않은 일을 캔다',
  icon: 'wander',
  desc: '이 고장에서 벌어진 실종·독살·도난·유령 소문을 캔다. 현장을 살피고 사람들을 캐묻는다. 캐물을수록 진범도 나를 알아챈다.',
  available: (g) => canProbe(g) && !sceneQueued(g, 'mystery_case'),
  run(g) { const c = openHere(g); queueScene(g, 'mystery_case', { id: c.id }); return `${caseTitle(c)}에 대해 묻고 다녔다.`; },
});

defineScene('mystery_case', {
  need: (g, s) => { const c = caseById(g, s.id); return free(g) && !!c && c.state === 'open' && c.place === here(g); },
  title: (g, s) => `풀리지 않은 일: ${caseTitle(caseById(g, s.id))}`,
  text: (g, s) => {
    const c = caseById(g, s.id), K = KINDS[c.kind];
    const sus = c.suspects.map((x) => `${x.name}${x.cleared ? '(아님)' : x.pointed ? '(수상함)' : ''}`).join(', ');
    const lg = legendHere(g, c);
    return `${K.open(c)} 사람들 입에 오르는 이름은 ${sus}.${c.clues.length ? ` 내가 모은 것: ${c.clues.slice(-3).join(' ')}` : ' 아직 아무것도 모른다.'}${lg ? ` ${J(legendName(lg), '이/가')} 이 고장에 머물고 있다.` : ''}`;
  },
  choices: (g, s) => {
    const c = caseById(g, s.id), out = [{ label: '현장을 살핀다', key: 'look' }];
    c.suspects.forEach((x, i) => { if (!x.cleared) out.push({ label: `${J(x.name, '을/를')} 캐묻는다`, key: `ask:${i}` }); });
    if (g.player.money >= 15 && (myGang(g) || Object.values(GANGS).some((x) => x.place === c.place))) out.push({ label: '뒷골목에서 소식을 산다 (은화 15닢)', key: 'buy' });
    const lg = legendHere(g, c);
    if (lg && !s.legendAsked) out.push({ label: `${legendName(lg)}에게 도움을 청한다`, key: 'legend' });
    const gid = gangOf(c);
    if (gid && myGang(g)?.id === gid) out.push({ label: '조직의 일이다. 덮는다', key: 'cover' });
    if (c.clues.length) {
      c.suspects.forEach((x, i) => out.push({ label: `${J(x.name, '을/를')} 범인으로 지목한다`, key: `accuse:${i}` }));
      if (KINDS[c.kind].none) out.push({ label: `"${KINDS[c.kind].none}"고 결론짓는다`, key: 'none' });
    }
    out.push({ label: '오늘은 그만둔다', key: 'no' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const c = caseById(g, s.id);
    if (!c || c.state !== 'open') return '그 일은 이미 끝나 있었다.';
    if (key === 'no') return '더 묻지 않고 돌아왔다.';
    tired(g, 4);
    if (key === 'look') {
      const ok = check(rng, stat(g, 'sen') * 0.7 + stat(g, 'int') * 0.5, 40 + c.clues.length * 3);
      const st = gainStat(g, 'sen', 0.3);
      if (!ok) return `해 질 때까지 ${c.kind === 'ghost' ? '그 자리를' : '현장을'} 살폈지만 눈에 띄는 것이 없었다.${gains([up('감각', st)])}`;
      return `${clue(g, rng, c, rng.pick(['진흙에 남은 발자국', '닫힌 창의 긁힌 자국', '버려진 천 조각', '바닥에 떨어진 말린 풀'])) }${gains([up('감각', st)])}`;
    }
    if (key.startsWith('ask:')) {
      const x = c.suspects[+key.slice(4)];
      if (!x || x.cleared) return '그 사람은 이미 만나 보았다.';
      const ok = check(rng, stat(g, 'cha') * 0.6 + stat(g, 'wil') * 0.5, 38);
      const st = gainStat(g, 'cha', 0.3);
      if (!ok) { if (x.guilty) c.heat += 1; return `${J(x.name, '은/는')} 문을 반쯤만 열고 대답했다. 아무것도 알아내지 못했다. 등 뒤로 문이 쾅 닫혔다.${gains([up('매력', st)])}`; }
      return `${J(x.name, '을/를')} 찾아가 캐물었다. ${clue(g, rng, c, '', x)}${gains([up('매력', st)])}`;
    }
    if (key === 'buy') {
      if (g.player.money < 15) return '쥘 돈이 모자랐다.';
      g.player.money -= 15;
      const gid = gangOf(c);
      if (gid && !myGang(g)) c.heat += 1; // 조직의 귀에도 들어간다
      return `주막 뒷방에서 은화 15닢을 탁자에 밀었다. ${clue(g, rng, c, '뒷골목의 소문')}`;
    }
    if (key === 'legend') {
      const lg = legendHere(g, c);
      s.legendAsked = true;
      if (!lg) return '그 사람은 벌써 떠난 뒤였다.';
      lg.met = true; lg.bond = (lg.bond ?? 0) + 3;
      return `${J(legendName(lg), '은/는')} 내 이야기를 끝까지 듣고 짧게 한마디 했다. "거꾸로 생각해 보게." ${clue(g, rng, c, '그 한마디')}`;
    }
    if (key === 'cover') {
      const mg = myGang(g);
      if (!mg) return '덮어 줄 이유가 없었다.';
      mg.m.rep = (mg.m.rep ?? 0) + 6;
      M(g).dropped += 1;
      closeCase(g, c, 'dropped', { covered: true });
      deed(g, 'honest', -3, `${J(caseTitle(c), '을/를')} 알면서 덮었다.`, c.place);
      logMystery(g, `${caseTitle(c)}: 조직의 일이라 덮었다.`);
      return `${mg.name}의 일이었다. 모은 것을 불에 넣었다. 다음 날 장물아비가 말없이 술 한 병을 놓고 갔다.`;
    }
    if (key === 'none') return conclude(g, rng, c, null);
    if (key.startsWith('accuse:')) return conclude(g, rng, c, c.suspects[+key.slice(7)] ?? null, true);
    return '돌아왔다.';
  },
});

/** 결론. who가 진범이면 풀림, 아니면 억울한 사람이 벌을 받고 진범은 남는다. who가 null이면 "아무도 아니다". */
export function conclude(g, rng, c, who, accuse = false, { framed = false, paid = 0 } = {}) {
  const m = M(g), K = KINDS[c.kind], cul = culpritOf(c), pl = c.place;
  if (accuse && !who) return '누구를 지목할지 정하지 못했다.';
  const right = who ? who.guilty : c.none;
  if (right) {
    const pay = Math.round(K.reward * (bigTown(pl) ? 1.5 : 1));
    g.player.money += pay;
    m.solved += 1;
    L_renown(g, bigTown(pl) ? 4 : 2);
    deed(g, 'honest', 3, `${caseTitle(c)}의 진상을 밝혔다.`, pl);
    if (c.kind === 'missing' || c.kind === 'poison') deed(g, 'kind', 3, `${caseTitle(c)}의 억울함을 풀었다.`, pl);
    closeCase(g, c, 'solved', { culprit: who?.name ?? null });
    logMystery(g, `${caseTitle(c)}: ${who ? `${J(who.name, '이/가')} 진범이었다` : K.none}.`);
    note(g, `${placeName(pl)}의 ${kindName(c)} 사건을 풀었다.`);
    if (bigTown(pl) || c.kind === 'poison') chron(g, `${g.player.name}, ${placeName(pl)}의 ${J(c.victim, '을/를')} 둘러싼 ${kindName(c)} 사건을 풀다.`, 60);
    stress(g, -6);
    // 조직의 일을 밝히면 조직이 앙심을 품는다
    const gid = gangOf(c);
    if (gid && myGang(g)?.id !== gid) m.grudge = { gang: gid, at: mi(g) };
    if (!who) return `${K.noneText(c)} 마을 사람들이 사례로 은화 ${pay}닢을 모아 주었다.`;
    return `${J(who.name, '을/를')} 사람들 앞에 세웠다. 모은 것을 하나씩 늘어놓자 ${who.name}의 얼굴이 하얘졌다. 끝내 무릎을 꿇었다. ${who.motive}. 경비대가 데려갔다. 사례로 은화 ${pay}닢을 받았다.`;
  }
  // 틀렸다
  m.wrong += 1;
  if (framed) m.framed += 1;
  closeCase(g, c, framed ? 'framed' : 'wrong', { accused: who?.name ?? null, culprit: cul?.name ?? null, exposed: false, paid });
  logMystery(g, `${caseTitle(c)}: ${who ? `${J(who.name, '을/를')} 범인으로 몰았다` : '사람의 짓이 아니라고 덮었다'}.`);
  if (who) {
    who.punished = true;
    L_renown(g, 1);
    stress(g, framed ? 8 : 2);
    return framed
      ? `${J(who.name, '을/를')} 사람들 앞에 세웠다. 내 말을 모두가 믿었다. 받은 은화 ${paid}닢이 주머니 안에서 무거웠다. ${J(who.name, '은/는')} 끝까지 아니라고 했다.`
      : `${J(who.name, '을/를')} 사람들 앞에 세웠다. ${J(who.name, '은/는')} 끝까지 아니라고 울부짖었지만 경비대가 끌고 갔다. 사람들은 고맙다고 했다. 그런데 무언가 걸린다.`;
  }
  return `사람의 짓이 아니라고 결론지었다. 사람들은 고개를 끄덕였지만, 밤길은 여전히 아무도 다니지 않는다.`;
}
// 이름값은 adventure의 renown
const L_renown = (g, n) => { L(g).renown = Math.max(0, (L(g).renown ?? 0) + n); };
