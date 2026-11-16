// 15단계: 늙음과 마지막 해들.
// 한 삶의 끝자락. 몸 나이(bodyAgeOf)로 본다. 엘프는 수백 살이어도 몸이 젊으면 아직 늙지 않는다.
// - 몸과 기억이 쇠한다(frail, fog 0~100). 쉰부터 몸이, 쉰다섯부터 기억이 흐려진다. 몸 돌보기(elder_care)로 늦출 수 있다.
//   몸이 많이 쇠하면 쉽게 지치고 힘이 빠지고, 끝내 수명이 준다. 기억이 흐려지면 사람 이름을 놓치고 길을 잃는다.
// - 일에서 물러나기(elder_retire): 일터를 자식이나 제자에게 넘기거나, 팔거나, 그냥 내려놓는다. 물러나면 자식들이 봉양한다.
// - 묵은 일 풀기(elder_visit): 원수, 의절한 자식, 헤어진 사람, 오랜 벗, 내가 해를 입힌 사람을 찾아간다. feud·kin·love와 잇는다.
// - 마지막 여행(elder_journey): 태어난 고장, 바다, 왕도, 성지, 젊은 날 살던 곳. 몸이 많이 쇠했으면 길에서 눈을 감기도 한다.
// - 회고록(elder_memoir): 살아온 기록(내 인물 history)에서 한 장씩 골라 있는 그대로, 좋게 고쳐, 아니면 빼고 적는다.
//   다 쓰면 글과 예술(arts)의 작품으로 세상에 남고, 자식이 대를 이은 뒤 펼쳐 읽는다.
// - 장례 준비(elder_funeral): 마을 묘지, 가문 묘역, 신전 납골당, 화장, 고향 땅, 공적비. 대를 이은 자식이 장례를 치르며 뜻을 지키거나 못 지킨다.
// - 임종: 늙어서 죽음이 정해지면 한 달을 미루고 머리맡 장면을 띄운다. 누구 손을 잡을지, 원수에게 무슨 말을 남길지. 드물게 고비를 넘긴다.
// - 무덤: 대를 이은 뒤 내 앞 대의 무덤을 원수가 찾아와 침을 뱉거나 술을 따르고, 모르는 사람이 와서 울고 간다.
//   부모·배우자·자식의 무덤도 생기고, 성묘(elder_tomb)로 돌본다. 돌보지 않으면 비석이 기운다.
// 잇는 곳: later(중년·노년 사건), kin(자식의 정·의절), feud(원한과 대물림), love(헤어진 사람), mentor(제자), village(촌장 자리·살던 고장),
// arts(회고록이 작품이 됨), repute(평), heir(임종으로 죽음을 한 달 미루는 beforeDeath 확장점, 대 잇기).
// 상태는 game.elder 하나. 화면 연결점: elderInfo(g)
import { J } from '../narrative/text.js';
const jo = (w, pair) => J(w, pair).slice(w.length); // 조사만
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat, gainSkill } from '../game.js';
import { byId, fullName, ageYears, bodyAgeOf, living, makePerson } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, showScene, sceneQueued, traveling, note, chron, tired, stress, spend, canSpend, check } from '../adventure/core.js';
import { rel, remember } from '../relations.js';
import { isJailed, crimeState } from '../crime.js';
import { deed, fameAt } from '../repute/index.js';
import { feudState } from '../feud/index.js';
import { kinState } from '../kin/index.js';
import { loveState } from '../love/index.js';
import { artsState } from '../arts/index.js';
import { heirsOf, heirWord } from '../heir.js';
import { WORK } from '../jobs.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '어느 고장';
const bage = (g) => bodyAgeOf(me(g));
const ready = (g) => playerAge(g) >= 16 && !traveling(g) && !isJailed(g) && !g.over && !L(g).heirPending;
const elderly = (g, n = 50) => ready(g) && bage(g) >= n;
const canWrite = (g) => (g.player.skills.letters ?? 0) >= 15 || g.player.stats.int >= 40;
const NATURAL = /노환|병|통증|열병/;

export function bodyWord(v) {
  if (v >= 75) return '자리보전하는 날이 많다';
  if (v >= 55) return '지팡이 없이는 멀리 못 간다';
  if (v >= 35) return '무릎과 허리가 시원찮다';
  if (v >= 15) return '잔병이 늘었다';
  return '정정하다';
}
export function mindWord(v) {
  if (v >= 75) return '사람을 자주 헷갈린다';
  if (v >= 55) return '어제 일이 흐릿하다';
  if (v >= 35) return '이름이 자주 막힌다';
  if (v >= 15) return '가끔 깜빡한다';
  return '맑다';
}

/* ---------- 상태 ---------- */
export function elderState(g) {
  g.elder ??= {};
  const v = g.elder;
  v.frail ??= 0;        // 몸이 쇠한 정도 0~100
  v.fog ??= 0;          // 기억이 흐린 정도 0~100
  v.retired ??= null;   // { y, job, how }
  v.memoir ??= null;    // 쓰고 있는 회고록 { ch, need, q, truth, gloss, dark, lines[], title, done, workId, skill }
  v.memoirs ??= [];     // 앞 대들이 남긴 회고록 [{ by, title, y, lines[], truth, gloss, done, skill, workId, read }]
  v.wish ??= null;      // 장례 방식 plain | family | temple | ash | home | hero
  v.graves ??= [];      // [{ id, pid, name, lastName, sex, born, died, age, cause, place, kind, rel, byPlayer, gen, tended, epitaph, summary, visits, desecrated, foes, at }]
  v.graved ??= [];      // 무덤을 만든 사람 id
  v.journeys ??= [];    // [{ y, to, name }]
  v.amends ??= [];      // [{ y, id, name, how, why }]
  v.amendAt ??= 0;
  v.careAt ??= 0;
  v.journeyAt ??= 0;
  v.dying ??= null;     // { cause, t }
  v.blessed ??= null;   // 임종 때 손을 잡은 사람 id
  v.diedAway ??= null;  // 여행길에서 눈을 감은 곳
  v.confessed ??= false;
  v.readAt ??= null;
  v.sceneAt ??= 0;
  v.seq ??= 1;
  v.birth ??= null;
  v.log ??= [];
  return v;
}
const E = elderState;
function log(g, text) { const v = E(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }

/* ---------- 무덤 ---------- */
const KINDS = {
  plain: { name: '마을 묘지', cost: 5, line: '마을 묘지에 소박하게 묻어 다오', stone: '나무 묘표' },
  family: { name: '가문 묘역', cost: 60, line: '가문 묘역에 번듯하게 묻어 다오', stone: '돌비석' },
  temple: { name: '신전 납골당', cost: 20, line: '신전 납골당에 모셔 다오', stone: '납골당 벽의 이름패' },
  home: { name: '고향 땅', cost: 15, line: '태어난 고장 땅에 묻어 다오', stone: '고향 언덕의 돌비석' },
  ash: { name: '화장', cost: 3, line: '태워서 강물에 뿌려 다오', stone: null },
  hero: { name: '공적비', cost: 100, line: '내 이름을 새긴 큰 비석을 세워 다오', stone: '공적비' },
};
function relWordOf(g, gr) {
  const m = me(g);
  if (gr.pid === m.fatherId) return '아버지';
  if (gr.pid === m.motherId) return '어머니';
  const anc = L(g).ancestors ?? [];
  const i = anc.findIndex((a) => a.id === gr.pid);
  if (i >= 0) {
    const d = anc.length - i;
    const male = gr.sex !== 'f';
    if (d === 1) return male ? '아버지' : '어머니';
    if (d === 2) return male ? '할아버지' : '할머니';
    if (d === 3) return male ? '증조할아버지' : '증조할머니';
    return `${d}대 조상`;
  }
  if (gr.gen === (L(g).gen ?? 1)) return gr.rel ?? '집안 어른';
  return '집안 어른';
}
function addGrave(g, p, { kind = 'plain', place, rel: rw = null, byPlayer = false, gen = L(g).gen ?? 1, rec = null } = {}) {
  const v = E(g);
  if (v.graved.includes(p.id)) return null;
  v.graved.push(p.id);
  if (v.graved.length > 80) v.graved.shift();
  const age = rec?.age ?? ageYears(p);
  const gr = {
    id: v.seq++, pid: p.id, name: rec?.name ?? p.name, lastName: rec?.lastName ?? p.lastName, sex: p.sex,
    born: rec?.born ?? g.date.year - age, died: rec?.died ?? g.date.year, age, cause: rec?.cause ?? p.deathCause ?? null,
    place: place ?? p.place ?? 'ern', kind, rel: rw, byPlayer, gen, tended: 70, epitaph: null, summary: rec?.summary ?? '',
    visits: 0, desecrated: false, foes: 0, at: mi(g),
  };
  v.graves.push(gr);
  // 오래된 남의 무덤부터 잊힌다 (대를 이은 주인들의 무덤은 남긴다)
  while (v.graves.length > 30) {
    const i = v.graves.findIndex((x) => !x.byPlayer);
    v.graves.splice(i >= 0 ? i : 0, 1);
  }
  return gr;
}
const graveById = (g, id) => E(g).graves.find((x) => x.id === id) ?? null;
const gravesHere = (g) => E(g).graves.filter((x) => x.place === here(g) && x.kind !== 'ash');
// 바로 앞 대 주인의 무덤
const lastGrave = (g) => [...E(g).graves].reverse().find((x) => x.byPlayer && x.gen === (L(g).gen ?? 1) - 1) ?? null;
const tendWord = (t) => (t >= 70 ? '잘 돌본 무덤' : t >= 45 ? '풀이 조금 자란 무덤' : t >= 20 ? '잡초가 무성한 무덤' : '비석이 기운 채 잊힌 무덤');

/* ---------- 상태 읽기 (화면용) ---------- */
export function elderInfo(g) {
  const v = E(g);
  const age = Math.floor(bage(g));
  return {
    age, old: age >= 50,
    frail: Math.round(v.frail), fog: Math.round(v.fog), bodyWord: bodyWord(v.frail), mindWord: mindWord(v.fog),
    retired: v.retired ? { y: v.retired.y, job: v.retired.job, how: v.retired.how } : null,
    memoir: v.memoir ? { title: v.memoir.title, ch: v.memoir.ch, need: v.memoir.need, done: !!v.memoir.done } : null,
    memoirs: v.memoirs.slice(-6).map((x) => ({ by: x.by, title: x.title, y: x.y, done: !!x.done, read: !!x.read })),
    wish: v.wish ? { kind: v.wish, name: KINDS[v.wish].name } : null,
    dying: !!v.dying,
    graves: v.graves.slice(-12).map((x) => ({
      id: x.id, name: `${x.name} ${x.lastName ?? ''}`.trim(), rel: relWordOf(g, x), born: x.born, died: x.died,
      place: x.place, placeName: placeName(x.place), kind: KINDS[x.kind]?.name ?? '무덤', epitaph: x.epitaph ?? '',
      tended: Math.round(x.tended), word: x.kind === 'ash' ? '무덤 없이 강물로 돌아갔다' : tendWord(x.tended), desecrated: !!x.desecrated, mine: !!x.byPlayer,
    })),
    journeys: v.journeys.slice(-6).map((x) => ({ ...x })),
    amends: v.amends.slice(-8).map((x) => ({ y: x.y, name: x.name, how: x.how })),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 몸 돌보기 ---------- */
ACTIONS.push({
  id: 'elder_care', name: '몸과 마음 돌보기', icon: 'rest',
  desc: '아침 산책, 약탕, 글 읽기와 셈 놀이. 늙어 가는 몸과 흐려지는 기억을 조금 늦춘다.',
  available: (g) => elderly(g, 50),
  run(g, rng) {
    const v = E(g);
    const parts = [];
    // 몸 돌보기는 한 달에 한 번 몫이 크다. 같은 달에 거듭하면 쉬는 것과 다르지 않다
    if (v.careAt === mi(g)) { tired(g, -8); stress(g, -2); return rng.pick(['오늘은 볕 드는 데 앉아 졸았다.', '종일 툇마루에서 지나가는 사람들을 구경했다.', '낮잠을 잤다. 꿈에 젊은 내가 나왔다.']); }
    v.careAt = mi(g);
    v.frail = Math.max(0, v.frail - 0.25);
    tired(g, -6); stress(g, -3);
    parts.push(rng.pick(['새벽에 마을을 한 바퀴 돌았다. 무릎이 투덜댔지만 끝까지 걸었다.', '개울가까지 천천히 걸어갔다가 돌아왔다. 숨이 차도 쉬지 않았다.', '마당에서 팔다리를 폈다. 젊은 사람들이 웃었지만 상관없었다.']));
    if (canSpend(g, 4) && v.frail + v.fog >= 20) {
      spend(g, 4); v.frail = Math.max(0, v.frail - 0.2); v.fog = Math.max(0, v.fog - 0.1);
      parts.push('약초사에게 은화 네 닢을 주고 약탕을 달였다. 쓴맛이 오래 남았다.');
    }
    if (canWrite(g)) { v.fog = Math.max(0, v.fog - 0.2); parts.push('밤에는 오래된 책을 다시 읽고 셈을 맞춰 보았다.'); }
    else { v.fog = Math.max(0, v.fog - 0.1); parts.push('밤에는 아는 노래를 처음부터 끝까지 불러 보았다. 가사가 다 떠올랐다.'); }
    return parts.join(' ');
  },
});

/* ---------- 일에서 물러나기 ---------- */
const jobName = (g) => { const j = L(g).job; const d = j ? WORK[j.id] : null; return d ? (d.title ? d.title(g) : d.name) : '일'; };
const grownHomeKids = (g) => (me(g).childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && !p.isPlayer && !p.away && ageYears(p) >= 18 && (p.place ?? 'ern') === here(g) && !kinState(g).kids[p.id]?.disowned);
const pupils = (g) => {
  const m = g.mentor;
  if (!m) return [];
  const ids = [...Object.keys(m.disciples ?? {}).map(Number), ...(m.grads ?? []).map((x) => x.id)];
  return [...new Set(ids)].map((id) => byId(g, id)).filter((p) => p && p.alive && !p.isPlayer && !p.away);
};
ACTIONS.push({
  id: 'elder_retire', name: '일에서 물러나기', icon: 'home',
  desc: '평생 해 온 일을 내려놓는다. 자식이나 제자에게 넘기거나, 일터를 팔거나, 그냥 손을 놓는다.',
  available: (g) => elderly(g, 50) && !!L(g).job && !sceneQueued(g, 'elder_retire'),
  run(g) {
    queueScene(g, 'elder_retire', { ask: false });
    return `${J(jobName(g), '을/를')} 언제까지 할 수 있을까. 오늘은 일터를 오래 둘러보았다.`;
  },
});
defineScene('elder_retire', {
  title: () => '물러날 때',
  text: (g, s) => {
    const v = E(g);
    const lead = s.ask ? '아침에 연장을 들다 손에서 놓쳤다. 젊은 사람이 얼른 주워 주었다. 그 눈빛이 싫지 않아서 더 쓸쓸했다.' : '평생 해 온 일이다.';
    return `${lead} ${J(jobName(g), "으로/로")} 산 세월이 길다. 몸은 ${bodyWord(v.frail)}. 이제 내려놓을 때인가.`;
  },
  choices: (g) => {
    if (!L(g).job) return [];
    const out = [];
    const k = grownHomeKids(g)[0];
    if (k) out.push({ label: `${k.sex === 'm' ? '아들' : '딸'} ${k.name}에게 물려준다`, key: `kid:${k.id}` });
    const pu = pupils(g)[0];
    if (pu) out.push({ label: `제자 ${pu.name}에게 맡긴다`, key: `pupil:${pu.id}` });
    out.push({ label: '일터를 정리하고 은화를 받는다', key: 'sell' });
    out.push({ label: '그냥 손을 놓는다', key: 'stop' });
    if (g.village?.office?.place === here(g)) out.push({ label: `${g.village.office.title} 자리를 내놓는다`, key: 'office' });
    out.push({ label: '아직은 아니다', key: 'not' });
    return out;
  },
  resolve(g, rng, s, key) {
    const v = E(g);
    if (key === 'not') { gainStat(g, 'wil', 0.3); return '아직은 아니다. 손이 움직이는 한은. 다음 날도 해가 뜨기 전에 일어났다.'; }
    if (key === 'office') {
      const o = g.village?.office;
      if (!o) return '내놓을 자리가 이미 없었다.';
      g.village.office = null;
      stress(g, -8);
      log(g, `${placeName(o.place)}의 ${o.title} 자리를 내놓았다.`);
      return `마을 사람들 앞에서 ${o.title} 자리를 내놓았다. "이제 젊은 사람이 하게." 몇몇은 붙잡았고, 몇몇은 벌써 누가 될지 셈하고 있었다.`;
    }
    if (!L(g).job) return '물러날 일이 이미 없었다.';
    const name = jobName(g);
    let how, text;
    if (key.startsWith('kid:')) {
      const k = byId(g, Number(key.slice(4)));
      if (!k?.alive) return '물려줄 사람이 곁에 없었다.';
      k.affection = Math.min(100, (k.affection ?? 0) + 10);
      const r = kinState(g).kids[k.id];
      if (r) r.bond = Math.min(100, r.bond + 10);
      remember(g, k, '평생의 일을 물려받았다', 1, { tag: 'elder_retire' });
      note(g, `${k.name}에게 ${J(name, '을/를')} 물려주었다.`);
      how = `${k.name}에게 물려줌`;
      text = `${J(k.name, '을/를')} 불러 앉히고 열쇠 꾸러미를 건넸다. ${J(k.name, '은/는')} 한참 그것을 내려다보았다. "제가 잘할 수 있을까요." 나도 처음엔 그랬다고 말해 주었다.`;
    } else if (key.startsWith('pupil:')) {
      const p = byId(g, Number(key.slice(6)));
      if (!p?.alive) return '맡길 사람이 곁에 없었다.';
      p.affection = Math.min(100, (p.affection ?? 0) + 12);
      remember(g, p, '스승의 일터를 물려받았다', 1, { tag: 'elder_retire' });
      how = `제자 ${p.name}에게 맡김`;
      text = `${J(p.name, '이/가')} 무릎을 꿇고 받았다. 핏줄보다 손끝으로 이어지는 것도 있다. 내가 가르친 대로 하지 않을 것이다. 그래야 맞다.`;
    } else if (key === 'sell') {
      const top = Math.max(...Object.values(g.player.skills));
      const got = Math.round(clamp(20 + top * 0.5, 20, 60));
      g.player.money += got;
      how = '일터를 팔고 물러남';
      text = `일터와 연장을 넘기고 은화 ${got}닢을 받았다. 새 주인이 간판을 떼어 내는 소리를 등 뒤로 들었다. 돌아보지 않았다.`;
    } else {
      how = '그냥 손을 놓음';
      text = '어느 날 아침, 일터에 가지 않았다. 아무 일도 일어나지 않았다. 세상은 내가 없어도 잘 돌아갔다. 서운하고, 홀가분했다.';
    }
    L(g).job = null;
    v.retired = { y: g.date.year, job: name, how };
    stress(g, -15); tired(g, -20);
    log(g, `${J(name, '을/를')} 내려놓았다 (${how}).`);
    chron(g, `${g.player.name}, ${J(name, '을/를')} 내려놓고 물러나다.`, 30);
    return text;
  },
});

/* ---------- 묵은 일 풀기 ---------- */
function amendsPool(g) {
  const v = E(g);
  const done = new Set(v.amends.map((x) => x.id));
  const ok = (p) => p && p.alive && !p.isPlayer && !p.away && !done.has(p.id);
  const out = [];
  for (const [id, gr] of Object.entries(feudState(g).grudges)) { const p = byId(g, Number(id)); if (ok(p) && gr.heat >= 20) out.push({ p, why: 'foe', w: 3 }); }
  const K = kinState(g);
  for (const [id, r] of Object.entries(K.kids)) {
    const p = byId(g, Number(id));
    if (!ok(p) || !(me(g).childIds ?? []).includes(p.id)) continue;
    if (r.disowned || r.bond < 30 || r.left) out.push({ p, why: 'kid', w: 3 });
  }
  for (const x of loveState(g).exes) { const p = byId(g, x.id); if (ok(p)) out.push({ p, why: 'ex', w: 1 }); }
  const fam = new Set([...(g.player.familyIds ?? []), ...(me(g).childIds ?? []), me(g).spouseId]);
  const taken = new Set(out.map((x) => x.p.id));
  for (const p of living(g)) {
    if (!ok(p) || fam.has(p.id) || taken.has(p.id) || !p.known) continue;
    if ((p.affection ?? 0) >= 45 && ageYears(p) >= 40) out.push({ p, why: 'friend', w: 1 });
    else if ((p.affection ?? 0) <= -15 && (p.memories ?? []).some((m) => m.tone < 0)) out.push({ p, why: 'wronged', w: 2 });
  }
  return out;
}
ACTIONS.push({
  id: 'elder_visit', name: '묵은 일 풀러 가기', icon: 'visit',
  desc: '더 늦기 전에 지난 사람들을 찾아간다. 원수, 등 돌린 자식, 헤어진 사람, 오랜 벗, 내가 해를 입힌 사람.',
  available: (g) => elderly(g, 50) && mi(g) - E(g).amendAt >= 3 && !sceneQueued(g, 'elder_amends') && amendsPool(g).length > 0,
  run(g, rng) {
    const pool = amendsPool(g);
    const total = pool.reduce((a, x) => a + x.w, 0);
    let r = rng.float(0, total), pick = pool[0];
    for (const x of pool) { r -= x.w; if (r <= 0) { pick = x; break; } }
    E(g).amendAt = mi(g);
    tired(g, 6);
    queueScene(g, 'elder_amends', { who: pick.p.id, why: pick.why });
    return `${J(pick.p.name, '을/를')} 찾아가기로 했다. 오래 미뤄 둔 길이다.`;
  },
});
const WHY = {
  foe: (g, p) => { const gr = feudState(g).grudges[p.id]; return `${p.name}의 집 앞에 섰다. ${gr?.why?.[0] ? `${J(gr.why[0], '은/는')} 오래된 일이다.` : '무엇 때문이었는지도 흐릿하다.'} 그래도 그 사람은 아직 나를 미워한다. 문이 열렸다. 늙은 얼굴 둘이 마주 보았다.` },
  kid: (g, p) => `${p.name}의 집 앞이다. 마지막으로 얼굴을 본 게 언제였던가. 문을 연 ${J(p.name, '이/가')} 나를 알아보고 굳었다. 어릴 때 그 얼굴이 아직 거기 있었다.`,
  ex: (g, p) => `${J(p.name, '이/가')} 사는 집을 물어물어 찾았다. 마당에서 빨래를 널던 ${J(p.name, '이/가')} 손을 멈췄다. "당신이 여긴 웬일이야."`,
  friend: (g, p) => `${J(p.name, '을/를')} 찾아갔다. ${p.name}도 많이 늙었다. 둘이 툇마루에 앉으니 할 말이 너무 많아서 한동안 아무 말도 못 했다.`,
  wronged: (g, p) => `${p.name}의 집 앞이다. 젊을 때 이 사람에게 못할 짓을 했다. 그때는 그럴 만했다고 생각했다. 이제는 모르겠다.`,
};
defineScene('elder_amends', {
  title: (g, s) => ({ foe: '묵은 원한', kid: '등 돌린 자식', ex: '옛사람', friend: '오랜 벗', wronged: '갚지 못한 빚' }[s.why] ?? '지난 사람'),
  text: (g, s) => WHY[s.why](g, byId(g, s.who)),
  choices: (g, s) => {
    const p = byId(g, s.who);
    if (!p?.alive) return [];
    if (s.why === 'foe') return [{ label: '머리 숙여 사과한다', key: 'sorry' }, ...(canSpend(g, 30) ? [{ label: '은화 30닢으로 보상한다', key: 'pay' }] : []), { label: '얼굴만 보고 돌아선다', key: 'look' }];
    if (s.why === 'kid') return [{ label: '먼저 손을 내민다', key: 'hand' }, { label: '편지를 써서 두고 온다', key: 'letter' }, { label: '끝내 고개를 숙이지 못한다', key: 'pride' }];
    if (s.why === 'ex') return [{ label: '그때 일을 사과한다', key: 'sorry' }, { label: '웃으며 옛이야기를 한다', key: 'laugh' }, { label: '문 앞에서 돌아선다', key: 'door' }];
    if (s.why === 'friend') return [{ label: '"고마웠다."', key: 'thank' }, { label: '아끼던 물건을 건넨다', key: 'gift' }, { label: '젊을 때 걷던 길을 함께 걷는다', key: 'walk' }];
    return [{ label: '사과한다', key: 'sorry' }, ...(canSpend(g, 20) ? [{ label: '은화 20닢으로 갚는다', key: 'pay' }] : []), { label: '변명한다', key: 'excuse' }];
  },
  resolve(g, rng, s, key) {
    const v = E(g);
    const p = byId(g, s.who);
    if (!p?.alive) return '찾아갔을 때는 이미 늦었다.';
    const done = (how) => { v.amends.push({ y: g.date.year, id: p.id, name: fullName(p), how, why: s.why }); if (v.amends.length > 30) v.amends.shift(); log(g, `${J(p.name, '과/와')} ${how}.`); };
    const like = (n) => { p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
    if (s.why === 'foe') {
      const f = feudState(g), gr = f.grudges[p.id];
      const ease = (n) => {
        if (!gr) return true;
        gr.heat = clamp(gr.heat - n, 0, 100);
        if (gr.heat < 15) { delete f.grudges[p.id]; if (p.bond === 'enemy') p.bond = null; p.affection = Math.max(p.affection ?? 0, -5); f.forgiven = (f.forgiven ?? 0) + 1; return true; }
        return false;
      };
      if (key === 'pay') {
        if (!spend(g, 30)) return '은화를 꺼내려다 주머니가 비었다는 걸 알았다. 민망하게 돌아섰다.';
        const gone = ease(35); like(10); deed(g, 'generous', 3, null);
        if (gone) done('원한을 풀었다');
        return gone ? `은화를 내밀었다. ${J(p.name, '은/는')} 한참 그것을 보다가 받았다. "돈으로 될 일은 아니었지." 그래도 그날 둘은 처음으로 같은 상에 앉았다.` : `${J(p.name, '은/는')} 은화를 받았다. 고맙다는 말은 없었다. 그래도 문을 닫지는 않았다.`;
      }
      if (key === 'sorry') {
        const ok = check(rng, g.player.stats.cha * 0.5 + bage(g) * 0.4 + (gr ? 50 - gr.heat : 20), 45);
        if (ok) { const gone = ease(45); like(12); gainStat(g, 'wil', 0.5); deed(g, 'honest', 3, null); if (gone) done('원한을 풀었다'); return `머리를 숙였다. 젊을 때라면 죽어도 못 했을 일이다. ${J(p.name, '은/는')} 오래 말이 없다가 내 어깨를 잡았다. "우리도 늙었군." ${gone ? '그 한마디로 수십 년이 녹았다.' : '다 풀리지는 않았다. 그래도 얼음에 금이 갔다.'}`; }
        if (gr) gr.heat = clamp(gr.heat + 5, 0, 100);
        stress(g, 8);
        return `머리를 숙였다. ${J(p.name, '은/는')} 코웃음을 쳤다. "이제 와서? 죽을 때가 되니 무섭나." 문이 닫혔다. 돌아오는 길이 멀었다.`;
      }
      ease(5);
      return `서로 얼굴만 한참 보았다. ${p.name}도 나만큼 늙어 있었다. 아무 말 없이 돌아섰다. 미움도 늙는다.`;
    }
    if (s.why === 'kid') {
      const r = kinState(g).kids[p.id];
      if (key === 'hand') {
        const ok = check(rng, (r?.bond ?? 30) + g.player.stats.cha * 0.3 + 25, 45);
        if (ok) {
          if (r) { r.disowned = false; r.bond = Math.max(r.bond, 55); r.left = null; }
          like(20); stress(g, -15); done('다시 부모 자식이 되었다');
          return `손을 내밀었다. ${J(p.name, '은/는')} 그 손을 한참 보다가, 잡지 않고 끌어안았다. 아이의 등이 내 등보다 넓었다. 언제 이렇게 컸을까.`;
        }
        if (r) r.bond = Math.min(100, r.bond + 8);
        stress(g, 6);
        return `손을 내밀었다. ${J(p.name, '은/는')} 받지 않았다. "너무 늦었어요." 그래도 문을 닫기 전에 한 번 더 내 얼굴을 보았다.`;
      }
      if (key === 'letter') { if (r) r.bond = Math.min(100, r.bond + 12); like(6); return '할 말을 다 적지 못했다. 다 적으면 편지가 아니라 책이 될 것 같았다. 문틈에 끼워 두고 왔다.'; }
      stress(g, 10); gainStat(g, 'wil', 0.2);
      return `문 앞까지 갔다. ${J(p.name, '이/가')} 먼저 말을 꺼내길 기다렸다. ${p.name}도 기다렸다. 둘 다 나를 닮아서 그렇다.`;
    }
    if (s.why === 'ex') {
      if (key === 'sorry') { like(15); stress(g, -8); done('옛일을 사과했다'); return `"그때는 내가 잘못했다." ${J(p.name, '이/가')} 웃었다. "그 말 듣는 데 몇 년이 걸린 거야." 차를 한 잔 얻어 마시고 왔다.`; }
      if (key === 'laugh') { like(8); stress(g, -10); done('옛이야기를 나눴다'); return '처음 만난 날 이야기를 했다. 서로 기억하는 것이 달랐다. 그래서 더 웃었다.'; }
      return '문 앞에서 웃음소리를 들었다. 그 집 손주들 소리였다. 두드리지 않고 돌아섰다. 그걸로 됐다.';
    }
    if (s.why === 'friend') {
      if (key === 'thank') { like(12); gainStat(g, 'cha', 0.3); done('고맙다는 말을 했다'); return `"고마웠다." ${J(p.name, '이/가')} 눈을 끔뻑였다. "새삼스럽게." 그래도 돌아올 때 문밖까지 따라 나와 오래 서 있었다.`; }
      if (key === 'gift') { like(15); done('아끼던 물건을 건넸다'); return `오래 지니던 것을 건넸다. ${J(p.name, '은/는')} 받지 않으려 했다. "내가 먼저 가면 누가 갖겠나." 그 말에 둘 다 웃었다.`; }
      like(10); tired(g, 6); stress(g, -12); done('옛 길을 함께 걸었다');
      return '젊을 때 둘이 쏘다니던 길을 걸었다. 길은 그대로인데 걸음이 느렸다. 느려서 더 오래 걸을 수 있었다.';
    }
    if (key === 'pay') {
      if (!spend(g, 20)) return '갚으려던 은화가 모자랐다.';
      like(18); deed(g, 'honest', 3, null); done('빚을 갚았다');
      return `은화를 내려놓았다. 오래전 일이라 이자를 셈할 수도 없었다. ${J(p.name, '은/는')} 돈보다 내 얼굴을 오래 보았다.`;
    }
    if (key === 'sorry') { like(14); deed(g, 'honest', 2, null); done('사과했다'); return `"그때 내가 못할 짓을 했소." ${J(p.name, '은/는')} 대답하지 않았다. 그래도 내쫓지 않았다. 다음 장날 길에서 마주쳤을 때, 고개를 끄덕였다.`; }
    like(-3);
    return '변명을 늘어놓았다. 말하는 동안 나도 내 말을 믿지 않았다. 그 사람도 마찬가지였다.';
  },
});

/* ---------- 마지막 여행 ---------- */
function journeyDests(g) {
  const v = E(g), h = here(g), out = [];
  if (v.birth && v.birth !== h) out.push({ key: 'birth', to: v.birth, cost: 15, label: `태어난 고장 ${placeName(v.birth)}에 다녀온다` });
  if (!['klein', 'portel', 'saltmare'].includes(h)) out.push({ key: 'sea', to: 'klein', cost: 20, label: '바다를 보러 클라인 항에 간다' });
  if (h !== 'leocast') out.push({ key: 'capital', to: 'leocast', cost: 25, label: '왕도 레오카스트를 구경한다' });
  if (h !== 'solaris') out.push({ key: 'shrine', to: 'solaris', cost: 40, label: '성도 솔라리스로 순례를 떠난다' });
  const youth = Object.entries(g.village?.places ?? {}).filter(([id, r]) => id !== h && id !== v.birth && r.months >= 12).sort((a, b) => b[1].months - a[1].months)[0];
  if (youth && PLACES[youth[0]]) out.push({ key: 'youth', to: youth[0], cost: 15, label: `젊은 날 살던 ${placeName(youth[0])}에 가 본다` });
  return out;
}
ACTIONS.push({
  id: 'elder_journey', name: '마지막 여행', icon: 'travel',
  desc: '몸이 허락할 때 꼭 가 보고 싶던 곳에 다녀온다. 태어난 고장, 바다, 왕도, 성지, 젊은 날의 고장.',
  available: (g) => elderly(g, 55) && mi(g) - E(g).journeyAt >= 60 && canSpend(g, 15) && !sceneQueued(g, 'elder_journey'),
  run(g) {
    queueScene(g, 'elder_journey', {});
    return '지도를 펴 놓고 손가락으로 길을 짚어 보았다.';
  },
});
const JOURNEY_LINE = {
  birth: (n) => `${n}. 내가 태어난 집은 남의 집이 되어 있었다. 그래도 우물은 그 자리에 있었고, 물맛도 그대로였다. 우물가에서 아이들이 뛰었다. 나도 저렇게 뛰었다.`,
  sea: () => '언덕을 넘자 바다가 있었다. 끝이 없었다. 평생 들어 온 말인데, 정말로 끝이 없었다. 신발을 벗고 발을 담갔다. 차가웠다. 웃음이 나왔다.',
  capital: () => '왕도의 성문은 생각보다 컸고, 거리는 생각보다 시끄러웠다. 왕궁 첨탑을 올려다보다 목이 아팠다. 이 큰 나라의 한 귀퉁이에서 내가 살았구나.',
  shrine: () => '성도의 대성당 계단을 하나씩 올랐다. 중간에 세 번 쉬었다. 꼭대기에서 무릎을 꿇었을 때 무엇을 빌어야 할지 몰랐다. 그래서 고맙다고만 했다.',
  youth: (n) => `${n}. 젊을 때 살던 골목을 걸었다. 단골 술집은 없어졌고 그 자리에 대장간이 섰다. 나를 아는 사람은 한 명도 없었다. 그래도 길은 다 기억났다.`,
};
defineScene('elder_journey', {
  title: () => '마지막 여행',
  text: (g) => `몸은 ${bodyWord(E(g).frail)}. 그래도 아직 걸을 수 있다. 더 늦기 전에 한 군데쯤은 가 보고 싶다. 어디로 갈까.`,
  choices: (g) => {
    const list = journeyDests(g).filter((d) => canSpend(g, d.cost));
    return list.length ? [...list.map((d) => ({ label: `${d.label} (은화 ${d.cost}닢)`, key: d.key })), { label: '아직은 집에 있겠다', key: 'none' }] : [];
  },
  resolve(g, rng, s, key) {
    const v = E(g);
    if (key === 'none') return '지도를 접었다. 다음 봄에. 그렇게 말하고 나서, 다음 봄이 몇 번 남았을까 생각했다.';
    const d = journeyDests(g).find((x) => x.key === key);
    if (!d) return '가려던 길이 막혔다.';
    if (!spend(g, d.cost)) return '노자가 모자랐다. 지도를 다시 접었다.';
    v.journeyAt = mi(g);
    v.journeys.push({ y: g.date.year, to: d.to, name: placeName(d.to) });
    if (v.journeys.length > 12) v.journeys.shift();
    stress(g, -25); tired(g, 15);
    v.frail = clamp(v.frail + 4, 0, 100);
    if (v.memoir && !v.memoir.done) v.memoir.q += 6;
    note(g, `늙어서 ${placeName(d.to)}에 다녀왔다.`);
    log(g, `마지막 여행: ${placeName(d.to)}.`);
    let text = JOURNEY_LINE[key](placeName(d.to));
    if (v.frail >= 65 && rng.chance(0.12)) {
      v.diedAway = d.to;
      L(g).pendingDeath = '먼 길 끝의 노환';
      text += ' 돌아오는 길, 객줏집 창가에서 오래 앉아 있었다. 몸이 몹시 무거웠다.';
    }
    return text;
  },
});

/* ---------- 회고록 ---------- */
const DARK = /죽였|죽이|훔|배신|버렸|뒷돈|암살|감옥|옥살이|도둑|속였|사기|불태|의절/;
function memoirTitle(g, rng) {
  const n = g.player.name;
  return rng.pick([`${n} 회고록`, `${J(n, '이/가')} 걸어온 길`, `${n}의 남은 날의 기록`, `늙은 ${n}의 이야기`]);
}
ACTIONS.push({
  id: 'elder_memoir', name: '회고록 쓰기', icon: 'scroll',
  desc: '살아온 날을 한 장씩 적는다. 있는 그대로 적을지, 좋게 고쳐 적을지, 빼 버릴지는 내가 정한다. 글을 모르면 받아 적을 사람을 산다.',
  available: (g) => elderly(g, 50) && !E(g).memoir?.done && (canWrite(g) || canSpend(g, 4)) && !sceneQueued(g, 'elder_memoir'),
  run(g, rng) {
    const v = E(g);
    let pre = '';
    if (!canWrite(g)) {
      if (!spend(g, 4)) return '받아 적을 사람을 살 돈이 없었다.';
      pre = '글 아는 젊은이에게 은화 네 닢을 주고 받아 적게 했다. ';
    }
    if (!v.memoir) {
      v.memoir = { ch: 0, need: 5, q: 0, truth: 0, gloss: 0, dark: 0, lines: [], title: memoirTitle(g, rng), done: false, workId: null, skill: null };
      if (g.flags?.memoir || L(g).prevFlags?.memoir) v.memoir.q += 8; // 깜빡하던 날부터 적어 둔 공책
    }
    const m = v.memoir;
    m.ch += 1;
    m.q += (g.player.skills.letters ?? 0) * 0.35 + g.player.stats.int * 0.25 + rng.float(0, 10) - v.fog * 0.1;
    tired(g, 5);
    const hist = (me(g).history ?? []).filter((h) => h.text && !bad(h.text) && h.text.length <= 70 && !/["“]/.test(h.text) && !/^[^.]{1,10}\. /.test(h.text));
    const used = new Set(m.lines.map((x) => x.text));
    const left = hist.filter((h) => !used.has(h.text));
    if (left.length && (m.ch < m.need || rng.chance(0.5))) {
      const darkOnes = left.filter((h) => DARK.test(h.text));
      const h = darkOnes.length && rng.chance(0.5) ? rng.pick(darkOnes) : rng.pick(left);
      queueScene(g, 'elder_memoir', { line: h.text, y: h.y });
    }
    if (m.ch >= m.need) return `${pre}${finishMemoir(g, rng)}`;
    return `${pre}『${m.title}』 ${m.ch}장을 적었다. ${rng.pick(['촛불이 다 탈 때까지 썼다.', '쓰다 보니 잊었던 얼굴들이 떠올랐다.', '한 줄 쓰고 한참 창밖을 보았다.'])}`;
  },
});
const bad = (t) => /undefined|NaN|\[object|null/.test(t);
defineScene('elder_memoir', {
  title: () => '회고록의 한 장',
  text: (g, s) => `${s.y}년의 일을 적을 차례다. "${s.line}" ${DARK.test(s.line) ? '자랑스러운 일은 아니다. 읽는 사람이 나를 어떻게 볼까.' : '어떻게 적을까.'}`,
  choices: (g) => (E(g).memoir && !E(g).memoir.workId ? [{ label: '있는 그대로 적는다', key: 'truth' }, { label: '좋게 고쳐 적는다', key: 'gloss' }, { label: '이 일은 빼 버린다', key: 'skip' }] : []),
  resolve(g, rng, s, key) {
    const m = E(g).memoir;
    if (!m) return '원고가 어디 갔는지 보이지 않았다.';
    const dark = DARK.test(s.line);
    if (key === 'skip') return '그 장은 비워 두었다. 빈 종이가 오히려 많은 것을 말했다.';
    m.lines.push({ y: s.y, text: s.line, how: key, dark });
    if (m.lines.length > 12) m.lines.shift();
    if (key === 'truth') { m.truth += 1; if (dark) { m.dark += 1; gainStat(g, 'wil', 0.4); stress(g, -6); } m.q += dark ? 6 : 3; return dark ? '있는 그대로 적었다. 펜 끝이 떨렸다. 다 적고 나니 오래 지고 있던 짐 하나를 내려놓은 것 같았다.' : '있는 그대로 적었다. 꾸미지 않은 문장이 오히려 살아 있었다.'; }
    m.gloss += 1;
    return dark ? '조금 고쳐 적었다. 그 사람이 먼저 칼을 뽑았다고. 쓰고 나니 정말 그랬던 것 같기도 했다.' : '좋게 고쳐 적었다. 읽기 좋은 글이 되었다. 그때의 나보다 조금 나은 사람이 거기 있었다.';
  },
});
function finishMemoir(g, rng) {
  const v = E(g), m = v.memoir;
  m.done = true;
  const q = Math.round(clamp(m.q / m.need + rng.normal(0, 4), 3, 100));
  m.skill = Object.entries(g.player.skills).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  // 글과 예술 갈래에 작품으로 남긴다 (역사서의 한 갈래)
  const A = artsState(g);
  if (A && Array.isArray(A.works)) {
    const theme = m.truth >= m.gloss ? 'truth' : 'praise';
    const w = {
      id: A.seq++, kind: 'history', theme, title: m.title, author: `${g.player.name} ${g.player.lastName ?? ''}`.trim(),
      mine: true, gen: L(g).gen ?? 1, year: g.date.year, place: here(g), q,
      esteem: Math.round(clamp(q * 0.45 + (A.fame ?? 0) * 0.2 + m.dark * 4 + fameAt(g) * 0.1, 1, 90)),
      copies: 2, banned: null, lost: false, ruler: null, patron: null, memoir: true,
    };
    A.works.push(w); A.made = (A.made ?? 0) + 1;
    m.workId = w.id;
  }
  m.q = q;
  note(g, `회고록 『${m.title}』${jo(m.title, '을/를')} 마쳤다.`);
  log(g, `회고록 『${m.title}』${jo(m.title, '을/를')} 마쳤다.`);
  if (q >= 60) chron(g, `${g.player.name}의 회고록 『${m.title}』${jo(m.title, '이/가')} 읽히다.`, 45);
  const tone = m.dark ? ' 감추고 싶던 일까지 다 적었다. 이 책을 읽는 사람은 나를 미워할지도 모른다. 그래도 거짓말쟁이로 남는 것보다는 낫다.' : m.gloss > m.truth ? ' 읽고 나니 꽤 훌륭한 사람의 일생이었다. 반쯤은 내가 아니었다.' : ' 잘한 일도 못한 일도 그대로 남았다.';
  return `마지막 장을 덮었다. 『${m.title}』.${tone}`;
}

/* ---------- 장례 준비 ---------- */
ACTIONS.push({
  id: 'elder_funeral', name: '장례 준비', icon: 'pray',
  desc: '내가 죽으면 어떻게 묻힐지 미리 정해 둔다. 대를 이을 자식이 그 뜻을 따를지는 그때 형편에 달렸다.',
  available: (g) => elderly(g, 52) && !E(g).wish && !sceneQueued(g, 'elder_funeral_wish'),
  run(g) {
    queueScene(g, 'elder_funeral_wish', {});
    return '사제를 불렀다. 미리 해 둘 이야기가 있다.';
  },
});
defineScene('elder_funeral_wish', {
  title: () => '어떻게 묻힐까',
  text: (g) => `사제가 조심스레 물었다. "어떻게 모시길 바라십니까." 지금 가진 은화는 ${g.player.money}닢. 장례비는 대를 이을 사람이 치른다. 너무 큰 것을 바라면 그 짐이 자식에게 간다.`,
  choices: (g) => {
    const v = E(g), out = [];
    for (const [k, K] of Object.entries(KINDS)) {
      if (k === 'home' && (!v.birth || v.birth === here(g))) continue;
      if (k === 'hero' && fameAt(g) < 40 && (L(g).renown ?? 0) < 40) continue;
      out.push({ label: `"${K.line}"`, key: k });
    }
    return [...out, { label: '아직 정하지 않는다', key: 'none' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '사제를 돌려보냈다. 죽음 이야기는 다음에 하자.';
    const v = E(g);
    v.wish = key;
    stress(g, -5);
    log(g, `장례 방식을 정했다: ${KINDS[key].name}.`);
    return {
      plain: '마을 묘지, 부모님 곁에. 나무 묘표 하나면 된다. 사제가 고개를 끄덕였다. 가장 흔한 바람이다.',
      family: '가문 묘역에 돌비석을 세워 달라고 했다. 돈이 드는 일이다. 그래도 후손들이 찾아올 자리가 있었으면 했다.',
      temple: '신전 납골당 벽에 이름패 하나. 사제가 반겼다. 신의 집에 머문다는 건 나쁘지 않다.',
      home: `태어난 고장 ${placeName(v.birth)}의 언덕에 묻어 달라고 했다. 평생 떠나 살았지만, 끝은 거기였으면 한다.`,
      ash: '태워서 강물에 뿌려 달라고 했다. 사제가 눈살을 찌푸렸다. 무덤이 없으면 찾아올 사람도, 침 뱉을 사람도 없다.',
      hero: '큰 비석에 내가 한 일을 새겨 달라고 했다. 사제가 잠시 말이 없었다. 허영인지 기록인지는 후손이 정할 것이다.',
    }[key];
  },
});

/* ---------- 기억이 흐려질 때 ---------- */
defineScene('elder_forget', {
  title: () => '흐려지는 기억',
  text: (g, s) => {
    const p = s.who != null ? byId(g, s.who) : null;
    return {
      name: `${p ? J(p.name, '이/가') : '손주가'} 인사를 했다. 이름이 떠오르지 않았다. 분명히 아는 얼굴인데. 아이가 고개를 갸웃했다.`,
      lost: '장에 다녀오던 길이었다. 정신을 차려 보니 모르는 골목이었다. 아니, 아는 골목인데 어디인지 모르겠다. 해가 지고 있었다.',
      dead: `저녁상 앞에서 ${p ? J(p.name, '을/를') : '먼저 간 사람을'} 불렀다. "밥 먹게." 대답이 없었다. 그 사람이 간 지 몇 해가 지났는지, 그제야 생각났다.`,
      pot: '부엌에서 탄내가 났다. 솥을 올려 둔 것을 까맣게 잊고 있었다. 이웃이 달려와 불을 껐다.',
    }[s.how];
  },
  choices: (g, s) => [
    { label: '웃어넘긴다', key: 'laugh' },
    { label: '적어 두는 버릇을 들인다', key: 'write' },
    { label: '아무렇지 않은 척한다', key: 'hide' },
    ...(s.how === 'dead' ? [{ label: '그 이름을 부르며 운다', key: 'cry' }] : []),
  ],
  resolve(g, rng, s, key) {
    const v = E(g);
    if (key === 'write') { v.fog = Math.max(0, v.fog - 2); gainStat(g, 'wil', 0.3); return '그날부터 주머니에 작은 수첩을 넣고 다녔다. 이름, 길, 할 일. 수첩이 나를 대신 기억한다.'; }
    if (key === 'hide') { stress(g, 8); return '아무 일 없었다는 듯 굴었다. 식구들은 눈치챘지만 모르는 척해 주었다. 그게 더 아팠다.'; }
    if (key === 'cry') { stress(g, -6); return '그 이름을 몇 번이고 불렀다. 대답은 없었지만, 부르는 동안은 곁에 있는 것 같았다.'; }
    stress(g, -3);
    return s.how === 'lost' ? `지나가던 아이가 길을 알려 주었다. "${g.player.sex === 'f' ? '할머니' : '할아버지'} 집 저기잖아요." 웃으며 고맙다고 했다. 정말로 웃겼다.` : '늙으면 다 그렇지. 그렇게 말하고 웃었다. 웃을 수 있을 때 웃어 두자.';
  },
});

/* ---------- 임종 ---------- */
HOOKS.beforeDeath.push((g, rng, cause) => {
  const v = E(g);
  if (v.dying || g.over || !NATURAL.test(cause ?? '') || bage(g) < 50 || playerAge(g) < 30) return;
  if (!rng.chance(/노환/.test(cause) ? 0.9 : 0.6)) return;
  v.dying = { cause, t: mi(g) };
  const ok = showScene(g, { kind: 'elder_deathbed', t: mi(g), at: null }, { force: true });
  if (!ok) { v.dying = null; return; }
  return false;
});
const foesOf = (g) => Object.entries(feudState(g).grudges).map(([id, gr]) => [byId(g, Number(id)), gr]).filter(([p, gr]) => p?.alive && gr.heat >= 25).sort((a, b) => b[1].heat - a[1].heat);
defineScene('elder_deathbed', {
  keep: true,
  title: () => '임종',
  text: (g) => {
    const kids = heirsOf(g).slice(0, 4);
    const sp = byId(g, me(g).spouseId);
    const around = [sp?.alive ? sp.name : null, ...kids.map((k) => k.name)].filter(Boolean);
    return `숨이 가쁘다. 의원이 고개를 저었다. ${around.length ? `머리맡에 ${around.join(', ')}. ` : '머리맡에 아무도 없다. 이웃 하나가 물을 떠다 놓고 갔다. '}창밖으로 계절이 지나간다. 할 말이 남았다면 지금이다.`;
  },
  choices: (g) => {
    const v = E(g), out = [];
    for (const k of heirsOf(g).slice(0, 3)) out.push({ label: `${heirWord(g, k)} ${k.name}의 손을 잡고 뒤를 부탁한다`, key: `bless:${k.id}` });
    const f = foesOf(g)[0];
    if (f) out.push({ label: `원수 ${f[0].name}에게 용서를 구한다고 전해 달라`, key: `foe:${f[0].id}` });
    if ((crimeState(g).murders ?? 0) > 0 || (L(g).notoriety ?? 0) >= 30) out.push({ label: '숨겨 온 일을 털어놓는다', key: 'confess' });
    if (!v.wish) out.push({ label: v.birth && v.birth !== here(g) ? '고향 땅에 묻어 달라' : '부모님 곁에 묻어 달라', key: 'bury' });
    out.push({ label: '아직은 갈 수 없다', key: 'hold' });
    out.push({ label: '말없이 창밖을 본다', key: 'quiet' });
    return out;
  },
  resolve(g, rng, s, key) {
    const v = E(g);
    if (key.startsWith('bless:')) {
      const k = byId(g, Number(key.slice(6)));
      if (!k?.alive) return '부르려던 이름이 입안에서 맴돌았다.';
      v.blessed = k.id;
      k.affection = Math.min(100, (k.affection ?? 0) + 15);
      return `${k.name}의 손을 잡았다. 따뜻했다. "집안을 부탁한다." ${J(k.name, '은/는')} 대답 대신 손에 힘을 주었다. 그거면 됐다.`;
    }
    if (key.startsWith('foe:')) {
      const p = byId(g, Number(key.slice(4)));
      const f = feudState(g);
      for (const [id, gr] of Object.entries(f.grudges)) {
        gr.heat = clamp(gr.heat - (p && Number(id) === p.id ? 40 : 10), 0, 100);
        if (gr.heat < 15) { delete f.grudges[id]; f.forgiven = (f.forgiven ?? 0) + 1; }
      }
      gainStat(g, 'wil', 0.5);
      return `"${p?.name ?? '그 사람'}에게 전해 다오. 내가 미안했다고." 말하고 나니 숨쉬기가 조금 편했다. 그 말이 닿을지는 모른다. 닿지 않아도, 했다.`;
    }
    if (key === 'confess') {
      v.confessed = true;
      deed(g, 'honest', 6, '죽기 전에 숨겨 온 죄를 털어놓았다더라');
      for (const k of heirsOf(g).slice(0, 4)) k.affection = (k.affection ?? 0) + (rng.chance(0.5) ? -6 : 4);
      return '오래 숨겨 온 일을 털어놓았다. 방 안이 조용해졌다. 누군가는 울었고, 누군가는 방을 나갔다. 무거운 것은 이제 그들 몫이다. 미안하다. 그래도 가볍다.';
    }
    if (key === 'bury') {
      v.wish = v.birth && v.birth !== here(g) ? 'home' : 'plain';
      return v.wish === 'home' ? `"${placeName(v.birth)}에… 언덕에…" 다 말하지 못했다. 그래도 알아들은 얼굴들이었다.` : '"부모님 곁에." 그 말에 다들 고개를 끄덕였다. 어려운 부탁이 아니라서 다행이었다.';
    }
    if (key === 'hold') {
      if (check(rng, g.player.stats.wil * 0.6 + 10, 55) && rng.chance(0.45)) {
        v.dying = null;
        v.frail = clamp(v.frail + 15, 0, 100);
        stress(g, -10);
        log(g, '죽을 고비를 넘겼다.');
        return '숨이 끊어질 듯 이어졌다. 사흘 밤을 그렇게 버텼다. 나흘째 아침, 미음을 받아 삼켰다. 의원이 고개를 갸웃했다. 아직은 아니었다.';
      }
      return '이를 악물었다. 아직 할 일이 있는데. 그래도 몸이 먼저 알고 있었다. 창밖이 하얗게 밝아 왔다.';
    }
    stress(g, -10);
    return '창밖을 보았다. 젊을 때 뛰어다니던 길이 보였다. 아무 말도 하지 않았다. 할 말은 이미 살면서 다 했다.';
  },
});

/* ---------- 장례 (대를 이은 뒤) ---------- */
const FUNERAL_COST = (kind) => KINDS[kind]?.cost ?? 5;
function epitaphFor(g, gr, how) {
  const n = `${gr.name} ${gr.lastName ?? ''}`.trim();
  const s = gr.summary ? `${gr.summary}. ` : '';
  if (gr.kind === 'ash') return '';
  if (how === 'grand' || gr.kind === 'hero') return `${n}, ${gr.born}~${gr.died}. ${s}이 고장이 그 이름을 기억한다.`;
  if (gr.kind === 'family') return `${n}, ${gr.born}~${gr.died}. ${s}가문의 ${gr.gen}대 주인, 여기 잠들다.`;
  if (gr.kind === 'temple') return `${n}. ${gr.died}년 신의 품으로 돌아가다.`;
  return `${n}, ${gr.age}살. ${gr.died}년에 잠들다.`;
}
defineScene('elder_funeral', {
  keep: true,
  title: (g, s) => `${graveById(g, s.grave)?.name ?? ''}의 장례`.trim(),
  text: (g, s) => {
    const gr = graveById(g, s.grave);
    const foe = s.foe != null ? byId(g, s.foe) : null;
    const wish = KINDS[gr.kind];
    return `${J(gr.name, '을/를')} 보내는 날. 조문객은 ${s.mourners}명쯤 왔다. ${s.mourners >= 25 ? '마을 길이 사람으로 가득 찼다.' : s.mourners >= 8 ? '마당이 꽉 찼다.' : '쓸쓸한 장례였다.'}${foe ? ` 원수였던 ${foe.name}도 멀찍이 서 있었다.` : ''} 고인은 "${wish.line}"라고 했었다. 장례비로 은화 ${FUNERAL_COST(gr.kind)}닢이 든다. 지금 내 주머니에는 ${g.player.money}닢.`;
  },
  choices: (g, s) => {
    const gr = graveById(g, s.grave);
    if (!gr) return [];
    const out = [];
    if (canSpend(g, FUNERAL_COST(gr.kind))) out.push({ label: `고인의 뜻대로 치른다 (은화 ${FUNERAL_COST(gr.kind)}닢)`, key: 'wish' });
    if (gr.kind !== 'ash' && canSpend(g, 50)) out.push({ label: '성대하게 치른다 (은화 50닢)', key: 'grand' });
    out.push({ label: '식구끼리 조용히 치른다', key: 'small' });
    return out;
  },
  resolve(g, rng, s, key) {
    const gr = graveById(g, s.grave);
    if (!gr) return '장례는 어찌어찌 끝났다.';
    const wished = gr.kind;
    if (key === 'wish') {
      if (!spend(g, FUNERAL_COST(wished))) key = 'small';
      else { stress(g, -10); gainStat(g, 'wil', 0.3); }
    }
    if (key === 'grand') {
      if (!spend(g, 50)) key = 'small';
      else { deed(g, 'generous', 5, `${gr.name}의 장례를 성대하게 치렀다더라`); if (!['family', 'hero'].includes(gr.kind)) gr.kind = 'family'; stress(g, -6); }
    }
    let text;
    if (key === 'small') {
      const broke = ['family', 'hero', 'temple', 'home'].includes(wished);
      gr.kind = wished === 'ash' ? 'ash' : 'plain';
      gr.place = wished === 'ash' ? gr.place : here(g);
      if (broke) { stress(g, 8); text = `식구끼리 조용히 묻었다. 고인이 바란 ${KINDS[wished].name}${jo(KINDS[wished].name, '은/는')} 해 드리지 못했다. 언젠가 갚겠다고 무덤 앞에서 약속했다.`; }
      else text = wished === 'ash' ? '식구끼리 장작을 쌓았다. 연기가 곧게 올라갔다. 재는 강물에 흘려보냈다. 물살이 금방 데려갔다.' : '식구끼리 조용히 묻었다. 나무 묘표에 이름을 새겼다. 고인이 바란 대로였다.';
    } else if (key === 'grand') text = '사제 셋이 노래하고, 악사가 앞장섰다. 마을 사람들이 줄지어 흙 한 줌씩을 던졌다. 사람들은 오래 이 장례를 이야기할 것이다.';
    else text = {
      plain: '마을 묘지, 부모 곁에 묻었다. 나무 묘표에 이름을 새겼다. 고인이 바란 대로였다.',
      family: '가문 묘역에 돌비석을 세웠다. 석수가 사흘 동안 글자를 팠다. 후손들이 찾아올 자리가 생겼다.',
      temple: '신전 납골당 벽에 이름패를 걸었다. 사제가 향을 피웠다. 신의 집이 고인을 맡았다.',
      home: `${placeName(gr.place)}의 언덕까지 관을 메고 갔다. 고인이 태어난 땅이다. 바람이 많이 불었다.`,
      ash: '장작을 쌓아 태우고, 재는 강물에 뿌렸다. 무덤은 없다. 강가에 서면 고인이 생각날 것이다.',
      hero: '공적비를 세웠다. 고인이 한 일을 빼곡히 새겼다. 다 새기지 못해 석수가 뒷면까지 썼다.',
    }[wished];
    gr.epitaph = epitaphFor(g, gr, key);
    gr.tended = gr.kind === 'ash' ? 0 : key === 'small' ? 60 : 85;
    log(g, `${J(gr.name, '을/를')} ${KINDS[gr.kind].name}에 모셨다.`);
    return `${text}${gr.epitaph ? ` 비문: "${gr.epitaph}"` : ''}`;
  },
});

/* ---------- 무덤을 찾아오는 사람들 ---------- */
defineScene('elder_grave_foe', {
  title: () => '무덤 앞의 원수',
  text: (g, s) => {
    const p = byId(g, s.who), gr = graveById(g, s.grave);
    const rw = relWordOf(g, gr);
    return s.mood === 'spit'
      ? `${rw}의 무덤에 갔더니 ${J(p.name, '이/가')} 먼저 와 있었다. 비석에 침을 뱉고 발로 걷어찼다. "죽었다고 끝난 줄 알았나." 나를 보고도 피하지 않았다.`
      : `${rw}의 무덤 앞에 ${J(p.name, '이/가')} 앉아 술을 따르고 있었다. 평생 ${rw}${jo(rw, '과/와')} 원수로 지낸 사람이다. "끝내 화해를 못 했군." 혼잣말이었다.`;
  },
  choices: (g, s) => {
    const p = byId(g, s.who);
    if (!p?.alive || !graveById(g, s.grave)) return [];
    return s.mood === 'spit'
      ? [{ label: '멱살을 잡는다', key: 'grab' }, { label: '까닭을 묻는다', key: 'ask' }, { label: '원수를 갚겠다고 맹세한다', key: 'swear' }, { label: '못 본 척 보낸다', key: 'let' }]
      : [{ label: '곁에 앉아 같이 잔을 든다', key: 'drink' }, { label: '쫓아낸다', key: 'chase' }, { label: '멀리서 지켜본다', key: 'watch' }];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.who), gr = graveById(g, s.grave);
    if (!p?.alive || !gr) return '돌아보니 아무도 없었다.';
    const f = feudState(g), grd = f.grudges[p.id];
    const heat = (n) => { if (grd) grd.heat = clamp(grd.heat + n, 0, 100); };
    const end = () => { if (grd) { delete f.grudges[p.id]; f.forgiven = (f.forgiven ?? 0) + 1; } if (p.bond === 'enemy') p.bond = null; p.affection = Math.max(p.affection ?? 0, 0); };
    gr.foes += 1;
    if (s.mood === 'spit') {
      if (key === 'grab') {
        const ok = check(rng, g.player.stats.str * 0.6 + (g.player.skills.sword ?? 0) * 0.3, 40);
        heat(10); deed(g, 'brave', 2, null);
        if (ok) return `멱살을 잡아 무덤 앞에 꿇렸다. "닦아." ${J(p.name, '은/는')} 이를 갈며 소매로 비석을 닦았다. 원한은 더 깊어졌을 것이다.`;
        gr.desecrated = true;
        return `멱살을 잡았지만 밀려 넘어졌다. ${J(p.name, '은/는')} 비석을 한 번 더 걷어차고 갔다. 비석이 기울었다.`;
      }
      if (key === 'ask') {
        const why = grd?.why?.[0] ?? '오래된 일';
        if (check(rng, g.player.stats.cha * 0.6 + (grd ? 60 - grd.heat : 30), 45)) { heat(-25); if (grd && grd.heat < 15) end(); return `"왜 이러십니까." ${J(p.name, '은/는')} 한참 노려보다가 털어놓았다. ${why}. 듣고 보니 그럴 만도 했다. "나는 그 사람이 아닙니다." ${J(p.name, '은/는')} 대답 없이 돌아갔다. 침은 더 뱉지 않았다.`; }
        gr.desecrated = true; heat(5);
        const who = { 아버지: '아비', 어머니: '어미', 할아버지: '할아비', 할머니: '할미' }[relWordOf(g, gr)] ?? '집안 어른';
        return `까닭을 물었다. "네 ${who}한테 물어봐라. 아, 못 묻겠구나." 비석이 넘어졌다.`;
      }
      if (key === 'swear') { heat(15); gainStat(g, 'wil', 0.4); gr.desecrated = true; return `무덤 앞에서 맹세했다. 이 일은 잊지 않는다. ${J(p.name, '은/는')} 웃으며 갔다. 넘어진 비석을 일으켜 세우며 이를 악물었다.`; }
      gr.desecrated = true; heat(-8); stress(g, 10);
      return '못 본 척 고개를 돌렸다. 발소리가 멀어진 뒤 가 보니 비석이 기울어 있었다. 죽은 사람 일로 산 사람끼리 피를 볼 수는 없다. 그렇게 생각하기로 했다.';
    }
    if (key === 'drink') {
      end(); like(p, 15);
      log(g, `${J(p.name, '과/와')} ${gr.name}의 무덤 앞에서 잔을 나눴다.`);
      return `곁에 앉아 잔을 받았다. ${J(p.name, '은/는')} ${gr.name} 이야기를 했다. 내가 모르던 이야기였다. 젊을 때는 둘이 친구였다고 했다. 해가 질 무렵, 두 집안의 원한은 술잔에 녹아 무덤가에 스몄다.`;
    }
    if (key === 'chase') { heat(10); return `"여긴 당신이 올 자리가 아니오." ${J(p.name, '은/는')} 술병을 두고 갔다. 그 병을 한참 내려다보았다.`; }
    heat(-12);
    return `멀리서 지켜보았다. ${J(p.name, '은/는')} 잔을 비석 앞에 두고 오래 앉아 있다 갔다. 미움도 그리움도, 오래되면 비슷한 얼굴을 한다.`;
  },
});
const like = (p, n) => { p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
const STRANGER = {
  debt: (rw) => `${rw}의 무덤 앞에 낯선 사람이 무릎을 꿇고 있었다. "젊을 때 이분께 목숨을 빚졌습니다. 갚을 날을 놓쳤어요."`,
  lover: (rw) => `${rw}의 무덤 앞에 늙은 사람이 꽃을 놓고 있었다. 나를 보더니 눈을 크게 떴다. "닮았구나. 젊을 때의 그 사람을." 집안 누구도 모르는 이름을 댔다.`,
  pupil: (rw, n) => `${rw}의 무덤 앞에 ${J(n, '이/가')} 서 있었다. ${rw}에게 배운 제자라고 했다. "스승님 덕에 먹고살았습니다. 이제야 왔습니다."`,
  curse: (rw) => `${rw}의 무덤 앞에 낯선 사람이 서 있었다. 나를 보더니 얼굴이 굳었다. "당신 집안 사람이 내 아버지를 죽였소. 무덤이라도 보고 싶었소."`,
};
defineScene('elder_grave_stranger', {
  title: () => '무덤가의 낯선 사람',
  text: (g, s) => { const gr = graveById(g, s.grave); return STRANGER[s.how](relWordOf(g, gr), s.name); },
  choices: (g, s) => {
    if (!graveById(g, s.grave)) return [];
    if (s.how === 'curse') return [{ label: '집안을 대신해 사과한다', key: 'sorry' }, ...(canSpend(g, 15) ? [{ label: '은화 15닢을 건넨다', key: 'pay' }] : []), { label: '쫓아낸다', key: 'chase' }];
    return [{ label: '이야기를 듣는다', key: 'listen' }, { label: '이름과 사는 곳을 묻는다', key: 'ask' }, { label: '자리를 비켜 준다', key: 'leave' }];
  },
  resolve(g, rng, s, key) {
    const gr = graveById(g, s.grave);
    if (!gr) return '돌아보니 아무도 없었다.';
    gr.visits += 1; gr.tended = clamp(gr.tended + 10, 0, 100);
    const rw = relWordOf(g, gr);
    if (s.how === 'curse') {
      if (key === 'sorry') { deed(g, 'kind', 3, null); gainStat(g, 'wil', 0.3); return `머리를 숙였다. 내가 한 일은 아니다. 그래도 내 집안이 한 일이다. 그 사람은 한참 서 있다가, 비석에 손을 한 번 얹고 갔다. 침은 뱉지 않았다.`; }
      if (key === 'pay') { if (!spend(g, 15)) return '은화가 모자랐다. 그 사람은 내 손을 보고 고개를 저었다.'; deed(g, 'generous', 2, null); return '은화를 건넸다. 받았다. 피값으로는 턱없지만, 그 사람의 아이들이 한 달은 배불리 먹을 것이다.'; }
      gr.desecrated = rng.chance(0.4) || gr.desecrated;
      return `"여기서 나가시오." 그 사람은 나갔다. ${gr.desecrated ? '다음 날 가 보니 비석에 흙이 끼얹어져 있었다.' : '다시는 오지 않았다.'}`;
    }
    if (key === 'listen') {
      stress(g, -6);
      if (s.how === 'debt') { const gift = rng.int(8, 20); g.player.money += gift; return `그 사람은 ${rw} 이야기를 오래 했다. 내가 모르는 ${rw}였다. 떠나며 은화 ${gift}닢이 든 주머니를 비석 앞에 두고 갔다. "이제라도 갚습니다."`; }
      if (s.how === 'lover') return `${rw}${jo(rw, '이/가')} 젊을 때 어떤 사람이었는지 들었다. 집에서는 한 번도 들은 적 없는 이야기였다. 사람은 다 알 수 없는 법이다.`;
      return `${rw}${jo(rw, '이/가')} 가르치던 모습을 들었다. 엄했고, 그런데 밥은 늘 먼저 챙겨 줬다고 했다. 그건 나도 아는 ${rw}였다.`;
    }
    if (key === 'ask') {
      const p = makePerson(rng, { ageMonths: rng.int(45, 70) * 12, job: rng.pick(['farmer', 'merchant', 'laborer', 'carpenter']) });
      if (s.name) { const [n0] = s.name.split(' '); p.name = n0; }
      p.place = here(g); p.known = true; p.affection = 35;
      g.people.push(p); rel(p);
      remember(g, p, `${gr.name}의 무덤 앞에서 처음 만났다`, 1, { tag: 'elder_grave' });
      return `${J(p.name, '이/가')} 이름을 알려 주었다. 가까운 데 산다고 했다. "언제 한번 들르게. ${rw} 이야기를 더 듣고 싶네." 그 사람이 웃었다.`;
    }
    return '자리를 비켜 주었다. 멀리서 보니 그 사람은 오래도록 비석 앞에 서 있었다. 무덤은 집안 것이지만, 그리움은 집안 것만이 아니다.';
  },
});
defineScene('elder_memoir_read', {
  keep: true,
  title: () => '남겨진 회고록',
  text: (g, s) => {
    const m = E(g).memoirs.find((x) => x.idx === s.idx);
    const dark = m.lines.filter((x) => x.dark && x.how === 'truth');
    const pick = dark[0] ?? m.lines[0];
    return `${m.by}의 궤짝에서 원고 뭉치가 나왔다. 『${m.title}』. ${m.done ? '' : '끝을 맺지 못한 원고다. '}${pick ? `한 장을 펼치니 ${pick.y}년의 일이 적혀 있다. "${pick.text}" ` : ''}${dark.length ? '집안에서 아무도 몰랐던 일이다.' : '아는 이야기인데, 그 사람의 글씨로 읽으니 달랐다.'}`;
  },
  choices: (g, s) => {
    const m = E(g).memoirs.find((x) => x.idx === s.idx);
    if (!m) return [];
    const out = [{ label: '끝까지 읽고 간직한다', key: 'keep' }];
    if (m.skill) out.push({ label: '적힌 솜씨를 따라 배운다', key: 'learn' });
    if (!m.done || !m.workId) out.push({ label: '베껴서 세상에 낸다', key: 'publish' });
    out.push({ label: '태워 버린다', key: 'burn' });
    return out;
  },
  resolve(g, rng, s, key) {
    const m = E(g).memoirs.find((x) => x.idx === s.idx);
    if (!m) return '원고가 사라졌다.';
    m.read = true;
    const A = artsState(g);
    const work = m.workId != null ? A?.works?.find((w) => w.id === m.workId) : null;
    if (key === 'learn') { gainSkill(g, m.skill, 2, 'int'); gainStat(g, 'int', 0.3); return '여백에 적힌 요령들을 따라 해 보았다. 평생 걸려 얻은 것을 몇 달 만에 얻었다. 고맙고, 조금 미안했다.'; }
    if (key === 'publish') {
      if (A && Array.isArray(A.works)) {
        const w = { id: A.seq++, kind: 'history', theme: m.truth >= m.gloss ? 'truth' : 'praise', title: m.title, author: m.by, mine: false, gen: (L(g).gen ?? 2) - 1, year: g.date.year, place: here(g), q: m.q ?? 30, esteem: Math.round(clamp((m.q ?? 30) * 0.45 + 5, 1, 80)), copies: 2, banned: null, lost: false, ruler: null, patron: null, memoir: true };
        A.works.push(w); m.workId = w.id;
      }
      deed(g, 'honest', 2, null);
      return `필사장이에게 맡겨 몇 권을 베꼈다. 『${m.title}』. 이제 ${m.by}의 이야기는 집안 밖에서도 읽힌다.`;
    }
    if (key === 'burn') {
      if (work) { work.copies = Math.max(0, (work.copies ?? 1) - 1); if (work.copies <= 0) work.lost = true; }
      m.burned = true;
      stress(g, 4);
      return `원고를 아궁이에 넣었다. 종이가 오그라들며 ${m.by}의 글씨가 하나씩 사라졌다. ${work && !work.lost ? '세상에 나간 사본은 어쩔 수 없다.' : '이제 그 이야기를 아는 사람은 나뿐이다.'}`;
    }
    stress(g, -8); gainStat(g, 'wil', 0.3);
    return `밤새 읽었다. ${m.by}${jo(m.by, '이/가')} 나보다 젊었던 시절이 거기 있었다. 원고를 궤짝에 도로 넣었다. 언젠가 내 아이도 이걸 읽을 것이다.`;
  },
});

/* ---------- 성묘 ---------- */
ACTIONS.push({
  id: 'elder_tomb', name: '성묘', icon: 'pray',
  desc: '이 고장에 묻힌 식구와 조상의 무덤을 돌본다. 풀을 베고, 비석을 닦고, 술 한 잔을 따른다.',
  available: (g) => ready(g) && gravesHere(g).length > 0,
  run(g, rng) {
    const list = gravesHere(g).sort((a, b) => (b.desecrated - a.desecrated) || a.tended - b.tended);
    const gr = list[0];
    const rw = relWordOf(g, gr);
    const before = gr.tended;
    gr.tended = clamp(gr.tended + 30, 0, 100);
    gr.visits += 1;
    stress(g, -6); tired(g, 3);
    let fix = '';
    if (gr.desecrated) {
      if (canSpend(g, 10)) { spend(g, 10); gr.desecrated = false; fix = ' 석수를 불러 기운 비석을 바로 세웠다. 은화 열 닢이 들었다.'; }
      else fix = ' 기운 비석을 손으로 밀어 보았지만 꿈쩍도 하지 않았다. 석수를 부를 돈이 없다.';
    }
    const others = list.length > 1 ? ` 곁에 묻힌 ${list.slice(1, 3).map((x) => `${relWordOf(g, x)} ${x.name}`).join(', ')}의 무덤도 돌보았다.` : '';
    for (const x of list.slice(1, 3)) x.tended = clamp(x.tended + 15, 0, 100);
    const ep = gr.epitaph ? ` 비문을 소리 내어 읽었다. "${gr.epitaph}"` : '';
    return `${rw} ${gr.name}의 무덤. ${before < 30 ? '잡초가 무릎까지 자라 있었다. 한나절을 베었다.' : '풀을 뽑고 비석을 닦았다.'}${ep}${fix}${others} 술 한 잔을 따르고 한참 앉아 있었다.`;
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = E(g);
  const now = mi(g);
  v.birth ??= here(g);
  // 1) 식구가 죽으면 무덤이 생긴다
  const m = me(g);
  const kinIds = [m.fatherId, m.motherId, m.spouseId, loveState(g).widowed?.id, ...(m.childIds ?? [])].filter((id) => id != null);
  for (const id of kinIds) {
    if (v.graved.includes(id)) continue;
    const p = byId(g, id);
    if (!p || p.alive || p.isPlayer) continue;
    const rw = id === m.fatherId ? '아버지' : id === m.motherId ? '어머니' : (m.childIds ?? []).includes(id) ? (p.sex === 'm' ? '아들' : '딸') : (p.sex === 'm' ? '남편' : '아내');
    const gr = addGrave(g, p, { rel: rw });
    if (gr) gr.epitaph = `${p.name} ${p.lastName ?? ''}, ${gr.died}년에 잠들다.`.replace(' ,', ',');
  }
  // 2) 임종: 미뤄 둔 죽음이 온다
  if (v.dying && now > v.dying.t && !L(g).pendingDeath) L(g).pendingDeath = v.dying.cause;
  // 3) 몸과 기억
  const a = bage(g);
  if (a >= 50) {
    const inj = Math.min(4, g.player.injuries?.length ?? 0);
    v.frail = clamp(v.frail + 0.12 + (a - 50) * 0.02 + (g.player.fatigue > 70 ? 0.2 : 0) + inj * 0.05, 0, 100);
    v.fogRate ??= rng.float(0.4, 1.6); // 사람마다 기억이 흐려지는 빠르기가 다르다
    if (a >= 55) v.fog = clamp(v.fog + (0.1 + (a - 55) * 0.035) * v.fogRate * (canWrite(g) ? 0.75 : 1), 0, 100);
    if (v.frail >= 40) tired(g, 3);
    if (v.frail >= 60 && g.date.month % 3 === 0) { gainStat(g, 'str', -0.15); gainStat(g, 'agi', -0.15); }
    if (v.fog >= 45 && g.date.month % 3 === 0) gainStat(g, 'int', -0.1);
    if (v.frail >= 70 && !v.dying && !L(g).pendingDeath && rng.chance((v.frail - 70) * 0.0002)) L(g).pendingDeath = '노환';
  }
  // 4) 물러난 뒤: 자식들이 봉양한다
  if (v.retired) {
    if (L(g).job) { log(g, '물러났다가 다시 일을 잡았다.'); v.retired = null; }
    else {
      const kids = (m.childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && !p.isPlayer && ageYears(p) >= 18 && (p.affection ?? 0) >= 20 && !kinState(g).kids[p.id]?.disowned);
      if (kids.length) g.player.money += Math.min(6, kids.length * rng.int(1, 2));
      else if (g.player.money < 10 && rng.chance(0.3)) stress(g, 3);
    }
  }
  // 5) 무덤은 돌보지 않으면 기운다. 고인의 핏줄이 가까이 살면 가끔 들른다
  for (const gr of v.graves) {
    if (gr.kind === 'ash') continue;
    gr.tended = clamp(gr.tended - 0.4, 0, 100);
    const kin = living(g).filter((p) => !p.isPlayer && (p.fatherId === gr.pid || p.motherId === gr.pid) && (p.place ?? 'ern') === gr.place);
    if (kin.length) {
      gr.tended = clamp(gr.tended + 0.5, 0, 100);
      if (gr.byPlayer && rng.chance(0.015)) g.news.unshift({ text: `${J(kin[0].name, '이/가')} ${gr.name}의 무덤에 들꽃을 놓고 갔다고 한다.`, rel: 70 });
    }
  }
  // 6) 앞 대의 회고록을 펼칠 때
  if (v.readAt != null && now >= v.readAt && ready(g)) {
    const mm = v.memoirs.find((x) => !x.read && !x.queued);
    v.readAt = null;
    if (mm) { mm.queued = true; queueScene(g, 'elder_memoir_read', { idx: mm.idx }); }
  }
  // 7) 장면
  if (!ready(g) || v.dying) return;
  if (L(g).queue.some((x) => /^elder_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 4) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  if (v.fog >= 25 && rng.chance(0.05 + v.fog / 1000)) {
    const how = rng.pick(['name', 'lost', 'dead', 'pot']);
    const kidsAll = (m.childIds ?? []).flatMap((id) => [id, ...(byId(g, id)?.childIds ?? [])]).map((id) => byId(g, id)).filter((p) => p?.alive && !p.isPlayer);
    const dead = [loveState(g).widowed?.id, m.fatherId, m.motherId].map((id) => byId(g, id)).find((p) => p && !p.alive);
    if (how === 'name' && kidsAll.length) return fire('elder_forget', { how, who: rng.pick(kidsAll).id });
    if (how === 'dead' && dead) return fire('elder_forget', { how, who: dead.id });
    return fire('elder_forget', { how: rng.pick(['lost', 'pot']) });
  }
  if (a >= 60 && L(g).job && !v.retired && rng.chance(0.03) && !sceneQueued(g, 'elder_retire')) return fire('elder_retire', { ask: true });
  const lg = lastGrave(g);
  if (lg && lg.kind !== 'ash' && lg.place === here(g)) {
    const foes = Object.entries(feudState(g).grudges).filter(([, gr]) => gr.gen >= 1).map(([id, gr]) => [byId(g, Number(id)), gr]).filter(([p]) => p?.alive && !p.away);
    if (foes.length && rng.chance(0.05)) {
      const [p, gr] = rng.pick(foes);
      return fire('elder_grave_foe', { who: p.id, grave: lg.id, mood: gr.heat >= 50 || rng.chance(0.4) ? 'spit' : 'mourn' });
    }
    if (now - lg.at < 120 && rng.chance(0.025)) {
      const pu = (g.mentor?.grads ?? []).map((x) => byId(g, x.id)).find((p) => p?.alive);
      const pool = ['debt', 'lover', ...(pu ? ['pupil'] : []), ...((crimeState(g).murders ?? 0) > 0 || lg.cursed ? ['curse'] : [])];
      const how = rng.pick(pool);
      return fire('elder_grave_stranger', { how, grave: lg.id, name: how === 'pupil' ? fullName(pu) : null });
    }
  }
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = E(g);
  const life = L(g);
  const r = life.ancestors[life.ancestors.length - 1];
  const oldP = old ? byId(g, old.id) : null;
  // 앞 대 주인의 무덤
  if (oldP && r) {
    const wish = v.wish ?? 'plain';
    const place = wish === 'home' && v.birth ? v.birth : v.diedAway && wish !== 'ash' ? v.diedAway : here(g);
    const gr = addGrave(g, oldP, { kind: wish, place, byPlayer: true, gen: (life.gen ?? 2) - 1, rec: r, rel: '앞 대 주인' });
    if (gr) {
      gr.cursed = (crimeState(g).murders ?? 0) > 0;
      const mourners = living(g).filter((p) => !p.isPlayer && p.known && (p.affection ?? 0) >= 10).length + Math.round(fameAt(g) / 5);
      const foe = Object.entries(feudState(g).grudges).map(([id, x]) => [byId(g, Number(id)), x]).find(([p, x]) => p?.alive && x.heat >= 40)?.[0];
      queueScene(g, 'elder_funeral', { grave: gr.id, mourners, foe: foe?.id ?? null });
      L(g).queue[L(g).queue.length - 1].at = null;
    }
  }
  // 회고록은 궤짝에 남는다
  if (v.memoir && (v.memoir.done || v.memoir.ch >= 2)) {
    const m = v.memoir;
    v.memoirs.push({ idx: v.seq++, by: r?.name ?? '앞 대 주인', title: m.title, y: g.date.year, lines: m.lines.slice(), truth: m.truth, gloss: m.gloss, done: !!m.done, skill: m.skill ?? Object.entries(old?.skills ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null, workId: m.workId, q: m.q, read: false });
    if (v.memoirs.length > 8) v.memoirs.shift();
    v.readAt = mi(g) + rng.int(3, 9);
  }
  // 임종 때 손을 잡은 사람
  if (v.blessed != null) {
    const by = r?.name ?? '앞 대 주인';
    if (g.player.id === v.blessed) { gainStat(g, 'wil', 1); log(g, `${by}${jo(by, '이/가')} 마지막에 내 손을 잡았다.`); }
    else { const b = byId(g, v.blessed); if (b?.alive) { b.affection = (b.affection ?? 0) - 8; log(g, `임종 때 손을 잡힌 건 ${b.name}${jo(b.name, '이었/였')}다. 그런데 집안은 내가 이었다.`); } }
  }
  v.frail = 0; v.fog = 0; v.fogRate = null; v.retired = null; v.memoir = null; v.wish = null;
  v.journeys = []; v.amends = []; v.amendAt = 0; v.journeyAt = 0; v.dying = null; v.blessed = null; v.diedAway = null; v.confessed = false;
  v.sceneAt = 0; v.birth = here(g);
});
HOOKS.newGame.push((g) => { E(g); E(g).birth = L(g).place ?? 'ern'; });
HOOKS.migrate.push((g) => { E(g); });
