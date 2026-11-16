// 세상에 남은 작품들의 한 해: 평판이 오르내리고, 금서가 풀리고, 잊힌 작가가 다시 읽히고, 사본이 닳아 사라진다.
// 플레이어가 없어도 세상의 학자·시인·화가가 스스로 작품을 남긴다. 제 주사위를 따로 쓴다.
import { WORLD_TICKS } from '../world.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { L, chron, note } from '../adventure/core.js';
import { rulerName } from '../world.js';
import { invented } from '../era/state.js';
import { powerOf, notablesOf } from '../history/index.js';
import { AS, mi, clamp, KINDS, KIND_IDS, THEMES, alog } from './state.js';
import { makeTitle } from './life.js';

const MAX_WORKS = 70;
const Q = (t, pair) => `《${t}》${pair ? J(t, pair).slice(t.length) : ''}`;
const PLACES_FOR = ['leocast', 'harfen', 'solaris', 'serenia', 'verden', 'eisen', 'barka', 'klein'];
// 세상의 작가: 이름난 사람(학자·마법사) 가운데서, 없으면 고장의 학자·사제·음유시인 가운데서
const NPC_KIND = { scholar: ['history', 'travel', 'poems'], mage: ['grimoire'], bard: ['song', 'poems'], priest: ['history', 'poems', 'painting'], adventurer: ['travel'], knight: ['history'] };

function worldAuthor(g, rng) {
  const nb = notablesOf(g).filter((n) => n.alive !== false && NPC_KIND[n.kind]);
  if (nb.length && rng.chance(0.6)) { const n = rng.pick(nb); return { name: `${n.name} ${n.lastName}`, kinds: NPC_KIND[n.kind], place: n.place ?? rng.pick(PLACES_FOR) }; }
  const ps = (g.people ?? []).filter((p) => p.alive && !p.isPlayer && NPC_KIND[p.job]);
  if (ps.length) { const p = rng.pick(ps); return { name: `${p.name} ${p.lastName ?? ''}`.trim(), kinds: NPC_KIND[p.job], place: p.place ?? 'ern', pid: p.id }; }
  return null;
}

function yearOf(g, rng, say, record) {
  const A = AS(g);
  const press = invented(g, 'press');
  const church = powerOf(g, 'church');
  const ruler = rulerName(g);
  const gen = L(g).gen ?? 1;
  for (const w of A.works) {
    if (w.lost) continue;
    const T = THEMES[w.theme] ?? THEMES.love;
    const age = g.date.year - w.year;
    // 평판은 됨됨이 쪽으로 천천히 돌아가고, 결에 따라 세월이 한쪽으로 민다
    let d = (w.q - w.esteem) * 0.06 + T.drift * rng.float(0.4, 1.4) + rng.normal(0, 2);
    if (w.theme === 'praise' && w.ruler && w.ruler !== ruler) d -= 2.5;
    if (w.banned) d = Math.max(d, 0.5);
    if (age > 40 && !w.banned) d -= 0.6;
    w.esteem = Math.round(clamp(w.esteem + d, 0, 100) * 10) / 10;
    // 금서가 풀린다: 왕실의 금령은 임금이 바뀌면, 교단의 금서는 교단의 힘이 기울면
    if (w.banned) {
      const lift = w.banned.by === 'crown' ? (w.ruler !== ruler ? 0.35 : 0.03) : church < 35 ? 0.25 : church < 50 ? 0.06 : 0.01;
      if (age >= 3 && rng.chance(lift)) {
        const by = w.banned.by, yrs = Math.max(1, g.date.year - (w.banned.y ?? w.year));
        w.banned = null; w.esteem = clamp(w.esteem + 15, 0, 100); w.copies = Math.max(w.copies, press ? 6 : 2);
        say(`${by === 'church' ? '교단이' : '왕실이'} ${w.author}의 ${KINDS[w.kind].name} ${Q(w.title)}에 내렸던 ${by === 'church' ? '금서 봉인' : '금령'}을 거두었다. 서점 앞에 줄이 섰다.`, w.mine || w.q >= 70);
        if (w.mine || w.q >= 60) chron(g, `${Q(w.title)}, ${yrs}년 만에 금서에서 풀리다.`, w.mine ? 80 : 50);
        if (w.mine) alog(g, `${Q(w.title)}, 금서에서 풀렸다.`);
      }
    }
    // 잊힌 작가가 다시 읽힌다 (지은 사람이 세상을 떠난 뒤)
    const gone = w.mine ? w.gen < gen : age >= 30;
    if (gone && w.q >= 62 && w.esteem < w.q - 22 && !w.banned && rng.chance(0.07)) {
      w.esteem = clamp(w.q + 5, 0, 100); w.copies = Math.max(w.copies, press ? 8 : 3);
      say(`${w.year}년의 ${KINDS[w.kind].name} ${Q(w.title, '이/가')} 다시 읽히고 있다. 살아서는 이름을 얻지 못했던 ${J(w.author, '이/가')} 이제야 제값을 받는다는 말이 돈다.`, w.mine);
      if (w.mine) { chron(g, `선대 ${w.author}의 ${Q(w.title, '이/가')} 다시 읽히다.`, 75); alog(g, `선대의 ${Q(w.title, '이/가')} 다시 읽히기 시작했다.`); }
      else record?.(`${w.author}의 ${Q(w.title)} 재평가`);
    }
    // 사본이 닳는다. 인쇄기가 생기면 이름난 책은 오히려 는다.
    if (KINDS[w.kind]?.book) {
      if (press && w.esteem >= 40) w.copies = Math.min(40, w.copies + 1);
      else if (rng.chance(w.esteem >= 50 ? 0.15 : 0.4)) w.copies = Math.max(0, w.copies - 1);
      if (w.copies <= 0 && w.esteem < 35 && rng.chance(0.4)) w.lost = true;
    } else if (rng.chance(w.kind === 'song' ? (w.esteem < 25 ? 0.12 : 0.01) : 0.006)) w.lost = true;
    if (w.lost && w.mine) alog(g, `${Q(w.title, '이/가')} 세상에서 사라졌다.`);
  }
  // 세상의 작가들이 남기는 작품
  if (rng.chance(0.55)) {
    const au = worldAuthor(g, rng);
    if (au) {
      const kind = rng.pick(au.kinds.filter((k) => KINDS[k]));
      const theme = rng.pick(KINDS[kind].themes);
      const q = Math.round(clamp(rng.normal(48, 18), 8, 96));
      const w = { id: A.seq++, kind, theme, title: makeTitle(rng, kind, theme, au.place), author: au.name, mine: false, gen: 0, year: g.date.year, place: au.place, q, esteem: Math.round(q * 0.5), copies: KINDS[kind].book ? (press ? 10 : 2) : 1, banned: null, lost: false, ruler, pid: au.pid ?? null };
      A.works.push(w);
      const risk = THEMES[theme].risk;
      if (risk.church && rng.chance(risk.church * church / 60)) { w.banned = { by: 'church', y: g.date.year }; w.esteem += 8; say(`성광교 이단심문소가 ${w.author}의 ${KINDS[kind].name} ${Q(w.title, '을/를')} 금서로 정했다. 사본을 가진 자는 신고하라는 방이 붙었다.`, true); chron(g, `교단, ${Q(w.title, '을/를')} 금서로 정하다.`, 45); }
      else if (risk.crown && rng.chance(risk.crown * 0.7)) { w.banned = { by: 'crown', y: g.date.year }; w.esteem += 6; say(`왕실이 ${w.author}의 ${Q(w.title, '을/를')} 금했다. 장터 주점에서는 그 노랫말을 낮게 흥얼거린다.`, true); }
      else if (q >= 72) say(`${J(w.author, '이/가')} ${KINDS[kind].name} ${Q(w.title, '을/를')} 내놓았다. ${q >= 85 ? '사람들이 걸작이라 부른다.' : '평이 좋다.'}`, q >= 85);
    }
  }
  // 너무 많이 쌓이면, 내 집안 것이 아닌 사라진 것과 잊힌 것부터 지운다
  if (A.works.length > MAX_WORKS) {
    const drop = A.works.filter((w) => !w.mine).sort((a, b) => (b.lost - a.lost) || (a.esteem - b.esteem)).slice(0, A.works.length - MAX_WORKS);
    A.works = A.works.filter((w) => !drop.includes(w));
  }
}

WORLD_TICKS.push((g, worldRng, say, record) => {
  if (!g.arts) return;
  const A = g.arts;
  const rng = makeRng({ s: ((g.rngState?.s ?? 5) ^ Math.imul(mi(g) + 29, 3266489917)) | 0 });
  if (g.date.month === 1) yearOf(g, rng, say, record);
  // 대를 이은 뒤: 선대가 남긴 것을 돌아본다
  if (A.legacyAt && mi(g) >= A.legacyAt) {
    A.legacyAt = null;
    const left = A.works.filter((w) => w.mine && !w.lost && w.gen < (L(g).gen ?? 1));
    if (left.length) {
      const best = left.sort((a, b) => b.esteem - a.esteem)[0];
      note(g, `선대가 남긴 작품 ${left.length}점이 아직 세상에 있다. 그 가운데 ${Q(best.title, '은/는')} ${best.esteem >= 50 ? '지금도 사람들 입에 오르내린다' : '아는 사람만 안다'}.`);
    }
  }
});

export { KIND_IDS };
