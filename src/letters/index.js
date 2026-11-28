// 18단계: 편지와 먼 인연.
// 떠난 사람과는 편지로만 이어진다. 편지는 늦게 닿고, 길에서 잃고, 남의 손에 뜯기고, 때로는 쓴 사람이 죽은 뒤에 닿는다.
// - 편지 쓰기(letters_write → letters_send): 다른 고장에 사는 식구·자식·벗·옛사랑·의형제에게 쓴다. 보통 전령(은화 1, 가끔 잃음),
//   급사(은화 5, 빠르고 잘 안 잃음), 은화를 넣어 보내기, 연서. 글을 모르면 대서방에 맡긴다(은화 2 더).
// - 받는 편지(letters_arrive): 먼 사람이 형편을 적어 보낸다. 혼인·아이·병·돈 부탁·연서. 쓴 사람이 그사이 죽었으면 '늦게 닿은 편지'.
//   답장을 미루면 정(warmth)이 식고, 세 번 넘게 답이 없으면 더 오지 않는다.
// - 잃은 편지: 전령이 길에서 잃는다. 연서를 잃으면 남의 손에 들어가 소문이 된다.
// - 남의 편지(letters_found): 길에서·여관에서 남의 편지를 손에 넣는다. 그대로 전하거나, 뜯어 읽거나(궁정 비밀, 협박거리, 풀리지 않은 일의 실마리), 태운다.
// - 위조(letters_forge): 글솜씨가 있으면 영주 증서, 거짓 연서, 가문 밀서, 유언장을 꾸민다. 들키면 사기죄.
// - 연서: 배우자가 있는데 옛사랑과 연서를 주고받으면 배우자가 찾아낼 수 있다(love의 mood).
// - 대를 넘는 인연: 대를 이으면 선대의 편지 묶음(letters_bundle)이 남고, 정이 깊던 사람은 자식에게도 편지를 보낸다.
//   선대 앞으로 오던 편지는 자식에게 닿는다. 먼저 간 벗의 자식과 편지를 잇기도 한다.
// 잇는 곳: relations(호감·연정·기억), love(배우자·옛사랑·바람), kin(떠난 자식의 정), court(비밀·가문), mystery(실마리),
// crime(사기·협박), repute(deed), oath(의형제), places(길 달수), heir(대 잇기).
// 상태는 game.letters 하나. 화면 연결점: lettersInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainSkill } from '../game.js';
import { byId, fullName, ageYears, living } from '../npc.js';
import { PLACES, travelMonths } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, spend, canSpend, check } from '../adventure/core.js';
import { remember } from '../relations.js';
import { isJailed, reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { addGrudge } from '../feud/index.js';
import { kinState } from '../kin/index.js';
import { loveState } from '../love/index.js';
import { courtState } from '../court/index.js';
import { liveHouses, houseName } from '../history/nobles.js';
import { M as mysteryOf, culpritOf } from '../mystery/index.js';

const jo = (w, pair) => J(w, pair).slice(w.length);
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const alive = (p) => !!p && p.alive && !p.isPlayer;
const ready = (g) => playerAge(g) >= 10 && !isJailed(g) && !g.over && !L(g).heirPending;
const literate = (g) => (g.player.skills.letters ?? 0) >= 5;

/* ---------- 상태 ---------- */
export function lettersState(g) {
  g.letters ??= {};
  const v = g.letters;
  v.corr ??= {};      // 사람 id → { pid, name, warmth, count, last, unanswered, gen, inherited, stopped }
  v.inbox ??= [];     // 오는 중인 편지 [{ id, from, name, lk, sent, arrive, need, toOld }]
  v.outbox ??= [];    // 가는 중인 편지 [{ id, to, name, sent, arrive, lost, gift, love, secret }]
  v.kept ??= [];      // 간직한 편지 묶음 [{ from, y, line, love }]
  v.forged ??= 0;
  v.opened ??= 0;
  v.seq ??= 1;
  v.sceneAt ??= 0;
  v.arriveAt ??= 0;   // 마지막으로 편지가 닿은 달 (한 달에 한 통만, 두 달 간격)
  v.log ??= [];
  return v;
}
const V = lettersState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
function corrOf(g, p) {
  const v = V(g);
  v.corr[p.id] ??= { pid: p.id, name: fullName(p), warmth: clamp(30 + (p.affection ?? 0) / 2, 10, 90), count: 0, last: null, unanswered: 0, gen: L(g).gen ?? 1, inherited: false, stopped: false };
  return v.corr[p.id];
}
function keep(g, from, line, love = false) {
  const v = V(g);
  v.kept.push({ from, y: g.date.year, line, love });
  if (v.kept.length > 30) v.kept.shift();
}

/* ---------- 누가 먼 사람인가 ---------- */
// 그 사람이 사는 곳 (떠나서 어디 있는지 모르면 null)
function placeOfP(g, p) {
  const r = kinState(g).kids[p.id];
  if (r?.left) return r.left;
  if (p.away) return null;
  return p.place ?? 'ern';
}
const isFar = (g, p) => alive(p) && (p.away || placeOfP(g, p) !== here(g));
// 그 사람과 나의 사이
function kindOf(g, p) {
  const m = me(g);
  if ((m.childIds ?? []).includes(p.id)) return 'kid';
  if (m.spouseId === p.id) return 'spouse';
  if ((g.player.familyIds ?? []).includes(p.id) || m.fatherId === p.id || m.motherId === p.id) return 'kin';
  if (loveState(g).exes.some((x) => x.id === p.id)) return 'ex';
  if (p.bond === 'lover' || (p.romance ?? 0) >= 50) return 'love';
  if ((g.oath?.bonds ?? []).some((b) => b.kind === 'blood' && b.pid === p.id)) return 'sworn';
  if (V(g).corr[p.id]?.inherited) return 'heirloom';
  return 'friend';
}
export const KIND_WORD = { kid: '떠난 자식', spouse: '떨어져 사는 짝', kin: '식구', ex: '옛사랑', love: '마음에 둔 사람', sworn: '의형제', heirloom: '선대의 벗', friend: '먼 벗' };
const warmthWord = (w) => (w >= 75 ? '편지를 기다리는 사이' : w >= 50 ? '꼬박꼬박 오가는 사이' : w >= 25 ? '뜸해진 사이' : '끊어질 듯한 사이');
function candidates(g) {
  const v = V(g);
  return living(g)
    .filter((p) => isFar(g, p) && p.known !== false && ageYears(p) >= 10 && !v.corr[p.id]?.stopped)
    .map((p) => ({ p, k: kindOf(g, p) }))
    .filter(({ p, k }) => k !== 'friend' || (p.affection ?? 0) >= 25 || v.corr[p.id])
    .sort((a, b) => (b.p.affection ?? 0) + (v.corr[b.p.id] ? 20 : 0) - (a.p.affection ?? 0) - (v.corr[a.p.id] ? 20 : 0))
    .slice(0, 4);
}
// 편지가 닿는 달수
function delay(g, rng, p, fast = false) {
  const pl = placeOfP(g, p);
  let d = pl ? travelMonths(here(g), pl) : rng.int(2, 4);
  if (!Number.isFinite(d)) d = 3;
  d = clamp(Math.round(d) + 1, 1, 6);
  return fast ? Math.max(1, Math.ceil(d / 2)) : d;
}

/* ---------- 화면용 ---------- */
export function lettersInfo(g) {
  const v = V(g);
  const now = mi(g);
  const corr = Object.values(v.corr).map((c) => {
    const p = byId(g, c.pid);
    const pl = p ? placeOfP(g, p) : null;
    return {
      name: c.name, kind: p ? kindOf(g, p) : 'friend', kindWord: KIND_WORD[p ? kindOf(g, p) : 'friend'], alive: !!p?.alive,
      place: pl, placeName: pl ? placeName(pl) : '어딘지 모름', warmth: Math.round(c.warmth), warmthWord: warmthWord(c.warmth),
      count: c.count, lastYears: c.last == null ? null : Math.floor((now - c.last) / 12), waiting: c.unanswered, inherited: !!c.inherited, stopped: !!c.stopped,
    };
  }).sort((a, b) => b.warmth - a.warmth);
  return {
    corr, incoming: v.inbox.length, outgoing: v.outbox.length,
    kept: v.kept.slice(-10).map((x) => ({ ...x })), keptCount: v.kept.length,
    forged: v.forged, opened: v.opened, canWrite: candidates(g).length > 0, literate: literate(g),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 편지 쓰기 ---------- */
ACTIONS.push({
  id: 'letters_write', name: '편지 쓰기', icon: 'scroll',
  desc: '다른 고장에 사는 식구·자식·벗·옛사랑에게 편지를 쓴다. 전령 삯이 들고, 닿기까지 몇 달이 걸린다. 글을 모르면 대서방에 맡긴다.',
  available: (g) => ready(g) && !traveling(g) && !sceneQueued(g, 'letters_write') && !sceneQueued(g, 'letters_send') && canSpend(g, literate(g) ? 1 : 3) && candidates(g).length > 0,
  run(g) { queueScene(g, 'letters_write', { ids: candidates(g).map((x) => x.p.id) }); return literate(g) ? '등잔 밑에 종이를 폈다.' : '대서방 앞에 줄을 섰다. 하고 싶은 말을 어떻게 남의 입으로 옮길지 생각했다.'; },
});
defineScene('letters_write', {
  title: () => '누구에게 쓸까',
  text: (g, s) => `먼 데 사는 사람들의 얼굴이 하나씩 떠오른다.\n${s.ids.map((id) => byId(g, id)).filter(alive).map((p) => { const c = V(g).corr[p.id]; const pl = placeOfP(g, p); return `· ${p.name} (${KIND_WORD[kindOf(g, p)]}, ${pl ? placeName(pl) : '어딘지 모름'})${c?.unanswered ? `: 답장을 못 한 편지가 ${c.unanswered}통 있다` : c ? `: ${warmthWord(c.warmth)}` : ''}`; }).join('\n')}`,
  choices: (g, s) => {
    const ps = s.ids.map((id) => byId(g, id)).filter((p) => isFar(g, p));
    if (!ps.length || !canSpend(g, literate(g) ? 1 : 3)) return [];
    return [...ps.map((p) => ({ label: `${p.name}에게 쓴다`, key: `p:${p.id}` })), { label: '쓰다가 접는다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '몇 줄 쓰다가 종이를 접었다. 하고 싶은 말이 글이 되지 않았다.';
    const p = byId(g, Number(key.slice(2)));
    if (!isFar(g, p)) return '그 사람은 이제 멀리 있지 않았다. 편지 대신 얼굴을 보러 가면 된다.';
    queueScene(g, 'letters_send', { to: p.id }, { first: true });
    return `${p.name}에게 무슨 말을 쓸지 정했다.`;
  },
});
function loveOk(g, p) {
  const k = kindOf(g, p);
  return ['ex', 'love', 'spouse'].includes(k) && ageYears(p) >= 15 && playerAge(g) >= 15;
}
defineScene('letters_send', {
  title: (g, s) => `${byId(g, s.to)?.name ?? '먼 사람'}에게`,
  text: (g, s) => {
    const p = byId(g, s.to);
    const pl = p ? placeOfP(g, p) : null;
    return `${pl ? `${placeName(pl)}까지` : '어디 있는지 모르는 사람에게'} 보통 전령은 ${p ? delay(g, { int: () => 3 }, p) : 3}달쯤 걸린다. 길에서 잃는 일도 있다. 급사는 빠르고 확실하지만 비싸다.${literate(g) ? '' : ' 글을 모르니 대서방 사람이 대신 써 준다. 그 사람도 내 편지를 읽는다.'}`;
  },
  choices: (g, s) => {
    const p = byId(g, s.to);
    if (!isFar(g, p)) return [];
    const x = literate(g) ? 0 : 2;
    const out = [];
    if (canSpend(g, 1 + x)) out.push({ label: `보통 전령으로 보낸다 (은화 ${1 + x}닢)`, key: 'plain' });
    if (canSpend(g, 5 + x)) out.push({ label: `급사로 보낸다 (은화 ${5 + x}닢)`, key: 'fast' });
    if (canSpend(g, 11 + x)) out.push({ label: `은화 열 닢을 넣어 보낸다 (은화 ${11 + x}닢)`, key: 'gift' });
    if (loveOk(g, p) && canSpend(g, 1 + x)) out.push({ label: `연서를 쓴다 (은화 ${1 + x}닢)`, key: 'love' });
    if (!out.length) return [];
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '봉투에 넣었다가 다시 꺼냈다. 다음에 쓰기로 했다.';
    const p = byId(g, s.to);
    if (!isFar(g, p)) return '그 사람은 이제 멀리 있지 않았다.';
    const x = literate(g) ? 0 : 2;
    const cost = { plain: 1, fast: 5, gift: 11, love: 1 }[key] + x;
    if (!spend(g, cost)) return '전령 삯이 모자랐다. 편지는 서랍에 들어갔다.';
    const v = V(g);
    const c = corrOf(g, p);
    const fast = key === 'fast';
    const married = me(g).spouseId != null && me(g).spouseId !== p.id;
    const letter = { id: v.seq++, to: p.id, name: p.name, sent: mi(g), arrive: mi(g) + delay(g, rng, p, fast), lost: rng.chance(fast ? 0.03 : 0.12), gift: key === 'gift' ? 10 : 0, love: key === 'love', secret: key === 'love' && married };
    v.outbox.push(letter);
    c.unanswered = 0;
    if (literate(g)) gainSkill(g, 'letters', 0.4, 'int');
    stress(g, -3);
    log(g, `${p.name}에게 편지를 보냈다.`);
    // 연서는 들킬 수 있다: 글 모르는 사람은 대서방에서, 배우자는 집 안에서
    if (letter.secret && rng.chance(literate(g) ? 0.12 : 0.3)) caughtLove(g, rng, p, '보내려던 연서');
    if (key === 'love') return `${p.name}에게 연서를 썼다. 몇 번을 고쳐 썼다. 마지막 줄은 결국 지웠다가 다시 썼다.${letter.secret ? ' 이 편지는 집 안 누구도 보아서는 안 된다.' : ''}`;
    if (key === 'gift') return `편지 사이에 은화 열 닢을 넣고 봉랍을 눌렀다. 전령에게는 "중요한 편지"라고만 했다.`;
    return fast ? '급사가 편지를 품에 넣고 말에 올랐다. 먼지가 일었다.' : `전령 가방에 편지를 넣었다. ${letter.arrive - letter.sent}달쯤 뒤에 닿을 것이다. 닿기는 한다면.`;
  },
});
// 배우자가 연서를 찾아냈다
function caughtLove(g, rng, p, what) {
  const s = loveState(g).spouse;
  const sp = byId(g, me(g).spouseId);
  if (s) s.mood = clamp((s.mood ?? 50) - 25, 0, 100);
  if (alive(sp)) { sp.affection = clamp((sp.affection ?? 0) - 15, -100, 100); remember(g, sp, `${p.name}에게 쓴 연서를 찾아냈다`, -2, { tag: 'letters_love' }); }
  g.news.unshift({ text: `${sp ? J(sp.name, '이/가') : '집사람이'} ${J(what, '을/를')} 찾아냈다. ${p.name}의 이름이 적혀 있었다. 그날 밤 집 안이 얼어붙었다.`, rel: 95 });
  log(g, `${p.name}에게 쓴 연서가 들켰다.`);
}

/* ---------- 받는 편지 ---------- */
// 그 사람이 보낼 편지의 갈래를 형편에서 고른다
function pickLetter(g, rng, p) {
  const k = kindOf(g, p);
  const opts = ['news', 'news'];
  if ((p.wealth ?? 0) < 10 || rng.chance(0.15)) opts.push('need');
  if (ageYears(p) >= 55 || (p.health ?? 80) < 40) opts.push('sick');
  if (['ex', 'love'].includes(k) && ageYears(p) >= 15) opts.push('love', 'love');
  if (p.spouseId != null && rng.chance(0.3)) opts.push('wed');
  return rng.pick(opts);
}
function sendToMe(g, rng, p, { toOld = false } = {}) {
  const v = V(g);
  const lk = pickLetter(g, rng, p);
  const d = delay(g, rng, p);
  v.inbox.push({ id: v.seq++, from: p.id, name: p.name, lk, sent: mi(g), arrive: mi(g) + d, need: lk === 'need' ? rng.int(5, 20) : 0, toOld, lost: rng.chance(0.08) });
}
const greet = (g, p) => ({ kid: '어머니 아버지께', kin: '보고 싶은 식구에게', ex: '잘 지내는지', love: '그대에게', spouse: '당신에게', sworn: '형제에게', heirloom: '선대의 벗의 자식에게', friend: '오랜 벗에게' }[kindOf(g, p)] ?? '먼 데서');
function letterBody(g, l, p) {
  const n = l.name;
  const pl = p ? placeOfP(g, p) : null;
  const where = pl ? placeName(pl) : '먼 데';
  const kids = p ? (p.childIds ?? []).filter((id) => byId(g, id)?.alive).length : 0;
  switch (l.lk) {
    case 'need': return `"${greet(g, p)}. 부끄러운 말이지만, 올해 ${where} 살림이 많이 어렵네. 은화 ${l.need}닢만 있으면 겨울을 날 수 있겠어. 갚을 날은 꼭 오겠지." ${n}의 글씨가 흔들려 있다.`;
    case 'sick': return `"${greet(g, p)}. 요즘 기침이 멎지 않아. 의원은 걱정 말라는데, 얼굴은 그렇게 말하지 않더군. 혹시 모르니 쓴다. 잘 살아." ${n}의 편지는 평소보다 짧았다.`;
    case 'love': return `"${greet(g, p)}. 이런 편지를 써도 되는지 모르겠어. ${where}의 밤은 길고, 자꾸 그대 생각이 나." 종이에서 희미하게 향 냄새가 났다. ${J(n, '이/가')} 보낸 연서다.`;
    case 'wed': return `"${greet(g, p)}. 여기서 짝을 만나 살림을 차렸어.${kids ? ` 아이가 ${kids}이나 된다네.` : ''} 언젠가 한번 들러 줘." ${n}의 글씨가 웃고 있었다.`;
    default: {
      // 49단계 헤드 부탁: 다른 사람이 같은 달에 같은 틀로 쓰지 않게, 편지 차례(id)로 틀을 돌린다
      const k = (l.lid ?? l.id ?? 0) % 4;
      const kidL = kids ? [' 아이들은 잘 커.', ' 아이들이 부쩍 컸어.', ' 아이들 뒤치다꺼리에 하루가 짧아.', ' 아이들은 아프지 않고 잘 커.'][k] : '';
      if (k === 1) return `"${greet(g, p)}. 오랜만에 붓을 든다. ${where} 살이도 이제 몸에 붙었어. ${newsLine(g, l, n)}${kidL} 답장 기다릴게." ${n}의 편지다.`;
      if (k === 2) return `"${greet(g, p)}. 별일은 없어. ${newsLine(g, l, n)}${kidL} ${where} 사람들도 이제 내 얼굴을 알아." 짧은 편지 끝에 ${n}의 이름이 적혀 있다.`;
      if (k === 3) return `"${greet(g, p)}. 지나가는 장사꾼 편에 몇 자 적어 보낸다. ${newsLine(g, l, n)}${kidL} 그쪽은 어때?" ${where}에서 ${J(n, '이/가')} 보낸 편지다.`;
      return `"${greet(g, p)}. ${where}에서 그럭저럭 지내. ${newsLine(g, l, n)}${kidL} 그쪽 소식도 알려 줘." ${n}의 편지다.`;
    }
  }
}
// 편지 속 그쪽 형편: 보낸 달의 철과 세상 일을 안다 (30단계 헤드: 백 년 내내 '장터 물가가 또 올랐고, 지난달엔 큰비가 왔어'였다)
function newsLine(g, l, n) {
  const sent = l.sent ?? 0, m = (sent % 12) + 1, h = [...String(n) + sent].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const pick = (a) => a[h % a.length];
  if (g.world?.plague) return pick(['돌림병 소문에 장터가 한산해. 다들 문을 닫고 지내.', '이웃 마을에 병이 돈대. 우물물을 끓여 마시고 있어.']);
  if (g.world?.famine) return pick(['올해는 밀이 귀해서 다들 허리띠를 졸라매고 있어.', '빵값이 두 배가 됐어. 그래도 굶지는 않아.']);
  const season = m <= 2 || m === 12 ? ['여긴 벌써 눈이 무릎까지 왔어. 장작 패느라 팔이 아파.', '겨울이 길어. 화롯가에서 이 편지를 쓴다.']
    : m <= 5 ? ['밭에 씨를 다 뿌렸어. 올해는 비가 제때 와 주면 좋겠는데.', '들판에 꽃이 피었어. 그쪽도 봄이겠지.']
    : m <= 8 ? ['더위에 우물이 얕아졌어. 저녁마다 강가에 나가 앉아 있어.', '보리를 거둬들였어. 허리가 끊어질 것 같아.']
    : ['추수가 끝났어. 올해 곳간은 그럭저럭 찼어.', '잎이 지기 시작했어. 겨울 날 장작을 쌓아 두고 있어.'];
  return pick([...season, '일은 고되지만 밥은 먹고 산다.', '장터 물가가 또 올랐어. 소금값은 말도 마.']);
}
defineScene('letters_arrive', {
  title: (g, s) => (s.dead ? '늦게 닿은 편지' : s.lk === 'love' ? '연서' : `${s.name}의 편지`),
  text: (g, s) => {
    const p = byId(g, s.from);
    const body = letterBody(g, s, p);
    if (s.dead) return `${body}\n봉투에 적힌 날짜는 ${s.months}달 전이다. 그 사이 ${J(s.name, '은/는')} 세상을 떠났다. 이 편지를 쓸 때는 살아 있었다.`;
    if (s.toOld) return `선대 앞으로 온 편지다. 부고를 듣지 못한 모양이다.\n${body}`;
    return body;
  },
  choices: (g, s) => {
    const p = byId(g, s.from);
    if (s.dead) {
      const kid = deadKid(g, p);
      return [{ label: '간직한다', key: 'keep' }, kid ? { label: `그 자식 ${kid.name}에게 편지를 쓴다`, key: `kid:${kid.id}` } : null, { label: '불에 태워 보낸다', key: 'burn' }].filter(Boolean);
    }
    if (!alive(p)) return [];
    const out = [];
    out.push({ label: '간직한다', key: 'keep' });
    if (canSpend(g, literate(g) ? 1 : 3) && isFar(g, p)) out.push({ label: s.toOld ? '선대가 세상을 떠났다고 답장한다' : '답장을 쓴다', key: 'reply' });
    if (s.lk === 'need' && canSpend(g, s.need + 1)) out.push({ label: `은화 ${s.need}닢을 부쳐 준다`, key: 'send' });
    if (s.lk === 'love') out.push({ label: '태워 버린다', key: 'burn' });
    return out;
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    const p = byId(g, s.from);
    if (s.dead) {
      if (key === 'keep') { keep(g, s.name, '죽은 뒤에 닿은 편지', false); stress(g, 4); return `편지를 몇 번이고 다시 읽었다. 이 글씨를 쓴 손은 이제 없다. 편지를 상자 맨 위에 넣었다.`; }
      if (key === 'burn') { stress(g, 2); return '편지를 불에 넣었다. 연기가 굴뚝으로 올라갔다. 그쪽으로 가는 길이 있다면 그렇게 닿기를.'; }
      const kid = byId(g, Number(key.slice(4)));
      if (!alive(kid)) return '그 집 자식도 이미 고장을 떠났다고 했다.';
      const c = corrOf(g, kid);
      c.warmth = Math.max(c.warmth, 55); c.inherited = true;
      kid.known = true; kid.affection = clamp((kid.affection ?? 0) + 15, -100, 100);
      remember(g, kid, `${s.name}의 마지막 편지 이야기를 전했다`, 2, { tag: 'letters' });
      sendToMe(g, rng, kid);
      log(g, `${s.name}의 자식 ${kid.name}에게 편지를 이었다.`);
      return `${J(kid.name, '은/는')} 자기 부모가 마지막으로 쓴 편지가 내게 닿았다는 걸 몰랐을 것이다. 그 이야기를 적어 보냈다. 이제 편지는 다음 대로 이어진다.`;
    }
    if (!alive(p)) return '그 사람은 이미 세상에 없었다.';
    const c = corrOf(g, p);
    if (key === 'send') {
      if (!spend(g, s.need + 1)) return '부칠 돈이 모자랐다. 답장에 미안하다고만 썼다.';
      v.outbox.push({ id: v.seq++, to: p.id, name: p.name, sent: mi(g), arrive: mi(g) + delay(g, rng, p), lost: rng.chance(0.1), gift: s.need, love: false, secret: false });
      c.unanswered = 0;
      return `은화 ${s.need}닢을 싸서 보냈다. 닿기를 빈다. 길에는 도둑도 많고 전령도 사람이다.`;
    }
    if (key === 'reply') {
      if (!spend(g, literate(g) ? 1 : 3)) return '전령 삯이 없어 답장은 다음으로 미뤘다.';
      v.outbox.push({ id: v.seq++, to: p.id, name: p.name, sent: mi(g), arrive: mi(g) + delay(g, rng, p), lost: rng.chance(0.12), gift: 0, love: s.lk === 'love', secret: s.lk === 'love' && me(g).spouseId != null && me(g).spouseId !== p.id });
      c.unanswered = 0;
      if (s.toOld) { c.inherited = true; return `"보내 주신 편지는 선대가 떠난 뒤에 닿았습니다." 그렇게 시작하는 답장을 썼다. 쓰다 보니 길어졌다.`; }
      return s.lk === 'love' ? '답장을 썼다. 무엇을 썼는지는 나와 그 사람만 안다.' : '답장을 썼다. 이쪽 소식, 날씨, 아이들, 별것 아닌 이야기들. 별것 아닌 이야기가 제일 오래 남는다.';
    }
    if (key === 'burn') {
      c.warmth = Math.max(0, c.warmth - 20);
      return '연서를 등잔불에 댔다. 종이가 오그라들며 글자가 하나씩 사라졌다.';
    }
    keep(g, s.name, s.lk === 'love' ? '연서' : s.lk === 'need' ? '돈을 부탁한 편지' : s.lk === 'sick' ? '앓는다는 편지' : '안부 편지', s.lk === 'love');
    if (s.lk === 'love' && me(g).spouseId != null && me(g).spouseId !== p.id && rng.chance(0.15)) caughtLove(g, rng, p, `${p.name}의 연서`);
    return '편지를 접어 상자에 넣었다. 답장은 다음에 쓰기로 했다.';
  },
});
function deadKid(g, p) {
  if (!p) return null;
  return (p.childIds ?? []).map((id) => byId(g, id)).find((k) => alive(k) && ageYears(k) >= 14 && !(me(g).childIds ?? []).includes(k.id)) ?? null;
}

/* ---------- 남의 편지 ---------- */
const FOUND = {
  court: { text: (s) => `${s.house}의 봉랍이 찍힌 편지다. 받는 이는 다른 가문의 집사.` },
  love: { text: (s) => `분홍 끈으로 묶은 편지다. 받는 이는 이 고장 유부녀 ${s.who}.` },
  debt: { text: (s) => `빚 독촉 편지다. 보내는 이는 고리대금업자, 받는 이는 ${s.who}.` },
  crime: { text: () => '봉투 겉에 아무것도 적혀 있지 않다. 안에서 단단한 것이 만져진다. 열쇠 같다.' },
  plain: { text: (s) => `어머니가 군대 간 아들 ${s.who}에게 보내는 편지 같다. 봉투가 비에 젖었다.` },
};
defineScene('letters_found', {
  title: () => '남의 편지',
  text: (g, s) => `${s.how} ${FOUND[s.lk].text(s)} 봉랍은 아직 그대로다.`,
  choices: (g) => (ready(g) ? [{ label: '받는 사람에게 전해 준다', key: 'pass' }, { label: '몰래 뜯어 읽는다', key: 'open' }, { label: '불 속에 던진다', key: 'burn' }] : []),
  resolve(g, rng, s, key) {
    const v = V(g);
    if (key === 'pass') { deed(g, 'honest', 2, null); if (rng.chance(0.4)) { g.player.money += 3; return '편지를 전해 주었다. 받는 사람이 은화 세 닢을 쥐여 주었다. 봉랍이 그대로인 걸 확인하고서야.'; } return '편지를 전해 주었다. 받는 사람은 고맙다는 말도 없이 문을 닫았다. 그래도 마음은 가볍다.'; }
    if (key === 'burn') { if (s.lk === 'plain') { stress(g, 4); return '왜 태웠는지 스스로도 모르겠다. 어느 어머니의 말이 아들에게 닿지 않게 되었다.'; } return '편지가 재가 되었다. 거기 무엇이 적혀 있었든, 이제 아무도 모른다.'; }
    v.opened += 1;
    deed(g, 'honest', -1, null);
    if (!check(rng, (g.player.stats.agi ?? 0) * 0.5 + (g.player.skills.letters ?? 0) * 0.4, 25)) {
      deed(g, 'honest', -3, '남의 편지를 뜯어 보다 들켰다더라');
      return '봉랍이 깨지는 소리가 너무 컸다. 옆자리 사내가 나를 빤히 보았다. 소문은 나보다 빨리 걷는다.';
    }
    if (s.lk === 'court') {
      const c = courtState(g);
      c.secrets.push({ house: s.hid, what: `${s.house}의 밀서`, power: rng.int(1, 2), at: mi(g) });
      if (c.secrets.length > 12) c.secrets.shift();
      return `칼날을 데워 봉랍을 떼고 읽었다. ${s.house}${jo(s.house, '이/가')} 다른 가문과 손을 잡으려 한다. 다시 봉하고 보냈다. 이 비밀은 궁정에서 쓸 날이 올 것이다.`;
    }
    if (s.lk === 'love') {
      if (rng.chance(0.5)) { g.player.money += 15; if (rng.chance(0.3)) reportCrime(g, 'blackmail', here(g), { mult: 0.5 }); return `편지를 쥐고 ${s.who}의 집 뒷문을 두드렸다. 은화 열다섯 닢이 나왔다. 그 눈빛은 평생 나를 기억할 것이다.`; }
      return `연서였다. 남의 집 일이다. 다시 봉해서 길에 두고 왔다. 읽은 것만은 지울 수 없다.`;
    }
    if (s.lk === 'crime') {
      const c = (mysteryOf(g).cases ?? []).find((x) => x.place === here(g) && x.state === 'open');
      const cul = c ? culpritOf(c) : null;
      if (c && cul) { cul.pointed = true; c.heat += 1; c.clues.push(`가로챈 편지 속 열쇠가 ${J(cul.name, '을/를')} 가리킨다.`); if (c.clues.length > 8) c.clues.shift(); return `열쇠 하나와 쪽지. 쪽지에 적힌 이름을 보고 숨이 멎었다. ${c.victim} 일과 이어진다. ${J(cul.name, '이/가')} 수상하다.`; }
      g.player.money += 8;
      return '열쇠와 함께 창고 자리가 적혀 있었다. 가 보니 장물 꾸러미가 있었다. 은화 여덟 닢어치를 챙겼다.';
    }
    if (s.lk === 'debt') return `${J(s.who, '은/는')} 빚이 은화 이백 닢이다. 이 고장에서 알 만한 사람이다. 언젠가 이 일을 쓸 데가 있을지 모른다.`;
    stress(g, 3);
    return '읽고 나니 마음이 무거웠다. "밥 거르지 말고." 그 한 줄이 오래 남았다. 다시 봉해 보냈다.';
  },
});

/* ---------- 위조 ---------- */
const FORGE = {
  seal: { name: '영주 인장을 흉내 낸 통행·세금 면제 증서', diff: 45, gain: [20, 40] },
  love: { name: '거짓 연서로 사이 갈라놓기', diff: 35, gain: [0, 0] },
  house: { name: '다른 가문 명의의 거짓 밀서', diff: 55, gain: [0, 0] },
  will: { name: '죽은 부자의 유언장', diff: 65, gain: [50, 90] },
};
ACTIONS.push({
  id: 'letters_forge', name: '편지 위조', icon: 'scroll',
  desc: '남의 글씨와 인장을 흉내 낸다. 증서, 연서, 밀서, 유언장. 들키면 사기죄다. 글솜씨가 있어야 한다.',
  available: (g) => playerAge(g) >= 15 && ready(g) && !traveling(g) && (g.player.skills.letters ?? 0) >= 25 && !sceneQueued(g, 'letters_forge'),
  run(g) { queueScene(g, 'letters_forge', {}); return '문을 걸어 잠그고 남의 글씨를 따라 써 보았다.'; },
});
function forgeTarget(g) {
  return living(g).find((p) => !p.isPlayer && p.known && p.spouseId != null && !isFar(g, p) && (p.affection ?? 0) < 0 && byId(g, p.spouseId)?.alive) ?? null;
}
defineScene('letters_forge', {
  title: () => '남의 글씨',
  text: (g) => `글씨는 버릇이다. 획을 꺾는 자리, 잉크가 몰리는 자리를 익히면 남의 손이 된다. 내 글솜씨는 ${Math.round(g.player.skills.letters ?? 0)}. 들키면 사기죄다.`,
  choices: (g) => {
    if (!ready(g)) return [];
    const out = [{ label: `${FORGE.seal.name}`, key: 'seal' }];
    const t = forgeTarget(g);
    if (t) out.push({ label: `${t.name} 부부 사이에 거짓 연서를 흘린다`, key: `love:${t.id}` });
    const hs = liveHouses(g);
    if (hs.length >= 2) out.push({ label: `${houseName(hs[0])} 명의로 거짓 밀서를 꾸민다`, key: `house:${hs[0].id}` });
    out.push({ label: FORGE.will.name, key: 'will' }, { label: '붓을 내려놓는다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '종이를 태웠다. 남의 손이 되는 일은 생각보다 무섭다.';
    const [k, id] = key.split(':');
    const f = FORGE[k];
    const v = V(g);
    const ok = check(rng, (g.player.skills.letters ?? 0) * 0.8 + (g.player.stats.int ?? 0) * 0.3 + (g.player.stats.agi ?? 0) * 0.2, f.diff);
    gainSkill(g, 'letters', 0.5, 'int');
    if (!ok) {
      reportCrime(g, 'fraud');
      deed(g, 'honest', -5, '남의 글씨를 흉내 내다 들켰다더라');
      log(g, `${J(f.name, '이/가')} 들통났다.`);
      if (k === 'love') { const t = byId(g, Number(id)); if (alive(t)) addGrudge(g, t, 30, '거짓 연서로 집안을 흔들려 했다'); }
      return '잉크가 마르기도 전에 들통났다. 인장의 테두리 무늬가 하나 모자랐다. 경비대가 내 이름을 적어 갔다.';
    }
    v.forged += 1;
    log(g, `${J(f.name, '을/를')} 꾸몄다.`);
    if (k === 'seal' || k === 'will') {
      const n = rng.int(f.gain[0], f.gain[1]);
      g.player.money += n;
      deed(g, 'honest', -2, null);
      return k === 'will' ? `유언장 끝에 내 몫 한 줄을 끼워 넣었다. 상속인들은 고개를 갸웃했지만, 영주 서기는 도장을 찍었다. 은화 ${n}닢.` : `증서를 내밀자 성문지기가 경례를 했다. 세금 면제, 통행 허가. 그걸 되팔아 은화 ${n}닢을 남겼다.`;
    }
    if (k === 'love') {
      const t = byId(g, Number(id));
      const sp = t ? byId(g, t.spouseId) : null;
      if (!alive(t) || !alive(sp)) return '편지를 흘렸지만, 그 집은 이미 다른 일로 무너져 있었다.';
      t.affection = clamp((t.affection ?? 0) - 5, -100, 100);
      sp.affection = clamp((sp.affection ?? 0) + 3, -100, 100);
      remember(g, sp, '배우자의 연서를 보았다', -1, { tag: 'letters_forged' });
      chron(g, `${t.name}의 집에서 연서 한 통 때문에 큰 싸움이 나다.`, 8);
      return `${t.name}의 외투 주머니에 연서 한 통이 들어갔다. 그 집 창문 너머로 그릇 깨지는 소리가 들렸다. 아무도 내 손을 의심하지 않았다.`;
    }
    const c = courtState(g);
    c.foes[id] = Math.max(0, (c.foes[id] ?? 0) - 5);
    c.secrets.push({ house: id, what: '거짓 밀서(내가 꾸민 것)', power: 1, at: mi(g) });
    if (c.secrets.length > 12) c.secrets.shift();
    c.heat = clamp((c.heat ?? 0) + 10, 0, 100);
    return '밀서는 그 집 문장을 달고 궁정 복도를 돌았다. 누군가는 그것을 믿을 것이다. 이제 이 거짓을 쥔 사람은 나다.';
  },
});

/* ---------- 선대의 편지 묶음 ---------- */
defineScene('letters_bundle', {
  title: () => '선대의 편지 묶음',
  text: (g, s) => `유품을 정리하다 끈으로 묶은 편지 꾸러미를 찾았다. ${s.n}통. 맨 위에는 ${s.top}의 이름이 있다.${s.love ? ' 그 사이에 집 안 누구의 글씨도 아닌 연서가 섞여 있다.' : ''}`,
  choices: () => [{ label: '하나하나 읽는다', key: 'read' }, { label: '읽지 않고 그대로 둔다', key: 'keep' }, { label: '선대와 함께 태운다', key: 'burn' }],
  resolve(g, rng, s, key) {
    const v = V(g);
    if (key === 'burn') { v.kept = []; return '편지 꾸러미를 장례 불에 넣었다. 선대가 남에게 보이고 싶지 않았던 말도 함께 갔다.'; }
    if (key === 'keep') return '끈을 풀지 않았다. 언젠가 내가 읽을 나이가 되면 읽을 것이다.';
    stress(g, -5);
    const heirs = Object.values(v.corr).filter((c) => c.inherited && byId(g, c.pid)?.alive);
    const w = heirs.length ? ` ${heirs.map((c) => c.name).slice(0, 2).join(', ')}. 이 사람들은 아직 살아 있다. 선대의 벗이 내게도 편지를 보낼지 모른다.` : '';
    return s.love
      ? `밤새 읽었다. 내가 모르던 선대가 거기 있었다. ${J(s.lover, '이/가')} 보낸 연서는 마지막까지 답장 자국이 있었다. 이 일은 나만 알기로 했다.${w}`
      : `밤새 읽었다. 흉년 이야기, 아이들 이야기, 돈 이야기. 그 속에서 선대는 지금의 나와 비슷한 걱정을 하고 있었다.${w}`;
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  const now = mi(g);
  // 1) 내가 보낸 편지가 닿는다
  for (const l of [...v.outbox]) {
    if (l.arrive > now) continue;
    v.outbox = v.outbox.filter((x) => x !== l);
    const p = byId(g, l.to);
    if (l.lost) {
      if (l.gift) log(g, `${l.name}에게 넣어 보낸 은화 ${l.gift}닢이 길에서 사라졌다.`);
      if (l.secret && rng.chance(0.3)) { deed(g, 'honest', -2, `${g.player.name}의 연서가 길에서 남의 손에 들어갔다더라`); const a = loveState(g).affair; if (a) a.risk = (a.risk ?? 0) + 20; g.news.unshift({ text: `${l.name}에게 보낸 연서가 닿지 않았다. 대신 장터에서 누가 그 구절을 읊고 다닌다고 한다.`, rel: 90 }); }
      else log(g, `${l.name}에게 보낸 편지가 닿지 않은 모양이다.`);
      continue;
    }
    if (!alive(p)) { g.news.unshift({ text: `${l.name}에게 보낸 편지가 되돌아왔다. 닿았을 때 ${J(l.name, '은/는')} 이미 세상을 떠난 뒤였다고 한다.`, rel: 90 }); keep(g, l.name, '닿지 못하고 돌아온 내 편지'); continue; }
    const c = corrOf(g, p);
    c.count += 1; c.last = now;
    c.warmth = clamp(c.warmth + 10 + (l.gift ? 10 : 0) + (l.love ? 5 : 0), 0, 100);
    p.affection = clamp((p.affection ?? 0) + 4 + (l.gift ? 6 : 0), -100, 100);
    if (l.love) p.romance = clamp((p.romance ?? 0) + 8, 0, 100);
    if (l.gift) p.wealth = (p.wealth ?? 0) + l.gift;
    const r = kinState(g).kids[p.id];
    if (r) r.bond = clamp((r.bond ?? 50) + 3, 0, 100);
    remember(g, p, l.gift ? '돈을 넣은 편지를 받았다' : '편지를 받았다', 1, { tag: 'letters' });
    // 답장이 온다
    if (rng.chance(0.4 + c.warmth / 200) && !v.inbox.some((x) => x.from === p.id)) sendToMe(g, rng, p);
  }
  // 2) 내게 오는 편지가 닿는다 (가장 이른 것 하나만 장면으로, 나머지는 다음 달)
  const due = v.inbox.filter((x) => x.arrive <= now).sort((a, b) => a.arrive - b.arrive);
  for (const l of due) {
    if (l.lost) { v.inbox = v.inbox.filter((x) => x !== l); continue; }
    if (sceneQueued(g, 'letters_arrive') || !ready(g) || traveling(g) || now - (v.arriveAt ?? 0) < 2) break;
    v.arriveAt = now;
    v.inbox = v.inbox.filter((x) => x !== l);
    const p = byId(g, l.from);
    const dead = !p || !p.alive;
    const c = p ? corrOf(g, p) : null;
    if (c && !dead) { c.unanswered += 1; c.last = now; c.count += 1; }
    queueScene(g, 'letters_arrive', { from: l.from, name: l.name, lk: dead && l.lk === 'love' ? 'love' : l.lk, need: l.need, dead, months: now - l.sent, toOld: !!l.toOld, lid: l.id, sent: l.sent });
    break;
  }
  // 3) 답 없는 편지는 정을 식힌다. 먼 사람이 먼저 편지를 쓴다.
  for (const c of Object.values(v.corr)) {
    const p = byId(g, c.pid);
    if (!alive(p)) continue;
    c.warmth = clamp(c.warmth - 0.15 - c.unanswered * 0.3, 0, 100);
    if (c.unanswered >= 3 && !c.stopped) { c.stopped = true; log(g, `${J(c.name, '은/는')} 더 편지를 보내지 않는다.`); }
    if (!isFar(g, p)) { c.unanswered = 0; continue; }
    if (c.stopped || v.inbox.some((x) => x.from === p.id)) continue;
    if (rng.chance(0.006 + c.warmth / 3000)) sendToMe(g, rng, p);
  }
  // 아직 편지를 주고받지 않은 먼 사람 가운데 정이 깊은 사람이 먼저 쓴다 (떠난 자식, 떠난 벗, 옛사랑)
  if (playerAge(g) >= 10 && rng.chance(0.06)) {
    const fresh = candidates(g).filter(({ p, k }) => !v.corr[p.id] && (k !== 'friend' || (p.affection ?? 0) >= 40));
    if (fresh.length) { const { p } = rng.pick(fresh); corrOf(g, p); sendToMe(g, rng, p); }
  }
  // 4) 남의 편지
  if (!ready(g) || playerAge(g) < 13) return;
  if (L(g).queue.some((x) => /^letters_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 6) return;
  const onRoad = traveling(g) || ['inn', 'street'].includes(L(g).home);
  if (rng.chance(traveling(g) ? 0.03 : onRoad ? 0.015 : 0.006)) {
    v.sceneAt = now;
    const hs = liveHouses(g);
    const lk = rng.pick(['court', 'love', 'debt', 'crime', 'plain', ...(hs.length >= 2 ? ['court'] : [])].filter((x) => x !== 'court' || hs.length));
    const h = lk === 'court' ? rng.pick(hs) : null;
    const who = rng.pick(['마르타', '그레타', '오토', '한스', '리제', '디터', '로자']);
    queueScene(g, 'letters_found', { lk, house: h ? houseName(h) : '', hid: h?.id ?? '', who, how: traveling(g) ? '길가 도랑에 전령 가방이 처박혀 있었다. 말은 보이지 않는다.' : '여관 주인이 내 방에 잘못 넣어 둔 편지다.' });
  }
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = V(g);
  const lifeR = L(g).ancestors?.[L(g).ancestors.length - 1];
  const by = lifeR?.name ?? old?.name ?? '선대';
  // 선대의 편지 묶음
  const kept = v.kept.slice();
  const loveL = kept.filter((x) => x.love);
  // 선대와 주고받던 사람: 정이 깊으면 자식에게도 편지가 온다 (나 자신이 된 사람, 내 식구는 뺀다)
  for (const [id, c] of Object.entries(v.corr)) {
    const p = byId(g, Number(id));
    if (!alive(p) || p.id === g.player.id || (g.player.familyIds ?? []).includes(p.id) || (me(g).childIds ?? []).includes(p.id) || c.warmth < 50) { delete v.corr[id]; continue; }
    c.inherited = true; c.warmth = Math.round(c.warmth * 0.6); c.unanswered = 0; c.stopped = false;
  }
  // 오는 중이던 편지는 선대 앞으로 온 편지가 된다
  for (const l of v.inbox) { l.toOld = true; if (l.from === g.player.id) l.lost = true; }
  v.outbox = v.outbox.filter((l) => l.to !== g.player.id);
  v.sceneAt = 0;
  v.log.push({ y: g.date.year, m: g.date.month, text: `${by}의 편지들이 이제 내 몫이다.` });
  if (kept.length >= 2) queueScene(g, 'letters_bundle', { n: kept.length, top: kept[kept.length - 1].from, love: loveL.length > 0, lover: loveL[0]?.from ?? '' });
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
