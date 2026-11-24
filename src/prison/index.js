// 41단계: 옥살이와 탈옥 (도우미스레드2).
// law는 판결까지, crime은 갇힘(jail)과 감방 행동(견디기·노역·어울리기·탈옥)까지. 여기선 갇힌 뒤의 삶:
// - 감옥마다 다른 꼴: 마을 옥사(lockup), 영주의 지하 감옥(dungeon), 왕도·제도·성도의 탑 감옥(tower), 성채·광산 고장의 채석장 노역(quarry)
// - 감방 동료와 우두머리(pr_arrive), 옥졸과 뇌물(pr_guard), 옥중 패거리(pr_gang), 옥중 편지(pr_letter)와 면회(pr_visit),
//   탈옥 꾸미기(pr_plot)와 그날 밤(pr_break), 옥중 열병(pr_sick), 채석장 낙석(pr_quarry)
// - 나온 뒤: 옥문 앞(pr_release), 따라다니는 이름(pr_mark), 옛 감방 동료가 찾아옴(pr_old)
// - 갇힌 식구 빼내기(pr_kin)
// - 플레이어 없이도 NPC가 갇히고, 형기를 마치고 나오고, 탈옥하고, 붙잡혀 온다.
// 화면 연결점: prisonLines(g), prisonLine(g), prisonInfo(g). 장면 앞머리 pr_.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat } from '../game.js';
import { byId, ageYears, makePerson, living, has } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress } from '../adventure/core.js';
import { rel } from '../relations.js';
import { crimeState, isJailed, reportCrime } from '../crime.js';
import { makeRng } from '../rng.js';
import * as T from './lines.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeOf = (p) => p?.place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 613) ^ Math.imul(mi(g) * 181 + salt + 31, 2654435761)) | 0 });
const alive = (p) => !!p && p.alive && !p.isPlayer;
const aff = (p, n) => { if (!p) return; rel(p); p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
const TOWER = new Set(['leocast', 'eisen', 'solaris', 'saltmare']);
const QUARRY = new Set(['graubel', 'hammer', 'gorge', 'fr_wolf', 'fr_ash', 'crow']);
const LOCKUP = new Set(['ern', 'gruental', 'klein', 'silverleaf', 'fur', 'saltrock', 'fr_moor', 'fr_wood', 'fr_fen', 'fr_grass']);
export const prisonKind = (pl) => (TOWER.has(pl) ? 'tower' : QUARRY.has(pl) ? 'quarry' : LOCKUP.has(pl) ? 'lockup' : 'dungeon');
const SHADY = new Set(['gang_member', 'gang_boss', 'rat_boss', 'pirate', 'pirate_lord', 'laborer', 'idle', 'adventurer', 'sailor', 'hunter']);
const WHY = ['도둑질로', '빚을 못 갚아', '술집 싸움 끝에', '밀수하다', '영주의 숲에서 사슴을 잡다', '세금을 못 내', '위조 은화를 쓰다'];
const NUM = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const mon = (n) => (n >= 1 && n <= 10 ? `${NUM[n]} 달` : `${n}달`);

/* ---------- 상태 ---------- */
export function prisonState(g) {
  g.prison ??= {};
  const s = g.prison;
  s.stay ??= null;   // 지금 옥살이 { place, kind, since, total, mates: [id], guard: id, bribed, gang: null|'in'|'out', plot: 0|1|2(실행 대기), boss: null|'gave'|'fought'|'ward', left(지난달 남은 형기) }
  s.past ??= [];     // [{ place, kind, months, how: served|escaped|early, y, mates }]
  s.freeAt ??= null; // 마지막으로 나온 때
  s.npc ??= [];      // NPC 죄수 [{ id, place, until, why, ev, end, mine(내가 씌운 away) }]
  s.month ??= [];
  s.used ??= [];
  s.log ??= [];
  s.done ??= {};
  s.sceneAt ??= -99;
  s.lineAt ??= -99;
  s.made ??= 0;      // NPC가 갇힌 수
  s.broke ??= 0;     // NPC 탈옥 수
  return s;
}
const S = prisonState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, text }); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 24) s.used.shift();
  return pool[i];
}
const jail = (g) => crimeState(g).jailed;
const kinIds = (g) => { const m = me(g); return new Set([m.fatherId, m.motherId, m.spouseId, ...(m.childIds ?? []), ...(g.player.familyIds ?? [])].filter((x) => x != null)); };
const mates = (g) => (S(g).stay?.mates ?? []).map((id) => byId(g, id)).filter(alive);
const guardOf = (g) => byId(g, S(g).stay?.guard);
const jailedNpc = (g, id) => S(g).npc.find((x) => x.id === id && !x.end);

/* ---------- NPC를 가두고 풀어 준다 ---------- */
function lockNpc(g, p, place, months, why) {
  const s = S(g); const now = mi(g);
  const mine = !p.away;
  p.away = true; p.place = place;
  p.history.push({ y: g.date.year, m: g.date.month, text: `${why} 붙잡혀 ${placeName(place)} 감옥에 갇혔다.` });
  const x = { id: p.id, place, until: now + months, why, at: now, ev: {}, end: null, mine };
  s.npc.push(x); s.made += 1;
  return x;
}
function freeNpc(g, x, how) {
  const p = byId(g, x.id); x.end = mi(g); x.how = how;
  if (!p) return;
  if (x.mine) p.away = false;
  p.history.push({ y: g.date.year, m: g.date.month, text: how === 'escaped' ? `${placeName(x.place)} 감옥을 탈옥했다.` : `${placeName(x.place)} 감옥에서 풀려났다.` });
}

/* ---------- 갇힘의 시작과 끝 ---------- */
function startStay(g, rng) {
  const s = S(g); const j = jail(g); const now = mi(g);
  const kind = prisonKind(j.place);
  // 감방 동료: 같은 감옥 NPC 죄수, 모자라면 새로 들인다
  const pool = s.npc.filter((x) => !x.end && x.place === j.place).map((x) => byId(g, x.id)).filter(alive);
  const ms = pool.slice(0, 2);
  while (ms.length < 2) {
    const p = makePerson(rng, { sex: rng.chance(0.8) ? 'm' : 'f', ageMonths: rng.int(19, 50) * 12, job: rng.pick(['gang_member', 'laborer', 'idle', 'sailor']) });
    p.place = j.place; g.people.push(p);
    lockNpc(g, p, j.place, j.months + rng.int(-2, 10), rng.pick(WHY));
    ms.push(p);
  }
  const gd = makePerson(rng, { sex: 'm', ageMonths: rng.int(28, 55) * 12, job: 'guard' });
  gd.place = j.place; g.people.push(gd);
  s.stay = { place: j.place, kind, since: now, total: j.total ?? j.months, mates: ms.map((p) => p.id), guard: gd.id, bribed: false, gang: null, plot: 0, boss: null, left: j.months, plotAt: null };
  log(g, `${T.KINDS[kind].where(placeName(j.place))}에 갇혔다.`);
}
function endStay(g) {
  const s = S(g); const st = s.stay; const now = mi(g);
  const months = Math.max(1, now - st.since);
  const broke = (crimeState(g).record ?? []).some((r) => r.c === 'jailbreak' && r.at >= now - 1) || st.how === 'escaped';
  const exiled = !!g.exile?.banish && g.exile.banish.y >= g.date.year - 1;
  const how = broke ? 'escaped' : exiled ? 'exiled' : st.left > 1 ? 'early' : 'served';
  s.past.push({ place: st.place, kind: st.kind, months, how, y: g.date.year, mates: st.mates.slice(), gang: st.gang });
  if (s.past.length > 8) s.past.shift();
  s.freeAt = now; s.stay = null;
  log(g, how === 'escaped' ? `${placeName(st.place)} 감옥을 빠져나왔다.` : how === 'exiled' ? `${placeName(st.place)} 감옥에서 유배지로 끌려갔다.` : `${mon(months)} 만에 ${placeName(st.place)} 감옥에서 나왔다.`);
  return how;
}

/* ---------- 장면: 안에서 ---------- */
defineScene('pr_arrive', {
  title: () => '감방의 첫날',
  text: (g, s) => `${s.where}. 문이 닫히자 어둠 속에서 눈들이 나를 본다. 구석 제일 마른 짚 위에 앉은 ${J(s.boss, '이/가')} 턱짓을 했다. "새로 왔으면 인사부터 해야지. 그 담요하고 오늘 빵." ${J(s.old, '은/는')} 벽에 기대 눈을 감고 있다. 못 본 척이다.`,
  choices: (g, s) => [{ label: '담요와 빵을 내준다', key: 'give' }, { label: '거절하고 맞선다', key: 'fight' }, { label: `${s.old}에게 다가가 앉는다`, key: 'ward' }],
  resolve(g, rng, s, key) {
    const st = S(g).stay; if (st) st.boss = key === 'give' ? 'gave' : key === 'fight' ? 'fought' : 'ward';
    const boss = byId(g, s.bossId); const old = byId(g, s.oldId);
    if (key === 'give') { stress(g, 6); aff(boss, 6); return `담요를 넘겼다. ${J(s.boss, '이/가')} 빵을 반으로 갈라 반쪽을 돌려주었다. "말귀는 알아듣는군." 그날 밤은 추웠다. 그래도 아무도 건드리지 않았다.`; }
    if (key === 'fight') {
      const win = rng.chance(0.3 + ((g.player.stats.str ?? 30) + (g.player.skills.sword ?? 0)) / 240);
      aff(boss, win ? -10 : -4);
      if (win) { gainStat(g, 'str', 0.3); return `${J(s.boss, '이/가')} 먼저 손을 뻗었다. 짚 위로 둘이 굴렀다. 옥졸이 몽둥이로 창살을 칠 때쯤 ${J(s.boss, '은/는')} 코를 감싸 쥐고 있었다. 그 뒤로 내 담요를 탐내는 사람은 없었다.`; }
      stress(g, 10); g.player.injuries.push({ name: '감방 싸움에 터진 입술', months: 1 }); return '한 대 치기도 전에 바닥에 깔렸다. 담요도 빵도 뺏겼다. 새벽에 누가 내 발치에 빵 부스러기를 조금 밀어 두었다. 누군지는 모른다.';
    }
    aff(old, 10); return `${s.old} 옆에 앉았다. 눈을 감은 채로 그가 말했다. "여기선 내 옆이 제일 조용하다." ${J(s.boss, '은/는')} 혀를 차고 돌아누웠다. 늙은 죄수의 옆자리에도 값이 있다는 건 나중에 알았다.`;
  },
});

defineScene('pr_guard', {
  title: () => '옥졸의 값',
  text: (g, s) => `${J(s.guard, '이/가')} 죽 그릇을 넣으며 낮게 말했다. "은화 몇 닢이면 많은 게 달라지지. 따뜻한 담요, 밖으로 나가는 편지${s.pk === 'quarry' ? ', 덜 험한 돌무더기' : ''}. 더 내면... 장부가 가끔 틀리기도 하고." 등 뒤에서 감방 동료들이 귀를 세운다.`,
  choices: (g) => [
    ...(g.player.money >= 6 ? [{ label: '담요와 고기 한 점 (은화 6)', key: 'warm' }] : []),
    ...(g.player.money >= 20 ? [{ label: '장부를 틀리게 해 달라 (은화 20)', key: 'book' }] : []),
    { label: '거절한다', key: 'no' },
    { label: '간수장에게 고자질한다', key: 'tell' },
  ],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.guard = mi(g); const stay = st.stay; const gd = guardOf(g);
    if ((key === 'warm' && g.player.money < 6) || (key === 'book' && g.player.money < 20)) return '주머니를 뒤졌지만 은화가 모자랐다. 옥졸은 혀를 차고 지나갔다.';
    if (key === 'warm') { g.player.money -= 6; if (stay) stay.bribed = true; stress(g, -8); aff(gd, 6); return '그날 밤 담요가 들어왔다. 양털 냄새가 났다. 죽에는 정말로 고기 한 점이 떠 있었다. 감방 동료들이 그걸 보았다. 나눠 줄지 말지, 한참 고민했다.'; }
    if (key === 'book') {
      g.player.money -= 20; if (stay) stay.bribed = true;
      const j = jail(g);
      if (rng.chance(0.6) && j && j.months > 1) { const cut = Math.min(j.months - 1, rng.int(1, 3)); j.months -= cut; aff(gd, 8); return `며칠 뒤 ${J(s.guard, '이/가')} 지나가며 손가락 ${cut === 1 ? '하나' : cut === 2 ? '둘' : '셋'}을 펴 보였다. 형기가 그만큼 줄었다는 뜻이다. 은화는 돌려받지 못할 곳으로 갔지만 아깝지 않았다.`; }
      if (j && rng.chance(0.4)) { j.months += 2; j.total += 2; stress(g, 10); return '간수장이 장부를 다시 셌다. 틀린 데를 찾아냈다. 옥졸은 다른 데로 쫓겨났고 내 형기에는 두 달이 붙었다. 은화는 어디로 갔는지 아무도 모른다.'; }
      return '옥졸은 은화를 받고 고개를 끄덕였다. 그 뒤로 아무 일도 없었다. 물어볼 데도 없다. 그게 이 안의 장사다.';
    }
    if (key === 'tell') {
      const j = jail(g); for (const m of mates(g)) aff(m, -15); aff(gd, -30);
      if (j && j.months > 1 && rng.chance(0.5)) { j.months -= 1; return '간수장은 고개를 끄덕이고 형기를 한 달 줄여 주었다. 그 옥졸은 다음 날부터 보이지 않았다. 감방 동료들은 그날부터 내 앞에서 말을 하지 않는다.'; }
      stress(g, 8); return '간수장은 듣는 둥 마는 둥 했다. 그 옥졸은 그대로 남았다. 그날 저녁 내 죽 그릇은 반쯤 비어서 들어왔다.';
    }
    gainStat(g, 'wil', 0.3); return '고개를 저었다. 옥졸은 어깨를 으쓱하고 다음 창살로 갔다. 옆방에서 은화 짤랑이는 소리가 났다.';
  },
});

defineScene('pr_gang', {
  title: () => '옥중 패거리',
  text: (g, s) => `운동 시간에 ${J(s.head, '이/가')} 내 옆에 섰다. 이 감옥 죄수 절반이 그의 눈치를 본다. "여기선 혼자 버티는 놈이 제일 먼저 무너지지. 우리 쪽에 서면 담요도, 소식도, 뒤를 봐주는 손도 생긴다. 대신 나가서도 우리 사람이다."`,
  choices: () => [{ label: '패거리에 든다', key: 'in' }, { label: '정중히 거절한다', key: 'out' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.gang = mi(g); if (st.stay) st.stay.gang = key;
    const head = byId(g, s.headId);
    if (key === 'in') { const c = crimeState(g); c.contacts = (c.contacts ?? 0) + 2; stress(g, -6); aff(head, 15); log(g, '옥중 패거리에 들었다.'); return `${J(s.head, '이/가')} 내 어깨를 두드렸다. 그날 저녁 누가 말없이 내 그릇에 빵 한 조각을 얹었다. 감옥이 조금 덜 넓어졌다. 대신 어딘가에 빚이 생겼다.`; }
    aff(head, -10); stress(g, 4);
    if (rng.chance(0.35)) { g.player.injuries.push({ name: '운동장에서 걷어차인 옆구리', months: 1 }); return '거절했다. 사흘 뒤 운동장 모퉁이에서 누가 내 발을 걸었다. 넘어진 나를 몇 사람이 지나가며 걷어찼다. 아무도 본 사람이 없다고 했다.'; }
    return `거절했다. ${J(s.head, '은/는')} 웃었다. "오래 버텨 봐라." 그 뒤로 아무도 나에게 말을 걸지 않는다. 혼자라는 건 조용하다는 뜻이기도 했다.`;
  },
});

defineScene('pr_letter', {
  title: () => '창살 너머 편지',
  text: (g, s) => `옥졸이 접힌 종이를 던져 넣었다. ${s.who}의 글씨다. "${s.body}" 종이 귀퉁이가 젖었다 마른 자국이 있다.`,
  choices: () => [{ label: '답장을 쓴다 (옥졸에게 은화 2)', key: 'reply' }, { label: '몇 번이고 다시 읽는다', key: 'read' }, { label: '읽지 않고 접어 둔다', key: 'fold' }],
  resolve(g, rng, s, key) {
    S(g).done.letter = mi(g);
    const p = byId(g, s.whoId);
    if (key === 'reply' && g.player.money >= 2) { g.player.money -= 2; aff(p, 8); stress(g, -8); return '숯 조각으로 종이 뒷면에 썼다. 잘 있다고. 다 거짓말이었다. 옥졸이 편지를 품에 넣었다. 닿을지 안 닿을지는 은화 두 닢에 달렸다.'; }
    if (key === 'reply') { stress(g, 4); return '답장을 쓸 은화가 없었다. 숯으로 쓴 편지를 벽 틈에 꽂아 두었다. 언젠가 내 손으로 전해 주려고.'; }
    if (key === 'read') { stress(g, -6); gainStat(g, 'wil', 0.3); return '글씨가 닳을 때까지 읽었다. 감방 동료가 소리 내어 읽어 달라고 했다. 읽어 주었다. 그 사람도 듣다가 돌아누웠다.'; }
    aff(p, -2); return '접어서 짚 밑에 넣었다. 읽으면 무너질 것 같았다. 나가는 날 읽기로 했다.';
  },
});

defineScene('pr_visit', {
  title: () => '면회',
  text: (g, s) => `${J(s.who, '이/가')} 창살 앞에 왔다. ${s.food} 옥졸이 보자기를 다 풀어 헤쳐 보고서야 넘겨주었다. ${J(s.who, '은/는')} 내 얼굴을 보고 무슨 말을 하려다 입을 다물었다.`,
  choices: () => [{ label: '바깥 소식을 묻는다', key: 'news' }, { label: '사면 청원을 넣어 달라고 한다', key: 'plea' }, { label: '"다시는 오지 마"라고 한다', key: 'away' }],
  resolve(g, rng, s, key) {
    S(g).done.visit = mi(g);
    const p = byId(g, s.whoId);
    if (key === 'news') { aff(p, 6); stress(g, -10); return `${J(s.who, '은/는')} 한참 동안 별것 아닌 이야기를 했다. 옆집 개가 새끼를 낳았다느니, 장터 빵값이 올랐다느니. 그게 이렇게 듣고 싶은 이야기인 줄 몰랐다.`; }
    if (key === 'plea') {
      const j = jail(g); aff(p, 2);
      if (j && j.months > 2 && rng.chance(0.35)) { const cut = Math.min(j.months - 1, 2); j.months -= cut; return `${J(s.who, '이/가')} 성당 사제를 붙잡고 영주 집사를 찾아가 무릎을 꿇었다고 한다. 두 달 뒤, 형기가 ${mon(cut)} 줄었다는 쪽지가 왔다.`; }
      return `${J(s.who, '이/가')} 청원서를 들고 몇 번이나 성문을 오갔다고 한다. 답은 오지 않았다. 그래도 그 발걸음 이야기를 들은 것만으로 하루를 버텼다.`;
    }
    aff(p, -8); stress(g, 6); return `"다시는 오지 마. 여기서 이런 꼴 보이기 싫다." ${J(s.who, '은/는')} 아무 말 없이 보자기만 밀어 넣고 돌아섰다. 그다음 달에도 보자기는 왔다. 사람은 안 오고.`;
  },
});

defineScene('pr_plot', {
  title: () => '벽 너머의 소리',
  text: (g, s) => `밤에 ${J(s.mate, '이/가')} 짚 밑에서 숟가락 하나를 꺼냈다. 끝이 납작하게 갈려 있다. "석 달째 갈았다. 하수구 창살 하나가 거의 빠졌어. 둘이면 빨라. 셋이면 들키고." 눈이 어둠 속에서 번들거린다.`,
  choices: () => [{ label: '함께 판다', key: 'join' }, { label: '옥졸에게 일러바친다', key: 'tell' }, { label: '못 들은 걸로 한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.plot = mi(g); const stay = st.stay;
    const m = byId(g, s.mateId);
    if (key === 'join') { if (stay) { stay.plot = 1; stay.plotAt = mi(g); } aff(m, 12); stress(g, 6); log(g, `${J(s.mate, '과/와')} 탈옥을 꾸몄다.`); return '그날부터 밤마다 번갈아 팠다. 한 사람이 파면 한 사람은 옥졸 발소리를 듣는다. 손톱 밑에 낀 돌가루를 아침마다 죽 그릇에 씻었다.'; }
    if (key === 'tell') {
      const j = jail(g); aff(m, -40); for (const x of mates(g)) if (x !== m) aff(x, -15);
      const xm = jailedNpc(g, s.mateId); if (xm) xm.until += 12;
      if (j && j.months > 1) j.months -= Math.min(j.months - 1, 2);
      stress(g, 8); log(g, `${J(s.mate, '을/를')} 고자질했다.`);
      return `다음 날 옥졸들이 들이닥쳐 짚을 다 뒤집었다. ${J(s.mate, '은/는')} 끌려가면서 나를 한 번 보았다. 형기가 조금 줄었다. 그 눈빛은 줄지 않았다.`;
    }
    aff(m, -4); return `돌아누웠다. ${J(s.mate, '은/는')} 한참 나를 보다가 숟가락을 다시 짚 밑에 넣었다. 그 뒤로 밤마다 아주 작게 긁는 소리가 들렸다. 귀를 막았다.`;
  },
});

defineScene('pr_break', {
  title: () => '그날 밤',
  text: (g, s) => `${J(s.mate, '이/가')} 속삭였다. "오늘이다. 비가 오니 옥졸이 일찍 들어간다." 하수구 창살이 빠졌다. 그 너머는 악취와 어둠이다. 밖에 나가면 쫓기는 몸이 된다. 남으면 ${mon(s.left)} 남았다.`,
  choices: () => [{ label: '기어 들어간다', key: 'go' }, { label: '마지막에 그만둔다', key: 'stay' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.break = mi(g); const stay = st.stay;
    const m = byId(g, s.mateId); const xm = jailedNpc(g, s.mateId);
    if (stay) stay.plot = 0;
    if (key === 'stay') { aff(m, -10); if (xm && rng.chance(0.6)) { freeNpc(g, xm, 'escaped'); S(g).broke += 1; return `${J(s.mate, '은/는')} 혼자 들어갔다. 새벽까지 아무 소리도 없었다. 아침에 옥졸들이 빈 짚자리를 보고 소리를 질렀다. 나는 그 사람이 어디쯤 갔을지 생각했다.`; } return '고개를 저었다. 동료가 나를 노려보다 혼자 들어갔다. 얼마 안 가 개 짖는 소리와 횃불이 쏟아졌다. 끌려 돌아오는 그 사람과 눈이 마주쳤다.'; }
    const c = crimeState(g); const j = jail(g);
    const power = (c.craft ?? 0) * 0.4 + (g.player.stats.agi ?? 30) * 0.4 + (c.contacts ?? 0) * 2 + (stay?.bribed ? 8 : 0) + (stay?.gang === 'in' ? 6 : 0);
    if (j && rng.chance(clamp(power / 90, 0.25, 0.75))) {
      const place = j.place;
      c.jailed = null; reportCrime(g, 'jailbreak', place); c.heat[place] = 100;
      if (stay) stay.how = 'escaped';
      // 그 고장에 남으면 곧 붙잡힌다: 이웃 고장으로 숨어든다
      const away = Object.keys(PLACES[place]?.links ?? {}).filter((k) => PLACES[k] && (!PLACES[k].hidden || PLACES[k].open?.(g))); // 아직 아무도 안 사는 숨은 고장으로는 숨지 못한다
      if (away.length && L(g).place === place) { L(g).place = rng.pick(away); L(g).travel = null; }
      if (xm) { freeNpc(g, xm, 'escaped'); S(g).broke += 1; }
      aff(m, 15);
      note(g, `${placeName(place)} 감옥을 빠져나왔다.`); chron(g, `${g.player.name}, ${placeName(place)} 감옥 하수구로 탈옥하다.`, 60);
      return `무릎으로 기었다. 얼마나 기었는지 모른다. 쇠창살 하나를 더 밀자 강물 소리가 들렸다. ${J(s.mate, '과/와')} 둑 위에 엎드려 숨을 몰아쉬었다. 하늘이 넓었다. 날이 밝기 전에 이웃 고장으로 가는 짐수레에 숨어 올랐다. 이제부터 ${placeName(place)} 경비대 전부가 내 얼굴을 찾는다.`;
    }
    if (j) { j.months += 6; j.total += 6; }
    if (xm) xm.until += 12;
    g.player.injuries.push({ name: '탈옥하다 붙잡혀 맞은 등', months: 2 }); stress(g, 15);
    return '하수구 끝에 새 창살이 박혀 있었다. 누가 일러바친 것이다. 돌아 나오는 길목에 횃불이 기다리고 있었다. 형기에 여섯 달이 붙었다. 누가 일렀는지는 끝내 모른다.';
  },
});

defineScene('pr_sick', {
  title: () => '옥중 열병',
  text: (g, s) => `감방에 열병이 돈다. ${J(s.mate, '이/가')} 사흘째 일어나지 못한다. 나도 이마가 뜨겁다. 옥졸은 문 앞에 오지도 않고 죽 그릇을 밀어 넣는다.`,
  choices: (g, s) => [...(g.player.money >= 8 ? [{ label: '옥졸에게 은화 8을 주고 약초꾼을 부른다', key: 'pay' }] : []), { label: `내 담요를 ${s.mate}에게 덮어 준다`, key: 'share' }, { label: '혼자 버틴다', key: 'alone' }],
  resolve(g, rng, s, key) {
    S(g).done.sick = mi(g);
    const m = byId(g, s.mateId);
    if (key === 'pay') { g.player.money -= 8; aff(m, 15); return '약초꾼 노파가 쓴 물을 끓여 왔다. 둘 다 그걸 마셨다. 열은 닷새 만에 내렸다. 옆 감방에서는 그러지 못한 사람이 하나 들려 나갔다.'; }
    if (key === 'share') { aff(m, 20); if (rng.chance(0.5)) g.player.injuries.push({ name: '옥중 열병', months: 2 }); return `담요를 덮어 주었다. 밤새 떨었다. 새벽에 ${J(s.mate, '이/가')} 눈을 뜨고 담요를 내 쪽으로 반 밀어 주었다. 둘이 반씩 덮고 열이 내리기를 기다렸다.`; }
    if (rng.chance(0.5)) g.player.injuries.push({ name: '옥중 열병', months: 2 });
    stress(g, 8); return '벽에 등을 대고 이를 악물었다. 열은 왔다 갔다 했다. 열흘 뒤 일어나 보니 동료의 자리가 비어 있었다. 아무도 어디로 갔는지 말해 주지 않았다.';
  },
});

defineScene('pr_quarry', {
  title: () => '무너지는 돌무더기',
  text: (g, s) => `채석장 위쪽에서 우르릉 소리가 났다. 돌무더기가 미끄러진다. 바로 아래에서 ${J(s.mate, '이/가')} 사슬에 발이 묶인 채 돌을 나르고 있다. 감독관이 "물러서!" 하고 소리쳤다.`,
  choices: () => [{ label: '사슬을 잡아당겨 끌어낸다', key: 'save' }, { label: '물러선다', key: 'back' }],
  resolve(g, rng, s, key) {
    S(g).done.quarry = mi(g);
    const m = byId(g, s.mateId);
    if (key === 'save') {
      aff(m, 30);
      const j = jail(g); if (j && j.months > 1 && rng.chance(0.5)) j.months -= 1;
      if (rng.chance(0.4)) g.player.injuries.push({ name: '돌에 찧인 다리', months: 2 });
      return `사슬을 감아쥐고 온몸으로 당겼다. 둘이 같이 나뒹군 자리를 돌덩이가 덮었다. 감독관이 한참 우리를 보더니 장부에 무언가를 적었다. ${J(s.mate, '은/는')} 그날 밤 아무 말 없이 내 발목 헝겊을 새로 감아 주었다.`;
    }
    stress(g, 10); aff(m, -6); return `물러섰다. 먼지가 가라앉자 ${J(s.mate, '이/가')} 돌무더기 옆에 주저앉아 있었다. 다리를 절었지만 살았다. 그날 밤 그 사람은 나를 보지 않았다.`;
  },
});

/* ---------- 장면: 나온 뒤 ---------- */
defineScene('pr_release', {
  title: () => '옥문 앞',
  text: (g, s) => `${s.how === 'early' ? '생각보다 일찍' : `${mon(s.months)} 만에`} 옥문이 열렸다. 햇빛에 눈을 뜰 수가 없다. ${s.who ? `문 앞에 ${J(s.who, '이/가')} 서 있다. 언제부터 기다렸는지 모른다.` : '문 앞에는 아무도 없다. 바람에 먼지만 날린다.'}`,
  choices: (g, s) => [{ label: s.who ? `${J(s.who, '과/와')} 집으로 간다` : '천천히 집으로 걷는다', key: 'home' }, { label: '먼저 목욕간에 들러 옥 냄새를 씻는다', key: 'wash' }, ...(s.gang ? [{ label: '패거리가 일러 준 주점으로 간다', key: 'gang' }] : [])],
  resolve(g, rng, s, key) {
    S(g).done.release = mi(g);
    const p = byId(g, s.whoId);
    if (key === 'home') { aff(p, 8); stress(g, -10); return s.who ? `${J(s.who, '이/가')} 내 짐 보따리를 받아 들었다. 둘 다 아무 말도 하지 않았다. 집에 오니 상에 따뜻한 국이 올라 있었다. 숟가락을 드는 손이 떨렸다.` : '아무도 없는 길을 걸었다. 다들 나를 보았지만 아무도 인사하지 않았다. 집 문을 열자 먼지 냄새가 났다. 그래도 내 집이었다.'; }
    if (key === 'wash') { stress(g, -6); g.player.money = Math.max(0, g.player.money - 1); return '뜨거운 물에 몸을 담갔다. 물이 금세 잿빛이 되었다. 세 번을 갈았다. 거울 속 사람이 낯설었다. 수염을 깎고 나서야 조금 나 같아졌다.'; }
    const c = crimeState(g); c.contacts = (c.contacts ?? 0) + 2; c.craft = Math.min(100, (c.craft ?? 0) + 2);
    return '주점 뒷방에 낯익은 얼굴들이 있었다. 옥에서 보던 얼굴, 이름만 듣던 얼굴. 술잔이 먼저 돌았다. "이제 너도 우리 사람이다." 바깥 세상이 생각보다 좁았다.';
  },
});

defineScene('pr_mark', {
  title: () => '따라다니는 이름',
  text: (g, s) => s.mk === 'work'
    ? `일자리를 얻으러 간 집 주인이 장부를 덮었다. "${s.place} 감옥에 있다 나왔다면서? 우리 집엔 은그릇이 많아서." 뒤에서 일꾼들이 수군거린다.`
    : `우물가에서 아낙들이 이야기를 멈췄다. 누가 아이 손을 끌어 집 안으로 들였다. 내가 지나가자 다시 이야기가 시작되었다. "${s.place} 감옥..." 그 말만 들렸다.`,
  choices: () => [{ label: '옥살이 이야기를 있는 그대로 한다', key: 'truth' }, { label: '못 들은 척 지나간다', key: 'pass' }, { label: '이 고장을 떠날 생각을 한다', key: 'leave' }],
  resolve(g, rng, s, key) {
    S(g).done.mark = mi(g);
    if (key === 'truth') { const ok = rng.chance(0.45 + (g.player.stats.cha ?? 30) / 200); if (ok) { stress(g, -6); L(g).renown = (L(g).renown ?? 0) + 1; return '무엇 때문에 갇혔는지, 안에서 무엇을 보았는지 말했다. 듣던 사람 하나가 고개를 끄덕였다. "나도 젊을 때 한 번 갔다 왔소." 다음 날 그 사람이 일을 하나 주었다.'; } stress(g, 6); return '있는 그대로 말했다. 듣는 얼굴들이 더 굳어졌다. 솔직함이 늘 통하는 건 아니었다.'; }
    if (key === 'pass') { gainStat(g, 'wil', 0.3); stress(g, 4); return '고개를 들고 지나갔다. 등 뒤에서 수군거림이 따라왔다. 그것도 언젠가는 지칠 것이다. 나보다 먼저.'; }
    stress(g, 2); return '밤에 지도를 펴 보았다. 나를 모르는 고장들의 이름이 많았다. 당장 떠나지는 않았다. 하지만 떠날 수 있다는 것만으로 숨이 조금 쉬어졌다.';
  },
});

defineScene('pr_old', {
  title: () => '옛 감방 동료',
  text: (g, s) => `해 질 녘 누가 문을 두드렸다. ${s.mate}. 감방에서 ${s.good ? '담요를 나눠 덮던' : '등을 맞대고 자던'} 사람이다. 행색이 초라하다. "${s.ask === 'hide' ? '쫓기고 있어. 사흘만 재워 줘.' : s.ask === 'job' ? '나온 뒤로 아무도 일을 안 줘. 너라면 알잖아.' : '한탕 있어. 너만 끼면 돼. 그때 빚 갚는 셈 치고.'}"`,
  choices: (g, s) => [{ label: s.ask === 'hide' ? '광에 숨겨 준다' : s.ask === 'job' ? '일자리를 알아봐 준다' : '한탕에 낀다', key: 'yes' }, { label: '은화 몇 닢을 쥐여 돌려보낸다', key: 'coin' }, { label: '문을 닫는다', key: 'no' }],
  resolve(g, rng, s, key) {
    S(g).done.old = mi(g);
    const p = byId(g, s.mateId);
    if (key === 'yes') {
      aff(p, 20);
      if (s.ask === 'hide') { if (rng.chance(0.25)) { const c = crimeState(g); c.heat[here(g)] = clamp((c.heat[here(g)] ?? 0) + 25, 0, 100); return '사흘째 밤, 경비대가 골목을 뒤졌다. 광 문 앞에서 발소리가 멈췄다가 지나갔다. 그 사람은 새벽에 떠났다. 경비대장이 그 뒤로 내 집 앞을 자주 지나간다.'; } return '광에 짚을 깔아 주었다. 사흘째 새벽에 그 사람은 사라졌다. 짚 위에 나무를 깎아 만든 작은 새 하나가 놓여 있었다. 감방에서 늘 깎던 그것이었다.'; }
      if (s.ask === 'job') { L(g).renown = (L(g).renown ?? 0) + 1; return '아는 공방에 데려가 내가 보증을 섰다. 주인이 미심쩍어하다 받아 주었다. 석 달 뒤 그 사람이 첫 품삯으로 산 술병을 들고 왔다.'; }
      const c = crimeState(g); const ok = rng.chance(0.5 + (c.craft ?? 0) / 300);
      if (ok) { g.player.money += 30; c.craft = Math.min(100, (c.craft ?? 0) + 2); return '창고 뒷문은 그 사람 말대로 열려 있었다. 은화 서른 닢이 내 몫이었다. 돌아오는 길에 둘 다 웃었다. 옥에서처럼.'; }
      reportCrime(g, 'burglary', here(g)); stress(g, 10); return '창고 안에 경비가 기다리고 있었다. 둘 다 담을 넘어 달아났다. 이름은 들키지 않았기를 빈다. 그 사람은 그날 밤 다른 고장으로 떠났다.';
    }
    if (key === 'coin') { const n = Math.min(5, g.player.money); g.player.money -= n; aff(p, 3); return `은화 ${n}닢을 쥐여 주었다. 그 사람은 은화를 보다가 나를 보았다. "그래. 너는 나왔구나. 진짜로." 그렇게 말하고 갔다.`; }
    aff(p, -20); stress(g, 6); return '문을 닫았다. 문 너머에서 한참 아무 소리도 없다가 발소리가 멀어졌다. 그날 밤 감방 꿈을 꾸었다. 오랜만이었다.';
  },
});

/* ---------- 장면: 갇힌 식구 ---------- */
defineScene('pr_kin', {
  title: () => '갇힌 식구',
  text: (g, s) => `${J(s.who, '이/가')} ${s.why} 붙잡혀 ${s.place} 감옥에 갇혔다는 소식이 왔다. 형기는 ${mon(s.left)} 남았다. 옥졸 하나가 은화 ${s.cost}닢이면 장부를 고쳐 줄 수 있다고 귀띔했다.`,
  choices: (g, s) => [...(g.player.money >= s.cost ? [{ label: `은화 ${s.cost}닢으로 빼낸다`, key: 'bribe' }] : []), { label: '청원서를 써서 영주 집사를 찾아간다', key: 'plea' }, { label: '면회를 가서 먹을 것을 넣어 준다', key: 'visit' }, { label: '제 죄는 제가 갚는 거라며 둔다', key: 'leave' }],
  resolve(g, rng, s, key) {
    S(g).done.kin = mi(g);
    const p = byId(g, s.id); const x = jailedNpc(g, s.id);
    if (key === 'bribe') { g.player.money -= s.cost; if (rng.chance(0.75) && x) { freeNpc(g, x, 'freed'); aff(p, 25); log(g, `${J(s.who, '을/를')} 옥에서 빼냈다.`); return `열흘 뒤 ${J(s.who, '이/가')} 해쓱한 얼굴로 문간에 섰다. 아무것도 묻지 않았다. 은화가 어디로 갔는지도 말하지 않았다.`; } stress(g, 8); return '옥졸은 은화를 받고 사라졌다. 다른 감옥으로 옮겨 갔다고 한다. 장부는 고쳐지지 않았다.'; }
    if (key === 'plea') { if (x && rng.chance(0.3 + (g.player.stats.cha ?? 30) / 300)) { x.until = Math.max(mi(g) + 1, x.until - 4); aff(p, 15); return '집사는 청원서를 두 번 읽었다. 넉 달이 줄었다는 쪽지가 왔다. 쪽지를 들고 감옥까지 걸어가 창살 사이로 보여 주었다.'; } aff(p, 6); return '집사는 청원서를 받아 서랍에 넣었다. 답은 없었다. 그래도 내가 다녀간 걸 안 식구는 창살 너머에서 고개를 숙였다.'; }
    if (key === 'visit') { aff(p, 12); g.player.money = Math.max(0, g.player.money - 2); return `보자기에 빵과 마른 고기를 싸 갔다. ${J(s.who, '은/는')} 창살 너머에서 빵을 받아 들고 한참 들여다보았다. "집 냄새가 난다."`; }
    aff(p, -15); return '가지 않았다. 제 죄는 제가 갚는 거라고, 나에게 말했다. 그 말이 맞는지는 밤마다 다시 생각했다.';
  },
});

/* ---------- 매달: 글 ---------- */
function flavor(g, rng) {
  const s = S(g); const now = mi(g);
  if (s.stay) {
    if (now - s.lineAt < 2 || !rng.chance(0.45)) return;
    const m = mates(g)[0]; const gd = guardOf(g);
    const c = { mate: m?.name ?? '감방 동료', guard: gd?.name ?? '옥졸', place: placeName(s.stay.place) };
    line(g, 'in', pickFresh(g, rng, `in${s.stay.kind}`, T.IN[s.stay.kind])(c)); s.lineAt = now;
    return;
  }
  const last = s.past[s.past.length - 1];
  if (last && s.freeAt != null && now - s.freeAt <= 36 && now - s.lineAt >= 6 && rng.chance(0.25)) {
    line(g, 'after', pickFresh(g, rng, 'af', T.AFTER)({ place: placeName(last.place) })); s.lineAt = now;
  }
}

/* ---------- 장면 고르기 ---------- */
function pickMate(g, rng, pred = () => true) { const ms = mates(g).filter(pred); return ms.length ? rng.pick(ms) : null; }
function insideTick(g, rng) {
  const s = S(g); const st = s.stay; const now = mi(g); const j = jail(g);
  if (!j || g.over) return;
  const q = (kind, data) => { if (sceneQueued(g, kind)) return true; queueScene(g, kind, data); s.sceneAt = now; return true; };
  // 꾸민 탈옥의 날: 다른 장면보다 먼저
  if (st.plot === 1 && now - (st.plotAt ?? now) >= 2 && !sceneQueued(g, 'pr_break') && rng.chance(0.6)) {
    const m = byId(g, st.mates[0]) ?? mates(g)[0]; queueScene(g, 'pr_break', { mate: m?.name ?? '동료', mateId: m?.id ?? null, left: j.months }, { first: true }); s.sceneAt = now; return;
  }
  if (L(g).queue.length >= 2) return;
  if (!st.boss && now - st.since <= 1) {
    const ms = mates(g); if (ms.length >= 2) return q('pr_arrive', { where: T.KINDS[st.kind].where(placeName(st.place)), boss: ms[0].name, bossId: ms[0].id, old: ms[1].name, oldId: ms[1].id });
  }
  if (now - s.sceneAt < 2) return;
  const gd = guardOf(g);
  if (!st.bribed && (!s.done.guard || now - s.done.guard >= 6) && rng.chance(0.18)) return q('pr_guard', { guard: gd?.name ?? '옥졸', pk: st.kind });
  if (st.gang == null && st.kind !== 'lockup' && j.total >= 6 && rng.chance(0.12)) {
    const head = makePerson(rng, { sex: 'm', ageMonths: rng.int(30, 50) * 12, job: 'gang_boss' }); head.place = st.place; g.people.push(head);
    lockNpc(g, head, st.place, j.months + 24, rng.pick(WHY));
    return q('pr_gang', { head: head.name, headId: head.id });
  }
  if (st.plot === 0 && j.months >= 3 && !s.done.plot && rng.chance(0.1)) { const m = pickMate(g, rng); if (m) return q('pr_plot', { mate: m.name, mateId: m.id }); }
  // 편지와 면회: 살아 있는 식구
  const fam = [...kinIds(g)].map((id) => byId(g, id)).filter((p) => alive(p) && !p.away && ageYears(p) >= 12 && (p.affection ?? 0) > -20);
  if (fam.length && (!s.done.visit || now - s.done.visit >= 5) && rng.chance(0.14)) {
    const p = rng.pick(fam);
    if (placeOf(p) === st.place || rng.chance(0.35)) return q('pr_visit', { who: p.name, whoId: p.id, food: rng.pick(['보자기에 싼 빵과 치즈가 들어왔다.', '말린 사과 한 줌과 양말 두 켤레를 가져왔다.', '아직 따뜻한 감자떡을 품에 안고 왔다.']) });
    return q('pr_letter', { who: p.name, whoId: p.id, body: rng.pick(['밥은 먹고 있는지. 집은 걱정 마라. 다들 기다린다.', '네 자리는 비워 두었다. 돌아오면 앉으면 된다.', '장터 사람들 말은 신경 쓰지 마라. 우리는 안다.', '겨울이 온다. 담요를 보낸다. 옥졸이 가로채지 않기를.']) });
  }
  if ((!s.done.sick || now - s.done.sick >= 18) && rng.chance(0.05)) { const m = pickMate(g, rng); if (m) return q('pr_sick', { mate: m.name, mateId: m.id }); }
  if (st.kind === 'quarry' && (!s.done.quarry || now - s.done.quarry >= 12) && rng.chance(0.08)) { const m = pickMate(g, rng); if (m) return q('pr_quarry', { mate: m.name, mateId: m.id }); }
}
const freeOut = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.campaign && !g.army?.captive && !L(g).heirPending;
function outsideTick(g, rng) {
  const s = S(g); const now = mi(g);
  if (!freeOut(g) || now - s.sceneAt < 4 || L(g).queue.length >= 2) return;
  const q = (kind, data) => { queueScene(g, kind, data); s.sceneAt = now; return true; };
  const last = s.past[s.past.length - 1];
  if (last && s.freeAt != null) {
    const since = now - s.freeAt;
    if (since <= 36 && playerAge(g) >= 15 && (!s.done.mark || now - s.done.mark >= 18) && rng.chance(0.06)) return q('pr_mark', { mk: rng.chance(0.5) ? 'work' : 'well', place: placeName(last.place) });
    if (since >= 6 && since <= 120 && !s.done.old && rng.chance(0.025)) {
      const m = last.mates.map((id) => byId(g, id)).find((p) => alive(p) && !p.away);
      if (m) return q('pr_old', { mate: m.name, mateId: m.id, good: (m.affection ?? 0) >= 10, ask: rng.pick(last.gang === 'in' ? ['job', 'hide', 'heist', 'heist'] : ['job', 'hide', 'heist']) });
    }
  }
  // 갇힌 식구
  const fam = kinIds(g);
  const x = s.npc.find((y) => !y.end && fam.has(y.id) && y.until - now >= 2 && !y.ev.kin);
  if (x && playerAge(g) >= 16) {
    x.ev.kin = now; const p = byId(g, x.id);
    if (p) return q('pr_kin', { id: p.id, who: p.name, why: x.why, place: placeName(x.place), left: x.until - now, cost: 12 + (x.until - now) * 3 });
  }
}

/* ---------- 플레이어 없이도: NPC 죄수 ---------- */
function npcTick(g, rng) {
  const s = S(g); const now = mi(g);
  const say = (key, pool, c, place) => { if (place === here(g) && rng.chance(0.6)) line(g, 'npc', pickFresh(g, rng, key, pool)(c)); };
  // 풀려나고, 달아나고
  for (const x of s.npc) {
    if (x.end) continue;
    const p = byId(g, x.id);
    if (!p || !p.alive) { x.end = now; x.how = 'dead'; if (p && x.mine) p.away = false; continue; }
    if (x.mine && !p.away) { x.end = now; x.how = 'served'; continue; } // 다른 갈래가 데려간 사람(은퇴해 고향에 돌아옴 등): 옥살이 기록만 닫는다 (41단계 헤드)
    if (S(g).stay?.mates?.includes(x.id) && isJailed(g)) { x.until = Math.max(x.until, now + 1); continue; } // 내 감방 동료는 내가 있는 동안 남는다
    if (now >= x.until) { freeNpc(g, x, 'served'); say('no', T.NPC_OUT, { who: p.name, place: placeName(x.place) }, x.place); continue; }
    if (rng.chance(0.006)) {
      freeNpc(g, x, 'escaped'); s.broke += 1;
      say('ne', T.NPC_ESCAPE, { who: p.name, place: placeName(x.place) }, x.place);
      if (rng.chance(0.4)) { const y = lockNpc(g, p, x.place, (x.until - now) * 2 + 6, '탈옥하다'); y.caught = true; say('nc', T.NPC_CAUGHT, { who: p.name, place: placeName(x.place) }, x.place); }
    }
  }
  // 새로 갇힌다
  if (g.date.month % 3 === 2) {
    const fam = kinIds(g); const m = me(g);
    const open = new Set(s.npc.filter((x) => !x.end).map((x) => x.id));
    const cands = living(g).filter((p) => !p.isPlayer && !p.away && !open.has(p.id) && ageYears(p) >= 16 && ageYears(p) <= 60 && p.id !== m.spouseId);
    let n = 0;
    for (const p of cands) {
      if (n >= 3) break;
      const base = fam.has(p.id) ? 0.006 : SHADY.has(p.job) ? 0.03 : (p.wealth ?? 20) < 15 ? 0.006 : 0.0015;
      if (!rng.chance(base * (has(p, 'greedy') || has(p, 'cruel') ? 2 : 1))) continue;
      const why = SHADY.has(p.job) && rng.chance(0.5) ? rng.pick(['도둑질로', '밀수하다', '술집 싸움 끝에']) : rng.pick(WHY);
      lockNpc(g, p, placeOf(p), rng.int(3, 18), why); n++;
      say('ni', T.NPC_IN, { who: p.name, place: placeName(placeOf(p)), why }, placeOf(p));
    }
  }
  s.npc = s.npc.filter((x) => !x.end || now - x.end < 120);
  if (s.npc.length > 80) s.npc = s.npc.filter((x, i) => !x.end || i >= s.npc.length - 80);
}

function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over) return;
  const j = jail(g);
  const rng = ownRng(g, 11);
  // 갇힘의 시작과 끝 (crime이 세운 jailed를 읽는다)
  let released = null;
  if (j && !s.stay) startStay(g, rng);
  else if (!j && s.stay) released = endStay(g);
  else if (j && s.stay && j.place !== s.stay.place) { endStay(g); startStay(g, rng); }
  if (s.stay && j) s.stay.left = j.months;
  npcTick(g, ownRng(g, 7));
  flavor(g, ownRng(g, 19));
  if (released && released !== 'escaped' && released !== 'exiled' && freeOut(g)) {
    const last = s.past[s.past.length - 1];
    const fam = [...kinIds(g)].map((id) => byId(g, id)).filter((p) => alive(p) && !p.away && ageYears(p) >= 12 && (p.affection ?? 0) > 0);
    const w = fam.length ? ownRng(g, 29).pick(fam) : null;
    queueScene(g, 'pr_release', { how: released, months: last.months, who: w?.name ?? '', whoId: w?.id ?? null, gang: last.gang === 'in' });
    s.sceneAt = mi(g);
    return;
  }
  if (s.stay) insideTick(g, ownRng(g, 23));
  else outsideTick(g, ownRng(g, 23));
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.prison = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g) => {
  const s = S(g);
  // 옥살이는 그 사람의 것이다. 식구들의 기억(NPC 죄수)은 세상에 남는다.
  s.stay = null; s.past = []; s.freeAt = null; s.done = {}; s.sceneAt = mi(g);
});

/* ---------- 화면 연결점 ---------- */
export function prisonLines(g) { return (g.prison?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function prisonLine(g) { return prisonLines(g)[0]?.text ?? null; }
const HOW_WORD = { served: '형기를 다 채웠다', escaped: '탈옥했다', early: '일찍 풀려났다', exiled: '유배지로 끌려갔다' };
const BOSS_WORD = { gave: '우두머리에게 고개를 숙였다', fought: '우두머리와 맞섰다', ward: '늙은 죄수 곁에 붙었다' };
export function prisonInfo(g) {
  const s = S(g); const now = mi(g); const j = jail(g);
  const st = s.stay;
  const fam = kinIds(g);
  return {
    stay: j && !st ? { place: placeName(j.place), kind: T.KINDS[prisonKind(j.place)].name, where: T.KINDS[prisonKind(j.place)].where(placeName(j.place)), left: j.months, served: 0, mates: [], guard: null, bribed: false, gang: false, plot: false, boss: null } : st && j ? {
      place: placeName(st.place), kind: T.KINDS[st.kind].name, where: T.KINDS[st.kind].where(placeName(st.place)),
      left: j.months, served: now - st.since,
      mates: mates(g).map((p) => ({ id: p.id, name: p.name, age: ageYears(p), warm: Math.round(p.affection ?? 0) })),
      guard: guardOf(g)?.name ?? null, bribed: !!st.bribed, gang: st.gang === 'in', plot: st.plot > 0, boss: st.boss ? BOSS_WORD[st.boss] : null,
    } : null,
    past: s.past.map((x) => ({ place: placeName(x.place), kind: T.KINDS[x.kind]?.name ?? '', months: x.months, how: HOW_WORD[x.how] ?? '', y: x.y })),
    marked: s.freeAt != null && now - s.freeAt <= 36,
    kin: s.npc.filter((x) => !x.end && fam.has(x.id)).map((x) => ({ id: x.id, name: byId(g, x.id)?.name ?? '', place: placeName(x.place), left: Math.max(0, x.until - now), why: x.why })),
    npc: s.npc.filter((x) => !x.end && x.place === here(g)).slice(-6).map((x) => ({ name: byId(g, x.id)?.name ?? '', why: x.why, left: Math.max(0, x.until - now) })),
    any: !!st || s.past.length > 0,
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
