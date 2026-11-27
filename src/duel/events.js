// 검과 결투에 얽힌 사건. 많은 사건이 결투 모드로 이어진다.
import { gainStat, gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { EVENTS, flag, setFlag, age, stat, skill, money, spend, stress, like, injure, nm, byId, living, peers, josa, findJob } from '../events/core.js';
import { kill } from '../npc.js';
import { placePerson } from '../places.js';
import { remember } from '../relations.js';
import { startDuel } from './duel.js';
import { registerDuelEnd } from './registry.js';
import { schoolOf, rankOf, rankName, SCHOOLS, RANKS, swordState, sparSkill, styleOf } from './schools.js';

const here = (g) => g.life?.place ?? 'ern';
const renown = (g, n) => { if (g.life) g.life.renown = (g.life.renown ?? 0) + n; };

EVENTS.push(
  {
    id: 'duel_rival_challenge', cooldown: 30,
    // 앙숙이 같은 고장에 살 때만 (48단계 도우미2: 다른 고장 앙숙이 눈앞에서 목검을 던지던 것)
    cond: (g) => age(g) >= 13 && !!flag(g, 'rival') && byId(g, flag(g, 'rival'))?.alive && (byId(g, flag(g, 'rival')).place ?? 'ern') === here(g) && !byId(g, flag(g, 'rival')).away && skill(g, 'sword') >= 12,
    chance: () => 0.05, weight: 55,
    prepare: (g) => ({ id: flag(g, 'rival') }),
    title: '앙숙의 도전',
    text: (g, c) => { const p = byId(g, c.id); return `${J(p.name, '이/가')} 사람들 앞에서 목검을 던졌다. 목검이 발치에 떨어져 굴렀다. "언제까지 말로만 할 거냐. 오늘 결판을 내자." 구경꾼들이 둥글게 모여든다.`; },
    choices: [
      { label: '목검을 줍는다', run: (g, rng, c) => { const p = byId(g, c.id); startDuel(g, rng, { kind: 'rival', title: '앙숙과의 결투', foe: { name: p.name, skill: Math.round(10 + skill(g, 'sword') * 0.6 + p.skill * 0.3), style: styleOf(p), id: p.id }, ctx: { id: p.id } }); return `목검을 주웠다. ${p.name}의 눈이 번뜩였다.`; } },
      { label: '무시하고 지나간다', run: (g, rng, c) => { stress(g, 10); const p = byId(g, c.id); p.affection -= 5; return '등 뒤에서 웃음소리가 났다. "역시 겁쟁이." 오래 귀에 남았다.'; } },
    ],
  },
  {
    id: 'duel_school_feud', cooldown: 36,
    cond: (g) => age(g) >= 14 && rankOf(g) >= 0 && here(g) !== 'ern',
    chance: () => 0.04, weight: 50,
    prepare: (g, rng) => ({ school: rng.pick(Object.keys(SCHOOLS).filter((s) => s !== schoolOf(g))) }),
    title: '다른 유파의 도발',
    text: (g, c) => `${SCHOOLS[c.school].name} 문하생 셋이 길을 막았다. "${SCHOOLS[schoolOf(g)].name}? ${SCHOOLS[schoolOf(g)].taunt}" 하나가 앞으로 나선다. "한 판 붙자. 지는 쪽이 유파 이름을 내려놓는 거다."`,
    choices: [
      { label: '받는다', run: (g, rng, c) => { startDuel(g, rng, { kind: 'feud', title: '유파 대결', foe: { name: `${SCHOOLS[c.school].name} 문하생`, skill: Math.round(15 + skill(g, 'sword') * 0.75), style: SCHOOLS[c.school].style }, ctx: { school: c.school } }); return '칼을 뽑았다. 구경꾼들이 길을 비켰다.'; } },
      { label: '"검은 말로 하는 게 아니다."', run: (g) => { gainStat(g, 'wil', 0.4); return '그대로 지나쳤다. 등 뒤에서 야유가 쏟아졌지만, 돌아보지 않았다.'; } },
    ],
  },
  {
    id: 'duel_arena', cooldown: 12,
    cond: (g) => age(g) >= 16 && here(g) === 'leocast' && skill(g, 'sword') >= 30,
    chance: () => 0.12, weight: 55,
    prepare: (g, rng) => { const tier = skill(g, 'sword') >= 70 ? 2 : skill(g, 'sword') >= 50 ? 1 : 0; return { tier, name: [['피 묻은 손 오스카', '자유도시 출신 용병 베아'], ['투기장의 황소 군터', '은가면'], ['챔피언 "무패의" 라이너', '북부에서 온 도끼 하랄']][tier][rng.int(0, 1)] }; },
    title: '투기장',
    text: (g, c) => `왕도 투기장의 호객꾼이 소매를 잡았다. "오늘 밤 ${c.name}의 상대가 빠졌소. 이기면 은화 ${[20, 60, 200][c.tier]}닢. 지면... 뭐, 목검이니 죽지는 않소." 관중석에서 함성이 새어 나온다. 투기장 챔피언은 귀족만큼 유명하다.`,
    choices: [
      { label: '모래판에 선다', run: (g, rng, c) => { startDuel(g, rng, { kind: 'arena', title: '투기장', foe: { name: c.name, skill: [38, 58, 78][c.tier] + rng.int(-4, 6), style: rng.pick(['bold', 'tricky', 'swift', 'steady']) }, ctx: { tier: c.tier } }); return '모래판에 발을 딛자 함성이 쏟아졌다. 수천의 눈이 내려다본다.'; } },
      { label: '구경만 한다', run: (g, rng, c) => { gainStat(g, 'sen', 0.5); return `관중석에서 ${c.name}의 싸움을 보았다. 저 사람들의 발놀림을 머릿속에 새겼다.`; } },
    ],
  },
  {
    id: 'duel_noble_insult', cooldown: 60,
    cond: (g) => age(g) >= 16 && (here(g) === 'leocast' || here(g) === 'verden' || here(g) === 'harfen') && skill(g, 'sword') >= 20,
    chance: () => 0.03, weight: 60,
    title: '장갑',
    text: () => '술집에서 귀족 청년의 옷에 포도주가 튀었다. 내 잘못도 아니었다. 그가 장갑을 벗어 내 얼굴에 던졌다. "결투다. 내일 새벽, 성벽 아래. 진검으로." 결투법상 평민은 귀족에게 결투를 신청할 수 없지만, 귀족이 신청하는 건 막을 수 없다.',
    choices: [
      { label: '새벽에 성벽 아래로 간다', run: (g, rng) => { startDuel(g, rng, { kind: 'noble', title: '새벽의 결투', lethal: true, foe: { name: '귀족 청년', skill: Math.round(25 + rng.int(0, 30)), style: 'bold' } }); return '새벽 안개 속에서 그가 기다리고 있었다. 입회인 둘. 진검이 차갑게 빛났다.'; } },
      { label: '사과하고 무릎을 꿇는다', run: (g) => { stress(g, 20); spend(g, Math.min(money(g), 10)); return '무릎을 꿇고 사과했다. 그는 술값을 내라며 웃었다. 그날 밤, 오래 잠들지 못했다.'; } },
      { label: '그 길로 고장을 뜬다', run: (g) => { setFlag(g, 'fled_duel'); stress(g, 10); return '그날 밤 짐을 쌌다. 결투를 피한 평민. 그 이름은 술집에서 한동안 웃음거리가 되었다.'; } },
    ],
  },
  {
    id: 'duel_old_master', once: true,
    cond: (g) => age(g) >= 18 && skill(g, 'sword') >= 45 && rankOf(g) >= 1,
    chance: () => 0.02, weight: 50,
    title: '은퇴한 검성',
    text: () => '산길의 작은 오두막에서 장작을 패는 노인을 보았다. 도끼질 한 번에 장작이 결을 따라 정확히 둘로 갈린다. 노인이 고개도 들지 않고 말했다. "칼을 오래 쥔 손이군. 며칠 묵어 가겠나? 장작이 많아서."',
    choices: [
      { label: '장작을 패며 묵는다', run: (g) => { gainSkill(g, 'sword', 4, 'wil'); gainStat(g, 'wil', 1.2); setFlag(g, 'old_master_lesson'); return '사흘 동안 장작만 팼다. 나흘째 아침, 노인이 마른 가지로 내 칼을 세 번 쳐냈다. 세 번 다 같은 곳이었다. "네 칼은 생각보다 먼저 움직인다. 반대여야지." 노인은 한때 검성이라 불렸다고, 마을 사람이 나중에 말해 주었다.'; } },
      { label: '정중히 사양한다', run: () => '노인은 어깨를 으쓱하고 다시 도끼를 들었다.' },
    ],
  },
  {
    id: 'duel_reputation', once: true,
    cond: (g) => (g.duelStats?.wins ?? 0) >= 6 && age(g) >= 16,
    chance: () => 0.15, weight: 45,
    title: '이름이 돈다',
    text: (g) => `여관에서 낯선 사람들이 내 이름을 말하는 것을 들었다. "${g.player.name}? 결투에서 여섯 번을 이겼다던데." 이야기는 부풀어 있었다. 한 번은 셋을 상대했다고, 한 번은 맨손이었다고.`,
    choices: [
      { label: '바로잡는다', run: (g) => { gainStat(g, 'cha', 0.5); renown(g, 3); return '"둘은 목검이었소." 사람들은 웃었고, 오히려 더 믿는 눈치였다.'; } },
      { label: '모른 척 술잔을 비운다', run: (g) => { renown(g, 5); return '이름은 내가 없는 곳에서 혼자 걸어 다니기 시작했다. 좋은 일만은 아닐 것이다.'; } },
    ],
  },
  {
    id: 'duel_aura_awakening', once: true,
    cond: (g) => rankOf(g) >= 2 && skill(g, 'sword') >= 72 && g.player.manaAwakened,
    chance: () => 0.06, weight: 60,
    title: '칼날의 떨림',
    text: () => '새벽 수련 중, 휘두른 칼끝에서 낯선 울림이 났다. 몸속 마력이 손목을 타고 칼날로 스며드는 감각. 아주 잠깐, 칼날이 희미하게 빛났다.',
    choices: [
      { label: '그 감각을 붙잡는다', run: (g) => { gainSkill(g, 'sword', 3, 'wil'); g.player.mana += 3; return '같은 동작을 수백 번 되풀이했다. 해가 질 무렵 다시 한 번, 칼이 울었다. 검성의 문턱이 보인다.'; } },
      { label: '두려워 칼을 내려놓는다', run: (g) => { stress(g, 8); return '손이 떨렸다. 그날은 더 휘두르지 않았다.'; } },
    ],
  },
);


// ---------- 결투가 끝났을 때 ----------
registerDuelEnd('rival', (g, rng, won, d) => {
  const p = byId(g, d.ctx.id);
  if (!p) return '';
  if (won) { p.affection += 4; renown(g, 1); remember(g, p, '모두가 보는 앞에서 내게 졌다', -1, { tag: 'rival_duel' }); return `${J(p.name, '은/는')} 흙을 털고 일어나 아무 말 없이 떠났다. 그런데 다음 날, 먼저 인사를 건네 왔다.`; }
  remember(g, p, '모두가 보는 앞에서 나를 이겼다', 1, { tag: 'rival_duel' });
  stress(g, 10);
  return `${J(p.name, '이/가')} 내려다보며 웃었다. "다음에 또 해 줄게." 분했다. 그래서 내일도 검을 휘두를 것이다.`;
});
registerDuelEnd('feud', (g, rng, won, d) => {
  if (won) { renown(g, 2); return `구경꾼들 사이에서 "${SCHOOLS[schoolOf(g)].name}!" 하는 소리가 났다. 문하생들은 동료를 부축해 사라졌다.`; }
  stress(g, 10);
  return `${SCHOOLS[d.ctx.school].name} 문하생들이 웃으며 떠났다. 오늘 일은 그들 도장에서 오래 이야깃거리가 될 것이다.`;
});
registerDuelEnd('arena', (g, rng, won, d) => {
  const prize = [20, 60, 200][d.ctx.tier];
  if (won) { g.player.money += prize; renown(g, [2, 6, 20][d.ctx.tier]); if (d.ctx.tier === 2) setFlag(g, 'arena_champion'); return `함성이 투기장을 뒤흔들었다. 은화 ${prize}닢.${d.ctx.tier === 2 ? ' 새 챔피언의 이름이 왕도에 퍼졌다.' : ' 관중 몇이 내 이름을 외쳤다.'}`; }
  g.player.money += Math.round(prize / 10);
  return `모래 위에 쓰러진 채 야유를 들었다. 위로금으로 은화 ${Math.round(prize / 10)}닢이 던져졌다.`;
});
registerDuelEnd('noble', (g, rng, won, d) => {
  if (won) {
    renown(g, 4); setFlag(g, 'killed_noble_duel', (flag(g, 'killed_noble_duel') ?? 0) + 1);
    if (g.life) g.life.notoriety = (g.life.notoriety ?? 0) + 3;
    return '귀족 청년이 피를 토하며 쓰러졌다. 입회인들이 그를 들고 갔다. 결투는 합법이었다. 하지만 그의 가문은 오늘을 잊지 않을 것이다.';
  }
  return '진검이 몸을 꿰뚫었다. 입회인들이 결투를 멈췄다. 목숨은 건졌지만, 오래 누워 있어야 할 것이다.';
});
registerDuelEnd('wanderer', (g, rng, won, d) => {
  if (won) { setFlag(g, 'won_blade'); g.player.money += 8; return `떠돌이가 검을 풀어 내밀었다. "${d.ctx.school}를 이긴 촌뜨기라. 언젠가 십강 명단에서 네 이름을 보겠군." 검을 팔면 은화 여덟은 받을 것이다.`; }
  gainSkill(g, 'sword', 2.0, 'wil');
  return `떠돌이는 떠나지 않고 사흘을 머물며 ${d.ctx.school}의 기본을 보여 주었다. "지는 법을 아는 놈이 강해진다."`;
});
registerDuelEnd('insult', (g, rng, won, d) => {
  if (won) { gainStat(g, 'cha', 0.8); setFlag(g, 'won_duel'); return '귀족끼리의 결투는 법이 허락한다. 상대의 목검이 흙바닥에 떨어졌다. 그는 얼굴이 새빨개진 채 떠났다. 마을 사람들이 그 이야기를 오래 했다.'; }
  stress(g, 20);
  return '상대는 하르펜 검술 도장에서 배운 솜씨였다. 흙바닥에 엎드린 채 웃음소리를 들었다.';
});
