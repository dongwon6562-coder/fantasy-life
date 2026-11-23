// 39단계: 입양과 거둔 아이. 상태는 g.adopt 하나, 화면 연결점은 adoptLines(g) / adoptLine(g) / adoptInfo(g).
// - 내가 거둔 아이: 내 자식 목록(childIds) 가운데 거둔 아이(p.adopted: kin의 예배당 거두기·aftermath의 전쟁 고아·여기 문간의 바구니·양자).
//   재혼으로 생긴 의붓자식(stepfamily)은 그쪽 몫이라 여기서 다루지 않는다. 정은 kin 기록의 bond를 같이 쓴다.
// - 장면: 문간의 바구니(ad_basket), 자식 없는 집의 양자 들이기(ad_heir), 출생을 말해 줄까(ad_tell),
//   숨긴 것을 알게 된 아이(ad_learn), 친부모가 나타남(ad_birth), 피 아닌 자식이 대를 이을 때 친척들(ad_blood).
// - 내가 고아로 자라는 길: 어린 나를 두고 부모가 다 떠나면 누가 거두나(ad_taken: 큰아버지·이모·이웃·고아원·큰형),
//   그 집에서 자라는 세월(글), 다 커서 그 집을 나서는 날(ad_grown).
// - 플레이어 없이도: 부모 잃은 NPC 아이를 친척이나 자식 없는 집이 거두고, 자식 없는 늙은 집이 양자로 대를 잇고,
//   흉년·역병 끝에는 예배당 문간에 바구니가 놓인다. 거둔 아이가 자라 출생을 알고, 유산을 두고 친척과 다툰다.
// 잇는 곳: kin(자식 기록·정·adopted 수), stepfamily(의붓은 거기), aftermath(전쟁 고아), poor(고아원 살이), heir(양자의 대 잇기), repute(deed).
// 새 행동은 없다. 게임 난수는 건드리지 않는다(ownRng).
import { J, hasBatchim } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, ageYears, makePerson, fullName, living, has } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, traveling, note, chron, stress } from '../adventure/core.js';
import { rel } from '../relations.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { kinState, TEMPERS } from '../kin/index.js';
import { makeRng } from '../rng.js';
import * as T from './lines.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeOf = (p) => p?.place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 391) ^ Math.imul(mi(g) * 211 + salt + 17, 2654435761)) | 0 });
const alive = (p) => !!p && p.alive && !p.isPlayer;
const kidWord = (p) => (p.sex === 'm' ? '아들' : '딸');
const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.campaign && !g.army?.captive && !L(g).heirPending;
const NUM = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const yrs = (n) => (n >= 1 && n <= 10 ? `${NUM[n]} 해` : `${Math.max(1, n)}년`);
const TOKENS = ['반쪽으로 쪼갠 구리 메달', '은 단추 하나가 달린 포대기', '이름 첫 글자를 수놓은 손수건', '작은 나무 새', '붉은 실로 땋은 팔찌'];

/* ---------- 상태 ---------- */
export function adoptState(g) {
  g.adopt ??= {};
  const s = g.adopt;
  s.ties ??= {};     // 거둔 아이 id → { how: basket|chapel|war|heir|taken, since, told: null|'yes'|'no'|'half', token, birth(친부모 id), learned, met, gone }
  s.guardian ??= null; // 내가 고아로 자랄 때 { id, kind: kin|sib|neighbor|chapel, name, since, warm, grown }
  s.npc ??= [];      // NPC 집안이 거둔 아이 [{ kid, by, kind: orphan|heir|door, y, place, ev: {} }]
  s.month ??= [];
  s.used ??= [];
  s.log ??= [];
  s.done ??= {};
  s.sceneAt ??= -99;
  s.lineAt ??= -99;
  s.made ??= 0;      // NPC가 거둔 아이 수 (지금까지)
  s.doors ??= 0;     // 문간에 놓인 바구니 수 (지금까지)
  return s;
}
const S = adoptState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, text }); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 24) s.used.shift();
  return pool[i];
}
const bondOf = (g, id) => kinState(g).kids[id]?.bond ?? 40;
const addBond = (g, id, n) => { const r = kinState(g).kids[id]; if (r) r.bond = clamp(r.bond + n, 0, 100); };
const warmWord = (v) => (v >= 80 ? '피보다 진하다' : v >= 60 ? '제 집으로 여긴다' : v >= 40 ? '정이 들어 간다' : v >= 20 ? '아직 손님 같다' : '마음을 닫았다');

/* ---------- 누가 거둔 아이인가 ---------- */
const stepTie = (g, id) => !!g.stepfamily?.ties?.[id];
function guessHow(p) {
  const t = (p.history ?? []).map((h) => String(h.text ?? '')).join(' ');
  if (/전쟁|전사|칼집/.test(t)) return 'war';
  if (/바구니|문간|문 앞/.test(t)) return 'basket';
  if (/양자/.test(t)) return 'heir';
  return 'chapel';
}
/** 내가 거둔 아이 (의붓자식은 빼고) */
export function takenKids(g) {
  return (me(g).childIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && p.adopted && !stepTie(g, p.id));
}
function sync(g) {
  const s = S(g); const now = mi(g);
  const seen = new Set();
  for (const p of takenKids(g)) {
    seen.add(String(p.id));
    s.ties[p.id] ??= { how: guessHow(p), since: now, told: null, token: null, birth: null, learned: false, met: false, gone: false };
  }
  for (const id of Object.keys(s.ties)) if (!seen.has(id)) delete s.ties[id];
}
const ties = (g) => Object.entries(S(g).ties).map(([id, t]) => [byId(g, Number(id)), t]).filter(([p]) => alive(p));

/** 거둔 아이를 내 자식으로 들인다 (kin 기록까지) */
function takeIn(g, rng, p, how, extra = {}) {
  const meP = me(g);
  const sp = byId(g, meP.spouseId);
  if (!meP.childIds.includes(p.id)) meP.childIds.push(p.id);
  if (alive(sp) && !sp.childIds.includes(p.id)) sp.childIds.push(p.id); // 둘이 함께 거둔다 (의붓자식으로 읽히지 않게)
  if (!g.player.familyIds.includes(p.id)) g.player.familyIds.push(p.id);
  p.adopted = true; p.known = true; p.place = here(g);
  const k = kinState(g);
  const age = ageYears(p);
  k.kids[p.id] ??= { temper: rng.pick(Object.keys(TEMPERS)), gift: rng.pick(['str', 'agi', 'int', 'cha', 'sen', 'wil']), giftKnown: age >= 8, path: age >= 13 ? 'free' : null, craft: null, bond: how === 'heir' ? 35 : 45, learned: age >= 13 ? 10 : 0, rebelled: 0, left: null, disowned: false, adopted: true, grudge: {}, jobSet: age >= 15, born: p.ageMonths, parent: g.player.id };
  k.adopted = (k.adopted ?? 0) + 1;
  S(g).ties[p.id] = { how, since: mi(g), told: null, token: null, birth: null, learned: false, met: false, gone: false, ...extra };
}

/* ---------- 장면: 내가 거둔다 ---------- */
defineScene('ad_basket', {
  title: () => '문간의 바구니',
  text: (g, s) => `새벽에 문을 여니 문간에 바구니가 놓여 있다. 포대기에 싸인 갓난아이가 ${s.sex === 'm' ? '주먹을 꼭 쥐고' : '입을 오물거리며'} 자고 있다. 포대기 안에 ${s.token}. 쪽지는 없다.${s.hard ? ` ${s.hard}` : ''} 골목 끝에서 누가 급히 모퉁이를 돌아가는 소리가 났던 것도 같다.`,
  choices: (g) => [
    ...(kinState(g).adopted < 3 && playerAge(g) >= 18 ? [{ label: '안고 들어간다. 이 집 아이로 키운다', key: 'take' }] : []),
    { label: '예배당 고아원에 데려다준다', key: 'chapel' },
    { label: '아이 없는 이웃 집에 물어본다', key: 'neighbor' },
  ],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.basket = mi(g); st.doors += 1;
    const r = ownRng(g, 41);
    const baby = makePerson(r, { sex: s.sex, ageMonths: rng.int(0, 2), lastName: key === 'take' ? g.player.lastName : undefined, job: 'child' });
    baby.history.push({ y: g.date.year, m: g.date.month, text: `${placeName(here(g))}의 문간 바구니에서 발견되었다.` });
    g.people.push(baby);
    // 아이를 두고 간 사람 (어딘가에 살아 있다)
    const pl = r.pick(['harfen', 'verden', 'leocast', 'portel', 'ern'].filter((x) => PLACES[x] && x !== here(g))) ?? 'ern';
    const mo = makePerson(r, { sex: 'f', ageMonths: r.int(17, 30) * 12, job: r.pick(['laborer', 'weaver', 'farmer']) });
    mo.place = pl; mo.history.push({ y: g.date.year, m: g.date.month, text: '갓난아이를 남의 집 문간에 두고 떠났다.' });
    g.people.push(mo);
    if (key === 'take') {
      takeIn(g, rng, baby, 'basket', { token: s.token, birth: mo.id });
      note(g, `문간의 갓난아이 ${J(baby.name, '을/를')} ${kidWord(baby)}로 거두었다.`); log(g, `문간에 놓인 ${J(baby.name, '을/를')} 거두었다.`);
      chron(g, `${g.player.name}, 문간에 놓인 갓난아이를 거두어 이름을 ${baby.name}${hasBatchim(baby.name) ? '이라' : '라'} 짓다.`, 40);
      deed(g, 'kind', 2, '문간에 버려진 아이를 거두었다'); stress(g, -4);
      return `아이를 안고 들어왔다. 따뜻한 우유를 헝겊에 적셔 물렸다. 이름은 ${J(baby.name, '으로/로')} 했다. ${J(s.token, '은/는')} 상자에 넣어 높은 선반에 올려 두었다. 언젠가 이 아이가 물을 날을 위해.`;
    }
    if (key === 'neighbor') {
      const hosts = living(g).filter((p) => !p.isPlayer && p.spouseId && placeOf(p) === here(g) && ageYears(p) >= 24 && ageYears(p) <= 50 && !(p.childIds ?? []).some((id) => byId(g, id)?.alive));
      if (hosts.length) {
        const h = rng.pick(hosts); npcTake(g, baby, h, 'door');
        h.affection = clamp((h.affection ?? 0) + 12, -100, 100); rel(h); deed(g, 'kind', 1, '버려진 아이에게 집을 찾아 주었다');
        return `${J(h.name, '이/가')} 아이를 받아 안았다. 한참 말이 없다가 "우리가 그렇게 빌었는데" 하고 울었다. 바구니는 돌려받지 않았다.`;
      }
    }
    baby.place = here(g); st.npc.push({ kid: baby.id, by: null, kind: 'door', y: g.date.year, place: here(g), ev: {} }); st.made += 1;
    return key === 'neighbor' ? '아이 없는 집을 찾아다녔지만 다들 고개를 저었다. 결국 예배당에 데려다주었다. 사제가 이름을 지어 장부에 적었다.' : '예배당 사제가 아이를 받아 안았다. "이번 겨울만 벌써 셋째요." 돌아오는 길, 품이 이상하게 허전했다.';
  },
});

defineScene('ad_heir', {
  title: () => '대를 이을 아이',
  text: (g, s) => `${s.age}살. 이 집에 대를 이을 자식이 없다. ${s.who ? `${J(s.who, '이/가')} 조심스레 말을 꺼냈다.` : '예배당 사제가 조심스레 말을 꺼냈다.'} "양자를 들이시면 어떻겠소. 성을 이어받고 집과 일을 물려받을 아이 말이오." 떠오르는 얼굴이 몇 있다. ${s.cands.map((c) => `${c.name}(${c.age}살, ${c.what})`).join(', ')}.`,
  choices: (g, s) => [...s.cands.map((c, i) => ({ label: `${J(c.name, '을/를')} 양자로 들인다`, key: String(i) })), { label: '핏줄이 끊기면 끊기는 대로 둔다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.heir = mi(g);
    if (key === 'no') return '사제는 더 말하지 않았다. 그날 밤 족보를 펼쳐 내 이름 아래 빈칸을 오래 보았다.';
    const c = s.cands[Number(key)];
    let p = c?.id != null ? byId(g, c.id) : null;
    if (!p && c) { p = makePerson(ownRng(g, 53), { sex: c.sex, ageMonths: c.age * 12 + 2, job: c.age >= 15 ? 'laborer' : 'child' }); p.name = c.name; g.people.push(p); p.history.push({ y: g.date.year, m: g.date.month, text: '예배당 고아원에서 자랐다.' }); }
    if (!alive(p)) return '그 사이 그 아이는 이 고장을 떠나고 없었다.';
    const oldLast = p.lastName;
    p.lastName = g.player.lastName;
    p.history.push({ y: g.date.year, m: g.date.month, text: `${g.player.name}의 양자가 되어 성을 ${oldLast === p.lastName ? '그대로 이었다' : `${oldLast}에서 ${J(p.lastName, '으로/로')} 바꾸었다`}.` });
    takeIn(g, rng, p, 'heir', { told: 'yes' });
    addBond(g, p.id, c.kin ? 10 : 0);
    note(g, `${J(fullName(p), '을/를')} 양자로 들였다.`); log(g, `${J(p.name, '을/를')} 양자로 들였다.`);
    chron(g, `${g.player.name}, ${J(p.name, '을/를')} 양자로 들여 대를 잇게 하다.`, 50);
    return c.kin
      ? `예배당에서 성을 바꾸는 날, ${J(p.name, '은/는')} 제 친부모 쪽을 한 번 돌아보고 내 옆에 섰다. 사제가 새 이름을 불렀다. 대답하는 목소리가 조금 떨렸다.`
      : `${J(p.name, '은/는')} 보따리 하나를 들고 왔다. 첫날 밤 그 아이는 마당의 우물 깊이부터 물었다. 이 집에서 오래 살 사람처럼.`;
  },
});

defineScene('ad_tell', {
  title: () => '출생을 말해 줄까',
  text: (g, s) => `${J(s.name, '이/가')} ${s.age}살이 되었다. 오늘 동네 아이들이 "너는 왜 너희 엄마 아빠랑 하나도 안 닮았냐"고 했다며 거울 앞에 오래 서 있었다. ${s.how === 'basket' ? `선반 위 상자에는 아직 ${J(s.token, '이/가')} 있다.` : s.how === 'war' ? '그 아이의 친아버지는 전쟁에서 돌아오지 못했다.' : '그 아이는 예배당 고아원에서 왔다.'} 말해 줄 때가 된 걸까.`,
  choices: (g, s) => [{ label: '다 말해 준다', key: 'yes' }, ...(s.how === 'basket' ? [{ label: `말해 주고 ${J(s.token, '을/를')} 건넨다`, key: 'token' }] : []), { label: '"너는 우리 아이야"라고만 한다', key: 'half' }, { label: '아직은 숨긴다', key: 'no' }],
  resolve(g, rng, s, key) {
    const t = S(g).ties[s.id]; if (!t) return '그 아이는 이미 이 집에 없었다.';
    t.told = key === 'token' ? 'yes' : key;
    if (key === 'no') return '아무 말도 하지 않았다. "닮는 건 같이 오래 살면 닮는 거야." 아이는 고개를 끄덕였다. 그 거짓말이 언제까지 버틸지는 모르겠다.';
    if (key === 'half') { addBond(g, s.id, 2); return '"너는 우리 아이야. 그거면 돼." 아이는 한참 나를 보다가 고개를 끄덕였다. 더 묻지 않았다. 아직은.'; }
    const ok = rng.chance(0.55 + bondOf(g, s.id) / 250);
    addBond(g, s.id, ok ? 10 : -4); stress(g, 4);
    log(g, `${s.name}에게 출생을 말해 주었다.`);
    const tok = key === 'token' ? ` ${J(s.token, '을/를')} 손에 쥐여 주었다. 아이는 그것을 오래 만지작거렸다.` : '';
    return ok ? `있는 그대로 말했다. 아이는 울지 않았다. 대신 물었다. "그럼 나를 고른 거예요?" 그렇다고 했다. 아이가 웃었다.${tok}` : `다 말했다. 아이는 아무 말 없이 방으로 들어갔다.${tok} 저녁은 먹으러 나왔다. 그걸로 됐다고 생각하기로 했다.`;
  },
});

defineScene('ad_learn', {
  title: () => '숨긴 것을 안 아이',
  text: (g, s) => `${J(s.name, '이/가')} 해 질 녘에 돌아와 문간에 섰다. 눈이 붉다. "${s.from}한테 들었어요. 나 주워 온 애라면서요. 다들 알았는데 나만 몰랐어요."`,
  choices: () => [{ label: '숨긴 것을 사과하고 다 말해 준다', key: 'sorry' }, { label: '"키운 게 부모다"라고 말한다', key: 'raise' }, { label: '헛소문이라고 잡아뗀다', key: 'deny' }],
  resolve(g, rng, s, key) {
    const t = S(g).ties[s.id]; if (t) { t.learned = true; t.told = key === 'deny' ? 'no' : 'yes'; }
    if (key === 'sorry') { addBond(g, s.id, -4); stress(g, 5); deed(g, 'honest', 1, '숨긴 것을 털어놓았다'); return '무릎을 꿇고 사과했다. 처음부터 다 말했다. 아이는 한참 울다가 물었다. "그럼 왜 말 안 했어요?" 잃을까 봐 그랬다고 했다. 그건 사실이었다.'; }
    if (key === 'raise') { addBond(g, s.id, rng.chance(0.5) ? 2 : -8); return '"너를 키운 건 우리다. 그게 부모다." 아이는 대답하지 않았다. 며칠 뒤 우물가에서 나를 보고, 먼저 물동이를 들어 주었다.'; }
    addBond(g, s.id, -16); deed(g, 'honest', -1, '거둔 아이에게 거짓말을 했다');
    return '헛소문이라고 했다. 아이는 나를 오래 보았다. 그 눈은 믿지 않는 눈이었다. 그날부터 아이가 내게 묻는 것이 줄었다.';
  },
});

defineScene('ad_birth', {
  title: () => '아이를 두고 간 사람',
  text: (g, s) => `낯선 여자가 문간에 서 있다. 해진 숄을 두르고 ${J(s.token, '과/와')} 꼭 닮은 것을 손에 쥐었다. "${s.years}년 전 겨울에... 그 바구니." 말을 잇지 못한다. 마당에서 ${J(s.kid, '이/가')} ${s.knows ? '그 물건을 알아보고 굳어 섰다' : '영문을 모르고 우리를 본다'}.`,
  choices: (g, s) => [{ label: '아이와 만나게 해 준다', key: 'meet' }, { label: '아이에게 고르게 한다', key: 'ask', hide: !s.knows || s.age < 12 }, { label: '은화를 쥐여 돌려보낸다', key: 'send' }].filter((c) => !c.hide),
  resolve(g, rng, s, key) {
    const t = S(g).ties[s.id]; if (t) t.met = true;
    const mo = byId(g, t?.birth); const kid = byId(g, s.id);
    if (mo) { mo.known = true; mo.history.push({ y: g.date.year, m: g.date.month, text: `${J(s.kid, '을/를')} 찾아왔다.` }); }
    if (key === 'send') { addBond(g, s.id, s.knows ? -6 : 0); if (mo) mo.affection = clamp((mo.affection ?? 0) - 10, -100, 100); return '은화 몇 닢을 쥐여 주었다. 여자는 받지 않고 대문 기둥에 올려놓고 갔다. 아이는 그날 저녁 그 동전을 오래 보았다.'; }
    if (key === 'meet') { addBond(g, s.id, 4); if (t) t.told = 'yes'; if (mo) { mo.affection = clamp((mo.affection ?? 0) + 15, -100, 100); rel(mo); } stress(g, 6); return `마당 평상에 둘을 앉혔다. 여자는 아이 손을 만지지도 못하고 소매만 쥐었다. 아이는 물었다. "왜 그랬어요?" 흉년이었다고, 먹일 게 없었다고, 문 안에서 불빛이 새어 나오는 집을 골랐다고 했다.`; }
    const stay = bondOf(g, s.id) + rng.int(-15, 20) >= 45;
    if (stay) { addBond(g, s.id, 12); return `${J(s.kid, '은/는')} 오래 서 있다가 여자에게 고개를 숙였다. "와 줘서 고마워요." 그리고 내 옆으로 왔다. 여자는 웃으며 울었다. 철마다 편지를 보내기로 했다.`; }
    if (t) t.gone = true;
    if (kid) { kid.place = placeOf(mo) ?? 'ern'; kid.history.push({ y: g.date.year, m: g.date.month, text: '낳아 준 어머니를 따라 떠났다.' }); }
    stress(g, 12); log(g, `${J(s.kid, '이/가')} 낳아 준 어머니를 따라갔다.`);
    return `${J(s.kid, '은/는')} 땅만 보다가 여자 쪽으로 걸어갔다. 대문 앞에서 돌아서서 내게 크게 절을 했다. 키워 준 은혜라고. 그 말이 칼보다 아팠다.`;
  },
});

defineScene('ad_blood', {
  title: () => '피가 아닌 자식',
  text: (g, s) => `${s.old}의 장례가 끝나자 ${J(s.rel, '이/가')} 찾아왔다. "${s.relWord}로서 하는 말이네. 피 한 방울 안 섞인 아이가 이 집 대를 잇는 걸 조상들이 어떻게 보겠나. 땅은 핏줄에게 돌아와야지." 뒤에 친척 몇이 팔짱을 끼고 서 있다.`,
  choices: (g) => [{ label: '"나를 키운 집이고, 나는 이 집 자식이오"', key: 'stand' }, { label: '밭 한 뙈기를 떼어 준다', key: 'share' }, { label: '촌장 앞에서 따지자고 한다', key: 'court' }],
  resolve(g, rng, s, key) {
    S(g).done.blood = mi(g);
    const r = byId(g, s.relId);
    if (key === 'share') { if (r) r.affection = clamp((r.affection ?? 0) + 10, -100, 100); g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) - Math.min(30, Math.round((g.player.familyMoney ?? 0) * 0.15))); deed(g, 'generous', 1, '친척들에게 몫을 떼어 주었다'); return '밭 한 뙈기를 떼어 주었다. 친척들은 그걸로 입을 다물었다. 장터에서는 "양자가 통이 크다"는 말이 돌았다.'; }
    if (key === 'court') {
      const ok = rng.chance(0.6);
      if (r) r.affection = clamp((r.affection ?? 0) - 15, -100, 100);
      return ok ? `촌장은 족보를 펴 보더니 말했다. "예배당에서 성을 받았으면 자식이오." 친척들은 돌아갔다. ${J(s.rel, '은/는')} 그 뒤로 나와 인사를 하지 않는다.` : '촌장은 한참 고민하다 반반으로 나누라고 했다. 땅의 절반이 친척 손으로 갔다. 그날 밤 양부모의 무덤 앞에서 사과했다.';
    }
    if (r) r.affection = clamp((r.affection ?? 0) - 8, -100, 100);
    deed(g, 'brave', 1, '양자로서 집을 지켰다');
    return '"나를 키운 집이오. 나는 이 집 자식이오." 목소리가 생각보다 크게 나왔다. 친척들은 수군거리며 돌아갔다. 문을 닫고 나서야 다리가 떨렸다.';
  },
});

/* ---------- 장면: 내가 고아가 된다 ---------- */
defineScene('ad_taken', {
  title: () => '누가 너를 거둘까',
  text: (g, s) => `${s.lost} 장례가 끝났다. 집에 어른이 없다. 예배당 마당에 어른들이 모여 낮은 소리로 이야기한다. 누가 이 아이를 데려가느냐. ${s.cands.map((c) => c.say).join(' ')}`,
  choices: (g, s) => s.cands.map((c, i) => ({ label: c.label, key: String(i) })),
  resolve(g, rng, s, key) {
    const st = S(g);
    const c = s.cands[Number(key)] ?? s.cands[s.cands.length - 1];
    const p = c.id != null ? byId(g, c.id) : null;
    st.guardian = { id: p?.id ?? null, kind: c.kind, name: p?.name ?? '고아원 사제', since: mi(g), warm: c.kind === 'chapel' ? 30 : c.kind === 'neighbor' ? 35 : 45, grown: false };
    if (p) { p.known = true; p.affection = clamp((p.affection ?? 0) + 15, -100, 100); rel(p); p.history.push({ y: g.date.year, m: g.date.month, text: `부모 잃은 ${J(g.player.name, '을/를')} 거두었다.` }); }
    log(g, c.kind === 'chapel' ? '부모를 잃고 예배당 고아원에 들어갔다.' : `부모를 잃고 ${p?.name ?? ''}의 집에 거두어졌다.`);
    note(g, c.kind === 'chapel' ? '예배당 고아원에서 자라게 되었다.' : `${J(p?.name ?? '', '이/가')} 나를 거두었다.`);
    chron(g, `${g.player.name}, 부모를 잃고 ${c.kind === 'chapel' ? '고아원에' : `${p?.name ?? '남'}의 집에`} 거두어지다.`, 30);
    stress(g, 10);
    if (c.kind === 'chapel') return '사제의 손을 잡고 고아원 문을 들어섰다. 긴 탁자에 아이들이 앉아 있었다. 누가 말없이 옆자리를 비켜 주었다.';
    if (c.kind === 'sib') return `${J(p?.name ?? '', '이/가')} 내 보따리를 들었다. "이제 내가 너를 키운다." 그 목소리가 아버지를 닮아서, 참았던 울음이 터졌다.`;
    return `${J(p?.name ?? '', '이/가')} 내 보따리를 받아 들고 앞장섰다. 그 집 아이들이 문간에서 나를 구경했다. 저녁상에 숟가락 하나가 더 놓였다.`;
  },
});

defineScene('ad_grown', {
  title: () => '거둬 준 집을 나서는 날',
  text: (g, s) => (s.gk === 'chapel'
    ? `열여섯. 고아원은 열여섯이 되면 나가야 한다. 사제가 은화 몇 닢과 추천장 한 장을 쥐여 주었다. "너는 여기서 가장 손이 야무진 아이였다." 긴 탁자의 동생들이 나를 본다.`
    : `${J(s.gd, '이/가')} 나를 불렀다. "${s.warm >= 50 ? '네가 이 집에 온 지 벌써 몇 해냐. 이제 네 길을 가도 된다. 언제든 돌아와도 되고.' : '이제 너도 컸으니 네 밥벌이는 네가 해야지. 이 집 땅은 우리 애들 몫이다.'}"`),
  choices: (g, s) => (s.gk === 'chapel'
    ? [{ label: '동생들에게 하나씩 인사하고 나선다', key: 'bye' }, { label: '고아원에 남아 일을 거든다', key: 'stay' }]
    : [{ label: '고개 숙여 고맙다고 한다', key: 'thank' }, { label: '내 부모 몫은 어찌 되었느냐고 묻는다', key: 'ask' }, { label: '말없이 짐을 싼다', key: 'go' }]),
  resolve(g, rng, s, key) {
    const st = S(g); const gd = st.guardian; if (gd) gd.grown = true;
    const p = byId(g, gd?.id);
    if (s.gk === 'chapel') {
      if (key === 'stay') { deed(g, 'kind', 1, '자란 고아원에 남아 아이들을 돌보았다'); return '한 해만 더 있기로 했다. 밤마다 어린 아이들에게 지어낸 부모 이야기를 들려주었다. 내 아버지는 오늘도 기사였다.'; }
      g.player.money = (g.player.money ?? 0) + 5; return '긴 탁자를 한 바퀴 돌며 아이들 머리를 쓰다듬었다. 막내가 내 소매를 놓지 않았다. 은화 다섯 닢과 추천장 한 장이 내 전부였다. 그래도 길은 넓었다.';
    }
    if (key === 'thank') { if (p) p.affection = clamp((p.affection ?? 0) + 15, -100, 100); return `깊이 절했다. ${J(s.gd, '은/는')} 내 어깨를 두드리다 말고 돌아섰다. 문설주에 새긴 내 키 눈금은 그대로 두었다.`; }
    if (key === 'ask') {
      if (s.warm >= 50 || rng.chance(0.4)) { g.player.money = (g.player.money ?? 0) + 15; if (p) p.affection = clamp((p.affection ?? 0) - 3, -100, 100); return `${J(s.gd, '은/는')} 잠자코 궤짝을 열었다. 아버지가 남긴 은화 열다섯 닢이 헝겊에 싸여 있었다. "네가 물을 때 주려고 했다."`; }
      if (p) p.affection = clamp((p.affection ?? 0) - 15, -100, 100); stress(g, 8); return `"키워 준 값은 생각 안 하냐?" 그 말에 더 묻지 않았다. 부모 몫이 있었는지는 끝내 모른다.`;
    }
    return '말없이 짐을 쌌다. 문을 나설 때 아무도 붙잡지 않았다. 그게 서운한지 홀가분한지, 고갯마루에 올라서야 알았다. 둘 다였다.';
  },
});

/* ---------- 매달: 정과 글 ---------- */
function flavor(g, rng) {
  const s = S(g); const now = mi(g);
  if (now - s.lineAt < 5 || !rng.chance(0.3)) return;
  const opts = [];
  const kids = ties(g).filter(([p, t]) => !t.gone && ageYears(p) >= 3 && ageYears(p) < 20 && placeOf(p) === here(g));
  if (kids.length) {
    const [p, t] = rng.pick(kids);
    const b = bondOf(g, p.id);
    const c = { k: p.name, token: t.token ?? '포대기', years: yrs(Math.max(1, Math.floor((now - t.since) / 12))) };
    if (t.told === 'yes' && t.how === 'basket' && t.token) opts.push(() => line(g, 'knows', pickFresh(g, rng, 'kk', T.KID_KNOWS)(c)));
    else opts.push(() => line(g, 'kid', pickFresh(g, rng, b >= 55 ? 'kw' : 'kc', b >= 55 ? T.KID_WARM : T.KID_COLD)(c)));
  }
  const gd = s.guardian;
  if (gd && !gd.grown && playerAge(g) < 17) {
    const c = { gd: gd.name, place: placeName(here(g)) };
    opts.push(() => line(g, 'raised', pickFresh(g, rng, gd.kind === 'chapel' ? 'rc' : gd.warm >= 50 ? 'rw' : 'rk', gd.kind === 'chapel' ? T.RAISED_CHAPEL : gd.warm >= 50 ? T.RAISED_WARM : T.RAISED_COLD)(c)));
  }
  if (!opts.length) return;
  rng.pick(opts)(); s.lineAt = now;
}
function drift(g) {
  const gd = S(g).guardian;
  if (!gd || gd.grown) return;
  const p = byId(g, gd.id);
  gd.warm = clamp(gd.warm + 0.12 + (p && has(p, 'kind') ? 0.1 : 0) - (p && (has(p, 'cruel') || has(p, 'greedy')) ? 0.12 : 0) + (gd.kind === 'sib' ? 0.08 : 0), 0, 100);
}

/* ---------- 장면 고르기 ---------- */
// 내 부모가 다 떠났나 (아직 어린 나)
function orphaned(g) {
  const m = me(g);
  const pars = [m.fatherId, m.motherId].filter((id) => id != null).map((id) => byId(g, id)).filter(Boolean);
  if (!pars.length || pars.some((p) => p.alive)) return false;
  // 재혼한 새 부모가 남아 있으면 그쪽(stepfamily)이 키운다
  return !Object.entries(g.stepfamily?.ties ?? {}).some(([id, t]) => t.kind === 'parent' && alive(byId(g, Number(id))));
}
function takerCands(g, rng) {
  const m = me(g); const out = [];
  const pars = [m.fatherId, m.motherId].map((id) => byId(g, id)).filter(Boolean);
  const kin = [];
  for (const par of pars) for (const gp of [par.fatherId, par.motherId].map((id) => byId(g, id)).filter(Boolean)) for (const id of gp.childIds ?? []) { const x = byId(g, id); if (alive(x) && x.id !== par.id && ageYears(x) >= 20 && !kin.includes(x)) kin.push(x); }
  if (kin.length) { const k = rng.pick(kin); out.push({ id: k.id, kind: 'kin', label: `${k.sex === 'm' ? '큰아버지뻘' : '이모뻘'} ${J(k.name, '을/를')} 따라간다`, say: `${J(k.name, '이/가')} "핏줄인데 내가 데려가야지" 했다.` }); }
  const sib = (m.fatherId != null ? byId(g, m.fatherId)?.childIds ?? [] : []).map((id) => byId(g, id)).find((x) => alive(x) && ageYears(x) >= 18);
  if (sib) out.push({ id: sib.id, kind: 'sib', label: `큰${sib.sex === 'm' ? '형' : '누이'} ${J(sib.name, '과/와')} 산다`, say: `${J(sib.name, '이/가')} 내 손을 잡고 놓지 않았다.` });
  const nb = living(g).filter((p) => !p.isPlayer && p.spouseId && placeOf(p) === here(g) && ageYears(p) >= 25 && ageYears(p) <= 55 && (has(p, 'kind') || has(p, 'generous') || (p.affection ?? 0) >= 10) && !kin.includes(p));
  if (nb.length) { const n = rng.pick(nb); out.push({ id: n.id, kind: 'neighbor', label: `이웃 ${n.name}네 집으로 간다`, say: `이웃 ${J(n.name, '이/가')} "우리 집 애들이랑 같이 크면 되지" 했다.` }); }
  out.push({ id: null, kind: 'chapel', label: '예배당 고아원에 들어간다', say: '사제는 고아원에 자리가 있다고 했다.' });
  return out;
}
function heirCands(g, rng) {
  const m = me(g); const out = [];
  const pars = [m.fatherId, m.motherId].map((id) => byId(g, id)).filter(Boolean);
  const sibs = [...new Set(pars.flatMap((p) => p.childIds ?? []))].filter((id) => id !== m.id).map((id) => byId(g, id)).filter(Boolean);
  const nephews = sibs.flatMap((x) => x.childIds ?? []).map((id) => byId(g, id)).filter((x) => alive(x) && ageYears(x) >= 8 && ageYears(x) <= 30 && !(m.childIds ?? []).includes(x.id));
  if (nephews.length) { const n = rng.pick(nephews); out.push({ id: n.id, name: n.name, age: ageYears(n), sex: n.sex, what: `형제의 ${kidWord(n)}`, kin: true }); }
  const young = living(g).filter((p) => !p.isPlayer && placeOf(p) === here(g) && ageYears(p) >= 10 && ageYears(p) <= 22 && (p.affection ?? 0) >= 20 && !nephews.includes(p) && !(m.childIds ?? []).includes(p.id));
  if (young.length) { const y = rng.pick(young); out.push({ id: y.id, name: y.name, age: ageYears(y), sex: y.sex, what: '나를 따르는 젊은이', kin: false }); }
  const sex = rng.chance(0.5) ? 'm' : 'f';
  out.push({ id: null, name: rng.pick(sex === 'm' ? ['토비아', '레온', '핀', '마티스'] : ['엘사', '이다', '루치아', '마렌']), age: rng.int(7, 12), sex, what: '고아원의 야무진 아이', kin: false });
  return out.slice(0, 3);
}
function playerTick(g, rng) {
  const s = S(g); const now = mi(g);
  const age = playerAge(g);
  // 내가 고아가 됨: 놓치면 안 되니 다른 장면 사정은 덜 본다
  if (!s.guardian && age >= 3 && age < 14 && !g.over && orphaned(g) && !L(g).heirPending) {
    const m = me(g); const lost = [m.fatherId, m.motherId].map((id) => byId(g, id)).filter(Boolean);
    s.guardian = { id: null, kind: 'pending', name: '', since: now, warm: 40, grown: false };
    queueScene(g, 'ad_taken', { lost: lost.length > 1 ? '아버지와 어머니의' : `${lost[0]?.sex === 'm' ? '아버지' : '어머니'}의`, cands: takerCands(g, rng) }, { first: true });
    s.sceneAt = now; return;
  }
  if (!free(g) || now - s.sceneAt < 4 || L(g).queue.length >= 2) return;
  const q = (kind, data) => { queueScene(g, kind, data); s.sceneAt = now; return true; };
  // 다 커서 거둬 준 집을 나섬
  const gd = s.guardian;
  if (gd && gd.kind !== 'pending' && !gd.grown && age >= 16) return q('ad_grown', { gk: gd.kind, gd: gd.name, warm: Math.round(gd.warm) });
  // 문간의 바구니
  const hard = g.world?.famine ? '올해는 흉년이다.' : g.world?.plague ? '돌림병이 돈 뒤다.' : (g.aftermath?.orphans?.length ?? 0) > 0 ? '전쟁이 끝난 지 얼마 안 되었다.' : '';
  const pBasket = 0.003 * (hard ? 4 : 1) * ((g.house || g.life?.home === 'own') ? 1.3 : 1);
  if (age >= 20 && age <= 65 && (!s.done.basket || now - s.done.basket >= 60) && rng.chance(pBasket)) return q('ad_basket', { sex: rng.chance(0.5) ? 'm' : 'f', token: rng.pick(TOKENS), hard });
  // 양자 들이기: 자식 없는 늙어 가는 나
  const kids = (me(g).childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive);
  if (age >= 45 && !kids.length && (!s.done.heir || now - s.done.heir >= 72) && rng.chance(0.04)) {
    const cands = heirCands(g, rng);
    const sp = byId(g, me(g).spouseId);
    return q('ad_heir', { age, cands, who: alive(sp) ? sp.name : '' });
  }
  for (const [p, t] of ties(g)) {
    if (t.gone) continue;
    const a = ageYears(p);
    // 출생을 말해 줄까
    if (t.told == null && t.how !== 'heir' && a >= 9 && a < 16 && now - t.since >= 24 && rng.chance(0.08)) return q('ad_tell', { id: p.id, name: p.name, age: a, how: t.how, token: t.token ?? '포대기' });
    // 숨긴 것을 알게 됨
    if (t.told === 'no' && !t.learned && a >= 13 && rng.chance(0.03)) {
      const from = rng.pick(['장터 아낙들', '옆집 아이', '예배당 사제의 장부', '술 취한 이웃']);
      return q('ad_learn', { id: p.id, name: p.name, from });
    }
    // 아이를 두고 간 사람
    const mo = byId(g, t.birth);
    if (t.how === 'basket' && !t.met && alive(mo) && a >= 6 && now - t.since >= 72 && rng.chance(0.02)) return q('ad_birth', { id: p.id, kid: p.name, age: a, token: t.token ?? '포대기', years: Math.floor((now - t.since) / 12), knows: t.told === 'yes' });
  }
}

/* ---------- 플레이어 없이도: NPC 집안이 아이를 거둔다 ---------- */
function npcTake(g, kid, by, kind) {
  const s = S(g);
  if (!by.childIds.includes(kid.id)) by.childIds.push(kid.id);
  const sp = byId(g, by.spouseId);
  if (alive(sp) && !sp.childIds.includes(kid.id)) sp.childIds.push(kid.id);
  kid.adopted = true; kid.place = placeOf(by);
  if (kind === 'heir') kid.lastName = by.lastName;
  kid.history.push({ y: g.date.year, m: g.date.month, text: kind === 'heir' ? `${by.name}의 양자가 되었다.` : `${by.name}의 집에 거두어졌다.` });
  by.history.push({ y: g.date.year, m: g.date.month, text: kind === 'heir' ? `${J(kid.name, '을/를')} 양자로 들였다.` : `부모 잃은 ${J(kid.name, '을/를')} 거두었다.` });
  s.npc.push({ kid: kid.id, by: by.id, kind, y: g.date.year, place: placeOf(by), ev: {} });
  s.made += 1;
}
function npcTick(g, rng) {
  const s = S(g); const now = mi(g);
  if (g.date.month !== 6) return;
  const ppl = living(g).filter((p) => !p.isPlayer);
  const m = me(g);
  const family = new Set([m.id, m.fatherId, m.motherId, m.spouseId, ...(m.childIds ?? []), ...(g.player.familyIds ?? [])]);
  const taken = new Set(s.npc.map((x) => x.kid));
  const noKids = (p) => !(p.childIds ?? []).some((id) => byId(g, id)?.alive);
  const say = (kind, pool, c, place) => { if (place === here(g) && rng.chance(0.7)) line(g, 'npc', pickFresh(g, rng, kind, pool)(c)); };
  // 부모 잃은 아이
  const orphans = ppl.filter((p) => ageYears(p) < 14 && !p.adopted && !family.has(p.id) && !taken.has(p.id) && [p.fatherId, p.motherId].filter((id) => id != null).length > 0 && [p.fatherId, p.motherId].every((id) => id == null || !byId(g, id)?.alive));
  for (const kid of orphans.slice(0, 6)) {
    if (!rng.chance(0.55)) continue;
    const pars = [kid.fatherId, kid.motherId].map((id) => byId(g, id)).filter(Boolean);
    const relatives = [];
    for (const par of pars) for (const gp of [par.fatherId, par.motherId].map((id) => byId(g, id)).filter(Boolean)) for (const id of gp.childIds ?? []) { const x = byId(g, id); if (alive(x) && x.id !== par.id && !family.has(x.id) && ageYears(x) >= 20 && ageYears(x) <= 60) relatives.push(x); }
    const couples = ppl.filter((p) => p.spouseId && !family.has(p.id) && placeOf(p) === placeOf(kid) && ageYears(p) >= 24 && ageYears(p) <= 52 && noKids(p) && p.id !== kid.id);
    const by = relatives.length ? rng.pick(relatives) : couples.length ? rng.pick(couples) : null;
    if (!by) continue;
    npcTake(g, kid, by, 'orphan');
    say('nt', T.NPC_TAKE, { a: by.name, kid: kid.name, place: placeName(placeOf(by)) }, placeOf(by));
  }
  // 자식 없는 늙은 집이 양자로 대를 잇는다
  const old = ppl.filter((p) => ageYears(p) >= 50 && ageYears(p) <= 75 && noKids(p) && !family.has(p.id) && ((p.wealth ?? 0) >= 60 || p.title) && !s.npc.some((x) => x.by === p.id && x.kind === 'heir'));
  for (const a of old.slice(0, 8)) {
    if (!rng.chance(0.12)) continue;
    const pool = ppl.filter((x) => x.id !== a.id && !family.has(x.id) && !taken.has(x.id) && placeOf(x) === placeOf(a) && ageYears(x) >= 12 && ageYears(x) <= 25 && x.id !== a.spouseId && !(a.childIds ?? []).includes(x.id));
    if (!pool.length) continue;
    const kid = rng.pick(pool);
    npcTake(g, kid, a, 'heir');
    say('nh', T.NPC_HEIR, { a: a.name, kid: kid.name, place: placeName(placeOf(a)) }, placeOf(a));
  }
  // 흉년·역병 끝, 예배당 문간의 바구니
  if ((g.world?.famine || g.world?.plague) && rng.chance(0.35)) {
    const pl = rng.chance(0.6) ? here(g) : rng.pick(['harfen', 'verden', 'leocast', 'portel'].filter((x) => PLACES[x]));
    const baby = makePerson(rng, { ageMonths: rng.int(0, 3), job: 'child' });
    baby.place = pl; baby.history.push({ y: g.date.year, m: g.date.month, text: `${placeName(pl)} 예배당 문간에서 발견되었다.` });
    g.people.push(baby);
    const couples = ppl.filter((p) => p.spouseId && !family.has(p.id) && placeOf(p) === pl && ageYears(p) >= 24 && ageYears(p) <= 50 && noKids(p));
    if (couples.length && rng.chance(0.6)) npcTake(g, baby, rng.pick(couples), 'door');
    else { s.npc.push({ kid: baby.id, by: null, kind: 'door', y: g.date.year, place: pl, ev: {} }); s.made += 1; }
    s.doors += 1;
    say('nd', T.NPC_DOOR, { place: placeName(pl) }, pl);
  }
  // 거둔 집의 세월: 출생을 알게 되는 날, 늙은 양부모를 모시는 양자, 유산 다툼
  for (const x of s.npc) {
    if (x.end) continue;
    const kid = byId(g, x.kid); const by = byId(g, x.by);
    if (!kid || !kid.alive) { x.end = now; continue; }
    if (!by) continue;
    const c = { a: by.name, kid: kid.name, place: placeName(x.place) };
    const a = ageYears(kid);
    if (!x.ev.learn && x.kind !== 'heir' && a >= 12 && rng.chance(0.25)) { x.ev.learn = now; say('nl0', [T.NPC_LATER[0]], c, x.place); }
    else if (!by.alive && !x.ev.estate) {
      x.ev.estate = now;
      const blood = [by.fatherId, by.motherId].map((id) => byId(g, id)).filter(Boolean).flatMap((gp) => gp.childIds ?? []).filter((id) => id !== by.id).flatMap((id) => byId(g, id)?.childIds ?? []).some((id) => byId(g, id)?.alive);
      if (blood && a >= 16) say('nl2', [T.NPC_LATER[2]], c, x.place);
      x.end = now;
    } else if (!x.ev.care && by.alive && ageYears(by) >= 65 && a >= 20 && rng.chance(0.3)) { x.ev.care = now; say('nl1', [T.NPC_LATER[1]], c, x.place); }
  }
  s.npc = s.npc.filter((x) => !x.end || now - x.end < 120);
  if (s.npc.length > 60) s.npc.splice(0, s.npc.length - 60);
}

function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over) return;
  sync(g);
  drift(g);
  npcTick(g, ownRng(g, 7));
  flavor(g, ownRng(g, 19));
  playerTick(g, ownRng(g, 23));
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.adopt = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g, rng, old) => {
  const s = S(g);
  s.ties = {}; s.done = {}; s.guardian = null; s.sceneAt = mi(g);
  if (!old) return;
  const meP = me(g);
  sync(g);
  // 피가 아닌 자식이 대를 이으면 친척들이 따지러 온다
  if (!meP.adopted || stepTie(g, meP.id) || playerAge(g) < 15) return;
  const oldP = byId(g, old.id);
  const gps = [oldP?.fatherId, oldP?.motherId].map((id) => byId(g, id)).filter(Boolean);
  const sibs = [...new Set(gps.flatMap((p) => p.childIds ?? []))].filter((id) => id !== old.id).map((id) => byId(g, id)).filter(Boolean);
  const blood = [...sibs, ...sibs.flatMap((x) => (x.childIds ?? []).map((id) => byId(g, id)))].find((x) => alive(x) && ageYears(x) >= 18);
  if (!blood) return;
  queueScene(g, 'ad_blood', { old: old.name, rel: blood.name, relId: blood.id, relWord: sibs.includes(blood) ? '고인의 형제' : '고인의 조카' });
});

/* ---------- 화면 연결점 ---------- */
export function adoptLines(g) { return (g.adopt?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function adoptLine(g) { return adoptLines(g)[0]?.text ?? null; }
const HOW_WORD = { basket: '문간의 바구니에서', chapel: '예배당 고아원에서', war: '전쟁 고아로', heir: '양자로', taken: '거두어' };
const TOLD_WORD = { yes: '출생을 안다', half: '어렴풋이 안다', no: '모른다' };
const GD_WORD = { kin: '친척 집', sib: '큰형제', neighbor: '이웃 집', chapel: '예배당 고아원' };
export function adoptInfo(g) {
  const s = S(g); const now = mi(g);
  const kids = ties(g).map(([p, t]) => {
    const b = bondOf(g, p.id);
    return { id: p.id, name: p.name, age: ageYears(p), how: HOW_WORD[t.how] ?? '거두어', told: t.how === 'heir' ? '양자임을 안다' : TOLD_WORD[t.told] ?? '아직 말하지 않았다', bond: Math.round(b), word: warmWord(b), years: Math.floor((now - t.since) / 12), gone: !!t.gone, token: t.token ?? null };
  });
  const gd = s.guardian && s.guardian.kind !== 'pending' ? { name: s.guardian.name, kind: GD_WORD[s.guardian.kind] ?? '', years: Math.floor((now - s.guardian.since) / 12), warm: Math.round(s.guardian.warm), word: warmWord(s.guardian.warm), grown: !!s.guardian.grown } : null;
  return {
    kids,
    guardian: gd,
    any: kids.length > 0 || !!gd,
    npc: s.npc.filter((x) => x.place === here(g)).slice(-5).map((x) => ({ kid: byId(g, x.kid)?.name ?? '', by: byId(g, x.by)?.name ?? '예배당', kind: x.kind === 'heir' ? '양자' : x.kind === 'door' ? '문간의 아이' : '부모 잃은 아이', y: x.y })),
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
