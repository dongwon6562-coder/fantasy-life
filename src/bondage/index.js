// 21단계: 노예와 자유.
// 쇠사슬은 남해 섬과 성광국, 포르텔 뒷골목에서 아직 철컥거린다. 사람이 물건이 되는 길, 다시 사람이 되는 길.
// - 붙잡히는 길: 노예를 사고파는 땅(남해 군도, 포르텔 밤거리, 이종족에게는 성광국)에서 노예 사냥꾼에게 잡힌다(bondage_taken).
//   poor의 빚 노예가 그런 땅에 묶여 있으면, 감독관이 빚을 노예상에게 넘긴다(bondage_debtsold). 빚 노예 위에 얹는다.
// - 주인 집에서의 삶: 할 수 있는 일은 섬기기(bondage_serve)·달아나기(bondage_escape)·몸값 치르기(bondage_ransom)·쉬기뿐.
//   신임(trust)이 쌓이면 감시가 느슨해지고 몰래 모은 돈(savings)이 생긴다. 주인 집의 일(bondage_master): 매질, 주인 아이, 반란 모의, 되팔림, 풀어 주겠다는 말.
// - 도망과 추격: 달아난 노예(fugitive)를 노예 사냥꾼이 쫓는다(bondage_hunters). 노예가 금지된 땅으로 가면 쫓는 손이 줄어든다.
// - 풀려나기: 몸값, 주인의 해방, 식구가 보낸 돈(bondage_family), 반란. 풀려나면 새 이름을 고를 수 있다(bondage_newname).
//   달아나다 잡히면 낙인(branded)이 찍힌다. 낙인은 풀려나도 남는다(bondage_brand).
// - 거꾸로: 노예 시장(bondage_market)에서 사람을 사서 부리거나(bondage_drive, 악당의 길), 사서 풀어 주거나, 밤에 사슬을 끊는다(bondage_rescue).
//   부리는 사람의 일(bondage_owned): 풀어 달라는 애원, 도망, 병, 밤의 칼.
// - 나라마다 법이 다르다(BLAWS): 레오니아·제국·세레니아·변경·엘프·드워프는 금지, 성광국은 이종족만, 자유도시는 법으로 금하나 암시장,
//   남해는 무엇이든, 수인 부족 연합에서는 노예 주인을 그 자리에서 죽인다. 금지된 땅에서 노예를 부리면 죄(slaving)다.
// 매달 굴림은 따로 난수(ownRng)를 써서 다른 갈래의 난수를 밀지 않는다.
// 잇는 곳: poor(빚 노예), crime(죄·감옥), places(길·일자리), races(종족), relations, repute(deed), kin(식구 몸값), heir.
// 상태는 game.bondage 하나. 화면 연결점: bondageInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat } from '../game.js';
import { byId, makePerson, kill, ageYears } from '../npc.js';
import { PLACES, travelMonths, leaveJob } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, spend, canSpend, check } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { rel, remember } from '../relations.js';
import { isJailed, reportCrime, CRIMES } from '../crime.js';
import { deed } from '../repute/index.js';
import { addGrudge } from '../feud/index.js';
import { REALMS } from '../realms/data.js';
import { realmState } from '../realms/index.js';
import { playerRace, raceName, setRace, RACES } from '../races/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const realmOf = (pl) => PLACES[pl]?.realm ?? 'leonia';
const realmName = (r) => (r === 'sea' ? '남해 군도' : REALMS[r]?.short ?? '레오니아');
const alive = (p) => !!p && p.alive && !p.isPlayer;
const jo = (w, pair) => J(w, pair).slice(w.length);
// 이 갈래만의 난수: 매달 굴림이 많아 다른 갈래 점검을 흔들지 않게 따로 굴린다
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul(mi(g) * 47 + salt + 31, 2654435761)) | 0 });

// 사람을 사고파는 죄 (crime.js의 죄 목록에 얹는다)
CRIMES.slaving ??= { name: '노예 부리기', heat: 30, sev: 6, noto: 6 };

/* ---------- 나라마다 다른 법 ---------- */
// own: true(누구든) | 'nonhuman'(이종족만) | 'black'(법은 금하나 암시장) | false(금지)
export const BLAWS = {
  leonia: { own: false, crime: 1, word: '백 년 전에 노예를 없앴다. 사람을 사고팔면 중죄다. 수인을 부리던 기억은 아직 남았다.' },
  valhart: { own: false, crime: 1.2, word: '제국 법은 사람을 물건으로 치지 않는다. 죄수 노역만 있다.' },
  holy: { own: 'nonhuman', crime: 0.6, word: '빛의 자식이 아닌 것은 허가된 노예로 부릴 수 있다. 인간을 사고팔면 이단이다.' },
  serenia: { own: false, crime: 1, word: '협회는 노예를 금한다. 다만 계약 마법으로 묶인 견습생들이 있다는 말이 돈다.' },
  free: { own: 'black', crime: 0.5, word: '의회 법으로는 금하지만 포르텔 부두의 밤 시장은 쉬지 않는다. 판사도 값을 매긴다.' },
  sea: { own: true, crime: 0, word: '섬의 법은 돈이다. 빚진 사람도, 잡혀 온 사람도 물건이다.' },
  march: { own: false, crime: 1, word: '변경은 노예 대신 죄수를 성벽에 세운다.' },
  elf: { own: false, crime: 1.5, word: '숲은 잡혀간 동족을 잊지 않는다. 노예상은 숲에 들어오지 못한다.' },
  dwarf: { own: false, crime: 1, word: '계약서 없는 노역은 없다. 사람을 사는 계약서는 쓰지 않는다.' },
  beast: { own: false, crime: 3, word: '노예 사냥꾼과 노예 주인은 그 자리에서 죽인다.' },
};
export const lawHere = (g) => BLAWS[realmOf(here(g))] ?? BLAWS.leonia;
const ownLegal = (law, p) => law.own === true || (law.own === 'nonhuman' && (p?.race ?? 'human') !== 'human');
export const MARKETS = { saltmare: '살트마레 노예 시장', crow: '까마귀 둥지 동굴 부두', portel: '포르텔 부두 밤 시장', solaris: '솔라리스 허가 노예 경매' };
const MASTER_KINDS = {
  house: { name: '저택 일', work: '새벽에 물을 긷고, 낮에는 바닥을 닦고, 밤에는 주인 식구의 발을 씻겼다.' },
  field: { name: '소금밭과 사탕수수밭', work: '해가 뜨기 전부터 질 때까지 허리를 펴지 못했다. 감독관의 채찍 소리가 시계 노릇을 한다.' },
  galley: { name: '노 젓는 배', work: '사슬에 묶인 채 노를 저었다. 북소리가 빨라지면 등에 채찍이 떨어진다.' },
  quarry: { name: '동굴 채석장', work: '횃불 아래서 바위를 깼다. 돌가루와 땀이 섞여 진흙이 되었다.' },
};
const MASTER_TITLES = ['향신료 상인', '노예선 선장', '사탕수수밭 주인', '의회 의원의 집사', '해적 섬장', '교단 영지 관리인'];
const masterKindAt = (pl) => (pl === 'crow' ? 'quarry' : pl === 'saltmare' ? 'field' : pl === 'solaris' ? 'house' : 'house');

/* ---------- 상태 ---------- */
export function bondageState(g) {
  g.bondage ??= {};
  const v = g.bondage;
  v.slave ??= null;     // 내가 노예: { place, master, mkind, trust, since, ransom, savings, how, branded, escapes, prevHome }
  v.fugitive ??= null;  // 달아난 노예: { from, realm, y, heat, branded }
  v.freed ??= null;     // 풀려난 뒤: { y, how, branded, papers, oldName, name }
  v.owned ??= [];       // 내가 부리는 사람 [{ pid, bought, price, loyalty }]
  v.helped ??= 0;       // 풀어 준 사람 수
  v.enslaved ??= 0;     // 이 집안이 노예로 끌려간 횟수
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const V = bondageState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
export const enslaved = (g) => !!V(g).slave;
const free = (g) => !V(g).slave && !L(g).travel && !isJailed(g) && !g.army?.captive && !g.army?.campaign && !g.over && !L(g).heirPending;
const trustWord = (t) => (t >= 80 ? '주인이 열쇠를 맡긴다' : t >= 55 ? '믿을 만한 종으로 여긴다' : t >= 30 ? '눈여겨본다' : t >= 10 ? '감시가 붙어 있다' : '사슬을 풀지 않는다');
const loyaltyWord = (l) => (l >= 60 ? '따른다' : l >= 30 ? '고분고분하다' : l >= 10 ? '눈치를 본다' : '눈에 원한이 있다');
const heatWord = (h) => (h >= 60 ? '현상금이 붙었다' : h >= 30 ? '사냥꾼이 뒤를 밟는다' : '쫓는 손이 느슨해졌다');
const ownedLive = (g) => V(g).owned.filter((o) => alive(byId(g, o.pid)));

/* ---------- 화면용 ---------- */
export function bondageInfo(g) {
  const v = V(g);
  const s = v.slave, f = v.fugitive, fr = v.freed;
  const law = lawHere(g);
  return {
    slave: s ? { placeName: placeName(s.place), master: s.master, work: MASTER_KINDS[s.mkind]?.name ?? '노역', trust: Math.round(s.trust), trustWord: trustWord(s.trust), months: mi(g) - s.since, ransom: s.ransom, savings: s.savings, branded: !!s.branded, escapes: s.escapes } : null,
    fugitive: f ? { fromName: placeName(f.from), heat: Math.round(f.heat), heatWord: heatWord(f.heat), branded: !!f.branded } : null,
    freed: fr ? { y: fr.y, how: fr.how, howWord: { ransom: '몸값을 치르고', manumit: '주인이 풀어 주어', family: '식구가 몸값을 보내', revolt: '반란 끝에', escape: '달아나', rescue: '누군가 사슬을 끊어 주어' }[fr.how] ?? '', branded: !!fr.branded, papers: !!fr.papers, oldName: fr.oldName ?? null } : null,
    owned: ownedLive(g).map((o) => { const p = byId(g, o.pid); return { name: p.name, race: raceName(p.race ?? 'human'), age: ageYears(p), loyalty: Math.round(o.loyalty), loyaltyWord: loyaltyWord(o.loyalty) }; }),
    helped: v.helped,
    law: { realmName: realmName(realmOf(here(g))), word: law.word, own: law.own === true ? '허용' : law.own === 'nonhuman' ? '이종족만' : law.own === 'black' ? '암시장' : '금지', market: MARKETS[here(g)] ?? null },
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 노예가 되다 ---------- */
// 사슬에 묶여 끌려가면 국경에서 통행세를 낼 일도, 돌아설 길도 없다
function carry(g, place) {
  L(g).place = place; L(g).travel = null;
  const R = realmState(g);
  R.cur = realmOf(place); R.last = place;
  L(g).queue = L(g).queue.filter((x) => x.kind !== 'border');
}
export function enslave(g, r, { how = 'captured', place = here(g), kind } = {}) {
  const v = V(g);
  if (v.slave || isJailed(g) || g.over) return false;
  const taken = Math.floor(g.player.money * 0.85);
  g.player.money -= taken;
  leaveJob(g, '사슬에 묶여 끌려가며 일을 잃었다.');
  const mk = kind ?? masterKindAt(place);
  const master = `${makePerson(r, { sex: r.chance(0.7) ? 'm' : 'f' }).name}, ${r.pick(MASTER_TITLES)}`;
  v.slave = { place, master, mkind: mk, trust: 5, since: mi(g), ransom: 60 + r.int(0, 6) * 10 + Math.round(g.player.stats.str / 2), savings: 0, how, branded: false, escapes: 0, prevHome: L(g).home };
  v.fugitive = null;
  v.enslaved += 1;
  carry(g, place); L(g).home = 'barracks';
  stress(g, 25);
  note(g, `${placeName(place)}에서 노예가 되었다. 주인은 ${master}.`);
  chron(g, `${g.player.name}, ${placeName(place)}에서 노예로 팔리다.`, 60);
  log(g, `${placeName(place)}에서 ${master}에게 팔렸다.${taken ? ` 가진 은화 ${taken}닢은 노예상이 가져갔다.` : ''}`);
  for (const id of g.player.familyIds ?? []) { const p = byId(g, id); if (alive(p)) p.affection = clamp((p.affection ?? 0) + 3, -100, 100); }
  return true;
}
function setFree(g, how, { papers = true } = {}) {
  const v = V(g), s = v.slave;
  if (!s) return;
  v.slave = null;
  v.freed = { y: g.date.year, how, branded: s.branded, papers, oldName: null, from: s.place };
  L(g).home = 'street';
  stress(g, -15);
  note(g, `${placeName(s.place)}에서 풀려났다.`);
  chron(g, `${g.player.name}, ${mi(g) - s.since}달 만에 사슬을 벗다.`, 50);
  log(g, `${placeName(s.place)}에서 풀려났다. ${Math.round((mi(g) - s.since) / 12)}년 만이다.`);
  // 새 이름 후보는 장면 데이터에 미리 넣는다 (다시 그려도 같은 이름)
  const r = ownRng(g, 9), sx = me(g).sex;
  const names = [makePerson(r, { sex: sx }).name, makePerson(r, { sex: sx }).name, makePerson(r, { sex: sx }).name].filter((n, i, a) => a.indexOf(n) === i && n !== g.player.name).slice(0, 2);
  queueScene(g, 'bondage_newname', { names });
}

defineScene('bondage_taken', {
  title: () => '사슬',
  text: (g, s) => `${s.where === 'night' ? '자정의 부두 골목. ' : ''}뒤에서 자루가 씌워졌다. 사슬 소리, 낮은 웃음소리. "${s.nonhuman ? '이종족은 허가증이 없으면 주인 없는 물건이지.' : '튼튼하네. 섬에서 값이 좋겠어.'}" 노예 사냥꾼이 셋이다.`,
  choices: (g) => (free(g) ? [{ label: '사슬을 뿌리치고 싸운다', key: 'fight' }, canSpend(g, 30) ? { label: '은화 서른 닢을 내밀고 놓아 달라고 한다', key: 'pay' } : null, { label: '버티지 않는다', key: 'yield' }].filter(Boolean) : []),
  resolve(g, rng, s, key) {
    if (!free(g)) return '사냥꾼들은 다른 먹잇감을 찾아갔다.';
    if (key === 'pay') {
      if (!spend(g, 30)) return '내밀 돈이 없었다.';
      if (rng.chance(0.65)) { stress(g, 8); return '은화를 세어 본 사냥꾼이 자루를 벗겼다. "오늘은 운이 좋군." 다리가 떨려 한참 일어서지 못했다.'; }
      enslave(g, rng, { how: 'captured' });
      return '은화를 받아 챙기고도 사냥꾼은 사슬을 풀지 않았다. "돈도 받고 물건도 팔고." 배 밑창에 던져졌다.';
    }
    if (key === 'fight') {
      if (check(rng, g.player.stats.str * 0.5 + g.player.stats.agi * 0.4 + (g.player.skills?.sword ?? 0) * 0.3, 45)) {
        deed(g, 'brave', 2, '노예 사냥꾼을 때려눕혔다더라');
        gainStat(g, 'str', 0.3);
        return '팔꿈치로 하나를 치고 사슬을 휘둘렀다. 둘이 쓰러지자 하나는 달아났다. 손목에 쇠 자국이 남았다. 오늘 밤은 남았지만, 다음은 모른다.';
      }
      g.player.injuries.push({ name: '사슬에 맞은 머리', months: 2 });
      enslave(g, rng, { how: 'captured' });
      return '하나를 쓰러뜨렸지만 몽둥이가 뒤통수를 쳤다. 눈을 뜨니 배 밑창이었다. 발목에 사슬이 감겨 있다.';
    }
    enslave(g, rng, { how: 'captured' });
    return '버티지 않았다. 버티면 죽는다는 걸 알았다. 배 밑창에서 사흘을 갔다. 내리니 시장이었다. 사람들이 내 이를 들여다보았다.';
  },
});
defineScene('bondage_debtsold', {
  title: () => '팔린 빚',
  text: () => '감독관이 낯선 사내와 장부를 맞대고 있었다. 은화가 오갔다. 감독관이 나를 가리켰다. "이제 이 사람 거다. 빚도, 몸도." 목에 걸린 나무패가 쇠패로 바뀌었다.',
  choices: (g) => (g.poor?.bond && !V(g).slave ? [{ label: '따라간다', key: 'go' }, { label: '그 자리에서 달아난다', key: 'run' }] : []),
  resolve(g, rng, s, key) {
    const b = g.poor?.bond;
    if (!b || V(g).slave) return '장부는 다시 덮였다.';
    if (key === 'run' && check(rng, g.player.stats.agi * 0.6 + g.player.stats.sen * 0.3, 50)) {
      g.poor.bond = null; g.poor.fled = (g.poor.fled ?? 0) + 1;
      reportCrime(g, 'fraud', here(g), { mult: 0.8 });
      V(g).fugitive = { from: here(g), realm: realmOf(here(g)), y: g.date.year, heat: 50, branded: false };
      return '창고 문이 열린 틈에 뛰었다. 등 뒤로 고함이 쏟아졌다. 이제 빚진 도망자가 아니라 달아난 노예다. 쫓는 사람이 달라졌다.';
    }
    g.poor.bond = null;
    enslave(g, rng, { how: 'debt' });
    return key === 'run' ? '세 걸음도 못 가 붙잡혔다. 새 주인은 웃었다. "값이 떨어지겠군." 발목에 사슬이 더해졌다.' : '새 주인을 따라 배에 올랐다. 빚은 장부에서 지워졌다. 대신 나는 장부에 올랐다. 물건으로.';
  },
});

/* ---------- 노예의 하루: 할 수 있는 일 ---------- */
const SLAVE_OK = new Set(['bondage_serve', 'bondage_escape', 'bondage_ransom', 'rest', 'meditate']);
HOOKS.actionFilter.push((g, a) => {
  if (g.crime?.jailed || g.army?.captive) return true;
  if (V(g).slave) return SLAVE_OK.has(a.id);
  return !['bondage_serve', 'bondage_escape', 'bondage_ransom'].includes(a.id);
});
ACTIONS.push({
  id: 'bondage_serve', name: '주인을 섬긴다', icon: 'labor',
  desc: '시키는 일을 말없이 해낸다. 신임이 쌓이면 사슬이 느슨해지고, 몰래 모으는 돈이 생긴다.',
  available: (g) => !!V(g).slave && !L(g).travel,
  run(g, rng) {
    const s = V(g).slave;
    const gain = 3 + g.player.stats.int / 25 + g.player.stats.cha / 30 + rng.int(0, 3);
    s.trust = clamp(s.trust + gain, 0, 100);
    tired(g, 16); stress(g, 4);
    gainStat(g, s.mkind === 'house' ? 'cha' : 'str', 0.2);
    if (s.trust >= 30) s.savings += 1 + Math.floor(s.trust / 40);
    return `${MASTER_KINDS[s.mkind]?.work ?? '하루 종일 일했다.'} ${s.trust >= 55 ? '요즘은 감독관이 나를 따로 부르지 않는다.' : s.trust >= 30 ? '오늘은 사슬 없이 우물에 다녀오라는 말을 들었다.' : '눈을 내리깔고 일했다. 눈에 띄지 않는 것이 이곳의 첫째 규칙이다.'}`;
  },
});
// 가장 가까운, 노예를 금하는 땅 (달아날 곳)
function refuge(g) {
  const pl = here(g);
  const ok = Object.keys(PLACES).filter((id) => id !== pl && !PLACES[id].hidden && travelMonths(pl, id) < 99 && (BLAWS[realmOf(id)]?.own ?? false) === false);
  return ok.sort((a, b) => travelMonths(pl, a) - travelMonths(pl, b) || a.localeCompare(b))[0] ?? null;
}
ACTIONS.push({
  id: 'bondage_escape', name: '달아난다', icon: 'travel',
  desc: '감시가 느슨한 밤을 골라 담을 넘는다. 신임이 높을수록 쉽다. 붙잡히면 낙인이 찍힌다.',
  available: (g) => !!V(g).slave && !L(g).travel,
  run(g, rng) {
    const v = V(g), s = v.slave;
    tired(g, 10);
    const diff = 55 + (s.mkind === 'galley' ? 10 : 0) - s.escapes * 2;
    if (check(rng, g.player.stats.agi * 0.45 + g.player.stats.sen * 0.35 + s.trust * 0.35, diff)) {
      const to = refuge(g);
      const from = s.place, branded = s.branded;
      v.slave = null;
      v.fugitive = { from, realm: realmOf(from), y: g.date.year, heat: 60, branded };
      L(g).home = 'street';
      if (s.savings) g.player.money += s.savings;
      if (to) L(g).travel = { to, left: travelMonths(from, to), from };
      chron(g, `${g.player.name}, ${placeName(from)}에서 사슬을 끊고 달아나다.`, 50);
      log(g, `${placeName(from)}에서 달아났다.${to ? ` ${J(placeName(to), '으로/로')} 간다.` : ''}`);
      deed(g, 'brave', 2, null, from);
      stress(g, -10);
      return `${s.trust >= 55 ? '맡겨 둔 열쇠로 뒷문을 열었다.' : '사슬 고리를 몇 달 동안 돌에 갈아 두었다.'} 달 없는 밤, 담을 넘었다.${s.savings ? ` 몰래 모은 은화 ${s.savings}닢이 품에 있다.` : ''} ${to ? `${J(placeName(to), '으로/로')} 가는 길이다. 노예를 사고팔지 않는 땅.` : '갈 곳은 모른다. 여기만 아니면 된다.'} 개 짖는 소리가 오래 따라왔다.`;
    }
    s.escapes += 1;
    s.trust = Math.max(0, s.trust - 30);
    s.savings = Math.floor(s.savings / 2);
    g.player.injuries.push({ name: '채찍 자국', months: 2 });
    stress(g, 15);
    if (!s.branded) {
      s.branded = true;
      log(g, '달아나다 붙잡혀 낙인이 찍혔다.');
      return '개들이 먼저 나를 찾았다. 끌려와 기둥에 묶였다. 감독관이 화로에서 쇠를 꺼냈다. 어깨에 주인의 표식이 찍혔다. 그 냄새는 평생 잊지 못할 것이다.';
    }
    return [
      '이번에도 담 밑에서 붙잡혔다. 채찍이 스무 번 떨어졌다. 세다가 그만두었다.',
      '강가까지 갔다. 물에 발을 담그기 전에 횃불들이 둘러쌌다. 사흘 동안 물도 받지 못했다.',
      '숲 어귀에서 개 짖는 소리가 났다. 더 뛸 다리가 없었다. 끌려와 쇠사슬이 한 겹 늘었다.',
      '같이 달아나자던 이가 감독관에게 일러바쳤다. 문을 나서기도 전에 붙잡혔다.',
    ][(g.date.year * 12 + g.date.month) % 4];
  },
});
ACTIONS.push({
  id: 'bondage_ransom', name: '몸값을 치른다', icon: 'coin',
  desc: '몰래 모은 돈과 가진 돈으로 주인에게 몸값을 치르고 해방 증서를 받는다.',
  available: (g) => { const s = V(g).slave; return !!s && !L(g).travel && s.savings + g.player.money >= s.ransom; },
  run(g) {
    const s = V(g).slave;
    if (!s || s.savings + g.player.money < s.ransom) return '몸값이 모자랐다.';
    const fromSave = Math.min(s.savings, s.ransom);
    g.player.money -= s.ransom - fromSave;
    s.savings -= fromSave;
    g.player.money += s.savings;
    const master = s.master;
    setFree(g, 'ransom');
    deed(g, 'honest', 2, '제 몸값을 제 손으로 치렀다더라');
    return `은화를 탁자 위에 쌓았다. ${J(master.split(',')[0], '은/는')} 한 닢씩 세더니 증서에 도장을 찍었다. "이제 네 것은 네 것이다." 증서를 받아 드는 손이 떨렸다.`;
  },
});

/* ---------- 주인 집의 일 ---------- */
const MASTER_EV = {
  cruel: {
    text: (g, s) => `${s.master.split(',')[0]}의 술버릇이 또 시작됐다. 오늘은 내 차례다. 채찍이 탁자 위에 놓였다.`,
    choices: () => [{ label: '이를 악물고 견딘다', key: 'endure' }, { label: '채찍을 빼앗는다', key: 'strike' }, { label: '무릎 꿇고 빈다', key: 'beg' }],
  },
  kind: {
    text: (g, s) => `주인의 어린 딸이 부엌 구석에 숨어 글자판을 펼쳤다. "너도 배울래? 아무한테도 말 안 할게." ${s.master.split(',')[0]}의 집에서 노예가 글을 배우면 손가락을 자른다.`,
    choices: () => [{ label: '배운다', key: 'learn' }, { label: '고개를 젓는다', key: 'no' }],
  },
  revolt: {
    text: () => '헛간에서 노예 여섯이 머리를 맞댔다. "보름날 밤. 감독관 셋을 묶고 배를 뺏는다." 우두머리가 나를 보았다. "너도 하나다. 낄 거냐, 입 다물 거냐."',
    choices: () => [{ label: '낀다', key: 'join' }, { label: '입 다물고 빠진다', key: 'stay' }, { label: '주인에게 일러바친다', key: 'betray' }],
  },
  offer: {
    text: (g, s) => `${J(s.master.split(',')[0], '이/가')} 나를 따로 불렀다. "너는 쓸 만하다. 다른 놈들을 감독해라. 채찍은 네가 든다." 감독이 되면 사슬을 풀고 방도 따로 준다.`,
    choices: () => [{ label: '채찍을 받는다', key: 'take' }, { label: '거절한다', key: 'refuse' }],
  },
  sold: {
    text: (g, s) => `${s.master.split(',')[0]}의 빚이 쌓였다는 말이 돌더니, 오늘 아침 낯선 사람들이 와서 노예들의 이를 보았다. 내 차례가 왔다.`,
    choices: () => [{ label: '체념한다', key: 'go' }, { label: '병든 척한다', key: 'fake' }],
  },
};
defineScene('bondage_master', {
  title: () => '주인 집',
  text: (g, s) => MASTER_EV[s.ev].text(g, V(g).slave ?? { master: '주인' }),
  choices: (g, s) => (V(g).slave && !L(g).travel && MASTER_EV[s.ev] ? MASTER_EV[s.ev].choices(g) : []),
  resolve(g, rng, s, key) {
    const v = V(g), sl = v.slave;
    if (!sl) return '그 집은 이제 내 집이 아니다.';
    const mname = sl.master.split(',')[0];
    if (s.ev === 'cruel') {
      if (key === 'endure') { stress(g, 10); gainStat(g, 'wil', 0.4); sl.trust = clamp(sl.trust + 3, 0, 100); return '세지 않았다. 세면 더 아프다. 끝나고 나서 우물가에서 등을 씻었다. 물이 붉었다.'; }
      if (key === 'beg') { stress(g, 14); sl.trust = clamp(sl.trust + 1, 0, 100); return `무릎을 꿇었다. ${J(mname, '은/는')} 그게 더 재미있다는 듯 웃었다. 채찍은 줄지 않았다. 다음부터는 빌지 않기로 했다.`; }
      if (check(rng, g.player.stats.str * 0.6 + g.player.stats.agi * 0.3, 45)) {
        sl.trust = Math.max(0, sl.trust - 20);
        if (rng.chance(0.4)) {
          const branded = sl.branded, from = sl.place;
          v.slave = null; v.fugitive = { from, realm: realmOf(from), y: g.date.year, heat: 90, branded };
          L(g).home = 'street';
          const to = refuge(g); if (to) L(g).travel = { to, left: travelMonths(from, to), from };
          reportCrime(g, 'assault', from, { mult: 1 });
          chron(g, `${g.player.name}, 주인을 쓰러뜨리고 달아나다.`, 50);
          return `채찍을 빼앗아 ${J(mname, '을/를')} 내리쳤다. 주인이 바닥에 쓰러졌다. 생각할 틈도 없이 문을 박차고 나갔다. 이제 돌아갈 길은 없다.`;
        }
        g.player.injuries.push({ name: '몽둥이에 맞은 갈비', months: 3 });
        return `채찍을 빼앗았다. 그러나 감독관들이 몰려왔다. 몽둥이가 갈비뼈를 부쉈다. ${J(mname, '은/는')} 그날 이후 나를 볼 때 웃지 않는다. 대신 조금 겁을 낸다.`;
      }
      g.player.injuries.push({ name: '채찍 자국', months: 2 }); stress(g, 15); sl.trust = Math.max(0, sl.trust - 15);
      return '손을 뻗었지만 채찍이 먼저였다. 그날 밤은 사슬에 묶인 채 마당에서 잤다.';
    }
    if (s.ev === 'kind') {
      if (key === 'no') return '고개를 저었다. 아이는 실망한 얼굴로 글자판을 접었다. 손가락이 열 개인 게 낫다.';
      g.player.skills.letters = (g.player.skills.letters ?? 0) + 4;
      gainStat(g, 'int', 0.5);
      if (rng.chance(0.2)) { sl.trust = Math.max(0, sl.trust - 15); stress(g, 10); return '석 달 만에 글자를 다 뗐다. 그리고 들켰다. 아이가 울며 매달려서 손가락은 남았다. 대신 그 아이를 다시는 보지 못했다.'; }
      return '밤마다 부엌 바닥에 숯으로 글자를 썼다가 지웠다. 석 달 만에 주인 장부를 읽을 수 있게 되었다. 장부에는 내 값이 적혀 있었다.';
    }
    if (s.ev === 'revolt') {
      if (key === 'stay') return '입을 다물었다. 보름날 밤 헛간 쪽에서 고함이 났다. 아침에 우두머리가 마당 기둥에 매달려 있었다. 아무도 나를 보지 않았다.';
      if (key === 'betray') {
        sl.trust = clamp(sl.trust + 30, 0, 100); deed(g, 'loyal', -6, '노예 반란을 일러바쳤다더라'); stress(g, 12);
        return `${J(mname, '은/는')} 내 어깨를 두드렸다. 보름날 밤, 헛간에서 비명이 들렸다. 다음 날부터 나는 사슬 없이 다닌다. 다른 노예들은 나와 한 우물을 쓰지 않는다.`;
      }
      if (check(rng, g.player.stats.str * 0.4 + g.player.stats.cha * 0.3 + g.player.stats.int * 0.2, 45)) {
        const from = sl.place;
        setFree(g, 'revolt', { papers: false });
        V(g).fugitive = { from, realm: realmOf(from), y: g.date.year, heat: 70, branded: !!V(g).freed?.branded };
        chron(g, `${placeName(from)}에서 노예 반란이 일어나 배 한 척이 사라지다.`, 70);
        deed(g, 'brave', 4, '노예 반란을 이끌었다더라', from);
        const to = refuge(g); if (to) L(g).travel = { to, left: travelMonths(from, to), from };
        return '보름날 밤. 감독관 셋을 묶었다. 항구의 작은 배를 빼앗아 노를 저었다. 해가 뜰 때 섬은 수평선 아래로 사라졌다. 배 위에서 누군가 노래를 시작했다. 아무도 가사를 몰랐다.';
      }
      sl.branded = true; sl.trust = 0; g.player.injuries.push({ name: '반란 끝에 얻은 상처', months: 4 }); stress(g, 20);
      return '보름날 밤, 감독관들이 먼저 와 있었다. 누군가 일러바쳤다. 우두머리는 기둥에 매달렸고 나는 낙인이 찍혔다. 다음 보름이 오기까지 아무도 말하지 않았다.';
    }
    if (s.ev === 'offer') {
      if (key === 'refuse') { sl.trust = Math.max(0, sl.trust - 8); return '"그럼 평생 그 사슬이나 차고 있어라." 주인은 혀를 찼다. 그날 밤 같은 방 노예들이 내 몫의 빵을 조금씩 떼어 주었다.'; }
      sl.trust = clamp(sl.trust + 20, 0, 100); sl.savings += 5; deed(g, 'kind', -4, null); stress(g, 8);
      return '채찍을 받았다. 첫날, 늙은 노예 하나가 일을 늦게 했다. 손이 올라갔다. 내 손이었다. 그날 밤 방이 따로 생겼다. 잠은 오지 않았다.';
    }
    // sold
    if (key === 'fake' && check(rng, g.player.stats.int * 0.5 + g.player.stats.cha * 0.3, 45)) return '기침을 하고 눈을 뒤집었다. 사러 온 사람들이 뒤로 물러섰다. "병든 놈은 빼." 나는 남았다. 다음 번에도 통할지는 모른다.';
    const places = Object.keys(MARKETS).filter((x) => x !== sl.place);
    const to = rng.pick(places);
    sl.place = to; sl.master = `${makePerson(rng, { sex: 'm' }).name}, ${rng.pick(MASTER_TITLES)}`; sl.mkind = masterKindAt(to); sl.trust = 5; sl.ransom += 10;
    carry(g, to);
    log(g, `${J(placeName(to), '으로/로')} 되팔렸다.`);
    return `다시 배에 올랐다. ${J(placeName(to), '으로/로')} 간다. 새 주인은 ${sl.master.split(',')[0]}. 처음부터 다시다.`;
  },
});
defineScene('bondage_family', {
  title: () => '집에서 온 돈',
  text: (g, s) => `${J(s.from, '이/가')} 보낸 사람이 주인 집 문을 두드렸다. 손에 가죽 주머니가 들려 있다. 은화 ${s.amount}닢. 집안 살림을 판 돈이다.`,
  choices: (g) => (V(g).slave ? [{ label: '그 돈으로 풀려난다', key: 'yes' }, { label: '돌려보낸다. 식구가 굶는다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    if (!V(g).slave) return '이미 풀려난 뒤였다.';
    const f = byId(g, s.pid);
    if (key === 'no') { if (alive(f)) f.affection = clamp((f.affection ?? 0) + 10, -100, 100); stress(g, 10); return '주머니를 도로 쥐여 보냈다. "집에 가서 말해 주오. 살아 있다고." 그 말만으로도 한 달을 버텼다.'; }
    g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) - s.amount);
    if (alive(f)) remember(g, f, '몸값을 보내 노예에서 풀어 주었다', 3, { tag: 'bondage' });
    setFree(g, 'family');
    return '주인이 은화를 세고 증서를 썼다. 사슬이 풀렸다. 집으로 가는 길은 멀다. 그래도 가는 길이 있다.';
  },
});

/* ---------- 쫓는 사람들 ---------- */
defineScene('bondage_hunters', {
  title: () => '노예 사냥꾼',
  text: (g) => `주막 문간에 사내 둘이 서 있다. 손에 낡은 종이 한 장. 거기 그려진 얼굴이 나다.${V(g).fugitive?.branded ? ' 하나가 내 어깨 쪽을 보고 있다. 낙인 자리다.' : ''} "${placeName(V(g).fugitive?.from)}에서 달아난 물건을 찾소."`,
  choices: (g) => (V(g).fugitive && !V(g).slave && free(g) ? [{ label: '칼을 뽑는다', key: 'fight' }, canSpend(g, 25) ? { label: '은화 스물다섯 닢을 쥐여 준다', key: 'bribe' } : null, { label: '뒷문으로 빠져나간다', key: 'run' }].filter(Boolean) : []),
  resolve(g, rng, s, key) {
    const v = V(g), f = v.fugitive;
    if (!f || v.slave) return '사냥꾼들은 다른 얼굴을 찾아갔다.';
    if (key === 'bribe') { if (!spend(g, 25)) return '쥐여 줄 돈이 없었다.'; f.heat = Math.max(0, f.heat - 30); return '은화를 받아 든 사냥꾼이 종이를 접었다. "닮은 사람이 많더군." 다음 고장에서 또 펼칠 종이다.'; }
    const ok = key === 'fight'
      ? check(rng, g.player.stats.str * 0.5 + g.player.stats.agi * 0.3 + (g.player.skills?.sword ?? 0) * 0.4, 45)
      : check(rng, g.player.stats.agi * 0.6 + g.player.stats.sen * 0.3, 40);
    if (ok) {
      f.heat = Math.max(0, f.heat - (key === 'fight' ? 35 : 15));
      if (key === 'fight') { deed(g, 'brave', 2, null); if (lawHere(g).own === false) return '칼을 뽑자 주막 사람들이 일어섰다. "여기서는 사람을 못 사 가." 사냥꾼들은 침을 뱉고 물러났다.'; return '하나의 팔을 베었다. 둘은 피를 흘리며 물러났다. 다음엔 더 많이 올 것이다.'; }
      return '뒷문으로 나와 지붕을 탔다. 골목 셋을 지나서야 숨을 쉬었다.';
    }
    const to = Object.keys(MARKETS).includes(f.from) ? f.from : 'saltmare';
    v.fugitive = null;
    enslave(g, rng, { how: 'recaptured', place: to });
    const s2 = v.slave; if (s2) { s2.branded = true; s2.trust = 0; s2.escapes = 1; }
    return '붙잡혔다. 손목에 다시 쇠가 채워졌다. 배 밑창은 처음과 똑같은 냄새가 났다.';
  },
});

/* ---------- 풀려난 뒤: 새 이름과 낙인 ---------- */
defineScene('bondage_newname', {
  title: () => '사슬 뒤의 이름',
  text: (g) => `사슬을 벗고 처음 맞는 아침이다. 주인은 나를 ${V(g).freed?.how === 'escape' ? "'그놈'이라고만" : "'이봐'라고만"} 불렀다. ${g.player.name}. 그 이름으로 다시 살 것인가, 사슬과 함께 묻을 것인가.`,
  choices: (g, s) => {
    if (!V(g).freed || V(g).slave) return [];
    const names = s.names ?? [];
    return [{ label: `${g.player.name}${jo(g.player.name, '으로/로')} 산다`, key: 'keep' }, ...names.map((n, i) => ({ label: `${J(n, '으로/로')} 새로 산다`, key: `new:${i}` }))];
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    if (!v.freed) return '';
    if (key === 'keep') { deed(g, 'brave', 1, null); return `${g.player.name}. 어머니가 지어 준 이름이다. 사슬이 그 이름을 가져가지 못했다는 걸 보여 줄 것이다.`; }
    const n = (s.names ?? [])[Number(key.split(':')[1])];
    if (!n) return '이름은 그대로 두었다.';
    const old = g.player.name;
    v.freed.oldName = old; v.freed.name = n;
    g.player.name = n; me(g).name = n;
    note(g, `${old}${jo(old, '이었/였')}던 이름을 버리고 ${J(n, '이/가')} 되었다.`);
    log(g, `${old}${jo(old, '이었/였')}던 이름을 버리고 ${n}${jo(n, '으로/로')} 산다.`);
    return `${n}. 아무도 그 이름에 사슬을 채운 적이 없다. 처음 몇 달은 누가 그 이름을 불러도 돌아보지 않았다.`;
  },
});
defineScene('bondage_brand', {
  title: () => '낙인',
  text: (g) => {
    const law = lawHere(g);
    return law.own ? '우물가에서 소매가 걷혔다. 어깨의 낙인을 본 사내가 눈을 가늘게 떴다. "주인 표식이군. 증서는 있나?" 사내가 경비대 쪽을 돌아보았다.'
      : '장터에서 소매가 걷혔다. 어깨의 낙인을 본 아이가 엄마 치마 뒤로 숨었다. 사람들의 눈이 한꺼번에 내 어깨로 모였다.';
  },
  choices: (g) => {
    const v = V(g);
    if (!(v.freed?.branded || v.fugitive?.branded) || v.slave || !free(g)) return [];
    if (lawHere(g).own) return [v.freed?.papers ? { label: '해방 증서를 내민다', key: 'papers' } : null, { label: '사내를 밀치고 달아난다', key: 'run' }, canSpend(g, 15) ? { label: '은화로 입을 막는다', key: 'pay' } : null].filter(Boolean);
    return [{ label: '소매를 내리고 자리를 뜬다', key: 'hide' }, { label: '소매를 걷어 올린 채 똑바로 선다', key: 'stand' }];
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    if (key === 'papers') { stress(g, 4); return '증서를 펼쳤다. 사내는 오래 들여다보더니 침을 뱉고 갔다. 증서를 다시 품에 넣었다. 그 종이 한 장이 내 목숨값이다.'; }
    if (key === 'pay') { spend(g, 15); return '은화를 쥐여 주자 사내는 아무것도 못 본 사람이 되었다.'; }
    if (key === 'run') {
      if (check(rng, g.player.stats.agi * 0.6, 35)) { if (v.fugitive) v.fugitive.heat = clamp(v.fugitive.heat + 10, 0, 100); return '사내를 밀치고 골목으로 뛰었다. 뒤에서 "도망 노예다!" 소리가 났다. 이 고장에는 다시 오지 않을 것이다.'; }
      if (v.fugitive || !v.freed?.papers) { v.fugitive = null; enslave(g, rng, { how: 'recaptured', place: Object.keys(MARKETS).includes(here(g)) ? here(g) : 'saltmare' }); if (v.slave) v.slave.branded = true; return '세 걸음 만에 붙잡혔다. 증서 없는 낙인은 주인 없는 물건이라는 뜻이다. 다시 사슬이 채워졌다.'; }
      return '붙잡혔지만 경비대가 증서를 확인하고 풀어 주었다. 사내는 사과하지 않았다.';
    }
    if (key === 'stand') { deed(g, 'brave', 2, '노예 낙인을 숨기지 않더라'); stress(g, -3); return '소매를 내리지 않았다. 한참 뒤 늙은 수인 하나가 다가와 제 소매를 걷었다. 같은 낙인이었다. 둘은 아무 말 없이 고개를 끄덕였다.'; }
    stress(g, 6);
    return '소매를 내리고 장터를 빠져나왔다. 여름에도 긴소매를 입는다. 그게 습관이 된 지 오래다.';
  },
});

/* ---------- 거꾸로: 노예 시장 ---------- */
const LOT_RACES = ['human', 'human', 'beast', 'beast', 'elf', 'half_elf'];
ACTIONS.push({
  id: 'bondage_market', name: '노예 시장에 가 본다', icon: 'coin',
  desc: '사람이 물건으로 팔리는 곳. 사서 부릴 수도, 사서 풀어 줄 수도, 그냥 지켜볼 수도 있다.',
  available: (g) => free(g) && playerAge(g) >= 16 && !!MARKETS[here(g)] && !sceneQueued(g, 'bondage_market'),
  run(g, rng) {
    const lots = [];
    for (let i = 0; i < 3; i++) {
      let race = rng.pick(LOT_RACES);
      if (here(g) === 'solaris' && race === 'human') race = 'beast';
      lots.push({ race, sex: rng.chance(0.5) ? 'm' : 'f', age: rng.int(9, 40), price: 30 + rng.int(0, 9) * 8 });
    }
    queueScene(g, 'bondage_market', { lots });
    return `${MARKETS[here(g)]}. 사람들이 줄지어 단 위에 올랐다.`;
  },
});
const lotWord = (l) => `${l.age}살 ${raceName(l.race)} ${l.age < 15 ? (l.sex === 'm' ? '사내아이' : '계집아이') : l.sex === 'm' ? '사내' : '여인'}`;
defineScene('bondage_market', {
  title: () => '노예 시장',
  text: (g, s) => `경매꾼이 막대기로 단 위를 두드린다. ${s.lots.map((l) => `${lotWord(l)}, 은화 ${l.price}닢`).join('. ')}. 사는 사람들은 이를 들여다보고 팔뚝을 주물러 본다. 팔리는 사람들은 아무도 보지 않는다.`,
  choices: (g, s) => {
    if (!free(g) || !MARKETS[here(g)]) return [];
    const out = [];
    s.lots.forEach((l, i) => { if (canSpend(g, l.price) && V(g).owned.length < 6) out.push({ label: `${lotWord(l)}${jo(lotWord(l), '을/를')} 사서 부린다 (은화 ${l.price}닢)`, key: `buy:${i}` }); });
    const cheap = s.lots.map((l, i) => [l, i]).sort((a, b) => a[0].price - b[0].price)[0];
    if (cheap && canSpend(g, cheap[0].price)) out.push({ label: `${lotWord(cheap[0])}${jo(lotWord(cheap[0]), '을/를')} 사서 그 자리에서 풀어 준다`, key: `free:${cheap[1]}` });
    out.push({ label: '그냥 지켜본다', key: 'watch' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'watch') { stress(g, 4); return '끝까지 보았다. 마지막에 팔린 아이는 울지 않았다. 우는 걸 잊은 얼굴이었다.'; }
    const [k, i] = key.split(':');
    const l = s.lots[Number(i)];
    if (!l || !spend(g, l.price)) return '값이 모자랐다.';
    const p = makePerson(rng, { sex: l.sex, ageMonths: l.age * 12 + rng.int(0, 11), job: l.age < 15 ? 'child' : 'laborer' });
    if (l.race !== 'human' && RACES[l.race]) setRace(p, l.race, rng, { rename: true });
    p.place = here(g); p.known = true; p.history.push({ y: g.date.year, m: g.date.month, text: `${placeName(here(g))} 노예 시장에서 팔렸다.` });
    g.people.push(rel(p));
    const v = V(g);
    if (k === 'free') {
      p.affection = 40; p.freedBy = me(g).id;
      remember(g, p, '노예 시장에서 사서 풀어 주었다', 3, { tag: 'bondage' });
      v.helped += 1;
      deed(g, 'kind', 3, '노예를 사서 풀어 주었다더라');
      log(g, `${placeName(here(g))} 노예 시장에서 ${J(p.name, '을/를')} 사서 풀어 주었다.`);
      return `증서를 받자마자 찢었다. ${J(p.name, '은/는')} 무슨 일인지 몰라 한참 서 있었다. "가도 돼." ${J(p.name, '은/는')} 세 걸음 가다 돌아보고, 다섯 걸음 가다 또 돌아보았다. 그리고 뛰었다.`;
    }
    p.affection = -10; p.slaveOf = me(g).id;
    v.owned.push({ pid: p.id, bought: mi(g), price: l.price, loyalty: 10 });
    deed(g, 'kind', -2, null);
    log(g, `${placeName(here(g))}에서 ${J(p.name, '을/를')} 샀다.`);
    if (!ownLegal(lawHere(g), p)) reportCrime(g, 'slaving', here(g), { mult: 0.3 });
    return `${J(p.name, '은/는')} 내 뒤를 세 걸음 떨어져 따라왔다. 시키면 하고, 시키지 않으면 서 있었다. 이름을 물었더니 한참 만에 대답했다. ${p.name}.`;
  },
});
ACTIONS.push({
  id: 'bondage_drive', name: '노예를 부려 먹는다', icon: 'coin',
  desc: '데리고 있는 사람들을 밤낮으로 부린다. 은화가 들어오지만, 그들의 눈빛이 바뀐다.',
  available: (g) => free(g) && ownedLive(g).length > 0,
  run(g) {
    const os = ownedLive(g);
    const n = os.length * 5;
    g.player.money += n;
    for (const o of os) o.loyalty = clamp(o.loyalty - 8, 0, 100);
    deed(g, 'kind', -2, null);
    return `해 뜨기 전부터 횃불을 켜고 일을 시켰다. 은화 ${n}닢이 들어왔다. 밤에 문간을 지나다 보니 ${byId(g, os[0].pid).name}의 눈이 어둠 속에서 나를 보고 있었다.`;
  },
});
ACTIONS.push({
  id: 'bondage_manumit', name: '데리고 있는 사람을 풀어 준다', icon: 'heart',
  desc: '증서를 찢고 사람으로 돌려보낸다.',
  available: (g) => free(g) && ownedLive(g).length > 0,
  run(g) {
    const v = V(g);
    const o = ownedLive(g).sort((a, b) => a.bought - b.bought)[0];
    const p = byId(g, o.pid);
    v.owned = v.owned.filter((x) => x !== o);
    delete p.slaveOf; p.freedBy = me(g).id;
    p.affection = clamp((p.affection ?? 0) + 25 + o.loyalty / 4, -100, 100);
    remember(g, p, '증서를 찢고 풀어 주었다', 3, { tag: 'bondage' });
    v.helped += 1;
    deed(g, 'kind', 3, '부리던 노예를 풀어 주었다더라');
    log(g, `${J(p.name, '을/를')} 풀어 주었다.`);
    return `${p.name} 앞에서 증서를 찢었다. ${o.loyalty >= 40 ? `${J(p.name, '은/는')} 떠나지 않겠다고 했다. 이제 품삯을 받고 일한다. 같은 일인데 얼굴이 다르다.` : `${J(p.name, '은/는')} 아무 말 없이 짐을 쌌다. 문을 나서며 딱 한 번 돌아보았다. 고맙다는 얼굴은 아니었다. 당연하다는 얼굴이었다.`}`;
  },
});
const OWNED_EV = {
  beg: (g, p) => `${J(p.name, '이/가')} 밤늦게 내 방 문 앞에 무릎을 꿇었다. "고향에 어머니가 있어요. 한 번만, 한 번만 보내 주세요."`,
  flee: (g, p) => `아침에 보니 ${p.name}의 자리가 비어 있다. 쇠고리가 갈려 끊어져 있다. 해안 쪽 길에 맨발 자국이 남았다.`,
  sick: (g, p) => `${J(p.name, '이/가')} 열에 들떠 일어나지 못한다. 약초사를 부르면 은화 여덟 닢이 든다.`,
  knife: (g, p) => `한밤중에 눈을 떴다. 머리맡에 ${J(p.name, '이/가')} 서 있다. 손에 부엌칼이 들려 있다.`,
};
defineScene('bondage_owned', {
  title: () => '데리고 있는 사람',
  text: (g, s) => OWNED_EV[s.ev](g, byId(g, s.pid) ?? { name: '그 사람' }),
  choices: (g, s) => {
    const p = byId(g, s.pid);
    if (!alive(p) || !V(g).owned.some((o) => o.pid === p.id) || !free(g)) return [];
    if (s.ev === 'beg') return [{ label: '증서를 찢고 보내 준다', key: 'free' }, { label: '돌아오라는 약속을 받고 보낸다', key: 'leave' }, { label: '문을 닫는다', key: 'no' }];
    if (s.ev === 'flee') return [{ label: '사냥개를 풀어 쫓는다', key: 'hunt' }, { label: '내버려 둔다', key: 'let' }];
    if (s.ev === 'sick') return [canSpend(g, 8) ? { label: '약초사를 부른다', key: 'heal' } : null, { label: '알아서 낫기를 기다린다', key: 'wait' }].filter(Boolean);
    return [{ label: '손목을 붙잡는다', key: 'grab' }, { label: '"풀어 주마"라고 말한다', key: 'promise' }];
  },
  resolve(g, rng, s, key) {
    const v = V(g), p = byId(g, s.pid), o = v.owned.find((x) => x.pid === s.pid);
    if (!alive(p) || !o) return '그 사람은 이미 없었다.';
    const drop = () => { v.owned = v.owned.filter((x) => x !== o); delete p.slaveOf; };
    if (key === 'free' || key === 'promise') {
      drop(); p.freedBy = me(g).id; v.helped += 1; p.affection = clamp((p.affection ?? 0) + 30, -100, 100);
      remember(g, p, '풀어 주었다', 3, { tag: 'bondage' }); deed(g, 'kind', 3, null);
      return key === 'promise' ? `"풀어 주마." 칼끝이 떨렸다. 한참 뒤 칼이 바닥에 떨어졌다. 다음 날 증서를 찢었다. ${J(p.name, '은/는')} 그날 처음으로 내 눈을 보았다.` : `증서를 찢어 손에 쥐여 주었다. ${J(p.name, '은/는')} 이마를 바닥에 대고 한참 일어나지 않았다.`;
    }
    if (key === 'leave') {
      if (rng.chance(0.5)) { o.loyalty = clamp(o.loyalty + 30, 0, 100); return `석 달 뒤 ${J(p.name, '이/가')} 돌아왔다. 어머니 무덤에 다녀왔다고 했다. 그 뒤로 시키지 않은 일도 한다.`; }
      drop(); p.place = rng.pick(['fur', 'silverleaf', 'harfen']); return `${J(p.name, '은/는')} 돌아오지 않았다. 약속을 믿은 건 나였다. 이상하게 화가 나지 않았다.`;
    }
    if (key === 'no') { o.loyalty = Math.max(0, o.loyalty - 15); p.affection = clamp((p.affection ?? 0) - 15, -100, 100); return '문을 닫았다. 문 너머에서 오래 흐느끼는 소리가 났다. 다음 날 아침 그 사람은 아무 일 없다는 듯 물을 길었다.'; }
    if (key === 'hunt') {
      if (check(rng, g.player.stats.sen * 0.5 + g.player.stats.agi * 0.3, 40)) { o.loyalty = 0; p.affection = clamp((p.affection ?? 0) - 30, -100, 100); addGrudge(g, p, 30, '도망치다 붙잡혀 왔다'); deed(g, 'kind', -3, null); return `해안 갈대밭에서 개들이 ${J(p.name, '을/를')} 찾아냈다. 끌려오는 내내 그 사람은 소리 한 번 내지 않았다.`; }
      drop(); p.place = 'fur'; return '개들이 냄새를 놓쳤다. 바닷물에 발을 담그고 갔다는 뜻이다. 영리한 사람이었다.';
    }
    if (key === 'let') { drop(); p.place = rng.pick(['fur', 'silverleaf', 'harfen']); return '쫓지 않았다. 빈 자리를 오래 보았다. 은화 몇십 닢이 걸어 나간 자리다. 그렇게만 생각하기로 했다.'; }
    if (key === 'heal') { spend(g, 8); o.loyalty = clamp(o.loyalty + 15, 0, 100); return `약초사가 다녀가고 사흘 만에 열이 내렸다. ${J(p.name, '은/는')} 일어나자마자 물동이를 들었다. 고맙다는 말 대신이었다.`; }
    if (key === 'wait') { if (rng.chance(0.35)) { kill(g, p, '열병'); drop(); return `닷새째 아침, ${J(p.name, '은/는')} 일어나지 않았다. 묻을 자리를 찾느라 반나절이 걸렸다.`; } return '열흘을 앓더니 일어났다. 살이 반쪽이 되었다. 일은 반밖에 못 한다.'; }
    // grab
    if (check(rng, g.player.stats.sen * 0.5 + g.player.stats.str * 0.4, 40)) { o.loyalty = 0; addGrudge(g, p, 40, '칼을 들었다가 붙잡혔다'); return `손목을 비틀었다. 칼이 떨어졌다. ${J(p.name, '은/는')} 울지도 빌지도 않았다. 그 눈을 보며 생각했다. 이 사람을 계속 데리고 잘 수 있을까.`; }
    g.player.injuries.push({ name: '옆구리의 칼자국', months: 4 }); drop(); p.place = 'fur'; stress(g, 15);
    return `칼이 옆구리를 스쳤다. 소리를 지르는 사이 ${J(p.name, '은/는')} 창문으로 뛰어내렸다. 피가 이불을 적셨다. 쫓을 힘이 없었다.`;
  },
});
ACTIONS.push({
  id: 'bondage_rescue', name: '사슬을 끊는다', icon: 'shield',
  desc: '노예 시장이 있는 고장에서 밤에 우리를 연다. 붙잡히면 노예 사냥꾼의 원수가 된다.',
  available: (g) => free(g) && playerAge(g) >= 16 && !!MARKETS[here(g)],
  run(g, rng) {
    const v = V(g);
    tired(g, 14);
    if (check(rng, g.player.stats.agi * 0.45 + g.player.stats.sen * 0.3 + g.player.stats.str * 0.2, 45)) {
      const n = rng.int(3, 8);
      v.helped += n;
      deed(g, 'kind', 3, null); deed(g, 'brave', 2, null);
      if (v.helped >= 10 && !v.legend) { v.legend = true; chron(g, `${placeName(here(g))}의 노예 우리가 밤마다 열린다. 사슬 끊는 사람이 있다는 소문이 돌다.`, 50); }
      log(g, `${placeName(here(g))}에서 ${n}명의 사슬을 끊었다.`);
      return `자물쇠 둘을 부수고 우리 문을 열었다. ${n}명이 어둠 속으로 흩어졌다. 하나가 내 손을 잡고 무언가 말했는데, 알아들을 수 없는 말이었다. 뜻은 알았다.`;
    }
    reportCrime(g, 'resist', here(g), { mult: 0.6 });
    g.player.injuries.push({ name: '노예상 칼잡이의 칼자국', months: 3 });
    return '두 번째 자물쇠에서 들켰다. 칼잡이들이 몰려왔다. 지붕을 타고 겨우 빠져나왔다. 우리 안의 눈들이 나를 보고 있었다.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  const r = ownRng(g, 7);
  const now = mi(g);
  const gate = () => !L(g).queue.some((x) => /^bondage_/.test(x.kind)) && L(g).queue.length <= 2 && now - v.sceneAt >= 4;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data, { first: true }); };
  // 1) 노예의 달
  const s = v.slave;
  if (s) {
    if (L(g).travel || here(g) !== s.place) carry(g, s.place);
    s.trust = clamp(s.trust + 0.5, 0, 100);
    if (s.trust >= 40 && r.chance(0.3)) s.savings += 1;
    stress(g, 2);
    if (isJailed(g) || !gate()) return;
    if (s.trust >= 85 && now - s.since >= 36 && r.chance(0.04)) { const m = s.master.split(',')[0]; setFree(g, 'manumit'); v.sceneAt = now; deed(g, 'loyal', 2, null); g.news.unshift({ text: `${J(m, '이/가')} 죽기 전에 유언으로 나를 풀어 주었다. 증서에 내 이름이 적혀 있다.`, rel: 100 }); return; }
    const fam = (g.player.familyIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && !p.slaveOf);
    if (fam.length && (g.player.familyMoney ?? 0) >= s.ransom && now - s.since >= 6 && r.chance(0.06)) { const f = r.pick(fam); return fire('bondage_family', { pid: f.id, from: f.name, amount: s.ransom }); }
    if (r.chance(0.14)) {
      const evs = ['cruel', 'cruel', 'kind', 'revolt', 'sold'];
      if (s.trust >= 50) evs.push('offer', 'offer');
      return fire('bondage_master', { ev: r.pick(evs) });
    }
    return;
  }
  // 2) 달아난 노예
  const f = v.fugitive;
  if (f) {
    const lw = lawHere(g);
    f.heat = Math.max(0, f.heat - (lw.own === false ? 2.5 : 1));
    if (f.heat <= 0) { v.fugitive = null; log(g, '이제 아무도 나를 쫓지 않는다.'); }
    else if (free(g) && gate() && r.chance(f.heat / (lw.own === false ? 1600 : 500))) return fire('bondage_hunters', {});
  }
  // 3) 낙인
  const brandedFree = (v.freed?.branded || v.fugitive?.branded) && free(g);
  if (brandedFree && gate() && r.chance(0.012)) return fire('bondage_brand', {});
  // 4) 데리고 있는 사람
  const os = ownedLive(g);
  v.owned = v.owned.filter((o) => alive(byId(g, o.pid)));
  if (os.length && free(g)) {
    for (const o of os) { const p = byId(g, o.pid); p.place = here(g); o.loyalty = clamp(o.loyalty + 0.6, 0, 100); }
    g.player.money += os.length * 2;
    const lw = lawHere(g);
    const illegal = os.filter((o) => !ownLegal(lw, byId(g, o.pid)));
    if (illegal.length && r.chance(0.02 * illegal.length * (lw.crime ?? 1))) {
      reportCrime(g, 'slaving', here(g), { mult: lw.crime ?? 1 });
      if (lw.own === false && realmOf(here(g)) !== 'free') {
        const o = illegal[0], p = byId(g, o.pid);
        v.owned = v.owned.filter((x) => x !== o); delete p.slaveOf;
        g.news.unshift({ text: `${J(p.name, '이/가')} 경비대에 끌려갔다가 풀려났다. 이 땅에서는 사람을 부릴 수 없다. 내 이름이 장부에 올랐다.`, rel: 100 });
        deed(g, 'honest', -3, '이 땅에서 노예를 부렸다더라');
      }
    }
    if (gate() && r.chance(0.05)) {
      const o = r.pick(os);
      const evs = o.loyalty < 8 ? ['knife', 'flee', 'beg'] : o.loyalty < 30 ? ['flee', 'beg', 'sick'] : ['beg', 'sick'];
      return fire('bondage_owned', { pid: o.pid, ev: r.pick(evs) });
    }
  }
  // 5) 붙잡히는 길
  // 붙잡히는 일은 다른 장면이 밀려 있어도 기다려 주지 않는다
  if (!free(g) || playerAge(g) < 12 || L(g).queue.some((x) => /^bondage_/.test(x.kind)) || now - v.sceneAt < 4) return;
  const b = g.poor?.bond;
  if (b && ['sea', 'free'].includes(realmOf(here(g))) && here(g) === b.place && r.chance(0.025)) return fire('bondage_debtsold', {});
  const realm = realmOf(here(g));
  const nonhuman = playerRace(g) !== 'human';
  const p = realm === 'sea' ? 0.01 : here(g) === 'portel' ? 0.003 : realm === 'holy' && nonhuman ? 0.004 : 0;
  if (p && r.chance(p * (g.player.stats.str >= 50 ? 0.5 : 1))) return fire('bondage_taken', { where: here(g) === 'portel' ? 'night' : 'road', nonhuman: realm === 'holy' && nonhuman });
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = V(g);
  const by = old?.name ?? '선대';
  if (v.slave) { log(g, `${J(by, '은/는')} ${placeName(v.slave.place)}에서 노예로 죽었다. 무덤도 없다.`); chron(g, `${by}, 사슬을 벗지 못하고 ${placeName(v.slave.place)}에서 죽다.`, 50); }
  if (v.freed) log(g, `${J(by, '은/는')} 한때 노예였다.${v.freed.oldName ? ` 본래 이름은 ${v.freed.oldName}.` : ''}`);
  v.slave = null; v.fugitive = null; v.freed = null; v.sceneAt = 0;
  // 부리던 사람은 집안의 재산으로 넘어온다. 주인이 바뀌면 마음도 흔들린다.
  for (const o of v.owned) o.loyalty = Math.round(o.loyalty * 0.6);
  if (L(g).home === 'barracks' && !L(g).job) L(g).home = 'street';
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
