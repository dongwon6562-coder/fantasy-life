// 검을 깊게 (43단계): 초식 익히기, 비전, 검기 수련, 승급 뒤의 의식, 이름난 검객에게 도전, 내 유파 세우기와 도장, 마검사.
// 유파 데이터와 결투 안의 효과는 schools.js·duel.js, 세상 쪽 흐름은 hall.js.
import { ACTIONS } from '../actions.js';
import { playerAge, gainSkill, gainStat, circleOf } from '../game.js';
import { byId } from '../npc.js';
import { remember } from '../relations.js';
import { L, defineScene, queueScene, sceneQueued, check, tired, stress, gains, up } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { atHere, legend } from '../legends/state.js';
import { J } from '../narrative/text.js';
import { ENDS, queueDuel, registerDuelEnd } from './registry.js';
import {
  SCHOOLS, RANKS, swordState, hallState, schoolOf, rankOf, schoolName, rankName, myMaster, formById, bladeSpell, BLADE_WORDS, AURA_WORDS,
} from './schools.js';
import { mi, placeName, famousName, logH } from './hall.js';

const here = (g) => L(g).place;
const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
const sk = (g) => g.player.skills.sword ?? 0;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const chron = (g, text, rel = 100) => g.chronicle.push({ y: g.date.year, m: g.date.month, text, rel });
// 도시와 큰 고장: 유파를 세울 만한 곳
const HALL_PLACES = ['harfen', 'verden', 'leocast', 'eisen', 'solaris', 'barka', 'portel', 'graubel', 'hammer', 'silverleaf', 'fur', 'saltmare', 'serenia', 'klein', 'gruental', 'ern'];

// 내 유파에서 다음으로 배울 초식
export function nextForm(g) {
  const s = swordState(g), sc = SCHOOLS[schoolOf(g)];
  if (!sc) return null;
  return sc.forms.find((f) => !s.forms.includes(f.id)) ?? null;
}
const allForms = (g) => { const sc = SCHOOLS[schoolOf(g)]; return !!sc && sc.forms.every((f) => g.sword.forms.includes(f.id)); };
// 여기 있는 이름난 검객 (검왕 레온은 legends 쪽 사람)
export function famousHere(g) {
  return hallState(g).famous.filter((f) => f.alive && f.place === here(g));
}
const challengeable = (g) => famousHere(g).filter((f) => mi(g) - f.lastAt >= 12);
const leonHere = (g) => rankOf(g) >= 3 && atHere(g, 'leon') && mi(g) - (swordState(g).leonAt ?? -99) >= 24;

ACTIONS.push(
  {
    id: 'sw_form', name: '초식을 배운다', icon: 'sword',
    desc: '스승에게 유파의 초식 하나를 배운다. 초식을 익히면 결투에서 그 수가 날카로워지고 이름이 붙는다. 석 달에 하나.',
    available: (g) => free(g) && rankOf(g) >= 0 && !!myMaster(g) && !!nextForm(g) && sk(g) >= nextForm(g).need && mi(g) - swordState(g).formAt >= 3,
    run(g, rng) {
      const s = swordState(g), f = nextForm(g), m = myMaster(g);
      if (!f || !m) return '스승이 자리에 없어 혼자 형을 되짚었다.';
      s.forms.push(f.id); s.formAt = mi(g);
      tired(g, 12);
      const k = gainSkill(g, 'sword', 1.2, SCHOOLS[schoolOf(g)].stat);
      const p = byId(g, m.id); if (p) p.affection += 1;
      return `${m.who} ${J(m.name, '이/가')} ${schoolName(g)}의 초식 ${J(f.name, '을/를')} 보여 주었다. ${f.desc} 몸에 붙을 때까지 해가 두 번 졌다.${gains([up('검술', k)])}`;
    },
  },
  {
    id: 'sw_secret', name: '비전을 청한다', icon: 'shield',
    desc: '초식 넷을 다 익힌 검성이 스승에게 유파의 비전을 청한다. 스승은 시험을 낸다.',
    available: (g) => free(g) && rankOf(g) >= 3 && allForms(g) && !swordState(g).secret && !!myMaster(g) && !sceneQueued(g, 'sw_secret') && !g.duelQueued && mi(g) - (swordState(g).secretAt ?? -99) >= 6,
    run(g) {
      swordState(g).secretAt = mi(g);
      queueScene(g, 'sw_secret', {}, { first: true });
      return `${J(myMaster(g)?.name ?? '스승', '을/를')} 찾아가 무릎을 꿇었다.`;
    },
  },
  {
    id: 'sw_aura', name: '검기를 다듬는다', icon: 'sword',
    desc: '칼에 기운을 싣는 수련. 상급부터 마력이 있거나 의지가 굳은 사람만 시작할 수 있고, 검성·검왕이 되어야 끝에 닿는다.',
    available: (g) => free(g) && rankOf(g) >= 2 && (g.player.manaAwakened || g.player.stats.wil >= 75) && swordState(g).aura < 3 && playerAge(g) >= 16,
    run(g, rng) {
      const s = swordState(g);
      tired(g, 15);
      s.auraP += 4 + sk(g) / 25 + (g.player.manaAwakened ? 2 : 0) + g.player.stats.wil / 50;
      const before = s.aura;
      if (s.aura < 1 && s.auraP >= 30) s.aura = 1;
      if (s.aura < 2 && s.auraP >= 100 && rankOf(g) >= 3) s.aura = 2;
      if (s.aura < 3 && s.auraP >= 220 && rankOf(g) >= 4) s.aura = 3;
      const k = gainSkill(g, 'sword', 0.5, 'wil');
      if (s.aura > before) {
        if (s.aura === 3) chron(g, `${J(g.player.name, '이/가')} 검기를 칼 밖으로 날렸다. 세 걸음 앞 바위에 금이 갔다.`, 100);
        return [
          '', '새벽에 휘두른 칼끝이 낮게 울었다. 손목을 타고 무언가가 칼날로 흘러 들어갔다가 흩어졌다. 처음이었다.',
          '칼날에 옅은 빛이 머물렀다. 숨 세 번 동안. 목검으로는 닿지 않는 자리에 닿았다. 검기다.',
          '칼을 휘두르지 않았는데 세 걸음 앞 바위에 금이 갔다. 칼에 실은 기운이 칼 밖으로 나갔다. 이런 사람은 대륙에 몇 없다.',
        ][s.aura] + gains([up('검술', k)]);
      }
      const stuck = s.aura >= 1 && rankOf(g) < 3 ? ' 칼은 울지만 더 나아가지 않는다. 검성의 문턱을 넘어야 할 것 같다.' : s.aura >= 2 && rankOf(g) < 4 ? ' 빛은 칼날에 머물 뿐, 그 밖으로 나가지 않는다.' : '';
      return `${rng.pick(['눈을 감고 칼을 쥔 채 한나절을 섰다. 숨이 칼끝까지 닿는 것 같다가 끊겼다.', '같은 베기를 천 번. 칼날이 몇 번 떨렸다.', '물 위에 뜬 잎을 칼바람만으로 가르려 했다. 잎은 흔들리기만 했다.'])}${stuck}${gains([up('검술', k)])}`;
    },
  },
  {
    id: 'sw_challenge', name: '이름난 검객에게 도전한다', icon: 'shield',
    desc: '이 고장에 머무는 이름난 검객에게 겨루기를 청한다. 이기면 이름이 퍼지고, 상대 유파의 초식 하나를 몸으로 배울 수도 있다.',
    available: (g) => free(g) && playerAge(g) >= 16 && rankOf(g) >= 1 && !g.duelQueued && (challengeable(g).length > 0 || leonHere(g)),
    run(g, rng) {
      if (g.duelQueued) return '이번 달에는 이미 잡힌 대련이 있다.';
      if (leonHere(g) && (rankOf(g) >= 4 || !challengeable(g).length || rng.chance(0.3))) {
        const x = legend(g, 'leon');
        swordState(g).leonAt = mi(g);
        queueDuel(g, {
          kind: 'sw_famous', title: '검왕과의 겨루기',
          intro: `${J(x.name, '이/가')} 칼집째로 칼을 들었다. "검성이라. 나를 넘어설 사람을 오래 기다렸다. 실망시키지 마라."`,
          foe: { name: `검왕 ${x.name}`, skill: 96, style: 'bold', aura: true }, ctx: { leon: true },
        });
        return `검왕 ${J(x.name, '을/를')} 찾아가 겨루기를 청했다. 그는 웃지도 않았다.`;
      }
      const f = rng.pick(challengeable(g));
      if (!f) return '찾아갔지만 그 검객은 벌써 길을 떠난 뒤였다.';
      f.lastAt = mi(g);
      const sc = SCHOOLS[f.school];
      queueDuel(g, {
        kind: 'sw_famous', title: `${sc.name}의 이름난 검객`,
        intro: `${J(famousName(f), '이/가')} ${sc.weapon ? J(sc.weapon, '을/를') : '칼을'} 들었다. ${f.blade ? '칼날에 희미하게 주문의 빛이 감돈다. 마검사다. ' : ''}${sc.motto}`,
        foe: { name: famousName(f), skill: Math.round(f.skill), style: sc.style, aura: f.skill >= 85, circle: f.blade ? 2 : 0 }, ctx: { fid: f.id },
      });
      return `${placeName(f.place)}에 머무는 ${J(famousName(f), '을/를')} 찾아가 겨루기를 청했다.`;
    },
  },
  {
    id: 'sw_found', name: '내 유파를 세운다', icon: 'house',
    desc: '검성이 된 사람은 제 이름으로 유파를 세울 수 있다. 도장을 얻을 은화 100닢과 이름값이 있어야 한다. 세운 유파는 대를 넘어 남는다.',
    available: (g) => {
      const o = hallState(g).own;
      return free(g) && rankOf(g) >= 3 && playerAge(g) >= 28 && (L(g).renown ?? 0) >= 20 && g.player.money >= 100 && (!o || o.closed) && HALL_PLACES.includes(here(g)) && !sceneQueued(g, 'sw_found');
    },
    run(g) { queueScene(g, 'sw_found', {}, { first: true }); return `${placeName(here(g))}의 빈 창고 하나를 오래 바라보았다. 마루를 깔면 도장이 될 것이다.`; },
  },
  {
    id: 'sw_hall', name: '내 도장에서 가르친다', icon: 'sword',
    desc: '내가 세운 유파의 문하생들을 가르친다. 문하생이 늘면 수업료가 들어오고 유파의 이름이 퍼진다.',
    available: (g) => { const o = hallState(g).own; return free(g) && !!o && o.mine && !o.closed && o.place === here(g); },
    run(g, rng) {
      const o = hallState(g).own;
      tired(g, 12);
      const fee = Math.round(Math.min(40, o.pupils * 1.5));
      g.player.money += fee;
      o.fame = Math.min(100, o.fame + 1 + o.pupils / 10);
      if (rng.chance(0.25)) o.pupils += 1;
      const k = gainSkill(g, 'sword', 0.4, 'wil');
      return `${rng.pick([o.pupils >= 5 ? `문하생 ${o.pupils}명을 마루에 세우고 같은 형을 백 번 시켰다. 셋이 쓰러졌다.` : `문하생 ${o.pupils}명과 마루를 닦고 같은 형을 백 번 했다.`, '맨 앞줄 아이가 내 버릇까지 흉내 낸다. 웃음이 났다.', '처음 온 문하생이 목검을 거꾸로 쥐었다. 나도 그랬다.'])} 수업료 은화 ${fee}닢.${gains([up('검술', k)])}`;
    },
  },
  {
    id: 'sw_blade', name: '마검을 닦는다', icon: 'magic',
    desc: '칼에 주문을 싣는 수련. 상급 이상의 검과 2서클 이상의 마법을 둘 다 가진 사람만 시작할 수 있다. 마검사는 아주 드물다.',
    available: (g) => free(g) && rankOf(g) >= 2 && circleOf(g) >= 2 && !!bladeSpell(g) && swordState(g).blade < 3,
    run(g, rng) {
      const s = swordState(g), bs = bladeSpell(g);
      tired(g, 18);
      s.bladeP += 3 + Math.min(sk(g), g.player.skills.magic ?? 0) / 20;
      const before = s.blade;
      if (s.blade < 1 && s.bladeP >= 60) s.blade = 1;
      if (s.blade < 2 && s.bladeP >= 160 && rankOf(g) >= 3 && circleOf(g) >= 3) s.blade = 2;
      if (s.blade < 3 && s.bladeP >= 300 && rankOf(g) >= 4 && circleOf(g) >= 4) s.blade = 3;
      const k1 = gainSkill(g, 'sword', 0.4, 'agi'), k2 = gainSkill(g, 'magic', 0.4, 'int');
      if (s.blade > before) {
        if (s.blade >= 2) chron(g, `${placeName(here(g))}에 칼과 주문을 함께 쓰는 사람이 났다. ${J(g.player.name, '이/가')} ${BLADE_WORDS[s.blade]} 소리를 듣는다.`, 100);
        if (s.blade >= 2) deed(g, 'brave', 2, '칼에 주문을 싣는 사람이라더라.');
        return `${['', `칼을 휘두르는 그 순간에 ${J(bs.name, '을/를')} 영창했다. 칼날이 한 번 빛났다. 주문이 칼을 따라 날아갔다.`, `영창과 베기가 한 숨에 이어졌다. ${J(bs.name, '이/가')} 칼날에 붙어 떨어지지 않는다. 마검사. 검사들은 마법사라 부르고, 마법사들은 검사라 부를 것이다.`, '칼이 주문이고 주문이 칼이다. 어느 쪽이 먼저인지 나도 모르게 되었다.'][s.blade]}${gains([up('검술', k1), up('마법', k2)])}`;
      }
      const why = s.blade >= 1 && (rankOf(g) < 3 || circleOf(g) < 3) ? ' 칼과 주문이 아직 서로를 밀어낸다. 둘 다 한 단계 더 올라야 할 것 같다.' : '';
      return `${rng.pick([`베는 동시에 ${J(bs.name, '을/를')} 실으려다 영창이 끊겼다.`, '주문을 외는 사이 칼끝이 흔들렸다. 둘을 한 번에 하는 건 두 배가 아니라 열 배 어렵다.', '칼날에 마력을 흘리다 손바닥을 데었다.'])}${why}${gains([up('검술', k1), up('마법', k2)])}`;
    },
  },
);

/* ---------- 장면 ---------- */
defineScene('sw_secret', {
  need: (g) => !!myMaster(g) && rankOf(g) >= 3 && !swordState(g).secret,
  title: () => '비전',
  text: (g) => { const m = myMaster(g), sc = SCHOOLS[schoolOf(g)]; return `${J(m.name, '은/는')} 한참 말이 없었다. "${J(sc.secret.name, '은/는')} 글로 남기지 않는다. 내가 받은 대로만 준다. 두 길이 있다. 사흘 밤낮 혼자 형을 펼치며 그것이 오기를 기다리든지, 나와 진검으로 마주 서든지."`; },
  choices: () => [{ label: '사흘 밤낮 형을 펼친다', key: 'vigil' }, { label: '진검으로 마주 선다', key: 'duel' }, { label: '아직 이르다', key: 'wait' }],
  resolve(g, rng, s, key) {
    const st = swordState(g), sc = SCHOOLS[schoolOf(g)], m = myMaster(g);
    if (key === 'wait') return '"그래, 칼이 먼저 알 것이다." 스승은 차를 따랐다.';
    if (key === 'duel') {
      queueDuel(g, { kind: 'sw_secret', title: '비전의 시험', intro: `${J(m.name, '이/가')} 진검을 뽑았다. "봐주지 않는다. 비전은 이긴 사람에게만 보인다."`, foe: { name: m.name, skill: Math.max(85, Math.round(m.skill)), style: sc.style, aura: true }, ctx: {} });
      return '스승을 따라 도장 마당으로 나갔다.';
    }
    tired(g, 30); stress(g, 10);
    if (check(rng, sk(g) * 0.6 + g.player.stats.wil * 0.5, 75)) return learnSecret(g, '사흘째 새벽, 수천 번 펼친 형이 저 혼자 하나로 이어졌다.');
    return '사흘 밤낮을 버텼지만 형은 형으로 남았다. 스승은 쓰러진 나를 업어 방에 눕혔다. "반년 뒤에 다시 와라."';
  },
});
function learnSecret(g, head) {
  const st = swordState(g), sc = SCHOOLS[schoolOf(g)];
  st.secret = true;
  renown(g, 10);
  chron(g, `${J(g.player.name, '이/가')} ${schoolName(g)}의 비전 ${J(sc.secret.name, '을/를')} 이었다.`, 100);
  return `${head} ${sc.secret.desc} 스승이 고개를 숙였다. "이제 ${J(sc.secret.name, '은/는')} 네 것이다."`;
}
registerDuelEnd('sw_secret', (g, rng, won) => (won ? learnSecret(g, '스승의 칼이 내 칼에 밀려 처음으로 반 뼘 물러섰다. 그 반 뼘 사이로 무언가가 보였다.') : '"아직 보이지 않는군." 스승이 칼을 거두었다. "반년 뒤에."'));

// 승급 뒤의 의식: 유파마다 다르다
const RITE = {
  yusu: '기사단 예배당에서 새 띠를 받았다. 흰 띠 끝에 물결 무늬가 한 줄 늘었다.',
  ganggeom: '도장 사람들이 통나무 하나를 세웠다. 한 칼에 쪼개야 새 등급을 부를 수 있다. 쪼갰다.',
  hwanyeong: '의식은 없었다. 스승이 밤에 찾아와 문간에 새 칼 한 자루를 놓고 갔다. 칼집에 이름이 새겨져 있었다.',
  seonghwi: '성당 제단 앞에서 맹세를 다시 외웠다. 사제가 칼등에 성수를 뿌렸다.',
  moru: '대장간 모루 위에 내 도끼를 올려놓자 사범이 망치로 세 번 두드렸다. 드워프 방식으로는 그게 축하다.',
  ipsae: '숲의 가장 오래된 나무 아래서 두 칼을 엇걸었다. 엘프들이 낮게 노래를 불렀다.',
  balto: '부족 사람들이 둥글게 앉아 발을 굴렀다. 족장이 내 손등에 발톱 자국 같은 문신을 하나 그렸다.',
  mulgyeol: '배 위에서 럼주 한 잔을 바다에 붓고, 한 잔은 내가 마셨다. 선원들이 돛대를 두드렸다.',
};
defineScene('sw_rite', {
  need: (g, s) => rankOf(g) >= s.rank && !!SCHOOLS[schoolOf(g)],
  title: (g, s) => `${RANKS[s.rank]}의 날`,
  text: (g, s) => `${g.sword.house ? '집안 도장 마루에 식구와 문하생이 모였다.' : RITE[schoolOf(g)]} 오늘부터 ${rankName(g)}이다.`,
  choices: (g, s) => [
    { label: '스승께 절하고 술을 따른다', key: 'bow' },
    { label: '모인 사람들 앞에서 형을 펼친다', key: 'show' },
    { label: '혼자 칼을 닦으며 지난날을 떠올린다', key: 'alone' },
    ...(s.rank >= 3 && g.player.money >= 30 ? [{ label: '이름 있는 대장장이에게 새 칼을 맞춘다 (은화 30)', key: 'blade' }] : []),
  ],
  resolve(g, rng, s, key) {
    if (key === 'bow') { const p = byId(g, g.sword.master); if (p) { p.affection += 5; remember(g, p, `${RANKS[s.rank]}이 되던 날 술을 따랐다`, 1, { tag: 'rite' }); } gainStat(g, 'wil', 0.4); return '스승이 잔을 비우고 한마디만 했다. "여기서 멈추지 마라."'; }
    if (key === 'show') { renown(g, 2 + s.rank); return '형이 끝나자 마루가 조용했다가 박수가 터졌다. 어린 문하생 하나가 눈을 빛냈다.'; }
    if (key === 'blade') { if (g.player.money < 30) return '대장장이가 값을 불렀다. 주머니를 뒤져 보고 다음으로 미뤘다.'; g.player.money -= 30; if (g.life?.gear) g.life.gear.weapon = Math.max(g.life.gear.weapon ?? 0, 6 + s.rank); return '대장장이가 한 달을 들여 칼을 벼렸다. 손에 쥐자 무게가 손목에 꼭 맞았다.'; }
    stress(g, -10); return '칼날에 비친 얼굴이 처음 목검을 쥐던 날보다 많이 늙었다. 그래도 손은 그날보다 덜 떨린다.';
  },
});
// 승급 대련이 끝나면 의식을 잇고, 검성이 되는 순간 칼이 처음 운다
const rankEnd = ENDS.rank_test;
registerDuelEnd('rank_test', (g, rng, won, d, res) => {
  const out = rankEnd(g, rng, won, d, res);
  if (won) {
    const s = swordState(g);
    if (s.rank >= 3) { s.aura = Math.max(s.aura, 2); s.auraP = Math.max(s.auraP, 100); }
    queueScene(g, 'sw_rite', { rank: s.rank }, { first: true });
  }
  return out;
});

// 이름난 검객과 겨룬 뒤
registerDuelEnd('sw_famous', (g, rng, won, d) => {
  const s = swordState(g), H = hallState(g);
  if (d.ctx.leon) {
    s.fought.push({ name: d.foe.name, won, y: g.date.year });
    if (won) { renown(g, 40); chron(g, `${J(g.player.name, '이/가')} 검왕 레온 발하르트와 겨뤄 이겼다. 대륙의 검객들이 이 이름을 외우기 시작했다.`, 100); return '검왕이 칼을 내리고 오래 웃었다. "드디어." 그는 그 말만 했다.'; }
    gainSkill(g, 'sword', 3, 'wil');
    return '검왕의 칼은 보이지 않았다. 정신을 차렸을 때 그는 벌써 등을 돌리고 있었다. "열 해 뒤에 다시 와라."';
  }
  const f = H.famous.find((x) => x.id === d.ctx.fid);
  if (!f) return '';
  s.fought.push({ name: famousName(f), won, y: g.date.year });
  if (s.fought.length > 12) s.fought.splice(0, s.fought.length - 12);
  if (!won) { f.beaten += 1; gainSkill(g, 'sword', 1.5, 'wil'); return `${J(famousName(f), '이/가')} 칼을 거두며 고개를 끄덕였다. "나쁘지 않아. 십 년쯤 더 휘두르면."`; }
  f.lost += 1; f.skill = Math.max(50, f.skill - 1);
  renown(g, Math.max(4, Math.round((f.skill - 60) / 2)));
  chron(g, `${J(g.player.name, '이/가')} ${placeName(f.place)}에서 ${SCHOOLS[f.school].name}의 ${J(famousName(f), '을/를')} 꺾었다.`, 100);
  logH(g, `${J(famousName(f), '을/를')} 꺾었다.`);
  // 겨룬 상대의 초식 하나가 몸에 남는다
  const learn = SCHOOLS[f.school].forms.find((x) => !s.forms.includes(x.id) && x.need <= sk(g));
  if (learn && f.school !== schoolOf(g) && rng.chance(0.5)) { s.forms.push(learn.id); return `쓰러졌던 ${J(f.name, '이/가')} 일어나 웃었다. "내 '${learn.name}'에 세 번 당하고 네 번째엔 흉내까지 내더군." 그 수가 몸에 남았다.`; }
  return `${J(f.name, '이/가')} 칼을 바닥에 내려놓았다. 구경꾼들 사이로 내 이름이 번져 나갔다.`;
});

// 내 유파 세우기
const SIG_WORD = { yusu: '고요', ganggeom: '철벽', hwanyeong: '그믐', seonghwi: '새벽', moru: '모루', ipsae: '잎새', balto: '발톱', mulgyeol: '너울' };
const PLACE_WORD = (pl) => (PLACES_SHORT[pl] ?? placeName(pl).split(' ').pop());
const PLACES_SHORT = { leocast: '레오카스트', eisen: '아이젠', solaris: '솔라리스', serenia: '세레니아', graubel: '그라우벨', portel: '포르텔', hammer: '쇠망치', fur: '털가죽', silverleaf: '은잎' };
export function foundNames(g) {
  const base = schoolOf(g);
  return [`${g.player.name}류`, `${PLACE_WORD(here(g))} ${SCHOOLS[base].weapon === '도끼' ? '도끼술' : SCHOOLS[base].weapon === '맨손' ? '맨손류' : '검'}`, `${SIG_WORD[base]}류`];
}
defineScene('sw_found', {
  need: (g) => rankOf(g) >= 3 && g.player.money >= 100 && (!hallState(g).own || hallState(g).own.closed),
  title: () => '내 유파',
  text: (g) => `창고에 마루를 깔고 벽에 목검을 걸었다. 남은 것은 이름이다. 뿌리는 ${SCHOOLS[schoolOf(g)].name}이지만, 이제는 내 칼이다. 간판에 무엇이라 쓸까.`,
  choices: (g) => [...foundNames(g).map((n, i) => ({ label: `'${n}'`, key: `n${i}` })), { label: '아직 이르다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '간판 없는 마루에 혼자 앉아 있다가 문을 잠갔다.';
    const name = foundNames(g)[Number(key.slice(1))];
    if (g.player.money < 100) return '마루 깔 돈을 셈해 보니 모자랐다. 간판은 다음으로 미뤘다.';
    g.player.money -= 100;
    const H = hallState(g);
    H.own = { name, base: schoolOf(g), place: here(g), since: mi(g), pupils: 2, fame: Math.min(40, (L(g).renown ?? 0) / 3), mine: true, headName: null, away: 0, closed: false };
    g.sword.house = true;
    renown(g, 8);
    chron(g, `${J(g.player.name, '이/가')} ${placeName(here(g))}에 ${J(name, '을/를')} 세웠다. 뿌리는 ${SCHOOLS[schoolOf(g)].name}.`, 100);
    logH(g, `${placeName(here(g))}에 ${J(name, '을/를')} 세웠다.`);
    return `간판을 걸던 날, 동네 아이 둘이 문간에서 기웃거렸다. 첫 문하생이다. 오늘부터 ${J(name, '이/가')} 세상에 있다.`;
  },
});
void ENDS;
