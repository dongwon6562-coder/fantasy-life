// 광산에서 사는 일: 광부로 갱도에 들어가기(일자리 '광부'), 광맥 찾기와 광업권, 내 광산 꾸리기,
// 드워프에게 갱도 다루는 법 배우기, 무너진 갱도, 파업(광부 쪽에서든 주인 쪽에서든), 소유권 다툼, 너무 깊이 파서 깨운 것.
import { ACTIONS } from '../actions.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainStat } from '../game.js';
import { registerJob, doWork, WORK } from '../jobs.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, spend, canSpend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { playerPower } from '../adventure/combat.js';
import { deed } from '../repute/index.js';
import { MS, ORES, DEEP, PROSPECT, LANDLORD, OWNER_WORD, clamp, mi, placeName, mlog, sitesNear, myMines, myMineHere, oreValue, outputOf } from './state.js';
import { mineRng } from './world.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const st = (g, k) => g.player.stats[k] ?? 0;
const lore = (g) => MS(g).me.lore ?? 0;
const site = (g, id) => MS(g).sites[id] ?? null;
const workSites = (g, pl) => sitesNear(g, pl).filter((id) => site(g, id).owner !== 'me');
const mineValue = (g, s) => Math.round(80 + s.vein * 3 + s.depth * 20 + s.miners * 6);

/* ---------- 광부 일 ---------- */
const MINE_PLACES = ['graubel', 'verden', 'gruental', 'eisen', 'gorge', 'hammer'];
registerJob('miner', {
  name: '광부', places: MINE_PLACES, skill: null, stat: 'str', stat2: 'wil', wage: [3, 4, 5, 7], risk: 0.02,
  lines: ['횃불 하나에 기대어 하루 종일 막장 벽을 쪼았다. 올라오니 해가 져 있었다.', '광석 수레를 밀어 갱도 입구까지 스무 번을 오갔다. 손바닥이 갈라졌다.', '갱도 천장에서 돌 부스러기가 떨어졌다. 모두 숨을 죽이고 기다렸다. 다시 곡괭이 소리가 이어졌다.', '물이 차오르는 아랫갱에서 물을 퍼 올렸다. 무릎까지 얼음물이었다.', '늙은 광부가 버팀목을 두드려 소리로 썩은 것을 골라냈다. 그 소리를 외우려고 애썼다.'],
  work(g, rng) {
    const life = L(g), ids = workSites(g, here(g));
    if (!ids.length) { life.job = null; return '이 고장에는 내가 들어갈 갱도가 없었다.'; }
    if (!ids.includes(life.job.site)) life.job.site = ids[0];
    const s = site(g, life.job.site);
    if (s.awoke) { stress(g, 3); return `${s.name}의 갱도는 막혀 있다. ${DEEP[s.awoke.kind].name} 이야기 때문에 아무도 들어가지 않는다. 오늘 품삯은 없다.`; }
    if (s.strike) { if (!sceneQueued(g, 'mine_picket')) queueScene(g, 'mine_picket', { site: life.job.site }, { first: true }); return `${s.name} 입구에 광부들이 팔짱을 끼고 서 있다. 파업이다.`; }
    if (s.closed > 0) { tired(g, 6); return `${s.name}은 무너진 갱도를 치우느라 닫혀 있다. 하루 종일 돌을 날랐다. 품삯은 반만 나왔다.`; }
    const M = MS(g);
    M.me.shifts += 1; M.me.lore = clamp(M.me.lore + 0.4, 0, 100);
    return doWork(g, rng, WORK.miner, { tire: 18, wageMul: s.wageMul * (s.ore === 'silver' || s.ore === 'manastone' ? 1.15 : 1) });
  },
});

/* ---------- 광맥 찾기 ---------- */
ACTIONS.push({
  id: 'mine_prospect', name: '광맥을 찾는다', icon: 'wander',
  desc: '산비탈과 계곡을 돌며 돌을 깨 보고 물빛을 본다. 광맥을 찾으면 광업권을 사거나, 자리를 팔거나, 몰래 팔 수 있다.',
  available: (g) => free(g) && !!PROSPECT[here(g)] && !sceneQueued(g, 'mine_claim'),
  run(g, rng) {
    const S = MS(g), pl = here(g);
    tired(g, 16);
    gainStat(g, 'sen', 0.3);
    S.me.lore = clamp(S.me.lore + 0.3, 0, 100);
    const p = clamp(0.08 + st(g, 'sen') / 500 + lore(g) / 300, 0.08, 0.4);
    if (!rng.chance(p)) return rng.pick(['하루 종일 돌을 깼다. 반짝이는 것은 운모뿐이었다.', '개울 바닥의 붉은 물빛을 따라 올라갔다. 녹슨 쇠 덫 하나가 있었다.', '늙은 양치기가 "저 바위 밑에 은이 있다"고 했다. 저 바위 밑에는 뱀이 있었다.', '해 질 녘까지 비탈을 헤맸다. 발목만 시큰거린다.']);
    const ore = rng.pick(PROSPECT[pl]), size = rng.int(30, 85);
    const f = { id: S.seq++, place: pl, ore, size, at: mi(g) };
    S.finds.push(f); if (S.finds.length > 4) S.finds.shift();
    S.me.finds += 1;
    queueScene(g, 'mine_claim', { find: f.id }, { first: true });
    return `비탈 아래 무너진 흙 속에서 ${ORES[ore].name} 줄기를 보았다. ${size >= 65 ? '손가락 굵기가 아니다. 팔뚝만 하다.' : '굵지는 않지만 길게 이어진다.'} 돌 하나를 품에 넣고 내려왔다.`;
  },
});
const findOf = (g, id) => MS(g).finds.find((f) => f.id === id) ?? null;
const rightsCost = (f) => Math.round(20 + f.size * 0.8 + (f.ore === 'manastone' ? 30 : f.ore === 'silver' ? 20 : 0));
const tipPrice = (f) => Math.round(8 + f.size * 0.4 + (f.ore === 'manastone' ? 15 : f.ore === 'silver' ? 10 : 0));
function openMine(g, f, legal) {
  const S = MS(g), id = `my${S.seq++}`;
  S.sites[id] = { name: `${legal ? '' : '숨은 '}${placeName(f.place)} ${{ iron: '철광', copper: '구리 광산', silver: '은광', manastone: '마석 광산' }[f.ore]}`, near: f.place, ore: f.ore, owner: 'me', ownerName: g.player.name, depth: 1, vein: f.size, safety: 50, unrest: 10, wageMul: 1, strike: null, closed: 0, stir: 0, awoke: null, dead: 0, collapses: 0, miners: 0, wage: 3, legal, since: mi(g) };
  S.finds = S.finds.filter((x) => x !== f);
  S.me.owned += 1;
  return id;
}
defineScene('mine_claim', {
  title: () => '찾은 광맥',
  text: (g, s) => {
    const f = findOf(g, s.find);
    if (!f) return '품에 넣어 온 돌을 꺼내 보았다.';
    return `${placeName(f.place)} 비탈의 ${ORES[f.ore].name} 줄기. 이 땅의 주인은 ${LANDLORD[f.place] ?? '알 수 없다'}. 광업권을 사면 내 광산이 된다. 자리만 알려 주고 값을 받을 수도 있다. 아무에게도 말하지 않고 몰래 팔 수도 있다. 몰래 판 광산은 언젠가 들통난다.`;
  },
  choices: (g, s) => {
    const f = findOf(g, s.find);
    if (!f || !free(g) || here(g) !== f.place) return [];
    const cost = rightsCost(f);
    return [
      { label: '아무에게도 말하지 않고 덮어 둔다', key: 'keep' },
      ...(canSpend(g, cost) ? [{ label: `광업권을 산다 (은화 ${cost}닢)`, key: 'buy' }] : []),
      { label: `자리를 광산 주인들에게 판다 (은화 ${tipPrice(f)}닢쯤)`, key: 'tip' },
      { label: '몰래 판다 (광업권 없이)', key: 'secret' },
    ];
  },
  resolve(g, rng, s, key) {
    const f = findOf(g, s.find);
    if (!f || here(g) !== f.place) return '그 비탈을 다시 찾지 못했다.';
    if (key === 'keep') return '돌을 상자에 넣었다. 언젠가 다시 올 것이다. 그때까지 아무도 찾지 않기를.';
    if (key === 'tip') {
      const got = tipPrice(f);
      g.player.money += got;
      MS(g).finds = MS(g).finds.filter((x) => x !== f);
      mlog(g, `${placeName(f.place)}의 ${ORES[f.ore].name} 자리를 은화 ${got}닢에 팔았다.`);
      return `광산 주인들의 사람이 돌을 들여다보고 은화 ${got}닢을 세어 주었다. 석 달 뒤 그 비탈에 천막이 섰다. 내 이름은 어디에도 없었다.`;
    }
    if (key === 'buy') {
      const cost = rightsCost(f);
      if (!spend(g, cost)) return '광업권 값이 모자랐다.';
      const id = openMine(g, f, true);
      chron(g, `${g.player.name}, ${placeName(f.place)}에 광산을 열다.`, 30);
      mlog(g, `${placeName(f.place)}에 광산을 열었다 (${MS(g).sites[id].name}).`);
      return `${LANDLORD[f.place] ?? '땅 주인'}의 서기가 양피지에 도장을 찍었다. 캐낸 것의 열에 하나 반은 땅 주인 몫이다. 이제 광부를 들여야 한다. 내 광산을 돌보려면 이 고장에서 "내 광산을 돌본다".`;
    }
    const id = openMine(g, f, false);
    mlog(g, `${placeName(f.place)}에 몰래 광산을 열었다.`);
    return `밤에만 일할 사람 셋을 구했다. 입구는 덤불로 가렸다. 몫은 다 내 것이다. 들키기 전까지는. (${MS(g).sites[id].name})`;
  },
});

/* ---------- 내 광산 돌보기 ---------- */
ACTIONS.push({
  id: 'mine_manage', name: '내 광산을 돌본다', icon: 'coin',
  desc: '이 고장의 내 광산에 내려가 본다. 광부를 들이고, 버팀목을 대고, 품삯을 정하고, 더 깊이 팔지 정한다.',
  available: (g) => free(g) && !!myMineHere(g, here(g)) && !sceneQueued(g, 'mine_manage'),
  run(g) { const id = myMineHere(g, here(g)); queueScene(g, 'mine_manage', { site: id }, { first: true }); return `${site(g, id).name} 입구의 감독 막사에 들렀다.`; },
});
defineScene('mine_manage', {
  title: (g, s) => site(g, s.site)?.name ?? '내 광산',
  text: (g, s) => {
    const m = site(g, s.site);
    if (!m) return '광산은 이제 내 것이 아니다.';
    const out = outputOf(m, m.miners);
    return `${m.depth}층 갱도, 광부 ${m.miners}명, 한 사람 달 품삯 은화 ${m.wage}닢. ${m.vein >= 70 ? '광맥이 굵다.' : m.vein >= 40 ? '캘 만하다.' : m.vein >= 15 ? '광맥이 가늘어졌다.' : '거의 다 캤다.'} ${m.safety >= 60 ? '버팀목은 튼튼하다.' : m.safety >= 35 ? '버팀목이 낡아 간다.' : '버팀목이 썩었다. 언제 무너져도 이상하지 않다.'} 광부들은 ${m.unrest >= 60 ? '감독 막사를 노려본다' : m.unrest >= 35 ? '투덜거린다' : '조용하다'}.${m.strike ? ' 지금은 파업 중이다.' : ''}${m.awoke ? ` 깊은 곳에서 ${DEEP[m.awoke.kind].name}. 아무도 들어가지 않는다.` : ''} 지난달 몫: 은화 ${MS(g).me.lastIncome}닢.${out > 0 ? ` 한 달에 광석 ${Math.round(out)}짐쯤, 짐당 은화 ${oreValue(g, m.ore)}닢.` : ''}${m.legal ? '' : ' 광업권 없이 파는 굴이다.'}`;
  },
  choices: (g, s) => {
    const m = site(g, s.site);
    if (!m || m.owner !== 'me' || !free(g) || here(g) !== m.near) return [];
    return [
      { label: '둘러보기만 한다', key: 'look' },
      ...(m.miners < 24 && canSpend(g, 15) ? [{ label: '광부 넷을 더 들인다 (은화 15닢)', key: 'hire' }] : []),
      ...(m.miners >= 4 ? [{ label: '광부 넷을 내보낸다', key: 'fire' }] : []),
      ...(canSpend(g, 25) && m.safety < 95 ? [{ label: '버팀목을 새로 댄다 (은화 25닢)', key: 'timber' }] : []),
      { label: '품삯을 한 닢 올린다', key: 'raise' },
      ...(m.wage > 1 ? [{ label: '품삯을 한 닢 깎는다', key: 'cut' }] : []),
      ...(!m.awoke && m.depth < 9 && canSpend(g, 40) ? [{ label: `한 층 더 깊이 판다 (은화 40닢, ${m.depth + 1}층)`, key: 'deeper' }] : []),
      { label: `광산을 판다 (은화 ${mineValue(g, m)}닢쯤)`, key: 'sell' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = MS(g), m = site(g, s.site);
    if (!m || m.owner !== 'me') return '광산은 이제 내 것이 아니었다.';
    if (key === 'look') { S.me.lore = clamp(S.me.lore + 0.3, 0, 100); return rng.pick(['갱도 끝까지 내려가 막장 벽을 손으로 짚어 보았다. 따뜻했다.', '광부들과 같은 냄비의 죽을 먹었다. 그들은 내가 무엇을 묻는지보다 무엇을 묻지 않는지를 더 오래 기억할 것이다.', '감독의 장부를 넘겼다. 숫자는 맞았다. 맞는다는 것이 오히려 이상했다.']); }
    if (key === 'hire') { if (!spend(g, 15)) return '광부를 들일 돈이 모자랐다.'; m.miners += 4; return '갱도 입구에 광부 넷이 줄을 섰다. 다른 광산에서 쫓겨난 사람들, 빚을 진 농부들, 말이 없는 사내 하나.'; }
    if (key === 'fire') { m.miners -= 4; m.unrest = clamp(m.unrest + 8, 0, 100); return '광부 넷을 내보냈다. 남은 사람들이 그들의 뒷모습을 오래 보았다.'; }
    if (key === 'timber') { if (!spend(g, 25)) return '버팀목 값이 모자랐다.'; m.safety = clamp(m.safety + 25, 0, 100); m.unrest = clamp(m.unrest - 5, 0, 100); return '참나무 버팀목 마흔 개를 새로 댔다. 늙은 광부가 기둥을 두드려 보고 고개를 끄덕였다.'; }
    if (key === 'raise') { m.wage += 1; m.unrest = clamp(m.unrest - 12, 0, 100); deed(g, 'generous', 3, `${J(g.player.name, '이/가')} 광부들 품삯을 올려 주었다더라`, m.near); return '품삯을 한 닢 올렸다. 그날 저녁 광부 막사에서 노랫소리가 났다.'; }
    if (key === 'cut') { m.wage -= 1; m.unrest = clamp(m.unrest + 15, 0, 100); deed(g, 'generous', -3, `${J(g.player.name, '이/가')} 광부들 품삯을 깎았다더라`, m.near); return '품삯을 한 닢 깎았다. 감독이 그 말을 전하러 갱도로 내려갔다. 오래 걸렸다.'; }
    if (key === 'deeper') {
      if (!spend(g, 40)) return '더 팔 돈이 모자랐다.';
      m.depth += 1; m.vein = clamp(m.vein + 30, 0, 100); m.safety = clamp(m.safety - 8, 0, 100);
      mlog(g, `${m.name}: ${m.depth}층까지 내려갔다.`);
      const warn = m.depth >= 5 ? ' 드워프 광부 하나가 내 얼굴을 보고 말했다. "다섯 층 아래로는 사람이 주인이 아니오."' : '';
      return `새 갱도를 한 층 더 뚫었다. 막장 벽에 새 광맥이 번쩍였다.${warn}`;
    }
    // 판다
    const v = mineValue(g, m);
    g.player.money += v;
    delete S.sites[s.site];
    S.me.sold += 1;
    mlog(g, `${m.name}을 은화 ${v}닢에 팔았다.`);
    chron(g, `${g.player.name}, 광산 ${J(m.name, '을/를')} 팔다.`, 20);
    return `${m.name}의 광업권을 은화 ${v}닢에 넘겼다. 새 주인이 광부들 앞에서 연설을 했다. 광부들은 새 주인의 말보다 품삯이 언제 나오는지를 물었다.`;
  },
});

/* ---------- 드워프에게 배우기 ---------- */
ACTIONS.push({
  id: 'mine_dwarf', name: '드워프 광부에게 배운다', icon: 'book',
  desc: '쇠망치 골이나 구렁목의 드워프 광부에게 갱도 다루는 법을 배운다. 버팀목 소리, 돌의 숨, 어디서 멈출지. 은화 10닢.',
  available: (g) => free(g) && ['hammer', 'gorge'].includes(here(g)) && canSpend(g, 10),
  run(g, rng) {
    const S = MS(g);
    if (!spend(g, 10)) return '배울 값이 모자랐다.';
    tired(g, 10);
    const gain = S.dwarf <= -30 ? 1 : 3 + (st(g, 'int') + st(g, 'wil')) / 80;
    S.me.lore = clamp(S.me.lore + gain, 0, 100);
    S.dwarf = clamp(S.dwarf + 2, -100, 100);
    for (const id of myMines(g)) S.sites[id].safety = clamp(S.sites[id].safety + 3, 0, 100);
    if (S.dwarf <= -30) return '드워프는 내 돈을 받았지만 입을 열지 않았다. 다섯 층 아래를 판 사람에게 가르칠 것은 없다는 얼굴이었다.';
    return rng.pick([
      '늙은 드워프가 버팀목 셋을 차례로 두드렸다. "이건 살았고, 이건 죽었고, 이건 죽어 가오." 세 소리가 다 같게 들렸다. 하루가 다 가서야 하나쯤 구별했다.',
      '"돌도 숨을 쉬오. 숨이 바뀌면 나오시오. 묻지 말고." 드워프는 갱도 안의 바람을 손등으로 재는 법을 보여 주었다.',
      '"사람은 광맥을 따라가오. 드워프는 광맥이 어디서 끝나는지를 먼저 보오." 그날 배운 것은 그 한마디였다. 충분했다.',
    ]);
  },
});

/* ---------- 깊은 곳의 것 ---------- */
ACTIONS.push({
  id: 'mine_deep', name: '깊은 갱도로 내려간다', icon: 'dungeon',
  desc: '너무 깊이 판 갱도에서 깨어난 것을 막으러 내려간다. 내 광산이든 남의 광산이든.',
  available: (g) => free(g) && sitesNear(g, here(g)).some((id) => site(g, id).awoke) && !sceneQueued(g, 'mine_deep'),
  run(g) { const id = sitesNear(g, here(g)).find((x) => site(g, x).awoke); queueScene(g, 'mine_deep', { site: id }, { first: true }); return `${site(g, id).name} 입구에 섰다. 아무도 따라 들어오려 하지 않는다.`; },
});
defineScene('mine_deep', {
  title: (g, s) => `${site(g, s.site)?.name ?? '갱도'}의 맨 아래`,
  text: (g, s) => {
    const m = site(g, s.site);
    if (!m?.awoke) return '갱도는 조용했다.';
    return `${DEEP[m.awoke.kind].name}. ${m.awoke.kind === 'breath' ? '아래 갱도에 들어갔던 사람들은 아직 거기 누워 있다. 숨을 참고 내려가야 한다.' : m.awoke.kind === 'crawlers' ? '사다리 아래 어둠 속에서 손톱이 돌을 긁는 소리가 난다.' : m.awoke.kind === 'hall' ? '열린 돌문 너머에서 망치 소리가 규칙적으로 울린다. 아무도 없는데.' : '레일이 반쯤 먹혀 있다. 쇠를 갉는 소리가 사방에서 들린다.'}`;
  },
  choices: (g, s) => {
    const m = site(g, s.site);
    if (!m?.awoke || !free(g) || here(g) !== m.near) return [];
    return [
      { label: '입구를 막고 물러난다', key: 'leave' },
      ...(canSpend(g, 60) ? [{ label: '드워프 석공들을 불러 갱도를 메운다 (은화 60닢)', key: 'dwarves' }] : []),
      { label: m.awoke.kind === 'hall' ? '돌문을 다시 닫으러 내려간다' : '직접 내려가 끝을 본다', key: 'down' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = MS(g), m = site(g, s.site);
    if (!m?.awoke) return '이미 누군가 갱도를 메웠다.';
    const kind = m.awoke.kind, name = DEEP[kind].name;
    if (key === 'leave') return '입구에 널빤지를 대고 경고문을 붙였다. 글을 읽을 줄 아는 광부는 없다. 그래도 아무도 들어가지 않을 것이다.';
    const sealIt = (text) => { m.awoke = null; m.depth = Math.max(1, m.depth - 1); m.closed = 2; m.stir = 0; S.me.sealed += 1; mlog(g, `${m.name}: ${name}을 막았다.`); return text; };
    if (key === 'dwarves') {
      if (!spend(g, 60)) return '석공들을 부를 돈이 모자랐다.';
      S.dwarf = clamp(S.dwarf + (m.owner === 'me' ? -5 : 5), -100, 100);
      return sealIt(`드워프 석공 열둘이 사흘 밤낮으로 돌을 날라 맨 아래 한 층을 메웠다. 우두머리가 마지막 돌에 문자를 새겼다. "여기서 멈추라." ${m.owner === 'me' ? '그는 내 얼굴을 보지 않았다.' : ''}`);
    }
    tired(g, 30);
    stress(g, 15);
    if (kind === 'hall') {
      if (check(rng, st(g, 'wil') + lore(g) / 2, 45)) { renown(g, 6); deed(g, 'brave', 6, `${J(g.player.name, '이/가')} ${m.name}의 열린 돌문을 다시 닫았다더라`, m.near); return sealIt('망치 소리를 향해 걸었다. 홀 한가운데에서 소리가 멎었다. 아무것도 보이지 않았다. 돌문을 닫고, 드워프 문자를 손가락으로 따라 그렸다. 등 뒤에서 누가 숨을 내쉬는 소리가 났다. 돌아보지 않았다.'); }
      injure(g, '어둠 속에서 넘어져 부러진 팔', 4);
      return '홀에 들어서자 횃불이 꺼졌다. 망치 소리가 바로 귀 옆에서 울렸다. 그 뒤의 일은 기억나지 않는다. 광부들이 입구에서 나를 끌어냈다. 돌문은 아직 열려 있다.';
    }
    if (kind === 'breath') {
      if (check(rng, st(g, 'wil') + st(g, 'str') / 2 + lore(g) / 2, 55)) { S.me.saved += 2; renown(g, 5); deed(g, 'kind', 6, `${J(g.player.name, '이/가')} 회색 숨 속에서 광부들의 주검을 업어 왔다더라`, m.near); return sealIt('젖은 천으로 입을 막고 숨을 참은 채 내려갔다. 쓰러진 광부들을 하나씩 밧줄에 묶어 올려 보냈다. 넷째를 묶을 때 눈앞이 하얘졌다. 위에서 밧줄을 당겨 나를 끌어 올렸다. 그 뒤 갱도 바닥을 회반죽으로 덮었다.'); }
      injure(g, '회색 숨에 상한 폐', 6);
      if (rng.chance(0.15)) L(g).pendingDeath = '갱도의 회색 숨';
      return '세 걸음 만에 다리가 풀렸다. 잠이 쏟아졌다. 누군가 발목을 잡아 끌어 올렸다. 가슴이 오래 아팠다.';
    }
    const foe = kind === 'crawlers' ? 50 : 45;
    if (check(rng, playerPower(g) + lore(g) / 3, foe)) { renown(g, 8); deed(g, 'brave', 8, `${J(g.player.name, '이/가')} ${m.name} 맨 아래로 내려가 ${J(name, '을/를')} 막았다더라`, m.near); chron(g, `${g.player.name}, ${m.name}의 ${J(name, '을/를')} 막다.`, 40); return sealIt(kind === 'crawlers' ? '사다리 끝에서 기다렸다. 올라오는 것마다 쳐서 떨어뜨렸다. 기름 단지를 아래로 던지고 불을 놓았다. 불이 꺼진 뒤 빈 곳의 입구를 돌로 막았다.' : '불붙인 기름을 막장 틈마다 부었다. 껍질 터지는 소리가 한나절 났다. 남은 굴을 돌과 회반죽으로 막았다.'); }
    injure(g, kind === 'crawlers' ? '창백한 것들의 손톱에 찢긴 상처' : '쇠먹이 벌레에 물린 상처', 5);
    if (rng.chance(0.12)) L(g).pendingDeath = '깊은 갱도의 것들';
    return '어둠 속에서 너무 많은 것이 한꺼번에 움직였다. 사다리를 타고 기어올랐다. 다리를 끌며 갱도 입구로 나왔을 때 뒤에서 무엇인가 사다리를 긁고 있었다.';
  },
});

/* ---------- 무너진 갱도 (광부로 일하던 곳) ---------- */
defineScene('mine_collapse', {
  title: () => '무너진 갱도',
  text: (g, s) => `굉음과 함께 흙먼지가 갱도를 채웠다. ${site(g, s.site)?.name ?? '광산'}의 아랫갱이 무너졌다. 무너진 돌 너머에서 두드리는 소리가 들린다. ${s.dead ? '이미 늦은 사람도 있다.' : '아직 다들 살아 있는 것 같다.'}`,
  choices: (g, s) => {
    if (!free(g) || here(g) !== site(g, s.site)?.near) return [];
    return [
      { label: '입구로 달려 나간다', key: 'run' },
      { label: '맨손으로 돌을 치운다', key: 'dig' },
      { label: '버팀목을 받치며 사람들을 이끈다', key: 'lead' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = MS(g);
    if (key === 'run') { stress(g, 10); return '빛을 향해 달렸다. 등 뒤에서 두드리는 소리가 오래 이어졌다. 사흘 뒤 끊겼다. 그 소리가 꿈에 나온다.'; }
    tired(g, 30);
    if (key === 'dig') {
      gainStat(g, 'str', 0.6);
      if (check(rng, st(g, 'str') + st(g, 'wil') / 2, 45)) { S.me.saved += 3; deed(g, 'brave', 5, `${J(g.player.name, '이/가')} 무너진 갱도에서 광부들을 파냈다더라`, here(g)); renown(g, 2); return '손톱이 다 빠지도록 돌을 치웠다. 하루가 지나 구멍 너머로 손 하나가 나왔다. 셋이 기어 나왔다. 그 가운데 하나는 아직 열다섯 살이었다.'; }
      injure(g, '돌에 짓이겨진 손', 3);
      return '밤새 돌을 치웠다. 위에서 돌이 더 떨어졌다. 드워프 구조대가 와서 나를 끌어냈다. 그들이 마저 파냈다.';
    }
    if (check(rng, st(g, 'wil') + st(g, 'sen') / 2 + S.me.lore / 2, 50)) { S.me.saved += 5; S.me.lore = clamp(S.me.lore + 2, 0, 100); renown(g, 4); deed(g, 'brave', 7, `${J(g.player.name, '이/가')} 무너지는 갱도에서 사람들을 이끌어 냈다더라`, here(g)); chron(g, `${g.player.name}, 무너진 갱도에서 광부들을 이끌어 내다.`, 30); return '기둥에 어깨를 대고 소리쳤다. "물 흐르는 쪽으로!" 늙은 광부가 내 말을 받아 외쳤다. 다섯이 옛 배수 갱을 기어 나왔다. 그 뒤로 광부들이 나를 다르게 부른다.'; }
    injure(g, '무너진 버팀목에 깔린 다리', 4);
    return '받치던 기둥이 부러졌다. 다리가 깔렸다. 광부들이 나를 끌고 나왔다. 이끌려던 사람이 이끌려 나왔다.';
  },
});

/* ---------- 파업: 광부 쪽에서 ---------- */
defineScene('mine_picket', {
  title: () => '갱도 앞의 줄',
  text: (g, s) => `${site(g, s.site)?.name ?? '광산'} 입구에 광부들이 팔짱을 끼고 섰다. "품삯을 올리고 버팀목을 바꾸기 전에는 아무도 안 들어간다." 감독이 장부를 든 채 줄 너머의 나를 본다. 들어오는 자에게는 두 배를 준다고 했다.`,
  choices: (g, s) => {
    const m = site(g, s.site);
    if (!m?.strike || !free(g) || here(g) !== m.near) return [];
    return [
      { label: '줄에 선다', key: 'join' },
      { label: '줄을 뚫고 들어간다 (두 배 품삯)', key: 'scab' },
      { label: '감독과 광부들 사이에서 말을 붙인다', key: 'talk' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = MS(g), m = site(g, s.site);
    if (!m?.strike) return '파업은 이미 끝나 있었다.';
    if (key === 'join') {
      S.me.strikes += 1; m.unrest = clamp(m.unrest + 2, 0, 100);
      deed(g, 'loyal', 4, `${J(g.player.name, '이/가')} 광부들 편에서 줄에 섰다더라`, m.near);
      return '팔짱을 끼고 줄에 섰다. 옆 사람이 빵 반 쪽을 건넸다. 해가 지도록 아무도 움직이지 않았다.';
    }
    if (key === 'scab') {
      S.me.scabbed += 1;
      g.player.money += 8;
      deed(g, 'loyal', -8, `${J(g.player.name, '이/가')} 파업 줄을 뚫고 들어갔다더라`, m.near);
      if (rng.chance(0.35)) { injure(g, '광부들에게 맞은 갈비뼈', 2); return '은화 여덟 닢을 받았다. 돌아오는 길에 어둠 속에서 몽둥이가 날아왔다. 누구였는지는 묻지 않아도 안다.'; }
      return '줄을 뚫고 들어갔다. 등 뒤로 침 뱉는 소리가 났다. 은화 여덟 닢을 받았다. 그 돈으로 산 빵은 맛이 없었다.';
    }
    if (check(rng, st(g, 'cha') + st(g, 'int') / 2, 50)) {
      m.strike = null; m.wageMul = clamp(m.wageMul + 0.1, 0.6, 2); m.unrest = 25; m.safety = clamp(m.safety + 10, 0, 100);
      renown(g, 3); deed(g, 'honest', 5, `${J(g.player.name, '이/가')} ${m.name}의 파업을 말로 풀었다더라`, m.near);
      mlog(g, `${m.name}: 내가 말을 붙여 파업이 풀렸다.`);
      return '감독과 광부 대표를 주막 한 탁자에 앉혔다. 밤이 깊도록 서로 소리를 질렀다. 새벽에 품삯 반 닢과 버팀목 마흔 개로 합의했다. 둘 다 내 덕이 아니라고 말했다. 둘 다 나에게 술을 샀다.';
    }
    stress(g, 6);
    return '말을 붙였지만 양쪽 다 나를 상대편 사람으로 보았다. 그날은 아무것도 풀리지 않았다.';
  },
});

/* ---------- 사건 ---------- */
const myStrike = (g) => myMines(g).find((id) => site(g, id).strike) ?? null;
EVENTS.push({
  id: 'mine_strike_owner', cooldown: 6, weight: 9,
  chance: () => 0.7,
  cond: (g) => isAdult(g) && !g.over && !!myStrike(g),
  prepare: (g) => ({ site: myStrike(g) }),
  title: '내 광산의 파업',
  text: (g, c) => { const m = site(g, c.site); return `${m.name}의 광부 대표가 찾아왔다. 모자를 손에 쥐고 있지만 고개는 숙이지 않았다. "품삯 한 닢, 그리고 버팀목. ${m.dead ? `지난번에 죽은 ${m.dead}명 몫까지.` : '그것만 들어주시면 내일 들어갑니다.'}"`; },
  choices: [
    { label: '들어준다 (품삯 +1, 버팀목 은화 25닢)', show: (g) => canSpend(g, 25), run: (g, rng, c) => { const m = site(g, c.site); if (!m?.strike) return '파업은 이미 끝나 있었다.'; if (!spend(g, 25)) return '버팀목 값이 모자랐다.'; m.strike = null; m.wage += 1; m.safety = clamp(m.safety + 20, 0, 100); m.unrest = 15; deed(g, 'kind', 4, `${J(g.player.name, '이/가')} 광부들의 요구를 들어주었다더라`, m.near); return '들어주었다. 대표가 모자를 썼다. 다음 날 아침 갱도에서 노랫소리가 올라왔다.'; } },
    { label: '사람을 사서 파업을 깬다 (은화 20닢)', show: (g) => canSpend(g, 20), run: (g, rng, c) => { const m = site(g, c.site); if (!m?.strike) return '파업은 이미 끝나 있었다.'; if (!spend(g, 20)) return '사람 살 돈이 모자랐다.'; const dead = rng.int(0, 2); m.strike = null; m.unrest = 50; m.dead += dead; m.miners = Math.max(0, m.miners - dead - 2); deed(g, 'kind', -10, `${J(g.player.name, '이/가')} 몽둥이로 광부들의 파업을 깼다더라`, m.near); chron(g, `${g.player.name}, ${m.name}의 파업을 몽둥이로 깨다.`, 30); return `건달 열 명이 몽둥이를 들고 갱도 앞으로 갔다. 파업은 하루 만에 끝났다.${dead ? ` 광부 ${dead}명이 일어나지 못했다.` : ''} 광부들은 다시 들어갔다. 눈을 들지 않고.`; } },
    { label: '기다린다', run: (g, rng, c) => { const m = site(g, c.site); if (m) m.unrest = clamp(m.unrest - 3, 0, 100); return '대답하지 않았다. 대표는 돌아갔다. 광산은 조용하다. 일하지 않는 조용함이다.'; } },
  ],
});
const disputable = (g) => myMines(g).find((id) => { const m = site(g, id); return mi(g) - (m.since ?? 0) >= 6 && (m.vein >= 50 || !m.legal || m.ore === 'manastone' || m.ore === 'silver'); }) ?? null;
EVENTS.push({
  id: 'mine_dispute', cooldown: 36, weight: 6,
  chance: (g) => (site(g, disputable(g))?.legal === false ? 0.35 : 0.12),
  cond: (g) => isAdult(g) && !g.over && !!disputable(g),
  prepare: (g, rng) => { const id = disputable(g), m = site(g, id); return { site: id, who: !m.legal ? (LANDLORD[m.near] ?? '땅 주인') : rng.pick(['옆 골짜기 광산 주인', '자기가 먼저 찾았다는 떠돌이 광부', LANDLORD[m.near] ?? '땅 주인의 조카']) }; },
  title: '광산을 내놓으라는 사람',
  text: (g, c) => { const m = site(g, c.site); return `${J(c.who, '이/가')} 보낸 사람이 ${m.name}에 왔다. ${m.legal ? '"이 광맥은 우리 땅 밑으로 이어진다. 캐낸 것의 절반을 내든지, 광산을 내놓든지."' : '"광업권도 없이 남의 땅을 파는 도둑이 여기 있다지." 뒤에 무장한 사람들이 서 있다.'}`; },
  choices: [
    { label: '돈으로 입을 막는다 (은화 40닢)', show: (g) => canSpend(g, 40), run: (g, rng, c) => { const m = site(g, c.site); if (!m) return '광산은 이미 내 것이 아니었다.'; if (!spend(g, 40)) return '돈이 모자랐다.'; const was = m.legal; m.legal = true; m.found = false; m.since = mi(g); return was ? '은화 마흔 닢이 든 주머니를 건넸다. 상대는 무게를 가늠하고 돌아갔다. 내년에도 올 것이다.' : '은화 마흔 닢이 든 주머니를 건넸다. 양피지 한 장이 돌아왔다. 이제 이 광산은 서류 위에서도 내 것이다.'; } },
    { label: '재판으로 다툰다', show: (g, c) => site(g, c.site)?.legal, run: (g, rng, c) => { const m = site(g, c.site); if (!m) return '광산은 이미 내 것이 아니었다.'; m.since = mi(g); if (check(rng, st(g, 'int') + (g.player.skills.letters ?? 0) / 2 + st(g, 'cha') / 3, 50)) return '광업권 문서와 측량 기록을 들고 재판정에 섰다. 재판관은 내 손을 들어 주었다. 상대는 다음 달 다른 골짜기로 갔다.'; m.vein = clamp(m.vein - 25, 0, 100); return '재판에서 졌다. 광맥의 동쪽 줄기를 넘겨주라는 판결이 났다. 광산은 남았지만 가늘어졌다.'; } },
    { label: '광부들을 모아 막아선다', run: (g, rng, c) => { const m = site(g, c.site); if (!m) return '광산은 이미 내 것이 아니었다.'; m.since = mi(g); if (check(rng, playerPower(g) + m.miners, 45)) { deed(g, 'brave', 4, `${J(g.player.name, '이/가')} 광산을 빼앗으러 온 사람들을 쫓아냈다더라`, m.near); return '곡괭이를 든 광부들이 내 뒤에 섰다. 상대는 수를 세어 보더니 돌아갔다. 다음에는 더 많이 올 것이다.'; } injure(g, '광산 다툼에서 입은 상처', 3); const S = MS(g); delete S.sites[c.site]; mlog(g, `${m.name}을 빼앗겼다.`); chron(g, `${g.player.name}, 광산 ${J(m.name, '을/를')} 빼앗기다.`, 25); return `싸움은 짧았다. 상대가 더 많았다. ${m.name}의 입구에 남의 깃발이 섰다.`; } },
    { label: '광산을 넘겨준다', run: (g, rng, c) => { const m = site(g, c.site); if (!m) return '광산은 이미 내 것이 아니었다.'; delete MS(g).sites[c.site]; mlog(g, `${m.name}을 넘겨주었다.`); return `${m.name}의 열쇠를 넘겼다. 광부들이 나를 보았다. 그들은 새 주인 밑에서도 같은 갱도에 들어갈 것이다.`; } },
  ],
});
EVENTS.push({
  id: 'mine_widow', cooldown: 24, weight: 6,
  chance: () => 0.5,
  cond: (g) => free(g) && sitesNear(g, here(g)).some((id) => site(g, id).collapses > 0 && site(g, id).dead > 0),
  title: '광부의 과부',
  text: () => '갱도 입구 옆 판잣집에서 여자가 아이 셋을 데리고 나왔다. 남편은 지난번 무너진 갱도에 있었다. 광산 주인은 장례비로 은화 두 닢을 보냈다고 한다.',
  choices: [
    { label: '은화 10닢을 건넨다', show: (g) => canSpend(g, 10), run: (g) => { if (!spend(g, 10)) return '주머니가 비어 있었다.'; deed(g, 'kind', 5, `${J(g.player.name, '이/가')} 광부의 과부를 도왔다더라`, here(g)); return '은화 열 닢을 쥐여 주었다. 여자는 고맙다는 말 대신 큰아이에게 내 얼굴을 잘 봐 두라고 했다.'; } },
    { label: '광산 주인을 찾아가 따진다', run: (g, rng) => { if (check(rng, st(g, 'cha') + st(g, 'wil') / 2, 55)) { deed(g, 'brave', 4, `${J(g.player.name, '이/가')} 광산 주인에게 과부 몫을 받아 냈다더라`, here(g)); return '광산 주인의 막사에 들어가 큰 소리로 따졌다. 다른 광부들이 문밖에 모였다. 주인은 은화 스무 닢을 더 내놓았다.'; } stress(g, 5); return '광산 주인은 장부를 펼쳐 보였다. 갱도에 들어간 것은 그 사람의 뜻이었다고. 문밖으로 쫓겨났다.'; } },
    { label: '지나친다', run: () => '눈을 피하고 지나쳤다. 광산 마을에는 그런 판잣집이 여럿이다.' },
  ],
});
const deepMine = (g) => myMines(g).find((id) => { const m = site(g, id); return !m.awoke && m.depth >= 5 && m.stir >= 55; }) ?? null;
EVENTS.push({
  id: 'mine_knocking', cooldown: 18, weight: 7,
  chance: () => 0.6,
  cond: (g) => isAdult(g) && !g.over && !!deepMine(g),
  prepare: (g) => ({ site: deepMine(g) }),
  title: '막장 벽 너머의 소리',
  text: (g, c) => `${site(g, c.site).name}의 감독이 얼굴이 하얘져 찾아왔다. "맨 아래 막장에서 소리가 납니다. 우리가 두드리면, 저쪽에서 두드립니다. 같은 박자로." 광부들이 내려가려 하지 않는다.`,
  choices: [
    { label: '그 층을 버리고 위층만 판다', run: (g, rng, c) => { const m = site(g, c.site); if (!m) return '광산은 이미 내 것이 아니었다.'; m.depth -= 1; m.stir = 10; m.vein = clamp(m.vein - 15, 0, 100); MS(g).dwarf = clamp(MS(g).dwarf + 5, -100, 100); return '맨 아래 층 입구를 돌로 막게 했다. 광맥이 가장 굵은 층이었다. 감독이 숨을 내쉬었다.'; } },
    { label: '계속 판다', run: (g, rng, c) => { const m = site(g, c.site); if (!m) return '광산은 이미 내 것이 아니었다.'; m.stir = clamp(m.stir + 20, 0, 100); m.unrest = clamp(m.unrest + 15, 0, 100); m.vein = clamp(m.vein + 10, 0, 100); MS(g).dwarf = clamp(MS(g).dwarf - 15, -100, 100); return '"광맥이 거기 있다." 감독은 말없이 돌아갔다. 그날 밤 광부 둘이 짐을 싸서 떠났다. 쇠망치 골의 드워프들이 그 이야기를 들었다.'; } },
  ],
});
EVENTS.push({
  id: 'mine_found_out', cooldown: 12, weight: 8,
  chance: () => 0.8,
  cond: (g) => isAdult(g) && !g.over && myMines(g).some((id) => site(g, id).found && !site(g, id).legal),
  prepare: (g) => ({ site: myMines(g).find((id) => site(g, id).found && !site(g, id).legal) }),
  title: '들통난 굴',
  text: (g, c) => { const m = site(g, c.site); return `${LANDLORD[m.near] ?? '땅 주인'}의 사람들이 ${m.name}의 덤불을 걷어 냈다. 입구에 서서 장부를 펼친다. "광업권 없이 판 것이 몇 해치인가."`; },
  choices: [
    { label: '벌금과 광업권 값을 치른다 (은화 60닢)', show: (g) => canSpend(g, 60), run: (g, rng, c) => { const m = site(g, c.site); if (!m) return '굴은 이미 내 것이 아니었다.'; if (!spend(g, 60)) return '돈이 모자랐다.'; m.legal = true; m.found = false; m.name = m.name.replace('숨은 ', ''); return '은화 예순 닢을 세어 주었다. 덤불은 다시 덮지 않았다. 이제 이 굴은 숨길 것이 없다.'; } },
    { label: '굴을 버리고 달아난다', run: (g, rng, c) => { const m = site(g, c.site); if (!m) return '굴은 이미 내 것이 아니었다.'; delete MS(g).sites[c.site]; deed(g, 'honest', -4, `${J(g.player.name, '이/가')} 남의 땅을 몰래 파다 들켰다더라`, m.near); return '밤에 광부들에게 마지막 품삯을 쥐여 주고 떠났다. 다음 날 그 굴은 땅 주인의 것이 되었다.'; } },
  ],
});
