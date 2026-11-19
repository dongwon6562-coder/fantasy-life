// 광산과 땅 밑 일. 상태는 g.mine 하나.
//   sites{ id: { name, near, ore, owner('lord'|'guild'|'dwarf'|'empire'|'crew'|'me'), ownerName, depth(1~9), vein(0~100, 남은 광맥),
//          safety(0~100, 버팀목과 환기), unrest(0~100, 광부들의 불만), wageMul, strike(null|{since, months}), closed(다시 열 때까지 남은 달),
//          stir(0~100, 깊은 곳의 기척), awoke(null|{kind, since}), dead(죽은 광부 수), collapses, miners(내 광산만), wage(내 광산만), legal, since } }
//   price{ ore: 시세 배수 }   finds[]: 찾았지만 아직 정하지 않은 광맥 { id, place, ore, size, at }
//   dwarf: 드워프 광부 길드가 나를 보는 눈(-100~100)   me{ shifts, finds, owned, sold, income, lore(갱도 다루는 솜씨), strikes, scabbed, saved, sealed }   seq, log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';

// 광석: 장사 물건(trade GOODS)과 잇는 것은 good에 적는다
export const ORES = {
  iron: { name: '철광석', base: 9, good: 'iron' },
  copper: { name: '구리 광석', base: 7 },
  silver: { name: '은광석', base: 18 },
  manastone: { name: '마석 원석', base: 22, good: 'manastone' },
};
export const ORE_IDS = Object.keys(ORES);

// 처음부터 있는 광산들 (고장 둘레의 가상 갱도)
export const MINES = {
  redhill: { name: '붉은 언덕 철광', near: 'graubel', ore: 'iron', owner: 'lord', ownerName: '그라우벨 변경백', depth: 3 },
  silverhole: { name: '베르덴 은광', near: 'verden', ore: 'silver', owner: 'lord', ownerName: '베르덴 백작', depth: 3 },
  copper: { name: '그륀탈 구리 굴', near: 'gruental', ore: 'copper', owner: 'crew', ownerName: '광부 조합', depth: 2 },
  roten: { name: '로텐 철광', near: 'eisen', ore: 'iron', owner: 'empire', ownerName: '발하르트 제국 광산청', depth: 4 },
  grayhole: { name: '회색 굴', near: 'gorge', ore: 'manastone', owner: 'guild', ownerName: '구렁목 마석 거래소', depth: 5 },
  deepvein: { name: '쇠망치 골 큰 갱', near: 'hammer', ore: 'iron', owner: 'dwarf', ownerName: '드워프 광부 길드', depth: 7 },
};
export const OWNER_WORD = { lord: '영주의 광산', guild: '거래소의 광산', dwarf: '드워프 길드의 광산', empire: '제국의 광산', crew: '광부들이 함께 꾸리는 광산', me: '내 광산' };

// 광맥을 찾을 만한 고장과 거기서 나는 것 (갱도는 산과 언덕과 깊은 땅에)
export const PROSPECT = {
  verden: ['iron', 'silver'], gruental: ['copper', 'iron'], graubel: ['iron', 'silver'], hammer: ['iron', 'silver', 'manastone'],
  gorge: ['manastone', 'iron'], eisen: ['iron', 'copper'], solaris: ['copper'], estella: ['silver', 'manastone'], fur: ['copper'],
};
// 이 고장의 땅 주인 (광업권을 사는 곳)
export const LANDLORD = {
  verden: '베르덴 백작', gruental: '그륀탈 촌장과 백작의 집사', graubel: '그라우벨 변경백', hammer: '드워프 광부 길드', gorge: '구렁목 돌문 수비대',
  eisen: '제국 광산청', solaris: '성광 교단 토지청', estella: '아무도 (폐허의 땅)', fur: '수인 부족 연합',
};

// 너무 깊이 파서 깨운 것
export const DEEP = {
  breath: { name: '회색 숨', text: (n) => `${n} 맨 아래 갱도에서 회색 숨이 올라왔다. 냄새도 없는 숨이다. 그 숨을 마신 광부들은 잠들 듯 쓰러져 깨지 않았다. 갱도 입구에 새가 든 새장을 걸었지만 새도 죽었다.` },
  crawlers: { name: '창백한 것들', text: (n) => `${n} 막장 벽이 안쪽에서 무너졌다. 그 너머의 빈 곳에서 눈 없는 창백한 것들이 기어 나왔다. 광부들이 사다리를 끊고 올라왔다. 다 올라오지는 못했다.` },
  hall: { name: '봉인된 옛 홀', text: (n) => `${n} 곡괭이 끝에 드워프 문자가 새겨진 돌문이 걸렸다. "여기서 멈추라." 누군가 문을 열었다. 안쪽 홀에는 아무것도 없었다. 그 뒤로 밤마다 갱도 안에서 망치 소리가 난다. 아무도 망치를 들지 않았는데.` },
  worms: { name: '쇠먹이 벌레 떼', era: 1, text: (n) => `${n} 막장에서 쇠를 갉는 소리가 났다. 다음 날 아침 곡괭이와 수레 바퀴와 레일이 반쯤 먹혀 있었다. 쇠먹이 벌레 떼가 광맥을 따라 올라오고 있다.` },
};
export const DEEP_IDS = Object.keys(DEEP);

export const unrestWord = (v) => (v >= 70 ? '곡괭이를 내려놓기 직전이다' : v >= 45 ? '불만이 크다' : v >= 25 ? '투덜거린다' : '조용하다');
export const veinWord = (v) => (v >= 70 ? '광맥이 굵다' : v >= 40 ? '캘 만하다' : v >= 15 ? '광맥이 가늘어졌다' : '거의 다 캤다');
export const safeWord = (v) => (v >= 70 ? '버팀목이 튼튼하다' : v >= 45 ? '그럭저럭 버틴다' : v >= 25 ? '버팀목이 낡았다' : '언제 무너져도 이상하지 않다');

export const MS = (g) => (g.mine ??= fresh());
const freshMe = () => ({ shifts: 0, finds: 0, owned: 0, sold: 0, income: 0, lastIncome: 0, lore: 0, strikes: 0, scabbed: 0, saved: 0, sealed: 0 });
const site = (id, d) => ({ name: d.name, near: d.near, ore: d.ore, owner: d.owner, ownerName: d.ownerName, depth: d.depth, vein: 70, safety: d.owner === 'dwarf' ? 75 : 55, unrest: 15, wageMul: 1, strike: null, closed: 0, stir: d.depth >= 5 ? 20 : 0, awoke: null, dead: 0, collapses: 0, miners: 0, wage: 0, legal: true, since: 0 });
export function fresh() {
  const sites = {};
  for (const [id, d] of Object.entries(MINES)) sites[id] = site(id, d);
  const price = {};
  for (const o of ORE_IDS) price[o] = 1;
  return { sites, price, finds: [], dwarf: 0, me: freshMe(), seq: 1, log: [] };
}
export function mlog(g, text) {
  const S = MS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export const sitesNear = (g, pl) => Object.entries(MS(g).sites).filter(([, s]) => s.near === pl).map(([id]) => id);
export const myMines = (g) => Object.entries(MS(g).sites).filter(([, s]) => s.owner === 'me').map(([id]) => id);
export const myMineHere = (g, pl) => myMines(g).find((id) => MS(g).sites[id].near === pl) ?? null;
export const oreValue = (g, ore) => Math.max(1, Math.round(ORES[ore].base * (MS(g).price[ore] ?? 1)));
// 한 달에 나오는 광석 짐 수 (광부 수 × 광맥 × 솜씨)
export const outputOf = (s, crew) => (s.closed > 0 || s.strike || s.awoke ? 0 : crew * (0.15 + s.vein / 200));

HOOKS.newGame.push((g) => { g.mine = fresh(); });
HOOKS.migrate.push((g) => {
  const S = MS(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const id of Object.keys(f.sites)) S.sites[id] ??= f.sites[id];
  for (const o of ORE_IDS) S.price[o] ??= 1;
  S.me = Object.assign(freshMe(), S.me ?? {});
});
// 대를 이으면: 내 광산은 집안 것으로 남는다(광업권은 대를 잇는다). 찾아만 두고 정하지 않은 광맥은 잊힌다.
HOOKS.heir?.push((g) => { MS(g).finds = []; });
