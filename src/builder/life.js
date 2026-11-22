// 목수와 석공의 삶: 의뢰 받기, 나무와 돌 고르기, 다 지은 날과 이름 붙이기, 조합의 장인 시험과 표식,
// 무너진 일과 책임, 내 작업장과 도제.
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check, gains, up } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { addFame, leaveWork } from '../vocation/core.js';
import { makePerson } from '../npc.js';
import { FS } from '../frontier/state.js';
import { WS, WORKS, WORK_IDS } from '../works/state.js';
import { J } from '../narrative/text.js';
import {
  B, mi, clamp, here, placeName, townName, free, skill, trade, isBuilder, adult, Q, rankOf, rankAt, skillRank, frontierSite, logB, shopHere, qualWord,
  RANKS, GUILD_TOWNS, MARKS, MARK_IDS, KINDS, KIND_IDS, MATS, CLIENTS, NAMES, kindName, monthsOf, payOf, tradeFits, matSide, invented,
} from './core.js';

export const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];
const bUp = (v) => up('목공과 석공', v);

/* ---------- 들어오는 일감 ---------- */
const worksHere = (g) => WORK_IDS.find((id) => WORKS[id].place === here(g) && WS(g).w[id].stage === 'building') ?? null;
const lived = (g, pl = here(g)) => frontierSite(pl) && (FS(g).sites[pl]?.stage ?? 0) >= 1;
const banned = (g) => B(g).guild.banned > mi(g) && GUILD_TOWNS.includes(here(g));
export function kindsHere(g) {
  const pl = here(g);
  return KIND_IDS.filter((k) => {
    const d = KINDS[k];
    if (!tradeFits(g, k) || rankAt(g, pl) < d.min) return false;
    if (d.need && !invented(g, d.need)) return false;
    if (banned(g) && d.min > 0) return false;
    if (d.at === 'frontier') return lived(g, pl);
    if (d.at === 'works') return !!worksHere(g);
    return d.at.includes(pl);
  });
}
// 이 고장에서 한 번에 들어오는 일감 셋까지. 큰 일이 있으면 하나는 꼭 낀다.
export function offersFor(g, rng) {
  const ks = kindsHere(g);
  if (!ks.length) return [];
  const big = ks.filter((k) => KINDS[k].big || k === 'works'), small = ks.filter((k) => !big.includes(k));
  const out = [];
  if (big.length) out.push(pick(rng, big));
  const rest = [...small, ...big.filter((k) => !out.includes(k))];
  while (out.length < 3 && rest.length) { const i = Math.floor(rng.next() * rest.length); out.push(rest.splice(i, 1)[0]); }
  const side = frontierSite(here(g)) ? 'frontier' : ['ern', 'gruental', 'klein', 'saltmare', 'fur', 'silverleaf'].includes(here(g)) ? 'village' : 'town';
  return out.map((kind) => ({ kind, client: kind === 'works' ? WORKS[worksHere(g)].name : pick(rng, CLIENTS[side]), pay: payOf(g, kind) }));
}
const canSeek = (g) => free(g) && adult(g) && (isBuilder(g) || skill(g) >= 20) && !B(g).job && !sceneQueued(g, 'builder_offer') && !sceneQueued(g, 'builder_mat');
ACTIONS.push({
  id: 'builder_seek', name: '일감을 맡으러 다닌다', icon: 'hammer',
  desc: '헛간, 집, 방앗간, 다리, 예배당. 집을 짓겠다는 사람을 찾아 값을 정하고, 몇 달에 걸쳐 짓는다. 큰 일은 조합의 장인만 맡는다.',
  available: (g) => canSeek(g) && kindsHere(g).length > 0,
  run(g, rng) {
    const offers = offersFor(g, rng);
    queueScene(g, 'builder_offer', { offers }, { first: true });
    return '연장 자루를 메고 일감 붙는 곳을 돌았다.';
  },
});
defineScene('builder_offer', {
  need: (g, s) => canSeek(g) || !!s.offers?.length,
  title: () => '일감',
  text: (g, s) => {
    const lines = s.offers.map((o) => `${o.kind === 'works' ? `${o.client} 공사장에서 ${kindName(g, o.kind)}` : `${o.client}의 ${kindName(g, o.kind)}`}, ${monthsOf(g, o.kind)}달, 은화 ${o.pay}닢`);
    const gate = banned(g) ? ' 조합 명부에서 이름이 지워진 뒤라 큰 일은 아무도 맡기지 않는다.' : rankOf(g) < 2 && skillRank(g) >= 2 && !frontierSite(here(g)) ? ' 솜씨는 있어도 조합의 표식이 없으면 큰 일은 맡을 수 없다.' : '';
    return `${placeName(here(g))}에서 들어온 일감이다. ${lines.join('. ')}.${gate}`;
  },
  choices: (g, s) => [...s.offers.map((o, i) => ({ label: `${J(kindName(g, o.kind), '을/를')} 맡는다`, key: `o${i}` })), { label: '이번엔 맡지 않는다', key: 'none' }],
  resolve(g, rng, s, key) {
    if (key === 'none') return '값이 맞지 않았다. 연장 자루를 도로 내려놓았다.';
    const o = s.offers[Number(key.slice(1))];
    B(g).job = { kind: o.kind, place: here(g), client: o.client, pay: o.pay, left: monthsOf(g, o.kind), need: monthsOf(g, o.kind), mat: null, cut: false, q0: 0, started: mi(g), away: 0, works: o.kind === 'works' ? worksHere(g) : null };
    queueScene(g, 'builder_mat', {}, { first: true });
    return `${J(o.kind === 'works' ? `${o.client} 감독` : o.client, '과/와')} 손을 맞잡았다. 먼저 재료를 정해야 한다.`;
  },
});

/* ---------- 나무와 돌 고르기 ---------- */
const matCost = (g, j, m) => Math.round(j.pay * (MATS[matSide(g)][m]?.cost ?? 0));
const matOk = (g, m) => { const d = MATS[matSide(g)][m]; return !!d && (!d.need || invented(g, d.need)); };
defineScene('builder_mat', {
  need: (g) => !!B(g).job && !B(g).job.mat && B(g).job.place === here(g),
  title: (g) => (matSide(g) === 'm' ? '돌 고르기' : '나무 고르기'),
  text: (g) => {
    const j = B(g).job, M = MATS[matSide(g)];
    const what = matSide(g) === 'm' ? '채석장과 석회 가마' : '재목상 마당';
    const who = j.kind === 'works' ? `${j.client} 감독` : j.client;
    return `${what}에 들렀다. ${J(who, '은/는')} ${M.good.name} 값으로 은화 ${j.pay}닢을 쳐주기로 했다. ${J(M.cheap.name, '을/를')} 쓰면 값을 깎아 줘야 한다. ${J(M.cut.name, '을/를')} 쓰고 값을 다 받아도 당장은 아무도 모른다. 몇 해 뒤에는 알게 된다.`;
  },
  choices: (g) => {
    const j = B(g).job, M = MATS[matSide(g)];
    const out = [{ label: `${J(M.good.name, '으로/로')} 제대로 짓는다`, key: 'good' }, { label: `${J(M.cheap.name, '으로/로')} 짓고 값을 깎아 준다`, key: 'cheap' }];
    if (matOk(g, 'brick')) out.push({ label: `${J(M.brick.name, '으로/로')} 쌓는다 (은화 ${matCost(g, j, 'brick')}닢 보탬)`, key: 'brick' });
    if (g.player.money >= matCost(g, j, 'fine')) out.push({ label: `내 돈을 보태 ${J(M.fine.name, '을/를')} 쓴다 (은화 ${matCost(g, j, 'fine')}닢)`, key: 'fine' });
    out.push({ label: `${J(M.cut.name, '을/를')} 쓰고 값은 다 받는다`, key: 'cut' });
    return out;
  },
  resolve(g, rng, s, key) {
    const j = B(g).job, M = MATS[matSide(g)][key];
    if (!M) return '재료를 정하지 못했다.';
    j.mat = key; j.q0 = M.q;
    if (key === 'cheap') { j.pay = Math.round(j.pay * 0.85); return `${J(M.name, '으로/로')} 하기로 했다. 값을 깎아 주자 ${j.client}의 얼굴이 펴졌다.`; }
    if (key === 'cut') { j.cut = true; j.pay = Math.round(j.pay * 1.2); return `${J(M.name, '을/를')} 실었다. 겉으로는 똑같아 보인다. 남는 돈은 내 주머니로 들어간다.`; }
    if (key === 'fine' || key === 'brick') { const c = pay(g, matCost(g, j, key)); return `${J(M.name, '을/를')} 실어 왔다. 은화 ${c}닢을 내 돈으로 보탰다. 이 일은 내 이름을 걸고 한다.`; }
    return `${J(M.name, '을/를')} 골라 수레에 실었다. 받은 값만큼 짓는다.`;
  },
});

/* ---------- 다 지은 날 ---------- */
const SMALL_NAME = { shed: '헛간', roof: '지붕', wall: '돌담', house: '집', mill: '방앗간', windmill: '풍차', brickhouse: '벽돌집', street: '돌길', palisade: '목책', factoryhall: '공장 건물' };
export function addBuilt(g, rec) {
  const s = B(g);
  const r = { id: s.seq++, gone: null, by: g.player.name, fam: g.player.lastName ?? null, mark: s.mark, y: g.date.year, ...rec };
  s.built.push(r);
  if (s.built.length > 40) { const i = s.built.findIndex((b) => b.gone || !b.big); s.built.splice(i < 0 ? 0 : i, 1); }
  return r;
}
export function finishJob(g, rng) {
  const s = B(g), j = s.job, pl = j.place, d = KINDS[j.kind];
  let q = skill(g) * 0.7 + 15 + j.q0 + rng.int(-10, 10) + (s.mark ? 4 : 0);
  if (['bridge', 'ironbridge'].includes(j.kind) && invented(g, 'survey')) q += 8;
  q = Math.round(clamp(q, 0, 100));
  g.player.money += j.pay; s.earned += j.pay; s.done += 1;
  if (!s.places.includes(pl)) s.places.push(pl);
  addFame(g, 'builder', d.big ? 4 : 1);
  s.job = null;
  const kn = kindName(g, j.kind);
  let extra = '';
  if (j.kind === 'palisade') { const st = FS(g).sites[pl]; if (st) { st.safety = clamp((st.safety ?? 0) + 15, 0, 100); extra = ' 목책 안에서 처음으로 다들 깊이 잤다고 했다.'; } }
  if (j.kind === 'camphall') { const st = FS(g).sites[pl]; if (st) st.morale = clamp((st.morale ?? 50) + 10, 0, 100); }
  if (j.kind === 'works' && j.works) {
    const w = WS(g).w[j.works];
    if (w) { w.progress += 20; w.myMonths += j.need; if (!s.worksPart.includes(j.works)) s.worksPart.push(j.works); }
    logB(g, `${WORKS[j.works].name}에서 맡은 몫을 끝냈다.`);
    return `${WORKS[j.works].name} 공사장에서 맡은 몫을 끝냈다. 감독이 은화 ${j.pay}닢을 세어 주었다.${s.mark ? ` 내가 놓은 돌마다 ${J(MARKS[s.mark].carve, '을/를')} 새겼다.` : ''}`;
  }
  if (j.kind === 'roof') { logB(g, `${j.client}의 지붕을 갈았다.`); return `${j.client}의 지붕을 새로 이었다. 은화 ${j.pay}닢을 받았다. 다음 비에 새는 데가 없으면 그걸로 됐다.`; }
  const rec = addBuilt(g, { kind: j.kind, place: pl, q, cut: j.cut, big: !!d.big, name: `${townName(pl)} ${j.client}의 ${SMALL_NAME[j.kind] ?? kn}`, client: j.client });
  logB(g, `${placeName(pl)}에 ${J(kn, '을/를')} 지었다.`);
  if (d.big) queueScene(g, 'builder_name', { id: rec.id }, { first: true });
  const look = j.cut ? '겉보기엔 멀쩡하다.' : `보는 사람마다 ${qualWord(q)} 건물이라고 했다.`;
  return `${j.client}의 ${J(kn, '을/를')} 다 지었다. ${look} 은화 ${j.pay}닢을 받았다.${extra}`;
}

/* ---------- 이름이 남는 건물 ---------- */
const recOf = (g, id) => B(g).built.find((b) => b.id === id) ?? null;
defineScene('builder_name', {
  need: (g, s) => !!recOf(g, s.id) && !recOf(g, s.id).named,
  title: () => '이름을 붙이는 날',
  text: (g, s) => {
    const r = recOf(g, s.id), kn = kindName(g, r.kind);
    return `${placeName(r.place)}의 ${J(kn, '이/가')} 다 섰다. ${J(r.client, '이/가')} 머릿돌에 새길 이름을 물었다.${B(g).mark ? ` 머릿돌 아래 구석에는 내 표식 ${J(MARKS[B(g).mark].carve, '을/를')} 새길 자리가 비어 있다.` : ''}`;
  },
  choices: (g, s) => {
    const r = recOf(g, s.id), kn = kindName(g, r.kind);
    return [
      { label: `"${g.player.name}의 ${kn}"`, key: 'mine' },
      { label: `"${townName(r.place)} ${kn}"`, key: 'place' },
      { label: `이름은 ${r.client}에게 맡긴다`, key: 'client' },
    ];
  },
  resolve(g, rng, s, key) {
    const r = recOf(g, s.id), kn = kindName(g, r.kind);
    r.named = true;
    if (key === 'mine') { r.name = `${g.player.name}의 ${kn}`; L(g).renown += 1; }
    else if (key === 'place') r.name = `${townName(r.place)} ${kn}`;
    else { r.name = `${pick(rng, NAMES)} ${kn}`; deed(g, 'generous', 3, `${g.player.name}, ${kn} 이름을 의뢰인에게 내주다`); }
    leaveWork(g, 'builder', '건물', r.name, 40);
    const tail = key === 'client' ? `${J(r.client, '은/는')} 돌아가신 아버지 이름을 붙였다.` : '석공이 머릿돌에 글자를 깊이 팠다.';
    return `${Q(r.name, '이/가')} 되었다. ${tail}${r.mark ? ` 아무도 눈여겨보지 않는 구석에 ${J(MARKS[r.mark].carve, '이/가')} 새겨졌다.` : ''}`;
  },
});

/* ---------- 무너진 일과 책임 ---------- */
const fixCost = (r) => Math.round((KINDS[r.kind]?.pay ?? 20) * 0.6);
defineScene('builder_fall', {
  need: (g, s) => !!recOf(g, s.id) && recOf(g, s.id).by === g.player.name,
  title: (g, s) => `${J(kindName(g, recOf(g, s.id).kind), '이/가')} 무너졌다`,
  text: (g, s) => {
    const r = recOf(g, s.id), kn = kindName(g, r.kind);
    const why = s.why ? `${s.why}에 ` : '';
    const hurt = s.hurt ? ` 안에 있던 사람 ${s.hurt}명이 다쳤다.` : ' 다친 사람은 없었다.';
    const talk = r.cut ? ' 무너진 자리를 들여다본 사람들이 수군거린다. 재료가 이상하다고.' : ' 사람들이 나를 쳐다본다.';
    return `${placeName(r.place)}에서 소식이 왔다. ${r.y}년에 지은 ${Q(r.name, '이/가')} ${why}무너졌다.${hurt}${talk}`;
  },
  choices: (g, s) => {
    const r = recOf(g, s.id), out = [{ label: '내 잘못이라 말하고 물어 준다', key: 'own' }];
    if (g.player.money >= fixCost(r)) out.push({ label: `내 돈으로 다시 짓는다 (은화 ${fixCost(r)}닢)`, key: 'rebuild' });
    out.push({ label: r.cut ? '재목상이 속였다고 말한다' : '의뢰인이 손을 대서 그렇다고 말한다', key: 'blame' });
    out.push({ label: '아무 말도 하지 않는다', key: 'silent' });
    return out;
  },
  resolve(g, rng, s, key) {
    const r = recOf(g, s.id), st = B(g), kn = kindName(g, r.kind);
    if (key === 'own') {
      const n = pay(g, Math.round(fixCost(r) * (s.hurt ? 1 : 0.5)));
      st.owned += 1; deed(g, 'honest', 5, `${g.player.name}, 무너진 ${kn} 값을 물어 주다`, r.place);
      if (r.cut) addFame(g, 'builder', -4);
      return `${placeName(r.place)}에 가서 머리를 숙였다. ${n ? `은화 ${n}닢을 내놓았다.` : '내놓을 돈이 없어 다음 해 품삯으로 갚겠다고 했다.'}${r.cut ? ' 재료를 속인 것까지 털어놓았다. 조합은 벌금으로 끝냈다. 그날 밤 술이 쓰지 않았다.' : ' 사람들은 그 목수는 도망치지 않았다고 말했다.'}`;
    }
    if (key === 'rebuild') {
      pay(g, fixCost(r)); st.owned += 1;
      r.gone = null; r.cut = false; r.q = Math.round(clamp(skill(g) * 0.7 + 25, 0, 100)); r.y = g.date.year;
      deed(g, 'honest', 4, `${g.player.name}, 무너진 ${J(kn, '을/를')} 제 돈으로 다시 짓다`, r.place); deed(g, 'generous', 3, null, r.place);
      tired(g, 20); gainSkill(g, 'building', 1.5, 'str');
      return `석 달 동안 ${placeName(r.place)}에 머물며 처음부터 다시 쌓았다. 이번엔 손으로 하나하나 쓸어 보며 맞췄다. ${Q(r.name, '이/가')} 다시 섰다.`;
    }
    if (key === 'blame') {
      if (r.cut && rng.chance(0.45)) {
        addFame(g, 'builder', -10); deed(g, 'honest', -8, `${g.player.name}, 재료를 속이고 남 탓을 하다`, r.place);
        reportCrime(g, 'fraud', r.place, { mult: 0.6 });
        if (st.mark) { st.guild.banned = mi(g) + 60; logB(g, '조합이 내 이름을 명부에서 지웠다.'); }
        return `재목상이 장부를 들고 나왔다. 내가 고른 재료가 거기 적혀 있었다.${st.mark ? ' 조합은 다섯 해 동안 내 이름을 명부에서 지웠다.' : ''} 고발이 들어갔다는 말도 들었다.`;
      }
      deed(g, 'honest', -4, null, r.place); stress(g, 6);
      return `말을 꺼내자 사람들 시선이 ${r.cut ? '재목상에게' : `${r.client}에게`} 옮겨 갔다. 그쪽은 억울하다고 했다. 믿는 사람 반, 안 믿는 사람 반이었다.`;
    }
    stress(g, r.cut ? 14 : 6); addFame(g, 'builder', -3);
    if (s.hurt) deed(g, 'kind', -4, null, r.place);
    return `${placeName(r.place)} 쪽으로는 가지 않았다. 몇 달이 지나자 그 얘기를 꺼내는 사람이 줄었다. 나는 잊지 못했다.`;
  },
});
export function fallOf(g, rng, r, why) {
  r.gone = { y: g.date.year, how: why ? `${why}에 무너짐` : '무너짐' };
  B(g).falls += 1;
  const mine = r.by === g.player.name;
  const peopleIn = ['house', 'brickhouse', 'hall', 'chapel', 'bridge', 'tower', 'station', 'mill', 'camphall', 'ironbridge', 'factoryhall'].includes(r.kind);
  const hurt = peopleIn && rng.chance(0.5) ? rng.int(1, r.big ? 7 : 3) : 0;
  logB(g, `${J(r.name, '이/가')} 무너졌다.`);
  if (r.big) chron(g, `${placeName(r.place)}의 ${J(r.name, '이/가')} 무너지다.`, mine ? 40 : 15);
  if (mine && !g.over) { if (!sceneQueued(g, 'builder_fall')) queueScene(g, 'builder_fall', { id: r.id, why: why ?? null, hurt }); }
  else note(g, `선대가 지은 ${Q(r.name, '이/가')} 무너졌다는 소식을 들었다.`);
}

/* ---------- 조합의 장인 시험과 표식 ---------- */
export const examReady = (g) => isBuilder(g) && !B(g).mark && skill(g) >= 50 && B(g).done >= 4 && B(g).places.length >= 2 && GUILD_TOWNS.includes(here(g)) && B(g).guild.banned <= mi(g) && mi(g) - B(g).examAt >= 12;
const PIECE = { carpenter: '못 하나 쓰지 않고 짜 맞춘 나선 계단 모형', mason: '쐐기돌 하나로 버티는 작은 아치' };
ACTIONS.push({
  id: 'builder_exam', name: '장인 시험을 청한다', icon: 'hammer',
  desc: '조합장과 장인들 앞에 걸작을 낸다. 붙으면 장인의 표식을 얻고, 다리와 예배당 같은 큰 일을 맡는다.',
  available: (g) => free(g) && examReady(g) && !sceneQueued(g, 'builder_exam') && !sceneQueued(g, 'builder_mark'),
  run(g) { queueScene(g, 'builder_exam', {}, { first: true }); return `${placeName(here(g))} 조합 회관 문을 두드렸다.`; },
});
defineScene('builder_exam', {
  need: (g) => examReady(g),
  title: () => '장인 시험',
  text: (g) => `조합 회관 긴 탁자에 늙은 장인 일곱이 앉아 있다. 걸작으로 ${J(PIECE[trade(g)], '을/를')} 내야 한다. 석 달 안에. 직인 시절 일한 고장은 ${B(g).places.map(placeName).join(', ')}. 심사비는 은화 20닢이다.`,
  choices: (g) => [
    { label: '석 달 밤을 새워 내 손으로 만든다', key: 'make' },
    ...(g.player.money >= 80 ? [{ label: '떠돌이 장인의 걸작을 사서 낸다 (은화 60닢)', key: 'buy' }] : []),
    { label: '아직 손이 덜 여물었다. 다음에 온다', key: 'later' },
  ],
  resolve(g, rng, s, key) {
    const st = B(g); st.examAt = mi(g);
    if (key === 'later') return '회관을 나왔다. 긴 탁자의 장인들은 고개를 끄덕였다. 서두르는 직인보다 낫다는 얼굴이었다.';
    pay(g, 20); st.guild.tries += 1;
    if (key === 'buy') {
      pay(g, 60);
      if (rng.chance(0.3)) { st.guild.banned = mi(g) + 60; deed(g, 'honest', -6, `${g.player.name}, 장인 시험에 남의 걸작을 내다`); return '맨 끝자리 장인이 걸작을 뒤집어 보더니 웃었다. "이건 그뤼네발트 영감 솜씨야. 이음새 깎는 버릇을 내가 알지." 다섯 해 동안 조합 명부에 이름을 올릴 수 없게 되었다.'; }
      queueScene(g, 'builder_mark', {}, { first: true });
      return '장인들이 걸작을 돌려 보며 오래 말이 없었다. 마침내 조합장이 망치로 탁자를 두드렸다. 붙었다. 기쁘지 않았다.';
    }
    tired(g, 30); const v = gainSkill(g, 'building', 2, 'agi');
    if (check(rng, skill(g) + (g.player.stats.agi ?? 0) / 4, 62)) {
      queueScene(g, 'builder_mark', {}, { first: true });
      return `석 달 동안 작업대 앞에서 잤다. 걸작을 내놓자 장인 하나가 일어나 손끝으로 이음새를 오래 쓸었다. 조합장이 망치로 탁자를 두드렸다. 붙었다.${gains([bUp(v)])}`;
    }
    stress(g, 10);
    return `걸작을 내놓았다. 장인들이 한 군데를 가리켰다. 이음새 하나가 머리카락만큼 떴다. 한 해 뒤에 다시 오라고 했다.${gains([bUp(v)])}`;
  },
});
defineScene('builder_mark', {
  need: (g) => !B(g).mark,
  title: () => '장인의 표식',
  text: (g) => `조합 명부에 이름을 올리는 날이다. 앞으로 내가 놓는 돌과 들보마다 새길 표식을 정해야 한다. 한 번 정하면 바꾸지 못한다.${B(g).famMark ? ` 집안 어른이 쓰던 표식은 ${J(MARKS[B(g).famMark].name, '이었/였')}다.` : ''}`,
  choices: (g) => [
    ...(B(g).famMark ? [{ label: `집안의 ${J(MARKS[B(g).famMark].name, '을/를')} 잇는다`, key: 'fam' }] : []),
    ...MARK_IDS.filter((id) => id !== B(g).famMark).map((id) => ({ label: MARKS[id].name, key: id })),
  ],
  resolve(g, rng, s, key) {
    const st = B(g), id = key === 'fam' ? st.famMark : key;
    st.mark = id; logB(g, `장인의 표식 ${J(MARKS[id].name, '을/를')} 받았다.`);
    note(g, `조합의 장인이 되었다. 표식은 ${MARKS[id].name}.`);
    chron(g, `${g.player.name}, ${placeName(here(g))} 조합의 장인이 되다.`, 30);
    addFame(g, 'builder', 6); L(g).renown += 1;
    return key === 'fam' ? `명부에 ${J(MARKS[id].name, '을/를')} 그렸다. 조합장이 고개를 들었다. "그 표식, 오랜만에 보는군." 집안 어른 이름을 기억하는 사람이 아직 있었다.` : `명부의 내 이름 옆에 ${J(MARKS[id].carve, '을/를')} 그렸다. 이제 직인이 아니다.`;
  },
});

/* ---------- 내 작업장과 도제 ---------- */
export const SHOP_COST = 50;
export const shopOk = (g) => free(g) && adult(g) && isBuilder(g) && !B(g).shop && g.player.money >= SHOP_COST && (GUILD_TOWNS.includes(here(g)) ? !!B(g).mark && B(g).guild.banned <= mi(g) : skillRank(g) >= 1);
ACTIONS.push({
  id: 'builder_shop', name: '작업장을 연다', icon: 'home',
  desc: `은화 ${SHOP_COST}닢. 연장과 재목을 쌓아 둘 마당과 지붕. 도제를 들일 수 있고, 일감이 없는 달에도 자잘한 수리가 들어온다. 큰 도시에선 장인만 연다.`,
  available: (g) => shopOk(g),
  run(g) {
    const st = B(g); pay(g, SHOP_COST);
    st.shop = { place: here(g), name: st.mark ? `${MARKS[st.mark].name} 작업장` : `${g.player.name}네 작업장`, since: g.date.year, rep: 10, app: [], appAt: 0 };
    logB(g, `${placeName(here(g))}에 작업장을 열었다.`);
    return `${placeName(here(g))} 변두리에 마당 넓은 헛간을 얻었다. 작업대를 짜고 문 위에 ${st.mark ? `${J(MARKS[st.mark].carve, '을/를')} 새긴 간판을` : '이름 쓴 널빤지를'} 걸었다.`;
  },
});
const appCand = (g) => g.people.filter((p) => p.alive && (p.place ?? 'ern') === here(g) && p.ageMonths >= 12 * 12 && p.ageMonths < 18 * 12 && !B(g).shop?.app.some((a) => a.id === p.id) && !(g.player.childIds ?? []).includes(p.id));
ACTIONS.push({
  id: 'builder_apprentice', name: '도제를 들인다', icon: 'visit',
  desc: '열두어 살 아이를 작업장에 들여 먹이고 재우며 가르친다. 일손이 늘어 의뢰가 빨리 끝나고, 몇 해 뒤엔 직인이 되어 떠난다.',
  available: (g) => free(g) && shopHere(g) && B(g).shop.app.length < 2 && mi(g) - (B(g).shop.appAt ?? 0) >= 6 && skillRank(g) >= 1,
  run(g, rng) {
    const sh = B(g).shop;
    let p = pick(rng, appCand(g));
    if (!p) { p = makePerson(rng, { sex: rng.chance(0.8) ? 'm' : 'f', ageMonths: rng.int(12, 15) * 12 }); p.place = here(g); g.people.push(p); }
    sh.app.push({ id: p.id, name: p.name, since: mi(g) }); sh.appAt = mi(g);
    logB(g, `${J(p.name, '을/를')} 도제로 들였다.`);
    const lines = [`${J(p.name, '이/가')} 보따리 하나를 들고 왔다. 첫날은 대팻밥만 쓸었다.`, `${p.name}의 어머니가 아이 손을 내 손에 쥐여 주며 굶기지만 말아 달라고 했다.`, `${J(p.name, '은/는')} 끌을 쥐는 법부터 틀렸다. 나도 그랬다.`];
    return pick(rng, lines);
  },
});
defineScene('builder_journey', {
  need: (g, s) => !!B(g).shop?.app.some((a) => a.id === s.id),
  title: () => '직인이 되어 떠나는 날',
  text: (g, s) => { const a = B(g).shop.app.find((x) => x.id === s.id); return `${J(a.name, '이/가')} 도제로 들어온 지 네 해가 지났다. 이제 혼자 서까래를 올린다. 직인이 되어 다른 고장 장인 밑에서 떠돌며 배울 때가 왔다.`; },
  choices: () => [{ label: '내 연장 한 벌을 물려 보낸다', key: 'tools' }, { label: '그냥 보낸다', key: 'send' }, { label: '한 해만 더 붙잡아 둔다', key: 'keep' }],
  resolve(g, rng, s, key) {
    const sh = B(g).shop, a = sh.app.find((x) => x.id === s.id), p = g.people.find((x) => x.id === s.id);
    if (key === 'keep') { a.since += 12; return `${J(a.name, '은/는')} 고개를 끄덕였지만 그해 내내 말수가 적었다.`; }
    sh.app = sh.app.filter((x) => x.id !== s.id);
    if (p && p.alive) { p.job = trade(g) === 'mason' ? 'mason' : 'carpenter'; }
    sh.rep = clamp(sh.rep + 5, 0, 100);
    logB(g, `도제 ${J(a.name, '이/가')} 직인이 되어 떠났다.`);
    if (key === 'tools') { deed(g, 'generous', 3, null); return `손때 묻은 대패와 끌 한 벌을 싸 주었다. ${J(a.name, '은/는')} 그걸 안고 한참 서 있다가 큰절을 했다.`; }
    return `${J(a.name, '이/가')} 길을 떠났다. 작업장이 하루 종일 조용했다.`;
  },
});
