// 옷감과 재봉사 (33단계): 물레와 베틀, 풀·조개·광물 염료와 비싼 빛깔, 옷감 팔기, 재봉사 견습과 내 가게,
// 귀족 연회 옷과 외상, 상복과 혼례 옷, 재봉 길드(검사·회비·텃세·길드장), 시대마다 바뀌는 유행, 사치 금령.
// 내가 지어 입은 옷은 초상에 보인다(art/portraitGarb.js wearCloth).
// 화면: clothLine(g) 오늘의 장면 한 줄, clothInfo(g) 화면용 묶음.
import { HOOKS } from '../hooks.js';
import { me } from '../game.js';
import { J } from '../narrative/text.js';
import { eraOf } from '../world.js';
import {
  C, here, mi, ownRng, placeName, clamp, logCloth, handRank, shopHere, isTailor, boltCount, yarnCount, boltName,
  FASHIONS, FIBERS, FIBER_IDS, DYES, HAND_RANK, TAILOR_TOWNS, GUILD_TOWNS, GUILD_MASTERS, fashionsFor,
} from './core.js';
import { clothMonth, pay } from './life.js';
import { setFashion } from './shop.js';

export { C as clothState };

const WEAR_WORD = { mourn: '검은 상복', band: '팔에 두른 검은 띠', bridal: '혼례 옷', fine: '지어 입은 옷' };
/** 화면용 묶음 */
export function clothInfo(g) {
  const c = C(g), sh = c.shop, F = FASHIONS[c.fashion.id];
  return {
    hand: Math.round(c.hand), rank: HAND_RANK[handRank(g)], loom: c.loom,
    yarn: FIBER_IDS.filter((f) => c.yarn[f]).map((f) => ({ name: FIBERS[f].yarn, n: c.yarn[f] })),
    bolts: c.bolts.map((b) => ({ name: boltName(b), n: b.n })),
    wear: c.wear ? { what: WEAR_WORD[c.wear.kind] ?? '옷', color: c.wear.dye ? DYES[c.wear.dye].name : null, for: c.wear.for ?? null, col: c.wear.col ?? null } : null,
    fashion: { name: F.name, since: Math.floor(c.fashion.since / 12), mine: !!c.fashion.by && c.fashion.by === g.player.name, dye: DYES[F.dye]?.name ?? null },
    shop: sh ? { name: sh.name, place: placeName(sh.place), since: sh.since, rep: Math.round(sh.rep), guild: !!sh.guild, back: !!sh.back, inStyle: sh.style === c.fashion.id, apprentice: sh.apprentice?.name ?? null, owed: sh.owed.reduce((a, o) => a + o.n, 0) } : null,
    guild: { master: c.guild.master, dues: c.guild.dues, member: !!c.guild.member, me: !!c.guild.me },
    made: c.made, sold: c.sold, earned: c.earned,
    past: c.past.map((p) => ({ ...p, place: placeName(p.place) })),
    log: c.log.slice(-8),
  };
}

const SHOP_LINE = [
  (n) => `${n} 진열대의 옷 소매가 문틈 바람에 흔들린다.`,
  (n) => `${n} 재단대 위에 마름질하다 만 천이 펼쳐져 있다.`,
  (n) => `${n} 문 위의 간판이 볕에 바래 글씨가 흐려졌다.`,
];
const TOWN = [
  '포목점 앞에 새로 들어온 옷감이 깃발처럼 내걸렸다.',
  '염색 집 개울 물이 오늘은 쪽빛으로 흐른다.',
  '재봉사 가게 창마다 촛불이 늦게까지 켜져 있다.',
];
/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function clothLine(g) {
  if (!g?.player || g.over || g.life?.travel) return null;
  const c = C(g), t = mi(g), pl = here(g);
  const w = c.wear;
  if (w?.kind === 'mourn') return t % 2 ? '검은 상복 소매 끝이 닳기 시작했다.' : `${w.for ? `${w.for}의 ` : ''}상중이라 장터 사람들이 목소리를 낮춘다.`;
  if (w?.kind === 'band') return '팔에 두른 검은 띠가 아직 풀리지 않았다.';
  if (w?.kind === 'bridal') return '혼례 옷 소매에 잔치 날 묻은 술 얼룩이 아직 남아 있다.';
  if (shopHere(g) && t % 2 === 0) return SHOP_LINE[t % SHOP_LINE.length](`'${c.shop.name}'`);
  if (isTailor(g) && t % 3 === 0) return '손가락 끝마다 굳은살이 박였다. 골무 없이도 바늘이 들어가지 않는다.';
  if (c.loom && ['family', 'own', 'rent'].includes(g.life?.home) && t % 4 === 1) return '저녁마다 베틀 바디 소리가 집 안을 채운다.';
  // 48단계: 유행 줄은 새 유행이 번지는 첫 반년에만 석 달마다, 그 뒤로는 해마다 한 번 (30년에 마흔 번 넘게 같은 줄이 뜨던 것)
  const fAge = t - (c.fashion.since ?? 0), fashionNow = fAge < 6 ? fAge % 3 === 2 : fAge % 12 === 2;
  if (TAILOR_TOWNS.includes(pl) && fashionNow) return c.fashion.by === g.player.name ? `거리의 옷차림 절반이 ${c.shop ? `'${c.shop.name}'에서` : '내 손에서'} 나온 모양이다.` : FASHIONS[c.fashion.id].line;
  if (TAILOR_TOWNS.includes(pl) && t % 5 === 0) return TOWN[t % TOWN.length];
  return null;
}

/* ---------- 플레이어 없이도 바뀌는 유행과 길드 ---------- */
export function clothWorld(g, rng) {
  const c = C(g), era = eraOf(g);
  if (!c.fashion.next) c.fashion.next = mi(g) + rng.int(36, 84);
  // 시대가 바뀌어 지금 유행이 낡으면 곧 새 유행이 온다
  const stale = !fashionsFor(era).includes(c.fashion.id);
  if (mi(g) >= c.fashion.next || (stale && rng.chance(0.2))) {
    setFashion(g, rng, false);
    c.fashion.next = mi(g) + rng.int(36, 84);
    if (rng.chance(0.3)) g.chronicle.push({ y: g.date.year, m: g.date.month, text: `왕도에서 ${J(FASHIONS[c.fashion.id].name, '이/가')} 유행하다.`, rel: 8 });
  }
  // 길드장은 늙어 물러난다 (내가 길드장이 아니면)
  if (!c.guild.me && g.date.month === 1 && rng.chance(0.08)) {
    c.guild.masterN = (c.guild.masterN ?? 0) + 1;
    c.guild.master = GUILD_MASTERS[c.guild.masterN % GUILD_MASTERS.length];
    c.guild.dues = clamp(c.guild.dues + rng.int(-5, 8), 10, 60);
  }
}
// 가게 살림: 세와 견습 먹이기, 오래 비우면 단골이 떠난다
function shopMonth(g, rng) {
  const c = C(g), sh = c.shop;
  if (!sh) return;
  pay(g, 2 + (sh.apprentice ? 1 : 0));
  if (!shopHere(g)) sh.rep = clamp(sh.rep - 1, 0, 100);
  if (sh.apprentice && !g.people.some((p) => p.id === sh.apprentice.id && p.alive)) sh.apprentice = null;
  if (sh.owed.length > 6) sh.owed.splice(0, sh.owed.length - 6);
  if (c.guild.me && rng.chance(0.3)) { const n = 3 + Math.round(c.guild.dues / 10); g.player.money += n; c.earned += n; }
}

HOOKS.afterMonth.push((g) => {
  if (g.over) return;
  const rng = ownRng(g, 33);
  clothMonth(g, rng);
  shopMonth(g, rng);
  clothWorld(g, rng);
});
// 대를 이으면: 가게는 집안에 남고(가업), 솜씨와 옷은 새 사람의 것
HOOKS.heir.push((g) => {
  const c = C(g);
  if (c.hand > 0) c.past.push({ name: '선대의 바늘', place: c.shop?.place ?? here(g), since: c.firstAt ? Math.floor(c.firstAt / 12) : g.date.year, to: g.player.name, y: g.date.year, hand: Math.round(c.hand) });
  c.hand = Math.min(c.hand * 0.2, 12); c.wear = null; c.master = null; c.harm = 0;
  c.close = []; c.spouse = me(g)?.spouseId ?? null;
  if (c.shop) { c.shop.rep = Math.round(c.shop.rep / 2); logCloth(g, `'${c.shop.name}' 가게를 물려받았다.`); }
  if (c.guild.me) { c.guild.me = false; c.guild.masterN = (c.guild.masterN ?? 0) + 1; c.guild.master = GUILD_MASTERS[c.guild.masterN % GUILD_MASTERS.length]; }
});
export { boltCount, yarnCount, GUILD_TOWNS };
