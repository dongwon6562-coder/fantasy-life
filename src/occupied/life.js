// 점령 아래의 삶: 점령의 날, 징발, 점령군 밑 자리(부역), 숨어서 맞서는 사람들, 밀고와 보복, 점령군 병사와의 정, 해방 뒤 부역자 심판.
// 새 행동은 없다. 점령된 고장에 있을 때만 사건으로 찾아온다. 매달 점령 세금(부역 자리면 녹봉)이 든다.
import { HOOKS } from '../hooks.js';
import { gainStat, gainSkill } from '../game.js';
import { EVENTS, age, here, onRoad, money, spend, stress, check, injure, setFlag } from '../events/core.js';
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { addNotoriety, jail, isJailed } from '../crime.js';
import { OC, occAt, SOLDIER_NAMES, TEMPERS, clamp, mi, placeName, olog } from './state.js';

const adult = (g) => age(g) >= 16 && !g.over && !g.bondage?.slave && !onRoad(g) && !isJailed(g) && !g.army?.campaign && !g.army?.captive;
const occHere = (g) => (adult(g) ? occAt(g, here(g)) : null);
const st = (g, k) => g.player.stats[k] ?? 0;
const sk = (g, k) => g.player.skills[k] ?? 0;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const M = (g) => OC(g).me;
const safeTo = (g) => ['leocast', 'harfen', 'ern'].find((pl) => !occAt(g, pl) && pl !== here(g)) ?? 'leocast';

// 매달: 점령 세금, 부역 자리 녹봉 (자리는 그 고장이 풀리면 끝난다)
HOOKS.afterMonth.push((g) => {
  if (!g.occ || g.over || !g.life) return;
  const me = M(g);
  if (me.post && !occAt(g, me.post)) me.post = null;
  const o = g.life.travel ? null : occAt(g, g.life.place);
  if (!o || age(g) < 16) return;
  if (me.post === g.life.place) g.player.money += 3;
  else g.player.money = Math.max(0, g.player.money - (o.ceded ? 1 : 2));
});

EVENTS.push(
  // ---------- 점령의 날 ----------
  {
    id: 'occ_arrive', urgent: true,
    cond: (g) => { const o = occHere(g); return !!o && M(g).seen[here(g)] !== o.since && mi(g) - o.since <= 6; },
    chance: () => 0.9, weight: 95,
    prepare: (g) => ({ pl: here(g), lord: occHere(g).lord, temper: occHere(g).temper }),
    title: '검은 독수리 깃발',
    text: (g, c) => `새벽에 말발굽 소리가 성문을 지나 광장까지 밀려왔다. 제국 병사들이 집집마다 문에 흰 종이를 붙인다. "${placeName(c.pl)}는 이제 발하르트 제국군의 관할이다. 통금은 해 질 녘부터. 무기를 가진 자는 사흘 안에 내놓을 것." 점령 영주 ${J(c.lord, '은/는')} ${TEMPERS[c.temper]}고 한다.`,
    choices: [
      { label: '고개를 숙이고 남는다', run: (g, rng, c) => { M(g).seen[c.pl] = occAt(g, c.pl)?.since; gainStat(g, 'wil', 0.3); stress(g, 4); return '문을 닫고 창틈으로 내다보았다. 병사들은 생각보다 어렸다. 그중 몇은 우리 말을 조금 할 줄 알았다. 그래도 그날 밤 아무도 잠을 자지 못했다.'; } },
      { label: '무기를 묻어 두고 남는다', run: (g, rng, c) => { const me = M(g); me.seen[c.pl] = occAt(g, c.pl)?.since; me.resist += 1; me.hid += 1; stress(g, 6); return '칼을 기름 먹인 천에 싸서 헛간 바닥 밑에 묻었다. 내놓으라는 사흘이 지났다. 이웃 몇도 같은 짓을 했다는 걸, 서로 눈빛으로 알았다.'; } },
      { label: '짐을 싸서 남쪽으로 피란 간다', run: (g, rng, c) => { const me = M(g); me.seen[c.pl] = occAt(g, c.pl)?.since; me.fled += 1; const to = safeTo(g); spend(g, Math.min(money(g), 6)); L(g).travel = { to, left: 1, from: c.pl }; olog(g, `${placeName(c.pl)}에서 피란 갔다.`); return `수레에 실을 수 있는 만큼 싣고 ${placeName(to)} 쪽 길로 나섰다. 길은 피란민으로 꽉 막혀 있었다. 뒤돌아보니 성문 위 깃발이 바람에 펄럭였다.`; } },
    ],
  },
  // ---------- 징발 ----------
  {
    id: 'occ_levy', cooldown: 24,
    cond: (g) => !!occHere(g) && M(g).seen[here(g)] != null,
    chance: (g) => 0.04 + (occHere(g)?.harsh ?? 0) * 0.0008, weight: 45,
    title: '징발',
    text: (g) => `제국 병사 넷이 장부를 들고 골목을 돈다. "군량 징발이다. 집마다 곡식 반 자루, 말이 있으면 말도." 앞집 노인이 자루를 끌어안고 버티다 개머리판에 맞았다. ${(occHere(g)?.harsh ?? 0) >= 50 ? '지난달에 숨긴 집은 지붕까지 뜯겼다.' : ''}`,
    choices: [
      { label: '내준다', run: (g) => { M(g).gave += 1; spend(g, Math.min(money(g), 8)); stress(g, 3); return '곡식 자루를 내밀었다. 병사가 장부에 줄 하나를 그었다. 겨울이 길어질 것이다.'; } },
      { label: '숨기고 버틴다', run: (g, rng) => { const o = occHere(g); if (check(rng, st(g, 'sen') + st(g, 'cha') / 2, 45 + (o?.harsh ?? 0) / 3)) { M(g).resist += 1; gainStat(g, 'sen', 0.4); return '곡식은 거름 더미 밑에 있었다. 병사가 마당을 한 바퀴 돌고 침을 뱉고 나갔다. 손이 한참 떨렸다.'; } spend(g, Math.min(money(g), 15)); injure(g, '개머리판에 맞은 어깨', 1); stress(g, 8); return '병사가 거름 더미를 쑤셨다. 자루가 나왔다. 곡식을 다 실어 갔고, 나는 개머리판에 어깨를 맞았다. 벌금까지 물었다.'; } },
      { label: '병사에게 은화를 쥐여 준다', run: (g, rng) => { spend(g, Math.min(money(g), 5)); if (rng.chance(0.7)) return '은화 다섯 닢이 병사 주머니로 들어갔다. 장부에는 "빈집"이라고 적혔다.'; stress(g, 5); return '병사는 은화를 받고도 곡식을 실어 갔다. 웃으면서.'; } },
    ],
  },
  // ---------- 점령군 밑 자리 (부역) ----------
  {
    id: 'occ_post', cooldown: 60,
    cond: (g) => !!occHere(g) && !M(g).post && age(g) >= 18 && (st(g, 'int') >= 25 || sk(g, 'letters') >= 15 || sk(g, 'trade') >= 15),
    chance: () => 0.04, weight: 40,
    prepare: (g) => ({ lord: occHere(g).lord, job: sk(g, 'letters') >= sk(g, 'trade') ? '통역 겸 서기' : '세금 걷는 일' }),
    title: '점령 영주의 부름',
    text: (g, c) => `${c.lord}의 부관이 찾아왔다. "글을 알고 고장 사정을 아는 사람이 필요하오. ${c.job}. 녹봉은 제국 은화로, 다달이." 문밖에서 이웃집 아이가 이쪽을 보고 있었다.`,
    choices: [
      { label: '받아들인다', run: (g, rng, c) => { const me = M(g); me.post = here(g); me.collab += 2; const o = occHere(g); if (o) o.collab = clamp(o.collab + 2, 0, 100); g.player.money += 6; olog(g, `${placeName(here(g))} 점령 관청에서 ${c.job}을 맡았다.`); return '제국 문장이 찍힌 띠를 팔에 둘렀다. 관청 책상은 따뜻했고 녹봉은 제때 나왔다. 장터에서 나를 보면 대화가 멈췄다.'; } },
      { label: '몸이 아프다고 둘러댄다', run: (g) => { gainStat(g, 'wil', 0.3); return '부관은 한참 나를 쳐다보다 "다른 사람도 많소"라며 돌아갔다. 그 다른 사람이 누가 될지 알 것 같았다.'; } },
      { label: '받아들이고 저항군에 몰래 흘린다', run: (g, rng, c) => { const me = M(g); me.post = here(g); me.collab += 1; me.resist += 2; g.player.money += 6; setFlag(g, 'occ_double'); stress(g, 6); olog(g, `${placeName(here(g))} 점령 관청에 들어가 몰래 저항군에 소식을 흘렸다.`); return '낮에는 제국 장부를 옮겨 적고, 밤에는 그 숫자를 종이쪽에 적어 빵집 뒷문 틈에 밀어 넣었다. 두 얼굴로 사는 건 생각보다 피곤했다.'; } },
    ],
  },
  // ---------- 숨어서 맞서는 사람들 ----------
  {
    id: 'occ_resist', cooldown: 36,
    cond: (g) => { const o = occHere(g); return !!o && o.resist >= 15; },
    chance: () => 0.05, weight: 40,
    title: '지하실의 손님',
    text: () => '밤늦게 뒷문을 두드리는 소리. 얼굴에 그을음을 바른 젊은이가 다리를 절며 서 있다. "보급 창고를 태우다 쫓기고 있소. 하룻밤만. 아니면 이 쪽지를 내일 아침 대장간에 전해 주기만이라도."',
    choices: [
      { label: '지하실에 숨겨 준다', run: (g, rng) => { const me = M(g), o = occHere(g); me.resist += 2; me.hid += 1; if (o) o.resist = clamp(o.resist + 1, 0, 100); if (rng.chance(0.15 + (o?.harsh ?? 0) / 400)) { injure(g, '심문 때 맞은 자국', 2); spend(g, Math.min(money(g), 20)); addNotoriety(g, 6); stress(g, 10); olog(g, '저항군을 숨겼다가 붙잡혀 심문을 받았다.'); return '새벽에 군화 소리가 났다. 지하실 문이 열렸을 때 젊은이는 이미 창으로 빠져나간 뒤였다. 나는 사흘 동안 관청 지하에서 심문을 받았다. 아무 말도 하지 않았다.'; } renown(g, 2); return '젊은이는 밤새 신음을 참았다. 새벽 안개가 낄 때 그는 고맙다는 말도 없이 사라졌다. 며칠 뒤, 성 밖 다리 하나가 무너졌다는 소식을 들었다.'; } },
      { label: '쪽지만 전해 준다', run: (g, rng) => { M(g).resist += 1; gainStat(g, 'sen', 0.3); return '쪽지를 빵 바구니 밑에 넣고 대장간 앞을 지났다. 대장장이가 바구니를 받으며 눈을 한 번 깜박였다. 그게 다였다.'; } },
      { label: '문을 닫는다', run: (g) => { stress(g, 3); return '문을 닫고 빗장을 걸었다. 발소리가 멀어지고, 한참 뒤 멀리서 호루라기 소리가 났다.'; } },
      { label: '점령군에 알린다', run: (g) => { const me = M(g), o = occHere(g); me.informed += 1; me.collab += 2; g.player.money += 12; if (o) o.resist = clamp(o.resist - 3, 0, 100); olog(g, '쫓기는 저항군을 점령군에 알렸다.'); return '호루라기가 울리고 젊은이는 골목 끝에서 붙잡혔다. 관청에서 은화 열두 닢이 왔다. 그 은화로 산 빵은 맛이 없었다.'; } },
    ],
  },
  // ---------- 밀고 ----------
  {
    id: 'occ_informer', cooldown: 48,
    cond: (g) => { const o = occHere(g); return !!o && (M(g).resist >= 2 || M(g).hid >= 1); },
    chance: () => 0.04, weight: 40,
    title: '누군가 일렀다',
    text: () => '빨래터에서 아낙들이 소곤거린다. 누군가 관청에 이름 몇 개를 적어 냈다고. 내 이름도 있다는 말이 돌았다. 적어 낸 사람이 건넛집 방앗간 사위라는 것도.',
    choices: [
      { label: '먼저 숨어 지낸다', run: (g) => { stress(g, 5); gainStat(g, 'sen', 0.4); return '한 달을 친척 집 다락에서 지냈다. 관청 사람들이 두 번 찾아왔다 갔다. 돌아왔을 때 방앗간 사위는 나를 똑바로 보지 못했다.'; } },
      { label: '저항군에게 그 이름을 넘긴다', run: (g, rng) => { const me = M(g); me.resist += 1; stress(g, 8); olog(g, '밀고자의 이름을 저항군에 넘겼다.'); return '그 이름을 대장간에 흘렸다. 보름 뒤 방앗간 사위가 강에서 떠올랐다. 아무도 울지 않았다. 나는 잠을 설쳤다.'; } },
      { label: '관청에 가서 먼저 해명한다', run: (g, rng) => { const me = M(g); if (check(rng, st(g, 'cha') + st(g, 'int') / 2, 55)) { me.collab += 1; return '부관 앞에서 고개를 숙이고 말을 골랐다. 부관은 이름 하나에 줄을 그었다. 대신 다음에 무엇이든 들으면 알려 달라고 했다.'; } jail(g, 2); addNotoriety(g, 4); return '해명은 통하지 않았다. 두 달을 관청 지하 감옥에서 보냈다.'; } },
    ],
  },
  // ---------- 점령군 병사와의 정 ----------
  {
    id: 'occ_soldier', cooldown: 120,
    cond: (g) => !!occHere(g) && !M(g).bond && age(g) <= 45,
    chance: () => 0.025, weight: 30,
    prepare: (g, rng) => ({ name: rng.pick(SOLDIER_NAMES) }),
    title: '골목의 병사',
    text: (g, c) => `우물가에서 물동이를 들어 주던 제국 병사 ${J(c.name, '이/가')} 서툰 우리 말로 고향 이야기를 했다. 국경 너머 작은 마을, 어머니가 굽던 검은 빵. 열아홉이라고 했다. 그 뒤로 ${J(c.name, '은/는')} 순찰 때마다 우리 집 앞에서 걸음을 늦춘다.`,
    choices: [
      { label: '말을 섞고 지낸다', run: (g, rng, c) => { const me = M(g); me.bond = c.name; me.collab += 1; gainStat(g, 'cha', 0.4); olog(g, `제국 병사 ${J(c.name, '과/와')} 정이 들었다.`); return `${J(c.name, '은/는')} 가끔 병영에서 남은 소금과 기름을 슬쩍 놓고 갔다. 나는 그에게 우리 말을 몇 마디 더 가르쳤다. 이웃들은 그걸 보았고, 기억해 두었다.`; } },
      { label: '거리를 둔다', run: (g, rng, c) => { gainStat(g, 'wil', 0.3); return `물동이를 도로 빼앗아 들고 돌아섰다. 등 뒤에서 ${J(c.name, '이/가')} 무언가 말했지만 알아듣지 못한 척했다.`; } },
    ],
  },
  // ---------- 해방 뒤 부역자 심판 ----------
  {
    id: 'occ_trial', urgent: true,
    cond: (g) => adult(g) && OC(g).tried[here(g)] != null && mi(g) - OC(g).tried[here(g)] <= 24 && (OC(g).me.triedAt ?? {})[here(g)] !== OC(g).tried[here(g)],
    chance: () => 0.7, weight: 90,
    prepare: (g) => { const me = M(g); return { pl: here(g), mine: me.collab >= 2 || me.post === here(g) || me.informed > 0, bond: me.bond }; },
    title: '광장의 심판',
    text: (g, c) => (c.mine
      ? `해방의 종이 그친 지 사흘. 광장에 사람들이 모였다. 누군가 내 이름을 불렀다. "점령 관청에서 녹봉 받던 자!" "제국 놈들한테 이름을 일러바친 자!" 손에 몽둥이와 가위를 든 사람들이 이쪽을 돌아본다.`
      : `해방의 종이 그친 지 사흘. 광장에서 사람들이 부역자들을 끌어낸다. 점령 관청 서기, 제국 병사와 어울리던 과부, 곡식을 대고 돈을 번 상인. 가위로 머리를 깎이고, 목에 팻말이 걸린다. ${c.bond ? `누군가 ${c.bond}의 이름을 대며 내 쪽을 본다.` : '사람들이 나에게도 몽둥이를 쥐여 주려 한다.'}`),
    choices: [
      { label: (g, c) => (c?.mine ? '앞에 나서서 해명한다' : '함께 끌어낸다'), run: (g, rng, c) => { const me = M(g); (me.triedAt ??= {})[c.pl] = OC(g).tried[c.pl]; me.tried += 1; if (c.mine) { if (check(rng, st(g, 'cha') + (g.flags?.occ_double ? 30 : 0) + me.resist * 4, 60 + me.collab * 4)) { me.post = null; renown(g, g.flags?.occ_double ? 6 : 0); olog(g, '부역자 심판에서 풀려났다.'); return g.flags?.occ_double ? '대장장이가 앞으로 나와 내가 밤마다 흘린 쪽지 이야기를 했다. 사람들이 하나둘 몽둥이를 내렸다. 누군가 내 어깨를 두드렸다. 그래도 끝까지 노려보는 눈이 몇 있었다.' : '살려고 한 일이라고, 내 손에 피는 묻히지 않았다고 말했다. 사람들은 반쯤 믿었다. 몽둥이는 내려갔지만 그 뒤로 장터에서 내게 물건을 파는 집이 줄었다.'; } me.post = null; injure(g, '광장에서 맞은 상처', 2); spend(g, Math.min(money(g), 30)); addNotoriety(g, 5); stress(g, 12); olog(g, '부역자 심판에서 매를 맞고 재산을 빼앗겼다.'); return '말을 다 끝내기도 전에 돌이 날아왔다. 머리를 깎이고, 팻말을 목에 걸고, 광장을 세 바퀴 돌았다. 집에 돌아오니 창이 다 깨져 있었다.'; } stress(g, 4); gainStat(g, 'str', 0.2); return '사람들 틈에 섞여 서기의 팔을 붙잡았다. 서기는 울면서 아이들 이름을 불렀다. 그날 밤 손에 남은 감촉이 오래 갔다.'; } },
      { label: (g, c) => (c?.mine ? '밤에 몰래 떠난다' : '끌려가는 이웃을 감싼다'), run: (g, rng, c) => { const me = M(g); (me.triedAt ??= {})[c.pl] = OC(g).tried[c.pl]; if (c.mine) { me.post = null; me.fled += 1; L(g).travel = { to: 'leocast', left: 2, from: c.pl }; olog(g, '부역자 심판을 피해 고장을 떠났다.'); return '밤길로 고장을 빠져나왔다. 뒤에서 횃불이 내 집 쪽으로 몰려가는 게 보였다. 다시는 돌아올 수 없을 것이다.'; } if (check(rng, st(g, 'cha') + st(g, 'wil') / 2, 55)) { renown(g, 3); gainStat(g, 'wil', 0.4); return '과부 앞을 막아섰다. "이 사람이 판 건 빨래 품이오, 고장이 아니오." 사람들이 웅성거리다 흩어졌다. 과부는 말없이 내 손을 잡았다.'; } injure(g, '광장에서 맞은 상처', 1); stress(g, 6); return '막아서다 같이 맞았다. 사람들은 나를 "제국 놈 편"이라고 불렀다. 과부는 끝내 머리를 깎였다.'; } },
      { label: '집에 틀어박힌다', run: (g, rng, c) => { const me = M(g); (me.triedAt ??= {})[c.pl] = OC(g).tried[c.pl]; if (c.mine) { me.post = null; stress(g, 8); return '문을 걸어 잠갔다. 밤새 누가 대문을 걷어찼다. 아침에 보니 문에 붉은 글씨로 "부역자"라고 쓰여 있었다. 그 글씨는 몇 해가 지나도 희미하게 남았다.'; } return '창을 닫았다. 광장의 소리는 창을 닫아도 들렸다.'; } },
    ],
  },
);
