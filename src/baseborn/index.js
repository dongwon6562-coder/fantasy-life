// 40단계: 서자와 혼외 자식 (도우미스레드2).
// '알려진 서자' 쪽만 다룬다. 숨긴 아이는 secret, 모르는 왕가 핏줄은 claim, 재혼으로 생긴 의붓은 stepfamily, 거둔 아이는 adopt 몫.
// - 내가 서자일 때 (태어날 집안 count_bastard·merchant_bastard, 또는 서자가 대를 이은 삶): 열다섯 넘어
//   명부의 성 칸(bb_name), 아버지 집 잔치의 아랫상(bb_feast), 적자의 견제(bb_rival), 아버지의 인정(bb_recognize),
//   귀족 서자의 길(bb_path: 기사단 종자·수도원·용병·아버지 상단), 아버지가 죽은 뒤 집안을 차지하는 일(bb_seize)
// - 내 혼외 자식 (혼인한 적 없는 사람과 낳아 떳떳이 받은 아이): 한 지붕 아래 배우자(bb_hearth), 적자와 서자의 다툼(bb_quarrel),
//   적출로 올리기(bb_legit), 서자의 길 보내기(bb_send), 적출 아닌 서자가 대를 이을 때 적자 형제의 다툼(bb_contest)
// - 플레이어 없이도: 넉넉한 NPC 집안 사내가 서자를 얻고, 적자와 다투고, 인정받고, 기사·사제·모험가로 나가고, 적자가 다 죽으면 집을 잇는다.
// 화면 연결점: bbLines(g), bbLine(g), bbInfo(g). 장면 앞머리 bb_.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainSkill, gainStat } from '../game.js';
import { byId, ageYears, makePerson, living, has } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress } from '../adventure/core.js';
import { rel, remember } from '../relations.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { kinState } from '../kin/index.js';
import { loveState } from '../love/index.js';
import { makeRng } from '../rng.js';
import * as T from './lines.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeOf = (p) => p?.place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 577) ^ Math.imul(mi(g) * 197 + salt + 29, 2654435761)) | 0 });
const alive = (p) => !!p && p.alive && !p.isPlayer;
const kidWord = (p) => (p.sex === 'm' ? '아들' : '딸');
const sibWord = (p, mine) => (p.sex === 'm' ? (ageYears(p) >= mine ? '배다른 형' : '배다른 아우') : (ageYears(p) >= mine ? '배다른 누이' : '배다른 누이동생'));
const aff = (p, n) => { if (!p) return; rel(p); p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.campaign && !g.army?.captive && !L(g).heirPending;
const BASE_ORIGINS = ['count_bastard', 'merchant_bastard'];
const RICH_JOBS = new Set(['count', 'trade_master', 'knight_captain', 'guildmaster', 'sea_captain', 'old_knight', 'knight']);
const RECOG = ['인정받지 못했다', '은화로만 안다', '아버지가 제 자식이라 불렀다'];

/* ---------- 상태 ---------- */
export function bbState(g) {
  g.baseborn ??= {};
  const s = g.baseborn;
  s.self ??= null;   // 내가 서자 { fid, recog 0|1|2, named, path, seized, left, since }
  s.kids ??= {};     // 내 혼외 자식 id → { since, legit, path, other(다른 부모 id) }
  s.npc ??= [];      // NPC 서자 [{ kid, by, mom, y, place, recog, path, ev }]
  s.month ??= [];
  s.used ??= [];
  s.log ??= [];
  s.done ??= {};
  s.sceneAt ??= -99;
  s.lineAt ??= -99;
  s.made ??= 0;
  return s;
}
const S = bbState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, text }); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 24) s.used.shift();
  return pool[i];
}

/* ---------- 누가 서자인가 ---------- */
// 내가 혼인한 적 있는 사람
function wedIds(g) {
  const v = loveState(g); const m = me(g);
  return new Set([m.spouseId, v.spouse?.id, v.widowed?.id, ...(v.exes ?? []).map((x) => x.id)].filter((x) => x != null));
}
/** 내 혼외 자식 (거둔 아이·숨긴 아이·의붓은 빼고) */
export function basebornKids(g) {
  const m = me(g); const wed = wedIds(g);
  return (m.childIds ?? []).map((id) => byId(g, id)).filter((p) => {
    if (!alive(p) || p.adopted || p.hiddenParent != null) return false;
    if (g.stepfamily?.ties?.[p.id]?.adopted) return false; // 족보에 올린 의붓자식
    const other = p.fatherId === m.id ? p.motherId : p.fatherId;
    if (other == null) return !!p.baseborn;
    const o = byId(g, other);
    return p.baseborn || (!wed.has(other) && o?.spouseId !== m.id && o?.bond !== 'ex'); // 죽은 배우자는 spouseId가 남고, 떠난 배우자는 bond가 ex
  });
}
function legitKids(g) {
  const ids = new Set(basebornKids(g).map((p) => p.id));
  return (me(g).childIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && !p.adopted && !ids.has(p.id) && p.hiddenParent == null);
}
// 내가 서자로 태어났나
function selfStart(g) {
  const m = me(g);
  if (BASE_ORIGINS.includes(g.player.familyId) && !g.origins?.past) return m.fatherId ?? null;
  if (m.baseborn) return m.fatherId ?? m.motherId ?? null;
  return undefined;
}
const father = (g) => byId(g, S(g).self?.fid);
// 아버지의 적자들 (나와 다른 서자는 빼고)
function rivals(g) {
  const f = father(g); const m = me(g);
  if (!f) return [];
  const myMom = m.motherId;
  return (f.childIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && p.id !== m.id && !p.baseborn && !p.adopted && (p.motherId == null || p.motherId !== myMom));
}
const topRival = (g) => rivals(g).sort((a, b) => (b.rivalry ?? 0) - (a.rivalry ?? 0) || ageYears(b) - ageYears(a))[0] ?? null;

function sync(g) {
  const s = S(g); const now = mi(g);
  if (!s.self) {
    const fid = selfStart(g);
    if (fid !== undefined) s.self = { fid, recog: 0, named: false, path: null, seized: false, left: false, since: now };
  }
  const seen = new Set();
  for (const p of basebornKids(g)) {
    seen.add(String(p.id)); p.baseborn = true;
    if (g.stepfamily?.ties?.[p.id]?.kind === 'mine') delete g.stepfamily.ties[p.id]; // 혼외 자식은 의붓 몫이 아니다
    const m = me(g);
    s.kids[p.id] ??= { since: now, legit: false, path: null, other: p.fatherId === m.id ? p.motherId : p.fatherId };
  }
  for (const id of Object.keys(s.kids)) if (!seen.has(id)) delete s.kids[id];
}
const kidList = (g) => Object.entries(S(g).kids).map(([id, t]) => [byId(g, Number(id)), t]).filter(([p]) => alive(p));
const bondOf = (g, id) => kinState(g).kids[id]?.bond ?? 40;
const addBond = (g, id, n) => { const r = kinState(g).kids[id]; if (r) r.bond = clamp(r.bond + n, 0, 100); };

/* ---------- 장면: 내가 서자 ---------- */
defineScene('bb_name', {
  title: () => '성 칸',
  text: (g, s) => `${s.where} 서기가 명부를 내밀었다. 이름 옆에 성 칸이 있다. "아버지 성을 적으시오." 뒤에 줄 선 사람들이 다 들린다. ${s.fa}의 성을 적으면 내일이면 ${s.rv ? `${s.rv}의 귀에` : '그 집 귀에'} 들어갈 것이다.`,
  choices: () => [{ label: '어머니 성을 적는다', key: 'mom' }, { label: '아버지 성을 적는다', key: 'dad' }, { label: '성 칸을 비우고 이름만 적는다', key: 'none' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.name = mi(g);
    const rv = byId(g, s.rvId);
    if (key === 'dad') {
      aff(rv, -12); if (rv) rv.rivalry = clamp((rv.rivalry ?? 0) + 15, 0, 100); aff(father(g), rng.chance(0.5) ? 3 : -4); stress(g, 5); deed(g, 'brave', 1, '명부에 아버지 성을 적었다');
      log(g, '명부에 아버지 성을 적었다.');
      return `또박또박 적었다. 서기가 펜을 멈추고 나를 한 번 보았다. 뒤에서 누가 낮게 휘파람을 불었다. ${s.rv ? `사흘 뒤 ${J(s.rv, '이/가')} 보낸 사람이 셋집 앞을 서성였다.` : '사흘 동안 아무 일도 없었다. 그게 더 무서웠다.'}`;
    }
    if (key === 'mom') { aff(byId(g, me(g).motherId), 6); gainStat(g, 'wil', 0.3); return '어머니 성을 적었다. 서기는 아무 말 없이 도장을 찍었다. 집에 와서 말하니 어머니가 한참 웃다가 돌아서서 눈가를 훔쳤다.'; }
    gainStat(g, 'cha', 0.2); return '성 칸을 비웠다. 서기가 거기에 작게 \'서출\'이라고 적었다. 고쳐 달라고 하지 않았다. 언젠가 내 손으로 그 칸을 채울 것이다.';
  },
});

defineScene('bb_feast', {
  title: () => '아랫상',
  text: (g, s) => `${s.fa}의 집에 잔치가 열렸다. 처음으로 초대장이 왔다. 그런데 내 자리는 문간 쪽 아랫상, 하인들 상 바로 옆이다. 윗상에서 ${s.rv ? J(s.rv, '이/가') : '적자들이'} 잔을 들고 나를 보며 웃는다. "${s.rv ? '저기 우리 집 그림자도 왔군.' : '저기 그림자도 왔군.'}"`,
  choices: () => [{ label: '못 들은 척 끝까지 앉아 있는다', key: 'sit' }, { label: '잔을 들어 받아친다', key: 'toast' }, { label: '자리를 박차고 나온다', key: 'walk' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.feast = mi(g);
    const rv = byId(g, s.rvId); const f = father(g);
    if (key === 'sit') { aff(f, 6); gainStat(g, 'wil', 0.5); stress(g, 8); return `끝까지 앉아 있었다. 잔치가 파할 무렵 ${J(s.fa, '이/가')} 지나가며 내 어깨에 손을 한 번 얹었다. 아무 말도 없었다. 손이 생각보다 무거웠다.`; }
    if (key === 'toast') {
      const ok = rng.chance(0.35 + (g.player.stats.cha ?? 30) / 200);
      aff(rv, -10); if (rv) rv.rivalry = clamp((rv.rivalry ?? 0) + 10, 0, 100);
      if (ok) { aff(f, 4); L(g).renown = (L(g).renown ?? 0) + 2; return `"그림자는 빛이 있어야 생기는 법이지요. 이 집 빛에 건배." 손님들이 웃음을 터뜨렸다.${s.rv ? ` ${J(s.rv, '은/는')} 웃지 못했다.` : ''} 그 말은 다음 날 장터까지 갔다.`; }
      stress(g, 6); aff(f, -3); return '잔을 들었지만 말이 꼬였다. 윗상에서 더 큰 웃음이 터졌다. 잔을 내려놓는 손이 떨렸다.';
    }
    aff(f, -6); stress(g, 4); st.self && (st.self.left = true); return '의자를 밀치고 일어섰다. 문을 나서는데 아무도 붙잡지 않았다. 골목 끝에서 늙은 하인 하나가 쫓아와 싸 온 고기를 내 손에 쥐여 주고 돌아갔다.';
  },
});

defineScene('bb_rival', {
  title: () => '적자가 보낸 사람',
  text: (g, s) => `${s.rv}의 집사가 찾아왔다. 탁자에 은화 주머니를 내려놓는다. "도련님께서 이르시길, ${J(s.place, '을/를')} 떠나 주면 이것과 같은 주머니가 해마다 간다 하십니다. 남으면..." 집사는 말을 끝내지 않았다.`,
  choices: (g, s) => [{ label: '주머니를 받고 떠나겠다고 한다', key: 'take' }, { label: '주머니를 밀어 돌려보낸다', key: 'refuse' }, { label: `${s.rv}에게 직접 결투를 청한다`, key: 'duel' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.rival = mi(g);
    const rv = byId(g, s.rvId);
    if (key === 'take') { g.player.money += 40; aff(rv, 10); if (rv) rv.rivalry = Math.max(0, (rv.rivalry ?? 0) - 25); if (st.self) st.self.left = true; stress(g, 6); log(g, '적자의 은화를 받고 떠나기로 했다.'); return '주머니는 묵직했다. 집사가 웃으며 절했다. 그날 밤 어머니에게 말하지 못했다. 은화는 따뜻했고, 나는 조금 추웠다.'; }
    if (key === 'refuse') { aff(rv, -12); if (rv) rv.rivalry = clamp((rv.rivalry ?? 0) + 12, 0, 100); gainStat(g, 'wil', 0.4); deed(g, 'brave', 1, '적자의 돈을 물리쳤다'); return '주머니를 집사 쪽으로 밀었다. "내 아버지는 그분 아버지이기도 하오. 나는 여기 살겠소." 집사는 주머니를 들고 나가며 문을 아주 조용히 닫았다.'; }
    const mine = (g.player.skills.sword ?? 0) + (g.player.stats.agi ?? 30) / 2 + rng.int(-8, 8);
    const win = mine >= 32;
    if (rv) rv.rivalry = clamp((rv.rivalry ?? 0) + (win ? -10 : 8), 0, 100);
    if (win) { L(g).renown = (L(g).renown ?? 0) + 4; aff(father(g), 6); aff(rv, -6); chron(g, `${g.player.name}, 배다른 형제 ${J(s.rv, '을/를')} 결투에서 꺾다.`, 40); return `성 마당에 사람들이 모였다. ${s.rv}의 칼이 세 번째 합에서 땅에 떨어졌다. 나는 칼끝을 거두었다. 피를 보면 이긴 게 아니게 될 것 같았다.`; }
    stress(g, 14); g.player.injuries ??= []; return `${J(s.rv, '은/는')} 어릴 때부터 진짜 칼로 배웠다. 나는 막대기로 배웠다. 팔에 칼을 맞고 무릎을 꿇었다. ${J(s.rv, '은/는')} 내려다보며 아무 말도 하지 않았다. 그게 더 아팠다.`;
  },
});

defineScene('bb_recognize', {
  title: () => '아버지가 부른 이름',
  text: (g, s) => `${s.fa}의 서기가 와서 성으로 오라고 했다. 큰 방에 사제와 집안 어른들이 서 있다. ${J(s.fa, '이/가')} 일어나 말했다. "이 아이는 내 피다. 오늘부터 내 성을 쓴다." ${s.rv ? `${J(s.rv, '이/가')} 창가에서 주먹을 쥐었다.` : '방 안이 조용해졌다.'} 모두의 눈이 나에게 온다.`,
  choices: (g, s) => [{ label: '무릎을 꿇고 받는다', key: 'take' }, ...(s.mom ? [{ label: '어머니도 이 자리에 불러 달라고 한다', key: 'mom' }] : []), { label: '"늦었습니다"라고 하고 돌아선다', key: 'refuse' }],
  resolve(g, rng, s, key) {
    const st = S(g); const self = st.self; st.done.recog = mi(g);
    const f = father(g); const rv = byId(g, s.rvId);
    if (key === 'refuse') { if (self) self.recog = Math.max(self.recog, 1); aff(f, -15); gainStat(g, 'wil', 0.6); log(g, '아버지의 인정을 물리쳤다.'); return `"너무 늦었습니다." 돌아섰다. 등 뒤에서 ${J(s.fa, '이/가')} 내 이름을 한 번 불렀다. 돌아보지 않았다. 골목에 나와서야 숨이 쉬어졌다.`; }
    if (self) { self.recog = 2; self.named = true; }
    const old = g.player.lastName;
    if (f?.lastName && f.lastName !== old) { g.player.lastName = f.lastName; me(g).lastName = f.lastName; }
    aff(f, 10); aff(rv, -15); if (rv) rv.rivalry = clamp((rv.rivalry ?? 0) + 20, 0, 100);
    L(g).renown = (L(g).renown ?? 0) + 3; stress(g, -6);
    note(g, `${s.fa}의 자식으로 인정받아 ${g.player.lastName} 성을 쓰게 되었다.`); log(g, '아버지의 자식으로 인정받았다.');
    chron(g, `${s.fa}, 서출 ${J(g.player.name, '을/를')} 제 자식으로 인정하다.`, 50);
    if (key === 'mom') {
      const mo = byId(g, me(g).motherId);
      if ((f?.affection ?? 0) >= 40) { aff(mo, 15); return `${J(s.fa, '은/는')} 한참 말이 없다가 하인을 보냈다. 어머니가 낡은 숄을 두르고 큰 방 문간에 섰다. 사제가 다시 읽었다. 이번에는 어머니 이름도 함께. 어머니는 끝까지 고개를 들고 있었다.`; }
      aff(f, -4); return `${J(s.fa, '은/는')} 고개를 저었다. "그건 안 된다." 그래도 성은 받았다. 집에 와서 말하니 어머니는 됐다고, 그거면 됐다고 했다. 그 목소리가 됐지 않았다.`;
    }
    return `무릎을 꿇었다. 사제가 이름을 읽고 이마에 기름을 발랐다. ${old !== g.player.lastName ? `${J(old, '이었/였')}던 성 대신 이제 ${J(g.player.lastName, '이/가')} 붙는다.` : '같은 성인데 처음 듣는 이름 같았다.'} 일어서는데 다리가 후들거렸다.`;
  },
});

defineScene('bb_path', {
  title: () => '서출이 갈 길',
  text: (g, s) => `열${s.age === 15 ? '다섯' : s.age === 16 ? '여섯' : s.age === 17 ? '일곱' : '여덟'}. ${s.fa}의 집안 땅은 적자 몫이다. 서출에게 열린 문은 몇 개 안 된다. ${s.trade ? '아버지 상단 서기가 장부 일을 배워 보겠느냐고 물었다. ' : ''}기사단은 종자를 받고, 수도원은 묻지 않고 받고, 용병단은 칼만 본다.`,
  choices: (g, s) => [{ label: '기사단 종자가 된다', key: 'knight' }, { label: '수도원에 들어간다', key: 'cloister' }, { label: '용병단을 따라간다', key: 'merc' }, ...(s.trade ? [{ label: '아버지 상단 장부를 배운다', key: 'trade' }] : []), { label: '어느 문도 두드리지 않는다', key: 'none' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.path = mi(g); if (st.self) st.self.path = key;
    const f = father(g);
    if (key === 'knight') { gainSkill(g, 'sword', 3); gainStat(g, 'str', 0.4); aff(f, 4); log(g, '기사단 종자가 되었다.'); return '방패를 받았다. 다른 종자들 방패엔 집안 문장이 있다. 내 방패는 비어 있다. 교관이 그걸 보고 말했다. "빈 방패가 제일 무겁다. 채우는 건 너다."'; }
    if (key === 'cloister') { gainSkill(g, 'letters', 3); gainStat(g, 'wil', 0.5); log(g, '수도원에 들어갔다.'); return '수도원 문지기는 내 성을 묻지 않았다. 여기서는 다들 이름만 쓴다. 첫날 밤 처음으로 아무도 나를 쳐다보지 않는 곳에서 잤다.'; }
    if (key === 'merc') { gainSkill(g, 'sword', 2); gainStat(g, 'agi', 0.5); g.player.money += 6; aff(f, -3); log(g, '용병단을 따라갔다.'); return '용병단장은 내 손바닥 굳은살만 보았다. "아버지가 누구든 여기선 상관없다. 도망만 안 치면 돼." 그 말이 이상하게 편했다.'; }
    if (key === 'trade') { gainSkill(g, 'trade', 3); gainStat(g, 'int', 0.4); aff(f, 6); log(g, '아버지 상단에서 장부를 배웠다.'); return '상단 뒷방에서 남의 장부를 베꼈다. 서기들은 내가 누군지 알았지만 숫자는 그런 걸 묻지 않았다. 석 달 만에 틀린 셈 하나를 찾아냈다. 아버지 귀에 들어갔다고 한다.'; }
    stress(g, -2); return '아무 문도 두드리지 않았다. 대신 장터에서 이것저것 일을 거들었다. 남이 열어 주는 문 말고 내 문을 찾고 싶었다. 아직은 어디 있는지 모른다.';
  },
});

defineScene('bb_seize', {
  title: () => '빈 자리',
  text: (g, s) => (s.rv
    ? `${s.fa}의 장례가 끝났다. 유언장에 내 이름이 한 줄 있다. 친척들은 그 한 줄을 두고 둘로 갈렸다. ${J(s.rv, '은/는')} "서출이 무슨 몫이냐"고 했고, 늙은 집사는 "주인님 손으로 쓰신 겁니다"라고 했다. 촌장이 날을 잡았다.`
    : `${s.fa}의 장례가 끝났다. 적자들은 다 먼저 갔다. 집과 땅을 이을 사람이 없다. 친척들이 모여 수군거린다. 늙은 집사가 나를 보고 말했다. "주인님의 피는 이제 당신뿐입니다."`),
  choices: (g, s) => (s.rv
    ? [{ label: '촌장 앞에서 몫을 따진다', key: 'court' }, { label: `${s.rv}에게 나눠 갖자고 한다`, key: 'split' }, { label: '손을 뗀다', key: 'walk' }]
    : [{ label: '집안을 잇겠다고 한다', key: 'take' }, { label: '친척들에게 넘긴다', key: 'give' }]),
  resolve(g, rng, s, key) {
    const st = S(g); st.done.seize = mi(g); const self = st.self;
    const rv = byId(g, s.rvId);
    const share = Math.min(300, Math.round((s.wealth ?? 60) * 0.3));
    if (key === 'take' || key === 'court') {
      const ok = key === 'take' || rng.chance(0.3 + (self?.recog ?? 0) * 0.2);
      if (ok) {
        g.player.familyMoney = (g.player.familyMoney ?? 0) + share; L(g).renown = (L(g).renown ?? 0) + 5; if (self) self.seized = true;
        aff(rv, -20); chron(g, `서출 ${g.player.name}, ${s.fa}의 집안을 잇다.`, 60); log(g, `${s.fa}의 집안을 이었다.`);
        return key === 'take' ? `집사가 열쇠 꾸러미를 내밀었다. 무거웠다. 그날 밤 아버지 서재에 처음 들어가 보았다. 서랍 맨 아래 칸에 내가 어릴 적 그린 그림 한 장이 있었다. 은화 ${share}닢어치 땅과 함께 그 그림도 내 것이 되었다.` : `촌장은 유언장을 오래 읽더니 말했다. "고인의 손으로 쓴 것이오." ${J(s.rv, '은/는')} 의자를 걷어차고 나갔다. 은화 ${share}닢어치 몫이 내 이름으로 넘어왔다.`;
      }
      stress(g, 12); aff(rv, -10); return '촌장은 "피가 반이면 몫도 반의반"이라고 했다. 받은 것은 아버지가 쓰던 낡은 칼 한 자루였다. 그걸로 됐다고 하기엔 칼이 너무 가벼웠다.';
    }
    if (key === 'split') { const half = Math.round(share / 2); g.player.familyMoney = (g.player.familyMoney ?? 0) + half; aff(rv, 12); if (rv) rv.rivalry = Math.max(0, (rv.rivalry ?? 0) - 30); deed(g, 'generous', 1, '배다른 형제와 몫을 나눴다'); return `${J(s.rv, '은/는')} 한참 나를 보다가 고개를 끄덕였다. 은화 ${half}닢어치 몫이었다. 헤어질 때 ${J(s.rv, '이/가')} 처음으로 내 이름을 불렀다. 성은 빼고.`; }
    if (key === 'give') { deed(g, 'generous', 2, '서출로서 집안을 친척에게 넘겼다'); aff(byId(g, me(g).motherId), -4); return '열쇠를 친척 어른에게 넘겼다. 다들 놀란 얼굴이었다. 나는 아버지 서재에서 책 한 권만 들고 나왔다.'; }
    gainStat(g, 'wil', 0.5); return '아무것도 받지 않기로 했다. 장례 행렬 맨 뒤에서 걸었다. 그게 처음부터 내 자리였고, 그 자리가 생각보다 편했다.';
  },
});

/* ---------- 장면: 내 혼외 자식 ---------- */
defineScene('bb_hearth', {
  title: () => '한 지붕 아래',
  text: (g, s) => `${J(s.sp, '이/가')} 오늘 저녁상에 ${s.k}의 숟가락을 놓지 않았다. 잊은 척이었다. ${J(s.k, '은/는')} 문간에 서서 상을 보다가 말없이 부엌으로 갔다. ${s.lg ? `${J(s.lg, '이/가')} 눈치를 보며 밥만 먹는다.` : ''}`,
  choices: (g, s) => [{ label: `${s.sp}에게 따로 이야기한다`, key: 'talk' }, { label: `${J(s.k, '을/를')} 데리고 나가 둘이 먹는다`, key: 'out' }, { label: '못 본 척 넘어간다', key: 'pass' }],
  resolve(g, rng, s, key) {
    S(g).done.hearth = mi(g);
    const sp = byId(g, s.spId); const ls = loveState(g).spouse;
    if (key === 'talk') { const ok = rng.chance(0.5 + (sp?.affection ?? 0) / 200); if (ls) ls.mood = clamp((ls.mood ?? 50) + (ok ? 2 : -6), 0, 100); addBond(g, s.id, 4); return ok ? `"그 애가 무슨 죄요." ${J(s.sp, '은/는')} 오래 대답하지 않다가 "알아요, 아는데" 하고 울었다. 다음 날 아침 상에 숟가락이 하나 더 놓였다.` : `${J(s.sp, '은/는')} "그 애를 볼 때마다 그 사람 얼굴이 보인다"고 했다. 할 말이 없었다. 그 말이 틀리지 않아서.`; }
    if (key === 'out') { addBond(g, s.id, 10); if (ls) ls.mood = clamp((ls.mood ?? 50) - 5, 0, 100); if (sp) remember(g, sp, '서자 편을 들었다', -1, { tag: 'baseborn' }); return `${J(s.k, '을/를')} 데리고 장터 국밥집에 갔다. 아이는 처음엔 숟가락을 들지 않다가, 내가 먼저 먹자 따라 먹었다. 돌아오는 길에 아이가 내 소매를 잡았다.`; }
    addBond(g, s.id, -6); return `못 본 척했다. 밤에 부엌에서 ${J(s.k, '이/가')} 혼자 식은 밥을 먹는 소리가 났다. 그 소리가 오래 귀에 남았다.`;
  },
});

defineScene('bb_quarrel', {
  title: () => '적자와 서자',
  text: (g, s) => `마당에서 고함 소리가 났다. ${J(s.lg, '이/가')} ${s.k}의 멱살을 잡고 있다. "서자 주제에 내 칼을 만져?" ${J(s.k, '은/는')} 코피를 흘리면서도 손을 놓지 않는다. 동네 아이들이 담 너머로 구경한다.`,
  choices: (g, s) => [{ label: `${J(s.lg, '을/를')} 꾸짖는다`, key: 'lg' }, { label: '둘 다 꾸짖는다', key: 'both' }, { label: `${J(s.k, '을/를')} 꾸짖는다`, key: 'k' }],
  resolve(g, rng, s, key) {
    S(g).done.quarrel = mi(g);
    if (key === 'lg') { addBond(g, s.lgId, -8); addBond(g, s.id, 8); return `"이 집에 서자는 없다. 형제만 있다." ${J(s.lg, '은/는')} 입술을 깨물고 방으로 들어갔다. ${J(s.k, '은/는')} 코피를 훔치며 나를 보았다. 처음 보는 눈빛이었다.`; }
    if (key === 'both') { addBond(g, s.lgId, -2); addBond(g, s.id, -2); return '둘을 나란히 세워 놓고 장작을 패게 했다. 해 질 녘까지. 저녁 무렵 둘이 같이 물을 마시는 걸 보았다. 말은 없었지만 바가지를 넘겨주긴 했다.'; }
    addBond(g, s.id, -14); addBond(g, s.lgId, 4); return `${J(s.k, '을/를')} 꾸짖었다. 아이는 대꾸하지 않았다. 그날부터 그 아이는 형제의 물건에 손을 대지 않았다. 내 물건에도.`;
  },
});

defineScene('bb_legit', {
  title: () => '적출로 올리기',
  text: (g, s) => `예배당 사제가 말했다. "${J(s.k, '을/를')} 적출로 올리려면 주교청에 청원서를 내야 하오. 헌금이 은화 스물다섯 닢, 그리고 증인 둘. 올리면 대를 잇는 데도 적자와 똑같이 서지요."` + (s.sp ? ` ${J(s.sp, '이/가')} 옆에서 아무 말도 하지 않는다.` : ''),
  choices: (g) => [...(g.player.money >= 25 ? [{ label: '청원서를 낸다 (은화 25)', key: 'yes' }] : []), { label: '아직은 그대로 둔다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.legit = mi(g);
    const t = st.kids[s.id];
    if (key === 'no') return '사제는 고개를 끄덕였다. "아이가 크면 스스로 물을 거요." 그 말이 오래 남았다.';
    g.player.money -= 25; if (t) t.legit = true;
    const kid = byId(g, s.id); if (kid) { kid.legit = true; kid.lastName = g.player.lastName; }
    addBond(g, s.id, 12); const ls = loveState(g).spouse; if (ls && s.sp) ls.mood = clamp((ls.mood ?? 50) - 8, 0, 100);
    log(g, `${J(s.k, '을/를')} 적출로 올렸다.`); chron(g, `${g.player.name}, 혼외 자식 ${J(s.k, '을/를')} 적출로 올리다.`, 40);
    return `석 달 뒤 주교청 봉랍이 찍힌 문서가 왔다. ${J(s.k, '은/는')} 그 종이를 들고 한참 읽었다. 글을 다 알지도 못하면서. 그러고는 접어서 품에 넣었다.`;
  },
});

defineScene('bb_send', {
  title: () => '서자를 어디로',
  text: (g, s) => `${J(s.k, '이/가')} 열${s.age === 14 ? '넷' : s.age === 15 ? '다섯' : '여섯'}이 되었다. ${s.legit ? '적출로 올렸으니 집에 남아도 된다.' : '이 집 땅은 적자 몫이라는 걸 아이도 안다.'} 저녁에 아이가 물었다. "저는 어디로 가요?"`,
  choices: (g, s) => [{ label: '기사단 종자로 보낸다', key: 'knight' }, { label: '수도원에 보낸다', key: 'cloister' }, { label: '상단 장부를 배우게 한다', key: 'trade' }, { label: '"여기가 네 집이다"라고 한다', key: 'home' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.send = mi(g); const t = st.kids[s.id]; if (t) t.path = key;
    const kid = byId(g, s.id);
    if (key === 'home') { addBond(g, s.id, 10); return '"어디로 가긴. 여기가 네 집이다." 아이는 대답 대신 장작을 한 아름 더 들여왔다. 그날 밤 아이 방에서 늦게까지 불빛이 새어 나왔다.'; }
    if (kid) { kid.job = key === 'knight' ? 'knight' : key === 'cloister' ? 'priest' : 'merchant'; kid.place = key === 'knight' ? 'verden' : key === 'cloister' ? 'harfen' : 'leocast'; kid.history.push({ y: g.date.year, m: g.date.month, text: key === 'knight' ? '기사단 종자로 들어갔다.' : key === 'cloister' ? '수도원에 들어갔다.' : '상단에서 장부를 배우러 떠났다.' }); }
    addBond(g, s.id, rng.chance(0.6) ? 4 : -4);
    log(g, `${J(s.k, '을/를')} ${key === 'knight' ? '기사단' : key === 'cloister' ? '수도원' : '상단'}으로 보냈다.`);
    return key === 'knight' ? `떠나는 날 아이에게 빈 방패를 하나 사 주었다. "뭘 그릴지는 네가 정해라." 아이가 방패를 등에 메고 돌아보지 않고 걸었다. 그 등이 생각보다 넓었다.` : key === 'cloister' ? '수도원 문 앞에서 아이가 머리를 숙였다. 수사가 아이 이름만 묻고 성은 묻지 않았다. 돌아오는 길이 길었다.' : '상단 마차 짐칸에 아이를 태워 보냈다. 아이는 손을 흔들지 않고 장부책을 꼭 껴안았다. 다음 달 첫 편지가 왔다. 셈이 하나도 틀리지 않았다.';
  },
});

defineScene('bb_contest', {
  title: () => '서출이 이은 집',
  text: (g, s) => `${s.old}의 장례가 끝나자 ${J(s.rv, '이/가')} 친척들을 데리고 왔다. "나는 혼인한 어머니에게서 났다. 너는 아니다. 이 집은 내 것이다." 사제가 족보를 펴 들고 난처한 얼굴로 서 있다.`,
  choices: () => [{ label: '"아버지가 나를 골랐다"며 버틴다', key: 'stand' }, { label: '땅을 반 나눈다', key: 'split' }, { label: '주교청에 판가름을 맡긴다', key: 'church' }],
  resolve(g, rng, s, key) {
    S(g).done.contest = mi(g);
    const rv = byId(g, s.rvId);
    if (key === 'split') { const lose = Math.round((g.player.familyMoney ?? 0) * 0.3); g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) - lose); aff(rv, 15); if (rv) rv.rivalry = Math.max(0, (rv.rivalry ?? 0) - 30); deed(g, 'generous', 1, '배다른 형제와 집을 나눴다'); return `땅을 반 갈랐다. 은화로 치면 ${lose}닢어치였다. ${J(s.rv, '은/는')} 문서를 받아 들고 처음으로 고개를 숙였다. 아버지가 보았으면 어떤 얼굴이었을지 모르겠다.`; }
    if (key === 'church') {
      const ok = rng.chance(0.55);
      aff(rv, -12);
      if (ok) return '주교청은 고인의 유언이 먼저라고 했다. 봉랍 찍힌 판가름이 오자 친척들은 하나둘 돌아섰다. 그 판가름에 은화가 얼마 들었는지는 말하지 않겠다.';
      const lose = Math.round((g.player.familyMoney ?? 0) * 0.5); g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) - lose); stress(g, 12); return `주교청은 혼인한 어머니의 아들 손을 들어주었다. 집안 돈의 절반, 은화 ${lose}닢어치가 그쪽으로 갔다. 나는 이름과 나머지 반을 지켰다.`;
    }
    aff(rv, -15); if (rv) rv.rivalry = clamp((rv.rivalry ?? 0) + 20, 0, 100); deed(g, 'brave', 1, '서출로서 집을 지켰다'); stress(g, 6);
    return '"아버지가 나를 골랐소. 족보에도 그렇게 적혀 있소." 목소리를 낮추지 않았다. 친척들은 수군거리며 물러났다. 그 뒤로 명절마다 빈자리가 하나씩 늘었다.';
  },
});

/* ---------- 매달: 글 ---------- */
function flavor(g, rng) {
  const s = S(g); const now = mi(g);
  if (now - s.lineAt < 5 || !rng.chance(0.3)) return;
  const opts = [];
  const self = s.self;
  if (self && playerAge(g) >= 15 && !self.seized) {
    const rv = topRival(g);
    const c = { fa: father(g)?.name ?? '아버지', rv: rv?.name ?? '성 안의 적자', place: placeName(here(g)) };
    opts.push(() => line(g, 'self', pickFresh(g, rng, self.named ? 'sn' : 'ss', self.named ? T.SELF_NAMED : T.SELF)(c)));
  }
  const kids = kidList(g).filter(([p]) => ageYears(p) >= 3 && ageYears(p) < 18 && placeOf(p) === here(g));
  if (kids.length) {
    const [p] = rng.pick(kids);
    const sp = byId(g, me(g).spouseId); const lg = legitKids(g).find((x) => placeOf(x) === here(g) && ageYears(x) >= 3);
    const c = { k: p.name, sp: alive(sp) ? sp.name : '', lg: lg?.name ?? '' };
    opts.push(() => {
      const home = T.KID_HOME.map((f, i) => [f, i]).filter(([, i]) => (i === 1 ? c.lg : c.sp));
      if (home.length && rng.chance(0.5)) { const [f] = rng.pick(home); line(g, 'kid', f(c)); } else line(g, 'kid', pickFresh(g, rng, 'kk', T.KID)(c));
    });
  }
  if (!opts.length) return;
  rng.pick(opts)(); s.lineAt = now;
}

/* ---------- 장면 고르기 ---------- */
function playerTick(g, rng) {
  const s = S(g); const now = mi(g);
  if (!free(g) || now - s.sceneAt < 4 || L(g).queue.length >= 2 || sceneQueued(g, 'origin_burden') || sceneQueued(g, 'origin_want')) return;
  const q = (kind, data) => { queueScene(g, kind, data); s.sceneAt = now; return true; };
  const age = playerAge(g);
  const self = s.self;
  if (self && age >= 15) {
    const f = father(g); const rv = topRival(g);
    const fa = f?.name ?? '아버지';
    const base = { fa, rv: rv?.name ?? '', rvId: rv?.id ?? null };
    // 아버지가 죽었다: 빈 자리
    if (f && !f.alive && !s.done.seize && !self.seized && !self.left && age >= 16 && rng.chance(0.25)) return q('bb_seize', { ...base, wealth: f.wealth ?? 60 });
    if (!s.done.path && age <= 18 && !L(g).job && !g.origins?.flags?.cb_squire && (age >= 17 || rng.chance(0.06))) return q('bb_path', { fa, age, trade: g.player.familyId === 'merchant_bastard' && alive(f) });
    if (!s.done.name && age <= 20 && rng.chance(0.05)) return q('bb_name', { ...base, where: rng.pick(['길드 회관에서', '기사단 문간에서', '시청 창구에서', '학원 입학 날']) });
    if (alive(f) && !s.done.feast && age >= 16 && rng.chance(0.03)) return q('bb_feast', base);
    if (alive(f) && rv && !self.left && !s.done.rival && age >= 17 && ((rv.rivalry ?? 0) >= 40 || rng.chance(0.3)) && rng.chance(0.03)) return q('bb_rival', { ...base, place: placeName(here(g)) });
    if (alive(f) && self.recog < 2 && (!s.done.recog || now - s.done.recog >= 120) && age >= 17 && ((f.affection ?? 0) >= 30 || (L(g).renown ?? 0) >= 12 || (g.origins?.flags?.cb_squire && (g.player.skills.sword ?? 0) >= 14)) && rng.chance(0.04)) {
      return q('bb_recognize', { ...base, mom: alive(byId(g, me(g).motherId)) });
    }
  }
  // 내 혼외 자식
  const sp = byId(g, me(g).spouseId);
  const lgs = legitKids(g);
  for (const [p, t] of kidList(g)) {
    const a = ageYears(p);
    if (placeOf(p) !== here(g)) continue;
    if (alive(sp) && t.other !== sp.id && a >= 3 && a <= 14 && (!s.done.hearth || now - s.done.hearth >= 48) && rng.chance(0.03)) return q('bb_hearth', { id: p.id, k: p.name, sp: sp.name, spId: sp.id, lg: lgs.find((x) => placeOf(x) === here(g))?.name ?? '' });
    const lg = lgs.find((x) => placeOf(x) === here(g) && ageYears(x) >= 6 && ageYears(x) <= 17);
    if (lg && a >= 6 && a <= 17 && (!s.done.quarrel || now - s.done.quarrel >= 48) && rng.chance(0.025)) return q('bb_quarrel', { id: p.id, k: p.name, lg: lg.name, lgId: lg.id });
    if (!t.legit && a >= 6 && (!s.done.legit || now - s.done.legit >= 60) && rng.chance(0.015)) return q('bb_legit', { id: p.id, k: p.name, sp: alive(sp) ? sp.name : '' });
    if (!t.path && a >= 14 && a <= 16 && (a >= 16 || rng.chance(0.08))) return q('bb_send', { id: p.id, k: p.name, age: a, legit: t.legit });
  }
}

/* ---------- 플레이어 없이도: NPC 집안의 서자 ---------- */
function npcTick(g, rng) {
  const s = S(g); const now = mi(g);
  if (g.date.month !== 3 && g.date.month !== 9) return;
  const ppl = living(g).filter((p) => !p.isPlayer);
  const m = me(g);
  const family = new Set([m.id, m.fatherId, m.motherId, m.spouseId, ...(m.childIds ?? []), ...(g.player.familyIds ?? [])]);
  const say = (key, pool, c, place) => { if (place === here(g) && rng.chance(0.7)) line(g, 'npc', pickFresh(g, rng, key, pool)(c)); };
  // 넉넉한 집 사내가 서자를 얻는다
  if (s.npc.filter((x) => !x.end).length < 30) {
    const sires = ppl.filter((p) => p.sex === 'm' && p.spouseId && !family.has(p.id) && ageYears(p) >= 24 && ageYears(p) <= 55 && (p.title || RICH_JOBS.has(p.job) || (p.wealth ?? 0) >= 250) && !s.npc.some((x) => x.by === p.id && now - x.at < 120));
    for (const a of sires.slice(0, 10)) {
      if (!rng.chance(0.03)) continue;
      const mom = makePerson(rng, { sex: 'f', ageMonths: rng.int(17, 26) * 12, job: rng.pick(['maid', 'weaver', 'innkeeper']) });
      mom.place = placeOf(a); g.people.push(mom);
      const kid = makePerson(rng, { ageMonths: 0, job: 'child', lastName: mom.lastName, fatherId: a.id, motherId: mom.id });
      kid.place = placeOf(a); kid.baseborn = true;
      kid.history.push({ y: g.date.year, m: g.date.month, text: `${a.name}의 서출로 태어났다.` });
      g.people.push(kid); a.childIds.push(kid.id); mom.childIds.push(kid.id);
      s.npc.push({ kid: kid.id, by: a.id, mom: mom.id, at: now, y: g.date.year, place: placeOf(a), recog: false, path: null, ev: {} });
      s.made += 1;
      say('nb', T.NPC_BORN, { a: a.name, kid: kid.name, place: placeName(placeOf(a)) }, placeOf(a));
    }
  }
  for (const x of s.npc) {
    if (x.end) continue;
    const kid = byId(g, x.kid); const by = byId(g, x.by);
    if (!kid || !kid.alive) { x.end = now; continue; }
    if (!by) { x.end = now; continue; }
    const a = ageYears(kid);
    const lgs = (by.childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && !p.baseborn && p.id !== kid.id);
    const lg = lgs[0];
    const c = { a: by.name, kid: kid.name, place: placeName(x.place), lg: lg?.name ?? '' };
    if (!by.alive) {
      // 아버지가 죽었다: 적자가 다 죽었으면 서자가 잇고, 아니면 내보내진다
      if (a >= 16 && !lgs.length) {
        if (by.title) kid.title = by.title;
        kid.wealth = (kid.wealth ?? 0) + Math.round((by.wealth ?? 0) * 0.7); kid.lastName = by.lastName; x.ev.seize = now;
        kid.history.push({ y: g.date.year, m: g.date.month, text: `아버지 ${by.name}의 집안을 이었다.` });
        say('ns', T.NPC_SEIZE, c, x.place);
      } else if (lg && a >= 12 && !x.recog && rng.chance(0.5)) { x.ev.split = now; say('nx', T.NPC_SPLIT, c, x.place); }
      x.end = now; continue;
    }
    if (!x.recog && a >= 8 && rng.chance(0.06 + ((by.affection ?? 0) > 20 ? 0.02 : 0))) {
      x.recog = true; kid.lastName = by.lastName; kid.history.push({ y: g.date.year, m: g.date.month, text: `아버지 ${by.name}에게 자식으로 인정받았다.` });
      say('nr', T.NPC_RECOG, c, x.place);
    } else if (lg && !x.ev.fight && a >= 12 && ageYears(lg) >= 12 && rng.chance(0.12)) {
      x.ev.fight = now; say('nf', T.NPC_FIGHT, c, x.place);
    } else if (!x.path && a >= 15 && a <= 20 && rng.chance(0.3)) {
      const k = rng.int(0, 2); x.path = ['knight', 'priest', 'adventurer'][k];
      kid.job = x.path; kid.history.push({ y: g.date.year, m: g.date.month, text: k === 0 ? '기사단 종자로 들어갔다.' : k === 1 ? '수도원에 들어갔다.' : '용병단을 따라 떠났다.' });
      say('np', [T.NPC_PATH[k]], c, x.place);
    }
  }
  s.npc = s.npc.filter((x) => !x.end || now - x.end < 120);
  if (s.npc.length > 60) s.npc.splice(0, s.npc.length - 60);
}

function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over) return;
  sync(g);
  npcTick(g, ownRng(g, 7));
  flavor(g, ownRng(g, 19));
  playerTick(g, ownRng(g, 23));
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.baseborn = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g, rng, old) => {
  const s = S(g);
  s.self = null; s.kids = {}; s.done = {}; s.sceneAt = mi(g);
  const meP = me(g);
  sync(g);
  // 적출로 올리지 않은 서자가 대를 이으면 적자 형제가 따지러 온다
  if (!meP.baseborn || meP.legit || !old) return;
  const oldP = byId(g, old.id);
  const rv = (oldP?.childIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && !p.baseborn && !p.adopted && p.hiddenParent == null && ageYears(p) >= 16).sort((a, b) => ageYears(b) - ageYears(a))[0];
  if (!rv) return;
  queueScene(g, 'bb_contest', { old: old.name, rv: rv.name, rvId: rv.id });
});

/* ---------- 화면 연결점 ---------- */
export function bbLines(g) { return (g.baseborn?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function bbLine(g) { return bbLines(g)[0]?.text ?? null; }
const PATH_WORD = { knight: '기사단 종자', cloister: '수도원', merc: '용병단', trade: '아버지 상단', none: '스스로 찾는 길', home: '집에 남았다' };
export function bbInfo(g) {
  const s = S(g); const now = mi(g);
  const self = s.self;
  const f = self ? byId(g, self.fid) : null;
  const rv = self ? topRival(g) : null;
  const meAge = playerAge(g);
  return {
    self: self ? {
      father: f?.name ?? null, fatherAlive: !!f?.alive,
      recog: RECOG[self.recog] ?? RECOG[0], named: !!self.named, seized: !!self.seized,
      path: self.path ? PATH_WORD[self.path] ?? '' : null,
      rival: rv ? { name: rv.name, word: sibWord(rv, meAge), rivalry: Math.round(rv.rivalry ?? 0) } : null,
    } : null,
    kids: kidList(g).map(([p, t]) => ({ id: p.id, name: p.name, age: ageYears(p), word: kidWord(p), legit: !!t.legit, path: t.path ? PATH_WORD[t.path] ?? '' : null, bond: Math.round(bondOf(g, p.id)), years: Math.floor((now - t.since) / 12) })),
    any: !!self || Object.keys(s.kids).length > 0,
    npc: s.npc.filter((x) => x.place === here(g)).slice(-5).map((x) => ({ kid: byId(g, x.kid)?.name ?? '', by: byId(g, x.by)?.name ?? '', recog: !!x.recog, y: x.y })),
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
