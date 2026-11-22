// 유적과 얽히는 일: 소문을 듣고, 들어가 글 조각을 모으고, 서고에서 고대어를 읽고, 잊힌 술식을 되살려 집안 마도서에 적는다.
// 도굴꾼은 먼저 털어 가고, 학자는 같이 읽자 하고, 마탑은 내놓으라 하고, 교단은 첫 왕들의 술식을 마신의 법이라 부른다.
// 너무 깊이, 너무 거칠게 파면 유적에 잠든 것이 뒤척이다 깨어난다. 플레이어가 없어도 도굴꾼과 마탑은 달마다 움직인다.
// 새 행동은 뜻 있는 형편에서만: 유적 소문을 들은 고장에서(들어가기), 읽지 않은 조각이 있고 서고가 있을 때(읽기),
// 되살릴 수 있는 술식이 있을 때(되살리기), 집안 마도서에 내가 모르는 술식이 있을 때(마도서 펼치기).
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainSkill, circleOf } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { isJailed, addNotoriety } from '../crime.js';
import { POWER_BONUS, playerPower } from '../adventure/combat.js';
import { deed } from '../repute/index.js';
import { PLACES } from '../places.js';
import {
  RU, RUINS, RUIN_IDS, ARTS, ART_IDS, LIBRARIES, clamp, mi, here, rlog, ruinAt, ruinsRng, piecesOf, piecesAll, knowsArt, placeName, civName,
} from './state.js';

export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const st = (g, k) => g.player.stats[k] ?? 0;
const sk = (g, k) => g.player.skills[k] ?? 0;
const ROOM = ['바깥 방', '회랑', '심장'];
const near = (g, pl) => here(g) === pl || !!PLACES[here(g)]?.links?.[pl];

// 읽어 낸 글 조각 (문명마다)
const FRAGS = {
  arcana: ['"일곱째 원은 그리는 것이 아니라 닫는 것이다. 닫은 자는 돌아오지 않는다."', '"별은 움직이지 않는다. 움직이는 것은 우리다. 그러니 땅에 별을 그리면 땅이 멈춘다."', '"우리는 하늘을 다 받아 적었다. 마지막 줄을 적은 밤, 하늘이 우리를 받아 적기 시작했다."', '"원을 겹칠 때마다 쓰는 사람의 이름을 하나씩 내려놓아라."'],
  stone: ['"불은 먹어야 탄다. 뿌리는 먹지 않고 마신다. 불에게 마시는 법을 가르쳐라."', '"손바닥을 문에 대고 이름을 말하지 마라. 문이 기억한다."', '"우리 다음에 올 키 큰 사람들에게. 숲을 빌려 준다. 돌려받으러 오겠다."', '"돌은 들은 것을 잊지 않는다. 돌 앞에서는 낮게 말하라."'],
  tide: ['"달이 물을 부르듯 부르면 무엇이든 온다. 오지 말아야 할 것도."', '"물은 고이면 썩는다고들 하나, 고요히 고인 물은 거울이 된다."', '"마지막 물때를 적지 마라. 적으면 온다."', '"배 속에 우리를 넣고 헤엄치는 물고기에게 노래를 바친다."'],
  first: ['"이름을 만 번 쓰면 그 이름은 쓴 사람의 것이 된다."', '"왕의 이름을 지운 자는 왕을 지운 것이 아니라 왕을 풀어 준 것이다."', '"재를 거울에 바르면 거울은 지금이 아니라 먼 곳을 비춘다. 오래 보면 먼 곳이 이쪽을 본다."', '"마신이 오기 전, 우리는 이미 무언가를 묶어 두고 있었다."'],
};

/* ---------- 소문: 유적이 있다는 것을 안다 ---------- */
EVENTS.push({
  id: 'ruin_rumor', cooldown: 24, weight: 4, chance: () => 0.3,
  cond: (g) => { if (!free(g)) return false; const s = RU(g).sites[ruinAt(here(g))]; return !!s && s.known === 0 && (s.heard ?? 0) < 2; },
  prepare: (g) => ({ id: ruinAt(here(g)) }),
  title: '땅 밑의 오래된 것',
  text: (g, c) => `${RUINS[c.id].rumor} 마신이 오기 전, ${civName(RUINS[c.id].civ)}의 것이라는 말도 있다.`,
  choices: [
    { label: '흘려듣는다', run: (g, rng, c) => { const s = RU(g).sites[c.id]; s.heard = (s.heard ?? 0) + 1; return '옛날이야기는 어느 고장에나 있다. 술잔을 비우고 일어났다.'; } },
    { label: '자세히 묻는다', run: (g, rng, c) => { const s = RU(g).sites[c.id]; s.known = Math.max(1, s.known); rlog(g, `${RUINS[c.id].name}: 소문을 들었다.`); return `가는 길과 무너진 곳, 먼저 들어갔다 돌아오지 못한 사람 이름까지 들었다. ${RUINS[c.id].name}. 어디쯤인지 이제 안다.`; } },
  ],
});
EVENTS.push({
  id: 'ruin_hearsay', cooldown: 36, weight: 3, chance: () => 0.15,
  cond: (g) => free(g) && !!LIBRARIES[here(g)] && RUIN_IDS.some((id) => RU(g).sites[id].known === 0),
  prepare: (g, rng) => ({ id: rng.pick(RUIN_IDS.filter((id) => RU(g).sites[id].known === 0)) }),
  title: '서고 구석의 늙은 학자',
  text: (g, c) => `${LIBRARIES[here(g)]} 구석에서 먼지 쌓인 지도를 들여다보던 늙은 학자가 나를 불렀다. "${placeName(RUINS[c.id].from)} 근처에 ${RUINS[c.id].name}, 그런 데가 있소. 젊을 때 가 보려다 무릎이 먼저 늙었지." 학자가 손끝으로 지도의 빈자리를 두드렸다.`,
  choices: [
    { label: '고개만 끄덕인다', run: () => '늙은이의 넋두리로 들었다. 학자는 실망한 얼굴로 다시 지도에 코를 박았다.' },
    { label: '받아 적는다', run: (g, rng, c) => { const s = RU(g).sites[c.id]; s.known = Math.max(1, s.known); rlog(g, `${RUINS[c.id].name}: 학자에게 들었다.`); gainSkill(g, 'letters', 0.3); return `학자가 아는 것을 다 받아 적었다. ${J(placeName(RUINS[c.id].from), '으로/로')} 가면 찾을 수 있을 것이다.`; } },
  ],
});

/* ---------- 들어간다 ---------- */
ACTIONS.push({
  id: 'ruin_dig', name: '유적에 들어간다', icon: 'dungeon',
  desc: '소문으로 들은 유적에 횃불과 밧줄을 들고 들어간다. 벽의 글 조각을 떠 오거나 부숴 온다. 깊이 들어갈수록 위험하다.',
  available: (g) => {
    if (!free(g)) return false;
    const id = ruinAt(here(g)), s = id && RU(g).sites[id];
    return !!s && s.known >= 1 && s.depth < 3 && s.woke !== 'awake' && !sceneQueued(g, 'ruin_room');
  },
  run(g) { const id = ruinAt(here(g)); queueScene(g, 'ruin_room', { id, room: RU(g).sites[id].depth }, { first: true }); RU(g).me.digs += 1; return `${RUINS[id].name} 쪽으로 밧줄과 횃불을 챙겨 나섰다.`; },
});
defineScene('ruin_room', {
  title: (g, s) => `${RUINS[s.id].name} · ${ROOM[s.room] ?? '안쪽'}`,
  text: (g, s) => {
    const r = RUINS[s.id], x = RU(g).sites[s.id];
    const extra = x.looted >= 60 ? ' 도굴꾼이 먼저 다녀갔다. 바닥에 정으로 쪼다 버린 돌 조각과 꺼진 횃불이 흩어져 있다.' : x.looted >= 25 ? ' 누군가 다녀간 자국이 있다. 벽 한쪽이 정으로 쪼여 나갔다.' : '';
    const claim = x.claim === 'tower' ? ' 입구에 마탑의 봉인 표식이 붙어 있다. 들어가는 것만으로도 마탑에 밉보일 일이다.' : '';
    return `${r.rooms[s.room] ?? r.rooms[2]}${extra}${claim}`;
  },
  choices: (g, s) => {
    const x = RU(g).sites[s.id];
    if (!free(g) || here(g) !== RUINS[s.id].from || x.depth !== s.room || x.woke === 'awake') return [];
    return [
      { label: '돌아 나온다', key: 'leave' },
      { label: '천천히 살피며 글을 떠 온다', key: 'careful' },
      { label: '벽째 뜯어 들고 나온다', key: 'force' },
      ...(RU(g).tongue >= 25 ? [{ label: '그 자리에서 벽의 글을 읽는다', key: 'read' }] : []),
    ];
  },
  resolve(g, rng, s, key) {
    const R = RU(g), r = RUINS[s.id], x = R.sites[s.id];
    if (key === 'leave') return '횃불이 반쯤 탔을 때 돌아섰다. 다음에 다시 올 수 있다. 유적은 어디 가지 않는다.';
    if (x.depth !== s.room) return '이미 지나온 곳이다.';
    tired(g, 22);
    x.known = 2;
    if (x.claim === 'tower') R.foe.tower += 1;
    const dc = r.danger + s.room * 8;
    if (key === 'read') {
      const gain = rng.int(4, 7) * (knowsArt(g, 'stone_voice') ? 1.5 : 1);
      R.tongue = clamp(R.tongue + gain, 0, 100);
      gainSkill(g, 'letters', 0.3);
      return `횃불을 벽에 대고 한 줄씩 짚어 읽었다. ${rng.pick(FRAGS[r.civ])} 몇 낱말은 아직 모르겠다. 그래도 전보다 읽힌다. (고대어 ${Math.round(R.tongue)})`;
    }
    const careful = key === 'careful';
    const ok = careful ? check(rng, st(g, 'sen') * 0.6 + st(g, 'int') * 0.4 + R.tongue / 5, dc) : check(rng, st(g, 'str') * 0.5 + st(g, 'agi') * 0.5, dc - 5);
    if (!ok) {
      stress(g, 8);
      const hurt = careful ? rng.pick(['무너진 돌에 찧은 어깨', '바닥 틈에 빠져 접질린 발목', '독 먼지에 상한 목']) : rng.pick(['떨어진 천장돌에 깨진 머리', '뜯다 무너진 벽에 깔린 다리', '함정 바늘에 찔린 손']);
      injure(g, hurt, careful ? 2 : 3);
      return careful ? `한 걸음씩 짚어 갔지만 ${r.civ === 'tide' ? '젖은 바닥이' : '오래된 바닥이'} 발밑에서 꺼졌다. ${J(hurt, '을/를')} 안고 겨우 기어 나왔다.` : `정을 박자마자 벽 위쪽이 통째로 쏟아졌다. ${hurt}. 들고 나온 것은 없다.`;
    }
    R.me.rooms += 1;
    x.depth = s.room + 1;
    const want = s.room === 2 ? 2 : 1;
    let got = 0;
    for (let i = 0; i < want; i++) if (rng.chance(1 - x.looted / (careful ? 160 : 120))) got += 1;
    R.pieces[s.id] = (R.pieces[s.id] ?? 0) + got;
    let text = careful
      ? `무너질 만한 곳을 피해 벽을 살폈다. ${got ? `글이 온전한 조각 ${got}개를 숯으로 떠 왔다.` : '글이 남은 데가 없었다. 도굴꾼들이 쓸 만한 벽은 다 쪼아 갔다.'}`
      : `벽을 통째로 뜯었다. 반은 부서졌다. ${got ? `글이 남은 조각 ${got}개를 자루에 담았다.` : '자루에 담은 것은 글자 반 줄 붙은 돌부스러기뿐이다.'}`;
    if (!careful) { const coin = rng.int(10, 30); g.player.money += coin; text += ` 장식 돌 몇 개는 팔면 은화 ${coin}닢은 될 것이다.`; x.looted = clamp(x.looted + 10, 0, 100); }
    rlog(g, `${r.name} ${ROOM[s.room]}: 조각 ${got}개.`);
    if (s.room === 2) {
      const p = 0.12 + x.looted / 250 + (careful ? 0 : 0.18) - (knowsArt(g, 'star_ward') ? 0.08 : 0);
      if (!x.woke && rng.chance(p)) {
        x.woke = 'stir'; x.wokeAt = mi(g); R.me.wakes += 1;
        rlog(g, `${r.name}: 무언가 뒤척였다.`);
        text += ` 나오는 길에 등 뒤에서 무언가 숨을 들이쉬는 소리가 났다. 돌아보지 않았다. ${r.wake.name}. 벽에 그 이름이 있었다.`;
      } else text += ' 가장 깊은 곳까지 보았다. 이 유적에서 더 떠 올 것은 없다.';
      note(g, `${r.name}의 가장 깊은 곳까지 들어갔다.`);
    }
    return text;
  },
});

/* ---------- 고대어를 읽는다 ---------- */
const unreadSite = (g) => { const R = RU(g); R.readBy ??= {}; return RUIN_IDS.find((id) => piecesOf(g, id) > (R.readBy[id] ?? 0)) ?? null; };
ACTIONS.push({
  id: 'ruin_read', name: '고대어 조각을 읽는다', icon: 'book',
  desc: '유적에서 떠 온 글 조각을 서고의 옛 사전과 견주어 한 자씩 읽는다. 돌의 목소리를 알면 서고가 없어도 된다.',
  available: (g) => free(g) && !!unreadSite(g) && (!!LIBRARIES[here(g)] || knowsArt(g, 'stone_voice')),
  run(g, rng) {
    const R = RU(g), id = unreadSite(g), civ = RUINS[id].civ;
    const lib = !!LIBRARIES[here(g)];
    const gain = (5 + st(g, 'int') / 15) * (knowsArt(g, 'stone_voice') ? 1.5 : 1) * (lib ? 1 : 0.7);
    const before = R.tongue;
    R.tongue = clamp(R.tongue + gain, 0, 100);
    R.readBy[id] = (R.readBy[id] ?? 0) + 1; R.read += 1;
    tired(g, 15); gainSkill(g, 'letters', 0.4);
    const opened = ART_IDS.filter((a) => ARTS[a].tongue > before && ARTS[a].tongue <= R.tongue && needsMet(g, a));
    const tail = opened.length ? ` 읽다 보니 알겠다. ${J(ARTS[opened[0]].name, '을/를')} 되살릴 실마리가 다 모였다.` : '';
    return `${lib ? `${LIBRARIES[here(g)]}의 옛 사전을 펴 놓고` : '조각에 손바닥을 대고'} ${civName(civ)}의 글을 한 줄 읽어 냈다. ${ruinsRng(g, R.read).pick(FRAGS[civ])} (고대어 ${Math.round(R.tongue)})${tail}`;
  },
});

/* ---------- 잊힌 술식을 되살린다 ---------- */
export const needsMet = (g, a) => Object.entries(ARTS[a].need).every(([site, n]) => piecesOf(g, site) >= n);
export const restorable = (g) => ART_IDS.filter((a) => !knowsArt(g, a) && RU(g).tongue >= ARTS[a].tongue && needsMet(g, a) && circleOf(g) >= ARTS[a].circle);
const workplace = (g) => !!LIBRARIES[here(g)] || !!g.tower?.member;
ACTIONS.push({
  id: 'ruin_restore', name: '잊힌 술식을 되살린다', icon: 'magic',
  desc: '읽어 낸 고대어와 글 조각을 이어, 서클 마법이 생기기 전의 술식을 되살린다. 서클이 모자라면 읽어도 쓰지 못한다. 되살리면 집안 마도서에 내 이름을 붙여 적는다.',
  available: (g) => free(g) && workplace(g) && (RU(g).work ? !knowsArt(g, RU(g).work.id) && circleOf(g) >= ARTS[RU(g).work.id].circle : restorable(g).length > 0),
  run(g, rng) {
    const R = RU(g);
    if (!R.work) R.work = { id: restorable(g)[0], prog: 0 };
    const a = ARTS[R.work.id];
    tired(g, 25);
    const ok = check(rng, st(g, 'int') * 0.5 + sk(g, 'magic') * 0.4 + R.tongue * 0.3, 55 + a.circle * 10);
    if (!ok) {
      stress(g, 8);
      if (rng.chance(0.35)) { injure(g, rng.pick(['술식이 되튀어 덴 손바닥', '거꾸로 흐른 마력에 터진 코피', '닫히지 않은 원에 빨려 든 기운']), 2); return `${a.name}의 원을 그리다 마지막 획에서 마력이 거꾸로 흘렀다. 몸으로 받아 냈다. 처음부터 다시 해야 한다.`; }
      return `${a.name}의 글을 이어 보았지만 앞뒤가 맞지 않는다. 한 낱말을 잘못 읽은 것 같다. 밤새 사전을 뒤졌다.`;
    }
    R.work.prog += rng.float(0.34, 0.5);
    if (R.work.prog < 1) return `${J(a.name, '을/를')} 한 겹 더 맞춰 냈다. ${R.work.prog >= 0.66 ? '이제 마지막 원만 남았다.' : '아직 반도 안 된다.'}`;
    const id = R.work.id;
    R.work = null;
    learn(g, id);
    return `마지막 원을 닫자 손끝에서 ${civName(a.civ)}의 마력이 돌았다. 서클 마법과 결이 다르다. 더 느리고, 더 오래 남는다. ${a.desc} 집안 마도서에 '${g.player.name}의 ${a.name}', 그렇게 적었다.`;
  },
});

/** 술식을 내 것으로. fromBook이면 마도서에 이미 있는 것을 다시 익힌 것 */
export function learn(g, id, { fromBook = false } = {}) {
  const R = RU(g), a = ARTS[id];
  if (!a || R.known.includes(id)) return false;
  R.known.push(id);
  if (!fromBook) {
    R.book ??= { title: `${g.player.lastName ?? g.player.name} 집안 마도서`, entries: [], y: g.date.year };
    if (!R.book.entries.some((e) => e.art === id)) R.book.entries.push({ art: id, name: `${g.player.name}의 ${a.name}`, by: g.player.name, y: g.date.year });
    note(g, `잊힌 술식 ${J(a.name, '을/를')} 되살렸다.`);
    chron(g, `${J(g.player.name, '이/가')} 마신 이전의 술식을 되살렸다는 말이 마탑까지 돌았다.`, 75);
  }
  rlog(g, `${a.name}: ${fromBook ? '마도서에서 익혔다' : '되살렸다'}.`);
  return true;
}

/* ---------- 집안 마도서 ---------- */
const bookOpen = (g) => (RU(g).book?.entries ?? []).filter((e) => !knowsArt(g, e.art) && circleOf(g) >= ARTS[e.art].circle);
ACTIONS.push({
  id: 'ruin_book', name: '집안 마도서를 펼친다', icon: 'scroll',
  desc: '앞선 이가 되살려 적어 둔 술식을 익힌다. 처음 되살리는 것보다는 훨씬 쉽지만, 서클이 모자라면 읽어도 쓰지 못한다.',
  available: (g) => free(g) && bookOpen(g).length > 0,
  run(g, rng) {
    const R = RU(g), e = bookOpen(g)[0], a = ARTS[e.art];
    tired(g, 15);
    R.tongue = clamp(R.tongue + 3, 0, 100);
    if (!check(rng, st(g, 'int') + sk(g, 'magic') / 2 + 20, 70)) { stress(g, 4); return `마도서의 ${e.name} 장을 펼쳤다. ${e.by}의 손글씨는 흘려 썼고, 여백에 적은 고대어는 아직 다 못 읽겠다. 다음에 다시 펴 보기로 했다.`; }
    learn(g, e.art, { fromBook: true });
    return `'${e.name}'. ${e.y}년에 ${J(e.by, '이/가')} 적은 장을 따라 원을 그렸다. 여백에 "서두르지 말 것"이라고 적혀 있었다. 그대로 했다. ${a.desc}`;
  },
});

/* ---------- 도굴꾼 ---------- */
EVENTS.push({
  id: 'ruin_robbers', cooldown: 30, weight: 3, chance: () => 0.35,
  cond: (g) => { if (!free(g)) return false; const id = ruinAt(here(g)), s = id && RU(g).sites[id]; return !!s && s.known >= 1 && s.looted >= 25 && (piecesAll(g) > 0 || s.depth > 0); },
  prepare: (g, rng) => ({ id: ruinAt(here(g)), boss: rng.pick(['외눈 하겐', '삽자루 마르타', '여우 콘라트', '젖은 손 일제']) }),
  title: '도굴꾼 패거리',
  text: (g, c) => `${RUINS[c.id].name} 들머리 주막에서 ${J(c.boss, '이/가')} 내 앞에 앉았다. "유적 드나드는 거 다 안다. 글 조각은 우리한테 넘겨. 세레니아 쪽에 비싸게 사는 데가 있어. 아니면 다음엔 같이 들어가든가." 뒤에 선 사내 셋이 웃지 않는다.`,
  choices: [
    { label: '조각 하나를 판다', show: (g) => piecesAll(g) > 0, run: (g, rng, c) => { const R = RU(g), id = RUIN_IDS.find((x) => piecesOf(g, x) > 0); R.pieces[id] -= 1; if (R.readBy?.[id] > R.pieces[id]) R.readBy[id] = R.pieces[id]; const coin = rng.int(25, 45); g.player.money += coin; R.me.sold += 1; deed(g, 'honest', -1, null, here(g)); return `조각 하나를 넘기고 은화 ${coin}닢을 받았다. ${J(c.boss, '은/는')} 조각을 불빛에 비춰 보더니 처음으로 웃었다.`; } },
    { label: '같이 들어간다', run: (g, rng, c) => { const R = RU(g), s = R.sites[c.id]; s.looted = clamp(s.looted + 15, 0, 100); addNotoriety(g, 4); tired(g, 20); if (rng.chance(0.6)) { R.pieces[c.id] = (R.pieces[c.id] ?? 0) + 1; return `패거리와 밤에 들어가 벽을 통째로 뜯었다. 몫으로 조각 하나를 챙겼다. 나오는 길에 ${J(c.boss, '이/가')} 말했다. "너, 손이 좋다."`; } injure(g, '도굴꾼 정에 찍힌 손등', 2); return '들어가자마자 패거리끼리 몫을 두고 칼을 뽑았다. 말리다 손등을 찍혔다. 빈손으로 나왔다.'; } },
    { label: '대관에게 일러바친다', run: (g, rng, c) => { const R = RU(g), s = R.sites[c.id]; s.looted = clamp(s.looted - 10, 0, 100); R.me.reported += 1; deed(g, 'honest', 2, null, here(g)); stress(g, 5); return `대관의 병사들이 주막을 덮쳤다. ${J(c.boss, '은/는')} 뒷문으로 빠져나갔다. 나가면서 나를 한 번 돌아보았다. 그 얼굴을 잊지 못할 것이다.`; } },
    { label: '거절한다', run: (g, rng, c) => { if (rng.chance(0.3)) { injure(g, '골목에서 맞은 옆구리', 1); return `거절하고 나왔다. 골목에서 ${c.boss}의 사내들이 기다리고 있었다. 이번엔 주먹뿐이었다.`; } return `"마음 바뀌면 와." ${J(c.boss, '은/는')} 술값을 내 앞에 남기고 갔다.`; } },
  ],
});

/* ---------- 학자 ---------- */
EVENTS.push({
  id: 'ruin_scholar', cooldown: 36, weight: 3, chance: () => 0.3,
  cond: (g) => free(g) && !!LIBRARIES[here(g)] && RU(g).read >= 2,
  prepare: (g, rng) => ({ who: rng.pick(['안경 낀 왕립 서고 사서 오틸리에', '손가락에 잉크가 밴 늙은 수도사 베네딕트', '세레니아에서 쫓겨났다는 학자 레온하르트']) }),
  title: '같이 읽자는 사람',
  text: (g, c) => `${J(c.who, '이/가')} 내가 들고 다니는 조각을 보더니 말을 걸었다. "그 획, ${civName('arcana')} 것이 아니오. 더 오래됐소. 내 사전과 당신 조각을 합치면 반년 걸릴 걸 한 달에 읽을 수 있소. 대신 이름은 같이 올립시다."`,
  choices: [
    { label: '같이 읽는다', run: (g, rng, c) => { const R = RU(g); R.tongue = clamp(R.tongue + 10, 0, 100); R.me.shared += 1; deed(g, 'generous', 1, null, here(g)); gainSkill(g, 'letters', 0.5); return `${J(c.who, '과/와')} 한 달을 서고에서 보냈다. 사전 한 권이 거의 새로 쓰였다. (고대어 ${Math.round(R.tongue)}) 학자는 논문 첫머리에 내 이름을 자기 이름보다 앞에 적었다.`; } },
    { label: '내 조각은 내가 읽는다', run: () => '정중히 거절했다. 학자는 어깨를 으쓱했다. "그럼 누가 먼저 읽는지 봅시다."' },
    { label: '읽은 것을 판다', run: (g, rng, c) => { const R = RU(g), coin = rng.int(30, 50); g.player.money += coin; R.tongue = clamp(R.tongue + 3, 0, 100); return `읽어 낸 몇 줄을 베껴 주고 은화 ${coin}닢을 받았다. ${J(c.who, '은/는')} 베낀 종이를 품에 넣고 서둘러 나갔다.`; } },
  ],
});

/* ---------- 마탑 ---------- */
EVENTS.push({
  id: 'ruin_tower', cooldown: 48, weight: 3, chance: () => 0.3,
  cond: (g) => free(g) && (RU(g).known.length >= 1 || RU(g).sites.sunkstair.depth >= 1) && ['serenia', 'leocast', 'harfen', 'verden'].includes(here(g)),
  title: '마탑의 사자',
  text: (g) => `회색 로브를 입은 마탑 사자가 찾아왔다. "서클 이전의 술식은 세레니아 협회가 거두어 연구합니다. 대륙의 안녕을 위해서요. ${RU(g).book ? `${RU(g).book.title}의 사본을 내주시면` : '가진 조각을 내주시면'} 섭섭지 않게 사례하겠습니다." 사자의 눈은 웃지 않는다.`,
  choices: [
    { label: '사본을 내준다', run: (g, rng) => { const R = RU(g), coin = rng.int(60, 100); g.player.money += coin; R.foe.tower = 0; if (g.tower?.member) g.tower.member.merit = (g.tower.member.merit ?? 0) + 10; R.sites.sunkstair.claim = 'tower'; return `한 장 한 장 베껴 넘겼다. 은화 ${coin}닢과 협회의 감사장이 왔다. 감사장 끝에 "다시는 호수 밑 계단에 내려가지 말 것"이라고 적혀 있었다.`; } },
    { label: '거절한다', run: (g) => { RU(g).foe.tower += 1; stress(g, 6); return '"집안 것입니다." 사자는 고개를 끄덕이고 나갔다. 그 뒤로 세레니아 쪽에서 오는 편지마다 봉인이 한 번 뜯겼다 붙은 자국이 있다.'; } },
    { label: '값을 흥정한다', run: (g, rng) => { const R = RU(g); if (check(rng, st(g, 'cha') + st(g, 'int') / 2, 75)) { const coin = rng.int(110, 160); g.player.money += coin; return `가짜 원 두 개를 섞은 사본을 비싸게 넘겼다. 은화 ${coin}닢. 마탑이 그걸 알아채기까지 몇 해는 걸릴 것이다.`; } R.foe.tower += 1; return '사자가 내 사본의 가짜 원을 단번에 짚어 냈다. "협회를 우습게 보시는군요." 아무것도 받지 못했다.'; } },
  ],
});

/* ---------- 교단: 첫 왕들의 술식 ---------- */
EVENTS.push({
  id: 'ruin_church', cooldown: 36, weight: 3, chance: () => 0.25,
  cond: (g) => free(g) && knowsArt(g, 'name_bind') && (PLACES[here(g)]?.realm === 'holy' || ['leocast', 'verden', 'harfen'].includes(here(g))),
  title: '이름을 묶는 자',
  text: () => '이단 심문관 둘이 문을 두드렸다. "마신이 오기 전에 마신의 법을 쓰던 자들이 있었소. 그 법이 되살아났다는 말이 성당까지 들어왔소. 당신 집안 책에 그 이름이 있소?"',
  choices: [
    { label: '모르는 일이라 한다', run: (g, rng) => { const R = RU(g); if (check(rng, st(g, 'wil') + st(g, 'cha') / 2, 70)) return '눈을 피하지 않고 모른다고 했다. 심문관들은 집 안을 한 번 둘러보고 돌아갔다. 마도서는 굴뚝 안쪽에 있었다.'; R.foe.church += 1; addNotoriety(g, 6); stress(g, 10); return '대답이 한 박자 늦었다. 심문관이 장부에 내 이름을 적었다. "다시 오겠소."'; } },
    { label: '그 장을 불태운다', run: (g) => { const R = RU(g); R.known = R.known.filter((x) => x !== 'name_bind'); if (R.book) R.book.entries = R.book.entries.filter((e) => e.art !== 'name_bind'); R.foe.church = 0; rlog(g, '이름 묶기: 불태웠다.'); return '심문관 앞에서 그 장을 찢어 화로에 넣었다. 종이가 타는 동안 내 이름을 누가 부르는 것 같았다. 몸에서도 그 술식이 빠져나갔다.'; } },
  ],
});

/* ---------- 유적이 깨우는 것 ---------- */
const awakeNear = (g) => RUIN_IDS.find((id) => RU(g).sites[id].woke === 'awake' && near(g, RUINS[id].from)) ?? null;
const stirHere = (g) => RUIN_IDS.find((id) => RU(g).sites[id].woke === 'stir' && here(g) === RUINS[id].from) ?? null;
EVENTS.push({
  id: 'ruin_stir', cooldown: 12, weight: 4, chance: () => 0.5,
  cond: (g) => free(g) && !!stirHere(g),
  prepare: (g) => ({ id: stirHere(g) }),
  title: '땅 밑에서 뒤척이는 것',
  text: (g, c) => `${RUINS[c.id].name} 쪽에서 밤마다 무언가 긁는 소리가 올라온다고 한다. 들어갔던 사람이 나밖에 없다는 것을 고장 사람들이 안다. 다들 나를 본다.`,
  choices: [
    { label: '모른 척한다', run: () => '모른 척했다. 그 소리는 내게도 들린다.' },
    { label: '다시 내려가 잠재운다', run: (g, rng, c) => { const R = RU(g), x = R.sites[c.id]; tired(g, 25); if (check(rng, R.tongue * 0.6 + st(g, 'wil') * 0.5 + (knowsArt(g, 'star_ward') ? 15 : 0), 70)) { x.woke = null; R.me.calmed += 1; deed(g, 'brave', 2, null, here(g)); return `심장 방 벽의 글을 거꾸로 읽어 내려갔다. ${RUINS[c.id].wake.name}의 숨이 다시 고르게 가라앉았다. 나오니 새벽이었다.`; } injure(g, '어둠 속에서 무언가에 붙잡혔던 팔', 3); stress(g, 10); return '글을 읽다 한 줄을 틀렸다. 어둠 속에서 무언가 내 팔을 잡았다. 놓아준 것은 그것의 뜻이었다.'; } },
  ],
});
EVENTS.push({
  id: 'ruin_wake', cooldown: 6, weight: 6, chance: () => 0.6,
  cond: (g) => free(g) && !!awakeNear(g),
  prepare: (g) => ({ id: awakeNear(g) }),
  title: '깨어난 것',
  text: (g, c) => `${RUINS[c.id].wake.text} ${RUINS[c.id].wake.name}. 고장 사람들이 짐을 싸기 시작했다.`,
  choices: [
    { label: '멀리 피한다', run: (g) => { stress(g, 6); return '식구들과 며칠 길을 돌아 피했다. 돌아와 보니 이웃 집 하나가 비어 있었다.'; } },
    { label: '맞서 싸운다', run: (g, rng, c) => wakeFight(g, rng, c.id) },
    { label: '고대어로 다시 묶는다', show: (g) => RU(g).tongue >= 40, run: (g, rng, c) => wakeSeal(g, rng, c.id) },
  ],
});
function calmed(g, id, how) {
  const R = RU(g), x = R.sites[id];
  x.woke = 'calmed'; R.me.calmed += 1;
  deed(g, 'brave', 3, null, here(g));
  rlog(g, `${RUINS[id].name}: ${J(RUINS[id].wake.name, '을/를')} ${how}다.`);
  chron(g, `${J(g.player.name, '이/가')} ${J(RUINS[id].wake.name, '을/를')} ${how}다고 ${placeName(RUINS[id].from)} 사람들이 말한다.`, 85);
}
function wakeFight(g, rng, id) {
  const w = RUINS[id].wake, pow = playerPower(g) + rng.int(-20, 20);
  tired(g, 35);
  if (pow >= w.pow) { calmed(g, id, '쓰러뜨렸'); return `${J(w.name, '과/와')} 맞붙었다. 칼이 닿을 때마다 오래된 돌 냄새가 났다. 마지막에 그것이 무너지며 내 이름을 한 번 불렀다. 대답하지 않았다.`; }
  injure(g, `${w.name}에게 입은 상처`, 4); stress(g, 15);
  return `${w.name} 앞에서 칼이 무거워졌다. 몇 합 만에 바닥에 나뒹굴었다. 그것은 나를 내려다보다가 그냥 지나갔다. 아직은 내가 상대가 아니라는 듯이.`;
}
function wakeSeal(g, rng, id) {
  const R = RU(g), w = RUINS[id].wake;
  tired(g, 30);
  const v = R.tongue + st(g, 'wil') * 0.5 + sk(g, 'magic') / 3 + (knowsArt(g, 'star_ward') ? 20 : 0) + (knowsArt(g, 'name_bind') ? 25 : 0) + rng.int(-15, 15);
  if (v >= w.pow * 0.75) { calmed(g, id, '다시 묶었'); return `벽에 새겨져 있던 그 이름을 처음부터 끝까지 불렀다. ${knowsArt(g, 'name_bind') ? '이름 묶기의 원이 그것의 발목을 감았다. ' : ''}${J(w.name, '이/가')} 멈췄다. 천천히 유적 쪽으로 돌아갔다. 다시 잠들었다. 이번엔 오래 잘 것이다.`; }
  injure(g, '되튄 고대어에 그을린 목', 3); stress(g, 12);
  return '그 이름의 한 음절을 틀리게 불렀다. 목에서 피 맛이 났다. 그것이 나를 돌아보았다. 웃는 것 같았다.';
}

// 싸움에 보태는 힘: 서클이 닿는 술식만
POWER_BONUS.push((g) => (g.ruins ? g.ruins.known.reduce((a, id) => a + (ARTS[id] && circleOf(g) >= ARTS[id].circle ? ARTS[id].power : 0), 0) : 0));

/* ---------- 달마다: 세상 쪽 (도굴꾼·마탑·깨어남) 과 술식의 쓰임 ---------- */
export function ruinsMonth(g) {
  if (!g.ruins || g.over) return [];
  const R = RU(g), out = [];
  RUIN_IDS.forEach((id, i) => {
    const x = R.sites[id], rng = ruinsRng(g, i * 11 + 3);
    if (!RUINS[id].open && !x.opened && rng.chance(0.004)) { x.opened = true; out.push({ id, k: 'found' }); }
    const worldKnows = RUINS[id].open || x.opened || x.known >= 2;
    if (worldKnows && x.claim !== 'tower') x.looted = clamp(x.looted + rng.float(0, 1.6), 0, 100);
    if (!x.woke && x.looted >= 85 && rng.chance(0.008)) { x.woke = 'stir'; x.wokeAt = mi(g); }
    if (x.woke === 'stir' && mi(g) - x.wokeAt >= 3 && rng.chance(0.07)) { x.woke = 'awake'; x.wokeAt = mi(g); out.push({ id, k: 'awake' }); rlog(g, `${RUINS[id].name}: ${J(RUINS[id].wake.name, '이/가')} 깨어났다.`); }
    else if (x.woke === 'awake' && mi(g) - x.wokeAt >= 8 && rng.chance(0.08)) { x.woke = 'sealed'; x.claim = 'tower'; out.push({ id, k: 'sealed' }); rlog(g, `${RUINS[id].name}: 마탑이 봉했다.`); }
  });
  // 술식의 쓰임
  if (knowsArt(g, 'still_water') && circleOf(g) >= ARTS.still_water.circle) g.player.stress = Math.max(0, (g.player.stress ?? 0) - 3);
  if (knowsArt(g, 'ember_root') && circleOf(g) >= 1 && [12, 1, 2].includes(g.date.month)) g.player.money += 2;
  return out;
}
HOOKS.afterMonth.push((g) => { ruinsMonth(g); });

// 대를 이으면: 술식과 고대어는 사람 몫이라 사라지고, 글 조각과 마도서는 집에 남는다
HOOKS.heir.push((g) => {
  if (!g.ruins) return;
  const R = RU(g);
  R.known = []; R.work = null;
  R.tongue = Math.round(R.tongue * 0.25);
  R.readBy = {}; R.read = 0;
});
export { FRAGS };
