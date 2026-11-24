// 43단계 마신 깊게 (도우미스레드3). 상태는 g.demongod 하나.
//   봉인(src/seal/)이 '지금 봉인이 얼마나 버티나'를 맡는다면, 여기는 '봉인된 것이 무엇이었나, 그 그림자가 지금 사람들에게 어떻게 닿나'를 맡는다.
//   - 옛 이야기 조각(LORE): 용사력 원년 봉인 전쟁의 이야기. 교단·엘프·드워프·마족·꿈속 목소리가 저마다 다르게 말한다. 무엇이 참인지 정해 두지 않는다.
//   - 옛 사도 일곱(APOSTLES): 오백 년 전 마신을 따르던 이들. 지금은 잠들었거나, 흩어졌거나, 아무도 모른다. 봉인이 약해지면 그 자리에서 뒤척인다.
//   - 유물(RELICS): 마신의 파편과 사도들의 물건. 손에 넣으면 힘이 오고 대가가 따른다. 세상 안에서 교단·마탑·사도회·떠돌이 손 사이를 옮겨 다닌다.
//   - 꿈의 목소리(voice): 마신 쪽에 가까이 갈수록 꿈에서 들린다. 거스르거나, 듣거나, 대답한다.
//   - 사도회 '일곱 의자'(order): 검은 새벽(faith) 안쪽의 오래된 결사. 회색 망토(demons)와는 다른 사람들이다.
//   - 감시탑의 파수꾼(watch): 노아의 감시탑을 섬기며 유물을 거둬 묶는 사람들. 봉인을 지키는 쪽.
//   g.demongod = { known[], voice, bond, dreamAt, relics{id:{at, place}}, stir{apostle:0~100}, order, watch,
//                  me{ side, guard, brk, refused{}, destroyed, gave, used, sold }, log[], newsAt }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const dgRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 557) ^ Math.imul(mi(g) * 191 + salt + 71, 2654435761)) | 0 });

// 옛 사도 일곱: 이름(호), 오백 년 전에 한 일, 지금 어디에 잠들었다고 하나, 뒤척이면 세상에 도는 말
export const APOSTLES = {
  ash: { name: '재의 사도', did: '마신의 앞에서 도시 셋을 태웠다고 한다. 불이 지나간 자리에는 지금도 풀이 나지 않는다.', rest: '천룡 산맥 남쪽 기슭, 이름 지워진 무덤', stirs: '천룡 산맥 남쪽 기슭에서 밤마다 재가 눈처럼 날린다는 말이 돈다.' },
  sleep: { name: '잠의 사도', did: '사람들의 꿈으로 들어가 마신의 말을 옮겼다. 마을 하나가 한꺼번에 잠든 채 깨지 않았다는 기록이 있다.', rest: '세레니아 호수 밑 어딘가', stirs: '세레니아 쪽에서 같은 꿈을 꾸었다는 사람들이 늘었다. 꿈속에서 누가 종을 친다고 한다.' },
  chain: { name: '사슬의 사도', did: '드워프 대장장이였다. 마신을 위해 사람을 묶는 사슬을 벼렸고, 끝에 가서는 마신을 묶는 사슬도 벼렸다고 한다.', rest: '드워프 대장간 바닥, 쇠사슬 쐐기 아래', stirs: '드워프 대장간 바닥에서 쇠사슬이 저절로 울린다고 한다. 장인들이 망치를 놓고 귀를 기울인다.' },
  tongue: { name: '혀의 사도', did: '말로 나라 둘을 갈라 서로 싸우게 했다. 그가 지나간 왕궁마다 형제가 형제를 죽였다고 전한다.', rest: '아무도 모른다. 죽지 않았다는 말도 있다', stirs: '궁정마다 없던 소문이 한꺼번에 돈다. 누가 처음 말했는지 아무도 모른다.' },
  hunger: { name: '굶주림의 사도', did: '그가 지나간 들판은 세 해 동안 아무것도 맺지 않았다. 마신의 군세는 굶은 땅을 건너 남쪽으로 왔다.', rest: '북부 변경의 소금 들판', stirs: '북부 소금 들판 가장자리 밭의 보리가 여물기 전에 하얗게 말랐다고 한다.' },
  mirror: { name: '거울의 사도', did: '얼굴을 바꾸며 용사 일행 안에까지 들어왔다고 한다. 그가 누구였는지는 기록마다 다르다.', rest: '깨진 거울 조각 일곱으로 흩어졌다고 한다', stirs: '얼굴이 둘인 사람을 보았다는 이야기가 장터마다 하나씩 생겼다.' },
  seventh: { name: '이름 없는 일곱째', did: '기록에는 의자만 있고 이름이 없다. 일곱째가 있었는지조차 학자들은 다툰다.', rest: '알 수 없다', stirs: '사도회 사람들이 일곱째 의자 앞에 촛불을 켜기 시작했다는 말이 들린다.' },
};
export const APOSTLE_IDS = Object.keys(APOSTLES);

// 유물: 누구 것이었나, 힘(쥐고 있으면), 대가(달마다), 목소리가 얼마나 커지나
export const RELICS = {
  shard: { name: '마신의 손톱 조각', of: null, power: '마력이 조금 늘고 마법이 쉬워진다', cost: '꿈의 목소리가 가까워진다', voice: 1.2, pow: 3 },
  bell: { name: '잠의 종', of: 'sleep', power: '남의 꿈을 엿보고 옛일을 꿈으로 본다', cost: '잠이 얕아져 늘 지친다', voice: 1.6, pow: 0 },
  ring: { name: '검은 고리', of: 'chain', power: '손에 끼면 상대가 움츠러든다. 싸움에서 세진다', cost: '마음이 굳어 사람들이 멀어진다', voice: 1.4, pow: 8 },
  silver: { name: '은 혀', of: 'tongue', power: '말이 사람 마음에 박힌다. 흥정과 설득이 쉽다', cost: '거짓말이 저절로 나온다. 정직하다는 평이 깎인다', voice: 1.3, pow: 0 },
  bowl: { name: '빈 그릇', of: 'hunger', power: '굶어도 버틴다. 흉년에 무너지지 않는다', cost: '몸이 조금씩 마른다', voice: 1.3, pow: 0 },
  glass: { name: '금 간 거울 조각', of: 'mirror', power: '얼굴을 잠깐 바꿀 수 있다. 쫓기는 눈을 피한다', cost: '거울 속 얼굴이 가끔 내 것이 아니다', voice: 1.5, pow: 0 },
  crown: { name: '재의 관', of: 'ash', power: '불이 손에서 저절로 인다. 싸움에서 크게 세진다', cost: '목소리가 크게 다가오고 봉인이 조금씩 닳는다', voice: 2.6, pow: 14 },
};
export const RELIC_IDS = Object.keys(RELICS);
// 유물이 있을 수 있는 자리: 잃어버림·교단 보물고·마탑 금고·사도회·떠돌이 손(장물아비, 도굴꾼)·나
export const HOLDERS = { lost: '어딘가에 묻혀', church: '교단 보물고', tower: '마탑 금고', order: '사도회', drift: '떠돌이 손', me: '내 손', watch: '감시탑' };

// 옛 이야기 조각: topic(무엇에 대한 것), voice(누가 말하나), src(어디서 얻나), text
//   src: book(서고: 왕도·세레니아·성도), elder(엘프·드워프 노인: 은잎·망치 고개), dream(꿈의 목소리), relic(유물을 쥐었을 때), order(사도회 안), watch(파수꾼), demon(회색 망토), ruin(유적 공책)
export const LORE = {
  before: { topic: '마신이 오기 전', voice: '세레니아 서고', src: 'book', text: '서클 마법이 생기기 전, 대륙에는 다른 방식으로 마력을 다루던 사람들이 있었다. 그들이 사라진 자리에서 마신이 처음 이름을 얻었다고 한 줄 적혀 있다.' },
  name: { topic: '이름', voice: '교단 금서', src: 'book', text: '마신의 이름은 기록마다 지워져 있다. 이름을 적으면 그 종이가 마신 쪽으로 열린다고 믿었기 때문이다. 지운 자리의 칼자국만 남았다.' },
  came: { topic: '마신이 온 날', voice: '교단 연대기', src: 'book', text: '교단 연대기는 마신이 북쪽 얼음 해협 너머에서 왔다고 적는다. 빛의 여신을 버린 땅에 내린 벌이었다고.' },
  came_elf: { topic: '마신이 온 날', voice: '은잎 마을의 장로', src: 'elder', text: '엘프 장로는 고개를 젓는다. 마신은 바다를 건너오지 않았다고. 땅속에서, 사람들이 너무 깊이 파 들어간 자리에서 깨어났다고.' },
  came_voice: { topic: '마신이 온 날', voice: '꿈의 목소리', src: 'dream', text: '"나는 오지 않았다. 너희가 불렀다. 너희가 굶주릴 때, 미워할 때, 더 가지려 할 때마다 나는 조금씩 커졌다." 목소리는 웃지도 않고 말했다.' },
  apostles: { topic: '일곱 사도', voice: '사도회의 낡은 명부', src: 'order', text: '명부에는 의자 일곱이 그려져 있다. 재, 잠, 사슬, 혀, 굶주림, 거울. 일곱째 의자 밑에는 이름 대신 빈칸이 있다.' },
  chain: { topic: '사슬의 사도', voice: '망치 고개의 늙은 장인', src: 'elder', text: '늙은 드워프가 대장간 바닥을 가리켰다. "쐐기 사슬을 누가 벼렸는지 아나? 마신의 사도였던 자다. 마지막에 돌아섰지. 아니면 그것도 마신이 시킨 일이었거나."' },
  hero: { topic: '첫 용사', voice: '교단 연대기', src: 'book', text: '첫 용사는 성광교의 축복을 받은 평민이었다고 적혀 있다. 여신의 빛을 칼에 받아 마신의 심장을 찔렀다고.' },
  hero_watch: { topic: '첫 용사', voice: '감시탑의 파수꾼', src: 'watch', text: '파수꾼은 다르게 말한다. 첫 용사는 마신을 찌르지 못했다고. 찌를 수 없는 것이었기에 묶을 수밖에 없었다고. 그래서 봉인이라 부른다고.' },
  saint: { topic: '성녀', voice: '왕도 대성당 서고', src: 'book', text: '성녀는 봉인 의식 한가운데서 스스로 쐐기가 되었다. 왕도 대성당 지하의 유골함이 그 몸이라고 교단은 가르친다.' },
  noah: { topic: '노아', voice: '감시탑의 파수꾼', src: 'watch', text: '노아는 봉인이 닫히는 순간 자기 몸의 시간을 멈췄다. 파수꾼들 말로는 그 뒤로 한 번도 감시탑의 불을 끈 적이 없다. 단 한 번, 백 년쯤 전에 불이 흔들렸다고 한다.' },
  demons: { topic: '마족과 마신', voice: '회색 망토', src: 'demon', text: '회색 망토가 쓴웃음을 지었다. "너희는 마족이 마신의 자식이라 하지. 우리 할아버지의 할아버지들은 그의 사슬에 묶여 있었다. 너희보다 먼저, 더 오래."' },
  mirror: { topic: '거울의 사도', voice: '꿈의 목소리', src: 'dream', text: '"용사 일행 가운데 내 사람이 하나 있었다. 누구였는지 알고 싶나? 그 이름은 지금도 너희가 성인이라 부르는 이름들 사이에 있다." 목소리를 믿을 까닭은 없다.' },
  rite: { topic: '봉인 의식', voice: '세레니아 서고', src: 'book', text: '봉인은 쐐기 다섯과 불 하나로 이루어졌다. 다섯은 사람의 손으로 지키고, 불 하나는 노아가 지킨다. 다섯 가운데 둘만 남아도 한동안은 버틴다고 적혀 있다.' },
  relic_ash: { topic: '재의 사도', voice: '재의 관', src: 'relic', text: '관을 쥐자 열기와 함께 장면 하나가 스쳤다. 불타는 성벽 위에 선 사람, 울고 있었다. 태우고 싶어서 태운 것이 아니라는 듯.' },
  relic_sleep: { topic: '잠의 사도', voice: '잠의 종', src: 'relic', text: '종을 흔들지 않았는데 소리가 났다. 꿈에서 한 여인이 말했다. "나는 사람들을 재운 게 아니야. 깨어 있는 게 너무 아팠던 사람들을 쉬게 했을 뿐이야."' },
  ruin: { topic: '마신이 오기 전', voice: '유적의 벽', src: 'ruin', text: '유적 공책을 다시 넘기다 보니, 옛사람들의 글 가운데 같은 낱말이 되풀이된다. "파지 마라." 맨 아래 방일수록 그 글이 많다.' },
  end: { topic: '봉인 뒤', voice: '꿈의 목소리', src: 'dream', text: '"오백 년은 너희에게 길다. 나에게는 한 번 숨을 고르는 사이다. 서두르지 않는다. 너희가 나를 잊는 날을 기다릴 뿐이다."' },
};
export const LORE_IDS = Object.keys(LORE);
export const TOPICS = [...new Set(LORE_IDS.map((k) => LORE[k].topic))];

export const ORDER_RANKS = ['문지기', '잔 든 자', '빈 의자의 손'];
export const WATCH_RANKS = ['파수 견습', '불 지기', '탑의 눈'];
export const ORDER_CITIES = ['harfen', 'leocast', 'eisen', 'barka', 'serenia', 'verden'];
export const BOOK_CITIES = ['leocast', 'serenia', 'solaris'];
export const ELDER_CITIES = ['silverleaf', 'hammer'];
export const voiceWord = (v) => (v >= 80 ? '눈을 감으면 바로 곁에서 들린다' : v >= 60 ? '밤마다 또렷하게 들린다' : v >= 40 ? '꿈속에서 이름을 부른다' : v >= 20 ? '먼 데서 웅얼거린다' : v > 3 ? '가끔 꿈이 이상하다' : '');

export function fresh() {
  return {
    known: [], voice: 0, bond: 0, dreamAt: 0,
    relics: { shard: { at: 'lost', place: null }, bell: { at: 'lost', place: 'serenia' }, ring: { at: 'church', place: 'solaris' }, silver: { at: 'drift', place: 'barka' }, bowl: { at: 'lost', place: 'graubel' }, glass: { at: 'tower', place: 'serenia' }, crown: { at: 'lost', place: null } },
    stir: Object.fromEntries(APOSTLE_IDS.map((k) => [k, k === 'seventh' ? 0 : 5])),
    order: null, watch: null,
    me: { side: null, guard: 0, brk: 0, refused: {}, destroyed: 0, gave: 0, used: 0, sold: 0, tasks: 0 },
    log: [], newsAt: 0,
  };
}
export const DG = (g) => (g.demongod ??= fresh());
export function dlog(g, text) {
  const S = DG(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export const held = (g) => RELIC_IDS.filter((k) => g.demongod?.relics?.[k]?.at === 'me');
export const knowsLore = (g, id) => !!g.demongod?.known.includes(id);
// 아직 모르는 조각 하나 (출처 맞는 것)
export const nextLore = (g, src, rng) => { const c = LORE_IDS.filter((k) => LORE[k].src === src && !knowsLore(g, k)); return c.length ? (rng ? rng.pick(c) : c[0]) : null; };
export const addLore = (g, id) => { const S = DG(g); if (!id || S.known.includes(id)) return null; S.known.push(id); return LORE[id]; };

function fill(g) {
  const S = DG(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const k of RELIC_IDS) S.relics[k] ??= f.relics[k];
  for (const k of APOSTLE_IDS) S.stir[k] ??= f.stir[k];
  S.me = Object.assign(f.me, S.me ?? {});
}
HOOKS.newGame.push((g) => { g.demongod = fresh(); });
HOOKS.migrate.push((g) => { fill(g); });
