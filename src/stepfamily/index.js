// 37단계: 재혼과 의붓가족. 상태는 g.stepfamily 하나, 화면 연결점은 stepLines(g) / stepLine(g) / stepInfo(g).
// 누가 의붓가족인가는 사람들의 부모·배우자·자식 기록(fatherId·motherId·spouseId·childIds)에서 달마다 다시 읽는다(sync).
// - 내가 의붓부모: 배우자가 데려온 아이(kid). 내 아이가 새 배우자를 받아들이는지(mine).
//   마음을 여는 세월(warm): 같이 살면 천천히 자라고, 어린아이는 빨리, 사춘기는 느리게 연다. 장면이 크게 민다.
// - 내가 의붓자식: 홀로된 아버지나 어머니가 새 사람을 맞으면(parent) 그 사람이 데려온 아이가 의붓형제(sib).
// - 장면: 아이 딸린 사람과의 혼담(sf_suitor → love의 정혼·혼례), 새 식탁(sf_table), "당신은 내 부모가 아니야"(sf_cold),
//   데려온 아이와 낳은 아이(sf_favor), 의붓형제 싸움(sf_kids), 마음을 연 날(sf_open), 친부모가 찾아옴(sf_birth),
//   족보에 올리기(sf_adopt, kin의 내 자식이 됨), 부모의 재혼(sf_parent_wed·sf_newparent), 의붓부모의 편애(sf_stepfavor),
//   늙어서 모시겠다는 의붓자식(sf_old), 대를 이을 때 의붓자식의 몫(sf_share)과 남은 의붓부모의 몫(sf_widow).
// - 플레이어 없이도: 홀로된 NPC 부모가 다시 혼인하고(npc.js의 혼인 위에 얹음), 섞인 집안마다 다툼·마음 열기·유산 다툼이 생긴다.
// 잇는 곳: love(정혼 engaged → love_wedding, 사별 widowed·이혼 exes), kin(족보에 올리면 childIds → kin이 내 자식으로 기름, 유산 다툼),
//   siblings(같은 부모의 형제는 siblings 몫, 핏줄 안 섞인 의붓형제만 여기), elder(늙어 모시기), repute(deed).
// 새 행동은 없다. 게임 난수는 건드리지 않는다(ownRng).
import { J, hasBatchim } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, ageYears, makePerson, fullName, living, has } from '../npc.js';
import { MALE_NAMES, FEMALE_NAMES, LAST_NAMES } from '../data.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, spend, canSpend, check } from '../adventure/core.js';
import { rel, remember } from '../relations.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { loveState } from '../love/index.js';
import { kinState } from '../kin/index.js';
import { makeRng } from '../rng.js';
import * as T from './lines.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeOf = (p) => p?.place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 613) ^ Math.imul(mi(g) * 197 + salt + 31, 2654435761)) | 0 });
const alive = (p) => !!p && p.alive && !p.isPlayer;
const kidWord = (p) => (p.sex === 'm' ? '아들' : '딸');
const parentWord = (p) => (p.sex === 'm' ? '새아버지' : '새어머니');
const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.campaign && !g.army?.captive && !L(g).heirPending;

/* ---------- 상태 ---------- */
export function stepState(g) {
  g.stepfamily ??= {};
  const s = g.stepfamily;
  s.ties ??= {};    // 사람 id → { kind: kid|mine|parent|sib, via, warm, since, called, adopted, gone, asked, cold, met }
  s.npc ??= [];     // NPC 섞인 집안 [{ a, b, kids: [데려온 아이 id], y, place, warm, ev: {} }]
  s.month ??= [];
  s.used ??= [];
  s.log ??= [];
  s.done ??= {};    // 장면 키 → 달
  s.sceneAt ??= -99;
  s.lineAt ??= -99;
  s.gen ??= 0;
  s.made ??= 0;     // 지금까지 찾은 섞인 NPC 집안 수
  return s;
}
const S = stepState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, text }); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 24) s.used.shift();
  return pool[i];
}
const NUM = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const yrs = (n) => (n >= 1 && n <= 10 ? `${NUM[n]} 해` : `${Math.max(1, n)}년`);
const warmWord = (v) => (v >= 80 ? '피보다 진하다' : v >= 60 ? '마음을 열었다' : v >= 40 ? '조금씩 가까워진다' : v >= 20 ? '서먹하다' : '등을 돌렸다');

/* ---------- 누가 의붓가족인가 ---------- */
const spouseOf = (g) => { const p = byId(g, me(g).spouseId); return alive(p) ? p : null; };
/** 배우자가 데려온 아이 (내 자식이 아닌 배우자의 자식) */
export function stepKids(g) {
  const sp = spouseOf(g); if (!sp) return [];
  const mine = new Set(me(g).childIds ?? []);
  return (sp.childIds ?? []).filter((id) => !mine.has(id)).map((id) => byId(g, id)).filter(alive);
}
/** 내가 먼저 낳은 아이 (배우자의 자식이 아닌 내 자식) */
function myOwn(g) {
  const sp = spouseOf(g); if (!sp) return [];
  const theirs = new Set(sp.childIds ?? []);
  return (me(g).childIds ?? []).filter((id) => !theirs.has(id)).map((id) => byId(g, id)).filter(alive).filter((p) => !S(g).ties[p.id]?.adopted && !p.baseborn); // 혼외 자식은 baseborn 몫
}
/** 둘 사이에서 낳은 아이 */
function together(g) { const sp = spouseOf(g); if (!sp) return []; const theirs = new Set(sp.childIds ?? []); return (me(g).childIds ?? []).filter((id) => theirs.has(id)).map((id) => byId(g, id)).filter(alive); }
/** 내 아버지·어머니가 새로 맞은 사람 */
function stepParents(g) {
  const m = me(g); const out = [];
  for (const pid of [m.fatherId, m.motherId]) {
    const par = byId(g, pid); if (!par || !par.alive) continue;
    const sp = byId(g, par.spouseId);
    if (alive(sp) && sp.id !== m.fatherId && sp.id !== m.motherId) out.push([sp, par]);
  }
  return out;
}
function stepSibs(g) {
  const m = me(g); const out = [];
  for (const [sp] of stepParents(g)) for (const id of sp.childIds ?? []) {
    const k = byId(g, id); if (!alive(k)) continue;
    if ((k.fatherId != null && (k.fatherId === m.fatherId)) || (k.motherId != null && k.motherId === m.motherId)) continue; // 피가 반이라도 섞이면 siblings 몫
    out.push([k, sp]);
  }
  return out;
}
function sync(g) {
  const s = S(g); const now = mi(g);
  const seen = new Set();
  const tie = (p, kind, via, warm) => {
    seen.add(p.id);
    const t = s.ties[p.id];
    if (t && t.kind === kind) { t.via = via; return t; }
    s.ties[p.id] = { kind, via, warm, since: now, called: false, adopted: false, gone: false, asked: false, cold: -99, met: false };
    return s.ties[p.id];
  };
  const sp = spouseOf(g);
  for (const k of stepKids(g)) tie(k, 'kid', sp.id, ageYears(k) < 6 ? 35 : ageYears(k) < 13 ? 22 : 15);
  for (const k of myOwn(g)) tie(k, 'mine', sp.id, ageYears(k) < 6 ? 40 : 25);
  for (const [p, par] of stepParents(g)) tie(p, 'parent', par.id, playerAge(g) < 8 ? 30 : 18);
  for (const [k, sp2] of stepSibs(g)) tie(k, 'sib', sp2.id, 25);
  // 족보에 올린 아이는 내 자식이 되어도 기록을 남긴다
  for (const [id, t] of Object.entries(s.ties)) {
    if (seen.has(Number(id))) continue;
    const p = byId(g, Number(id));
    if (t.adopted && alive(p) && (me(g).childIds ?? []).includes(p.id)) { seen.add(p.id); continue; }
    delete s.ties[id];
  }
}
const tiesOf = (g, kind) => Object.entries(S(g).ties).filter(([, t]) => t.kind === kind || (kind === 'kid' && t.adopted && t.kind === 'kid')).map(([id, t]) => [byId(g, Number(id)), t]).filter(([p]) => alive(p));

/* ---------- 매달: 마음을 여는 세월 ---------- */
function drift(g) {
  const s = S(g);
  const cha = g.player.stats.cha ?? 20;
  for (const [id, t] of Object.entries(s.ties)) {
    const p = byId(g, Number(id)); if (!alive(p)) continue;
    const a = ageYears(p);
    if (t.kind === 'kid' || t.kind === 'mine') {
      const home = a < 18 && !t.gone && placeOf(p) === here(g);
      let d = home ? 0.18 : 0.04;
      if (a < 7) d *= 1.8; else if (a >= 13 && a < 18) d *= 0.5;
      if (t.kind === 'kid') d += (cha - 30) / 1200;
      if (t.warm > 75) d *= 0.4;
      t.warm = clamp(t.warm + d, 0, 100);
    } else if (t.kind === 'parent') {
      t.warm = clamp(t.warm + (playerAge(g) < 18 ? 0.14 : 0.03) + (has(p, 'kind') ? 0.06 : 0) - (has(p, 'cruel') ? 0.1 : 0), 0, 100);
    } else t.warm = clamp(t.warm + 0.06, 0, 100);
  }
}
function flavor(g, rng) {
  const s = S(g); const now = mi(g);
  if (now - s.lineAt < 5 || !rng.chance(0.3)) return;
  const sp = spouseOf(g);
  const kids = tiesOf(g, 'kid').filter(([p]) => ageYears(p) < 20 && placeOf(p) === here(g));
  const opts = [];
  if (kids.length && sp) {
    const [p, t] = rng.pick(kids);
    const c = { k: p.name, sp: sp.name, w: kidWord(p) };
    opts.push(() => line(g, 'kid', pickFresh(g, rng, t.warm >= 60 ? 'kw' : t.warm >= 30 ? 'kg' : 'kc', t.warm >= 60 ? T.KID_WARM : t.warm >= 30 ? T.KID_GROW : T.KID_COLD)(c)));
    if (together(g).some((x) => ageYears(x) < 6)) opts.push(() => line(g, 'mixed', pickFresh(g, rng, 'mx', T.MIXED)(c)));
  }
  const pars = tiesOf(g, 'parent');
  if (pars.length && playerAge(g) >= 6 && playerAge(g) < 22) {
    const [p, t] = rng.pick(pars);
    opts.push(() => line(g, 'parent', pickFresh(g, rng, t.warm >= 50 ? 'pw' : 'pc', t.warm >= 50 ? T.PARENT_WARM : T.PARENT_COLD)({ p: p.name, pw: parentWord(p) })));
  }
  const sibs = tiesOf(g, 'sib');
  if (sibs.length && playerAge(g) >= 6 && playerAge(g) < 25) { const [p] = rng.pick(sibs); opts.push(() => line(g, 'sib', pickFresh(g, rng, 'sb', T.SIBS)({ s: p.name }))); }
  if (!opts.length) return;
  rng.pick(opts)(); s.lineAt = now;
}

/* ---------- 장면 ---------- */
const warmUp = (g, id, n) => { const t = S(g).ties[id]; if (t) t.warm = clamp(t.warm + n, 0, 100); return t; };
const kname = (g, s) => byId(g, s.id)?.name ?? s.name;

defineScene('sf_suitor', {
  title: () => '아이 딸린 혼담',
  text: (g, s) => `중매쟁이가 찾아왔다. ${s.pl}의 ${s.name}, ${s.age}살. ${s.lost === 'dead' ? '배우자를 먼저 보냈다' : '살던 사람과 갈라섰다'}고 한다. 아이가 ${s.kids.length === 1 ? '하나' : s.kids.length === 2 ? '둘' : '셋'} 딸렸다. "${s.kids.map((k) => k.name).join(', ')}. 다들 순해요. 아이들한텐 어른이 하나 더 있어야 하고, 댁한텐 식구가 있어야지요."`,
  choices: (g) => (me(g).spouseId || loveState(g).engaged ? [] : [{ label: '혼담을 받아들인다', key: 'yes' }, { label: '아이들부터 만나 본다', key: 'meet' }, { label: '아직은 혼자 살겠다고 한다', key: 'no' }]),
  resolve(g, rng, s, key) {
    const st = S(g); st.done.suitor = mi(g);
    if (key === 'no') return '중매쟁이는 혀를 차며 돌아갔다. 문을 닫고 나니 집이 조금 더 넓어 보였다.';
    const r = ownRng(g, 17);
    const sex = s.sex;
    const p = makePerson(r, { sex, ageMonths: s.age * 12 + 3, lastName: s.last, job: s.job, traits: ['kind', r.pick(['content', 'reserved', 'generous', 'pious'])] });
    p.name = s.name; p.place = here(g); p.known = true; p.affection = 35; p.romance = 30;
    g.people.push(p); rel(p);
    for (const k of s.kids) {
      const c = makePerson(r, { sex: k.sex, ageMonths: k.age * 12 + 1, lastName: s.last, job: k.age >= 15 ? 'farmer' : 'child', fatherId: sex === 'm' ? p.id : null, motherId: sex === 'f' ? p.id : null });
      c.name = k.name; c.place = here(g); c.known = true; c.affection = 10;
      g.people.push(c); p.childIds.push(c.id);
    }
    p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 혼담이 오갔다.` });
    loveState(g).engaged = { id: p.id, at: mi(g), wedAt: mi(g) + (key === 'meet' ? 6 : 4), arranged: false };
    log(g, `아이 딸린 ${J(p.name, '과/와')} 정혼했다.`); note(g, `${J(fullName(p), '과/와')} 정혼했다. 아이가 ${s.kids.length}명 딸렸다.`);
    if (key === 'meet') { st.done.met = p.id; stress(g, -4); return `먼저 아이들을 만났다. ${J(s.kids[0].name, '은/는')} ${s.lost === 'dead' ? '먼저 간 부모의 목도리를 두르고' : '제 부모 치마폭 뒤에 숨어서'} 나를 올려다보았다. 과자를 내밀었더니 한참 보다가 받았다. 혼례는 반년 뒤로 잡았다.`; }
    return '혼담이 오가고 날이 잡혔다. 넉 달 뒤면 식구가 한꺼번에 늘어난다. 밤에 누워 그릇이 몇 개 있어야 하나 세어 보았다.';
  },
});

defineScene('sf_table', {
  title: () => '새 식탁',
  text: (g, s) => `혼례 뒤 처음으로 다 같이 앉은 저녁상. ${s.kids.join(', ')}. ${s.kids.length > 1 ? '아이들은' : '아이는'} 숟가락만 쥐고 나를 본다. ${s.sp}도 나를 본다. 국 끓는 소리만 크다.`,
  choices: () => [{ label: '먼저 말을 건다', key: 'talk' }, { label: '억지로 다가가지 않는다', key: 'wait' }, { label: '이 집의 규칙부터 정한다', key: 'rule' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done[`table${s.sp}`] = mi(g);
    const kids = tiesOf(g, 'kid');
    if (key === 'talk') {
      const ok = check(rng, g.player.stats.cha + 10, 40);
      for (const [p] of kids) warmUp(g, p.id, ok ? 8 : 2);
      return ok ? '"오늘 뭐 했니?" 대답이 없다가, 막내가 개구리를 잡았다고 했다. 개구리 이야기로 저녁이 끝났다. 나쁘지 않은 시작이다.' : '이것저것 물었다. 대답은 "네"와 "아니요"뿐이었다. 그래도 물었다는 것은 아이들이 기억할 것이다.';
    }
    if (key === 'wait') { for (const [p] of kids) warmUp(g, p.id, ageYears(p) >= 12 ? 5 : 2); return `조용히 먹었다. 그릇을 치울 때 ${s.kids.length > 1 ? '큰아이가' : '아이가'} 제 그릇을 들고 따라 나왔다. 아무 말 없이 같이 씻었다.`; }
    for (const [p] of kids) warmUp(g, p.id, ageYears(p) >= 10 ? -6 : 1);
    deed(g, 'honest', 1, '새 식구들에게 집안 규칙을 분명히 했다');
    return s.kids.length > 1 ? '해 지기 전에 들어올 것, 거짓말하지 말 것, 서로 때리지 말 것. 막내는 고개를 끄덕였다. 큰아이는 "우리 집에선 안 그랬어요" 하고 일어섰다.' : '해 지기 전에 들어올 것, 거짓말하지 말 것. 아이는 고개를 끄덕이다 말고 작게 말했다. "우리 집에선 안 그랬어요."';
  },
});

defineScene('sf_cold', {
  title: (g, s) => (s.who === 'mine' ? '내 아이의 등' : '"당신은 내 부모가 아니야"'),
  text: (g, s) => (s.who === 'mine'
    ? `${J(s.name, '이/가')} ${s.sp}에게 대들었다. "아버지도 어머니도 아닌 사람이 왜 나한테 이래라저래라 해요?" ${J(s.sp, '은/는')} 얼굴이 굳은 채 나를 본다. 내 아이고, 내 사람이다.`
    : `${s.name}에게 해 지기 전에 들어오라고 했다. 아이가 돌아서서 소리쳤다. "당신은 내 ${s.dead ? '아버지도 어머니도' : '진짜 부모가'} 아니잖아요!" 문이 쾅 닫혔다. 부엌에서 ${J(s.sp, '이/가')} 숨을 죽이고 있다.`),
  choices: (g, s) => (s.who === 'mine'
    ? [{ label: '아이를 따로 불러 타이른다', key: 'talk' }, { label: '배우자에게 물러서 달라고 한다', key: 'back' }, { label: '아이를 엄하게 꾸짖는다', key: 'scold' }]
    : [{ label: '문 앞에 앉아 기다린다', key: 'wait' }, { label: '엄하게 다시 말한다', key: 'scold' }, { label: '배우자에게 맡긴다', key: 'leave' }]),
  resolve(g, rng, s, key) {
    const st = S(g); const t = st.ties[s.id]; if (t) t.cold = mi(g);
    if (s.who === 'mine') {
      if (key === 'talk') { warmUp(g, s.id, check(rng, g.player.stats.cha + g.player.stats.wil / 2, 45) ? 10 : 3); return `밤에 ${J(s.name, '과/와')} 마당에 앉았다. "누가 네 부모 자리를 뺏으러 온 게 아니야. 자리가 하나 더 생긴 거야." 아이는 대답하지 않았다. 다음 날 아침, ${s.sp}에게 먼저 인사를 했다.`; }
      if (key === 'back') { warmUp(g, s.id, 4); const sp = spouseOf(g); if (loveState(g).spouse) loveState(g).spouse.mood = clamp(loveState(g).spouse.mood - 6, 0, 100); if (sp) remember(g, sp, '내 아이 편만 들었다', -1, { tag: 'step_side' }); return `${s.sp}에게 아이 일은 당분간 내가 하겠다고 했다. 고개는 끄덕였지만, 그날 밤 등을 돌리고 누웠다.`; }
      warmUp(g, s.id, -8); stress(g, 5); return `크게 꾸짖었다. 아이는 입을 다물었다. ${J(s.sp, '은/는')} 고맙다고 했지만, 아이가 이제 우리 둘 다를 피한다.`;
    }
    if (key === 'wait') { const ok = check(rng, g.player.stats.wil + g.player.stats.cha / 2, 45); warmUp(g, s.id, ok ? 9 : 3); stress(g, 3); return ok ? '닫힌 문 앞에 한참 앉아 있었다. 자정 무렵 문이 조금 열렸다. 아이가 내 옆에 앉아 무릎에 얼굴을 묻었다. 둘 다 아무 말도 하지 않았다.' : '문 앞에서 한참 기다렸다. 문은 열리지 않았다. 그래도 아침에 보니 내가 두고 간 빵은 없어져 있었다.'; }
    if (key === 'scold') { const yng = ageYears(byId(g, s.id) ?? { ageMonths: 0 }) < 10; warmUp(g, s.id, yng ? -2 : -9); return yng ? '다시 엄하게 말했다. 아이는 울면서 들어왔다. 그날 밤 내 이불 끝에 와서 잠들었다. 아이들은 가끔 어른보다 빨리 용서한다.' : '목소리를 높였다. 아이는 들어왔다. 그 뒤로 나와 눈을 마주치지 않는다. 이긴 싸움인데 진 것 같다.'; }
    warmUp(g, s.id, -1); const sp = spouseOf(g); if (sp && loveState(g).spouse) loveState(g).spouse.mood = clamp(loveState(g).spouse.mood - 3, 0, 100);
    return `${s.sp}에게 맡겼다. 방에서 낮은 목소리가 오래 들렸다. 아이는 들어왔지만 나는 여전히 그 집의 손님 같았다.`;
  },
});

defineScene('sf_favor', {
  title: () => '데려온 아이와 낳은 아이',
  text: (g, s) => `${s.kid}의 신발이 다 해졌다. 같은 날 ${s.own}에게도 새 옷이 필요하다. 은화는 한 사람 몫뿐이다. ${s.mine ? `${J(s.kid, '은/는')} 배우자가 데려온 아이고, ${J(s.own, '은/는')} 내가 낳은 아이다.` : `${J(s.kid, '은/는')} 배우자가 데려온 아이고, ${J(s.own, '은/는')} 우리가 함께 낳은 아이다.`} 아이들은 다 안다. 누가 먼저인지.`,
  choices: (g) => [...(canSpend(g, 25) ? [{ label: '빚을 내서라도 둘 다 사 준다', key: 'both' }] : []), { label: `데려온 아이 것을 먼저 산다`, key: 'step' }, { label: '내 핏줄 것을 먼저 산다', key: 'blood' }],
  resolve(g, rng, s, key) {
    S(g).done.favor = mi(g);
    if (key === 'both' && spend(g, 25)) { warmUp(g, s.kid_id, 6); deed(g, 'generous', 1, '데려온 아이와 낳은 아이를 똑같이 챙겼다'); return '은화 스물다섯 닢을 더 썼다. 두 아이가 새 신과 새 옷을 입고 나란히 장터를 걸었다. 그 뒷모습을 오래 보았다.'; }
    if (key === 'step') { warmUp(g, s.kid_id, 8); return `${s.kid}에게 새 신을 사 주었다. 아이는 신을 한참 내려다보다가 "고맙습니다" 했다. ${J(s.own, '은/는')} 그날 저녁 말이 없었다. 다음 달엔 꼭 사 주겠다고 약속했다.`; }
    warmUp(g, s.kid_id, -10); deed(g, 'kind', -1, '데려온 아이를 뒷전에 두었다'); const sp = spouseOf(g); if (sp && loveState(g).spouse) loveState(g).spouse.mood = clamp(loveState(g).spouse.mood - 5, 0, 100);
    return `${s.own}의 옷을 먼저 샀다. ${J(s.kid, '은/는')} 해진 신을 실로 동여매고 다녔다. 배우자는 아무 말도 하지 않았다. 그게 더 무거웠다.`;
  },
});

defineScene('sf_kids', {
  title: () => '의붓형제의 싸움',
  text: (g, s) => `마당에서 비명이 났다. ${J(s.a, '과/와')} ${J(s.b, '이/가')} 엉겨 붙어 뒹굴고 있다. "이건 우리 엄마 거야!" "여긴 우리 집이야!" 핏줄이 다른 두 아이가 한 지붕 아래 산 지 ${s.years ? `${yrs(s.years)}째다` : '아직 한 해가 안 되었다'}.`,
  choices: () => [{ label: '둘을 똑같이 혼낸다', key: 'both' }, { label: '둘에게 같이 할 일을 맡긴다', key: 'work' }, { label: '방을 따로 쓰게 한다', key: 'split' }],
  resolve(g, rng, s, key) {
    S(g).done.kids = mi(g);
    if (key === 'work') { const ok = rng.chance(0.6); for (const id of s.ids) warmUp(g, id, ok ? 6 : 1); return ok ? '둘에게 닭장을 같이 고치라고 했다. 처음엔 서로 망치를 뺏었다. 저녁 무렵엔 같이 여우 발자국 이야기를 하고 있었다.' : '닭장을 같이 고치게 했다. 닭장은 고쳐졌다. 둘은 각자 반대쪽 끝에서 일했다.'; }
    if (key === 'both') { for (const id of s.ids) warmUp(g, id, 2); return '둘 다 저녁을 굶게 했다. 밤에 보니 한 아이가 숨겨 둔 빵을 반으로 갈라 다른 아이에게 건네고 있었다. 모른 척했다.'; }
    if (canSpend(g, 15)) spend(g, 15);
    for (const id of s.ids) warmUp(g, id, -2);
    return '헛간 옆에 방 하나를 들였다. 싸움은 줄었다. 대신 두 아이가 마주치는 일도 줄었다.';
  },
});

defineScene('sf_open', {
  title: () => '마음을 연 날',
  text: (g, s) => (s.who === 'parent'
    ? `${s.pw} ${J(s.name, '이/가')} 앓아누웠다. 약을 달여 들고 가니 힘없이 웃었다. "너한테 이런 걸 받을 줄은 몰랐네." 처음 이 집에 왔을 때가 떠올랐다. ${yrs(s.years)}가 지났다.`
    : `${J(s.name, '이/가')} 저녁상을 차리다 말고 나를 불렀다. "${s.call}, 소금 어디 있어요?" 그러고는 제가 무슨 말을 했는지 알고 얼굴이 빨개졌다. 이 집에 온 지 ${yrs(s.years)} 만이다.`),
  choices: (g, s) => (s.who === 'parent' ? [{ label: '곁에 앉아 손을 잡는다', key: 'hold' }, { label: '약만 두고 나온다', key: 'leave' }] : [{ label: '꼭 안아 준다', key: 'hug' }, { label: '모른 척 소금을 건넨다', key: 'plain' }]),
  resolve(g, rng, s, key) {
    const t = S(g).ties[s.id]; if (t) t.called = true;
    if (s.who === 'parent') { if (key === 'hold') { warmUp(g, s.id, 15); stress(g, -6); return `손이 생각보다 작았다. ${J(s.name, '은/는')} 처음으로 먼저 간 내 부모 이야기를 했다. 자기도 그 사람을 알았다고, 그래서 더 어려웠다고.`; } warmUp(g, s.id, 3); return '약만 두고 나왔다. 문을 닫기 전에 "고맙다"는 소리가 들렸다. 그거면 됐다.'; }
    warmUp(g, s.id, key === 'hug' ? 15 : 10); stress(g, -10);
    note(g, `${J(s.name, '이/가')} 처음으로 나를 ${s.call}라고 불렀다.`); log(g, `${J(s.name, '이/가')} 나를 ${s.call}라고 불렀다.`);
    return key === 'hug' ? '아이를 안았다. 아이는 뻣뻣하게 서 있다가, 천천히 내 등에 팔을 둘렀다. 국이 넘쳤다. 아무도 신경 쓰지 않았다.' : `아무 일 없다는 듯 소금 단지를 건넸다. 아이도 아무 일 없다는 듯 받았다. 그날 국은 조금 짰다. 둘 다 그 국을 남김없이 먹었다.`;
  },
});

defineScene('sf_birth', {
  title: () => '문간에 선 사람',
  text: (g, s) => (s.alive
    ? `${J(s.who, '이/가')} 찾아왔다. ${s.kid}의 친${s.wsex === 'm' ? '아버지' : '어머니'}다. 몇 해 만이다. "아이를 데려가고 싶소. 내 핏줄이오." 마당 끝에서 ${J(s.kid, '이/가')} 우리 둘을 번갈아 본다.`
    : `${s.kid}의 ${s.side} ${s.who}가 먼 길을 왔다. 먼저 간 ${s.wsex === 'm' ? '아비' : '어미'}를 쏙 빼닮았다며 아이를 오래 쓰다듬었다. "우리가 데려다 키우면 안 되겠소? 그 애 하나 남았는데."`),
  choices: () => [{ label: '아이에게 고르게 한다', key: 'ask' }, { label: '보내 준다', key: 'give' }, { label: '가끔 만나게만 한다', key: 'visit' }, { label: '돌려보낸다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); const t = st.ties[s.id]; if (t) t.asked = true;
    const p = byId(g, s.id);
    const send = () => { if (t) t.gone = true; if (p) { p.place = s.pl; p.history.push({ y: g.date.year, m: g.date.month, text: `${s.who}에게 가서 살게 되었다.` }); } };
    if (key === 'ask') {
      const stay = (t?.warm ?? 30) + rng.int(-10, 25) >= 45;
      if (stay) { warmUp(g, s.id, 12); return `${J(s.kid, '은/는')} 한참 서 있다가 내 뒤로 와서 섰다. ${J(s.who, '은/는')} 오래 아이를 보다가 고개를 끄덕이고 돌아갔다. 가끔 편지를 보내겠다고 했다.`; }
      send(); stress(g, 10); return `${J(s.kid, '은/는')} 땅만 보다가 ${s.who} 쪽으로 걸어갔다. 대문 앞에서 한 번 돌아보았다. 손을 흔들어 주었다. 그것밖에 할 수 없었다.`;
    }
    if (key === 'give') { send(); stress(g, 8); deed(g, 'kind', 1, '아이를 핏줄에게 돌려보냈다'); return `짐을 싸 주었다. 아이가 좋아하던 나무 말도 넣었다. ${J(s.who, '은/는')} 고개를 깊이 숙였다. 집이 갑자기 조용해졌다.`; }
    if (key === 'visit') { warmUp(g, s.id, 4); return `철마다 한 번씩 만나게 하기로 했다. ${J(s.who, '은/는')} 아쉬운 얼굴이었지만 받아들였다. ${J(s.kid, '은/는')} 그날 밤 두 집 이야기를 번갈아 했다.`; }
    warmUp(g, s.id, (t?.warm ?? 30) >= 50 ? 6 : -10); deed(g, 'kind', -1, '아이의 핏줄을 문간에서 돌려보냈다');
    return (t?.warm ?? 30) >= 50 ? `"이 아이 집은 여기요." ${J(s.who, '은/는')} 돌아갔다. ${J(s.kid, '이/가')} 내 손을 꽉 잡았다.` : `돌려보냈다. ${J(s.kid, '은/는')} 창가에 서서 그 뒷모습이 안 보일 때까지 보았다. 그날부터 말수가 더 줄었다.`;
  },
});

defineScene('sf_adopt', {
  title: () => '족보에 올리기',
  text: (g, s) => `${J(s.name, '이/가')} 이 집에서 산 지 ${yrs(s.years)}. 예배당 사제가 물었다. "족보에 정식으로 올리시겠소? 그러면 그 아이도 이 집 자식이오. 물려받을 것도 똑같이." ${s.blood ? `내 핏줄인 ${J(s.blood, '이/가')} 옆에서 듣고 있다.` : ''}`,
  choices: () => [{ label: '내 자식으로 올린다', key: 'yes' }, { label: '지금 이대로 둔다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); const t = st.ties[s.id]; if (t) t.asked = true;
    const p = byId(g, s.id);
    if (key !== 'yes' || !p) return '그대로 두기로 했다. 이름이 어디 적혀 있든 저녁상의 자리는 똑같다고 생각했다. 아이가 그렇게 생각할지는 모르겠다.';
    const m = me(g);
    if (!(m.childIds ?? []).includes(p.id)) m.childIds.push(p.id);
    if (t) { t.adopted = true; t.warm = clamp(t.warm + 12, 0, 100); }
    const k = kinState(g); k.kids[p.id] ??= { temper: 'quiet', gift: 'cha', giftKnown: true, path: ageYears(p) >= 13 ? 'free' : null, craft: null, bond: Math.round(t?.warm ?? 50), learned: 10, rebelled: 0, left: null, disowned: false, adopted: true, grudge: {}, jobSet: ageYears(p) >= 15, born: p.ageMonths, parent: g.player.id };
    for (const id of m.childIds) { const b = byId(g, id); if (alive(b) && b.id !== p.id && !st.ties[b.id]?.adopted && ageYears(b) >= 10 && rng.chance(0.4)) { const r = k.kids[b.id]; if (r) r.grudge[p.id] = (r.grudge[p.id] ?? 0) + 15; } }
    note(g, `${J(p.name, '을/를')} 족보에 내 자식으로 올렸다.`); log(g, `${J(p.name, '을/를')} 족보에 올렸다.`); chron(g, `${g.player.name}, 의붓자식 ${J(p.name, '을/를')} 족보에 올리다.`, 30);
    return `사제가 두꺼운 책에 이름을 적었다. ${J(p.name, '은/는')} 제 이름 옆에 적힌 내 이름을 손가락으로 오래 짚었다.${s.blood ? ` ${J(s.blood, '은/는')} 문 밖에서 기다렸다. 축하한다는 말이 조금 늦게 나왔다.` : ''}`;
  },
});

defineScene('sf_parent_wed', {
  title: () => '부모의 재혼',
  text: (g, s) => `${J(s.par, '이/가')} 할 말이 있다며 나를 불렀다. "${s.kids ? `${J(s.name, '과/와')} 살림을 합치려 한다. 그쪽에도 아이가 ${s.kids} 있다` : `${J(s.name, '을/를')} 새로 맞으려 한다`}. 네 ${s.dead} 생각도 했다. 오래 했다." 손에 쥔 찻잔이 떨린다.`,
  choices: () => [{ label: '축복한다', key: 'bless' }, { label: '집과 땅은 어찌 되느냐고 묻는다', key: 'land' }, { label: '반대한다', key: 'no' }],
  resolve(g, rng, s, key) {
    S(g).done.pwed = mi(g);
    const par = byId(g, s.pid);
    if (key === 'no' && rng.chance(0.5)) { if (par) { par.affection = Math.max(0, (par.affection ?? 30) - 15); remember(g, par, '재혼을 막았다', -1, { tag: 'step_block' }); } S(g).done.pblock = mi(g); return '반대했다. 부모는 오래 말이 없다가 "그래, 알았다" 했다. 그 뒤로 저녁마다 혼자 창가에 앉아 있다. 그게 내가 바란 건지 모르겠다.'; }
    if (!par || !alive(par) || par.spouseId) return '그 혼담은 흐지부지되었다.';
    const sp = wedParent(g, ownRng(g, 41), par, s);
    if (!sp) return '그 혼담은 흐지부지되었다.';
    if (key === 'bless') { if (par) par.affection = Math.min(100, (par.affection ?? 30) + 10); warmUp(g, sp.id, 15); deed(g, 'kind', 1, '홀로된 부모의 재혼을 축복했다'); return `혼례 날 맨 앞줄에 앉았다. ${J(par.name, '이/가')} 서약하다 말고 나를 한 번 보았다. 고개를 끄덕여 주었다.`; }
    if (key === 'land') { warmUp(g, sp.id, -6); return `집과 땅은 내 몫으로 남긴다는 약조를 받았다. ${J(sp.name, '은/는')} 웃으며 그러자고 했다. 웃음 끝이 조금 짧았다.`; }
    warmUp(g, sp.id, -15); if (par) par.affection = Math.max(0, (par.affection ?? 30) - 10);
    return `반대했지만 혼례는 열렸다. 나는 가지 않았다. ${J(sp.name, '이/가')} 그 집 부엌에 서 있는 모습이 아직 낯설다.`;
  },
});

defineScene('sf_newparent', {
  title: (g, s) => `${s.pw}`,
  text: (g, s) => `${J(s.par, '이/가')} 낯선 사람 손을 잡고 들어왔다. "${s.name}${hasBatchim(s.name) ? '이란다' : '란다'}. 이제 같이 살 거야." ${s.kids ? `그 뒤에 아이가 ${s.kids} 숨어 있다. ` : ''}${J(s.name, '이/가')} 무릎을 굽혀 내 눈높이에 맞춘다.`,
  choices: () => [{ label: '인사한다', key: 'hi' }, { label: '먼저 간 부모 이야기를 꺼낸다', key: 'dead' }, { label: '방으로 뛰어 들어간다', key: 'run' }],
  resolve(g, rng, s, key) {
    const t = S(g).ties[s.id]; if (t) t.met = true;
    if (key === 'hi') { warmUp(g, s.id, 8); return `작게 인사했다. ${J(s.name, '이/가')} 주머니에서 꿀사탕을 꺼냈다. 받았다. 맛있었다. 그건 반칙 같았다.`; }
    if (key === 'dead') { warmUp(g, s.id, 4); return `"우리 ${s.dead}는 노래를 잘했어요." ${J(s.name, '은/는')} 고개를 끄덕였다. "그 노래 나중에 가르쳐 줄래?" 대답은 안 했다. 싫다고도 안 했다.`; }
    warmUp(g, s.id, -6); return '방으로 뛰어 들어가 이불을 뒤집어썼다. 문밖에서 어른들 목소리가 오래 낮게 들렸다.';
  },
});

defineScene('sf_stepfavor', {
  title: () => '누구 그릇이 먼저인가',
  text: (g, s) => `${s.pw} ${J(s.name, '이/가')} 제 아이 ${s.kid}에게만 새 외투를 사 왔다. 내 외투는 소매가 손목 위로 올라온 지 오래다. ${J(s.par, '은/는')} 보고도 못 본 척한다.`,
  choices: () => [{ label: '말없이 참는다', key: 'bear' }, { label: '따진다', key: 'ask' }, { label: '먼저 간 부모 무덤에 가서 운다', key: 'grave' }],
  resolve(g, rng, s, key) {
    S(g).done.sfavor = mi(g);
    if (key === 'ask') { const ok = check(rng, g.player.stats.cha + g.player.stats.wil, 40); warmUp(g, s.id, ok ? 4 : -8); return ok ? `"제 외투도 작아요." ${J(s.name, '은/는')} 놀란 얼굴이었다. 정말 몰랐던 모양이다. 다음 장날 내 것도 생겼다. 조금 크게.` : `따졌더니 ${s.pw}가 "누가 굶기기라도 했니?" 했다. ${J(s.par, '은/는')} 내게 그만하라고 했다. 그날 처음으로 집이 남의 집 같았다.`; }
    if (key === 'grave') { stress(g, -4); warmUp(g, s.id, -2); return '무덤가 풀을 뜯으며 한참 앉아 있었다. 돌아오니 저녁상에 내 몫이 따로 덮여 있었다. 누가 덮었는지는 묻지 않았다.'; }
    stress(g, 4); g.player.stats.wil = Math.min(100, g.player.stats.wil + 0.3); return '아무 말 하지 않았다. 대신 소매를 접어 올렸다. 언젠가 내 손으로 내 외투를 사겠다고 생각했다.';
  },
});

defineScene('sf_old', {
  title: () => '모시겠다는 아이',
  text: (g, s) => `${J(s.name, '이/가')} 찾아왔다. 이제 제 식구가 있는 어른이다. "이제 혼자 계시면 안 돼요. 우리 집으로 오세요." 핏줄도 아닌데, 하고 말하려다 그만두었다. 이 아이가 처음 우리 집에 왔을 때 ${s.age}살이었다.`,
  choices: () => [{ label: '그 집으로 간다', key: 'go' }, { label: '고맙지만 내 집에 남는다', key: 'stay' }],
  resolve(g, rng, s, key) {
    S(g).done.old = mi(g); warmUp(g, s.id, 6);
    if (key === 'go') { stress(g, -12); log(g, `늙어 의붓자식 ${s.name}의 집에서 지내게 되었다.`); return `짐은 생각보다 적었다. ${s.name}의 아이들이 나를 ${me(g).sex === 'm' ? '할아버지' : '할머니'}라고 불렀다. 그 말에 피가 섞였는지 묻는 사람은 없었다.`; }
    stress(g, -4); return `괜찮다고 했다. ${J(s.name, '은/는')} 그럼 이레마다 오겠다고 했다. 정말로 이레마다 왔다.`;
  },
});

defineScene('sf_share', {
  title: () => '의붓자식의 몫',
  text: (g, s) => `${s.old}의 장례가 끝나자 ${J(s.name, '이/가')} 조심스럽게 말을 꺼냈다. ${J(s.old, '이/가')} 데려다 키운 아이다. "족보에 이름은 없지만, 저도 그분 밥을 먹고 자랐어요. 작은 밭 한 뙈기라도…" 내 핏줄 형제들이 내 얼굴만 본다.`,
  choices: (g) => [...(canSpend(g, 60) ? [{ label: '은화 60닢을 떼어 준다', key: 'give' }] : []), { label: '정표로 물건 하나를 준다', key: 'token' }, { label: '피가 아니라며 거절한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (key === 'give' && spend(g, 60)) { if (p) { p.wealth = (p.wealth ?? 0) + 60; p.affection = Math.min(100, (p.affection ?? 20) + 20); } deed(g, 'generous', 2, '의붓형제에게 유산을 나누었다'); return `은화 예순 닢을 건넸다. ${J(s.name, '은/는')} 그 돈보다 "형제"라고 불러 준 게 고맙다고 했다.`; }
    if (key === 'token') { if (p) p.affection = Math.min(100, (p.affection ?? 20) + 6); return `${J(s.old, '이/가')} 쓰던 낡은 칼을 건넸다. ${J(s.name, '은/는')} 그걸 오래 쥐고 있었다. 밭 이야기는 다시 꺼내지 않았다.`; }
    if (p) { p.affection = Math.max(0, (p.affection ?? 20) - 25); remember(g, p, '유산에서 나를 뺐다', -1, { tag: 'step_estate' }); }
    deed(g, 'kind', -2, '의붓형제를 유산에서 내쳤다');
    return `"문서에 없는 건 없는 거다." ${J(s.name, '은/는')} 고개를 숙이고 나갔다. 마을 사람들은 두 갈래로 말했다. 법대로 했다는 쪽과, 정이 없다는 쪽.`;
  },
});

defineScene('sf_widow', {
  title: (g, s) => `${s.pw}의 몫`,
  text: (g, s) => `${J(s.old, '이/가')} 떠나고 집에는 ${s.pw} ${s.kids ? `${J(s.name, '과/와')} 그 아이들이` : J(s.name, '이/가')} 남았다. ${J(s.name, '이/가')} 말했다. "이 집에서 스무 해를 살았다. 나도, ${s.kids ? '내 아이들도' : '나도'} 갈 데가 없다." 이제 이 집 주인은 나다.`,
  choices: () => [{ label: '함께 산다', key: 'stay' }, { label: '살림 한 몫을 떼어 내보낸다', key: 'part' }, { label: '집에서 나가 달라고 한다', key: 'out' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (key === 'stay') { warmUp(g, s.id, 10); deed(g, 'kind', 1, '남은 의붓부모를 집에 모셨다'); return `"여기가 댁 집이기도 하지요." ${J(s.name, '은/는')} 대답 대신 부엌으로 가서 불을 지폈다. 그날 저녁상은 예전과 같은 자리에 차려졌다.`; }
    if (key === 'part') { const amt = Math.min(Math.floor((g.player.money + (g.player.familyMoney ?? 0)) * 0.25), 150); const fromFam = Math.min(g.player.familyMoney ?? 0, amt); g.player.familyMoney -= fromFam; g.player.money = Math.max(0, g.player.money - (amt - fromFam)); if (p) { p.wealth = (p.wealth ?? 0) + amt; p.place = p.place ?? here(g); } return `은화 ${amt}닢과 세간 몇 가지를 떼어 주었다. ${J(s.name, '은/는')} 강 건너 작은 집을 얻었다. 명절이면 찾아온다. 길게 머물지는 않는다.`; }
    if (p) { p.affection = 0; remember(g, p, '집에서 내쫓았다', -1, { tag: 'step_out' }); p.place = 'harfen'; }
    deed(g, 'kind', -3, '홀로된 의붓부모를 집에서 내쫓았다');
    return `${J(s.name, '은/는')} 이틀 만에 짐을 쌌다. 떠나는 날 마당에서 한 번 집을 돌아보았다. 이웃들이 창 뒤에서 그걸 보았다. 이웃들은 오래 기억할 것이다.`;
  },
});

/* ---------- 부모의 재혼 (플레이어가 의붓자식이 되는 길) ---------- */
function wedParent(g, rng, par, s) {
  let sp = s.sid != null ? byId(g, s.sid) : null;
  if (!alive(sp) || sp.spouseId) {
    sp = makePerson(rng, { sex: par.sex === 'm' ? 'f' : 'm', ageMonths: clamp(ageYears(par) + rng.int(-6, 4), 22, 60) * 12 + 2, job: rng.pick(['farmer', 'weaver', 'baker', 'shopkeeper']), traits: [rng.pick(['kind', 'reserved', 'cruel', 'content', 'ambitious', 'diligent'])] });
    sp.name = s.name; sp.place = placeOf(par);
    g.people.push(sp);
    for (let i = 0; i < (s.kidsN ?? 0); i++) {
      const c = makePerson(rng, { ageMonths: rng.int(2, 14) * 12 + 1, lastName: sp.lastName, fatherId: sp.sex === 'm' ? sp.id : null, motherId: sp.sex === 'f' ? sp.id : null });
      c.place = sp.place; g.people.push(c); sp.childIds.push(c.id);
    }
  }
  par.spouseId = sp.id; sp.spouseId = par.id; sp.known = true; sp.affection = Math.max(sp.affection ?? 0, 20);
  if (sp.sex === 'f') sp.lastName = par.lastName;
  if (!g.player.familyIds.includes(sp.id) && g.player.familyIds.includes(par.id)) g.player.familyIds.push(sp.id);
  par.history.push({ y: g.date.year, m: g.date.month, text: `${J(sp.name, '과/와')} 다시 혼인했다.` });
  sp.history.push({ y: g.date.year, m: g.date.month, text: `${J(par.name, '과/와')} 혼인했다.` });
  chron(g, `${fullName(par)}, ${J(sp.name, '과/와')} 다시 혼인하다.`, 20);
  sync(g);
  return sp;
}
function parentTick(g, rng) {
  const s = S(g); const now = mi(g);
  if (g.date.month !== 4 || playerAge(g) >= 45) return;
  const m = me(g);
  for (const pid of [m.fatherId, m.motherId]) {
    const par = byId(g, pid);
    if (!alive(par) || par.away || par.spouseId || ageYears(par) > 56 || ageYears(par) < 22) continue;
    const other = byId(g, pid === m.fatherId ? m.motherId : m.fatherId);
    if (other && other.alive) continue; // 갈라선 부모는 여기서 다루지 않는다
    if (s.done.pblock && now - s.done.pblock < 60) continue;
    if (!rng.chance(playerAge(g) < 16 ? 0.12 : 0.07)) continue;
    // 상대: 마을의 홀로된 사람(아이 딸린 쪽을 먼저), 없으면 새 사람
    const cands = living(g).filter((p) => !p.isPlayer && !p.spouseId && p.sex !== par.sex && p.id !== m.fatherId && p.id !== m.motherId && Math.abs(ageYears(p) - ageYears(par)) <= 10 && ageYears(p) >= 22 && placeOf(p) === placeOf(par) && !(par.childIds ?? []).includes(p.id) && p.fatherId !== par.id && p.motherId !== par.id);
    const withKids = cands.filter((p) => (p.childIds ?? []).some((id) => alive(byId(g, id)) && ageYears(byId(g, id)) < 16));
    const pick = withKids.length && rng.chance(0.6) ? rng.pick(withKids) : cands.length && rng.chance(0.5) ? rng.pick(cands) : null;
    const name = pick ? pick.name : rng.pick(par.sex === 'm' ? FEMALE_NAMES : MALE_NAMES);
    const kidsN = pick ? 0 : rng.chance(0.45) ? rng.int(1, 2) : 0;
    const nk = pick ? (pick.childIds ?? []).filter((id) => alive(byId(g, id)) && ageYears(byId(g, id)) < 18).length : kidsN;
    const dead = other ? (other.sex === 'm' ? '아버지' : '어머니') : (par.sex === 'm' ? '어머니' : '아버지');
    const data = { pid: par.id, par: `${par.sex === 'm' ? '아버지' : '어머니'}`, sid: pick?.id ?? null, name, kidsN, kids: nk ? (nk === 1 ? '하나' : '둘') : '', dead };
    if (playerAge(g) >= 16) { if (free(g) && !sceneQueued(g, 'sf_parent_wed')) { queueScene(g, 'sf_parent_wed', data); s.sceneAt = now; } return; }
    const sp = wedParent(g, rng, par, data);
    if (sp && free(g) && playerAge(g) >= 4) { queueScene(g, 'sf_newparent', { id: sp.id, name: sp.name, pw: parentWord(sp), par: data.par, kids: data.kids, dead }); s.sceneAt = now; }
    return;
  }
}

/* ---------- 플레이어 장면 ---------- */
function playerTick(g, rng) {
  const s = S(g); const now = mi(g);
  if (!free(g) || now - s.sceneAt < 4 || L(g).queue.length >= 2) return;
  const q = (kind, data) => { queueScene(g, kind, data); s.sceneAt = now; return true; };
  const age = playerAge(g);
  const sp = spouseOf(g);
  const kids = tiesOf(g, 'kid').filter(([p, t]) => !t.gone);
  // 새 식탁: 혼인하고 처음
  if (sp && kids.some(([p]) => ageYears(p) < 18) && !s.done[`table${sp.name}`]) return q('sf_table', { sp: sp.name, kids: kids.filter(([p]) => ageYears(p) < 18).map(([p]) => p.name) });
  // 아이 딸린 혼담: 홀로되었거나 갈라선 뒤
  const lv = loveState(g);
  if (!sp && !lv.engaged && age >= 24 && age <= 55 && ((lv.widowed && !lv.widowed.vow && now - lv.widowed.at >= 12) || lv.exes.some((x) => x.how === 'divorce' && now - x.at >= 12)) && (!s.done.suitor || now - s.done.suitor >= 48) && rng.chance(0.05)) {
    const sex = me(g).sex === 'm' ? 'f' : 'm';
    const n = rng.chance(0.5) ? 1 : rng.chance(0.7) ? 2 : 3;
    const used = new Set(g.people.map((p) => p.name));
    const nm = (x) => rng.pick((x === 'm' ? MALE_NAMES : FEMALE_NAMES).filter((k) => !used.has(k))) ?? rng.pick(x === 'm' ? MALE_NAMES : FEMALE_NAMES);
    const kidsD = Array.from({ length: n }, () => { const ks = rng.chance(0.5) ? 'm' : 'f'; const k = { sex: ks, name: nm(ks), age: rng.int(2, 13) }; used.add(k.name); return k; });
    return q('sf_suitor', { sex, name: nm(sex), age: clamp(age + rng.int(-6, 4), 22, 58), last: rng.pick(LAST_NAMES), job: rng.pick(['farmer', 'weaver', 'baker', 'shopkeeper', 'carpenter']), kids: kidsD, lost: rng.chance(0.7) ? 'dead' : 'divorce', pl: placeName(here(g)) });
  }
  // 마음을 연 날
  for (const [p, t] of kids) if (!t.called && t.warm >= 65 && now - t.since >= 30 && ageYears(p) >= 3) return q('sf_open', { id: p.id, name: p.name, who: 'kid', call: me(g).sex === 'm' ? '아버지' : '어머니', years: Math.max(1, Math.floor((now - t.since) / 12)) });
  for (const [p, t] of tiesOf(g, 'parent')) if (!t.called && t.warm >= 60 && now - t.since >= 48 && age >= 14) return q('sf_open', { id: p.id, name: p.name, who: 'parent', pw: parentWord(p), years: Math.floor((now - t.since) / 12) });
  // 새 부모와 처음 (이야기 밖에서 혼인한 경우)
  for (const [p, t] of tiesOf(g, 'parent')) if (!t.met && age < 16 && age >= 4) { t.met = true; const par = byId(g, t.via); return q('sf_newparent', { id: p.id, name: p.name, pw: parentWord(p), par: par?.sex === 'm' ? '아버지' : '어머니', kids: '', dead: par?.sex === 'm' ? '어머니' : '아버지' }); }
  // 당신은 내 부모가 아니야 / 내 아이의 등
  const coldKid = kids.find(([p, t]) => t.warm < 35 && ageYears(p) >= 6 && ageYears(p) < 19 && now - t.cold >= 24);
  if (coldKid && sp && rng.chance(0.1)) { const [p] = coldKid; const dead = [p.fatherId, p.motherId].filter((id) => id != null && id !== sp.id).every((id) => !byId(g, id)?.alive); return q('sf_cold', { id: p.id, name: p.name, sp: sp.name, who: 'kid', dead }); }
  const coldMine = tiesOf(g, 'mine').find(([p, t]) => t.warm < 30 && ageYears(p) >= 7 && ageYears(p) < 19 && now - t.cold >= 24);
  if (coldMine && sp && rng.chance(0.08)) return q('sf_cold', { id: coldMine[0].id, name: coldMine[0].name, sp: sp.name, who: 'mine' });
  // 데려온 아이와 낳은 아이
  const young = kids.filter(([p]) => ageYears(p) < 16);
  const blood = [...together(g), ...myOwn(g)].filter((p) => ageYears(p) >= 2 && ageYears(p) < 16);
  if (young.length && blood.length && (!s.done.favor || now - s.done.favor >= 30) && rng.chance(0.06)) { const [k] = rng.pick(young); const o = rng.pick(blood); return q('sf_favor', { kid: k.name, kid_id: k.id, own: o.name, mine: myOwn(g).includes(o) }); }
  // 의붓형제 싸움 (데려온 아이와 내 아이)
  const mineY = myOwn(g).filter((p) => ageYears(p) >= 5 && ageYears(p) < 16);
  if (young.length && mineY.length && (!s.done.kids || now - s.done.kids >= 30) && rng.chance(0.06)) { const [a] = rng.pick(young); const b = rng.pick(mineY); return q('sf_kids', { a: a.name, b: b.name, ids: [a.id, b.id], years: Math.floor((now - (s.ties[a.id]?.since ?? now)) / 12) }); }
  // 친부모·핏줄이 찾아옴
  for (const [p, t] of young) {
    if (t.asked || now - t.since < 18 || !rng.chance(0.025)) continue;
    const otherId = [p.fatherId, p.motherId].find((id) => id != null && id !== sp?.id);
    const o = otherId != null ? byId(g, otherId) : null;
    const pl = rng.pick(['harfen', 'verden', 'leocast', 'portel'].filter((x) => PLACES[x]));
    if (o && o.alive && !o.isPlayer) return q('sf_birth', { id: p.id, kid: p.name, alive: true, who: o.name, wsex: o.sex, pl: placeOf(o) === here(g) ? pl : placeOf(o) });
    const wsex = sp?.sex === 'm' ? 'f' : 'm';
    return q('sf_birth', { id: p.id, kid: p.name, alive: false, who: rng.pick(['할머니', '할아버지']), side: wsex === 'm' ? '친가' : '외가', wsex, pl });
  }
  // 족보에 올리기
  const adoptable = kids.find(([p, t]) => !t.adopted && !t.asked && t.warm >= 55 && now - t.since >= 36 && ageYears(p) >= 4);
  if (adoptable && rng.chance(0.05)) { const [p, t] = adoptable; const b = (me(g).childIds ?? []).map((id) => byId(g, id)).find((x) => alive(x) && ageYears(x) >= 8 && !S(g).ties[x.id]); return q('sf_adopt', { id: p.id, name: p.name, years: Math.floor((now - t.since) / 12), blood: b?.name ?? '' }); }
  // 의붓부모의 편애 (내가 아이일 때)
  const sp2 = tiesOf(g, 'parent').find(([p]) => (p.childIds ?? []).some((id) => alive(byId(g, id)) && ageYears(byId(g, id)) < 18));
  if (sp2 && age >= 6 && age < 16 && sp2[1].warm < 50 && (!s.done.sfavor || now - s.done.sfavor >= 30) && rng.chance(0.06)) { const [p, t] = sp2; const k = (p.childIds ?? []).map((id) => byId(g, id)).find((x) => alive(x) && ageYears(x) < 18); const par = byId(g, t.via); return q('sf_stepfavor', { id: p.id, name: p.name, pw: parentWord(p), kid: k.name, par: par?.sex === 'm' ? '아버지' : '어머니' }); }
  // 늙어서 모시겠다는 의붓자식
  if (age >= 60 && !s.done.old) {
    const c = tiesOf(g, 'kid').find(([p, t]) => t.warm >= 55 && ageYears(p) >= 20);
    if (c && rng.chance(0.06)) { const [p, t] = c; return q('sf_old', { id: p.id, name: p.name, age: Math.max(1, ageYears(p) - Math.floor((now - t.since) / 12)) }); }
  }
}

/* ---------- 플레이어 없이도: NPC 집안이 다시 혼인하고 섞인다 ---------- */
function npcTick(g, rng) {
  const s = S(g); const now = mi(g);
  if (g.date.month !== 5) return;
  const ppl = living(g).filter((p) => !p.isPlayer);
  const m = me(g);
  const family = new Set([m.id, m.fatherId, m.motherId, m.spouseId, ...(g.player.familyIds ?? [])]);
  // 홀로된 부모가 다시 혼인한다 (npc.js의 혼인은 마흔까지라 그 위를 얹는다)
  const lone = ppl.filter((p) => !p.spouseId && !family.has(p.id) && ageYears(p) >= 24 && ageYears(p) <= 55 && (p.childIds ?? []).some((id) => alive(byId(g, id)) && ageYears(byId(g, id)) < 18));
  for (const a of lone) {
    if (a.spouseId || !rng.chance(0.3)) continue;
    const bs = ppl.filter((x) => !x.spouseId && x.sex !== a.sex && !family.has(x.id) && x.id !== a.id && Math.abs(ageYears(x) - ageYears(a)) <= 10 && ageYears(x) >= 22 && placeOf(x) === placeOf(a) && x.fatherId !== a.fatherId && !(a.childIds ?? []).includes(x.id) && !(x.childIds ?? []).includes(a.id));
    if (!bs.length) continue;
    const b = rng.pick(bs);
    a.spouseId = b.id; b.spouseId = a.id;
    const [h, w] = a.sex === 'm' ? [a, b] : [b, a];
    w.lastName = h.lastName;
    a.history.push({ y: g.date.year, m: g.date.month, text: `${J(b.name, '과/와')} 다시 혼인했다.` });
    b.history.push({ y: g.date.year, m: g.date.month, text: `${J(a.name, '과/와')} 혼인했다.` });
  }
  // 섞인 집안 찾기
  for (const h of ppl) {
    if (h.sex !== 'm' || !h.spouseId) continue;
    const w = byId(g, h.spouseId); if (!alive(w)) continue;
    if (family.has(h.id) || family.has(w.id)) continue;
    const hk = (h.childIds ?? []).filter((id) => !(w.childIds ?? []).includes(id));
    const wk = (w.childIds ?? []).filter((id) => !(h.childIds ?? []).includes(id));
    const kids = [...hk, ...wk].filter((id) => alive(byId(g, id)));
    if (!kids.length || s.npc.some((x) => (x.a === h.id && x.b === w.id))) continue;
    s.made += 1;
    s.npc.push({ a: h.id, b: w.id, kids, y: g.date.year, place: placeOf(h), warm: rng.int(15, 40), ev: {} });
    const c = { a: h.name, b: w.name, place: placeName(placeOf(h)), kid: byId(g, kids[0]).name };
    if (placeOf(h) === here(g) && rng.chance(0.6)) line(g, 'npc', pickFresh(g, rng, 'nw', T.NPC_WED)(c));
  }
  // 섞인 집안의 세월
  for (const b of s.npc) {
    const A = byId(g, b.a); const B = byId(g, b.b);
    const kid = b.kids.map((id) => byId(g, id)).find(alive);
    const near = b.place === here(g);
    const c = { a: A?.name ?? '그 집', b: B?.name ?? '그 집', place: placeName(b.place), kid: kid?.name ?? '그 아이' };
    if (b.end) continue;
    if (!A || !B || (!A.alive && !B.alive)) { b.end = now; continue; }
    if (!A.alive || !B.alive) {
      if (!b.ev.estate) {
        b.ev.estate = now;
        const dead = A.alive ? B : A; const left = A.alive ? A : B;
        // 남은 사람과 의붓자식 사이: 정이 얕으면 다툰다
        if (b.warm < 50 && kid) { if (near || rng.chance(0.2)) line(g, 'npc', pickFresh(g, rng, 'ne', T.NPC_ESTATE)({ a: dead.name, b: left.name })); left.wealth = Math.max(0, (left.wealth ?? 0) - 10); }
      }
      b.end = now; continue;
    }
    b.warm = clamp(b.warm + rng.int(-3, 7), 0, 100);
    if (b.warm < 30 && kid && !b.ev.fight && rng.chance(0.35)) { b.ev.fight = now; if (near) line(g, 'npc', pickFresh(g, rng, 'nf', T.NPC_FIGHT)(c)); }
    else if (b.warm >= 70 && kid && !b.ev.open) { b.ev.open = now; if (near || rng.chance(0.1)) line(g, 'npc', pickFresh(g, rng, 'no', T.NPC_OPEN)(c)); }
  }
  s.npc = s.npc.filter((x) => !x.end || now - x.end < 120);
  if (s.npc.length > 40) s.npc.splice(0, s.npc.length - 40);
}

function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over) return;
  sync(g);
  drift(g);
  npcTick(g, ownRng(g, 7));
  parentTick(g, ownRng(g, 13));
  flavor(g, ownRng(g, 19));
  playerTick(g, ownRng(g, 23));
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.stepfamily = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g, rng, old) => {
  const s = S(g);
  const prev = { ...s.ties };
  s.ties = {}; s.done = {}; s.sceneAt = mi(g); s.gen += 1;
  if (!old) return;
  const meP = me(g);
  // 대를 이을 때: 옛 주인이 데려다 키운 의붓자식이 몫을 묻는다
  const share = Object.entries(prev).filter(([id, t]) => t.kind === 'kid' && !t.adopted && t.warm >= 40).map(([id]) => byId(g, Number(id))).filter((p) => alive(p) && p.id !== meP.id && ageYears(p) >= 16);
  if (share.length && playerAge(g) >= 15) { const p = share[0]; queueScene(g, 'sf_share', { id: p.id, name: p.name, old: old.name }); }
  // 남은 배우자가 내 친부모가 아니면: 의붓부모의 몫
  const oldP = byId(g, old.id);
  const w = byId(g, oldP?.spouseId);
  if (alive(w) && w.id !== meP.fatherId && w.id !== meP.motherId && playerAge(g) >= 15) {
    const kids = (w.childIds ?? []).filter((id) => id !== meP.id && !(oldP?.childIds ?? []).includes(id) && alive(byId(g, id))).length;
    queueScene(g, 'sf_widow', { id: w.id, name: w.name, pw: parentWord(w), old: old.name, kids });
  }
  sync(g);
});

/* ---------- 화면 연결점 ---------- */
export function stepLines(g) { return (g.stepfamily?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function stepLine(g) { return stepLines(g)[0]?.text ?? null; }
const KIND_WORD = { kid: '의붓자식', mine: '내 아이와 새 배우자', parent: '의붓부모', sib: '의붓형제' };
export function stepInfo(g) {
  const s = S(g); const now = mi(g);
  const people = Object.entries(s.ties).map(([id, t]) => [byId(g, Number(id)), t]).filter(([p]) => alive(p)).map(([p, t]) => ({
    name: p.name, kind: t.adopted ? '족보에 올린 자식' : t.kind === 'parent' ? parentWord(p) : t.kind === 'kid' ? `의붓${kidWord(p)}` : KIND_WORD[t.kind],
    age: ageYears(p), warm: Math.round(t.warm), word: warmWord(t.warm), years: Math.floor((now - t.since) / 12), called: !!t.called, gone: !!t.gone,
  }));
  return {
    people,
    blended: people.length > 0,
    npc: s.npc.filter((x) => !x.end && x.place === here(g)).slice(-4).map((x) => ({ a: byId(g, x.a)?.name ?? '', b: byId(g, x.b)?.name ?? '', kids: x.kids.length, word: warmWord(x.warm) })),
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
