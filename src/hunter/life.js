// 사냥꾼과 덫꾼의 삶: 사냥 나가기, 영주의 숲(허가와 밀렵), 산지기에게 걸림, 모피 상인, 큰 사냥, 오두막과 도제, 귀족 사냥 대회.
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check, gains, up } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { huntBonus, bury } from '../beasts/core.js';
import { addFame } from '../vocation/core.js';
import { makePerson } from '../npc.js';
import { invented } from '../era/state.js';
import { J } from '../narrative/text.js';
import {
  H, mi, clamp, here, placeName, free, adult, Q, skill, isHunter, seasonOf, GROUNDS, hasWood, hasLord, GAME, GAME_IDS, furName, FUR_TOWNS, TRADERS,
  LODGE_PLACES, LODGE_COST, logH, stockOf, licensed, bannedAt, furCount, lodgeHere, addFur, dogs, hawks,
} from './core.js';

export const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];
const hUp = (v) => up('사냥', v);
const lived = (g, pl) => !/^fr_/.test(pl) || (g.frontier?.sites?.[pl]?.stage ?? 0) >= 1;
const guns = (g) => invented(g, 'rifling') || invented(g, 'gun');

/* ---------- 사냥 나가기 ---------- */
// 이 사냥터, 이 철에 잡히는 짐승 (큰 짐승은 장면으로 따로)
export function gameHere(g, lordForest = false, pl = here(g)) {
  const se = seasonOf(g);
  return GAME_IDS.filter((id) => {
    const d = GAME[id];
    if (d.big || !d.when.includes(se)) return false;
    if (d.where && !d.where.includes(pl)) return false;
    if (d.lord && !lordForest && !['fur', 'fr_moor', 'fr_wood', 'silverleaf', 'graubel'].includes(pl)) return false;
    return true;
  });
}
const bigHere = (g, lordForest, pl = here(g)) => GAME_IDS.filter((id) => { const d = GAME[id]; return d.big && d.when.includes(seasonOf(g)) && (!d.where || d.where.includes(pl)) && (!d.lord || lordForest || ['fur', 'fr_moor', 'fr_wood'].includes(pl)); });
export function huntOnce(g, rng, lordForest) {
  const s = H(g), pl = here(g), pool = gameHere(g, lordForest);
  const help = huntBonus(g) / 60 + (s.lodge?.place === pl ? s.lodge.app.length * 0.08 : 0) + (guns(g) ? 0.15 : 0) + (lordForest ? 0.15 : 0);
  const p = clamp((0.4 + skill(g) / 200 + help) * (stockOf(g, pl) / 70), 0.05, 0.92);
  const got = [];
  for (let i = 0; i < 3; i++) if (pool.length && rng.chance(p * (i ? 0.6 : 1))) {
    const weighted = lordForest ? [...pool, ...pool.filter((id) => GAME[id].lord), ...pool.filter((id) => GAME[id].lord)] : pool;
    got.push(pick(rng, weighted));
  }
  for (const id of got) { if (GAME[id].fur) addFur(g, id); s.meat += GAME[id].meat; }
  s.stock[pl] = clamp(stockOf(g, pl) - got.length * 1.5, 0, 100);
  s.hunts += 1;
  return got;
}
const KN = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const cnt = (n) => KN[n] ?? String(n);
const gotWords = (got) => {
  const c = {}; for (const id of got) c[id] = (c[id] ?? 0) + 1;
  return Object.entries(c).map(([id, n]) => `${GAME[id].name} ${cnt(n)} 마리`).join(', ');
};
function huntText(g, rng, got, lordForest) {
  const gr = GROUNDS[here(g)], where = lordForest ? gr.lord.name : gr.wood;
  const help = [];
  if (dogs(g).length) help.push(`${J(dogs(g)[0].name, '이/가')} 덤불을 헤집어 몰았다.`);
  if (hawks(g).length && got.some((id) => GAME[id].small)) help.push(`${J(hawks(g)[0].name, '이/가')} 하늘에서 내리꽂혔다.`);
  if (guns(g)) help.push(rng.pick(['총소리가 골짜기를 울렸다. 새들이 한꺼번에 날아올랐다.', '화약 냄새가 숲 냄새를 덮었다.']));
  const open = rng.pick([`새벽 안개를 헤치고 ${where}에 들었다.`, `${where}에서 하루 종일 발자국을 쫓았다.`, `바람을 안고 ${where} 깊이 들어갔다.`]);
  const res = got.length ? `${J(gotWords(got), '을/를')} 잡았다.` : rng.pick(['빈손이었다. 짐승들이 먼저 나를 알아챘다.', '발자국은 많았는데 짐승은 없었다.']);
  return [open, ...help, res].join(' ');
}
const huntOk = (g) => free(g) && adult(g) && (isHunter(g) || skill(g) >= 8 || dogs(g).length > 0 || hawks(g).length > 0) && g.player.fatigue < 90 && !!GROUNDS[here(g)] && lived(g, here(g));
function afterHunt(g, rng, lordForest) {
  const s = H(g);
  let t = '';
  const bigs = bigHere(g, lordForest);
  if (bigs.length && skill(g) >= 20 && !sceneQueued(g, 'hunter_big') && rng.chance(0.12)) { queueScene(g, 'hunter_big', { kind: pick(rng, bigs), lord: lordForest }); t += ' 돌아오는 길에 큰 짐승의 흔적을 보았다.'; }
  if (rng.chance(0.015 * (1 - skill(g) / 150))) { g.player.injuries.push({ name: pick(rng, ['가시덤불에 찢긴 정강이', '비탈에서 삔 발목', '언 손가락']), months: 1 }); t += ' 숲에서 다쳤다.'; }
  return t;
}
ACTIONS.push({
  id: 'hunter_go', name: '사냥을 나간다', icon: 'hunt',
  desc: '활과 올가미를 챙겨 사냥터에 든다. 철마다 잡히는 짐승이 다르다. 모피와 가죽은 모아 두었다가 모피 상인에게 판다. 사냥개와 매가 있으면 낫다.',
  available: (g) => huntOk(g) && (hasWood(here(g)) || (hasLord(here(g)) && licensed(g))),
  run(g, rng) {
    const lord = hasLord(here(g)) && licensed(g) && (!hasWood(here(g)) || rng.chance(0.6));
    tired(g, 14);
    const got = huntOnce(g, rng, lord);
    const v = gainSkill(g, 'hunting', 0.9, 'sen'), st = gainStat(g, 'agi', 0.2);
    return `${huntText(g, rng, got, lord)}${afterHunt(g, rng, lord)}${gains([hUp(v), up('민첩', st)])}`;
  },
});

/* ---------- 영주의 숲: 허가와 밀렵 ---------- */
ACTIONS.push({
  id: 'hunter_license', name: '사냥 허가를 산다', icon: 'scroll',
  desc: '영주나 왕실의 금렵 숲에 한 해 동안 드나들 허가. 노루와 멧돼지, 큰뿔사슴이 많다.',
  available: (g) => huntOk(g) && hasLord(here(g)) && !licensed(g) && !bannedAt(g) && (isHunter(g) || skill(g) >= 15) && g.player.money >= GROUNDS[here(g)].lord.fee,
  run(g) {
    const L0 = GROUNDS[here(g)].lord;
    pay(g, L0.fee); H(g).license[here(g)] = mi(g) + 12;
    logH(g, `${L0.name} 사냥 허가를 샀다.`);
    return `${L0.who}에게 은화 ${L0.fee}닢을 내고 밀랍 인장이 찍힌 허가패를 받았다. 한 해 동안 ${J(L0.name, '을/를')} 드나들 수 있다.`;
  },
});
export const forester = (g) => clamp(0.18 - skill(g) / 500 + (H(g).caught ? 0.08 : 0) + (dogs(g).length ? 0.03 : 0), 0.05, 0.4);
ACTIONS.push({
  id: 'hunter_poach', name: '영주의 숲에 몰래 든다', icon: 'mask',
  desc: '허가 없이 금렵 숲에 들어 짐승을 잡는다. 사냥감은 많지만, 산지기에게 걸리면 벌금과 매질, 고발이 기다린다.',
  available: (g) => huntOk(g) && hasLord(here(g)) && !licensed(g) && !bannedAt(g) && (isHunter(g) || skill(g) >= 15),
  run(g, rng) {
    const s = H(g); tired(g, 16); s.poached += 1;
    if (rng.chance(forester(g))) { queueScene(g, 'hunter_caught', {}, { first: true }); return `해 뜨기 전에 ${GROUNDS[here(g)].lord.name} 울타리를 넘었다. 사슴 한 마리를 메고 나오려는데 덤불 너머에서 등불이 흔들렸다.`; }
    const got = huntOnce(g, rng, true);
    const v = gainSkill(g, 'hunting', 1, 'sen');
    return `${huntText(g, rng, got, true)} 산지기의 발소리를 두 번 피했다.${afterHunt(g, rng, true)}${gains([hUp(v)])}`;
  },
});
defineScene('hunter_caught', {
  need: (g) => hasLord(here(g)),
  title: () => '산지기',
  text: (g) => { const L0 = GROUNDS[here(g)].lord; return `${J(L0.who, '이/가')} 석궁을 겨누고 섰다. 뒤로 개 두 마리가 이를 드러냈다. "${L0.name}에서 무엇을 하는 거냐." 허리춤의 올가미와 피 묻은 칼이 다 말해 주고 있다.`; },
  choices: (g) => [
    { label: `벌금을 낸다 (은화 ${GROUNDS[here(g)].lord.fee * 2}닢)`, key: 'fine' },
    ...(g.player.money >= 10 ? [{ label: '은화 열 닢을 슬쩍 쥐여 준다', key: 'bribe' }] : []),
    { label: '숲으로 뛴다', key: 'run' },
    { label: '산지기를 때려눕힌다', key: 'fight' },
  ],
  resolve(g, rng, s, key) {
    const st = H(g), pl = here(g), L0 = GROUNDS[pl].lord;
    st.caught += 1;
    if (key === 'fine') { const n = pay(g, L0.fee * 2); if (n < L0.fee * 2) { g.player.injuries.push({ name: '매질 자국', months: 1 }); stress(g, 10); return `가진 돈 은화 ${n}닢을 다 털렸다. 모자란 만큼 광장에서 매를 맞았다.`; } deed(g, 'honest', -2, null); return `은화 ${n}닢을 냈다. 산지기는 내 이름과 얼굴을 장부에 적었다.`; }
    if (key === 'bribe') { if (rng.chance(0.6)) { pay(g, 10); return '산지기는 은화를 받아 넣고 등불을 돌렸다. "다음엔 나도 못 본 척 못 한다."'; } pay(g, 10); reportCrime(g, 'smuggling', pl, { mult: 0.5 }); return '산지기는 은화를 받아 넣고도 나를 끌고 갔다. 뇌물까지 장부에 적혔다.'; }
    if (key === 'run') {
      if (check(rng, (g.player.stats.agi ?? 0) / 2 + skill(g) / 2, 35)) { gainSkill(g, 'hunting', 0.6, 'agi'); return '덤불을 뚫고 개울을 따라 뛰었다. 개들이 냄새를 잃었다. 잡은 것은 다 버렸다.'; }
      g.player.injuries.push({ name: '개에게 물린 종아리', months: 2 }); reportCrime(g, 'smuggling', pl, { mult: 0.8 }); st.banned[pl] = mi(g) + 24;
      return '개가 먼저 닿았다. 종아리를 물린 채 끌려 나왔다. 두 해 동안 이 고장 숲에 발을 들이지 말라는 판결이 났다.';
    }
    reportCrime(g, 'assault', pl, { mult: 0.8 }); deed(g, 'kind', -4, null); st.banned[pl] = mi(g) + 60;
    if (check(rng, (g.player.stats.str ?? 0) / 2 + skill(g) / 3, 40)) return '석궁을 쳐내고 산지기를 쓰러뜨렸다. 개를 걷어차고 달아났다. 다음 날 내 얼굴을 닮은 수배서가 붙었다.';
    g.player.injuries.push({ name: '석궁 화살이 박힌 어깨', months: 3 }); stress(g, 12);
    return '덤벼드는 순간 석궁이 울렸다. 어깨에 화살을 꽂은 채 숲을 빠져나왔다. 다섯 해 동안 이 고장 숲에 들 수 없게 되었다.';
  },
});

/* ---------- 모피 상인 ---------- */
export function furPrice(g, id, pl = here(g)) {
  const d = GAME[id], s = H(g);
  let p = d.fur * (FUR_TOWNS[pl] ?? 0.8) * (seasonOf(g) === '겨울' && d.winter ? d.winter : 1) * (1 + s.trader.trust / 200) * (1 + skill(g) / 300);
  if (s.lodge) p *= 1.1; // 건조대에서 제대로 말린 가죽
  if (invented(g, 'factory') && !d.small) p *= 0.85; // 공장 가죽이 들어오면 거친 가죽 값이 내린다
  return Math.max(1, Math.round(p));
}
const furList = (g) => Object.entries(H(g).furs).filter(([id, n]) => n > 0 && GAME[id]);
const sellValue = (g, keep = []) => furList(g).filter(([id]) => !keep.includes(id)).reduce((a, [id, n]) => a + furPrice(g, id) * n, 0) + Math.round(H(g).smoked * 1.5);
const FINE = ['marten', 'fox', 'otter'];
const orderReady = (g) => { const o = H(g).trader.order; return !!o && (H(g).furs[o.kind] ?? 0) >= o.n; };
ACTIONS.push({
  id: 'hunter_sell', name: '모피 상인에게 판다', icon: 'coin',
  desc: '모아 둔 모피와 가죽, 훈제 고기를 모피 상인에게 넘긴다. 털가죽 시장과 왕도에서 값이 좋고, 담비와 여우는 겨울 털이 가장 비싸다.',
  available: (g) => free(g) && adult(g) && (furCount(g) > 0 || H(g).smoked > 0) && !!FUR_TOWNS[here(g)] && !sceneQueued(g, 'hunter_trader'),
  run(g, rng) {
    const s = H(g);
    if (!s.trader.order && furCount(g) >= 3 && rng.chance(0.3)) {
      const kind = pick(rng, ['marten', 'fox', 'beaver', 'otter']);
      s.trader.offer = { kind, n: kind === 'marten' ? 4 : 6, paid: 10 + Math.round(GAME[kind].fur * 1.5) };
    } else s.trader.offer = null;
    queueScene(g, 'hunter_trader', {}, { first: true });
    return `${placeName(here(g))} 모피 거리에서 ${J(s.trader.name, '을/를')} 찾았다.`;
  },
});
defineScene('hunter_trader', {
  need: (g) => furCount(g) > 0 || H(g).smoked > 0,
  title: (g) => H(g).trader.name,
  text: (g) => {
    const s = H(g), list = furList(g).map(([id, n]) => `${furName(id)} ${n}장(장당 ${furPrice(g, id)}닢)`);
    const sm = s.smoked > 0 ? ` 훈제 고기 ${Math.round(s.smoked)}덩이.` : '';
    const o = s.trader.order, of = s.trader.offer;
    const ord = o ? ` 지난번에 맡은 주문: ${GAME[o.kind].name} ${o.n}장.` : of ? ` 상인이 목소리를 낮췄다. "${GAME[of.kind].name} ${of.n}장을 겨울 끝까지 구해 주면, 지금 은화 ${of.paid}닢을 먼저 주겠소."` : '';
    return `${J(s.trader.name, '이/가')} 가죽을 한 장씩 뒤집어 털결을 손끝으로 쓸었다. ${list.join(', ') || '모피는 없다'}.${sm}${ord}`;
  },
  choices: (g) => {
    const s = H(g), out = [{ label: `모두 판다 (은화 ${sellValue(g)}닢)`, key: 'all' }];
    if (seasonOf(g) !== '겨울' && furList(g).some(([id]) => FINE.includes(id)) && furList(g).some(([id]) => !FINE.includes(id))) out.push({ label: '담비·여우·수달은 겨울까지 두고 나머지만 판다', key: 'some' });
    if (orderReady(g)) out.push({ label: '맡은 주문을 넘긴다', key: 'order' });
    if (!s.trader.order && s.trader.offer) out.push({ label: '주문을 맡는다', key: 'take' });
    out.push({ label: '값이 맞지 않는다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const st = H(g), tr = st.trader;
    if (key === 'none') { tr.offer = null; return `${J(tr.name, '은/는')} 어깨를 으쓱했다. "다른 데 가 보시오. 이 값보다 나은 데는 없을 거요."`; }
    if (key === 'take') { const of = tr.offer; tr.order = { kind: of.kind, n: of.n, until: mi(g) + 9, paid: of.paid }; g.player.money += of.paid; tr.offer = null; logH(g, `${GAME[of.kind].name} 모피 ${of.n}장 주문을 맡았다.`); return `은화 ${of.paid}닢을 먼저 받았다. 상인이 장부에 내 이름을 적었다. 겨울이 끝나기 전에 ${GAME[of.kind].name} ${of.n}장을 가져가야 한다.`; }
    if (key === 'order') {
      const o = tr.order, n = Math.round(furPrice(g, o.kind) * o.n * 1.4);
      st.furs[o.kind] -= o.n; g.player.money += n; st.earned += n; tr.trust = clamp(tr.trust + 15, 0, 100); tr.order = null;
      logH(g, `${GAME[o.kind].name} 모피 주문을 채웠다.`);
      return `${GAME[o.kind].name} ${o.n}장을 내놓자 상인이 웃었다. 약속한 값에 웃돈을 얹어 은화 ${n}닢을 세어 주었다. "다음 철에도 당신 것부터 사겠소."`;
    }
    const keep = key === 'some' ? FINE : [];
    const n = sellValue(g, keep);
    for (const [id] of furList(g)) if (!keep.includes(id)) st.furs[id] = 0;
    st.smoked = 0; g.player.money += n; st.earned += n; tr.trust = clamp(tr.trust + 2, 0, 100); tr.offer = null;
    const v = gainSkill(g, 'trade', 0.3, 'cha');
    return `가죽 더미가 상인의 수레로 옮겨 갔다. 은화 ${n}닢을 받았다.${keep.length ? ' 고운 털은 겨울에 다시 오기로 했다.' : ''}${gains([up('장사', v)])}`;
  },
});

/* ---------- 큰 사냥 ---------- */
const BIG_TEXT = {
  stag: '안개 속에서 가지가 열두 개 달린 뿔이 움직였다. 큰뿔사슴이 고개를 들고 바람 냄새를 맡는다. 어깨 높이가 내 키만 하다.',
  wolf: '해 질 녘 능선에서 늑대 울음이 셋, 넷 겹쳤다. 눈 위에 발자국이 둥글게 나를 에워싸고 있다. 떼다.',
  bison: '풀밭 끝에 검은 산이 하나 서 있다. 들소다. 콧김이 하얗게 뿜어져 나오고, 앞발로 땅을 긁는다.',
};
defineScene('hunter_big', {
  need: (g, s) => !!GAME[s.kind]?.big,
  title: (g, s) => GAME[s.kind].name,
  text: (g, s) => BIG_TEXT[s.kind],
  choices: (g, s) => [
    { label: s.kind === 'wolf' ? '불을 피우고 등을 바위에 붙인다' : '바람을 등지고 활로 노린다', key: 'bow' },
    ...(dogs(g).length ? [{ label: `${J(dogs(g)[0].name, '을/를')} 풀고 창을 든다`, key: 'dogs' }] : []),
    { label: s.kind === 'wolf' ? '떼의 우두머리를 먼저 노린다' : '구덩이를 파고 몰아넣는다', key: 'trap' },
    { label: '물러난다', key: 'leave' },
  ],
  resolve(g, rng, s, key) {
    const d = GAME[s.kind], st = H(g);
    if (key === 'leave') return s.kind === 'wolf' ? '횃불을 휘두르며 뒷걸음질 쳤다. 마을 불빛이 보일 때까지 늑대들이 따라왔다.' : `${J(d.name, '이/가')} 숲으로 사라지는 것을 끝까지 지켜보았다.`;
    const dog = dogs(g)[0];
    const bonus = key === 'dogs' ? 12 : key === 'trap' ? 6 : 0;
    const diff = s.kind === 'bison' ? 58 : s.kind === 'wolf' ? 50 : 46;
    if (key === 'trap' && s.kind !== 'wolf') tired(g, 15);
    if (check(rng, skill(g) + (g.player.stats.agi ?? 0) / 4 + bonus + (guns(g) ? 10 : 0), diff)) {
      const n = s.kind === 'wolf' ? rng.int(2, 3) : 1;
      addFur(g, s.kind, n); st.meat += d.meat; st.bigs.push(d.name); if (st.bigs.length > 20) st.bigs.shift();
      addFame(g, 'hunter', 3); L(g).renown += 1; gainSkill(g, 'hunting', 1.5, 'sen');
      logH(g, `${J(d.name, '을/를')} 잡았다.`);
      if (s.kind === 'wolf') return `불꽃 너머로 화살을 날렸다. 우두머리가 쓰러지자 떼가 흩어졌다. 늑대 ${cnt(n)} 마리의 가죽을 벗겼다. 양치기들이 술을 샀다.`;
      return `${key === 'dogs' ? `${J(dog.name, '이/가')} 뒷다리를 물고 늘어진 사이 창을 찔렀다.` : key === 'trap' ? '이틀을 몰아 구덩이로 밀어 넣었다.' : '숨을 멈추고 쏜 화살이 목에 꽂혔다.'} ${J(d.name, '이/가')} 쓰러졌다. 고기와 가죽을 지고 오는 데만 하루가 걸렸다.`;
    }
    let extra = '';
    if (key === 'dogs' && dog && rng.chance(0.35)) { bury(g, dog, `${d.name}에게 받혀 죽었다`); extra = ` ${J(dog.name, '이/가')} 다시 일어나지 못했다.`; }
    g.player.injuries.push({ name: s.kind === 'wolf' ? '늑대에게 물린 팔' : s.kind === 'bison' ? '들소 뿔에 받힌 옆구리' : '사슴뿔에 찢긴 허벅지', months: rng.int(2, 4) });
    stress(g, 8);
    return `${s.kind === 'wolf' ? '늑대 하나가 불을 넘어 덤볐다.' : `${J(d.name, '이/가')} 방향을 틀어 곧장 나를 향했다.`} 땅에 나뒹굴었다. 정신을 차렸을 땐 짐승은 없고 피만 남아 있었다.${extra}`;
  },
});

/* ---------- 사냥꾼 오두막과 도제 ---------- */
export const lodgeOk = (g) => free(g) && adult(g) && !H(g).lodge && LODGE_PLACES.includes(here(g)) && lived(g, here(g)) && g.player.money >= LODGE_COST && (isHunter(g) || skill(g) >= 25);
ACTIONS.push({
  id: 'hunter_lodge', name: '사냥꾼 오두막을 짓는다', icon: 'home',
  desc: `은화 ${LODGE_COST}닢. 숲 가장자리에 훈연막과 가죽 건조대를 갖춘 오두막. 고기를 훈제해 두고, 가죽을 제대로 말려 값을 더 받는다. 도제를 들일 수 있다.`,
  available: (g) => lodgeOk(g),
  run(g) {
    const s = H(g); pay(g, LODGE_COST);
    s.lodge = { place: here(g), since: g.date.year, app: [], appAt: 0 };
    logH(g, `${placeName(here(g))} 숲 가장자리에 오두막을 지었다.`);
    return `${GROUNDS[here(g)].wood} 가장자리에 통나무 오두막을 올렸다. 뒤쪽엔 훈연막, 처마 밑엔 가죽 건조대. 굴뚝에서 오리나무 연기가 피어올랐다.`;
  },
});
const appCand = (g) => g.people.filter((p) => p.alive && (p.place ?? 'ern') === here(g) && p.ageMonths >= 12 * 12 && p.ageMonths < 17 * 12 && !H(g).lodge?.app.some((a) => a.id === p.id) && !(g.player.childIds ?? []).includes(p.id));
ACTIONS.push({
  id: 'hunter_apprentice', name: '사냥 도제를 들인다', icon: 'visit',
  desc: '아이 하나를 오두막에 들여 발자국 읽기와 덫 놓기를 가르친다. 사냥감이 늘고, 몇 해 뒤 제 사냥꾼이 되어 떠난다.',
  available: (g) => free(g) && lodgeHere(g) && H(g).lodge.app.length < 2 && mi(g) - (H(g).lodge.appAt ?? 0) >= 6 && skill(g) >= 30,
  run(g, rng) {
    const lo = H(g).lodge;
    let p = pick(rng, appCand(g));
    if (!p) { p = makePerson(rng, { sex: rng.chance(0.75) ? 'm' : 'f', ageMonths: rng.int(12, 14) * 12 }); p.place = here(g); g.people.push(p); }
    lo.app.push({ id: p.id, name: p.name, since: mi(g) }); lo.appAt = mi(g);
    logH(g, `${J(p.name, '을/를')} 사냥 도제로 들였다.`);
    return pick(rng, [`${J(p.name, '이/가')} 낡은 활 하나를 들고 오두막 문을 두드렸다.`, `${J(p.name, '은/는')} 첫날 토끼 발자국과 여우 발자국을 헷갈렸다. 둘째 날엔 헷갈리지 않았다.`, `${p.name}의 아버지는 사냥꾼이었다. 지난겨울 돌아오지 않았다고 했다.`]);
  },
});
defineScene('hunter_journey', {
  need: (g, s) => !!H(g).lodge?.app.some((a) => a.id === s.id),
  title: () => '제 활을 든 날',
  text: (g, s) => { const a = H(g).lodge.app.find((x) => x.id === s.id); return `${J(a.name, '이/가')} 오두막에 온 지 세 해. 이제 혼자 큰뿔사슴 발자국을 하루 종일 쫓는다. 제 사냥터를 찾아 떠날 때가 되었다.`; },
  choices: () => [{ label: '내 활을 물려준다', key: 'bow' }, { label: '그냥 보낸다', key: 'send' }, { label: '한 해만 더 있으라고 한다', key: 'keep' }],
  resolve(g, rng, s, key) {
    const lo = H(g).lodge, a = lo.app.find((x) => x.id === s.id), p = g.people.find((x) => x.id === s.id);
    if (key === 'keep') { a.since += 12; return `${J(a.name, '은/는')} 말없이 활시위를 다시 감았다.`; }
    lo.app = lo.app.filter((x) => x.id !== s.id);
    if (p?.alive) p.job = 'hunter';
    logH(g, `도제 ${J(a.name, '이/가')} 사냥꾼이 되어 떠났다.`);
    if (key === 'bow') { deed(g, 'generous', 3, null); return `손때 묻은 내 활을 건넸다. ${J(a.name, '은/는')} 시위를 한 번 당겨 보더니 고개를 깊이 숙였다.`; }
    return `${J(a.name, '이/가')} 숲길로 사라졌다. 오두막 앞 발자국이 하나 줄었다.`;
  },
});

/* ---------- 귀족 사냥 대회 몰이꾼 ---------- */
defineScene('hunter_royal', {
  need: (g) => hasLord(here(g)),
  title: () => '귀족 사냥 대회',
  text: (g) => `${GROUNDS[here(g)].lord.name}에 귀족 사냥 대회가 열린다. 말 탄 귀족들과 시종, 사냥개 수십 마리. ${J(GROUNDS[here(g)].lord.who, '이/가')} 몰이꾼을 모은다. 하루 품삯 은화 여섯 닢. 가장 큰 사슴을 몰아오는 몰이꾼에게는 웃돈이 붙는다.`,
  choices: (g) => [
    { label: '몰이꾼으로 나선다', key: 'beat' },
    ...(skill(g) >= 30 ? [{ label: '큰뿔사슴 있는 곳으로 귀족을 이끈다', key: 'guide' }] : []),
    ...(skill(g) >= 40 ? [{ label: '귀족보다 먼저 사슴을 쏜다', key: 'shoot' }] : []),
    { label: '귀족 놀음에 끼지 않는다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'no') return '숲 쪽에서 하루 종일 뿔나팔 소리가 났다.';
    tired(g, 18);
    if (key === 'beat') { g.player.money += 6; H(g).earned += 6; gainSkill(g, 'hunting', 0.5, 'sen'); return '징과 막대를 두드리며 덤불을 훑었다. 노루 떼가 귀족들 쪽으로 뛰어갔다. 은화 여섯 닢과 고기 한 덩이를 받았다.'; }
    if (key === 'guide') {
      if (check(rng, skill(g), 40)) { g.player.money += 25; H(g).earned += 25; L(g).renown += 1; addFame(g, 'hunter', 3); return '새벽 발자국을 읽어 귀족을 개울가로 이끌었다. 큰뿔사슴이 거기 있었다. 귀족이 쏜 화살이 꽂히자 시종들이 환호했다. 은화 스물다섯 닢이 든 주머니가 던져졌다.'; }
      g.player.money += 2; stress(g, 6); return '반나절을 헤맸지만 사슴은 없었다. 귀족이 말 위에서 혀를 찼다. 품삯은 두 닢으로 깎였다.';
    }
    if (rng.chance(0.5)) { L(g).renown += 2; addFame(g, 'hunter', 4); g.player.money += 10; return '귀족의 화살보다 내 화살이 먼저 꽂혔다. 정적이 흘렀다. 늙은 백작이 웃음을 터뜨리더니 내 이름을 물었다. 은화 열 닢과 함께 그의 사냥꾼들 사이에 이름이 돌았다.'; }
    H(g).banned[here(g)] = mi(g) + 36; stress(g, 10); deed(g, 'loyal', -3, null);
    return '내 화살이 귀족의 사슴을 가로챘다. 젊은 영주의 얼굴이 하얗게 질렸다. 그날 밤 산지기가 찾아와 세 해 동안 이 숲에 발을 들이지 말라고 전했다.';
  },
});
