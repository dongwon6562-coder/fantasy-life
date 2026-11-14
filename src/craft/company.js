// 가게와 상단을 잇는다 (도우미스레드3의 세계 흐름, src/history/trade.js).
// - 이름이 난 가게에는 같은 장사를 하는 상단이 거래를 청한다. 상단이 잘나가면 매상이 늘고, 망하면 받을 돈을 떼인다.
// - 명장이 되어 크게 이름이 나면, 내 이름을 건 상단을 세워 세계의 상단 흥망 속에 들어갈 수 있다.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { H } from '../history/state.js';
import { COMPANY_KIND } from '../history/state.js';
import { companyTarget } from '../history/trade.js';
import { me } from '../game.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, isAdult } from '../adventure/core.js';
import { C, TRADES, skillOf, gradeOf, fameOf, addFame } from './core.js';
import { shop } from './shop.js';

const PARTNER_KINDS = { smithing: ['arms'], farming: ['grain'], cooking: ['grain'], trade: ['caravan', 'cloth', 'shipping', 'manastone'], herbs: ['caravan', 'grain'] };
const OWN_KIND = { smithing: 'arms', farming: 'grain', cooking: 'grain', herbs: 'caravan', trade: null };
export const FOUND_COST = 500;

const companies = (g) => H(g)?.companies ?? [];
const companyById = (g, id) => companies(g).find((c) => c.id === id) ?? null;
const fortuneWord = (f) => (f >= 70 ? '금고가 넘친다는' : f >= 45 ? '장사가 탄탄하다는' : f >= 25 ? '요즘 어렵다는' : '곧 망할 거라는');
const payOf = (g, c) => Math.max(1, Math.round((2 + c.fortune / 15) * (PLACES[shop(g).place]?.wage ?? 1)));

/* ---------- 상단의 거래 제의 ---------- */
defineScene('company_offer', {
  need: (g) => !!shop(g),
  title: (g, s) => `${s.name}의 제의`,
  text: (g, s) => {
    const c = companyById(g, s.id);
    return `${J(s.name, '이/가')} 사람을 보냈다. '${shop(g).name}'의 물건을 꾸준히 대 주면 달마다 은화 ${s.pay}닢쯤을 석 달에 한 번 몰아서 치르겠다고 한다. 요즘 ${J(s.name, '은/는')} ${fortuneWord(c?.fortune ?? 40)} 소문이 돈다. 상단이 망하면 받을 돈은 떼인다.`;
  },
  choices: () => [{ label: '거래를 튼다', key: 'yes' }, { label: '거절한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const sh = shop(g);
    if (!sh || key !== 'yes' || !companyById(g, s.id)) return '상단 사람을 정중히 돌려보냈다.';
    sh.partner = { id: s.id, name: s.name, owed: 0, since: g.date.year };
    note(g, `${J(s.name, '과/와')} 거래를 텄다.`);
    return `${J(s.name, '과/와')} 계약서에 서명했다. 이제 가게 뒤뜰에 상단의 짐수레가 드나든다.`;
  },
});

/* ---------- 내 상단 세우기 ---------- */
defineScene('found_company', {
  need: (g) => !!shop(g),
  title: () => '내 이름을 건 상단',
  text: (g) => `'${shop(g).name}'의 이름은 이제 고장 밖까지 난다. 거래처와 창고, 짐수레를 갖춘 상단을 세우면 왕국의 큰 상단들과 어깨를 겨룰 수 있다. 은화 ${FOUND_COST}닢이 든다. 상단은 세상 형편에 따라 크게 흥하기도, 하루아침에 망하기도 한다.`,
  choices: (g) => [...(g.player.money >= FOUND_COST ? [{ label: `상단을 세운다 (은화 ${FOUND_COST}닢)`, key: 'yes' }] : []), { label: '가게 하나로 족하다', key: 'no' }],
  resolve(g, rng, s, key) {
    const hist = H(g);
    const sh = shop(g);
    if (key !== 'yes' || !hist || !sh || g.player.money < FOUND_COST) { C(g).companyDeclined = g.date.year; return '가게 문을 닫고 혼자 생각했다. 지금 가진 것을 지키는 것도 솜씨다.'; }
    g.player.money -= FOUND_COST;
    const kind = OWN_KIND[sh.trade] ?? ['caravan', 'cloth', 'shipping', 'manastone'].sort((a, b) => companyTarget(g, { kind: b }) - companyTarget(g, { kind: a }))[0];
    const name = `${me(g).lastName} 상회`;
    const id = `p${g.date.year}_${hist.founded ?? 0}`;
    hist.companies.push({ id, name, kind, fortune: 38, peak: 38, founded: g.date.year, founder: { name: g.player.name, lastName: me(g).lastName, pid: g.player.id }, player: true });
    hist.founded = (hist.founded ?? 0) + 1;
    C(g).ownCompany = { id, name, since: g.date.year };
    L(g).renown += 6;
    chron(g, `${g.player.name}, ${COMPANY_KIND[kind]} 장사를 하는 ${J(name, '을/를')} 세우다.`, 90);
    note(g, `${J(name, '을/를')} 세웠다.`);
    return `${name}의 깃발이 창고 지붕에 올랐다. 은저울 상단의 대리인이 축하 술을 보내왔다. 축하인지 경고인지는 알 수 없었다.`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !H(g)) return;
  const c = C(g);
  const sh = shop(g);
  // 거래 중인 상단
  if (sh?.partner) {
    const co = companyById(g, sh.partner.id);
    if (!co) {
      const lost = sh.partner.owed;
      g.news.unshift({ text: `${J(sh.partner.name, '이/가')} 망했다.${lost ? ` 받을 돈 은화 ${lost}닢을 떼였다.` : ' 다행히 받을 돈은 없었다.'}`, rel: 100 });
      note(g, `거래하던 ${J(sh.partner.name, '이/가')} 망했다.`);
      sh.partner = null;
    } else {
      sh.partner.owed += payOf(g, co);
      if (g.date.month % 3 === 0) {
        g.player.money += sh.partner.owed;
        if (sh.partner.owed >= 30 && rng.chance(0.4)) g.news.unshift({ text: `${J(co.name, '이/가')} 석 달 치 거래 값 은화 ${sh.partner.owed}닢을 치렀다.`, rel: 70 });
        sh.partner.owed = 0;
      }
    }
  } else if (sh && isAdult(g) && fameOf(g, sh.trade) >= 25 && !sceneQueued(g, 'company_offer') && rng.chance(0.04)) {
    const pool = companies(g).filter((x) => PARTNER_KINDS[sh.trade].includes(x.kind) && !x.player);
    if (pool.length) {
      const co = rng.pick(pool);
      queueScene(g, 'company_offer', { id: co.id, name: co.name, pay: payOf(g, co) });
    }
  }
  // 내 상단
  if (c.ownCompany) {
    const co = companyById(g, c.ownCompany.id);
    if (!co) {
      g.news.unshift({ text: `${J(c.ownCompany.name, '이/가')} 무너졌다. 창고와 짐수레가 빚쟁이들 손에 넘어갔다.`, rel: 100 });
      chron(g, `${g.player.name}의 ${J(c.ownCompany.name, '이/가')} 문을 닫다.`, 80);
      c.ownCompany = null;
    } else {
      const div = Math.round(co.fortune * 0.25);
      g.player.money += div;
      if (sh) addFame(g, sh.trade, co.fortune > 60 ? 0.2 : 0);
    }
  } else if (sh && isAdult(g) && !sceneQueued(g, 'found_company') && gradeOf(skillOf(g, sh.trade)) >= 3 && fameOf(g, sh.trade) >= 60 && g.player.money >= FOUND_COST
    && !(c.companyDeclined && g.date.year - c.companyDeclined < 5) && rng.chance(0.05)) {
    queueScene(g, 'found_company');
  }
});

export { companyById, TRADES };
