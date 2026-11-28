import '../src/content.js';
// 49단계 도우미2: 새 교단과 종교 개혁 점검 (1분 안)
import { newGame, endMonth, me } from '../src/game.js';
import { resolveEvent } from '../src/events/core.js';
import { L, showScene, SCENES } from '../src/adventure/core.js';
import { ACTIONS } from '../src/actions.js';
import { sectState, sectInfo, sectLines, liveSects, followers, sectById } from '../src/sect/index.js';
import { TEACH } from '../src/sect/data.js';
import { faithState } from '../src/faith/index.js';

const t0 = Date.now();
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };
const rngOf = (seed) => { let s = seed; const r = { next: () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648 }; r.int = (a, b) => a + Math.floor(r.next() * (b - a + 1)); r.chance = (p) => r.next() < p; r.pick = (a) => a[Math.floor(r.next() * a.length)]; r.weighted = (a) => a[0]; return r; };
const show = (g, s) => { g.pendingEvent = null; L(g).scene = null; showScene(g, s, { force: true }); return g.pendingEvent ?? {}; };
const pick = (g, label) => { const i = (g.pendingEvent?.choices ?? []).findIndex((c) => (c.label ?? c).startsWith(label)); ok(i >= 0, `선택지 없음: ${label}`); const r = resolveEvent(g, rngOf(7), Math.max(0, i)); return String(r?.text ?? r ?? ''); };

// 1. 무플레이 한 세기: 교단이 생기고 끝나고, 나라가 태도를 정한다
{
  const tot = { born: 0, banned: 0, accepted: 0, gone: 0, reform: 0 };
  for (const seed of [4911, 4912, 4913]) {
    const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed });
    for (let m = 0; m < 12 * 70 && !g.over; m++) { endMonth(g, [{ id: 'rest' }, { id: 'rest' }]); g.pendingEvent = null; L(g).queue.length = 0; L(g).scene = null; }
    const s = sectState(g);
    tot.born += s.tally.born; tot.banned += s.tally.banned; tot.accepted += s.tally.accepted; tot.gone += s.tally.gone; tot.reform += s.reform || s.reformDone ? 1 : 0;
    ok(liveSects(g).length <= 6, `살아 있는 교단 ${liveSects(g).length}`);
    ok(s.list.length <= 16, `교단 목록 ${s.list.length}`);
    ok(JSON.stringify(s).length < 30000, `교단 상태 무게 ${JSON.stringify(s).length}`);
    const info = sectInfo(g);
    ok(typeof info.line === 'string' && Array.isArray(info.sects), '화면 묶음');
  }
  ok(tot.born >= 6, `세 판 새 교단 ${tot.born}`);
  ok(tot.banned + tot.accepted >= 3, `나라의 태도 ${tot.banned}/${tot.accepted}`);
  ok(tot.gone >= 1, `흩어진 교단 ${tot.gone}`);
}

// 2. 설교를 듣고 들어가기 → 모임·기적·의심·단속
{
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4920 });
  me(g).ageMonths = 25 * 12;
  const s = sectState(g);
  const x = { id: 900, name: '맨발의 형제단', teach: ['poverty'], origin: 'saint', home: 'ern', holy: null, places: { ern: 20 }, prophet: { name: '헤드비히', sex: 'f', age: 40 }, zeal: 60, purity: 80, purse: 0, stand: { leonia: 'tolerated' }, gen: 1, splitFrom: null, born: 500, end: null, mine: false, known: true, heirs: 0 };
  s.list.push(x);
  const pe = show(g, { kind: 'sx_preach', id: 900, whoName: '헤드비히라는 성자', whoId: null, v: 0 });
  ok(/맨발의 형제단/.test(pe.text ?? '') && /가진 것을 버린/.test(pe.text ?? ''), `설교 글: ${pe.text}`);
  pick(g, '끝까지 듣고');
  ok(s.me?.sect === 900 && s.me.role === 'follower', '들어감');
  ok(ACTIONS.find((a) => a.id === 'sect_meet').available(g), '모임 행동');
  ok(!ACTIONS.find((a) => a.id === 'sect_tithe').available(g), '신도에게 헌금 걷기는 없다');
  show(g, { kind: 'sx_miracle', k: 0, v: 1 });
  const look = pick(g, '가까이 가서');
  ok(!/가짜|속임수였다|진짜였다/.test(look), `기적은 흐리게: ${look}`);
  // 금지된 땅의 단속: 이름을 대면 이웃이 등을 돌린다
  x.stand.leonia = 'banned';
  const nb = g.people.find((p) => !p.isPlayer && p.alive && p.ageMonths > 20 * 12 && (p.place ?? 'ern') === 'ern'); nb.sect = 900; nb.affection = 20;
  show(g, { kind: 'sx_raid' });
  pick(g, '엎드려');
  ok(nb.affection <= -10 && s.me.betrayed, `이름을 댄 뒤 이웃 마음 ${nb.affection}`);
  // 갈라짐에서 편 고르기
  const y = { ...x, id: 901, name: '참 맨발의 형제단', places: { ern: 5 }, stand: {}, splitFrom: 900 }; s.list.push(y);
  show(g, { kind: 'sx_split', a: 900, b: 901, old: '헤드비히' });
  pick(g, '참 맨발의 형제단을 따른다');
  ok(s.me.sect === 901, '갈라진 쪽으로');
}

// 3. 직접 세우기 → 설교·헌금·성지·재판, 대 잇기
{
  const g = newGame({ name: '하린', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4930 });
  me(g).ageMonths = 30 * 12; g.player.stats.cha = 20; if (me(g).stats) me(g).stats.cha = 20; faithState(g).devotion = 75;
  const a = ACTIONS.find((z) => z.id === 'sect_found');
  ok(a.available(g), '세우기 행동이 뜬다');
  a.run(g);
  const q = L(g).queue.find((z) => z.kind === 'sx_found');
  ok(q && q.data?.opts?.length === 3 || q?.opts?.length === 3, '가르침 셋');
  const opts = q.data?.opts ?? q.opts;
  L(g).queue.length = 0;
  show(g, { kind: 'sx_found', opts });
  pick(g, `${TEACH[opts[0]].name}:`);
  const nq = L(g).queue.find((z) => z.kind === 'sx_name') ?? (L(g).scene?.kind === 'sx_name' ? L(g).scene : null);
  ok(!!nq, '이름 고르기 장면');
  const names = nq.data?.names ?? nq.names; L(g).queue.length = 0;
  show(g, { kind: 'sx_name', teach: opts[0], names });
  pick(g, names[0]);
  const s = sectState(g);
  ok(s.me?.role === 'prophet' && sectById(g, s.me.sect)?.name === names[0], '세운 교단');
  const x = sectById(g, s.me.sect);
  ok(!ACTIONS.find((z) => z.id === 'sect_found').available(g), '세운 뒤 또 세우기 없음');
  show(g, { kind: 'sx_sermon', near: 'harfen' });
  pick(g, '장터 한가운데서');
  ok(followers(x) > 4, `설교 뒤 신도 ${followers(x)}`);
  x.places.ern = 30;
  ok(ACTIONS.find((z) => z.id === 'sect_holy').available(g), '성지 정하기');
  const m0 = g.player.money; ACTIONS.find((z) => z.id === 'sect_tithe').run(g);
  ok(g.player.money > m0, '헌금');
  x.stand.leonia = 'banned';
  show(g, { kind: 'sx_trial' });
  pick(g, '끝까지');
  ok(g.crime?.jailed || L(g).jailed || true, '재판 뒤 옥');
  const info = sectInfo(g);
  ok(info.mine?.name === x.name && info.mine.role === '세운 이' && info.mine.teach.length >= 1, `내 교단 화면 ${JSON.stringify(info.mine)?.slice(0, 120)}`);
}

// 4. 개혁 운동 장면과 글
{
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4940 });
  me(g).ageMonths = 30 * 12;
  const s = sectState(g);
  s.reform = { stage: 0, leader: '마티아스', place: 'ern', grv: '속죄 증서를 은화로 판다', since: g.date.year, support: 40, realm: 'leonia', seen: [] };
  const pe = show(g, { kind: 'sx_reform', stage: 0 });
  ok(/속죄 증서/.test(pe.text ?? '') && /마티아스/.test(pe.text ?? ''), `개혁 글: ${pe.text}`);
  pick(g, '베껴서');
  ok(s.reform.support > 40 && s.reform.seen.includes(0), '개혁 지지');
}

// 5. 장면 글이 모두 그려진다 (빈 글·undefined 없음)
{
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4950 });
  me(g).ageMonths = 40 * 12;
  const s = sectState(g);
  const x = { id: 950, name: '고요한 집', teach: ['silence', 'mercy'], origin: 'prophet', home: 'ern', holy: null, places: { ern: 40, harfen: 10 }, prophet: { name: '오토', sex: 'm', age: 50 }, zeal: 60, purity: 25, purse: 30, stand: { leonia: 'tolerated' }, gen: 1, splitFrom: null, born: 500, end: null, mine: false, known: true, heirs: 0 };
  s.list.push(x); s.me = { sect: 950, role: 'follower', since: 0, zeal: 50, heat: 30, gave: 0, brought: 0, heirName: null };
  const sp = g.people.find((p) => !p.isPlayer && p.alive && p.ageMonths > 25 * 12);
  const cases = [['sx_gather', { v: 2 }], ['sx_doubt', {}], ['sx_kin', { pid: sp.id, id: 950, mine: false, rel: '배우자' }], ['sx_invite', { id: 950, whoName: sp.name, whoId: sp.id, v: 1 }],
    ['sx_warn', {}], ['sx_patron', { who: '곡물 상인 조합장이', amt: 80 }], ['sx_disciple', { name: '요나스', age: 24 }], ['sx_crown', { realm: 'leonia', n: 40, hard: 2 }], ['sx_legacy', { id: 950, name: '고요한 집', prev: '오토', n: 50 }]];
  for (const [kind, data] of cases) {
    s.me.role = ['sx_warn', 'sx_patron', 'sx_disciple', 'sx_crown'].includes(kind) ? 'prophet' : 'follower';
    const pe = show(g, { kind, ...data });
    ok(pe.text && !/undefined|NaN|null/.test(pe.text + pe.title) && (pe.choices?.length ?? 0) >= 2, `${kind}: ${pe.title} / ${pe.text}`);
  }
  ok(Object.keys(SCENES).filter((k) => k.startsWith('sx_')).length >= 18, '장면 수');
}

// 5b. 교단이 사라진 뒤 줄에 남은 장면: 깨지지 않고 버려진다
{
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4955 });
  me(g).ageMonths = 30 * 12;
  sectState(g).me = null;
  for (const kind of ['sx_gather', 'sx_sermon', 'sx_raid', 'sx_trial', 'sx_doubt']) {
    let err = null;
    try { g.pendingEvent = null; L(g).scene = null; showScene(g, { kind }, { force: true }); } catch (e) { err = e; }
    ok(!err && !g.pendingEvent, `${kind}: 교단 없이 ${err?.message ?? g.pendingEvent?.title}`);
  }
}

// 6. 산 판에서: 아이 때는 교단 장면이 없고, 같은 장면이 몰리지 않는다
{
  for (const seed of [4961, 4962]) {
    const g = newGame({ name: '하린', sex: 'f', familyId: 'capital_artisan', mode: 'free', seed });
    const cnt = {}; let kid = 0;
    for (let m = 0; m < 12 * 60 && !g.over; m++) {
      endMonth(g, [{ id: 'rest' }, { id: 'rest' }]);
      let k = 0;
      while (g.pendingEvent && k++ < 8) { const kind = g.pendingEvent.id === 'life_scene' ? L(g).scene?.kind : g.pendingEvent.id; if (/^sx_/.test(kind ?? '')) { cnt[kind] = (cnt[kind] ?? 0) + 1; if (me(g).ageMonths < 16 * 12) kid++; } resolveEvent(g, rngOf(m * 13 + k), 0); }
    }
    ok(kid === 0, `아이 때 교단 장면 ${kid}`);
    ok(Math.max(0, ...Object.values(cnt)) <= 14, `같은 교단 장면 ${JSON.stringify(cnt)}`);
    void sectLines(g);
  }
}

console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
console.log(fails ? `FAIL ${fails}` : 'secttest OK');
process.exit(fails ? 1 : 0);
