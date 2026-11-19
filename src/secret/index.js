// 20단계: 비밀과 이중생활.
// 누구나 하나쯤은 묻어 둔 것이 있다. 묻어 둔 것은 썩지 않는다. 언젠가 누가 파낸다.
// - 숨겨 둔 사생아(bastard): 몰래 만나는 사람, 혼인 전의 연인과 아이가 생긴다. 내 자식으로 받거나, 돈을 보내며 숨기거나, 모른 척한다.
//   숨긴 아이는 자라서 나를 찾아온다(secret_child).
// - 바꾼 이름과 감춘 출신(alias): 태어난 곳을 떠나 다른 이름으로 산다. 악명이 옅어지고, 몰락한 기사 집안이라 꾸미면 궁정 문턱이 낮아진다.
// - 두 집 살림(twohome): 혼인한 채 몰래 만나는 사람에게 다른 고장에 집을 얻어 준다. 달마다 돈이 들고, 들키면 집이 둘 다 무너진다.
// - 밤의 얼굴(mask): 의적(robin)·밀정(spy)·이단(heretic). 가면 이름으로 밤일을 한다(secret_night). 소문은 가면 이름에 붙는다.
// - 비밀을 아는 사람(knowers): 눈치챈 사람이 생기고, 찾아와 입막음을 청하거나 협박한다(secret_knower). 돈·으름장·애원·영원히 입을 막기.
// - 들통(secret_exposed): 들킬 위험(risk)이 쌓이면 터진다. 털어놓기·잡아떼기. 배우자·평판·악명·법·궁정·교단이 따라 움직인다.
// - 대를 넘는 집안 비밀: 선대가 묻은 비밀은 자식에게 넘어간다. 선대의 숨긴 아이가 배다른 형제로 찾아오고(secret_halfsib),
//   선대의 가면과 진짜 이름이 상자에서 나온다(secret_legacy).
// 매달 굴림은 따로 난수(ownRng)를 써서 다른 갈래의 난수를 밀지 않는다.
// 잇는 곳: relations(remember), love(affair·spouse.mood·divorce), kin(childIds·familyIds), crime(reportCrime·notoriety),
//          court(standing·secrets·disgrace), letters(kept), faith(suspicion), repute(deed), feud(addGrudge), heir.
// 상태는 game.secret 하나. 화면 연결점: secretInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat } from '../game.js';
import { byId, fullName, ageYears, makePerson, kill, has } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, tired, stress, spend, canSpend, check } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { rel, remember, relState } from '../relations.js';
import { isJailed, reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { addGrudge } from '../feud/index.js';
import { kinState } from '../kin/index.js';
import { loveState, divorce } from '../love/index.js';
import { faithState } from '../faith/index.js';
import { courtState, courtHouses } from '../court/index.js';
import { lettersState } from '../letters/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '어느 고장';
const alive = (p) => !!p && p.alive && !p.isPlayer;
const jo = (w, pair) => J(w, pair).slice(w.length);
const ira = (w) => (jo(w, '이/가') === '이' ? '이라' : '라');
const ready = (g) => playerAge(g) >= 15 && !traveling(g) && !isJailed(g) && !g.over && !L(g).heirPending;
// 이 갈래만의 난수: 매달 굴림이 많아 다른 갈래 점검을 흔들지 않게 따로 굴린다
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul(mi(g) * 43 + salt + 29, 2654435761)) | 0 });

export const KINDS = {
  bastard: { name: '숨겨 둔 아이', base: 0.25 },
  alias: { name: '바꾼 이름', base: 0.3 },
  twohome: { name: '두 집 살림', base: 0.9 },
  mask: { name: '밤의 얼굴', base: 0.2 },
};
export const MASKS = {
  robin: { name: '의적', names: ['밤까마귀', '회색 두건', '굴뚝새', '그림자 손'], desc: '부자의 곳간을 털어 굶는 집 문 앞에 둔다.' },
  spy: { name: '밀정', names: ['검은 잉크', '세 번째 열쇠', '겨울 손님', '빈 의자'], desc: '들은 것을 팔고, 시킨 것을 엿본다.' },
  heretic: { name: '이단', names: ['새벽 전의 형제', '꺼진 등불', '일곱째 이름', '젖은 재'], desc: '교단이 금한 기도를 밤에 몰래 올린다.' },
};
const COVERS = {
  noble: { label: '몰락한 기사 집안의 마지막 자손이라 한다', risk: 0.55, say: '몰락한 기사 집안 출신' },
  plain: { label: '먼 고장 떠돌이 장사꾼의 자식이라 한다', risk: 0.2, say: '떠돌이 장사꾼 집안 출신' },
  foreign: { label: '세레니아에서 건너왔다고 한다', risk: 0.35, say: '세레니아 출신' },
};

/* ---------- 상태 ---------- */
export function secretState(g) {
  g.secret ??= {};
  const v = g.secret;
  v.seq ??= 1;
  v.list ??= [];       // [{ id, kind, pid, place, since, risk, knowers:[pid], gen, out:false, ... }]
  v.mask ??= null;     // { kind, name, heat, deeds, legend, since }
  v.alias ??= null;    // { name, cover, place, since, noto }
  v.born ??= null;     // 태어난 고장 (바꾼 이름은 여기를 떠나야 쓸 수 있다)
  v.exposed ??= 0;     // 이 집안에서 들통난 비밀 수
  v.silenced ??= 0;
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const V = secretState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
const open = (g) => V(g).list.filter((s) => !s.out);
const secretOf = (g, kind) => open(g).find((s) => s.kind === kind && s.gen === 0) ?? null;
export const riskWord = (r) => (r >= 70 ? '곧 터질 것 같다' : r >= 45 ? '수군거림이 돈다' : r >= 20 ? '누군가 눈치챘을지 모른다' : '아직 아무도 모른다');
function addSecret(g, kind, extra = {}) {
  const v = V(g);
  const s = { id: v.seq++, kind, since: mi(g), risk: 5, knowers: [], gen: 0, out: false, place: here(g), ...extra };
  v.list.push(s);
  if (v.list.length > 16) { const i = v.list.findIndex((x) => x.out); v.list.splice(i >= 0 ? i : 0, 1); }
  return s;
}
const knowerList = (g, s) => s.knowers.map((id) => byId(g, id)).filter(alive);
function labelOf(g, s) {
  const p = s.pid != null ? byId(g, s.pid) : null;
  if (s.kind === 'bastard') return `${s.gen ? '선대가 ' : ''}${p ? `${J(s.otherName ?? '그 사람', '과/와')} 낳은 ${p.name}` : '어딘가의 아이'}`;
  if (s.kind === 'alias') return `${s.gen ? '선대가 ' : ''}${s.name ? J(s.name, '으로/로') : '다른 이름으로'} ${s.gen ? '살았다' : '산다'}`;
  if (s.kind === 'twohome') return `${placeName(s.place)}에 ${p?.name ?? '그 사람'}의 집`;
  if (s.kind === 'mask') return `${s.gen ? '선대의 ' : ''}가면 '${s.name}'`;
  return KINDS[s.kind]?.name ?? '비밀';
}

/* ---------- 화면용 ---------- */
export function secretInfo(g) {
  const v = V(g);
  return {
    secrets: open(g).map((s) => ({
      id: s.id, kind: s.kind, kindName: KINDS[s.kind]?.name ?? '비밀', label: labelOf(g, s), risk: Math.round(s.risk), riskWord: riskWord(s.risk),
      knowers: knowerList(g, s).map((p) => p.name), inherited: s.gen > 0, years: Math.floor((mi(g) - s.since) / 12),
    })),
    mask: v.mask ? { kind: v.mask.kind, kindName: MASKS[v.mask.kind].name, name: v.mask.name, heat: Math.round(v.mask.heat), deeds: v.mask.deeds, legend: v.mask.legend } : null,
    alias: v.alias ? { name: v.alias.name, cover: COVERS[v.alias.cover]?.say ?? '', placeName: placeName(v.alias.place) } : null,
    hiddenKids: open(g).filter((s) => s.kind === 'bastard' && alive(byId(g, s.pid))).map((s) => ({ name: byId(g, s.pid).name, age: ageYears(byId(g, s.pid)), inherited: s.gen > 0 })),
    exposed: v.exposed, silenced: v.silenced,
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 숨겨 둔 아이 ---------- */
function secretPartner(g) {
  const lv = loveState(g);
  if (lv.affair) { const p = byId(g, lv.affair.id); if (alive(p) && !p.away) return p; }
  if (!me(g).spouseId) return g.people.find((p) => alive(p) && !p.away && p.bond === 'lover' && (p.romance ?? 0) >= 50) ?? null;
  return null;
}
function fertile(g, p) {
  const mother = me(g).sex === 'f' ? me(g) : p;
  const age = mother === me(g) ? playerAge(g) : ageYears(p);
  return p.sex !== me(g).sex && age >= 16 && age <= 42 && playerAge(g) >= 16;
}
defineScene('secret_bastard', {
  title: () => '말 못 할 소식',
  text: (g, s) => {
    const p = byId(g, s.pid);
    if (me(g).sex === 'f') return `달거리가 두 달째 없다. ${J(p?.name ?? '그 사람', '은/는')} 아직 모른다. ${me(g).spouseId ? '남편의 아이가 아니라는 것은 나만 안다.' : '혼인도 하지 않은 몸이다.'} 배는 곧 불러 올 것이다.`;
    return `${J(p?.name ?? '그 사람', '이/가')} 강가에서 내 소매를 붙잡았다. "아이가 생겼어요." ${me(g).spouseId ? '집에는 내 아내가 있다.' : '우리는 혼인한 사이가 아니다.'} ${p?.name ?? '그 사람'}의 눈이 내 대답을 기다린다.`;
  },
  choices: (g, s) => {
    const p = byId(g, s.pid);
    if (!alive(p) || !ready(g)) return [];
    return [
      { label: '내 아이라고 떳떳이 밝힌다', key: 'own' },
      canSpend(g, 10) ? { label: me(g).sex === 'f' ? '먼 고장 집에 맡기고 달마다 돈을 보낸다' : '달마다 돈을 보내고 아무에게도 말하지 않는다', key: 'hide' } : null,
      { label: me(g).sex === 'f' ? '아이를 낳아 수도원 문 앞에 두고 온다' : '내 아이가 아니라고 한다', key: 'deny' },
    ].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid);
    if (!alive(p)) return '그 사람은 이미 떠나고 없었다.';
    const meP = me(g);
    const mom = me(g).sex === 'f' ? meP : p;
    const kid = makePerson(rng, { ageMonths: 0, job: 'child', lastName: key === 'own' ? meP.lastName : p.lastName });
    kid.place = key === 'deny' && me(g).sex === 'f' ? 'leocast' : me(g).sex === 'f' && key === 'hide' ? 'harfen' : (p.place ?? here(g));
    kid.known = true; kid.affection = 0;
    if (me(g).sex === 'f') kid.fatherId = p.id; else kid.motherId = p.id;
    kid.history.push({ y: g.date.year, m: g.date.month, text: '태어났다.' });
    g.people.push(kid); rel(kid);
    p.childIds ??= []; p.childIds.push(kid.id);
    const sp = byId(g, meP.spouseId);
    if (key === 'own') {
      if (me(g).sex === 'f') kid.motherId = meP.id; else kid.fatherId = meP.id;
      meP.childIds.push(kid.id);
      if (!g.player.familyIds.includes(kid.id)) g.player.familyIds.push(kid.id);
      kid.place = here(g);
      chron(g, `${g.player.name}, 혼인 밖에서 난 아이 ${J(kid.name, '을/를')} 자식으로 받다.`, 50);
      deed(g, 'honest', 3, '혼인 밖에서 난 아이를 숨기지 않았다더라');
      if (alive(sp)) { const ls = loveState(g).spouse; if (ls) { ls.mood = clamp((ls.mood ?? 50) - 30, 0, 100); ls.cheated = true; } remember(g, sp, '혼인 밖에서 아이를 낳았다', -3, { tag: 'secret' }); }
      relState(g).news.push({ text: `${g.player.name}에게 혼인 밖에서 난 아이가 있다는 말이 돈다.`, who: [p.id], weight: 5 });
      p.affection = clamp((p.affection ?? 0) + 15, -100, 100);
      return `${kid.name}. 이름을 지어 주고 우리 집 족보에 올렸다. 장터 사람들은 한동안 수군거렸다.${alive(sp) ? ` ${J(sp.name, '은/는')} 며칠 동안 나와 한 상에서 밥을 먹지 않았다.` : ''} 아이는 그런 걸 모르고 잘 울고 잘 먹었다.`;
    }
    if (key === 'hide') {
      spend(g, 10);
      addSecret(g, 'bastard', { pid: kid.id, other: p.id, otherName: p.name, place: kid.place, upkeep: 2 });
      kid.hiddenParent = meP.id;
      p.affection = clamp((p.affection ?? 0) + 5, -100, 100);
      remember(g, p, '아이를 숨기고 돈만 보낸다', -1, { tag: 'secret' });
      note(g, `${placeName(kid.place)}에 아무도 모르는 아이가 있다.`);
      return me(g).sex === 'f'
        ? `먼 친척 집에 다녀온다고 하고 여섯 달을 비웠다. ${placeName(kid.place)}의 늙은 과부에게 아이를 맡겼다. 돌아오는 길에 젖이 불어 울었다.`
        : `${p.name}에게 은화 열 닢을 쥐여 주었다. "달마다 보내겠소. 대신 아무에게도." ${J(p.name, '은/는')} 대답하지 않고 은화를 받았다.`;
    }
    addSecret(g, 'bastard', { pid: kid.id, other: p.id, otherName: p.name, place: kid.place, upkeep: 0, denied: true });
    kid.hiddenParent = meP.id;
    p.affection = clamp((p.affection ?? 0) - 35, -100, 100);
    addGrudge(g, p, 25, '아이를 버렸다');
    deed(g, 'kind', -2, null);
    return me(g).sex === 'f'
      ? '새벽에 수도원 문 앞에 바구니를 두었다. 종소리가 울릴 때까지 담 뒤에 숨어 보았다. 수사 하나가 바구니를 안고 들어갔다. 그 아이 이름은 모른다.'
      : `"내 아이가 아니오." ${J(p.name, '은/는')} 한참 나를 보다가 돌아섰다. 그 아이는 아비 없이 자랄 것이다. 아비가 누군지는 그 사람이 알고, 나도 안다.`;
  },
});
// 숨긴 아이가 자라서 찾아온다
defineScene('secret_child', {
  title: () => '낯익은 얼굴',
  text: (g, s) => { const p = byId(g, s.pid); return `문 앞에 ${ageYears(p)}살쯤 된 ${p.sex === 'm' ? '사내' : '처녀'}가 서 있다. 눈매가 낯익다. 거울에서 보던 눈이다. "${J(s.otherName ?? '어머니', '이/가')} 당신 이름을 알려 줬어요. 오래 망설였어요."`; },
  choices: (g, s) => {
    const p = byId(g, s.pid);
    if (!alive(p) || !ready(g)) return [];
    return [{ label: '내 아이라고 받아들인다', key: 'own' }, canSpend(g, 20) ? { label: '은화 스무 닢을 주고 돌려보낸다', key: 'pay' } : null, { label: '사람을 잘못 찾았다고 한다', key: 'deny' }].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid);
    const sec = V(g).list.find((x) => x.id === s.sid);
    if (!alive(p)) return '그 아이는 이미 떠나고 없었다.';
    if (key === 'own') {
      acknowledge(g, p, sec);
      return `${J(p.name, '은/는')} 내 손을 잡지 않았다. 대신 오래 내 얼굴을 보았다. "생각했던 것보다 늙었네요." 그날 저녁 한 상에 앉았다. 둘 다 말이 없었다.`;
    }
    if (key === 'pay') {
      spend(g, 20);
      p.affection = clamp((p.affection ?? 0) - 10, -100, 100);
      if (sec) { sec.risk = clamp(sec.risk + 10, 0, 100); sec.met = true; if (!sec.knowers.includes(p.id)) sec.knowers.push(p.id); }
      return `은화를 받았다. 세어 보지도 않았다. "이게 값이군요." ${J(p.name, '은/는')} 돌아서 갔다. 그 말이 오래 남았다.`;
    }
    p.affection = clamp((p.affection ?? 0) - 40, -100, 100);
    addGrudge(g, p, 35, '아비 노릇을 부정했다');
    if (sec) { sec.risk = clamp(sec.risk + 15, 0, 100); sec.met = true; if (!sec.knowers.includes(p.id)) sec.knowers.push(p.id); }
    return `"그렇군요." ${J(p.name, '은/는')} 웃었다. 웃는 입꼬리까지 나를 닮았다. 그 아이는 이 고장을 떠나지 않았다.`;
  },
});
function acknowledge(g, p, sec) {
  const meP = me(g);
  if (!meP.childIds.includes(p.id)) meP.childIds.push(p.id);
  if (!g.player.familyIds.includes(p.id)) g.player.familyIds.push(p.id);
  if (me(g).sex === 'f') p.motherId = meP.id; else p.fatherId = meP.id;
  delete p.hiddenParent;
  p.affection = clamp((p.affection ?? 0) + 20, -100, 100);
  p.place = here(g);
  if (sec) { sec.out = true; sec.how = 'own'; }
  const ls = loveState(g).spouse;
  if (ls && alive(byId(g, meP.spouseId))) { ls.mood = clamp((ls.mood ?? 50) - 20, 0, 100); ls.cheated = true; }
  chron(g, `${g.player.name}, 숨겨 온 자식 ${J(p.name, '을/를')} 받아들이다.`, 50);
  log(g, `숨겨 온 자식 ${J(p.name, '을/를')} 받아들였다.`);
}

/* ---------- 바꾼 이름 ---------- */
ACTIONS.push({
  id: 'secret_alias', name: '다른 이름으로 살기', icon: 'scroll',
  desc: '위조 증서를 사서 새 이름과 새 출신을 얻는다. 지난 일이 옅어진다. 대신 옛날을 아는 사람이 나타나면 끝이다.',
  available: (g) => ready(g) && playerAge(g) >= 16 && !V(g).alias && V(g).born && here(g) !== V(g).born && !sceneQueued(g, 'secret_alias'),
  run(g) { queueScene(g, 'secret_alias', {}); return '뒷골목 대서소 문을 두드렸다.'; },
});
defineScene('secret_alias', {
  title: () => '새 이름',
  text: (g) => `대서소 늙은이가 촛불 아래서 빈 증서를 펼쳤다. "이름은 아무거나 좋소. 출신이 문제지. 사람들이 묻는 건 늘 '어디 사람이오'거든." 증서 값은 은화 열다섯 닢이다.${(L(g).notoriety ?? 0) >= 20 ? ' 내 진짜 이름에는 이미 붙은 말이 많다.' : ''}`,
  choices: (g) => (ready(g) && !V(g).alias && here(g) !== V(g).born && canSpend(g, 15) ? [...Object.entries(COVERS).map(([k, c]) => ({ label: c.label, key: k })), { label: '그만둔다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    if (key === 'no' || !COVERS[key]) return '촛불을 끄고 나왔다. 내 이름은 내 이름이다. 무겁더라도.';
    if (!spend(g, 15)) return '증서 값이 모자랐다.';
    const v = V(g);
    const name = makePerson(rng, { sex: me(g).sex }).name;
    v.alias = { name, cover: key, place: here(g), since: mi(g), noto: L(g).notoriety ?? 0 };
    L(g).notoriety = Math.floor((L(g).notoriety ?? 0) * 0.4);
    if (key === 'noble') courtState(g).standing = (courtState(g).standing ?? 0) + 4;
    addSecret(g, 'alias', { name, cover: key });
    note(g, `${placeName(here(g))}에서 ${J(name, '이/가')} 되었다.`);
    log(g, `${placeName(here(g))}에서 ${name}${jo(name, '이/가')} 되었다. ${COVERS[key].say}이라 한다.`);
    return `증서에 먹이 마르기를 기다렸다. ${name}. ${COVERS[key].say}. 처음 몇 달은 누가 그 이름을 부르면 대답이 늦었다. 이제는 아니다.`;
  },
});

/* ---------- 두 집 살림 ---------- */
ACTIONS.push({
  id: 'secret_twohome', name: '두 집 살림 차리기', icon: 'house',
  desc: '몰래 만나는 사람에게 다른 고장에 집을 얻어 준다. 은화 서른 닢, 달마다 셋. 마음 둘 곳이 하나 더 생긴다.',
  available: (g) => {
    if (!ready(g) || playerAge(g) < 18 || !me(g).spouseId || secretOf(g, 'twohome')) return false;
    const af = loveState(g).affair; const p = af ? byId(g, af.id) : null;
    return alive(p) && canSpend(g, 30);
  },
  run(g) {
    const af = loveState(g).affair; const p = af ? byId(g, af.id) : null;
    if (!alive(p) || !spend(g, 30)) return '집을 얻을 형편이 안 되었다.';
    const places = ['leocast', 'harfen', 'verden', 'ern'].filter((x) => x !== here(g));
    const pl = (p.place ?? 'ern') !== here(g) ? (p.place ?? 'ern') : places[(p.id + mi(g)) % places.length];
    p.place = pl;
    p.affection = clamp((p.affection ?? 0) + 15, -100, 100); p.romance = clamp((p.romance ?? 0) + 10, 0, 100);
    addSecret(g, 'twohome', { pid: p.id, place: pl, upkeep: 3 });
    note(g, `${placeName(pl)}에 ${p.name}의 집을 얻었다.`);
    tired(g, 6);
    return `${placeName(pl)} 변두리에 마당 있는 집을 얻었다. ${J(p.name, '은/는')} 창틀에 꽃을 놓았다. 이 집에서 나는 다른 사람이 된다. 장사 일로 한 달에 한 번 들른다고 집에는 말해 두었다.`;
  },
});

/* ---------- 밤의 얼굴 ---------- */
ACTIONS.push({
  id: 'secret_mask', name: '밤의 얼굴 갖기', icon: 'mask',
  desc: '낮에는 지금 그대로 살고, 밤에는 다른 이름으로 움직인다. 의적, 밀정, 이단. 고르면 되돌리기 어렵다.',
  available: (g) => ready(g) && playerAge(g) >= 16 && !V(g).mask && !sceneQueued(g, 'secret_mask'),
  run(g) { queueScene(g, 'secret_mask', {}); return '밤늦게 혼자 앉아 생각했다. 낮의 나로는 할 수 없는 일들을.'; },
});
const maskOk = (g, k) => (k === 'robin' ? Math.max(g.player.stats.agi, g.player.stats.str) >= 25 : k === 'spy' ? g.player.stats.int >= 25 || here(g) === 'leocast' : true);
defineScene('secret_mask', {
  title: () => '밤의 이름',
  text: (g) => `창밖이 어둡다. 낮에 본 것들이 떠오른다. ${g.player.money < 20 ? '곳간이 빈 집들, 그 옆의 배부른 곳간.' : '배부른 곳간과 빈 곳간이 한 골목에 붙어 있는 꼴.'} 궁정 사람들의 귓속말. 교단이 태워 버린 책. 낮의 내 얼굴로는 아무것도 못 한다. 그렇다면 다른 얼굴이 필요하다.`,
  choices: (g) => (ready(g) && !V(g).mask ? [...Object.entries(MASKS).filter(([k]) => maskOk(g, k)).map(([k, m]) => ({ label: `${m.name}: ${m.desc}`, key: k })), { label: '아무것도 하지 않는다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    if (!MASKS[key]) return '촛불을 껐다. 낮의 얼굴 하나로도 충분히 무겁다.';
    const v = V(g);
    const name = rng.pick(MASKS[key].names);
    v.mask = { kind: key, name, heat: 0, deeds: 0, legend: 0, since: mi(g) };
    addSecret(g, 'mask', { name, maskKind: key });
    log(g, `밤에는 '${name}'${jo(name, '이/가')} 되었다.`);
    if (key === 'robin') return `낡은 외투에 두건을 달았다. 얼굴을 가릴 검은 천도. 첫 밤에는 지붕 위에서 한참을 떨기만 했다. 이름은 내가 붙이지 않았다. 다음 날 장터에서 사람들이 '${name}'${ira(name)}고 불렀다.`;
    if (key === 'spy') return `여관 뒷방에서 사내 하나가 기다리고 있었다. 이름은 묻지 않았다. 나는 '${name}'${jo(name, '으로/로')} 불리게 되었다. 들은 것을 적어 정해진 돌 밑에 두면 은화가 놓여 있다.`;
    return `달 없는 밤, 버려진 방앗간에 일곱 사람이 모였다. 아무도 얼굴을 드러내지 않았다. 나는 '${name}'${ira(name)}는 이름을 받았다. 성광교 사제가 들으면 화형감인 기도를 처음으로 소리 내어 외웠다.`;
  },
});
ACTIONS.push({
  id: 'secret_night', name: '밤일', icon: 'mask',
  desc: '가면을 쓰고 밤에 나간다. 소문은 가면 이름에 붙고, 꼬리는 내게 붙는다.',
  available: (g) => ready(g) && !!V(g).mask && !V(g).mask.hung,
  run(g, rng) {
    const v = V(g), m = v.mask;
    const sec = open(g).find((x) => x.kind === 'mask' && x.gen === 0);
    tired(g, 14);
    m.deeds += 1;
    if (m.kind === 'robin') {
      if (!check(rng, g.player.stats.agi * 0.6 + g.player.stats.sen * 0.3 - m.heat * 0.2, 30)) {
        m.heat = clamp(m.heat + 20, 0, 100); if (sec) sec.risk = clamp(sec.risk + 8, 0, 100);
        g.player.injuries.push({ name: '담장에서 떨어진 다리', months: 2 });
        if (rng.chance(0.35)) reportCrime(g, 'burglary', here(g), { mult: 0.5 });
        return `곳간 담을 넘다 개가 짖었다. 담에서 떨어져 다리를 접질렸다. 횃불이 다가오는 소리를 들으며 개울을 따라 기어서 돌아왔다. '${m.name}'의 밤은 실패했다.`;
      }
      const loot = rng.int(10, 24);
      const give = Math.floor(loot / 2);
      g.player.money += loot - give;
      m.heat = clamp(m.heat + 7, 0, 100); m.legend += 1;
      deed(g, 'generous', 1, null);
      if (m.legend % 3 === 1) g.news.unshift({ text: `'${m.name}'${jo(m.name, '이/가')} 또 왔다 갔다. 곡물상 곳간이 털리고, 과부들 문 앞에 은화가 놓여 있었다고 한다.`, rel: 80 });
      return `곡물상 곳간에서 은화 ${loot}닢을 꺼냈다. ${give}닢은 새벽이 오기 전에 빈 집 문틈마다 나눠 끼웠다. 남은 것은 내 몫이다. 의적도 먹고는 살아야 한다.`;
    }
    if (m.kind === 'spy') {
      const pay = rng.int(6, 12);
      g.player.money += pay;
      m.heat = clamp(m.heat + 6, 0, 100);
      const hs = courtHouses(g);
      if (hs.length && rng.chance(0.5)) {
        const h = rng.pick(hs);
        const c = courtState(g);
        c.secrets.push({ house: h.id, what: rng.pick(['몰래 빚을 진 일', '하인과 낳은 아이', '발하르트와 오간 편지', '세금 장부를 고친 일']), power: rng.int(1, 3), at: mi(g) });
        if (c.secrets.length > 12) c.secrets.shift();
        return `${h.name}의 하인에게 술을 사 주었다. 혀가 풀리자 쓸 만한 이야기가 나왔다. 반은 돌 밑에 두고 은화 ${pay}닢을 받았다. 나머지 반은 내가 쥐고 있기로 했다.`;
      }
      return `여관 벽 너머로 상인들의 이야기를 들었다. 곡물 값, 군량 수레, 영주의 빚. 적어서 돌 밑에 두었다. 다음 날 은화 ${pay}닢이 있었다. 누가 사 가는지는 모른다. 알고 싶지 않다.`;
    }
    const f = faithState(g);
    f.suspicion = clamp((f.suspicion ?? 0) + 3, 0, 100);
    m.heat = clamp(m.heat + 5, 0, 100);
    stress(g, -6);
    gainStat(g, 'int', 0.3);
    if (rng.chance(0.25)) gainStat(g, 'wil', 0.3);
    return rng.pick([
      '방앗간 바닥에 금지된 문양을 그렸다. 일곱 사람이 손을 맞잡았다. 기도가 끝나자 누군가 울었다. 낮에는 그 사람이 성당 종지기라는 걸 나는 안다.',
      '불탄 책에서 베껴 둔 장을 소리 내어 읽었다. 성광교가 가르치는 것과 다른 세상의 처음 이야기다. 맞는지는 모른다. 다만 누가 이걸 태우려 했는지는 안다.',
      '형제 하나가 오지 않았다. 심문소에 끌려갔다는 말이 돌았다. 그날 밤 기도는 짧았다. 다들 문 쪽을 몇 번이고 돌아보았다.',
    ]);
  },
});
ACTIONS.push({
  id: 'secret_unmask', name: '가면 내려놓기', icon: 'rest',
  desc: '밤의 얼굴을 접는다. 지난 일은 사라지지 않지만, 더 쌓이지는 않는다.',
  available: (g) => ready(g) && !!V(g).mask && !V(g).mask.hung && V(g).mask.deeds >= 1,
  run(g) {
    const m = V(g).mask;
    m.hung = true;
    log(g, `'${m.name}'의 가면을 내려놓았다.`);
    return m.kind === 'robin' ? `두건을 상자 밑바닥에 넣었다. 장터에서는 한동안 '${m.name}'${jo(m.name, '이/가')} 죽었다는 말과 붙잡혔다는 말이 번갈아 돌았다.` : m.kind === 'spy' ? '돌 밑에 마지막 쪽지를 두었다. "이제 그만." 다음 날 돌 밑에는 아무것도 없었다. 그게 대답이었다.' : '방앗간에 더는 가지 않았다. 형제들은 찾지 않았다. 찾지 않는 것이 그들의 예의다.';
  },
});

/* ---------- 아는 사람과 입막음 ---------- */
defineScene('secret_knower', {
  title: () => '아는 사람',
  text: (g, s) => {
    const p = byId(g, s.pid);
    const sec = V(g).list.find((x) => x.id === s.sid);
    return `${J(p?.name ?? '누군가', '이/가')} 사람 없는 골목에서 나를 불러 세웠다. "${labelOf(g, sec ?? { kind: 'mask' }).replace(/^선대가 |^선대의 /, '')}. 나는 알고 있소." 잠시 뜸을 들였다. "${s.greedy ? '입이 근질거려서 말이오. 은화라도 좀 있으면 덜 근질거릴 텐데.' : '걱정 마시오. 그냥 알고 있다는 것만 알려 두려고.'}"`;
  },
  choices: (g, s) => {
    const p = byId(g, s.pid);
    const sec = V(g).list.find((x) => x.id === s.sid);
    if (!alive(p) || !sec || sec.out || !ready(g) || (p.place ?? 'ern') !== here(g)) return [];
    return [
      canSpend(g, 12) ? { label: '은화 열두 닢으로 입을 막는다', key: 'pay' } : null,
      { label: '입을 열면 가만두지 않겠다고 한다', key: 'threat' },
      { label: '사정을 털어놓고 지켜 달라고 한다', key: 'plead' },
      playerAge(g) >= 18 ? { label: '영원히 입을 막는다', key: 'kill' } : null,
    ].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    const p = byId(g, s.pid);
    const sec = v.list.find((x) => x.id === s.sid);
    if (!alive(p) || !sec || sec.out) return '그 사람은 이미 이 고장에 없었다.';
    const drop = () => { sec.knowers = sec.knowers.filter((id) => id !== p.id); };
    if (key === 'pay') {
      if (!spend(g, 12)) return '줄 돈이 없었다.';
      sec.risk = clamp(sec.risk - 6, 0, 100);
      if (s.greedy) { sec.paid = (sec.paid ?? 0) + 1; return `은화를 받아 넣으며 ${J(p.name, '은/는')} 웃었다. "다음 달에도 이 골목은 조용하겠지." 다음 달에도, 그다음 달에도.`; }
      drop(); p.affection = clamp((p.affection ?? 0) + 5, -100, 100);
      return `${J(p.name, '은/는')} 은화를 밀어냈다가, 내가 다시 쥐여 주자 받았다. "받는 게 서로 편하겠지." 그 뒤로 그 일은 입에 올리지 않았다.`;
    }
    if (key === 'threat') {
      if (check(rng, g.player.stats.str * 0.5 + g.player.stats.cha * 0.3 + (L(g).notoriety ?? 0) * 0.3, 40)) {
        drop(); p.affection = clamp((p.affection ?? 0) - 25, -100, 100); addGrudge(g, p, 15, '협박했다');
        if (rng.chance(0.2)) reportCrime(g, 'extortion', here(g), { mult: 0.4 });
        return `멱살을 잡고 벽에 붙였다. 아무 말도 하지 않았다. 그럴 필요가 없었다. ${J(p.name, '은/는')} 그 뒤로 나를 보면 길을 건넜다.`;
      }
      sec.risk = clamp(sec.risk + 25, 0, 100); p.affection = clamp((p.affection ?? 0) - 30, -100, 100); addGrudge(g, p, 20, '협박했다');
      return `"그렇게 나오시겠다?" ${J(p.name, '은/는')} 물러서지 않았다. 다음 날부터 장터 사람들이 나를 보는 눈이 달라졌다.`;
    }
    if (key === 'plead') {
      if ((p.affection ?? 0) >= 35 || check(rng, g.player.stats.cha * 0.6 + (p.affection ?? 0) * 0.4, 45)) {
        drop(); p.affection = clamp((p.affection ?? 0) + 10, -100, 100); remember(g, p, '내 비밀을 지켜 주기로 했다', 2, { tag: 'secret' });
        return `다 털어놓았다. ${J(p.name, '은/는')} 끝까지 들었다. "누구나 묻어 둔 게 있지. 내 것도 언젠가 말해 주겠소." 비밀을 아는 사람이 하나 늘었고, 벗이 하나 늘었다.`;
      }
      sec.risk = clamp(sec.risk + 12, 0, 100);
      return `털어놓았다. ${J(p.name, '은/는')} 고개를 끄덕였지만 눈이 반짝였다. 말은 팔리는 물건이다. 나는 방금 그걸 공짜로 건넸다.`;
    }
    // 영원히 입을 막는다
    kill(g, p, '물에 빠져 죽은 채 발견됨');
    v.silenced += 1;
    drop();
    sec.risk = clamp(sec.risk - 15, 0, 100);
    stress(g, 15);
    deed(g, 'kind', -3, null, here(g), { lie: false });
    if (!check(rng, g.player.stats.agi * 0.4 + g.player.stats.int * 0.4, 35)) { reportCrime(g, 'murder', here(g), { mult: 0.5 }); return `며칠 뒤 ${p.name}의 몸이 둑 아래에서 떠올랐다. 경비대가 마지막으로 그 사람과 이야기한 사람을 찾고 있다. 내 이름이 나왔다.`; }
    return `며칠 뒤 ${p.name}의 몸이 둑 아래에서 떠올랐다. 술에 취해 발을 헛디뎠다고들 했다. 장례에 갔다. 과부가 내 손을 잡고 와 줘서 고맙다고 했다.`;
  },
});

/* ---------- 들통 ---------- */
const EXPOSE_TEXT = {
  bastard: (g, s, who) => `${who}의 입에서 시작된 말이 온 고장을 돌았다. ${placeName(s.place)}에 내 피를 받은 아이가 있다고.${me(g).spouseId ? ' 집에 돌아오니 배우자가 식탁 앞에 앉아 기다리고 있었다.' : ''}`,
  alias: (g, s, who) => `장터에서 누가 내 진짜 이름을 불렀다. 돌아보니 ${who}였다. "그 얼굴을 내가 모를까." 주위 사람들이 나와 그 사람을 번갈아 보았다. ${s.name}${jo(s.name, '은/는')} 오늘로 끝이다.`,
  twohome: (g, s, who) => `${placeName(s.place)}의 그 집 앞에 ${who}${jo(who, '이/가')} 서 있었다. 배우자가 보낸 사람이었다. 다음 날 배우자가 직접 왔다.`,
  mask: (g, s, who) => `${who}${jo(who, '이/가')} 경비대에 말했다. '${s.name}'의 두건을 쓰고 나가는 사람을 보았다고. 그 사람이 누구인지도.`,
};
defineScene('secret_exposed', {
  title: () => '들통',
  text: (g, s) => { const sec = V(g).list.find((x) => x.id === s.sid); return sec ? EXPOSE_TEXT[sec.kind](g, sec, s.who) : '묻어 둔 일이 드러났다.'; },
  choices: (g, s) => {
    const sec = V(g).list.find((x) => x.id === s.sid);
    if (!sec || sec.out || !ready(g)) return [];
    return [{ label: '다 털어놓는다', key: 'admit' }, { label: '끝까지 잡아뗀다', key: 'deny' }];
  },
  resolve(g, rng, s, key) {
    const sec = V(g).list.find((x) => x.id === s.sid);
    if (!sec || sec.out) return '그 일은 이미 지난 일이 되었다.';
    if (key === 'deny' && check(rng, g.player.stats.cha * 0.5 + g.player.stats.int * 0.3 - sec.risk * 0.2, 40)) {
      sec.risk = clamp(sec.risk * 0.5, 0, 100);
      sec.knowers = [];
      deed(g, 'honest', -1, null);
      return '얼굴빛 하나 바꾸지 않고 아니라고 했다. 증거는 말뿐이었다. 사람들은 반쯤 믿었다. 반쯤은 영영 믿지 않을 것이다.';
    }
    return expose(g, rng, sec, key === 'admit');
  },
});
function expose(g, rng, sec, admitted) {
  const v = V(g);
  sec.out = true; sec.how = admitted ? 'admit' : 'caught';
  v.exposed += 1;
  const meP = me(g);
  const sp = byId(g, meP.spouseId);
  const ls = loveState(g).spouse;
  const hurt = (n) => { if (ls && alive(sp)) { ls.mood = clamp((ls.mood ?? 50) - n, 0, 100); ls.cheated = true; } };
  stress(g, admitted ? 10 : 18);
  log(g, `${labelOf(g, sec)}. 들통났다.`);
  if (sec.kind === 'bastard') {
    hurt(admitted ? 25 : 40);
    deed(g, 'honest', admitted ? -1 : -4, '숨겨 둔 자식이 있었다더라');
    const kid = byId(g, sec.pid);
    if (admitted && alive(kid)) { acknowledge(g, kid, sec); sec.how = 'admit'; }
    chron(g, `${g.player.name}에게 숨겨 둔 자식이 있었음이 드러나다.`, 40);
    if (alive(sp) && !admitted && ls && ls.mood < 15 && rng.chance(0.5)) { const d = divorce(g, 'secret'); return `잡아뗄수록 말은 커졌다. 배우자가 짐을 쌌다. 갈라서는 데 말은 필요 없었다.${d?.half ? ` 은화 ${d.half}닢이 함께 나갔다.` : ''}`; }
    return admitted ? '다 말했다. 아이 이름도, 그 사람 이름도. 말하고 나니 십 년 묵은 체증이 내려갔다. 대신 집 안 공기가 무거워졌다.' : '아니라고 했다. 아무도 믿지 않았다. 아이 얼굴이 대답을 대신했다.';
  }
  if (sec.kind === 'alias') {
    const a = v.alias;
    L(g).notoriety = Math.max(L(g).notoriety ?? 0, a?.noto ?? 0);
    deed(g, 'honest', admitted ? -3 : -6, '이름을 속이고 살았다더라');
    if (a?.cover === 'noble') { const c = courtState(g); c.standing = Math.max(0, (c.standing ?? 0) - 8); }
    v.alias = null;
    chron(g, `${g.player.name}, ${J(a?.name ?? '다른 이름', '으로/로')} 살아온 것이 드러나다.`, 40);
    return admitted ? `"내 이름은 ${g.player.name}${jo(g.player.name, '이/가') === '이' ? '이오' : '요'}." 소리 내어 말하니 이상하게 낯설었다. 몇 사람은 등을 돌렸고, 몇 사람은 남았다. 남은 사람이 진짜다.` : '아니라고 했다. 그날 밤 대서소 늙은이가 경비대에 불려 갔다는 소식이 들렸다. 늙은이는 오래 버티지 못할 것이다.';
  }
  if (sec.kind === 'twohome') {
    hurt(admitted ? 35 : 50);
    deed(g, 'loyal', -4, '두 집 살림을 했다더라');
    const p = byId(g, sec.pid);
    if (alive(p)) remember(g, p, '두 집 살림이 들통났다', -1, { tag: 'secret' });
    const lv = loveState(g);
    if (alive(sp) && ls && (ls.mood < 20 || !admitted) && rng.chance(0.55)) {
      if (lv.affair) lv.affair = null;
      const d = divorce(g, 'secret');
      return `배우자는 소리를 지르지 않았다. 반지를 빼서 식탁에 놓았을 뿐이다.${d?.half ? ` 재산이 나뉘었다. 은화 ${d.half}닢.` : ''} 그 집도, 이 집도 이제 반쪽이다.`;
    }
    return admitted ? '무릎을 꿇었다. 배우자는 한참 말이 없다가 그 집 열쇠를 내놓으라고 했다. 열쇠를 건넸다. 그 집에 남은 사람에게는 아직 아무 말도 못 했다.' : '끝까지 아니라고 했다. 배우자는 더 묻지 않았다. 더 묻지 않는다는 것이 무엇보다 무서웠다.';
  }
  // 밤의 얼굴
  const m = v.mask;
  const kind = sec.maskKind ?? m?.kind;
  if (kind === 'robin') reportCrime(g, 'burglary', here(g), { mult: admitted ? 1.2 : 1.8 });
  else if (kind === 'spy') { reportCrime(g, 'resist', here(g), { mult: admitted ? 0.6 : 1 }); const c = courtState(g); c.disgrace = Math.max(c.disgrace ?? 0, mi(g) + 36); c.standing = Math.max(0, (c.standing ?? 0) - 10); }
  else { const f = faithState(g); f.suspicion = clamp((f.suspicion ?? 0) + (admitted ? 30 : 45), 0, 100); }
  if (kind === 'robin') deed(g, 'generous', 3, `'${sec.name}'의 정체였다더라`);
  else deed(g, 'loyal', -3, `'${sec.name}'의 정체였다더라`);
  if (m && m.name === sec.name) v.mask = null;
  chron(g, `${g.player.name}, '${sec.name}'의 정체로 드러나다.`, 50);
  return kind === 'robin' ? `'${sec.name}'의 정체가 퍼졌다. 경비대가 나를 찾는다. 그날 밤 내 집 문틈에 누가 은화 한 닢을 끼워 두고 갔다.` : kind === 'spy' ? '궁정에서 내 이름이 지워졌다. 누구에게 무엇을 팔았는지 묻는 사람들이 찾아올 것이다.' : '성당 종이 울렸다. 이단심문소가 내 이름을 장부에 적었다는 소식이 먼저 왔다.';
}

/* ---------- 집안 비밀: 선대가 묻은 것 ---------- */
defineScene('secret_halfsib', {
  title: () => '배다른 피',
  text: (g, s) => { const p = byId(g, s.pid); return `낯선 ${p?.sex === 'm' ? '사내' : '여인'} 하나가 찾아왔다. 품에서 낡은 은반지를 꺼냈다. 선대의 반지다. "${s.parent}${jo(s.parent, '은/는')} 내 ${s.parentSex === 'f' ? '어머니' : '아버지'}이기도 하오." 장례 때 무덤가 멀찍이 서 있던 얼굴이다.`; },
  choices: (g, s) => (alive(byId(g, s.pid)) && ready(g) ? [{ label: '형제로 받아들인다', key: 'own' }, canSpend(g, 15) ? { label: '은화 열다섯 닢을 주고 조용히 돌려보낸다', key: 'pay' } : null, { label: '거짓말이라고 내쫓는다', key: 'no' }].filter(Boolean) : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid);
    const sec = V(g).list.find((x) => x.id === s.sid);
    if (!alive(p)) return '그 사람은 이미 떠났다.';
    if (sec) { sec.met = true; }
    if (key === 'own') {
      if (!g.player.familyIds.includes(p.id)) g.player.familyIds.push(p.id);
      p.affection = clamp((p.affection ?? 0) + 25, -100, 100);
      remember(g, p, '배다른 형제로 받아 주었다', 3, { tag: 'secret' });
      if (sec) { sec.out = true; sec.how = 'own'; }
      chron(g, `${g.player.name}, 선대가 숨겨 둔 자식 ${J(p.name, '을/를')} 형제로 받아들이다.`, 50);
      return `${J(p.name, '은/는')} 반지를 내게 돌려주려 했다. 받지 않았다. "그건 당신 몫이오." 선대의 무덤에 둘이 함께 갔다. 둘 다 무덤에 대고 할 말이 많았다.`;
    }
    if (key === 'pay') { spend(g, 15); p.affection = clamp((p.affection ?? 0) - 5, -100, 100); if (sec) sec.risk = clamp(sec.risk + 5, 0, 100); return '은화를 받고 반지는 도로 품에 넣었다. "이건 내가 갖겠소. 당신 집안이 준 건 이것뿐이니까."'; }
    p.affection = clamp((p.affection ?? 0) - 40, -100, 100);
    addGrudge(g, p, 25, '형제임을 부정했다');
    if (sec) sec.risk = clamp(sec.risk + 20, 0, 100);
    return '문을 닫았다. 문 너머에서 웃음소리가 났다. 선대가 웃던 소리와 똑같았다.';
  },
});
defineScene('secret_legacy', {
  title: () => '상자 밑바닥',
  text: (g, s) => s.what === 'mask'
    ? `선대의 옷궤를 정리하다 밑바닥에서 접힌 천을 찾았다. 두건이다. 안쪽에 '${s.name}'${ira(s.name)}고 수놓여 있다. 어릴 때 장터에서 듣던 그 이름이다. 선대는 밤마다 어디를 다녔던 걸까.`
    : `선대의 옷궤 밑바닥에서 끈으로 묶은 증서가 나왔다. 다른 이름, 다른 출신. ${s.name}. 선대는 평생 그 이름으로 불렸다. 집안 사람 중 누구도 진짜 이름을 몰랐다.`,
  choices: (g, s) => (ready(g) ? [
    s.what === 'mask' && !V(g).mask && playerAge(g) >= 16 ? { label: '두건을 쓴다', key: 'take' } : null,
    { label: '태워 버린다', key: 'burn' },
    { label: '편지 묶음 사이에 간직한다', key: 'keep' },
  ].filter(Boolean) : []),
  resolve(g, rng, s, key) {
    const v = V(g);
    const sec = v.list.find((x) => x.id === s.sid);
    if (key === 'take') {
      v.mask = { kind: s.maskKind ?? 'robin', name: s.name, heat: 10, deeds: 0, legend: 0, since: mi(g), heir: true };
      if (sec) sec.out = true;
      addSecret(g, 'mask', { name: s.name, maskKind: s.maskKind ?? 'robin', risk: 15 });
      log(g, `선대의 가면 '${s.name}'${jo(s.name, '을/를')} 이어 썼다.`);
      return `두건을 썼다. 꼭 맞았다. 그날 밤 장터에서는 '${s.name}'${jo(s.name, '이/가')} 돌아왔다는 말이 돌았다. 늙은이들이 고개를 저었다. "그럴 리가. 그 사람이면 지금 일흔은 넘었을걸."`;
    }
    if (key === 'burn') { if (sec) { sec.out = true; sec.how = 'burn'; } return '불에 넣었다. 금방 탔다. 선대가 평생 지고 다닌 것이 이렇게 가벼웠나 싶었다.'; }
    lettersState(g).kept.push({ from: s.parent ?? '선대', y: g.date.year, line: s.what === 'mask' ? `'${s.name}'의 두건` : `선대의 다른 이름 ${s.name}`, love: false });
    if (sec) sec.risk = clamp(sec.risk + 5, 0, 100);
    return '편지 묶음 사이에 끼워 두었다. 언젠가 내 자식도 이걸 찾을 것이다. 그때는 내가 설명해 줄 수 있을까.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  v.born ??= here(g);
  const r = ownRng(g, 5);
  const now = mi(g);
  // 1) 비밀마다 위험이 자라고, 아는 사람이 생기고, 돈이 나간다
  for (const s of open(g)) {
    const p = s.pid != null ? byId(g, s.pid) : null;
    if ((s.kind === 'bastard' || s.kind === 'twohome') && (!p || !p.alive)) { s.out = true; s.how = 'dead'; continue; }
    s.knowers = s.knowers.filter((id) => alive(byId(g, id)));
    let grow = KINDS[s.kind].base * (s.gen ? 0.3 : 1) + s.knowers.length * 0.25;
    if (s.kind === 'mask' && v.mask && v.mask.name === s.name && !v.mask.hung) grow += v.mask.heat / 40;
    if (s.kind === 'alias' && here(g) !== s.place) grow *= 0.4;
    if (s.kind === 'bastard' && p && (p.place ?? 'ern') === here(g)) grow += 0.4;
    if (s.upkeep && (s.kind === 'twohome' || (p && ageYears(p) < 15))) {
      if (g.player.money >= s.upkeep) g.player.money -= s.upkeep;
      else { grow += 3; const o = byId(g, s.other ?? s.pid); if (alive(o)) o.affection = clamp((o.affection ?? 0) - 3, -100, 100); }
    }
    if (s.paid && r.chance(0.25)) { const k = byId(g, s.knowers[0]); if (alive(k) && g.player.money >= 4) { g.player.money -= 4; k.wealth = (k.wealth ?? 0) + 4; } }
    s.risk = clamp(s.risk + grow - (s.gen ? 0.2 : 0.1), 0, 100);
    if (r.chance(0.015 + s.risk / 2500)) {
      const cand = g.people.filter((x) => alive(x) && x.known && !x.away && (x.place ?? 'ern') === here(g) && !s.knowers.includes(x.id) && x.id !== s.pid && x.id !== me(g).spouseId && ageYears(x) >= 15);
      if (cand.length) { const k = r.pick(cand); s.knowers.push(k.id); s.risk = clamp(s.risk + 4, 0, 100); }
    }
  }
  // 2) 가면의 열기는 식는다
  if (v.mask) v.mask.heat = Math.max(0, v.mask.heat - (v.mask.hung ? 3 : 1.2));
  // 3) 두 집 살림: 그 사람이 더는 연인이 아니면 끝난다
  const th = secretOf(g, 'twohome');
  if (th) {
    const af = loveState(g).affair;
    if (!me(g).spouseId || !af || af.id !== th.pid) { th.out = true; th.how = 'ended'; log(g, `${placeName(th.place)}의 그 집을 정리했다.`); }
    else stress(g, -1);
  }
  // 4) 숨겨 둔 아이가 생긴다
  if (ready(g) && !sceneQueued(g, 'secret_bastard')) {
    const p = secretPartner(g);
    const recent = v.list.some((s) => s.kind === 'bastard' && s.other === p?.id && now - s.since < 24);
    if (p && fertile(g, p) && !recent && r.chance(0.01)) { v.sceneAt = now; queueScene(g, 'secret_bastard', { pid: p.id }); return; }
  }
  // 5) 장면
  if (!ready(g)) return;
  if (L(g).queue.some((x) => /^secret_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 4) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  for (const s of open(g)) {
    if (s.risk >= 30 && r.chance((s.risk - 25) / 900)) {
      const k = knowerList(g, s)[0];
      return fire('secret_exposed', { sid: s.id, who: k?.name ?? r.pick(['이웃 하나', '술집 주인', '옛 동무', '떠돌이 행상']) });
    }
  }
  for (const s of open(g)) {
    const ks = knowerList(g, s).filter((p) => (p.place ?? 'ern') === here(g));
    if (ks.length && r.chance(0.05)) { const p = r.pick(ks); return fire('secret_knower', { sid: s.id, pid: p.id, greedy: has(p, 'greedy') || (p.affection ?? 0) < 10 }); }
  }
  for (const s of open(g)) {
    const p = byId(g, s.pid);
    if (s.kind !== 'bastard' || s.met || !alive(p) || ageYears(p) < 15) continue;
    if (s.gen === 0 && r.chance(0.04)) { s.met = true; p.place = here(g); return fire('secret_child', { sid: s.id, pid: p.id, otherName: s.otherName }); }
    if (s.gen > 0 && r.chance(0.03)) { s.met = true; p.place = here(g); return fire('secret_halfsib', { sid: s.id, pid: p.id, parent: s.parent ?? '선대', parentSex: s.parentSex ?? 'm' }); }
  }
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = V(g);
  const lifeR = L(g).ancestors?.[L(g).ancestors.length - 1];
  const parent = lifeR?.name ?? old?.name ?? '선대';
  const parentSex = old?.sex ?? 'm';
  let legacy = null;
  for (const s of open(g)) {
    // 이제 내 자식이 된 아이의 비밀은 닫힌다
    if (s.kind === 'bastard' && s.pid === g.player.id) { s.out = true; s.how = 'heir'; continue; }
    if (s.kind === 'twohome') { s.out = true; s.how = 'heir'; continue; }
    if (s.gen === 0) { s.parent = parent; s.parentSex = parentSex; }
    s.gen += 1; s.risk = Math.round(s.risk * 0.3);
    if (s.gen > 2) { s.out = true; s.how = 'forgotten'; continue; }
    if (!legacy && (s.kind === 'mask' || s.kind === 'alias') && s.gen === 1) legacy = s;
  }
  if (v.mask && !legacy) {
    const s = addSecret(g, 'mask', { name: v.mask.name, maskKind: v.mask.kind, gen: 1, parent, parentSex });
    legacy = s;
  }
  v.mask = null; v.alias = null; v.sceneAt = 0;
  v.born = here(g);
  if (legacy) queueScene(g, 'secret_legacy', { sid: legacy.id, what: legacy.kind, name: legacy.name, maskKind: legacy.maskKind, parent });
});
HOOKS.newGame.push((g) => { V(g).born = L(g).place ?? 'ern'; });
HOOKS.migrate.push((g) => { V(g); });
