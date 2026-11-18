// 가게 열기, 가게 일 하기, 꾸리기(값·일꾼·방·뒷방·팔기).
import { ACTIONS } from '../actions.js';
import { gainStat, gainSkill } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, gains, up, isAdult } from '../adventure/core.js';
import { crimeState } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  I, myInn, atInn, mi, clamp, here, placeName, free, stat, innOk, crowdOf, KINDS, costOf, roomCost, MAX_ROOMS, PRICES, ROLES, ROLE_IDS,
  INN_NAMES, SMUGGLE, newInn, hireWorker, innTitle, logInn, loseInn, innWorth, foodOf, FOOD_WORD,
} from './core.js';

/* ---------- 가게 열기 ---------- */
ACTIONS.push({
  id: 'inn_open',
  name: '주점이나 여관을 연다',
  icon: 'home',
  desc: '이 고장에 내 주점(술과 안주)이나 여관(방까지)을 산다. 손님도 일꾼도 세금도 이제 내 몫이다.',
  available: (g) => isAdult(g) && free(g) && !myInn(g) && innOk(here(g)) && g.player.money >= costOf(here(g), 'tavern') && !g.poor?.bond,
  run(g) {
    if (!sceneQueued(g, 'inn_open')) queueScene(g, 'inn_open', {}, { first: true });
    return `${placeName(here(g))}에서 팔려고 내놓은 가게들을 둘러보았다.`;
  },
});
defineScene('inn_open', {
  need: (g) => free(g) && !myInn(g) && innOk(here(g)),
  title: () => '내 가게',
  text: (g) => {
    const pl = here(g), lost = I(g).lost.find((x) => x.place === pl);
    return `${placeName(pl)} 골목에 문 닫은 주점이 하나, 길가에 방 몇 칸 딸린 낡은 여관이 하나 나와 있다. 주점은 은화 ${costOf(pl, 'tavern')}닢, 여관은 은화 ${costOf(pl, 'inn')}닢.${lost ? ` 한때 내 집안 것이던 ${lost.name} 자리도 아직 비어 있다.` : ''} 이 고장 손님은 ${['', '많지 않다', '제법 된다', '넘쳐 난다'][crowdOf(pl)]}.`;
  },
  choices: (g) => {
    const pl = here(g), m = g.player.money, lost = I(g).lost.find((x) => x.place === pl);
    return [
      ...(m >= costOf(pl, 'tavern') ? [{ label: `주점을 산다 (은화 ${costOf(pl, 'tavern')}닢)`, key: 'tavern' }] : []),
      ...(m >= costOf(pl, 'inn') ? [{ label: `여관을 산다 (은화 ${costOf(pl, 'inn')}닢)`, key: 'inn' }] : []),
      ...(lost && m >= costOf(pl, lost.kind) ? [{ label: `옛 ${J(lost.name, '을/를')} 되산다 (은화 ${costOf(pl, lost.kind)}닢)`, key: 'old' }] : []),
      { label: '아직은 아니다', key: 'no' },
    ];
  },
  resolve(g, rng, s, key) {
    const pl = here(g), st = I(g);
    if (key === 'no') return '열쇠 꾸러미를 돌려주었다. 다음에.';
    if (myInn(g)) return '이미 가게가 있다.';
    const lost = key === 'old' ? st.lost.find((x) => x.place === pl) : null;
    const kind = lost ? lost.kind : key;
    if (!KINDS[kind]) return '그런 가게는 없었다.';
    const cost = costOf(pl, kind);
    if (g.player.money < cost) return '돈이 모자랐다.';
    g.player.money -= cost;
    const used = new Set(st.lost.map((x) => x.name));
    const name = lost ? lost.name : rng.pick(INN_NAMES.filter((n) => !used.has(n))) ?? rng.pick(INN_NAMES);
    st.inn = newInn(g, pl, kind, name, lost ? 'buyback' : 'bought');
    if (lost) { st.inn.gens = (lost.gens ?? 1) + 1; st.inn.fame = 25; st.inn.founded = lost.founded ?? g.date.year; st.lost.splice(st.lost.indexOf(lost), 1); }
    st.opened += 1;
    const what = J(innTitle(st.inn), '을/를');
    logInn(g, `${placeName(pl)}에 ${what} ${lost ? '되찾았다' : '열었다'}.`);
    note(g, `${placeName(pl)}에 ${what} ${lost ? '되찾았다' : '열었다'}.`);
    chron(g, `${g.player.name}, ${placeName(pl)}에 ${what} ${lost ? '되찾다' : '열다'}.`, 45);
    if (lost) return `문 위에 옛 간판을 다시 걸었다. ${name}. 늙은 손님 하나가 지나가다 멈춰 서서 한참 간판을 올려다보았다.`;
    return kind === 'inn'
      ? `열쇠를 받았다. 삐걱이는 계단, 방 한 칸, 그을린 부엌. 간판을 새로 칠했다. ${name}. 첫날 밤 길손 둘이 묵어 갔다.`
      : `열쇠를 받았다. 술통 셋, 긴 탁자 둘, 기름때 낀 화덕. 간판을 새로 칠했다. ${name}. 첫 손님은 문을 열기도 전에 와 있었다.`;
  },
});

/* ---------- 가게 일 ---------- */
ACTIONS.push({
  id: 'inn_work',
  name: '가게 일을 한다',
  icon: 'coin',
  desc: '내 가게에서 이 달을 보낸다. 술을 따르거나, 부엌에 서거나, 장부를 보거나, 방을 치운다. 내가 있는 달은 가게가 더 잘 돈다.',
  available: (g) => atInn(g) && free(g),
  run(g) {
    if (!sceneQueued(g, 'inn_work')) queueScene(g, 'inn_work', {}, { first: true });
    return `${innTitle(myInn(g))}의 문을 열었다.`;
  },
});
defineScene('inn_work', {
  need: (g) => atInn(g) && free(g),
  title: (g) => innTitle(myInn(g)),
  text: (g) => {
    const inn = myInn(g);
    return `지난달 손님 ${inn.last.guests}명, 벌이 은화 ${inn.last.net}닢. 음식은 ${FOOD_WORD[foodOf(g)]}. 가게는 ${inn.clean >= 70 ? '반짝인다' : inn.clean >= 40 ? '그럭저럭 깨끗하다' : '끈적이고 냄새가 난다'}. 이 달은 어디에 서 있을까.`;
  },
  choices: (g) => [
    { label: '술을 따르며 손님을 맞는다', key: 'bar' },
    { label: '부엌에 선다', key: 'kitchen' },
    { label: '장부를 맞추고 술값을 흥정한다', key: 'books' },
    { label: '쓸고 닦고 고친다', key: 'clean' },
  ],
  resolve(g, rng, s, key) {
    const inn = myInn(g);
    if (!inn || !atInn(g)) return '가게에 있지 않았다.';
    inn.worked = mi(g); inn.workKind = key;
    tired(g, 10);
    if (key === 'bar') {
      const c = gainStat(g, 'cha', 0.3);
      inn.fame = clamp(inn.fame + (check(rng, stat(g, 'cha'), 35) ? 2 : 1), 0, 100);
      return `${rng.pick(['손님 이름을 하나하나 외웠다.', '취한 손님의 넋두리를 끝까지 들어 주었다.', '잔을 채우며 우스개를 했다. 웃음소리가 길까지 들렸다.'])} 사람들이 '주인장'이라고 부르기 시작했다.${gains([up('매력', c)])}`;
    }
    if (key === 'kitchen') {
      const k = gainSkill(g, 'cooking', 0.5, 'sen');
      return `${rng.pick(['스튜 솥을 밤새 저었다.', '빵을 새벽에 구웠다. 첫 판이 탔다.', '돼지 한 마리를 통째로 잡았다.'])} 이 달 음식은 ${FOOD_WORD[foodOf(g)]}.${gains([up('요리', k)])}`;
    }
    if (key === 'books') {
      const t = gainSkill(g, 'trade', 0.4, 'int');
      inn.workKind = 'books';
      return `술도가와 값을 다시 흥정했다. 장부의 구멍 몇 개를 메웠다.${inn.workers.some((w) => w.role === 'manager' && !w.honest) ? ' 지배인이 적은 숫자 몇 개가 마음에 걸린다.' : ''}${gains([up('장사', t)])}`;
    }
    inn.clean = clamp(inn.clean + 25, 0, 100);
    return '바닥을 긁고, 탁자 다리를 고치고, 창을 닦았다. 쥐구멍 셋을 막았다.';
  },
});

/* ---------- 꾸리기 ---------- */
ACTIONS.push({
  id: 'inn_manage',
  name: '가게를 꾸린다',
  icon: 'home',
  desc: '값을 매기고, 일꾼을 들이고 내보내고, 방을 늘리고, 뒷방과 지하 창고를 어떻게 쓸지 정한다. 가게를 팔 수도 있다.',
  available: (g) => atInn(g) && free(g),
  run(g) {
    if (!sceneQueued(g, 'inn_manage')) queueScene(g, 'inn_manage', {}, { first: true });
    return `${innTitle(myInn(g))}의 장부를 펼쳤다.`;
  },
});
defineScene('inn_manage', {
  need: (g) => atInn(g) && free(g),
  title: (g) => `${innTitle(myInn(g))} 꾸리기`,
  text: (g) => {
    const inn = myInn(g);
    const ws = inn.workers.map((w) => `${ROLES[w.role].name} ${w.name}`).join(', ');
    return `값은 ${PRICES[inn.price].name} 받는다. 일꾼: ${ws || '없음'}.${inn.kind === 'inn' ? ` 방 ${inn.rooms}칸.` : ''}${inn.backroom.gamble ? ' 뒷방에서 노름판이 돈다.' : ''}${inn.backroom.smuggle ? ' 지하 창고에 밀수꾼 짐이 있다.' : ''} 지금 팔면 은화 ${innWorth(inn)}닢쯤 받는다.`;
  },
  choices: (g) => {
    const inn = myInn(g), m = g.player.money;
    const canSmuggle = SMUGGLE.includes(inn.place);
    return [
      { label: '값을 바꾼다', key: 'price' },
      ...(inn.workers.length < 4 ? [{ label: '일꾼을 들인다', key: 'hire' }] : []),
      ...(inn.workers.length ? [{ label: '일꾼을 내보낸다', key: 'fire' }] : []),
      ...(inn.kind === 'inn' && inn.rooms < MAX_ROOMS && m >= roomCost(inn.place) ? [{ label: `방을 늘린다 (은화 ${roomCost(inn.place)}닢)`, key: 'room' }] : []),
      ...(inn.kind === 'tavern' && m >= roomCost(inn.place) * 2 ? [{ label: `위층에 방을 들여 여관으로 (은화 ${roomCost(inn.place) * 2}닢)`, key: 'upgrade' }] : []),
      { label: inn.backroom.gamble ? '뒷방 노름판을 닫는다' : '뒷방에 노름판을 연다', key: 'gamble' },
      ...(canSmuggle || inn.backroom.smuggle ? [{ label: inn.backroom.smuggle ? '밀수꾼을 지하 창고에서 내보낸다' : '지하 창고를 밀수꾼에게 빌려준다', key: 'smuggle' }] : []),
      { label: `가게를 판다 (은화 ${innWorth(inn)}닢쯤)`, key: 'sell' },
    ].slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const inn = myInn(g);
    if (!inn || !atInn(g)) return '가게에 있지 않았다.';
    if (key === 'price') { queueScene(g, 'inn_price', {}, { first: true }); return '값표를 떼어 들었다.'; }
    if (key === 'hire') { queueScene(g, 'inn_hire', {}, { first: true }); return '문에 "일손 구함"이라고 써 붙였다.'; }
    if (key === 'fire') { queueScene(g, 'inn_fire', {}, { first: true }); return '일꾼들을 하나씩 불렀다.'; }
    if (key === 'room') {
      const c = roomCost(inn.place); if (inn.rooms >= MAX_ROOMS || g.player.money < c) return '돈이 모자랐다.';
      g.player.money -= c; inn.rooms += 1; logInn(g, `방을 ${inn.rooms}칸으로 늘렸다.`);
      return `목수를 불러 방 한 칸을 더 들였다. 이제 ${inn.rooms}칸. 새 방에서는 아직 대팻밥 냄새가 난다.`;
    }
    if (key === 'upgrade') {
      const c = roomCost(inn.place) * 2; if (inn.kind !== 'tavern' || g.player.money < c) return '돈이 모자랐다.';
      g.player.money -= c; inn.kind = 'inn'; inn.rooms = 1; logInn(g, '위층에 방을 들여 여관이 되었다.');
      return `다락을 헐고 방을 들였다. 간판 밑에 "묵어 갈 수 있음"이라고 덧붙였다. ${J(inn.name, '은/는')} 이제 여관이다.`;
    }
    if (key === 'gamble') {
      inn.backroom.gamble = !inn.backroom.gamble;
      if (inn.backroom.gamble) { deed(g, 'honest', -1, '가게 뒷방에 노름판을 열었다.'); const c = crimeState(g); c.contacts = (c.contacts ?? 0) + 1; logInn(g, '뒷방에 노름판을 열었다.'); return '뒷방 창에 두꺼운 천을 쳤다. 첫날 밤 주사위 소리가 새벽까지 났다. 판돈의 한 할은 내 몫이다.'; }
      logInn(g, '뒷방 노름판을 닫았다.'); return '노름꾼들을 내보냈다. 한 사내가 문을 걷어차고 갔다.';
    }
    if (key === 'smuggle') {
      inn.backroom.smuggle = !inn.backroom.smuggle;
      if (inn.backroom.smuggle) { deed(g, 'honest', -2, '가게 지하 창고를 밀수꾼에게 빌려주었다.'); logInn(g, '지하 창고를 밀수꾼에게 빌려주었다.'); return '밤마다 뒷문으로 궤짝이 드나든다. 무엇이 들었는지는 묻지 않기로 했다. 창고 값은 넉넉하다.'; }
      logInn(g, '밀수꾼을 내보냈다.'); return '마지막 궤짝이 나갔다. 밀수꾼은 서운한 얼굴로 은화 한 닢을 탁자에 굴렸다.';
    }
    // 판다
    const price = innWorth(inn);
    g.player.money += price;
    I(g).sold += 1;
    note(g, `${J(innTitle(inn), '을/를')} 은화 ${price}닢에 팔았다.`);
    chron(g, `${g.player.name}, ${placeName(inn.place)}의 ${J(innTitle(inn), '을/를')} 넘기다.`, 30);
    loseInn(g, '팔았다', price);
    stress(g, inn.gens > 1 ? 10 : 3);
    return `새 주인에게 열쇠를 넘겼다. 은화 ${price}닢.${inn.gens > 1 ? ` ${inn.gens}대를 이어 온 간판이다. 문을 나서며 돌아보지 않으려고 애썼다.` : ' 단골들이 마지막 잔을 들어 주었다.'}`;
  },
});

defineScene('inn_price', {
  need: (g) => atInn(g) && free(g),
  title: () => '값표',
  text: (g) => `지금은 ${PRICES[myInn(g).price].name} 받는다. 싸게 받으면 손님이 늘고 이름이 나지만 남는 게 적다. 비싸게 받으면 손님이 줄지만 한 잔에 남는 게 많다.`,
  choices: () => Object.entries(PRICES).map(([k, p]) => ({ label: `${p.name} 받는다`, key: k })),
  resolve(g, rng, s, key) {
    const inn = myInn(g);
    if (!inn) return '가게가 없었다.';
    if (!PRICES[key]) return '값은 그대로 두었다.';
    inn.price = key;
    return { cheap: '값표를 새로 써 붙였다. 다음 날 아침부터 문 앞에 줄이 섰다.', fair: '제값을 받기로 했다. 손님들은 별말이 없었다.', dear: '값을 올렸다. 단골 몇이 투덜댔다. 대신 남는 게 많다.' }[key];
  },
});
defineScene('inn_hire', {
  need: (g) => atInn(g) && free(g) && myInn(g).workers.length < 4,
  title: () => '일손 구함',
  text: (g) => `문 앞에 일자리를 찾는 사람들이 섰다. ${myInn(g).workers.length ? `지금 일꾼은 ${myInn(g).workers.length}명.` : '아직 일꾼이 없다.'} 삯은 달마다 나간다.`,
  choices: (g) => [
    ...ROLE_IDS.filter((r) => !myInn(g).workers.some((w) => w.role === r)).map((r) => ({ label: `${ROLES[r].name} (달 은화 ${ROLES[r].wage}닢): ${ROLES[r].desc}`, key: r })),
    { label: '아무도 들이지 않는다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const inn = myInn(g);
    if (!inn || key === 'none' || !ROLES[key]) return '사람들을 돌려보냈다.';
    if (inn.workers.some((w) => w.role === key) || inn.workers.length >= 4) return '그 자리는 이미 차 있었다.';
    const w = hireWorker(g, rng, key);
    logInn(g, `${ROLES[key].name} ${J(w.name, '을/를')} 들였다.`);
    return `${J(w.name, '이/가')} ${J(ROLES[key].name, '으로/로')} 들어왔다. ${{ cook: '첫날 끓인 수프를 맛보았다. 나쁘지 않다.', maid: '첫날부터 탁자 밑 거미줄부터 걷어 냈다.', bouncer: '문가에 서자 시끄럽던 탁자 둘이 조용해졌다.', manager: '장부를 한 번 훑더니 고칠 데 셋을 짚었다.' }[key]}`;
  },
});
defineScene('inn_fire', {
  need: (g) => atInn(g) && free(g) && myInn(g).workers.length > 0,
  title: () => '내보내기',
  text: () => '누구를 내보낼까. 오래 일한 사람일수록 섭섭해한다.',
  choices: (g) => [...myInn(g).workers.map((w) => ({ label: `${ROLES[w.role].name} ${w.name}`, key: `w:${w.id}` })), { label: '그대로 둔다', key: 'none' }],
  resolve(g, rng, s, key) {
    const inn = myInn(g);
    const w = inn?.workers.find((x) => `w:${x.id}` === key);
    if (!w) return '아무도 내보내지 않았다.';
    inn.workers.splice(inn.workers.indexOf(w), 1);
    const long = mi(g) - w.since >= 24;
    if (long) deed(g, 'loyal', -2, '오래 일한 일꾼을 내보냈다.');
    logInn(g, `${ROLES[w.role].name} ${J(w.name, '을/를')} 내보냈다.`);
    return long ? `${J(w.name, '은/는')} 앞치마를 접어 탁자에 놓았다. "두 해를 넘게 일했는데." 대답할 말이 없었다.` : `${J(w.name, '은/는')} 삯을 받고 말없이 나갔다.`;
  },
});
