// 47단계 학자의 길 (도우미스레드3). 상태는 g.scholar 하나. 앞머리 sc_.
//   research(발명)·school(학원과 시험)과 다른 '앎' 쪽이다. 서고에서 읽고, 필사하고, 옛 글을 옮기고, 책을 써서 남긴다.
//   내가 쓴 책은 세상에 남아 뒷사람이 읽는다. 자료가 모자라면 틀린 기록도 그대로 남는다. 틀린 곳은 몇십 년 뒤 누군가 짚어 낸다.
//
//   lore     학식 0~100 (사람 몫)          fame  학자로서 이름 0~100 (사람 몫)
//   notes    { 'h:주제' | 'g:고장' | 'n:짐승': 모은 자료 수 }  책을 쓸 때 쓴다
//   school   null | 학파 id                 standing{ 학파: 세상에서의 기세 0~100 }
//   job      null | { lib, rank(0 필사공 1 사서 2 사서장), prog, since, away }
//   draft    null | { kind, subj, prog, need, by }
//   books[]  세상의 책 { id, title, kind, subj, by(이름), pid, mine, school, y, quality, esteem, copies, where, wrong[{ text, found }], banned(null|나라), lost, readers, refutes, flatter }
//   read[]   읽은 책 id            spotted{ 책 id: 짚어 낸 틀린 곳 수 }
//   pupils[] { name, y, fate(null|'rise'|'fall'|'turn'), wrote }
//   greats[] 이름난 학자 { name, school, field, born, dies, alive, pid(사람이면) }
//   great    대학자가 된 해 (사람 몫)   seq, log[], me{ copied, read, wrote, debated, won, lectures, translated }
import { makeRng } from '../rng.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';

// 책 이름에 조사 붙이기: Q('봉인 고찰', '을/를') → 『봉인 고찰』을
export const Q = (t, pair) => `『${t}』${pair ? J(t, pair).slice(t.length) : ''}`;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const here = (g) => (g.life ? L(g).place ?? 'ern' : 'ern');
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 977) ^ Math.imul(mi(g) * 197 + salt + 29, 2654435761)) | 0 });

/* ---------- 서고: 고장마다 다른 책 ---------- */
// fields: 많이 가진 갈래 (h 역사 g 지리 n 박물 t 고대어)   censor: 금서를 가려내는 쪽   lean: 서고를 쥔 학파
export const LIBS = {
  leocast: { name: '왕립 서고', realm: 'leonia', fields: ['h', 'h', 'g'], censor: 'crown', lean: 'record', size: 3, line: '천장까지 닿는 서가에 왕국 칠백 년의 문서가 꽂혀 있다. 사다리를 옮기는 소리만 들린다.' },
  serenia: { name: '회색 탑 서고', realm: 'serenia', fields: ['n', 't', 'n'], censor: null, lean: 'tower', size: 3, line: '탑 벽을 따라 나선으로 올라가는 서가다. 마력을 머금은 책은 손을 대면 따뜻하다.' },
  scholae: { name: '깃펜거리 책방 골목', realm: 'serenia', fields: ['g', 'n', 'h'], censor: null, lean: 'field', size: 2, line: '학생들이 베껴 쓴 싸구려 사본과 귀한 옛 책이 한 서가에 섞여 있다. 값은 주인 기분대로다.' },
  solaris: { name: '대성당 서고', realm: 'holy', fields: ['h', 'h', 't'], censor: 'church', lean: 'scripture', size: 3, line: '촛불 냄새가 밴 서가 끝에 쇠창살 문이 있다. 그 너머가 금서고다.' },
  riana: { name: '성 리아나 수도원 필사실', realm: 'holy', fields: ['h', 'n'], censor: 'church', lean: 'scripture', size: 1, line: '수도사들이 말없이 필사대에 엎드려 있다. 한 권을 베끼는 데 한 해가 걸린다고 한다.' },
  verden: { name: '베르덴 성당 필사실', realm: 'leonia', fields: ['h', 't'], censor: 'church', lean: 'scripture', size: 1, line: '좁은 방에 필사대 넷과 오래된 연대기 몇 권. 창밖으로 기사단 훈련장 소리가 들어온다.' },
  eisen: { name: '제국 대학 서고', realm: 'valhart', fields: ['g', 'h', 'g'], censor: 'crown', lean: 'record', size: 3, line: '서가마다 번호가 붙어 있고, 책을 꺼내려면 이름과 신분을 적어야 한다. 군용 지도가 한 층을 다 쓴다.' },
  silverleaf: { name: '엘프의 나무 서고', realm: 'elf', fields: ['n', 'h', 'n'], censor: null, lean: 'field', size: 2, line: '살아 있는 나무 줄기 속을 파낸 서고다. 책보다 노래로 남은 기록이 더 많다.' },
  hammer: { name: '돌판 서고', realm: 'dwarf', fields: ['g', 't'], censor: null, lean: 'record', size: 1, line: '책이 아니라 돌판이다. 드워프들은 종이를 믿지 않는다. 광맥과 갱도의 기록이 천 년 치 쌓여 있다.' },
  harfen: { name: '상인 조합 서고', realm: 'leonia', fields: ['g'], censor: null, lean: 'field', size: 1, line: '장부와 길 안내서가 대부분이다. 상인들은 어느 길이 며칠 걸리는지에만 관심이 있다.' },
  barka: { name: '바르카 책 시장', realm: 'free', fields: ['g', 'n', 'h'], censor: null, lean: null, size: 2, line: '어느 나라에서 금한 책이든 여기선 값만 맞으면 판다. 그래서 학자들이 몰래 들른다.' },
};
export const libAt = (pl) => LIBS[pl] ?? null;
export const FIELD = { h: '역사', g: '지리', n: '박물', t: '고대어' };

/* ---------- 학파 ---------- */
export const SCHOOLS = {
  record: { name: '기록 학파', word: '문서에 없는 것은 쓰지 않는다', home: 'leocast', rival: 'field', fields: ['h'], line: '옛 문서와 장부를 한 줄씩 맞대어 본다. 지루하지만 틀리는 일이 적다.' },
  field: { name: '발로 쓰는 학파', word: '가 본 곳, 본 것만 믿는다', home: 'scholae', rival: 'record', fields: ['g', 'n'], line: '책상보다 길 위에서 쓴다. 생생하지만 들은 말을 본 것처럼 적는 버릇이 있다.' },
  scripture: { name: '경전 학파', word: '세상 이치는 성전에 이미 있다', home: 'solaris', rival: 'tower', fields: ['h'], line: '성전과 맞지 않는 것은 다시 본다. 성당이 지켜 주지만, 성전이 틀린 곳에서는 같이 틀린다.' },
  tower: { name: '회색 탑 학파', word: '마력의 흐름으로 세상을 푼다', home: 'serenia', rival: 'scripture', fields: ['n', 't'], line: '짐승과 땅을 마력으로 설명한다. 대담하고, 교단이 싫어한다.' },
};
export const SCHOOL_IDS = Object.keys(SCHOOLS);

/* ---------- 쓸 거리 ---------- */
// 역사: 큰 옛일들. myths는 자료가 모자랄 때 책에 들어가는 그럴듯한 틀린 말
export const HIST = {
  seal: { name: '마신 전쟁과 봉인', need: 4, myths: ['봉인을 친 것이 용사 한 사람이었다고 적었다. 실은 일곱이 함께였다.', '마신이 봉인된 곳이 바다 밑이라고 적었다.', '봉인이 백 년마다 저절로 굳어진다고 적었다.'] },
  leo: { name: '영웅왕 레오의 건국', need: 3, myths: ['레오 왕이 대장장이의 아들이었다고 적었다. 오래된 노래를 문서로 믿은 것이다.', '왕도 백색 성을 레오가 사흘 만에 쌓았다고 적었다.', '첫 왕비가 엘프였다고 적었다.'] },
  estella: { name: '에스텔라의 멸망', need: 3, myths: ['에스텔라가 역병으로 망했다고 적었다. 실은 마신 전쟁 때 무너졌다.', '에스텔라 왕이 마신과 거래했다고 적었다.', '에스텔라 사람들이 모두 남쪽 바다로 떠났다고 적었다.'] },
  feud: { name: '레오니아와 발하르트의 백 년 다툼', need: 4, myths: ['첫 전쟁이 혼담이 깨져 일어났다고 적었다.', '국경 강의 이름이 원래 발하르트 말이었다고 적었다.', '두 왕가가 한 조상에서 났다고 적었다.'] },
  tower: { name: '마탑의 시작', need: 3, myths: ['첫 탑주가 일곱 서클이었다고 적었다.', '마탑이 처음엔 성당의 한 분원이었다고 적었다.', '회색 탑이 하룻밤 새 솟았다고 적었다.'] },
  faith: { name: '성광교가 일어난 내력', need: 3, myths: ['첫 성녀가 레오 왕의 누이였다고 적었다.', '성광교 첫 성당이 아벨이 아니라 왕도에 섰다고 적었다.', '성전이 처음부터 한 권이었다고 적었다.'] },
  elves: { name: '엘프와 사람의 옛 맹약', need: 3, myths: ['맹약이 전쟁에서 진 엘프의 항복 문서였다고 적었다.', '엘프가 사람에게 글자를 가르쳤다고 적었다.', '맹약이 이미 깨졌다고 적었다.'] },
  dwarves: { name: '드워프 씨족들의 산 밑 내력', need: 3, myths: ['드워프가 돌에서 태어났다고 적었다.', '쇠망치 골이 사람 손으로 처음 뚫렸다고 적었다.', '드워프 왕이 한 번도 산 밖으로 나온 적이 없다고 적었다.'] },
};
// 지리: 고장. 자료(가 본 횟수·읽은 횟수)가 모자라면 길이·물길·주인을 틀리게 적는다
export const GEO_MYTHS = [
  (p, o) => `${p}에서 ${o}까지 이레 길이라고 적었다. 그보다 훨씬 가깝다.`,
  (p) => `${p} 앞을 흐르는 물이 북쪽으로 흐른다고 적었다. 반대다.`,
  (p) => `${p} 사람들이 겨울마다 고장을 비우고 남쪽으로 떠난다고 적었다.`,
  (p) => `${p} 뒷산에 금맥이 있다고 적었다. 들은 말이다.`,
  (p) => `${p} 성벽이 옛 엘프가 쌓은 것이라고 적었다.`,
];
// 박물: 짐승과 마물. at: 볼 수 있는 고장
export const BEASTS = {
  wolf: { name: '마랑', at: ['ern', 'gruental', 'wolfwood', 'kalten', 'graubel'], need: 3, myths: ['마랑이 달 없는 밤에만 사냥한다고 적었다.', '마랑의 우두머리가 늘 암컷이라고 적었다.', '마랑 이빨을 지니면 늑대가 피해 간다고 적었다.'] },
  goblin: { name: '고블린', at: ['harfen', 'ern', 'gorge'], need: 3, myths: ['고블린이 쇠를 만지면 화상을 입는다고 적었다.', '고블린이 한 해면 다 자란다고 적었다.', '고블린이 말을 못 한다고 적었다. 그들끼리는 한다.'] },
  griffin: { name: '그리폰', at: ['graubel', 'kalten', 'silver'], need: 4, myths: ['그리폰이 알을 물가 모래에 묻는다고 적었다.', '그리폰이 평생 짝을 한 번만 짓는다고 적었다. 들은 이야기다.', '그리폰 깃털이 불에 타지 않는다고 적었다.'] },
  wyvern: { name: '와이번', at: ['gorge', 'hammer', 'kalten'], need: 4, myths: ['와이번이 어린 용이라고 적었다.', '와이번 독이 마르면 약이 된다고 적었다.', '와이번이 겨울잠을 잔다고 적었다.'] },
  spider: { name: '동굴 거미', at: ['verden', 'gorge', 'hammer'], need: 3, myths: ['동굴 거미 실로 짠 옷은 칼이 못 뚫는다고 적었다.', '동굴 거미가 빛을 보면 죽는다고 적었다.', '여왕 거미가 백 년을 산다고 적었다.'] },
  undead: { name: '해골 병사와 구울', at: ['verden', 'estella', 'abel'], need: 4, myths: ['해골 병사가 자기 이름을 부르면 멈춘다고 적었다.', '구울이 소금 선을 넘지 못한다고 적었다.', '언데드가 해 뜨면 재가 된다고 적었다. 그렇지 않다.'] },
  serpent: { name: '바다뱀과 갈고리 게', at: ['klein', 'portel', 'saltmare', 'saltrock'], need: 3, myths: ['바다뱀이 배의 노래를 따라온다고 적었다.', '갈고리 게가 보름마다 껍데기를 간다고 적었다.', '바다뱀 비늘로 만든 돛은 바람을 부른다고 적었다.'] },
  manabeast: { name: '마력에 물든 짐승', at: ['serenia', 'luen', 'silverleaf'], need: 4, myths: ['마력에 물든 곰이 사람 말을 알아듣는다고 적었다.', '마력에 물든 짐승 고기를 먹으면 마력이 는다고 적었다.', '마나 샘 곁 짐승은 늙지 않는다고 적었다.'] },
};
// 회색 탑 학파와 경전 학파가 각자 덧붙이기 쉬운 말 (틀린 말로 남는다)
export const BIAS = {
  scripture: { n: '짐승이 마신의 숨에서 났다고 적었다. 성전 구절에 맞춘 것이다.', h: '이 일이 신의 뜻이었다고 적고, 사람이 한 일은 줄였다.' },
  tower: { n: '모든 마물이 마나 샘에서 났다고 적었다. 탑의 이론을 앞세운 것이다.', h: '이 일의 뒤에 마력의 흐름이 있었다고 적었다. 증거는 없다.' },
  field: { g: '길에서 들은 소문 하나를 본 것처럼 적었다.' },
  record: {},
};
export const KIND = {
  history: { name: '역사서', f: 'h', words: ['내력', '연대기', '고찰', '전말'] },
  geography: { name: '지리서', f: 'g', words: ['지리지', '길과 물의 기록', '풍토기', '고장 안내'] },
  nature: { name: '박물지', f: 'n', words: ['박물지', '생태 기록', '습성 고찰', '도감'] },
  tongue: { name: '옛 글 옮김', f: 't', words: ['옮김', '역주', '풀이', '해독'] },
};
export const subjName = (kind, subj) => (kind === 'history' ? HIST[subj]?.name : kind === 'geography' ? placeName(subj) : kind === 'nature' ? BEASTS[subj]?.name : subj) ?? '알 수 없는 것';
export const noteKey = (kind, subj) => `${KIND[kind]?.f ?? 'x'}:${subj}`;
export const needOf = (kind, subj) => (kind === 'history' ? HIST[subj]?.need : kind === 'nature' ? BEASTS[subj]?.need : kind === 'geography' ? 3 : 4) ?? 3;

/* ---------- 이름난 학자들 ---------- */
export const SC_NAMES = ['아우구스트', '힐데가르트', '마테우스', '코르넬리아', '알렉시스', '유스티나', '바르톨로', '에르멘트루데', '고트하르트', '제바스티안', '로자문데', '클레멘스', '이레나', '파울리누스', '베아트릭스', '디오니스'];
export const SC_LAST = ['폰 아르트', '그라벤', '슈타인바흐', '로스펠트', '헬름', '에른스트', '벨츠', '아이흐', '모르겐', '자일러'];

/* ---------- 상태 ---------- */
const freshMe = () => ({ copied: 0, read: 0, wrote: 0, debated: 0, won: 0, lectures: 0, translated: 0, surveyed: 0 });
export const fresh = () => ({ lore: 0, fame: 0, notes: {}, school: null, standing: { record: 50, field: 40, scripture: 55, tower: 45 }, job: null, draft: null, books: [], read: [], spotted: {}, pupils: [], greats: [], great: null, seq: 1, log: [], me: freshMe(), seeded: false, tally: {} });
export const SS = (g) => (g.scholar ??= fresh());
export function fill(g) {
  const S = SS(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const k of Object.keys(f.me)) S.me[k] ??= 0;
  for (const k of Object.keys(f.standing)) S.standing[k] ??= f.standing[k];
  return S;
}
export function slog(g, text) {
  const S = SS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 40) S.log.splice(0, S.log.length - 40);
}
export const tally = (g, k) => { const t = SS(g).tally; t[k] = (t[k] ?? 0) + 1; };
export const bookById = (g, id) => SS(g).books.find((b) => b.id === id) ?? null;
export const myBooks = (g) => SS(g).books.filter((b) => b.mine);
export const liveBooks = (g) => SS(g).books.filter((b) => !b.lost);
export const loreWord = (v) => (v >= 80 ? '대륙의 학자들이 이름을 안다' : v >= 60 ? '이름난 학자' : v >= 40 ? '학자' : v >= 20 ? '공부하는 사람' : v >= 5 ? '책을 펴 본 사람' : '글을 겨우 읽는 사람');
export const rankOf = (g) => { const S = SS(g); return S.great ? '대학자' : S.lore >= 60 ? '이름난 학자' : S.lore >= 40 ? '학자' : S.lore >= 20 ? '학인' : S.lore >= 5 ? '책 읽는 사람' : null; };
export const JOB = ['필사공', '사서', '사서장'];
export const esteemWord = (v) => (v >= 80 ? '학자라면 누구나 읽는다' : v >= 60 ? '자주 인용된다' : v >= 40 ? '찾는 사람이 있다' : v >= 20 ? '서가 구석에 있다' : '거의 잊혔다');
