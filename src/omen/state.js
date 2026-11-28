// 예언과 징조. 상태는 g.omen 하나.
//   signs[]: 하늘과 땅의 징조 { id, kind, short, text, pre(큰일을 앞서는 참된 징조인가, 세상만 안다), start, due, snap,
//            read(내가 풀어 보았나), judged(null | true 참이라 봄 | false 헛것이라 봄), preached, end(null | 'came' | 'passed'), endAt }
//   prophecies{ seal | dynasty | star: { belief(0~100), status('whisper' | 'spread' | 'fulfilled' | 'broken'), chosen, lost[], claims } }
//     chosen: null | { id(사람 id, 대를 이으면 플레이어 id와 같아진다), name, by('seer' | 'temple' | 'cult'), stance(null | 'embrace' | 'deny' | 'use'), at }
//   comets[]: 꼬리별이 뜬 해   ash[]: 봉인의 고리가 풀린 해   belief: 세상이 징조를 믿는 정도   lore: 내 징조 풀이 솜씨
//   me{ preached, right, wrong, used, banned(달 번호까지 예언 금지), approved(교단이 인정한 예언자) }   seq, log[], seen[]
import { HOOKS } from '../hooks.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 징조의 갈래: 무엇을 앞서는가. 글은 [짧은 이름, 소식] 쌍.
export const SIGNS = {
  king: {
    name: '왕이 쓰러진다', portent: '왕좌의 주인이 바뀐다',
    texts: [
      ['흰 까마귀', '왕도의 종탑에 흰 까마귀가 내려앉아 사흘을 떠나지 않았다는 소식이 돈다.'],
      ['금 간 사자 석상', '왕궁 정원의 늙은 사자 석상에 금이 갔다고 한다. 정원지기는 손댄 적이 없다고 맹세했다.'],
      ['왕궁 위의 붉은 별', '왕도 사람들이 밤마다 왕궁 위로 붉은 별 하나가 낮게 걸린다고 수군거린다.'],
    ],
  },
  war: {
    name: '발하르트가 국경을 넘는다', portent: '동쪽에서 전쟁이 온다',
    texts: [
      ['붉은 강물', '동쪽 국경의 강물이 사흘 동안 붉게 흘렀다는 말이 돈다. 녹물이라는 사람도, 피라는 사람도 있다.'],
      ['칼 울음', '하르펜 대장간들의 쇠가 까닭 없이 운다고 한다. 늙은 대장장이들은 그것을 칼 울음이라고 부른다.'],
      ['거꾸로 나는 기러기', '발하르트 쪽 하늘로 기러기 떼가 거꾸로 날아갔다. 국경 마을 노인들이 짐을 싸기 시작했다.'],
    ],
  },
  north: {
    name: '마왕의 군세가 바다를 건넌다', portent: '북쪽에서 마왕의 군대가 움직인다',
    texts: [
      ['뭍에 오른 고래 떼', '북쪽 바다에서 고래 떼가 뭍으로 올라와 죽었다. 그라우벨 사람들이 바다 건너만 본다.'],
      ['남쪽으로 내려오는 늑대', '겨울도 아닌데 북부의 늑대들이 무리를 지어 남쪽으로 내려온다고 한다.'],
      ['저절로 오른 봉화 연기', '그라우벨 성벽의 봉화대에서 불을 피우지 않았는데 연기가 올랐다는 소문이다.'],
    ],
  },
  seal: {
    name: '봉인의 고리가 하나 더 풀린다', portent: '마신의 관을 묶은 고리가 또 하나 느슨해진다',
    texts: [
      ['문 두드리는 꿈', '여러 고장에서 같은 꿈을 꾸었다는 사람들이 나온다. 땅 밑에서 누가 문을 두드리는 꿈이다.'],
      ['흐려진 일곱째 별', '북쪽 하늘의 일곱 별 가운데 하나가 한 달 내내 흐려졌다. 세레니아의 별 보는 이들이 말을 아낀다.'],
      ['재 냄새 나는 우물', '우물물에서 쇳내와 재 냄새가 난다는 고장이 늘었다. 사제들은 입을 다문다.'],
    ],
  },
  crisis: {
    name: '나라에 큰 난리가 든다', portent: '나라 전체가 흔들릴 난리가 온다',
    texts: [
      ['떠나는 쥐 떼', '들쥐 떼가 한밤에 줄을 지어 마을을 빠져나갔다는 고장이 여럿이다. 노인들은 무언가 온다고 한다.'],
      ['꺼진 제단 촛불', '곳곳의 신전에서 제단 촛불이 저절로 꺼졌다는 말이 돈다. 바람 한 점 없던 밤이었다.'],
      ['머리 둘 달린 송아지', '머리 둘 달린 송아지가 났다가 사흘 만에 죽었다. 사람들이 그 집 앞을 돌아서 간다.'],
    ],
  },
  famine: {
    name: '흉년이 든다', portent: '가을에 거둘 것이 없다',
    texts: [
      ['번지는 깜부기', '밀밭에 까만 깜부기가 번진다는 소식이다. 아직은 이삭 몇 개뿐이라고들 한다.'],
      ['울지 않는 매미', '올여름에는 매미가 울지 않는다. 늙은 농부들이 하늘만 올려다본다.'],
      ['낮아지는 샘', '샘물이 한 뼘씩 낮아진다. 논두렁의 개구리 소리가 끊겼다.'],
    ],
  },
  era: {
    name: '시대가 바뀐다', portent: '세상이 쓰는 물건과 사는 법이 바뀐다',
    texts: [
      // 51단계: 꼬리별은 하늘의 별(stars)이 따로 띄운다. 여기서도 띄우면 몇 해마다 꼬리별이 겹쳐 떴다
      ['멈췄다 도는 탑시계', '성당 탑시계가 하룻밤 멈췄다가 아침에 저절로 다시 돌았다. 늙은이들은 세상이 바뀔 징조라 한다.'],
      ['낯선 물건', '장터에 처음 보는 물건을 늘어놓은 낯선 장사꾼들이 부쩍 늘었다. 늙은이들은 혀를 차고 아이들은 떠나지 않는다.'],
    ],
  },
};
export const SIGN_IDS = Object.keys(SIGNS);

// 세상에 도는 예언
export const PROPHECIES = {
  seal: {
    name: '일곱 번째 금의 예언',
    words: '"일곱 고리가 하나씩 금 가고 마지막 고리에 실 한 가닥이 남을 때, 잿빛 하늘 아래 난 이가 그 실을 잡으리라. 잡은 손이 묶을지 끊을지는 그 사람만 안다."',
    from: '세레니아의 고문서에 남은, 노아의 제자가 썼다는 글',
  },
  dynasty: {
    name: '사자 왕관의 예언',
    words: '"늙은 사자가 눕는 해에 두 새끼가 이를 드러내리라. 동쪽 별을 등진 쪽이 왕관을 쓰고, 서쪽 별을 등진 쪽은 탑에 갇히리라."',
    from: '왕도의 늙은 음유시인들이 부르던 노래',
  },
  star: {
    name: '꼬리별의 예언',
    words: '"꼬리 긴 별이 북쪽 하늘을 가르는 해에 난 아이가 시대의 문을 열리라. 문 너머가 빛일지 불일지는 말하지 않았다."',
    from: '성광국 대성당의 금서고에 있다는 두루마리',
  },
};
export const PRO_IDS = Object.keys(PROPHECIES);

export const BY_NAME = { seer: '별 보는 노인', temple: '교단의 사제들', cult: '검은 새벽' };
export const STANCE_NAME = { embrace: '받아들였다', deny: '부정했다', use: '이용했다' };
export const beliefWord = (v) => (v >= 75 ? '누구나 믿는다' : v >= 50 ? '많이들 믿는다' : v >= 25 ? '수군거린다' : '아는 사람이 드물다');
export const loreWord = (v) => (v >= 70 ? '옛 예언서를 꿰고 있다' : v >= 40 ? '징조를 읽을 줄 안다' : v >= 15 ? '몇 가지 징조를 안다' : '');

export const OS = (g) => (g.omen ??= fresh(g));
const freshMe = () => ({ preached: 0, right: 0, wrong: 0, used: 0, banned: 0, approved: false });
export function fresh(g) {
  const prophecies = {};
  for (const id of PRO_IDS) prophecies[id] = { belief: id === 'seal' ? 12 : id === 'dynasty' ? 20 : 8, status: 'whisper', chosen: null, lost: [], claims: 0 };
  // 플레이어가 꼬리별이 뜬 해에 태어났을 수도 있다 (열에 하나쯤)
  const seed = (Math.imul((g?.rngState?.s ?? 0) ^ 0x5bd1e995, 2654435761) >>> 16) + (g?.date?.year ?? 0);
  const comets = g?.date && seed % 10 === 3 ? [g.date.year] : [];
  return { signs: [], prophecies, comets, ash: [], belief: 30, lore: 0, me: freshMe(), seq: 1, log: [], seen: [], era: g?.realm?.era ?? 0 };
}
export function olog(g, text) {
  const O = OS(g);
  O.log.push({ y: g.date.year, m: g.date.month, text });
  if (O.log.length > 30) O.log.splice(0, O.log.length - 30);
}
export const pending = (g) => OS(g).signs.filter((s) => !s.end);
export const birthYear = (g, p) => Math.floor((mi(g) - 1 - (p?.ageMonths ?? 0)) / 12);

HOOKS.newGame.push((g) => { g.omen = fresh(g); });
HOOKS.migrate.push((g) => {
  const had = !!g.omen;
  const O = OS(g), f = fresh(g);
  if (!had) O.comets = [];
  for (const k of Object.keys(f)) O[k] ??= f[k];
  for (const id of PRO_IDS) O.prophecies[id] = Object.assign(f.prophecies[id], O.prophecies[id] ?? {});
  O.me = Object.assign(freshMe(), O.me ?? {});
});
// 대를 이으면: 예언 속 사람은 사람 id로 묶여 있어 그대로 이어진다. 징조 풀이 솜씨와 예언자 이름은 그 사람의 것이다.
HOOKS.heir.push((g) => {
  const O = OS(g);
  O.lore = Math.floor(O.lore * 0.3);
  O.me = freshMe();
  for (const s of O.signs) { s.read = false; s.judged = null; s.preached = false; }
});
