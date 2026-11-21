// 28단계 정령과 계약 (도우미스레드3). 상태는 g.spirit 하나.
//   서클 마법보다 오래된 길. 물·불·바람·땅의 정령은 작은 요정이 아니라, 호수 밑이나 화산 속에 사는 크고 낯선 것이다.
//   정령은 마력을 보지 않는다. 오히려 마력이 적게 태어난 사람의 눈이 맑아서 먼저 알아본다. 엘프와 드워프는 그 눈을 대대로 지켜 왔다.
//   계약은 조건(지켜야 할 것)과 대가로 맺고, 힘을 준다. 정령은 변덕스럽다. 조건을 어기면 은혜가 줄고, 계약이 깨지면 그 집안에 무언가 온다.
//
//   sight: 정령을 알아보는 눈 0(못 봄) 1(얼핏) 2(똑바로) 3(말을 섞음)
//   pact: null | { id, since, favor(0~100), breaches, lastPlace, placeSince, owed(공물 밀린 해) }
//   spirits{ id: { mood(-100~100), pacts(세상에서 맺어진 계약 수), lastWake } }   세상 쪽 정령의 기분 (플레이어 없이도 움직임)
//   curse: null | { id, until(달), heavy }   깨진 계약이 남긴 것 (대를 넘어 약하게 남는다)
//   me{ pacts, broken, seen }   log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';

// 정령 넷. home: 정령이 사는 자리(PLACES 밖), from: 거기 갈 수 있는 고장
export const SPIRITS = {
  sp_water: {
    name: '잠긴 얼굴', kind: '물', home: '달빛 호수', from: 'silverleaf', power: 6,
    desc: '대삼림 깊은 곳 달빛 호수 밑에 있는 것. 보름이면 물 위에 얼굴이 떠오른다. 엘프들은 그것을 옛 왕들의 얼굴이라 하지만, 오래 본 사람은 그 얼굴이 하나도 아니고 사람의 것도 아니라고 한다.',
    meet: '물가에 무릎을 꿇자 호수 전체가 숨을 멈췄다. 물 밑에서 얼굴 하나가 천천히 떠올랐다. 눈꺼풀이 없다. 그것이 내 쪽으로 입을 벌리자 귀가 아니라 폐로 말이 들어왔다.',
    term: '해마다 겨울이 오기 전에 아끼는 것 하나를 호수에 돌려줄 것.', gift: '상처가 빨리 아물고, 물에 빠져 죽지 않는다.',
    curse: '밤마다 물에 잠기는 꿈을 꾼다. 깨어 보면 입 안에 물이 고여 있다.',
  },
  sp_fire: {
    name: '붉은 이빨 속의 것', kind: '불', home: '붉은 이빨 화산', from: 'hammer', power: 14,
    desc: '드워프의 가장 뜨거운 대장간 밑, 붉은 이빨 화산의 목구멍에 사는 것. 드워프 장로들은 그것에게 이름을 붙이지 않는다. 이름을 부르면 그것이 대답하기 때문이다.',
    meet: '용암 둑 끝에 서자 열기가 멎었다. 불이 일어서서 사람 키의 세 배쯤 되는 모양을 이뤘다. 얼굴은 없고, 이빨만 있다. 그것이 웃었다. 웃음이 아니라 쇠가 녹는 소리였다.',
    term: '내 집 화덕의 불을 꺼뜨리지 말 것. 달마다 불에 은화 셋을 먹일 것.', gift: '팔에 힘이 붙고, 쇠를 다루는 손이 빨라진다.',
    curse: '손에 닿는 것이 자꾸 탄다. 집에 불이 난다.',
  },
  sp_wind: {
    name: '소금 바람', kind: '바람', home: '소금바위섬 절벽 끝', from: 'saltrock', power: 8,
    desc: '서쪽 바다 흰 바위섬의 절벽에서 한 번도 그친 적 없는 바람. 섬 사람들은 바람이 사람을 골라 데려간다고 믿는다. 데려간 사람의 목소리로 밤에 문을 두드린다고.',
    meet: '절벽 끝에 서자 바람이 그쳤다. 섬이 생긴 뒤 처음이라고 등대지기가 나중에 말했다. 등 뒤에서 누가 내 이름을 불렀다. 죽은 할머니의 목소리였다. 돌아보지 않았다.',
    term: '한 고장에 두 해 넘게 머물지 말 것.', gift: '발이 가벼워지고, 길에서 먼저 낌새를 챈다.',
    curse: '어디에 머물러도 바람이 문을 두드린다. 길을 자꾸 잃는다.',
  },
  sp_earth: {
    name: '구렁 밑의 숨', kind: '땅', home: '구렁목의 깊은 구렁', from: 'gorge', power: 10,
    desc: '구렁목 성벽이 막고 있는 깊은 구렁 맨 밑에서 올라오는 숨. 드워프 수비대는 돌문 밑에 귀를 대고 그 숨이 고른지 잰다. 숨이 거칠어지면 땅이 흔들린다.',
    meet: '횃불이 꺼진 뒤에도 한참을 내려갔다. 바닥에 손을 대자 돌이 따뜻했다. 돌이 숨을 쉬었다. 들숨에 몸이 끌려가고, 날숨에 밀려났다. 아주 큰 것의 가슴 위에 서 있었다.',
    term: '바다에 나가지 말 것. 땅에서 발을 떼지 말 것.', gift: '쉽게 지치지 않고, 마음이 잘 흔들리지 않는다.',
    curse: '밭이 마르고, 발밑 땅이 자꾸 꺼진다.',
  },
};
export const SPIRIT_IDS = Object.keys(SPIRITS);
export const spiritAt = (pl) => SPIRIT_IDS.find((id) => SPIRITS[id].from === pl) ?? null;
export const spiritName = (id) => (SPIRITS[id] ? `${SPIRITS[id].kind}의 정령 ${SPIRITS[id].name}` : '정령');

const freshMe = () => ({ pacts: 0, broken: 0, seen: 0 });
export const fresh = () => ({
  sight: 0, pact: null, curse: null, me: freshMe(), log: [],
  spirits: Object.fromEntries(SPIRIT_IDS.map((id) => [id, { mood: 0, pacts: 0, lastWake: 0 }])),
});
export const SP = (g) => (g.spirit ??= fresh());
export function splog(g, text) {
  const S = SP(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
// 타고난 눈: 마력이 적을수록, 엘프·드워프일수록 맑다
export function bornSight(g) {
  const p = g.player, race = p.race ?? 'human';
  const low = (p.manaPotential ?? 0.5) < 0.3;
  return (race === 'elf' || race === 'dwarf' ? 1 : 0) + (low ? 1 : 0) >= 1 ? 1 : 0;
}
export const pactOf = (g) => SP(g).pact;
export const hasPact = (g, id) => SP(g).pact?.id === id;

function fill(g) {
  const S = SP(g), f = fresh();
  for (const k of ['sight']) if (!Number.isFinite(S[k])) S[k] = f[k];
  S.me = Object.assign(freshMe(), S.me ?? {}); S.log ??= []; S.spirits ??= {};
  for (const id of SPIRIT_IDS) S.spirits[id] = Object.assign({ mood: 0, pacts: 0, lastWake: 0 }, S.spirits[id] ?? {});
  for (const id of Object.keys(S.spirits)) if (!SPIRITS[id]) delete S.spirits[id];
  if (S.pact && !SPIRITS[S.pact.id]) S.pact = null;
  if (S.curse && !SPIRITS[S.curse.id]) S.curse = null;
  S.pact ??= null; S.curse ??= null;
}
HOOKS.newGame.push((g) => { g.spirit = fresh(); });
HOOKS.migrate.push((g) => fill(g));
