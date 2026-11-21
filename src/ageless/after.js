// 27단계: 불로가 된 뒤의 삶. 상태는 g.afterlife 하나, 화면 연결점은 afterInfo(g). 바꾼 이름은 core의 g.ageless.names에 쌓는다.
// - 대를 잇지 않고 계속 집안 주인으로 산다(늙어 죽지 않으니 저절로 그렇다).
// - 늙지 않는다는 소문(rumor): 불로가 된 지 열두 해가 넘으면 이웃이 눈치챈다. 한 고장에 오래 머물수록 빨리 퍼진다(after_rumor).
// - 이름 바꾸고 떠나기(after_rename): 소문이 퍼졌거나 스무 해 가까이 같은 이름으로 살았을 때만 보인다. secret의 '바꾼 이름'으로도 남긴다.
// - 왕과 교단이 노림(after_hunted): 소문이 크게 퍼지면 그 비밀을 가지려는 쪽이 찾아온다.
// - 먼저 떠나보내기(after_farewell): 불로인 동안 배우자·자식·식구가 죽으면 그 장면이 온다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { PLACES, leaveJob } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, check, traveling } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { isJailed, reportCrime } from '../crime.js';
import { courtState } from '../court/index.js';
import { realmState, realmOf } from '../realms/index.js';
import { MALE_NAMES, FEMALE_NAMES } from '../data.js';
import { AG, playerAgeless, agelessYears } from './core.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 113) ^ Math.imul(mi(g) * 89 + salt + 71, 2654435761)) | 0 });
const stat = (g, id) => g.player.stats?.[id] ?? 0;
const base = (g) => playerAge(g) >= 16 && !g.over && !L(g).heirPending;
const ready = (g) => base(g) && !traveling(g) && !isJailed(g) && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;
const jo = (w, pair) => J(w, pair).slice(String(w).length);
const CITY = ['leocast', 'harfen', 'verden', 'eisen', 'solaris', 'serenia', 'barka', 'graubel'];
const RUMOR_WORD = (r) => (r >= 70 ? '늙지 않는 사람이라고 대놓고 말한다' : r >= 40 ? '이웃들이 수군거린다' : r >= 15 ? '눈썰미 좋은 사람 몇이 갸웃한다' : '아무도 눈치채지 못했다');

export function afterState(g) {
  g.afterlife ??= {};
  const v = g.afterlife;
  v.rumor ??= 0;
  v.renamedAt ??= null;  // 마지막으로 이름을 바꾼 달 (없으면 불로가 된 달부터 센다)
  v.watch ??= [];        // 지켜보는 식구 [{ id, rel }]
  v.gone ??= [];         // 먼저 떠나보낸 사람 [{ name, rel, y }]
  v.rumorSeen ??= false;
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const V = afterState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 16) v.log.shift(); }
const sinceName = (g) => { const v = V(g), a = AG(g); const from = v.renamedAt ?? a.since; return from == null ? 0 : Math.floor((mi(g) - from) / 12); };
export const canRename = (g) => playerAgeless(g) && (V(g).rumor >= 35 || sinceName(g) >= 18);

export function afterInfo(g) {
  if (!playerAgeless(g) && !V(g).gone.length) return null;
  const v = V(g);
  return { rumor: Math.round(v.rumor), rumorWord: RUMOR_WORD(v.rumor), sameName: sinceName(g), canRename: canRename(g), gone: v.gone.slice(-8).map((x) => ({ ...x })), log: v.log.slice(-6).map((x) => ({ ...x })) };
}

// 지켜볼 식구: 배우자, 자식, 부모·형제
function kinNow(g) {
  const p = me(g);
  if (!p) return [];
  const out = [];
  const sp = p.spouseId ? byId(g, p.spouseId) : null;
  if (sp?.alive) out.push({ id: sp.id, rel: '배우자' });
  for (const id of p.childIds ?? []) { const c = byId(g, id); if (c?.alive && !c.isPlayer) out.push({ id, rel: '자식' }); }
  for (const id of g.player.familyIds ?? []) { const f = byId(g, id); if (f?.alive && !f.isPlayer && !out.some((x) => x.id === id)) out.push({ id, rel: '식구' }); }
  return out;
}

/* ---------- 이름 바꾸고 떠나기 ---------- */
function rename(g, rng) {
  const v = V(g), a = AG(g), p = me(g);
  const old = g.player.name;
  let name = old;
  for (let t = 0; t < 8 && (name === old || a.names.some((x) => x.name === name)); t++) name = rng.pick(p.sex === 'f' ? FEMALE_NAMES : MALE_NAMES);
  a.names.push({ name: old, y: g.date.year });
  g.player.name = name; p.name = name;
  const to = CITY.filter((c) => c !== here(g) && PLACES[c]);
  const dest = to.length ? rng.pick(to) : 'leocast';
  if (L(g).job) leaveJob(g, `${old}${jo(old, '이/가')} 사라지며 일도 끝났다.`);
  L(g).place = dest; L(g).travel = null;
  const R = realmState(g); R.cur = realmOf(dest); R.last = dest;
  if (!['street', 'barracks'].includes(L(g).home)) L(g).home = 'inn';
  L(g).notoriety = Math.floor((L(g).notoriety ?? 0) * 0.3);
  v.rumor = 0; v.renamedAt = mi(g); v.rumorSeen = false;
  // secret의 '바꾼 이름'으로 남긴다
  if (g.secret) {
    const S = g.secret; S.list ??= []; S.seq ??= 1;
    S.list.push({ id: S.seq++, kind: 'alias', name, cover: 'plain', ageless: true, since: mi(g), risk: 5, knowers: [], gen: 0, out: false, place: dest });
    if (S.list.length > 16) S.list.shift();
    S.alias = { name, cover: 'plain', place: dest, since: mi(g), noto: L(g).notoriety ?? 0 };
  }
  note(g, `${old}의 이름을 버리고 ${placeName(dest)}에서 ${name}${jo(name, '이/가')} 되었다.`);
  chron(g, `${placeName(here(g))}에 낯선 사람 ${name}${jo(name, '이/가')} 들어와 살기 시작했다.`, 20);
  log(g, `${old} → ${name}. ${placeName(dest)}.`);
  return { old, name, dest };
}
ACTIONS.push({
  id: 'after_rename', name: '이름을 바꾸고 떠난다', icon: 'road',
  desc: '늙지 않는 얼굴이 눈에 띄기 시작했다. 다른 이름으로 다른 고장에 가서 처음부터 산다.',
  available: (g) => ready(g) && canRename(g),
  run(g, rng) {
    const kin = kinNow(g).length;
    const r = rename(g, rng);
    stress(g, 6);
    return `${r.old}${jo(r.old, '은/는')} 먼 데 장사하러 가서 소식이 끊긴 사람이 되었다. ${kin ? '식구들에게는 편지를 남겼다. 진짜 까닭은 쓰지 못했다. ' : ''}${placeName(r.dest)}의 대서소에서 새 증서를 받았다. ${r.name}. 처음 불렸을 때 대답이 한 박자 늦었다. 이번이 몇 번째 이름인지 손가락으로 세어 보았다.`;
  },
});

/* ---------- 소문 ---------- */
defineScene('after_rumor', {
  title: () => '늙지 않는 얼굴',
  text: (g) => `우물가에서 아낙 하나가 나를 빤히 보더니 말했다. "우리 어머니 처녀 적에도 댁이 꼭 그 얼굴이었다던데." 웃자고 한 말이었다. 둘레의 사람들은 웃지 않았다. ${placeName(here(g))}에서 산 지 오래되었다.`,
  choices: (g) => (base(g) && playerAgeless(g) ? [
    { key: 'laugh', label: '웃어넘긴다', hint: '' },
    { key: 'kin', label: '그건 내 숙부였다고 둘러댄다', hint: '말솜씨가 버팀목이다' },
    { key: 'ready', label: '떠날 채비를 한다', hint: '이름을 바꿀 때가 왔다' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g);
    if (!base(g) || !playerAgeless(g)) return '그 말은 곧 잊혔다.';
    if (k === 'kin') { if (check(rng, stat(g, 'cha'), 35)) { v.rumor = clamp(v.rumor - 15, 0, 100); return '숙부 이야기를 지어냈다. 그 숙부가 다리를 절었다는 것까지. 아낙은 고개를 끄덕였다. 나는 내가 지어낸 숙부의 이름을 잊지 않으려고 집에 와서 적어 두었다.'; } v.rumor = clamp(v.rumor + 8, 0, 100); return '숙부 이야기를 했는데, 아낙의 시어머니가 그 숙부를 안다고 했다. 이야기가 맞지 않았다.'; }
    if (k === 'ready') { v.rumor = clamp(v.rumor + 10, 0, 100); return '그날 밤 짐을 반쯤 쌌다. 무엇을 두고 갈지 고르는 것이 무엇을 가져갈지 고르는 것보다 오래 걸렸다.'; }
    v.rumor = clamp(v.rumor + 5, 0, 100);
    return '같이 웃었다. 집에 와서 거울을 오래 보았다. 그 아낙의 말이 맞다.';
  },
});
defineScene('after_hunted', {
  title: (g, s) => (s.who === 'church' ? '심문관의 방문' : '왕의 사람'),
  text: (g, s) => (s.who === 'church'
    ? '이단심문소의 회색 옷을 입은 사람이 찾아왔다. "늙지 않는 몸은 신의 질서를 어긴 몸입니다. 어떻게 그리 되었는지 말씀해 주시면, 교단이 당신 영혼을 위해 기도하겠습니다." 뒤에 선 두 사람은 기도하러 온 얼굴이 아니었다.'
    : '궁정의 문장을 단 사람이 왔다. "폐하께서 늙지 않는 사람에 대해 들으셨습니다. 폐하도 언젠가는 늙으시겠지요. 그 전에 이야기를 나누고 싶어 하십니다." 초대라고 했다. 거절할 수 있다는 말은 없었다.'),
  choices: (g, s) => (ready(g) && playerAgeless(g) ? [
    { key: 'serve', label: s.who === 'church' ? '교단의 물음에 답한다' : '궁정으로 간다', hint: s.who === 'church' ? '비밀을 내준다. 대신 목숨은 건진다' : '왕의 곁에서 산다. 비밀은 왕의 것이 된다' },
    { key: 'flee', label: '그날 밤 이름을 바꾸고 사라진다', hint: '' },
    { key: 'deny', label: '모르는 일이라 잡아뗀다', hint: '그들은 다시 온다' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g);
    if (!ready(g) || !playerAgeless(g)) return '그 사람들은 다시 오지 않았다.';
    if (k === 'flee') { const r = rename(g, rng); stress(g, 10); return `그날 밤으로 떠났다. ${placeName(r.dest)}에 닿았을 때 나는 ${r.name}${J(r.name, '이었/였')}다. 두고 온 집에는 아직 불이 켜져 있을 것이다.`; }
    if (k === 'serve') {
      if (s.who === 'church') { v.rumor = clamp(v.rumor - 30, 0, 100); stress(g, 15); return '아는 대로 말했다. 심문관은 받아 적고, 다 듣고 나서 오래 침묵했다. "그 길은 교단 장부에 이단으로 적히겠군요." 그들은 나를 데려가지 않았다. 대신 해마다 사람을 보내 내가 아직 그 얼굴인지 확인한다.'; }
      const c = courtState(g); c.standing = clamp((c.standing ?? 0) + 15, 0, 100); g.player.money += 40;
      log(g, '늙지 않는 몸 때문에 왕의 곁으로 불려 갔다.');
      return '왕은 내 손을 오래 잡고 있었다. 맥을 짚는 것처럼. 궁정의 방 하나와 은화 마흔 닢을 받았다. 그 방에는 바깥에서만 여는 자물쇠가 달려 있었다.';
    }
    v.rumor = clamp(v.rumor + 5, 0, 100);
    if (s.who === 'church' && rng.chance(0.4)) { reportCrime(g, 'fraud', here(g), { mult: 0.5 }); return '잡아뗐다. 다음 주 장터에 내 이름이 붙었다. 죄목은 "사람을 속인 죄". 그들은 진짜 죄목을 쓰지 않았다.'; }
    return '모른다고 했다. 그들은 정중하게 물러갔다. 정중하다는 것이 더 무서웠다.';
  },
});
defineScene('after_farewell', {
  title: (g, s) => `${s.name}${jo(s.name, '을/를')} 보내며`,
  text: (g, s) => {
    const a = agelessYears(g);
    if (s.rel === '배우자') return `${J(s.name, '이/가')} 눈을 감았다. 마지막 몇 해, 그 사람은 내 손을 잡을 때마다 손등의 주름을 세었다. 자기 손만 늙는 걸 보면서도 끝까지 한 번도 묻지 않았다. 나는 ${a}해째 같은 얼굴이다.`;
    if (s.rel === '자식') return `${J(s.name, '이/가')} 먼저 갔다. 늙은 얼굴로. 장례에 온 손주들이 나를 보고 누구냐고 물었다. 그 아이 어릴 적 업어 준 등은 그대로인데, 업힐 사람이 없다.`;
    return `${J(s.name, '이/가')} 세상을 떠났다. 나를 어릴 적 이름으로 부를 수 있는 사람이 또 하나 줄었다.`;
  },
  choices: (g) => (base(g) && playerAgeless(g) ? [
    { key: 'grave', label: '무덤 곁에 오래 머문다', hint: '' },
    { key: 'work', label: '다음 날 다시 일을 나간다', hint: '' },
    { key: 'write', label: '그 사람 이야기를 적어 둔다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    if (!base(g)) return '';
    if (k === 'grave') { stress(g, -4); return '해가 질 때까지 앉아 있었다. 묘지기가 문을 닫으며 나를 보고, 처음 보는 얼굴이라 생각했는지 고개만 숙이고 갔다.'; }
    if (k === 'write') { g.player.skills.letters = (g.player.skills.letters ?? 0) + 0.3; return `${s.name}의 웃음소리, 싫어하던 음식, 마지막으로 한 말. 적어 두지 않으면 백 년 뒤에는 나도 잊을 것이다. 그게 가장 두려웠다.`; }
    stress(g, 4);
    return '다음 날 아침 다시 일을 나갔다. 그래야 했다. 손이 하던 일을 기억했다. 마음은 그러지 못했다.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  if (!playerAgeless(g)) { v.watch = []; v.rumor = clamp(v.rumor - 1, 0, 100); return; }
  const r = ownRng(g, 5);
  // 먼저 떠난 식구
  const now = kinNow(g);
  for (const w of v.watch) {
    if (now.some((x) => x.id === w.id)) continue;
    const p = byId(g, w.id);
    if (p && !p.alive) {
      v.gone.push({ name: p.name, rel: w.rel, y: g.date.year, age: ageYears(p) });
      if (v.gone.length > 20) v.gone.shift();
      log(g, `${p.name}(${w.rel})${jo(p.name, '을/를')} 먼저 보냈다.`);
      if (base(g) && (w.rel !== '식구' || r.chance(0.5))) queueScene(g, 'after_farewell', { name: p.name, rel: w.rel });
    }
  }
  v.watch = now.map((x) => ({ id: x.id, rel: x.rel }));
  // 소문
  const yrs = agelessYears(g);
  if (yrs >= 12) v.rumor = clamp(v.rumor + 0.25 + Math.min(0.5, sinceName(g) / 60), 0, 100);
  if (!ready(g) || mi(g) - v.sceneAt < 6) return;
  if (v.rumor >= 40 && !v.rumorSeen && !sceneQueued(g, 'after_rumor')) { v.rumorSeen = true; v.sceneAt = mi(g); queueScene(g, 'after_rumor', {}); return; }
  if (v.rumor >= 60 && r.chance(0.03) && !sceneQueued(g, 'after_hunted')) { v.sceneAt = mi(g); queueScene(g, 'after_hunted', { who: r.chance(0.5) ? 'church' : 'crown' }); }
});
HOOKS.heir.push((g) => { const v = V(g); v.rumor = 0; v.renamedAt = null; v.watch = []; v.rumorSeen = false; });
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
