// 세상에서 일어난 일(사실)을 모으고, 그것이 사람 입을 타고 어떻게 들리는지 정한다.
//   take(g): 지금 세상 모습을 짧게 적은 것.  diff(g, before, after): 달라진 것 → 새 사실들.
//   KINDS[갈래]: { at(d,g) 일어난 고장, big, official(나라가 알리는 일), truth(d,g), wrong[(d,g,rng)] 틀리게 도는 판, song(d,g)? 노래가 되면 }
import { PLACES } from '../places.js';
import { J } from '../narrative/text.js';
import { REALMS } from '../realms/data.js';
import { LANDS } from '../politics/data.js';
import { KINDS as CALAMITY, REGIONS } from '../nature/state.js';
import { DRAGONS } from '../dragon/state.js';
import { RUINS } from '../ruins/state.js';
import { INVENTIONS } from '../history/powers.js';
import { LORDS } from '../revolt/index.js';
import { placeName } from './state.js';

const CAL_WRONG = {
  drought: [(n) => `${n}에선 사람들이 풀뿌리를 캐 먹는다는 말이 돈다.`, (n) => `${n}의 강이 바닥을 드러내서 옛 마을 터가 물 밖으로 나왔다는 말이 돈다.`, (n) => `${n}에선 우물물 한 동이를 은화 한 닢에 판다는 말이 돈다.`],
  flood: [(n) => `${n}에서 마을 셋이 통째로 떠내려갔다는 말이 돈다.`, (n) => `${n}의 둑을 누가 일부러 터뜨렸다는 말이 돈다. 윗마을과 아랫마을이 서로를 탓한다고 한다.`],
  winter: [(n) => `${n}에선 서서 얼어 죽은 사람이 봄까지 그대로 있었다는 말이 돈다.`, (n) => `${n}의 늑대들이 굶주려 마을 안까지 들어온다는 말이 돈다.`],
  quake: [(n) => `${n}에서 땅이 갈라져 그 밑에서 옛 성벽이 나왔다는 말이 돈다.`, (n) => `${n}의 땅울림이 산 밑 무언가가 뒤척인 탓이라는 말이 돈다.`],
  locust: [(n) => `${n}에선 메뚜기 떼가 지나간 뒤 빨래까지 갉아 먹혔다는 말이 돈다.`, (n) => `${n}의 메뚜기 떼가 바람을 타고 이쪽으로 온다는 말이 돈다. 사람들이 서쪽 하늘을 살핀다.`],
  storm: [(n) => `${n}의 폭풍에 배가 백 척 넘게 가라앉았다는 말이 돈다.`, (n) => `${n}의 해변에 처음 보는 커다란 뼈가 밀려왔다는 말이 돈다.`],
};
const full = (id) => REALMS[id]?.name ?? '먼 나라';
const cap = (id) => REALMS[id]?.capital ?? 'leocast';
const rn = (d) => d.name ?? '국왕';

export const KINDS = {
  king_dead: {
    at: () => 'leocast', big: true, official: true,
    truth: (d) => `국왕 ${rn(d)}께서 승하하셨다. 국상 동안 혼례와 잔치를 미루라는 포고가 붙었다.`,
    wrong: [
      () => '국왕이 독살당했다는 말이 돈다. 누가 독을 탔는지는 말하는 사람마다 다르다.',
      () => '국왕이 숨을 거둔 지 벌써 몇 달이 지났는데 궁정이 쉬쉬해 왔다는 말까지 돈다.',
      () => '국왕이 숨을 거두기 전에 후계를 바꿨다는 말이 돈다. 누구로 바꿨는지는 아무도 모른다.',
    ],
    song: (d) => `늙은 왕 ${rn(d)}의 마지막 겨울을 부른 노래. 노래 속 왕은 창가에서 북쪽 하늘을 보며 숨을 거둔다. 정말 그랬는지 아는 사람은 없다.`,
  },
  crowned: {
    at: () => 'leocast', big: true, official: true,
    truth: (d) => `${rn(d)}의 대관식이 왕도에서 열렸다.`,
    wrong: [
      () => '대관식 날 왕관이 제단에서 굴러떨어졌다고 한다. 늙은이들은 나쁜 징조라며 혀를 찬다.',
      () => '새 왕이 첫 칙령으로 세금을 반으로 깎는다는 말이 돈다. 믿는 사람보다 믿고 싶은 사람이 많다.',
      () => '대관식에 큰 귀족 가문 절반이 나타나지 않았다고 한다.',
    ],
    song: (d) => `${rn(d)}의 대관식을 부른 노래. 해마다 부르는 사람에 따라 그날 성당에 날아든 비둘기 수가 늘어난다.`,
  },
  civilwar: {
    at: () => 'leocast', big: true, official: false,
    truth: () => '두 왕자가 저마다 왕을 칭했다. 왕국이 둘로 갈라졌다.',
    wrong: [
      () => '왕도가 불타고 있다는 말이 돈다. 성 밖 빈민가부터 탔다고 한다.',
      (d, g, r) => `${r.pick(['루돌프', '에릭'])} 왕자가 벌써 왕도를 손에 넣었다는 말이 돈다. 다음 날엔 정반대 말이 돈다.`,
      () => '이 틈에 제국군이 국경을 넘었다는 말까지 돈다.',
    ],
    song: () => '형제가 왕관 하나를 두고 칼을 든 해를 부른 노래. 노래에선 두 왕자가 한 어머니의 무덤 앞에서 마지막으로 만난다.',
  },
  prince_dead: {
    at: () => 'leocast', big: true, official: false,
    truth: (d) => `${d.who} 왕자가 죽었다. ${d.how}`,
    wrong: [
      (d) => `${d.who} 왕자가 사실은 살아서 바다 건너로 달아났다는 말이 돈다.`,
      (d) => `${d.who} 왕자를 죽인 것이 다른 왕자의 사람이라는 말이 돈다. 이름까지 붙어서 돈다.`,
    ],
  },
  war_on: {
    at: () => 'verden', big: true, official: true,
    truth: () => '발하르트 제국군이 국경을 넘었다. 징집령이 내렸다.',
    wrong: [
      (d, g, r) => `제국군이 ${r.pick(['오만', '십만', '이십만'])}이라고 한다. 세어 본 사람은 없다.`,
      () => '오르트 요새가 첫날 무너졌다는 말이 돈다.',
      () => '제국 황제가 몸소 군을 이끈다는 말이 돈다.',
    ],
    song: (d) => `제국과 ${(d.n ?? 1) <= 1 ? '처음' : `${['', '', '두', '세', '네', '다섯'][d.n] ?? d.n} 번째로`} 싸운 해를 부른 노래. 국경 강의 다리를 지킨 이름 없는 창병 셋 이야기가 들어 있다. 사람마다 그 셋의 고향을 자기 고장이라고 한다.`,
  },
  war_won: {
    at: () => 'verden', big: true, official: true,
    truth: () => '제국과의 전쟁에서 이겼다. 제국군이 국경 너머로 물러났다.',
    wrong: [
      () => '우리 군이 제국 땅 깊숙이 쳐들어가 성 셋을 빼앗았다는 말이 돈다.',
      () => '제국 황제가 무릎을 꿇고 강화를 빌었다는 말이 돈다.',
    ],
    song: () => '국경 강에서 제국군을 몰아낸 날을 부른 노래. 해가 갈수록 강물이 더 붉어진다.',
  },
  war_lost: {
    at: () => 'verden', big: true, official: true,
    truth: () => '제국과의 전쟁에 졌다. 국경 요새 하나와 배상금을 내주었다.',
    wrong: [
      () => '국경 요새 셋을 다 내줬다는 말이 돈다.',
      () => '배상금을 대느라 세금이 세 배로 오른다는 말이 돈다.',
      () => '강화 조건으로 공주를 제국에 보낸다는 말이 돈다.',
    ],
  },
  truce: {
    at: () => 'verden', big: true, official: true,
    truth: () => '세레니아의 중재로 제국과 휴전이 맺어졌다.',
    wrong: [
      () => '휴전이 맺어졌다는데, 국경 마을 사람들은 아직 제국군 깃발이 보인다고 한다.',
      () => '휴전은 핑계고 제국이 봄에 다시 온다는 말이 돈다.',
    ],
  },
  front: {
    at: () => 'verden', big: false, official: false,
    truth: (d) => (d.good ? '국경에서 우리 군이 제국군을 밀어냈다고 한다.' : '국경에서 우리 군이 밀리고 있다고 한다.'),
    wrong: [
      (d) => (d.good ? '제국군 천 명을 강물에 몰아넣었다는 말이 돈다. 강물이 사흘 동안 붉었다는 말까지 붙었다.' : '제국군이 베르덴 성문 앞까지 왔다는 말이 돈다.'),
      (d) => (d.good ? '제국 장군 하나가 포로로 잡혔다는 말이 돈다. 이름은 들을 때마다 다르다.' : '기사단이 통째로 무너졌다는 말이 돈다.'),
    ],
  },
  north_war: {
    at: () => 'graubel', big: true, official: true,
    truth: () => '북부에서 봉화가 올랐다. 붉은 마왕 가르베스의 군대가 해협을 건넜다.',
    wrong: [
      () => '마왕이 몸소 해협을 건넜다는 말이 돈다. 본 사람은 다 죽었다고 한다.',
      () => '그라우벨이 벌써 포위됐다는 말이 돈다.',
    ],
    song: () => '북쪽 성벽에 봉화가 오른 밤을 부른 노래. 성벽 위 보초가 마지막으로 부른 이름이 후렴이다.',
  },
  north_fallen: {
    at: () => 'graubel', big: true, official: true,
    truth: () => '성채도시 그라우벨이 함락되었다. 북부 변경이 무너졌다.',
    wrong: [
      () => '그라우벨 사람이 하나도 살아 나오지 못했다는 말이 돈다. 피난민들이 그 말을 듣고 고개를 젓는다.',
      () => '마왕군이 벌써 베르덴 쪽으로 내려온다는 말이 돈다.',
    ],
    song: () => '그라우벨이 무너진 밤을 부른 노래. 듣던 사람 가운데 북쪽 출신은 꼭 자리를 뜬다.',
  },
  north_held: {
    at: () => 'graubel', big: true, official: true,
    truth: () => '북부 변경이 버텨 냈다. 가르베스의 군대가 바다 건너로 물러갔다.',
    wrong: [() => '변경백이 마왕과 몰래 약조를 맺어 물러나게 했다는 말이 돈다.'],
  },
  north_indep: {
    at: () => 'graubel', big: true, official: true,
    truth: () => '북부 변경백령이 중앙 왕국들과의 맹약을 끊고 홀로 서겠다고 했다.',
    wrong: [() => '변경백이 왕을 칭했다는 말이 돈다.', () => '변경백령이 제국 편에 붙었다는 말이 돈다.'],
  },
  lord: {
    at: (d) => d.seat ?? 'harfen', big: false, official: true,
    truth: (d) => `하르펜 일대 영주가 바뀌었다. 새 영주의 이름은 ${d.name}.`, only: 'leonia',
    wrong: [
      () => '새 영주가 첫해에 세금을 두 배로 올린다는 말이 돈다.',
      () => '옛 영주가 병이 아니라 집안사람 손에 죽었다는 말이 돈다.',
    ],
  },
  hero: {
    at: () => 'solaris', big: true, official: false,
    truth: () => '성도 솔라리스에서 새 용사가 선포되었다.',
    wrong: [
      () => '새 용사가 아직 열 살도 안 된 아이라는 말이 돈다.',
      () => '새 용사가 사실은 대주교의 숨겨 둔 손자라는 말이 돈다. 성당 앞에서 그 말을 하면 끌려간다.',
      () => '새 용사가 손을 대자 성당 종이 저절로 울렸다는 말이 돈다.',
    ],
    song: () => '금빛 갑옷의 소년 용사를 부른 노래. 성광국에서 온 노래라 끝이 늘 승리로 난다.',
  },
  noah: {
    at: () => 'graubel', big: false, official: false,
    truth: (d) => (d.lit ? '북쪽 감시탑에 다시 불이 켜졌다고 한다.' : '북쪽 감시탑의 불이 또 꺼졌다고 한다.'),
    wrong: [
      (d) => (d.lit ? '감시탑에 노아가 돌아왔다는 말이 돈다. 백 년 넘게 본 사람이 없는데도.' : '노아가 죽었다는 말이 돈다. 몇십 년마다 도는 말이다.'),
    ],
  },
  ruler: {
    at: (d) => cap(d.n), big: false, official: false,
    truth: (d) => `${full(d.n)}의 ${d.title} 자리가 바뀌었다. 새 ${J(d.title, '은/는')} ${d.name}.`,
    wrong: [
      (d) => `${full(d.n)}의 옛 ${J(d.title, '이/가')} 독살당했다는 말이 돈다.`,
      (d) => `${full(d.n)}에서 새 ${d.title} 자리를 두고 칼부림이 났다는 말이 돈다.`,
    ],
  },
  fwar: {
    at: (d) => cap(d.a), big: false, official: false,
    truth: (d) => `${J(full(d.a), '과/와')} ${full(d.b)} 사이에 전쟁이 났다.`,
    wrong: [
      (d) => `${J(full(d.a), '과/와')} ${full(d.b)} 사이에 전쟁이 났는데, 우리도 곧 끌려 들어간다는 말이 돈다.`,
      (d) => `${J(full(d.b), '이/가')} 첫 싸움에서 크게 졌다는 말이 돈다.`,
    ],
  },
  fpeace: {
    at: (d) => cap(d.a), big: false, official: false,
    truth: (d) => `${J(full(d.a), '과/와')} ${full(d.b)}의 전쟁이 끝났다.`,
    wrong: [(d) => `${J(full(d.a), '과/와')} ${J(full(d.b), '이/가')} 혼인으로 화해한다는 말이 돈다.`],
  },
  land: {
    at: (d) => cap(d.n), big: false, official: false,
    truth: (d) => `${J(d.land, '이/가')} ${full(d.n)} 손에 넘어갔다.`,
    wrong: [(d) => `${J(d.land, '이/가')} 불타 없어졌다는 말이 돈다.`, (d) => `${d.land} 사람들이 성문을 스스로 열었다는 말이 돈다.`],
  },
  calamity: {
    at: (d) => REGIONS[d.region]?.places?.[0] ?? 'harfen', big: false, official: false,
    truth: (d) => `${REGIONS[d.region]?.name ?? '먼 고장'}에 ${J(CALAMITY[d.kind]?.name ?? '재앙', '이/가')} 들었다고 한다.`,
    wrong: [
      (d, g, r) => r.pick(CAL_WRONG[d.kind] ?? CAL_WRONG.drought)(REGIONS[d.region]?.name ?? '먼 고장'),
      (d, g, r) => r.pick(CAL_WRONG[d.kind] ?? CAL_WRONG.drought)(REGIONS[d.region]?.name ?? '먼 고장'),
      (d) => `떠돌이 설교자들이 ${REGIONS[d.region]?.name ?? '먼 고장'}의 ${J(CALAMITY[d.kind]?.name ?? '재앙', '을/를')} 하늘의 벌이라고 외친다. 다음은 이 고장이라고 한다.`,
    ],
  },
  rising: {
    at: (d) => d.pl, big: false, official: false,
    truth: (d) => `${placeName(d.pl)}에서 ${J(LORDS[d.pl]?.folk ?? '백성', '이/가')} 들고일어났다고 한다.`,
    wrong: [
      (d) => `${placeName(d.pl)}의 대관이 성문에 매달렸다는 말이 돈다.`,
      (d) => `${placeName(d.pl)} 반란군이 벌써 수천이라는 말이 돈다.`,
    ],
  },
  rising_end: {
    at: (d) => d.pl, big: false, official: true,
    truth: (d) => (d.out === 'crushed' ? `${placeName(d.pl)} 봉기가 꺾였다. 광장에 교수대가 섰다고 한다.` : d.out === 'won' ? `${placeName(d.pl)} 봉기꾼들이 이겼다. 대관이 쫓겨났다고 한다.` : `${placeName(d.pl)} 봉기가 흐지부지 끝났다고 한다.`),
    wrong: [(d) => `${placeName(d.pl)} 봉기꾼들 우두머리가 아직 숲에 숨어 있다는 말이 돈다.`],
  },
  dragon: {
    at: (d) => DRAGONS[d.id]?.near ?? 'gorge', big: true, official: false,
    truth: (d) => `${J(DRAGONS[d.id]?.name ?? '용', '이/가')} 깨어났다고 한다. 산 아래 마을들이 짐을 싼다.`,
    wrong: [
      () => '산 너머 하늘이 사흘 동안 붉었다는 말이 돈다.',
      () => '용이 벌써 왕도 쪽으로 날아갔다는 말이 돈다. 왕도 사람들은 금시초문이다.',
      () => '용이 보물을 돌려받으러 깼다는 말이 돈다. 누가 훔쳤는지는 고장마다 다르다.',
    ],
    song: (d) => `${J(DRAGONS[d.id]?.name ?? '용', '이/가')} 깨어난 해를 부른 노래. 노래가 바뀔 때마다 탄 마을 이름도 바뀐다.`,
  },
  ruin_woke: {
    at: (d) => RUINS[d.id]?.from ?? 'leocast', big: true, official: false,
    truth: (d) => `${placeName(RUINS[d.id]?.from)} 근처 ${RUINS[d.id]?.name ?? '옛 유적'}에서 ${J(RUINS[d.id]?.wake.name ?? '무언가', '이/가')} 깨어났다고 한다. 그쪽 사람들이 짐을 싼다.`,
    wrong: [
      (d) => `${placeName(RUINS[d.id]?.from)} 땅 밑에서 마신의 졸개가 기어 나왔다는 말이 돈다.`,
      (d) => `${placeName(RUINS[d.id]?.from)} 쪽 도굴꾼들이 무덤을 잘못 건드려 저주가 퍼졌다는 말이 돈다. 그 고장 물건은 사지 말라고들 한다.`,
    ],
    song: (d) => `${RUINS[d.id]?.name ?? '옛 유적'}에서 깨어난 것을 부른 노래. 부를 때마다 그것의 키가 한 길씩 커진다.`,
  },
  ruin_sealed: {
    at: (d) => RUINS[d.id]?.from ?? 'leocast', big: false, official: false,
    truth: (d) => `세레니아 마탑이 ${placeName(RUINS[d.id]?.from)}의 ${J(RUINS[d.id]?.name ?? '옛 유적', '을/를')} 봉했다고 한다. 들머리에 마탑 표식이 붙었다.`,
    wrong: [(d) => `마탑이 ${placeName(RUINS[d.id]?.from)} 유적에서 보물을 몽땅 실어 갔다는 말이 돈다.`],
  },
  plague: {
    at: () => 'harfen', big: false, official: false,
    truth: () => '하르펜에서 돌림병이 돈다고 한다.',
    wrong: [
      () => '하르펜 우물에 누가 독을 풀었다는 말이 돈다. 사람들이 낯선 얼굴을 노려본다.',
      () => '하르펜에선 하루에 백 명씩 죽는다는 말이 돈다.',
    ],
  },
  invention: {
    at: (d) => INVENTIONS.find((v) => v.id === d.id)?.where ?? 'harfen', big: false, official: false,
    truth: (d) => `${INVENTIONS.find((v) => v.id === d.id)?.text ?? '새 물건이 나왔다'}고 한다.`,
    wrong: [
      (d) => `${placeName(INVENTIONS.find((v) => v.id === d.id)?.where)}에서 새로 만든 마도구가 터져 공방 하나가 날아갔다는 말이 돈다. 그래도 그 물건을 사려는 줄은 줄지 않는다고 한다.`,
      () => '새로 나온 마도구가 쓰는 사람 기운을 조금씩 빨아먹는다고 늙은이들이 수군거린다.',
    ],
  },
};

const lk = (e) => (e ? `${e.y}-${e.m}-${e.text}` : '');
const KEYS = (g) => {
  const r = g.realm ?? {}, P = g.politics ?? {};
  return {
    log: r.log?.length ?? 0, tail: lk(r.log?.[r.log.length - 1]), front: r.balhart?.front ?? 0, plague: !!g.world?.plague,
    rulers: Object.fromEntries(Object.entries(P.rulers ?? {}).map(([k, v]) => [k, v?.name ?? ''])),
    wars: (P.wars ?? []).map((w) => `${w.a}|${w.b}`),
    owner: { ...(P.owner ?? {}) },
    cal: (g.nature?.active ?? []).map((a) => `${a.id}`),
    rise: Object.fromEntries((g.revolt?.risings ?? []).map((x) => [x.id, x.phase])),
    drag: Object.fromEntries(Object.entries(g.dragon?.dragons ?? {}).map(([k, v]) => [k, v?.state])),
    inv: [...(g.history?.inventions ?? [])],
    ruin: Object.fromEntries(Object.entries(g.ruins?.sites ?? {}).map(([k, v]) => [k, v?.woke ?? null])),
  };
};
export const take = KEYS;

// 세계 연대기 글 → 갈래
const LOG_KIND = [
  [/승하$/, 'king_dead', (t, g) => ({ name: t.replace(/^국왕 /, '').replace(/ 승하$/, '') || g.realm?.king?.name })],
  [/ 즉위$/, 'crowned', (t) => ({ name: t.replace(/ 즉위$/, '') })],
  [/계승 내전 발발/, 'civilwar', () => ({})],
  [/^(루돌프|에릭) 왕자 (사망|독살)/, 'prince_dead', (t) => ({ who: t.startsWith('루돌프') ? '루돌프' : '에릭', how: /독살/.test(t) ? '숙소에서 독살된 채 발견되었다.' : '사냥터에서 말에서 떨어졌다.' })],
  [/^발하르트 제국과 \d+번째 전쟁 시작/, 'war_on', (t) => ({ n: +(t.match(/(\d+)번째/)?.[1] ?? 1) })],
  [/^발하르트와의 전쟁 패배/, 'war_lost', () => ({})],
  [/^발하르트와의 전쟁 승리/, 'war_won', () => ({})],
  [/^발하르트와 휴전$/, 'truce', () => ({})],
  [/북부 전쟁 발발/, 'north_war', () => ({})],
  [/그라우벨 함락/, 'north_fallen', () => ({})],
  [/변경 수성/, 'north_held', () => ({})],
  [/변경백령 독립/, 'north_indep', () => ({})],
  [/^영주 교체/, 'lord', (t, g) => ({ name: g.realm?.lord?.name ?? '새 영주', seat: 'harfen' })],
  [/새 용사 선포/, 'hero', () => ({})],
  [/감시탑/, 'noah', (t) => ({ lit: /켜짐/.test(t) })],
];

export function diff(g, a, b) {
  const out = [];
  const push = (k, d) => out.push({ k, d });
  const log = g.realm?.log ?? [];
  let from = a.log;
  if (a.tail) { for (let i = log.length - 1; i >= 0; i--) if (lk(log[i]) === a.tail) { from = i + 1; break; } }
  for (const e of log.slice(Math.min(from, log.length))) {
    const t = String(e?.text ?? '');
    for (const [re, k, mk] of LOG_KIND) if (re.test(t)) { push(k, mk(t, g)); break; }
  }
  if (Math.abs(b.front) >= 4 && Math.abs(a.front) < 4 && g.realm?.balhart?.war) push('front', { good: b.front > 0 });
  if (b.plague && !a.plague) push('plague', {});
  for (const [n, name] of Object.entries(b.rulers)) if (a.rulers[n] && name && a.rulers[n] !== name && n !== 'leonia') push('ruler', { n, name, title: g.politics?.rulers?.[n]?.title ?? '군주' });
  for (const w of b.wars) if (!a.wars.includes(w)) { const [x, y] = w.split('|'); if (x !== 'leonia' && y !== 'leonia') push('fwar', { a: x, b: y }); }
  for (const w of a.wars) if (!b.wars.includes(w)) { const [x, y] = w.split('|'); if (x !== 'leonia' && y !== 'leonia') push('fpeace', { a: x, b: y }); }
  for (const [land, n] of Object.entries(b.owner)) if (n && a.owner[land] !== n && LANDS[land] && (a.owner[land] || n !== LANDS[land].home)) push('land', { land: LANDS[land].name, n });
  for (const id of b.cal) if (!a.cal.includes(id)) { const c = g.nature?.active?.find((x) => `${x.id}` === id); if (c && (c.sev ?? 1) >= 0.45) push('calamity', { region: c.region, kind: c.kind }); }
  for (const [id, ph] of Object.entries(b.rise)) {
    const x = g.revolt?.risings?.find((r) => `${r.id}` === id);
    if (!x) continue;
    if (ph === 'up' && a.rise[id] !== 'up') push('rising', { pl: x.place });
    if (['crushed', 'won', 'deal'].includes(ph) && a.rise[id] && a.rise[id] !== ph) push('rising_end', { pl: x.place, out: ph });
  }
  for (const [id, st] of Object.entries(b.drag)) if (st === 'awake' && a.drag[id] !== 'awake') push('dragon', { id });
  for (const id of b.inv) if (!a.inv.includes(id)) push('invention', { id });
  for (const [id, st] of Object.entries(b.ruin ?? {})) {
    const was = a.ruin?.[id] ?? null;
    if (st === 'awake' && was !== 'awake') push('ruin_woke', { id });
    if (st === 'sealed' && was !== 'sealed') push('ruin_sealed', { id });
  }
  return out.filter((x) => KINDS[x.k]);
}

export const originOf = (f, g) => {
  const pl = KINDS[f.k]?.at(f.d, g);
  return PLACES[pl] ? pl : 'leocast';
};
