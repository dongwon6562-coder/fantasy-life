// 개척에 나서는 일: 나라 수도에서 개척 허가장을 받고, 고장에서 개척민과 식량·연장·경비를 모으고,
// 개척단을 이끌고 변경 너머로 떠난다. 천막을 치고 첫 겨울을 넘기고, 마물을 막고, 먼저 살던 이들과 선물·약조·싸움 가운데 길을 고르고,
// 개척촌에 이름을 붙인다. 남이 연 개척촌에 들어가 개척민으로 살다가 촌장으로 뽑히기도 한다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainStat } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, spend, canSpend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { playerPower } from '../adventure/combat.js';
import { deed } from '../repute/index.js';
import { PLACES, travelMonths } from '../places.js';
import { FS, SITES, SITE_IDS, NATIVES, NAMES, STAGES, clamp, mi, flog, siteName, ira, foodWord } from './state.js';
import { found, nameSite } from './world.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const st = (g, k) => g.player.stats[k] ?? 0;
const site = (g, id) => FS(g).sites[id] ?? null;
const landOf = (id) => SITES[id]?.land ?? '변경';
const WINTER = [12, 1, 2];
// 개척민을 모을 수 있는 고장 (땅을 잃은 사람과 둘째 아들들이 있는 곳)
const GATHER = ['ern', 'harfen', 'verden', 'leocast', 'gruental', 'klein', 'graubel', 'eisen', 'fur', 'barka'];
const grants = (pl) => SITE_IDS.filter((id) => SITES[id].grant === pl);
const emptyFree = (g) => SITE_IDS.filter((id) => !SITES[id].claim && site(g, id).stage === 0);
const atSite = (g) => (SITES[here(g)] && site(g, here(g)).stage >= 1 ? here(g) : null);
const isHome = (g, id) => site(g, id)?.chief || FS(g).me.home === id;

/* ---------- 개척 허가장 ---------- */
ACTIONS.push({
  id: 'frontier_charter', name: '개척 허가장을 청한다', icon: 'scroll',
  desc: '나라 문서고에 가서 변경 너머 빈 땅의 개척 허가장을 청한다. 허가장이 있으면 그 땅에서 일군 것이 법으로 내 것이 된다.',
  available: (g) => free(g) && !FS(g).charter && grants(here(g)).some((id) => site(g, id).stage === 0) && !sceneQueued(g, 'frontier_charter'),
  run(g) { queueScene(g, 'frontier_charter', { place: here(g) }, { first: true }); return '문서고 서기 앞에 줄을 섰다. 앞사람은 땅 문서를, 그 앞사람은 빚 문서를 들고 있었다.'; },
});
const charterCost = (g) => ((L(g).renown ?? 0) >= 15 || g.domain ? 60 : 110);
defineScene('frontier_charter', {
  title: () => '개척 허가장',
  text: (g, s) => `서기가 두꺼운 장부를 펼쳤다. "${grants(s.place).filter((id) => site(g, id).stage === 0).map((id) => landOf(id)).join(', ')}. 지금 비어 있는 땅은 이것뿐이오. 허가장을 받으면 열 해 안에 사람을 들여야 하오. 못 들이면 도로 거둡니다." ${(L(g).renown ?? 0) >= 15 || g.domain ? '서기는 내 이름을 듣고 고개를 끄덕였다.' : '서기는 내 이름을 처음 듣는 눈치다. 뒷돈이 필요할 것이다.'}`,
  choices: (g, s) => {
    if (!free(g) || here(g) !== s.place || FS(g).charter) return [];
    const cost = charterCost(g);
    return [
      ...grants(s.place).filter((id) => site(g, id).stage === 0 && canSpend(g, cost)).map((id) => ({ label: `${landOf(id)} 허가장 (은화 ${cost}닢)`, key: id })),
      { label: '그만둔다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    if (key === 'leave' || !SITES[key]) return '장부를 덮었다.';
    if (site(g, key).stage !== 0) return '그 땅에는 이미 다른 개척단이 들어갔다고 했다.';
    const cost = charterCost(g);
    if (!spend(g, cost)) return '값이 모자랐다.';
    const F = FS(g);
    F.charter = { site: key, at: mi(g), legal: true };
    F.me.charters += 1;
    flog(g, `${landOf(key)} 개척 허가장을 받았다.`);
    return `붉은 밀랍 도장이 찍힌 양피지를 받았다. "${landOf(key)} 개척을 허락함." 그 밑에 내 이름이 있다. 이제 사람과 식량을 모아야 한다. 개척민을 모을 수 있는 고장에서 "개척민을 모은다".`;
  },
});

/* ---------- 개척민을 모은다 ---------- */
const targets = (g) => {
  const F = FS(g), out = [];
  if (F.charter && site(g, F.charter.site).stage === 0) out.push({ id: F.charter.site, legal: true });
  for (const id of emptyFree(g)) out.push({ id, legal: true });
  for (const id of SITE_IDS) if (SITES[id].claim && site(g, id).stage === 0 && F.charter?.site !== id) out.push({ id, legal: false });
  return out.slice(0, 5);
};
ACTIONS.push({
  id: 'frontier_gather', name: '개척민을 모은다', icon: 'home',
  desc: '변경 너머로 함께 갈 사람을 모은다. 땅을 잃은 소작농, 둘째 아들, 빚쟁이를 피하는 사람들. 식량과 연장과 경비도 갖춰야 한다.',
  available: (g) => free(g) && GATHER.includes(here(g)) && (!!FS(g).party || targets(g).length > 0) && !FS(g).party?.going && !sceneQueued(g, 'frontier_gather'),
  run(g) { queueScene(g, 'frontier_gather', { place: here(g) }, { first: true }); return '장터 게시판에 방을 붙였다. "변경 너머 땅, 한 집에 밭 스무 마지기. 첫해 식량 대 줌."'; },
});
const recruitCost = (g) => (g.world?.famine ? 4 : 12);
const foodCost = (p) => Math.max(6, Math.round(p.settlers * 1.2));
defineScene('frontier_gather', {
  title: () => '개척단 꾸리기',
  text: (g) => {
    const p = FS(g).party;
    if (!p) return `어디로 갈지부터 정해야 한다. 허가장 없이 남의 나라가 제 것이라 하는 땅에 들어가면, 일군 것을 언제 빼앗길지 모른다.${g.world?.famine ? ' 흉년이라 땅을 찾아 떠나려는 집이 많다.' : ''}`;
    return `${J(landOf(p.site), '으로/로')} 갈 개척단. 지금 ${p.settlers}집, 식량 ${p.food}달치, ${p.tools ? '연장을 갖췄다' : '연장이 모자라다'}, ${p.guards ? '경비를 샀다' : '경비가 없다'}. ${p.settlers >= 5 ? `${PLACES[SITES[p.site].near]?.name ?? '들어가는 고장'}에서 개척단을 이끌고 떠날 수 있다.` : '다섯 집은 있어야 떠날 수 있다.'}`;
  },
  choices: (g, s) => {
    if (!free(g) || here(g) !== s.place) return [];
    const F = FS(g), p = F.party;
    if (!p) return [...targets(g).map((t) => ({ label: `${landOf(t.id)}${t.legal ? '' : ' (허가장 없이)'}`, key: `to:${t.id}` })), { label: '그만둔다', key: 'leave' }];
    return [
      ...(canSpend(g, recruitCost(g)) && p.settlers < 40 ? [{ label: `다섯 집을 더 모은다 (은화 ${recruitCost(g)}닢)`, key: 'recruit' }] : []),
      ...(canSpend(g, foodCost(p)) ? [{ label: `석 달치 식량을 산다 (은화 ${foodCost(p)}닢)`, key: 'food' }] : []),
      ...(!p.tools && canSpend(g, 25) ? [{ label: '도끼·쟁기·톱을 갖춘다 (은화 25닢)', key: 'tools' }] : []),
      ...(!p.guards && canSpend(g, 35) ? [{ label: '경비 몇을 산다 (은화 35닢)', key: 'guards' }] : []),
      { label: '개척단을 해산한다', key: 'disband' },
      { label: '오늘은 여기까지', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const F = FS(g);
    if (key === 'leave') return '방을 한 장 더 붙이고 돌아왔다.';
    if (key.startsWith('to:')) {
      const id = key.slice(3);
      if (!SITES[id] || site(g, id).stage !== 0) return '그 땅에는 이미 누가 들어갔다.';
      F.party = { site: id, settlers: 0, food: 0, tools: false, guards: false, legal: F.charter?.site === id || !SITES[id].claim, going: false };
      return `${landOf(id)}. ${SITES[id].desc} 이제 사람을 모은다.`;
    }
    const p = F.party;
    if (!p) return '모으던 개척단이 없다.';
    if (key === 'disband') { F.party = null; return `모았던 사람들에게 미안하다고 했다. ${p.settlers ? '몇은 욕을 했고, 몇은 안도했다.' : ''}`.trim(); }
    if (key === 'recruit') {
      if (!spend(g, recruitCost(g))) return '돈이 모자랐다.';
      p.settlers += 5; tired(g, 8);
      return rng.pick(['소작 땅을 잃은 형제 둘이 식구를 데리고 왔다. 손바닥이 쟁기 자루 모양으로 굳어 있다.', '빚쟁이를 피해 왔다는 대장장이가 이름을 적었다. 이름이 가짜인 것 같지만 망치질은 진짜다.', '과부 하나가 아이 셋을 데리고 왔다. "밭은 내가 갈아요. 아이들은 돌을 고르고."', '둘째, 셋째 아들들. 물려받을 땅이 없는 사람들. 다섯 집이 한꺼번에 이름을 적었다.']);
    }
    if (key === 'food') { if (!spend(g, foodCost(p))) return '돈이 모자랐다.'; p.food += 3; return '밀 자루와 절인 고기, 마른 콩을 수레에 실었다. 첫 거둠까지 버티려면 아직도 모자랄지 모른다.'; }
    if (key === 'tools') { if (!spend(g, 25)) return '돈이 모자랐다.'; p.tools = true; return '도끼 열 자루, 쟁기 날 넷, 톱 둘. 대장장이가 날을 세워 주며 "돌밭이면 두 번은 다시 갈아야 하오" 했다.'; }
    if (key === 'guards') { if (!spend(g, 35)) return '돈이 모자랐다.'; p.guards = true; return '일감 없는 용병 넷을 샀다. 한 해치 품삯의 절반을 먼저 주었다.'; }
    return '방을 붙였다.';
  },
});

/* ---------- 개척단을 이끌고 떠난다 ---------- */
ACTIONS.push({
  id: 'frontier_go', name: '개척단을 이끌고 떠난다', icon: 'wander',
  desc: '모은 사람들과 수레를 이끌고 변경 너머 빈 땅으로 떠난다.',
  available: (g) => { const p = FS(g).party; return free(g) && !!p && !p.going && p.settlers >= 5 && here(g) === SITES[p.site]?.near; },
  run(g) {
    const p = FS(g).party, d = SITES[p.site];
    p.going = true;
    L(g).travel = { to: p.site, left: d.months, from: here(g) };
    if (L(g).job) L(g).job = null;
    return `새벽에 수레 ${Math.ceil(p.settlers / 2)}대가 줄지어 성문을 나섰다. 아이들이 수레 위에서 손을 흔들었다. ${d.land}까지 ${d.months}달 길이다.`;
  },
});
// 도착: 빈 땅이면 천막을 친다. 그사이 누가 먼저 들어왔으면 그 개척촌에 합친다.
function arrive(g) {
  const F = FS(g), p = F.party, id = p.site, s = site(g, id);
  F.party = null;
  const pop = p.settlers * 4 + 2;
  F.me.settlers += p.settlers; F.me.led += 1;
  if (s.stage === 0) {
    found(g, id, 'me', { pop, food: p.food + 1, safety: 8 + (p.tools ? 6 : 0) + (p.guards ? 20 : 0), byName: `${g.player.name}의 개척단` });
    s.legal = !!p.legal; s.tools = !!p.tools;
    F.me.founded += 1; F.me.home = id;
    if (F.charter?.site === id) F.charter = null;
    renown(g, 5);
    chron(g, `${g.player.name}, 개척단을 이끌고 변경 너머 ${SITES[id].land}에 천막을 치다.`, 40);
    flog(g, `${SITES[id].land}에 내 개척단의 천막을 쳤다.`);
    queueScene(g, 'frontier_arrive', { site: id }, { first: true });
    return;
  }
  s.pop += pop; s.food += p.food; F.me.home = id; F.me.joined += 1;
  note(g, `${siteName(id, s)}에 닿아 보니 ${J(s.byName ?? '다른 개척단', '이/가')} 먼저 와 있었다. 내 사람들은 그들 곁에 천막을 쳤다.`);
}
HOOKS.afterMonth.push((g) => {
  if (!g.frontier || g.over || !g.life) return;
  const F = FS(g), p = F.party;
  if (p?.going && here(g) === p.site && !L(g).travel) arrive(g);
  else if (p?.going && !L(g).travel && here(g) !== p.site) { p.going = false; } // 길에서 돌아섰다
  // 사는 개척촌의 겨울
  const id = atSite(g);
  if (id && isHome(g, id) && WINTER.includes(g.date.month) && site(g, id).food < 2 && !sceneQueued(g, 'frontier_winter') && mi(g) - (F.winterAt ?? -99) >= 3) {
    F.winterAt = mi(g);
    queueScene(g, 'frontier_winter', { site: id }, { first: true });
  }
});
defineScene('frontier_arrive', {
  title: (g, s) => SITES[s.site]?.land ?? '변경 너머',
  text: (g, s) => {
    const d = SITES[s.site], N = d.native ? NATIVES[d.native] : null, x = site(g, s.site);
    return `${d.desc} 첫날 밤, 수레를 둥글게 세우고 그 안에 불을 피웠다. ${x.lost ? `풀숲에 예전 개척민들이 버리고 간 울타리 기둥이 썩어 있었다. 누구도 그 이야기를 하지 않았다. ` : ''}${N && x.natives !== null ? `사흘째 되는 날, 언덕 위에 ${N.name} 사람들이 서서 우리를 내려다보았다. ${N.word}` : '아무도 우리를 맞으러 오지 않았다. 이 땅에는 정말 아무도 없다.'}`;
  },
  choices: (g, s) => (free(g) && here(g) === s.site ? [{ label: '천막을 치고 땅을 갈기 시작한다', key: 'ok' }] : []),
  resolve() { return '첫 고랑을 냈다. 돌이 쟁기 날에 부딪혀 불꽃이 튀었다. 아이들이 돌을 주워 밭 가장자리에 쌓았다. 그것이 첫 울타리가 되었다.'; },
});

/* ---------- 개척촌을 돌본다 ---------- */
ACTIONS.push({
  id: 'frontier_work', name: '개척촌 일을 한다', icon: 'home',
  desc: '개척촌에서 밭을 일구고, 목책을 세우고, 사냥을 나간다. 촌장이면 사람을 더 부르고, 먼저 살던 이들과 이야기하고, 이름을 붙인다.',
  available: (g) => free(g) && !!atSite(g) && !sceneQueued(g, 'frontier_work'),
  run(g) { queueScene(g, 'frontier_work', { site: here(g) }, { first: true }); return `${siteName(here(g), site(g, here(g)))}의 아침. 닭보다 먼저 일어난 사람들이 벌써 밭에 나가 있다.`; },
});
defineScene('frontier_work', {
  title: (g, s) => siteName(s.site, site(g, s.site)),
  text: (g, s) => {
    const x = site(g, s.site), d = SITES[s.site], N = d.native ? NATIVES[d.native] : null;
    return `${STAGES[x.stage]}, 사람 ${x.pop}명. ${foodWord(x.food)}. ${x.safety >= 40 ? '목책이 둘려 있다.' : '울타리가 엉성하다.'} ${x.chief ? '나는 이곳의 촌장이다.' : x.mine ? '내가 이끌고 온 사람들이다.' : `${J(x.byName ?? '개척단', '이/가')} 일군 곳이다.`}${N && x.natives !== null ? ` ${N.name}: ${x.natives >= 15 ? '물건을 바꾸러 온다' : x.natives > -15 ? '멀리서 지켜본다' : '경계한다'}.` : ''}`;
  },
  choices: (g, s) => {
    const x = site(g, s.site);
    if (!free(g) || here(g) !== s.site || !x || x.stage < 1) return [];
    const N = SITES[s.site].native;
    return [
      { label: '밭을 일군다', key: 'clear' },
      { label: x.chief ? '목책과 망루를 세운다 (은화 15닢)' : '목책 세우는 일을 거든다', key: 'fence', ...(x.chief && !canSpend(g, 15) ? { skip: true } : {}) },
      { label: '사냥을 나간다', key: 'hunt' },
      ...(x.chief && canSpend(g, 30) && x.pop < 200 ? [{ label: '고향에 사람을 보내 개척민을 더 부른다 (은화 30닢)', key: 'call' }] : []),
      ...(x.chief && N && x.natives !== null ? [{ label: `${J(NATIVES[N].name, '을/를')} 찾아간다`, key: 'natives' }] : []),
      ...(x.chief && !x.name ? [{ label: '마을에 이름을 붙인다', key: 'name' }] : []),
      ...(x.chief && SITES[s.site].claim && x.stage >= 2 ? [{ label: '나라에 넘기고 촌장에서 물러난다', key: 'hand' }] : []),
      ...(!x.chief && FS(g).me.home !== s.site ? [{ label: '여기 눌러살기로 한다', key: 'settle' }] : []),
    ].filter((c) => !c.skip).map(({ skip, ...c }) => c);
  },
  resolve(g, rng, s, key) {
    const F = FS(g), x = site(g, s.site);
    if (!x || x.stage < 1) return '개척촌은 이미 비어 있었다.';
    if (here(g) !== s.site) return '개척촌에서 너무 멀어졌다.';
    if (key === 'clear') {
      tired(g, 22); gainStat(g, 'str', 0.3);
      const add = 0.8 + st(g, 'str') / 80 + (x.tools ? 0.4 : 0);
      x.food = Math.min(14, x.food + add); x.morale = clamp(x.morale + 2, 0, 100);
      return rng.pick(['그루터기 하나를 뽑는 데 하루가 걸렸다. 그 자리에 내년 봄 밀이 설 것이다.', '돌을 고르고, 갈고, 또 돌을 골랐다. 이 땅은 돌을 키우는 것 같다.', '새로 일군 밭 끝에 말뚝을 박았다. 이 고랑까지가 우리 밭이다.', '도랑을 파서 샘물을 밭으로 끌었다. 저녁에 물이 고랑을 따라 흐르는 것을 다 같이 서서 보았다.']);
    }
    if (key === 'fence') {
      if (x.chief && !spend(g, 15)) return '목재 값이 모자랐다.';
      tired(g, 18); x.safety = clamp(x.safety + (x.chief ? 12 : 5), 0, 100);
      return x.chief ? '참나무 말뚝을 깎아 둘레에 박고, 모퉁이마다 망루를 올렸다. 처음으로 밤에 다들 깊이 잤다.' : '말뚝을 나르고 구덩이를 팠다. 저녁에 목책이 한 뼘 더 길어졌다.';
    }
    if (key === 'hunt') {
      tired(g, 18);
      if (check(rng, playerPower(g) / 2 + st(g, 'sen'), 45)) { x.food = Math.min(14, x.food + 1.2); return rng.pick(['사슴 두 마리를 끌고 돌아왔다. 그날 밤 개척촌에 고기 굽는 냄새가 났다.', '들소 한 마리. 셋이 하루 종일 걸려 끌고 왔다. 가죽은 겨울 문짝이 된다.']); }
      if (rng.chance(0.3)) injure(g, '사냥길에 마물에게 물린 상처', 3);
      return '하루 종일 쫓았지만 빈손이었다. 돌아오는 길에 낯선 짐승의 발자국을 보았다. 사람 손바닥보다 컸다.';
    }
    if (key === 'call') {
      if (!spend(g, 30)) return '돈이 모자랐다.';
      const n = rng.int(8, 16); x.pop += n; x.morale = clamp(x.morale + 4, 0, 100); F.me.settlers += Math.round(n / 4);
      return `고향 장터에 사람을 보냈다. 한 달 뒤 수레 넷이 들어왔다. ${n}명. 개척촌에 처음 보는 얼굴이 늘었다.`;
    }
    if (key === 'natives') { queueScene(g, 'frontier_natives', { site: s.site }, { first: true }); return '선물 꾸러미를 메고 언덕을 넘었다.'; }
    if (key === 'name') { queueScene(g, 'frontier_name', { site: s.site }, { first: true }); return '저녁에 사람들을 모닥불 가에 모았다.'; }
    if (key === 'hand') {
      const pay = Math.round(x.pop * 0.6);
      g.player.money += pay; x.chief = false; x.mine = false; F.me.left += 1;
      if (F.me.home === s.site) F.me.home = null;
      flog(g, `${J(siteName(s.site, x), '을/를')} 나라에 넘기고 물러났다.`);
      return `나라에서 온 관리가 마을 장부를 받아 갔다. 은화 ${pay}닢이 수고비로 나왔다. 이제 이곳에는 나라가 보낸 촌장이 앉는다. 사람들은 한동안 나를 여전히 촌장이라 불렀다.`;
    }
    if (key === 'settle') {
      F.me.home = s.site; F.me.joined += 1;
      return '빈 땅 한 뙈기를 받았다. 이웃들이 통나무를 날라 주었다. 사흘 만에 지붕이 올라갔다.';
    }
    return '하루가 갔다.';
  },
});

/* ---------- 먼저 살던 이들 ---------- */
defineScene('frontier_natives', {
  title: (g, s) => NATIVES[SITES[s.site]?.native]?.name ?? '먼저 살던 이들',
  text: (g, s) => {
    const N = NATIVES[SITES[s.site].native], x = site(g, s.site);
    return `${N.word} 그들의 어른이 말했다. "너희가 빈 땅이라 부르는 곳에서 우리 할아버지의 할아버지가 사냥을 했다." 바라는 것은 하나다. ${N.want}. ${x.natives <= -40 ? '눈빛이 차갑다. 이미 피를 본 사이다.' : x.natives >= 30 ? '서로 얼굴을 안다. 아이들이 우리 아이들과 같이 논다.' : ''}`.trim();
  },
  choices: (g, s) => {
    const x = site(g, s.site), N = NATIVES[SITES[s.site]?.native];
    if (!N || !x || x.natives === null || !free(g) || here(g) !== s.site || !x.chief) return [];
    return [
      ...(canSpend(g, 15) ? [{ label: `선물을 건넨다: ${N.gift} (은화 15닢)`, key: 'gift' }] : []),
      ...(!x.pact ? [{ label: `약조를 맺는다: ${N.want}`, key: 'pact' }] : []),
      { label: '그들을 이 땅에서 몰아낸다', key: 'drive' },
      { label: '말없이 돌아온다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const F = FS(g), x = site(g, s.site), d = SITES[s.site], N = NATIVES[d.native];
    if (!N || !x || x.natives === null) return '그들은 이미 떠나고 없었다.';
    if (key === 'leave') return '고개를 숙이고 돌아왔다. 할 말을 찾지 못했다.';
    if (key === 'gift') { if (!spend(g, 15)) return '선물 값이 모자랐다.'; x.natives = clamp(x.natives + 20, -100, 100); return `${J(N.gift, '을/를')} 내려놓았다. 어른이 받아 들고 한참 들여다보더니 고개를 끄덕였다. 다음 달, 그들이 말린 고기를 들고 찾아왔다.`; }
    if (key === 'pact') {
      if (check(rng, st(g, 'cha') + st(g, 'int') / 2 + Math.max(0, x.natives) / 2, 45)) {
        x.pact = true; x.natives = clamp(x.natives + 35, -100, 100); F.me.treaties += 1; renown(g, 3);
        deed(g, 'honest', 5, `${J(g.player.name, '이/가')} 변경에서 ${J(N.name, '과/와')} 약조를 맺었다더라`, d.near);
        flog(g, `${siteName(s.site, x)}: ${J(N.name, '과/와')} 약조를 맺었다.`);
        return `"${N.want}." 그 말을 양쪽 말로 두 번 되풀이하고, 칼끝으로 손바닥을 그어 같은 돌에 피를 묻혔다. 밭 몇 마지기를 포기했다. 대신 겨울에 굶어 죽는 사람이 줄 것이다.`;
      }
      x.natives = clamp(x.natives - 5, -100, 100);
      return '말이 엇갈렸다. 우리가 내놓은 것은 그들에게 아무것도 아니었고, 그들이 바란 것은 우리에게 너무 컸다. 어른은 일어나 돌아갔다.';
    }
    tired(g, 25); stress(g, 8);
    if (check(rng, playerPower(g) + x.safety / 3 + x.pop / 10, 70)) {
      x.natives = null; F.me.drove += 1;
      deed(g, 'kind', -10, `${J(g.player.name, '이/가')} 변경에서 ${J(N.name, '을/를')} 몰아냈다더라`, d.near);
      chron(g, `${g.player.name}의 개척민들, ${J(N.name, '을/를')} ${SITES[s.site].land}에서 몰아내다.`, 30);
      flog(g, `${siteName(s.site, x)}: ${J(N.name, '을/를')} 몰아냈다.`);
      return `새벽에 횃불을 들고 갔다. 그들은 싸우다 물러났고, 물러나다 흩어졌다. 그날 밤 개척민들은 술을 마셨다. 나는 그들이 버리고 간 ${d.native === 'elf' ? '나무에 새긴 이름들' : d.native === 'fen' ? '장대 집' : '불 꺼진 화덕'}을 오래 보았다.`;
    }
    injure(g, `${J(N.name, '과/와')} 싸우다 입은 상처`, 4);
    x.natives = clamp(x.natives - 30, -100, 100); x.pop = Math.max(0, x.pop - rng.int(2, 6)); x.morale = clamp(x.morale - 10, 0, 100);
    if (rng.chance(0.08)) L(g).pendingDeath = '변경의 싸움';
    return '그들은 이 땅을 우리보다 잘 알았다. 풀숲에서 화살이 날아왔다. 개척민 몇이 돌아오지 못했다. 이제 그들은 원수다.';
  },
});

/* ---------- 이름 붙이기 ---------- */
defineScene('frontier_name', {
  title: () => '마을 이름',
  text: (g, s) => `모닥불 가에 개척민들이 모였다. 이 땅은 아직 남들이 부르는 이름뿐이다. ${SITES[s.site].land}. 우리가 살 곳에는 우리가 부를 이름이 있어야 한다. 누군가 "촌장이 정하시오" 했다.`,
  choices: (g, s) => {
    const x = site(g, s.site);
    if (!x || x.name || !x.chief || !free(g) || here(g) !== s.site) return [];
    const used = new Set(SITE_IDS.map((k) => site(g, k).name).filter(Boolean));
    const sug = (NAMES[s.site] ?? []).filter((n) => !used.has(n)).slice(0, 3);
    const mineName = `${g.player.name}골`, house = `${g.player.lastName ?? g.player.name} 마을`;
    return [
      ...sug.map((n, i) => ({ label: `'${n}'`, key: `n:${n}` })),
      ...(used.has(mineName) ? [] : [{ label: `내 이름을 붙인다: '${mineName}'`, key: `n:${mineName}`, me: true }]),
      ...(used.has(house) || !g.player.lastName ? [] : [{ label: `집안 이름을 붙인다: '${house}'`, key: `n:${house}`, me: true }]),
      { label: '사람들에게 정하게 한다', key: 'vote' },
    ];
  },
  resolve(g, rng, s, key) {
    const F = FS(g), x = site(g, s.site);
    if (!x || x.name) return '이미 이름이 있었다.';
    let name;
    if (key === 'vote') { const used = new Set(SITE_IDS.map((k) => site(g, k).name).filter(Boolean)); name = rng.pick((NAMES[s.site] ?? ['새마을']).filter((n) => !used.has(n))) ?? '새마을'; x.morale = clamp(x.morale + 5, 0, 100); }
    else name = key.slice(2);
    if (!name) return '이름을 정하지 못했다.';
    nameSite(g, s.site, name);
    F.me.named += 1;
    chron(g, `변경 너머 ${SITES[s.site].land}의 개척촌, ${ira(name, '라는')} 이름을 얻다.`, 30);
    if (name.startsWith(g.player.name) || (g.player.lastName && name.startsWith(g.player.lastName))) { deed(g, 'generous', -2, null, SITES[s.site].near); return `"${name}." 몇은 박수를 쳤고, 몇은 불만 쳐다보았다. 그래도 내가 죽은 뒤에도 이 이름은 남을 것이다.`; }
    return `"${name}." 누가 말뚝에 그 이름을 새겨 개척촌 어귀에 세웠다. 아이들이 그 이름을 소리 내어 읽었다. 처음으로, 이곳이 우리 마을 같았다.`;
  },
});

/* ---------- 마물이 내려온 밤, 겨울 ---------- */
defineScene('frontier_raid', {
  title: () => '마물이 내려온 밤',
  text: (g, s) => `한밤에 개들이 울부짖었다. 목책 너머 어둠 속에서 무엇인가 움직인다. ${s.dead ? `벌써 ${s.dead}명이 당했다.` : '아직 다친 사람은 없다.'}`,
  choices: (g, s) => (free(g) && here(g) === s.site && site(g, s.site)?.stage >= 1 ? [{ label: '횃불을 들고 목책으로 달려간다', key: 'fight' }, { label: '아이들과 여자들을 창고에 숨긴다', key: 'hide' }] : []),
  resolve(g, rng, s, key) {
    const x = site(g, s.site);
    if (!x || x.stage < 1) return '이미 끝난 뒤였다.';
    if (key === 'hide') { x.food = Math.max(0, x.food - 0.5); return '창고 문을 안에서 잠갔다. 새벽까지 바깥에서 무엇인가 울타리를 긁었다. 아침에 보니 가축우리가 비어 있었다.'; }
    tired(g, 20);
    if (check(rng, playerPower(g) + x.safety / 4, 55)) { x.safety = clamp(x.safety + 3, 0, 100); x.morale = clamp(x.morale + 6, 0, 100); renown(g, 3); deed(g, 'brave', 4, `${J(g.player.name, '이/가')} 개척촌을 덮친 마물을 막았다더라`, SITES[s.site].near); return '목책 틈으로 들어오려는 것마다 창으로 찔렀다. 새벽녘에 그것들이 물러갔다. 개척민들이 내 등을 두드렸다.'; }
    injure(g, '변경의 마물에게 찢긴 상처', 4);
    if (rng.chance(0.06)) L(g).pendingDeath = '변경의 마물';
    return '어둠 속에서 무엇인가 나를 덮쳤다. 누군가 횃불로 그것을 쫓았다. 정신을 차려 보니 내 피가 목책을 적시고 있었다.';
  },
});
defineScene('frontier_winter', {
  title: (g, s) => `${siteName(s.site, site(g, s.site))}의 겨울`,
  text: (g, s) => { const x = site(g, s.site); return `곡간이 비어 간다. ${x.winters === 0 ? '첫 겨울이다. 이 땅의 겨울이 이렇게 길 줄은 아무도 몰랐다.' : '올겨울도 길다.'} ${x.pop}명이 봄까지 먹어야 한다. 아이들이 벌써 마른 기침을 한다.`; },
  choices: (g, s) => {
    const x = site(g, s.site), N = NATIVES[SITES[s.site]?.native];
    if (!x || x.stage < 1 || !free(g) || here(g) !== s.site) return [];
    return [
      { label: '한 끼를 반으로 줄인다', key: 'ration' },
      ...(!x.seedEaten ? [{ label: '봄에 뿌릴 씨앗 자루를 연다', key: 'seed' }] : []),
      { label: '눈 속으로 사냥을 나간다', key: 'hunt' },
      ...(canSpend(g, 40) ? [{ label: `${PLACES[SITES[s.site].near]?.name ?? '고장'}에서 곡식을 사 온다 (은화 40닢)`, key: 'buy' }] : []),
      ...(N && x.natives !== null && x.natives >= 10 ? [{ label: `${N.name}에게 도움을 청한다`, key: 'ask' }] : []),
    ];
  },
  resolve(g, rng, s, key) {
    const x = site(g, s.site), N = NATIVES[SITES[s.site]?.native];
    if (!x || x.stage < 1) return '개척촌은 이미 비어 있었다.';
    if (key === 'ration') { x.food += 0.8; x.morale = clamp(x.morale - 6, 0, 100); stress(g, 5); return '한 끼를 반으로 줄였다. 어른들은 아이들 몫을 덜어 주느라 더 굶었다. 다들 말수가 줄었다.'; }
    if (key === 'seed') { x.food += 2; x.seedEaten = true; return '씨앗 자루를 열어 죽을 쑤었다. 다들 아무 말 없이 먹었다. 봄에 무엇을 뿌릴지는 봄에 생각하기로 했다.'; }
    if (key === 'hunt') {
      tired(g, 25);
      if (check(rng, playerPower(g) / 2 + st(g, 'sen') + st(g, 'wil') / 2, 55)) { x.food += 1.5; return '사흘 만에 눈 속에서 큰 사슴을 잡았다. 돌아오는 길에 발가락 두 개가 하얗게 얼었다. 그래도 그 고기로 두 주를 버텼다.'; }
      injure(g, '눈 속에서 언 발', 3);
      return '눈보라에 길을 잃었다. 빈손으로 돌아왔다. 발이 얼어 한 달을 누워 지냈다.';
    }
    if (key === 'buy') { if (!spend(g, 40)) return '돈이 모자랐다.'; x.food += 3; return '눈길을 헤치고 수레 둘에 곡식을 실어 왔다. 개척민들이 수레를 둘러싸고 자루를 쓰다듬었다.'; }
    if (key === 'ask' && N) { x.food += 2; x.natives = clamp(x.natives + 5, -100, 100); return `${J(N.name, '이/가')} 말린 고기와 겨울 뿌리를 썰매에 싣고 왔다. 그들의 어른이 말했다. "봄이 오면 갚아라. 갚지 않아도 기억은 한다."`; }
    return '겨울이 지나갔다.';
  },
});

/* ---------- 사건 ---------- */
const freshCamp = (g) => SITE_IDS.find((id) => { const x = site(g, id); return x.stage === 1 && !x.mine && mi(g) - x.since <= 4 && travelMonths(here(g), id) <= 6 && FS(g).me.home !== id; }) ?? null;
EVENTS.push({
  id: 'frontier_call', cooldown: 24, weight: 5,
  chance: () => 0.5,
  cond: (g) => free(g) && GATHER.includes(here(g)) && !FS(g).party && !!freshCamp(g),
  prepare: (g) => ({ site: freshCamp(g) }),
  title: '개척민을 찾는다',
  text: (g, c) => { const x = site(g, c.site); return `장터에 방이 붙었다. ${J(x?.byName ?? '개척단', '이/가')} 변경 너머 ${J(SITES[c.site].land, '으로/로')} 함께 갈 사람을 찾는다고 한다. 한 집에 밭 스무 마지기, 첫해 식량은 대 준다고. 방 앞에서 젊은 부부가 오래 서 있었다.`; },
  choices: [
    { label: '지나친다', run: () => '지나쳤다. 변경 너머는 나와 상관없는 이야기다. 아직은.' },
    { label: '은화 10닢을 보탠다', show: (g) => canSpend(g, 10), run: (g, rng, c) => { if (!spend(g, 10)) return '주머니가 비어 있었다.'; const x = site(g, c.site); if (x) x.food += 0.5; deed(g, 'generous', 3, null, here(g)); return '개척단 우두머리가 내 이름을 장부 맨 끝에 적었다. "마을이 서면 당신 이름을 기억하겠소."'; } },
    { label: '이름을 적고 따라간다', run: (g, rng, c) => { const x = site(g, c.site); if (!x || x.stage < 1) return '개척단은 이미 떠난 뒤였다.'; const F = FS(g); F.me.home = c.site; F.me.joined += 1; if (L(g).job) L(g).job = null; L(g).travel = { to: c.site, left: Math.max(1, travelMonths(here(g), c.site)), from: here(g) }; x.pop += 2; return `짐을 싸서 개척단의 마지막 수레에 올랐다. ${SITES[c.site].land}까지 ${Math.max(1, travelMonths(here(g), c.site))}달 길이다.`; } },
  ],
});
const myCamp = (g) => SITE_IDS.find((id) => site(g, id).chief && site(g, id).stage >= 1 && here(g) === id) ?? null;
EVENTS.push({
  id: 'frontier_refugees', cooldown: 18, weight: 6,
  chance: () => 0.5,
  cond: (g) => free(g) && !!myCamp(g),
  prepare: (g) => ({ site: myCamp(g) }),
  title: '목책 앞의 사람들',
  text: (g) => `목책 앞에 누더기를 걸친 사람들이 섰다. ${g.world?.famine ? '흉년에 쫓겨 왔다고 한다.' : '전쟁에 마을을 잃었다고 한다.'} 아이를 업은 여자가 앞에 서서 말했다. "일할 손은 있습니다. 먹을 것만 주시면."`,
  choices: [
    { label: '받아들인다', run: (g, rng, c) => { const x = site(g, c.site); if (!x || x.stage < 1) return '개척촌은 이미 비어 있었다.'; const n = rng.int(8, 18); x.pop += n; x.food = Math.max(0, x.food - 1.5); x.morale = clamp(x.morale + 2, 0, 100); deed(g, 'kind', 4, `${J(g.player.name, '이/가')} 변경 개척촌에 피난민을 받아들였다더라`, SITES[c.site].near); return `${n}명이 목책 안으로 들어왔다. 곡간이 더 빨리 빈다. 대신 내년 봄에는 밭이 더 넓어질 것이다.`; } },
    { label: '식량을 조금 나눠 주고 돌려보낸다', run: (g, rng, c) => { const x = site(g, c.site); if (x) x.food = Math.max(0, x.food - 0.3); return '빵 몇 덩이를 쥐여 보냈다. 그들은 더 서쪽으로 갔다. 그쪽에는 아무것도 없다.'; } },
    { label: '문을 닫는다', run: (g, rng, c) => { deed(g, 'kind', -3, null, SITES[c.site]?.near); return '목책 문을 닫았다. 밤새 문밖에서 아이 우는 소리가 났다. 아침에는 아무도 없었다.'; } },
  ],
});
const unlicensed = (g) => SITE_IDS.find((id) => { const x = site(g, id); return x.chief && x.stage >= 2 && SITES[id].claim && !x.legal; }) ?? null;
EVENTS.push({
  id: 'frontier_claim', cooldown: 36, weight: 6,
  chance: () => 0.5,
  cond: (g) => isAdult(g) && !g.over && !!unlicensed(g),
  prepare: (g) => ({ site: unlicensed(g) }),
  title: '나라에서 온 관리',
  text: (g, c) => `${PLACES[SITES[c.site].grant]?.name ?? '나라'}에서 관리가 병사 열을 데리고 ${siteName(c.site, site(g, c.site))}에 왔다. "허가장 없이 왕의 땅을 일군 자가 여기 있다지. 밀린 세금을 내든지, 이 땅을 내놓든지."`,
  choices: [
    { label: '밀린 세금과 허가장 값을 낸다 (은화 80닢)', show: (g) => canSpend(g, 80), run: (g, rng, c) => { const x = site(g, c.site); if (!x) return '개척촌은 이미 내 것이 아니었다.'; if (!spend(g, 80)) return '돈이 모자랐다.'; x.legal = true; return '은화를 세어 주었다. 관리가 양피지에 도장을 찍었다. 이제 이곳은 서류 위에서도 우리 마을이다.'; } },
    { label: '충성을 맹세하고 세금을 내기로 한다', run: (g, rng, c) => { const x = site(g, c.site); if (!x) return '개척촌은 이미 내 것이 아니었다.'; x.legal = true; x.morale = clamp(x.morale - 8, 0, 100); x.food = Math.max(0, x.food - 1); return '무릎을 꿇었다. 해마다 곡식 열에 하나를 바치기로 했다. 개척민들은 아무 말도 하지 않았다. 그 침묵이 무거웠다.'; } },
    { label: '돌려보낸다', run: (g, rng, c) => { const x = site(g, c.site); if (!x) return '개척촌은 이미 내 것이 아니었다.'; if (check(rng, playerPower(g) + x.safety / 2 + x.pop / 8, 70)) { renown(g, 4); return '개척민들이 쇠스랑과 도끼를 들고 목책에 섰다. 관리는 수를 세어 보고 돌아갔다. 다음엔 더 많이 올 것이다.'; } x.chief = false; x.mine = false; if (FS(g).me.home === c.site) FS(g).me.home = null; flog(g, `${J(siteName(c.site, x), '을/를')} 나라에 빼앗겼다.`); return '병사들이 목책 문을 부쉈다. 나는 촌장 자리에서 쫓겨났다. 마을은 남았다. 나라가 보낸 사람이 촌장이 되었다.'; } },
  ],
});
const homeCamp = (g) => { const id = FS(g).me.home; const x = id ? site(g, id) : null; return x && x.stage >= 1 && !x.chief && here(g) === id ? id : null; };
EVENTS.push({
  id: 'frontier_elect', cooldown: 36, weight: 5,
  chance: (g) => clamp(0.15 + (L(g).renown ?? 0) / 200, 0.15, 0.6),
  cond: (g) => free(g) && !!homeCamp(g) && !SITE_IDS.some((id) => site(g, id).chief),
  prepare: (g) => ({ site: homeCamp(g) }),
  title: '촌장을 뽑는 밤',
  text: (g, c) => `${siteName(c.site, site(g, c.site))}의 개척민들이 모닥불 가에 모였다. 처음 개척단을 이끌던 사람은 ${site(g, c.site).winters >= 2 ? '지난겨울에 죽었다' : '도시로 돌아갔다'}. 누군가 내 이름을 불렀다. 여기저기서 고개를 끄덕인다.`,
  choices: [
    { label: '촌장을 맡는다', run: (g, rng, c) => { const x = site(g, c.site); if (!x || x.stage < 1) return '개척촌은 이미 비어 있었다.'; x.chief = true; renown(g, 3); flog(g, `${siteName(c.site, x)}의 촌장이 되었다.`); return '모닥불 가에서 촌장이 되었다. 관도 없고 문서도 없다. 다음 날 아침부터 모든 다툼이 내 문 앞으로 왔다.'; } },
    { label: '사양한다', run: () => '"나는 밭이나 갈겠소." 다른 사람이 뽑혔다. 그날 밤 잠은 편했다.' },
  ],
});
