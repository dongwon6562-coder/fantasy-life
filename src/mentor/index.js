// 13단계: 제자와 문하.
// 내가 스승이 되는 삶. 솜씨가 무르익으면(기술 45 이상, 스무 살부터) 제자를 들여 검·마법·글·약초·대장일·요리·장사를 가르친다.
// 제자마다 재주(talent)와 따르는 마음(loyalty)이 있다. 가르치면 솜씨가 자라고 마음이 붙는다. 돌보지 않으면 마음이 식는다.
// 다 자란 제자는 하산(독립)하고, 세월이 지나 이름을 얻거나 스승의 이름에 먹칠을 한다. 마음이 식은 제자는 배신한다
// (비법을 들고 떠나기, 경쟁 문파로 가기, 험담, 검이면 도전).
// 솜씨가 70을 넘고 제자를 길러 냈으면 내 이름을 단 유파·학파·공방을 세운다. 문파의 이름(prestige)은 제자들이 쌓는다.
// 내가 죽어 대를 이으면 문파는 남는다: 자식이 잇거나, 수제자에게 맡기거나, 문을 닫는다. 수제자에게 맡긴 문파는
// 다음 대의 내가 찾아가 선대의 가르침을 배우고, 솜씨가 차면 다시 돌려받을 수 있다.
// 잇는 곳: duel(검 제자와의 대련·도전), craft(가게 제자는 craft가 맡고 여기서는 보여 주기만, 공방 세울 때 셈),
// kin(내 자식을 제자로), legends(문파의 이름이 내 이름값 renown이 됨), feud(배신한 제자는 원수가 됨), repute(험담·먹칠).
// 상태는 game.mentor 하나. 화면 연결점: mentorInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainSkill, circleOf } from '../game.js';
import { byId, fullName, has, ageYears, makePerson } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, tired, stress, up, gains, spend, canSpend, check } from '../adventure/core.js';
import { rel, remember } from '../relations.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { addGrudge } from '../feud/index.js';
import { queueDuel, registerDuelEnd } from '../duel/registry.js';
import { apprentices as shopApprentices } from '../craft/shop.js';
import { kinState } from '../kin/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '어느 고장';

/* ---------- 가르칠 수 있는 것 ---------- */
export const ARTS = {
  sword: { name: '검술', house: '도장', suffix: '류', stat: 'str', master: '사범', lesson: ['목검을 쥔 손목을 바로잡아 주었다.', '같은 베기를 천 번 시켰다. 구백 번째부터 칼이 바람을 갈랐다.', '발을 보라고 했다. 칼은 발이 먼저 간 곳으로 간다.'] },
  magic: { name: '마법', house: '학파', suffix: '학파', stat: 'int', master: '스승', lesson: ['마력을 한 줄로 모으는 법을 다시 가르쳤다. 촛불이 흔들리지 않을 때까지.', '주문의 마디마디를 소리 내어 따라 읽게 했다.', '서클을 그리는 손이 떨렸다. 떨려도 된다고, 끊기지만 않으면 된다고 했다.'] },
  letters: { name: '글과 학문', house: '서원', suffix: '학파', stat: 'int', master: '선생', lesson: ['옛 연대기 한 장을 베껴 쓰게 하고, 틀린 곳을 짚었다.', '왜 그렇게 생각하느냐고 세 번 물었다. 세 번째 대답이 처음으로 제 생각이었다.', '어려운 책을 쉽게 풀어 말해 보라고 했다.'] },
  herbs: { name: '약초', house: '의방', suffix: '의방', stat: 'sen', master: '스승', lesson: ['비슷하게 생긴 독초와 약초를 나란히 놓고 냄새를 맡게 했다.', '열병 앓는 집에 데려가 맥 짚는 법을 보여 주었다.', '말린 뿌리를 빻는 손이 거칠다고 나무랐다. 약은 손끝에서 갈린다.'] },
  smithing: { name: '대장일', house: '공방', suffix: '공방', stat: 'str', master: '장인', lesson: ['쇠가 붉을 때와 누를 때를 눈으로 가리게 했다.', '망치를 내려놓게 하고, 모루에서 나는 소리를 듣게 했다.', '담금질 한 번에 날이 갈라졌다. 처음부터 다시.'] },
  cooking: { name: '요리', house: '주방', suffix: '주방', stat: 'sen', master: '주방장', lesson: ['육수 간을 보게 했다. 세 번 틀리고 네 번째에 맞혔다.', '칼질은 빨리가 아니라 고르게라고 했다.', '불 앞에서 떠나지 말라고 했다. 요리는 기다림이다.'] },
  trade: { name: '장사', house: '상회', suffix: '상회', stat: 'cha', master: '행수', lesson: ['장부 맞추는 법을 가르쳤다. 한 닢이 비면 밤을 새워서라도 찾는다.', '흥정 자리에 데려가 내 입 대신 눈을 보라고 했다.', '물건보다 사람을 먼저 보라고 했다. 값은 사람이 정한다.'] },
};
const ART_IDS = Object.keys(ARTS);
const NEED = 45;
const mySkill = (g, art) => g.player.skills[art] ?? 0;
const canTeachArt = (g, art) => mySkill(g, art) >= NEED && (art !== 'magic' || circleOf(g) >= 2);
export const teachableArts = (g) => ART_IDS.filter((a) => canTeachArt(g, a)).sort((a, b) => mySkill(g, b) - mySkill(g, a));
export function skillWord(v) {
  if (v < 10) return '걸음마';
  if (v < 30) return '견습';
  if (v < 55) return '숙련';
  if (v < 80) return '장인';
  return '명장';
}
export function loyaltyWord(v) {
  if (v >= 80) return '스승을 아버지처럼 따름';
  if (v >= 60) return '믿고 따름';
  if (v >= 40) return '배우러 왔을 뿐';
  if (v >= 25) return '마음이 떠나는 중';
  return '등 돌리기 직전';
}
const talentWord = (t) => (t >= 1.4 ? '하늘이 낸 재주' : t >= 1.15 ? '눈에 띄는 재주' : t >= 0.85 ? '보통 재주' : '느린 재주');
export function prestigeWord(v) {
  if (v >= 75) return '대륙에 이름난';
  if (v >= 50) return '나라에 알려진';
  if (v >= 25) return '고장에서 알아주는';
  return '이제 막 문을 연';
}

/* ---------- 상태 ---------- */
export function mentorState(g) {
  g.mentor ??= {};
  const m = g.mentor;
  m.disciples ??= {};  // 사람 id → { art, skill, talent, loyalty, since, gen, kid, taughtAt, lessons, surpassed }
  m.grads ??= [];      // [{ id, name, art, at, fate, fateAt, good, gen }] 하산한 제자
  m.betrayals ??= 0;
  m.school ??= null;   // { name, art, place, founded, founder, prestige, members, headId, heads[], gens, closed, peak }
  m.sceneAt ??= 0;
  m.takenAt ??= 0;
  m.taught ??= 0;      // 평생 가르친 제자 수
  m.log ??= [];
  return m;
}
const M = mentorState;
function log(g, text) { const m = M(g); m.log.push({ y: g.date.year, m: g.date.month, text }); if (m.log.length > 24) m.log.shift(); }
const ready = (g) => playerAge(g) >= 20 && !traveling(g) && !isJailed(g) && !g.over;
const recOf = (g, id) => M(g).disciples[id] ?? null;
export const myDisciples = (g) => Object.entries(M(g).disciples).map(([id, d]) => [byId(g, Number(id)), d]).filter(([p]) => p && p.alive);
function capacity(g) {
  const s = M(g).school;
  const best = Math.max(0, ...teachableArts(g).map((a) => mySkill(g, a)));
  return 1 + (best >= 65 ? 1 : 0) + (best >= 85 ? 1 : 0) + (s && !s.closed && s.headId == null ? 1 : 0);
}
const kidOf = (g, p) => (me(g).childIds ?? []).includes(p.id);

/* ---------- 상태 읽기 (화면용) ---------- */
export function mentorInfo(g) {
  const m = M(g);
  const now = mi(g);
  const arts = teachableArts(g).map((id) => ({ id, name: ARTS[id].name, skill: Math.round(mySkill(g, id)) }));
  const disciples = myDisciples(g).sort((a, b) => b[1].skill - a[1].skill).map(([p, d]) => ({
    id: p.id, name: fullName(p), age: ageYears(p), art: d.art, artName: ARTS[d.art].name, skill: Math.round(d.skill), skillWord: skillWord(d.skill),
    loyalty: Math.round(d.loyalty), loyaltyWord: loyaltyWord(d.loyalty), talentWord: talentWord(d.talent), months: now - d.since, kid: !!d.kid, gen: d.gen,
  }));
  const s = m.school;
  const head = s?.headId != null ? byId(g, s.headId) : null;
  const school = s ? {
    name: s.name, art: s.art, artName: ARTS[s.art].name, house: ARTS[s.art].house, place: s.place, placeName: placeName(s.place),
    founded: s.founded, founder: s.founder, prestige: Math.round(s.prestige), prestigeWord: prestigeWord(s.prestige), members: s.members,
    head: s.closed ? '문을 닫음' : head ? `${fullName(head)} (선대의 제자)` : g.player.name, gens: s.gens, heads: s.heads.map((h) => ({ ...h })), closed: !!s.closed,
  } : null;
  return {
    canTeach: arts.length > 0 && playerAge(g) >= 20, arts, cap: capacity(g), disciples,
    shopApprentices: shopApprentices(g).map((p) => fullName(p)),
    grads: m.grads.slice(-10).map((x) => ({ name: x.name, art: x.art, artName: ARTS[x.art]?.name ?? '기술', fate: x.fate ?? '아직 소식이 없다', y: Math.floor(x.at / 12) })),
    taught: m.taught, betrayals: m.betrayals, school, log: m.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 제자 들이기 ---------- */
// 한번 내 문하에 들었던 사람(하산·배신·파문 포함)은 다시 후보가 되지 않는다
const wasMine = (g, p) => p.mentored || !!recOf(g, p.id) || M(g).grads.some((x) => x.id === p.id);
function candidates(g, rng, art) {
  const out = [];
  // 내 자식 (10살 넘고 아직 제자가 아닌)
  for (const id of me(g).childIds ?? []) {
    const p = byId(g, id);
    if (!p || !p.alive || p.isPlayer || wasMine(g, p) || ageYears(p) < 10 || ageYears(p) > 30) continue;
    const kr = kinState(g).kids?.[id];
    if (kr?.left || kr?.disowned) continue;
    out.push({ who: 'kid', id, talent: kr?.gift && kr.gift === art ? 1.3 : 1 });
    if (out.length >= 1) break;
  }
  // 아는 젊은이
  const known = g.people.filter((p) => p.alive && !p.isPlayer && p.known && !wasMine(g, p) && !g.player.familyIds.includes(p.id) && ageYears(p) >= 12 && ageYears(p) <= 24 && p.affection >= 10 && (p.place ?? 'ern') === here(g));
  if (known.length) { const p = rng.pick(known); out.push({ who: 'known', id: p.id, talent: Math.max(0.6, Math.min(1.6, rng.normal(1, 0.25))) }); }
  // 찾아온 낯선 아이들
  while (out.length < 3) {
    const sex = rng.chance(0.5) ? 'm' : 'f';
    // 아는 사람·옛 제자·다른 후보와 이름이 겹치지 않게 (동명이인으로 헷갈리지 않도록)
    const taken = new Set([...g.people.filter((q) => q.alive && (q.known || wasMine(g, q))).map((q) => `${q.name} ${q.lastName}`), ...M(g).grads.map((x) => x.name), ...out.filter((c) => c.who === 'new').map((c) => `${c.name} ${c.lastName}`)]);
    let tmp = makePerson(rng, { sex, ageMonths: rng.int(12, 19) * 12 });
    for (let t = 0; t < 8 && taken.has(`${tmp.name} ${tmp.lastName}`); t++) tmp = makePerson(rng, { sex, ageMonths: rng.int(12, 19) * 12 });
    out.push({ who: 'new', sex, age: ageYears(tmp), name: tmp.name, lastName: tmp.lastName, traits: tmp.traits, talent: Math.max(0.55, Math.min(1.7, rng.normal(1, 0.3))) });
  }
  return out;
}
const TRAIT_WORD = { kind: '다정한', cruel: '모진', brave: '겁 없는', timid: '겁 많은', ambitious: '눈빛이 야심찬', content: '느긋한', greedy: '욕심 많은', generous: '너그러운', diligent: '부지런한', lazy: '게으른', gossip: '말 많은', reserved: '과묵한', pious: '독실한', drunkard: '술 좋아하는' };
const traitOf = (traits) => TRAIT_WORD[(traits ?? []).find((t) => TRAIT_WORD[t])] ?? '수수한';
function candLabel(g, c) {
  const hint = c.talent >= 1.3 ? '눈이 반짝인다' : c.talent >= 1.05 ? '손이 야무지다' : c.talent >= 0.85 ? '무난해 보인다' : '느려 보인다';
  if (c.who === 'new') return `${c.name} ${c.lastName} (${c.age}살, ${traitOf(c.traits)} 아이, ${hint})`;
  const p = byId(g, c.id);
  return `${c.who === 'kid' ? (p.sex === 'm' ? '아들' : '딸') : '아는 얼굴'} ${p.name} (${ageYears(p)}살, ${traitOf(p.traits)} 성격, ${hint})`;
}
function takeDisciple(g, p, art, talent, { kid = false } = {}) {
  const m = M(g);
  rel(p);
  p.known = true;
  const base = kid ? 8 : 0;
  p.mentored = true;
  m.disciples[p.id] = {
    art, skill: Math.max(base, Math.min(30, (p.skill ?? 0) * 0.3)), talent: Math.round(talent * 100) / 100,
    loyalty: clamp(55 + (kid ? 15 : 0) + (has(p, 'kind') || has(p, 'diligent') ? 8 : 0) - (has(p, 'ambitious') ? 8 : 0) - (has(p, 'cruel') ? 6 : 0), 20, 90),
    since: mi(g), gen: 0, kid, taughtAt: mi(g), lessons: 0, surpassed: false,
  };
  m.takenAt = mi(g); m.taught += 1;
  p.affection = Math.max(p.affection ?? 0, 20);
  p.history.push({ y: g.date.year, m: g.date.month, text: `${g.player.name}에게 ${J(ARTS[art].name, '을/를')} 배우기 시작했다.` });
  remember(g, p, `${J(ARTS[art].name, '을/를')} 가르쳐 주기로 했다`, 1, { tag: 'mentor' });
  log(g, `${J(p.name, '을/를')} ${ARTS[art].name} 제자로 들였다.`);
  note(g, `${J(p.name, '을/를')} 제자로 들였다.`);
}
ACTIONS.push({
  id: 'mentor_take', name: '제자 들이기', icon: 'book',
  desc: '내가 가장 잘하는 것을 배우겠다는 사람을 받는다. 내 자식도, 아는 젊은이도, 소문 듣고 찾아온 아이도. 솜씨가 깊을수록, 문파가 있으면 더 많이 둘 수 있다.',
  available: (g) => ready(g) && teachableArts(g).length > 0 && myDisciples(g).length < capacity(g) && !sceneQueued(g, 'mentor_pick') && mi(g) - M(g).takenAt >= 6,
  run(g, rng) {
    const arts = teachableArts(g);
    // 가장 잘하는 것, 다만 이미 제자가 많은 기술보다 아직 없는 기술을 조금 더
    const art = arts.find((a) => !myDisciples(g).some(([, d]) => d.art === a) && mySkill(g, a) >= mySkill(g, arts[0]) - 10) ?? arts[0];
    tired(g, 3);
    queueScene(g, 'mentor_pick', { art, cands: candidates(g, rng, art) });
    return `${J(ARTS[art].name, '을/를')} 가르칠 제자를 받는다고 말을 냈다. 며칠 사이에 문 앞에 사람이 섰다.`;
  },
});
defineScene('mentor_pick', {
  title: (g, s) => `${ARTS[s.art].name} 제자를 고른다`,
  text: (g, s) => `${J(ARTS[s.art].name, '을/를')} 배우겠다는 사람이 찾아왔다. 내 솜씨는 ${skillWord(mySkill(g, s.art))}. 누구를 받을까. 한번 받으면 몇 해를 함께해야 한다.`,
  choices: (g, s) => [
    ...s.cands.map((c, i) => ({ label: candLabel(g, c), key: `c${i}` })).filter((x, i) => s.cands[i].who === 'new' || byId(g, s.cands[i].id)?.alive),
    { label: '아무도 받지 않는다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'none') return '모두 돌려보냈다. 가르칠 사람을 고르는 일은 배울 사람을 고르는 일보다 어렵다.';
    const c = s.cands[Number(key.slice(1))];
    let p;
    if (c.who === 'new') {
      p = makePerson(rng, { sex: c.sex, ageMonths: c.age * 12 + rng.int(0, 11), lastName: c.lastName, traits: c.traits });
      p.name = c.name; p.place = here(g); p.known = true;
      g.people.push(p);
    } else p = byId(g, c.id);
    if (!p || !p.alive) return '그 사람은 이제 없다.';
    takeDisciple(g, p, s.art, c.talent, { kid: c.who === 'kid' });
    if (c.who === 'kid') return `${J(p.name, '은/는')} 고개를 끄덕였다. 아비와 어미에게 배우는 것은 남에게 배우는 것보다 쉽고, 또 어렵다.`;
    return `${J(p.name, '이/가')} 무릎을 꿇고 절을 올렸다. "가르쳐 주십시오." 이제 내게 배우는 사람이 생겼다.`;
  },
});

/* ---------- 가르치기 ---------- */
function grow(g, d, rate) {
  const top = mySkill(g, d.art) + (d.talent >= 1.35 ? 6 : -3);
  const gain = Math.max(0, (top - d.skill) * 0.035 * d.talent * rate + 0.35 * d.talent * rate);
  d.skill = clamp(d.skill + gain, 0, Math.max(d.skill, top));
  return gain;
}
ACTIONS.push({
  id: 'mentor_teach', name: '제자 가르치기', icon: 'book',
  desc: '제자들을 불러 앉히고 가르친다. 제자의 솜씨가 자라고 마음이 붙는다. 가르치다 보면 나도 다시 배운다.',
  available: (g) => ready(g) && myDisciples(g).length > 0,
  run(g, rng) {
    const list = myDisciples(g);
    const lines = [];
    let mine = 0;
    for (const [p, d] of list) {
      grow(g, d, 1 + (g.player.stats.cha ?? 0) / 200);
      d.taughtAt = mi(g); d.lessons += 1;
      d.loyalty = clamp(d.loyalty + 2.5 + (has(p, 'kind') || has(p, 'diligent') ? 1 : 0) - (has(p, 'lazy') ? 1 : 0), 0, 100);
      p.affection = Math.min(100, (p.affection ?? 0) + 1);
      p.skill = Math.max(p.skill ?? 0, Math.round(d.skill * 0.9));
    }
    const arts = [...new Set(list.map(([, d]) => d.art))];
    for (const a of arts) mine += gainSkill(g, a, 0.5, ARTS[a].stat);
    tired(g, 4 + list.length);
    const [p0, d0] = rng.pick(list);
    lines.push(`${p0.name}에게: ${rng.pick(ARTS[d0.art].lesson)}`);
    if (rng.chance(0.28) && !sceneQueued(g, 'mentor_lesson')) queueScene(g, 'mentor_lesson', { id: p0.id, kind2: rng.pick(['stuck', 'quarrel', 'secret', 'praise']) });
    return `${list.map(([p]) => p.name).join(', ')}에게 ${J(arts.map((a) => ARTS[a].name).join('·'), '을/를')} 가르쳤다. ${lines.join(' ')}${gains([up(arts.map((a) => ARTS[a].name).join('·'), mine)])}`;
  },
});
defineScene('mentor_lesson', {
  title: (g, s) => ({ stuck: '벽에 부딪힌 제자', quarrel: '제자들의 다툼', secret: '비법을 물어 오다', praise: '칭찬을 기다리는 눈' })[s.kind2] ?? '가르침',
  text: (g, s) => {
    const p = byId(g, s.id);
    const d = recOf(g, s.id);
    const other = myDisciples(g).find(([q]) => q.id !== s.id)?.[0];
    return {
      stuck: `${J(p.name, '이/가')} 몇 달째 같은 자리에서 맴돈다. 오늘은 ${ARTS[d.art].name} 연습을 하다 말고 주저앉아 울었다. "저는 안 되나 봐요."`,
      quarrel: other ? `${J(p.name, '과/와')} ${J(other.name, '이/가')} 마당에서 멱살을 잡았다. 누가 더 아끼는 제자냐는 말다툼이 시작이었다고 한다.` : `${J(p.name, '이/가')} 이웃 집 견습생과 주먹다짐을 하고 왔다. 스승을 욕했다고 한다.`,
      secret: `${J(p.name, '이/가')} 밤늦게 찾아왔다. "스승님만 아시는 그것, 이제 가르쳐 주실 수 없습니까." 아직 이르다는 생각과, 가르쳐야 한다는 생각이 함께 들었다.`,
      praise: `${J(p.name, '이/가')} 처음으로 제법 그럴듯한 솜씨를 보였다. 그러고는 내 얼굴만 살핀다.`,
    }[s.kind2];
  },
  choices: (g, s) => {
    if (!byId(g, s.id)?.alive || !recOf(g, s.id)) return [];
    return {
      stuck: [{ label: '처음부터 다시 함께 해 본다', key: 'warm' }, { label: '울 시간에 한 번 더 하라고 다그친다', key: 'hard' }, { label: '며칠 쉬게 한다', key: 'rest' }],
      quarrel: [{ label: '둘 다 똑같이 벌을 준다', key: 'fair' }, { label: '내 제자를 감싼다', key: 'side' }, { label: '스스로 풀게 둔다', key: 'leave' }],
      secret: [{ label: '비법을 전한다', key: 'give' }, { label: '아직 이르다고 돌려보낸다', key: 'wait' }],
      praise: [{ label: '크게 칭찬한다', key: 'praise' }, { label: '아직 멀었다고 한다', key: 'cold' }, { label: '말없이 어깨를 두드린다', key: 'pat' }],
    }[s.kind2];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const d = recOf(g, s.id);
    if (!p || !d) return '그 제자는 이제 없다.';
    const L2 = (n) => { d.loyalty = clamp(d.loyalty + n, 0, 100); };
    switch (key) {
      case 'warm': grow(g, d, 1.5); L2(6); tired(g, 4); return `손을 잡고 처음 동작부터 다시 했다. 해가 질 무렵, ${J(p.name, '이/가')} 막혔던 자리를 넘었다. 넘고 나서 한 번 더 울었다.`;
      case 'hard': if (has(p, 'diligent') || has(p, 'brave') || rng.chance(0.4)) { grow(g, d, 2); L2(-2); return `${J(p.name, '은/는')} 이를 악물고 일어났다. 그날 밤 내내 연습하는 소리가 들렸다.`; } L2(-10); return `${J(p.name, '은/는')} 대답 없이 나갔다. 다음 날 늦게 돌아왔다. 눈이 붉었다.`;
      case 'rest': L2(3); stress(g, -2); return '사흘을 쉬게 했다. 돌아온 손이 조금 가벼워져 있었다. 막힌 자리는 그대로였지만, 막힌 마음은 풀린 것 같았다.';
      case 'fair': for (const [, x] of myDisciples(g)) x.loyalty = clamp(x.loyalty + 1, 0, 100); return '둘 다 장작을 한 수레씩 패게 했다. 장작더미 너머로 둘이 투덜대는 소리가 같은 박자로 들렸다.';
      case 'side': L2(6); for (const [q, x] of myDisciples(g)) if (q.id !== p.id) x.loyalty = clamp(x.loyalty - 8, 0, 100); return `${J(p.name, '을/를')} 감쌌다. 다른 제자들의 눈빛이 식었다. 스승의 마음은 고르지 않다는 것을 다들 알게 되었다.`;
      case 'leave': return rng.chance(0.5) ? '스스로 풀게 두었다. 며칠 뒤 둘이 같이 술을 마시고 들어왔다.' : (L2(-4), '스스로 풀게 두었다. 풀리지 않았다. 마당의 공기가 한동안 차가웠다.');
      case 'give': grow(g, d, 3); L2(10); if (d.loyalty < 40 && rng.chance(0.3)) { d.loyalty = clamp(d.loyalty - 15, 0, 100); return `비법을 전했다. ${J(p.name, '은/는')} 고맙다고 했다. 그 눈빛이 어딘가 계산하는 것 같아 마음에 걸렸다.`; } return `내가 스무 해 걸려 깨친 것을 하룻밤에 일러 주었다. ${J(p.name, '은/는')} 한참 말이 없다가 절을 했다.`;
      case 'wait': L2(has(p, 'ambitious') ? -8 : -1); return `"아직이다." ${J(p.name, '은/는')} 고개를 숙였다. ${has(p, 'ambitious') ? '숙인 얼굴이 굳어 있었다.' : '그래도 믿는 눈치였다.'}`;
      case 'praise': L2(8); if (has(p, 'lazy') || rng.chance(0.2)) d.skill = Math.max(0, d.skill - 0.5); return `잘했다고 했다. ${p.name}의 얼굴이 환해졌다. 그날 저녁 밥을 두 그릇 먹었다고 한다.`;
      case 'cold': if (has(p, 'ambitious') || has(p, 'diligent')) { grow(g, d, 1.5); L2(-2); return `${J(p.name, '은/는')} 입술을 깨물었다. 그리고 더 했다.`; } L2(-7); return `${p.name}의 얼굴에서 빛이 꺼졌다.`;
      default: L2(5); return `말없이 어깨를 두드렸다. ${J(p.name, '은/는')} 그걸로 충분하다는 듯 웃었다.`;
    }
  },
});

/* ---------- 하산 (독립) ---------- */
function graduate(g, p, d, fateLine = null) {
  const m = M(g);
  delete m.disciples[p.id];
  m.grads.push({ id: p.id, name: fullName(p), art: d.art, at: mi(g), fate: fateLine, fateAt: null, good: d.loyalty >= 50 ? 1 : 0, gen: d.gen, talent: d.talent, skill: Math.round(d.skill), loyalty: Math.round(d.loyalty) });
  if (m.grads.length > 30) m.grads.shift();
  p.skill = Math.max(p.skill ?? 0, Math.round(d.skill));
  p.history.push({ y: g.date.year, m: g.date.month, text: `스승 ${g.player.name}의 문하에서 하산했다.` });
  const s = m.school;
  if (s && !s.closed && s.art === d.art) { s.prestige = clamp(s.prestige + 3 + d.skill / 25, 0, 100); s.members += 1; }
  log(g, `${J(p.name, '이/가')} ${J(ARTS[d.art].name, '을/를')} 다 배우고 하산했다.`);
}
defineScene('mentor_graduate', {
  title: () => '하산',
  text: (g, s) => {
    const p = byId(g, s.id);
    const d = recOf(g, s.id);
    return `${J(p.name, '이/가')} 내게 온 지 ${Math.floor((mi(g) - d.since) / 12)}년. ${ARTS[d.art].name} 솜씨는 이제 ${skillWord(d.skill)}. 더 가르칠 것이 남았는지, 이제 놓아주어야 하는지.`;
  },
  choices: (g, s) => {
    const d = recOf(g, s.id);
    if (!byId(g, s.id)?.alive || !d) return [];
    return [
      ...(d.art === 'sword' && !g.duelQueued ? [{ label: '마지막으로 진검 대련을 한다', key: 'duel' }] : []),
      { label: '축복하며 하산시킨다', key: 'bless' },
      ...(M(g).school && !M(g).school.closed && M(g).school.art === d.art ? [{ label: '곁에 남아 문파를 거들라고 한다', key: 'stay' }] : []),
      { label: '아직 멀었다며 붙잡는다', key: 'hold' },
    ];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const d = recOf(g, s.id);
    if (!p || !d) return '그 제자는 이제 없다.';
    if (key === 'duel') {
      queueDuel(g, { kind: 'mentor_test', title: '하산 대련', intro: `${J(p.name, '이/가')} 진검을 쥐었다. "스승님, 봐주지 마십시오."`, foe: { name: p.name, skill: Math.round(d.skill), style: has(p, 'brave') ? 'bold' : 'steady', id: p.id }, ctx: { id: p.id } });
      return `마당 한가운데에 ${J(p.name, '과/와')} 마주 섰다. 다른 제자들이 숨을 죽였다.`;
    }
    if (key === 'hold') {
      d.loyalty = clamp(d.loyalty - (has(p, 'ambitious') ? 15 : 6), 0, 100);
      d.heldAt = mi(g);
      return `"아직이다." ${J(p.name, '은/는')} 고개를 숙였다. ${d.loyalty < 40 ? '숙인 고개 아래에서 무언가 식어 가는 소리가 들리는 것 같았다.' : '실망한 기색이었지만 따랐다.'}`;
    }
    if (key === 'stay') {
      graduate(g, p, d, `${M(g).school.name}에 남아 문하를 거든다`);
      const gr = M(g).grads.at(-1); gr.fateAt = mi(g); gr.good = 1; gr.stay = true;
      M(g).school.prestige = clamp(M(g).school.prestige + 3, 0, 100);
      return `${J(p.name, '은/는')} 기꺼이 남겠다고 했다. 이제 내 제자들에게는 사형이 생겼다.`;
    }
    graduate(g, p, d);
    remember(g, p, '하산하는 날 축복해 주었다', 1, { tag: 'mentor' });
    p.affection = Math.min(100, (p.affection ?? 0) + 10);
    return `${J(p.name, '이/가')} 마지막 절을 올렸다. 문을 나서는 뒷모습을 오래 보았다. 처음 왔을 때보다 등이 넓었다.`;
  },
});
registerDuelEnd('mentor_test', (g, rng, won, dl) => {
  const p = byId(g, dl.ctx.id);
  const d = p && recOf(g, p.id);
  if (!p || !d) return '대련이 끝났다.';
  graduate(g, p, d);
  if (won) return `칼끝을 ${p.name}의 목 앞에서 멈췄다. "아직 멀었다. 그래도 이제는 나가도 된다." ${J(p.name, '은/는')} 웃으며 절했다.`;
  d.surpassed = true;
  chron(g, `${fullName(p)}, 스승 ${J(g.player.name, '을/를')} 대련에서 이기고 하산하다.`, 50);
  stress(g, -3);
  return `${p.name}의 칼이 내 칼을 쳐 냈다. 땅에 떨어진 칼을 보며 웃음이 났다. 청출어람. 가르친 사람에게 이보다 큰 상은 없다.`;
});

/* ---------- 배신 ---------- */
defineScene('mentor_betray', {
  title: (g, s) => ({ steal: '사라진 비전서', rival: '경쟁 문하로 간 제자', slander: '제자의 입', challenge: '도전장' })[s.how] ?? '배신',
  text: (g, s) => {
    const p = byId(g, s.id);
    const d = recOf(g, s.id);
    return {
      steal: `아침에 일어나 보니 ${J(p.name, '이/가')} 없었다. 내가 평생 적어 온 ${ARTS[d.art].name} 비전 공책도 함께 사라졌다.`,
      rival: `${J(p.name, '이/가')} 다른 ${ARTS[d.art].master}의 문하로 들어갔다는 말이 들려왔다. 내게서 배운 것을 들고.`,
      slander: `${J(p.name, '이/가')} 술자리마다 내 흉을 본다고 한다. 가르칠 줄도 모르면서 제자 등골만 뺀다고.`,
      challenge: `${J(p.name, '이/가')} 마당에 서서 칼을 뽑았다. "스승님께 배울 것은 다 배웠습니다. 이제 누가 더 나은지 보여 드리지요."`,
    }[s.how];
  },
  choices: (g, s) => {
    const p = byId(g, s.id);
    if (!p?.alive || !recOf(g, s.id)) return [];
    if (s.how === 'challenge') return [...(g.duelQueued ? [] : [{ label: '칼을 받는다', key: 'duel' }]), { label: '파문하고 내쫓는다', key: 'expel' }, { label: '마음을 돌려 본다', key: 'talk' }];
    return [{ label: '찾아가 따진다', key: 'confront' }, { label: '파문을 선언한다', key: 'expel' }, { label: '보내 준다', key: 'let' }];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const d = recOf(g, s.id);
    if (!p || !d) return '그 제자는 이제 없다.';
    const m = M(g);
    const school = m.school && !m.school.closed && m.school.art === d.art ? m.school : null;
    const lose = (why, heat) => {
      delete m.disciples[p.id];
      m.betrayals += 1;
      m.grads.push({ id: p.id, name: fullName(p), art: d.art, at: mi(g), fate: why, fateAt: mi(g), good: -1, gen: d.gen, talent: d.talent, skill: Math.round(d.skill), loyalty: Math.round(d.loyalty) });
      if (m.grads.length > 30) m.grads.shift();
      p.skill = Math.max(p.skill ?? 0, Math.round(d.skill));
      p.history.push({ y: g.date.year, m: g.date.month, text: `스승 ${g.player.name}의 문하를 떠났다.` });
      if (heat) addGrudge(g, p, heat, '스승과 등을 졌다');
      log(g, `제자 ${J(p.name, '이/가')} 등을 돌렸다.`);
    };
    if (key === 'duel') {
      queueDuel(g, { kind: 'mentor_betray', title: '제자의 도전', intro: `${J(p.name, '이/가')} 먼저 칼끝을 들었다. 내가 가르친 자세 그대로였다.`, foe: { name: p.name, skill: Math.round(d.skill), style: has(p, 'cruel') ? 'bold' : 'tricky', id: p.id }, ctx: { id: p.id } });
      return '칼을 뽑았다. 가르칠 때와는 다른 무게였다.';
    }
    if (key === 'talk' || key === 'confront') {
      if (check(rng, g.player.stats.cha * 0.5 + d.loyalty * 0.5 + (d.kid ? 20 : 0), 40)) {
        d.loyalty = clamp(d.loyalty + 30, 0, 100);
        remember(g, p, '스승이 찾아와 붙잡았다', 1, { tag: 'mentor' });
        return `${J(p.name, '은/는')} 끝내 고개를 떨구었다. "제가 어리석었습니다." 돌아왔다. 상처는 남았지만, 제자는 다시 제자가 되었다.`;
      }
      lose(s.how === 'steal' ? '비전서를 들고 달아났다' : s.how === 'rival' ? '경쟁 문하로 갔다' : '스승을 욕하고 떠났다', 35);
      if (school) school.prestige = clamp(school.prestige - 6, 0, 100);
      return `${J(p.name, '은/는')} 코웃음을 쳤다. "스승님이 가르친 건 다 제 것입니다." 말이 칼보다 깊이 들어왔다.`;
    }
    if (key === 'expel') {
      lose('파문당했다', 45);
      deed(g, 'brave', 2, null);
      if (school) school.prestige = clamp(school.prestige - 3, 0, 100);
      return `문하 사람들 앞에서 ${p.name}의 이름을 지웠다. 이제 ${J(p.name, '은/는')} 내 제자가 아니다. 어디서도 내 이름을 대지 못할 것이다. 그리고 나를 평생 미워할 것이다.`;
    }
    lose(s.how === 'steal' ? '비전서를 들고 떠났다' : '스스로 떠났다', 15);
    if (s.how === 'slander') deed(g, 'kind', -6, '제자 등골을 빼먹는 스승이라더라', undefined, { lie: true, src: p.id });
    if (school) school.prestige = clamp(school.prestige - (s.how === 'steal' ? 8 : 4), 0, 100);
    stress(g, 6);
    return '보내 주었다. 붙잡아 봐야 마음은 이미 떠났다. 다만 가르친 세월이 아까운 것은 어쩔 수 없었다.';
  },
});
registerDuelEnd('mentor_betray', (g, rng, won, dl) => {
  const p = byId(g, dl.ctx.id);
  const d = p && recOf(g, p.id);
  if (!p || !d) return '결투가 끝났다.';
  const m = M(g);
  delete m.disciples[p.id];
  m.betrayals += 1;
  const school = m.school && !m.school.closed && m.school.art === d.art ? m.school : null;
  m.grads.push({ id: p.id, name: fullName(p), art: d.art, at: mi(g), fate: won ? '스승에게 도전했다가 지고 떠났다' : '스승을 꺾고 떠났다', fateAt: mi(g), good: -1, gen: d.gen, talent: d.talent, skill: Math.round(d.skill), loyalty: 0 });
  if (won) {
    addGrudge(g, p, 30, '스승에게 도전했다가 졌다');
    deed(g, 'brave', 5, '도전한 제자를 꺾었다더라');
    if (school) school.prestige = clamp(school.prestige + 2, 0, 100);
    return `${p.name}의 칼이 땅에 떨어졌다. "가거라." 그 말밖에 할 수 없었다. ${J(p.name, '은/는')} 돌아보지 않고 떠났다.`;
  }
  addGrudge(g, p, 20, '스승을 꺾었다');
  if (school) school.prestige = clamp(school.prestige - 12, 0, 100);
  chron(g, `${fullName(p)}, 스승 ${J(g.player.name, '을/를')} 꺾고 문하를 떠나다.`, 50);
  stress(g, 12);
  return `내가 가르친 칼에 내가 졌다. ${J(p.name, '은/는')} 쓰러진 나를 내려다보고 웃었다. 그 웃음을 가르친 적은 없었다.`;
});

/* ---------- 제자가 나를 넘다 ---------- */
defineScene('mentor_surpass', {
  title: () => '청출어람',
  text: (g, s) => { const p = byId(g, s.id); const d = recOf(g, s.id); return `${p.name}의 ${J(ARTS[d.art].name, '이/가')} 내 것을 넘었다. 누구보다 내가 먼저 알았다. 어제 ${J(p.name, '이/가')} 한 것을, 나는 할 수 없었다.`; },
  choices: (g, s) => (byId(g, s.id)?.alive && recOf(g, s.id) ? [{ label: '자랑스럽다고 말해 준다', key: 'proud' }, { label: '속이 쓰리다', key: 'envy' }, { label: '이제 네가 나를 가르쳐 달라고 한다', key: 'learn' }] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const d = recOf(g, s.id);
    if (!p || !d) return '그 제자는 이제 없다.';
    d.surpassed = true;
    if (key === 'proud') { d.loyalty = clamp(d.loyalty + 15, 0, 100); stress(g, -4); return `"네가 내 자랑이다." ${J(p.name, '은/는')} 대답 대신 고개를 깊이 숙였다.`; }
    if (key === 'envy') { d.loyalty = clamp(d.loyalty - 12, 0, 100); stress(g, 8); return `잘했다는 말이 목에 걸려 나오지 않았다. ${J(p.name, '은/는')} 그 침묵을 오래 기억할 것이다.`; }
    const v = gainSkill(g, d.art, 2.5, ARTS[d.art].stat);
    d.loyalty = clamp(d.loyalty + 8, 0, 100);
    return `제자에게 배웠다. 부끄러울 줄 알았는데 이상하게 즐거웠다.${gains([up(ARTS[d.art].name, v)])}`;
  },
});

/* ---------- 문파 세우기 ---------- */
const foundArt = (g) => teachableArts(g).find((a) => mySkill(g, a) >= 70 && (M(g).grads.some((x) => x.art === a && x.good >= 0) || myDisciples(g).filter(([, d]) => d.art === a).length >= 2 || (shopApprentices(g).length > 0 && ['smithing', 'cooking', 'herbs', 'trade'].includes(a))));
ACTIONS.push({
  id: 'mentor_found', name: '내 문파 세우기', icon: 'crown',
  desc: '내 이름을 단 유파·학파·공방을 세운다. 솜씨 70 넘고 제자를 길러 냈어야 한다. 은화 80닢. 문파는 내가 죽어도 남는다.',
  available: (g) => ready(g) && (!M(g).school || M(g).school.closed) && !!foundArt(g) && canSpend(g, 80) && !sceneQueued(g, 'mentor_found'),
  run(g) {
    const art = foundArt(g);
    queueScene(g, 'mentor_found', { art });
    return `${placeName(here(g))}에 ${J(ARTS[art].house, '으로/로')} 쓸 집을 보러 다녔다.`;
  },
});
defineScene('mentor_found', {
  title: (g, s) => `${ARTS[s.art].house}의 현판`,
  text: (g, s) => `${placeName(here(g))}에 ${J(ARTS[s.art].house, '을/를')} 열 집을 구했다. 현판에 무슨 이름을 새길까. 이름은 한번 걸면 대대로 남는다.`,
  choices: (g, s) => {
    if (!canSpend(g, 80)) return [];
    const sx = ARTS[s.art].suffix;
    const opts = [`${g.player.name}${sx}`, `${g.player.lastName ?? g.player.name}${sx}`, `${placeName(here(g))}${sx}`];
    return [...[...new Set(opts)].map((n, i) => ({ label: `"${n}"`, key: `n${i}` })), { label: '아직 이르다', key: 'none' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '현판을 걸지 않았다. 아직 내 이름이 그만한 무게를 견딜지 모르겠다.';
    if (!spend(g, 80)) return '돈이 모자랐다.';
    const sx = ARTS[s.art].suffix;
    const opts = [...new Set([`${g.player.name}${sx}`, `${g.player.lastName ?? g.player.name}${sx}`, `${placeName(here(g))}${sx}`])];
    const name = opts[Number(key.slice(1))] ?? opts[0];
    const m = M(g);
    const gradsN = m.grads.filter((x) => x.art === s.art && x.good >= 0).length;
    m.school = { name, art: s.art, place: here(g), founded: g.date.year, founder: g.player.name, prestige: 8 + gradsN * 4, members: myDisciples(g).filter(([, d]) => d.art === s.art).length + gradsN, headId: null, heads: [{ name: g.player.name, y: g.date.year }], gens: 1, closed: false, peak: 0 };
    chron(g, `${g.player.name}, ${placeName(here(g))}에 ${J(name, '을/를')} 세우다.`, 80);
    log(g, `${J(name, '을/를')} 세웠다.`);
    note(g, `${placeName(here(g))}에 ${J(name, '을/를')} 세웠다.`);
    L(g).renown = (L(g).renown ?? 0) + 4;
    return `현판에 ${J(name, '을/를')} 새겼다. 망치 소리가 그치자 제자들이 박수를 쳤다. 내가 죽은 뒤에도 이 이름은 남을 것이다. 잘 남을지는 제자들에게 달렸다.`;
  },
});

/* ---------- 대를 넘어: 선대의 가르침 잇기 ---------- */
const schoolHead = (g) => { const s = M(g).school; return s && !s.closed && s.headId != null ? byId(g, s.headId) : null; };
ACTIONS.push({
  id: 'mentor_heritage', name: '선대의 가르침 잇기', icon: 'scroll',
  desc: '선대가 세운 문파를 맡은 옛 제자에게 찾아가 배운다. 솜씨가 차면 문파를 돌려 달라고 할 수 있다.',
  available: (g) => { const h = schoolHead(g); return playerAge(g) >= 10 && !traveling(g) && !isJailed(g) && !g.over && !!h && h.alive && here(g) === M(g).school.place && !sceneQueued(g, 'mentor_reclaim'); },
  run(g) {
    const s = M(g).school;
    const h = schoolHead(g);
    const art = s.art;
    if (playerAge(g) >= 20 && mySkill(g, art) >= Math.max(55, (h.skill ?? 0) - 5)) { queueScene(g, 'mentor_reclaim', { id: h.id }); return `${s.name}의 문을 두드렸다. 오늘은 배우러 온 것이 아니다.`; }
    const v = gainSkill(g, art, 2.2, ARTS[art].stat);
    tired(g, 6);
    h.affection = Math.min(100, (h.affection ?? 0) + 2);
    rel(h);
    return `${s.name}에서 ${J(h.name, '이/가')} ${J(ARTS[art].name, '을/를')} 가르쳐 주었다. "선대께서 제게 하신 말씀 그대로 전해 드리지요." 손끝에서 할아버지 대의 가르침이 느껴졌다.${gains([up(ARTS[art].name, v)])}`;
  },
});
defineScene('mentor_reclaim', {
  title: (g) => `${J(M(g).school?.name ?? '문파', '을/를')} 돌려받다`,
  text: (g, s) => { const p = byId(g, s.id); return `${J(p.name, '이/가')} 선대에게서 문파를 맡은 지 오래다. 내 솜씨는 이제 그에 못지않다. 선대의 이름을 단 문파를 이제 내가 이어야 하지 않을까.`; },
  choices: (g, s) => (byId(g, s.id)?.alive && schoolHead(g)?.id === s.id ? [{ label: '정중히 돌려 달라고 한다', key: 'ask' }, { label: '함께 이끌자고 한다', key: 'share' }, { label: '그대로 맡겨 둔다', key: 'leave' }] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const sc = M(g).school;
    if (!p || !sc) return '이미 끝난 일이다.';
    if (key === 'leave') { p.affection = Math.min(100, (p.affection ?? 0) + 5); return '말을 꺼내지 않았다. 문파는 지금 손에서도 잘 굴러간다.'; }
    const ok = check(rng, g.player.stats.cha * 0.4 + (p.affection ?? 0) * 0.4 + (has(p, 'kind') || has(p, 'content') ? 15 : 0) - (has(p, 'ambitious') ? 15 : 0) + (key === 'share' ? 15 : 0), 30);
    if (ok) {
      sc.headId = null; sc.gens += 1; sc.heads.push({ name: g.player.name, y: g.date.year });
      chron(g, `${g.player.name}, ${J(sc.name, '을/를')} 물려받아 ${sc.gens}대 문주가 되다.`, 60);
      log(g, `${J(sc.name, '을/를')} 다시 이었다.`);
      return key === 'share'
        ? `${J(p.name, '은/는')} 웃었다. "선대께서도 그러셨을 겁니다." 현판 아래 이름이 하나 더 늘었다.`
        : `${J(p.name, '은/는')} 한참 현판을 보다가 고개를 끄덕였다. "선대의 핏줄이 돌아왔으니, 저는 사범 자리로 물러나지요."`;
    }
    addGrudge(g, p, 35, '선대의 문파를 빼앗으려 했다');
    sc.prestige = clamp(sc.prestige - 5, 0, 100);
    return `"선대께서 맡기신 것은 저입니다." ${p.name}의 목소리가 차가웠다. 문하 사람들이 둘로 갈라져 수군거렸다.`;
  },
});
defineScene('mentor_succession', {
  title: (g) => `${M(g).school?.name ?? '문파'}의 다음 문주`,
  text: (g, s) => {
    const sc = M(g).school;
    const best = byId(g, s.best);
    return `선대가 세운 ${J(sc.name, '이/가')} 주인을 기다린다. ${best ? `수제자 ${J(best.name, '이/가')} 상복을 입고 현판 아래 서 있다.` : '남은 제자도 몇 없다.'} 내 ${ARTS[sc.art].name} 솜씨는 ${skillWord(mySkill(g, sc.art))}.`;
  },
  choices: (g, s) => {
    const sc = M(g).school;
    if (!sc || sc.closed) return [];
    const best = byId(g, s.best);
    return [
      { label: '내가 잇는다', key: 'me' },
      ...(best?.alive ? [{ label: `수제자 ${best.name}에게 맡긴다`, key: 'best' }] : []),
      { label: '문을 닫는다', key: 'close' },
    ];
  },
  resolve(g, rng, s, key) {
    const sc = M(g).school;
    if (!sc) return '문파는 이미 없다.';
    const best = byId(g, s.best);
    if (key === 'close') {
      sc.closed = true;
      chron(g, `${J(sc.name, '이/가')} ${sc.gens}대 만에 문을 닫다.`, 60);
      log(g, `${J(sc.name, '이/가')} 문을 닫았다.`);
      return '현판을 내렸다. 남은 제자들은 저마다 짐을 쌌다. 선대의 이름은 이제 연대기에만 남는다.';
    }
    if (key === 'best' && best?.alive) {
      sc.headId = best.id; sc.heads.push({ name: best.name, y: g.date.year });
      best.affection = Math.min(100, (best.affection ?? 0) + 10);
      log(g, `${sc.name}을 수제자 ${best.name}에게 맡겼다.`.replace(`${sc.name}을`, J(sc.name, '을/를')));
      return `${J(best.name, '은/는')} 현판 앞에서 절했다. "선대의 가르침, 제가 지키겠습니다. 언젠가 돌려드릴 날까지." 문파를 찾아가면 선대의 가르침을 배울 수 있다.`;
    }
    sc.headId = null; sc.gens += 1; sc.heads.push({ name: g.player.name, y: g.date.year });
    chron(g, `${g.player.name}, ${J(sc.name, '을/를')} 이어 ${sc.gens}대 문주가 되다.`, 60);
    if (mySkill(g, sc.art) < 35) { sc.prestige = clamp(sc.prestige - 10, 0, 100); return `현판 아래 섰다. 선대의 제자들이 나를 보았다. 내 솜씨로는 모자라다는 것을, 그들도 나도 안다. 그래도 이름은 내가 잇는다.`; }
    return `현판 아래 섰다. 선대의 제자들이 하나둘 고개를 숙였다. ${sc.gens}대 문주.`;
  },
});

/* ---------- 매달: 제자가 자라고, 마음이 오가고, 소식이 온다 ---------- */
const FATE = {
  sword: { good: ['기사단의 교관이 되었다', '무술 대회에서 우승했다', '영주의 호위 대장이 되었다', '모험가 길드에서 이름을 얻었다'], bad: ['용병으로 떠돌다 객사했다', '술집 싸움에서 사람을 베어 쫓기는 몸이 되었다'] },
  magic: { good: ['마탑의 서열에 들었다', '영주의 궁정 마법사가 되었다', '새 주문을 하나 정리해 이름을 남겼다'], bad: ['금지된 마법에 손댔다가 행방이 끊겼다', '실험하다 손을 잃었다'] },
  letters: { good: ['왕도 학당의 학자가 되었다', '연대기를 엮는 서기가 되었다', '서당을 열어 아이들을 가르친다'], bad: ['남의 글을 베껴 제 것이라 했다가 망신을 당했다'] },
  herbs: { good: ['이름난 의원이 되었다', '돌림병을 막아 고장의 은인이 되었다', '궁정 의원의 조수가 되었다'], bad: ['독을 팔다 붙잡혔다', '엉터리 약을 지어 사람을 잃었다'] },
  smithing: { good: ['제 공방을 냈다', '기사단의 무구를 맡게 되었다', '이름을 새긴 칼이 왕도에서 팔린다'], bad: ['빚에 쫓겨 공방을 접었다'] },
  cooking: { good: ['영주의 주방장이 되었다', '왕도에 식당을 냈다', '잔칫상으로 이름이 났다'], bad: ['상한 고기를 내다 손님을 앓게 했다'] },
  trade: { good: ['상단을 꾸렸다', '길드의 행수가 되었다', '먼 바다 너머와 거래를 텄다'], bad: ['장부를 속이다 길드에서 쫓겨났다', '큰 빚을 지고 달아났다'] },
};
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const m = M(g);
  const now = mi(g);
  // 1) 제자들: 떠난 사람 정리, 저절로 조금 자람, 마음의 흐름
  for (const [id, d] of Object.entries(m.disciples)) {
    const p = byId(g, Number(id));
    if (!p || !p.alive || p.isPlayer || p.away) {
      delete m.disciples[id];
      if (p && !p.alive) { log(g, `제자 ${J(p.name, '이/가')} 세상을 떠났다.`); stress(g, 6); }
      continue;
    }
    grow(g, d, 0.15);
    const idle = now - d.taughtAt;
    let dl = idle > 3 ? -0.9 : -0.1;
    if (has(p, 'ambitious')) dl -= 0.35;
    if (has(p, 'cruel') || has(p, 'greedy')) dl -= 0.25;
    if (has(p, 'kind') || has(p, 'content') || has(p, 'diligent')) dl += 0.25;
    if (d.kid) dl += 0.3;
    d.loyalty = clamp(d.loyalty + dl, 0, 100);
  }
  // 2) 하산한 제자들의 소식
  for (const x of m.grads) {
    if (x.fate || now - x.at < 18 || !rng.chance(0.035)) continue;
    const p = byId(g, x.id);
    if (p && !p.alive) { x.fate = '세상을 떠났다'; x.fateAt = now; continue; }
    const goodP = 0.45 + (x.talent ?? 1) * 0.2 + (x.loyalty ?? 50) / 400 + (x.skill ?? 40) / 300;
    const good = rng.chance(Math.min(0.9, goodP));
    const pool = FATE[x.art] ?? FATE.trade;
    x.fate = rng.pick(good ? pool.good : pool.bad); x.fateAt = now;
    const sc = m.school && !m.school.closed && m.school.art === x.art ? m.school : null;
    const nm = x.name.split(' ')[0];
    if (good) {
      if (sc) sc.prestige = clamp(sc.prestige + 6, 0, 100);
      L(g).renown = (L(g).renown ?? 0) + 2;
      if (x.good >= 0) g.news.unshift({ text: `내게 배운 ${J(nm, '이/가')} ${x.fate}고 한다.`, rel: 100 });
      else g.news.unshift({ text: `나를 등지고 떠난 ${J(nm, '이/가')} ${x.fate}고 한다. 사람들은 그래도 내 제자였다고 말한다.`, rel: 100 });
      chron(g, `${x.name}, ${x.fate}. 스승은 ${g.player.name}.`, 40);
      log(g, `옛 제자 ${J(nm, '이/가')} ${x.fate}.`);
    } else {
      if (sc) sc.prestige = clamp(sc.prestige - 4, 0, 100);
      if (x.good >= 0) deed(g, 'honest', -2, null);
      g.news.unshift({ text: `${x.good >= 0 ? '내 제자였던' : '내 문하를 떠난'} ${J(nm, '이/가')} ${x.fate}고 한다.`, rel: 100 });
      log(g, `옛 제자 ${J(nm, '이/가')} ${x.fate}.`);
    }
  }
  // 3) 문파: 이름이 쌓이고, 문하생이 모이고, 맡은 제자가 늙는다
  const sc = m.school;
  if (sc && !sc.closed) {
    const head = sc.headId != null ? byId(g, sc.headId) : null;
    if (sc.headId != null && (!head || !head.alive)) {
      // 맡은 제자가 죽었다: 다음 사람이 없으면 문을 닫는다
      const next = m.grads.filter((x) => x.art === sc.art && x.good >= 0 && x.stay).map((x) => byId(g, x.id)).find((p) => p && p.alive && p.id !== sc.headId);
      if (next) { sc.headId = next.id; sc.heads.push({ name: next.name, y: g.date.year }); g.news.unshift({ text: `${J(sc.name, '이/가')} ${next.name}에게 넘어갔다고 한다.`, rel: 100 }); }
      else { sc.closed = true; chron(g, `${J(sc.name, '이/가')} 이끌 사람이 없어 문을 닫다.`, 50); log(g, `${J(sc.name, '이/가')} 문을 닫았다.`); }
    } else {
      const active = sc.headId == null ? myDisciples(g).filter(([, d]) => d.art === sc.art).length : 1 + (head.skill ?? 0) / 40;
      sc.prestige = clamp(sc.prestige + active * 0.05 - 0.04, 0, 100);
      if (rng.chance(0.02 + sc.prestige / 1500)) sc.members += 1;
      if (sc.headId == null && here(g) === sc.place) g.player.money += Math.round(1 + sc.prestige / 15 + sc.members / 10);
      for (const step of [25, 50, 75]) if (sc.prestige >= step && sc.peak < step) {
        sc.peak = step;
        L(g).renown = (L(g).renown ?? 0) + step / 5;
        chron(g, `${J(sc.name, '이/가')} ${prestigeWord(step)} 문파가 되다.`, 60);
        log(g, `${J(sc.name, '이/가')} ${prestigeWord(step)} 문파가 되었다.`);
      }
    }
  }
  // 4) 장면: 하산, 나를 넘음, 배신
  if (!ready(g) || L(g).queue.some((x) => /^mentor_/.test(x.kind)) || L(g).queue.length > 2 || now - m.sceneAt < 3) return;
  const fire = (kind, data) => { m.sceneAt = now; queueScene(g, kind, data); };
  const list = myDisciples(g);
  for (const [p, d] of list) {
    if (d.loyalty < 30 && d.skill >= 30 && rng.chance(0.05 + (has(p, 'ambitious') ? 0.05 : 0) + (has(p, 'cruel') ? 0.03 : 0))) {
      const how = d.art === 'sword' && d.skill >= mySkill(g, 'sword') - 15 && (has(p, 'brave') || has(p, 'ambitious') || has(p, 'cruel')) ? 'challenge'
        : has(p, 'greedy') || has(p, 'cruel') ? 'steal' : has(p, 'gossip') ? 'slander' : rng.pick(['rival', 'steal', 'slander']);
      return fire('mentor_betray', { id: p.id, how });
    }
  }
  for (const [p, d] of list) {
    if (!d.surpassed && d.skill > mySkill(g, d.art) + 1) return fire('mentor_surpass', { id: p.id });
  }
  for (const [p, d] of list) {
    if (ageYears(p) >= 17 && now - d.since >= 30 && d.skill >= Math.min(mySkill(g, d.art) - 8, 60) && now - (d.heldAt ?? 0) >= 12 && rng.chance(0.3)) return fire('mentor_graduate', { id: p.id });
  }
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g) => {
  const m = M(g);
  const elders = [];
  for (const [id, d] of Object.entries(m.disciples)) {
    const p = byId(g, Number(id));
    delete m.disciples[id];
    if (!p || !p.alive || p.isPlayer || g.player.familyIds.includes(p.id)) continue;
    // 스승을 잃은 제자: 선대의 문하로 남는다
    m.grads.push({ id: p.id, name: fullName(p), art: d.art, at: mi(g), fate: null, fateAt: null, good: d.loyalty >= 40 ? 1 : 0, gen: d.gen + 1, talent: d.talent, skill: Math.round(d.skill), loyalty: Math.round(d.loyalty), stay: true });
    p.skill = Math.max(p.skill ?? 0, Math.round(d.skill));
    elders.push([p, d]);
  }
  if (m.grads.length > 30) m.grads.splice(0, m.grads.length - 30);
  for (const x of m.grads) x.gen = (x.gen ?? 0) + (elders.some(([p]) => p.id === x.id) ? 0 : 1);
  m.sceneAt = 0; m.takenAt = 0;
  m.log.push({ y: g.date.year, m: g.date.month, text: '선대의 제자들이 이제 나를 본다.' });
  const sc = m.school;
  if (sc && !sc.closed) {
    if (sc.headId != null) {
      // 이미 옛 제자가 맡고 있다: 그대로
      const h = byId(g, sc.headId);
      if (h && (h.isPlayer || g.player.familyIds.includes(h.id))) sc.headId = null;
      return;
    }
    const cands = [...elders.map(([p, d]) => [p, d.skill]), ...m.grads.filter((x) => x.art === sc.art && x.good >= 0).map((x) => [byId(g, x.id), x.skill ?? 0])].filter(([p]) => p && p.alive && !p.isPlayer && !g.player.familyIds.includes(p.id));
    cands.sort((a, b) => b[1] - a[1]);
    const best = cands[0]?.[0] ?? null;
    queueScene(g, 'mentor_succession', { best: best?.id ?? null }, { first: true });
  }
});
HOOKS.newGame.push((g) => { M(g); });
HOOKS.migrate.push((g) => { M(g); });
