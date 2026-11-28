// 12단계: 원수와 복수.
// 나에게, 내 집안에 원한을 품은 사람을 기록한다. 원한(heat)은 사람마다, 왜 미워하는지(why)와 함께.
// 원한은 relations의 호감·원수(bond 'enemy')·나쁜 기억, 들킨 살인, 옛 친구의 등 돌림에서 생긴다.
// 원한이 깊으면 그 사람이 복수에 나선다: 험담 → 훼방 → 사람을 사서 습격 → 결투나 내 식구를 노림.
// 나도 복수를 꾸밀 수 있고(망신·살림 망치기·사람 사서 혼내기·결투·목숨), 화해를 청할 수도 있다(사과·피의 값·무릎).
// 원한을 품은 사람이 죽으면 자식이나 배우자가 그 원한을 물려받고, 내가 죽으면 내 자식이 원수를 물려받는다.
// 상태는 game.feud 하나. 화면 연결점: feudInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, fullName, has, ageYears, living, bodyAgeOf, kill } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { rel, remember, relState } from '../relations.js';
import { isJailed, crimeState, reportCrime, assassinate } from '../crime.js';
import { deed } from '../repute/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- 상태 ---------- */
export function feudState(g) {
  g.feud ??= {};
  const f = g.feud;
  f.grudges ??= {};   // 사람 id → { heat, why[], since, gen, formerFriend, strikes, lastStrike, house }
  f.friends ??= {};   // 사람 id → 가장 가까웠던 호감 (우정이 원한으로 바뀌는 것을 알아보려고)
  f.log ??= [];       // [{ y, m, text }]
  f.sceneAt ??= 0;
  f.avenged ??= 0;
  f.forgiven ??= 0;
  f.murders ??= crimeState(g).murders ?? 0;
  return f;
}
const F = feudState;
const grudgeOf = (g, id) => F(g).grudges[id] ?? null;
function log(g, text) { const f = F(g); f.log.push({ y: g.date.year, m: g.date.month, text }); if (f.log.length > 24) f.log.shift(); }
export function heatWord(h) {
  if (h >= 85) return '피를 봐야 끝날 원한';
  if (h >= 65) return '이를 가는 원수';
  if (h >= 45) return '깊은 앙심';
  if (h >= 25) return '묵은 앙금';
  return '서먹한 사이';
}
// 원한을 품는다 (이미 있으면 더 깊어진다)
export function addGrudge(g, p, heat, why, { gen = 0, formerFriend = false } = {}) {
  if (!p || !p.alive || p.isPlayer) return null;
  const f = F(g);
  const gr = f.grudges[p.id] ??= { heat: 0, why: [], since: mi(g), gen, formerFriend: false, strikes: 0, lastStrike: 0, house: p.lastName };
  gr.heat = clamp(Math.max(gr.heat, 0) + heat, 0, 100);
  if (why && !gr.why.includes(why)) { gr.why.push(why); if (gr.why.length > 4) gr.why.shift(); }
  if (formerFriend) gr.formerFriend = true;
  gr.gen = Math.max(gr.gen, gen);
  rel(p);
  p.known = true;
  if (gr.heat >= 40) p.bond = p.bond === 'spouse' ? 'spouse' : 'enemy';
  p.affection = Math.min(p.affection, -Math.round(gr.heat * 0.6));
  return gr;
}
function ease(g, p, n) {
  const gr = grudgeOf(g, p.id);
  if (!gr) return;
  gr.heat = clamp(gr.heat - n, 0, 100);
  if (gr.heat < 15) {
    delete F(g).grudges[p.id];
    if (p.bond === 'enemy') p.bond = null;
    p.affection = Math.max(p.affection, -5);
  }
}
const whyFromMemory = (p) => (p.memories ?? []).filter((m) => m.tone < 0).map((m) => m.text).slice(-2);
const ready = (g) => isAdult(g) && !traveling(g) && !isJailed(g) && !g.over;
const foes = (g) => Object.entries(F(g).grudges).map(([id, gr]) => [byId(g, Number(id)), gr]).filter(([p]) => p && p.alive);

/* ---------- 상태 읽기 (화면용) ---------- */
export function feudInfo(g) {
  const f = F(g);
  const list = foes(g).sort((a, b) => b[1].heat - a[1].heat).map(([p, gr]) => ({
    id: p.id, name: fullName(p), age: ageYears(p), heat: Math.round(gr.heat), heatWord: heatWord(gr.heat),
    why: gr.why.slice(), gen: gr.gen, inherited: gr.gen > 0, formerFriend: !!gr.formerFriend, house: p.lastName,
    place: p.place ?? 'ern', strikes: gr.strikes,
  }));
  const byHouse = {};
  for (const x of list) (byHouse[x.house] ??= []).push(x);
  const houses = Object.entries(byHouse).filter(([, xs]) => xs.length >= 2 || xs.some((x) => x.inherited)).map(([name, xs]) => ({ name, count: xs.length, heat: Math.max(...xs.map((x) => x.heat)), gens: Math.max(...xs.map((x) => x.gen)) + 1 }));
  const nemeses = (L(g).nemeses ?? []).filter((n) => n.alive).map((n) => ({ name: n.name, grudge: n.grudge ?? 1, place: n.place ?? null }));
  return { foes: list, houses, nemeses, avenged: f.avenged, forgiven: f.forgiven, log: f.log.slice(-8).map((x) => ({ ...x })) };
}

/* ---------- 매달: 원한이 생기고, 깊어지고, 물려지고, 움직인다 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const f = F(g);
  const meP = me(g);
  const now = mi(g);
  // 1) relations의 원수와 깊은 반감을 원한으로 옮긴다
  for (const p of g.people) {
    if (p.isPlayer || !p.alive || !p.known) continue;
    const gr = f.grudges[p.id];
    if (p.affection >= 35) f.friends[p.id] = Math.max(f.friends[p.id] ?? 0, p.affection);
    if (!gr && (p.bond === 'enemy' || p.affection <= -40)) {
      const was = (f.friends[p.id] ?? 0) >= 35;
      addGrudge(g, p, Math.min(80, Math.max(30, -p.affection)), whyFromMemory(p)[0] ?? (was ? '믿었던 만큼 미워하게 되었다' : '나를 미워한다'), { formerFriend: was });
      if (was) {
        log(g, `옛 친구 ${J(p.name, '이/가')} 원수가 되었다.`);
        if (!sceneQueued(g, 'feud_turned') && ready(g)) queueScene(g, 'feud_turned', { id: p.id });
      }
    } else if (gr && p.bond !== 'enemy' && p.affection > -10) ease(g, p, 3);
  }
  // 2) 원한은 저절로 식거나 끓는다
  for (const [p, gr] of foes(g)) {
    let d = -0.35;
    if (has(p, 'cruel') || has(p, 'ambitious')) d += 0.45;
    if (has(p, 'kind') || has(p, 'content')) d -= 0.4;
    if (gr.gen > 0) d += 0.15; // 물려받은 원한은 잘 식지 않는다
    gr.heat = clamp(gr.heat + d, 0, 100);
    if (gr.heat < 10) ease(g, p, 10);
  }
  // 3) 원한을 품은 사람이 죽었다: 원한은 식구에게 넘어간다
  for (const [id, gr] of Object.entries(f.grudges)) {
    const p = byId(g, Number(id));
    if (p && p.alive) continue;
    delete f.grudges[id];
    if (!p || gr.heat < 45) continue;
    const heirs = living(g).filter((q) => !q.isPlayer && q.id !== meP.id && ageYears(q) >= 12
      && (q.fatherId === p.id || q.motherId === p.id || q.spouseId === p.id || p.spouseId === q.id || (p.fatherId != null && q.fatherId === p.fatherId)))
      .sort((a, b) => (b.fatherId === p.id || b.motherId === p.id ? 1 : 0) - (a.fatherId === p.id || a.motherId === p.id ? 1 : 0));
    const h = heirs[0];
    if (!h || g.player.familyIds.includes(h.id)) continue;
    const rel2 = h.fatherId === p.id || h.motherId === p.id ? (p.sex === 'm' ? '아버지' : '어머니') : h.spouseId === p.id || p.spouseId === h.id ? (p.sex === 'm' ? '남편' : '아내') : (p.sex === 'm' ? '형제' : '자매');
    addGrudge(g, h, gr.heat * 0.7, `${rel2} ${p.name}의 원한을 물려받았다`, { gen: gr.gen + 1 });
    log(g, `${p.name}의 원한이 ${rel2 === '아버지' || rel2 === '어머니' ? '자식' : '식구'} ${h.name}에게 넘어갔다.`);
    g.news.unshift({ text: `${J(p.name, '이/가')} 죽기 전 ${h.name}에게 무언가를 당부했다고 한다. 내 이름이었다는 말이 돈다.`, rel: 100 });
  }
  // 4) 내가 죽인 사람의 식구들
  const murders = crimeState(g).murders ?? 0;
  if (murders > f.murders) {
    const caught = crimeState(g).record.slice(-3).some((r) => r.c === 'murder' && now - r.at <= 1);
    const dead = g.people.filter((p) => !p.alive && !p.isPlayer && ['괴한의 칼', '알 수 없는 병'].includes(p.deathCause) && p.history.at(-1)?.y === g.date.year && Math.abs((p.history.at(-1)?.m ?? 0) - g.date.month) <= 1);
    for (const v of dead) {
      for (const q of living(g)) {
        if (q.isPlayer || g.player.familyIds.includes(q.id) || ageYears(q) < 10) continue;
        if (!(q.spouseId === v.id || q.fatherId === v.id || q.motherId === v.id || v.childIds.includes(q.id) || v.spouseId === q.id)) continue;
        if (caught || rng.chance(0.3)) addGrudge(g, q, caught ? 85 : 45, `${v.name}의 죽음 뒤에 내가 있다고 ${caught ? '안다' : '의심한다'}`, { gen: 0 });
      }
    }
  }
  f.murders = murders;
  // 5) 원수가 움직인다
  if (!ready(g) || L(g).queue.some((x) => /^feud_/.test(x.kind)) || L(g).queue.length > 2 || now - f.sceneAt < 4) return;
  const fire = (kind, data) => { f.sceneAt = now; queueScene(g, kind, data); };
  const list = foes(g).sort((a, b) => b[1].heat - a[1].heat);
  for (const [p, gr] of list) {
    if (gr.heat >= 50 && now - gr.lastStrike >= 8 && rng.chance(gr.heat / 1800 + (gr.gen > 0 ? 0.01 : 0))) {
      gr.lastStrike = now;
      return fire('feud_strike', { id: p.id, step: Math.min(3, gr.strikes) });
    }
  }
  // 늙은 원수가 죽기 전에 부른다
  const old = list.find(([p, gr]) => bodyAgeOf(p) >= 62 && gr.heat < 75);
  if (old && rng.chance(0.02)) return fire('feud_deathbed', { id: old[0].id });
  // 오래 묵은 원한, 먼저 손을 내미는 사람
  const soft = list.find(([p, gr]) => gr.heat < 45 && now - gr.since >= 36 && !has(p, 'cruel'));
  if (soft && rng.chance(0.015)) return fire('feud_offer', { id: soft[0].id });
});

/* ---------- 옛 친구가 원수가 되었다 ---------- */
defineScene('feud_turned', {
  title: () => '등 돌린 친구',
  text: (g, s) => {
    const p = byId(g, s.id);
    const why = grudgeOf(g, s.id)?.why[0];
    return `${J(p.name, '이/가')} 길에서 나를 보고도 모른 척 지나갔다. 한때 같은 잔을 나누던 사이였다.${why ? ` "${why}." 그 일이 아직 ${p.sex === 'm' ? '그' : '그녀'}의 가슴에 박혀 있다.` : ''}`;
  },
  choices: (g, s) => (byId(g, s.id)?.alive && grudgeOf(g, s.id) ? [{ label: '찾아가서 따져 묻는다', key: 'ask' }, { label: '먼저 미안하다고 한다', key: 'sorry' }, { label: '나도 등을 돌린다', key: 'turn' }] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (!p) return '그 사람은 이제 없다.';
    if (key === 'turn') { addGrudge(g, p, 8, null); stress(g, 6); return '나도 고개를 돌렸다. 둘 다 돌아보지 않았다. 그렇게 한 고장에서 남이 되었다.'; }
    if (key === 'sorry' && check(rng, g.player.stats.cha * 0.5 + (F(g).friends[p.id] ?? 0) * 0.4, 30 + (grudgeOf(g, p.id)?.heat ?? 50) * 0.4)) {
      ease(g, p, 35); p.affection = Math.max(p.affection, 10); remember(g, p, '먼저 사과해 왔다', 1, { tag: 'reconcile' });
      return `미안하다고 했다. ${J(p.name, '은/는')} 한참 말이 없다가, 술이나 한잔하자고 했다. 예전처럼은 아니어도, 원수는 아니게 되었다.`;
    }
    if (key === 'ask') { addGrudge(g, p, 6, null); return `따져 물었다. 말이 말을 불렀다. ${J(p.name, '은/는')} 마지막에 "너는 늘 그랬어"라고 했다. 무엇을 늘 그랬는지는 끝내 말하지 않았다.`; }
    addGrudge(g, p, 3, null);
    return '미안하다고 했지만, 그 말은 너무 늦게 도착했다.';
  },
});

/* ---------- 원수의 복수 ---------- */
const STRIKE_TITLE = ['뒤에서 도는 말', '훼방', '밤길의 습격', '마지막 원한'];
defineScene('feud_strike', {
  title: (g, s) => STRIKE_TITLE[s.step] ?? '원수의 손',
  text: (g, s) => {
    const p = byId(g, s.id);
    const gr = grudgeOf(g, s.id);
    const inh = gr?.gen > 0 ? ` ${gr.why.find((w) => /물려받/.test(w)) ?? ''}` : '';
    return [
      `${J(p.name, '이/가')} 여관과 장터를 돌며 내 이야기를 하고 다닌다. 반은 거짓이고 반은 부풀린 것이다.${inh}`,
      `내 일이 자꾸 꼬였다. 물건이 사라지고, 손님이 끊기고, 맡은 일이 엎어졌다. 알아보니 그 끝에 ${J(p.name, '이/가')} 있었다.${inh}`,
      `밤길에 복면을 쓴 사내들이 앞을 막았다. 누가 보냈는지는 묻지 않아도 알았다. ${p.name}.${inh}`,
      `${J(p.name, '이/가')} 사람들 앞에서 장갑을 던졌다. "${gr?.why[0] ?? '네가 한 짓'}. 오늘 끝을 보자."${inh}`,
    ][s.step];
  },
  choices: (g, s) => {
    const p = byId(g, s.id);
    if (!p || !p.alive || !grudgeOf(g, s.id)) return [];
    if (s.step === 2) return [{ label: '맞서 싸운다', key: 'fight' }, { label: '돈을 던져 주고 물러난다', key: 'pay' }];
    if (s.step === 3) return [{ label: '결투를 받는다', key: 'duel' }, { label: '사람들 앞에서 사죄한다', key: 'bow' }, { label: '거절하고 돌아선다', key: 'refuse' }];
    return [{ label: `${p.name}에게 정면으로 따진다`, key: 'confront' }, { label: '참고 넘긴다', key: 'endure' }, { label: '똑같이 갚아 준다', key: 'back' }];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const gr = grudgeOf(g, s.id);
    if (!p || !gr) return '원수는 이미 손을 거두었다.';
    gr.strikes += 1;
    if (s.step === 0 || s.step === 1) {
      const harm = () => {
        if (s.step === 0) deed(g, 'honest', -8, `${p.name}의 말로는 사람을 속여 먹는다더라`, undefined, { lie: true, src: p.id });
        else { const n = Math.min(g.player.money, rng.int(10, 30)); g.player.money -= n; return n; }
        return 0;
      };
      if (key === 'endure') { const n = harm(); gr.heat = clamp(gr.heat - 4, 0, 100); stress(g, 8); return `참았다.${n ? ` 은화 ${n}닢어치를 잃었다.` : ''} 원수의 분이 조금은 풀렸을지도 모른다. 내 분은 쌓였다.`; }
      if (key === 'back') { harm(); p.wealth = Math.max(0, (p.wealth ?? 0) - rng.int(10, 30)); addGrudge(g, p, 10, null); deed(g, 'kind', -3, null); log(g, `${p.name}에게 똑같이 갚아 주었다.`); return `받은 만큼 돌려주었다. ${p.name}의 가게 앞 진열대가 엎어졌다. 이제 둘 다 물러설 수 없다.`; }
      if (check(rng, g.player.stats.cha * 0.4 + g.player.stats.wil * 0.4, 30 + gr.heat * 0.3)) { gr.heat = clamp(gr.heat - 8, 0, 100); return `${J(p.name, '을/를')} 찾아가 사람들 앞에서 따졌다. 증거를 하나하나 내밀자 ${J(p.name, '은/는')} 얼굴이 붉어져 자리를 떴다. 한동안은 조용할 것이다.`; }
      harm(); addGrudge(g, p, 5, null);
      return `따지러 갔다가 말싸움만 했다. ${J(p.name, '은/는')} 오히려 피해자 행세를 했다. 구경꾼들은 누구 편도 들지 않았다.`;
    }
    if (s.step === 2) {
      if (key === 'pay') { const n = Math.min(g.player.money, rng.int(15, 40)); g.player.money -= n; stress(g, 10); deed(g, 'brave', -4, null); return `주머니를 던져 주었다. 은화 ${n}닢. 사내들은 비웃으며 사라졌다. 다음에는 더 많이 원할 것이다.`; }
      queueFight(g, rng, { title: '원수가 보낸 자들', intro: `${p.name}의 돈을 받은 자들이다.`, enc: { unit: rng.chance(0.5) ? 'thug' : 'bandit', count: rng.int(2, 3), leader: null }, reward: { money: 5 }, avoidLabel: '골목으로 달아난다', avoidText: '골목으로 뛰었다. 뒤에서 욕설이 쫓아왔다.' }, { first: true });
      gr.heat = clamp(gr.heat - 5, 0, 100);
      return '등을 벽에 붙이고 손을 칼자루에 얹었다.';
    }
    // 마지막 원한: 결투
    if (key === 'bow') { ease(g, p, 40); stress(g, 15); deed(g, 'brave', -6, '원수 앞에 무릎을 꿇었다더라'); log(g, `${p.name} 앞에 사죄했다.`); return `사람들 앞에서 고개를 숙였다. 웃음소리가 났다. ${J(p.name, '은/는')} 한참 나를 내려다보다가 침을 뱉고 돌아섰다. 그래도 칼은 거두었다.`; }
    if (key === 'refuse') { addGrudge(g, p, 10, '결투를 피했다'); deed(g, 'brave', -8, '결투를 받고도 꽁무니를 뺐다더라'); return '돌아섰다. 등 뒤에서 "겁쟁이"라는 소리가 들렸다. 원한은 그대로다. 더 깊어졌을 뿐.'; }
    return duel(g, rng, p, gr);
  },
});
// 결투: 내 검술과 몸 대 원수의 힘. 지면 다치고, 이기면 원수는 쓰러진다(죽이거나 살려 준다).
function duel(g, rng, p, gr) {
  const me1 = g.player.skills.sword * 0.6 + (g.player.stats.str + g.player.stats.agi) * 0.25 + rng.int(-12, 12);
  const them = Math.min(70, ageYears(p) * 0.8 + (p.job === 'guard' || p.job === 'adventurer' || p.job === 'knight' ? (p.skill ?? 30) * 0.6 : 15)) + rng.int(-12, 12);
  if (me1 >= them) {
    F(g).avenged += 1;
    deed(g, 'brave', 8, `원수와의 결투에서 이겼다더라`);
    if (rng.chance(0.35)) {
      p.health = Math.max(0, (p.health ?? 50) - 40);
      ease(g, p, 30);
      log(g, `결투에서 ${J(p.name, '을/를')} 이기고 살려 주었다.`);
      return `칼끝이 ${p.name}의 목에 닿았다. 찌르지 않았다. ${J(p.name, '은/는')} 무릎을 꿇은 채 오래 숨을 몰아쉬었다. 원한이 끝난 것인지, 다른 원한이 시작된 것인지는 모르겠다.`;
    }
    kill(g, p, '결투');
    chron(g, `${g.player.name}, 원수 ${J(fullName(p), '을/를')} 결투로 쓰러뜨리다.`, 80);
    log(g, `결투에서 ${J(p.name, '을/를')} 쓰러뜨렸다.`);
    stress(g, 10);
    return `${p.name}의 칼이 먼저 떨어졌다. 그다음은 ${p.name} 자신이었다. 결투는 법이 허락한 죽음이다. 그래도 ${p.name}의 식구들 눈빛은 허락하지 않았다.`;
  }
  g.player.injuries.push({ name: '결투에서 베인 상처', months: rng.int(2, 4) });
  gr.heat = clamp(gr.heat - 15, 0, 100);
  stress(g, 15);
  log(g, `${p.name}과의 결투에서 졌다.`.replace(`${p.name}과`, J(p.name, '과/와')));
  return `${p.name}의 칼이 내 어깨를 갈랐다. 쓰러진 나를 내려다보며 ${J(p.name, '은/는')} 칼을 거두었다. "이걸로 됐다." 목숨은 붙어 있다. 자존심은 아니다.`;
}

/* ---------- 행동: 복수를 꾸미기 ---------- */
const plotTargets = (g) => foes(g).filter(([p]) => !g.player.familyIds.includes(p.id) || p.bond === 'enemy').map(([p]) => p);
ACTIONS.push({
  id: 'feud_plot', name: '복수를 꾸미기', icon: 'sword',
  desc: '원수에게 갚아 줄 길을 찾는다. 망신, 살림 망치기, 사람 사서 혼내기, 결투, 목숨까지. 복수는 또 다른 원한을 부른다.',
  available: (g) => ready(g) && plotTargets(g).length > 0 && !sceneQueued(g, 'feud_plot'),
  run(g) {
    const p = plotTargets(g).sort((a, b) => grudgeOf(g, b.id).heat - grudgeOf(g, a.id).heat)[0];
    if (!p) return '갚아 줄 사람이 없었다.';
    tired(g, 4);
    queueScene(g, 'feud_plot', { id: p.id });
    return `밤늦도록 ${p.name}의 일을 생각했다. 어디가 약한지, 누가 그 사람을 미워하는지, 언제 혼자 다니는지.`;
  },
});
defineScene('feud_plot', {
  title: (g, s) => `${byId(g, s.id)?.name ?? '원수'}에게 갚아 줄 길`,
  text: (g, s) => {
    const p = byId(g, s.id);
    const gr = grudgeOf(g, s.id);
    return `${fullName(p)}, ${ageYears(p)}살. ${heatWord(gr?.heat ?? 0)}. ${gr?.why.length ? `미움의 시작: ${gr.why.join(' / ')}.` : ''} 어떻게 갚아 줄까.`;
  },
  choices: (g, s) => {
    const p = byId(g, s.id);
    if (!p || !p.alive || !grudgeOf(g, s.id)) return [];
    return [
      { label: '사람들 앞에서 망신을 준다', key: 'shame' },
      { label: '살림을 망쳐 놓는다', key: 'ruin' },
      ...(g.player.money >= 20 ? [{ label: '사람을 사서 혼내 준다 (은화 20닢)', key: 'hire' }] : []),
      { label: '정식으로 결투를 청한다', key: 'duel' },
      { label: '목숨을 노린다', key: 'kill' },
      { label: '그만둔다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const gr = grudgeOf(g, s.id);
    if (!p || !gr) return '원수는 이미 없다.';
    if (key === 'none') { stress(g, -2); return '그만두었다. 원한을 쥐고 있으면 내 손이 먼저 썩는다고, 어머니가 말했었다.'; }
    const sneak = (crimeState(g).craft ?? 0) * 0.4 + g.player.stats.int * 0.3 + g.player.stats.cha * 0.3;
    if (key === 'shame') {
      if (check(rng, g.player.stats.cha * 0.6 + g.player.stats.int * 0.3, 35)) {
        p.wealth = Math.max(0, (p.wealth ?? 0) - 5);
        addGrudge(g, p, 12, '사람들 앞에서 망신을 당했다');
        log(g, `${J(p.name, '을/를')} 사람들 앞에서 망신 주었다.`);
        return `장날 광장에서 ${p.name}의 옛 허물을 하나하나 꺼냈다. 웃음소리가 ${p.name}의 등을 따라갔다. 속이 시원했다. 아주 잠깐.`;
      }
      deed(g, 'kind', -3, '사람 망신 주는 걸 즐긴다더라');
      return `망신을 주려다 말이 꼬였다. 웃음거리가 된 것은 나였다.`;
    }
    if (key === 'ruin') {
      if (check(rng, sneak, 38)) {
        p.wealth = Math.max(0, (p.wealth ?? 0) - rng.int(20, 50));
        if (['baker', 'innkeeper', 'shopkeeper', 'merchant', 'smith', 'miller'].includes(p.job) && rng.chance(0.3)) { p.job = 'laborer'; p.history.push({ y: g.date.year, m: g.date.month, text: '가게가 망해 날품팔이가 되었다.' }); }
        addGrudge(g, p, 8, '살림이 망했다');
        log(g, `${p.name}의 살림을 망쳐 놓았다.`);
        return `밤에 ${p.name}의 창고 빗장을 풀어 두었다. 사흘 뒤, 창고가 비었다는 소문이 돌았다. 아무도 나를 의심하지 않았다.`;
      }
      reportCrime(g, 'burglary', L(g).place, { mult: 0.6 });
      addGrudge(g, p, 18, '내 살림에 손을 댔다');
      return `창고 문을 만지다 개가 짖었다. 달아났지만 얼굴을 본 사람이 있었다.`;
    }
    if (key === 'hire') {
      spend(g, 20);
      if (check(rng, sneak + 10, 35)) {
        p.health = Math.max(0, (p.health ?? 60) - 25);
        addGrudge(g, p, 10, '밤길에 얻어맞았다');
        deed(g, 'kind', -4, null);
        log(g, `사람을 사서 ${J(p.name, '을/를')} 혼내 주었다.`);
        return `부두의 건달 둘이 은화를 받아 갔다. 이튿날 ${J(p.name, '이/가')} 얼굴이 퉁퉁 부은 채 지팡이를 짚고 다녔다.`;
      }
      reportCrime(g, 'assault', L(g).place, { mult: 0.5 });
      addGrudge(g, p, 20, '나를 치라고 사람을 보냈다');
      return `건달들은 붙잡히자마자 내 이름을 댔다. 은화 스무 닢은 강물에 버린 셈이다.`;
    }
    if (key === 'duel') return `장갑을 던졌다. ${duel(g, rng, p, gr)}`;
    // 목숨
    const out = assassinate(g, rng, p);
    if (!p.alive) { F(g).avenged += 1; log(g, `${J(p.name, '을/를')} 죽였다.`); }
    return out;
  },
});

/* ---------- 행동: 화해를 청하기 ---------- */
ACTIONS.push({
  id: 'feud_reconcile', name: '화해를 청하기', icon: 'visit',
  desc: '원한을 품은 사람을 찾아가 화해를 청한다. 사과하거나, 피의 값을 치르거나, 무릎을 꿇는다. 원한이 깊을수록 어렵다.',
  available: (g) => ready(g) && foes(g).length > 0 && !sceneQueued(g, 'feud_peace'),
  run(g) {
    const [p] = foes(g).sort((a, b) => a[1].heat - b[1].heat)[0];
    tired(g, 3);
    queueScene(g, 'feud_peace', { id: p.id });
    return `${p.name}의 집 앞까지 갔다. 문을 두드리기까지 한참이 걸렸다.`;
  },
});
// 51단계: 피를 본 원한일 때만 '피의 값'이라 부른다 (헛소문·도둑질에 피의 값은 어색했다)
const bloody = (gr) => (gr.why ?? []).some((w) => /죽|피|다치|때리|때렸|칼|목숨|원수|해쳤/.test(w)) || (gr.gen ?? 0) > 0;
defineScene('feud_peace', {
  title: () => '화해',
  text: (g, s) => {
    const p = byId(g, s.id);
    const gr = grudgeOf(g, s.id);
    // 48단계: 한 줄짜리라 무엇 때문에 찾아왔는지가 안 보였다. 원한의 까닭·세월·지난번 일을 덧붙인다.
    const why = gr.why?.length ? gr.why[gr.why.length - 1] : null;
    const yrs = Math.floor((mi(g) - (gr.since ?? mi(g))) / 12);
    // 51단계: '3번째로'가 아니라 '세 번째로', 같은 문장이 매번 똑같이 나오지 않게, '나를 미워한다' 같은 마음은 그의 입으로 옮기지 않는다
    const ORD = ['두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
    const head = gr.tries ? `${ORD[Math.min(gr.tries - 1, ORD.length - 1)]} 번째로 ${p.name}의 문 앞에 섰다. ` : '';
    const feel = !why || /미워(한다|하게 되었다)$/.test(why);
    const v = (s.id + (gr.tries ?? 0)) % 3;
    const ago = yrs >= 2 ? `${yrs}년이 지났다. ` : '';
    const past = feel ? `${ago}무엇 하나 때문이라기보다 쌓이고 쌓인 미움이다. ` : /다$/.test(why)
      ? `${ago}${[`${p.name}에게 그 일은 아직 한 줄로 남아 있다. "${why}."`, `${p.name}의 입에서 나올 말은 뻔했다. "${why}."`, `그 일을 ${J(p.name, '은/는')} 잊지 않았다. "${why}."`][v]} `
      : `${why}. ${yrs >= 2 ? `${yrs}년째 ` : ''}그게 우리 사이다. `;
    const old = ageYears(p) >= 60 ? ' 머리가 하얗게 셌다. 문틀을 짚은 손이 떨렸다.' : (p.health ?? 60) < 30 ? ' 얼굴이 많이 상해 있었다.' : '';
    return `${head}${past}${J(p.name, '이/가')} 문을 열었다.${old} ${gr.heat >= 65 ? '눈빛이 칼날 같았다.' : gr.heat >= 40 ? '들어오라는 말은 없었지만 문을 닫지도 않았다.' : '오래 나를 보다가 의자를 내주었다.'}${gr.gen > 0 ? ' 이 원한은 우리 둘이 시작한 것도 아니다.' : ''}`;
  },
  choices: (g, s) => {
    const gr = grudgeOf(g, s.id);
    if (!byId(g, s.id)?.alive || !gr) return [];
    const price = Math.round(gr.heat * 2);
    return [
      { label: '진심으로 사과한다', key: 'sorry' },
      ...(g.player.money + g.player.familyMoney >= price ? [{ label: `${bloody(gr) ? '피의 값을 치른다' : '갚을 것을 갚겠다고 은화를 내민다'} (은화 ${price}닢)`, key: 'pay' }] : []),
      { label: '무릎을 꿇는다', key: 'kneel' },
      { label: '그냥 돌아선다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const gr = grudgeOf(g, s.id);
    if (!p || !gr) return '원한은 이미 풀려 있었다.';
    const done = () => { F(g).forgiven += gr.heat < 15 || !grudgeOf(g, p.id) ? 1 : 0; };
    gr.tries = (gr.tries ?? 0) + 1;
    if (key === 'leave') return '말을 꺼내지 못하고 돌아섰다. 다음에는, 하고 생각했다. 다음이 있을지는 모르겠다.';
    if (key === 'pay') {
      let n = Math.round(gr.heat * 2);
      const f0 = Math.min(g.player.familyMoney, n); g.player.familyMoney -= f0; n -= f0; g.player.money = Math.max(0, g.player.money - n);
      p.wealth = (p.wealth ?? 0) + Math.round(gr.heat * 2);
      ease(g, p, 50); done();
      log(g, `${p.name}에게 ${bloody(gr) ? '피의 값을' : '은화를 건네고 잘못을'} 치렀다.`);
      return `은화 자루를 탁자에 올려놓았다. ${J(p.name, '은/는')} 자루를 오래 보았다. 그리고 받았다. 돈으로 풀리는 원한도 있다. 다 풀리지는 않아도.`;
    }
    if (key === 'kneel') {
      const before = gr.heat;
      ease(g, p, 30); stress(g, 12); deed(g, 'brave', -3, null); done();
      log(g, `${p.name} 앞에 무릎을 꿇었다.`);
      // 무릎이 받아들여졌는지에 따라 (48단계 도우미2: 누구 앞에서든 같은 글이던 것)
      if (!grudgeOf(g, p.id)) return `무릎을 꿇었다. ${J(p.name, '은/는')} 한참 말이 없다가 내 팔을 잡아 일으켰다. "됐다. 이제 됐어." ${gr.gen > 0 ? '윗대에서 내려온 미움이 그 한마디에 내려앉았다.' : '그 손이 생각보다 따뜻했다.'}`;
      if (before >= 65) return `무릎을 꿇었다. ${J(p.name, '은/는')} 내려다보기만 했다. "그런다고 달라지는 건 없어." 문이 닫혔다. 그래도 닫히기 전에 한 번 더 나를 보았다.`;
      return `무릎을 꿇었다. ${J(p.name, '은/는')} 놀란 얼굴이었다. "일어나." 목소리가 떨렸다. 미움은 남았겠지만 칼은 거두었을 것이다.`;
    }
    if (check(rng, g.player.stats.cha * 0.5 + g.player.stats.wil * 0.2 + (gr.formerFriend ? 15 : 0) - gr.gen * 8, 20 + gr.heat * 0.5)) {
      ease(g, p, 40); p.affection = Math.max(p.affection, 0); remember(g, p, '찾아와 화해를 청했다', 1, { tag: 'reconcile' }); done();
      log(g, `${J(p.name, '과/와')} 화해했다.`);
      return `잘못했다고 했다. 변명은 하지 않았다. ${J(p.name, '은/는')} 한참 창밖을 보다가 말했다. "...앉아. 술이나 한잔하지." 원한이 다 녹지는 않았다. 그래도 녹기 시작했다.`;
    }
    addGrudge(g, p, 4, null);
    return `사과했지만 ${J(p.name, '은/는')} 문을 가리켰다. "이제 와서?" 그 말이 맞았다.`;
  },
});

/* ---------- 원수가 먼저 손을 내밀다 / 임종 ---------- */
defineScene('feud_offer', {
  title: () => '내민 손',
  text: (g, s) => { const p = byId(g, s.id); return `${J(p.name, '이/가')} 사람을 보내왔다. 이제 그만하자고, 서로 늙어 가는데 무슨 소용이냐고.`; },
  choices: (g, s) => (byId(g, s.id)?.alive && grudgeOf(g, s.id) ? [{ label: '손을 잡는다', key: 'yes' }, { label: '아직은 용서 못 한다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (!p) return '그 사람은 이제 없다.';
    if (key === 'no') { addGrudge(g, p, 10, '내민 손을 뿌리쳤다'); return '돌려보냈다. 내 안의 무언가가 아직 끝나지 않았다고 했다.'; }
    ease(g, p, 100); F(g).forgiven += 1; stress(g, -10);
    log(g, `${J(p.name, '과/와')} 원한을 풀었다.`);
    return `${p.name}의 집에서 저녁을 먹었다. 옛날이야기는 하지 않았다. 할 필요가 없었다. 돌아오는 길이 이상하게 가벼웠다.`;
  },
});
defineScene('feud_deathbed', {
  title: () => '임종',
  text: (g, s) => { const p = byId(g, s.id); return `${J(p.name, '이/가')} 오래 못 간다는 소식이 왔다. 그리고 나를 보고 싶어 한다는 말도. 평생 나를 미워한 사람이다.`; },
  choices: (g, s) => (byId(g, s.id)?.alive ? [{ label: '찾아간다', key: 'go' }, { label: '가지 않는다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (!p) return '이미 늦었다.';
    if (key === 'no') { stress(g, 6); kill(g, p, '노환'); return '가지 않았다. 몇 주 뒤 부고가 왔다. 마지막에 무슨 말을 하려 했는지, 이제 영영 모른다.'; }
    const gr = grudgeOf(g, p.id);
    const heat = gr?.heat ?? 0;
    delete F(g).grudges[p.id];
    if (p.bond === 'enemy') p.bond = null;
    F(g).forgiven += 1; stress(g, -12);
    log(g, `임종을 앞둔 ${J(p.name, '과/와')} 화해했다.`);
    // 임종에서 푼 원한은 물려지지 않는다
    if (rng.chance(0.6)) kill(g, p, '노환');
    return heat >= 50
      ? `침상의 ${J(p.name, '은/는')} 생각보다 작았다. "미안하다고는 안 할 거다." 그러고는 내 손을 잡았다. 그게 사과였다.`
      : `${J(p.name, '은/는')} 웃었다. "우리 참 오래도 싸웠지." 그 웃음을 끝으로, 오래 묵은 원한이 끝났다.`;
  },
});

/* ---------- 대 잇기: 부모의 원수는 내 원수 ---------- */
HOOKS.heir.push((g) => {
  const f = F(g);
  for (const [id, gr] of Object.entries(f.grudges)) {
    const p = byId(g, Number(id));
    if (!p || !p.alive) { delete f.grudges[id]; continue; }
    // 새 주인 자신이거나 식구면 원한을 내려놓는다
    if (p.isPlayer || g.player.familyIds.includes(p.id)) { delete f.grudges[id]; continue; }
    gr.heat = Math.round(gr.heat * 0.75);
    gr.gen += 1;
    if (!gr.why.some((w) => /부모 대/.test(w))) { gr.why.push('부모 대부터 이어진 원한'); if (gr.why.length > 4) gr.why.shift(); }
    if (gr.heat < 15) delete f.grudges[id];
  }
  f.friends = {}; f.sceneAt = 0; f.murders = crimeState(g).murders ?? 0;
  f.log.push({ y: g.date.year, m: g.date.month, text: '부모의 원수들이 이제 나를 본다.' });
});
HOOKS.newGame.push((g) => { F(g); });
HOOKS.migrate.push((g) => { F(g); });
