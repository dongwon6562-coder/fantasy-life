// 용사 시대의 성유물. 상태는 g.relic 하나.
//   오백 년 전 마신을 봉인한 용사 일행(용사 레오, 성녀 리아나, 마법사 노아, 드워프 전사 볼가르)이 남긴 물건 다섯.
//   진짜는 다섯뿐이고, 가짜는 장터마다 돈다. 유물은 교단·마탑·왕실·드워프·수집가·도굴꾼·검은 새벽·큰 인물 사이를 스스로 옮겨 다니고(플레이어 없이도),
//   땅에 묻혀 잊히기도 한다. 유물은 손에 쥔 사람을 고르거나 거부하고, 고른 사람에게는 힘과 함께 대가를 지운다.
//
//   r{ id: { holder, place(있는 고장 | null), legend(큰 인물 id | null), since, moves, bond('chosen'|'refused'|null, 내가 쥐었을 때만) } }
//   me{ known{ id: { holder, place, y } }(내가 들은 마지막 소문), found, given, sold, fakes(속아 산 가짜), refused, chosen }   fakes(장터에 도는 가짜 수)   log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { J } from '../narrative/text.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '알 수 없는 곳';

// 유물을 쥐는 쪽. seat: 그쪽이 유물을 모셔 두는 고장
export const HOLDERS = {
  crown: { name: '레오니아 왕실', seat: 'leocast', where: '왕도 보물고' },
  church: { name: '성광교 교단', seat: 'solaris', where: '금빛 대성당 성물실' },
  tower: { name: '마탑', seat: 'serenia', where: '세레니아 마탑 금고' },
  dwarf: { name: '쇠망치 골 장로회', seat: 'hammer', where: '드워프 대장간 깊은 방' },
  collector: { name: '바르카의 수집가', seat: 'barka', where: '자유도시 상인의 비밀 진열실' },
  robbers: { name: '도굴꾼', seat: null, where: '도굴꾼의 자루' },
  cult: { name: '검은 새벽', seat: null, where: '어딘가의 지하 제단' },
  lost: { name: '아무도', seat: null, where: '땅속' },
  legend: { name: '큰 인물', seat: null, where: '한 사람의 손' },
  me: { name: '나', seat: null, where: '내 손' },
};
// 성유물 다섯. test: 주인을 고르는 기준(stat 이름과 무게), fit: 이 유물을 쥘 만한 큰 인물 갈래, power: 고른 주인에게 더하는 힘
export const RELICS = {
  rl_sword: {
    name: '새벽빛', what: '용사 레오의 검', kind: '검', home: 'crown', power: 22,
    desc: '마신의 심장을 찌른 검. 칼날에 새벽 하늘 같은 빛이 돈다. 왕도 보물고에 있는 것은 가짜라는 말이 오래전부터 돈다.',
    choose: '칼자루를 쥐자 손바닥이 뜨거워졌다. 검이 나를 재고 있다.',
    yes: '빛이 칼날 끝까지 번졌다. 검이 나를 받아들였다. 이제 이 검이 가는 곳에 피가 따라온다.',
    no: '칼자루가 쇳물처럼 달아올랐다. 손을 놓았을 때는 손바닥 가죽이 벗겨져 있었다. 검은 나를 원하지 않는다.',
    price: '검을 쥔 뒤로 칼을 들고 찾아오는 자가 끊이지 않는다.',
    fit: ['sword', 'adventurer'], test: { str: 0.6, agi: 0.4, sword: 1.0 }, need: 120, start: { holder: 'lost', place: 'gorge' },
  },
  rl_shield: {
    name: '백색 방패', what: '용사 레오의 방패', kind: '방패', home: 'crown', power: 14,
    desc: '마왕 셋의 불을 받아 낸 방패. 칠이 다 벗겨졌는데도 흠집 하나 없다. 왕실이 대관식 때만 꺼낸다.',
    choose: '방패를 들어 올리자 팔이 땅에 박힐 듯 무거워졌다. 방패가 내가 누구를 지키는 사람인지 묻는다.',
    yes: '무게가 사라졌다. 방패가 깃털처럼 팔에 붙었다. 그 대신 누가 다치는 것을 보면 몸이 먼저 나간다.',
    no: '방패는 끝내 들리지 않았다. 억지로 들다 어깨가 빠졌다.',
    price: '방패를 쥔 뒤로 남이 다치는 것을 그냥 보지 못한다. 몸이 먼저 나가고, 상처가 는다.',
    fit: ['sword', 'holy'], test: { wil: 0.8, str: 0.5, kind: 1.2 }, need: 110, start: { holder: 'crown', place: 'leocast' },
  },
  rl_book: {
    name: '첫 기도서', what: '성녀 리아나의 기도서', kind: '성서', home: 'church', power: 6,
    desc: '성녀 리아나가 마신 전쟁 내내 품고 다닌 손바닥만 한 기도서. 마지막 장에 리아나의 피가 묻어 있다. 성광교 성물 가운데 가장 귀하다.',
    choose: '기도서를 펴자 글자가 흐려졌다가 하나씩 다시 떠올랐다. 책이 내 믿음을 읽는다.',
    yes: '마지막 장의 핏자국이 따뜻해졌다. 책이 나에게 펼쳐졌다. 교단은 이 일을 알면 나를 성인으로 모시거나, 이단으로 태울 것이다.',
    no: '책장이 저절로 덮이며 손가락을 베었다. 핏방울이 표지에 스며들지 않고 굴러떨어졌다.',
    price: '책을 쥔 뒤로 교단의 눈이 나를 떠나지 않는다. 믿음이 식으면 책이 무거워진다.',
    fit: ['holy'], test: { wil: 0.5, devotion: 1.2, kind: 0.6 }, need: 115, start: { holder: 'church', place: 'solaris' },
  },
  rl_ring: {
    name: '별자리 반지', what: '대마도사 노아의 반지', kind: '반지', home: 'tower', power: 10,
    desc: '노아가 봉인에 들어가기 전에 빼어 마탑에 맡겼다는 반지. 안쪽에 일곱 개의 술식 고리가 새겨져 있다. 끼면 별이 낮에도 보인다고 한다.',
    choose: '반지를 손가락에 대자 술식 고리 일곱이 하나씩 돌기 시작했다. 반지가 내 그릇을 잰다.',
    yes: '고리 셋이 멈추지 않고 돈다. 반지가 손가락에 맞게 줄어들었다. 밤마다 별 소리가 들린다. 잠이 줄었다.',
    no: '고리가 하나도 돌지 않았다. 반지는 손가락에서 미끄러져 떨어졌고, 그 자리에 얼음 같은 자국이 남았다.',
    price: '반지를 낀 뒤로 잠이 줄었다. 마력이 조금씩 차오르지만, 몸이 먼저 지친다.',
    fit: ['mage'], test: { int: 0.6, wil: 0.4, circle: 18 }, need: 125, start: { holder: 'tower', place: 'serenia' },
  },
  rl_axe: {
    name: '볼가르의 도끼', what: '드워프 전사 볼가르의 도끼', kind: '도끼', home: 'dwarf', power: 20,
    desc: '마왕군의 성문을 홀로 쪼갰다는 양날 도끼. 쇠망치 골 장로회는 이 도끼를 들 수 있는 자가 다시 나오기를 오백 년째 기다린다.',
    choose: '도끼 자루를 잡자 땅 밑에서 망치 소리가 울렸다. 도끼가 내 팔을 잰다.',
    yes: '도끼가 바닥에서 떨어졌다. 들렸다. 드워프들이 이 이야기를 들으면 나를 찾아올 것이다. 돌려 달라고, 혹은 함께 가자고.',
    no: '도끼는 바닥에서 한 치도 떨어지지 않았다. 허리에서 무언가 끊어지는 소리가 났다.',
    price: '도끼를 든 뒤로 쇠망치 골 드워프들이 끊임없이 사람을 보낸다.',
    fit: ['dwarf', 'sword'], test: { str: 1.1, wil: 0.4, dwarf: 30 }, need: 125, start: { holder: 'dwarf', place: 'hammer' },
  },
};
export const RELIC_IDS = Object.keys(RELICS);
export const relicName = (id) => (RELICS[id] ? `${RELICS[id].what} ${RELICS[id].name}` : '성유물');
// 유물이 지금 있는 곳을 말로
export function whereWord(g, id) {
  const x = RS(g).r[id], H = HOLDERS[x.holder];
  if (x.holder === 'legend') { const L0 = g.legends?.list?.find((p) => p.id === x.legend); return `${L0 ? `${L0.title} ${L0.name}` : '이름난 누군가'}의 손`; }
  if (x.holder === 'lost') return `${placeName(x.place)} 어딘가의 땅속`;
  if (x.holder === 'robbers') return `${placeName(x.place)} 근처 도굴꾼의 손`;
  if (x.holder === 'cult') return '검은 새벽의 손';
  if (x.holder === 'me') return '내 손';
  return `${H.name}의 ${H.where}`;
}

const freshR = (id) => ({ holder: RELICS[id].start.holder, place: RELICS[id].start.place, legend: null, since: 0, moves: 0, bond: null });
const freshMe = () => ({ known: {}, found: 0, given: 0, sold: 0, fakes: 0, refused: 0, chosen: 0 });
export const fresh = () => ({ r: Object.fromEntries(RELIC_IDS.map((id) => [id, freshR(id)])), me: freshMe(), fakes: 12, log: [] });
export const RS = (g) => (g.relic ??= fresh());
export function rlog(g, text) {
  const S = RS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 40) S.log.splice(0, S.log.length - 40);
}
export const mine = (g) => RELIC_IDS.filter((id) => RS(g).r[id].holder === 'me');
export const chosenMine = (g) => RELIC_IDS.filter((id) => RS(g).r[id].holder === 'me' && RS(g).r[id].bond === 'chosen');
// 소문을 듣는다: 내가 아는 마지막 자리
export function hear(g, id) {
  const x = RS(g).r[id];
  RS(g).me.known[id] = { holder: x.holder, place: x.place, legend: x.legend, y: g.date.year };
}

function fill(g) {
  const S = RS(g);
  S.r ??= {}; S.log ??= []; if (!Number.isFinite(S.fakes)) S.fakes = 12;
  S.me = Object.assign(freshMe(), S.me ?? {}); S.me.known ??= {};
  for (const id of RELIC_IDS) S.r[id] = Object.assign(freshR(id), S.r[id] ?? {});
  for (const id of Object.keys(S.r)) if (!RELICS[id]) delete S.r[id];
  for (const id of Object.keys(S.me.known)) if (!RELICS[id]) delete S.me.known[id];
  for (const x of Object.values(S.r)) {
    if (!HOLDERS[x.holder]) { x.holder = 'lost'; x.place = x.place && PLACES[x.place] ? x.place : 'gorge'; }
    if (x.place && !PLACES[x.place]) x.place = HOLDERS[x.holder].seat ?? 'gorge';
    if (x.holder !== 'me') x.bond = null;
  }
}
HOOKS.newGame.push((g) => { g.relic = fresh(); });
HOOKS.migrate.push((g) => fill(g));
export { J };
