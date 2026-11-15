// 종족끼리: 편견과 우정, 엘프와 드워프의 앙금, 노예 사냥꾼, 다른 종족과의 혼인, 섞인 혈통 자식, 하프엘프의 삶.
// 그리고 종족끼리의 사이(ties)가 세상에서 오르내린다.
import { EVENTS, flag, setFlag, check, stress, age } from '../events/core.js';
import { me, gainStat, gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { WORLD_TICKS } from '../world.js';
import { makeRng } from '../rng.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { isJailed, addNotoriety } from '../crime.js';
import { byId, ageYears } from '../npc.js';
import { remember } from '../relations.js';
import { realmOf } from '../realms/index.js';
import { raceOf, playerRace, RACES } from '../races/index.js';
import { PS, mi, clamp, LANDS, LAND_IDS, tieKey, RACE_WORD, plog, landAt } from './state.js';
import { shiftStanding } from './life.js';

const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.over;
// 하프엘프는 땅으로는 엘프 쪽에 기댄다
const landOfRace = (r) => (r === 'half_elf' ? 'elf' : LANDS[r] ? r : null);
const base = (r) => (r === 'half_elf' ? 'elf' : r);
export function shiftTie(g, a, b, n) {
  a = base(a); b = base(b);
  if (a === b) return;
  const P = PS(g), k = tieKey(a, b);
  if (P.ties[k] == null) return;
  P.ties[k] = clamp(P.ties[k] + n, -100, 100);
}
const HUMAN_REALMS = ['leonia', 'valhart', 'holy', 'free', 'march'];

/* ---------- 다른 종족과의 우정 ---------- */
const FRIEND_TEXT = {
  elf: (p) => `${J(p.name, '이/가')} 은잎 하나를 내밀었다. 엘프가 벗에게 주는 것이다. "그대는 나보다 먼저 늙을 것이다. 그래도 괜찮다면." 그 말이 고백처럼 무거웠다.`,
  half_elf: (p) => `${J(p.name, '이/가')} 오래 망설이다 말했다. "나는 어느 쪽에서도 반쪽이야. 그런데 너하고 있을 때는 그걸 잊어." 귀 끝이 붉었다.`,
  dwarf: (p) => `${J(p.name, '이/가')} 손바닥에 침을 뱉고 손을 내밀었다. 드워프가 평생의 벗에게 하는 악수다. 이 악수를 받으면 그의 빚이 내 빚이 되고 내 원수가 그의 원수가 된다.`,
  beast: (p) => `${J(p.name, '이/가')} 내 어깨에 이마를 대고 냄새를 맡았다. 수인이 형제로 삼은 이에게만 하는 일이다. "이제 네 냄새를 잊지 않아."`,
  human: (p) => `${J(p.name, '이/가')} 투박하게 웃으며 술잔을 내밀었다. "처음엔 네가 무서웠어. 이제는 아니야." 인간의 우정은 짧고 뜨겁다. 그래서 더 귀하다.`,
};
EVENTS.push({
  id: 'peoples_friend', cooldown: 30, weight: 6,
  chance: () => 0.5,
  cond: (g) => free(g) && g.people.some((p) => p.alive && p.known && !p.isPlayer && raceOf(p) !== playerRace(g) && p.affection >= 35 && (p.place ?? 'ern') === here(g) && !p._raceFriend),
  prepare: (g, rng) => ({ id: rng.pick(g.people.filter((p) => p.alive && p.known && !p.isPlayer && raceOf(p) !== playerRace(g) && p.affection >= 35 && (p.place ?? 'ern') === here(g) && !p._raceFriend)).id }),
  title: '종족을 넘은 벗',
  text: (g, c) => { const p = byId(g, c.id); return p ? (FRIEND_TEXT[raceOf(p)] ?? FRIEND_TEXT.human)(p) : '오래 알던 이가 손을 내밀었다.'; },
  choices: [
    {
      label: '손을 맞잡는다',
      run: (g, rng, c) => {
        const p = byId(g, c.id);
        if (!p) return '손을 내밀었지만 그는 이미 떠난 뒤였다.';
        const P = PS(g);
        p._raceFriend = true; p.affection = Math.min(100, p.affection + 15);
        P.friends += 1;
        remember(g, p, '종족을 넘어 벗이 되었다', 2, { tag: 'race_friend' });
        shiftTie(g, raceOf(p), playerRace(g), 1);
        const k = landOfRace(raceOf(p));
        if (k) shiftStanding(g, k, 4);
        plog(g, `${RACE_WORD[raceOf(p)] ?? '다른 종족'} ${J(p.name, '과/와')} 벗이 되었다.`);
        return `${J(p.name, '과/와')} 나는 그날 밤 늦도록 서로의 고향 이야기를 했다. 그의 고향에서는 내 종족을 뭐라고 부르는지도 들었다. 둘 다 웃었다.`;
      },
    },
    { label: '정중히 거리를 둔다', run: (g, rng, c) => { const p = byId(g, c.id); if (p) { p._raceFriend = true; p.affection -= 5; } return '고맙다고만 했다. 그는 고개를 끄덕였다. 그 뒤로도 인사는 나누지만, 그날 같은 말은 다시 오가지 않았다.'; } },
  ],
});

/* ---------- 엘프와 드워프의 앙금 ---------- */
EVENTS.push({
  id: 'peoples_grudge', cooldown: 40, weight: 5,
  chance: (g) => Math.min(0.6, 0.2 - PS(g).ties['dwarf|elf'] / 100),
  cond: (g) => free(g) && ['serenia', 'leocast', 'barka', 'hammer', 'silverleaf', 'graubel'].includes(here(g)),
  title: '술집의 두 손님',
  text: (g) => `${here(g) === 'hammer' ? '쇠망치 골의 술집' : here(g) === 'silverleaf' ? '은잎 마을의 교역소' : '술집'}에서 엘프 상인과 드워프 대장장이가 맞붙었다. 드워프는 오백 년 전 마신 전쟁 때 엘프가 산의 문을 닫았다고 했고, 엘프는 드워프가 숲의 나무를 화로에 넣었다고 했다. 둘 다 그 자리에 없었던 일이다. 사람들이 나를 쳐다본다.`,
  choices: [
    {
      label: '둘 사이에 끼어 말린다',
      run: (g, rng) => {
        if (check(rng, g.player.stats.cha * 0.6 + g.player.stats.wil * 0.3 + PS(g).friends * 3, 45)) {
          shiftTie(g, 'elf', 'dwarf', 3); shiftStanding(g, 'elf', 2); shiftStanding(g, 'dwarf', 2); L(g).renown = (L(g).renown ?? 0) + 1;
          return '"두 분 다 그 자리에 없었소. 그 자리에 있던 사람들은 같이 싸웠소." 드워프가 먼저 웃음을 터뜨렸다. 엘프는 웃지 않았지만, 드워프의 잔에 술을 따랐다.';
        }
        g.player.injuries.push({ name: '드워프의 술잔에 맞은 이마', months: 1 }); stress(g, 6);
        return '끼어들자마자 날아온 술잔이 내 이마에 맞았다. 엘프와 드워프는 그걸 보고서야 싸움을 멈췄다. 둘이 같이 나를 부축했다.';
      },
    },
    { label: '엘프 편을 든다', run: (g) => { shiftStanding(g, 'elf', 4); shiftStanding(g, 'dwarf', -6); shiftTie(g, 'elf', 'dwarf', -1); return '엘프의 말이 옳다고 했다. 드워프가 탁자를 걷어차고 나갔다. 엘프는 고맙다는 말 대신 고개를 아주 조금 숙였다.'; } },
    { label: '드워프 편을 든다', run: (g) => { shiftStanding(g, 'dwarf', 4); shiftStanding(g, 'elf', -6); shiftTie(g, 'elf', 'dwarf', -1); return '드워프의 어깨를 두드렸다. 드워프가 내 잔을 채웠다. 엘프는 말없이 값을 치르고 나갔다. 엘프는 잊지 않는다.'; } },
    { label: '잔을 비우고 나간다', run: () => '등 뒤에서 의자 부서지는 소리가 났다. 오백 년 묵은 싸움에 내 몫은 없다.' },
  ],
});

/* ---------- 인간 땅의 편견 앞에서 ---------- */
EVENTS.push({
  id: 'peoples_defend', cooldown: 96, weight: 4,
  chance: () => 0.2,
  // 수인이 장터에 드나드는 큰 고장에서만
  cond: (g) => free(g) && playerRace(g) !== 'beast' && HUMAN_REALMS.includes(realmOf(here(g))) && ['leocast', 'harfen', 'barka', 'eisen', 'portel', 'klein', 'graubel'].includes(here(g)),
  title: '장터의 수인 아이',
  text: () => '장터에서 수인 아이 하나가 빵 도둑으로 몰렸다. 빵 장수가 아이의 귀를 잡아끌고, 구경꾼들이 "짐승은 원래 훔친다"며 웃는다. 아이 손에는 아무것도 없다. 진짜 도둑은 아까 인간 소년이었다.',
  choices: [
    {
      label: '아이를 감싼다',
      run: (g, rng) => {
        shiftStanding(g, 'beast', 6); shiftTie(g, 'beast', 'human', 1);
        if (check(rng, g.player.stats.cha * 0.5 + (L(g).renown ?? 0) / 3, 35)) return '빵 장수에게 진짜 도둑의 생김새를 댔다. 구경꾼 몇이 고개를 돌렸다. 아이는 말없이 달아났다. 며칠 뒤 내 문 앞에 들꽃 한 줌이 놓여 있었다.';
        stress(g, 8); addNotoriety(g, 1);
        return '"짐승 편을 드는 걸 보니 같은 부류로군." 빵 장수의 고함에 경비병이 왔다. 아이는 풀려났고, 나는 그날 장터에서 쫓겨났다.';
      },
    },
    { label: '빵값을 대신 치른다', run: (g) => { g.player.money = Math.max(0, g.player.money - 2); shiftStanding(g, 'beast', 2); return '빵값 두 닢을 던져 주었다. 빵 장수는 투덜대며 아이를 놓았다. 아이는 고맙다는 말 없이 나를 노려보고 달아났다. 하지 않은 일의 값을 치러 준 셈이니, 그 눈빛도 옳았다.'; } },
    { label: '모르는 척 지나간다', run: (g) => { stress(g, 3); return '사람들 사이를 빠져나왔다. 등 뒤에서 아이가 울었는지는 모르겠다. 듣지 않으려고 했으니까.'; } },
    { label: '구경꾼들과 함께 웃는다', run: (g) => { shiftStanding(g, 'beast', -8); shiftTie(g, 'beast', 'human', -1); return '나도 웃었다. 웃는 쪽에 서 있으면 편하다. 아이의 눈이 내 얼굴을 기억하는 것 같았다.'; } },
  ],
});

/* ---------- 노예 사냥꾼이 온다 ---------- */
EVENTS.push({
  id: 'peoples_slavers', cooldown: 48, weight: 6,
  chance: () => 0.3,
  cond: (g) => free(g) && ['fur', 'silverleaf'].includes(here(g)),
  title: '사슬 소리',
  text: (g) => `한밤중에 ${here(g) === 'fur' ? '천막 사이로' : '나무 위 집들 아래로'} 사슬 소리가 들렸다. 노예 사냥꾼들이다. 남해로 가는 배가 강 하구에서 기다린다는 소문이 며칠 전부터 돌았다. ${here(g) === 'fur' ? '어린 수인 둘이 벌써 자루에 들어갔다.' : '엘프 아이 하나가 사라졌다.'}`,
  choices: [
    {
      label: '칼을 들고 뒤쫓는다',
      run: (g, rng) => {
        const k = landAt(here(g));
        if (check(rng, playerPower(g), 45)) {
          shiftStanding(g, k, 12); L(g).renown = (L(g).renown ?? 0) + 3; g.player.money += rng.int(5, 15);
          shiftTie(g, LANDS[k].race, 'human', playerRace(g) === 'human' ? 2 : 0);
          chron(g, `${LANDS[k].name}의 어귀에서 노예 사냥꾼 한 무리가 쫓겨나다. ${J(g.player.name, '이/가')} 앞장섰다고 한다.`, 80);
          return '강 하구까지 쫓아가 사냥꾼들을 덮쳤다. 자루를 풀자 아이들이 쏟아져 나왔다. 사냥꾼 하나가 남긴 장부에 레오니아 귀족의 문장이 찍혀 있었다.';
        }
        g.player.injuries.push({ name: '사냥꾼의 쇠뇌에 맞은 어깨', months: 2 }); stress(g, 10); shiftStanding(g, k, 4);
        return '어둠 속에서 쇠뇌 살이 어깨를 꿰뚫었다. 배는 떠났다. 그래도 내가 뒤쫓은 것을 이 땅 사람들은 보았다.';
      },
    },
    {
      label: '사람들을 깨워 숨긴다',
      run: (g, rng) => {
        const k = landAt(here(g));
        shiftStanding(g, k, check(rng, g.player.stats.sen * 0.6 + g.player.stats.agi * 0.3, 40) ? 7 : 3);
        return '천막과 집을 돌며 사람들을 깨웠다. 아이들을 굴과 나무 구멍에 숨겼다. 사냥꾼들은 새벽까지 헤매다 빈손으로 물러났다. 이미 잡힌 아이들은 찾지 못했다.';
      },
    },
    { label: '문을 걸고 숨는다', run: (g) => { stress(g, 8); shiftStanding(g, landAt(here(g)), -3); return '문을 걸고 이불을 뒤집어썼다. 아침에 이웃들이 나를 보는 눈이 차가웠다. 외지인은 결국 외지인이라는 눈이었다.'; } },
  ],
});

/* ---------- 다른 종족과의 혼인 ---------- */
EVENTS.push({
  id: 'peoples_mixed_marriage', cooldown: 0, weight: 7,
  cond: (g) => {
    const s = byId(g, me(g).spouseId);
    return free(g) && !!s?.alive && raceOf(s) !== playerRace(g) && !flag(g, `mixed_wed_${s.id}`);
  },
  prepare: (g) => ({ id: me(g).spouseId }),
  title: '두 집안, 두 풍습',
  text: (g, c) => {
    const s = byId(g, c.id);
    const r = raceOf(s);
    const word = { elf: '엘프 쪽에서는 혼인의 맹세를 세계수 아래에서 백 년마다 다시 하라고 한다.', half_elf: '반쪽 엘프인 짝의 엘프 쪽 친척은 소식도 없고, 인간 쪽 친척은 아이 귀를 걱정한다.', dwarf: '드워프 쪽에서는 혼인 잔치에 조상의 화로를 옮겨 와야 한다고 한다. 화로는 마차 두 대 무게다.', beast: '수인 쪽에서는 신랑과 신부가 원 안에서 한 번 겨뤄야 부부로 인정한다고 한다.', human: '인간 쪽에서는 사제 앞에서 맹세해야 한다고 하고, 사제는 내 귀와 손을 오래 들여다보았다.' }[r] ?? '';
    return `${J(s.name, '과/와')} 혼인한 것을 두고 양쪽 사람들이 말이 많다. ${word} 마을 사람들은 둘 사이의 아이가 어떤 얼굴일지 내기를 한다.`;
  },
  choices: [
    { label: '짝의 풍습을 따른다', run: (g, rng, c) => { const s = byId(g, c.id); setFlag(g, `mixed_wed_${c.id}`); if (s) s.affection = Math.min(100, s.affection + 10); const k = landOfRace(raceOf(s)); if (k) shiftStanding(g, k, 8); shiftTie(g, raceOf(s), playerRace(g), 1); return '짝의 고향 풍습대로 한 번 더 혼례를 치렀다. 서툴렀다. 짝의 친척 하나가 끝나고 내 손을 잡았다. "이제 됐네."'; } },
    { label: '내 풍습대로 한다', run: (g, rng, c) => { const s = byId(g, c.id); setFlag(g, `mixed_wed_${c.id}`); if (s) s.affection -= 4; return '우리 식대로 했다. 짝은 웃었지만, 밤에 혼자 고향 쪽 하늘을 오래 보았다.'; } },
    { label: '둘 다 섞어 새로 만든다', run: (g, rng, c) => { const s = byId(g, c.id); setFlag(g, `mixed_wed_${c.id}`); if (s) s.affection = Math.min(100, s.affection + 6); stress(g, -6); note(g, '두 종족의 풍습을 섞어 우리만의 혼례를 치렀다.'); return '두 풍습을 반씩 섞었다. 양쪽 어른들이 모두 얼굴을 찌푸렸다. 아이들은 신이 나서 춤을 췄다. 그날 밤 우리는 많이 웃었다.'; } },
  ],
});

/* ---------- 섞인 혈통 자식 ---------- */
const mixedKids = (g) => {
  const meP = me(g), P = PS(g);
  return (meP.childIds ?? []).map((id) => byId(g, id)).filter((c) => {
    if (!c?.alive || P.heritage[c.id]) return false;
    const a = ageYears(c);
    if (a < 10 || a > 17) return false;
    const other = byId(g, c.motherId === meP.id ? c.fatherId : c.motherId) ?? byId(g, meP.spouseId);
    return raceOf(c) === 'half_elf' || raceOf(c) !== raceOf(meP) || (other && raceOf(other) !== raceOf(meP));
  });
};
EVENTS.push({
  id: 'peoples_mixed_child', cooldown: 24, weight: 8,
  cond: (g) => isAdult(g) && !g.over && mixedKids(g).length > 0,
  prepare: (g) => ({ id: mixedKids(g)[0].id }),
  title: '나는 누구예요',
  text: (g, c) => {
    const k = byId(g, c.id);
    const r = raceOf(k);
    const what = { half_elf: '귀가 뾰족하다고 놀림받았다. 엘프 아이들은 귀가 덜 뾰족하다고 놀렸다고 한다.', elf: '인간 아이들 사이에서 혼자 자라지 않는다고 놀림받았다.', dwarf: '키가 작다고, 수염이 벌써 난다고 놀림받았다.', beast: '꼬리를 잡아당기는 아이들과 싸우고 돌아왔다.', human: '반쪽 핏줄인데 왜 아무것도 물려받지 못했느냐는 말을 들었다.' }[r] ?? '';
    return `${J(k.name, '이/가')} 저녁상 앞에서 숟가락을 놓았다. 오늘 ${what} "나는 누구예요? 어느 쪽 사람이에요?" ${ageYears(k)}살 아이의 눈이 나를 똑바로 본다.`;
  },
  choices: [
    {
      label: '네 안에 둘 다 있다고 말해 준다',
      run: (g, rng, c) => { const k = byId(g, c.id); PS(g).heritage[c.id] = 'both'; if (k) { k.affection = Math.min(100, k.affection + 8); remember(g, k, '어느 쪽도 버리지 않아도 된다고 말해 주었다', 2, { tag: 'heritage' }); } return '"너는 반쪽이 아니야. 두 배야." 아이는 그 말을 믿지 않는 얼굴이었다. 그래도 그날 밤 내 곁에서 잠들었다. 그 말을 믿게 되는 데는 몇 해가 더 걸릴 것이다.'; },
    },
    {
      label: '그 피의 고향에 한 철 보낸다',
      show: (g, c) => { const k = byId(g, c.id); return !!k && raceOf(k) !== 'human' && g.player.money >= 15; },
      run: (g, rng, c) => {
        const k = byId(g, c.id);
        const land = landOfRace(raceOf(k));
        g.player.money -= 15;
        PS(g).heritage[c.id] = 'land';
        if (k) { k.affection = Math.min(100, k.affection + 4); if (land) { k.skills ??= {}; } }
        if (land) shiftStanding(g, land, 5);
        return `${land ? LANDS[land].name : '그 피의 고향'}에 아이를 보냈다. 석 달 뒤 돌아온 아이는 ${land === 'elf' ? '말수가 줄고 노래를 흥얼거렸다' : land === 'dwarf' ? '손에 굳은살이 박이고 화로 앞을 떠나지 않았다' : '어깨가 넓어지고 냄새로 사람을 알아보았다'}. "거기서도 나는 반쪽이래요. 그래도 거기 사람들은 나를 반쪽이라고 부르면서 밥을 줬어요."`;
      },
    },
    {
      label: '우리 쪽으로 키운다',
      run: (g, rng, c) => { const k = byId(g, c.id); PS(g).heritage[c.id] = 'own'; if (k) k.affection -= 3; return '"너는 우리 집 아이다. 그것만 알면 돼." 아이는 고개를 끄덕였다. 그 뒤로 다시 묻지 않았다. 묻지 않는다고 궁금하지 않은 건 아니다.'; },
    },
    {
      label: '스스로 찾게 둔다',
      run: (g, rng, c) => { const k = byId(g, c.id); PS(g).heritage[c.id] = 'free'; if (k) { gainStat(g, 'wil', 0.3); k.traits = [...new Set([...(k.traits ?? []), rng.chance(0.5) ? 'brave' : 'reserved'])]; } return '"그건 내가 정해 줄 수 없어. 네가 찾아야 해." 아이는 실망한 얼굴이었다. 몇 해 뒤, 그 아이가 제 손으로 찾은 대답은 내가 해 줄 수 있던 어떤 대답보다 단단했다.'; },
    },
  ],
});

/* ---------- 하프엘프의 삶 ---------- */
EVENTS.push({
  id: 'peoples_halfelf', cooldown: 72, weight: 5,
  chance: () => 0.35,
  cond: (g) => free(g) && playerRace(g) === 'half_elf' && ['serenia', 'silverleaf', 'barka', 'leocast'].includes(here(g)) && age(g) >= 18,
  title: '경계의 사람들',
  text: () => '골목 끝 낡은 찻집에 귀 끝을 머리카락으로 가린 사람들이 모인다. 모두 하프엘프다. 가장 나이 많은 이는 이백 살이 넘었고, 막내는 열여섯이다. 누구는 인간의 이름을, 누구는 엘프의 이름을 쓴다. 둘 다 쓰는 사람은 없다. 문 앞의 노인이 나를 보고 말했다. "들어오게. 여기서는 아무도 반쪽이 아니야."',
  choices: [
    {
      label: '자리에 앉는다',
      run: (g, rng) => {
        const P = PS(g); P.friends += 1; stress(g, -12);
        setFlag(g, 'halfelf_circle');
        const w = gainStat(g, 'wil', 0.5);
        plog(g, '경계의 사람들 모임에 들었다.');
        return `밤새 이야기를 들었다. 인간 아내를 먼저 보낸 사람, 엘프 아버지에게 한 번도 이름을 불리지 못한 사람, 두 이름 사이에서 아무 이름도 고르지 못한 사람. 새벽에 처음으로 내 이야기를 했다. 아무도 놀라지 않았다.${w > 0.04 ? ` (의지 +${w.toFixed(1)})` : ''}`;
      },
    },
    { label: '고개만 숙이고 지나간다', run: (g) => { stress(g, 4); return '나는 반쪽이라는 것을 남과 나누고 싶지 않았다. 그래도 그 찻집의 위치는 잊지 않았다.'; } },
  ],
});
EVENTS.push({
  id: 'peoples_halfelf_years', cooldown: 0, weight: 6,
  cond: (g) => free(g) && playerRace(g) === 'half_elf' && age(g) >= 60 && !flag(g, 'halfelf_years'),
  title: '같은 얼굴',
  text: (g) => `거울 속 얼굴은 서른 무렵에서 멈춰 있다. 어릴 적 친구들은 대부분 무덤에 있고, 남은 이들은 지팡이를 짚는다. 장터에서 ${age(g)}살이라고 하자 상인이 웃었다. 엘프의 숲은 여전히 나를 반쪽 손님이라 부른다.`,
  choices: [
    { label: '엘프의 숲으로 간다', run: (g) => { setFlag(g, 'halfelf_years'); shiftStanding(g, 'elf', 8); return '은잎 마을로 가는 짐을 쌌다. 엘프들 사이에서라면 적어도 늙지 않는 것이 이상하지 않다. 반쪽이라는 것만 빼면.'; } },
    { label: '인간들 곁에 남는다', run: (g) => { setFlag(g, 'halfelf_years'); stress(g, -4); gainSkill(g, 'letters', 1, 'int'); return '남기로 했다. 내가 아는 사람들의 손주들이 자라는 것을 지켜볼 것이다. 그들의 할아버지 이야기를 해 줄 수 있는 사람은 이제 나뿐이다.'; } },
  ],
});

/* ---------- 세상의 흐름: 종족끼리의 사이 ---------- */
WORLD_TICKS.push((g, worldRng, say, record) => {
  const P = g.peoples;
  if (!P) return;
  // 제 주사위를 따로 쓴다: 세상의 다른 흐름이 굴리는 주사위 순서를 흔들지 않도록
  const rng = makeRng({ s: ((g.rngState?.s ?? 1) ^ Math.imul(mi(g), 2654435761)) | 0 });
  const T0 = { 'dwarf|elf': -25, 'beast|human': -30, 'elf|human': -10, 'dwarf|human': 10, 'beast|elf': 15, 'beast|dwarf': 0 };
  // 다른 세상 값이 흔든다: 성광국이 마탑과 날을 세우면 이종족에게도, 전쟁 중이면 수인 강경파가
  const holyFury = (g.tower?.friction ?? 30) >= 60 ? -8 : 0;
  for (const k of Object.keys(T0)) {
    const target = T0[k] + (k.includes('human') ? holyFury : 0);
    const before = P.ties[k];
    P.ties[k] = clamp(before + (target - before) * 0.015 + rng.normal(0, 0.5), -100, 100);
    const [a, b] = k.split('|');
    if (before > -45 && P.ties[k] <= -45 && rng.chance(0.6)) { say(`${J(RACE_WORD[a], '과/와')} ${RACE_WORD[b]} 사이가 험악해졌다. 교역로에서 칼부림이 났다는 소문이다.`, true); record(`${RACE_WORD[a]}·${RACE_WORD[b]} 사이가 틀어지다`); }
    if (before < 30 && P.ties[k] >= 30 && rng.chance(0.6)) { say(`${J(RACE_WORD[a], '과/와')} ${J(RACE_WORD[b], '이/가')} 오랜만에 교역 맹약을 새로 맺었다.`); record(`${RACE_WORD[a]}·${RACE_WORD[b]} 교역 맹약`); }
  }
  // 그 땅의 큰 날들 (이야기거리로만)
  if (g.date.month === 4 && g.date.year % 100 === 0) { say('엘프 왕국에서 백 년에 한 번 세계수가 꽃을 피웠다. 은잎 마을에 외지인이 몰린다.', true); record('세계수가 꽃을 피우다'); }
  if (g.date.month === 8 && g.date.year % 7 === 0 && rng.chance(0.8)) say('수인 부족들이 털가죽 시장에 모여 일곱 해 만의 대모임을 열었다. 대족장 자리를 노리는 전사들이 몰려든다.');
  if (g.date.month === 6 && rng.chance(0.04)) say(rng.pick(['쇠망치 골에서 새 명장이 났다. 그의 첫 칼은 발하르트 황실이 금화 삼백 닢에 샀다.', '드워프 장인 길드가 철문 너머 깊은 갱도 하나를 봉했다. 이유는 말하지 않았다.']));
});

void LAND_IDS; void RACES;
