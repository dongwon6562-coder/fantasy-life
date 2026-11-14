// 모험가 길드 의뢰와 길 위에서 만나는 일.
import { ACTIONS } from '../actions.js';
import { rngOf } from '../game.js';
import { L, defineScene, sceneQueued, traveling, note, stress } from './core.js';
import { queueFight, maybeNemesis } from './fight.js';
import { FACTIONS, fac, guildRank } from '../factions.js';
import { PLACES } from '../places.js';

// 의뢰 목록. rank: 길드 등급(0=F). merit: 길드 공적
const QUESTS = [
  { rank: 0, title: '창고의 쥐 떼', intro: '곡물 창고 지하에 개만 한 쥐들이 들끓는다. 주인은 겁에 질려 있다.', enc: (r) => ({ unit: 'giant_rat', count: r.int(5, 9) }), money: 4, merit: 3 },
  { rank: 0, title: '약초꾼 호위', intro: '숲 깊이 약초를 캐러 가는 노인을 지켜 달라는 의뢰. 숲가에서 늑대 울음이 들린다.', enc: (r) => ({ unit: 'wolf', count: r.int(2, 3) }), money: 5, merit: 3 },
  { rank: 0, title: '코볼트 굴', intro: '광산 마을 외곽에 코볼트들이 굴을 팠다. 밤마다 닭이 사라진다.', enc: (r) => ({ unit: 'kobold', count: r.int(3, 6) }), money: 5, merit: 4 },
  { rank: 1, title: '고블린 토벌', intro: '고블린 무리가 외딴 농가를 습격했다. 남은 것은 부서진 문과 핏자국뿐이다.', enc: (r) => ({ unit: 'goblin', count: r.int(5, 8), leader: r.chance(0.35) ? 'goblin_chief' : null }), money: 10, merit: 6 },
  { rank: 1, title: '늑대 무리', intro: '양치기 마을에서 늑대 무리 때문에 양이 반으로 줄었다. 우두머리가 유난히 크다고 한다.', enc: (r) => ({ unit: 'wolf', count: r.int(4, 6), leader: r.chance(0.3) ? 'dire_wolf' : null }), money: 9, merit: 6 },
  { rank: 1, title: '뒷골목 정리', intro: '여관 주인이 건달들의 자릿세 요구에 질렸다. 조용히 끝내 달라고 한다.', enc: (r) => ({ unit: 'thug', count: r.int(4, 6) }), money: 8, merit: 5, places: ['leocast', 'harfen'] },
  { rank: 2, title: '도적 소탕', intro: '교역로에서 짐마차가 세 번 털렸다. 도적들이 옛 망루에 진을 쳤다고 한다.', enc: (r) => ({ unit: 'bandit', count: r.int(4, 7), leader: 'bandit_chief' }), money: 22, merit: 12 },
  { rank: 2, title: '홉고블린', intro: '고블린들을 부리는 덩치 큰 놈이 나타났다. 마을 경비대가 둘이나 죽었다.', enc: (r) => ({ unit: 'goblin', count: r.int(4, 6), leader: 'hobgoblin' }), money: 20, merit: 12 },
  { rank: 3, title: '오크 정찰대', intro: '북쪽 산맥에서 오크 정찰대가 내려왔다. 본대가 뒤따를지도 모른다.', enc: (r) => ({ unit: 'orc', count: r.int(3, 5) }), money: 40, merit: 22 },
  { rank: 3, title: '묘지의 구울', intro: '공동묘지의 무덤들이 안에서부터 파헤쳐졌다. 밤마다 무언가 뜯어먹는 소리가 난다.', enc: (r) => ({ unit: 'ghoul', count: r.int(2, 4) }), money: 38, merit: 22 },
  { rank: 3, title: '마력에 물든 곰', intro: '마석 광맥 근처에서 눈이 붉게 빛나는 곰이 사냥꾼들을 찢어 놓았다.', enc: () => ({ unit: null, count: 0, leader: 'mana_bear' }), money: 45, merit: 24 },
  { rank: 4, title: '오크 전사장', intro: '오크 무리를 하나로 묶은 전사장이 국경 마을들을 불태우고 있다. 기사단은 북부 전선에 묶여 있다.', enc: (r) => ({ unit: 'orc', count: r.int(4, 6), leader: 'orc_chief' }), money: 90, merit: 40 },
  { rank: 4, title: '마신교도의 집회', intro: '폐교회 지하에서 마신을 부르는 의식이 열린다는 제보. 실종된 아이들이 있다.', enc: (r) => ({ unit: 'cultist', count: r.int(4, 6), leader: 'cult_priest' }), money: 110, merit: 45 },
  { rank: 5, title: '와이번', intro: '협곡에 와이번이 둥지를 틀었다. 상단의 짐마차가 통째로 하늘로 들려 갔다.', enc: () => ({ unit: null, count: 0, leader: 'wyvern' }), money: 240, merit: 70 },
];

ACTIONS.push({
  id: 'quest',
  name: '의뢰 받기',
  desc: '모험가 길드 게시판에서 등급에 맞는 의뢰를 받는다. 위험하지만 돈과 실적이 된다.',
  available: (g) => !traveling(g) && !!fac(g, 'guild')?.member && !!FACTIONS.guild.seats[L(g).place] && !sceneQueued(g, 'fight'),
  run(g, rng) {
    const f = fac(g, 'guild');
    const here = L(g).place;
    const cands = QUESTS.filter((q) => q.rank <= f.rank + (rng.chance(0.2) ? 1 : 0) && q.rank >= f.rank - 1 && (!q.places || q.places.includes(here)));
    const q = rng.pick(cands.length ? cands : QUESTS.filter((x) => x.rank === 0));
    const over = q.rank > f.rank;
    queueFight(g, rng, {
      title: `${FACTIONS.guild.ranks[q.rank]}급 의뢰: ${q.title}`,
      intro: q.intro + (over ? ' 내 등급보다 한 단계 위의 의뢰다. 접수원이 서명을 받으며 한숨을 쉬었다.' : ''),
      enc: q.enc(rng),
      reward: { money: Math.round(q.money * (here === 'leocast' ? 1.3 : 1)), merit: ['guild', q.merit + (over ? 3 : 0)], renown: q.rank >= 2 ? 1 : 0 },
      avoidLabel: '의뢰를 포기한다',
      avoidText: '현장을 보고 의뢰를 포기했다. 위약금은 없었지만 접수원의 눈빛이 식었다.',
      fleeText: '의뢰는 실패로 기록되었다.',
      quest: true,
    });
    L(g).stats.quests += 1;
    return `게시판에서 "${q.title}" 의뢰서를 떼어 왔다.`;
  },
});

/* ---------- 길 위에서 ---------- */
const ROAD = [
  {
    id: 'bandits', weight: 3,
    fight: (g, r) => ({
      title: '길목의 도적',
      intro: '좁은 고갯길에서 활을 든 자들이 앞을 막았다. "짐은 두고 가라. 목숨은 가져가도 좋다."',
      enc: { unit: 'bandit', count: r.int(3, 5), leader: r.chance(0.4) ? 'bandit_chief' : null },
      reward: { money: r.int(4, 12), renown: 1 },
      avoidLabel: '가진 것을 내주고 지나간다',
      avoidText: '주머니를 털어 주고 지나갔다. 목숨값으로는 싼 셈이라고 생각하기로 했다.',
      avoidCost: 0.5,
    }),
  },
  {
    id: 'wolves', weight: 2,
    fight: (g, r) => ({
      title: '밤길의 늑대',
      intro: '모닥불 너머 어둠 속에서 눈들이 빛났다. 하나, 둘, 다섯.',
      enc: { unit: 'wolf', count: r.int(3, 6), leader: r.chance(0.2) ? 'dire_wolf' : null },
      reward: { money: 3 },
      avoidLabel: '불을 키우고 날이 밝기를 기다린다',
      avoidText: '밤새 불을 지켰다. 늑대들은 동이 틀 무렵 물러갔다. 한숨도 자지 못했다.',
    }),
  },
  {
    id: 'deserters', weight: 1, minDay: 0,
    fight: (g, r) => ({
      title: '탈영병들',
      intro: '찢어진 왕국군 망토를 걸친 사내들이 길가에 앉아 있었다. 굶주린 눈이 내 짐을 보았다.',
      enc: { unit: 'deserter', count: r.int(2, 4) },
      reward: { money: r.int(5, 10) },
      avoidLabel: '빵을 나눠 주고 지나간다',
      avoidText: '빵과 말린 고기를 나눠 주었다. 사내 하나가 북부 전선 이야기를 하다 울었다.',
    }),
  },
  { id: 'refugees', weight: 2, moral: true },
  { id: 'wounded_merchant', weight: 1, moral: true },
];

defineScene('road', {
  title: (g, s) => s.title,
  text: (g, s) => s.text,
  choices: (g, s) => {
    if (!s.v) initRoad(g, s);
    return s.opts;
  },
  resolve(g, rng, s, key) {
    if (key === 'r_give') { const n = Math.min(g.player.money, 3); g.player.money -= n; L(g).renown += 1; note(g, '길에서 피난민 가족을 도왔다.'); return n ? `은화 ${n}닢과 먹을 것을 건넸다. 아이 엄마가 성광의 이름으로 나를 축복했다.` : '줄 돈이 없어 먹을 것만 나눴다. 그래도 고맙다고 했다.'; }
    if (key === 'r_pass') { stress(g, 3); return '눈을 피하고 지나갔다. 길은 원래 그런 곳이다.'; }
    if (key === 'm_help') { g.player.money += 6; L(g).renown += 1; g.player.fatigue = Math.min(100, g.player.fatigue + 10); return '상인을 다음 역참까지 부축해 데려다주었다. 상인은 은화 6닢을 쥐여 주며 이름을 물었다.'; }
    if (key === 'm_rob') { g.player.money += 15; L(g).notoriety += 6; stress(g, 6); note(g, '다친 상인의 짐을 털었다.'); return '아무도 보는 사람이 없었다. 상인의 짐에서 은화 15닢을 챙겼다. 신음 소리가 오래 귀에 남았다.'; }
    if (key === 'm_pass') return '갈 길이 바빴다. 상인은 다른 누군가가 돕겠지.';
    return '';
  },
});

function initRoad(g, s) {
  const rng = rngOf(g);
  const v = rng.weighted(ROAD, (x) => x.weight);
  s.v = v.id;
  if (v.fight) {
    // 싸움이면 싸움 장면으로 바꿔 띄운다
    const data = v.fight(g, rng);
    s.kind = 'fight';
    Object.assign(s, data);
    s.enc = maybeNemesis(g, rng, s.enc);
    s.opts = null;
    s.redirect = true;
  }
  if (v.id === 'refugees') {
    s.title = '피난민';
    s.text = '불탄 마을에서 왔다는 가족이 길가에 주저앉아 있었다. 아이 둘은 맨발이다.';
    s.opts = [{ label: '돈과 먹을 것을 나눠 준다', key: 'r_give' }, { label: '못 본 척 지나간다', key: 'r_pass' }];
  }
  if (v.id === 'wounded_merchant') {
    s.title = '다친 상인';
    s.text = '뒤집힌 수레 옆에 상인이 다리를 움켜쥐고 쓰러져 있었다. 짐은 그대로다. 주위에 아무도 없다.';
    s.opts = [{ label: '부축해 역참까지 데려다준다', key: 'm_help' }, { label: '짐을 턴다', key: 'm_rob' }, { label: '지나간다', key: 'm_pass' }];
  }
}

export { QUESTS, guildRank, PLACES };
