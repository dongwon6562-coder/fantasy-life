// 평판과 소문에 쓰는 표.

// 평의 결: 한쪽 끝과 다른 쪽 끝. 값은 -100(나쁜 쪽) ~ 100(좋은 쪽).
export const AXES = {
  honest: { name: '정직', good: ['믿을 만하다', '말이 곧다', '거짓말을 모르는 사람'], bad: ['말이 미덥지 않다', '거짓말쟁이', '사기꾼'] },
  kind: { name: '자비', good: ['인정이 있다', '마음이 따뜻하다', '자비로운 사람'], bad: ['모질다', '잔혹하다', '피도 눈물도 없는 사람'] },
  generous: { name: '씀씀이', good: ['손이 크다', '후하다', '은화를 뿌리고 다니는 사람'], bad: ['짜다', '인색하다', '지독한 구두쇠'] },
  loyal: { name: '의리', good: ['의리가 있다', '한번 맺은 인연은 끝까지 간다', '목숨을 맡길 만한 사람'], bad: ['미덥지 못하다', '등 돌리는 사람', '배신자'] },
  brave: { name: '용기', good: ['담이 크다', '용감하다', '겁을 모르는 사람'], bad: ['몸을 사린다', '겁쟁이', '꽁무니부터 빼는 사람'] },
};
export const AXIS_IDS = Object.keys(AXES);

// 별명: 한 고장에서 이름이 널리 알려지고 평 하나가 두드러지면 붙는다
export const NICKS = {
  honest: ['곧은 혀', '두 얼굴'],
  kind: ['자비로운', '피 묻은 손'],
  generous: ['은화 뿌리는', '구두쇠'],
  loyal: ['의리의', '등 뒤의 칼'],
  brave: ['겁 없는', '꽁지 빠진'],
};

export function fameWord(n) {
  if (n < 5) return '아무도 모른다';
  if (n < 20) return '이름 정도는 안다';
  if (n < 45) return '꽤 알려졌다';
  if (n < 75) return '모르는 사람이 없다';
  return '전설처럼 입에 오르내린다';
}

// 저절로 생기는 평: 행동마다 [결, 값, 소문으로 도는 말]
export const DEEDS = {
  holy_heal: [['kind', 5, '아픈 사람을 기도로 고쳐 주었다더라']],
  crisis_help: [['kind', 6, '어려울 때 앞장서서 손을 보탰다더라'], ['brave', 3, null]],
  crisis_use: [['kind', -5, '남의 불행으로 한몫 챙겼다더라'], ['generous', -4, null]],
  gang_inform: [['loyal', -12, '같이 일하던 패거리를 경비대에 팔아넘겼다더라']],
  gang_job: [['honest', -2, '뒷골목 조직 일을 한다더라']],
  kin_adopt: [['kind', 8, '갈 데 없는 아이를 거두어 기른다더라'], ['generous', 3, null]],
  pirate_raid: [['kind', -8, '배를 털고 선원들을 바다에 던졌다더라'], ['brave', 3, null]],
  quest: [['brave', 2, '마물 잡는 의뢰를 마다하지 않는다더라']],
  party_quest: [['brave', 3, '동료들과 먼 의뢰를 다녀왔다더라'], ['loyal', 2, null]],
  party_manage: [['loyal', 1, null]],
  delve: [['brave', 2, '미궁에 겁도 없이 들어간다더라']],
  deep_descend: [['brave', 3, '깊은 구렁에 내려갔다 살아 나왔다더라']],
  work: [['honest', 0.4, null]],
  shop_manage: [['honest', 0.5, null]],
  domain_rule: [['kind', 0.6, null]],
};
// 들킨 죄: 기록에 남은 죄 한 건마다
export const CRIME_DEEDS = {
  pickpocket: [['honest', -6, '남의 주머니에 손을 댔다더라']],
  burglary: [['honest', -8, '빈집을 털다 들켰다더라']],
  fraud: [['honest', -12, '사람들을 속여 돈을 뜯었다더라']],
  snoop: [['honest', -4, '남의 집을 엿보고 다닌다더라']],
  blackmail: [['honest', -6, '약점을 잡아 사람을 협박했다더라'], ['kind', -6, null]],
  assault: [['kind', -10, '사람을 반쯤 죽도록 팼다더라']],
  attempt: [['kind', -16, '사람을 죽이려 했다더라']],
  murder: [['kind', -24, '사람을 죽였다더라'], ['honest', -6, null]],
  resist: [['brave', 6, '경비대에게 칼을 들었다더라'], ['honest', -4, null]],
  jailbreak: [['brave', 5, '감옥을 부수고 나왔다더라']],
  smuggling: [['honest', -5, '밀수품을 나른다더라']],
  extortion: [['kind', -8, '가게마다 돌며 돈을 뜯는다더라'], ['honest', -4, null]],
};

// 거짓 소문: 나를 미워하는 사람이 퍼뜨린다
export const LIES = [
  ['honest', -14, '빚을 떼먹고 도망친 적이 있다더라'],
  ['honest', -12, '저울 눈금을 속인다더라'],
  ['kind', -14, '자기 집 하인을 매질해 죽였다더라'],
  ['generous', -12, '굶는 이웃을 보고도 문을 걸어 잠갔다더라'],
  ['loyal', -14, '친구를 팔아 출세했다더라'],
  ['brave', -12, '마물 앞에서 동료를 버리고 달아났다더라'],
  ['honest', -10, '남의 아내와 밤마다 만난다더라'],
  ['kind', -10, '검은 새벽 집회에 드나든다더라'],
];

// 헛소문을 퍼뜨릴 때 고르는 말 (남에 대해)
export const SLANDERS = [
  '그 집 빵에서 쥐꼬리가 나왔다더라',
  '빌린 돈을 갚은 적이 없다더라',
  '밤마다 술에 취해 식구를 때린다더라',
  '도둑 길드와 줄이 닿아 있다더라',
  '마녀에게 약을 사다 쓴다더라',
];

// 장터와 큰 여관이 있어 소문이 빨리 도는 곳
export const MARKETS = { harfen: 1, leocast: 1, barka: 1, portel: 1, eisen: 0.6, klein: 0.6, solaris: 0.5, serenia: 0.5 };

// 평판이 나쁘면 맡기지 않는 일 (믿음이 필요한 일)
export const TRUST_SKILLS = ['letters', 'trade'];
export const TRUST_NPC_JOBS = ['guard', 'priest', 'shopkeeper', 'scholar', 'knight', 'guild_clerk'];
