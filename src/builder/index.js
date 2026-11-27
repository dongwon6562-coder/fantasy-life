// 목수와 석공 (35단계): 도제·직인·장인·명장, 의뢰와 재료, 조합의 장인 시험과 표식, 무너진 일과 책임,
// 내 작업장과 도제, 이름이 남는 건물(내 집안의 것과 세상의 것). works·house·frontier와 잇고, 기술 나무가 일을 바꾼다.
// 화면: builderLine(g) 오늘의 장면 한 줄, builderInfo(g) 화면용 묶음 (builderStatus는 같은 것).
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { B, Q, mi, here, placeName, skill, trade, rankOf, skillRank, standing, mineHere, shopHere, qualWord, RANKS, MARKS, KINDS, kindName, GUILD_TOWNS } from './core.js';
import './life.js';
import './world.js';
import { seldom } from '../rumor/seldom.js';

export { B as builderState, KINDS as BUILD_KINDS, MARKS as BUILDER_MARKS };
export { kindsHere, offersFor, examReady, finishJob, fallOf, addBuilt } from './life.js';
export { worldBuild, fallChance } from './world.js';

const recView = (g, b) => ({
  name: b.name, kind: kindName(g, b.kind), place: placeName(b.place), y: b.y, by: b.by, mark: b.mark ? MARKS[b.mark].name : null,
  look: b.gone ? `${b.gone.y}년 ${b.gone.how}` : qualWord(b.q), gone: !!b.gone, big: !!b.big, mine: b.by === g.player.name,
});
/** 화면용 묶음 */
export function builderInfo(g) {
  const s = B(g), j = s.job, sh = s.shop;
  return {
    trade: trade(g) === 'mason' ? '석공' : trade(g) === 'carpenter' ? '목수' : null,
    skill: Math.round(skill(g)), rank: RANKS[rankOf(g)], hand: RANKS[skillRank(g)],
    mark: s.mark ? MARKS[s.mark].name : null, famMark: s.famMark ? MARKS[s.famMark].name : null,
    guild: { banned: s.guild.banned > mi(g), owed: s.guild.dues, tries: s.guild.tries },
    job: j ? { what: kindName(g, j.kind), client: j.client, place: placeName(j.place), pay: j.pay, left: Math.max(0, Math.ceil(j.left)), need: j.need, here: j.place === here(g) } : null,
    shop: sh ? { name: sh.name, place: placeName(sh.place), since: sh.since, rep: Math.round(sh.rep), apprentices: sh.app.map((a) => a.name) } : null,
    built: s.built.map((b) => recView(g, b)).reverse(),
    world: s.world.map((b) => recView(g, b)),
    done: s.done, places: s.places.map(placeName), earned: s.earned, falls: s.falls, owned: s.owned,
    log: s.log.slice(-8),
  };
}
export const builderStatus = builderInfo;

const JOB_LINE = [
  (g, j) => `${j.client}의 ${kindName(g, j.kind)} 일터에 아침마다 먹줄 튕기는 소리가 난다.`,
  (g, j) => `비계 위에서 내려다보니 ${j.client}의 ${kindName(g, j.kind)} 뼈대가 하루만큼 더 올라와 있다.`,
  (g, j) => `${j.client}${j.kind === 'works' ? ' 공사장' : ''} 마당에 대팻밥과 돌가루가 발목까지 쌓였다.`,
];
const SHOP_LINE = [
  (n) => `${n} 마당에 재목이 결 따라 쌓여 마르고 있다.`,
  (n) => `${n} 작업대 위에 깎다 만 장부촉이 놓여 있다.`,
  (n) => `${n} 처마 밑에서 도제가 끌을 갈고 있다.`,
];
/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function builderLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const s = B(g), t = mi(g), pl = here(g), j = s.job;
  if (j && j.mat && j.place === pl) {
    if (j.left <= 1) return `${j.client}의 ${J(kindName(g, j.kind), '이/가')} 다 되어 간다. 이번 달이면 비계를 걷는다.`;
    return JOB_LINE[t % JOB_LINE.length](g, j);
  }
  const mine = mineHere(g).filter((b) => b.big || b.own);
  if (mine.length && t % 3 === 0) {
    const b = mine[t % mine.length];
    return b.by === g.player.name ? `내가 지은 ${Q(b.name, '이/가')} 오늘도 그 자리에 서 있다.` : `${J(b.by, '이/가')} 지은 ${Q(b.name, '이/가')} 아직 서 있다. 머릿돌의 글자가 닳았다.`;
  }
  const fell = s.built.find((b) => b.gone && b.place === pl && g.date.year - b.gone.y <= 2);
  if (fell && t % 4 === 1) return `${Q(fell.name, '이/가')} 서 있던 자리에 깨진 돌과 부러진 들보가 아직 치워지지 않았다.`;
  if (shopHere(g) && t % 2 === 0) return SHOP_LINE[t % SHOP_LINE.length](`'${s.shop.name}'`);
  const w = standing(s.world).filter((b) => b.place === pl);
  if (w.length && t % 5 === 2) { const b = w[t % w.length]; if (seldom(g, `built:${b.name}`, 36)) return `${J(b.name, '은/는')} ${b.y}년에 ${J(b.by, '이/가')} 지었다고 한다.`; }
  if (trade(g) && GUILD_TOWNS.includes(pl) && !s.mark && skillRank(g) >= 2 && t % 6 === 3) return '조합 회관 앞을 지날 때마다 장인들의 표식이 새겨진 문설주를 올려다본다.';
  return null;
}
