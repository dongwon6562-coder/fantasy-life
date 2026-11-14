// 영지: 받기, 매달 굴러가는 살림(세금·치안·민심·인구), 작위, 물려주기.
// 상태는 game.domain 하나. 영지가 없으면 null.
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { me, playerAge } from '../game.js';
import { L, chron, note } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { atWar, lordName } from '../world.js';

export const D = (g) => g.domain ?? null;

// 작위 이름. 나라를 세운 경우는 따로 부른다.
export const TITLES = ['기사령 영주', '남작', '자작', '백작'];
export const NATION_TITLES = ['개척지의 촌장', '자유령의 영주', '대공', '국왕'];
export const DOMAIN_KIND = ['기사령', '남작령', '자작령', '백작령'];
export const NATION_KIND = ['개척지', '자유령', '공국', '왕국'];
export const POP_CAP = [450, 1300, 3200, 8000];
export const TAX_NAMES = ['가벼운 세금', '보통 세금', '무거운 세금', '가혹한 세금'];
const TAX_RATE = [0.012, 0.02, 0.028, 0.038];
export const LIEGE_NAME = { verden: '베르덴 백작', crown: '레오니아 국왕', south: '남부의 영주' };

export const BUILDINGS = {
  manor: { name: '새 영주관', cost: 120, desc: '무너져 가는 영주관을 허물고 돌로 새로 짓는다. 작위가 오르려면 필요하다.' },
  mill: { name: '물방아', cost: 90, desc: '밀을 빻는 물방아. 영민이 늘고 세금이 조금 더 걷힌다.' },
  chapel: { name: '예배당', cost: 80, desc: '성광교 예배당. 민심이 오르고 역병에 강해진다.' },
  wall: { name: '돌 성벽', cost: 260, desc: '마을을 두르는 돌 성벽. 치안이 오르고 습격을 막기 쉽다.' },
  barracks: { name: '병영', cost: 150, desc: '병사를 더 많이, 더 잘 기를 수 있다.' },
  market: { name: '장터', cost: 140, desc: '정기 장이 선다. 세금이 많이 늘고 사람이 모인다.' },
  workshop: { name: '마도구 공방', cost: 320, desc: '마석으로 도는 공방. 마도구 보급 시대부터 지을 수 있다. 세금이 크게 는다.', era: 1 },
};

export const domainTitle = (g) => { const d = D(g); return d ? (d.nation ? NATION_TITLES : TITLES)[d.rank] : null; };
export const domainKind = (d) => (d.nation ? NATION_KIND : DOMAIN_KIND)[d.rank];
export const atDomain = (g) => !!D(g) && L(g).place === D(g).place && !L(g).travel;
export const garrisonCap = (d) => Math.round(d.pop * (d.buildings.barracks ? 0.12 : 0.07)) + 10;

export function newDomain({ name, place, liege, nation = false, pop = 180 }) {
  return {
    name, place, liege, nation,
    rank: 0, pop, morale: 55, order: 50, treasury: 40, tax: 1,
    garrison: 12, quality: 30, buildings: {}, favor: 50,
    since: null, lastIncome: 0, unrest: 0, side: null, battles: 0, wins: 0,
    log: [],
  };
}

// 영지를 받는다 (기사 서임 뒤 하사, 작위 매입, 전공, 건국)
export function grantFief(g, opts, reason) {
  const d = newDomain(opts);
  d.since = g.date.year;
  if (g.domain) chron(g, `${g.player.name}, ${J(g.domain.name, '을/를')} 내놓다.`);
  g.domain = d;
  const life = L(g);
  if (!life.houses.includes(d.place)) life.houses.push(d.place);
  g.player.title = g.player.title ?? '경';
  note(g, `${J(d.name, '을/를')} ${d.nation ? '세웠다' : '영지로 받았다'}.${reason ? ` ${reason}` : ''}`);
  chron(g, `${g.player.name}, ${d.name}의 ${J(domainTitle(g), '이/가')} 되다.`);
  life.renown += 5;
  return d;
}

/* ---------- 매달: 영지의 살림 ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function domainTick(g, rng) {
  const d = D(g);
  if (!d) return [];
  const r = g.realm;
  const news = [];
  const present = atDomain(g);
  const b = d.buildings;
  // 세금
  const prosperity = (0.55 + d.morale / 220) * (1 + (b.mill ? 0.12 : 0) + (b.market ? 0.25 : 0) + (b.workshop ? 0.45 : 0)) * (r ? Math.min(1.5, 0.85 + r.bread * 0.15) : 1);
  let income = d.pop * TAX_RATE[d.tax] * prosperity;
  if (!present) income *= 0.85; // 집사가 대신 걷는다. 조금씩 샌다.
  const upkeep = d.garrison * 0.12 * (0.8 + d.quality / 200) + Object.keys(b).length * 0.3;
  income = Math.round(income * 10) / 10;
  d.lastIncome = Math.round((income - upkeep) * 10) / 10;
  d.treasury = Math.round((d.treasury + income - upkeep) * 10) / 10;
  // 해마다 주군에게 바치는 공물
  if (g.date.month === 1 && d.liege) {
    const tribute = Math.round(Math.max(0, d.lastIncome) * 12 * 0.12);
    if (tribute > 0) {
      if (d.treasury >= tribute) { d.treasury -= tribute; d.favor = clamp(d.favor + 2, 0, 100); news.push(`${LIEGE_NAME[d.liege]}에게 올해 공물 은화 ${tribute}닢을 바쳤다.`); }
      else { d.favor = clamp(d.favor - 12, 0, 100); news.push(`공물을 바치지 못했다. ${LIEGE_NAME[d.liege]}의 눈길이 차가워졌다.`); }
    }
  }
  // 금고가 바닥나면 병사가 떠난다
  if (d.treasury < 0) {
    const leave = Math.min(d.garrison, Math.ceil(d.garrison * 0.2));
    d.garrison -= leave;
    d.morale -= 3;
    d.treasury = 0;
    if (leave) news.push(`${d.name}의 금고가 비었다. 봉급을 못 받은 병사 ${leave}명이 떠났다.`);
  }
  // 민심: 세금, 치안, 전쟁, 흉년, 예배당
  const moraleTarget = 72 - d.tax * 14 + (d.order - 50) / 4 + (b.chapel ? 8 : 0) + (b.market ? 3 : 0)
    - (r && atWar(g) ? 8 : 0) - (g.world?.famine ? 14 : 0) - (g.world?.plague ? 8 : 0) + (present ? 3 : 0);
  d.morale = clamp(d.morale + (moraleTarget - d.morale) * 0.08 + rng.normal(0, 1.2), 0, 100);
  // 치안: 병사 비율, 성벽, 마물, 범죄 조직
  const ratio = d.garrison / Math.max(1, d.pop);
  const orderTarget = 30 + Math.min(45, ratio * 600) * (0.6 + d.quality / 125) + (b.wall ? 12 : 0) - (r ? (r.monsters - 30) / 3 : 0) + (present ? 4 : 0);
  d.order = clamp(d.order + (orderTarget - d.order) * 0.1 + rng.normal(0, 1.2), 0, 100);
  // 인구
  const cap = d.nation ? POP_CAP[3] * 1.5 : POP_CAP[d.rank];
  const growth = (d.morale - 45) / 7000 + (b.mill ? 0.0008 : 0) + (b.market ? 0.0006 : 0) - (g.world?.plague && !b.chapel ? 0.004 : 0) - (g.world?.famine ? 0.002 : 0);
  d.pop = Math.max(30, Math.round(d.pop * (1 + growth * (d.pop > cap ? 0.2 : 1)) + (rng.chance(0.3) ? Math.sign(growth) : 0)));
  // 불만이 쌓이면 봉기
  d.unrest = clamp(d.unrest + (d.morale < 28 ? 3 : d.morale > 45 ? -2 : 0), 0, 30);
  return news;
}

// 작위가 오를 수 있는가 (이유를 돌려준다)
export function rankUpReady(g) {
  const d = D(g);
  if (!d || d.rank >= 3) return null;
  const n = d.rank + 1;
  const life = L(g);
  const needPop = d.nation ? [0, 400, 1500, 4000][n] : [0, 380, 1100, 2800][n];
  const needRenown = [0, 20, 45, 80][n];
  if (d.pop < needPop || life.renown < needRenown || !d.buildings.manor) return null;
  if (!d.nation && d.favor < 60 + n * 8) return null;
  return n;
}

/* ---------- 훅 ---------- */
HOOKS.newGame.push((g) => { g.domain = null; });
HOOKS.migrate.push((g) => {
  if (g.domain === undefined) g.domain = null;
  if (g.domain) g.domain = Object.assign(newDomain({ name: g.domain.name, place: g.domain.place, liege: g.domain.liege }), g.domain);
});

// 대를 이으면 영지도 자식이 잇는다
HOOKS.heir.push((g) => {
  const d = D(g);
  if (!d) return;
  d.favor = Math.round(d.favor * 0.8);
  d.morale = clamp(d.morale - 5, 0, 100);
  if (playerAge(g) < 15) d.regent = true;
  note(g, `${d.name}의 ${domainTitle(g)} 자리를 이었다.${playerAge(g) < 15 ? ' 어른이 될 때까지 집사가 섭정한다.' : ''}`);
  chron(g, `${me(g).name}, ${J(d.name, '을/를')} 물려받다.`);
});

export { PLACES, lordName };
