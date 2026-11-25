// 결투를 볼맛 나게 (46단계): 상대의 성격과 버릇, 장소와 관중, 합 사이의 짧은 장면, 상대의 대사, 부위 상처, 다양한 끝.
// 규칙(수끼리의 상성, 피해 눈금)은 duel.js가 맡고, 여기는 글과 자료만 둔다. 피·절단 묘사는 없다(아픔은 글로).
import { J } from '../narrative/text.js';
import { SCHOOLS } from './schools.js';

const pick = (rng, arr) => arr[Math.floor(rng.next() * arr.length)];

// ---------- 성격: 수의 무게를 조금 바꾸고, 대사의 결을 정한다 ----------
export const TRAITS = {
  hasty: { name: '성급함', desc: '먼저 들어오고, 맞으면 더 세게 들어온다', w: { heavy: 1.3, quick: 1.3, guard: 0.7 } },
  patient: { name: '신중함', desc: '기다리고 받아친다', w: { guard: 1.4, quick: 1.1, heavy: 0.8 } },
  sly: { name: '속임수', desc: '거짓 낌새를 흘리고 허초를 즐긴다', w: { feint: 1.5 }, trick: 0.15 },
  proud: { name: '자존심', desc: '물러서지 않는다. 지고 있어도 몰아친다', w: { heavy: 1.4 } },
  cold: { name: '냉정함', desc: '내 버릇을 빨리 읽는다', w: {}, adapt: 0.15 },
};
export const TRAIT_IDS = Object.keys(TRAITS);
// 성향(STYLES)과 유파에서 성격을 고른다
export function traitFor(rng, foe) {
  if (foe.trait && TRAITS[foe.trait]) return foe.trait;
  const sc = SCHOOLS[foe.school];
  const by = { bold: ['hasty', 'proud'], steady: ['patient', 'cold'], tricky: ['sly', 'cold'], swift: ['hasty', 'sly'] }[foe.style] ?? TRAIT_IDS;
  if (sc?.fit?.includes?.('wil') && rng.chance(0.4)) return 'proud';
  return pick(rng, by);
}

// ---------- 버릇: 상대는 어떤 때 늘 같은 수를 낸다. 간을 보면 알아챈다 ----------
export const HABITS = {
  cornered: { name: '몰리면 크게 휘두른다', move: 'heavy', when: (d) => d.fhp < d.fhp0 * 0.45 },
  repeat: { name: '이긴 수를 한 번 더 낸다', move: null, when: (d) => !!d.last && d.last.result === 'lose' },
  third: { name: '세 합마다 속임수를 섞는다', move: 'feint', when: (d) => d.round % 3 === 2 },
  hurt: { name: '맞고 나면 곧장 짧게 되찌른다', move: 'quick', when: (d) => !!d.last && d.last.result === 'win' },
  opener: { name: '첫 합은 늘 받아치기로 연다', move: 'guard', when: (d) => d.round === 0 },
};
export const HABIT_IDS = Object.keys(HABITS);
export const habitMove = (d) => {
  const h = HABITS[d.foe.habit];
  if (!h || !h.when(d)) return null;
  return h.move ?? d.last?.theirs ?? null;
};

// ---------- 장소와 관중 ----------
export const VENUES = {
  dojo: { name: '도장', crowd: 30, open: ['도장 마루가 발밑에서 삐걱인다.', '벽에 걸린 목검들이 조용히 내려다본다.'], cheer: ['문하생들이 숨을 삼킨다.', '마루 끝에 앉은 사범이 눈을 가늘게 뜬다.', '누군가 무릎을 치는 소리가 났다.'] },
  square: { name: '광장', crowd: 70, open: ['광장 돌바닥 위로 사람들이 둥글게 모여들었다.', '분수대 가장자리까지 구경꾼이 올라섰다.'], cheer: ['구경꾼들이 와 하고 소리를 질렀다.', '누군가 내기 돈을 외친다.', '아이 하나가 어른 다리 사이로 고개를 내밀었다.'] },
  court: { name: '궁정 마당', crowd: 45, open: ['줄을 친 마당 둘레에 관리들과 귀족들이 서 있다.', '높은 자리에서 누군가 손수건을 쥐고 내려다본다.'], cheer: ['귀부인들 사이에서 낮은 탄성이 번졌다.', '서기가 붓을 멈추고 고개를 들었다.', '심판관이 헛기침을 했다.'] },
  field: { name: '전장', crowd: 55, open: ['양쪽 진 사이 빈 땅에 둘만 남았다.', '깃발들이 바람에 펄럭이고, 병사들이 창 자루로 땅을 친다.'], cheer: ['양쪽 진에서 함성이 오갔다.', '창 자루가 한꺼번에 땅을 쳤다.', '누군가 내 이름을 외쳤다.'] },
  arena: { name: '투기장', crowd: 95, open: ['철문이 닫히고 모래가 발목까지 빠진다.', '층층이 쌓인 관중석이 함성으로 흔들린다.'], cheer: ['관중석이 발을 굴렀다.', '돈주머니가 모래 위로 날아들었다.', '함성이 귀를 먹먹하게 했다.'] },
  road: { name: '인적 드문 곳', crowd: 5, open: ['둘 말고는 지켜보는 사람이 없다. 바람 소리만 들린다.', '새벽 안개가 발목에 감긴다.'], cheer: ['멀리서 새가 날아올랐다.', '바람이 풀을 눕혔다.'] },
};
const KIND_VENUE = {
  rival: 'dojo', feud: 'dojo', mentor_test: 'dojo', mentor_betray: 'dojo', sw_secret: 'dojo', legend_leon: 'dojo', legend_leon_last: 'dojo', spar: 'dojo',
  arena: 'arena', contest_arena: 'arena', law_combat: 'court', legend_challenge: 'square', insult: 'square', mage_rival: 'square',
  noble: 'road', wanderer: 'road', legend_cecilia: 'road',
};
export const venueFor = (kind, opts = {}) => (VENUES[opts.venue] ? opts.venue : KIND_VENUE[kind] ?? (/war|army|siege/.test(kind ?? '') ? 'field' : 'square'));

// ---------- 합 사이의 짧은 장면: 거리·숨·땀·발놀림 ----------
const BEAT = {
  even: ['서로 반 걸음씩 돌며 거리를 잰다.', '칼끝과 칼끝 사이가 한 뼘. 아무도 먼저 움직이지 않는다.', '발밑의 흙이 사각거린다. 둘 다 숨을 죽였다.', '바람이 멎었다. 칼날에 빛이 한 줄 맺힌다.'],
  ahead: ['상대의 발이 무거워졌다. 뒤꿈치가 땅에 붙는다.', '상대가 칼을 고쳐 쥔다. 손바닥에 땀이 밴 모양이다.', '내 숨은 고르다. 상대의 숨소리가 들린다.'],
  behind: ['이마의 땀이 눈으로 흘러든다. 눈을 깜빡일 틈이 없다.', '팔이 무겁다. 칼이 반 치쯤 처졌다.', '숨이 가쁘다. 상대가 그걸 알아챈 눈치다.'],
  late: ['합이 길어졌다. 둘 다 어깨로 숨을 쉰다.', '칼자루가 땀에 미끄럽다. 다음 한 번이 끝일지 모른다.', '해가 기울었다. 그림자가 길게 늘어진다.'],
};
export function beatLine(rng, d) {
  const sw = d.mom - d.fmom;
  const pool = d.round >= 7 ? BEAT.late : sw >= 2 || d.fhp / d.fhp0 < d.hp / d.hp0 - 0.25 ? BEAT.ahead : sw <= -2 || d.hp / d.hp0 < d.fhp / d.fhp0 - 0.25 ? BEAT.behind : BEAT.even;
  const fresh = pool.filter((t) => !d.seen?.includes(t));
  const t = pick(rng, fresh.length ? fresh : pool);
  (d.seen ??= []).push(t);
  if (d.seen.length > 8) d.seen.shift();
  return t;
}
export function cheerLine(rng, d) {
  const v = VENUES[d.venue];
  if (!v || v.crowd < 20) return '';
  const fresh = v.cheer.filter((t) => !d.seen?.includes(t));
  const t = pick(rng, fresh.length ? fresh : v.cheer);
  (d.seen ??= []).push(t);
  return t;
}

// ---------- 상대의 대사 ----------
const SAY = {
  open: {
    hasty: ['"빨리 끝내지."', '"말은 필요 없다. 덤벼."'],
    patient: ['"먼저 오시오. 기다리는 건 익숙하니."', '"서두를 것 없소."'],
    sly: ['"걱정 마시오, 정정당당하게 하겠소." 웃음이 얄팍하다.', '"오른쪽을 조심하시오." 친절한 척이다.'],
    proud: ['"내 이름을 기억해 두어라. 진 뒤에 떠올릴 수 있게."', '"물러서는 법은 배운 적이 없다."'],
    cold: ['아무 말도 없다. 눈만 나를 훑는다.', '"……시작하지."'],
  },
  hit: {
    hasty: ['"제법이군!" 이를 악문다.', '"이번엔 운이었다."'],
    patient: ['"……좋은 수였소."', '상대가 말없이 숨을 고른다.'],
    sly: ['"아야, 아프군." 눈은 웃지 않는다.', '"그렇게 나온단 말이지."'],
    proud: ['"이 정도로 나를 꺾을 셈이냐!"', '"감히……."'],
    cold: ['상대의 눈빛이 한층 차가워졌다.', '"기억해 두지."'],
  },
  ahead: {
    hasty: ['"벌써 지쳤나?"', '"끝내 주마!"'],
    patient: ['"검을 내려도 부끄러울 것 없소."', '"이제 보이오, 그대의 버릇이."'],
    sly: ['"방금 그 얼굴, 아주 좋았소."', '"다음엔 어디를 노릴지 맞혀 보시오."'],
    proud: ['"보아라, 이것이 격의 차이다."', '"무릎을 꿇으면 살려 주지."'],
    cold: ['"끝이다."', '말없이 칼끝이 내 목을 겨눈다.'],
  },
};
export function sayLine(rng, d, when) {
  const lines = SAY[when]?.[d.foe.trait];
  if (!lines) return '';
  const fresh = lines.filter((t) => !d.said?.includes(t));
  if (!fresh.length) return '';
  const t = pick(rng, fresh);
  (d.said ??= []).push(t);
  return t.startsWith('"') ? `${d.foe.name}: ${t}` : t;
}

// ---------- 부위 상처 (글로만) ----------
export const PARTS = {
  arm: { name: '팔', me: '칼을 쥔 팔이 저려 온다.', foe: (F) => `${J(F, '이/가')} 팔을 감싸 쥐었다.`, scar: '팔에 남은 칼자국', hold: '팔에 힘이 덜 들어간다' },
  leg: { name: '다리', me: '디딤발이 휘청인다.', foe: (F) => `${J(F, '이/가')} 한쪽 다리를 끌기 시작했다.`, scar: '다리에 남은 칼자국', hold: '발이 무겁다' },
  side: { name: '옆구리', me: '옆구리가 화끈거린다. 숨을 쉴 때마다 결린다.', foe: (F) => `${J(F, '이/가')} 옆구리를 움켜쥐었다.`, scar: '옆구리에 남은 칼자국', hold: '숨이 짧다' },
  face: { name: '얼굴', me: '뺨이 뜨겁다. 칼끝이 스치고 지나갔다.', foe: (F) => `${F}의 뺨에 붉은 줄이 그어졌다.`, scar: '얼굴에 남은 흉터', hold: '' },
  shoulder: { name: '어깨', me: '어깨가 욱신거린다. 칼이 반 치 처진다.', foe: (F) => `${F}의 어깨가 처졌다.`, scar: '어깨에 남은 칼자국', hold: '칼이 처진다' },
};
export const PART_IDS = Object.keys(PARTS);
export const partFor = (rng, move) => pick(rng, { heavy: ['shoulder', 'arm', 'side'], quick: ['arm', 'side', 'leg', 'face'], guard: ['arm', 'shoulder'], feint: ['side', 'leg', 'face'], magic: ['side', 'arm'], aura: ['shoulder', 'side'] }[move] ?? PART_IDS);

// ---------- 결정적 순간 ----------
export const CRIT = {
  me: {
    text: (d) => `${J(d.foe.name, '이/가')} 크게 흔들렸다. 칼끝이 내려가고 가슴이 열렸다. 지금이다.`,
    moves: ['finish', 'disarm'],
  },
  foe: {
    text: (d) => `${J(d.foe.name, '이/가')} 기세를 몰아 온몸을 던져 온다. ${d.critTell}`,
    moves: ['dodge', 'block'],
  },
};
// 상대가 몰아칠 때, 어느 쪽으로 오는지 낌새 (감각이 높으면 믿을 만하다)
export const CRIT_TELLS = { dodge: '칼이 머리 위로 높이 올라간다. 받기엔 너무 무겁다.', block: '몸을 낮추고 짧게 파고든다. 피할 틈이 없다.' };

// ---------- 끝 ----------
export const END_WORDS = {
  kneel: (F) => `${J(F, '이/가')} 무릎을 꿇었다.`,
  disarm: (F) => `${F}의 칼이 손에서 튕겨 나가 땅에 꽂혔다. ${J(F, '이/가')} 빈손을 내려다보았다.`,
  retreat: (F) => `${J(F, '이/가')} 칼을 거두고 한 걸음 물러섰다. "……내가 졌소."`,
  fall: (F) => `${J(F, '이/가')} 무너지듯 쓰러졌다. 다시 일어나지 못했다.`,
  judged: (F) => `더 겨룰 기운이 둘 다 남지 않았다. 지켜보던 이들이 내 쪽으로 손을 들었다. ${J(F, '이/가')} 칼을 내렸다.`,
  lose: () => '더는 검을 들 수 없었다.',
  lose_disarm: (F) => `내 칼이 손에서 떨어졌다. ${J(F, '이/가')} 칼끝으로 내 칼을 멀리 걷어찼다.`,
  lose_judged: (F) => `더 겨룰 기운이 둘 다 남지 않았다. 지켜보던 이들이 ${F} 쪽으로 손을 들었다.`,
  lose_fall: () => '눈앞이 하얘졌다. 땅이 얼굴로 다가왔다. 더는 검을 들 수 없었다.',
};
