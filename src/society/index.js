// 36단계: 도시의 사교계. 상태는 g.society 하나, 화면 연결점은 societyLines(g) / societyLine(g) / societyInfo(g) / societyAccess(g).
// 도시마다 연회를 여는 집이 있다: 옛 가문(history 귀족 집안), 신흥 부자(newage의 돈 번 집안, 없으면 상단 집안), 재주 있는 사람들이 모이는 살롱.
// - 사교 철: 겨울(11~2월). 이때 연회가 몰리고 초대장이 돈다. 살롱은 철이 아니어도 가끔 모인다.
// - 드나들 길(societyAccess): 피(작위·영지·옛 기사 집안·백작가 서자·궁정 관직)면 어디든, 돈이면 신흥 부자의 잔치와 살롱,
//   재주(작가로서의 이름·글과 말솜씨·이름값)면 소개해 주는 사람(so_sponsor)을 얻어 살롱부터. 체면(ton)이 쌓이면 문턱 높은 집도 열린다.
// - 체면과 옷차림: 연회 옷(cloth의 지어 입은 옷이거나 새로 맞춘 옷)이 없으면 문턱 높은 집에서 망신을 살 수 있다.
// - 연회에서 생기는 일(so_party): 말솜씨, 무도, 귓속말(추문을 퍼뜨릴까), 혼담, 예술 후원, 무시당함, 카드놀이.
// - 망신과 추문(so_scandal): 몰래 만나는 사람(love.affair), 악명, 실각이 사교계에 돈다. 초대장이 끊기기도 한다.
// - 내가 여는 연회(so_host), 소개해 준 사람의 부탁(so_favor).
// - 플레이어 없이도: 사교 철마다 도시의 연회가 열리고 NPC 사교계 인물들 사이에 평판이 돌고, 추문이 터지고, 옛 가문과 신흥 부자가 혼담을 맺는다.
// 잇는 곳: court(체면이 궁정 이름에 조금, 실각하면 옛 가문 문이 닫힘), repute(deed), arts(후원자), love(혼담 → 정혼), newage(신흥 부자 집안), cloth(연회 옷).
// 새 행동은 없다. 게임 난수는 건드리지 않는다(ownRng).
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat, gainSkill } from '../game.js';
import { byId, ageYears, makePerson, fullName } from '../npc.js';
import { MALE_NAMES, FEMALE_NAMES } from '../data.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, traveling, note, chron, stress, spend, canSpend, check } from '../adventure/core.js';
import { rel } from '../relations.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { courtState, disgraced } from '../court/index.js';
import { liveHouses, houseName } from '../history/nobles.js';
import { artsState, worksOf } from '../arts/index.js';
import { loveState } from '../love/index.js';
import { clothState } from '../cloth/index.js';
import { makeRng } from '../rng.js';
import * as T from './lines.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 도시';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 419) ^ Math.imul(mi(g) * 181 + salt + 73, 2654435761)) | 0 });
export const CITIES = ['leocast', 'harfen', 'verden', 'serenia', 'solaris', 'eisen', 'portel', 'barka'].filter((c) => PLACES[c]);
const isSeason = (g) => [11, 12, 1, 2].includes(g.date.month);
const free = (g) => playerAge(g) >= 16 && !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.campaign && !g.army?.captive && !L(g).heirPending;

/* ---------- 상태 ---------- */
export function societyState(g) {
  g.society ??= {};
  const s = g.society;
  s.hosts ??= [];    // [{ id, kind: old|new|salon, name, place, prestige, ref, who(여는 사람 이름), sex }]
  s.figures ??= [];  // NPC 사교계 인물 [{ id, name, sex, place, host, rep, scandal: null|{ what, y } }]
  s.talk ??= [];     // 최근 사교계 소문 [{ y, m, place, text }]
  s.matches ??= [];  // NPC끼리 맺은 혼담 [{ y, a, b, place }]
  s.me ??= {};
  const m = s.me;
  m.ton ??= 0;       // 사교계에서의 체면 0~100
  m.ties ??= {};     // host id → 그 집과의 사이 -100~100
  m.sponsor ??= null; // { host, name, at, asked }
  m.dressAt ??= -99; // 연회 옷을 맞춘 달
  m.went ??= 0;      // 이번 철에 간 연회
  m.shut ??= 0;      // 이 달까지 초대장이 끊김
  m.done ??= {};
  m.hosted ??= 0;
  s.month ??= [];
  s.used ??= [];
  s.log ??= [];
  s.seq ??= 1;
  s.sceneAt ??= -99;
  s.builtAt ??= -99;
  s.gen ??= 0;
  return s;
}
const S = societyState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, text }); }
function talk(g, place, text) { const s = S(g); s.talk.push({ y: g.date.year, m: g.date.month, place, text }); if (s.talk.length > 16) s.talk.shift(); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 20) s.used.shift();
  return pool[i];
}
const venue = (h) => (h.kind === 'salon' ? h.name : `${h.name} 연회`);
const lady = (name) => (name.endsWith('의 살롱') ? name.slice(0, -4) : `${name}의 안주인`);
const hostById = (g, id) => S(g).hosts.find((h) => h.id === id) ?? null;
const hostsAt = (g, pl) => S(g).hosts.filter((h) => h.place === pl);
const figsAt = (g, pl) => S(g).figures.filter((f) => f.place === pl);
export const tonWord = (v) => (v >= 80 ? '사교계가 이름을 먼저 안다' : v >= 60 ? '어느 연회에 가도 반긴다' : v >= 40 ? '초대장이 꽤 온다' : v >= 20 ? '얼굴을 아는 사람이 생겼다' : v > 0 ? '문간에서 이름을 다시 묻는다' : '아무도 모른다');
const prestigeWord = (v) => (v >= 75 ? '온 도시가 초대장을 바란다' : v >= 50 ? '이름난 집' : v >= 25 ? '그럭저럭 사람이 모인다' : '발길이 줄었다');
const repWord = (v) => (v >= 75 ? '사교계의 꽃' : v >= 50 ? '어디서나 반긴다' : v >= 25 ? '얼굴이 알려졌다' : '뒷말이 많다');
const tieWord = (v) => (v >= 40 ? '단골손님' : v >= 15 ? '가끔 부른다' : v <= -20 ? '문이 닫혔다' : '아직 낯설다');

/* ---------- 드나들 길 ---------- */
const nobleOf = (g) => !!g.player.title || !!g.domain || ['fallen_knight', 'count_bastard'].includes(g.player.familyId) || (courtState(g).office ?? -1) >= 0;
const richOf = (g) => g.player.money + (L(g).home === 'family' ? g.player.familyMoney ?? 0 : 0) >= 400;
const talentOf = (g) => (artsState(g).fame ?? 0) >= 25 || ((g.player.skills.letters ?? 0) >= 35 && g.player.stats.cha >= 35) || (L(g).renown ?? 0) >= 35;
const dressed = (g) => clothState(g).wear?.kind === 'fine' || mi(g) - S(g).me.dressAt <= 24;
/** 어느 집의 문이 열렸나. kinds가 비면 드나들 수 없다 */
export function openKinds(g) {
  const m = S(g).me;
  if (playerAge(g) < 16) return [];
  const k = new Set();
  if (nobleOf(g)) { k.add('old'); k.add('new'); k.add('salon'); }
  if (richOf(g)) { k.add('new'); k.add('salon'); }
  if (talentOf(g) && m.sponsor) k.add('salon');
  if (m.ton >= 40 && (richOf(g) || talentOf(g) || m.sponsor)) k.add('new');
  if (m.ton >= 65) k.add('old');
  if (disgraced(g)) k.delete('old');
  return [...k];
}
export function societyAccess(g) {
  if (playerAge(g) < 16) return '어른이 되어야 한다';
  if (openKinds(g).length) return null;
  if (talentOf(g)) return '소개해 줄 사람이 있어야 한다';
  return '작위나 옛 집안, 은화 400닢, 아니면 이름난 재주(글·말솜씨·작품)';
}

/* ---------- 도시의 연회 집과 사람들 (플레이어 없이도) ---------- */
function build(g, rng) {
  const s = S(g);
  const houses = liveHouses(g);
  const rich = (g.newage?.rich ?? []).filter((x) => !x.gone);
  // 무너진 옛 가문, 기운 신흥 부자는 연회를 닫는다
  for (const h of s.hosts) {
    if (h.kind === 'old' && h.ref != null && !houses.some((x) => x.id === h.ref)) h.closed = true;
    if (h.kind === 'new' && h.ref != null && typeof h.ref === 'number' && !rich.some((x) => x.id === h.ref)) h.closed = h.closed || rng.chance(0.5);
  }
  s.hosts = s.hosts.filter((h) => !h.closed || mi(g) - (h.closedAt ??= mi(g)) < 24);
  for (const pl of CITIES) {
    const at = hostsAt(g, pl).filter((h) => !h.closed);
    const want = { old: 1, new: 1, salon: 1 };
    for (const kind of ['old', 'new', 'salon']) {
      if (at.some((h) => h.kind === kind)) continue;
      if (want[kind] && rng.chance(kind === 'old' ? 0.8 : 0.6)) {
        let name; let ref = null;
        if (kind === 'old') {
          const h = houses.find((x) => x.seat === pl && !s.hosts.some((y) => y.ref === x.id));
          if (h) { name = houseName(h); ref = h.id; } else name = `${rng.pick(T.OLD_NAMES.filter((n) => !s.hosts.some((y) => y.name.startsWith(n))))} 가문`;
        } else if (kind === 'new') {
          const r = rich.find((x) => x.place === pl && !s.hosts.some((y) => y.ref === x.id));
          if (r) { name = r.name; ref = r.id; } else name = `${rng.pick(T.NEW_NAMES.filter((n) => !s.hosts.some((y) => y.name.startsWith(n))))} 집안`;
        } else {
          name = `${rng.pick(FEMALE_NAMES)} 부인의 살롱`;
        }
        if (!name || name.startsWith('undefined')) continue;
        s.hosts.push({ id: s.seq++, kind, name, place: pl, prestige: rng.int(30, 70), ref, closed: false });
      }
    }
    // 사교계 사람들
    const figs = figsAt(g, pl);
    for (let i = figs.length; i < 5; i++) {
      const sex = rng.chance(0.5) ? 'm' : 'f';
      const hs = hostsAt(g, pl).filter((h) => !h.closed);
      const used = new Set(s.figures.map((f) => f.name));
      const name = rng.pick((sex === 'm' ? MALE_NAMES : FEMALE_NAMES).filter((n) => !used.has(n))) ?? rng.pick(sex === 'm' ? MALE_NAMES : FEMALE_NAMES);
      s.figures.push({ id: s.seq++, name, sex, place: pl, host: hs.length ? rng.pick(hs).id : null, rep: rng.int(25, 70), scandal: null, since: mi(g) });
    }
  }
  // 오래된 사람은 떠난다 (사교계도 대가 바뀐다)
  s.figures = s.figures.filter((f) => mi(g) - f.since < 12 * 30 || rng.chance(0.9));
  if (s.figures.length > 60) s.figures.splice(0, s.figures.length - 60);
  s.builtAt = mi(g);
}
function worldTick(g, rng) {
  const s = S(g);
  if (mi(g) - s.builtAt >= 12 || !s.hosts.length) build(g, rng);
  if (!isSeason(g)) {
    for (const f of s.figures) f.rep = clamp(f.rep + (50 - f.rep) * 0.01, 0, 100);
    return;
  }
  for (const pl of CITIES) {
    if (!rng.chance(0.35)) continue;
    const hs = hostsAt(g, pl).filter((h) => !h.closed); const fs = figsAt(g, pl);
    if (!hs.length || fs.length < 2) continue;
    const h = rng.pick(hs);
    const [a, b] = [rng.pick(fs), rng.pick(fs.length > 1 ? fs : fs)];
    if (a === b) continue;
    const c = { a: a.name, b: b.name, host: venue(h), place: placeName(pl) };
    const near = here(g) === pl;
    const r = rng.next();
    if (r < 0.1) {
      const what = rng.pick(['debt', 'affair', 'duel', 'broken', 'drunk']);
      a.rep = clamp(a.rep - rng.int(15, 30), 0, 100); a.scandal = { what, y: g.date.year };
      h.prestige = clamp(h.prestige - (what === 'drunk' || what === 'duel' ? 6 : 2), 0, 100);
      const text = T.SCANDAL[what](c);
      talk(g, pl, text);
      if (near || rng.chance(0.15)) line(g, 'scandal', near ? text : `${placeName(pl)}에서 온 사람이 전하길, ${text}`);
    } else if (r < 0.16) {
      const old = hs.find((x) => x.kind === 'old'); const nw = hs.find((x) => x.kind === 'new');
      if (old && nw) {
        s.matches.push({ y: g.date.year, a: old.name, b: nw.name, place: pl }); if (s.matches.length > 12) s.matches.shift();
        old.prestige = clamp(old.prestige - 2, 0, 100); nw.prestige = clamp(nw.prestige + 5, 0, 100);
        const text = pickFresh(g, rng, 'mt', T.MATCH)({ a: old.name, b: nw.name, host: h === old || h === nw ? '어느 연회' : venue(h) });
        talk(g, pl, text); chron(g, `${placeName(pl)}에서 ${J(old.name, '과/와')} ${nw.name} 사이에 혼담이 맺어지다.`, 30);
        if (near || rng.chance(0.1)) line(g, 'match', text);
      }
    } else {
      a.rep = clamp(a.rep + rng.int(2, 8), 0, 100); b.rep = clamp(b.rep + rng.int(-4, 4), 0, 100);
      h.prestige = clamp(h.prestige + rng.int(0, 3) - (h.prestige > 70 ? 2 : 0), 0, 100);
      if ((near && rng.chance(0.35)) || rng.chance(0.03)) { const text = pickFresh(g, rng, 'tk', T.TALK)(c); talk(g, pl, text); line(g, 'talk', text); }
    }
    if (a.scandal && g.date.year - a.scandal.y >= 3) a.scandal = null;
  }
}

/* ---------- 장면 ---------- */
const PARTY = {
  talk: { title: '말솜씨', text: (c) => `${c.host.endsWith('살롱') ? c.host : `${c.host}의 응접실`}. ${J(c.fig, '이/가')} 사람들 앞에서 내게 말을 던졌다. "${c.low ? '시골에서 오신 분은 이런 자리가 낯설겠지요' : '요즘 무슨 재미로 사시나'}?" 다들 잔을 든 채 내 대답을 기다린다.`, choices: () => [{ label: '재치 있게 받아친다', key: 'wit' }, { label: '솔직하게 답한다', key: 'plain' }, { label: '웃고 넘긴다', key: 'smile' }] },
  dance: { title: '무도', text: (c) => `악사들이 새 곡을 켰다. ${J(c.fig, '이/가')} 다가와 손을 내밀었다. 춤판 한가운데로 나가면 모두가 본다. 발을 밟아도 모두가 본다.`, choices: () => [{ label: '손을 잡고 나간다', key: 'dance' }, { label: '정중히 사양한다', key: 'no' }] },
  gossip: { title: '귓속말', text: (c) => `${J(c.fig, '이/가')} 부채 뒤에서 속삭였다. "${c.other}에 대해 들었어요? 아직 아무도 모르는 일인데." 이 이야기를 옮기면 오늘 밤 나는 인기인이 된다. ${c.other}의 이번 철은 끝난다.`, choices: () => [{ label: '다른 사람들에게 옮긴다', key: 'spread' }, { label: '들은 것으로 덮어 둔다', key: 'keep' }, { label: '그런 말은 그만두라고 한다', key: 'stop' }] },
  match: { title: '혼담', text: (c) => `${lady(c.host)}이 나를 구석으로 이끌었다. "${c.mname}${c.mbat ? '이를' : '를'} 소개하고 싶어요. ${c.mkind} 집안이에요. 서로 좋은 일이 될 거예요." 저쪽 창가에서 ${J(c.mname, '이/가')} 이쪽을 보고 있다.`, choices: () => [{ label: '혼담을 진지하게 듣는다', key: 'yes' }, { label: '한 번 이야기나 나눠 본다', key: 'talk' }, { label: '아직 생각이 없다고 한다', key: 'no' }] },
  patron: { title: '후원', text: (c) => `${J(c.fig, '이/가')} 내 작품을 읽었다고 했다. "${c.hostName}께서 당신 같은 사람을 곁에 두고 싶어 하십니다. 다달이 녹봉이 나가고, 연회마다 자리가 있지요. 물론 그 집안을 좋게 써 주셔야 하고요."`, choices: () => [{ label: '후원을 받는다', key: 'yes' }, { label: '내 글은 내 것이라고 사양한다', key: 'no' }] },
  snub: { title: '무시', text: (c) => `${J(c.fig, '이/가')} 내 쪽을 보며 옆 사람에게 들리게 말했다. "${c.dress ? '요즘은 아무나 이 문을 넘는군요' : '저 옷은 장터에서 빌렸나 봐요'}." 웃음소리가 났다. 다들 내가 어떻게 하는지 본다.`, choices: () => [{ label: '똑같이 날카롭게 맞받는다', key: 'back' }, { label: '못 들은 척 품위를 지킨다', key: 'calm' }, { label: '자리를 뜬다', key: 'leave' }] },
  gamble: { title: '카드 탁자', text: (c) => `밤이 깊자 안쪽 방에 카드 탁자가 펴졌다. ${J(c.fig, '이/가')} 빈자리를 가리켰다. 판돈이 은화 서른 닢부터다. 여기서 지면 소문이 나고, 이기면 더 큰 소문이 난다.`, choices: (g) => [...(canSpend(g, 30) ? [{ label: '자리에 앉는다', key: 'play' }] : []), { label: '구경만 한다', key: 'watch' }] },
};
defineScene('so_invite', {
  title: () => '초대장',
  text: (g, s) => `${s.hk === 'salon' ? `${lady(s.host)}이 쪽지를 보냈다. 다음 모임에 와 달라고. 글 읽는 사람, 노래하는 사람, 말 잘하는 사람이 모이는 자리다.` : `${s.host}에서 초대장이 왔다. ${T.KIND[s.hk].name}. 봉랍에 ${s.hk === 'old' ? '오래된 집안 문장' : '새로 지은 집안 문장'}이 찍혀 있다.`}${s.dressed ? '' : ' 그런데 입고 갈 연회 옷이 없다.'}${s.season ? '' : ' 철이 아닌데도 모이는 자리다.'}`,
  choices: (g, s) => [{ label: s.dressed ? '간다' : '있는 옷으로 간다', key: 'go' }, ...(!s.dressed && canSpend(g, 40) ? [{ label: '은화 40닢으로 연회 옷을 맞춰 간다', key: 'dress' }] : []), { label: '정중히 거절한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); const m = st.me; const h = hostById(g, s.hid);
    if (!h) return '초대한 집이 문을 닫았다는 소식이 먼저 왔다.';
    if (key === 'no') { m.ties[h.id] = clamp((m.ties[h.id] ?? 0) - 3, -100, 100); return '정중한 답장을 보냈다. 다음 철에도 초대장이 올지는 모르겠다.'; }
    let isDressed = s.dressed;
    if (key === 'dress' && spend(g, 40)) { m.dressAt = mi(g); isDressed = true; }
    m.went += 1; m.ties[h.id] = clamp((m.ties[h.id] ?? 0) + 5, -100, 100);
    const fs = figsAt(g, h.place); const fig = fs.length ? rng.pick(fs) : null; const other = fs.filter((f) => f !== fig);
    const low = !nobleOf(g);
    // 무엇이 생기나
    const evs = [['talk', 3], ['dance', 2], ['gamble', 1]];
    if (other.length) evs.push(['gossip', 1.5]);
    if (!isDressed && h.prestige >= 40) evs.push(['snub', 4]);
    else if (low && h.kind === 'old') evs.push(['snub', 1.5]);
    const lv = loveState(g);
    if (!me(g).spouseId && !lv.engaged && playerAge(g) >= 18 && playerAge(g) <= 40) evs.push(['match', 1.5]);
    if (worksOf(g, { mine: true }).length && !artsState(g).patron) evs.push(['patron', 2]);
    const tot = evs.reduce((a, [, w]) => a + w, 0); let r = rng.float(0, tot); let ev = evs[0][0];
    for (const [k, w] of evs) { r -= w; if (r <= 0) { ev = k; break; } }
    const data = { hid: h.id, ev, host: h.name, fig: fig?.name ?? '낯선 손님', fid: fig?.id ?? null, low, dress: isDressed, other: other.length ? rng.pick(other).name : '', };
    if (ev === 'match') { const sex = me(g).sex === 'm' ? 'f' : 'm'; data.msex = sex; data.mname = rng.pick(sex === 'm' ? MALE_NAMES : FEMALE_NAMES); data.mlast = rng.pick(h.kind === 'old' ? T.OLD_NAMES : T.NEW_NAMES); data.mkind = h.kind === 'old' ? '오래된' : '돈 많은'; data.mbat = J(data.mname, '이/가').endsWith('이'); data.mage = clamp(playerAge(g) + rng.int(-4, 3), 17, 45); }
    if (ev === 'patron') data.hostName = h.name;
    queueScene(g, 'so_party', data, { first: true });
    log(g, `${h.name}의 연회에 갔다.`);
    return isDressed ? '마차가 저택 앞에 섰다. 하인이 문을 열고 내 이름을 크게 불렀다. 안쪽에서 몇 사람이 고개를 돌렸다.' : '평소 입던 옷 중 제일 나은 것을 골라 입었다. 문간의 하인이 내 옷을 위아래로 한 번 훑었다.';
  },
});
defineScene('so_party', {
  title: (g, s) => PARTY[s.ev].title,
  text: (g, s) => PARTY[s.ev].text(s),
  choices: (g, s) => PARTY[s.ev].choices(g, s),
  resolve(g, rng, s, key) {
    const st = S(g); const m = st.me; const h = hostById(g, s.hid);
    const fig = st.figures.find((f) => f.id === s.fid);
    const ton = (n) => { m.ton = clamp(m.ton + n, 0, 100); if (h) m.ties[h.id] = clamp((m.ties[h.id] ?? 0) + n, -100, 100); if (n > 0 && courtState(g)) courtState(g).standing = clamp((courtState(g).standing ?? 0) + n / 4, 0, 100); };
    const cha = g.player.stats.cha; const wit = cha + (g.player.skills.letters ?? 0) / 2 + g.player.stats.int / 4;
    switch (s.ev) {
      case 'talk':
        if (key === 'wit') { if (check(rng, wit, 55)) { ton(6); gainStat(g, 'cha', 0.3); if (fig) fig.rep = clamp(fig.rep - 4, 0, 100); return `한마디 받아쳤더니 웃음이 터졌다. ${J(s.fig, '이/가')} 잔을 들어 보이며 졌다는 시늉을 했다. 그 말은 다음 날 다른 응접실에서도 들렸다고 한다.`; } ton(-3); return '받아친다는 게 말이 꼬였다. 몇 사람이 예의 바르게 웃었다. 예의 바른 웃음이 제일 아프다.'; }
        if (key === 'plain') { ton(2); deed(g, 'honest', 1, '사교계에서 꾸밈없이 말했다'); return '있는 그대로 말했다. 몇 사람은 촌스럽다는 얼굴이었고, 늙은 백작 부인 하나는 고개를 끄덕였다. "요즘 보기 드문 사람이군."'; }
        ton(1); return '웃고 넘겼다. 대화는 다른 데로 흘렀다. 아무도 기억하지 못할 밤이다. 그것도 나쁘지 않다.';
      case 'dance':
        if (key === 'dance') { if (check(rng, g.player.stats.agi + cha / 2, 45)) { ton(5); stress(g, -6); return `발이 생각보다 잘 맞았다. 곡이 끝나자 ${J(s.fig, '이/가')} 웃으며 한 번 더 추자고 했다. 벽 쪽에 선 사람들이 우리 둘을 두고 수군거렸다.`; } ton(-2); return `세 번째 박자에 ${s.fig}의 발을 밟았다. 둘 다 웃었다. 지켜보던 사람들은 웃지 않았다.`; }
        return '사양했다. 상대는 다른 사람에게 손을 내밀었다. 그날 밤 춤판의 이야기에 내 이름은 없다.';
      case 'gossip': {
        const o = st.figures.find((f) => f.name === s.other && f.place === h?.place);
        if (key === 'spread') { ton(5); if (o) { o.rep = clamp(o.rep - 15, 0, 100); o.scandal = { what: 'talk', y: g.date.year }; } deed(g, 'kind', -2, '사교계에서 남의 추문을 옮겼다'); talk(g, h?.place ?? here(g), `${s.other}에 대한 뒷말이 ${placeName(h?.place ?? here(g))} 응접실마다 돌았다.`); return `한 사람에게 옮겼더니 자정 전에 온 방이 알았다. 사람들이 내 곁으로 모였다. 문간에서 ${J(s.other, '이/가')} 얼굴이 하얘져 마차를 부르는 것을 보았다.`; }
        if (key === 'stop') { ton(-2); deed(g, 'kind', 2, '남의 뒷말을 막았다'); if (o) o.rep = clamp(o.rep + 3, 0, 100); return `"그런 말은 당사자 앞에서 하시지요." ${J(s.fig, '이/가')} 부채를 접고 돌아섰다. 오늘 밤 적이 하나 생겼다. 누군가 한 사람은 그걸 고마워할 것이다.`; }
        return '고개만 끄덕이고 잔을 비웠다. 그 이야기는 내 입에서는 나가지 않았다. 다른 입에서 나갈 것이다.';
      }
      case 'match': {
        const lv = loveState(g);
        if (key === 'no' || me(g).spouseId || lv.engaged) { return '아직 생각이 없다고 했다. 안주인은 아쉬운 얼굴로 다음 철을 기약했다.'; }
        if (key === 'talk') { ton(2); return `${J(s.mname, '과/와')} 창가에서 이야기를 나누었다. 날씨 이야기, 음악 이야기. 나쁘지 않았다. 그 이상은 아직 모르겠다.`; }
        const p = makePerson(ownRng(g, 9), { sex: s.msex, ageMonths: s.mage * 12 + 2, lastName: s.mlast, job: 'idle', traits: ['reserved', rng.pick(['kind', 'ambitious', 'generous', 'pious'])] });
        p.name = s.mname; p.known = true; p.affection = 20; p.wealth = h?.kind === 'old' ? rng.int(40, 120) : rng.int(120, 260); p.place = h?.place ?? here(g);
        p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 정혼했다.` });
        g.people.push(p); rel(p);
        lv.engaged = { id: p.id, at: mi(g), wedAt: mi(g) + 6, arranged: true };
        ton(4); note(g, `${J(fullName(p), '과/와')} 정혼했다.`); log(g, `사교계 혼담으로 ${J(p.name, '과/와')} 정혼했다.`);
        return `두 집 어른이 만나는 데 한 달, 혼례 날을 잡는 데 하루가 걸렸다. ${J(p.name, '은/는')} 상견례 자리에서 처음으로 웃었다. 여섯 달 뒤다.`;
      }
      case 'patron': {
        const A = artsState(g);
        if (key === 'yes' && !A.patron && h) { A.patron = { kind: 'house', id: h.ref ?? `so${h.id}`, name: h.name, stipend: Math.round(3 + h.prestige / 20), want: 'praise', mood: 60, since: mi(g), lastWork: mi(g) }; ton(4); log(g, `${h.name}의 후원을 받게 되었다.`); return `그 자리에서 손을 잡았다. 다음 달부터 녹봉이 나온다. 연회마다 내 자리가 생긴다. 다음 작품의 첫 장은 그 집안 이야기로 시작해야 할 것이다.`; }
        deed(g, 'honest', 1, '후원을 사양하고 제 글을 지켰다'); return '정중히 사양했다. 그 사람은 놀란 얼굴로 돌아갔다. 녹봉은 없다. 펜은 내 것이다.';
      }
      case 'snub':
        if (key === 'back') { if (check(rng, wit, 50)) { ton(4); if (fig) fig.rep = clamp(fig.rep - 8, 0, 100); return `한마디 돌려주었다. 이번엔 웃음이 저쪽을 향했다. ${J(s.fig, '은/는')} 남은 저녁 내내 내 근처에 오지 않았다.`; } ton(-5); stress(g, 6); return '맞받는다는 게 목소리만 커졌다. 안주인이 눈살을 찌푸렸다. 오늘 밤의 이야깃거리는 내가 되었다.'; }
        if (key === 'calm') { ton(1); deed(g, 'brave', 1, '사교계의 비웃음을 품위 있게 견뎠다'); return '못 들은 척 잔을 들었다. 뒤에서 누군가 작게 말했다. "저 사람, 보기보다 단단하군." 그거면 됐다.'; }
        ton(-4); stress(g, 8); if (h) m.ties[h.id] = clamp((m.ties[h.id] ?? 0) - 10, -100, 100); return '조용히 외투를 받아 들고 나왔다. 마차 안에서 한참 창밖만 보았다. 그 집 초대장은 아마 다시 오지 않을 것이다.';
      case 'gamble':
        if (key === 'play' && spend(g, 30)) { if (check(rng, g.player.stats.int + g.player.stats.sen / 2, 45)) { const won = rng.int(40, 110); g.player.money += won + 30; ton(3); return `새벽녘에 일어설 때 주머니에 은화 ${won}닢이 더 있었다. 진 사람이 웃으며 악수를 청했다. 웃는 얼굴 뒤에서 이를 갈았을 것이다.`; } ton(-1); return '서른 닢을 잃었다. 아무 일도 아닌 척 웃었다. 이 자리에선 지는 것보다 아까워하는 것이 더 큰 흉이다.'; }
        return '탁자 뒤에 서서 구경만 했다. 누가 얼마를 잃었는지는 다음 날 온 도시가 알았다. 내 이름은 거기 없었다.';
    }
    return '밤이 지나갔다.';
  },
});
defineScene('so_sponsor', {
  title: () => '소개해 주겠다는 사람',
  text: (g, s) => `${lady(s.host)}이 사람을 보냈다. 내 ${s.why} 이야기를 들었다고. "재주 있는 사람은 문간에 오래 세워 두면 안 되지요. 다음 모임에 내 손님으로 오세요." 쪽지 끝에 한 줄이 더 있다. "언젠가 나도 부탁할 일이 있겠지요."`,
  choices: () => [{ label: '고맙게 받아들인다', key: 'yes' }, { label: '남의 손을 빌리지 않겠다고 한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.sponsor = mi(g);
    const h = hostById(g, s.hid);
    if (key !== 'yes' || !h) return '정중히 사양했다. 문은 아직 닫혀 있다. 내 손으로 열 생각이다.';
    st.me.sponsor = { host: h.id, name: h.name, at: mi(g), asked: false }; st.me.ton = clamp(st.me.ton + 8, 0, 100); st.me.ties[h.id] = 30;
    log(g, `${h.name}의 소개로 사교계에 발을 들였다.`); note(g, `${h.name}의 소개로 사교계에 발을 들였다.`);
    return '처음 간 날, 안주인이 내 팔을 끼고 방을 한 바퀴 돌았다. 사람들이 이름을 물었다. 다들 내 재주보다 누가 데려왔는지를 먼저 보았다.';
  },
});
const FAVOR = [
  { why: '조카를 내 일터에 써 달라고', yes: '조카는 성실했다. 다만 일보다 연회 이야기를 더 좋아했다.', cost: 0 },
  { why: '은화 80닢을 잠시 빌려 달라고', yes: '돈주머니를 건넸다. 안주인은 고맙다고 했다. 언제 갚겠다는 말은 없었다.', cost: 80 },
  { why: '맞수 집안의 연회에 가서 무슨 말이 오가는지 알려 달라고', yes: '그 집 연회에서 들은 것을 전했다. 안주인이 웃었다. 나는 그날 밤 잠을 설쳤다.', cost: 0 },
];
defineScene('so_favor', {
  title: () => '갚아야 할 부탁',
  text: (g, s) => `나를 사교계에 데려가 준 ${lady(s.host)}이 차를 마시자고 불렀다. 한참 딴 이야기를 하다가 부탁을 꺼냈다. ${FAVOR[s.v].why}.`,
  choices: (g, s) => [...(FAVOR[s.v].cost && !canSpend(g, FAVOR[s.v].cost) ? [] : [{ label: '들어준다', key: 'yes' }]), { label: '이번만은 어렵다고 한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); const sp = st.me.sponsor; if (sp) sp.asked = true;
    const f = FAVOR[s.v];
    if (key === 'yes' && (!f.cost || spend(g, f.cost))) { st.me.ton = clamp(st.me.ton + 4, 0, 100); if (sp) st.me.ties[sp.host] = clamp((st.me.ties[sp.host] ?? 0) + 15, -100, 100); if (s.v === 2) deed(g, 'loyal', -1, '연회에서 들은 말을 남에게 전했다'); return f.yes; }
    st.me.ton = clamp(st.me.ton - 6, 0, 100); if (sp) st.me.ties[sp.host] = clamp((st.me.ties[sp.host] ?? 0) - 25, -100, 100);
    return '어렵다고 했다. 안주인은 웃으며 찻잔을 내려놓았다. "그래요, 그럴 수 있지요." 다음 모임 초대장은 오지 않았다.';
  },
});
const SCANDAL_WHY = { affair: '내가 몰래 만나는 사람이 있다는', noto: '내 지난 일들에 대한', disgrace: '궁정에서 쫓겨난 일에 대한', loss: '카드 탁자에서 빚을 졌다는' };
defineScene('so_scandal', {
  title: () => '응접실의 내 이름',
  text: (g, s) => `${placeName(s.pl)} 응접실마다 ${SCANDAL_WHY[s.why]} 이야기가 돈다고 한다. 어제 연회에서 내가 들어서자 말소리가 잠깐 멎었다. 반가운 얼굴들이 반만 반가웠다.`,
  choices: () => [{ label: '아무렇지 않게 연회에 계속 나간다', key: 'face' }, { label: '한 철 사교계를 떠나 있는다', key: 'away' }, { label: '더 큰 추문을 퍼뜨려 덮는다', key: 'cover' }],
  resolve(g, rng, s, key) {
    const st = S(g); const m = st.me; m.done.scandal = mi(g);
    if (key === 'face') { if (check(rng, g.player.stats.cha + g.player.stats.wil / 2, 55)) { m.ton = clamp(m.ton - 3, 0, 100); return '아무 일 없다는 듯 웃고 춤추었다. 한 달이 지나자 사람들은 다른 이야기를 시작했다. 사교계의 기억은 짧다. 짧아지게 만드는 것도 재주다.'; } m.ton = clamp(m.ton - 12, 0, 100); m.shut = mi(g) + 6; stress(g, 10); return '버텨 보려 했지만 초대장이 하나둘 끊겼다. 문간 하인들이 내 이름을 듣고 안으로 물으러 갔다가 돌아오지 않았다.'; }
    if (key === 'away') { m.ton = clamp(m.ton - 6, 0, 100); m.shut = mi(g) + 10; stress(g, -4); return '한 철 동안 연회에 나가지 않았다. 다음 철에 돌아갔을 때 사람들은 내가 어디 갔었는지만 물었다. 왜 갔었는지는 묻지 않았다.'; }
    const fs = figsAt(g, s.pl); const o = fs.length ? rng.pick(fs) : null;
    if (o) { o.rep = clamp(o.rep - 25, 0, 100); o.scandal = { what: 'talk', y: g.date.year }; talk(g, s.pl, `${o.name}에 대한 고약한 소문이 갑자기 돌기 시작했다.`); }
    deed(g, 'honest', -3, '제 추문을 덮으려 남의 추문을 지어냈다', s.pl); m.ton = clamp(m.ton - 2, 0, 100);
    return `${o ? `${o.name}에 대한` : '다른 사람에 대한'} 이야기 하나를 흘렸다. 일주일 뒤 응접실의 화제가 바뀌었다. 바뀐 화제의 주인공이 나를 볼 때 무슨 생각을 할지는 생각하지 않기로 했다.`;
  },
});
defineScene('so_host', {
  title: () => '내가 여는 연회',
  text: (g, s) => `이번 철엔 내가 연회를 열어 볼까. 악사와 요리사, 촛불과 술. 은화 ${s.cost}닢은 든다. 누가 올지는 초대장을 보내 봐야 안다. 아무도 안 오면 그것도 온 도시가 안다.`,
  choices: (g, s) => [...(canSpend(g, s.cost) ? [{ label: '연회를 연다', key: 'yes' }] : []), { label: '다음 철로 미룬다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); const m = st.me; m.done.host = mi(g);
    if (key !== 'yes' || !spend(g, s.cost)) return '초대장 묶음을 서랍에 넣었다. 다음 철에.';
    m.hosted += 1;
    const ok = check(rng, m.ton + g.player.stats.cha / 2, 55);
    if (ok) { m.ton = clamp(m.ton + 10, 0, 100); for (const h of hostsAt(g, here(g))) m.ties[h.id] = clamp((m.ties[h.id] ?? 0) + 6, -100, 100); deed(g, 'generous', 2, '도시 사람들을 불러 연회를 열었다'); log(g, '내 집에서 연회를 열었다. 사람이 넘쳤다.'); chron(g, `${g.player.name}, ${placeName(here(g))}에서 연회를 열다.`, 35); return '자정이 넘도록 마차가 끊이지 않았다. 옛 가문 사람과 신흥 부자가 같은 탁자에서 웃었다. 내일 응접실마다 이 밤 이야기가 돌 것이다.'; }
    m.ton = clamp(m.ton - 4, 0, 100); stress(g, 10); log(g, '내 집에서 연회를 열었다. 자리가 반이나 비었다.');
    return '촛불은 다 켜졌는데 의자는 반이 비었다. 악사들은 끝까지 성실하게 연주했다. 그 성실함이 더 쓸쓸했다.';
  },
});

/* ---------- 플레이어 ---------- */
function playerTick(g, rng) {
  const s = S(g); const m = s.me;
  const now = mi(g); const pl = here(g);
  if (!free(g) || !CITIES.includes(pl) || now - s.sceneAt < 2 || L(g).queue.length >= 2) return;
  const q = (kind, data) => { queueScene(g, kind, data); s.sceneAt = now; return true; };
  const kinds = openKinds(g);
  // 소개해 주는 사람: 재주는 있는데 문이 닫혀 있을 때
  if (!kinds.includes('salon') && talentOf(g) && !m.sponsor && (!m.done.sponsor || now - m.done.sponsor >= 36) && rng.chance(0.08)) {
    const h = hostsAt(g, pl).find((x) => x.kind === 'salon' && !x.closed);
    const why = (artsState(g).fame ?? 0) >= 25 ? '작품' : (L(g).renown ?? 0) >= 35 ? '이름난 일' : '말솜씨';
    if (h) return q('so_sponsor', { hid: h.id, host: h.name, why });
  }
  if (!kinds.length) return;
  // 부탁
  const sp = m.sponsor;
  if (sp && !sp.asked && now - sp.at >= 18 && rng.chance(0.06)) return q('so_favor', { host: sp.name, v: rng.int(0, FAVOR.length - 1) });
  // 추문
  if (m.ton >= 15 && (!m.done.scandal || now - m.done.scandal >= 36)) {
    const why = loveState(g).affair ? 'affair' : disgraced(g) ? 'disgrace' : (L(g).notoriety ?? 0) >= 30 ? 'noto' : null;
    if (why && rng.chance(0.08)) return q('so_scandal', { pl, why });
  }
  if (m.shut > now) return;
  // 내가 여는 연회
  if (isSeason(g) && m.ton >= 45 && (!m.done.host || now - m.done.host >= 24) && g.player.money >= 200 && rng.chance(0.08)) return q('so_host', { cost: 80 + Math.round(m.ton) });
  // 초대장
  const season = isSeason(g);
  if (season ? m.went >= 3 : !kinds.includes('salon')) return;
  const hs = hostsAt(g, pl).filter((h) => !h.closed && kinds.includes(h.kind) && (season || h.kind === 'salon') && (m.ties[h.id] ?? 0) > -20);
  if (!hs.length) return;
  const base = (season ? 0.5 : 0.06) * (0.7 + m.ton / 100);
  if (!rng.chance(base)) return;
  const h = rng.weighted(hs, (x) => 1 + Math.max(0, m.ties[x.id] ?? 0) / 20 + (x.kind === 'salon' ? 0.5 : 0)) ?? hs[0];
  return q('so_invite', { hid: h.id, host: h.name, hk: h.kind, dressed: dressed(g), season });
}

function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over) return;
  worldTick(g, ownRng(g, 11));
  const m = s.me;
  const pl = here(g);
  // 철의 시작과 끝
  if (g.date.month === 11) { m.went = 0; if (CITIES.includes(pl) && playerAge(g) >= 14) line(g, 'season', pickFresh(g, ownRng(g, 5), 'ss', T.SEASON_ON)({ place: placeName(pl) })); }
  if (g.date.month === 3 && CITIES.includes(pl) && openKinds(g).length && m.went === 0 && m.ton >= 10 && !traveling(g)) line(g, 'shut', pickFresh(g, ownRng(g, 6), 'sh', T.SHUT)({ place: placeName(pl), host: hostsAt(g, pl)[0]?.name ?? '옛 집' }));
  // 체면은 나가지 않으면 천천히 옅어진다
  if (!isSeason(g) && g.date.month === 6) m.ton = clamp(m.ton - (m.went ? 1 : 3), 0, 100);
  playerTick(g, ownRng(g, 29));
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.society = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g) => {
  const s = S(g); const m = s.me;
  // 집안의 이름은 조금 남는다
  s.me = { ton: Math.round(m.ton * 0.3), ties: Object.fromEntries(Object.entries(m.ties).map(([k, v]) => [k, Math.round(v * 0.4)])), sponsor: null, dressAt: -99, went: 0, shut: 0, done: {}, hosted: 0 };
  s.gen += 1; s.sceneAt = mi(g);
});

/* ---------- 화면 연결점 ---------- */
export function societyLines(g) { return (g.society?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function societyLine(g) { return societyLines(g)[0]?.text ?? null; }
export function societyInfo(g) {
  const s = S(g); const m = s.me; const pl = here(g);
  const city = CITIES.includes(pl);
  return {
    season: isSeason(g), seasonWord: isSeason(g) ? '사교 철이다' : '사교 철이 아니다',
    access: societyAccess(g), kinds: openKinds(g).map((k) => T.KIND[k].name),
    ton: Math.round(m.ton), tonWord: tonWord(m.ton), dressed: dressed(g),
    sponsor: m.sponsor ? m.sponsor.name : null, went: m.went, hosted: m.hosted,
    shut: Math.max(0, m.shut - mi(g)),
    hosts: city ? hostsAt(g, pl).filter((h) => !h.closed).map((h) => ({ name: h.name, kind: T.KIND[h.kind].name, prestige: prestigeWord(h.prestige), tie: tieWord(m.ties[h.id] ?? 0), open: openKinds(g).includes(h.kind) })) : [],
    figures: city ? figsAt(g, pl).sort((a, b) => b.rep - a.rep).slice(0, 5).map((f) => ({ name: f.name, word: repWord(f.rep), scandal: !!f.scandal })) : [],
    talk: s.talk.slice(-4).map((x) => ({ place: placeName(x.place), text: x.text })),
    matches: s.matches.slice(-3).map((x) => ({ a: x.a, b: x.b, place: placeName(x.place), y: x.y })),
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
