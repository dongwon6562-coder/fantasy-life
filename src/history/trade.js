// 상단: 전쟁이면 무기상이, 흉년이면 곡물상이, 마석 시대가 오면 마석상이 큰다. 마물이 길을 막으면 대상이 망한다.
// 망한 상단은 사라지고, 이름난 상인이나 플레이어가 아는 장사꾼이 새 상단을 세운다. 크게 성한 상단주는 작위를 산다.
import { H, clamp, MAX, COMPANY_KIND, NEW_COMPANY_WORDS } from './state.js';
import { J } from '../narrative/text.js';
import { fullName, relevance } from '../npc.js';
import { raise, liveHouses } from './nobles.js';

export function companyTarget(g, c) {
  const r = g.realm, w = g.world ?? {};
  const war = r.balhart.war || r.succession === 'civilwar';
  let t = 45;
  if (c.kind === 'arms') t += (war ? 30 : 0) + (r.north.war ? 10 : 0) + (r.monsters > 55 ? 8 : 0) - (war ? 0 : 6);
  if (c.kind === 'grain') t += (r.bread - 1) * 25 + (w.famine ? 12 : 0);
  if (c.kind === 'manastone') t += r.era * 14 + Math.min(10, r.tech * 4) - 8;
  if (c.kind === 'shipping') t += (r.balhart.war ? -22 : 6) + (r.north.fallen ? -10 : 0);
  if (c.kind === 'cloth') t += (r.bread > 1.4 ? -12 : 6) + r.era * 4;
  if (c.kind === 'caravan') t += r.monsters > 55 ? -25 : 8;
  t -= Math.max(0, r.blackGlove - 60) * 0.3; // 검은 장갑이 뜯어 가는 몫
  return t;
}

export function tradeTick(g, rng, say, record, yearEnd) {
  const hist = H(g), year = g.date.year;
  for (const c of hist.companies) {
    const t = companyTarget(g, c);
    c.fortune = clamp(c.fortune + (t - c.fortune) * 0.03 + rng.normal(0, 1.4), c.pillar ? 18 : 0, 100);
    c.peak = Math.max(c.peak ?? 0, c.fortune);
  }
  if (!yearEnd) return;

  // 한 해의 큰 사고: 불, 난파, 도둑맞은 짐, 빚쟁이
  for (const c of hist.companies) {
    if (rng.chance(0.08)) {
      const hit = rng.int(15, 30);
      c.fortune = clamp(c.fortune - hit, c.pillar ? 18 : 0, 100);
      say(rng.pick([`${c.name}의 창고가 불타 한 해 장사를 날렸다.`, `${c.name}의 큰 거래가 사기로 드러났다.`, `${c.name}에서 돈을 빌려 간 귀족이 갚지 않고 죽어 버렸다.`, `${c.name}의 짐수레가 통째로 사라졌다.`]));
    }
  }
  // 망하는 상단
  for (const c of [...hist.companies]) {
    if (c.pillar || c.fortune > 14) continue;
    if (!rng.chance(c.fortune < 6 ? 0.7 : 0.3)) continue;
    hist.companies.splice(hist.companies.indexOf(c), 1);
    hist.fallen += 1;
    const why = {
      arms: '전쟁이 끝나자 창고 가득한 창칼을 사 줄 사람이 없었다',
      grain: '풍년에 값이 곤두박질쳤는데 비싸게 사들인 밀이 창고에서 썩었다',
      manastone: '마석 시세가 무너졌다',
      shipping: '배 세 척이 한 해에 가라앉았다',
      cloth: '굶주린 해에 비단을 사는 사람은 없었다',
      caravan: '마물이 들끓는 길에서 짐수레를 셋이나 잃었다',
    }[c.kind];
    say(`${J(c.name, '이/가')} 문을 닫았다. ${why}. ${rng.pick(['빚쟁이들이 창고 문을 부수고 들어갔다.', '상단주는 밤사이 도시를 떠났다고 한다.', '일하던 사람들이 하루아침에 길바닥에 나앉았다.'])}`, (c.peak ?? 0) > 50);
    record(`${c.name} 파산`);
  }
  // 새 상단
  if (hist.companies.length < MAX.companies && rng.chance(hist.companies.length < 4 ? 0.5 : 0.22)) found(g, rng, say, record);

  // 크게 성한 상단주가 작위를 산다 (드물게)
  const rich = hist.companies.filter((c) => !c.pillar && c.fortune > 85 && !c.ennobled);
  if (rich.length && liveHouses(g).length < 7 && rng.chance(0.2)) {
    const c = rng.pick(rich);
    c.ennobled = true;
    const founder = c.founder ?? { name: '상단주', lastName: c.name.split(' ')[0] };
    raise(g, rng, null, '남작', say, record, null, { name: founder.name, lastName: founder.lastName, age: 50, how: `${c.name}의 주인이다. 금화 자루로 산 작위라고 귀족들이 비웃었지만, 그 금화를 빌려 쓴 귀족도 여럿이다` });
  }
  // 한 해 장사 형편 소식 (작은 소식)
  const best = [...hist.companies].sort((a, b) => b.fortune - a.fortune)[0];
  if (best && rng.chance(0.25)) say(`요즘 ${best.name}의 금고가 가장 두둑하다고 한다. ${COMPANY_KIND[best.kind]} 장사가 잘된다는 말이 돈다.`);
  void year;
}

function found(g, rng, say, record) {
  const hist = H(g);
  // 세울 사람: 플레이어가 아는 장사꾼 → 이름난 상인 → 아무개
  const known = g.people.filter((p) => p.alive && !p.isPlayer && (p.job === 'merchant' || p.job === 'trade_master') && p.skill >= 55 && !p.foundedCompany && p.ageMonths >= 25 * 12);
  const notable = hist.notables.find((n) => n.kind === 'merchant' && n.fame >= 55 && !n.company);
  let founder = null, rel = 0;
  if (known.length && rng.chance(0.5)) {
    const p = rng.pick(known);
    p.foundedCompany = true;
    founder = { name: p.name, lastName: p.lastName, pid: p.id };
    rel = relevance(g, p);
    p.history.push({ y: g.date.year, m: g.date.month, text: '자기 이름을 건 상단을 세웠다.' });
  } else if (notable) {
    notable.company = true;
    founder = { name: notable.name, lastName: notable.lastName };
  }
  const used = new Set(hist.companies.map((c) => c.name));
  const word = NEW_COMPANY_WORDS.find((w) => !used.has(`${w} 상단`) && !used.has(`${w} 상회`)) ?? `${founder?.lastName ?? '새'}`;
  const kinds = ['grain', 'arms', 'manastone', 'cloth', 'caravan', 'shipping'];
  const kind = rng.weighted(kinds, (k) => Math.max(5, companyTarget(g, { kind: k })));
  const name = `${word} ${rng.chance(0.5) ? '상단' : '상회'}`;
  hist.companies.push({ id: `c${g.date.year}_${hist.founded}`, name, kind, fortune: rng.int(25, 40), peak: 30, founded: g.date.year, founder });
  hist.founded += 1;
  const who = founder ? (founder.pid ? `${fullName({ name: founder.name, lastName: founder.lastName })}` : `${founder.name} ${founder.lastName}`) : null;
  say(who ? `${J(who, '이/가')} ${COMPANY_KIND[kind]} 장사를 하는 ${J(name, '을/를')} 세웠다.` : `하르펜에 ${COMPANY_KIND[kind]} 장사를 하는 ${J(name, '이/가')} 새로 문을 열었다.`, rel >= 40, rel >= 40 ? Math.round(rel) : null);
  if (rel >= 40) record(`${name} 창립 (${who})`);
}
