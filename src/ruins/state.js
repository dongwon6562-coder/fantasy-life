// 31단계 고대 유적과 잃어버린 마법 (도우미스레드3). 상태는 g.ruins 하나.
//   마신이 오기 전, 서클 마법이 생기기도 전에 대륙에는 다른 방식으로 마력을 다루던 사람들이 있었다(explore의 사라진 문명 넷).
//   그들의 자리 몇 곳은 지도 안, 사람 사는 고장 가까이에 묻혀 있다. 들어가면 벽에 새긴 글 조각이 나오고,
//   고대어를 읽게 되면 잊힌 술식을 되살려 내 것으로 삼을 수 있다. 되살린 술식은 집안 마도서에 내 이름을 붙여 적고, 대를 넘어 남는다.
//   술식은 서클을 올려 주지 않는다. 서클이 모자라면 읽어도 쓰지 못한다(고서클은 여전히 드물다).
//
//   sites{ id: { known(0 모름 1 들음 2 들어가 봄), depth(0~3 내가 들어간 깊이), looted(0~100 도굴꾼이 털어 간 정도),
//               woke(null | 'stir' 뒤척임 | 'awake' 깨어남 | 'calmed' 내가 잠재움 | 'sealed' 마탑이 봉함), wokeAt, claim(null | 'tower' | 'robbers') } }
//   pieces{ site: 가진 글 조각 수 }  read: 읽은 조각 수  tongue: 고대어 0~100 (사람 몫)
//   known[]: 내가 쓰는 술식 (사람 몫)   work: null | { id, prog }  되살리는 중
//   book: null | { title, entries[{ art, name, by, y }] }  집안 마도서 (대를 넘어 남는다)
//   foe{ tower, church }: 나를 노리는 쪽   me{ digs, rooms, wakes, calmed, sold, shared, reported }   log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { L } from '../adventure/core.js';
import { CIVS } from '../explore/core.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const here = (g) => (g.life ? L(g).place ?? 'ern' : 'ern');
export const ruinsRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 433) ^ Math.imul(mi(g) * 71 + salt + 13, 2654435761)) | 0 });
export const civName = (c) => CIVS[c]?.name ?? '옛사람들';

// 유적 여섯. from: 들어가는 고장. danger: 함정과 무너짐의 어려움. rooms: 바깥·회랑·심장 세 칸의 글. wake: 깨어나는 것
export const RUINS = {
  starroom: {
    name: '별 읽는 방', from: 'estella', civ: 'arcana', danger: 42, open: true,
    rumor: '에스텔라 폐허를 뒤지던 사람이 무너진 성벽 밑에서 계단 하나를 더 찾았다고 한다. 내려갈수록 천장에 별이 박혀 있더라고.',
    rooms: [
      '무너진 성벽 밑 계단을 내려가자 둥근 방이 나왔다. 천장의 돌마다 작은 구멍이 뚫려 있어, 횃불을 비추면 바닥에 별자리가 찍힌다.',
      '좁은 회랑 벽에 같은 글자가 수백 번 되풀이되어 새겨져 있다. 한 줄마다 별 하나씩 자리가 조금씩 옮겨 간다. 누군가 몇 해 동안 하늘을 받아 적은 것이다.',
      '가장 안쪽 방 한가운데 돌 의자가 하나 있다. 의자 앞 바닥에 원이 일곱 겹으로 새겨져 있고, 일곱째 원은 중간에서 끊겼다. 의자 위에 마른 손 하나가 남아 있다.',
    ],
    wake: { name: '별을 보는 눈', pow: 120, text: '폐허 위 하늘에 별 하나가 더 떴다. 밤마다 그 별이 한 뼘씩 땅으로 내려온다. 에스텔라를 지나던 사람들이 그 빛을 쳐다본 뒤로 눈을 감지 못한다고 한다.' },
  },
  silvergal: {
    name: '버려진 은광 밑 회랑', from: 'verden', civ: 'first', danger: 48, open: false,
    rumor: '베르덴 서쪽 골짜기의 버려진 은광, 맨 아래 갱도가 왜 막혔는지 아느냐고 늙은 광부가 묻는다. 은을 캐다가 사람이 판 것이 아닌 벽에 닿았다고.',
    rooms: [
      '막힌 갱도를 뚫자 은광보다 훨씬 오래된 돌 회랑이 나왔다. 벽돌 하나하나에 같은 이름이 새겨져 있다. 한 사람의 이름을 만 번 쓴 것 같다.',
      '회랑 양쪽에 돌관이 줄지어 섰다. 뚜껑마다 이름이 지워져 있다. 정으로 일부러 쪼아 낸 자국이다. 이름을 지운 쪽이 이름을 두려워한 것이다.',
      '맨 끝 방에 왕좌 하나와, 왕좌에 쇠사슬로 묶인 갑옷이 있다. 사슬 고리마다 글자가 하나씩 새겨져 있다. 다 이으면 이름 하나가 된다.',
    ],
    wake: { name: '이름 없는 왕', pow: 150, text: '버려진 은광 쪽에서 밤마다 쇠사슬 끌리는 소리가 난다. 갱도 어귀에 서 있던 보초가 사라졌고, 그 자리에 그의 이름이 돌에 새겨져 있었다고 한다.' },
  },
  sunkstair: {
    name: '호수 밑 잠긴 계단', from: 'serenia', civ: 'tide', danger: 45, open: true,
    rumor: '가문 해에 세레니아 호수 물이 줄면 남쪽 물가에 돌계단 끝이 드러난다고 한다. 마탑은 그 계단 근처에 배를 못 대게 한다.',
    rooms: [
      '물이 빠진 계단을 따라 내려가자 바닥이 끝나지 않는다. 돌벽에 물결무늬가 새겨져 있고, 물결 사이사이에 글자가 숨어 있다.',
      '물에 잠겨 있던 넓은 방. 바닥에 조개껍데기로 만든 길이 깔려 있다. 길 끝 벽에 사람 키만 한 물고기가 새겨져 있는데, 물고기 배 속에 사람들이 들어 있다.',
      '맨 아래 방은 아직 물이 차 있다. 물 밑 바닥에 둥근 거울 같은 돌판이 있다. 들여다보면 호수 위 하늘이 아니라 바다가 비친다.',
    ],
    wake: { name: '물 밑의 합창', pow: 130, text: '세레니아 호수에서 밤마다 노랫소리가 올라온다. 물가에 나가 그 노래를 끝까지 들은 학생 둘이 아침에 물에 젖은 채 계단 끝에서 발견되었다.' },
  },
  stonegate: {
    name: '돌의 사람들의 문', from: 'silverleaf', civ: 'stone', danger: 38, open: false,
    rumor: '은잎 마을 엘프들이 절대 가지 않는 골짜기가 있다. 거기 이끼 덮인 돌문이 있는데, 엘프들은 그 문이 자기들보다 먼저 숲에 있었다고만 한다.',
    rooms: [
      '이끼를 걷어 내자 사람 키 세 배쯤 되는 돌문이 나왔다. 문은 닫혀 있지 않았다. 처음부터 문짝이 없었다. 문틀 안쪽에 손바닥 자국이 수백 개 찍혀 있다.',
      '문 너머는 나무뿌리 사이로 뚫린 돌길이다. 길가 돌마다 글자가 빼곡하다. 손을 대면 돌이 미지근하다. 땅 밑에서 무언가 천천히 숨 쉬는 것 같다.',
      '길 끝 둥근 광장 가운데 돌 화로가 있다. 땔감도 재도 없는데 화로 바닥이 따뜻하다. 화로 둘레에 둘러앉은 돌사람 일곱이 모두 화로 쪽으로 손을 뻗고 있다.',
    ],
    wake: { name: '이끼 문지기', pow: 115, text: '은잎 마을 뒤 골짜기의 나무들이 하룻밤 사이에 마을 쪽으로 한 걸음씩 옮겨 왔다. 엘프들이 화살촉을 갈기 시작했다.' },
  },
  ashaltar: {
    name: '잿빛 고원의 옛 제단', from: 'graubel', civ: 'first', danger: 52, open: false,
    rumor: '그라우벨 북쪽 잿빛 고원에 마신 전쟁보다 오래된 제단이 있다고 변경 순찰병들이 말한다. 눈이 와도 제단 위에는 쌓이지 않는다고.',
    rooms: [
      '잿빛 고원 바위틈의 제단. 윗돌은 녹아 유리가 됐는데, 옆면의 글은 멀쩡하다. 불이 이 돌만은 비켜 간 것 같다.',
      '제단 밑으로 내려가는 구멍. 벽에 사람들이 줄지어 무릎 꿇은 그림이 있고, 그들이 바라보는 쪽 벽은 일부러 깨 놓았다.',
      '제단 맨 밑에 재로 가득 찬 방. 재를 걷어 내자 바닥에 커다란 거울판이 나왔다. 거울에 비친 내 뒤로 사람들이 줄지어 서 있다. 돌아보면 아무도 없다.',
    ],
    wake: { name: '재의 전령', pow: 160, text: '그라우벨 북쪽 하늘에 재가 흩날린다. 봉화대 보초들이 고원 쪽에서 무릎 꿇은 사람들의 줄을 보았다고 한다. 다음 날 그 자리엔 재만 있었다.' },
  },
  tidepillars: {
    name: '썰물 기둥', from: 'saltrock', civ: 'tide', danger: 40, open: true,
    rumor: '소금바위섬 앞바다에 일 년에 몇 번, 아주 큰 썰물 때만 돌기둥 꼭대기가 드러난다. 섬 늙은이들은 그날 배를 띄우지 않는다.',
    rooms: [
      '썰물에 드러난 돌기둥 사이를 걸었다. 기둥마다 따개비 밑에 글자가 있다. 바닷물이 들어오기까지 반나절이다.',
      '기둥들이 둘러싼 한가운데에 내려가는 구멍이 있다. 안쪽 벽은 바닷물에 닳지 않았다. 물이 들어오지 않게 무언가가 막고 있었던 것이다.',
      '맨 밑 방 벽에 물때 표가 새겨져 있다. 달과 물의 높이를 수백 해 동안 적어 내려간 것이다. 마지막 칸에는 물이 아주 높이 그려져 있고, 그다음은 비어 있다.',
    ],
    wake: { name: '소금 어미', pow: 125, text: '소금바위섬 앞바다의 물이 사흘 동안 빠지지 않았다. 썰물 때가 됐는데도 물이 기둥 쪽으로 몰려가 서 있었다고 한다. 섬사람들이 배를 묶고 산으로 올라갔다.' },
  },
};
export const RUIN_IDS = Object.keys(RUINS);
export const ruinAt = (pl) => RUIN_IDS.find((id) => RUINS[id].from === pl) ?? null;

// 잊힌 술식. need: 유적마다 있어야 할 글 조각 수, tongue: 고대어, circle: 쓰는 데 필요한 서클 (술식은 서클을 올려 주지 않는다)
//   power: 싸움에 보태는 힘   kind: ward 결계 · lore 앎 · life 살림 · heal 다스림 · combat 싸움 · bind 묶기 · sight 멀리 보기
export const ARTS = {
  stone_voice: { name: '돌의 목소리', civ: 'stone', circle: 1, tongue: 20, need: { stonegate: 2 }, kind: 'lore', power: 0, desc: '돌에 손을 대면 거기 새긴 글자가 귀로 들린다. 고대어를 훨씬 빨리 읽고, 서고가 없어도 조각을 읽는다.' },
  ember_root: { name: '뿌리불', civ: 'stone', circle: 1, tongue: 30, need: { stonegate: 3 }, kind: 'life', power: 0, desc: '장작 없이 뿌리처럼 땅에 박혀 타는 불. 겨울 땔감이 덜 든다.' },
  star_ward: { name: '별자리 결계', civ: 'arcana', circle: 2, tongue: 35, need: { starroom: 2 }, kind: 'ward', power: 5, desc: '별자리를 땅에 옮겨 그린 결계. 서클 결계보다 얇지만, 무엇이 넘어오는지 미리 알려 준다.' },
  still_water: { name: '고인 물의 술식', civ: 'tide', circle: 2, tongue: 40, need: { sunkstair: 2 }, kind: 'heal', power: 0, desc: '몸 안의 물을 고요하게 한다. 마음이 덜 흔들리고, 상처가 덧나지 않는다.' },
  tide_call: { name: '물때 부르기', civ: 'tide', circle: 3, tongue: 50, need: { tidepillars: 2, sunkstair: 1 }, kind: 'combat', power: 6, desc: '물을 달처럼 끌어당긴다. 발밑의 땅이 젖고, 맞선 사람의 몸이 무거워진다.' },
  name_bind: { name: '이름 묶기', civ: 'first', circle: 3, tongue: 60, need: { silvergal: 3 }, kind: 'bind', power: 8, heresy: true, desc: '참이름의 한 조각을 붙잡아 상대를 묶는다. 첫 왕들이 마신 이전에 쓰던 술식이라 교단은 마신의 법이라 부른다.' },
  ash_mirror: { name: '재의 거울', civ: 'first', circle: 4, tongue: 70, need: { ashaltar: 2, starroom: 1 }, kind: 'sight', power: 0, desc: '재를 바른 거울에 먼 곳을 비춘다. 먼 소식의 참과 거짓이 보인다.' },
};
export const ART_IDS = Object.keys(ARTS);
export const LIBRARIES = { leocast: '왕립 서고', serenia: '마탑 서고', verden: '베르덴 성당 필사실', solaris: '대성당 금서고' };

const freshSites = () => Object.fromEntries(RUIN_IDS.map((id) => [id, { known: 0, depth: 0, looted: RUINS[id].open ? 15 : 0, woke: null, wokeAt: 0, claim: null }]));
const freshMe = () => ({ digs: 0, rooms: 0, wakes: 0, calmed: 0, sold: 0, shared: 0, reported: 0 });
export const fresh = () => ({ sites: freshSites(), pieces: {}, read: 0, tongue: 0, known: [], work: null, book: null, foe: { tower: 0, church: 0 }, me: freshMe(), log: [] });
export const RU = (g) => (g.ruins ??= fresh());
export function rlog(g, text) {
  const R = RU(g);
  R.log.push({ y: g.date.year, m: g.date.month, text });
  if (R.log.length > 30) R.log.splice(0, R.log.length - 30);
}
export const piecesOf = (g, site) => RU(g).pieces[site] ?? 0;
export const piecesAll = (g) => Object.values(RU(g).pieces).reduce((a, b) => a + (b > 0 ? b : 0), 0);
export const knowsArt = (g, id) => !!g.ruins?.known?.includes(id);

function fill(g) {
  const R = RU(g), f = fresh();
  for (const k of Object.keys(f)) R[k] ??= f[k];
  R.me = Object.assign(freshMe(), R.me ?? {});
  R.foe = Object.assign({ tower: 0, church: 0 }, R.foe ?? {});
  for (const id of RUIN_IDS) R.sites[id] = Object.assign({ ...f.sites[id] }, R.sites[id] ?? {});
  for (const id of Object.keys(R.sites)) if (!RUINS[id]) delete R.sites[id];
  R.known = (R.known ?? []).filter((id) => ARTS[id]);
  if (R.work && !ARTS[R.work.id]) R.work = null;
  if (R.book) R.book.entries = (R.book.entries ?? []).filter((e) => ARTS[e.art]);
  if (!Number.isFinite(R.tongue)) R.tongue = 0;
}
HOOKS.newGame.push((g) => { g.ruins = fresh(); });
HOOKS.migrate.push((g) => fill(g));
